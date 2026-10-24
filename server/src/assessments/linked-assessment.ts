// FILE PATH: server/src/assessments/linked-assessment.ts
//
// A custom curriculum's imported test session must have a question bank, but
// copying questions would fork them from the original (a fix made once would
// never reach the copy). Instead the lesson gets its OWN Assessment row — own
// attempts, own publish/pass settings — whose questions are read from the
// original ("root") bank via Assessment.sourceAssessmentId.
//
// This module is the single place that decides what such a row looks like. It
// is used when an admin imports lessons (CurriculumService), when an admin
// links a bank by hand (AssessmentsService.attachBankToLesson), and by the
// boot-time safety net (bank.sync.ts) — the SQL migration does the same for
// lessons imported before this existed.

import { Prisma, PrismaClient, SessionType } from '@prisma/client';

type Db = PrismaClient | Prisma.TransactionClient;

export interface BankOwnerRef {
  id: string;
  sourceAssessmentId: string | null;
  title: string;
  instructions: string | null;
  mcqCount: number;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  passScorePct: number;
  vivaMaxScore: number;
  isPublished: boolean;
  bankVersion: number;
}

/** The root bank an assessment's questions live on: itself, or — if it is
 *  already linked — whatever it links to. Links never chain. */
export function rootBankId(a: {
  id: string;
  sourceAssessmentId: string | null;
}): string {
  return a.sourceAssessmentId ?? a.id;
}

export function linkedAssessmentData(
  lessonId: string,
  type: SessionType,
  source: BankOwnerRef,
): Prisma.AssessmentUncheckedCreateInput {
  return {
    lessonId,
    type,
    title: source.title,
    instructions: source.instructions,
    mcqCount: source.mcqCount,
    randomizeQuestions: source.randomizeQuestions,
    randomizeOptions: source.randomizeOptions,
    passScorePct: source.passScorePct,
    vivaMaxScore: source.vivaMaxScore,
    isPublished: source.isPublished,
    sourceAssessmentId: rootBankId(source),
    bankVersion: source.bankVersion,
  };
}

/** Creates the linked Assessment for `lessonId` unless it already has one.
 *  Returns true when a row was created. Safe to call repeatedly and
 *  concurrently (Assessment.lessonId is unique). */
export async function ensureLinkedAssessment(
  db: Db,
  lessonId: string,
  type: SessionType,
  source: BankOwnerRef,
): Promise<boolean> {
  if (type === SessionType.LEARNING) return false;
  const existing = await db.assessment.findUnique({
    where: { lessonId },
    select: { id: true },
  });
  if (existing) return false;
  try {
    await db.assessment.create({
      data: linkedAssessmentData(lessonId, type, source),
    });
    return true;
  } catch (err) {
    if ((err as { code?: string })?.code === 'P2002') return false; // created concurrently
    throw err;
  }
}

export const BANK_OWNER_SELECT = {
  id: true,
  sourceAssessmentId: true,
  title: true,
  instructions: true,
  mcqCount: true,
  randomizeQuestions: true,
  randomizeOptions: true,
  passScorePct: true,
  vivaMaxScore: true,
  isPublished: true,
  bankVersion: true,
} as const;
