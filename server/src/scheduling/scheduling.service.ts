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
import { ClassType, LessonStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { SetScheduleDto } from './dto/set-schedule.dto';
import {
  addDaysToDateStr,
  dhakaToUtc,
  todayDhakaDateStr,
  utcToDhakaParts,
  weekdayForDateStr,
} from './dhaka-time.util';
import { computeLateMinutes } from './lesson-window.util';

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

    const catalogLessons = await this.prisma.lesson.findMany({
      where: { courseId: student.assignedCourseId },
      select: { id: true, order: true },
    });
    const lessonIdByOrder = new Map(catalogLessons.map((l) => [l.order, l.id]));

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

    // A schedule can't start in the past — the first class date (Asia/Dhaka
    // calendar day) must be today or later. Checked as a plain string
    // comparison since both sides are 'YYYY-MM-DD'.
    if (dto.firstClassDate < todayDhakaDateStr()) {
      throw new BadRequestException(
        'The first class date cannot be in the past.',
      );
    }

    // The next lesson to schedule starts right after the highest
    // lessonNumber this student has already completed — MAX, not a plain
    // count, because lessonNumber always equals the catalog Lesson's
    // absolute `order` (learning AND test sessions share one sequence) and
    // can have historical gaps (e.g. a course migrated from an older
    // test-less structure — see curriculum-catalog.seed.ts). Using a count
    // here would double-book positions already covered by a gap-preceding
    // completed lesson.
    const completedAgg = await this.prisma.scheduledLesson.aggregate({
      where: { studentUserId, courseId, status: LessonStatus.COMPLETED },
      _max: { lessonNumber: true },
    });
    const completedCount = completedAgg._max.lessonNumber ?? 0;
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
      const lessonNumber = completedCount + i + 1;
      return {
        lessonNumber,
        lessonId: lessonIdByOrder.get(lessonNumber) ?? null,
        start,
        end,
      };
    });

    // Belt-and-braces on top of the calendar-date check above: catches the
    // same-day case where the date is technically "today" but the specific
    // time slot has already gone by (e.g. scheduling a 6am slot at 8pm).
    if (newLessons[0] && newLessons[0].start <= new Date()) {
      throw new BadRequestException(
        'The first class time has already passed. Choose a date/time in the future.',
      );
    }

    await this.prisma.$transaction(
      async (tx) => {
        // Replace any not-yet-happened lessons for this student+course — they
        // were never attended, so regenerating them is not "modifying
        // completed/past lessons" and never creates duplicates. Includes
        // CANCELLED (e.g. an admin override cancellation from the Classes
        // page) as well as UPCOMING: leaving a cancelled row behind would
        // occupy its lessonNumber and collide with the freshly generated
        // sequence below (@@unique([studentUserId, courseId, lessonNumber])).
        await tx.scheduledLesson.deleteMany({
          where: {
            studentUserId,
            courseId,
            status: { in: [LessonStatus.UPCOMING, LessonStatus.CANCELLED] },
          },
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
              `Teacher is already booked on ${lesson.start.toLocaleString(
                'en-US',
                {
                  timeZone: 'Asia/Dhaka',
                },
              )} (Asia/Dhaka). Choose a different day/time.`,
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
            lessonId: l.lessonId ?? undefined,
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
      },
      { timeout: 20_000, maxWait: 10_000 },
    );

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

  // ─── Admin: single-lesson overrides from the Classes page ───────────────
  //
  // Unlike setStudentSchedule (regenerates the whole remaining schedule),
  // these act on one already-generated ScheduledLesson row — the admin
  // equivalent of RescheduleService.adminReschedule/adminCancel for the
  // legacy Booking model.

  async adminRescheduleLesson(
    lessonId: string,
    newStart: Date,
    newEnd: Date,
    adminUserId: string,
  ) {
    if (newEnd <= newStart) {
      throw new BadRequestException('End time must be after start time.');
    }
    const lesson = await this.prisma.scheduledLesson.findUnique({
      where: { id: lessonId },
    });
    if (!lesson) throw new NotFoundException('Class not found.');
    if (lesson.status !== LessonStatus.UPCOMING) {
      throw new BadRequestException(
        'Only upcoming classes can be rescheduled.',
      );
    }

    const conflict = await this.findTeacherConflict(
      this.prisma,
      lesson.teacherId,
      newStart,
      newEnd,
      lessonId,
    );
    if (conflict) {
      throw new BadRequestException(
        'Teacher is already booked in that window. Choose a different time.',
      );
    }

    const updated = await this.prisma.scheduledLesson.update({
      where: { id: lessonId },
      data: { start: newStart, end: newEnd },
    });

    await this.audit.log({
      actorId: adminUserId,
      actorRole: 'ADMIN',
      action: 'ADMIN_LESSON_RESCHEDULE',
      entityType: 'ScheduledLesson',
      entityId: lessonId,
      beforeData: { start: lesson.start, end: lesson.end },
      afterData: { start: newStart, end: newEnd },
    });

    return updated;
  }

  async adminCancelLesson(
    lessonId: string,
    reason: string,
    adminUserId: string,
  ) {
    if (!reason?.trim()) {
      throw new BadRequestException('A reason is required to cancel a class.');
    }
    const lesson = await this.prisma.scheduledLesson.findUnique({
      where: { id: lessonId },
    });
    if (!lesson) throw new NotFoundException('Class not found.');
    if (lesson.status !== LessonStatus.UPCOMING) {
      throw new BadRequestException('Only upcoming classes can be cancelled.');
    }

    const updated = await this.prisma.scheduledLesson.update({
      where: { id: lessonId },
      data: { status: LessonStatus.CANCELLED },
    });

    await this.audit.log({
      actorId: adminUserId,
      actorRole: 'ADMIN',
      action: 'ADMIN_LESSON_CANCELLED',
      entityType: 'ScheduledLesson',
      entityId: lessonId,
      reason,
      beforeData: { status: lesson.status },
      afterData: { status: 'CANCELLED' },
    });

    return updated;
  }

  async adminDeleteLesson(
    lessonId: string,
    adminUserId: string,
    reason?: string,
  ) {
    const lesson = await this.prisma.scheduledLesson.findUnique({
      where: { id: lessonId },
    });
    if (!lesson) throw new NotFoundException('Class not found.');

    await this.prisma.scheduledLesson.delete({ where: { id: lessonId } });

    await this.audit.log({
      actorId: adminUserId,
      actorRole: 'ADMIN',
      action: 'ADMIN_LESSON_DELETED',
      entityType: 'ScheduledLesson',
      entityId: lessonId,
      reason,
      beforeData: lesson,
    });

    return { success: true };
  }

  // ─── Admin: a teacher's upcoming lessons for the Teacher detail Schedule tab ──
  //
  // Distinct from getTeacherScheduledLessons (teacher's own /schedule view,
  // upcoming+completed) — this is Operations-facing, upcoming-only, and
  // includes the student's contact info the way the old Shift-based query
  // used to.

  async getTeacherUpcomingLessonsForAdmin(teacherId: string) {
    const lessons = await this.prisma.scheduledLesson.findMany({
      where: { teacherId, status: LessonStatus.UPCOMING },
      orderBy: { start: 'asc' },
      take: 50,
      include: {
        student: { select: { id: true, fullName: true, email: true } },
        course: { select: { id: true, title: true } },
      },
    });
    return this.attachLessonTitles(lessons);
  }

  // ─── Admin: wipe a student's schedule (called on teacher/course reassignment) ──

  async clearStudentSchedule(studentUserId: string) {
    await this.prisma.$transaction([
      // See the matching comment in setStudentSchedule — a leftover
      // CANCELLED row (from an admin override on the Classes page) would
      // otherwise collide with lesson numbering the next time a schedule is
      // generated for this student+course.
      this.prisma.scheduledLesson.deleteMany({
        where: {
          studentUserId,
          status: { in: [LessonStatus.UPCOMING, LessonStatus.CANCELLED] },
        },
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

    const lessons = await this.prisma.scheduledLesson.findMany({
      where: {
        teacherId: teacher.id,
        status: {
          in: [
            LessonStatus.UPCOMING,
            LessonStatus.COMPLETED,
            LessonStatus.PARTIALLY_COMPLETED,
          ],
        },
      },
      orderBy: { start: 'asc' },
      include: {
        student: { select: { id: true, fullName: true, avatarUrl: true } },
        course: { select: { id: true, title: true } },
      },
    });

    const withTitles = await this.attachLessonTitles(lessons);
    return withTitles.map((l) => ({
      ...l,
      teacherLateMinutes: l.teacherJoinedAt
        ? computeLateMinutes(l.start, l.teacherJoinedAt)
        : null,
    }));
  }

  // ─── Student: own generated lessons for the Learning hub ─────────────────
  // Upcoming reads front-to-back (Lesson 1 → next); Completed reads
  // most-recently-finished first (highest lesson number → lowest), so the
  // student's latest completed work is always at the top of that tab.

  async getStudentScheduledLessons(
    studentUserId: string,
    status?: 'upcoming' | 'completed',
  ) {
    const where: {
      studentUserId: string;
      status?: LessonStatus | { in: LessonStatus[] };
    } = { studentUserId };
    if (status === 'upcoming') where.status = LessonStatus.UPCOMING;
    else if (status === 'completed')
      where.status = {
        in: [LessonStatus.COMPLETED, LessonStatus.PARTIALLY_COMPLETED],
      };
    else
      where.status = {
        in: [
          LessonStatus.UPCOMING,
          LessonStatus.COMPLETED,
          LessonStatus.PARTIALLY_COMPLETED,
        ],
      };

    const lessons = await this.prisma.scheduledLesson.findMany({
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

    return this.attachLessonTitles(lessons);
  }

  // ─── Resolve each lesson's real curriculum title ─────────────────────────
  //
  // ScheduledLesson only stores a lessonNumber; the human-readable name
  // lives on Lesson.title (keyed by Lesson.order within the course), which
  // admins can rename/add at any time from the course catalog editor. This
  // reads Lesson fresh on every call — no caching — so admin edits are
  // reflected immediately everywhere lessons are listed.

  private async attachLessonTitles<
    T extends { courseId: string; lessonNumber: number },
  >(lessons: T[]): Promise<(T & { lessonTitle: string | null })[]> {
    if (lessons.length === 0) return [];

    const courseIds = Array.from(new Set(lessons.map((l) => l.courseId)));
    const catalogLessons = await this.prisma.lesson.findMany({
      where: { courseId: { in: courseIds } },
      select: { courseId: true, order: true, title: true },
    });

    const titleMap = new Map<string, string>();
    for (const cl of catalogLessons) {
      titleMap.set(`${cl.courseId}:${cl.order}`, cl.title);
    }

    return lessons.map((l) => ({
      ...l,
      lessonTitle: titleMap.get(`${l.courseId}:${l.lessonNumber}`) ?? null,
    }));
  }

  // ─── Student/Teacher: the class to show front-and-center right now ───────
  //
  // "Live or next" is one query: the earliest still-UPCOMING lesson whose
  // end hasn't passed. That lesson is either live right now (start <= now
  // <= end) or the next one coming up — exactly the two states the
  // Home-page live-class card needs to distinguish, via getClassWindow.

  async getStudentLiveOrNextLesson(studentUserId: string) {
    const lesson = await this.prisma.scheduledLesson.findFirst({
      where: {
        studentUserId,
        status: LessonStatus.UPCOMING,
        end: { gte: new Date() },
      },
      orderBy: { start: 'asc' },
      include: {
        teacher: {
          select: {
            id: true,
            user: { select: { fullName: true, avatarUrl: true } },
          },
        },
        course: { select: { id: true, title: true, emoji: true } },
      },
    });
    if (!lesson) return null;
    const [withTitle] = await this.attachLessonTitles([lesson]);
    return withTitle;
  }

  async getTeacherLiveOrNextLesson(teacherId: string) {
    const lesson = await this.prisma.scheduledLesson.findFirst({
      where: {
        teacherId,
        status: LessonStatus.UPCOMING,
        end: { gte: new Date() },
      },
      orderBy: { start: 'asc' },
      include: {
        student: { select: { id: true, fullName: true, avatarUrl: true } },
        course: { select: { id: true, title: true, emoji: true } },
      },
    });
    if (!lesson) return null;
    const [withTitle] = await this.attachLessonTitles([lesson]);
    return withTitle;
  }

  // ─── Classroom join support ───────────────────────────────────────────────

  async getLessonForClassroom(lessonId: string) {
    const lesson = await this.prisma.scheduledLesson.findUnique({
      where: { id: lessonId },
      include: {
        teacher: { include: { user: true } },
        student: true,
        course: { select: { title: true } },
      },
    });
    if (!lesson) throw new NotFoundException('Class not found.');
    return lesson;
  }

  /** Records the first time each side's LiveKit token was issued for this
   * lesson — teacherJoinedAt is the sole source for lateness (see
   * lesson-window.util computeLateMinutes), never a manually entered value. */
  async recordLessonJoin(lessonId: string, role: 'TEACHER' | 'STUDENT') {
    const field = role === 'TEACHER' ? 'teacherJoinedAt' : 'studentJoinedAt';
    const lesson = await this.prisma.scheduledLesson.findUnique({
      where: { id: lessonId },
      select: { teacherJoinedAt: true, studentJoinedAt: true },
    });
    if (!lesson) return;
    if (lesson[field]) return; // already recorded — keep the first join time

    await this.prisma.scheduledLesson.update({
      where: { id: lessonId },
      data: { [field]: new Date() },
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
    const byWeekday = new Map<number, { hour: number; minute: number }[]>();
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

  // ─── Curriculum-change reconciliation ────────────────────────────────────
  //
  // Called by CoursesService whenever an admin structurally changes a
  // course's Lesson sequence (add/remove a lesson, or reorder one — a plain
  // title/content edit does NOT change numbering and never calls this).
  // For every student currently scheduled into this course, regenerates
  // their UPCOMING lessons (never COMPLETED ones) against the fresh
  // catalog: same weekly cadence (their existing RecurringSlot), same
  // teacher, just renumbered/reshaped to match the new Lesson.order
  // sequence starting right after their last completed lesson. No
  // duplicates: existing UPCOMING/CANCELLED rows for this student+course are
  // replaced, never appended to.

  async reconcileCourseSchedules(courseId: string, actorId: string) {
    const lessons = await this.prisma.lesson.findMany({
      where: { courseId },
      orderBy: { order: 'asc' },
      select: { id: true, order: true },
    });
    const lessonIdByOrder = new Map(lessons.map((l) => [l.order, l.id]));
    const newTotal = lessons.length;

    const trackedStudents = await this.prisma.recurringSlot.findMany({
      where: { courseId },
      select: { studentUserId: true },
      distinct: ['studentUserId'],
    });

    let reconciled = 0;
    let skipped = 0;
    for (const { studentUserId } of trackedStudents) {
      const ok = await this.reconcileStudentCourseSchedule(
        studentUserId,
        courseId,
        lessonIdByOrder,
        newTotal,
        actorId,
      );
      if (ok) reconciled++;
      else skipped++;
    }

    if (reconciled > 0 || skipped > 0) {
      this.logger.log(
        `Reconciled ${reconciled} student schedule(s) for course ${courseId} after a curriculum change` +
          (skipped > 0
            ? ` (${skipped} skipped due to a scheduling conflict — left untouched).`
            : '.'),
      );
    }
    return { reconciled, skipped, newTotal };
  }

  /** Returns true if this student's schedule was reconciled, false if it was
   * left untouched (no active RecurringSlot, no teacher/class-type
   * assignment yet, nothing left to schedule, or a conflict was hit). */
  private async reconcileStudentCourseSchedule(
    studentUserId: string,
    courseId: string,
    lessonIdByOrder: Map<number, string>,
    newTotal: number,
    actorId: string,
  ): Promise<boolean> {
    const slots = await this.prisma.recurringSlot.findMany({
      where: { studentUserId, courseId },
    });
    if (slots.length === 0) return false;

    const student = await this.prisma.user.findUnique({
      where: { id: studentUserId },
      select: { assignedTeacherId: true, assignedClassType: true },
    });
    if (!student?.assignedTeacherId || !student.assignedClassType) return false;

    const teacherId = student.assignedTeacherId;
    const classType = student.assignedClassType;
    const durationMinutes = CLASS_DURATION_MINUTES[classType];

    // MAX, not count — see the matching comment in setStudentSchedule.
    const completedAgg = await this.prisma.scheduledLesson.aggregate({
      where: { studentUserId, courseId, status: LessonStatus.COMPLETED },
      _max: { lessonNumber: true },
    });
    const completedCount = completedAgg._max.lessonNumber ?? 0;
    const remaining = newTotal - completedCount;

    if (remaining <= 0) {
      // The course got shorter than what this student already completed —
      // nothing left to schedule. Clear any now-stale upcoming rows only.
      await this.prisma.scheduledLesson.deleteMany({
        where: {
          studentUserId,
          courseId,
          status: { in: [LessonStatus.UPCOMING, LessonStatus.CANCELLED] },
        },
      });
      return true;
    }

    const occurrences = this.generateOccurrences(
      todayDhakaDateStr(),
      slots.map((s) => ({
        weekday: s.weekday,
        time: `${String(s.hour).padStart(2, '0')}:${String(s.minute).padStart(2, '0')}`,
      })),
      remaining,
    );
    if (occurrences.length < remaining) return false;

    const newLessons = occurrences.map((occ, i) => {
      const start = dhakaToUtc(occ.dateStr, occ.hour, occ.minute);
      const end = new Date(start.getTime() + durationMinutes * 60_000);
      const lessonNumber = completedCount + i + 1;
      return {
        lessonNumber,
        lessonId: lessonIdByOrder.get(lessonNumber) ?? null,
        start,
        end,
      };
    });

    // Delete this student's own stale UPCOMING/CANCELLED rows for this
    // course FIRST, then conflict-check — otherwise every regenerated
    // occurrence collides with itself: it reuses the same weekly cadence
    // as the rows it's about to replace, so checking for conflicts before
    // deleting them made ordinary reconciliation (e.g. "admin adds one
    // lesson") report a false "teacher conflict" against the student's own
    // soon-to-be-superseded schedule on essentially every call. A conflict
    // against a DIFFERENT booking (another student, a Shift) still throws,
    // which rolls back the whole transaction — this student's prior
    // schedule is restored to what it was, never left half-deleted.
    try {
      await this.prisma.$transaction(
        async (tx) => {
          await tx.scheduledLesson.deleteMany({
            where: {
              studentUserId,
              courseId,
              status: { in: [LessonStatus.UPCOMING, LessonStatus.CANCELLED] },
            },
          });
          for (const lesson of newLessons) {
            const conflict = await this.findTeacherConflict(
              tx,
              teacherId,
              lesson.start,
              lesson.end,
            );
            if (conflict) {
              throw new Error(
                `teacher conflict at ${lesson.start.toISOString()}`,
              );
            }
          }
          await tx.scheduledLesson.createMany({
            data: newLessons.map((l) => ({
              studentUserId,
              teacherId,
              courseId,
              lessonNumber: l.lessonNumber,
              lessonId: l.lessonId ?? undefined,
              start: l.start,
              end: l.end,
              classType,
              status: LessonStatus.UPCOMING,
            })),
          });
        },
        { timeout: 20_000, maxWait: 10_000 },
      );
    } catch (err) {
      this.logger.warn(
        `Skipped schedule reconciliation for student ${studentUserId} / course ${courseId}: ${(err as Error).message}. ` +
          `Needs manual admin reschedule.`,
      );
      return false;
    }

    await this.audit.log({
      actorId,
      actorRole: 'ADMIN',
      action: 'COURSE_SCHEDULE_RECONCILED',
      entityType: 'User',
      entityId: studentUserId,
      afterData: { courseId, remaining, newTotal },
    });
    return true;
  }

  // ─── Backfill: link existing ScheduledLesson rows to their catalog Lesson ─
  // (rows created before Lesson.order-based test insertion existed). Safe to
  // call repeatedly — only fills rows where lessonId is still null.

  async backfillLessonLinks() {
    const courses = await this.prisma.course.findMany({ select: { id: true } });
    let updated = 0;
    for (const { id: courseId } of courses) {
      const lessons = await this.prisma.lesson.findMany({
        where: { courseId },
        select: { id: true, order: true },
      });
      const byOrder = new Map(lessons.map((l) => [l.order, l.id]));
      const rows = await this.prisma.scheduledLesson.findMany({
        where: { courseId, lessonId: null },
        select: { id: true, lessonNumber: true },
      });
      for (const row of rows) {
        const lessonId = byOrder.get(row.lessonNumber);
        if (lessonId) {
          await this.prisma.scheduledLesson.update({
            where: { id: row.id },
            data: { lessonId },
          });
          updated++;
        }
      }
    }
    return { updated };
  }

  // NOTE: there is intentionally no "auto-complete past lessons" cron. A
  // class's scheduled end time is never itself a reason to close it or mark
  // it complete — only the teacher's explicit Completed/Partially Completed
  // choice does that (see ClassroomService.endClass). Past-end classes stay
  // UPCOMING and remain fully joinable until the teacher ends them.

  // ─── Partial-completion schedule shift ───────────────────────────────────
  //
  // Called by ClassroomService.endClass when a teacher marks a class
  // PARTIALLY_COMPLETED: the student needs another occurrence to finish this
  // same lesson. Operates purely at the ScheduledLesson occurrence level —
  // never touches Lesson/Course catalog content or ordering:
  //
  //   1. The partially-completed row keeps its lessonNumber, but its status
  //      moves to PARTIALLY_COMPLETED (freeing that lessonNumber slot, since
  //      the partial unique index only covers UPCOMING/COMPLETED — see
  //      schema.prisma).
  //   2. Every already-generated future UPCOMING occurrence for this
  //      student+course "shifts one classday later": each one keeps its own
  //      calendar date but is reassigned the PREVIOUS occurrence's
  //      lessonNumber (so the very next occurrence redoes the partial
  //      lesson, and everything after cascades down by one).
  //   3. One brand-new trailing occurrence is generated (via the student's
  //      existing RecurringSlot cadence) to absorb the lessonNumber that
  //      fell off the end — so the total number of remaining occurrences
  //      grows by exactly one, and no lesson number is ever lost or
  //      duplicated among active rows.
  async handlePartialCompletion(lessonId: string, actorUserId: string) {
    const lesson = await this.prisma.scheduledLesson.findUnique({
      where: { id: lessonId },
    });
    if (!lesson) throw new NotFoundException('Class not found.');

    const { studentUserId, courseId, teacherId, classType, lessonNumber } =
      lesson;

    const futureLessons = await this.prisma.scheduledLesson.findMany({
      where: {
        studentUserId,
        courseId,
        status: LessonStatus.UPCOMING,
        start: { gt: lesson.start },
      },
      orderBy: { start: 'asc' },
    });

    const slots = await this.prisma.recurringSlot.findMany({
      where: { studentUserId, courseId },
    });

    const durationMinutes = CLASS_DURATION_MINUTES[classType];
    let newTrailing: { start: Date; end: Date } | null = null;

    if (slots.length > 0) {
      const lastDate =
        futureLessons.length > 0
          ? futureLessons[futureLessons.length - 1].start
          : lesson.start;
      const [occ] = this.generateOccurrences(
        addDaysToDateStr(this.dateStrOf(lastDate), 1),
        slots.map((s) => ({
          weekday: s.weekday,
          time: `${String(s.hour).padStart(2, '0')}:${String(s.minute).padStart(2, '0')}`,
        })),
        1,
      );
      if (occ) {
        const start = dhakaToUtc(occ.dateStr, occ.hour, occ.minute);
        newTrailing = {
          start,
          end: new Date(start.getTime() + durationMinutes * 60_000),
        };
      }
    }

    const catalogLessons = await this.prisma.lesson.findMany({
      where: { courseId },
      select: { id: true, order: true },
    });
    const lessonIdByOrder = new Map(catalogLessons.map((l) => [l.order, l.id]));

    await this.prisma.$transaction(
      async (tx) => {
        await tx.scheduledLesson.update({
          where: { id: lessonId },
          data: { status: LessonStatus.PARTIALLY_COMPLETED },
        });

        // Shift every future occurrence's lessonNumber/lessonId down to the
        // previous slot's — dates never move for existing rows.
        for (let i = 0; i < futureLessons.length; i++) {
          const newNumber = lessonNumber + i;
          await tx.scheduledLesson.update({
            where: { id: futureLessons[i].id },
            data: {
              lessonNumber: newNumber,
              lessonId: lessonIdByOrder.get(newNumber) ?? null,
            },
          });
        }

        if (newTrailing) {
          const trailingNumber = lessonNumber + futureLessons.length;
          const conflict = await this.findTeacherConflict(
            tx,
            teacherId,
            newTrailing.start,
            newTrailing.end,
          );
          if (conflict) {
            throw new BadRequestException(
              'Could not add a make-up class — the teacher is already booked at the next available recurring slot. An admin will need to reschedule manually.',
            );
          }
          await tx.scheduledLesson.create({
            data: {
              studentUserId,
              teacherId,
              courseId,
              lessonNumber: trailingNumber,
              lessonId: lessonIdByOrder.get(trailingNumber) ?? undefined,
              start: newTrailing.start,
              end: newTrailing.end,
              classType,
              status: LessonStatus.UPCOMING,
            },
          });
        }
      },
      { timeout: 20_000, maxWait: 10_000 },
    );

    await this.audit.log({
      actorId: actorUserId,
      actorRole: 'TEACHER',
      action: 'LESSON_PARTIALLY_COMPLETED',
      entityType: 'ScheduledLesson',
      entityId: lessonId,
      reason:
        'Class ended as partially completed — schedule shifted by one occurrence so the student can finish this lesson. Needs admin review.',
      afterData: {
        lessonNumber,
        shiftedCount: futureLessons.length,
        addedTrailingOccurrence: !!newTrailing,
      },
    });

    return { success: true };
  }

  private dateStrOf(date: Date): string {
    return utcToDhakaParts(date).dateStr;
  }
}
