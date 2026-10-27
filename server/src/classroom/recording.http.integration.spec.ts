// The recording endpoints over real HTTP: the whole app is booted (every module,
// guard, pipe and filter exactly as in production) against a REAL Postgres, and
// requests are made with real login tokens. Only R2 is faked.
//
// This is what proves the routes are wired and guarded — that a student cannot
// start a recording, that a stranger cannot watch one, that a bad request is
// refused before it reaches the service — end to end, and that a teacher's
// Record → Stop → Upload → student-watches journey works through the API.
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
process.env.JWT_SECRET = 'http-spec-jwt-secret-that-is-long-enough';
process.env.LIVEKIT_API_KEY = 'test-key';
process.env.LIVEKIT_API_SECRET = 'test-secret-that-is-long-enough-for-hs256';
process.env.LIVEKIT_URL = 'wss://livekit.test';
process.env.STRIPE_SECRET_KEY ??= 'sk_test_not_a_real_key';
delete process.env.SMTP_USER;
delete process.env.SMTP_PASS;

import { randomUUID } from 'crypto';
import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage } from '@nestjs/throttler';
import type { ThrottlerStorageService } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../app.module';
import { AllExceptionsFilter } from '../filters/http-exception.filter';
import { makeCourse, makeUser } from '../batches/testing/batch-world';
import type { Person } from '../batches/testing/batch-world';
import { PrismaService } from '../prisma.service';
import { RecordingStorageService } from './recording-storage.service';
import {
  MemoryRecordingStorage,
  TEST_R2_ENV,
} from './testing/memory-recording-storage';

const describeDb = IT_DB_URL ? describe : describe.skip;

// The shapes of the JSON the endpoints answer with (all the spec reads).
interface SegmentBody {
  id: string;
  status: string;
  durationSeconds: number | null;
  sizeBytes: number | null;
  failureReason: string | null;
  part?: number;
}
interface StartBody {
  ok: boolean;
  segment: SegmentBody;
  maxDurationMinutes: number;
  storage: { configured: boolean; missing: string[] };
}
interface SegmentResponse {
  segment: SegmentBody;
}
interface SegmentsBody {
  segments: SegmentBody[];
}
interface UploadUrlBody {
  ok: boolean;
  uploadUrl: string;
  method: string;
  headers: Record<string, string>;
}
interface MessageBody {
  message: string;
}
interface MineBody {
  recordings: unknown[];
  processingCount: number;
}
interface PlaybackBody {
  url: string;
  durationSeconds: number | null;
}
interface BookingBody {
  parts: { id: string; part: number; durationSeconds: number | null }[];
}
interface ClassBody extends SegmentsBody {
  room: string;
  storage: { configured: boolean; missing: string[] };
}

/** The JSON body of a response, as the shape the spec expects. */
const body = <T>(res: request.Response): T => res.body as T;

