// FILE PATH: server/src/courses/python-foundations.upgrade.ts
//
// One-off upgrade for a database that was seeded by the previous release of Python Foundations.
//
// That release put each portfolio project in the one lesson that builds it, with a "Hands-on build"
// checkpoint on every lesson. Python Foundations now follows the standard shape of every program (see
// assignStandardCheckpoints in curriculum-catalog.seed.ts): lesson 1 is an introduction, lessons 2-3, 4-5
// and 6-7 are the two parts of one project each, and lesson 8 is a review of the three projects. A new
// database is seeded straight into that shape, but the seed leaves an existing program alone, so this
// brings the rows of an existing one across: the checkpoint and the project of every lesson, the order and
// wording of the projects, the empty project-link placeholders and the sentences of the lesson text that
// say which project a lesson builds.
//
// Admin-safe and idempotent. Each value is replaced only while it is still EXACTLY what the previous
// release wrote (the fingerprints below; lesson text is compared by its SHA-256), so anything an
// administrator has changed, a pasted notebook link included, is left alone, and a second boot changes
// nothing. Remove this file once every environment has been upgraded.

import { createHash } from 'crypto';
import { Prisma, PrismaClient, SessionType } from '@prisma/client';
import { canonicalCourseSlug, legacyCourseSlug } from './course-slug';
import {
  PATHWAY_SLUGS,
  loadPathway,
  type RawModule,
} from './curriculum-source';
import { upgradeLesson } from '../curriculum/lesson-content';

export interface ProjectLink {
  title: string;
  url: string;
}

/** What the previous release stored for one lesson. */
export interface PreviousLesson {
  checkpoint: string;
  /** The slug of the project the lesson belonged to, or null. */
  project: string | null;
  /** SHA-256 of the lesson body it stored. */
  content: string;
  /** SHA-256 of the homework it stored, only where the new text differs. */
  homework?: string;
}

