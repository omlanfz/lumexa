// Batch management against a REAL Postgres: creating batches, placing students
// (existing and new), the decisions a placement needs, moving students between
// batches and between 1-to-1 and Batch, the classes a batch holds (one class,
// one row per student), make-up classes, finalization money, and the races two
// admins can start. Email, alerts and the video room are faked; everything else
// is the real code.
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
import { Test } from '@nestjs/testing';
import { ClassType, LessonStatus, Role } from '@prisma/client';
import { PrismaModule } from '../prisma.module';
import { PrismaService } from '../prisma.service';
import { CLASS_COMPLETED_AMOUNT_CENTS } from '../payouts/payout.constants';
import { utcToDhakaParts } from '../scheduling/dhaka-time.util';
import {
  BatchWorld,
  Person,
  buildBatchWorld,
  makeCourse,
  makeUser,
  weeklyFrom,
  weeklyWithSlots,
} from './testing/batch-world';

const describeDb = IT_DB_URL ? describe : describe.skip;

describeDb('Batches (real Postgres)', () => {
  jest.setTimeout(180_000);

  let prisma: PrismaService;
  let w: BatchWorld;
  let releaseLock: () => void;

  let admin: Person;
  let teacherA: Person;
  let teacherB: Person;
  let course: { id: string; title: string; sessions: number };
  let otherCourse: { id: string; title: string; sessions: number };

  // ─── helpers ───────────────────────────────────────────────────────────────

  async function student(
    name: string,
    opts: {
      teacher?: Person | null;
      course?: { id: string } | null;
      completed?: number;
      paid?: boolean;
    } = {},
  ): Promise<Person> {
    const teacher = opts.teacher === undefined ? teacherA : opts.teacher;
    const c = opts.course === undefined ? course : opts.course;
    const s = await makeUser(prisma, name, Role.STUDENT, {
      assignedTeacherId: teacher?.profileId ?? null,
      assignedCourseId: c?.id ?? null,
    });
    if (c && opts.completed) {
      const lessons = await prisma.lesson.findMany({
        where: { courseId: c.id },
        select: { id: true, order: true },
      });
      const lessonId = new Map(lessons.map((l) => [l.order, l.id]));
      for (let n = 1; n <= opts.completed; n++) {
        const start = new Date(
          Date.now() - (opts.completed - n + 3) * 86_400_000,
        );
        await prisma.scheduledLesson.create({
          data: {
            studentUserId: s.id,
            teacherId: (teacher ?? teacherA).profileId!,
            courseId: c.id,
            lessonNumber: n,
            lessonId: lessonId.get(n),
            start,
            end: new Date(start.getTime() + 45 * 60_000),
            classType: ClassType.ONE_TO_ONE,
            status: LessonStatus.COMPLETED,
            studentJoinedAt: start,
            teacherJoinedAt: start,
            endedAt: new Date(start.getTime() + 45 * 60_000),
            endedByRole: 'TEACHER',
          },
        });
      }
    }
    if (opts.paid) {
      await prisma.studentLedgerEntry.create({
        data: {
          studentUserId: s.id,
          type: 'PAYMENT_RECEIVED',
          amountCents: 600_000,
          balanceAfterCents: 600_000,
          rateCents: 100_000,
          lessonsPurchased: 6,
          courseId: course.id,
          courseName: course.title,
        },
      });
    }
    return s;
  }

  const create = (
    name: string,
    over: Record<string, unknown> = {},
    teacher: Person = teacherA,
    when = weeklyFrom(2),
  ) =>
    w.batches.createBatch(
      {
        name,
        teacherId: teacher.profileId!,
        courseId: course.id,
        ...when,
        ...over,
      } as never,
      admin.id,
    );

  const enroll = (
    s: Person,
    batchId: string,
    decisions: Record<string, unknown> = {},
  ) =>
    w.batches.enrollStudent({
      studentUserId: s.id,
      batchId,
      decisions: decisions as never,
      adminUserId: admin.id,
    });

  const sessionsOf = (batchId: string) =>
    prisma.batchSession.findMany({
      where: { batchId },
      orderBy: { start: 'asc' },
      include: { participants: { orderBy: { studentUserId: 'asc' } } },
    });

  const rowsOf = (s: Person, where: object = {}) =>
    prisma.scheduledLesson.findMany({
      where: { studentUserId: s.id, ...where },
      orderBy: [{ start: 'asc' }],
    });

  const activeMemberships = (s: Person) =>
    prisma.batchMember.findMany({
      where: { studentUserId: s.id, leftAt: null },
    });

  const dhakaTime = (d: Date) => utcToDhakaParts(d).time;

  /** The class is held: it began half an hour ago, the teacher came in on
   * time and the given students were there. */
  async function runSession(sessionId: string, attended: Person[]) {
    const start = new Date(Date.now() - 30 * 60_000);
    const end = new Date(Date.now() + 30 * 60_000);
    await prisma.batchSession.update({
      where: { id: sessionId },
      data: { start, end, teacherJoinedAt: new Date(start.getTime() - 60_000) },
    });
    await prisma.scheduledLesson.updateMany({
      where: { batchSessionId: sessionId },
      data: { start, end },
    });
    await prisma.scheduledLesson.updateMany({
      where: {
        batchSessionId: sessionId,
        studentUserId: { in: attended.map((s) => s.id) },
      },
      data: { studentJoinedAt: new Date() },
    });
  }

  const finish = (
    sessionId: string,
    outcome: 'COMPLETED' | 'PARTIALLY_COMPLETED' | 'INCOMPLETE' = 'COMPLETED',
    by: Person = teacherA,
  ) =>
    w.finalization.finalizeBatchSession(sessionId, {
      outcome,
      ...(outcome === 'INCOMPLETE'
        ? { reason: 'TECHNICAL_ISSUE' as const }
        : {}),
      actor: { role: 'TEACHER', userId: by.id },
    });

  /** The error body the admin screens read (details.code and its issues). */
  async function refused(promise: Promise<unknown>) {
    try {
      await promise;
    } catch (err) {
      const e = err as {
        getStatus?: () => number;
        getResponse?: () => { message?: string; details?: any };
        message?: string;
      };
      const body = e.getResponse?.() ?? {};
      return {
        status: e.getStatus?.() ?? 500,
        message: String(
          typeof body === 'string' ? body : (body.message ?? e.message),
        ),
        code: (body as { details?: { code?: string } }).details?.code,
        issues: ((body as { details?: { issues?: { code: string }[] } }).details
          ?.issues ?? []) as { code: string; severity: string }[],
        unmet: ((body as { details?: { unmet?: { code: string }[] } }).details
          ?.unmet ?? []) as { code: string }[],
      };
    }
    throw new Error('Expected the call to be refused, but it succeeded.');
  }

  // ─── boot ──────────────────────────────────────────────────────────────────

  beforeAll(async () => {
    releaseLock = await acquireDatabaseLock(IT_DB_URL!);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const mod = await Test.createTestingModule({
      imports: [PrismaModule],
    }).compile();
    prisma = mod.get(PrismaService);
    w = buildBatchWorld(prisma);
  });

  afterAll(async () => {
    jest.restoreAllMocks();
    await prisma?.$disconnect();
    releaseLock?.();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    await truncateAssessmentData(prisma);
    // The audit log has no foreign keys, so truncating the users leaves it.
    await prisma.auditLog.deleteMany();
    admin = await makeUser(prisma, 'ops-admin', Role.ADMIN);
    teacherA = await makeUser(prisma, 'ms-karim', Role.TEACHER);
    teacherB = await makeUser(prisma, 'mr-hasan', Role.TEACHER);
    course = await makeCourse(prisma, 'odyssey-test', 6);
    otherCourse = await makeCourse(prisma, 'builder-test', 6);
  });

  // ═══ Creating and editing a batch ══════════════════════════════════════════

  describe('creating a batch', () => {
    it('creates a batch with its teacher, curriculum and weekly slot — and holds no classes until a student is in it', async () => {
      const when = weeklyFrom(2, '17:00');
      const detail = await create('Evening Odyssey', { maxStudents: 5 });

      expect(detail.batch).toMatchObject({
        name: 'Evening Odyssey',
        status: 'ACTIVE',
        maxStudents: 5,
        memberCount: 0,
        teacher: { id: teacherA.profileId },
        course: { id: course.id },
        startDate: when.firstClassDate,
        progress: { completedThrough: null, nextLesson: 1, totalLessons: 6 },
      });
      expect(detail.batch.slots).toEqual([
        { weekday: when.slots[0].weekday, hour: 17, minute: 0 },
      ]);
      expect(detail.members).toEqual([]);
      // An empty batch must not occupy its teacher's calendar.
      expect(await prisma.batchSession.count()).toBe(0);
      expect(
        await prisma.auditLog.count({
          where: { action: 'BATCH_CREATED', entityId: detail.batch.id },
        }),
      ).toBe(1);
    });

    it('defaults to four students, starts where it is told, and can be listed and searched', async () => {
      const made = await create('Starts At Three', { startLessonNumber: 3 });
      expect(made.batch.maxStudents).toBe(4);
      expect(made.batch.progress.nextLesson).toBe(3);

      await create('Other Batch', {}, teacherB, weeklyFrom(3));
      const all = await w.batches.listBatches();
      expect(all.total).toBe(2);
      const byTeacher = await w.batches.listBatches({
        teacherId: teacherB.profileId!,
      });
      expect(byTeacher.batches.map((b) => b.name)).toEqual(['Other Batch']);
      const searched = await w.batches.listBatches({ search: 'starts at' });
      expect(searched.batches.map((b) => b.name)).toEqual(['Starts At Three']);
    });

    it.each([
      [
        'an unknown teacher',
        () => ({ teacherId: 'nobody' }),
        404,
        /Teacher not found/,
      ],
      [
        'an unknown curriculum',
        () => ({ courseId: 'nothing' }),
        404,
        /Curriculum not found/,
      ],
      [
        'a start lesson beyond the curriculum',
        () => ({ startLessonNumber: 7 }),
        400,
        /cannot start at lesson 7/,
      ],
      [
        'a first class date that does not fall on a chosen weekday',
        () => {
          const w2 = weeklyFrom(2);
          return {
            slots: [{ weekday: (w2.slots[0].weekday + 1) % 7, time: '17:00' }],
          };
        },
        400,
        /must fall on one of the selected/,
      ],
      [
        'a first class date in the past',
        () => weeklyFrom(-3),
        400,
        /cannot be in the past/,
      ],
      [
        'the same slot listed twice',
        () => {
          const w2 = weeklyWithSlots(2, ['17:00', '17:00']);
          return { slots: w2.slots };
        },
        400,
        /listed twice/,
      ],
      [
        'two slots on one day closer than a class',
        () => weeklyWithSlots(2, ['17:00', '17:30']),
        400,
        /closer than a batch class/,
      ],
    ])('refuses %s', async (_name, over, status, message) => {
      const r = await refused(create('Refused', over()));
      expect(r.status).toBe(status);
      expect(r.message).toMatch(message);
      expect(await prisma.batch.count()).toBe(0);
    });

    it('refuses a suspended teacher, and a name already in use (whatever its case)', async () => {
      await prisma.teacherProfile.update({
        where: { id: teacherB.profileId! },
        data: { isSuspended: true },
      });
      expect((await refused(create('X', {}, teacherB))).message).toMatch(
        /suspended/,
      );

      await create('Evening Odyssey');
      const dup = await refused(
        create('evening odyssey', {}, teacherA, weeklyFrom(3)),
      );
      expect(dup.status).toBe(409);
    });

    it('refuses a batch whose time the teacher is already teaching a 1-to-1 class in', async () => {
      const when = weeklyFrom(2, '17:00');
      const solo = await student('solo-kid');
      await prisma.scheduledLesson.create({
        data: {
          studentUserId: solo.id,
          teacherId: teacherA.profileId!,
          courseId: course.id,
          lessonNumber: 1,
          start: new Date(Date.parse(`${when.firstClassDate}T17:00:00+06:00`)),
          end: new Date(Date.parse(`${when.firstClassDate}T17:45:00+06:00`)),
          classType: ClassType.ONE_TO_ONE,
        },
      });
      const r = await refused(create('Clashing', {}, teacherA, when));
      expect(r.message).toMatch(/already booked/);
      // Another teacher is free at that time.
      await expect(
        create('Not Clashing', {}, teacherB, when),
      ).resolves.toBeDefined();
    });

    it('edits name and notes, refuses to shrink below its students or archive while it has any, and archives an empty batch', async () => {
      const { batch } = await create('Editable', { maxStudents: 3 });
      const a = await student('ada');
      const b = await student('ben');
      await enroll(a, batch.id);
      await enroll(b, batch.id);

      const renamed = await w.batches.updateBatch(
        batch.id,
        { name: 'Renamed', notes: 'Fridays are for projects' },
        admin.id,
      );
      expect(renamed.batch.name).toBe('Renamed');
      expect(renamed.batch.notes).toBe('Fridays are for projects');

      expect(
        (
          await refused(
            w.batches.updateBatch(batch.id, { maxStudents: 1 }, admin.id),
          )
        ).message,
      ).toMatch(/already has 2 students/);
      expect(
        (
          await refused(
            w.batches.updateBatch(batch.id, { status: 'ARCHIVED' }, admin.id),
          )
        ).message,
      ).toMatch(/Move or remove them/);

      await w.batches.removeStudent(a.id, admin.id);
      await w.batches.removeStudent(b.id, admin.id);
      const archived = await w.batches.updateBatch(
        batch.id,
        { status: 'ARCHIVED' },
        admin.id,
      );
      expect(archived.batch.status).toBe('ARCHIVED');
      // An archived batch is out of the everyday list, and takes no students.
      expect((await w.batches.listBatches()).total).toBe(0);
      const c = await student('cleo');
      expect(
        (await refused(enroll(c, batch.id))).issues.map((i) => i.code),
      ).toContain('BATCH_NOT_ACCEPTING');
    });
  });

  // ═══ Placing a student ═════════════════════════════════════════════════════

  describe('placing students in a batch', () => {
    it('puts a student in: one class per lesson, each with the student’s own row, linked to the catalog lesson', async () => {
      const { batch } = await create('Evening Odyssey');
      const ada = await student('ada');

      const placed = await enroll(ada, batch.id);

      expect(placed).toMatchObject({
        batchId: batch.id,
        alignment: 'ALIGNED',
        startsAtLesson: 1,
        movedFrom: null,
      });
      const sessions = await sessionsOf(batch.id);
      expect(sessions).toHaveLength(6);
      expect(sessions.map((s) => s.lessonNumber)).toEqual([1, 2, 3, 4, 5, 6]);
      for (const s of sessions) {
        expect(s.teacherId).toBe(teacherA.profileId);
        expect(s.status).toBe('UPCOMING');
        expect(s.lessonId).not.toBeNull();
        expect(s.participants).toHaveLength(1);
        expect(s.participants[0]).toMatchObject({
          studentUserId: ada.id,
          classType: 'BATCH',
          batchId: batch.id,
          batchSessionId: s.id,
          lessonNumber: s.lessonNumber,
          lessonId: s.lessonId,
          teacherId: teacherA.profileId,
          status: 'UPCOMING',
        });
        expect(s.participants[0].start.getTime()).toBe(s.start.getTime());
        expect(dhakaTime(s.start)).toBe('17:00');
        expect(s.end.getTime() - s.start.getTime()).toBe(60 * 60_000);
      }
      // A weekly cadence.
      for (let i = 1; i < sessions.length; i++) {
        expect(
          sessions[i].start.getTime() - sessions[i - 1].start.getTime(),
        ).toBe(7 * 86_400_000);
      }
      const user = await prisma.user.findUniqueOrThrow({
        where: { id: ada.id },
      });
      expect(user.assignedClassType).toBe('BATCH');
      const [membership] = await activeMemberships(ada);
      expect(membership).toMatchObject({
        batchId: batch.id,
        alignment: 'ALIGNED',
        joinedAtLesson: 1,
        addedByAdminId: admin.id,
      });
      expect(
        await prisma.auditLog.count({
          where: { action: 'STUDENT_BATCH_JOINED', entityId: ada.id },
        }),
      ).toBe(1);
    });

    it('every student of a batch shares the SAME classes — same time, teacher and lesson — not copies', async () => {
      const { batch } = await create('Evening Odyssey');
      const students = [
        await student('ada'),
        await student('ben'),
        await student('cleo'),
      ];
      for (const s of students) await enroll(s, batch.id);

      const sessions = await sessionsOf(batch.id);
      // Still six classes — not eighteen.
      expect(sessions).toHaveLength(6);
      expect(await prisma.batchSession.count()).toBe(6);
      for (const s of sessions) {
        expect(s.participants.map((p) => p.studentUserId).sort()).toEqual(
          students.map((x) => x.id).sort(),
        );
        for (const p of s.participants) {
          expect(p.start.getTime()).toBe(s.start.getTime());
          expect(p.end.getTime()).toBe(s.end.getTime());
          expect(p.lessonNumber).toBe(s.lessonNumber);
          expect(p.lessonId).toBe(s.lessonId);
          expect(p.teacherId).toBe(s.teacherId);
        }
      }
      // Eighteen rows: one per student per class — the rows that keep each
      // student's attendance, homework, tests and ledger their own.
      expect(
        await prisma.scheduledLesson.count({ where: { batchId: batch.id } }),
      ).toBe(18);
    });

    it('a student joining later joins the classes already there (none are duplicated)', async () => {
      const { batch } = await create('Evening Odyssey');
      await enroll(await student('ada'), batch.id);
      const before = (await sessionsOf(batch.id)).map((s) => s.id);
      await enroll(await student('ben'), batch.id);
      expect((await sessionsOf(batch.id)).map((s) => s.id)).toEqual(before);
    });

    it('refuses a student on another curriculum, naming why, and changes nothing', async () => {
      const { batch } = await create('Evening Odyssey');
      const wrong = await student('wrong-course', { course: otherCourse });
      const r = await refused(enroll(wrong, batch.id));
      expect(r.status).toBe(409);
      expect(r.code).toBe('BATCH_ENROLLMENT_BLOCKED');
      expect(r.issues.map((i) => i.code)).toContain('COURSE_MISMATCH');
      expect(await prisma.batchMember.count()).toBe(0);
      expect(await prisma.batchSession.count()).toBe(0);
      const fresh = await prisma.user.findUniqueOrThrow({
        where: { id: wrong.id },
      });
      expect(fresh.assignedCourseId).toBe(otherCourse.id);
      expect(fresh.assignedClassType).toBeNull();
    });

    it('refuses a full batch, and a paused student', async () => {
      const { batch } = await create('Tiny', { maxStudents: 1 });
      await enroll(await student('first'), batch.id);
      const full = await refused(enroll(await student('second'), batch.id));
      expect(full.issues.map((i) => i.code)).toContain('BATCH_FULL');

      const { batch: roomy } = await create(
        'Roomy',
        {},
        teacherB,
        weeklyFrom(3),
      );
      const paused = await student('paused-kid', { teacher: teacherB });
      await prisma.user.update({
        where: { id: paused.id },
        data: { accountStatus: 'PAUSED' },
      });
      expect(
        (await refused(enroll(paused, roomy.id))).issues.map((i) => i.code),
      ).toContain('STUDENT_PAUSED');
    });

    it('needs exactly one of an existing batch and a new one', async () => {
      const ada = await student('ada');
      expect(
        (
          await refused(
            w.batches.enrollStudent({
              studentUserId: ada.id,
              adminUserId: admin.id,
            }),
          )
        ).message,
      ).toMatch(/existing batch or create a new one/);
      const { batch } = await create('Evening Odyssey');
      expect(
        (
          await refused(
            w.batches.enrollStudent({
              studentUserId: ada.id,
              batchId: batch.id,
              newBatch: { name: 'x', ...weeklyFrom(3) } as never,
              adminUserId: admin.id,
            }),
          )
        ).message,
      ).toMatch(/existing batch or create a new one/);
    });

    it('a student who is not a student cannot be placed', async () => {
      const { batch } = await create('Evening Odyssey');
      expect((await refused(enroll(teacherB, batch.id))).status).toBe(404);
    });

    describe('progress is never rewritten silently', () => {
      async function batchAtLessonThree() {
        const { batch } = await create('Lesson Three');
        const first = await student('early-bird', { paid: true });
        const second = await student('early-bird-2', { paid: true });
        await enroll(first, batch.id);
        await enroll(second, batch.id);
        // Two classes are taught: the batch is now on lesson 3.
        const [s1, s2] = await sessionsOf(batch.id);
        await runSession(s1.id, [first, second]);
        await finish(s1.id);
        await runSession(s2.id, [first, second]);
        await finish(s2.id);
        return { batch, first, second };
      }

      it('a student BEHIND the batch must be told which lessons they will not take — and only then joins', async () => {
        const { batch } = await batchAtLessonThree();
        const late = await student('latecomer');

        const asked = await refused(enroll(late, batch.id));
        expect(asked.status).toBe(409);
        expect(asked.code).toBe('DECISION_REQUIRED');
        expect(asked.unmet.map((u) => u.code)).toEqual(['PROGRESS_BEHIND']);
        expect(asked.message).toMatch(/lessons 1–2/);
        expect(await activeMemberships(late)).toHaveLength(0);

        // The wrong answer is not accepted either.
        expect(
          (await refused(enroll(late, batch.id, { progress: 'REBASE_BATCH' })))
            .code,
        ).toBe('DECISION_REQUIRED');

        const placed = await enroll(late, batch.id, {
          progress: 'SKIP_TO_BATCH',
        });
        expect(placed).toMatchObject({
          alignment: 'SKIPPED_TO_BATCH',
          startsAtLesson: 3,
        });
        const rows = await rowsOf(late);
        expect(rows.map((r) => r.lessonNumber)).toEqual([3, 4, 5, 6]);
        const [m] = await activeMemberships(late);
        expect(m).toMatchObject({
          alignment: 'SKIPPED_TO_BATCH',
          joinedAtLesson: 3,
        });
        const audit = await prisma.auditLog.findFirstOrThrow({
          where: { action: 'STUDENT_BATCH_JOINED', entityId: late.id },
        });
        expect(JSON.stringify(audit.afterData)).toContain('lessonsNotTaken');
      });

      it('a student who has already completed lessons the batch is about to teach cannot join — they would repeat them', async () => {
        const { batch } = await create('Early Batch');
        await enroll(await student('anchor'), batch.id); // the batch is on lesson 1
        const ahead = await student('far-ahead', { completed: 4 });

        const r = await refused(enroll(ahead, batch.id));
        expect(r.code).toBe('BATCH_ENROLLMENT_BLOCKED');
        expect(r.issues.map((i) => i.code)).toContain('PROGRESS_AHEAD');
        // No tick makes this one pass.
        expect(
          (
            await refused(
              enroll(ahead, batch.id, { progress: 'SKIP_TO_BATCH' }),
            )
          ).code,
        ).toBe('BATCH_ENROLLMENT_BLOCKED');
        expect(await rowsOf(ahead, { status: 'COMPLETED' })).toHaveLength(4);
        expect(await activeMemberships(ahead)).toHaveLength(0);
      });

      it('an empty batch that has taught nothing can start where the student is — if the admin says so', async () => {
        const { batch } = await create('Fresh Batch');
        const ahead = await student('on-lesson-five', { completed: 4 });

        const asked = await refused(enroll(ahead, batch.id));
        expect(asked.unmet.map((u) => u.code)).toEqual(['BATCH_REBASE']);

        const placed = await enroll(ahead, batch.id, {
          progress: 'REBASE_BATCH',
        });
        expect(placed).toMatchObject({
          alignment: 'BATCH_REBASED',
          startsAtLesson: 5,
        });
        const fresh = await prisma.batch.findUniqueOrThrow({
          where: { id: batch.id },
        });
        expect(fresh.startLessonNumber).toBe(5);
        expect((await sessionsOf(batch.id)).map((s) => s.lessonNumber)).toEqual(
          [5, 6],
        );
        // What the student completed is exactly as it was.
        expect(await rowsOf(ahead, { status: 'COMPLETED' })).toHaveLength(4);
      });

      it('a new student then joins a batch that has been re-based without any decision (they are aligned)', async () => {
        const { batch } = await create('Fresh Batch');
        await enroll(await student('lead', { completed: 4 }), batch.id, {
          progress: 'REBASE_BATCH',
        });
        const alsoOnFive = await student('also-on-five', { completed: 4 });
        await expect(enroll(alsoOnFive, batch.id)).resolves.toMatchObject({
          alignment: 'ALIGNED',
          startsAtLesson: 5,
        });
      });

      it('a different teacher is only accepted with consent, and then becomes the student’s teacher', async () => {
        const { batch } = await create('Teacher B Batch', {}, teacherB);
        const s = await student('with-teacher-a', { teacher: teacherA });

        const asked = await refused(enroll(s, batch.id));
        expect(asked.unmet.map((u) => u.code)).toEqual(['TEACHER_CHANGE']);
        expect(
          (await prisma.user.findUniqueOrThrow({ where: { id: s.id } }))
            .assignedTeacherId,
        ).toBe(teacherA.profileId);

        await enroll(s, batch.id, { acceptTeacherChange: true });
        expect(
          (await prisma.user.findUniqueOrThrow({ where: { id: s.id } }))
            .assignedTeacherId,
        ).toBe(teacherB.profileId);
        expect(
          w.notifications.sendTeacherStudentAssignedEmail,
        ).toHaveBeenCalledWith(
          teacherB.email,
          expect.objectContaining({ studentName: s.fullName }),
        );
      });

      it('a student with no teacher or curriculum yet is simply given the batch’s', async () => {
        const { batch } = await create('Evening Odyssey');
        const blank = await student('blank-slate', {
          teacher: null,
          course: null,
        });
        await enroll(blank, batch.id);
        const u = await prisma.user.findUniqueOrThrow({
          where: { id: blank.id },
        });
        expect(u).toMatchObject({
          assignedTeacherId: teacherA.profileId,
          assignedCourseId: course.id,
          assignedClassType: 'BATCH',
        });
      });
    });

    describe('switching between 1-to-1 and Batch', () => {
      async function oneToOne(name: string, completed = 0) {
        const s = await student(name, { completed });
        await w.scheduling.setStudentSchedule(
          s.id,
          { classType: 'ONE_TO_ONE', ...weeklyFrom(4, '10:00') } as never,
          admin.id,
        );
        return s;
      }

      it('1-to-1 → Batch removes the upcoming 1-to-1 classes only with consent, and keeps everything completed', async () => {
        const { batch } = await create('Evening Odyssey');
        const s = await oneToOne('solo', 0);
        expect(await rowsOf(s, { status: 'UPCOMING' })).toHaveLength(6);

        const asked = await refused(enroll(s, batch.id));
        expect(asked.unmet.map((u) => u.code)).toEqual(['REPLACES_UPCOMING']);
        expect(asked.message).toMatch(/6 upcoming 1-to-1 classes/);
        // Refused: the 1-to-1 schedule is untouched.
        expect(
          await rowsOf(s, { status: 'UPCOMING', batchSessionId: null }),
        ).toHaveLength(6);

        await enroll(s, batch.id, { replaceUpcoming: true });
        const rows = await rowsOf(s, { status: 'UPCOMING' });
        expect(rows).toHaveLength(6);
        expect(
          rows.every((r) => r.classType === 'BATCH' && r.batchSessionId),
        ).toBe(true);
        expect(
          await prisma.recurringSlot.count({ where: { studentUserId: s.id } }),
        ).toBe(0);
      });

      it('a 1-to-1 student on lesson 4 who switches keeps their 3 completed lessons', async () => {
        const { batch } = await create('Starts At Four', {
          startLessonNumber: 4,
        });
        const s = await student('three-done', { completed: 3 });
        await w.scheduling.setStudentSchedule(
          s.id,
          { classType: 'ONE_TO_ONE', ...weeklyFrom(4, '10:00') } as never,
          admin.id,
        );
        await enroll(s, batch.id, { replaceUpcoming: true });
        expect(await rowsOf(s, { status: 'COMPLETED' })).toHaveLength(3);
        expect(
          (await rowsOf(s, { status: 'UPCOMING' })).map((r) => r.lessonNumber),
        ).toEqual([4, 5, 6]);
      });

      it('a student can move from their 1-to-1 slot straight into a batch at the very same time (their own classes never block it)', async () => {
        // The batch meets exactly when the student's 1-to-1 classes were.
        const when = weeklyFrom(4, '10:00');
        const s = await oneToOne('same-slot');
        const made = await w.batches.enrollStudent({
          studentUserId: s.id,
          newBatch: { name: 'Same Slot Batch', ...when } as never,
          decisions: { replaceUpcoming: true },
          adminUserId: admin.id,
        });
        const sessions = await sessionsOf(made.batchId);
        expect(sessions).toHaveLength(6);
        expect(sessions.every((x) => dhakaTime(x.start) === '10:00')).toBe(
          true,
        );
      });

      it('Batch → 1-to-1 needs an explicit decision, then leaves the batch, keeps what was taught and builds the student’s own schedule', async () => {
        const { batch } = await create('Evening Odyssey');
        const keeper = await student('keeps-batch');
        const leaver = await student('leaves-batch', { paid: true });
        await enroll(keeper, batch.id);
        await enroll(leaver, batch.id);
        const [first] = await sessionsOf(batch.id);
        await runSession(first.id, [keeper, leaver]);
        await finish(first.id);

        const asked = await refused(
          w.scheduling.setStudentSchedule(
            leaver.id,
            { classType: 'ONE_TO_ONE', ...weeklyFrom(5, '11:00') } as never,
            admin.id,
          ),
        );
        expect(asked.status).toBe(409);
        expect(asked.code).toBe('LEAVES_BATCH');
        expect(await activeMemberships(leaver)).toHaveLength(1);

        const result = await w.scheduling.setStudentSchedule(
          leaver.id,
          {
            classType: 'ONE_TO_ONE',
            leaveBatch: true,
            ...weeklyFrom(5, '11:00'),
          } as never,
          admin.id,
        );
        expect(result.classType).toBe('ONE_TO_ONE');
        expect(result.batch).toBeNull();
        expect(await activeMemberships(leaver)).toHaveLength(0);

        // The completed batch class stays on their record…
        const completed = await rowsOf(leaver, { status: 'COMPLETED' });
        expect(
          completed.map((r) => [r.lessonNumber, r.batchSessionId]),
        ).toEqual([[1, first.id]]);
        // …their own classes continue from lesson 2…
        const own = await rowsOf(leaver, { status: 'UPCOMING' });
        expect(own.map((r) => r.lessonNumber)).toEqual([2, 3, 4, 5, 6]);
        expect(
          own.every(
            (r) => r.classType === 'ONE_TO_ONE' && r.batchSessionId === null,
          ),
        ).toBe(true);
        // …and the batch carries on without them, its other student untouched.
        const later = await sessionsOf(batch.id);
        const upcoming = later.filter((s) => s.status === 'UPCOMING');
        expect(upcoming).toHaveLength(5);
        for (const s of upcoming) {
          expect(s.participants.map((p) => p.studentUserId)).toEqual([
            keeper.id,
          ]);
        }
      });

      it('the 1-to-1 schedule is unchanged for a student who was never in a batch', async () => {
        const s = await oneToOne('plain-solo');
        const rows = await rowsOf(s);
        expect(rows).toHaveLength(6);
        expect(rows.every((r) => r.classType === 'ONE_TO_ONE')).toBe(true);
        expect(rows.map((r) => r.lessonNumber)).toEqual([1, 2, 3, 4, 5, 6]);
        expect(await prisma.batchMember.count()).toBe(0);
        expect((await w.scheduling.getStudentSchedule(s.id)).classType).toBe(
          'ONE_TO_ONE',
        );
      });

      it('a 1-to-1 class ended Partially Completed still adds one extra class, in that student’s own schedule only', async () => {
        const solo = await oneToOne('solo-partial');
        const [first] = await rowsOf(solo);
        const start = new Date(Date.now() - 30 * 60_000);
        await prisma.scheduledLesson.update({
          where: { id: first.id },
          data: {
            start,
            end: new Date(start.getTime() + 45 * 60_000),
            teacherJoinedAt: new Date(start.getTime() - 60_000),
            studentJoinedAt: new Date(),
          },
        });
        await w.finalization.finalizeLesson(first.id, {
          outcome: 'PARTIALLY_COMPLETED',
          actor: { role: 'TEACHER', userId: teacherA.id },
        });
        const rows = await rowsOf(solo);
        expect(rows.map((r) => `${r.lessonNumber}:${r.status}`)).toEqual([
          '1:PARTIALLY_COMPLETED',
          '1:UPCOMING',
          '2:UPCOMING',
          '3:UPCOMING',
          '4:UPCOMING',
          '5:UPCOMING',
          '6:UPCOMING',
        ]);
        expect(
          rows.every(
            (r) => r.classType === 'ONE_TO_ONE' && r.batchSessionId === null,
          ),
        ).toBe(true);
        expect(await prisma.batchSession.count()).toBe(0);
      });

      it('a batch student cannot be scheduled "as batch" on their own — that is done through the batch', async () => {
        const s = await student('solo-attempt');
        expect(
          (
            await refused(
              w.scheduling.setStudentSchedule(
                s.id,
                { classType: 'BATCH', ...weeklyFrom(3) } as never,
                admin.id,
              ),
            )
          ).message,
        ).toMatch(/through their batch/);
      });
    });

    describe('creating a new batch while enrolling a student', () => {
      it('uses the student’s teacher and curriculum, starts at their next lesson and places them in it', async () => {
        const s = await student('first-of-many', { completed: 2 });
        const made = await w.batches.enrollStudent({
          studentUserId: s.id,
          newBatch: {
            name: 'Brand New',
            maxStudents: 3,
            ...weeklyFrom(3, '16:00'),
          } as never,
          adminUserId: admin.id,
        });
        const detail = await w.batches.getBatchDetail(made.batchId);
        expect(detail.batch).toMatchObject({
          name: 'Brand New',
          maxStudents: 3,
          memberCount: 1,
          teacher: { id: teacherA.profileId },
          course: { id: course.id },
        });
        expect(
          (await sessionsOf(made.batchId)).map((x) => x.lessonNumber),
        ).toEqual([3, 4, 5, 6]);
        expect(await activeMemberships(s)).toHaveLength(1);
      });

      it('needs the student to have a teacher and a curriculum first', async () => {
        const bare = await student('bare', { teacher: null, course: null });
        expect(
          (
            await refused(
              w.batches.enrollStudent({
                studentUserId: bare.id,
                newBatch: { name: 'Nope', ...weeklyFrom(3) } as never,
                adminUserId: admin.id,
              }),
            )
          ).message,
        ).toMatch(/Assign a teacher and a curriculum/);
        expect(await prisma.batch.count()).toBe(0);
      });

      it('creates nothing at all when the placement is refused (the batch is made in the same transaction)', async () => {
        const s = await student('paused-new');
        await prisma.user.update({
          where: { id: s.id },
          data: { accountStatus: 'PAUSED' },
        });
        await refused(
          w.batches.enrollStudent({
            studentUserId: s.id,
            newBatch: { name: 'Never Made', ...weeklyFrom(3) } as never,
            adminUserId: admin.id,
          }),
        );
        expect(await prisma.batch.count()).toBe(0);
      });
    });

    describe('moving a student between batches', () => {
      it('moves them with their records intact: what they took stays, their classes in the old batch ahead go, the new batch’s classes appear', async () => {
        const { batch: from } = await create('From Batch');
        const { batch: to } = await create(
          'To Batch',
          { startLessonNumber: 2 },
          teacherA,
          weeklyFrom(3, '19:00'),
        );
        const mover = await student('mover', { paid: true });
        const stayer = await student('stayer');
        await enroll(mover, from.id);
        await enroll(stayer, from.id);
        // The "to" batch already has a student on lesson 2.
        await enroll(await student('resident', { completed: 1 }), to.id);

        const [first] = await sessionsOf(from.id);
        await runSession(first.id, [mover, stayer]);
        await finish(first.id);
        expect(await rowsOf(mover, { status: 'COMPLETED' })).toHaveLength(1);

        const placed = await enroll(mover, to.id);
        expect(placed).toMatchObject({
          movedFrom: 'From Batch',
          alignment: 'ALIGNED',
          startsAtLesson: 2,
        });

        // Completed class kept, with the batch it was taught in.
        const completed = await rowsOf(mover, { status: 'COMPLETED' });
        expect(completed.map((r) => [r.lessonNumber, r.batchId])).toEqual([
          [1, from.id],
        ]);
        // Nothing left ahead in the old batch; the new batch's classes are theirs.
        expect(
          await rowsOf(mover, { status: 'UPCOMING', batchId: from.id }),
        ).toHaveLength(0);
        const ahead = await rowsOf(mover, { status: 'UPCOMING' });
        expect(ahead.map((r) => [r.lessonNumber, r.batchId])).toEqual(
          [2, 3, 4, 5, 6].map((n) => [n, to.id]),
        );
        // History of the placements is kept.
        const placements = await prisma.batchMember.findMany({
          where: { studentUserId: mover.id },
          orderBy: { joinedAt: 'asc' },
        });
        expect(placements.map((p) => [p.batchId, p.leftAt !== null])).toEqual([
          [from.id, true],
          [to.id, false],
        ]);
        // The classmate in the old batch is untouched.
        expect(
          (await rowsOf(stayer, { status: 'UPCOMING', batchId: from.id })).map(
            (r) => r.lessonNumber,
          ),
        ).toEqual([2, 3, 4, 5, 6]);
        expect(
          await prisma.auditLog.count({
            where: { action: 'STUDENT_BATCH_MOVED', entityId: mover.id },
          }),
        ).toBe(1);
      });

      it('a move that would make the student repeat a lesson is refused and leaves them exactly where they were', async () => {
        const { batch: from } = await create('From Batch');
        const { batch: behind } = await create(
          'Behind Batch',
          {},
          teacherA,
          weeklyFrom(3, '19:00'),
        );
        const mover = await student('mover');
        await enroll(mover, from.id);
        await enroll(await student('behind-resident'), behind.id);
        const [first] = await sessionsOf(from.id);
        await runSession(first.id, [mover]);
        await finish(first.id);
        const before = await rowsOf(mover);

        const r = await refused(enroll(mover, behind.id));
        expect(r.issues.map((i) => i.code)).toContain('PROGRESS_AHEAD');
        const after = await rowsOf(mover);
        expect(after.map((x) => x.id)).toEqual(before.map((x) => x.id));
        expect((await activeMemberships(mover))[0].batchId).toBe(from.id);
      });

      it('moving between two full batches at once never loses or doubles a seat', async () => {
        const { batch: a } = await create('Batch A', { maxStudents: 2 });
        const { batch: b } = await create(
          'Batch B',
          { maxStudents: 2 },
          teacherA,
          weeklyFrom(3, '19:00'),
        );
        const x = await student('x-student');
        const y = await student('y-student');
        const p = await student('p-student');
        const q = await student('q-student');
        await enroll(x, a.id);
        await enroll(y, a.id);
        await enroll(p, b.id);
        await enroll(q, b.id);

        // Opposite directions at the same moment.
        const results = await Promise.allSettled([
          enroll(x, b.id),
          enroll(p, a.id),
        ]);
        for (const r of results) {
          if (r.status === 'rejected') {
            expect(
              (r.reason as { getStatus?: () => number }).getStatus?.(),
            ).toBe(409);
          }
        }
        // Whatever happened, the books balance: nobody is in two batches and no
        // batch is over capacity.
        for (const s of [x, y, p, q]) {
          expect((await activeMemberships(s)).length).toBeLessThanOrEqual(1);
        }
        for (const batchId of [a.id, b.id]) {
          const members = await prisma.batchMember.count({
            where: { batchId, leftAt: null },
          });
          expect(members).toBeLessThanOrEqual(2);
          // Every upcoming row belongs to a placed student.
          const rows = await prisma.scheduledLesson.findMany({
            where: { batchId, status: 'UPCOMING' },
          });
          for (const r of rows) {
            const m = await prisma.batchMember.findFirst({
              where: { batchId, studentUserId: r.studentUserId, leftAt: null },
            });
            expect(m).not.toBeNull();
          }
        }
      });
    });

    describe('races between two admins', () => {
      it('four students racing for the last two seats: exactly two get in, the others are told it is full', async () => {
        const { batch } = await create('Two Seats', { maxStudents: 2 });
        const racers = [
          await student('r1'),
          await student('r2'),
          await student('r3'),
          await student('r4'),
        ];
        const results = await Promise.allSettled(
          racers.map((s) => enroll(s, batch.id)),
        );
        const ok = results.filter((r) => r.status === 'fulfilled');
        const failed = results.filter((r) => r.status === 'rejected');
        expect(ok).toHaveLength(2);
        expect(failed).toHaveLength(2);
        for (const f of failed) {
          const e = f.reason as {
            getResponse?: () => { details?: { issues?: { code: string }[] } };
          };
          expect(
            e.getResponse?.().details?.issues?.map((i) => i.code),
          ).toContain('BATCH_FULL');
        }
        expect(
          await prisma.batchMember.count({
            where: { batchId: batch.id, leftAt: null },
          }),
        ).toBe(2);
        // Classes carry exactly the two seated students.
        for (const s of await sessionsOf(batch.id)) {
          expect(s.participants).toHaveLength(2);
        }
      });

      it('the same student placed in two batches at once ends up in exactly one, with consistent classes', async () => {
        const { batch: a } = await create('Race A');
        const { batch: b } = await create(
          'Race B',
          {},
          teacherA,
          weeklyFrom(3, '19:00'),
        );
        const s = await student('double-booked');
        await Promise.allSettled([enroll(s, a.id), enroll(s, b.id)]);
        const active = await activeMemberships(s);
        expect(active).toHaveLength(1);
        const rows = await rowsOf(s, { status: 'UPCOMING' });
        expect(rows.length).toBeGreaterThan(0);
        expect(new Set(rows.map((r) => r.batchId))).toEqual(
          new Set([active[0].batchId]),
        );
      });
    });
  });

  // ═══ Removing and pausing ══════════════════════════════════════════════════

  describe('removing, pausing and resuming', () => {
    it('removing a student drops their classes ahead, keeps what was taught, frees an emptied batch’s calendar and leaves them a Batch student awaiting a placement', async () => {
      const { batch } = await create('Evening Odyssey');
      const s = await student('only-one', { paid: true });
      await enroll(s, batch.id);
      const [first] = await sessionsOf(batch.id);
      await runSession(first.id, [s]);
      await finish(first.id);

      await w.batches.removeStudent(s.id, admin.id);

      expect(await rowsOf(s, { status: 'UPCOMING' })).toHaveLength(0);
      expect(await rowsOf(s, { status: 'COMPLETED' })).toHaveLength(1);
      expect(await activeMemberships(s)).toHaveLength(0);
      const left = await prisma.batchMember.findFirstOrThrow({
        where: { studentUserId: s.id },
      });
      expect(left.leftAt).not.toBeNull();
      // No class is left ahead with nobody in it.
      expect(
        await prisma.batchSession.count({
          where: { batchId: batch.id, status: 'UPCOMING' },
        }),
      ).toBe(0);
      expect(
        (await prisma.user.findUniqueOrThrow({ where: { id: s.id } }))
          .assignedClassType,
      ).toBe('BATCH');
    });

    it('removing someone who is not in that batch is refused', async () => {
      const { batch } = await create('Evening Odyssey');
      const s = await student('not-in-it');
      expect(
        (await refused(w.batches.removeStudent(s.id, admin.id, batch.id)))
          .message,
      ).toMatch(/not in that batch/);
    });

    it('pausing takes a student out of the classes ahead but keeps their seat; resuming brings them back at the batch’s current lesson, reporting what they missed', async () => {
      const { batch } = await create('Evening Odyssey');
      const kept = await student('stays-active');
      const paused = await student('gets-paused');
      await enroll(kept, batch.id);
      await enroll(paused, batch.id);

      await prisma.user.update({
        where: { id: paused.id },
        data: { accountStatus: 'PAUSED' },
      });
      await w.batches.suspendParticipation(paused.id);
      expect(await rowsOf(paused, { status: 'UPCOMING' })).toHaveLength(0);
      expect(await activeMemberships(paused)).toHaveLength(1); // seat kept
      for (const s of await sessionsOf(batch.id)) {
        expect(s.participants.map((p) => p.studentUserId)).toEqual([kept.id]);
      }

      // The batch carries on: one class is taught while they are away.
      const [first] = await sessionsOf(batch.id);
      await runSession(first.id, [kept]);
      await finish(first.id);

      await prisma.user.update({
        where: { id: paused.id },
        data: { accountStatus: 'ACTIVE' },
      });
      const back = await w.batches.resumeParticipation(paused.id, admin.id);
      expect(back).toMatchObject({
        rejoined: true,
        atLesson: 2,
        missedLessons: { from: 1, to: 1 },
      });
      expect(
        (await rowsOf(paused, { status: 'UPCOMING' })).map(
          (r) => r.lessonNumber,
        ),
      ).toEqual([2, 3, 4, 5, 6]);
    });

    it('a paused student alone in a batch leaves it holding no classes', async () => {
      const { batch } = await create('Evening Odyssey');
      const s = await student('lonely');
      await enroll(s, batch.id);
      await prisma.user.update({
        where: { id: s.id },
        data: { accountStatus: 'PAUSED' },
      });
      await w.batches.suspendParticipation(s.id);
      expect(
        await prisma.batchSession.count({ where: { batchId: batch.id } }),
      ).toBe(0);
    });
  });

  // ═══ The classes of a batch ════════════════════════════════════════════════

  describe('the classes of a batch', () => {
    it('a class that ends Incomplete adds ONE extra class for the whole batch and moves the lessons behind it down by one — dates never move', async () => {
      const { batch } = await create('Evening Odyssey');
      const a = await student('ada');
      const b = await student('ben');
      await enroll(a, batch.id);
      await enroll(b, batch.id);
      const before = await sessionsOf(batch.id);
      const originalDates = before.slice(1).map((s) => s.start.getTime());

      await runSession(before[0].id, [a, b]);
      await finish(before[0].id, 'INCOMPLETE');

      const after = await sessionsOf(batch.id);
      expect(after).toHaveLength(7); // one extra class, not one per student
      const upcoming = after.filter((s) => s.status === 'UPCOMING');
      expect(upcoming.map((s) => s.lessonNumber)).toEqual([1, 2, 3, 4, 5, 6]);
      // The same dates as before, plus one more week at the end.
      expect(upcoming.slice(0, 5).map((s) => s.start.getTime())).toEqual(
        originalDates,
      );
      expect(upcoming[5].start.getTime() - upcoming[4].start.getTime()).toBe(
        7 * 86_400_000,
      );
      // Every student's row mirrors the class.
      for (const s of upcoming) {
        expect(s.participants).toHaveLength(2);
        for (const p of s.participants) {
          expect(p.lessonNumber).toBe(s.lessonNumber);
          expect(p.lessonId).toBe(s.lessonId);
        }
      }
      // The class that did not complete is recorded Incomplete for both, unpaid.
      const done = after.find((s) => s.id === before[0].id)!;
      expect(done.status).toBe('INCOMPLETE');
      expect(done.participants.map((p) => p.status)).toEqual([
        'INCOMPLETE',
        'INCOMPLETE',
      ]);
      expect(
        await prisma.payoutEntry.count({ where: { type: 'CLASS_COMPLETED' } }),
      ).toBe(0);
    });

    it('Partially Completed repeats the lesson once for everyone; the batch cannot use it twice for the same lesson', async () => {
      const { batch } = await create('Evening Odyssey');
      const a = await student('ada');
      await enroll(a, batch.id);
      const [first] = await sessionsOf(batch.id);
      await runSession(first.id, [a]);
      await finish(first.id, 'PARTIALLY_COMPLETED');

      const sessions = await sessionsOf(batch.id);
      const extra = sessions.find((s) => s.status === 'UPCOMING')!;
      expect(extra.lessonNumber).toBe(1);
      expect(sessions.filter((s) => s.lessonNumber === 1)).toHaveLength(2);

      await runSession(extra.id, [a]);
      const again = await refused(finish(extra.id, 'PARTIALLY_COMPLETED'));
      expect(again.message).toMatch(/already been used/);
    });

    it('a Completed class moves the batch on; the next student sees the batch’s new position', async () => {
      const { batch } = await create('Evening Odyssey');
      const a = await student('ada');
      await enroll(a, batch.id);
      const [first] = await sessionsOf(batch.id);
      await runSession(first.id, [a]);
      await finish(first.id);

      const detail = await w.batches.getBatchDetail(batch.id);
      expect(detail.batch.progress).toMatchObject({
        completedThrough: 1,
        nextLesson: 2,
      });
      expect(detail.recentSessions[0]).toMatchObject({
        lessonNumber: 1,
        students: 1,
        attended: 1,
      });
      expect(detail.members[0]).toMatchObject({
        studentUserId: a.id,
        completedLessons: 1,
        nextLesson: 2,
        sync: 'ALIGNED',
        attended: 1,
      });
    });

    it('each student’s own progress stays their own: one who missed a class is BEHIND the batch (flagged to the admin), the batch does not wait for them and no lesson is counted for them', async () => {
      const { batch } = await create('Evening Odyssey');
      const present = await student('present', { paid: true });
      const absent = await student('absent', { paid: true });
      await enroll(present, batch.id);
      await enroll(absent, batch.id);
      const [first] = await sessionsOf(batch.id);
      await runSession(first.id, [present]);
      await finish(first.id);

      expect(
        (await rowsOf(present, { status: 'COMPLETED' })).map(
          (r) => r.lessonNumber,
        ),
      ).toEqual([1]);
      const missed = await rowsOf(absent, { batchSessionId: first.id });
      expect(missed).toHaveLength(1);
      expect(missed[0]).toMatchObject({
        status: 'INCOMPLETE',
        endReason: 'STUDENT_NO_SHOW',
      });
      expect(await rowsOf(absent, { status: 'COMPLETED' })).toHaveLength(0);
      // The absent student never gets a private make-up…
      expect(
        (await rowsOf(absent, { status: 'UPCOMING' })).map(
          (r) => r.lessonNumber,
        ),
      ).toEqual([2, 3, 4, 5, 6]);
      // …and the admin is warned that they are behind.
      const detail = await w.batches.getBatchDetail(batch.id);
      const row = detail.members.find((m) => m.studentUserId === absent.id)!;
      expect(row).toMatchObject({ sync: 'BEHIND', nextLesson: 1, missed: 1 });
      expect(detail.warnings.join(' ')).toContain(absent.fullName);
      // Their own ledger is untouched.
      expect(
        await prisma.studentLedgerEntry.count({
          where: { studentUserId: absent.id, type: 'LESSON_COMPLETED' },
        }),
      ).toBe(0);
    });

    it('the batch class counts as ONE class for the teacher however many students: paid once; each attending student is charged one lesson on their own ledger', async () => {
      const { batch } = await create('Evening Odyssey');
      const kids = [
        await student('k1', { paid: true }),
        await student('k2', { paid: true }),
        await student('k3', { paid: true }),
        await student('k4', { paid: true }),
      ];
      for (const k of kids) await enroll(k, batch.id);
      const [first] = await sessionsOf(batch.id);
      await runSession(first.id, kids);
      await finish(first.id);
      // A second, identical request changes nothing.
      const repeat = await finish(first.id);
      expect(repeat.finalized).toBe(false);

      const earned = await prisma.payoutEntry.findMany({
        where: { teacherId: teacherA.profileId!, type: 'CLASS_COMPLETED' },
      });
      expect(earned).toHaveLength(1);
      expect(earned[0]).toMatchObject({
        amountCents: CLASS_COMPLETED_AMOUNT_CENTS,
        referenceType: 'BATCH_SESSION',
        referenceId: first.id,
      });
      for (const k of kids) {
        const entries = await prisma.studentLedgerEntry.findMany({
          where: { studentUserId: k.id, type: 'LESSON_COMPLETED' },
        });
        expect(entries).toHaveLength(1);
        expect(entries[0].amountCents).toBe(-100_000);
        expect(entries[0].balanceAfterCents).toBe(500_000);
      }
      const session = await prisma.batchSession.findUniqueOrThrow({
        where: { id: first.id },
      });
      expect(session).toMatchObject({
        status: 'COMPLETED',
        endedByRole: 'TEACHER',
      });
    });

    it('finishing the last lesson of the curriculum completes the batch, which then takes no one', async () => {
      const { batch } = await create('Evening Odyssey', {
        startLessonNumber: 6,
      });
      const s = await student('last-one', { completed: 5 });
      await enroll(s, batch.id);
      const [only] = await sessionsOf(batch.id);
      expect(only.lessonNumber).toBe(6);
      await runSession(only.id, [s]);
      await finish(only.id);

      const detail = await w.batches.getBatchDetail(batch.id);
      expect(detail.batch.status).toBe('COMPLETED');
      const late = await student('too-late');
      expect(
        (await refused(enroll(late, batch.id))).issues.map((i) => i.code),
      ).toContain('BATCH_NOT_ACCEPTING');
    });

    it('rescheduling the batch rebuilds only the classes ahead: new times, same students, the class already taught untouched', async () => {
      const { batch } = await create('Evening Odyssey');
      const a = await student('ada');
      const b = await student('ben');
      await enroll(a, batch.id);
      await enroll(b, batch.id);
      const [first] = await sessionsOf(batch.id);
      await runSession(first.id, [a, b]);
      await finish(first.id);

      const moved = await w.batches.changeSchedule(
        batch.id,
        weeklyFrom(5, '18:30') as never,
        admin.id,
      );
      expect(moved.batch.slots[0]).toMatchObject({ hour: 18, minute: 30 });

      const sessions = await sessionsOf(batch.id);
      const done = sessions.filter((s) => s.status === 'COMPLETED');
      const ahead = sessions.filter((s) => s.status === 'UPCOMING');
      expect(done.map((s) => s.id)).toEqual([first.id]);
      expect(ahead.map((s) => s.lessonNumber)).toEqual([2, 3, 4, 5, 6]);
      for (const s of ahead) {
        expect(dhakaTime(s.start)).toBe('18:30');
        expect(s.participants.map((p) => p.studentUserId).sort()).toEqual(
          [a.id, b.id].sort(),
        );
      }
      // Both students' completed record is exactly what it was.
      expect(await rowsOf(a, { status: 'COMPLETED' })).toHaveLength(1);
      expect(await rowsOf(b, { status: 'COMPLETED' })).toHaveLength(1);
    });

    it('changing the batch’s teacher moves the classes ahead (and the students’ teacher) but not those already taught; a busy teacher is refused', async () => {
      const { batch } = await create('Evening Odyssey');
      const a = await student('ada');
      await enroll(a, batch.id);
      const [first, second, third] = await sessionsOf(batch.id);
      await runSession(first.id, [a]);
      await finish(first.id);

      // Teacher B is busy at the third class's time.
      const busy = await student('busy-kid', { teacher: teacherB });
      await prisma.scheduledLesson.create({
        data: {
          studentUserId: busy.id,
          teacherId: teacherB.profileId!,
          courseId: course.id,
          lessonNumber: 1,
          start: third.start,
          end: new Date(third.start.getTime() + 45 * 60_000),
          classType: ClassType.ONE_TO_ONE,
        },
      });
      expect(
        (
          await refused(
            w.batches.changeTeacher(batch.id, teacherB.profileId!, admin.id),
          )
        ).message,
      ).toMatch(/already booked/);
      expect(
        (await sessionsOf(batch.id)).every(
          (s) => s.teacherId === teacherA.profileId,
        ),
      ).toBe(true);

      await prisma.scheduledLesson.deleteMany({
        where: { studentUserId: busy.id },
      });
      await w.batches.changeTeacher(batch.id, teacherB.profileId!, admin.id);
      const sessions = await sessionsOf(batch.id);
      expect(sessions.find((s) => s.id === first.id)!.teacherId).toBe(
        teacherA.profileId,
      );
      for (const s of sessions.filter((x) => x.status === 'UPCOMING')) {
        expect(s.teacherId).toBe(teacherB.profileId);
        expect(
          s.participants.every((p) => p.teacherId === teacherB.profileId),
        ).toBe(true);
      }
      expect(second.id).toBeTruthy();
      expect(
        (await prisma.user.findUniqueOrThrow({ where: { id: a.id } }))
          .assignedTeacherId,
      ).toBe(teacherB.profileId);
      // The old teacher keeps being paid for the class they taught.
      expect(
        await prisma.payoutEntry.count({
          where: { teacherId: teacherA.profileId!, type: 'CLASS_COMPLETED' },
        }),
      ).toBe(1);
    });

    it('rebuilds every batch on a curriculum when its lessons change', async () => {
      const { batch } = await create('Evening Odyssey');
      await enroll(await student('ada'), batch.id);
      expect(
        await prisma.batchSession.count({ where: { batchId: batch.id } }),
      ).toBe(6);

      await prisma.lesson.create({
        data: { courseId: course.id, title: 'Lesson 7', order: 7 },
      });
      await prisma.course.update({
        where: { id: course.id },
        data: { sessions: 7 },
      });
      const result = await w.batches.reconcileCourseBatches(course.id);
      expect(result).toEqual({ reconciled: 1, skipped: 0 });
      const sessions = await sessionsOf(batch.id);
      expect(sessions.map((s) => s.lessonNumber)).toEqual([
        1, 2, 3, 4, 5, 6, 7,
      ]);
      expect(sessions[6].lessonId).not.toBeNull();
    });

    describe('what an admin can do to one class', () => {
      it('reschedules a class for everyone in it (and refuses a time the teacher is busy)', async () => {
        const { batch } = await create('Evening Odyssey');
        const a = await student('ada');
        const b = await student('ben');
        await enroll(a, batch.id);
        await enroll(b, batch.id);
        const [first, second] = await sessionsOf(batch.id);
        const newStart = new Date(first.start.getTime() + 2 * 3_600_000);
        const newEnd = new Date(newStart.getTime() + 60 * 60_000);

        await w.sessions.adminRescheduleSession(
          first.id,
          newStart,
          newEnd,
          admin.id,
        );
        const moved = await prisma.batchSession.findUniqueOrThrow({
          where: { id: first.id },
          include: { participants: true },
        });
        expect(moved.start.getTime()).toBe(newStart.getTime());
        expect(moved.participants).toHaveLength(2);
        expect(
          moved.participants.every(
            (p) => p.start.getTime() === newStart.getTime(),
          ),
        ).toBe(true);
        expect(
          w.notifications.sendClassRescheduledToStudent,
        ).toHaveBeenCalledTimes(2);

        const clash = await refused(
          w.sessions.adminRescheduleSession(
            first.id,
            second.start,
            new Date(second.start.getTime() + 60 * 60_000),
            admin.id,
          ),
        );
        expect(clash.message).toMatch(/already booked/);
      });

      it('cancels a class for everyone in it, and deletes one', async () => {
        const { batch } = await create('Evening Odyssey');
        await enroll(await student('ada'), batch.id);
        await enroll(await student('ben'), batch.id);
        const [first, second] = await sessionsOf(batch.id);

        await w.sessions.adminCancelSession(
          first.id,
          'Teacher unwell',
          admin.id,
        );
        const cancelled = await prisma.batchSession.findUniqueOrThrow({
          where: { id: first.id },
          include: { participants: true },
        });
        expect(cancelled.status).toBe('CANCELLED');
        expect(cancelled.participants.map((p) => p.status)).toEqual([
          'CANCELLED',
          'CANCELLED',
        ]);
        expect(
          w.notifications.sendClassCancelledToStudent,
        ).toHaveBeenCalledTimes(2);
        expect(
          (
            await refused(
              w.sessions.adminCancelSession(second.id, ' ', admin.id),
            )
          ).message,
        ).toMatch(/reason is required/);

        await w.sessions.adminDeleteSession(second.id, admin.id, 'duplicate');
        expect(
          await prisma.batchSession.count({ where: { id: second.id } }),
        ).toBe(0);
        expect(
          await prisma.scheduledLesson.count({
            where: { batchSessionId: second.id },
          }),
        ).toBe(0);
      });

      it('cannot touch one student’s row on its own — the class is shared', async () => {
        const { batch } = await create('Evening Odyssey');
        const a = await student('ada');
        await enroll(a, batch.id);
        const row = (await rowsOf(a))[0];
        expect(
          (
            await refused(
              w.scheduling.adminCancelLesson(row.id, 'just one', admin.id),
            )
          ).message,
        ).toMatch(/shared by a batch/);
        expect(
          (
            await refused(
              w.scheduling.adminRescheduleLesson(
                row.id,
                new Date(row.start.getTime() + 3_600_000),
                new Date(row.end.getTime() + 3_600_000),
                admin.id,
              ),
            )
          ).message,
        ).toMatch(/shared by a batch/);
      });
    });
  });

  // ═══ Reading ═══════════════════════════════════════════════════════════════

  describe('what the admin screens read', () => {
    it('lists every batch a student could join, most compatible first, with what stands in the way', async () => {
      const { batch: good } = await create('A Good Fit');
      const { batch: ahead } = await create(
        'Ahead',
        {},
        teacherA,
        weeklyFrom(3, '19:00'),
      );
      const { batch: wrongTeacher } = await create(
        'Wrong Teacher',
        {},
        teacherB,
        weeklyFrom(3, '12:00'),
      );
      await enroll(await student('anchor-1'), good.id);
      const anchor2 = await student('anchor-2');
      await enroll(anchor2, ahead.id);
      const s = await student('looking', { completed: 0 });
      // Make "Ahead" be on lesson 2: one class taught.
      const [c1] = await sessionsOf(ahead.id);
      await runSession(c1.id, [anchor2]);
      await finish(c1.id);

      const { options } = await w.batches.listOptionsForStudent(s.id);
      expect(options.map((o) => o.batch.name)).toEqual([
        'A Good Fit', // compatible
        'Ahead', // allowed with a decision (skip lesson 1)
        'Wrong Teacher', // allowed with a decision (teacher change)
      ]);
      expect(options[0]).toMatchObject({ compatible: true, allowed: true });
      expect(options[1]).toMatchObject({ compatible: false, allowed: true });
      expect(options[1].issues.map((i) => i.code)).toEqual(['PROGRESS_BEHIND']);
      expect(options[2].issues.map((i) => i.code)).toContain('TEACHER_CHANGE');
      expect(wrongTeacher.id).toBeTruthy();
    });

    it('lists the students that could be added to a batch with the same facts', async () => {
      const { batch } = await create('Evening Odyssey');
      await student('fits');
      await student('wrong-course', { course: otherCourse });
      const { candidates } = await w.batches.listCandidatesForBatch(batch.id);
      const by = Object.fromEntries(
        candidates.map((c) => [c.student.fullName, c]),
      );
      expect(by['fits']).toMatchObject({ compatible: true });
      expect(by['wrong course'].allowed).toBe(false);
      expect(by['wrong course'].issues.map((i) => i.code)).toContain(
        'COURSE_MISMATCH',
      );
      const found = await w.batches.listCandidatesForBatch(batch.id, 'FITS');
      expect(found.candidates.map((c) => c.student.fullName)).toEqual(['fits']);
    });

    it('describes a batch: members with their own progress, upcoming and recent classes', async () => {
      const { batch } = await create('Evening Odyssey');
      const a = await student('ada');
      const b = await student('ben');
      await enroll(a, batch.id);
      await enroll(b, batch.id);
      const detail = await w.batches.getBatchDetail(batch.id);
      expect(detail.members.map((m) => m.fullName).sort()).toEqual([
        'ada',
        'ben',
      ]);
      expect(detail.upcomingSessions).toHaveLength(6);
      expect(detail.upcomingSessions[0]).toMatchObject({
        lessonNumber: 1,
        students: 2,
      });
      // The admin's class actions show who is in each upcoming class.
      expect(
        detail.upcomingSessions[0].participants.map((p) => p.fullName).sort(),
      ).toEqual(['ada', 'ben']);
      expect(detail.warnings).toEqual([]);
      expect(await w.batches.getStudentPlacement(a.id)).toMatchObject({
        id: batch.id,
        name: 'Evening Odyssey',
        alignment: 'ALIGNED',
      });
      expect(
        await w.batches.getStudentPlacement((await student('nobody')).id),
      ).toBeNull();
    });

    it('the student’s Schedule tab: their class type, their batch, the batch’s slots, no weekly slots of their own', async () => {
      const { batch } = await create('Evening Odyssey');
      const a = await student('ada');
      await enroll(a, batch.id);
      const schedule = await w.scheduling.getStudentSchedule(a.id);
      expect(schedule.classType).toBe('BATCH');
      expect(schedule.batch).toMatchObject({
        id: batch.id,
        name: 'Evening Odyssey',
        memberCount: 1,
        maxStudents: 4,
      });
      expect(schedule.batch!.nextSession).not.toBeNull();
      expect(schedule.slots).toHaveLength(1);
      expect(schedule.lessons.upcomingCount).toBe(6);
      expect(
        await prisma.recurringSlot.count({ where: { studentUserId: a.id } }),
      ).toBe(0);
    });
  });
});
