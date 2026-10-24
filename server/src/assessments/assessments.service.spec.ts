import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  AttemptStatus,
  LessonStatus,
  QuestionKind,
  Role,
  SessionType,
  TestReportStatus,
} from '@prisma/client';
import { AssessmentsService } from './assessments.service';

// Security and lifecycle rules of the student test engine, against a mocked
// Prisma. The same flow runs end-to-end against a real Postgres in
// assessments.integration.spec.ts (row locks and unique constraints cannot be
// proven with a mock).

const STUDENT = 'stu-1';
const minutesFromNow = (m: number) => new Date(Date.now() + m * 60_000);

interface Row {
  [k: string]: any;
}

function assessmentRow(over: Row = {}): Row {
  return {
    id: 'asm-1',
    lessonId: 'lesson-1',
    isPublished: true,
    randomizeQuestions: true,
    randomizeOptions: true,
    sourceAssessmentId: null,
    ...over,
  };
}

function classRow(over: Row = {}): Row {
  return {
    id: 'sl-1',
    studentUserId: STUDENT,
    status: LessonStatus.UPCOMING,
    start: minutesFromNow(5),
    end: minutesFromNow(65),
    courseId: 'course-1',
    lessonNumber: 9,
    lessonId: 'lesson-1',
    ...over,
  };
}

function questionRow(id: string, kind: QuestionKind, over: Row = {}): Row {
  return {
    id,
    questionType: kind,
    questionText: `Question ${id}`,
    options:
      kind === QuestionKind.MCQ ? ['a', 'b', 'c', 'd'] : ['True', 'False'],
    correctIndex: 1,
    explanation: 'Because.',
    ...over,
  };
}

