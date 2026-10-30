import { Test, TestingModule } from '@nestjs/testing';
import { EngagementService } from './engagement.service';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { StudentProgressService } from '../students/progress/student-progress.service';

// The streak itself is derived from class records (see progress.rules.spec.ts);
// the weekly job only persists the derivation and says "your streak ended".

const STUDENT = {
  id: 'student-1',
  email: 'student@example.com',
  fullName: 'Ada Lovelace',
};

/** 12 weeks, oldest first; `done` lists which of the LAST weeks are done,
 * as offsets from the current (last) week: 0 = this week, 1 = last week … */
function weeks(doneOffsets: number[]) {
  return Array.from({ length: 12 }, (_, i) => ({
    weekStart: `w${i}`,
    isCurrent: i === 11,
    done: doneOffsets.includes(11 - i),
  }));
}

describe('EngagementService.checkStreaks', () => {
  let service: EngagementService;
  let prisma: { user: { findMany: jest.Mock } };
  let progress: { sync: jest.Mock };
  let notifications: {
    sendStreakLostNotice: jest.Mock;
    sendMonthlyDigest: jest.Mock;
  };

  beforeEach(async () => {
    prisma = { user: { findMany: jest.fn().mockResolvedValue([STUDENT]) } };
    progress = { sync: jest.fn() };
    notifications = {
      sendStreakLostNotice: jest.fn().mockResolvedValue(undefined),
      sendMonthlyDigest: jest.fn().mockResolvedValue(undefined),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EngagementService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
        { provide: StudentProgressService, useValue: progress },
      ],
    }).compile();
    service = module.get(EngagementService);
  });

  const syncReturns = (doneOffsets: number[]) =>
    progress.sync.mockResolvedValue({
      result: { streak: { weeks: weeks(doneOffsets) } },
    });

  it('persists every active student’s derived progress, announcing it as live', async () => {
    syncReturns([1, 2, 3]);
    await service.checkStreaks();
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { role: 'STUDENT', accountStatus: 'ACTIVE' },
      }),
    );
    expect(progress.sync).toHaveBeenCalledWith(STUDENT.id, { mode: 'live' });
  });

  it('does not tell a student whose streak is still running', async () => {
    syncReturns([1, 2, 3]); // last week done
    await service.checkStreaks();
    expect(notifications.sendStreakLostNotice).not.toHaveBeenCalled();
  });

  it('tells a student, once, that the week which just closed ended a 3-week streak', async () => {
    syncReturns([2, 3, 4]); // weeks 2-4 ago done, last week empty
    await service.checkStreaks();
    expect(notifications.sendStreakLostNotice).toHaveBeenCalledWith(
      STUDENT.email,
      { studentName: STUDENT.fullName, streakWeeks: 3 },
    );
  });

  it('does not repeat the notice when the streak had already ended earlier', async () => {
    syncReturns([5, 6]); // last two weeks empty
    await service.checkStreaks();
    expect(notifications.sendStreakLostNotice).not.toHaveBeenCalled();
  });

  it('does not notify a student who never had a streak', async () => {
    syncReturns([]);
    await service.checkStreaks();
    expect(notifications.sendStreakLostNotice).not.toHaveBeenCalled();
  });

  it('keeps going when one student fails', async () => {
    prisma.user.findMany.mockResolvedValue([
      STUDENT,
      { ...STUDENT, id: 'student-2' },
    ]);
    progress.sync
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({ result: { streak: { weeks: weeks([2]) } } });
    await service.checkStreaks();
    expect(progress.sync).toHaveBeenCalledTimes(2);
    expect(notifications.sendStreakLostNotice).toHaveBeenCalledTimes(1);
  });
});
