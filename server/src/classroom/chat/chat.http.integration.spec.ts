// The saved classroom chat over real HTTP: the whole app is booted (every module,
// guard, pipe and filter exactly as in production) against a REAL Postgres, with
// real login tokens, real batches, members and sessions. Only the R2 bucket is
// faked (in memory).
//
// This is where the rules of who keeps / sees which conversation are proven end to
// end: a 1:1 conversation survives a curriculum change but not a new teacher; a
// batch's survives a curriculum change, a student who leaves cannot read it, a late
// joiner starts empty, a new batch teacher starts a fresh one; only the teacher
// deletes; the lock holds on the server.
//
// Skipped unless ASSESSMENT_INTEGRATION_DATABASE_URL points at a throwaway, fully
// migrated database — see ../../assessments/testing/integration-db.ts.

import 'reflect-metadata';
import {
  IT_DB_URL,
  acquireDatabaseLock,
  truncateAssessmentData,
  useIntegrationDatabase,
} from '../../assessments/testing/integration-db';

useIntegrationDatabase();
process.env.JWT_SECRET = 'http-spec-jwt-secret-that-is-long-enough';
process.env.STRIPE_SECRET_KEY ??= 'sk_test_not_a_real_key';
delete process.env.SMTP_USER;
delete process.env.SMTP_PASS;

import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage } from '@nestjs/throttler';
import type { ThrottlerStorageService } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../../app.module';
import { AllExceptionsFilter } from '../../filters/http-exception.filter';
import { makeCourse, makeUser } from '../../batches/testing/batch-world';
import type { Person } from '../../batches/testing/batch-world';
import { PrismaService } from '../../prisma.service';
import { DailyRoomsService } from '../daily-rooms.service';
import { CHAT_STORAGE } from './chat-storage.service';
import { MemoryChatStorage } from './testing/memory-chat-storage';

const describeDb = IT_DB_URL ? describe : describe.skip;

interface HistoryBody {
  enabled: boolean;
  hasMore: boolean;
  messages: {
    id: string;
    text: string;
    fromUserId: string;
    fromRole: string;
  }[];
}

