// FILE PATH: server/src/courses/public-catalog.util.ts
//
// Pure builder for the public (marketing-site) course catalog — the data
// behind the /programs, /pricing and /about pages. It turns the same
// Course / CourseModule / Lesson rows Operations manages on /admin/courses
// into a parent-safe shape, so every count the website shows (programs,
// courses, lessons per program, the 85-lesson Odyssey) is derived from the
// live catalog and can never drift from what admin sees.
//
// Deliberately thin, like CoursesService.findBySlug: titles, order and
// session type only. Rich lesson content (objectives, markdown, homework,
// code, MCQ banks) and prices are never exposed here.

import { publicFactsFor, type ProgramBadge } from './program-facts';

export const ODYSSEY_SLUG = 'lumexa-odyssey';

export type PublicLessonType =
  | 'LEARNING'
  | 'COURSE_TEST'
  | 'STAGE_TEST'
  | 'FINAL_TEST';

export interface CatalogCourseRow {
  id: string;
  slug: string;
  title: string;
  emoji: string | null;
  category: string;
  ageMin: number;
  ageMax: number;
}

export interface CatalogModuleRow {
  id: string;
  courseId: string;
  slug: string;
  title: string;
  order: number;
  stageNumber: number | null;
}

export interface CatalogLessonRow {
  id: string;
  courseId: string;
  moduleId: string | null;
  title: string;
  order: number;
  type: PublicLessonType;
}

export interface PublicLesson {
  /** Position within the whole course (1..totalLessons), as in admin. */
  order: number;
  title: string;
  type: PublicLessonType;
}

export interface PublicModule {
  slug: string;
  title: string;
  order: number;
  /** Every session in the module, including its course test. */
  lessonCount: number;
  /** Teaching sessions only (excludes tests). */
  learningCount: number;
  lessons: PublicLesson[];
}

export interface PublicStage {
  number: number;
  modules: PublicModule[];
  /** The stage test that closes the stage (empty if none). */
  assessments: PublicLesson[];
}

export interface PublicCourse {
  slug: string;
  title: string;
  emoji: string | null;
  category: string;
  ageMin: number;
  ageMax: number;
  kind: 'odyssey' | 'specialized';
  /** Every session, tests included — the number admin shows as "Lessons". */
  totalLessons: number;
  learningLessons: number;
  assessmentLessons: number;
  modules: PublicModule[];
  /** Odyssey only: modules grouped by stage. Empty for specialized paths. */
  stages: PublicStage[];
  /** Sessions outside any module or stage (the final test). */
  closingAssessments: PublicLesson[];
  /** Badges shown next to the age range (see program-facts.ts); empty for a program without facts. */
  badges: ProgramBadge[];
  /** One plain line on who the program is for. */
  audience: string | null;
  /** What a child should know first (e.g. "Basic Python knowledge needed"), or null. */
  prerequisite: string | null;
  mostPopular: boolean;
}

export interface PublicCatalog {
  courses: PublicCourse[];
  totals: {
    /** Specialized programs (Odyssey is the flagship, counted separately). */
    programs: number;
    /** Real 8-lesson courses across the specialized programs. */
    courses: number;
  };
}

// ── Title cleanup ───────────────────────────────────────────────────────────
//
// Several source lessons were imported with their document header as the
// title ("Course 13 · Python for Data — Lesson 1: Why Data Science
// Matters", "Student Guide — Lesson 2: …", or just "Course 14: Data
// Visualisation — Lesson 3"). That is fine inside the classroom but reads
// badly on a parent-facing page, so strip the boilerplate here without
// touching the stored title.

const DASH = '[—–-]';

/** True when a cleaned title tells a parent nothing ("Data Visualisation —
 *  Lesson 3", or just the course's own name) and a better one should be
 *  derived from the lesson's content heading. */
export function isGenericTitle(cleaned: string, moduleTitle?: string): boolean {
  if (!cleaned) return true;
  if (
    new RegExp(`\\blesson\\s*\\d+(\\s*\\(final\\))?\\s*$`, 'i').test(cleaned)
  ) {
    return true;
  }
  return (
    !!moduleTitle && cleaned.toLowerCase() === moduleTitle.trim().toLowerCase()
  );
}

