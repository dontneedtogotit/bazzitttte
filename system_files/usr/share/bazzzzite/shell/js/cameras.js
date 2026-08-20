/**
 * Cameras - IP camera PiP viewer + motion detection
 */

const Cameras = {
    cameras: [],
    settings: {},
    watching: new Set(),

    init() {
        this.loadCameras();
        this.loadSettings();
        this.setupEventListeners();
    },

    setupEventListeners() {
        const addBtn = document.getElementById('cam-add-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => this.addCamera());
        }

        const stopAllBtn = document.getElementById('cam-stop-all-btn');
        if (stopAllBtn) {
            stopAllBtn.addEventListener('click', () => this.stopAll());
        }

        const scanBtn = document.getElementById('cam-scan-btn');
        if (scanBtn) {
            scanBtn.addEventListener('click', () => this.scan());
        }

        const settingIds = ['cam-pip-pos', 'cam-pip-size', 'cam-threshold-input', 'cam-popup', 'cam-cooldown', 'cam-fps', 'cam-width', 'cam-hwaccel'];
        settingIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', () => this.saveSettingFromElement(el));
                el.addEventListener('input', () => this.saveSettingFromElement(el));
            }
        });
    },

    getSettingKey(elementId) {
        const map = {
            'cam-pip-pos': 'pip_pos',
            'cam-pip-size': 'pip_size',
            'cam-threshold-input': 'threshold',
            'cam-popup': 'popup_seconds',
            'cam-cooldown': 'cooldown',
            'cam-fps': 'fps',
            'cam-width': 'width',
            'cam-hwaccel': 'hwaccel',
        };
        return map[elementId] || null;
    },

    saveSettingFromElement(el) {
        const key = this.getSettingKey(el.id);
        if (!key) return;
        const value = el.value;
        this.settings[key] = value;
        this.saveSetting(key, value);
    },

    async loadCameras() {
        if (!window.tvApp?.ws) return;
        window.tvApp.ws.send(JSON.stringify({action: 'cam_list'}));
    },

    async loadSettings() {
        if (!window.tvApp?.ws) return;
        window.tvApp.ws.send(JSON.stringify({action: 'cam_get_settings'}));
    },

    renderList(output) {
        const container = document.getElementById('cameras-row');
        const statusEl = document.getElementById('cam-status');
        if (!container) return;

        if (!output || output.includes('No /etc/bazzzzite/cameras.conf yet')) {
            container.innerHTML = '<div class="loading">No cameras configured. Add your first camera below.</div>';
            if (statusEl) statusEl.textContent = 'No cameras configured';
            return;
        }

        const lines = output.trim().split('\n').filter(l => l.trim() && !l.startsWith('#'));
        this.cameras = lines.map(line => {
            const parts = line.trim().split(/\s+/);
            return { name: parts[0], url: parts[1], threshold: parts[2] || '' };
        }).filter(c => c.name && c.url);

        container.innerHTML = '';

        this.cameras.forEach(cam => {
            const el = document.createElement('div');
            el.className = 'camera-card';
            el.tabIndex = 0;
            el.innerHTML = `
                <div class="camera-card-header">
                    <span class="camera-name">📹 ${this.escapeHtml(cam.name)}</span>
                    <div class="camera-actions">
                        <button class="cam-btn cam-btn-pip" data-name="${this.escapeHtml(cam.name)}" title="Show PiP">📺</button>
                        <button class="cam-btn cam-btn-watch" data-name="${this.escapeHtml(cam.name)}" title="Motion Watch">👁️</button>
                        <button class="cam-btn cam-btn-stop" data-name="${this.escapeHtml(cam.name)}" title="Stop">⏹️</button>
                        <button class="cam-btn cam-btn-delete" data-name="${this.escapeHtml(cam.name)}" title="Remove">🗑️</button>
                    </div>
                </div>
                <div class="camera-url">${this.escapeHtml(cam.url)}</div>
                ${cam.threshold ? `<div class="camera-threshold">Threshold: ${this.escapeHtml(cam.threshold)}</div>` : ''}
            `;

            el.addEventListener('click', (e) => {
                if (e.target.closest('.cam-btn')) return;
                this.pip(cam.name);
            });

            el.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.pip(cam.name);
                }
            });

            el.querySelector('.cam-btn-pip')?.addEventListener('click', () => this.pip(cam.name));
            el.querySelector('.cam-btn-watch')?.addEventListener('click', () => this.watch(cam.name));
            el.querySelector('.cam-btn-stop')?.addEventListener('click', () => this.stop(cam.name));
            el.querySelector('.cam-btn-delete')?.addEventListener('click', () => this.remove(cam.name));

            container.appendChild(el);
        });

        if (statusEl) statusEl.textContent = `${this.cameras.length} camera(s) configured`;
    },

    renderSettings(settings) {
        this.settings = settings;
        const hwaccelEl = document.getElementById('cam-hwaccel');
        const fpsEl = document.getElementById('cam-fps');
        const widthEl = document.getElementById('cam-width');
        const thresholdEl = document.getElementById('cam-threshold');
        const popupEl = document.getElementById('cam-popup');
        const cooldownEl = document.getElementById('cam-cooldown');
        const pipPosEl = document.getElementById('cam-pip-pos');
        const pipSizeEl = document.getElementById('cam-pip-size');

        if (hwaccelEl) hwaccelEl.value = settings.hwaccel || 'software';
        if (fpsEl) fpsEl.value = settings.fps || '2';
        if (widthEl) widthEl.value = settings.width || '320';
        if (thresholdEl) thresholdEl.value = settings.threshold || '10';
        if (popupEl) popupEl.value = settings.popup_seconds || '15';
        if (cooldownEl) cooldownEl.value = settings.cooldown || '30';
        if (pipPosEl) pipPosEl.value = settings.pip_pos || '-10-10';
        if (pipSizeEl) pipSizeEl.value = settings.pip_size || '320x180';
    },

    async addCamera() {
        const nameEl = document.getElementById('cam-name');
        const urlEl = document.getElementById('cam-url');
        const thresholdEl = document.getElementById('cam-threshold');
        const statusEl = document.getElementById('cam-status');

        const name = nameEl?.value?.trim();
        const url = urlEl?.value?.trim();
        const threshold = thresholdEl?.value?.trim();

        if (!name || !url) {
            if (statusEl) statusEl.textContent = 'Please enter both name and URL';
            return;
        }

        if (!window.tvApp?.ws) return;
        window.tvApp.ws.send(JSON.stringify({
            action: 'cam_add',
            payload: { name, url, threshold }
        }));

        if (nameEl) nameEl.value = '';
        if (urlEl) urlEl.value = '';
        if (thresholdEl) thresholdEl.value = '';

        setTimeout(() => this.loadCameras(), 500);
    },

    async remove(name) {
        if (!confirm(`Remove camera "${name}"?`)) return;
        if (!window.tvApp?.ws) return;
        window.tvApp.ws.send(JSON.stringify({
            action: 'cam_remove',
            payload: { name }
        }));
        setTimeout(() => this.loadCameras(), 500);
    },

    // Showing the PiP is now purely a shell-side concern -- no round trip to
    // the backend is needed to put the stream on screen.
    async pip(name) {
        this.togglePip(name);
    },

    async stop(name = '') {
        this.hidePip();
    },

    async stopAll() {
        await this.stop('');
    },

    async watch(name) {
        if (!window.tvApp?.ws) return;
        this.watching.add(name);
        window.tvApp.ws.send(JSON.stringify({
            action: 'cam_watch',
            payload: { name }
        }));
    },

    async unwatch(name) {
        if (!window.tvApp?.ws) return;
        this.watching.delete(name);
        window.tvApp.ws.send(JSON.stringify({
            action: 'cam_unwatch',
            payload: { name }
        }));
    },

    async scan() {
        const statusEl = document.getElementById('cam-status');
        if (statusEl) statusEl.textContent = 'Scanning network... this may take a minute. Check the terminal for results.';
        if (!window.tvApp?.ws) return;
        window.tvApp.ws.send(JSON.stringify({action: 'cam_scan'}));
    },

    async saveSetting(key, value) {
        if (!window.tvApp?.ws) return;
        window.tvApp.ws.send(JSON.stringify({
            action: 'cam_set_setting',
            payload: { key, value }
        }));
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // --- Picture-in-picture -------------------------------------------
    // The PiP is part of the shell rather than a separate window: Cage shows
    // one fullscreen window at a time, so a floating mpv overlay is not
    // possible. The stream is MJPEG transcoded by the bridge, since Chromium
    // cannot play RTSP directly.
    pipTimer: null,
    pipCamera: null,

    showPip(name, motion = false) {
        if (!name) return;
        const box = document.getElementById('cam-pip');
        const img = document.getElementById('cam-pip-img');
        const title = document.getElementById('cam-pip-title');
        const badge = document.getElementById('cam-pip-badge');
        if (!box || !img) return;

        // Only re-attach the stream when the camera actually changes, so a
        // repeated motion event doesn't restart ffmpeg and stutter the feed.
        if (this.pipCamera !== name) {
            this.pipCamera = name;
            img.src = `/cam/${encodeURIComponent(name)}/stream.mjpg?t=${Date.now()}`;
        }
        if (title) title.textContent = name;
        if (badge) badge.classList.toggle('hidden', !motion);

        box.classList.remove('hidden');

        if (this.pipTimer) {
            clearTimeout(this.pipTimer);
            this.pipTimer = null;
        }
        if (motion) {
            const secs = parseInt(this.settings.popup_seconds, 10) || 15;
            this.pipTimer = setTimeout(() => this.hidePip(), secs * 1000);
        }
    },

    hidePip() {
        const box = document.getElementById('cam-pip');
        const img = document.getElementById('cam-pip-img');
        if (this.pipTimer) {
            clearTimeout(this.pipTimer);
            this.pipTimer = null;
        }
        this.pipCamera = null;
        if (box) box.classList.add('hidden');
        // Drop the connection so the bridge can stop its ffmpeg process.
        if (img) img.src = '';
    },

    togglePip(name) {
        const box = document.getElementById('cam-pip');
        if (box && !box.classList.contains('hidden') && this.pipCamera === name) {
            this.hidePip();
        } else {
            this.showPip(name, false);
        }
    }
};

window.Cameras = Cameras;
