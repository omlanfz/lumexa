// FILE PATH: server/src/scheduling/scheduling.service.ts
//
// Turns an Operations assignment (teacher + course + class type) into an
// actual recurring weekly schedule and the individual generated lesson
// instances (ScheduledLesson), up to the course's `sessions` count. All
// weekday/time math happens in Asia/Dhaka (see dhaka-time.util.ts); stored
// instants are UTC.
//
// Regenerating a schedule (setStudentSchedule) never touches finalized
// lessons (COMPLETED / PARTIALLY_COMPLETED / INCOMPLETE) — only rows still
// UPCOMING are replaced — so history and lesson numbering stay intact across
// reschedules.

import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ClassType, LessonStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SetScheduleDto } from './dto/set-schedule.dto';
import {
  dhakaToUtc,
  todayDhakaDateStr,
  utcToDhakaParts,
  weekdayForDateStr,
} from './dhaka-time.util';
import { computeLateMinutes } from './lesson-window.util';
import { COUNTS_AS_COMPLETED } from './lesson-state.util';
import { trialAccessState } from '../trial/trial-access.util';
import { CLASS_DURATION_MINUTES } from './class-duration';
import { generateOccurrences } from './occurrences.util';
import {
  describeDhakaMoment,
  findTeacherConflict,
  type TeacherConflict,
} from './teacher-conflict.util';
import { leaveCurrentBatchInTx } from '../batches/batch-membership.util';

export { CLASS_DURATION_MINUTES } from './class-duration';

