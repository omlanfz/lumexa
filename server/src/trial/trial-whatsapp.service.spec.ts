import { Logger } from '@nestjs/common';
import {
  TrialWhatsAppService,
  WHATSAPP_MAX_ATTEMPTS,
  planTrialWhatsApp,
  whatsappDedupeKey,
} from './trial-whatsapp.service';

beforeAll(() => {
  jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
});
afterAll(() => jest.restoreAllMocks());

const ENV = [
  'WHATSAPP_ENABLED',
  'WHATSAPP_ADMIN_RECIPIENT',
  'WHATSAPP_TEMPLATE_PARENT_CONFIRMATION',
  'WHATSAPP_TEMPLATE_PARENT_REMINDER',
  'WHATSAPP_TEMPLATE_PARENT_CLASS_DETAILS',
  'WHATSAPP_TEMPLATE_ADMIN_ALERT',
  'WHATSAPP_TEMPLATE_LANGUAGE',
];
const saved: Record<string, string | undefined> = {};
beforeEach(() => ENV.forEach((k) => (saved[k] = process.env[k])));
afterEach(() =>
  ENV.forEach((k) =>
    saved[k] === undefined
      ? delete process.env[k]
      : (process.env[k] = saved[k]),
  ),
);

const NOW = new Date('2026-11-01T00:00:00Z');
const lead = {
  id: 'lead-1',
  revision: 0,
  startAt: new Date('2026-11-10T10:00:00Z'),
  whatsappConsent: true,
  parentPhone: '+8801712345678',
  teacherId: 'teacher-1' as string | null,
};
const ALL = [
  'PARENT_CONFIRMATION',
  'PARENT_CLASS_DETAILS',
  'PARENT_REMINDER',
  'ADMIN_ALERT',
] as const;

describe('planTrialWhatsApp (message selection)', () => {
  it('queues exactly the four trial messages when enabled, consented and staffed', () => {
    const plan = planTrialWhatsApp({
      lead,
      now: NOW,
      enabled: true,
      kinds: [...ALL],
    });
    expect(plan.map((p) => p.kind)).toEqual([...ALL]);
    expect(plan.every((p) => p.status === 'PENDING')).toBe(true);
    const reminder = plan.find((p) => p.kind === 'PARENT_REMINDER')!;
    expect(reminder.scheduledFor.toISOString()).toBe(
      '2026-11-10T09:00:00.000Z',
    ); // exactly one hour before
    expect(reminder.nextAttemptAt).toEqual(reminder.scheduledFor);
    for (const kind of ['PARENT_CONFIRMATION', 'PARENT_CLASS_DETAILS']) {
      expect(plan.find((p) => p.kind === kind)!.nextAttemptAt).toEqual(NOW);
    }
  });

  it('before a teacher is assigned the link messages and the reminder are skipped, never queued', () => {
    const plan = planTrialWhatsApp({
      lead: { ...lead, teacherId: null },
      now: NOW,
      enabled: true,
      kinds: [...ALL],
    });
    const status = Object.fromEntries(plan.map((p) => [p.kind, p.status]));
    expect(status).toEqual({
      PARENT_CONFIRMATION: 'PENDING',
      PARENT_CLASS_DETAILS: 'SKIPPED',
      PARENT_REMINDER: 'SKIPPED',
      ADMIN_ALERT: 'PENDING',
    });
  });

  it('assigned less than an hour before the start: the link is sent now, no reminder is scheduled', () => {
    const soon = { ...lead, startAt: new Date(NOW.getTime() + 40 * 60_000) };
    const plan = planTrialWhatsApp({
      lead: soon,
      now: NOW,
      enabled: true,
      kinds: ['PARENT_CLASS_DETAILS', 'PARENT_REMINDER'],
    });
    const byKind = Object.fromEntries(plan.map((p) => [p.kind, p]));
    expect(byKind.PARENT_CLASS_DETAILS.status).toBe('PENDING');
    expect(byKind.PARENT_CLASS_DETAILS.nextAttemptAt).toEqual(NOW);
    expect(byKind.PARENT_REMINDER.status).toBe('SKIPPED');
    expect(byKind.PARENT_REMINDER.lastError).toMatch(/less than an hour/i);
  });

  it('feature flag off: everything is SKIPPED, nothing pending', () => {
    const plan = planTrialWhatsApp({
      lead,
      now: NOW,
      enabled: false,
      kinds: [...ALL],
    });
    expect(
      plan.every((p) => p.status === 'SKIPPED' && p.nextAttemptAt === null),
    ).toBe(true);
    expect(plan[0].lastError).toMatch(/disabled/i);
  });

  it('no consent: parent messages skipped, admin alert still goes', () => {
    const plan = planTrialWhatsApp({
      lead: { ...lead, whatsappConsent: false },
      now: NOW,
      enabled: true,
      kinds: [...ALL],
    });
    const status = Object.fromEntries(plan.map((p) => [p.kind, p.status]));
    expect(status).toEqual({
      PARENT_CONFIRMATION: 'SKIPPED',
      PARENT_CLASS_DETAILS: 'SKIPPED',
      PARENT_REMINDER: 'SKIPPED',
      ADMIN_ALERT: 'PENDING',
    });
  });

  it('the reminder is always 1h before; inside the last hour there is none', () => {
    const soon = { ...lead, startAt: new Date(NOW.getTime() + 5 * 3600_000) };
    const r1 = planTrialWhatsApp({
      lead: soon,
      now: NOW,
      enabled: true,
      kinds: ['PARENT_REMINDER'],
    })[0];
    expect(r1.status).toBe('PENDING');
    expect(r1.scheduledFor.toISOString()).toBe(
      new Date(soon.startAt.getTime() - 3600_000).toISOString(),
    );

    const tooLate = { ...lead, startAt: new Date(NOW.getTime() + 40 * 60_000) };
    const r2 = planTrialWhatsApp({
      lead: tooLate,
      now: NOW,
      enabled: true,
      kinds: ['PARENT_REMINDER'],
    })[0];
    expect(r2.status).toBe('SKIPPED');
  });

  it('dedupe keys are stable per message, and per revision for the time-bound messages only', () => {
    expect(whatsappDedupeKey('L', 'PARENT_CONFIRMATION', 3)).toBe(
      'trial:L:PARENT_CONFIRMATION',
    );
    expect(whatsappDedupeKey('L', 'ADMIN_ALERT', 3)).toBe(
      'trial:L:ADMIN_ALERT',
    );
    expect(whatsappDedupeKey('L', 'PARENT_REMINDER', 0)).toBe(
      'trial:L:PARENT_REMINDER:r0',
    );
    expect(whatsappDedupeKey('L', 'PARENT_REMINDER', 1)).toBe(
      'trial:L:PARENT_REMINDER:r1',
    );
    expect(whatsappDedupeKey('L', 'PARENT_CLASS_DETAILS', 2)).toBe(
      'trial:L:PARENT_CLASS_DETAILS:r2',
    );
  });
});

