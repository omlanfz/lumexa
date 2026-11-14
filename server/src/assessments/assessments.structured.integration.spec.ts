// A Pre-University CSE assessment (10 multiple choice + 3 short answers + 1 practical, 45 marks, 40
// minutes) end to end over HTTP against a REAL Postgres: the student starts it (the server freezes the
// deadline), answers and autosaves, runs out of time or hands in, the teacher marks Part B and Part C
// against their rubrics, and only the approval releases the result — without the marking guide.
//
// Skipped unless ASSESSMENT_INTEGRATION_DATABASE_URL points at a throwaway, fully migrated database
// — see ./testing/integration-db.ts.

import 'reflect-metadata';
import {
  IT_DB_URL,
  acquireDatabaseLock,
  truncateAssessmentData,
  useIntegrationDatabase,
} from './testing/integration-db';

useIntegrationDatabase();
process.env.JWT_SECRET = 'structured-assessment-secret';
process.env.FRONTEND_URL = 'https://lumexa-one.vercel.app';
delete process.env.SMTP_USER;
delete process.env.SMTP_PASS;

import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { ClassType, Role } from '@prisma/client';
import request from 'supertest';
import { JwtStrategy } from '../auth/jwt.strategy';
import { EmailModule } from '../email/email.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma.module';
import { PrismaService } from '../prisma.service';
import { seedPathwayCurriculum } from '../courses/curriculum-catalog.seed';
import { syncStructuredBanks } from '../structured-assessments/structured.sync';
import { STRUCTURED_GRACE_SECONDS, STRUCTURED_TIME_LIMIT_MINUTES } from '../structured-assessments/structured.constants';
import { StructuredAttemptSweeper } from '../structured-assessments/structured.sweeper';
import { AssessmentsModule } from './assessments.module';

const describeDb = IT_DB_URL ? describe : describe.skip;
const quiet = { log: () => undefined, warn: () => undefined };

interface Person {
  id: string;
  email: string;
  role: Role;
  profileId?: string;
}

