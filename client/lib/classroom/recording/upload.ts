// FILE PATH: client/lib/classroom/recording/upload.ts
//
// Getting a finished recording from the teacher's computer to storage, and
// telling the server it is there. For one recording:
//
//   1. ask the server for a signed upload URL (it checks this is the class's
//      teacher and their recording),
//   2. PUT the file to that URL (progress is reported),
//   3. tell the server it finished — it asks storage and only then makes the
//      recording watchable.
//
// Everything that can go wrong on a real connection is handled here, not left to
// the teacher:
//   - A dropped connection, a stalled upload, an expired URL or a busy server
//     are retried automatically, each time with a FRESH signed URL (the same
//     file always goes to the same place, so a retry can only replace itself).
//   - If the file reached storage but the confirmation did not get through, the
//     retry sends only the confirmation — it never uploads a gigabyte twice.
//   - If the server says the recording is already uploaded (the confirmation
//     succeeded but its answer was lost), that is success.
//   - Pressing Upload twice, or from two places, runs one upload.
//   - What cannot be fixed by trying again (storage not set up, the recording
//     was discarded, not allowed) stops at once with the server's own words.
//   - Anything else ends as "failed" with a plain-language reason and a Retry.
//
// The server, storage and the XHR are passed in, so all of this is tested with
// fakes.

import type { RecordingStore } from './store.ts';
import { StorageUploadError } from './storageUpload.ts';
import type { PutOptions } from './storageUpload.ts';

export interface UploadTarget {
  uploadUrl: string;
  headers: Record<string, string>;
}

export interface UploadDeps {
  store: RecordingStore;
  requestUploadUrl(room: string, id: string, sizeBytes: number): Promise<UploadTarget>;
  confirmUpload(
    room: string,
    id: string,
    body: { sizeBytes: number; durationMs?: number },
  ): Promise<void>;
  putFile(options: PutOptions): Promise<void>;
  /** Waits between retries (instant in tests). */
  sleep?: (ms: number) => Promise<void>;
  /** How long to wait before each automatic retry (so: this many retries). */
  retryDelaysMs?: number[];
}

export const DEFAULT_RETRY_DELAYS_MS = [1_500, 4_000];

const realSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// ─── What kind of failure was it? ─────────────────────────────────────────────

/** The shape of an axios error, without importing axios. */
interface ApiLikeError {
  response?: { status?: number; data?: { message?: string | string[] } };
}

function apiStatus(err: unknown): number | undefined {
  return (err as ApiLikeError)?.response?.status;
}

function apiMessage(err: unknown): string | undefined {
  const message = (err as ApiLikeError)?.response?.data?.message;
  return Array.isArray(message) ? message.join(' ') : message;
}

/** A failure that trying again may fix. */
export function isRetryable(err: unknown): boolean {
  if (err instanceof StorageUploadError) {
    if (err.kind === 'network' || err.kind === 'stalled') return true;
    if (err.kind === 'aborted') return false;
    // 403 can be a URL that expired or a clock that drifted: a fresh URL fixes it.
    const s = err.status ?? 0;
    return s >= 500 || s === 403 || s === 408 || s === 429;
  }
  const status = apiStatus(err);
  if (status === undefined) return isConnectionError(err);
  return status >= 500 || status === 408 || status === 429;
}

/** An HTTP-client error that got no answer at all: the connection dropped. (Any
 * other exception is a bug, not something to retry.) */
function isConnectionError(err: unknown): boolean {
  return (err as { isAxiosError?: boolean })?.isAxiosError === true;
}

/** The server says this recording is already uploaded (so the job is done). */
export function isAlreadyUploaded(err: unknown): boolean {
  return apiStatus(err) === 409 && /already been uploaded/i.test(apiMessage(err) ?? '');
}

