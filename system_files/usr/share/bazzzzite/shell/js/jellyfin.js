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

    backdropUrl(item) {
        // Fanart for the Kodi-style backdrop; falls back to the poster when a
        // title has no backdrop image.
        if (item.BackdropImageTags && item.BackdropImageTags.length) {
            return `${this.baseUrl}/Items/${item.Id}/Images/Backdrop/0?quality=80`;
        }
        return this.getImageUrl(item, 1280);
    },

    runtimeMinutes(item) {
        // Jellyfin reports runtime in 100ns ticks.
        if (!item.RunTimeTicks) return '';
        return Math.round(item.RunTimeTicks / 600000000) + ' min';
    },

    // The four rows differ only in container and item type, so they share one
    // builder. Metadata rides along on the element for the info panel to read
    // when the item gets focus.
    renderRow(containerId, items, type = 'video') {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';
        items.forEach(item => {
            const el = window.tvApp.createItem(
                item.Name,
                this.getImageUrl(item, 300),
                `${this.baseUrl}/Items/${item.Id}`
            );
            el.dataset.type = type;
            el.dataset.url = type === 'series'
                ? `${this.baseUrl}/Items/${item.Id}`
                : `${this.baseUrl}/Items/${item.Id}/Download?api_key=${this.apiKey}`;
            el.dataset.title = item.Name || '';
            el.dataset.year = item.ProductionYear || '';
            el.dataset.rating = item.CommunityRating
                ? Number(item.CommunityRating).toFixed(1) : '';
            el.dataset.runtime = this.runtimeMinutes(item);
            el.dataset.overview = item.Overview || '';
            el.dataset.fanart = this.backdropUrl(item);
            container.appendChild(el);
        });
    },

    // Home and Media both surface these rows, in their own containers.
    renderContinueWatching(items) {
        this.renderRow('continue-watching', items);
        this.renderRow('home-continue', items);
    },
    renderRecentlyAdded(items) {
        this.renderRow('recently-added', items);
        this.renderRow('home-recent', items);
    },
    renderMovies(items) { this.renderRow('movies-row', items); },
    renderShows(items) { this.renderRow('shows-row', items, 'series'); },

    setHero(item) {
        // Seed the fanart backdrop before anything has been focused.
        const fanart = document.getElementById('fanart');
        if (fanart) {
            fanart.style.backgroundImage = `url("${this.backdropUrl(item)}")`;
            fanart.classList.add('visible');
        }
        const meta = document.getElementById('info-meta');
        if (meta) {
            meta.textContent = '';
            [item.ProductionYear, this.runtimeMinutes(item)].filter(Boolean).forEach(t => {
                const span = document.createElement('span');
                span.textContent = t;
                meta.appendChild(span);
            });
        }
        document.getElementById('hero-bg').style.backgroundImage = `url(${this.getImageUrl(item, 1280)})`;
        document.getElementById('hero-bg').dataset.url = `${this.baseUrl}/Items/${item.Id}/Download?api_key=${this.apiKey}`;
        document.getElementById('hero-title').textContent = item.Name;
        document.getElementById('hero-desc').textContent = item.Overview || 'Play now';
    }
};

window.Jellyfin = Jellyfin;
