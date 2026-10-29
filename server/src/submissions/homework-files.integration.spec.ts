// The whole homework file workflow — upload, submit, teacher preview, review,
// removal from storage, retries and the clean-up sweep — over HTTP, with the real
// guards, validation and error filter, against a REAL Postgres. The homework
// bucket is an in-memory stand-in (MemoryHomeworkStorage) that can be told to
// fail, so the failure paths are exercised too.
//
// Skipped unless ASSESSMENT_INTEGRATION_DATABASE_URL points at a throwaway, fully
// migrated database — see ../assessments/testing/integration-db.ts.

import 'reflect-metadata';
import {
  IT_DB_URL,
  acquireDatabaseLock,
  truncateAssessmentData,
  useIntegrationDatabase,
} from '../assessments/testing/integration-db';

useIntegrationDatabase();
process.env.JWT_SECRET = 'homework-files-integration-secret';
delete process.env.SMTP_USER;
delete process.env.SMTP_PASS;

import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import {
  ClassType,
  HomeworkFileStatus,
  LessonStatus,
  Role,
  SubmissionStatus,
} from '@prisma/client';
import request from 'supertest';
import { JwtStrategy } from '../auth/jwt.strategy';
import { CurriculumController } from '../curriculum/curriculum.controller';
import { CurriculumDocumentsService } from '../curriculum/curriculum-documents.service';
import { CurriculumService } from '../curriculum/curriculum.service';
import { AllExceptionsFilter } from '../filters/http-exception.filter';
import { PrismaModule } from '../prisma.module';
import { PrismaService } from '../prisma.service';
import { UploadsController } from '../uploads/uploads.controller';
import { makeCourse, makeUser, Person } from '../batches/testing/batch-world';
import {
  HOMEWORK_STORAGE,
  HomeworkFilesService,
} from './homework-files.service';
import { SubmissionsController } from './submissions.controller';
import { SubmissionsService } from './submissions.service';
import { MemoryHomeworkStorage } from './testing/memory-homework-storage';

const describeDb = IT_DB_URL ? describe : describe.skip;

const PDF = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n');
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const HTML = '<h1>Hi</h1><script>alert("not on our origin")</script>';

