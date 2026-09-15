// FILE PATH: server/src/payouts/payouts.service.ts
//
// The teacher earnings ledger — append-only source of truth for teacher
// compensation. Every write goes through one of the `trigger*` methods below,
// which are the ONLY way a PayoutEntry row is created. Teachers never create
// their own earnings; PTM/conversion/penalty/adjustment entries require an
// admin identity, and CLASS_COMPLETED entries are created automatically by
// the system (cron scan, see `syncCompletedClasses`).
//
// Idempotency: every trigger sets (referenceType, referenceId, type), which
// is backed by a DB-level unique constraint. A duplicate trigger call is a
// no-op (caught via Prisma's P2002 unique-violation error), so the same
// underlying event can never create two ledger rows.
//
// Corrections are never done by editing a row — see `triggerAdjustment`.

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma, PayoutEntryType, PayoutStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CLASS_COMPLETED_AMOUNT_CENTS,
  PTM_AMOUNT_CENTS,
  CONVERSION_AMOUNT_CENTS,
  PENALTY_SEVERITY_AMOUNTS_CENTS,
  PenaltySeverity,
} from './payout.constants';
import { buildPayoutReportWorkbook } from './payout-report';

interface CreateLedgerEntryParams {
  teacherId: string;
  type: PayoutEntryType;
  amountCents: number;
  description: string;
  eventDate: Date;
  bookingId?: string;
  createdBy?: string;
  referenceType?: string;
  referenceId?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class PayoutsService {
  private readonly logger = new Logger(PayoutsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ─── Core append-only write path ──────────────────────────────────────────

  private async createLedgerEntry(params: CreateLedgerEntryParams) {
    const { eventDate, ...rest } = params;
    try {
      return await this.prisma.payoutEntry.create({
        data: {
          teacherId: rest.teacherId,
          type: rest.type,
          amountCents: rest.amountCents,
          description: rest.description,
          bookingId: rest.bookingId,
          createdBy: rest.createdBy,
          referenceType: rest.referenceType,
          referenceId: rest.referenceId,
          metadata: rest.metadata as Prisma.InputJsonValue | undefined,
          month: eventDate.getMonth() + 1,
          year: eventDate.getFullYear(),
        },
      });
    } catch (err: any) {
      // P2002 = unique constraint violation on (referenceType, referenceId, type)
      // — the same event already has a ledger entry. Idempotent no-op.
      if (err?.code === 'P2002') {
        this.logger.debug(
          `Duplicate ledger trigger ignored: ${rest.referenceType}/${rest.referenceId}/${rest.type}`,
        );
        return this.prisma.payoutEntry.findUnique({
          where: {
            referenceType_referenceId_type: {
              referenceType: rest.referenceType ?? '',
              referenceId: rest.referenceId ?? '',
              type: rest.type,
            },
          },
        });
      }
      throw err;
    }
  }

  private async requireTeacherById(teacherId: string) {
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { id: teacherId },
    });
    if (!teacher) throw new NotFoundException('Teacher not found.');
    return teacher;
  }

  // ─── Trigger: completed class (+BDT 200) ──────────────────────────────────

