// FILE PATH: client/lib/classroom/api.ts
//
// Thin wrappers over the teacher-only classroom management endpoints
// (see server/src/classroom/classroom.controller.ts). All calls are scoped
// to a LiveKit room name and are rejected server-side unless the caller is
// that room's teacher.

import api from '@/lib/axios';
import { ClassroomState } from './types';

export async function muteParticipant(
  room: string,
  identity: string,
  kind: 'audio' | 'video',
): Promise<void> {
  await api.post(`/classroom/${room}/mute-participant`, { identity, kind });
}

export async function muteAllParticipants(room: string): Promise<{ mutedCount: number }> {
  const res = await api.post(`/classroom/${room}/mute-all`);
  return res.data;
}

export async function removeParticipant(room: string, identity: string): Promise<void> {
  await api.post(`/classroom/${room}/remove-participant`, { identity });
}

export async function stopParticipantScreenShare(room: string, identity: string): Promise<void> {
  await api.post(`/classroom/${room}/stop-screen-share`, { identity });
}

export async function startRecording(room: string): Promise<{ recordingStatus: string }> {
  const res = await api.post(`/classroom/${room}/recording/start`);
  return res.data;
}

export async function stopRecording(room: string): Promise<{ recordingStatus: string }> {
  const res = await api.post(`/classroom/${room}/recording/stop`);
  return res.data;
}

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

export async function setParticipantMicLocked(room: string, identity: string, locked: boolean): Promise<void> {
  await api.post(`/classroom/${room}/participant-mic-lock`, { identity, locked });
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
