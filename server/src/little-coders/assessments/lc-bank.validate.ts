// FILE PATH: server/src/little-coders/assessments/lc-bank.validate.ts
//
// The quality gate for a Little Coders assessment: the standardized shape (10 MCQ + 5 True/False
// + one 25-mark practical), the spread of question types and difficulties, the block-snippet
// requirement, the standardized rubric and the practical-project rules ("describe the target,
// never the solution"). Used by the tests (every bank, every run), by the sync (a failing bank is
// never written) and by the admin page's "meets the standard" indicator.

import { BANNED_TOPIC_PATTERNS } from '../../assessments/bank/bank.validate';
import { balancedPositions } from '../../assessments/bank/bank.materialize';
import {
  LC_ASSESSMENT,
  LC_MCQ_DIFFICULTY_COUNTS,
  LC_MCQ_KIND_COUNTS,
  LC_MIN_MCQ_WITH_CODE,
  LC_RUBRIC_STANDARD,
  LC_TF_DIFFICULTY_COUNTS,
  LC_VARIANTS,
} from '../lc.constants';
import { validateLines } from '../blocks/block-dsl';
import { validatePracticalSpec } from '../lc.validate';
import type { LcBank, LcCode, LcDifficulty } from './lc-bank.types';

export interface LcBankProblem {
  bankId: string;
  where: string;
  message: string;
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

const SOLUTION_WORDS = /\bstep\s*\d\b|\bfirst,? drag\b|\bthen drag\b|\bsnap\b|\bdrag (?:a|the|out)\b/i;

function checkCode(code: LcCode | undefined, where: string, add: (w: string, m: string) => void) {
  if (!code) return;
  for (const p of validateLines(code.language, code.lines, where)) add(where, p);
  if (code.lines.length < 2 || code.lines.length > 14) add(where, 'a question snippet should be 2–14 lines');
}

export function validateLcBank(bank: LcBank): LcBankProblem[] {
  const problems: LcBankProblem[] = [];
  const add = (where: string, message: string) => problems.push({ bankId: bank.id, where, message });

  // ── Shape ──────────────────────────────────────────────────────────────────
  if (bank.mcq.length !== LC_ASSESSMENT.mcq.count) add('bank', `needs exactly ${LC_ASSESSMENT.mcq.count} MCQs, has ${bank.mcq.length}`);
  if (bank.trueFalse.length !== LC_ASSESSMENT.trueFalse.count) add('bank', `needs exactly ${LC_ASSESSMENT.trueFalse.count} True/False statements, has ${bank.trueFalse.length}`);

  // Spread of question types (2 / 2 / 3 / 2 / 1).
  for (const [kind, want] of Object.entries(LC_MCQ_KIND_COUNTS)) {
    const have = bank.mcq.filter((q) => q.kind === kind).length;
    if (have !== want) add('mcq-kinds', `needs ${want} “${kind}” question(s), has ${have}`);
  }
  // Difficulty (3 easy · 4 moderate · 3 challenging) and (2 · 2 · 1).
  const count = (list: { difficulty: LcDifficulty }[], d: LcDifficulty) => list.filter((q) => q.difficulty === d).length;
  for (const d of ['EASY', 'MEDIUM', 'HARD'] as const) {
    if (count(bank.mcq, d) !== LC_MCQ_DIFFICULTY_COUNTS[d]) add('mcq-difficulty', `needs ${LC_MCQ_DIFFICULTY_COUNTS[d]} ${d} MCQs, has ${count(bank.mcq, d)}`);
    if (count(bank.trueFalse, d) !== LC_TF_DIFFICULTY_COUNTS[d]) add('tf-difficulty', `needs ${LC_TF_DIFFICULTY_COUNTS[d]} ${d} True/False, has ${count(bank.trueFalse, d)}`);
  }
  const withCode = bank.mcq.filter((q) => !!q.code).length;
  if (withCode < LC_MIN_MCQ_WITH_CODE) add('mcq-code', `at least ${LC_MIN_MCQ_WITH_CODE} MCQs must show a block script, ${withCode} do`);

  // ── Each question ──────────────────────────────────────────────────────────
  const seen = new Set<string>();
  const scan = (where: string, text: string) => {
    for (const { name, re } of BANNED_TOPIC_PATTERNS) if (re.test(text)) add(where, `looks like a ${name} question — test understanding instead`);
  };
  bank.mcq.forEach((q, i) => {
    const where = `M${String(i + 1).padStart(2, '0')}`;
    const key = norm(q.text + (q.code?.lines.join('') ?? ''));
    if (seen.has(key)) add(where, 'duplicate question');
    seen.add(key);
    if (q.text.trim().length < 15) add(where, 'question text is too short');
    if (q.text.length > 400) add(where, 'question text is too long');
    if (q.explanation.trim().length < 20) add(where, 'needs an explanation (≥ 20 characters)');
    if (!Number.isInteger(q.topic) || q.topic < 1) add(where, 'topic must be a positive whole number');
    const options = [q.correct, ...q.wrong].map(norm);
    if (new Set(options).size !== 4) add(where, 'the four options must all be different');
    for (const o of [q.correct, ...q.wrong]) {
      if (!o.trim()) add(where, 'empty option');
      if (o.length > 160) add(where, `option is too long: “${o.slice(0, 40)}…”`);
      if (/^(?:all|none|both)\s+of\s+the\s+(?:above|below)\b/i.test(o)) add(where, `avoid vague options like “${o}”`);
    }
    checkCode(q.code, where, add);
    scan(where, `${q.text}\n${q.explanation}\n${q.correct}\n${q.wrong.join('\n')}`);
  });
  bank.trueFalse.forEach((q, i) => {
    const where = `T${String(i + 1).padStart(2, '0')}`;
    const key = norm(q.text + (q.code?.lines.join('') ?? ''));
    if (seen.has(key)) add(where, 'duplicate question');
    seen.add(key);
    if (q.text.trim().length < 15) add(where, 'statement is too short');
    if (q.explanation.trim().length < 20) add(where, 'needs an explanation (≥ 20 characters)');
    // No double negatives or tricky wording.
    if (/\b(?:not|never|no)\b[^.]*\b(?:not|never|no)\b/i.test(q.text)) add(where, 'avoid double negatives');
    checkCode(q.code, where, add);
    scan(where, `${q.text}\n${q.explanation}`);
  });
  const trues = bank.trueFalse.filter((q) => q.answer).length;
  if (trues < 2 || trues > 3) add('trueFalse', `True/False answers are lopsided (${trues} true of 5)`);

  // Correct answers must be spread evenly over A–D once materialized.
  const positions = balancedPositions(bank.mcq.length, `${bank.id}:positions`);
  const counts = [0, 0, 0, 0];
  positions.forEach((p) => counts[p]++);
  if (Math.max(...counts) - Math.min(...counts) > 1) add('bank', 'correct-answer positions are not evenly spread');

  // ── Coverage ───────────────────────────────────────────────────────────────
  const all = [...bank.mcq, ...bank.trueFalse];
  if (bank.kind === 'COURSE') {
    for (let lesson = 1; lesson <= 8; lesson++) if (!all.some((q) => q.topic === lesson)) add('coverage', `lesson ${lesson} has no question`);
    for (const q of all) if (q.topic < 1 || q.topic > 8) add('coverage', `topic ${q.topic} is outside lessons 1–8`);
    if (!bank.moduleSlug) add('bank', 'a course assessment needs its moduleSlug');
  } else {
    for (let course = 1; course <= 5; course++) {
      const n = bank.mcq.filter((q) => q.topic === course).length;
      if (n !== 2) add('coverage', `the final assessment needs 2 MCQs from course ${course}, has ${n}`);
      if (!all.some((q) => q.topic === course)) add('coverage', `course ${course} has no question`);
    }
    for (const q of all) if (q.topic < 1 || q.topic > 5) add('coverage', `topic ${q.topic} is outside courses 1–5`);
  }

  // ── Practical ──────────────────────────────────────────────────────────────
  const wantVariants = bank.kind === 'FINAL' ? [...LC_VARIANTS] : [null];
  const haveVariants = bank.practicals.map((p) => p.variant);
  if (haveVariants.length !== wantVariants.length || !wantVariants.every((v) => haveVariants.includes(v as never))) {
    add('practical', bank.kind === 'FINAL' ? 'the final needs one SCRATCH_AI and one PYTHON practical' : 'a course assessment needs exactly one practical');
  }
  const wantPlatform = (p: { variant: string | null }): string => {
    if (bank.kind === 'FINAL') return p.variant === 'PYTHON' ? 'EDUBLOCKS' : 'STRETCH3';
    return (bank.courseNumber ?? 0) <= 3 ? 'STRETCH3' : 'EDUBLOCKS';
  };
  for (const p of bank.practicals) {
    const where = `practical${p.variant ? `:${p.variant}` : ''}`;
    const spec = validatePracticalSpec(p.spec);
    for (const e of spec.errors) add(where, e);
    if (p.spec.platform !== wantPlatform(p)) add(where, `must be built in ${wantPlatform(p)}, not ${p.spec.platform}`);
    if (p.spec.minutes !== LC_ASSESSMENT.practical.minutes) add(where, `is timed for ${LC_ASSESSMENT.practical.minutes} minutes`);
    const text = [...p.spec.brief, ...p.spec.requirements].join('\n');
    if (SOLUTION_WORDS.test(text)) add(where, 'reads like step-by-step assembly instructions — describe what the project must do, not how to build it');
    scan(where, text);
    // Rubric: exactly the standardized five criteria and marks.
    if (p.rubric.length !== LC_RUBRIC_STANDARD.length) add(where, 'the rubric must have the 5 standard criteria');
    LC_RUBRIC_STANDARD.forEach((std, i) => {
      const r = p.rubric[i];
      if (!r || r.criterion !== std.criterion || r.maxPoints !== std.maxPoints) add(where, `rubric criterion ${i + 1} must be “${std.criterion}” (${std.maxPoints})`);
      if (r && r.lookFor.trim().length < 20) add(where, `criterion “${r.criterion}” needs a “look for” guide`);
    });
    const total = p.rubric.reduce((s, r) => s + r.maxPoints, 0);
    if (total !== LC_ASSESSMENT.practical.marks) add(where, `rubric must total ${LC_ASSESSMENT.practical.marks} marks, found ${total}`);
    // A required prepared model must say which labels it needs, and never carry an invented link.
    if (p.spec.starter.required) {
      if (p.spec.starter.kind === 'NONE') add(where, 'a required starter needs a kind');
      if (p.spec.starter.kind === 'MODEL_URL' && p.spec.starter.modelLabels.length < 2) add(where, 'a prepared model must list its labels');
      if (p.spec.starter.url !== '') add(where, 'a bank must not ship a starter address — admins add it');
    }
  }
  return problems;
}

/** No two questions anywhere in the Little Coders banks may share text. */
export function validateAcrossLcBanks(banks: LcBank[]): LcBankProblem[] {
  const problems: LcBankProblem[] = [];
  const seen = new Map<string, string>();
  for (const b of banks) {
    for (const q of [...b.mcq, ...b.trueFalse]) {
      const t = norm(q.text + (q.code?.lines.join('') ?? ''));
      const first = seen.get(t);
      if (first && first !== b.id) problems.push({ bankId: b.id, where: 'cross-bank', message: `same question as ${first}: “${q.text.slice(0, 60)}…”` });
      else seen.set(t, b.id);
    }
  }
  return problems;
}

export function formatLcProblems(problems: LcBankProblem[]): string {
  return problems.map((p) => `${p.bankId} · ${p.where}: ${p.message}`).join('\n');
}
