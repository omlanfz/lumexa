// FILE PATH: server/src/courses/course-catalog.seed.ts
//
// The default Lumexa course catalog — the 7 courses Lumexa currently offers:
// the flagship "Lumexa Odyssey" path and its 6 specialized pathways (Little
// Coders, Game Creator, Web Developer, AI Builder, Data Scientist, Digital
// Independence). One Course row per path (not per sub-course) so this is
// exactly what Operations sees on /admin/courses out of the box.
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
// A student who needs something other than one of these 7 (e.g. an Odyssey
// track starting partway through because they already know the first two
// courses) gets a one-off custom Course created by an admin from the
// "Custom course for one student" option in the New Course modal — this
// catalog is only the default set, not the only courses that can ever exist.
//
// Idempotent — safe to call on every server boot (see CoursesService
// onModuleInit) and from the standalone `npm run seed:courses` script:
//   - Courses are upserted by `slug`, never duplicated. `sessions` is kept
//     in sync; `priceCents` is deliberately NEVER set here (existing
//     pricing is admin-owned and must never be overwritten by a reseed).
//   - Module/lesson/project/assessment content is only (re)built when a
//     course doesn't already have it — see seedCurriculumContent.

import { PrismaClient } from '@prisma/client';
import { seedCurriculumContent } from './curriculum-catalog.seed';

interface CourseSeed {
  slug: string;
  title: string;
  description: string;
  emoji: string;
  category: string;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  ageMin: number;
  ageMax: number;
  sessions: number;
}

export const COURSE_CATALOG: CourseSeed[] = [
  {
    slug: 'lumexa-odyssey',
    title: 'Lumexa Odyssey',
    description:
      'The flagship path every new student takes. Odyssey is a guided journey across nine real courses — games, websites, apps, data, and AI — giving students broad, hands-on exposure before they choose a specialty. No prior coding experience needed. 3 stages, 9 courses, 72 learning sessions plus 13 built-in assessments (3 course tests + 1 stage test per stage, plus a Final Test).',
    emoji: '🚀',
    category: 'Odyssey',
    level: 'BEGINNER',
    ageMin: 12,
    ageMax: 18,
    sessions: 85,
  },
  {
    slug: 'little-coders-path',
    title: 'Little Coders Path',
    description:
      'A gentle, hands-on introduction to computing for young learners. Students move from colorful visual blocks to real Python code and even a first taste of AI — building genuine, shareable projects the whole way, at a pace made for ages 6–11. 3 courses, 24 learning sessions plus 3 course tests and a Final Test.',
    emoji: '✦',
    category: 'Little Coders',
    level: 'BEGINNER',
    ageMin: 6,
    ageMax: 11,
    sessions: 28,
  },
  {
    slug: 'game-creator-path',
    title: 'Game Creator Path',
    description:
      "A complete, project-driven journey from a first Roblox build to a polished, published game. Students don't just play games — they design them, script them, and ship three real, playable games friends can actually try. 3 courses, 24 learning sessions plus 3 course tests and a Final Test.",
    emoji: '🎮',
    category: 'Game Creator',
    level: 'INTERMEDIATE',
    ageMin: 10,
    ageMax: 18,
    sessions: 28,
  },
  {
    slug: 'web-developer-path',
    title: 'Web Developer Path',
    description:
      "A complete, project-driven journey from a first HTML page to a deployed, full-stack React application. Students don't just learn about the web — they write the code, style real interfaces, and ship three live, working websites anyone can visit. 3 courses, 24 learning sessions plus 3 course tests and a Final Test.",
    emoji: '🌐',
    category: 'Web Developer',
    level: 'INTERMEDIATE',
    ageMin: 12,
    ageMax: 18,
    sessions: 28,
  },
  {
    slug: 'ai-builder-path',
    title: 'AI Builder Path',
    description:
      "A complete, project-driven journey from first line of Python to real machine learning, computer vision, and large language model applications. Students don't just learn about AI — they write the code, train the models, and ship three working portfolio projects. 3 courses, 24 learning sessions plus 3 course tests and a Final Test.",
    emoji: '🤖',
    category: 'AI Builder',
    level: 'INTERMEDIATE',
    ageMin: 12,
    ageMax: 18,
    sessions: 28,
  },
  {
    slug: 'data-scientist-path',
    title: 'Data Scientist Path',
    description:
      "A complete, project-driven journey from messy raw data to real, working predictive models. Students don't just learn about data science — they clean real datasets, build compelling visualizations, and train machine learning models that make real decisions. 3 courses, 24 learning sessions plus 3 course tests and a Final Test.",
    emoji: '📊',
    category: 'Data Scientist',
    level: 'INTERMEDIATE',
    ageMin: 13,
    ageMax: 18,
    sessions: 28,
  },
  {
    slug: 'digital-independence-path',
    title: 'Digital Independence Path',
    description:
      'Build the portfolio, professional skills, digital reputation and business knowledge needed to turn your abilities into legitimate opportunities. The progression is Identity → Services → Clients → Professional Presence → Opportunities. 3 courses, 24 learning sessions plus 3 course tests and a Final Test.',
    emoji: '💼',
    category: 'Digital Independence',
    level: 'ADVANCED',
    ageMin: 15,
    ageMax: 18,
    sessions: 28,
  },
];

/** Upserts every course in COURSE_CATALOG, then builds/repairs its module +
 *  lesson + project + assessment content (see curriculum-catalog.seed.ts).
 *  Accepts any Prisma client — PrismaService in the running app, or a bare
 *  PrismaClient from the standalone seed script. */
export async function seedCourseCatalog(
  prisma: PrismaClient,
  logger: { log: (msg: string) => void; warn: (msg: string) => void } = console,
) {
  const results: { slug: string; title: string; created: boolean }[] = [];

  for (const seed of COURSE_CATALOG) {
    const existing = await prisma.course.findUnique({
      where: { slug: seed.slug },
      select: { id: true },
    });

    await prisma.course.upsert({
      where: { slug: seed.slug },
      update: {
        title: seed.title,
        description: seed.description,
        emoji: seed.emoji,
        category: seed.category,
        level: seed.level,
        ageMin: seed.ageMin,
        ageMax: seed.ageMax,
        sessions: seed.sessions,
        // priceCents intentionally omitted — never overwrite admin-set pricing.
      },
      create: {
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

    results.push({ slug: seed.slug, title: seed.title, created: !existing });
  }

  await seedCurriculumContent(prisma, logger);

  return results;
}
