// What the Operations screens read once students are in batches — the Classes
// page (a batch class once, with its students), the students list and a
// student's page (their batch), a teacher's upcoming classes — and the admin
// actions that touch a batch student (pause, resume, change teacher or
// curriculum). Against a REAL Postgres; email, alerts and the video room are
// faked.
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

import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { Role } from '@prisma/client';
import { AdminService } from '../admin/admin.service';
import { PrismaModule } from '../prisma.module';
import { PrismaService } from '../prisma.service';
import {
  BatchWorld,
  Person,
  buildBatchWorld,
  makeCourse,
  makeUser,
  weeklyFrom,
} from './testing/batch-world';

const describeDb = IT_DB_URL ? describe : describe.skip;

describeDb('Operations views of batches (real Postgres)', () => {
  jest.setTimeout(180_000);

  let prisma: PrismaService;
  let w: BatchWorld;
  let adminService: AdminService;
  let releaseLock: () => void;

  let admin: Person;
  let teacher: Person;
  let course: { id: string; title: string; sessions: number };
  let batchId: string;
  let ada: Person;
  let ben: Person;
  let solo: Person;

  async function makeStudent(name: string) {
    return makeUser(prisma, name, Role.STUDENT, {
      assignedTeacherId: teacher.profileId,
      assignedCourseId: course.id,
    });
  }

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
    adminService = new AdminService(
      prisma,
      {} as never, // Stripe
      w.audit,
      w.payouts,
      w.ledger,
      w.scheduling,
      w.notifications as never,
      {} as never, // ClassroomService
      w.batches,
      new JwtService({ secret: 'x' }),
    );
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
    course = await makeCourse(prisma, 'views-course', 6);
    batchId = (
      await w.batches.createBatch(
        {
          name: 'Evening Odyssey',
          teacherId: teacher.profileId!,
          courseId: course.id,
          ...weeklyFrom(2, '17:00'),
        } as never,
        admin.id,
      )
    ).batch.id;
    ada = await makeStudent('ada-lovelace');
    ben = await makeStudent('ben-carson');
    solo = await makeStudent('solo-sam');
    for (const s of [ada, ben]) {
      await w.batches.enrollStudent({
        studentUserId: s.id,
        batchId,
        adminUserId: admin.id,
      });
    }
    await w.scheduling.setStudentSchedule(
      solo.id,
      { classType: 'ONE_TO_ONE', ...weeklyFrom(3, '10:00') } as never,
      admin.id,
    );
  });

  describe('the Classes page', () => {
    it('shows a batch class ONCE, as the batch with its students, beside the 1-to-1 classes', async () => {
      const page = await adminService.getAllBookings(1, 50, {});
      const rows = page.classes as any[];
      const sessions = rows.filter((r) => r.kind === 'SESSION');
      const lessons = rows.filter((r) => r.kind === 'LESSON');

      expect(sessions).toHaveLength(6); // six classes — not twelve student rows
      expect(lessons).toHaveLength(6);
      expect(lessons.every((l) => l.studentUserId === solo.id)).toBe(true);
      expect(sessions[0]).toMatchObject({
        classType: 'BATCH',
        batch: { id: batchId, name: 'Evening Odyssey' },
        teacherName: 'ms karim',
        displayStatus: 'SCHEDULED',
      });
      expect(sessions[0].studentName).toBe('Evening Odyssey · 2 students');
      expect(
        sessions[0].students
          .map((s: { fullName: string }) => s.fullName)
          .sort(),
      ).toEqual(['ada lovelace', 'ben carson']);
      // No row of the batch's students is listed on its own.
      expect(
        rows.filter(
          (r) => r.studentUserId === ada.id || r.studentUserId === ben.id,
        ),
      ).toHaveLength(0);
    });

    it('filters batch classes like any other: by teacher, by student', async () => {
      const other = await makeUser(prisma, 'mr-other', Role.TEACHER);
      const byOther = await adminService.getAllBookings(1, 50, {
        teacherId: other.profileId!,
      });
      expect(byOther.classes).toHaveLength(0);
      const byAda = await adminService.getAllBookings(1, 50, {
        studentUserId: ada.id,
      });
      expect((byAda.classes as any[]).every((r) => r.kind === 'SESSION')).toBe(
        true,
      );
      expect(byAda.classes).toHaveLength(6);
    });

    it('a class that has been held is one row with its outcome', async () => {
      const [first] = await prisma.batchSession.findMany({
        where: { batchId },
        orderBy: { start: 'asc' },
      });
      const start = new Date(Date.now() - 30 * 60_000);
      const end = new Date(Date.now() + 30 * 60_000);
      await prisma.batchSession.update({
        where: { id: first.id },
        data: {
          start,
          end,
          teacherJoinedAt: new Date(start.getTime() - 60_000),
        },
      });
      await prisma.scheduledLesson.updateMany({
        where: { batchSessionId: first.id },
        data: { start, end, studentJoinedAt: new Date() },
      });
      // An admin settles the class from one student's row: the whole class.
      const row = await prisma.scheduledLesson.findFirstOrThrow({
        where: { batchSessionId: first.id, studentUserId: ada.id },
      });
      const result = await w.finalization.finalizeLesson(row.id, {
        outcome: 'COMPLETED',
        actor: { role: 'ADMIN', userId: admin.id },
      });
      expect(result.finalized).toBe(true);

      const page = await adminService.getAllBookings(1, 50, {
        status: 'COMPLETED',
      });
      const done = (page.classes as any[]).filter((r) => r.kind === 'SESSION');
      expect(done).toHaveLength(1);
      expect(done[0]).toMatchObject({
        id: first.id,
        displayStatus: 'COMPLETED',
      });
      expect(
        await prisma.payoutEntry.count({ where: { type: 'CLASS_COMPLETED' } }),
      ).toBe(1);
    });
  });

  describe('students', () => {
    it('the students list says which batch each student is in', async () => {
      const res = await adminService.getAllStudents(1, 50);
      const by = Object.fromEntries(
        (res.students as any[]).map((s) => [s.fullName, s]),
      );
      expect(by['ada lovelace']).toMatchObject({
        assignedClassType: 'BATCH',
        batch: { id: batchId, name: 'Evening Odyssey' },
      });
      expect(by['ben carson'].batch.name).toBe('Evening Odyssey');
      expect(by['solo sam']).toMatchObject({
        assignedClassType: 'ONE_TO_ONE',
        batch: null,
      });
      // Nothing about the raw placement rows leaks into the list.
      expect(by['ada lovelace']).not.toHaveProperty('batchMemberships');
    });

    it('a student’s page has their batch and a class history that names it', async () => {
      const detail = await adminService.getStudentDetail(ada.id);
      expect(detail.batch).toMatchObject({
        id: batchId,
        name: 'Evening Odyssey',
      });
      expect(detail.assignedClassType).toBe('BATCH');
      const history = detail.classHistory as any[];
      expect(history).toHaveLength(6);
      expect(history[0]).toMatchObject({
        classType: 'BATCH',
        batchName: 'Evening Odyssey',
      });
      expect(history.every((h) => h.batchName === 'Evening Odyssey')).toBe(
        true,
      );

      const soloDetail = await adminService.getStudentDetail(solo.id);
      expect(soloDetail.batch).toBeNull();
      expect((soloDetail.classHistory as any[])[0].batchName).toBeNull();
    });

    it('lists the batch classes of a teacher with their students, beside the 1-to-1 classes', async () => {
      const rows = await w.scheduling.getTeacherUpcomingLessonsForAdmin(
        teacher.profileId!,
      );
      const sessions = rows.filter((r) => r.kind === 'BATCH_SESSION');
      expect(sessions).toHaveLength(6);
      expect(sessions[0]).toMatchObject({
        batch: { id: batchId, name: 'Evening Odyssey' },
        classType: 'BATCH',
        lessonNumber: 1,
      });
      expect(
        (sessions[0].students ?? []).map((s) => s.fullName).sort(),
      ).toEqual(['ada lovelace', 'ben carson']);
      expect(rows.filter((r) => r.kind === 'LESSON')).toHaveLength(6);
    });
  });

  describe('admin actions on a batch student', () => {
    it('cannot give a batch student another teacher or curriculum on their own — it would split them from their batch', async () => {
      const other = await makeUser(prisma, 'mr-other', Role.TEACHER);
      await expect(
        adminService.assignTeacherToStudent(ada.id, other.profileId!, admin.id),
      ).rejects.toThrow(/in the batch "Evening Odyssey"/);
      const otherCourse = await makeCourse(prisma, 'other-course', 6);
      await expect(
        adminService.assignCourseToStudent(ada.id, otherCourse.id, admin.id),
      ).rejects.toThrow(/in the batch "Evening Odyssey"/);
      const fresh = await prisma.user.findUniqueOrThrow({
        where: { id: ada.id },
      });
      expect(fresh.assignedTeacherId).toBe(teacher.profileId);
      expect(fresh.assignedCourseId).toBe(course.id);
      // The classes are untouched.
      expect(
        await prisma.scheduledLesson.count({
          where: { studentUserId: ada.id, status: 'UPCOMING' },
        }),
      ).toBe(6);
    });

    it('a 1-to-1 student’s teacher can still be changed as before', async () => {
      const other = await makeUser(prisma, 'mr-other', Role.TEACHER);
      await expect(
        adminService.assignTeacherToStudent(
          solo.id,
          other.profileId!,
          admin.id,
        ),
      ).resolves.toMatchObject({ assignedTeacherId: other.profileId });
    });

    it('pausing a batch student takes them out of the classes ahead and keeps their seat; resuming puts them back', async () => {
      await adminService.pauseStudent(ada.id, 'Family trip', admin.id);
      expect(
        await prisma.scheduledLesson.count({
          where: { studentUserId: ada.id, status: 'UPCOMING' },
        }),
      ).toBe(0);
      expect(
        await prisma.batchMember.count({
          where: { studentUserId: ada.id, leftAt: null },
        }),
      ).toBe(1);
      // The batch carries on for the others.
      for (const s of await prisma.batchSession.findMany({
        where: { batchId },
        include: { participants: true },
      })) {
        expect(s.participants.map((p) => p.studentUserId)).toEqual([ben.id]);
      }

      const back = await adminService.resumeStudent(ada.id, admin.id);
      expect(back.batch).toMatchObject({ rejoined: true, atLesson: 1 });
      expect(
        await prisma.scheduledLesson.count({
          where: { studentUserId: ada.id, status: 'UPCOMING' },
        }),
      ).toBe(6);
    });
  });
});