describeDb('Recording endpoints (real app and Postgres, R2 faked)', () => {
  jest.setTimeout(180_000);

  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;
  const storage = new MemoryRecordingStorage();
  let releaseLock: () => void;

  let teacher: Person;
  let otherTeacher: Person;
  let admin: Person;
  let student: Person;
  let stranger: Person;
  let room: string;
  let lessonId: string;

  const token = (p: Person) =>
    jwt.sign({ sub: p.id, email: p.email, role: p.role });
  const as = (p: Person) => ({ Authorization: `Bearer ${token(p)}` });
  const http = () => request(app.getHttpServer() as App);

  /** The app's rate limit (20 a minute per route) is real. This suite shares one
   * app and makes more calls than that within a minute, so each test starts with
   * the counters cleared. (The pending expiry timers go first: they would look
   * up counters that no longer exist.) */
  function clearRateLimits() {
    const limiter = app.get<ThrottlerStorageService>(ThrottlerStorage);
    limiter.onApplicationShutdown();
    limiter.storage.clear();
  }

  beforeAll(async () => {
    releaseLock = await acquireDatabaseLock(IT_DB_URL!);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
    Object.assign(process.env, TEST_R2_ENV);

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(RecordingStorageService)
      .useValue(storage)
      .compile();
    app = moduleRef.createNestApplication();
    // The same pipe and filter as main.ts.
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
    prisma = app.get(PrismaService);
    jwt = new JwtService({ secret: process.env.JWT_SECRET });
  });

  afterAll(async () => {
    await app?.close();
    jest.restoreAllMocks();
    releaseLock?.();
  });

  beforeEach(async () => {
    clearRateLimits();
    storage.objects.clear();
    storage.deleted = [];
    storage.down = false;
    Object.assign(process.env, TEST_R2_ENV);
    await truncateAssessmentData(prisma);
    await prisma.recordingSegment.deleteMany();

    teacher = await makeUser(prisma, 'ms-karim', Role.TEACHER);
    otherTeacher = await makeUser(prisma, 'mr-hasan', Role.TEACHER);
    admin = await makeUser(prisma, 'ops-admin', Role.ADMIN);
    student = await makeUser(prisma, 'ada-student', Role.STUDENT);
    stranger = await makeUser(prisma, 'ben-student', Role.STUDENT);
    const course = await makeCourse(prisma, 'http-course');
    const start = new Date(Date.now() + 5 * 60_000);
    const lesson = await prisma.scheduledLesson.create({
      data: {
        studentUserId: student.id,
        teacherId: teacher.profileId!,
        courseId: course.id,
        lessonNumber: 2,
        start,
        end: new Date(start.getTime() + 45 * 60_000),
        classType: 'ONE_TO_ONE',
      },
    });
    lessonId = lesson.id;
    room = `lesson-${lesson.id}`;
  });

  const recordingPath = (suffix = '') =>
    `/classroom/${room}/recording${suffix}`;

  /** Record → Stop → Upload → confirm, through the API. */
  async function uploadPart(size = 5_000): Promise<string> {
    const segmentId = randomUUID();
    await http()
      .post(recordingPath('/start'))
      .set(as(teacher))
      .send({ segmentId })
      .expect(201);
    await http()
      .post(recordingPath(`/${segmentId}/stop`))
      .set(as(teacher))
      .send({ durationMs: 90_000 })
      .expect(201);
    await http()
      .post(recordingPath(`/${segmentId}/upload-url`))
      .set(as(teacher))
      .send({ sizeBytes: size })
      .expect(201);
    const seg = await prisma.recordingSegment.findUniqueOrThrow({
      where: { id: segmentId },
    });
    storage.put(seg.storagePath!, size);
    await http()
      .post(recordingPath(`/${segmentId}/complete`))
      .set(as(teacher))
      .send({ sizeBytes: size })
      .expect(201);
    return segmentId;
  }

  // ─── The teacher's journey ────────────────────────────────────────────────

  describe('a teacher records and uploads a class', () => {
    it('Record → Stop → Upload URL → Complete, and the class then has a recording', async () => {
      const segmentId = randomUUID();

      const start = await http()
        .post(recordingPath('/start'))
        .set(as(teacher))
        .send({ segmentId })
        .expect(201);
      expect(start.headers['cache-control']).toBe('no-store');
      expect(start.body).toMatchObject({
        ok: true,
        segment: { id: segmentId, status: 'RECORDING' },
        maxDurationMinutes: 70,
        storage: { configured: true, missing: [] },
      });

      const stop = await http()
        .post(recordingPath(`/${segmentId}/stop`))
        .set(as(teacher))
        .send({ durationMs: 61_500, mimeType: 'video/webm;codecs=vp8,opus' })
        .expect(201);
      expect(body<SegmentResponse>(stop).segment).toMatchObject({
        status: 'UPLOADING',
        durationSeconds: 62,
      });

      const urlRes = await http()
        .post(recordingPath(`/${segmentId}/upload-url`))
        .set(as(teacher))
        .send({ sizeBytes: 9_000 })
        .expect(201);
      expect(urlRes.headers['cache-control']).toBe('no-store');
      expect(urlRes.body).toMatchObject({
        ok: true,
        method: 'PUT',
        headers: { 'Content-Type': 'video/webm' },
      });
      const put = new URL(body<UploadUrlBody>(urlRes).uploadUrl);
      expect(put.pathname).toBe(
        `/lumexa-recordings/recordings/${room}/${segmentId}.webm`,
      );
      // The signed URL is the only thing handed out: no credentials anywhere.
      expect(JSON.stringify(urlRes.body)).not.toContain(
        TEST_R2_ENV.R2_SECRET_ACCESS_KEY,
      );

      // The browser has not uploaded yet: the server does not believe it.
      await http()
        .post(recordingPath(`/${segmentId}/complete`))
        .set(as(teacher))
        .send({ sizeBytes: 9_000 })
        .expect(409);

      storage.put(`recordings/${room}/${segmentId}.webm`, 9_000);
      const done = await http()
        .post(recordingPath(`/${segmentId}/complete`))
        .set(as(teacher))
        .send({ sizeBytes: 9_000 })
        .expect(201);
      expect(body<SegmentResponse>(done).segment).toMatchObject({
        status: 'AVAILABLE',
        sizeBytes: 9_000,
      });
      // A repeat is harmless.
      await http()
        .post(recordingPath(`/${segmentId}/complete`))
        .set(as(teacher))
        .send({ sizeBytes: 9_000 })
        .expect(201);

      const list = await http()
        .get(recordingPath('/segments'))
        .set(as(teacher))
        .expect(200);
      expect(body<SegmentsBody>(list).segments).toHaveLength(1);
      expect(body<SegmentsBody>(list).segments[0]).toMatchObject({
        id: segmentId,
        status: 'AVAILABLE',
      });
      // What the browser sees never includes where the file is kept.
      expect(JSON.stringify(list.body)).not.toContain('recordings/');
    });

    it('works without a body at all (an older browser tab)', async () => {
      const res = await http()
        .post(recordingPath('/start'))
        .set(as(teacher))
        .expect(201);
      expect(body<StartBody>(res).segment.status).toBe('RECORDING');
    });

    it('recording again makes a second part; both are kept', async () => {
      const a = await uploadPart(1_000);
      const b = await uploadPart(2_000);
      expect(a).not.toBe(b);
      const list = await http()
        .get(recordingPath('/segments'))
        .set(as(teacher))
        .expect(200);
      expect(body<SegmentsBody>(list).segments.map((s) => s.id)).toEqual([
        a,
        b,
      ]);
    });

    it('explains a missing R2 setting when uploading — recording itself still starts', async () => {
      delete process.env.R2_BUCKET;
      const segmentId = randomUUID();
      const start = await http()
        .post(recordingPath('/start'))
        .set(as(teacher))
        .send({ segmentId })
        .expect(201);
      expect(body<StartBody>(start).storage).toEqual({
        configured: false,
        missing: ['R2_BUCKET'],
      });
      const res = await http()
        .post(recordingPath(`/${segmentId}/upload-url`))
        .set(as(teacher))
        .send({ sizeBytes: 10 })
        .expect(400);
      expect(body<MessageBody>(res).message).toContain('R2_BUCKET');
    });

    it('gives a recording up', async () => {
      const segmentId = randomUUID();
      await http()
        .post(recordingPath('/start'))
        .set(as(teacher))
        .send({ segmentId })
        .expect(201);
      const res = await http()
        .post(recordingPath(`/${segmentId}/discard`))
        .set(as(teacher))
        .expect(201);
      expect(body<SegmentResponse>(res).segment.status).toBe('FAILED');
    });
  });

  // ─── Who may do what ──────────────────────────────────────────────────────

  describe('who may record', () => {
    it('needs a login', async () => {
      await http().post(recordingPath('/start')).expect(401);
      await http().get(recordingPath('/segments')).expect(401);
      await http().get(`/recordings/mine`).expect(401);
      await http().get(`/recordings/${randomUUID()}/playback`).expect(401);
    });

    it('is refused to a student of the class and to another teacher', async () => {
      await http().post(recordingPath('/start')).set(as(student)).expect(403);
      await http()
        .post(recordingPath('/start'))
        .set(as(otherTeacher))
        .expect(403);
      await http().get(recordingPath('/segments')).set(as(student)).expect(403);
      expect(await prisma.recordingSegment.count()).toBe(0);
    });

    it('another teacher cannot upload, confirm or discard the teacher’s recording', async () => {
      const segmentId = randomUUID();
      await http()
        .post(recordingPath('/start'))
        .set(as(teacher))
        .send({ segmentId })
        .expect(201);
      // Not the class's teacher: refused before the recording is even looked at.
      for (const [path, body] of [
        [`/${segmentId}/stop`, {}],
        [`/${segmentId}/upload-url`, { sizeBytes: 10 }],
        [`/${segmentId}/complete`, { sizeBytes: 10 }],
        [`/${segmentId}/discard`, {}],
      ] as const) {
        await http()
          .post(recordingPath(path))
          .set(as(otherTeacher))
          .send(body)
          .expect(403);
      }
    });

    it('the retired routes are gone', async () => {
      await http().post(recordingPath('/stop')).set(as(teacher)).expect(404);
    });
  });

  describe('bad requests are refused before they reach the recording', () => {
    it('start', async () => {
      await http()
        .post(recordingPath('/start'))
        .set(as(teacher))
        .send({ segmentId: 'not-a-uuid' })
        .expect(400);
      await http()
        .post(recordingPath('/start'))
        .set(as(teacher))
        .send({ segmentId: randomUUID(), sneaky: 1 })
        .expect(400);
    });

    it('a malformed segment id in the path', async () => {
      await http()
        .post(recordingPath('/nope/stop'))
        .set(as(teacher))
        .send({})
        .expect(400);
    });

    it('upload URL and completion need a real size', async () => {
      const segmentId = randomUUID();
      await http()
        .post(recordingPath('/start'))
        .set(as(teacher))
        .send({ segmentId })
        .expect(201);
      for (const bad of [
        {},
        { sizeBytes: 0 },
        { sizeBytes: -1 },
        { sizeBytes: '5' },
        { sizeBytes: 3e9 },
      ]) {
        await http()
          .post(recordingPath(`/${segmentId}/upload-url`))
          .set(as(teacher))
          .send(bad)
          .expect(400);
        await http()
          .post(recordingPath(`/${segmentId}/complete`))
          .set(as(teacher))
          .send(bad)
          .expect(400);
      }
    });

    it('a recording that does not exist, or belongs to another class, is simply not found', async () => {
      await http()
        .post(recordingPath(`/${randomUUID()}/stop`))
        .set(as(teacher))
        .send({})
        .expect(404);
    });
  });

  // ─── The student's side ───────────────────────────────────────────────────

  describe('a student watches the recording', () => {
    it('sees it in their list and gets a signed URL to stream it', async () => {
      const part = await uploadPart(7_000);

      const mine = await http()
        .get('/recordings/mine')
        .set(as(student))
        .expect(200);
      expect(mine.headers['cache-control']).toBe('no-store');
      expect(body<MineBody>(mine).processingCount).toBe(0);
      expect(body<MineBody>(mine).recordings).toHaveLength(1);
      expect(body<MineBody>(mine).recordings[0]).toMatchObject({
        kind: 'LESSON',
        title: 'Lesson 2: Lesson 2',
        teacherName: 'ms karim',
        parts: [{ id: part, part: 1, durationSeconds: 90 }],
        legacyUrl: null,
      });
      // The list never exposes where the file is kept.
      expect(JSON.stringify(mine.body)).not.toContain('recordings/');
      expect(JSON.stringify(mine.body)).not.toContain('r2.cloudflarestorage');

      const play = await http()
        .get(`/recordings/${part}/playback`)
        .set(as(student))
        .expect(200);
      expect(play.headers['cache-control']).toBe('no-store');
      const url = new URL(body<PlaybackBody>(play).url);
      expect(url.host).toBe('acct123.r2.cloudflarestorage.com');
      expect(url.pathname).toBe(
        `/lumexa-recordings/recordings/${room}/${part}.webm`,
      );
      expect(url.searchParams.get('X-Amz-Expires')).toBe('7200');
      expect(body<PlaybackBody>(play).durationSeconds).toBe(90);
      expect(JSON.stringify(play.body)).not.toContain(
        TEST_R2_ENV.R2_SECRET_ACCESS_KEY,
      );
    });

    it('a student who is not in the class sees nothing and cannot watch it', async () => {
      const part = await uploadPart();
      const theirs = await http()
        .get('/recordings/mine')
        .set(as(stranger))
        .expect(200);
      expect(theirs.body).toEqual({ recordings: [], processingCount: 0 });
      const res = await http()
        .get(`/recordings/${part}/playback`)
        .set(as(stranger))
        .expect(404);
      // Exactly the answer for a recording that does not exist.
      const missing = await http()
        .get(`/recordings/${randomUUID()}/playback`)
        .set(as(stranger))
        .expect(404);
      expect(body<MessageBody>(res).message).toBe(
        body<MessageBody>(missing).message,
      );
    });

    it('a recording still being uploaded is not offered — only counted', async () => {
      const segmentId = randomUUID();
      await http()
        .post(recordingPath('/start'))
        .set(as(teacher))
        .send({ segmentId })
        .expect(201);
      await http()
        .post(recordingPath(`/${segmentId}/stop`))
        .set(as(teacher))
        .send({})
        .expect(201);
      const mine = await http()
        .get('/recordings/mine')
        .set(as(student))
        .expect(200);
      expect(mine.body).toEqual({ recordings: [], processingCount: 1 });
      await http()
        .get(`/recordings/${segmentId}/playback`)
        .set(as(student))
        .expect(404);
    });

    it('only a student has “my recordings”', async () => {
      await http().get('/recordings/mine').set(as(teacher)).expect(403);
      await http().get('/recordings/mine').set(as(admin)).expect(403);
    });

    it('the teacher and an admin can watch it too; another teacher cannot', async () => {
      const part = await uploadPart();
      await http()
        .get(`/recordings/${part}/playback`)
        .set(as(teacher))
        .expect(200);
      await http()
        .get(`/recordings/${part}/playback`)
        .set(as(admin))
        .expect(200);
      await http()
        .get(`/recordings/${part}/playback`)
        .set(as(otherTeacher))
        .expect(404);
    });

    it('a malformed recording id is a bad request, not a crash', async () => {
      await http()
        .get('/recordings/not-a-uuid/playback')
        .set(as(student))
        .expect(400);
    });

    it('a parent finds their child’s booked class recording, and gets a signed URL for it', async () => {
      const parent = await makeUser(prisma, 'a-parent', Role.PARENT);
      const otherParent = await makeUser(prisma, 'other-parent', Role.PARENT);
      const kid = await prisma.student.create({
        data: { parentId: parent.id, name: 'Kid', age: 9 },
      });
      const start = new Date(Date.now() + 5 * 60_000);
      const shift = await prisma.shift.create({
        data: {
          teacherId: teacher.profileId!,
          start,
          end: new Date(start.getTime() + 45 * 60_000),
        },
      });
      const booking = await prisma.booking.create({
        data: { shiftId: shift.id, studentId: kid.id },
      });
      room = booking.id; // a booking's classroom is the booking
      const part = await uploadPart();

      const list = await http()
        .get(`/recordings/booking/${booking.id}`)
        .set(as(parent))
        .expect(200);
      expect(list.headers['cache-control']).toBe('no-store');
      expect(body<BookingBody>(list).parts.map((p) => [p.id, p.part])).toEqual([
        [part, 1],
      ]);

      const played = await http()
        .get(`/recordings/${part}/playback`)
        .set(as(parent))
        .expect(200);
      expect(new URL(body<PlaybackBody>(played).url).pathname).toBe(
        `/lumexa-recordings/recordings/${booking.id}/${part}.webm`,
      );

      // Another family: an empty list (as for any class nobody recorded), and
      // no way to watch.
      const theirs = await http()
        .get(`/recordings/booking/${booking.id}`)
        .set(as(otherParent))
        .expect(200);
      expect(body<BookingBody>(theirs).parts).toEqual([]);
      await http()
        .get(`/recordings/${part}/playback`)
        .set(as(otherParent))
        .expect(404);

      await http().get(`/recordings/booking/${booking.id}`).expect(401);
      await http()
        .get('/recordings/booking/not-a-uuid')
        .set(as(parent))
        .expect(400);
    });

    it('says plainly when playback is unavailable, instead of failing oddly', async () => {
      const part = await uploadPart();
      delete process.env.R2_ACCOUNT_ID;
      const res = await http()
        .get(`/recordings/${part}/playback`)
        .set(as(student))
        .expect(503);
      expect(body<MessageBody>(res).message).toMatch(/cannot be played/);
    });
  });

  // ─── The admin's view ─────────────────────────────────────────────────────

  describe('an admin looks at a class', () => {
    it('sees every part and its state', async () => {
      const ok = await uploadPart();
      const dropped = randomUUID();
      await http()
        .post(recordingPath('/start'))
        .set(as(teacher))
        .send({ segmentId: dropped })
        .expect(201);
      await http()
        .post(recordingPath(`/${dropped}/discard`))
        .set(as(teacher))
        .expect(201);

      const res = await http()
        .get(`/recordings/classes/LESSON/${lessonId}`)
        .set(as(admin))
        .expect(200);
      expect(body<ClassBody>(res).room).toBe(room);
      expect(body<ClassBody>(res).storage).toEqual({
        configured: true,
        missing: [],
      });
      expect(
        body<ClassBody>(res).segments.map((s) => [s.id, s.part, s.status]),
      ).toEqual([
        [ok, 1, 'AVAILABLE'],
        [dropped, 2, 'FAILED'],
      ]);
    });

    it('is for admins only, and only for a known kind of class', async () => {
      await http()
        .get(`/recordings/classes/LESSON/${lessonId}`)
        .set(as(teacher))
        .expect(403);
      await http()
        .get(`/recordings/classes/LESSON/${lessonId}`)
        .set(as(student))
        .expect(403);
      await http()
        .get(`/recordings/classes/NONSENSE/${lessonId}`)
        .set(as(admin))
        .expect(400);
      await http()
        .get(`/recordings/classes/LESSON/${randomUUID()}`)
        .set(as(admin))
        .expect(404);
    });

    it('the old “retry the merge” action no longer exists', async () => {
      await http()
        .post(`/admin/classes/LESSON/${lessonId}/recording-retry`)
        .set(as(admin))
        .expect(404);
    });
  });

  // ─── The live classroom is untouched ──────────────────────────────────────

  describe('the live classroom', () => {
    it('still answers its own routes (the webhook accepts a call and always replies 200)', async () => {
      await http().post('/classroom/webhook/livekit').send({}).expect(200);
    });

    it('the teacher’s other classroom controls are still behind the same guard', async () => {
      await http().post(`/classroom/${room}/mute-all`).expect(401);
      await http()
        .post(`/classroom/${room}/mute-all`)
        .set(as(student))
        .expect(403);
    });
  });
});
