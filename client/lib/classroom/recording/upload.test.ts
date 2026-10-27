import test from 'node:test';
import assert from 'node:assert/strict';
import { RecordingStore, type LocalRecording } from './store.ts';
import { StorageUploadError, type PutOptions } from './storageUpload.ts';
import {
  friendlyUploadMessage,
  isAlreadyUploaded,
  isRetryable,
  runUpload,
  uploadAll,
  type UploadDeps,
} from './upload.ts';

const FILE = new Blob(['x'.repeat(2048)], { type: 'video/webm' });

const recording = (over: Partial<LocalRecording> = {}): LocalRecording => ({
  id: 'seg-1',
  room: 'lesson-abc',
  part: 1,
  phase: 'saved',
  stage: 'idle',
  startedAt: 1_700_000_000_000,
  durationMs: 61_000,
  sizeBytes: FILE.size,
  blob: FILE,
  progress: 0,
  error: null,
  attempts: 0,
  inStorage: false,
  seekable: true,
  stopReason: 'user',
  surface: 'window',
  ...over,
});

const apiError = (status: number, message: string) => ({ response: { status, data: { message } }, isAxiosError: true });
const connectionError = () => ({ isAxiosError: true, message: 'Network Error' });

interface Calls {
  urls: string[];
  puts: PutOptions[];
  confirms: { room: string; id: string; body: { sizeBytes: number; durationMs?: number } }[];
  sleeps: number[];
}

/** A server and a storage that behave, unless a script says otherwise. */
function harness(script: {
  url?: (n: number) => Promise<{ uploadUrl: string; headers: Record<string, string> }> | undefined;
  put?: (n: number, o: PutOptions) => Promise<void> | undefined;
  confirm?: (n: number) => Promise<void> | undefined;
} = {}) {
  const store = new RecordingStore();
  const calls: Calls = { urls: [], puts: [], confirms: [], sleeps: [] };
  let nUrl = 0, nPut = 0, nConfirm = 0;
  const deps: UploadDeps = {
    store,
    requestUploadUrl: async (room, id, size) => {
      const n = ++nUrl;
      calls.urls.push(`${room}/${id}/${size}`);
      return (await script.url?.(n)) ?? { uploadUrl: `https://r2.example/put?sig=${n}`, headers: { 'Content-Type': 'video/webm' } };
    },
    putFile: async (o) => {
      const n = ++nPut;
      calls.puts.push(o);
      o.onProgress?.(o.body.size / 2, o.body.size);
      o.onProgress?.(o.body.size, o.body.size);
      await script.put?.(n, o);
    },
    confirmUpload: async (room, id, body) => {
      const n = ++nConfirm;
      calls.confirms.push({ room, id, body });
      await script.confirm?.(n);
    },
    sleep: async (ms) => { calls.sleeps.push(ms); },
  };
  return { store, deps, calls };
}

test('uploads a recording: asks for a URL, sends the file to it, confirms — and frees the file', async () => {
  const { store, deps, calls } = harness();
  store.add(recording());

  await runUpload('seg-1', deps);

  const r = store.get('seg-1')!;
  assert.equal(r.phase, 'uploaded');
  assert.equal(r.progress, 1);
  assert.equal(r.error, null);
  assert.equal(r.blob, null, 'the file is released once the server has it');
  assert.equal(r.attempts, 1);
  assert.deepEqual(calls.urls, [`lesson-abc/seg-1/${FILE.size}`]);
  assert.equal(calls.puts.length, 1);
  assert.equal(calls.puts[0].url, 'https://r2.example/put?sig=1');
  assert.deepEqual(calls.puts[0].headers, { 'Content-Type': 'video/webm' });
  assert.equal(calls.puts[0].body, FILE);
  assert.deepEqual(calls.confirms, [{ room: 'lesson-abc', id: 'seg-1', body: { sizeBytes: FILE.size, durationMs: 61_000 } }]);
  assert.deepEqual(calls.sleeps, []);
});

test('reports progress while uploading, in the right stages', async () => {
  const seen: string[] = [];
  const h = harness();
  h.store.subscribe(() => {
    const r = h.store.get('seg-1');
    if (r) seen.push(`${r.phase}/${r.stage}`);
  });
  h.store.add(recording());
  await runUpload('seg-1', h.deps);
  const stages = [...new Set(seen)];
  assert.deepEqual(stages, ['saved/idle', 'uploading/preparing', 'uploading/uploading', 'uploading/confirming', 'uploaded/idle']);
});

test('does not flood the screen with a progress update for every byte', async () => {
  const h = harness({ put: undefined });
  let updates = 0;
  h.store.subscribe(() => updates++);
  h.deps.putFile = async (o) => {
    for (let i = 1; i <= 5_000; i++) o.onProgress?.(i, 5_000);
  };
  h.store.add(recording());
  await runUpload('seg-1', h.deps);
  assert.ok(updates < 400, `${updates} store updates for 5000 progress events`);
});

