// FILE PATH: server/src/courses/course-catalog.seed.ts
//
// The default Lumexa course catalog — the 9 courses Lumexa currently offers:
// the flagship "Lumexa Odyssey" path, its 7 specialized pathways (Little
// Coders, Game Creator, Python Foundations, Web Developer, AI Builder, Data
// Scientist, Digital Independence) and the second signature journey,
// "Pre-University CSE" (8 courses, 73 sessions). One Course row per path (not
// per sub-course) so this is exactly what Operations sees on /admin/courses
// out of the box.
//
// Each specialized pathway is 28 sessions: 3 real 8-lesson sub-courses
// ("modules"), each followed by its own Course Test, plus one Final Test —
// 24 learning sessions + 4 assessment sessions. Lumexa Odyssey is 85
// sessions: 3 stages, each 3 modules (24 learning + 3 course tests) plus one
// Stage Test, plus one Final Test — 72 learning sessions + 13 assessment
// sessions. See curriculum-catalog.seed.ts for how modules/lessons/
// projects/assessments are actually built from the extracted source content
// (server/prisma/curriculum-data/*.json) — this file only owns the
// Course-level catalog row (pricing, age range, category, session count).
//
// A student who needs something other than one of these 9 (e.g. an Odyssey
// track starting partway through because they already know the first two
// courses) gets a one-off custom Course created by an admin from the
// "Custom course for one student" option in the New Course modal — this
// catalog is only the default set, not the only courses that can ever exist.
//
// Idempotent — safe to call on every server boot (see CoursesService
// onModuleInit) and from the standalone `npm run seed:courses` script:
//   - Courses are matched by slug (current or the retired "-path" spelling) or
//     title and never duplicated. Only `sessions` is kept in sync, plus a
//     one-time move off the old "-path" names; everything else on
//     /admin/courses is admin-owned and never overwritten by a reseed.
//   - Module/lesson/project/assessment content is only (re)built when a
//     course doesn't already have it — see seedCurriculumContent.
//   - Test questions are applied by syncAssessmentBanks (server/src/
//     assessments/bank), which upgrades already-seeded databases in place
//     without losing student history.

import { PrismaClient } from '@prisma/client';
import { seedCurriculumContent } from './curriculum-catalog.seed';
import { legacyCourseSlug } from './course-slug';
import { syncAssessmentBanks } from '../assessments/bank/bank.sync';
import { LC_PROGRAM_DESCRIPTION, LC_SESSIONS_TOTAL, isLittleCodersSlug } from '../little-coders/lc.constants';
import { syncLittleCodersBanks } from '../little-coders/assessments/lc-bank.sync';
import { syncStructuredBanks } from '../structured-assessments/structured.sync';
import {
  PUCSE_CATEGORY,
  PUCSE_DESCRIPTION,
  PUCSE_EMOJI,
  PUCSE_SESSIONS,
  PUCSE_SLUG,
  PUCSE_TITLE,
} from '../pre-university-cse/outline';
import { PROGRAM_FACTS, factsBackfill, type CourseLevel } from './program-facts';

interface CourseSeed {
  slug: string;
  title: string;
  description: string;
  emoji: string;
  category: string;
  level: CourseLevel;
  ageMin: number;
  ageMax: number;
  sessions: number;
}

/** The description a program was seeded with before its audience facts changed. A stored description is
 *  replaced by the current seed text only while it is still exactly one of these (admin edits are kept). */
const DEPRECATED_DESCRIPTIONS: Record<string, string[]> = {
  'ai-builder': [
    "A complete, project-driven journey from first line of Python to real machine learning, computer vision, and large language model applications. Students don't just learn about AI — they write the code, train the models, and ship three working portfolio projects. 3 courses, 24 learning sessions plus 3 course tests and a Final Test.",
  ],
};

/** Level and ages of a default program come from PROGRAM_FACTS (one source for the seed, the admin, the website and the PDFs). */
const ageAndLevel = (slug: string) => {
  const f = PROGRAM_FACTS[slug];
  return { level: f.level, ageMin: f.ageMin, ageMax: f.ageMax };
};

/** What to change on a stored default program so it carries the final ages / level / description — and
 *  nothing an admin set themselves (each value moves only while it is still a value this seed used before). */
