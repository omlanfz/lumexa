import { NotFoundException } from '@nestjs/common';
import { StudentLedgerEntryType } from '@prisma/client';
import { StudentsService } from './students.service';

const RATE = 100_000; // ৳1,000 a class, in poisha

interface Opts {
  balance?: number; // whole credits, negative when overdrawn
  rateCents?: number;
  classType?: 'ONE_TO_ONE' | 'BATCH' | null;
  history?: unknown[];
  user?: unknown;
}

function setup(opts: Opts = {}) {
  const prisma = {
    user: {
      findUnique: jest.fn().mockResolvedValue(
        opts.user === undefined
          ? {
              id: 'stu-1',
              fullName: 'Ada Lovelace',
              assignedClassType:
                opts.classType === undefined ? 'ONE_TO_ONE' : opts.classType,
            }
          : opts.user,
      ),
    },
  };
  const ledger = {
    getSummary: jest.fn().mockResolvedValue({
      rateCents: opts.rateCents === undefined ? RATE : opts.rateCents,
      courseName: 'AI Builder Path',
      credits: { remainingWhole: opts.balance ?? 5 },
    }),
    getCredits: jest
      .fn()
      .mockResolvedValue({ remainingWhole: opts.balance ?? 5 }),
    getPaymentHistory: jest.fn().mockResolvedValue(opts.history ?? []),
  };
  const progress = {
    sync: jest.fn().mockResolvedValue({
      result: {
        rank: { rank: 'STARCHILD', icon: '🌟' },
        sessions: 0,
        streak: { current: 0 },
      },
    }),
  };
  const service = new StudentsService(
    prisma as never,
    {} as never,
    {} as never,
    {} as never,
    progress as never,
    ledger as never,
  );
  return { service, prisma, ledger };
}

