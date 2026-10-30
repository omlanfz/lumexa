// FILE PATH: server/src/classroom/class-finalization.service.ts
//
// The ONE place a curriculum class (ScheduledLesson) leaves UPCOMING. Three
// callers, one set of business rules:
//
//   - the teacher, via ClassroomService.endClass (End Class button),
//   - an admin, via AdminController (Students → Schedule status selector),
//   - the platform failsafe below, 75 minutes after the scheduled start.
//
// A 1:1 class is finalized per lesson (finalizeLesson). A BATCH class is ONE
// class however many students are in it: it is finalized once, on its
// BatchSession (finalizeBatchSession) — the teacher is paid once, the room and
// recording are wrapped up once, a make-up (if any) is one extra class for the
// whole batch — while what belongs to each student (their attendance, outcome,
// lesson consumption on their own ledger) is recorded on their own row.
//
// Outcomes and their (identical for every caller) effects:
//
//   COMPLETED            teacher earning +1, student lesson -1, progression
//                        moves on.
//   PARTIALLY_COMPLETED  same money as COMPLETED, and one extra occurrence of
//                        the SAME lesson is scheduled right after this one
//                        (everything later shifts by one class). Allowed once
//                        per student + curriculum + lesson number.
//   INCOMPLETE           no earning, no progression; a make-up occurrence of
//                        the same lesson is scheduled. A 1:1 student is not
//                        charged. A BATCH class still charges every enrolled
//                        student (see below).
//
// Student charging (the student's own ledger, never the teacher's):
//   - 1:1 class: one lesson, only when the class was paid (Completed /
//     Partially Completed) AND the student attended. A student who did not
//     attend is never charged, whoever finalizes the class.
//   - BATCH class: one lesson from EVERY student enrolled in the class, for
//     Completed, Partially Completed and Incomplete alike, whether or not they
//     attended. Charging never changes a student's outcome or progression: an
//     Incomplete class repeats the same lesson in its make-up class.
//
// ─── Why this is safe to call concurrently ──────────────────────────────────
// The status change is a compare-and-set (`UPDATE ... WHERE status =
// 'UPCOMING'`) that runs in the SAME database transaction as the teacher
// earning, the student ledger deduction and the schedule shift. Exactly one
// caller can win that update; a loser (double click, retried request, admin
// racing the teacher, failsafe racing either) sees zero rows changed, writes
// nothing and never overwrites the winner's status. Because the money rows are
// written inside the winning transaction, a crash can never leave a class
// finalized without its earning/deduction, or the reverse. Everything that is
// merely a side effect (recording stop, room teardown, notifications, audit)
// runs after commit, only for the winner, so it can never be duplicated.

import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ClassEndReason, ClassType, LessonStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { AlertsService } from '../alerts/alerts.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PayoutsService } from '../payouts/payouts.service';
import { StudentLedgerService } from '../students/student-ledger.service';
import { StudentProgressService } from '../students/progress/student-progress.service';
import { SchedulingService } from '../scheduling/scheduling.service';
import { CLASS_COMPLETED_AMOUNT_CENTS } from '../payouts/payout.constants';
import { DailyRoomsService } from './daily-rooms.service';
import { RecordingService } from './recording.service';
import { roomForBatchSession, roomForLessonRecord } from './room-ref.util';
import { BatchSessionsService } from '../batches/batch-sessions.service';

export type ClassOutcome = 'COMPLETED' | 'PARTIALLY_COMPLETED' | 'INCOMPLETE';

export const CLASS_OUTCOMES: ClassOutcome[] = [
  'COMPLETED',
  'PARTIALLY_COMPLETED',
  'INCOMPLETE',
];

/** The only reasons a class can be ended INCOMPLETE. (STUDENT_LEFT_EARLY and
 * TEACHER_DISCONNECTED remain valid enum values for historical rows only.) */
export const INCOMPLETE_REASONS: ClassEndReason[] = [
  ClassEndReason.STUDENT_NO_SHOW,
  ClassEndReason.TECHNICAL_ISSUE,
  ClassEndReason.OTHER,
];

/** A class that nobody has ended is ended by the platform this long after its
 * scheduled start. */
export const CLASS_FAILSAFE_MINUTES = 75;

