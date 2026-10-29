// Who may do what with batches, and who may see which students — over HTTP, with
// the real guards, validation and error filter, against a REAL Postgres.
//
//   - Batch management is Operations-only.
//   - A teacher sees the batches THEY teach, with the students in them, and
//     nothing of another teacher's batches or students.
//   - A student sees their own classes (and the batch's name), never classmates.
//   - Homework and lesson pages stay each student's own.
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
process.env.JWT_SECRET = 'batches-access-integration-secret';
process.env.FRONTEND_URL = 'https://lumexa-one.vercel.app';
delete process.env.SMTP_USER;
delete process.env.SMTP_PASS;

import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { ClassType, LessonStatus, Role } from '@prisma/client';
import request from 'supertest';
import { JwtStrategy } from '../auth/jwt.strategy';
import { CurriculumController } from '../curriculum/curriculum.controller';
import { CurriculumDocumentsService } from '../curriculum/curriculum-documents.service';
import { CurriculumService } from '../curriculum/curriculum.service';
import { AllExceptionsFilter } from '../filters/http-exception.filter';
import { PrismaModule } from '../prisma.module';
import { PrismaService } from '../prisma.service';
import { SchedulingController } from '../scheduling/scheduling.controller';
import { SchedulingService } from '../scheduling/scheduling.service';
import { HomeworkFilesService } from '../submissions/homework-files.service';
import { SubmissionsService } from '../submissions/submissions.service';
import { MemoryHomeworkStorage } from '../submissions/testing/memory-homework-storage';
import { TeachersController } from '../teachers/teachers.controller';
import { TeachersService } from '../teachers/teachers.service';
import { BatchSessionsService } from './batch-sessions.service';
import { BatchesController } from './batches.controller';
import { BatchesService } from './batches.service';
import {
  BatchWorld,
  Person,
  buildBatchWorld,
  makeCourse,
  makeUser,
  weeklyFrom,
} from './testing/batch-world';

const describeDb = IT_DB_URL ? describe : describe.skip;

