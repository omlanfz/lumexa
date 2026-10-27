// Class recordings against a REAL Postgres: recording in the teacher's browser,
// stopping, uploading to R2 (faked here — there is no R2 in the test
// environment), recording again in the same class, the sweeps and the
// retention policy, and who may watch what.
//
// Everything but R2 is the real thing: Prisma, the services, the room
// directory. The storage service is the real class with its network calls
// (head/delete) replaced by an in-memory bucket, so the URLs it signs are real.
//
// Skipped unless ASSESSMENT_INTEGRATION_DATABASE_URL points at a throwaway,
// fully migrated database — see ../assessments/testing/integration-db.ts.

import 'reflect-metadata';
import {
  IT_DB_URL,
  acquireDatabaseLock,
  truncateAssessmentData,
  useIntegrationDatabase,
} from '../assessments/testing/integration-db';

useIntegrationDatabase();
process.env.LIVEKIT_API_KEY = 'test-key';
process.env.LIVEKIT_API_SECRET = 'test-secret-that-is-long-enough-for-hs256';
process.env.LIVEKIT_URL = 'wss://livekit.test';

import { randomUUID } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  LessonStatus,
  RecordingSegmentStatus as S,
  RecordingStatus as R,
  Role,
} from '@prisma/client';
import { createBatchWithSession } from '../batches/testing/batch-fixtures';
import { makeCourse, makeUser } from '../batches/testing/batch-world';
import type { Person } from '../batches/testing/batch-world';
import { PrismaModule } from '../prisma.module';
import { PrismaService } from '../prisma.service';
import { ClassroomService } from './classroom.service';
import {
  FAILURE_DISCARDED,
  FAILURE_NOT_UPLOADED,
  MAX_SEGMENT_BYTES,
  MAX_SEGMENTS_PER_ROOM,
  RecordingService,
} from './recording.service';
import { RecordingLibraryService } from './recording-library.service';
import { RecordingStorageError } from './recording-storage.service';
import {
  MemoryRecordingStorage,
  TEST_R2_ENV,
} from './testing/memory-recording-storage';
import { RoomDirectoryService } from './room-directory.service';
import {
  DEMO_ROOM_NAME,
  DEMO_STUDENT_EMAIL,
  DEMO_TEACHER_EMAIL,
  roomForBatchSession,
} from './room-ref.util';

const describeDb = IT_DB_URL ? describe : describe.skip;

