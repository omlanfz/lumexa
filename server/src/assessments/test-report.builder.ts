// FILE PATH: server/src/assessments/test-report.builder.ts
//
// Builds the initial Test Evaluation report card from a submitted attempt.
// Pure (no DB) so the exact snapshot a teacher sees is unit tested. The report
// freezes what the student saw — question text, options in the order they were
// shown, the answer they picked, and the correct answer — so later edits to the
// question bank never rewrite history.

import { Prisma, SessionType, TestReportStatus } from '@prisma/client';
import {
  QuestionKind,
  QuestionResult,
  RubricScore,
  ShortAnswerResult,
  computeTotals,
  summarizeObjective,
} from './assessment-grading';

export interface SubmittedAnswer {
  questionId: string;
  kind: QuestionKind;
  text: string;
  /** Options in their stored (canonical) order. */
  storedOptions: string[];
  /** The order they were displayed to this student (indices into storedOptions). */
  optionOrder: number[];
  /** Selected option as a canonical index, or null if unanswered. */
  selectedIndex: number | null;
  correctIndex: number;
  explanation: string | null;
}

export interface SubmittedCoding {
  questionId: string;
  title: string;
  instructions: string;
  language: string;
  maxScore: number;
  rubric: { criterion: string; maxPoints: number; lookFor?: string }[];
  code: string;
  savedAt: Date | null;
  /** Little Coders: what the student handed in (file names are kept after the files are removed). */
  submission?: {
    links: string[];
    note: string | null;
    files: { id: string; name: string; size: number }[];
  };
  /** Little Coders: the practical's specification as the student saw it, frozen. */
  spec?: unknown;
}

/** Part B of a structured assessment: one written question and what the student wrote. */
export interface SubmittedShortAnswer {
  questionId: string;
  order: number;
  prompt: string;
  answer: string;
  maxScore: number;
  rubric: { criterion: string; maxPoints: number; lookFor?: string }[];
  modelAnswer: string | null;
}

export interface BuildReportInput {
  attemptId: string;
  assessmentId: string;
  studentUserId: string;
  teacherId: string;
  courseId: string;
  courseTitle: string;
  lessonId: string | null;
  scheduledLessonId: string | null;
  type: SessionType;
  testTitle: string;
  passScorePct: number;
  submittedAt: Date;
  /** In presentation order (the order the student saw them). */
  answers: SubmittedAnswer[];
  coding: SubmittedCoding | null;
  /** Structured assessments only: the written Part B, in presentation order. */
  shortAnswers?: SubmittedShortAnswer[];
}

export function buildQuestionResults(
  answers: SubmittedAnswer[],
): QuestionResult[] {
  return answers.map((a, i) => {
    const order =
      a.optionOrder.length === a.storedOptions.length
        ? a.optionOrder
        : a.storedOptions.map((_, idx) => idx);
    const selected = a.selectedIndex;
    return {
      questionId: a.questionId,
      order: i + 1,
      kind: a.kind,
      text: a.text,
      options: order.map((idx) => a.storedOptions[idx]),
      selectedIndex: selected === null ? null : order.indexOf(selected),
      correctIndex: order.indexOf(a.correctIndex),
      autoCorrect: selected !== null && selected === a.correctIndex,
      explanation: a.explanation,
      override: null,
    };
  });
}

export function buildReportCreateData(
  input: BuildReportInput,
): Prisma.TestReportUncheckedCreateInput {
  const results = buildQuestionResults(input.answers);
  const objective = summarizeObjective(results);
  const hasCoding = input.coding !== null;
  const rubric: RubricScore[] = (input.coding?.rubric ?? []).map((r) => ({
    ...r,
    score: null,
  }));
  const shortAnswers = input.shortAnswers ?? [];
  const hasShort = shortAnswers.length > 0;
  const shortResults: ShortAnswerResult[] = shortAnswers.map((s) => ({
    questionId: s.questionId,
    order: s.order,
    prompt: s.prompt,
    answer: s.answer,
    maxScore: s.maxScore,
    rubric: s.rubric.map((r) => ({ ...r, lookFor: r.lookFor ?? '', score: null })),
    comment: null,
    modelAnswer: s.modelAnswer,
  }));
  const shortMax = hasShort
    ? shortAnswers.reduce((sum, s) => sum + s.maxScore, 0)
    : null;
  const totals = computeTotals({
    objectiveScore: objective.score,
    objectiveMax: objective.max,
    codingMax: hasCoding ? input.coding!.maxScore : null,
    codingScore: null,
    passScorePct: input.passScorePct,
    shortMax,
    shortScore: null,
  });

  return {
    attemptId: input.attemptId,
    assessmentId: input.assessmentId,
    studentUserId: input.studentUserId,
    teacherId: input.teacherId,
    courseId: input.courseId,
    courseTitle: input.courseTitle,
    lessonId: input.lessonId,
    scheduledLessonId: input.scheduledLessonId,
    assessmentType: input.type,
    testTitle: input.testTitle,
    status:
      hasCoding || hasShort
        ? TestReportStatus.PENDING_CODE_EVALUATION
        : TestReportStatus.PENDING_REVIEW,
    passScorePct: input.passScorePct,
    mcqTotal: objective.mcqTotal,
    trueFalseTotal: objective.trueFalseTotal,
    autoObjectiveScore: objective.autoScore,
    objectiveScore: objective.score,
    objectiveMaxScore: objective.max,
    questionResults: results as unknown as Prisma.InputJsonValue,
    hasCodingProject: hasCoding,
    codingProject: hasCoding
      ? ({
          questionId: input.coding!.questionId,
          title: input.coding!.title,
          instructions: input.coding!.instructions,
          language: input.coding!.language,
          code: input.coding!.code,
          savedAt: input.coding!.savedAt
            ? input.coding!.savedAt.toISOString()
            : null,
          ...(input.coding!.submission
            ? { submission: input.coding!.submission }
            : {}),
          ...(input.coding!.spec ? { spec: input.coding!.spec } : {}),
        } as unknown as Prisma.InputJsonValue)
      : Prisma.DbNull,
    codingMaxScore: hasCoding ? input.coding!.maxScore : null,
    codingRubricScores: hasCoding
      ? (rubric as unknown as Prisma.InputJsonValue)
      : Prisma.DbNull,
    codingScore: null,
    hasShortAnswers: hasShort,
    shortAnswerResults: hasShort
      ? (shortResults as unknown as Prisma.InputJsonValue)
      : Prisma.DbNull,
    shortAnswerMaxScore: shortMax,
    shortAnswerScore: null,
    totalMaxScore: totals.totalMax,
    totalScore: totals.total,
    percentage: totals.percentage,
    passed: totals.passed,
    teacherEdited: false,
    submittedAt: input.submittedAt,
  };
}
