import {
  CATEGORY_ALIASES,
  CATEGORY_KEYWORDS,
  CERTIFICATE_CATEGORIES,
  SLUG_CATEGORIES,
  listCertificateThemes,
  normalizeCategory,
  resolveCertificateCategory,
  resolveCertificateTheme,
  themeSnapshot,
  type CertificateCategory,
  type CertificateCategoryId,
} from './certificate-themes';
import { CERTIFICATE_CATEGORIES as ALL } from './certificate-themes';

const HEX = /^#[0-9a-f]{6}$/i;

describe('certificate themes — the four initial categories', () => {
  it('has exactly the four agreed categories with their accents', () => {
    expect(
      Object.values(CERTIFICATE_CATEGORIES).map((c) => [c.label, c.accent]),
    ).toEqual([
      ['Creative Coding & Game Development', 'Muted violet'],
      ['Web & Digital Skills', 'Deep blue'],
      ['AI & Data Science', 'Muted teal'],
      ['Other / General Programs', 'Navy and champagne gold'],
    ]);
  });

  it('every palette defines every accent slot with a real colour', () => {
    for (const category of Object.values(CERTIFICATE_CATEGORIES)) {
      const p = category.palette;
      const all = [
        ...p.ribbon,
        ...p.underline,
        p.titleRule,
        p.ornament,
        p.programName,
        p.rosette,
        ...p.sealRing,
        ...p.sealInnerRing,
        ...p.sealDisc,
        ...p.sealCore,
      ];
      expect(all.length).toBe(3 + 3 + 1 + 1 + 1 + 1 + 2 + 2 + 2 + 2);
      for (const colour of all) expect(colour).toMatch(HEX);
    }
  });

  it('theme keys are unique and URL/DB friendly', () => {
    const keys = Object.values(CERTIFICATE_CATEGORIES).map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of keys) expect(key).toMatch(/^[a-z]+(-[a-z]+)*$/);
  });

  it('every alias, slug and keyword rule points at a defined category', () => {
    const ids = Object.keys(CERTIFICATE_CATEGORIES);
    for (const id of Object.values(CATEGORY_ALIASES)) expect(ids).toContain(id);
    for (const id of Object.values(SLUG_CATEGORIES)) expect(ids).toContain(id);
    for (const id of Object.keys(CATEGORY_KEYWORDS)) expect(ids).toContain(id);
  });

  it('every alias is already in normalised form (so it can actually match)', () => {
    for (const alias of Object.keys(CATEGORY_ALIASES))
      expect(normalizeCategory(alias)).toBe(alias);
  });
});

