/**
 * Emulation - Launch emulators with ROMs
 */

const Emulation = {
    systems: [
        { id: 'nes', name: 'NES', ext: '.nes', core: 'fceumm' },
        { id: 'snes', name: 'SNES', ext: '.sfc', core: 'snes9x' },
        { id: 'n64', name: 'N64', ext: '.n64,.z64', core: 'mupen64plus' },
        { id: 'gba', name: 'GBA', ext: '.gba', core: 'mgba' },
        { id: 'psx', name: 'PlayStation', ext: '.bin', core: 'pcsx_rearmed' },
        { id: 'ps2', name: 'PS2', ext: '.iso', core: 'pcsx2', flatpak: true },
        { id: 'gc', name: 'GameCube', ext: '.iso', core: 'dolphin', flatpak: true },
    ],

    async loadSystems() {
        const container = document.getElementById('systems-row');
        if (!container) return;
        container.innerHTML = '';
        
        this.systems.forEach(sys => {
            const el = window.tvApp.createItem(sys.name, sys.name[0], '');
            el.dataset.system = sys.id;
            el.dataset.core = sys.core;
            el.dataset.flatpak = sys.flatpak || 'false';
            el.dataset.ext = sys.ext;
            container.appendChild(el);
        });
    },

    launch(system) {
        const sys = this.systems.find(s => s.id === system);
        if (!sys) return;
        
        if (window.tvApp && window.tvApp.ws) {
            window.tvApp.ws.send(JSON.stringify({
                action: 'launch_app',
                payload: { app: 'retroarch', system: sys.id, core: sys.core }
            }));
        }
    }
};

window.Emulation = Emulation;