export function storedFactsPatch(
  seed: Pick<CourseSeed, 'slug' | 'description'>,
  stored: { ageMin: number; ageMax: number; level: string; description: string | null },
): { ageMin?: number; ageMax?: number; level?: CourseLevel; description?: string } {
  const patch: { ageMin?: number; ageMax?: number; level?: CourseLevel; description?: string } = factsBackfill(
    PROGRAM_FACTS[seed.slug],
    stored,
  );
  if (stored.description && DEPRECATED_DESCRIPTIONS[seed.slug]?.includes(stored.description)) {
    patch.description = seed.description;
  }
  return patch;
}

export const COURSE_CATALOG: CourseSeed[] = [
  {
    slug: 'lumexa-odyssey',
    title: 'Lumexa Odyssey',
    description:
      'The flagship path every new student takes. Odyssey is a guided journey across nine real courses — games, websites, apps, data, and AI — giving students broad, hands-on exposure before they choose a specialty. No prior coding experience needed. 3 stages, 9 courses, 72 learning sessions plus 13 built-in assessments (3 course tests + 1 stage test per stage, plus a Final Test).',
    emoji: '🚀',
    category: 'Odyssey',
    ...ageAndLevel('lumexa-odyssey'),
    sessions: 85,
  },
  {
    slug: 'little-coders',
    title: 'Little Coders',
    // The text, and the 46-class structure, are owned by the Little Coders curriculum
    // (server/src/little-coders) — see LC_PROGRAM_DESCRIPTION / LC_SESSIONS_TOTAL.
    description: LC_PROGRAM_DESCRIPTION,
    emoji: '✦',
    category: 'Little Coders',
    ...ageAndLevel('little-coders'),
    sessions: LC_SESSIONS_TOTAL,
  },
  {
    slug: 'game-creator',
    title: 'Game Creator',
    description:
      "A complete, project-driven journey from a first Roblox build to a polished, published game. Students don't just play games — they design them, script them, and ship three real, playable games friends can actually try. 3 courses, 24 learning sessions plus 3 course tests and a Final Test.",
    emoji: '🎮',
    category: 'Game Creator',
    ...ageAndLevel('game-creator'),
    sessions: 28,
  },
  {
    slug: 'python-foundations',
    title: 'Python Foundations',
    description:
      'A complete, hands-on journey into text-based Python, starting from the very first line of code. Students learn Python itself, then learn to think and build like programmers: solving problems, debugging, handling errors, working with files and writing object-oriented code. They finish by setting up real development tools and taking their first steps with Jupyter Notebooks, NumPy, Pandas and APIs. No prior coding experience needed. 3 courses, 24 learning sessions plus 3 course tests and a Final Test.',
    emoji: '🐍',
    category: 'Python Foundations',
    ...ageAndLevel('python-foundations'),
    sessions: 28,
  },
  {
    slug: 'web-developer',
    title: 'Web Developer',
    description:
      "A complete, project-driven journey from a first HTML page to a deployed, full-stack React application. Students don't just learn about the web — they write the code, style real interfaces, and ship three live, working websites anyone can visit. 3 courses, 24 learning sessions plus 3 course tests and a Final Test.",
    emoji: '🌐',
    category: 'Web Developer',
    ...ageAndLevel('web-developer'),
    sessions: 28,
  },
  {
    slug: 'ai-builder',
    title: 'AI Builder',
    description:
      "A complete, project-driven journey that builds on basic Python to reach real machine learning, computer vision, and large language model applications. Students don't just learn about AI — they write the code, train the models, and ship three working portfolio projects. Basic Python knowledge is needed to start. 3 courses, 24 learning sessions plus 3 course tests and a Final Test.",
    emoji: '🤖',
    category: 'AI Builder',
    ...ageAndLevel('ai-builder'),
    sessions: 28,
  },
  {
    slug: 'data-scientist',
    title: 'Data Scientist',
    description:
      "A complete, project-driven journey from messy raw data to real, working predictive models. Students don't just learn about data science — they clean real datasets, build compelling visualizations, and train machine learning models that make real decisions. 3 courses, 24 learning sessions plus 3 course tests and a Final Test.",
    emoji: '📊',
    category: 'Data Scientist',
    ...ageAndLevel('data-scientist'),
    sessions: 28,
  },
  {
    slug: 'digital-independence',
    title: 'Digital Independence',
    description:
      'Build the portfolio, professional skills, digital reputation and business knowledge needed to turn your abilities into legitimate opportunities. The progression is Identity → Services → Clients → Professional Presence → Opportunities. 3 courses, 24 learning sessions plus 3 course tests and a Final Test.',
    emoji: '💼',
    category: 'Digital Independence',
    ...ageAndLevel('digital-independence'),
    sessions: 28,
  },
  // The second signature journey, beside Lumexa Odyssey: 8 courses x (8 lessons + a course
  // assessment) + a final assessment = 73 sessions. Its structure and content are authored in
  // server/src/pre-university-cse and server/prisma/pre-university-cse.
  {
    slug: PUCSE_SLUG,
    title: PUCSE_TITLE,
    description: PUCSE_DESCRIPTION,
    emoji: PUCSE_EMOJI,
    category: PUCSE_CATEGORY,
    ...ageAndLevel(PUCSE_SLUG),
    sessions: PUCSE_SESSIONS,
  },
];

