[group('Bazzzzite TV')]
bazzzzite-status:
    #!/usr/bin/bash
    set -eou pipefail
    echo "== Bazzzzite TV Status =="
    echo
    echo "== TV Shell =="
    systemctl status display-manager.service --no-pager 2>/dev/null || echo "TV session not running"
    echo
    echo "== TV Bridge =="
    systemctl status bazzzzite-tv-bridge.service --no-pager 2>/dev/null || echo "Bridge not running"
    echo
    echo "== CEC Daemon =="
    systemctl status bazzzzite-cecd.service --no-pager 2>/dev/null || echo "CEC daemon not running"
    echo
    echo "== Voice Control =="
    systemctl status bazzzzite-voice.service --no-pager 2>/dev/null || echo "Voice not running"
    echo
    echo "== DLNA Renderer =="
    systemctl status bazzzzite-rygel.service --no-pager 2>/dev/null || echo "DLNA not running"
    echo
    echo "== Jellyfin =="
    systemctl status jellyfin.service --no-pager 2>/dev/null || echo "Jellyfin not running"
    echo
    echo "== ZRAM =="
    zramctl 2>/dev/null || swapon --show 2>/dev/null || echo "zram not active"
    echo
    echo "== GPU =="
    vainfo 2>/dev/null | head -5 || echo "vainfo failed"
    echo
    echo "== Image Version =="
    bootc status 2>/dev/null | head -5 || rpm-ostree status 2>/dev/null | head -5
    echo
    echo "== Updates =="
    bootc upgrade --check 2>/dev/null || echo "bootc unavailable"

[group('Bazzzzite TV')]
bazzzzite-restart-shell:
    #!/usr/bin/bash
    set -eou pipefail
    sudo systemctl restart bazzzzite-tv-bridge.service bazzzzite-cecd.service
    sudo systemctl restart display-manager.service

[group('Bazzzzite TV')]
bazzzzite-test-cec:
    #!/usr/bin/bash
    set -eou pipefail
    cec-client -l
    echo "Testing CEC (10s)..."
    timeout 10 cec-client -d 1 || true

[group('Bazzzzite TV')]
bazzzzite-gpu-stats:
    #!/usr/bin/bash
    set -eou pipefail
    echo "== VA-API Status =="
    vainfo || true
    echo
    echo "== Intel GPU Monitor =="
    sudo intel_gpu_top

[group('Bazzzzite TV')]
bazzzzite-jellyfin-setup:
    #!/usr/bin/bash
    set -eou pipefail
    echo "Open http://localhost:8096 in a browser to complete Jellyfin first-run setup."
    echo "After setup, get your API key from Dashboard > Advanced > API Keys"
    read -r -p "Paste API key here: " api_key
    if [[ -n "$api_key" ]]; then
        mkdir -p /etc/bazzzzite
        echo "$api_key" | sudo tee /etc/bazzzzite/jellyfin-api-key > /dev/null
        echo "API key saved to /etc/bazzzzite/jellyfin-api-key"
    fi

[group('Bazzzzite TV')]
bazzzzite-tv-scale scale="1.5":
    #!/usr/bin/bash
    set -eou pipefail
    echo "Setting TV UI scale to {{ scale }}"
    echo "$scale" | sudo tee /etc/bazzzzite/tv-scale > /dev/null
    echo "Restart TV shell to apply: ujust bazzzzite-restart-shell"

[group('Bazzzzite TV')]
bazzzzite-iptv-add:
    #!/usr/bin/bash
    set -eou pipefail
    read -r -p "Enter m3u playlist URL: " url
    if [[ -n "$url" ]]; then
        mkdir -p /etc/bazzzzite
        echo "$url" | sudo tee /etc/bazzzzite/iptv-url > /dev/null
        echo "IPTV URL saved. Run ujust bazzzzite-iptv-update to fetch channels."
    fi

[group('Bazzzzite TV')]
bazzzzite-iptv-update:
    #!/usr/bin/bash
    set -eou pipefail
    if [[ ! -f /etc/bazzzzite/iptv-url ]]; then
    echo "No IPTV URL configured. Run ujust bazzzzite-iptv-add first."
    exit 1
    fi
    url=$(sudo cat /etc/bazzzzite/iptv-url)
    echo "Fetching IPTV channels from $url..."
    sudo mkdir -p /var/lib/bazzzzite/data/iptv
    curl -s "$url" | sudo python3 -c "
        import sys, json, re
        channels = []
        name = ''
        logo = ''
        url = ''
        for line in sys.stdin:
            line = line.strip()
            if line.startswith('#EXTINF:'):
                m = re.search(',(.*)$', line)
                if m: name = m.group(1)
                m = re.search('tvg-logo=\"([^\"]+)\"', line)
                if m: logo = m.group(1)
            elif line and not line.startswith('#'):
                url = line
                channels.append({'name': name, 'logo': logo, 'url': url})
                name = logo = url = ''
        with open('/var/lib/bazzzzite/data/iptv/channels.json', 'w') as f:
            json.dump(channels, f)
        print(f'Loaded {len(channels)} channels')
    " || echo "Failed to parse m3u"
    echo "Restart TV shell to see channels: ujust bazzzzite-restart-shell"

[group('Bazzzzite TV')]
bazzzzite-voice-enable:
    #!/usr/bin/bash
    set -eou pipefail
    sudo systemctl enable --now bazzzzite-voice.service
    echo "Voice control enabled. Say 'hey tv' or 'bazzzzite'."

[group('Bazzzzite TV')]
bazzzzite-voice-disable:
    #!/usr/bin/bash
    set -eou pipefail
    sudo systemctl disable --now bazzzzite-voice.service
    echo "Voice control disabled."

