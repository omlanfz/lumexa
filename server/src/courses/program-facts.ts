// FILE PATH: server/src/courses/program-facts.ts
//
// What a parent, a student, a teacher and an admin are told about each default program:
// who it is for (ages), how much a child needs to know first, and the badges that go with
// it. ONE place, so the database seed, the admin screens, the public website, the catalog
// snapshot and every downloadable curriculum PDF can never disagree.
//
//   * Ages and level are stored on the Course row (admins may edit them in /admin/courses).
//     The seed creates a program with the values below and a guarded backfill moves an
//     existing row to them ONLY while the row still holds a value this file replaced
//     (`replaces`) — an administrator's own edit is never overwritten.
//   * Badges, audience line and prerequisite are marketing facts: they are served with the
//     public catalog (`GET /courses/catalog`), the admin course list and the PDFs.
//
// Nothing here changes a curriculum, a price or an assessment.

import { canonicalCourseSlug } from './course-slug';

export type CourseLevel = 'STARTER' | 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

/** How a badge is drawn: green sprout, amber star, blue "know this first", neutral note. */
export type ProgramBadgeTone =
  | 'starter'
  | 'beginner'
  | 'popular'
  | 'prerequisite'
  | 'info';

export interface ProgramBadge {
  label: string;
  tone: ProgramBadgeTone;
}

export interface ProgramFacts {
  /** Canonical course slug (no "-path"). */
  slug: string;
  ageMin: number;
  ageMax: number;
  level: CourseLevel;
  /** One plain line: who this program is for. */
  audience: string;
  /** What a child should know before starting; null when nothing is needed. */
  prerequisite: string | null;
  mostPopular: boolean;
  /** Shown next to the age range, in this order. */
  badges: ProgramBadge[];
  /** Values the seed used before; a stored row is moved to the new ones only while it still has them. */
  replaces: { ages: [number, number][]; levels: CourseLevel[] };
}

const BASIC_PYTHON = 'Basic Python knowledge needed';

export const PROGRAM_FACTS: Record<string, ProgramFacts> = {
  'lumexa-odyssey': {
    slug: 'lumexa-odyssey',
    ageMin: 6,
    ageMax: 18,
    level: 'BEGINNER',
    audience: 'Suitable for all ages — the best choice for beginners',
    prerequisite: null,
    mostPopular: false,
    badges: [
      { label: 'Best choice for beginners', tone: 'beginner' },
      { label: 'Suitable for all ages', tone: 'info' },
    ],
    replaces: { ages: [[12, 18]], levels: [] },
  },
  'little-coders': {
    slug: 'little-coders',
    ageMin: 6,
    ageMax: 12,
    level: 'STARTER',
    audience: 'For first-time coders — complete beginners welcome',
    prerequisite: null,
    mostPopular: false,
    badges: [
      { label: 'Complete beginner friendly', tone: 'starter' },
      { label: 'For first-time coders', tone: 'beginner' },
    ],
    replaces: { ages: [[6, 11]], levels: ['BEGINNER'] },
  },
  'game-creator': {
    slug: 'game-creator',
    ageMin: 6,
    ageMax: 12,
    level: 'BEGINNER',
    audience: 'Beginner friendly — no experience needed',
    prerequisite: null,
    mostPopular: false,
    badges: [{ label: 'Beginner friendly', tone: 'beginner' }],
    replaces: { ages: [[10, 18]], levels: ['INTERMEDIATE'] },
  },
  'python-foundations': {
    slug: 'python-foundations',
    ageMin: 12,
    ageMax: 18,
    level: 'BEGINNER',
    audience: 'Beginner friendly — no prior coding experience needed',
    prerequisite: null,
    mostPopular: false,
    badges: [
      { label: 'Beginner friendly', tone: 'beginner' },
      { label: 'No prior coding experience needed', tone: 'info' },
    ],
    // A new program: nothing was ever seeded under other values.
    replaces: { ages: [], levels: [] },
  },
  'ai-builder': {
    slug: 'ai-builder',
    ageMin: 12,
    ageMax: 18,
    level: 'INTERMEDIATE',
    audience:
      'Our most popular program — for learners who already know basic Python',
    prerequisite: BASIC_PYTHON,
    mostPopular: true,
    badges: [
      { label: 'Most popular', tone: 'popular' },
      { label: 'Basic Python needed', tone: 'prerequisite' },
    ],
    replaces: { ages: [], levels: [] },
  },
  'web-developer': {
    slug: 'web-developer',
    ageMin: 12,
    ageMax: 18,
    level: 'BEGINNER',
    audience: 'Beginner friendly — start with your first web page',
    prerequisite: null,
    mostPopular: false,
    badges: [{ label: 'Beginner friendly', tone: 'beginner' }],
    replaces: { ages: [], levels: ['INTERMEDIATE'] },
  },
  'data-scientist': {
    slug: 'data-scientist',
    ageMin: 12,
    ageMax: 18,
    level: 'INTERMEDIATE',
    audience: 'For learners who already know basic Python',
    prerequisite: BASIC_PYTHON,
    mostPopular: false,
    badges: [{ label: 'Basic Python needed', tone: 'prerequisite' }],
    replaces: { ages: [[13, 18]], levels: [] },
  },
  'advanced-data-science': {
    slug: 'advanced-data-science',
    ageMin: 12,
    ageMax: 18,
    level: 'BEGINNER',
    audience: 'Beginner friendly — starts from scratch',
    prerequisite: null,
    mostPopular: false,
    badges: [{ label: 'Beginner friendly', tone: 'beginner' }],
    // Created by an admin with the schema defaults (6–18); see backfillAdvancedDataScienceProgramDetails.
    replaces: { ages: [[6, 18]], levels: [] },
  },
  'digital-independence': {
    slug: 'digital-independence',
    ageMin: 15,
    ageMax: 18,
    level: 'ADVANCED',
    audience: 'For teens ready to turn their skills into real opportunities',
    prerequisite: null,
    mostPopular: false,
    badges: [{ label: 'Best after a few projects', tone: 'info' }],
    replaces: { ages: [], levels: [] },
  },
};

