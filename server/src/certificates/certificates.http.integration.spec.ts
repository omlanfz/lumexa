// Certificates of Completion over real HTTP: the whole app is booted (every module,
// guard, pipe and filter exactly as in production) against a REAL Postgres, with real
// login tokens, real classes and the real class-finalization path. Only the three
// things that need the outside world are replaced: the R2 bucket (in memory — but
// write-once like the real one), the Chromium renderer (a fake that records what it
// was asked to print) and the SMTP transport (a fake that records what was sent).
//
// This is where the rules are proven end to end:
//   - finishing a programme's FINAL class opens exactly one pending review;
//   - only an ADMIN can approve / dismiss / replace / revoke / resend; teachers and
//     students are refused;
//   - nothing exists (no ID, no files, no record) until an admin approves;
//   - a failure in rendering or storing leaves NO certificate, NO email and a review
//     that can simply be approved again — and what had been stored is never deleted;
//   - corrections replace, never overwrite; revocation never deletes;
//   - verification is public but shows certificate facts only;
//   - the email carries the stored PDF and is never sent twice.
//
// Skipped unless ASSESSMENT_INTEGRATION_DATABASE_URL points at a throwaway, fully
// migrated database — see ../assessments/testing/integration-db.ts.

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument --
   supertest hands back untyped JSON bodies; the assertions below are what check their shape */

import 'reflect-metadata';
import {
  IT_DB_URL,
  acquireDatabaseLock,
  truncateAssessmentData,
  useIntegrationDatabase,
} from '../assessments/testing/integration-db';

useIntegrationDatabase();
process.env.JWT_SECRET = 'http-spec-jwt-secret-that-is-long-enough';
process.env.STRIPE_SECRET_KEY ??= 'sk_test_not_a_real_key';
process.env.FRONTEND_URL = 'https://frontend.example.test';
process.env.NODE_ENV = 'test';
delete process.env.SMTP_USER;
delete process.env.SMTP_PASS;

import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage } from '@nestjs/throttler';
import type { ThrottlerStorageService } from '@nestjs/throttler';
import { LessonStatus, Role } from '@prisma/client';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../app.module';
import { makeUser } from '../batches/testing/batch-world';
import type { Person } from '../batches/testing/batch-world';
import { ClassFinalizationService } from '../classroom/class-finalization.service';
import { EmailService } from '../email/email.service';
import { AllExceptionsFilter } from '../filters/http-exception.filter';
import { PrismaService } from '../prisma.service';
import { utcToDhakaParts } from '../scheduling/dhaka-time.util';
import { CertificateEmailService } from './certificate-email.service';
import { CERTIFICATE_ID_PATTERN } from './certificate-id';
import { PUBLIC_VERIFY_LIMIT_PER_MINUTE } from './certificate-limits';
import { CertificateReviewsService } from './certificate-reviews.service';
import {
  CertificateRenderError,
  CERTIFICATE_RENDERER,
} from './certificate-renderer.service';
import { CERTIFICATE_STORAGE } from './certificate-storage.service';
import { CERTIFICATE_CATEGORIES } from './certificate-themes';
import { formatCertificateDate } from './template/certificate-template';
import { FakeCertificateRenderer } from './testing/fake-certificate-renderer';
import { MemoryCertificateStorage } from './testing/memory-certificate-storage';

const describeDb = IT_DB_URL ? describe : describe.skip;
const FRONTEND = 'https://frontend.example.test';

