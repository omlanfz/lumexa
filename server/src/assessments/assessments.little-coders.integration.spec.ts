// The Little Coders assessment, end to end over HTTP against a REAL Postgres: a student takes the
// 40-mark assessment (10 MCQs, 5 True/False, a practical project handed in as links and files), the
// files go to the private homework bucket under their own `assessments/` prefix, the teacher opens
// them while the review is pending, and once the teacher approves the report (the final score is
// saved) they are removed — never before, never anything else. The bucket is an in-memory stand-in
// (MemoryHomeworkStorage) that can be told to fail, so the failure and retry paths are exercised.
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
process.env.JWT_SECRET = 'little-coders-assessment-secret';
process.env.FRONTEND_URL = 'https://lumexa-one.vercel.app';
delete process.env.SMTP_USER;
delete process.env.SMTP_PASS;

import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { AssessmentFileStatus, ClassType, Role } from '@prisma/client';
import request from 'supertest';
import { JwtStrategy } from '../auth/jwt.strategy';
import { EmailModule } from '../email/email.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma.module';
import { PrismaService } from '../prisma.service';
import { HOMEWORK_STORAGE } from '../submissions/homework-files.service';
import { MemoryHomeworkStorage } from '../submissions/testing/memory-homework-storage';
import { ensureLittleCodersCurriculum } from '../little-coders/migrate/little-coders.migrate';
import { syncLittleCodersBanks } from '../little-coders/assessments/lc-bank.sync';
import {
  LC_FILE_LIMITS,
  LC_RUBRIC_STANDARD,
} from '../little-coders/lc.constants';
import { AssessmentsModule } from './assessments.module';
import {
  AssessmentFilesService,
  isAssessmentKey,
} from './assessment-files.service';

const describeDb = IT_DB_URL ? describe : describe.skip;
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
  options: string[];
  selectedIndex: number | null;
}

const SB3 = Buffer.from('PK\u0003\u0004 pretend this is a Stretch3 project');
const PY = Buffer.from('print("Hello, Mars!")\n');
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);

