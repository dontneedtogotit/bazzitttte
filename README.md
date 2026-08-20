# Bazzzzite TV

Custom [bootc](https://bootc.dev/) image turning an **Intel NUC7i5BNH** into a replacement smart TV OS.

Derived from [Bazzite Desktop (KDE)](https://github.com/ublue-os/bazzite) and published to GHCR as `ghcr.io/dontneedtogotit/bazzitttte`.

## What it is

A **real TV operating system** that replaces your TV's dead smart features and Kodi-on-KDE with a purpose-built 10-foot interface:

- **Cage** kiosk compositor locks down the display
- **Chromium** kiosk renders a Netflix-style TV shell
- **Jellyfin** media server for your local library
- **MPV** hardware-accelerated video playback (VA-API)
- **CEC remote** support (use your Samsung TV's Anynet+ remote)
- **RetroArch** emulation hub integrated into the shell
- **IPTV** live TV support via m3u playlists
- **YouTube** search and playback via yt-dlp + MPV (ad-free)
- **Voice control** (offline wake word "hey tv" / "bazzzzite" + commands)
- **Game mode** (disable Cage, performance CPU governor)
- **DLNA/UPnP renderer** (Samsung AllShare compatible)
- **In-OS update GUI** (check, apply, rollback from Settings)
- **bootc** for atomic OTA updates with A/B rollback

## Hardware target

- **NUC7i5BNH** (i5-7260U, Iris Plus 640, 16GB RAM, 256GB NVMe)
- **~2013 70" Samsung Smart TV** (ES/F series, HDMI-CEC/Anynet+)
- The TV's built-in smart features are completely bypassed

## What's baked in

- **Base:** `ghcr.io/ublue-os/bazzite:stable` (KDE Plasma Wayland, Intel open-source drivers)
- **TV Shell:** Cage + Chromium kiosk with custom HTML/CSS/JS interface
- **Video:** MPV with VA-API hardware decoding, WebSocket IPC for shell control
- **Media Server:** Jellyfin (auto-starts, firewall opened for LAN)
- **Remote:** libcec + CEC daemon translating Samsung remote buttons to shell input
- **Emulation:** RetroArch + Dolphin (GameCube/Wii) + PCSX2 (PS2) via ujust
- **IPTV:** m3u playlist support with EPG-ready channel list
- **YouTube:** yt-dlp + MPV (ad-free, 1080p60, no tracking)
- **YouTube TV:** Fullscreen YouTube app (Tizen-like) with login, uBlock Origin ad blocking, and guest mode
- **Voice:** Vosk offline speech recognition (wake word + commands)
- **Game Mode:** Disables Cage compositor, sets CPU governor to performance
- **DLNA:** Rygel renderer for Samsung AllShare / casting
- **Performance:** ZRAM (4GiB lz4), masked services, gamemode, igt-gpu-tools
- **Updates:** bootc OTA (delta layers, automatic rollback), daily update checker timer

## First-time setup

1. **Rebase from stock Bazzite:**

```bash
sudo bootc switch ghcr.io/dontneedtogotit/bazzitttte:latest
sudo reboot
```

2. **Complete Jellyfin first-run wizard:**

```bash
ujust bazzzzite-jellyfin-setup
```

3. **Get your API key** from Jellyfin Dashboard > Advanced > API Keys and paste it when prompted.

4. **Add IPTV channels** (optional):

```bash
ujust bazzzzite-iptv-add
ujust bazzzzite-iptv-update
```

5. **Reboot** and enjoy your new TV OS.

## Using the TV

### Remote Control

Your **Samsung Anynet+ remote** works via HDMI-CEC:

- **Arrow keys:** Navigate the UI
- **Enter/OK:** Select
- **Return/Exit:** Go back
- **Home:** Return to home screen
- **Play/Pause:** Toggle video playback
- **Volume Up/Down:** System volume
- **Channel Up/Down:** Not mapped by default

### Voice Commands (optional)

Enable in Settings > Features > Voice, then say:
- **"Hey TV"** or **"Bazzzzite"** (wake word)
- **"Play <query>"** - search YouTube and play
- **"Pause" / "Stop"** - control playback
- **"Volume up/down"** - adjust volume
- **"Home" / "Back"** - navigation
- **"Launch <app>"** - open an app

### Keyboard shortcuts (if you plug in a keyboard)

- **Arrow keys:** Navigate
- **Enter:** Select
- **Escape:** Back
- **Space:** Play/Pause

### Apps & Features

| Feature | How to access |
|---------|---------------|
| Media Library | Home tab (Continue Watching, Movies, TV Shows) |
| Live TV | Live TV tab (after configuring IPTV) |
| YouTube | YouTube tab (search + play, ad-free) |
| YouTube TV | Apps tab (fullscreen app with login, ad blocking) |
| Emulation | Games tab (select system, launch) |
| Jellyfin Web UI | Apps tab, or `http://localhost:8096` |
| Settings | Gear icon in top-right |

### In-OS Update GUI

1. Open **Settings** (gear icon)
2. Go to **System > Check for Updates**
3. If an update is available, the star badge appears in the top-right
4. Click the badge or Settings > Check for Updates to see details
5. Click **Download & Install** to apply the OS update
6. The system will reboot automatically

## ujust recipes

```bash
ujust bazzzzite-status          # Show status of all services
ujust bazzzzite-restart-shell   # Restart the TV shell
ujust bazzzzite-test-cec        # Test HDMI-CEC remote
ujust bazzzzite-gpu-stats       # Intel GPU monitor + VA-API check
ujust bazzzzite-jellyfin-setup  # Configure Jellyfin API key
ujust bazzzzite-iptv-add        # Add IPTV m3u playlist URL
ujust bazzzzite-iptv-update     # Fetch IPTV channels
ujust bazzzzite-tv-scale 1.5    # Set UI scale (1.0 - 2.0)
ujust bazzzzite-voice-enable    # Enable voice control
ujust bazzzzite-voice-disable   # Disable voice control
ujust bazzzzite-game-mode       # Enable game mode (performance governor)
ujust bazzzzite-dlna-enable     # Enable DLNA renderer (AllShare)
ujust bazzzzite-dlna-disable    # Disable DLNA renderer
ujust bazzzzite-edid            # Detect optimal HDMI mode for your TV
ujust bazzzzite-update          # OTA update + flatpak update
ujust bazzzzite-rollback        # Rollback to previous OS image
ujust bazzzzite-update-status   # Check for updates without applying
ujust bazzzzite-yt-app          # Launch YouTube (account mode, ad-blocked)
ujust bazzzzite-yt-app-guest    # Launch YouTube (guest mode, ad-blocked, wiped on every launch)
ujust bazzzzite-yt-signin       # Windowed Google sign-in for the account profile
ujust bazzzzite-yt-app-stop     # Exit YouTube and return to home
```

## Storage layout (256GB NVMe)

| Mount | Size | Purpose |
|-------|------|---------|
| `/` | 30GB | OS + apps |
| `/mnt/media` | 100GB+ | Media library (Jellyfin reads from here) |
| Swap | 4GB ZRAM | Compressed swap (lz4) |

Connect your media drive to `/mnt/media` or symlink your NAS mount there.

## Video playback notes

- **Codecs:** H.264, HEVC, VP9 via Intel VA-API (Iris Plus 640)
- **Resolution:** Force 1080p@60Hz recommended for your 2013 Samsung
- **HDR:** The TV doesn't support HDR10+/Dolby Vision. MPV will tone-map HDR10 → SDR if needed.
- **Audio:** Optical out available on NUC. Configure passthrough (AC3/DTS) if you have a receiver.

## Emulation

Supported systems via RetroArch:

| System | Core | Notes |
|--------|------|-------|
| NES | fceumm | |
| SNES | snes9x | |
| N64 | mupen64plus | |
| GBA | mgba | |
| PlayStation | pcsx_rearmed | |
| PS2 | PCSX2 (flatpak) | Heavy, may stutter on 2-core |
| GameCube/Wii | Dolphin | Heavy, may stutter on 2-core |

ROMs go on your media drive. Launch from Games tab.

## IPTV setup

1. Find an m3u playlist URL (from your IPTV provider)
2. Run `ujust bazzzzite-iptv-add` and paste the URL
3. Run `ujust bazzzzite-iptv-update` to fetch channels
4. Channels appear in the Live TV tab

## YouTube TV (Tizen-like fullscreen app)

YouTube TV launches a dedicated fullscreen YouTube experience, similar to Samsung Smart TV's YouTube app.

### Features
- **Fullscreen TV interface** (`youtube.com/tv`) optimized for 10-foot UI
- **Login support** — persistent profile, plus a windowed one-time sign-in flow for easier Google 2FA
- **Ad blocking** — uBlock Origin loaded in *both* account and guest mode
- **Guest mode** — a real profile that's wiped clean before every launch (not Chromium's built-in Incognito, so ad blocking still works)
- **No mouse pointer** — hidden for an authentic remote-control feel
- **CEC remote navigation** — works directly in YouTube
- **Hardware acceleration** — VA-API video decoding

### How to use
1. **First time only — sign in:** `ujust bazzzzite-yt-signin` opens a normal windowed browser (not kiosk) so Google's login/2FA flow works smoothly. Sign in, then exit (Escape) — the session persists in the account profile.
2. **From Apps tab:** Select **YouTube** (account) or **YouTube Guest**
3. **From CLI:**
   ```bash
   ujust bazzzzite-yt-app        # account mode
   ujust bazzzzite-yt-app-guest  # guest mode
   ujust bazzzzite-yt-signin     # windowed sign-in
   ujust bazzzzite-yt-app-stop   # exit back to TV shell
   ```
4. **Navigation:** Use your Samsung remote (arrow keys, Enter, Back, Play/Pause)
5. **Exit:** Press Back/Escape on your remote or keyboard

### Profiles
- **Account mode:** Uses `~/.config/bazzzzite/youtube-tv` — login persists across sessions
- **Guest mode:** Uses `~/.config/bazzzzite/youtube-tv-guest`, which is deleted and recreated at the start of every launch — nothing persists, but it's a real profile so uBlock and other mods still apply

### Switching between account and guest
1. Exit YouTube (`ujust bazzzzite-yt-app-stop`)
2. Launch the other mode (`ujust bazzzzite-yt-app` or `ujust bazzzzite-yt-app-guest`)

## IP cameras (picture-in-picture + motion)

Show a network camera in a corner of the TV, and pop it up automatically when
something moves.

The picture-in-picture is drawn **inside the TV shell**, not as a separate
window. Cage is a single-window kiosk compositor, so a floating mpv overlay is
not possible; the bridge transcodes the camera to MJPEG (Chromium cannot play
RTSP directly) and the shell displays it.

### Setup

1. Add a camera from the **Cameras** tab, or edit `/etc/bazzzzite/cameras.conf`:

   ```
   frontdoor rtsp://user:pass@192.168.1.50:554/stream1
   backyard  rtsp://192.168.1.51:554/live 12
   ```

   The optional third field is the motion threshold (higher = less sensitive,
   default 10). The shipped file contains **commented examples only** — until
   you add a real camera, nothing will appear.

2. Not sure of the URL? `ujust bazzzzite-cam-scan` probes the LAN for cameras.

3. Start motion watching:

   ```bash
   ujust bazzzzite-cam-watch frontdoor
   ```

### Behaviour

- The PiP stays **hidden** until motion is detected, then slides into the
  bottom-right with a **MOTION** badge and hides itself again after
  `popup_seconds` (default 15).
- `cooldown` (default 30s) stops a busy scene from re-triggering constantly.
- Press **0**, or **Back/Escape**, to dismiss it immediately. Back dismisses the
  PiP first and only then leaves the current tab.
- Select a camera in the Cameras tab to pin it open (no auto-hide); select it
  again to close.

### Tuning

| Setting | Default | Purpose |
|---------|---------|---------|
| `CAM_FPS` / `CAM_WIDTH` | 2 / 320 | Frames analysed for motion — low is fine and cheap |
| `CAM_PIP_FPS` / `CAM_PIP_WIDTH` | 8 / 480 | The picture you actually watch |
| `CAM_THRESHOLD` | 10 | Sensitivity; higher = less sensitive |
| `CAM_POPUP_SECONDS` | 15 | How long the popup stays |
| `CAM_COOLDOWN` | 30 | Minimum gap between popups |

Motion analysis runs continuously per watched camera, so on the NUC's 2-core
CPU keep an eye on load if you watch several at once — `CAM_HWACCEL=vaapi`
offloads decoding to the GPU.

## DLNA / Casting

Enable DLNA renderer to let your Samsung TV cast media to the NUC:
```bash
ujust bazzzzite-dlna-enable
```
Your TV should see "Bazzzzite" in its AllShare or Smart View menu.

## Voice Control

Requires a USB microphone. Enable with:
```bash
ujust bazzzzite-voice-enable
```
The voice daemon listens for wake words "hey tv" or "bazzzzite", then parses commands. Voice control runs as a systemd service and can be toggled from Settings.

## Game Mode

Launch a game from the Games tab or enable game mode manually:
```bash
ujust bazzzzite-game-mode
```
This stops Cage (compositor), sets CPU governor to performance, and gives your game full resources. Exit game mode by pressing Escape or rebooting.

## HDMI Mode Detection

If your TV displays at the wrong resolution or has overscan:
```bash
ujust bazzzzite-edid
```
This reads the TV's EDID and saves the optimal mode to `/etc/bazzzzite/edid-mode`. Reboot to apply.

## Development

### Local build

```bash
sudo just build && sudo bootc switch --transport containers-storage localhost/bazzzzite:latest
```

### Run in VM

```bash
just run-vm-qcow2
```

### Project layout

| Path | Purpose |
|------|---------|
| `Containerfile` | Build definition |
| `build_files/build.sh` | Package installation |
| `system_files/` | Dropped onto `/` during the build |
| `disk_config/` | Bootc Image Builder config for ISO/VM images |
| `bazzzzite.env` | Image name, org, labels |
| `Justfile` | Build, publish, and VM tasks |
| `.github/workflows/build.yml` | Builds and pushes OCI image to GHCR |

## Roadmap

- [ ] Unified content search across Jellyfin + YouTube + IPTV
- [ ] AI content recommendations
- [ ] Multi-user profiles with PIN-protected parental controls
- [ ] Hero banner auto-populated from Jellyfin recently added
- [ ] Chromecast/AirPlay receiver
- [ ] Automatic game mode trigger when launching RetroArch/Dolphin

## License

Apache-2.0
