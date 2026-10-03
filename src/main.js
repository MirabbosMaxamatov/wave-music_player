import { playerStore } from './stores/playerStore.js';
import { HybridPlayer } from './controllers/hybridPlayer.js';
import { getAllTracks } from './data/tracks.js';
import { setupMediaSession } from './utils/mediaSession.js';
import { mountFullPlayer } from './components/fullPlayer.js';
import { mountMiniPlayer } from './components/miniPlayer.js';
import { mountPlaylist } from './components/playlist.js';

const init = async () => {
  console.log('[WaveMusic:init]', 'Starting app bootstrap');

  const ytPlayer = new HybridPlayer('yt-player');

  const tracks = getAllTracks();
  playerStore.setPlaylist(tracks);

  mountFullPlayer('full-player', playerStore, ytPlayer);
  mountMiniPlayer('mini-player', playerStore, ytPlayer);
  mountPlaylist('playlist-panel', playerStore, ytPlayer);
  setupMediaSession(playerStore);

  ytPlayer.init().catch((err) => {
    console.warn('[WaveMusic:init] Player init warning:', err);
  });

  let requestedVideoId = null;
  let hasUserInteracted = false;

  const unlockPlayback = () => {
    hasUserInteracted = true;
  };

  document.addEventListener('pointerdown', unlockPlayback, { passive: true });
  document.addEventListener('touchstart', unlockPlayback, { passive: true });
  document.addEventListener('keydown', unlockPlayback, { passive: true });

  playerStore.subscribe(() => {
    const state = playerStore.getState();
    const videoId = state.currentTrack?.videoId;

    if (!videoId) {
      requestedVideoId = null;
      return;
    }

    // Auto-advance or queued track selection
    if (state.isBuffering && videoId !== requestedVideoId && hasUserInteracted) {
      requestedVideoId = videoId;
      console.log('[WaveMusic:subscription]', 'Loading queued track', videoId);
      ytPlayer.loadVideo(videoId);
    }
  });
};

document.addEventListener('DOMContentLoaded', init);
