import {
  BadRequestException,
  ConflictException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  TrialBookingService,
  isSlotConflictError,
  toPublicBooking,
} from './trial-booking.service';
import {
  addDaysToDateStr,
  dhakaToUtc,
  todayDhakaDateStr,
} from '../scheduling/dhaka-time.util';

// A window 3 days from now, 10:00–14:00 Bangladesh time, so every slot is in
// the future whenever the suite runs.
const DAY = addDaysToDateStr(todayDhakaDateStr(), 3);
const slot = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return dhakaToUtc(DAY, h, m);
};

const input = (start: Date, over: object = {}) => ({
  parentName: 'Sarah',
  parentEmail: 'sarah@example.com',
  parentPhone: '+8801712345678',
  childName: 'Alex',
  childAge: 10,
  subject: 'AI Builder',
  startAt: start,
  whatsappConsent: true,
  ...over,
});

function build(
  opts: { booked?: Date[]; existing?: any; windows?: any[] } = {},
) {
  const calls: string[] = [];
  const created: any[] = [];
  const tx: any = {
    $executeRaw: jest.fn(async () => {
      calls.push('lock');
      return 1;
    }),
    trialAvailabilityRule: { findMany: jest.fn().mockResolvedValue([]) },
    trialAvailabilityWindow: {
      findMany: jest
        .fn()
        .mockResolvedValue(
          opts.windows ?? [{ date: DAY, startMinute: 600, endMinute: 840 }],
        ),
    },
    trialBlockedPeriod: { findMany: jest.fn().mockResolvedValue([]) },
    trialLead: {
      findFirst: jest.fn(async () => {
        calls.push('findFirst');
        return opts.existing ?? null;
      }),
      findMany: jest.fn(async () =>
        (opts.booked ?? []).map((startAt) => ({ startAt })),
      ),
      findUnique: jest.fn(),
      create: jest.fn(async ({ data }) => {
        calls.push('create');
        const row = {
          id: 'abcdef12-0000',
          revision: 0,
          createdAt: new Date(),
          ...data,
        };
        created.push(row);
        return row;
      }),
      update: jest.fn(async ({ where, data }) => ({
        id: where.id,
        ...tx.__current,
        ...stripIncrement(data),
        revision: (tx.__current?.revision ?? 0) + 1,
      })),
    },
  };
  const prisma: any = {
    ...tx,
    $transaction: jest.fn(async (fn: any) => fn(tx)),
  };
  const audit = { log: jest.fn().mockResolvedValue({}) };
  const notifier = {
    afterBooked: jest.fn(),
    afterRescheduled: jest.fn(),
    afterCancelled: jest.fn(),
  };
  const whatsapp = {
    enqueue: jest.fn().mockResolvedValue(undefined),
    skipUnsent: jest.fn().mockResolvedValue(0),
  };
  const service = new TrialBookingService(
    prisma,
    audit as any,
    notifier as any,
    whatsapp as any,
  );
  return { service, tx, prisma, audit, notifier, whatsapp, calls, created };
}
const stripIncrement = (d: any) =>
  Object.fromEntries(
    Object.entries(d).filter(
      ([, v]) => typeof v !== 'object' || v instanceof Date,
    ),
  );

beforeAll(() => {
  jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
});
afterAll(() => jest.restoreAllMocks());

