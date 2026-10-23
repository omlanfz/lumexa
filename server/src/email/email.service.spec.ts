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
