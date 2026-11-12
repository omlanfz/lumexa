/**
 * Regenerates client/lib/catalog-snapshot.json — the offline fallback the
 * marketing site (/programs, /pricing, /about) shows instantly and whenever
 * GET /courses/catalog is unreachable (e.g. the API is cold-starting).
 *
 * The live endpoint is the source of truth and always wins once it answers;
 * this snapshot only exists so those pages are never blank. It is built from
 * the same source files and the same builder (buildPublicCatalog) as the
 * live endpoint, using the seed's own structure rules: every specialized
 * path is 3 modules x (8 lessons + a course test) + a final test, and
 * Odyssey is 3 stages of 3 such modules, each closed by a stage test, plus a
 * final test (see curriculum-catalog.seed.ts). Little Coders is the one
 * exception: it is five independent courses (8 lessons + a course assessment
 * each) + a final assessment, read from src/little-coders rather than from
 * the older three-module JSON (which Odyssey still reuses).
 *
 * Re-run it after changing the source curriculum or the catalog:
 *   npm run export:public-catalog        (from server/)
 */

import * as fs from 'fs';
import * as path from 'path';
import { COURSE_CATALOG } from '../src/courses/course-catalog.seed';
import { PATHWAY_SLUGS } from '../src/courses/curriculum-source';
import { ODYSSEY_STAGES } from '../src/courses/curriculum-catalog.seed';
import { LC_LESSON_SPECS } from '../src/little-coders/curriculum';
import {
  LC_COURSE_SLUG,
  LC_COURSES,
  LC_FINAL_ASSESSMENT_ORDER,
  LC_FINAL_ASSESSMENT_TITLE,
  lcCourseAssessmentOrder,
  lcCourseAssessmentTitle,
  lcLessonOrder,
} from '../src/little-coders/lc.constants';
import {
  buildPublicCatalog,
  lessonIdsNeedingHeading,
  ODYSSEY_SLUG,
  type CatalogLessonRow,
  type CatalogModuleRow,
} from '../src/courses/public-catalog.util';

interface RawLesson {
  title: string;
  contentMarkdown: string;
}
interface RawModule {
  slug: string;
  title: string;
  lessons: RawLesson[];
}
interface RawPathway {
  slug: string;
  modules: RawModule[];
}

const DATA_DIR = path.join(__dirname, 'curriculum-data');
const OUT_FILE = path.resolve(
  process.argv[2] ??
    path.join(__dirname, '../../client/lib/catalog-snapshot.json'),
);

const pathways = new Map<string, RawPathway>();
function loadPathway(slug: string): RawPathway {
  if (!pathways.has(slug)) {
    pathways.set(
      slug,
      JSON.parse(
        fs.readFileSync(path.join(DATA_DIR, `${slug}.json`), 'utf8'),
      ) as RawPathway,
    );
  }
  return pathways.get(slug)!;
}

const modules: CatalogModuleRow[] = [];
const lessons: CatalogLessonRow[] = [];
const markdownByLessonId = new Map<string, string | null>();

function addModule(
  courseId: string,
  mod: RawModule,
  moduleOrder: number,
  startOrder: number,
  stageNumber: number | null,
): number {
  const moduleId = `${courseId}:${mod.slug}`;
  modules.push({
    id: moduleId,
    courseId,
    slug: mod.slug,
    title: mod.title,
    order: moduleOrder,
    stageNumber,
  });
  let order = startOrder;
  for (const l of mod.lessons) {
    const id = `${moduleId}:${order}`;
    lessons.push({
      id,
      courseId,
      moduleId,
      title: l.title,
      order,
      type: 'LEARNING',
    });
    markdownByLessonId.set(id, l.contentMarkdown);
    order++;
  }
  lessons.push({
    id: `${moduleId}:test`,
    courseId,
    moduleId,
    title: `${mod.title} — Course Test`,
    order,
    type: 'COURSE_TEST',
  });
  return order + 1;
}

