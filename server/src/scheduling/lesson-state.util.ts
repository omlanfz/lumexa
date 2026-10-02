// FILE PATH: server/src/scheduling/lesson-state.util.ts
//
// One authoritative answer to "has this student had this lesson?" for every
// feature that cares (lesson access, homework, progress counts).
//
// A lesson (student + curriculum + lessonNumber) can be backed by more than
// one finalized class: a PARTIALLY_COMPLETED class plus the extra class that
// follows it. Both count as "completed" and both unlock the lesson's
// materials, but the lesson is still ONE lesson — it has one homework slot and
// counts once toward progress. The earliest finalized class (by start) is the
// canonical row for that lesson.

import { LessonStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';

/** Finalized statuses that count as "the student has had this lesson":
 * lesson access, progress and homework all treat these alike. */
export const COUNTS_AS_COMPLETED: LessonStatus[] = [
  LessonStatus.COMPLETED,
  LessonStatus.PARTIALLY_COMPLETED,
];

interface LessonRowRef {
  id: string;
  studentUserId: string;
  courseId: string;
  lessonNumber: number;
}

/** Earliest counted-as-completed class for the same lesson as `row` (which may
 * itself be an UPCOMING extra class), or null if the student hasn't had it. */
export async function findCanonicalCompletedRow(
  prisma: PrismaService,
  row: Omit<LessonRowRef, 'id'>,
) {
  return prisma.scheduledLesson.findFirst({
    where: {
      studentUserId: row.studentUserId,
      courseId: row.courseId,
      lessonNumber: row.lessonNumber,
      status: { in: COUNTS_AS_COMPLETED },
    },
    orderBy: { start: 'asc' },
  });
}

/** Keeps only rows that are the canonical completed class of their lesson —
 * drops the second class of a lesson that was partially completed, so
 * per-lesson lists (e.g. "homework to submit") never show a lesson twice. */
export async function keepCanonicalRows<T extends LessonRowRef>(
  prisma: PrismaService,
  rows: T[],
): Promise<T[]> {
  if (rows.length === 0) return rows;
  const siblings = await prisma.scheduledLesson.findMany({
    where: {
      OR: rows.map((r) => ({
        studentUserId: r.studentUserId,
        courseId: r.courseId,
        lessonNumber: r.lessonNumber,
      })),
      status: { in: COUNTS_AS_COMPLETED },
    },
    orderBy: { start: 'asc' },
    select: {
      id: true,
      studentUserId: true,
      courseId: true,
      lessonNumber: true,
    },
  });
  const canonicalId = new Map<string, string>();
  for (const s of siblings) {
    const key = `${s.studentUserId}:${s.courseId}:${s.lessonNumber}`;
    if (!canonicalId.has(key)) canonicalId.set(key, s.id);
  }
  return rows.filter(
    (r) =>
      canonicalId.get(`${r.studentUserId}:${r.courseId}:${r.lessonNumber}`) ===
      r.id,
  );
}
