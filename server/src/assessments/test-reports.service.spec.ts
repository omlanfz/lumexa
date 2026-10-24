import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  AttemptStatus,
  Role,
  SessionType,
  TestReportStatus,
} from '@prisma/client';
import { QuestionResult, RubricScore } from './assessment-grading';
import { TestReportsService } from './test-reports.service';

// The report-card workflow with a hand-rolled in-memory Prisma: enough of
// testReport.* to honour the optimistic-concurrency WHEREs the service relies
// on. The same flow runs against a real Postgres in
// assessments.integration.spec.ts.

const TEACHER = { userId: 'user-teacher', role: Role.TEACHER };
const ADMIN = { userId: 'user-admin', role: Role.ADMIN };
const STUDENT = { userId: 'user-student', role: Role.STUDENT };

function result(
  id: string,
  correct: boolean,
  kind: 'MCQ' | 'TRUE_FALSE' = 'MCQ',
): QuestionResult {
  return {
    questionId: id,
    order: 1,
    kind,
    text: `Question ${id}`,
    options: kind === 'MCQ' ? ['a', 'b', 'c', 'd'] : ['True', 'False'],
    selectedIndex: correct ? 0 : 1,
    correctIndex: 0,
    autoCorrect: correct,
    explanation: null,
    override: null,
  };
}

interface Row {
  [k: string]: any;
}

function courseReport(over: Row = {}): Row {
  // 10 questions, 7 right → 70%.
  const results = Array.from({ length: 10 }, (_, i) => result(`q${i}`, i < 7));
  return {
    id: 'rep-1',
    attemptId: 'att-1',
    assessmentId: 'asm-1',
    studentUserId: STUDENT.userId,
    teacherId: 'tp-1',
    courseId: 'course-1',
    courseTitle: 'Python for Young Builders',
    assessmentType: SessionType.COURSE_TEST,
    testTitle: 'Course Test',
    status: TestReportStatus.PENDING_REVIEW,
    passScorePct: 70,
    mcqTotal: 10,
    trueFalseTotal: 0,
    autoObjectiveScore: 7,
    objectiveScore: 7,
    objectiveMaxScore: 10,
    questionResults: results,
    hasCodingProject: false,
    codingProject: null,
    codingMaxScore: null,
    codingRubricScores: null,
    codingScore: null,
    codingFeedback: null,
    codingEvaluatedAt: null,
    totalMaxScore: 10,
    totalScore: 7,
    percentage: 70,
    passed: true,
    feedback: null,
    strengths: null,
    improvements: null,
    teacherEdited: false,
    submittedAt: new Date('2026-10-24T09:00:00.000Z'),
    lastEditedAt: null,
    approvedAt: null,
    sharedAt: null,
    sharedToEmail: null,
    shareRecipientKind: null,
    shareEmailLogId: null,
    shareAttempts: 0,
    shareStartedAt: null,
    lastShareError: null,
    updatedAt: new Date('2026-10-24T09:00:00.000Z'),
    student: {
      id: STUDENT.userId,
      fullName: 'Mira Rahman',
      avatarUrl: null,
      email: 'mira@example.com',
      billingContactEmail: null,
    },
    teacher: { id: 'tp-1', user: { fullName: 'Ms Karim' } },
    ...over,
  };
}

function finalReport(over: Row = {}): Row {
  const rubric: RubricScore[] = [
    { criterion: 'Functions', maxPoints: 8, score: null },
    { criterion: 'Calculations', maxPoints: 12, score: null },
  ];
  // 30 questions, 27 right.
  const results = Array.from({ length: 30 }, (_, i) => result(`q${i}`, i < 27));
  return courseReport({
    assessmentType: SessionType.FINAL_TEST,
    status: TestReportStatus.PENDING_CODE_EVALUATION,
    mcqTotal: 25,
    trueFalseTotal: 5,
    autoObjectiveScore: 27,
    objectiveScore: 27,
    objectiveMaxScore: 30,
    questionResults: results,
    hasCodingProject: true,
    codingProject: {
      questionId: 'p1',
      title: 'Project',
      instructions: '…',
      language: 'python',
      code: 'print(1)',
      savedAt: null,
    },
    codingMaxScore: 20,
    codingRubricScores: rubric,
    totalMaxScore: 50,
    totalScore: null,
    percentage: null,
    passed: null,
    ...over,
  });
}

