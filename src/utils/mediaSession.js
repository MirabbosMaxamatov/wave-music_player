import { getHighResCoverUrl } from './validators.js';

export const setupMediaSession = (store) => {
  if (!('mediaSession' in navigator)) return;

  const update = () => {
    const state = store.getState();
    const track = state.currentTrack;

    if (!track) {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = 'none';
      return;
    }

    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title || 'Unknown Title',
      artist: track.artist || 'Unknown Artist',
      album: 'Wave Music',
      artwork: [512, 256, 128, 96].map((size) => ({
        src: getHighResCoverUrl(track.videoId),
        sizes: `${size}x${size}`,
        type: 'image/jpeg',
      })),
    });

    navigator.mediaSession.playbackState = state.isPlaying ? 'playing' : 'paused';

    if ('setPositionState' in navigator.mediaSession) {
      navigator.mediaSession.setPositionState({
        duration: Number(state.duration) || 0,
        playbackRate: 1,
        position: Number(state.currentTime) || 0,
      });
    }
  };

  navigator.mediaSession.setActionHandler('play', () => store.play());
  navigator.mediaSession.setActionHandler('pause', () => store.pause());
  navigator.mediaSession.setActionHandler('nexttrack', () => store.next());
  navigator.mediaSession.setActionHandler('previoustrack', () => store.previous());
  navigator.mediaSession.setActionHandler('seekto', (details) => {
    if (details && typeof details.seekTime === 'number') {
      store.seekTo(details.seekTime);
    }
  });

  store.subscribe(update);
  update();
};
