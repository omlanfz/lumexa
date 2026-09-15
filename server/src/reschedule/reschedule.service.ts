// FILE PATH: server/src/reschedule/reschedule.service.ts
//
// Architecture: Teacher UI → this service → policy validation → audit
// record (RescheduleRequest) → booking/shift update, all in one DB
// transaction, with the resulting penalty (if any) posted to the earnings
// ledger right after. A booked-class reschedule/cancel is a booking event
// with a permanent audit trail — never a bare PATCH /shifts/:id.

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PenaltyStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { PayoutsService } from '../payouts/payouts.service';
import { CreateRescheduleEventDto } from './dto/create-reschedule-event.dto';
import {
  FREE_EMERGENCY_RESCHEDULES_PER_MONTH,
  EMERGENCY_RESCHEDULE_PENALTY_CENTS,
} from '../payouts/payout.constants';

@Injectable()
export class RescheduleService {
  private readonly logger = new Logger(RescheduleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly payoutsService: PayoutsService,
  ) {}

  async createEvent(
    teacherUserId: string,
    bookingId: string,
    dto: CreateRescheduleEventDto,
  ) {
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { userId: teacherUserId },
    });
    if (!teacher) throw new NotFoundException('Teacher profile not found.');

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { shift: true },
    });
    if (!booking) throw new NotFoundException('Booking not found.');
    if (booking.shift.teacherId !== teacher.id) {
      throw new ForbiddenException('This booking does not belong to you.');
    }
    if (
      booking.paymentStatus === 'REFUNDED' ||
      booking.paymentStatus === 'FAILED'
    ) {
      throw new BadRequestException('This booking is no longer active.');
    }

    const isEmergency = dto.category === 'TEACHER_EMERGENCY';
    const initiatedByRole = isEmergency ? 'TEACHER' : dto.initiatedByRole;

    // ── Server-side policy validation (never trust the client) ─────────────
    if (dto.category === 'STUDENT_REQUESTED') {
      if (!dto.proofUrl) {
        throw new BadRequestException(
          'Proof is required for a student/parent-requested change.',
        );
      }
      if (!['STUDENT', 'PARENT'].includes(dto.initiatedByRole)) {
        throw new BadRequestException(
          'initiatedByRole must be STUDENT or PARENT for a student-requested change.',
        );
      }
    } else if (isEmergency) {
      if (!dto.reason?.trim()) {
        throw new BadRequestException(
          'A short reason is required for a teacher emergency.',
        );
      }
      if (dto.informedStudent === undefined || dto.informedStudent === null) {
        throw new BadRequestException(
          'Please confirm whether the student/parent has been informed.',
        );
      }
    } else {
      throw new BadRequestException('Unsupported category.');
    }

    let newStart = booking.shift.start;
    let newEnd = booking.shift.end;

    if (dto.action === 'RESCHEDULE') {
      if (!dto.newStart || !dto.newEnd) {
        throw new BadRequestException(
          'New date/time is required to reschedule.',
        );
      }
      newStart = new Date(dto.newStart);
      newEnd = new Date(dto.newEnd);
      const now = new Date();

      if (newStart.getTime() < now.getTime() - 5 * 60 * 1000) {
        throw new BadRequestException('New start time cannot be in the past.');
      }
      if (newEnd <= newStart) {
        throw new BadRequestException('End time must be after start time.');
      }
      const durationMinutes = (newEnd.getTime() - newStart.getTime()) / 60000;
      if (durationMinutes < 30) {
        throw new BadRequestException('Minimum session length is 30 minutes.');
      }
      if (durationMinutes > 240) {
        throw new BadRequestException('Maximum session length is 4 hours.');
      }

      const overlap = await this.prisma.shift.findFirst({
        where: {
          teacherId: teacher.id,
          id: { not: booking.shiftId },
          OR: [{ start: { lt: newEnd }, end: { gt: newStart } }],
        },
      });
      if (overlap) {
        throw new BadRequestException(
          'The new time overlaps with one of your existing shifts.',
        );
      }
    } else if (dto.action !== 'CANCEL') {
      throw new BadRequestException('Unsupported action.');
    }

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const result = await this.prisma.$transaction(async (tx) => {
      let emergencySeq: number | null = null;
      let penaltyStatus: PenaltyStatus = PenaltyStatus.NONE;
      let penaltyAmountCents = 0;

      // Only TEACHER_EMERGENCY counts against the monthly quota — a
      // student/parent-requested change never touches this bucket.
      if (isEmergency) {
        const bucket = await tx.teacherCancellation.upsert({
          where: {
            teacherId_month_year: { teacherId: teacher.id, month, year },
          },
          update: { count: { increment: 1 } },
          create: { teacherId: teacher.id, month, year, count: 1 },
        });
        emergencySeq = bucket.count;
        // First N are free; never block the request either way — we just
        // flag it for Operations review once the quota is exceeded.
        if (emergencySeq > FREE_EMERGENCY_RESCHEDULES_PER_MONTH) {
          penaltyStatus = PenaltyStatus.PENDING_PENALTY_REVIEW;
          penaltyAmountCents = EMERGENCY_RESCHEDULE_PENALTY_CENTS;
        }
      }

      if (dto.action === 'RESCHEDULE') {
        await tx.shift.update({
          where: { id: booking.shiftId },
          data: { start: newStart, end: newEnd },
        });
      } else {
        await tx.booking.update({
          where: { id: booking.id },
          data: { paymentStatus: 'REFUNDED' },
        });
        await tx.shift.update({
          where: { id: booking.shiftId },
          data: { isBooked: false },
        });
      }

      const audit = await tx.rescheduleRequest.create({
        data: {
          bookingId: booking.id,
          teacherId: teacher.id,
          action: dto.action,
          category: dto.category,
          initiatedByRole,
          oldStart: booking.shift.start,
          oldEnd: booking.shift.end,
          newStart,
          newEnd,
          reason: dto.reason,
          proofUrl: dto.proofUrl,
          informedStudent: isEmergency ? (dto.informedStudent ?? null) : null,
          status: dto.action === 'CANCEL' ? 'CANCELLED' : 'CONFIRMED',
          penaltyStatus,
          penaltyAmountCents,
          emergencySeq,
        },
      });

      return { audit, emergencySeq, penaltyStatus, penaltyAmountCents };
    });

    // Post the fixed penalty to the ledger after the transaction commits.
    // Idempotent on the audit row's id, so a retry can never double-post.
    if (result.penaltyAmountCents !== 0) {
      try {
        await this.payoutsService.triggerFixedPenalty({
          teacherId: teacher.id,
          amountCents: result.penaltyAmountCents,
          description: `Emergency reschedule penalty (occurrence #${result.emergencySeq} this month)`,
          referenceType: 'RESCHEDULE_PENALTY',
          referenceId: result.audit.id,
        });
      } catch (err) {
        this.logger.error(
          `Failed to post penalty ledger entry for reschedule audit ${result.audit.id}`,
          err as Error,
        );
      }
    }

    return {
      id: result.audit.id,
      action: dto.action,
      category: dto.category,
      status: result.audit.status,
      penaltyStatus: result.penaltyStatus,
      penaltyAmountCents: result.penaltyAmountCents,
      emergencyCountThisMonth: result.emergencySeq,
      newStart,
      newEnd,
    };
  }

  async getEmergencyStatus(teacherUserId: string) {
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { userId: teacherUserId },
    });
    if (!teacher) throw new NotFoundException('Teacher profile not found.');

    const now = new Date();
    const bucket = await this.prisma.teacherCancellation.findUnique({
      where: {
        teacherId_month_year: {
          teacherId: teacher.id,
          month: now.getMonth() + 1,
          year: now.getFullYear(),
        },
      },
    });

    return {
      count: bucket?.count ?? 0,
      limit: FREE_EMERGENCY_RESCHEDULES_PER_MONTH,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
    };
  }

  async getHistoryForTeacher(teacherUserId: string, bookingId?: string) {
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { userId: teacherUserId },
    });
    if (!teacher) throw new NotFoundException('Teacher profile not found.');

    return this.prisma.rescheduleRequest.findMany({
      where: { teacherId: teacher.id, ...(bookingId ? { bookingId } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  // ─── Operations review of a flagged (4th+) emergency-reschedule penalty ───
  //
  // Answers "whether Operations reviewed it" from the audit trail. Waiving
  // never edits the original PENALTY ledger row — it posts an offsetting
  // ADJUSTMENT, same append-only correction pattern as the rest of the
  // ledger (+50 original penalty stands, -... wait: +50 reversal entry).

  async reviewPenalty(
    adminUserId: string,
    requestId: string,
    decision: 'WAIVE' | 'UPHOLD',
  ) {
    const request = await this.prisma.rescheduleRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) throw new NotFoundException('Reschedule event not found.');
    if (request.penaltyStatus !== PenaltyStatus.PENDING_PENALTY_REVIEW) {
      throw new BadRequestException(
        'This event has no penalty pending review.',
      );
    }

    if (decision === 'WAIVE' && request.penaltyAmountCents !== 0) {
      await this.payoutsService.triggerAdjustment(request.teacherId, {
        amountCents: -request.penaltyAmountCents,
        reason: `Waived emergency-reschedule penalty for event ${request.id}`,
        adminUserId,
        referenceType: 'RESCHEDULE_PENALTY_WAIVER',
        referenceId: request.id,
      });
    }

    return this.prisma.rescheduleRequest.update({
      where: { id: requestId },
      data: {
        penaltyStatus:
          decision === 'WAIVE'
            ? PenaltyStatus.WAIVED
            : PenaltyStatus.PENALTY_APPLIED,
        reviewedBy: adminUserId,
        reviewedAt: new Date(),
      },
    });
  }
}
