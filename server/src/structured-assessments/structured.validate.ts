// FILE PATH: server/src/structured-assessments/structured.validate.ts
//
// The quality gate every structured bank passes before it can reach a student: exactly 10 / 3 / 1
// questions, 10 + 15 + 20 = 45 marks, rubrics that add up, balanced answer positions, no banned
// "setup / installation" topics, and no question repeated anywhere in the program. Used by the bank
// test suite (every run), by the sync (a bad bank never overwrites a good one) and by the admin page.

import { BANNED_TOPIC_PATTERNS } from '../assessments/bank/bank.validate';
import { balancedPositions } from '../assessments/bank/bank.materialize';
import type { BankRubricCriterion } from '../assessments/bank/bank.types';
import { STRUCTURED_MARKS, STRUCTURED_SHAPE } from './structured.constants';
import type { StructuredBank } from './structured.types';

export interface StructuredProblem {
  bankId: string;
  where: string;
  message: string;
}

const VAGUE_OPTION =
  /^(?:all|none|both)\s+of\s+the\s+(?:above|below)\b|^(?:a|b|c|d)\s+(?:and|&)\s+(?:a|b|c|d)$|^option\s+[a-d]\b/i;

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

function rubricProblems(
  where: string,
  rubric: BankRubricCriterion[],
  expectedTotal: number,
  min: number,
  max: number,
  add: (where: string, message: string) => void,
) {
  if (rubric.length < min || rubric.length > max) add(where, `rubric should have ${min}–${max} criteria, found ${rubric.length}`);
  const total = rubric.reduce((sum, r) => sum + r.maxPoints, 0);
  if (total !== expectedTotal) add(where, `rubric must total ${expectedTotal} marks, found ${total}`);
  const names = new Set<string>();
  for (const r of rubric) {
    if (!r.criterion.trim()) add(where, 'a rubric criterion has no name');
    if (names.has(norm(r.criterion))) add(where, `duplicate rubric criterion "${r.criterion}"`);
    names.add(norm(r.criterion));
    if (!Number.isInteger(r.maxPoints) || r.maxPoints <= 0)
      add(where, `criterion "${r.criterion}" needs a positive whole-number maximum`);
    if (r.lookFor.trim().length < 20) add(where, `criterion "${r.criterion}" needs a "look for" guide (≥ 20 characters)`);
  }
}

