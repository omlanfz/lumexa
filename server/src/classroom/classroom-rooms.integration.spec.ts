// Simple classrooms against a REAL Postgres: a batch's students sharing one
// room, the teacher's lock and the 10-people limit at join time, one person on
// several devices, a batch slot that holds up to nine students, and ending a
// batch class (one lesson per student, each paid or not on its own).
//
// LiveKit is replaced by an in-memory fake (there is no LiveKit server in the
// test environment); everything else — Prisma, the scheduling rules, the
// finalization transaction — is the real thing.
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
delete process.env.SMTP_USER;
delete process.env.SMTP_PASS;

import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ClassType, LessonStatus, Role } from '@prisma/client';
import { PrismaModule } from '../prisma.module';
import { PrismaService } from '../prisma.service';
import { SchedulingService } from '../scheduling/scheduling.service';
import { AdmissionService } from './admission.service';
import { ClassFinalizationService } from './class-finalization.service';
import { ClassroomService } from './classroom.service';
import type { RoomConnection } from './livekit-rooms.service';
import { RoomAccessService } from './room-access.service';
import { RoomDirectoryService } from './room-directory.service';
import {
  buildIdentity,
  roomForBatch,
  roomForLessonRecord,
} from './room-ref.util';

const describeDb = IT_DB_URL ? describe : describe.skip;

interface Person {
  id: string;
  profileId?: string;
  name: string;
}

class FakeRooms {
  people: RoomConnection[] = [];
  listPeople = jest.fn(() => Promise.resolve(this.people));
  sendServerEvent = jest.fn(() => Promise.resolve(1));
  removeConnection = jest.fn(() => Promise.resolve());
}

/** The access token of a join that was allowed (a refusal has none). */
function tokenOf(join: object): string {
  if (!('token' in join) || typeof join.token !== 'string') {
    throw new Error(`Expected a join token, got ${JSON.stringify(join)}`);
  }
  return join.token;
}

/** The pieces of a LiveKit access token the tests care about. */
function claims(token: string): { sub: string; name: string; room: string } {
  const body = JSON.parse(
    Buffer.from(token.split('.')[1], 'base64url').toString('utf8'),
  ) as { sub: string; name: string; video: { room: string } };
  return { sub: body.sub, name: body.name, room: body.video.room };
}

