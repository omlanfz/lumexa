// Simple classrooms against a REAL Postgres: a batch's students sharing the one
// room of their class, the teacher's lock and the 10-people limit at join time,
// one person on several devices, the teacher's calendar (a batch class is one
// class), and ending a batch class (finalized once, the teacher paid once, one
// lesson per student on their own record).
//
// Daily is replaced by an in-memory fake (there is no Daily account in the
// test environment); everything else — Prisma, the scheduling rules, the
// finalization transaction, the payout ledger — is the real thing.
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
delete process.env.SMTP_USER;
delete process.env.SMTP_PASS;

import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ClassType, LessonStatus, Role } from '@prisma/client';
import {
  addParticipant,
  createBatchWithSession,
} from '../batches/testing/batch-fixtures';
import { BatchSessionsService } from '../batches/batch-sessions.service';
import { PayoutsService } from '../payouts/payouts.service';
import { PrismaModule } from '../prisma.module';
import { PrismaService } from '../prisma.service';
import { findTeacherConflict } from '../scheduling/teacher-conflict.util';
import { SchedulingService } from '../scheduling/scheduling.service';
import { AdmissionService } from './admission.service';
import { StudentProgressService } from '../students/progress/student-progress.service';
import { ClassFinalizationService } from './class-finalization.service';
import { ClassroomService } from './classroom.service';
import type { MeetingTokenParams, RoomConnection } from './daily-rooms.service';
import { RoomAccessService } from './room-access.service';
import { RoomDirectoryService } from './room-directory.service';
import { TrialClassroomService } from './trial-classroom.service';
import {
  roomForBatch,
  roomForBatchSession,
  roomForLessonRecord,
} from './room-ref.util';

const describeDb = IT_DB_URL ? describe : describe.skip;

interface Person {
  id: string;
  profileId?: string;
  name: string;
}

/** Daily, in memory: it hands out ways into a room and remembers who got one. */
class FakeRooms {
  people: RoomConnection[] = [];
  /** What each way in that was handed out was made for, in order. */
  entries: MeetingTokenParams[] = [];
  assertConfigured = jest.fn();
  entryFor = jest.fn((params: MeetingTokenParams) => {
    this.entries.push(params);
    return Promise.resolve({
      token: `token-${this.entries.length}`,
      url: `https://lumexa.daily.co/${params.room}`,
      eventKey: `key-${params.userId}`,
    });
  });
  listPeople = jest.fn(() => Promise.resolve(this.people));
  meetingStartedAt = jest.fn(() => Promise.resolve(null));
  sendServerEvent = jest.fn(() => Promise.resolve(1));
  removeConnections = jest.fn(() => Promise.resolve());
  setClassState = jest.fn(() => Promise.resolve());
  deleteRoom = jest.fn(() => Promise.resolve());
}

