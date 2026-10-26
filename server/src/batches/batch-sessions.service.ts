// FILE PATH: server/src/batches/batch-sessions.service.ts
//
// The classes of a batch. A BatchSession is ONE real class — one time, one
// teacher, one lesson, one room, one status — and every student taking part has
// a ScheduledLesson "participant" row for it (attendance, outcome, test,
// homework, ledger and badges stay per student).
//
// Sessions are a derived projection of (the batch's weekly slots, where the
// batch is in its curriculum, who is placed in it). They exist only while the
// batch has a student who attends, so an empty batch holds no teacher time:
//
//   regenerateFutureSessions   rebuild the classes that have not opened yet
//   attachMember               put a student into the classes already there
//   detachFutureParticipation  take a student out of the classes still ahead
//   insertMakeupSession        one extra class for the whole batch
//
// A class that is under way (started, or opening within 10 minutes) is never
// touched by any of these. Every change to a session's time, teacher, lesson or
// status is written to its participant rows in the SAME transaction — the rows
// mirror the session and are never edited on their own.

import { randomUUID } from 'crypto';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  BatchStatus,
  ClassType,
  LessonStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CLASS_DURATION_MINUTES } from '../scheduling/class-duration';
import { dhakaToUtc, todayDhakaDateStr, utcToDhakaParts } from '../scheduling/dhaka-time.util';
import {
  formatSlotTime,
  generateOccurrences,
  type WeeklySlot,
} from '../scheduling/occurrences.util';
import {
  describeDhakaMoment,
  findTeacherConflict,
} from '../scheduling/teacher-conflict.util';
import {
  detachFutureParticipationInTx,
  pruneEmptyFutureSessionsInTx,
} from './batch-membership.util';
import {
  deadSessionWhere,
  freezeCutoff,
  loadBatchProgress,
  participatingMemberWhere,
  studentCompletedLessonNumbers,
  type Db,
} from './batch-progress.util';

export interface RegenerationResult {
  sessionsCreated: number;
  participantsCreated: number;
  /** Students left out of a class because they had already completed its
   * lesson (they would otherwise repeat it). */
  skipped: { studentUserId: string; lessonNumber: number }[];
}

const EMPTY_RESULT = (): RegenerationResult => ({
  sessionsCreated: 0,
  participantsCreated: 0,
  skipped: [],
});

type SessionShape = {
  id: string;
  batchId: string;
  teacherId: string;
  courseId: string;
  lessonNumber: number;
  lessonId: string | null;
  start: Date;
  end: Date;
};

