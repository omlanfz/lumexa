// FILE PATH: client/lib/classroom/types.ts
//
// Shared types for the Lumexa classroom experience.

export type ClassroomRole = 'TEACHER' | 'STUDENT';

export interface ParticipantMeta {
  identity: string;
  role: ClassroomRole;
  displayName: string;
}

/** Parses the "(Teacher)" / "(Student)" suffix the backend bakes into the
 * LiveKit participant name at token-issue time (see classroom.service.ts)
 * into a structured role + clean display name. */
export function parseParticipantMeta(identity: string, name: string): ParticipantMeta {
  const isTeacher = /\(Teacher\)\s*$/i.test(name);
  const displayName = name.replace(/\s*\((Teacher|Student)\)\s*$/i, '').trim() || name;
  return {
    identity,
    role: isTeacher ? 'TEACHER' : 'STUDENT',
    displayName,
  };
}

/** Shared, persisted classroom-wide state — mirrors the LiveKit room's JSON
 * metadata, updated via PATCH /classroom/:room/state (teacher only). */
export interface ClassroomState {
  chatLocked?: boolean;
  studentsMuted?: boolean;
  /** True while the teacher's recording is actively running — synced via
   * room metadata (see ClassroomService.startTeacherRecording/
   * stopTeacherRecording) so every participant sees the same state. */
  recording?: boolean;
}

export function parseClassroomState(metadata: string | undefined): ClassroomState {
  if (!metadata) return {};
  try {
    const parsed = JSON.parse(metadata);
    return typeof parsed === 'object' && parsed ? parsed : {};
  } catch {
    return {};
  }
}

// ─── Ephemeral data-channel control messages ────────────────────────────────
// Low-stakes, best-effort signals (raise hand, reactions, spotlight) that
// don't need server persistence — broadcast over LiveKit's data channel.

export type ControlMessage =
  | { type: 'raise-hand'; raised: boolean; identity: string }
  | { type: 'lower-hand'; identity: string } // teacher lowering someone else's hand
  | { type: 'reaction'; emoji: string; identity: string }
  | { type: 'spotlight'; identity: string | null }; // null clears spotlight

export const CLASSROOM_CONTROL_TOPIC = 'lumexa-classroom-control';
