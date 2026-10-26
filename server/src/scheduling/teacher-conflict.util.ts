// FILE PATH: server/src/scheduling/teacher-conflict.util.ts
//
// "Is this teacher busy during [start, end)?" — one answer for everything that
// places a class on a teacher's calendar: a 1:1 lesson, a batch session, a
// marketplace availability shift.
//
// A teacher can only be in one class at a time. A batch session is ONE class
// however many students are in it, so a batch's own participant rows never
// count against it (`excludeSessionId`), while a 1:1 lesson, another batch's
// session and a booked marketplace shift always do.

import {
  BatchSession,
  LessonStatus,
  Prisma,
  ScheduledLesson,
  Shift,
} from '@prisma/client';
import { PrismaService } from '../prisma.service';

export type TeacherConflict = ScheduledLesson | BatchSession | Shift;

export async function findTeacherConflict(
  client: PrismaService | Prisma.TransactionClient,
  teacherId: string,
  start: Date,
  end: Date,
  opts: { excludeLessonId?: string; excludeSessionId?: string } = {},
): Promise<TeacherConflict | null> {
  const lessonConflict = await client.scheduledLesson.findFirst({
    where: {
      teacherId,
      status: LessonStatus.UPCOMING,
      start: { lt: end },
      end: { gt: start },
      ...(opts.excludeLessonId ? { id: { not: opts.excludeLessonId } } : {}),
      // The participants of the session being placed are that session, not a
      // second class competing with it.
      ...(opts.excludeSessionId
        ? {
            OR: [
              { batchSessionId: null },
              { batchSessionId: { not: opts.excludeSessionId } },
            ],
          }
        : {}),
    },
  });
  if (lessonConflict) return lessonConflict;

  // A session is a class even before it has a participant row.
  const sessionConflict = await client.batchSession.findFirst({
    where: {
      teacherId,
      status: LessonStatus.UPCOMING,
      start: { lt: end },
      end: { gt: start },
      ...(opts.excludeSessionId ? { id: { not: opts.excludeSessionId } } : {}),
    },
  });
  if (sessionConflict) return sessionConflict;

  return client.shift.findFirst({
    where: {
      teacherId,
      isBooked: true,
      start: { lt: end },
      end: { gt: start },
    },
  });
}

/** The human-readable "<date>, <time>" for conflict messages (Asia/Dhaka). */
export function describeDhakaMoment(date: Date): string {
  return date.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' });
}
