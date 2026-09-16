// FILE PATH: server/src/scheduling/dhaka-time.util.ts
//
// Bangladesh Standard Time is a fixed UTC+6 offset with no DST, so all the
// "Asia/Dhaka" math the scheduling system needs reduces to plain arithmetic
// on Date.UTC — no timezone library required. A "date string" here is always
// a calendar date in Dhaka local time, formatted 'YYYY-MM-DD'.

export const DHAKA_OFFSET_MINUTES = 6 * 60;

export const WEEKDAY_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/** Parses a 'YYYY-MM-DD' string into its numeric parts. */
export function parseDateStr(dateStr: string): {
  y: number;
  m: number;
  d: number;
} {
  const [y, m, d] = dateStr.split('-').map(Number);
  return { y, m, d };
}

/** The weekday (0=Sunday..6=Saturday) of a Dhaka calendar date. Pure
 * calendar-date arithmetic — never touches the local process timezone. */
export function weekdayForDateStr(dateStr: string): number {
  const { y, m, d } = parseDateStr(dateStr);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Adds `days` (may be negative) to a 'YYYY-MM-DD' Dhaka calendar date. */
export function addDaysToDateStr(dateStr: string, days: number): string {
  const { y, m, d } = parseDateStr(dateStr);
  const next = new Date(Date.UTC(y, m - 1, d + days));
  return next.toISOString().slice(0, 10);
}

/** Converts a Dhaka local date + hour + minute into the equivalent UTC
 * instant. */
export function dhakaToUtc(
  dateStr: string,
  hour: number,
  minute: number,
): Date {
  const { y, m, d } = parseDateStr(dateStr);
  const utcMs = Date.UTC(y, m - 1, d, hour, minute) - DHAKA_OFFSET_MINUTES * 60_000;
  return new Date(utcMs);
}

/** Today's calendar date in Asia/Dhaka, as 'YYYY-MM-DD'. */
export function todayDhakaDateStr(): string {
  const shifted = new Date(Date.now() + DHAKA_OFFSET_MINUTES * 60_000);
  return shifted.toISOString().slice(0, 10);
}

/** Formats a UTC instant as its Asia/Dhaka 'YYYY-MM-DD' calendar date and
 * 'HH:mm' local time — used for display/debug, never for storage. */
export function utcToDhakaParts(date: Date): {
  dateStr: string;
  time: string;
  weekday: number;
} {
  const shifted = new Date(date.getTime() + DHAKA_OFFSET_MINUTES * 60_000);
  const dateStr = shifted.toISOString().slice(0, 10);
  const hh = String(shifted.getUTCHours()).padStart(2, '0');
  const mm = String(shifted.getUTCMinutes()).padStart(2, '0');
  return { dateStr, time: `${hh}:${mm}`, weekday: shifted.getUTCDay() };
}
