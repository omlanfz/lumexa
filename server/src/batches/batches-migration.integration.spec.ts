// The batches migration against a REAL Postgres: what happens to the "batches"
// that exist today (students whose BATCH classes share a teacher, curriculum
// and start time) when batches become real, and the database rules that hold
// from then on.
//
// The data conversion is the DO block inside the migration file itself — this
// spec extracts and runs exactly that SQL over legacy-shaped data (the link
// constraint, which only holds once the data is converted, is lifted for the
// seeding and put back afterwards), so the migration a deployment runs is the
// one under test.
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

import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ClassType, LessonStatus, Role } from '@prisma/client';
import { PrismaModule } from '../prisma.module';
import { PrismaService } from '../prisma.service';
import { utcToDhakaParts } from '../scheduling/dhaka-time.util';
import {
  BatchWorld,
  Person,
  buildBatchWorld,
  makeUser,
} from './testing/batch-world';

const describeDb = IT_DB_URL ? describe : describe.skip;

const MIGRATION = path.join(
  __dirname,
  '../../prisma/migrations/20261027000000_batches/migration.sql',
);
const LINK_CHECK = 'ScheduledLesson_batch_link_check';

/** The data-conversion statement of the migration (its one DO block). */
function backfillBlock(): string {
  const sql = fs.readFileSync(MIGRATION, 'utf8');
  const start = sql.indexOf('\nDO $$');
  const end = sql.indexOf('\n$$;', start);
  if (start < 0 || end < 0) {
    throw new Error('The backfill block was not found in the migration.');
  }
  return sql.slice(start + 1, end + '\n$$;'.length - 1);
}

