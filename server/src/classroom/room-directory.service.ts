// FILE PATH: server/src/classroom/room-directory.service.ts
//
// "Who belongs to this classroom?" — the one place a LiveKit room name is
// turned back into the people and lessons behind it. A leaf service (Prisma
// only) so the join flow, the teacher-only controls, the room limits, the
// recording service and the badge system can all ask the same question
// without depending on each other.
//
//   lesson-<id>                one 1:1 lesson: its teacher and its student
//   batch-session-<id>         one batch class: its teacher and every student
//                              taking part (one participant row each)
//   batch-<teacherId>-<start>  LEGACY batch room (a class that was already
//                              running when batches got real sessions)
//   trial-<trialLeadId>        a free trial class: its assigned teacher (no
//                              lessons — a trial has no ScheduledLesson)
//   <bookingId>                a marketplace booking: its teacher
//   the demo room              the QA demo teacher

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClassType, LessonStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { DEMO_TEACHER_EMAIL, getRoomRef } from './room-ref.util';

export interface RoomLesson {
  id: string;
  studentUserId: string;
  studentName: string;
  courseId: string;
  lessonNumber: number;
  status: LessonStatus;
  classType: ClassType;
  teacherId: string;
  start: Date;
  end: Date;
  studentJoinedAt: Date | null;
  teacherJoinedAt: Date | null;
  batchSessionId: string | null;
}

export interface ResolvedRoom {
  room: string;
  kind: 'lesson' | 'batch' | 'booking' | 'trial' | 'demo';
  teacherUserId: string;
  classType: ClassType;
  /** The lessons held in this room: the one lesson of a 1:1 class, every
   * (non-cancelled) student's lesson of a batch, none for a booking/demo. */
  lessons: RoomLesson[];
  /** Set for a batch class: the shared class and the batch it belongs to. */
  batchSessionId?: string;
  batch?: { id: string; name: string };
}

const LESSON_WITH_PEOPLE = {
  teacher: { select: { userId: true } },
  student: { select: { fullName: true } },
} as const;

@Injectable()
export class RoomDirectoryService {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(room: string): Promise<ResolvedRoom> {
    const ref = getRoomRef(room);

    if (ref.kind === 'demo') {
      const teacher = await this.prisma.user.findUnique({
        where: { email: DEMO_TEACHER_EMAIL },
        select: { id: true },
      });
      if (!teacher) throw new BadRequestException('Classroom not found.');
      return {
        room,
        kind: 'demo',
        teacherUserId: teacher.id,
        classType: ClassType.ONE_TO_ONE,
        lessons: [],
      };
    }

    if (ref.kind === 'trial') {
      const trial = await this.prisma.trialLead.findUnique({
        where: { id: ref.trialLeadId },
        select: { teacher: { select: { userId: true } } },
      });
      // An unassigned trial has no classroom: nobody is its teacher yet.
      if (!trial?.teacher) throw new NotFoundException('Class not found.');
      return {
        room,
        kind: 'trial',
        teacherUserId: trial.teacher.userId,
        classType: ClassType.ONE_TO_ONE,
        lessons: [],
      };
    }

    if (ref.kind === 'lesson') {
      const lesson = await this.prisma.scheduledLesson.findUnique({
        where: { id: ref.scheduledLessonId },
        include: LESSON_WITH_PEOPLE,
      });
      if (!lesson) throw new NotFoundException('Class not found.');
      return {
        room,
        kind: 'lesson',
        teacherUserId: lesson.teacher.userId,
        classType: lesson.classType,
        lessons: [toRoomLesson(lesson)],
      };
    }

    if (ref.kind === 'session') {
      const session = await this.prisma.batchSession.findUnique({
        where: { id: ref.batchSessionId },
        include: {
          teacher: { select: { userId: true } },
          batch: { select: { id: true, name: true } },
          participants: {
            where: { status: { not: LessonStatus.CANCELLED } },
            include: LESSON_WITH_PEOPLE,
            orderBy: { id: 'asc' },
          },
        },
      });
      if (!session) throw new NotFoundException('Class not found.');
      return {
        room,
        kind: 'batch',
        teacherUserId: session.teacher.userId,
        classType: ClassType.BATCH,
        lessons: session.participants.map(toRoomLesson),
        batchSessionId: session.id,
        batch: session.batch,
      };
    }

    if (ref.kind === 'batch') {
      const lessons = await this.prisma.scheduledLesson.findMany({
        where: {
          teacherId: ref.teacherId,
          classType: ClassType.BATCH,
          start: new Date(ref.startMs),
          status: { not: LessonStatus.CANCELLED },
        },
        include: LESSON_WITH_PEOPLE,
        orderBy: { id: 'asc' },
      });
      if (lessons.length === 0) throw new NotFoundException('Class not found.');
      return {
        room,
        kind: 'batch',
        teacherUserId: lessons[0].teacher.userId,
        classType: ClassType.BATCH,
        lessons: lessons.map(toRoomLesson),
        batchSessionId: lessons[0].batchSessionId ?? undefined,
      };
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id: ref.bookingId },
      include: { shift: { include: { teacher: true } } },
    });
    if (!booking) throw new BadRequestException('Classroom not found.');
    return {
      room,
      kind: 'booking',
      teacherUserId: booking.shift.teacher.userId,
      classType: ClassType.ONE_TO_ONE,
      lessons: [],
    };
  }

  async teacherUserIdOf(room: string): Promise<string> {
    return (await this.resolve(room)).teacherUserId;
  }
}

function toRoomLesson(l: {
  id: string;
  studentUserId: string;
  courseId: string;
  lessonNumber: number;
  status: LessonStatus;
  classType: ClassType;
  teacherId: string;
  start: Date;
  end: Date;
  studentJoinedAt: Date | null;
  teacherJoinedAt: Date | null;
  batchSessionId: string | null;
  student: { fullName: string };
}): RoomLesson {
  return {
    id: l.id,
    studentUserId: l.studentUserId,
    studentName: l.student.fullName,
    courseId: l.courseId,
    lessonNumber: l.lessonNumber,
    status: l.status,
    classType: l.classType,
    teacherId: l.teacherId,
    start: l.start,
    end: l.end,
    studentJoinedAt: l.studentJoinedAt,
    teacherJoinedAt: l.teacherJoinedAt,
    batchSessionId: l.batchSessionId,
  };
}