describeDb('Saved chat (real app and Postgres, R2 faked)', () => {
  jest.setTimeout(180_000);

  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;
  const storage = new MemoryChatStorage();
  let releaseLock: () => void;
  let chatLocked = false;

  let t1: Person;
  let t2: Person;
  let admin: Person;
  let ada: Person;
  let ben: Person;
  let cy: Person;
  let stranger: Person;
  let courseA: { id: string };
  let courseB: { id: string };
  let seq = 0;

  const as = (p: Person) => ({
    Authorization: `Bearer ${jwt.sign({ sub: p.id, email: p.email, role: p.role })}`,
  });
  const http = () => request(app.getHttpServer() as App);

  function clearRateLimits() {
    const limiter = app.get<ThrottlerStorageService>(ThrottlerStorage);
    limiter.onApplicationShutdown();
    limiter.storage.clear();
  }

  beforeAll(async () => {
    releaseLock = await acquireDatabaseLock(IT_DB_URL!);
    for (const level of ['log', 'warn', 'error', 'debug'] as const) {
      jest.spyOn(Logger.prototype, level).mockImplementation(() => undefined);
    }
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(CHAT_STORAGE)
      .useValue(storage)
      .compile();
    app = moduleRef.createNestApplication();
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
    // The lock lives in Daily's shared state; here it is a switch.
    jest
      .spyOn(app.get(DailyRoomsService), 'getClassState')
      .mockImplementation(() =>
        Promise.resolve(chatLocked ? { chatLocked: true } : {}),
      );
  });

  afterAll(async () => {
    await app?.close();
    jest.restoreAllMocks();
    releaseLock?.();
  });

  beforeEach(async () => {
    clearRateLimits();
    storage.objects.clear();
    storage.down = false;
    storage.configured = true;
    chatLocked = false;
    await truncateAssessmentData(prisma);
    t1 = await makeUser(prisma, 'ms-karim', Role.TEACHER);
    t2 = await makeUser(prisma, 'mr-hasan', Role.TEACHER);
    admin = await makeUser(prisma, 'ops-admin', Role.ADMIN);
    ada = await makeUser(prisma, 'ada-student', Role.STUDENT);
    ben = await makeUser(prisma, 'ben-student', Role.STUDENT);
    cy = await makeUser(prisma, 'cy-student', Role.STUDENT);
    stranger = await makeUser(prisma, 'zed-student', Role.STUDENT);
    courseA = await makeCourse(prisma, 'python-basics');
    courseB = await makeCourse(prisma, 'web-basics');
  });

  // ─── Fixtures ──────────────────────────────────────────────────────────────

  async function oneToOneRoom(
    teacher: Person,
    student: Person,
    courseId: string,
  ) {
    const start = new Date(Date.now() + 5 * 60_000 + seq++ * 3_600_000);
    const lesson = await prisma.scheduledLesson.create({
      data: {
        studentUserId: student.id,
        teacherId: teacher.profileId!,
        courseId,
        lessonNumber: 1 + seq,
        start,
        end: new Date(start.getTime() + 45 * 60_000),
        classType: 'ONE_TO_ONE',
      },
    });
    return `lesson-${lesson.id}`;
  }

  async function makeBatch(
    teacher: Person,
    courseId: string,
    members: Person[],
  ) {
    const batch = await prisma.batch.create({
      data: {
        name: `Batch ${seq++}`,
        teacherId: teacher.profileId!,
        courseId,
        startDate: '2026-01-01',
      },
    });
    for (const m of members) {
      await prisma.batchMember.create({
        data: {
          batchId: batch.id,
          studentUserId: m.id,
          // Long ago: "started from the beginning".
          joinedAt: new Date(Date.now() - 90 * 24 * 3_600_000),
        },
      });
    }
    return batch;
  }

  /** One class of the batch, taught by `teacher` (a session keeps its own teacher),
   * with a participant row for each of `students`. */
  async function batchClassRoom(
    batch: { id: string },
    teacher: Person,
    courseId: string,
    students: Person[],
  ) {
    const start = new Date(Date.now() + 5 * 60_000 + seq++ * 3_600_000);
    const end = new Date(start.getTime() + 60 * 60_000);
    const lessonNumber = 1 + seq++;
    const session = await prisma.batchSession.create({
      data: {
        batchId: batch.id,
        teacherId: teacher.profileId!,
        courseId,
        lessonNumber,
        start,
        end,
      },
    });
    for (const s of students) {
      await prisma.scheduledLesson.create({
        data: {
          studentUserId: s.id,
          teacherId: teacher.profileId!,
          courseId,
          lessonNumber,
          start,
          end,
          classType: 'BATCH',
          batchId: batch.id,
          batchSessionId: session.id,
        },
      });
    }
    return `batch-session-${session.id}`;
  }

  const say = (who: Person, room: string, id: string, text: string) =>
    http().post(`/classroom/${room}/chat`).set(as(who)).send({ id, text });
  const read = async (who: Person, room: string) => {
    const res = await http().get(`/classroom/${room}/chat`).set(as(who));
    return res;
  };
  const texts = async (who: Person, room: string) => {
    const res = await read(who, room).then((r) => {
      expect(r.status).toBe(200);
      return r;
    });
    return (res.body as HistoryBody).messages.map((m) => m.text);
  };

  // ─── 1:1 ───────────────────────────────────────────────────────────────────

  describe('1:1 class', () => {
    it('keeps the conversation across a new curriculum with the same teacher; a new teacher starts empty', async () => {
      const py = await oneToOneRoom(t1, ada, courseA.id);
      await say(t1, py, 'm1', 'Welcome to Python!').expect(201);
      await say(ada, py, 'm2', 'Thanks sir').expect(201);

      // Ada moves to another program but keeps Ms Karim.
      const web = await oneToOneRoom(t1, ada, courseB.id);
      expect(await texts(ada, web)).toEqual([
        'Welcome to Python!',
        'Thanks sir',
      ]);
      expect(await texts(t1, web)).toEqual([
        'Welcome to Python!',
        'Thanks sir',
      ]);

      // Ada is given a new teacher: empty, and the old teacher's words are not shown.
      const withNew = await oneToOneRoom(t2, ada, courseB.id);
      expect(await texts(ada, withNew)).toEqual([]);
      await say(t2, withNew, 'n1', 'Hello, I am your new teacher').expect(201);
      expect(await texts(ada, withNew)).toEqual([
        'Hello, I am your new teacher',
      ]);
      // …and the old conversation is untouched.
      expect(await texts(ada, web)).toEqual([
        'Welcome to Python!',
        'Thanks sir',
      ]);
    });

    it('is private: another student, another teacher and an admin are refused', async () => {
      const room = await oneToOneRoom(t1, ada, courseA.id);
      await say(ada, room, 'm1', 'hello').expect(201);
      for (const outsider of [stranger, t2, admin]) {
        await read(outsider, room).then((r) => expect(r.status).toBe(403));
        await say(outsider, room, 'x', 'hi').then((r) =>
          expect(r.status).toBe(403),
        );
      }
    });

    it('needs a login', async () => {
      const room = await oneToOneRoom(t1, ada, courseA.id);
      await http().get(`/classroom/${room}/chat`).expect(401);
    });

    it('stores sender, name and role from the server, ignoring anything the browser claims', async () => {
      const room = await oneToOneRoom(t1, ada, courseA.id);
      await http()
        .post(`/classroom/${room}/chat`)
        .set(as(ada))
        .send({ id: 'm1', text: 'hi', fromRole: 'TEACHER', fromUserId: t1.id })
        .expect(201);
      const [m] = ((await read(ada, room)).body as HistoryBody).messages;
      expect(m).toMatchObject({
        fromUserId: ada.id,
        fromRole: 'STUDENT',
        text: 'hi',
      });
    });
  });

  // ─── Batch ─────────────────────────────────────────────────────────────────

  describe('batch class', () => {
    it('is shared by the teacher and the batch; a curriculum change with the same teacher keeps it', async () => {
      const batch = await makeBatch(t1, courseA.id, [ada, ben]);
      const first = await batchClassRoom(batch, t1, courseA.id, [ada, ben]);
      await say(t1, first, 'm1', 'Hello batch').expect(201);
      await say(ben, first, 'm2', 'Hi!').expect(201);
      expect(await texts(ada, first)).toEqual(['Hello batch', 'Hi!']);

      // The whole batch moves to another program; same teacher.
      const second = await batchClassRoom(batch, t1, courseB.id, [ada, ben]);
      expect(await texts(ada, second)).toEqual(['Hello batch', 'Hi!']);
      expect(await texts(ben, second)).toEqual(['Hello batch', 'Hi!']);
    });

    it('a student who leaves can no longer read or write; the others still can', async () => {
      const batch = await makeBatch(t1, courseA.id, [ada, ben]);
      const room = await batchClassRoom(batch, t1, courseA.id, [ada, ben]);
      await say(t1, room, 'm1', 'Hello batch').expect(201);

      await prisma.batchMember.updateMany({
        where: { batchId: batch.id, studentUserId: ada.id },
        data: { leftAt: new Date() },
      });
      // Even though Ada's row in an already-running class is still there.
      await read(ada, room).then((r) => expect(r.status).toBe(403));
      await say(ada, room, 'm2', 'still here?').then((r) =>
        expect(r.status).toBe(403),
      );
      expect(await texts(ben, room)).toEqual(['Hello batch']);
      expect(await texts(t1, room)).toEqual(['Hello batch']);
    });

    it('a student who joins late starts with an empty chat; the others keep theirs', async () => {
      const batch = await makeBatch(t1, courseA.id, [ada, ben]);
      const room = await batchClassRoom(batch, t1, courseA.id, [ada, ben, cy]);
      await say(t1, room, 'm1', 'First class').expect(201);
      await say(ada, room, 'm2', 'Hi').expect(201);

      // Cy joins after a few classes.
      await new Promise((r) => setTimeout(r, 25));
      await prisma.batchMember.create({
        data: { batchId: batch.id, studentUserId: cy.id, joinedAt: new Date() },
      });
      expect(await texts(cy, room)).toEqual([]);

      await new Promise((r) => setTimeout(r, 25));
      await say(t1, room, 'm3', 'Welcome Cy').expect(201);
      expect(await texts(cy, room)).toEqual(['Welcome Cy']);
      expect(await texts(ada, room)).toEqual([
        'First class',
        'Hi',
        'Welcome Cy',
      ]);
      expect(await texts(t1, room)).toEqual([
        'First class',
        'Hi',
        'Welcome Cy',
      ]);
    });

    it('a new teacher for the batch starts a fresh, empty chat', async () => {
      const batch = await makeBatch(t1, courseA.id, [ada, ben]);
      const before = await batchClassRoom(batch, t1, courseA.id, [ada, ben]);
      await say(t1, before, 'm1', 'Hello from Ms Karim').expect(201);

      await prisma.batch.update({
        where: { id: batch.id },
        data: { teacherId: t2.profileId! },
      });
      const after = await batchClassRoom(batch, t2, courseA.id, [ada, ben]);
      expect(await texts(ada, after)).toEqual([]);
      expect(await texts(t2, after)).toEqual([]);
      // The new teacher cannot read the old teacher's conversation.
      await read(t2, before).then((r) => expect(r.status).toBe(403));
    });

    it('someone who is not in the class is refused', async () => {
      const batch = await makeBatch(t1, courseA.id, [ada]);
      const room = await batchClassRoom(batch, t1, courseA.id, [ada]);
      await read(stranger, room).then((r) => expect(r.status).toBe(403));
    });
  });

  // ─── Deleting and the lock ─────────────────────────────────────────────────

  describe('the teacher’s controls', () => {
    it('deletes one message (a student’s or their own), or clears everything; students cannot', async () => {
      const room = await oneToOneRoom(t1, ada, courseA.id);
      await say(t1, room, 'm1', 'teacher text').expect(201);
      await say(ada, room, 'm2', 'student text').expect(201);
      await say(ada, room, 'm3', 'second student text').expect(201);

      await http()
        .delete(`/classroom/${room}/chat/messages/${ada.id}/m2`)
        .set(as(ada))
        .expect(403);
      await http().delete(`/classroom/${room}/chat`).set(as(ada)).expect(403);
      expect(await texts(ada, room)).toHaveLength(3);

      await http()
        .delete(`/classroom/${room}/chat/messages/${ada.id}/m2`)
        .set(as(t1))
        .expect(200, { deleted: true });
      await http()
        .delete(`/classroom/${room}/chat/messages/${t1.id}/m1`)
        .set(as(t1))
        .expect(200, { deleted: true });
      await http()
        .delete(`/classroom/${room}/chat/messages/${t1.id}/m1`)
        .set(as(t1))
        .expect(200, { deleted: false });
      expect(await texts(ada, room)).toEqual(['second student text']);

      await http()
        .delete(`/classroom/${room}/chat`)
        .set(as(t1))
        .expect(200, { cleared: true });
      expect(await texts(ada, room)).toEqual([]);
      // Chatting carries on afterwards.
      await say(ada, room, 'm4', 'after the clear').expect(201);
      expect(await texts(t1, room)).toEqual(['after the clear']);
    });

    it('clearing a batch chat clears it for every member', async () => {
      const batch = await makeBatch(t1, courseA.id, [ada, ben]);
      const room = await batchClassRoom(batch, t1, courseA.id, [ada, ben]);
      await say(ada, room, 'm1', 'hello').expect(201);
      await http().delete(`/classroom/${room}/chat`).set(as(t1)).expect(200);
      expect(await texts(ben, room)).toEqual([]);
    });

    it('a student cannot save a message while the chat is locked; the teacher can', async () => {
      const room = await oneToOneRoom(t1, ada, courseA.id);
      chatLocked = true;
      await say(ada, room, 'm1', 'sneaky').then((r) =>
        expect(r.status).toBe(403),
      );
      await say(t1, room, 'm2', 'announcement').expect(201);
      chatLocked = false;
      expect(await texts(ada, room)).toEqual(['announcement']);
    });
  });

  // ─── Input and failure ─────────────────────────────────────────────────────

  describe('input and failures', () => {
    it('keeps line breaks and refuses bad input', async () => {
      const room = await oneToOneRoom(t1, ada, courseA.id);
      await say(ada, room, 'm1', 'line one\nline two').expect(201);
      expect(await texts(ada, room)).toEqual(['line one\nline two']);
      await say(ada, room, 'm2', '   ').expect(400);
      await say(ada, room, 'm3', 'x'.repeat(501)).expect(400);
      await say(ada, room, 'bad id!', 'hi').expect(400);
      await http()
        .get(`/classroom/${room}/chat?before=abc`)
        .set(as(ada))
        .expect(400);
    });

    it('pages: the newest page first, "hasMore", and older ones with before', async () => {
      const room = await oneToOneRoom(t1, ada, courseA.id);
      for (let i = 0; i < 5; i++) {
        await say(ada, room, `m${i}`, `msg ${i}`).expect(201);
        await new Promise((r) => setTimeout(r, 3));
      }
      const newest = (
        await http().get(`/classroom/${room}/chat?limit=3`).set(as(ada))
      ).body as HistoryBody;
      expect(newest.messages.map((m) => m.text)).toEqual([
        'msg 2',
        'msg 3',
        'msg 4',
      ]);
      expect(newest.hasMore).toBe(true);
      const sentAt = (await read(ada, room)).body as {
        messages: { sentAt: number }[];
      };
      const before = sentAt.messages[2].sentAt;
      const older = (
        await http()
          .get(`/classroom/${room}/chat?limit=3&before=${before}`)
          .set(as(ada))
      ).body as HistoryBody;
      expect(older.messages.map((m) => m.text)).toEqual([
        'msg 0',
        'msg 1',
        'msg 2',
      ]);
      expect(older.hasMore).toBe(false);
    });

    it('without chat storage, chat answers "not enabled" and saving is a no-op — nothing breaks', async () => {
      storage.configured = false;
      const room = await oneToOneRoom(t1, ada, courseA.id);
      await http()
        .get(`/classroom/${room}/chat`)
        .set(as(ada))
        .expect(200, { enabled: false, messages: [], hasMore: false });
      await say(ada, room, 'm1', 'hi').expect(201, { stored: false });
    });

    it('an R2 outage is a 503, never a wrong answer', async () => {
      const room = await oneToOneRoom(t1, ada, courseA.id);
      storage.down = true;
      await read(ada, room).then((r) => expect(r.status).toBe(503));
      await say(ada, room, 'm1', 'hi').then((r) => expect(r.status).toBe(503));
    });

    it('a room that does not exist is not found, never an exception', async () => {
      const room = 'trial-00000000-0000-0000-0000-000000000000';
      await read(t1, room).then((r) => expect([404, 400]).toContain(r.status));
    });
  });
});
