// The content model of a downloadable curriculum PDF. Every program is described by one
// ProgramContent; the shared design (design.ts / pages.ts) turns it into pages, so the eight
// documents look related but each has its own colours and gamified artwork.

export type ThemeKey =
  | 'odyssey'
  | 'little'
  | 'game'
  | 'ai'
  | 'web'
  | 'data'
  | 'ads'
  | 'digital';

/** A sample project picture: an existing student-project snapshot, or one of this folder's own. */
export interface SnapshotRef {
  /** File id in client/public/student-projects (webp) or snapshots/<id>.html. */
  id: string;
  /** "Galactic Shooter" */
  title: string;
  /** "Roblox · Lua" */
  tech: string;
  /** Which part of the picture a narrow crop keeps (CSS object-position); the top left by default. */
  focus?: string;
}

export interface CourseContent {
  title: string;
  subtitle: string;
  /** Tool chips under the title ("Python 3", "Pygame"…). */
  tools: string[];
  overview: string;
  /** Portfolio projects built in the course. */
  projects: string[];
  why: string;
  /** The eight lessons, in order. */
  lessons: string[];
  /** Hands-on project pictures that belong to this course (1–2). */
  snapshots: SnapshotRef[];
  /** One sentence under the sample-project picture: what students build in this course. */
  snapshotNote: string;
  /** The assessment that closes the course ("Roblox World Builder — Course Test"). */
  testTitle: string;
  /** One-line summary of what the course test checks. */
  testBlurb: string;
  /** One line about the course for the progression row on the cover. */
  teaser: string;
}

export interface StageContent {
  number: number;
  name: string;
  blurb: string;
  /** Lesson range, e.g. "LESSONS 1–24". */
  range: string;
  courseIndexes: number[];
  testTitle: string;
}

export interface TestPart {
  label: string;
  detail: string;
}

export interface TestKind {
  /** "COURSE TEST" */
  name: string;
  /** "Show what you built and learned" */
  headline: string;
  parts: TestPart[];
  blurb: string;
  /** Short chips shown on the course page ("30 multiple-choice", "40 marks"). */
  tags: string[];
}

/** An example in the style of the program's tests (written for this document — not taken from a real test). */
export interface SampleQuestions {
  mcq: {
    question: string;
    options: [string, string, string, string];
    answer: 0 | 1 | 2 | 3;
  };
  trueFalse: { statement: string; answer: boolean };
}

export interface AssessmentContent {
  /** "Level-Up Checkpoints" heading line. */
  title: string;
  intro: string;
  courseTest: TestKind;
  stageTest?: TestKind;
  finalTest: TestKind;
  /** A taste of a test: one multiple-choice and one true/false example. */
  sample: SampleQuestions;
  /** What happens after a test (report, parents, certificate). */
  afterwards: { title: string; body: string }[];
}

export interface HeroStat {
  value: string;
  label: string;
}

export interface ProgramContent {
  /** Canonical course slug — the key of the program facts (ages, badges). */
  slug: string;
  /** File name under client/public/curriculums (and server/assets/curriculum-pdfs). */
  fileName: string;
  /** Also copy into server/assets/curriculum-pdfs (the certificate email attaches it). */
  attachToCertificateEmail: boolean;
  themeKey: ThemeKey;
  /** Name in the page header ("Game Creator"). */
  shortName: string;
  eyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  intro: string;
  /** The dark HUD strip under the hero: two big numbers. */
  strip: [
    { big: string; label: string; sub: string },
    { big: string; label: string; sub: string },
  ];
  stats: HeroStat[];
  courses: CourseContent[];
  /** Odyssey only: the three stages, each over some of `courses`. */
  stages?: StageContent[];
  highlights: { title: string; body: string }[];
  assessments: AssessmentContent;
  /** The quest list on the last page. */
  journeyIntro: string;
  outcomes: string[];
  /** Short project names per course shown on the journey page. */
  journeyProjects: string[][];
  /** Odyssey: the programs a student can choose after the journey (slugs). */
  whatsNext?: string[];
  ctaLine: string;
}