describeDb('Class recordings (real Postgres, R2 faked)', () => {
  jest.setTimeout(120_000);

  let prisma: PrismaService;
  let storage: MemoryRecordingStorage;
  let recording: RecordingService;
  let library: RecordingLibraryService;
  let releaseLock: () => void;
  const alerts = { create: jest.fn(() => Promise.resolve()) };

  let teacher: Person;
  let otherTeacher: Person;
  let admin: Person;
  let parent: Person;
  let students: Person[];
  let courseId: string;
  let slot: Date;

  const configureR2 = () => Object.assign(process.env, TEST_R2_ENV);
  const unconfigureR2 = () => {
    for (const k of Object.keys(TEST_R2_ENV)) delete process.env[k];
  };

  async function makeLesson(student: Person, by = teacher, lessonNumber = 3) {
    return prisma.scheduledLesson.create({
      data: {
        studentUserId: student.id,
        teacherId: by.profileId!,
        courseId,
        lessonNumber,
        start: slot,
        end: new Date(slot.getTime() + 45 * 60_000),
        classType: 'ONE_TO_ONE',
      },
    });
  }

  const lessonRoom = (lesson: { id: string }) => `lesson-${lesson.id}`;

  async function makeBooking(student: Person | null, kid?: { id: string }) {
    const shift = await prisma.shift.create({
      data: {
        teacherId: teacher.profileId!,
        start: slot,
        end: new Date(slot.getTime() + 45 * 60_000),
      },
    });
    return prisma.booking.create({
      data: {
        shiftId: shift.id,
        studentUserId: student?.id,
        studentId: kid?.id,
      },
    });
  }

  const row = (id: string) =>
    prisma.recordingSegment.findUniqueOrThrow({ where: { id } });
  const lessonStatus = async (id: string) =>
    (await prisma.scheduledLesson.findUniqueOrThrow({ where: { id } }))
      .recordingStatus;

  /** Record → stop → upload → confirm: a part a student can watch. */
  async function uploadedPart(
    room: string,
    opts: { by?: Person; size?: number; startedAt?: Date } = {},
  ): Promise<string> {
    const by = opts.by ?? teacher;
    const size = opts.size ?? 1_000;
    const id = randomUUID();
    await recording.startSegment(room, by.id, id);
    if (opts.startedAt) {
      await prisma.recordingSegment.update({
        where: { id },
        data: { startedAt: opts.startedAt },
      });
    }
    await recording.stopSegment(room, by.id, id, { durationMs: 600_000 });
    await recording.createUploadUrl(room, by.id, id, size);
    storage.put((await row(id)).storagePath!, size);
    await recording.completeUpload(room, by.id, id, size);
    return id;
  }

  beforeAll(async () => {
    releaseLock = await acquireDatabaseLock(IT_DB_URL!);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
    const mod = await Test.createTestingModule({
      imports: [PrismaModule],
    }).compile();
    prisma = mod.get(PrismaService);
  });

  afterAll(async () => {
    jest.restoreAllMocks();
    await prisma?.$disconnect();
    releaseLock?.();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    configureR2();
    delete process.env.RECORDING_MAX_DURATION_MINUTES;
    delete process.env.RECORDING_STORAGE_LIMIT_BYTES;
    // Fresh every time: the storage-limit warning is throttled per instance.
    storage = new MemoryRecordingStorage();
    recording = new RecordingService(prisma, alerts as never, storage);
    library = new RecordingLibraryService(
      prisma,
      storage,
      new RoomDirectoryService(prisma),
    );
    await truncateAssessmentData(prisma);
    await prisma.recordingSegment.deleteMany();

    slot = new Date(Date.now() + 5 * 60_000);
    teacher = await makeUser(prisma, 'ms-karim', Role.TEACHER);
    otherTeacher = await makeUser(prisma, 'mr-hasan', Role.TEACHER);
    admin = await makeUser(prisma, 'ops-admin', Role.ADMIN);
    parent = await makeUser(prisma, 'a-parent', Role.PARENT);
    courseId = (await makeCourse(prisma, 'rec-course')).id;
    students = [];
    for (const n of ['ada', 'ben', 'cleo']) {
      students.push(await makeUser(prisma, `${n}-student`, Role.STUDENT));
    }
  });

  afterEach(() => unconfigureR2());

  // ─── Pressing Record ───────────────────────────────────────────────────────

  describe('Record', () => {
    it('makes one segment: keyed by its own id, owned by the teacher, class marked RECORDING', async () => {
      const lesson = await makeLesson(students[0]);
      const room = lessonRoom(lesson);
      const id = randomUUID();

      const started = await recording.startSegment(room, teacher.id, id);

      expect(started.segment).toMatchObject({ id, status: S.RECORDING });
      expect(started.maxDurationMinutes).toBe(70);
      expect(started.maxSegmentBytes).toBe(MAX_SEGMENT_BYTES);
      expect(started.storage).toEqual({ configured: true, missing: [] });
      const saved = await row(id);
      expect(saved).toMatchObject({
        room,
        scheduledLessonId: lesson.id,
        recordedByUserId: teacher.id,
        storagePath: `recordings/${room}/${id}.webm`,
        status: S.RECORDING,
      });
      expect(await lessonStatus(lesson.id)).toBe(R.RECORDING);
    });

    it('the browser’s id makes a retried request harmless: one segment, not two', async () => {
      const room = lessonRoom(await makeLesson(students[0]));
      const id = randomUUID();
      await recording.startSegment(room, teacher.id, id);
      const again = await recording.startSegment(room, teacher.id, id);
      expect(again.segment.id).toBe(id);
      expect(await prisma.recordingSegment.count({ where: { room } })).toBe(1);
    });

    it('makes its own id when the browser sent none', async () => {
      const room = lessonRoom(await makeLesson(students[0]));
      const started = await recording.startSegment(room, teacher.id);
      expect(started.segment.id).toMatch(/^[0-9a-f-]{36}$/);
    });

    it('recording again adds another part; the first is neither overwritten nor lost', async () => {
      const room = lessonRoom(await makeLesson(students[0]));
      const first = await uploadedPart(room, { size: 111 });
      const second = await uploadedPart(room, { size: 222 });

      expect(second).not.toBe(first);
      const a = await row(first);
      const b = await row(second);
      expect(a.storagePath).not.toBe(b.storagePath);
      expect([a.status, b.status]).toEqual([S.AVAILABLE, S.AVAILABLE]);
      expect([a.fileSizeBytes, b.fileSizeBytes]).toEqual([111, 222]);
      const listed = await recording.listSegments(room);
      expect(listed.map((s) => s.id)).toEqual([first, second]);
    });

    it('an id that belongs to another class or teacher cannot be reused', async () => {
      const mine = lessonRoom(await makeLesson(students[0]));
      const theirs = lessonRoom(await makeLesson(students[1], otherTeacher, 4));
      const id = randomUUID();
      await recording.startSegment(mine, teacher.id, id);
      await expect(
        recording.startSegment(theirs, otherTeacher.id, id),
      ).rejects.toBeInstanceOf(ConflictException);
      await expect(
        recording.startSegment(mine, otherTeacher.id, id),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('works before R2 is set up, and says that uploading will not yet work', async () => {
      unconfigureR2();
      const room = lessonRoom(await makeLesson(students[0]));
      const started = await recording.startSegment(room, teacher.id);
      expect(started.segment.status).toBe(S.RECORDING);
      expect(started.storage).toEqual({
        configured: false,
        missing: [
          'R2_ACCOUNT_ID',
          'R2_ACCESS_KEY_ID',
          'R2_SECRET_ACCESS_KEY',
          'R2_BUCKET',
        ],
      });
    });

    it('is capped at a sensible number of parts per class', async () => {
      const room = lessonRoom(await makeLesson(students[0]));
      await prisma.recordingSegment.createMany({
        data: Array.from({ length: MAX_SEGMENTS_PER_ROOM }, () => ({
          id: randomUUID(),
          room,
          recordedByUserId: teacher.id,
          status: S.FAILED,
        })),
      });
      await expect(
        recording.startSegment(room, teacher.id),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('a free trial is never recorded', async () => {
      await expect(
        recording.startSegment('trial-abc', teacher.id),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  // ─── Pressing Stop ─────────────────────────────────────────────────────────

  describe('Stop', () => {
    it('keeps the recording as waiting for its upload, with its length', async () => {
      const lesson = await makeLesson(students[0]);
      const room = lessonRoom(lesson);
      const { segment } = await recording.startSegment(room, teacher.id);

      const stopped = await recording.stopSegment(
        room,
        teacher.id,
        segment.id,
        {
          durationMs: 754_321,
          mimeType: 'video/webm;codecs=vp8,opus',
        },
      );

      expect(stopped).toMatchObject({
        status: S.UPLOADING,
        durationSeconds: 754,
      });
      expect(stopped.endedAt).toBeInstanceOf(Date);
      expect((await row(segment.id)).mimeType).toBe(
        'video/webm;codecs=vp8,opus',
      );
      expect(await lessonStatus(lesson.id)).toBe(R.PROCESSING);
    });

    it('can be repeated without changing anything', async () => {
      const room = lessonRoom(await makeLesson(students[0]));
      const { segment } = await recording.startSegment(room, teacher.id);
      const first = await recording.stopSegment(room, teacher.id, segment.id, {
        durationMs: 1000,
      });
      const second = await recording.stopSegment(room, teacher.id, segment.id);
      expect(second.endedAt).toEqual(first.endedAt);
      expect(second.durationSeconds).toBe(1);
    });

    it('only the teacher who recorded it can stop it, and only in its own class', async () => {
      const room = lessonRoom(await makeLesson(students[0]));
      const other = lessonRoom(await makeLesson(students[1], teacher, 4));
      const { segment } = await recording.startSegment(room, teacher.id);
      await expect(
        recording.stopSegment(room, otherTeacher.id, segment.id),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(
        recording.stopSegment(other, teacher.id, segment.id),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(
        recording.stopSegment(room, teacher.id, randomUUID()),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // ─── Uploading ─────────────────────────────────────────────────────────────

  describe('Upload Class Recording', () => {
    it('signs a one-file upload URL, and counts the attempt', async () => {
      const room = lessonRoom(await makeLesson(students[0]));
      const { segment } = await recording.startSegment(room, teacher.id);
      await recording.stopSegment(room, teacher.id, segment.id);

      const target = await recording.createUploadUrl(
        room,
        teacher.id,
        segment.id,
        5_000_000,
      );

      const url = new URL(target.uploadUrl);
      expect(target.method).toBe('PUT');
      expect(target.headers).toEqual({ 'Content-Type': 'video/webm' });
      expect(url.host).toBe('acct123.r2.cloudflarestorage.com');
      expect(url.pathname).toBe(
        `/lumexa-recordings/recordings/${room}/${segment.id}.webm`,
      );
      expect(target.expiresAt.getTime()).toBeGreaterThan(Date.now());
      expect((await row(segment.id)).uploadAttempts).toBe(1);

      await recording.createUploadUrl(room, teacher.id, segment.id, 5_000_000);
      expect((await row(segment.id)).uploadAttempts).toBe(2);
      // The same file every time — a retry can only replace itself.
      expect((await row(segment.id)).storagePath).toBe(
        `recordings/${room}/${segment.id}.webm`,
      );
    });

    it('works even if the browser never got to say Stop', async () => {
      const room = lessonRoom(await makeLesson(students[0]));
      const { segment } = await recording.startSegment(room, teacher.id);
      await recording.createUploadUrl(room, teacher.id, segment.id, 10);
      const after = await row(segment.id);
      expect(after.status).toBe(S.UPLOADING);
      expect(after.endedAt).not.toBeNull();
    });

    it('says exactly what is missing when R2 is not set up', async () => {
      const room = lessonRoom(await makeLesson(students[0]));
      const { segment } = await recording.startSegment(room, teacher.id);
      delete process.env.R2_BUCKET;
      delete process.env.R2_ACCESS_KEY_ID;
      const err = await recording
        .createUploadUrl(room, teacher.id, segment.id, 100)
        .catch((e: unknown) => e);
      expect(err).toBeInstanceOf(BadRequestException);
      expect((err as Error).message).toContain('R2_ACCESS_KEY_ID, R2_BUCKET');
      expect((err as Error).message).not.toContain('S3_');
      // The recording itself is untouched, ready for when it is fixed.
      expect((await row(segment.id)).status).toBe(S.RECORDING);
    });

    it('refuses an empty or oversized file', async () => {
      const room = lessonRoom(await makeLesson(students[0]));
      const { segment } = await recording.startSegment(room, teacher.id);
      for (const bad of [0, -5, 1.5, MAX_SEGMENT_BYTES + 1]) {
        await expect(
          recording.createUploadUrl(room, teacher.id, segment.id, bad),
        ).rejects.toBeInstanceOf(BadRequestException);
      }
    });

    it('is only for the teacher who recorded it', async () => {
      const room = lessonRoom(await makeLesson(students[0]));
      const { segment } = await recording.startSegment(room, teacher.id);
      await expect(
        recording.createUploadUrl(room, otherTeacher.id, segment.id, 100),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(
        recording.completeUpload(room, otherTeacher.id, segment.id, 100),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // ─── Confirming the upload ────────────────────────────────────────────────

  describe('the upload finished', () => {
    async function readyToConfirm(size = 4_000) {
      const lesson = await makeLesson(students[0]);
      const room = lessonRoom(lesson);
      const { segment } = await recording.startSegment(room, teacher.id);
      await recording.stopSegment(room, teacher.id, segment.id, {
        durationMs: 60_000,
      });
      await recording.createUploadUrl(room, teacher.id, segment.id, size);
      return {
        lesson,
        room,
        id: segment.id,
        key: (await row(segment.id)).storagePath!,
      };
    }

    it('makes the recording watchable once storage confirms the file', async () => {
      const { lesson, room, id, key } = await readyToConfirm(4_000);
      storage.put(key, 4_000);

      const done = await recording.completeUpload(room, teacher.id, id, 4_000);

      expect(done).toMatchObject({ status: S.AVAILABLE, sizeBytes: 4_000 });
      expect(done.uploadedAt).toBeInstanceOf(Date);
      expect(await lessonStatus(lesson.id)).toBe(R.AVAILABLE);
    });

    it('is not fooled by a browser that says it uploaded when it did not', async () => {
      const { room, id, lesson } = await readyToConfirm();
      await expect(
        recording.completeUpload(room, teacher.id, id, 4_000),
      ).rejects.toBeInstanceOf(ConflictException);
      expect((await row(id)).status).toBe(S.UPLOADING);
      expect(await lessonStatus(lesson.id)).toBe(R.PROCESSING);
    });

    it('does not accept a file of a different size than the one recorded', async () => {
      const { room, id, key } = await readyToConfirm(4_000);
      storage.put(key, 3_999);
      await expect(
        recording.completeUpload(room, teacher.id, id, 4_000),
      ).rejects.toBeInstanceOf(ConflictException);
      expect((await row(id)).status).toBe(S.UPLOADING);
    });

    it('does not accept — and removes — a file that is not a WebM video', async () => {
      const { room, id, key } = await readyToConfirm(4_000);
      storage.put(key, 4_000, 'text/html');
      await expect(
        recording.completeUpload(room, teacher.id, id, 4_000),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(storage.deleted).toContain(key);
      expect(storage.objects.has(key)).toBe(false);
      expect((await row(id)).status).toBe(S.UPLOADING);
    });

    it('accepts the video type with its codecs', async () => {
      const { room, id, key } = await readyToConfirm(10);
      storage.put(key, 10, 'video/webm;codecs=vp8,opus');
      await expect(
        recording.completeUpload(room, teacher.id, id, 10),
      ).resolves.toMatchObject({ status: S.AVAILABLE });
    });

    it('tells the browser to try again — and changes nothing — when storage cannot be asked', async () => {
      const { room, id, key } = await readyToConfirm(10);
      storage.put(key, 10);
      storage.down = true;
      await expect(
        recording.completeUpload(room, teacher.id, id, 10),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
      expect((await row(id)).status).toBe(S.UPLOADING);
    });

    it('a duplicate confirmation is harmless and returns the same recording', async () => {
      const { room, id, key } = await readyToConfirm(10);
      storage.put(key, 10);
      const first = await recording.completeUpload(room, teacher.id, id, 10);
      const second = await recording.completeUpload(room, teacher.id, id, 10);
      expect(second).toEqual(first);
    });

    it('an uploaded recording can be neither uploaded again nor discarded', async () => {
      const room = lessonRoom(await makeLesson(students[0]));
      const id = await uploadedPart(room, { size: 50 });
      await expect(
        recording.createUploadUrl(room, teacher.id, id, 50),
      ).rejects.toBeInstanceOf(ConflictException);
      await expect(
        recording.discardSegment(room, teacher.id, id),
      ).rejects.toBeInstanceOf(ConflictException);
      expect((await row(id)).status).toBe(S.AVAILABLE);
    });

    it('with one part up and another still uploading, the class already has a recording', async () => {
      const lesson = await makeLesson(students[0]);
      const room = lessonRoom(lesson);
      await uploadedPart(room);
      const second = await recording.startSegment(room, teacher.id);
      expect(await lessonStatus(lesson.id)).toBe(R.RECORDING);
      await recording.stopSegment(room, teacher.id, second.segment.id);
      expect(await lessonStatus(lesson.id)).toBe(R.AVAILABLE);
    });
  });

  // ─── Giving a recording up ─────────────────────────────────────────────────

  describe('Discard', () => {
    it('gives the recording up for good, removes any file, and marks the class failed if it was the only one', async () => {
      const lesson = await makeLesson(students[0]);
      const room = lessonRoom(lesson);
      const { segment } = await recording.startSegment(room, teacher.id);
      await recording.stopSegment(room, teacher.id, segment.id);
      await recording.createUploadUrl(room, teacher.id, segment.id, 10);
      const key = (await row(segment.id)).storagePath!;
      storage.put(key, 10);

      const gone = await recording.discardSegment(room, teacher.id, segment.id);

      expect(gone).toMatchObject({
        status: S.FAILED,
        failureReason: FAILURE_DISCARDED,
      });
      expect(storage.deleted).toContain(key);
      expect(await lessonStatus(lesson.id)).toBe(R.FAILED);
      // It cannot come back.
      await expect(
        recording.createUploadUrl(room, teacher.id, segment.id, 10),
      ).rejects.toBeInstanceOf(ConflictException);
      await expect(
        recording.completeUpload(room, teacher.id, segment.id, 10),
      ).rejects.toBeInstanceOf(ConflictException);
      // Discarding again changes nothing.
      expect(
        (await recording.discardSegment(room, teacher.id, segment.id)).status,
      ).toBe(S.FAILED);
    });

    it('can discard a recording that is still running (the browser could not finish it)', async () => {
      const room = lessonRoom(await makeLesson(students[0]));
      const { segment } = await recording.startSegment(room, teacher.id);
      expect(await recording.hasActiveSegment(room)).toBe(true);
      await recording.discardSegment(room, teacher.id, segment.id);
      expect(await recording.hasActiveSegment(room)).toBe(false);
    });

    it('does not touch the class’s other recordings', async () => {
      const lesson = await makeLesson(students[0]);
      const room = lessonRoom(lesson);
      const kept = await uploadedPart(room);
      const { segment } = await recording.startSegment(room, teacher.id);
      await recording.discardSegment(room, teacher.id, segment.id);
      expect((await row(kept)).status).toBe(S.AVAILABLE);
      expect(await lessonStatus(lesson.id)).toBe(R.AVAILABLE);
    });
  });

  // ─── The class ends ────────────────────────────────────────────────────────

  describe('the class ends', () => {
    it('a recording still running now only waits for its upload — and can still be uploaded', async () => {
      const lesson = await makeLesson(students[0]);
      const room = lessonRoom(lesson);
      const other = lessonRoom(await makeLesson(students[1], teacher, 4));
      const { segment } = await recording.startSegment(room, teacher.id);
      const elsewhere = await recording.startSegment(other, teacher.id);

      await recording.stopActiveSegmentIfAny(room);
      await recording.finalizeAtClassEnd(room);

      expect((await row(segment.id)).status).toBe(S.UPLOADING);
      // Another class's recording is not touched.
      expect((await row(elsewhere.segment.id)).status).toBe(S.RECORDING);
      expect(await lessonStatus(lesson.id)).toBe(R.PROCESSING);

      // The browser, noticing the class ended, finishes and uploads.
      await recording.stopSegment(room, teacher.id, segment.id, {
        durationMs: 5000,
      });
      await recording.createUploadUrl(room, teacher.id, segment.id, 20);
      storage.put((await row(segment.id)).storagePath!, 20);
      await recording.completeUpload(room, teacher.id, segment.id, 20);
      expect(await lessonStatus(lesson.id)).toBe(R.AVAILABLE);
    });

    it('a class nobody recorded is left exactly as it was', async () => {
      const lesson = await makeLesson(students[0]);
      await recording.stopActiveSegmentIfAny(lessonRoom(lesson));
      await recording.finalizeAtClassEnd(lessonRoom(lesson));
      expect(await lessonStatus(lesson.id)).toBe(R.NONE);
    });

    it('a recording from before browser recording keeps its status and link', async () => {
      const lesson = await makeLesson(students[0]);
      await prisma.scheduledLesson.update({
        where: { id: lesson.id },
        data: {
          recordingStatus: R.AVAILABLE,
          recordingUrl: 'https://old.example/recording.mp4',
        },
      });
      const room = lessonRoom(lesson);
      await recording.startSegment(room, teacher.id);
      await recording.finalizeAtClassEnd(room);
      const after = await prisma.scheduledLesson.findUniqueOrThrow({
        where: { id: lesson.id },
      });
      expect(after).toMatchObject({
        recordingStatus: R.AVAILABLE,
        recordingUrl: 'https://old.example/recording.mp4',
      });
    });
  });

  // ─── A batch class: one room, every student's row ──────────────────────────

  describe('a batch class', () => {
    it('is one recording for the class, shown on every student’s row', async () => {
      const fx = await createBatchWithSession(prisma, {
        teacherProfileId: teacher.profileId!,
        courseId,
        studentUserIds: students.map((s) => s.id),
        start: slot,
        lessonNumber: 2,
      });
      const room = roomForBatchSession(fx.sessionId);

      const { segment } = await recording.startSegment(room, teacher.id);
      const rows = () =>
        prisma.scheduledLesson.findMany({
          where: { batchSessionId: fx.sessionId },
          select: { id: true, recordingStatus: true },
        });
      expect((await rows()).map((r) => r.recordingStatus)).toEqual([
        R.RECORDING,
        R.RECORDING,
        R.RECORDING,
      ]);
      // One segment for the class, hung off its first row.
      expect(await prisma.recordingSegment.count({ where: { room } })).toBe(1);
      expect((await row(segment.id)).scheduledLessonId).toBe(
        Object.values(fx.lessonIds).sort()[0],
      );

      await recording.stopSegment(room, teacher.id, segment.id);
      await recording.createUploadUrl(room, teacher.id, segment.id, 77);
      storage.put((await row(segment.id)).storagePath!, 77);
      await recording.completeUpload(room, teacher.id, segment.id, 77);
      expect((await rows()).map((r) => r.recordingStatus)).toEqual([
        R.AVAILABLE,
        R.AVAILABLE,
        R.AVAILABLE,
      ]);
    });

    it('leaves a cancelled student’s row alone', async () => {
      const fx = await createBatchWithSession(prisma, {
        teacherProfileId: teacher.profileId!,
        courseId,
        studentUserIds: [students[0].id, students[1].id],
        start: slot,
        lessonNumber: 2,
      });
      await prisma.scheduledLesson.update({
        where: { id: fx.lessonIds[students[1].id] },
        data: { status: LessonStatus.CANCELLED },
      });
      await recording.startSegment(
        roomForBatchSession(fx.sessionId),
        teacher.id,
      );
      expect(await lessonStatus(fx.lessonIds[students[0].id])).toBe(
        R.RECORDING,
      );
      expect(await lessonStatus(fx.lessonIds[students[1].id])).toBe(R.NONE);
    });
  });

  // ─── A marketplace booking ─────────────────────────────────────────────────

  describe('a marketplace booking', () => {
    it('is recorded against the booking', async () => {
      const booking = await makeBooking(students[0]);
      const { segment } = await recording.startSegment(booking.id, teacher.id);
      expect((await row(segment.id)).bookingId).toBe(booking.id);
      expect(
        (await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } }))
          .recordingStatus,
      ).toBe(R.RECORDING);
    });
  });

  // ─── The sweep ─────────────────────────────────────────────────────────────

  describe('the sweep', () => {
    const minutesFromNow = (m: number) => new Date(Date.now() + m * 60_000);

    it('closes a recording whose browser never reported back, as waiting for upload', async () => {
      const room = lessonRoom(await makeLesson(students[0]));
      const { segment } = await recording.startSegment(room, teacher.id);
      const startedAt = new Date(Date.now() - 100 * 60_000);
      await prisma.recordingSegment.update({
        where: { id: segment.id },
        data: { startedAt },
      });

      expect(await recording.runReconcile()).toMatchObject({ closed: 1 });

      const after = await row(segment.id);
      expect(after.status).toBe(S.UPLOADING);
      // It could not have run longer than the cap.
      expect(after.endedAt!.getTime()).toBe(startedAt.getTime() + 70 * 60_000);
    });

    it('leaves a recording that is still within its time alone', async () => {
      const room = lessonRoom(await makeLesson(students[0]));
      const { segment } = await recording.startSegment(room, teacher.id);
      expect(await recording.runReconcile()).toMatchObject({ closed: 0 });
      expect((await row(segment.id)).status).toBe(S.RECORDING);
    });

    it('confirms an upload whose confirmation was lost — the file is in storage', async () => {
      const lesson = await makeLesson(students[0]);
      const room = lessonRoom(lesson);
      const { segment } = await recording.startSegment(room, teacher.id);
      await recording.stopSegment(room, teacher.id, segment.id);
      await recording.createUploadUrl(room, teacher.id, segment.id, 900);
      storage.put((await row(segment.id)).storagePath!, 900);

      // Too soon: the upload may well still be running.
      expect(await recording.runReconcile()).toMatchObject({ completed: 0 });
      expect((await row(segment.id)).status).toBe(S.UPLOADING);

      expect(await recording.runReconcile(minutesFromNow(20))).toMatchObject({
        completed: 1,
      });
      expect(await row(segment.id)).toMatchObject({
        status: S.AVAILABLE,
        fileSizeBytes: 900,
      });
      expect(await lessonStatus(lesson.id)).toBe(R.AVAILABLE);
    });

    it('does not confirm a file that is not a WebM', async () => {
      const room = lessonRoom(await makeLesson(students[0]));
      const { segment } = await recording.startSegment(room, teacher.id);
      await recording.stopSegment(room, teacher.id, segment.id);
      storage.put((await row(segment.id)).storagePath!, 900, 'application/zip');
      await recording.runReconcile(minutesFromNow(20));
      expect((await row(segment.id)).status).toBe(S.UPLOADING);
    });

    it('gives up on a recording nobody uploaded for half a day, and tells the teacher', async () => {
      const lesson = await makeLesson(students[0]);
      const room = lessonRoom(lesson);
      const { segment } = await recording.startSegment(room, teacher.id);
      await recording.stopSegment(room, teacher.id, segment.id);

      expect(
        await recording.runReconcile(minutesFromNow(13 * 60)),
      ).toMatchObject({
        abandoned: 1,
      });

      expect(await row(segment.id)).toMatchObject({
        status: S.FAILED,
        failureReason: FAILURE_NOT_UPLOADED,
      });
      expect(await lessonStatus(lesson.id)).toBe(R.FAILED);
      expect(alerts.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: teacher.id,
          type: 'RECORDING_FAILED',
        }),
      );
    });

    it('still lets the teacher upload a recording the sweep gave up on (the file is still in their tab)', async () => {
      const lesson = await makeLesson(students[0]);
      const room = lessonRoom(lesson);
      const { segment } = await recording.startSegment(room, teacher.id);
      await recording.stopSegment(room, teacher.id, segment.id);
      await recording.runReconcile(minutesFromNow(13 * 60));
      expect((await row(segment.id)).status).toBe(S.FAILED);

      await recording.createUploadUrl(room, teacher.id, segment.id, 33);
      expect(await row(segment.id)).toMatchObject({
        status: S.UPLOADING,
        failureReason: null,
      });
      storage.put((await row(segment.id)).storagePath!, 33);
      await recording.completeUpload(room, teacher.id, segment.id, 33);
      expect(await lessonStatus(lesson.id)).toBe(R.AVAILABLE);
    });

    it('says nothing about a recording when storage cannot be asked', async () => {
      const room = lessonRoom(await makeLesson(students[0]));
      const { segment } = await recording.startSegment(room, teacher.id);
      await recording.stopSegment(room, teacher.id, segment.id);
      storage.down = true;
      expect(await recording.runReconcile(minutesFromNow(13 * 60))).toEqual({
        closed: 0,
        completed: 0,
        abandoned: 0,
      });
      expect((await row(segment.id)).status).toBe(S.UPLOADING);
    });

    it('never touches a segment of the retired server-side recorder', async () => {
      const room = lessonRoom(await makeLesson(students[0]));
      const old = await prisma.recordingSegment.create({
        data: {
          room,
          status: S.UPLOADING,
          egressId: 'EG_old',
          startedAt: new Date(Date.now() - 48 * 3_600_000),
        },
      });
      await recording.runReconcile(minutesFromNow(24 * 60));
      expect((await row(old.id)).status).toBe(S.UPLOADING);
    });
  });

  // ─── Storage retention ─────────────────────────────────────────────────────

  describe('storage retention', () => {
    it('removes the oldest recordings, and only enough of them, once over the limit', async () => {
      process.env.RECORDING_STORAGE_LIMIT_BYTES = '1000';
      const lesson = await makeLesson(students[0]);
      const room = lessonRoom(lesson);
      const day = 86_400_000;
      const ids: string[] = [];
      for (let i = 0; i < 3; i++) {
        ids.push(
          await uploadedPart(room, {
            size: 600,
            startedAt: new Date(Date.now() - (3 - i) * day),
          }),
        );
      }

      await recording.runRetention();

      expect((await row(ids[0])).status).toBe(S.EXPIRED);
      expect((await row(ids[1])).status).toBe(S.EXPIRED);
      expect((await row(ids[2])).status).toBe(S.AVAILABLE);
      expect(storage.deleted).toEqual([
        (await row(ids[0])).storagePath,
        (await row(ids[1])).storagePath,
      ]);
      expect(await lessonStatus(lesson.id)).toBe(R.AVAILABLE);
    });

    it('does nothing while there is room, and warns admins as it fills', async () => {
      process.env.RECORDING_STORAGE_LIMIT_BYTES = '1000';
      const room = lessonRoom(await makeLesson(students[0]));
      const id = await uploadedPart(room, { size: 850 });

      await recording.runRetention();

      expect((await row(id)).status).toBe(S.AVAILABLE);
      expect(storage.deleted).toEqual([]);
      expect(alerts.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: admin.id,
          type: 'RECORDING_STORAGE_WARNING',
        }),
      );
    });

    it('keeps a recording whose file could not be removed, to try again next hour', async () => {
      process.env.RECORDING_STORAGE_LIMIT_BYTES = '100';
      const room = lessonRoom(await makeLesson(students[0]));
      const id = await uploadedPart(room, { size: 600 });
      jest
        .spyOn(storage, 'deleteObject')
        .mockRejectedValueOnce(new RecordingStorageError('nope', 'Err', 500));
      await recording.runRetention();
      expect((await row(id)).status).toBe(S.AVAILABLE);
    });
  });

  // ─── What a student sees ───────────────────────────────────────────────────

  describe('a student’s recordings', () => {
    it('lists a 1:1 class’s parts, in order, with the lesson’s details', async () => {
      const lesson = await makeLesson(students[0]);
      const room = lessonRoom(lesson);
      const first = await uploadedPart(room, {
        startedAt: new Date(Date.now() - 3_600_000),
      });
      const second = await uploadedPart(room);

      const mine = await library.listForStudent(students[0].id);

      expect(mine.processingCount).toBe(0);
      expect(mine.recordings).toHaveLength(1);
      const entry = mine.recordings[0];
      expect(entry).toMatchObject({
        key: room,
        kind: 'LESSON',
        title: 'Lesson 3: Lesson 3',
        courseTitle: 'rec course',
        lessonNumber: 3,
        batchName: null,
        teacherName: 'ms karim',
        legacyUrl: null,
      });
      expect(entry.parts.map((p) => [p.id, p.part])).toEqual([
        [first, 1],
        [second, 2],
      ]);
      expect(entry.parts[0].durationSeconds).toBe(600);
    });

    it('shows nothing of another student’s class', async () => {
      const mine = await makeLesson(students[0]);
      const theirs = await makeLesson(students[1], teacher, 4);
      await uploadedPart(lessonRoom(theirs));
      expect(await library.listForStudent(students[0].id)).toEqual({
        recordings: [],
        processingCount: 0,
      });
      expect(
        (await library.listForStudent(students[1].id)).recordings,
      ).toHaveLength(1);
      expect(mine.id).toBeTruthy();
    });

    it('gives every student of a batch the one recording of their class', async () => {
      const fx = await createBatchWithSession(prisma, {
        name: 'Saturday batch',
        teacherProfileId: teacher.profileId!,
        courseId,
        studentUserIds: [students[0].id, students[1].id],
        start: slot,
        lessonNumber: 2,
      });
      const part = await uploadedPart(roomForBatchSession(fx.sessionId));

      const a = await library.listForStudent(students[0].id);
      const b = await library.listForStudent(students[1].id);
      const c = await library.listForStudent(students[2].id);

      expect(a.recordings[0].parts.map((p) => p.id)).toEqual([part]);
      expect(b.recordings[0].parts.map((p) => p.id)).toEqual([part]);
      expect(a.recordings[0].batchName).toBe('Saturday batch');
      expect(c.recordings).toEqual([]);
    });

    it('does not show a recording that is not uploaded yet — it only counts as on its way', async () => {
      const room = lessonRoom(await makeLesson(students[0]));
      const { segment } = await recording.startSegment(room, teacher.id);
      await recording.stopSegment(room, teacher.id, segment.id);
      expect(await library.listForStudent(students[0].id)).toEqual({
        recordings: [],
        processingCount: 1,
      });
    });

    it('never shows a discarded or removed recording', async () => {
      const room = lessonRoom(await makeLesson(students[0]));
      const { segment } = await recording.startSegment(room, teacher.id);
      await recording.discardSegment(room, teacher.id, segment.id);
      const old = await uploadedPart(room);
      await prisma.recordingSegment.update({
        where: { id: old },
        data: { status: S.EXPIRED },
      });
      expect(await library.listForStudent(students[0].id)).toEqual({
        recordings: [],
        processingCount: 0,
      });
    });

    it('keeps a recording made before browser recording, as a plain link', async () => {
      const lesson = await makeLesson(students[0]);
      await prisma.scheduledLesson.update({
        where: { id: lesson.id },
        data: {
          recordingStatus: R.AVAILABLE,
          recordingUrl: 'https://old.example/recording.mp4',
        },
      });
      const mine = await library.listForStudent(students[0].id);
      expect(mine.recordings).toHaveLength(1);
      expect(mine.recordings[0]).toMatchObject({
        parts: [],
        legacyUrl: 'https://old.example/recording.mp4',
      });
    });

    it('finds a marketplace booking’s recording', async () => {
      const booking = await makeBooking(students[0]);
      await uploadedPart(booking.id);
      const mine = await library.listForStudent(students[0].id);
      expect(mine.recordings[0]).toMatchObject({
        key: booking.id,
        kind: 'BOOKING',
        title: 'Class with ms karim',
      });
    });

    it('lists the newest class first', async () => {
      const older = await makeLesson(students[0], teacher, 1);
      await prisma.scheduledLesson.update({
        where: { id: older.id },
        data: {
          start: new Date(Date.now() - 7 * 86_400_000),
          end: new Date(Date.now() - 7 * 86_400_000 + 2_700_000),
        },
      });
      const newer = await makeLesson(students[0], teacher, 2);
      await uploadedPart(lessonRoom(older));
      await uploadedPart(lessonRoom(newer));
      const keys = (
        await library.listForStudent(students[0].id)
      ).recordings.map((r) => r.key);
      expect(keys).toEqual([lessonRoom(newer), lessonRoom(older)]);
    });

    it('lets the QA demo student see the demo classroom’s recordings, and nobody else', async () => {
      const demoTeacher = await makeUser(prisma, 'demo-teacher', Role.TEACHER, {
        email: DEMO_TEACHER_EMAIL,
      });
      const demoStudent = await makeUser(prisma, 'demo-student', Role.STUDENT, {
        email: DEMO_STUDENT_EMAIL,
      });
      const part = await uploadedPart(DEMO_ROOM_NAME, { by: demoTeacher });

      const seen = await library.listForStudent(
        demoStudent.id,
        DEMO_STUDENT_EMAIL,
      );
      expect(seen.recordings).toHaveLength(1);
      expect(seen.recordings[0]).toMatchObject({
        key: DEMO_ROOM_NAME,
        kind: 'DEMO',
        parts: [{ id: part, part: 1 }],
      });
      expect(
        (await library.listForStudent(students[0].id, 'someone@else.com'))
          .recordings,
      ).toEqual([]);
    });
  });

  // ─── Who may watch ─────────────────────────────────────────────────────────

  describe('watching one recording', () => {
    const asStudent = (p: Person) => ({
      userId: p.id,
      role: 'STUDENT',
      email: p.email,
    });

    it('gives a student of the class a signed, expiring URL', async () => {
      const room = lessonRoom(await makeLesson(students[0]));
      const id = await uploadedPart(room);

      const playback = await library.playback(asStudent(students[0]), id);

      const url = new URL(playback.url);
      expect(url.pathname).toBe(
        `/lumexa-recordings/recordings/${room}/${id}.webm`,
      );
      expect(url.searchParams.get('X-Amz-Expires')).toBe('7200');
      expect(url.searchParams.get('X-Amz-Signature')).toBeTruthy();
      expect(playback.expiresAt.getTime()).toBeGreaterThan(Date.now());
      expect(playback.durationSeconds).toBe(600);
      // Nothing secret is in what the student receives.
      expect(JSON.stringify(playback)).not.toContain('a-test-secret-key');
    });

    it('is "not found" for a student who is not in the class — exactly as for a recording that does not exist', async () => {
      const room = lessonRoom(await makeLesson(students[0]));
      const id = await uploadedPart(room);
      const caught = (p: Promise<unknown>) => p.catch((e: unknown) => e);
      const [stranger, missing] = await Promise.all([
        caught(library.playback(asStudent(students[1]), id)),
        caught(library.playback(asStudent(students[1]), randomUUID())),
      ]);
      expect(stranger).toBeInstanceOf(NotFoundException);
      expect(missing).toBeInstanceOf(NotFoundException);
      // The same answer either way: nothing says whether it exists.
      expect((stranger as Error).message).toBe((missing as Error).message);
      expect((stranger as Error).message).toBe('Recording not found.');
    });

    it('lets every student of a batch watch their class, and no one else', async () => {
      const fx = await createBatchWithSession(prisma, {
        teacherProfileId: teacher.profileId!,
        courseId,
        studentUserIds: [students[0].id, students[1].id],
        start: slot,
        lessonNumber: 2,
      });
      const id = await uploadedPart(roomForBatchSession(fx.sessionId));
      await expect(
        library.playback(asStudent(students[0]), id),
      ).resolves.toBeDefined();
      await expect(
        library.playback(asStudent(students[1]), id),
      ).resolves.toBeDefined();
      await expect(
        library.playback(asStudent(students[2]), id),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('a student whose place in the class was cancelled can no longer watch it', async () => {
      const fx = await createBatchWithSession(prisma, {
        teacherProfileId: teacher.profileId!,
        courseId,
        studentUserIds: [students[0].id, students[1].id],
        start: slot,
        lessonNumber: 2,
      });
      const id = await uploadedPart(roomForBatchSession(fx.sessionId));
      await prisma.scheduledLesson.update({
        where: { id: fx.lessonIds[students[1].id] },
        data: { status: LessonStatus.CANCELLED },
      });
      await expect(
        library.playback(asStudent(students[1]), id),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lets the class’s teacher, the teacher who recorded it, and an admin watch — not another teacher', async () => {
      const room = lessonRoom(await makeLesson(students[0]));
      const id = await uploadedPart(room);
      const as = (p: Person, role: string) => ({
        userId: p.id,
        role,
        email: p.email,
      });
      await expect(
        library.playback(as(teacher, 'TEACHER'), id),
      ).resolves.toBeDefined();
      await expect(
        library.playback(as(admin, 'ADMIN'), id),
      ).resolves.toBeDefined();
      await expect(
        library.playback(as(otherTeacher, 'TEACHER'), id),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('is only for a recording that has been uploaded and checked', async () => {
      const room = lessonRoom(await makeLesson(students[0]));
      const { segment } = await recording.startSegment(room, teacher.id);
      await recording.stopSegment(room, teacher.id, segment.id);
      const asAdmin = { userId: admin.id, role: 'ADMIN' };
      // Even an admin: there is no file to watch yet.
      await expect(
        library.playback(asAdmin, segment.id),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('a booking’s student and the parent of the booked child may watch it', async () => {
      const kid = await prisma.student.create({
        data: { parentId: parent.id, name: 'Kid', age: 9 },
      });
      const booking = await makeBooking(null, kid);
      const id = await uploadedPart(booking.id);
      const other = await makeUser(prisma, 'other-parent', Role.PARENT);

      await expect(
        library.playback({ userId: parent.id, role: 'PARENT' }, id),
      ).resolves.toBeDefined();
      await expect(
        library.playback({ userId: other.id, role: 'PARENT' }, id),
      ).rejects.toBeInstanceOf(NotFoundException);
      // A student with their own account who was not booked cannot.
      await expect(
        library.playback(asStudent(students[0]), id),
      ).rejects.toBeInstanceOf(NotFoundException);

      const own = await makeBooking(students[1]);
      const ownId = await uploadedPart(own.id);
      await expect(
        library.playback(asStudent(students[1]), ownId),
      ).resolves.toBeDefined();
    });

    it('lists a booked class’s watchable parts for its parent and student, and for no one outside it', async () => {
      const kid = await prisma.student.create({
        data: { parentId: parent.id, name: 'Kid', age: 9 },
      });
      const booking = await makeBooking(null, kid);
      const first = await uploadedPart(booking.id);
      const second = await uploadedPart(booking.id);
      // A part still on its way to storage is not there to watch yet.
      const { segment: waiting } = await recording.startSegment(
        booking.id,
        teacher.id,
      );
      await recording.stopSegment(booking.id, teacher.id, waiting.id);

      const asParent = { userId: parent.id, role: 'PARENT' };
      const mine = await library.listForBooking(asParent, booking.id);
      expect(mine.parts.map((p) => [p.id, p.part])).toEqual([
        [first, 1],
        [second, 2],
      ]);
      expect(mine.parts[0].durationSeconds).toBe(600);
      expect(mine.parts[0].sizeBytes).toBe(1_000);

      const stranger = await makeUser(prisma, 'other-parent', Role.PARENT);
      const noParts = { parts: [] };
      expect(
        await library.listForBooking(
          { userId: stranger.id, role: 'PARENT' },
          booking.id,
        ),
      ).toEqual(noParts);
      expect(
        await library.listForBooking(asStudent(students[0]), booking.id),
      ).toEqual(noParts);
      expect(
        await library.listForBooking(
          { userId: otherTeacher.id, role: 'TEACHER' },
          booking.id,
        ),
      ).toEqual(noParts);
      // An unknown booking looks exactly like a class nobody recorded.
      expect(await library.listForBooking(asParent, randomUUID())).toEqual(
        noParts,
      );

      // The teacher who recorded it, and an admin, see the parts.
      const asTeacher = { userId: teacher.id, role: 'TEACHER' };
      const asAdmin = { userId: admin.id, role: 'ADMIN' };
      expect(
        (await library.listForBooking(asTeacher, booking.id)).parts,
      ).toHaveLength(2);
      expect(
        (await library.listForBooking(asAdmin, booking.id)).parts,
      ).toHaveLength(2);

      // A student who booked on their own account sees their own class.
      const own = await makeBooking(students[1]);
      const ownId = await uploadedPart(own.id);
      expect(
        (
          await library.listForBooking(asStudent(students[1]), own.id)
        ).parts.map((p) => p.id),
      ).toEqual([ownId]);
    });

    it('is unavailable — not broken — while R2 is not set up', async () => {
      const room = lessonRoom(await makeLesson(students[0]));
      const id = await uploadedPart(room);
      unconfigureR2();
      await expect(
        library.playback(asStudent(students[0]), id),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });

    it('lets an admin see every part of a class, whatever its state', async () => {
      const lesson = await makeLesson(students[0]);
      const room = lessonRoom(lesson);
      const ok = await uploadedPart(room);
      const { segment } = await recording.startSegment(room, teacher.id);
      await recording.discardSegment(room, teacher.id, segment.id);

      const view = await library.listForClass('LESSON', lesson.id);

      expect(view.room).toBe(room);
      expect(view.storage).toEqual({ configured: true, missing: [] });
      expect(view.segments.map((s) => [s.id, s.part, s.status])).toEqual([
        [ok, 1, S.AVAILABLE],
        [segment.id, 2, S.FAILED],
      ]);
      expect(view.segments[1].failureReason).toBe(FAILURE_DISCARDED);
      await expect(
        library.listForClass('LESSON', randomUUID()),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // ─── The classroom: only its teacher, and the REC badge ───────────────────

  describe('through the classroom', () => {
    let classroom: ClassroomService;
    const client = {
      listRooms: jest.fn(() => Promise.resolve([] as { metadata?: string }[])),
      updateRoomMetadata: jest.fn(() => Promise.resolve()),
    };

    beforeEach(() => {
      client.listRooms.mockReset().mockResolvedValue([]);
      client.updateRoomMetadata.mockReset().mockResolvedValue(undefined);
      classroom = new ClassroomService(
        prisma,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        recording,
        {} as never,
        {} as never,
        {} as never,
        new RoomDirectoryService(prisma),
        {} as never,
        {} as never,
      );
      jest
        .spyOn(classroom as never, 'getRoomServiceClient')
        .mockReturnValue(client as never);
    });

    const flags = () =>
      client.updateRoomMetadata.mock.calls.map(
        (c) =>
          JSON.parse((c as unknown as [string, string])[1]) as {
            recording: boolean;
          },
      );

    it('only the class’s teacher can record it', async () => {
      const room = lessonRoom(await makeLesson(students[0]));
      for (const who of [otherTeacher, students[0]]) {
        await expect(
          classroom.startTeacherRecording(who.id, room, randomUUID()),
        ).rejects.toBeInstanceOf(ForbiddenException);
      }
      expect(await prisma.recordingSegment.count()).toBe(0);
    });

    it('shows everyone in the class that a recording is running — and that it stopped', async () => {
      const room = lessonRoom(await makeLesson(students[0]));
      const started = await classroom.startTeacherRecording(
        teacher.id,
        room,
        randomUUID(),
      );
      expect(started.ok).toBe(true);
      expect(flags()).toEqual([{ recording: true }]);

      await classroom.stopTeacherRecording(
        teacher.id,
        room,
        started.segment.id,
        {
          durationMs: 1000,
        },
      );
      expect(flags()).toEqual([{ recording: true }, { recording: false }]);
    });

    it('keeps the badge on while a second recording is still running', async () => {
      const room = lessonRoom(await makeLesson(students[0]));
      const a = await classroom.startTeacherRecording(
        teacher.id,
        room,
        randomUUID(),
      );
      await classroom.startTeacherRecording(teacher.id, room, randomUUID());
      await classroom.stopTeacherRecording(teacher.id, room, a.segment.id);
      expect(flags().at(-1)).toEqual({ recording: true });
    });

    it('a discarded running recording clears the badge', async () => {
      const room = lessonRoom(await makeLesson(students[0]));
      const a = await classroom.startTeacherRecording(
        teacher.id,
        room,
        randomUUID(),
      );
      await classroom.discardTeacherRecording(teacher.id, room, a.segment.id);
      expect(flags().at(-1)).toEqual({ recording: false });
    });

    it('recording does not depend on the badge: it works when the live room is unreachable', async () => {
      client.updateRoomMetadata.mockRejectedValue(new Error('no such room'));
      const room = lessonRoom(await makeLesson(students[0]));
      const started = await classroom.startTeacherRecording(
        teacher.id,
        room,
        randomUUID(),
      );
      expect(started.segment.status).toBe(S.RECORDING);
    });

    it('a free trial is not recorded', async () => {
      await expect(
        classroom.startTeacherRecording(teacher.id, 'trial-nothing'),
      ).rejects.toThrow();
    });
  });
});
