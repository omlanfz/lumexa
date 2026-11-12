// The platform's own lesson titles, read from the curriculum data the database is seeded from
// (server/prisma/curriculum-data/*.json), so a PDF can never list a lesson the course does not have.

import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(__dirname, '../../curriculum-data');

interface RawModule {
  slug: string;
  title: string;
  lessons: { title: string }[];
}

const cache = new Map<string, RawModule[]>();

function modulesOf(pathway: string): RawModule[] {
  let m = cache.get(pathway);
  if (!m) {
    m = (
      JSON.parse(
        fs.readFileSync(path.join(DATA_DIR, `${pathway}.json`), 'utf8'),
      ) as { modules: RawModule[] }
    ).modules;
    cache.set(pathway, m);
  }
  return m;
}

/** "Course 13 · Python for Data — Lesson 4: Pandas — Selecting…" → "Pandas — Selecting…"; "Student Guide — Lesson 2: X" → "X". */
function cleanTitle(title: string): string {
  return title
    .replace(/^Course \d+ · [^—]+— Lesson \d+:\s*/, '')
    .replace(/^Student Guide — Lesson \d+:\s*/, '')
    .trim();
}

export function moduleLessons(pathway: string, moduleSlug: string): string[] {
  const mod = modulesOf(pathway).find((x) => x.slug === moduleSlug);
  if (!mod)
    throw new Error(
      `Curriculum data has no module "${moduleSlug}" in "${pathway}".`,
    );
  const titles = mod.lessons.map((l) => cleanTitle(l.title));
  if (titles.length !== 8)
    throw new Error(
      `${pathway}/${moduleSlug} has ${titles.length} lessons, expected 8.`,
    );
  return titles;
}

export function moduleTitle(pathway: string, moduleSlug: string): string {
  const mod = modulesOf(pathway).find((x) => x.slug === moduleSlug);
  if (!mod)
    throw new Error(
      `Curriculum data has no module "${moduleSlug}" in "${pathway}".`,
    );
  return mod.title;
}
