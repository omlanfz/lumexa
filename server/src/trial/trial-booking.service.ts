// FILE PATH: server/src/trial/trial-booking.service.ts
//
// The one place trial appointments are created, moved and cancelled — for
// parents (public form) and for admins alike, so the rules can never differ.
//
// Race-safety
//   Every change runs in a transaction that first takes a transaction-scoped
//   Postgres advisory lock (pg_advisory_xact_lock). That serialises all trial
//   booking changes: the second of two simultaneous requests waits, then
//   re-reads the first one's committed row and fails the 60-minute spacing
//   check cleanly (HTTP 409). Behind that, the migration's exclusion
//   constraint "TrialLead_no_overlapping_slots" makes it physically
//   impossible to store two conflicting CONFIRMED appointments even if this
//   service were bypassed or the lock were ever lost; that error is mapped
//   to the same 409.
//
// Time
//   Appointments are stored as UTC instants. Recurring availability is
//   evaluated in Asia/Dhaka (fixed UTC+6, no DST) via scheduling/dhaka-time.util.

import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type TrialLead } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  addDaysToDateStr,
  dhakaToUtc,
  utcToDhakaParts,
} from '../scheduling/dhaka-time.util';
import {
  TRIAL_BOOKING_LOCK_KEY,
  TRIAL_BUFFER_MINUTES,
  TRIAL_DURATION_MINUTES,
  TRIAL_MAX_AGE,
  TRIAL_MAX_RANGE_DAYS,
  TRIAL_MIN_AGE,
  TRIAL_MIN_START_SPACING_MINUTES,
  TRIAL_TIMEZONE,
  TRIAL_TIMEZONE_LABEL,
  trialHorizonDays,
  trialMinNoticeMinutes,
} from './trial.constants';
import {
  type AvailabilityConfig,
  dayStatus,
  eachDate,
  generateSlotsForDate,
  isValidDateStr,
  rejectionForSlot,
  rejectionMessage,
  type DayStatus,
  type SlotRejection,
} from './trial-slots.util';
import { trialEnd } from './trial-format.util';
import { TrialWhatsAppService } from './trial-whatsapp.service';
import {
  TrialNotificationsService,
  bookingReference,
} from './trial-notifications.service';

type Db = Prisma.TransactionClient;
const MINUTE_MS = 60_000;

export interface Actor {
  id: string;
  role: string;
}
const PUBLIC_ACTOR: Actor = { id: 'public-trial-form', role: 'PUBLIC' };

export interface BookingInput {
  parentName: string;
  parentEmail: string;
  /** Already normalised to E.164. */
  parentPhone: string;
  childName: string;
  childAge: number;
  subject: string;
  timezone?: string | null;
  message?: string | null;
  startAt: Date;
  whatsappConsent: boolean;
  adminNotes?: string | null;
}

export interface AvailabilityChanges {
  /** Slots that became bookable because of this change (ISO, UTC). */
  nowBookable: string[];
  /** Slots that stopped being bookable because of this change (ISO, UTC). */
  noLongerBookable: string[];
}

export interface AvailabilityDay {
  date: string;
  status: DayStatus;
  slots: string[];
}

export interface AvailabilityResponse {
  timezone: string;
  timezoneLabel: string;
  durationMinutes: number;
  bufferMinutes: number;
  from: string;
  to: string;
  /** Earliest / latest dates the calendar should allow navigating to. */
  minDate: string;
  maxDate: string;
  generatedAt: string;
  days: AvailabilityDay[];
}

type ConfirmedLead = TrialLead & { startAt: Date; endAt: Date };

/** Does this error come from the "no overlapping slots" exclusion constraint? */
export function isSlotConflictError(err: unknown): boolean {
  const e = err as { message?: string; code?: string; meta?: any } | undefined;
  if (!e) return false;
  const text = `${e.message ?? ''} ${JSON.stringify(e.meta ?? {})}`;
  return (
    text.includes('TrialLead_no_overlapping_slots') ||
    text.includes('23P01') ||
    e.code === '23P01'
  );
}

@Injectable()
export class TrialBookingService {
  private readonly logger = new Logger(TrialBookingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifier: TrialNotificationsService,
    private readonly whatsapp: TrialWhatsAppService,
  ) {}