describeDb('Classrooms (real Postgres, Daily faked)', () => {
  // The specs take turns with the one database (see acquireDatabaseLock).
  jest.setTimeout(120_000);

  let prisma: PrismaService;
  let rooms: FakeRooms;
  let scheduling: SchedulingService;
  let access: RoomAccessService;
  let scheduleEnforcement: jest.SpyInstance;
  let directory: RoomDirectoryService;
  let finalization: ClassFinalizationService;
  let classroom: ClassroomService;
  let payouts: PayoutsService;
  let batchSessions: BatchSessionsService;
  let releaseLock: () => void;

  /** What a join's way in (the token its response carries) was made for. */
  const wayIn = (join: object): MeetingTokenParams => {
    if (!('token' in join) || typeof join.token !== 'string') {
      throw new Error(`Expected a join token, got ${JSON.stringify(join)}`);
    }
    return rooms.entries[Number(join.token.replace('token-', '')) - 1];
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

  /** A 1-to-1 class. */
  async function makeLesson(
    who: Person,
    by: Person,
    opts: {
      start?: Date;
      lessonNumber?: number;
      status?: LessonStatus;
      studentJoined?: boolean;
    } = {},
  ) {
    const start = opts.start ?? slot;
    return prisma.scheduledLesson.create({
      data: {
        studentUserId: who.id,
        teacherId: by.profileId!,
        courseId,
        lessonNumber: opts.lessonNumber ?? 3,
        start,
        end: new Date(start.getTime() + 45 * 60_000),
        classType: ClassType.ONE_TO_ONE,
        status: opts.status ?? LessonStatus.UPCOMING,
        studentJoinedAt: opts.studentJoined ? new Date() : null,
      },
    });
  }

  /** ONE batch class with a row for each of the given students. */
  function makeBatchClass(
    who: Person[],
    opts: {
      by?: Person;
      start?: Date;
      lessonNumber?: number;
      joined?: Person[];
      teacherJoinedAt?: Date | null;
      name?: string;
    } = {},
  ) {
    return createBatchWithSession(prisma, {
      name: opts.name,
      teacherProfileId: (opts.by ?? teacher).profileId!,
      courseId,
      studentUserIds: who.map((s) => s.id),
      start: opts.start ?? slot,
      lessonNumber: opts.lessonNumber ?? 3,
      joined: opts.joined?.map((s) => s.id),
      teacherJoinedAt: opts.teacherJoinedAt,
    });
  }

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
    // The real payout ledger: what the teacher is paid is read back from it.
    payouts = new PayoutsService(prisma, audit as never, alerts as never);
    batchSessions = new BatchSessionsService(
      prisma,
      audit as never,
      notifications as never,
    );
    directory = new RoomDirectoryService(prisma);
    access = new RoomAccessService(prisma, rooms as never);
    // The check that runs a few seconds after a join is covered in
    // room-access.service.spec; here it must not fire in the middle of a later test.
    scheduleEnforcement = jest
      .spyOn(access, 'scheduleEnforcement')
      .mockImplementation(() => undefined);
    finalization = new ClassFinalizationService(
      prisma,
      audit as never,
      alerts as never,
      notifications as never,
      payouts,
      ledger as never,
      scheduling,
      recording as never,
      batchSessions,
      rooms as never,
      new StudentProgressService(prisma, notifications as never),
    );
    classroom = new ClassroomService(
      prisma,
      {} as never,
      scheduling,
      payouts,
      alerts as never,
      {} as never,
      recording as never,
      new AdmissionService(prisma),
      finalization,
      access,
      directory,
      batchSessions,
      new TrialClassroomService(prisma, access, audit as never, rooms as never),
      rooms as never,
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
    rooms.entries = [];
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

  // ─── One room for a batch class ─────────────────────────────────────────────

  describe('joining', () => {
    it('puts every student of a batch class, and their teacher, in the same room', async () => {
      const batch = await makeBatchClass(students);

      const joins: object[] = [];
      for (const s of students) {
        joins.push(
          await classroom.joinScheduledLesson(s.id, batch.lessonIds[s.id]),
        );
      }
      const teacherJoin = await classroom.joinScheduledLesson(
        teacher.id,
        batch.lessonIds[students[0].id],
      );

      const expectedRoom = roomForBatchSession(batch.sessionId);
      for (const j of [...joins, teacherJoin]) {
        expect(wayIn(j).room).toBe(expectedRoom);
        expect(j).toMatchObject({
          roomName: expectedRoom,
          classType: 'BATCH',
          batchName: expect.any(String),
        });
      }
    });

    it('keeps a 1:1 class in a room of its own', async () => {
      const lesson = await makeLesson(students[0], teacher);
      const j = await classroom.joinScheduledLesson(students[0].id, lesson.id);
      expect(wayIn(j).room).toBe(`lesson-${lesson.id}`);
      expect(j).toMatchObject({ classType: 'ONE_TO_ONE', batchName: null });
    });

    it('two batch classes, at different times or with different teachers, are different rooms — and neither is a 1:1 room', async () => {
      const a = await makeBatchClass([students[0]]);
      const later = await makeBatchClass([students[1]], {
        name: 'Later batch',
        start: new Date(slot.getTime() + 2 * 3_600_000),
      });
      const c = await makeBatchClass([students[2]], {
        by: otherTeacher,
        name: 'Other teacher batch',
      });
      const solo = await makeLesson(students[3], teacher, {
        start: new Date(slot.getTime() + 5 * 3_600_000),
      });
      const joinedA = await classroom.joinScheduledLesson(
        students[0].id,
        a.lessonIds[students[0].id],
      );
      const joinedC = await classroom.joinScheduledLesson(
        students[2].id,
        c.lessonIds[students[2].id],
      );
      const roomOf = (j: object) => ('roomName' in j ? j.roomName : '');
      expect(
        new Set([
          roomOf(joinedA),
          roomOf(joinedC),
          roomForBatchSession(later.sessionId),
          roomForLessonRecord(solo),
        ]).size,
      ).toBe(4);
    });

    it('a student who is not in the class cannot get into its room', async () => {
      await makeBatchClass([students[0]]);
      const outsiderClass = await makeBatchClass([students[1]], {
        by: otherTeacher,
        name: 'Other batch',
      });
      await expect(
        classroom.joinScheduledLesson(
          students[0].id,
          outsiderClass.lessonIds[students[1].id],
        ),
      ).rejects.toThrow(/not assigned/);
    });

    it('a student of the batch cannot use a classmate’s row, and an unrelated teacher cannot enter', async () => {
      const batch = await makeBatchClass([students[0], students[1]]);
      await expect(
        classroom.joinScheduledLesson(
          students[0].id,
          batch.lessonIds[students[1].id],
        ),
      ).rejects.toThrow(/not assigned/);
      await expect(
        classroom.joinScheduledLesson(
          otherTeacher.id,
          batch.lessonIds[students[0].id],
        ),
      ).rejects.toThrow(/not assigned/);
    });

    it('gives every device of a person the same person id — devices are connections of one person, not people', async () => {
      const lesson = await makeLesson(students[0], teacher);
      const laptop = await classroom.joinScheduledLesson(
        students[0].id,
        lesson.id,
      );
      const phone = await classroom.joinScheduledLesson(
        students[0].id,
        lesson.id,
      );
      expect([laptop, phone].map((j) => wayIn(j).userId)).toEqual([
        students[0].id,
        students[0].id,
      ]);
    });

    it('answers a join with what the browser needs for Daily: the room’s address, a token, and the key for the server’s messages', async () => {
      const lesson = await makeLesson(students[0], teacher);
      const j = await classroom.joinScheduledLesson(students[0].id, lesson.id);
      expect(j).toMatchObject({
        token: 'token-1',
        url: `https://lumexa.daily.co/lesson-${lesson.id}`,
        eventKey: `key-${students[0].id}`,
        roomName: `lesson-${lesson.id}`,
      });
    });

    it('makes the class’s teacher — and only the teacher — the room’s owner, which is what lets their browser moderate', async () => {
      const lesson = await makeLesson(students[0], teacher);
      const asStudent = await classroom.joinScheduledLesson(
        students[0].id,
        lesson.id,
      );
      const asTeacher = await classroom.joinScheduledLesson(
        teacher.id,
        lesson.id,
      );
      expect(wayIn(asStudent)).toMatchObject({
        userId: students[0].id,
        isOwner: false,
      });
      expect(wayIn(asStudent).userName).toMatch(/\(Student\)$/);
      expect(wayIn(asTeacher)).toMatchObject({
        userId: teacher.id,
        isOwner: true,
      });
      expect(wayIn(asTeacher).userName).toMatch(/\(Teacher\)$/);
    });

    it('asks for the room to be checked a few seconds after someone is let in, with the class’s teacher named', async () => {
      const lesson = await makeLesson(students[0], teacher);
      await classroom.joinScheduledLesson(students[0].id, lesson.id);
      expect(scheduleEnforcement).toHaveBeenCalledWith(
        `lesson-${lesson.id}`,
        teacher.id,
      );
    });

    it('does not record a join (or fine a teacher) when the video service could not let them in', async () => {
      const lesson = await makeLesson(students[0], teacher, {
        start: new Date(Date.now() - 10 * 60_000),
      });
      rooms.entryFor.mockRejectedValueOnce(new Error('Daily is down'));
      await expect(
        classroom.joinScheduledLesson(teacher.id, lesson.id),
      ).rejects.toThrow('Daily is down');
      const row = await prisma.scheduledLesson.findUniqueOrThrow({
        where: { id: lesson.id },
      });
      expect(row.teacherJoinedAt).toBeNull();
      expect(
        await prisma.payoutEntry.count({ where: { type: 'PENALTY' } }),
      ).toBe(0);
    });

    describe('by the batch class itself', () => {
      it('the teacher enters a batch class by its own id and lands in its room', async () => {
        const batch = await makeBatchClass(students);
        const j = await classroom.joinBatchSession(teacher.id, batch.sessionId);
        expect(wayIn(j).room).toBe(roomForBatchSession(batch.sessionId));
        // …through one of the students' rows, which the response names.
        expect(Object.values(batch.lessonIds)).toContain(
          (j as { scheduledLessonId: string }).scheduledLessonId,
        );
      });

      it('a student enters by the class id through their own row', async () => {
        const batch = await makeBatchClass(students);
        const j = await classroom.joinBatchSession(
          students[2].id,
          batch.sessionId,
        );
        expect(j).toMatchObject({
          roomName: roomForBatchSession(batch.sessionId),
          scheduledLessonId: batch.lessonIds[students[2].id],
        });
      });

      it('someone who is not in the class, or another teacher, is refused', async () => {
        const batch = await makeBatchClass([students[0], students[1]]);
        await expect(
          classroom.joinBatchSession(students[3].id, batch.sessionId),
        ).rejects.toThrow(/not assigned/);
        await expect(
          classroom.joinBatchSession(otherTeacher.id, batch.sessionId),
        ).rejects.toThrow(/not assigned/);
      });

      it('a class with no student in it cannot be entered', async () => {
        const batch = await makeBatchClass([]);
        await expect(
          classroom.joinBatchSession(teacher.id, batch.sessionId),
        ).rejects.toThrow(/no students/);
      });
    });

    it('the teacher entering a batch class is on every student’s row at once; a student only on their own', async () => {
      const batch = await makeBatchClass(students);

      await classroom.joinScheduledLesson(
        students[1].id,
        batch.lessonIds[students[1].id],
      );
      let all = await prisma.scheduledLesson.findMany({
        orderBy: { id: 'asc' },
      });
      expect(all.filter((l) => l.studentJoinedAt)).toHaveLength(1);
      expect(all.filter((l) => l.teacherJoinedAt)).toHaveLength(0);

      await classroom.joinScheduledLesson(
        teacher.id,
        batch.lessonIds[students[0].id],
      );
      all = await prisma.scheduledLesson.findMany();
      expect(all.every((l) => l.teacherJoinedAt)).toBe(true);
      expect(all.filter((l) => l.studentJoinedAt)).toHaveLength(1);
      // The teacher's attendance is the CLASS's: recorded once, on the class.
      const session = await prisma.batchSession.findUniqueOrThrow({
        where: { id: batch.sessionId },
      });
      expect(session.teacherJoinedAt).not.toBeNull();
    });

    it('a student added to the class after the teacher came in is counted as joined when the teacher next comes in; the first join time is kept', async () => {
      const batch = await makeBatchClass([students[0]]);
      await classroom.joinScheduledLesson(
        teacher.id,
        batch.lessonIds[students[0].id],
      );
      const original = await prisma.batchSession.findUniqueOrThrow({
        where: { id: batch.sessionId },
      });

      const addedLater = await addParticipant(prisma, {
        batchId: batch.batchId,
        sessionId: batch.sessionId,
        studentUserId: students[1].id,
        teacherProfileId: teacher.profileId!,
        courseId,
        lessonNumber: 3,
        start: slot,
        end: new Date(slot.getTime() + 60 * 60_000),
      });
      expect(
        (
          await prisma.scheduledLesson.findUniqueOrThrow({
            where: { id: addedLater },
          })
        ).teacherJoinedAt,
      ).toBeNull();

      // …the teacher comes back (another device) through the FIRST student's row
      await classroom.joinScheduledLesson(
        teacher.id,
        batch.lessonIds[students[0].id],
      );
      const after = await prisma.scheduledLesson.findMany();
      expect(after.every((l) => l.teacherJoinedAt)).toBe(true);
      expect(
        (
          await prisma.batchSession.findUniqueOrThrow({
            where: { id: batch.sessionId },
          })
        ).teacherJoinedAt!.getTime(),
      ).toBe(original.teacherJoinedAt!.getTime());
    });

    describe('a teacher who joins late', () => {
      const late = () => new Date(Date.now() - 10 * 60_000);
      const penalties = () =>
        prisma.payoutEntry.findMany({ where: { type: 'PENALTY' } });

      it('is penalised ONCE for a batch class, however many students it has — and never twice for the same class', async () => {
        const batch = await makeBatchClass(students, { start: late() });
        const spy = jest.spyOn(payouts, 'triggerLateJoinPenalty');

        await classroom.joinScheduledLesson(
          teacher.id,
          batch.lessonIds[students[0].id],
        );
        // Back in through another student's row and another device.
        await classroom.joinScheduledLesson(
          teacher.id,
          batch.lessonIds[students[3].id],
        );

        const rows = await penalties();
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({
          teacherId: teacher.profileId,
          referenceType: 'BATCH_SESSION_LATE_JOIN',
          referenceId: batch.sessionId,
        });
        // Every call is about the class, never about one student's row.
        for (const [p] of spy.mock.calls) {
          expect(p).toMatchObject({ batchSessionId: batch.sessionId });
          expect(p).not.toHaveProperty('scheduledLessonId');
        }
      });

      it('is penalised once per 1:1 class, as before', async () => {
        const lesson = await makeLesson(students[0], teacher, {
          start: late(),
        });
        await classroom.joinScheduledLesson(teacher.id, lesson.id);
        await classroom.joinScheduledLesson(teacher.id, lesson.id);
        const rows = await penalties();
        expect(rows).toHaveLength(1);
        expect(rows[0].referenceType).toBe('SCHEDULED_LESSON_LATE_JOIN');
      });
    });

    it('a teacher who was on time is not fined by a later token request — pressing Join, a second device, a refresh', async () => {
      const lesson = await makeLesson(students[0], teacher); // starts in 5 minutes
      const spy = jest.spyOn(payouts, 'triggerLateJoinPenalty');
      await classroom.joinScheduledLesson(teacher.id, lesson.id);
      expect(spy).not.toHaveBeenCalled();

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
      await classroom.joinScheduledLesson(teacher.id, lesson.id); // Join pressed
      await classroom.joinScheduledLesson(teacher.id, lesson.id); // a second device
      expect(spy).not.toHaveBeenCalled();
      expect(
        await prisma.payoutEntry.count({ where: { type: 'PENALTY' } }),
      ).toBe(0);
    });

    it('a batch teacher who was on time is not fined later, nor by a student added after they came in', async () => {
      const batch = await makeBatchClass([students[0]]); // starts in 5 minutes
      await classroom.joinScheduledLesson(
        teacher.id,
        batch.lessonIds[students[0].id],
      );

      const addedLater = await addParticipant(prisma, {
        batchId: batch.batchId,
        sessionId: batch.sessionId,
        studentUserId: students[1].id,
        teacherProfileId: teacher.profileId!,
        courseId,
        lessonNumber: 3,
        start: slot,
        end: new Date(slot.getTime() + 60 * 60_000),
      });
      // Twenty minutes into the class (see the 1:1 test above for how time is moved).
      const started = new Date(Date.now() - 20 * 60_000);
      const end = new Date(started.getTime() + 60 * 60_000);
      await prisma.batchSession.update({
        where: { id: batch.sessionId },
        data: {
          start: started,
          end,
          teacherJoinedAt: new Date(started.getTime() - 2 * 60_000),
        },
      });
      await prisma.scheduledLesson.updateMany({
        where: { batchSessionId: batch.sessionId },
        data: { start: started, end },
      });

      await classroom.joinScheduledLesson(
        teacher.id,
        batch.lessonIds[students[0].id],
      );
      expect(
        await prisma.payoutEntry.count({ where: { type: 'PENALTY' } }),
      ).toBe(0);
      // …while the newly added student's row is still counted as joined
      expect(
        (
          await prisma.scheduledLesson.findUniqueOrThrow({
            where: { id: addedLater },
          })
        ).teacherJoinedAt,
      ).not.toBeNull();
    });
  });

  // ─── The lock ──────────────────────────────────────────────────────────────

  describe('the teacher’s lock', () => {
    it('only the class’s teacher can lock it', async () => {
      const batch = await makeBatchClass([students[0]]);
      const room = roomForBatchSession(batch.sessionId);
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
    });

    it('is off by default, and while on keeps every student out but never the teacher', async () => {
      const batch = await makeBatchClass([students[0]]);
      const lessonId = batch.lessonIds[students[0].id];
      const room = roomForBatchSession(batch.sessionId);

      const open = await classroom.joinScheduledLesson(
        students[0].id,
        lessonId,
      );
      expect(open).toMatchObject({ roomLocked: false });

      await classroom.setRoomLocked(teacher.id, room, true);
      const blocked = await classroom.joinScheduledLesson(
        students[0].id,
        lessonId,
      );
      expect(blocked).toMatchObject({
        blocked: true,
        reason: 'ROOM_LOCKED',
        roomName: room,
      });
      expect('token' in blocked).toBe(false);

      const teacherIn = await classroom.joinScheduledLesson(
        teacher.id,
        lessonId,
      );
      expect(teacherIn).toMatchObject({ roomLocked: true });
      expect('token' in teacherIn).toBe(true);
    });

    it('unlocking lets students in again; the lock survives the live room disappearing', async () => {
      const batch = await makeBatchClass([students[0]]);
      const lessonId = batch.lessonIds[students[0].id];
      const room = roomForBatchSession(batch.sessionId);
      await classroom.setRoomLocked(teacher.id, room, true);
      rooms.people = []; // the Daily room emptied and is gone
      expect(
        await classroom.joinScheduledLesson(students[0].id, lessonId),
      ).toMatchObject({ blocked: true });

      await classroom.setRoomLocked(teacher.id, room, false);
      expect(
        await classroom.joinScheduledLesson(students[0].id, lessonId),
      ).toHaveProperty('token');
    });

    it('locks one classroom only — another batch class of the same teacher is unaffected', async () => {
      const a = await makeBatchClass([students[0]]);
      const b = await makeBatchClass([students[1]], {
        name: 'Later batch',
        start: new Date(slot.getTime() + 3_600_000),
      });
      await classroom.setRoomLocked(
        teacher.id,
        roomForBatchSession(a.sessionId),
        true,
      );
      expect(
        await classroom.joinScheduledLesson(
          students[0].id,
          a.lessonIds[students[0].id],
        ),
      ).toMatchObject({ blocked: true });
      // b is an hour later: not open yet, but certainly not "locked"
      await expect(
        classroom.joinScheduledLesson(
          students[1].id,
          b.lessonIds[students[1].id],
        ),
      ).rejects.toThrow(/opens 10 minutes before/);
    });
  });

  // ─── Ten people ────────────────────────────────────────────────────────────

  describe('the 10-people limit', () => {
    const inRoom = (
      userId: string,
      session = 'aaaa1111',
      at = 0,
    ): RoomConnection => ({
      sessionId: `${userId}-${session}`,
      userId,
      name: userId,
      joinedAtMs: 1_000_000 + at,
    });

    it('turns away the tenth person but not the teacher, whatever the class type', async () => {
      const many: Person[] = [];
      for (let i = 0; i < 10; i++)
        many.push(await makeUser(`kid-${i}`, Role.STUDENT));
      const batch = await makeBatchClass(many);
      const rowOf = (s: Person) => batch.lessonIds[s.id];

      rooms.people = [
        inRoom(teacher.id, 'tdev0001'),
        ...many.slice(0, 8).map((s, i) => inRoom(s.id, 'aaaa1111', i)),
      ];
      expect(
        await classroom.joinScheduledLesson(many[8].id, rowOf(many[8])),
      ).toHaveProperty('token');

      rooms.people = [
        inRoom(teacher.id, 'tdev0001'),
        ...many.slice(0, 9).map((s, i) => inRoom(s.id, 'aaaa1111', i)),
      ];
      const tenth = await classroom.joinScheduledLesson(
        many[9].id,
        rowOf(many[9]),
      );
      expect(tenth).toMatchObject({ blocked: true, reason: 'ROOM_FULL' });

      rooms.people = many
        .slice(0, 9)
        .map((s, i) => inRoom(s.id, 'aaaa1111', i));
      expect(
        await classroom.joinScheduledLesson(teacher.id, rowOf(many[0])),
      ).toHaveProperty('token');
    });

    it('limits a 1:1 class the same way', async () => {
      const lesson = await makeLesson(students[0], teacher);
      const crowd: RoomConnection[] = [];
      for (let i = 0; i < 9; i++)
        crowd.push(inRoom(`someone-else-${i}`, 'aaaa1111', i));
      rooms.people = [inRoom(teacher.id, 'tdev0001'), ...crowd];
      expect(
        await classroom.joinScheduledLesson(students[0].id, lesson.id),
      ).toMatchObject({ blocked: true, reason: 'ROOM_FULL' });
    });

    it('refuses a fourth device, but not a second or a third', async () => {
      const batch = await makeBatchClass([students[0]]);
      const lessonId = batch.lessonIds[students[0].id];
      rooms.people = ['aaaa1111', 'bbbb2222'].map((d, i) =>
        inRoom(students[0].id, d, i),
      );
      expect(
        await classroom.joinScheduledLesson(students[0].id, lessonId),
      ).toHaveProperty('token');

      rooms.people = ['aaaa1111', 'bbbb2222', 'cccc3333'].map((d, i) =>
        inRoom(students[0].id, d, i),
      );
      expect(
        await classroom.joinScheduledLesson(students[0].id, lessonId),
      ).toMatchObject({ blocked: true, reason: 'TOO_MANY_DEVICES' });
    });
  });

  // ─── The teacher's calendar ────────────────────────────────────────────────

  describe('the teacher’s calendar: a batch class is ONE class', () => {
    const conflict = (
      start: Date,
      minutes = 60,
      opts: { excludeLessonId?: string; excludeSessionId?: string } = {},
    ) =>
      findTeacherConflict(
        prisma,
        teacher.profileId!,
        start,
        new Date(start.getTime() + minutes * 60_000),
        opts,
      );

    it('a batch class with nine students blocks the teacher once; its own students never count against it', async () => {
      const kids: Person[] = [];
      for (let i = 0; i < 9; i++)
        kids.push(await makeUser(`kid-${i}`, Role.STUDENT));
      const batch = await makeBatchClass(kids);

      // Anyone else wanting that time is in the way…
      expect(await conflict(slot)).not.toBeNull();
      // …but the class itself can be moved or rebuilt without clashing with its own rows.
      expect(
        await conflict(slot, 60, { excludeSessionId: batch.sessionId }),
      ).toBeNull();
    });

    it('a 1:1 class, or another batch’s class, in a batch class’s time is a conflict', async () => {
      const batch = await makeBatchClass([students[0]]);
      expect(await conflict(slot)).not.toBeNull();
      // another batch wanting the same time
      expect(
        await conflict(slot, 60, { excludeSessionId: 'some-other-session' }),
      ).not.toBeNull();
      // …and overlapping times either side
      for (const offsetMin of [-30, 30]) {
        expect(
          await conflict(new Date(slot.getTime() + offsetMin * 60_000), 60, {
            excludeSessionId: 'some-other-session',
          }),
        ).not.toBeNull();
      }
      // a class straight after it is fine
      expect(
        await conflict(new Date(slot.getTime() + 60 * 60_000), 45, {
          excludeSessionId: batch.sessionId,
        }),
      ).toBeNull();
    });

    it('a batch class with nobody in it yet still holds the teacher’s time', async () => {
      await makeBatchClass([]);
      expect(await conflict(slot)).not.toBeNull();
    });

    it('a 1:1 class holds it too, and moving a lesson does not clash with itself', async () => {
      const lesson = await makeLesson(students[0], teacher);
      expect(await conflict(slot)).not.toBeNull();
      expect(
        await conflict(slot, 45, { excludeLessonId: lesson.id }),
      ).toBeNull();
    });

    it('a different teacher is never in the way', async () => {
      await makeBatchClass([students[0]], { by: otherTeacher });
      expect(await conflict(slot)).toBeNull();
    });

    it('a finished or cancelled class no longer holds the time', async () => {
      const batch = await makeBatchClass([students[0]]);
      await prisma.batchSession.update({
        where: { id: batch.sessionId },
        data: { status: LessonStatus.CANCELLED },
      });
      await prisma.scheduledLesson.updateMany({
        where: { batchSessionId: batch.sessionId },
        data: { status: LessonStatus.CANCELLED },
      });
      expect(await conflict(slot)).toBeNull();
    });
  });

  // ─── Who is in a room ──────────────────────────────────────────────────────

  describe('room directory', () => {
    it('a batch class’s room is its teacher and every student’s row that is not cancelled', async () => {
      const batch = await makeBatchClass([students[0], students[1]]);
      // a student whose row for this class was cancelled, and another class's student
      await addParticipant(prisma, {
        batchId: batch.batchId,
        sessionId: batch.sessionId,
        studentUserId: students[2].id,
        teacherProfileId: teacher.profileId!,
        courseId,
        lessonNumber: 3,
        start: slot,
        end: new Date(slot.getTime() + 60 * 60_000),
        status: LessonStatus.CANCELLED,
      });
      await makeBatchClass([students[3]], { by: otherTeacher, name: 'Other' });

      const room = roomForBatchSession(batch.sessionId);
      const resolved = await directory.resolve(room);
      expect(resolved.kind).toBe('batch');
      expect(resolved.classType).toBe('BATCH');
      expect(resolved.batchSessionId).toBe(batch.sessionId);
      expect(resolved.lessons.map((l) => l.studentUserId).sort()).toEqual(
        [students[0].id, students[1].id].sort(),
      );
      expect(await directory.teacherUserIdOf(room)).toBe(teacher.id);
    });

    it('a class that was running under the old room name still resolves to its students', async () => {
      const batch = await makeBatchClass([students[0], students[1]]);
      const legacy = roomForBatch(teacher.profileId!, slot);
      const resolved = await directory.resolve(legacy);
      expect(resolved.lessons.map((l) => l.id).sort()).toEqual(
        Object.values(batch.lessonIds).sort(),
      );
    });

    it('an unknown room is not found', async () => {
      await expect(
        directory.resolve(roomForBatchSession('nope')),
      ).rejects.toThrow(/not found/i);
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
    /** A class that began 20 minutes ago (so End Class is open), with the
     * students who came marked as having joined. */
    async function runningClass(attended: boolean[], lessonNumber = 3) {
      slot = new Date(Date.now() - 20 * 60_000);
      const who = students.slice(0, attended.length);
      const batch = await makeBatchClass(who, {
        start: slot,
        lessonNumber,
        joined: who.filter((_, i) => attended[i]),
        teacherJoinedAt: new Date(slot.getTime() - 60_000),
      });
      return { batch, room: roomForBatchSession(batch.sessionId), who };
    }
    const rowStatuses = async () =>
      Object.fromEntries(
        (await prisma.scheduledLesson.findMany()).map((l) => [
          l.studentUserId,
          l.status,
        ]),
      );
    const earnings = () =>
      prisma.payoutEntry.findMany({ where: { type: 'CLASS_COMPLETED' } });

    it('Completed ends the class once: the teacher is paid ONCE, each student who came is charged a lesson, a student who never joined is Incomplete with no make-up of their own', async () => {
      const { room, who } = await runningClass([true, true, false]);

      const done = await classroom.endClass(teacher.id, room, {
        outcome: 'COMPLETED',
      });
      expect(done.ok).toBe(true);
      expect(done.status).toBe('COMPLETED');

      const s = await rowStatuses();
      expect(s[who[0].id]).toBe('COMPLETED');
      expect(s[who[1].id]).toBe('COMPLETED');
      expect(s[who[2].id]).toBe('INCOMPLETE');

      // ONE payment for the class (not one per student)…
      const paid = await earnings();
      expect(paid).toHaveLength(1);
      expect(paid[0]).toMatchObject({
        teacherId: teacher.profileId,
        referenceType: 'BATCH_SESSION',
      });
      // …and one lesson from EVERY enrolled student — the one who never
      // came is charged too (strict batch billing).
      expect(ledger.consumeLessonForScheduledLessonInTx).toHaveBeenCalledTimes(
        3,
      );

      // The student who never came gets no private make-up (the batch's
      // sequence does not split) — and a missed-class notice.
      expect(
        await prisma.scheduledLesson.count({
          where: { studentUserId: who[2].id, status: LessonStatus.UPCOMING },
        }),
      ).toBe(0);
      expect(notifications.sendMissedClassNotice).toHaveBeenCalledTimes(1);
      const absent = await prisma.scheduledLesson.findFirstOrThrow({
        where: { studentUserId: who[2].id, status: 'INCOMPLETE' },
      });
      expect(absent.endReason).toBe('STUDENT_NO_SHOW');
      // The class record says who ended it, and how.
      const session = await prisma.batchSession.findFirstOrThrow();
      expect(session).toMatchObject({
        status: 'COMPLETED',
        endedByRole: 'TEACHER',
      });
    });

    it('wraps up the shared classroom (recording, live room) exactly once, for the class’s room', async () => {
      const { room } = await runningClass([true, true, true]);
      await classroom.endClass(teacher.id, room, { outcome: 'COMPLETED' });
      expect(recording.stopActiveSegmentIfAny).toHaveBeenCalledTimes(1);
      expect(recording.stopActiveSegmentIfAny).toHaveBeenCalledWith(room);
      expect(recording.finalizeAtClassEnd).toHaveBeenCalledTimes(1);
      // …and the Daily room is closed, once, so nobody is left in it.
      expect(rooms.deleteRoom).toHaveBeenCalledTimes(1);
      expect(rooms.deleteRoom).toHaveBeenCalledWith(room);
    });

    it('an admin settling one student’s row settles the whole class — once, crediting everyone', async () => {
      const { batch, who } = await runningClass([true, true]);
      await finalization.finalizeLesson(batch.lessonIds[who[0].id], {
        outcome: 'COMPLETED',
        actor: { role: 'ADMIN', userId: 'admin' },
      });
      expect(Object.values(await rowStatuses())).toEqual([
        'COMPLETED',
        'COMPLETED',
      ]);
      expect(recording.stopActiveSegmentIfAny).toHaveBeenCalledTimes(1);
      expect(await earnings()).toHaveLength(1);

      // The second student's row is the same class: nothing more happens.
      const again = await finalization.finalizeLesson(
        batch.lessonIds[who[1].id],
        { outcome: 'COMPLETED', actor: { role: 'ADMIN', userId: 'admin' } },
      );
      expect(again.finalized).toBe(false);
      expect(await earnings()).toHaveLength(1);
      expect(recording.stopActiveSegmentIfAny).toHaveBeenCalledTimes(1);
    });

    it('Incomplete applies the teacher’s reason to everyone, pays no teacher (students are still charged), and adds ONE make-up class for the whole batch', async () => {
      const { batch, room, who } = await runningClass([true, false]);
      const before = await prisma.batchSession.count();
      await classroom.endClass(teacher.id, room, {
        outcome: 'INCOMPLETE',
        reason: 'TECHNICAL_ISSUE',
      });
      const ended = await prisma.scheduledLesson.findMany({
        where: { batchSessionId: batch.sessionId },
      });
      expect(ended.map((l) => l.status)).toEqual(['INCOMPLETE', 'INCOMPLETE']);
      expect(await earnings()).toHaveLength(0);
      // Nobody is paid, but both enrolled students are still charged.
      expect(ledger.consumeLessonForScheduledLessonInTx).toHaveBeenCalledTimes(
        2,
      );

      // One extra class of the same lesson, with a row for each student.
      const upcoming = await prisma.batchSession.findMany({
        where: { status: LessonStatus.UPCOMING },
        include: { participants: true },
      });
      expect(await prisma.batchSession.count()).toBe(before + 1);
      expect(upcoming).toHaveLength(1);
      expect(upcoming[0].lessonNumber).toBe(3);
      expect(
        upcoming[0].participants.map((p) => p.studentUserId).sort(),
      ).toEqual(who.map((s) => s.id).sort());
    });

    it('Partially Completed pays like Completed and adds ONE extra class — and is refused up front, changing nothing, once the batch has used it for that lesson', async () => {
      const { batch, room, who } = await runningClass([true, true]);
      await classroom.endClass(teacher.id, room, {
        outcome: 'PARTIALLY_COMPLETED',
      });
      expect(await earnings()).toHaveLength(1);
      const extra = await prisma.batchSession.findFirstOrThrow({
        where: { status: LessonStatus.UPCOMING },
      });
      expect(extra.lessonNumber).toBe(3);

      // That extra class cannot itself be ended Partially Completed again.
      await prisma.batchSession.update({
        where: { id: extra.id },
        data: {
          start: new Date(Date.now() - 20 * 60_000),
          end: new Date(Date.now() + 40 * 60_000),
          teacherJoinedAt: new Date(),
        },
      });
      await prisma.scheduledLesson.updateMany({
        where: { batchSessionId: extra.id },
        data: {
          start: new Date(Date.now() - 20 * 60_000),
          end: new Date(Date.now() + 40 * 60_000),
          studentJoinedAt: new Date(),
        },
      });
      await expect(
        classroom.endClass(teacher.id, roomForBatchSession(extra.id), {
          outcome: 'PARTIALLY_COMPLETED',
        }),
      ).rejects.toThrow(/already been used/i);
      expect(
        (
          await prisma.batchSession.findUniqueOrThrow({
            where: { id: extra.id },
          })
        ).status,
      ).toBe('UPCOMING');
      expect(batch.sessionId).not.toBe(extra.id);
      expect(who).toHaveLength(2);
    });

    it('ending the class again is harmless, and an identical repeat pays nothing twice', async () => {
      const { room } = await runningClass([true, true]);
      await classroom.endClass(teacher.id, room, { outcome: 'COMPLETED' });
      const again = await classroom.endClass(teacher.id, room, {
        outcome: 'COMPLETED',
      });
      expect(again.ok).toBe(true);
      expect(await earnings()).toHaveLength(1);
      expect(ledger.consumeLessonForScheduledLessonInTx).toHaveBeenCalledTimes(
        2,
      );
    });

    it('a different outcome after it was ended is refused', async () => {
      const { room } = await runningClass([true, true]);
      await classroom.endClass(teacher.id, room, { outcome: 'COMPLETED' });
      await expect(
        classroom.endClass(teacher.id, room, {
          outcome: 'INCOMPLETE',
          reason: 'TECHNICAL_ISSUE',
        }),
      ).rejects.toThrow(/already been ended/);
    });

    it('only the teacher of the class can end it, and not before it has run ten minutes', async () => {
      const { batch, room, who } = await runningClass([true]);
      await expect(
        classroom.endClass(otherTeacher.id, room, { outcome: 'COMPLETED' }),
      ).rejects.toThrow(/Only the teacher/);
      await expect(
        classroom.endClass(who[0].id, room, { outcome: 'COMPLETED' }),
      ).rejects.toThrow(/Only the teacher/);
      await expect(classroom.endClass(teacher.id, room, {})).rejects.toThrow(
        /Choose Completed/,
      );

      const soon = new Date(Date.now() - 2 * 60_000);
      await prisma.batchSession.update({
        where: { id: batch.sessionId },
        data: { start: soon, end: new Date(soon.getTime() + 60 * 60_000) },
      });
      await expect(
        classroom.endClass(teacher.id, room, { outcome: 'COMPLETED' }),
      ).rejects.toThrow(/You can end this class/);
    });

    it('a 1:1 class still ends on its own: one lesson, one payment, its own room', async () => {
      const started = new Date(Date.now() - 20 * 60_000);
      const lesson = await makeLesson(students[0], teacher, {
        start: started,
        studentJoined: true,
      });
      const room = `lesson-${lesson.id}`;
      const done = await classroom.endClass(teacher.id, room, {
        outcome: 'COMPLETED',
      });
      expect(done.status).toBe('COMPLETED');
      const paid = await earnings();
      expect(paid).toHaveLength(1);
      expect(paid[0].referenceType).toBe('SCHEDULED_LESSON');
      expect(ledger.consumeLessonForScheduledLessonInTx).toHaveBeenCalledTimes(
        1,
      );
    });
  });

  // ─── Moderation reaches every device ───────────────────────────────────────

  describe('removing a person', () => {
    const inRoom = (
      userId: string,
      session: string,
      name: string,
    ): RoomConnection => ({
      sessionId: `${userId}-${session}`,
      userId,
      name,
      joinedAtMs: 1_000_000,
    });

    it('removes them from every device they are on, and makes them knock to come back', async () => {
      const batch = await makeBatchClass(students.slice(0, 2));
      const room = roomForBatchSession(batch.sessionId);
      rooms.people = [
        inRoom(students[0].id, 'laptop01', 'Ada (Student)'),
        inRoom(students[0].id, 'phone002', 'Ada (Student)'),
        inRoom(students[1].id, 'laptop01', 'Ben (Student)'),
      ];

      await classroom.removeParticipant(teacher.id, room, students[0].id);

      expect(rooms.removeConnections).toHaveBeenCalledTimes(1);
      const [roomName, sessionIds] = rooms.removeConnections.mock
        .calls[0] as unknown as [string, string[]];
      expect(roomName).toBe(room);
      expect([...sessionIds].sort()).toEqual([
        `${students[0].id}-laptop01`,
        `${students[0].id}-phone002`,
      ]);
      // keyed by the person, so any device is turned into a knock
      const again = await classroom.joinScheduledLesson(
        students[0].id,
        batch.lessonIds[students[0].id],
      );
      expect(again).toMatchObject({ waitingForAdmission: true });
      expect(
        await prisma.classroomAdmission.findFirstOrThrow({
          where: { room, userId: students[0].id, status: 'REMOVED' },
        }),
      ).toMatchObject({ displayName: 'Ada' });
    });

    it('someone who has already gone is not an error, and nothing is recorded', async () => {
      const batch = await makeBatchClass([students[0]]);
      const room = roomForBatchSession(batch.sessionId);
      rooms.people = [];
      await expect(
        classroom.removeParticipant(teacher.id, room, students[0].id),
      ).resolves.toEqual({ ok: true });
      expect(rooms.removeConnections).not.toHaveBeenCalled();
      expect(await prisma.classroomAdmission.count({ where: { room } })).toBe(
        0,
      );
    });

    it('only the class’s teacher can remove someone', async () => {
      const batch = await makeBatchClass(students.slice(0, 2));
      const room = roomForBatchSession(batch.sessionId);
      rooms.people = [inRoom(students[1].id, 'laptop01', 'Ben (Student)')];
      await expect(
        classroom.removeParticipant(students[0].id, room, students[1].id),
      ).rejects.toThrow(/Only the teacher/);
      await expect(
        classroom.removeParticipant(otherTeacher.id, room, students[1].id),
      ).rejects.toThrow(/Only the teacher/);
      expect(rooms.removeConnections).not.toHaveBeenCalled();
    });

    it('the teacher cannot remove themselves', async () => {
      const batch = await makeBatchClass([students[0]]);
      await expect(
        classroom.removeParticipant(
          teacher.id,
          roomForBatchSession(batch.sessionId),
          teacher.id,
        ),
      ).rejects.toThrow(/cannot remove yourself/);
    });
  });

  // ─── Free trial classes ─────────────────────────────────────────────────────
  // A trial shares the room machinery (lock, 10-people limit, teacher-only
  // controls) but is not a lesson: no student account, no payout, no progress.

  describe('free trial classes', () => {
    let trialTrialClassroom: TrialClassroomService;
    const HALF = 30 * 60_000;

    async function makeTrial(over: Record<string, unknown> = {}) {
      const start = Math.floor(Date.now() / HALF) * HALF; // started 0–30 min ago
      return prisma.trialLead.create({
        data: {
          parentName: 'Rita',
          parentEmail: 'rita@example.com',
          parentPhone: '+8801712345678',
          childName: 'Rahul',
          childAge: 10,
          subject: 'Scratch',
          status: 'BOOKED',
          startAt: new Date(start),
          endAt: new Date(start + HALF),
          appointmentStatus: 'CONFIRMED',
          guestToken: 'g'.repeat(43),
          teacherId: teacher.profileId,
          ...over,
        },
      });
    }

    beforeAll(() => {
      trialTrialClassroom = new TrialClassroomService(
        prisma,
        access,
        audit as never,
        rooms as never,
      );
    });
    beforeEach(async () => {
      await prisma.trialLead.deleteMany();
    });

    it('the directory knows a trial room’s teacher, and has no lessons or students in it', async () => {
      const trial = await makeTrial();
      const resolved = await directory.resolve(`trial-${trial.id}`);
      expect(resolved).toMatchObject({
        kind: 'trial',
        teacherUserId: teacher.id,
        lessons: [],
      });
    });

    it('an unassigned trial has no classroom (nobody is its teacher)', async () => {
      const trial = await makeTrial({ teacherId: null });
      await expect(directory.resolve(`trial-${trial.id}`)).rejects.toThrow(
        /not found/i,
      );
    });

    it('POST /classroom/join with a trialLeadId puts the assigned teacher in the trial room — no late penalty, no earning', async () => {
      const trial = await makeTrial();
      const join = await classroom.joinLab(teacher.id, {
        trialLeadId: trial.id,
      });
      expect(wayIn(join).room).toBe(`trial-${trial.id}`);
      expect(wayIn(join)).toMatchObject({ userId: teacher.id, isOwner: true });
      expect(join).toMatchObject({ isTrial: true, classType: 'ONE_TO_ONE' });
      await expect(
        classroom.joinLab(otherTeacher.id, { trialLeadId: trial.id }),
      ).rejects.toThrow(/not assigned/);
      expect(await prisma.payoutEntry.count()).toBe(0);
    });

    it('only the trial’s teacher can lock it; a locked room keeps the guest out, an unlocked one lets them in', async () => {
      const trial = await makeTrial();
      const room = `trial-${trial.id}`;
      await expect(
        classroom.setRoomLocked(otherTeacher.id, room, true),
      ).rejects.toThrow(/Only the teacher/);
      await classroom.setRoomLocked(teacher.id, room, true).catch(() => {
        // (the live room does not exist in this fake — the DB lock is what counts)
      });
      expect(await access.isLocked(room)).toBe(true);
      expect(
        await trialTrialClassroom.joinAsGuest('g'.repeat(43)),
      ).toMatchObject({ blocked: true, reason: 'ROOM_LOCKED' });
      await classroom
        .setRoomLocked(teacher.id, room, false)
        .catch(() => undefined);
      expect(
        await trialTrialClassroom.joinAsGuest('g'.repeat(43)),
      ).toHaveProperty('token');
    });

    it('a full trial room (10 people) refuses a further guest like any classroom', async () => {
      const trial = await makeTrial();
      const crowd = Array.from({ length: 9 }, (_, i) => ({
        sessionId: `someone-${i}-aaaa1111`,
        userId: `someone-${i}`,
        name: `S${i}`,
        joinedAtMs: Date.now(),
      }));
      rooms.people = [
        {
          sessionId: `${teacher.id}-tdev0001`,
          userId: teacher.id,
          name: 'T',
          joinedAtMs: Date.now(),
        },
        ...crowd,
      ];
      expect(
        await trialTrialClassroom.joinAsGuest(trial.guestToken!),
      ).toMatchObject({ blocked: true, reason: 'ROOM_FULL' });
    });

    it('recording is not offered in a trial', async () => {
      const trial = await makeTrial();
      await expect(
        classroom.startTeacherRecording(teacher.id, `trial-${trial.id}`),
      ).rejects.toThrow(/not recorded/);
    });

    it('ending a trial closes the room: Completed when both sides took part, otherwise left for the admin — never a lesson, payout or ledger entry', async () => {
      const absent = await makeTrial();
      await classroom.endClass(teacher.id, `trial-${absent.id}`, {});
      expect(
        (await prisma.trialLead.findUniqueOrThrow({ where: { id: absent.id } }))
          .appointmentStatus,
      ).toBe('CONFIRMED');
      expect(rooms.deleteRoom).toHaveBeenCalledWith(`trial-${absent.id}`);

      await prisma.trialLead.update({
        where: { id: absent.id },
        data: { teacherJoinedAt: new Date(), guestJoinedAt: new Date() },
      });
      await classroom.endClass(teacher.id, `trial-${absent.id}`, {});
      expect(
        (await prisma.trialLead.findUniqueOrThrow({ where: { id: absent.id } }))
          .appointmentStatus,
      ).toBe('COMPLETED');

      await expect(
        classroom.endClass(otherTeacher.id, `trial-${absent.id}`, {}),
      ).rejects.toThrow(/Only the teacher/);
      expect(await prisma.payoutEntry.count()).toBe(0);
      expect(await prisma.scheduledLesson.count()).toBe(0);
      expect(await prisma.studentLedgerEntry.count()).toBe(0);
    });

    it('a trial on the teacher’s calendar blocks a lesson or batch class from being placed over it', async () => {
      const trial = await makeTrial();
      const clash = await findTeacherConflict(
        prisma,
        teacher.profileId!,
        new Date(trial.startAt!.getTime() + 10 * 60_000),
        new Date(trial.startAt!.getTime() + 55 * 60_000),
      );
      expect((clash as { id: string }).id).toBe(trial.id);
      // the other teacher is unaffected; a cancelled trial frees the time
      expect(
        await findTeacherConflict(
          prisma,
          otherTeacher.profileId!,
          trial.startAt!,
          trial.endAt!,
        ),
      ).toBeNull();
      await prisma.trialLead.update({
        where: { id: trial.id },
        data: { appointmentStatus: 'CANCELLED' },
      });
      expect(
        await findTeacherConflict(
          prisma,
          teacher.profileId!,
          trial.startAt!,
          trial.endAt!,
        ),
      ).toBeNull();
    });
  });
});
