/**
 * YouTube Integration - Search and playback via yt-dlp + MPV
 */

const YouTube = {
    async search(query) {
        if (!query || !window.tvApp?.ws) return;
        
        const resultsEl = document.getElementById('yt-results');
        if (resultsEl) resultsEl.innerHTML = '<div class="loading">Searching...</div>';
        
        window.tvApp.ws.send(JSON.stringify({
            action: 'yt_search',
            payload: { query }
        }));
    },

    play(url) {
        if (!window.tvApp?.ws) return;
        window.tvApp.ws.send(JSON.stringify({
            action: 'yt_play',
            payload: { url }
        }));
    },

    renderResults(videos) {
        const container = document.getElementById('yt-results');
        if (!container) return;
        container.innerHTML = '';
        
        videos.forEach(v => {
            const el = window.tvApp.createItem(v.title, v.thumbnail || v.title[0], v.url);
            el.dataset.type = 'youtube';
            el.dataset.url = v.url;
            container.appendChild(el);
        });
    }
};

window.YouTube = YouTube;