describeDb(
  'Certificates (real app and Postgres; R2, Chromium and SMTP faked)',
  () => {
    jest.setTimeout(240_000);

    let app: INestApplication;
    let prisma: PrismaService;
    let jwt: JwtService;
    let finalization: ClassFinalizationService;
    let reviews: CertificateReviewsService;
    let emails: CertificateEmailService;
    let releaseLock: () => void;
    const storage = new MemoryCertificateStorage();
    const renderer = new FakeCertificateRenderer();
    /** Every email the (fake) SMTP server was asked to send. */
    let sent: {
      to: string;
      subject: string;
      html: string;
      attachments?: {
        filename: string;
        content: Buffer;
        contentType?: string;
      }[];
    }[];
    let smtpFails: boolean;

    let admin: Person;
    let admin2: Person;
    let teacher: Person;
    let student: Person;
    let otherStudent: Person;
    let course: { id: string; title: string; slug: string };
    let seq = 0;

    const as = (p: Person) => ({
      Authorization: `Bearer ${jwt.sign({ sub: p.id, email: p.email, role: p.role })}`,
    });
    const http = () => request(app.getHttpServer() as App);
    const adminGet = (path: string) =>
      http().get(`/admin/certificates${path}`).set(as(admin));
    const adminPost = (path: string, body: object = {}, who: Person = admin) =>
      http().post(`/admin/certificates${path}`).set(as(who)).send(body);

    function clearRateLimits() {
      const limiter = app.get<ThrottlerStorageService>(ThrottlerStorage);
      limiter.onApplicationShutdown();
      limiter.storage.clear();
    }

    const unique = () => `${Date.now().toString(36)}${(seq++).toString(36)}`;

    /** The congratulatory emails only (finishing a class also sends the platform's
     * own "achievement unlocked" badge email, which is not what these specs are about). */
    const certificateMails = () =>
      sent.filter((m) =>
        m.subject.includes('Your Lumexa certificate is ready'),
      );

    /** Polls until `probe` returns something truthy (or fails after `ms`). */
    async function waitFor<T>(
      probe: () => Promise<T | false | null | undefined>,
      what: string,
      ms = 10_000,
    ): Promise<T> {
      const deadline = Date.now() + ms;
      for (;;) {
        const found = await probe();
        if (found) return found;
        if (Date.now() > deadline)
          throw new Error(`Timed out waiting for ${what}`);
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
    }

    /** The certificate's email reaches a settled state (the send is fire-and-forget). */
    const emailSettled = (
      certificateId: string,
      wanted: string[] = ['SENT', 'FAILED', 'SKIPPED'],
    ) =>
      waitFor(async () => {
        const row = await prisma.certificate.findUnique({
          where: { certificateId },
        });
        return row && wanted.includes(row.emailStatus) ? row : null;
      }, `the email of ${certificateId} to settle`);

    /** Approves a review as the admin and returns the issued certificate's view. */
    async function approveReview(
      reviewId: string,
      over: Record<string, unknown> = {},
    ) {
      const res = await adminPost(
        `/reviews/${reviewId}/approve`,
        details(over),
      ).expect(201);
      return res.body as {
        id: string;
        certificateId: string;
        issueDate: string;
        [k: string]: unknown;
      };
    }

    /** A programme taken to its end and approved: the common starting point. */
    async function issueCertificate(
      over: Record<string, unknown> = {},
      who: Person = student,
    ) {
      const review = await finishProgram(who, course, 3);
      const cert = await approveReview(review.id, over);
      await emailSettled(cert.certificateId);
      return { review, cert };
    }

    /** A programme of `lessons` lessons in the given category. */
    async function makeProgram(
      category: string,
      lessons: number,
      title = 'AI Builder',
    ) {
      const id = unique();
      const created = await prisma.course.create({
        data: {
          slug: `prog-${id}`,
          title,
          category,
          level: 'STARTER',
          sessions: lessons,
        },
      });
      for (let order = 1; order <= lessons; order++) {
        await prisma.lesson.create({
          data: { courseId: created.id, title: `Lesson ${order}`, order },
        });
      }
      return created;
    }

    /** A student's classes of a programme: lesson numbers `done` are taken (status
     * COMPLETED, an hour apart from 2026-10-01 10:00 UTC), `pending` are UPCOMING. */
    async function scheduleClasses(
      who: Person,
      prog: { id: string },
      done: number[],
      pending: number[] = [],
    ) {
      const rows: Record<number, string> = {};
      for (const [i, lessonNumber] of [...done, ...pending].entries()) {
        const start = new Date(Date.UTC(2026, 9, 1 + i * 7, 10, 0));
        const isDone = done.includes(lessonNumber);
        const row = await prisma.scheduledLesson.create({
          data: {
            studentUserId: who.id,
            teacherId: teacher.profileId!,
            courseId: prog.id,
            lessonNumber,
            start,
            end: new Date(start.getTime() + 45 * 60_000),
            classType: 'ONE_TO_ONE',
            status: isDone ? LessonStatus.COMPLETED : LessonStatus.UPCOMING,
            studentJoinedAt: start,
            teacherJoinedAt: start,
          },
        });
        rows[lessonNumber] = row.id;
      }
      return rows;
    }

    const finalizeAs = (lessonId: string) =>
      finalization.finalizeLesson(lessonId, {
        outcome: 'COMPLETED',
        actor: { role: 'ADMIN', userId: admin.id },
      });

    /** Takes a student through a whole programme and returns its pending review. */
    async function finishProgram(
      who: Person,
      prog: { id: string },
      lessons: number,
    ) {
      const all = Array.from({ length: lessons }, (_, i) => i + 1);
      const rows = await scheduleClasses(who, prog, all.slice(0, -1), [
        lessons,
      ]);
      await finalizeAs(rows[lessons]);
      return prisma.certificateReview.findUniqueOrThrow({
        where: {
          studentUserId_courseId: { studentUserId: who.id, courseId: prog.id },
        },
      });
    }

    const details = (over: Record<string, unknown> = {}) => ({
      recipientName: 'Nusrat Jahan Tamanna',
      programName: 'AI Builder',
      completionDate: '2026-10-29',
      ...over,
    });

    beforeAll(async () => {
      releaseLock = await acquireDatabaseLock(IT_DB_URL!);
      for (const level of ['log', 'warn', 'error', 'debug'] as const) {
        jest.spyOn(Logger.prototype, level).mockImplementation(() => undefined);
      }
      const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(CERTIFICATE_STORAGE)
        .useValue(storage)
        .overrideProvider(CERTIFICATE_RENDERER)
        .useValue(renderer)
        .compile();
      app = moduleRef.createNestApplication();
      app.useGlobalPipes(
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
        }),
      );
      app.useGlobalFilters(new AllExceptionsFilter());
      await app.init();
      prisma = app.get(PrismaService);
      jwt = new JwtService({ secret: process.env.JWT_SECRET });
      finalization = app.get(ClassFinalizationService);
      reviews = app.get(CertificateReviewsService);
      emails = app.get(CertificateEmailService);
      // A fake SMTP server: the real EmailService does everything else (journal, dedupe key…).
      Reflect.set(app.get(EmailService), 'transporter', {
        sendMail: (message: (typeof sent)[number]) => {
          if (smtpFails) return Promise.reject(new Error('SMTP unavailable'));
          sent.push(message);
          return Promise.resolve({ messageId: `m-${sent.length}` });
        },
      });
    });

    afterAll(async () => {
      await emails?.idle();
      await app?.close();
      jest.restoreAllMocks();
      releaseLock?.();
    });

    // An approval sends its email in the background; let it finish before the next
    // spec wipes the tables, so one spec's mail can never land in another's.
    afterEach(async () => {
      await emails.idle();
    });

    beforeEach(async () => {
      clearRateLimits();
      process.env.FRONTEND_URL = FRONTEND;
      storage.objects.clear();
      storage.writeLog = [];
      storage.failWritesMatching = [];
      storage.down = false;
      storage.configured = true;
      renderer.calls = [];
      renderer.previews = [];
      renderer.failWith = null;
      sent = [];
      smtpFails = false;
      await truncateAssessmentData(prisma);
      await prisma.auditLog.deleteMany({});
      admin = await makeUser(prisma, 'ops-admin', Role.ADMIN);
      admin2 = await makeUser(prisma, 'second-admin', Role.ADMIN);
      teacher = await makeUser(prisma, 'ms-karim', Role.TEACHER);
      student = await makeUser(prisma, 'nusrat-student', Role.STUDENT, {
        whatsappNumber: '+8801700000000',
        age: 11,
        grade: 'Grade 6',
        billingContactEmail: 'parent-of-nusrat@example.com',
      });
      otherStudent = await makeUser(prisma, 'ben-student', Role.STUDENT);
      course = await makeProgram('AI Builder', 3);
    });

    // ═══ Access: only an admin can manage certificates ═════════════════════════

    // ═══ Ordinary use is never rate limited ════════════════════════════════════

    describe('rate limits', () => {
      it('signed-in screens can refresh far more often than the app-wide default of 20 a minute', async () => {
        await issueCertificate();
        clearRateLimits();
        // the admin menu badge + page refreshes, and a student's home page — one
        // after another (supertest opens a listener per call, so a burst of
        // simultaneous calls would reset connections for reasons of its own)
        const statuses: number[] = [];
        for (let i = 0; i < 60; i++) {
          statuses.push((await adminGet('/summary')).status);
          statuses.push(
            (await http().get('/certificates/me/achievement').set(as(student)))
              .status,
          );
        }
        expect(statuses.every((status) => status === 200)).toBe(true);
      });
    });

    describe('who may do what', () => {
      let reviewId: string;
      let certificateId: string;

      beforeEach(async () => {
        const review = await finishProgram(student, course, 3);
        reviewId = review.id;
        const approved = await adminPost(
          `/reviews/${reviewId}/approve`,
          details(),
        );
        certificateId = approved.body.certificateId;
      });

      const adminRoutes: [string, string, () => object][] = [
        ['get', '/status', () => ({})],
        ['get', '/summary', () => ({})],
        ['get', '/reviews', () => ({})],
        ['get', '/issued', () => ({})],
        ['get', `/CERT`, () => ({})],
        ['get', `/CERT/history`, () => ({})],
        ['get', `/CERT/pdf`, () => ({})],
        ['get', `/CERT/image`, () => ({})],
        ['post', '/reviews/scan', () => ({})],
        ['post', '/reviews/REVIEW/preview', () => details()],
        ['post', '/reviews/REVIEW/approve', () => details()],
        ['post', '/reviews/REVIEW/dismiss', () => ({ reason: 'no' })],
        ['post', '/reviews/REVIEW/reopen', () => ({})],
        [
          'post',
          '/CERT/replace',
          () => ({ reason: 'typo', recipientName: 'Nusrat Tamanna' }),
        ],
        ['post', '/CERT/revoke', () => ({ reason: 'mistake' })],
        ['post', '/CERT/resend-email', () => ({})],
      ];
      const urlOf = (path: string) =>
        `/admin/certificates${path.replace('CERT', certificateId).replace('REVIEW', reviewId)}`;

      it.each(adminRoutes)(
        '%s /admin/certificates%s needs a login',
        async (method, path, body) => {
          const res = await (http() as any)[method](urlOf(path)).send(body());
          expect(res.status).toBe(401);
        },
      );

      it.each(adminRoutes)(
        '%s /admin/certificates%s is refused to a TEACHER',
        async (method, path, body) => {
          const res = await (http() as any)
            [method](urlOf(path))
            .set(as(teacher))
            .send(body());
          expect(res.status).toBe(403);
        },
      );

      it.each(adminRoutes)(
        '%s /admin/certificates%s is refused to a STUDENT',
        async (method, path, body) => {
          const res = await (http() as any)
            [method](urlOf(path))
            .set(as(student))
            .send(body());
          expect(res.status).toBe(403);
        },
      );

      it('a teacher can neither see nor change anything — and nothing changed', async () => {
        const before = await prisma.certificate.findMany();
        await http()
          .post(urlOf('/CERT/revoke'))
          .set(as(teacher))
          .send({ reason: 'x' })
          .expect(403);
        await http()
          .post(urlOf('/CERT/replace'))
          .set(as(teacher))
          .send({ reason: 'x', recipientName: 'Someone Else' })
          .expect(403);
        expect(await prisma.certificate.findMany()).toEqual(before);
        expect(storage.writeLog).toHaveLength(2); // only the original issuance ever wrote
      });

      it('an admin is allowed', async () => {
        await adminGet('/status').expect(200);
        await adminGet('/summary').expect(200);
        await adminGet('/issued').expect(200);
        await adminGet(`/${certificateId}`).expect(200);
      });

      it('a teacher cannot use the student routes either, and neither can an admin', async () => {
        await http().get('/certificates/me').set(as(teacher)).expect(403);
        await http().get('/certificates/me').set(as(admin)).expect(403);
        await http().get('/certificates/me').expect(401);
        await http()
          .get(`/certificates/me/${certificateId}/pdf`)
          .set(as(teacher))
          .expect(403);
      });

      it('a student sees only their own certificates and files', async () => {
        const mine = await http()
          .get('/certificates/me')
          .set(as(student))
          .expect(200);
        expect(
          mine.body.map((c: { certificateId: string }) => c.certificateId),
        ).toEqual([certificateId]);
        const theirs = await http()
          .get('/certificates/me')
          .set(as(otherStudent))
          .expect(200);
        expect(theirs.body).toEqual([]);
        await http()
          .get(`/certificates/me/${certificateId}/pdf`)
          .set(as(otherStudent))
          .expect(404);
        await http()
          .get(`/certificates/me/${certificateId}/image`)
          .set(as(otherStudent))
          .expect(404);
        await http()
          .post(`/certificates/me/${certificateId}/seen`)
          .set(as(otherStudent))
          .expect(404);
      });

      it('verification is public (no login)', async () => {
        await http().get(`/certificates/verify/${certificateId}`).expect(200);
      });

      it('there is no way to delete a certificate over HTTP', async () => {
        for (const path of [
          `/admin/certificates/${certificateId}`,
          `/certificates/me/${certificateId}`,
          `/certificates/verify/${certificateId}`,
        ]) {
          for (const who of [admin, student, teacher]) {
            const res = await http().delete(path).set(as(who));
            expect([404, 405]).toContain(res.status);
          }
        }
        expect(await prisma.certificate.count()).toBe(1);
      });
    });

    // ═══ The trigger: the final class opens exactly one pending review ═════════

    describe('finishing the final scheduled class', () => {
      it('opens exactly ONE pending review for the admin — and issues nothing', async () => {
        const rows = await scheduleClasses(student, course, [1, 2], [3]);
        expect(await prisma.certificateReview.count()).toBe(0);

        await finalizeAs(rows[3]);

        const all = await prisma.certificateReview.findMany();
        expect(all).toHaveLength(1);
        expect(all[0]).toMatchObject({
          studentUserId: student.id,
          courseId: course.id,
          status: 'PENDING',
          source: 'CLASS_FINALIZED',
          finalClassId: rows[3],
        });
        // The prompt only asks a human to look: no ID, no files, no record, no email.
        expect(await prisma.certificate.count()).toBe(0);
        expect(storage.objects.size).toBe(0);
        expect(renderer.calls).toHaveLength(0);
        expect(certificateMails()).toHaveLength(0);
      });

      it("is not created by an earlier class, only by the programme's last one", async () => {
        const rows = await scheduleClasses(student, course, [1], [2, 3]);
        await finalizeAs(rows[2]);
        expect(await prisma.certificateReview.count()).toBe(0);
        await finalizeAs(
          (
            await prisma.scheduledLesson.findFirstOrThrow({
              where: { lessonNumber: 3 },
            })
          ).id,
        );
        expect(await prisma.certificateReview.count()).toBe(1);
      });

      it('is created once even if the completion event is processed again and again, or at the same time', async () => {
        const rows = await scheduleClasses(student, course, [1, 2], [3]);
        await finalizeAs(rows[3]);
        // retries / repeats of the very same event
        for (let i = 0; i < 3; i++)
          await reviews.onClassFinalized(course.id, [student.id]);
        await Promise.all(
          Array.from({ length: 8 }, () =>
            reviews.recordCompletionIfDue(
              student.id,
              course.id,
              'RECONCILIATION',
            ),
          ),
        );
        // …and the same class finalised again (a double click / retried request)
        await finalizeAs(rows[3]).catch(() => undefined);
        expect(await prisma.certificateReview.count()).toBe(1);
        expect(await reviews.reconcile(30)).toMatchObject({ created: 0 });
      });

      it('works for programmes of any length (nothing is hard-coded)', async () => {
        for (const lessons of [1, 2, 5, 12]) {
          const prog = await makeProgram(
            'Game Creator',
            lessons,
            `Length ${lessons}`,
          );
          const who = await makeUser(prisma, `kid-${lessons}`, Role.STUDENT);
          const review = await finishProgram(who, prog, lessons);
          expect(review.status).toBe('PENDING');
        }
        expect(await prisma.certificateReview.count()).toBe(4);
      });

      it('a partially completed last lesson is not the end — its extra class is', async () => {
        const rows = await scheduleClasses(student, course, [1, 2], [3]);
        // lesson 3 taken but only partly; an extra class of lesson 3 is scheduled
        await prisma.scheduledLesson.update({
          where: { id: rows[3] },
          data: { status: LessonStatus.PARTIALLY_COMPLETED },
        });
        const extra = await prisma.scheduledLesson.create({
          data: {
            studentUserId: student.id,
            teacherId: teacher.profileId!,
            courseId: course.id,
            lessonNumber: 3,
            start: new Date(Date.UTC(2026, 10, 3, 10, 0)),
            end: new Date(Date.UTC(2026, 10, 3, 10, 45)),
            classType: 'ONE_TO_ONE',
            status: LessonStatus.UPCOMING,
            studentJoinedAt: new Date(Date.UTC(2026, 10, 3, 10, 0)),
          },
        });
        expect(
          await reviews.recordCompletionIfDue(
            student.id,
            course.id,
            'RECONCILIATION',
          ),
        ).toMatchObject({ created: false, reason: 'not-complete' });
        await finalizeAs(extra.id);
        const review = await prisma.certificateReview.findFirstOrThrow({});
        // …and the date offered is the day of that LAST class
        expect(review.suggestedCompletionDate).toBe('2026-11-03');
      });

      it('offers the Asia/Dhaka day the final class took place as the completion date', async () => {
        const rows = await scheduleClasses(student, course, [1, 2], [3]);
        // 18:30 UTC on 5 Nov is 00:30 on 6 Nov in Bangladesh
        await prisma.scheduledLesson.update({
          where: { id: rows[3] },
          data: {
            start: new Date('2026-11-05T18:30:00Z'),
            end: new Date('2026-11-05T19:15:00Z'),
          },
        });
        await finalizeAs(rows[3]);
        const review = await prisma.certificateReview.findFirstOrThrow({});
        expect(review.suggestedCompletionDate).toBe('2026-11-06');
      });

      it('also opens for a batch student who joined part-way (they never had the early lessons)', async () => {
        const lateJoiner = await makeUser(prisma, 'late-joiner', Role.STUDENT);
        const rows = await scheduleClasses(lateJoiner, course, [], [3]);
        await finalizeAs(rows[3]);
        expect(
          await prisma.certificateReview.count({
            where: { studentUserId: lateJoiner.id },
          }),
        ).toBe(1);
      });

      it('an INCOMPLETE final class does not complete the programme', async () => {
        const rows = await scheduleClasses(student, course, [1, 2], [3]);
        await finalization.finalizeLesson(rows[3], {
          outcome: 'INCOMPLETE',
          reason: 'TECHNICAL_ISSUE' as never,
          actor: { role: 'ADMIN', userId: admin.id },
        });
        expect(await prisma.certificateReview.count()).toBe(0);
      });

      it('makes no academic or eligibility decision: a student with nothing on record still gets a review for an admin to judge', async () => {
        // No test attempts, no homework, no reports — the review is still opened, and still PENDING.
        const review = await finishProgram(student, course, 3);
        expect(review.status).toBe('PENDING');
        const detail = await adminGet(`/reviews/${review.id}`).expect(200);
        expect(detail.body.facts).toMatchObject({
          lessonsTaken: 3,
          lastLesson: 3,
          assessments: [],
        });
        // …and nothing in the review says "eligible" or "approved"
        expect(JSON.stringify(detail.body)).not.toMatch(/eligible/i);
      });

      it('involves no teacher: the teacher gets no alert and no route into it', async () => {
        await finishProgram(student, course, 3);
        expect(
          await prisma.dashboardAlert.count({
            where: { userId: teacher.id, type: { contains: 'CERTIFICATE' } },
          }),
        ).toBe(0);
        const teacherView = await http()
          .get('/admin/certificates/reviews')
          .set(as(teacher));
        expect(teacherView.status).toBe(403);
      });

      it('shows up for the admin: in the pending list and the summary counts', async () => {
        const review = await finishProgram(student, course, 3);
        const summary = await adminGet('/summary').expect(200);
        expect(summary.body).toMatchObject({
          pending: 1,
          issued: 0,
          revoked: 0,
          replaced: 0,
        });
        const list = await adminGet('/reviews').expect(200);
        expect(list.body.items).toHaveLength(1);
        expect(list.body.items[0]).toMatchObject({
          id: review.id,
          status: 'PENDING',
          suggestedCompletionDate: '2026-10-15',
          student: { id: student.id, fullName: 'nusrat student' },
          course: { id: course.id, title: 'AI Builder' },
          theme: {
            key: 'ai-data-science',
            label: 'AI & Data Science',
            accent: 'Muted teal',
            // a real swatch to draw the dot with, taken from the theme's palette
            color: CERTIFICATE_CATEGORIES.AI_DATA_SCIENCE.palette.ribbon[1],
          },
        });
        expect(list.body.items[0].theme.color).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });

    // ═══ Approval: where a certificate comes into being ════════════════════════

    describe('admin approval', () => {
      let review: { id: string };
      beforeEach(async () => {
        review = await finishProgram(student, course, 3);
      });

      it('issues the certificate: ID, files, record, audit — all only now', async () => {
        const before = new Date();
        const res = await adminPost(
          `/reviews/${review.id}/approve`,
          details(),
        ).expect(201);
        const after = new Date();

        const id: string = res.body.certificateId;
        expect(id).toMatch(CERTIFICATE_ID_PATTERN);
        expect(res.body).toMatchObject({
          status: 'ACTIVE',
          recipientName: 'Nusrat Jahan Tamanna',
          programName: 'AI Builder',
          completionDate: '2026-10-29',
          withDistinction: false,
          theme: 'ai-data-science',
          // the admin screens show the design by name and swatch, read from the
          // snapshot stored on the certificate
          themeLabel: 'AI & Data Science',
          themeColor: CERTIFICATE_CATEGORIES.AI_DATA_SCIENCE.palette.ribbon[1],
          templateVersion: 'v1',
          verificationUrl: `${FRONTEND}/verify/${id}`,
          isLegacy: false,
        });

        // the record
        const row = await prisma.certificate.findUniqueOrThrow({
          where: { certificateId: id },
        });
        expect(row).toMatchObject({
          studentUserId: student.id,
          courseId: course.id,
          status: 'ACTIVE',
          reviewId: review.id,
          issuedByAdminId: admin.id,
          storageBucket: 'lumexa-certificates',
          theme: 'ai-data-science',
          templateVersion: 'v1',
        });
        expect(row.themeSnapshot).toMatchObject({
          key: 'ai-data-science',
          palette: CERTIFICATE_CATEGORIES.AI_DATA_SCIENCE.palette,
        });

        // the ISSUE date: the day it was generated and stored (Dhaka)
        expect(row.issuedAt.getTime()).toBeGreaterThanOrEqual(
          before.getTime() - 1000,
        );
        expect(row.issuedAt.getTime()).toBeLessThanOrEqual(
          after.getTime() + 1000,
        );
        expect([
          utcToDhakaParts(before).dateStr,
          utcToDhakaParts(after).dateStr,
        ]).toContain(res.body.issueDate);
        expect(id.slice(4, 8)).toBe(res.body.issueDate.slice(0, 4));

        // the two files, stored under unique keys, byte for byte what was rendered
        expect(row.pdfKey).toBe(
          `certificates/${id.slice(4, 8)}/${id}/${id}.pdf`,
        );
        expect(row.pngKey).toBe(
          `certificates/${id.slice(4, 8)}/${id}/${id}.png`,
        );
        expect(storage.objects.get(row.pdfKey!)?.body.toString()).toContain(
          `fake certificate ${id}|Nusrat Jahan Tamanna|AI Builder|2026-10-29`,
        );
        expect(storage.objects.get(row.pdfKey!)?.contentType).toBe(
          'application/pdf',
        );
        expect(storage.objects.get(row.pngKey!)?.contentType).toBe('image/png');
        expect(row.pdfBytes).toBe(
          storage.objects.get(row.pdfKey!)!.body.length,
        );
        expect(row.pngBytes).toBe(
          storage.objects.get(row.pngKey!)!.body.length,
        );
        expect(row.pdfSha256).toMatch(/^[0-9a-f]{64}$/);

        // the renderer was asked to print exactly what the admin confirmed
        expect(renderer.calls).toHaveLength(1);
        expect(renderer.calls[0]).toMatchObject({
          certificateId: id,
          recipientName: 'Nusrat Jahan Tamanna',
          programName: 'AI Builder',
          completionDate: '2026-10-29',
          issueDate: res.body.issueDate,
          verificationUrl: `${FRONTEND}/verify/${id}`,
          withDistinction: false,
        });

        // the review is closed
        expect(
          await prisma.certificateReview.findUniqueOrThrow({
            where: { id: review.id },
          }),
        ).toMatchObject({
          status: 'ISSUED',
          issuedCertificateId: row.id,
          decidedByAdminId: admin.id,
          lastError: null,
        });
      });

      it('audits the approval and the issuance with the responsible admin and a timestamp', async () => {
        const res = await adminPost(
          `/reviews/${review.id}/approve`,
          details(),
        ).expect(201);
        const row = await prisma.certificate.findUniqueOrThrow({
          where: { certificateId: res.body.certificateId },
        });
        const log = await prisma.auditLog.findMany({
          orderBy: { createdAt: 'asc' },
        });
        const approved = log.find((l) => l.action === 'CERTIFICATE_APPROVED')!;
        const issued = log.find((l) => l.action === 'CERTIFICATE_ISSUED')!;
        expect(approved).toMatchObject({
          actorId: admin.id,
          actorRole: 'ADMIN',
          entityType: 'CertificateReview',
          entityId: review.id,
        });
        expect(approved.createdAt).toBeInstanceOf(Date);
        expect(issued).toMatchObject({
          actorId: admin.id,
          actorRole: 'ADMIN',
          entityType: 'Certificate',
          entityId: row.id,
        });
        expect(issued.afterData).toMatchObject({
          certificateId: res.body.certificateId,
          theme: 'ai-data-science',
          templateVersion: 'v1',
        });
      });

      it('records what the admin corrected: the name on the account versus the name confirmed', async () => {
        await adminPost(
          `/reviews/${review.id}/approve`,
          details({
            recipientName: 'Nusrat Jahan',
            completionDate: '2026-10-20',
          }),
        ).expect(201);
        const approved = await prisma.auditLog.findFirstOrThrow({
          where: { action: 'CERTIFICATE_APPROVED' },
        });
        expect(approved.beforeData).toMatchObject({
          accountName: 'nusrat student',
          suggestedCompletionDate: '2026-10-15',
        });
        expect(approved.afterData).toMatchObject({
          recipientName: 'Nusrat Jahan',
          completionDate: '2026-10-20',
        });
      });

      it('prints the confirmed name, not the account name (the admin can correct it)', async () => {
        await adminPost(
          `/reviews/${review.id}/approve`,
          details({ recipientName: "Nusrat  Jahan  O'Tamanna" }),
        ).expect(201);
        expect(renderer.calls[0].recipientName).toBe("Nusrat Jahan O'Tamanna"); // whitespace collapsed
      });

      it("takes the theme from the programme's CATEGORY at issuance", async () => {
        const cases: [string, string][] = [
          ['Game Creator', 'creative-coding-game-dev'],
          ['Web Developer', 'web-digital-skills'],
          ['Data Scientist', 'ai-data-science'],
          ['Odyssey', 'general'],
          ['Something New', 'general'],
        ];
        for (const [category, theme] of cases) {
          const prog = await makeProgram(category, 1, `Prog ${category}`);
          const who = await makeUser(prisma, 'kid', Role.STUDENT);
          const r = await finishProgram(who, prog, 1);
          const res = await adminPost(
            `/reviews/${r.id}/approve`,
            details({ programName: `Prog ${category}` }),
          ).expect(201);
          expect(res.body.theme).toBe(theme);
        }
      });

      it("a NEW programme inherits its category's theme with no configuration", async () => {
        const brandNew = await makeProgram(
          'Game Creator',
          2,
          'Brand New Robotics Course',
        );
        const r = await finishProgram(student, brandNew, 2);
        const res = await adminPost(
          `/reviews/${r.id}/approve`,
          details({ programName: 'Brand New Robotics Course' }),
        ).expect(201);
        expect(res.body.theme).toBe('creative-coding-game-dev');
        expect(renderer.calls[0].palette).toEqual(
          CERTIFICATE_CATEGORIES.CREATIVE_CODING_GAME_DEV.palette,
        );
      });

      it('"With Distinction" is printed only when the admin awards it', async () => {
        const res = await adminPost(
          `/reviews/${review.id}/approve`,
          details({ withDistinction: true }),
        ).expect(201);
        expect(res.body.withDistinction).toBe(true);
        expect(renderer.calls[0].withDistinction).toBe(true);
      });

      it('rejects names the fonts cannot print, bad dates and empty fields — and leaves the review untouched', async () => {
        for (const bad of [
          { recipientName: 'নুসরাত' },
          { recipientName: '' },
          { recipientName: 'Ada‮Bob' },
          { programName: '构建' },
          { completionDate: '2999-01-01' },
          { completionDate: '2026-02-30' },
          { completionDate: '06/11/2026' },
          { completionDate: '1999-12-31' },
        ]) {
          const res = await adminPost(
            `/reviews/${review.id}/approve`,
            details(bad),
          );
          expect(res.status).toBe(400);
        }
        await adminPost(`/reviews/${review.id}/approve`, {
          recipientName: 'X Y',
        }).expect(400); // missing fields
        await adminPost(`/reviews/${review.id}/approve`, {
          ...details(),
          isAdmin: true,
        }).expect(400); // unknown field
        expect(await prisma.certificate.count()).toBe(0);
        expect(storage.objects.size).toBe(0);
        expect(renderer.calls).toHaveLength(0);
        expect(
          await prisma.certificateReview.findUniqueOrThrow({
            where: { id: review.id },
          }),
        ).toMatchObject({ status: 'PENDING', attempts: 0 });
      });

      it('is idempotent: approving again returns the same certificate and issues nothing new', async () => {
        const first = await adminPost(
          `/reviews/${review.id}/approve`,
          details(),
        ).expect(201);
        const again = await adminPost(
          `/reviews/${review.id}/approve`,
          details(),
        ).expect(201);
        expect(again.body.certificateId).toBe(first.body.certificateId);
        expect(await prisma.certificate.count()).toBe(1);
        expect(storage.objects.size).toBe(2);
        expect(renderer.calls).toHaveLength(1);
      });

      it('two admins approving at once produce exactly one certificate', async () => {
        const results = await Promise.all([
          adminPost(`/reviews/${review.id}/approve`, details(), admin),
          adminPost(`/reviews/${review.id}/approve`, details(), admin2),
        ]);
        const statuses = results.map((r) => r.status).sort();
        // one wins; the other is told it is in progress (409) or is shown the winner's certificate
        expect(statuses.filter((s) => s === 201).length).toBeGreaterThanOrEqual(
          1,
        );
        expect(statuses.every((s) => s === 201 || s === 409)).toBe(true);
        expect(await prisma.certificate.count()).toBe(1);
        expect(storage.objects.size).toBe(2);
        expect(renderer.calls).toHaveLength(1);
      });

      it('cannot approve a dismissed review until it is reopened', async () => {
        await adminPost(`/reviews/${review.id}/dismiss`, {
          reason: 'Not finished the projects',
        }).expect(201);
        const res = await adminPost(`/reviews/${review.id}/approve`, details());
        expect(res.status).toBe(409);
        await adminPost(`/reviews/${review.id}/reopen`).expect(201);
        await adminPost(`/reviews/${review.id}/approve`, details()).expect(201);
      });

      it('an abandoned approval (a crash mid-generation) can be taken over after its lease', async () => {
        await prisma.certificateReview.update({
          where: { id: review.id },
          data: {
            status: 'PROCESSING',
            processingStartedAt: new Date(Date.now() - 11 * 60_000),
            processingByAdminId: admin2.id,
          },
        });
        await adminPost(`/reviews/${review.id}/approve`, details()).expect(201);
        expect(await prisma.certificate.count()).toBe(1);
      });

      it('but an approval that is still in progress is not taken over', async () => {
        await prisma.certificateReview.update({
          where: { id: review.id },
          data: {
            status: 'PROCESSING',
            processingStartedAt: new Date(),
            processingByAdminId: admin2.id,
          },
        });
        const res = await adminPost(`/reviews/${review.id}/approve`, details());
        expect(res.status).toBe(409);
        expect(res.body.message).toMatch(/already being generated/);
        expect(await prisma.certificate.count()).toBe(0);
      });

      it('uses the configured frontend address for the QR code / verification link', async () => {
        process.env.FRONTEND_URL = 'https://another-domain.example';
        const res = await adminPost(
          `/reviews/${review.id}/approve`,
          details(),
        ).expect(201);
        expect(res.body.verificationUrl).toBe(
          `https://another-domain.example/verify/${res.body.certificateId}`,
        );
        expect(renderer.calls[0].verificationUrl).toBe(
          `https://another-domain.example/verify/${res.body.certificateId}`,
        );
      });
    });

    // ═══ When generation or storage fails, nothing is half-issued ══════════════

    describe('when generation or storage fails', () => {
      let review: { id: string };
      beforeEach(async () => {
        review = await finishProgram(student, course, 3);
      });

      /** Nothing exists — no record, no email, no success audit — and the review is
       * back in the queue, ready to be approved again. */
      async function expectNothingIssued(attempts: number) {
        expect(await prisma.certificate.count()).toBe(0);
        await emails.idle();
        expect(certificateMails()).toHaveLength(0);
        expect(
          await prisma.emailLog.count({
            where: { category: 'CERTIFICATE_ISSUED' },
          }),
        ).toBe(0);
        expect(
          await prisma.auditLog.count({
            where: { action: 'CERTIFICATE_ISSUED' },
          }),
        ).toBe(0);
        const after = await prisma.certificateReview.findUniqueOrThrow({
          where: { id: review.id },
        });
        expect(after).toMatchObject({
          status: 'PENDING',
          processingStartedAt: null,
          issuedCertificateId: null,
          attempts,
        });
        return after;
      }

      it('a failed IMAGE upload: no certificate, no email, approvable again — and the PDF already stored is kept', async () => {
        storage.failWritesMatching = ['.png'];
        const res = await adminPost(`/reviews/${review.id}/approve`, details());
        expect(res.status).toBe(502);
        expect(res.body.message).toMatch(
          /Nothing was issued and no email was sent/,
        );

        const after = await expectNothingIssued(1);
        expect(after.lastError).toBeTruthy(); // the admin is shown why
        expect(
          await prisma.auditLog.count({
            where: { action: 'CERTIFICATE_ISSUE_FAILED', entityId: review.id },
          }),
        ).toBe(1);

        // The one file that did get stored stays — nothing in the system deletes —
        // under its own (never used) ID…
        const orphans = [...storage.objects.keys()];
        expect(orphans).toHaveLength(1);
        expect(orphans[0]).toMatch(/\.pdf$/);

        // …and approving again issues normally, with a NEW ID and NEW files.
        storage.failWritesMatching = [];
        const retry = await approveReview(review.id);
        expect(orphans[0]).not.toContain(retry.certificateId);
        expect(storage.objects.has(orphans[0])).toBe(true);
        expect(storage.objects.size).toBe(3);
        expect(await prisma.certificate.count()).toBe(1);
        expect(
          await prisma.certificateReview.findUniqueOrThrow({
            where: { id: review.id },
          }),
        ).toMatchObject({
          status: 'ISSUED',
          lastError: null,
          attempts: 2,
        });
      });

      it('R2 down entirely: nothing stored, nothing issued, a clear message', async () => {
        storage.down = true;
        const res = await adminPost(`/reviews/${review.id}/approve`, details());
        expect(res.status).toBe(502);
        expect(res.body.message).toMatch(
          /Storing the certificate files failed/,
        );
        expect(storage.objects.size).toBe(0);
        await expectNothingIssued(1);
      });

      it('a rendering failure: nothing is stored, issued or emailed', async () => {
        renderer.failWith = new CertificateRenderError(
          'The rendered certificate has 2 pages instead of 1.',
          'invalid-output',
        );
        const res = await adminPost(`/reviews/${review.id}/approve`, details());
        expect(res.status).toBe(503);
        expect(res.body.message).toMatch(
          /2 pages instead of 1\..*Nothing was issued and no email was sent/,
        );
        expect(storage.writeLog).toHaveLength(0);
        await expectNothingIssued(1);
      });

      it('Chromium missing on the server says so, and issues nothing', async () => {
        renderer.failWith = new CertificateRenderError(
          'Certificate rendering is unavailable on this server: Chromium could not be started.',
          'chromium-unavailable',
        );
        const res = await adminPost(`/reviews/${review.id}/approve`, details());
        expect(res.status).toBe(503);
        expect(res.body.message).toMatch(/Chromium could not be started/);
        await expectNothingIssued(1);
      });

      it('storage that is not configured blocks issuing before anything starts', async () => {
        storage.configured = false;
        const status = await adminGet('/status').expect(200);
        expect(status.body.canIssue).toBe(false);
        expect(status.body.problems.map((p: { key: string }) => p.key)).toEqual(
          ['STORAGE'],
        );
        const res = await adminPost(`/reviews/${review.id}/approve`, details());
        expect(res.status).toBe(503);
        expect(renderer.calls).toHaveLength(0);
        await expectNothingIssued(0);
      });

      it.each([
        ['unset', undefined],
        ['blank', '  '],
        ['without a scheme', 'frontend.example.test'],
        ['a non-web scheme', 'ftp://frontend.example.test'],
        ['insecure http on a real host', 'http://frontend.example.test'],
        ['carrying credentials', 'https://user:secret@frontend.example.test'],
        ['carrying a query string', 'https://frontend.example.test/?x=1'],
      ])(
        'FRONTEND_URL %s blocks issuing — there is no fallback domain',
        async (_label, value) => {
          if (value === undefined) delete process.env.FRONTEND_URL;
          else process.env.FRONTEND_URL = value;

          const status = await adminGet('/status').expect(200);
          expect(status.body.canIssue).toBe(false);
          expect(status.body.problems[0].key).toBe('FRONTEND_URL');

          const approve = await adminPost(
            `/reviews/${review.id}/approve`,
            details(),
          );
          expect(approve.status).toBe(503);
          expect(approve.body.message).toMatch(/FRONTEND_URL/);
          const preview = await adminPost(
            `/reviews/${review.id}/preview`,
            details(),
          );
          expect(preview.status).toBe(503);

          // Nothing was rendered, stored or claimed — and no domain was invented.
          expect(renderer.calls).toHaveLength(0);
          expect(renderer.previews).toHaveLength(0);
          expect(storage.writeLog).toHaveLength(0);
          await expectNothingIssued(0);
        },
      );

      it('the database refuses a second ACTIVE certificate for the programme — the files of the attempt are kept, nothing else changes', async () => {
        await prisma.certificate.create({
          data: {
            certificateId: 'LXA-2026-ZZZZZ2',
            studentUserId: student.id,
            courseId: course.id,
            status: 'ACTIVE',
            recipientName: 'Nusrat Jahan',
            programName: 'AI Builder',
            completionDate: '2026-10-01',
            theme: 'general',
            templateVersion: 'v1',
            storageBucket: 'lumexa-certificates',
            pdfKey: 'certificates/2026/LXA-2026-ZZZZZ2/LXA-2026-ZZZZZ2.pdf',
            pngKey: 'certificates/2026/LXA-2026-ZZZZZ2/LXA-2026-ZZZZZ2.png',
            emailStatus: 'SKIPPED',
          },
        });
        const res = await adminPost(`/reviews/${review.id}/approve`, details());
        expect(res.status).toBe(409);
        expect(res.body.message).toMatch(/already has an active certificate/);
        expect(await prisma.certificate.count()).toBe(1); // only the one that was already there
        expect(
          await prisma.certificateReview.findUniqueOrThrow({
            where: { id: review.id },
          }),
        ).toMatchObject({
          status: 'PENDING',
          issuedCertificateId: null,
        });
        await emails.idle();
        expect(certificateMails()).toHaveLength(0);
        expect(storage.objects.size).toBe(2); // the attempt's files are never deleted
      });

      it('a failure AFTER the certificate is committed is never reported as a failed issuance', async () => {
        // The email is queued only after the commit; make that step blow up (it never
        // does in practice — the call is fire-and-forget).
        const spy = jest.spyOn(emails, 'queue').mockImplementation(() => {
          throw new Error('queue exploded');
        });
        try {
          const res = await adminPost(
            `/reviews/${review.id}/approve`,
            details(),
          );
          expect(res.status).toBe(500); // this request errored…
        } finally {
          spy.mockRestore();
        }
        // …but the certificate IS issued and stays so: it was not rolled back, the
        // review is closed, no "issue failed" was audited, and approving again simply
        // returns the existing certificate.
        expect(await prisma.certificate.count()).toBe(1);
        expect(
          await prisma.certificateReview.findUniqueOrThrow({
            where: { id: review.id },
          }),
        ).toMatchObject({ status: 'ISSUED' });
        expect(
          await prisma.auditLog.count({
            where: { action: 'CERTIFICATE_ISSUE_FAILED' },
          }),
        ).toBe(0);
        const again = await adminPost(
          `/reviews/${review.id}/approve`,
          details(),
        ).expect(201);
        expect(again.body.status).toBe('ACTIVE');
        expect(await prisma.certificate.count()).toBe(1);
      });
    });

    // ═══ The pending-approvals queue ═══════════════════════════════════════════

    describe('the pending-approvals queue', () => {
      let review: { id: string };
      beforeEach(async () => {
        review = await finishProgram(student, course, 3);
      });

      it('a review is dismissed with a reason and can be reopened — every step audited', async () => {
        await adminPost(`/reviews/${review.id}/dismiss`, {}).expect(400);
        await adminPost(`/reviews/${review.id}/dismiss`, {
          reason: '   ',
        }).expect(400);

        const dismissed = await adminPost(`/reviews/${review.id}/dismiss`, {
          reason: 'Projects not finished yet',
        }).expect(201);
        expect(dismissed.body).toEqual({ id: review.id, status: 'DISMISSED' });
        expect((await adminGet('/summary').expect(200)).body).toMatchObject({
          pending: 0,
          dismissed: 1,
        });
        expect(
          (await adminGet('/reviews').expect(200)).body.items,
        ).toHaveLength(0);
        const dismissedList = await adminGet(
          '/reviews?status=DISMISSED',
        ).expect(200);
        expect(
          dismissedList.body.items.map((i: { id: string }) => i.id),
        ).toEqual([review.id]);
        expect(dismissedList.body.items[0].dismissReason).toBe(
          'Projects not finished yet',
        );
        await adminPost(`/reviews/${review.id}/dismiss`, {
          reason: 'again',
        }).expect(409);

        await adminPost(`/reviews/${review.id}/reopen`).expect(201);
        await adminPost(`/reviews/${review.id}/reopen`).expect(409);
        expect((await adminGet('/summary').expect(200)).body).toMatchObject({
          pending: 1,
          dismissed: 0,
        });

        const actions = (
          await prisma.auditLog.findMany({
            where: { entityId: review.id },
            orderBy: { createdAt: 'asc' },
          })
        ).map((a) => a.action);
        expect(actions).toEqual([
          'CERTIFICATE_REVIEW_CREATED',
          'CERTIFICATE_REVIEW_DISMISSED',
          'CERTIFICATE_REVIEW_REOPENED',
        ]);
        const dismissal = await prisma.auditLog.findFirstOrThrow({
          where: { action: 'CERTIFICATE_REVIEW_DISMISSED' },
        });
        expect(dismissal).toMatchObject({
          actorId: admin.id,
          actorRole: 'ADMIN',
          reason: 'Projects not finished yet',
        });
      });

      it('an issued review can no longer be dismissed or reopened', async () => {
        await approveReview(review.id);
        await adminPost(`/reviews/${review.id}/dismiss`, {
          reason: 'late',
        }).expect(409);
        await adminPost(`/reviews/${review.id}/reopen`).expect(409);
        expect((await adminGet('/summary').expect(200)).body).toMatchObject({
          pending: 0,
          issued: 1,
        });
      });

      it('search finds a review by student name or by programme', async () => {
        expect(
          (await adminGet('/reviews?search=nusrat').expect(200)).body.total,
        ).toBe(1);
        expect(
          (await adminGet('/reviews?search=AI%20Builder').expect(200)).body
            .total,
        ).toBe(1);
        expect(
          (await adminGet('/reviews?search=nobody-here').expect(200)).body
            .total,
        ).toBe(0);
      });

      it('an unknown review is a 404', async () => {
        await adminGet('/reviews/00000000-0000-4000-8000-000000000000').expect(
          404,
        );
        await adminPost(
          '/reviews/00000000-0000-4000-8000-000000000000/approve',
          details(),
        ).expect(404);
        await adminPost(
          '/reviews/00000000-0000-4000-8000-000000000000/dismiss',
          { reason: 'x' },
        ).expect(404);
      });

      it('the safety-net scan opens a review the live event missed — once', async () => {
        await prisma.certificateReview.deleteMany({}); // as if the event had been lost
        const first = await adminPost('/reviews/scan').expect(201);
        expect(first.body.created).toBe(1);
        expect(
          (await adminPost('/reviews/scan').expect(201)).body.created,
        ).toBe(0);
        const rows = await prisma.certificateReview.findMany();
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({
          source: 'RECONCILIATION',
          status: 'PENDING',
          studentUserId: student.id,
        });
      });

      it('a student who already holds an active certificate gets no new review', async () => {
        await approveReview(review.id);
        await prisma.certificateReview.deleteMany({}); // even if the review row were gone
        expect(
          await reviews.recordCompletionIfDue(
            student.id,
            course.id,
            'RECONCILIATION',
          ),
        ).toMatchObject({
          created: false,
          reason: 'already-certified',
        });
      });

      it('a PREVIEW is a watermarked picture: no ID, no files, no record, no email', async () => {
        const res = await adminPost(
          `/reviews/${review.id}/preview`,
          details(),
        ).expect(201);
        expect(res.headers['content-type']).toMatch(/image\/png/);
        expect(res.headers['cache-control']).toMatch(/no-store/);
        expect(renderer.previews).toHaveLength(1);
        expect(renderer.previews[0]).toMatchObject({
          certificateId: 'LXA-PREVIEW',
          recipientName: 'Nusrat Jahan Tamanna',
          programName: 'AI Builder',
          verificationUrl: `${FRONTEND}/verify/LXA-PREVIEW`,
        });
        expect(renderer.calls).toHaveLength(0);
        expect(storage.writeLog).toHaveLength(0);
        expect(await prisma.certificate.count()).toBe(0);
        expect(
          await prisma.certificateReview.findUniqueOrThrow({
            where: { id: review.id },
          }),
        ).toMatchObject({
          status: 'PENDING',
          attempts: 0,
        });
        // …and the same validation applies as for the approval
        await adminPost(
          `/reviews/${review.id}/preview`,
          details({ recipientName: 'নুসরাত' }),
        ).expect(400);
      });
    });

    // ═══ Replacement: a correction keeps the original ══════════════════════════

    describe('replacing a certificate (a correction)', () => {
      let original: { id: string; certificateId: string };
      beforeEach(async () => {
        ({ cert: original } = await issueCertificate());
      });

      it('keeps the original and its files, issues a new certificate with a new ID, and records why', async () => {
        const originalRow = await prisma.certificate.findUniqueOrThrow({
          where: { certificateId: original.certificateId },
        });
        const originalPdf = storage.objects
          .get(originalRow.pdfKey!)!
          .body.toString('hex');
        const originalPng = storage.objects
          .get(originalRow.pngKey!)!
          .body.toString('hex');

        const res = await adminPost(
          `/${original.certificateId}/replace`,
          {
            reason: 'Name was misspelled',
            recipientName: 'Nusrat Jahan Tamanna Rahman',
            completionDate: '2026-10-28',
            withDistinction: true,
          },
          admin2,
        ).expect(201);
        const next = res.body;
        expect(next.certificateId).toMatch(CERTIFICATE_ID_PATTERN);
        expect(next.certificateId).not.toBe(original.certificateId);
        expect(next).toMatchObject({
          status: 'ACTIVE',
          recipientName: 'Nusrat Jahan Tamanna Rahman',
          programName: 'AI Builder',
          completionDate: '2026-10-28',
          withDistinction: true,
          replaces: original.certificateId,
          replacedBy: null,
          theme: 'ai-data-science',
          templateVersion: 'v1',
          issuedByAdminId: admin2.id,
        });

        // The original: marked Replaced, nothing of it changed or removed.
        const old = await prisma.certificate.findUniqueOrThrow({
          where: { certificateId: original.certificateId },
        });
        expect(old).toMatchObject({
          status: 'REPLACED',
          replacementReason: 'Name was misspelled',
          replacedByAdminId: admin2.id,
          replacedByCertificateId: next.id,
          recipientName: 'Nusrat Jahan Tamanna', // what was actually printed on it
          completionDate: '2026-10-29',
          pdfKey: originalRow.pdfKey,
          pngKey: originalRow.pngKey,
          pdfSha256: originalRow.pdfSha256,
        });
        expect(old.replacedAt).toBeInstanceOf(Date);
        expect(
          storage.objects.get(originalRow.pdfKey!)!.body.toString('hex'),
        ).toBe(originalPdf);
        expect(
          storage.objects.get(originalRow.pngKey!)!.body.toString('hex'),
        ).toBe(originalPng);

        // The new certificate has its own files, at its own keys.
        const fresh = await prisma.certificate.findUniqueOrThrow({
          where: { certificateId: next.certificateId },
        });
        expect(fresh.pdfKey).not.toBe(originalRow.pdfKey);
        expect(fresh.pngKey).not.toBe(originalRow.pngKey);
        expect(storage.objects.has(fresh.pdfKey!)).toBe(true);
        expect(storage.objects.has(fresh.pngKey!)).toBe(true);
        expect(storage.objects.size).toBe(4);
        expect(renderer.calls[1]).toMatchObject({
          certificateId: next.certificateId,
          recipientName: 'Nusrat Jahan Tamanna Rahman',
          completionDate: '2026-10-28',
          withDistinction: true,
        });

        // One active certificate, two records.
        expect(await prisma.certificate.count()).toBe(2);
        expect(
          await prisma.certificate.count({ where: { status: 'ACTIVE' } }),
        ).toBe(1);

        // The audit trail names the admin and keeps the reason, before and after.
        const replaced = await prisma.auditLog.findFirstOrThrow({
          where: { action: 'CERTIFICATE_REPLACED' },
        });
        expect(replaced).toMatchObject({
          actorId: admin2.id,
          actorRole: 'ADMIN',
          entityId: old.id,
          reason: 'Name was misspelled',
        });
        expect(replaced.beforeData).toMatchObject({
          recipientName: 'Nusrat Jahan Tamanna',
          completionDate: '2026-10-29',
        });
        expect(replaced.afterData).toMatchObject({
          replacedBy: next.certificateId,
          recipientName: 'Nusrat Jahan Tamanna Rahman',
        });
      });

      it('verification of the old ID says Replaced and points to the new certificate', async () => {
        const next = (
          await adminPost(`/${original.certificateId}/replace`, {
            reason: 'typo',
            recipientName: 'Nusrat J Tamanna',
          }).expect(201)
        ).body;
        const old = await http()
          .get(`/certificates/verify/${original.certificateId}`)
          .expect(200);
        expect(old.body).toMatchObject({
          status: 'REPLACED',
          recipientName: 'Nusrat Jahan Tamanna',
          replacedBy: { certificateId: next.certificateId },
        });
        expect(old.body.replacedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        const current = await http()
          .get(`/certificates/verify/${next.certificateId}`)
          .expect(200);
        expect(current.body).toMatchObject({
          status: 'ACTIVE',
          recipientName: 'Nusrat J Tamanna',
          replacedBy: null,
        });
      });

      it('the student sees both, but can only download the current one', async () => {
        const next = (
          await adminPost(`/${original.certificateId}/replace`, {
            reason: 'typo',
            recipientName: 'Nusrat J Tamanna',
          }).expect(201)
        ).body;
        const mine = await http()
          .get('/certificates/me')
          .set(as(student))
          .expect(200);
        expect(
          mine.body.map(
            (c: {
              certificateId: string;
              status: string;
              canDownload: boolean;
            }) => [c.certificateId, c.status, c.canDownload],
          ),
        ).toEqual(
          expect.arrayContaining([
            [next.certificateId, 'ACTIVE', true],
            [original.certificateId, 'REPLACED', false],
          ]),
        );
        expect(
          mine.body.find(
            (c: { certificateId: string }) =>
              c.certificateId === original.certificateId,
          ).replacedBy,
        ).toBe(next.certificateId);
        await http()
          .get(`/certificates/me/${original.certificateId}/pdf`)
          .set(as(student))
          .expect(404);
        await http()
          .get(`/certificates/me/${next.certificateId}/pdf`)
          .set(as(student))
          .expect(200);
      });

      it('emails the corrected certificate — or not, when the admin says so', async () => {
        const first = (
          await adminPost(`/${original.certificateId}/replace`, {
            reason: 'typo',
            recipientName: 'Nusrat J Tamanna',
          }).expect(201)
        ).body;
        await emailSettled(first.certificateId);
        expect(certificateMails()).toHaveLength(2);
        const attached = certificateMails()[1].attachments![0];
        expect(attached.filename).toBe(
          `Lumexa-Certificate-${first.certificateId}.pdf`,
        );

        const second = (
          await adminPost(`/${first.certificateId}/replace`, {
            reason: 'date',
            completionDate: '2026-10-27',
            sendEmail: false,
          }).expect(201)
        ).body;
        expect(second.email.status).toBe('SKIPPED');
        await emails.idle();
        expect(certificateMails()).toHaveLength(2);
      });

      it('refuses a "correction" that changes nothing, a missing reason and unreadable text', async () => {
        const path = `/${original.certificateId}/replace`;
        await adminPost(path, { reason: 'same' }).expect(400);
        await adminPost(path, {
          reason: 'same',
          recipientName: 'Nusrat Jahan Tamanna',
        }).expect(400);
        await adminPost(path, { recipientName: 'Nusrat T' }).expect(400);
        await adminPost(path, {
          reason: '  ',
          recipientName: 'Nusrat T',
        }).expect(400);
        await adminPost(path, { reason: 'x', recipientName: 'নুসরাত' }).expect(
          400,
        );
        await adminPost(path, {
          reason: 'x',
          completionDate: '2999-01-01',
        }).expect(400);
        expect(await prisma.certificate.count()).toBe(1);
        expect(storage.objects.size).toBe(2);
      });

      it('only an active certificate can be replaced, and two simultaneous replacements make one successor', async () => {
        const path = `/${original.certificateId}/replace`;
        const results = await Promise.all([
          adminPost(
            path,
            { reason: 'a', recipientName: 'Nusrat Tamanna' },
            admin,
          ),
          adminPost(
            path,
            { reason: 'b', recipientName: 'Nusrat T Jahan' },
            admin2,
          ),
        ]);
        expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
        expect(
          await prisma.certificate.count({ where: { status: 'ACTIVE' } }),
        ).toBe(1);
        expect(
          await prisma.certificate.count({ where: { status: 'REPLACED' } }),
        ).toBe(1);
        expect(await prisma.certificate.count()).toBe(2);
        // Files written for the attempt that lost are kept — nothing is ever deleted.
        expect(storage.objects.size).toBeGreaterThanOrEqual(4);
        // The replaced certificate cannot be replaced or revoked again.
        await adminPost(path, {
          reason: 'c',
          recipientName: 'Someone Else',
        }).expect(409);
        await adminPost(`/${original.certificateId}/revoke`, {
          reason: 'late',
        }).expect(409);
      });

      it("a replacement takes its theme from the programme's category, like any certificate", async () => {
        // The category is re-themed later; the replacement follows the programme as it is now.
        await prisma.course.update({
          where: { id: course.id },
          data: { category: 'Game Creator' },
        });
        const next = (
          await adminPost(`/${original.certificateId}/replace`, {
            reason: 'typo',
            recipientName: 'Nusrat T',
          }).expect(201)
        ).body;
        expect(next.theme).toBe('creative-coding-game-dev');
        // …while the original keeps the theme it was issued with.
        expect(
          (
            await prisma.certificate.findUniqueOrThrow({
              where: { certificateId: original.certificateId },
            })
          ).theme,
        ).toBe('ai-data-science');
      });
    });

    // ═══ Revocation: status changes, nothing is deleted ════════════════════════

    describe('revoking a certificate', () => {
      it('changes what verification says — and deletes nothing', async () => {
        const { cert } = await issueCertificate();
        const row = await prisma.certificate.findUniqueOrThrow({
          where: { certificateId: cert.certificateId },
        });
        const before = new Map(
          [...storage.objects].map(([k, v]) => [k, v.body.toString('hex')]),
        );
        const dayBefore = utcToDhakaParts(new Date()).dateStr;

        await adminPost(`/${cert.certificateId}/revoke`, {}).expect(400); // a reason is required
        await adminPost(`/${cert.certificateId}/revoke`, {
          reason: '  ',
        }).expect(400);
        const res = await adminPost(
          `/${cert.certificateId}/revoke`,
          { reason: 'Issued in error' },
          admin2,
        ).expect(201);
        expect(res.body).toMatchObject({
          status: 'REVOKED',
          revocationReason: 'Issued in error',
        });
        const dayAfter = utcToDhakaParts(new Date()).dateStr;

        // Verification says so, with the date.
        const verify = await http()
          .get(`/certificates/verify/${cert.certificateId}`)
          .expect(200);
        expect(verify.body).toMatchObject({
          status: 'REVOKED',
          recipientName: 'Nusrat Jahan Tamanna',
        });
        expect([dayBefore, dayAfter]).toContain(verify.body.revokedOn);

        // The record and both files are exactly as they were.
        expect(await prisma.certificate.count()).toBe(1);
        expect(storage.objects.size).toBe(before.size);
        for (const [key, hex] of before)
          expect(storage.objects.get(key)?.body.toString('hex')).toBe(hex);
        expect(
          await prisma.certificate.findUniqueOrThrow({ where: { id: row.id } }),
        ).toMatchObject({
          pdfKey: row.pdfKey,
          pngKey: row.pngKey,
          pdfSha256: row.pdfSha256,
        });

        // An admin can still open them; the student is shown it as revoked, without files.
        await adminGet(`/${cert.certificateId}/pdf`).expect(200);
        await adminGet(`/${cert.certificateId}/image`).expect(200);
        const mine = await http()
          .get('/certificates/me')
          .set(as(student))
          .expect(200);
        expect(mine.body[0]).toMatchObject({
          certificateId: cert.certificateId,
          status: 'REVOKED',
          canDownload: false,
          hasImage: false,
        });
        await http()
          .get(`/certificates/me/${cert.certificateId}/pdf`)
          .set(as(student))
          .expect(404);
        await http()
          .get(`/certificates/me/${cert.certificateId}/image`)
          .set(as(student))
          .expect(404);

        // It cannot be revoked twice, replaced or emailed any more.
        await adminPost(`/${cert.certificateId}/revoke`, {
          reason: 'again',
        }).expect(409);
        await adminPost(`/${cert.certificateId}/replace`, {
          reason: 'x',
          recipientName: 'Someone Else',
        }).expect(409);
        await adminPost(`/${cert.certificateId}/resend-email`, {
          force: true,
        }).expect(409);

        // Audited with the admin and the reason.
        const log = await prisma.auditLog.findFirstOrThrow({
          where: { action: 'CERTIFICATE_REVOKED' },
        });
        expect(log).toMatchObject({
          actorId: admin2.id,
          actorRole: 'ADMIN',
          entityId: row.id,
          reason: 'Issued in error',
        });
      });
    });

    // ═══ Public verification ═══════════════════════════════════════════════════

    describe('public verification', () => {
      it('shows certificate facts only — never anything private', async () => {
        const { cert } = await issueCertificate();
        const res = await http()
          .get(`/certificates/verify/${cert.certificateId}`)
          .expect(200);
        expect(res.body).toEqual({
          certificateId: cert.certificateId,
          status: 'ACTIVE',
          recipientName: 'Nusrat Jahan Tamanna',
          programName: 'AI Builder',
          completionDate: '2026-10-29',
          issueDate: cert.issueDate,
          issuedBy: 'Lumexa AI School',
          revokedOn: null,
          replacedOn: null,
          replacedBy: null,
        });
        const text = JSON.stringify(res.body);
        for (const private_ of [
          student.email,
          'parent-of-nusrat@example.com',
          '+8801700000000',
          student.id,
          'Grade 6',
          course.id,
          'certificates/', // storage keys
          'lumexa-certificates',
        ]) {
          expect(text).not.toContain(private_);
        }
        expect(res.headers['cache-control']).toMatch(/no-store/);
      });

      it('accepts the ID in any letter case, and answers every unknown or malformed ID the same way', async () => {
        const { cert } = await issueCertificate();
        const lower = await http()
          .get(`/certificates/verify/${cert.certificateId.toLowerCase()}`)
          .expect(200);
        expect(lower.body.certificateId).toBe(cert.certificateId);
        const padded = await http()
          .get(`/certificates/verify/%20${cert.certificateId}%20`)
          .expect(200);
        expect(padded.body.certificateId).toBe(cert.certificateId);

        const misses = [
          'LXA-2026-ZZZZZZ', // well-formed but unknown
          'nonsense',
          'LXA-2026-A7K9Q', // too short
          'LXA-2026-A7K9Q0', // contains an ambiguous character, so never issued
          "'%20OR%201=1--",
          'x'.repeat(500),
        ];
        const messages = new Set<string>();
        for (const miss of misses) {
          const res = await http().get(
            `/certificates/verify/${encodeURIComponent(miss)}`,
          );
          expect(res.status).toBe(404);
          messages.add(res.body.message);
        }
        expect(messages.size).toBe(1); // no way to tell "never issued" from "malformed"
      });

      it('is rate-limited, because the endpoint is public', async () => {
        const { cert } = await issueCertificate();
        clearRateLimits();
        const statuses: number[] = [];
        for (let i = 0; i < PUBLIC_VERIFY_LIMIT_PER_MINUTE + 10; i++) {
          statuses.push(
            (await http().get(`/certificates/verify/${cert.certificateId}`))
              .status,
          );
        }
        // The limit per minute from one address, then the endpoint says "slow
        // down". (It is generous: the Next.js server calls it for every visitor.)
        expect(
          statuses
            .slice(0, PUBLIC_VERIFY_LIMIT_PER_MINUTE)
            .every((s) => s === 200),
        ).toBe(true);
        expect(
          statuses
            .slice(PUBLIC_VERIFY_LIMIT_PER_MINUTE)
            .every((s) => s === 429),
        ).toBe(true);
      });
    });

    // ═══ What a student sees and does ══════════════════════════════════════════

    describe("the student's own certificates", () => {
      /** GET a binary file as `who`. */
      async function download(path: string, who: Person) {
        const res = await http()
          .get(path)
          .set(as(who))
          .buffer(true)
          .parse((response, callback) => {
            const chunks: Buffer[] = [];
            response.on('data', (chunk: Buffer) => chunks.push(chunk));
            response.on('end', () => callback(null, Buffer.concat(chunks)));
          });
        return {
          status: res.status,
          headers: res.headers,
          body: res.body as Buffer,
        };
      }

      it('lists their certificates with everything the page needs', async () => {
        const { cert } = await issueCertificate();
        const res = await http()
          .get('/certificates/me')
          .set(as(student))
          .expect(200);
        expect(res.headers['cache-control']).toMatch(/no-store/);
        expect(res.body).toEqual([
          {
            certificateId: cert.certificateId,
            status: 'ACTIVE',
            courseId: course.id,
            programName: 'AI Builder',
            recipientName: 'Nusrat Jahan Tamanna',
            completionDate: '2026-10-29',
            issueDate: cert.issueDate,
            verificationUrl: `${FRONTEND}/verify/${cert.certificateId}`,
            canDownload: true,
            hasImage: true,
            isLegacy: false,
            theme: 'ai-data-science',
            seen: false,
            replacedBy: null,
          },
        ]);
      });

      it('has a friendly empty state: no certificates is an empty list, not an error', async () => {
        const res = await http()
          .get('/certificates/me')
          .set(as(student))
          .expect(200);
        expect(res.body).toEqual([]);
      });

      it('the home card shows the newest unseen certificate until it is seen', async () => {
        const empty = await http()
          .get('/certificates/me/achievement')
          .set(as(student))
          .expect(200);
        expect(empty.body).toEqual({ certificate: null });

        const { cert } = await issueCertificate();
        const card = await http()
          .get('/certificates/me/achievement')
          .set(as(student))
          .expect(200);
        expect(card.body.certificate).toMatchObject({
          certificateId: cert.certificateId,
          programName: 'AI Builder',
          seen: false,
        });

        await http()
          .post(`/certificates/me/${cert.certificateId}/seen`)
          .set(as(student))
          .expect(201);
        await http()
          .post(`/certificates/me/${cert.certificateId}/seen`)
          .set(as(student))
          .expect(201); // idempotent
        expect(
          (
            await http()
              .get('/certificates/me/achievement')
              .set(as(student))
              .expect(200)
          ).body,
        ).toEqual({ certificate: null });
        expect(
          (await http().get('/certificates/me').set(as(student)).expect(200))
            .body[0].seen,
        ).toBe(true);
      });

      it('downloads are the STORED files, byte for byte — nothing is regenerated', async () => {
        const { cert } = await issueCertificate();
        const row = await prisma.certificate.findUniqueOrThrow({
          where: { certificateId: cert.certificateId },
        });
        const renders = renderer.calls.length;
        const writes = storage.writeLog.length;

        const pdf = await download(
          `/certificates/me/${cert.certificateId}/pdf`,
          student,
        );
        expect(pdf.status).toBe(200);
        expect(pdf.headers['content-type']).toMatch(/application\/pdf/);
        expect(pdf.headers['content-disposition']).toBe(
          `attachment; filename="Lumexa-Certificate-${cert.certificateId}.pdf"`,
        );
        expect(pdf.headers['cache-control']).toBe('private, no-store');
        expect(pdf.headers['x-content-type-options']).toBe('nosniff');
        expect(pdf.body.equals(storage.objects.get(row.pdfKey!)!.body)).toBe(
          true,
        );

        const png = await download(
          `/certificates/me/${cert.certificateId}/image`,
          student,
        );
        expect(png.status).toBe(200);
        expect(png.headers['content-type']).toMatch(/image\/png/);
        expect(png.headers['content-disposition']).toBe(
          `attachment; filename="Lumexa-Certificate-${cert.certificateId}.png"`,
        );
        expect(png.body.equals(storage.objects.get(row.pngKey!)!.body)).toBe(
          true,
        );

        // Viewing and downloading, again and again, renders and writes nothing.
        for (let i = 0; i < 3; i++)
          await download(`/certificates/me/${cert.certificateId}/pdf`, student);
        expect(renderer.calls).toHaveLength(renders);
        expect(storage.writeLog).toHaveLength(writes);
      });

      it('an admin can open the stored files inline or as downloads', async () => {
        const { cert } = await issueCertificate();
        const inline = await download(
          `/admin/certificates/${cert.certificateId}/pdf?inline=1`,
          admin,
        );
        expect(inline.headers['content-disposition']).toMatch(
          /^inline; filename=/,
        );
        const attachment = await download(
          `/admin/certificates/${cert.certificateId}/image`,
          admin,
        );
        expect(attachment.headers['content-disposition']).toMatch(
          /^attachment; filename=/,
        );
        expect(attachment.status).toBe(200);
      });

      it('an R2 outage on download is a friendly retryable error, not a crash', async () => {
        const { cert } = await issueCertificate();
        storage.down = true;
        const res = await download(
          `/certificates/me/${cert.certificateId}/pdf`,
          student,
        );
        expect(res.status).toBe(502);
        expect(JSON.parse(res.body.toString()).message).toMatch(
          /could not be read right now/,
        );
      });

      it('a student can change nothing: there is no write route to a certificate, only "seen"', async () => {
        const { cert } = await issueCertificate();
        const before = await prisma.certificate.findUniqueOrThrow({
          where: { certificateId: cert.certificateId },
        });
        for (const method of ['post', 'put', 'patch'] as const) {
          for (const path of [
            `/certificates/me/${cert.certificateId}`,
            `/certificates/me`,
            `/certificates/${cert.certificateId}`,
          ]) {
            const res = await (http() as any)
              [method](path)
              .set(as(student))
              .send({ recipientName: 'Someone Else', status: 'REVOKED' });
            expect([404, 405]).toContain(res.status);
          }
        }
        expect(
          await prisma.certificate.findUniqueOrThrow({
            where: { certificateId: cert.certificateId },
          }),
        ).toEqual(before);
      });
    });

    // ═══ The congratulatory email ══════════════════════════════════════════════

    describe('the congratulatory email', () => {
      it('is sent once, after issuance, to the family contact — with the stored PDF attached', async () => {
        const { cert } = await issueCertificate();
        const row = await prisma.certificate.findUniqueOrThrow({
          where: { certificateId: cert.certificateId },
        });

        const mails = certificateMails();
        expect(mails).toHaveLength(1);
        const mail = mails[0];
        expect(mail.to).toBe('parent-of-nusrat@example.com'); // the billing contact, like every family notice
        expect(mail.subject).toBe(
          '🎉 Congratulations! Your Lumexa certificate is ready!',
        );
        expect(mail.html).toContain('Hi nusrat,');
        expect(mail.html).toContain('AI Builder');
        expect(mail.html).toContain(formatCertificateDate('2026-10-29'));
        expect(mail.html).toContain(cert.certificateId);
        expect(mail.html).toContain('View &amp; Download Your Certificate');
        expect(mail.html).toContain('Find Your Next Program');
        expect(mail.html).toContain('Fairooz Mashwiyat Omlan');

        // The attachment is exactly the file that was stored.
        expect(mail.attachments).toHaveLength(1);
        expect(mail.attachments![0].filename).toBe(
          `Lumexa-Certificate-${cert.certificateId}.pdf`,
        );
        expect(mail.attachments![0].contentType).toBe('application/pdf');
        expect(
          mail.attachments![0].content.equals(
            storage.objects.get(row.pdfKey!)!.body,
          ),
        ).toBe(true);

        expect(row).toMatchObject({
          emailStatus: 'SENT',
          emailAttempts: 1,
          emailRecipient: 'parent-of-nusrat@example.com',
          emailLastError: null,
        });
        expect(row.emailSentAt).toBeInstanceOf(Date);
        expect(row.emailLogId).toBeTruthy();
        expect(
          await prisma.emailLog.count({
            where: { category: 'CERTIFICATE_ISSUED' },
          }),
        ).toBe(1);
        expect(
          await prisma.auditLog.count({
            where: { action: 'CERTIFICATE_EMAIL_SENT', entityId: row.id },
          }),
        ).toBe(1);
      });

      it('every link comes from FRONTEND_URL, and "next programme" is always the general catalogue', async () => {
        process.env.FRONTEND_URL = 'https://some-new-domain.example';
        const { cert } = await issueCertificate();
        const [mail] = certificateMails();
        const hrefs = [...mail.html.matchAll(/href="([^"]+)"/g)].map((m) =>
          m[1].replace(/&amp;/g, '&'),
        );
        expect(hrefs).toEqual(
          expect.arrayContaining([
            `https://some-new-domain.example/student-dashboard/certificates?highlight=${cert.certificateId}`,
            `https://some-new-domain.example/verify/${cert.certificateId}`,
            'https://some-new-domain.example/programs',
          ]),
        );
        // No other website address — only the shared footer's contact links.
        const foreign = hrefs.filter(
          (h) =>
            !h.startsWith('https://some-new-domain.example') &&
            !h.startsWith('mailto:') &&
            !h.startsWith('https://wa.me/'),
        );
        expect(foreign).toEqual([]);
        expect(hrefs.filter((h) => h.includes('/programs'))).toEqual([
          'https://some-new-domain.example/programs',
        ]);
      });

      it("goes to the student's own address when there is no parent contact", async () => {
        const review = await finishProgram(otherStudent, course, 3);
        const cert = await approveReview(review.id, {
          recipientName: 'Ben Carter',
        });
        await emailSettled(cert.certificateId);
        expect(certificateMails().map((m) => m.to)).toEqual([
          otherStudent.email,
        ]);
      });

      it('a mail failure never un-issues the certificate; it is retried, and sent once, when the mail server is back', async () => {
        smtpFails = true;
        const review = await finishProgram(student, course, 3);
        const cert = await approveReview(review.id);
        const failed = await emailSettled(cert.certificateId, ['FAILED']);
        expect(failed).toMatchObject({
          status: 'ACTIVE',
          emailStatus: 'FAILED',
          emailAttempts: 1,
        });
        expect(failed.emailLastError).toMatch(/SMTP unavailable/);
        expect(certificateMails()).toHaveLength(0);
        expect(
          (await http().get('/certificates/me').set(as(student)).expect(200))
            .body,
        ).toHaveLength(1); // still theirs

        smtpFails = false;
        await prisma.$executeRaw`UPDATE "Certificate" SET "updatedAt" = now() - interval '1 hour' WHERE "certificateId" = ${cert.certificateId}`;
        await emails.retrySweep();
        await emails.retrySweep(); // a second sweep has nothing left to do
        expect(
          await prisma.certificate.findUniqueOrThrow({
            where: { certificateId: cert.certificateId },
          }),
        ).toMatchObject({
          emailStatus: 'SENT',
          emailAttempts: 2,
          emailLastError: null,
        });
        expect(certificateMails()).toHaveLength(1);
        expect(certificateMails()[0].attachments![0].filename).toBe(
          `Lumexa-Certificate-${cert.certificateId}.pdf`,
        );
      });

      it('automatic retries stop after five attempts; an admin can still resend by hand', async () => {
        smtpFails = true;
        const review = await finishProgram(student, course, 3);
        const cert = await approveReview(review.id);
        await emailSettled(cert.certificateId, ['FAILED']);
        for (let attempt = 2; attempt <= 6; attempt++) {
          await prisma.$executeRaw`UPDATE "Certificate" SET "updatedAt" = now() - interval '1 day' WHERE "certificateId" = ${cert.certificateId}`;
          await emails.retrySweep();
        }
        const capped = await prisma.certificate.findUniqueOrThrow({
          where: { certificateId: cert.certificateId },
        });
        expect(capped).toMatchObject({
          emailStatus: 'FAILED',
          emailAttempts: 5,
        }); // the sixth sweep did nothing

        smtpFails = false;
        const res = await adminPost(
          `/${cert.certificateId}/resend-email`,
        ).expect(201);
        expect(res.body.outcome).toBe('sent');
        expect(res.body.certificate.email.status).toBe('SENT');
        expect(certificateMails()).toHaveLength(1);
      });

      it('can never send the congratulation twice: repeated and simultaneous deliveries send one', async () => {
        const { cert } = await issueCertificate(); // sent: one mail
        const row = await prisma.certificate.findUniqueOrThrow({
          where: { certificateId: cert.certificateId },
        });

        const repeated = await Promise.all([
          emails.deliver(row.id),
          emails.deliver(row.id),
          emails.deliver(row.id),
        ]);
        expect(repeated).toEqual(['busy', 'busy', 'busy']);
        await emails.retrySweep();
        expect(certificateMails()).toHaveLength(1);

        // From a fresh PENDING state, simultaneous callers still send exactly once.
        await prisma.certificate.update({
          where: { id: row.id },
          data: { emailStatus: 'PENDING' },
        });
        const racing = await Promise.all(
          Array.from({ length: 5 }, () => emails.deliver(row.id)),
        );
        expect(racing.filter((outcome) => outcome === 'sent')).toHaveLength(1);
        expect(racing.filter((outcome) => outcome === 'busy')).toHaveLength(4);
        expect(certificateMails()).toHaveLength(2); // the first, plus the one this reset allowed
      });

      it('an attempt whose outcome is unknown is never blindly repeated — the sweep asks what the mail system recorded', async () => {
        const { cert } = await issueCertificate();
        const row = await prisma.certificate.findUniqueOrThrow({
          where: { certificateId: cert.certificateId },
        });
        const log = await prisma.emailLog.findFirstOrThrow({
          where: { category: 'CERTIFICATE_ISSUED' },
        });
        const interrupted = {
          emailStatus: 'SENDING' as const,
          emailSendingSince: new Date(Date.now() - 10 * 60_000),
          emailSentAt: null,
        };

        // The mail was accepted, but the process died before we recorded it: mark SENT, send nothing.
        await prisma.certificate.update({
          where: { id: row.id },
          data: interrupted,
        });
        await emails.retrySweep();
        expect(
          await prisma.certificate.findUniqueOrThrow({ where: { id: row.id } }),
        ).toMatchObject({ emailStatus: 'SENT' });
        expect(certificateMails()).toHaveLength(1);

        // The journal says the attempt failed: it may be tried again.
        await prisma.emailLog.update({
          where: { id: log.id },
          data: { status: 'FAILED', lastError: 'connection reset' },
        });
        await prisma.certificate.update({
          where: { id: row.id },
          data: interrupted,
        });
        await emails.reconcileInFlight();
        expect(
          await prisma.certificate.findUniqueOrThrow({ where: { id: row.id } }),
        ).toMatchObject({
          emailStatus: 'FAILED',
          emailLastError: 'connection reset',
        });

        // It never reached the mail server at all.
        await prisma.emailLog.delete({ where: { id: log.id } });
        await prisma.certificate.update({
          where: { id: row.id },
          data: interrupted,
        });
        await emails.reconcileInFlight();
        expect(
          (
            await prisma.certificate.findUniqueOrThrow({
              where: { id: row.id },
            })
          ).emailLastError,
        ).toMatch(/interrupted/);
        expect(certificateMails()).toHaveLength(1); // nothing was sent in all of this
      });

      it('an admin can resend, but a second congratulation after a successful one must be explicit', async () => {
        const { cert } = await issueCertificate();
        const plain = await adminPost(
          `/${cert.certificateId}/resend-email`,
          {},
        );
        expect(plain.status).toBe(409);
        expect(plain.body.message).toMatch(/already emailed/);
        expect(certificateMails()).toHaveLength(1);

        const forced = await adminPost(
          `/${cert.certificateId}/resend-email`,
          { force: true },
          admin2,
        ).expect(201);
        expect(forced.body.outcome).toBe('sent');
        expect(certificateMails()).toHaveLength(2);
        expect(
          certificateMails()[1].attachments![0].content.equals(
            certificateMails()[0].attachments![0].content,
          ),
        ).toBe(true);
        const audit = await prisma.auditLog.findFirstOrThrow({
          where: { action: 'CERTIFICATE_EMAIL_RESENT' },
        });
        expect(audit).toMatchObject({ actorId: admin2.id, actorRole: 'ADMIN' });
        expect(audit.afterData).toMatchObject({
          previousStatus: 'SENT',
          forced: true,
        });
      });
    });

    // ═══ Certificates issued by the previous system ════════════════════════════

    describe('certificates from the previous system', () => {
      const LEGACY_ID = 'LMX-2026-000417';
      beforeEach(async () => {
        await prisma.certificate.create({
          data: {
            certificateId: LEGACY_ID,
            studentUserId: student.id,
            courseId: course.id,
            status: 'ACTIVE',
            recipientName: 'Nusrat Jahan',
            programName: 'AI Builder',
            completionDate: '2026-09-20',
            issuedAt: new Date('2026-09-21T06:00:00Z'),
            theme: 'legacy',
            templateVersion: 'legacy',
            pdfUrl: 'https://legacy-files.example/old-certificate.pdf',
            emailStatus: 'SKIPPED',
          },
        });
      });

      it('stay visible, verifiable and downloadable', async () => {
        const mine = await http()
          .get('/certificates/me')
          .set(as(student))
          .expect(200);
        expect(mine.body[0]).toMatchObject({
          certificateId: LEGACY_ID,
          status: 'ACTIVE',
          isLegacy: true,
          canDownload: true,
          hasImage: false,
          issueDate: '2026-09-21',
        });
        const verify = await http()
          .get(`/certificates/verify/${LEGACY_ID}`)
          .expect(200);
        expect(verify.body).toMatchObject({
          certificateId: LEGACY_ID,
          status: 'ACTIVE',
          issueDate: '2026-09-21',
        });

        const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(
          new Response(Buffer.from('%PDF-1.4 legacy certificate'), {
            status: 200,
          }),
        );
        try {
          const pdf = await http()
            .get(`/certificates/me/${LEGACY_ID}/pdf`)
            .set(as(student))
            .buffer(true)
            .parse((res, cb) => {
              const chunks: Buffer[] = [];
              res.on('data', (c: Buffer) => chunks.push(c));
              res.on('end', () => cb(null, Buffer.concat(chunks)));
            });
          expect(pdf.status).toBe(200);
          expect((pdf.body as Buffer).toString()).toBe(
            '%PDF-1.4 legacy certificate',
          );
          expect(fetchSpy).toHaveBeenCalledWith(
            'https://legacy-files.example/old-certificate.pdf',
          );
        } finally {
          fetchSpy.mockRestore();
        }
        await http()
          .get(`/certificates/me/${LEGACY_ID}/image`)
          .set(as(student))
          .expect(404); // it never had one
      });

      it('are never re-emailed, and finishing the programme opens no second review', async () => {
        const row = await prisma.certificate.findUniqueOrThrow({
          where: { certificateId: LEGACY_ID },
        });
        expect(await emails.deliver(row.id)).toBe('busy'); // SKIPPED is not startable automatically
        await adminPost(`/${LEGACY_ID}/resend-email`, {}).expect(409); // no stored PDF to attach
        expect(certificateMails()).toHaveLength(0);

        const rows = await scheduleClasses(student, course, [1, 2], [3]);
        await finalizeAs(rows[3]);
        expect(await prisma.certificateReview.count()).toBe(0);
      });

      it('can be replaced by a certificate in the new design — the old record is kept', async () => {
        const res = await adminPost(`/${LEGACY_ID}/replace`, {
          reason: 'Re-issued in the official design',
        }).expect(400); // nothing changed
        expect(res.body.message).toMatch(/Nothing was corrected/);
        const next = (
          await adminPost(`/${LEGACY_ID}/replace`, {
            reason: 'Re-issued in the official design',
            completionDate: '2026-09-19',
          }).expect(201)
        ).body;
        expect(next).toMatchObject({
          status: 'ACTIVE',
          templateVersion: 'v1',
          replaces: LEGACY_ID,
          completionDate: '2026-09-19',
        });
        const old = await prisma.certificate.findUniqueOrThrow({
          where: { certificateId: LEGACY_ID },
        });
        expect(old).toMatchObject({
          status: 'REPLACED',
          pdfUrl: 'https://legacy-files.example/old-certificate.pdf',
        });
      });
    });

    // ═══ The frontend address ══════════════════════════════════════════════════

    describe('the frontend address', () => {
      it('is read from FRONTEND_URL every time — changing the domain changes the links, nothing is hard-coded', async () => {
        const { cert } = await issueCertificate();
        process.env.FRONTEND_URL = 'https://brand-new-domain.example';
        const mine = await http()
          .get('/certificates/me')
          .set(as(student))
          .expect(200);
        expect(mine.body[0].verificationUrl).toBe(
          `https://brand-new-domain.example/verify/${cert.certificateId}`,
        );
        const seenByAdmin = await adminGet(`/${cert.certificateId}`).expect(
          200,
        );
        expect(seenByAdmin.body.verificationUrl).toBe(
          `https://brand-new-domain.example/verify/${cert.certificateId}`,
        );
      });

      it('uses the first address of a comma-separated list, as everywhere else on the platform', async () => {
        process.env.FRONTEND_URL =
          'https://main.example, https://www.main.example';
        const review = await finishProgram(student, course, 3);
        const cert = await approveReview(review.id);
        expect(cert.verificationUrl).toBe(
          `https://main.example/verify/${cert.certificateId}`,
        );
        expect(renderer.calls[0].verificationUrl).toBe(
          `https://main.example/verify/${cert.certificateId}`,
        );
      });

      it('a broken FRONTEND_URL stops issuing only — reading and verifying keep working', async () => {
        const { cert } = await issueCertificate();
        delete process.env.FRONTEND_URL;
        const mine = await http()
          .get('/certificates/me')
          .set(as(student))
          .expect(200);
        expect(mine.body[0].verificationUrl).toBeNull();
        await http()
          .get(`/certificates/verify/${cert.certificateId}`)
          .expect(200);
        await adminGet(`/${cert.certificateId}`).expect(200);
        await adminPost(`/${cert.certificateId}/revoke`, {
          reason: 'still allowed',
        }).expect(201);
      });
    });

    // ═══ What the admin sees ═══════════════════════════════════════════════════

    describe("the admin's lists and history", () => {
      it('Issued / Revoked / Replaced tabs, search and paging, with the counts the tabs show', async () => {
        const s1 = student;
        const s2 = await makeUser(prisma, 'kate-student', Role.STUDENT);
        const s3 = await makeUser(prisma, 'omar-student', Role.STUDENT);
        const c1 = (
          await issueCertificate({ recipientName: 'Nusrat Jahan' }, s1)
        ).cert;
        const c2 = (await issueCertificate({ recipientName: 'Kate Moss' }, s2))
          .cert;
        const c3 = (await issueCertificate({ recipientName: 'Omar Khan' }, s3))
          .cert;
        await adminPost(`/${c2.certificateId}/revoke`, {
          reason: 'mistake',
        }).expect(201);
        const c3b = (
          await adminPost(`/${c3.certificateId}/replace`, {
            reason: 'typo',
            recipientName: 'Omar Khan Jr',
          }).expect(201)
        ).body;

        expect((await adminGet('/summary').expect(200)).body).toEqual({
          pending: 0,
          dismissed: 0,
          issued: 2,
          revoked: 1,
          replaced: 1,
        });

        const ids = async (query: string) =>
          (
            (await adminGet(`/issued${query}`).expect(200)).body.items as {
              certificateId: string;
            }[]
          )
            .map((i) => i.certificateId)
            .sort();
        expect(await ids('')).toEqual(
          [
            c1.certificateId,
            c2.certificateId,
            c3.certificateId,
            c3b.certificateId,
          ].sort(),
        );
        expect(await ids('?status=ACTIVE')).toEqual(
          [c1.certificateId, c3b.certificateId].sort(),
        );
        expect(await ids('?status=REVOKED')).toEqual([c2.certificateId]);
        expect(await ids('?status=REPLACED')).toEqual([c3.certificateId]);
        expect(await ids('?search=kate')).toEqual([c2.certificateId]); // student name
        expect(await ids('?search=Omar%20Khan%20Jr')).toEqual([
          c3b.certificateId,
        ]); // printed name
        expect(await ids(`?search=${c1.certificateId.toLowerCase()}`)).toEqual([
          c1.certificateId,
        ]); // certificate ID
        expect(await ids(`?search=${encodeURIComponent(s1.email)}`)).toEqual([
          c1.certificateId,
        ]); // student e-mail

        const page = await adminGet('/issued?limit=3&page=2').expect(200);
        expect(page.body).toMatchObject({ total: 4, page: 2, totalPages: 2 });
        expect(page.body.items).toHaveLength(1);
        expect(page.body.items[0].student).toMatchObject({
          id: expect.any(String),
          fullName: expect.any(String),
          email: expect.any(String),
        });
      });

      it('the history says who did what and when, newest first', async () => {
        const { cert } = await issueCertificate();
        await adminPost(
          `/${cert.certificateId}/revoke`,
          { reason: 'mistake' },
          admin2,
        ).expect(201);
        const history = (
          await adminGet(`/${cert.certificateId}/history`).expect(200)
        ).body as {
          action: string;
          actorName: string;
          actorRole: string;
          at: string;
          reason: string | null;
        }[];
        const actions = history.map((h) => h.action);
        expect(actions[0]).toBe('CERTIFICATE_REVOKED');
        expect(actions).toEqual(
          expect.arrayContaining([
            'CERTIFICATE_REVIEW_CREATED',
            'CERTIFICATE_APPROVED',
            'CERTIFICATE_ISSUED',
            'CERTIFICATE_EMAIL_SENT',
            'CERTIFICATE_REVOKED',
          ]),
        );
        expect(history[0]).toMatchObject({
          actorName: 'second admin',
          actorRole: 'ADMIN',
          reason: 'mistake',
        });
        expect(
          history.find((h) => h.action === 'CERTIFICATE_APPROVED'),
        ).toMatchObject({ actorName: 'ops admin' });
        expect(
          history.find((h) => h.action === 'CERTIFICATE_REVIEW_CREATED'),
        ).toMatchObject({ actorName: 'System' });
        const times = history.map((h) => new Date(h.at).getTime());
        expect([...times].sort((a, b) => b - a)).toEqual(times);
      });

      it('an unknown or malformed certificate ID is a 404 everywhere', async () => {
        for (const path of [
          '/LXA-2026-ZZZZZZ',
          '/nonsense',
          '/LXA-2026-ZZZZZZ/history',
          '/LXA-2026-ZZZZZZ/pdf',
          '/LXA-2026-ZZZZZZ/image',
        ]) {
          await adminGet(path).expect(404);
        }
        await adminPost('/LXA-2026-ZZZZZZ/revoke', { reason: 'x' }).expect(404);
        await adminPost('/LXA-2026-ZZZZZZ/replace', {
          reason: 'x',
          recipientName: 'A B',
        }).expect(404);
        await adminPost('/LXA-2026-ZZZZZZ/resend-email', {}).expect(404);
      });

      it('reports whether certificates can be issued right now', async () => {
        expect((await adminGet('/status').expect(200)).body).toEqual({
          canIssue: true,
          problems: [],
        });
      });
    });

    // ═══ Permanent retention, end to end ═══════════════════════════════════════

    describe('permanent retention', () => {
      it('across approval, replacement and revocation no stored file is ever deleted, changed or overwritten', async () => {
        const { cert } = await issueCertificate();
        const snapshot = () =>
          new Map(
            [...storage.objects].map(([k, v]) => [k, v.body.toString('hex')]),
          );
        const afterIssue = snapshot();

        const replaced = (
          await adminPost(`/${cert.certificateId}/replace`, {
            reason: 'typo',
            recipientName: 'Nusrat J Tamanna',
          }).expect(201)
        ).body;
        await emailSettled(replaced.certificateId);
        const afterReplace = snapshot();
        await adminPost(`/${replaced.certificateId}/revoke`, {
          reason: 'test',
        }).expect(201);
        await adminPost(`/${replaced.certificateId}/resend-email`, {
          force: true,
        }).expect(409); // revoked: no more mail

        // Every key was written exactly once, ever…
        expect(new Set(storage.writeLog).size).toBe(storage.writeLog.length);
        // …everything stored earlier is still there, byte for byte…
        for (const [key, hex] of afterIssue)
          expect(storage.objects.get(key)?.body.toString('hex')).toBe(hex);
        for (const [key, hex] of afterReplace)
          expect(storage.objects.get(key)?.body.toString('hex')).toBe(hex);
        expect(storage.objects.size).toBe(4);
        // …and every certificate record — whatever its status — still has both its files.
        for (const row of await prisma.certificate.findMany()) {
          expect(storage.objects.has(row.pdfKey!)).toBe(true);
          expect(storage.objects.has(row.pngKey!)).toBe(true);
        }
      });

      it('the database itself refuses a second review, a duplicate ID, a second active certificate and an issued record without files', async () => {
        const { cert } = await issueCertificate();
        const row = await prisma.certificate.findUniqueOrThrow({
          where: { certificateId: cert.certificateId },
        });
        const base = {
          studentUserId: student.id,
          courseId: course.id,
          recipientName: 'Nusrat Jahan',
          programName: 'AI Builder',
          completionDate: '2026-10-29',
          theme: 'general',
          templateVersion: 'v1',
          storageBucket: 'lumexa-certificates',
          emailStatus: 'SKIPPED' as const,
        };
        // a second review for the same student and programme
        await expect(
          prisma.certificateReview.create({
            data: {
              studentUserId: student.id,
              courseId: course.id,
              finalClassId: 'x',
              completedAt: new Date(),
              suggestedCompletionDate: '2026-10-29',
              source: 'RECONCILIATION',
            },
          }),
        ).rejects.toMatchObject({ code: 'P2002' });
        // the same public ID, or the same file keys, twice
        await expect(
          prisma.certificate.create({
            data: {
              ...base,
              status: 'REVOKED',
              revokedAt: new Date(),
              certificateId: row.certificateId,
              pdfKey: 'k/other.pdf',
              pngKey: 'k/other.png',
            },
          }),
        ).rejects.toMatchObject({ code: 'P2002' });
        await expect(
          prisma.certificate.create({
            data: {
              ...base,
              status: 'REVOKED',
              revokedAt: new Date(),
              certificateId: 'LXA-2026-QQQQQ2',
              pdfKey: row.pdfKey,
              pngKey: 'k/other2.png',
            },
          }),
        ).rejects.toMatchObject({ code: 'P2002' });
        // a second ACTIVE certificate for the same student and programme
        await expect(
          prisma.certificate.create({
            data: {
              ...base,
              status: 'ACTIVE',
              certificateId: 'LXA-2026-QQQQQ3',
              pdfKey: 'k/a.pdf',
              pngKey: 'k/a.png',
            },
          }),
        ).rejects.toThrow();
        // an issued certificate without its files
        await expect(
          prisma.certificate.create({
            data: {
              ...base,
              studentUserId: otherStudent.id,
              status: 'ACTIVE',
              certificateId: 'LXA-2026-QQQQQ4',
              pdfKey: null,
              pngKey: null,
            },
          }),
        ).rejects.toThrow();
        // a malformed completion date
        await expect(
          prisma.certificate.create({
            data: {
              ...base,
              studentUserId: otherStudent.id,
              status: 'ACTIVE',
              certificateId: 'LXA-2026-QQQQQ5',
              completionDate: '29/10/2026',
              pdfKey: 'k/b.pdf',
              pngKey: 'k/b.png',
            },
          }),
        ).rejects.toThrow();
        expect(await prisma.certificate.count()).toBe(1);
      });
    });
  },
);
