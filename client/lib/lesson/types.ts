// FILE PATH: client/lib/lesson/types.ts
//
// The lesson API's shapes (mirrors server/src/curriculum/lesson-content). A learner
// only ever receives the PUBLIC quiz — there is no field here for a correct answer
// until the server returns one in response to a submitted answer.

import type { HomeworkFileRef } from '@/lib/homeworkFiles';

export type Viewer = 'student' | 'teacher' | 'admin';

export interface CodeSnippet {
  label: string;
  language: string;
  code: string;
  part?: string;
}

export interface ProjectLink {
  title: string;
  url: string;
}

// ─── Mini quiz ──────────────────────────────────────────────────────────────

export type ChoiceType = 'multiple_choice' | 'true_false' | 'code_output' | 'code_error';

export interface PublicOption {
  id: string;
  text: string;
}

export type PublicQuizQuestion =
  | { id: string; type: ChoiceType; prompt: string; code?: { language: string; code: string }; options: PublicOption[] }
  | { id: string; type: 'ordering'; prompt: string; items: PublicOption[] }
  | { id: string; type: 'matching'; prompt: string; left: PublicOption[]; right: PublicOption[] }
  | { id: string; type: 'self_check'; prompt: string; hasSampleAnswer: boolean }
  | { id: string; type: 'reflection'; prompt: string };

export interface PublicQuiz {
  questions: PublicQuizQuestion[];
  gradedCount: number;
}

export type QuizAnswer =
  | { optionId: string }
  | { order: string[] }
  | { pairs: { leftId: string; rightId: string }[] }
  | { text?: string; selfRating?: 'got_it' | 'review'; answered?: boolean };

export interface QuizCheckResult {
  questionId: string;
  graded: boolean;
  correct: boolean | null;
  explanation?: string;
  reveal?:
    | { optionId: string }
    | { order: string[] }
    | { pairs: { leftId: string; rightId: string }[] }
    | { sampleAnswer: string };
}

// ─── Visuals ────────────────────────────────────────────────────────────────

export interface LessonVisualData {
  id: string;
  type: string;
  alt: string;
  caption: string;
  title?: string;
  // Each visual kind reads its own shape (validated by the server).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: Record<string, any>;
}

// ─── Numbering, navigation, references ──────────────────────────────────────

export interface LessonLink {
  lessonId: string;
  title: string;
  /** Course-wide session number (tests included). */
  session: number;
  lessonIndex: number | null;
  lessonTotal: number | null;
  /** null with locked=false: not linkable here; null with locked=true: not unlocked yet. */
  href: string | null;
  locked: boolean;
  current: boolean;
}

export interface LessonNumbering {
  session: number;
  lessonIndex: number | null;
  lessonTotal: number | null;
  module: { id: string; title: string; stageNumber: number | null } | null;
}

// ─── Homework ───────────────────────────────────────────────────────────────

export type SubmissionFile = HomeworkFileRef;

export interface SubmissionInfo {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'NEEDS_CHANGES';
  files: SubmissionFile[];
  links: string[];
  note: string | null;
  rating: number | null;
  feedbackTags: string[];
  resubmissionCount: number;
  submittedAt: string;
  reviewedAt: string | null;
  feedback: string | null;
}

// ─── The lesson payload ─────────────────────────────────────────────────────

export interface LessonPayload {
  id: string;
  title: string;
  type: string;
  duration?: number | null;
  objectives: string[];
  contentMarkdown: string | null;
  homework: string | null;
  checkpoint: string | null;
  codeSnippets: CodeSnippet[];
  projectLinks: ProjectLink[] | null;
  module: { id: string; title: string; stageNumber: number | null } | null;
  project: { id: string; title: string; description: string | null } | null;
  quiz?: PublicQuiz | null;
  visuals?: LessonVisualData[];
}

export interface LessonDetailsResponse {
  available: boolean;
  reason?: string;
  isTest?: boolean;
  session: {
    scheduledLessonId: string | null;
    lessonNumber: number;
    start: string | null;
    end: string | null;
    status: string | null;
    courseId: string;
    courseTitle: string;
    /** The batch this class is taught to (null for a 1-to-1 class). */
    batchName?: string | null;
  };
  lesson?: LessonPayload;
  assessment?: {
    id: string;
    type: string;
    title: string;
    isPublished: boolean;
    /** Published questions on the test's (possibly shared) question bank. */
    counts?: { mcq: number; trueFalse: number; practical: number };
    totalMarks?: number;
    meetsStandard?: boolean;
  } | null;
  submission?: SubmissionInfo | null;
  viewer?: Viewer;
  /** The teacher has preparation notes / an answer key to open (never set for students). */
  canPrepare?: boolean;
  numbering?: LessonNumbering | null;
  navigation?: { prev: LessonLink | null; next: LessonLink | null } | null;
  refs?: Record<string, LessonLink | null>;
}

export interface TeacherPrep {
  lessonId: string;
  teacherNotes: string | null;
  reviewNotes: string | null;
  /** The whole quiz with answers — for the teacher only. */
  answerKey: AnswerKeyQuestion[];
}

export interface AnswerKeyQuestion {
  id: string;
  type: string;
  prompt: string;
  explanation?: string;
  options?: string[];
  correctIndex?: number;
  items?: string[];
  pairs?: { left: string; right: string }[];
  sampleAnswer?: string;
  code?: { language: string; code: string };
}

export interface ProgressView {
  sectionsRead: string[];
  activitiesDone: string[];
  quiz: {
    total: number;
    answered: number;
    gradedTotal: number;
    score: number;
    completed: boolean;
    results: Record<string, { correct: boolean | null; attempts: number }>;
  } | null;
  homeworkSubmitted: boolean;
  lastOpenedAt: string | null;
}

/** How a lesson is being shown. The classroom stage and the standalone page differ. */
export type LessonMode = 'page' | 'classroom';
