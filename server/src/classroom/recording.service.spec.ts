// The pure rules of recording: how a class's segments add up to one recording
// status, and what a segment looks like to the browser. (The lifecycle against
// a real database is in recording.integration.spec.ts.)

import {
  RecordingSegmentStatus as S,
  RecordingStatus as R,
} from '@prisma/client';
import type { RecordingSegment } from '@prisma/client';
import { deriveRecordingStatus, toSegmentView } from './recording.service';

describe('deriveRecordingStatus', () => {
  it('a class nobody recorded has no recording', () => {
    expect(deriveRecordingStatus([])).toBe(R.NONE);
  });

  it('is RECORDING while any part is being recorded, whatever else there is', () => {
    expect(deriveRecordingStatus([S.RECORDING])).toBe(R.RECORDING);
    expect(deriveRecordingStatus([S.AVAILABLE, S.RECORDING, S.FAILED])).toBe(
      R.RECORDING,
    );
  });

  it('is AVAILABLE as soon as one part can be watched — even with another still uploading', () => {
    expect(deriveRecordingStatus([S.AVAILABLE])).toBe(R.AVAILABLE);
    expect(deriveRecordingStatus([S.AVAILABLE, S.UPLOADING])).toBe(R.AVAILABLE);
    expect(deriveRecordingStatus([S.FAILED, S.AVAILABLE])).toBe(R.AVAILABLE);
  });

  it('is PROCESSING while the only recordings are waiting for their upload', () => {
    expect(deriveRecordingStatus([S.UPLOADING])).toBe(R.PROCESSING);
    expect(deriveRecordingStatus([S.UPLOADING, S.FAILED])).toBe(R.PROCESSING);
  });

  it('is FAILED when every recording failed, EXPIRED when they were all removed', () => {
    expect(deriveRecordingStatus([S.FAILED])).toBe(R.FAILED);
    expect(deriveRecordingStatus([S.FAILED, S.EXPIRED])).toBe(R.FAILED);
    expect(deriveRecordingStatus([S.EXPIRED])).toBe(R.EXPIRED);
    expect(deriveRecordingStatus([S.EXPIRED, S.EXPIRED])).toBe(R.EXPIRED);
  });

  it('does not depend on the order of the parts', () => {
    const all = [S.FAILED, S.UPLOADING, S.AVAILABLE, S.EXPIRED];
    expect(deriveRecordingStatus(all)).toBe(
      deriveRecordingStatus([...all].reverse()),
    );
  });
});

describe('toSegmentView', () => {
  const row: RecordingSegment = {
    id: '11111111-1111-4111-8111-111111111111',
    room: 'lesson-abc',
    bookingId: null,
    scheduledLessonId: 'abc',
    egressId: null,
    status: S.AVAILABLE,
    storagePath:
      'recordings/lesson-abc/11111111-1111-4111-8111-111111111111.webm',
    fileSizeBytes: 123456,
    startedAt: new Date('2026-10-27T10:00:00Z'),
    endedAt: new Date('2026-10-27T10:30:00Z'),
    failureReason: null,
    createdAt: new Date('2026-10-27T10:00:00Z'),
    updatedAt: new Date('2026-10-27T10:31:00Z'),
    recordedByUserId: 'teacher-1',
    mimeType: 'video/webm;codecs=vp8,opus',
    durationSeconds: 1800,
    uploadedAt: new Date('2026-10-27T10:31:00Z'),
    uploadAttempts: 2,
  };

  it('shows the browser what it needs', () => {
    expect(toSegmentView(row)).toEqual({
      id: row.id,
      status: 'AVAILABLE',
      startedAt: row.startedAt,
      endedAt: row.endedAt,
      durationSeconds: 1800,
      sizeBytes: 123456,
      uploadedAt: row.uploadedAt,
      failureReason: null,
    });
  });

  it('never exposes where the file is kept, who made it, or how often it was retried', () => {
    const view = toSegmentView(row) as unknown as Record<string, unknown>;
    for (const hidden of [
      'storagePath',
      'room',
      'recordedByUserId',
      'uploadAttempts',
      'mimeType',
      'egressId',
    ]) {
      expect(view).not.toHaveProperty(hidden);
    }
  });
});
