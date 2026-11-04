import {
  CREDIT_PACKAGES,
  DEFAULT_CREDIT_PACKAGE,
  creditLevel,
  formatTaka,
  overdueCreditsOf,
  paymentRequestMessage,
  quoteCreditPackage,
  quoteCreditPackages,
} from './credit-packages';

const ENV_KEYS = ['WHATSAPP_ADMIN_RECIPIENT'];

describe('credit packages', () => {
  const saved: Record<string, string | undefined> = {};
  beforeEach(() => {
    ENV_KEYS.forEach((k) => {
      saved[k] = process.env[k];
      delete process.env[k];
    });
  });
  afterEach(() =>
    ENV_KEYS.forEach((k) =>
      saved[k] === undefined
        ? delete process.env[k]
        : (process.env[k] = saved[k]),
    ),
  );

  it('offers exactly 8, 16 and 24 credits, with 8 as the default', () => {
    expect([...CREDIT_PACKAGES]).toEqual([8, 16, 24]);
    expect(DEFAULT_CREDIT_PACKAGE).toBe(8);
  });

  describe('creditLevel — the one rule behind the pill, reminders, admin badge and emails', () => {
    it.each([
      [24, 'ok'],
      [5, 'ok'],
      [4, 'ok'],
      [3, 'low'],
      [2, 'low'],
      [1, 'low'],
      [0, 'exhausted'],
      [-1, 'exhausted'],
      [-7, 'exhausted'],
    ])('%p credits is %p', (credits, level) => {
      expect(creditLevel(credits)).toBe(level);
    });
  });

  describe('overdueCreditsOf', () => {
    it('is the size of the debt, and nothing for a zero or positive balance', () => {
      expect(overdueCreditsOf(-2)).toBe(2);
      expect(overdueCreditsOf(-1)).toBe(1);
      expect(overdueCreditsOf(0)).toBe(0);
      expect(overdueCreditsOf(6)).toBe(0);
    });
  });

  describe('a student with a positive balance', () => {
    // ৳900 a class (poisha), 5 credits left.
    const base = { rateCents: 90_000, balance: 5, studentName: 'Ada Lovelace' };

    it.each([
      [8, 720_000],
      [16, 1_440_000],
      [24, 2_160_000],
    ])("%p credits cost credits × the student's own rate", (credits, total) => {
      const q = quoteCreditPackage({ ...base, credits });
      expect(q.credits).toBe(credits);
      expect(q.packageCents).toBe(total);
      expect(q.overdueCredits).toBe(0);
      expect(q.overdueCents).toBe(0);
      expect(q.totalCents).toBe(total);
      expect(q.lessonsToRecord).toBe(credits);
    });

    it("uses the student's rate, so a cheaper batch rate gives a cheaper package", () => {
      const oneToOne = quoteCreditPackage({
        ...base,
        credits: 8,
        rateCents: 90_000,
      });
      const batch = quoteCreditPackage({
        ...base,
        credits: 8,
        rateCents: 54_000,
      });
      expect(oneToOne.totalCents).toBe(720_000);
      expect(batch.totalCents).toBe(432_000);
    });

    it('applies no discount: 24 credits cost exactly three times 8 credits', () => {
      const [p8, p16, p24] = quoteCreditPackages(base);
      expect(p16.totalCents).toBe(p8.totalCents! * 2);
      expect(p24.totalCents).toBe(p8.totalCents! * 3);
    });

    it('quotes every package, in order', () => {
      expect(quoteCreditPackages(base).map((q) => q.credits)).toEqual([
        8, 16, 24,
      ]);
    });
  });

  describe('a student with a zero balance', () => {
    it('owes nothing extra', () => {
      const q = quoteCreditPackage({
        credits: 8,
        rateCents: 100_000,
        balance: 0,
        studentName: 'Ada',
      });
      expect(q.overdueCredits).toBe(0);
      expect(q.totalCents).toBe(800_000);
    });
  });

  describe('an overdrawn student (negative credits)', () => {
    // −2 credits at ৳1,000 a class.
    const base = { rateCents: 100_000, balance: -2, studentName: 'Ada' };

    it('settles the overdue credits ON TOP of the package they chose', () => {
      const q = quoteCreditPackage({ ...base, credits: 8 });
      expect(q.credits).toBe(8); // the package is never reduced
      expect(q.packageCents).toBe(800_000);
      expect(q.overdueCredits).toBe(2);
      expect(q.overdueCents).toBe(200_000);
      expect(q.totalCents).toBe(1_000_000); // (8 + 2) × ৳1,000
    });

    it('is recorded by the admin as package + overdue lessons, which keeps the per-class rate', () => {
      const q = quoteCreditPackage({ ...base, credits: 8 });
      expect(q.lessonsToRecord).toBe(10);
      // StudentLedgerService.recordPayment: rate = amount ÷ lessons purchased.
      expect(q.totalCents! / q.lessonsToRecord).toBe(base.rateCents);
    });

    it('leaves the student with exactly the selected package once the payment is recorded', () => {
      for (const credits of CREDIT_PACKAGES) {
        const q = quoteCreditPackage({ ...base, credits });
        const balanceAfterCents = base.balance * base.rateCents + q.totalCents!;
        expect(balanceAfterCents / base.rateCents).toBe(credits);
      }
    });

    it('the three package totals all include the same overdue amount', () => {
      const totals = quoteCreditPackages(base).map((q) => q.totalCents);
      expect(totals).toEqual([1_000_000, 1_800_000, 2_600_000]);
    });
  });

  describe('a student whose per-class price is not known yet', () => {
    it('is never quoted an invented price', () => {
      const q = quoteCreditPackage({
        credits: 8,
        rateCents: 0,
        balance: -1,
        studentName: 'Ada',
      });
      expect(q.packageCents).toBeNull();
      expect(q.overdueCents).toBeNull();
      expect(q.totalCents).toBeNull();
      expect(q.overdueCredits).toBe(1);
      expect(q.lessonsToRecord).toBe(9);
      expect(q.whatsappMessage).toBe(
        "Hello! I'd like to purchase 8 class credits for Ada. My current balance is -1 credits. Could you please share the price and payment instructions?",
      );
    });
  });

  describe('formatTaka', () => {
    it.each([
      [720_000, '৳7,200'],
      [1_000_000, '৳10,000'],
      [666_664, '৳6,666.64'],
      [50, '৳0.5'],
      [12_345_600, '৳123,456'],
      [-200_000, '-৳2,000'],
    ])('%p poisha reads %p', (cents, text) => {
      expect(formatTaka(cents)).toBe(text);
    });
  });

  describe('the WhatsApp request message', () => {
    it('follows the agreed template exactly', () => {
      expect(
        paymentRequestMessage({
          credits: 8,
          studentName: 'Ada Lovelace',
          balance: 5,
          totalCents: 720_000,
        }),
      ).toBe(
        "Hello! I'd like to purchase 8 class credits for Ada Lovelace. My current balance is 5 credits, and the total amount is ৳7,200. Could you please share the payment instructions?",
      );
    });

    it.each([8, 16, 24])('asks for the selected %p credits', (credits) => {
      const q = quoteCreditPackage({
        credits,
        rateCents: 100_000,
        balance: 2,
        studentName: 'Ada',
      });
      expect(q.whatsappMessage).toContain(
        `purchase ${credits} class credits for Ada`,
      );
      expect(q.whatsappMessage).toContain('My current balance is 2 credits');
      expect(q.whatsappMessage).toContain(
        `the total amount is ${formatTaka(credits * 100_000)}`,
      );
    });

    it('states the negative balance and an amount that includes the overdue credits', () => {
      const q = quoteCreditPackage({
        credits: 8,
        rateCents: 100_000,
        balance: -2,
        studentName: 'Ada',
      });
      expect(q.whatsappMessage).toBe(
        "Hello! I'd like to purchase 8 class credits for Ada. My current balance is -2 credits, and the total amount is ৳10,000. Could you please share the payment instructions?",
      );
    });
  });

  describe('the WhatsApp link', () => {
    const q = quoteCreditPackage({
      credits: 16,
      rateCents: 100_000,
      balance: 3,
      studentName: 'Ada & Co <b>',
    });

    it('opens the admin inbox from the central default number', () => {
      expect(
        q.whatsappUrl.startsWith('https://wa.me/8801774878252?text='),
      ).toBe(true);
    });

    it('carries the message URL-encoded, so it decodes back to exactly the message', () => {
      const text = new URL(q.whatsappUrl).searchParams.get('text');
      expect(text).toBe(q.whatsappMessage);
      expect(q.whatsappUrl).not.toMatch(/[\s<>"]/);
      expect(q.whatsappUrl).toContain('%E0%A7%B3'); // the taka sign, encoded
    });

    it('prefers the admin contact that is already configured', () => {
      process.env.WHATSAPP_ADMIN_RECIPIENT = '+880 1999-000111';
      const configured = quoteCreditPackage({
        credits: 8,
        rateCents: 100_000,
        balance: 1,
        studentName: 'Ada',
      });
      expect(
        configured.whatsappUrl.startsWith('https://wa.me/8801999000111?'),
      ).toBe(true);
    });
  });
});