@Injectable()
export class SchedulingService {
  private readonly logger = new Logger(SchedulingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
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

    const [personalSlots, lessons, membership] = await Promise.all([
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
      this.prisma.batchMember.findFirst({
        where: { studentUserId, leftAt: null },
        include: {
          batch: {
            select: {
              id: true,
              name: true,
              status: true,
              maxStudents: true,
              startDate: true,
              teacher: {
                select: { id: true, user: { select: { fullName: true } } },
              },
              slots: {
                orderBy: [
                  { weekday: 'asc' },
                  { hour: 'asc' },
                  { minute: 'asc' },
                ],
              },
              _count: { select: { members: { where: { leftAt: null } } } },
            },
          },
        },
      }),
    ]);

    // A batch student has no weekly slots of their own: they follow the batch's.
    const slots = membership ? membership.batch.slots : personalSlots;
    const nextSession = membership
      ? await this.prisma.batchSession.findFirst({
          where: {
            batchId: membership.batchId,
            status: LessonStatus.UPCOMING,
            end: { gt: new Date() },
          },
          orderBy: { start: 'asc' },
          select: { id: true, start: true, end: true, lessonNumber: true },
        })
      : null;

    const upcoming = lessons.filter((l) => l.status === LessonStatus.UPCOMING);
    // PARTIALLY_COMPLETED counts as completed (paid, lesson unlocked); the
    // extra class it spawned is an UPCOMING row with the same lessonNumber.
    const completed = lessons.filter((l) =>
      COUNTS_AS_COMPLETED.includes(l.status),
    );
    // Lessons, not classes: a partially completed lesson that has already had
    // its extra class finished shows up twice in `completed` but is one lesson.
    const completedLessonNumbers = new Set(
      completed.map((l) => l.lessonNumber),
    );

    return {
      classType: student.assignedClassType,
      assignedTeacherId: student.assignedTeacherId,
      assignedCourse: student.assignedCourse,
      // Set when the student is placed in a batch (null for 1-to-1 and for a
      // "Batch" student who has not been placed yet).
      batch: membership
        ? {
            id: membership.batch.id,
            name: membership.batch.name,
            status: membership.batch.status,
            teacherName: membership.batch.teacher.user.fullName,
            memberCount: membership.batch._count.members,
            maxStudents: membership.batch.maxStudents,
            joinedAt: membership.joinedAt,
            joinedAtLesson: membership.joinedAtLesson,
            alignment: membership.alignment,
            nextSession,
          }
        : null,
      slots,
      lessons: {
        upcoming,
        completed,
        totalSessions: student.assignedCourse?.sessions ?? null,
        completedCount: completedLessonNumbers.size,
        // Upcoming lessons not already unlocked by a partially completed
        // class — so completed + upcoming never exceeds totalSessions.
        upcomingCount: new Set(
          upcoming
            .filter((l) => !completedLessonNumbers.has(l.lessonNumber))
            .map((l) => l.lessonNumber),
        ).size,
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
        email: true,
        assignedTeacherId: true,
        assignedCourseId: true,
      },
    });
    if (!student || student.role !== 'STUDENT') {
      throw new NotFoundException('Student not found.');
    }
    if (dto.classType === ClassType.BATCH) {
      throw new BadRequestException(
        'A batch student is scheduled through their batch, not on their own. Place the student in a batch from the Schedule tab or from Admin → Batches.',
      );
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

    // Switching a batch student to 1-to-1 takes them out of the batch (what
    // they have already taken stays). That must be an explicit choice.
    const placement = await this.prisma.batchMember.findFirst({
      where: { studentUserId, leftAt: null },
      include: { batch: { select: { id: true, name: true } } },
    });
    if (placement && !dto.leaveBatch) {
      throw new ConflictException({
        message: `${student.fullName} is in the batch "${placement.batch.name}". Switching to 1-to-1 removes them from it; completed classes are kept.`,
        details: {
          code: 'LEAVES_BATCH',
          batch: { id: placement.batch.id, name: placement.batch.name },
        },
      });
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

    const occurrences = generateOccurrences(
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

    const leftBatch = await this.prisma.$transaction(
      async (tx) => {
        // Leaving a batch first: the student's classes still ahead in it go
        // (what they have taken stays), so the batch's own sessions are the
        // only thing the new schedule can clash with.
        const left = placement
          ? await leaveCurrentBatchInTx(tx, studentUserId, new Date())
          : null;

        // Replace any not-yet-happened lessons for this student+course — they
        // were never attended, so regenerating them is not "modifying
        // completed/past lessons" and never creates duplicates. Includes
        // CANCELLED (e.g. an admin override cancellation from the Classes
        // page) as well as UPCOMING: leaving a cancelled row behind would
        // occupy its lessonNumber and collide with the freshly generated
        // sequence below (@@unique([studentUserId, courseId, lessonNumber])).
        // Only the student's own 1-to-1 rows: a batch participant row belongs to
        // a shared class and is never replaced from here.
        await tx.scheduledLesson.deleteMany({
          where: {
            studentUserId,
            courseId,
            batchSessionId: null,
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
              `Teacher is already booked on ${describeDhakaMoment(lesson.start)} (Asia/Dhaka). Choose a different day/time.`,
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

        return left;
      },
      { timeout: 20_000, maxWait: 10_000 },
    );

    await this.audit.log({
      actorId: adminUserId,
      actorRole: 'ADMIN',
      action: 'STUDENT_SCHEDULE_SET',
      entityType: 'User',
      entityId: studentUserId,
      beforeData: leftBatch
        ? { classType: 'BATCH', batch: leftBatch.name }
        : undefined,
      afterData: {
        classType,
        firstClassDate: dto.firstClassDate,
        slots: dto.slots,
        lessonsGenerated: newLessons.length,
        leftBatch: leftBatch?.name ?? null,
      },
    });

    if (newLessons.length > 0) {
      const teacherProfile = await this.prisma.teacherProfile.findUnique({
        where: { id: teacherId },
        select: { user: { select: { fullName: true } } },
      });
      if (teacherProfile) {
        const classUrl = `${process.env.FRONTEND_URL}/dashboard`;
        this.notifications
          .sendClassBookedEmail(student.email, {
            studentName: student.fullName,
            teacherName: teacherProfile.user.fullName,
            classStart: newLessons[0].start,
            classEnd: newLessons[0].end,
            classUrl,
          })
          .catch(() => {});
      }
    }

    return this.getStudentSchedule(studentUserId);
  }

  /** A batch student's lesson is their row in a class the whole batch shares:
   * changing it alone would pull it out of step with the class itself. */
  private assertNotBatchParticipant(
    lesson: { batchSessionId: string | null },
    verb: string,
  ) {
    if (lesson.batchSessionId) {
      throw new BadRequestException(
        `This class is shared by a batch and cannot be ${verb} for one student. Change the batch class itself, or take the student out of the batch.`,
      );
    }
  }

  /** The shared class a lesson belongs to (null for a 1-to-1 lesson), so
   * callers can route a batch student's lesson to its class. */
  async getBatchSessionIdOfLesson(lessonId: string): Promise<string | null> {
    const lesson = await this.prisma.scheduledLesson.findUnique({
      where: { id: lessonId },
      select: { batchSessionId: true },
    });
    if (!lesson) throw new NotFoundException('Class not found.');
    return lesson.batchSessionId;
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
    this.assertNotBatchParticipant(lesson, 'rescheduled');
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

    const recipient = await this.getLessonNotificationRecipient(
      lesson.studentUserId,
      lesson.teacherId,
    );
    if (recipient) {
      this.notifications
        .sendClassRescheduledToStudent(recipient.studentEmail, {
          requestId: lessonId,
          studentName: recipient.studentName,
          teacherName: recipient.teacherName,
          oldStart: lesson.start,
          newStart,
          changedBy: 'ADMIN',
        })
        .catch(() => {});
    }

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
    this.assertNotBatchParticipant(lesson, 'cancelled');
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

    const recipient = await this.getLessonNotificationRecipient(
      lesson.studentUserId,
      lesson.teacherId,
    );
    if (recipient) {
      this.notifications
        .sendClassCancelledToStudent(recipient.studentEmail, {
          requestId: lessonId,
          studentName: recipient.studentName,
          teacherName: recipient.teacherName,
          classStart: lesson.start,
          cancelledBy: 'ADMIN',
        })
        .catch(() => {});
    }

    return updated;
  }

  /** Best-effort student+teacher display info for a ScheduledLesson
   * notification — returns null rather than throwing so a lookup failure
   * never blocks the reschedule/cancel action itself. */
  private async getLessonNotificationRecipient(
    studentUserId: string,
    teacherId: string,
  ) {
    const [student, teacher] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: studentUserId },
        select: { email: true, fullName: true },
      }),
      this.prisma.teacherProfile.findUnique({
        where: { id: teacherId },
        select: { user: { select: { fullName: true } } },
      }),
    ]);
    if (!student || !teacher) return null;
    return {
      studentEmail: student.email,
      studentName: student.fullName,
      teacherName: teacher.user.fullName,
    };
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
    this.assertNotBatchParticipant(lesson, 'deleted');

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
    // One row per CLASS: a 1-to-1 lesson, or a batch class (however many
    // students are in it) shown once with its roster.
    const [lessons, sessions] = await Promise.all([
      this.prisma.scheduledLesson.findMany({
        where: {
          teacherId,
          batchSessionId: null,
          status: LessonStatus.UPCOMING,
        },
        orderBy: { start: 'asc' },
        take: 50,
        include: {
          student: { select: { id: true, fullName: true, email: true } },
          course: { select: { id: true, title: true } },
        },
      }),
      this.prisma.batchSession.findMany({
        where: {
          teacherId,
          status: LessonStatus.UPCOMING,
          participants: { some: {} },
        },
        orderBy: { start: 'asc' },
        take: 50,
        include: {
          batch: { select: { id: true, name: true } },
          course: { select: { id: true, title: true } },
          participants: {
            where: { status: { not: LessonStatus.CANCELLED } },
            select: { student: { select: { id: true, fullName: true } } },
          },
        },
      }),
    ]);
    const rows = [
      ...(await this.attachLessonTitles(lessons)).map((l) => ({
        ...l,
        kind: 'LESSON' as const,
        batch: null as { id: string; name: string } | null,
        students: null as { id: string; fullName: string }[] | null,
      })),
      ...(await this.attachLessonTitles(sessions)).map((s) => ({
        id: s.id,
        kind: 'BATCH_SESSION' as const,
        start: s.start,
        end: s.end,
        classType: ClassType.BATCH,
        status: s.status,
        lessonNumber: s.lessonNumber,
        courseId: s.courseId,
        course: s.course,
        lessonTitle: s.lessonTitle,
        student: null,
        batch: s.batch,
        students: s.participants.map((p) => p.student),
      })),
    ];
    return rows
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .slice(0, 50);
  }