@Injectable()
export class BatchSessionsService {
  private readonly logger = new Logger(BatchSessionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  // ─── Rows ───────────────────────────────────────────────────────────────

  private participantRow(
    session: SessionShape,
    studentUserId: string,
  ): Prisma.ScheduledLessonCreateManyInput {
    return {
      studentUserId,
      teacherId: session.teacherId,
      courseId: session.courseId,
      lessonNumber: session.lessonNumber,
      lessonId: session.lessonId,
      start: session.start,
      end: session.end,
      classType: ClassType.BATCH,
      status: LessonStatus.UPCOMING,
      batchId: session.batchId,
      batchSessionId: session.id,
    };
  }

  private async lessonIdsByOrder(
    db: Db,
    courseId: string,
  ): Promise<Map<number, string>> {
    const lessons = await db.lesson.findMany({
      where: { courseId },
      select: { id: true, order: true },
    });
    return new Map(lessons.map((l) => [l.order, l.id]));
  }

  /** Participant rows for `studentIds` in `sessions`, leaving out any class
   * whose lesson the student has already completed. */
  private async participantsFor(
    db: Db,
    courseId: string,
    sessions: SessionShape[],
    studentIds: string[],
  ) {
    const completed = await studentCompletedLessonNumbers(
      db,
      studentIds,
      courseId,
    );
    const rows: Prisma.ScheduledLessonCreateManyInput[] = [];
    const skipped: RegenerationResult['skipped'] = [];
    for (const session of sessions) {
      for (const studentUserId of studentIds) {
        if (completed.get(studentUserId)?.has(session.lessonNumber)) {
          skipped.push({ studentUserId, lessonNumber: session.lessonNumber });
          continue;
        }
        rows.push(this.participantRow(session, studentUserId));
      }
    }
    return { rows, skipped };
  }

  // ─── Generation ─────────────────────────────────────────────────────────

  /**
   * Rebuilds the classes of a batch that have not opened yet: the batch's weekly
   * slots, from where the batch is in its curriculum, for every student who
   * attends. Classes under way and everything finalized are left exactly as
   * they are. The caller holds the batch lock.
   */
  async regenerateFutureSessions(
    tx: Prisma.TransactionClient,
    batchId: string,
    opts: { now?: Date; fromDateStr?: string } = {},
  ): Promise<RegenerationResult> {
    const now = opts.now ?? new Date();
    const cutoff = freezeCutoff(now);
    const batch = await tx.batch.findUnique({
      where: { id: batchId },
      include: { slots: true, course: { select: { id: true, sessions: true } } },
    });
    if (!batch) throw new NotFoundException('Batch not found.');

    // 1. The classes that have not opened yet go (never the ones under way),
    //    and so do past classes nobody ever attended — they never happened.
    const stale = await tx.batchSession.findMany({
      where: {
        batchId,
        OR: [
          {
            status: { in: [LessonStatus.UPCOMING, LessonStatus.CANCELLED] },
            start: { gt: cutoff },
          },
          deadSessionWhere(batchId, now),
        ],
      },
      select: { id: true },
    });
    if (stale.length > 0) {
      const ids = stale.map((s) => s.id);
      await tx.scheduledLesson.deleteMany({ where: { batchSessionId: { in: ids } } });
      await tx.batchSession.deleteMany({ where: { id: { in: ids } } });
    }

    if (batch.status !== BatchStatus.ACTIVE) return EMPTY_RESULT();

    const members = await tx.batchMember.findMany({
      where: participatingMemberWhere(batchId),
      select: { studentUserId: true },
    });
    if (members.length === 0) return EMPTY_RESULT();

    if (batch.slots.length === 0) {
      throw new BadRequestException(
        'This batch has no weekly time slots. Add at least one before adding students.',
      );
    }

    // 2. Where the batch is in the curriculum decides where the classes start.
    const progress = await loadBatchProgress(tx, batch, now);
    const count = batch.course.sessions - progress.nextLesson + 1;
    if (count <= 0) {
      // Every lesson of the curriculum has been taught.
      if (progress.frozenMax === null) {
        await tx.batch.update({
          where: { id: batchId },
          data: { status: BatchStatus.COMPLETED },
        });
      }
      return EMPTY_RESULT();
    }

    // 3. The dates.
    const today = todayDhakaDateStr();
    const firstDate =
      opts.fromDateStr ??
      (batch.startDate > today ? batch.startDate : today);
    const slots: WeeklySlot[] = batch.slots.map((s) => ({
      weekday: s.weekday,
      time: formatSlotTime(s.hour, s.minute),
    }));
    const starts = generateOccurrences(firstDate, slots, count + slots.length + 2)
      .map((occ) => dhakaToUtc(occ.dateStr, occ.hour, occ.minute))
      .filter((start) => start.getTime() > cutoff.getTime())
      .slice(0, count);
    if (starts.length < count) {
      throw new BadRequestException(
        'Could not generate the full class schedule from the batch slots.',
      );
    }

    const durationMs = CLASS_DURATION_MINUTES.BATCH * 60_000;
    for (let i = 1; i < starts.length; i++) {
      if (starts[i].getTime() < starts[i - 1].getTime() + durationMs) {
        throw new BadRequestException(
          `The batch's weekly slots overlap on ${describeDhakaMoment(starts[i])} (Asia/Dhaka). Classes are ${CLASS_DURATION_MINUTES.BATCH} minutes long, so slots on one day must be at least that far apart.`,
        );
      }
    }
    for (const start of starts) {
      const end = new Date(start.getTime() + durationMs);
      const conflict = await findTeacherConflict(tx, batch.teacherId, start, end);
      if (conflict) {
        throw new BadRequestException(
          `The teacher is already booked on ${describeDhakaMoment(start)} (Asia/Dhaka). Choose a different day/time.`,
        );
      }
    }

    // 4. The classes and each attending student's own row in them.
    const lessonIdByOrder = await this.lessonIdsByOrder(tx, batch.courseId);
    const sessions: SessionShape[] = starts.map((start, i) => {
      const lessonNumber = progress.nextLesson + i;
      return {
        id: randomUUID(),
        batchId,
        teacherId: batch.teacherId,
        courseId: batch.courseId,
        lessonNumber,
        lessonId: lessonIdByOrder.get(lessonNumber) ?? null,
        start,
        end: new Date(start.getTime() + durationMs),
      };
    });
    await tx.batchSession.createMany({
      data: sessions.map((s) => ({ ...s, status: LessonStatus.UPCOMING })),
    });
    const { rows, skipped } = await this.participantsFor(
      tx,
      batch.courseId,
      sessions,
      members.map((m) => m.studentUserId),
    );
    if (rows.length > 0) await tx.scheduledLesson.createMany({ data: rows });

    return {
      sessionsCreated: sessions.length,
      participantsCreated: rows.length,
      skipped,
    };
  }

  /** Puts a student into the classes of their batch that are still ahead.
   * Returns false when there are none yet (the caller then regenerates). */
  async attachMember(
    tx: Prisma.TransactionClient,
    batchId: string,
    studentUserId: string,
    now = new Date(),
  ): Promise<{ hasSessions: boolean; attached: number; skipped: number[] }> {
    const sessions = await tx.batchSession.findMany({
      where: { batchId, status: LessonStatus.UPCOMING, start: { gt: now } },
      orderBy: { start: 'asc' },
    });
    if (sessions.length === 0) {
      return { hasSessions: false, attached: 0, skipped: [] };
    }
    const { rows, skipped } = await this.participantsFor(
      tx,
      sessions[0].courseId,
      sessions,
      [studentUserId],
    );
    if (rows.length > 0) {
      await tx.scheduledLesson.createMany({ data: rows, skipDuplicates: true });
    }
    return {
      hasSessions: true,
      attached: rows.length,
      skipped: skipped.map((s) => s.lessonNumber),
    };
  }

  /** Takes a student out of the classes of a batch that are still ahead (their
   * finalized and in-progress classes stay) and frees the teacher's time for
   * any class that is left with nobody. */
  detachFutureParticipation(
    tx: Prisma.TransactionClient,
    studentUserId: string,
    batchId: string,
    now = new Date(),
  ): Promise<number> {
    return detachFutureParticipationInTx(tx, studentUserId, batchId, now);
  }

  /** Deletes the classes still ahead that have no student left in them. */
  pruneEmptyFutureSessions(
    tx: Prisma.TransactionClient,
    batchId: string,
    now = new Date(),
  ): Promise<number> {
    return pruneEmptyFutureSessionsInTx(tx, batchId, now);
  }

  // ─── One extra class for the whole batch ────────────────────────────────

  /**
   * A class ended PARTIALLY_COMPLETED or INCOMPLETE, so the batch needs the same
   * lesson once more. Every class still ahead moves one place down the
   * sequence (dates never move) and one new class is added at the end — the
   * same rule as a 1:1 student's make-up, applied once to the whole batch, so
   * the batch's lesson sequence stays one sequence. Runs inside the
   * finalization transaction.
   */
  async insertMakeupSession(
    tx: Prisma.TransactionClient,
    session: {
      id: string;
      batchId: string;
      teacherId: string;
      courseId: string;
      lessonNumber: number;
      start: Date;
    },
  ): Promise<{ shiftedCount: number }> {
    const batch = await tx.batch.findUniqueOrThrow({
      where: { id: session.batchId },
      include: { slots: true },
    });
    const future = await tx.batchSession.findMany({
      where: {
        batchId: session.batchId,
        status: LessonStatus.UPCOMING,
        start: { gt: session.start },
      },
      orderBy: { start: 'asc' },
      select: { id: true, start: true },
    });
    const lastStart =
      future.length > 0 ? future[future.length - 1].start : session.start;
    const durationMs = CLASS_DURATION_MINUTES.BATCH * 60_000;

    const slots: WeeklySlot[] = batch.slots.map((s) => ({
      weekday: s.weekday,
      time: formatSlotTime(s.hour, s.minute),
    }));
    const candidates: Date[] =
      slots.length > 0
        ? generateOccurrences(utcToDhakaParts(lastStart).dateStr, slots, 12)
            .map((occ) => dhakaToUtc(occ.dateStr, occ.hour, occ.minute))
            .filter((start) => start > lastStart)
        : [new Date(lastStart.getTime() + 7 * 24 * 60 * 60_000)];

    let trailing: { start: Date; end: Date } | null = null;
    for (const start of candidates) {
      const end = new Date(start.getTime() + durationMs);
      if (!(await findTeacherConflict(tx, session.teacherId, start, end))) {
        trailing = { start, end };
        break;
      }
    }
    if (!trailing) {
      throw new BadRequestException(
        'Could not add the extra class — the teacher has no free recurring slot after the current schedule. An admin will need to schedule it manually.',
      );
    }

    const lessonIdByOrder = await this.lessonIdsByOrder(tx, session.courseId);

    // Each later class takes the previous class's lesson number; ascending order
    // keeps a student's UPCOMING lesson numbers unique at every step.
    for (let i = 0; i < future.length; i++) {
      const lessonNumber = session.lessonNumber + i;
      const lessonId = lessonIdByOrder.get(lessonNumber) ?? null;
      await tx.batchSession.update({
        where: { id: future[i].id },
        data: { lessonNumber, lessonId },
      });
      await tx.scheduledLesson.updateMany({
        where: { batchSessionId: future[i].id },
        data: { lessonNumber, lessonId },
      });
    }

    const lessonNumber = session.lessonNumber + future.length;
    const created: SessionShape = {
      id: randomUUID(),
      batchId: session.batchId,
      teacherId: session.teacherId,
      courseId: session.courseId,
      lessonNumber,
      lessonId: lessonIdByOrder.get(lessonNumber) ?? null,
      start: trailing.start,
      end: trailing.end,
    };
    await tx.batchSession.create({
      data: { ...created, status: LessonStatus.UPCOMING },
    });
    const members = await tx.batchMember.findMany({
      where: participatingMemberWhere(session.batchId),
      select: { studentUserId: true },
    });
    const { rows } = await this.participantsFor(
      tx,
      session.courseId,
      [created],
      members.map((m) => m.studentUserId),
    );
    if (rows.length > 0) await tx.scheduledLesson.createMany({ data: rows });

    return { shiftedCount: future.length };
  }

  /** True when this batch has already used its one PARTIALLY_COMPLETED for the
   * lesson (the extra class it created is the second class of that lesson). */
  async hasPartialCompletion(
    db: Db,
    batchId: string,
    lessonNumber: number,
  ): Promise<boolean> {
    const count = await db.batchSession.count({
      where: {
        batchId,
        lessonNumber,
        status: LessonStatus.PARTIALLY_COMPLETED,
      },
    });
    return count > 0;
  }

  // ─── Changing the teacher of the classes still ahead ─────────────────────

  /** Moves every class still ahead to another teacher (checking that teacher's
   * calendar for each one) and the batch's students with it. Classes already
   * taught keep their teacher. The caller holds the batch lock. */
  async moveFutureSessionsToTeacher(
    tx: Prisma.TransactionClient,
    batchId: string,
    newTeacherId: string,
    now = new Date(),
  ): Promise<number> {
    const cutoff = freezeCutoff(now);
    const underWay = await tx.batchSession.count({
      where: {
        batchId,
        status: LessonStatus.UPCOMING,
        start: { lte: cutoff },
        participants: { some: {} },
      },
    });
    if (underWay > 0) {
      throw new BadRequestException(
        'A class of this batch is under way or about to open. Change the teacher after it has ended.',
      );
    }

    const sessions = await tx.batchSession.findMany({
      where: { batchId, status: LessonStatus.UPCOMING, start: { gt: cutoff } },
      select: { id: true, start: true, end: true },
    });
    for (const s of sessions) {
      const conflict = await findTeacherConflict(
        tx,
        newTeacherId,
        s.start,
        s.end,
        { excludeSessionId: s.id },
      );
      if (conflict) {
        throw new BadRequestException(
          `The new teacher is already booked on ${describeDhakaMoment(s.start)} (Asia/Dhaka), so the batch cannot move to them.`,
        );
      }
    }
    if (sessions.length > 0) {
      const ids = sessions.map((s) => s.id);
      await tx.batchSession.updateMany({
        where: { id: { in: ids } },
        data: { teacherId: newTeacherId },
      });
      await tx.scheduledLesson.updateMany({
        where: { batchSessionId: { in: ids } },
        data: { teacherId: newTeacherId },
      });
    }
    return sessions.length;
  }

  // ─── Admin overrides on one class (the Classes page) ─────────────────────

  private sessionForOverride(sessionId: string) {
    return this.prisma.batchSession.findUnique({
      where: { id: sessionId },
      include: {
        batch: { select: { name: true } },
        teacher: { select: { user: { select: { fullName: true } } } },
        participants: {
          where: { status: LessonStatus.UPCOMING },
          include: { student: { select: { email: true, fullName: true } } },
        },
      },
    });
  }

  /** Moves one class (for every student in it) to another time. */
  async adminRescheduleSession(
    sessionId: string,
    newStart: Date,
    newEnd: Date,
    adminUserId: string,
  ) {
    if (newEnd <= newStart) {
      throw new BadRequestException('End time must be after start time.');
    }
    const session = await this.sessionForOverride(sessionId);
    if (!session) throw new NotFoundException('Class not found.');
    if (session.status !== LessonStatus.UPCOMING) {
      throw new BadRequestException('Only upcoming classes can be rescheduled.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const conflict = await findTeacherConflict(
        tx,
        session.teacherId,
        newStart,
        newEnd,
        { excludeSessionId: sessionId },
      );
      if (conflict) {
        throw new BadRequestException(
          'Teacher is already booked in that window. Choose a different time.',
        );
      }
      const moved = await tx.batchSession.update({
        where: { id: sessionId },
        data: { start: newStart, end: newEnd },
      });
      await tx.scheduledLesson.updateMany({
        where: { batchSessionId: sessionId, status: LessonStatus.UPCOMING },
        data: { start: newStart, end: newEnd },
      });
      return moved;
    });

    await this.audit.log({
      actorId: adminUserId,
      actorRole: 'ADMIN',
      action: 'ADMIN_BATCH_SESSION_RESCHEDULE',
      entityType: 'BatchSession',
      entityId: sessionId,
      beforeData: { start: session.start, end: session.end },
      afterData: { start: newStart, end: newEnd, batch: session.batch.name },
    });
    for (const p of session.participants) {
      this.notifications
        .sendClassRescheduledToStudent(p.student.email, {
          requestId: p.id,
          studentName: p.student.fullName,
          teacherName: session.teacher.user.fullName,
          oldStart: session.start,
          newStart,
          changedBy: 'ADMIN',
        })
        .catch(() => {});
    }
    return updated;
  }

