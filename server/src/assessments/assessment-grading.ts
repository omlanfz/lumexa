// FILE PATH: server/src/assessments/assessment-grading.ts
//
// Pure grading + report math, kept free of Prisma/Nest so every rule is unit
// tested in isolation (assessment-grading.spec.ts). Nothing here is a
// heuristic: one mark per objective question, coding marks are exactly the sum
// of the teacher's rubric marks, and totals/percentages are recomputed from
// those facts on every edit — never patched incrementally.

import { MARKS_PER_QUESTION } from './bank/bank.constants';

export type QuestionKind = 'MCQ' | 'TRUE_FALSE';

export interface QuestionOverride {
  /** What the teacher decided the question's correctness should be. */
  correct: boolean;
  note: string | null;
  at: string; // ISO timestamp
}

/** One question as it appears on a report card — a frozen snapshot of what the
 *  student saw (options/selected/correct are in DISPLAY order). */
export interface QuestionResult {
  questionId: string;
  order: number; // 1-based position in the test
  kind: QuestionKind;
  text: string;
  options: string[];
  selectedIndex: number | null;
  correctIndex: number;
  /** What the automatic grading decided. Never rewritten. */
  autoCorrect: boolean;
  explanation: string | null;
  /** A teacher's override of the automatic result, if any. */
  override: QuestionOverride | null;
}

export interface RubricCriterion {
  criterion: string;
  maxPoints: number;
  /** What the teacher looks for when marking this criterion. */
  lookFor?: string;
}

export interface RubricScore extends RubricCriterion {
  /** null = the teacher has not marked this criterion yet. */
  score: number | null;
}

export const round1 = (n: number) => Math.round(n * 10) / 10;
export const round2 = (n: number) => Math.round(n * 100) / 100;

export function isEffectivelyCorrect(r: QuestionResult): boolean {
  return r.override ? r.override.correct : r.autoCorrect;
}

export interface ObjectiveSummary {
  mcqTotal: number;
  trueFalseTotal: number;
  mcqCorrect: number;
  trueFalseCorrect: number;
  /** Marks after teacher overrides. */
  score: number;
  /** Marks from the automatic grading alone. */
  autoScore: number;
  max: number;
  /** How many questions a teacher changed. */
  overrides: number;
  unanswered: number;
}

export function summarizeObjective(
  results: QuestionResult[],
): ObjectiveSummary {
  let mcqTotal = 0;
  let trueFalseTotal = 0;
  let mcqCorrect = 0;
  let trueFalseCorrect = 0;
  let autoCorrectCount = 0;
  let overrides = 0;
  let unanswered = 0;
  for (const r of results) {
    const correct = isEffectivelyCorrect(r);
    if (r.kind === 'TRUE_FALSE') {
      trueFalseTotal++;
      if (correct) trueFalseCorrect++;
    } else {
      mcqTotal++;
      if (correct) mcqCorrect++;
    }
    if (r.autoCorrect) autoCorrectCount++;
    if (r.override) overrides++;
    if (r.selectedIndex === null) unanswered++;
  }
  return {
    mcqTotal,
    trueFalseTotal,
    mcqCorrect,
    trueFalseCorrect,
    score: (mcqCorrect + trueFalseCorrect) * MARKS_PER_QUESTION,
    autoScore: autoCorrectCount * MARKS_PER_QUESTION,
    max: results.length * MARKS_PER_QUESTION,
    overrides,
    unanswered,
  };
}

/** Marks for the coding project: the sum of the rubric, or null while any
 *  criterion is still unmarked (a partly-marked project has no total). */
export function sumRubric(
  scores: RubricScore[] | null | undefined,
): number | null {
  if (!scores || scores.length === 0) return null;
  let total = 0;
  for (const s of scores) {
    if (s.score === null || s.score === undefined) return null;
    total += s.score;
  }
  return round2(total);
}

export interface Totals {
  totalMax: number;
  /** null while the coding project is unmarked. */
  total: number | null;
  percentage: number | null;
  passed: boolean | null;
}

export function computeTotals(input: {
  objectiveScore: number;
  objectiveMax: number;
  /** null when the test has no coding project. */
  codingMax: number | null;
  codingScore: number | null;
  passScorePct: number;
}): Totals {
  const hasCoding = input.codingMax !== null;
  const totalMax = round2(
    input.objectiveMax + (hasCoding ? (input.codingMax as number) : 0),
  );
  if (hasCoding && input.codingScore === null) {
    return { totalMax, total: null, percentage: null, passed: null };
  }
  const total = round2(
    input.objectiveScore + (hasCoding ? (input.codingScore as number) : 0),
  );
  if (totalMax <= 0) return { totalMax, total, percentage: 0, passed: false };
  const ratio = (total / totalMax) * 100;
  return {
    totalMax,
    total,
    percentage: round1(ratio),
    // Compare the unrounded ratio so 59.96% never "rounds up" into a pass.
    passed: ratio >= input.passScorePct,
  };
}

export class ReportValidationError extends Error {}

/** Merges the teacher's incoming marks into the report's rubric. Unknown
 *  criteria, duplicates, negative marks and marks above a criterion's maximum
 *  are rejected; criteria not mentioned keep their existing mark. */
export function applyRubricScores(
  current: RubricScore[],
  incoming: { criterion: string; score: number | null }[],
): RubricScore[] {
  const byName = new Map(current.map((c) => [c.criterion, { ...c }]));
  const seen = new Set<string>();
  for (const inc of incoming) {
    const target = byName.get(inc.criterion);
    if (!target)
      throw new ReportValidationError(
        `Unknown rubric criterion "${inc.criterion}".`,
      );
    if (seen.has(inc.criterion))
      throw new ReportValidationError(
        `Criterion "${inc.criterion}" was given twice.`,
      );
    seen.add(inc.criterion);
    if (inc.score === null) {
      target.score = null;
      continue;
    }
    if (!Number.isFinite(inc.score) || inc.score < 0) {
      throw new ReportValidationError(
        `"${inc.criterion}" needs a mark of 0 or more.`,
      );
    }
    if (inc.score > target.maxPoints) {
      throw new ReportValidationError(
        `"${inc.criterion}" is out of ${target.maxPoints} — ${inc.score} is too high.`,
      );
    }
    target.score = round2(inc.score);
  }
  return current.map((c) => byName.get(c.criterion) as RubricScore);
}

/** Applies a teacher's per-question overrides. `correct: null` removes an
 *  override (back to the automatic result). Only overrides that actually
 *  differ from the automatic result are kept, so an edit that changes nothing
 *  is never recorded as a teacher override. */
export function applyQuestionOverrides(
  results: QuestionResult[],
  incoming: {
    questionId: string;
    correct: boolean | null;
    note?: string | null;
  }[],
  nowIso: string,
): QuestionResult[] {
  const byId = new Map(results.map((r) => [r.questionId, r]));
  for (const inc of incoming) {
    if (!byId.has(inc.questionId))
      throw new ReportValidationError(
        'That question is not part of this report.',
      );
  }
  const patch = new Map(incoming.map((i) => [i.questionId, i]));
  return results.map((r) => {
    const inc = patch.get(r.questionId);
    if (!inc) return r;
    // An "override" that agrees with the automatic result changes nothing, so
    // it is dropped rather than stored.
    if (inc.correct === null || inc.correct === r.autoCorrect)
      return { ...r, override: null };
    return {
      ...r,
      override: {
        correct: inc.correct,
        note: inc.note?.trim() ? inc.note.trim() : null,
        at: nowIso,
      },
    };
  });
}
