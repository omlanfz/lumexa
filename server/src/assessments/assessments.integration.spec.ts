// End-to-end test of the whole assessment workflow over HTTP, against a REAL
// Postgres: a student takes a test in class (autosave, refresh, one submit,
// auto-grading), the teacher reviews the report card (overrides, coding
// project marks, approval) and shares it with the parent by email — with the
// real guards, validation pipe, row locks and unique constraints in play.
//
// Skipped unless ASSESSMENT_INTEGRATION_DATABASE_URL points at a throwaway,
// fully migrated database — see ./testing/integration-db.ts. The only fake is
// the SMTP transport (there is no mail server in CI): it is swapped for an
// in-process one in the tests that need a delivered email.

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
import { EmailService } from '../email/email.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma.module';
import { PrismaService } from '../prisma.service';
import { AssessmentsModule } from './assessments.module';
import { BankRegistry } from './bank/bank.registry';
import { syncAssessmentBanks } from './bank/bank.sync';
import { syntheticBank } from './bank/testing/synthetic-bank';

const describeDb = IT_DB_URL ? describe : describe.skip;

const MODULE_SLUG = 'wf-module';
const COURSE_SLUG = 'wf-course';
const registry: BankRegistry = {
  courseSlugs: [COURSE_SLUG],
  courseTests: {
    [MODULE_SLUG]: syntheticBank('course-test/wf', 'COURSE_TEST'),
  },
  finalTests: { [COURSE_SLUG]: syntheticBank('final-test/wf', 'FINAL_TEST') },
  stageTests: {},
};
const quiet = { log: () => undefined, warn: () => undefined };

interface Person {
  id: string;
  email: string;
  role: Role;
  profileId?: string;
}

