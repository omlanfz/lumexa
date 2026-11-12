// The logic of the lesson video player, kept apart from the screen so it can be tested: time
// formatting, which chapter a moment belongs to, what a key press means, and the playback speeds.

import type { LcVideoChapter } from './types';

export const PLAYBACK_SPEEDS = [0.75, 1, 1.25, 1.5] as const;
export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number];

/** "1:05" — never negative, never NaN (a video that has not loaded yet reports NaN). */
export function formatTime(seconds: number): string {
  const total = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** Keeps a moment inside the video. */
export function clampTime(time: number, duration: number): number {
  if (!Number.isFinite(time) || time < 0) return 0;
  return Number.isFinite(duration) && duration > 0 ? Math.min(time, duration) : time;
}

/** The chapter a moment is in: the last one that has started. -1 before the first (or with none). */
export function chapterIndexAt(chapters: LcVideoChapter[], time: number): number {
  let found = -1;
  for (let i = 0; i < chapters.length; i++) {
    if (time + 0.05 >= chapters[i].start) found = i;
    else break;
  }
  return found;
}

/** Chapter markers as positions (0–100 %) along the seek bar; markers outside the video are dropped. */
export function chapterMarkers(chapters: LcVideoChapter[], duration: number): { label: string; percent: number }[] {
  if (!Number.isFinite(duration) || duration <= 0) return [];
  return chapters
    .filter((c) => c.start > 0.05 && c.start < duration - 0.05)
    .map((c) => ({ label: c.label, percent: (c.start / duration) * 100 }));
}

/** The next speed in the cycle 0.75× → 1× → 1.25× → 1.5× → 0.75×. Unknown speeds go to normal. */
export function nextSpeed(current: number): PlaybackSpeed {
  const i = PLAYBACK_SPEEDS.findIndex((s) => s === current);
  return i < 0 ? 1 : PLAYBACK_SPEEDS[(i + 1) % PLAYBACK_SPEEDS.length];
}

export const speedLabel = (speed: number): string => `${speed}×`;

export type PlayerAction =
  | { type: 'toggle' }
  | { type: 'seekBy'; seconds: number }
  | { type: 'seekToPercent'; percent: number }
  | { type: 'seekToStart' }
  | { type: 'seekToEnd' }
  | { type: 'volumeBy'; delta: number }
  | { type: 'mute' }
  | { type: 'fullscreen' }
  | { type: 'captions' }
  | { type: 'chapter'; delta: 1 | -1 };

/** What a key press means for the player (null = not ours, leave it to the page). */
export function actionForKey(key: string, modifiers: { ctrl?: boolean; alt?: boolean; meta?: boolean } = {}): PlayerAction | null {
  if (modifiers.ctrl || modifiers.alt || modifiers.meta) return null;
  switch (key) {
    case ' ':
    case 'k':
    case 'K':
      return { type: 'toggle' };
    case 'ArrowLeft':
      return { type: 'seekBy', seconds: -5 };
    case 'ArrowRight':
      return { type: 'seekBy', seconds: 5 };
    case 'j':
    case 'J':
      return { type: 'seekBy', seconds: -10 };
    case 'l':
    case 'L':
      return { type: 'seekBy', seconds: 10 };
    case 'ArrowUp':
      return { type: 'volumeBy', delta: 0.1 };
    case 'ArrowDown':
      return { type: 'volumeBy', delta: -0.1 };
    case 'm':
    case 'M':
      return { type: 'mute' };
    case 'f':
    case 'F':
      return { type: 'fullscreen' };
    case 'c':
    case 'C':
      return { type: 'captions' };
    case 'Home':
      return { type: 'seekToStart' };
    case 'End':
      return { type: 'seekToEnd' };
    case 'PageDown':
    case 'n':
    case 'N':
      return { type: 'chapter', delta: 1 };
    case 'PageUp':
    case 'p':
    case 'P':
      return { type: 'chapter', delta: -1 };
    default:
      return /^[0-9]$/.test(key) ? { type: 'seekToPercent', percent: Number(key) * 10 } : null;
  }
}

/** Where "next chapter" / "previous chapter" goes from `time` (null when there is nowhere to go). */
export function chapterTarget(chapters: LcVideoChapter[], time: number, delta: 1 | -1): number | null {
  if (chapters.length === 0) return null;
  const current = chapterIndexAt(chapters, time);
  if (delta === 1) return current + 1 < chapters.length ? chapters[current + 1].start : null;
  // "previous" first goes back to the start of the chapter you are in, then to the one before it
  const intoChapter = current >= 0 ? time - chapters[current].start : time;
  if (current >= 0 && intoChapter > 2) return chapters[current].start;
  return current > 0 ? chapters[current - 1].start : 0;
}

/** The six scenes of the standard lesson video, as the names of its chapters. */
export const STANDARD_CHAPTER_LABELS = ['The question', 'Meet the idea', 'How it works', 'See it in action', 'Remember this', 'Your turn'] as const;

/**
 * Chapter start times typed by an admin ("0, 8, 19, 43, 60, 69") → chapters named after the standard
 * scenes, in order. Empty text = no chapters. Times must start at 0, only go up and stay inside the video.
 */
export function parseChapterStarts(text: string, duration?: number): { chapters: LcVideoChapter[]; error: string | null } {
  const raw = text.trim();
  if (!raw) return { chapters: [], error: null };
  const parts = raw.split(/[\s,;]+/).filter(Boolean);
  if (parts.length > STANDARD_CHAPTER_LABELS.length) {
    return { chapters: [], error: `There are at most ${STANDARD_CHAPTER_LABELS.length} chapters (one per scene).` };
  }
  const starts = parts.map(Number);
  if (starts.some((n) => !Number.isFinite(n) || n < 0)) return { chapters: [], error: 'Chapter times are seconds, like 0, 8, 19.5.' };
  if (starts[0] !== 0) return { chapters: [], error: 'The first chapter must start at 0.' };
  for (let i = 1; i < starts.length; i++) {
    if (starts[i] <= starts[i - 1]) return { chapters: [], error: 'Chapter times must go up: each one later than the one before.' };
  }
  if (duration && duration > 0 && starts[starts.length - 1] >= duration) return { chapters: [], error: 'The last chapter starts after the video ends.' };
  return { chapters: starts.map((start, i) => ({ label: STANDARD_CHAPTER_LABELS[i], start: Math.round(start * 10) / 10 })), error: null };
}