describe('TrialBookingService.createBooking', () => {
  it.each([5, 19, 0, 100])(
    'rejects age %i before touching the database',
    async (age) => {
      const { service, prisma } = build();
      await expect(
        service.createBooking(
          input(slot('10:00'), { childAge: age }),
          'PARENT',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    },
  );

  it.each([6, 18])('accepts age %i', async (age) => {
    const { service } = build();
    await expect(
      service.createBooking(input(slot('10:00'), { childAge: age }), 'PARENT'),
    ).resolves.toMatchObject({ alreadyBooked: false });
  });

  it('takes the advisory lock BEFORE reading bookings, then creates a 30-minute CONFIRMED appointment', async () => {
    const { service, calls, created, whatsapp } = build();
    const { lead } = await service.createBooking(
      input(slot('10:00')),
      'PARENT',
    );
    expect(calls.slice(0, 2)).toEqual(['lock', 'findFirst']);
    expect(calls).toContain('create');
    expect(created[0]).toMatchObject({
      appointmentStatus: 'CONFIRMED',
      status: 'BOOKED',
      bookedBy: 'PARENT',
      whatsappConsent: true,
    });
    expect(lead.endAt.getTime() - lead.startAt.getTime()).toBe(30 * 60_000);
    expect(whatsapp.enqueue).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      ['PARENT_CONFIRMATION', 'PARENT_REMINDER', 'ADMIN_ALERT'],
      expect.any(Date),
    );
  });

  it('a parent booking alerts the admin; an admin booking does not', async () => {
    const a = build();
    await a.service.createBooking(input(slot('10:00')), 'PARENT');
    expect(a.notifier.afterBooked).toHaveBeenCalledWith(expect.anything(), {
      alertAdmin: true,
    });

    const b = build();
    await b.service.createBooking(input(slot('10:00')), 'ADMIN', {
      id: 'admin-1',
      role: 'ADMIN',
    });
    expect(b.notifier.afterBooked).toHaveBeenCalledWith(expect.anything(), {
      alertAdmin: false,
    });
    expect(b.whatsapp.enqueue.mock.calls[0][2]).toEqual([
      'PARENT_CONFIRMATION',
      'PARENT_REMINDER',
    ]);
    expect(b.audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'admin-1',
        action: 'TRIAL_SCHEDULED_BY_ADMIN',
      }),
    );
  });

  it('rejects a slot that conflicts with an existing booking (30 min apart) with HTTP 409', async () => {
    const { service, tx } = build({ booked: [slot('11:00')] });
    await expect(
      service.createBooking(input(slot('11:30')), 'PARENT'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.trialLead.create).not.toHaveBeenCalled();
  });

  it('accepts a slot exactly 60 minutes from an existing booking', async () => {
    const { service } = build({ booked: [slot('11:00')] });
    await expect(
      service.createBooking(input(slot('12:00')), 'PARENT'),
    ).resolves.toBeDefined();
  });

  it.each([
    ['in the past', new Date('2020-01-01T10:00:00Z'), ConflictException],
    ['outside availability', slot('15:00'), ConflictException],
    ['overrunning the window end', slot('14:00'), ConflictException],
    [
      'off the half-hour grid',
      new Date(slot('10:00').getTime() + 7 * 60_000),
      BadRequestException,
    ],
  ])('rejects a slot %s without saving', async (_label, start, errType) => {
    const { service, tx } = build();
    await expect(
      service.createBooking(input(start as Date), 'PARENT'),
    ).rejects.toBeInstanceOf(errType as any);
    expect(tx.trialLead.create).not.toHaveBeenCalled();
  });

  it('a lost race that only the database exclusion constraint catches is still a clean 409', async () => {
    const { service, tx } = build();
    tx.trialLead.create.mockRejectedValue(
      Object.assign(
        new Error(
          'conflicting key value violates exclusion constraint "TrialLead_no_overlapping_slots"',
        ),
        {},
      ),
    );
    await expect(
      service.createBooking(input(slot('10:00')), 'PARENT'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('resubmitting the same slot for the same child is idempotent (no second row, no second notification)', async () => {
    const existing = {
      id: 'x',
      startAt: slot('10:00'),
      endAt: slot('10:30'),
      appointmentStatus: 'CONFIRMED',
    };
    const { service, tx, notifier } = build({ existing });
    await expect(
      service.createBooking(input(slot('10:00')), 'PARENT'),
    ).resolves.toMatchObject({ alreadyBooked: true });
    expect(tx.trialLead.create).not.toHaveBeenCalled();
    expect(notifier.afterBooked).not.toHaveBeenCalled();
  });

  it('refuses a second trial for the same child at a different time', async () => {
    const existing = {
      id: 'x',
      startAt: slot('10:00'),
      endAt: slot('10:30'),
      appointmentStatus: 'CONFIRMED',
    };
    const { service } = build({ existing });
    await expect(
      service.createBooking(input(slot('12:00')), 'PARENT'),
    ).rejects.toThrow(/already has a trial/);
  });

  it('a failing notifier or audit log can never fail a saved booking', async () => {
    const { service, notifier, audit } = build();
    notifier.afterBooked.mockImplementation(() => {
      throw new Error('boom');
    });
    audit.log.mockRejectedValue(new Error('audit down'));
    await expect(
      service.createBooking(input(slot('10:00')), 'PARENT'),
    ).resolves.toMatchObject({ alreadyBooked: false });
  });
});

describe('TrialBookingService.reschedule', () => {
  const current = (over: object = {}) => ({
    id: 'lead-1',
    appointmentStatus: 'CONFIRMED',
    revision: 0,
    parentEmail: 'sarah@example.com',
    parentName: 'Sarah',
    childName: 'Alex',
    childAge: 10,
    subject: 'AI',
    startAt: slot('10:00'),
    endAt: slot('10:30'),
    whatsappConsent: true,
    parentPhone: '+8801712345678',
    ...over,
  });
  const admin = { id: 'admin-1', role: 'ADMIN' };

  it('moves the appointment, re-queues ONLY the reminder, and emails the parent', async () => {
    const { service, tx, whatsapp, notifier, audit } = build();
    tx.trialLead.findUnique.mockResolvedValue(current());
    tx.__current = current();
    const res = await service.reschedule(
      'lead-1',
      slot('12:00'),
      admin,
      'Parent asked',
    );
    expect(res.lead.revision).toBe(1);
    expect(whatsapp.skipUnsent).toHaveBeenCalledWith(
      expect.anything(),
      'lead-1',
      expect.any(String),
      ['PARENT_REMINDER'],
    );
    expect(whatsapp.enqueue).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      ['PARENT_REMINDER'],
      expect.any(Date),
    );
    expect(notifier.afterRescheduled).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'lead-1' }),
      { startAt: slot('10:00'), endAt: slot('10:30') },
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'TRIAL_RESCHEDULED',
        reason: 'Parent asked',
        actorId: 'admin-1',
      }),
    );
  });

  it('applies the same buffer rule, ignoring the appointment itself', async () => {
    const { service, tx } = build({ booked: [slot('12:00')] });
    tx.trialLead.findUnique.mockResolvedValue(current());
    await expect(
      service.reschedule('lead-1', slot('12:30'), admin),
    ).rejects.toBeInstanceOf(ConflictException);
    // the conflict query excludes the appointment being moved
    expect(tx.trialLead.findMany.mock.calls[0][0].where.id).toEqual({
      not: 'lead-1',
    });
  });

  it.each([
    ['unknown id', null, NotFoundException],
    [
      'cancelled appointment',
      current({ appointmentStatus: 'CANCELLED' }),
      BadRequestException,
    ],
    [
      'appointment already over',
      current({
        startAt: new Date('2020-01-01T10:00:00Z'),
        endAt: new Date('2020-01-01T10:30:00Z'),
      }),
      BadRequestException,
    ],
    ['unchanged time', current(), BadRequestException],
  ])('refuses: %s', async (_l, row, err) => {
    const { service, tx } = build();
    tx.trialLead.findUnique.mockResolvedValue(row);
    await expect(
      service.reschedule('lead-1', row ? slot('10:00') : slot('12:00'), admin),
    ).rejects.toBeInstanceOf(err as any);
    expect(tx.trialLead.update).not.toHaveBeenCalled();
  });
});

