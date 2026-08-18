# Bazzzzite TV Exhaustive Debug Report

Generated: 2026-08-16

---

## CRITICAL

### 1. build.sh: Missing `set -e` causes silent build failures
**File:** `build_files/build.sh:2`
**Issue:** `set -ouex pipefail` is missing the `-e` flag. Without it, the script continues even if `dnf5 install`, `cp`, or `systemctl enable` fails, producing a broken image.
**Fix:** Change to `set -eouex pipefail`.

### 2. bazzzzite-tv-bridge: `current_profile` never updates (local variable shadow)
**File:** `system_files/usr/libexec/bazzzzite-tv-bridge:320`
**Issue:** `current_profile = profile_id` inside `handle_ws_message` creates a local variable instead of updating the module-level global. The profile status always reports "default".
**Fix:** Add `global current_profile` before the assignment.

### 3. bazzzzite-cecd: `os` module not imported but used
**File:** `system_files/usr/libexec/bazzzzite-cecd:14`
**Issue:** `os.environ.get("CEC_DEVICE", "RPI")` references `os` which is never imported. The daemon crashes with `NameError` immediately on import.
**Fix:** Add `import os` to the imports.

### 4. bazzzzite-voice: Wrong WebSocket protocol (wss vs ws)
**File:** `system_files/usr/libexec/bazzzzite-voice:17`
**Issue:** `WS_URL = "wss://localhost:8080/ws"` but the bridge only serves `ws://localhost:8080/ws` (no TLS). The voice daemon cannot connect.
**Fix:** Change to `ws://localhost:8080/ws`.

### 5. bazzzzite-voice & bazzzzite-cecd: Blocking I/O in async functions
**File:** `system_files/usr/libexec/bazzzzite-voice:82`, `system_files/usr/libexec/bazzzzite-cecd:83`
**Issue:** `proc.stdout.read(8000)` and `proc.stdout.readline()` are synchronous blocking calls inside `async` functions. They block the event loop, preventing WebSocket heartbeats and reconnection logic from running.
**Fix:** Use `await asyncio.get_event_loop().run_in_executor(None, proc.stdout.read, 8000)` or use `aiofiles`/`aioprocessing`.

### 6. bazzzzite-fm: PATH variable shadow + bash expansion bug
**File:** `system_files/usr/libexec/bazzzzite-fm:7,17`
**Issue:** `PATH="${2:-/mnt/media}"` shadows the system PATH. Then inside `python3 -c "..."`, `path = '$PATH'` is double-quoted by bash, so `$PATH` expands to the **system PATH** (e.g., `/usr/bin:/bin`), not the intended directory. The file manager always lists system directories.
**Fix:** Use a different variable name (e.g., `TARGET_PATH`) and pass it properly: `path = '${TARGET_PATH}'` (but beware of single quotes inside double quotes, or use `sys.argv`).

### 7. bazzzzite-game-mode.service: Auto-starts on boot, kills Cage
**File:** `system_files/usr/lib/systemd/system/bazzzzite-game-mode.service:12`, `build_files/build.sh:30`
**Issue:** `WantedBy=bazzzzite-tv-shell.service` + `systemctl enable` means game mode auto-enables on every boot, stopping Cage and setting performance governor before the user can use the TV.
**Fix:** Remove `WantedBy` from the service file or do not enable it in build.sh. Game mode should only activate on demand.

### 8. bazzzzite-tv-bridge: Wrong video output driver for Intel VA-API
**File:** `system_files/usr/libexec/bazzzzite-tv-bridge:112`
**Issue:** `--vo=gpu,vdpau` forces VDPAU output, which is for NVIDIA. The NUC7i5BNH uses Intel Iris Plus 640 with VA-API. MPV should use `--vo=gpu` with `--hwdec=vaapi`.
**Fix:** Change to `--vo=gpu --hwdec=vaapi`.

---

## HIGH

