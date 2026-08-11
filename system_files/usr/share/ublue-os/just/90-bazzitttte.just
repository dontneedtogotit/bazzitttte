# Bazzitttte: list active tweaks and installed mods
[group('Bazzitttte')]
bazzitttte-status:
    #!/usr/bin/bash
    set -eou pipefail
    echo "== ZRAM Status =="
    zramctl 2>/dev/null || swapon --show 2>/dev/null || echo "zram not active (reboot may be needed)"
    echo
    echo "== Autologin =="
    if [[ -f /etc/bazzitttte/autologin-disabled ]]; then
        echo "disabled (marker present; run: ujust bazzitttte-autologin-enable)"
    else
        cat /etc/sddm.conf.d/zz-bazzitttte-autologin.conf 2>/dev/null || echo "not configured yet (created at next boot)"
    fi
    echo
    echo "== Kodi autostart =="
    if [[ -f /etc/xdg/autostart/kodi-autostart.desktop ]]; then
        echo "enabled (boots into Kodi)"
    else
        echo "disabled (boots to Plasma desktop)"
    fi
    echo
    echo "== Flatpaks =="
    flatpak list --app --columns=application 2>/dev/null | grep -i freetube || echo "FreeTube not installed (run: ujust bazzitttte-youtube)"
    flatpak list --app --columns=application 2>/dev/null | grep -i pcsx2 || echo "PCSX2 not installed (run: ujust bazzitttte-psx2)"

# Bazzitttte: permanently disable the first-boot SDDM autologin
[group('Bazzitttte')]
bazzitttte-autologin-disable:
    #!/usr/bin/bash
    set -eou pipefail
    sudo mkdir -p /etc/bazzitttte
    sudo touch /etc/bazzitttte/autologin-disabled
    sudo rm -f /etc/sddm.conf.d/zz-bazzitttte-autologin.conf
    echo "Autologin disabled. Re-enable with: ujust bazzitttte-autologin-enable"

# Bazzitttte: re-enable the first-boot SDDM autologin
[group('Bazzitttte')]
bazzitttte-autologin-enable:
    #!/usr/bin/bash
    set -eou pipefail
    sudo rm -f /etc/bazzitttte/autologin-disabled
    sudo rm -f /etc/sddm.conf.d/zz-bazzitttte-autologin.conf
    echo "Autologin will be re-created for the first user at next boot."

# Bazzitttte: boot straight into Kodi fullscreen (over the autologin Plasma session)
[group('Bazzitttte')]
bazzitttte-boot-kodi:
    #!/usr/bin/bash
    set -eou pipefail
    sudo mkdir -p /etc/xdg/autostart
    sudo cp -f /usr/share/bazzitttte/kodi-autostart.desktop /etc/xdg/autostart/
    echo "Kodi will auto-launch fullscreen at the next login."
    echo "Quit Kodi to land on the Plasma desktop. Revert with: ujust bazzitttte-boot-desktop"

# Bazzitttte: return to a normal Plasma desktop boot (remove Kodi autostart)
[group('Bazzitttte')]
bazzitttte-boot-desktop:
    #!/usr/bin/bash
    set -eou pipefail
    sudo rm -f /etc/xdg/autostart/kodi-autostart.desktop
    echo "Kodi autostart removed. Next login boots to the Plasma desktop."

# Bazzitttte: install (if needed) and launch FreeTube - ad-free YouTube with SponsorBlock
[group('Bazzitttte')]
bazzitttte-youtube:
    #!/usr/bin/bash
    set -eou pipefail
    flatpak remote-add --user --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo 2>/dev/null || true
    if ! flatpak list --app 2>/dev/null | grep -q io.freetubeapp.FreeTube; then
        echo "Installing FreeTube (user flatpak) - ad-free YouTube, SponsorBlock, no tracking..."
        flatpak install --user --noninteractive --assumeyes flathub io.freetubeapp.FreeTube
    fi
    echo "Launching FreeTube..."
    nohup flatpak run io.freetubeapp.FreeTube >/dev/null 2>&1 &

