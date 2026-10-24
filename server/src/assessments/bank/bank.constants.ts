// FILE PATH: server/src/assessments/bank/bank.constants.ts
//
// The standard every test bank must meet (enforced by bank.validate.ts, by the
// bank test suite, and re-checked by the sync before it writes anything).

import { BankTestType } from './bank.types';

/** Bump whenever ANY bank's content changes. The sync applies a bank to an
 *  assessment only while Assessment.bankVersion is below this, and records it
 *  afterwards — so a normal boot with nothing new to apply is a no-op. */
export const BANK_CONTENT_VERSION = 1;

export interface TestShape {
  mcq: number;
  trueFalse: number;
  codingProject: boolean;
  /** Marks for the coding project (Final Test only). */
  codingMaxScore: number;
}

/** Course tests (after every 8 lessons) and Odyssey stage tests share the
 *  same objective-only shape; Final tests add the practical coding project. */
export const TEST_SHAPES: Record<BankTestType, TestShape> = {
  COURSE_TEST: {
    mcq: 30,
    trueFalse: 10,
    codingProject: false,
    codingMaxScore: 0,
  },
  STAGE_TEST: {
    mcq: 30,
    trueFalse: 10,
    codingProject: false,
    codingMaxScore: 0,
  },
  FINAL_TEST: {
    mcq: 25,
    trueFalse: 5,
    codingProject: true,
    codingMaxScore: 20,
  },
};

/** Every objective question is worth exactly one mark. */
export const MARKS_PER_QUESTION = 1;

/** A coding project is sized for roughly this long. */
export const CODING_PROJECT_MINUTES = 15;

export const TRUE_FALSE_OPTIONS = ['True', 'False'] as const;

export function expectedObjectiveCount(type: BankTestType): number {
  const s = TEST_SHAPES[type];
  return s.mcq + s.trueFalse;
}

export function expectedTotalMarks(type: BankTestType): number {
  const s = TEST_SHAPES[type];
  return (
    expectedObjectiveCount(type) * MARKS_PER_QUESTION +
    (s.codingProject ? s.codingMaxScore : 0)
  );
}

/** Student-facing instructions stored on Assessment.instructions. */
export function standardInstructions(type: BankTestType): string {
  const s = TEST_SHAPES[type];
  const objective =
    `${s.mcq + s.trueFalse} questions: ${s.mcq} multiple-choice (choose one of four answers) and ` +
    `${s.trueFalse} True/False. Each question is worth 1 mark.`;
  if (!s.codingProject) {
    return (
      `${objective} Your answers save automatically as you go. Review them, then press Submit — ` +
      `your teacher will check the report and share your result.`
    );
  }
  return (
    `${objective} Then complete one small coding project (about ${CODING_PROJECT_MINUTES} minutes, ` +
    `${s.codingMaxScore} marks) that your teacher marks. Your work saves automatically. ` +
    `When you are ready, press Submit — you cannot change anything afterwards.`
  );
}
