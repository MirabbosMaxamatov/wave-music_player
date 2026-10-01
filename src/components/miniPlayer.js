export const mountMiniPlayer = (containerId, store, player) => {
  const el = document.getElementById(containerId);
  if (!el) return;

  const render = () => {
    const state = store.getState();
    const track = state.currentTrack;

    el.innerHTML = `
      <div class="mini-player ${track ? 'visible' : ''}">
        <img class="mini-cover" src="${track ? track.cover : ''}" alt="" />
        <div class="mini-info">
          <span class="mini-title">${track ? track.title : ''}</span>
          <span class="mini-artist">${track ? track.artist : ''}</span>
        </div>
        <button class="mini-play">${state.isPlaying ? '⏸' : '▶'}</button>
      </div>
    `;

    const playBtn = el.querySelector('.mini-play');
    const miniPlayer = el.querySelector('.mini-player');

    playBtn?.addEventListener('click', (event) => {
      event.stopPropagation();
      if (store.getState().isPlaying) {
        player.pause();
      } else {
        player.play();
      }
    });

    miniPlayer?.addEventListener('click', (event) => {
      if (event.target.closest('.mini-play')) return;
      document.getElementById('full-player')?.scrollIntoView({ behavior: 'smooth' });
    });
  };

  const unsubscribe = store.subscribe(render);
  render();

  return { unsubscribe };
};
