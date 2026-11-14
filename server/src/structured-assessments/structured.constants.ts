// FILE PATH: server/src/structured-assessments/structured.constants.ts
//
// The ONE definition of the structured assessment (AssessmentFormat.STRUCTURED_V1) that every
// Pre-University CSE course assessment AND the program's final assessment follows:
//
//   Part A — 10 multiple-choice questions   × 1 mark   = 10   (auto-graded)
//   Part B —  3 short-answer questions      × 5 marks  = 15   (teacher-marked, rubric)
//   Part C —  1 practical problem           × 20 marks = 20   (teacher-marked, rubric)
//   14 questions / tasks                               = 45 marks, at most 40 minutes
//
// Nothing else in the code base writes these numbers down: the bank validation, the bank sync,
// the attempt engine, the report math, the student screens and the curriculum PDF all read them
// from here (the client mirrors them in client/lib/assessment/structured.ts, and a test keeps the
// two in step).

export const STRUCTURED_SHAPE = {
  mcq: { count: 10, marksEach: 1 },
  shortAnswer: { count: 3, marksEach: 5 },
  practical: { count: 1, marksEach: 20 },
} as const;

export const STRUCTURED_MARKS = {
  partA: STRUCTURED_SHAPE.mcq.count * STRUCTURED_SHAPE.mcq.marksEach, // 10
  partB: STRUCTURED_SHAPE.shortAnswer.count * STRUCTURED_SHAPE.shortAnswer.marksEach, // 15
  partC: STRUCTURED_SHAPE.practical.count * STRUCTURED_SHAPE.practical.marksEach, // 20
  total:
    STRUCTURED_SHAPE.mcq.count * STRUCTURED_SHAPE.mcq.marksEach +
    STRUCTURED_SHAPE.shortAnswer.count * STRUCTURED_SHAPE.shortAnswer.marksEach +
    STRUCTURED_SHAPE.practical.count * STRUCTURED_SHAPE.practical.marksEach, // 45
} as const;

/** Questions and tasks in one assessment: 10 + 3 + 1. */
export const STRUCTURED_TASK_COUNT =
  STRUCTURED_SHAPE.mcq.count + STRUCTURED_SHAPE.shortAnswer.count + STRUCTURED_SHAPE.practical.count; // 14

/** The maximum duration of the assessment, in minutes. */
export const STRUCTURED_TIME_LIMIT_MINUTES = 40;

/**
 * After the deadline the server still accepts a save or a submit for this long, so the browser's own
 * automatic submit at 00:00 (and a slow connection) never loses what the student wrote. It is not extra
 * time: the student's countdown ends at the deadline, and nothing is accepted after the grace.
 */
export const STRUCTURED_GRACE_SECONDS = 30;

/** Suggested split of the 40 minutes, shown to students (it is guidance, not enforced). */
export const STRUCTURED_SUGGESTED_MINUTES = { partA: 10, partB: 12, partC: 15, review: 3 } as const;

/**
 * Version of the authored banks. The sync applies a bank to an assessment only while
 * Assessment.bankVersion is below this; bump it whenever any structured bank changes.
 */
export const STRUCTURED_BANK_VERSION = 1;

/** Largest written answer (characters) a student can save for one short-answer question. */
export const STRUCTURED_MAX_ANSWER_LENGTH = 6_000;

export type StructuredKind = 'COURSE_TEST' | 'FINAL_TEST';

/** One part of the assessment as the intro screen and the monitors show it. */
export interface StructuredPartMeta {
  key: 'A' | 'B' | 'C';
  label: string;
  detail: string;
  marks: number;
  /** The suggested minutes for this part (guidance, not enforced). */
  minutes: number;
}

/** The standard header of a structured assessment: marks, time and the three parts (like Little Coders' `lc`). */
export interface StructuredMeta {
  minutes: number;
  marks: number;
  graceSeconds: number;
  /** Minutes the split leaves for reading everything through before the hand-in. */
  reviewMinutes: number;
  parts: StructuredPartMeta[];
}

export function structuredMeta(): StructuredMeta {
  return {
    minutes: STRUCTURED_TIME_LIMIT_MINUTES,
    marks: STRUCTURED_MARKS.total,
    graceSeconds: STRUCTURED_GRACE_SECONDS,
    reviewMinutes: STRUCTURED_SUGGESTED_MINUTES.review,
    parts: [
      {
        key: 'A',
        label: 'Part A · Multiple choice',
        detail: `${STRUCTURED_SHAPE.mcq.count} questions, ${STRUCTURED_SHAPE.mcq.marksEach} mark each. Marked automatically.`,
        marks: STRUCTURED_MARKS.partA,
        minutes: STRUCTURED_SUGGESTED_MINUTES.partA,
      },
      {
        key: 'B',
        label: 'Part B · Short answers',
        detail: `${STRUCTURED_SHAPE.shortAnswer.count} written questions, ${STRUCTURED_SHAPE.shortAnswer.marksEach} marks each. Your teacher marks them.`,
        marks: STRUCTURED_MARKS.partB,
        minutes: STRUCTURED_SUGGESTED_MINUTES.partB,
      },
      {
        key: 'C',
        label: 'Part C · Practical problem',
        detail: `${STRUCTURED_SHAPE.practical.count} practical task, ${STRUCTURED_SHAPE.practical.marksEach} marks. Your teacher marks it.`,
        marks: STRUCTURED_MARKS.partC,
        minutes: STRUCTURED_SUGGESTED_MINUTES.partC,
      },
    ],
  };
}

/** The text a student reads before starting. */
export function structuredInstructions(kind: StructuredKind): string {
  const scope =
    kind === 'FINAL_TEST'
      ? 'This Final Assessment covers all eight courses of the program.'
      : 'This Course Assessment covers the eight lessons of the course.';
  return (
    `${scope} It has three parts and is worth ${STRUCTURED_MARKS.total} marks. You have at most ` +
    `${STRUCTURED_TIME_LIMIT_MINUTES} minutes.\n\n` +
    `**Part A — Multiple choice (${STRUCTURED_MARKS.partA} marks).** ${STRUCTURED_SHAPE.mcq.count} questions, ` +
    `1 mark each. Choose one of four answers.\n\n` +
    `**Part B — Short answers (${STRUCTURED_MARKS.partB} marks).** ${STRUCTURED_SHAPE.shortAnswer.count} questions, ` +
    `${STRUCTURED_SHAPE.shortAnswer.marksEach} marks each. Explain, trace or work the problem out in writing. ` +
    `Your teacher marks them against a rubric.\n\n` +
    `**Part C — Practical problem (${STRUCTURED_MARKS.partC} marks).** One practical task that matches the course: ` +
    `write or debug code, solve a problem, design a circuit or analyse a system. Your teacher marks it against a rubric.\n\n` +
    `Everything saves automatically. When the time runs out your work is handed in for you, so keep your answers saved as you go.`
  );
}
