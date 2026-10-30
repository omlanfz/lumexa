import { BadRequestException } from '@nestjs/common';
import { ClassEndReason, LessonStatus } from '@prisma/client';
import {
  CLASS_FAILSAFE_MINUTES,
  ClassFinalizationService,
} from './class-finalization.service';

const LESSON_ID = 'lesson-1';

function makeLesson(overrides: Record<string, unknown> = {}) {
  return {
    id: LESSON_ID,
    studentUserId: 'student-1',
    teacherId: 'teacher-1',
    courseId: 'course-1',
    lessonNumber: 5,
    classType: 'ONE_TO_ONE',
    status: LessonStatus.UPCOMING,
    start: new Date('2026-10-05T16:00:00Z'),
    end: new Date('2026-10-05T16:45:00Z'),
    studentJoinedAt: new Date('2026-10-05T16:01:00Z'),
    teacherJoinedAt: new Date('2026-10-05T16:00:00Z'),
    endedByRole: null,
    teacher: { id: 'teacher-1', userId: 'teacher-user-1' },
    student: { id: 'student-1', fullName: 'Ada', email: 'ada@example.com' },
    ...overrides,
  };
}

function setup(lesson: ReturnType<typeof makeLesson> | null = makeLesson()) {
  const tx = {
    scheduledLesson: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      update: jest.fn().mockResolvedValue({}),
    },
    batchSession: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      count: jest.fn().mockResolvedValue(3),
    },
    batch: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
  };
  const prisma = {
    scheduledLesson: {
      findUnique: jest.fn().mockResolvedValue(lesson),
      findMany: jest.fn().mockResolvedValue([]),
    },
    batchSession: {
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    teacherProfile: {
      findUnique: jest.fn().mockResolvedValue({ user: { fullName: 'Mr T' } }),
    },
    $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  const alerts = { create: jest.fn().mockResolvedValue(undefined) };
  const notifications = {
    sendMissedClassNotice: jest.fn().mockResolvedValue(undefined),
  };
  const payouts = {
    recordScheduledLessonEarningInTx: jest.fn().mockResolvedValue({}),
    recordBatchSessionEarningInTx: jest.fn().mockResolvedValue({}),
  };
  const ledger = {
    consumeLessonForScheduledLessonInTx: jest.fn().mockResolvedValue(true),
  };
  const scheduling = {
    hasPartialCompletion: jest.fn().mockResolvedValue(false),
    insertMakeupOccurrence: jest.fn().mockResolvedValue({ shiftedCount: 3 }),
  };
  const recording = {
    stopActiveSegmentIfAny: jest.fn().mockResolvedValue(undefined),
    finalizeAtClassEnd: jest.fn().mockResolvedValue(undefined),
  };
  const batches = {
    hasPartialCompletion: jest.fn().mockResolvedValue(false),
    insertMakeupSession: jest.fn().mockResolvedValue({ shiftedCount: 2 }),
  };
  const rooms = { deleteRoom: jest.fn().mockResolvedValue(undefined) };
  const studentProgress = {
    syncAfterClass: jest.fn().mockResolvedValue(undefined),
  };

  const service = new ClassFinalizationService(
    prisma as any,
    audit as any,
    alerts as any,
    notifications as any,
    payouts as any,
    ledger as any,
    scheduling as any,
    recording as any,
    batches as any,
    rooms as any,
    studentProgress as any,
  );
  return {
    service,
    tx,
    prisma,
    audit,
    alerts,
    notifications,
    payouts,
    ledger,
    scheduling,
    recording,
    batches,
    rooms,
    studentProgress,
  };
}

const teacher = { role: 'TEACHER' as const, userId: 'teacher-user-1' };
const admin = { role: 'ADMIN' as const, userId: 'admin-1' };
const system = { role: 'SYSTEM' as const };

describe('ClassFinalizationService.finalizeLesson', () => {
  it('COMPLETED: pays the teacher, consumes one lesson, schedules no extra class', async () => {
    const t = setup();
    const res = await t.service.finalizeLesson(LESSON_ID, {
      outcome: 'COMPLETED',
      actor: teacher,
    });

    expect(res).toEqual({ finalized: true, status: 'COMPLETED' });
    expect(t.tx.scheduledLesson.updateMany).toHaveBeenCalledWith({
      where: { id: LESSON_ID, status: LessonStatus.UPCOMING },
      data: expect.objectContaining({
        status: 'COMPLETED',
        endedByRole: 'TEACHER',
        endReason: null,
      }),
    });
    expect(t.payouts.recordScheduledLessonEarningInTx).toHaveBeenCalledTimes(1);
    expect(t.ledger.consumeLessonForScheduledLessonInTx).toHaveBeenCalledTimes(
      1,
    );
    expect(t.scheduling.insertMakeupOccurrence).not.toHaveBeenCalled();
    // The class's recording is closed out.
    expect(t.recording.stopActiveSegmentIfAny).toHaveBeenCalledWith(
      `lesson-${LESSON_ID}`,
    );
    expect(t.recording.finalizeAtClassEnd).toHaveBeenCalledTimes(1);
  });

  it('PARTIALLY_COMPLETED: same money as COMPLETED plus exactly one extra class', async () => {
    const t = setup();
    await t.service.finalizeLesson(LESSON_ID, {
      outcome: 'PARTIALLY_COMPLETED',
      actor: teacher,
    });

    expect(t.payouts.recordScheduledLessonEarningInTx).toHaveBeenCalledTimes(1);
    expect(t.ledger.consumeLessonForScheduledLessonInTx).toHaveBeenCalledTimes(
      1,
    );
    expect(t.scheduling.insertMakeupOccurrence).toHaveBeenCalledTimes(1);
  });

  it('PARTIALLY_COMPLETED: refused (and nothing written) when already used for this lesson', async () => {
    const t = setup();
    t.scheduling.hasPartialCompletion.mockResolvedValue(true);

    await expect(
      t.service.finalizeLesson(LESSON_ID, {
        outcome: 'PARTIALLY_COMPLETED',
        actor: teacher,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(t.tx.scheduledLesson.updateMany).not.toHaveBeenCalled();
    expect(t.payouts.recordScheduledLessonEarningInTx).not.toHaveBeenCalled();
    expect(t.ledger.consumeLessonForScheduledLessonInTx).not.toHaveBeenCalled();
    expect(t.scheduling.insertMakeupOccurrence).not.toHaveBeenCalled();
  });

  it('INCOMPLETE: no earning, no deduction, schedules the class again', async () => {
    const t = setup();
    await t.service.finalizeLesson(LESSON_ID, {
      outcome: 'INCOMPLETE',
      reason: ClassEndReason.TECHNICAL_ISSUE,
      actor: teacher,
    });

    expect(t.tx.scheduledLesson.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'INCOMPLETE',
          endReason: ClassEndReason.TECHNICAL_ISSUE,
        }),
      }),
    );
    expect(t.payouts.recordScheduledLessonEarningInTx).not.toHaveBeenCalled();
    expect(t.ledger.consumeLessonForScheduledLessonInTx).not.toHaveBeenCalled();
    expect(t.scheduling.insertMakeupOccurrence).toHaveBeenCalledTimes(1);
    expect(t.alerts.create).not.toHaveBeenCalled();
  });

  it('INCOMPLETE requires one of the three reasons, and a note for Other', async () => {
    const t = setup();
    await expect(
      t.service.finalizeLesson(LESSON_ID, {
        outcome: 'INCOMPLETE',
        actor: teacher,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      t.service.finalizeLesson(LESSON_ID, {
        outcome: 'INCOMPLETE',
        reason: ClassEndReason.STUDENT_LEFT_EARLY,
        actor: teacher,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      t.service.finalizeLesson(LESSON_ID, {
        outcome: 'INCOMPLETE',
        reason: ClassEndReason.OTHER,
        actor: teacher,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(t.prisma.$transaction).not.toHaveBeenCalled();
  });

  it('a teacher cannot mark a class paid when the student never joined; an admin can', async () => {
    const t = setup(makeLesson({ studentJoinedAt: null }));
    await expect(
      t.service.finalizeLesson(LESSON_ID, {
        outcome: 'COMPLETED',
        actor: teacher,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(t.prisma.$transaction).not.toHaveBeenCalled();

    await expect(
      t.service.finalizeLesson(LESSON_ID, {
        outcome: 'COMPLETED',
        actor: admin,
      }),
    ).resolves.toEqual({ finalized: true, status: 'COMPLETED' });
  });

  it('1:1: a student who did not attend is never charged, even when an admin settles the class as paid', async () => {
    for (const outcome of ['COMPLETED', 'PARTIALLY_COMPLETED'] as const) {
      const t = setup(makeLesson({ studentJoinedAt: null }));
      await t.service.finalizeLesson(LESSON_ID, { outcome, actor: admin });
      expect(
        t.ledger.consumeLessonForScheduledLessonInTx,
      ).not.toHaveBeenCalled();
    }
    const incomplete = setup(makeLesson({ studentJoinedAt: null }));
    await incomplete.service.finalizeLesson(LESSON_ID, {
      outcome: 'INCOMPLETE',
      reason: ClassEndReason.STUDENT_NO_SHOW,
      actor: teacher,
    });
    expect(
      incomplete.ledger.consumeLessonForScheduledLessonInTx,
    ).not.toHaveBeenCalled();
  });

  it('1:1: an attended class is still charged exactly once, for the payout-eligible outcomes only', async () => {
    const attended = setup();
    await attended.service.finalizeLesson(LESSON_ID, {
      outcome: 'COMPLETED',
      actor: admin,
    });
    expect(
      attended.ledger.consumeLessonForScheduledLessonInTx,
    ).toHaveBeenCalledTimes(1);

    // Attended but ended Incomplete (e.g. technical issue): still not charged.
    const incomplete = setup();
    await incomplete.service.finalizeLesson(LESSON_ID, {
      outcome: 'INCOMPLETE',
      reason: ClassEndReason.TECHNICAL_ISSUE,
      actor: teacher,
    });
    expect(
      incomplete.ledger.consumeLessonForScheduledLessonInTx,
    ).not.toHaveBeenCalled();
  });

  it('losing the compare-and-set race writes nothing and notifies no one', async () => {
    const t = setup();
    t.tx.scheduledLesson.updateMany.mockResolvedValue({ count: 0 });
    // Someone else (the teacher) already ended it as COMPLETED.
    t.prisma.scheduledLesson.findUnique
      .mockResolvedValueOnce(makeLesson())
      .mockResolvedValueOnce(
        makeLesson({ status: LessonStatus.COMPLETED, endedByRole: 'TEACHER' }),
      );

    const res = await t.service.finalizeLesson(LESSON_ID, {
      outcome: 'COMPLETED',
      actor: system,
    });

    expect(res).toEqual({ finalized: false, status: 'COMPLETED' });
    expect(t.payouts.recordScheduledLessonEarningInTx).not.toHaveBeenCalled();
    expect(t.ledger.consumeLessonForScheduledLessonInTx).not.toHaveBeenCalled();
    expect(t.recording.stopActiveSegmentIfAny).not.toHaveBeenCalled();
    expect(t.alerts.create).not.toHaveBeenCalled();
    expect(t.audit.log).not.toHaveBeenCalled();
  });

  it('an identical repeat request is a harmless success; a different one is rejected', async () => {
    const t = setup(
      makeLesson({ status: LessonStatus.COMPLETED, endedByRole: 'TEACHER' }),
    );
    await expect(
      t.service.finalizeLesson(LESSON_ID, {
        outcome: 'COMPLETED',
        actor: teacher,
      }),
    ).resolves.toEqual({ finalized: false, status: 'COMPLETED' });

    await expect(
      t.service.finalizeLesson(LESSON_ID, {
        outcome: 'INCOMPLETE',
        reason: ClassEndReason.TECHNICAL_ISSUE,
        actor: teacher,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(t.prisma.$transaction).not.toHaveBeenCalled();
  });

  it('the system failsafe never touches an already-finalized class', async () => {
    const t = setup(
      makeLesson({
        status: LessonStatus.PARTIALLY_COMPLETED,
        endedByRole: 'TEACHER',
      }),
    );
    await expect(
      t.service.finalizeLesson(LESSON_ID, {
        outcome: 'COMPLETED',
        actor: system,
      }),
    ).resolves.toEqual({ finalized: false, status: 'PARTIALLY_COMPLETED' });
    expect(t.prisma.$transaction).not.toHaveBeenCalled();
    expect(t.alerts.create).not.toHaveBeenCalled();
  });

  it('system finalization pays like Completed and warns the teacher once', async () => {
    const t = setup();
    await t.service.finalizeLesson(LESSON_ID, {
      outcome: 'COMPLETED',
      actor: system,
    });

    expect(t.tx.scheduledLesson.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'COMPLETED',
          endedByRole: 'SYSTEM',
        }),
      }),
    );
    expect(t.payouts.recordScheduledLessonEarningInTx).toHaveBeenCalledTimes(1);
    expect(t.ledger.consumeLessonForScheduledLessonInTx).toHaveBeenCalledTimes(
      1,
    );
    const types = t.alerts.create.mock.calls.map((c) => c[0].type);
    expect(types).toEqual(['CLASS_COMPLETED_EARNING', 'CLASS_AUTO_ENDED']);
    const warning = t.alerts.create.mock.calls[1][0];
    expect(warning.title).toBe('Class automatically ended');
    expect(warning.message).toContain(`${CLASS_FAILSAFE_MINUTES} minutes`);
  });
});

// ─── A batch class: ONE class, one row per student ──────────────────────────

const SESSION_ID = 'session-1';
const SESSION_START = new Date('2026-10-05T16:00:00Z');
const SESSION_END = new Date('2026-10-05T16:45:00Z');

function participant(n: number, overrides: Record<string, unknown> = {}) {
  return {
    id: `row-${n}`,
    studentUserId: `student-${n}`,
    status: LessonStatus.UPCOMING,
    studentJoinedAt: new Date('2026-10-05T16:01:00Z'),
    student: {
      id: `student-${n}`,
      fullName: `Student ${n}`,
      email: `s${n}@example.com`,
    },
    ...overrides,
  };
}

function makeSession(
  participants = [participant(1), participant(2), participant(3)],
  overrides: Record<string, unknown> = {},
) {
  return {
    id: SESSION_ID,
    batchId: 'batch-1',
    teacherId: 'teacher-1',
    courseId: 'course-1',
    lessonNumber: 5,
    status: LessonStatus.UPCOMING,
    start: SESSION_START,
    end: SESSION_END,
    teacherJoinedAt: new Date('2026-10-05T16:00:00Z'),
    endedByRole: null,
    batch: { id: 'batch-1', name: 'Evening Odyssey' },
    teacher: { id: 'teacher-1', userId: 'teacher-user-1' },
    participants,
    ...overrides,
  };
}

function setupBatch(session = makeSession()) {
  const t = setup(null);
  t.prisma.batchSession.findUnique.mockResolvedValue(session);
  return t;
}

describe('ClassFinalizationService.finalizeBatchSession', () => {
  it('COMPLETED: the class is finalized once, the teacher is paid once, every student is charged one lesson on their own ledger', async () => {
    const t = setupBatch();
    const res = await t.service.finalizeBatchSession(SESSION_ID, {
      outcome: 'COMPLETED',
      actor: teacher,
    });

    expect(res.finalized).toBe(true);
    expect(res.status).toBe('COMPLETED');
    expect(res.lessons.map((l) => l.status)).toEqual([
      'COMPLETED',
      'COMPLETED',
      'COMPLETED',
    ]);

    // ONE compare-and-set on the class itself.
    expect(t.tx.batchSession.updateMany).toHaveBeenCalledTimes(1);
    expect(t.tx.batchSession.updateMany).toHaveBeenCalledWith({
      where: { id: SESSION_ID, status: LessonStatus.UPCOMING },
      data: expect.objectContaining({
        status: 'COMPLETED',
        endedByRole: 'TEACHER',
      }),
    });
    // ONE payment for the class — never one per student.
    expect(t.payouts.recordBatchSessionEarningInTx).toHaveBeenCalledTimes(1);
    expect(t.payouts.recordBatchSessionEarningInTx).toHaveBeenCalledWith(
      t.tx,
      expect.objectContaining({
        id: SESSION_ID,
        teacherId: 'teacher-1',
        batchName: 'Evening Odyssey',
        students: 3,
      }),
    );
    expect(t.payouts.recordScheduledLessonEarningInTx).not.toHaveBeenCalled();
    // Each student's own lesson balance moves by one, on their own row.
    expect(t.ledger.consumeLessonForScheduledLessonInTx).toHaveBeenCalledTimes(
      3,
    );
    expect(
      t.ledger.consumeLessonForScheduledLessonInTx.mock.calls.map(
        (c) => c[1].scheduledLessonId,
      ),
    ).toEqual(['row-1', 'row-2', 'row-3']);
    expect(t.tx.scheduledLesson.update).toHaveBeenCalledTimes(3);
    // A finished lesson adds no extra class.
    expect(t.batches.insertMakeupSession).not.toHaveBeenCalled();
    // Recording and room wrapped up once for the whole class.
    expect(t.recording.stopActiveSegmentIfAny).toHaveBeenCalledTimes(1);
    expect(t.recording.stopActiveSegmentIfAny).toHaveBeenCalledWith(
      `batch-session-${SESSION_ID}`,
    );
    expect(t.recording.finalizeAtClassEnd).toHaveBeenCalledTimes(1);
    // One earning alert, one audit entry.
    expect(t.alerts.create).toHaveBeenCalledTimes(1);
    expect(t.audit.log).toHaveBeenCalledTimes(1);
    expect(t.audit.log.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        entityType: 'BatchSession',
        entityId: SESSION_ID,
      }),
    );
  });

  it('a student who never joined is recorded as an Incomplete no-show: still charged for the class, not counted as taught, told about the recording', async () => {
    const t = setupBatch(
      makeSession([
        participant(1),
        participant(2, { studentJoinedAt: null }),
        participant(3),
      ]),
    );
    const res = await t.service.finalizeBatchSession(SESSION_ID, {
      outcome: 'COMPLETED',
      actor: teacher,
    });

    expect(res.lessons.map((l) => [l.lessonId, l.status])).toEqual([
      ['row-1', 'COMPLETED'],
      ['row-2', 'INCOMPLETE'],
      ['row-3', 'COMPLETED'],
    ]);
    const absent = t.tx.scheduledLesson.update.mock.calls.find(
      (c) => c[0].where.id === 'row-2',
    )![0];
    expect(absent.data).toEqual(
      expect.objectContaining({
        status: 'INCOMPLETE',
        endReason: ClassEndReason.STUDENT_NO_SHOW,
      }),
    );
    expect(
      t.ledger.consumeLessonForScheduledLessonInTx.mock.calls.map(
        (c) => c[1].scheduledLessonId,
      ),
    ).toEqual(['row-1', 'row-2', 'row-3']);
    // The absent student's charge says why, and is for the same class.
    const absentCharge =
      t.ledger.consumeLessonForScheduledLessonInTx.mock.calls.find(
        (c) => c[1].scheduledLessonId === 'row-2',
      )![1];
    expect(absentCharge.description).toContain('Evening Odyssey');
    expect(absentCharge.description).toContain('Lesson 5');
    expect(absentCharge.description).toContain('absent');
    // The class is paid once, for the students who were taught.
    expect(t.payouts.recordBatchSessionEarningInTx).toHaveBeenCalledTimes(1);
    expect(
      t.payouts.recordBatchSessionEarningInTx.mock.calls[0][1].students,
    ).toBe(2);
    // No make-up of their own for a group class — the recording is their catch-up.
    expect(t.batches.insertMakeupSession).not.toHaveBeenCalled();
    expect(t.notifications.sendMissedClassNotice).toHaveBeenCalledTimes(1);
    expect(t.notifications.sendMissedClassNotice).toHaveBeenCalledWith(
      's2@example.com',
      expect.objectContaining({ batchName: 'Evening Odyssey' }),
    );
  });

  it('PARTIALLY_COMPLETED: the same money as Completed and ONE extra class for the whole batch', async () => {
    const t = setupBatch();
    await t.service.finalizeBatchSession(SESSION_ID, {
      outcome: 'PARTIALLY_COMPLETED',
      actor: teacher,
    });

    expect(t.batches.hasPartialCompletion).toHaveBeenCalledWith(
      t.tx,
      'batch-1',
      5,
    );
    expect(t.payouts.recordBatchSessionEarningInTx).toHaveBeenCalledTimes(1);
    expect(t.ledger.consumeLessonForScheduledLessonInTx).toHaveBeenCalledTimes(
      3,
    );
    expect(t.batches.insertMakeupSession).toHaveBeenCalledTimes(1);
    expect(t.batches.insertMakeupSession.mock.calls[0][0]).toBe(t.tx);
  });

  it('PARTIALLY_COMPLETED is refused, writing nothing, once the batch has used it for this lesson', async () => {
    const t = setupBatch();
    t.batches.hasPartialCompletion.mockResolvedValue(true);

    await expect(
      t.service.finalizeBatchSession(SESSION_ID, {
        outcome: 'PARTIALLY_COMPLETED',
        actor: teacher,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(t.tx.batchSession.updateMany).not.toHaveBeenCalled();
    expect(t.payouts.recordBatchSessionEarningInTx).not.toHaveBeenCalled();
    expect(t.ledger.consumeLessonForScheduledLessonInTx).not.toHaveBeenCalled();
    expect(t.batches.insertMakeupSession).not.toHaveBeenCalled();
  });

  it('INCOMPLETE: the teacher is not paid, but EVERY enrolled student is charged, is recorded Incomplete (no progression) and ONE make-up class is added', async () => {
    const t = setupBatch();
    const res = await t.service.finalizeBatchSession(SESSION_ID, {
      outcome: 'INCOMPLETE',
      reason: ClassEndReason.TECHNICAL_ISSUE,
      actor: teacher,
    });

    expect(res.lessons.every((l) => l.status === 'INCOMPLETE')).toBe(true);
    expect(t.payouts.recordBatchSessionEarningInTx).not.toHaveBeenCalled();
    expect(
      t.ledger.consumeLessonForScheduledLessonInTx.mock.calls.map(
        (c) => c[1].scheduledLessonId,
      ),
    ).toEqual(['row-1', 'row-2', 'row-3']);
    expect(
      t.ledger.consumeLessonForScheduledLessonInTx.mock.calls[0][1].description,
    ).toContain('class incomplete');
    expect(t.batches.insertMakeupSession).toHaveBeenCalledTimes(1);
    expect(t.tx.batchSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'INCOMPLETE',
          endReason: ClassEndReason.TECHNICAL_ISSUE,
        }),
      }),
    );
    expect(t.alerts.create).not.toHaveBeenCalled();
  });

  it('INCOMPLETE with nobody present still charges every enrolled student', async () => {
    const t = setupBatch(
      makeSession(
        [1, 2, 3].map((n) => participant(n, { studentJoinedAt: null })),
      ),
    );
    const res = await t.service.finalizeBatchSession(SESSION_ID, {
      outcome: 'INCOMPLETE',
      reason: ClassEndReason.STUDENT_NO_SHOW,
      actor: system,
    });
    expect(res.finalized).toBe(true);
    expect(t.ledger.consumeLessonForScheduledLessonInTx).toHaveBeenCalledTimes(
      3,
    );
    expect(t.payouts.recordBatchSessionEarningInTx).not.toHaveBeenCalled();
  });

  it('a cancelled student row is never charged', async () => {
    const t = setupBatch(
      makeSession([
        participant(1),
        participant(2, { status: LessonStatus.CANCELLED }),
      ]),
    );
    await t.service.finalizeBatchSession(SESSION_ID, {
      outcome: 'COMPLETED',
      actor: teacher,
    });
    expect(
      t.ledger.consumeLessonForScheduledLessonInTx.mock.calls.map(
        (c) => c[1].scheduledLessonId,
      ),
    ).toEqual(['row-1']);
  });

  it('INCOMPLETE needs one of the three reasons — the same rule as a 1-to-1 class', async () => {
    const t = setupBatch();
    await expect(
      t.service.finalizeBatchSession(SESSION_ID, {
        outcome: 'INCOMPLETE',
        actor: teacher,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      t.service.finalizeBatchSession(SESSION_ID, {
        outcome: 'INCOMPLETE',
        reason: ClassEndReason.OTHER,
        actor: teacher,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(t.prisma.$transaction).not.toHaveBeenCalled();
  });

  it('a teacher cannot mark a class paid when no student joined; an admin can, crediting every student', async () => {
    const none = [1, 2, 3].map((n) =>
      participant(n, { studentJoinedAt: null }),
    );
    const t = setupBatch(makeSession(none));
    await expect(
      t.service.finalizeBatchSession(SESSION_ID, {
        outcome: 'COMPLETED',
        actor: teacher,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(t.prisma.$transaction).not.toHaveBeenCalled();

    const res = await t.service.finalizeBatchSession(SESSION_ID, {
      outcome: 'COMPLETED',
      actor: admin,
    });
    expect(res.lessons.every((l) => l.status === 'COMPLETED')).toBe(true);
    expect(t.ledger.consumeLessonForScheduledLessonInTx).toHaveBeenCalledTimes(
      3,
    );
    expect(t.payouts.recordBatchSessionEarningInTx).toHaveBeenCalledTimes(1);
    // An admin settling a class does not email anyone "you missed it".
    expect(t.notifications.sendMissedClassNotice).not.toHaveBeenCalled();
  });

  it('losing the compare-and-set race writes nothing and notifies no one', async () => {
    const t = setupBatch();
    t.tx.batchSession.updateMany.mockResolvedValue({ count: 0 });
    t.prisma.batchSession.findUnique
      .mockResolvedValueOnce(makeSession())
      .mockResolvedValueOnce({
        ...makeSession(),
        status: LessonStatus.COMPLETED,
        endedByRole: 'TEACHER',
      });

    const res = await t.service.finalizeBatchSession(SESSION_ID, {
      outcome: 'COMPLETED',
      actor: system,
    });

    expect(res.finalized).toBe(false);
    expect(res.status).toBe('COMPLETED');
    expect(t.tx.scheduledLesson.update).not.toHaveBeenCalled();
    expect(t.payouts.recordBatchSessionEarningInTx).not.toHaveBeenCalled();
    expect(t.ledger.consumeLessonForScheduledLessonInTx).not.toHaveBeenCalled();
    expect(t.batches.insertMakeupSession).not.toHaveBeenCalled();
    expect(t.recording.stopActiveSegmentIfAny).not.toHaveBeenCalled();
    expect(t.alerts.create).not.toHaveBeenCalled();
    expect(t.audit.log).not.toHaveBeenCalled();
  });

  it('a repeat of the same request is a harmless success; a different one is rejected', async () => {
    const t = setupBatch(
      makeSession(
        [1, 2, 3].map((n) =>
          participant(n, { status: LessonStatus.COMPLETED }),
        ),
        { status: LessonStatus.COMPLETED, endedByRole: 'TEACHER' },
      ),
    );
    const repeat = await t.service.finalizeBatchSession(SESSION_ID, {
      outcome: 'COMPLETED',
      actor: teacher,
    });
    expect(repeat.finalized).toBe(false);
    expect(repeat.status).toBe('COMPLETED');

    await expect(
      t.service.finalizeBatchSession(SESSION_ID, {
        outcome: 'INCOMPLETE',
        reason: ClassEndReason.TECHNICAL_ISSUE,
        actor: teacher,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(t.prisma.$transaction).not.toHaveBeenCalled();
    expect(t.payouts.recordBatchSessionEarningInTx).not.toHaveBeenCalled();
  });

  it('a class with no student left is closed without pay or make-up', async () => {
    const t = setupBatch(
      makeSession([participant(1, { status: LessonStatus.CANCELLED })]),
    );
    const res = await t.service.finalizeBatchSession(SESSION_ID, {
      outcome: 'COMPLETED',
      actor: system,
    });

    expect(res.status).toBe('CANCELLED');
    expect(t.prisma.batchSession.updateMany).toHaveBeenCalledWith({
      where: { id: SESSION_ID, status: LessonStatus.UPCOMING },
      data: expect.objectContaining({ status: LessonStatus.CANCELLED }),
    });
    expect(t.payouts.recordBatchSessionEarningInTx).not.toHaveBeenCalled();
    expect(t.batches.insertMakeupSession).not.toHaveBeenCalled();
    expect(t.prisma.$transaction).not.toHaveBeenCalled();
  });

  it('finishing the last class of the batch completes the batch; an earlier one does not', async () => {
    const last = setupBatch();
    last.tx.batchSession.count.mockResolvedValue(0);
    await last.service.finalizeBatchSession(SESSION_ID, {
      outcome: 'COMPLETED',
      actor: teacher,
    });
    expect(last.tx.batch.updateMany).toHaveBeenCalledWith({
      where: { id: 'batch-1', status: 'ACTIVE' },
      data: { status: 'COMPLETED' },
    });

    const earlier = setupBatch();
    earlier.tx.batchSession.count.mockResolvedValue(4);
    await earlier.service.finalizeBatchSession(SESSION_ID, {
      outcome: 'COMPLETED',
      actor: teacher,
    });
    expect(earlier.tx.batch.updateMany).not.toHaveBeenCalled();
  });

  it('a failsafe-ended class warns the teacher once and records the system as the one who ended it', async () => {
    const t = setupBatch();
    await t.service.finalizeBatchSession(SESSION_ID, {
      outcome: 'COMPLETED',
      actor: system,
    });
    expect(t.tx.batchSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ endedByRole: 'SYSTEM' }),
      }),
    );
    const types = t.alerts.create.mock.calls.map((c) => c[0].type);
    expect(types).toEqual(['CLASS_COMPLETED_EARNING', 'CLASS_AUTO_ENDED']);
  });
});

describe('ClassFinalizationService.finalizeLesson — a batch student’s row', () => {
  it('finalizes the CLASS (once for everyone), never the single row', async () => {
    const t = setup(makeLesson({ batchSessionId: SESSION_ID }));
    const spy = jest
      .spyOn(t.service, 'finalizeBatchSession')
      .mockResolvedValue({
        finalized: true,
        status: LessonStatus.COMPLETED,
        lessons: [],
      });

    const res = await t.service.finalizeLesson(LESSON_ID, {
      outcome: 'COMPLETED',
      actor: admin,
    });

    expect(res).toEqual({ finalized: true, status: 'COMPLETED' });
    expect(spy).toHaveBeenCalledWith(SESSION_ID, {
      outcome: 'COMPLETED',
      actor: admin,
    });
    expect(t.prisma.$transaction).not.toHaveBeenCalled();
    expect(t.payouts.recordScheduledLessonEarningInTx).not.toHaveBeenCalled();
  });
});

describe('ClassFinalizationService.sweepOverdueClasses', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-05T17:30:00Z'));
  });
  afterEach(() => jest.useRealTimers());

  it('only looks at open classes that started 75+ minutes ago and had the teacher join', async () => {
    const t = setup();
    await t.service.sweepOverdueClasses();

    const where = t.prisma.scheduledLesson.findMany.mock.calls[0][0].where;
    expect(where.status).toBe(LessonStatus.UPCOMING);
    expect(where.teacherJoinedAt).toEqual({ not: null });
    expect(where.start.lte).toEqual(new Date('2026-10-05T16:15:00Z'));
    // Never reaches back before the failsafe's effective date.
    expect(where.start.gte.getTime()).toBeGreaterThanOrEqual(
      new Date('2026-10-03T00:00:00Z').getTime(),
    );
  });

  it('auto-completes when the student joined, auto-marks Incomplete (no pay) when they never did', async () => {
    const t = setup();
    t.prisma.scheduledLesson.findMany.mockResolvedValue([
      { id: LESSON_ID, studentJoinedAt: new Date() },
      { id: 'lesson-2', studentJoinedAt: null },
    ]);
    const spy = jest.spyOn(t.service, 'finalizeLesson').mockResolvedValue({
      finalized: true,
      status: LessonStatus.COMPLETED,
    });

    await t.service.sweepOverdueClasses();

    expect(spy).toHaveBeenNthCalledWith(1, LESSON_ID, {
      outcome: 'COMPLETED',
      actor: { role: 'SYSTEM' },
    });
    expect(spy).toHaveBeenNthCalledWith(
      2,
      'lesson-2',
      expect.objectContaining({
        outcome: 'INCOMPLETE',
        reason: ClassEndReason.STUDENT_NO_SHOW,
        actor: { role: 'SYSTEM' },
      }),
    );
  });

  it('keeps going when one class fails to finalize', async () => {
    const t = setup();
    t.prisma.scheduledLesson.findMany.mockResolvedValue([
      { id: 'a', studentJoinedAt: new Date() },
      { id: 'b', studentJoinedAt: new Date() },
    ]);
    const spy = jest
      .spyOn(t.service, 'finalizeLesson')
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({
        finalized: true,
        status: LessonStatus.COMPLETED,
      });

    await expect(t.service.sweepOverdueClasses()).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('leaves a batch student’s row to its class (it is never finalized on its own)', async () => {
    const t = setup();
    await t.service.sweepOverdueClasses();
    const where = t.prisma.scheduledLesson.findMany.mock.calls[0][0].where;
    expect(where.batchSessionId).toBeNull();
  });

  it('ends an overdue batch class once: Completed when any student joined, Incomplete (no pay) when none did', async () => {
    const t = setup();
    t.prisma.batchSession.findMany.mockResolvedValue([
      {
        id: 'sess-a',
        participants: [
          { studentJoinedAt: null },
          { studentJoinedAt: new Date() },
        ],
      },
      { id: 'sess-b', participants: [{ studentJoinedAt: null }] },
    ]);
    const spy = jest
      .spyOn(t.service, 'finalizeBatchSession')
      .mockResolvedValue({
        finalized: true,
        status: LessonStatus.COMPLETED,
        lessons: [],
      });

    await t.service.sweepOverdueClasses();

    const where = t.prisma.batchSession.findMany.mock.calls[0][0].where;
    expect(where.status).toBe(LessonStatus.UPCOMING);
    expect(where.teacherJoinedAt).toEqual({ not: null });
    expect(where.start.lte).toEqual(new Date('2026-10-05T16:15:00Z'));
    expect(spy).toHaveBeenNthCalledWith(1, 'sess-a', {
      outcome: 'COMPLETED',
      actor: { role: 'SYSTEM' },
    });
    expect(spy).toHaveBeenNthCalledWith(
      2,
      'sess-b',
      expect.objectContaining({
        outcome: 'INCOMPLETE',
        reason: ClassEndReason.STUDENT_NO_SHOW,
        actor: { role: 'SYSTEM' },
      }),
    );
  });
});

// ─── Student progress follows the class ─────────────────────────────────────

describe('ClassFinalizationService — student progress hook', () => {
  it('a 1:1 COMPLETED class syncs the student’s rank / streak / badges', async () => {
    const t = setup();
    await t.service.finalizeLesson(LESSON_ID, {
      outcome: 'COMPLETED',
      actor: teacher,
    });
    expect(t.studentProgress.syncAfterClass).toHaveBeenCalledWith([
      'student-1',
    ]);
  });

  it('an INCOMPLETE 1:1 class syncs nobody (nothing was attended)', async () => {
    const t = setup();
    await t.service.finalizeLesson(LESSON_ID, {
      outcome: 'INCOMPLETE',
      reason: ClassEndReason.TECHNICAL_ISSUE,
      actor: teacher,
    });
    expect(t.studentProgress.syncAfterClass).not.toHaveBeenCalled();
  });

  it('a batch class syncs only the students who were credited, not an absent one', async () => {
    const t = setupBatch(
      makeSession([
        participant(1),
        participant(2),
        participant(3, { studentJoinedAt: null }),
      ]),
    );
    await t.service.finalizeBatchSession(SESSION_ID, {
      outcome: 'COMPLETED',
      actor: teacher,
    });
    expect(t.studentProgress.syncAfterClass).toHaveBeenCalledTimes(1);
    expect(t.studentProgress.syncAfterClass.mock.calls[0][0].sort()).toEqual([
      'student-1',
      'student-2',
    ]);
  });
});
