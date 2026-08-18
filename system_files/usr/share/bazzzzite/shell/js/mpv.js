/**
 * MPV Controller - Video playback via WebSocket bridge
 */

const MPV = {
    async play(url, type = 'video') {
        if (window.tvApp && window.tvApp.ws) {
            window.tvApp.ws.send(JSON.stringify({
                action: 'mpv_play',
                payload: { url, type }
            }));
        }
    },

    stop() {
        if (window.tvApp && window.tvApp.ws) {
            window.tvApp.ws.send(JSON.stringify({action: 'mpv_stop'}));
        }
    },

    pause() {
        if (window.tvApp && window.tvApp.ws) {
            window.tvApp.ws.send(JSON.stringify({action: 'mpv_pause'}));
        }
    },

    seek(seconds) {
        if (window.tvApp && window.tvApp.ws) {
            window.tvApp.ws.send(JSON.stringify({
                action: 'mpv_seek',
                payload: { seconds }
            }));
        }
    }
};

window.MPV = MPV;
