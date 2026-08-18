#!/bin/bash
set -eouex pipefail

cp -avf "/ctx/system_files"/. /

dnf5 install -y zram-generator

systemctl mask ModemManager.service
systemctl mask fprintd.service
systemctl mask switcheroo-control.service
systemctl mask geoclue.service

systemctl enable bazzzzite-tv-shell.service
systemctl enable bazzzzite-cecd.service

dnf5 install -y --skip-unavailable cage chromium mpv jellyfin retroarch dolphin-emu \
    libcec cec-utils ffmpeg yt-dlp lm_sensors smartmontools \
    gamemode igt-gpu-tools python3-pip python3-gobject python3-dbus \
    python3-websockets python3-aiohttp python3-vosk qt6-qtbase qt6-qtwayland qt6-qtsvg \
    rygel edid-decode firewalld nmap xdotool wmctrl

if command -v firewall-offline-cmd >/dev/null; then
    firewall-offline-cmd --add-service=jellyfin || true
    firewall-offline-cmd --add-service=dhcp
    firewall-offline-cmd --add-service=dns
fi

systemctl enable jellyfin.service || true

if [[ ! -f /usr/share/vosk-models/vosk-model-small-en-us-0.15/model.tar.gz ]]; then
    echo "Downloading Vosk voice model..."
    curl -L -o /tmp/vosk-model.tar.gz \
        "https://github.com/alphacep/vosk-models/releases/download/v0.3.4/vosk-model-small-en-us-0.15.tar.gz" 2>/dev/null || true
    if [[ -f /tmp/vosk-model.tar.gz ]]; then
        tar -xzf /tmp/vosk-model.tar.gz -C /usr/share/vosk-models/ || true
        rm -f /tmp/vosk-model.tar.gz
    fi
fi

mkdir -p /home/user/.config/bazzzzite/youtube-tv
mkdir -p /home/user/.config/bazzzzite/youtube-tv-guest

if [[ ! -d /home/user/.config/bazzzzite/youtube-tv/Default/Extensions/cjpalhdlnbpafiamejdnhcphjbkeiagm ]]; then
    echo "Installing uBlock Origin for YouTube TV..."
    curl -L -o /tmp/ublock.crx \
        "https://clients2.google.com/service/update2/crx?response=redirect&prodversion=120&acceptformat=crx2,crx3&x=id%3Dcjpalhdlnbpafiamejdnhcphjbkeiagm%26uc" 2>/dev/null || true
    if [[ -f /tmp/ublock.crx ]]; then
        mkdir -p /home/user/.config/bazzzzite/youtube-tv/Default/Extensions
        unzip -q /tmp/ublock.crx -d /home/user/.config/bazzzzite/youtube-tv/Default/Extensions/cjpalhdlnbpafiamejdnhcphjbkeiagm 2>/dev/null || true
        rm -f /tmp/ublock.crx
    fi
fi

systemctl enable bazzzzite-rygel.service
systemctl enable bazzzzite-update-check.timer

chmod +x /usr/libexec/bazzzzite-start-tv
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
mkdir -p /mnt/media
mkdir -p /etc/bazzzzite
mkdir -p /usr/share/vosk-models

if [[ ! -f /etc/bazzzzite/ws-token ]]; then
    head -c 32 /dev/urandom | base64 | tr -d '=+/' > /etc/bazzzzite/ws-token
fi

dnf5 clean all
