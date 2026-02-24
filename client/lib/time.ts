/**
 * Formats a UTC date string into the user's local timezone.
 * Always shows the timezone abbreviation so users are never confused about
 * whether a time is in their timezone or the server's.
 *
 * Example output: "Sat, Mar 15 · 3:00 PM EST"
 */
export function formatShiftTime(utcDateString: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(utcDateString));
}

/**
 * Formats just the time portion with timezone abbreviation.
 * Used for the start/end time display within a shift row.
 *
 * Example output: "3:00 PM EST"
 */
export function formatTime(utcDateString: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(utcDateString));
}

/**
 * Formats just the date without time.
 *
 * Example output: "Sat, Mar 15"
 */
export function formatDate(utcDateString: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(utcDateString));
}

/**
 * Returns a human-readable countdown like "in 2 hours" or "in 3 days".
 * Useful for showing how far away a class is.
 */
export function formatRelativeTime(utcDateString: string): string {
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const diffMs = new Date(utcDateString).getTime() - Date.now();
  const diffMins = Math.round(diffMs / (1000 * 60));
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (Math.abs(diffMins) < 60) return rtf.format(diffMins, "minute");
  if (Math.abs(diffHours) < 24) return rtf.format(diffHours, "hour");
  return rtf.format(diffDays, "day");
}

/**
 * Checks if a class is joinable right now.
 * Window: 10 minutes before start until the class ends.
 */
export function isClassJoinable(startUtc: string, endUtc: string): boolean {
  const now = Date.now();
  const start = new Date(startUtc).getTime();
  const end = new Date(endUtc).getTime();
  const joinWindowStart = start - 10 * 60 * 1000; // 10 min early
  return now >= joinWindowStart && now <= end;
}