# Bazzitttte: install (if needed) and launch PCSX2 - PlayStation 2 emulator (official Flathub flatpak; no longer packaged as an RPM)
[group('Bazzitttte')]
bazzitttte-psx2:
    #!/usr/bin/bash
    set -eou pipefail
    flatpak remote-add --user --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo 2>/dev/null || true
    if ! flatpak list --app 2>/dev/null | grep -q net.pcsx2.PCSX2; then
        echo "Installing PCSX2 (user flatpak) - PlayStation 2 emulator..."
        flatpak install --user --noninteractive --assumeyes flathub net.pcsx2.PCSX2
    fi
    echo "Launching PCSX2..."
    nohup flatpak run net.pcsx2.PCSX2 >/dev/null 2>&1 &

# Bazzitttte: monitor Intel Iris GPU utilization & hardware video decode (VA-API)
[group('Bazzitttte')]
bazzitttte-gpu-stats:
    #!/usr/bin/bash
    set -eou pipefail
    echo "== Checking Intel VA-API Hardware Video Decode Support =="
    vainfo 2>/dev/null || echo "vainfo not available or failed"
    echo
    echo "== Launching real-time Intel GPU monitor (intel_gpu_top) =="
    echo "Press Ctrl+C to exit monitor."
    sudo intel_gpu_top

# Bazzitttte: install & launch Sunshine game streaming server (Moonlight compatible)
[group('Bazzitttte')]
bazzitttte-sunshine:
    #!/usr/bin/bash
    set -eou pipefail
    flatpak remote-add --user --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo 2>/dev/null || true
    if ! flatpak list --app 2>/dev/null | grep -q dev.lizardbyte.sunshine; then
        echo "Installing Sunshine Game Streaming Server..."
        flatpak install --user --noninteractive --assumeyes flathub dev.lizardbyte.sunshine
    fi
    echo "Launching Sunshine... Access web UI at https://localhost:47990"
    nohup flatpak run dev.lizardbyte.sunshine >/dev/null 2>&1 &

# Bazzitttte: launch Steam Big Picture / Game Mode for controller-first living room UI
[group('Bazzitttte')]
bazzitttte-steam-bp:
    #!/usr/bin/bash
    set -eou pipefail
    echo "Launching Steam Big Picture Mode..."
    nohup steam -gamepadui >/dev/null 2>&1 &

# Bazzitttte: set UI scale factor for 10-foot 70"+ TV viewing (150%, 175%, 200%)
[group('Bazzitttte')]
bazzitttte-tv-scale scale="1.5":
    #!/usr/bin/bash
    set -eou pipefail
    echo "Setting KDE Plasma GlobalScale to {{ scale }}..."
    kwriteconfig6 --file kdeglobals --group KDE --key GlobalScale "{{ scale }}" 2>/dev/null || \
    kwriteconfig5 --file kdeglobals --group KDE --key GlobalScale "{{ scale }}" 2>/dev/null || true
    echo "Scale updated to {{ scale }}. Log out and back in for changes to take full effect."

# Bazzitttte: one-screen health dashboard (temps, fan, SSD SMART, disk, image, updates)
[group('Bazzitttte')]
bazzitttte-health:
    #!/usr/bin/bash
    set -eou pipefail
    echo "== Uptime / load =="
    uptime
    echo
    echo "== CPU temp / fan (lm_sensors) =="
    if command -v sensors >/dev/null; then
        sensors 2>/dev/null || echo "sensors failed - try: sudo sensors-detect"
    else
        echo "lm_sensors not installed"
    fi
    echo
    echo "== Intel GPU =="
    if [[ -r /sys/class/drm/card0/gt_cur_freq_mhz ]]; then
        echo "GPU freq (MHz): $(cat /sys/class/drm/card0/gt_cur_freq_mhz)"
    fi
    echo "(live monitor: ujust bazzitttte-gpu-stats)"
    echo
    echo "== Disk usage =="
    df -h / /var /var/home 2>/dev/null | awk '!seen[$0]++'
    echo
    echo "== SSD health (SMART) =="
    found=""
    for d in /dev/nvme0 /dev/sda /dev/vda; do
        if [[ -e "$d" ]]; then
            sudo smartctl -H "$d" 2>/dev/null | grep -Ei 'Device Model|Serial|SMART overall|result' && found=1 && break
        fi
    done
    [[ -n "$found" ]] || echo "No SMART-capable disk detected (or install smartmontools)."
    echo
    echo "== OS image (bootc) =="
    bootc status 2>/dev/null | sed -n '1,8p' || rpm-ostree status 2>/dev/null | sed -n '1,8p' || echo "bootc/rpm-ostree unavailable"
    echo
    echo "== Flatpak updates available =="
    flatpak remote-ls --updates --app --columns=application 2>/dev/null || echo "none / flatpak unavailable"

