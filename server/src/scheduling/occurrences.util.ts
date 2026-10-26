// FILE PATH: server/src/scheduling/occurrences.util.ts
//
// Turns a weekly pattern into the concrete class dates it produces. Shared by
// the per-student (1:1) schedule and by batches, which have their own weekly
// slots — one definition of "the next N classes of this pattern".

import { addDaysToDateStr, weekdayForDateStr } from './dhaka-time.util';

/** A guard against an impossible/empty slot configuration. */
export const MAX_OCCURRENCE_SCAN_DAYS = 365 * 4;

export interface WeeklySlot {
  /** 0 = Sunday .. 6 = Saturday (Asia/Dhaka calendar day). */
  weekday: number;
  /** 'HH:mm' in Asia/Dhaka local time. */
  time: string;
}

export interface Occurrence {
  /** 'YYYY-MM-DD', an Asia/Dhaka calendar date. */
  dateStr: string;
  hour: number;
  minute: number;
}

/** The first `count` occurrences of the weekly `slots`, starting on
 * `firstDateStr` (inclusive). Several times on one weekday are kept, in time
 * order. */
export function generateOccurrences(
  firstDateStr: string,
  slots: WeeklySlot[],
  count: number,
): Occurrence[] {
  const byWeekday = new Map<number, { hour: number; minute: number }[]>();
  for (const s of slots) {
    const [hh, mm] = s.time.split(':').map(Number);
    const list = byWeekday.get(s.weekday) ?? [];
    list.push({ hour: hh, minute: mm });
    byWeekday.set(s.weekday, list);
  }
  for (const list of byWeekday.values()) {
    list.sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute));
  }

  const results: Occurrence[] = [];
  let cursor = firstDateStr;
  let scanned = 0;

  while (results.length < count && scanned < MAX_OCCURRENCE_SCAN_DAYS) {
    const weekday = weekdayForDateStr(cursor);
    const times = byWeekday.get(weekday);
    if (times) {
      for (const t of times) {
        if (results.length >= count) break;
        results.push({ dateStr: cursor, hour: t.hour, minute: t.minute });
      }
    }
    cursor = addDaysToDateStr(cursor, 1);
    scanned++;
  }

  return results;
}

/** 'HH:mm' for a stored hour/minute pair. */
export function formatSlotTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}
