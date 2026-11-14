// FILE PATH: client/lib/assessment/structured.ts
//
// The structured assessment (Pre-University CSE): Part A 10 multiple choice x 1 mark, Part B 3 short
// answers x 5 marks, Part C one practical x 20 marks = 45 marks in at most 40 minutes. The numbers
// mirror server/src/structured-assessments/structured.constants.ts (the ONE definition); a test reads
// that file and fails if the two ever differ.
//
// The countdown works like the stopwatch of the other tests (see clock.ts): the SERVER froze the
// deadline when the attempt started and sends its own clock with every response, so a computer that
// is minutes fast or slow still shows the right time left. Pure functions, no DOM.

export const STRUCTURED_SHAPE = {
  mcq: { count: 10, marksEach: 1 },
  shortAnswer: { count: 3, marksEach: 5 },
  practical: { count: 1, marksEach: 20 },
} as const;

export const STRUCTURED_MARKS = {
  partA: 10,
  partB: 15,
  partC: 20,
  total: 45,
} as const;

export const STRUCTURED_TIME_LIMIT_MINUTES = 40;

/** The server still accepts a save or a hand-in this long after the deadline (not extra time). */
export const STRUCTURED_GRACE_SECONDS = 30;

/** Suggested split of the 40 minutes: guidance for the student, not enforced. */
export const STRUCTURED_SUGGESTED_MINUTES = { partA: 10, partB: 12, partC: 15, review: 3 } as const;

export const STRUCTURED_MAX_ANSWER_LENGTH = 6000;

export function isStructured(format: string | null | undefined): boolean {
  return format === 'STRUCTURED_V1';
}

/** Milliseconds until the deadline (corrected by `offsetMs`); 0 once it has passed; null when there is no deadline. */
export function remainingMs(deadlineAt: string | null | undefined, now: number, offsetMs: number): number | null {
  if (!deadlineAt) return null;
  const deadline = Date.parse(deadlineAt);
  if (Number.isNaN(deadline)) return null;
  return Math.max(0, deadline - (now + offsetMs));
}

/** "39:58", or "1:05:00" for an hour or more. Rounds UP so that 00:00 shows only when time is really up. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const two = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${two(m)}:${two(s)}` : `${two(m)}:${two(s)}`;
}

export type CountdownTone = 'ok' | 'warn' | 'danger';

/** Calm until 5 minutes are left, then a warning, then red for the last minute. */
export function countdownTone(ms: number): CountdownTone {
  if (ms <= 60_000) return 'danger';
  if (ms <= 5 * 60_000) return 'warn';
  return 'ok';
}

/** The moments at which the student is told how much time is left (minutes), largest first. */
export const COUNTDOWN_ALERTS_MINUTES = [10, 5, 1] as const;

/** The alert (in minutes) that has just been crossed between two readings, or null. */
export function crossedAlert(previousMs: number | null, currentMs: number | null): number | null {
  if (previousMs === null || currentMs === null) return null;
  for (const minutes of COUNTDOWN_ALERTS_MINUTES) {
    const limit = minutes * 60_000;
    if (previousMs > limit && currentMs <= limit) return minutes;
  }
  return null;
}