describeDb('Classrooms (real Postgres, LiveKit faked)', () => {
  // The specs take turns with the one database (see acquireDatabaseLock).
  jest.setTimeout(120_000);

  let prisma: PrismaService;
  let rooms: FakeRooms;
  let scheduling: SchedulingService;
  let access: RoomAccessService;
  let directory: RoomDirectoryService;
  let finalization: ClassFinalizationService;
  let classroom: ClassroomService;
  let releaseLock: () => void;

  const payouts = {
    recordScheduledLessonEarningInTx: jest.fn(() => Promise.resolve({})),
    triggerLateJoinPenalty: jest.fn(() => Promise.resolve({})),
  };
  const ledger = {
    consumeLessonForScheduledLessonInTx: jest.fn(() => Promise.resolve(true)),
  };
  const recording = {
    stopActiveSegmentIfAny: jest.fn(() => Promise.resolve()),
    finalizeAtClassEnd: jest.fn(() => Promise.resolve()),
  };
  const notifications = {
    sendMissedClassNotice: jest.fn(() => Promise.resolve()),
  };
  const alerts = { create: jest.fn(() => Promise.resolve()) };
  const audit = { log: jest.fn(() => Promise.resolve()) };

  let teacher: Person;
  let otherTeacher: Person;
  let courseId: string;
  let slot: Date;
  let students: Person[];

  async function makeUser(name: string, role: Role): Promise<Person> {
    const user = await prisma.user.create({
      data: {
        email: `${name}@example.com`,
        password: 'not-a-real-hash',
        fullName: name.replace(/-/g, ' '),
        role,
      },
    });
    const profileId =
      role === Role.TEACHER
        ? (await prisma.teacherProfile.create({ data: { userId: user.id } })).id
        : undefined;
    return { id: user.id, profileId, name: user.fullName };
  }

  async function makeLesson(
    who: Person,
    by: Person,
    opts: {
      classType?: ClassType;
      start?: Date;
      lessonNumber?: number;
      status?: LessonStatus;
      studentJoined?: boolean;
    } = {},
  ) {
    const classType = opts.classType ?? ClassType.BATCH;
    const start = opts.start ?? slot;
    const minutes = classType === ClassType.BATCH ? 60 : 45;
    return prisma.scheduledLesson.create({
      data: {
        studentUserId: who.id,
        teacherId: by.profileId!,
        courseId,
        lessonNumber: opts.lessonNumber ?? 3,
        start,
        end: new Date(start.getTime() + minutes * 60_000),
        classType,
        status: opts.status ?? LessonStatus.UPCOMING,
        studentJoinedAt: opts.studentJoined ? new Date() : null,
      },
    });
  }

  const lessonOf = (who: Person) =>
    prisma.scheduledLesson.findFirstOrThrow({
      where: { studentUserId: who.id, status: LessonStatus.UPCOMING },
    });

  beforeAll(async () => {
    releaseLock = await acquireDatabaseLock(IT_DB_URL!);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const mod = await Test.createTestingModule({
      imports: [PrismaModule],
    }).compile();
    prisma = mod.get(PrismaService);

    rooms = new FakeRooms();
    scheduling = new SchedulingService(prisma, audit as never, {} as never);
    directory = new RoomDirectoryService(prisma);
    access = new RoomAccessService(prisma, rooms as never);
    finalization = new ClassFinalizationService(
      prisma,
      audit as never,
      alerts as never,
      notifications as never,
      payouts as never,
      ledger as never,
      scheduling,
      recording as never,
    );
    classroom = new ClassroomService(
      prisma,
      {} as never,
      scheduling,
      payouts as never,
      alerts as never,
      {} as never,
      recording as never,
      new AdmissionService(prisma),
      finalization,
      access,
      directory,
    );
  });

  afterAll(async () => {
    jest.restoreAllMocks();
    await prisma?.$disconnect();
    releaseLock?.();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    rooms.people = [];
    await truncateAssessmentData(prisma);
    await prisma.classroomRoomState.deleteMany();

    slot = new Date(Date.now() + 5 * 60_000); // opens 10 minutes before: open now
    teacher = await makeUser('ms-karim', Role.TEACHER);
    otherTeacher = await makeUser('mr-hasan', Role.TEACHER);
    courseId = (
      await prisma.course.create({
        data: {
          slug: 'rooms-course',
          title: 'Rooms Course',
          category: 'Python',
          level: 'STARTER',
        },
      })
    ).id;
    students = [];
    for (const name of ['ada', 'ben', 'cleo', 'dev']) {
      students.push(await makeUser(`${name}-student`, Role.STUDENT));
    }
  });

  // ─── One room for a batch ───────────────────────────────────────────────────

  describe('joining', () => {
    it('puts every student of a batch, and their teacher, in the same room', async () => {
      for (const s of students) await makeLesson(s, teacher);

      const joins: object[] = [];
      for (const s of students) {
        joins.push(
          await classroom.joinScheduledLesson(
            s.id,
            (await lessonOf(s)).id,
            'aaaa1111',
          ),
        );
      }
      const teacherJoin = await classroom.joinScheduledLesson(
        teacher.id,
        (await lessonOf(students[0])).id,
        'tdev0001',
      );

      const expectedRoom = roomForBatch(teacher.profileId!, slot);
      for (const j of [...joins, teacherJoin]) {
        expect(claims(tokenOf(j)).room).toBe(expectedRoom);
        expect(j).toMatchObject({ roomName: expectedRoom, classType: 'BATCH' });
      }
    });

    it('keeps a 1:1 class in a room of its own', async () => {
      const lesson = await makeLesson(students[0], teacher, {
        classType: ClassType.ONE_TO_ONE,
      });
      const j = await classroom.joinScheduledLesson(
        students[0].id,
        lesson.id,
        'aaaa1111',
      );
      expect(claims(tokenOf(j)).room).toBe(`lesson-${lesson.id}`);
      expect(j).toMatchObject({ classType: 'ONE_TO_ONE' });
    });

    it('two batches at different times, or with different teachers, are different rooms', async () => {
      const a = await makeLesson(students[0], teacher);
      const later = await makeLesson(students[1], teacher, {
        start: new Date(slot.getTime() + 2 * 3_600_000),
      });
      const c = await makeLesson(students[2], otherTeacher);
      const joinedA = await classroom.joinScheduledLesson(
        students[0].id,
        a.id,
        'aaaa1111',
      );
      const joinedC = await classroom.joinScheduledLesson(
        students[2].id,
        c.id,
        'aaaa1111',
      );
      const roomOf = (j: object) => ('roomName' in j ? j.roomName : '');
      expect(
        new Set([roomOf(joinedA), roomOf(joinedC), roomForLessonRecord(later)])
          .size,
      ).toBe(3);
    });

    it('a student who is not in the batch cannot get into its room', async () => {
      await makeLesson(students[0], teacher);
      const outsiderLesson = await makeLesson(students[1], otherTeacher);
      await expect(
        classroom.joinScheduledLesson(
          students[0].id,
          outsiderLesson.id,
          'aaaa1111',
        ),
      ).rejects.toThrow(/not assigned/);
    });

    it('gives each device its own identity but one person: <userId>~<device>', async () => {
      const lesson = await makeLesson(students[0], teacher);
      const laptop = await classroom.joinScheduledLesson(
        students[0].id,
        lesson.id,
        'laptop01',
      );
      const phone = await classroom.joinScheduledLesson(
        students[0].id,
        lesson.id,
        'phone002',
      );
      const ids = [laptop, phone].map((j) => claims(tokenOf(j)).sub);
      expect(ids).toEqual([
        buildIdentity(students[0].id, 'laptop01'),
        buildIdentity(students[0].id, 'phone002'),
      ]);
      expect(new Set(ids.map((i) => i.split('~')[0]))).toEqual(
        new Set([students[0].id]),
      );
    });

    it('survives a missing or hostile device id by using a plain one', async () => {
      const lesson = await makeLesson(students[0], teacher);
      for (const bad of [undefined, '', 'a b', '../../x', { x: 1 }]) {
        const j = await classroom.joinScheduledLesson(
          students[0].id,
          lesson.id,
          bad,
        );
        expect(claims(tokenOf(j)).sub).toBe(`${students[0].id}~main`);
      }
    });

    it('the teacher entering a batch has joined every student’s lesson; a student only their own', async () => {
      for (const s of students) await makeLesson(s, teacher);
      const first = await lessonOf(students[0]);

      await classroom.joinScheduledLesson(
        students[1].id,
        (await lessonOf(students[1])).id,
        'aaaa1111',
      );
      let all = await prisma.scheduledLesson.findMany({
        orderBy: { id: 'asc' },
      });
      expect(all.filter((l) => l.studentJoinedAt)).toHaveLength(1);
      expect(all.filter((l) => l.teacherJoinedAt)).toHaveLength(0);

      await classroom.joinScheduledLesson(teacher.id, first.id, 'tdev0001');
      all = await prisma.scheduledLesson.findMany();
      expect(all.every((l) => l.teacherJoinedAt)).toBe(true);
      expect(all.filter((l) => l.studentJoinedAt)).toHaveLength(1);
    });

    it('a student added to the batch after the teacher came in is counted as joined when the teacher next comes in', async () => {
      const first = await makeLesson(students[0], teacher);
      await classroom.joinScheduledLesson(teacher.id, first.id, 'tdev0001');
      const original = await prisma.scheduledLesson.findUniqueOrThrow({
        where: { id: first.id },
      });

      const addedLater = await makeLesson(students[1], teacher); // same slot
      expect(
        (
          await prisma.scheduledLesson.findUniqueOrThrow({
            where: { id: addedLater.id },
          })
        ).teacherJoinedAt,
      ).toBeNull();

      // …the teacher comes back (another device) through the FIRST student's lesson
      await classroom.joinScheduledLesson(teacher.id, first.id, 'tdev0002');
      const after = await prisma.scheduledLesson.findMany({
        where: { id: { in: [first.id, addedLater.id] } },
      });
      expect(after.every((l) => l.teacherJoinedAt)).toBe(true);
      // the first join time is never overwritten
      expect(
        after.find((l) => l.id === first.id)!.teacherJoinedAt!.getTime(),
      ).toBe(original.teacherJoinedAt!.getTime());
    });

    it('a teacher who joins late is penalised once per student’s lesson, never twice for one', async () => {
      const late = new Date(Date.now() - 10 * 60_000);
      for (const s of students) await makeLesson(s, teacher, { start: late });
      const anyLesson = await lessonOf(students[0]);

      await classroom.joinScheduledLesson(teacher.id, anyLesson.id, 'tdev0001');
      expect(payouts.triggerLateJoinPenalty).toHaveBeenCalledTimes(4);
      const penalised = payouts.triggerLateJoinPenalty.mock.calls.map(
        (c) =>
          (c as unknown as [{ scheduledLessonId: string }])[0]
            .scheduledLessonId,
      );
      expect(new Set(penalised).size).toBe(4);
    });

    it('a teacher who was on time is not fined by a later token request — pressing Join, a second device, a refresh', async () => {
      const lesson = await makeLesson(students[0], teacher, {
        classType: ClassType.ONE_TO_ONE,
      }); // starts in 5 minutes
      await classroom.joinScheduledLesson(teacher.id, lesson.id, 'tdev0001');
      expect(payouts.triggerLateJoinPenalty).not.toHaveBeenCalled();

      // Twenty minutes into the class. (Time cannot be moved on, so the class is
      // moved back instead: it started 20 minutes ago and the teacher's first
      // join, kept on the lesson, was two minutes before that.)
      const started = new Date(Date.now() - 20 * 60_000);
      await prisma.scheduledLesson.update({
        where: { id: lesson.id },
        data: {
          start: started,
          end: new Date(started.getTime() + 45 * 60_000),
          teacherJoinedAt: new Date(started.getTime() - 2 * 60_000),
        },
      });
      await classroom.joinScheduledLesson(teacher.id, lesson.id, 'tdev0001'); // Join pressed
      await classroom.joinScheduledLesson(teacher.id, lesson.id, 'tdev0002'); // a second device
      expect(payouts.triggerLateJoinPenalty).not.toHaveBeenCalled();
    });

    it('a student added to a batch after the teacher came in on time does not make the teacher late', async () => {
      const first = await makeLesson(students[0], teacher); // starts in 5 minutes
      await classroom.joinScheduledLesson(teacher.id, first.id, 'tdev0001');

      const addedLater = await makeLesson(students[1], teacher); // same slot
      // Twenty minutes into the class (see the test above for how time is moved).
      const started = new Date(Date.now() - 20 * 60_000);
      await prisma.scheduledLesson.updateMany({
        where: { teacherId: teacher.profileId! },
        data: {
          start: started,
          end: new Date(started.getTime() + 60 * 60_000),
        },
      });
      await prisma.scheduledLesson.update({
        where: { id: first.id },
        data: { teacherJoinedAt: new Date(started.getTime() - 2 * 60_000) },
      });

      await classroom.joinScheduledLesson(teacher.id, first.id, 'tdev0002');
      expect(payouts.triggerLateJoinPenalty).not.toHaveBeenCalled();
      // …while the newly added lesson is still counted as joined
      expect(
        (
          await prisma.scheduledLesson.findUniqueOrThrow({
            where: { id: addedLater.id },
          })
        ).teacherJoinedAt,
      ).not.toBeNull();
    });
  });

  // ─── The lock ──────────────────────────────────────────────────────────────

  describe('the teacher’s lock', () => {
    it('only the class’s teacher can lock it', async () => {
      const lesson = await makeLesson(students[0], teacher);
      const room = roomForBatch(teacher.profileId!, slot);
      await expect(
        classroom.setRoomLocked(students[0].id, room, true),
      ).rejects.toThrow(/Only the teacher/);
      await expect(
        classroom.setRoomLocked(otherTeacher.id, room, true),
      ).rejects.toThrow(/Only the teacher/);
      expect(await classroom.setRoomLocked(teacher.id, room, true)).toEqual({
        ok: true,
        locked: true,
      });
      expect(lesson.id).toBeTruthy();
    });

    it('is off by default, and while on keeps every student out but never the teacher', async () => {
      const lesson = await makeLesson(students[0], teacher);
      const room = roomForBatch(teacher.profileId!, slot);

      const open = await classroom.joinScheduledLesson(
        students[0].id,
        lesson.id,
        'aaaa1111',
      );
      expect(open).toMatchObject({ roomLocked: false });

      await classroom.setRoomLocked(teacher.id, room, true);
      const blocked = await classroom.joinScheduledLesson(
        students[0].id,
        lesson.id,
        'aaaa1111',
      );
      expect(blocked).toMatchObject({
        blocked: true,
        reason: 'ROOM_LOCKED',
        roomName: room,
      });
      expect('token' in blocked).toBe(false);

      const teacherIn = await classroom.joinScheduledLesson(
        teacher.id,
        lesson.id,
        'tdev0001',
      );
      expect(teacherIn).toMatchObject({ roomLocked: true });
      expect('token' in teacherIn).toBe(true);
    });

    it('unlocking lets students in again; the lock survives the live room disappearing', async () => {
      const lesson = await makeLesson(students[0], teacher);
      const room = roomForBatch(teacher.profileId!, slot);
      await classroom.setRoomLocked(teacher.id, room, true);
      rooms.people = []; // the LiveKit room emptied and is gone
      expect(
        await classroom.joinScheduledLesson(
          students[0].id,
          lesson.id,
          'aaaa1111',
        ),
      ).toMatchObject({ blocked: true });

      await classroom.setRoomLocked(teacher.id, room, false);
      expect(
        await classroom.joinScheduledLesson(
          students[0].id,
          lesson.id,
          'aaaa1111',
        ),
      ).toHaveProperty('token');
    });

    it('locks one classroom only — another batch of the same teacher is unaffected', async () => {
      const a = await makeLesson(students[0], teacher);
      const b = await makeLesson(students[1], teacher, {
        start: new Date(slot.getTime() + 3_600_000),
      });
      await classroom.setRoomLocked(
        teacher.id,
        roomForBatch(teacher.profileId!, slot),
        true,
      );
      expect(
        await classroom.joinScheduledLesson(students[0].id, a.id, 'aaaa1111'),
      ).toMatchObject({ blocked: true });
      // b is an hour later: not open yet, but certainly not "locked"
      await expect(
        classroom.joinScheduledLesson(students[1].id, b.id, 'aaaa1111'),
      ).rejects.toThrow(/opens 10 minutes before/);
    });
  });

  // ─── Ten people ────────────────────────────────────────────────────────────

  describe('the 10-people limit', () => {
    const inRoom = (
      userId: string,
      device = 'aaaa1111',
      at = 0,
    ): RoomConnection => ({
      identity: buildIdentity(userId, device),
      userId,
      name: userId,
      joinedAtMs: 1_000_000 + at,
    });

    it('turns away the tenth person but not the teacher, whatever the class type', async () => {
      const many: Person[] = [];
      for (let i = 0; i < 10; i++)
        many.push(await makeUser(`kid-${i}`, Role.STUDENT));
      for (const s of many) await makeLesson(s, teacher);
      const anyLesson = (s: Person) => lessonOf(s);

      rooms.people = [
        inRoom(teacher.id, 'tdev0001'),
        ...many.slice(0, 8).map((s, i) => inRoom(s.id, 'aaaa1111', i)),
      ];
      expect(
        await classroom.joinScheduledLesson(
          many[8].id,
          (await anyLesson(many[8])).id,
          'aaaa1111',
        ),
      ).toHaveProperty('token');

      rooms.people = [
        inRoom(teacher.id, 'tdev0001'),
        ...many.slice(0, 9).map((s, i) => inRoom(s.id, 'aaaa1111', i)),
      ];
      const tenth = await classroom.joinScheduledLesson(
        many[9].id,
        (await anyLesson(many[9])).id,
        'aaaa1111',
      );
      expect(tenth).toMatchObject({ blocked: true, reason: 'ROOM_FULL' });

      rooms.people = many
        .slice(0, 9)
        .map((s, i) => inRoom(s.id, 'aaaa1111', i));
      expect(
        await classroom.joinScheduledLesson(
          teacher.id,
          (await anyLesson(many[0])).id,
          'tdev0001',
        ),
      ).toHaveProperty('token');
    });

    it('limits a 1:1 class the same way', async () => {
      const lesson = await makeLesson(students[0], teacher, {
        classType: ClassType.ONE_TO_ONE,
      });
      const crowd: RoomConnection[] = [];
      for (let i = 0; i < 9; i++)
        crowd.push(inRoom(`someone-else-${i}`, 'aaaa1111', i));
      rooms.people = [inRoom(teacher.id, 'tdev0001'), ...crowd];
      expect(
        await classroom.joinScheduledLesson(
          students[0].id,
          lesson.id,
          'aaaa1111',
        ),
      ).toMatchObject({ blocked: true, reason: 'ROOM_FULL' });
    });

    it('refuses a fourth device, not a refresh of an existing one', async () => {
      const lesson = await makeLesson(students[0], teacher);
      rooms.people = ['aaaa1111', 'bbbb2222', 'cccc3333'].map((d, i) =>
        inRoom(students[0].id, d, i),
      );
      expect(
        await classroom.joinScheduledLesson(
          students[0].id,
          lesson.id,
          'dddd4444',
        ),
      ).toMatchObject({ blocked: true, reason: 'TOO_MANY_DEVICES' });
      expect(
        await classroom.joinScheduledLesson(
          students[0].id,
          lesson.id,
          'bbbb2222',
        ),
      ).toHaveProperty('token');
    });
  });

  // ─── A batch slot ──────────────────────────────────────────────────────────

  describe('scheduling a batch', () => {
    const conflict = (start: Date, classType: ClassType, exclude?: string) =>
      scheduling.findTeacherConflict(
        prisma,
        teacher.profileId!,
        start,
        new Date(start.getTime() + (classType === 'BATCH' ? 60 : 45) * 60_000),
        exclude,
        classType === ClassType.BATCH,
      );

    it('another student can join a batch slot that is already taken — if they are batch too', async () => {
      await makeLesson(students[0], teacher);
      expect(await conflict(slot, ClassType.BATCH)).toBeNull();
    });

    it('a 1:1 class is a conflict in a batch’s slot, and the old rule (batch=false) still is', async () => {
      await makeLesson(students[0], teacher);
      expect(await conflict(slot, ClassType.ONE_TO_ONE)).not.toBeNull();
      expect(
        await scheduling.findTeacherConflict(
          prisma,
          teacher.profileId!,
          slot,
          new Date(slot.getTime() + 60 * 60_000),
        ),
      ).not.toBeNull();
    });

    it('a batch at an overlapping but different time is a conflict', async () => {
      await makeLesson(students[0], teacher);
      for (const offsetMin of [-30, 30]) {
        expect(
          await conflict(
            new Date(slot.getTime() + offsetMin * 60_000),
            ClassType.BATCH,
          ),
        ).not.toBeNull();
      }
    });

    it('a batch holds nine students and then says it is full', async () => {
      const kids: Person[] = [];
      for (let i = 0; i < 10; i++)
        kids.push(await makeUser(`kid-${i}`, Role.STUDENT));
      for (let i = 0; i < 8; i++) await makeLesson(kids[i], teacher);
      expect(await conflict(slot, ClassType.BATCH)).toBeNull(); // the ninth fits
      await makeLesson(kids[8], teacher);
      expect(await conflict(slot, ClassType.BATCH)).not.toBeNull(); // the tenth does not
    });

    it('moving an existing batch lesson does not count the lesson against itself', async () => {
      const kids: Person[] = [];
      for (let i = 0; i < 9; i++)
        kids.push(await makeUser(`kid-${i}`, Role.STUDENT));
      const lessons: { id: string }[] = [];
      for (const k of kids) lessons.push(await makeLesson(k, teacher));
      expect(await conflict(slot, ClassType.BATCH, lessons[0].id)).toBeNull();
    });

    it('a different teacher is never in the way', async () => {
      await makeLesson(students[0], otherTeacher);
      expect(await conflict(slot, ClassType.ONE_TO_ONE)).toBeNull();
    });
  });

  // ─── Who is in a room ──────────────────────────────────────────────────────

  describe('room directory', () => {
    it('a batch room is its teacher and every student’s lesson that is not cancelled', async () => {
      await makeLesson(students[0], teacher);
      await makeLesson(students[1], teacher);
      await makeLesson(students[2], teacher, {
        status: LessonStatus.CANCELLED,
      });
      await makeLesson(students[3], otherTeacher);

      const resolved = await directory.resolve(
        roomForBatch(teacher.profileId!, slot),
      );
      expect(resolved.kind).toBe('batch');
      expect(resolved.classType).toBe('BATCH');
      expect(resolved.lessons.map((l) => l.studentUserId).sort()).toEqual(
        [students[0].id, students[1].id].sort(),
      );
      expect(
        await directory.teacherUserIdOf(roomForBatch(teacher.profileId!, slot)),
      ).toBe(teacher.id);
    });

    it('an unknown room is not found', async () => {
      await expect(
        directory.resolve(roomForBatch(teacher.profileId!, slot)),
      ).rejects.toThrow(/not found/i);
      await expect(directory.resolve('lesson-nope')).rejects.toThrow(
        /not found/i,
      );
    });
  });

  // ─── Ending a batch class ──────────────────────────────────────────────────

  describe('ending a batch class', () => {
    const room = () => roomForBatch(teacher.profileId!, slot);
    const statuses = async () =>
      Object.fromEntries(
        (
          await prisma.scheduledLesson.findMany({
            where: { id: { in: allIds } },
          })
        ).map((l) => [l.studentUserId, l.status]),
      );
    let allIds: string[];

    async function sessionOf(attended: boolean[]) {
      allIds = [];
      // One start for the whole batch (that is what makes it one classroom);
      // it began 20 minutes ago, so End Class is open.
      slot = new Date(Date.now() - 20 * 60_000);
      for (let i = 0; i < attended.length; i++) {
        const l = await makeLesson(students[i], teacher, {
          studentJoined: attended[i],
          start: slot,
        });
        allIds.push(l.id);
      }
    }

    it('Completed ends each student’s lesson on its own: paid if they came, Incomplete (no pay, a make-up) if they never joined', async () => {
      await sessionOf([true, true, false]);

      const done = await classroom.endClass(teacher.id, room(), {
        outcome: 'COMPLETED',
      });
      expect(done.ok).toBe(true);

      const s = await statuses();
      expect(s[students[0].id]).toBe('COMPLETED');
      expect(s[students[1].id]).toBe('COMPLETED');
      expect(s[students[2].id]).toBe('INCOMPLETE');
      expect(payouts.recordScheduledLessonEarningInTx).toHaveBeenCalledTimes(2);
      expect(ledger.consumeLessonForScheduledLessonInTx).toHaveBeenCalledTimes(
        2,
      );

      // the student who never came gets the class again, and a missed-class notice
      const makeup = await prisma.scheduledLesson.findMany({
        where: { studentUserId: students[2].id, status: LessonStatus.UPCOMING },
      });
      expect(makeup).toHaveLength(1);
      expect(makeup[0].lessonNumber).toBe(3);
      expect(notifications.sendMissedClassNotice).toHaveBeenCalledTimes(1);
      const absent = await prisma.scheduledLesson.findFirstOrThrow({
        where: { studentUserId: students[2].id, status: 'INCOMPLETE' },
      });
      expect(absent.endReason).toBe('STUDENT_NO_SHOW');
    });

    it('wraps up the shared classroom (recording, live room) exactly once, for the batch room', async () => {
      await sessionOf([true, true, true]);
      await classroom.endClass(teacher.id, room(), { outcome: 'COMPLETED' });
      expect(recording.stopActiveSegmentIfAny).toHaveBeenCalledTimes(1);
      expect(recording.stopActiveSegmentIfAny).toHaveBeenCalledWith(room());
      expect(recording.finalizeAtClassEnd).toHaveBeenCalledTimes(1);
    });

    it('an admin settling one student’s lesson does not end the class for the others', async () => {
      await sessionOf([true, true]);
      await finalization.finalizeLesson(allIds[0], {
        outcome: 'COMPLETED',
        actor: { role: 'ADMIN', userId: 'admin' },
      });
      expect(recording.stopActiveSegmentIfAny).not.toHaveBeenCalled();

      await finalization.finalizeLesson(allIds[1], {
        outcome: 'COMPLETED',
        actor: { role: 'ADMIN', userId: 'admin' },
      });
      expect(recording.stopActiveSegmentIfAny).toHaveBeenCalledTimes(1); // the last one out
    });

    it('Incomplete applies the teacher’s reason to everyone', async () => {
      await sessionOf([true, false]);
      await classroom.endClass(teacher.id, room(), {
        outcome: 'INCOMPLETE',
        reason: 'TECHNICAL_ISSUE',
      });
      const s = await statuses();
      expect(Object.values(s)).toEqual(['INCOMPLETE', 'INCOMPLETE']);
      expect(payouts.recordScheduledLessonEarningInTx).not.toHaveBeenCalled();
    });

    it('Partially Completed is refused up front, changing nothing, if any student has used theirs', async () => {
      await sessionOf([true, true]);
      await prisma.scheduledLesson.create({
        data: {
          studentUserId: students[1].id,
          teacherId: teacher.profileId!,
          courseId,
          lessonNumber: 3,
          start: new Date(Date.now() - 7 * 86_400_000),
          end: new Date(Date.now() - 7 * 86_400_000 + 3_600_000),
          classType: 'BATCH',
          status: LessonStatus.PARTIALLY_COMPLETED,
        },
      });
      await expect(
        classroom.endClass(teacher.id, room(), {
          outcome: 'PARTIALLY_COMPLETED',
        }),
      ).rejects.toThrow(/already been used for .*student/i);
      expect(Object.values(await statuses())).toEqual(['UPCOMING', 'UPCOMING']);
    });

    it('ending the class again is harmless, and a lesson already settled by someone else is left alone', async () => {
      await sessionOf([true, true]);
      await finalization.finalizeLesson(allIds[0], {
        outcome: 'INCOMPLETE',
        reason: 'OTHER',
        note: 'admin fix',
        actor: { role: 'ADMIN', userId: 'admin' },
      });
      await classroom.endClass(teacher.id, room(), { outcome: 'COMPLETED' });
      const s = await statuses();
      expect(s[students[0].id]).toBe('INCOMPLETE'); // admin's choice stands
      expect(s[students[1].id]).toBe('COMPLETED');

      const again = await classroom.endClass(teacher.id, room(), {
        outcome: 'COMPLETED',
      });
      expect(again.ok).toBe(true);
      expect(payouts.recordScheduledLessonEarningInTx).toHaveBeenCalledTimes(1);
    });

    it('only the teacher of the class can end it, and not before it has run ten minutes', async () => {
      await sessionOf([true]);
      await expect(
        classroom.endClass(otherTeacher.id, room(), { outcome: 'COMPLETED' }),
      ).rejects.toThrow(/Only the teacher/);
      await expect(
        classroom.endClass(students[0].id, room(), { outcome: 'COMPLETED' }),
      ).rejects.toThrow(/Only the teacher/);
      await expect(classroom.endClass(teacher.id, room(), {})).rejects.toThrow(
        /Choose Completed/,
      );

      await prisma.scheduledLesson.updateMany({
        data: {
          start: new Date(Date.now() - 2 * 60_000),
          end: new Date(Date.now() + 58 * 60_000),
        },
      });
      slot = (await prisma.scheduledLesson.findFirstOrThrow()).start;
      await expect(
        classroom.endClass(teacher.id, room(), { outcome: 'COMPLETED' }),
      ).rejects.toThrow(/You can end this class/);
    });
  });

  // ─── Moderation reaches every device ───────────────────────────────────────

  describe('removing a person', () => {
    it('removes them from every device they are on, and makes them knock to come back', async () => {
      for (const s of students.slice(0, 2)) await makeLesson(s, teacher);
      const room = roomForBatch(teacher.profileId!, slot);
      const removed: string[] = [];
      const client = {
        listParticipants: jest.fn(() =>
          Promise.resolve([
            {
              identity: buildIdentity(students[0].id, 'laptop01'),
              name: 'Ada (Student)',
              tracks: [],
            },
            {
              identity: buildIdentity(students[0].id, 'phone002'),
              name: 'Ada (Student)',
              tracks: [],
            },
            {
              identity: buildIdentity(students[1].id, 'laptop01'),
              name: 'Ben (Student)',
              tracks: [],
            },
          ]),
        ),
        removeParticipant: jest.fn((_r: string, identity: string) => {
          removed.push(identity);
          return Promise.resolve();
        }),
      };
      jest
        .spyOn(classroom as never, 'getRoomServiceClient')
        .mockReturnValue(client as never);

      await classroom.removeParticipant(
        teacher.id,
        room,
        buildIdentity(students[0].id, 'laptop01'),
      );

      expect(removed.sort()).toEqual([
        buildIdentity(students[0].id, 'laptop01'),
        buildIdentity(students[0].id, 'phone002'),
      ]);
      // keyed by the person, so any device is turned into a knock
      const lesson = await lessonOf(students[0]);
      const again = await classroom.joinScheduledLesson(
        students[0].id,
        lesson.id,
        'newdev01',
      );
      expect(again).toMatchObject({ waitingForAdmission: true });
    });

    it('the teacher cannot remove themselves', async () => {
      await makeLesson(students[0], teacher);
      await expect(
        classroom.removeParticipant(
          teacher.id,
          roomForBatch(teacher.profileId!, slot),
          buildIdentity(teacher.id, 'tdev0001'),
        ),
      ).rejects.toThrow(/cannot remove yourself/);
    });
  });
});
