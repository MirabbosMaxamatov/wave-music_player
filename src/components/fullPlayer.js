import { formatTime } from '../utils/validators.js';

export const mountFullPlayer = (containerId, store, player) => {
  const el = document.getElementById(containerId);
  if (!el) return;

  const render = () => {
    const state = store.getState();
    const track = state.currentTrack;

    const isLiveStream = state.duration === 0 && (state.isPlaying || state.isBuffering);
    const durationText = state.duration > 0
      ? formatTime(state.duration)
      : (isLiveStream ? '🔴 LIVE' : (track ? '--:--' : '0:00'));
    const progressPercent = state.duration > 0
      ? Math.min(100, Math.max(0, (state.currentTime / state.duration) * 100))
      : (isLiveStream ? 100 : 0);

    el.innerHTML = `
      <div class="full-player ${track ? 'has-track' : ''}">
        <div class="cover-wrapper">
          <img
            class="cover ${state.isPlaying ? 'spinning' : ''}"
            src="${track ? track.cover : ''}"
            alt=""
            onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22><rect fill=%22%23333%22 width=%22100%22 height=%22100%22/></svg>'"
          />
          ${!track ? '<div class="no-cover">♪</div>' : ''}
        </div>

        <div class="track-info">
          <h2 class="title">${track ? track.title : 'Trek tanlanmagan'}</h2>
          <p class="artist">${track ? track.artist : 'Musiqa qo\'shish uchun pastdagi formadan foydalaning'}</p>
        </div>

        <div class="controls">
          <button class="btn-prev" ${!state.playlist.length ? 'disabled' : ''} title="Oldingi trek">⏮</button>
          <button class="btn-play ${state.isPlaying ? 'playing' : ''}" ${!track ? 'disabled' : ''} title="${state.isPlaying ? 'Pauza' : 'Ijro'}">${state.isPlaying ? '⏸' : '▶'}</button>
          <button class="btn-next" ${!state.playlist.length ? 'disabled' : ''} title="Keyingi trek">⏭</button>
        </div>

        <div class="progress-area ${isLiveStream ? 'is-live' : ''}">
          <span class="time-current">${isLiveStream ? 'Jonli efir' : formatTime(state.currentTime)}</span>
          <div class="progress-bar" title="${isLiveStream ? 'Jonli efir' : 'Vaqtni o\'tkazish'}">
            <div class="progress-fill" style="width: ${progressPercent}%"></div>
            <div class="progress-handle" style="left: ${progressPercent}%"></div>
          </div>
          <span class="time-duration">${durationText}</span>
        </div>

        <div class="volume-area">
          <span>🔊</span>
          <div class="volume-bar" title="Ovoz balandligi">
            <div class="volume-fill" style="width: ${state.volume}%"></div>
            <div class="volume-handle" style="left: ${state.volume}%"></div>
          </div>
        </div>

        ${state.error ? `<div class="player-error" role="alert">${state.error}</div>` : ''}
        ${state.error ? '<button class="btn-retry" type="button">Qayta urinish</button>' : ''}
        ${state.isBuffering ? '<div class="buffering">Yuklanmoqda...</div>' : ''}
      </div>
    `;

    bindEvents();
  };

  const bindEvents = () => {
    const state = store.getState();
    const track = state.currentTrack;
    const playBtn = el.querySelector('.btn-play');
    const prevBtn = el.querySelector('.btn-prev');
    const nextBtn = el.querySelector('.btn-next');
    const progressBar = el.querySelector('.progress-bar');
    const volumeBar = el.querySelector('.volume-bar');
    const retryBtn = el.querySelector('.btn-retry');

    playBtn?.addEventListener('click', () => {
      const currentState = store.getState();
      if (!currentState.currentTrack) return;

      if (currentState.error) {
        player.retryLastLoad?.();
        return;
      }

      if (currentState.isPlaying) {
        player.pause();
      } else {
        const vid = currentState.currentTrack.videoId;
        if (player.lastRequestedVideoId === vid) {
          player.play();
        } else {
          player.loadVideo(vid);
        }
      }
    });

    retryBtn?.addEventListener('click', () => {
      const currentState = store.getState();
      if (currentState.currentTrack?.videoId) {
        player.retryLastLoad?.();
      }
    });

    prevBtn?.addEventListener('click', () => store.previous());
    nextBtn?.addEventListener('click', () => store.next());

    progressBar?.addEventListener('click', (event) => {
      const rect = progressBar.getBoundingClientRect();
      const percent = (event.clientX - rect.left) / rect.width;
      const currentState = store.getState();
      const nextTime = percent * (currentState.duration || 0);
      player.seekTo(nextTime);
      store.seekTo(nextTime);
    });

    volumeBar?.addEventListener('click', (event) => {
      const rect = volumeBar.getBoundingClientRect();
      const percent = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
      player.setVolume(percent);
      store.setState('volume', percent);
    });

    el.classList.toggle('is-hidden', !track);
  };

  const unsubscribe = store.subscribe(render);
  render();

  return { unsubscribe };
};
