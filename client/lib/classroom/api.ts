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

export async function endClass(
  room: string,
  outcome?: 'COMPLETED' | 'PARTIALLY_COMPLETED',
): Promise<void> {
  await api.post(`/classroom/${room}/end`, outcome ? { outcome } : {});
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

export type ClassEndReason = 'STUDENT_NO_SHOW' | 'STUDENT_LEFT_EARLY' | 'TECHNICAL_ISSUE' | 'OTHER';

export async function endClassRequest(
  room: string,
  params: { outcome?: 'COMPLETED' | 'PARTIALLY_COMPLETED'; reason?: ClassEndReason; note?: string },
): Promise<void> {
  await api.post(`/classroom/${room}/end`, params);
}

export async function sendHeartbeat(room: string): Promise<void> {
  await api.post(`/classroom/${room}/heartbeat`);
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
