# bazzitttte

Custom [bootc](https://bootc.dev/) image based on **Bazzite Desktop (KDE)** for the **Intel NUC7i5BNH** (Core i5-7260U, Iris Plus 640, 16 GB RAM).

Derived from the [Universal Blue image template](https://github.com/ublue-os/image-template). Builds and publishes to GHCR via GitHub Actions as `ghcr.io/getoffover/bazzitttte`.

## What's baked in

- **Base:** `ghcr.io/ublue-os/bazzite:stable` (KDE desktop, open-source Intel GPU drivers — correct choice for the NUC's Iris Plus 640; no NVIDIA image needed).
- **Lightweight tweaks** for the 2C/4T CPU:
  - ZRAM swap (up to 4 GiB, `lz4`) via `system_files/etc/systemd/zram-generator.conf.d/nuc.conf`
  - VM tuning for ZRAM (`vm.swappiness = 100`, `vm.page-cluster = 0`) via `system_files/etc/sysctl.d/90-nuc.conf`
  - Hardware-specific services masked: `ModemManager`, `fprintd`, `switcheroo-control`, `geoclue` (none apply to this NUC)
  - Baloo (KDE file indexer) disabled via `system_files/etc/xdg/baloofilerc` — saves RAM + CPU
- **Hardware Acceleration & GPU Tools:** `libva-intel-media-driver` (iHD VA-API hardware decoding for Iris Plus 640), `libva-utils` (`vainfo`), `igt-gpu-tools` (`intel_gpu_top`), and `gamemode` (CPU/thread optimization).
- **Auto-login** — `bazzitttte-autologin` unit writes SDDM autologin for the first user at first boot (Plasma Wayland). Toggle with `ujust bazzitttte-autologin-disable` / `ujust bazzitttte-autologin-enable`.
- **Boot-into-Kodi option** — `ujust bazzitttte-boot-kodi` / `ujust bazzitttte-boot-desktop` toggles a Kodi fullscreen autostart over the autologin Plasma session.
- **Ad-free YouTube** — `ujust bazzitttte-youtube` installs FreeTube as a user flatpak on first run (no ads, SponsorBlock, no tracking).
- **GPU Stats & Streaming Mods:**
  - `ujust bazzitttte-gpu-stats`: Monitor Intel GPU load with `intel_gpu_top` & check VA-API status.
  - `ujust bazzitttte-sunshine`: Install & launch Sunshine game streaming server (Moonlight compatible).
  - `ujust bazzitttte-steam-bp`: Launch Steam Big Picture Mode / Gamepad UI.
- **Media / HTPC:** `kodi`, `jellyfin` (server, enabled at boot, firewall opened for LAN via `jellyfin-firewalld`), `mpv`, `yt-dlp`
- **Emulation:** `retroarch`, `dolphin-emu` baked in; PCSX2 via `ujust bazzitttte-psx2` (official Flathub flatpak — pcsx2 is no longer packaged for Fedora/RPMFusion).
- **Jellyfin VAAPI transcoding** — a `jellyfin.service` drop-in adds the `render` group so the iGPU is reachable; run `ujust bazzitttte-jellyfin-vaapi` to finish the one-time config.
- **HDMI-CEC remote control** — `libcec`/`cec-client` baked in; test with `ujust bazzitttte-cec-test`, then enable CEC in Kodi.
- **Camera PiP + motion popup** — show your RTSP/IP cameras as a corner picture-in-picture, or have them pop up briefly on motion. See [Network cameras](#network-cameras-pip--motion).
- **AdGuard Home** — opt-in network-wide DNS ad blocker run as a Podman quadlet; `ujust bazzitttte-adguard start`.
- **Health dashboard** — `ujust bazzitttte-health` shows temps, fan, SSD SMART, disk use, image version and pending flatpak updates in one screen.

Bazzite itself already brings full codecs, HDR, VRR, MangoHud, Flatpak/Flathub, distrobox, and the OGC kernel, so those aren't layered again.

## Repository layout

| Path | Purpose |
| --- | --- |
| `Containerfile` | Build definition; `FROM` points at the Bazzite base image (digest pin auto-bumped by Renovate). |
| `build_files/build.sh` | Installs packages, bakes flatpaks, enables/masks services. Edit/add sections here for new tweaks. |
| `system_files/` | Dropped onto `/` during the build (zram, sysctl, autologin unit+script, baloo config, ujust recipes). |
| `bazzitttte.env` | Image name, org, labels used by the `Justfile`. |
| `.github/workflows/build.yml` | Builds the OCI image on push/schedule/PR. |
| `.github/workflows/build-disk.yml` | Builds qcow2/anaconda-iso installers on demand. |
| `disk_config/` | Disk-image build config; the ISO kickstart rebases to `ghcr.io/getoffover/bazzitttte:latest`. |

## First-time setup (GitHub)

1. **Cosign signing key** (required — the build fails without it):
   ```bash
   COSIGN_PASSWORD="" cosign generate-key-pair
   ```
   Keep `cosign.key` **out of git** (already git-ignored); back it up. Commit `cosign.pub`.
2. Add the private key as an Actions secret named `SIGNING_SECRET`:
   ```bash
   gh secret set SIGNING_SECRET < cosign.key
   ```
3. Push to a repo named `bazzitttte` under `getoffover`, then enable Actions on the repo.
4. (Optional) On the NUC, for a UEFI install ISO, run the `build-disk.yml` workflow (`anaconda-iso`) and grab the artifact.

## Installing / updating on the NUC

Rebase from stock Bazzite (or another Fedora Atomic) to the custom image:

```bash
sudo bootc switch ghcr.io/getoffover/bazzitttte:latest
sudo reboot
```

Updates flow automatically through the scheduled workflow (rebuilt daily, picking up upstream Bazzite changes). See [Updates (OTA)](#updates-ota) — after the first install you never touch the ISO again.

Secure boot: the base image's kernel is signed by Universal Blue's key. If Secure Boot is on, enroll it first (`ujust enroll-secure-boot-key`, password `universalblue`) before rebasing.

## Updates (OTA)

**The ISO is only an installer.** Once the NUC is running bazzitttte, you update it over the air with `bootc` — it downloads only the changed image layers (a delta, not the whole image), stages them, and swaps on reboot (A/B). Roll back any time.

How a change reaches the NUC:

1. Edit `build_files/` or `system_files/`, then `git push`. CI builds and publishes a new image to GHCR (or run `just publish` locally to push without CI).
2. On the NUC, apply it:

```bash
ujust bazzitttte-update-status   # check for OS + flatpak updates (no download)
ujust bazzitttte-update          # download delta + update flatpaks, prompt to reboot
ujust bazzitttte-rollback        # undo a bad update
```

- `bazzitttte-update` runs `bootc upgrade` (OS image) + `flatpak update` (FreeTube, PCSX2, etc.), then offers to reboot. The staged update also applies automatically at the next shutdown.
- Fully-automatic updates: enable bootc's updater with `sudo systemctl enable --now bootc-fetch-apply-updates.service` (it will reboot on its own — off by default so it doesn't interrupt the TV).
- Local builds apply without any download: `sudo bootc switch --transport containers-storage localhost/bazzitttte:latest` (see Local testing).

## Local testing

Requires `just`, `podman`, `jq` (all present on Bazzite):

```bash
sudo just build && sudo just ostree-rechunk
sudo bootc switch --transport containers-storage localhost/bazzitttte:latest
```

Roll back any time with `sudo bootc rollback`.

## Network cameras (PiP + motion)

Show your IP/RTSP cameras as a small picture-in-picture in the corner of the screen, or have one pop up automatically when it sees motion. Cameras are defined in `/etc/bazzitttte/cameras.conf` (one per line: `<name> <stream-url> [motion-threshold]`).

```bash
ujust bazzitttte-cam-list            # show configured cameras
ujust bazzitttte-cam-pip frontdoor   # show 'frontdoor' in the corner (mpv, HW-decoded)
ujust bazzitttte-cam-stop            # hide PiP (pass a name to hide just one)
ujust bazzitttte-cam-watch frontdoor # monitor + pop the PiP up on motion (background)
ujust bazzitttte-cam-unwatch frontdoor
```

Notes:
- Motion detection analyses the stream with `ffmpeg` (frame-difference + `signalstats`). It is shown over the Plasma desktop; it will not draw over an exclusive-fullscreen Kodi/game session (you still get a desktop notification).
- Tune per camera via the optional threshold field, or globally with `CAM_THRESHOLD`, `CAM_POPUP_SECONDS`, `CAM_COOLDOWN`, `CAM_PIP_POS`, `CAM_PIP_SIZE`.
- The watcher software-decodes by default for stream compatibility; set `CAM_HWACCEL=vaapi` to offload decode to the iGPU and cut CPU use on the 2-core NUC.
- On Wayland the PiP window may not stay strictly corner-pinned; if so, right-click its titlebar > More Actions > Keep Above Others, or drag it to the corner.

## AdGuard Home (network-wide ad blocking)

Runs as a Podman quadlet (`system_files/usr/share/containers/systemd/adguardhome.container`). It is **opt-in** and does not auto-start, because binding DNS port 53 can conflict with `systemd-resolved`.

```bash
ujust bazzitttte-adguard start    # start + print the setup-wizard URL (:3000)
ujust bazzitttte-adguard status   # status / stop / logs
```

To use it network-wide, point your router's (or each device's) DNS at the NUC's IP. If DNS won't bind, disable the `systemd-resolved` stub listener — the recipe prints the exact commands.

## Notes / roadmap

- `kodi` and `jellyfin` come from RPMFusion-free; `retroarch`, `dolphin-emu`, `mpv`, `yt-dlp`, `gamemode` and the Intel GPU tools come from Fedora proper (`intel-gpu-tools`/`intel-media-driver` were renamed upstream to `igt-gpu-tools`/`libva-intel-media-driver`).
- FreeTube and PCSX2 are installed at first run as **user flatpaks** (same pattern Bazzite uses), so the image stays lean and the flatpaks stay independently updatable.
- Jellyfin first-run setup happens via the web UI at `http://<nuc-ip>:8096` (port is opened in firewalld at image build).
- This is an Intel-only (no NVIDIA) build; pick a `-nvidia` base if hardware changes.
- Trim packages you don't use in `build_files/build.sh` — everything is grouped by section.
- All custom `ujust` recipes live in `system_files/usr/share/ublue-os/just/90-bazzitttte.just` (auto-imported).
- HTPC extras baked in: `libcec` (CEC remote), `ffmpeg` (camera motion), `lm_sensors` + `smartmontools` (health dashboard).
- The camera motion watcher and AdGuard Home are deliberately lightweight/opt-in for the 2-core NUC — enable only what you use.