[group('Bazzzzite TV')]
bazzzzite-game-mode:
    #!/usr/bin/bash
    set -eou pipefail
    sudo systemctl start bazzzzite-game-mode.service
    echo "Game mode enabled. Launch your game."

[group('Bazzzzite TV')]
bazzzzite-dlna-enable:
    #!/usr/bin/bash
    set -eou pipefail
    sudo systemctl enable --now bazzzzite-rygel.service
    echo "DLNA renderer enabled. Your Samsung TV should see 'Bazzzzite' in AllShare."

[group('Bazzzzite TV')]
bazzzzite-dlna-disable:
    #!/usr/bin/bash
    set -eou pipefail
    sudo systemctl disable --now bazzzzite-rygel.service
    echo "DLNA renderer disabled."

[group('Bazzzzite TV')]
bazzzzite-edid:
    #!/usr/bin/bash
    set -eou pipefail
    sudo /usr/libexec/bazzzzite-edid

[group('Bazzzzite TV')]
bazzzzite-update:
    #!/usr/bin/bash
    set -eou pipefail
    echo "== Downloading OS update =="
    if ! sudo bootc upgrade; then
        echo
        echo "OS update FAILED. Nothing has been staged; the current system is untouched."
        echo "Run 'ujust bazzzzite-doctor' for details."
        exit 1
    fi
    echo
    echo "== Updating Flatpaks =="
    flatpak update -y 2>/dev/null || true
    echo
    echo "== Clearing the interface cache =="
    rm -rf ~/.cache/chromium
    echo
    if sudo bootc status --format=json 2>/dev/null | grep -q '"staged"[^,]*{'; then
        echo "Update staged. Reboot to apply:  sudo reboot"
    else
        echo "Already up to date; nothing to reboot for."
    fi

[group('Bazzzzite TV')]
bazzzzite-rollback:
    #!/usr/bin/bash
    set -eou pipefail
    sudo bootc rollback
    echo "Rollback queued. Reboot to apply."

[group('Bazzzzite TV')]
bazzzzite-update-status:
    #!/usr/bin/bash
    set -eou pipefail
    echo "== OS image update check =="
    bootc upgrade --check 2>&1 || true
    echo
    echo "== Flatpak updates available =="
    flatpak remote-ls --updates --app --columns=application 2>/dev/null || echo "none / flatpak unavailable"

[group('Bazzzzite TV')]
bazzzzite-cam-list:
    #!/usr/bin/bash
    set -eou pipefail
    /usr/libexec/bazzzzite-cam list

[group('Bazzzzite TV')]
bazzzzite-cam-pip name:
    #!/usr/bin/bash
    set -eou pipefail
    /usr/libexec/bazzzzite-cam pip "{{ name }}"

[group('Bazzzzite TV')]
bazzzzite-cam-stop name="":
    #!/usr/bin/bash
    set -eou pipefail
    /usr/libexec/bazzzzite-cam stop {{ name }}

[group('Bazzzzite TV')]
bazzzzite-cam-watch name:
    #!/usr/bin/bash
    set -eou pipefail
    echo "Starting motion watcher for '{{ name }}' in the background."
    echo "Tune with CAM_THRESHOLD / CAM_POPUP_SECONDS / CAM_COOLDOWN. Stop: ujust bazzzzite-cam-unwatch {{ name }}"
    nohup setsid /usr/libexec/bazzzzite-cam watch "{{ name }}" >/dev/null 2>&1 &
    sleep 1
    if pgrep -f "bazzzzite-cam watch {{ name }}" >/dev/null; then
        echo "Watcher running."
    else
        echo "Watcher failed to start - check the stream URL in /etc/bazzzzite/cameras.conf"
    fi

[group('Bazzzzite TV')]
bazzzzite-cam-unwatch name:
    #!/usr/bin/bash
    set -eou pipefail
    /usr/libexec/bazzzzite-cam unwatch "{{ name }}"

[group('Bazzzzite TV')]
bazzzzite-cam-scan:
    #!/usr/bin/bash
    set -eou pipefail
    /usr/libexec/bazzzzite-cam scan

[group('Bazzzzite TV')]
bazzzzite-youtube:
    #!/usr/bin/bash
    set -eou pipefail
    echo "Starting VacuumTube..."
    systemctl --user start bazzzzite-youtube.service

[group('Bazzzzite TV')]
bazzzzite-youtube-stop:
    #!/usr/bin/bash
    set -eou pipefail
    systemctl --user stop bazzzzite-youtube.service
    echo "VacuumTube stopped. Back at the TV shell."

[group('Bazzzzite TV')]
bazzzzite-install-flatpaks:
    #!/usr/bin/bash
    set -eou pipefail
    sudo systemctl start bazzzzite-flatpaks.service
    systemctl status bazzzzite-flatpaks.service --no-pager || true

[group('Bazzzzite TV')]
bazzzzite-doctor:
    #!/usr/bin/bash
    set -eou pipefail
    /usr/libexec/bazzzzite-doctor

[group('Bazzzzite TV')]
bazzzzite-shell-update ref="main":
    #!/usr/bin/bash
    set -eou pipefail
    sudo /usr/libexec/bazzzzite-shell-update "{{ ref }}"

[group('Bazzzzite TV')]
bazzzzite-shell-reset:
    #!/usr/bin/bash
    set -eou pipefail
    sudo /usr/libexec/bazzzzite-shell-update --reset

[group('Bazzzzite TV')]
bazzzzite-refresh-ui:
    #!/usr/bin/bash
    set -eou pipefail
    echo "Clearing the browser cache and reloading the TV shell..."
    rm -rf ~/.cache/chromium
    sudo systemctl restart display-manager
