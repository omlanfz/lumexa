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

const ACTIVE_TEACHER = {
  id: 'teacher-1',
  isSuspended: false,
  user: { role: 'TEACHER', accountStatus: 'ACTIVE', fullName: 'Ms Karim' },
};

function build(
  opts: {
    booked?: Date[];
    existing?: any;
    windows?: any[];
    teacher?: any;
  } = {},
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
        revision: (tx.__current?.revision ?? 0) + (data.revision ? 1 : 0),
      })),
    },
    // Teacher validation + conflict check (see assertTeacherAssignable).
    teacherProfile: {
      findUnique: jest.fn(async () => opts.teacher ?? ACTIVE_TEACHER),
    },
    scheduledLesson: { findFirst: jest.fn().mockResolvedValue(null) },
    batchSession: { findFirst: jest.fn().mockResolvedValue(null) },
    shift: { findFirst: jest.fn().mockResolvedValue(null) },
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
    afterTeacherAssigned: jest.fn(),
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
      // No class link and no reminder yet: a teacher has not been assigned.
      ['PARENT_CONFIRMATION', 'ADMIN_ALERT'],
      expect.any(Date),
    );
  });

  it('mints a unique, unguessable guest token at booking and never queues a link message', async () => {
    const a = build();
    const b = build();
    await a.service.createBooking(input(slot('10:00')), 'PARENT');
    await b.service.createBooking(input(slot('10:00')), 'PARENT');
    const [t1, t2] = [a.created[0].guestToken, b.created[0].guestToken];
    expect(t1).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(t2).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(t1).not.toBe(t2);
    expect(a.created[0].teacherId).toBeUndefined();
    expect(a.created[0].reminderDueAt).toBeUndefined();
    const queued = a.whatsapp.enqueue.mock.calls.flatMap((c: any[]) => c[2]);
    expect(queued).not.toContain('PARENT_CLASS_DETAILS');
    expect(queued).not.toContain('PARENT_REMINDER');
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

  it('moves an unstaffed appointment, queues no link or reminder, and emails the parent', async () => {
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
      ['PARENT_REMINDER', 'PARENT_CLASS_DETAILS'],
    );
    // No teacher → nothing about a class link is (re)queued.
    expect(whatsapp.enqueue).not.toHaveBeenCalled();
    expect(tx.trialLead.update.mock.calls[0][0].data).toMatchObject({
      reminderDueAt: null,
      reminderEmailSentAt: null,
    });
    expect(notifier.afterRescheduled).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'lead-1' }),
      expect.objectContaining({
        startAt: slot('10:00'),
        endAt: slot('10:30'),
      }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'TRIAL_RESCHEDULED',
        reason: 'Parent asked',
        actorId: 'admin-1',
      }),
    );
  });

  it('a staffed trial: re-plans the 1-hour reminder for the new time and re-sends the details + link', async () => {
    const { service, tx, whatsapp } = build();
    const staffed = current({
      teacherId: 'teacher-1',
      guestToken: 'tok',
      reminderDueAt: new Date('2020-01-01T00:00:00Z'),
      reminderEmailSentAt: new Date('2020-01-01T00:00:00Z'),
    });
    tx.trialLead.findUnique.mockResolvedValue(staffed);
    tx.__current = staffed;
    await service.reschedule('lead-1', slot('12:00'), admin);
    const data = tx.trialLead.update.mock.calls[0][0].data;
    // exactly one hour before the NEW start, and the "already sent" flag reset
    expect(data.reminderDueAt).toEqual(
      new Date(slot('12:00').getTime() - 3600_000),
    );
    expect(data.reminderEmailSentAt).toBeNull();
    expect(whatsapp.enqueue).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      ['PARENT_CLASS_DETAILS', 'PARENT_REMINDER'],
      expect.any(Date),
    );
  });

  it('refuses a new time when the assigned teacher is busy then (nothing is saved)', async () => {
    const { service, tx } = build();
    const staffed = current({ teacherId: 'teacher-1', guestToken: 'tok' });
    tx.trialLead.findUnique.mockResolvedValue(staffed);
    tx.scheduledLesson.findFirst.mockResolvedValue({ id: 'lesson-9' });
    await expect(
      service.reschedule('lead-1', slot('12:00'), admin),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.trialLead.update).not.toHaveBeenCalled();
  });

  it('can move the class to another teacher in the same step', async () => {
    const { service, tx } = build();
    const staffed = current({ teacherId: 'teacher-1', guestToken: 'tok' });
    tx.trialLead.findUnique.mockResolvedValue(staffed);
    tx.__current = staffed;
    await service.reschedule('lead-1', slot('12:00'), admin, undefined, {
      teacherId: 'teacher-2',
    });
    expect(tx.teacherProfile.findUnique.mock.calls[0][0].where).toEqual({
      id: 'teacher-2',
    });
    expect(tx.trialLead.update.mock.calls[0][0].data.teacherId).toBe(
      'teacher-2',
    );
  });

  it('refuses to staff a trial as a side effect of rescheduling (assignment is its own step)', async () => {
    const { service, tx } = build();
    tx.trialLead.findUnique.mockResolvedValue(current());
    await expect(
      service.reschedule('lead-1', slot('12:00'), admin, undefined, {
        teacherId: 'teacher-2',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.trialLead.update).not.toHaveBeenCalled();
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
      reminderDueAt: null, // no reminder for a cancelled class
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

describe('TrialBookingService.assignTeacher', () => {
  const lead = (over: object = {}) => ({
    id: 'lead-1',
    appointmentStatus: 'CONFIRMED',
    revision: 0,
    parentEmail: 'sarah@example.com',
    parentName: 'Sarah',
    childName: 'Alex',
    startAt: new Date(Date.now() + 5 * 3600_000),
    endAt: new Date(Date.now() + 5.5 * 3600_000),
    teacherId: null,
    guestToken: 'tok',
    whatsappConsent: true,
    parentPhone: '+8801712345678',
    ...over,
  });
  const admin = { id: 'admin-1', role: 'ADMIN' };
  const setup = (row: any, opts: Parameters<typeof build>[0] = {}) => {
    const b = build(opts);
    b.tx.trialLead.findUnique.mockResolvedValue(row);
    b.tx.__current = row;
    return b;
  };

  it('first assignment: saves the teacher, plans the reminder 1h before, queues link + reminder, notifies the parent', async () => {
    const row = lead();
    const { service, tx, whatsapp, notifier, audit } = setup(row);
    const res = await service.assignTeacher('lead-1', 'teacher-1', admin);
    expect(res.firstAssignment).toBe(true);
    const data = tx.trialLead.update.mock.calls[0][0].data;
    expect(data.teacherId).toBe('teacher-1');
    expect(data.reminderDueAt).toEqual(
      new Date(row.startAt.getTime() - 3600_000),
    );
    expect(data.reminderEmailSentAt).toBeNull();
    expect(whatsapp.enqueue).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      ['PARENT_CLASS_DETAILS', 'PARENT_REMINDER'],
      expect.any(Date),
    );
    expect(notifier.afterTeacherAssigned).toHaveBeenCalledTimes(1);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'TRIAL_TEACHER_ASSIGNED' }),
    );
  });

  it('assigned less than an hour before the start: the link goes out now and NO reminder is planned', async () => {
    const row = lead({
      startAt: new Date(Date.now() + 40 * 60_000),
      endAt: new Date(Date.now() + 70 * 60_000),
    });
    const { service, tx, notifier } = setup(row);
    await service.assignTeacher('lead-1', 'teacher-1', admin);
    expect(tx.trialLead.update.mock.calls[0][0].data.reminderDueAt).toBeNull();
    expect(notifier.afterTeacherAssigned).toHaveBeenCalledTimes(1);
  });

  it('changing the teacher moves the class but does not message the parent again or touch the reminder', async () => {
    const row = lead({ teacherId: 'teacher-0' });
    const { service, tx, whatsapp, notifier, audit } = setup(row);
    const res = await service.assignTeacher('lead-1', 'teacher-1', admin);
    expect(res.firstAssignment).toBe(false);
    const data = tx.trialLead.update.mock.calls[0][0].data;
    expect(data.teacherId).toBe('teacher-1');
    expect(data).not.toHaveProperty('reminderDueAt');
    expect(whatsapp.enqueue).not.toHaveBeenCalled();
    expect(notifier.afterTeacherAssigned).not.toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'TRIAL_TEACHER_CHANGED',
        beforeData: { teacherId: 'teacher-0' },
      }),
    );
  });

  it('checks the teacher is free for the whole session, excluding this trial itself', async () => {
    const { service, tx } = setup(lead());
    await service.assignTeacher('lead-1', 'teacher-1', admin);
    expect(tx.trialLead.findFirst.mock.calls.at(-1)![0].where).toMatchObject({
      teacherId: 'teacher-1',
      appointmentStatus: 'CONFIRMED',
      id: { not: 'lead-1' },
    });
  });

  it.each([
    ['another lesson', 'scheduledLesson'],
    ['a batch class', 'batchSession'],
    ['a booked shift', 'shift'],
  ])(
    'refuses (409) a teacher who has %s then — nothing is saved or sent',
    async (_l, table) => {
      const { service, tx, whatsapp, notifier } = setup(lead());
      (tx as any)[table].findFirst.mockResolvedValue({ id: 'busy' });
      await expect(
        service.assignTeacher('lead-1', 'teacher-1', admin),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(tx.trialLead.update).not.toHaveBeenCalled();
      expect(whatsapp.enqueue).not.toHaveBeenCalled();
      expect(notifier.afterTeacherAssigned).not.toHaveBeenCalled();
    },
  );

  it('refuses another trial of the same teacher at an overlapping time', async () => {
    const { service, tx } = setup(lead());
    tx.trialLead.findFirst.mockResolvedValue({ id: 'other-trial' });
    await expect(
      service.assignTeacher('lead-1', 'teacher-1', admin),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it.each([
    ['unknown teacher', null],
    [
      'not a teacher account',
      { ...ACTIVE_TEACHER, user: { ...ACTIVE_TEACHER.user, role: 'ADMIN' } },
    ],
  ])('refuses %s with 404', async (_l, teacher) => {
    const { service, tx } = setup(lead(), { teacher });
    tx.teacherProfile.findUnique.mockResolvedValue(teacher);
    await expect(
      service.assignTeacher('lead-1', 'teacher-1', admin),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it.each([
    ['suspended profile', { ...ACTIVE_TEACHER, isSuspended: true }],
    [
      'deactivated account',
      {
        ...ACTIVE_TEACHER,
        user: { ...ACTIVE_TEACHER.user, accountStatus: 'DEACTIVATED' },
      },
    ],
  ])('refuses a %s', async (_l, teacher) => {
    const { service } = setup(lead(), { teacher });
    await expect(
      service.assignTeacher('lead-1', 'teacher-1', admin),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each([
    ['unknown trial', null, NotFoundException],
    [
      'cancelled trial',
      lead({ appointmentStatus: 'CANCELLED' }),
      BadRequestException,
    ],
    [
      'completed trial',
      lead({ appointmentStatus: 'COMPLETED' }),
      BadRequestException,
    ],
    [
      'trial whose joining window has closed',
      lead({
        startAt: new Date(Date.now() - 3 * 3600_000),
        endAt: new Date(Date.now() - 2.5 * 3600_000),
      }),
      BadRequestException,
    ],
    [
      'same teacher again',
      lead({ teacherId: 'teacher-1' }),
      BadRequestException,
    ],
  ])('refuses: %s', async (_l, row, err) => {
    const { service, tx, notifier } = setup(row);
    await expect(
      service.assignTeacher('lead-1', 'teacher-1', admin),
    ).rejects.toBeInstanceOf(err as any);
    expect(tx.trialLead.update).not.toHaveBeenCalled();
    expect(notifier.afterTeacherAssigned).not.toHaveBeenCalled();
  });

  it('a failing notifier can never fail a saved assignment', async () => {
    const { service, notifier } = setup(lead());
    notifier.afterTeacherAssigned.mockImplementation(() => {
      throw new Error('smtp down');
    });
    await expect(
      service.assignTeacher('lead-1', 'teacher-1', admin),
    ).resolves.toMatchObject({ firstAssignment: true });
  });
});

describe('TrialBookingService.markOutcome', () => {
  const past = {
    id: 'lead-1',
    appointmentStatus: 'CONFIRMED',
    startAt: new Date(Date.now() - 3600_000),
    endAt: new Date(Date.now() - 1800_000),
  };
  const admin = { id: 'admin-1', role: 'ADMIN' };

  it.each(['COMPLETED', 'MISSED'] as const)(
    'marks a started trial %s, stops unsent messages and audits',
    async (outcome) => {
      const { service, tx, whatsapp, audit } = build();
      tx.trialLead.findUnique.mockResolvedValue(past);
      tx.__current = past;
      await service.markOutcome('lead-1', outcome, admin, 'note');
      expect(tx.trialLead.update.mock.calls[0][0].data).toMatchObject({
        appointmentStatus: outcome,
        reminderDueAt: null,
      });
      expect(whatsapp.skipUnsent).toHaveBeenCalled();
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: outcome === 'COMPLETED' ? 'TRIAL_COMPLETED' : 'TRIAL_MISSED',
        }),
      );
    },
  );

  it('can correct Missed → Completed', async () => {
    const { service, tx } = build();
    tx.trialLead.findUnique.mockResolvedValue({
      ...past,
      appointmentStatus: 'MISSED',
    });
    await expect(
      service.markOutcome('lead-1', 'COMPLETED', admin),
    ).resolves.toBeDefined();
  });

  it.each([
    [
      'before it has started',
      {
        ...past,
        startAt: new Date(Date.now() + 3600_000),
        endAt: new Date(Date.now() + 5400_000),
      },
    ],
    ['a cancelled trial', { ...past, appointmentStatus: 'CANCELLED' }],
    ['a lead without an appointment', { ...past, appointmentStatus: null }],
  ])('refuses %s', async (_l, row) => {
    const { service, tx } = build();
    tx.trialLead.findUnique.mockResolvedValue(row);
    await expect(
      service.markOutcome('lead-1', 'MISSED', admin),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.trialLead.update).not.toHaveBeenCalled();
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
