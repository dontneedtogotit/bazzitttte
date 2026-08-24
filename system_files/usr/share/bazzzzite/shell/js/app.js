/**
 * Bazzzzite TV Shell - Main Application
 */

// The remote spells its navigation keys differently from a keyboard, and the
// navigation switch only ever knew the keyboard's names -- so arrows and OK
// from the remote fell through it and did nothing. Translating here keeps one
// path for both. Media, back and home keys have no keyboard equivalent and are
// handled under their own names.
const CEC_KEYS = {
    up: 'ArrowUp',
    down: 'ArrowDown',
    left: 'ArrowLeft',
    right: 'ArrowRight',
    enter: 'Enter',
};

class TVApp {
    constructor() {
        this.ws = null;
        this.currentTab = 'home';
        this.focusIndex = 0;
        this.focusableItems = [];
        this.mpvConnected = false;
        this.jellyfinUrl = 'http://localhost:8096';
        this.jellyfinApiKey = localStorage.getItem('jf_api_key') || '';
        
        this.init();
    }

    init() {
        this.connectWebSocket();
        this.setupNavigation();
        this.setupSettings();
        this.setupYouTube();
        this.setupUpdates();
        this.setupProfiles();
        this.setupCameras();
        this.setupInfoPanel();
        this.startClock();
        // Land focus on the launcher at boot: under Cage there is no pointer,
        // so an unfocused page makes the remote appear dead.
        this.switchTab('home');
        this.loadIPTV();
        this.loadEmulation();
        this.loadApps();
        
        if (this.jellyfinApiKey) {
            this.loadJellyfin();
        }
        
        setTimeout(() => this.checkInitialUpdate(), 5000);
    }

