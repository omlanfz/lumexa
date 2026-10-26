import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  AttemptStatus,
  LessonStatus,
  Role,
  SessionType,
  TestReportStatus,
} from '@prisma/client';
import { ClassTestsService, classGroupWhere } from './class-tests.service';

// The teacher's class monitor and the lock, against a mocked Prisma. The real
// row-lock behaviour (a lock racing a "Start test") is proven against Postgres
// in class-tests.integration.spec.ts.

interface Row {
  [k: string]: any;
}

const TEACHER = { userId: 'tch-user', role: Role.TEACHER };
const ADMIN = { userId: 'adm', role: Role.ADMIN };

const START = new Date('2026-10-24T09:00:00.000Z');
const END = new Date('2026-10-24T10:00:00.000Z');

function anchorRow(over: Row = {}): Row {
  return {
    id: 'sl-1',
    teacherId: 'tp-1',
    courseId: 'course-1',
    lessonNumber: 9,
    start: START,
    end: END,
    teacher: { userId: TEACHER.userId },
    lesson: {
      assessment: {
        id: 'asm-1',
        type: SessionType.COURSE_TEST,
        title: 'Course Test',
        isPublished: true,
        sourceAssessmentId: null,
      },
    },
    ...over,
  };
}

function member(id: string, name: string, over: Row = {}): Row {
  return {
    id,
    studentUserId: `stu-${id}`,
    testLockedAt: null,
    student: { fullName: name },
    assessmentAttempt: null,
    ...over,
  };
}

function attemptRow(over: Row = {}): Row {
  return {
    id: 'att-1',
    status: AttemptStatus.IN_PROGRESS,
    startedAt: new Date('2026-10-24T09:01:00.000Z'),
    submittedAt: null,
    lockedAt: null,
    mcqQuestionIds: ['q1', 'q2', 'q3', 'q4'],
    mcqAnswers: [
      { selectedIndex: 1 },
      { selectedIndex: 0 },
      { selectedIndex: null },
      { selectedIndex: null },
    ],
    practicalSubmissions: [],
    report: null,
    ...over,
  };
}

function setup() {
  const tx: any = {
    $queryRaw: jest.fn().mockResolvedValue([{ testLockedAt: null }]),
    assessmentAttempt: { findUnique: jest.fn().mockResolvedValue(null) },
    scheduledLesson: { update: jest.fn().mockResolvedValue({}) },
  };
  const prisma: any = {
    scheduledLesson: {
      findUnique: jest.fn().mockResolvedValue(anchorRow()),
      findMany: jest.fn().mockResolvedValue([]),
      updateMany: jest.fn(),
    },
    assessmentAttempt: { findUnique: jest.fn().mockResolvedValue(null) },
    $transaction: jest.fn(async (fn: (t: unknown) => unknown) => fn(tx)),
  };
  const assessments: any = {
    lockAttempt: jest.fn().mockResolvedValue({ alreadySubmitted: false }),
    bankSummary: jest.fn().mockResolvedValue({
      counts: { mcq: 30, trueFalse: 10, practical: 0 },
      totalMarks: 40,
      meetsStandard: true,
    }),
  };
  const service = new ClassTestsService(prisma, assessments);
  return { service, prisma, tx, assessments };
}

describe('classGroupWhere — who sits the test together', () => {
  it('is the same teacher, course and lesson, overlapping in time, still to be taught', () => {
    expect(classGroupWhere(anchorRow() as never)).toEqual({
      teacherId: 'tp-1',
      courseId: 'course-1',
      lessonNumber: 9,
      start: { lt: END },
      end: { gt: START },
      OR: [{ id: 'sl-1' }, { status: LessonStatus.UPCOMING }],
    });
  });

  it('is everyone in the batch class, whatever their time or lesson row says', () => {
    expect(
      classGroupWhere(
        anchorRow({ batchSessionId: 'sess-1', lessonNumber: 12 }) as never,
      ),
    ).toEqual({
      batchSessionId: 'sess-1',
      OR: [{ id: 'sl-1' }, { status: LessonStatus.UPCOMING }],
    });
  });

  it('never reaches into another batch class held by the same teacher at the same time', () => {
    const a = classGroupWhere(
      anchorRow({ batchSessionId: 'sess-a' }) as never,
    ) as Row;
    const b = classGroupWhere(
      anchorRow({ id: 'sl-2', batchSessionId: 'sess-b' }) as never,
    ) as Row;
    expect(a.batchSessionId).toBe('sess-a');
    expect(b.batchSessionId).toBe('sess-b');
    // No teacher/time filter: the session alone is the group.
    expect(a).not.toHaveProperty('teacherId');
    expect(a).not.toHaveProperty('start');
  });
});