  // ─── Reading availability ─────────────────────────────────────────────────

  async loadConfig(
    db: Db | PrismaService = this.prisma,
  ): Promise<AvailabilityConfig> {
    const [rules, windows, blocks] = await Promise.all([
      db.trialAvailabilityRule.findMany(),
      db.trialAvailabilityWindow.findMany(),
      db.trialBlockedPeriod.findMany(),
    ]);
    return { rules, windows, blocks };
  }

  /** CONFIRMED appointment start times in [from, to) — optionally ignoring one. */
  private async confirmedStarts(
    db: Db | PrismaService,
    from: Date,
    to: Date,
    excludeId?: string,
  ): Promise<Date[]> {
    const rows = await db.trialLead.findMany({
      where: {
        appointmentStatus: 'CONFIRMED',
        startAt: { gte: from, lt: to },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { startAt: true },
    });
    return rows.map((r) => r.startAt as Date);
  }

  /** Bookable slots for a date range. Used by the public calendar and the
   *  admin "what can parents book?" preview — one implementation, so the two
   *  can never disagree. */
  async getAvailability(
    from: string,
    to: string,
    now = new Date(),
    /** Admin reschedule picker: don't count this appointment as taking a slot. */
    excludeAppointmentId?: string,
  ): Promise<AvailabilityResponse> {
    if (!isValidDateStr(from) || !isValidDateStr(to)) {
      throw new BadRequestException(
        'from and to must be dates like 2026-11-05.',
      );
    }
    if (to < from) {
      throw new BadRequestException('to must not be before from.');
    }
    const dates = eachDate(from, to);
    if (dates.length > TRIAL_MAX_RANGE_DAYS) {
      throw new BadRequestException(
        `Please request at most ${TRIAL_MAX_RANGE_DAYS} days at a time.`,
      );
    }

    const minNoticeMinutes = trialMinNoticeMinutes();
    const horizonDays = trialHorizonDays();
    const cfg = await this.loadConfig();
    const rangeStart = new Date(
      dhakaToUtc(from, 0, 0).getTime() -
        TRIAL_MIN_START_SPACING_MINUTES * MINUTE_MS,
    );
    const rangeEnd = new Date(
      dhakaToUtc(addDaysToDateStr(to, 1), 0, 0).getTime() +
        TRIAL_MIN_START_SPACING_MINUTES * MINUTE_MS,
    );
    const booked = await this.confirmedStarts(
      this.prisma,
      rangeStart,
      rangeEnd,
      excludeAppointmentId,
    );

    const today = utcToDhakaParts(now).dateStr;
    return {
      timezone: TRIAL_TIMEZONE,
      timezoneLabel: TRIAL_TIMEZONE_LABEL,
      durationMinutes: TRIAL_DURATION_MINUTES,
      bufferMinutes: TRIAL_BUFFER_MINUTES,
      from,
      to,
      minDate: today,
      maxDate: utcToDhakaParts(
        new Date(now.getTime() + horizonDays * 86_400_000),
      ).dateStr,
      generatedAt: now.toISOString(),
      days: dates.map((date) => {
        const { status, slots } = dayStatus({
          cfg,
          date,
          bookedStarts: booked,
          now,
          minNoticeMinutes,
          horizonDays,
        });
        return { date, status, slots: slots.map((s) => s.toISOString()) };
      }),
    };
  }

  /** ISO strings of every bookable slot on the given dates (inside a tx). */
  private async slotSnapshot(
    db: Db,
    cfg: AvailabilityConfig,
    dates: string[],
    now: Date,
  ): Promise<Set<string>> {
    const sorted = [...new Set(dates)].sort();
    const from = new Date(
      dhakaToUtc(sorted[0], 0, 0).getTime() -
        TRIAL_MIN_START_SPACING_MINUTES * MINUTE_MS,
    );
    const to = new Date(
      dhakaToUtc(
        addDaysToDateStr(sorted[sorted.length - 1], 1),
        0,
        0,
      ).getTime() +
        TRIAL_MIN_START_SPACING_MINUTES * MINUTE_MS,
    );
    const booked = await this.confirmedStarts(db, from, to);
    const out = new Set<string>();
    for (const date of sorted) {
      for (const s of generateSlotsForDate({
        cfg,
        date,
        bookedStarts: booked,
        now,
        minNoticeMinutes: trialMinNoticeMinutes(),
        horizonDays: trialHorizonDays(),
      })) {
        out.add(s.toISOString());
      }
    }
    return out;
  }

  private diff(before: Set<string>, after: Set<string>): AvailabilityChanges {
    return {
      nowBookable: [...after].filter((s) => !before.has(s)).sort(),
      noLongerBookable: [...before].filter((s) => !after.has(s)).sort(),
    };
  }

  // ─── Locking + validation ─────────────────────────────────────────────────

  private async lock(tx: Db): Promise<void> {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${TRIAL_BOOKING_LOCK_KEY}::bigint)`;
  }

  /** Validates `start` against availability + bookings + clock. Must run
   *  inside the locked transaction. Throws the right HTTP error. */
  private async assertSlotBookable(
    tx: Db,
    cfg: AvailabilityConfig,
    start: Date,
    now: Date,
    excludeId?: string,
  ): Promise<void> {
    const spacing = TRIAL_MIN_START_SPACING_MINUTES * MINUTE_MS;
    const nearby = await this.confirmedStarts(
      tx,
      new Date(start.getTime() - spacing),
      new Date(start.getTime() + spacing + 1),
      excludeId,
    );
    const rejection = rejectionForSlot({
      cfg,
      start,
      bookedStarts: nearby,
      now,
      minNoticeMinutes: trialMinNoticeMinutes(),
      horizonDays: trialHorizonDays(),
    });
    if (rejection) this.throwRejection(rejection);
  }

  private throwRejection(r: SlotRejection): never {
    const message = rejectionMessage(r);
    // Anything the picker could have shown as free a moment ago is a 409 so
    // the client knows to refresh availability; a malformed time is a 400.
    if (r === 'NOT_ON_SLOT_GRID') throw new BadRequestException(message);
    throw new ConflictException(message);
  }

  /** Post-commit side effects must never turn a saved booking into an error. */
  private safely(label: string, fn: () => void): void {
    try {
      fn();
    } catch (e) {
      this.logger.error(
        `Trial ${label} failed after commit: ${String((e as Error)?.message ?? e)}`,
      );
    }
  }

  private static readonly CONFLICT_MESSAGE = rejectionMessage(
    'CONFLICTS_WITH_BOOKING',
  );

  private async inTransaction<T>(fn: (tx: Db) => Promise<T>): Promise<T> {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          await this.lock(tx);
          return fn(tx);
        },
        { maxWait: 5_000, timeout: 15_000 },
      );
    } catch (err) {
      if (isSlotConflictError(err)) {
        throw new ConflictException(TrialBookingService.CONFLICT_MESSAGE);
      }
      throw err;
    }
  }

  // ─── Create ───────────────────────────────────────────────────────────────

  async createBooking(
    input: BookingInput,
    source: 'PARENT' | 'ADMIN',
    actor: Actor = PUBLIC_ACTOR,
  ): Promise<{ lead: ConfirmedLead; alreadyBooked: boolean }> {
    if (input.childAge < TRIAL_MIN_AGE || input.childAge > TRIAL_MAX_AGE) {
      throw new BadRequestException(
        `Trial classes are for children aged ${TRIAL_MIN_AGE} to ${TRIAL_MAX_AGE}.`,
      );
    }
    const now = new Date();
    const start = input.startAt;
    const end = trialEnd(start);

    const result = await this.inTransaction(async (tx) => {
      if (source === 'PARENT') {
        // Same child already holds an upcoming trial: a double-click / retry of
        // the same slot is idempotent; a different slot needs a human.
        const existing = await tx.trialLead.findFirst({
          where: {
            parentEmail: { equals: input.parentEmail, mode: 'insensitive' },
            childName: { equals: input.childName, mode: 'insensitive' },
            appointmentStatus: 'CONFIRMED',
            startAt: { gt: now },
          },
        });
        if (existing) {
          if (existing.startAt?.getTime() === start.getTime()) {
            return { lead: existing as ConfirmedLead, alreadyBooked: true };
          }
          throw new ConflictException(
            `${input.childName} already has a trial class booked. To change it, please message us on WhatsApp or email.`,
          );
        }
      }

      const cfg = await this.loadConfig(tx);
      await this.assertSlotBookable(tx, cfg, start, now);

      const lead = (await tx.trialLead.create({
        data: {
          parentName: input.parentName,
          parentEmail: input.parentEmail,
          parentPhone: input.parentPhone,
          childName: input.childName,
          childAge: input.childAge,
          subject: input.subject,
          timezone: input.timezone ?? null,
          message: input.message ?? null,
          status: 'BOOKED',
          whatsappConsent: input.whatsappConsent,
          whatsappConsentAt: input.whatsappConsent ? now : null,
          startAt: start,
          endAt: end,
          appointmentStatus: 'CONFIRMED',
          bookedBy: source,
          adminNotes: input.adminNotes ?? null,
        },
      })) as ConfirmedLead;

      // A parent booking alerts the admin; an admin booking on someone's
      // behalf does not (they just did it).
      await this.whatsapp.enqueue(
        tx,
        lead,
        source === 'PARENT'
          ? ['PARENT_CONFIRMATION', 'PARENT_REMINDER', 'ADMIN_ALERT']
          : ['PARENT_CONFIRMATION', 'PARENT_REMINDER'],
        now,
      );
      return { lead, alreadyBooked: false };
    });

    if (!result.alreadyBooked) {
      this.audit
        .log({
          actorId: actor.id,
          actorRole: actor.role,
          action:
            source === 'PARENT' ? 'TRIAL_BOOKED' : 'TRIAL_SCHEDULED_BY_ADMIN',
          entityType: 'TRIAL_APPOINTMENT',
          entityId: result.lead.id,
          afterData: {
            startAt: result.lead.startAt.toISOString(),
            endAt: result.lead.endAt.toISOString(),
            reference: bookingReference(result.lead.id),
          },
        })
        .catch((e) =>
          this.logger.error(
            `Audit write failed: ${String((e as Error)?.message ?? e)}`,
          ),
        );
      this.safely('booking notifications', () =>
        this.notifier.afterBooked(result.lead, {
          alertAdmin: source === 'PARENT',
        }),
      );
    }
    return result;
  }

  // ─── Reschedule ───────────────────────────────────────────────────────────

  async reschedule(
    id: string,
    newStart: Date,
    actor: Actor,
    reason?: string,
  ): Promise<{
    lead: ConfirmedLead;
    availabilityChanges: AvailabilityChanges;
  }> {
    const now = new Date();
    let previous!: { startAt: Date; endAt: Date };

    const { lead, changes } = await this.inTransaction(async (tx) => {
      const current = await tx.trialLead.findUnique({ where: { id } });
      if (!current) throw new NotFoundException('Trial appointment not found.');
      if (
        current.appointmentStatus !== 'CONFIRMED' ||
        !current.startAt ||
        !current.endAt
      ) {
        throw new BadRequestException(
          'Only a confirmed appointment can be rescheduled.',
        );
      }
      if (current.endAt.getTime() <= now.getTime()) {
        throw new BadRequestException('That trial has already taken place.');
      }
      if (current.startAt.getTime() === newStart.getTime()) {
        throw new BadRequestException(
          'The new time is the same as the current time.',
        );
      }
      previous = { startAt: current.startAt, endAt: current.endAt };

      const cfg = await this.loadConfig(tx);
      await this.assertSlotBookable(tx, cfg, newStart, now, id);

      const dates = [
        utcToDhakaParts(current.startAt).dateStr,
        utcToDhakaParts(newStart).dateStr,
      ];
      const before = await this.slotSnapshot(tx, cfg, dates, now);

      const updated = (await tx.trialLead.update({
        where: { id },
        data: {
          startAt: newStart,
          endAt: trialEnd(newStart),
          revision: { increment: 1 },
        },
      })) as ConfirmedLead;

      // The old reminder is for the old time: retire it and queue one for the
      // new time. (Confirmation / admin alert are never re-sent.)
      await this.whatsapp.skipUnsent(tx, id, 'Superseded by a reschedule.', [
        'PARENT_REMINDER',
      ]);
      await this.whatsapp.enqueue(tx, updated, ['PARENT_REMINDER'], now);

      const after = await this.slotSnapshot(tx, cfg, dates, now);
      return { lead: updated, changes: this.diff(before, after) };
    });

    this.audit
      .log({
        actorId: actor.id,
        actorRole: actor.role,
        action: 'TRIAL_RESCHEDULED',
        entityType: 'TRIAL_APPOINTMENT',
        entityId: id,
        reason,
        beforeData: {
          startAt: previous.startAt.toISOString(),
          endAt: previous.endAt.toISOString(),
        },
        afterData: {
          startAt: lead.startAt.toISOString(),
          endAt: lead.endAt.toISOString(),
        },
      })
      .catch((e) =>
        this.logger.error(
          `Audit write failed: ${String((e as Error)?.message ?? e)}`,
        ),
      );
    this.safely('reschedule notification', () =>
      this.notifier.afterRescheduled(lead, previous),
    );
    return { lead, availabilityChanges: changes };
  }

  // ─── Cancel ───────────────────────────────────────────────────────────────

  async cancel(
    id: string,
    actor: Actor,
    reason: string,
    parentNote?: string | null,
  ): Promise<{
    lead: ConfirmedLead;
    availabilityChanges: AvailabilityChanges;
    alreadyCancelled: boolean;
  }> {
    const now = new Date();

    const result = await this.inTransaction(async (tx) => {
      const current = await tx.trialLead.findUnique({ where: { id } });
      if (!current) throw new NotFoundException('Trial appointment not found.');
      if (!current.startAt || !current.endAt || !current.appointmentStatus) {
        throw new BadRequestException(
          'This lead has no booked appointment to cancel.',
        );
      }
      if (current.appointmentStatus === 'CANCELLED') {
        return {
          lead: current as ConfirmedLead,
          changes: { nowBookable: [], noLongerBookable: [] },
          alreadyCancelled: true,
        };
      }
      if (current.endAt.getTime() <= now.getTime()) {
        throw new BadRequestException('That trial has already taken place.');
      }

      const cfg = await this.loadConfig(tx);
      const dates = [utcToDhakaParts(current.startAt).dateStr];
      const before = await this.slotSnapshot(tx, cfg, dates, now);

      const updated = (await tx.trialLead.update({
        where: { id },
        data: {
          appointmentStatus: 'CANCELLED',
          cancelledAt: now,
          cancelReason: reason,
        },
      })) as ConfirmedLead;
      await this.whatsapp.skipUnsent(tx, id, 'Appointment was cancelled.');

      const after = await this.slotSnapshot(tx, cfg, dates, now);
      return {
        lead: updated,
        changes: this.diff(before, after),
        alreadyCancelled: false,
      };
    });

    if (!result.alreadyCancelled) {
      this.audit
        .log({
          actorId: actor.id,
          actorRole: actor.role,
          action: 'TRIAL_CANCELLED',
          entityType: 'TRIAL_APPOINTMENT',
          entityId: id,
          reason,
          beforeData: {
            appointmentStatus: 'CONFIRMED',
            startAt: result.lead.startAt.toISOString(),
          },
          afterData: { appointmentStatus: 'CANCELLED' },
        })
        .catch((e) =>
          this.logger.error(
            `Audit write failed: ${String((e as Error)?.message ?? e)}`,
          ),
        );
      this.safely('cancellation notification', () =>
        this.notifier.afterCancelled(result.lead, parentNote),
      );
    }
    return {
      lead: result.lead,
      availabilityChanges: result.changes,
      alreadyCancelled: result.alreadyCancelled,
    };
  }
}

/** The only appointment fields a parent ever gets back. No phone, no notes. */
export function toPublicBooking(lead: ConfirmedLead) {
  return {
    reference: bookingReference(lead.id),
    startAt: lead.startAt.toISOString(),
    endAt: lead.endAt.toISOString(),
    timezone: TRIAL_TIMEZONE,
    timezoneLabel: TRIAL_TIMEZONE_LABEL,
    durationMinutes: TRIAL_DURATION_MINUTES,
    childName: lead.childName,
    program: lead.subject,
  };
}
