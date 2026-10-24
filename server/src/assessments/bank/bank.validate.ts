// FILE PATH: server/src/assessments/bank/bank.validate.ts
//
// The quality gate every bank passes before it can reach a student. Used three
// ways: by the bank test suite (every bank, every run), by the sync (it refuses
// to write a bank that fails — a bad bank never overwrites a good one), and by
// the admin question-bank page's "meets the standard" indicator.

import { TEST_SHAPES, expectedObjectiveCount } from './bank.constants';
import { balancedPositions } from './bank.materialize';
import { BankTestType, TestBank } from './bank.types';

/** Setup / installation / environment / terminal-command questions are out of
 *  scope for tests (they test a one-off chore, not understanding). The word
 *  list is intentionally blunt — a hit means "reword the question", and every
 *  reword is a one-liner. */
export const BANNED_TOPIC_PATTERNS: { name: string; re: RegExp }[] = [
  { name: 'installation', re: /\binstall(?:s|ed|ing|ation|ations|er|ers)?\b/i },
  { name: 'package-manager command', re: /\b(?:pip3?|npm|npx|yarn|conda)\b/i },
  {
    name: 'terminal / command line',
    re: /\b(?:terminal|command[- ]line|command prompt|powershell|bash|shell command)\b/i,
  },
  {
    name: 'running a file from the command line',
    re: /\b(?:python3?|node)\s+[\w./\\-]+\.(?:py|js)\b/i,
  },
  {
    name: 'environment configuration',
    re: /\b(?:environment variables?|virtual environment|virtualenv|venv|interpreter (?:setting|path)|VS ?Code|PyCharm|IDLE)\b/i,
  },
  { name: 'PATH setting', re: /\badd python to path\b|\bPATH variable\b/i },
  {
    name: 'download / setup chore',
    re: /\b(?:download(?:ing|ed)?|setup wizard|set ?up (?:your|the|a) (?:computer|environment|laptop|editor))\b/i,
  },
];

const VAGUE_OPTION =
  /^(?:all|none|both)\s+of\s+the\s+(?:above|below)\b|^(?:a|b|c|d)\s+(?:and|&)\s+(?:a|b|c|d)$|^option\s+[a-d]\b/i;

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

export interface BankProblem {
  bankId: string;
  where: string;
  message: string;
}

function scanBanned(
  bankId: string,
  where: string,
  text: string,
  out: BankProblem[],
) {
  for (const { name, re } of BANNED_TOPIC_PATTERNS) {
    if (re.test(text))
      out.push({
        bankId,
        where,
        message: `looks like a ${name} question — test understanding instead`,
      });
  }
}

