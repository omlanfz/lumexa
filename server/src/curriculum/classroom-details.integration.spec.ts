// The lesson of the class a student is attending, opened from inside the
// classroom — over HTTP, with the real guards, against a REAL Postgres.
//
//   - the standalone lesson page keeps an upcoming lesson locked;
//   - the classroom's own route opens it, only for the student who has joined this
//     class, while it is running, and only that class's lesson;
//   - everything else stays locked, and other people's classes stay closed.
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
process.env.JWT_SECRET = 'classroom-details-integration-secret';

import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import {
  ClassType,
  ClassroomAdmissionStatus,
  LessonStatus,
  Role,
} from '@prisma/client';
import request from 'supertest';
import { makeCourse, makeUser, Person } from '../batches/testing/batch-world';
import { JwtStrategy } from '../auth/jwt.strategy';
import { AllExceptionsFilter } from '../filters/http-exception.filter';
import { PrismaModule } from '../prisma.module';
import { PrismaService } from '../prisma.service';
import { CurriculumController } from './curriculum.controller';
import { CurriculumDocumentsService } from './curriculum-documents.service';
import { CurriculumService } from './curriculum.service';

const describeDb = IT_DB_URL ? describe : describe.skip;
const minutes = (m: number) => new Date(Date.now() + m * 60_000);

describeDb(
  'Lesson of the class being attended (real Postgres, over HTTP)',
  () => {
    jest.setTimeout(120_000);

    let app: INestApplication;
    let prisma: PrismaService;
    let jwt: JwtService;
    let releaseLock: () => void;
    let teacher: Person;
    let otherTeacher: Person;
    let student: Person;
    let stranger: Person;
    let courseId: string;

    const bearer = (p: Person) => ({
      Authorization: `Bearer ${jwt.sign({ sub: p.id, email: p.email, role: p.role })}`,
    });
    const get = (path: string, who: Person) =>
      request(app.getHttpServer()).get(path).set(bearer(who));
    const standalone = (id: string, who: Person) =>
      get(`/curriculum/scheduled-lessons/${id}/details`, who);
    const inClass = (id: string, who: Person) =>
      get(`/curriculum/scheduled-lessons/${id}/classroom-details`, who);

    async function lessonRow(
      over: Record<string, unknown> = {},
      lessonNumber = 1,
    ) {
      const lesson = await prisma.lesson.findFirstOrThrow({
        where: { courseId, order: lessonNumber },
      });
      return prisma.scheduledLesson.create({
        data: {
          studentUserId: student.id,
          teacherId: teacher.profileId!,
          courseId,
          lessonNumber,
          lessonId: lesson.id,
          start: minutes(-5),
          end: minutes(55),
          classType: ClassType.ONE_TO_ONE,
          status: LessonStatus.UPCOMING,
          studentJoinedAt: new Date(),
          ...over,
        },
      });
    }

    beforeAll(async () => {
      releaseLock = await acquireDatabaseLock(IT_DB_URL as string);
      jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
      const moduleRef = await Test.createTestingModule({
        imports: [PrismaModule, PassportModule],
        controllers: [CurriculumController],
        providers: [
          JwtStrategy,
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
        new ValidationPipe({ whitelist: true, transform: true }),
      );
      app.useGlobalFilters(new AllExceptionsFilter());
      await app.listen(0);
      prisma = moduleRef.get(PrismaService);
      jwt = new JwtService({ secret: process.env.JWT_SECRET });
    }, 150_000);

    afterAll(async () => {
      jest.restoreAllMocks();
      await app?.close();
      releaseLock?.();
    });

    beforeEach(async () => {
      await truncateAssessmentData(prisma);
      teacher = await makeUser(prisma, 'ms-karim', Role.TEACHER);
      otherTeacher = await makeUser(prisma, 'mr-hasan', Role.TEACHER);
      student = await makeUser(prisma, 'ada-lovelace', Role.STUDENT);
      stranger = await makeUser(prisma, 'ben-carson', Role.STUDENT);
      courseId = (await makeCourse(prisma, 'cls-course', 4)).id;
    });

    it('the student who has joined sees the current lesson in the classroom — and still not on the standalone page', async () => {
      const sl = await lessonRow();
      const page = await standalone(sl.id, student);
      expect(page.status).toBe(200);
      expect(page.body).toMatchObject({
        available: false,
        reason: 'UPCOMING_LOCKED',
      });

      const room = await inClass(sl.id, student);
      expect(room.status).toBe(200);
      expect(room.body.available).toBe(true);
      expect(room.body.lesson.title).toBe('Lesson 1');
    });

    it('a FUTURE lesson of the same student stays locked, in the classroom route too', async () => {
      const current = await lessonRow();
      const future = await lessonRow(
        {
          start: minutes(60 * 24 * 7),
          end: minutes(60 * 24 * 7 + 60),
          studentJoinedAt: null,
        },
        2,
      );
      expect((await inClass(current.id, student)).body.available).toBe(true);
      expect((await inClass(future.id, student)).body).toMatchObject({
        available: false,
        reason: 'UPCOMING_LOCKED',
      });
      // Even having (somehow) joined, a class whose room has not opened yet stays closed.
      await prisma.scheduledLesson.update({
        where: { id: future.id },
        data: { studentJoinedAt: new Date() },
      });
      expect((await inClass(future.id, student)).body.available).toBe(false);
    });

    it('is locked until the student has actually joined, and after the class ends', async () => {
      const sl = await lessonRow({ studentJoinedAt: null });
      expect((await inClass(sl.id, student)).body.available).toBe(false);
      await prisma.scheduledLesson.update({
        where: { id: sl.id },
        data: { studentJoinedAt: new Date() },
      });
      expect((await inClass(sl.id, student)).body.available).toBe(true);
      await prisma.scheduledLesson.update({
        where: { id: sl.id },
        data: { status: LessonStatus.CANCELLED },
      });
      expect((await inClass(sl.id, student)).body).toMatchObject({
        available: false,
        reason: 'CANCELLED',
      });
    });

    it('a student the teacher removed (and has not let back in) is locked out', async () => {
      const sl = await lessonRow();
      await prisma.classroomAdmission.create({
        data: {
          room: `lesson-${sl.id}`,
          userId: student.id,
          displayName: 'Ada',
          role: 'STUDENT',
          status: ClassroomAdmissionStatus.REMOVED,
        },
      });
      expect((await inClass(sl.id, student)).body.available).toBe(false);
      await prisma.classroomAdmission.create({
        data: {
          room: `lesson-${sl.id}`,
          userId: student.id,
          displayName: 'Ada',
          role: 'STUDENT',
          status: ClassroomAdmissionStatus.APPROVED,
        },
      });
      expect((await inClass(sl.id, student)).body.available).toBe(true);
    });

    it('another student, another teacher and a stranger cannot read it; the class’s teacher can', async () => {
      const sl = await lessonRow();
      expect((await inClass(sl.id, stranger)).status).toBe(403);
      expect((await inClass(sl.id, otherTeacher)).status).toBe(403);
      expect((await inClass(sl.id, teacher)).body.available).toBe(true);
      expect(
        (
          await request(app.getHttpServer()).get(
            `/curriculum/scheduled-lessons/${sl.id}/classroom-details`,
          )
        ).status,
      ).toBe(401);
    });
  },
);