export function cleanLessonTitle(raw: string): string {
  let t = (raw ?? '').trim();
  t = t.replace(
    new RegExp(`^student\\s+(?:guide|lesson)\\s*${DASH}?\\s*:?\\s*`, 'i'),
    '',
  );
  t = t.replace(
    new RegExp(`^course\\s*\\d+\\s*(?:[·:,]|${DASH})?\\s*`, 'i'),
    '',
  );
  // "<anything> Lesson 4: Real Title" -> "Real Title"
  t = t.replace(
    new RegExp(`^.*?\\blesson\\s*\\d+\\s*(?::|${DASH})\\s*`, 'i'),
    '',
  );
  t = t.replace(new RegExp(`^${DASH}\\s*`), '');
  return t.trim();
}

/** The first "## Heading" of a lesson's markdown, minus any "Lesson N:" lead. */
export function headingFromMarkdown(
  markdown: string | null | undefined,
): string | null {
  if (!markdown) return null;
  const match = /^##\s+(.+)$/m.exec(markdown);
  if (!match) return null;
  const heading = match[1]
    .replace(new RegExp(`^lesson\\s*\\d+\\s*(?::|${DASH})\\s*`, 'i'), '')
    .trim();
  return heading || null;
}

/** Internal pathway slugs ("ai-builder-path — Final Test") are not for parents,
 *  and the retired "Path" in a program name ("AI Builder Path — Final Test") goes too. */
function cleanAssessmentTitle(raw: string, type: PublicLessonType): string {
  const title = raw.trim();
  if (type === 'FINAL_TEST') {
    if (/^[a-z0-9-]+\s+—\s+final test$/i.test(title)) return 'Final Test';
    const retired = /^(.+?)\s+Path\s+—\s+(Final Test)$/i.exec(title);
    if (retired) return `${retired[1]} — ${retired[2]}`;
  }
  return title;
}

// ── Builder ─────────────────────────────────────────────────────────────────

export interface BuildCatalogInput {
  courses: CatalogCourseRow[];
  modules: CatalogModuleRow[];
  lessons: CatalogLessonRow[];
  /** lessonId -> contentMarkdown, only needed for lessons whose title is
   *  generic after cleanup (see lessonIdsNeedingHeading). */
  markdownByLessonId?: Map<string, string | null>;
}

/** The learning lessons whose title is still generic after cleanup — the
 *  service fetches markdown for just these so the full lesson bodies are
 *  never loaded for the catalog. */
export function lessonIdsNeedingHeading(
  modules: CatalogModuleRow[],
  lessons: CatalogLessonRow[],
): string[] {
  const moduleTitleById = new Map(modules.map((m) => [m.id, m.title]));
  return lessons
    .filter((l) => l.type === 'LEARNING')
    .filter((l) =>
      isGenericTitle(
        cleanLessonTitle(l.title),
        l.moduleId ? moduleTitleById.get(l.moduleId) : undefined,
      ),
    )
    .map((l) => l.id);
}

function toPublicLesson(
  lesson: CatalogLessonRow,
  moduleTitle: string | undefined,
  markdownByLessonId: Map<string, string | null>,
): PublicLesson {
  if (lesson.type !== 'LEARNING') {
    return {
      order: lesson.order,
      type: lesson.type,
      title: cleanAssessmentTitle(lesson.title, lesson.type),
    };
  }
  const cleaned = cleanLessonTitle(lesson.title);
  const title = isGenericTitle(cleaned, moduleTitle)
    ? (headingFromMarkdown(markdownByLessonId.get(lesson.id)) ?? cleaned) ||
      lesson.title
    : cleaned;
  return { order: lesson.order, type: lesson.type, title };
}

/** "Python for Data — Course Test" -> "Python for Data" (null if nothing is left). */
function courseNameFromTestTitle(title: string): string | null {
  const name = title.replace(new RegExp(`\\s*${DASH}?\\s*course\\s+test\\s*$`, 'i'), '').trim();
  return name || null;
}

/** A program built lesson-by-lesson (an admin-made, "flat" course) has no
 *  CourseModule rows, so on the public site it would show 0 courses. Its
 *  lessons are already in order and every course ends with its own Course
 *  Test, so each run of lessons up to and including a Course Test becomes
 *  one course. Lessons after the last Course Test that are not a stage/final
 *  test (a trailing, still-untested course) form a last course; stage and
 *  final tests stay "closing" assessments. */