export function validateBank(bank: TestBank): BankProblem[] {
  const problems: BankProblem[] = [];
  const add = (where: string, message: string) =>
    problems.push({ bankId: bank.id, where, message });
  const shape = TEST_SHAPES[bank.type];

  if (bank.mcq.length !== shape.mcq)
    add('bank', `expected exactly ${shape.mcq} MCQs, found ${bank.mcq.length}`);
  if (bank.trueFalse.length !== shape.trueFalse) {
    add(
      'bank',
      `expected exactly ${shape.trueFalse} True/False questions, found ${bank.trueFalse.length}`,
    );
  }
  if (
    bank.mcq.length + bank.trueFalse.length !==
    expectedObjectiveCount(bank.type)
  ) {
    add(
      'bank',
      `expected ${expectedObjectiveCount(bank.type)} objective questions in total`,
    );
  }

  if (shape.codingProject) {
    const c = bank.codingProject;
    if (!c)
      add('codingProject', 'a Final Test needs exactly one coding project');
    else {
      const total = c.rubric.reduce((s, r) => s + r.maxPoints, 0);
      if (total !== shape.codingMaxScore)
        add(
          'codingProject',
          `rubric must total ${shape.codingMaxScore} marks, found ${total}`,
        );
      if (c.maxScore !== total)
        add('codingProject', 'maxScore must equal the rubric total');
      if (c.rubric.length < 3 || c.rubric.length > 5)
        add('codingProject', 'rubric should have 3–5 criteria');
      for (const r of c.rubric) {
        if (!Number.isInteger(r.maxPoints) || r.maxPoints <= 0)
          add(
            'codingProject',
            `criterion "${r.criterion}" needs a positive whole-number maximum`,
          );
        if (r.lookFor.trim().length < 20)
          add(
            'codingProject',
            `criterion "${r.criterion}" needs a "look for" guide`,
          );
      }
      if (c.instructions.trim().length < 200)
        add(
          'codingProject',
          'instructions are too short to be a clear, self-contained task',
        );
      if (!/15\s*minutes?/i.test(c.instructions))
        add(
          'codingProject',
          'instructions should state the ~15-minute time box',
        );
      if (!c.title.trim()) add('codingProject', 'missing title');
      scanBanned(
        bank.id,
        'codingProject',
        `${c.title}\n${c.instructions}`,
        problems,
      );
    }
  } else if (bank.codingProject) {
    add('codingProject', `${bank.type} must not include a coding project`);
  }

  const seenKeys = new Set<string>();
  const seenText = new Set<string>();
  const all = [...bank.mcq, ...bank.trueFalse];
  for (const q of all) {
    const where = q.key;
    if (seenKeys.has(q.key)) add(where, 'duplicate key');
    seenKeys.add(q.key);

    const t = norm(q.text);
    if (seenText.has(t)) add(where, 'duplicate question text within the bank');
    seenText.add(t);

    if (q.text.trim().length < 15) add(where, 'question text is too short');
    if (q.text.length > 900) add(where, 'question text is too long');
    if (q.explanation.trim().length < 20)
      add(where, 'needs an explanation (≥ 20 characters)');
    if (!Number.isInteger(q.topic) || q.topic < 1)
      add(where, 'topic must be a positive whole number');

    scanBanned(bank.id, where, `${q.text}\n${q.explanation}`, problems);
  }

  for (const q of bank.mcq) {
    const where = q.key;
    const options = [q.correct, ...q.wrong];
    if (q.wrong.length !== 3)
      add(where, 'an MCQ needs exactly three wrong answers');
    const normalized = options.map(norm);
    if (new Set(normalized).size !== normalized.length)
      add(where, 'the four options must all be different');
    for (const o of options) {
      if (!o.trim()) add(where, 'empty option');
      if (o.length > 220) add(where, `option too long: "${o.slice(0, 40)}…"`);
      if (VAGUE_OPTION.test(o.trim()))
        add(where, `avoid vague options like "${o}"`);
      scanBanned(bank.id, where, o, problems);
    }
    if (q.codeCheck && q.codeCheck.claim !== undefined)
      add(where, 'MCQ codeCheck must not set `claim`');
  }

  const trues = bank.trueFalse.filter((q) => q.answer).length;
  const n = bank.trueFalse.length;
  if (n >= 5 && Math.abs(trues - n / 2) > Math.max(1, n * 0.2)) {
    add(
      'trueFalse',
      `True/False answers are lopsided (${trues} true of ${n}) — aim for a balance`,
    );
  }

  // Course tests must cover the whole 8-lesson course, not just its start.
  if (bank.type === 'COURSE_TEST') {
    const perLesson = new Map<number, number>();
    for (const q of all)
      perLesson.set(q.topic, (perLesson.get(q.topic) ?? 0) + 1);
    for (let lesson = 1; lesson <= 8; lesson++) {
      const c = perLesson.get(lesson) ?? 0;
      if (c < 3)
        add(
          'coverage',
          `lesson ${lesson} has only ${c} question(s) — every lesson needs at least 3`,
        );
    }
    for (const lesson of perLesson.keys()) {
      if (lesson > 8) add('coverage', `topic ${lesson} is outside lessons 1–8`);
    }
  }

  // Correct-answer positions must be evenly spread once materialized.
  const positions = balancedPositions(bank.mcq.length, `${bank.id}:positions`);
  const counts = [0, 0, 0, 0];
  positions.forEach((p) => counts[p]++);
  if (Math.max(...counts) - Math.min(...counts) > 1)
    add('bank', 'correct-answer positions are not evenly spread');

  return problems;
}

/** Cross-bank rule: no two questions anywhere in the catalog share the same
 *  text, so a student never sees the identical question in two tests. */
export function validateAcrossBanks(banks: TestBank[]): BankProblem[] {
  const problems: BankProblem[] = [];
  const seen = new Map<string, string>();
  for (const bank of banks) {
    for (const q of [...bank.mcq, ...bank.trueFalse]) {
      const t = norm(q.text);
      const first = seen.get(t);
      if (first && first !== bank.id) {
        problems.push({
          bankId: bank.id,
          where: q.key,
          message: `same question text as ${first}`,
        });
      } else seen.set(t, bank.id);
    }
  }
  return problems;
}

export function formatProblems(problems: BankProblem[]): string {
  return problems
    .map((p) => `${p.bankId} · ${p.where}: ${p.message}`)
    .join('\n');
}

export type { BankTestType };