describeDb(
  'Batch access control and data isolation (real Postgres, over HTTP)',
  () => {
    jest.setTimeout(180_000);

    let app: INestApplication;
    let prisma: PrismaService;
    let jwt: JwtService;
    let w: BatchWorld;
    let releaseLock: () => void;

    let admin: Person;
    let teacherA: Person;
    let teacherB: Person;
    let teacherC: Person; // teaches nobody
    let course: { id: string; title: string; sessions: number };
    let batchA: string;
    let batchB: string;
    let adaA: Person; // in teacher A's batch
    let benA: Person; // in teacher A's batch
    let cleoB: Person; // in teacher B's batch
    let danB: Person; // in teacher B's batch
    let soloA: Person; // a 1-to-1 student of teacher A

    const bearer = (p: Person) => ({
      Authorization: `Bearer ${jwt.sign({ sub: p.id, email: p.email, role: p.role })}`,
    });
    const http = () => request(app.getHttpServer());
    const get = (path: string, who?: Person) => {
      const r = http().get(path);
      return who ? r.set(bearer(who)) : r;
    };
    const send = (
      method: 'get' | 'post' | 'put' | 'patch' | 'delete',
      path: string,
      who?: Person,
      body: object = {},
    ) => {
      const r = http()[method](path);
      return (who ? r.set(bearer(who)) : r).send(body);
    };

    async function makeStudent(name: string, teacher: Person) {
      return makeUser(prisma, name, Role.STUDENT, {
        assignedTeacherId: teacher.profileId,
        assignedCourseId: course.id,
        grade: '6',
        age: 11,
      });
    }

    beforeAll(async () => {
      releaseLock = await acquireDatabaseLock(IT_DB_URL as string);
      jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
      jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
      jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);

      const moduleRef = await Test.createTestingModule({
        imports: [PrismaModule, PassportModule],
        controllers: [
          BatchesController,
          SchedulingController,
          TeachersController,
          CurriculumController,
        ],
        providers: [
          JwtStrategy,
          {
            provide: 'WORLD',
            useFactory: (p: PrismaService) => buildBatchWorld(p),
            inject: [PrismaService],
          },
          {
            provide: BatchesService,
            useFactory: (x: BatchWorld) => x.batches,
            inject: ['WORLD'],
          },
          {
            provide: BatchSessionsService,
            useFactory: (x: BatchWorld) => x.sessions,
            inject: ['WORLD'],
          },
          {
            provide: SchedulingService,
            useFactory: (x: BatchWorld) => x.scheduling,
            inject: ['WORLD'],
          },
          {
            provide: TeachersService,
            useFactory: (p: PrismaService, x: BatchWorld) =>
              new TeachersService(p, x.payouts, x.scheduling),
            inject: [PrismaService, 'WORLD'],
          },
          {
            provide: CurriculumService,
            useFactory: (p: PrismaService) => new CurriculumService(p),
            inject: [PrismaService],
          },
          {
            provide: CurriculumDocumentsService,
            useFactory: (p: PrismaService) => new CurriculumDocumentsService(p),
            inject: [PrismaService],
          },
        ],
      }).compile();
      app = moduleRef.createNestApplication();
      app.useGlobalPipes(
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
        }),
      );
      app.useGlobalFilters(new AllExceptionsFilter());
      await app.listen(0);
      prisma = moduleRef.get(PrismaService);
      w = moduleRef.get('WORLD');
      jwt = new JwtService({ secret: process.env.JWT_SECRET });
    }, 200_000);

    afterAll(async () => {
      jest.restoreAllMocks();
      await app?.close();
      releaseLock?.();
    });

    beforeEach(async () => {
      jest.clearAllMocks();
      await truncateAssessmentData(prisma);
      await prisma.auditLog.deleteMany();
      admin = await makeUser(prisma, 'ops-admin', Role.ADMIN);
      teacherA = await makeUser(prisma, 'ms-karim', Role.TEACHER);
      teacherB = await makeUser(prisma, 'mr-hasan', Role.TEACHER);
      teacherC = await makeUser(prisma, 'ms-idle', Role.TEACHER);
      course = await makeCourse(prisma, 'access-course', 6);

      batchA = (
        await w.batches.createBatch(
          {
            name: 'Batch Karim',
            teacherId: teacherA.profileId!,
            courseId: course.id,
            ...weeklyFrom(2, '17:00'),
          } as never,
          admin.id,
        )
      ).batch.id;
      batchB = (
        await w.batches.createBatch(
          {
            name: 'Batch Hasan',
            teacherId: teacherB.profileId!,
            courseId: course.id,
            ...weeklyFrom(2, '17:00'),
          } as never,
          admin.id,
        )
      ).batch.id;
      adaA = await makeStudent('ada-lovelace', teacherA);
      benA = await makeStudent('ben-carson', teacherA);
      cleoB = await makeStudent('cleo-patra', teacherB);
      danB = await makeStudent('dan-secret', teacherB);
      soloA = await makeStudent('solo-sam', teacherA);
      for (const s of [adaA, benA]) {
        await w.batches.enrollStudent({
          studentUserId: s.id,
          batchId: batchA,
          adminUserId: admin.id,
        });
      }
      for (const s of [cleoB, danB]) {
        await w.batches.enrollStudent({
          studentUserId: s.id,
          batchId: batchB,
          adminUserId: admin.id,
        });
      }
      // A 1-to-1 student of teacher A, with classes of their own.
      await w.scheduling.setStudentSchedule(
        soloA.id,
        { classType: 'ONE_TO_ONE', ...weeklyFrom(3, '10:00') } as never,
        admin.id,
      );
    });

    // ═══ Batch management is Operations-only ═══════════════════════════════════

    describe('batch management routes', () => {
      const routes: [
        string,
        'get' | 'post' | 'put' | 'patch' | 'delete',
        () => string,
      ][] = [
        ['list batches', 'get', () => '/admin/batches'],
        ['read a batch', 'get', () => `/admin/batches/${batchA}`],
        ['create a batch', 'post', () => '/admin/batches'],
        ['edit a batch', 'patch', () => `/admin/batches/${batchA}`],
        [
          'reschedule a batch',
          'put',
          () => `/admin/batches/${batchA}/schedule`,
        ],
        [
          'change a batch’s teacher',
          'put',
          () => `/admin/batches/${batchA}/teacher`,
        ],
        [
          'find students for a batch',
          'get',
          () => `/admin/batches/${batchA}/candidates`,
        ],
        [
          'add a student to a batch',
          'post',
          () => `/admin/batches/${batchA}/students`,
        ],
        [
          'remove a student from a batch',
          'delete',
          () => `/admin/batches/${batchA}/students/${adaA.id}`,
        ],
        [
          'see a student’s batch options',
          'get',
          () => `/admin/students/${soloA.id}/batch-options`,
        ],
        [
          'place a student in a batch',
          'post',
          () => `/admin/students/${soloA.id}/batch`,
        ],
        [
          'take a student out of their batch',
          'delete',
          () => `/admin/students/${adaA.id}/batch`,
        ],
        [
          'reschedule a batch class',
          'post',
          () => '/admin/batch-sessions/x/reschedule',
        ],
        [
          'cancel a batch class',
          'post',
          () => '/admin/batch-sessions/x/cancel',
        ],
        ['delete a batch class', 'delete', () => '/admin/batch-sessions/x'],
      ];

      it.each(routes)(
        '%s: not without signing in',
        async (_n, method, path) => {
          expect((await send(method, path())).status).toBe(401);
        },
      );

      it.each(routes)(
        '%s: not as a student, nor as a teacher',
        async (_n, method, path) => {
          expect((await send(method, path(), adaA)).status).toBe(403);
          expect((await send(method, path(), teacherA)).status).toBe(403);
        },
      );

      it('nothing was changed by the refused attempts', async () => {
        await send('post', '/admin/batches', teacherA, {
          name: 'Sneaky',
          teacherId: teacherA.profileId,
          courseId: course.id,
          ...weeklyFrom(4),
        });
        await send('delete', `/admin/students/${adaA.id}/batch`, adaA);
        await send('patch', `/admin/batches/${batchA}`, teacherA, {
          name: 'Hijacked',
        });
        expect(await prisma.batch.count()).toBe(2);
        expect(
          await prisma.batch.findUniqueOrThrow({ where: { id: batchA } }),
        ).toMatchObject({
          name: 'Batch Karim',
        });
        expect(
          await prisma.batchMember.count({ where: { leftAt: null } }),
        ).toBe(4);
      });

      it('an admin can list, read and create', async () => {
        const list = await get('/admin/batches', admin);
        expect(list.status).toBe(200);
        expect(
          list.body.batches.map((b: { name: string }) => b.name).sort(),
        ).toEqual(['Batch Hasan', 'Batch Karim']);
        const detail = await get(`/admin/batches/${batchA}`, admin);
        expect(detail.status).toBe(200);
        expect(
          detail.body.members
            .map((m: { fullName: string }) => m.fullName)
            .sort(),
        ).toEqual(['ada lovelace', 'ben carson']);
        const created = await send('post', '/admin/batches', admin, {
          name: 'Third Batch',
          teacherId: teacherC.profileId,
          courseId: course.id,
          ...weeklyFrom(3, '09:00'),
        });
        expect(created.status).toBe(201);
        expect(created.body.batch.name).toBe('Third Batch');
      });

      it('checks what is sent: unknown fields, a size above nine, a bad time, a missing name', async () => {
        const base = {
          name: 'Valid Name',
          teacherId: teacherC.profileId,
          courseId: course.id,
          ...weeklyFrom(3, '09:00'),
        };
        expect(
          (
            await send('post', '/admin/batches', admin, {
              ...base,
              isAdmin: true,
            })
          ).status,
        ).toBe(400);
        expect(
          (
            await send('post', '/admin/batches', admin, {
              ...base,
              maxStudents: 10,
            })
          ).status,
        ).toBe(400);
        expect(
          (
            await send('post', '/admin/batches', admin, {
              ...base,
              slots: [{ weekday: 1, time: '25:99' }],
            })
          ).status,
        ).toBe(400);
        expect(
          (await send('post', '/admin/batches', admin, { ...base, name: '' }))
            .status,
        ).toBe(400);
        expect(
          (await send('post', '/admin/batches', admin, { ...base, slots: [] }))
            .status,
        ).toBe(400);
        expect(await prisma.batch.count()).toBe(2);
      });

      it('a refused placement answers 409 with the things to decide, so the screen can ask', async () => {
        const wrongTeacher = await makeStudent(
          'other-teachers-student',
          teacherB,
        );
        const res = await send(
          'post',
          `/admin/students/${wrongTeacher.id}/batch`,
          admin,
          {
            batchId: batchA,
          },
        );
        expect(res.status).toBe(409);
        expect(res.body.details.code).toBe('DECISION_REQUIRED');
        expect(
          res.body.details.unmet.map((u: { code: string }) => u.code),
        ).toEqual(['TEACHER_CHANGE']);
        expect(res.body.message).toMatch(/Confirm before continuing/);

        const ok = await send(
          'post',
          `/admin/students/${wrongTeacher.id}/batch`,
          admin,
          {
            batchId: batchA,
            decisions: { acceptTeacherChange: true },
          },
        );
        expect(ok.status).toBe(201);
        expect(ok.body).toMatchObject({
          batchId: batchA,
          alignment: 'ALIGNED',
        });
      });

      it('rejects a decision that is not a plain yes or a known choice', async () => {
        const res = await send(
          'post',
          `/admin/students/${soloA.id}/batch`,
          admin,
          {
            batchId: batchA,
            decisions: { progress: 'WHATEVER' },
          },
        );
        expect(res.status).toBe(400);
        const res2 = await send(
          'post',
          `/admin/students/${soloA.id}/batch`,
          admin,
          {
            batchId: batchA,
            decisions: { acceptTeacherChange: 'yes' },
          },
        );
        expect(res2.status).toBe(400);
      });

      it('switching a batch student to 1-to-1 answers 409 LEAVES_BATCH until the admin confirms', async () => {
        // (the Schedule tab route lives with the other admin student routes; the
        // service is what enforces it)
        await expect(
          w.scheduling.setStudentSchedule(
            adaA.id,
            { classType: 'ONE_TO_ONE', ...weeklyFrom(4, '11:00') } as never,
            admin.id,
          ),
        ).rejects.toMatchObject({
          response: { details: { code: 'LEAVES_BATCH' } },
        });
      });
    });

    // ═══ What a teacher sees ════════════════════════════════════════════════════

    describe('a teacher’s schedule', () => {
      it('shows each of their batch classes ONCE, with its students, the batch name and the lesson', async () => {
        const res = await get('/teachers/me/scheduled-lessons', teacherA);
        expect(res.status).toBe(200);
        const sessions = res.body.filter(
          (i: { kind: string }) => i.kind === 'BATCH_SESSION',
        );
        expect(sessions).toHaveLength(6); // six classes — not twelve rows
        const first = sessions[0];
        expect(first).toMatchObject({
          kind: 'BATCH_SESSION',
          classType: 'BATCH',
          lessonNumber: 1,
          lessonTitle: 'Lesson 1',
          batch: { id: batchA, name: 'Batch Karim' },
          course: { id: course.id },
        });
        expect(first.viewLessonId).toBeTruthy();
        expect(
          first.students.map((s: { fullName: string }) => s.fullName),
        ).toEqual(['ada lovelace', 'ben carson']);
        // The details a teacher prepares with.
        expect(first.students[0]).toMatchObject({
          id: adaA.id,
          grade: '6',
          age: 11,
          lessonsCompleted: 0,
          totalLessons: 6,
          attendance: 'PENDING',
        });
        expect(first.students[0]).toHaveProperty('lessonId');
        expect(first.students[0]).toHaveProperty('spaceRank');
        // …and the 1-to-1 student's classes are still there as before.
        const lessons = res.body.filter(
          (i: { kind: string }) => i.kind === 'LESSON',
        );
        expect(lessons).toHaveLength(6);
        expect(
          lessons.every(
            (l: { student: { id: string } }) => l.student.id === soloA.id,
          ),
        ).toBe(true);
      });

      it('never shows another teacher’s batch, its students or their details', async () => {
        const res = await get('/teachers/me/scheduled-lessons', teacherA);
        const body = JSON.stringify(res.body);
        for (const other of [cleoB, danB]) {
          expect(body).not.toContain(other.id);
          expect(body).not.toContain(other.fullName);
          expect(body).not.toContain(other.email);
        }
        expect(body).not.toContain('Batch Hasan');
        expect(body).not.toContain(batchB);

        const mine = await get('/teachers/me/scheduled-lessons', teacherB);
        const mineBody = JSON.stringify(mine.body);
        for (const other of [adaA, benA, soloA]) {
          expect(mineBody).not.toContain(other.id);
          expect(mineBody).not.toContain(other.fullName);
        }
        expect(mineBody).not.toContain('Batch Karim');
        expect(
          mine.body.filter((i: { kind: string }) => i.kind === 'BATCH_SESSION'),
        ).toHaveLength(6);
      });

      it('a teacher with no classes sees none; only teachers may ask', async () => {
        expect(
          (await get('/teachers/me/scheduled-lessons', teacherC)).body,
        ).toEqual([]);
        expect((await get('/teachers/me/scheduled-lessons', adaA)).status).toBe(
          403,
        );
        expect(
          (await get('/teachers/me/scheduled-lessons', admin)).status,
        ).toBe(403);
        expect((await get('/teachers/me/scheduled-lessons')).status).toBe(401);
      });

      it('a batch class that has been taught shows who attended it', async () => {
        const [first] = await prisma.batchSession.findMany({
          where: { batchId: batchA },
          orderBy: { start: 'asc' },
        });
        const start = new Date(Date.now() - 30 * 60_000);
        await prisma.batchSession.update({
          where: { id: first.id },
          data: {
            start,
            end: new Date(Date.now() + 30 * 60_000),
            teacherJoinedAt: new Date(start.getTime() - 60_000),
          },
        });
        await prisma.scheduledLesson.updateMany({
          where: { batchSessionId: first.id },
          data: { start, end: new Date(Date.now() + 30 * 60_000) },
        });
        await prisma.scheduledLesson.updateMany({
          where: { batchSessionId: first.id, studentUserId: adaA.id },
          data: { studentJoinedAt: new Date() },
        });
        await w.finalization.finalizeBatchSession(first.id, {
          outcome: 'COMPLETED',
          actor: { role: 'TEACHER', userId: teacherA.id },
        });

        const res = await get('/teachers/me/scheduled-lessons', teacherA);
        const done = res.body.find((i: { id: string }) => i.id === first.id);
        expect(done.status).toBe('COMPLETED');
        expect(
          Object.fromEntries(
            done.students.map((s: { fullName: string; attendance: string }) => [
              s.fullName,
              s.attendance,
            ]),
          ),
        ).toEqual({ 'ada lovelace': 'ATTENDED', 'ben carson': 'ABSENT' });
        // Ada's progress counts her own completed lesson.
        expect(
          done.students.find((s: { id: string }) => s.id === adaA.id)
            .lessonsCompleted,
        ).toBe(1);
        expect(
          done.students.find((s: { id: string }) => s.id === benA.id)
            .lessonsCompleted,
        ).toBe(0);
      });
    });

    describe('a teacher’s students', () => {
      it('lists each student with their class type, and the batch for those in one', async () => {
        const res = await get('/teachers/me/students', teacherA);
        expect(res.status).toBe(200);
        const students: any[] = res.body;
        const by = Object.fromEntries(students.map((s) => [s.studentName, s]));
        expect(Object.keys(by).sort()).toEqual([
          'ada lovelace',
          'ben carson',
          'solo sam',
        ]);
        expect(by['ada lovelace']).toMatchObject({
          classType: 'BATCH',
          batch: {
            id: batchA,
            name: 'Batch Karim',
            memberCount: 2,
            maxStudents: 4,
          },
        });
        expect(by['ada lovelace'].batch.slots).toHaveLength(1);
        expect(by['ben carson'].batch.name).toBe('Batch Karim');
        expect(by['solo sam']).toMatchObject({
          classType: 'ONE_TO_ONE',
          batch: null,
        });
      });

      it('never lists another teacher’s students or batch', async () => {
        const res = await get('/teachers/me/students', teacherA);
        const body = JSON.stringify(res.body);
        for (const other of [cleoB, danB]) {
          expect(body).not.toContain(other.fullName);
          expect(body).not.toContain(other.id);
        }
        expect(body).not.toContain('Batch Hasan');
      });

      it('does not reveal a batch the teacher does not teach, even for a student they share a past with', async () => {
        // Ada is (wrongly, for this test) also on teacher B's roster, while placed
        // in teacher A's batch. Teacher B must not learn which batch she is in.
        await prisma.user.update({
          where: { id: adaA.id },
          data: { assignedTeacherId: teacherB.profileId },
        });
        const res = await get('/teachers/me/students', teacherB);
        const students: any[] = res.body;
        const ada = students.find((s) => s.studentId === adaA.id);
        expect(ada).toBeDefined();
        expect(ada.batch).toBeNull();
        expect(JSON.stringify(res.body)).not.toContain('Batch Karim');
      });

      it('the dashboard’s next class is the batch, once, with its students', async () => {
        const res = await get('/teachers/me/next-class', teacherA);
        expect(res.status).toBe(200);
        const next = res.body.liveClass ?? res.body;
        // The 1-to-1 class (day 3) comes after the batch (day 2).
        expect(next).toMatchObject({
          type: 'batch',
          studentName: 'Batch Karim',
          classType: 'BATCH',
          studentCount: 2,
          batch: { id: batchA, name: 'Batch Karim' },
        });
        expect(
          next.students.map((s: { fullName: string }) => s.fullName).sort(),
        ).toEqual(['ada lovelace', 'ben carson']);
      });
    });

    // ═══ What a student sees ════════════════════════════════════════════════════

    describe('a student’s classes', () => {
      it('shows their own rows with the batch’s name — and never a classmate', async () => {
        const res = await get('/students/me/scheduled-lessons', adaA);
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(6);
        expect(
          res.body.every(
            (l: { studentUserId: string }) => l.studentUserId === adaA.id,
          ),
        ).toBe(true);
        expect(res.body[0]).toMatchObject({
          classType: 'BATCH',
          lessonNumber: 1,
          batch: { id: batchA, name: 'Batch Karim' },
        });
        const body = JSON.stringify(res.body);
        expect(body).not.toContain(benA.fullName);
        expect(body).not.toContain(benA.id);
        expect(body).not.toContain(cleoB.id);
      });

      it('a 1-to-1 student’s classes carry no batch', async () => {
        const res = await get('/students/me/scheduled-lessons', soloA);
        expect(res.body).toHaveLength(6);
        expect(
          res.body.every(
            (l: { batch: unknown; classType: string }) =>
              l.batch === null && l.classType === 'ONE_TO_ONE',
          ),
        ).toBe(true);
      });

      it('only students ask for their classes', async () => {
        expect(
          (await get('/students/me/scheduled-lessons', teacherA)).status,
        ).toBe(403);
        expect((await get('/students/me/scheduled-lessons')).status).toBe(401);
      });
    });

    // ═══ Lesson pages and homework stay each student’s own ══════════════════════

    describe('the lesson of a batch class', () => {
      async function completedClassWithHomework() {
        // Lesson 2 has homework. Teach lessons 1 and 2.
        const sessions = await prisma.batchSession.findMany({
          where: { batchId: batchA },
          orderBy: { start: 'asc' },
        });
        for (const session of sessions.slice(0, 2)) {
          const start = new Date(Date.now() - 30 * 60_000);
          const end = new Date(Date.now() + 30 * 60_000);
          await prisma.batchSession.update({
            where: { id: session.id },
            data: {
              start,
              end,
              teacherJoinedAt: new Date(start.getTime() - 60_000),
            },
          });
          await prisma.scheduledLesson.updateMany({
            where: { batchSessionId: session.id },
            data: { start, end, studentJoinedAt: new Date() },
          });
          await w.finalization.finalizeBatchSession(session.id, {
            outcome: 'COMPLETED',
            actor: { role: 'TEACHER', userId: teacherA.id },
          });
        }
        const rows = await prisma.scheduledLesson.findMany({
          where: { batchId: batchA, lessonNumber: 2 },
        });
        return Object.fromEntries(rows.map((r) => [r.studentUserId, r.id]));
      }

      it('the batch’s teacher, an admin and the student themselves may open it; another teacher, another student and a stranger may not', async () => {
        const [adaRow] = await prisma.scheduledLesson.findMany({
          where: { studentUserId: adaA.id, lessonNumber: 1 },
        });
        const path = `/curriculum/scheduled-lessons/${adaRow.id}/details`;
        expect((await get(path, teacherA)).status).toBe(200);
        expect((await get(path, admin)).status).toBe(200);
        expect((await get(path, adaA)).status).toBe(200);
        expect((await get(path, teacherB)).status).toBe(403);
        expect((await get(path, teacherC)).status).toBe(403);
        expect((await get(path, benA)).status).toBe(403); // a classmate
        expect((await get(path, cleoB)).status).toBe(403);
        expect((await get(path)).status).toBe(401);
      });

      it('the teacher can read the lesson before it is taught (to prepare); a student cannot yet', async () => {
        const [adaRow] = await prisma.scheduledLesson.findMany({
          where: { studentUserId: adaA.id, lessonNumber: 1 },
        });
        const path = `/curriculum/scheduled-lessons/${adaRow.id}/details`;
        const teacher = await get(path, teacherA);
        expect(teacher.body).toMatchObject({
          available: true,
          lesson: { title: 'Lesson 1' },
          session: { lessonNumber: 1, batchName: 'Batch Karim' },
        });
        const student = await get(path, adaA);
        expect(student.body.available).toBe(false);
        expect(student.body.session.batchName).toBe('Batch Karim');
      });

      it('homework is each student’s own: separate submissions, and the shared lesson page never shows one student’s work to the teacher as if it were the class’s', async () => {
        const rows = await completedClassWithHomework();
        const submissions = new SubmissionsService(
          prisma,
          new HomeworkFilesService(prisma, new MemoryHomeworkStorage()),
        );
        await submissions.submitHomework(adaA.id, {
          scheduledLessonId: rows[adaA.id],
          links: ['https://example.com/ada'],
          note: 'Ada’s project',
        });
        await submissions.submitHomework(benA.id, {
          scheduledLessonId: rows[benA.id],
          links: ['https://example.com/ben'],
        });
        expect(await prisma.submission.count()).toBe(2);

        // A student cannot submit into a classmate's row.
        await expect(
          submissions.submitHomework(adaA.id, {
            scheduledLessonId: rows[benA.id],
            links: ['https://example.com/x'],
          }),
        ).rejects.toThrow(/not your class/);

        // Each student sees their own submission…
        const own = await get(
          `/curriculum/scheduled-lessons/${rows[adaA.id]}/details`,
          adaA,
        );
        expect(own.body.submission).toMatchObject({ note: 'Ada’s project' });
        const bens = await get(
          `/curriculum/scheduled-lessons/${rows[benA.id]}/details`,
          benA,
        );
        expect(bens.body.submission.links).toEqual(['https://example.com/ben']);
        // …while the teacher opening the shared lesson page through a student's row
        // is not handed that one student's work.
        const asTeacher = await get(
          `/curriculum/scheduled-lessons/${rows[adaA.id]}/details`,
          teacherA,
        );
        expect(asTeacher.status).toBe(200);
        expect(asTeacher.body.lesson.homework).toBe('Homework 2');
        expect(asTeacher.body.submission).toBeNull();
        // …and reviews each student's work on its own.
        const [adas] = await prisma.submission.findMany({
          where: { studentUserId: adaA.id },
        });
        await submissions.review(adas.id, teacherA.id, {
          status: 'APPROVED',
          rating: 5,
        });
        expect(
          (
            await prisma.submission.findMany({
              where: { studentUserId: benA.id },
            })
          )[0].status,
        ).toBe('PENDING');
        // Another teacher cannot review it.
        await expect(
          submissions.review(adas.id, teacherB.id, { status: 'APPROVED' }),
        ).rejects.toThrow(/not sent to you/);
        // The teacher's queue holds only their own students' work.
        const queue = await submissions.listForTeacher(teacherA.id);
        expect(
          queue.map((s: { student: { id: string } }) => s.student.id).sort(),
        ).toEqual([adaA.id, benA.id].sort());
        expect(await submissions.listForTeacher(teacherB.id)).toEqual([]);
      });

      it('the lesson page of a 1-to-1 class keeps showing the student’s own submission to their teacher', async () => {
        const own = await prisma.scheduledLesson.findFirstOrThrow({
          where: { studentUserId: soloA.id, lessonNumber: 2 },
        });
        await prisma.scheduledLesson.update({
          where: { id: own.id },
          data: { status: LessonStatus.COMPLETED, studentJoinedAt: new Date() },
        });
        const lesson = await prisma.lesson.findFirstOrThrow({
          where: { courseId: course.id, order: 2 },
        });
        await prisma.submission.create({
          data: {
            scheduledLessonId: own.id,
            lessonId: lesson.id,
            studentUserId: soloA.id,
            teacherId: teacherA.profileId!,
            links: ['https://example.com/solo'],
          },
        });
        const res = await get(
          `/curriculum/scheduled-lessons/${own.id}/details`,
          teacherA,
        );
        expect(res.status).toBe(200);
        expect(res.body.submission.links).toEqual(['https://example.com/solo']);
        expect(own.classType).toBe(ClassType.ONE_TO_ONE);
      });
    });
  },
);
