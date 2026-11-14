// FILE PATH: server/src/certificates/certificate-themes.ts
//
// THE central place that decides what accent colour a certificate gets.
//
// There is ONE master certificate template (template/certificate-template.ts).
// Only its accent slots are themed: the ribbon borders, the name underline, the
// rules beside the title, the corner medallions, the programme name, the faint
// rosette and the seal's ring. Layout, typography, logo, wording, gold labels,
// signature, QR and seal artwork are identical for every theme.
//
// A programme never stores a theme. It inherits one from its CATEGORY at the
// moment a certificate is issued:
//
//     Course.category  ──(CATEGORY_ALIASES)──▶  CertificateCategory ──▶ theme
//
// so a programme an admin adds tomorrow with an existing category is themed
// correctly with no code change. Resolution order (resolveCertificateTheme):
//
//   1. the programme's category, matched against CATEGORY_ALIASES
//   2. its slug (the retired "-path" suffix ignored), against SLUG_CATEGORIES
//   3. whole words of the category/slug, against CATEGORY_KEYWORDS
//   4. otherwise "Other / General Programs" (navy and champagne gold)
//
// ADDING A GENUINELY NEW CATEGORY is one edit in this file:
//   • add an entry to CERTIFICATE_CATEGORIES (key, label and palette),
//   • list the Course.category spellings that belong to it in CATEGORY_ALIASES
//     (and, optionally, keywords in CATEGORY_KEYWORDS).
// The template, the renderer and the database need no change. Certificates that
// were already issued keep the theme (and a snapshot of its colours) stored on
// them, so changing a palette here never alters an issued certificate.

import { canonicalCourseSlug } from '../courses/course-slug';

export interface CertificatePalette {
  /** Top and bottom ribbon borders, left to right. The left border uses the
   * first stop, the right border the last. */
  ribbon: readonly [string, string, string];
  /** The line under the recipient's name, left to right. */
  underline: readonly [string, string, string];
  /** The fading rules either side of "Certificate of Completion". */
  titleRule: string;
  /** The four-pointed star in each corner medallion. */
  ornament: string;
  /** The programme title. */
  programName: string;
  /** The faint rosette behind the text. */
  rosette: string;
  /** The seal's scalloped edge, top-left to bottom-right. */
  sealRing: readonly [string, string];
  /** The thin ring around the seal's mascot. */
  sealInnerRing: readonly [string, string];
  /** The seal's dark disc, centre to edge. */
  sealDisc: readonly [string, string];
  /** The disc behind the seal's mascot, centre to edge. */
  sealCore: readonly [string, string];
}

export interface CertificateCategory {
  key: string;
  /** Shown to admins and stored on the certificate's theme snapshot. */
  label: string;
  /** What the accent looks like, for admins. */
  accent: string;
  palette: CertificatePalette;
}

/** The categories (and their accent palettes). Keep every palette muted and
 * professional: the accent is a tint on a fixed design, never a redesign. */
