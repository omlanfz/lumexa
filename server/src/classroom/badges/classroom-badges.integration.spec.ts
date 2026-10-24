// The Classroom Badge System against a REAL Postgres — a 1:1 class and a batch
// of four, with LiveKit replaced by an in-memory fake that records exactly who
// each celebration was addressed to. The unique constraint that makes an award
// safe against a double click, and "saved before it is announced", cannot be
// proven with a mock.
//
// Skipped unless ASSESSMENT_INTEGRATION_DATABASE_URL points at a throwaway,
// fully migrated database — see ../../assessments/testing/integration-db.ts.

import 'reflect-metadata';
import {
  IT_DB_URL,
  acquireDatabaseLock,
  truncateAssessmentData,
  useIntegrationDatabase,
} from '../../assessments/testing/integration-db';

useIntegrationDatabase();

import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ClassType, LessonStatus, Role } from '@prisma/client';
import { PrismaModule } from '../../prisma.module';
import { PrismaService } from '../../prisma.service';
import type { RoomConnection, ServerEvent } from '../livekit-rooms.service';
import { RoomDirectoryService } from '../room-directory.service';
import {
  DEMO_ROOM_NAME,
  DEMO_STUDENT_EMAIL,
  DEMO_TEACHER_EMAIL,
  buildIdentity,
  roomForBatch,
} from '../room-ref.util';
import { BADGE_CATALOG } from './badge-catalog';
import {
  BADGE_UNDO_WINDOW_MS,
  ClassroomBadgesService,
} from './classroom-badges.service';

const describeDb = IT_DB_URL ? describe : describe.skip;

interface Person {
  id: string;
  profileId?: string;
  name: string;
}

interface Sent {
  room: string;
  identities: string[];
  event: ServerEvent;
}

class FakeRooms {
  people: RoomConnection[] = [];
  sent: Sent[] = [];
  failSend = false;
  failList = false;
  /** Runs inside each send — lets a test look at the database at that moment. */
  onSend: (s: Sent) => Promise<void> = () => Promise.resolve();

  listPeople = jest.fn(() => {
    if (this.failList) return Promise.reject(new Error('livekit down'));
    return Promise.resolve(this.people);
  });
  sendServerEvent = jest.fn(
    async (room: string, identities: string[], event: ServerEvent) => {
      if (this.failSend) throw new Error('data channel unavailable');
      if (identities.length === 0) return 0;
      const sent = { room, identities, event };
      await this.onSend(sent);
      this.sent.push(sent);
      return identities.length;
    },
  );
}