# Bazzitttte: manage the AdGuard Home DNS ad-blocker container (start|stop|status|logs)
[group('Bazzitttte')]
bazzitttte-adguard action="status":
    #!/usr/bin/bash
    set -eou pipefail
    UNIT="adguardhome.service"
    case "{{ action }}" in
        start)
            if ss -lntup 2>/dev/null | grep -q ':53 '; then
                echo "WARNING: something already listens on port 53 (likely systemd-resolved)."
                echo "AdGuard may fail to bind DNS. To use it network-wide, disable the resolved stub:"
                echo "  sudo sed -i 's/#DNSStubListener=yes/DNSStubListener=no/' /etc/systemd/resolved.conf"
                echo "  sudo systemctl restart systemd-resolved"
                echo "  (then point /etc/resolv.conf or your router DNS at this box)"
            fi
            sudo systemctl start "$UNIT"
            echo "AdGuard Home starting. First-run setup wizard: http://$(hostname -I 2>/dev/null | awk '{print $1}'):3000"
            echo "After setup the web UI is typically on port 80. Status: ujust bazzitttte-adguard status"
            ;;
        stop)   sudo systemctl stop "$UNIT" ;;
        logs)   sudo journalctl -u "$UNIT" -n 40 --no-pager ;;
        status|*)
            systemctl status "$UNIT" --no-pager 2>/dev/null || echo "$UNIT is not running (opt-in). Start: ujust bazzitttte-adguard start"
            ;;
    esac

# Bazzitttte: enable Jellyfin VAAPI hardware transcoding (GPU access is pre-baked)
[group('Bazzitttte')]
bazzitttte-jellyfin-vaapi:
    #!/usr/bin/bash
    set -eou pipefail
    echo "== GPU access for Jellyfin =="
    if [[ -e /dev/dri/renderD128 ]]; then
        echo "render node present: /dev/dri/renderD128"
    else
        echo "WARNING: /dev/dri/renderD128 not found."
    fi
    echo
    echo "The jellyfin.service drop-in already adds the 'render' group (GPU access)."
    echo "Set VAAPI in Jellyfin (one-time):"
    echo "  Dashboard > Playback > Transcoding > Hardware acceleration: 'VAAPI'"
    echo "  VAAPI device: /dev/dri/renderD128   [x] Enable hardware decoding"
    echo
    ans="n"
    if [[ -t 0 ]]; then
        read -r -p "Attempt to write this into Jellyfin's encoding.xml automatically? [y/N] " ans
    fi
    if [[ "${ans,,}" == "y" ]]; then
        CFG="$(sudo find /etc/jellyfin /var/lib/jellyfin -name encoding.xml 2>/dev/null | head -1 || true)"
        if [[ -n "$CFG" ]]; then
            sudo sed -i 's#<HardwareAccelerationType>[^<]*</HardwareAccelerationType>#<HardwareAccelerationType>vaapi</HardwareAccelerationType>#' "$CFG"
            sudo sed -i 's#<VaapiDevice>[^<]*</VaapiDevice>#<VaapiDevice>/dev/dri/renderD128</VaapiDevice>#' "$CFG"
            sudo systemctl restart jellyfin
            echo "Wrote VAAPI config to $CFG and restarted Jellyfin."
        else
            echo "encoding.xml not found yet - start Jellyfin once via the web UI, then re-run this recipe."
        fi
    fi