// Generated once from a database seeded by the previous release; see the note at the top of this file.
export const PYTHON_FOUNDATIONS_PREVIOUS: Record<string, PreviousLesson[]> = {
  'python-programming-essentials': [
    {
      checkpoint: 'Hands-on build: Personalized Greeting Program',
      project: null,
      content:
        '73f20fed5969555a913bc3050a89b9a4f0e149e1c2a8d36a85816294e64eb632',
    },
    {
      checkpoint: 'Hands-on build: Student Profile Generator',
      project: null,
      content:
        'e5ae39e3023a0583ba285b4437bd90ed34abc1f5a1e3417d9a94e268a28953ac',
    },
    {
      checkpoint: 'Hands-on build: Smart Calculator',
      project: 'smart-calculator',
      content:
        'd27379673e617ce1929c117566c6d39f7eb9cb2cbf230da81802ed35fed28deb',
    },
    {
      checkpoint: 'Hands-on build: Smart Eligibility Checker',
      project: null,
      content:
        '27434522cfa72299dfc0b75c1044318d548de7435d69dba959cd3538a6dbd23b',
    },
    {
      checkpoint: 'Hands-on build: Number Guessing Game',
      project: 'number-guessing-game',
      content:
        '030e0bf9980a5cb8e5aa8fa70911ebd4e4baf69be4e7dbb561db674a00bd4791',
    },
    {
      checkpoint: 'Hands-on build: Word and Text Analyzer',
      project: null,
      content:
        '17b020d64d1dca5cd520800e47c97df45f2f21d0feb648f338a2564977f1e73e',
    },
    {
      checkpoint: 'Hands-on build: Interactive Shopping List Manager',
      project: null,
      content:
        '347079c2a79a6edc11bcf8d137ee5ad43d1121ab03dd17969bc2e84088869023',
    },
    {
      checkpoint: 'Capstone project: Python Quiz Master',
      project: 'python-quiz-master',
      content:
        'd6d79e4bb76a30823647f9f31a4e56ce6c3446c5bb53a2599ea2e15916802734',
    },
  ],
  'problem-solving-program-design': [
    {
      checkpoint: 'Hands-on build: Daily Task Planner',
      project: null,
      content:
        '1bf9338ac5f4c98c707888c276771000456e2044aea86adf51f7bf8b870e7520',
    },
    {
      checkpoint: 'Hands-on build: Modular Utility Toolkit',
      project: null,
      content:
        'cdec05ce224ec7634eb1a0ee150eba98bea6ed6b8863bef472e256b03937880e',
    },
    {
      checkpoint: 'Hands-on build: Student Record Management System',
      project: 'text-based-adventure-game',
      content:
        '5f8ffbf386f95962ee31789c42840666b5e096b94e76dac11ae91cc7df69a5bd',
      homework:
        '20a81660244bbf6e460e2cffde434a156cac85c60b4632ac042203f1b5a3550d',
    },
    {
      checkpoint: 'Hands-on build: Smart Score Analyzer',
      project: null,
      content:
        '4c8c2df41e513bfe1c495e62d13489e760b30b497fa00fc162e3e2c3fe2cfd70',
    },
    {
      checkpoint: 'Hands-on build: Debugging Challenge',
      project: null,
      content:
        'dd5c67f990683e61a9b87be451e0dc0142bdf17507f8641d3fd126721b071ab1',
    },
    {
      checkpoint: 'Hands-on build: Secure Registration and Login Simulator',
      project: null,
      content:
        'c75930bf6d04803d19c9fb826e69205eaa1b5ca65b933aa1b01861917941ed5c',
    },
    {
      checkpoint: 'Hands-on build: Personal Expense Tracker',
      project: 'personal-expense-tracker',
      content:
        'ab2140654000c8e89b53d26f69eb52ac19cba7f9f9d9a170d9552fb223f4ef0f',
    },
    {
      checkpoint: 'Capstone project: Library Management System',
      project: 'library-management-system',
      content:
        '27044542894684a411d2e9f7edd07383111f68cb3f3e07bb7a4fbf99f9cf3b15',
    },
  ],
  'python-tools-data-foundations': [
    {
      checkpoint: 'Hands-on build: Personal Python Workspace',
      project: null,
      content:
        'b4e5c2838db3ff233ca9f5964276e1b386312e7f3a7198821086fd0fa50ea17f',
    },
    {
      checkpoint: 'Hands-on build: Multi-Tool Python Application',
      project: null,
      content:
        '303619a1bed94166747c9afc1f1e8588a01e28088c89015c9fcb2c8c47a1b157',
    },
    {
      checkpoint: 'Hands-on build: Interactive Python Exploration Notebook',
      project: null,
      content:
        '3c20e38914a61ce5a18a42f95a480df8706a886f48593817c14b81afa344ed64',
    },
    {
      checkpoint: 'Hands-on build: NumPy Scientific Calculator',
      project: null,
      content:
        '2adaf2006c42473778ab7ef85dea7381a43d170aa2fadcea5837e13894651731',
    },
    {
      checkpoint: 'Hands-on build: Dataset Explorer',
      project: 'dataset-explorer',
      content:
        '9d1ccebe5c5aa1a3abe84730fd16725857a2107eef1e32d5693ea16bee9ee596',
    },
    {
      checkpoint: 'Hands-on build: Data Insights Dashboard',
      project: null,
      content:
        '95c494dd202933cb8f8c720a8672d3b3338de5b6e3da71979fcfc3ba7f3b0d7d',
    },
    {
      checkpoint: 'Hands-on build: Live Data Explorer',
      project: 'live-data-explorer',
      content:
        '7f2915086dabe66380c4d6df45a19ea326b4a63b06e3793f3e58c265bfa2557a',
    },
    {
      checkpoint: 'Capstone project: Student Life Data Explorer',
      project: 'student-life-data-explorer',
      content:
        '9c28c5a6eb351aee5c91057277941fa3fec5193268ebd510bca288c5cc8c2a26',
    },
  ],
};

export const PYTHON_FOUNDATIONS_PREVIOUS_PROJECTS: Record<
  string,
  { order: number; description: string }
