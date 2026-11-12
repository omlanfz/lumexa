// FILE PATH: server/src/little-coders/lc.constants.ts
//
// The fixed facts of the redesigned Little Coders program — one place, so the
// curriculum builder, the migration, the assessment banks, the public catalog and the
// tests can never disagree about them.
//
//   5 independent courses × 8 lessons = 40 learning lessons
//   + 5 course assessments + 1 final assessment
//   = 46 classes (about six months at two classes a week)
//
// Everything here is Little Coders only. Other programs never import this file.

import { canonicalCourseSlug } from '../courses/course-slug';

/** Canonical slug of the Little Coders program (the course row). */
export const LC_COURSE_SLUG = 'little-coders';

/** Is this course row the Little Coders program (any spelling of its slug)? */
export function isLittleCodersSlug(slug: string | null | undefined): boolean {
  return !!slug && canonicalCourseSlug(slug) === LC_COURSE_SLUG;
}

export const LC_COURSE_COUNT = 5;
export const LC_LESSONS_PER_COURSE = 8;
export const LC_LEARNING_TOTAL = LC_COURSE_COUNT * LC_LESSONS_PER_COURSE; // 40
/** 40 lessons + 5 course assessments + 1 final assessment. */
export const LC_SESSIONS_TOTAL = LC_LEARNING_TOTAL + LC_COURSE_COUNT + 1; // 46

/** Bump whenever the authored curriculum (lessons, videos, cards) changes. A lesson row
 *  that an admin has not edited is refreshed to the new version on the next boot. */
export const LC_SPEC_VERSION = 1;

/** Stored on Lesson.contentVersion so the older structured-content backfill (which only
 *  touches rows below its own CONTENT_VERSION) never rewrites a Little Coders lesson. */
export const LC_LESSON_CONTENT_VERSION = 1000;

/** Assessment.bankVersion of a Little Coders v2 bank. Larger than any legacy bank version
 *  so the sync applies it over the retired three-course banks exactly once. */
export const LC_BANK_VERSION = 1001;

/** The R2 object-key namespace of this program's assessment files:
 *  assessments/<programKey>/<assessmentId>/<studentId>/<attemptId>/… */
export const LC_PROGRAM_KEY = 'little-coders';

// ─── Coding platforms ───────────────────────────────────────────────────────

export const LC_PLATFORM_KEYS = [
  'SCRATCH',
  'STRETCH3',
  'TEACHABLE_MACHINE',
  'EDUBLOCKS',
] as const;
export type LcPlatformKey = (typeof LC_PLATFORM_KEYS)[number];

export interface DefaultPlatform {
  key: LcPlatformKey;
  name: string;
  startUrl: string;
  description: string;
  sortOrder: number;
}

/** The "Start Coding" destinations, as supplied by Lumexa Operations. They are seeded
 *  into CodingPlatform once and are editable from the admin dashboard afterwards. */
export const DEFAULT_PLATFORMS: DefaultPlatform[] = [
  {
    key: 'SCRATCH',
    name: 'MIT Scratch',
    startUrl: 'https://scratch.mit.edu/projects/editor/',
    description: 'Colourful blocks for animations, stories and games.',
    sortOrder: 1,
  },
  {
    key: 'STRETCH3',
    name: 'Stretch3',
    startUrl: 'https://stretch3.github.io/',
    description:
      'A Scratch-compatible editor with the TM2Scratch extension for AI projects.',
    sortOrder: 2,
  },
  {
    key: 'TEACHABLE_MACHINE',
    name: 'Generation AI Teachable Machine',
    startUrl: 'https://tm.gen-ai.fi/',
    description: 'Train an AI model with your webcam or microphone.',
    sortOrder: 3,
  },
  {
    key: 'EDUBLOCKS',
    name: 'EduBlocks',
    startUrl: 'https://app.edublocks.org/',
    description: 'Drag-and-drop blocks that write real Python.',
    sortOrder: 4,
  },
];

/** Default button label for a platform ("Start Coding in Scratch", …). */
export const DEFAULT_PLATFORM_BUTTON_LABEL: Record<LcPlatformKey, string> = {
  SCRATCH: 'Start Coding in Scratch',
  STRETCH3: 'Build in Stretch3',
  TEACHABLE_MACHINE: 'Train AI Model',
  EDUBLOCKS: 'Start Coding in EduBlocks',
};

// ─── The five courses ───────────────────────────────────────────────────────

export type LcTrack = 'scratch' | 'ai' | 'python';