const slugOfTitle = (title: string): string =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** The facts of a program by slug (either spelling), or — if an admin re-slugged it — by title. */
export function factsForCourse(course: {
  slug: string;
  title?: string | null;
}): ProgramFacts | undefined {
  return (
    PROGRAM_FACTS[canonicalCourseSlug(course.slug)] ??
    (course.title
      ? PROGRAM_FACTS[canonicalCourseSlug(slugOfTitle(course.title))]
      : undefined)
  );
}

/** "Ages 6–12". */
export function ageLabel(
  facts: Pick<ProgramFacts, 'ageMin' | 'ageMax'>,
): string {
  return facts.ageMin === facts.ageMax
    ? `Age ${facts.ageMin}`
    : `Ages ${facts.ageMin}–${facts.ageMax}`;
}

/** The public, display-only part of the facts (what the catalog and the admin list carry). */
export interface PublicProgramFacts {
  badges: ProgramBadge[];
  audience: string | null;
  prerequisite: string | null;
  mostPopular: boolean;
}

export function publicFactsFor(course: {
  slug: string;
  title?: string | null;
}): PublicProgramFacts {
  const facts = factsForCourse(course);
  return {
    badges: facts ? facts.badges.map((b) => ({ ...b })) : [],
    audience: facts?.audience ?? null,
    prerequisite: facts?.prerequisite ?? null,
    mostPopular: facts?.mostPopular ?? false,
  };
}

/**
 * What to change on a stored course so it carries the final ages / level — and nothing else.
 * An age pair or a level is replaced only while it is still EXACTLY a value this program used
 * to be seeded with, so an admin's own edit is never overwritten and a second run is a no-op.
 */
export function factsBackfill(
  facts: ProgramFacts,
  stored: { ageMin: number; ageMax: number; level: string },
): { ageMin?: number; ageMax?: number; level?: CourseLevel } {
  const patch: { ageMin?: number; ageMax?: number; level?: CourseLevel } = {};
  const agesAreFinal =
    stored.ageMin === facts.ageMin && stored.ageMax === facts.ageMax;
  if (
    !agesAreFinal &&
    facts.replaces.ages.some(
      ([min, max]) => min === stored.ageMin && max === stored.ageMax,
    )
  ) {
    patch.ageMin = facts.ageMin;
    patch.ageMax = facts.ageMax;
  }
  if (
    stored.level !== facts.level &&
    facts.replaces.levels.includes(stored.level as CourseLevel)
  ) {
    patch.level = facts.level;
  }
  return patch;
}
