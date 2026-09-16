// FILE PATH: server/src/scheduling/lesson-window.util.ts
//
// A single source of truth for "is this scheduled class live right now" and
// "how late did the teacher join" — used by the classroom join flow and by
// the student/teacher dashboards, so a class is never live in one place and
// not-yet-started in another. Always derives from the class's own
// start/end instants — never a separately tracked "is live" flag that could
// drift out of sync with the actual schedule.

export const JOIN_WINDOW_MS = 10 * 60 * 1000; // classroom opens 10 min early

export interface ClassWindow {
  /** now is between start and end (inclusive). */
  isLive: boolean;
  /** now is at or after end. */
  hasEnded: boolean;
  /** now is within the join window (10 min before start) through end —
   *  i.e. the classroom endpoint would currently accept a join. */
  joinable: boolean;
  msUntilStart: number;
  msUntilEnd: number;
}

export function getClassWindow(
  start: Date,
  end: Date,
  now: Date = new Date(),
): ClassWindow {
  const nowMs = now.getTime();
  const startMs = start.getTime();
  const endMs = end.getTime();

  const isLive = nowMs >= startMs && nowMs <= endMs;
  const hasEnded = nowMs > endMs;
  const joinable = nowMs >= startMs - JOIN_WINDOW_MS && nowMs <= endMs;

  return {
    isLive,
    hasEnded,
    joinable,
    msUntilStart: startMs - nowMs,
    msUntilEnd: endMs - nowMs,
  };
}

/** Minutes late a participant joined relative to the scheduled start — 0 if
 * they joined at or before start. Never negative. */
export function computeLateMinutes(scheduledStart: Date, joinedAt: Date): number {
  return Math.max(
    0,
    Math.round((joinedAt.getTime() - scheduledStart.getTime()) / 60_000),
  );
}