  // ─── Admin: wipe a student's schedule (called on teacher/course reassignment) ──

  async clearStudentSchedule(studentUserId: string) {
    const placement = await this.prisma.batchMember.findFirst({
      where: { studentUserId, leftAt: null },
      include: { batch: { select: { name: true } } },
    });
    if (placement) {
      throw new BadRequestException(
        `This student is in the batch "${placement.batch.name}", whose classes are not theirs to clear. Remove them from the batch instead.`,
      );
    }
    await this.prisma.$transaction([
      // See the matching comment in setStudentSchedule — a leftover
      // CANCELLED row (from an admin override on the Classes page) would
      // otherwise collide with lesson numbering the next time a schedule is
      // generated for this student+course.
      this.prisma.scheduledLesson.deleteMany({
        where: {
          studentUserId,
          batchSessionId: null,
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

    const visible = [
      LessonStatus.UPCOMING,
      LessonStatus.COMPLETED,
      LessonStatus.PARTIALLY_COMPLETED,
      LessonStatus.INCOMPLETE,
    ];
    // 1-to-1 lessons, and batch classes — each batch class once, with its
    // students. Only this teacher's own classes are ever read.
    const [lessons, sessions, trials] = await Promise.all([
      this.prisma.scheduledLesson.findMany({
        where: {
          teacherId: teacher.id,
          batchSessionId: null,
          status: { in: visible },
        },
        orderBy: { start: 'asc' },
        include: {
          student: { select: { id: true, fullName: true, avatarUrl: true } },
          course: { select: { id: true, title: true } },
        },
      }),
      this.prisma.batchSession.findMany({
        where: { teacherId: teacher.id, status: { in: visible } },
        orderBy: { start: 'asc' },
        include: {
          batch: { select: { id: true, name: true, maxStudents: true } },
          course: { select: { id: true, title: true, sessions: true } },
          participants: {
            where: { status: { not: LessonStatus.CANCELLED } },
            orderBy: { student: { fullName: 'asc' } },
            select: {
              id: true,
              status: true,
              studentJoinedAt: true,
              endReason: true,
              student: {
                select: {
                  id: true,
                  fullName: true,
                  avatarUrl: true,
                  grade: true,
                  age: true,
                  spaceRank: true,
                },
              },
            },
          },
        },
      }),
      // Free trial classes assigned to this teacher. Not lessons: no student
      // account, no course, no progress — only who is coming and when. The
      // parent's contact details are deliberately not selected.
      this.prisma.trialLead.findMany({
        where: {
          teacherId: teacher.id,
          appointmentStatus: { in: ['CONFIRMED', 'COMPLETED', 'MISSED'] },
        },
        orderBy: { startAt: 'asc' },
        select: {
          id: true,
          startAt: true,
          endAt: true,
          appointmentStatus: true,
          childName: true,
          childAge: true,
          subject: true,
          message: true,
        },
      }),
    ]);

    // Each student's own progress in the curriculum of the class they are in.
    const studentIds = [
      ...new Set(
        sessions.flatMap((s) => s.participants.map((p) => p.student.id)),
      ),
    ];
    const courseIds = [...new Set(sessions.map((s) => s.courseId))];
    const completedRows =
      studentIds.length > 0
        ? await this.prisma.scheduledLesson.findMany({
            where: {
              studentUserId: { in: studentIds },
              courseId: { in: courseIds },
              status: { in: COUNTS_AS_COMPLETED },
            },
            select: { studentUserId: true, courseId: true, lessonNumber: true },
          })
        : [];
    const completedBy = new Map<string, Set<number>>();
    for (const r of completedRows) {
      const key = `${r.studentUserId}:${r.courseId}`;
      if (!completedBy.has(key)) completedBy.set(key, new Set());
      completedBy.get(key)!.add(r.lessonNumber);
    }

    const lessonItems = (await this.attachLessonTitles(lessons)).map((l) => ({
      ...l,
      kind: 'LESSON' as const,
      teacherLateMinutes: l.teacherJoinedAt
        ? computeLateMinutes(l.start, l.teacherJoinedAt)
        : null,
    }));
    const sessionItems = (await this.attachLessonTitles(sessions)).map((s) => ({
      id: s.id,
      kind: 'BATCH_SESSION' as const,
      start: s.start,
      end: s.end,
      classType: ClassType.BATCH,
      status: s.status,
      lessonNumber: s.lessonNumber,
      lessonTitle: s.lessonTitle,
      course: { id: s.course.id, title: s.course.title },
      batch: {
        id: s.batch.id,
        name: s.batch.name,
        maxStudents: s.batch.maxStudents,
      },
      // The lesson the teacher opens from here (the same material for every
      // student of the class; one student's row is just the way in).
      viewLessonId: s.participants[0]?.id ?? null,
      students: s.participants.map((p) => ({
        id: p.student.id,
        lessonId: p.id,
        fullName: p.student.fullName,
        avatarUrl: p.student.avatarUrl,
        grade: p.student.grade,
        age: p.student.age,
        spaceRank: p.student.spaceRank,
        lessonsCompleted:
          completedBy.get(`${p.student.id}:${s.courseId}`)?.size ?? 0,
        totalLessons: s.course.sessions,
        // What happened to this student in this class.
        attendance:
          p.status === LessonStatus.UPCOMING
            ? p.studentJoinedAt
              ? 'JOINED'
              : 'PENDING'
            : p.studentJoinedAt
              ? 'ATTENDED'
              : 'ABSENT',
      })),
      teacherLateMinutes: s.teacherJoinedAt
        ? computeLateMinutes(s.start, s.teacherJoinedAt)
        : null,
    }));

    const trialItems = trials.flatMap((t) =>
      t.startAt && t.endAt
        ? [
            {
              id: t.id,
              kind: 'TRIAL' as const,
              start: t.startAt,
              end: t.endAt,
              classType: 'TRIAL' as const,
              status:
                t.appointmentStatus === 'CONFIRMED'
                  ? ('UPCOMING' as const)
                  : t.appointmentStatus === 'COMPLETED'
                    ? ('COMPLETED' as const)
                    : ('MISSED' as const),
              childName: t.childName,
              childAge: t.childAge,
              program: t.subject,
              parentMessage: t.message,
              // The same window the server enforces when the teacher joins.
              joinable:
                trialAccessState(
                  {
                    appointmentStatus: t.appointmentStatus,
                    startAt: t.startAt,
                    endAt: t.endAt,
                    teacherId: teacher.id,
                  },
                  new Date(),
                ) === 'OPEN',
            },
          ]
        : [],
    );

    return [...lessonItems, ...sessionItems, ...trialItems].sort(
      (a, b) => a.start.getTime() - b.start.getTime(),
    );
  }

  // ─── Student: own generated lessons for the Learning hub ─────────────────
  // Upcoming reads front-to-back (Lesson 1 → next); Completed reads
  // most-recently-finished first (highest lesson number → lowest), so the
  // student's latest completed work is always at the top of that tab.
  //
  // A lesson has exactly ONE state here. A partially completed lesson is
  // "completed" (unlocked, with its materials) even though one more live class
  // for it is still on the calendar — that extra class is an UPCOMING row with
  // the same lessonNumber, which would otherwise show the lesson in both tabs.
  // So: Completed holds one row per lessonNumber (the earliest finalized
  // class), Upcoming holds only lessons not yet completed. The extra class
  // itself is still surfaced by the schedule / live-or-next-class card, which
  // read UPCOMING rows directly (see getStudentLiveOrNextLesson).

  async getStudentScheduledLessons(
    studentUserId: string,
    status?: 'upcoming' | 'completed',
  ) {
    const rows = await this.prisma.scheduledLesson.findMany({
      where: {
        studentUserId,
        status: { in: [LessonStatus.UPCOMING, ...COUNTS_AS_COMPLETED] },
      },
      orderBy: [{ lessonNumber: 'asc' }, { start: 'asc' }],
      include: {
        teacher: {
          select: {
            id: true,
            user: { select: { fullName: true, avatarUrl: true } },
          },
        },
        course: { select: { id: true, title: true } },
        batch: { select: { id: true, name: true } },
      },
    });

    // Keyed by course too — lesson numbers restart per curriculum.
    const key = (l: { courseId: string; lessonNumber: number }) =>
      `${l.courseId}:${l.lessonNumber}`;

    const completedByLesson = new Map<string, (typeof rows)[number]>();
    for (const l of rows) {
      if (
        COUNTS_AS_COMPLETED.includes(l.status) &&
        !completedByLesson.has(key(l))
      ) {
        completedByLesson.set(key(l), l);
      }
    }
    const completed = [...completedByLesson.values()].sort(
      (a, b) => b.lessonNumber - a.lessonNumber,
    );
    const upcoming = rows.filter(
      (l) =>
        l.status === LessonStatus.UPCOMING && !completedByLesson.has(key(l)),
    );

    const selected =
      status === 'upcoming'
        ? upcoming
        : status === 'completed'
          ? completed
          : [...completed.slice().reverse(), ...upcoming];

    return this.attachLessonTitles(selected);
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
        batch: { select: { id: true, name: true } },
      },
    });
    if (!lesson) return null;
    const [withTitle] = await this.attachLessonTitles([lesson]);
    return withTitle;
  }

  /** The class to show front-and-center for a teacher: the earliest one that
   * has not ended — a 1-to-1 lesson, or a batch class (once, with its
   * students). */
  async getTeacherLiveOrNextLesson(teacherId: string) {
    const now = new Date();
    const [lesson, session] = await Promise.all([
      this.prisma.scheduledLesson.findFirst({
        where: {
          teacherId,
          batchSessionId: null,
          status: LessonStatus.UPCOMING,
          end: { gte: now },
        },
        orderBy: { start: 'asc' },
        include: {
          student: { select: { id: true, fullName: true, avatarUrl: true } },
          course: { select: { id: true, title: true, emoji: true } },
        },
      }),
      this.prisma.batchSession.findFirst({
        where: {
          teacherId,
          status: LessonStatus.UPCOMING,
          end: { gte: now },
          participants: { some: { status: LessonStatus.UPCOMING } },
        },
        orderBy: { start: 'asc' },
        include: {
          batch: { select: { id: true, name: true } },
          course: { select: { id: true, title: true, emoji: true } },
          participants: {
            where: { status: LessonStatus.UPCOMING },
            orderBy: { student: { fullName: 'asc' } },
            select: {
              // One student's row of the class: the way to its lesson page.
              id: true,
              student: {
                select: { id: true, fullName: true, avatarUrl: true },
              },
            },
          },
        },
      }),
    ]);

    const [lessonWithTitle] = lesson
      ? await this.attachLessonTitles([lesson])
      : [];
    const [sessionWithTitle] = session
      ? await this.attachLessonTitles([session])
      : [];
    if (lessonWithTitle && sessionWithTitle) {
      return lessonWithTitle.start <= sessionWithTitle.start
        ? { kind: 'LESSON' as const, ...lessonWithTitle }
        : { kind: 'BATCH_SESSION' as const, ...sessionWithTitle };
    }
    if (lessonWithTitle) return { kind: 'LESSON' as const, ...lessonWithTitle };
    if (sessionWithTitle) {
      return { kind: 'BATCH_SESSION' as const, ...sessionWithTitle };
    }
    return null;
  }

  // ─── Classroom join support ───────────────────────────────────────────────

  async getLessonForClassroom(lessonId: string) {
    const lesson = await this.prisma.scheduledLesson.findUnique({
      where: { id: lessonId },
      include: {
        teacher: { include: { user: true } },
        student: true,
        course: { select: { title: true } },
        batchSession: {
          select: {
            id: true,
            batchId: true,
            start: true,
            end: true,
            status: true,
            teacherId: true,
            teacherJoinedAt: true,
            lessonNumber: true,
            batch: { select: { name: true } },
            teacher: {
              select: { userId: true, user: { select: { fullName: true } } },
            },
          },
        },
      },
    });
    if (!lesson) throw new NotFoundException('Class not found.');
    return lesson;
  }

  /** A batch class for the teacher's entry to its classroom. */
  async getSessionForClassroom(sessionId: string) {
    const session = await this.prisma.batchSession.findUnique({
      where: { id: sessionId },
      include: {
        teacher: { include: { user: true } },
        course: { select: { title: true } },
        batch: { select: { name: true } },
        participants: {
          where: { status: { not: LessonStatus.CANCELLED } },
          select: {
            id: true,
            studentUserId: true,
            status: true,
            lessonNumber: true,
            courseId: true,
            teacherJoinedAt: true,
          },
        },
      },
    });
    if (!session) throw new NotFoundException('Class not found.');
    return session;
  }

  /** Records the first time each side's LiveKit token was issued for this
   * lesson — teacherJoinedAt is the sole source for lateness (see
   * lesson-window.util computeLateMinutes), never a manually entered value.
   * A batch class has ONE teacher attendance: it belongs to the class (the
   * session) and is mirrored onto the students' rows, so a student added to
   * the class after the teacher came in is counted as joined too. */
  async recordLessonJoin(lessonId: string, role: 'TEACHER' | 'STUDENT') {
    const lesson = await this.prisma.scheduledLesson.findUnique({
      where: { id: lessonId },
      select: {
        teacherJoinedAt: true,
        studentJoinedAt: true,
        batchSessionId: true,
      },
    });
    if (!lesson) return;

    if (role === 'TEACHER' && lesson.batchSessionId) {
      await this.recordSessionTeacherJoin(lesson.batchSessionId);
      return;
    }

    const field = role === 'TEACHER' ? 'teacherJoinedAt' : 'studentJoinedAt';
    if (lesson[field]) return; // already recorded — keep the first join time

    await this.prisma.scheduledLesson.update({
      where: { id: lessonId },
      data: { [field]: new Date() },
    });
  }

  /** The teacher came into a batch class. Only the first arrival is kept. */
  async recordSessionTeacherJoin(sessionId: string) {
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.batchSession.updateMany({
        where: { id: sessionId, teacherJoinedAt: null },
        data: { teacherJoinedAt: now },
      }),
      this.prisma.scheduledLesson.updateMany({
        where: {
          batchSessionId: sessionId,
          status: LessonStatus.UPCOMING,
          teacherJoinedAt: null,
        },
        data: { teacherJoinedAt: now },
      }),
    ]);
  }