### 9. OS update commands mislead users (no automatic reboot)
**File:** `system_files/usr/libexec/bazzzzite-tv-bridge:174-197`
**Issue:** The bridge sends `system_rebooting`, `os_updating`, `os_rolling_back` responses, but `bootc upgrade` and `bootc rollback` only stage changes — they do NOT reboot automatically. The user sees a "rebooting" message but the system stays at the kiosk.
**Fix:** Either send accurate status messages or chain `systemctl reboot` after staging.

### 10. No WebSocket authentication — any local page controls the system
**File:** `system_files/usr/libexec/bazzzzite-tv-bridge:129-355`
**Issue:** The WebSocket server binds to `localhost:8080` with zero authentication. Any local HTML/JS (including a malicious popup, if one ever opens) can execute `system_reboot`, `system_shutdown`, `os_apply_update`, `launch_app`, etc.
**Fix:** Implement origin checking, a simple token-based auth handshake, or restrict to `127.0.0.1` with a Unix socket.

### 11. Scale setting split between localStorage and backend
**File:** `system_files/usr/share/bazzzzite/shell/js/app.js:367-371`, `system_files/usr/share/bazzzzite/shell/js/settings.js:11-16`
**Issue:** `tv-scale-up/down` reads/writes `localStorage.tv_scale` but `Settings.save()` sends to the backend (`/etc/bazzzzite/settings.json`). The frontend reads from localStorage after saving, so the value never updates in the UI without a reload.
**Fix:** Use only the backend for scale, or update localStorage after saving.

### 12. Hardcoded UID 1000 breaks on non-standard users
**File:** `system_files/usr/lib/systemd/system/bazzzzite-tv-shell.service:13`
**Issue:** `Environment=XDG_RUNTIME_DIR=/run/user/1000` assumes the first regular user has UID 1000. If the image is deployed with a different UID (e.g., cloud-init, custom image), Cage/Chromium will fail to connect to Wayland.
**Fix:** Detect the UID dynamically in `bazzzzite-start-tv` or use `systemd-user-runtime-dir` in a proper user service.

### 13. tv-shell runs as root system service instead of user service
**File:** `system_files/usr/lib/systemd/system/bazzzzite-tv-shell.service:7-14`
**Issue:** The service runs as root (no `User=` directive) and uses `runuser` to switch to the regular user. Cage and Chromium launched this way lack a proper D-Bus session bus, portal access, and other user-session services. This causes subtle Wayland and permission issues.
**Fix:** Use a `systemd --user` service template in `/usr/lib/systemd/user/` with `After=graphical-session.target`.

### 14. yt-dlp disables certificate verification and suppresses errors
**File:** `system_files/usr/libexec/bazzzzite-yt:15,40`
**Issue:** `--no-check-certificates` disables TLS verification, enabling MITM attacks. `2>/dev/null` swallows all errors, so failed downloads silently return empty results to the UI.
**Fix:** Remove `--no-check-certificates`. Log stderr or surface errors to the UI.

### 15. Update checker `notify-send` won't work from a system service
**File:** `system_files/usr/libexec/bazzzzite-update-check:7-9`
**Issue:** `notify-send` requires a D-Bus session bus. `bazzzzite-update-check.service` is a system service (no user session), so desktop notifications silently fail.
**Fix:** Use `wall` + `systemd-cat`, or write a flag file that the TV shell picks up on next WebSocket connection.

---

## MEDIUM

### 16. MPV IPC commands use `os.system` with brittle quoting
**File:** `system_files/usr/libexec/bazzzzite-tv-bridge:164-171`
**Issue:** `os.system("echo '%s' | socat - /tmp/mpv.sock 2>/dev/null || true" % cmd)` uses shell string interpolation. If `seconds` contained shell metacharacters, it would be injectable (though the client payload is an integer in practice).
**Fix:** Use `subprocess.run(["socat", "-", "/tmp/mpv.sock"], input=cmd.encode())` or `subprocess.run(["mpv", "--input-ipc-server=" + MPV_SOCK, "cycle", "pause"])` directly.

