/**
 * Jellyfin Integration - Load media library via REST API
 */

const Jellyfin = {
    async loadLibrary(baseUrl, apiKey) {
        this.baseUrl = baseUrl.replace(/\/$/, '');
        this.apiKey = apiKey;
        
        try {
            const userId = await this.getUserId();
            if (!userId) {
                document.getElementById('continue-watching').innerHTML = '<div class="loading">Complete Jellyfin setup at http://localhost:8096 to see your library</div>';
                return;
            }
            
            const [recentlyAdded, continueWatching, movies, shows] = await Promise.all([
                this.getItems(userId, 'recent'),
                this.getItems(userId, 'resumable'),
                this.getItems(userId, 'movies'),
                this.getItems(userId, 'tvshows')
            ]);
            
            this.renderRecentlyAdded(recentlyAdded);
            this.renderContinueWatching(continueWatching);
            this.renderMovies(movies);
            this.renderShows(shows);
            
            const heroItem = recentlyAdded[0] || continueWatching[0];
            if (heroItem) {
                this.setHero(heroItem);
            }
        } catch (e) {
            console.error('Jellyfin load error:', e);
            document.getElementById('continue-watching').innerHTML = '<div class="loading">Connect Jellyfin in Settings to see your library</div>';
        }
    },

    async request(path) {
        const res = await fetch(`${this.baseUrl}${path}`, {
            headers: { 'X-MediaBrowser-Token': this.apiKey }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
    },

    async getUserId() {
        const data = await this.request('/Users');
        return data.Items?.[0]?.Id;
    },

    async getItems(userId, query) {
        const params = new URLSearchParams({
            user_id: userId,
            include_item_types: query === 'movies' ? 'Movie' : query === 'tvshows' ? 'Series' : '',
            sort_by: query === 'recent' ? 'DateCreated' : 'DatePlayed',
            sort_order: 'Descending',
            limit: '20',
            recursive: 'true'
        });
        if (query === 'resumable') {
            params.set('sort_by', 'DatePlayed');
            params.set('enable_total_record_count', 'false');
        }
        if (query === 'recent') {
            params.set('sort_by', 'DateCreated');
            params.set('enable_total_record_count', 'false');
        }
        const data = await this.request(`/Users/${userId}/Items?${params}`);
        return data.Items || [];
    },

    getImageUrl(item, width = 300) {
        return `${this.baseUrl}/Items/${item.Id}/Images/Primary?width=${width}&quality=90`;
    },

    renderContinueWatching(items) {
        const container = document.getElementById('continue-watching');
        container.innerHTML = '';
        items.forEach(item => {
            const el = window.tvApp.createItem(
                item.Name,
                this.getImageUrl(item, 300),
                `${this.baseUrl}/Items/${item.Id}`
            );
            el.dataset.type = 'video';
            el.dataset.url = `${this.baseUrl}/Items/${item.Id}/Download?api_key=${this.apiKey}`;
            container.appendChild(el);
        });
    },

    renderRecentlyAdded(items) {
        const container = document.getElementById('recently-added');
        if (!container) return;
        container.innerHTML = '';
        items.forEach(item => {
            const el = window.tvApp.createItem(
                item.Name,
                this.getImageUrl(item, 300),
                `${this.baseUrl}/Items/${item.Id}`
            );
            el.dataset.type = 'video';
            el.dataset.url = `${this.baseUrl}/Items/${item.Id}/Download?api_key=${this.apiKey}`;
            container.appendChild(el);
        });
    },

    renderMovies(items) {
        const container = document.getElementById('movies-row');
        container.innerHTML = '';
        items.forEach(item => {
            const el = window.tvApp.createItem(
                item.Name,
                this.getImageUrl(item, 300),
                `${this.baseUrl}/Items/${item.Id}`
            );
            el.dataset.type = 'video';
            el.dataset.url = `${this.baseUrl}/Items/${item.Id}/Download?api_key=${this.apiKey}`;
            container.appendChild(el);
        });
    },

    renderShows(items) {
        const container = document.getElementById('shows-row');
        container.innerHTML = '';
        items.forEach(item => {
            const el = window.tvApp.createItem(
                item.Name,
                this.getImageUrl(item, 300),
                `${this.baseUrl}/Items/${item.Id}`
            );
            el.dataset.type = 'series';
            el.dataset.url = `${this.baseUrl}/Items/${item.Id}`;
            container.appendChild(el);
        });
    },

    setHero(item) {
        document.getElementById('hero-bg').style.backgroundImage = `url(${this.getImageUrl(item, 1280)})`;
        document.getElementById('hero-bg').dataset.url = `${this.baseUrl}/Items/${item.Id}/Download?api_key=${this.apiKey}`;
        document.getElementById('hero-title').textContent = item.Name;
        document.getElementById('hero-desc').textContent = item.Overview || 'Play now';
    }
};

window.Jellyfin = Jellyfin;
