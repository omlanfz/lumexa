// FILE PATH: client/lib/classroom/badgeAward.ts
//
// The teacher's side of the Classroom Badge System, without the screen: the
// shapes the API returns, the request id that makes a double click harmless,
// and the wording of the confirmation. Pure, so it can be tested.

export interface ClassroomBadge {
  id: string;
  emoji: string;
  name: string;
  /** What the badge recognises — the tooltip. */
  criteria: string;
}

export interface AwardResult {
  awardId: string;
  studentUserId: string;
  studentName: string;
  /** false: this was a repeat of an award already saved. */
  created: boolean;
  /** true: the student was in the class and was shown the celebration. */
  notified: boolean;
  /** true: this award had already been undone. */
  revoked: boolean;
}

export interface AwardResponse {
  ok: true;
  requestId: string;
  badge: { id: string; emoji: string; name: string };
  awards: AwardResult[];
  /** ISO time after which the award can no longer be undone. */
  undoUntil: string;
}

/** A fresh id for one award action. Reusing it for a retry of the SAME action is
 * what keeps a repeated click from awarding twice; a new action gets a new one. */
export function newRequestId(): string {
  const c = globalThis.crypto;
  if (typeof c?.randomUUID === 'function') return c.randomUUID();
  const bytes = new Uint8Array(16);
  c.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** What an award action is, as far as retrying goes: the badge and who gets it. */
export function awardSignature(badgeId: string, studentUserIds: string[]): string {
  return `${badgeId}|${[...new Set(studentUserIds)].sort().join(',')}`;
}

export interface PendingRequest {
  signature: string;
  requestId: string;
}

/** The request id to send for this action: the previous attempt's if it is the
 * very same action (a retry after a failure or a double click), else a new one. */
export function requestFor(
  previous: PendingRequest | null,
  signature: string,
  make: () => string = newRequestId,
): PendingRequest {
  return previous && previous.signature === signature ? previous : { signature, requestId: make() };
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

function listNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  if (names.length === 3) return `${names[0]}, ${names[1]} and ${names[2]}`;
  return `${names[0]}, ${names[1]} and ${names.length - 2} others`;
}

export interface AwardSummary {
  /** One line for the teacher: what was awarded and to whom. */
  headline: string;
  /** Present when someone was not shown the celebration (not in the class right
   * now): they still have the badge. */
  note: string | null;
}

/** The confirmation the teacher sees after awarding. */
export function summarizeAward(res: AwardResponse): AwardSummary {
  const live = res.awards.filter((a) => !a.revoked);
  const names = live.map((a) => firstName(a.studentName));
  const headline = `${res.badge.emoji} ${res.badge.name} awarded to ${listNames(names)}`;
  const away = live.filter((a) => a.created && !a.notified).map((a) => firstName(a.studentName));
  const note =
    away.length === 0
      ? null
      : `${listNames(away)} ${away.length === 1 ? "isn't" : "aren't"} in the class right now — they'll see it in My Badges.`;
  return { headline, note };
}

/** Whole seconds left to undo, never negative. */
export function undoSecondsLeft(undoUntil: string, now: number): number {
  const until = Date.parse(undoUntil);
  if (Number.isNaN(until)) return 0;
  return Math.max(0, Math.ceil((until - now) / 1000));
}

const CONGRATS = [
  'Great job — keep shining!',
  'Awesome work, you earned it!',
  'Way to go, superstar!',
  'Fantastic effort — well done!',
];

/** A short, friendly line for a celebration. The same award always gets the same
 * line (it is chosen from the award's id), so a repeat never reads differently. */
export function congratulation(awardId: string): string {
  let sum = 0;
  for (let i = 0; i < awardId.length; i++) sum = (sum + awardId.charCodeAt(i)) % 9973;
  return CONGRATS[sum % CONGRATS.length];
}
