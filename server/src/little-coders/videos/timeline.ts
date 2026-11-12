// The timeline of a lesson preview video, computed from how long each narrated sentence really
// takes. The standard storyboard has six scenes (hook, introduce, explain, demonstrate, remember,
// your turn); a scene lasts as long as its narration needs, but never less than the time its
// animation needs, so nothing is rushed to fit a duration.

import type { LcLessonSpec } from '../lc.types';
import { lessonKey, narrationFor, type NarrationSentence } from './narration';

export const VIDEO_FPS = 24;
export const VIDEO_WIDTH = 1920;
export const VIDEO_HEIGHT = 1080;

/** Standard limits: aim for 60–100 seconds, never more than 120. */
export const TARGET_MIN_SECONDS = 60;
export const TARGET_MAX_SECONDS = 100;
export const HARD_MAX_SECONDS = 120;

/** Hook, introduce, explain, demonstrate, remember, your turn. */
export const SCENE_COUNT = 6;
const MIN_SECONDS = [7.5, 11, 24, 17, 9.5, 11];
/** Silence before the first sentence of a scene (its entrance animation). */
const LEAD_SECONDS = [0.5, 0.9, 0.6, 0.8, 0.6, 0.6];
/** Breathing room after the last sentence; the closing scene holds the Lumexa end card. */
const TAIL_SECONDS = [0.7, 0.8, 1.0, 0.8, 1.0, 3.4];
const SENTENCE_GAP_SECONDS = 0.3;

export interface SceneTiming {
  index: number;
  start: number;
  end: number;
  beat: string;
  onScreen: string;
}

export interface Cue {
  id: string;
  scene: number;
  index: number;
  start: number;
  end: number;
  text: string;
}

export interface Timeline {
  key: string;
  duration: number;
  scenes: SceneTiming[];
  cues: Cue[];
  /** Spoken seconds / words, for the production record. */
  narrationSeconds: number;
  narrationWords: number;
  warnings: string[];
}

export function buildTimeline(
  spec: LcLessonSpec,
  durations: Record<string, number>,
): Timeline {
  const key = lessonKey(spec);
  const sentences = narrationFor(spec);
  const warnings: string[] = [];
  const bySceneIndex = (i: number): NarrationSentence[] =>
    sentences.filter((s) => s.scene === i);

  const lengths = spec.video.scenes.map((_, i) => {
    const mine = bySceneIndex(i);
    const spoken = mine.reduce((sum, s) => {
      const d = durations[s.id];
      if (d === undefined)
        throw new Error(
          `No narration audio for ${s.id} — run the narration step first.`,
        );
      return sum + d;
    }, 0);
    const need =
      LEAD_SECONDS[i] +
      spoken +
      Math.max(0, mine.length - 1) * SENTENCE_GAP_SECONDS +
      TAIL_SECONDS[i];
    return Math.max(MIN_SECONDS[i], need);
  });

  // A video that came out shorter than the target gives the explanation and the demonstration
  // more room (they are the scenes that benefit from time), never the narration more pauses.
  const total = lengths.reduce((a, b) => a + b, 0);
  if (total < TARGET_MIN_SECONDS + 2) {
    const extra = TARGET_MIN_SECONDS + 2 - total;
    lengths[2] += extra * 0.5;
    lengths[3] += extra * 0.5;
  }

  const scenes: SceneTiming[] = [];
  const cues: Cue[] = [];
  let cursor = 0;
  lengths.forEach((len, i) => {
    const brief = spec.video.scenes[i];
    scenes.push({
      index: i,
      start: cursor,
      end: cursor + len,
      beat: brief.beat,
      onScreen: brief.onScreen,
    });
    let at = cursor + LEAD_SECONDS[i];
    for (const s of bySceneIndex(i)) {
      const d = durations[s.id];
      cues.push({
        id: s.id,
        scene: i,
        index: s.index,
        start: round(at),
        end: round(at + d),
        text: s.text,
      });
      at += d + SENTENCE_GAP_SECONDS;
    }
    cursor += len;
  });

  const duration = round(cursor);
  if (duration > HARD_MAX_SECONDS)
    warnings.push(
      `${key}: ${duration}s is over the ${HARD_MAX_SECONDS}s maximum`,
    );
  else if (duration > TARGET_MAX_SECONDS)
    warnings.push(
      `${key}: ${duration}s is over the ${TARGET_MAX_SECONDS}s target`,
    );
  else if (duration < TARGET_MIN_SECONDS)
    warnings.push(
      `${key}: ${duration}s is under the ${TARGET_MIN_SECONDS}s target`,
    );

  return {
    key,
    duration,
    scenes: scenes.map((s) => ({
      ...s,
      start: round(s.start),
      end: round(s.end),
    })),
    cues,
    narrationSeconds: round(
      cues.reduce((sum, c) => sum + (c.end - c.start), 0),
    ),
    narrationWords: sentences.reduce(
      (sum, s) => sum + s.text.split(/\s+/).filter(Boolean).length,
      0,
    ),
    warnings,
  };
}

const round = (n: number) => Math.round(n * 1000) / 1000;

/** "0:07" / "1:32". */
export function clock(seconds: number): string {
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** WebVTT subtitles for a timeline. */
export function toWebVtt(cues: Pick<Cue, 'start' | 'end' | 'text'>[]): string {
  const stamp = (t: number) => {
    const ms = Math.round(t * 1000);
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    const s = Math.floor((ms % 60_000) / 1000);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}`;
  };
  return (
    'WEBVTT\n\n' +
    cues
      .map(
        (c, i) =>
          `${i + 1}\n${stamp(c.start)} --> ${stamp(c.end)}\n${c.text}\n`,
      )
      .join('\n')
  );
}