// The failsafe only ever acts on classes scheduled on/after this instant, so
// deploying it can never retroactively finalize (and pay) historical classes
// that were left UPCOMING before it existed. Override per environment with
// CLASS_FAILSAFE_EFFECTIVE_FROM (ISO-8601).
const FAILSAFE_EFFECTIVE_FROM = new Date(
  process.env.CLASS_FAILSAFE_EFFECTIVE_FROM || '2026-10-03T00:00:00.000Z',
);
// Bounded lookback keeps the sweep a cheap scan and means a long outage can't
// trigger a flood of very old finalizations.
const FAILSAFE_LOOKBACK_MS = 48 * 60 * 60 * 1000;

export interface FinalizeActor {
  role: 'TEACHER' | 'ADMIN' | 'SYSTEM';
  userId?: string;
}

export interface FinalizeParams {
  outcome: ClassOutcome;
  reason?: ClassEndReason;
  note?: string;
  actor: FinalizeActor;
}

export interface FinalizeResult {
  /** false when this call changed nothing because the class was already
   * finalized (an idempotent repeat of the same request, or a lost race). */
  finalized: boolean;
  status: LessonStatus;
}

const OUTCOME_LABEL: Record<ClassOutcome, string> = {
  COMPLETED: 'Completed',
  PARTIALLY_COMPLETED: 'Partially Completed',
  INCOMPLETE: 'Incomplete',
};

@Injectable()
export class ClassFinalizationService {
  private readonly logger = new Logger(ClassFinalizationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly alerts: AlertsService,
    private readonly notifications: NotificationsService,
    private readonly payouts: PayoutsService,
    private readonly studentLedger: StudentLedgerService,
    private readonly scheduling: SchedulingService,
    private readonly recording: RecordingService,
    private readonly batches: BatchSessionsService,
    private readonly rooms: DailyRoomsService,
    private readonly studentProgress: StudentProgressService,
  ) {}

  // ─── Public: finalize one class ───────────────────────────────────────────

  async finalizeLesson(
    lessonId: string,
    params: FinalizeParams,
  ): Promise<FinalizeResult> {
    const { outcome, actor } = params;
    this.assertValidParams(params);

    const isIncomplete = outcome === 'INCOMPLETE';
    const isPaid = !isIncomplete;
    const reason = isIncomplete ? params.reason : undefined;
    const note = isIncomplete ? params.note?.trim() || null : null;

    const lesson = await this.prisma.scheduledLesson.findUnique({
      where: { id: lessonId },
      include: {
        teacher: { select: { id: true, userId: true } },
        student: { select: { id: true, fullName: true, email: true } },
      },
    });
    if (!lesson) throw new NotFoundException('Class not found.');

    // A batch student's lesson is their row in a class the whole batch shares:
    // the class is what gets finalized (an admin choosing a status here
    // finalizes the batch class, for every student in it).
    if (lesson.batchSessionId) {
      const { finalized, status } = await this.finalizeBatchSession(
        lesson.batchSessionId,
        params,
      );
      return { finalized, status };
    }

    if (lesson.status !== LessonStatus.UPCOMING) {
      return this.alreadyFinalized(lesson, params);
    }

    // A class the student never attended cannot be paid for. Admins can
    // override (e.g. crediting a lesson that was taught outside the platform).
    if (isPaid && actor.role !== 'ADMIN' && !lesson.studentJoinedAt) {
      throw new BadRequestException(
        `This class cannot be marked as ${OUTCOME_LABEL[outcome].toLowerCase()} because the student did not join.`,
      );
    }

    const now = new Date();
    const claim = await this.prisma.$transaction(
      async (tx) => {
        if (
          outcome === 'PARTIALLY_COMPLETED' &&
          (await this.scheduling.hasPartialCompletion(
            lesson.studentUserId,
            lesson.courseId,
            lesson.lessonNumber,
            tx,
          ))
        ) {
          throw new BadRequestException(
            'Partially Completed has already been used for this lesson. Choose Completed or Incomplete.',
          );
        }

        // Compare-and-set: only one concurrent caller can move the lesson out
        // of UPCOMING. Everything below runs only for that winner.
        const won = await tx.scheduledLesson.updateMany({
          where: { id: lessonId, status: LessonStatus.UPCOMING },
          data: {
            status: outcome,
            endedAt: now,
            endedByRole: actor.role,
            endReason: reason ?? null,
            endNote: note,
          },
        });
        if (won.count !== 1) return null;

        let lessonConsumed = false;
        if (isPaid) {
          await this.payouts.recordScheduledLessonEarningInTx(tx, {
            id: lesson.id,
            teacherId: lesson.teacher.id,
            studentName: lesson.student.fullName,
            end: lesson.end,
          });
          // A 1:1 student who did not attend is not charged (an admin may
          // still settle the class; the balance is then corrected, if needed,
          // with an Admin adjustment).
          if (lesson.studentJoinedAt) {
            lessonConsumed =
              await this.studentLedger.consumeLessonForScheduledLessonInTx(tx, {
                scheduledLessonId: lesson.id,
                studentUserId: lesson.studentUserId,
                eventDate: lesson.end,
                note:
                  outcome === 'PARTIALLY_COMPLETED'
                    ? 'extra class scheduled'
                    : undefined,
              });
          }
        }

        const makeup =
          isPaid && outcome === 'COMPLETED'
            ? null
            : await this.scheduling.insertMakeupOccurrence(tx, lesson);

        return { lessonConsumed, makeup };
      },
      { timeout: 20_000, maxWait: 10_000 },
    );

    if (!claim) {
      // Lost the race to another caller — never overwrite their result.
      const fresh = await this.prisma.scheduledLesson.findUnique({
        where: { id: lessonId },
      });
      if (!fresh) throw new NotFoundException('Class not found.');
      return this.alreadyFinalized(fresh, params);
    }

    await this.afterFinalize(lesson, params, claim);
    return { finalized: true, status: outcome };
  }

