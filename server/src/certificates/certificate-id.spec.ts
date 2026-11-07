// The real CommonJS module object: its properties are writable, so a spy sees the
// calls certificate-id.ts makes (a `import * as` namespace would not allow it).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const crypto = require('crypto') as typeof import('crypto');
import {
  CERTIFICATE_ID_ALPHABET,
  CERTIFICATE_ID_PATTERN,
  CertificateIdExhaustedError,
  generateCertificateId,
  generateUniqueCertificateId,
  parseVerifiableCertificateId,
} from './certificate-id';

const ISSUED = new Date('2026-11-06T09:00:00Z');

describe('certificate ID format', () => {
  it('looks like LXA-2026-A7K9Q2', () => {
    for (let i = 0; i < 200; i++) {
      expect(generateCertificateId(ISSUED)).toMatch(CERTIFICATE_ID_PATTERN);
    }
    expect(generateCertificateId(ISSUED).slice(0, 9)).toBe('LXA-2026-');
  });

  it('the year is the ISSUE year in Asia/Dhaka, the calendar the printed date uses', () => {
    // 2026-12-31 17:59 UTC is still 2026 in Dhaka; one minute later it is 2027.
    expect(generateCertificateId(new Date('2026-12-31T17:59:59Z'))).toMatch(
      /^LXA-2026-/,
    );
    expect(generateCertificateId(new Date('2026-12-31T18:00:00Z'))).toMatch(
      /^LXA-2027-/,
    );
  });

  it('the random part is six uppercase alphanumerics, never I, O, 0 or 1', () => {
    expect(CERTIFICATE_ID_ALPHABET).toHaveLength(32);
    expect(new Set(CERTIFICATE_ID_ALPHABET).size).toBe(32);
    for (const ambiguous of ['I', 'O', '0', '1']) {
      expect(CERTIFICATE_ID_ALPHABET).not.toContain(ambiguous);
    }
    expect(CERTIFICATE_ID_ALPHABET).toMatch(/^[A-Z2-9]+$/);
    for (let i = 0; i < 500; i++) {
      const suffix = generateCertificateId(ISSUED).split('-')[2];
      expect(suffix).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    }
  });

  it('maps random draws onto the alphabet in order (so the mapping is what we think it is)', () => {
    const draws = [0, 1, 2, 3, 4, 31];
    let i = 0;
    const id = generateCertificateId(ISSUED, () => draws[i++]);
    expect(id).toBe(
      `LXA-2026-${[...draws].map((d) => CERTIFICATE_ID_ALPHABET[d]).join('')}`,
    );
    expect(id).toBe('LXA-2026-ABCDE9');
  });
});

describe('certificate ID randomness', () => {
  it('draws every character from crypto.randomInt, the cryptographically secure generator', () => {
    const spy = jest.spyOn(crypto, 'randomInt');
    try {
      generateCertificateId(ISSUED);
      expect(spy).toHaveBeenCalledTimes(6);
      for (const call of spy.mock.calls)
        expect(call.slice(0, 2)).toEqual([0, 32]);
    } finally {
      spy.mockRestore();
    }
  });

  it('never uses Math.random', () => {
    const spy = jest.spyOn(Math, 'random');
    try {
      for (let i = 0; i < 50; i++) generateCertificateId(ISSUED);
      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  it('spreads evenly over the alphabet (no bias, nothing sequential)', () => {
    const counts = new Map<string, number>();
    for (let i = 0; i < 10_000; i++) {
      for (const ch of generateCertificateId(ISSUED).split('-')[2]) {
        counts.set(ch, (counts.get(ch) ?? 0) + 1);
      }
    }
    // 60,000 draws over 32 characters: 1,875 expected each (sigma ~ 43).
    expect(counts.size).toBe(32);
    for (const n of counts.values()) {
      expect(n).toBeGreaterThan(1500);
      expect(n).toBeLessThan(2250);
    }
  });

  it('successive IDs differ (nothing is sequential or derived from the last one)', () => {
    const ids = Array.from({ length: 8 }, () => generateCertificateId(ISSUED));
    expect(new Set(ids).size).toBe(8);
  });
});

describe('collisions', () => {
  it('regenerates when an ID is already taken', async () => {
    const taken = new Set(['LXA-2026-AAAAAA', 'LXA-2026-BBBBBB']);
    const sequence = ['AAAAAA', 'BBBBBB', 'CCCCCC'];
    let n = 0;
    const id = await generateUniqueCertificateId(
      ISSUED,
      (candidate) => Promise.resolve(taken.has(candidate)),
      {
        random: (() => {
          // one letter index per character; feed the wanted suffix's letters
          const letters = sequence
            .join('')
            .split('')
            .map((c) => CERTIFICATE_ID_ALPHABET.indexOf(c));
          return () => letters[n++];
        })(),
      },
    );
    expect(id).toBe('LXA-2026-CCCCCC');
  });

  it('checks every candidate against the store before returning it', async () => {
    const checked: string[] = [];
    const id = await generateUniqueCertificateId(ISSUED, (c) => {
      checked.push(c);
      return Promise.resolve(false);
    });
    expect(checked).toEqual([id]);
  });

  it('gives up with a clear error instead of looping forever', async () => {
    await expect(
      generateUniqueCertificateId(ISSUED, () => Promise.resolve(true), {
        maxAttempts: 4,
      }),
    ).rejects.toThrow(CertificateIdExhaustedError);
  });
});

describe('parseVerifiableCertificateId', () => {
  it('accepts the current format regardless of case or stray spaces', () => {
    expect(parseVerifiableCertificateId('LXA-2026-A7K9Q2')).toBe(
      'LXA-2026-A7K9Q2',
    );
    expect(parseVerifiableCertificateId('  lxa-2026-a7k9q2 ')).toBe(
      'LXA-2026-A7K9Q2',
    );
  });

  it('accepts the number of a certificate issued by the previous system', () => {
    expect(parseVerifiableCertificateId('LMX-2026-1A2B3C4D')).toBe(
      'LMX-2026-1A2B3C4D',
    );
  });

  it.each([
    '',
    'LXA-2026-A7K9Q',
    'LXA-2026-A7K9Q22',
    'LXA-26-A7K9Q2',
    'LXA-2026-A7KIQ2',
    'LXA-2026-A7KOQ2',
    'LXA-2026-A7K0Q2',
    "LXA-2026-A7K9Q2'; DROP TABLE",
    '../etc/passwd',
    'XYZ-2026-A7K9Q2',
  ])('rejects %p', (value) => {
    expect(parseVerifiableCertificateId(value)).toBeNull();
  });
});