### 17. WebSocket `onmessage` crashes on malformed JSON
**File:** `system_files/usr/share/bazzzzite/shell/js/app.js:53-56`
**Issue:** `JSON.parse(event.data)` is not wrapped in try/catch. A single malformed message from the bridge crashes the entire message handler.
**Fix:** Wrap in try/catch and log the error.

### 18. WebSocket reconnection has fixed 2-second delay, no backoff
**File:** `system_files/usr/share/bazzzzite/shell/js/app.js:57-64`
**Issue:** Fixed 2-second reconnect. If the bridge is restarting, rapid reconnection storms can occur.
**Fix:** Implement exponential backoff (2s, 4s, 8s, max 30s).

### 19. Voice daemon has no WebSocket reconnection in main loop
**File:** `system_files/usr/libexec/bazzzzite-voice:70-101`
**Issue:** `connect_ws()` is called once before the main loop. If the connection drops during operation, `send_event` fails silently, and the daemon never reconnects.
**Fix:** Detect disconnection in the main loop and reconnect.

### 20. CEC daemon has no WebSocket reconnection in main loop
**File:** `system_files/usr/libexec/bazzzzite-cecd:73-88`
**Issue:** Same as voice daemon — single connection attempt, no reconnection on drop.
**Fix:** Wrap `send_event` with reconnection logic.

### 21. `mpv_command` function is dead code
**File:** `system_files/usr/libexec/bazzzzite-tv-bridge:83-93`
**Issue:** `mpv_command` is defined but never called anywhere. Dead code increases maintenance burden.
**Fix:** Remove or use it for existing IPC paths.

### 22. Jellyfin silently fails if no users exist
**File:** `system_files/usr/share/bazzzzite/shell/js/jellyfin.js:11-12`
**Issue:** If the user hasn't completed the Jellyfin first-run wizard and no admin user exists, `getUserId()` returns `undefined` and the media sections stay empty forever with no error message.
**Fix:** Show a "Complete Jellyfin setup" prompt when `userId` is missing.

### 23. Duplicate N64 entry in emulation systems
**File:** `system_files/usr/share/bazzzzite/shell/js/emulation.js:9,14`
**Issue:** Two entries with `id: 'n64'`. The first has `.n64` extension, the second `.z64`. The UI shows N64 twice, and `Emulation.launch` always resolves to the first entry.
**Fix:** Remove the duplicate or differentiate the IDs.

### 24. Missing Vosk model in image
**File:** `build_files/build.sh:44`
**Issue:** `mkdir -p /usr/share/vosk-models` creates an empty directory. The actual Vosk model (`vosk-model-small-en-us-0.15`) is never downloaded, so voice control is completely non-functional out of the box.
**Fix:** Download the model during build or document that it must be installed separately.

### 25. firewalld commands may fail silently
**File:** `build_files/build.sh:17-21`
**Issue:** `firewall-offline-cmd` requires firewalld to be installed. If the base image doesn't have it, the commands fail but the build continues (exacerbated by missing `set -e`). Jellyfin will be unreachable from the LAN.
**Fix:** Ensure firewalld is installed first, or add error checking.

---

## LOW

### 26. Jellyfin API key exposed in URL query string
**File:** `system_files/usr/share/bazzzzite/shell/js/jellyfin.js:84,100,115`
**Issue:** `...Download?api_key=${this.apiKey}` puts the API key in the URL. This is logged in Jellyfin server logs and browser history. Acceptable for a local kiosk but not best practice.
**Fix:** Use the `X-MediaBrowser-Token` header or a cookie-based session.

### 27. `launch_app` action accepts arbitrary app names
**File:** `system_files/usr/libexec/bazzzzite-tv-bridge:323-340`
**Issue:** The backend executes `subprocess.Popen([app])` for any app name. If the WebSocket is compromised, an attacker could run arbitrary binaries.
**Fix:** Validate `app` against a whitelist.

