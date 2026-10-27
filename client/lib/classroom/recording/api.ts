// FILE PATH: client/lib/classroom/recording/api.ts
//
// The teacher's recording endpoints (see server/src/classroom/recording.controller.ts)
// and the real wiring of the upload: the shared axios instance for Lumexa's own
// server, a bare XHR for storage, and the in-memory store of recordings.
// All calls are refused unless the caller is the class's teacher.

import api from '@/lib/axios';
import { recordingStore } from './store.ts';
import { putWithProgress } from './storageUpload.ts';
import { runUpload, uploadAll } from './upload.ts';
import type { UploadDeps, UploadTarget } from './upload.ts';

export type ServerSegmentStatus = 'RECORDING' | 'UPLOADING' | 'AVAILABLE' | 'FAILED' | 'EXPIRED';

/** What the server tells the browser about one recording. */
export interface ServerSegment {
  id: string;
  status: ServerSegmentStatus;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  sizeBytes: number | null;
  uploadedAt: string | null;
  failureReason: string | null;
}

export interface StartedRecording {
  segment: ServerSegment;
  /** The browser stops a part by itself at this length. */
  maxDurationMinutes: number;
  maxSegmentBytes: number;
  /** Whether a finished recording can be uploaded yet. Recording works either way. */
  storage: { configured: boolean; missing: string[] };
}

export async function startRecordingSegment(room: string, segmentId: string): Promise<StartedRecording> {
  const res = await api.post<StartedRecording>(`/classroom/${room}/recording/start`, { segmentId });
  return res.data;
}

export async function stopRecordingSegment(
  room: string,
  segmentId: string,
  body: { durationMs: number; mimeType: string },
): Promise<void> {
  await api.post(`/classroom/${room}/recording/${segmentId}/stop`, body);
}

export async function discardRecordingSegment(room: string, segmentId: string): Promise<void> {
  await api.post(`/classroom/${room}/recording/${segmentId}/discard`);
}

export async function listRecordingSegments(room: string): Promise<ServerSegment[]> {
  const res = await api.get<{ segments: ServerSegment[] }>(`/classroom/${room}/recording/segments`);
  return res.data.segments;
}

async function requestUploadUrl(room: string, id: string, sizeBytes: number): Promise<UploadTarget> {
  const res = await api.post<{ uploadUrl: string; headers: Record<string, string> }>(
    `/classroom/${room}/recording/${id}/upload-url`,
    { sizeBytes },
  );
  return { uploadUrl: res.data.uploadUrl, headers: res.data.headers };
}

async function confirmUpload(
  room: string,
  id: string,
  body: { sizeBytes: number; durationMs?: number },
): Promise<void> {
  await api.post(`/classroom/${room}/recording/${id}/complete`, body);
}

const uploadDeps: UploadDeps = {
  store: recordingStore,
  requestUploadUrl,
  confirmUpload,
  putFile: putWithProgress,
};

/** Uploads one recording (see upload.ts). Never throws; the outcome is in the store. */
export function uploadRecording(id: string): Promise<void> {
  return runUpload(id, uploadDeps);
}

/** Uploads every waiting recording of a class, one after another. */
export function uploadAllRecordings(room: string): Promise<void> {
  return uploadAll(room, uploadDeps);
}

/** The server's own words for an error, for the teacher. */
export function recordingErrorMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string | string[] } } };
  const m = e.response?.data?.message;
  return (Array.isArray(m) ? m.join(' ') : m) ?? fallback;
}

/** Forgets a recording on this computer and tells the server it was given up on
 * (best effort: the server also gives up on it by itself after a while). */
export async function discardRecording(id: string): Promise<void> {
  const r = recordingStore.get(id);
  if (!r || r.phase === 'uploading' || r.phase === 'uploaded') return;
  recordingStore.remove(id);
  await discardRecordingSegment(r.room, id).catch(() => undefined);
}
