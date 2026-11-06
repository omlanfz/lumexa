// FILE PATH: server/src/curriculum/lesson-content/types.ts
//
// Structured lesson-content model. Everything here is lesson-centric — nothing
// refers to a course slug — so a lesson copied into another course carries its
// quiz, visuals and notes along unchanged.

// ─── Mini quiz (ordinary LEARNING lessons only — never the assessment system) ──

export type ChoiceQuestionType =
  | 'multiple_choice'
  | 'true_false'
  | 'code_output'
  | 'code_error';

export type QuizQuestionType =
  | ChoiceQuestionType
  | 'ordering'
  | 'matching'
  | 'self_check'
  | 'reflection';

export const CHOICE_TYPES: readonly ChoiceQuestionType[] = [
  'multiple_choice',
  'true_false',
  'code_output',
  'code_error',
];

export const QUIZ_QUESTION_TYPES: readonly QuizQuestionType[] = [
  ...CHOICE_TYPES,
  'ordering',
  'matching',
  'self_check',
  'reflection',
];

interface QuizBase {
  /** Stable within the lesson ("q1", "q2", …). */
  id: string;
  type: QuizQuestionType;
  /** Markdown (inline code / emphasis allowed). */
  prompt: string;
  /** Shown only after the learner has answered. */
  explanation?: string;
  /** Never shuffle the options (e.g. "All of the above"). */
  fixedOrder?: boolean;
  /** Where the question came from — for review tooling, never shown. */
  source?: 'markdown' | 'json' | 'authored' | 'derived';
}

export interface ChoiceQuestion extends QuizBase {
  type: ChoiceQuestionType;
  /** Snippet displayed with the prompt (output prediction / error spotting). */
  code?: { language: string; code: string };
  /** Authored order. True/False is always ["True", "False"]. */
  options: string[];
  correctIndex: number;
}

export interface OrderingQuestion extends QuizBase {
  type: 'ordering';
  /** The correct order. */
  items: string[];
}

export interface MatchingQuestion extends QuizBase {
  type: 'matching';
  pairs: { left: string; right: string }[];
}

/** Not machine-graded: the learner commits an answer, then compares with the sample. */
export interface SelfCheckQuestion extends QuizBase {
  type: 'self_check';
  sampleAnswer?: string;
}

/** A reflection prompt — never graded, has no answer. */
export interface ReflectionQuestion extends QuizBase {
  type: 'reflection';
}

export type QuizQuestion =
  | ChoiceQuestion
  | OrderingQuestion
  | MatchingQuestion
  | SelfCheckQuestion
  | ReflectionQuestion;

// What a learner receives BEFORE answering: no correct answers, no explanations.

export interface PublicOption {
  id: string;
  text: string;
}

export type PublicQuizQuestion =
  | {
      id: string;
      type: ChoiceQuestionType;
      prompt: string;
      code?: { language: string; code: string };
      options: PublicOption[];
    }
  | { id: string; type: 'ordering'; prompt: string; items: PublicOption[] }
  | {
      id: string;
      type: 'matching';
      prompt: string;
      left: PublicOption[];
      right: PublicOption[];
    }
  | { id: string; type: 'self_check'; prompt: string; hasSampleAnswer: boolean }
  | { id: string; type: 'reflection'; prompt: string };

/** What the learner sends to be checked. */
export type QuizAnswer =
  | { optionId: string }
  | { order: string[] }
  | { pairs: { leftId: string; rightId: string }[] }
  | { text?: string; selfRating?: 'got_it' | 'review'; answered?: boolean };

/** What the server returns once an answer has been submitted. */
export interface QuizCheckResult {
  questionId: string;
  /** False for self-check / reflection prompts — nothing was machine-graded. */
  graded: boolean;
  /** null when not graded. */
  correct: boolean | null;
  explanation?: string;
  reveal?:
    | { optionId: string }
    | { order: string[] }
    | { pairs: { leftId: string; rightId: string }[] }
    | { sampleAnswer: string };
}

// ─── Visuals / interactive blocks ───────────────────────────────────────────

export interface LessonVisual {
  /** Unique within the lesson; referenced by a ```lumexa-visual block. */
  id: string;
  /** Renderer key — see client/components/lesson/visuals. */
  type: string;
  /** Required: describes the visual to a learner who cannot see it. */
  alt: string;
  /** Required: one concise line shown under the visual. */
  caption: string;
  title?: string;
  /** Per-type structured configuration (validated by validateVisual). */
  config: Record<string, unknown>;
}

// ─── Cleanup / audit reporting ──────────────────────────────────────────────

export type ChangeKind =
  | 'title-cleaned'
  | 'title-derived'
  | 'banner-removed'
  | 'metadata-removed'
  | 'objectives-removed'
  | 'objectives-merged'
  | 'homework-removed'
  | 'quiz-extracted'
  | 'quiz-authored'
  | 'teacher-section-moved'
  | 'teacher-notes-attached'
  | 'heading-relevelled'
  | 'refs-linked'
  | 'lineage-set'
  | 'visuals-assigned';

export interface ChangeRecord {
  kind: ChangeKind;
  detail: string;
  /** The removed/moved text (truncated) so a reviewer can audit what went where. */
  excerpt?: string;
}

export type ReviewKind =
  | 'objectives-ambiguous'
  | 'homework-ambiguous'
  | 'quiz-unparsed'
  | 'quiz-partial'
  | 'quiz-answer-bias'
  | 'ref-unresolved'
  | 'ref-range'
  | 'ref-qualified'
  | 'title-generic'
  | 'metadata-mismatch'
  | 'leading-h1-unrecognized'
  | 'teacher-section-ambiguous'
  | 'content-quality';

export interface ReviewRecord {
  kind: ReviewKind;
  detail: string;
  excerpt?: string;
}

// ─── Lesson field bundle the cleanup works on ───────────────────────────────

export interface LessonContentFields {
  title: string;
  objectives: string[];
  contentMarkdown: string | null;
  homework: string | null;
  /** Markdown, teacher-only. */
  teacherNotes: string | null;
  /** null = never extracted/authored; [] = deliberately empty. */
  miniQuiz: QuizQuestion[] | null;
  /** null = never assigned; [] = deliberately none. */
  visuals: LessonVisual[] | null;
}

/** Context the engine needs that is NOT part of the lesson's own text. */
export interface LessonContext {
  /** Authoritative course/module names (for banner recognition). */
  courseTitle?: string | null;
  moduleTitle?: string | null;
  /** DB duration in minutes (for metadata mismatch reporting). */
  duration?: number | null;
  /** 1-based position among the module's LEARNING lessons, and the module size. */
  positionInModule?: number | null;
  moduleLessonCount?: number | null;
  /** The module this lesson's text refers to when it says "Lesson N". */
  lineageModule?: string | null;
  /** Source dataset enrichments (curriculum-data/*.json). */
  sourceTeacherNotes?: string | null;
  sourceQuiz?: SourceQuizQuestion[] | null;
}

/** A question in curriculum-data/*.json `miniQuiz`. */
export interface SourceQuizQuestion {
  questionText: string;
  options?: string[] | null;
  correctIndex?: number;
  correctAnswerText?: string | null;
}