  /** What every caller must say to end a class: one of the three outcomes
   * and, for Incomplete, why. */
  private assertValidParams(params: FinalizeParams): void {
    const { outcome } = params;
    if (!CLASS_OUTCOMES.includes(outcome)) {
      throw new BadRequestException(
        'Choose Completed, Partially Completed or Incomplete to end this class.',
      );
    }
    if (outcome === 'INCOMPLETE') {
      const reason = params.reason;
      const note = params.note?.trim() || null;
      if (!reason || !INCOMPLETE_REASONS.includes(reason)) {
        throw new BadRequestException(
          'Choose a reason for marking this class incomplete.',
        );
      }
      if (reason === ClassEndReason.OTHER && !note) {
        throw new BadRequestException('Add a short note explaining why.');
      }
    }
  }

  // ─── Public: finalize a batch class (ONE class, one row per student) ──────
  //
  // The teacher picks one outcome for the class. The class — not each student —
  // is what moves out of UPCOMING, once, in one transaction that also:
  //   - pays the teacher ONCE for the class (never once per student),
  //   - gives each student their own row's outcome and consumes ONE lesson from
  //     that student's own ledger if they were in the class,
  //   - for Partially Completed / Incomplete, adds ONE extra class for the
  //     whole batch (the batch has one lesson sequence).
  //
  // A student who never joined a class that did take place is recorded as an
  // Incomplete no-show for that class: no payment, no lesson consumed — and no
  // make-up of their own. A batch class cannot be redone for one student (they
  // catch up from the recording), which is also what keeps the batch on one
  // lesson sequence. An admin settling a class credits every student in it
  // (the same override an admin has on a 1-to-1 class).
  async finalizeBatchSession(
    sessionId: string,
    params: FinalizeParams,
  ): Promise<
    FinalizeResult & {
      lessons: {
        lessonId: string;
        studentUserId: string;
        status: LessonStatus;
      }[];
    }
  > {
    this.assertValidParams(params);
    const { outcome, actor } = params;
    const isPaid = outcome !== 'INCOMPLETE';

    const session = await this.prisma.batchSession.findUnique({
      where: { id: sessionId },
      include: {
        batch: { select: { id: true, name: true } },
        teacher: { select: { id: true, userId: true } },
        participants: {
          include: {
            student: { select: { id: true, fullName: true, email: true } },
          },
          orderBy: { id: 'asc' },
        },
      },
    });
    if (!session) throw new NotFoundException('Class not found.');

    const rowsOf = (
      participants: {
        id: string;
        studentUserId: string;
        status: LessonStatus;
      }[],
    ) =>
      participants.map((p) => ({
        lessonId: p.id,
        studentUserId: p.studentUserId,
        status: p.status,
      }));

    if (session.status !== LessonStatus.UPCOMING) {
      return {
        ...this.alreadyFinalized(session, params),
        lessons: rowsOf(session.participants),
      };
    }

    const open = session.participants.filter(
      (p) => p.status === LessonStatus.UPCOMING,
    );

    // A class with nobody in it never ran: close it without paying anyone and
    // without adding a make-up for a class that had no students.
    if (open.length === 0) {
      const closed = await this.prisma.batchSession.updateMany({
        where: { id: sessionId, status: LessonStatus.UPCOMING },
        data: {
          status: LessonStatus.CANCELLED,
          endedAt: new Date(),
          endedByRole: actor.role,
        },
      });
      if (closed.count === 1) await this.wrapUpSessionRoom(sessionId);
      return {
        finalized: closed.count === 1,
        status: LessonStatus.CANCELLED,
        lessons: rowsOf(session.participants),
      };
    }

    // Attendance: the students who were in the class.
    const attendees = open.filter((p) => p.studentJoinedAt);
    if (isPaid && actor.role !== 'ADMIN' && attendees.length === 0) {
      throw new BadRequestException(
        `This class cannot be marked as ${OUTCOME_LABEL[outcome].toLowerCase()} because no student joined.`,
      );
    }

    const now = new Date();
    const claim = await this.prisma.$transaction(
      async (tx) => {
        if (
          outcome === 'PARTIALLY_COMPLETED' &&
          (await this.batches.hasPartialCompletion(
            tx,
            session.batchId,
            session.lessonNumber,
          ))
        ) {
          throw new BadRequestException(
            'Partially Completed has already been used for this lesson. Choose Completed or Incomplete.',
          );
        }

        // Compare-and-set: only one concurrent caller can move the class out
        // of UPCOMING. Everything below runs only for that winner.
        const won = await tx.batchSession.updateMany({
          where: { id: sessionId, status: LessonStatus.UPCOMING },
          data: {
            status: outcome,
            endedAt: now,
            endedByRole: actor.role,
            endReason:
              outcome === 'INCOMPLETE' ? (params.reason ?? null) : null,
            endNote:
              outcome === 'INCOMPLETE' ? params.note?.trim() || null : null,
          },
        });
        if (won.count !== 1) return null;

        // Each student's own row: their own outcome, their own ledger.
        const results: {
          lessonId: string;
          studentUserId: string;
          status: ClassOutcome;
          consumed: boolean;
          noShow: boolean;
        }[] = [];
        for (const p of open) {
          const credited = actor.role === 'ADMIN' || !!p.studentJoinedAt;
          const individual: ClassOutcome =
            isPaid && credited ? outcome : 'INCOMPLETE';
          const noShow = isPaid && !credited;
          await tx.scheduledLesson.update({
            where: { id: p.id },
            data: {
              status: individual,
              endedAt: now,
              endedByRole: actor.role,
              endReason:
                individual === 'INCOMPLETE'
                  ? noShow
                    ? ClassEndReason.STUDENT_NO_SHOW
                    : (params.reason ?? null)
                  : null,
              endNote:
                individual === 'INCOMPLETE'
                  ? noShow
                    ? 'The student did not join this batch class.'
                    : params.note?.trim() || null
                  : null,
            },
          });
          // Strict batch billing: every enrolled student is charged for the
          // class, whatever their attendance and the class outcome. This never
          // touches the row's status above, so an Incomplete class still
          // repeats the same lesson. The ledger's unique (class row, type)
          // makes this at most one charge per student per class.
          const consumed =
            await this.studentLedger.consumeLessonForScheduledLessonInTx(tx, {
              scheduledLessonId: p.id,
              studentUserId: p.studentUserId,
              eventDate: session.end,
              description: this.batchChargeDescription(session, outcome, p),
            });
          results.push({
            lessonId: p.id,
            studentUserId: p.studentUserId,
            status: individual,
            consumed,
            noShow: noShow && !p.studentJoinedAt,
          });
        }

        // The teacher is paid once for the class.
        const taught = results.filter((r) => r.status !== 'INCOMPLETE').length;
        if (isPaid) {
          await this.payouts.recordBatchSessionEarningInTx(tx, {
            id: session.id,
            teacherId: session.teacher.id,
            batchName: session.batch.name,
            students: taught,
            end: session.end,
          });
        }

        // The whole batch repeats the lesson (one extra class), or — when the
        // last lesson has been taught — the batch is complete.
        const makeup =
          outcome === 'COMPLETED'
            ? null
            : await this.batches.insertMakeupSession(tx, session);
        if (outcome === 'COMPLETED') {
          const remaining = await tx.batchSession.count({
            where: { batchId: session.batchId, status: LessonStatus.UPCOMING },
          });
          if (remaining === 0) {
            await tx.batch.updateMany({
              where: { id: session.batchId, status: 'ACTIVE' },
              data: { status: 'COMPLETED' },
            });
          }
        }
        return { results, makeup, taught };
      },
      { timeout: 20_000, maxWait: 10_000 },
    );

    if (!claim) {
      // Lost the race to another caller — never overwrite their result.
      const fresh = await this.prisma.batchSession.findUnique({
        where: { id: sessionId },
        include: { participants: true },
      });
      if (!fresh) throw new NotFoundException('Class not found.');
      return {
        ...this.alreadyFinalized(fresh, params),
        lessons: rowsOf(fresh.participants),
      };
    }

    await this.afterFinalizeSession(session, params, claim);
    return {
      finalized: true,
      status: outcome,
      lessons: claim.results.map((r) => ({
        lessonId: r.lessonId,
        studentUserId: r.studentUserId,
        status: r.status,
      })),
    };
  }

