// FILE PATH: server/src/assessments/bank-summary.ts
//
// "What does this test contain?" — published question counts of an
// assessment's root bank, measured against the standard. Shared by the
// assessments service (classroom status, admin page) and the lesson-details
// endpoint, so every screen reports the same numbers.

import {
  AssessmentFormat,
  PrismaClient,
  QuestionKind,
  SessionType,
} from '@prisma/client';
import { MARKS_PER_QUESTION, TEST_SHAPES } from './bank/bank.constants';
import { rootBankId } from './linked-assessment';
import { LC_ASSESSMENT } from '../little-coders/lc.constants';
import { STRUCTURED_MARKS, STRUCTURED_SHAPE } from '../structured-assessments/structured.constants';

export interface BankSummary {
  /** `shortAnswers` is present for a structured assessment only. */
  counts: { mcq: number; trueFalse: number; practical: number; shortAnswers?: number };
  totalMarks: number;
  meetsStandard: boolean;
  /** How the test is taken: STANDARD, LITTLE_CODERS_V2 (10 + 5 + a 25-mark practical) or STRUCTURED_V1 (10 + 3 + 1 = 45 marks). */
  format: AssessmentFormat;
}

export async function getBankSummary(
  prisma: PrismaClient,
  assessment: {
    id: string;
    sourceAssessmentId: string | null;
    type: SessionType;
  },
): Promise<BankSummary> {
  const rootId = rootBankId(assessment);
  const [byKind, practical, root] = await Promise.all([
    prisma.mCQQuestion.groupBy({
      by: ['questionType'],
      where: { assessmentId: rootId, isPublished: true },
      _count: { _all: true },
    }),
    prisma.practicalQuestion.count({
      where: { assessmentId: rootId, isPublished: true },
    }),
    prisma.assessment.findUnique({
      where: { id: rootId },
      select: { format: true },
    }),
  ]);
  const mcq =
    byKind.find((k) => k.questionType === QuestionKind.MCQ)?._count._all ?? 0;
  const trueFalse =
    byKind.find((k) => k.questionType === QuestionKind.TRUE_FALSE)?._count
      ._all ?? 0;
  // The Little Coders assessment has its own standard: 10 MCQ (10) + 5 True/False (5) + one
  // 25-mark practical (the Final Assessment keeps one published practical per version).
  if (root?.format === AssessmentFormat.LITTLE_CODERS_V2) {
    const wantPractical = assessment.type === SessionType.FINAL_TEST ? 2 : 1;
    return {
      counts: { mcq, trueFalse, practical },
      totalMarks:
        (mcq + trueFalse) * MARKS_PER_QUESTION +
        (practical > 0 ? LC_ASSESSMENT.practical.marks : 0),
      meetsStandard:
        mcq === LC_ASSESSMENT.mcq.count &&
        trueFalse === LC_ASSESSMENT.trueFalse.count &&
        practical === wantPractical,
      format: AssessmentFormat.LITTLE_CODERS_V2,
    };
  }
  // Pre-University CSE: 10 multiple choice (10) + 3 short answers (15) + one practical (20) = 45 marks.
  // The marks are those of the questions themselves, so an edited bank is reported as it really is.
  if (root?.format === AssessmentFormat.STRUCTURED_V1) {
    const [shorts, practicals] = await Promise.all([
      prisma.shortAnswerQuestion.findMany({
        where: { assessmentId: rootId, isPublished: true },
        select: { maxScore: true },
      }),
      prisma.practicalQuestion.findMany({
        where: { assessmentId: rootId, isPublished: true },
        select: { maxScore: true },
      }),
    ]);
    const partA = mcq * STRUCTURED_SHAPE.mcq.marksEach;
    const partB = shorts.reduce((sum, q) => sum + q.maxScore, 0);
    const partC = practicals.reduce((sum, q) => sum + q.maxScore, 0);
    return {
      counts: {
        mcq,
        trueFalse,
        practical: practicals.length,
        shortAnswers: shorts.length,
      },
      totalMarks: partA + partB + partC,
      meetsStandard:
        mcq === STRUCTURED_SHAPE.mcq.count &&
        trueFalse === 0 &&
        shorts.length === STRUCTURED_SHAPE.shortAnswer.count &&
        practicals.length === STRUCTURED_SHAPE.practical.count &&
        partA === STRUCTURED_MARKS.partA &&
        partB === STRUCTURED_MARKS.partB &&
        partC === STRUCTURED_MARKS.partC,
      format: AssessmentFormat.STRUCTURED_V1,
    };
  }
  const shape =
    assessment.type === SessionType.LEARNING
      ? null
      : TEST_SHAPES[assessment.type];
  const codingMarks =
    practical > 0 && shape?.codingProject ? shape.codingMaxScore : 0;
  return {
    counts: { mcq, trueFalse, practical },
    totalMarks: (mcq + trueFalse) * MARKS_PER_QUESTION + codingMarks,
    meetsStandard:
      !!shape &&
      mcq === shape.mcq &&
      trueFalse === shape.trueFalse &&
      practical === (shape.codingProject ? 1 : 0),
    format: AssessmentFormat.STANDARD,
  };
}
