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
  await ytPlayer.init();

  const tracks = getAllTracks();
  playerStore.setPlaylist(tracks);

  mountFullPlayer('full-player', playerStore, ytPlayer);
  mountMiniPlayer('mini-player', playerStore, ytPlayer);
  mountPlaylist('playlist-panel', playerStore, ytPlayer);
  setupMediaSession(playerStore);

  let requestedVideoId = null;
  let hasUserInteracted = false;

  const unlockPlayback = () => {
    if (hasUserInteracted) return;
    hasUserInteracted = true;
    console.log('[WaveMusic:userGesture]', 'User interaction detected');

    const state = playerStore.getState();
    if (state.currentTrack?.videoId) {
      ytPlayer.loadVideo(state.currentTrack.videoId);
    }
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

    if (state.isPlaying || !state.isBuffering || !hasUserInteracted) {
      if (state.isPlaying) {
        requestedVideoId = videoId;
      }
      return;
    }

    if (videoId !== requestedVideoId) {
      requestedVideoId = videoId;
      console.log('[WaveMusic:subscription]', 'Loading queued track', videoId);
      ytPlayer.loadVideo(videoId);
    }
  });

  if (tracks.length > 0) {
    playerStore.playTrack(0);
    console.log('[WaveMusic:init]', 'Loaded playlist; waiting for user interaction before first play');
  }
};

document.addEventListener('DOMContentLoaded', init);
