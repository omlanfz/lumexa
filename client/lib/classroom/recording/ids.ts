// FILE PATH: client/lib/classroom/recording/ids.ts
//
// The id a recording is known by, chosen here rather than by the server: if a
// request is sent twice (a retry, a double click) the server sees the same id
// and makes ONE recording. It must be a UUID v4 — the server refuses anything else.

interface CryptoLike {
  randomUUID?: () => string;
  getRandomValues<T extends ArrayBufferView>(array: T): T;
}

export function newSegmentId(crypto: CryptoLike = globalThis.crypto): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  // A browser without randomUUID: build a version-4 UUID from random bytes.
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