  /** What the student's Payments tab says about a batch-class charge: which
   * class and date, and why they were charged when they did not benefit from
   * a taught lesson. */
  private batchChargeDescription(
    session: {
      end: Date;
      lessonNumber: number;
      batch: { name: string };
    },
    outcome: ClassOutcome,
    participant: { studentJoinedAt: Date | null },
  ): string {
    const reasons: string[] = [];
    if (!participant.studentJoinedAt) reasons.push('absent');
    if (outcome === 'INCOMPLETE') reasons.push('class incomplete');
    if (outcome === 'PARTIALLY_COMPLETED')
      reasons.push('extra class scheduled');
    return (
      `Batch class "${session.batch.name}" · Lesson ${session.lessonNumber} on ${session.end.toDateString()}` +
      (reasons.length ? ` (${reasons.join(', ')})` : '')
    );
  }

  /** Closes out the class's recording (a browser still recording now only waits
   * for its upload) and closes the live room — once, for the whole class. */
  private async wrapUpSessionRoom(sessionId: string) {
    const room = roomForBatchSession(sessionId);
    await this.recording
      .stopActiveSegmentIfAny(room)
      .then(() => this.recording.finalizeAtClassEnd(room))
      .catch((err) =>
        this.logger.error(
          `Recording wrap-up failed for batch class ${sessionId}: ${err}`,
        ),
      );
    await this.closeRoom(room);
  }

