import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CaptureCancelled,
  RECORDER_MIME_CANDIDATES,
  captureErrorMessage,
  describeSurface,
  pickRecorderMimeType,
  recordingSupport,
} from './capture.ts';

const everything = {
  hasGetDisplayMedia: true,
  hasMediaRecorder: true,
  hasAudioContext: true,
  mimeType: 'video/webm;codecs=vp8,opus',
};

test('a desktop browser that can capture, record WebM and mix audio is supported', () => {
  assert.deepEqual(recordingSupport(everything), { supported: true });
});

test('a phone or tablet cannot capture a screen — and is told why in plain words', () => {
  const r = recordingSupport({ ...everything, hasGetDisplayMedia: false });
  assert.equal(r.supported, false);
  assert.match(r.reason ?? '', /laptop or desktop/);
  assert.match(r.reason ?? '', /Phones and tablets/);
});

test('a browser that cannot record WebM (older Safari) is told to use another', () => {
  for (const missing of [{ hasMediaRecorder: false }, { hasAudioContext: false }, { mimeType: null }]) {
    const r = recordingSupport({ ...everything, ...missing });
    assert.equal(r.supported, false);
    assert.match(r.reason ?? '', /Chrome, Edge or Firefox/);
  }
});

test('the lightest codec the browser can record is chosen first (the teacher’s laptop is also running the class)', () => {
  assert.equal(pickRecorderMimeType(() => true), 'video/webm;codecs=vp8,opus');
  assert.equal(
    pickRecorderMimeType((t) => t !== 'video/webm;codecs=vp8,opus'),
    'video/webm;codecs=vp9,opus',
  );
  assert.equal(pickRecorderMimeType((t) => t === 'video/webm'), 'video/webm');
});

test('a browser that records no WebM at all gets no codec', () => {
  assert.equal(pickRecorderMimeType(() => false), null);
  assert.equal(pickRecorderMimeType((t) => t.startsWith('video/mp4')), null);
});

test('only WebM is ever recorded — the format the server accepts', () => {
  for (const type of RECORDER_MIME_CANDIDATES) assert.ok(type.startsWith('video/webm'));
});

test('what was shared is described for the teacher', () => {
  assert.equal(describeSurface('window'), 'a window');
  assert.equal(describeSurface('browser'), 'a browser tab');
  assert.equal(describeSurface('monitor'), 'your whole screen');
  assert.equal(describeSurface('unknown'), 'your screen');
});

test('errors are explained, never shown as a raw browser message', () => {
  assert.match(captureErrorMessage(new CaptureCancelled()), /no window was chosen/);
  assert.match(captureErrorMessage({ name: 'NotReadableError' }), /Close other screen-sharing/);
  assert.match(captureErrorMessage({ name: 'NotSupportedError' }), /cannot record the screen/);
  assert.match(captureErrorMessage(new Error('Weird internal detail 0x80004005')), /could not start/);
  assert.doesNotMatch(captureErrorMessage(new Error('Weird internal detail 0x80004005')), /0x8000/);
});
