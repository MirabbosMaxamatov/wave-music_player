import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.document = {
  getElementById: () => ({})
};

globalThis.window = {
  YT: null,
  onYouTubeIframeAPIReady: null,
};

globalThis.fetch = async (url) => {
  if (url.includes('youtube.com/oembed')) {
    return {
      ok: true,
      json: async () => ({ html: '<iframe></iframe>' }),
    };
  }

  if (url.includes('api.jamendo.com')) {
    return {
      ok: true,
      json: async () => ({
        results: [{ name: 'Demo Jamendo', audio: 'https://example.com/jamendo.mp3' }],
      }),
    };
  }

  if (url.includes('archive.org')) {
    return {
      ok: true,
      json: async () => ({
        response: {
          docs: [{ identifier: 'demo-archive-audio', title: 'Demo Archive' }],
        },
      }),
    };
  }

  return { ok: false, json: async () => ({}) };
};

globalThis.Audio = class {
  constructor() {
    this.volume = 1;
    this.src = '';
    this.currentTime = 0;
  }

  play() {
    return Promise.resolve();
  }

  pause() {}
};

const { HybridPlayer } = await import('../src/controllers/hybridPlayer.js');

test('YouTube oEmbed detection succeeds when the video is embeddable', async () => {
  const player = new HybridPlayer('yt-player');
  const allowed = await player.checkYouTubeOEmbed('dQw4w9WgXcQ');
  assert.equal(allowed, true);
});

test('Jamendo search returns a direct MP3 candidate', async () => {
  const player = new HybridPlayer('yt-player');
  player.jamendoClientId = 'demo-client-id';
  const results = await player.searchJamendo('lofi');
  assert.equal(results[0].source, 'jamendo');
  assert.match(results[0].url, /\.mp3$/i);
});

test('Archive search builds a fallback candidate set', async () => {
  const player = new HybridPlayer('yt-player');
  const results = await player.searchInternetArchive('public domain');
  assert.ok(results.length >= 1);
  assert.ok(results[0].url.includes('archive.org'));
});
