// FILE PATH: client/lib/liveClass.ts
//
// When a class is "upcoming", "joinable" or "live", worked out on the client
// from the class's own start/end instants — the same rule the server applies
// (see server/src/scheduling/lesson-window.util.ts) — so a dashboard card can
// change state the moment the time comes, without a reload.
//
// Two things keep it honest:
//   - Time zones do not matter: start/end are absolute instants (ISO strings in
//     UTC), compared with epoch milliseconds, never with local clock fields.
//   - A wrong device clock does not matter: the server also says how far the
//     start is from ITS "now" (msUntilStart). The difference between that and
//     this device's clock, measured when the answer arrived, is applied to every
//     later reading (the "skew"), so a laptop five minutes fast still flips at
//     the server's moment.
// The card still re-asks the server whenever its state changes (see
// useLiveClass) — this file decides what to show in between, the server stays
// the authority on whether the class exists, was cancelled or has ended.

/** The classroom opens this long before the scheduled start. */
export const JOIN_WINDOW_MS = 10 * 60 * 1000;

/** The part of a server answer this needs. */
export interface ClassTiming {
  /** ISO instant. */
  start: string;
  /** ISO instant. */
  end: string;
  /** Milliseconds from the server's "now" to `start` when it answered (negative once started). */
  msUntilStart?: number;
}

export type ClassPhase = 'upcoming' | 'live' | 'ended';

export interface ClassState {
  phase: ClassPhase;
  /** The scheduled start has passed. (Stays true until the server drops the class.) */
  isLive: boolean;
  /** The classroom is open: from 10 minutes before the start until the end. */
  joinable: boolean;
  /** Milliseconds until the start (0 once started). */
  startsInMs: number;
  /** Milliseconds since the start (0 before it). */
  elapsedMs: number;
}

/**
 * serverNow − deviceNow, from one server answer. 0 when the server did not say
 * (`msUntilStart` missing) — the device clock is then trusted as it is.
 */
export function clockSkewMs(timing: ClassTiming, receivedAtMs: number): number {
  const start = Date.parse(timing.start);
  if (typeof timing.msUntilStart !== 'number' || Number.isNaN(start)) return 0;
  return start - timing.msUntilStart - receivedAtMs;
}

export function classState(timing: ClassTiming, nowMs: number): ClassState {
  const start = Date.parse(timing.start);
  const end = Date.parse(timing.end);
  const startsInMs = Math.max(0, start - nowMs);
  const elapsedMs = Math.max(0, nowMs - start);
  const started = nowMs >= start;
  const ended = nowMs > end;
  return {
    phase: ended ? 'ended' : started ? 'live' : 'upcoming',
    isLive: started,
    joinable: nowMs >= start - JOIN_WINDOW_MS,
    startsInMs,
    elapsedMs,
  };
}

/** A short key that changes exactly when what the card shows changes state —
 * the cue to ask the server again. */
export function stateKey(state: ClassState): string {
  return `${state.phase}:${state.isLive ? 'L' : '-'}:${state.joinable ? 'J' : '-'}`;
}

/**
 * Milliseconds until the next display tick: the next whole second of the timer
 * (counted from the start), so the digits change on the beat, never half a
 * second late. Always between 1 and 1000.
 */
export function msToNextTick(timing: ClassTiming, nowMs: number): number {
  const start = Date.parse(timing.start);
  const into = (((nowMs - start) % 1000) + 1000) % 1000;
  return Math.max(1, 1000 - into);
}

/** h/m/s parts of a duration, never negative. */
export function splitDuration(ms: number): { hours: number; minutes: number; seconds: number } {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    hours: Math.floor(total / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}
