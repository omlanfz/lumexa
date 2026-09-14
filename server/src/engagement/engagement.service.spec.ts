import { Test, TestingModule } from '@nestjs/testing';
import { EngagementService } from './engagement.service';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { StudentsService } from '../students/students.service';

describe('EngagementService', () => {
  let service: EngagementService;
  let prisma: {
    user: { findMany: jest.Mock; update: jest.Mock };
    booking: { count: jest.Mock; findMany: jest.Mock; findFirst: jest.Mock };
  };
  let studentsService: { awardGems: jest.Mock; checkAndAwardBadges: jest.Mock };
  let notifications: { sendStreakLostNotice: jest.Mock; sendMonthlyDigest: jest.Mock };

  const STUDENT = {
    id: 'student-1',
    email: 'student@example.com',
    fullName: 'Ada Lovelace',
    streakWeeks: 0,
  };

  beforeEach(async () => {
    prisma = {
      user: { findMany: jest.fn(), update: jest.fn() },
      booking: { count: jest.fn(), findMany: jest.fn(), findFirst: jest.fn() },
    };
    studentsService = {
      awardGems: jest.fn().mockResolvedValue(undefined),
      checkAndAwardBadges: jest.fn().mockResolvedValue([]),
    };
    notifications = {
      sendStreakLostNotice: jest.fn().mockResolvedValue(undefined),
      sendMonthlyDigest: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EngagementService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
        { provide: StudentsService, useValue: studentsService },
      ],
    }).compile();

    service = module.get<EngagementService>(EngagementService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  function fixNow(iso: string) {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(iso));
  }

  it('increments the streak for a student who completed a lesson last week', async () => {
    // "Now" is Monday 2024-01-15 00:05 UTC, so last week is
    // Sun 2024-01-07 .. Sun 2024-01-14 (exclusive).
    fixNow('2024-01-15T00:05:00Z');
    prisma.user.findMany.mockResolvedValue([{ ...STUDENT, streakWeeks: 2 }]);
    prisma.booking.count.mockResolvedValue(1);

    await service.checkStreaks();

    expect(prisma.booking.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          studentUserId: STUDENT.id,
          paymentStatus: 'CAPTURED',
        }),
      }),
    );
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: STUDENT.id },
      data: { streakWeeks: { increment: 1 } },
    });
  });

  it('grows the streak week over week for consecutive completed weeks', async () => {
    fixNow('2024-01-15T00:05:00Z');
    prisma.booking.count.mockResolvedValue(1);

    prisma.user.findMany.mockResolvedValue([{ ...STUDENT, streakWeeks: 3 }]);
    await service.checkStreaks();
    expect(prisma.user.update).toHaveBeenLastCalledWith({
      where: { id: STUDENT.id },
      data: { streakWeeks: { increment: 1 } },
    });

    // Simulate the next week's run continuing from the updated count.
    prisma.user.findMany.mockResolvedValue([{ ...STUDENT, streakWeeks: 4 }]);
    await service.checkStreaks();
    expect(prisma.user.update).toHaveBeenLastCalledWith({
      where: { id: STUDENT.id },
      data: { streakWeeks: { increment: 1 } },
    });
  });

  it('awards a 4-week streak milestone bonus when the streak reaches 4', async () => {
    fixNow('2024-01-15T00:05:00Z');
    prisma.user.findMany.mockResolvedValue([{ ...STUDENT, streakWeeks: 3 }]);
    prisma.booking.count.mockResolvedValue(1);

    await service.checkStreaks();

    expect(studentsService.awardGems).toHaveBeenCalledWith(
      STUDENT.id,
      10,
      'STREAK_MILESTONE',
      expect.any(String),
    );
  });

  it('resets the streak to 0 for a week with zero completed lessons', async () => {
    fixNow('2024-01-15T00:05:00Z');
    prisma.user.findMany.mockResolvedValue([{ ...STUDENT, streakWeeks: 5 }]);
    prisma.booking.count.mockResolvedValue(0);

    await service.checkStreaks();

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: STUDENT.id },
      data: { streakWeeks: 0 },
    });
    expect(notifications.sendStreakLostNotice).toHaveBeenCalledWith(
      STUDENT.email,
      expect.objectContaining({ streakWeeks: 5 }),
    );
  });

  it('does not send a streak-lost notice when the streak was already 0', async () => {
    fixNow('2024-01-15T00:05:00Z');
    prisma.user.findMany.mockResolvedValue([{ ...STUDENT, streakWeeks: 0 }]);
    prisma.booking.count.mockResolvedValue(0);

    await service.checkStreaks();

    expect(notifications.sendStreakLostNotice).not.toHaveBeenCalled();
  });

  it('leaves the streak at 0 for a student with no booking history at all', async () => {
    fixNow('2024-01-15T00:05:00Z');
    prisma.user.findMany.mockResolvedValue([{ ...STUDENT, streakWeeks: 0 }]);
    prisma.booking.count.mockResolvedValue(0);

    await service.checkStreaks();

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: STUDENT.id },
      data: { streakWeeks: 0 },
    });
    expect(studentsService.awardGems).not.toHaveBeenCalled();
  });

  it('buckets the evaluated week to the calendar Sunday-Saturday boundary regardless of the exact weekday "now" falls on', async () => {
    // Run on a Wednesday instead of the usual Monday cron slot — the
    // evaluated window should still be the *previous* full calendar week,
    // not a shifted 7-day lookback from "now".
    fixNow('2024-01-17T12:00:00Z'); // Wednesday
    prisma.user.findMany.mockResolvedValue([{ ...STUDENT, streakWeeks: 0 }]);
    prisma.booking.count.mockResolvedValue(1);

    await service.checkStreaks();

    const call = prisma.booking.count.mock.calls[0][0];
    const { gte, lt } = call.where.shift.end;

    // Week start for "now" (Wed Jan 17) is Sun Jan 14; last week is
    // Sun Jan 7 (inclusive) through Sun Jan 14 (exclusive).
    expect(gte.toISOString()).toBe('2024-01-07T00:00:00.000Z');
    expect(lt.toISOString()).toBe('2024-01-14T00:00:00.000Z');
  });

  it('excludes a booking whose shift ends exactly at the week boundary from the prior week (boundary is exclusive)', async () => {
    fixNow('2024-01-15T00:05:00Z');
    prisma.user.findMany.mockResolvedValue([{ ...STUDENT, streakWeeks: 0 }]);

    let capturedWhere: any;
    prisma.booking.count.mockImplementation(async (args: any) => {
      capturedWhere = args.where;
      return 0;
    });

    await service.checkStreaks();

    const { gte, lt } = capturedWhere.shift.end;
    expect(gte.toISOString()).toBe('2024-01-07T00:00:00.000Z');
    expect(lt.toISOString()).toBe('2024-01-14T00:00:00.000Z');
  });
});
