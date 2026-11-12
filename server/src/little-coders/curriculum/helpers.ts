// FILE PATH: server/src/little-coders/curriculum/helpers.ts
//
// Small builders that keep the 40 authored lessons short and uniform. They add no
// content of their own — every sentence a child reads is written in the course files.

import type {
  LcAiClass,
  LcConcept,
  LcStack,
  LcTip,
  LcVideoBrief,
  LcVideoScene,
} from '../lc.types';

/** A Scratch / Stretch3 block script. */
export function sc(
  id: string,
  title: string,
  lines: string[],
  extra: { intro?: string; sprite?: string; notes?: Record<string, string> } = {},
): LcStack {
  return { id, title, language: 'scratch', lines, ...extra };
}

/** An EduBlocks (Python) block script. */
export function py(
  id: string,
  title: string,
  lines: string[],
  extra: { intro?: string; notes?: Record<string, string> } = {},
): LcStack {
  return { id, title, language: 'edublocks', lines, ...extra };
}

export const concept = (emoji: string, title: string, text: string, reveal: string): LcConcept => ({
  emoji,
  title,
  text,
  reveal,
});

export const tip = (title: string, text: string): LcTip => ({ kind: 'tip', title, text });

export const mistake = (title: string, text: string, fix: string): LcTip => ({
  kind: 'mistake',
  title,
  text,
  fix,
});

export const aiClass = (name: string, emoji: string, collect: string, minExamples = 20): LcAiClass => ({
  name,
  emoji,
  collect,
  minExamples,
});

type Beat = [visual: string, narration: string, onScreen: string];

/** The reusable 90-second storyboard (0:00–1:30). */
const TIMINGS: { key: keyof Beats; time: string; beat: string }[] = [
  { key: 'hook', time: '0:00–0:08', beat: 'Hook' },
  { key: 'concept', time: '0:08–0:20', beat: 'Introduce the concept' },
  { key: 'explain', time: '0:20–0:50', beat: 'Explain with animated visuals' },
  { key: 'demo', time: '0:50–1:10', beat: 'Practical example' },
  { key: 'tip', time: '1:10–1:20', beat: 'Tip or common mistake' },
  { key: 'challenge', time: '1:20–1:30', beat: 'Mini challenge and closing' },
];

interface Beats {
  hook: Beat;
  concept: Beat;
  explain: Beat;
  demo: Beat;
  tip: Beat;
  challenge: Beat;
}

/**
 * One lesson's "Your Learning Preview" production brief on the standard storyboard.
 * `curiosity` is what the opening must make a child wonder about; `leadsInto` is the
 * project the video hands over to — it never shows the finished solution.
 */
export function vid(title: string, curiosity: string, leadsInto: string, beats: Beats): LcVideoBrief {
  const scenes: LcVideoScene[] = TIMINGS.map((t) => {
    const [visual, narration, onScreen] = beats[t.key];
    return { time: t.time, beat: t.beat, visual, narration, onScreen };
  });
  return {
    title,
    hook: curiosity,
    targetSeconds: 90,
    scenes,
    tip: beats.tip[1],
    challenge: beats.challenge[1],
    leadsInto,
  };
}
