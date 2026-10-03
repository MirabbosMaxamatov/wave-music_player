import { playerStore } from '../stores/playerStore.js';
import { YouTubePlayer } from './youtubePlayer.js';
import { extractVideoId } from '../utils/validators.js';

const DEFAULT_JAMENDO_CLIENT_ID = 'YOUR_JAMENDO_CLIENT_ID';

export class HybridPlayer {
  constructor(containerId) {
    this.containerId = containerId;
    this.jamendoClientId = DEFAULT_JAMENDO_CLIENT_ID;
    this.youtube = new YouTubePlayer(containerId);
    this.audio = new Audio();
    this.audio.preload = 'auto';
    this.audio.crossOrigin = 'anonymous';
    this.currentSource = null;
    this.lastRequestedVideoId = null;
    this.lastRequestedUrl = null;
    this.retryCount = 0;
    this.maxRetries = 2;
    this.lastTrack = null;
    this.lastSourceCandidates = [];
    this.boundAudioHandlers = false;
    this.ready = false;
  }

  setupAudioEvents() {
    if (this.boundAudioHandlers) return;
    this.boundAudioHandlers = true;

    this.audio.addEventListener('loadeddata', () => {
      playerStore.clearError();
      playerStore.play();
      playerStore.setLoading(false);
      playerStore.setBuffering(false);
      this.currentSource = 'direct';
    });

    this.audio.addEventListener('play', () => {
      playerStore.clearError();
      playerStore.play();
      playerStore.setLoading(false);
      playerStore.setBuffering(false);
    });

    this.audio.addEventListener('pause', () => {
      playerStore.pause();
    });

    this.audio.addEventListener('ended', () => {
      playerStore.next();
    });

    this.audio.addEventListener('timeupdate', () => {
      const time = Number(this.audio.currentTime) || 0;
      const duration = Number(this.audio.duration) || 0;
      playerStore.seekTo(time);
      playerStore.setDuration(duration);
    });

    this.audio.addEventListener('error', () => {
      const message = 'Direct audio source failed. Try another track or use a different source.';
      playerStore.setError(message);
      playerStore.setLoading(false);
      playerStore.setBuffering(false);
      this.retryDirectFallback();
    });
  }

  async init() {
    this.setupAudioEvents();
    await this.youtube.init();
    this.ready = true;
    this.audio.volume = playerStore.getState().volume / 100;
    return true;
  }

  async loadVideo(source, metadata = {}) {
    const videoId = extractVideoId(String(source || ''));
    const normalized = videoId || String(source || '').trim();
    this.lastRequestedVideoId = videoId || null;
    this.lastRequestedUrl = source || null;
    this.lastTrack = metadata;

    if (!normalized) {
      playerStore.setError('Please choose a valid YouTube URL or a playable track source.');
      return false;
    }

    playerStore.clearError();
    playerStore.setLoading(true);
    playerStore.setBuffering(true);

    if (videoId) {
      this.currentSource = 'youtube';
      this.audio.pause();
      this.youtube.loadVideo(videoId);
      return true;
    }

    const directCandidates = await this.findDirectMp3Candidates(normalized, metadata);
    this.lastSourceCandidates = directCandidates;

    for (const candidate of directCandidates) {
      const isPlayable = await this.validateDirectSource(candidate.url);
      if (isPlayable) {
        this.currentSource = 'direct';
        this.playDirectSource(candidate.url, metadata);
        return true;
      }
    }

    playerStore.setError('Not available from YouTube, Jamendo, or Internet Archive. Try another track or look for a public-domain alternative.');
    playerStore.setLoading(false);
    playerStore.setBuffering(false);
    return false;
  }

  async retryLastLoad() {
    if (!this.lastRequestedUrl) return false;

    if (this.retryCount >= this.maxRetries) {
      playerStore.setError('No playable source is available for this track. Try a different search or use a public-domain alternative.');
      return false;
    }

    this.retryCount += 1;
    return this.loadVideo(this.lastRequestedUrl, this.lastTrack);
  }

