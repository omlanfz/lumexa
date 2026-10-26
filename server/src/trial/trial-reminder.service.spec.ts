import { Logger } from '@nestjs/common';
import { TrialReminderService } from './trial-reminder.service';

beforeAll(() => {
  jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
});
afterAll(() => jest.restoreAllMocks());

const NOW = new Date('2026-11-10T09:00:00Z');
const due = (over: object = {}) => ({
  id: 'lead-1',
  revision: 0,
  appointmentStatus: 'CONFIRMED',
  teacherId: 'tp-1',
  guestToken: 'tok',
  startAt: new Date('2026-11-10T10:00:00Z'),
  endAt: new Date('2026-11-10T10:30:00Z'),
  reminderDueAt: NOW,
  reminderEmailSentAt: null,
  ...over,
});

function build(rows: any[] = [due()]) {
  const prisma: any = {
    trialLead: {
      findMany: jest.fn().mockResolvedValue(rows),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };
  const notifier: any = {
    sendReminderEmail: jest.fn().mockResolvedValue(undefined),
  };
  return {
    prisma,
    notifier,
    service: new TrialReminderService(prisma, notifier),
  };
}

describe('TrialReminderService', () => {
  it('selects only staffed, confirmed, not-yet-reminded trials that are due and have not started', async () => {
    const { service, prisma } = build([]);
    await service.sendDueEmailReminders(NOW);
    expect(prisma.trialLead.findMany.mock.calls[0][0].where).toMatchObject({
      appointmentStatus: 'CONFIRMED',
      teacherId: { not: null },
      guestToken: { not: null },
      reminderDueAt: { lte: NOW },
      reminderEmailSentAt: null,
      startAt: { gt: NOW },
    });
  });

  it('sends the email first, then records it as sent — guarded by revision', async () => {
    const { service, prisma, notifier } = build([due({ revision: 2 })]);
    const order: string[] = [];
    notifier.sendReminderEmail.mockImplementation(async () =>
      order.push('email'),
    );
    prisma.trialLead.updateMany.mockImplementation(async () => {
      order.push('mark');
      return { count: 1 };
    });
    expect(await service.sendDueEmailReminders(NOW)).toBe(1);
    expect(order).toEqual(['email', 'mark']);
    expect(prisma.trialLead.updateMany.mock.calls[0][0]).toMatchObject({
      // a reschedule in between (revision bumped, reminder reset) is not overwritten
      where: { id: 'lead-1', revision: 2, reminderEmailSentAt: null },
    });
  });

  it('a failing send is left unmarked so the next sweep retries it — and one failure does not stop the others', async () => {
    const { service, prisma, notifier } = build([
      due({ id: 'a' }),
      due({ id: 'b' }),
    ]);
    notifier.sendReminderEmail
      .mockRejectedValueOnce(new Error('db down'))
      .mockResolvedValueOnce(undefined);
    expect(await service.sendDueEmailReminders(NOW)).toBe(1);
    expect(prisma.trialLead.updateMany).toHaveBeenCalledTimes(1);
    expect(prisma.trialLead.updateMany.mock.calls[0][0].where.id).toBe('b');
  });

  it('the cron entry point never throws and never overlaps itself', async () => {
    const { service, prisma } = build();
    prisma.trialLead.findMany.mockRejectedValueOnce(new Error('db down'));
    await expect(service.sweep()).resolves.toBeUndefined();

    let release!: () => void;
    prisma.trialLead.findMany.mockImplementationOnce(
      () => new Promise((r) => (release = () => r([]))),
    );
    const first = service.sweep();
    await service.sweep(); // returns immediately: a run is in progress
    expect(prisma.trialLead.findMany).toHaveBeenCalledTimes(2);
    release();
    await first;
  });
});