describe('certificate themes — a programme inherits from its category', () => {
  const themeOf = (category: string | null, slug?: string) =>
    resolveCertificateTheme({ category, slug }).key;

  it.each([
    ['Creative Coding & Game Development', 'creative-coding-game-dev'],
    ['Web & Digital Skills', 'web-digital-skills'],
    ['AI & Data Science', 'ai-data-science'],
    ['Other / General Programs', 'general'],
  ])('the category "%s" gets its own theme', (category, key) => {
    expect(themeOf(category)).toBe(key);
  });

  it.each([
    ['Little Coders', 'creative-coding-game-dev'],
    ['Game Creator', 'creative-coding-game-dev'],
    ['Python Foundations', 'ai-data-science'],
    ['Web Developer', 'web-digital-skills'],
    ['Digital Independence', 'web-digital-skills'],
    ['AI Builder', 'ai-data-science'],
    ['Data Scientist', 'ai-data-science'],
    ['Advanced Data Science', 'ai-data-science'],
    ['Odyssey', 'general'],
  ])(
    'the default programme "%s" (stored as its own Course.category) → %s',
    (category, key) => {
      expect(themeOf(category)).toBe(key);
    },
  );

  it('spelling, case and punctuation of the category do not matter', () => {
    expect(themeOf('  game   CREATOR ')).toBe('creative-coding-game-dev');
    expect(themeOf('web-developer')).toBe('web-digital-skills');
    expect(themeOf('AI & Data Science')).toBe(themeOf('ai data science'));
  });

  it('falls back to the programme slug (and the retired "-path" suffix) when the category is unrecognised', () => {
    expect(themeOf('Python', 'ai-builder')).toBe('ai-data-science');
    expect(themeOf('Python', 'ai-builder-path')).toBe('ai-data-science');
    expect(themeOf('???', 'lumexa-odyssey')).toBe('general');
    expect(themeOf('???', 'python-foundations')).toBe('ai-data-science');
  });

  it('places a NEW programme by the words of its category', () => {
    expect(themeOf('Roblox Game Design')).toBe('creative-coding-game-dev');
    expect(themeOf('Website Design')).toBe('web-digital-skills');
    expect(themeOf('Applied Machine Learning')).toBe('ai-data-science');
  });

  it('matches whole words only ("Painting" is not "ai")', () => {
    expect(themeOf('Painting')).toBe('general');
    expect(themeOf('Chaining')).toBe('general');
  });

  it('anything unrecognised, or missing, is "Other / General Programs"', () => {
    expect(themeOf('Origami')).toBe('general');
    expect(themeOf(null)).toBe('general');
    expect(themeOf('', '')).toBe('general');
    expect(resolveCertificateTheme({}).label).toBe('Other / General Programs');
  });

  it('a programme added tomorrow with an existing category is themed with no code change', () => {
    // Nothing about "Brand New Robotics Course" is configured anywhere: it simply
    // carries the category an admin picked, and inherits the theme.
    expect(
      resolveCertificateTheme({
        category: 'Game Creator',
        slug: 'brand-new-robotics-course',
      }).key,
    ).toBe('creative-coding-game-dev');
  });

  it('resolves to the same category from the same inputs every time', () => {
    const a = resolveCertificateCategory({ category: 'Data Scientist' });
    expect(resolveCertificateCategory({ category: 'Data Scientist' })).toBe(a);
  });
});

describe('certificate themes — a genuinely new category is added in ONE place', () => {
  const mutable = ALL as unknown as Record<string, CertificateCategory>;
  const aliases = CATEGORY_ALIASES as unknown as Record<
    string,
    CertificateCategoryId
  >;

  afterEach(() => {
    delete mutable.ROBOTICS;
    delete aliases.robotics;
    delete aliases['robotics lab'];
  });

  it('only needs an entry in the central configuration — no template change', () => {
    expect(resolveCertificateTheme({ category: 'Robotics' }).key).toBe(
      'general',
    );

    mutable.ROBOTICS = {
      key: 'robotics',
      label: 'Robotics',
      accent: 'Warm copper',
      palette: {
        ...CERTIFICATE_CATEGORIES.GENERAL.palette,
        ornament: '#b45309',
      },
    };
    aliases.robotics = 'ROBOTICS' as CertificateCategoryId;
    aliases['robotics lab'] = 'ROBOTICS' as CertificateCategoryId;

    const theme = resolveCertificateTheme({ category: 'Robotics Lab' });
    expect(theme.key).toBe('robotics');
    expect(theme.palette.ornament).toBe('#b45309');
    expect(listCertificateThemes().map((t) => t.key)).toContain('robotics');
  });
});

describe('what is stored on an issued certificate', () => {
  it('the snapshot carries the theme key, label and the exact colours used', () => {
    const theme = resolveCertificateTheme({ category: 'AI Builder' });
    const snap = themeSnapshot(theme);
    expect(snap).toEqual({
      key: 'ai-data-science',
      label: 'AI & Data Science',
      accent: 'Muted teal',
      palette: CERTIFICATE_CATEGORIES.AI_DATA_SCIENCE.palette,
    });
    // JSON-safe: it is stored in a jsonb column.
    expect(JSON.parse(JSON.stringify(snap))).toEqual(snap);
  });
});
