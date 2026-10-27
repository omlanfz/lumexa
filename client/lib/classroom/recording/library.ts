// FILE PATH: client/lib/classroom/recording/library.ts
//
// Watching class recordings: the lists a student, a parent or an admin sees, and
// the signed URL that plays one part. The shapes mirror what
// server/src/classroom/recording-library.service.ts returns (dates arrive as ISO
// strings).
//
// The files are in a private storage bucket. A URL for one is only handed out
// after the server has checked that this person belongs to the class, and it
// stops working on its own after a while — so a link is asked for when someone
// presses Watch, never stored or listed.
//
// (Making a recording and uploading it is the teacher's side: api.ts, upload.ts…
// in this folder.)

import api from '@/lib/axios';
export { recordingErrorMessage } from './api.ts';

/** One watchable part of a class (a class has several when the teacher recorded
 * more than once). */
export interface RecordingPart {
  id: string;
  /** 1, 2, 3… in the order they were recorded. */
  part: number;
  durationSeconds: number | null;
  sizeBytes: number | null;
  recordedAt: string;
}

/** One class that has something to watch. */
export interface RecordingClass {
  key: string;
  kind: 'LESSON' | 'BOOKING' | 'DEMO';
  /** "Lesson 3: Variables", "Class with Ms Rahman"… */
  title: string;
  courseTitle: string | null;
  lessonNumber: number | null;
  lessonTitle: string | null;
  batchName: string | null;
  teacherName: string;
  teacherAvatarUrl: string | null;
  classStart: string;
  classEnd: string | null;
  parts: RecordingPart[];
  /** A recording made before browser recording existed: a plain link. */
  legacyUrl: string | null;
}

export interface MyRecordings {
  recordings: RecordingClass[];
  /** Parts the teacher has recorded but not finished uploading. */
  processingCount: number;
}

export interface Playback {
  url: string;
  expiresAt: string;
  durationSeconds: number | null;
}

export type SegmentStatus = 'RECORDING' | 'UPLOADING' | 'AVAILABLE' | 'FAILED' | 'EXPIRED';

/** One recording of a class as an admin sees it, whatever state it is in. */
export interface AdminSegment {
  id: string;
  part: number;
  status: SegmentStatus;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  sizeBytes: number | null;
  uploadedAt: string | null;
  failureReason: string | null;
}

export interface ClassRecordings {
  room: string;
  storage: { configured: boolean; missing: string[] };
  segments: AdminSegment[];
}

export type AdminClassKind = 'BOOKING' | 'LESSON' | 'SESSION';

/** A student's recordings, class by class (newest first). */
export async function fetchMyRecordings(): Promise<MyRecordings> {
  const res = await api.get<MyRecordings>('/recordings/mine');
  return res.data;
}

/** The parts of one booked class that the signed-in person may watch (a parent's
 * way to their child's recordings). */
export async function fetchBookingParts(bookingId: string): Promise<RecordingPart[]> {
  const res = await api.get<{ parts: RecordingPart[] }>(`/recordings/booking/${bookingId}`);
  return res.data.parts;
}

/** An admin's view of one class: every recording of it, whatever its state. */
export async function fetchClassRecordings(
  kind: AdminClassKind,
  id: string,
): Promise<ClassRecordings> {
  const res = await api.get<ClassRecordings>(`/recordings/classes/${kind}/${id}`);
  return res.data;
}

/** A signed, expiring URL that streams one part. */
export async function fetchPlayback(partId: string): Promise<Playback> {
  const res = await api.get<Playback>(`/recordings/${partId}/playback`);
  return res.data;
}

/** Whether this browser can play a recording at all (they are WebM: Chrome, Edge
 * and Firefox always; Safari from version 17.4 / iOS 17.4). */
export function canPlayRecordings(): boolean {
  if (typeof document === 'undefined') return true;
  return document.createElement('video').canPlayType('video/webm; codecs="vp8, opus"') !== '';
}