describeDb('Structured assessment (Pre-University CSE): 45 marks in 40 minutes (real Postgres, over HTTP)', () => {
  jest.setTimeout(240_000);

  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;
  let release: () => void;
  let teacher: Person;
  let student: Person;
  let otherStudent: Person;
  let courseId: string;
  let assessmentId: string;

  const bearer = (p: Person) => ({
    Authorization: `Bearer ${jwt.sign({ sub: p.id, email: p.email, role: p.role })}`,
  });
  const http = () => request(app.getHttpServer());
  const get = (path: string, who: Person) => http().get(path).set(bearer(who));
  const post = (path: string, who: Person, body: object = {}) => http().post(path).set(bearer(who)).send(body);
  const patch = (path: string, who: Person, body: object = {}) => http().patch(path).set(bearer(who)).send(body);

  async function makeUser(name: string, role: Role, extra: object = {}): Promise<Person> {
    const user = await prisma.user.create({
      data: { email: `${name}@example.com`, password: 'not-a-real-hash', fullName: name.replace(/-/g, ' '), role, ...extra },
    });
    const profileId = role === Role.TEACHER ? (await prisma.teacherProfile.create({ data: { userId: user.id } })).id : undefined;
    return { id: user.id, email: user.email, role, profileId };
  }

  async function makeClass(who: Person): Promise<string> {
    const lesson = await prisma.lesson.findFirstOrThrow({ where: { courseId, order: 9 } });
    const start = new Date(Date.now() + 5 * 60_000);
    return (
      await prisma.scheduledLesson.create({
        data: {
          studentUserId: who.id,
          teacherId: teacher.profileId!,
          courseId,
          lessonNumber: 9,
          lessonId: lesson.id,
          start,
          end: new Date(start.getTime() + 60 * 60_000),
          classType: ClassType.ONE_TO_ONE,
          status: 'UPCOMING',
        },
      })
    ).id;
  }

  async function startFor(who: Person) {
    const classId = await makeClass(who);
    const res = await post(`/assessments/${assessmentId}/attempts/start`, who, { scheduledLessonId: classId });
    expect(res.status).toBe(201);
    return res.body;
  }

  /** Picks the right option for `right` of the questions and a wrong one for the rest. */
  async function answerMcq(attemptId: string, who: Person, right: number) {
    const rows = await prisma.mCQAnswer.findMany({ where: { attemptId }, include: { question: true } });
    let n = 0;
    for (const r of rows) {
      const options = r.question.options as string[];
      const rightPos = r.optionOrder.indexOf(r.question.correctIndex);
      const wrongPos = [...Array(options.length).keys()].find((i) => i !== rightPos)!;
      const res = await post(`/assessments/attempts/${attemptId}/answers`, who, {
        questionId: r.questionId,
        selectedIndex: n++ < right ? rightPos : wrongPos,
      });
      expect(res.status).toBe(201);
    }
  }

  beforeAll(async () => {
    release = await acquireDatabaseLock(IT_DB_URL as string);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const moduleRef = await Test.createTestingModule({
      imports: [PrismaModule, EmailModule, NotificationsModule, PassportModule, AssessmentsModule],
      providers: [JwtStrategy],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.listen(0);
    prisma = moduleRef.get(PrismaService);
    jwt = new JwtService({ secret: process.env.JWT_SECRET });
  }, 240_000);

  afterAll(async () => {
    await app?.close();
    release?.();
  });

  beforeEach(async () => {
    await truncateAssessmentData(prisma);
    teacher = await makeUser('ms-karim', Role.TEACHER);
    student = await makeUser('mira-rahman', Role.STUDENT, { assignedTeacherId: teacher.profileId });
    otherStudent = await makeUser('omar-ali', Role.STUDENT, { assignedTeacherId: teacher.profileId });
    const course = await prisma.course.create({
      data: { slug: 'pre-university-cse', title: 'Pre-University CSE', category: 'Pre-University CSE', level: 'ADVANCED', sessions: 73 },
    });
    courseId = course.id;
    await seedPathwayCurriculum(prisma, courseId, 'pre-university-cse-path');
    await syncStructuredBanks(prisma, quiet);
    assessmentId = (await prisma.assessment.findFirstOrThrow({ where: { lesson: { courseId, order: 9 } } })).id;
  });

  it('seeds nine structured assessments of 45 marks each', async () => {
    const all = await prisma.assessment.findMany({ where: { format: 'STRUCTURED_V1', lesson: { courseId } } });
    expect(all).toHaveLength(9);
    for (const a of all) {
      expect(a.timeLimitMinutes).toBe(STRUCTURED_TIME_LIMIT_MINUTES);
      expect(await prisma.mCQQuestion.count({ where: { assessmentId: a.id } })).toBe(10);
      expect(await prisma.shortAnswerQuestion.count({ where: { assessmentId: a.id } })).toBe(3);
      const practicals = await prisma.practicalQuestion.findMany({ where: { assessmentId: a.id } });
      expect(practicals).toHaveLength(1);
      expect(practicals[0].maxScore).toBe(20);
    }
  });

  it('starts with a deadline that the server freezes, and shows 10 + 3 + 1 tasks', async () => {
    const before = Date.now();
    const attempt = await startFor(student);
    expect(attempt.assessment.format).toBe('STRUCTURED_V1');
    expect(attempt.assessment.totalMarks).toBe(45);
    expect(attempt.questions).toHaveLength(10);
    expect(attempt.structured.shortAnswers).toHaveLength(3);
    expect(attempt.structured.timeLimitMinutes).toBe(40);
    expect(attempt.codingProject.maxScore).toBe(20);
    const deadline = new Date(attempt.deadlineAt).getTime();
    expect(deadline - before).toBeGreaterThanOrEqual(40 * 60_000 - 5000);
    expect(deadline - before).toBeLessThanOrEqual(40 * 60_000 + 5000);
    // The marking guide never reaches the student: criteria names and marks only.
    for (const q of attempt.structured.shortAnswers) {
      expect(q.criteria.length).toBeGreaterThanOrEqual(2);
      expect(JSON.stringify(q)).not.toMatch(/lookFor|modelAnswer/);
    }
    expect(JSON.stringify(attempt.codingProject.rubric)).not.toMatch(/lookFor/);
    // Reopening the test does not move the deadline.
    const again = await post(`/assessments/${assessmentId}/attempts/start`, student, {
      scheduledLessonId: (await prisma.scheduledLesson.findFirstOrThrow({ where: { studentUserId: student.id } })).id,
    });
    expect(new Date(again.body.deadlineAt).getTime()).toBe(deadline);
    const state = await get(`/assessments/attempts/${attempt.id}/state`, student);
    expect(new Date(state.body.deadlineAt).getTime()).toBe(deadline);
  });

  it('autosaves written answers, and refuses a stranger, a foreign question and an essay', async () => {
    const attempt = await startFor(student);
    const q = attempt.structured.shortAnswers[0];
    const saved = await post(`/assessments/attempts/${attempt.id}/short-answers`, student, { questionId: q.id, answer: 'The loop prints 124369.' });
    expect(saved.status).toBe(201);
    expect((await prisma.shortAnswerResponse.findFirstOrThrow({ where: { attemptId: attempt.id, questionId: q.id } })).answer).toBe('The loop prints 124369.');
    const reload = await get(`/assessments/attempts/${attempt.id}`, student);
    expect(reload.body.structured.shortAnswers[0].answer).toBe('The loop prints 124369.');
    expect((await post(`/assessments/attempts/${attempt.id}/short-answers`, otherStudent, { questionId: q.id, answer: 'x' })).status).toBe(403);
    expect((await post(`/assessments/attempts/${attempt.id}/short-answers`, student, { questionId: 'no-such-question', answer: 'x' })).status).toBe(404);
    expect((await post(`/assessments/attempts/${attempt.id}/short-answers`, student, { questionId: q.id, answer: 'x'.repeat(6001) })).status).toBe(400);
    const code = await post(`/assessments/attempts/${attempt.id}/code`, student, { questionId: attempt.codingProject.id, code: 'print("hi")' });
    expect(code.status).toBe(201);
  });

  it('hands in with the final answers and builds a report that waits for the teacher', async () => {
    const attempt = await startFor(student);
    await answerMcq(attempt.id, student, 8);
    const submit = await post(`/assessments/attempts/${attempt.id}/submit`, student, {
      shortAnswers: attempt.structured.shortAnswers.map((q: { id: string }, i: number) => ({ questionId: q.id, answer: `answer ${i + 1}` })),
      practical: [{ questionId: attempt.codingProject.id, code: 'print("done")' }],
    });
    expect(submit.status).toBe(201);
    const report = await prisma.testReport.findUniqueOrThrow({ where: { attemptId: attempt.id } });
    expect(report.status).toBe('PENDING_CODE_EVALUATION');
    expect(report.hasShortAnswers).toBe(true);
    expect(report.objectiveScore).toBe(8);
    expect(report.objectiveMaxScore).toBe(10);
    expect(report.shortAnswerMaxScore).toBe(15);
    expect(report.codingMaxScore).toBe(20);
    expect(report.totalMaxScore).toBe(45);
    expect(report.totalScore).toBeNull();
    const items = report.shortAnswerResults as { answer: string; rubric: { score: number | null }[] }[];
    expect(items.map((i) => i.answer)).toEqual(['answer 1', 'answer 2', 'answer 3']);
    expect(items.every((i) => i.rubric.every((c) => c.score === null))).toBe(true);
    // The student sees a confirmation but no score until the teacher approves.
    const view = await get(`/assessments/attempts/${attempt.id}`, student);
    expect(view.body.result).toBeNull();
    // A second submit is a no-op.
    expect((await post(`/assessments/attempts/${attempt.id}/submit`, student)).status).toBe(201);
    expect(await prisma.testReport.count({ where: { attemptId: attempt.id } })).toBe(1);
  });

  it('refuses answers after the deadline and hands the attempt in as it was saved', async () => {
    const attempt = await startFor(student);
    await post(`/assessments/attempts/${attempt.id}/short-answers`, student, { questionId: attempt.structured.shortAnswers[1].id, answer: 'saved before the end' });
    await prisma.assessmentAttempt.update({
      where: { id: attempt.id },
      data: { deadlineAt: new Date(Date.now() - (STRUCTURED_GRACE_SECONDS + 5) * 1000) },
    });
    const late = await post(`/assessments/attempts/${attempt.id}/short-answers`, student, { questionId: attempt.structured.shortAnswers[1].id, answer: 'typed after the end' });
    expect(late.status).toBe(409);
    const lateSubmit = await post(`/assessments/attempts/${attempt.id}/submit`, student, {
      shortAnswers: [{ questionId: attempt.structured.shortAnswers[1].id, answer: 'sent with the late submit' }],
    });
    expect(lateSubmit.status).toBe(201);
    const report = await prisma.testReport.findUniqueOrThrow({ where: { attemptId: attempt.id } });
    const items = report.shortAnswerResults as { answer: string }[];
    expect(items[1].answer).toBe('saved before the end');
  });

  it('keeps accepting a save during the short grace after the deadline', async () => {
    const attempt = await startFor(student);
    await prisma.assessmentAttempt.update({ where: { id: attempt.id }, data: { deadlineAt: new Date(Date.now() - 5_000) } });
    const res = await post(`/assessments/attempts/${attempt.id}/short-answers`, student, { questionId: attempt.structured.shortAnswers[0].id, answer: 'last second' });
    expect(res.status).toBe(201);
  });

  it('hands in an abandoned attempt when anyone looks at it, and the sweeper does the rest', async () => {
    const lazy = await startFor(student);
    await post(`/assessments/attempts/${lazy.id}/short-answers`, student, { questionId: lazy.structured.shortAnswers[0].id, answer: 'half done' });
    await prisma.assessmentAttempt.update({ where: { id: lazy.id }, data: { deadlineAt: new Date(Date.now() - 120_000) } });
    const view = await get(`/assessments/attempts/${lazy.id}`, student);
    expect(view.status).toBe(200);
    expect(view.body.status).toBe('SUBMITTED');
    expect(await prisma.testReport.count({ where: { attemptId: lazy.id } })).toBe(1);

    const abandoned = await startFor(otherStudent);
    await prisma.assessmentAttempt.update({ where: { id: abandoned.id }, data: { deadlineAt: new Date(Date.now() - 120_000) } });
    const sweeper = app.get(StructuredAttemptSweeper);
    expect(await sweeper.sweep()).toBe(1);
    expect((await prisma.assessmentAttempt.findUniqueOrThrow({ where: { id: abandoned.id } })).status).toBe('SUBMITTED');
    expect(await sweeper.sweep()).toBe(0);
  });

  it('is marked by the teacher criterion by criterion, and released only on approval, without the guide', async () => {
    const attempt = await startFor(student);
    await answerMcq(attempt.id, student, 9);
    await post(`/assessments/attempts/${attempt.id}/submit`, student, {
      shortAnswers: attempt.structured.shortAnswers.map((q: { id: string }) => ({ questionId: q.id, answer: 'a thoughtful answer' })),
      practical: [{ questionId: attempt.codingProject.id, code: 'print(1)' }],
    });
    const reportId = (await prisma.testReport.findUniqueOrThrow({ where: { attemptId: attempt.id } })).id;

    // Not everything is marked yet: approval is refused.
    const early = await post(`/test-reports/${reportId}/approve`, teacher);
    expect(early.status).toBe(400);

    const detail = await get(`/test-reports/${reportId}`, teacher);
    expect(detail.status).toBe(200);
    const items = detail.body.shortAnswers.items as { questionId: string; rubric: { criterion: string; maxPoints: number }[]; modelAnswer: string }[];
    expect(items).toHaveLength(3);
    expect(items[0].modelAnswer.length).toBeGreaterThan(20);

    // Part B: full marks for the first two, and only the first criterion (at most 3) for the third; Part C: 16 of 20.
    const partB = 5 + 5 + Math.min(items[2].rubric[0].maxPoints, 3);
    const shortAnswerMarks = items.map((item, i) => ({
      questionId: item.questionId,
      scores: item.rubric.map((c, j) => ({ criterion: c.criterion, score: i < 2 ? c.maxPoints : j === 0 ? Math.min(c.maxPoints, 3) : 0 })),
      comment: i === 2 ? 'Good start; explain why.' : undefined,
    }));
    const practicalRubric = (detail.body.coding.rubric as { criterion: string; maxPoints: number }[]).map((c, i) => ({
      criterion: c.criterion,
      score: i === 0 ? c.maxPoints - 4 : c.maxPoints,
    }));
    const marked = await patch(`/test-reports/${reportId}`, teacher, { shortAnswerMarks, codingRubricScores: practicalRubric });
    expect(marked.status).toBe(200);
    expect(marked.body.shortAnswers.score).toBe(partB);
    expect(marked.body.coding.score).toBe(16);
    expect(marked.body.totals.totalMax).toBe(45);
    expect(marked.body.totals.total).toBe(9 + partB + 16);

    // A mark above the maximum of a criterion is refused.
    const tooHigh = await patch(`/test-reports/${reportId}`, teacher, {
      shortAnswerMarks: [{ questionId: items[0].questionId, scores: [{ criterion: items[0].rubric[0].criterion, score: items[0].rubric[0].maxPoints + 1 }] }],
    });
    expect(tooHigh.status).toBe(400);

    // The student still sees nothing until the teacher approves.
    expect((await get(`/assessments/attempts/${attempt.id}`, student)).body.result).toBeNull();

    const approved = await post(`/test-reports/${reportId}/approve`, teacher);
    expect(approved.status).toBe(201);
    const released = await get(`/assessments/attempts/${attempt.id}`, student);
    expect(released.body.released).toBe(true);
    expect(released.body.result.total).toBe(9 + partB + 16);
    expect(released.body.result.totalMax).toBe(45);
    expect(released.body.result.shortAnswers.score).toBe(partB);
    expect(released.body.result.shortAnswers.items[2].comment).toBe('Good start; explain why.');
    expect(JSON.stringify(released.body.result)).not.toMatch(/lookFor|modelAnswer/);

    // Reopening takes the result away from the student again.
    const reopened = await post(`/test-reports/${reportId}/reopen`, teacher);
    expect(reopened.status).toBe(201);
    expect((await get(`/assessments/attempts/${attempt.id}`, student)).body.result).toBeNull();
  });
});
