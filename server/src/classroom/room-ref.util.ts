// FILE PATH: server/src/classroom/room-ref.util.ts
//
// Room-name parsing shared by ClassroomService and the recording /
// presence / admission services alongside it. Room names are one of:
//   "lesson-<scheduledLessonId>"        a 1:1 curriculum class
//   "batch-session-<batchSessionId>"    a BATCH class: the one classroom of a
//                                       BatchSession, shared by every student
//                                       taking part (see roomForLessonRecord)
//   "batch-<teacherId>-<startEpochMs>"  LEGACY batch room, from before batches
//                                       had sessions. Still understood (a class
//                                       that was running at deploy time) but
//                                       never created any more
//   "trial-<trialLeadId>"               a free TRIAL class (teacher + a guest
//                                       who joins by a secure link, no account)
//   a raw bookingId                     marketplace flow
//   the fixed QA demo room name
// A room name is also the name of the Daily room (letters, digits, "-", "_").
//
// This file also owns the "person" identity. One person may join the same
// classroom from several devices or tabs (say one for the camera and one for
// the microphone). Daily gives every connection its own session id, and the
// meeting token carries the person's `user_id` — at most 36 characters, which a
// user's uuid exactly fits. Everything that thinks in terms of people (the cap
// on how many may be in the room, moderation, hands up, tiles) uses that
// user id, so two devices are one person.

export const DEMO_ROOM_NAME = 'lumexa-demo-classroom';

// The two seeded QA accounts allowed into the demo room (see
// ClassroomService.joinDemoClassroom).
export const DEMO_TEACHER_EMAIL = 'dmtc@gmail.com';
export const DEMO_STUDENT_EMAIL = 'dmst@gmail.com';

/** LEGACY batch rooms: "batch-<teacherId>-<startMs>". */
export const BATCH_ROOM_PREFIX = 'batch-';

/** A batch session's classroom: "batch-session-<batchSessionId>". */
export const BATCH_SESSION_ROOM_PREFIX = 'batch-session-';

/** A free trial class: "trial-<trialLeadId>". Not a ScheduledLesson — a trial
 * has no student account, no lesson balance and no curriculum progress. */
export const TRIAL_ROOM_PREFIX = 'trial-';

/** A trial guest (the parent/child following a secure link) has no account, so
 * their person id is built from the trial instead of a userId. (Short: Daily
 * limits a user id to 36 characters, and "trial-guest-" + a uuid is 48.) */
export const TRIAL_GUEST_PREFIX = 'tg-';

/** The most characters Daily accepts in a meeting token's `user_id`. */
export const MAX_DAILY_USER_ID_LENGTH = 36;

/** Most people (teacher included) who may be in one classroom at a time. The
 * same for a 1:1 class and a batch; four students is the ideal batch, not a
 * limit. */
export const MAX_PEOPLE_PER_CLASSROOM = 10;

/** The teacher's seat is always kept free, so a full class of students can
 * never lock their own teacher out. */
export const MAX_STUDENTS_PER_CLASSROOM = MAX_PEOPLE_PER_CLASSROOM - 1;

/** One person may be connected from this many devices/tabs at once. */
export const MAX_DEVICES_PER_PERSON = 3;

export type RoomRef =
  | { kind: 'lesson'; scheduledLessonId: string }
  | { kind: 'session'; batchSessionId: string }
  | { kind: 'batch'; teacherId: string; startMs: number } // legacy
  | { kind: 'booking'; bookingId: string }
  | { kind: 'trial'; trialLeadId: string }
  | { kind: 'demo' };

export function isLessonRoom(room: string): boolean {
  return room.startsWith('lesson-');
}

export function lessonIdFromRoom(room: string): string {
  return room.slice('lesson-'.length);
}

export function roomForLesson(scheduledLessonId: string): string {
  return `lesson-${scheduledLessonId}`;
}

/** The classroom of one batch session — the single room every student taking
 * part in that class shares. */
export function roomForBatchSession(batchSessionId: string): string {
  return `${BATCH_SESSION_ROOM_PREFIX}${batchSessionId}`;
}

/** `batch-session-<id>` → the session id, or null if it is not one. */
export function parseBatchSessionRoom(room: string): string | null {
  if (!room.startsWith(BATCH_SESSION_ROOM_PREFIX)) return null;
  const id = room.slice(BATCH_SESSION_ROOM_PREFIX.length);
  return id.length > 0 ? id : null;
}

