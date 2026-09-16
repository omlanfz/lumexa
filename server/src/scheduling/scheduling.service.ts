// FILE PATH: server/src/scheduling/scheduling.service.ts
//
// Turns an Operations assignment (teacher + course + class type) into an
// actual recurring weekly schedule and the individual generated lesson
// instances (ScheduledLesson), up to the course's `sessions` count. All
// weekday/time math happens in Asia/Dhaka (see dhaka-time.util.ts); stored
// instants are UTC.
//
// Regenerating a schedule (setStudentSchedule) never touches COMPLETED
// lessons — only rows still UPCOMING are replaced — so completed history
// and lesson numbering stay intact across reschedules.

import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ClassType, LessonStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { SetScheduleDto } from './dto/set-schedule.dto';
import {
  addDaysToDateStr,
  dhakaToUtc,
  weekdayForDateStr,
} from './dhaka-time.util';

export const CLASS_DURATION_MINUTES: Record<ClassType, number> = {
  ONE_TO_ONE: 45,
  BATCH: 60,
};

const MAX_OCCURRENCE_SCAN_DAYS = 365 * 4; // guards against an impossible/empty slot config

@Injectable()
export class SchedulingService {
  private readonly logger = new Logger(SchedulingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ─── Admin: read current schedule + lesson summary for a student ────────

  async getStudentSchedule(studentUserId: string) {
    const student = await this.prisma.user.findUnique({
      where: { id: studentUserId },
      select: {
        id: true,
        role: true,
        assignedTeacherId: true,
        assignedCourseId: true,
        assignedClassType: true,
        assignedCourse: { select: { id: true, title: true, sessions: true } },
      },
    });
    if (!student || student.role !== 'STUDENT') {
      throw new NotFoundException('Student not found.');
    }

    const [slots, lessons] = await Promise.all([
      this.prisma.recurringSlot.findMany({
        where: { studentUserId },
        orderBy: [{ weekday: 'asc' }, { hour: 'asc' }, { minute: 'asc' }],
      }),
      this.prisma.scheduledLesson.findMany({
        where: { studentUserId },
        orderBy: { lessonNumber: 'asc' },
        include: {
          teacher: { select: { user: { select: { fullName: true } } } },
          course: { select: { title: true } },
        },
      }),
    ]);

    const upcoming = lessons.filter((l) => l.status === LessonStatus.UPCOMING);
    const completed = lessons.filter(
      (l) => l.status === LessonStatus.COMPLETED,
    );

    return {
      classType: student.assignedClassType,
      assignedTeacherId: student.assignedTeacherId,
      assignedCourse: student.assignedCourse,
      slots,
      lessons: {
        upcoming,
        completed,
        totalSessions: student.assignedCourse?.sessions ?? null,
        completedCount: completed.length,
        upcomingCount: upcoming.length,
      },
    };
  }

  // ─── Admin: create/regenerate a student's recurring schedule ────────────

  async setStudentSchedule(
    studentUserId: string,
    dto: SetScheduleDto,
    adminUserId: string,
  ) {
    const student = await this.prisma.user.findUnique({
      where: { id: studentUserId },
      select: {
        id: true,
        role: true,
        fullName: true,
        assignedTeacherId: true,
        assignedCourseId: true,
      },
    });
    if (!student || student.role !== 'STUDENT') {
      throw new NotFoundException('Student not found.');
    }
    if (!student.assignedTeacherId) {
      throw new BadRequestException(
        'Assign a teacher to this student before scheduling classes.',
      );
    }
    if (!student.assignedCourseId) {
      throw new BadRequestException(
        'Assign a curriculum to this student before scheduling classes.',
      );
    }

    const course = await this.prisma.course.findUnique({
      where: { id: student.assignedCourseId },
      select: { id: true, title: true, sessions: true },
    });
    if (!course) throw new NotFoundException('Assigned course not found.');

    const teacherId = student.assignedTeacherId;
    const courseId = student.assignedCourseId;
    const classType = dto.classType as ClassType;
    const durationMinutes = CLASS_DURATION_MINUTES[classType];

    // Dedupe weekdays for validation/generation purposes but keep the
    // original list (admin may legitimately add two times on one weekday).
    const slotWeekdays = new Set(dto.slots.map((s) => s.weekday));
    const firstDateWeekday = weekdayForDateStr(dto.firstClassDate);
    if (!slotWeekdays.has(firstDateWeekday)) {
      throw new BadRequestException(
        'The first class date must fall on one of the selected weekly weekdays.',
      );
    }

    // How many lessons remain to be scheduled — completed lessons keep
    // their numbers and are never touched.
    const completedCount = await this.prisma.scheduledLesson.count({
      where: { studentUserId, courseId, status: LessonStatus.COMPLETED },
    });
    const remaining = course.sessions - completedCount;
    if (remaining <= 0) {
      throw new BadRequestException(
        `This student has already completed all ${course.sessions} lessons of ${course.title}.`,
      );
    }

    const occurrences = this.generateOccurrences(
      dto.firstClassDate,
      dto.slots,
      remaining,
    );
    if (occurrences.length < remaining) {
      throw new BadRequestException(
        'Could not generate the full lesson schedule from the given slots.',
      );
    }

    const newLessons = occurrences.map((occ, i) => {
      const start = dhakaToUtc(occ.dateStr, occ.hour, occ.minute);
      const end = new Date(start.getTime() + durationMinutes * 60_000);
      return {
        lessonNumber: completedCount + i + 1,
        start,
        end,
      };
    });

    await this.prisma.$transaction(async (tx) => {
      // Replace any not-yet-happened lessons for this student+course — they
      // were never attended, so regenerating them is not "modifying
      // completed/past lessons" and never creates duplicates.
      await tx.scheduledLesson.deleteMany({
        where: { studentUserId, courseId, status: LessonStatus.UPCOMING },
      });
      await tx.recurringSlot.deleteMany({ where: { studentUserId } });

      // Conflict-check sequentially inside the transaction so a collision
      // aborts the whole regeneration atomically.
      for (const lesson of newLessons) {
        const conflict = await this.findTeacherConflict(
          tx,
          teacherId,
          lesson.start,
          lesson.end,
        );
        if (conflict) {
          throw new BadRequestException(
            `Teacher is already booked on ${lesson.start.toLocaleString('en-US', {
              timeZone: 'Asia/Dhaka',
            })} (Asia/Dhaka). Choose a different day/time.`,
          );
        }
      }

      await tx.recurringSlot.createMany({
        data: dto.slots.map((s) => ({
          studentUserId,
          teacherId,
          courseId,
          weekday: s.weekday,
          hour: Number(s.time.slice(0, 2)),
          minute: Number(s.time.slice(3, 5)),
          classType,
        })),
      });

      await tx.scheduledLesson.createMany({
        data: newLessons.map((l) => ({
          studentUserId,
          teacherId,
          courseId,
          lessonNumber: l.lessonNumber,
          start: l.start,
          end: l.end,
          classType,
          status: LessonStatus.UPCOMING,
        })),
      });

      await tx.user.update({
        where: { id: studentUserId },
        data: { assignedClassType: classType },
      });

      return tx.scheduledLesson.findMany({
        where: { studentUserId, courseId },
        orderBy: { lessonNumber: 'asc' },
      });
    }, { timeout: 20_000, maxWait: 10_000 });

    await this.audit.log({
      actorId: adminUserId,
      actorRole: 'ADMIN',
      action: 'STUDENT_SCHEDULE_SET',
      entityType: 'User',
      entityId: studentUserId,
      afterData: {
        classType,
        firstClassDate: dto.firstClassDate,
        slots: dto.slots,
        lessonsGenerated: newLessons.length,
      },
    });

    return this.getStudentSchedule(studentUserId);
  }

  // ─── Admin: wipe a student's schedule (called on teacher/course reassignment) ──

  async clearStudentSchedule(studentUserId: string) {
    await this.prisma.$transaction([
      this.prisma.scheduledLesson.deleteMany({
        where: { studentUserId, status: LessonStatus.UPCOMING },
      }),
      this.prisma.recurringSlot.deleteMany({ where: { studentUserId } }),
    ]);
  }

  // ─── Teacher: booked lesson slots for the /schedule calendar ─────────────

  async getTeacherScheduledLessons(teacherUserId: string) {
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { userId: teacherUserId },
      select: { id: true },
    });
    if (!teacher) throw new NotFoundException('Teacher profile not found.');

