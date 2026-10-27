// FILE PATH: client/lib/classroom/recording/format.ts
//
// Plain-language numbers for recordings: how long, how big.

/** 754_000 → "12:34"; 3_725_000 → "1:02:05". */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const two = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${two(m)}:${two(s)}` : `${m}:${two(s)}`;
}

/** 5_300_000 → "5.3 MB"; 1_500_000_000 → "1.4 GB". */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb < 1) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (mb < 1024) return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
}

/** The longest a part may be, for a sentence: 70 → "70 minutes", 60 → "1 hour". */
export function formatMinutes(minutes: number): string {
  if (minutes === 60) return '1 hour';
  if (minutes % 60 === 0) return `${minutes / 60} hours`;
  return `${minutes} minutes`;
}

/** "1 h 5 min", "45 min", "3 min", "under a minute" — for a card, not a clock. */
export function describeDuration(seconds: number | null | undefined): string | null {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds) || seconds <= 0) {
    return null;
  }
  const minutes = Math.round(seconds / 60);
  if (minutes < 1) return 'under a minute';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** Total length of a class's parts, when every part's length is known. */
export function totalSeconds(parts: { durationSeconds: number | null }[]): number | null {
  if (parts.length === 0) return null;
  let total = 0;
  for (const p of parts) {
    if (p.durationSeconds === null) return null;
    total += p.durationSeconds;
  }
  return total;
}