describeDb('Classroom badges (real Postgres, LiveKit faked)', () => {
  // The specs take turns with the one database (see acquireDatabaseLock).
  jest.setTimeout(120_000);

  let prisma: PrismaService;
  let rooms: FakeRooms;
  let badges: ClassroomBadgesService;
  let releaseLock: () => void;

  let teacher: Person;
  let otherTeacher: Person;
  let admin: Person;
  let oneToOneStudent: Person;
  let batchStudents: Person[];
  let outsider: Person;
  let courseId: string;
  let slot: Date;
  let batchRoom: string;
  let oneToOneRoom: string;
  let counter = 0;

  const newRequestId = () => `req-${Date.now()}-${++counter}-${'x'.repeat(8)}`;

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
    classType: ClassType,
    start: Date,
    status: LessonStatus = LessonStatus.UPCOMING,
  ) {
    return prisma.scheduledLesson.create({
      data: {
        studentUserId: who.id,
        teacherId: by.profileId!,
        courseId,
        lessonNumber: 1,
        start,
        end: new Date(start.getTime() + 60 * 60_000),
        classType,
        status,
      },
    });
  }

  /** Puts a student in the (fake) LiveKit room, on the given devices. */
  const present = (who: Person, ...devices: string[]) => {
    for (const d of devices.length ? devices : ['aaaa1111']) {
      rooms.people.push({
        identity: buildIdentity(who.id, d),
        userId: who.id,
        name: who.name,
        joinedAtMs: Date.now(),
      });
    }
  };

  const award = (
    badgeId: string,
    studentUserIds: string[],
    requestId = newRequestId(),
    room = batchRoom,
    as: Person = teacher,
  ) => badges.award(as.id, room, { badgeId, studentUserIds, requestId });

  const rows = (where: object = {}) =>
    prisma.classroomBadgeAward.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

  beforeAll(async () => {
    releaseLock = await acquireDatabaseLock(IT_DB_URL!);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const mod = await Test.createTestingModule({
      imports: [PrismaModule],
    }).compile();
    prisma = mod.get(PrismaService);
    rooms = new FakeRooms();
    badges = new ClassroomBadgesService(
      prisma,
      new RoomDirectoryService(prisma),
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
    rooms.sent = [];
    rooms.failSend = false;
    rooms.failList = false;
    rooms.onSend = () => Promise.resolve();
    await truncateAssessmentData(prisma);

    slot = new Date(Date.now() - 20 * 60_000);
    teacher = await makeUser('ms-karim', Role.TEACHER);
    otherTeacher = await makeUser('mr-hasan', Role.TEACHER);
    admin = await makeUser('ops-admin', Role.ADMIN);
    courseId = (
      await prisma.course.create({
        data: {
          slug: 'badge-course',
          title: 'Badge Course',
          category: 'Python',
          level: 'STARTER',
        },
      })
    ).id;

    batchStudents = [];
    for (const n of ['ada', 'ben', 'cleo', 'dev']) {
      const s = await makeUser(`${n}-student`, Role.STUDENT);
      batchStudents.push(s);
      await makeLesson(s, teacher, ClassType.BATCH, slot);
    }
    batchRoom = roomForBatch(teacher.profileId!, slot);

    oneToOneStudent = await makeUser('olive-solo', Role.STUDENT);
    const solo = await makeLesson(
      oneToOneStudent,
      teacher,
      ClassType.ONE_TO_ONE,
      new Date(slot.getTime() + 2 * 3_600_000),
    );
    oneToOneRoom = `lesson-${solo.id}`;

    outsider = await makeUser('otto-outsider', Role.STUDENT);
    await makeLesson(outsider, otherTeacher, ClassType.BATCH, slot);
  });

  // ─── Every badge ───────────────────────────────────────────────────────────

  describe.each(BADGE_CATALOG.map((b) => [b.id, b.emoji, b.name] as const))(
    'badge %s',
    (id, emoji, name) => {
      it(`can be awarded; the student is told "${name}"`, async () => {
        const ada = batchStudents[0];
        present(ada);
        const res = await award(id, [ada.id]);

        expect(res.badge).toEqual({ id, emoji, name });
        expect(res.awards).toHaveLength(1);
        expect(res.awards[0]).toMatchObject({
          studentUserId: ada.id,
          created: true,
          notified: true,
        });
        const [row] = await rows();
        expect(row).toMatchObject({
          badgeId: id,
          studentUserId: ada.id,
          awardedByUserId: teacher.id,
          room: batchRoom,
          revokedAt: null,
        });
        expect(rooms.sent).toHaveLength(1);
        expect(rooms.sent[0].event).toEqual({
          type: 'badge-awarded',
          awardId: row.id,
          badgeId: id,
          name,
          emoji,
        });
      });
    },
  );

  // ─── 1:1 and batch ─────────────────────────────────────────────────────────

  describe('awarding in a 1:1 class', () => {
    it('saves the award with the student’s own lesson and shows it to them alone', async () => {
      present(oneToOneStudent, 'laptop01');
      const res = await award(
        'problem-solver',
        [oneToOneStudent.id],
        newRequestId(),
        oneToOneRoom,
      );

      expect(res.awards).toMatchObject([
        { studentName: 'olive solo', notified: true },
      ]);
      const [row] = await rows();
      const lesson = await prisma.scheduledLesson.findFirstOrThrow({
        where: { studentUserId: oneToOneStudent.id },
      });
      expect(row.scheduledLessonId).toBe(lesson.id);
      expect(row.room).toBe(oneToOneRoom);
      expect(rooms.sent[0].identities).toEqual([
        buildIdentity(oneToOneStudent.id, 'laptop01'),
      ]);
    });
  });

  describe('awarding in a batch', () => {
    it('gives the badge only to the selected students, and celebrates only for them', async () => {
      const [ada, ben, cleo, dev] = batchStudents;
      for (const s of batchStudents) present(s);

      const res = await award('team-star', [ada.id, cleo.id]);

      expect(res.awards.map((a) => a.studentUserId).sort()).toEqual(
        [ada.id, cleo.id].sort(),
      );
      const stored = await rows();
      expect(stored.map((r) => r.studentUserId).sort()).toEqual(
        [ada.id, cleo.id].sort(),
      );
      // nothing stored, or sent, for the others
      for (const other of [ben, dev]) {
        expect(await rows({ studentUserId: other.id })).toHaveLength(0);
      }
      const addressed = rooms.sent.flatMap((s) => s.identities).sort();
      expect(addressed).toEqual(
        [
          buildIdentity(ada.id, 'aaaa1111'),
          buildIdentity(cleo.id, 'aaaa1111'),
        ].sort(),
      );
      // each celebration went to its own student only
      for (const s of rooms.sent) expect(s.identities).toHaveLength(1);
    });

    it('can give one badge to everyone in the class', async () => {
      for (const s of batchStudents) present(s);
      const res = await award(
        'rising-star',
        batchStudents.map((s) => s.id),
      );
      expect(res.awards).toHaveLength(4);
      expect(await rows()).toHaveLength(4);
      expect(rooms.sent).toHaveLength(4);
    });

    it('records each award against that student’s own lesson', async () => {
      for (const s of batchStudents) present(s);
      await award(
        'rising-star',
        batchStudents.map((s) => s.id),
      );
      for (const s of batchStudents) {
        const lesson = await prisma.scheduledLesson.findFirstOrThrow({
          where: { studentUserId: s.id },
        });
        expect((await rows({ studentUserId: s.id }))[0].scheduledLessonId).toBe(
          lesson.id,
        );
      }
    });

    it('a student on two devices sees it on both; their classmates see nothing', async () => {
      const [ada, ben] = batchStudents;
      present(ada, 'laptop01', 'phone002');
      present(ben);
      await award('curious-mind', [ada.id]);
      expect(rooms.sent).toHaveLength(1);
      expect(rooms.sent[0].identities.sort()).toEqual([
        buildIdentity(ada.id, 'laptop01'),
        buildIdentity(ada.id, 'phone002'),
      ]);
    });
  });

  // ─── Who may award ─────────────────────────────────────────────────────────

  describe('authorization and validation', () => {
    it.each([
      ['another teacher', () => otherTeacher],
      ['a student of the class', () => batchStudents[0]],
      ['an admin', () => admin],
    ])('%s cannot award in this class', async (_who, as) => {
      present(batchStudents[0]);
      await expect(
        award(
          'bright-spark',
          [batchStudents[0].id],
          newRequestId(),
          batchRoom,
          as(),
        ),
      ).rejects.toThrow(/Only the teacher of this class/);
      expect(await rows()).toHaveLength(0);
      expect(rooms.sent).toHaveLength(0);
    });

    it('cannot be sent to a student who is not in this class', async () => {
      present(batchStudents[0]);
      await expect(award('bright-spark', [outsider.id])).rejects.toThrow(
        /not in this class/,
      );
      await expect(
        award('bright-spark', [batchStudents[0].id, outsider.id]),
      ).rejects.toThrow(/not in this class/);
      await expect(award('bright-spark', [oneToOneStudent.id])).rejects.toThrow(
        /not in this class/,
      ); // another class of the same teacher
      expect(await rows()).toHaveLength(0);
    });

    it('a teacher cannot award themselves', async () => {
      await expect(award('bright-spark', [teacher.id])).rejects.toThrow(
        /yourself/,
      );
      expect(await rows()).toHaveLength(0);
    });

    it('rejects an unknown badge, an empty list of students, and an unknown or non-curriculum room', async () => {
      await expect(award('gold-medal', [batchStudents[0].id])).rejects.toThrow(
        /not a classroom badge/,
      );
      await expect(award('bright-spark', [])).rejects.toThrow(
        /at least one student/,
      );
      await expect(
        award(
          'bright-spark',
          [batchStudents[0].id],
          newRequestId(),
          'lesson-nope',
        ),
      ).rejects.toThrow(/not found/i);
      await expect(
        award(
          'bright-spark',
          [batchStudents[0].id],
          newRequestId(),
          'no-such-booking',
        ),
      ).rejects.toThrow(/not found/i);
    });

    it('does not award in a cancelled 1:1 class', async () => {
      const cancelled = await makeLesson(
        outsider,
        teacher,
        ClassType.ONE_TO_ONE,
        new Date(slot.getTime() + 5 * 3_600_000),
        LessonStatus.CANCELLED,
      );
      await expect(
        award(
          'bright-spark',
          [outsider.id],
          newRequestId(),
          `lesson-${cancelled.id}`,
        ),
      ).rejects.toThrow(/not in this class/);
    });

    it('works in the QA demo room, for the demo student only', async () => {
      const demoTeacher = await prisma.user.create({
        data: {
          email: DEMO_TEACHER_EMAIL,
          password: 'x',
          fullName: 'Teacher Demo',
          role: Role.TEACHER,
        },
      });
      const demoStudent = await prisma.user.create({
        data: {
          email: DEMO_STUDENT_EMAIL,
          password: 'x',
          fullName: 'Demo Student',
          role: Role.STUDENT,
        },
      });
      const res = await badges.award(demoTeacher.id, DEMO_ROOM_NAME, {
        badgeId: 'demo-star',
        studentUserIds: [demoStudent.id],
        requestId: newRequestId(),
      });
      expect(res.awards[0].studentName).toBe('Demo Student');
      expect((await rows())[0].scheduledLessonId).toBeNull();
      await expect(
        badges.award(demoTeacher.id, DEMO_ROOM_NAME, {
          badgeId: 'demo-star',
          studentUserIds: [batchStudents[0].id],
          requestId: newRequestId(),
        }),
      ).rejects.toThrow(/not in this class/);
    });
  });

  // ─── Double clicks, retries, later re-awards ───────────────────────────────

  describe('idempotency', () => {
    it('the same request twice (a retry) stores one award and celebrates once', async () => {
      present(batchStudents[0]);
      const id = newRequestId();
      const first = await award('bright-spark', [batchStudents[0].id], id);
      const second = await award('bright-spark', [batchStudents[0].id], id);

      expect(await rows()).toHaveLength(1);
      expect(first.awards[0]).toMatchObject({ created: true, notified: true });
      expect(second.awards[0]).toMatchObject({
        created: false,
        notified: false,
      });
      expect(second.awards[0].awardId).toBe(first.awards[0].awardId);
      expect(rooms.sent).toHaveLength(1);
    });

    it('a rapid double click (two requests in flight at once) still stores and celebrates once', async () => {
      const ada = batchStudents[0];
      present(ada);
      const id = newRequestId();
      const results = await Promise.all([
        award('bright-spark', [ada.id], id),
        award('bright-spark', [ada.id], id),
        award('bright-spark', [ada.id], id),
      ]);
      expect(await rows()).toHaveLength(1);
      expect(results.filter((r) => r.awards[0].created)).toHaveLength(1);
      expect(rooms.sent).toHaveLength(1);
    });

    it('a retry of a batch award that half-succeeded fills in only what is missing', async () => {
      const [ada, ben] = batchStudents;
      present(ada);
      present(ben);
      const id = newRequestId();
      await award('bright-spark', [ada.id], id);
      // the same action, now with a second student (e.g. the first call was cut off)
      const res = await award('bright-spark', [ada.id, ben.id], id);
      expect(
        res.awards.map((a) => [a.studentUserId, a.created]).sort(),
      ).toEqual(
        [
          [ada.id, false],
          [ben.id, true],
        ].sort(),
      );
      expect(await rows()).toHaveLength(2);
      expect(rooms.sent).toHaveLength(2); // one each, never twice for Ada
    });

    it('the same badge can be awarded again on a later occasion — there is no lifetime limit', async () => {
      const ada = batchStudents[0];
      present(ada);
      await award('bright-spark', [ada.id]);
      await award('bright-spark', [ada.id]);
      await award('bright-spark', [ada.id]);
      expect(
        await rows({ studentUserId: ada.id, badgeId: 'bright-spark' }),
      ).toHaveLength(3);
      expect(rooms.sent).toHaveLength(3);
    });

    it('a request id cannot be reused for a different badge, student set or teacher', async () => {
      const [ada] = batchStudents;
      present(ada);
      const id = newRequestId();
      await award('bright-spark', [ada.id], id);
      await expect(award('team-star', [ada.id], id)).rejects.toThrow(
        /already used for a different award/,
      );
      expect(await rows()).toHaveLength(1);
    });
  });

  // ─── Saved first, announced second ─────────────────────────────────────────

  describe('persistence and delivery', () => {
    it('the award is already saved when the student is told', async () => {
      const ada = batchStudents[0];
      present(ada);
      const seen: number[] = [];
      rooms.onSend = async (s) => {
        if (s.event.type === 'badge-awarded') {
          seen.push(
            await prisma.classroomBadgeAward.count({
              where: { id: s.event.awardId },
            }),
          );
        }
      };
      await award('bright-spark', [ada.id]);
      expect(seen).toEqual([1]);
    });

    it('if the celebration cannot be delivered the award still stands, and the teacher is told', async () => {
      const ada = batchStudents[0];
      present(ada);
      rooms.failSend = true;
      const res = await award('bright-spark', [ada.id]);
      expect(res.awards[0]).toMatchObject({ created: true, notified: false });
      expect(await rows()).toHaveLength(1);
    });

    it('if LiveKit cannot even say who is there, the award still stands', async () => {
      rooms.failList = true;
      const res = await award('bright-spark', [batchStudents[0].id]);
      expect(res.awards[0]).toMatchObject({ created: true, notified: false });
      expect(await rows()).toHaveLength(1);
    });

    it('a student who is not in the room is not notified, and still sees the badge in My Badges', async () => {
      const ada = batchStudents[0];
      const res = await award('bright-spark', [ada.id]); // Ada is nowhere in LiveKit
      expect(res.awards[0]).toMatchObject({ created: true, notified: false });
      expect(rooms.sent).toHaveLength(0);

      const mine = await badges.mine(ada.id);
      expect(mine.total).toBe(1);
      expect(mine.badges[0]).toMatchObject({
        badgeId: 'bright-spark',
        name: 'Bright Spark',
        emoji: '⭐',
        awardedBy: 'ms karim',
      });
    });

    it('does not send anything for a repeat, and never to someone who was not awarded', async () => {
      const [ada, ben] = batchStudents;
      present(ada);
      present(ben);
      const id = newRequestId();
      await award('bright-spark', [ada.id], id);
      rooms.sent = [];
      await award('bright-spark', [ada.id], id);
      expect(rooms.sent).toHaveLength(0);
    });
  });

  // ─── Undo ──────────────────────────────────────────────────────────────────

  describe('undo', () => {
    it('takes the award back, for the whole action, and the collection reflects it', async () => {
      const [ada, ben] = batchStudents;
      present(ada);
      present(ben);
      const id = newRequestId();
      await award('bright-spark', [ada.id, ben.id], id);
      expect((await badges.mine(ada.id)).total).toBe(1);

      const res = await badges.undo(teacher.id, batchRoom, id);
      expect(res).toEqual({ ok: true, revoked: 2, alreadyUndone: false });
      expect((await badges.mine(ada.id)).total).toBe(0);
      expect((await badges.mine(ben.id)).total).toBe(0);
      // the record is kept, marked revoked, by whom
      const stored = await rows();
      expect(stored).toHaveLength(2);
      for (const r of stored) {
        expect(r.revokedAt).toBeInstanceOf(Date);
        expect(r.revokedByUserId).toBe(teacher.id);
      }
    });

    it('undoing twice is harmless', async () => {
      present(batchStudents[0]);
      const id = newRequestId();
      await award('bright-spark', [batchStudents[0].id], id);
      await badges.undo(teacher.id, batchRoom, id);
      expect(await badges.undo(teacher.id, batchRoom, id)).toEqual({
        ok: true,
        revoked: 0,
        alreadyUndone: true,
      });
    });

    it('only the teacher who made the award can undo it', async () => {
      present(batchStudents[0]);
      const id = newRequestId();
      await award('bright-spark', [batchStudents[0].id], id);
      await expect(badges.undo(otherTeacher.id, batchRoom, id)).rejects.toThrow(
        /Only the teacher/,
      );
      await expect(
        badges.undo(batchStudents[0].id, batchRoom, id),
      ).rejects.toThrow(/Only the teacher/);
      expect((await badges.mine(batchStudents[0].id)).total).toBe(1);
    });

    it('cannot undo an award that does not exist, or one from another action or class', async () => {
      await expect(
        badges.undo(teacher.id, batchRoom, 'no-such-request'),
      ).rejects.toThrow(/not found/i);
      present(batchStudents[0]);
      const id = newRequestId();
      await award('bright-spark', [batchStudents[0].id], id);
      // same teacher, but the award was made in a different room
      await expect(badges.undo(teacher.id, oneToOneRoom, id)).rejects.toThrow(
        /not found/i,
      );
    });

    it('is only for a couple of minutes after the award', async () => {
      present(batchStudents[0]);
      const id = newRequestId();
      await award('bright-spark', [batchStudents[0].id], id);
      await prisma.classroomBadgeAward.updateMany({
        data: {
          createdAt: new Date(Date.now() - BADGE_UNDO_WINDOW_MS - 5_000),
        },
      });
      await expect(badges.undo(teacher.id, batchRoom, id)).rejects.toThrow(
        /too late/,
      );
      expect((await badges.mine(batchStudents[0].id)).total).toBe(1);
    });

    it('after an undo the same badge can still be awarded again later', async () => {
      const ada = batchStudents[0];
      present(ada);
      const id = newRequestId();
      await award('bright-spark', [ada.id], id);
      await badges.undo(teacher.id, batchRoom, id);
      await award('bright-spark', [ada.id]);
      expect((await badges.mine(ada.id)).total).toBe(1);
    });

    it('a late retry of an award that was undone is reported as undone, not silently restored', async () => {
      const ada = batchStudents[0];
      present(ada);
      const id = newRequestId();
      await award('bright-spark', [ada.id], id);
      await badges.undo(teacher.id, batchRoom, id);
      const retry = await award('bright-spark', [ada.id], id);
      expect(retry.awards[0]).toMatchObject({
        created: false,
        revoked: true,
        notified: false,
      });
      expect((await badges.mine(ada.id)).total).toBe(0);
    });
  });

  // ─── My Badges ─────────────────────────────────────────────────────────────

  describe('My Badges', () => {
    it('lists a student’s badges, newest first, with dates, and counts repeats', async () => {
      const ada = batchStudents[0];
      await award('bright-spark', [ada.id]);
      await award('team-star', [ada.id]);
      await award('bright-spark', [ada.id]);

      const mine = await badges.mine(ada.id);
      expect(mine.total).toBe(3);
      expect(mine.badges.map((b) => b.badgeId)).toEqual([
        'bright-spark',
        'team-star',
        'bright-spark',
      ]);
      for (const b of mine.badges) {
        expect(new Date(b.awardedAt).getTime()).not.toBeNaN();
        expect(b.criteria.length).toBeGreaterThan(0);
      }
      expect(
        mine.summary.find((s) => s.badgeId === 'bright-spark'),
      ).toMatchObject({ count: 2, name: 'Bright Spark' });
      expect(mine.summary.find((s) => s.badgeId === 'team-star')).toMatchObject(
        { count: 1 },
      );
    });

    it('shows a student only their own badges', async () => {
      const [ada, ben] = batchStudents;
      await award('bright-spark', [ada.id]);
      expect((await badges.mine(ben.id)).total).toBe(0);
      expect((await badges.mine(outsider.id)).total).toBe(0);
    });

    it('still shows an old award whose badge has since left the catalog, plainly', async () => {
      const ada = batchStudents[0];
      await prisma.classroomBadgeAward.create({
        data: {
          badgeId: 'retired-badge',
          requestId: newRequestId(),
          studentUserId: ada.id,
          awardedByUserId: teacher.id,
          room: batchRoom,
        },
      });
      const mine = await badges.mine(ada.id);
      expect(mine.badges[0]).toMatchObject({
        badgeId: 'retired-badge',
        emoji: '🏅',
      });
    });

    it('is empty for a student with no badges', async () => {
      expect(await badges.mine(batchStudents[0].id)).toEqual({
        total: 0,
        badges: [],
        summary: [],
      });
    });
  });

  // ─── Keeping the legacy badges separate ────────────────────────────────────

  it('does not touch the older gem/badge system', async () => {
    await award('bright-spark', [batchStudents[0].id]);
    expect(await prisma.studentBadge.count()).toBe(0);
    expect(await prisma.gemTransaction.count()).toBe(0);
  });
});