export interface LcCourseMeta {
  /** 1–5. */
  number: number;
  /** CourseModule.slug. Courses 1 and 3 keep the slugs they always had. */
  slug: string;
  title: string;
  /** What this course is about — one line for cards and the catalog. */
  focus: string;
  /** Short student-friendly description. */
  description: string;
  track: LcTrack;
  /** The tools the course uses (shown on the landing page and in the curriculum). */
  platformLabel: string;
  platforms: LcPlatformKey[];
  concepts: string[];
  /** What a learner can do at the end. */
  outcomes: string[];
  emoji: string;
}

export const LC_COURSES: LcCourseMeta[] = [
  {
    number: 1,
    slug: 'scratch-adventures',
    title: 'Scratch Adventures',
    focus: 'Coding fundamentals, animations, stories and sprites',
    description:
      'Learn how code works by launching rockets, dancing aliens and telling your first animated story in MIT Scratch.',
    track: 'scratch',
    platformLabel: 'MIT Scratch',
    platforms: ['SCRATCH'],
    concepts: [
      'Stage & sprites',
      'Green flag & sequencing',
      'Motion & x/y positions',
      'Looks, costumes & speech bubbles',
      'Events & keyboard interaction',
      'Sounds & loops',
    ],
    outcomes: [
      'Build scripts that run in the right order',
      'Move, animate and talk with sprites',
      'Make projects that react to the keyboard',
      'Finish an animated story from start to end',
    ],
    emoji: '🚀',
  },
  {
    number: 2,
    slug: 'scratch-game-studio',
    title: 'Scratch Game Studio',
    focus: 'Advanced Scratch, game mechanics and interactive projects',
    description:
      'Turn Scratch skills into real games: controls, collisions, scores, lives, levels and clones.',
    track: 'scratch',
    platformLabel: 'MIT Scratch',
    platforms: ['SCRATCH'],
    concepts: [
      'Controls & boundaries',
      'Collision detection',
      'Variables, score & lives',
      'if / else & randomness',
      'Timers & levels',
      'Broadcasts & clones',
    ],
    outcomes: [
      'Control a sprite with the keyboard inside a maze',
      'Detect collisions and keep score',
      'Add lives, timers and challenge',
      'Build a multi-level arcade game with clones',
    ],
    emoji: '🎮',
  },
  {
    number: 3,
    slug: 'ai-for-kids',
    title: 'AI for Kids: Smart Projects',
    focus: 'Image and sound recognition with AI-powered Scratch projects',
    description:
      'Train your own AI with a webcam and a microphone, then bring it to life in Stretch3 with the TM2Scratch extension.',
    track: 'ai',
    platformLabel: 'Generation AI Teachable Machine + Stretch3',
    platforms: ['TEACHABLE_MACHINE', 'STRETCH3'],
    concepts: [
      'Machine learning & classes',
      'Training examples & predictions',
      'Image classification',
      'Improving a model',
      'Sound (spoken-word) classification',
      'Image & sound label events',
    ],
    outcomes: [
      'Train an image model with everyday objects',
      'Train a model that recognises spoken words',
      'Connect a model to Stretch3 with TM2Scratch',
      'Explain how an AI learns from examples',
    ],
    emoji: '🤖',
  },
  {
    number: 4,
    slug: 'python-explorers',
    title: 'Python Explorers',
    focus: 'Introduction to Python using visual blocks',
    description:
      'Take your first steps in Python with EduBlocks: print, draw with Turtle, repeat, calculate, ask questions and decide.',
    track: 'python',
    platformLabel: 'EduBlocks',
    platforms: ['EDUBLOCKS'],
    concepts: [
      'print & output',
      'Turtle drawing',
      'Loops',
      'Variables & arithmetic',
      'input & strings',
      'if / else & random',
    ],
    outcomes: [
      'Read and build Python programs with blocks',
      'Draw shapes and patterns with loops',
      'Use variables, input and decisions',
      'Finish a first Python quiz game',
    ],
    emoji: '🐍',
  },
  {
    number: 5,
    slug: 'python-creative-lab',
    title: 'Python Creative Lab',
    focus: 'Intermediate block-based Python and independent projects',
    description:
      'Level up with lists, functions, while loops, nested loops and debugging — then build your own Python space adventure.',
    track: 'python',
    platformLabel: 'EduBlocks',
    platforms: ['EDUBLOCKS'],
    concepts: [
      'Lists & indexing',
      'Looping through collections',
      'Functions & parameters',
      'while loops',
      'Nested loops',
      'Debugging & testing',
    ],
    outcomes: [
      'Store and use collections of values',
      'Write your own functions with parameters',
      'Repeat until something works',
      'Find and fix bugs, then build a capstone',
    ],
    emoji: '🛰️',
  },
];

