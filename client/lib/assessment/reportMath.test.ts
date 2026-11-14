import test from 'node:test';
import assert from 'node:assert/strict';
import { objectivePreview, rubricTotal, shortAnswersPreview, totalsPreview, validateMark, type PreviewQuestion } from './reportMath.ts';

// The SAME vectors are asserted server-side in assessment-grading.spec.ts.

const build = (mcqCorrect: number, mcqTotal: number, tfCorrect: number, tfTotal: number): PreviewQuestion[] => [
  ...Array.from({ length: mcqTotal }, (_, i) => ({ kind: 'MCQ' as const, autoCorrect: i < mcqCorrect, override: null })),
  ...Array.from({ length: tfTotal }, (_, i) => ({ kind: 'TRUE_FALSE' as const, autoCorrect: i < tfCorrect, override: null })),
];

test('course test: 27/30 MCQ + 9/10 T/F = 36/40 = 90%', () => {
  const o = objectivePreview(build(27, 30, 9, 10));
  assert.deepEqual([o.mcqCorrect, o.tfCorrect, o.score, o.max], [27, 9, 36, 40]);
  const t = totalsPreview({ objectiveScore: o.score, objectiveMax: o.max, codingMax: null, codingScore: null, passScorePct: 60 });
  assert.deepEqual(t, { totalMax: 40, total: 36, percentage: 90, passed: true });
});

test('final test: coding unmarked → no total/percentage/pass yet', () => {
  const t = totalsPreview({ objectiveScore: 24, objectiveMax: 30, codingMax: 20, codingScore: null, passScorePct: 60 });
  assert.deepEqual(t, { totalMax: 50, total: null, percentage: null, passed: null });
});

test('final test: 24/30 + 15/20 = 39/50 = 78%', () => {
  const t = totalsPreview({ objectiveScore: 24, objectiveMax: 30, codingMax: 20, codingScore: 15, passScorePct: 60 });
  assert.deepEqual(t, { totalMax: 50, total: 39, percentage: 78, passed: true });
});

test('59.96% displays as 60 but is NOT a pass — the unrounded ratio decides', () => {
  const t = totalsPreview({ objectiveScore: 20, objectiveMax: 30, codingMax: 20, codingScore: 9.98, passScorePct: 60 });
  assert.equal(t.total, 29.98);
  assert.equal(t.percentage, 60);
  assert.equal(t.passed, false);
});

test('a teacher override changes the result and is counted, the auto score stays', () => {
  const qs = build(1, 2, 0, 0);
  qs[1] = { kind: 'MCQ', autoCorrect: false, override: { correct: true } }; // teacher accepts an answer
  qs[0] = { kind: 'MCQ', autoCorrect: true, override: { correct: false } }; // teacher rejects one
  const o = objectivePreview(qs);
  assert.equal(o.score, 1);
  assert.equal(o.autoScore, 1);
  assert.equal(o.overrides, 2);
});

test('rubricTotal is null until every criterion is marked', () => {
  assert.equal(rubricTotal([]), null);
  assert.equal(rubricTotal([{ criterion: 'a', maxPoints: 5, score: 4 }, { criterion: 'b', maxPoints: 5, score: null }]), null);
  assert.equal(rubricTotal([{ criterion: 'a', maxPoints: 8, score: 6.5 }, { criterion: 'b', maxPoints: 12, score: 11 }]), 17.5);
});

test('validateMark', () => {
  assert.equal(validateMark('', 5), null);
  assert.equal(validateMark('4', 5), null);
  assert.equal(validateMark('5', 5), null);
  assert.equal(validateMark('5.5', 5), 'Out of 5.');
  assert.equal(validateMark('-1', 5), 'Cannot be negative.');
  assert.equal(validateMark('abc', 5), 'Enter a number.');
  assert.equal(validateMark('1.234', 5), 'Use at most 2 decimals.');
});

// Structured assessments (Pre-University CSE): the SAME vectors are asserted server-side in
// structured.grading.spec.ts — 10 + 15 + 20 = 45 marks.
test('structured: 8/10 + 12/15 + 15/20 = 35/45 = 77.8%', () => {
  const t = totalsPreview({ objectiveScore: 8, objectiveMax: 10, shortMax: 15, shortScore: 12, codingMax: 20, codingScore: 15, passScorePct: 40 });
  assert.deepEqual(t, { totalMax: 45, total: 35, percentage: 77.8, passed: true });
});

test('structured: no total while Part B or Part C is unmarked, but the maximum is still 45', () => {
  const noB = totalsPreview({ objectiveScore: 8, objectiveMax: 10, shortMax: 15, shortScore: null, codingMax: 20, codingScore: 15, passScorePct: 40 });
  assert.deepEqual(noB, { totalMax: 45, total: null, percentage: null, passed: null });
  const noC = totalsPreview({ objectiveScore: 8, objectiveMax: 10, shortMax: 15, shortScore: 12, codingMax: 20, codingScore: null, passScorePct: 40 });
  assert.deepEqual(noC, { totalMax: 45, total: null, percentage: null, passed: null });
});

test('a test without short answers is unchanged by the new fields', () => {
  assert.deepEqual(totalsPreview({ objectiveScore: 7, objectiveMax: 10, codingMax: null, codingScore: null, passScorePct: 60 }), { totalMax: 10, total: 7, percentage: 70, passed: true });
  assert.deepEqual(totalsPreview({ objectiveScore: 7, objectiveMax: 10, codingMax: null, codingScore: null, passScorePct: 60, shortMax: null, shortScore: null }), { totalMax: 10, total: 7, percentage: 70, passed: true });
});

test('Part B adds the criteria of each answer and is null until all are marked', () => {
  const answer = (marks: (number | null)[], maxes: number[]) => ({ rubric: marks.map((score, i) => ({ criterion: `c${i}`, maxPoints: maxes[i], score })) });
  const done = shortAnswersPreview([answer([2, 2, 1], [2, 2, 1]), answer([3, 1.5], [3, 2]), answer([2, 2, 1], [2, 2, 1])]);
  assert.deepEqual(done, { perItem: [5, 4.5, 5], total: 14.5, max: 15 });
  const partial = shortAnswersPreview([answer([2, 2, 1], [2, 2, 1]), answer([3, null], [3, 2]), answer([2, 2, 1], [2, 2, 1])]);
  assert.deepEqual(partial, { perItem: [5, null, 5], total: null, max: 15 });
  assert.deepEqual(shortAnswersPreview([]), { perItem: [], total: null, max: 0 });
});
