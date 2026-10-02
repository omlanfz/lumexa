// FILE PATH: server/src/students/student-ledger.service.ts
//
// Append-only BDT credit ledger for students — the source of truth for the
// admin Payments tab. Every write goes through one of the methods below;
// StudentLedgerEntry rows are append-only (a correction is a new offsetting
// entry, see recordAdjustment/recordRefund). The one exception is an admin
// explicitly deleting a payment-history row (see deleteEntry), which removes
// the row and rebuilds the running balance of the rows after it so the chain
// stays consistent. The current
// balance and effective per-lesson rate are never stored on the student —
// they are always the latest ledger row's balanceAfterCents/rateCents (see
// the doc comment on the StudentLedgerEntry model), so the displayed
// balance always reconciles exactly with the ledger by construction.
//
// LESSON_COMPLETED consumption: for curriculum classes it is written inside
// ClassFinalizationService's finalize transaction (see
// consumeLessonForScheduledLessonInTx); for legacy marketplace bookings it
// mirrors PayoutsService.syncCompletedClasses — an idempotent cron scan over
// CAPTURED + ended bookings, guarded by the DB-level
// @@unique([bookingId, type]) constraint.

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma, StudentLedgerEntryType } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { BDT } from '../payouts/payout.constants';

const LOW_BALANCE_LESSON_THRESHOLD = 3;

type LatestEntry = {
  balanceAfterCents: number;
  rateCents: number;
  courseId: string | null;
  courseName: string;
} | null;

export interface PaymentBadge {
  level: 'exhausted' | 'due_soon';
  label: string;
}

export interface LedgerSummary {
  balanceCents: number;
  rateCents: number;
  lessonsRemaining: number | null;
  courseId: string | null;
  courseName: string | null;
  paymentBadge: PaymentBadge | null;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

@Injectable()
export class StudentLedgerService {
  private readonly logger = new Logger(StudentLedgerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private latestEntry(
    studentUserId: string,
    client: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return client.studentLedgerEntry.findFirst({
      where: { studentUserId },
      orderBy: { createdAt: 'desc' },
      select: {
        balanceAfterCents: true,
        rateCents: true,
        courseId: true,
        courseName: true,
      },
    });
  }

  private summarize(entry: LatestEntry): LedgerSummary {
    if (!entry) {
      return {
        balanceCents: 0,
        rateCents: 0,
        lessonsRemaining: null,
        courseId: null,
        courseName: null,
        paymentBadge: null,
      };
    }
    const lessonsRemaining =
      entry.rateCents > 0 ? entry.balanceAfterCents / entry.rateCents : null;

    let paymentBadge: PaymentBadge | null = null;
    if (lessonsRemaining !== null) {
      if (lessonsRemaining <= 0) {
        paymentBadge = { level: 'exhausted', label: 'Balance exhausted' };
      } else if (lessonsRemaining < LOW_BALANCE_LESSON_THRESHOLD) {
        paymentBadge = {
          level: 'due_soon',
          label: `Payment due soon · ${round1(lessonsRemaining)} lessons remaining`,
        };
      }
    }

    return {
      balanceCents: entry.balanceAfterCents,
      rateCents: entry.rateCents,
      lessonsRemaining,
      courseId: entry.courseId,
      courseName: entry.courseName,
      paymentBadge,
    };
  }

  async getSummary(studentUserId: string): Promise<LedgerSummary> {
    return this.summarize(await this.latestEntry(studentUserId));
  }

  /** Batch summaries for a page of students (admin list) — one query, latest row per student picked in JS since Prisma can't do "latest per group" portably. */
  async getSummariesFor(
    studentUserIds: string[],
  ): Promise<Map<string, LedgerSummary>> {
    const result = new Map<string, LedgerSummary>();
    if (studentUserIds.length === 0) return result;

    const rows = await this.prisma.studentLedgerEntry.findMany({
      where: { studentUserId: { in: studentUserIds } },
      orderBy: { createdAt: 'desc' },
      select: {
        studentUserId: true,
        balanceAfterCents: true,
        rateCents: true,
        courseId: true,
        courseName: true,
      },
    });

    const latestByStudent = new Map<string, (typeof rows)[number]>();
    for (const row of rows) {
      if (!latestByStudent.has(row.studentUserId)) {
        latestByStudent.set(row.studentUserId, row);
      }
    }

    for (const id of studentUserIds) {
      result.set(id, this.summarize(latestByStudent.get(id) ?? null));
    }
    return result;
  }

  getLedger(studentUserId: string) {
    return this.prisma.studentLedgerEntry.findMany({
      where: { studentUserId },
      orderBy: { createdAt: 'desc' },
      include: { createdByAdmin: { select: { fullName: true } } },
    });
  }

  private async requireStudent(studentUserId: string) {
    const student = await this.prisma.user.findUnique({
      where: { id: studentUserId },
      select: { id: true, role: true, assignedCourseId: true },
    });
    if (!student || student.role !== 'STUDENT') {
      throw new NotFoundException('Student not found.');
    }
    return student;
  }

  async recordPayment(
    studentUserId: string,
    adminId: string,
    params: {
      amountTaka: number;
      lessonsPurchased: number;
      courseId?: string | null;
      description?: string;
      paymentMethod?: string;
      paymentDetail?: string;
    },
  ) {
    if (!(params.amountTaka > 0)) {
      throw new BadRequestException('Amount must be greater than zero.');
    }
    if (!(params.lessonsPurchased > 0)) {
      throw new BadRequestException(
        'Lessons purchased must be greater than zero.',
      );
    }

    const student = await this.requireStudent(studentUserId);
    const courseId = params.courseId ?? student.assignedCourseId ?? null;
    if (!courseId) {
      throw new BadRequestException(
        'Assign a curriculum to this student before recording a payment.',
      );
    }
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, title: true },
    });
    if (!course) throw new NotFoundException('Curriculum not found.');

