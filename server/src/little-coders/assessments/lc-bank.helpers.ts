// FILE PATH: server/src/little-coders/assessments/lc-bank.helpers.ts
//
// Short builders for the six assessment banks, and the standardized rubric.

import { LC_RUBRIC_STANDARD, type LcMcqKind, type LcVariant } from '../lc.constants';
import type { LcBlockLanguage, LcPracticalSpec } from '../lc.types';
import type { LcBank, LcCode, LcDifficulty, LcMcq, LcPracticalDef, LcRubricCriterion, LcTrueFalse, LcVerify } from './lc-bank.types';

type Opts = { code?: LcCode; verify?: LcVerify };

export function mcq(
  kind: LcMcqKind,
  difficulty: LcDifficulty,
  topic: number,
  text: string,
  correct: string,
  wrong: [string, string, string],
  explanation: string,
  opts: Opts = {},
): LcMcq {
  return { kind, difficulty, topic, text, correct, wrong, explanation, ...opts };
}

export function tf(difficulty: LcDifficulty, topic: number, text: string, answer: boolean, explanation: string, opts: Opts = {}): LcTrueFalse {
  return { difficulty, topic, text, answer, explanation, ...opts };
}

export const scratchCode = (...lines: string[]): LcCode => ({ language: 'scratch', lines });
export const pyCode = (...lines: string[]): LcCode => ({ language: 'edublocks', lines });

/** The question text as stored: prose, then the block script as a fenced block. */
export function questionText(text: string, code?: LcCode): string {
  if (!code) return text;
  const fence = code.language === 'scratch' ? 'scratch' : 'edublocks';
  return `${text}\n\n\`\`\`${fence}\n${code.lines.join('\n')}\n\`\`\``;
}

/** Splits a stored question back into its prose and block script (used by the client's parser too). */
export function splitQuestionText(stored: string): { text: string; code: LcCode | null } {
  const m = /^([\s\S]*?)\n\n```(scratch|edublocks)\n([\s\S]*?)\n```\s*$/.exec(stored);
  if (!m) return { text: stored, code: null };
  return { text: m[1], code: { language: m[2] as LcBlockLanguage, lines: m[3].split('\n') } };
}

// ─── The standardized rubric ────────────────────────────────────────────────

/**
 * The same five criteria, with the same marks, for all six assessments. Only the
 * teacher's "look for" guide is specific to the project.
 */
export function rubricFor(requirements: string[], platformName: string): LcRubricCriterion[] {
  const n = requirements.length;
  const guide: Record<string, string> = {
    'Required functionality works correctly': `Run the project and check each build requirement (${n} in total). Award the 10 marks in proportion to the requirements that really work — about ${Math.round((10 / n) * 10) / 10} each — with part marks where one works only partly. Do not give marks for decoration or artistic quality.`,
    'Correct selection and use of blocks': `The blocks listed under “Blocks you need to find” are used, from the right ${platformName} categories, with sensible values. Award 1 mark per well-used block group (up to 6). A block that is placed but unused, or the wrong block for the job, earns nothing.`,
    'Logical sequence and programming flow': 'Scripts begin with the right starting block, run in a sensible order, and loops, conditions and events contain the blocks that belong inside them. 5 = clear and correct flow; 3 = works with some blocks out of place; 1 = mostly unordered.',
    'Testing and debugging': 'Evidence that the student ran and tested the project: it runs without errors, and edge cases from the requirements (for example a wrong answer or a weak guess) are handled. 3 = tested and robust; 2 = runs with one small problem; 1 = runs only partly; 0 = does not run.',
    'Project completed and submitted': 'A project file or a working link was handed in and opens. 1 = yes, 0 = nothing usable was submitted.',
  };
  return LC_RUBRIC_STANDARD.map((r) => ({ ...r, lookFor: guide[r.criterion] }));
}

export function practical(
  variant: LcVariant | null,
  title: string,
  platformName: string,
  spec: Omit<LcPracticalSpec, 'version' | 'variant' | 'minutes'>,
): LcPracticalDef {
  return {
    variant,
    title,
    spec: { version: 1, variant, minutes: 20, ...spec },
    rubric: rubricFor(spec.requirements, platformName),
  };
}

export function bank(def: LcBank): LcBank {
  return def;
}
