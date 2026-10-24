// FILE PATH: server/src/classroom/room-ref.util.ts
//
// LiveKit room-name parsing shared by ClassroomService and the recording /
// presence / admission services alongside it. Room names are one of:
//   "lesson-<scheduledLessonId>"        a 1:1 curriculum class
//   "batch-<teacherId>-<startEpochMs>"  a BATCH class: every student's own
//                                       ScheduledLesson in that slot shares
//                                       this one room (see roomForLessonRecord)
//   a raw bookingId                     marketplace flow
//   the fixed QA demo room name
//
// This file also owns the LiveKit *identity* format. One person may join the
// same classroom from several devices or tabs (say one for the camera and one
// for the microphone), and LiveKit gives each connection its own identity —
// `<userId>~<deviceId>`. Everything that thinks in terms of people (the cap on
// how many may be in the room, moderation, hands up, tiles) uses
// `personKey(identity)`, the userId part, so two devices are one person.

export const DEMO_ROOM_NAME = 'lumexa-demo-classroom';

// The two seeded QA accounts allowed into the demo room (see
// ClassroomService.joinDemoClassroom).
export const DEMO_TEACHER_EMAIL = 'dmtc@gmail.com';
export const DEMO_STUDENT_EMAIL = 'dmst@gmail.com';

export const BATCH_ROOM_PREFIX = 'batch-';

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
  | { kind: 'batch'; teacherId: string; startMs: number }
  | { kind: 'booking'; bookingId: string }
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

export function roomForBatch(teacherId: string, start: Date): string {
  return `${BATCH_ROOM_PREFIX}${teacherId}-${start.getTime()}`;
}

/** `batch-<teacherId>-<startMs>` → its parts, or null if it is not one. The
 * teacher id is a uuid (it contains hyphens), so split on the LAST hyphen. */
export function parseBatchRoom(
  room: string,
): { teacherId: string; startMs: number } | null {
  if (!room.startsWith(BATCH_ROOM_PREFIX)) return null;
  const rest = room.slice(BATCH_ROOM_PREFIX.length);
  const cut = rest.lastIndexOf('-');
  if (cut <= 0) return null;
  const teacherId = rest.slice(0, cut);
  const startText = rest.slice(cut + 1);
  if (!/^\d{1,15}$/.test(startText)) return null;
  return { teacherId, startMs: Number(startText) };
}

export function isBatchRoom(room: string): boolean {
  return parseBatchRoom(room) !== null;
}

/** A room that belongs to the curriculum (a lesson or a batch), as opposed to
 * a marketplace booking or the QA demo room. */
export function isCurriculumRoom(room: string): boolean {
  return isLessonRoom(room) || isBatchRoom(room);
}

/** The classroom a scheduled lesson takes place in. A BATCH lesson shares one
 * room with every other BATCH lesson of the same teacher at the same start; a
 * 1:1 lesson has a room of its own. */
export function roomForLessonRecord(lesson: {
  id: string;
  classType: 'ONE_TO_ONE' | 'BATCH';
  teacherId: string;
  start: Date;
}): string {
  return lesson.classType === 'BATCH'
    ? roomForBatch(lesson.teacherId, lesson.start)
    : roomForLesson(lesson.id);
}

export function getRoomRef(room: string): RoomRef {
  if (room === DEMO_ROOM_NAME) return { kind: 'demo' };
  if (isLessonRoom(room)) {
    return { kind: 'lesson', scheduledLessonId: lessonIdFromRoom(room) };
  }
  const batch = parseBatchRoom(room);
  if (batch) return { kind: 'batch', ...batch };
  return { kind: 'booking', bookingId: room };
}

// ─── Participant identity ───────────────────────────────────────────────────

export const IDENTITY_SEPARATOR = '~';

/** Identity of a hidden admin observer (see ClassroomService.adminJoinLiveClass). */
export const ADMIN_OBSERVER_PREFIX = 'admin-observer-';

const DEVICE_ID_PATTERN = /^[A-Za-z0-9]{4,24}$/;

/** A device id comes from the browser, so it is checked before it goes into a
 * LiveKit identity. An absent or malformed one falls back to a fixed id —
 * which is simply "one device" (a second join replaces the first, as before
 * multi-device existed). */
export function sanitizeDeviceId(raw: unknown): string {
  return typeof raw === 'string' && DEVICE_ID_PATTERN.test(raw) ? raw : 'main';
}

export function buildIdentity(userId: string, deviceId: string): string {
  return `${userId}${IDENTITY_SEPARATOR}${deviceId}`;
}

/** The person behind a LiveKit identity (their userId). */
export function personKey(identity: string): string {
  const cut = identity.indexOf(IDENTITY_SEPARATOR);
  return cut === -1 ? identity : identity.slice(0, cut);
}

export function isAdminObserver(identity: string): boolean {
  return identity.startsWith(ADMIN_OBSERVER_PREFIX);
}

// LiveKit's own service participants: the recording egress ("EG_…"), ingress,
// agents and SIP callers. They are in the room but are not people.
const SERVICE_IDENTITY_PREFIX = /^(EG_|IN_|AJ_|agent-|sip_)/;

/** True for a connection that is a person in the class: not an admin observer
 * and not one of LiveKit's own service participants (the recording egress
 * above all). Only people count towards the room's limits. `kind` is the
 * participant's LiveKit kind when the caller has it (0 = a normal participant). */
export function isPersonIdentity(identity: string, kind?: number): boolean {
  if (kind !== undefined && kind !== 0) return false;
  if (isAdminObserver(identity)) return false;
  return !SERVICE_IDENTITY_PREFIX.test(identity);
}