// ─── Outbox processing ───────────────────────────────────────────────────────

function build(rowOverrides: any = {}, leadOverrides: any = {}) {
  const row = {
    id: 'msg-1',
    kind: 'PARENT_CONFIRMATION',
    revision: 0,
    attempts: 0,
    trialLead: {
      id: 'lead-1',
      parentName: 'Sarah',
      parentEmail: 's@example.com',
      parentPhone: '+8801712345678',
      childName: 'Alex',
      childAge: 10,
      subject: 'AI Builder',
      message: null,
      appointmentStatus: 'CONFIRMED',
      whatsappConsent: true,
      teacherId: 'teacher-1',
      guestToken: 'tok_'.padEnd(43, 'x'),
      revision: 0,
      startAt: new Date(Date.now() + 3 * 86400_000),
      endAt: new Date(Date.now() + 3 * 86400_000 + 1800_000),
      ...leadOverrides,
    },
    ...rowOverrides,
  };
  const prisma: any = {
    trialWhatsAppMessage: {
      findMany: jest.fn().mockResolvedValue([{ id: row.id }]),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUnique: jest.fn().mockResolvedValue(row),
      update: jest.fn().mockResolvedValue({}),
    },
    trialLead: { findUnique: jest.fn() },
  };
  const cloud: any = {
    isEnabled: jest.fn().mockReturnValue(true),
    sendTemplate: jest
      .fn()
      .mockResolvedValue({ ok: true, messageId: 'wamid.1' }),
  };
  return {
    service: new TrialWhatsAppService(prisma, cloud),
    prisma,
    cloud,
    row,
  };
}
const lastUpdate = (prisma: any) =>
  prisma.trialWhatsAppMessage.update.mock.calls.at(-1)[0].data;

