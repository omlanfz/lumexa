// FILE PATH: server/src/trial/trial-slots.util.ts
//
// The trial slot engine: pure functions, no database, no clock of its own.
// Everything the booking service, the public availability endpoint, the admin
// preview and the "which appointments does this edit affect?" check need is
// derived from the same few functions here, so the rules cannot disagree.
//
// Vocabulary
//   • A "minute" is minutes after local (Asia/Dhaka) midnight, 0..1440.
//   • A "date" is a Dhaka calendar date, 'YYYY-MM-DD'.
//   • A slot is identified by its UTC start instant; it lasts 30 minutes.
//
// Rules implemented
//   1. Start times are on the half hour, and the WHOLE 30-minute session must
//      fit inside an availability window (a 14:00–20:00 window's last start
//      is 19:30).
//   2. Overlapping windows never produce duplicate slots.
//   3. Blocked periods remove any slot whose session overlaps them.
//   4. Two booked starts must be >= 60 minutes apart (30 min session + 30 min
//      gap); exactly 60 is fine, 30 is not.
//   5. Slots in the past, or closer than the minimum notice, are never offered.

import {
  TRIAL_DURATION_MINUTES,
  TRIAL_MIN_START_SPACING_MINUTES,
  TRIAL_SLOT_STEP_MINUTES,
} from './trial.constants';
import {
  addDaysToDateStr,
  dhakaToUtc,
  utcToDhakaParts,
  weekdayForDateStr,
} from '../scheduling/dhaka-time.util';

const MINUTE_MS = 60_000;

export interface RuleLike {
  id?: string;
  weekday: number;
  startMinute: number;
  endMinute: number;
  effectiveFrom?: string | null;
  effectiveUntil?: string | null;
}
export interface WindowLike {
  id?: string;
  date: string;
  startMinute: number;
  endMinute: number;
}
export interface BlockLike {
  id?: string;
  startDate: string;
  endDate: string;
  startMinute?: number | null;
  endMinute?: number | null;
}
export interface AvailabilityConfig {
  rules: RuleLike[];
  windows: WindowLike[];
  blocks: BlockLike[];
}
export interface MinuteRange {
  start: number;
  end: number;
}

export type DayStatus = 'available' | 'full' | 'unavailable';

