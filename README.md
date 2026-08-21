# Bazzzzite TV

Custom [bootc](https://bootc.dev/) image turning an **Intel NUC7i5BNH** into a replacement smart TV OS.

Derived from [Bazzite Desktop (KDE)](https://github.com/ublue-os/bazzite) and published to GHCR as `ghcr.io/dontneedtogotit/bazzitttte`.

## What it is

A **real TV operating system** that replaces your TV's dead smart features and Kodi-on-KDE with a purpose-built 10-foot interface:

- **Kodi-style 10-foot interface** — sidebar menu, fanart backdrops, info panel
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
- **TV Shell:** Cage + Chromium kiosk, Kodi Estuary-style custom interface
- **Video:** MPV with VA-API hardware decoding, WebSocket IPC for shell control
- **Media Server:** Jellyfin (auto-starts, firewall opened for LAN)
- **Remote:** libcec + CEC daemon translating Samsung remote buttons to shell input
- **Emulation:** RetroArch + Dolphin (GameCube/Wii) + PCSX2 (PS2) via ujust
- **IPTV:** m3u playlist support with EPG-ready channel list
- **YouTube:** yt-dlp + MPV (ad-free, 1080p60, no tracking)
- **YouTube:** VacuumTube (YouTube Leanback) with ad blocking, SponsorBlock and DeArrow
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

### Interface

The shell follows Kodi's Estuary layout:

- **Sidebar menu** down the left (Home, Media, Live TV, Games, Cameras, YouTube, Apps)
- **Fanart backdrop** of whatever is focused, dimmed behind the UI
- **Info panel** showing title, year, rating, runtime and plot, updating as you move

Navigation matches Kodi: **Up/Down** moves through the menu, **Right** enters the
content, and **Left** from the first item in a row returns to the menu.

### Remote Control

Your **Samsung Anynet+ remote** works via HDMI-CEC:

- **Arrow keys:** Navigate the UI
- **Enter/OK:** Select
- **Return/Exit:** Go back (hold ~1.2s inside YouTube to quit back to the shell)
- **Home:** Return to home screen
- **Play/Pause:** Toggle video playback
- **Volume Up/Down:** System volume
- **Channel Up/Down:** Page up/down inside apps

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
| YouTube (VacuumTube) | Apps tab or YouTube tab — ad-free, SponsorBlock |
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
ujust bazzzzite-doctor          # Full health report -- run this first when something's wrong
ujust bazzzzite-refresh-ui      # Clear the browser cache and reload the shell
ujust bazzzzite-shell-update    # Update the interface from git, no image build
ujust bazzzzite-shell-reset     # Go back to the interface shipped in the image
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
ujust bazzzzite-youtube          # Launch YouTube (VacuumTube)
ujust bazzzzite-youtube-stop     # Exit YouTube and return to home
ujust bazzzzite-install-flatpaks # Retry installing VacuumTube
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

## YouTube (VacuumTube)

YouTube runs in **VacuumTube**, a Wayland-native wrapper around YouTube's
Leanback ("TV") interface — the same 10-foot UI a Samsung TV shows, with the
enhancements TizenTube is known for built in.

### Features
- **Real TV interface** — YouTube Leanback, designed for a remote
- **Ad blocking** — video and feed ads, built in
- **SponsorBlock** — skips sponsored segments automatically
- **DeArrow** — replaces clickbait titles and thumbnails
- **Return Dislikes**, resolution unlock and codec filtering
- **Hardware decoding** — native Wayland, no browser kiosk involved
- **Own login** — sign in once inside the app; no separate profile juggling

### How to use
1. **From the shell:** Apps tab or YouTube tab → **YouTube**
2. **From CLI:**
   ```bash
   ujust bazzzzite-youtube       # launch
   ujust bazzzzite-youtube-stop  # quit, back to the TV shell
   ```

VacuumTube installs automatically on first boot (it is a Flatpak, so it cannot
be baked into the image). If it is missing — for example the first boot had no
network — run `ujust bazzzzite-install-flatpaks` to retry.

### Remote control
Cage is a Wayland compositor, so `xdotool` cannot deliver remote presses to an
app. Presses are injected as real input events with **ydotool** instead, driven
by `bazzzzite-cecd`, which sends them to the shell or to VacuumTube depending
on which is in front.

| Button | In VacuumTube |
|--------|---------------|
| Arrows / OK | Navigate and select |
| **Back (short press)** | Back — leaves the video, returns to browsing |
| **Back (long press, 1.2s)** | Quits YouTube, back to the TV shell |
| Play/Pause, Volume, Mute | As expected |

VacuumTube binds its own "back" to a right-click, so a short Back press sends
exactly that. Tune the hold time with `CEC_LONG_PRESS_SECONDS`.

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

## Troubleshooting

**Start here:**

```bash
ujust bazzzzite-doctor
```

It reports the booted image and digest, whether an update is staged but not
yet rebooted into, where the shell is being served from, whether what the
browser receives is the current UI, the state of every service, whether the
CEC adapter is visible, and what is installed. Paste the whole thing when
asking for help.

### The interface looks unchanged after an update

The browser caches the shell in `~/.cache/chromium`, which lives in your home
directory and therefore survives an image update. If `bazzzzite-doctor` says
the image is current but the served shell is the old layout:

```bash
ujust bazzzzite-refresh-ui
```

### Changing the interface without waiting for a build

The shell is plain HTML/CSS/JS, so it does not need an image build:

```bash
ujust bazzzzite-shell-update        # pull the current UI from the repo
ujust bazzzzite-shell-update mybranch
ujust bazzzzite-shell-reset        # drop the override, use the image's copy
```

The override lives in `/var/lib/bazzzzite/shell` and is resolved per file, so
anything it does not contain still comes from the image. For editing directly
on the TV, `sudo bootc usr-overlay` makes `/usr` writable until the next
reboot.

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
