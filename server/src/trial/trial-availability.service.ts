// FILE PATH: server/src/trial/trial-availability.service.ts
//
// Admin management of trial availability: weekly recurring rules (several per
// weekday), one-off windows, and blocked periods (holidays etc.).
//
// Existing bookings are never silently touched. Before any edit that could
// remove availability (editing/deleting a rule or window, adding/editing a
// block) the service works out which upcoming CONFIRMED appointments would no
// longer fall inside availability. If there are any, the change is refused
// with a 409 until the caller re-sends it with `confirmAffected=true`; with
// `dryRun=true` the same calculation is returned without changing anything
// (that is what the admin UI uses to show its warning). Confirmed changes are
// applied and audited, and the affected appointments stay CONFIRMED — the
// admin then reschedules or cancels each one explicitly (the appointments
// list flags them as "outside availability").

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { TRIAL_TIMEZONE } from './trial.constants';
import {
  type AvailabilityConfig,
  formatMinutes,
  isCoveredByAvailability,
  isValidDateStr,
  parseTimeOfDay,
} from './trial-slots.util';
import { bookingReference } from './trial-notifications.service';
import type { Actor } from './trial-booking.service';
import { WEEKDAY_LABELS } from '../scheduling/dhaka-time.util';

export interface RuleInput {
  weekday: number;
  startTime: string;
  endTime: string;
  effectiveFrom?: string | null;
  effectiveUntil?: string | null;
  note?: string | null;
}
export interface WindowInput {
  date: string;
  startTime: string;
  endTime: string;
  note?: string | null;
}
export interface BlockInput {
  startDate: string;
  endDate: string;
  startTime?: string | null;
  endTime?: string | null;
  reason: string;
}

export interface MutationOptions {
  dryRun?: boolean;
  confirmAffected?: boolean;
}

export interface AffectedAppointment {
  id: string;
  reference: string;
  parentName: string;
  childName: string;
  startAt: string;
  endAt: string;
}

function parseRange(startTime: string, endTime: string) {
  const start = parseTimeOfDay(startTime);
  const end = parseTimeOfDay(endTime);
  if (start === null || end === null) {
    throw new BadRequestException(
      'Times must look like 15:00 (24-hour clock).',
    );
  }
  if (start % 30 !== 0 || end % 30 !== 0) {
    throw new BadRequestException('Times must be on the hour or half hour.');
  }
  if (end < start + 30) {
    throw new BadRequestException(
      'A window must be at least 30 minutes long (the end must be after the start).',
    );
  }
  return { start, end };
}

function checkDate(value: string | null | undefined, label: string) {
  if (value == null || value === '') return null;
  if (!isValidDateStr(value)) {
    throw new BadRequestException(`${label} must be a date like 2026-11-05.`);
  }
  return value;
}

