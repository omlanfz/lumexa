// FILE PATH: server/src/assessments/bank-summary.ts
//
// "What does this test contain?" — published question counts of an
// assessment's root bank, measured against the standard. Shared by the
// assessments service (classroom status, admin page) and the lesson-details
// endpoint, so every screen reports the same numbers.

import { PrismaClient, QuestionKind, SessionType } from '@prisma/client';
import { MARKS_PER_QUESTION, TEST_SHAPES } from './bank/bank.constants';
import { rootBankId } from './linked-assessment';

export interface BankSummary {
  counts: { mcq: number; trueFalse: number; practical: number };
  totalMarks: number;
  meetsStandard: boolean;
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
  const [byKind, practical] = await Promise.all([
    prisma.mCQQuestion.groupBy({
      by: ['questionType'],
      where: { assessmentId: rootId, isPublished: true },
      _count: { _all: true },
    }),
    prisma.practicalQuestion.count({
      where: { assessmentId: rootId, isPublished: true },
    }),
  ]);
  const mcq =
    byKind.find((k) => k.questionType === QuestionKind.MCQ)?._count._all ?? 0;
  const trueFalse =
    byKind.find((k) => k.questionType === QuestionKind.TRUE_FALSE)?._count
      ._all ?? 0;
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
  };
}