function deriveModulesFromFlatLessons(
  lessons: CatalogLessonRow[],
  markdown: Map<string, string | null>,
): { modules: PublicModule[]; lessonIds: Set<string> } {
  const modules: PublicModule[] = [];
  const lessonIds = new Set<string>();
  let group: CatalogLessonRow[] = [];

  const flush = (title: string | null) => {
    if (group.length === 0) return;
    const order = modules.length + 1;
    const moduleTitle = title ?? `Course ${order}`;
    const publicLessons = group.map((l) =>
      toPublicLesson(l, moduleTitle, markdown),
    );
    modules.push({
      slug: `course-${order}`,
      title: moduleTitle,
      order,
      lessonCount: publicLessons.length,
      learningCount: publicLessons.filter((l) => l.type === 'LEARNING').length,
      lessons: publicLessons,
    });
    group.forEach((l) => lessonIds.add(l.id));
    group = [];
  };

  for (const lesson of lessons) {
    if (lesson.type === 'LEARNING') {
      group.push(lesson);
    } else if (lesson.type === 'COURSE_TEST') {
      group.push(lesson);
      flush(courseNameFromTestTitle(lesson.title));
    } else {
      // A stage/final test closes the program: any untested lessons before it
      // are still a course of their own.
      flush(null);
    }
  }
  flush(null);
  return { modules, lessonIds };
}

export function buildPublicCatalog(input: BuildCatalogInput): PublicCatalog {
  const markdown = input.markdownByLessonId ?? new Map<string, string | null>();
  const courses: PublicCourse[] = [];

  for (const course of input.courses) {
    const courseModules = input.modules
      .filter((m) => m.courseId === course.id)
      .sort((a, b) => a.order - b.order);
    const courseLessons = input.lessons
      .filter((l) => l.courseId === course.id)
      .sort((a, b) => a.order - b.order);
    const moduleById = new Map(courseModules.map((m) => [m.id, m]));

    const kind: PublicCourse['kind'] =
      course.slug === ODYSSEY_SLUG ? 'odyssey' : 'specialized';
    const derived =
      kind === 'specialized' && courseModules.length === 0
        ? deriveModulesFromFlatLessons(courseLessons, markdown)
        : null;

    const modules: PublicModule[] = derived?.modules ?? courseModules.map((m) => {
      const lessons = courseLessons
        .filter((l) => l.moduleId === m.id)
        .map((l) => toPublicLesson(l, m.title, markdown));
      return {
        slug: m.slug,
        title: m.title,
        order: m.order,
        lessonCount: lessons.length,
        learningCount: lessons.filter((l) => l.type === 'LEARNING').length,
        lessons,
      };
    });

    // Stage tests / the final test have no module. Walk the course in order:
    // a stage test closes whichever stage the lessons before it belonged to.
    const stageByNumber = new Map<number, PublicStage>();
    const closingAssessments: PublicLesson[] = [];
    let currentStage: number | null = null;

    for (const lesson of courseLessons) {
      const mod = lesson.moduleId ? moduleById.get(lesson.moduleId) : undefined;
      if (mod) {
        if (kind === 'odyssey' && mod.stageNumber != null) {
          currentStage = mod.stageNumber;
          if (!stageByNumber.has(currentStage)) {
            stageByNumber.set(currentStage, {
              number: currentStage,
              modules: [],
              assessments: [],
            });
          }
          const publicModule = modules.find((x) => x.slug === mod.slug);
          if (
            publicModule &&
            !stageByNumber.get(currentStage)!.modules.includes(publicModule)
          ) {
            stageByNumber.get(currentStage)!.modules.push(publicModule);
          }
        }
        continue;
      }
      if (derived?.lessonIds.has(lesson.id)) continue;
      const pub = toPublicLesson(lesson, undefined, markdown);
      if (lesson.type === 'STAGE_TEST' && currentStage != null) {
        stageByNumber.get(currentStage)?.assessments.push(pub);
      } else {
        closingAssessments.push(pub);
      }
    }

    const learningLessons = courseLessons.filter(
      (l) => l.type === 'LEARNING',
    ).length;
    courses.push({
      slug: course.slug,
      title: course.title,
      emoji: course.emoji,
      category: course.category,
      ageMin: course.ageMin,
      ageMax: course.ageMax,
      kind,
      totalLessons: courseLessons.length,
      learningLessons,
      assessmentLessons: courseLessons.length - learningLessons,
      modules,
      stages: [...stageByNumber.values()].sort((a, b) => a.number - b.number),
      closingAssessments,
      ...publicFactsFor(course),
    });
  }

  const specialized = courses.filter((c) => c.kind === 'specialized');
  return {
    courses,
    totals: {
      programs: specialized.length,
      courses: specialized.reduce((sum, c) => sum + c.modules.length, 0),
    },
  };
}
