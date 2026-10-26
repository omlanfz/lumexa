// FILE PATH: server/src/batches/testing/batch-fixtures.ts
//
// Builds real batches straight in the database for the integration specs that
// need a batch class as their starting point (the classroom, the badges, the
// class tests): the Batch, its members, ONE BatchSession and a participant row
// (ScheduledLesson) per student — exactly the shape the services write, so the
// specs exercise the same data the app does.

import { ClassType, LessonStatus, Prisma } from '@prisma/client';
import { utcToDhakaParts } from '../../scheduling/dhaka-time.util';
import { PrismaService } from '../../prisma.service';

type Client = PrismaService | Prisma.TransactionClient;

let counter = 0;

export interface BatchFixtureInput {
  name?: string;
  teacherProfileId: string;
  courseId: string;
  /** The students who are members of the batch and take part in the class. */
  studentUserIds: string[];
  /** UTC instants of the class. `end` defaults to start + 60 minutes. */
  start: Date;
  end?: Date;
  lessonNumber: number;
  lessonId?: string | null;
  /** The class's status (participant rows start with the same one). */
  status?: LessonStatus;
  maxStudents?: number;
  startLessonNumber?: number;
  /** Students who have already come into the class. */
  joined?: string[];
  /** When the teacher came in (a class the teacher has opened). */
  teacherJoinedAt?: Date | null;
}

export interface BatchFixture {
  batchId: string;
  sessionId: string;
  /** studentUserId → that student's row (ScheduledLesson id) in the class. */
  lessonIds: Record<string, string>;
}

/** A batch with one class and a row for every student. */
export async function createBatchWithSession(
  prisma: Client,
  input: BatchFixtureInput,
): Promise<BatchFixture> {
  counter += 1;
  const end = input.end ?? new Date(input.start.getTime() + 60 * 60_000);
  const status = input.status ?? LessonStatus.UPCOMING;
  const dhaka = utcToDhakaParts(input.start);
  const [hour, minute] = dhaka.time.split(':').map(Number);

  const batch = await prisma.batch.create({
    data: {
      name: input.name ?? `Fixture batch ${counter}`,
      teacherId: input.teacherProfileId,
      courseId: input.courseId,
      maxStudents: input.maxStudents ?? 9,
      startLessonNumber: input.startLessonNumber ?? input.lessonNumber,
      startDate: dhaka.dateStr,
      slots: {
        create: [{ weekday: dhaka.weekday, hour, minute }],
      },
    },
  });
  const session = await prisma.batchSession.create({
    data: {
      batchId: batch.id,
      teacherId: input.teacherProfileId,
      courseId: input.courseId,
      lessonNumber: input.lessonNumber,
      lessonId: input.lessonId ?? null,
      start: input.start,
      end,
      status,
      teacherJoinedAt: input.teacherJoinedAt ?? null,
    },
  });

  const lessonIds: Record<string, string> = {};
  for (const studentUserId of input.studentUserIds) {
    await prisma.batchMember.create({
      data: { batchId: batch.id, studentUserId },
    });
    await prisma.user.update({
      where: { id: studentUserId },
      data: { assignedClassType: ClassType.BATCH },
    });
    lessonIds[studentUserId] = await addParticipant(prisma, {
      batchId: batch.id,
      sessionId: session.id,
      studentUserId,
      teacherProfileId: input.teacherProfileId,
      courseId: input.courseId,
      lessonNumber: input.lessonNumber,
      lessonId: input.lessonId ?? null,
      start: input.start,
      end,
      status,
      joined: input.joined?.includes(studentUserId) ?? false,
      teacherJoinedAt: input.teacherJoinedAt ?? null,
    });
  }
  return { batchId: batch.id, sessionId: session.id, lessonIds };
}

/** One more student's row in a class that already exists. */
export async function addParticipant(
  prisma: Client,
  p: {
    batchId: string;
    sessionId: string;
    studentUserId: string;
    teacherProfileId: string;
    courseId: string;
    lessonNumber: number;
    lessonId?: string | null;
    start: Date;
    end: Date;
    status?: LessonStatus;
    joined?: boolean;
    teacherJoinedAt?: Date | null;
  },
): Promise<string> {
  const row = await prisma.scheduledLesson.create({
    data: {
      studentUserId: p.studentUserId,
      teacherId: p.teacherProfileId,
      courseId: p.courseId,
      lessonNumber: p.lessonNumber,
      lessonId: p.lessonId ?? null,
      start: p.start,
      end: p.end,
      classType: ClassType.BATCH,
      batchId: p.batchId,
      batchSessionId: p.sessionId,
      status: p.status ?? LessonStatus.UPCOMING,
      studentJoinedAt: p.joined ? new Date() : null,
      teacherJoinedAt: p.teacherJoinedAt ?? null,
    },
  });
  return row.id;
}

/** A later class of the same batch (the next lesson of its one sequence), with
 * a row for each of the given students. */
export async function addSession(
  prisma: Client,
  p: {
    batchId: string;
    teacherProfileId: string;
    courseId: string;
    studentUserIds: string[];
    lessonNumber: number;
    lessonId?: string | null;
    start: Date;
    end?: Date;
    status?: LessonStatus;
  },
): Promise<BatchFixture> {
  const end = p.end ?? new Date(p.start.getTime() + 60 * 60_000);
  const status = p.status ?? LessonStatus.UPCOMING;
  const session = await prisma.batchSession.create({
    data: {
      batchId: p.batchId,
      teacherId: p.teacherProfileId,
      courseId: p.courseId,
      lessonNumber: p.lessonNumber,
      lessonId: p.lessonId ?? null,
      start: p.start,
      end,
      status,
    },
  });
  const lessonIds: Record<string, string> = {};
  for (const studentUserId of p.studentUserIds) {
    lessonIds[studentUserId] = await addParticipant(prisma, {
      batchId: p.batchId,
      sessionId: session.id,
      studentUserId,
      teacherProfileId: p.teacherProfileId,
      courseId: p.courseId,
      lessonNumber: p.lessonNumber,
      lessonId: p.lessonId ?? null,
      start: p.start,
      end,
      status,
    });
  }
  return { batchId: p.batchId, sessionId: session.id, lessonIds };
}