/** Upserts every course in COURSE_CATALOG, then builds/repairs its module +
 *  lesson + project + assessment content (see curriculum-catalog.seed.ts).
 *  Accepts any Prisma client — PrismaService in the running app, or a bare
 *  PrismaClient from the standalone seed script. */
export async function seedCourseCatalog(
  prisma: PrismaClient,
  logger: { log: (msg: string) => void; warn: (msg: string) => void } = console,
  reconcile?: (courseId: string, actorId: string) => Promise<unknown>,
) {
  const results: { slug: string; title: string; created: boolean }[] = [];

  for (const seed of COURSE_CATALOG) {
    // A default program is "already there" under its current slug, the old
    // "-path" spelling, or (if an admin has re-slugged it) its title. Never
    // create a second copy of a program Operations already manages.
    const existing = await prisma.course.findFirst({
      where: {
        isCustom: false,
        OR: [
          { slug: { in: [seed.slug, legacyCourseSlug(seed.slug)] } },
          { title: { equals: seed.title, mode: 'insensitive' } },
          { title: { equals: `${seed.title} Path`, mode: 'insensitive' } },
        ],
      },
      // Prefer the canonical slug when both spellings somehow exist.
      orderBy: { createdAt: 'asc' },
      select: { id: true, slug: true, title: true, description: true, ageMin: true, ageMax: true, level: true },
    });

    if (!existing) {
      await prisma.course.create({
        data: {
          slug: seed.slug,
          title: seed.title,
          description: seed.description,
          emoji: seed.emoji,
          category: seed.category,
          level: seed.level,
          ageMin: seed.ageMin,
          ageMax: seed.ageMax,
          sessions: seed.sessions,
        },
      });
      results.push({ slug: seed.slug, title: seed.title, created: true });
      continue;
    }

    // Everything on /admin/courses (title, slug, emoji, ages, description,
    // price) is admin-owned and is never overwritten by a reseed; the public
    // site follows whatever Operations sets. Two exceptions keep the catalog
    // sound: the session count tracks the curriculum, and a row still on the
    // retired "-path" naming is moved to the new names once.
    // Little Coders owns its own session count: it only changes inside the Little Coders
    // migration, together with the lessons (never ahead of them).
    const data: {
      sessions?: number;
      slug?: string;
      title?: string;
      ageMin?: number;
      ageMax?: number;
      level?: CourseLevel;
      description?: string;
    } = isLittleCodersSlug(seed.slug) ? {} : { sessions: seed.sessions };
    // Final ages / level: a stored value moves only while it is still exactly what this program used to
    // be seeded with (see factsBackfill) — an admin's own edit is never overwritten.
    Object.assign(data, storedFactsPatch(seed, existing));
    if (existing.slug === legacyCourseSlug(seed.slug)) {
      const taken = await prisma.course.findUnique({
        where: { slug: seed.slug },
        select: { id: true },
      });
      if (!taken) data.slug = seed.slug;
    }
    if (existing.title === `${seed.title} Path`) data.title = seed.title;
    if (Object.keys(data).length > 0) await prisma.course.update({ where: { id: existing.id }, data });
    results.push({ slug: data.slug ?? existing.slug, title: seed.title, created: false });
  }

  await seedCurriculumContent(prisma, logger, reconcile);

  // Questions: apply the authored test banks to every default test session
  // (and keep custom curricula linked to them). Idempotent — a no-op once an
  // assessment is on the current bank version.
  await syncAssessmentBanks(prisma, logger);
  // The redesigned Little Coders assessments (10 MCQ + 5 True/False + a 25-mark practical).
  await syncLittleCodersBanks(prisma, logger);
  // The Pre-University CSE assessments (10 MCQ + 3 short answers + a 20-mark practical = 45 marks, 40 minutes).
  await syncStructuredBanks(prisma, logger);

  return results;
}
