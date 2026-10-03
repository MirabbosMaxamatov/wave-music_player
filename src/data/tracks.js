import { extractVideoId, getCoverUrl, generateTrackId } from '../utils/validators.js';

export const STORAGE_KEY = 'wave-music-tracks-v1';

export const DEFAULT_TRACKS = [
  {
    id: 'track-lofi-jfKfPfyJRdk',
    title: 'Lofi Hip Hop Radio - Beats to Relax/Study to',
    artist: 'Lofi Girl',
    videoId: 'jfKfPfyJRdk',
    cover: getCoverUrl('jfKfPfyJRdk'),
    addedAt: 1700000000000,
  },
  {
    id: 'track-lofi-4xDzrJKXOOY',
    title: 'Synthwave Radio - Chill Synth / Lofi',
    artist: 'Lofi Girl',
    videoId: '4xDzrJKXOOY',
    cover: getCoverUrl('4xDzrJKXOOY'),
    addedAt: 1700000001000,
  },
];

const load = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      save(DEFAULT_TRACKS);
      return [...DEFAULT_TRACKS];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      save(DEFAULT_TRACKS);
      return [...DEFAULT_TRACKS];
    }
    return parsed;
  } catch {
    return [...DEFAULT_TRACKS];
  }
};

const save = (tracks) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tracks));
  } catch (err) {
    console.warn('Failed to save tracks to localStorage', err);
  }
};

export const fetchTrackMetadata = async (videoId) => {
  if (!videoId) return null;
  try {
    const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      title: data.title || '',
      artist: data.author_name || '',
    };
  } catch {
    return null;
  }
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
  if (!videoId) throw new Error('Invalid YouTube URL. Please provide a valid YouTube link or ID.');

  return {
    id: generateTrackId(),
    title: title || 'YouTube Track',
    artist: artist || 'YouTube',
    videoId,
    cover: getCoverUrl(videoId),
    addedAt: Date.now(),
  };
};

export const getAllTracks = () => load();

export const addTrack = (url, title = '', artist = '') => {
  const track = buildTrackFromUrl(url, title, artist);
  const tracks = load();

  const existing = tracks.find((t) => t.videoId === track.videoId);
  if (existing) {
    const err = new Error('Bu trek allaqachon ro\'yxatda mavjud');
    err.code = 'TRACK_EXISTS';
    err.existingTrack = existing;
    throw err;
  }

  tracks.push(track);
  save(tracks);
  return track;
};

export const updateTrack = (id, updates) => {
  const tracks = load().map((track) => {
    if (track.id === id) {
      return { ...track, ...updates };
    }
    return track;
  });
  save(tracks);
  return tracks;
};

export const removeTrack = (id) => {
  const tracks = load().filter((track) => track.id !== id);
  save(tracks);
};

export const clearAllTracks = () => {
  save([]);
};