export function lcCourseBySlug(slug: string): LcCourseMeta | undefined {
  return LC_COURSES.find((c) => c.slug === slug);
}

/** Session numbers (Lesson.order). Course n occupies 9(n-1)+1 … 9(n-1)+9: eight lessons, then its assessment. */
export function lcLessonOrder(
  courseNumber: number,
  lessonNumber: number,
): number {
  return (courseNumber - 1) * (LC_LESSONS_PER_COURSE + 1) + lessonNumber;
}
export function lcCourseAssessmentOrder(courseNumber: number): number {
  return courseNumber * (LC_LESSONS_PER_COURSE + 1);
}
export const LC_FINAL_ASSESSMENT_ORDER = LC_SESSIONS_TOTAL;

/** Titles of the assessment sessions (Lesson.title) — one definition for the migration, the
 *  seed and the public catalog snapshot. */
export const lcCourseAssessmentTitle = (course: Pick<LcCourseMeta, 'title'>) =>
  `${course.title} — Course Assessment`;
export const LC_FINAL_ASSESSMENT_TITLE = 'Little Coders — Final Assessment';

/** The public blurb of the whole program (course row description). The previous seed text
 *  is recognised by DEPRECATED_PROGRAM_DESCRIPTIONS and replaced only while an admin has
 *  not changed it. */
export const LC_PROGRAM_DESCRIPTION =
  'A gentle, hands-on journey for ages 6–11: from colourful Scratch blocks to games, AI-powered projects and block-based Python — building real, shareable projects the whole way. 5 independent courses, 40 learning lessons plus 5 course assessments and a final assessment (46 classes, about 6 months at two classes a week). Enrol one course at a time.';

/** The text the seed used before the redesign: replaced only while it is still exactly this. */
export const DEPRECATED_PROGRAM_DESCRIPTIONS: string[] = [
  'A gentle, hands-on introduction to computing for young learners. Students move from colorful visual blocks to real Python code and even a first taste of AI — building genuine, shareable projects the whole way, at a pace made for ages 6–11. 3 courses, 24 learning sessions plus 3 course tests and a Final Test.',
];

// ─── The standardized assessment ────────────────────────────────────────────

export const LC_ASSESSMENT = {
  brand: 'LUMEXA · LITTLE CODERS',
  title: 'Course Assessment',
  finalTitle: 'Final Assessment',
  minutes: 40,
  marks: 40,
  mcq: { count: 10, marks: 10, minutes: 10, label: '01 · Think in Blocks' },
  trueFalse: { count: 5, marks: 5, minutes: 5, label: '02 · Quick Check' },
  practical: { marks: 25, minutes: 20, label: '03 · Build It!' },
  review: { minutes: 5, label: 'Review and submission' },
  negativeMarking: false,
} as const;

/** The standardized practical-project rubric — identical for all six assessments. */
export const LC_RUBRIC_STANDARD: { criterion: string; maxPoints: number }[] = [
  { criterion: 'Required functionality works correctly', maxPoints: 10 },
  { criterion: 'Correct selection and use of blocks', maxPoints: 6 },
  { criterion: 'Logical sequence and programming flow', maxPoints: 5 },
  { criterion: 'Testing and debugging', maxPoints: 3 },
  { criterion: 'Project completed and submitted', maxPoints: 1 },
];

/** Section A: how the ten questions must be spread. */
export const LC_MCQ_KIND_COUNTS = {
  concept: 2, // understanding concepts
  identify: 2, // identifying correct blocks
  predict: 3, // predicting what an existing block script does
  sequence: 2, // sequences and logical understanding
  mistake: 1, // finding a mistake
} as const;
export type LcMcqKind = keyof typeof LC_MCQ_KIND_COUNTS;

export const LC_MCQ_DIFFICULTY_COUNTS = {
  EASY: 3,
  MEDIUM: 4,
  HARD: 3,
} as const;
export const LC_TF_DIFFICULTY_COUNTS = { EASY: 2, MEDIUM: 2, HARD: 1 } as const;
/** At least this many MCQs per assessment must carry a block script. */
export const LC_MIN_MCQ_WITH_CODE = 4;

export const LC_VARIANTS = ['SCRATCH_AI', 'PYTHON'] as const;
export type LcVariant = (typeof LC_VARIANTS)[number];

/** Practical-submission limits (see AssessmentFilesService). */
export const LC_FILE_LIMITS = {
  maxFiles: 8,
  maxFileBytes: 15 * 1024 * 1024,
  maxTotalBytes: 40 * 1024 * 1024,
  maxLinks: 5,
  maxLinkLength: 500,
  maxNoteLength: 1000,
} as const;
