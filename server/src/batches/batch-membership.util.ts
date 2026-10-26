// FILE PATH: server/src/batches/batch-membership.util.ts
//
// Leaving a batch, as plain transaction helpers. They live apart from the
// services so the 1-to-1 scheduler (SchedulingService) can take a student out
// of their batch inside its own transaction without depending on the batch
// module — one implementation of "leave", used everywhere.
//
// Leaving removes the classes still AHEAD of the student; everything already
// taught (finalized, or under way) stays on their record untouched.

import { LessonStatus, Prisma } from '@prisma/client';
import { lockBatch } from './batch-progress.util';

/** Deletes the classes of a batch still ahead that have no student left. */
export async function pruneEmptyFutureSessionsInTx(
  tx: Prisma.TransactionClient,
  batchId: string,
  now: Date,
): Promise<number> {
  const pruned = await tx.batchSession.deleteMany({
    where: {
      batchId,
      status: { in: [LessonStatus.UPCOMING, LessonStatus.CANCELLED] },
      start: { gt: now },
      teacherJoinedAt: null,
      participants: { none: {} },
    },
  });
  return pruned.count;
}

/** Removes a student's rows in the classes of a batch that are still ahead
 * and frees the teacher's time for any class left with nobody. */
export async function detachFutureParticipationInTx(
  tx: Prisma.TransactionClient,
  studentUserId: string,
  batchId: string,
  now: Date,
): Promise<number> {
  const removed = await tx.scheduledLesson.deleteMany({
    where: {
      studentUserId,
      batchId,
      status: { in: [LessonStatus.UPCOMING, LessonStatus.CANCELLED] },
      start: { gt: now },
    },
  });
  await pruneEmptyFutureSessionsInTx(tx, batchId, now);
  return removed.count;
}

/** Ends the student's placement in whatever batch they are in. Returns the
 * batch they left, or null when they were not in one. */
export async function leaveCurrentBatchInTx(
  tx: Prisma.TransactionClient,
  studentUserId: string,
  now: Date,
): Promise<{ id: string; name: string } | null> {
  const membership = await tx.batchMember.findFirst({
    where: { studentUserId, leftAt: null },
    include: { batch: { select: { id: true, name: true } } },
  });
  if (!membership) return null;
  await lockBatch(tx, membership.batchId);
  await detachFutureParticipationInTx(
    tx,
    studentUserId,
    membership.batchId,
    now,
  );
  await tx.batchMember.update({
    where: { id: membership.id },
    data: { leftAt: now },
  });
  return membership.batch;
}