### 28. Parental control PIN stored in plaintext JSON
**File:** `system_files/usr/libexec/bazzzzite-tv-bridge:64-66`
**Issue:** Profile PINs are stored in `/etc/bazzzzite/profiles.json` as plaintext strings.
**Fix:** Hash PINs with bcrypt or a similar algorithm.

### 29. No XSS protection in frontend
**File:** Multiple JS files, especially `jellyfin.js:94-98`, `youtube.js:31-35`
**Issue:** `textContent` is used for titles (safe), but if any API returns HTML in a field that gets set via `innerHTML`, it could execute scripts. Currently low risk because `createItem` uses `textContent`, but `innerHTML` is used in `renderRecentlyAdded` etc. for the container, then items are appended. This is safe as long as `createItem` doesn't use `innerHTML`.
**Status:** Currently safe due to `textContent` usage, but should audit if any `innerHTML` is added later.

### 30. Hardcoded web apps may fail in kiosk
**File:** `system_files/usr/share/bazzzzite/shell/js/app.js:436-441`
**Issue:** Spotify Web (`open.spotify.com`) and Twitch require logins and have complex DRM/JS that often breaks in Chromium kiosk mode. There is no "back to TV" mechanism except Escape, which may not work in those sites.
**Fix:** Test these apps in the target kiosk environment, or remove them.

### 31. Missing error handling for `bootc` not being available
**File:** `system_files/usr/libexec/bazzzzite-update-check:5`
**Issue:** `bootc upgrade --check` will fail on non-bootc systems (e.g., if the image is run in a plain podman container). The `|| true` swallows the error, but the user gets no useful feedback.
**Fix:** Detect if `bootc` is available and show an appropriate message.

### 32. CEC device type default is wrong for NUC
**File:** `system_files/usr/libexec/bazzzzite-cecd:14`
**Issue:** `CEC_DEVICE` defaults to `"RPI"`. On x86 NUC, the CEC device is typically `/dev/cec0` or `/dev/video0`, not a Raspberry Pi-specific path. This may cause CEC to fail to open the device.
**Fix:** Default to `/dev/cec0` or auto-detect.

### 33. Game mode restart causes 3-second black screen
**File:** `system_files/usr/libexec/bazzzzite-game-mode:28`
**Issue:** `systemctl restart bazzzzite-tv-shell.service` triggers `ExecStartPre=/bin/sleep 3`, causing a visible black screen when exiting game mode.
**Fix:** Remove the sleep, or directly restart Cage without restarting the entire service.

### 34. `bazzzzite-yt` search returns empty array on yt-dlp failure
**File:** `system_files/usr/libexec/bazzzzite-yt:15-32`
**Issue:** If `yt-dlp` fails (network error, API change), `2>/dev/null` suppresses the error and the Python parser receives empty stdin, outputting `[]`. The UI shows "no results" with no error indication.
**Fix:** Surface yt-dlp errors to the caller.

---

## Summary of Top Fixes

| Priority | Fix |
|----------|-----|
| **P0** | Add `set -e` to `build.sh` |
| **P0** | Add `global current_profile` in tv-bridge.py:320 |
| **P0** | Add `import os` to cecd.py |
| **P0** | Change voice WS_URL from `wss://` to `ws://` |
| **P0** | Fix blocking `read()`/`readline()` in voice.py and cecd.py |
| **P0** | Fix `bazzzzite-fm` PATH shadowing and bash expansion |
| **P0** | Disable game-mode.service auto-start on boot |
| **P1** | Fix MPV `--vo=gpu,vdpau` → `--vo=gpu --hwdec=vaapi` |
| **P1** | Add WebSocket authentication/restriction |
| **P1** | Fix scale setting sync between localStorage and backend |
| **P2** | Download Vosk model during build |
| **P2** | Fix CEC device default for x86 NUC |
