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

export async function endClass(room: string): Promise<void> {
  await api.post(`/classroom/${room}/end`);
}

export async function updateClassroomState(
  room: string,
  patch: ClassroomState,
): Promise<ClassroomState> {
  const res = await api.patch(`/classroom/${room}/state`, patch);
  return res.data.state;
}