describeDb(
  'Homework files: upload → review → removal (real Postgres, over HTTP)',
  () => {
    jest.setTimeout(180_000);

    let app: INestApplication;
    let prisma: PrismaService;
    let jwt: JwtService;
    let storage: MemoryHomeworkStorage;
    let files: HomeworkFilesService;
    let releaseLock: () => void;

    let teacher: Person;
    let otherTeacher: Person;
    let student: Person;
    let otherStudent: Person;
    let admin: Person;
    let course: { id: string };
    let lessonId: string; // lesson 2 — has homework
    let classId: string; // the student's COMPLETED class for lesson 2
    let otherClassId: string;

    const bearer = (p: Person) => ({
      Authorization: `Bearer ${jwt.sign({ sub: p.id, email: p.email, role: p.role })}`,
    });
    const http = () => request(app.getHttpServer());

    const upload = (
      who: Person,
      parts: { name: string; body: Buffer | string }[],
      scheduledLessonId: string = classId,
    ) => {
      let r = http().post('/uploads/homework').set(bearer(who));
      if (scheduledLessonId)
        r = r.field('scheduledLessonId', scheduledLessonId);
      for (const p of parts) {
        r = r.attach('homework', Buffer.from(p.body), p.name);
      }
      return r;
    };
    const submit = (who: Person, body: object) =>
      http().post('/submissions').set(bearer(who)).send(body);
    const review = (who: Person, id: string, body: object) =>
      http().patch(`/submissions/${id}/review`).set(bearer(who)).send(body);
    const get = (path: string, who?: Person) => {
      const r = http().get(path);
      return who ? r.set(bearer(who)) : r;
    };

    /** Upload + submit one file; returns the submission id and file id. */
    async function handIn(name: string, body: Buffer | string = 'print(1)\n') {
      const up = await upload(student, [{ name, body }]);
      expect(up.status).toBe(201);
      const sub = await submit(student, {
        scheduledLessonId: classId,
        files: [{ id: up.body[0].id }],
        note: 'done!',
      });
      expect(sub.status).toBe(201);
      return {
        submissionId: sub.body.id as string,
        fileId: up.body[0].id as string,
      };
    }

    async function makeClass(studentId: string, teacherProfileId: string) {
      const row = await prisma.scheduledLesson.create({
        data: {
          studentUserId: studentId,
          teacherId: teacherProfileId,
          courseId: course.id,
          lessonNumber: 2,
          lessonId,
          start: new Date(Date.now() - 3 * 86_400_000),
          end: new Date(Date.now() - 3 * 86_400_000 + 3_600_000),
          classType: ClassType.ONE_TO_ONE,
          status: LessonStatus.COMPLETED,
        },
      });
      return row.id;
    }

    beforeAll(async () => {
      releaseLock = await acquireDatabaseLock(IT_DB_URL as string);
      jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
      jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
      jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);

      storage = new MemoryHomeworkStorage();
      const moduleRef = await Test.createTestingModule({
        imports: [PrismaModule, PassportModule],
        controllers: [
          SubmissionsController,
          UploadsController,
          CurriculumController,
        ],
        providers: [
          JwtStrategy,
          SubmissionsService,
          HomeworkFilesService,
          { provide: HOMEWORK_STORAGE, useValue: storage },
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
      files = moduleRef.get(HomeworkFilesService);
      jwt = new JwtService({ secret: process.env.JWT_SECRET });
    }, 200_000);

    afterAll(async () => {
      jest.restoreAllMocks();
      await app?.close();
      releaseLock?.();
    });

    beforeEach(async () => {
      storage.objects.clear();
      storage.deleted = [];
      storage.failDelete = false;
      storage.failPut.clear();
      storage.configured = true;
      await truncateAssessmentData(prisma);
      admin = await makeUser(prisma, 'ops-admin', Role.ADMIN);
      teacher = await makeUser(prisma, 'ms-karim', Role.TEACHER);
      otherTeacher = await makeUser(prisma, 'mr-hasan', Role.TEACHER);
      student = await makeUser(prisma, 'ada-lovelace', Role.STUDENT);
      otherStudent = await makeUser(prisma, 'ben-carson', Role.STUDENT);
      course = await makeCourse(prisma, 'hw-course', 4);
      lessonId = (
        await prisma.lesson.findFirstOrThrow({
          where: { courseId: course.id, order: 2 },
        })
      ).id;
      classId = await makeClass(student.id, teacher.profileId!);
      otherClassId = await makeClass(otherStudent.id, teacher.profileId!);
    });

    // ═══ Student: upload and submit ════════════════════════════════════════════

    describe('student submission', () => {
      it('stores the file in the homework bucket, records it for the right student, lesson and course, and shows it as pending review', async () => {
        const up = await upload(student, [
          { name: 'main.py', body: 'print("hi")\n' },
        ]);
        expect(up.status).toBe(201);
        expect(up.body).toEqual([
          expect.objectContaining({
            name: 'main.py',
            size: 12,
            kind: 'SOURCE',
            id: expect.any(String),
          }),
        ]);
        // Nothing about the storage is handed to the browser.
        expect(JSON.stringify(up.body)).not.toMatch(/homework\/|https?:|r2/i);

        const row = await prisma.homeworkFile.findUniqueOrThrow({
          where: { id: up.body[0].id },
        });
        expect(row).toMatchObject({
          status: HomeworkFileStatus.UPLOADED,
          studentUserId: student.id,
          scheduledLessonId: classId,
          courseId: course.id,
          originalName: 'main.py',
          sizeBytes: 12,
          submissionId: null,
        });
        expect(storage.objects.has(row.objectKey)).toBe(true);
        expect(storage.objects.get(row.objectKey)!.contentType).toBe(
          'text/plain; charset=utf-8',
        );

        const sub = await submit(student, {
          scheduledLessonId: classId,
          files: [{ id: row.id }],
        });
        expect(sub.status).toBe(201);
        expect(sub.body.status).toBe('PENDING');
        expect(sub.body.files).toEqual([
          expect.objectContaining({
            id: row.id,
            name: 'main.py',
            kind: 'SOURCE',
            removed: false,
          }),
        ]);
        const after = await prisma.homeworkFile.findUniqueOrThrow({
          where: { id: row.id },
        });
        expect(after).toMatchObject({
          status: HomeworkFileStatus.ATTACHED,
          submissionId: sub.body.id,
        });
        expect(storage.objects.has(row.objectKey)).toBe(true); // kept until reviewed
      });

      it('the lesson page shows the student their own submission with its files', async () => {
        const { fileId } = await handIn('main.py');
        const page = await get(
          `/curriculum/scheduled-lessons/${classId}/details`,
          student,
        );
        expect(page.status).toBe(200);
        expect(page.body.submission.files).toEqual([
          expect.objectContaining({
            id: fileId,
            name: 'main.py',
            removed: false,
          }),
        ]);
        expect(page.body.submission.homeworkFiles).toBeUndefined();
      });

      it('refuses what is not allowed, before anything is stored', async () => {
        expect(
          (await upload(student, [{ name: 'virus.exe', body: 'MZ' }])).status,
        ).toBe(400);
        expect(
          (await upload(student, [{ name: 'fake.pdf', body: '<html>' }]))
            .status,
        ).toBe(400);
        expect(
          (await upload(student, [{ name: 'empty.py', body: '' }])).status,
        ).toBe(400);
        expect(
          (await upload(student, [{ name: 'a.py', body: 'x' }], '')).status,
        ).toBe(400);
        expect(storage.objects.size).toBe(0);
        expect(await prisma.homeworkFile.count()).toBe(0);
      });

      it('refuses a file over 15 MB', async () => {
        const big = Buffer.alloc(15 * 1024 * 1024 + 1, 97);
        const res = await upload(student, [{ name: 'big.py', body: big }]);
        expect(res.status).toBe(413);
        expect(storage.objects.size).toBe(0);
      });

      it('only a student can upload, and only for their own completed lesson', async () => {
        expect(
          (await upload(teacher, [{ name: 'a.py', body: 'x' }])).status,
        ).toBe(403);
        expect(
          (await upload(student, [{ name: 'a.py', body: 'x' }], otherClassId))
            .status,
        ).toBe(403);
        await prisma.scheduledLesson.update({
          where: { id: classId },
          data: { status: LessonStatus.UPCOMING },
        });
        const early = await upload(student, [{ name: 'a.py', body: 'x' }]);
        expect(early.status).toBe(400);
        expect(early.body.message).toMatch(/not completed yet/);
        expect(storage.objects.size).toBe(0);
        expect(
          (
            await http()
              .post('/uploads/homework')
              .attach('homework', Buffer.from('x'), 'a.py')
          ).status,
        ).toBe(401);
      });

      it('a failed upload is all-or-nothing and clearly reported: nothing is kept and nothing can be submitted', async () => {
        storage.failPut.add('second.py');
        const res = await upload(student, [
          { name: 'first.py', body: 'print(1)' },
          { name: 'second.py', body: 'print(2)' },
        ]);
        expect(res.status).toBe(502);
        expect(res.body.message).toMatch(
          /could not be uploaded.*Nothing was submitted/i,
        );
        expect(storage.objects.size).toBe(0);
        expect(await prisma.homeworkFile.count()).toBe(0);
        expect(await prisma.submission.count()).toBe(0);
      });

      it('says so, and still accepts links, when homework storage is not available', async () => {
        storage.configured = false;
        const res = await upload(student, [{ name: 'a.py', body: 'x' }]);
        expect(res.status).toBe(503);
        expect(res.body.message).toMatch(/not available right now/i);
        const withLink = await submit(student, {
          scheduledLessonId: classId,
          links: ['https://scratch.mit.edu/projects/1'],
        });
        expect(withLink.status).toBe(201);
      });

      it('an upload that never finished cannot be submitted', async () => {
        const up = await upload(student, [{ name: 'a.py', body: 'print(1)' }]);
        const row = await prisma.homeworkFile.findUniqueOrThrow({
          where: { id: up.body[0].id },
        });
        storage.objects.delete(row.objectKey); // the file never made it
        const res = await submit(student, {
          scheduledLessonId: classId,
          files: [{ id: row.id }],
        });
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/did not finish uploading/);
        expect(await prisma.submission.count()).toBe(0);

        // …nor one that is there but not whole.
        storage.objects.set(row.objectKey, {
          body: Buffer.from('pr'),
          contentType: 'text/plain',
        });
        expect(
          (
            await submit(student, {
              scheduledLessonId: classId,
              files: [{ id: row.id }],
            })
          ).status,
        ).toBe(400);
        expect(await prisma.submission.count()).toBe(0);
      });

      it("cannot attach someone else's upload, an unknown id, or one file twice", async () => {
        const theirs = await upload(
          otherStudent,
          [{ name: 'b.py', body: 'x' }],
          otherClassId,
        );
        expect(
          (
            await submit(student, {
              scheduledLessonId: classId,
              files: [{ id: theirs.body[0].id }],
            })
          ).status,
        ).toBe(403);
        expect(
          (
            await submit(student, {
              scheduledLessonId: classId,
              files: [{ id: '00000000-0000-0000-0000-000000000000' }],
            })
          ).status,
        ).toBe(400);
        const mine = await upload(student, [{ name: 'a.py', body: 'x' }]);
        expect(
          (
            await submit(student, {
              scheduledLessonId: classId,
              files: [{ id: mine.body[0].id }, { id: mine.body[0].id }],
            })
          ).status,
        ).toBe(400);
        expect(await prisma.submission.count()).toBe(0);
      });

      it('a duplicate submit request is harmless: one submission, same files, no error', async () => {
        const up = await upload(student, [{ name: 'a.py', body: 'x' }]);
        const body = {
          scheduledLessonId: classId,
          files: [{ id: up.body[0].id }],
        };
        const [a, b] = await Promise.all([
          submit(student, body),
          submit(student, body),
        ]);
        expect(
          [a.status, b.status].filter((s) => s === 201).length,
        ).toBeGreaterThanOrEqual(1);
        expect(await prisma.submission.count()).toBe(1);
        const again = await submit(student, body);
        expect(again.status).toBe(201);
        expect(again.body.files).toHaveLength(1);
        const rows = await prisma.homeworkFile.findMany();
        expect(rows).toHaveLength(1);
        expect(rows[0].status).toBe(HomeworkFileStatus.ATTACHED);
        expect(storage.objects.has(rows[0].objectKey)).toBe(true);
      });

      it('handing in different work replaces the old: its file is removed, only the new one is shown', async () => {
        const first = await handIn('old.py', 'print("old")');
        const oldRow = await prisma.homeworkFile.findUniqueOrThrow({
          where: { id: first.fileId },
        });
        const up = await upload(student, [
          { name: 'new.py', body: 'print("new")' },
        ]);
        const sub = await submit(student, {
          scheduledLessonId: classId,
          files: [{ id: up.body[0].id }],
        });
        expect(sub.status).toBe(201);
        expect(sub.body.files).toEqual([
          expect.objectContaining({ name: 'new.py' }),
        ]);
        expect(storage.objects.has(oldRow.objectKey)).toBe(false);
        expect(
          await prisma.homeworkFile.findUniqueOrThrow({
            where: { id: first.fileId },
          }),
        ).toMatchObject({
          status: HomeworkFileStatus.DELETED,
          deleteReason: 'REPLACED',
        });
        expect(await prisma.submission.count()).toBe(1);
      });
    });

    // ═══ Teacher: preview and download ═════════════════════════════════════════

    describe('opening a file', () => {
      async function fileNamed(name: string, body: Buffer | string) {
        const { fileId } = await handIn(name, body);
        return fileId;
      }

      it('the teacher’s review queue lists each file with how it opens, never with a link', async () => {
        await handIn('main.py');
        const res = await get('/submissions?status=PENDING', teacher);
        expect(res.status).toBe(200);
        expect(res.body[0].files[0]).toMatchObject({
          name: 'main.py',
          kind: 'SOURCE',
          removed: false,
        });
        expect(res.body[0].files[0].url).toBeUndefined();
      });

      it('code — HTML included — is opened in Lumexa’s viewer as text, never from storage and never as a page', async () => {
        for (const name of [
          'main.py',
          'app.js',
          'Main.java',
          'style.css',
          'index.html',
        ]) {
          const id = await fileNamed(
            name,
            name === 'index.html' ? HTML : 'x = 1\n',
          );
          const access = await get(`/submissions/files/${id}/access`, teacher);
          expect(access.status).toBe(200);
          expect(access.body).toMatchObject({
            kind: 'SOURCE',
            viewerPath: `/homework-viewer/${id}`,
          });
          expect(access.body.url).toBeUndefined();
          await prisma.submission.deleteMany(); // next hand-in starts fresh
          await prisma.homeworkFile.deleteMany();
        }
      });

      it('the viewer’s text comes as JSON (never as HTML) with nosniff and no caching', async () => {
        const id = await fileNamed('index.html', HTML);
        const res = await get(`/submissions/files/${id}/text`, teacher);
        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toMatch(/application\/json/);
        expect(res.headers['x-content-type-options']).toBe('nosniff');
        expect(res.headers['cache-control']).toBe('no-store');
        expect(res.body).toMatchObject({
          name: 'index.html',
          kind: 'SOURCE',
          text: HTML,
        });
      });

      it('a notebook opens in the viewer too', async () => {
        const id = await fileNamed(
          'lab.ipynb',
          JSON.stringify({ cells: [], nbformat: 4 }),
        );
        const access = await get(`/submissions/files/${id}/access`, teacher);
        expect(access.body).toMatchObject({
          kind: 'NOTEBOOK',
          viewerPath: `/homework-viewer/${id}`,
        });
        expect(
          (await get(`/submissions/files/${id}/text`, teacher)).body.text,
        ).toContain('nbformat');
      });

      it('a PDF opens inline in the browser from a short-lived link of the right type', async () => {
        const id = await fileNamed('report.pdf', PDF);
        const access = await get(`/submissions/files/${id}/access`, teacher);
        expect(access.body).toMatchObject({ kind: 'PDF', name: 'report.pdf' });
        const url = new URL(access.body.url);
        expect(url.searchParams.get('type')).toBe('application/pdf');
        expect(url.searchParams.get('cd')).toMatch(/^inline;/);
        expect(
          Date.parse(access.body.expiresAt) - Date.now(),
        ).toBeLessThanOrEqual(5 * 60_000);
      });

      it('formats a browser cannot show — .sb3, .rbxl — download normally', async () => {
        for (const name of ['game.sb3', 'world.rbxl']) {
          const id = await fileNamed(name, 'PK-binary');
          const access = await get(`/submissions/files/${id}/access`, teacher);
          expect(access.body).toMatchObject({ kind: 'DOWNLOAD', name });
          const url = new URL(access.body.url);
          expect(url.searchParams.get('type')).toBe('application/octet-stream');
          expect(url.searchParams.get('cd')).toMatch(/^attachment;/);
          await prisma.submission.deleteMany();
          await prisma.homeworkFile.deleteMany();
        }
      });

      it('the viewer’s Download button gets an attachment link for any file, code included', async () => {
        const id = await fileNamed('main.py', 'x = 1');
        const res = await get(
          `/submissions/files/${id}/access?download=1`,
          teacher,
        );
        expect(res.status).toBe(200);
        expect(res.body.url).toBeTruthy();
        expect(new URL(res.body.url).searchParams.get('cd')).toMatch(
          /^attachment;/,
        );
        expect(new URL(res.body.url).searchParams.get('type')).toBe(
          'application/octet-stream',
        );
        expect(
          (
            await get(
              `/submissions/files/${id}/access?download=1`,
              otherTeacher,
            )
          ).status,
        ).toBe(403);
      });

      it('a code file is never served from storage, and a download is never shown as text', async () => {
        const code = await fileNamed('main.py', 'x');
        expect(
          (await get(`/submissions/files/${code}/access`, teacher)).body.url,
        ).toBeUndefined();
        await prisma.submission.deleteMany();
        await prisma.homeworkFile.deleteMany();
        const sb3 = await fileNamed('game.sb3', 'PK');
        expect(
          (await get(`/submissions/files/${sb3}/text`, teacher)).status,
        ).toBe(400);
      });

      it('an image opens inline; a file with a binary body is not shown as text', async () => {
        const png = await fileNamed('shot.png', PNG);
        const access = await get(`/submissions/files/${png}/access`, teacher);
        expect(access.body.kind).toBe('IMAGE');
        expect(new URL(access.body.url).searchParams.get('type')).toBe(
          'image/png',
        );
        await prisma.submission.deleteMany();
        await prisma.homeworkFile.deleteMany();
        const odd = await fileNamed(
          'data.txt',
          Buffer.from([0x68, 0x00, 0x69]),
        );
        expect(
          (await get(`/submissions/files/${odd}/text`, teacher)).body,
        ).toMatchObject({ binary: true });
      });

      it('only the student, the teacher it was sent to, and an admin may open it', async () => {
        const id = await fileNamed('main.py', 'x');
        const path = `/submissions/files/${id}/access`;
        expect((await get(path, student)).status).toBe(200);
        expect((await get(path, teacher)).status).toBe(200);
        expect((await get(path, admin)).status).toBe(200);
        expect((await get(path, otherTeacher)).status).toBe(403);
        expect((await get(path, otherStudent)).status).toBe(403);
        expect((await get(path)).status).toBe(401);
        expect(
          (await get(`/submissions/files/${id}/text`, otherTeacher)).status,
        ).toBe(403);
        expect(
          (await get(`/submissions/files/${id}/text`, otherStudent)).status,
        ).toBe(403);
        expect(
          (await get('/submissions/files/nope/access', teacher)).status,
        ).toBe(404);
      });
    });

    // ═══ Review, then removal ══════════════════════════════════════════════════

    describe('submitting the review', () => {
      it('saves the review first, then removes the file from R2 and records it — keeping the submission, grade and feedback', async () => {
        const { submissionId, fileId } = await handIn('main.py');
        const row = await prisma.homeworkFile.findUniqueOrThrow({
          where: { id: fileId },
        });
        expect(storage.objects.has(row.objectKey)).toBe(true);

        const res = await review(teacher, submissionId, {
          status: 'APPROVED',
          rating: 5,
          feedback: 'Great work!',
        });
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({
          status: 'APPROVED',
          rating: 5,
          feedback: 'Great work!',
          homeworkFilesRemoved: 1,
          homeworkFilesPendingRemoval: 0,
        });

        expect(storage.objects.has(row.objectKey)).toBe(false);
        expect(storage.deleted).toEqual([row.objectKey]);
        const after = await prisma.homeworkFile.findUniqueOrThrow({
          where: { id: fileId },
        });
        expect(after).toMatchObject({
          status: HomeworkFileStatus.DELETED,
          deleteReason: 'REVIEWED',
          lastDeleteError: null,
        });
        expect(after.deletedAt).not.toBeNull();
        const sub = await prisma.submission.findUniqueOrThrow({
          where: { id: submissionId },
        });
        expect(sub).toMatchObject({
          status: SubmissionStatus.APPROVED,
          rating: 5,
          feedback: 'Great work!',
          note: 'done!',
        });
        expect(sub.reviewedAt).not.toBeNull();

        // The record of the work stays; the file does not.
        const page = await get(
          `/curriculum/scheduled-lessons/${classId}/details`,
          student,
        );
        expect(page.body.submission).toMatchObject({
          status: 'APPROVED',
          rating: 5,
          feedback: 'Great work!',
        });
        expect(page.body.submission.files).toEqual([
          expect.objectContaining({ name: 'main.py', removed: true }),
        ]);
        const access = await get(
          `/submissions/files/${fileId}/access`,
          teacher,
        );
        expect(access.status).toBe(410);
        expect(access.body.message).toMatch(/removed after the review/i);
      });

      it('NEEDS_CHANGES also removes the file, and a resubmission starts clean', async () => {
        const { submissionId, fileId } = await handIn('main.py');
        const res = await review(teacher, submissionId, {
          status: 'NEEDS_CHANGES',
          feedback: 'Add comments',
        });
        expect(res.status).toBe(200);
        expect(
          (
            await prisma.homeworkFile.findUniqueOrThrow({
              where: { id: fileId },
            })
          ).status,
        ).toBe(HomeworkFileStatus.DELETED);

        const up = await upload(student, [
          { name: 'main2.py', body: 'print(2)' },
        ]);
        const again = await submit(student, {
          scheduledLessonId: classId,
          files: [{ id: up.body[0].id }],
        });
        expect(again.status).toBe(201);
        expect(again.body).toMatchObject({
          status: 'PENDING',
          resubmissionCount: 1,
        });
        expect(again.body.files).toEqual([
          expect.objectContaining({ name: 'main2.py', removed: false }),
        ]);
        const fresh = await prisma.homeworkFile.findUniqueOrThrow({
          where: { id: up.body[0].id },
        });
        expect(storage.objects.has(fresh.objectKey)).toBe(true); // the new, unreviewed file is kept
      });

      it('a review that cannot be saved removes nothing', async () => {
        const { submissionId, fileId } = await handIn('main.py');
        const row = await prisma.homeworkFile.findUniqueOrThrow({
          where: { id: fileId },
        });
        // Invalid: changes requested with no feedback at all.
        expect(
          (await review(teacher, submissionId, { status: 'NEEDS_CHANGES' }))
            .status,
        ).toBe(400);
        // Not the submission's teacher.
        expect(
          (await review(otherTeacher, submissionId, { status: 'APPROVED' }))
            .status,
        ).toBe(403);
        // A student cannot review.
        expect(
          (await review(student, submissionId, { status: 'APPROVED' })).status,
        ).toBe(403);
        expect(
          (
            await prisma.homeworkFile.findUniqueOrThrow({
              where: { id: fileId },
            })
          ).status,
        ).toBe(HomeworkFileStatus.ATTACHED);
        expect(storage.objects.has(row.objectKey)).toBe(true);
        expect(storage.deleted).toEqual([]);
        expect(
          (
            await prisma.submission.findUniqueOrThrow({
              where: { id: submissionId },
            })
          ).status,
        ).toBe(SubmissionStatus.PENDING);
      });

      it('if R2 refuses the removal the review still stands, the file stays marked, and a retry removes it', async () => {
        const { submissionId, fileId } = await handIn('main.py');
        const row = await prisma.homeworkFile.findUniqueOrThrow({
          where: { id: fileId },
        });
        storage.failDelete = true;

        const res = await review(teacher, submissionId, {
          status: 'APPROVED',
          rating: 4,
        });
        expect(res.status).toBe(200); // the review is saved whatever happens to the file
        expect(res.body).toMatchObject({
          status: 'APPROVED',
          rating: 4,
          homeworkFilesRemoved: 0,
          homeworkFilesPendingRemoval: 1,
        });
        const stuck = await prisma.homeworkFile.findUniqueOrThrow({
          where: { id: fileId },
        });
        expect(stuck).toMatchObject({
          status: HomeworkFileStatus.DELETE_PENDING,
          deleteAttempts: 1,
        });
        expect(stuck.lastDeleteError).toMatch(/R2 unreachable/);
        expect(storage.objects.has(row.objectKey)).toBe(true);
        // The file is no longer offered to anyone while it waits to go.
        expect(
          (await get(`/submissions/files/${fileId}/access`, teacher)).status,
        ).toBe(410);

        // The sweep right away waits out the backoff; still failing, still pending.
        expect(await files.runSweep(new Date())).toMatchObject({ removed: 0 });
        // Later, with R2 reachable again, the sweep finishes the job.
        storage.failDelete = false;
        const later = new Date(Date.now() + 2 * 3_600_000);
        expect(await files.runSweep(later)).toMatchObject({
          removed: 1,
          stillPending: 0,
        });
        expect(storage.objects.has(row.objectKey)).toBe(false);
        expect(
          await prisma.homeworkFile.findUniqueOrThrow({
            where: { id: fileId },
          }),
        ).toMatchObject({
          status: HomeworkFileStatus.DELETED,
          lastDeleteError: null,
        });
      });

      it('reviewing twice is harmless', async () => {
        const { submissionId } = await handIn('main.py');
        expect(
          (
            await review(teacher, submissionId, {
              status: 'APPROVED',
              rating: 5,
            })
          ).status,
        ).toBe(200);
        const again = await review(teacher, submissionId, {
          status: 'APPROVED',
          rating: 5,
        });
        expect(again.status).toBe(200);
        expect(again.body.homeworkFilesRemoved).toBe(0);
        expect(storage.deleted).toHaveLength(1);
      });

      it('a submission with only links reviews fine (nothing to remove)', async () => {
        const sub = await submit(student, {
          scheduledLessonId: classId,
          links: ['https://replit.com/@ada/x'],
        });
        const res = await review(teacher, sub.body.id, { status: 'APPROVED' });
        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({
          homeworkFilesRemoved: 0,
          homeworkFilesPendingRemoval: 0,
        });
      });
    });

    // ═══ Scheduled clean-up ════════════════════════════════════════════════════

    describe('scheduled clean-up', () => {
      const daysFromNow = (d: number) => new Date(Date.now() + d * 86_400_000);

      it('removes uploads that were never submitted, but not fresh ones', async () => {
        const stale = await upload(student, [{ name: 'stale.py', body: 'x' }]);
        const fresh = await upload(student, [{ name: 'fresh.py', body: 'y' }]);
        await prisma.homeworkFile.update({
          where: { id: stale.body[0].id },
          data: { createdAt: new Date(Date.now() - 30 * 3_600_000) },
        });
        const out = await files.runSweep();
        expect(out.removed).toBe(1);
        expect(
          (
            await prisma.homeworkFile.findUniqueOrThrow({
              where: { id: stale.body[0].id },
            })
          ).status,
        ).toBe(HomeworkFileStatus.DELETED);
        expect(
          (
            await prisma.homeworkFile.findUniqueOrThrow({
              where: { id: fresh.body[0].id },
            })
          ).status,
        ).toBe(HomeworkFileStatus.UPLOADED);
        expect(storage.objects.size).toBe(1);
      });

      it('NEVER removes the file of a submission that is still waiting for review, however old', async () => {
        const { fileId } = await handIn('main.py');
        const row = await prisma.homeworkFile.findUniqueOrThrow({
          where: { id: fileId },
        });
        await prisma.submission.updateMany({
          data: { submittedAt: daysFromNow(-90) },
        });
        await prisma.homeworkFile.update({
          where: { id: fileId },
          data: { createdAt: daysFromNow(-90), attachedAt: daysFromNow(-90) },
        });
        for (const now of [new Date(), daysFromNow(30), daysFromNow(365)]) {
          expect(await files.runSweep(now)).toMatchObject({
            marked: 0,
            removed: 0,
          });
        }
        expect(
          (
            await prisma.homeworkFile.findUniqueOrThrow({
              where: { id: fileId },
            })
          ).status,
        ).toBe(HomeworkFileStatus.ATTACHED);
        expect(storage.objects.has(row.objectKey)).toBe(true);
        expect(storage.deleted).toEqual([]);
      });

      it('removes the file of a reviewed submission whose removal was never recorded', async () => {
        const { submissionId, fileId } = await handIn('main.py');
        // A review saved, then the server died before marking the file.
        await prisma.submission.update({
          where: { id: submissionId },
          data: {
            status: SubmissionStatus.APPROVED,
            reviewedAt: new Date(Date.now() - 3_600_000),
          },
        });
        expect(await files.runSweep()).toMatchObject({ marked: 1, removed: 1 });
        expect(
          (
            await prisma.homeworkFile.findUniqueOrThrow({
              where: { id: fileId },
            })
          ).status,
        ).toBe(HomeworkFileStatus.DELETED);
      });

      it('removes files whose submission no longer exists', async () => {
        const { submissionId, fileId } = await handIn('main.py');
        await prisma.submission.delete({ where: { id: submissionId } });
        expect(
          (
            await prisma.homeworkFile.findUniqueOrThrow({
              where: { id: fileId },
            })
          ).submissionId,
        ).toBeNull();
        await prisma.homeworkFile.update({
          where: { id: fileId },
          data: { createdAt: daysFromNow(-1) },
        });
        expect(await files.runSweep()).toMatchObject({ marked: 1, removed: 1 });
      });

      it('keeps retrying a removal that keeps failing, never giving up', async () => {
        const { submissionId, fileId } = await handIn('main.py');
        storage.failDelete = true;
        await review(teacher, submissionId, { status: 'APPROVED' });
        for (let i = 1; i <= 4; i++) {
          await files.runSweep(new Date(Date.now() + i * 2 * 3_600_000));
        }
        const row = await prisma.homeworkFile.findUniqueOrThrow({
          where: { id: fileId },
        });
        expect(row.status).toBe(HomeworkFileStatus.DELETE_PENDING);
        expect(row.deleteAttempts).toBeGreaterThanOrEqual(4);
      });
    });
  },
);
