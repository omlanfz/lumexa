// The small description the upload tool stores beside every lesson video in the bucket
// (lesson-videos/little-coders/<lesson>/<video hash>.json). It is what lets the server find and show a
// video that someone put in the bucket — with the upload tool, rclone, or the Cloudflare dashboard —
// without anything about the video having to live in git or in the database first.

import type { LcVideoChapter } from '../lc.types';
import { MAX_VIDEO_BYTES } from './video-keys';

export interface PublishedVideo {
  /** The lesson: "c1l1" … "c5l8". */
  lesson: string;
  /** SHA-256 of the MP4 — the bucket key is derived from it (video-keys.ts). */
  sha256: string;
  bytes: number;
  width: number;
  height: number;
  durationSeconds: number;
  /** SHA-256 of the poster image / the WebVTT subtitles, when there are some. */
  posterSha256: string | null;
  captionsSha256: string | null;
  chapters: LcVideoChapter[];
}

const HEX64 = /^[a-f0-9]{64}$/;
const whole = (v: unknown, min: number, max: number): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;

/** A description read from the bucket, or null when it is not a valid one (it is then ignored). */
export function parsePublishedVideo(raw: unknown): PublishedVideo | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Record<string, unknown>;
  const optionalHash = (v: unknown): string | null | undefined =>
    v === null || v === undefined
      ? null
      : typeof v === 'string' && HEX64.test(v)
        ? v
        : undefined;
  const poster = optionalHash(o.posterSha256);
  const captions = optionalHash(o.captionsSha256);
  if (typeof o.lesson !== 'string' || !/^c[1-5]l[1-8]$/.test(o.lesson))
    return null;
  if (typeof o.sha256 !== 'string' || !HEX64.test(o.sha256)) return null;
  if (
    !whole(o.bytes, 1, MAX_VIDEO_BYTES) ||
    !whole(o.width, 320, 3840) ||
    !whole(o.height, 180, 2160)
  )
    return null;
  if (
    typeof o.durationSeconds !== 'number' ||
    !(o.durationSeconds >= 1 && o.durationSeconds <= 120)
  )
    return null;
  if (poster === undefined || captions === undefined) return null;
  const rawChapters = o.chapters ?? [];
  if (!Array.isArray(rawChapters) || rawChapters.length > 8) return null;
  const chapters: LcVideoChapter[] = [];
  for (const c of rawChapters) {
    const ch = (c ?? {}) as Record<string, unknown>;
    if (
      typeof ch.label !== 'string' ||
      !ch.label.trim() ||
      ch.label.length > 40
    )
      return null;
    if (typeof ch.start !== 'number' || !(ch.start >= 0 && ch.start <= 120))
      return null;
    chapters.push({
      label: ch.label.trim(),
      start: Math.round(ch.start * 10) / 10,
    });
  }
  return {
    lesson: o.lesson,
    sha256: o.sha256,
    bytes: o.bytes,
    width: o.width,
    height: o.height,
    durationSeconds: Math.round(o.durationSeconds * 10) / 10,
    posterSha256: poster,
    captionsSha256: captions,
    chapters,
  };
}