describeDb(
  'Little Coders assessment: practical files and their lifecycle (real Postgres, over HTTP)',
  () => {
    jest.setTimeout(240_000);

    let app: INestApplication;
    let prisma: PrismaService;
    let jwt: JwtService;
    let storage: MemoryHomeworkStorage;
    let files: AssessmentFilesService;
    let release: () => void;

    let teacher: Person;
    let otherTeacher: Person;
    let student: Person;
    let otherStudent: Person;
    let admin: Person;
    let courseId: string;
    let testAssessmentId: string;
    let finalAssessmentId: string;
    let testClassId: string; // student · course 1 assessment (class 9)
    let finalClassId: string; // student · final assessment (class 46)
    let otherClassId: string; // otherStudent · course 1 assessment

    const bearer = (p: Person) => ({
      Authorization: `Bearer ${jwt.sign({ sub: p.id, email: p.email, role: p.role })}`,
    });
    const http = () => request(app.getHttpServer());
    const get = (path: string, who: Person) =>
      http().get(path).set(bearer(who));
    const post = (path: string, who: Person, body: object = {}) =>
      http().post(path).set(bearer(who)).send(body);
    const patch = (path: string, who: Person, body: object = {}) =>
      http().patch(path).set(bearer(who)).send(body);
    const del = (path: string, who: Person) =>
      http().delete(path).set(bearer(who));
    const upload = (
      attemptId: string,
      who: Person,
      parts: { name: string; body: Buffer }[],
    ) => {
      const req = http()
        .post(`/assessments/attempts/${attemptId}/files`)
        .set(bearer(who));
      for (const p of parts)
        req.attach('files', p.body, {
          filename: p.name,
          contentType: 'application/octet-stream',
        });
      return req;
    };

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
      const profileId =
        role === Role.TEACHER
          ? (await prisma.teacherProfile.create({ data: { userId: user.id } }))
              .id
          : undefined;
      return { id: user.id, email: user.email, role, profileId };
    }

    async function makeClass(who: Person, by: Person, order: number) {
      const lesson = await prisma.lesson.findFirstOrThrow({
        where: { courseId, order },
      });
      const start = new Date(Date.now() + 5 * 60_000);
      return (
        await prisma.scheduledLesson.create({
          data: {
            studentUserId: who.id,
            teacherId: by.profileId!,
            courseId,
            lessonNumber: order,
            lessonId: lesson.id,
            start,
            end: new Date(start.getTime() + 60 * 60_000),
            classType: ClassType.ONE_TO_ONE,
            status: 'UPCOMING',
          },
        })
      ).id;
    }

    async function buildWorld() {
      await truncateAssessmentData(prisma);
      storage.objects.clear();
      storage.deleted = [];
      storage.failDelete = false;
      storage.failPut.clear();
      storage.configured = true;
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
          slug: 'little-coders',
          title: 'Little Coders',
          category: 'Little Coders',
          level: 'BEGINNER',
          sessions: 28,
        },
      });
      courseId = course.id;
      await ensureLittleCodersCurriculum(prisma, quiet);
      await syncLittleCodersBanks(prisma, quiet);
      testAssessmentId = (
        await prisma.assessment.findFirstOrThrow({
          where: { lesson: { courseId, order: 9 } },
        })
      ).id;
      finalAssessmentId = (
        await prisma.assessment.findFirstOrThrow({
          where: { lesson: { courseId, order: 46 } },
        })
      ).id;
      testClassId = await makeClass(student, teacher, 9);
      finalClassId = await makeClass(student, teacher, 46);
      otherClassId = await makeClass(otherStudent, otherTeacher, 9);
    }

    const start = (assessmentId: string, classId: string, who = student) =>
      post(`/assessments/${assessmentId}/attempts/start`, who, {
        scheduledLessonId: classId,
      });

    async function startTest(
      classId = testClassId,
      assessmentId = testAssessmentId,
      who = student,
    ) {
      const res = await start(assessmentId, classId, who);
      expect(res.status).toBe(201);
      return res.body as {
        id: string;
        questions: ApiQuestion[];
        codingProject: {
          id: string;
          lc: {
            spec: any;
            platform: any;
            files: any[];
            links: string[];
            limits: any;
          };
        };
        assessment: any;
      };
    }

    /** Answers every question the way an oracle would (read from the database): `right` correct, the rest wrong. */
    async function answerAll(attemptId: string, who: Person, right: number) {
      const rows = await prisma.mCQAnswer.findMany({
        where: { attemptId },
        include: { question: true },
      });
      let n = 0;
      for (const r of rows) {
        const options = r.question.options as string[];
        const rightPos = r.optionOrder.indexOf(r.question.correctIndex);
        const wrongPos = [...Array(options.length).keys()].find(
          (i) => i !== rightPos,
        )!;
        const res = await post(
          `/assessments/attempts/${attemptId}/answers`,
          who,
          {
            questionId: r.questionId,
            selectedIndex: n++ < right ? rightPos : wrongPos,
          },
        );
        expect(res.status).toBe(201);
      }
    }

    /** A finished, submitted attempt with a link, a note and two files. */
    async function submittedAttempt(
      over: { right?: number; classId?: string } = {},
    ) {
      const started = await startTest(over.classId);
      const attemptId = started.id;
      await answerAll(attemptId, student, over.right ?? 12);
      const saved = await post(
        `/assessments/attempts/${attemptId}/practical`,
        student,
        {
          questionId: started.codingProject.id,
          links: ['https://scratch.mit.edu/projects/123456789/'],
          note: 'My rocket launches when I press space!',
        },
      );
      expect(saved.status).toBe(201);
      const up = await upload(attemptId, student, [
        { name: 'rocket.sb3', body: SB3 },
        { name: 'rocket.py', body: PY },
      ]);
      expect(up.status).toBe(201);
      const submitted = await post(
        `/assessments/attempts/${attemptId}/submit`,
        student,
      );
      expect(submitted.status).toBe(201);
      const report = await prisma.testReport.findUniqueOrThrow({
        where: { attemptId },
      });
      const rows = await prisma.assessmentFile.findMany({
        where: { attemptId },
        orderBy: { createdAt: 'asc' },
      });
      return { attemptId, reportId: report.id, started, rows };
    }

    const markEverything = (reportId: string, scores = [8, 5, 4, 2, 1]) =>
      patch(`/test-reports/${reportId}`, teacher, {
        codingRubricScores: LC_RUBRIC_STANDARD.map((r, i) => ({
          criterion: r.criterion,
          score: scores[i],
        })),
      });

    beforeAll(async () => {
      release = await acquireDatabaseLock(IT_DB_URL as string);
      jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
      jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
      storage = new MemoryHomeworkStorage();
      const moduleRef = await Test.createTestingModule({
        imports: [
          PrismaModule,
          EmailModule,
          NotificationsModule,
          PassportModule,
          AssessmentsModule,
        ],
        providers: [JwtStrategy],
      })
        .overrideProvider(HOMEWORK_STORAGE)
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
      await app.listen(0);
      prisma = moduleRef.get(PrismaService);
      files = moduleRef.get(AssessmentFilesService);
      jwt = new JwtService({ secret: process.env.JWT_SECRET });
    }, 240_000);
    afterAll(async () => {
      await app?.close();
      release?.();
    });
    beforeEach(async () => {
      await buildWorld();
    });

    // ═════════════════════════════════════════════════════════════════════════
    describe('starting the assessment', () => {
      it('gives 10 multiple-choice then 5 True/False, the standard header and the practical brief — and no answer key', async () => {
        const t = await startTest();
        const qs = t.questions;
        expect(qs).toHaveLength(15);
        expect(
          qs
            .slice(0, 10)
            .every((q) => q.kind === 'MCQ' && q.options.length === 4),
        ).toBe(true);
        expect(
          qs
            .slice(10)
            .every(
              (q) =>
                q.kind === 'TRUE_FALSE' && q.options.join() === 'True,False',
            ),
        ).toBe(true);
        expect(t.assessment).toMatchObject({
          format: 'LITTLE_CODERS_V2',
          questionCount: 15,
          mcqCount: 10,
          trueFalseCount: 5,
          totalMarks: 40,
          hasCodingProject: true,
          lc: {
            brand: 'LUMEXA · LITTLE CODERS',
            title: 'Course Assessment',
            minutes: 40,
            marks: 40,
            negativeMarking: false,
          },
        });
        expect(
          t.assessment.lc.sections.map((s: any) => [s.key, s.marks, s.minutes]),
        ).toEqual([
          ['mcq', 10, 10],
          ['trueFalse', 5, 5],
          ['practical', 25, 20],
          ['review', null, 5],
        ]);

        // The practical the student sees: brief, blocks to find, requirements — Stretch3 for course 1.
        const lc = t.codingProject.lc;
        expect(lc.spec.platform).toBe('STRETCH3');
        expect(lc.spec.brief.length).toBeGreaterThanOrEqual(2);
        expect(lc.spec.blocks.length).toBeGreaterThanOrEqual(2);
        expect(lc.spec.requirements.length).toBeGreaterThanOrEqual(4);
        expect(lc.platform).toMatchObject({
          key: 'STRETCH3',
          startUrl: 'https://stretch3.github.io/',
          isActive: true,
        });
        expect(lc.limits).toMatchObject({
          maxFiles: LC_FILE_LIMITS.maxFiles,
          maxLinks: LC_FILE_LIMITS.maxLinks,
        });
        expect(
          (t.codingProject as any).rubric.map((r: any) => r.maxPoints),
        ).toEqual([10, 6, 5, 3, 1]);

        // Nothing a student must not see: keys, explanations, the marking guide, admin bookkeeping.
        const json = JSON.stringify(t);
        expect(json).not.toContain('correctIndex');
        expect(json).not.toContain('isCorrect');
        expect(json).not.toContain('explanation');
        expect(json).not.toContain('lookFor');
        expect(json).not.toContain('adminEdited');
        expect(json).not.toContain('LC2:');
      });

      it('resuming returns the very same attempt, and two tabs share one attempt', async () => {
        const [a, b] = await Promise.all([
          start(testAssessmentId, testClassId),
          start(testAssessmentId, testClassId),
        ]);
        expect([a.status, b.status]).toEqual([201, 201]);
        expect(a.body.id).toBe(b.body.id);
        expect(
          await prisma.assessmentAttempt.count({
            where: { scheduledLessonId: testClassId },
          }),
        ).toBe(1);
      });

      it('the student cannot read the answer key later either (checked before release)', async () => {
        const t = await startTest();
        const res = await get(`/assessments/attempts/${t.id}`, student);
        expect(res.status).toBe(200);
        expect(JSON.stringify(res.body)).not.toContain('correctIndex');
        expect(JSON.stringify(res.body)).not.toContain('lookFor');
      });

      it('the final assessment gives the Scratch / AI practical by default, the Python one when an admin chooses it', async () => {
        const first = await startTest(finalClassId, finalAssessmentId);
        expect(first.codingProject.lc.spec).toMatchObject({
          variant: 'SCRATCH_AI',
          platform: 'STRETCH3',
        });

        // A second learner's class, after the admin switches the final to Python.
        const another = await makeUser('zoya-khan', Role.STUDENT, {
          assignedTeacherId: teacher.profileId,
        });
        const anotherClass = await makeClass(another, teacher, 46);
        expect(
          (
            await patch(`/assessments/${finalAssessmentId}/variant`, teacher, {
              variant: 'PYTHON',
            })
          ).status,
        ).toBe(403);
        const set = await patch(
          `/assessments/${finalAssessmentId}/variant`,
          admin,
          { variant: 'PYTHON' },
        );
        expect(set.status).toBe(200);
        const python = await startTest(
          anotherClass,
          finalAssessmentId,
          another,
        );
        expect(python.codingProject.lc.spec).toMatchObject({
          variant: 'PYTHON',
          platform: 'EDUBLOCKS',
        });
        // The learner who had already started keeps the version they were given.
        const again = await get(`/assessments/attempts/${first.id}`, student);
        expect(again.body.codingProject.lc.spec.variant).toBe('SCRATCH_AI');

        // A class can be set apart from the default.
        const third = await makeUser('ravi-das', Role.STUDENT, {
          assignedTeacherId: teacher.profileId,
        });
        const thirdClass = await makeClass(third, teacher, 46);
        expect(
          (
            await patch(
              `/assessments/scheduled-lessons/${thirdClass}/variant`,
              teacher,
              { variant: 'SCRATCH_AI' },
            )
          ).status,
        ).toBe(403);
        expect(
          (
            await patch(
              `/assessments/scheduled-lessons/${thirdClass}/variant`,
              admin,
              { variant: 'SCRATCH_AI' },
            )
          ).status,
        ).toBe(200);
        const override = await startTest(thirdClass, finalAssessmentId, third);
        expect(override.codingProject.lc.spec.variant).toBe('SCRATCH_AI');
      });
    });

    // ═════════════════════════════════════════════════════════════════════════
    describe('handing in the project: links, note and files', () => {
      it('saves https links and a note, and refuses anything else', async () => {
        const t = await startTest();
        const q = t.codingProject.id;
        const ok = await post(
          `/assessments/attempts/${t.id}/practical`,
          student,
          {
            questionId: q,
            links: [
              'https://scratch.mit.edu/projects/1/',
              'https://stretch3.github.io/#abc',
            ],
            note: 'hello',
          },
        );
        expect(ok.status).toBe(201);
        expect(ok.body).toMatchObject({
          saved: true,
          links: [
            'https://scratch.mit.edu/projects/1/',
            'https://stretch3.github.io/#abc',
          ],
          note: 'hello',
        });
        for (const bad of [
          'http://scratch.mit.edu/p/1',
          'javascript:alert(1)',
          'not a link',
        ]) {
          const res = await post(
            `/assessments/attempts/${t.id}/practical`,
            student,
            { questionId: q, links: [bad] },
          );
          expect(res.status).toBe(400);
        }
        const tooMany = await post(
          `/assessments/attempts/${t.id}/practical`,
          student,
          {
            questionId: q,
            links: Array.from(
              { length: LC_FILE_LIMITS.maxLinks + 1 },
              (_, i) => `https://a.org/${i}`,
            ),
          },
        );
        expect(tooMany.status).toBe(400);
        // Unknown fields are refused by the global validation pipe.
        expect(
          (
            await post(`/assessments/attempts/${t.id}/practical`, student, {
              questionId: q,
              links: [],
              extra: 1,
            })
          ).status,
        ).toBe(400);
        // The last good save is what is kept.
        const read = await get(`/assessments/attempts/${t.id}`, student);
        expect(read.body.codingProject.lc.links).toEqual([
          'https://scratch.mit.edu/projects/1/',
          'https://stretch3.github.io/#abc',
        ]);
      });

      it('only the student whose attempt it is can save to it, and not for a practical of another test', async () => {
        const t = await startTest();
        const other = await post(
          `/assessments/attempts/${t.id}/practical`,
          otherStudent,
          { questionId: t.codingProject.id, links: [] },
        );
        expect(other.status).toBe(403);
        const wrongQuestion = await post(
          `/assessments/attempts/${t.id}/practical`,
          student,
          { questionId: 'nope', links: [] },
        );
        expect(wrongQuestion.status).toBe(404);
      });

      it('stores uploaded files in the private bucket under assessments/little-coders/<assessment>/<student>/<attempt>/ and records them', async () => {
        const t = await startTest();
        const res = await upload(t.id, student, [
          { name: 'rocket.sb3', body: SB3 },
          { name: 'shot.png', body: PNG },
        ]);
        expect(res.status).toBe(201);
        expect(
          res.body.map((f: any) => [f.name, f.size, f.status, f.removed]),
        ).toEqual([
          ['rocket.sb3', SB3.length, 'UPLOADED', false],
          ['shot.png', PNG.length, 'UPLOADED', false],
        ]);
        const rows = await prisma.assessmentFile.findMany({
          where: { attemptId: t.id },
        });
        expect(rows).toHaveLength(2);
        for (const row of rows) {
          expect(
            row.objectKey.startsWith(
              `assessments/little-coders/${testAssessmentId}/${student.id}/${t.id}/`,
            ),
          ).toBe(true);
          expect(isAssessmentKey(row.objectKey)).toBe(true);
          expect(storage.objects.has(row.objectKey)).toBe(true);
          expect(row).toMatchObject({
            assessmentId: testAssessmentId,
            studentUserId: student.id,
            programKey: 'little-coders',
            status: 'UPLOADED',
          });
        }
        // The browser never receives a storage address or key.
        expect(JSON.stringify(res.body)).not.toMatch(
          /assessments\/|r2\.test|objectKey/,
        );
      });

      it('refuses what must not be stored — and stores nothing at all when any file is refused', async () => {
        const t = await startTest();
        const refused = async (
          parts: { name: string; body: Buffer }[],
          status: number,
        ) => {
          const res = await upload(t.id, student, parts);
          expect(res.status).toBe(status);
          expect(
            await prisma.assessmentFile.count({ where: { attemptId: t.id } }),
          ).toBe(0);
          expect(storage.objects.size).toBe(0);
          return res;
        };
        await refused([{ name: 'virus.exe', body: SB3 }], 400); // not an allowed kind
        await refused([{ name: 'empty.sb3', body: Buffer.alloc(0) }], 400);
        await refused(
          [{ name: 'fake.png', body: Buffer.from('this is not a png') }],
          400,
        ); // disguised
        await refused(
          [
            { name: 'ok.sb3', body: SB3 },
            { name: 'bad.exe', body: SB3 },
          ],
          400,
        ); // one bad file refuses all
        await refused(
          [
            {
              name: 'huge.sb3',
              body: Buffer.alloc(LC_FILE_LIMITS.maxFileBytes + 1024),
            },
          ],
          413,
        );
        await refused(
          Array.from({ length: LC_FILE_LIMITS.maxFiles + 1 }, (_, i) => ({
            name: `f${i}.py`,
            body: PY,
          })),
          400,
        );
      });

      it('keeps to the limits across several uploads', async () => {
        const t = await startTest();
        for (let i = 0; i < LC_FILE_LIMITS.maxFiles; i++) {
          expect(
            (await upload(t.id, student, [{ name: `f${i}.py`, body: PY }]))
              .status,
          ).toBe(201);
        }
        const over = await upload(t.id, student, [
          { name: 'one-too-many.py', body: PY },
        ]);
        expect(over.status).toBe(409);
        expect(over.body.message).toMatch(/up to 8 files/);
      });

      it('only the owner can upload to an attempt', async () => {
        const t = await startTest();
        expect(
          (await upload(t.id, otherStudent, [{ name: 'x.py', body: PY }]))
            .status,
        ).toBe(403);
        expect(
          (await upload(t.id, teacher, [{ name: 'x.py', body: PY }])).status,
        ).toBe(403);
      });

      it('a storage failure fails the whole upload cleanly: nothing is recorded or kept', async () => {
        const t = await startTest();
        storage.failPut.add('*');
        const res = await upload(t.id, student, [
          { name: 'a.py', body: PY },
          { name: 'b.py', body: PY },
        ]);
        expect(res.status).toBe(502);
        expect(res.body.message).toMatch(/Nothing was handed in/);
        expect(
          await prisma.assessmentFile.count({ where: { attemptId: t.id } }),
        ).toBe(0);
        expect(storage.objects.size).toBe(0);
      });

      it('says plainly when the bucket is not configured, so the student can share a link instead', async () => {
        const t = await startTest();
        storage.configured = false;
        const res = await upload(t.id, student, [{ name: 'a.py', body: PY }]);
        expect(res.status).toBe(503);
        expect(res.body.message).toMatch(/share a link/i);
      });

      it('lets the student take a file back before submitting — and removes it from storage', async () => {
        const t = await startTest();
        const up = await upload(t.id, student, [
          { name: 'a.py', body: PY },
          { name: 'b.py', body: PY },
        ]);
        const [a, b] = up.body as { id: string }[];
        const rowA = await prisma.assessmentFile.findUniqueOrThrow({
          where: { id: a.id },
        });
        const res = await del(
          `/assessments/attempts/${t.id}/files/${a.id}`,
          student,
        );
        expect(res.status).toBe(200);
        expect(res.body.map((f: any) => f.id)).toEqual([b.id]);
        expect(storage.objects.has(rowA.objectKey)).toBe(false);
        expect(
          await prisma.assessmentFile.findUniqueOrThrow({
            where: { id: a.id },
          }),
        ).toMatchObject({
          status: 'DELETED',
          deleteReason: 'REMOVED_BY_STUDENT',
        });
        // Someone else's attempt, or a file that is not part of this attempt, is refused.
        expect(
          (
            await del(
              `/assessments/attempts/${t.id}/files/${b.id}`,
              otherStudent,
            )
          ).status,
        ).toBe(403);
        expect(
          (await del(`/assessments/attempts/${t.id}/files/nope`, student))
            .status,
        ).toBe(404);
      });
    });

    // ═════════════════════════════════════════════════════════════════════════
    describe('submitting', () => {
      it('hands in the project: files become part of the submission, the objective part is graded, the practical waits for the teacher', async () => {
        const { attemptId, reportId, rows } = await submittedAttempt({
          right: 12,
        });

        expect(rows).toHaveLength(2);
        expect(
          rows.every((r) => r.status === 'ATTACHED' && r.attachedAt !== null),
        ).toBe(true);
        expect(rows.every((r) => storage.objects.has(r.objectKey))).toBe(true);

        const attempt = await prisma.assessmentAttempt.findUniqueOrThrow({
          where: { id: attemptId },
        });
        expect(attempt.status).toBe('SUBMITTED');
        const report = await prisma.testReport.findUniqueOrThrow({
          where: { id: reportId },
        });
        // 12 of the 15 objective questions were answered right (10 MCQs then the True/False).
        expect(report).toMatchObject({
          status: 'PENDING_CODE_EVALUATION',
          hasCodingProject: true,
          mcqTotal: 10,
          trueFalseTotal: 5,
          objectiveScore: 12,
          objectiveMaxScore: 15,
          codingMaxScore: 25,
          totalMaxScore: 40,
          totalScore: null,
          percentage: null,
        });
        // The report freezes what was handed in (the names stay when the files are later removed).
        const project = report.codingProject as any;
        expect(project.submission.links).toEqual([
          'https://scratch.mit.edu/projects/123456789/',
        ]);
        expect(project.submission.note).toBe(
          'My rocket launches when I press space!',
        );
        expect(project.submission.files.map((f: any) => f.name)).toEqual([
          'rocket.sb3',
          'rocket.py',
        ]);
        expect(project.spec.platform).toBe('STRETCH3');
        expect(
          (report.codingRubricScores as any[]).map((r) => [
            r.maxPoints,
            r.score,
          ]),
        ).toEqual([
          [10, null],
          [6, null],
          [5, null],
          [3, null],
          [1, null],
        ]);
      });

      it('submitting twice changes nothing: one report, the same files', async () => {
        const { attemptId } = await submittedAttempt();
        const again = await post(
          `/assessments/attempts/${attemptId}/submit`,
          student,
        );
        expect(again.status).toBe(201);
        expect(await prisma.testReport.count({ where: { attemptId } })).toBe(1);
        expect(
          await prisma.assessmentFile.count({
            where: { attemptId, status: 'ATTACHED' },
          }),
        ).toBe(2);
      });

      it('after submitting, nothing about the project can be changed', async () => {
        const { attemptId, started, rows } = await submittedAttempt();
        expect(
          (await upload(attemptId, student, [{ name: 'late.py', body: PY }]))
            .status,
        ).toBe(409);
        expect(
          (
            await del(
              `/assessments/attempts/${attemptId}/files/${rows[0].id}`,
              student,
            )
          ).status,
        ).toBe(409);
        expect(
          (
            await post(
              `/assessments/attempts/${attemptId}/practical`,
              student,
              {
                questionId: started.codingProject.id,
                links: ['https://x.org/late'],
              },
            )
          ).status,
        ).toBe(409);
        expect(
          await prisma.assessmentFile.count({ where: { attemptId } }),
        ).toBe(2);
      });

      it('refuses to submit a file that never finished uploading, and says which', async () => {
        const t = await startTest();
        await answerAll(t.id, student, 5);
        const up = await upload(t.id, student, [
          { name: 'half.sb3', body: SB3 },
        ]);
        const row = await prisma.assessmentFile.findUniqueOrThrow({
          where: { id: up.body[0].id },
        });
        storage.objects.delete(row.objectKey); // the bytes never arrived
        const res = await post(`/assessments/attempts/${t.id}/submit`, student);
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/half\.sb3.*did not finish uploading/);
        expect(
          (
            await prisma.assessmentAttempt.findUniqueOrThrow({
              where: { id: t.id },
            })
          ).status,
        ).toBe('IN_PROGRESS');
      });

      it('the teacher’s "Lock & submit" hands in whatever was saved, files included', async () => {
        const t = await startTest();
        await upload(t.id, student, [{ name: 'rocket.sb3', body: SB3 }]);
        await post(`/assessments/attempts/${t.id}/practical`, student, {
          questionId: t.codingProject.id,
          links: ['https://scratch.mit.edu/projects/7/'],
        });
        const res = await post(
          `/assessments/scheduled-lessons/${testClassId}/lock`,
          teacher,
        );
        expect(res.status).toBe(201);
        expect(
          (
            await prisma.assessmentAttempt.findUniqueOrThrow({
              where: { id: t.id },
            })
          ).status,
        ).toBe('SUBMITTED');
        const report = await prisma.testReport.findUniqueOrThrow({
          where: { attemptId: t.id },
        });
        expect((report.codingProject as any).submission).toMatchObject({
          links: ['https://scratch.mit.edu/projects/7/'],
          files: [{ name: 'rocket.sb3' }],
        });
        expect(
          await prisma.assessmentFile.count({
            where: { attemptId: t.id, status: 'ATTACHED' },
          }),
        ).toBe(1);
      });

      it('shows the class monitor that a project has been started (a link or a file counts)', async () => {
        const t = await startTest();
        const before = await get(
          `/assessments/scheduled-lessons/${testClassId}/class-status`,
          teacher,
        );
        expect(
          before.body.students.find((s: any) => s.attempt)?.attempt.codingSaved,
        ).toBe(false);
        await upload(t.id, student, [{ name: 'rocket.sb3', body: SB3 }]);
        const after = await get(
          `/assessments/scheduled-lessons/${testClassId}/class-status`,
          teacher,
        );
        expect(
          after.body.students.find((s: any) => s.attempt)?.attempt.codingSaved,
        ).toBe(true);
        expect(after.body.assessment).toMatchObject({
          format: 'LITTLE_CODERS_V2',
          meetsStandard: true,
          counts: { mcq: 10, trueFalse: 5, practical: 1 },
        });
      });

      it('a file that arrived while the attempt was being submitted is picked up by the clean-up sweep', async () => {
        const { attemptId } = await submittedAttempt();
        const stray = await prisma.assessmentFile.create({
          data: {
            attemptId,
            assessmentId: testAssessmentId,
            studentUserId: student.id,
            programKey: 'little-coders',
            objectKey: `assessments/little-coders/${testAssessmentId}/${student.id}/${attemptId}/stray-late.py`,
            originalName: 'late.py',
            contentType: 'text/plain',
            sizeBytes: 3,
            status: 'UPLOADED',
            createdAt: new Date(Date.now() - 10 * 60_000),
          },
        });
        const swept = await files.runSweep();
        expect(swept.recovered).toBe(1);
        expect(
          (
            await prisma.assessmentFile.findUniqueOrThrow({
              where: { id: stray.id },
            })
          ).status,
        ).toBe('ATTACHED');
      });
    });

    // ═════════════════════════════════════════════════════════════════════════
    describe('the teacher reviews the project', () => {
      it('sees what was handed in — links, note, files and the brief — in the teacher dashboard list and report', async () => {
        const { reportId, rows } = await submittedAttempt();

        const list = await get('/test-reports?status=PENDING', teacher);
        expect(list.status).toBe(200);
        expect(list.body).toHaveLength(1);
        expect(list.body[0]).toMatchObject({
          id: reportId,
          status: 'PENDING_CODE_EVALUATION',
          littleCoders: true,
          typeLabel: 'Course Assessment',
          needsAction: true,
          hasCodingProject: true,
        });

        const res = await get(`/test-reports/${reportId}`, teacher);
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({
          littleCoders: true,
          typeLabel: 'Course Assessment',
          objective: { score: 12, max: 15 },
        });
        const lc = res.body.coding.lc;
        expect(lc.links).toEqual([
          'https://scratch.mit.edu/projects/123456789/',
        ]);
        expect(lc.note).toBe('My rocket launches when I press space!');
        expect(lc.files.map((f: any) => [f.name, f.kind, f.removed])).toEqual([
          ['rocket.sb3', 'DOWNLOAD', false],
          ['rocket.py', 'SOURCE', false],
        ]);
        expect(lc.filesRemoved).toBe(false);
        expect(lc.spec).toMatchObject({ platform: 'STRETCH3' });
        expect(lc.spec).not.toHaveProperty('adminEdited');
        expect(
          res.body.coding.rubric.map((r: any) => [r.maxPoints, r.score]),
        ).toEqual([
          [10, null],
          [6, null],
          [5, null],
          [3, null],
          [1, null],
        ]);
        expect(rows.map((r) => r.id)).toEqual(lc.files.map((f: any) => f.id));
        // No storage address or key is ever sent to the browser.
        expect(JSON.stringify(res.body)).not.toMatch(
          /objectKey|assessments\/little-coders/,
        );
      });

      it('only the class’s teacher, the student’s teacher or an admin can see the report and its files', async () => {
        const { reportId, rows } = await submittedAttempt();
        expect(
          (await get(`/test-reports/${reportId}`, otherTeacher)).status,
        ).toBe(404);
        expect((await get(`/test-reports/${reportId}`, student)).status).toBe(
          403,
        );
        expect(
          (await get(`/assessments/files/${rows[0].id}/access`, otherTeacher))
            .status,
        ).toBe(403);
        expect(
          (await get(`/assessments/files/${rows[0].id}/access`, otherStudent))
            .status,
        ).toBe(403);
        expect(
          (await get(`/assessments/files/${rows[0].id}/access`, teacher))
            .status,
        ).toBe(200);
        expect(
          (await get(`/assessments/files/${rows[0].id}/access`, admin)).status,
        ).toBe(200);
        expect(
          (await get(`/assessments/files/${rows[0].id}/access`, student))
            .status,
        ).toBe(200); // their own file
        expect((await get('/test-reports', otherTeacher)).body).toHaveLength(0);
      });

      it('opens a project file with a short-lived signed link, and shows code as text in the viewer — never running it', async () => {
        const { rows } = await submittedAttempt();
        const sb3 = rows.find((r) => r.originalName === 'rocket.sb3')!;
        const py = rows.find((r) => r.originalName === 'rocket.py')!;

        const open = await get(`/assessments/files/${sb3.id}/access`, teacher);
        expect(open.status).toBe(200);
        expect(open.headers['cache-control']).toBe('no-store');
        expect(open.body).toMatchObject({
          kind: 'DOWNLOAD',
          name: 'rocket.sb3',
        });
        expect(open.body.url).toContain(sb3.objectKey);
        expect(decodeURIComponent(open.body.url)).toContain('attachment');
        expect(new Date(open.body.expiresAt).getTime()).toBeGreaterThan(
          Date.now(),
        );

        const code = await get(`/assessments/files/${py.id}/access`, teacher);
        expect(code.body).toMatchObject({
          kind: 'SOURCE',
          viewerPath: `/homework-viewer/${py.id}?scope=assessment`,
        });
        const text = await get(`/assessments/files/${py.id}/text`, teacher);
        expect(text.status).toBe(200);
        expect(text.headers['x-content-type-options']).toBe('nosniff');
        expect(text.body).toMatchObject({
          name: 'rocket.py',
          kind: 'SOURCE',
          text: 'print("Hello, Mars!")\n',
        });
        // A project file is a download, not text.
        expect(
          (await get(`/assessments/files/${sb3.id}/text`, teacher)).status,
        ).toBe(400);
      });

      it('opening, previewing and downloading never delete or change a file, however many times', async () => {
        const { rows } = await submittedAttempt();
        for (let i = 0; i < 3; i++) {
          for (const r of rows) {
            expect(
              (await get(`/assessments/files/${r.id}/access`, teacher)).status,
            ).toBe(200);
            expect(
              (
                await get(
                  `/assessments/files/${r.id}/access?download=1`,
                  teacher,
                )
              ).status,
            ).toBe(200);
          }
          expect(
            (await get(`/assessments/files/${rows[1].id}/text`, teacher))
              .status,
          ).toBe(200);
        }
        const after = await prisma.assessmentFile.findMany({
          where: { attemptId: rows[0].attemptId },
        });
        expect(
          after.every(
            (r) =>
              r.status === 'ATTACHED' &&
              r.deleteRequestedAt === null &&
              r.deletedAt === null,
          ),
        ).toBe(true);
        expect(rows.every((r) => storage.objects.has(r.objectKey))).toBe(true);
        expect(storage.deleted).toEqual([]);
      });

      it('marking the practical (even completely) or writing feedback does not remove anything: the files stay until the review is approved', async () => {
        const { reportId, rows } = await submittedAttempt();
        const marked = await markEverything(reportId);
        expect(marked.status).toBe(200);
        expect(marked.body).toMatchObject({
          status: 'PENDING_REVIEW',
          coding: { score: 20, max: 25 },
          totals: { total: 32, totalMax: 40, percentage: 80 },
        });
        const noted = await patch(`/test-reports/${reportId}`, teacher, {
          feedback: 'Great rocket!',
          codingFeedback: 'Try a countdown next time.',
        });
        expect(noted.status).toBe(200);
        expect(rows.every((r) => storage.objects.has(r.objectKey))).toBe(true);
        expect(
          await prisma.assessmentFile.count({
            where: { attemptId: rows[0].attemptId, status: 'ATTACHED' },
          }),
        ).toBe(2);
        expect(storage.deleted).toEqual([]);
      });
    });

    // ═════════════════════════════════════════════════════════════════════════
    describe('finalising the review: the files are removed — and only these', () => {
      /** Objects that are NOT this workflow's: a homework file, a class recording, another student's project file. */
      async function bystanders(
        other: { attemptId: string; rows: { objectKey: string }[] } | null,
      ) {
        const keys = [
          'homework/some-course/some-student/file-1/essay.pdf',
          'recordings/class-1/segment-1.webm',
          'assessments/little-coders/other-assessment/other-student/other-attempt/keep-1-x.py',
        ];
        for (const k of keys)
          storage.objects.set(k, {
            body: Buffer.from('keep me'),
            contentType: 'application/octet-stream',
          });
        return [...keys, ...(other?.rows.map((r) => r.objectKey) ?? [])];
      }

      it('approving the report stores the final score, then deletes the attempt’s files from storage and marks them DELETED', async () => {
        const first = await submittedAttempt();
        // Another student's submitted project in the same assessment.
        const otherStarted = await startTest(
          otherClassId,
          testAssessmentId,
          otherStudent,
        );
        await answerAll(otherStarted.id, otherStudent, 3);
        await upload(otherStarted.id, otherStudent, [
          { name: 'omar.sb3', body: SB3 },
        ]);
        await post(
          `/assessments/attempts/${otherStarted.id}/submit`,
          otherStudent,
        );
        const otherRows = await prisma.assessmentFile.findMany({
          where: { attemptId: otherStarted.id },
        });
        const keep = await bystanders({
          attemptId: otherStarted.id,
          rows: otherRows,
        });

        await markEverything(first.reportId);
        const approved = await post(
          `/test-reports/${first.reportId}/approve`,
          teacher,
        );
        expect(approved.status).toBe(201);

        // The score is stored...
        expect(approved.body).toMatchObject({
          status: 'READY_TO_SHARE',
          totals: { total: 32, totalMax: 40, percentage: 80, passed: true },
        });
        const report = await prisma.testReport.findUniqueOrThrow({
          where: { id: first.reportId },
        });
        expect(report).toMatchObject({
          status: 'READY_TO_SHARE',
          codingScore: 20,
          totalScore: 32,
        });
        expect(
          (
            await prisma.assessmentAttempt.findUniqueOrThrow({
              where: { id: first.attemptId },
            })
          ).status,
        ).toBe('GRADED');
        // ...and the files are gone: the rows say why and when, the bytes are not in storage.
        const rows = await prisma.assessmentFile.findMany({
          where: { attemptId: first.attemptId },
        });
        expect(rows).toHaveLength(2);
        for (const r of rows) {
          expect(r).toMatchObject({
            status: 'DELETED',
            deleteReason: 'REVIEW_FINALISED',
            lastDeleteError: null,
          });
          expect(r.deleteRequestedAt).not.toBeNull();
          expect(r.deletedAt).not.toBeNull();
          expect(storage.objects.has(r.objectKey)).toBe(false);
        }
        expect([...storage.deleted].sort()).toEqual(
          first.rows.map((r) => r.objectKey).sort(),
        );
        // Nothing else was touched: homework, recordings and another student's project are all still there.
        for (const k of keep) expect(storage.objects.has(k)).toBe(true);
        expect(
          await prisma.assessmentFile.count({
            where: { attemptId: otherStarted.id, status: 'ATTACHED' },
          }),
        ).toBe(1);
        for (const k of storage.deleted) expect(isAssessmentKey(k)).toBe(true);
      });

      it('the marks, feedback, links and the NAMES of the files are kept for good; the files themselves are reported as removed', async () => {
        const { reportId, rows } = await submittedAttempt();
        await markEverything(reportId);
        await patch(`/test-reports/${reportId}`, teacher, {
          feedback: 'Great rocket!',
        });
        await post(`/test-reports/${reportId}/approve`, teacher);

        const res = await get(`/test-reports/${reportId}`, teacher);
        expect(
          res.body.coding.lc.files.map((f: any) => [f.name, f.removed]),
        ).toEqual([
          ['rocket.sb3', true],
          ['rocket.py', true],
        ]);
        expect(res.body.coding.lc.filesRemoved).toBe(true);
        expect(res.body.coding.lc.links).toEqual([
          'https://scratch.mit.edu/projects/123456789/',
        ]);
        expect(res.body.coding.lc.note).toBe(
          'My rocket launches when I press space!',
        );
        expect(res.body).toMatchObject({
          feedback: 'Great rocket!',
          coding: { score: 20 },
        });
        // Opening a removed file says so (410 Gone) instead of failing mysteriously.
        for (const r of rows) {
          const gone = await get(`/assessments/files/${r.id}/access`, teacher);
          expect(gone.status).toBe(410);
          expect(gone.body.message).toMatch(
            /removed after the teacher finished marking/,
          );
        }
        // The student sees their own result and that the files were removed.
        const mine = await get(
          `/assessments/attempts/${rows[0].attemptId}`,
          student,
        );
        expect(mine.body.result).toMatchObject({ total: 32, totalMax: 40 });
        expect(
          mine.body.codingProject.lc.files.every(
            (f: any) => f.removed === true,
          ),
        ).toBe(true);
      });

      it('an incomplete marking sheet cannot be approved — and then nothing is removed', async () => {
        const { reportId, rows } = await submittedAttempt();
        await patch(`/test-reports/${reportId}`, teacher, {
          codingRubricScores: [
            { criterion: LC_RUBRIC_STANDARD[0].criterion, score: 7 },
          ],
        });
        const res = await post(`/test-reports/${reportId}/approve`, teacher);
        expect(res.status).toBe(400);
        expect(rows.every((r) => storage.objects.has(r.objectKey))).toBe(true);
        expect(
          await prisma.assessmentFile.count({
            where: { attemptId: rows[0].attemptId, status: 'ATTACHED' },
          }),
        ).toBe(2);
        expect(storage.deleted).toEqual([]);
      });

      it('approving twice is refused and removes nothing more', async () => {
        const { reportId } = await submittedAttempt();
        await markEverything(reportId);
        expect(
          (await post(`/test-reports/${reportId}/approve`, teacher)).status,
        ).toBe(201);
        const deleted = [...storage.deleted];
        expect(
          (await post(`/test-reports/${reportId}/approve`, teacher)).status,
        ).toBe(409);
        expect(storage.deleted).toEqual(deleted);
      });

      it('if storage cannot remove a file the approval still succeeds, the file stays queued with the reason, and the sweep retries it with a growing delay', async () => {
        const { reportId, rows } = await submittedAttempt();
        await markEverything(reportId);
        storage.failDelete = true;

        const approved = await post(
          `/test-reports/${reportId}/approve`,
          teacher,
        );
        expect(approved.status).toBe(201); // the score is safe whatever storage does
        expect(approved.body.status).toBe('READY_TO_SHARE');

        for (const r of await prisma.assessmentFile.findMany({
          where: { attemptId: rows[0].attemptId },
        })) {
          expect(r).toMatchObject({
            status: 'DELETE_PENDING',
            deleteReason: 'REVIEW_FINALISED',
            deleteAttempts: 1,
          });
          expect(r.lastDeleteError).toMatch(/R2 unreachable|unreachable/i);
          expect(storage.objects.has(r.objectKey)).toBe(true); // still there, nothing is lost silently
        }
        // The teacher can no longer open it (it is marked for removal), but its record is clear.
        expect(
          (await get(`/assessments/files/${rows[0].id}/access`, teacher))
            .status,
        ).toBe(410);

        // Right away the sweep waits (backoff); storage is still down in any case.
        const soon = await files.runSweep(new Date(Date.now() + 5_000));
        expect(soon).toMatchObject({ removed: 0 });
        expect(
          (
            await prisma.assessmentFile.findUniqueOrThrow({
              where: { id: rows[0].id },
            })
          ).deleteAttempts,
        ).toBe(1);

        // Storage is back and the retry is due: the files go, nothing else.
        storage.failDelete = false;
        const later = await files.runSweep(new Date(Date.now() + 10 * 60_000));
        expect(later).toMatchObject({ removed: 2, stillPending: 0 });
        for (const r of await prisma.assessmentFile.findMany({
          where: { attemptId: rows[0].attemptId },
        })) {
          expect(r).toMatchObject({ status: 'DELETED', lastDeleteError: null });
          expect(storage.objects.has(r.objectKey)).toBe(false);
        }
        // Repeating the sweep is harmless.
        expect(
          await files.runSweep(new Date(Date.now() + 20 * 60_000)),
        ).toMatchObject({ removed: 0, stillPending: 0 });
      });

      it('re-opening an approved report does not bring the files back, and approving again is clean', async () => {
        const { reportId, rows } = await submittedAttempt();
        await markEverything(reportId);
        await post(`/test-reports/${reportId}/approve`, teacher);
        const reopened = await post(
          `/test-reports/${reportId}/reopen`,
          teacher,
        );
        expect(reopened.status).toBe(201);
        expect(reopened.body.coding.lc.filesRemoved).toBe(true);
        expect(rows.every((r) => !storage.objects.has(r.objectKey))).toBe(true);
        const deleted = storage.deleted.length;
        expect(
          (await post(`/test-reports/${reportId}/approve`, teacher)).status,
        ).toBe(201);
        expect(storage.deleted).toHaveLength(deleted); // nothing left to remove
      });

      it('a row that is not under the assessments prefix is never deleted, whatever its status says', async () => {
        const { attemptId } = await submittedAttempt();
        const key = 'homework/some-course/some-student/file-9/essay.pdf';
        storage.objects.set(key, {
          body: Buffer.from('precious'),
          contentType: 'application/pdf',
        });
        const rogue = await prisma.assessmentFile.create({
          data: {
            attemptId,
            assessmentId: testAssessmentId,
            studentUserId: student.id,
            programKey: 'little-coders',
            objectKey: key,
            originalName: 'essay.pdf',
            contentType: 'application/pdf',
            sizeBytes: 8,
            status: 'DELETE_PENDING',
            deleteReason: 'REVIEW_FINALISED',
            deleteRequestedAt: new Date(),
          },
        });
        const result = await files.removeMarked([rogue.id]);
        expect(result).toEqual({ removed: 0, pending: 1 });
        expect(storage.objects.has(key)).toBe(true);
        expect(storage.deleted).not.toContain(key);
        expect(
          (
            await prisma.assessmentFile.findUniqueOrThrow({
              where: { id: rogue.id },
            })
          ).status,
        ).toBe('DELETE_PENDING');
      });

      it('removeMarked never touches a file that is not marked for removal', async () => {
        const { rows } = await submittedAttempt();
        const result = await files.removeMarked(rows.map((r) => r.id));
        expect(result).toEqual({ removed: 0, pending: 0 });
        expect(rows.every((r) => storage.objects.has(r.objectKey))).toBe(true);
        expect(
          await prisma.assessmentFile.count({
            where: {
              attemptId: rows[0].attemptId,
              status: AssessmentFileStatus.ATTACHED,
            },
          }),
        ).toBe(2);
      });
    });

    // ═════════════════════════════════════════════════════════════════════════
    describe('the report reaches the parent only once it is complete', () => {
      it('is not shareable before approval, and shares the real totals (40 marks) after it', async () => {
        const { reportId } = await submittedAttempt();
        expect(
          (await post(`/test-reports/${reportId}/share`, teacher)).status,
        ).toBe(409);
        await markEverything(reportId);
        await post(`/test-reports/${reportId}/approve`, teacher);
        const detail = await get(`/test-reports/${reportId}`, teacher);
        expect(detail.body.share).toMatchObject({ canShare: true });
        expect(detail.body.totals).toMatchObject({ total: 32, totalMax: 40 });
      });
    });

    // ═════════════════════════════════════════════════════════════════════════
    describe('admin: the practical project and the question bank', () => {
      it('shows an assessment against the Little Coders standard (10 + 5 + one 25-mark project = 40)', async () => {
        const res = await get(`/assessments/${testAssessmentId}/admin`, admin);
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ format: 'LITTLE_CODERS_V2' });
        expect(res.body.standard).toMatchObject({
          expectedMcq: 10,
          expectedTrueFalse: 5,
          expectedTotalMarks: 40,
          meets: true,
          issues: [],
          counts: { mcq: 10, trueFalse: 5, practical: 1 },
        });
        const final = await get(
          `/assessments/${finalAssessmentId}/admin`,
          admin,
        );
        expect(final.body.standard).toMatchObject({
          meets: true,
          counts: { practical: 2 },
        });
        expect(final.body.activeVariant).toBe('SCRATCH_AI');
      });

      it('an admin can edit the brief, blocks and requirements; it is validated, kept, and never overwritten by a later release', async () => {
        const admin1 = await get(
          `/assessments/${testAssessmentId}/admin`,
          admin,
        );
        const practical = admin1.body.practicalQuestions[0];
        const spec = {
          ...practical.spec,
          brief: [
            'A new, shorter brief for the rocket project.',
            'Make it fly across the stage.',
          ],
        };
        const bad = await patch(
          `/assessments/practical-questions/${practical.id}`,
          admin,
          { spec: { ...spec, blocks: [] } },
        );
        expect(bad.status).toBe(400);
        const wrongRubric = await patch(
          `/assessments/practical-questions/${practical.id}`,
          admin,
          { spec, rubric: [{ criterion: 'Everything', maxPoints: 30 }] },
        );
        expect(wrongRubric.status).toBe(400);
        expect(wrongRubric.body.message).toMatch(/25 marks/);
        const ok = await patch(
          `/assessments/practical-questions/${practical.id}`,
          admin,
          { spec, title: 'My rocket project' },
        );
        expect(ok.status).toBe(200);
        expect(ok.body).toMatchObject({
          title: 'My rocket project',
          maxScore: 25,
        });
        expect(ok.body.spec).toMatchObject({ adminEdited: true });
        expect(ok.body.spec.brief[0]).toBe(
          'A new, shorter brief for the rocket project.',
        );

        // A later bank release leaves the admin's version exactly as written.
        await prisma.assessment.update({
          where: { id: testAssessmentId },
          data: { bankVersion: 0 },
        });
        await syncLittleCodersBanks(prisma, quiet);
        const after = await prisma.practicalQuestion.findUniqueOrThrow({
          where: { id: practical.id },
        });
        expect(after.title).toBe('My rocket project');
        expect((after.spec as any).brief[0]).toBe(
          'A new, shorter brief for the rocket project.',
        );
        // Students are given the edited project.
        const t = await startTest();
        expect(t.codingProject.lc.spec.brief[0]).toBe(
          'A new, shorter brief for the rocket project.',
        );
      });

      it('an admin-set starter address (the prepared model of Course 3) reaches the student — and is never invented', async () => {
        const c3 = await prisma.assessment.findFirstOrThrow({
          where: { lesson: { courseId, order: 27 } },
        });
        const lessonClass = await makeClass(student, teacher, 27);
        const before = await startTest(lessonClass, c3.id);
        expect(before.codingProject.lc.spec.starter).toMatchObject({
          required: true,
          url: '',
          note: 'Your teacher will share the prepared link in class.',
        });
        const practical = await prisma.practicalQuestion.findFirstOrThrow({
          where: { assessmentId: c3.id },
        });
        const spec = {
          ...(practical.spec as any),
          starter: {
            ...(practical.spec as any).starter,
            url: 'https://tm.gen-ai.fi/models/prepared-fruit-model',
          },
        };
        expect(
          (
            await patch(
              `/assessments/practical-questions/${practical.id}`,
              admin,
              { spec },
            )
          ).status,
        ).toBe(200);
        // A learner who starts after the admin added it is given it.
        const another = await makeUser('zoya-khan', Role.STUDENT, {
          assignedTeacherId: teacher.profileId,
        });
        const anotherClass = await makeClass(another, teacher, 27);
        const after = await startTest(anotherClass, c3.id, another);
        expect(after.codingProject.lc.spec.starter).toMatchObject({
          url: 'https://tm.gen-ai.fi/models/prepared-fruit-model',
          note: expect.stringMatching(/do not need to train/i),
        });
      });

      it('an admin can edit a question and its answer key; the key is only ever served to staff', async () => {
        const bank = await get(`/assessments/${testAssessmentId}/admin`, admin);
        const q = bank.body.mcqQuestions.find(
          (x: any) => x.questionType === 'MCQ',
        );
        expect(q).toHaveProperty('correctIndex');
        const res = await patch(`/assessments/mcq-questions/${q.id}`, admin, {
          questionText: `${q.questionText} (reworded)`,
          options: ['one', 'two', 'three', 'four'],
          correctIndex: 2,
        });
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({
          correctIndex: 2,
          editedByAdmin: true,
        });
        expect(
          (await get(`/assessments/${testAssessmentId}/admin`, teacher)).status,
        ).toBe(403);
        expect(
          (await get(`/assessments/${testAssessmentId}/admin`, student)).status,
        ).toBe(403);
        // A bank release respects the admin's edit.
        await prisma.assessment.update({
          where: { id: testAssessmentId },
          data: { bankVersion: 0 },
        });
        await syncLittleCodersBanks(prisma, quiet);
        expect(
          (await prisma.mCQQuestion.findUniqueOrThrow({ where: { id: q.id } }))
            .options,
        ).toEqual(['one', 'two', 'three', 'four']);
      });
    });

    // ═════════════════════════════════════════════════════════════════════════
    describe('other programs are unaffected', () => {
      it('a standard (non-Little-Coders) assessment takes no files and has no Little Coders block', async () => {
        const other = await prisma.course.create({
          data: {
            slug: 'other-program',
            title: 'Other',
            category: 'Python',
            level: 'STARTER',
          },
        });
        const lesson = await prisma.lesson.create({
          data: {
            courseId: other.id,
            order: 9,
            title: 'Other course test',
            type: 'COURSE_TEST',
          },
        });
        const assessment = await prisma.assessment.create({
          data: {
            lessonId: lesson.id,
            type: 'COURSE_TEST',
            title: 'Other test',
            isPublished: true,
          },
        });
        for (let i = 0; i < 4; i++) {
          await prisma.mCQQuestion.create({
            data: {
              assessmentId: assessment.id,
              questionType: 'MCQ',
              questionText: `Question ${i}`,
              options: ['a', 'b', 'c', 'd'],
              correctIndex: 0,
              order: i,
            },
          });
        }
        const start1 = new Date(Date.now() + 5 * 60_000);
        const sl = await prisma.scheduledLesson.create({
          data: {
            studentUserId: student.id,
            teacherId: teacher.profileId!,
            courseId: other.id,
            lessonNumber: 9,
            lessonId: lesson.id,
            start: start1,
            end: new Date(start1.getTime() + 3_600_000),
            classType: ClassType.ONE_TO_ONE,
            status: 'UPCOMING',
          },
        });
        const started = await start(assessment.id, sl.id);
        expect(started.status).toBe(201);
        expect(started.body.assessment.format).toBe('STANDARD');
        expect(started.body.assessment.lc).toBeNull();
        expect(started.body.codingProject).toBeNull();
        expect(
          (await upload(started.body.id, student, [{ name: 'a.py', body: PY }]))
            .status,
        ).toBe(400);
        expect(
          (
            await post(
              `/assessments/attempts/${started.body.id}/practical`,
              student,
              { questionId: 'x', links: [] },
            )
          ).status,
        ).toBe(400);
        expect(storage.objects.size).toBe(0);
      });
    });
  },
);

// Keeps the two imports used only for their types honest.
void ClassType;
