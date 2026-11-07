import {
  MAX_PROGRAM_NAME_LENGTH,
  MAX_RECIPIENT_NAME_LENGTH,
  normalizeCertificateText,
  programNameProblem,
  recipientNameProblem,
} from './certificate-name';

describe('normalizeCertificateText', () => {
  it('trims and collapses whitespace', () => {
    expect(normalizeCertificateText('  Nusrat   Jahan\tTamanna \n')).toBe(
      'Nusrat Jahan Tamanna',
    );
  });
  it('uses precomposed letters so accents are single printable glyphs', () => {
    expect(normalizeCertificateText('José')).toBe('José');
  });
});

describe('recipient name — what the fonts can print', () => {
  it.each([
    'Nusrat Jahan Tamanna',
    "Ahmed O'Brien-Smith",
    'Md. Rahim',
    'María José Núñez',
    'Zoë Ångström',
    'Şükrü Çağlar',
    'Anna ’s',
  ])('accepts %p', (name) => {
    expect(recipientNameProblem(normalizeCertificateText(name))).toBeNull();
  });

  it('refuses an empty name', () => {
    expect(recipientNameProblem('')).toMatch(/Enter the name/);
  });

  it('refuses names the fonts cannot draw, and says which character', () => {
    expect(recipientNameProblem('নুসরাত')).toMatch(/cannot print/);
    expect(recipientNameProblem('Li 李')).toMatch(/"李"/);
    expect(recipientNameProblem('Ada 😀')).toMatch(/cannot print/);
    expect(recipientNameProblem('Ada_Lovelace')).toMatch(/"_"/);
    expect(recipientNameProblem('Ada 3rd')).toMatch(/"3"/);
  });

  it('refuses characters that could make text read differently from how it is stored', () => {
    expect(recipientNameProblem('Ada‮Bob')).toMatch(
      /invisible or control character \(U\+202E\)/,
    ); // bidi override
    expect(recipientNameProblem('Ada​Bob')).toMatch(
      /invisible or control character \(U\+200B\)/,
    ); // zero width space
    expect(recipientNameProblem('Ada\u0000Bob')).toMatch(/U\+0000/);
    expect(recipientNameProblem('Ada\nBob')).toMatch(/U\+000A/);
  });

  it('refuses a name with no letter in it', () => {
    expect(recipientNameProblem('...')).toMatch(/at least one letter/);
    expect(recipientNameProblem("-'.")).toMatch(/at least one letter/);
  });

  it(`limits the length to ${MAX_RECIPIENT_NAME_LENGTH}`, () => {
    expect(
      recipientNameProblem('A'.repeat(MAX_RECIPIENT_NAME_LENGTH)),
    ).toBeNull();
    expect(
      recipientNameProblem('A'.repeat(MAX_RECIPIENT_NAME_LENGTH + 1)),
    ).toMatch(/too long/);
  });
});

describe('programme name', () => {
  it.each([
    'AI Builder',
    'Python & AI (Ages 8–12)',
    'Little Coders: Scratch & Roblox!',
    'Lumexa Odyssey',
    'Data Science 101',
    'Web “Starter”',
  ])('accepts %p', (name) => {
    expect(programNameProblem(normalizeCertificateText(name))).toBeNull();
  });

  it('refuses unprintable or invisible characters', () => {
    expect(programNameProblem('AI 构建')).toMatch(/cannot print/);
    expect(programNameProblem('AI‮Builder')).toMatch(/U\+202E/);
  });

  it('refuses empty or letterless names', () => {
    expect(programNameProblem('')).toMatch(/Enter the programme name/);
    expect(programNameProblem('123')).toMatch(/at least one letter/);
  });

  it(`limits the length to ${MAX_PROGRAM_NAME_LENGTH}`, () => {
    expect(programNameProblem('P'.repeat(MAX_PROGRAM_NAME_LENGTH + 1))).toMatch(
      /too long/,
    );
  });
});
