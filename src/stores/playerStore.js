const createStore = () => {
  let state = {
    currentTrack: null,
    isPlaying: false,
    isBuffering: false,
    isLoading: false,
    currentTime: 0,
    duration: 0,
    volume: 80,
    playlist: [],
    currentIndex: -1,
    error: null,
  };

  const listeners = new Set();

  const notify = () => {
    listeners.forEach((cb) => cb(state));
  };

  const update = (changes) => {
    state = { ...state, ...changes };
    notify();
  };

  return {
    getState: () => ({ ...state }),
    setState: (key, value) => {
      state = { ...state, [key]: value };
      notify();
    },
    subscribe: (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    setPlaylist: (tracks) => {
      const list = Array.isArray(tracks) ? tracks : [];
      state = {
        ...state,
        playlist: list,
        currentIndex: list.length > 0 ? 0 : -1,
        currentTrack: list.length > 0 ? list[0] : null,
        isPlaying: false,
        isBuffering: false,
        isLoading: false,
        currentTime: 0,
        duration: 0,
        error: null,
      };
      notify();
    },
    playTrack: (index) => {
      if (index < 0 || index >= state.playlist.length) return;
      const track = state.playlist[index];
      state = {
        ...state,
        currentIndex: index,
        currentTrack: track,
        isPlaying: false,
        isBuffering: true,
        isLoading: true,
        currentTime: 0,
        duration: 0,
        error: null,
      };
      notify();
    },
    play: () => {
      update({ isPlaying: true, isBuffering: false, isLoading: false, error: null });
    },
    pause: () => {
      update({ isPlaying: false });
    },
    next: () => {
      if (!state.playlist.length) return;
      const nextIndex = state.currentIndex + 1 < state.playlist.length ? state.currentIndex + 1 : 0;
      const track = state.playlist[nextIndex];
      state = {
        ...state,
        currentIndex: nextIndex,
        currentTrack: track,
        isPlaying: false,
        isBuffering: true,
        isLoading: true,
        currentTime: 0,
        duration: 0,
        error: null,
      };
      notify();
    },
    previous: () => {
      if (!state.playlist.length) return;
      const prevIndex = state.currentIndex - 1 >= 0 ? state.currentIndex - 1 : state.playlist.length - 1;
      const track = state.playlist[prevIndex];
      state = {
        ...state,
        currentIndex: prevIndex,
        currentTrack: track,
        isPlaying: false,
        isBuffering: true,
        isLoading: true,
        currentTime: 0,
        duration: 0,
        error: null,
      };
      notify();
    },
    seekTo: (time) => {
      update({ currentTime: Math.max(0, Number(time) || 0) });
    },
    setDuration: (d) => {
      update({ duration: Math.max(0, Number(d) || 0) });
    },
    setVolume: (v) => {
      update({ volume: Math.max(0, Math.min(100, Number(v) || 0)) });
    },
    setBuffering: (b) => {
      update({ isBuffering: !!b, isLoading: !!b ? true : state.isLoading });
    },
    setLoading: (loading) => {
      update({ isLoading: !!loading, isBuffering: !!loading || state.isBuffering });
    },
    setError: (message) => {
      update({ error: message || null, isPlaying: false, isBuffering: false, isLoading: false });
    },
    clearError: () => {
      update({ error: null });
    },
  };
};

export const playerStore = createStore();