    checkInitialUpdate() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({action: 'os_check_update'}));
        }
    }

    connectWebSocket() {
        const wsUrl = `ws://${window.location.hostname}:8080/ws`;
        this.authToken = null;
        this.fetchAuthToken().then(token => {
            this.authToken = token;
            this.openWebSocket();
        }).catch(() => {
            this.openWebSocket();
        });
    }

    async fetchAuthToken() {
        try {
            const res = await fetch('/token');
            if (res.ok) {
                const data = await res.json();
                return data.token || null;
            }
        } catch (e) {
            console.error('Failed to fetch auth token:', e);
        }
        return null;
    }

    openWebSocket() {
        const wsUrl = `ws://${window.location.hostname}:8080/ws`;
        this.reconnectDelay = 2000;
        try {
            this.ws = new WebSocket(wsUrl);
            this.ws.onopen = () => {
                console.log('Connected to TV bridge');
                this.reconnectDelay = 2000;
                if (this.authToken) {
                    this.ws.send(JSON.stringify({action: 'auth', payload: {token: this.authToken}}));
                }
                this.ws.send(JSON.stringify({action: 'get_status'}));
                Settings.load();
                Profiles.load();
            };
            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleBridgeMessage(data);
                } catch (e) {
                    console.error('Failed to parse bridge message:', e);
                }
            };
            this.ws.onclose = () => {
                console.log('Bridge disconnected, reconnecting in ' + this.reconnectDelay + 'ms...');
                setTimeout(() => {
                    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
                    this.connectWebSocket();
                }, this.reconnectDelay);
            };
            this.ws.onerror = (err) => {
                console.error('WebSocket error:', err);
            };
        } catch (e) {
            console.error('WebSocket error:', e);
            setTimeout(() => this.connectWebSocket(), this.reconnectDelay);
        }
    }

    handleBridgeMessage(data) {
        switch (data.action) {
            case 'mpv_status':
                this.mpvConnected = data.payload.status === 'running';
                break;
            case 'cec_event':
                this.handleCECEvent(data.payload);
                break;
            case 'status':
                this.mpvConnected = data.payload.mpv_running;
                if (data.payload.settings) {
                    Settings.apply(data.payload.settings);
                }
                break;
            case 'yt_results':
                if (window.YouTube) {
                    window.YouTube.renderResults(data.payload.videos || []);
                }
                break;
            case 'os_update_status':
                if (window.Updates) {
                    window.Updates.showStatus(data.payload);
                }
                if (data.payload.available) {
                    document.getElementById('update-badge').classList.remove('hidden');
                }
                break;
            case 'settings':
                if (window.Settings) {
                    Settings.apply(data.payload);
                }
                break;
            case 'profiles':
                if (window.Profiles) {
                    Profiles.render(data.payload);
                }
                break;
            case 'voice_status':
                Settings.updateVoiceStatus(data.payload.running);
                break;
            case 'game_mode':
                Settings.updateGameModeStatus(data.payload.enabled);
                break;
            case 'rygel_status':
                Settings.updateRygelStatus(data.payload.running);
                break;
            case 'cam_list':
                if (window.Cameras) {
                    window.Cameras.renderList(data.payload.output);
                }
                break;
            case 'cam_pip':
            case 'cam_stop':
            case 'cam_watch':
            case 'cam_unwatch':
                if (window.Cameras && data.payload.output) {
                    const statusEl = document.getElementById('cam-status');
                    if (statusEl) statusEl.textContent = data.payload.output;
                }
                break;
            case 'cam_settings':
                if (window.Cameras) {
                    window.Cameras.renderSettings(data.payload);
                }
                break;
            case 'cam_add':
            case 'cam_remove':
                if (window.Cameras) {
                    window.Cameras.loadCameras();
                }
                break;
            case 'cam_motion':
                if (window.Cameras) {
                    window.Cameras.showPip(data.payload.name, true);
                }
                break;
            case 'cam_hide':
                if (window.Cameras) {
                    window.Cameras.hidePip();
                }
                break;
        }
    }

    handleCECEvent(payload) {
        const key = CEC_KEYS[payload.key] || payload.key;
        if (payload.action === 'keydown') {
            this.handleKeyDown(key);
        }
    }

    setupNavigation() {
        document.addEventListener('keydown', (e) => {
            this.handleKeyDown(e.key);
        });

        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchTab(btn.dataset.tab);
            });
        });

        document.querySelectorAll('.app-tile').forEach(tile => {
            tile.addEventListener('click', (e) => {
                // Enter on a focused button already reaches activateFocused
                // through the key handler; the click it also synthesises has
                // detail 0 and would run the action a second time.
                if (e.detail === 0) return;
                tile.focus();
                this.activateFocused();
            });
        });
    }

    setupYouTube() {
        // VacuumTube keeps its own login, so there is no account/guest split.
        const ytApps = [
            { name: 'Open YouTube', icon: '▶', app: 'youtube-tv' },
        ];
        const ytAppRow = document.getElementById('yt-app-row');
        if (ytAppRow) {
            ytApps.forEach(a => {
                const el = this.createItem(a.name, a.icon, '');
                el.dataset.type = 'app';
                el.dataset.app = a.app;
                ytAppRow.appendChild(el);
            });
        }

        const searchBtn = document.getElementById('yt-search-btn');
        const searchInput = document.getElementById('yt-search-input');

        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                const query = searchInput.value.trim();
                if (query && window.YouTube) {
                    YouTube.search(query);
                }
            });
        }
        
        if (searchInput) {
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const query = searchInput.value.trim();
                    if (query && window.YouTube) {
                        YouTube.search(query);
                    }
                }
            });
        }
    }

    setupUpdates() {
        const badge = document.getElementById('update-badge');
        if (badge) {
            badge.addEventListener('click', () => {
                document.getElementById('update-overlay').classList.remove('hidden');
                Updates.check();
            });
        }

        document.getElementById('update-apply')?.addEventListener('click', () => Updates.apply());
        document.getElementById('update-cancel')?.addEventListener('click', () => {
            document.getElementById('update-overlay').classList.add('hidden');
        });
        document.getElementById('close-update')?.addEventListener('click', () => {
            document.getElementById('update-overlay').classList.add('hidden');
        });
    }

    setupProfiles() {
        document.getElementById('pin-submit')?.addEventListener('click', () => {
            const pin = document.getElementById('pin-field').value;
            Profiles.submitPin(pin);
            document.getElementById('pin-input').classList.add('hidden');
        });

        document.getElementById('close-profile')?.addEventListener('click', () => {
            document.getElementById('profile-overlay').classList.add('hidden');
        });
    }

    setupCameras() {
        if (window.Cameras) {
            Cameras.init();
        }
    }

    handleKeyDown(key) {
        // A keyboard's media keys reach the page because nothing under Cage
        // grabs them. Volume applies over an open overlay too, so it is
        // handled before the overlay swallows the rest.
        switch (key) {
            case 'AudioVolumeUp':
                return this.setVolume('up');
            case 'AudioVolumeDown':
                return this.setVolume('down');
            case 'AudioVolumeMute':
                return this.setVolume('mute');
        }

        const overlay = document.querySelector('.overlay:not(.hidden)');
        if (overlay) {
            if (key === 'Escape' || key === 'back') {
                overlay.classList.add('hidden');
            }
            return;
        }

        switch (key) {
            case 'ArrowRight':
                this.moveHorizontal(1);
                break;
            case 'ArrowLeft':
                this.moveHorizontal(-1);
                break;
            case 'ArrowDown':
                this.moveVertical(1);
                break;
            case 'ArrowUp':
                this.moveVertical(-1);
                break;
            case 'Enter':
                this.activateFocused();
                break;
            case '0':
                if (window.Cameras) {
                    window.Cameras.hidePip();
                }
                break;
            case 'Escape':
            case 'back':
                // A visible camera PiP is dismissed first, so Back doesn't
                // also throw you out of whatever tab you were on.
                if (window.Cameras && window.Cameras.pipCamera) {
                    window.Cameras.hidePip();
                } else if (this.currentTab !== 'home') {
                    this.switchTab('home');
                }
                break;
            case 'home':
                this.switchTab('home');
                break;
            case 'play':
            case 'pause':
                this.togglePause();
                break;
            case 'stop':
                this.stopPlayback();
                break;
        }
    }

    // Kodi shows details of whatever the cursor is on, with the artwork behind
    // it. Focus is the cursor here, so the panel follows focus.
    setupInfoPanel() {
        document.addEventListener('focusin', (e) => {
            const el = e.target;
            if (el && el.classList && el.classList.contains('item')) {
                this.updateInfoPanel(el);
            }
        });
    }

    updateInfoPanel(el) {
        const titleEl = document.getElementById('hero-title');
        const metaEl = document.getElementById('info-meta');
        const descEl = document.getElementById('hero-desc');
        const fanart = document.getElementById('fanart');

        const title = el.dataset.title
            || (el.querySelector('.item-title') || {}).textContent
            || '';
        if (titleEl) titleEl.textContent = title;
        if (descEl) descEl.textContent = el.dataset.overview || '';

        if (metaEl) {
            metaEl.textContent = '';
            const parts = [];
            if (el.dataset.year) parts.push(['', el.dataset.year]);
            if (el.dataset.rating) parts.push(['rating', '\u2605 ' + el.dataset.rating]);
            if (el.dataset.runtime) parts.push(['', el.dataset.runtime]);
            parts.forEach(([cls, text]) => {
                const span = document.createElement('span');
                if (cls) span.className = cls;
                span.textContent = text;
                metaEl.appendChild(span);
            });
        }

        if (fanart) {
            if (el.dataset.fanart) {
                fanart.style.backgroundImage = 'url("' + el.dataset.fanart + '")';
                fanart.classList.add('visible');
            } else {
                fanart.classList.remove('visible');
            }
        }
    }

    inSidebar(el) {
        return !!(el && el.classList && el.classList.contains('nav-btn'));
    }

    inGrid(el) {
        return !!(el && el.closest && el.closest('.app-grid'));
    }

    // Measured rather than hard-coded, so a reflowed grid cannot leave Up/Down
    // stepping by a column count that no longer matches what is on screen.
    gridColumns(grid) {
        const tiles = Array.from(grid.querySelectorAll('.app-tile'));
        if (tiles.length === 0) return 1;
        const top = tiles[0].offsetTop;
        let cols = 0;
        for (const tile of tiles) {
            if (tile.offsetTop !== top) break;
            cols++;
        }
        return cols || 1;
    }

    gridTiles(focused) {
        const grid = focused.closest('.app-grid');
        const tiles = Array.from(grid.querySelectorAll('.app-tile'));
        return { grid, tiles, idx: tiles.indexOf(focused) };
    }

    moveGridHorizontal(direction) {
        const { grid, tiles, idx } = this.gridTiles(document.activeElement);
        if (idx < 0) return;
        const cols = this.gridColumns(grid);
        const col = idx % cols;
        // Clamped to the row: stepping off the end onto the next row's first
        // tile reads as the focus teleporting across the screen.
        if (direction > 0 && col === cols - 1) return;
        if (direction < 0 && col === 0) return;
        const next = tiles[idx + direction];
        if (next) next.focus();
    }

    moveGridVertical(direction) {
        const { grid, tiles, idx } = this.gridTiles(document.activeElement);
        if (idx < 0) return;
        const cols = this.gridColumns(grid);
        let target = idx + direction * cols;
        // The last row is usually short. Down from a column past its end should
        // still reach the last tile instead of doing nothing at all.
        if (direction > 0 && target >= tiles.length && idx < tiles.length - 1) {
            target = tiles.length - 1;
        }
        const next = tiles[target];
        if (next) next.focus();
    }

    focusSidebar() {
        const target = document.querySelector('.nav-btn.active')
            || document.querySelector('.nav-btn');
        if (target) target.focus();
    }

    focusContent() {
        const first = this.getFirstFocusable();
        if (first) first.focus();
    }

    // Left/Right crosses between the menu and the content, as in Kodi: Right
    // enters the content, and Left from the start of a row returns to the menu.
    moveHorizontal(direction) {
        const focused = document.activeElement;
        if (this.inGrid(focused)) {
            this.moveGridHorizontal(direction);
            return;
        }
        if (this.inSidebar(focused)) {
            if (direction > 0) this.focusContent();
            return;
        }
        if (direction < 0 && focused && focused.classList.contains('item')) {
            const row = focused.closest('.row-items');
            if (row && Array.from(row.querySelectorAll('.item')).indexOf(focused) === 0) {
                this.focusSidebar();
                return;
            }
        }
        this.moveFocus(direction);
    }

    moveVertical(direction) {
        const focused = document.activeElement;
        if (this.inGrid(focused)) {
            this.moveGridVertical(direction);
            return;
        }
        if (this.inSidebar(focused)) {
            const buttons = Array.from(document.querySelectorAll('.nav-items .nav-btn'));
            const next = buttons[buttons.indexOf(focused) + direction];
            if (next) next.focus();
            return;
        }
        this.moveFocusRow(direction);
    }

    moveFocus(direction) {
        const items = document.querySelectorAll('.item:focus, .nav-btn:focus, .setting-item:focus, .icon-btn:focus');
        if (items.length === 0) {
            const first = this.getFirstFocusable();
            if (first) first.focus();
            return;
        }
        
        const current = items[0];
        const parent = current.parentElement;
        const siblings = Array.from(parent.querySelectorAll('.item, .nav-btn, .setting-item, .icon-btn'));
        const idx = siblings.indexOf(current);
        
        if (idx >= 0) {
            const next = siblings[idx + direction];
            if (next) next.focus();
        }
    }

    moveFocusRow(direction) {
        const focused = document.activeElement;
        if (!focused || !focused.classList.contains('item')) return;
        
        // Scoped to the visible panel; otherwise Down can land focus on a row
        // inside a hidden tab.
        const panel = document.querySelector('.tab-panel.active');
        const rows = panel ? panel.querySelectorAll('.row-items') : [];
        const currentRow = focused.closest('.row-items');
        const currentIdx = Array.from(rows).indexOf(currentRow);
        const nextIdx = currentIdx + direction;
        
        if (nextIdx >= 0 && nextIdx < rows.length) {
            const nextRow = rows[nextIdx];
            const items = nextRow.querySelectorAll('.item');
            if (items.length > 0) {
                const currentIdxInRow = Array.from(currentRow.querySelectorAll('.item')).indexOf(focused);
                const targetIdx = Math.min(currentIdxInRow, items.length - 1);
                items[targetIdx].focus();
            }
        }
    }

    activateFocused() {
        const focused = document.activeElement;
        if (!focused) return;
        
        if (focused.classList.contains('app-tile')) {
            if (focused.dataset.tab) {
                this.switchTab(focused.dataset.tab, true);
            } else if (focused.dataset.action === 'open-settings') {
                document.getElementById('settings-overlay').classList.remove('hidden');
            }
            return;
        }

        if (focused.classList.contains('item')) {
            const url = focused.dataset.url || focused.dataset.src;
            const type = focused.dataset.type || 'video';
            const app = focused.dataset.app || '';
            if (url) {
                if (type === 'youtube') {
                    YouTube.play(url);
                } else if (type === 'live' || type === 'video') {
                    this.playMedia(url, type);
                } else if (type === 'emulation') {
                    const system = focused.dataset.system;
                    if (system && window.Emulation) {
                        Emulation.launch(system);
                    }
                } else if (type === 'camera') {
                    const name = focused.dataset.name;
                    if (name && window.Cameras) {
                        Cameras.pip(name);
                    }
                }
            } else if (app && type === 'app') {
                this.launchApp(app);
            }
        } else if (focused.classList.contains('nav-btn')) {
            this.switchTab(focused.dataset.tab);
        } else if (focused.classList.contains('setting-item')) {
            this.executeSetting(focused.dataset.action);
        } else if (focused.id === 'hero-play') {
            const heroUrl = document.getElementById('hero-bg').dataset.url;
            if (heroUrl) this.playMedia(heroUrl, 'video');
            return;
        } else if (focused.id === 'settings-btn') {
            document.getElementById('settings-overlay').classList.remove('hidden');
        } else if (focused.id === 'close-settings') {
            document.getElementById('settings-overlay').classList.add('hidden');
        }
    }

    getFirstFocusable() {
        const activePanel = document.querySelector('.tab-panel.active');
        if (!activePanel) return null;
        return activePanel.querySelector('.app-tile, .item, .nav-btn, .setting-item, .icon-btn');
    }

    // focusPanel moves focus into the panel itself, which is what a launcher
    // tile wants; the menu bar keeps its own focus when it is the one switching.
    switchTab(tab, focusPanel = false) {
        this.currentTab = tab;
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === tab + '-panel'));
        // On home the tiles are the menu, so the bar is hidden behind them.
        document.body.classList.toggle('home-active', tab === 'home');

        if (tab === 'home' || focusPanel) {
            const first = this.getFirstFocusable();
            if (first) {
                first.focus();
            } else if (focusPanel) {
                // A panel can be empty -- no Jellyfin library configured yet, no
                // IPTV channels. Focus would then stay on the tile that just
                // went off screen, fall to <body>, and the arrows would do
                // nothing at all; the menu bar is somewhere real to land.
                this.focusSidebar();
            }
        }
    }

    playMedia(url, type = 'video') {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                action: 'mpv_play',
                payload: { url: url, type: type }
            }));
        }
    }

    setVolume(direction) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                action: 'volume',
                payload: { direction: direction }
            }));
        }
    }

    togglePause() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({action: 'mpv_pause'}));
        }
    }

    stopPlayback() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({action: 'mpv_stop'}));
        }
    }

    setupSettings() {
        document.querySelectorAll('.setting-item').forEach(item => {
            item.addEventListener('click', () => {
                this.executeSetting(item.dataset.action);
            });
        });
        
        document.getElementById('close-settings').addEventListener('click', () => {
            document.getElementById('settings-overlay').classList.add('hidden');
        });
    }

    executeSetting(action) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        
        switch (action) {
            case 'system-reboot':
                this.ws.send(JSON.stringify({action: 'system_reboot'}));
                break;
            case 'system-shutdown':
                this.ws.send(JSON.stringify({action: 'system_shutdown'}));
                break;
            case 'tv-scale-up':
                Settings.save('scale', Math.min(2.0, (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--scale')) || 1) + 0.1));
                break;
            case 'tv-scale-down':
                Settings.save('scale', Math.max(0.8, (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--scale')) || 1) - 0.1));
                break;
            case 'cec-test':
                this.launchApp('cec-test');
                break;
            case 'gpu-stats':
                this.launchApp('gpu-stats');
                break;
            case 'edid-detect':
                this.launchApp('edid');
                break;
            case 'voice-toggle':
                this.ws.send(JSON.stringify({action: 'voice_status'}));
                break;
            case 'game-mode-toggle':
                this.ws.send(JSON.stringify({action: 'game_mode_status'}));
                break;
            case 'dlna-toggle':
                this.ws.send(JSON.stringify({action: 'rygel_status'}));
                break;
            case 'os-update':
                document.getElementById('settings-overlay').classList.add('hidden');
                document.getElementById('update-overlay').classList.remove('hidden');
                Updates.check();
                break;
            case 'os-rollback':
                Updates.rollback();
                break;
        }
    }

    launchApp(app) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({action: 'launch_app', payload: {app: app}}));
        }
    }

    startClock() {
        const update = () => {
            const now = new Date();
            document.getElementById('clock').textContent = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        };
        update();
        setInterval(update, 30000);
    }

    async loadJellyfin() {
        if (window.Jellyfin) {
            window.Jellyfin.loadLibrary(this.jellyfinUrl, this.jellyfinApiKey);
        }
    }

    async loadIPTV() {
        if (window.IPTV) {
            window.IPTV.loadChannels();
        }
    }

    async loadEmulation() {
        if (window.Emulation) {
            window.Emulation.loadSystems();
        }
    }

    async loadApps() {
        const apps = [
            { name: 'Jellyfin', icon: 'J', url: 'http://localhost:8096', type: 'web' },
            { name: 'YouTube', icon: '▶', app: 'youtube-tv', type: 'app' },
            { name: 'Twitch', icon: 'T', url: 'https://twitch.tv', type: 'web' },
            { name: 'Spotify', icon: 'S', url: 'https://open.spotify.com', type: 'web' },
            { name: 'File Manager', icon: '📁', app: 'filemanager', type: 'app' },
        ];
        
        const container = document.getElementById('apps-row');
        apps.forEach(app => {
            const el = this.createItem(app.name, app.icon || app.name[0], app.url || '');
            el.dataset.url = app.url || '';
            el.dataset.type = app.type;
            el.dataset.app = app.app || '';
            container.appendChild(el);
        });
    }

    createItem(title, img, url) {
        const div = document.createElement('div');
        div.className = 'item';
        div.tabIndex = 0;
        
        if (url && (url.startsWith('http') || url.startsWith('file'))) {
            const image = document.createElement('img');
            image.src = img;
            image.alt = title;
            div.appendChild(image);
        } else {
            div.style.background = 'var(--bg-hover)';
            div.style.display = 'flex';
            div.style.alignItems = 'center';
            div.style.justifyContent = 'center';
            div.style.fontSize = '3em';
            div.textContent = img;
        }
        
        const titleEl = document.createElement('div');
        titleEl.className = 'item-title';
        titleEl.textContent = title;
        div.appendChild(titleEl);
        
        div.addEventListener('click', () => this.activateFocused());
        div.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.activateFocused();
        });
        
        return div;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.tvApp = new TVApp();
});