export function minutesOfDayDhaka(instant: Date): number {
  const { time } = utcToDhakaParts(instant);
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function isValidDateStr(s: unknown): s is string {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

/** Inclusive list of 'YYYY-MM-DD' dates from..to. */
export function eachDate(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDaysToDateStr(d, 1)) out.push(d);
  return out;
}

/** The availability ranges (in minutes) that apply on one Dhaka date: matching
 *  weekly rules whose effective range covers the date, plus that date's
 *  one-off windows. May contain overlapping ranges — callers dedupe by start. */
export function windowsForDate(
  cfg: AvailabilityConfig,
  date: string,
): MinuteRange[] {
  const weekday = weekdayForDateStr(date);
  const out: MinuteRange[] = [];
  for (const r of cfg.rules) {
    if (r.weekday !== weekday) continue;
    if (r.effectiveFrom && date < r.effectiveFrom) continue;
    if (r.effectiveUntil && date > r.effectiveUntil) continue;
    out.push({ start: r.startMinute, end: r.endMinute });
  }
  for (const w of cfg.windows) {
    if (w.date === date) out.push({ start: w.startMinute, end: w.endMinute });
  }
  return out;
}

/** Blocked ranges (in minutes) on one Dhaka date. A block with no times
 *  blocks the whole day. */
export function blockedRangesForDate(
  cfg: AvailabilityConfig,
  date: string,
): MinuteRange[] {
  const out: MinuteRange[] = [];
  for (const b of cfg.blocks) {
    if (date < b.startDate || date > b.endDate) continue;
    if (b.startMinute == null || b.endMinute == null) {
      out.push({ start: 0, end: 1440 });
    } else {
      out.push({ start: b.startMinute, end: b.endMinute });
    }
  }
  return out;
}

/** Candidate start minutes for a date: every half-hour step whose full
 *  30-minute session fits inside some window and clear of every block.
 *  Sorted ascending, no duplicates. */
export function candidateStartMinutes(
  cfg: AvailabilityConfig,
  date: string,
): number[] {
  const blocked = blockedRangesForDate(cfg, date);
  const starts = new Set<number>();
  for (const w of windowsForDate(cfg, date)) {
    // Align to the half-hour grid even if a window was stored off-grid.
    const first =
      Math.ceil(w.start / TRIAL_SLOT_STEP_MINUTES) * TRIAL_SLOT_STEP_MINUTES;
    for (
      let s = first;
      s + TRIAL_DURATION_MINUTES <= w.end;
      s += TRIAL_SLOT_STEP_MINUTES
    ) {
      const sessionEnd = s + TRIAL_DURATION_MINUTES;
      const hitsBlock = blocked.some((b) => s < b.end && sessionEnd > b.start);
      if (!hitsBlock) starts.add(s);
    }
  }
  return [...starts].sort((a, b) => a - b);
}

/** Is this exact start instant inside the configured availability (ignoring
 *  bookings and the clock)? Used to validate submissions and to find
 *  appointments that an availability edit would strand. */
export function isCoveredByAvailability(
  cfg: AvailabilityConfig,
  start: Date,
): boolean {
  const { dateStr } = utcToDhakaParts(start);
  const minute = minutesOfDayDhaka(start);
  return candidateStartMinutes(cfg, dateStr).includes(minute);
}

/** True when `candidate` is too close to any booked start (< 60 minutes). */
export function conflictsWithBooked(candidate: Date, booked: Date[]): boolean {
  const limit = TRIAL_MIN_START_SPACING_MINUTES * MINUTE_MS;
  return booked.some(
    (b) => Math.abs(b.getTime() - candidate.getTime()) < limit,
  );
}

/** Earliest instant a slot may start at. */
export function earliestBookableStart(
  now: Date,
  minNoticeMinutes: number,
): Date {
  return new Date(now.getTime() + minNoticeMinutes * MINUTE_MS);
}

/** The bookable slot start instants (UTC) for one Dhaka date. */
export interface SlotQuery {
  cfg: AvailabilityConfig;
  date: string;
  bookedStarts: Date[];
  now: Date;
  minNoticeMinutes: number;
  /** How many days ahead may be booked (see TRIAL_BOOKING_HORIZON_DAYS). */
  horizonDays: number;
}

export function latestBookableStart(now: Date, horizonDays: number): Date {
  return new Date(now.getTime() + horizonDays * 24 * 60 * MINUTE_MS);
}

export function generateSlotsForDate(params: SlotQuery): Date[] {
  const { cfg, date, bookedStarts, now, minNoticeMinutes, horizonDays } =
    params;
  const earliest = earliestBookableStart(now, minNoticeMinutes).getTime();
  const latest = latestBookableStart(now, horizonDays).getTime();
  const slots: Date[] = [];
  for (const minute of candidateStartMinutes(cfg, date)) {
    const start = dhakaToUtc(date, Math.floor(minute / 60), minute % 60);
    if (start.getTime() < earliest || start.getTime() > latest) continue;
    if (conflictsWithBooked(start, bookedStarts)) continue;
    slots.push(start);
  }
  return slots;
}

/** Day status for the parent calendar: 'available' (≥1 slot), 'full' (the day
 *  has availability but nothing left to book) or 'unavailable'. */
export function dayStatus(params: SlotQuery): {
  status: DayStatus;
  slots: Date[];
} {
  const slots = generateSlotsForDate(params);
  if (slots.length > 0) return { status: 'available', slots };

  // Distinguish "fully booked" from "nothing offered": did a not-yet-past
  // candidate exist that only bookings (or the notice period) ruled out?
  const earliest = earliestBookableStart(
    params.now,
    params.minNoticeMinutes,
  ).getTime();
  const latest = latestBookableStart(params.now, params.horizonDays).getTime();
  const hadFutureCandidate = candidateStartMinutes(
    params.cfg,
    params.date,
  ).some((minute) => {
    const t = dhakaToUtc(
      params.date,
      Math.floor(minute / 60),
      minute % 60,
    ).getTime();
    return t >= earliest && t <= latest;
  });
  return { status: hadFutureCandidate ? 'full' : 'unavailable', slots: [] };
}

/** Why a requested start cannot be booked, or null when it can. Mirrors the
 *  checks the booking service runs inside its transaction. */
export type SlotRejection =
  | 'NOT_ON_SLOT_GRID'
  | 'IN_THE_PAST'
  | 'TOO_SOON'
  | 'TOO_FAR_AHEAD'
  | 'OUTSIDE_AVAILABILITY'
  | 'CONFLICTS_WITH_BOOKING';

export function rejectionForSlot(params: {
  cfg: AvailabilityConfig;
  start: Date;
  bookedStarts: Date[];
  now: Date;
  minNoticeMinutes: number;
  horizonDays: number;
}): SlotRejection | null {
  const { cfg, start, bookedStarts, now, minNoticeMinutes, horizonDays } =
    params;
  if (Number.isNaN(start.getTime())) return 'NOT_ON_SLOT_GRID';
  if (
    start.getUTCSeconds() !== 0 ||
    start.getUTCMilliseconds() !== 0 ||
    minutesOfDayDhaka(start) % TRIAL_SLOT_STEP_MINUTES !== 0
  ) {
    return 'NOT_ON_SLOT_GRID';
  }
  if (start.getTime() <= now.getTime()) return 'IN_THE_PAST';
  if (
    start.getTime() < earliestBookableStart(now, minNoticeMinutes).getTime()
  ) {
    return 'TOO_SOON';
  }
  if (start.getTime() > latestBookableStart(now, horizonDays).getTime()) {
    return 'TOO_FAR_AHEAD';
  }
  if (!isCoveredByAvailability(cfg, start)) return 'OUTSIDE_AVAILABILITY';
  if (conflictsWithBooked(start, bookedStarts)) return 'CONFLICTS_WITH_BOOKING';
  return null;
}

/** Human message for a rejection — shown to parents/admins. */
export function rejectionMessage(r: SlotRejection): string {
  switch (r) {
    case 'NOT_ON_SLOT_GRID':
      return 'Trial times start on the hour or half hour. Please pick a time from the list.';
    case 'IN_THE_PAST':
      return 'That time has already passed. Please pick a future time.';
    case 'TOO_SOON':
      return 'That time is too soon to arrange. Please pick a later time.';
    case 'TOO_FAR_AHEAD':
      return 'That date is too far ahead to book yet. Please pick an earlier date.';
    case 'OUTSIDE_AVAILABILITY':
      return 'That time is not available for trial classes. Please pick another time.';
    case 'CONFLICTS_WITH_BOOKING':
      return 'Sorry, that time was just taken by another family. Please pick another time.';
  }
}

// ─── Time-of-day helpers (admin forms speak "15:30", the DB speaks minutes) ──

/** "15:30" → 930. Accepts "24:00" (end of day). Returns null when malformed. */
export function parseTimeOfDay(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (min > 59 || h > 24 || (h === 24 && min !== 0)) return null;
  return h * 60 + min;
}

/** 930 → "15:30"; 1440 → "24:00". */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