describe('TrialWhatsAppService.processDue', () => {
  beforeEach(() => {
    process.env.WHATSAPP_ENABLED = 'true';
    process.env.WHATSAPP_ADMIN_RECIPIENT = '+8801999000111';
  });

  it('does nothing and never calls Meta when the feature flag is off', async () => {
    const { service, prisma, cloud } = build();
    cloud.isEnabled.mockReturnValue(false);
    expect(await service.processDue()).toBe(0);
    expect(prisma.trialWhatsAppMessage.findMany).not.toHaveBeenCalled();
    expect(cloud.sendTemplate).not.toHaveBeenCalled();
  });

  it('sends a due confirmation with the configured template, language and variables', async () => {
    process.env.WHATSAPP_TEMPLATE_PARENT_CONFIRMATION = 'my_confirm_v2';
    process.env.WHATSAPP_TEMPLATE_LANGUAGE = 'en_US';
    const { service, prisma, cloud } = build();
    expect(await service.processDue()).toBe(1);

    const arg = cloud.sendTemplate.mock.calls[0][0];
    expect(arg.to).toBe('+8801712345678');
    expect(arg.templateName).toBe('my_confirm_v2');
    expect(arg.languageCode).toBe('en_US');
    expect(arg.variables.map((v: any) => v.name)).toEqual([
      'parent_name',
      'child_name',
      'appointment_date',
      'appointment_time',
      'duration',
      'program_interest',
      'programs_url',
    ]);
    expect(lastUpdate(prisma)).toMatchObject({
      status: 'SENT',
      providerMessageId: 'wamid.1',
      lockedAt: null,
    });
  });

  it('class details and the reminder carry the secure join link as their last variable', async () => {
    process.env.FRONTEND_URL = 'https://lumexa-one.vercel.app';
    for (const kind of ['PARENT_CLASS_DETAILS', 'PARENT_REMINDER']) {
      const { service, cloud } = build({ kind });
      await service.processDue();
      const vars = cloud.sendTemplate.mock.calls[0][0].variables;
      expect(vars.at(-1)).toEqual({
        name: 'join_link',
        value: `https://lumexa-one.vercel.app/trial/join/${'tok_'.padEnd(43, 'x')}`,
      });
    }
  });

  it('a link message for a trial without a token fails permanently instead of sending a dead link', async () => {
    const { service, prisma, cloud } = build(
      { kind: 'PARENT_CLASS_DETAILS' },
      { guestToken: null },
    );
    await service.processDue();
    expect(cloud.sendTemplate).not.toHaveBeenCalled();
    expect(lastUpdate(prisma)).toMatchObject({
      status: 'FAILED',
      errorCode: 'BUILD_FAILED',
      nextAttemptAt: null,
    });
  });

  it('the class link is still sent when a teacher is assigned just after the start, while the room is open', async () => {
    const { service, cloud } = build(
      { kind: 'PARENT_CLASS_DETAILS' },
      {
        startAt: new Date(Date.now() - 5 * 60_000),
        endAt: new Date(Date.now() + 25 * 60_000),
      },
    );
    await service.processDue();
    expect(cloud.sendTemplate).toHaveBeenCalledTimes(1);
  });

  it('admin alert goes to the configured admin number, not the parent', async () => {
    const { service, cloud } = build({ kind: 'ADMIN_ALERT' });
    await service.processDue();
    expect(cloud.sendTemplate.mock.calls[0][0].to).toBe('+8801999000111');
    expect(cloud.sendTemplate.mock.calls[0][0].variables[1].name).toBe(
      'parent_email',
    );
  });

  it('duplicate prevention: a row another worker already claimed is not sent again', async () => {
    const { service, prisma, cloud } = build();
    prisma.trialWhatsAppMessage.updateMany.mockResolvedValue({ count: 0 });
    expect(await service.processDue()).toBe(0);
    expect(cloud.sendTemplate).not.toHaveBeenCalled();
  });

  it('claims the row (PENDING/FAILED → SENDING) before sending, with a conditional update', async () => {
    const { service, prisma } = build();
    await service.processDue();
    const claim = prisma.trialWhatsAppMessage.updateMany.mock.calls[0][0];
    expect(claim.where.id).toBe('msg-1');
    expect(claim.data.status).toBe('SENDING');
    expect(JSON.stringify(claim.where)).toContain('PENDING');
  });

  it('retryable failure: marked FAILED with a future nextAttemptAt', async () => {
    const { service, prisma, cloud } = build({ attempts: 1 });
    cloud.sendTemplate.mockResolvedValue({
      ok: false,
      retryable: true,
      code: '130429',
      message: 'Rate limit',
    });
    await service.processDue();
    const data = lastUpdate(prisma);
    expect(data.status).toBe('FAILED');
    expect(data.errorCode).toBe('130429');
    expect(data.nextAttemptAt.getTime()).toBeGreaterThan(Date.now());
    expect(data.attempts).toEqual({ increment: 1 });
  });

  it('gives up after the maximum attempts (no further automatic retry)', async () => {
    const { service, prisma, cloud } = build({
      attempts: WHATSAPP_MAX_ATTEMPTS - 1,
    });
    cloud.sendTemplate.mockResolvedValue({
      ok: false,
      retryable: true,
      code: 'NETWORK',
      message: 'down',
    });
    await service.processDue();
    expect(lastUpdate(prisma)).toMatchObject({
      status: 'FAILED',
      nextAttemptAt: null,
    });
  });

  it('permanent failure (e.g. template not approved): FAILED, not retried', async () => {
    const { service, prisma, cloud } = build();
    cloud.sendTemplate.mockResolvedValue({
      ok: false,
      retryable: false,
      code: '132001',
      message: 'Template does not exist',
    });
    await service.processDue();
    expect(lastUpdate(prisma)).toMatchObject({
      status: 'FAILED',
      nextAttemptAt: null,
      errorCode: '132001',
    });
  });

  it('missing admin recipient or credentials degrade to a recorded failure, never an exception', async () => {
    delete process.env.WHATSAPP_ADMIN_RECIPIENT;
    const a = build({ kind: 'ADMIN_ALERT' });
    await expect(a.service.processDue()).resolves.toBe(1);
    expect(lastUpdate(a.prisma)).toMatchObject({
      status: 'FAILED',
      errorCode: 'NOT_CONFIGURED',
      nextAttemptAt: null,
    });
    expect(a.cloud.sendTemplate).not.toHaveBeenCalled();

    const b = build();
    b.cloud.sendTemplate.mockResolvedValue({
      ok: false,
      retryable: false,
      code: 'NOT_CONFIGURED',
      message: 'set WHATSAPP_ACCESS_TOKEN',
    });
    await expect(b.service.processDue()).resolves.toBe(1);
    expect(lastUpdate(b.prisma).status).toBe('FAILED');
  });

  it('invalid recipient number is a permanent, recorded failure with a masked number', async () => {
    const { service, prisma, cloud } = build({}, { parentPhone: '12345' });
    await service.processDue();
    expect(cloud.sendTemplate).not.toHaveBeenCalled();
    const data = lastUpdate(prisma);
    expect(data).toMatchObject({
      status: 'FAILED',
      errorCode: 'INVALID_RECIPIENT',
      nextAttemptAt: null,
    });
  });

  it.each([
    ['cancelled appointment', {}, { appointmentStatus: 'CANCELLED' }],
    [
      'appointment already started',
      {},
      { startAt: new Date(Date.now() - 1000) },
    ],
    [
      'superseded reminder after reschedule',
      { kind: 'PARENT_REMINDER', revision: 0 },
      { revision: 1 },
    ],
    [
      'superseded class details after reschedule',
      { kind: 'PARENT_CLASS_DETAILS', revision: 0 },
      { revision: 1 },
    ],
    [
      'reminder when the teacher was removed',
      { kind: 'PARENT_REMINDER' },
      { teacherId: null },
    ],
    [
      'class link after the joining window closed',
      { kind: 'PARENT_CLASS_DETAILS' },
      {
        startAt: new Date(Date.now() - 3 * 3600_000),
        endAt: new Date(Date.now() - 3 * 3600_000 + 1800_000),
      },
    ],
    ['parent without consent', {}, { whatsappConsent: false }],
  ])('skips (does not send): %s', async (_label, rowOv, leadOv) => {
    const { service, prisma, cloud } = build(rowOv, leadOv);
    await service.processDue();
    expect(cloud.sendTemplate).not.toHaveBeenCalled();
    expect(lastUpdate(prisma)).toMatchObject({
      status: 'SKIPPED',
      nextAttemptAt: null,
    });
  });
});

