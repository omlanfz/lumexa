// FILE PATH: server/src/little-coders/assessments/lc-bank.types.ts
//
// The authored format of a Little Coders assessment:
//   10 multiple-choice questions (each the correct answer + exactly three wrong ones)
//   5 True/False statements
//   one practical coding project (two versions for the Final Assessment)
// Answer keys live only in these files and in the database — never in a student payload.

import type { LcMcqKind, LcVariant } from '../lc.constants';
import type { LcBlockLanguage, LcPracticalSpec } from '../lc.types';

export type LcDifficulty = 'EASY' | 'MEDIUM' | 'HARD';

/** A block script shown with a question (drawn by the client as real blocks). */
export interface LcCode {
  language: LcBlockLanguage;
  lines: string[];
}

/**
 * Executable proof for a Python question: the tests run the program (real Python) and
 * compare. `stdout` is the exact expected output; `lines` only counts output lines;
 * `error` says the program must stop with that Python error.
 */
export interface LcVerify {
  inputs?: string[];
  stdout?: string;
  lines?: number;
  error?: string;
}

export interface LcMcq {
  kind: LcMcqKind;
  difficulty: LcDifficulty;
  /** Lesson 1–8 of a course assessment, course 1–5 of the final one. */
  topic: number;
  text: string;
  code?: LcCode;
  correct: string;
  wrong: [string, string, string];
  explanation: string;
  verify?: LcVerify;
}

export interface LcTrueFalse {
  difficulty: LcDifficulty;
  topic: number;
  text: string;
  code?: LcCode;
  answer: boolean;
  explanation: string;
  verify?: LcVerify;
}

export interface LcRubricCriterion {
  criterion: string;
  maxPoints: number;
  /** Teacher-only marking guide. */
  lookFor: string;
}

export interface LcPracticalDef {
  variant: LcVariant | null;
  title: string;
  spec: LcPracticalSpec;
  rubric: LcRubricCriterion[];
}

export interface LcBank {
  /** e.g. "lc/course-test/scratch-adventures". */
  id: string;
  title: string;
  kind: 'COURSE' | 'FINAL';
  /** The CourseModule slug a course assessment belongs to. */
  moduleSlug?: string;
  courseNumber?: number;
  mcq: LcMcq[];
  trueFalse: LcTrueFalse[];
  practicals: LcPracticalDef[];
}

/** One question as stored in MCQQuestion (what the sync writes). */
export interface LcMaterializedQuestion {
  bankKey: string;
  questionType: 'MCQ' | 'TRUE_FALSE';
  questionText: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty: LcDifficulty;
  tags: string[];
  order: number;
}

export interface LcMaterializedPractical {
  bankKey: string;
  variantKey: LcVariant | null;
  title: string;
  /** Plain-text version of the three sections, for screens that do not know the spec. */
  instructions: string;
  language: string;
  spec: LcPracticalSpec;
  rubric: LcRubricCriterion[];
  maxScore: number;
  order: number;
}

export interface LcMaterializedBank {
  questions: LcMaterializedQuestion[];
  practicals: LcMaterializedPractical[];
}