for (const course of COURSE_CATALOG) {
  let order = 1;
  if (course.slug === ODYSSEY_SLUG) {
    let moduleOrder = 1;
    ODYSSEY_STAGES.forEach((stage, stageIdx) => {
      for (const { pathway, module } of stage) {
        const mod = loadPathway(pathway).modules.find((m) => m.slug === module);
        if (!mod)
          throw new Error(
            `Odyssey mapping error: ${pathway}/${module} not found`,
          );
        order = addModule(course.slug, mod, moduleOrder++, order, stageIdx + 1);
      }
      lessons.push({
        id: `${course.slug}:stage${stageIdx + 1}`,
        courseId: course.slug,
        moduleId: null,
        title: `Stage ${stageIdx + 1} Test`,
        order: order++,
        type: 'STAGE_TEST',
      });
    });
    lessons.push({
      id: `${course.slug}:final`,
      courseId: course.slug,
      moduleId: null,
      title: 'Lumexa Odyssey — Final Test',
      order,
      type: 'FINAL_TEST',
    });
  } else if (course.slug === LC_COURSE_SLUG) {
    // Little Coders v2: five independent courses of eight lessons, each closed by
    // its own course assessment, then one final assessment (46 classes).
    for (const meta of LC_COURSES) {
      const moduleId = `${course.slug}:${meta.slug}`;
      modules.push({
        id: moduleId,
        courseId: course.slug,
        slug: meta.slug,
        title: meta.title,
        order: meta.number,
        stageNumber: null,
      });
      for (const spec of LC_LESSON_SPECS.filter((l) => l.course === meta.number).sort(
        (a, b) => a.lesson - b.lesson,
      )) {
        const lessonOrder = lcLessonOrder(meta.number, spec.lesson);
        const id = `${moduleId}:${lessonOrder}`;
        lessons.push({
          id,
          courseId: course.slug,
          moduleId,
          title: spec.title,
          order: lessonOrder,
          type: 'LEARNING',
        });
        // Titles are authored, never generic: no markdown heading is needed.
        markdownByLessonId.set(id, null);
      }
      lessons.push({
        id: `${moduleId}:test`,
        courseId: course.slug,
        moduleId,
        title: lcCourseAssessmentTitle(meta),
        order: lcCourseAssessmentOrder(meta.number),
        type: 'COURSE_TEST',
      });
    }
    lessons.push({
      id: `${course.slug}:final`,
      courseId: course.slug,
      moduleId: null,
      title: LC_FINAL_ASSESSMENT_TITLE,
      order: LC_FINAL_ASSESSMENT_ORDER,
      type: 'FINAL_TEST',
    });
  } else {
    loadPathway(PATHWAY_SLUGS[course.slug]).modules.forEach((mod, i) => {
      order = addModule(course.slug, mod, i + 1, order, null);
    });
    lessons.push({
      id: `${course.slug}:final`,
      courseId: course.slug,
      moduleId: null,
      title: `${course.title} — Final Test`,
      order,
      type: 'FINAL_TEST',
    });
  }
}

// Programs an admin built lesson by lesson have no source JSON and no modules;
// their outline lives in prisma/public-catalog-outlines and is read as flat
// lessons, exactly as the live database holds them.
interface Outline {
  slug: string;
  title: string;
  emoji: string | null;
  category: string;
  ageMin: number;
  ageMax: number;
  lessons: { type: CatalogLessonRow['type']; title: string }[];
}
const OUTLINE_DIR = path.join(__dirname, 'public-catalog-outlines');
const outlines: Outline[] = fs
  .readdirSync(OUTLINE_DIR)
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f) => JSON.parse(fs.readFileSync(path.join(OUTLINE_DIR, f), 'utf8')) as Outline);
for (const outline of outlines) {
  outline.lessons.forEach((l, i) => {
    lessons.push({
      id: `${outline.slug}:${i + 1}`,
      courseId: outline.slug,
      moduleId: null,
      title: l.title,
      order: i + 1,
      type: l.type,
    });
  });
}

const needHeading = new Set(lessonIdsNeedingHeading(modules, lessons));
const catalog = buildPublicCatalog({
  courses: [...COURSE_CATALOG, ...outlines].map((c) => ({
    id: c.slug,
    slug: c.slug,
    title: c.title,
    emoji: c.emoji,
    category: c.category,
    ageMin: c.ageMin,
    ageMax: c.ageMax,
  })),
  modules,
  lessons,
  markdownByLessonId: new Map(
    [...markdownByLessonId].filter(([id]) => needHeading.has(id)),
  ),
});

fs.writeFileSync(OUT_FILE, JSON.stringify(catalog, null, 2) + '\n');
console.log(
  `[export:public-catalog] wrote ${path.relative(process.cwd(), OUT_FILE)}`,
);
for (const c of catalog.courses) {
  console.log(
    `  ${c.title}: ${c.totalLessons} lessons (${c.learningLessons} learning + ${c.assessmentLessons} assessments), ${c.modules.length} courses`,
  );
}
console.log(
  `  totals: ${catalog.totals.programs} programs, ${catalog.totals.courses} courses`,
);
