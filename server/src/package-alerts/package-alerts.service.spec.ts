import { Logger } from '@nestjs/common';
import type { PackageAlertLevel } from '@prisma/client';
import { PackageAlertsService } from './package-alerts.service';

const RATE = 100_000; // ৳1,000 a class, in poisha

interface AlertPayload {
  studentName: string;
  courseName: string;
  paymentUrl: string;
  creditsRemaining?: number;
}
interface StateUpdate {
  data: { lastState: string };
}

const student = {
  id: 'stu-1',
  fullName: 'Ada Lovelace',
  email: 'ada@example.com',
  billingContactEmail: 'parent@example.com' as string | null,
};

function setup(
  exactCredits: number | null,
  lastState: PackageAlertLevel = 'NONE',
  opts: { rateCents?: number; billingContactEmail?: string | null } = {},
) {
  const rateCents = opts.rateCents ?? RATE;
  const prisma = {
    user: {
      findMany: jest.fn().mockResolvedValue([
        {
          ...student,
          billingContactEmail:
            opts.billingContactEmail === undefined
              ? student.billingContactEmail
              : opts.billingContactEmail,
        },
      ]),
    },
    packageAlertState: {
      upsert: jest.fn().mockResolvedValue({ lastState, lastSentAt: null }),
      update: jest.fn<Promise<unknown>, [StateUpdate]>().mockResolvedValue({}),
    },
  };
  const ledger = {
    getSummary: jest.fn().mockResolvedValue({
      rateCents,
      lessonsRemaining: exactCredits,
      balanceCents: exactCredits === null ? 0 : exactCredits * rateCents,
      courseName: 'AI Builder Path',
    }),
  };
  const notifications = {
    sendPackageExpiringSoon: jest
      .fn<Promise<void>, [string, AlertPayload]>()
      .mockResolvedValue(undefined),
    sendPackageExpired: jest
      .fn<Promise<void>, [string, AlertPayload]>()
      .mockResolvedValue(undefined),
  };
  const service = new PackageAlertsService(
    prisma as never,
    ledger as never,
    notifications as never,
  );
  return { service, prisma, notifications };
}

