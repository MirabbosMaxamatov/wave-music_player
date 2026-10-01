const VIDEO_ID_REGEX = /^[\w-]{11}$/;

export const isValidVideoId = (id) => VIDEO_ID_REGEX.test(id);

export const extractVideoId = (urlOrId) => {
  if (!urlOrId || typeof urlOrId !== 'string') return null;

  const text = urlOrId.trim();
  if (!text) return null;
  if (isValidVideoId(text)) return text;

  const patterns = [
    /[?&]v=([\w-]{11})(?:[&]|$)/,
    /youtu\.be\/([\w-]{11})(?:[?]|$)/,
    /embed\/([\w-]{11})(?:[?]|$)/,
    /shorts\/([\w-]{11})(?:[?]|$)/,
    /youtube\.com\/watch\?.*v=([\w-]{11})(?:[&]|$)/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && isValidVideoId(match[1])) return match[1];
  }

  const fallback = text.match(/([\w-]{11})/);
  return fallback && isValidVideoId(fallback[1]) ? fallback[1] : null;
};

export const getCoverUrl = (id) => `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
export const getHighResCoverUrl = (id) => `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;

export const formatTime = (seconds) => {
  if (!seconds || Number.isNaN(Number(seconds))) return '0:00';
  const total = Math.max(0, Math.floor(Number(seconds)));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  return `${minutes}:${String(secs).padStart(2, '0')}`;
};

export const generateTrackId = () => `track-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
