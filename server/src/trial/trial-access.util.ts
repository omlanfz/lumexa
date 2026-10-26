// FILE PATH: server/src/trial/trial-access.util.ts
//
// Who may enter a trial classroom, and when. Pure functions of the stored
// appointment and the clock — no database, no provider — so every rule is unit
// tested and the guest page, the guest join endpoint and the teacher's join all
// share one answer.
//
// A guest link grants entry only if ALL of these hold:
//   • the token belongs to a trial (looked up by the caller),
//   • the appointment is CONFIRMED (cancelled / completed / missed grant nothing),
//   • a teacher is assigned (the link is never sent before that),
//   • "now" is inside [start − 10 min, end + 30 min].

import {
  TRIAL_JOIN_CLOSES_AFTER_END_MINUTES,
  TRIAL_JOIN_OPENS_BEFORE_MINUTES,
  TRIAL_REMINDER_LEAD_MINUTES,
} from './trial.constants';

const MINUTE_MS = 60_000;

export interface AccessLead {
  appointmentStatus: string | null;
  startAt: Date | null;
  endAt: Date | null;
  teacherId: string | null;
}

export type TrialAccessState =
  /** Inside the joining window of a confirmed, staffed trial. */
  | 'OPEN'
  /** Confirmed and staffed, but the room is not open yet. */
  | 'NOT_YET'
  /** The window has closed (or the class already took place). */
  | 'ENDED'
  | 'CANCELLED'
  /** Confirmed, but no teacher yet — nothing to join. */
  | 'AWAITING_TEACHER';

export function joinWindow(
  start: Date,
  end: Date,
): { opensAt: Date; closesAt: Date } {
  return {
    opensAt: new Date(
      start.getTime() - TRIAL_JOIN_OPENS_BEFORE_MINUTES * MINUTE_MS,
    ),
    closesAt: new Date(
      end.getTime() + TRIAL_JOIN_CLOSES_AFTER_END_MINUTES * MINUTE_MS,
    ),
  };
}

export function trialAccessState(
  lead: AccessLead,
  now = new Date(),
): TrialAccessState {
  if (lead.appointmentStatus === 'CANCELLED') return 'CANCELLED';
  if (lead.appointmentStatus !== 'CONFIRMED' || !lead.startAt || !lead.endAt) {
    return 'ENDED';
  }
  if (!lead.teacherId) return 'AWAITING_TEACHER';
  const { opensAt, closesAt } = joinWindow(lead.startAt, lead.endAt);
  if (now.getTime() < opensAt.getTime()) return 'NOT_YET';
  if (now.getTime() > closesAt.getTime()) return 'ENDED';
  return 'OPEN';
}

/** Parent-facing explanation for a state that does not let them in. */
export const GUEST_STATE_MESSAGE: Record<
  Exclude<TrialAccessState, 'OPEN'>,
  string
> = {
  NOT_YET:
    'The classroom opens 10 minutes before your trial class starts. Please come back then.',
  ENDED:
    'This trial class has already taken place, so this link is no longer active.',
  CANCELLED:
    'This trial class has been cancelled, so this link is no longer active.',
  AWAITING_TEACHER:
    'Your trial time is reserved. We are still confirming your teacher and will send the joining link as soon as it is ready.',
};

/**
 * When the one-hour reminder is due for a class starting at `start`, planned at
 * `now`. Null when there is no useful reminder to schedule — the start is less
 * than an hour away, so the link that is sent right away IS the reminder and a
 * second, near-identical message would only be noise.
 */
export function reminderDueAt(start: Date, now: Date): Date | null {
  const due = new Date(
    start.getTime() - TRIAL_REMINDER_LEAD_MINUTES * MINUTE_MS,
  );
  return due.getTime() > now.getTime() ? due : null;
}

/** A guest token is 43 base64url chars (32 random bytes), or 64 hex chars for
 *  rows minted by the migration. Anything else is rejected before a lookup. */
export function isWellFormedGuestToken(token: unknown): token is string {
  return typeof token === 'string' && /^[A-Za-z0-9_-]{32,128}$/.test(token);
}