  async triggerClassCompleted(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        shift: { select: { teacherId: true, start: true, end: true } },
        student: { select: { name: true } },
        studentUser: { select: { fullName: true } },
      },
    });
    if (!booking) throw new NotFoundException('Booking not found.');

    const studentName =
      booking.student?.name ?? booking.studentUser?.fullName ?? 'Student';

    return this.createLedgerEntry({
      teacherId: booking.shift.teacherId,
      type: PayoutEntryType.CLASS_COMPLETED,
      amountCents: CLASS_COMPLETED_AMOUNT_CENTS,
      description: `Completed class with ${studentName}`,
      eventDate: booking.shift.end,
      bookingId: booking.id,
      referenceType: 'BOOKING',
      referenceId: booking.id,
    });
  }

  // Scans for classes that have actually happened (CAPTURED payment, shift
  // already ended) but have no CLASS_COMPLETED ledger entry yet, and creates
  // one. This is the system's automatic earning trigger for completed
  // classes — there is no separate "mark complete" action for teachers, and
  // no webhook/cron in the codebase currently transitions bookings to a
  // completed state, so this scan is the integration point. Runs frequently
  // and is fully idempotent, so a missed or repeated run is harmless.
  @Cron(CronExpression.EVERY_10_MINUTES)
  async syncCompletedClasses() {
    const candidates = await this.prisma.booking.findMany({
      where: {
        paymentStatus: 'CAPTURED',
        shift: { end: { lt: new Date() } },
        payoutEntries: { none: { type: PayoutEntryType.CLASS_COMPLETED } },
      },
      select: { id: true },
      take: 500,
    });

    for (const { id } of candidates) {
      try {
        await this.triggerClassCompleted(id);
      } catch (err) {
        this.logger.error(
          `Failed to create CLASS_COMPLETED entry for booking ${id}`,
          err as Error,
        );
      }
    }

    if (candidates.length > 0) {
      this.logger.log(
        `Synced ${candidates.length} completed-class earning entries.`,
      );
    }
  }

  // ─── Trigger: PTM completed (+BDT 300, Operations only) ───────────────────

  async triggerPtm(
    teacherId: string,
    params: {
      referenceId: string;
      description: string;
      adminUserId: string;
      date?: Date;
    },
  ) {
    await this.requireTeacherById(teacherId);
    return this.createLedgerEntry({
      teacherId,
      type: PayoutEntryType.PTM,
      amountCents: PTM_AMOUNT_CENTS,
      description: params.description || 'Parent-teacher meeting completed',
      eventDate: params.date ?? new Date(),
      createdBy: params.adminUserId,
      referenceType: 'PTM',
      referenceId: params.referenceId,
    });
  }

  // ─── Trigger: conversion (+BDT 1000, Operations only) ─────────────────────
  //
  // Condition enforced server-side, not just trusted from the admin request:
  // the student must have at least one CAPTURED (actually paid) booking with
  // this teacher — i.e. a trial/assigned relationship that has genuinely
  // become a paying one. One conversion bonus per student per teacher ever
  // (idempotency key = studentUserId).

  async triggerConversion(
    teacherId: string,
    params: { studentUserId: string; adminUserId: string },
  ) {
    await this.requireTeacherById(teacherId);

    const paidBooking = await this.prisma.booking.findFirst({
      where: {
        studentUserId: params.studentUserId,
        shift: { teacherId },
        paymentStatus: 'CAPTURED',
      },
      include: { studentUser: { select: { fullName: true } } },
      orderBy: { createdAt: 'asc' },
    });
    if (!paidBooking) {
      throw new BadRequestException(
        'Conversion condition not met: this student has no captured (paid) booking with this teacher yet.',
      );
    }

    return this.createLedgerEntry({
      teacherId,
      type: PayoutEntryType.CONVERSION,
      amountCents: CONVERSION_AMOUNT_CENTS,
      description: `Conversion bonus — ${paidBooking.studentUser?.fullName ?? 'student'}`,
      eventDate: new Date(),
      createdBy: params.adminUserId,
      referenceType: 'CONVERSION',
      referenceId: params.studentUserId,
    });
  }

  // ─── Trigger: penalty (Operations/system only) ────────────────────────────

  async triggerPenalty(
    teacherId: string,
    params: {
      severity: PenaltySeverity;
      reason: string;
      referenceId: string;
      adminUserId?: string;
      referenceType?: string;
    },
  ) {
    await this.requireTeacherById(teacherId);
    return this.createLedgerEntry({
      teacherId,
      type: PayoutEntryType.PENALTY,
      amountCents: PENALTY_SEVERITY_AMOUNTS_CENTS[params.severity],
      description: params.reason,
      eventDate: new Date(),
      createdBy: params.adminUserId,
      referenceType: params.referenceType ?? 'PENALTY',
      referenceId: params.referenceId,
    });
  }

  // Internal — used by the reschedule policy engine for the fixed 4th+
  // emergency-reschedule penalty. Not exposed as a generic "any amount"
  // penalty path (that's triggerPenalty, admin-only).
  async triggerFixedPenalty(params: {
    teacherId: string;
    amountCents: number;
    description: string;
    referenceType: string;
    referenceId: string;
  }) {
    await this.requireTeacherById(params.teacherId);
    return this.createLedgerEntry({
      teacherId: params.teacherId,
      type: PayoutEntryType.PENALTY,
      amountCents: params.amountCents,
      description: params.description,
      eventDate: new Date(),
      referenceType: params.referenceType,
      referenceId: params.referenceId,
    });
  }

  // ─── Trigger: admin adjustment (any amount, Operations only) ──────────────

  async triggerAdjustment(
    teacherId: string,
    params: {
      amountCents: number;
      reason: string;
      adminUserId: string;
      referenceType?: string;
      referenceId?: string;
      month?: number;
      year?: number;
    },
  ) {
    await this.requireTeacherById(teacherId);
    if (!params.reason?.trim()) {
      throw new BadRequestException('An adjustment requires a reason.');
    }
    if (!params.amountCents) {
      throw new BadRequestException(
        'An adjustment requires a non-zero amount.',
      );
    }

    const now = new Date();

    // Adjustments are always intentional, individually-reasoned admin
    // actions — not deduplicated by a reference key the way system triggers
    // are. A plain create (no idempotency lookup) is correct here.
    const entry = await this.prisma.payoutEntry.create({
      data: {
        teacherId,
        type: PayoutEntryType.ADJUSTMENT,
        amountCents: params.amountCents,
        description: params.reason,
        createdBy: params.adminUserId,
        referenceType: params.referenceType,
        referenceId: params.referenceId,
        month: params.month ?? now.getMonth() + 1,
        year: params.year ?? now.getFullYear(),
      },
    });

    await this.audit.log({
      actorId: params.adminUserId,
      actorRole: 'ADMIN',
      action: 'PAYOUT_ADJUSTMENT',
      entityType: 'TeacherProfile',
      entityId: teacherId,
      reason: params.reason,
      afterData: { amountCents: params.amountCents, entryId: entry.id },
    });

    return entry;
  }

  // ─── Reads ─────────────────────────────────────────────────────────────────

  async listEntriesForUser(userId: string, page = 1, limit = 30) {
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { userId },
    });
    if (!teacher) throw new NotFoundException('Teacher profile not found.');
    return this.listEntries(teacher.id, page, limit);
  }

  async listEntries(teacherId: string, page = 1, limit = 30) {
    const [entries, total] = await Promise.all([
      this.prisma.payoutEntry.findMany({
        where: { teacherId },
        include: {
          booking: {
            include: { shift: { select: { start: true, end: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.payoutEntry.count({ where: { teacherId } }),
    ]);

    return {
      items: entries.map((e) => ({
        id: e.id,
        type: e.type,
        amountCents: e.amountCents,
        description: e.description,
        createdAt: e.createdAt,
        referenceType: e.referenceType,
        referenceId: e.referenceId,
        bookingId: e.bookingId,
        classStart: e.booking?.shift?.start ?? null,
        classEnd: e.booking?.shift?.end ?? null,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getSummaryForUser(userId: string) {
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { userId },
    });
    if (!teacher) throw new NotFoundException('Teacher profile not found.');
    return this.getSummary(teacher.id);
  }

  async getSummary(teacherId: string) {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const [monthEntries, allTimeAgg] = await Promise.all([
      this.prisma.payoutEntry.findMany({
        where: { teacherId, month, year },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payoutEntry.aggregate({
        where: { teacherId },
        _sum: { amountCents: true },
      }),
    ]);

    const monthCents = monthEntries.reduce((sum, e) => sum + e.amountCents, 0);
    const breakdown: Record<string, number> = {};
    for (const e of monthEntries) {
      breakdown[e.type] = (breakdown[e.type] ?? 0) + e.amountCents;
    }

    return {
      monthEarningsCents: monthCents,
      allTimeEarningsCents: allTimeAgg._sum.amountCents ?? 0,
      monthEventCount: monthEntries.length,
      month,
      year,
      breakdown,
      lastUpdated: monthEntries[0]?.createdAt ?? null,
    };
  }

  async getMonthlySeriesForUser(userId: string, months = 6) {
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { userId },
    });
    if (!teacher) throw new NotFoundException('Teacher profile not found.');

    const start = new Date();
    start.setMonth(start.getMonth() - (months - 1));
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    const entries = await this.prisma.payoutEntry.findMany({
      where: { teacherId: teacher.id, createdAt: { gte: start } },
      select: { amountCents: true, month: true, year: true },
    });

    const bucket = new Map<string, number>();
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      bucket.set(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        0,
      );
    }
    for (const e of entries) {
      const key = `${e.year}-${String(e.month).padStart(2, '0')}`;
      if (bucket.has(key))
        bucket.set(key, (bucket.get(key) ?? 0) + e.amountCents);
    }

    const bucketArr = Array.from(bucket.entries()).map(
      ([key, earningsCents]) => {
        const [y, m] = key.split('-').map(Number);
        const label = new Date(y, m - 1, 1).toLocaleString('en-US', {
          month: 'short',
          year: '2-digit',
        });
        return { key, label, earningsCents };
      },
    );

    const lastTwo = bucketArr.slice(-2);
    const trend =
      lastTwo.length === 2 && lastTwo[0].earningsCents > 0
        ? Math.round(
            ((lastTwo[1].earningsCents - lastTwo[0].earningsCents) /
              lastTwo[0].earningsCents) *
              100,
          )
        : null;

    return { months: bucketArr, trend };
  }

  // ─── Monthly payout workflow: Open → Finalized → Paid ─────────────────────
  //
  // The workflow status is bookkeeping only — it never substitutes for the
  // ledger sum. finalizedAmountCents/paidAmountCents are snapshots taken at
  // the moment of that action, kept for reconciliation; the amount Operations
  // sees anywhere in the UI always comes from summing PayoutEntry rows live.

  private async getLedgerTotal(teacherId: string, month: number, year: number) {
    const agg = await this.prisma.payoutEntry.aggregate({
      where: { teacherId, month, year },
      _sum: { amountCents: true },
      _count: true,
    });
    return {
      totalCents: agg._sum.amountCents ?? 0,
      entryCount: agg._count,
    };
  }

  /** Every teacher with ledger activity or an existing status row for the month. */
  async getMonthlyOverview(month: number, year: number) {
    const [teachers, statuses] = await Promise.all([
      this.prisma.teacherProfile.findMany({
        where: {
          OR: [
            { payoutEntries: { some: { month, year } } },
            { isSuspended: false },
          ],
        },
        include: { user: { select: { fullName: true, email: true } } },
        orderBy: { user: { fullName: 'asc' } },
      }),
      this.prisma.monthlyPayoutStatus.findMany({ where: { month, year } }),
    ]);

    const statusByTeacher = new Map(statuses.map((s) => [s.teacherId, s]));

    const rows = await Promise.all(
      teachers.map(async (teacher) => {
        const { totalCents, entryCount } = await this.getLedgerTotal(
          teacher.id,
          month,
          year,
        );
        const statusRow = statusByTeacher.get(teacher.id);
        return {
          teacherId: teacher.id,
          teacherName: teacher.user.fullName,
          teacherEmail: teacher.user.email,
          totalCents,
          entryCount,
          status: statusRow?.status ?? PayoutStatus.OPEN,
          finalizedAt: statusRow?.finalizedAt ?? null,
          finalizedAmountCents: statusRow?.finalizedAmountCents ?? null,
          paidAt: statusRow?.paidAt ?? null,
          paidAmountCents: statusRow?.paidAmountCents ?? null,
        };
      }),
    );

    // Only teachers with actual activity or a status row are worth showing —
    // a teacher who never taught this month shouldn't clutter the list.
    return rows.filter(
      (r) => r.entryCount > 0 || r.status !== PayoutStatus.OPEN,
    );
  }

  async getStatement(teacherId: string, month: number, year: number) {
    const [teacher, entries, statusRow] = await Promise.all([
      this.prisma.teacherProfile.findUnique({
        where: { id: teacherId },
        include: { user: { select: { fullName: true, email: true } } },
      }),
      this.prisma.payoutEntry.findMany({
        where: { teacherId, month, year },
        include: {
          booking: {
            include: { shift: { select: { start: true, end: true } } },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.monthlyPayoutStatus.findUnique({
        where: { teacherId_month_year: { teacherId, month, year } },
      }),
    ]);
    if (!teacher) throw new NotFoundException('Teacher not found.');

    const totalCents = entries.reduce((sum, e) => sum + e.amountCents, 0);

    return {
      teacherId,
      teacherName: teacher.user.fullName,
      teacherEmail: teacher.user.email,
      month,
      year,
      totalCents,
      status: statusRow?.status ?? PayoutStatus.OPEN,
      finalizedAt: statusRow?.finalizedAt ?? null,
      finalizedAmountCents: statusRow?.finalizedAmountCents ?? null,
      finalizedBy: statusRow?.finalizedBy ?? null,
      paidAt: statusRow?.paidAt ?? null,
      paidAmountCents: statusRow?.paidAmountCents ?? null,
      paidBy: statusRow?.paidBy ?? null,
      entries: entries.map((e) => ({
        id: e.id,
        type: e.type,
        amountCents: e.amountCents,
        description: e.description,
        createdAt: e.createdAt,
        createdBy: e.createdBy,
        referenceType: e.referenceType,
        referenceId: e.referenceId,
        classStart: e.booking?.shift?.start ?? null,
        classEnd: e.booking?.shift?.end ?? null,
      })),
    };
  }

  async finalizeMonth(
    teacherId: string,
    month: number,
    year: number,
    adminUserId: string,
  ) {
    await this.requireTeacherById(teacherId);
    const existing = await this.prisma.monthlyPayoutStatus.findUnique({
      where: { teacherId_month_year: { teacherId, month, year } },
    });
    if (existing && existing.status !== PayoutStatus.OPEN) {
      throw new BadRequestException(
        `This month is already ${existing.status.toLowerCase()}.`,
      );
    }

    const { totalCents } = await this.getLedgerTotal(teacherId, month, year);

    const statusRow = await this.prisma.monthlyPayoutStatus.upsert({
      where: { teacherId_month_year: { teacherId, month, year } },
      update: {
        status: PayoutStatus.FINALIZED,
        finalizedAmountCents: totalCents,
        finalizedBy: adminUserId,
        finalizedAt: new Date(),
      },
      create: {
        teacherId,
        month,
        year,
        status: PayoutStatus.FINALIZED,
        finalizedAmountCents: totalCents,
        finalizedBy: adminUserId,
        finalizedAt: new Date(),
      },
    });

    await this.audit.log({
      actorId: adminUserId,
      actorRole: 'ADMIN',
      action: 'PAYOUT_FINALIZE',
      entityType: 'TeacherProfile',
      entityId: teacherId,
      afterData: { month, year, totalCents },
    });

    return statusRow;
  }

  async markPaid(
    teacherId: string,
    month: number,
    year: number,
    adminUserId: string,
  ) {
    await this.requireTeacherById(teacherId);
    const existing = await this.prisma.monthlyPayoutStatus.findUnique({
      where: { teacherId_month_year: { teacherId, month, year } },
    });
    if (!existing || existing.status !== PayoutStatus.FINALIZED) {
      throw new BadRequestException(
        'This month must be finalized before it can be marked as paid.',
      );
    }

    const { totalCents } = await this.getLedgerTotal(teacherId, month, year);

    const statusRow = await this.prisma.monthlyPayoutStatus.update({
      where: { teacherId_month_year: { teacherId, month, year } },
      data: {
        status: PayoutStatus.PAID,
        paidAmountCents: totalCents,
        paidBy: adminUserId,
        paidAt: new Date(),
      },
    });

    await this.audit.log({
      actorId: adminUserId,
      actorRole: 'ADMIN',
      action: 'PAYOUT_MARK_PAID',
      entityType: 'TeacherProfile',
      entityId: teacherId,
      afterData: { month, year, totalCents },
    });

    return statusRow;
  }

  // ─── Excel export (teacher self-service and admin, same query) ────────────

  async generateReportForUser(userId: string, month: number, year: number) {
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { userId },
    });
    if (!teacher) throw new NotFoundException('Teacher profile not found.');
    return this.generateReport(teacher.id, month, year);
  }

  async generateReport(teacherId: string, month: number, year: number) {
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { id: teacherId },
      include: { user: { select: { fullName: true } } },
    });
    if (!teacher) throw new NotFoundException('Teacher not found.');

    const entries = await this.prisma.payoutEntry.findMany({
      where: { teacherId, month, year },
      include: {
        booking: { include: { shift: { select: { start: true, end: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const buffer = await buildPayoutReportWorkbook({
      teacherName: teacher.user.fullName,
      month,
      year,
      entries: entries.map((e) => ({
        createdAt: e.createdAt,
        type: e.type,
        description: e.description,
        referenceId: e.referenceId,
        amountCents: e.amountCents,
        classStart: e.booking?.shift?.start ?? null,
        classEnd: e.booking?.shift?.end ?? null,
      })),
    });

    return { buffer, teacherName: teacher.user.fullName };
  }
}
