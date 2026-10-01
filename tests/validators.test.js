import test from 'node:test';
import assert from 'node:assert/strict';

import { extractVideoId } from '../src/utils/validators.js';
import { createLofiTrack, buildTrackFromUrl } from '../src/data/tracks.js';

test('extractVideoId extracts a valid YouTube video id from common URLs', () => {
  assert.equal(extractVideoId('https://youtu.be/jfKfPfyJRdk'), 'jfKfPfyJRdk');
  assert.equal(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.equal(extractVideoId('https://youtube.com/shorts/jfKfPfyJRdk?feature=share'), 'jfKfPfyJRdk');
});

test('createLofiTrack creates a known working fallback track', () => {
  const track = createLofiTrack();
  assert.equal(track.videoId, 'jfKfPfyJRdk');
  assert.equal(track.title, 'Lofi Girl');
  assert.equal(track.artist, 'Lofi Girl');
  assert.ok(track.cover.includes('jfKfPfyJRdk'));
});

test('buildTrackFromUrl creates a stored track object from a valid YouTube URL', () => {
  const track = buildTrackFromUrl('https://youtu.be/dQw4w9WgXcQ', 'Test Track', 'Wave Studio');
  assert.equal(track.videoId, 'dQw4w9WgXcQ');
  assert.equal(track.title, 'Test Track');
  assert.equal(track.artist, 'Wave Studio');
  assert.ok(track.id.startsWith('track-'));
});
