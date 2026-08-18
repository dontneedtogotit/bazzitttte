/**
 * Profiles Management - Multi-user profiles with PIN
 */

const Profiles = {
    currentProfile: 'default',
    pendingProfile: null,

    async load() {
        if (!window.tvApp?.ws) return;
        window.tvApp.ws.send(JSON.stringify({action: 'get_profiles'}));
    },

    async select(profileId) {
        if (!window.tvApp?.ws) return;
        window.tvApp.ws.send(JSON.stringify({
            action: 'set_profile',
            payload: { profile: profileId }
        }));
    },

    render(profiles) {
        const container = document.getElementById('profile-list');
        if (!container) return;
        container.innerHTML = '';
        
        Object.entries(profiles).forEach(([id, profile]) => {
            const btn = document.createElement('button');
            btn.className = 'setting-item';
            btn.textContent = profile.name;
            btn.dataset.profile = id;
            btn.addEventListener('click', () => this.handleSelect(id, profile));
            container.appendChild(btn);
        });
    },

    handleSelect(id, profile) {
        this.pendingProfile = id;
        const pinInput = document.getElementById('pin-input');
        const pinField = document.getElementById('pin-field');
        
        if (profile.pin) {
            pinInput.classList.remove('hidden');
            pinField.value = '';
            pinField.focus();
        } else {
            this.select(id);
        }
    },

    submitPin(pin) {
        if (this.pendingProfile) {
            this.select(this.pendingProfile);
            this.pendingProfile = null;
        }
    }
};

window.Profiles = Profiles;