describe('ClassTestsService — access', () => {
  it.each([
    ['the class’s teacher', TEACHER],
    ['an admin', ADMIN],
  ])('%s may monitor and lock', async (_who, requester) => {
    const { service } = setup();
    await expect(service.getOverview('sl-1', requester)).resolves.toBeDefined();
    await expect(service.lockClass('sl-1', requester)).resolves.toBeDefined();
  });

  it.each([
    ['another teacher', { userId: 'someone-else', role: Role.TEACHER }],
    ['the student', { userId: 'stu-sl-1', role: Role.STUDENT }],
  ])('%s may not', async (_who, requester) => {
    const { service, prisma, assessments } = setup();
    await expect(service.getOverview('sl-1', requester)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(service.lockStudent('sl-1', requester)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(service.lockClass('sl-1', requester)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(
      service.reopenStudent('sl-1', requester),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(assessments.lockAttempt).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.scheduledLesson.updateMany).not.toHaveBeenCalled();
  });

  it('an unknown class is not found', async () => {
    const { service, prisma } = setup();
    prisma.scheduledLesson.findUnique.mockResolvedValue(null);
    await expect(service.getOverview('nope', TEACHER)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('ClassTestsService.getOverview', () => {
  it('shows every learner of the group with their state, answers and coding progress', async () => {
    const { service, prisma } = setup();
    const lockedAt = new Date('2026-10-24T09:50:00.000Z');
    prisma.scheduledLesson.findMany.mockResolvedValue([
      member('a', 'Ada'),
      member('b', 'Ben', { assessmentAttempt: attemptRow() }),
      member('c', 'Cleo', {
        assessmentAttempt: attemptRow({
          id: 'att-2',
          status: AttemptStatus.SUBMITTED,
          submittedAt: lockedAt,
          lockedAt,
          practicalSubmissions: [{ code: 'print(1)' }],
          report: { id: 'rep-2', status: TestReportStatus.PENDING_REVIEW },
        }),
        testLockedAt: lockedAt,
      }),
      member('d', 'Dev', { testLockedAt: lockedAt }),
    ]);

    const out = await service.getOverview('sl-1', TEACHER);

    expect(prisma.scheduledLesson.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: classGroupWhere(anchorRow() as never),
        orderBy: [{ student: { fullName: 'asc' } }, { id: 'asc' }],
      }),
    );
    expect(out.serverTime).toBeInstanceOf(Date);
    expect(out.assessment).toMatchObject({
      id: 'asm-1',
      title: 'Course Test',
      counts: { mcq: 30, trueFalse: 10, practical: 0 },
    });
    expect(out.students.map((s) => [s.studentName, s.state])).toEqual([
      ['Ada', 'NOT_STARTED'],
      ['Ben', 'IN_PROGRESS'],
      ['Cleo', 'SUBMITTED'],
      ['Dev', 'CLOSED'],
    ]);

    const ben = out.students[1];
    expect(ben.attempt).toMatchObject({
      id: 'att-1',
      total: 4,
      answered: 2,
      codingSaved: false,
      lockedAt: null,
    });

    const cleo = out.students[2];
    expect(cleo.attempt).toMatchObject({
      lockedAt,
      codingSaved: true,
      report: { id: 'rep-2', status: TestReportStatus.PENDING_REVIEW },
    });
    // A submitted learner is not "closed" — the close only applies before a start.
    expect(cleo.closedAt).toBeNull();
    expect(out.students[3]).toMatchObject({
      closedAt: lockedAt,
      attempt: null,
    });
  });

  it('an empty code box does not count as coding progress', async () => {
    const { service, prisma } = setup();
    prisma.scheduledLesson.findMany.mockResolvedValue([
      member('a', 'Ada', {
        assessmentAttempt: attemptRow({
          practicalSubmissions: [{ code: '  \n' }],
        }),
      }),
    ]);
    const out = await service.getOverview('sl-1', TEACHER);
    expect(out.students[0].attempt?.codingSaved).toBe(false);
  });

  it('works for a class with no test linked', async () => {
    const { service, prisma } = setup();
    prisma.scheduledLesson.findUnique.mockResolvedValue(
      anchorRow({ lesson: null }),
    );
    prisma.scheduledLesson.findMany.mockResolvedValue([member('a', 'Ada')]);
    const out = await service.getOverview('sl-1', TEACHER);
    expect(out.assessment).toBeNull();
    expect(out.students).toHaveLength(1);
  });
});

describe('ClassTestsService.lockStudent', () => {
  function lockable(over: { attempt?: Row | null } = {}) {
    const ctx = setup();
    ctx.prisma.scheduledLesson.findUnique.mockImplementation(
      async ({ select }: Row) =>
        select.teacher
          ? anchorRow()
          : {
              id: 'sl-1',
              studentUserId: 'stu-1',
              student: { fullName: 'Ada' },
            },
    );
    ctx.prisma.assessmentAttempt.findUnique.mockResolvedValue(
      over.attempt === undefined
        ? { id: 'att-1', status: AttemptStatus.IN_PROGRESS }
        : over.attempt,
    );
    return ctx;
  }

  it('submits an attempt in progress exactly as saved, recording who locked it', async () => {
    const { service, assessments } = lockable();
    const out = await service.lockStudent('sl-1', TEACHER);
    expect(assessments.lockAttempt).toHaveBeenCalledWith(
      'att-1',
      'stu-1',
      'sl-1',
      TEACHER.userId,
    );
    expect(out).toEqual({
      scheduledLessonId: 'sl-1',
      studentUserId: 'stu-1',
      studentName: 'Ada',
      outcome: 'SUBMITTED',
    });
  });

  it('reports a learner who handed in a moment earlier as already submitted', async () => {
    const { service, assessments } = lockable();
    assessments.lockAttempt.mockResolvedValue({ alreadySubmitted: true });
    const out = await service.lockStudent('sl-1', TEACHER);
    expect(out.outcome).toBe('ALREADY_SUBMITTED');
  });

  it.each([AttemptStatus.SUBMITTED, AttemptStatus.GRADED])(
    'leaves an attempt that is already %s alone',
    async (status) => {
      const { service, assessments, prisma } = lockable({
        attempt: { id: 'att-1', status },
      });
      const out = await service.lockStudent('sl-1', TEACHER);
      expect(out.outcome).toBe('ALREADY_SUBMITTED');
      expect(assessments.lockAttempt).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    },
  );

  it('closes the test for a learner who never started, so they cannot start it', async () => {
    const { service, tx, assessments } = lockable({ attempt: null });
    const out = await service.lockStudent('sl-1', TEACHER);
    expect(out.outcome).toBe('CLOSED');
    expect(tx.scheduledLesson.update).toHaveBeenCalledWith({
      where: { id: 'sl-1' },
      data: {
        testLockedAt: expect.any(Date),
        testLockedByUserId: TEACHER.userId,
      },
    });
    expect(assessments.lockAttempt).not.toHaveBeenCalled();
  });

  it('closing twice is harmless', async () => {
    const { service, tx } = lockable({ attempt: null });
    tx.$queryRaw.mockResolvedValue([{ testLockedAt: new Date() }]);
    const out = await service.lockStudent('sl-1', TEACHER);
    expect(out.outcome).toBe('ALREADY_CLOSED');
    expect(tx.scheduledLesson.update).not.toHaveBeenCalled();
  });

  it('a learner who pressed “Start test” in the same instant is locked and submitted instead', async () => {
    const { service, prisma, tx, assessments } = lockable({ attempt: null });
    // First look: no attempt. Under the row lock the start turns out to have
    // committed → go round again and lock the new attempt.
    tx.assessmentAttempt.findUnique.mockResolvedValue({ id: 'att-new' });
    prisma.assessmentAttempt.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'att-new',
        status: AttemptStatus.IN_PROGRESS,
      });

    const out = await service.lockStudent('sl-1', TEACHER);

    expect(tx.scheduledLesson.update).not.toHaveBeenCalled();
    expect(assessments.lockAttempt).toHaveBeenCalledWith(
      'att-new',
      'stu-1',
      'sl-1',
      TEACHER.userId,
    );
    expect(out.outcome).toBe('SUBMITTED');
  });

  it('takes the class row’s lock before deciding (so a start in flight is waited for)', async () => {
    const { service, tx } = lockable({ attempt: null });
    await service.lockStudent('sl-1', TEACHER);
    const sql = String(
      (tx.$queryRaw.mock.calls[0][0] as { strings?: string[] }).strings?.join(
        '?',
      ),
    );
    expect(sql).toMatch(/FROM "ScheduledLesson"/);
    expect(sql).toMatch(/FOR UPDATE/);
  });
});

describe('ClassTestsService.lockClass — “Time’s up: lock & submit all”', () => {
  function group(members: Row[]) {
    const ctx = setup();
    ctx.prisma.scheduledLesson.findMany.mockResolvedValue(members);
    ctx.prisma.scheduledLesson.findUnique.mockImplementation(
      async ({ where, select }: Row) =>
        select.teacher
          ? anchorRow()
          : {
              id: where.id,
              studentUserId: `stu-${where.id}`,
              student: { fullName: where.id },
            },
    );
    return ctx;
  }
  const m = (id: string) => ({
    id,
    studentUserId: `stu-${id}`,
    student: { fullName: id },
  });

  it('locks every learner of the group and counts what happened', async () => {
    const { service, prisma, assessments } = group([
      m('a'),
      m('b'),
      m('c'),
      m('d'),
    ]);
    // a: in progress, b: in progress, c: already handed in, d: never started.
    prisma.assessmentAttempt.findUnique.mockImplementation(
      async ({ where }: Row) => {
        const id = where.scheduledLessonId as string;
        if (id === 'a' || id === 'b')
          return { id: `att-${id}`, status: AttemptStatus.IN_PROGRESS };
        if (id === 'c') return { id: 'att-c', status: AttemptStatus.SUBMITTED };
        return null;
      },
    );

    const out = await service.lockClass('sl-1', TEACHER);

    expect(assessments.lockAttempt).toHaveBeenCalledTimes(2);
    expect(out.results.map((r) => [r.studentName, r.outcome])).toEqual([
      ['a', 'SUBMITTED'],
      ['b', 'SUBMITTED'],
      ['c', 'ALREADY_SUBMITTED'],
      ['d', 'CLOSED'],
    ]);
    expect(out).toMatchObject({
      submitted: 2,
      closed: 1,
      alreadyDone: 1,
      failed: 0,
    });
  });

  it('one learner failing never stops the others, and says why', async () => {
    const { service, prisma, assessments } = group([m('a'), m('b'), m('c')]);
    prisma.assessmentAttempt.findUnique.mockImplementation(
      async ({ where }: Row) => ({
        id: `att-${where.scheduledLessonId}`,
        status: AttemptStatus.IN_PROGRESS,
      }),
    );
    assessments.lockAttempt
      .mockResolvedValueOnce({ alreadySubmitted: false })
      .mockRejectedValueOnce(
        new ConflictException('No teacher is assigned to this class.'),
      )
      .mockResolvedValueOnce({ alreadySubmitted: false });
    const logged = jest
      .spyOn((service as any).logger, 'error')
      .mockImplementation(() => undefined);

    const out = await service.lockClass('sl-1', TEACHER);

    expect(out.results.map((r) => r.outcome)).toEqual([
      'SUBMITTED',
      'FAILED',
      'SUBMITTED',
    ]);
    expect(out.results[1].error).toBe('No teacher is assigned to this class.');
    expect(out).toMatchObject({ submitted: 2, failed: 1 });
    expect(logged).toHaveBeenCalledTimes(1);
  });

  it('keeps the details of an unexpected failure out of what the teacher sees', async () => {
    const { service, prisma, assessments } = group([m('a')]);
    prisma.assessmentAttempt.findUnique.mockResolvedValue({
      id: 'att-a',
      status: AttemptStatus.IN_PROGRESS,
    });
    assessments.lockAttempt.mockRejectedValue(
      new Error('connection to 10.0.0.5:5432 refused'),
    );
    jest
      .spyOn((service as any).logger, 'error')
      .mockImplementation(() => undefined);
    const out = await service.lockClass('sl-1', TEACHER);
    expect(out.results[0].error).toBe(
      'Something went wrong. Please try again.',
    );
  });

  it('shows the validation text of a bad-request failure', async () => {
    const { service, prisma, assessments } = group([m('a')]);
    prisma.assessmentAttempt.findUnique.mockResolvedValue({
      id: 'att-a',
      status: AttemptStatus.IN_PROGRESS,
    });
    assessments.lockAttempt.mockRejectedValue(
      new BadRequestException(['first problem', 'second problem']),
    );
    jest
      .spyOn((service as any).logger, 'error')
      .mockImplementation(() => undefined);
    const out = await service.lockClass('sl-1', TEACHER);
    expect(out.results[0].error).toBe('first problem second problem');
  });

  it('is safe to press twice', async () => {
    const { service, prisma, assessments } = group([m('a')]);
    prisma.assessmentAttempt.findUnique.mockResolvedValue({
      id: 'att-a',
      status: AttemptStatus.SUBMITTED,
    });
    const out = await service.lockClass('sl-1', TEACHER);
    expect(out.results[0].outcome).toBe('ALREADY_SUBMITTED');
    expect(assessments.lockAttempt).not.toHaveBeenCalled();
  });
});

describe('ClassTestsService.reopenStudent', () => {
  it('reopens a test that was closed before the learner started', async () => {
    const { service, prisma } = setup();
    prisma.scheduledLesson.updateMany.mockResolvedValue({ count: 1 });
    await expect(service.reopenStudent('sl-1', TEACHER)).resolves.toEqual({
      reopened: true,
    });
    expect(prisma.scheduledLesson.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'sl-1',
        testLockedAt: { not: null },
        assessmentAttempt: { is: null },
      },
      data: { testLockedAt: null, testLockedByUserId: null },
    });
  });

  it('never reopens a test that was already handed in', async () => {
    const { service, prisma } = setup();
    prisma.scheduledLesson.updateMany.mockResolvedValue({ count: 0 });
    prisma.scheduledLesson.findUnique.mockImplementation(
      async ({ select }: Row) =>
        select.teacher
          ? anchorRow()
          : {
              testLockedAt: new Date(),
              assessmentAttempt: { id: 'att-1' },
            },
    );
    await expect(service.reopenStudent('sl-1', TEACHER)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('a test that was not closed is simply left as it is', async () => {
    const { service, prisma } = setup();
    prisma.scheduledLesson.updateMany.mockResolvedValue({ count: 0 });
    prisma.scheduledLesson.findUnique.mockImplementation(
      async ({ select }: Row) =>
        select.teacher
          ? anchorRow()
          : { testLockedAt: null, assessmentAttempt: null },
    );
    await expect(service.reopenStudent('sl-1', TEACHER)).resolves.toEqual({
      reopened: false,
    });
  });
});