const isDate = (v: unknown): v is Date =>
  Object.prototype.toString.call(v) === '[object Date]';

/** Deep copy that keeps Dates as this test file's own Dates (structuredClone
 *  returns the outer realm's, which `instanceof Date` rejects under Jest). */
function clone<T>(v: T): T {
  if (Array.isArray(v)) return v.map(clone) as T;
  if (isDate(v)) return new Date(v.getTime()) as T;
  if (v && typeof v === 'object')
    return Object.fromEntries(
      Object.entries(v).map(([k, x]) => [k, clone(x)]),
    ) as T;
  return v;
}

function flatMatch(row: Row, where: Row): boolean {
  return Object.entries(where).every(([key, expected]) => {
    if (key === 'OR')
      return (expected as Row[]).some((clause) => flatMatch(row, clause));
    const actual = row[key];
    if (isDate(expected))
      return isDate(actual) && actual.getTime() === expected.getTime();
    if (expected && typeof expected === 'object' && 'in' in expected)
      return (expected as { in: unknown[] }).in.includes(actual);
    if (expected && typeof expected === 'object' && 'lt' in expected)
      return (
        isDate(actual) &&
        actual.getTime() < (expected as { lt: Date }).lt.getTime()
      );
    return actual === expected;
  });
}

function setup(initial: Row, opts: { teacherProfile?: boolean } = {}) {
  const db = { report: initial, attemptUpdates: [] as Row[] };
  const prisma: any = {
    teacherProfile: {
      findUnique: jest
        .fn()
        .mockResolvedValue(
          opts.teacherProfile === false ? null : { id: 'tp-1' },
        ),
    },
    testReport: {
      findFirst: jest.fn(async () => clone(db.report)),
      findMany: jest.fn().mockResolvedValue([]),
      groupBy: jest.fn().mockResolvedValue([]),
      updateMany: jest.fn(async ({ where, data }: Row) => {
        const flat = Object.fromEntries(
          Object.entries(where).filter(([k]) => k !== 'AND'),
        );
        if (!flatMatch(db.report, flat)) return { count: 0 };
        Object.assign(db.report, data, {
          updatedAt: new Date(db.report.updatedAt.getTime() + 1000),
        });
        return { count: 1 };
      }),
      update: jest.fn(async ({ data }: Row) => {
        Object.assign(db.report, data, {
          updatedAt: new Date(db.report.updatedAt.getTime() + 1000),
        });
        return db.report;
      }),
    },
    assessmentAttempt: {
      update: jest.fn(async (args: Row) => {
        db.attemptUpdates.push(args);
        return {};
      }),
    },
    practicalSubmission: { updateMany: jest.fn().mockResolvedValue({}) },
    certificate: { findFirst: jest.fn().mockResolvedValue(null) },
    emailLog: { findUnique: jest.fn().mockResolvedValue(null) },
    $transaction: jest.fn(async (fn: (tx: unknown) => unknown) => fn(prisma)),
  };
  const notifications = {
    sendTestReportToParent: jest
      .fn()
      .mockResolvedValue({ ok: true, logId: 'mail-1' }),
  };
  const certificates = {
    checkAndIssueCertificate: jest.fn().mockResolvedValue(null),
  };
  const service = new TestReportsService(
    prisma,
    notifications as any,
    certificates as any,
  );
  return { service, prisma, db, notifications, certificates };
}