> = {
  'problem-solving-program-design/text-based-adventure-game': {
    order: 1,
    description:
      'An interactive game with decisions, branching scenarios, reusable functions and structured data.',
  },
  'problem-solving-program-design/personal-expense-tracker': {
    order: 2,
    description:
      'A program that stores, retrieves, validates and organizes financial records in a file.',
  },
  'problem-solving-program-design/library-management-system': {
    order: 3,
    description:
      'An object-oriented application that manages books, borrowers and borrowing records with file storage.',
  },
  'python-programming-essentials/smart-calculator': {
    order: 1,
    description:
      'An interactive calculator that supports different mathematical operations.',
  },
  'python-programming-essentials/number-guessing-game': {
    order: 2,
    description:
      'A game with a random secret number, limited attempts, hints and score tracking.',
  },
  'python-programming-essentials/python-quiz-master': {
    order: 3,
    description:
      'A customizable quiz application with questions, answer checking and scoring, built from reusable functions.',
  },
  'python-tools-data-foundations/dataset-explorer': {
    order: 1,
    description:
      'A Jupyter Notebook project that loads, inspects, filters and analyzes a real-world dataset.',
  },
  'python-tools-data-foundations/live-data-explorer': {
    order: 2,
    description:
      'A Python application that retrieves information from an external API and displays selected results.',
  },
  'python-tools-data-foundations/student-life-data-explorer': {
    order: 3,
    description:
      'An end-to-end Python project combining data processing, basic analysis, visualization and project documentation.',
  },
};

/** What the previous release wrote: the fingerprints the upgrade compares a database against. */
export interface PreviousRelease {
  lessons: Record<string, PreviousLesson[]>;
  projects: Record<string, { order: number; description: string }>;
}

export const PYTHON_FOUNDATIONS_PREVIOUS_RELEASE: PreviousRelease = {
  lessons: PYTHON_FOUNDATIONS_PREVIOUS,
  projects: PYTHON_FOUNDATIONS_PREVIOUS_PROJECTS,
};

export interface StoredLesson {
  id: string;
  moduleSlug: string;
  /** Position inside the course, 0 to 7. */
  index: number;
  checkpoint: string | null;
  projectSlug: string | null;
  projectLinks: unknown;
  contentMarkdown: string;
  homework: string | null;
  visuals: unknown;
  miniQuiz: unknown;
}

export interface StoredProject {
  moduleSlug: string;
  slug: string;
  order: number;
  description: string | null;
}

export interface WantedLesson {
  checkpoint: string | null;
  projectSlug: string | null;
  projectLinks: ProjectLink[] | null;
  contentMarkdown: string;
  homework: string | null;
  visuals: unknown;
  miniQuiz: unknown;
}

export interface WantedProject {
  title: string;
  order: number;
  description: string | null;
}

export interface LessonChanges {
  checkpoint?: string;
  /** The project the lesson now belongs to (null: none). */
  project?: { slug: string | null };
  projectLinks?: ProjectLink[];
  contentMarkdown?: string;
  homework?: string;
}

export interface UpgradePlan {
  lessons: { id: string; moduleSlug: string; changes: LessonChanges }[];
  projects: {
    moduleSlug: string;
    slug: string;
    data: { order?: number; description?: string };
  }[];
}

const sha256 = (text: string): string =>
  createHash('sha256').update(text, 'utf8').digest('hex');

/** JSON with the keys sorted, so two equal values compare equal whatever order the database returned. */
function stable(value: unknown): string {
  const sort = (v: unknown): unknown =>
    Array.isArray(v)
      ? v.map(sort)
      : v && typeof v === 'object'
        ? Object.fromEntries(
            Object.entries(v as Record<string, unknown>)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([k, x]) => [k, sort(x)]),
          )
        : v;
  return JSON.stringify(sort(value ?? null));
}

const text = (value: unknown): string =>
  typeof value === 'string' ? value : '';

function links(value: unknown): ProjectLink[] | null {
  if (!Array.isArray(value)) return null;
  return value.map((l: { title?: unknown; url?: unknown } | null) => ({
    title: text(l?.title),
    url: text(l?.url),
  }));
}

/**
 * Decides what to change. Pure: it only compares what is stored with what the previous release wrote and
 * what the new seed would write, and returns the changes that are safe to make.
 */
