import { extractVideoId, getCoverUrl, generateTrackId } from '../utils/validators.js';

export const STORAGE_KEY = 'wave-music-tracks-v1';

/**
 * ============================================================
 * 🎵 WAVE MUSIC — ASOSIY TREKLAR RO'YXATI (TRACKS LIST)
 * ============================================================
 * Yangi trek qo'shish uchun quyidagi CUSTOM_TRACKS ro'yxatiga yangi qator qo'shing:
 *
 *   {
 *     title: 'Qo\'shiq nomi',
 *     artist: 'Ijrochi',
 *     url: 'https://www.youtube.com/watch?v=VIDEO_ID', // yoki shunchaki 'VIDEO_ID'
 *   },
 *
 * 💡 ERROR 150 / 101 (Bloklangan video) HAQIDA:
 * Ba'zi rasmiy VEVO musiqiy kliplari (masalan, Empire Of The Sun)
 * mualliflik huquqi sababli YouTube tomonidan tashqi saytlarda bloklanadi.
 * Buni chetlab o'tish uchun o'sha qo'shiqning:
 *   1) "Lyrics" (qo'shiq matnli) versiyasi havolasi
 *   2) "Official Audio" yoki "Topic" versiyasi havolasi
 * qo'yilsa, 100% muammosiz va to'liq studio sifatidagi ovoz bilan ijro etiladi!
 * ============================================================
 */
export const CUSTOM_TRACKS = [
  {
    title: 'We Are The People',
    artist: 'Empire Of The Sun',
    url: 'https://www.youtube.com/watch?v=J7MFQAB6R-Q', // Lyrics/Audio versiyasi (100% ishlaydi)
  },
  {
    title: 'Lofi Hip Hop Radio - Beats to Relax/Study to',
    artist: 'Lofi Girl',
    url: 'https://youtu.be/jfKfPfyJRdk',
  },
  {
    title: 'Synthwave Radio - Chill Synth / Lofi',
    artist: 'Lofi Girl',
    url: 'https://youtu.be/4xDzrJKXOOY',
  },
  // Yangi treklaringizni shu yerga qo'shishingiz mumkin:
  // {
  //   title: 'Trek nomi',
  //   artist: 'Ijrochi',
  //   url: 'https://youtu.be/...',
  // },
];

export const DEFAULT_TRACKS = CUSTOM_TRACKS.map((item, index) => {
  const videoId = extractVideoId(item.url || item.videoId);
  if (!videoId) return null;
  return {
    id: item.id || `track-custom-${videoId}`,
    title: item.title || 'YouTube Track',
    artist: item.artist || 'YouTube',
    videoId,
    cover: item.cover || getCoverUrl(videoId),
    addedAt: 1700000000000 + index * 1000,
  };
}).filter(Boolean);

const load = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];

    const customList = CUSTOM_TRACKS.map((item, index) => {
      const videoId = extractVideoId(item.url || item.videoId);
      if (!videoId) return null;
      return {
        id: item.id || `track-custom-${videoId}`,
        title: item.title || 'YouTube Track',
        artist: item.artist || 'YouTube',
        videoId,
        cover: item.cover || getCoverUrl(videoId),
        addedAt: 1700000000000 + index * 1000,
      };
    }).filter(Boolean);

    const seen = new Set(customList.map((t) => t.videoId));
    const merged = [...customList];

    if (Array.isArray(parsed)) {
      for (const t of parsed) {
        if (t && t.videoId && !seen.has(t.videoId)) {
          seen.add(t.videoId);
          merged.push(t);
        }
      }
    }

    return merged;
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

