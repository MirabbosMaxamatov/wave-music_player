import { formatTime } from '../utils/validators.js';

export const mountFullPlayer = (containerId, store, player) => {
  const el = document.getElementById(containerId);
  if (!el) return;

  const render = () => {
    const state = store.getState();
    const track = state.currentTrack;

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
          <h2 class="title">${track ? track.title : 'No Track'}</h2>
          <p class="artist">${track ? track.artist : 'Add a track to start'}</p>
        </div>

        <div class="controls">
          <button class="btn-prev" ${!state.playlist.length ? 'disabled' : ''}>⏮</button>
          <button class="btn-play ${state.isPlaying ? 'playing' : ''}" ${!track ? 'disabled' : ''}>${state.isPlaying ? '⏸' : '▶'}</button>
          <button class="btn-next" ${!state.playlist.length ? 'disabled' : ''}>⏭</button>
        </div>

        <div class="progress-area">
          <span class="time-current">${formatTime(state.currentTime)}</span>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${state.duration ? (state.currentTime / state.duration) * 100 : 0}%"></div>
            <div class="progress-handle" style="left: ${state.duration ? (state.currentTime / state.duration) * 100 : 0}%"></div>
          </div>
          <span class="time-duration">${formatTime(state.duration)}</span>
        </div>

        <div class="volume-area">
          <span>🔊</span>
          <div class="volume-bar">
            <div class="volume-fill" style="width: ${state.volume}%"></div>
            <div class="volume-handle" style="left: ${state.volume}%"></div>
          </div>
        </div>

        ${state.error ? `<div class="player-error" role="alert">${state.error}</div>` : ''}
        ${state.error ? '<button class="btn-retry" type="button">Retry</button>' : ''}
        ${state.isBuffering ? '<div class="buffering">Loading...</div>' : ''}
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
        if (currentState.currentTrack?.videoId) {
          player.loadVideo(currentState.currentTrack.videoId);
        }
        player.play();
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
