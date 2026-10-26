import { LessonStatus } from '@prisma/client';
import { RemindersService } from './reminders.service';

// The "starts in 1 hour" reminders: every student is reminded for their own
// place in a class, but a BATCH class is ONE class for its teacher — reminded
// once, whatever the number of students.

const START = new Date('2026-11-02T11:00:00.000Z');

function lessonRow(id: string, n: number, over: Record<string, unknown> = {}) {
  return {
    id,
    start: START,
    batchSessionId: null,
    student: { email: `s${n}@example.com`, fullName: `Student ${n}` },
    teacher: { user: { email: 'teacher@example.com', fullName: 'Ms Karim' } },
    ...over,
  };
}

function setup(lessons: unknown[], sessions: unknown[] = []) {
  const prisma = {
    scheduledLesson: { findMany: jest.fn().mockResolvedValue(lessons) },
    batchSession: { findMany: jest.fn().mockResolvedValue(sessions) },
    booking: { findMany: jest.fn().mockResolvedValue([]) },
  };
  const notifications = {
    sendClassReminderToStudent: jest.fn().mockResolvedValue(undefined),
    sendTeacherClassReminder: jest.fn().mockResolvedValue(undefined),
  };
  const service = new RemindersService(prisma as never, notifications as never);
  return { service, prisma, notifications };
}

describe('RemindersService', () => {
  beforeEach(() => {
    process.env.FRONTEND_URL = 'https://app.example.com';
  });

  it('reminds a 1-to-1 student and their teacher, each with the way into the class', async () => {
    const t = setup([lessonRow('l1', 1)]);
    await t.service.sendUpcomingReminders();

    expect(t.notifications.sendClassReminderToStudent).toHaveBeenCalledTimes(1);
    expect(t.notifications.sendClassReminderToStudent).toHaveBeenCalledWith(
      's1@example.com',
      expect.objectContaining({
        lessonId: 'l1',
        classUrl: 'https://app.example.com/classroom/l1?type=lesson',
      }),
    );
    expect(t.notifications.sendTeacherClassReminder).toHaveBeenCalledTimes(1);
    expect(t.notifications.sendTeacherClassReminder).toHaveBeenCalledWith(
      'teacher@example.com',
      expect.objectContaining({
        lessonId: 'l1',
        studentName: 'Student 1',
        classUrl: 'https://app.example.com/classroom/l1?type=lesson',
      }),
    );
  });

  it('only looks at classes that have not been taught, in the window an hour from now', async () => {
    const t = setup([]);
    await t.service.sendUpcomingReminders();
    const where = t.prisma.scheduledLesson.findMany.mock.calls[0][0].where;
    expect(where.status).toBe(LessonStatus.UPCOMING);
    expect(where.start.lte.getTime() - where.start.gte.getTime()).toBe(
      5 * 60_000,
    );
    const sessionWhere = t.prisma.batchSession.findMany.mock.calls[0][0].where;
    expect(sessionWhere.status).toBe(LessonStatus.UPCOMING);
    expect(sessionWhere.participants).toEqual({
      some: { status: LessonStatus.UPCOMING },
    });
  });

  it('a batch class: every student is reminded, the teacher ONCE for the class, naming the batch', async () => {
    const rows = [1, 2, 3, 4].map((n) =>
      lessonRow(`row-${n}`, n, { batchSessionId: 'sess-1' }),
    );
    const t = setup(rows, [
      {
        id: 'sess-1',
        start: START,
        batch: { name: 'Evening Odyssey' },
        teacher: {
          user: { email: 'teacher@example.com', fullName: 'Ms Karim' },
        },
        _count: { participants: 4 },
      },
    ]);
    await t.service.sendUpcomingReminders();

    expect(t.notifications.sendClassReminderToStudent).toHaveBeenCalledTimes(4);
    // each student enters through their own row
    expect(
      t.notifications.sendClassReminderToStudent.mock.calls.map(
        (c) => c[1].classUrl,
      ),
    ).toEqual(
      [1, 2, 3, 4].map(
        (n) => `https://app.example.com/classroom/row-${n}?type=lesson`,
      ),
    );

    expect(t.notifications.sendTeacherClassReminder).toHaveBeenCalledTimes(1);
    expect(t.notifications.sendTeacherClassReminder).toHaveBeenCalledWith(
      'teacher@example.com',
      expect.objectContaining({
        // the dedupe key is the CLASS, so a rerun of the job cannot repeat it
        lessonId: 'sess-1',
        batchName: 'Evening Odyssey',
        studentCount: 4,
        classUrl: 'https://app.example.com/classroom/sess-1?type=batch',
      }),
    );
  });

  it('a failed email never stops the others', async () => {
    const t = setup([lessonRow('a', 1), lessonRow('b', 2)]);
    t.notifications.sendClassReminderToStudent.mockRejectedValueOnce(
      new Error('smtp down'),
    );
    await expect(t.service.sendUpcomingReminders()).resolves.toBeUndefined();
    expect(t.notifications.sendClassReminderToStudent).toHaveBeenCalledTimes(2);
    expect(t.notifications.sendTeacherClassReminder).toHaveBeenCalledTimes(2);
  });
});