@Injectable()
export class TrialAvailabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listAll() {
    const [rules, windows, blocks] = await Promise.all([
      this.prisma.trialAvailabilityRule.findMany({
        orderBy: [{ weekday: 'asc' }, { startMinute: 'asc' }],
      }),
      this.prisma.trialAvailabilityWindow.findMany({
        orderBy: [{ date: 'asc' }, { startMinute: 'asc' }],
      }),
      this.prisma.trialBlockedPeriod.findMany({
        orderBy: [{ startDate: 'asc' }],
      }),
    ]);
    return {
      timezone: TRIAL_TIMEZONE,
      rules: rules.map((r) => ({
        id: r.id,
        weekday: r.weekday,
        weekdayLabel: WEEKDAY_LABELS[r.weekday],
        startTime: formatMinutes(r.startMinute),
        endTime: formatMinutes(r.endMinute),
        effectiveFrom: r.effectiveFrom,
        effectiveUntil: r.effectiveUntil,
        note: r.note,
      })),
      windows: windows.map((w) => ({
        id: w.id,
        date: w.date,
        startTime: formatMinutes(w.startMinute),
        endTime: formatMinutes(w.endMinute),
        note: w.note,
      })),
      blocks: blocks.map((b) => ({
        id: b.id,
        startDate: b.startDate,
        endDate: b.endDate,
        startTime: b.startMinute == null ? null : formatMinutes(b.startMinute),
        endTime: b.endMinute == null ? null : formatMinutes(b.endMinute),
        reason: b.reason,
      })),
    };
  }

  // ─── Impact calculation ───────────────────────────────────────────────────

  private async currentConfig(): Promise<AvailabilityConfig> {
    const [rules, windows, blocks] = await Promise.all([
      this.prisma.trialAvailabilityRule.findMany(),
      this.prisma.trialAvailabilityWindow.findMany(),
      this.prisma.trialBlockedPeriod.findMany(),
    ]);
    return { rules, windows, blocks };
  }

  /** Upcoming confirmed appointments that `before` covers but `after` does not. */
  async affectedBy(
    before: AvailabilityConfig,
    after: AvailabilityConfig,
  ): Promise<AffectedAppointment[]> {
    const upcoming = await this.prisma.trialLead.findMany({
      where: { appointmentStatus: 'CONFIRMED', startAt: { gt: new Date() } },
      orderBy: { startAt: 'asc' },
    });
    return upcoming
      .filter(
        (a) =>
          isCoveredByAvailability(before, a.startAt as Date) &&
          !isCoveredByAvailability(after, a.startAt as Date),
      )
      .map((a) => ({
        id: a.id,
        reference: bookingReference(a.id),
        parentName: a.parentName,
        childName: a.childName,
        startAt: (a.startAt as Date).toISOString(),
        endAt: (a.endAt as Date).toISOString(),
      }));
  }

  /** Shared guard: refuse (409) unless confirmed; honour dry runs. Returns
   *  true when the caller should stop (dry run). */
  private async guardAffected(
    before: AvailabilityConfig,
    after: AvailabilityConfig,
    opts: MutationOptions,
  ): Promise<{ affected: AffectedAppointment[]; stop: boolean }> {
    const affected = await this.affectedBy(before, after);
    if (opts.dryRun) return { affected, stop: true };
    if (affected.length > 0 && !opts.confirmAffected) {
      throw new ConflictException(
        `${affected.length} upcoming trial appointment(s) would fall outside availability. ` +
          'Review them and confirm the change; the appointments themselves are not cancelled — reschedule or cancel each one explicitly.',
      );
    }
    return { affected, stop: false };
  }

  private async audited(
    actor: Actor,
    action: string,
    entityId: string,
    before: unknown,
    after: unknown,
    affected: AffectedAppointment[],
  ) {
    await this.audit.log({
      actorId: actor.id,
      actorRole: actor.role,
      action,
      entityType: 'TRIAL_AVAILABILITY',
      entityId,
      beforeData: before,
      afterData: {
        ...(after as object),
        affectedAppointmentIds: affected.map((a) => a.id),
      },
    });
  }

  // ─── Weekly rules ─────────────────────────────────────────────────────────

  private ruleData(input: RuleInput) {
    if (
      !Number.isInteger(input.weekday) ||
      input.weekday < 0 ||
      input.weekday > 6
    ) {
      throw new BadRequestException(
        'Weekday must be 0 (Sunday) to 6 (Saturday).',
      );
    }
    const { start, end } = parseRange(input.startTime, input.endTime);
    const effectiveFrom = checkDate(input.effectiveFrom, 'Effective from');
    const effectiveUntil = checkDate(input.effectiveUntil, 'Effective until');
    if (effectiveFrom && effectiveUntil && effectiveUntil < effectiveFrom) {
      throw new BadRequestException(
        'Effective until must not be before effective from.',
      );
    }
    return {
      weekday: input.weekday,
      startMinute: start,
      endMinute: end,
      timezone: TRIAL_TIMEZONE,
      effectiveFrom,
      effectiveUntil,
      note: input.note?.trim() || null,
    };
  }

  async createRule(input: RuleInput, actor: Actor, opts: MutationOptions = {}) {
    const data = this.ruleData(input);
    if (opts.dryRun) return { dryRun: true, affected: [] };
    const rule = await this.prisma.trialAvailabilityRule.create({ data });
    await this.audited(actor, 'TRIAL_RULE_CREATED', rule.id, null, data, []);
    return { rule, affected: [] };
  }

  async updateRule(
    id: string,
    input: RuleInput,
    actor: Actor,
    opts: MutationOptions = {},
  ) {
    const existing = await this.prisma.trialAvailabilityRule.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Availability rule not found.');
    const data = this.ruleData(input);

    const before = await this.currentConfig();
    const after: AvailabilityConfig = {
      ...before,
      rules: before.rules.map((r) => (r.id === id ? { ...r, ...data } : r)),
    };
    const { affected, stop } = await this.guardAffected(before, after, opts);
    if (stop) return { dryRun: true, affected };

    const rule = await this.prisma.trialAvailabilityRule.update({
      where: { id },
      data,
    });
    await this.audited(
      actor,
      'TRIAL_RULE_UPDATED',
      id,
      existing,
      data,
      affected,
    );
    return { rule, affected };
  }

  async deleteRule(id: string, actor: Actor, opts: MutationOptions = {}) {
    const existing = await this.prisma.trialAvailabilityRule.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Availability rule not found.');

    const before = await this.currentConfig();
    const after: AvailabilityConfig = {
      ...before,
      rules: before.rules.filter((r) => r.id !== id),
    };
    const { affected, stop } = await this.guardAffected(before, after, opts);
    if (stop) return { dryRun: true, affected };

    await this.prisma.trialAvailabilityRule.delete({ where: { id } });
    await this.audited(actor, 'TRIAL_RULE_DELETED', id, existing, {}, affected);
    return { deleted: true, affected };
  }

  // ─── One-off windows ──────────────────────────────────────────────────────

  private windowData(input: WindowInput) {
    if (!isValidDateStr(input.date)) {
      throw new BadRequestException('Date must look like 2026-11-05.');
    }
    const { start, end } = parseRange(input.startTime, input.endTime);
    return {
      date: input.date,
      startMinute: start,
      endMinute: end,
      timezone: TRIAL_TIMEZONE,
      note: input.note?.trim() || null,
    };
  }

  async createWindow(
    input: WindowInput,
    actor: Actor,
    opts: MutationOptions = {},
  ) {
    const data = this.windowData(input);
    if (opts.dryRun) return { dryRun: true, affected: [] };
    const window = await this.prisma.trialAvailabilityWindow.create({ data });
    await this.audited(
      actor,
      'TRIAL_WINDOW_CREATED',
      window.id,
      null,
      data,
      [],
    );
    return { window, affected: [] };
  }

  async updateWindow(
    id: string,
    input: WindowInput,
    actor: Actor,
    opts: MutationOptions = {},
  ) {
    const existing = await this.prisma.trialAvailabilityWindow.findUnique({
      where: { id },
    });
    if (!existing)
      throw new NotFoundException('Availability window not found.');
    const data = this.windowData(input);

    const before = await this.currentConfig();
    const after: AvailabilityConfig = {
      ...before,
      windows: before.windows.map((w) => (w.id === id ? { ...w, ...data } : w)),
    };
    const { affected, stop } = await this.guardAffected(before, after, opts);
    if (stop) return { dryRun: true, affected };

    const window = await this.prisma.trialAvailabilityWindow.update({
      where: { id },
      data,
    });
    await this.audited(
      actor,
      'TRIAL_WINDOW_UPDATED',
      id,
      existing,
      data,
      affected,
    );
    return { window, affected };
  }

  async deleteWindow(id: string, actor: Actor, opts: MutationOptions = {}) {
    const existing = await this.prisma.trialAvailabilityWindow.findUnique({
      where: { id },
    });
    if (!existing)
      throw new NotFoundException('Availability window not found.');

    const before = await this.currentConfig();
    const after: AvailabilityConfig = {
      ...before,
      windows: before.windows.filter((w) => w.id !== id),
    };
    const { affected, stop } = await this.guardAffected(before, after, opts);
    if (stop) return { dryRun: true, affected };

    await this.prisma.trialAvailabilityWindow.delete({ where: { id } });
    await this.audited(
      actor,
      'TRIAL_WINDOW_DELETED',
      id,
      existing,
      {},
      affected,
    );
    return { deleted: true, affected };
  }

  // ─── Blocked periods ──────────────────────────────────────────────────────

  private blockData(input: BlockInput) {
    if (!isValidDateStr(input.startDate) || !isValidDateStr(input.endDate)) {
      throw new BadRequestException('Dates must look like 2026-11-05.');
    }
    if (input.endDate < input.startDate) {
      throw new BadRequestException(
        'The end date must not be before the start date.',
      );
    }
    const hasStart = input.startTime != null && input.startTime !== '';
    const hasEnd = input.endTime != null && input.endTime !== '';
    if (hasStart !== hasEnd) {
      throw new BadRequestException(
        'Give both a start and an end time to block part of a day, or neither to block the whole day.',
      );
    }
    let startMinute: number | null = null;
    let endMinute: number | null = null;
    if (hasStart && hasEnd) {
      const s = parseTimeOfDay(input.startTime);
      const e = parseTimeOfDay(input.endTime);
      if (s === null || e === null || e <= s) {
        throw new BadRequestException(
          'Block times must look like 15:00 and end after they start.',
        );
      }
      startMinute = s;
      endMinute = e;
    }
    const reason = input.reason?.trim();
    if (!reason) throw new BadRequestException('A reason is required.');
    return {
      startDate: input.startDate,
      endDate: input.endDate,
      startMinute,
      endMinute,
      reason,
    };
  }

  async createBlock(
    input: BlockInput,
    actor: Actor,
    opts: MutationOptions = {},
  ) {
    const data = this.blockData(input);
    const before = await this.currentConfig();
    const after: AvailabilityConfig = {
      ...before,
      blocks: [...before.blocks, data],
    };
    const { affected, stop } = await this.guardAffected(before, after, opts);
    if (stop) return { dryRun: true, affected };

    const block = await this.prisma.trialBlockedPeriod.create({ data });
    await this.audited(
      actor,
      'TRIAL_BLOCK_CREATED',
      block.id,
      null,
      data,
      affected,
    );
    return { block, affected };
  }

  async updateBlock(
    id: string,
    input: BlockInput,
    actor: Actor,
    opts: MutationOptions = {},
  ) {
    const existing = await this.prisma.trialBlockedPeriod.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Blocked period not found.');
    const data = this.blockData(input);

    const before = await this.currentConfig();
    const after: AvailabilityConfig = {
      ...before,
      blocks: before.blocks.map((b) => (b.id === id ? { ...b, ...data } : b)),
    };
    const { affected, stop } = await this.guardAffected(before, after, opts);
    if (stop) return { dryRun: true, affected };

    const block = await this.prisma.trialBlockedPeriod.update({
      where: { id },
      data,
    });
    await this.audited(
      actor,
      'TRIAL_BLOCK_UPDATED',
      id,
      existing,
      data,
      affected,
    );
    return { block, affected };
  }

  async deleteBlock(id: string, actor: Actor, opts: MutationOptions = {}) {
    const existing = await this.prisma.trialBlockedPeriod.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Blocked period not found.');
    // Removing a block only ever adds availability — nothing can be stranded.
    if (opts.dryRun) return { dryRun: true, affected: [] };
    await this.prisma.trialBlockedPeriod.delete({ where: { id } });
    await this.audited(actor, 'TRIAL_BLOCK_DELETED', id, existing, {}, []);
    return { deleted: true, affected: [] };
  }
}
