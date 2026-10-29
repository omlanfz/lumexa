// FILE PATH: server/src/submissions/homework-target.ts
//
// Which class a homework hand-in belongs to, and whether the student may hand
// anything in yet. Shared by the file upload and the submission itself, so a file
// is never stored for homework that could not then be submitted.
//
// Homework unlocks once the student has had the lesson — COMPLETED or
// PARTIALLY_COMPLETED, on this class or on the other class of the same lesson. A
// lesson has ONE homework slot, owned by its earliest finalized class, so a
// hand-in from the extra class of a partially completed lesson lands on (and
// updates) the same submission.

import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { findCanonicalCompletedRow } from '../scheduling/lesson-state.util';

export interface HomeworkTarget {
  /** The class that owns the lesson's homework slot. */
  scheduledLessonId: string;
  lessonId: string;
  teacherId: string;
  courseId: string;
}

export async function resolveHomeworkTarget(
  prisma: PrismaService,
  studentUserId: string,
  scheduledLessonId: string,
): Promise<HomeworkTarget> {
  const sl = await prisma.scheduledLesson.findUnique({
    where: { id: scheduledLessonId },
    select: {
      id: true,
      studentUserId: true,
      teacherId: true,
      courseId: true,
      lessonNumber: true,
      lesson: { select: { id: true, homework: true } },
    },
  });
  if (!sl) throw new NotFoundException('Scheduled lesson not found.');
  if (sl.studentUserId !== studentUserId) {
    throw new ForbiddenException('This is not your class.');
  }

  const canonical = await findCanonicalCompletedRow(prisma, sl);
  if (!canonical) {
    throw new BadRequestException(
      'This lesson is not completed yet — homework unlocks once the class is finished.',
    );
  }
  if (canonical.id !== sl.id) {
    return resolveHomeworkTarget(prisma, studentUserId, canonical.id);
  }
  if (!sl.lesson?.homework) {
    throw new BadRequestException('This lesson has no homework to submit.');
  }
  return {
    scheduledLessonId: sl.id,
    lessonId: sl.lesson.id,
    teacherId: sl.teacherId,
    courseId: sl.courseId,
  };
}
