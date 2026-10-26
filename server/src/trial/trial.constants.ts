// FILE PATH: server/src/trial/trial.constants.ts
//
// Every number the trial booking rules depend on lives here so the slot
// engine, the services, the DTOs and the tests can never drift apart.
// If TRIAL_DURATION/BUFFER change, the "TrialLead_no_overlapping_slots"
// exclusion constraint in the 20261023000000 migration must change with them.

export const TRIAL_DURATION_MINUTES = 30;
export const TRIAL_BUFFER_MINUTES = 30;
/** Two CONFIRMED trials must start at least this far apart (exactly 60 is allowed). */
export const TRIAL_MIN_START_SPACING_MINUTES =
  TRIAL_DURATION_MINUTES + TRIAL_BUFFER_MINUTES;
/** Start times are offered on the half hour. */
export const TRIAL_SLOT_STEP_MINUTES = 30;

/** Accepted child age, inclusive. Mirrored in client/app/(marketing)/trial. */
export const TRIAL_MIN_AGE = 6;
export const TRIAL_MAX_AGE = 18;

/** Availability is configured and displayed in Bangladesh time (UTC+6, no DST). */
export const TRIAL_TIMEZONE = 'Asia/Dhaka';
export const TRIAL_TIMEZONE_LABEL = 'Bangladesh Time (GMT+6)';

/** Longest span the availability endpoints will compute in one request. */
export const TRIAL_MAX_RANGE_DAYS = 62;

/** Key for pg_advisory_xact_lock — serialises every trial booking change. */
export const TRIAL_BOOKING_LOCK_KEY = 7_413_221;

const DEFAULT_MIN_NOTICE_MINUTES = 120;
const DEFAULT_HORIZON_DAYS = 60;

function positiveIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return fallback;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 ? n : fallback;
}

/** How far ahead of "now" a slot must start to be bookable (TRIAL_MIN_NOTICE_MINUTES). */
export function trialMinNoticeMinutes(): number {
  return positiveIntEnv('TRIAL_MIN_NOTICE_MINUTES', DEFAULT_MIN_NOTICE_MINUTES);
}

/** How many days ahead parents can book (TRIAL_BOOKING_HORIZON_DAYS). */
export function trialHorizonDays(): number {
  const n = positiveIntEnv('TRIAL_BOOKING_HORIZON_DAYS', DEFAULT_HORIZON_DAYS);
  return Math.min(Math.max(n, 1), 365);
}

/** Official public contact details (safe to ship in code and emails). */
export const LUMEXA_CONTACT = {
  name: 'Lumexa AI School',
  email: 'lumexa.school@gmail.com',
  whatsappE164: '+8801522122194',
  whatsappDisplay: '+880 1522 122194',
  whatsappUrl: 'https://wa.me/8801522122194',
} as const;

// ─── Classroom joining window ────────────────────────────────────────────────

/** The trial classroom opens this long before the scheduled start (the same
 *  10 minutes a regular class opens). */
export const TRIAL_JOIN_OPENS_BEFORE_MINUTES = 10;
/** …and stays open this long after the scheduled END, so a class that starts a
 *  little late (or a parent who drops and rejoins) is not locked out. */
export const TRIAL_JOIN_CLOSES_AFTER_END_MINUTES = 30;
/** The parent is reminded this long before the start. */
export const TRIAL_REMINDER_LEAD_MINUTES = 60;

/** FRONTEND_URL may be a comma-separated list (see main.ts CORS setup); the
 *  first entry is the canonical public site. */
export function frontendBaseUrl(): string {
  const first = (process.env.FRONTEND_URL || '').split(',')[0].trim();
  return (first || 'http://localhost:3000').replace(/\/+$/, '');
}

/** The parent's secure guest link. The token is the only secret in it. */
export function trialJoinUrl(guestToken: string): string {
  return `${frontendBaseUrl()}/trial/join/${encodeURIComponent(guestToken)}`;
}