export function planPythonFoundationsUpgrade(
  stored: { lessons: StoredLesson[]; projects: StoredProject[] },
  wanted: {
    lessons: Map<string, WantedLesson>;
    projects: Map<string, WantedProject>;
  },
  previous: PreviousRelease = PYTHON_FOUNDATIONS_PREVIOUS_RELEASE,
): UpgradePlan {
  const plan: UpgradePlan = { lessons: [], projects: [] };

  for (const project of stored.projects) {
    const key = `${project.moduleSlug}/${project.slug}`;
    const prev = previous.projects[key];
    const want = wanted.projects.get(key);
    if (!prev || !want) continue;
    const data: { order?: number; description?: string } = {};
    if (project.order !== want.order && project.order === prev.order)
      data.order = want.order;
    if (
      want.description &&
      project.description !== want.description &&
      project.description === prev.description
    )
      data.description = want.description;
    if (Object.keys(data).length > 0)
      plan.projects.push({
        moduleSlug: project.moduleSlug,
        slug: project.slug,
        data,
      });
  }

  for (const lesson of stored.lessons) {
    const prev = previous.lessons[lesson.moduleSlug]?.[lesson.index];
    const want = wanted.lessons.get(`${lesson.moduleSlug}::${lesson.index}`);
    if (!prev || !want) continue;
    const changes: LessonChanges = {};

    if (
      want.checkpoint !== null &&
      lesson.checkpoint !== want.checkpoint &&
      lesson.checkpoint === prev.checkpoint
    )
      changes.checkpoint = want.checkpoint;

    if (
      lesson.projectSlug !== want.projectSlug &&
      lesson.projectSlug === prev.project
    )
      changes.project = { slug: want.projectSlug };

    // An empty placeholder the previous release wrote becomes the new one. A row that has a link
    // pasted in, or that was never filled (null, which the project-link backfill fills), is left to
    // the administrator and to that backfill.
    const stock = prev.project
      ? [
          {
            title:
              wanted.projects.get(`${lesson.moduleSlug}/${prev.project}`)
                ?.title ?? '',
            url: '',
          },
        ]
      : null;
    const have = links(lesson.projectLinks);
    if (
      want.projectLinks &&
      have &&
      stock &&
      stable(have) !== stable(want.projectLinks) &&
      stable(have) === stable(stock)
    )
      changes.projectLinks = want.projectLinks;

    // The text: only a lesson whose body, quiz and visuals are still exactly what the seed wrote.
    if (
      lesson.contentMarkdown !== want.contentMarkdown &&
      sha256(lesson.contentMarkdown) === prev.content &&
      stable(lesson.visuals) === stable(want.visuals) &&
      stable(lesson.miniQuiz) === stable(want.miniQuiz)
    )
      changes.contentMarkdown = want.contentMarkdown;

    if (
      prev.homework &&
      want.homework !== null &&
      (lesson.homework ?? '') !== want.homework &&
      sha256(lesson.homework ?? '') === prev.homework
    )
      changes.homework = want.homework;

    if (Object.keys(changes).length > 0)
      plan.lessons.push({
        id: lesson.id,
        moduleSlug: lesson.moduleSlug,
        changes,
      });
  }
  return plan;
}

/** What the new seed would write, computed the same way createModuleRows does it. */
export function wantedPythonFoundations(
  assignStandardCheckpoints: (mod: RawModule) => void,
  projectLinks: Record<number, ProjectLink[]>,
  firstOrderOfModule: (moduleIndex: number) => number,
): {
  lessons: Map<string, WantedLesson>;
  projects: Map<string, WantedProject>;
} {
  const raw = loadPathway(PATHWAY_SLUGS['python-foundations']);
  const lessons = new Map<string, WantedLesson>();
  const projects = new Map<string, WantedProject>();
  raw.modules.forEach((mod, moduleIndex) => {
    assignStandardCheckpoints(mod);
    for (const p of mod.projects)
      projects.set(`${mod.slug}/${p.slug}`, {
        title: p.title,
        order: p.order,
        description: p.description ?? null,
      });
    mod.lessons.forEach((lesson, index) => {
      const patch = upgradeLesson({
        row: {
          id: '',
          title: lesson.title,
          type: 'LEARNING',
          objectives: lesson.objectives,
          contentMarkdown: lesson.contentMarkdown,
          homework: lesson.homework ?? null,
          teacherNotes: null,
          miniQuiz: null,
          visuals: null,
          contentVersion: 0,
          sourceRefs: lesson.sourceRefs ?? null,
          duration: null,
        },
        courseTitle: 'Python Foundations',
        module: { slug: mod.slug, title: mod.title },
        positionInGroup: index + 1,
        groupSize: mod.lessons.length,
        source: {
          teacherNotes: lesson.teacherNotes ?? null,
          miniQuiz: lesson.miniQuiz ?? null,
          moduleLessonCount: mod.lessons.length,
        },
      }).patch;
      lessons.set(`${mod.slug}::${index}`, {
        checkpoint: lesson.checkpoint ?? null,
        projectSlug: lesson.projectSlug ?? null,
        projectLinks:
          projectLinks[firstOrderOfModule(moduleIndex) + index] ?? null,
        contentMarkdown: patch?.contentMarkdown ?? lesson.contentMarkdown,
        homework:
          patch && patch.homework !== undefined
            ? patch.homework
            : (lesson.homework ?? null),
        visuals: patch?.visuals ?? null,
        miniQuiz: patch?.miniQuiz ?? null,
      });
    });
  });
  return { lessons, projects };
}

