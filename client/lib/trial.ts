// Shared constants + helpers for the public trial booking page.
// The numbers below must match server/src/trial/trial.constants.ts.

export const TRIAL_MIN_AGE = 6;
export const TRIAL_MAX_AGE = 18;
export const TRIAL_DURATION_MINUTES = 30;
export const TRIAL_TIMEZONE = "Asia/Dhaka";
export const TRIAL_TIMEZONE_LABEL = "Bangladesh Time (GMT+6)";

export type DayStatus = "available" | "full" | "unavailable";

export interface AvailabilityDay {
  date: string; // 'YYYY-MM-DD' (Bangladesh calendar date)
  status: DayStatus;
  slots: string[]; // ISO UTC start instants
}

export interface AvailabilityResponse {
  timezone: string;
  timezoneLabel: string;
  durationMinutes: number;
  bufferMinutes: number;
  from: string;
  to: string;
  minDate: string;
  maxDate: string;
  generatedAt: string;
  days: AvailabilityDay[];
}

export interface PublicBooking {
  reference: string;
  startAt: string;
  endAt: string;
  timezone: string;
  timezoneLabel: string;
  durationMinutes: number;
  childName: string;
  program: string;
}

const dhaka = (opts: Intl.DateTimeFormatOptions, d: Date) =>
  new Intl.DateTimeFormat("en-US", { timeZone: TRIAL_TIMEZONE, ...opts }).format(d);

/** "4:00 PM" in Bangladesh time. */
export function formatDhakaTime(iso: string): string {
  return dhaka({ hour: "numeric", minute: "2-digit", hour12: true }, new Date(iso));
}

/** "Wednesday, 4 November 2026" in Bangladesh time. */
export function formatDhakaLongDate(iso: string): string {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TRIAL_TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("weekday")}, ${get("day")} ${get("month")} ${get("year")}`;
}

/** The viewer's own IANA zone, or null when it's the same wall clock as Dhaka. */
export function viewerTimeZone(): string | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz || tz === TRIAL_TIMEZONE) return null;
    return tz;
  } catch {
    return null;
  }
}

/** "10:00 AM" in the viewer's zone, or null when no conversion is useful. */
export function formatViewerRange(startIso: string, endIso: string): { text: string; zone: string } | null {
  const zone = viewerTimeZone();
  if (!zone) return null;
  const fmt = (iso: string, o: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-US", { timeZone: zone, ...o }).format(new Date(iso));
  const time = (iso: string) => fmt(iso, { hour: "numeric", minute: "2-digit", hour12: true });
  const day = fmt(startIso, { weekday: "short", day: "numeric", month: "short" });
  const bdDay = dhaka({ weekday: "short", day: "numeric", month: "short" }, new Date(startIso));
  // Same wall clock as Dhaka (e.g. a zone that is also UTC+6)? Nothing to add.
  if (time(startIso) === formatDhakaTime(startIso) && day === bdDay) return null;
  return { text: `${day}, ${time(startIso)} – ${time(endIso)}`, zone };
}

/** Today's date in Bangladesh as 'YYYY-MM-DD'. */
export function todayDhakaDateStr(): string {
  return new Date(Date.now() + 6 * 60 * 60_000).toISOString().slice(0, 10);
}

export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** First/last 'YYYY-MM-DD' of a 'YYYY-MM' month. */
export function monthBounds(month: string): { first: string; last: string } {
  const [y, m] = month.split("-").map(Number);
  const first = `${month}-01`;
  const last = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  return { first, last };
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", year: "numeric" }).format(
    new Date(Date.UTC(y, m - 1, 1)),
  );
}

/** Weekday index (0=Sunday) of a 'YYYY-MM-DD' calendar date. */
export function weekdayOf(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** "Wednesday 4 November" for a calendar date. */
export function longDayLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  })
    .format(new Date(Date.UTC(y, m - 1, d)))
    .replace(",", "");
}

export function apiErrorMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string | string[] } } };
  const msg = e?.response?.data?.message;
  if (Array.isArray(msg)) return msg.join(" ");
  return msg ?? fallback;
}
