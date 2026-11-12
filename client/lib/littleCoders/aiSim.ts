// FILE PATH: client/lib/littleCoders/aiSim.ts
//
// The "practice" AI of the lesson demos. It is NOT a real model and the page says so: nothing here
// uses a webcam or a microphone. It only lets a child see the ideas the lesson teaches — a model
// learns from EXAMPLES, more varied examples make it more confident, and an example it never saw
// (a different angle, light or voice) is harder — before they train a real model in class with their
// own webcam / microphone on the Generation AI Teachable Machine.

export type Condition = string;

export interface SimModel {
  names: string[];
  /** How many examples each class has been shown. */
  counts: number[];
  /** Which conditions (close / far / dim …) each class has examples for. */
  covered: Condition[][];
}

export const IMAGE_CONDITIONS: { key: Condition; label: string; emoji: string }[] = [
  { key: 'close', label: 'Close up', emoji: '🔍' },
  { key: 'far', label: 'Far away', emoji: '🔭' },
  { key: 'bright', label: 'Bright light', emoji: '☀️' },
  { key: 'dim', label: 'Dim light', emoji: '🌙' },
  { key: 'tilted', label: 'Tilted', emoji: '↗️' },
];

export const VOICE_CONDITIONS: { key: Condition; label: string; emoji: string }[] = [
  { key: 'normal', label: 'Normal voice', emoji: '🙂' },
  { key: 'quiet', label: 'Quiet voice', emoji: '🤫' },
  { key: 'loud', label: 'Loud voice', emoji: '📢' },
  { key: 'fast', label: 'Fast', emoji: '⚡' },
  { key: 'noisy', label: 'Noisy room', emoji: '🔊' },
];

export function newModel(names: string[]): SimModel {
  return { names: [...names], counts: names.map(() => 0), covered: names.map(() => []) };
}

/** A new model with one more example of `classIndex` made under `condition`. */
export function addExample(m: SimModel, classIndex: number, condition: Condition, times = 1): SimModel {
  if (classIndex < 0 || classIndex >= m.names.length) return m;
  return {
    names: m.names,
    counts: m.counts.map((n, i) => (i === classIndex ? n + times : n)),
    covered: m.covered.map((c, i) => (i === classIndex && !c.includes(condition) ? [...c, condition] : c)),
  };
}

export const totalExamples = (m: SimModel) => m.counts.reduce((a, b) => a + b, 0);

/** The classes that still need examples before the model can be trained (at least `min` each). */
export function missingExamples(m: SimModel, min: number): { name: string; need: number }[] {
  return m.names.map((name, i) => ({ name, need: Math.max(0, min - m.counts[i]) })).filter((x) => x.need > 0);
}

export const isTrainable = (m: SimModel, min: number) => missingExamples(m, min).length === 0;

/**
 * What the practice model "thinks" it is looking at / hearing: one probability per class, summing
 * to 1. Confidence in the right class grows with the number of examples and shrinks when the
 * condition was never shown for that class; with no examples at all every class is equally likely.
 */
export function predict(m: SimModel, actualClass: number, condition: Condition): number[] {
  const k = m.names.length;
  if (k === 0) return [];
  const have = m.counts[actualClass] ?? 0;
  const strength = have === 0 ? 0 : 1 - Math.exp(-have / 6);
  const seen = (m.covered[actualClass] ?? []).includes(condition) ? 1 : Math.min(0.55, 0.2 + 0.12 * (m.covered[actualClass]?.length ?? 0));
  const confidence = Math.min(0.98, strength * seen);
  const base = 1 / k;
  const right = base + (1 - base) * confidence;
  const rest = (1 - right) / Math.max(1, k - 1);
  return m.names.map((_, i) => (i === actualClass ? right : rest));
}

/** The class with the highest probability. */
export function best(probabilities: number[]): number {
  let at = 0;
  probabilities.forEach((p, i) => {
    if (p > probabilities[at]) at = i;
  });
  return at;
}

export const percent = (p: number) => `${Math.round(p * 100)}%`;
