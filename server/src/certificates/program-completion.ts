// FILE PATH: server/src/certificates/program-completion.ts
//
// "Has this student finished the final scheduled class of this programme?" —
// answered from the platform's own programme and class records, with no lesson
// count written down anywhere: programmes differ in length (a 28-session pathway,
// the 85-session Odyssey, an admin's custom curriculum), so the last lesson is
// read from the programme itself.
//
// It is the same definition the platform already uses for "the student has
// finished the programme" (SubmissionsFilesService.studentsWhoFinished):
//
//   • the programme's LAST lesson is the larger of Course.sessions and the highest
//     Lesson.order (so a programme whose lessons are not all written yet is not
//     mistaken for a finished one);
//   • the student has had it — a COMPLETED / PARTIALLY_COMPLETED class at, or after,
//     that lesson number (a batch student who joined part-way never had the early
//     lessons, so earlier lessons are not required);
//   • and NO class of the programme is still UPCOMING (a partially completed last
//     lesson has an extra class coming, so it is not over until that is taken).
//
// The completion date is the Asia/Dhaka calendar day of the LAST class the
// student actually had in the programme — "the actual date on which the student's
// final programme class took place". It is the date OFFERED to the admin, who
// confirms or corrects it before anything is issued.
//
// This answers a factual question about classes only. It says nothing about
// whether the student deserves a certificate: that is the admin's call, always.

import { LessonStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { COUNTS_AS_COMPLETED } from '../scheduling/lesson-state.util';
import { utcToDhakaParts } from '../scheduling/dhaka-time.util';

export interface ProgramCompletion {
  studentUserId: string;
  courseId: string;
  /** The ScheduledLesson that was the student's last class in the programme. */
  finalClassId: string;
  /** When that class started. */
  completedAt: Date;
  /** Its Asia/Dhaka calendar day, 'YYYY-MM-DD'. */
  completionDate: string;
  /** Lessons of the programme the student had (distinct lesson numbers) and the
   * programme's last lesson number — facts for the admin, not a verdict. */
  lessonsTaken: number;
  lastLesson: number;
}

/** The completion record for a student's programme, or null when the final
 * scheduled class has not been completed yet. */
export async function findProgramCompletion(
  prisma: Pick<PrismaService, 'course' | 'lesson' | 'scheduledLesson'>,
  studentUserId: string,
  courseId: string,
): Promise<ProgramCompletion | null> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { sessions: true },
  });
  if (!course) return null;
  const highest = await prisma.lesson.aggregate({
    where: { courseId },
    _max: { order: true },
  });
  const lastLesson = Math.max(course.sessions, highest._max.order ?? 0);
  if (lastLesson <= 0) return null;

  const hadLastLesson = await prisma.scheduledLesson.findFirst({
    where: {
      studentUserId,
      courseId,
      lessonNumber: { gte: lastLesson },
      status: { in: COUNTS_AS_COMPLETED },
    },
    select: { id: true },
  });
  if (!hadLastLesson) return null;

  const stillComing = await prisma.scheduledLesson.findFirst({
    where: { studentUserId, courseId, status: LessonStatus.UPCOMING },
    select: { id: true },
  });
  if (stillComing) return null;

  const finalClass = await prisma.scheduledLesson.findFirst({
    where: { studentUserId, courseId, status: { in: COUNTS_AS_COMPLETED } },
    orderBy: [{ start: 'desc' }, { id: 'desc' }],
    select: { id: true, start: true },
  });
  if (!finalClass) return null;

  const taken = await prisma.scheduledLesson.findMany({
    where: { studentUserId, courseId, status: { in: COUNTS_AS_COMPLETED } },
    distinct: ['lessonNumber'],
    select: { lessonNumber: true },
  });

  return {
    studentUserId,
    courseId,
    finalClassId: finalClass.id,
    completedAt: finalClass.start,
    completionDate: utcToDhakaParts(finalClass.start).dateStr,
    lessonsTaken: taken.length,
    lastLesson,
  };
}