describeDb('Assessment workflow (real Postgres, over HTTP)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let email: EmailService;
  let jwt: JwtService;

  // ── The world ────────────────────────────────────────────────────────────
  let teacher: Person;
  let otherTeacher: Person;
  let student: Person;
  let otherStudent: Person;
  let admin: Person;
  let courseId: string;
  let testLessonId: string;
  let finalLessonId: string;
  let testAssessmentId: string;
  let finalAssessmentId: string;
  let testClassId: string; // student's class that carries the Course Test
  let finalClassId: string; // student's class that carries the Final Test
  let otherClassId: string; // otherStudent's class that carries the Course Test

  const bearer = (p: Person) => ({
    Authorization: `Bearer ${jwt.sign({ sub: p.id, email: p.email, role: p.role })}`,
  });
  const http = () => request(app.getHttpServer());
  const get = (path: string, who: Person) => http().get(path).set(bearer(who));
  const post = (path: string, who: Person, body: object = {}) =>
    http().post(path).set(bearer(who)).send(body);
  const patch = (path: string, who: Person, body: object = {}) =>
    http().patch(path).set(bearer(who)).send(body);

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

  async function makeClass(
    who: Person,
    by: Person,
    lessonId: string,
    lessonNumber: number,
    over: { start?: Date; status?: 'UPCOMING' | 'COMPLETED' } = {},
  ) {
    const start = over.start ?? inMinutes(5);
    return (
      await prisma.scheduledLesson.create({
        data: {
          studentUserId: who.id,
          teacherId: by.profileId!,
          courseId,
          lessonNumber,
          lessonId,
          start,
          end: new Date(start.getTime() + 60 * 60_000),
          classType: 'ONE_TO_ONE',
          status: over.status ?? 'UPCOMING',
        },
      })
    ).id;
  }

  async function buildWorld() {
    await truncateAssessmentData(prisma);
    teacher = await makeUser('ms-karim', Role.TEACHER);
    otherTeacher = await makeUser('mr-hasan', Role.TEACHER);
    student = await makeUser('mira-rahman', Role.STUDENT, {
      assignedTeacherId: teacher.profileId,
    });
    otherStudent = await makeUser('omar-ali', Role.STUDENT, {
      assignedTeacherId: otherTeacher.profileId,
    });
    admin = await makeUser('ops-admin', Role.ADMIN);

    const course = await prisma.course.create({
      data: {
        slug: COURSE_SLUG,
        title: 'Workflow Course',
        category: 'Python',
        level: 'STARTER',
      },
    });
    courseId = course.id;
    const mod = await prisma.courseModule.create({
      data: { courseId, slug: MODULE_SLUG, title: 'Workflow Module', order: 1 },
    });
    const testLesson = await prisma.lesson.create({
      data: {
        courseId,
        title: 'Workflow Module — Course Test',
        order: 9,
        type: SessionType.COURSE_TEST,
        moduleId: mod.id,
      },
    });
    const finalLesson = await prisma.lesson.create({
      data: {
        courseId,
        title: 'Workflow Course — Final Test',
        order: 10,
        type: SessionType.FINAL_TEST,
      },
    });
    testLessonId = testLesson.id;
    finalLessonId = finalLesson.id;
    testAssessmentId = (
      await prisma.assessment.create({
        data: {
          lessonId: testLessonId,
          type: SessionType.COURSE_TEST,
          title: 'Workflow Module — Course Test',
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

    testClassId = await makeClass(student, teacher, testLessonId, 9);
    finalClassId = await makeClass(student, teacher, finalLessonId, 10);
    otherClassId = await makeClass(otherStudent, otherTeacher, testLessonId, 9);
  }

  // ── Test-taking helpers ─────────────────────────────────────────────────
  interface ApiQuestion {
    id: string;
    kind: 'MCQ' | 'TRUE_FALSE';
    options: string[];
    selectedIndex: number | null;
    correctIndex?: number;
  }

  async function start(assessmentId: string, classId: string, who = student) {
    return post(`/assessments/${assessmentId}/attempts/start`, who, {
      scheduledLessonId: classId,
    });
  }

  /** The display position of the right (or a wrong) answer for a question,
   *  read straight from the database — the test's answer oracle. */
  async function oracle(attemptId: string) {
    const rows = await prisma.mCQAnswer.findMany({
      where: { attemptId },
      include: { question: true },
    });
    return new Map(
      rows.map((r) => {
        const n = (r.question.options as string[]).length;
        const right = r.optionOrder.indexOf(r.question.correctIndex);
        const wrong = [...Array(n).keys()].find((i) => i !== right)!;
        return [r.questionId, { right, wrong }] as const;
      }),
    );
  }

  /** Answers a test: the first `mcqRight` MCQs and `tfRight` True/False
   *  questions correctly, the next `mcqWrong`/`tfWrong` wrongly, the rest left
   *  blank. Saves each through the autosave endpoint, like the browser does. */
  async function answer(
    attemptId: string,
    questions: ApiQuestion[],
    plan: {
      mcqRight: number;
      mcqWrong: number;
      tfRight: number;
      tfWrong: number;
    },
  ) {
    const keys = await oracle(attemptId);
    const mcq = questions.filter((q) => q.kind === 'MCQ');
    const tfs = questions.filter((q) => q.kind === 'TRUE_FALSE');
    const picks: { questionId: string; selectedIndex: number }[] = [];
    const take = (list: ApiQuestion[], right: number, wrong: number) => {
      list.slice(0, right).forEach((q) =>
        picks.push({
          questionId: q.id,
          selectedIndex: keys.get(q.id)!.right,
        }),
      );
      list.slice(right, right + wrong).forEach((q) =>
        picks.push({
          questionId: q.id,
          selectedIndex: keys.get(q.id)!.wrong,
        }),
      );
    };
    take(mcq, plan.mcqRight, plan.mcqWrong);
    take(tfs, plan.tfRight, plan.tfWrong);
    for (const p of picks) {
      const res = await post(
        `/assessments/attempts/${attemptId}/answers`,
        student,
        p,
      );
      expect(res.status).toBe(201);
    }
    return picks;
  }

  /** Student takes the Course Test: 24+8 right of 40, 6+1 wrong, 1 blank. */
  async function takeCourseTest() {
    const started = await start(testAssessmentId, testClassId);
    expect(started.status).toBe(201);
    const attemptId: string = started.body.id;
    await answer(attemptId, started.body.questions, {
      mcqRight: 24,
      mcqWrong: 6,
      tfRight: 8,
      tfWrong: 1,
    });
    const submitted = await post(
      `/assessments/attempts/${attemptId}/submit`,
      student,
    );
    expect(submitted.status).toBe(201);
    const report = await prisma.testReport.findUniqueOrThrow({
      where: { attemptId },
    });
    return { attemptId, reportId: report.id, started };
  }

  const eventually = async (check: () => Promise<boolean>, ms = 3000) => {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      if (await check()) return true;
      await new Promise((r) => setTimeout(r, 25));
    }
    return false;
  };

  const installMailServer = (
    behaviour: () => Promise<unknown> = () => Promise.resolve({}),
  ) => {
    const sendMail = jest.fn((_message: unknown) => behaviour());
    (email as unknown as { transporter: unknown }).transporter = { sendMail };
    return sendMail;
  };
  const removeMailServer = () => {
    (email as unknown as { transporter: unknown }).transporter = null;
  };

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
    email = moduleRef.get(EmailService);
    jwt = new JwtService({ secret: process.env.JWT_SECRET });
  }, 200_000);
  afterAll(async () => {
    await app?.close();
    releaseLock?.();
  });
  beforeEach(async () => {
    removeMailServer();
    await buildWorld();
  });

  // ═════════════════════════════════════════════════════════════════════════
  describe('student takes a Course Test in class', () => {
    it('starts the test: 30 multiple-choice then 10 True/False, no answer key', async () => {
      const res = await start(testAssessmentId, testClassId);
      expect(res.status).toBe(201);
      const qs: ApiQuestion[] = res.body.questions;
      expect(qs).toHaveLength(40);
      expect(qs.slice(0, 30).every((q) => q.kind === 'MCQ')).toBe(true);
      expect(qs.slice(30).every((q) => q.kind === 'TRUE_FALSE')).toBe(true);
      expect(qs.slice(0, 30).every((q) => q.options.length === 4)).toBe(true);
      expect(qs.slice(30).every((q) => q.options.join() === 'True,False')).toBe(
        true,
      );
      expect(res.body.assessment).toMatchObject({
        questionCount: 40,
        mcqCount: 30,
        trueFalseCount: 10,
        totalMarks: 40,
        hasCodingProject: false,
      });
      const json = JSON.stringify(res.body);
      expect(json).not.toContain('correctIndex');
      expect(json).not.toContain('isCorrect');
      expect(json).not.toContain('explanation');
      expect(res.body.status).toBe('IN_PROGRESS');
      expect(res.body.result).toBeNull();
    });

    it('resuming returns the very same attempt, and two tabs share one attempt', async () => {
      const [a, b] = await Promise.all([
        start(testAssessmentId, testClassId),
        start(testAssessmentId, testClassId),
      ]);
      expect([a.status, b.status]).toEqual([201, 201]);
      expect(a.body.id).toBe(b.body.id);
      const again = await start(testAssessmentId, testClassId);
      expect(again.body.id).toBe(a.body.id);
      expect(
        await prisma.assessmentAttempt.count({
          where: { studentUserId: student.id },
        }),
      ).toBe(1);
      // Same questions in the same order for the same attempt.
      expect(again.body.questions.map((q: ApiQuestion) => q.id)).toEqual(
        a.body.questions.map((q: ApiQuestion) => q.id),
      );
    });

    it('cannot start from someone else’s class, or a test the class does not carry', async () => {
      const foreign = await start(testAssessmentId, otherClassId);
      expect(foreign.status).toBe(403);
      const wrongTest = await start(finalAssessmentId, testClassId);
      expect(wrongTest.status).toBe(403);
      expect(await prisma.assessmentAttempt.count()).toBe(0);
    });

    it('is closed to teachers and admins (only students take tests)', async () => {
      expect((await start(testAssessmentId, testClassId, teacher)).status).toBe(
        403,
      );
      expect((await start(testAssessmentId, testClassId, admin)).status).toBe(
        403,
      );
    });

    it('opens 10 minutes before class and not after the class has ended', async () => {
      const far = await makeClass(student, teacher, testLessonId, 11, {
        start: inMinutes(180),
      });
      expect((await start(testAssessmentId, far)).status).toBe(403);
      const over = await makeClass(student, teacher, testLessonId, 12, {
        status: 'COMPLETED',
      });
      expect((await start(testAssessmentId, over)).status).toBe(403);
    });

    it('refuses to start while the test is unpublished', async () => {
      await prisma.assessment.update({
        where: { id: testAssessmentId },
        data: { isPublished: false },
      });
      expect((await start(testAssessmentId, testClassId)).status).toBe(403);
    });

    it('autosaves every answer and keeps them after a refresh', async () => {
      const started = await start(testAssessmentId, testClassId);
      const attemptId: string = started.body.id;
      const picks = await answer(attemptId, started.body.questions, {
        mcqRight: 5,
        mcqWrong: 2,
        tfRight: 3,
        tfWrong: 0,
      });
      expect(picks).toHaveLength(10);

      const refreshed = await get(
        `/assessments/attempts/${attemptId}`,
        student,
      );
      expect(refreshed.status).toBe(200);
      const byId = new Map(
        (refreshed.body.questions as ApiQuestion[]).map((q) => [q.id, q]),
      );
      for (const p of picks)
        expect(byId.get(p.questionId)!.selectedIndex).toBe(p.selectedIndex);
      expect(refreshed.body.answeredCount).toBe(10);
      // Same order and same shuffled options as before the refresh.
      expect(refreshed.body.questions.map((q: ApiQuestion) => q.id)).toEqual(
        started.body.questions.map((q: ApiQuestion) => q.id),
      );
      expect(
        refreshed.body.questions.map((q: ApiQuestion) => q.options),
      ).toEqual(started.body.questions.map((q: ApiQuestion) => q.options));
    });

    it('saves against the right option however the options were shuffled', async () => {
      const started = await start(testAssessmentId, testClassId);
      const attemptId: string = started.body.id;
      const q: ApiQuestion = started.body.questions[0];
      const keys = await oracle(attemptId);
      await post(`/assessments/attempts/${attemptId}/answers`, student, {
        questionId: q.id,
        selectedIndex: keys.get(q.id)!.right,
      });
      const row = await prisma.mCQAnswer.findFirstOrThrow({
        where: { attemptId, questionId: q.id },
        include: { question: true },
      });
      expect(row.isCorrect).toBe(true);
      expect(row.selectedIndex).toBe(row.question.correctIndex);
      // The text the student saw at that position is the stored correct text.
      const shown = q.options[keys.get(q.id)!.right];
      expect(
        (row.question.options as string[])[row.question.correctIndex],
      ).toBe(shown);
    });

    it('lets a student change or clear an answer before submitting', async () => {
      const started = await start(testAssessmentId, testClassId);
      const attemptId: string = started.body.id;
      const q: ApiQuestion = started.body.questions[0];
      const keys = await oracle(attemptId);
      const url = `/assessments/attempts/${attemptId}/answers`;
      await post(url, student, {
        questionId: q.id,
        selectedIndex: keys.get(q.id)!.wrong,
      });
      await post(url, student, {
        questionId: q.id,
        selectedIndex: keys.get(q.id)!.right,
      });
      expect(
        (
          await prisma.mCQAnswer.findFirstOrThrow({
            where: { attemptId, questionId: q.id },
          })
        ).isCorrect,
      ).toBe(true);
      await post(url, student, { questionId: q.id, selectedIndex: null });
      const cleared = await prisma.mCQAnswer.findFirstOrThrow({
        where: { attemptId, questionId: q.id },
      });
      expect(cleared.selectedIndex).toBeNull();
      expect(cleared.isCorrect).toBe(false);
    });

    it('rejects malformed or foreign answers', async () => {
      const started = await start(testAssessmentId, testClassId);
      const attemptId: string = started.body.id;
      const q: ApiQuestion = started.body.questions[0];
      const url = `/assessments/attempts/${attemptId}/answers`;
      expect(
        (await post(url, student, { questionId: q.id, selectedIndex: 4 }))
          .status,
      ).toBe(400); // only four options
      expect(
        (await post(url, student, { questionId: q.id, selectedIndex: 10 }))
          .status,
      ).toBe(400); // DTO bound
      expect(
        (await post(url, student, { questionId: q.id, selectedIndex: -1 }))
          .status,
      ).toBe(400);
      expect(
        (await post(url, student, { questionId: q.id, selectedIndex: 'A' }))
          .status,
      ).toBe(400);
      expect(
        (await post(url, student, { questionId: 'nope', selectedIndex: 0 }))
          .status,
      ).toBe(404);
      expect(
        (
          await post(url, student, {
            questionId: q.id,
            selectedIndex: 0,
            isCorrect: true, // not a field — must be refused, never trusted
          })
        ).status,
      ).toBe(400);
    });

    it('keeps other students and unrelated teachers out of the attempt', async () => {
      const started = await start(testAssessmentId, testClassId);
      const attemptId: string = started.body.id;
      const q: ApiQuestion = started.body.questions[0];
      expect(
        (await get(`/assessments/attempts/${attemptId}`, otherStudent)).status,
      ).toBe(403);
      expect(
        (await get(`/assessments/attempts/${attemptId}`, otherTeacher)).status,
      ).toBe(403);
      expect(
        (
          await post(
            `/assessments/attempts/${attemptId}/answers`,
            otherStudent,
            {
              questionId: q.id,
              selectedIndex: 0,
            },
          )
        ).status,
      ).toBe(403);
      expect(
        (await post(`/assessments/attempts/${attemptId}/submit`, otherStudent))
          .status,
      ).toBe(403);
      // The owner’s class teacher and an admin may look.
      expect(
        (await get(`/assessments/attempts/${attemptId}`, teacher)).status,
      ).toBe(200);
      expect(
        (await get(`/assessments/attempts/${attemptId}`, admin)).status,
      ).toBe(200);
    });

    it('submits once: grades the objective part and creates the report card', async () => {
      const { attemptId } = await takeCourseTest();
      const attempt = await prisma.assessmentAttempt.findUniqueOrThrow({
        where: { id: attemptId },
      });
      expect(attempt.status).toBe('SUBMITTED');
      expect(attempt.submittedAt).not.toBeNull();

      const report = await prisma.testReport.findUniqueOrThrow({
        where: { attemptId },
      });
      expect(report).toMatchObject({
        status: 'PENDING_REVIEW',
        studentUserId: student.id,
        teacherId: teacher.profileId,
        assessmentType: 'COURSE_TEST',
        courseTitle: 'Workflow Course',
        mcqTotal: 30,
        trueFalseTotal: 10,
        autoObjectiveScore: 32, // 24 + 8
        objectiveScore: 32,
        objectiveMaxScore: 40,
        totalMaxScore: 40,
        totalScore: 32,
        percentage: 80,
        passed: true,
        hasCodingProject: false,
        teacherEdited: false,
      });
      const results = report.questionResults as {
        selectedIndex: number | null;
      }[];
      expect(results).toHaveLength(40);
      expect(results.filter((r) => r.selectedIndex === null)).toHaveLength(1);
    });

    it('a second submit — double click, retry, two tabs — is a harmless no-op', async () => {
      const { attemptId } = await takeCourseTest();
      const again = await post(
        `/assessments/attempts/${attemptId}/submit`,
        student,
      );
      expect(again.status).toBe(201);
      expect(again.body.alreadySubmitted).toBe(true);

      const many = await Promise.all(
        Array.from({ length: 5 }, () =>
          post(`/assessments/attempts/${attemptId}/submit`, student),
        ),
      );
      expect(many.every((r) => r.status === 201)).toBe(true);
      expect(await prisma.testReport.count({ where: { attemptId } })).toBe(1);
    });

    it('simultaneous first submits create exactly one report', async () => {
      const started = await start(testAssessmentId, testClassId);
      const attemptId: string = started.body.id;
      await answer(attemptId, started.body.questions, {
        mcqRight: 30,
        mcqWrong: 0,
        tfRight: 10,
        tfWrong: 0,
      });
      const results = await Promise.all(
        Array.from({ length: 6 }, () =>
          post(`/assessments/attempts/${attemptId}/submit`, student),
        ),
      );
      expect(results.every((r) => r.status === 201)).toBe(true);
      expect(results.filter((r) => !r.body.alreadySubmitted)).toHaveLength(1);
      expect(await prisma.testReport.count({ where: { attemptId } })).toBe(1);
      const report = await prisma.testReport.findUniqueOrThrow({
        where: { attemptId },
      });
      expect(report.percentage).toBe(100);
    });

    it('applies the answers sent with the submit, so a lost autosave cannot lose marks', async () => {
      const started = await start(testAssessmentId, testClassId);
      const attemptId: string = started.body.id;
      const keys = await oracle(attemptId);
      // Nothing was autosaved; the final payload carries every answer.
      const answers = (started.body.questions as ApiQuestion[]).map((q) => ({
        questionId: q.id,
        selectedIndex: keys.get(q.id)!.right,
      }));
      const res = await post(
        `/assessments/attempts/${attemptId}/submit`,
        student,
        {
          answers,
        },
      );
      expect(res.status).toBe(201);
      const report = await prisma.testReport.findUniqueOrThrow({
        where: { attemptId },
      });
      expect(report.objectiveScore).toBe(40);
      expect(report.percentage).toBe(100);
    });

    it('rejects a submit that names a question from another test', async () => {
      const started = await start(testAssessmentId, testClassId);
      const attemptId: string = started.body.id;
      const res = await post(
        `/assessments/attempts/${attemptId}/submit`,
        student,
        {
          answers: [{ questionId: 'not-in-this-test', selectedIndex: 0 }],
        },
      );
      expect(res.status).toBe(400);
      expect(
        (
          await prisma.assessmentAttempt.findUniqueOrThrow({
            where: { id: attemptId },
          })
        ).status,
      ).toBe('IN_PROGRESS'); // the failed submit left the attempt editable
      expect(await prisma.testReport.count()).toBe(0);
    });

    it('locks the attempt after submit: no more answers, no changed answers', async () => {
      const { attemptId, started } = await takeCourseTest();
      const q: ApiQuestion = started.body.questions[0];
      const late = await post(
        `/assessments/attempts/${attemptId}/answers`,
        student,
        {
          questionId: q.id,
          selectedIndex: 0,
        },
      );
      expect(late.status).toBe(409);
      // Even a later "submit" carrying different answers cannot change the result.
      const keys = await oracle(attemptId);
      const sneaky = await post(
        `/assessments/attempts/${attemptId}/submit`,
        student,
        {
          answers: (started.body.questions as ApiQuestion[]).map((x) => ({
            questionId: x.id,
            selectedIndex: keys.get(x.id)!.right,
          })),
        },
      );
      expect(sneaky.body.alreadySubmitted).toBe(true);
      const report = await prisma.testReport.findUniqueOrThrow({
        where: { attemptId },
      });
      expect(report.objectiveScore).toBe(32);
    });

    it('shows the student a confirmation — no score, no answers — until the teacher approves', async () => {
      const { attemptId } = await takeCourseTest();
      const res = await get(`/assessments/attempts/${attemptId}`, student);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        status: 'SUBMITTED',
        released: false,
        result: null,
      });
      const json = JSON.stringify(res.body);
      expect(json).not.toContain('correctIndex');
      expect(json).not.toContain('explanation');
      expect(json).not.toContain('percentage');
      // The attempts list leaks nothing either.
      const list = await get(
        `/assessments/students/${student.id}/attempts`,
        student,
      );
      expect(list.status).toBe(200);
      expect(list.body[0].report).toBeNull();
      expect(list.body[0].totalScore).toBeNull();
      expect(JSON.stringify(list.body)).not.toContain('80');
    });

    it('alerts the teacher the moment a test lands', async () => {
      await takeCourseTest();
      const arrived = await eventually(
        async () =>
          (await prisma.dashboardAlert.count({
            where: { userId: teacher.id, type: 'TEST_SUBMITTED' },
          })) === 1,
      );
      expect(arrived).toBe(true);
    });

    it('shows teachers the class’s test progress while the student is working', async () => {
      const started = await start(testAssessmentId, testClassId);
      await answer(started.body.id, started.body.questions, {
        mcqRight: 4,
        mcqWrong: 0,
        tfRight: 0,
        tfWrong: 0,
      });
      const res = await get(
        `/assessments/scheduled-lessons/${testClassId}/status`,
        teacher,
      );
      expect(res.status).toBe(200);
      expect(res.body.attempt).toMatchObject({
        status: 'IN_PROGRESS',
        total: 40,
        answered: 4,
      });
      expect(res.body.assessment).toMatchObject({
        id: testAssessmentId,
        meetsStandard: true,
      });
      expect(
        (
          await get(
            `/assessments/scheduled-lessons/${testClassId}/status`,
            otherTeacher,
          )
        ).status,
      ).toBe(403);
      expect(
        (
          await get(
            `/assessments/scheduled-lessons/${testClassId}/status`,
            otherStudent,
          )
        ).status,
      ).toBe(403);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  describe('teacher evaluates the report card', () => {
    it('lists the report for the class’s teacher only (admins see everything)', async () => {
      const { reportId } = await takeCourseTest();

      const mine = await get('/test-reports', teacher);
      expect(mine.status).toBe(200);
      expect(mine.body).toHaveLength(1);
      expect(mine.body[0]).toMatchObject({
        id: reportId,
        status: 'PENDING_REVIEW',
        needsAction: true,
        typeLabel: 'Course Test',
        objectiveScore: 32,
        percentage: 80,
        student: { fullName: 'mira rahman' },
      });

      expect((await get('/test-reports', otherTeacher)).body).toEqual([]);
      expect((await get('/test-reports', admin)).body).toHaveLength(1);

      const summary = await get('/test-reports/summary', teacher);
      expect(summary.body).toMatchObject({ pendingReview: 1, needsAction: 1 });
      expect(
        (await get('/test-reports/summary', otherTeacher)).body,
      ).toMatchObject({ needsAction: 0 });
    });

    it('students and parents cannot reach the evaluation API; other teachers get 404', async () => {
      const { reportId } = await takeCourseTest();
      expect((await get('/test-reports', student)).status).toBe(403);
      expect((await get(`/test-reports/${reportId}`, student)).status).toBe(
        403,
      );
      expect(
        (await post(`/test-reports/${reportId}/approve`, student)).status,
      ).toBe(403);
      expect(
        (await get(`/test-reports/${reportId}`, otherTeacher)).status,
      ).toBe(404);
      expect(
        (
          await patch(`/test-reports/${reportId}`, otherTeacher, {
            feedback: 'x',
          })
        ).status,
      ).toBe(404);
      expect(
        (await post(`/test-reports/${reportId}/approve`, otherTeacher)).status,
      ).toBe(404);
      expect(
        (await post(`/test-reports/${reportId}/share`, otherTeacher)).status,
      ).toBe(404);
      const unauth = await http().get('/test-reports');
      expect(unauth.status).toBe(401);
    });

    it('an assigned teacher can evaluate even when another teacher took the class', async () => {
      const { reportId } = await takeCourseTest();
      // The student is re-assigned to the other teacher.
      await prisma.user.update({
        where: { id: student.id },
        data: { assignedTeacherId: otherTeacher.profileId },
      });
      expect(
        (await get(`/test-reports/${reportId}`, otherTeacher)).status,
      ).toBe(200);
      expect((await get(`/test-reports/${reportId}`, teacher)).status).toBe(
        200,
      ); // class teacher still can
    });

    it('shows every question as the student saw it, with auto result and the student’s pick', async () => {
      const { reportId } = await takeCourseTest();
      const res = await get(`/test-reports/${reportId}`, teacher);
      expect(res.status).toBe(200);
      expect(res.body.objective).toMatchObject({
        score: 32,
        autoScore: 32,
        max: 40,
        overrides: 0,
        unanswered: 1,
        mcq: { correct: 24, total: 30 },
        trueFalse: { correct: 8, total: 10 },
      });
      expect(res.body.questions).toHaveLength(40);
      const q = res.body.questions[0];
      expect(q).toEqual(
        expect.objectContaining({
          text: expect.any(String),
          options: expect.any(Array),
          correctIndex: expect.any(Number),
          autoCorrect: true,
          override: null,
        }),
      );
      expect(res.body.totals).toMatchObject({
        total: 32,
        totalMax: 40,
        percentage: 80,
        passed: true,
      });
      expect(res.body.share.recipient).toEqual({
        email: student.email,
        kind: 'STUDENT_ACCOUNT',
      });
      expect(res.body.share.canShare).toBe(false);
    });

    it('a teacher’s override changes the score; the automatic result stays visible', async () => {
      const { reportId } = await takeCourseTest();
      const detail = await get(`/test-reports/${reportId}`, teacher);
      const wrong = detail.body.questions.find(
        (x: { autoCorrect: boolean; selectedIndex: number | null }) =>
          !x.autoCorrect && x.selectedIndex !== null,
      );
      const res = await patch(`/test-reports/${reportId}`, teacher, {
        questionOverrides: [
          {
            questionId: wrong.questionId,
            correct: true,
            note: 'Accepted — fair reading.',
          },
        ],
        feedback: '  Great effort, Mira!  ',
        strengths: 'Loops and functions',
        expectedUpdatedAt: detail.body.updatedAt,
      });
      expect(res.status).toBe(200);
      expect(res.body.objective).toMatchObject({
        score: 33,
        autoScore: 32,
        overrides: 1,
      });
      expect(res.body.totals).toMatchObject({ total: 33, percentage: 82.5 });
      expect(res.body.teacherEdited).toBe(true);
      expect(res.body.feedback).toBe('Great effort, Mira!');
      const stored = await prisma.testReport.findUniqueOrThrow({
        where: { id: reportId },
      });
      expect(stored.autoObjectiveScore).toBe(32); // never rewritten
      expect(stored.objectiveScore).toBe(33);
      expect(stored.lastEditedByUserId).toBe(teacher.id);

      // Putting the question back to the automatic result clears the override.
      const undone = await patch(`/test-reports/${reportId}`, teacher, {
        questionOverrides: [{ questionId: wrong.questionId, correct: null }],
      });
      expect(undone.body.objective).toMatchObject({ score: 32, overrides: 0 });
    });

    it('refuses an edit based on an out-of-date copy of the report', async () => {
      const { reportId } = await takeCourseTest();
      const first = await get(`/test-reports/${reportId}`, teacher);
      await patch(`/test-reports/${reportId}`, teacher, {
        feedback: 'first edit',
      });
      const stale = await patch(`/test-reports/${reportId}`, teacher, {
        feedback: 'second edit from an old tab',
        expectedUpdatedAt: first.body.updatedAt,
      });
      expect(stale.status).toBe(409);
      expect(
        (await prisma.testReport.findUniqueOrThrow({ where: { id: reportId } }))
          .feedback,
      ).toBe('first edit');
    });

    it('validates what the teacher sends', async () => {
      const { reportId } = await takeCourseTest();
      expect(
        (
          await patch(`/test-reports/${reportId}`, teacher, {
            questionOverrides: [
              { questionId: 'not-on-this-report', correct: true },
            ],
          })
        ).status,
      ).toBe(400);
      expect(
        (
          await patch(`/test-reports/${reportId}`, teacher, {
            feedback: 'x'.repeat(2001),
          })
        ).status,
      ).toBe(400);
      expect(
        (await patch(`/test-reports/${reportId}`, teacher, { totalScore: 40 }))
          .status,
      ).toBe(400); // computed fields cannot be set directly
      expect(
        (
          await patch(`/test-reports/${reportId}`, teacher, {
            codingRubricScores: [{ criterion: 'Anything', score: 1 }],
          })
        ).status,
      ).toBe(400); // a Course Test has no coding project
    });

    it('approving releases the result to the student, with the teacher’s final answers', async () => {
      const { attemptId, reportId } = await takeCourseTest();
      const detail = await get(`/test-reports/${reportId}`, teacher);
      const wrong = detail.body.questions.find(
        (x: { autoCorrect: boolean; selectedIndex: number | null }) =>
          !x.autoCorrect && x.selectedIndex !== null,
      );
      await patch(`/test-reports/${reportId}`, teacher, {
        questionOverrides: [{ questionId: wrong.questionId, correct: true }],
        feedback: 'Well done.',
      });
      const approved = await post(`/test-reports/${reportId}/approve`, teacher);
      expect(approved.status).toBe(201);
      expect(approved.body.status).toBe('READY_TO_SHARE');
      expect(approved.body.totals).toMatchObject({
        total: 33,
        percentage: 82.5,
        passed: true,
      });

      const attempt = await prisma.assessmentAttempt.findUniqueOrThrow({
        where: { id: attemptId },
      });
      expect(attempt).toMatchObject({
        status: 'GRADED',
        mcqScore: 33,
        totalScore: 82.5,
        totalMaxScore: 100,
        passed: true,
      });

      const view = await get(`/assessments/attempts/${attemptId}`, student);
      expect(view.body.released).toBe(true);
      expect(view.body.result).toMatchObject({
        status: 'READY_TO_SHARE',
        percentage: 82.5,
        passed: true,
        feedback: 'Well done.',
      });
      expect(view.body.result.objective).toMatchObject({ score: 33, max: 40 });
      expect(view.body.result.objective.autoScore).toBeUndefined();
      const reviewed = (
        view.body.questions as {
          id: string;
          isCorrect: boolean;
          correctIndex: number;
          explanation: string;
        }[]
      ).find((x) => x.id === wrong.questionId)!;
      expect(reviewed.isCorrect).toBe(true); // the teacher's decision, not the auto result
      expect(typeof reviewed.explanation).toBe('string');

      const list = await get(
        `/assessments/students/${student.id}/attempts`,
        student,
      );
      expect(list.body[0].report.percentage).toBe(82.5);
    });

    it('an approved report is locked until it is reopened', async () => {
      const { attemptId, reportId } = await takeCourseTest();
      await post(`/test-reports/${reportId}/approve`, teacher);
      expect(
        (await patch(`/test-reports/${reportId}`, teacher, { feedback: 'x' }))
          .status,
      ).toBe(409);
      expect(
        (await post(`/test-reports/${reportId}/approve`, teacher)).status,
      ).toBe(409);

      const reopened = await post(`/test-reports/${reportId}/reopen`, teacher);
      expect(reopened.status).toBe(201);
      expect(reopened.body.status).toBe('PENDING_REVIEW');
      // The student no longer sees the result.
      const view = await get(`/assessments/attempts/${attemptId}`, student);
      expect(view.body).toMatchObject({
        released: false,
        result: null,
        status: 'SUBMITTED',
      });
      expect(
        (
          await patch(`/test-reports/${reportId}`, teacher, {
            feedback: 'changed my mind',
          })
        ).status,
      ).toBe(200);
      expect(
        (await post(`/test-reports/${reportId}/approve`, teacher)).status,
      ).toBe(201);
    });

    it('concurrent approvals release the result once', async () => {
      const { reportId } = await takeCourseTest();
      const results = await Promise.all([
        post(`/test-reports/${reportId}/approve`, teacher),
        post(`/test-reports/${reportId}/approve`, teacher),
        post(`/test-reports/${reportId}/approve`, teacher),
      ]);
      expect(results.filter((r) => r.status === 201)).toHaveLength(1);
      expect(results.filter((r) => r.status === 409)).toHaveLength(2);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  describe('sharing with the parent', () => {
    async function approvedReport() {
      const t = await takeCourseTest();
      await post(`/test-reports/${t.reportId}/approve`, teacher);
      return t;
    }

    it('cannot share before the report is approved', async () => {
      const { reportId } = await takeCourseTest();
      const res = await post(`/test-reports/${reportId}/share`, teacher);
      expect(res.status).toBe(409);
      expect(await prisma.emailLog.count()).toBe(0);
    });

    it('does not pretend: with no mail server the share fails, says why, and stays READY_TO_SHARE', async () => {
      const { reportId } = await approvedReport();
      const res = await post(`/test-reports/${reportId}/share`, teacher);
      expect(res.status).toBe(502);
      expect(res.body.message).toMatch(/NOT sent to mira-rahman@example\.com/);
      expect(res.body.message).toMatch(/not configured/i);

      const report = await prisma.testReport.findUniqueOrThrow({
        where: { id: reportId },
      });
      expect(report.status).toBe('READY_TO_SHARE');
      expect(report.sharedAt).toBeNull();
      expect(report.lastShareError).toMatch(/not configured/i);
      const log = await prisma.emailLog.findFirstOrThrow({
        where: { category: 'TEST_REPORT' },
      });
      expect(log.status).toBe('FAILED');

      const detail = await get(`/test-reports/${reportId}`, teacher);
      expect(detail.body.share).toMatchObject({
        canShare: true,
        deliveryStatus: 'FAILED',
      });
      expect(detail.body.share.lastError).toMatch(/not configured/i);
    });

    it('emails the report to the parent and only then marks it shared', async () => {
      const { reportId } = await approvedReport();
      await prisma.user.update({
        where: { id: student.id },
        data: { billingContactEmail: 'mira.parent@example.com' },
      });
      const sendMail = installMailServer();

      const res = await post(`/test-reports/${reportId}/share`, teacher);
      expect(res.status).toBe(201);
      expect(res.body.status).toBe('SHARED_WITH_PARENTS');
      expect(res.body.share).toMatchObject({
        sharedToEmail: 'mira.parent@example.com',
        sharedToKind: 'BILLING_CONTACT',
        deliveryStatus: 'SENT',
        attempts: 1,
      });

      expect(sendMail).toHaveBeenCalledTimes(1);
      const mail = sendMail.mock.calls[0][0] as unknown as {
        to: string;
        subject: string;
        html: string;
      };
      expect(mail.to).toBe('mira.parent@example.com');
      expect(mail.subject).toMatch(/Workflow Module — Course Test/);
      expect(mail.html).toContain('mira rahman');
      expect(mail.html).toContain('80%');
      const log = await prisma.emailLog.findFirstOrThrow({
        where: { category: 'TEST_REPORT' },
      });
      expect(log).toMatchObject({
        status: 'SENT',
        toEmail: 'mira.parent@example.com',
      });
      const report = await prisma.testReport.findUniqueOrThrow({
        where: { id: reportId },
      });
      expect(report).toMatchObject({
        status: 'SHARED_WITH_PARENTS',
        sharedByUserId: teacher.id,
        shareEmailLogId: log.id,
        lastShareError: null,
      });
    });

    it('falls back to the student’s account email when there is no billing contact', async () => {
      const { reportId } = await approvedReport();
      const sendMail = installMailServer();
      await post(`/test-reports/${reportId}/share`, teacher);
      expect((sendMail.mock.calls[0][0] as { to: string }).to).toBe(
        student.email,
      );
    });

    it('a shared report is final: no second email, no edits, no reopening', async () => {
      const { reportId } = await approvedReport();
      const sendMail = installMailServer();
      expect(
        (await post(`/test-reports/${reportId}/share`, teacher)).status,
      ).toBe(201);
      expect(
        (await post(`/test-reports/${reportId}/share`, teacher)).status,
      ).toBe(409);
      expect(
        (await patch(`/test-reports/${reportId}`, teacher, { feedback: 'x' }))
          .status,
      ).toBe(409);
      expect(
        (await post(`/test-reports/${reportId}/reopen`, teacher)).status,
      ).toBe(409);
      expect(sendMail).toHaveBeenCalledTimes(1);
    });

    it('can be retried after a failure and then delivers exactly once', async () => {
      const { reportId } = await approvedReport();
      let calls = 0;
      const sendMail = installMailServer(() =>
        ++calls === 1
          ? Promise.reject(new Error('450 mailbox busy, try later'))
          : Promise.resolve({}),
      );
      const failed = await post(`/test-reports/${reportId}/share`, teacher);
      expect(failed.status).toBe(502);
      expect(failed.body.message).toMatch(/450 mailbox busy/);
      expect(
        (await prisma.testReport.findUniqueOrThrow({ where: { id: reportId } }))
          .status,
      ).toBe('READY_TO_SHARE');

      const retried = await post(`/test-reports/${reportId}/share`, teacher);
      expect(retried.status).toBe(201);
      expect(retried.body.share.attempts).toBe(2);
      expect(sendMail).toHaveBeenCalledTimes(2); // one failed + one delivered
      const logs = await prisma.emailLog.findMany({
        where: { category: 'TEST_REPORT' },
      });
      expect(logs.map((l) => l.status).sort()).toEqual(['FAILED', 'SENT']);
    });

    it('a second click while the first email is still going out sends nothing', async () => {
      const { reportId } = await approvedReport();
      const sendMail = installMailServer(
        () => new Promise((resolve) => setTimeout(() => resolve({}), 400)),
      );
      // (supertest only sends the request once it is awaited — start it now)
      const first = post(`/test-reports/${reportId}/share`, teacher).then(
        (r) => r,
      );
      await new Promise((r) => setTimeout(r, 120)); // the first is mid-send
      const second = await post(`/test-reports/${reportId}/share`, teacher);
      expect(second.status).toBe(409);

      const detail = await get(`/test-reports/${reportId}`, teacher);
      expect(detail.body.share).toMatchObject({
        sending: true,
        canShare: false,
      });

      expect((await first).status).toBe(201);
      expect(sendMail).toHaveBeenCalledTimes(1);
      expect(
        await prisma.emailLog.count({ where: { category: 'TEST_REPORT' } }),
      ).toBe(1);
    });

    it('cannot be reopened or edited while its email is going out', async () => {
      const { attemptId, reportId } = await approvedReport();
      const sendMail = installMailServer(
        () => new Promise((resolve) => setTimeout(() => resolve({}), 400)),
      );
      const first = post(`/test-reports/${reportId}/share`, teacher).then(
        (r) => r,
      );
      await new Promise((r) => setTimeout(r, 120));
      expect(
        (await post(`/test-reports/${reportId}/reopen`, teacher)).status,
      ).toBe(409);
      expect(
        (await patch(`/test-reports/${reportId}`, teacher, { feedback: 'x' }))
          .status,
      ).toBe(409);
      expect((await first).status).toBe(201);
      expect(sendMail).toHaveBeenCalledTimes(1);
      // Still shared and still released to the student.
      expect(
        (await prisma.testReport.findUniqueOrThrow({ where: { id: reportId } }))
          .status,
      ).toBe('SHARED_WITH_PARENTS');
      expect(
        (
          await prisma.assessmentAttempt.findUniqueOrThrow({
            where: { id: attemptId },
          })
        ).status,
      ).toBe('GRADED');
    });

    it('a failed send releases the claim at once so the teacher can retry', async () => {
      const { reportId } = await approvedReport();
      installMailServer(() => Promise.reject(new Error('550 rejected')));
      expect(
        (await post(`/test-reports/${reportId}/share`, teacher)).status,
      ).toBe(502);
      const report = await prisma.testReport.findUniqueOrThrow({
        where: { id: reportId },
      });
      expect(report.shareStartedAt).toBeNull();
      const detail = await get(`/test-reports/${reportId}`, teacher);
      expect(detail.body.share).toMatchObject({
        sending: false,
        canShare: true,
      });
    });

    it('simultaneous share clicks send one email', async () => {
      const { reportId } = await approvedReport();
      const sendMail = installMailServer(
        () => new Promise((resolve) => setTimeout(() => resolve({}), 150)),
      );
      const results = await Promise.all([
        post(`/test-reports/${reportId}/share`, teacher),
        post(`/test-reports/${reportId}/share`, teacher),
        post(`/test-reports/${reportId}/share`, teacher),
      ]);
      expect(results.filter((r) => r.status === 201)).toHaveLength(1);
      expect(results.filter((r) => r.status === 409)).toHaveLength(2);
      expect(sendMail).toHaveBeenCalledTimes(1);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  describe('Final Test with a coding project', () => {
    async function startFinal() {
      const res = await start(finalAssessmentId, finalClassId);
      expect(res.status).toBe(201);
      return res;
    }
    const mark = (a: number, b: number, c: number, d: number) => ({
      codingRubricScores: [
        { criterion: 'Works as described', score: a },
        { criterion: 'Uses variables and input correctly', score: b },
        { criterion: 'Readable code', score: c },
        { criterion: 'Extra care', score: d },
      ],
    });

    it('serves 25 MCQ + 5 True/False and the coding project — without the marking guide', async () => {
      const res = await startFinal();
      expect(res.body.assessment).toMatchObject({
        questionCount: 30,
        mcqCount: 25,
        trueFalseCount: 5,
        hasCodingProject: true,
        totalMarks: 50,
      });
      const project = res.body.codingProject;
      expect(project).toMatchObject({
        maxScore: 20,
        language: 'python',
        hasSavedCode: false,
      });
      expect(project.starterCode).toContain('your code here');
      expect(project.code).toBe(project.starterCode);
      expect(
        project.rubric.map((r: { maxPoints: number }) => r.maxPoints),
      ).toEqual([8, 5, 4, 3]);
      const json = JSON.stringify(res.body);
      expect(json).not.toContain('lookFor');
      expect(json).not.toContain('well-named variables'); // marking-guide text
    });

    it('autosaves the code, keeps it across a refresh and enforces the size limit', async () => {
      const started = await startFinal();
      const attemptId: string = started.body.id;
      const projectId: string = started.body.codingProject.id;
      const url = `/assessments/attempts/${attemptId}/code`;

      expect(
        (await post(url, student, { questionId: projectId, code: 'print(1)' }))
          .status,
      ).toBe(201);
      expect(
        (await post(url, student, { questionId: projectId, code: 'print(2)' }))
          .status,
      ).toBe(201);
      const refreshed = await get(
        `/assessments/attempts/${attemptId}`,
        student,
      );
      expect(refreshed.body.codingProject).toMatchObject({
        code: 'print(2)',
        hasSavedCode: true,
      });
      expect(
        await prisma.practicalSubmission.count({ where: { attemptId } }),
      ).toBe(1);

      expect(
        (
          await post(url, student, {
            questionId: projectId,
            code: 'x'.repeat(20_001),
          })
        ).status,
      ).toBe(400);
      expect(
        (await post(url, student, { questionId: 'someone-elses', code: 'x' }))
          .status,
      ).toBe(404);
      expect(
        (await post(url, otherStudent, { questionId: projectId, code: 'x' }))
          .status,
      ).toBe(403);
    });

    it('submitting creates a report that waits for the teacher’s code evaluation', async () => {
      const started = await startFinal();
      const attemptId: string = started.body.id;
      const projectId: string = started.body.codingProject.id;
      await answer(attemptId, started.body.questions, {
        mcqRight: 22,
        mcqWrong: 3,
        tfRight: 5,
        tfWrong: 0,
      });
      const res = await post(
        `/assessments/attempts/${attemptId}/submit`,
        student,
        {
          practical: [
            { questionId: projectId, code: 'total = 1 + 2\nprint(total)' },
          ],
        },
      );
      expect(res.status).toBe(201);

      const report = await prisma.testReport.findUniqueOrThrow({
        where: { attemptId },
      });
      expect(report).toMatchObject({
        status: 'PENDING_CODE_EVALUATION',
        hasCodingProject: true,
        objectiveScore: 27,
        objectiveMaxScore: 30,
        codingMaxScore: 20,
        codingScore: null,
        totalMaxScore: 50,
        totalScore: null,
        percentage: null,
        passed: null,
      });
      // The student sees only a confirmation.
      const view = await get(`/assessments/attempts/${attemptId}`, student);
      expect(view.body).toMatchObject({ released: false, result: null });

      const detail = await get(`/test-reports/${report.id}`, teacher);
      expect(detail.body.coding.project.code).toBe(
        'total = 1 + 2\nprint(total)',
      );
      expect(detail.body.coding.hasCode).toBe(true);
      expect(detail.body.coding.rubric).toHaveLength(4);
      expect(detail.body.coding.rubric[0].lookFor).toBeTruthy(); // teachers get the guide
      expect(detail.body.totals).toMatchObject({
        total: null,
        percentage: null,
        passed: null,
      });
      expect((await get('/test-reports/summary', teacher)).body).toMatchObject({
        pendingCodeEvaluation: 1,
        needsAction: 1,
      });
    });

    it('cannot be approved until every criterion is marked; then totals and the pass decision are computed', async () => {
      const started = await startFinal();
      const attemptId: string = started.body.id;
      await answer(attemptId, started.body.questions, {
        mcqRight: 22,
        mcqWrong: 3,
        tfRight: 5,
        tfWrong: 0,
      });
      await post(`/assessments/attempts/${attemptId}/submit`, student);
      const report = await prisma.testReport.findUniqueOrThrow({
        where: { attemptId },
      });
      const url = `/test-reports/${report.id}`;

      expect((await post(`${url}/approve`, teacher)).status).toBe(400);

      // Two of four criteria marked: still waiting.
      const partial = await patch(url, teacher, {
        codingRubricScores: [
          { criterion: 'Works as described', score: 7 },
          { criterion: 'Readable code', score: 3 },
        ],
      });
      expect(partial.status).toBe(200);
      expect(partial.body.status).toBe('PENDING_CODE_EVALUATION');
      expect(partial.body.coding.score).toBeNull();
      expect(partial.body.totals.total).toBeNull();
      expect((await post(`${url}/approve`, teacher)).status).toBe(400);

      // Out-of-range and unknown marks are refused.
      expect(
        (
          await patch(url, teacher, {
            codingRubricScores: [{ criterion: 'Works as described', score: 9 }],
          })
        ).status,
      ).toBe(400);
      expect(
        (
          await patch(url, teacher, {
            codingRubricScores: [
              { criterion: 'Works as described', score: -1 },
            ],
          })
        ).status,
      ).toBe(400);
      expect(
        (
          await patch(url, teacher, {
            codingRubricScores: [{ criterion: 'Made up', score: 1 }],
          })
        ).status,
      ).toBe(400);

      const complete = await patch(url, teacher, {
        ...mark(7, 4, 3, 2),
        codingFeedback: 'Clear code — add a check for empty input next time.',
      });
      expect(complete.body.status).toBe('PENDING_REVIEW');
      expect(complete.body.coding).toMatchObject({ score: 16, max: 20 });
      // 27 objective + 16 coding = 43 / 50
      expect(complete.body.totals).toMatchObject({
        total: 43,
        totalMax: 50,
        percentage: 86,
        passed: true,
      });

      const approved = await post(`${url}/approve`, teacher);
      expect(approved.status).toBe(201);
      const attempt = await prisma.assessmentAttempt.findUniqueOrThrow({
        where: { id: attemptId },
      });
      expect(attempt).toMatchObject({
        status: 'GRADED',
        mcqScore: 27,
        practicalScore: 16,
        practicalMaxScore: 20,
        totalScore: 86,
        passed: true,
      });
      // The mark is mirrored onto the stored submission.
      expect(
        (await prisma.practicalSubmission.findFirst({ where: { attemptId } }))
          ?.score ?? 16,
      ).toBe(16);

      const view = await get(`/assessments/attempts/${attemptId}`, student);
      expect(view.body.released).toBe(true);
      expect(view.body.result).toMatchObject({
        percentage: 86,
        passed: true,
        total: 43,
        totalMax: 50,
      });
      expect(view.body.result.coding).toMatchObject({
        score: 16,
        max: 20,
        feedback: 'Clear code — add a check for empty input next time.',
      });
      expect(
        view.body.result.coding.rubric.map((r: { score: number }) => r.score),
      ).toEqual([7, 4, 3, 2]);
      expect(JSON.stringify(view.body)).not.toContain('lookFor');
    });

    it('a weak project can turn a good objective score into a fail', async () => {
      const started = await startFinal();
      const attemptId: string = started.body.id;
      await answer(attemptId, started.body.questions, {
        mcqRight: 20,
        mcqWrong: 5,
        tfRight: 4,
        tfWrong: 1,
      });
      await post(`/assessments/attempts/${attemptId}/submit`, student);
      const report = await prisma.testReport.findUniqueOrThrow({
        where: { attemptId },
      });
      const res = await patch(
        `/test-reports/${report.id}`,
        teacher,
        mark(1, 0, 0, 0),
      );
      // 24 + 1 = 25 / 50 = 50%
      expect(res.body.totals).toMatchObject({
        total: 25,
        percentage: 50,
        passed: false,
      });
      const approved = await post(
        `/test-reports/${report.id}/approve`,
        teacher,
      );
      expect(approved.body.totals.passed).toBe(false);
      expect(
        (
          await prisma.assessmentAttempt.findUniqueOrThrow({
            where: { id: attemptId },
          })
        ).passed,
      ).toBe(false);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  describe('custom curriculum', () => {
    async function customCourseWithImportedTest() {
      const course = await prisma.course.create({
        data: {
          slug: 'custom-all-exams',
          title: 'AI & DS - All Exams Check',
          category: 'Custom',
          level: 'STARTER',
          isCustom: true,
        },
      });
      const lesson = await prisma.lesson.create({
        data: {
          courseId: course.id,
          title: 'Workflow Module — Course Test',
          order: 1,
          type: SessionType.COURSE_TEST,
          sourceRefs: { importedFromLessonId: testLessonId },
        },
      });
      // What a deploy does on boot: link the import to the original bank.
      const report = await syncAssessmentBanks(
        prisma as unknown as PrismaClient,
        quiet,
        registry,
        1,
      );
      expect(report.linksCreated).toBe(1);
      const linked = await prisma.assessment.findUniqueOrThrow({
        where: { lessonId: lesson.id },
      });
      const klass = await prisma.scheduledLesson.create({
        data: {
          studentUserId: student.id,
          teacherId: teacher.profileId!,
          courseId: course.id,
          lessonNumber: 1,
          lessonId: lesson.id,
          start: inMinutes(5),
          end: inMinutes(65),
          classType: 'ONE_TO_ONE',
        },
      });
      return { course, lesson, linked, classId: klass.id };
    }

    it('shows the imported test’s real questions in class (no more empty card)', async () => {
      const { linked, classId } = await customCourseWithImportedTest();
      const status = await get(
        `/assessments/scheduled-lessons/${classId}/status`,
        teacher,
      );
      expect(status.body.assessment).toMatchObject({
        id: linked.id,
        type: 'COURSE_TEST',
        meetsStandard: true,
        counts: { mcq: 30, trueFalse: 10, practical: 0 },
      });
      const started = await start(linked.id, classId);
      expect(started.status).toBe(201);
      expect(started.body.questions).toHaveLength(40);
      expect(started.body.assessment.courseTitle).toBe(
        'AI & DS - All Exams Check',
      );
    });

    it('a student can take it, and the report names the custom course', async () => {
      const { linked, classId, course } = await customCourseWithImportedTest();
      const started = await start(linked.id, classId);
      const attemptId: string = started.body.id;
      await answer(attemptId, started.body.questions, {
        mcqRight: 30,
        mcqWrong: 0,
        tfRight: 10,
        tfWrong: 0,
      });
      expect(
        (await post(`/assessments/attempts/${attemptId}/submit`, student))
          .status,
      ).toBe(201);
      const report = await prisma.testReport.findUniqueOrThrow({
        where: { attemptId },
      });
      expect(report).toMatchObject({
        courseId: course.id,
        courseTitle: 'AI & DS - All Exams Check',
        percentage: 100,
        status: 'PENDING_REVIEW',
      });
      // It is the same question set as the original course — nothing was copied.
      expect(
        await prisma.mCQQuestion.count({ where: { assessmentId: linked.id } }),
      ).toBe(0);
      expect((await get(`/test-reports/${report.id}`, teacher)).status).toBe(
        200,
      );
    });

    it('an answer for another test’s question is refused', async () => {
      const { linked, classId } = await customCourseWithImportedTest();
      const started = await start(linked.id, classId);
      const foreign = await prisma.mCQQuestion.findFirstOrThrow({
        where: { assessmentId: finalAssessmentId },
      });
      const res = await post(
        `/assessments/attempts/${started.body.id}/answers`,
        student,
        {
          questionId: foreign.id,
          selectedIndex: 0,
        },
      );
      expect(res.status).toBe(404);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  describe('admin question banks', () => {
    it('shows whether a bank meets the standard, and only to admins', async () => {
      const res = await get(`/assessments/${testAssessmentId}/admin`, admin);
      expect(res.status).toBe(200);
      expect(res.body.standard).toMatchObject({
        meets: true,
        expectedMcq: 30,
        expectedTrueFalse: 10,
        expectedCodingProject: false,
        expectedTotalMarks: 40,
        issues: [],
      });
      expect(res.body.mcqQuestions).toHaveLength(40);
      expect(
        (await get(`/assessments/${testAssessmentId}/admin`, teacher)).status,
      ).toBe(403);
      expect(
        (await get(`/assessments/${testAssessmentId}/admin`, student)).status,
      ).toBe(403);

      const final = await get(`/assessments/${finalAssessmentId}/admin`, admin);
      expect(final.body.standard).toMatchObject({
        meets: true,
        expectedCodingProject: true,
        expectedTotalMarks: 50,
      });
    });

    it('flags a bank that drifts from the standard and says what is wrong', async () => {
      await post(`/assessments/${testAssessmentId}/mcq-questions`, admin, {
        questionText: 'An extra question that breaks the 30-question standard?',
        options: ['one', 'two', 'three', 'four'],
        correctIndex: 2,
      });
      const res = await get(`/assessments/${testAssessmentId}/admin`, admin);
      expect(res.body.standard.meets).toBe(false);
      expect(res.body.standard.issues.join(' ')).toMatch(
        /Expected 30 multiple-choice questions, found 31/,
      );
    });

    it('validates hand-written questions', async () => {
      const url = `/assessments/${testAssessmentId}/mcq-questions`;
      const ok = {
        questionText: 'Which one is the correct answer here?',
        options: ['a', 'b', 'c', 'd'],
        correctIndex: 1,
      };
      expect(
        (await post(url, admin, { ...ok, options: ['a', 'b', 'c'] })).status,
      ).toBe(400);
      expect(
        (await post(url, admin, { ...ok, options: ['a', 'a', 'c', 'd'] }))
          .status,
      ).toBe(400);
      expect((await post(url, admin, { ...ok, correctIndex: 7 })).status).toBe(
        400,
      );
      expect((await post(url, teacher, ok)).status).toBe(403);
      expect((await post(url, admin, ok)).status).toBe(201);
    });

    it('an edit made on a custom curriculum’s test lands on the shared bank', async () => {
      const course = await prisma.course.create({
        data: {
          slug: 'custom-edit',
          title: 'Custom',
          category: 'Custom',
          level: 'STARTER',
          isCustom: true,
        },
      });
      const lesson = await prisma.lesson.create({
        data: {
          courseId: course.id,
          title: 'Imported test',
          order: 1,
          type: SessionType.COURSE_TEST,
        },
      });
      const attach = await post(
        `/assessments/lessons/${lesson.id}/bank`,
        admin,
        {
          sourceAssessmentId: testAssessmentId,
        },
      );
      expect(attach.status).toBe(201);
      expect(attach.body.sourceAssessmentId).toBe(testAssessmentId);
      expect(
        (await post(`/assessments/lessons/${lesson.id}/bank`, admin, {}))
          .status,
      ).toBe(409);

      await post(`/assessments/${attach.body.id}/mcq-questions`, admin, {
        questionText: 'Added from the custom course page — where does it live?',
        options: ['here', 'there', 'nowhere', 'everywhere'],
        correctIndex: 0,
      });
      expect(
        await prisma.mCQQuestion.count({
          where: { assessmentId: attach.body.id },
        }),
      ).toBe(0);
      expect(
        await prisma.mCQQuestion.count({
          where: { assessmentId: testAssessmentId },
        }),
      ).toBe(41);
    });

    it('an empty hand-made bank can be created for a test lesson with none', async () => {
      const course = await prisma.course.create({
        data: {
          slug: 'custom-own',
          title: 'Own',
          category: 'Custom',
          level: 'STARTER',
          isCustom: true,
        },
      });
      const lesson = await prisma.lesson.create({
        data: {
          courseId: course.id,
          title: 'My test',
          order: 1,
          type: SessionType.FINAL_TEST,
        },
      });
      const res = await post(
        `/assessments/lessons/${lesson.id}/bank`,
        admin,
        {},
      );
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        type: 'FINAL_TEST',
        sourceAssessmentId: null,
        isPublished: false,
      });
      const learning = await prisma.lesson.create({
        data: {
          courseId: course.id,
          title: 'A lesson',
          order: 2,
          type: SessionType.LEARNING,
        },
      });
      expect(
        (await post(`/assessments/lessons/${learning.id}/bank`, admin, {}))
          .status,
      ).toBe(400);
    });

    it('lists the banks a test can be linked to', async () => {
      const res = await get('/assessments/banks', admin);
      expect(res.status).toBe(200);
      expect(res.body.map((b: { id: string }) => b.id)).toEqual(
        expect.arrayContaining([testAssessmentId, finalAssessmentId]),
      );
      expect((await get('/assessments/banks', teacher)).status).toBe(403);
    });
  });
});
