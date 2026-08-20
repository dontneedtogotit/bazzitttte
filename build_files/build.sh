#!/bin/bash
set -eouex pipefail

cp -avf "/ctx/system_files"/. /

dnf5 install -y zram-generator

systemctl mask ModemManager.service
systemctl mask fprintd.service
systemctl mask switcheroo-control.service
systemctl mask geoclue.service

# The TV shell is a display-manager session (see bazzzzite-tv.desktop), not a
# system service: the compositor needs a real logind session for XDG_RUNTIME_DIR
# and seat/DRM access, which a root service using runuser cannot provide.
systemctl enable bazzzzite-autologin-setup.service
systemctl enable bazzzzite-tv-bridge.service
systemctl enable bazzzzite-cecd.service
systemctl set-default graphical.target

# Without these there is no TV at all, so a missing one must fail the build
# rather than silently produce an image that boots to nothing. `jellyfin`,
# `cec-utils` and `python3-vosk` used to sit in this list behind
# --skip-unavailable and were being dropped on every build without a trace:
# Jellyfin ships as the jellyfin.container quadlet instead, and cec-client
# comes from libcec.
dnf5 install -y cage chromium mpv libcec ffmpeg yt-dlp \
    python3-websockets python3-aiohttp

# Nice-to-haves: the TV still works without any of them, so tolerate absence.
dnf5 install -y --skip-unavailable retroarch dolphin-emu \
    lm_sensors smartmontools gamemode igt-gpu-tools \
    python3-pip python3-gobject python3-dbus \
    qt6-qtbase qt6-qtwayland qt6-qtsvg \
    rygel edid-decode firewalld nmap xdotool wmctrl

if command -v firewall-offline-cmd >/dev/null; then
    firewall-offline-cmd --add-service=jellyfin || true
    firewall-offline-cmd --add-service=dhcp
    firewall-offline-cmd --add-service=dns
fi

if [[ ! -f /usr/share/vosk-models/vosk-model-small-en-us-0.15/model.tar.gz ]]; then
    echo "Downloading Vosk voice model..."
    curl -L -o /tmp/vosk-model.tar.gz \
        "https://github.com/alphacep/vosk-models/releases/download/v0.3.4/vosk-model-small-en-us-0.15.tar.gz" 2>/dev/null || true
    if [[ -f /tmp/vosk-model.tar.gz ]]; then
        tar -xzf /tmp/vosk-model.tar.gz -C /usr/share/vosk-models/ || true
        rm -f /tmp/vosk-model.tar.gz
    fi
fi

# Extracted once to a stable system path (not inside a profile dir) so it survives
# the guest profile being wiped before every launch, and loads via --load-extension
# for both account and guest mode.
if [[ ! -d /usr/share/bazzzzite/ublock-origin ]]; then
    echo "Installing uBlock Origin for YouTube..."
    curl -L -o /tmp/ublock.crx \
        "https://clients2.google.com/service/update2/crx?response=redirect&prodversion=120&acceptformat=crx2,crx3&x=id%3Dcjpalhdlnbpafiamejdnhcphjbkeiagm%26uc" 2>/dev/null || true
    if [[ -f /tmp/ublock.crx ]]; then
        mkdir -p /usr/share/bazzzzite/ublock-origin || true
        unzip -q /tmp/ublock.crx -d /usr/share/bazzzzite/ublock-origin 2>/dev/null || true
        rm -f /tmp/ublock.crx
    fi
fi

systemctl enable bazzzzite-rygel.service
systemctl enable bazzzzite-update-check.timer

chmod +x /usr/libexec/bazzzzite-tv-session
chmod +x /usr/libexec/bazzzzite-tv-shell-inner
chmod +x /usr/libexec/bazzzzite-autologin-setup
chmod +x /usr/libexec/bazzzzite-tv-bridge
chmod +x /usr/libexec/bazzzzite-cecd
chmod +x /usr/libexec/bazzzzite-game-mode
chmod +x /usr/libexec/bazzzzite-edid
chmod +x /usr/libexec/bazzzzite-voice
chmod +x /usr/libexec/bazzzzite-yt
chmod +x /usr/libexec/bazzzzite-fm
chmod +x /usr/libexec/bazzzzite-update-check
chmod +x /usr/libexec/bazzzzite-cam
chmod +x /usr/libexec/bazzzzite-yt-app
chmod +x /usr/libexec/bazzzzite-yt-cec
mkdir -p /mnt/media || true
mkdir -p /etc/bazzzzite || true
mkdir -p /usr/share/vosk-models || true

if [[ ! -f /etc/bazzzzite/ws-token ]]; then
    head -c 32 /dev/urandom | base64 | tr -d '=+/' > /etc/bazzzzite/ws-token
fi

dnf5 clean all
