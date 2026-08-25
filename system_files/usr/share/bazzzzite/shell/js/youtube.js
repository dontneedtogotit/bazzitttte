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
            // YouTube blocks hotlinking thumbnails, so fall back to a gradient
            // title card instead of a broken image.
            const img = el.querySelector('img');
            if (img) {
                img.addEventListener('error', () => {
                    img.remove();
                    el.style.background = 'linear-gradient(135deg, #2aa9c6, #36c6e0)';
                    el.style.color = '#fff';
                });
            }
            container.appendChild(el);
        });
    }
};

window.YouTube = YouTube;
