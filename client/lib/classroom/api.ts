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

// ─── Saved chat ─────────────────────────────────────────────────────────────
// Live chat travels as Daily app messages; these keep it (server/src/classroom/
// chat). A class whose chat is not saved (a free trial, or storage not set up)
// answers `enabled: false` and the chat simply stays live-only.

export interface SavedChatMessage {
  id: string;
  text: string;
  /** When the server received it (epoch ms). */
  sentAt: number;
  fromUserId: string;
  fromName: string;
  fromRole: 'TEACHER' | 'STUDENT';
}

export interface SavedChatPage {
  enabled: boolean;
  /** Oldest first. */
  messages: SavedChatMessage[];
  /** Older messages exist than these. */
  hasMore: boolean;
}

/** The newest saved messages this person may see — or, with `before`, the ones just
 * before that time (the message at exactly `before` may be repeated). */
export async function fetchChatHistory(
  room: string,
  opts: { before?: number; limit?: number } = {},
): Promise<SavedChatPage> {
  const res = await api.get<SavedChatPage>(`/classroom/${room}/chat`, { params: opts });
  return res.data;
}

/** Saves a message that has just been sent. */
export async function saveChatMessage(room: string, id: string, text: string): Promise<void> {
  await api.post(`/classroom/${room}/chat`, { id, text });
}

/** Teacher only: deletes one message, whoever sent it. */
export async function deleteChatMessage(room: string, authorUserId: string, id: string): Promise<void> {
  await api.delete(
    `/classroom/${room}/chat/messages/${encodeURIComponent(authorUserId)}/${encodeURIComponent(id)}`,
  );
}

/** Teacher only: deletes the whole chat, for everyone in it. */
export async function clearChat(room: string): Promise<void> {
  await api.delete(`/classroom/${room}/chat`);
}