  async checkYouTubeOEmbed(videoId) {
    if (!videoId) return false;

    try {
      const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`, {
        method: 'GET',
        mode: 'cors',
      });

      if (!response.ok) return false;
      const payload = await response.json();
      return Boolean(payload && payload.html);
    } catch {
      return false;
    }
  }

  async findDirectMp3Candidates(trackIdOrQuery, metadata = {}) {
    const queryString = [
      metadata.title,
      metadata.artist,
      typeof trackIdOrQuery === 'string' && trackIdOrQuery.length >= 11 ? null : trackIdOrQuery,
    ]
      .filter(Boolean)
      .join(' ')
      .trim();

    const candidates = [];

    const jamendo = await this.searchJamendo(queryString || 'lofi');
    candidates.push(...jamendo);

    const archive = await this.searchInternetArchive(queryString || 'public domain music');
    candidates.push(...archive);

    return candidates.slice(0, 8);
  }

  async searchJamendo(query) {
    const clientId = this.jamendoClientId || DEFAULT_JAMENDO_CLIENT_ID;
    if (!clientId || clientId.includes('YOUR_')) {
      return [];
    }

    try {
      const url = `https://api.jamendo.com/v3.0/tracks/?client_id=${encodeURIComponent(clientId)}&format=json&limit=5&search=${encodeURIComponent(query)}`;
      const response = await fetch(url, { method: 'GET', mode: 'cors' });
      if (!response.ok) return [];

      const payload = await response.json();
      const tracks = Array.isArray(payload?.results) ? payload.results : [];

      return tracks
        .map((track) => {
          const mp3Url = track?.audio || track?.mp3 || track?.audio_low || track?.audio_high;
          if (!mp3Url) return null;
          return { url: mp3Url, label: track?.name || 'Jamendo track', source: 'jamendo' };
        })
        .filter(Boolean);
    } catch {
      return [];
    }
  }

  async searchInternetArchive(query) {
    try {
      const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}&fl[]=identifier,title&rows=5&output=json`;
      const response = await fetch(url, { method: 'GET', mode: 'cors' });
      if (!response.ok) return [];

      const payload = await response.json();
      const docs = Array.isArray(payload?.response?.docs) ? payload.response.docs : [];

      return docs.flatMap((doc) => {
        const identifier = doc?.identifier;
        if (!identifier) return [];

        const baseUrls = [
          `https://archive.org/download/${identifier}/${identifier}.mp3`,
          `https://archive.org/download/${identifier}/${identifier}.ogg`,
          `https://archive.org/download/${identifier}/${identifier}_64kb.mp3`,
        ];

        return baseUrls.map((url) => ({
          url,
          label: doc?.title || identifier,
          source: 'archive',
        }));
      });
    } catch {
      return [];
    }
  }

  async validateDirectSource(url) {
    if (!url || typeof url !== 'string') return false;

    try {
      const response = await fetch(url, { method: 'HEAD', mode: 'cors' });
      const contentType = response.headers.get('content-type') || '';
      if (response.ok && /audio|mpeg|mp3|ogg|wav|flac|x-m4a/i.test(contentType)) return true;

      const probe = await fetch(url, { method: 'GET', mode: 'cors' });
      const probeType = probe.headers.get('content-type') || '';
      return probe.ok && /audio|mpeg|mp3|ogg|wav|flac|x-m4a/i.test(probeType);
    } catch {
      return false;
    }
  }

  playDirectSource(url, metadata = {}) {
    this.audio.src = url;
    this.audio.volume = playerStore.getState().volume / 100;
    this.audio.currentTime = 0;
    this.audio.play().catch(() => {
      playerStore.setError('The direct stream is blocked by the browser. Try a different track from the alternatives list.');
      playerStore.setLoading(false);
      playerStore.setBuffering(false);
    });

    const safeTitle = metadata.title || 'Track';
    const safeArtist = metadata.artist || 'Artist';
    playerStore.setState('currentTrack', {
      ...playerStore.getState().currentTrack,
      title: safeTitle,
      artist: safeArtist,
      cover: metadata.cover || 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=400&q=80',
      videoId: metadata.videoId || safeTitle,
    });
    playerStore.setLoading(true);
    playerStore.setBuffering(true);
  }

  retryDirectFallback() {
    if (!this.lastSourceCandidates.length) {
      playerStore.setError('No alternate audio source is available. Try another track.');
      return;
    }

    const nextCandidate = this.lastSourceCandidates.find((candidate) => candidate && candidate.url && candidate.url !== this.audio.src);
    if (!nextCandidate) {
      playerStore.setError('No alternate audio source is available. Try another track.');
      return;
    }

    this.playDirectSource(nextCandidate.url, this.lastTrack || {});
  }

  play() {
    if (this.currentSource === 'direct') {
      this.audio.play().catch(() => {
        playerStore.setError('Playback was blocked until the user interacts with the page.');
      });
      return;
    }

    if (this.youtube && this.youtube.isReady()) {
      this.youtube.play();
      return;
    }

    if (this.audio.src) {
      this.audio.play().catch(() => {
        playerStore.setError('Playback was blocked until the user interacts with the page.');
      });
    }
  }

  pause() {
    if (this.currentSource === 'direct') {
      this.audio.pause();
      return;
    }
    this.youtube.pause();
  }

  seekTo(seconds) {
    if (this.currentSource === 'direct') {
      this.audio.currentTime = Math.max(0, Number(seconds) || 0);
      return;
    }
    this.youtube.seekTo(seconds);
  }

  setVolume(percent) {
    const value = Math.max(0, Math.min(100, Number(percent) || 0));
    this.audio.volume = value / 100;
    playerStore.setState('volume', value);
    if (this.youtube && this.youtube.isReady()) {
      this.youtube.setVolume(value);
    }
  }

  isReady() {
    return this.ready || this.youtube.isReady();
  }
}
