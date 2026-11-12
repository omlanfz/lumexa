// What the list of finished lesson videos (published-videos.ts) says about each one.

import type { LcVideoChapter } from '../lc.types';

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