  // ─── Conflict detection (also used by ShiftsService) ─────────────────────

  /**
   * Is this teacher busy during [start, end)? Returns what they are busy with,
   * or null. A teacher is in one class at a time: another 1-to-1 lesson, a
   * batch class (however many students are in it) or a booked marketplace
   * shift all count (see teacher-conflict.util).
   */
  async findTeacherConflict(
    prismaOrTx: PrismaService | Prisma.TransactionClient,
    teacherId: string,
    start: Date,
    end: Date,
    excludeLessonId?: string,
  ): Promise<TeacherConflict | null> {
    return findTeacherConflict(prismaOrTx, teacherId, start, end, {
      excludeLessonId,
    });
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
    // A batch student's classes are their batch's (BatchesService rebuilds
    // them); this per-student rebuild is for 1-to-1 schedules only.
    if (student.assignedClassType === ClassType.BATCH) return false;

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
          batchSessionId: null,
          status: { in: [LessonStatus.UPCOMING, LessonStatus.CANCELLED] },
        },
      });
      return true;
    }

    const occurrences = generateOccurrences(
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
              batchSessionId: null,
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

  // ─── Pause / resume: freeze and restore a student's upcoming schedule ────
  //
  // Pausing cancels every still-UPCOMING lesson — the student can't attend
  // while paused, and leaving them UPCOMING would keep blocking the
  // teacher's slot (findTeacherConflict only looks at UPCOMING rows) from
  // being handed to someone else in the meantime. RecurringSlot rows are
  // deliberately left untouched: that's the remembered weekly pattern
  // restoreScheduleAfterResume replays on resume, the same way
  // reconcileCourseSchedules replays it after a curriculum change.

  async cancelUpcomingLessonsForPause(studentUserId: string) {
    // A batch student's classes are the batch's: BatchesService.
    // suspendParticipation takes them out of the ones still ahead.
    await this.prisma.scheduledLesson.updateMany({
      where: {
        studentUserId,
        batchSessionId: null,
        status: LessonStatus.UPCOMING,
      },
      data: { status: LessonStatus.CANCELLED },
    });
  }

  /** Regenerates this student's UPCOMING lessons from today, per course they
   * had a RecurringSlot for — same weekday/time cadence, same teacher,
   * continuing right after their last COMPLETED lesson (see
   * reconcileStudentCourseSchedule, shared with curriculum-change
   * reconciliation). Returns how many of the student's scheduled courses
   * were restored vs. skipped (a teacher conflict picked up while paused
   * leaves that course's schedule for manual admin re-scheduling). */
  async restoreScheduleAfterResume(studentUserId: string, actorId: string) {
    const slotCourses = await this.prisma.recurringSlot.findMany({
      where: { studentUserId },
      select: { courseId: true },
      distinct: ['courseId'],
    });
    if (slotCourses.length === 0) return { restored: 0, skipped: 0 };

    let restored = 0;
    let skipped = 0;
    for (const { courseId } of slotCourses) {
      const course = await this.prisma.course.findUnique({
        where: { id: courseId },
        select: { sessions: true },
      });
      if (!course) {
        skipped++;
        continue;
      }
      const catalogLessons = await this.prisma.lesson.findMany({
        where: { courseId },
        select: { id: true, order: true },
      });
      const lessonIdByOrder = new Map(
        catalogLessons.map((l) => [l.order, l.id]),
      );

      const ok = await this.reconcileStudentCourseSchedule(
        studentUserId,
        courseId,
        lessonIdByOrder,
        course.sessions,
        actorId,
      );
      if (ok) restored++;
      else skipped++;
    }
    return { restored, skipped };
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

  // NOTE: there is no "auto-complete past lessons" cron based on a class's own
  // scheduled end. The only time-based finalization is the 75-minute
  // platform failsafe in ClassFinalizationService, which goes through the
  // exact same finalize path as a teacher's or admin's choice.

  /** True when this student has already used their one allowed
   * PARTIALLY_COMPLETED for this lesson (same student + curriculum + lesson
   * number). The PARTIALLY_COMPLETED row itself is the record — it is never
   * deleted or re-labelled — so this also covers the extra class it spawned
   * and any later edit/regeneration of the schedule. */
  async hasPartialCompletion(
    studentUserId: string,
    courseId: string,
    lessonNumber: number,
    client: PrismaService | Prisma.TransactionClient = this.prisma,
  ): Promise<boolean> {
    const count = await client.scheduledLesson.count({
      where: {
        studentUserId,
        courseId,
        lessonNumber,
        status: LessonStatus.PARTIALLY_COMPLETED,
      },
    });
    return count > 0;
  }

  // ─── Make-up occurrence (PARTIALLY_COMPLETED / INCOMPLETE) ───────────────
  //
  // Called by ClassFinalizationService, inside its finalize transaction, right
  // after `lesson` has left UPCOMING because it was ended PARTIALLY_COMPLETED
  // (the student gets one extra class to finish the same lesson) or INCOMPLETE
  // (the class did not happen, so the student gets it again). Either way the
  // student needs one more occurrence of the SAME lessonNumber. It works purely
  // on ScheduledLesson occurrences — it never touches Lesson/Course catalog
  // content or ordering:
  //
  //   1. Every already-generated future UPCOMING occurrence for this
  //      student+course "shifts one classday later": each one keeps its own
  //      calendar date but is reassigned the PREVIOUS occurrence's
  //      lessonNumber (so the very next occurrence is the extra class for
  //      this lesson, and everything after cascades down by one).
  //   2. One brand-new trailing occurrence is generated (via the student's
  //      existing RecurringSlot cadence, skipping slots where the teacher is
  //      already booked) to absorb the lessonNumber that fell off the end — so
  //      the number of remaining occurrences grows by exactly one, and no
  //      lesson number is ever lost or duplicated among active rows.
  //
  // The original row's own status was already moved out of UPCOMING by the
  // caller, which frees its lessonNumber under the partial unique index (see
  // schema.prisma).
  async insertMakeupOccurrence(
    tx: Prisma.TransactionClient,
    lesson: {
      id: string;
      studentUserId: string;
      courseId: string;
      teacherId: string;
      classType: ClassType;
      lessonNumber: number;
      start: Date;
    },
  ) {
    const { studentUserId, courseId, teacherId, classType, lessonNumber } =
      lesson;

    // Only the student's own 1-to-1 classes shift: a batch class has one lesson
    // sequence for the whole batch (BatchSessionsService.insertMakeupSession).
    const futureLessons = await tx.scheduledLesson.findMany({
      where: {
        studentUserId,
        courseId,
        batchSessionId: null,
        status: LessonStatus.UPCOMING,
        start: { gt: lesson.start },
      },
      orderBy: { start: 'asc' },
    });
    const slots = await tx.recurringSlot.findMany({
      where: { studentUserId, courseId },
    });
    const catalogLessons = await tx.lesson.findMany({
      where: { courseId },
      select: { id: true, order: true },
    });
    const lessonIdByOrder = new Map(catalogLessons.map((l) => [l.order, l.id]));

    const durationMs = CLASS_DURATION_MINUTES[classType] * 60_000;
    const lastStart =
      futureLessons.length > 0
        ? futureLessons[futureLessons.length - 1].start
        : lesson.start;

    // Candidate starts after the last scheduled class, in order. With no
    // recurring slots on file (should not happen for generated schedules) fall
    // back to the same weekly cadence as the class itself.
    const candidates: Date[] =
      slots.length > 0
        ? generateOccurrences(
            this.dateStrOf(lastStart),
            slots.map((s) => ({
              weekday: s.weekday,
              time: `${String(s.hour).padStart(2, '0')}:${String(s.minute).padStart(2, '0')}`,
            })),
            12,
          )
            .map((occ) => dhakaToUtc(occ.dateStr, occ.hour, occ.minute))
            .filter((start) => start > lastStart)
        : [new Date(lastStart.getTime() + 7 * 24 * 60 * 60_000)];

    let trailing: { start: Date; end: Date } | null = null;
    for (const start of candidates) {
      const end = new Date(start.getTime() + durationMs);
      const conflict = await this.findTeacherConflict(
        tx,
        teacherId,
        start,
        end,
      );
      if (!conflict) {
        trailing = { start, end };
        break;
      }
    }
    if (!trailing) {
      throw new BadRequestException(
        'Could not add the extra class — the teacher has no free recurring slot after the current schedule. An admin will need to schedule it manually.',
      );
    }

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

    const trailingNumber = lessonNumber + futureLessons.length;
    await tx.scheduledLesson.create({
      data: {
        studentUserId,
        teacherId,
        courseId,
        lessonNumber: trailingNumber,
        lessonId: lessonIdByOrder.get(trailingNumber) ?? undefined,
        start: trailing.start,
        end: trailing.end,
        classType,
        status: LessonStatus.UPCOMING,
      },
    });

    return { shiftedCount: futureLessons.length };
  }

  private dateStrOf(date: Date): string {
    return utcToDhakaParts(date).dateStr;
  }
}