    return this.prisma.scheduledLesson.findMany({
      where: {
        teacherId: teacher.id,
        status: { in: [LessonStatus.UPCOMING, LessonStatus.COMPLETED] },
      },
      orderBy: { start: 'asc' },
      include: {
        student: { select: { id: true, fullName: true, avatarUrl: true } },
        course: { select: { id: true, title: true } },
      },
    });
  }

  // ─── Student: own generated lessons for the Learning hub ─────────────────

  async getStudentScheduledLessons(
    studentUserId: string,
    status?: 'upcoming' | 'completed',
  ) {
    const where: {
      studentUserId: string;
      status?: LessonStatus | { in: LessonStatus[] };
    } = { studentUserId };
    if (status === 'upcoming') where.status = LessonStatus.UPCOMING;
    else if (status === 'completed') where.status = LessonStatus.COMPLETED;
    else where.status = { in: [LessonStatus.UPCOMING, LessonStatus.COMPLETED] };

    return this.prisma.scheduledLesson.findMany({
      where,
      orderBy: { lessonNumber: status === 'completed' ? 'desc' : 'asc' },
      include: {
        teacher: {
          select: {
            id: true,
            user: { select: { fullName: true, avatarUrl: true } },
          },
        },
        course: { select: { id: true, title: true } },
      },
    });
  }

  // ─── Conflict detection (also used by ShiftsService) ─────────────────────

  async findTeacherConflict(
    prismaOrTx: PrismaService | Prisma.TransactionClient,
    teacherId: string,
    start: Date,
    end: Date,
    excludeLessonId?: string,
  ) {
    const lessonConflict = await prismaOrTx.scheduledLesson.findFirst({
      where: {
        teacherId,
        status: LessonStatus.UPCOMING,
        ...(excludeLessonId ? { id: { not: excludeLessonId } } : {}),
        start: { lt: end },
        end: { gt: start },
      },
    });
    if (lessonConflict) return lessonConflict;

    const shiftConflict = await prismaOrTx.shift.findFirst({
      where: {
        teacherId,
        isBooked: true,
        start: { lt: end },
        end: { gt: start },
      },
    });
    return shiftConflict;
  }

  // ─── Occurrence generation ────────────────────────────────────────────────

  private generateOccurrences(
    firstDateStr: string,
    slots: { weekday: number; time: string }[],
    count: number,
  ): { dateStr: string; hour: number; minute: number }[] {
    const byWeekday = new Map<
      number,
      { hour: number; minute: number }[]
    >();
    for (const s of slots) {
      const [hh, mm] = s.time.split(':').map(Number);
      const list = byWeekday.get(s.weekday) ?? [];
      list.push({ hour: hh, minute: mm });
      byWeekday.set(s.weekday, list);
    }
    for (const list of byWeekday.values()) {
      list.sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute));
    }

    const results: { dateStr: string; hour: number; minute: number }[] = [];
    let cursor = firstDateStr;
    let scanned = 0;

    while (results.length < count && scanned < MAX_OCCURRENCE_SCAN_DAYS) {
      const weekday = weekdayForDateStr(cursor);
      const times = byWeekday.get(weekday);
      if (times) {
        for (const t of times) {
          if (results.length >= count) break;
          results.push({ dateStr: cursor, hour: t.hour, minute: t.minute });
        }
      }
      cursor = addDaysToDateStr(cursor, 1);
      scanned++;
    }

    return results;
  }

  // ─── Auto-complete lessons whose end time has passed ─────────────────────

  @Cron(CronExpression.EVERY_10_MINUTES)
  async autoCompletePastLessons() {
    try {
      const { count } = await this.prisma.scheduledLesson.updateMany({
        where: { status: LessonStatus.UPCOMING, end: { lt: new Date() } },
        data: { status: LessonStatus.COMPLETED },
      });
      if (count > 0) {
        this.logger.log(`Auto-completed ${count} scheduled lesson(s).`);
      }
    } catch (err) {
      this.logger.error('Failed to auto-complete past lessons.', err as Error);
    }
  }
}