function setup() {
  const tx: any = {
    $queryRaw: jest.fn(),
    assessmentAttempt: {
      create: jest.fn(async ({ data }: Row) => ({ id: 'att-new', ...data })),
      updateMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
    mCQAnswer: {
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
    practicalQuestion: { findFirst: jest.fn().mockResolvedValue(null) },
    practicalSubmission: { upsert: jest.fn() },
    testReport: { create: jest.fn() },
    assessment: { findUnique: jest.fn() },
  };
  const prisma: any = {
    ...tx,
    assessment: { findUnique: jest.fn() },
    scheduledLesson: { findUnique: jest.fn() },
    lesson: { findFirst: jest.fn() },
    assessmentAttempt: {
      ...tx.assessmentAttempt,
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    mCQQuestion: { findMany: jest.fn() },
    practicalQuestion: { findMany: jest.fn().mockResolvedValue([]) },
    testReport: { findUnique: jest.fn().mockResolvedValue(null) },
    $transaction: jest.fn(async (fn: (t: unknown) => unknown) => fn(tx)),
  };
  const alerts = { create: jest.fn().mockResolvedValue({}) };
  const certificates = { checkAndIssueCertificate: jest.fn() };
  const service = new AssessmentsService(
    prisma,
    certificates as any,
    alerts as any,
  );
  return { service, prisma, tx, alerts };
}

describe('AssessmentsService.startAttempt', () => {
  function ready(over: { assessment?: Row; cls?: Row } = {}) {
    const ctx = setup();
    ctx.prisma.assessment.findUnique.mockResolvedValue(
      assessmentRow(over.assessment),
    );
    ctx.prisma.scheduledLesson.findUnique.mockResolvedValue(classRow(over.cls));
    ctx.prisma.assessmentAttempt.findUnique.mockResolvedValue(null);
    ctx.prisma.mCQQuestion.findMany.mockResolvedValue([
      questionRow('t1', QuestionKind.TRUE_FALSE),
      questionRow('m1', QuestionKind.MCQ),
      questionRow('m2', QuestionKind.MCQ),
      questionRow('m3', QuestionKind.MCQ),
      questionRow('t2', QuestionKind.TRUE_FALSE),
    ]);
    jest
      .spyOn(ctx.service, 'getAttempt')
      .mockResolvedValue({ id: 'att-new' } as never);
    return ctx;
  }

  it('rejects an unknown test', async () => {
    const { service, prisma } = ready();
    prisma.assessment.findUnique.mockResolvedValue(null);
    await expect(
      service.startAttempt('asm-1', STUDENT, 'sl-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("rejects another student's class", async () => {
    const { service } = ready({ cls: { studentUserId: 'someone-else' } });
    await expect(
      service.startAttempt('asm-1', STUDENT, 'sl-1'),
    ).rejects.toThrow(/not your class/);
  });

  it('rejects a class that does not carry this test (no starting any test from any class)', async () => {
    const { service } = ready({ cls: { lessonId: 'a-different-lesson' } });
    await expect(
      service.startAttempt('asm-1', STUDENT, 'sl-1'),
    ).rejects.toThrow(/does not belong to this class/);
  });

  it('finds the class lesson by course and session number when the class has no lessonId', async () => {
    const { service, prisma } = ready({ cls: { lessonId: null } });
    prisma.lesson.findFirst.mockResolvedValue({ id: 'lesson-1' });
    await service.startAttempt('asm-1', STUDENT, 'sl-1');
    expect(prisma.lesson.findFirst).toHaveBeenCalledWith({
      where: { courseId: 'course-1', order: 9 },
      select: { id: true },
    });
  });

  it('resumes an existing attempt even if the class has ended or the test was unpublished', async () => {
    const { service, prisma } = ready({
      assessment: { isPublished: false },
      cls: { status: LessonStatus.COMPLETED },
    });
    prisma.assessmentAttempt.findUnique.mockResolvedValue({ id: 'att-old' });
    await service.startAttempt('asm-1', STUDENT, 'sl-1');
    expect(service.getAttempt).toHaveBeenCalledWith('att-old', {
      userId: STUDENT,
      role: Role.STUDENT,
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('will not start a new attempt on an unpublished test', async () => {
    const { service } = ready({ assessment: { isPublished: false } });
    await expect(
      service.startAttempt('asm-1', STUDENT, 'sl-1'),
    ).rejects.toThrow(/not been published/);
  });

  it.each([LessonStatus.COMPLETED, LessonStatus.CANCELLED])(
    'will not start a new attempt once the class is %s',
    async (status) => {
      const { service } = ready({ cls: { status } });
      await expect(
        service.startAttempt('asm-1', STUDENT, 'sl-1'),
      ).rejects.toThrow(/class has ended/);
    },
  );

  it('opens 10 minutes before the class starts, not earlier', async () => {
    const early = ready({
      cls: { start: minutesFromNow(120), end: minutesFromNow(180) },
    });
    await expect(
      early.service.startAttempt('asm-1', STUDENT, 'sl-1'),
    ).rejects.toThrow(/opens 10 minutes before/);

    const ok = ready({ cls: { start: minutesFromNow(8) } });
    await expect(
      ok.service.startAttempt('asm-1', STUDENT, 'sl-1'),
    ).resolves.toBeDefined();
  });

  it('refuses a test with no questions', async () => {
    const { service, prisma } = ready();
    prisma.mCQQuestion.findMany.mockResolvedValue([]);
    await expect(
      service.startAttempt('asm-1', STUDENT, 'sl-1'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('serves the whole published bank: multiple-choice first, then True/False', async () => {
    const { service, tx } = ready();
    await service.startAttempt('asm-1', STUDENT, 'sl-1');
    const created = tx.assessmentAttempt.create.mock.calls[0][0].data;
    expect(created).toMatchObject({
      assessmentId: 'asm-1',
      studentUserId: STUDENT,
      scheduledLessonId: 'sl-1',
      status: AttemptStatus.IN_PROGRESS,
      mcqMaxScore: 5, // one mark per question
    });
    const ids: string[] = created.mcqQuestionIds;
    expect(ids).toHaveLength(5);
    expect(ids.slice(0, 3).sort()).toEqual(['m1', 'm2', 'm3']);
    expect(ids.slice(3).sort()).toEqual(['t1', 't2']);
  });

  it('shuffles the options of multiple-choice questions only, and never True/False', async () => {
    const { service, tx } = ready();
    await service.startAttempt('asm-1', STUDENT, 'sl-1');
    const rows = tx.mCQAnswer.createMany.mock.calls[0][0].data as Row[];
    expect(rows).toHaveLength(5);
    for (const r of rows) {
      const isTf = r.questionId.startsWith('t');
      expect([...r.optionOrder].sort()).toEqual(isTf ? [0, 1] : [0, 1, 2, 3]);
      if (isTf) expect(r.optionOrder).toEqual([0, 1]);
    }
  });

  it('keeps the stored order when option shuffling is switched off', async () => {
    const { service, tx } = ready({
      assessment: { randomizeOptions: false, randomizeQuestions: false },
    });
    await service.startAttempt('asm-1', STUDENT, 'sl-1');
    const rows = tx.mCQAnswer.createMany.mock.calls[0][0].data as Row[];
    expect(
      rows.every(
        (r) =>
          r.optionOrder.join() === [0, 1, 2, 3].join() ||
          r.optionOrder.join() === '0,1',
      ),
    ).toBe(true);
    expect(
      tx.assessmentAttempt.create.mock.calls[0][0].data.mcqQuestionIds,
    ).toEqual(['m1', 'm2', 'm3', 't1', 't2']);
  });

  it("a custom course's linked test reads the questions of the ORIGINAL bank", async () => {
    const { service, prisma } = ready({
      assessment: { sourceAssessmentId: 'bank-root' },
    });
    await service.startAttempt('asm-1', STUDENT, 'sl-1');
    expect(prisma.mCQQuestion.findMany.mock.calls[0][0].where).toEqual({
      assessmentId: 'bank-root',
      isPublished: true,
    });
  });

  it('sums the coding project marks into the attempt (Final Test)', async () => {
    const { service, prisma, tx } = ready();
    prisma.practicalQuestion.findMany.mockResolvedValue([
      { id: 'p1', maxScore: 20 },
    ]);
    await service.startAttempt('asm-1', STUDENT, 'sl-1');
    expect(
      tx.assessmentAttempt.create.mock.calls[0][0].data.practicalMaxScore,
    ).toBe(20);
  });

  it('two tabs starting at once end up on the same attempt', async () => {
    const { service, prisma, tx } = ready();
    tx.assessmentAttempt.create.mockRejectedValue({ code: 'P2002' });
    prisma.assessmentAttempt.findUnique
      .mockResolvedValueOnce(null) // the "already started?" check
      .mockResolvedValueOnce({ id: 'att-winner' }); // after losing the race
    await service.startAttempt('asm-1', STUDENT, 'sl-1');
    expect(service.getAttempt).toHaveBeenCalledWith('att-winner', {
      userId: STUDENT,
      role: Role.STUDENT,
    });
  });

  it('does not swallow unexpected database errors', async () => {
    const { service, tx } = ready();
    tx.assessmentAttempt.create.mockRejectedValue(new Error('db down'));
    await expect(
      service.startAttempt('asm-1', STUDENT, 'sl-1'),
    ).rejects.toThrow('db down');
  });
});

describe('AssessmentsService.getAttempt — who sees what', () => {
  function attemptRow(over: Row = {}): Row {
    return {
      id: 'att-1',
      status: AttemptStatus.IN_PROGRESS,
      studentUserId: STUDENT,
      assessment: {
        id: 'asm-1',
        type: SessionType.COURSE_TEST,
        title: 'Course Test',
        instructions: 'Answer everything.',
        passScorePct: 70,
        sourceAssessmentId: null,
        lesson: {
          courseId: 'course-1',
          title: 'Test lesson',
          course: { title: 'Python' },
        },
      },
      mcqQuestionIds: ['q1', 'q2'],
      mcqAnswers: [
        {
          questionId: 'q1',
          // shown as: c, a, b, d
          optionOrder: [2, 0, 1, 3],
          selectedIndex: 1, // canonical "b" (the right answer)
          isCorrect: true,
          question: questionRow('q1', QuestionKind.MCQ, { correctIndex: 1 }),
        },
        {
          questionId: 'q2',
          optionOrder: [0, 1],
          selectedIndex: null,
          isCorrect: false,
          question: questionRow('q2', QuestionKind.TRUE_FALSE, {
            correctIndex: 0,
          }),
        },
      ],
      practicalSubmissions: [],
      student: {
        id: STUDENT,
        fullName: 'Mira Rahman',
        assignedTeacher: { userId: 'tch-assigned' },
      },
      scheduledLesson: { teacher: { userId: 'tch-class' } },
      report: null,
      startedAt: new Date('2026-10-24T09:00:00.000Z'),
      submittedAt: null,
      gradedAt: null,
      ...over,
    };
  }

  function view(row: Row) {
    const ctx = setup();
    ctx.prisma.assessmentAttempt.findUnique.mockResolvedValue(row);
    return ctx;
  }

  const report = (over: Row = {}): Row => ({
    id: 'rep-1',
    status: TestReportStatus.PENDING_REVIEW,
    objectiveScore: 1,
    objectiveMaxScore: 2,
    autoObjectiveScore: 1,
    mcqTotal: 1,
    trueFalseTotal: 1,
    hasCodingProject: false,
    codingScore: null,
    codingMaxScore: null,
    codingFeedback: null,
    codingRubricScores: null,
    totalScore: 1,
    totalMaxScore: 2,
    percentage: 50,
    passed: false,
    passScorePct: 70,
    feedback: null,
    strengths: null,
    improvements: null,
    approvedAt: null,
    questionResults: [],
    ...over,
  });

  it('only the student, their teachers and admins may open an attempt', async () => {
    const { service } = view(attemptRow());
    for (const who of [
      { userId: STUDENT, role: Role.STUDENT },
      { userId: 'tch-class', role: Role.TEACHER },
      { userId: 'tch-assigned', role: Role.TEACHER },
      { userId: 'adm', role: Role.ADMIN },
    ])
      await expect(service.getAttempt('att-1', who)).resolves.toBeDefined();

    for (const who of [
      { userId: 'other-student', role: Role.STUDENT },
      { userId: 'other-teacher', role: Role.TEACHER },
      // A teacher who merely teaches someone else in the same course.
      { userId: 'tch-elsewhere', role: Role.TEACHER },
    ])
      await expect(service.getAttempt('att-1', who)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
  });

  it('a missing attempt is not found', async () => {
    const { service, prisma } = view(attemptRow());
    prisma.assessmentAttempt.findUnique.mockResolvedValue(null);
    await expect(
      service.getAttempt('nope', { userId: STUDENT, role: Role.STUDENT }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('a student mid-test never receives the answer key or explanations', async () => {
    const { service } = view(attemptRow());
    const a = await service.getAttempt('att-1', {
      userId: STUDENT,
      role: Role.STUDENT,
    });
    const json = JSON.stringify(a);
    expect(json).not.toContain('correctIndex');
    expect(json).not.toContain('isCorrect');
    expect(json).not.toContain('explanation');
    expect(json).not.toContain('Because.');
    expect(a.result).toBeNull();
  });

  it("shows options in the student's own shuffled order and maps the saved answer onto it", async () => {
    const { service } = view(attemptRow());
    const a = await service.getAttempt('att-1', {
      userId: STUDENT,
      role: Role.STUDENT,
    });
    const [q1, q2] = a.questions as Row[];
    expect(q1.options).toEqual(['c', 'a', 'b', 'd']);
    expect(q1.selectedIndex).toBe(2); // canonical "b" sits at position 2
    expect(q2.options).toEqual(['True', 'False']);
    expect(q2.selectedIndex).toBeNull();
    expect(a.answeredCount).toBe(1);
    expect(a.assessment).toMatchObject({
      questionCount: 2,
      mcqCount: 1,
      trueFalseCount: 1,
      totalMarks: 2,
    });
  });

  it('after submitting, the student still gets no score until the teacher approves', async () => {
    const { service } = view(
      attemptRow({
        status: AttemptStatus.SUBMITTED,
        submittedAt: new Date(),
        report: report(),
      }),
    );
    const a = await service.getAttempt('att-1', {
      userId: STUDENT,
      role: Role.STUDENT,
    });
    expect(a.released).toBe(false);
    expect(a.result).toBeNull();
    expect(JSON.stringify(a)).not.toContain('correctIndex');
    expect(a.report).toEqual({ id: 'rep-1', status: 'PENDING_REVIEW' });
  });

  it('a released result is read from the frozen report, including teacher overrides', async () => {
    const frozen = [
      {
        questionId: 'q1',
        order: 1,
        kind: 'MCQ',
        text: 'Question q1',
        options: ['c', 'a', 'b', 'd'],
        selectedIndex: 0,
        correctIndex: 2,
        autoCorrect: false,
        explanation: 'Because.',
        override: { correct: true, note: null, at: '2026-10-24T10:00:00Z' },
      },
    ];
    const { service } = view(
      attemptRow({
        status: AttemptStatus.GRADED,
        report: report({
          status: TestReportStatus.READY_TO_SHARE,
          questionResults: frozen,
          approvedAt: new Date('2026-10-24T10:00:00.000Z'),
          percentage: 100,
          passed: true,
        }),
      }),
    );
    const a = await service.getAttempt('att-1', {
      userId: STUDENT,
      role: Role.STUDENT,
    });
    expect(a.released).toBe(true);
    const q = (a.questions as Row[])[0];
    expect(q).toMatchObject({
      selectedIndex: 0,
      correctIndex: 2,
      isCorrect: true, // the teacher's override, not the automatic result
    });
    expect(a.result).toMatchObject({ percentage: 100, passed: true });
    // The automatic score is for teachers; the student sees only the final one.
    expect(JSON.stringify(a.result)).not.toContain('autoScore');
  });

  describe('the coding project’s marking guide', () => {
    const project = {
      id: 'p1',
      title: 'Check a Prediction Model',
      instructions: 'Spend about 15 minutes.',
      language: 'python',
      starterCode: '# start here',
      maxScore: 20,
      rubric: [
        { criterion: 'Works', maxPoints: 12, lookFor: 'The MSE is 5.0' },
        { criterion: 'Clear', maxPoints: 8, lookFor: 'Names are meaningful' },
      ],
    };
    const student = { userId: STUDENT, role: Role.STUDENT };

    it('is never sent to the student, who still sees the criteria and marks', async () => {
      const { service, prisma } = view(attemptRow());
      prisma.practicalQuestion.findMany.mockResolvedValue([project]);
      const a = await service.getAttempt('att-1', student);
      expect(a.codingProject?.rubric).toEqual([
        { criterion: 'Works', maxPoints: 12 },
        { criterion: 'Clear', maxPoints: 8 },
      ]);
      expect(JSON.stringify(a)).not.toContain('MSE is 5.0');
    });

    it('is still available to the teacher', async () => {
      const { service, prisma } = view(attemptRow());
      prisma.practicalQuestion.findMany.mockResolvedValue([project]);
      const a = await service.getAttempt('att-1', {
        userId: 'tch-class',
        role: Role.TEACHER,
      });
      expect(a.codingProject?.rubric[0]).toMatchObject({
        lookFor: 'The MSE is 5.0',
      });
    });

    it('stays hidden in the released result, which keeps the marks and the teacher’s feedback', async () => {
      const { service, prisma } = view(
        attemptRow({
          status: AttemptStatus.GRADED,
          report: report({
            status: TestReportStatus.READY_TO_SHARE,
            hasCodingProject: true,
            codingScore: 15,
            codingMaxScore: 20,
            codingFeedback: 'Nice work on the functions.',
            codingRubricScores: [
              {
                criterion: 'Works',
                maxPoints: 12,
                score: 10,
                lookFor: 'The MSE is 5.0',
              },
              {
                criterion: 'Clear',
                maxPoints: 8,
                score: 5,
                lookFor: 'Names are meaningful',
              },
            ],
            approvedAt: new Date(),
          }),
        }),
      );
      prisma.practicalQuestion.findMany.mockResolvedValue([project]);
      const a = await service.getAttempt('att-1', student);
      const coding = (a.result as Row).coding;
      expect(coding.rubric).toEqual([
        { criterion: 'Works', maxPoints: 12, score: 10 },
        { criterion: 'Clear', maxPoints: 8, score: 5 },
      ]);
      expect(coding.feedback).toBe('Nice work on the functions.');
      expect(JSON.stringify(a)).not.toContain('MSE is 5.0');
    });
  });

  it('an attempt graded before report cards existed still shows the result it was given', async () => {
    const { service } = view(
      attemptRow({
        status: AttemptStatus.GRADED,
        report: null,
        mcqScore: 2,
        mcqMaxScore: 3,
        totalScore: 66.7,
        totalMaxScore: 100,
        passed: true,
        gradedAt: new Date('2026-01-05T10:00:00.000Z'),
      }),
    );
    const a = await service.getAttempt('att-1', {
      userId: STUDENT,
      role: Role.STUDENT,
    });
    expect(a.released).toBe(true);
    expect(a.result).toMatchObject({
      percentage: 66.7,
      total: 66.7,
      totalMax: 100,
      passed: true,
      passScorePct: 70,
      objective: { score: 2, max: 3, mcqTotal: 1, trueFalseTotal: 1 },
      coding: null,
    });
  });

  it('a graded attempt with neither a report nor scores shows no result rather than a made-up one', async () => {
    const { service } = view(
      attemptRow({
        status: AttemptStatus.GRADED,
        report: null,
        totalScore: null,
      }),
    );
    const a = await service.getAttempt('att-1', {
      userId: STUDENT,
      role: Role.STUDENT,
    });
    expect(a.result).toBeNull();
  });

  it('a teacher sees the answers and the automatic score at any time', async () => {
    const { service } = view(
      attemptRow({
        status: AttemptStatus.SUBMITTED,
        report: report(),
      }),
    );
    const a = await service.getAttempt('att-1', {
      userId: 'tch-class',
      role: Role.TEACHER,
    });
    const [q1] = a.questions as Row[];
    expect(q1.correctIndex).toBe(2); // canonical option 1 is shown third
    expect(q1.isCorrect).toBe(true);
    expect(q1.explanation).toBe('Because.');
    expect((a.result as Row).objective.autoScore).toBe(1);
  });
});

describe('AssessmentsService.saveAnswer / saveCode', () => {
  function editable(over: { row?: Row | null; answer?: Row | null } = {}) {
    const ctx = setup();
    ctx.tx.$queryRaw.mockResolvedValue(
      over.row === null
        ? []
        : [
            {
              studentUserId: STUDENT,
              status: AttemptStatus.IN_PROGRESS,
              assessmentId: 'asm-1',
              ...over.row,
            },
          ],
    );
    ctx.tx.mCQAnswer.findUnique.mockResolvedValue(
      over.answer === undefined
        ? {
            id: 'ans-1',
            optionOrder: [2, 0, 1, 3],
            question: { options: ['a', 'b', 'c', 'd'], correctIndex: 1 },
          }
        : over.answer,
    );
    return ctx;
  }

  it('saves the answer against the canonical option, however the options were shuffled', async () => {
    const { service, tx } = editable();
    // Display order is c, a, b, d. Position 2 is "b" — the right answer.
    await service.saveAnswer(
      'att-1',
      { questionId: 'q1', selectedIndex: 2 },
      STUDENT,
    );
    expect(tx.mCQAnswer.update).toHaveBeenCalledWith({
      where: { id: 'ans-1' },
      data: expect.objectContaining({ selectedIndex: 1, isCorrect: true }),
    });
    // Position 0 is "c" — wrong.
    await service.saveAnswer(
      'att-1',
      { questionId: 'q1', selectedIndex: 0 },
      STUDENT,
    );
    expect(tx.mCQAnswer.update).toHaveBeenLastCalledWith({
      where: { id: 'ans-1' },
      data: expect.objectContaining({ selectedIndex: 2, isCorrect: false }),
    });
  });

  it('clearing an answer stores nothing', async () => {
    const { service, tx } = editable();
    await service.saveAnswer(
      'att-1',
      { questionId: 'q1', selectedIndex: null },
      STUDENT,
    );
    expect(tx.mCQAnswer.update).toHaveBeenCalledWith({
      where: { id: 'ans-1' },
      data: expect.objectContaining({ selectedIndex: null, isCorrect: false }),
    });
  });

  it('rejects a choice outside the listed answers', async () => {
    const { service, tx } = editable();
    for (const selectedIndex of [4, -1, 1.5]) {
      await expect(
        service.saveAnswer(
          'att-1',
          { questionId: 'q1', selectedIndex },
          STUDENT,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    }
    expect(tx.mCQAnswer.update).not.toHaveBeenCalled();
  });

  it('rejects a question that is not part of this attempt', async () => {
    const { service } = editable({ answer: null });
    await expect(
      service.saveAnswer(
        'att-1',
        { questionId: 'foreign', selectedIndex: 0 },
        STUDENT,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("will not save into someone else's attempt", async () => {
    const { service, tx } = editable({ row: { studentUserId: 'other' } });
    await expect(
      service.saveAnswer(
        'att-1',
        { questionId: 'q1', selectedIndex: 0 },
        STUDENT,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(tx.mCQAnswer.update).not.toHaveBeenCalled();
  });

  it.each([
    AttemptStatus.SUBMITTED,
    AttemptStatus.GRADED,
    AttemptStatus.NOT_STARTED,
  ])('refuses changes once the attempt is %s', async (status) => {
    const { service, tx } = editable({ row: { status } });
    await expect(
      service.saveAnswer(
        'att-1',
        { questionId: 'q1', selectedIndex: 0 },
        STUDENT,
      ),
    ).rejects.toThrow(/already been submitted/);
    expect(tx.mCQAnswer.update).not.toHaveBeenCalled();
  });

  it('an unknown attempt is not found', async () => {
    const { service } = editable({ row: null });
    await expect(
      service.saveAnswer(
        'nope',
        { questionId: 'q1', selectedIndex: 0 },
        STUDENT,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  describe('saveCode', () => {
    it('saves code for the test’s own coding project', async () => {
      const { service, tx } = editable();
      tx.assessment.findUnique.mockResolvedValue({
        id: 'asm-1',
        sourceAssessmentId: null,
      });
      tx.practicalQuestion = {
        findUnique: jest.fn().mockResolvedValue({ assessmentId: 'asm-1' }),
      };
      tx.practicalSubmission.upsert.mockResolvedValue({
        updatedAt: new Date('2026-10-24T09:10:00.000Z'),
      });
      const out = await service.saveCode(
        'att-1',
        { questionId: 'p1', code: 'print(1)' },
        STUDENT,
      );
      expect(out.saved).toBe(true);
      expect(tx.practicalSubmission.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: { attemptId: 'att-1', questionId: 'p1', code: 'print(1)' },
          update: { code: 'print(1)' },
        }),
      );
    });

    it("rejects a project that belongs to a different test's bank", async () => {
      const { service, tx } = editable();
      tx.assessment.findUnique.mockResolvedValue({
        id: 'asm-1',
        sourceAssessmentId: 'bank-root',
      });
      tx.practicalQuestion = {
        findUnique: jest.fn().mockResolvedValue({ assessmentId: 'some-other' }),
      };
      await expect(
        service.saveCode('att-1', { questionId: 'p9', code: 'x' }, STUDENT),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(tx.practicalSubmission.upsert).not.toHaveBeenCalled();
    });

    it('accepts a project that lives on the linked ROOT bank', async () => {
      const { service, tx } = editable();
      tx.assessment.findUnique.mockResolvedValue({
        id: 'asm-1',
        sourceAssessmentId: 'bank-root',
      });
      tx.practicalQuestion = {
        findUnique: jest.fn().mockResolvedValue({ assessmentId: 'bank-root' }),
      };
      tx.practicalSubmission.upsert.mockResolvedValue({
        updatedAt: new Date(),
      });
      await expect(
        service.saveCode('att-1', { questionId: 'p1', code: 'x' }, STUDENT),
      ).resolves.toMatchObject({ saved: true });
    });

    it('refuses code after the lock-in', async () => {
      const { service } = editable({
        row: { status: AttemptStatus.SUBMITTED },
      });
      await expect(
        service.saveCode('att-1', { questionId: 'p1', code: 'x' }, STUDENT),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });
});

describe('AssessmentsService.submitAttempt', () => {
  function submittable(over: { pre?: Row | null } = {}) {
    const ctx = setup();
    ctx.prisma.assessmentAttempt.findUnique.mockResolvedValue(
      over.pre === undefined
        ? { studentUserId: STUDENT, status: AttemptStatus.IN_PROGRESS }
        : over.pre,
    );
    ctx.prisma.assessmentAttempt.findUniqueOrThrow.mockResolvedValue({
      id: 'att-1',
      status: AttemptStatus.SUBMITTED,
      submittedAt: new Date(),
      report: { id: 'rep-1', status: 'PENDING_REVIEW' },
    });
    ctx.tx.assessmentAttempt.updateMany.mockResolvedValue({ count: 1 });
    ctx.tx.assessmentAttempt.findUniqueOrThrow.mockResolvedValue({
      id: 'att-1',
      mcqQuestionIds: ['q1', 'q2'],
      assessment: {
        id: 'asm-1',
        type: SessionType.COURSE_TEST,
        title: 'Course Test',
        passScorePct: 70,
        sourceAssessmentId: null,
        lessonId: 'lesson-1',
        lesson: { courseId: 'course-1', course: { title: 'Python' } },
      },
      mcqAnswers: [
        {
          id: 'a1',
          questionId: 'q1',
          optionOrder: [0, 1, 2, 3],
          selectedIndex: 1,
          question: questionRow('q1', QuestionKind.MCQ, { correctIndex: 1 }),
        },
        {
          id: 'a2',
          questionId: 'q2',
          optionOrder: [0, 1],
          selectedIndex: null,
          question: questionRow('q2', QuestionKind.TRUE_FALSE, {
            correctIndex: 0,
          }),
        },
      ],
      practicalSubmissions: [],
      scheduledLesson: { id: 'sl-1', teacherId: 'tp-1' },
      student: { assignedTeacherId: null },
    });
    ctx.tx.testReport.create.mockImplementation(async ({ data }: Row) => ({
      id: 'rep-1',
      ...data,
    }));
    ctx.prisma.testReport.findUnique.mockResolvedValue({
      id: 'rep-1',
      testTitle: 'Course Test',
      courseTitle: 'Python',
      hasCodingProject: false,
      student: { fullName: 'Mira Rahman' },
      teacher: { userId: 'user-teacher' },
    });
    return ctx;
  }

  it('an unknown attempt is not found, and a foreign attempt is forbidden', async () => {
    await expect(
      submittable({ pre: null }).service.submitAttempt('x', STUDENT),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      submittable({
        pre: { studentUserId: 'other', status: AttemptStatus.IN_PROGRESS },
      }).service.submitAttempt('x', STUDENT),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it.each([AttemptStatus.SUBMITTED, AttemptStatus.GRADED])(
    'submitting an already %s attempt is a harmless no-op',
    async (status) => {
      const { service, prisma, tx } = submittable({
        pre: { studentUserId: STUDENT, status },
      });
      const out = await service.submitAttempt('att-1', STUDENT);
      expect(out.alreadySubmitted).toBe(true);
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(tx.testReport.create).not.toHaveBeenCalled();
    },
  );

  it('losing the lock-in race to another request creates no second report', async () => {
    const { service, tx } = submittable();
    tx.assessmentAttempt.updateMany.mockResolvedValue({ count: 0 });
    const out = await service.submitAttempt('att-1', STUDENT);
    expect(out.alreadySubmitted).toBe(true);
    expect(tx.testReport.create).not.toHaveBeenCalled();
  });

  it('locks in, grades the objective part and creates the report in one transaction', async () => {
    const { service, prisma, tx, alerts } = submittable();
    const out = await service.submitAttempt('att-1', STUDENT);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.assessmentAttempt.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'att-1',
        studentUserId: STUDENT,
        status: AttemptStatus.IN_PROGRESS,
      },
      data: expect.objectContaining({ status: AttemptStatus.SUBMITTED }),
    });
    const report = tx.testReport.create.mock.calls[0][0].data;
    expect(report).toMatchObject({
      attemptId: 'att-1',
      studentUserId: STUDENT,
      teacherId: 'tp-1',
      status: TestReportStatus.PENDING_REVIEW,
      objectiveScore: 1, // q1 right; q2 unanswered
      objectiveMaxScore: 2,
      percentage: 50,
      passed: false,
    });
    expect(tx.assessmentAttempt.update).toHaveBeenCalledWith({
      where: { id: 'att-1' },
      data: expect.objectContaining({ mcqScore: 1, mcqMaxScore: 2 }),
    });
    expect(out).toMatchObject({ alreadySubmitted: false });

    await new Promise((r) => setImmediate(r));
    expect(alerts.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-teacher',
        type: 'TEST_SUBMITTED',
      }),
    );
  });

  it('applies the answers sent with the submit (display positions → canonical)', async () => {
    const { service, tx } = submittable();
    // q2 (True/False) answered "False" in the final payload.
    await service.submitAttempt('att-1', STUDENT, {
      answers: [{ questionId: 'q2', selectedIndex: 1 }],
    });
    expect(tx.mCQAnswer.update).toHaveBeenCalledWith({
      where: { id: 'a2' },
      data: expect.objectContaining({ selectedIndex: 1, isCorrect: false }),
    });
    const report = tx.testReport.create.mock.calls[0][0].data;
    expect(report.objectiveScore).toBe(1);
  });

  it('a payload answer can fix a lost autosave', async () => {
    const { service, tx } = submittable();
    await service.submitAttempt('att-1', STUDENT, {
      answers: [{ questionId: 'q2', selectedIndex: 0 }], // True — correct
    });
    expect(tx.testReport.create.mock.calls[0][0].data.objectiveScore).toBe(2);
  });

  it('rejects an answer for a question that is not part of the test', async () => {
    const { service, tx } = submittable();
    await expect(
      service.submitAttempt('att-1', STUDENT, {
        answers: [{ questionId: 'foreign', selectedIndex: 0 }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.testReport.create).not.toHaveBeenCalled();
  });

  it('rejects a choice outside the listed answers', async () => {
    const { service } = submittable();
    await expect(
      service.submitAttempt('att-1', STUDENT, {
        answers: [{ questionId: 'q2', selectedIndex: 7 }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('cannot be submitted when nobody is assigned to evaluate it', async () => {
    const { service, tx } = submittable();
    tx.assessmentAttempt.findUniqueOrThrow.mockResolvedValue({
      ...(await tx.assessmentAttempt.findUniqueOrThrow()),
      scheduledLesson: { id: 'sl-1', teacherId: null },
      student: { assignedTeacherId: null },
    });
    await expect(service.submitAttempt('att-1', STUDENT)).rejects.toThrow(
      /No teacher is assigned/,
    );
    expect(tx.testReport.create).not.toHaveBeenCalled();
  });

  it('falls back to the student’s assigned teacher when the class has none', async () => {
    const { service, tx } = submittable();
    tx.assessmentAttempt.findUniqueOrThrow.mockResolvedValue({
      ...(await tx.assessmentAttempt.findUniqueOrThrow()),
      scheduledLesson: { id: 'sl-1', teacherId: null },
      student: { assignedTeacherId: 'tp-assigned' },
    });
    await service.submitAttempt('att-1', STUDENT);
    expect(tx.testReport.create.mock.calls[0][0].data.teacherId).toBe(
      'tp-assigned',
    );
  });

  describe('Final Test with a coding project', () => {
    function finalSubmittable() {
      const ctx = submittable();
      ctx.tx.practicalQuestion.findFirst.mockResolvedValue({
        id: 'p1',
        title: 'Project',
        instructions: 'Do the thing in 15 minutes.',
        language: 'python',
        maxScore: 20,
        rubric: [
          { criterion: 'Works', maxPoints: 12, lookFor: 'runs correctly' },
          { criterion: 'Clear', maxPoints: 8, lookFor: 'clear names' },
        ],
      });
      ctx.tx.practicalSubmission.upsert.mockImplementation(
        async ({ create }: Row) => ({
          ...create,
          updatedAt: new Date('2026-10-24T09:40:00.000Z'),
        }),
      );
      return ctx;
    }

    it('stores the final code on the report and waits for the teacher’s marks', async () => {
      const { service, tx } = finalSubmittable();
      await service.submitAttempt('att-1', STUDENT, {
        practical: [{ questionId: 'p1', code: 'print("hi")' }],
      });
      const report = tx.testReport.create.mock.calls[0][0].data;
      expect(report.status).toBe(TestReportStatus.PENDING_CODE_EVALUATION);
      expect(report.hasCodingProject).toBe(true);
      expect(report.codingProject.code).toBe('print("hi")');
      expect(report.totalScore).toBeNull();
      expect(report.passed).toBeNull();
      expect(tx.assessmentAttempt.update).toHaveBeenCalledWith({
        where: { id: 'att-1' },
        data: expect.objectContaining({ practicalMaxScore: 20 }),
      });
    });

    it('rejects code for a project that is not part of this test', async () => {
      const { service } = finalSubmittable();
      await expect(
        service.submitAttempt('att-1', STUDENT, {
          practical: [{ questionId: 'someone-elses', code: 'x' }],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects code that is too long', async () => {
      const { service } = finalSubmittable();
      await expect(
        service.submitAttempt('att-1', STUDENT, {
          practical: [{ questionId: 'p1', code: 'x'.repeat(20_001) }],
        }),
      ).rejects.toThrow(/too long/);
    });

    it('submits with whatever was autosaved when no code is sent', async () => {
      const { service, tx } = finalSubmittable();
      tx.assessmentAttempt.findUniqueOrThrow.mockResolvedValue({
        ...(await tx.assessmentAttempt.findUniqueOrThrow()),
        practicalSubmissions: [
          {
            questionId: 'p1',
            code: 'autosaved()',
            updatedAt: new Date('2026-10-24T09:30:00.000Z'),
          },
        ],
      });
      await service.submitAttempt('att-1', STUDENT);
      expect(tx.practicalSubmission.upsert).not.toHaveBeenCalled();
      expect(
        tx.testReport.create.mock.calls[0][0].data.codingProject.code,
      ).toBe('autosaved()');
    });
  });
});

describe('AssessmentsService — results listings', () => {
  const attempts = [
    {
      id: 'a-graded',
      status: AttemptStatus.GRADED,
      passed: true,
      totalScore: 80,
      report: { id: 'r1', status: 'READY_TO_SHARE', percentage: 80 },
    },
    {
      id: 'a-waiting',
      status: AttemptStatus.SUBMITTED,
      passed: null,
      totalScore: null,
      report: { id: 'r2', status: 'PENDING_REVIEW', percentage: 55 },
    },
  ];

  it('a student does not see the automatic score of a report the teacher has not approved', async () => {
    const { service, prisma } = setup();
    prisma.assessmentAttempt.findMany = jest.fn().mockResolvedValue(attempts);
    const list = (await service.listAttemptsForStudent(STUDENT, {
      userId: STUDENT,
      role: Role.STUDENT,
    })) as Row[];
    expect(list.find((a) => a.id === 'a-graded')!.report.percentage).toBe(80);
    const waiting = list.find((a) => a.id === 'a-waiting')!;
    expect(waiting.report).toBeNull();
    expect(JSON.stringify(waiting)).not.toContain('55');
  });

  it('a teacher sees every report', async () => {
    const { service, prisma } = setup();
    prisma.user = { findFirst: jest.fn().mockResolvedValue({ id: STUDENT }) };
    prisma.assessmentAttempt.findMany = jest.fn().mockResolvedValue(attempts);
    const list = (await service.listAttemptsForStudent(STUDENT, {
      userId: 'tch',
      role: Role.TEACHER,
    })) as Row[];
    expect(list.find((a) => a.id === 'a-waiting')!.report.percentage).toBe(55);
  });

  it('a student cannot list someone else’s attempts, nor a teacher a stranger’s', async () => {
    const { service, prisma } = setup();
    await expect(
      service.listAttemptsForStudent(STUDENT, {
        userId: 'other',
        role: Role.STUDENT,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    prisma.user = { findFirst: jest.fn().mockResolvedValue(null) };
    await expect(
      service.listAttemptsForStudent(STUDENT, {
        userId: 'tch',
        role: Role.TEACHER,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('AssessmentsService — class test status', () => {
  function status(requester: { userId: string; role: Role }) {
    const ctx = setup();
    ctx.prisma.scheduledLesson.findUnique.mockResolvedValue({
      id: 'sl-1',
      studentUserId: STUDENT,
      status: LessonStatus.UPCOMING,
      teacher: { userId: 'tch-class' },
      student: {
        fullName: 'Mira',
        assignedTeacher: { userId: 'tch-assigned' },
      },
      lesson: null,
      assessmentAttempt: {
        id: 'att-1',
        status: AttemptStatus.SUBMITTED,
        startedAt: new Date(),
        submittedAt: new Date(),
        mcqQuestionIds: ['q1', 'q2'],
        mcqAnswers: [{ selectedIndex: 1 }, { selectedIndex: null }],
        report: { id: 'rep-1', status: 'PENDING_REVIEW' },
      },
    });
    return ctx.service.getLessonTestStatus('sl-1', requester);
  }

  it('the class’s teacher, the assigned teacher, the student and admins may look', async () => {
    for (const who of [
      { userId: STUDENT, role: Role.STUDENT },
      { userId: 'tch-class', role: Role.TEACHER },
      { userId: 'tch-assigned', role: Role.TEACHER },
      { userId: 'adm', role: Role.ADMIN },
    ])
      await expect(status(who)).resolves.toMatchObject({
        scheduledLessonId: 'sl-1',
      });
  });

  it('nobody else may', async () => {
    for (const who of [
      { userId: 'other-student', role: Role.STUDENT },
      { userId: 'other-teacher', role: Role.TEACHER },
    ])
      await expect(status(who)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('shows progress, and the report only to the teacher side', async () => {
    const student = await status({ userId: STUDENT, role: Role.STUDENT });
    expect(student.attempt).toMatchObject({ total: 2, answered: 1 });
    expect(student.report).toBeNull();
    const teacher = await status({ userId: 'tch-class', role: Role.TEACHER });
    expect(teacher.report).toEqual({ id: 'rep-1', status: 'PENDING_REVIEW' });
  });
});

describe('AssessmentsService — admin question editing', () => {
  function admin() {
    const ctx = setup();
    ctx.prisma.assessment.findUnique.mockResolvedValue({
      id: 'asm-custom',
      sourceAssessmentId: 'bank-root',
    });
    ctx.prisma.mCQQuestion = {
      aggregate: jest.fn().mockResolvedValue({ _max: { order: 39 } }),
      create: jest.fn(async ({ data }: Row) => ({ id: 'new', ...data })),
      findUnique: jest.fn(),
      update: jest.fn(async ({ data }: Row) => data),
      delete: jest.fn(),
    };
    return ctx;
  }
  const mcq = {
    questionText: 'Which keyword starts a loop in Python?',
    options: ['for', 'loop', 'repeat', 'cycle'],
    correctIndex: 0,
  };

  it('a question added from a custom curriculum lands on the shared ROOT bank', async () => {
    const { service, prisma } = admin();
    await service.createMCQQuestion('asm-custom', mcq);
    const data = prisma.mCQQuestion.create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      assessmentId: 'bank-root',
      order: 40,
      editedByAdmin: true,
      questionType: 'MCQ',
    });
  });

  it.each([
    ['too few options', { ...mcq, options: ['a', 'b', 'c'] }],
    ['duplicate options', { ...mcq, options: ['a', 'A ', 'c', 'd'] }],
    ['an empty option', { ...mcq, options: ['a', '', 'c', 'd'] }],
    ['an answer outside A–D', { ...mcq, correctIndex: 4 }],
    ['no question text', { ...mcq, questionText: '   ' }],
  ])('rejects %s', async (_label, dto) => {
    const { service, prisma } = admin();
    await expect(
      service.createMCQQuestion('asm-custom', dto),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.mCQQuestion.create).not.toHaveBeenCalled();
  });

  it('a True/False question always gets exactly True and False', async () => {
    const { service, prisma } = admin();
    await service.createMCQQuestion('asm-custom', {
      questionType: 'TRUE_FALSE',
      questionText: 'A loop can repeat code.',
      options: ['yes', 'no'], // ignored
      correctIndex: 0,
    });
    expect(prisma.mCQQuestion.create.mock.calls[0][0].data.options).toEqual([
      'True',
      'False',
    ]);
    await expect(
      service.createMCQQuestion('asm-custom', {
        questionType: 'TRUE_FALSE',
        questionText: 'A loop can repeat code.',
        correctIndex: 2,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('deleting a question students answered unpublishes it instead', async () => {
    const { service, prisma } = admin();
    prisma.mCQQuestion.findUnique.mockResolvedValue({
      id: 'q1',
      _count: { answers: 3 },
    });
    await expect(service.deleteMCQQuestion('q1')).resolves.toEqual({
      success: true,
      unpublishedInstead: true,
    });
    expect(prisma.mCQQuestion.delete).not.toHaveBeenCalled();

    prisma.mCQQuestion.findUnique.mockResolvedValue({
      id: 'q2',
      _count: { answers: 0 },
    });
    await expect(service.deleteMCQQuestion('q2')).resolves.toEqual({
      success: true,
      unpublishedInstead: false,
    });
    expect(prisma.mCQQuestion.delete).toHaveBeenCalledWith({
      where: { id: 'q2' },
    });
  });

  it('a coding project can never be created on a different bank than the one addressed', async () => {
    const { service, prisma } = admin();
    prisma.practicalQuestion.create = jest.fn(async ({ data }: Row) => data);
    await service.createPracticalQuestion('asm-custom', {
      title: 'Project',
      assessmentId: 'attacker-chosen',
    });
    expect(
      prisma.practicalQuestion.create.mock.calls[0][0].data.assessmentId,
    ).toBe('bank-root');
  });
});

describe('AssessmentsService.attachBankToLesson', () => {
  function lessonCtx(lesson: Row | null) {
    const ctx = setup();
    ctx.prisma.lesson.findUnique = jest.fn().mockResolvedValue(lesson);
    ctx.prisma.assessment.create = jest.fn().mockResolvedValue({});
    ctx.prisma.assessment.findUniqueOrThrow = jest
      .fn()
      .mockResolvedValue({ id: 'asm-new' });
    return ctx;
  }

  it('only test sessions can have a question bank', async () => {
    const { service } = lessonCtx({
      id: 'l1',
      type: SessionType.LEARNING,
      title: 'Lesson',
      assessment: null,
    });
    await expect(service.attachBankToLesson('l1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('a lesson that already has a bank is left alone', async () => {
    const { service } = lessonCtx({
      id: 'l1',
      type: SessionType.COURSE_TEST,
      title: 'Test',
      assessment: { id: 'asm-1' },
    });
    await expect(service.attachBankToLesson('l1')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('an unknown lesson or bank is not found', async () => {
    await expect(
      lessonCtx(null).service.attachBankToLesson('nope'),
    ).rejects.toBeInstanceOf(NotFoundException);
    const { service, prisma } = lessonCtx({
      id: 'l1',
      type: SessionType.COURSE_TEST,
      title: 'Test',
      assessment: null,
    });
    prisma.assessment.findUnique.mockResolvedValue(null);
    await expect(
      service.attachBankToLesson('l1', 'gone'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('without a source it creates an empty, unpublished bank to fill in by hand', async () => {
    const { service, prisma } = lessonCtx({
      id: 'l1',
      type: SessionType.FINAL_TEST,
      title: 'Final Test',
      assessment: null,
    });
    await service.attachBankToLesson('l1');
    expect(prisma.assessment.create).toHaveBeenCalledWith({
      data: {
        lessonId: 'l1',
        type: SessionType.FINAL_TEST,
        title: 'Final Test',
        isPublished: false,
      },
    });
  });
});
