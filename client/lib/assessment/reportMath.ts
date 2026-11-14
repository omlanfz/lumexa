// FILE PATH: client/lib/assessment/reportMath.ts
//
// Live PREVIEW of a report card's numbers while a teacher edits it. The server
// (server/src/assessments/assessment-grading.ts) is the source of truth and
// recomputes everything on save — this mirrors its rules so the screen can
// show the effect of an edit immediately. Both sides share the same test cases
// (reportMath.test.ts / assessment-grading.spec.ts) so they cannot drift.

export interface PreviewQuestion {
  kind: 'MCQ' | 'TRUE_FALSE';
  autoCorrect: boolean;
  override: { correct: boolean } | null;
}

export interface PreviewRubric {
  criterion: string;
  maxPoints: number;
  score: number | null;
}

export const round1 = (n: number) => Math.round(n * 10) / 10;
export const round2 = (n: number) => Math.round(n * 100) / 100;

export function isCorrect(q: PreviewQuestion): boolean {
  return q.override ? q.override.correct : q.autoCorrect;
}

export function objectivePreview(questions: PreviewQuestion[]) {
  let mcqCorrect = 0;
  let tfCorrect = 0;
  let mcqTotal = 0;
  let tfTotal = 0;
  let auto = 0;
  let overrides = 0;
  for (const q of questions) {
    if (q.kind === 'TRUE_FALSE') tfTotal++;
    else mcqTotal++;
    if (isCorrect(q)) {
      if (q.kind === 'TRUE_FALSE') tfCorrect++;
      else mcqCorrect++;
    }
    if (q.autoCorrect) auto++;
    if (q.override) overrides++;
  }
  return { mcqCorrect, tfCorrect, mcqTotal, tfTotal, score: mcqCorrect + tfCorrect, autoScore: auto, max: questions.length, overrides };
}

/** Sum of the rubric marks, or null while any criterion is unmarked. */
export function rubricTotal(rubric: PreviewRubric[]): number | null {
  if (rubric.length === 0) return null;
  let t = 0;
  for (const r of rubric) {
    if (r.score === null) return null;
    t += r.score;
  }
  return round2(t);
}

export function totalsPreview(input: {
  objectiveScore: number;
  objectiveMax: number;
  codingMax: number | null;
  codingScore: number | null;
  passScorePct: number;
  /** Structured assessments (Part B): the written answers' marks, null for every other test. */
  shortMax?: number | null;
  shortScore?: number | null;
}) {
  const hasCoding = input.codingMax !== null;
  const hasShort = input.shortMax !== null && input.shortMax !== undefined;
  const totalMax = round2(input.objectiveMax + (hasShort ? (input.shortMax as number) : 0) + (hasCoding ? (input.codingMax as number) : 0));
  // No total while a part that the teacher marks by hand is still unmarked.
  if ((hasCoding && input.codingScore === null) || (hasShort && (input.shortScore === null || input.shortScore === undefined))) {
    return { totalMax, total: null as number | null, percentage: null as number | null, passed: null as boolean | null };
  }
  const total = round2(input.objectiveScore + (hasShort ? (input.shortScore as number) : 0) + (hasCoding ? (input.codingScore as number) : 0));
  if (totalMax <= 0) return { totalMax, total, percentage: 0, passed: false };
  const ratio = (total / totalMax) * 100;
  return { totalMax, total, percentage: round1(ratio), passed: ratio >= input.passScorePct };
}

/**
 * Part B of a structured assessment while the teacher marks it: the subtotal of every written answer (null
 * until each of its criteria is marked) and the total of Part B (null until every answer is fully marked).
 */
export function shortAnswersPreview(items: { rubric: PreviewRubric[] }[]): { perItem: (number | null)[]; total: number | null; max: number } {
  const perItem = items.map((item) => rubricTotal(item.rubric));
  const max = round2(items.reduce((sum, item) => sum + item.rubric.reduce((n, r) => n + r.maxPoints, 0), 0));
  if (items.length === 0 || perItem.some((v) => v === null)) return { perItem, total: null, max };
  return { perItem, total: round2((perItem as number[]).reduce((a, b) => a + b, 0)), max };
}

/** Is a typed mark acceptable for a criterion? Returns an error message or null. */
export function validateMark(value: string, maxPoints: number): string | null {
  if (value.trim() === '') return null; // blank = not marked yet
  const n = Number(value);
  if (!Number.isFinite(n)) return 'Enter a number.';
  if (n < 0) return 'Cannot be negative.';
  if (n > maxPoints) return `Out of ${maxPoints}.`;
  if (Math.round(n * 100) / 100 !== n) return 'Use at most 2 decimals.';
  return null;
}
