import { extractVideoId, getCoverUrl, generateTrackId } from '../utils/validators.js';

export const STORAGE_KEY = 'wave-music-tracks-v1';

const load = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const save = (tracks) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tracks));
};

export const createLofiTrack = () => {
  const videoId = 'jfKfPfyJRdk';
  return {
    id: `track-lofi-${videoId}`,
    title: 'Lofi Girl',
    artist: 'Lofi Girl',
    videoId,
    cover: getCoverUrl(videoId),
    addedAt: Date.now(),
  };
};

export const buildTrackFromUrl = (url, title = '', artist = '') => {
  const videoId = extractVideoId(url);
  if (!videoId) throw new Error('Invalid YouTube URL');

  return {
    id: generateTrackId(),
    title: title || 'Unknown Title',
    artist: artist || 'Unknown Artist',
    videoId,
    cover: getCoverUrl(videoId),
    addedAt: Date.now(),
  };
};

export const getAllTracks = () => load();

export const addTrack = (url, title = '', artist = '') => {
  const track = buildTrackFromUrl(url, title, artist);
  const tracks = load();

  if (tracks.some((existing) => existing.videoId === track.videoId)) {
    throw new Error('Track already exists');
  }

  tracks.push(track);
  save(tracks);
  return track;
};

export const removeTrack = (id) => {
  const tracks = load().filter((track) => track.id !== id);
  save(tracks);
};

export const clearAllTracks = () => {
  save([]);
};
