// FILE PATH: server/src/certificates/certificate-name.ts
//
// What may be printed on a certificate.
//
// The admin types the exact name to print, and the programme name is confirmed
// too. Both are rendered with the fonts bundled in server/assets/certificate
// (Cormorant Garamond and Inter, Latin + Latin Extended). A character those
// fonts do not contain would be drawn by whatever font the server happens to
// have — or as an empty box — on a document that is permanent. So anything the
// fonts cannot draw is refused HERE, with a message the admin can act on,
// instead of being discovered on the printed page.
//
// Also refused, because they can make text read differently from how it is
// stored: control characters, newlines, zero-width characters and the
// bidirectional override/isolate characters.

export const MAX_RECIPIENT_NAME_LENGTH = 60;
export const MAX_PROGRAM_NAME_LENGTH = 80;

/** Collapses runs of whitespace, trims, and uses precomposed accented letters. */
export function normalizeCertificateText(value: string): string {
  return (value ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
}

/** Letters the bundled fonts contain: Basic Latin, Latin-1 Supplement (minus
 * × and ÷), Latin Extended-A and -B. */
function isSupportedLetter(cp: number): boolean {
  return (
    (cp >= 0x41 && cp <= 0x5a) ||
    (cp >= 0x61 && cp <= 0x7a) ||
    (cp >= 0xc0 && cp <= 0xff && cp !== 0xd7 && cp !== 0xf7) ||
    (cp >= 0x100 && cp <= 0x24f)
  );
}

/** Punctuation a person's name may contain. */
const NAME_PUNCTUATION = new Set([
  0x20, // space
  0x27, // '
  0x2019, // ’
  0x2d, // -
  0x2e, // .
]);

/** Extra characters a programme name may contain: digits and ordinary
 * punctuation that appears in titles ("Python & AI (Ages 8–12)"). */
function isProgramPunctuation(cp: number): boolean {
  return (
    NAME_PUNCTUATION.has(cp) ||
    (cp >= 0x30 && cp <= 0x39) || // 0-9
    '&,:;!?()/+#%@'.includes(String.fromCodePoint(cp)) ||
    (cp >= 0x2010 && cp <= 0x2015) || // dashes
    cp === 0x2018 || // ‘
    cp === 0x201c || // “
    cp === 0x201d || // ”
    cp === 0x2026 // …
  );
}

function firstUnsupported(
  value: string,
  allowed: (cp: number) => boolean,
): string | null {
  for (const char of value) {
    const cp = char.codePointAt(0)!;
    if (!isSupportedLetter(cp) && !allowed(cp)) return char;
  }
  return null;
}

function describe(char: string): string {
  const cp = char.codePointAt(0)!;
  return cp < 0x20 ||
    (cp >= 0x7f && cp < 0xa0) ||
    (cp >= 0x200b && cp <= 0x206f)
    ? `an invisible or control character (U+${cp.toString(16).toUpperCase().padStart(4, '0')})`
    : `"${char}"`;
}

/** An error message if `name` cannot be printed as a recipient name, else null.
 * Pass the already-normalised value (see normalizeCertificateText). */
export function recipientNameProblem(name: string): string | null {
  if (!name) return 'Enter the name to print on the certificate.';
  if ([...name].length > MAX_RECIPIENT_NAME_LENGTH)
    return `The name is too long (at most ${MAX_RECIPIENT_NAME_LENGTH} characters).`;
  const bad = firstUnsupported(name, (cp) => NAME_PUNCTUATION.has(cp));
  if (bad)
    return `The certificate fonts cannot print ${describe(bad)}. Use English letters (accents are fine), spaces, hyphens, apostrophes and full stops.`;
  if (![...name].some((c) => isSupportedLetter(c.codePointAt(0)!)))
    return 'The name must contain at least one letter.';
  return null;
}

/** An error message if `name` cannot be printed as a programme name, else null. */
export function programNameProblem(name: string): string | null {
  if (!name) return 'Enter the programme name to print on the certificate.';
  if ([...name].length > MAX_PROGRAM_NAME_LENGTH)
    return `The programme name is too long (at most ${MAX_PROGRAM_NAME_LENGTH} characters).`;
  const bad = firstUnsupported(name, isProgramPunctuation);
  if (bad)
    return `The certificate fonts cannot print ${describe(bad)} in the programme name.`;
  if (![...name].some((c) => isSupportedLetter(c.codePointAt(0)!)))
    return 'The programme name must contain at least one letter.';
  return null;
}
