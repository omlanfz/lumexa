// FILE PATH: server/src/assessments/bank-summary.ts
//
// "What does this test contain?" — published question counts of an
// assessment's root bank, measured against the standard. Shared by the
// assessments service (classroom status, admin page) and the lesson-details
// endpoint, so every screen reports the same numbers.

import { AssessmentFormat, PrismaClient, QuestionKind, SessionType } from '@prisma/client';
import { MARKS_PER_QUESTION, TEST_SHAPES } from './bank/bank.constants';
import { rootBankId } from './linked-assessment';
import { LC_ASSESSMENT } from '../little-coders/lc.constants';

export interface BankSummary {
  counts: { mcq: number; trueFalse: number; practical: number };
  totalMarks: number;
  meetsStandard: boolean;
  /** How the test is taken: STANDARD, or LITTLE_CODERS_V2 (10 + 5 + a 25-mark practical). */
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
    prisma.assessment.findUnique({ where: { id: rootId }, select: { format: true } }),
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
      totalMarks: (mcq + trueFalse) * MARKS_PER_QUESTION + (practical > 0 ? LC_ASSESSMENT.practical.marks : 0),
      meetsStandard: mcq === LC_ASSESSMENT.mcq.count && trueFalse === LC_ASSESSMENT.trueFalse.count && practical === wantPractical,
      format: AssessmentFormat.LITTLE_CODERS_V2,
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
