// The teacher's class monitor and "Lock & submit", against a REAL Postgres over
// HTTP — with several learners sitting the same test at once, started at
// different moments, like a batch class. The row locks that make a lock and a
// "Start test" (or a student's own Submit) take turns cannot be proven with a
// mock.
//
// Skipped unless ASSESSMENT_INTEGRATION_DATABASE_URL points at a throwaway,
// fully migrated database — see ./testing/integration-db.ts.

import 'reflect-metadata';
import {
  IT_DB_URL,
  acquireDatabaseLock,
  truncateAssessmentData,
  useIntegrationDatabase,
} from './testing/integration-db';

useIntegrationDatabase();
process.env.JWT_SECRET = 'assessment-integration-secret';
process.env.FRONTEND_URL = 'https://lumexa-one.vercel.app';
delete process.env.SMTP_USER;
delete process.env.SMTP_PASS;

import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { PrismaClient, Role, SessionType } from '@prisma/client';
import request from 'supertest';
import { JwtStrategy } from '../auth/jwt.strategy';
import { EmailModule } from '../email/email.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma.module';
import { PrismaService } from '../prisma.service';
import {
  addParticipant,
  createBatchWithSession,
} from '../batches/testing/batch-fixtures';
import { AssessmentsModule } from './assessments.module';
import { BankRegistry } from './bank/bank.registry';
import { syncAssessmentBanks } from './bank/bank.sync';
import { syntheticBank } from './bank/testing/synthetic-bank';

const describeDb = IT_DB_URL ? describe : describe.skip;

const MODULE_SLUG = 'lock-module';
const COURSE_SLUG = 'lock-course';
const registry: BankRegistry = {
  courseSlugs: [COURSE_SLUG],
  courseTests: {
    [MODULE_SLUG]: syntheticBank('course-test/lock', 'COURSE_TEST'),
  },
  finalTests: { [COURSE_SLUG]: syntheticBank('final-test/lock', 'FINAL_TEST') },
  stageTests: {},
};
const quiet = { log: () => undefined, warn: () => undefined };

interface Person {
  id: string;
  email: string;
  role: Role;
  profileId?: string;
}

interface ApiQuestion {
  id: string;
  kind: 'MCQ' | 'TRUE_FALSE';
}

