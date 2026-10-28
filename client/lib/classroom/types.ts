// FILE PATH: client/lib/classroom/types.ts
//
// Shared types for the Lumexa classroom experience.

export type ClassroomRole = 'TEACHER' | 'STUDENT';

/** The server puts a "(Teacher)" or "(Student)" suffix on every name it signs
 * into a meeting token (see server/src/classroom/classroom.service.ts). The
 * suffix is for people reading a name in a plain list; who is the teacher is
 * decided by Daily's room-owner flag (a student can rename themselves, but not
 * make themselves the owner), so this only strips it for display. */
export function displayNameOf(name: string): string {
  return name.replace(/\s*\((Teacher|Student)\)\s*$/i, '').trim() || name;
}

/** Shared classroom-wide state — Daily's "meeting session data" for the room,
 * written only by the server (PATCH /classroom/:room/state, the lock and the
 * recording routes) and read here. Browsers treat it as what to show: nothing
 * that protects the class (who may join, who is removed) depends on it. */
export interface ClassroomState {
  chatLocked?: boolean;
  studentsMuted?: boolean;
  /** True while the teacher's recording is actively running — mirrored by the
   * server (see ClassroomService.startTeacherRecording/stopTeacherRecording) so
   * every participant sees the same state. */
  recording?: boolean;
  /** True while the teacher has locked the classroom (no one new can join).
   * The database is the source of truth; the server mirrors it into the room's
   * shared state (see ClassroomService.setRoomLocked) so every screen updates. */
  roomLocked?: boolean;
}

const STATE_KEYS = ['chatLocked', 'studentsMuted', 'recording', 'roomLocked'] as const;

/** The state in a room's session data. Anything that is not a boolean we know is
 * ignored, so a malformed value can never reach the screen. */
export function parseClassroomState(data: unknown): ClassroomState {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return {};
  const source = data as Record<string, unknown>;
  const state: ClassroomState = {};
  for (const key of STATE_KEYS) {
    if (typeof source[key] === 'boolean') state[key] = source[key];
  }
  return state;
}

// ─── Ephemeral control messages ─────────────────────────────────────────────
// Low-stakes, best-effort signals (raise hand, reactions, spotlight) that
// don't need server persistence — sent as Daily app messages to the class.
// They name a PERSON (their user id), never a connection. See daily/protocol.ts
// for who may send which.

export type ControlMessage =
  | { type: 'raise-hand'; raised: boolean; userId: string }
  | { type: 'lower-hand'; userId: string } // the teacher lowering someone else's hand
  | { type: 'reaction'; emoji: string; userId: string }
  | { type: 'spotlight'; userId: string | null }; // null clears the spotlight
