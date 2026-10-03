import { playerStore } from '../stores/playerStore.js';

const EMBED_BLOCKED_CODES = new Set([100, 101, 150]);

export const KNOWN_EMBED_FALLBACKS = {
  // Empire Of The Sun - We Are The People (VEVO rasmiy klipi bloklangan -> Lyrics/Audio versiyasi)
  'hN5X4kGhAtU': 'J7MFQAB6R-Q',
};

export class YouTubePlayer {
  constructor(containerId) {
    this.containerId = containerId;
    this.container = document.getElementById(containerId);
    this.player = null;
    this.ready = false;
    this.pendingVideoId = null;
    this.timeInterval = null;
    this.lastRequestedVideoId = null;
    this.retryCount = 0;
    this.maxRetries = 2;
  }

  log(action, ...args) {
    console.log(`[YouTubePlayer:${action}]`, ...args);
  }

  init() {
    return new Promise((resolve, reject) => {
      if (!this.container) {
        this.log('initFailed', `Container #${this.containerId} not found`);
        reject(new Error(`Container #${this.containerId} not found`));
        return;
      }

      if (this.ready && this.player) {
        resolve();
        return;
      }

      const timeoutId = setTimeout(() => {
        this.log('initTimeout', 'YT Player ready timeout reached');
        resolve();
      }, 7000);

      const createPlayer = () => {
        if (!window.YT || !window.YT.Player) {
          this.log('initWaitingForYTAPI', 'YT Player is not ready yet');
          return;
        }

        if (this.player) return;

        this.log('createPlayer', 'Creating hidden YT iframe player');
        this.player = new YT.Player(this.container, {
          width: '200',
          height: '200',
          playerVars: {
            autoplay: 0,
            controls: 1,
            playsinline: 1,
            rel: 0,
            enablejsapi: 1,
          },
          events: {
            onReady: () => {
              clearTimeout(timeoutId);
              this.ready = true;
              this.log('onReady', 'Player is ready');
              try {
                this.player.setVolume(playerStore.getState().volume);
              } catch {}
              playerStore.clearError();

              if (this.pendingVideoId) {
                const vid = this.pendingVideoId;
                this.pendingVideoId = null;
                this.loadVideo(vid);
              }
              resolve();
            },
            onStateChange: (event) => this.handleStateChange(event.data),
            onError: (event) => this.handleError(event),
          },
        });
      };

      if (window.YT && window.YT.Player) {
        createPlayer();
        return;
      }

      const checkInterval = setInterval(() => {
        if (window.YT && window.YT.Player) {
          clearInterval(checkInterval);
          createPlayer();
        }
      }, 200);

      const previousHandler = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        clearInterval(checkInterval);
        this.log('iframeAPIReady', 'YouTube iframe API loaded');
        if (typeof previousHandler === 'function') previousHandler();
        createPlayer();
      };

      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        this.log('injectScript', 'Injecting YouTube iframe API script');
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
      }
    });
  }

  handleStateChange(state) {
    this.log('handleStateChange', state);

    try {
      const dur = Number(this.player?.getDuration?.()) || 0;
      if (dur > 0) {
        playerStore.setDuration(dur);
      }
    } catch {}

    if (state === YT.PlayerState.PLAYING) {
      playerStore.clearError();
      playerStore.play();
      playerStore.setBuffering(false);
      playerStore.setLoading(false);
      this.startTimeUpdate();
      return;
    }

    if (state === YT.PlayerState.PAUSED) {
      playerStore.pause();
      playerStore.setBuffering(false);
      playerStore.setLoading(false);
      this.stopTimeUpdate();
      return;
    }

    if (state === YT.PlayerState.ENDED) {
      this.log('videoEnded', 'Moving to next track');
      playerStore.next();
      return;
    }

    if (state === YT.PlayerState.BUFFERING) {
      playerStore.setBuffering(true);
      playerStore.setLoading(true);
      return;
    }

    if (state === YT.PlayerState.CUED || state === YT.PlayerState.UNSTARTED) {
      playerStore.setBuffering(false);
      playerStore.setLoading(false);
    }
  }

  handleError(event) {
    const code = event?.data ?? -1;
    this.log('handleError', { code, event });
    this.stopTimeUpdate();
    playerStore.setBuffering(false);
    playerStore.setLoading(false);

    if (EMBED_BLOCKED_CODES.has(code)) {
      const fallbackId = KNOWN_EMBED_FALLBACKS[this.lastRequestedVideoId];
      if (fallbackId && fallbackId !== this.lastRequestedVideoId) {
        this.log('autoFallback', { from: this.lastRequestedVideoId, to: fallbackId });
        playerStore.setError('Ushbu rasmiy klip bloklangan, avtomatik ravishda uning Audio/Lyrics versiyasiga o\'tilmoqda...');
        setTimeout(() => {
          this.loadVideo(fallbackId, true);
        }, 500);
        return;
      }

      this.retryCount = 0;
      const blockedMessage = 'Ushbu video muallifi (VEVO/leybl) tomonidan tashqi saytlarda ijro etish cheklangan (Error 150). Buni chetlab o\'tish uchun uning "Lyrics" yoki "Audio" versiyasi havolasini ishlating.';
      playerStore.setError(blockedMessage);
      return;
    }

    if (this.retryCount < this.maxRetries) {
      this.retryCount += 1;
      playerStore.setError(`Videoni yuklashda xatolik (${code}). Qayta urinilmoqda...`);
      setTimeout(() => {
        if (this.lastRequestedVideoId) {
          this.loadVideo(this.lastRequestedVideoId, true);
        }
      }, 700);
      return;
    }

    this.retryCount = 0;
    playerStore.setError(`Ushbu videoni hozircha ijro etib bo'lmadi (xato ${code}). Boshqa trekni tanlang.`);
  }

  syncPlaybackStats() {
    if (!this.player || !this.ready) return;

    const time = Number(this.player.getCurrentTime()) || 0;
    const duration = Number(this.player.getDuration()) || 0;

    playerStore.seekTo(time);
    if (duration > 0) {
      playerStore.setDuration(duration);
    }

    if (duration > 0 && time >= duration) {
      playerStore.next();
    }
  }

  startTimeUpdate() {
    this.stopTimeUpdate();
    this.syncPlaybackStats();
    this.timeInterval = setInterval(() => {
      if (!this.player || !this.ready) return;
      this.syncPlaybackStats();
    }, 500);
  }

  stopTimeUpdate() {
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
      this.timeInterval = null;
    }
  }

  loadVideo(videoId, isRetry = false) {
    const cleanId = String(videoId || '').trim();
    if (!cleanId || cleanId.length !== 11) {
      this.log('loadVideoInvalidId', cleanId);
      playerStore.setError('Invalid video ID. Please use a valid YouTube URL.');
      return;
    }

    this.lastRequestedVideoId = cleanId;
    if (!isRetry) this.retryCount = 0;

    if (!this.ready || !this.player) {
      this.log('loadVideoWaitingForReady', cleanId);
      this.pendingVideoId = cleanId;
      playerStore.setLoading(true);
      playerStore.setBuffering(true);
      return;
    }

    this.log('loadVideo', { videoId: cleanId, isRetry });
    playerStore.clearError();
    playerStore.setLoading(true);
    playerStore.setBuffering(true);
    try {
      this.player.loadVideoById(cleanId);
    } catch (e) {
      this.log('loadVideoError', e);
      try {
        this.player.cueVideoById(cleanId);
        this.player.playVideo();
      } catch {}
    }
  }

  retryLastLoad() {
    if (!this.lastRequestedVideoId) {
      this.log('retryLastLoadSkipped', 'No recent video to retry');
      return;
    }

    this.log('retryLastLoad', this.lastRequestedVideoId);
    this.loadVideo(this.lastRequestedVideoId, true);
  }

  play() {
    if (!this.ready || !this.player) {
      this.log('playSkipped', 'Player is not ready yet');
      return;
    }

    this.log('playVideo', 'Calling playVideo()');
    this.player.playVideo();
  }

  pause() {
    if (!this.ready || !this.player) return;
    this.log('pauseVideo', 'Calling pauseVideo()');
    this.player.pauseVideo();
  }

  seekTo(seconds) {
    if (!this.ready || !this.player) return;
    this.log('seekTo', seconds);
    this.player.seekTo(seconds, true);
  }

  setVolume(percent) {
    if (!this.ready || !this.player) return;
    const value = Math.max(0, Math.min(100, Number(percent) || 0));
    this.log('setVolume', value);
    this.player.setVolume(value);
    playerStore.setState('volume', value);
  }

  isReady() {
    return this.ready;
  }
}