describe('TrialWhatsAppService.enqueue / skipUnsent', () => {
  it('persists planned rows with skipDuplicates so re-planning cannot double-queue', async () => {
    process.env.WHATSAPP_ENABLED = 'true';
    const createMany = jest.fn().mockResolvedValue({ count: 4 });
    const { service } = build();
    await service.enqueue(
      { trialWhatsAppMessage: { createMany } } as any,
      lead,
      [...ALL],
      NOW,
    );
    const arg = createMany.mock.calls[0][0];
    expect(arg.skipDuplicates).toBe(true);
    expect(arg.data).toHaveLength(4);
    expect(arg.data.every((d: any) => d.trialLeadId === 'lead-1')).toBe(true);
  });

  it('skipUnsent only touches unsent rows', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 2 });
    const { service } = build();
    await service.skipUnsent(
      { trialWhatsAppMessage: { updateMany } } as any,
      'lead-1',
      'cancelled',
    );
    expect(updateMany.mock.calls[0][0].where.status).toEqual({
      in: ['PENDING', 'FAILED'],
    });
  });

  it('retryFailed does nothing for cancelled or past appointments', async () => {
    const { service, prisma } = build();
    prisma.trialLead.findUnique.mockResolvedValue({
      appointmentStatus: 'CANCELLED',
      startAt: new Date(Date.now() + 1e9),
    });
    expect(await service.retryFailed('lead-1')).toBe(0);
    prisma.trialLead.findUnique.mockResolvedValue({
      appointmentStatus: 'CONFIRMED',
      startAt: new Date(Date.now() - 1000),
    });
    expect(await service.retryFailed('lead-1')).toBe(0);
  });
});