  /** Post-commit side effects of finalizing a batch class (winner only, each
   * best-effort). */
  private async afterFinalizeSession(
    session: {
      id: string;
      lessonNumber: number;
      start: Date;
      batch: { id: string; name: string };
      teacher: { id: string; userId: string };
      participants: {
        id: string;
        studentJoinedAt: Date | null;
        student: { id: string; fullName: string; email: string };
      }[];
    },
    params: FinalizeParams,
    claim: {
      results: {
        lessonId: string;
        status: ClassOutcome;
        noShow: boolean;
        consumed: boolean;
      }[];
      makeup: { shiftedCount: number } | null;
      taught: number;
    },
  ) {
    const { outcome, actor } = params;
    const isPaid = outcome !== 'INCOMPLETE';

    // Each student who was credited with the class moves on in rank, streak
    // and badges (derived from their own row, so an absent student is not).
    if (isPaid) {
      const ids = session.participants
        .filter((p) =>
          claim.results.some(
            (r) => r.lessonId === p.id && r.status !== 'INCOMPLETE',
          ),
        )
        .map((p) => p.student.id);
      await this.studentProgress.syncAfterClass(ids);
    }

    await this.wrapUpSessionRoom(session.id);

    await this.audit
      .log({
        actorId: actor.userId ?? 'system',
        actorRole: actor.role,
        action: 'CLASS_FINALIZED',
        entityType: 'BatchSession',
        entityId: session.id,
        reason: params.reason
          ? `${params.reason}${params.note ? `: ${params.note}` : ''}`
          : undefined,
        beforeData: { status: LessonStatus.UPCOMING },
        afterData: {
          status: outcome,
          endedByRole: actor.role,
          batch: session.batch.name,
          lessonNumber: session.lessonNumber,
          students: claim.results.length,
          studentsTaught: claim.taught,
          studentsCharged: claim.results.filter((r) => r.consumed).length,
          teacherEarningCents: isPaid ? CLASS_COMPLETED_AMOUNT_CENTS : 0,
          extraClassScheduled: claim.makeup !== null,
          shiftedCount: claim.makeup?.shiftedCount ?? 0,
        },
      })
      .catch((err) =>
        this.logger.error(
          `Audit log failed for batch class ${session.id}: ${err}`,
        ),
      );

    if (isPaid) {
      await this.alerts
        .create({
          userId: session.teacher.userId,
          role: Role.TEACHER,
          type: 'CLASS_COMPLETED_EARNING',
          title: 'Class completed',
          message: `You earned ৳${(CLASS_COMPLETED_AMOUNT_CENTS / 100).toFixed(0)} for successfully completing this batch class (${session.batch.name}). Great work!`,
          metadata: { batchSessionId: session.id },
        })
        .catch(() => {});
    }

    if (actor.role === 'SYSTEM') {
      await this.alerts
        .create({
          userId: session.teacher.userId,
          role: Role.TEACHER,
          type: 'CLASS_AUTO_ENDED',
          title: 'Class automatically ended',
          message:
            `This class was automatically ended after ${CLASS_FAILSAFE_MINUTES} minutes because it was not manually ended` +
            (outcome === 'INCOMPLETE'
              ? ' (recorded as Incomplete because no student joined)'
              : '') +
            '. Please always end your classes with the correct status:\n' +
            'Completed — the lesson was finished.\n' +
            'Partially Completed — one extra class is needed to finish the same lesson.\n' +
            'Incomplete — the class could not be completed due to an attendance or technical issue.',
          metadata: { batchSessionId: session.id, outcome },
        })
        .catch(() => {});
    }

    // Students who did not show up for a class that took place are told —
    // there is no make-up for a group class, so the email points to the
    // recording instead.
    if (actor.role !== 'ADMIN') {
      const teacherProfile = await this.prisma.teacherProfile
        .findUnique({
          where: { id: session.teacher.id },
          select: { user: { select: { fullName: true } } },
        })
        .catch(() => null);
      if (teacherProfile) {
        for (const r of claim.results.filter((x) => x.noShow)) {
          const p = session.participants.find((x) => x.id === r.lessonId);
          if (!p) continue;
          this.notifications
            .sendMissedClassNotice(p.student.email, {
              lessonId: p.id,
              studentName: p.student.fullName,
              teacherName: teacherProfile.user.fullName,
              classStart: session.start,
              batchName: session.batch.name,
            })
            .catch(() => {});
        }
      }
    }
  }

