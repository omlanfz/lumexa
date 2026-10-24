import { Logger } from '@nestjs/common';
import { EmailService } from './email.service';

describe('EmailService sender identity', () => {
  const keys = ['SMTP_USER', 'SMTP_PASS', 'EMAIL_FROM_NAME'];
  const saved: Record<string, string | undefined> = {};
  beforeEach(() => keys.forEach((k) => (saved[k] = process.env[k])));
  afterEach(() =>
    keys.forEach((k) =>
      saved[k] === undefined
        ? delete process.env[k]
        : (process.env[k] = saved[k]),
    ),
  );

  async function sendOne() {
    const prisma = {
      emailLog: {
        create: jest.fn().mockResolvedValue({ id: 'log-1' }),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const service = new EmailService(prisma as any);
    const sendMail = jest.fn().mockResolvedValue({});
    (service as any).transporter = { sendMail };
    await (service as any).attemptDelivery(
      'log-1',
      'to@example.com',
      'Hi',
      '<p>x</p>',
    );
    return sendMail.mock.calls[0][0] as { from: string };
  }

  it('sends as "Lumexa AI School" from the configured Gmail account', async () => {
    process.env.SMTP_USER = 'lumexa.school@gmail.com';
    delete process.env.EMAIL_FROM_NAME;
    expect((await sendOne()).from).toBe(
      '"Lumexa AI School" <lumexa.school@gmail.com>',
    );
  });

  it('the display name is configurable and header-injection safe; the address stays SMTP_USER', async () => {
    process.env.SMTP_USER = 'lumexa.school@gmail.com';
    process.env.EMAIL_FROM_NAME = 'Evil"\r\nBcc: x@y.z';
    const { from } = await sendOne();
    expect(from).not.toMatch(/[\r\n]/);
    expect(from.endsWith('<lumexa.school@gmail.com>')).toBe(true);
  });
});

describe('EmailService.sendTracked', () => {
  const params = {
    to: 'parent@example.com',
    subject: 'Report card',
    html: '<p>Hello</p>',
    category: 'TEST_REPORT',
    dedupeKey: 'test-report:abc:1',
  };

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  function setup(opts: {
    sendMail?: jest.Mock | null;
    createError?: unknown;
    lastError?: string | null;
  }) {
    const prisma = {
      emailLog: {
        create: opts.createError
          ? jest.fn().mockRejectedValue(opts.createError)
          : jest.fn().mockResolvedValue({ id: 'log-1' }),
        update: jest.fn().mockResolvedValue({}),
        findUnique: jest
          .fn()
          .mockResolvedValue({ lastError: opts.lastError ?? null }),
      },
    };
    const service = new EmailService(prisma as any);
    (service as any).transporter = opts.sendMail
      ? { sendMail: opts.sendMail }
      : null;
    return { service, prisma };
  }

  it('reports success only after the mail server accepted the message', async () => {
    const sendMail = jest.fn().mockResolvedValue({});
    const { service, prisma } = setup({ sendMail });
    await expect(service.sendTracked(params)).resolves.toEqual({
      ok: true,
      logId: 'log-1',
    });
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(prisma.emailLog.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'log-1' },
        data: expect.objectContaining({ status: 'SENT' }),
      }),
    );
  });

  it('parks the journal row so the background retry sweep can never send it twice', async () => {
    const { service, prisma } = setup({
      sendMail: jest.fn().mockResolvedValue({}),
    });
    await service.sendTracked(params);
    const data = prisma.emailLog.create.mock.calls[0][0].data;
    expect(data.attempts).toBe(5);
    expect(data.dedupeKey).toBe('test-report:abc:1');
    expect(data.toEmail).toBe('parent@example.com');
  });

  it('never claims delivery when SMTP is not configured', async () => {
    const { service, prisma } = setup({ sendMail: null });
    const result = await service.sendTracked(params);
    expect(result.ok).toBe(false);
    expect(result.logId).toBe('log-1');
    expect(result.error).toMatch(/not configured.*nothing was sent/i);
    expect(prisma.emailLog.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'FAILED' }),
      }),
    );
  });

  it('returns the mail server rejection and journals it as FAILED', async () => {
    const sendMail = jest.fn().mockRejectedValue(new Error('550 no such user'));
    const { service, prisma } = setup({
      sendMail,
      lastError: '550 no such user',
    });
    const result = await service.sendTracked(params);
    expect(result).toEqual({
      ok: false,
      logId: 'log-1',
      error: '550 no such user',
    });
    expect(prisma.emailLog.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'FAILED',
          lastError: '550 no such user',
        }),
      }),
    );
    expect(sendMail).toHaveBeenCalledTimes(1); // no hidden retry
  });

  it('treats a repeated dedupeKey as already sent and does not send again', async () => {
    const sendMail = jest.fn();
    const { service } = setup({
      sendMail,
      createError: { code: 'P2002' },
    });
    const result = await service.sendTracked(params);
    expect(result).toMatchObject({ ok: false, duplicate: true });
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('does not send when the message cannot be journaled first', async () => {
    const sendMail = jest.fn();
    const { service } = setup({
      sendMail,
      createError: new Error('database is down'),
    });
    const result = await service.sendTracked(params);
    expect(result.ok).toBe(false);
    expect(result.duplicate).toBeUndefined();
    expect(result.error).toMatch(/could not record/i);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('answers "pending" (not success) when the mail server is slow', async () => {
    let release: (v: unknown) => void = () => undefined;
    const sendMail = jest.fn(
      () => new Promise((resolve) => (release = resolve)),
    );
    const { service } = setup({ sendMail });
    const result = await service.sendTracked(params, 20);
    expect(result).toMatchObject({ ok: false, pending: true, logId: 'log-1' });
    release({}); // let the hanging attempt finish so the test leaves no timers
    await new Promise((r) => setImmediate(r));
  });
});
