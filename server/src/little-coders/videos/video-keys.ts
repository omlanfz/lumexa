// Where a lesson preview video lives in storage, and how it was made.
//
// The videos are kept indefinitely in their own private R2 bucket (LESSON_VIDEO_R2_BUCKET,
// `lumexa-lesson-videos`), named by CONTENT: the object key contains the first characters of the
// file's SHA-256, so a re-recorded video gets a new address and nothing a student's browser or a CDN
// cached can ever show a stale one. Nothing in the bucket is ever deleted by the application.

export const LESSON_VIDEO_KEY_ROOT = 'lesson-videos/';

export type VideoAssetKind = 'video' | 'poster' | 'captions';

const EXTENSION: Record<VideoAssetKind, string> = { video: 'mp4', poster: 'jpg', captions: 'vtt' };
export const CONTENT_TYPE: Record<VideoAssetKind, string> = {
  video: 'video/mp4',
  poster: 'image/jpeg',
  captions: 'text/vtt; charset=utf-8',
};

/** lesson-videos/little-coders/c1l1/3f9a1c0d52ab.mp4 */
export function lessonVideoKey(programKey: string, lessonKey: string, kind: VideoAssetKind, sha256: string): string {
  const safe = (s: string) => s.replace(/[^A-Za-z0-9._-]/g, '_');
  if (!/^[a-f0-9]{64}$/.test(sha256)) throw new Error('A lesson video key needs the SHA-256 of the file');
  return `${LESSON_VIDEO_KEY_ROOT}${safe(programKey)}/${safe(lessonKey)}/${sha256.slice(0, 12)}.${EXTENSION[kind]}`;
}

/** Defence in depth: only keys under lesson-videos/ are ever read or written by this feature. */
export function isLessonVideoKey(key: unknown): key is string {
  return (
    typeof key === 'string' &&
    key.startsWith(LESSON_VIDEO_KEY_ROOT) &&
    !key.includes('..') &&
    !key.includes('//') &&
    /^[A-Za-z0-9._/-]+$/.test(key) &&
    key.split('/').length === 4
  );
}

export function kindOfKey(key: string): VideoAssetKind | null {
  if (key.endsWith('.mp4')) return 'video';
  if (key.endsWith('.jpg')) return 'poster';
  if (key.endsWith('.vtt')) return 'captions';
  return null;
}

/** The narrator of the whole program: one voice, so every lesson sounds like the same guide. */
export const NARRATOR = {
  engine: 'Kokoro-82M',
  license: 'Apache-2.0',
  voice: 'af_heart',
  /** A comfortable, conversational pace (1.0 is the model's default, which is brisk). */
  speed: 0.8,
} as const;

/** The production record the template asks for: where every sound comes from and under what terms. */
export const VIDEO_CREDITS =
  'Narration: Kokoro-82M text-to-speech, voice af_heart (Apache-2.0, commercial use permitted). ' +
  'Background music and sound effects: synthesised by Lumexa\'s own tooling (prisma/lesson-videos/audio.ts) — no third-party samples or recordings, so no licence is owed. ' +
  'Artwork: drawn by Lumexa\'s own renderer; the Lumexa mark is Lumexa\'s.';

/** The six scenes of the standard storyboard, as the player's chapter markers. */
export const CHAPTER_LABELS = [
  'The question',
  'Meet the idea',
  'How it works',
  'See it in action',
  'Remember this',
  'Your turn',
] as const;

/** Largest video the admin upload accepts. */
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
export const MAX_POSTER_BYTES = 4 * 1024 * 1024;
export const MAX_CAPTIONS_BYTES = 256 * 1024;