export function wordCount(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export interface StructuredProgress {
  partA: { answered: number; total: number };
  partB: { answered: number; total: number };
  partC: { started: boolean };
  /** Everything a student could still add before handing in. */
  unfinished: string[];
}

/** What is done and what is missing, in words for the hand-in screen. */
export function structuredProgress(input: {
  mcqAnswered: number;
  mcqTotal: number;
  shortAnswers: string[];
  codeStarted: boolean;
}): StructuredProgress {
  const answeredB = input.shortAnswers.filter((a) => a.trim().length > 0).length;
  const unfinished: string[] = [];
  const blankA = input.mcqTotal - input.mcqAnswered;
  if (blankA > 0) unfinished.push(`${blankA} multiple-choice question${blankA === 1 ? '' : 's'} in Part A`);
  const blankB = input.shortAnswers.length - answeredB;
  if (blankB > 0) unfinished.push(`${blankB} short answer${blankB === 1 ? '' : 's'} in Part B`);
  if (!input.codeStarted) unfinished.push('the practical in Part C');
  return {
    partA: { answered: input.mcqAnswered, total: input.mcqTotal },
    partB: { answered: answeredB, total: input.shortAnswers.length },
    partC: { started: input.codeStarted },
    unfinished,
  };
}

// ── Where each task sits on the screen ──────────────────────────────────────

/** The screens of the test in order: Part A questions, Part B answers, the practical, then the hand-in. */
export interface StructuredLayout {
  mcq: number;
  short: number;
  practical: boolean;
  /** Step of the first Part B answer. */
  shortStart: number;
  /** Step of the practical, or -1 when the test has none. */
  practicalStep: number;
  /** Step of the hand-in screen: the last one. */
  reviewStep: number;
}

export function structuredLayout(mcq: number, short: number, practical: boolean): StructuredLayout {
  const shortStart = mcq;
  const practicalStep = practical ? mcq + short : -1;
  return { mcq, short, practical, shortStart, practicalStep, reviewStep: mcq + short + (practical ? 1 : 0) };
}

export type StepKind = { kind: 'mcq'; index: number } | { kind: 'short'; index: number } | { kind: 'practical' } | { kind: 'review' };

export function stepKind(layout: StructuredLayout, step: number): StepKind {
  if (step < layout.mcq) return { kind: 'mcq', index: step };
  if (step < layout.shortStart + layout.short) return { kind: 'short', index: step - layout.shortStart };
  if (layout.practical && step === layout.practicalStep) return { kind: 'practical' };
  return { kind: 'review' };
}

/** The part (A, B or C) a step belongs to, or null for the hand-in screen. */
export function stepPart(layout: StructuredLayout, step: number): 'A' | 'B' | 'C' | null {
  const k = stepKind(layout, step).kind;
  return k === 'mcq' ? 'A' : k === 'short' ? 'B' : k === 'practical' ? 'C' : null;
}

/**
 * Coming back to a test in progress (a refresh, a dropped connection): the first thing that is still open —
 * a blank Part A question, then a blank Part B answer, then the practical — or the hand-in screen when
 * everything has been started. A student who has answered nothing starts at question 1.
 */
export function resumeStep(
  layout: StructuredLayout,
  state: { mcqAnswered: boolean[]; shortWritten: boolean[]; codeStarted: boolean },
): number {
  const anything = state.mcqAnswered.some(Boolean) || state.shortWritten.some(Boolean) || state.codeStarted;
  if (!anything) return 0;
  const a = state.mcqAnswered.findIndex((x) => !x);
  if (a !== -1) return a;
  const b = state.shortWritten.findIndex((x) => !x);
  if (b !== -1) return layout.shortStart + b;
  if (layout.practical && !state.codeStarted) return layout.practicalStep;
  return layout.reviewStep;
}

/**
 * True once the deadline and the server's grace have passed, i.e. the server will no longer accept anything and
 * is about to hand the attempt in by itself. `offsetMs` is the server clock minus this computer's clock.
 */
export function pastGrace(deadlineAt: string | null | undefined, now: number, offsetMs: number, graceSeconds: number = STRUCTURED_GRACE_SECONDS): boolean {
  if (!deadlineAt) return false;
  const deadline = Date.parse(deadlineAt);
  if (Number.isNaN(deadline)) return false;
  return now + offsetMs > deadline + graceSeconds * 1000;
}

/**
 * True when the work was handed in at the deadline rather than by the student pressing the button: the browser
 * hands in at 00:00 and the server's sweeper a little later, so a hand-in at or after the deadline (give or take
 * a second of clock difference) means "time was up".
 */
export function handedInAtDeadline(submittedAt: string | null | undefined, deadlineAt: string | null | undefined): boolean {
  if (!submittedAt || !deadlineAt) return false;
  const submitted = Date.parse(submittedAt);
  const deadline = Date.parse(deadlineAt);
  if (Number.isNaN(submitted) || Number.isNaN(deadline)) return false;
  return submitted >= deadline - 1500;
}