export const CERTIFICATE_CATEGORIES = {
  CREATIVE_CODING_GAME_DEV: {
    key: 'creative-coding-game-dev',
    label: 'Creative Coding & Game Development',
    accent: 'Muted violet',
    palette: {
      ribbon: ['#8f7fd4', '#7660c8', '#5a3fb0'],
      underline: ['#9585d6', '#7660c8', '#5a3fb0'],
      titleRule: '#7660c8',
      ornament: '#5a3fb4',
      programName: '#3f2a8f',
      rosette: '#d3cdee',
      sealRing: ['#9585d6', '#5a3fb0'],
      sealInnerRing: ['#a496e0', '#6c52c2'],
      sealDisc: ['#3c2f9c', '#1d1352'],
      sealCore: ['#35298f', '#160f47'],
    },
  },
  WEB_DIGITAL_SKILLS: {
    key: 'web-digital-skills',
    label: 'Web & Digital Skills',
    accent: 'Deep blue',
    palette: {
      ribbon: ['#5b8fdc', '#3a6ec8', '#1d4a9e'],
      underline: ['#6296de', '#3a6ec8', '#1b4799'],
      titleRule: '#3a6ec8',
      ornament: '#1f4fa8',
      programName: '#143a82',
      rosette: '#c9d6ee',
      sealRing: ['#6296de', '#1a4799'],
      sealInnerRing: ['#76a3e4', '#2a5db4'],
      sealDisc: ['#1f3f93', '#0d1d57'],
      sealCore: ['#1a3786', '#0a1948'],
    },
  },
  AI_DATA_SCIENCE: {
    key: 'ai-data-science',
    label: 'AI & Data Science',
    accent: 'Muted teal',
    palette: {
      ribbon: ['#45b8aa', '#2f9d93', '#1d7774'],
      underline: ['#52bfb1', '#2f9d93', '#1b726f'],
      titleRule: '#2f9d93',
      ornament: '#1f8c86',
      programName: '#14615f',
      rosette: '#c9e3df',
      sealRing: ['#52bfb1', '#1c7572'],
      sealInnerRing: ['#66c8bb', '#2c9189'],
      sealDisc: ['#1c6a73', '#0b2f3d'],
      sealCore: ['#185f69', '#09283a'],
    },
  },
  GENERAL: {
    key: 'general',
    label: 'Other / General Programs',
    accent: 'Navy and champagne gold',
    palette: {
      ribbon: ['#1f2b5e', '#7b7a93', '#c4a766'],
      underline: ['#243068', '#8a8196', '#c9ad6d'],
      titleRule: '#b99a58',
      ornament: '#222f68',
      programName: '#1b2559',
      rosette: '#d9d6e2',
      sealRing: ['#c9ad6d', '#222f68'],
      sealInnerRing: ['#d6bd82', '#2b3977'],
      sealDisc: ['#232f6e', '#0d1235'],
      sealCore: ['#1e2963', '#0a0f2f'],
    },
  },
} as const satisfies Record<string, CertificateCategory>;

export type CertificateCategoryId = keyof typeof CERTIFICATE_CATEGORIES;

/** What an unrecognised programme gets. */
export const DEFAULT_CERTIFICATE_CATEGORY: CertificateCategoryId = 'GENERAL';

/** Course.category spellings (lower-case, punctuation and spacing ignored — see
 * normalizeCategory) → the certificate category. The platform stores a
 * programme's own name in Course.category for the default programmes, so those
 * names are listed alongside the four category names themselves. */
export const CATEGORY_ALIASES: Readonly<Record<string, CertificateCategoryId>> =
  {
    // the categories by their own names
    'creative coding game development': 'CREATIVE_CODING_GAME_DEV',
    'creative coding': 'CREATIVE_CODING_GAME_DEV',
    'game development': 'CREATIVE_CODING_GAME_DEV',
    'web digital skills': 'WEB_DIGITAL_SKILLS',
    'web development': 'WEB_DIGITAL_SKILLS',
    'digital skills': 'WEB_DIGITAL_SKILLS',
    'ai data science': 'AI_DATA_SCIENCE',
    ai: 'AI_DATA_SCIENCE',
    'data science': 'AI_DATA_SCIENCE',
    'other general programs': 'GENERAL',
    general: 'GENERAL',
    other: 'GENERAL',
    // the default programmes (Course.category = the programme's own name)
    'little coders': 'CREATIVE_CODING_GAME_DEV',
    'game creator': 'CREATIVE_CODING_GAME_DEV',
    'python foundations': 'AI_DATA_SCIENCE',
    'web developer': 'WEB_DIGITAL_SKILLS',
    'digital independence': 'WEB_DIGITAL_SKILLS',
    'ai builder': 'AI_DATA_SCIENCE',
    'data scientist': 'AI_DATA_SCIENCE',
    'advanced data science': 'AI_DATA_SCIENCE',
    // the flagship spans every category, so it takes the general theme
    odyssey: 'GENERAL',
    'lumexa odyssey': 'GENERAL',
    // the university-preparation journey spans programming, mathematics, systems and data: general
    'pre university cse': 'GENERAL',
  };