describe('PackageAlertsService — the two class-credit emails', () => {
  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });
  afterAll(() => jest.restoreAllMocks());

  describe('1. running low: three or fewer credits', () => {
    it.each([3, 2, 1])(
      'is sent at %p credits, saying how many are left',
      async (credits) => {
        const { service, notifications } = setup(credits);
        await service.checkAllStudents();
        expect(notifications.sendPackageExpired).not.toHaveBeenCalled();
        expect(notifications.sendPackageExpiringSoon).toHaveBeenCalledTimes(1);
        expect(
          notifications.sendPackageExpiringSoon.mock.calls[0][1],
        ).toMatchObject({
          studentName: 'Ada Lovelace',
          creditsRemaining: credits,
          courseName: 'AI Builder Path',
        });
      },
    );

    it('is now sent at 3 (it used to wait for 2)', async () => {
      const { service, notifications } = setup(3);
      await service.checkAllStudents();
      expect(notifications.sendPackageExpiringSoon).toHaveBeenCalledTimes(1);
    });

    it('uses the credits the student sees: 3.9 is "3 credits"', async () => {
      const { service, notifications } = setup(3.9);
      await service.checkAllStudents();
      expect(notifications.sendPackageExpiringSoon).toHaveBeenCalledTimes(1);
      expect(
        notifications.sendPackageExpiringSoon.mock.calls[0][1].creditsRemaining,
      ).toBe(3);
    });

    it('is not sent at 4 or more credits', async () => {
      for (const credits of [4, 4.5, 8, 24]) {
        const { service, notifications, prisma } = setup(credits);
        await service.checkAllStudents();
        expect(notifications.sendPackageExpiringSoon).not.toHaveBeenCalled();
        expect(notifications.sendPackageExpired).not.toHaveBeenCalled();
        expect(prisma.packageAlertState.update).not.toHaveBeenCalled();
      }
    });
  });

  describe('2. no credits remaining', () => {
    it.each([0, 0.5, -1, -2, -9])('is sent at %p credits', async (credits) => {
      const { service, notifications } = setup(credits);
      await service.checkAllStudents();
      expect(notifications.sendPackageExpiringSoon).not.toHaveBeenCalled();
      expect(notifications.sendPackageExpired).toHaveBeenCalledTimes(1);
      expect(notifications.sendPackageExpired.mock.calls[0][1]).toMatchObject({
        studentName: 'Ada Lovelace',
        courseName: 'AI Builder Path',
      });
    });
  });

  describe('the "Make a payment" button', () => {
    it("opens the admin's WhatsApp with the default 8 credits requested", async () => {
      const { service, notifications } = setup(2);
      await service.checkAllStudents();
      const { paymentUrl } =
        notifications.sendPackageExpiringSoon.mock.calls[0][1];
      expect(paymentUrl.startsWith('https://wa.me/8801774878252?text=')).toBe(
        true,
      );
      expect(new URL(paymentUrl).searchParams.get('text')).toBe(
        "Hello! I'd like to purchase 8 class credits for Ada Lovelace. My current balance is 2 credits, and the total amount is ৳8,000. Could you please share the payment instructions?",
      );
    });

    it('includes the overdue credits of an overdrawn student in the amount', async () => {
      const { service, notifications } = setup(-2);
      await service.checkAllStudents();
      const { paymentUrl } = notifications.sendPackageExpired.mock.calls[0][1];
      expect(new URL(paymentUrl).searchParams.get('text')).toBe(
        "Hello! I'd like to purchase 8 class credits for Ada Lovelace. My current balance is -2 credits, and the total amount is ৳10,000. Could you please share the payment instructions?",
      );
    });

    it("uses the student's own per-class rate", async () => {
      const { service, notifications } = setup(1, 'NONE', {
        rateCents: 54_000,
      });
      await service.checkAllStudents();
      const { paymentUrl } =
        notifications.sendPackageExpiringSoon.mock.calls[0][1];
      expect(new URL(paymentUrl).searchParams.get('text')).toContain(
        'the total amount is ৳4,320',
      );
    });
  });

  describe('who gets it, and how often', () => {
    it('goes to the billing contact, else the student', async () => {
      const a = setup(2);
      await a.service.checkAllStudents();
      expect(a.notifications.sendPackageExpiringSoon.mock.calls[0][0]).toBe(
        'parent@example.com',
      );
      const b = setup(2, 'NONE', { billingContactEmail: null });
      await b.service.checkAllStudents();
      expect(b.notifications.sendPackageExpiringSoon.mock.calls[0][0]).toBe(
        'ada@example.com',
      );
    });

    it('is sent once: sitting in the same bracket never re-sends', async () => {
      const low = setup(2, 'EXPIRING_SOON');
      await low.service.checkAllStudents();
      expect(low.notifications.sendPackageExpiringSoon).not.toHaveBeenCalled();
      const out = setup(0, 'EXPIRED');
      await out.service.checkAllStudents();
      expect(out.notifications.sendPackageExpired).not.toHaveBeenCalled();
    });

    it('goes from the first email to the second when the credits run out', async () => {
      const { service, notifications, prisma } = setup(0, 'EXPIRING_SOON');
      await service.checkAllStudents();
      expect(notifications.sendPackageExpired).toHaveBeenCalledTimes(1);
      expect(
        prisma.packageAlertState.update.mock.calls[0][0].data.lastState,
      ).toBe('EXPIRED');
    });

    it('re-arms silently after a payment (no "good news" email)', async () => {
      const { service, notifications, prisma } = setup(8, 'EXPIRED');
      await service.checkAllStudents();
      expect(notifications.sendPackageExpiringSoon).not.toHaveBeenCalled();
      expect(notifications.sendPackageExpired).not.toHaveBeenCalled();
      expect(
        prisma.packageAlertState.update.mock.calls[0][0].data.lastState,
      ).toBe('NONE');
    });

    it('never guesses for a student with no per-class rate', async () => {
      const { service, notifications, prisma } = setup(2, 'NONE', {
        rateCents: 0,
      });
      await service.checkAllStudents();
      expect(notifications.sendPackageExpiringSoon).not.toHaveBeenCalled();
      expect(notifications.sendPackageExpired).not.toHaveBeenCalled();
      expect(prisma.packageAlertState.upsert).not.toHaveBeenCalled();
    });
  });
});