describe('StudentsService.getMyPayments — the Payments & Credits page data', () => {
  it("reports the balance and a quote for each of 8, 16 and 24 credits at the student's own rate", async () => {
    const { service } = setup({ balance: 5 });
    const view = await service.getMyPayments('stu-1');

    expect(view.studentName).toBe('Ada Lovelace');
    expect(view.credits).toEqual({ remaining: 5, overdue: 0, level: 'ok' });
    expect(view.pricing).toEqual({
      rateCents: RATE,
      classType: 'ONE_TO_ONE',
      courseName: 'AI Builder Path',
    });
    expect(view.defaultPackage).toBe(8);
    expect(view.packages.map((p) => [p.credits, p.totalCents])).toEqual([
      [8, 800_000],
      [16, 1_600_000],
      [24, 2_400_000],
    ]);
  });

  it('prices a batch student at their own (batch) rate', async () => {
    const { service } = setup({ rateCents: 60_000, classType: 'BATCH' });
    const view = await service.getMyPayments('stu-1');
    expect(view.pricing.classType).toBe('BATCH');
    expect(view.packages.map((p) => p.totalCents)).toEqual([
      480_000, 960_000, 1_440_000,
    ]);
  });

  it('shows a negative balance, the overdue credits, and charges them on top of every package', async () => {
    const { service } = setup({ balance: -2 });
    const view = await service.getMyPayments('stu-1');

    expect(view.credits).toEqual({
      remaining: -2,
      overdue: 2,
      level: 'exhausted',
    });
    expect(view.packages.map((p) => p.credits)).toEqual([8, 16, 24]); // never reduced
    expect(view.packages[0]).toMatchObject({
      credits: 8,
      packageCents: 800_000,
      overdueCredits: 2,
      overdueCents: 200_000,
      totalCents: 1_000_000,
      lessonsToRecord: 10,
    });
    expect(view.packages[2].totalCents).toBe(2_600_000);
  });

  it('has no overdue credits at a zero or positive balance', async () => {
    for (const balance of [0, 1, 3, 8]) {
      const { service } = setup({ balance });
      const view = await service.getMyPayments('stu-1');
      expect(view.credits.overdue).toBe(0);
      for (const p of view.packages) {
        expect(p.overdueCredits).toBe(0);
        expect(p.overdueCents).toBe(0);
        expect(p.totalCents).toBe(p.packageCents);
      }
    }
  });

  it.each([
    [24, 'ok'],
    [4, 'ok'],
    [3, 'low'],
    [1, 'low'],
    [0, 'exhausted'],
    [-3, 'exhausted'],
  ])('at %p credits the level is %p', async (balance, level) => {
    const { service } = setup({ balance });
    expect((await service.getMyPayments('stu-1')).credits.level).toBe(level);
  });

  it('every package carries a WhatsApp link whose message matches the quote on screen', async () => {
    const { service } = setup({ balance: -2 });
    const view = await service.getMyPayments('stu-1');
    for (const p of view.packages) {
      const text = new URL(p.whatsappUrl).searchParams.get('text');
      expect(text).toBe(p.whatsappMessage);
      expect(text).toContain(
        `purchase ${p.credits} class credits for Ada Lovelace`,
      );
      expect(text).toContain('My current balance is -2 credits');
    }
    expect(view.packages[0].whatsappMessage).toContain(
      'the total amount is ৳10,000.',
    );
    expect(view.packages[1].whatsappMessage).toContain(
      'the total amount is ৳18,000.',
    );
    expect(view.packages[2].whatsappMessage).toContain(
      'the total amount is ৳26,000.',
    );
  });

  it('never invents a price for a student with no per-class rate yet', async () => {
    const { service } = setup({ balance: 0, rateCents: 0 });
    const view = await service.getMyPayments('stu-1');
    expect(view.pricing.rateCents).toBeNull();
    for (const p of view.packages) {
      expect(p.totalCents).toBeNull();
      expect(p.whatsappMessage).toContain(
        'share the price and payment instructions',
      );
    }
  });

  describe('payment history', () => {
    const rows = [
      {
        id: 'e2',
        type: StudentLedgerEntryType.REFUND,
        amountCents: -200_000,
        lessonsPurchased: null,
        courseName: 'AI Builder Path',
        createdAt: new Date('2026-10-20T10:00:00Z'),
      },
      {
        id: 'e1',
        type: StudentLedgerEntryType.PAYMENT_RECEIVED,
        amountCents: 800_000,
        lessonsPurchased: 8,
        courseName: 'AI Builder Path',
        createdAt: new Date('2026-10-01T10:00:00Z'),
      },
    ];

    it('lists the date, amount, credits purchased and status of each payment', async () => {
      const { service } = setup({ history: rows });
      const { history } = await service.getMyPayments('stu-1');
      expect(history).toEqual([
        {
          id: 'e2',
          date: new Date('2026-10-20T10:00:00Z'),
          kind: 'REFUND',
          status: 'REFUNDED',
          amountCents: -200_000,
          credits: null,
          courseName: 'AI Builder Path',
        },
        {
          id: 'e1',
          date: new Date('2026-10-01T10:00:00Z'),
          kind: 'PAYMENT',
          status: 'CONFIRMED',
          amountCents: 800_000,
          credits: 8,
          courseName: 'AI Builder Path',
        },
      ]);
    });

    it('exposes nothing but those fields (no admin notes, payment details or admin names)', async () => {
      const { service } = setup({
        history: [
          {
            ...rows[1],
            description: 'internal note',
            paymentDetail: 'bKash 017…',
            createdByAdmin: { fullName: 'Admin' },
          },
        ],
      });
      const { history } = await service.getMyPayments('stu-1');
      expect(Object.keys(history[0]).sort()).toEqual(
        [
          'amountCents',
          'courseName',
          'credits',
          'date',
          'id',
          'kind',
          'status',
        ].sort(),
      );
    });

    it("asks the ledger for the student's own history only, via the safe projection", async () => {
      const { service, ledger } = setup({ history: rows });
      await service.getMyPayments('stu-1');
      expect(ledger.getPaymentHistory).toHaveBeenCalledWith('stu-1');
    });
  });

  it('is read-only: it only reads the ledger — asking for credits never adds any', async () => {
    const { service, ledger } = setup({ balance: -2 });
    await service.getMyPayments('stu-1');
    expect(Object.keys(ledger).sort()).toEqual(
      ['getCredits', 'getPaymentHistory', 'getSummary'].sort(),
    ); // no recordPayment / recordAdjustment exists on the stub, so none was possible
  });

  it('is a 404 for an unknown student', async () => {
    const { service } = setup({ user: null });
    await expect(service.getMyPayments('nope')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('StudentsService.getMyNavSummary — the navbar credit pill', () => {
  async function pill(balance: number) {
    const { service } = setup({ balance });
    jest.spyOn(service as never, 'rankPayload').mockReturnValue({} as never);
    (
      service as unknown as { prisma: { user: { findUnique: jest.Mock } } }
    ).prisma.user.findUnique.mockResolvedValue({
      id: 'stu-1',
      fullName: 'Ada',
      avatarUrl: null,
    });
    return (await service.getMyNavSummary('stu-1')).credits;
  }

  it.each([
    [24, { remaining: 24, low: false, exhausted: false }],
    [5, { remaining: 5, low: false, exhausted: false }],
    [4, { remaining: 4, low: false, exhausted: false }],
    [3, { remaining: 3, low: true, exhausted: false }], // yellow from 3 (it used to be 2)
    [2, { remaining: 2, low: true, exhausted: false }],
    [1, { remaining: 1, low: true, exhausted: false }],
    [0, { remaining: 0, low: false, exhausted: true }],
  ])('%p credits', async (balance, expected) => {
    expect(await pill(balance)).toEqual(expected);
  });

  it('shows a negative balance instead of stopping at 0', async () => {
    expect(await pill(-2)).toEqual({
      remaining: -2,
      low: false,
      exhausted: true,
    });
    expect((await pill(-11)).remaining).toBe(-11);
  });
});
