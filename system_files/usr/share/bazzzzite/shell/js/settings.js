/**
 * Settings Management - Persist and apply TV shell settings
 */

const Settings = {
    async load() {
        if (!window.tvApp?.ws) return;
        window.tvApp.ws.send(JSON.stringify({action: 'get_settings'}));
    },

    async save(key, value) {
        if (!window.tvApp?.ws) return;
        window.tvApp.ws.send(JSON.stringify({
            action: 'set_setting',
            payload: { key, value }
        }));
    },

    apply(settings) {
        if (settings.scale) {
            document.documentElement.style.setProperty('--scale', settings.scale);
        }
        if (settings.voice_enabled) {
            this.updateVoiceStatus(true);
        }
        if (settings.game_mode) {
            this.updateGameModeStatus(true);
        }
        if (settings.rygel_enabled) {
            this.updateRygelStatus(true);
        }
    },

    updateVoiceStatus(running) {
        const el = document.getElementById('voice-status');
        if (el) el.textContent = running ? 'On' : 'Off';
    },

    updateGameModeStatus(enabled) {
        const el = document.getElementById('game-mode-status');
        if (el) el.textContent = enabled ? 'On' : 'Off';
    },

    updateRygelStatus(running) {
        const el = document.getElementById('dlna-status');
        if (el) el.textContent = running ? 'On' : 'Off';
    }
};

window.Settings = Settings;
