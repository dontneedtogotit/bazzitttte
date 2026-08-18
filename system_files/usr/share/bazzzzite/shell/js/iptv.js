/**
 * IPTV - Live TV channels via m3u playlist or yt-dlp streams
 */

const IPTV = {
    channels: [],

    async loadChannels() {
        try {
            const res = await fetch('/iptv/channels.json');
            if (!res.ok) return;
            this.channels = await res.json();
            this.renderChannels();
        } catch (e) {
            console.log('No IPTV channels configured');
        }
    },

    renderChannels() {
        const container = document.getElementById('channels-row');
        if (!container) return;
        container.innerHTML = '';
        
        this.channels.forEach(ch => {
            const el = window.tvApp.createItem(ch.name, ch.logo || ch.name[0], ch.url);
            el.dataset.type = 'live';
            el.dataset.url = ch.url;
            container.appendChild(el);
        });
    }
};

window.IPTV = IPTV;