test('pressing Upload twice — or from two places — uploads once', async () => {
  const h = harness();
  h.store.add(recording());
  await Promise.all([runUpload('seg-1', h.deps), runUpload('seg-1', h.deps), runUpload('seg-1', h.deps)]);
  assert.equal(h.calls.puts.length, 1);
  assert.equal(h.calls.confirms.length, 1);
  assert.equal(h.store.get('seg-1')!.phase, 'uploaded');
});

test('a recording that is uploaded, still being recorded, or has no file is left alone', async () => {
  const h = harness();
  h.store.add(recording({ id: 'done', phase: 'uploaded', blob: null }));
  h.store.add(recording({ id: 'live', phase: 'recording', blob: null }));
  h.store.add(recording({ id: 'empty', blob: null }));
  for (const id of ['done', 'live', 'empty', 'nope']) await runUpload(id, h.deps);
  assert.deepEqual(h.calls.urls, []);
});

test('a dropped connection is retried automatically, each time with a FRESH signed URL', async () => {
  const h = harness({
    put: async (n) => { if (n < 3) throw new StorageUploadError('network'); },
  });
  h.store.add(recording());
  await runUpload('seg-1', h.deps);
  assert.equal(h.store.get('seg-1')!.phase, 'uploaded');
  assert.equal(h.calls.puts.length, 3);
  assert.deepEqual(h.calls.puts.map((p) => p.url), ['https://r2.example/put?sig=1', 'https://r2.example/put?sig=2', 'https://r2.example/put?sig=3']);
  assert.deepEqual(h.calls.sleeps, [1500, 4000]);
});

test('a stalled upload is retried like a dropped one', async () => {
  const h = harness({ put: async (n) => { if (n === 1) throw new StorageUploadError('stalled'); } });
  h.store.add(recording());
  await runUpload('seg-1', h.deps);
  assert.equal(h.store.get('seg-1')!.phase, 'uploaded');
  assert.equal(h.calls.puts.length, 2);
});

test('a URL storage refuses with 403 (expired, clock drift) is retried with a fresh one', async () => {
  const h = harness({ put: async (n) => { if (n === 1) throw new StorageUploadError('http', 403, 'SignatureDoesNotMatch'); } });
  h.store.add(recording());
  await runUpload('seg-1', h.deps);
  assert.equal(h.store.get('seg-1')!.phase, 'uploaded');
});

test('after the automatic retries it gives up with a reason and keeps the file, so the teacher can Retry', async () => {
  const h = harness({ put: async () => { throw new StorageUploadError('network'); } });
  h.store.add(recording());

  await runUpload('seg-1', h.deps);

  const failed = h.store.get('seg-1')!;
  assert.equal(failed.phase, 'failed');
  assert.match(failed.error ?? '', /Could not reach storage/);
  assert.match(failed.error ?? '', /CORS/, 'the likely cause an admin can fix is named');
  assert.ok(failed.blob, 'the recording is still here');
  assert.equal(h.calls.puts.length, 3, 'the first try and two retries');

  // The teacher presses Retry once the connection is back.
  h.deps.putFile = async () => undefined;
  await runUpload('seg-1', h.deps);
  const done = h.store.get('seg-1')!;
  assert.equal(done.phase, 'uploaded');
  assert.equal(done.attempts, 2);
});

test('what a retry cannot fix stops at once, in the server’s own words', async () => {
  const message = 'Recording storage is not set up on the server yet: missing R2_BUCKET.';
  const h = harness({ url: () => Promise.reject(apiError(400, message)) });
  h.store.add(recording());
  await runUpload('seg-1', h.deps);
  const r = h.store.get('seg-1')!;
  assert.equal(r.phase, 'failed');
  assert.equal(r.error, message);
  assert.equal(h.calls.puts.length, 0);
  assert.deepEqual(h.calls.sleeps, [], 'no pointless waiting');
  assert.ok(r.blob);
});

test('a busy server (503) is waited out; a dropped connection to Lumexa too', async () => {
  const h = harness({
    url: (n) => (n === 1 ? Promise.reject(apiError(503, 'busy')) : n === 2 ? Promise.reject(connectionError()) : undefined),
  });
  h.store.add(recording());
  await runUpload('seg-1', h.deps);
  assert.equal(h.store.get('seg-1')!.phase, 'uploaded');
  assert.deepEqual(h.calls.sleeps, [1500, 4000]);
});

test('if the file reached storage but the confirmation was lost, a retry sends ONLY the confirmation', async () => {
  const h = harness({ confirm: async () => { throw connectionError(); } });
  h.store.add(recording());

  await runUpload('seg-1', h.deps);

  const failed = h.store.get('seg-1')!;
  assert.equal(failed.phase, 'failed');
  assert.equal(failed.inStorage, true);
  assert.equal(h.calls.puts.length, 1);

  h.deps.confirmUpload = async (room, id, body) => { h.calls.confirms.push({ room, id, body }); };
  const urlsBefore = h.calls.urls.length;
  await runUpload('seg-1', h.deps);
  assert.equal(h.store.get('seg-1')!.phase, 'uploaded');
  assert.equal(h.calls.puts.length, 1, 'the file was not sent a second time');
  assert.equal(h.calls.urls.length, urlsBefore, 'no new upload URL was even asked for');
});