describe('TestReportsService — access', () => {
  it('only teachers and admins may evaluate tests', async () => {
    const { service } = setup(courseReport());
    await expect(service.get('rep-1', STUDENT)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(service.list(STUDENT, {})).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(service.summary(STUDENT)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('a teacher without a profile gets nothing', async () => {
    const { service } = setup(courseReport(), { teacherProfile: false });
    await expect(service.get('rep-1', TEACHER)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('scopes a teacher to their own classes and their assigned students', async () => {
    const { service, prisma } = setup(courseReport());
    await service.get('rep-1', TEACHER);
    const where = prisma.testReport.findFirst.mock.calls[0][0].where;
    expect(where.AND).toEqual([
      { id: 'rep-1' },
      {
        OR: [{ teacherId: 'tp-1' }, { student: { assignedTeacherId: 'tp-1' } }],
      },
    ]);
  });

  it('an admin is not scoped', async () => {
    const { service, prisma } = setup(courseReport());
    await service.get('rep-1', ADMIN);
    expect(prisma.testReport.findFirst.mock.calls[0][0].where.AND).toEqual([
      { id: 'rep-1' },
      {},
    ]);
    expect(prisma.teacherProfile.findUnique).not.toHaveBeenCalled();
  });

  it("a report outside the teacher's scope is simply not found", async () => {
    const { service, prisma } = setup(courseReport());
    prisma.testReport.findFirst.mockResolvedValue(null);
    await expect(service.get('rep-1', TEACHER)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('the list sorts work that needs the teacher first, then newest first', async () => {
    const { service, prisma } = setup(courseReport());
    const row = (id: string, status: TestReportStatus, day: number) => ({
      ...courseReport({ id, status }),
      submittedAt: new Date(`2026-10-${day}T09:00:00.000Z`),
      assessmentType: SessionType.COURSE_TEST,
    });
    prisma.testReport.findMany.mockResolvedValue([
      row('shared-new', TestReportStatus.SHARED_WITH_PARENTS, 20),
      row('pending-old', TestReportStatus.PENDING_REVIEW, 10),
      row('ready', TestReportStatus.READY_TO_SHARE, 18),
      row('pending-new', TestReportStatus.PENDING_CODE_EVALUATION, 15),
    ]);
    const items = await service.list(TEACHER, {});
    expect(items.map((i) => i.id)).toEqual([
      'pending-new',
      'pending-old',
      'shared-new',
      'ready',
    ]);
    expect(items.map((i) => i.needsAction)).toEqual([true, true, false, false]);
  });

  it('the PENDING filter means "needs the teacher"', async () => {
    const { service, prisma } = setup(courseReport());
    await service.list(TEACHER, { status: 'PENDING' as any });
    const and = prisma.testReport.findMany.mock.calls[0][0].where.AND;
    expect(and).toContainEqual({
      status: {
        in: [
          TestReportStatus.PENDING_REVIEW,
          TestReportStatus.PENDING_CODE_EVALUATION,
        ],
      },
    });
  });
});

describe('TestReportsService.update — review and edit', () => {
  it('a teacher override changes the score but never the automatic score', async () => {
    const { service, db } = setup(courseReport());
    // q8 was wrong; the teacher accepts it.
    await service.update(
      'rep-1',
      { questionOverrides: [{ questionId: 'q8', correct: true, note: 'ok' }] },
      TEACHER,
    );
    expect(db.report.objectiveScore).toBe(8);
    expect(db.report.autoObjectiveScore).toBe(7); // untouched
    expect(db.report.percentage).toBe(80);
    expect(db.report.teacherEdited).toBe(true);
    expect(db.report.lastEditedByUserId).toBe(TEACHER.userId);
    expect(db.report.questionResults[8].override).toMatchObject({
      correct: true,
      note: 'ok',
    });
    expect(db.report.questionResults[8].autoCorrect).toBe(false);
  });

  it('re-marking back to the automatic result removes the override and the "edited" flag', async () => {
    const { service, db } = setup(courseReport());
    await service.update(
      'rep-1',
      { questionOverrides: [{ questionId: 'q8', correct: true }] },
      TEACHER,
    );
    await service.update(
      'rep-1',
      { questionOverrides: [{ questionId: 'q8', correct: null }] },
      TEACHER,
    );
    expect(db.report.objectiveScore).toBe(7);
    expect(db.report.questionResults[8].override).toBeNull();
    expect(db.report.teacherEdited).toBe(false);
  });

  it('feedback text is trimmed and an empty string clears it', async () => {
    const { service, db } = setup(courseReport({ feedback: 'old' }));
    await service.update(
      'rep-1',
      { feedback: '  Great effort!  ', strengths: '   ' },
      TEACHER,
    );
    expect(db.report.feedback).toBe('Great effort!');
    expect(db.report.strengths).toBeNull();
    await service.update('rep-1', { feedback: '' }, TEACHER);
    expect(db.report.feedback).toBeNull();
  });

  it('rejects an override for a question that is not on the report', async () => {
    const { service } = setup(courseReport());
    await expect(
      service.update(
        'rep-1',
        { questionOverrides: [{ questionId: 'other', correct: true }] },
        TEACHER,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('a stale editor is told to reload instead of overwriting newer work', async () => {
    const { service, db } = setup(courseReport());
    await expect(
      service.update(
        'rep-1',
        {
          feedback: 'x',
          expectedUpdatedAt: new Date(
            db.report.updatedAt.getTime() - 5000,
          ).toISOString(),
        },
        TEACHER,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(db.report.feedback).toBeNull();
  });

  it('refuses to write when the report moved on after it was loaded', async () => {
    const { service, prisma } = setup(courseReport());
    prisma.testReport.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.update('rep-1', { feedback: 'x' }, TEACHER),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it.each([
    TestReportStatus.READY_TO_SHARE,
    TestReportStatus.SHARED_WITH_PARENTS,
  ])('a %s report is locked against edits', async (status) => {
    const { service } = setup(courseReport({ status }));
    await expect(
      service.update('rep-1', { feedback: 'x' }, TEACHER),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  describe('coding project (Final Test)', () => {
    it('marks stay "pending code evaluation" until every criterion has a mark', async () => {
      const { service, db } = setup(finalReport());
      await service.update(
        'rep-1',
        { codingRubricScores: [{ criterion: 'Functions', score: 6 }] },
        TEACHER,
      );
      expect(db.report.status).toBe(TestReportStatus.PENDING_CODE_EVALUATION);
      expect(db.report.codingScore).toBeNull();
      expect(db.report.totalScore).toBeNull();
      expect(db.report.percentage).toBeNull();
      expect(db.report.passed).toBeNull();
      expect(db.report.teacherEdited).toBe(true);
    });

    it('once the rubric is complete the total, percentage and pass are computed', async () => {
      const { service, db, prisma } = setup(finalReport());
      await service.update(
        'rep-1',
        {
          codingRubricScores: [
            { criterion: 'Functions', score: 6 },
            { criterion: 'Calculations', score: 9.5 },
          ],
        },
        TEACHER,
      );
      expect(db.report.status).toBe(TestReportStatus.PENDING_REVIEW);
      expect(db.report.codingScore).toBe(15.5);
      expect(db.report.totalScore).toBe(42.5); // 27 + 15.5
      expect(db.report.percentage).toBe(85);
      expect(db.report.passed).toBe(true);
      expect(db.report.codingEvaluatedAt).toBeInstanceOf(Date);
      expect(prisma.practicalSubmission.updateMany).toHaveBeenCalledWith({
        where: { attemptId: 'att-1' },
        data: { score: 15.5 },
      });
    });

    it('un-marking a criterion sends the report back to "pending code evaluation"', async () => {
      const { service, db } = setup(finalReport());
      await service.update(
        'rep-1',
        {
          codingRubricScores: [
            { criterion: 'Functions', score: 6 },
            { criterion: 'Calculations', score: 9 },
          ],
        },
        TEACHER,
      );
      await service.update(
        'rep-1',
        { codingRubricScores: [{ criterion: 'Calculations', score: null }] },
        TEACHER,
      );
      expect(db.report.status).toBe(TestReportStatus.PENDING_CODE_EVALUATION);
      expect(db.report.totalScore).toBeNull();
    });

    it('a low project mark can flip a pass into a fail', async () => {
      const { service, db } = setup(finalReport());
      await service.update(
        'rep-1',
        {
          codingRubricScores: [
            { criterion: 'Functions', score: 0 },
            { criterion: 'Calculations', score: 0 },
          ],
        },
        TEACHER,
      );
      expect(db.report.totalScore).toBe(27);
      expect(db.report.percentage).toBe(54);
      expect(db.report.passed).toBe(false);
    });

    it.each([
      [
        'a mark above the criterion maximum',
        { criterion: 'Functions', score: 8.5 },
      ],
      ['a negative mark', { criterion: 'Functions', score: -1 }],
      ['an unknown criterion', { criterion: 'Style', score: 1 }],
    ])('rejects %s', async (_label, mark) => {
      const { service, db } = setup(finalReport());
      await expect(
        service.update('rep-1', { codingRubricScores: [mark] }, TEACHER),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(db.report.codingScore).toBeNull();
    });

    it('a course test has no coding project to mark', async () => {
      const { service } = setup(courseReport());
      await expect(
        service.update(
          'rep-1',
          { codingRubricScores: [{ criterion: 'Functions', score: 1 }] },
          TEACHER,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});

describe('TestReportsService.approve / reopen', () => {
  it('approving a course test releases the result to the student', async () => {
    const { service, db } = setup(courseReport());
    await service.approve('rep-1', TEACHER);
    expect(db.report.status).toBe(TestReportStatus.READY_TO_SHARE);
    expect(db.report.approvedAt).toBeInstanceOf(Date);
    expect(db.report.approvedByUserId).toBe(TEACHER.userId);
    expect(db.attemptUpdates).toHaveLength(1);
    expect(db.attemptUpdates[0].data).toMatchObject({
      status: AttemptStatus.GRADED,
      mcqScore: 7,
      mcqMaxScore: 10,
      totalScore: 70, // 0–100 percentage, what certificates read
      totalMaxScore: 100,
      passed: true,
    });
  });

  it('a Final Test cannot be approved while the project is unmarked', async () => {
    const { service, db } = setup(finalReport());
    await expect(service.approve('rep-1', TEACHER)).rejects.toThrow(
      /Mark every rubric criterion/,
    );
    expect(db.report.status).toBe(TestReportStatus.PENDING_CODE_EVALUATION);
    expect(db.attemptUpdates).toHaveLength(0);
  });

  it('a passed Final Test triggers the certificate check; a failed one does not', async () => {
    const marks = (a: number, b: number): RubricScore[] => [
      { criterion: 'Functions', maxPoints: 8, score: a },
      { criterion: 'Calculations', maxPoints: 12, score: b },
    ];
    const pass = setup(finalReport({ codingRubricScores: marks(8, 12) }));
    await pass.service.approve('rep-1', TEACHER);
    expect(pass.certificates.checkAndIssueCertificate).toHaveBeenCalledWith(
      STUDENT.userId,
      'course-1',
    );

    const fail = setup(finalReport({ codingRubricScores: marks(0, 0) }));
    await fail.service.approve('rep-1', TEACHER);
    expect(fail.db.report.passed).toBe(false);
    expect(fail.certificates.checkAndIssueCertificate).not.toHaveBeenCalled();
  });

  it('a passed course test does not trigger a certificate', async () => {
    const { service, certificates } = setup(courseReport());
    await service.approve('rep-1', TEACHER);
    expect(certificates.checkAndIssueCertificate).not.toHaveBeenCalled();
  });

  it('approving twice is refused', async () => {
    const { service } = setup(
      courseReport({ status: TestReportStatus.READY_TO_SHARE }),
    );
    await expect(service.approve('rep-1', TEACHER)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('approval fails cleanly when the report changed underneath the teacher', async () => {
    const { service, prisma, db } = setup(courseReport());
    prisma.testReport.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.approve('rep-1', TEACHER)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(db.attemptUpdates).toHaveLength(0); // the student was not released
  });

  it('reopening hides the result from the student again', async () => {
    const { service, db } = setup(
      courseReport({ status: TestReportStatus.READY_TO_SHARE }),
    );
    await service.reopen('rep-1', TEACHER);
    expect(db.report.status).toBe(TestReportStatus.PENDING_REVIEW);
    expect(db.report.approvedAt).toBeNull();
    expect(db.attemptUpdates[0].data).toMatchObject({
      status: AttemptStatus.SUBMITTED,
      totalScore: null,
      passed: null,
    });
  });

  it('only an approved, unshared report can be reopened', async () => {
    for (const status of [
      TestReportStatus.PENDING_REVIEW,
      TestReportStatus.SHARED_WITH_PARENTS,
    ]) {
      const { service } = setup(courseReport({ status }));
      await expect(service.reopen('rep-1', TEACHER)).rejects.toBeInstanceOf(
        ConflictException,
      );
    }
  });

  it('a report cannot be reopened while its email is going out', async () => {
    const { service, db } = setup(
      courseReport({
        status: TestReportStatus.READY_TO_SHARE,
        shareStartedAt: new Date(),
      }),
    );
    await expect(service.reopen('rep-1', TEACHER)).rejects.toThrow(
      /being emailed/,
    );
    expect(db.report.status).toBe(TestReportStatus.READY_TO_SHARE);
    expect(db.attemptUpdates).toHaveLength(0);
  });

  it('a Final Test with an issued certificate cannot be reopened', async () => {
    const { service, prisma } = setup(
      finalReport({
        status: TestReportStatus.READY_TO_SHARE,
        codingScore: 20,
        codingRubricScores: [
          { criterion: 'Functions', maxPoints: 8, score: 8 },
          { criterion: 'Calculations', maxPoints: 12, score: 12 },
        ],
      }),
    );
    prisma.certificate.findFirst.mockResolvedValue({ id: 'cert-1' });
    await expect(service.reopen('rep-1', TEACHER)).rejects.toThrow(
      /certificate was already issued/,
    );
  });
});

describe('TestReportsService.share — parent communication', () => {
  const approved = (over: Row = {}) =>
    courseReport({
      status: TestReportStatus.READY_TO_SHARE,
      approvedAt: new Date('2026-10-24T10:00:00.000Z'),
      ...over,
    });

  it('only an approved report can be shared', async () => {
    const { service, notifications } = setup(courseReport());
    await expect(service.share('rep-1', TEACHER)).rejects.toThrow(
      /Approve the report before sharing/,
    );
    expect(notifications.sendTestReportToParent).not.toHaveBeenCalled();
  });

  it('marks the report shared only after the email was really accepted', async () => {
    const { service, db, notifications } = setup(approved());
    await service.share('rep-1', TEACHER);
    expect(notifications.sendTestReportToParent).toHaveBeenCalledTimes(1);
    expect(db.report).toMatchObject({
      status: TestReportStatus.SHARED_WITH_PARENTS,
      sharedToEmail: 'mira@example.com',
      shareRecipientKind: 'STUDENT_ACCOUNT',
      shareEmailLogId: 'mail-1',
      sharedByUserId: TEACHER.userId,
      shareStartedAt: null,
      lastShareError: null,
    });
    expect(db.report.sharedAt).toBeInstanceOf(Date);
  });

  it("sends to the family's billing contact when there is one", async () => {
    const { service, db, notifications } = setup(
      approved({
        student: {
          id: STUDENT.userId,
          fullName: 'Mira Rahman',
          avatarUrl: null,
          email: 'mira@example.com',
          billingContactEmail: ' parent@example.com ',
        },
      }),
    );
    await service.share('rep-1', TEACHER);
    expect(notifications.sendTestReportToParent.mock.calls[0][0]).toBe(
      'parent@example.com',
    );
    expect(db.report.shareRecipientKind).toBe('BILLING_CONTACT');
  });

  it('the email carries the real, final numbers', async () => {
    const { service, notifications } = setup(approved());
    await service.share('rep-1', TEACHER);
    const [, payload] = notifications.sendTestReportToParent.mock.calls[0];
    expect(payload).toMatchObject({
      reportId: 'rep-1',
      attempt: 1,
      studentName: 'Mira Rahman',
      teacherName: 'Ms Karim',
      percentage: 70,
      passed: true,
      total: 7,
      totalMax: 10,
      objective: { score: 7, max: 10 },
      coding: null,
    });
  });

  it('a failed send leaves the report READY_TO_SHARE and tells the teacher why', async () => {
    const { service, db, notifications } = setup(approved());
    notifications.sendTestReportToParent.mockResolvedValue({
      ok: false,
      logId: 'mail-2',
      error: 'Email delivery is not configured on this server.',
    });
    await expect(service.share('rep-1', TEACHER)).rejects.toThrow(
      BadGatewayException,
    );
    expect(db.report.status).toBe(TestReportStatus.READY_TO_SHARE);
    expect(db.report.sharedAt).toBeNull();
    expect(db.report.lastShareError).toMatch(/not configured/);
    expect(db.report.shareAttempts).toBe(1);
  });

  it('the error names the address that was NOT emailed', async () => {
    const { service, notifications } = setup(approved());
    notifications.sendTestReportToParent.mockResolvedValue({
      ok: false,
      error: '550 mailbox unavailable',
    });
    await expect(service.share('rep-1', TEACHER)).rejects.toThrow(
      /NOT sent to mira@example\.com: 550 mailbox unavailable/,
    );
  });

  it('a retry after a failure uses the next attempt number (a fresh message)', async () => {
    const { service, notifications } = setup(approved());
    notifications.sendTestReportToParent
      .mockResolvedValueOnce({ ok: false, error: '550 mailbox full' })
      .mockResolvedValueOnce({ ok: true, logId: 'mail-3' });
    await expect(service.share('rep-1', TEACHER)).rejects.toBeInstanceOf(
      BadGatewayException,
    );
    await service.share('rep-1', TEACHER);
    expect(
      notifications.sendTestReportToParent.mock.calls.map((c) => c[1].attempt),
    ).toEqual([1, 2]);
  });

  it('a second click while the first send is still in flight is refused', async () => {
    const { service, db, notifications } = setup(approved());
    let finish: (v: unknown) => void = () => undefined;
    notifications.sendTestReportToParent.mockReturnValue(
      new Promise((resolve) => (finish = resolve)),
    );
    const first = service.share('rep-1', TEACHER);
    await new Promise((r) => setImmediate(r)); // the first request is mid-send
    expect(db.report.shareStartedAt).toBeInstanceOf(Date);
    await expect(service.share('rep-1', TEACHER)).rejects.toBeInstanceOf(
      ConflictException,
    );
    const view = await service.get('rep-1', TEACHER);
    expect(view.share).toMatchObject({ sending: true, canShare: false });
    finish({ ok: true, logId: 'mail-1' });
    await first;
    expect(notifications.sendTestReportToParent).toHaveBeenCalledTimes(1);
    expect(db.report.status).toBe(TestReportStatus.SHARED_WITH_PARENTS);
    expect(db.report.shareStartedAt).toBeNull();
  });

  it('a definite failure releases the claim so the teacher can retry at once', async () => {
    const { service, db, notifications } = setup(approved());
    notifications.sendTestReportToParent.mockResolvedValue({
      ok: false,
      error: '550 rejected',
    });
    await expect(service.share('rep-1', TEACHER)).rejects.toBeInstanceOf(
      BadGatewayException,
    );
    expect(db.report.shareStartedAt).toBeNull();
    const view = await service.get('rep-1', TEACHER);
    expect(view.share).toMatchObject({ sending: false, canShare: true });
  });

  it('an unexpected error releases the claim too', async () => {
    const { service, db, notifications } = setup(approved());
    notifications.sendTestReportToParent.mockRejectedValue(new Error('boom'));
    await expect(service.share('rep-1', TEACHER)).rejects.toThrow('boom');
    expect(db.report.shareStartedAt).toBeNull();
  });

  describe('a send that timed out (it may still be delivered)', () => {
    afterEach(() => jest.useRealTimers());

    it('holds the claim so a second click cannot race it, until the claim expires', async () => {
      const { service, db, notifications } = setup(approved());
      notifications.sendTestReportToParent.mockResolvedValue({
        ok: false,
        pending: true,
        logId: 'mail-slow',
        error: 'The mail server did not answer in time.',
      });
      await expect(service.share('rep-1', TEACHER)).rejects.toBeInstanceOf(
        BadGatewayException,
      );
      expect(db.report.shareStartedAt).toBeInstanceOf(Date);
      expect(db.report.shareEmailLogId).toBe('mail-slow');

      // Right away: still counted as in flight.
      await expect(service.share('rep-1', TEACHER)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(notifications.sendTestReportToParent).toHaveBeenCalledTimes(1);

      // A minute later the claim is considered abandoned.
      jest.useFakeTimers({
        now: Date.now() + 61_000,
        doNotFake: ['setImmediate', 'nextTick'],
      });
      notifications.sendTestReportToParent.mockResolvedValue({
        ok: true,
        logId: 'mail-2',
      });
      await service.share('rep-1', TEACHER);
      expect(notifications.sendTestReportToParent).toHaveBeenCalledTimes(2);
      expect(db.report.status).toBe(TestReportStatus.SHARED_WITH_PARENTS);
    });
  });

  it('two clicks at once can never both send', async () => {
    const { service, prisma, notifications } = setup(approved());
    prisma.testReport.updateMany.mockResolvedValue({ count: 0 }); // lost the claim
    await expect(service.share('rep-1', TEACHER)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(notifications.sendTestReportToParent).not.toHaveBeenCalled();
  });

  it('a duplicate message is a conflict, not a success and not a bad gateway', async () => {
    const { service, db, notifications } = setup(approved());
    notifications.sendTestReportToParent.mockResolvedValue({
      ok: false,
      duplicate: true,
      error: 'This message was already sent.',
    });
    await expect(service.share('rep-1', TEACHER)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(db.report.status).toBe(TestReportStatus.READY_TO_SHARE);
  });

  it('sharing twice is refused', async () => {
    const { service, notifications } = setup(
      approved({ status: TestReportStatus.SHARED_WITH_PARENTS }),
    );
    await expect(service.share('rep-1', TEACHER)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(notifications.sendTestReportToParent).not.toHaveBeenCalled();
  });

  it('a send that timed out but was delivered later is promoted from the email journal', async () => {
    const { service, db, prisma } = setup(
      approved({ shareEmailLogId: 'mail-late', lastShareError: 'timed out' }),
    );
    prisma.emailLog.findUnique.mockResolvedValue({
      status: 'SENT',
      sentAt: new Date('2026-10-24T10:05:00.000Z'),
      lastError: null,
    });
    const detail = await service.get('rep-1', TEACHER);
    expect(db.report.status).toBe(TestReportStatus.SHARED_WITH_PARENTS);
    expect(db.report.sharedAt).toEqual(new Date('2026-10-24T10:05:00.000Z'));
    expect(detail.status).toBe(TestReportStatus.SHARED_WITH_PARENTS);
  });

  it('a still-failed journal row is NOT promoted', async () => {
    const { service, db, prisma } = setup(
      approved({ shareEmailLogId: 'mail-bad' }),
    );
    prisma.emailLog.findUnique.mockResolvedValue({
      status: 'FAILED',
      sentAt: null,
      lastError: 'rejected',
    });
    const detail = await service.get('rep-1', TEACHER);
    expect(db.report.status).toBe(TestReportStatus.READY_TO_SHARE);
    expect(detail.share.deliveryStatus).toBe('FAILED');
    expect(detail.share.lastError).toBe('rejected');
  });
});

describe('TestReportsService.get — what the teacher sees', () => {
  it('shows auto vs teacher-adjusted scores and who the parent email would go to', async () => {
    const results = Array.from({ length: 10 }, (_, i) =>
      result(`q${i}`, i < 7),
    );
    results[8] = {
      ...results[8],
      override: { correct: true, note: null, at: '2026-10-24T09:10:00.000Z' },
    };
    const { service } = setup(courseReport({ questionResults: results }));
    const d = await service.get('rep-1', TEACHER);
    expect(d.objective).toMatchObject({
      score: 8,
      autoScore: 7,
      overrides: 1,
      max: 10,
    });
    expect(d.share.recipient).toEqual({
      email: 'mira@example.com',
      kind: 'STUDENT_ACCOUNT',
    });
    expect(d.share.canShare).toBe(false); // not approved yet
    expect(d.coding).toBeNull();
  });

  it('a final test exposes the student code and the rubric to mark', async () => {
    const { service } = setup(finalReport());
    const d = await service.get('rep-1', TEACHER);
    expect(d.coding?.project?.code).toBe('print(1)');
    expect(d.coding?.hasCode).toBe(true);
    expect(d.coding?.rubric.map((r) => r.criterion)).toEqual([
      'Functions',
      'Calculations',
    ]);
    expect(d.totals.total).toBeNull();
  });
});
