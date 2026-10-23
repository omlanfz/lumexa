// Phone number normalisation for the trial form — instant feedback only.
// Mirrors server/src/trial/phone.util.ts (the server is the authority and
// re-validates everything). Accepts Bangladeshi mobiles however a parent types
// them and other international numbers written with "+" / "00" and a country
// code; returns E.164 ("+8801712345678") or a plain-English problem.

export type PhoneResult = { ok: true; e164: string } | { ok: false; reason: string };

const BD_E164 = /^\+8801[3-9]\d{8}$/;
const GENERIC_E164 = /^\+[1-9]\d{7,14}$/;

export function normalizePhone(raw: string): PhoneResult {
  const value = raw.trim();
  if (value === "") return { ok: false, reason: "Please enter your WhatsApp / phone number." };
  if (!/^[+\d\s().-]+$/.test(value)) {
    return { ok: false, reason: "Phone numbers can only contain digits, spaces and a leading +." };
  }

  let digits = value.replace(/\D/g, "");
  if (digits === "") return { ok: false, reason: "Please enter a valid phone number." };

  let international = value.startsWith("+");
  if (!international && digits.startsWith("00")) {
    digits = digits.slice(2);
    international = true;
  }

  if (international) return finish(`+${digits}`);
  if (digits.startsWith("880")) return finish(`+${digits}`);
  if (/^01[3-9]\d{8}$/.test(digits)) return finish(`+880${digits.slice(1)}`);
  if (/^1[3-9]\d{8}$/.test(digits)) return finish(`+880${digits}`);

  return {
    ok: false,
    reason:
      "Enter a Bangladeshi mobile number (e.g. 01712 345678) or an international number starting with + and the country code.",
  };
}

function finish(e164: string): PhoneResult {
  if (e164.startsWith("+880")) {
    return BD_E164.test(e164)
      ? { ok: true, e164 }
      : { ok: false, reason: "That does not look like a Bangladeshi mobile number (e.g. 01712 345678)." };
  }
  return GENERIC_E164.test(e164)
    ? { ok: true, e164 }
    : {
        ok: false,
        reason: "That does not look like a valid international number. Include the country code, e.g. +44 7700 900123.",
      };
}