    const amountCents = BDT(params.amountTaka);
    const rateCents = Math.round(amountCents / params.lessonsPurchased);

    return this.prisma.$transaction(async (tx) => {
      const prev = await this.latestEntry(studentUserId, tx);
      const balanceAfterCents = (prev?.balanceAfterCents ?? 0) + amountCents;

      return tx.studentLedgerEntry.create({
        data: {
          studentUserId,
          type: StudentLedgerEntryType.PAYMENT_RECEIVED,
          amountCents,
          balanceAfterCents,
          rateCents,
          lessonsPurchased: params.lessonsPurchased,
          courseId: course.id,
          courseName: course.title,
          description: params.description?.trim() || null,
          paymentMethod: params.paymentMethod ?? null,
          paymentDetail: params.paymentDetail?.trim() || null,
          createdByAdminId: adminId,
        },
      });
    });
  }

  async recordRefund(
    studentUserId: string,
    adminId: string,
    params: {
      amountTaka: number;
      description?: string;
      paymentMethod?: string;
      paymentDetail?: string;
    },
  ) {
    if (!(params.amountTaka > 0)) {
      throw new BadRequestException('Amount must be greater than zero.');
    }

    return this.prisma.$transaction(async (tx) => {
      const prev = await this.latestEntry(studentUserId, tx);
      if (!prev) {
        throw new BadRequestException(
          'This student has no ledger history to refund against.',
        );
      }
      const amountCents = -BDT(params.amountTaka);
      const balanceAfterCents = prev.balanceAfterCents + amountCents;

      return tx.studentLedgerEntry.create({
        data: {
          studentUserId,
          type: StudentLedgerEntryType.REFUND,
          amountCents,
          balanceAfterCents,
          rateCents: prev.rateCents,
          courseId: prev.courseId,
          courseName: prev.courseName,
          description: params.description?.trim() || null,
          paymentMethod: params.paymentMethod ?? null,
          paymentDetail: params.paymentDetail?.trim() || null,
          createdByAdminId: adminId,
        },
      });
    });
  }

  async recordAdjustment(
    studentUserId: string,
    adminId: string,
    params: { amountTaka: number; description: string },
  ) {
    if (!params.amountTaka) {
      throw new BadRequestException('Amount cannot be zero.');
    }
    if (!params.description?.trim()) {
      throw new BadRequestException(
        'A description is required for admin adjustments.',
      );
    }

    const student = await this.requireStudent(studentUserId);
    const amountCents = BDT(params.amountTaka);

    return this.prisma.$transaction(async (tx) => {
      const prev = await this.latestEntry(studentUserId, tx);
      const balanceAfterCents = (prev?.balanceAfterCents ?? 0) + amountCents;

      let courseId = prev?.courseId ?? null;
      let courseName = prev?.courseName ?? null;
      if (!prev) {
        const course = student.assignedCourseId
          ? await tx.course.findUnique({
              where: { id: student.assignedCourseId },
              select: { id: true, title: true },
            })
          : null;
        courseId = course?.id ?? null;
        courseName = course?.title ?? 'Unassigned';
      }

      return tx.studentLedgerEntry.create({
        data: {
          studentUserId,
          type: StudentLedgerEntryType.ADMIN_ADJUSTMENT,
          amountCents,
          balanceAfterCents,
          rateCents: prev?.rateCents ?? 0,
          courseId,
          courseName: courseName ?? 'Unassigned',
          description: params.description.trim(),
          createdByAdminId: adminId,
        },
      });
    });
  }

  /**
   * Admin-only: permanently removes one payment-history row.
   *
   * The ledger is a running-balance chain — every row stores the balance (and
   * effective per-lesson rate) *after* it, and the latest row IS the student's
   * balance — so simply deleting a row would leave every later row's snapshot
   * wrong and silently change the balance. Instead the row is removed and the
   * chain after it is rebuilt in the same transaction: balanceAfterCents is the
   * running sum of the remaining rows' amounts, and the rate is carried forward
   * exactly as it was originally (rows that set a price keep their own rate;
   * everything else inherits the previous row's). Amounts of other rows are
   * never edited, so completed classes, lesson consumption and teacher
   * earnings are untouched.
   *
   * Lesson-consumption rows (LESSON_COMPLETED) are refused: they are the
   * financial record of a finalized class and are created/owned by the class
   * flow, so removing one would desynchronise the class from the ledger. A
   * wrong deduction is corrected with an Admin adjustment instead.
   */
  async deleteEntry(
    studentUserId: string,
    entryId: string,
    adminId: string,
  ): Promise<{ success: true }> {
    const deleted = await this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'student-ledger:' + studentUserId}))`;

        const entry = await tx.studentLedgerEntry.findFirst({
          where: { id: entryId, studentUserId },
        });
        if (!entry) throw new NotFoundException('Payment record not found.');
        if (entry.type === StudentLedgerEntryType.LESSON_COMPLETED) {
          throw new BadRequestException(
            'Lesson-completed entries belong to a finalized class and cannot be deleted. Use an Admin adjustment to correct the balance.',
          );
        }

        const all = await tx.studentLedgerEntry.findMany({
          where: { studentUserId },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        });
        const deletedIndex = all.findIndex((e) => e.id === entryId);
        const remaining = all.filter((e) => e.id !== entryId);

        await tx.studentLedgerEntry.delete({ where: { id: entryId } });

        // Entries up to the deleted position are unchanged; recompute only
        // those after it, seeded from the (unchanged) entry just before.
        let balance = 0;
        let rate = 0;
        remaining.forEach((e, i) => {
          if (i < deletedIndex) {
            balance = e.balanceAfterCents;
            rate = e.rateCents;
          }
        });
        for (const e of remaining.slice(deletedIndex)) {
          balance += e.amountCents;
          const setsRate =
            e.type === StudentLedgerEntryType.PAYMENT_RECEIVED ||
            e.type === StudentLedgerEntryType.CURRICULUM_CHANGE ||
            e.type === StudentLedgerEntryType.CREDIT_CARRIED_FORWARD;
          if (setsRate) rate = e.rateCents;
          if (e.balanceAfterCents !== balance || e.rateCents !== rate) {
            await tx.studentLedgerEntry.update({
              where: { id: e.id },
              data: { balanceAfterCents: balance, rateCents: rate },
            });
          }
        }
        return entry;
      },
      { timeout: 20_000, maxWait: 10_000 },
    );

    await this.audit.log({
      actorId: adminId,
      actorRole: 'ADMIN',
      action: 'STUDENT_LEDGER_ENTRY_DELETED',
      entityType: 'User',
      entityId: studentUserId,
      reason: 'Payment record deleted from the student payment history.',
      beforeData: deleted,
    });
    return { success: true };
  }

  /**
   * Called from AdminService.assignCourseToStudent right after the
   * assignment is persisted. Only writes ledger rows when the student
   * already has billing history — a plain course assignment for a
   * never-billed student has nothing financial to record (and the
   * existing STUDENT_COURSE_ASSIGNED AuditLog entry already covers it).
   *
   * The remaining balance is carried forward unchanged (never deducted for
   * the curriculum change itself). The per-lesson rate updates to the new
   * curriculum's list rate (priceCents / sessions) when known; otherwise it
   * carries forward too, until the next actual payment recalculates it.
   */
  async recordCurriculumChange(
    studentUserId: string,
    adminId: string,
    fromCourse: { title: string } | null,
    toCourse: {
      id: string;
      title: string;
      priceCents: number | null;
      sessions: number;
    } | null,
  ) {
    const prev = await this.latestEntry(studentUserId);
    if (!prev) return;

    const newRateCents =
      toCourse?.priceCents && toCourse.sessions > 0
        ? Math.round(toCourse.priceCents / toCourse.sessions)
        : prev.rateCents;
    const toName = toCourse?.title ?? 'Unassigned';
    const fromName = fromCourse?.title ?? 'Unassigned';
    const lessonsRemaining =
      newRateCents > 0 ? prev.balanceAfterCents / newRateCents : null;

    await this.prisma.$transaction([
      this.prisma.studentLedgerEntry.create({
        data: {
          studentUserId,
          type: StudentLedgerEntryType.CURRICULUM_CHANGE,
          amountCents: 0,
          balanceAfterCents: prev.balanceAfterCents,
          rateCents: newRateCents,
          courseId: toCourse?.id ?? null,
          courseName: toName,
          description: `Curriculum changed from ${fromName} to ${toName}`,
          createdByAdminId: adminId,
        },
      }),
      this.prisma.studentLedgerEntry.create({
        data: {
          studentUserId,
          type: StudentLedgerEntryType.CREDIT_CARRIED_FORWARD,
          amountCents: 0,
          balanceAfterCents: prev.balanceAfterCents,
          rateCents: newRateCents,
          courseId: toCourse?.id ?? null,
          courseName: toName,
          description:
            lessonsRemaining !== null
              ? `Remaining credit carried forward as ${toName} balance (~${round1(lessonsRemaining)} lessons at the new rate).`
              : 'Remaining credit carried forward as account credit.',
          createdByAdminId: adminId,
        },
      }),
    ]);
  }

  // ─── Automatic lesson consumption ────────────────────────────────────────
  //
  // There is no separate "mark class complete" action in the app (see
  // PayoutsService.syncCompletedClasses) — a captured booking whose shift
  // has ended is, by definition, a completed lesson. Runs frequently and is
  // fully idempotent, so a missed or repeated run is harmless.

  @Cron(CronExpression.EVERY_10_MINUTES)
  async syncCompletedLessons() {
    const candidates = await this.prisma.booking.findMany({
      where: {
        paymentStatus: 'CAPTURED',
        shift: { end: { lt: new Date() } },
        studentUserId: { not: null },
        studentLedgerEntries: {
          none: { type: StudentLedgerEntryType.LESSON_COMPLETED },
        },
      },
      select: {
        id: true,
        studentUserId: true,
        shift: { select: { end: true } },
      },
      take: 500,
    });

    let recorded = 0;
    for (const booking of candidates) {
      try {
        const created = await this.consumeLessonForBooking(
          booking.id,
          booking.studentUserId!,
          booking.shift.end,
        );
        if (created) recorded++;
      } catch (err) {
        this.logger.error(
          `Failed to record LESSON_COMPLETED for booking ${booking.id}`,
          err as Error,
        );
      }
    }

    if (recorded > 0) {
      this.logger.log(`Recorded ${recorded} lesson-completed ledger entries.`);
    }
  }

  // ─── Lesson consumption — curriculum (ScheduledLesson) flow ──────────────
  //
  // The ScheduledLesson counterpart to consumeLessonForBooking below (which is
  // Booking/marketplace-only). Runs inside the finalize transaction of
  // ClassFinalizationService when a class is finalized as COMPLETED or
  // PARTIALLY_COMPLETED — never for INCOMPLETE — so exactly one lesson is
  // consumed per paid class, atomically with the status change. Idempotency is
  // the DB-level @@unique([scheduledLessonId, type]) constraint plus an
  // explicit existence check. The per-student advisory lock serialises
  // concurrent writers to the same student's running balance (balanceAfterCents
  // is read-modify-write), e.g. two of a student's classes finalizing at once.
  async consumeLessonForScheduledLessonInTx(
    tx: Prisma.TransactionClient,
    params: {
      scheduledLessonId: string;
      studentUserId: string;
      eventDate: Date;
      note?: string;
    },
  ): Promise<boolean> {
    const { scheduledLessonId, studentUserId, eventDate } = params;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'student-ledger:' + studentUserId}))`;

    const existing = await tx.studentLedgerEntry.findUnique({
      where: {
        scheduledLessonId_type: {
          scheduledLessonId,
          type: StudentLedgerEntryType.LESSON_COMPLETED,
        },
      },
      select: { id: true },
    });
    if (existing) return false;

    const prev = await this.latestEntry(studentUserId, tx);
    // Never billed on this system (no PAYMENT_RECEIVED/curriculum-change
    // history) — nothing to consume, so no entry is created.
    if (!prev || prev.rateCents <= 0) return false;

    const amountCents = -prev.rateCents;
    await tx.studentLedgerEntry.create({
      data: {
        studentUserId,
        type: StudentLedgerEntryType.LESSON_COMPLETED,
        amountCents,
        balanceAfterCents: prev.balanceAfterCents + amountCents,
        rateCents: prev.rateCents,
        courseId: prev.courseId,
        courseName: prev.courseName,
        description:
          `Lesson completed on ${eventDate.toDateString()}` +
          (params.note ? ` (${params.note})` : ''),
        scheduledLessonId,
      },
    });
    return true;
  }

  private async consumeLessonForBooking(
    bookingId: string,
    studentUserId: string,
    eventDate: Date,
  ): Promise<boolean> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const prev = await this.latestEntry(studentUserId, tx);
        // Never billed on this system (no PAYMENT_RECEIVED/curriculum-change
        // history) — nothing to consume, so no entry is created.
        if (!prev || prev.rateCents <= 0) return false;

        const amountCents = -prev.rateCents;
        const balanceAfterCents = prev.balanceAfterCents + amountCents;

        await tx.studentLedgerEntry.create({
          data: {
            studentUserId,
            type: StudentLedgerEntryType.LESSON_COMPLETED,
            amountCents,
            balanceAfterCents,
            rateCents: prev.rateCents,
            courseId: prev.courseId,
            courseName: prev.courseName,
            description: `Lesson completed on ${eventDate.toDateString()}`,
            bookingId,
          },
        });
        return true;
      });
    } catch (err: any) {
      // P2002 = unique constraint violation on (bookingId, type) — the same
      // booking already has a LESSON_COMPLETED entry. Idempotent no-op.
      if (err?.code === 'P2002') return false;
      throw err;
    }
  }
}