describeDb('The batches migration (real Postgres)', () => {
  jest.setTimeout(180_000);

  let prisma: PrismaService;
  let w: BatchWorld;
  let releaseLock: () => void;

  const hasLinkCheck = async () =>
    (
      await prisma.$queryRaw<{ n: bigint }[]>`
        SELECT count(*) AS n FROM pg_constraint WHERE conname = ${LINK_CHECK}`
    )[0].n > 0n;

  async function liftLinkCheck() {
    if (await hasLinkCheck()) {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "ScheduledLesson" DROP CONSTRAINT "${LINK_CHECK}"`,
      );
    }
  }

  async function restoreLinkCheck() {
    if (!(await hasLinkCheck())) {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "ScheduledLesson" ADD CONSTRAINT "${LINK_CHECK}"
        CHECK (
          ("classType" = 'BATCH') = ("batchSessionId" IS NOT NULL)
          AND ("batchId" IS NULL) = ("batchSessionId" IS NULL)
        )`);
    }
  }

  beforeAll(async () => {
    releaseLock = await acquireDatabaseLock(IT_DB_URL as string);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const mod = await Test.createTestingModule({
      imports: [PrismaModule],
    }).compile();
    prisma = mod.get(PrismaService);
    w = buildBatchWorld(prisma);
  });

  afterAll(async () => {
    await truncateAssessmentData(prisma).catch(() => undefined);
    await restoreLinkCheck().catch(() => undefined);
    jest.restoreAllMocks();
    await prisma?.$disconnect();
    releaseLock?.();
  });

  // ═══ The data conversion ═══════════════════════════════════════════════════

  describe('existing Batch classes become real batches', () => {
    // Dates are relative to today so the data looks like a live system: group
    // A has taught two classes and has six ahead of it.
    const at = (daysFromNow: number, hourUtc: number) => {
      const d = new Date(Date.now() + daysFromNow * 86_400_000);
      d.setUTCHours(hourUtc, 0, 0, 0);
      return d;
    };
    const GROUP_A_STARTS = [-10, -7, 1, 4, 8, 11, 15, 18].map((d) => at(d, 16));
    const GROUP_B_STARTS = [2, 5, 9, 12].map((d) => at(d, 12));

    let t1: Person;
    let t2: Person;
    let c1: { id: string; title: string };
    let c2: { id: string; title: string };
    const people: Record<string, Person> = {};
    let lessonIdsC1: Map<number, string>;
    let before: Awaited<ReturnType<typeof snapshot>>;
    let notices: string[] = [];

    const snapshot = async () => ({
      lessons: await prisma.scheduledLesson.findMany({
        orderBy: { id: 'asc' },
      }),
      payouts: await prisma.payoutEntry.findMany({ orderBy: { id: 'asc' } }),
      ledger: await prisma.studentLedgerEntry.findMany({
        orderBy: { id: 'asc' },
      }),
    });

    async function legacyStudent(
      key: string,
      teacher: Person,
      course: { id: string },
      classType: ClassType | null = ClassType.BATCH,
      extra: Record<string, unknown> = {},
    ) {
      people[key] = await makeUser(prisma, `legacy-${key}`, Role.STUDENT, {
        assignedTeacherId: teacher.profileId,
        assignedCourseId: course.id,
        assignedClassType: classType,
        ...extra,
      });
      return people[key];
    }

    async function legacyLesson(
      id: string,
      student: Person,
      teacher: Person,
      course: { id: string },
      n: number,
      start: Date,
      status: LessonStatus,
      over: Record<string, unknown> = {},
      classType: ClassType = ClassType.BATCH,
    ) {
      const done = status !== LessonStatus.UPCOMING;
      return prisma.scheduledLesson.create({
        data: {
          id,
          studentUserId: student.id,
          teacherId: teacher.profileId!,
          courseId: course.id,
          lessonNumber: n,
          lessonId: course.id === c1.id ? lessonIdsC1.get(n) : undefined,
          start,
          end: new Date(start.getTime() + 60 * 60_000),
          classType,
          status,
          teacherJoinedAt: done ? new Date(start.getTime() + 60_000) : null,
          studentJoinedAt:
            status === LessonStatus.COMPLETED
              ? new Date(start.getTime() + 120_000)
              : null,
          endedAt: done ? new Date(start.getTime() + 65 * 60_000) : null,
          endedByRole: done ? 'TEACHER' : null,
          ...over,
        },
      });
    }

    beforeAll(async () => {
      await truncateAssessmentData(prisma);
      await liftLinkCheck();

      t1 = await makeUser(prisma, 'fairooz-omlan', Role.TEACHER);
      t2 = await makeUser(prisma, 'teacher-demo', Role.TEACHER);
      c1 = await prisma.course.create({
        data: {
          slug: 'legacy-ai-builder',
          title: 'AI Builder Path',
          category: 'AI',
          level: 'BEGINNER',
          sessions: 8,
        },
      });
      c2 = await prisma.course.create({
        data: {
          slug: 'legacy-web-dev',
          title: 'Web Developer Path',
          category: 'Web',
          level: 'BEGINNER',
          sessions: 8,
        },
      });
      lessonIdsC1 = new Map();
      for (let order = 1; order <= 8; order++) {
        const l = await prisma.lesson.create({
          data: { courseId: c1.id, title: `Lesson ${order}`, order },
        });
        lessonIdsC1.set(order, l.id);
      }

      // ── Group A: four students taught together on Tue/Fri 22:00 ──────────
      for (const key of ['A1', 'A2', 'A3', 'I1']) {
        await legacyStudent(key, t1, c1);
      }
      // A3 is paused — and stays a member.
      await prisma.user.update({
        where: { id: people.A3.id },
        data: { accountStatus: 'PAUSED' },
      });
      for (const key of ['A1', 'A2', 'A3']) {
        for (let k = 1; k <= 8; k++) {
          const noShow = key === 'A3' && k === 1;
          await legacyLesson(
            `L-${key}-${k}`,
            people[key],
            t1,
            c1,
            k,
            GROUP_A_STARTS[k - 1],
            k <= 2
              ? noShow
                ? LessonStatus.INCOMPLETE
                : LessonStatus.COMPLETED
              : LessonStatus.UPCOMING,
            noShow ? { endReason: 'STUDENT_NO_SHOW' } : {},
          );
        }
      }
      // I1 joined the group at lesson 3.
      for (let k = 3; k <= 8; k++) {
        await legacyLesson(
          `L-I1-${k}`,
          people.I1,
          t1,
          c1,
          k,
          GROUP_A_STARTS[k - 1],
          LessonStatus.UPCOMING,
        );
      }
      for (const key of ['A1', 'A2', 'A3', 'I1']) {
        for (const weekday of [2, 5]) {
          await prisma.recurringSlot.create({
            data: {
              studentUserId: people[key].id,
              teacherId: t1.profileId!,
              courseId: c1.id,
              weekday,
              hour: 22,
              minute: 0,
              classType: ClassType.BATCH,
            },
          });
        }
      }
      // Money that already exists: a teacher earning and a student's lesson.
      await prisma.payoutEntry.create({
        data: {
          teacherId: t1.profileId!,
          type: 'CLASS_COMPLETED',
          amountCents: 20_000,
          description: 'Completed class with Legacy A1',
          month: 10,
          year: 2026,
          referenceType: 'SCHEDULED_LESSON',
          referenceId: 'L-A1-1',
        },
      });
      await prisma.studentLedgerEntry.create({
        data: {
          studentUserId: people.A1.id,
          type: 'LESSON_COMPLETED',
          amountCents: -100_000,
          balanceAfterCents: 500_000,
          rateCents: 100_000,
          courseId: c1.id,
          courseName: c1.title,
          scheduledLessonId: 'L-A1-1',
        },
      });
      // The room the class used to be in.
      await prisma.classroomRoomState.create({
        data: {
          room: `batch-${t1.profileId}-${GROUP_A_STARTS[2].getTime()}`,
          locked: true,
        },
      });

      // ── Group B: two students who drifted apart in lesson numbers ─────────
      for (const key of ['B1', 'B2']) await legacyStudent(key, t1, c1);
      for (let i = 0; i < GROUP_B_STARTS.length; i++) {
        await legacyLesson(
          `L-B1-${i}`,
          people.B1,
          t1,
          c1,
          i + 1,
          GROUP_B_STARTS[i],
          LessonStatus.UPCOMING,
        );
        await legacyLesson(
          `L-B2-${i}`,
          people.B2,
          t1,
          c1,
          i + 2,
          GROUP_B_STARTS[i],
          LessonStatus.UPCOMING,
        );
      }

      // ── C1: a batch of one, on a different teacher and curriculum ─────────
      await legacyStudent('C1', t2, c2);
      await legacyLesson(
        'L-C1-1',
        people.C1,
        t2,
        c2,
        1,
        at(3, 10),
        LessonStatus.UPCOMING,
      );
      await legacyLesson(
        'L-C1-2',
        people.C1,
        t2,
        c2,
        2,
        at(10, 10),
        LessonStatus.UPCOMING,
      );

      // ── D1/D2: same teacher and time, DIFFERENT curricula → different batches
      await legacyStudent('D1', t2, c1);
      await legacyStudent('D2', t2, c2);
      await legacyLesson(
        'L-D1-1',
        people.D1,
        t2,
        c1,
        1,
        at(14, 12),
        LessonStatus.UPCOMING,
      );
      await legacyLesson(
        'L-D2-1',
        people.D2,
        t2,
        c2,
        1,
        at(14, 12),
        LessonStatus.UPCOMING,
      );

      // ── E1: "Batch" type, nothing scheduled; F1: ordinary 1-to-1; G1: slots only
      await legacyStudent('E1', t1, c1);
      await legacyStudent('F1', t1, c1, ClassType.ONE_TO_ONE);
      for (let k = 1; k <= 3; k++) {
        await legacyLesson(
          `L-F1-${k}`,
          people.F1,
          t1,
          c1,
          k,
          at(3 + k, 8),
          LessonStatus.UPCOMING,
          {},
          ClassType.ONE_TO_ONE,
        );
      }
      await prisma.recurringSlot.create({
        data: {
          studentUserId: people.F1.id,
          teacherId: t1.profileId!,
          courseId: c1.id,
          weekday: 1,
          hour: 14,
          minute: 0,
          classType: ClassType.ONE_TO_ONE,
        },
      });
      await legacyStudent('G1', t1, c1);
      await prisma.recurringSlot.create({
        data: {
          studentUserId: people.G1.id,
          teacherId: t1.profileId!,
          courseId: c1.id,
          weekday: 3,
          hour: 10,
          minute: 0,
          classType: ClassType.BATCH,
        },
      });

      // ── H1: two lessons of one student at the very same start ─────────────
      await legacyStudent('H1', t2, c2);
      const same = at(15, 9);
      await legacyLesson(
        'h1-a',
        people.H1,
        t2,
        c2,
        1,
        same,
        LessonStatus.UPCOMING,
      );
      await legacyLesson(
        'h1-b',
        people.H1,
        t2,
        c2,
        2,
        same,
        LessonStatus.UPCOMING,
      );

      before = await snapshot();

      // ── Run the migration's data conversion ──────────────────────────────
      notices = [];
      await prisma.$executeRawUnsafe(backfillBlock());
      await restoreLinkCheck();
    });

    const batchOf = async (studentKey: string) => {
      const m = await prisma.batchMember.findFirstOrThrow({
        where: { studentUserId: people[studentKey].id },
        include: { batch: { include: { slots: true } } },
      });
      return m.batch;
    };

    it('leaves no Batch lesson without its class (the link rule holds again)', async () => {
      expect(await hasLinkCheck()).toBe(true);
      expect(
        await prisma.scheduledLesson.count({
          where: { classType: 'BATCH', batchSessionId: null },
        }),
      ).toBe(0);
      expect(notices).toEqual([]);
    });

    it('deletes and rewrites nothing: every lesson keeps its id, number, time, status and attendance (only the link is added)', async () => {
      const after = await snapshot();
      expect(after.lessons).toHaveLength(before.lessons.length);
      const byId = new Map(after.lessons.map((l) => [l.id, l]));
      for (const was of before.lessons) {
        const now = byId.get(was.id)!;
        expect(now).toBeDefined();
        for (const field of [
          'studentUserId',
          'teacherId',
          'courseId',
          'lessonNumber',
          'lessonId',
          'start',
          'end',
          'status',
          'teacherJoinedAt',
          'studentJoinedAt',
          'endedAt',
          'endedByRole',
          'endReason',
        ] as const) {
          expect(now[field]).toEqual(was[field]);
        }
      }
    });

    it('leaves money exactly as it was: teacher earnings and student ledger rows', async () => {
      const after = await snapshot();
      expect(after.payouts).toEqual(before.payouts);
      expect(after.ledger).toEqual(before.ledger);
    });

    it('turns each group of students taught together into ONE batch with its members, teacher, curriculum and weekly slots', async () => {
      const a = await batchOf('A1');
      for (const key of ['A2', 'A3', 'I1']) {
        expect((await batchOf(key)).id).toBe(a.id);
      }
      expect(a).toMatchObject({
        teacherId: t1.profileId,
        courseId: c1.id,
        status: 'ACTIVE',
        maxStudents: 4,
        startLessonNumber: 3,
        startDate: utcToDhakaParts(GROUP_A_STARTS[0]).dateStr,
      });
      expect(a.slots.map((s) => [s.weekday, s.hour, s.minute]).sort()).toEqual([
        [2, 22, 0],
        [5, 22, 0],
      ]);
      expect(a.name).toContain('AI Builder Path');
      expect(a.name).toContain('Tue 22:00');
      expect(a.name).toContain('Fri 22:00');
      const members = await prisma.batchMember.findMany({
        where: { batchId: a.id },
      });
      expect(members).toHaveLength(4);
      // A paused student keeps their place; nobody has left; the record says
      // they were migrated and from which lesson they came.
      expect(members.every((m) => m.leftAt === null)).toBe(true);
      expect(members.every((m) => m.alignment === 'MIGRATED')).toBe(true);
      expect(
        members.find((m) => m.studentUserId === people.I1.id)!.joinedAtLesson,
      ).toBe(3);
      expect(
        members.find((m) => m.studentUserId === people.A1.id)!.joinedAtLesson,
      ).toBe(1);
    });

    it('turns each shared class time into ONE class, with each student’s own lesson as their row in it', async () => {
      const a = await batchOf('A1');
      const sessions = await prisma.batchSession.findMany({
        where: { batchId: a.id },
        orderBy: { start: 'asc' },
        include: { participants: { orderBy: { studentUserId: 'asc' } } },
      });
      expect(sessions).toHaveLength(8);
      expect(sessions.map((s) => s.start.getTime())).toEqual(
        GROUP_A_STARTS.map((d) => d.getTime()),
      );
      expect(sessions.map((s) => s.status)).toEqual([
        'COMPLETED',
        'COMPLETED',
        'UPCOMING',
        'UPCOMING',
        'UPCOMING',
        'UPCOMING',
        'UPCOMING',
        'UPCOMING',
      ]);
      expect(sessions.map((s) => s.participants.length)).toEqual([
        3, 3, 4, 4, 4, 4, 4, 4,
      ]);
      for (const [i, s] of sessions.entries()) {
        expect(s.lessonNumber).toBe(i + 1);
        expect(s.lessonId).toBe(lessonIdsC1.get(i + 1));
        expect(s.teacherId).toBe(t1.profileId);
        expect(s.end.getTime() - s.start.getTime()).toBe(60 * 60_000);
        for (const p of s.participants) {
          expect(p.classType).toBe('BATCH');
          expect(p.batchId).toBe(a.id);
          expect(p.batchSessionId).toBe(s.id);
        }
      }
      // The completed class kept the teacher's real arrival, and the student
      // who never came is still recorded as having missed it.
      expect(sessions[0].teacherJoinedAt).not.toBeNull();
      const missed = sessions[0].participants.find(
        (p) => p.studentUserId === people.A3.id,
      )!;
      expect(missed).toMatchObject({
        status: 'INCOMPLETE',
        endReason: 'STUDENT_NO_SHOW',
        studentJoinedAt: null,
      });
    });

    it('students who had drifted apart keep their own lesson numbers; the class carries the lowest', async () => {
      const b = await batchOf('B1');
      expect((await batchOf('B2')).id).toBe(b.id);
      const sessions = await prisma.batchSession.findMany({
        where: { batchId: b.id },
        orderBy: { start: 'asc' },
        include: { participants: true },
      });
      expect(sessions.map((s) => s.lessonNumber)).toEqual([1, 2, 3, 4]);
      for (const [i, s] of sessions.entries()) {
        const numbers = Object.fromEntries(
          s.participants.map((p) => [p.studentUserId, p.lessonNumber]),
        );
        expect(numbers[people.B1.id]).toBe(i + 1);
        expect(numbers[people.B2.id]).toBe(i + 2);
      }
    });

    it('students on different curricula are different batches even at the same time; a lone student is a batch of one', async () => {
      const d1 = await batchOf('D1');
      const d2 = await batchOf('D2');
      expect(d1.id).not.toBe(d2.id);
      expect(d1.courseId).toBe(c1.id);
      expect(d2.courseId).toBe(c2.id);
      const c = await batchOf('C1');
      expect(
        await prisma.batchSession.count({ where: { batchId: c.id } }),
      ).toBe(2);
      expect(await prisma.batchMember.count({ where: { batchId: c.id } })).toBe(
        1,
      );
      expect(await prisma.batch.count()).toBe(6); // A, B, C1, D1, D2, H1
    });

    it('gives every batch a readable, unique name', async () => {
      const names = (await prisma.batch.findMany()).map((b) => b.name);
      expect(new Set(names.map((n) => n.toLowerCase())).size).toBe(
        names.length,
      );
      expect(names.every((n) => n.length > 5 && n.length <= 110)).toBe(true);
    });

    it('leaves students without scheduled Batch classes, and 1-to-1 students, alone', async () => {
      for (const key of ['E1', 'G1', 'F1']) {
        expect(
          await prisma.batchMember.count({
            where: { studentUserId: people[key].id },
          }),
        ).toBe(0);
      }
      const f1 = await prisma.scheduledLesson.findMany({
        where: { studentUserId: people.F1.id },
      });
      expect(f1).toHaveLength(3);
      expect(
        f1.every(
          (l) =>
            l.classType === 'ONE_TO_ONE' &&
            l.batchId === null &&
            l.batchSessionId === null,
        ),
      ).toBe(true);
      // They are still Batch students awaiting a placement.
      expect(
        (await prisma.user.findUniqueOrThrow({ where: { id: people.E1.id } }))
          .assignedClassType,
      ).toBe('BATCH');
      // Personal weekly slots of 1-to-1 students stay; Batch students' are
      // replaced by their batch's own.
      expect(
        await prisma.recurringSlot.count({ where: { classType: 'BATCH' } }),
      ).toBe(0);
      expect(
        await prisma.recurringSlot.count({
          where: { classType: 'ONE_TO_ONE' },
        }),
      ).toBe(1);
    });

    it('a student with two lessons at one start keeps both: one in the class, the other as an ordinary lesson (nothing fails)', async () => {
      const rows = await prisma.scheduledLesson.findMany({
        where: { studentUserId: people.H1.id },
        orderBy: { id: 'asc' },
      });
      expect(
        rows.map((r) => [r.id, r.classType, r.batchSessionId !== null]),
      ).toEqual([
        ['h1-a', 'BATCH', true],
        ['h1-b', 'ONE_TO_ONE', false],
      ]);
    });

    it('moves the old room name (locks, recordings, admissions, badges) to the class’s new room', async () => {
      const a = await batchOf('A1');
      const third = await prisma.batchSession.findFirstOrThrow({
        where: { batchId: a.id, start: GROUP_A_STARTS[2] },
      });
      expect(
        await prisma.classroomRoomState.count({
          where: {
            room: `batch-${t1.profileId}-${GROUP_A_STARTS[2].getTime()}`,
          },
        }),
      ).toBe(0);
      expect(
        await prisma.classroomRoomState.findUniqueOrThrow({
          where: { room: `batch-session-${third.id}` },
        }),
      ).toMatchObject({ locked: true });
    });

    it('the converted data works: the admin screens read it, a new student can join, a teacher sees each class once', async () => {
      const a = await batchOf('A1');
      const detail = await w.batches.getBatchDetail(a.id);
      expect(detail.members).toHaveLength(4);
      expect(detail.upcomingSessions).toHaveLength(6);
      expect(detail.batch.progress).toMatchObject({
        completedThrough: 2,
        nextLesson: 3,
      });

      // The batch is exactly as full as the group was (four); an admin makes
      // room, then a new student joins through the normal flow: they are behind
      // it, so the admin must say they skip lessons 1–2.
      await w.batches.updateBatch(a.id, { maxStudents: 5 }, 'admin');
      const newcomer = await makeUser(prisma, 'newcomer', Role.STUDENT, {
        assignedTeacherId: t1.profileId,
        assignedCourseId: c1.id,
      });
      await expect(
        w.batches.enrollStudent({
          studentUserId: newcomer.id,
          batchId: a.id,
          adminUserId: 'admin',
        }),
      ).rejects.toMatchObject({
        response: { details: { code: 'DECISION_REQUIRED' } },
      });
      await w.batches.enrollStudent({
        studentUserId: newcomer.id,
        batchId: a.id,
        decisions: { progress: 'SKIP_TO_BATCH' },
        adminUserId: 'admin',
      });
      const rows = await prisma.scheduledLesson.findMany({
        where: { studentUserId: newcomer.id },
      });
      expect(rows.map((r) => r.lessonNumber).sort()).toEqual([
        3, 4, 5, 6, 7, 8,
      ]);

      const schedule = await w.scheduling.getTeacherScheduledLessons(t1.id);
      const sessions = schedule.filter((i) => i.kind === 'BATCH_SESSION');
      expect(sessions).toHaveLength(8 + 4 + 0); // A's 8 and B's 4 — each once
      expect(schedule.filter((i) => i.kind === 'LESSON')).toHaveLength(3); // F1's
    });
  });

  // ═══ The rules that hold from now on ═══════════════════════════════════════

  describe('database rules', () => {
    let teacher: Person;
    let course: { id: string };
    let s1: Person;
    let s2: Person;
    const start = new Date('2026-12-01T10:00:00Z');
    const end = new Date('2026-12-01T11:00:00Z');

    beforeAll(async () => {
      await truncateAssessmentData(prisma);
      await restoreLinkCheck();
      teacher = await makeUser(prisma, 'rules-teacher', Role.TEACHER);
      course = await prisma.course.create({
        data: {
          slug: 'rules-course',
          title: 'Rules',
          category: 'x',
          level: 'STARTER',
        },
      });
      s1 = await makeUser(prisma, 'rules-s1', Role.STUDENT);
      s2 = await makeUser(prisma, 'rules-s2', Role.STUDENT);
    });

    const newBatch = (name: string, over: Record<string, unknown> = {}) =>
      prisma.batch.create({
        data: {
          name,
          teacherId: teacher.profileId!,
          courseId: course.id,
          startDate: '2026-12-01',
          ...over,
        },
      });

    const rejected = async (p: Promise<unknown>) => {
      await expect(p).rejects.toBeDefined();
    };

    it('a student has at most one active placement; leaving frees them to join another', async () => {
      const a = await newBatch('Rule A');
      const b = await newBatch('Rule B');
      const first = await prisma.batchMember.create({
        data: { batchId: a.id, studentUserId: s1.id },
      });
      await rejected(
        prisma.batchMember.create({
          data: { batchId: b.id, studentUserId: s1.id },
        }),
      );
      await prisma.batchMember.update({
        where: { id: first.id },
        data: { leftAt: new Date() },
      });
      await expect(
        prisma.batchMember.create({
          data: { batchId: b.id, studentUserId: s1.id },
        }),
      ).resolves.toBeDefined();
    });

    it('active batch names are unique ignoring case; an archived batch frees its name', async () => {
      await newBatch('Evening Odyssey');
      await rejected(newBatch('evening odyssey'));
      const old = await newBatch('Old Name');
      await prisma.batch.update({
        where: { id: old.id },
        data: { status: 'ARCHIVED' },
      });
      await expect(newBatch('OLD NAME')).resolves.toBeDefined();
    });

    it('a batch holds one to nine students, a slot is a real time, a class ends after it starts', async () => {
      await rejected(newBatch('Zero', { maxStudents: 0 }));
      await rejected(newBatch('Ten', { maxStudents: 10 }));
      await expect(newBatch('Nine', { maxStudents: 9 })).resolves.toBeDefined();

      const batch = await newBatch('Slots');
      for (const bad of [
        { weekday: 7, hour: 10, minute: 0 },
        { weekday: 1, hour: 24, minute: 0 },
        { weekday: 1, hour: 10, minute: 60 },
      ]) {
        await rejected(
          prisma.batchSlot.create({ data: { batchId: batch.id, ...bad } }),
        );
      }
      await prisma.batchSlot.create({
        data: { batchId: batch.id, weekday: 1, hour: 10, minute: 0 },
      });
      await rejected(
        prisma.batchSlot.create({
          data: { batchId: batch.id, weekday: 1, hour: 10, minute: 0 },
        }),
      );
      await rejected(
        prisma.batchSession.create({
          data: {
            batchId: batch.id,
            teacherId: teacher.profileId!,
            courseId: course.id,
            lessonNumber: 1,
            start: end,
            end: start,
          },
        }),
      );
    });

    it('a Batch lesson always belongs to a class of a batch, a 1-to-1 lesson never does, and a student is in a class once', async () => {
      const batch = await newBatch('Links');
      const session = await prisma.batchSession.create({
        data: {
          batchId: batch.id,
          teacherId: teacher.profileId!,
          courseId: course.id,
          lessonNumber: 1,
          start,
          end,
        },
      });
      const base = {
        studentUserId: s1.id,
        teacherId: teacher.profileId!,
        courseId: course.id,
        lessonNumber: 1,
        start,
        end,
      };
      // Batch without a class
      await rejected(
        prisma.scheduledLesson.create({
          data: { ...base, classType: 'BATCH' },
        }),
      );
      // 1-to-1 with a class
      await rejected(
        prisma.scheduledLesson.create({
          data: {
            ...base,
            classType: 'ONE_TO_ONE',
            batchId: batch.id,
            batchSessionId: session.id,
          },
        }),
      );
      // a class without its batch
      await rejected(
        prisma.scheduledLesson.create({
          data: { ...base, classType: 'BATCH', batchSessionId: session.id },
        }),
      );
      const ok = {
        ...base,
        classType: 'BATCH' as const,
        batchId: batch.id,
        batchSessionId: session.id,
      };
      await expect(
        prisma.scheduledLesson.create({ data: ok }),
      ).resolves.toBeDefined();
      // the same student twice in one class
      await rejected(
        prisma.scheduledLesson.create({ data: { ...ok, lessonNumber: 2 } }),
      );
      // a second student is fine
      await expect(
        prisma.scheduledLesson.create({
          data: { ...ok, studentUserId: s2.id },
        }),
      ).resolves.toBeDefined();
      // and a plain 1-to-1 lesson needs no class at all
      await expect(
        prisma.scheduledLesson.create({
          data: {
            ...base,
            studentUserId: s2.id,
            lessonNumber: 5,
            classType: 'ONE_TO_ONE',
          },
        }),
      ).resolves.toBeDefined();
    });

    it('a class and a batch with students or classes cannot be deleted from under them', async () => {
      const batch = await newBatch('Protected');
      const session = await prisma.batchSession.create({
        data: {
          batchId: batch.id,
          teacherId: teacher.profileId!,
          courseId: course.id,
          lessonNumber: 1,
          start,
          end,
        },
      });
      await prisma.scheduledLesson.create({
        data: {
          studentUserId: s1.id,
          teacherId: teacher.profileId!,
          courseId: course.id,
          lessonNumber: 9,
          start,
          end,
          classType: 'BATCH',
          batchId: batch.id,
          batchSessionId: session.id,
        },
      });
      await rejected(prisma.batchSession.delete({ where: { id: session.id } }));
      await rejected(prisma.batch.delete({ where: { id: batch.id } }));
    });
  });
});