/** Why an upload failed, in words the teacher can act on. */
export function friendlyUploadMessage(err: unknown): string {
  if (err instanceof StorageUploadError) {
    switch (err.kind) {
      case 'network':
        return 'Could not reach storage. Check your internet connection and try again. If it keeps failing, ask a Lumexa admin to check the storage (R2) CORS settings.';
      case 'stalled':
        return 'The upload stopped making progress. Check your internet connection and try again.';
      case 'aborted':
        return 'The upload was cancelled.';
      default:
        if (err.status === 403) {
          return 'Storage refused the upload (403). Ask a Lumexa admin to check the R2 access key and bucket settings.';
        }
        return `Storage returned an error (${err.status ?? 'unknown'}). Please try again.`;
    }
  }
  const message = apiMessage(err);
  if (apiStatus(err) !== undefined && message) return message;
  if (apiStatus(err) === undefined && isConnectionError(err)) {
    return 'Could not reach Lumexa. Check your internet connection and try again.';
  }
  return 'The upload did not work. Please try again.';
}

// ─── The upload ───────────────────────────────────────────────────────────────

/** Runs `step`, again (up to the number of delays) while it fails in a way a retry
 * can fix. */
async function withRetries<T>(
  step: () => Promise<T>,
  deps: UploadDeps,
  onRetry?: () => void,
): Promise<T> {
  const delays = deps.retryDelaysMs ?? DEFAULT_RETRY_DELAYS_MS;
  const sleep = deps.sleep ?? realSleep;
  for (let attempt = 0; ; attempt++) {
    try {
      return await step();
    } catch (err) {
      if (attempt >= delays.length || !isRetryable(err)) throw err;
      onRetry?.();
      await sleep(delays[attempt]);
    }
  }
}

/**
 * Uploads one recording. Never throws: the outcome is in the store (`uploaded`,
 * or `failed` with a reason). A second call while one is running does nothing.
 */
export async function runUpload(id: string, deps: UploadDeps): Promise<void> {
  const { store } = deps;
  const recording = store.get(id);
  if (!recording) return;
  if (recording.phase === 'uploading' || recording.phase === 'uploaded') return;
  if (recording.phase === 'recording') return;
  if (!recording.blob && !recording.inStorage) return;

  store.patch(id, {
    phase: 'uploading',
    stage: recording.inStorage ? 'confirming' : 'preparing',
    progress: recording.inStorage ? 1 : 0,
    error: null,
    attempts: recording.attempts + 1,
  });

  const { room, sizeBytes, durationMs } = recording;
  try {
    if (!recording.inStorage) {
      await withRetries(
        async () => {
          store.patch(id, { stage: 'preparing', progress: 0 });
          const target = await deps.requestUploadUrl(room, id, sizeBytes);
          store.patch(id, { stage: 'uploading' });
          let lastValue = 0;
          let lastAt = 0;
          await deps.putFile({
            url: target.uploadUrl,
            headers: target.headers,
            body: recording.blob as Blob,
            // A progress bar needs a few updates a second, not thousands.
            onProgress: (loaded, total) => {
              const p = total > 0 ? Math.min(1, loaded / total) : 0;
              const now = Date.now();
              if (p >= 1 || p - lastValue >= 0.005 || now - lastAt >= 250) {
                lastValue = p;
                lastAt = now;
                store.patch(id, { progress: p });
              }
            },
          });
        },
        deps,
        () => store.patch(id, { stage: 'preparing', progress: 0 }),
      );
      store.patch(id, { inStorage: true, progress: 1, stage: 'confirming' });
    }
    await withRetries(
      () => deps.confirmUpload(room, id, { sizeBytes, durationMs }),
      deps,
    );
    store.patch(id, {
      phase: 'uploaded',
      stage: 'idle',
      progress: 1,
      blob: null,
      error: null,
      inStorage: true,
    });
  } catch (err) {
    if (isAlreadyUploaded(err)) {
      store.patch(id, {
        phase: 'uploaded',
        stage: 'idle',
        progress: 1,
        blob: null,
        error: null,
        inStorage: true,
      });
      return;
    }
    store.patch(id, {
      phase: 'failed',
      stage: 'idle',
      error: friendlyUploadMessage(err),
    });
  }
}

/** Uploads every recording of a class that is waiting, one after another (never
 * several at once: they would share, and slow, the one connection). */
export async function uploadAll(room: string, deps: UploadDeps): Promise<void> {
  for (const r of deps.store.forRoom(room)) {
    if (r.phase === 'saved' || r.phase === 'failed') await runUpload(r.id, deps);
  }
}