/** Brings an existing Python Foundations program to the standard project shape. Safe to run on every boot. */
export async function upgradePythonFoundations(
  prisma: PrismaClient,
  logger: { log: (msg: string) => void; warn: (msg: string) => void },
  deps: {
    assignStandardCheckpoints: (mod: RawModule) => void;
    projectLinks: Record<number, ProjectLink[]>;
  },
): Promise<void> {
  const course = await prisma.course.findFirst({
    where: {
      slug: {
        in: [
          canonicalCourseSlug('python-foundations'),
          legacyCourseSlug('python-foundations'),
        ],
      },
    },
    select: { id: true },
  });
  if (!course) return;

  const rows = await prisma.lesson.findMany({
    where: {
      courseId: course.id,
      type: SessionType.LEARNING,
      moduleId: { not: null },
    },
    orderBy: { order: 'asc' },
    select: {
      id: true,
      order: true,
      checkpoint: true,
      projectLinks: true,
      contentMarkdown: true,
      homework: true,
      visuals: true,
      miniQuiz: true,
      module: { select: { slug: true, order: true } },
      project: { select: { slug: true } },
    },
  });
  const projectRows = await prisma.project.findMany({
    where: { module: { courseId: course.id } },
    select: {
      id: true,
      slug: true,
      order: true,
      description: true,
      module: { select: { slug: true } },
    },
  });

  const seen = new Map<string, number>();
  const stored = {
    lessons: rows.map((l): StoredLesson => {
      const moduleSlug = l.module?.slug ?? '';
      const index = seen.get(moduleSlug) ?? 0;
      seen.set(moduleSlug, index + 1);
      return {
        id: l.id,
        moduleSlug,
        index,
        checkpoint: l.checkpoint,
        projectSlug: l.project?.slug ?? null,
        projectLinks: l.projectLinks,
        contentMarkdown: l.contentMarkdown ?? '',
        homework: l.homework,
        visuals: l.visuals,
        miniQuiz: l.miniQuiz,
      };
    }),
    projects: projectRows.map((p) => ({
      moduleSlug: p.module.slug,
      slug: p.slug,
      order: p.order,
      description: p.description,
    })),
  };

  // The first lesson order of each course: 1, 10, 19 (eight lessons and a course test each).
  const wanted = wantedPythonFoundations(
    deps.assignStandardCheckpoints,
    deps.projectLinks,
    (moduleIndex) => moduleIndex * 9 + 1,
  );
  const plan = planPythonFoundationsUpgrade(stored, wanted);
  if (plan.lessons.length === 0 && plan.projects.length === 0) return;

  const projectId = (moduleSlug: string, slug: string | null) =>
    slug
      ? (projectRows.find(
          (p) => p.module.slug === moduleSlug && p.slug === slug,
        )?.id ?? null)
      : null;

  for (const p of plan.projects) {
    const id = projectId(p.moduleSlug, p.slug);
    if (id) await prisma.project.update({ where: { id }, data: p.data });
  }
  let lessonsChanged = 0;
  for (const l of plan.lessons) {
    const data: Prisma.LessonUncheckedUpdateInput = {};
    if (l.changes.checkpoint !== undefined)
      data.checkpoint = l.changes.checkpoint;
    if (l.changes.project)
      data.projectId = projectId(l.moduleSlug, l.changes.project.slug);
    if (l.changes.projectLinks)
      data.projectLinks = l.changes
        .projectLinks as unknown as Prisma.InputJsonValue;
    if (l.changes.contentMarkdown !== undefined)
      data.contentMarkdown = l.changes.contentMarkdown;
    if (l.changes.homework !== undefined) data.homework = l.changes.homework;
    await prisma.lesson.update({ where: { id: l.id }, data });
    lessonsChanged++;
  }
  logger.log(
    `[curriculum-seed] python-foundations: moved ${lessonsChanged} lesson(s) and ${plan.projects.length} project(s) to the standard project pattern.`,
  );
}
