// FILE PATH: client/lib/classroom/api.ts
//
// Thin wrappers over the teacher-only classroom management endpoints
// (see server/src/classroom/classroom.controller.ts). All calls are scoped
// to a classroom's room name and are rejected server-side unless the caller is
// that room's teacher. Muting people, stopping a share and locking a microphone
// are not here: the teacher's browser does those directly through Daily (see
// ./daily/moderation.ts).

import api from '@/lib/axios';
import { ClassroomState } from './types';

/** Removes a person (by user id) from every device they are in from; they must
 * knock to come back in (see AdmissionService on the server). */
export async function removeParticipant(room: string, userId: string): Promise<void> {
  await api.post(`/classroom/${room}/remove-participant`, { userId });
}

/** Sets the room's shared chat lock / "students muted" state for everyone. */
export async function updateClassroomState(
  room: string,
  patch: ClassroomState,
): Promise<ClassroomState> {
  const res = await api.patch(`/classroom/${room}/state`, patch);
  return res.data.state;
}

export type ClassOutcome = 'COMPLETED' | 'PARTIALLY_COMPLETED' | 'INCOMPLETE';

/** The only reasons offered when a class is ended Incomplete. */
export type ClassEndReason = 'STUDENT_NO_SHOW' | 'TECHNICAL_ISSUE' | 'OTHER';

export interface EndClassParams {
  outcome?: ClassOutcome;
  reason?: ClassEndReason;
  note?: string;
}

export async function endClassRequest(room: string, params: EndClassParams): Promise<void> {
  await api.post(`/classroom/${room}/end`, params);
}

export interface PendingAdmission {
  id: string;
  displayName: string;
  role: string;
  requestedAt: string;
}

export async function listPendingAdmissions(room: string): Promise<PendingAdmission[]> {
  const res = await api.get(`/classroom/${room}/admissions`);
  return res.data;
}

export async function decideAdmission(
  room: string,
  admissionId: string,
  decision: 'APPROVE' | 'DENY',
): Promise<void> {
  await api.post(`/classroom/${room}/admissions/${admissionId}/decide`, { decision });
}

/** Lock or unlock the classroom. While locked, no student can join; people
 * already inside stay. */
export async function setRoomLocked(room: string, locked: boolean): Promise<boolean> {
  const res = await api.post<{ locked: boolean }>(`/classroom/${room}/lock`, { locked });
  return res.data.locked;
}