describeDb('Teacher class monitor and lock (real Postgres, over HTTP)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;

  let teacher: Person;
  let otherTeacher: Person;
  let admin: Person;
  let courseId: string;
  let testLessonId: string;
  let finalLessonId: string;
  let testAssessmentId: string;
  let finalAssessmentId: string;
  /** The batch: four learners in ONE batch class — same teacher, course, lesson and slot. */
  let batch: { who: Person; classId: string }[];
  let batchClass: { batchId: string; sessionId: string };
  /** Same lesson and slot but ANOTHER teacher's 1-to-1 class — never part of the batch. */
  let outsider: { who: Person; classId: string };
  /** Same teacher and lesson but two hours later — a different class. */
  let laterSession: { who: Person; classId: string };

  const bearer = (p: Person) => ({
    Authorization: `Bearer ${jwt.sign({ sub: p.id, email: p.email, role: p.role })}`,
  });
  const http = () => request(app.getHttpServer());
  const get = (path: string, who: Person) => http().get(path).set(bearer(who));
  const post = (path: string, who: Person, body: object = {}) =>
    http().post(path).set(bearer(who)).send(body);

  async function makeUser(
    name: string,
    role: Role,
    extra: object = {},
  ): Promise<Person> {
    const user = await prisma.user.create({
      data: {
        email: `${name}@example.com`,
        password: 'not-a-real-hash',
        fullName: name.replace(/-/g, ' '),
        role,
        ...extra,
      },
    });
    let profileId: string | undefined;
    if (role === Role.TEACHER) {
      profileId = (
        await prisma.teacherProfile.create({ data: { userId: user.id } })
      ).id;
    }
    return { id: user.id, email: user.email, role, profileId };
  }

  const inMinutes = (m: number) => new Date(Date.now() + m * 60_000);
  let slot: Date;

  /** A learner's class: their row in a batch class when `session` is given,
   *  otherwise a 1-to-1 class of their own. */
  async function makeClass(
    who: Person,
    by: Person,
    lessonId: string,
    lessonNumber: number,
    start = slot,
    session?: { batchId: string; sessionId: string },
  ) {
    const end = new Date(start.getTime() + 60 * 60_000);
    if (session) {
      await prisma.batchMember.create({
        data: { batchId: session.batchId, studentUserId: who.id },
      });
      return addParticipant(prisma, {
        ...session,
        studentUserId: who.id,
        teacherProfileId: by.profileId!,
        courseId,
        lessonNumber,
        lessonId,
        start,
        end,
      });
    }
    return (
      await prisma.scheduledLesson.create({
        data: {
          studentUserId: who.id,
          teacherId: by.profileId!,
          courseId,
          lessonNumber,
          lessonId,
          start,
          end,
          classType: 'ONE_TO_ONE',
          status: 'UPCOMING',
        },
      })
    ).id;
  }

  async function buildWorld() {
    await truncateAssessmentData(prisma);
    slot = inMinutes(5);
    teacher = await makeUser('ms-karim', Role.TEACHER);
    otherTeacher = await makeUser('mr-hasan', Role.TEACHER);
    admin = await makeUser('ops-admin', Role.ADMIN);

    const course = await prisma.course.create({
      data: {
        slug: COURSE_SLUG,
        title: 'Lock Course',
        category: 'Python',
        level: 'STARTER',
      },
    });
    courseId = course.id;
    const mod = await prisma.courseModule.create({
      data: { courseId, slug: MODULE_SLUG, title: 'Lock Module', order: 1 },
    });
    testLessonId = (
      await prisma.lesson.create({
        data: {
          courseId,
          title: 'Lock Module — Course Test',
          order: 9,
          type: SessionType.COURSE_TEST,
          moduleId: mod.id,
        },
      })
    ).id;
    finalLessonId = (
      await prisma.lesson.create({
        data: {
          courseId,
          title: 'Lock Course — Final Test',
          order: 10,
          type: SessionType.FINAL_TEST,
        },
      })
    ).id;
    testAssessmentId = (
      await prisma.assessment.create({
        data: {
          lessonId: testLessonId,
          type: SessionType.COURSE_TEST,
          title: 'Lock Module — Course Test',
          passScorePct: 70,
          isPublished: true,
        },
      })
    ).id;
    finalAssessmentId = (
      await prisma.assessment.create({
        data: {
          lessonId: finalLessonId,
          type: SessionType.FINAL_TEST,
          title: 'Final Test',
          passScorePct: 70,
          isPublished: true,
        },
      })
    ).id;
    await syncAssessmentBanks(
      prisma as unknown as PrismaClient,
      quiet,
      registry,
      1,
    );

    batchClass = await createBatchWithSession(prisma, {
      teacherProfileId: teacher.profileId!,
      courseId,
      studentUserIds: [],
      start: slot,
      lessonNumber: 9,
      lessonId: testLessonId,
    });
    batch = [];
    for (const name of [
      'ada-lovelace',
      'ben-carson',
      'cleo-patra',
      'dev-patel',
    ]) {
      const who = await makeUser(name, Role.STUDENT, {
        assignedTeacherId: teacher.profileId,
      });
      batch.push({
        who,
        classId: await makeClass(
          who,
          teacher,
          testLessonId,
          9,
          slot,
          batchClass,
        ),
      });
    }
    const out = await makeUser('olive-outsider', Role.STUDENT, {
      assignedTeacherId: otherTeacher.profileId,
    });
    outsider = {
      who: out,
      classId: await makeClass(out, otherTeacher, testLessonId, 9),
    };
    const later = await makeUser('luke-later', Role.STUDENT, {
      assignedTeacherId: teacher.profileId,
    });
    laterSession = {
      who: later,
      classId: await makeClass(later, teacher, testLessonId, 9, inMinutes(125)),
    };
  }

  // ── Test-taking helpers ─────────────────────────────────────────────────
  const anchor = () => batch[0].classId;

  async function start(
    p: { who: Person; classId: string },
    assessmentId = testAssessmentId,
  ) {
    return post(`/assessments/${assessmentId}/attempts/start`, p.who, {
      scheduledLessonId: p.classId,
    });
  }

  /** Answers the first `count` questions correctly, through the autosave
   *  endpoint, like the browser does. Returns the question ids it answered. */
  async function answerRight(
    p: { who: Person },
    attemptId: string,
    questions: ApiQuestion[],
    count: number,
  ) {
    const rows = await prisma.mCQAnswer.findMany({
      where: { attemptId },
      include: { question: true },
    });
    const right = new Map(
      rows.map((r) => [
        r.questionId,
        r.optionOrder.indexOf(r.question.correctIndex),
      ]),
    );
    const done: string[] = [];
    for (const q of questions.slice(0, count)) {
      const res = await post(
        `/assessments/attempts/${attemptId}/answers`,
        p.who,
        {
          questionId: q.id,
          selectedIndex: right.get(q.id),
        },
      );
      expect(res.status).toBe(201);
      done.push(q.id);
    }
    return done;
  }

  async function startAndAnswer(
    p: { who: Person; classId: string },
    count: number,
  ) {
    const started = await start(p);
    expect(started.status).toBe(201);
    await answerRight(p, started.body.id, started.body.questions, count);
    return started.body.id as string;
  }

  const overview = (who: Person = teacher) =>
    get(`/assessments/scheduled-lessons/${anchor()}/class-status`, who);
  const lockOne = (classId: string, who: Person = teacher) =>
    post(`/assessments/scheduled-lessons/${classId}/lock`, who);
  const lockAll = (who: Person = teacher) =>
    post(`/assessments/scheduled-lessons/${anchor()}/lock-class`, who);

  // ── Boot ─────────────────────────────────────────────────────────────────
  jest.setTimeout(60_000);

  let releaseLock: () => void;
  beforeAll(async () => {
    releaseLock = await acquireDatabaseLock(IT_DB_URL as string);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const moduleRef = await Test.createTestingModule({
      imports: [
        PrismaModule,
        EmailModule,
        NotificationsModule,
        PassportModule,
        AssessmentsModule,
      ],
      providers: [JwtStrategy],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.listen(0);
    prisma = moduleRef.get(PrismaService);
    jwt = new JwtService({ secret: process.env.JWT_SECRET });
  }, 200_000);
  afterAll(async () => {
    await app?.close();
    releaseLock?.();
  });
  beforeEach(async () => {
    await buildWorld();
  });

  // ═════════════════════════════════════════════════════════════════════════
  describe('the class overview', () => {
    it('lists exactly the learners of this slot — not another teacher’s, not a later session', async () => {
      const res = await overview();
      expect(res.status).toBe(200);
      const names = res.body.students.map(
        (s: { studentName: string }) => s.studentName,
      );
      expect(names).toEqual([
        'ada lovelace',
        'ben carson',
        'cleo patra',
        'dev patel',
      ]);
      expect(names).not.toContain('olive outsider');
      expect(names).not.toContain('luke later');
      expect(
        res.body.students.every(
          (s: { state: string }) => s.state === 'NOT_STARTED',
        ),
      ).toBe(true);
      expect(res.body.assessment).toMatchObject({
        title: 'Lock Module — Course Test',
        counts: { mcq: 30, trueFalse: 10, practical: 0 },
      });
      expect(Date.parse(res.body.serverTime)).not.toBeNaN();
    });

    it('the group is the batch CLASS itself: another batch class at the very same time, teacher and lesson is not part of it', async () => {
      const second = await createBatchWithSession(prisma, {
        name: 'Second batch',
        teacherProfileId: teacher.profileId!,
        courseId,
        studentUserIds: [],
        start: slot,
        lessonNumber: 9,
        lessonId: testLessonId,
      });
      const stranger = await makeUser('sam-second', Role.STUDENT, {
        assignedTeacherId: teacher.profileId,
      });
      await makeClass(stranger, teacher, testLessonId, 9, slot, second);

      const res = await overview();
      expect(res.body.students).toHaveLength(4);
      expect(
        res.body.students.map((s: { studentName: string }) => s.studentName),
      ).not.toContain('sam second');

      // And locking the first class never closes the second one's test.
      await lockAll();
      const other = await prisma.scheduledLesson.findFirstOrThrow({
        where: { studentUserId: stranger.id },
      });
      expect(other.testLockedAt).toBeNull();
    });

    it('is the same from any learner’s class in the group, and for an admin', async () => {
      const fromLast = await get(
        `/assessments/scheduled-lessons/${batch[3].classId}/class-status`,
        teacher,
      );
      expect(fromLast.status).toBe(200);
      expect(fromLast.body.students).toHaveLength(4);
      expect((await overview(admin)).status).toBe(200);
    });

    it('shows each learner’s progress as they start at different moments', async () => {
      await startAndAnswer(batch[0], 5);
      await startAndAnswer(batch[1], 12);
      const started = await start(batch[2]);
      expect(started.status).toBe(201);

      const res = await overview();
      const by = Object.fromEntries(
        res.body.students.map((s: any) => [s.studentName, s]),
      );
      expect(by['ada lovelace']).toMatchObject({
        state: 'IN_PROGRESS',
        attempt: { total: 40, answered: 5, lockedAt: null },
      });
      expect(by['ben carson'].attempt).toMatchObject({
        total: 40,
        answered: 12,
      });
      expect(by['cleo patra']).toMatchObject({
        state: 'IN_PROGRESS',
        attempt: { answered: 0 },
      });
      expect(by['dev patel']).toMatchObject({
        state: 'NOT_STARTED',
        attempt: null,
      });
      // The stopwatch of each learner starts from their own start time.
      const t = (n: string) => Date.parse(by[n].attempt.startedAt);
      expect(t('ben carson')).toBeGreaterThanOrEqual(t('ada lovelace'));
    });

    it('is for the class’s teacher and admins — not students, not other teachers', async () => {
      expect((await overview(batch[0].who)).status).toBe(403);
      expect((await overview(otherTeacher)).status).toBe(403);
      expect(
        (
          await get(
            `/assessments/scheduled-lessons/${outsider.classId}/class-status`,
            teacher,
          )
        ).status,
      ).toBe(403);
      expect(
        (
          await http().get(
            `/assessments/scheduled-lessons/${anchor()}/class-status`,
          )
        ).status,
      ).toBe(401);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  describe('Lock & submit — one learner', () => {
    it('submits what was saved, creates the report card, and closes the test for that learner only', async () => {
      const adaId = await startAndAnswer(batch[0], 5);
      const benId = await startAndAnswer(batch[1], 12);

      const res = await lockOne(batch[1].classId);
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        outcome: 'SUBMITTED',
        studentName: 'ben carson',
      });

      const ben = await prisma.assessmentAttempt.findUniqueOrThrow({
        where: { id: benId },
        include: { report: true },
      });
      expect(ben.status).toBe('SUBMITTED');
      expect(ben.lockedAt).toBeInstanceOf(Date);
      expect(ben.lockedByUserId).toBe(teacher.id);
      expect(ben.submittedAt?.getTime()).toBe(ben.lockedAt?.getTime());
      // 12 answers were saved, all right → 12 of 40; the other 28 are blank.
      expect(ben.report).toMatchObject({
        status: 'PENDING_REVIEW',
        objectiveScore: 12,
        objectiveMaxScore: 40,
        teacherId: teacher.profileId,
      });
      const results = ben.report!.questionResults as {
        selectedIndex: number | null;
      }[];
      expect(results.filter((r) => r.selectedIndex !== null)).toHaveLength(12);

      // Ada, still working, is untouched.
      const ada = await prisma.assessmentAttempt.findUniqueOrThrow({
        where: { id: adaId },
      });
      expect(ada.status).toBe('IN_PROGRESS');
      expect(ada.lockedAt).toBeNull();

      const sl = await prisma.scheduledLesson.findUniqueOrThrow({
        where: { id: batch[1].classId },
      });
      expect(sl.testLockedAt).toBeInstanceOf(Date);
      expect(sl.testLockedByUserId).toBe(teacher.id);
    });

    it('the learner’s tab finds out: next save is refused with a clear message, state says locked', async () => {
      const started = await start(batch[1]);
      const attemptId: string = started.body.id;
      await answerRight(batch[1], attemptId, started.body.questions, 3);
      await lockOne(batch[1].classId);

      const save = await post(
        `/assessments/attempts/${attemptId}/answers`,
        batch[1].who,
        {
          questionId: started.body.questions[10].id,
          selectedIndex: 0,
        },
      );
      expect(save.status).toBe(409);
      expect(save.body.message).toMatch(/teacher locked this test/);

      const state = await get(
        `/assessments/attempts/${attemptId}/state`,
        batch[1].who,
      );
      expect(state.status).toBe(200);
      expect(state.body).toMatchObject({
        status: 'SUBMITTED',
        lockedByTeacher: true,
        released: false,
      });

      // Nothing was added by the refused save.
      const saved = await prisma.mCQAnswer.count({
        where: { attemptId, selectedIndex: { not: null } },
      });
      expect(saved).toBe(3);

      // The full attempt says so as well, for the page that reloads.
      const full = await get(
        `/assessments/attempts/${attemptId}`,
        batch[1].who,
      );
      expect(full.body).toMatchObject({
        status: 'SUBMITTED',
        lockedByTeacher: true,
      });
      expect(full.body.questions).toBeDefined();
    });

    it('a learner who sends their own Submit after the lock gets the first result, not a second report', async () => {
      const started = await start(batch[0]);
      const attemptId: string = started.body.id;
      await lockOne(batch[0].classId);
      const again = await post(
        `/assessments/attempts/${attemptId}/submit`,
        batch[0].who,
      );
      expect(again.status).toBe(201);
      expect(again.body.alreadySubmitted).toBe(true);
      expect(await prisma.testReport.count({ where: { attemptId } })).toBe(1);
    });

    it('locking twice is harmless', async () => {
      await startAndAnswer(batch[0], 2);
      expect((await lockOne(batch[0].classId)).body.outcome).toBe('SUBMITTED');
      expect((await lockOne(batch[0].classId)).body.outcome).toBe(
        'ALREADY_SUBMITTED',
      );
      expect(await prisma.testReport.count()).toBe(1);
    });

    it('a learner who never started can no longer start; reopening lets them in', async () => {
      const res = await lockOne(batch[3].classId);
      expect(res.body.outcome).toBe('CLOSED');
      expect((await lockOne(batch[3].classId)).body.outcome).toBe(
        'ALREADY_CLOSED',
      );

      const blocked = await start(batch[3]);
      expect(blocked.status).toBe(403);
      expect(blocked.body.message).toMatch(/teacher has closed this test/);
      expect(
        await prisma.assessmentAttempt.count({
          where: { studentUserId: batch[3].who.id },
        }),
      ).toBe(0);

      const state = await get(
        `/assessments/scheduled-lessons/${batch[3].classId}/status`,
        batch[3].who,
      );
      expect(state.body.closedAt).not.toBeNull();
      expect(state.body.attempt).toBeNull();
      const row = (await overview()).body.students.find(
        (s: any) => s.studentName === 'dev patel',
      );
      expect(row.state).toBe('CLOSED');

      const reopened = await post(
        `/assessments/scheduled-lessons/${batch[3].classId}/reopen`,
        teacher,
      );
      expect(reopened.body).toEqual({ reopened: true });
      expect((await start(batch[3])).status).toBe(201);
    });

    it('a test that was handed in can never be reopened', async () => {
      await startAndAnswer(batch[0], 2);
      await lockOne(batch[0].classId);
      const res = await post(
        `/assessments/scheduled-lessons/${batch[0].classId}/reopen`,
        teacher,
      );
      expect(res.status).toBe(409);
      expect(await prisma.testReport.count()).toBe(1);
    });

    it('only the class’s teacher (or an admin) can lock — never students, other teachers, or another teacher’s class', async () => {
      await startAndAnswer(batch[0], 2);
      expect((await lockOne(batch[0].classId, batch[0].who)).status).toBe(403);
      expect((await lockOne(batch[0].classId, batch[1].who)).status).toBe(403);
      expect((await lockOne(batch[0].classId, otherTeacher)).status).toBe(403);
      expect((await lockOne(outsider.classId, teacher)).status).toBe(403);
      expect(
        (
          await post(
            `/assessments/scheduled-lessons/${anchor()}/lock-class`,
            batch[0].who,
          )
        ).status,
      ).toBe(403);
      expect(
        await prisma.assessmentAttempt.count({
          where: { status: 'SUBMITTED' },
        }),
      ).toBe(0);
      expect((await lockOne(batch[0].classId, admin)).status).toBe(201);
    });

    it('a Final Test keeps the saved project code and waits for the teacher’s marks', async () => {
      const cls = await prisma.scheduledLesson.update({
        where: { id: batch[0].classId },
        data: { lessonNumber: 10, lessonId: finalLessonId },
      });
      expect(cls.lessonNumber).toBe(10);
      const started = await start(batch[0], finalAssessmentId);
      expect(started.status).toBe(201);
      const attemptId: string = started.body.id;
      const code = 'a = int(input())\nb = int(input())\nprint(a + b)\n';
      const saved = await post(
        `/assessments/attempts/${attemptId}/code`,
        batch[0].who,
        {
          questionId: started.body.codingProject.id,
          code,
        },
      );
      expect(saved.status).toBe(201);

      const lockedRes = await lockOne(batch[0].classId);
      expect(lockedRes.body.outcome).toBe('SUBMITTED');
      const report = await prisma.testReport.findUniqueOrThrow({
        where: { attemptId },
      });
      expect(report.status).toBe('PENDING_CODE_EVALUATION');
      expect(report.hasCodingProject).toBe(true);
      expect((report.codingProject as { code: string }).code).toBe(code);

      // The teacher's report card says when it started and that they locked it.
      const detail = await get(`/test-reports/${report.id}`, teacher);
      expect(detail.status).toBe(200);
      expect(detail.body.timeline.lockedByTeacherAt).not.toBeNull();
      expect(detail.body.timeline.startedAt).not.toBeNull();
      expect(detail.body.timeline.timeTakenSeconds).toBeGreaterThanOrEqual(0);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  describe('Lock all — “Time’s up”', () => {
    it('submits everyone’s saved answers, closes the rest, and loses nothing', async () => {
      const ids = [
        await startAndAnswer(batch[0], 5),
        await startAndAnswer(batch[1], 12),
        await startAndAnswer(batch[2], 0),
      ];
      // Dev never started. Ben already handed in himself.
      await post(`/assessments/attempts/${ids[1]}/submit`, batch[1].who);

      const res = await lockAll();
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        submitted: 2, // Ada, Cleo
        closed: 1, // Dev
        alreadyDone: 1, // Ben
        failed: 0,
      });
      expect(
        res.body.results.map((r: any) => [r.studentName, r.outcome]),
      ).toEqual([
        ['ada lovelace', 'SUBMITTED'],
        ['ben carson', 'ALREADY_SUBMITTED'],
        ['cleo patra', 'SUBMITTED'],
        ['dev patel', 'CLOSED'],
      ]);

      const reports = await prisma.testReport.findMany({
        orderBy: { objectiveScore: 'asc' },
      });
      expect(reports.map((r) => r.objectiveScore)).toEqual([0, 5, 12]);

      // Ben handed in himself: not marked as teacher-locked.
      const ben = await prisma.assessmentAttempt.findUniqueOrThrow({
        where: { id: ids[1] },
      });
      expect(ben.lockedAt).toBeNull();
      const ada = await prisma.assessmentAttempt.findUniqueOrThrow({
        where: { id: ids[0] },
      });
      expect(ada.lockedAt).toBeInstanceOf(Date);

      // The overview now shows no one in progress.
      const states = (await overview()).body.students.map((s: any) => s.state);
      expect(states).toEqual(['SUBMITTED', 'SUBMITTED', 'SUBMITTED', 'CLOSED']);

      // Neither the outsider nor the later session was touched.
      expect(
        await prisma.assessmentAttempt.count({
          where: { studentUserId: outsider.who.id },
        }),
      ).toBe(0);
      const later = await prisma.scheduledLesson.findUniqueOrThrow({
        where: { id: laterSession.classId },
      });
      const other = await prisma.scheduledLesson.findUniqueOrThrow({
        where: { id: outsider.classId },
      });
      expect(later.testLockedAt).toBeNull();
      expect(other.testLockedAt).toBeNull();
    });

    it('is safe to press again', async () => {
      await startAndAnswer(batch[0], 3);
      await lockAll();
      const second = await lockAll();
      expect(second.body).toMatchObject({ submitted: 0, closed: 0, failed: 0 });
      expect(second.body.alreadyDone).toBe(4);
      expect(await prisma.testReport.count()).toBe(1);
    });

    it('works for a lone learner too (a 1:1 class is a group of one)', async () => {
      const res = await post(
        `/assessments/scheduled-lessons/${laterSession.classId}/lock-class`,
        teacher,
      );
      expect(res.body.closed).toBe(1);
      expect(res.body.results).toHaveLength(1);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  describe('races', () => {
    it('a lock and a “Start test” at the same instant never leave an open attempt behind a locked class', async () => {
      // Twelve learners who have not started, each hit by a start and a lock
      // together. Whatever order the database picks, the end state must be
      // consistent: either the start lost (no attempt, class closed) or it
      // won and was then locked (attempt submitted).
      const extra: { who: Person; classId: string }[] = [];
      for (let i = 0; i < 8; i++) {
        const who = await makeUser(`racer-${i}`, Role.STUDENT, {
          assignedTeacherId: teacher.profileId,
        });
        // A distinct lesson number per racer is not needed: each racer has
        // their own class row in the same slot.
        extra.push({
          who,
          classId: await makeClass(
            who,
            teacher,
            testLessonId,
            9,
            slot,
            batchClass,
          ),
        });
      }
      const racers = [...batch, ...extra];

      await Promise.all(
        racers.flatMap((p) => [
          start(p).then((r) => r),
          lockOne(p.classId).then((r) => r),
        ]),
      );

      for (const p of racers) {
        const sl = await prisma.scheduledLesson.findUniqueOrThrow({
          where: { id: p.classId },
          include: { assessmentAttempt: { include: { report: true } } },
        });
        expect(sl.testLockedAt).not.toBeNull();
        const a = sl.assessmentAttempt;
        if (a) {
          expect(a.status).toBe('SUBMITTED');
          expect(a.lockedAt).not.toBeNull();
          expect(a.report).not.toBeNull();
        }
      }
      expect(await prisma.testReport.count()).toBe(
        await prisma.assessmentAttempt.count(),
      );
    });

    it('a lock and the learner’s own Submit at the same instant produce exactly one report', async () => {
      const ids: string[] = [];
      for (const p of batch) ids.push(await startAndAnswer(p, 4));

      const results = await Promise.all(
        batch.flatMap((p, i) => [
          post(`/assessments/attempts/${ids[i]}/submit`, p.who),
          lockOne(p.classId),
        ]),
      );
      expect(results.every((r) => r.status === 201)).toBe(true);
      expect(await prisma.testReport.count()).toBe(4);
      for (const id of ids) {
        const a = await prisma.assessmentAttempt.findUniqueOrThrow({
          where: { id },
        });
        expect(a.status).toBe('SUBMITTED');
      }
    });

    it('a lock in the middle of a burst of autosaves never loses an acknowledged answer', async () => {
      const started = await start(batch[0]);
      const attemptId: string = started.body.id;
      const qs: ApiQuestion[] = started.body.questions;
      const rows = await prisma.mCQAnswer.findMany({
        where: { attemptId },
        include: { question: true },
      });
      const right = new Map(
        rows.map((r) => [
          r.questionId,
          r.optionOrder.indexOf(r.question.correctIndex),
        ]),
      );

      const acknowledged: string[] = [];
      const saves = qs.slice(0, 30).map((q, i) =>
        new Promise<void>((resolve) => setTimeout(resolve, i * 4)).then(
          async () => {
            const res = await post(
              `/assessments/attempts/${attemptId}/answers`,
              batch[0].who,
              {
                questionId: q.id,
                selectedIndex: right.get(q.id),
              },
            );
            if (res.status === 201) acknowledged.push(q.id);
            else expect(res.status).toBe(409);
          },
        ),
      );
      const lock = new Promise<void>((resolve) => setTimeout(resolve, 60)).then(
        () => lockOne(batch[0].classId).then(() => undefined),
      );
      await Promise.all([...saves, lock]);

      const report = await prisma.testReport.findUniqueOrThrow({
        where: { attemptId },
      });
      const answered = (
        report.questionResults as {
          questionId: string;
          selectedIndex: number | null;
        }[]
      )
        .filter((r) => r.selectedIndex !== null)
        .map((r) => r.questionId);
      // Every answer the server acknowledged is in the report; nothing else is.
      expect(answered.sort()).toEqual([...acknowledged].sort());
    });
  });
});
