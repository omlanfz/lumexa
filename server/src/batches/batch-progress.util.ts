// FILE PATH: server/src/batches/batch-progress.util.ts
//
// Where a batch is in its curriculum, where a student is, and the locks that
// keep concurrent admin actions from racing. Plain functions over a Prisma
// client or transaction, shared by the batch services.

import { LessonStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import {
  DEAD_SESSION_AFTER_MINUTES,
  SESSION_FREEZE_MINUTES,
} from './batch.constants';

export type Db = PrismaService | Prisma.TransactionClient;

export interface BatchProgress {
  /** The highest lesson a COMPLETED class of this batch has taught. */
  completedThrough: number | null;
  /** The highest lesson among classes that are under way or about to open. */
  frozenMax: number | null;
  /** The lesson the next class that is not generated yet will teach. */
  nextLesson: number;
  /** The lesson of the first class a student joining now would attend. */
  firstFutureLesson: number | null;
  futureSessions: number;
}

export function freezeCutoff(now: Date): Date {
  return new Date(now.getTime() + SESSION_FREEZE_MINUTES * 60_000);
}

/** Classes that started before this with nobody in them never happened. */
export function deadSessionCutoff(now: Date): Date {
  return new Date(now.getTime() - DEAD_SESSION_AFTER_MINUTES * 60_000);
}

/** A past class that nobody — teacher or student — ever joined. */
export function deadSessionWhere(
  batchId: string,
  now: Date,
): Prisma.BatchSessionWhereInput {
  return {
    batchId,
    status: LessonStatus.UPCOMING,
    start: { lt: deadSessionCutoff(now) },
    teacherJoinedAt: null,
    participants: { none: { studentJoinedAt: { not: null } } },
  };
}

/**
 * The batch's position in the curriculum. Like a student's progress it counts
 * COMPLETED classes only: a PARTIALLY_COMPLETED class unlocks its lesson but
 * the extra class that follows teaches the same lesson again.
 */
export async function loadBatchProgress(
  db: Db,
  batch: { id: string; startLessonNumber: number },
  now = new Date(),
): Promise<BatchProgress> {
  const cutoff = freezeCutoff(now);
  const [completed, frozen, firstFuture, futureSessions] = await Promise.all([
    db.batchSession.aggregate({
      where: { batchId: batch.id, status: LessonStatus.COMPLETED },
      _max: { lessonNumber: true },
    }),
    // Under way, opening soon, or held but not yet finalized — a class that
    // never happened (see deadSessionWhere) is not progress.
    db.batchSession.aggregate({
      where: {
        batchId: batch.id,
        status: LessonStatus.UPCOMING,
        start: { lte: cutoff },
        NOT: deadSessionWhere(batch.id, now),
      },
      _max: { lessonNumber: true },
    }),
    db.batchSession.findFirst({
      where: {
        batchId: batch.id,
        status: LessonStatus.UPCOMING,
        start: { gt: now },
      },
      orderBy: { start: 'asc' },
      select: { lessonNumber: true },
    }),
    db.batchSession.count({
      where: {
        batchId: batch.id,
        status: LessonStatus.UPCOMING,
        start: { gt: now },
      },
    }),
  ]);

  const completedThrough = completed._max.lessonNumber ?? null;
  const frozenMax = frozen._max.lessonNumber ?? null;
  const highest = Math.max(completedThrough ?? 0, frozenMax ?? 0);
  return {
    completedThrough,
    frozenMax,
    nextLesson: highest > 0 ? highest + 1 : batch.startLessonNumber,
    firstFutureLesson: firstFuture?.lessonNumber ?? null,
    futureSessions,
  };
}

/** The lesson a student is on in a curriculum: one past their highest
 * COMPLETED lesson (same rule SchedulingService uses to number a schedule). */
export async function studentNextLesson(
  db: Db,
  studentUserId: string,
  courseId: string,
): Promise<number> {
  const agg = await db.scheduledLesson.aggregate({
    where: { studentUserId, courseId, status: LessonStatus.COMPLETED },
    _max: { lessonNumber: true },
  });
  return (agg._max.lessonNumber ?? 0) + 1;
}

/** Lesson numbers the student has already completed in a curriculum. */
export async function studentCompletedLessonNumbers(
  db: Db,
  studentUserIds: string[],
  courseId: string,
): Promise<Map<string, Set<number>>> {
  const rows = await db.scheduledLesson.findMany({
    where: {
      studentUserId: { in: studentUserIds },
      courseId,
      status: LessonStatus.COMPLETED,
    },
    select: { studentUserId: true, lessonNumber: true },
  });
  const map = new Map<string, Set<number>>();
  for (const id of studentUserIds) map.set(id, new Set());
  for (const r of rows) map.get(r.studentUserId)!.add(r.lessonNumber);
  return map;
}

/** Serialises everything that changes one batch (membership, capacity,
 * schedule) for the rest of the transaction. */
export async function lockBatch(
  tx: Prisma.TransactionClient,
  batchId: string,
): Promise<void> {
  await tx.$queryRaw`SELECT "id" FROM "Batch" WHERE "id" = ${batchId} FOR UPDATE`;
}

/** Locks several batches in one fixed order, so two admins moving students in
 * opposite directions between the same batches can never deadlock. */
export async function lockBatches(
  tx: Prisma.TransactionClient,
  batchIds: (string | null | undefined)[],
): Promise<void> {
  const ids = [...new Set(batchIds.filter((id): id is string => !!id))].sort();
  for (const id of ids) await lockBatch(tx, id);
}

/** Serialises placements of one student, so two admins can never put the same
 * student in two batches at once. */
export async function lockStudentPlacement(
  tx: Prisma.TransactionClient,
  studentUserId: string,
): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'student-batch:' + studentUserId}))`;
}

/** Students who attend a batch's classes: placed in it and not paused. */
export function participatingMemberWhere(
  batchId: string,
): Prisma.BatchMemberWhereInput {
  return { batchId, leftAt: null, student: { accountStatus: 'ACTIVE' } };
}
