// FILE PATH: server/src/trial/trial-format.util.ts
//
// Date/time wording for trial emails, WhatsApp variables and admin payloads.
// Built from Intl *parts* rather than Intl's pre-formatted strings, because
// the exact punctuation/whitespace of those strings (e.g. the narrow
// no-break space before "PM") differs between ICU versions — and a WhatsApp
// template variable or a test must not depend on that.

import {
  TRIAL_DURATION_MINUTES,
  TRIAL_TIMEZONE,
  TRIAL_TIMEZONE_LABEL,
} from './trial.constants';

const MINUTE_MS = 60_000;

function partsIn(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hourCycle: 'h12',
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return {
    weekday: get('weekday'),
    day: get('day'),
    month: get('month'),
    year: get('year'),
    hour: get('hour'),
    minute: get('minute'),
    dayPeriod: get('dayPeriod').toUpperCase(),
  };
}

/** "Wednesday, 29 October 2026" */
export function formatTrialDate(date: Date, timeZone = TRIAL_TIMEZONE): string {
  const p = partsIn(date, timeZone);
  return `${p.weekday}, ${p.day} ${p.month} ${p.year}`;
}

/** "4:00 PM" */
export function formatTrialTime(date: Date, timeZone = TRIAL_TIMEZONE): string {
  const p = partsIn(date, timeZone);
  return `${p.hour}:${p.minute} ${p.dayPeriod}`;
}

/** "4:00 PM – 4:30 PM" */
export function formatTrialTimeRange(
  start: Date,
  end: Date,
  timeZone = TRIAL_TIMEZONE,
): string {
  return `${formatTrialTime(start, timeZone)} – ${formatTrialTime(end, timeZone)}`;
}

/** "30 minutes" */
export function formatTrialDuration(): string {
  return `${TRIAL_DURATION_MINUTES} minutes`;
}

export function trialEnd(start: Date): Date {
  return new Date(start.getTime() + TRIAL_DURATION_MINUTES * MINUTE_MS);
}

/** True for a usable IANA zone name (the parent's browser timezone is
 *  free text from the client, so never trust it blindly). */
export function isValidTimeZone(tz: string | null | undefined): tz is string {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Everything a notification needs to describe an appointment, Dhaka-first
 *  with an optional "your local time" line for parents abroad. */
export function describeAppointment(
  start: Date,
  end: Date,
  parentTimeZone?: string | null,
) {
  const dhaka = {
    date: formatTrialDate(start),
    timeRange: formatTrialTimeRange(start, end),
    time: formatTrialTime(start),
    timezoneLabel: TRIAL_TIMEZONE_LABEL,
  };
  let local: { date: string; timeRange: string; timeZone: string } | null =
    null;
  if (
    isValidTimeZone(parentTimeZone) &&
    parentTimeZone !== TRIAL_TIMEZONE &&
    // Skip zones that are the same wall-clock as Dhaka (e.g. Asia/Almaty is
    // UTC+5/+6 — only show a line when it actually differs).
    formatTrialTimeRange(start, end, parentTimeZone) !== dhaka.timeRange
  ) {
    local = {
      date: formatTrialDate(start, parentTimeZone),
      timeRange: formatTrialTimeRange(start, end, parentTimeZone),
      timeZone: parentTimeZone,
    };
  }
  return { dhaka, local, duration: formatTrialDuration() };
}
