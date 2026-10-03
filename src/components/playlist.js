import { getAllTracks, addTrack, removeTrack, updateTrack, fetchTrackMetadata, createLofiTrack } from '../data/tracks.js';
import { extractVideoId } from '../utils/validators.js';

/**
 * Playlist paneli.
 *
 * DIQQAT: prompt()/alert()/confirm() ishlatilmaydi — ular ba'zi brauzerlar
 * (sandboxed iframe, ba'zi mobil brauzerlar, dialoglar o'chirilgan holatda)
 * JIMGINA rad etiladi va hech qanday xato bermaydi. Foydalanuvchi hech narsa
 * ko'rmaydi. Shuning uchun barcha dialog o'rniga haqiqiy DOM elementlari qo'llanadi.
 */
export const mountPlaylist = (containerId, store, player) => {
  const el = document.getElementById(containerId);
  if (!el) {
    console.error('Playlist container not found:', containerId);
    return;
  }

  const escapeHtml = (text) =>
    String(text).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );

  // ---------- Header ----------
  const header = document.createElement('div');
  header.className = 'playlist-header';

  const title = document.createElement('h3');
  title.textContent = 'Playlist';

  const btnAdd = document.createElement('button');
  btnAdd.className = 'btn-add';
  btnAdd.type = 'button';
  btnAdd.textContent = '+ Add Track';
  btnAdd.setAttribute('aria-label', 'Add Track');
  btnAdd.setAttribute('aria-expanded', 'false');

  const btnLofi = document.createElement('button');
  btnLofi.className = 'btn-lofi';
  btnLofi.type = 'button';
  btnLofi.textContent = 'Test with Lofi Girl';
  btnLofi.setAttribute('aria-label', 'Test with Lofi Girl');

  header.append(title, btnAdd, btnLofi);

  // ---------- Forma (innerHTML dan tashqarida, typing paytida tozalanmasligi uchun) ----------
  const form = document.createElement('form');
  form.className = 'add-form';
  form.hidden = true;

  const urlLabel = document.createElement('label');
  urlLabel.className = 'add-label';
  urlLabel.textContent = 'YouTube URL';
  const urlInput = document.createElement('input');
  urlInput.className = 'add-input';
  urlInput.type = 'text';
  urlInput.placeholder = 'https://youtu.be/VIDEOID?si=…';
  urlInput.setAttribute('aria-label', 'YouTube URL');
  urlInput.autocomplete = 'off';
  urlInput.spellcheck = false;

  const titleLabel = document.createElement('label');
  titleLabel.className = 'add-label';
  titleLabel.textContent = 'Title (optional)';
  const titleInput = document.createElement('input');
  titleInput.className = 'add-input';
  titleInput.type = 'text';
  titleInput.placeholder = 'Unknown Title';
  titleInput.setAttribute('aria-label', 'Track title');

  const artistLabel = document.createElement('label');
  artistLabel.className = 'add-label';
  artistLabel.textContent = 'Artist (optional)';
  const artistInput = document.createElement('input');
  artistInput.className = 'add-input';
  artistInput.type = 'text';
  artistInput.placeholder = 'Unknown Artist';
  artistInput.setAttribute('aria-label', 'Artist name');

  const actions = document.createElement('div');
  actions.className = 'add-actions';
  const submitBtn = document.createElement('button');
  submitBtn.className = 'btn-submit';
  submitBtn.type = 'submit';
  submitBtn.textContent = 'Add';
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn-cancel';
  cancelBtn.type = 'button';
  cancelBtn.textContent = 'Cancel';
  actions.append(submitBtn, cancelBtn);

  const error = document.createElement('p');
  error.className = 'add-error';
  error.setAttribute('role', 'alert');
  error.hidden = true;

  form.append(urlLabel, urlInput, titleLabel, titleInput, artistLabel, artistInput, actions, error);

  // ---------- Ro'yxat ----------
  const list = document.createElement('div');
  list.className = 'track-list';

  const empty = document.createElement('div');
  empty.className = 'empty';
  empty.textContent = 'No tracks yet. Click "+ Add Track" to add YouTube music.';

  el.append(header, form, list, empty);

  const closeForm = () => {
    form.hidden = true;
    btnAdd.setAttribute('aria-expanded', 'false');
    urlInput.value = '';
    titleInput.value = '';
    artistInput.value = '';
    error.hidden = true;
    error.textContent = '';
  };

  const openForm = () => {
    form.hidden = false;
    btnAdd.setAttribute('aria-expanded', 'true');
    error.hidden = true;
    urlInput.focus();
  };

  // faqat ro'yxat qismi qayta chiziladi — forma typing paytida buzilmaydi
  const render = () => {
    const tracks = getAllTracks();
    const currentTrack = store.getState().currentTrack;

    title.textContent = `Playlist (${tracks.length})`;

    list.innerHTML = tracks
      .map(
        (track, index) => `
          <div class="track-item ${currentTrack?.id === track.id ? 'active' : ''}" data-index="${index}">
            <img class="track-thumb" src="${escapeHtml(track.cover)}" alt="" />
            <div class="track-details">
              <span class="track-title">${escapeHtml(track.title)}</span>
              <span class="track-artist">${escapeHtml(track.artist)}</span>
            </div>
            <button class="btn-delete" data-id="${escapeHtml(track.id)}" type="button" aria-label="Remove track">✕</button>
          </div>
        `,
      )
      .join('');

    empty.hidden = tracks.length > 0;
  };

  btnAdd.addEventListener('click', () => {
    if (form.hidden) openForm();
    else closeForm();
  });

  btnLofi.addEventListener('click', () => {
    const tracks = getAllTracks();
    const lofiVideoId = 'jfKfPfyJRdk';
    const existing = tracks.find((track) => track.videoId === lofiVideoId);

    try {
      if (existing) {
        const idx = tracks.indexOf(existing);
        store.playTrack(idx);
        player?.loadVideo?.(existing.videoId);
        return;
      }

      const lofiTrack = addTrack('https://youtu.be/' + lofiVideoId, 'Lofi Girl', 'Lofi Girl');
      const nextTracks = getAllTracks();
      const idx = nextTracks.findIndex((track) => track.videoId === lofiVideoId);
      store.setPlaylist(nextTracks);
      if (idx >= 0) {
        store.playTrack(idx);
        player?.loadVideo?.(lofiTrack.videoId);
      }
      render();
    } catch (err) {
      console.error('Lofi fallback failed', err);
      error.textContent = err.message || 'Unable to add the Lofi fallback track.';
      error.hidden = false;
    }
  });

  cancelBtn.addEventListener('click', closeForm);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const url = urlInput.value.trim();
    if (!url) {
      error.textContent = 'Iltimos, YouTube havolasini kiriting.';
      error.hidden = false;
      urlInput.focus();
      return;
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      error.textContent = 'Noto\'g\'ri YouTube havolasi. Havola quyidagicha bo\'lishi kerak: youtu.be/... yoki youtube.com/watch?v=...';
      error.hidden = false;
      urlInput.focus();
      return;
    }

    const customTitle = titleInput.value.trim();
    const customArtist = artistInput.value.trim();

    try {
      const newTrack = addTrack(url, customTitle, customArtist);
      const allTracks = getAllTracks();
      store.setPlaylist(allTracks);

      const trackIndex = allTracks.findIndex((t) => t.id === newTrack.id);
      if (trackIndex >= 0) {
        store.playTrack(trackIndex);
        player?.loadVideo?.(newTrack.videoId);
      }

      closeForm();
      render();

      // Agar sarlavha kiritilmagan bo'lsa, YouTube'dan asl nomini olamiz
      if (!customTitle || !customArtist) {
        fetchTrackMetadata(videoId)
          .then((meta) => {
            if (meta && (meta.title || meta.artist)) {
              updateTrack(newTrack.id, {
                title: customTitle || meta.title || newTrack.title,
                artist: customArtist || meta.artist || newTrack.artist,
              });
              store.setPlaylist(getAllTracks());
              render();
            }
          })
          .catch(() => {});
      }
    } catch (err) {
      if (err.code === 'TRACK_EXISTS' && err.existingTrack) {
        const allTracks = getAllTracks();
        const existingIdx = allTracks.findIndex((t) => t.videoId === err.existingTrack.videoId);
        if (existingIdx >= 0) {
          store.playTrack(existingIdx);
          player?.loadVideo?.(err.existingTrack.videoId);
        }
        closeForm();
        render();
        return;
      }
      error.textContent = err.message || 'Trekni qo\'shishda xatolik yuz berdi.';
      error.hidden = false;
    }
  });

  // Voqealar delegatsiyasi — innerHTML qayta chizilganda ham ishlaydi
  el.addEventListener('click', (event) => {
    const deleteButton = event.target.closest('.btn-delete');
    if (deleteButton) {
      const id = deleteButton.dataset.id;
      if (!id) return;
      removeTrack(id);
      const remaining = getAllTracks();
      store.setPlaylist(remaining);
      render();
      return;
    }

    const trackItem = event.target.closest('.track-item');
    if (trackItem && !event.target.closest('.btn-delete')) {
      const index = Number(trackItem.dataset.index);
      if (Number.isNaN(index)) return;
      store.playTrack(index);
      const current = store.getState().currentTrack;
      if (current?.videoId) player?.loadVideo?.(current.videoId);
    }
  });

  const unsubscribe = store.subscribe(render);
  render();

  return { unsubscribe };
};