# Bazzitttte: test HDMI-CEC (TV remote control) with cec-client
[group('Bazzitttte')]
bazzitttte-cec-test:
    #!/usr/bin/bash
    set -eou pipefail
    if ! command -v cec-client >/dev/null; then
        echo "cec-client not found (libcec missing)."
        exit 1
    fi
    echo "== Scanning for CEC adapters =="
    cec-client -l 2>/dev/null || true
    echo
    echo "== Probing CEC bus (10s) - press TV remote buttons =="
    timeout 10 cec-client -d 1 2>/dev/null || echo "(no CEC adapter / TV did not respond)"
    echo
    echo "If an adapter is found, enable CEC in Kodi: Settings > System > Input > Peripherals > CEC Adapter."

# Bazzitttte: list configured network cameras
[group('Bazzitttte')]
bazzitttte-cam-list:
    #!/usr/bin/bash
    set -eou pipefail
    /usr/libexec/bazzitttte-cam list

# Bazzitttte: show a camera as a small PiP in the screen corner
[group('Bazzitttte')]
bazzitttte-cam-pip name:
    #!/usr/bin/bash
    set -eou pipefail
    /usr/libexec/bazzitttte-cam pip "{{ name }}"

# Bazzitttte: hide camera PiP (all if no name given)
[group('Bazzitttte')]
bazzitttte-cam-stop name="":
    #!/usr/bin/bash
    set -eou pipefail
    /usr/libexec/bazzitttte-cam stop {{ name }}

# Bazzitttte: watch a camera and pop the PiP up briefly on motion detection
[group('Bazzitttte')]
bazzitttte-cam-watch name:
    #!/usr/bin/bash
    set -eou pipefail
    echo "Starting motion watcher for '{{ name }}' in the background."
    echo "Tune with CAM_THRESHOLD / CAM_POPUP_SECONDS / CAM_COOLDOWN. Stop: ujust bazzitttte-cam-unwatch {{ name }}"
    nohup setsid /usr/libexec/bazzitttte-cam watch "{{ name }}" >/dev/null 2>&1 &
    sleep 1
    if pgrep -f "bazzitttte-cam watch {{ name }}" >/dev/null; then
        echo "Watcher running."
    else
        echo "Watcher failed to start - check the stream URL in /etc/bazzitttte/cameras.conf"
    fi

# Bazzitttte: stop the motion watcher for a camera
[group('Bazzitttte')]
bazzitttte-cam-unwatch name:
    #!/usr/bin/bash
    set -eou pipefail
    /usr/libexec/bazzitttte-cam unwatch "{{ name }}"

# Bazzitttte: check for OS image + flatpak updates WITHOUT applying anything
[group('Bazzitttte')]
bazzitttte-update-status:
    #!/usr/bin/bash
    set -eou pipefail
    echo "== OS image update check (metadata only, no download) =="
    bootc upgrade --check 2>&1 || true
    echo
    echo "== Bootc deployments =="
    bootc status 2>&1 | sed -n '1,14p' || true
    echo
    echo "== Flatpak updates available =="
    flatpak remote-ls --updates --app --columns=application 2>/dev/null || echo "none / flatpak unavailable"
    echo
    echo "Apply everything with: ujust bazzitttte-update"

# Bazzitttte: OTA update - download only the changed layers (NOT the ISO), update flatpaks, then reboot
[group('Bazzitttte')]
bazzitttte-update:
    #!/usr/bin/bash
    set -eou pipefail
    echo "== Downloading & staging OS update (delta layers, not the full ISO) =="
    sudo bootc upgrade
    echo
    echo "== Updating flatpaks =="
    flatpak update -y 2>/dev/null || echo "flatpak update skipped"
    echo
    echo "Update staged. It also applies automatically at next shutdown."
    ans="n"
    if [[ -t 0 ]]; then
        read -r -p "Reboot now to apply? [y/N] " ans
    fi
    if [[ "${ans,,}" == "y" ]]; then
        sudo systemctl reboot
    else
        echo "Reboot when ready (sudo systemctl reboot), or apply now with: sudo bootc upgrade --apply"
    fi

# Bazzitttte: roll back to the previous OS image if an update misbehaves
[group('Bazzitttte')]
bazzitttte-rollback:
    #!/usr/bin/bash
    set -eou pipefail
    echo "Rolling back to the previous deployment..."
    sudo bootc rollback
    echo "Rollback queued. Reboot to apply: sudo systemctl reboot"
