const VIDEO_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

export const isValidVideoId = (id) => typeof id === 'string' && VIDEO_ID_REGEX.test(id);

export const extractVideoId = (urlOrId) => {
  if (!urlOrId || typeof urlOrId !== 'string') return null;

  let text = urlOrId.trim();
  if (!text) return null;

  // Strip surrounding quotes or angle brackets
  text = text.replace(/^["'<]+|["'>]+$/g, '').trim();

  if (isValidVideoId(text)) return text;

  try {
    const urlStr = text.startsWith('http://') || text.startsWith('https://') ? text : `https://${text}`;
    const url = new URL(urlStr);

    // youtu.be/<id>
    if (url.hostname.includes('youtu.be')) {
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts.length > 0 && isValidVideoId(parts[0])) {
        return parts[0];
      }
    }

    // youtube.com, music.youtube.com, m.youtube.com
    if (url.hostname.includes('youtube.com')) {
      const v = url.searchParams.get('v');
      if (v && isValidVideoId(v)) {
        return v;
      }

      // /embed/<id>, /shorts/<id>, /live/<id>, /v/<id>, /e/<id>
      const parts = url.pathname.split('/').filter(Boolean);
      for (let i = 0; i < parts.length; i++) {
        if (['embed', 'shorts', 'live', 'v', 'e'].includes(parts[i]) && parts[i + 1]) {
          if (isValidVideoId(parts[i + 1])) {
            return parts[i + 1];
          }
        }
      }
    }
  } catch {
    // If not a standard URL, fall through to regex
  }

  const patterns = [
    /(?:v=|\/embed\/|\/shorts\/|\/live\/|\/v\/|\/e\/|youtu\.be\/)([\w-]{11})/,
    /[?&]v=([\w-]{11})/,
    /([\w-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && isValidVideoId(match[1])) return match[1];
  }

  return null;
};

export const getCoverUrl = (id) => `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
export const getHighResCoverUrl = (id) => `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;

export const formatTime = (seconds) => {
  if (seconds === null || seconds === undefined || Number.isNaN(Number(seconds))) return '0:00';
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