  /** The class is no longer UPCOMING. An exact repeat of the same request
   * (double click, network retry) is a harmless success; a system caller just
   * stands down; anything else is told what already happened. */
  private alreadyFinalized(
    lesson: { status: LessonStatus; endedByRole: string | null },
    params: FinalizeParams,
  ): FinalizeResult {
    if (
      lesson.status === params.outcome &&
      lesson.endedByRole === params.actor.role
    ) {
      return { finalized: false, status: lesson.status };
    }
    if (params.actor.role === 'SYSTEM') {
      return { finalized: false, status: lesson.status };
    }
    throw new BadRequestException(
      lesson.status === LessonStatus.CANCELLED
        ? 'This class was cancelled and can no longer be ended.'
        : 'This class has already been ended.',
    );
  }

  // ─── Post-commit side effects (winner only, each best-effort) ────────────

  private async afterFinalize(
    lesson: {
      id: string;
      studentUserId: string;
      courseId: string;
      lessonNumber: number;
      classType: ClassType;
      teacherId: string;
      start: Date;
      studentJoinedAt: Date | null;
      teacher: { id: string; userId: string };
      student: { id: string; fullName: string; email: string };
    },
    params: FinalizeParams,
    claim: {
      lessonConsumed: boolean;
      makeup: { shiftedCount: number } | null;
    },
  ) {
    const { outcome, actor } = params;
    const room = roomForLessonRecord(lesson);
    const isPaid = outcome !== 'INCOMPLETE';

    // The student's rank, streak and badges follow the class (a no-op for an
    // Incomplete class — nothing was attended).
    if (isPaid) {
      await this.studentProgress.syncAfterClass([lesson.studentUserId]);
    }

    // The classroom itself (recording, the live room) belongs to the whole
    // batch, so it is wrapped up once the LAST student's lesson has ended —
    // an admin settling one student's lesson must not end the class for the
    // rest. A 1:1 class is its own classroom and is always wrapped up here.
    // (If the count cannot be read, wrap up: leaving it would leave the
    // recording's summary out of date.)
    const classroomStillNeeded =
      lesson.classType === ClassType.BATCH &&
      (await this.prisma.scheduledLesson
        .count({
          where: {
            teacherId: lesson.teacherId,
            classType: ClassType.BATCH,
            start: lesson.start,
            status: LessonStatus.UPCOMING,
          },
        })
        .catch(() => 0)) > 0;

    if (!classroomStillNeeded) {
      // Recording: a browser that is still recording now only waits for its
      // upload (no-op when it was never started or the teacher already stopped
      // it), and the class's recording summary is brought up to date. Both
      // calls are idempotent.
      await this.recording
        .stopActiveSegmentIfAny(room)
        .then(() => this.recording.finalizeAtClassEnd(room))
        .catch((err) =>
          this.logger.error(
            `Recording wrap-up failed for lesson ${lesson.id}: ${err}`,
          ),
        );

      await this.closeRoom(room);
    }

    await this.audit
      .log({
        actorId: actor.userId ?? 'system',
        actorRole: actor.role,
        action: 'CLASS_FINALIZED',
        entityType: 'ScheduledLesson',
        entityId: lesson.id,
        reason: params.reason
          ? `${params.reason}${params.note ? `: ${params.note}` : ''}`
          : undefined,
        beforeData: { status: LessonStatus.UPCOMING },
        afterData: {
          status: outcome,
          endedByRole: actor.role,
          lessonNumber: lesson.lessonNumber,
          teacherEarningCents: isPaid ? CLASS_COMPLETED_AMOUNT_CENTS : 0,
          studentLessonConsumed: claim.lessonConsumed,
          extraClassScheduled: claim.makeup !== null,
          shiftedCount: claim.makeup?.shiftedCount ?? 0,
        },
      })
      .catch((err) =>
        this.logger.error(`Audit log failed for lesson ${lesson.id}: ${err}`),
      );

    if (isPaid) {
      await this.alerts
        .create({
          userId: lesson.teacher.userId,
          role: Role.TEACHER,
          type: 'CLASS_COMPLETED_EARNING',
          title: 'Class completed',
          message: `You earned ৳${(CLASS_COMPLETED_AMOUNT_CENTS / 100).toFixed(0)} for successfully completing this class${
            lesson.classType === ClassType.BATCH
              ? ` (${lesson.student.fullName}'s lesson)`
              : ''
          }. Great work!`,
          metadata: { scheduledLessonId: lesson.id },
        })
        .catch(() => {});
    }

    if (actor.role === 'SYSTEM') {
      await this.alerts
        .create({
          userId: lesson.teacher.userId,
          role: Role.TEACHER,
          type: 'CLASS_AUTO_ENDED',
          title: 'Class automatically ended',
          message:
            `This class was automatically ended after ${CLASS_FAILSAFE_MINUTES} minutes because it was not manually ended` +
            (outcome === 'INCOMPLETE'
              ? ' (recorded as Incomplete because the student did not join)'
              : '') +
            '. Please always end your classes with the correct status:\n' +
            'Completed — the lesson was finished.\n' +
            'Partially Completed — one extra class is needed to finish the same lesson.\n' +
            'Incomplete — the class could not be completed due to an attendance or technical issue.',
          metadata: { scheduledLessonId: lesson.id, outcome },
        })
        .catch(() => {});
    }

    // A genuine no-show: tell the student they missed a class.
    if (
      outcome === 'INCOMPLETE' &&
      actor.role !== 'ADMIN' &&
      !lesson.studentJoinedAt
    ) {
      const teacherProfile = await this.prisma.teacherProfile
        .findUnique({
          where: { id: lesson.teacher.id },
          select: { user: { select: { fullName: true } } },
        })
        .catch(() => null);
      if (teacherProfile) {
        this.notifications
          .sendMissedClassNotice(lesson.student.email, {
            lessonId: lesson.id,
            studentName: lesson.student.fullName,
            teacherName: teacherProfile.user.fullName,
            classStart: lesson.start,
          })
          .catch(() => {});
      }
    }
  }

  private async closeRoom(room: string) {
    try {
      await this.rooms.deleteRoom(room);
    } catch {
      // Room may already be empty/gone — the class record is what matters.
    }
  }

  // ─── 75-minute failsafe ───────────────────────────────────────────────────
  //
  // A class nobody ended is finalized by the platform 75 minutes after its
  // scheduled start, going through the exact same finalize path (same money,
  // same recording stop, same idempotency) with endedByRole = 'SYSTEM'. It only
  // considers classes the teacher actually joined: a class nobody opened is
  // not a class that "ran", and the late-join penalty sweep already covers
  // teacher no-shows. If the teacher joined but the student never did, there
  // is nothing to pay for, so it is recorded as Incomplete (student no-show)
  // rather than Completed — the same rule a manual Completed enforces.
  @Cron(CronExpression.EVERY_MINUTE)
  async sweepOverdueClasses() {
    const now = Date.now();
    const cutoff = new Date(now - CLASS_FAILSAFE_MINUTES * 60_000);
    const floor = new Date(
      Math.max(now - FAILSAFE_LOOKBACK_MS, FAILSAFE_EFFECTIVE_FROM.getTime()),
    );

    const overdue = await this.prisma.scheduledLesson.findMany({
      where: {
        // A batch student's row is finalized with its class (below).
        batchSessionId: null,
        status: LessonStatus.UPCOMING,
        teacherJoinedAt: { not: null },
        start: { lte: cutoff, gte: floor },
      },
      select: { id: true, studentJoinedAt: true },
      orderBy: { start: 'asc' },
      take: 100,
    });

    for (const l of overdue) {
      try {
        const result = await this.finalizeLesson(
          l.id,
          l.studentJoinedAt
            ? { outcome: 'COMPLETED', actor: { role: 'SYSTEM' } }
            : {
                outcome: 'INCOMPLETE',
                reason: ClassEndReason.STUDENT_NO_SHOW,
                note: `Automatically ended after ${CLASS_FAILSAFE_MINUTES} minutes — the student never joined.`,
                actor: { role: 'SYSTEM' },
              },
        );
        if (result.finalized) {
          this.logger.warn(
            `Failsafe ended lesson ${l.id} as ${result.status} (not ended manually within ${CLASS_FAILSAFE_MINUTES} minutes).`,
          );
        }
      } catch (err) {
        this.logger.error(`Failsafe could not end lesson ${l.id}: ${err}`);
      }
    }

    // Batch classes the teacher opened and nobody ended. Completed if any
    // student was in it (the ones who were not are recorded as no-shows for
    // it); Incomplete if no student ever joined.
    const overdueClasses = await this.prisma.batchSession.findMany({
      where: {
        status: LessonStatus.UPCOMING,
        teacherJoinedAt: { not: null },
        start: { lte: cutoff, gte: floor },
        participants: { some: { status: LessonStatus.UPCOMING } },
      },
      select: {
        id: true,
        participants: {
          where: { status: LessonStatus.UPCOMING },
          select: { studentJoinedAt: true },
        },
      },
      orderBy: { start: 'asc' },
      take: 100,
    });
    for (const c of overdueClasses) {
      const anyoneJoined = c.participants.some((p) => p.studentJoinedAt);
      try {
        const result = await this.finalizeBatchSession(
          c.id,
          anyoneJoined
            ? { outcome: 'COMPLETED', actor: { role: 'SYSTEM' } }
            : {
                outcome: 'INCOMPLETE',
                reason: ClassEndReason.STUDENT_NO_SHOW,
                note: `Automatically ended after ${CLASS_FAILSAFE_MINUTES} minutes — no student joined.`,
                actor: { role: 'SYSTEM' },
              },
        );
        if (result.finalized) {
          this.logger.warn(
            `Failsafe ended batch class ${c.id} as ${result.status} (not ended manually within ${CLASS_FAILSAFE_MINUTES} minutes).`,
          );
        }
      } catch (err) {
        this.logger.error(`Failsafe could not end batch class ${c.id}: ${err}`);
      }
    }
  }
}
