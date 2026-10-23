import { maskPhone, normalizePhone, toWhatsAppRecipient } from './phone.util';

describe('normalizePhone', () => {
  it.each([
    ['01712345678', '+8801712345678'],
    ['01712-345678', '+8801712345678'],
    ['017 1234 5678', '+8801712345678'],
    ['1712345678', '+8801712345678'],
    ['8801712345678', '+8801712345678'],
    ['+8801712345678', '+8801712345678'],
    ['+880 1712 345678', '+8801712345678'],
    ['00880 1712 345678', '+8801712345678'],
    ['(+880) 1712-345678', '+8801712345678'],
  ])('normalises Bangladeshi number %s → %s', (input, expected) => {
    expect(normalizePhone(input)).toEqual({
      ok: true,
      e164: expected,
      isBangladesh: true,
    });
  });

  it.each([
    ['+44 7700 900123', '+447700900123'],
    ['+1 (415) 555-2671', '+14155552671'],
    ['0044 7700 900123', '+447700900123'],
    ['+971 50 123 4567', '+971501234567'],
  ])('keeps valid international number %s as %s', (input, expected) => {
    expect(normalizePhone(input)).toEqual({
      ok: true,
      e164: expected,
      isBangladesh: false,
    });
  });

  it.each([
    [''],
    ['   '],
    ['abc'],
    ['017123'],
    ['01212345678'], // 012… is not a Bangladeshi mobile prefix
    ['+88017123'],
    ['+8801212345678'],
    ['4155552671'], // no country code and not Bangladeshi
    ['+0123456789'],
    ['+1'],
    ['+1234567890123456'], // 16 digits > E.164 max
    ['017x2345678'],
  ])('rejects %p', (input) => {
    const r = normalizePhone(input);
    expect(r.ok).toBe(false);
  });

  it('rejects non-strings', () => {
    expect(normalizePhone(undefined).ok).toBe(false);
    expect(normalizePhone(8801712345678).ok).toBe(false);
  });

  it('masks and formats for WhatsApp', () => {
    expect(maskPhone('+8801712345678')).toBe('+88017••••5678');
    expect(maskPhone(null)).toBe('');
    expect(toWhatsAppRecipient('+8801712345678')).toBe('8801712345678');
  });
});
