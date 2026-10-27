import { BrevoTransport, parseFromHeader } from './brevo-transport';
import { EmailService, describeSendError } from './email.service';

describe('parseFromHeader', () => {
  it('splits the display name and address', () => {
    expect(
      parseFromHeader('"Lumexa AI School" <lumexa.school@gmail.com>'),
    ).toEqual({
      name: 'Lumexa AI School',
      email: 'lumexa.school@gmail.com',
    });
    expect(parseFromHeader('<a@b.co>')).toEqual({ email: 'a@b.co' });
    expect(parseFromHeader('a@b.co')).toEqual({ email: 'a@b.co' });
  });
});

describe('BrevoTransport', () => {
  const message = {
    from: '"Lumexa AI School" <lumexa.school@gmail.com>',
    to: 'parent@example.com',
    subject: 'Hello',
    html: '<p>Hi</p>',
  };
  const mockFetch = (
    res: Partial<Response> & { json?: () => Promise<unknown> },
  ) => jest.spyOn(global, 'fetch').mockResolvedValue(res as Response);
  afterEach(() => jest.restoreAllMocks());

  it('posts the email to Brevo over HTTPS with the api key in a header only', async () => {
    const spy = mockFetch({
      ok: true,
      status: 201,
      json: async () => ({ messageId: '<m1>' }),
    });
    await expect(
      new BrevoTransport('secret-key').sendMail(message),
    ).resolves.toEqual({ messageId: '<m1>' });
    const [url, init] = spy.mock.calls[0];
    expect(url).toBe('https://api.brevo.com/v3/smtp/email');
    expect((init as RequestInit).headers).toMatchObject({
      'api-key': 'secret-key',
    });
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).toEqual({
      sender: { name: 'Lumexa AI School', email: 'lumexa.school@gmail.com' },
      to: [{ email: 'parent@example.com' }],
      subject: 'Hello',
      htmlContent: '<p>Hi</p>',
    });
    expect(JSON.stringify(body)).not.toContain('secret-key');
  });

  it('sends remote attachments by URL', async () => {
    const spy = mockFetch({ ok: true, status: 201, json: async () => ({}) });
    await new BrevoTransport('k').sendMail({
      ...message,
      attachments: [
        { filename: 'c.pdf', path: 'https://files.example.com/c.pdf' },
      ],
    });
    expect(
      JSON.parse((spy.mock.calls[0][1] as RequestInit).body as string)
        .attachment,
    ).toEqual([{ name: 'c.pdf', url: 'https://files.example.com/c.pdf' }]);
  });

  it('a rejection becomes an error carrying Brevo’s reason and never the key', async () => {
    mockFetch({
      ok: false,
      status: 400,
      json: async () => ({
        code: 'invalid_parameter',
        message: 'Sender not verified',
      }),
    });
    const err = await new BrevoTransport('secret-key')
      .sendMail(message)
      .catch((e: Error) => e);
    expect((err as Error).message).toBe(
      'Brevo rejected the email (HTTP 400, invalid_parameter): Sender not verified',
    );
    expect((err as Error).message).not.toContain('secret-key');
  });

  it('a network failure surfaces as an error so the journal marks it FAILED and retries', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('fetch failed'));
    await expect(new BrevoTransport('k').sendMail(message)).rejects.toThrow(
      'fetch failed',
    );
  });
});

describe('EmailService provider selection', () => {
  const keys = [
    'EMAIL_PROVIDER',
    'BREVO_API_KEY',
    'EMAIL_FROM_ADDRESS',
    'SMTP_USER',
    'SMTP_PASS',
    'EMAIL_FROM_NAME',
  ];
  const saved: Record<string, string | undefined> = {};
  beforeEach(() => {
    keys.forEach((k) => {
      saved[k] = process.env[k];
      delete process.env[k];
    });
  });
  afterEach(() =>
    keys.forEach((k) =>
      saved[k] === undefined
        ? delete process.env[k]
        : (process.env[k] = saved[k]),
    ),
  );
  const init = () => {
    const service = new EmailService({} as never);
    (service as any).logger = {
      warn: jest.fn(),
      log: jest.fn(),
      error: jest.fn(),
    };
    service.onModuleInit();
    return service as any;
  };

  it('uses Brevo over HTTPS when EMAIL_PROVIDER=brevo, with the verified sender as From', () => {
    process.env.EMAIL_PROVIDER = 'brevo';
    process.env.BREVO_API_KEY = 'k';
    process.env.EMAIL_FROM_ADDRESS = 'lumexa.school@gmail.com';
    const s = init();
    expect(s.transporter).toBeInstanceOf(BrevoTransport);
    expect(s.fromAddress).toBe('"Lumexa AI School" <lumexa.school@gmail.com>');
  });

  it('brevo without a key or sender stays disabled (and says why) instead of silently using SMTP', () => {
    process.env.EMAIL_PROVIDER = 'brevo';
    process.env.SMTP_USER = 'u@gmail.com';
    process.env.SMTP_PASS = 'p';
    const s = init();
    expect(s.transporter).toBeNull();
    expect(s.logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('BREVO_API_KEY'),
    );
  });

  it('defaults to Gmail SMTP exactly as before', () => {
    process.env.SMTP_USER = 'lumexa.school@gmail.com';
    process.env.SMTP_PASS = 'p';
    const s = init();
    expect(s.transporter).not.toBeInstanceOf(BrevoTransport);
    expect(s.transporter).not.toBeNull();
  });
});

describe('describeSendError', () => {
  it('explains a blocked SMTP port plainly', () => {
    for (const err of [
      Object.assign(new Error('Connection timeout'), { code: 'ETIMEDOUT' }),
      new Error(
        'connect ENETUNREACH 2607:f8b0:4004:c07::6c:465 - Local (:::0)',
      ),
    ]) {
      expect(describeSendError(err)).toMatch(
        /blocking outbound SMTP.*EMAIL_PROVIDER=brevo/,
      );
    }
  });

  it('leaves other errors (bad password, rejected recipient) untouched', () => {
    expect(
      describeSendError(
        new Error('Invalid login: 535 Username and Password not accepted'),
      ),
    ).toBe('Invalid login: 535 Username and Password not accepted');
  });
});
