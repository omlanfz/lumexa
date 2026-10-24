// FILE PATH: server/src/assessments/bank/bank.helpers.ts
//
// Compact authoring helpers for the bank content files. Keys (M01…, T01…) are
// assigned from position by bank(), so a bank file is just two ordered lists.
// Append new questions at the END of a list — reordering changes keys, and the
// sync treats a changed key as a different question.

import {
  BankCodingProject,
  BankMcq,
  BankRubricCriterion,
  BankTestType,
  BankTrueFalse,
  CodeCheck,
  Difficulty,
  TestBank,
} from './bank.types';

export type DraftMcq = Omit<BankMcq, 'key'>;
export type DraftTrueFalse = Omit<BankTrueFalse, 'key'>;

/** A four-option multiple-choice question: the correct answer, then exactly
 *  three wrong answers. `topic` is the lesson (course test) or module
 *  (stage/final test) the question belongs to. */
export function mcq(
  topic: number,
  text: string,
  correct: string,
  wrong: [string, string, string],
  explanation: string,
  difficulty?: Difficulty,
): DraftMcq {
  return { kind: 'MCQ', topic, text, correct, wrong, explanation, difficulty };
}

/** A True/False statement. */
export function tf(
  topic: number,
  text: string,
  answer: boolean,
  explanation: string,
  difficulty?: Difficulty,
): DraftTrueFalse {
  return { kind: 'TRUE_FALSE', topic, text, answer, explanation, difficulty };
}

function fence(language: string, code: string): string {
  return '```' + language + '\n' + code.replace(/^\n+|\n+$/g, '') + '\n```';
}

export interface CodeOpts {
  difficulty?: Difficulty;
  /** Third-party Python modules the snippet needs — see CodeCheck.requires. */
  requires?: string[];
}

const trimCode = (code: string) => code.replace(/^\n+|\n+$/g, '');

/** "What does this code print?" — the correct answer is VERIFIED by running
 *  `code` in the bank test suite. Multi-line output is joined with "\n". */
export function codeOut(
  topic: number,
  language: CodeCheck['language'],
  code: string,
  output: string,
  wrong: [string, string, string],
  explanation: string,
  intro = 'What is printed when this code runs?',
  opts: CodeOpts = {},
): DraftMcq {
  return {
    kind: 'MCQ',
    topic,
    text: `${intro}\n\n${fence(language, code)}`,
    correct: output,
    wrong,
    explanation,
    difficulty: opts.difficulty,
    codeCheck: { language, code: trimCode(code), requires: opts.requires },
  };
}

/** True/False about a code snippet's output — verified by execution:
 *  the statement says the code prints `claim`; `answer` must match reality. */
export function tfOut(
  topic: number,
  language: CodeCheck['language'],
  code: string,
  claim: string,
  answer: boolean,
  explanation: string,
  opts: CodeOpts = {},
): DraftTrueFalse {
  const multi = claim.includes('\n');
  return {
    kind: 'TRUE_FALSE',
    topic,
    text: `True or False: this code prints ${multi ? 'the following' : '`' + claim + '`'}.\n\n${fence(language, code)}${multi ? '\n\n' + fence('text', claim) : ''}`,
    answer,
    explanation,
    difficulty: opts.difficulty,
    codeCheck: {
      language,
      code: trimCode(code),
      claim,
      requires: opts.requires,
    },
  };
}

/** A code snippet shown inside a question (no execution check). */
export function snippet(language: string, code: string): string {
  return fence(language, code);
}

export function project(
  def: Omit<BankCodingProject, 'maxScore'>,
): BankCodingProject {
  const maxScore = def.rubric.reduce(
    (sum: number, r: BankRubricCriterion) => sum + r.maxPoints,
    0,
  );
  return { ...def, maxScore };
}

const pad = (n: number) => String(n).padStart(2, '0');

export function bank(def: {
  id: string;
  title: string;
  type: BankTestType;
  mcq: DraftMcq[];
  trueFalse: DraftTrueFalse[];
  codingProject?: BankCodingProject;
}): TestBank {
  return {
    id: def.id,
    title: def.title,
    type: def.type,
    mcq: def.mcq.map((q, i) => ({ ...q, key: `M${pad(i + 1)}` })),
    trueFalse: def.trueFalse.map((q, i) => ({ ...q, key: `T${pad(i + 1)}` })),
    codingProject: def.codingProject,
  };
}

/** The questions one module contributes to a test that spans several modules. */
export interface BankSlice {
  mcq: DraftMcq[];
  trueFalse: DraftTrueFalse[];
}

/** Everything a module adds beyond its own Course Test. Each slice is authored
 *  with the lesson number as `topic`; composeBank() relabels it. A slice is
 *  never a copy of a Course Test question (validateAcrossBanks enforces it). */
export interface ModuleExtras {
  /** Its share of the pathway Final Test. */
  final: BankSlice;
  /** Its share of its Odyssey stage test (Odyssey modules only). */
  stage?: BankSlice;
  /** Its share of the Odyssey Final Test (Odyssey modules only). */
  odyssey?: BankSlice;
}

/** Assembles a test that spans several modules (pathway Final Test, Odyssey
 *  stage test, Odyssey Final Test) from one slice per module, in order. Every
 *  question's topic becomes its module's position (1…N) in the test. */
export function composeBank(def: {
  id: string;
  title: string;
  type: BankTestType;
  slices: BankSlice[];
  codingProject?: BankCodingProject;
}): TestBank {
  const relabel = <T extends { topic: number }>(
    questions: T[],
    topic: number,
  ): T[] => questions.map((q) => ({ ...q, topic }));
  return bank({
    id: def.id,
    title: def.title,
    type: def.type,
    mcq: def.slices.flatMap((s, i) => relabel(s.mcq, i + 1)),
    trueFalse: def.slices.flatMap((s, i) => relabel(s.trueFalse, i + 1)),
    codingProject: def.codingProject,
  });
}
