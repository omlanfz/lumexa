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
    },
  };
  const prisma = {
    scheduledLesson: {
      findUnique: jest.fn().mockResolvedValue(lesson),
      findMany: jest.fn().mockResolvedValue([]),
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

  const service = new ClassFinalizationService(
    prisma as any,
    audit as any,
    alerts as any,
    notifications as any,
    payouts as any,
    ledger as any,
    scheduling as any,
    recording as any,
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
    // Recording stopped + handed to the merge sweep.
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
});