describe('TrialBookingService.cancel', () => {
  const row = (over: object = {}) => ({
    id: 'lead-1',
    appointmentStatus: 'CONFIRMED',
    revision: 0,
    startAt: slot('10:00'),
    endAt: slot('10:30'),
    ...over,
  });
  const admin = { id: 'admin-1', role: 'ADMIN' };

  it('cancels, stops every unsent WhatsApp message, notifies the parent and audits with the reason', async () => {
    const { service, tx, whatsapp, notifier, audit } = build();
    tx.trialLead.findUnique.mockResolvedValue(row());
    tx.__current = row();
    const res = await service.cancel(
      'lead-1',
      admin,
      'Teacher unavailable',
      'Sorry!',
    );
    expect(res.alreadyCancelled).toBe(false);
    expect(tx.trialLead.update.mock.calls[0][0].data).toMatchObject({
      appointmentStatus: 'CANCELLED',
      cancelReason: 'Teacher unavailable',
    });
    expect(whatsapp.skipUnsent).toHaveBeenCalledWith(
      expect.anything(),
      'lead-1',
      expect.any(String),
    );
    expect(notifier.afterCancelled).toHaveBeenCalledWith(
      expect.anything(),
      'Sorry!',
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'TRIAL_CANCELLED',
        reason: 'Teacher unavailable',
      }),
    );
  });

  it('cancelling twice does not re-notify', async () => {
    const { service, tx, notifier } = build();
    tx.trialLead.findUnique.mockResolvedValue(
      row({ appointmentStatus: 'CANCELLED' }),
    );
    const res = await service.cancel('lead-1', admin, 'again');
    expect(res.alreadyCancelled).toBe(true);
    expect(notifier.afterCancelled).not.toHaveBeenCalled();
    expect(tx.trialLead.update).not.toHaveBeenCalled();
  });

  it('refuses unknown, legacy (no appointment) and already-finished trials', async () => {
    const { service, tx } = build();
    tx.trialLead.findUnique.mockResolvedValue(null);
    await expect(service.cancel('x', admin, 'reason')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    tx.trialLead.findUnique.mockResolvedValue({
      id: 'x',
      appointmentStatus: null,
      startAt: null,
      endAt: null,
    });
    await expect(service.cancel('x', admin, 'reason')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    tx.trialLead.findUnique.mockResolvedValue(
      row({
        startAt: new Date('2020-01-01T10:00:00Z'),
        endAt: new Date('2020-01-01T10:30:00Z'),
      }),
    );
    await expect(service.cancel('x', admin, 'reason')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

describe('TrialBookingService.getAvailability', () => {
  it('returns days with timezone, duration and no personal data', async () => {
    const { service } = build({ booked: [slot('11:00')] });
    const res = await service.getAvailability(DAY, addDaysToDateStr(DAY, 1));
    expect(res).toMatchObject({
      timezone: 'Asia/Dhaka',
      timezoneLabel: 'Bangladesh Time (GMT+6)',
      durationMinutes: 30,
      bufferMinutes: 30,
    });
    expect(res.days).toHaveLength(2);
    expect(res.days[0].slots).toEqual(
      [
        slot('10:00'),
        slot('12:00'),
        slot('12:30'),
        slot('13:00'),
        slot('13:30'),
      ].map((d) => d.toISOString()),
    );
    expect(res.days[1]).toMatchObject({ status: 'unavailable', slots: [] });
    expect(Object.keys(res).sort()).toEqual([
      'bufferMinutes',
      'days',
      'durationMinutes',
      'from',
      'generatedAt',
      'maxDate',
      'minDate',
      'timezone',
      'timezoneLabel',
      'to',
    ]);
  });

  it('can ignore one appointment (admin reschedule picker) so it does not block its own neighbours', async () => {
    const { service, tx } = build({ booked: [slot('11:00')] });
    await service.getAvailability(DAY, DAY, new Date(), 'lead-1');
    expect(tx.trialLead.findMany.mock.calls[0][0].where.id).toEqual({
      not: 'lead-1',
    });
    tx.trialLead.findMany.mockClear();
    await service.getAvailability(DAY, DAY);
    expect(tx.trialLead.findMany.mock.calls[0][0].where.id).toBeUndefined();
  });

  it.each([
    ['bad', DAY],
    [DAY, 'bad'],
    [DAY, '2000-01-01'],
    [DAY, addDaysToDateStr(DAY, 100)],
  ])('rejects range %s → %s', async (from, to) => {
    const { service } = build();
    await expect(service.getAvailability(from, to)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

describe('helpers', () => {
  it('recognises the exclusion-constraint error however it surfaces', () => {
    expect(
      isSlotConflictError(
        new Error(
          'violates exclusion constraint "TrialLead_no_overlapping_slots"',
        ),
      ),
    ).toBe(true);
    expect(
      isSlotConflictError({
        code: 'P2010',
        meta: { code: '23P01' },
        message: 'x',
      }),
    ).toBe(true);
    expect(isSlotConflictError(new Error('something else'))).toBe(false);
    expect(isSlotConflictError(undefined)).toBe(false);
  });

  it('the public booking view never contains contact details or notes', () => {
    const view = toPublicBooking({
      id: 'abcdef12-3456',
      startAt: slot('10:00'),
      endAt: slot('10:30'),
      childName: 'Alex',
      subject: 'AI',
      parentEmail: 'sarah@example.com',
      parentPhone: '+8801712345678',
      adminNotes: 'secret',
    } as any);
    expect(Object.keys(view).sort()).toEqual([
      'childName',
      'durationMinutes',
      'endAt',
      'program',
      'reference',
      'startAt',
      'timezone',
      'timezoneLabel',
    ]);
    expect(view.reference).toBe('ABCDEF12');
    expect(JSON.stringify(view)).not.toMatch(/sarah|8801712|secret/);
  });
});