export function validateStructuredBank(bank: StructuredBank): StructuredProblem[] {
  const problems: StructuredProblem[] = [];
  const add = (where: string, message: string) => problems.push({ bankId: bank.id, where, message });
  const scan = (where: string, text: string) => {
    for (const { name, re } of BANNED_TOPIC_PATTERNS) {
      if (re.test(text)) add(where, `looks like a ${name} question — test understanding instead`);
    }
  };

  // ── Shape: 10 + 3 + 1 ──
  if (bank.mcq.length !== STRUCTURED_SHAPE.mcq.count)
    add('bank', `Part A needs exactly ${STRUCTURED_SHAPE.mcq.count} multiple-choice questions, found ${bank.mcq.length}`);
  if (bank.shortAnswers.length !== STRUCTURED_SHAPE.shortAnswer.count)
    add('bank', `Part B needs exactly ${STRUCTURED_SHAPE.shortAnswer.count} short-answer questions, found ${bank.shortAnswers.length}`);
  if (!bank.practical) {
    add('bank', 'Part C needs exactly one practical problem');
    return problems;
  }

  // ── Marks: 10 + 15 + 20 = 45 ──
  const partA = bank.mcq.length * STRUCTURED_SHAPE.mcq.marksEach;
  const partB = bank.shortAnswers.reduce((s, q) => s + q.maxScore, 0);
  const partC = bank.practical.maxScore;
  if (partA !== STRUCTURED_MARKS.partA) add('bank', `Part A must be worth ${STRUCTURED_MARKS.partA} marks, found ${partA}`);
  if (partB !== STRUCTURED_MARKS.partB) add('bank', `Part B must be worth ${STRUCTURED_MARKS.partB} marks, found ${partB}`);
  if (partC !== STRUCTURED_MARKS.partC) add('bank', `Part C must be worth ${STRUCTURED_MARKS.partC} marks, found ${partC}`);
  if (partA + partB + partC !== STRUCTURED_MARKS.total)
    add('bank', `the assessment must total ${STRUCTURED_MARKS.total} marks, found ${partA + partB + partC}`);

  // ── Part A ──
  const seenKeys = new Set<string>();
  const seenText = new Set<string>();
  for (const q of bank.mcq) {
    const where = q.key;
    if (seenKeys.has(q.key)) add(where, 'duplicate key');
    seenKeys.add(q.key);
    const t = norm(q.text);
    if (seenText.has(t)) add(where, 'duplicate question text within the bank');
    seenText.add(t);
    if (q.text.trim().length < 15) add(where, 'question text is too short');
    if (q.text.length > 1400) add(where, 'question text is too long');
    if (q.explanation.trim().length < 20) add(where, 'needs an explanation (≥ 20 characters)');
    if (!Number.isInteger(q.topic) || q.topic < 1 || q.topic > 8) add(where, 'topic must be a lesson / course number from 1 to 8');
    if (q.wrong.length !== 3) add(where, 'an MCQ needs exactly three wrong answers');
    const options = [q.correct, ...q.wrong];
    if (new Set(options.map(norm)).size !== options.length) add(where, 'the four options must all be different');
    for (const o of options) {
      if (!o.trim()) add(where, 'empty option');
      if (o.length > 260) add(where, `option too long: "${o.slice(0, 40)}…"`);
      if (VAGUE_OPTION.test(o.trim())) add(where, `avoid vague options like "${o}"`);
      scan(where, o);
    }
    if (q.codeCheck && q.codeCheck.claim !== undefined) add(where, 'MCQ codeCheck must not set `claim`');
    scan(where, `${q.text}\n${q.explanation}`);
  }
  const positions = balancedPositions(bank.mcq.length, `${bank.id}:positions`);
  const counts = [0, 0, 0, 0];
  positions.forEach((p) => counts[p]++);
  if (Math.max(...counts) - Math.min(...counts) > 1) add('bank', 'correct-answer positions are not evenly spread');

  // Topic coverage: a course assessment draws on at least six of the eight lessons (the three
  // short answers and the practical cover more); the final assessment on every course.
  const topics = new Set(bank.mcq.map((q) => q.topic));
  const needed = bank.kind === 'FINAL_TEST' ? 8 : 6;
  if (topics.size < needed)
    add('coverage', `Part A covers only ${topics.size} of the 8 ${bank.kind === 'FINAL_TEST' ? 'courses' : 'lessons'}; at least ${needed} are required`);

  // ── Part B ──
  const seenPrompts = new Set<string>();
  for (const q of bank.shortAnswers) {
    const where = q.key;
    if (seenKeys.has(q.key)) add(where, 'duplicate key');
    seenKeys.add(q.key);
    const t = norm(q.prompt);
    if (seenPrompts.has(t)) add(where, 'duplicate short-answer prompt within the bank');
    seenPrompts.add(t);
    if (q.maxScore !== STRUCTURED_SHAPE.shortAnswer.marksEach)
      add(where, `a short answer is worth ${STRUCTURED_SHAPE.shortAnswer.marksEach} marks, found ${q.maxScore}`);
    if (q.prompt.trim().length < 50) add(where, 'the prompt is too short to be a clear question');
    if (q.prompt.length > 1800) add(where, 'the prompt is too long');
    if (q.modelAnswer.trim().length < 60) add(where, 'needs a model answer (≥ 60 characters) for the teacher');
    if (!Number.isInteger(q.topic) || q.topic < 1 || q.topic > 8) add(where, 'topic must be a lesson / course number from 1 to 8');
    rubricProblems(where, q.rubric, q.maxScore, 2, 4, add);
    scan(where, `${q.prompt}\n${q.modelAnswer}`);
  }

  // ── Part C ──
  const c = bank.practical;
  const where = c.key;
  if (!c.title.trim()) add(where, 'missing title');
  if (c.instructions.trim().length < 300) add(where, 'instructions are too short to be a clear, self-contained task (≥ 300 characters)');
  if (c.instructions.length > 6000) add(where, 'instructions are too long');
  if (c.deliverables.length === 0) add(where, 'list what the student must hand in (deliverables)');
  if (c.deliverables.some((d) => d.trim().length < 5)) add(where, 'a deliverable is too short');
  if (c.language === 'sql' && !c.sqlSetup?.trim()) add(where, 'a SQL practical needs `sqlSetup` so the student can run queries');
  if (c.language !== 'sql' && c.sqlSetup) add(where, '`sqlSetup` only applies to a SQL practical');
  rubricProblems(where, c.rubric, STRUCTURED_MARKS.partC, 4, 6, add);
  scan(where, `${c.title}\n${c.instructions}`);

  return problems;
}

/** Cross-bank rule: no multiple-choice question, short-answer prompt or practical title is repeated. */
export function validateAcrossStructuredBanks(banks: StructuredBank[]): StructuredProblem[] {
  const problems: StructuredProblem[] = [];
  const seen = new Map<string, string>();
  const check = (bankId: string, where: string, text: string) => {
    const key = norm(text);
    const first = seen.get(key);
    if (first && first !== bankId) problems.push({ bankId, where, message: `same text as ${first}` });
    else seen.set(key, bankId);
  };
  for (const b of banks) {
    for (const q of b.mcq) check(b.id, q.key, q.text);
    for (const q of b.shortAnswers) check(b.id, q.key, q.prompt);
    check(b.id, b.practical.key, b.practical.title);
  }
  return problems;
}

export function formatStructuredProblems(problems: StructuredProblem[]): string {
  return problems.map((p) => `${p.bankId} · ${p.where}: ${p.message}`).join('\n');
}