test('the server saying "already uploaded" is success, not an error', async () => {
  const h = harness({ url: () => Promise.reject(apiError(409, 'This recording has already been uploaded.')) });
  h.store.add(recording());
  await runUpload('seg-1', h.deps);
  const r = h.store.get('seg-1')!;
  assert.equal(r.phase, 'uploaded');
  assert.equal(r.blob, null);
});

test('a recording the server will not take (discarded, removed) fails clearly and is not retried', async () => {
  const h = harness({ url: () => Promise.reject(apiError(409, 'This recording was discarded and can no longer be uploaded.')) });
  h.store.add(recording());
  await runUpload('seg-1', h.deps);
  assert.equal(h.store.get('seg-1')!.phase, 'failed');
  assert.match(h.store.get('seg-1')!.error ?? '', /discarded/);
  assert.deepEqual(h.calls.sleeps, []);
});

test('Upload all goes one recording at a time, skips what is done, and a failure does not stop the others', async () => {
  const order: string[] = [];
  const h = harness();
  h.deps.putFile = async (o) => {
    order.push(`put:${o.url.endsWith('sig=1') ? 'a' : o.url.endsWith('sig=2') ? 'b' : 'c'}`);
    if (order.length === 1) throw new StorageUploadError('http', 400, 'EntityTooLarge');
  };
  h.store.add(recording({ id: 'a', part: 1 }));
  h.store.add(recording({ id: 'b', part: 2 }));
  h.store.add(recording({ id: 'already', part: 3, phase: 'uploaded', blob: null }));
  h.store.add(recording({ id: 'other-class', room: 'lesson-zzz', part: 1 }));

  await uploadAll('lesson-abc', h.deps);

  assert.equal(h.store.get('a')!.phase, 'failed');
  assert.equal(h.store.get('b')!.phase, 'uploaded');
  assert.equal(h.store.get('other-class')!.phase, 'saved', 'another class’s recording is not touched');
  // One after the other, in order: a (which failed), then b.
  assert.deepEqual(order, ['put:a', 'put:b']);
});

test('which failures are worth retrying', () => {
  assert.equal(isRetryable(new StorageUploadError('network')), true);
  assert.equal(isRetryable(new StorageUploadError('stalled')), true);
  assert.equal(isRetryable(new StorageUploadError('aborted')), false);
  assert.equal(isRetryable(new StorageUploadError('http', 500)), true);
  assert.equal(isRetryable(new StorageUploadError('http', 503)), true);
  assert.equal(isRetryable(new StorageUploadError('http', 403)), true);
  assert.equal(isRetryable(new StorageUploadError('http', 400)), false);
  assert.equal(isRetryable(new StorageUploadError('http', 404)), false);
  assert.equal(isRetryable(apiError(500, 'x')), true);
  assert.equal(isRetryable(apiError(429, 'x')), true);
  assert.equal(isRetryable(apiError(400, 'x')), false);
  assert.equal(isRetryable(apiError(403, 'x')), false);
  assert.equal(isRetryable(apiError(404, 'x')), false);
  assert.equal(isRetryable(apiError(409, 'x')), false);
  assert.equal(isRetryable(connectionError()), true);
  assert.equal(isRetryable(new TypeError('a bug, not a network error')), false);
});

test('only the “already uploaded” conflict counts as done', () => {
  assert.equal(isAlreadyUploaded(apiError(409, 'This recording has already been uploaded.')), true);
  assert.equal(isAlreadyUploaded(apiError(409, 'This recording was discarded.')), false);
  assert.equal(isAlreadyUploaded(apiError(400, 'already been uploaded')), false);
  assert.equal(isAlreadyUploaded(new Error('already been uploaded')), false);
});

test('failures are explained in plain language and never leak internals', () => {
  assert.match(friendlyUploadMessage(new StorageUploadError('network')), /Check your internet connection/);
  assert.match(friendlyUploadMessage(new StorageUploadError('stalled')), /stopped making progress/);
  assert.match(friendlyUploadMessage(new StorageUploadError('http', 403, 'SignatureDoesNotMatch')), /R2 access key/);
  assert.match(friendlyUploadMessage(new StorageUploadError('http', 500)), /Storage returned an error \(500\)/);
  assert.equal(friendlyUploadMessage(apiError(400, 'Recording storage is not set up.')), 'Recording storage is not set up.');
  assert.match(friendlyUploadMessage(connectionError()), /Could not reach Lumexa/);
  assert.match(friendlyUploadMessage(new Error('TypeError: x is undefined at foo.js:12')), /did not work/);
  assert.doesNotMatch(friendlyUploadMessage(new Error('TypeError: x is undefined at foo.js:12')), /foo\.js/);
  // The server's message array (validation errors) is joined.
  assert.equal(friendlyUploadMessage({ response: { status: 400, data: { message: ['a', 'b'] } } }), 'a b');
});
