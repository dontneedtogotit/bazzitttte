/**
 * OS Updates - Check, apply, and rollback system updates
 */

const Updates = {
    async check() {
        if (!window.tvApp?.ws) return;
        const statusEl = document.getElementById('update-status');
        const actionsEl = document.getElementById('update-actions');
        if (statusEl) statusEl.textContent = 'Checking for updates...';
        if (actionsEl) actionsEl.classList.add('hidden');
        
        window.tvApp.ws.send(JSON.stringify({action: 'os_check_update'}));
    },

    async apply() {
        if (!window.tvApp?.ws) return;
        window.tvApp.ws.send(JSON.stringify({action: 'os_apply_update'}));
        const statusEl = document.getElementById('update-status');
        if (statusEl) statusEl.textContent = 'Downloading and installing update...\nThe system will reboot automatically.';
    },

    async rollback() {
        if (!window.tvApp?.ws) return;
        window.tvApp.ws.send(JSON.stringify({action: 'os_rollback'}));
        const statusEl = document.getElementById('update-status');
        if (statusEl) statusEl.textContent = 'Rolling back to previous version...\nReboot to apply.';
    },

    showStatus(data) {
        const statusEl = document.getElementById('update-status');
        const actionsEl = document.getElementById('update-actions');
        if (!statusEl) return;
        
        statusEl.textContent = data.output || data.error || 'No updates available.';
        
        if (data.available) {
            if (actionsEl) actionsEl.classList.remove('hidden');
        } else {
            if (actionsEl) actionsEl.classList.add('hidden');
        }
    }
};

window.Updates = Updates;
