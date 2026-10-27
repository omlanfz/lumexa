// FILE PATH: client/lib/classroom/recording/storageUpload.ts
//
// Sends the finished recording to storage with a plain PUT to the short-lived
// URL the server signed. This is the one request that goes to R2 rather than to
// Lumexa's server, so it deliberately uses a bare XMLHttpRequest:
//   - not the shared axios instance, which would add the login token (R2 refuses
//     a request that carries both a signed URL and an Authorization header), and
//   - XHR rather than fetch, because only XHR reports how much has been uploaded.
//
// Failures say what kind they were, so the caller can retry the ones a retry can
// fix (a dropped connection, an expired URL) and not the ones it cannot.

/** The parts of an XMLHttpRequest used — so a test can stand in for one. */
export interface XhrLike {
  open(method: string, url: string): void;
  setRequestHeader(name: string, value: string): void;
  send(body: Blob): void;
  abort(): void;
  upload: { onprogress: ((e: { loaded: number; total: number; lengthComputable: boolean }) => void) | null };
  onload: (() => void) | null;
  onerror: (() => void) | null;
  onabort: (() => void) | null;
  readonly status: number;
  readonly responseText: string;
}

export type StorageFailure =
  | 'network' // no answer: offline, the connection dropped, or the bucket's CORS blocks the page
  | 'stalled' // the upload stopped making progress
  | 'http' // storage answered with an error
  | 'aborted'; // we cancelled it

export class StorageUploadError extends Error {
  readonly kind: StorageFailure;
  readonly status?: number;
  /** Storage's own error code (e.g. SignatureDoesNotMatch), when it sent one. */
  readonly code?: string;

  constructor(kind: StorageFailure, status?: number, code?: string) {
    super(
      kind === 'http'
        ? `Storage answered ${status}${code ? ` (${code})` : ''}`
        : `Upload ${kind}`,
    );
    this.name = 'StorageUploadError';
    this.kind = kind;
    this.status = status;
    this.code = code;
  }
}

export interface PutOptions {
  url: string;
  /** Sent exactly as given (the signed URL expects them). */
  headers: Record<string, string>;
  body: Blob;
  onProgress?: (loaded: number, total: number) => void;
  signal?: AbortSignal;
  /** No progress for this long counts as stalled. */
  stallMs?: number;
  createRequest?: () => XhrLike;
}

export const DEFAULT_STALL_MS = 60_000;

/** `<Code>SignatureDoesNotMatch</Code>` → "SignatureDoesNotMatch". */
export function storageErrorCode(body: string): string | undefined {
  return /<Code>([^<]{1,80})<\/Code>/.exec(body)?.[1];
}

export function putWithProgress(options: PutOptions): Promise<void> {
  const { url, headers, body, onProgress, signal } = options;
  const stallMs = options.stallMs ?? DEFAULT_STALL_MS;
  const xhr = (options.createRequest ?? (() => new XMLHttpRequest() as unknown as XhrLike))();

  return new Promise<void>((resolve, reject) => {
    let stall: ReturnType<typeof setTimeout> | undefined;
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(stall);
      signal?.removeEventListener('abort', onAbort);
      fn();
    };
    const arm = () => {
      clearTimeout(stall);
      stall = setTimeout(() => {
        finish(() => reject(new StorageUploadError('stalled')));
        xhr.abort();
      }, stallMs);
    };
    const onAbort = () => xhr.abort();

    xhr.open('PUT', url);
    for (const [name, value] of Object.entries(headers)) {
      xhr.setRequestHeader(name, value);
    }
    xhr.upload.onprogress = (e) => {
      arm();
      if (e.lengthComputable) onProgress?.(e.loaded, e.total);
    };
    xhr.onload = () =>
      finish(() => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else {
          reject(
            new StorageUploadError('http', xhr.status, storageErrorCode(xhr.responseText)),
          );
        }
      });
    xhr.onerror = () => finish(() => reject(new StorageUploadError('network')));
    xhr.onabort = () => finish(() => reject(new StorageUploadError('aborted')));

    if (signal?.aborted) return finish(() => reject(new StorageUploadError('aborted')));
    signal?.addEventListener('abort', onAbort, { once: true });
    arm();
    xhr.send(body);
  });
}