/** Canonical Course.slug (no "-path") → the certificate category. Used when an
 * admin has set an unrecognised Course.category on a default programme. */
export const SLUG_CATEGORIES: Readonly<Record<string, CertificateCategoryId>> =
  {
    'little-coders': 'CREATIVE_CODING_GAME_DEV',
    'game-creator': 'CREATIVE_CODING_GAME_DEV',
    'python-foundations': 'AI_DATA_SCIENCE',
    'web-developer': 'WEB_DIGITAL_SKILLS',
    'digital-independence': 'WEB_DIGITAL_SKILLS',
    'ai-builder': 'AI_DATA_SCIENCE',
    'data-scientist': 'AI_DATA_SCIENCE',
    'advanced-data-science': 'AI_DATA_SCIENCE',
    'lumexa-odyssey': 'GENERAL',
    'pre-university-cse': 'GENERAL',
  };

/** Whole words that place a programme with a category nobody listed above
 * (e.g. a new "Roblox Game Design" programme). Whole words only, so "Painting"
 * is not "ai". */
export const CATEGORY_KEYWORDS: Readonly<
  Record<CertificateCategoryId, readonly string[]>
> = {
  CREATIVE_CODING_GAME_DEV: [
    'game',
    'games',
    'gaming',
    'scratch',
    'roblox',
    'creative',
    'animation',
  ],
  WEB_DIGITAL_SKILLS: [
    'web',
    'website',
    'websites',
    'html',
    'css',
    'javascript',
    'frontend',
    'fullstack',
    'digital',
  ],
  AI_DATA_SCIENCE: ['ai', 'ml', 'data', 'machine', 'analytics'],
  GENERAL: [],
};

/** "Game Creator" / "game-creator" / "Game & Creator" all become the same key. */
export function normalizeCategory(value: string | null | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export interface ThemeInput {
  /** Course.category */
  category?: string | null;
  /** Course.slug */
  slug?: string | null;
}

/** The certificate category a programme belongs to. */
export function resolveCertificateCategory(
  input: ThemeInput,
): CertificateCategoryId {
  const category = normalizeCategory(input.category);
  if (category && CATEGORY_ALIASES[category]) return CATEGORY_ALIASES[category];

  const slug = input.slug ? canonicalCourseSlug(input.slug.toLowerCase()) : '';
  if (slug && SLUG_CATEGORIES[slug]) return SLUG_CATEGORIES[slug];

  const words = new Set(
    `${category} ${normalizeCategory(slug)}`.split(' ').filter(Boolean),
  );
  for (const id of Object.keys(CATEGORY_KEYWORDS) as CertificateCategoryId[]) {
    if (CATEGORY_KEYWORDS[id].some((w) => words.has(w))) return id;
  }
  return DEFAULT_CERTIFICATE_CATEGORY;
}

export interface ResolvedCertificateTheme {
  /** Stored on the certificate: which theme was chosen. */
  key: string;
  label: string;
  accent: string;
  palette: CertificatePalette;
}

export function resolveCertificateTheme(
  input: ThemeInput,
): ResolvedCertificateTheme {
  const category: CertificateCategory =
    CERTIFICATE_CATEGORIES[resolveCertificateCategory(input)];
  return {
    key: category.key,
    label: category.label,
    accent: category.accent,
    palette: category.palette,
  };
}

/** What is stored on an issued certificate (`themeSnapshot`): the colours it
 * was actually printed with, so a later palette change is never read back as
 * "what this certificate looked like". */
export function themeSnapshot(theme: ResolvedCertificateTheme) {
  return {
    key: theme.key,
    label: theme.label,
    accent: theme.accent,
    palette: theme.palette,
  };
}

/** Every theme, for the admin UI. `accent` describes the colour for people
 * ("Deep blue"); `color` is a real swatch (the palette's middle ribbon colour) to
 * draw a dot with. */
export function listCertificateThemes() {
  return Object.values(CERTIFICATE_CATEGORIES).map((c) => ({
    key: c.key,
    label: c.label,
    accent: c.accent,
    color: c.palette.ribbon[1],
  }));
}
