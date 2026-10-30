// Student progress (rank, streak, badges) and class credits against a REAL
// Postgres: a class finalized by the real finalizer moves the student's
// progress and credits; the historical backfill reconstructs progress from
// existing class records, never invents any, and is idempotent. Email, alerts
// and the video room are faked.
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
import {
  BatchWorld,
  Person,
  buildBatchWorld,
  makeCourse,
  makeUser,
} from '../../batches/testing/batch-world';
import { createBatchWithSession } from '../../batches/testing/batch-fixtures';
import { StudentProgressService } from './student-progress.service';

const describeDb = IT_DB_URL ? describe : describe.skip;

const DAY = 86_400_000;

describeDb('Student progress & credits (real Postgres)', () => {
  jest.setTimeout(180_000);

  let prisma: PrismaService;
  let w: BatchWorld;
  let progress: StudentProgressService;
  let releaseLock: () => void;

  let admin: Person;
  let teacher: Person;
  let course: { id: string; title: string; sessions: number };

  beforeAll(async () => {
    releaseLock = await acquireDatabaseLock(IT_DB_URL as string);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const mod = await Test.createTestingModule({
      imports: [PrismaModule],
    }).compile();
    prisma = mod.get(PrismaService);
    w = buildBatchWorld(prisma);
    progress = new StudentProgressService(prisma, w.notifications as never);
  });

  afterAll(async () => {
    jest.restoreAllMocks();
    await prisma?.$disconnect();
    releaseLock?.();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    await truncateAssessmentData(prisma);
    await prisma.auditLog.deleteMany();
    admin = await makeUser(prisma, 'ops-admin', Role.ADMIN);
    teacher = await makeUser(prisma, 'ms-karim', Role.TEACHER);
    course = await makeCourse(prisma, 'progress-course', 12);
  });

  const student = (name: string, extra: Record<string, unknown> = {}) =>
    makeUser(prisma, name, Role.STUDENT, {
      assignedTeacherId: teacher.profileId,
      assignedCourseId: course.id,
      ...extra,
    });

  /** A finished 1:1 class `daysAgo` days back (an old record, as a backfill
   * would find it). */
  async function pastClass(
    studentUserId: string,
    lessonNumber: number,
    daysAgo: number,
    status: LessonStatus = LessonStatus.COMPLETED,
  ) {
    const start = new Date(Date.now() - daysAgo * DAY);
    return prisma.scheduledLesson.create({
      data: {
        studentUserId,
        teacherId: teacher.profileId!,
        courseId: course.id,
        lessonNumber,
        start,
        end: new Date(start.getTime() + 45 * 60_000),
        classType: ClassType.ONE_TO_ONE,
        status,
        studentJoinedAt: start,
      },
    });
  }

  /** An upcoming 1:1 class that the student joins and the teacher completes. */
  async function liveClass(studentUserId: string, lessonNumber: number) {
    const start = new Date(Date.now() - 50 * 60_000);
    return prisma.scheduledLesson.create({
      data: {
        studentUserId,
        teacherId: teacher.profileId!,
        courseId: course.id,
        lessonNumber,
        start,
        end: new Date(start.getTime() + 45 * 60_000),
        classType: ClassType.ONE_TO_ONE,
        status: LessonStatus.UPCOMING,
        studentJoinedAt: start,
        teacherJoinedAt: start,
      },
    });
  }

  const badgeTypes = async (id: string) =>
    (await prisma.studentBadge.findMany({ where: { userId: id } }))
      .map((b) => b.type)
      .sort();

  describe('after a class', () => {
    it('finalizing an attended class moves rank progress, streak and badges at once', async () => {
      const ada = await student('ada');
      const cls = await liveClass(ada.id, 1);

      await w.finalization.finalizeLesson(cls.id, {
        outcome: 'COMPLETED',
        actor: { role: 'TEACHER', userId: teacher.id },
      });

      const user = await prisma.user.findUniqueOrThrow({
        where: { id: ada.id },
      });
      expect(user.totalSessions).toBe(1);
      expect(user.spaceRank).toBe('STARCHILD');
      expect(user.streakWeeks).toBe(1);
      expect(await badgeTypes(ada.id)).toEqual(['FIRST_MISSION']);
      // Live mode: the student is told about the new badge.
      expect(w.notifications.sendAchievementEmail).toHaveBeenCalledTimes(1);
    });

    it('the fifth attended class promotes to Explorer and awards the rank badge', async () => {
      const ada = await student('ada');
      for (let n = 1; n <= 4; n++) await pastClass(ada.id, n, 10 - n);
      const cls = await liveClass(ada.id, 5);
      const live = new StudentProgressService(prisma, w.notifications as never);
      await live.sync(ada.id); // 4 classes so far
      expect(
        (await prisma.user.findUniqueOrThrow({ where: { id: ada.id } }))
          .spaceRank,
      ).toBe('STARCHILD');

      await w.finalization.finalizeLesson(cls.id, {
        outcome: 'COMPLETED',
        actor: { role: 'TEACHER', userId: teacher.id },
      });

      const user = await prisma.user.findUniqueOrThrow({
        where: { id: ada.id },
      });
      expect(user.totalSessions).toBe(5);
      expect(user.spaceRank).toBe('EXPLORER');
      expect(await badgeTypes(ada.id)).toEqual([
        'FIRST_MISSION',
        'RANK_EXPLORER',
      ]);
    });

    it('an Incomplete class gives no progress', async () => {
      const ada = await student('ada');
      const cls = await liveClass(ada.id, 1);
      await w.finalization.finalizeLesson(cls.id, {
        outcome: 'INCOMPLETE',
        reason: 'TECHNICAL_ISSUE' as never,
        actor: { role: 'TEACHER', userId: teacher.id },
      });
      const user = await prisma.user.findUniqueOrThrow({
        where: { id: ada.id },
      });
      expect(user.totalSessions).toBe(0);
      expect(await badgeTypes(ada.id)).toEqual([]);
    });

    it('a batch student who did not show up gets no progress; the one who did does', async () => {
      const present = await student('present-pat');
      const absent = await student('absent-abe');
      const start = new Date(Date.now() - 50 * 60_000);
      const fx = await createBatchWithSession(prisma, {
        teacherProfileId: teacher.profileId!,
        courseId: course.id,
        studentUserIds: [present.id, absent.id],
        start,
        end: new Date(start.getTime() + 45 * 60_000),
        lessonNumber: 1,
        joined: [present.id],
        teacherJoinedAt: start,
      });
      await w.finalization.finalizeBatchSession(fx.sessionId, {
        outcome: 'COMPLETED',
        actor: { role: 'TEACHER', userId: teacher.id },
      });
      const [p, a] = await Promise.all([
        prisma.user.findUniqueOrThrow({ where: { id: present.id } }),
        prisma.user.findUniqueOrThrow({ where: { id: absent.id } }),
      ]);
      expect(p.totalSessions).toBe(1);
      expect(await badgeTypes(present.id)).toEqual(['FIRST_MISSION']);
      expect(a.totalSessions).toBe(0);
      expect(await badgeTypes(absent.id)).toEqual([]);
    });
  });

  describe('historical backfill', () => {
    it('reconstructs rank, streak and badges from existing class records, dated by the class that earned them', async () => {
      const ada = await student('ada');
      // Six weekly classes, the latest one a day ago: 6 sessions and a streak
      // that is still alive.
      const rows: Awaited<ReturnType<typeof pastClass>>[] = [];
      for (let n = 1; n <= 6; n++)
        rows.push(await pastClass(ada.id, n, (6 - n) * 7 + 1));
      // Stored numbers are zero (the bug being fixed).
      expect(
        (await prisma.user.findUniqueOrThrow({ where: { id: ada.id } }))
          .totalSessions,
      ).toBe(0);

      const report = await progress.backfillAll();
      expect(report.studentsProcessed).toBe(1);
      expect(report.studentsChanged).toBe(1);

      const user = await prisma.user.findUniqueOrThrow({
        where: { id: ada.id },
      });
      expect(user.totalSessions).toBe(6);
      expect(user.spaceRank).toBe('EXPLORER');
      expect(user.streakWeeks).toBe(6);
      // A 6-week streak has genuinely earned the 4-week streak badge too.
      expect(await badgeTypes(ada.id)).toEqual([
        'FIRST_MISSION',
        'RANK_EXPLORER',
        'STREAK_4',
      ]);
      const badges = await prisma.studentBadge.findMany({
        where: { userId: ada.id },
      });
      const at = (t: string) => badges.find((b) => b.type === t)!.earnedAt;
      expect(at('FIRST_MISSION')).toEqual(rows[0].end);
      expect(at('RANK_EXPLORER')).toEqual(rows[4].end); // the 5th class
      expect(at('STREAK_4')).toEqual(rows[3].end); // the 4th week in a row
      // Silent: no emails, no gems.
      expect(w.notifications.sendAchievementEmail).not.toHaveBeenCalled();
      expect(
        (await prisma.user.findUniqueOrThrow({ where: { id: ada.id } }))
          .gemBalance,
      ).toBe(0);
    });

    it('is idempotent: a second run changes nothing and creates no duplicate badge', async () => {
      const ada = await student('ada');
      for (let n = 1; n <= 7; n++) await pastClass(ada.id, n, (7 - n) * 7 + 1);
      await progress.backfillAll();
      const before = await prisma.studentBadge.findMany({
        where: { userId: ada.id },
        orderBy: { type: 'asc' },
      });

      const again = await progress.backfillAll();
      expect(again.studentsChanged).toBe(0);
      expect(again.badgesCreated).toBe(0);
      const after = await prisma.studentBadge.findMany({
        where: { userId: ada.id },
        orderBy: { type: 'asc' },
      });
      expect(after).toEqual(before);
    });

    it('never fabricates: a student with no attended class stays at zero; unsettled and cancelled classes do not count', async () => {
      const nobody = await student('no-classes');
      const mixed = await student('mixed');
      await pastClass(mixed.id, 1, 9, LessonStatus.CANCELLED);
      await pastClass(mixed.id, 2, 8, LessonStatus.INCOMPLETE);
      await pastClass(mixed.id, 3, 7, LessonStatus.UPCOMING); // nobody settled it

      const report = await progress.backfillAll();

      for (const id of [nobody.id, mixed.id]) {
        const u = await prisma.user.findUniqueOrThrow({ where: { id } });
        expect(u.totalSessions).toBe(0);
        expect(u.spaceRank).toBe('STARCHILD');
        expect(await badgeTypes(id)).toEqual([]);
      }
      // The class nobody settled is flagged for a person, not guessed at.
      const flagged = report.needsReview.find(
        (s) => s.studentUserId === mixed.id,
      );
      expect(flagged?.reviewReasons.join(' ')).toMatch(/still UPCOMING/);
      expect(
        report.needsReview.find((s) => s.studentUserId === nobody.id),
      ).toBeUndefined();
    });

    it('keeps a stored rank the records do not explain and flags the student for review', async () => {
      const legacy = await student('legacy', {
        spaceRank: 'COSMONAUT',
        totalSessions: 17,
      });
      const report = await progress.backfillAll();
      const u = await prisma.user.findUniqueOrThrow({
        where: { id: legacy.id },
      });
      expect(u.spaceRank).toBe('COSMONAUT'); // never lowered
      expect(u.totalSessions).toBe(0); // only what the records show
      const flagged = report.needsReview.find(
        (s) => s.studentUserId === legacy.id,
      )!;
      expect(flagged.reviewReasons.join(' ')).toMatch(/17/);
    });

    it('--dry-run reports but writes nothing', async () => {
      const ada = await student('ada');
      await pastClass(ada.id, 1, 3);
      const report = await progress.backfillAll({ dryRun: true });
      expect(report.studentsChanged).toBe(1);
      expect(report.students[0].badgesCreated).toEqual(['FIRST_MISSION']);
      expect(await badgeTypes(ada.id)).toEqual([]);
      expect(
        (await prisma.user.findUniqueOrThrow({ where: { id: ada.id } }))
          .totalSessions,
      ).toBe(0);
    });
  });

  describe('class credits', () => {
    const pay = (id: string, taka: number, lessons: number) =>
      w.ledger.recordPayment(id, admin.id, {
        amountTaka: taka,
        lessonsPurchased: lessons,
        courseId: course.id,
      });

    it('is 0 with no confirmed payment; a payment adds exactly the lessons it covers', async () => {
      const ada = await student('ada');
      expect(await w.ledger.getCredits(ada.id)).toMatchObject({
        purchased: 0,
        used: 0,
        remaining: 0,
      });
      await pay(ada.id, 8000, 8);
      expect(await w.ledger.getCredits(ada.id)).toMatchObject({
        purchased: 8,
        used: 0,
        adjustments: 0,
        remaining: 8,
      });
      await pay(ada.id, 4000, 4);
      expect((await w.ledger.getCredits(ada.id)).purchased).toBe(12);
    });

    it('an attended class costs exactly one credit; a missed or incomplete one costs none', async () => {
      const ada = await student('ada');
      await pay(ada.id, 8000, 8);

      const attended = await liveClass(ada.id, 1);
      await w.finalization.finalizeLesson(attended.id, {
        outcome: 'COMPLETED',
        actor: { role: 'TEACHER', userId: teacher.id },
      });
      expect(await w.ledger.getCredits(ada.id)).toMatchObject({
        used: 1,
        remaining: 7,
      });

      // A class the student never joined, ended Incomplete: not charged.
      const start = new Date(Date.now() - 50 * 60_000);
      const missed = await prisma.scheduledLesson.create({
        data: {
          studentUserId: ada.id,
          teacherId: teacher.profileId!,
          courseId: course.id,
          lessonNumber: 2,
          start,
          end: new Date(start.getTime() + 45 * 60_000),
          classType: ClassType.ONE_TO_ONE,
          status: LessonStatus.UPCOMING,
          teacherJoinedAt: start,
        },
      });
      await w.finalization.finalizeLesson(missed.id, {
        outcome: 'INCOMPLETE',
        reason: 'STUDENT_NO_SHOW' as never,
        actor: { role: 'TEACHER', userId: teacher.id },
      });
      expect(await w.ledger.getCredits(ada.id)).toMatchObject({
        used: 1,
        remaining: 7,
      });
    });

    it('finalizing the same class twice charges it once', async () => {
      const ada = await student('ada');
      await pay(ada.id, 8000, 8);
      const cls = await liveClass(ada.id, 1);
      const actor = { role: 'TEACHER' as const, userId: teacher.id };
      await w.finalization.finalizeLesson(cls.id, {
        outcome: 'COMPLETED',
        actor,
      });
      await w.finalization.finalizeLesson(cls.id, {
        outcome: 'COMPLETED',
        actor,
      });
      expect((await w.ledger.getCredits(ada.id)).used).toBe(1);
    });

    it('refunds and admin adjustments change the balance and reconcile as adjustments; deleting a payment removes its credits', async () => {
      const ada = await student('ada');
      await pay(ada.id, 8000, 8); // ৳1000 / class
      await w.ledger.recordRefund(ada.id, admin.id, { amountTaka: 2000 });
      expect(await w.ledger.getCredits(ada.id)).toMatchObject({
        purchased: 8,
        used: 0,
        adjustments: -2,
        remaining: 6,
      });
      await w.ledger.recordAdjustment(ada.id, admin.id, {
        amountTaka: 1000,
        description: 'goodwill class',
      });
      expect(await w.ledger.getCredits(ada.id)).toMatchObject({
        adjustments: -1,
        remaining: 7,
      });
      const summary = await w.ledger.getSummary(ada.id);
      expect(summary.credits?.remaining).toBe(7);
      expect(summary.lessonsRemaining).toBeCloseTo(7, 5);

      const payment = (await w.ledger.getLedger(ada.id)).find(
        (e) => e.type === 'PAYMENT_RECEIVED',
      )!;
      await w.ledger.deleteEntry(ada.id, payment.id, admin.id);
      expect((await w.ledger.getCredits(ada.id)).purchased).toBe(0);
    });

    it('never shows a negative balance', async () => {
      const ada = await student('ada');
      await pay(ada.id, 1000, 1);
      for (const n of [1, 2]) {
        const c = await liveClass(ada.id, n);
        await w.finalization.finalizeLesson(c.id, {
          outcome: 'COMPLETED',
          actor: { role: 'TEACHER', userId: teacher.id },
        });
      }
      const credits = await w.ledger.getCredits(ada.id);
      expect(credits.remaining).toBe(0);
      expect(credits.remainingRaw).toBe(-1);
    });
  });
});
