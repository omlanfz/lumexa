// FILE PATH: server/src/classroom/class-finalization.service.ts
//
// The ONE place a curriculum class (ScheduledLesson) leaves UPCOMING. Three
// callers, one set of business rules:
//
//   - the teacher, via ClassroomService.endClass (End Class button),
//   - an admin, via AdminController (Students → Schedule status selector),
//   - the platform failsafe below, 75 minutes after the scheduled start.
//
// Outcomes and their (identical for every caller) effects:
//
//   COMPLETED            teacher earning +1, student lesson -1, progression
//                        moves on.
//   PARTIALLY_COMPLETED  same money as COMPLETED, and one extra occurrence of
//                        the SAME lesson is scheduled right after this one
//                        (everything later shifts by one class). Allowed once
//                        per student + curriculum + lesson number.
//   INCOMPLETE           no earning, no deduction, no progression; a make-up
//                        occurrence of the same lesson is scheduled.
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
import { ClassEndReason, LessonStatus, Role } from '@prisma/client';
import { RoomServiceClient } from 'livekit-server-sdk';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { AlertsService } from '../alerts/alerts.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PayoutsService } from '../payouts/payouts.service';
import { StudentLedgerService } from '../students/student-ledger.service';
import { SchedulingService } from '../scheduling/scheduling.service';
import { CLASS_COMPLETED_AMOUNT_CENTS } from '../payouts/payout.constants';
import { RecordingService } from './recording.service';
import { roomForLesson } from './room-ref.util';

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
  ) {}

  // ─── Public: finalize one class ───────────────────────────────────────────

  async finalizeLesson(
    lessonId: string,
    params: FinalizeParams,
  ): Promise<FinalizeResult> {
    const { outcome, actor } = params;
    if (!CLASS_OUTCOMES.includes(outcome)) {
      throw new BadRequestException(
        'Choose Completed, Partially Completed or Incomplete to end this class.',
      );
    }

    const isIncomplete = outcome === 'INCOMPLETE';
    const isPaid = !isIncomplete;
    const reason = isIncomplete ? params.reason : undefined;
    const note = isIncomplete ? params.note?.trim() || null : null;

    if (isIncomplete) {
      if (!reason || !INCOMPLETE_REASONS.includes(reason)) {
        throw new BadRequestException(
          'Choose a reason for marking this class incomplete.',
        );
      }
      if (reason === ClassEndReason.OTHER && !note) {
        throw new BadRequestException('Add a short note explaining why.');
      }
    }

    const lesson = await this.prisma.scheduledLesson.findUnique({
      where: { id: lessonId },
      include: {
        teacher: { select: { id: true, userId: true } },
        student: { select: { id: true, fullName: true, email: true } },
      },
    });
    if (!lesson) throw new NotFoundException('Class not found.');

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
    const room = roomForLesson(lesson.id);
    const isPaid = outcome !== 'INCOMPLETE';

    // Recording: stop whatever is still running (no-op when it was never
    // started or the teacher already stopped it) and hand the room to the
    // merge sweep. Both calls are idempotent and swallow Egress errors.
    await this.recording
      .stopActiveSegmentIfAny(room)
      .then(() => this.recording.finalizeAtClassEnd(room))
      .catch((err) =>
        this.logger.error(
          `Recording wrap-up failed for lesson ${lesson.id}: ${err}`,
        ),
      );

    await this.closeRoom(room);

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
          message: `You earned ৳${(CLASS_COMPLETED_AMOUNT_CENTS / 100).toFixed(0)} for successfully completing this class. Great work!`,
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
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const url = process.env.LIVEKIT_URL;
    if (!apiKey || !apiSecret || !url) return;
    try {
      await new RoomServiceClient(url, apiKey, apiSecret).deleteRoom(room);
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
  }
}