  /** Cancels one class for every student in it. */
  async adminCancelSession(
    sessionId: string,
    reason: string,
    adminUserId: string,
  ) {
    if (!reason?.trim()) {
      throw new BadRequestException('A reason is required to cancel a class.');
    }
    const session = await this.sessionForOverride(sessionId);
    if (!session) throw new NotFoundException('Class not found.');
    if (session.status !== LessonStatus.UPCOMING) {
      throw new BadRequestException('Only upcoming classes can be cancelled.');
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.batchSession.update({
        where: { id: sessionId },
        data: { status: LessonStatus.CANCELLED },
      }),
      this.prisma.scheduledLesson.updateMany({
        where: { batchSessionId: sessionId, status: LessonStatus.UPCOMING },
        data: { status: LessonStatus.CANCELLED },
      }),
    ]);

    await this.audit.log({
      actorId: adminUserId,
      actorRole: 'ADMIN',
      action: 'ADMIN_BATCH_SESSION_CANCELLED',
      entityType: 'BatchSession',
      entityId: sessionId,
      reason,
      beforeData: { status: session.status },
      afterData: { status: 'CANCELLED', batch: session.batch.name },
    });
    for (const p of session.participants) {
      this.notifications
        .sendClassCancelledToStudent(p.student.email, {
          requestId: p.id,
          studentName: p.student.fullName,
          teacherName: session.teacher.user.fullName,
          classStart: session.start,
          cancelledBy: 'ADMIN',
        })
        .catch(() => {});
    }
    return updated;
  }

  /** Removes one class and every student's row in it. Refused when the class
   * has records attached (payments, attempts, recordings) — cancel it then. */
  async adminDeleteSession(
    sessionId: string,
    adminUserId: string,
    reason?: string,
  ) {
    const session = await this.prisma.batchSession.findUnique({
      where: { id: sessionId },
      include: { participants: { select: { id: true } } },
    });
    if (!session) throw new NotFoundException('Class not found.');

    try {
      await this.prisma.$transaction([
        this.prisma.scheduledLesson.deleteMany({
          where: { batchSessionId: sessionId },
        }),
        this.prisma.batchSession.delete({ where: { id: sessionId } }),
      ]);
    } catch (err) {
      if ((err as { code?: string }).code === 'P2003') {
        throw new BadRequestException(
          'This class has records attached (payments, test attempts or recordings) and cannot be deleted. Cancel it instead.',
        );
      }
      throw err;
    }

    await this.audit.log({
      actorId: adminUserId,
      actorRole: 'ADMIN',
      action: 'ADMIN_BATCH_SESSION_DELETED',
      entityType: 'BatchSession',
      entityId: sessionId,
      reason,
      beforeData: { ...session, participants: session.participants.length },
    });
    return { success: true };
  }
}
