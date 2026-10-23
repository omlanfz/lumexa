// FILE PATH: server/src/trial/phone.util.ts
//
// Phone normalisation for the trial form. No libphonenumber dependency: we
// only need to (a) recognise Bangladeshi mobile numbers however a parent
// types them and (b) sanity-check international numbers against E.164.
// The client has a mirrored copy (client/lib/phone.ts) for instant feedback;
// this file is the authority.

export type PhoneResult =
  | { ok: true; e164: string; isBangladesh: boolean }
  | { ok: false; reason: string };

// +880 then a mobile number: 1[3-9] followed by 8 digits.
const BD_E164 = /^\+8801[3-9]\d{8}$/;
// Any other E.164 number: + country code (no leading 0) + 7–14 more digits.
const GENERIC_E164 = /^\+[1-9]\d{7,14}$/;

export function normalizePhone(raw: unknown): PhoneResult {
  if (typeof raw !== 'string') {
    return { ok: false, reason: 'Enter a phone / WhatsApp number.' };
  }
  const value = raw.trim();
  if (value === '') {
    return { ok: false, reason: 'Enter a phone / WhatsApp number.' };
  }
  // Only digits and common separators are allowed — reject letters outright
  // rather than silently stripping them.
  if (!/^[+\d\s().-]+$/.test(value)) {
    return {
      ok: false,
      reason: 'Phone numbers can only contain digits, spaces and a leading +.',
    };
  }

  const hasPlus = value.startsWith('+');
  let digits = value.replace(/\D/g, '');
  if (digits === '')
    return { ok: false, reason: 'Enter a valid phone number.' };

  let international = hasPlus;
  if (!hasPlus && digits.startsWith('00')) {
    // 00880… international dialling prefix
    digits = digits.slice(2);
    international = true;
  }

  if (international) {
    return finish(`+${digits}`);
  }

  // No "+" / "00": interpret as a Bangladeshi number in any of its usual forms.
  if (digits.startsWith('880')) return finish(`+${digits}`); // 8801712345678
  if (/^01[3-9]\d{8}$/.test(digits)) return finish(`+880${digits.slice(1)}`); // 01712345678
  if (/^1[3-9]\d{8}$/.test(digits)) return finish(`+880${digits}`); // 1712345678

  return {
    ok: false,
    reason:
      'Enter a Bangladeshi mobile number (e.g. 01712 345678) or an international number starting with + and the country code.',
  };
}

function finish(e164: string): PhoneResult {
  if (e164.startsWith('+880')) {
    return BD_E164.test(e164)
      ? { ok: true, e164, isBangladesh: true }
      : {
          ok: false,
          reason:
            'That does not look like a Bangladeshi mobile number (e.g. 01712 345678).',
        };
  }
  return GENERIC_E164.test(e164)
    ? { ok: true, e164, isBangladesh: false }
    : {
        ok: false,
        reason:
          'That does not look like a valid international number. Include the country code, e.g. +44 7700 900123.',
      };
}

/** "+8801712345678" → "+88017••••5678" for logs/diagnostics. */
export function maskPhone(e164: string | null | undefined): string {
  if (!e164) return '';
  if (e164.length <= 8) return '••••';
  return `${e164.slice(0, 6)}••••${e164.slice(-4)}`;
}

/** WhatsApp Cloud API wants the number as digits only (no "+"). */
export function toWhatsAppRecipient(e164: string): string {
  return e164.replace(/^\+/, '');
}
