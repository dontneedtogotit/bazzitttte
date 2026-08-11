#!/bin/bash

set -ouex pipefail

# Copy the contents of system_files/ of the git repo to /
# (zram-generator config, sysctl tuning, etc.)
cp -avf "/ctx/system_files"/. /

### Lightweight tweaks for the NUC7i5BNH (2C/4T i5-7260U, 16GB RAM)
# Bazzite already ships zram-generator (zstd, min(ram/2, 16384)); the install
# below is an idempotent safety net. Our drop-in at
# system_files/etc/systemd/zram-generator.conf.d/nuc.conf overrides it with a
# lighter lz4 + 4GiB cap suited to the 2C/4T CPU.
dnf5 install -y zram-generator

# RAM/CPU saving: mask services for hardware this NUC does not have.
# (No WWAN modem, no fingerprint reader, no dual-GPU switch, no geolocation need.)
systemctl mask ModemManager.service
systemctl mask fprintd.service
systemctl mask switcheroo-control.service
systemctl mask geoclue.service
# Baloo (KDE file indexer) disabled via system_files/etc/xdg/baloofilerc -
# saves a few hundred MB of RAM and CPU on the 2C/4T i5. Re-enable anytime
# from System Settings > File Search, or drop the /etc/xdg drop-in.

### Auto-login (Plasma Wayland, first user) at first boot
# Script + unit live in system_files/; enable it here.
chmod +x /usr/libexec/bazzitttte-autologin
chmod +x /usr/libexec/bazzitttte-cam
systemctl enable bazzitttte-autologin

### Ad-free YouTube
# FreeTube (no ads, SponsorBlock, no tracking) is NOT baked into the image -
# like Bazzite's own flatpaks it installs on first run as a user flatpak via
# 'ujust bazzitttte-youtube' (or the Bazzite Portal). Keeps image pulls lean.
# Browser equivalent: uBlock Origin.

### Hardware Acceleration & GPU Tools (Intel Iris Plus 640 / Kaby Lake)
# libva-intel-media-driver - iHD VA-API driver for Intel Gen9+ GPUs
#                            (renamed from intel-media-driver in Fedora)
# libva-utils              - Provides 'vainfo' to verify hardware video acceleration
# igt-gpu-tools            - Provides 'intel_gpu_top' for real-time Intel GPU
#                            monitoring (renamed from intel-gpu-tools in Fedora)
# gamemode                 - CPU governor and thread priority optimizer for gaming/emulation
dnf5 install -y libva-intel-media-driver libva-utils igt-gpu-tools gamemode

### Media / HTPC packages (kodi + jellyfin from RPMFusion free, rest from Fedora)
# kodi      - media center (rpmfusion-free)
# jellyfin  - media server + web UI (rpmfusion-free meta package;
#             pulls jellyfin-server which ships jellyfin.service)
# jellyfin-firewalld - firewalld service definition so LAN clients can reach :8096
# mpv       - lightweight video player
# yt-dlp    - download tool
dnf5 install -y kodi jellyfin jellyfin-firewalld mpv yt-dlp

### Emulation packages (Fedora)
# retroarch   - multi-system frontend
# dolphin-emu - GameCube / Wii
# NOTE: pcsx2 is no longer packaged for Fedora/RPMFusion - it is installed as
# the official Flathub flatpak on first run via 'ujust bazzitttte-psx2'.
dnf5 install -y retroarch dolphin-emu

### HTPC extras (CEC remote control, camera PiP, health dashboard)
# libcec        - HDMI-CEC library + 'cec-client' (drive Kodi with the TV remote)
# ffmpeg        - RTSP decode + motion detection for the camera PiP watcher
# lm_sensors    - CPU temp/fan readings for 'ujust bazzitttte-health'
# smartmontools - SSD SMART health for 'ujust bazzitttte-health'
dnf5 install -y libcec ffmpeg lm_sensors smartmontools

### Services
# Start the Jellyfin media server at boot
systemctl enable jellyfin

# Open the Jellyfin port (8096/tcp) in the firewall for LAN clients, and DNS
# (53/tcp+udp) for the opt-in AdGuard Home container ('ujust bazzitttte-adguard').
# firewall-offline-cmd edits /etc/firewalld at image-build time.
if command -v firewall-offline-cmd >/dev/null; then
    firewall-offline-cmd --add-service=jellyfin
    firewall-offline-cmd --add-service=dns
else
    echo "WARNING: firewall-offline-cmd not found; firewall rules NOT added" >&2
fi

# Keep the image lean
dnf5 -y clean all