/** LEGACY room name of a batch class (before batches had sessions). */
export function roomForBatch(teacherId: string, start: Date): string {
  return `${BATCH_ROOM_PREFIX}${teacherId}-${start.getTime()}`;
}

/** LEGACY `batch-<teacherId>-<startMs>` → its parts, or null if it is not one.
 * The teacher id is a uuid (it contains hyphens), so split on the LAST hyphen.
 * A session room ("batch-session-…") is never one, whatever its id ends in. */
export function parseBatchRoom(
  room: string,
): { teacherId: string; startMs: number } | null {
  if (!room.startsWith(BATCH_ROOM_PREFIX)) return null;
  if (room.startsWith(BATCH_SESSION_ROOM_PREFIX)) return null;
  const rest = room.slice(BATCH_ROOM_PREFIX.length);
  const cut = rest.lastIndexOf('-');
  if (cut <= 0) return null;
  const teacherId = rest.slice(0, cut);
  const startText = rest.slice(cut + 1);
  if (!/^\d{1,15}$/.test(startText)) return null;
  return { teacherId, startMs: Number(startText) };
}

/** Any batch classroom: a session's, or a legacy one. */
export function isBatchRoom(room: string): boolean {
  return parseBatchSessionRoom(room) !== null || parseBatchRoom(room) !== null;
}

/** A room that belongs to the curriculum (a lesson or a batch), as opposed to
 * a marketplace booking or the QA demo room. */
export function isCurriculumRoom(room: string): boolean {
  return isLessonRoom(room) || isBatchRoom(room);
}

/** The classroom a scheduled lesson takes place in. A BATCH lesson is one
 * student's participation in a BatchSession and shares the session's room with
 * every other participant; a 1:1 lesson has a room of its own. */
export function roomForLessonRecord(lesson: {
  id: string;
  classType: 'ONE_TO_ONE' | 'BATCH';
  teacherId: string;
  start: Date;
  batchSessionId?: string | null;
}): string {
  if (lesson.classType !== 'BATCH') return roomForLesson(lesson.id);
  // The database guarantees a BATCH lesson has a session; the legacy name is
  // only a last resort for a row that somehow lacks one.
  return lesson.batchSessionId
    ? roomForBatchSession(lesson.batchSessionId)
    : roomForBatch(lesson.teacherId, lesson.start);
}

export function roomForTrial(trialLeadId: string): string {
  return `${TRIAL_ROOM_PREFIX}${trialLeadId}`;
}

/** `trial-<id>` → the trial lead id, or null if it is not a trial room. */
export function parseTrialRoom(room: string): string | null {
  if (!room.startsWith(TRIAL_ROOM_PREFIX)) return null;
  const id = room.slice(TRIAL_ROOM_PREFIX.length);
  return id.length > 0 ? id : null;
}

export function isTrialRoom(room: string): boolean {
  return parseTrialRoom(room) !== null;
}

/** The person id of a trial's guest in meeting tokens and room checks: "tg-"
 * and the trial's uuid without its hyphens (35 characters). */
export function trialGuestKey(trialLeadId: string): string {
  return `${TRIAL_GUEST_PREFIX}${trialLeadId.replace(/-/g, '')}`;
}

export function getRoomRef(room: string): RoomRef {
  if (room === DEMO_ROOM_NAME) return { kind: 'demo' };
  const trialLeadId = parseTrialRoom(room);
  if (trialLeadId) return { kind: 'trial', trialLeadId };
  if (isLessonRoom(room)) {
    return { kind: 'lesson', scheduledLessonId: lessonIdFromRoom(room) };
  }
  const batchSessionId = parseBatchSessionRoom(room);
  if (batchSessionId) return { kind: 'session', batchSessionId };
  const batch = parseBatchRoom(room);
  if (batch) return { kind: 'batch', ...batch };
  return { kind: 'booking', bookingId: room };
}

// ─── Participant identity ───────────────────────────────────────────────────

/** The person id of a silent admin observer (see ClassroomService.
 * adminJoinLiveClass): "admin-observer-" and a timestamp. */
export const ADMIN_OBSERVER_PREFIX = 'admin-observer-';

export function isAdminObserver(userId: string): boolean {
  return userId.startsWith(ADMIN_OBSERVER_PREFIX);
}

/** True for a connection that is a person in the class — not an admin
 * observer. Only people count towards the room's limits. */
export function isPersonUserId(userId: string): boolean {
  return !isAdminObserver(userId);
}
