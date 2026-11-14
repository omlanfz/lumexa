// FILE PATH: client/lib/assessment/types.ts
//
// Shapes of the assessment + report-card APIs (server/src/assessments). Types
// only — no runtime code lives here.

import type { LcAssessmentFile, LcAssessmentMeta, LcPracticalSpec } from '../littleCoders/types.ts';

export type QuestionKind = 'MCQ' | 'TRUE_FALSE';
export type AttemptStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED';
export type TestType = 'COURSE_TEST' | 'STAGE_TEST' | 'FINAL_TEST';
/** STANDARD; LITTLE_CODERS_V2 (10 MCQ + 5 True/False + a practical project); STRUCTURED_V1 (Pre-University CSE: 10 MCQ + 3 short answers + 1 practical, 45 marks, 40 minutes). */
export type AssessmentFormat = 'STANDARD' | 'LITTLE_CODERS_V2' | 'STRUCTURED_V1';
export type ReportStatus = 'PENDING_REVIEW' | 'PENDING_CODE_EVALUATION' | 'READY_TO_SHARE' | 'SHARED_WITH_PARENTS';

export interface AttemptQuestion {
  id: string;
  kind: QuestionKind;
  order: number;
  text: string;
  options: string[];
  /** Position of the chosen option as displayed, or null if unanswered. */
  selectedIndex: number | null;
  /** Only present once results are released (or for staff). */
  correctIndex?: number;
  isCorrect?: boolean;
  explanation?: string | null;
}

export interface RubricItem {
  criterion: string;
  maxPoints: number;
  lookFor?: string;
}

/** Little Coders: what the practical screen needs on top of the plain coding project. */
export interface PracticalLc {
  /** The brief, the blocks to find and the build requirements (the student's version of the specification). */
  spec: LcPracticalSpec | null;
  /** Where "Start Coding" opens (admin-managed), or null when the platform is unknown. */
  platform: { key: string; name: string; startUrl: string; isActive: boolean } | null;
  files: LcAssessmentFile[];
  links: string[];
  note: string | null;
  limits: { maxFiles: number; maxFileMb: number; maxLinks: number; maxNote: number };
}

export interface CodingProject {
  id: string;
  title: string;
  instructions: string;
  language: string;
  starterCode: string | null;
  maxScore: number;
  rubric: RubricItem[];
  code: string;
  savedAt: string | null;
  hasSavedCode: boolean;
  /** Little Coders only. */
  lc?: PracticalLc;
}

/** One written (Part B) question of a structured assessment, as the student sees it while taking the test. */
export interface StructuredShortAnswer {
  id: string;
  order: number;
  prompt: string;
  maxScore: number;
  /** The names and marks of the criteria — never what the teacher looks for. */
  criteria: { criterion: string; maxPoints: number }[];
  answer: string;
  savedAt: string | null;
}

/** Everything a structured assessment needs besides the multiple-choice questions. */
export interface StructuredAttemptInfo {
  timeLimitMinutes: number;
  graceSeconds: number;
  suggestedMinutes: { partA: number; partB: number; partC: number; review: number };
  maxAnswerLength: number;
  marks: { partA: number; partB: number; partC: number; total: number };
  shortAnswers: StructuredShortAnswer[];
  practical: { deliverables: string[]; sqlSetup?: string } | null;
}

/** The released Part B of a structured assessment: the student's answers with the teacher's marks. */
export interface ResultShortAnswers {
  score: number | null;
  max: number | null;
  items: {
    questionId: string;
    order: number;
    prompt: string;
    answer: string;
    maxScore: number;
    score: number | null;
    comment: string | null;
    rubric: { criterion: string; maxPoints: number; score: number | null }[];
    /** Staff only. */
    modelAnswer?: string | null;
  }[];
}

export interface AttemptResult {
  /** Structured assessments: Part B. */
  shortAnswers?: ResultShortAnswers | null;
  status: ReportStatus;
  objective: { score: number; max: number; mcqTotal: number; trueFalseTotal: number; autoScore?: number };
  coding: { score: number | null; max: number | null; feedback: string | null; rubric: { criterion: string; maxPoints: number; score: number | null }[] | null } | null;
  total: number | null;
  totalMax: number;
  percentage: number | null;
  passed: boolean | null;
  passScorePct: number;
  feedback: string | null;
  strengths: string | null;
  improvements: string | null;
  approvedAt: string | null;
}

export interface AttemptView {
  id: string;
  status: AttemptStatus;
  released: boolean;
  assessment: {
    id: string;
    type: TestType;
    title: string;
    instructions: string | null;
    courseId: string;
    courseTitle: string;
    lessonTitle: string;
    passScorePct: number;
    hasCodingProject: boolean;
    questionCount: number;
    mcqCount: number;
    trueFalseCount: number;
    totalMarks: number;
    /** STANDARD, or LITTLE_CODERS_V2 (10 MCQs + 5 True/False + a 25-mark practical project). */
    format?: AssessmentFormat;
    /** Little Coders: the standardized header and sections. */
    lc?: LcAssessmentMeta | null;
  };
  student: { id: string; fullName: string };
  questions: AttemptQuestion[];
  codingProject: CodingProject | null;
  answeredCount: number;
  startedAt: string | null;
  submittedAt: string | null;
  gradedAt: string | null;
  /** Set when the teacher locked the test: it was submitted with whatever had
   *  been saved by then. */
  lockedAt: string | null;
  lockedByTeacher: boolean;
  /** The server's clock when this was sent. */
  serverTime: string;
  /** Added by lib/assessment/api: server clock minus this computer's clock
   *  (ms), so the stopwatch is right even when the local clock is not. */
  clockOffsetMs: number;
  /** Structured assessments: when the student's time runs out (frozen by the server at the start). */
  deadlineAt?: string | null;
  structured?: StructuredAttemptInfo | null;
  report: { id: string; status: ReportStatus } | null;
  result: AttemptResult | null;
}

/** The cheap "is my test still open?" answer a test tab polls. */
export interface AttemptState {
  id: string;
  status: AttemptStatus;
  released: boolean;
  startedAt: string | null;
  submittedAt: string | null;
  lockedAt: string | null;
  lockedByTeacher: boolean;
  serverTime: string;
  clockOffsetMs: number;
  /** Structured assessments: when the time runs out. */
  deadlineAt?: string | null;
}

/** The standard header of a structured assessment: marks, time and its three parts (the server's structuredMeta()). */
export interface StructuredMeta {
  minutes: number;
  marks: number;
  graceSeconds: number;
  reviewMinutes: number;
  parts: { key: 'A' | 'B' | 'C'; label: string; detail: string; marks: number; minutes: number }[];
}

export interface LessonTestStatus {
  scheduledLessonId: string;
  studentName: string;
  assessment: {
    id: string;
    type: TestType;
    title: string;
    isPublished: boolean;
    counts: { mcq: number; trueFalse: number; practical: number; shortAnswers?: number };
    totalMarks: number;
    meetsStandard: boolean;
    format?: AssessmentFormat;
    lc?: LcAssessmentMeta;
    /** STRUCTURED_V1 only. */
    structured?: StructuredMeta;
  } | null;
  /** The teacher closed this class's test before the student started it. */
  closedAt: string | null;
  serverTime: string;
  clockOffsetMs: number;
  attempt: {
    id: string;
    status: AttemptStatus;
    startedAt: string | null;
    submittedAt: string | null;
    lockedAt: string | null;
    lockedByTeacher: boolean;
    total: number;
    answered: number;
  } | null;
  report: { id: string; status: ReportStatus } | null;
}

// ── Teacher's class monitor + lock ──────────────────────────────────────────

/** NOT_STARTED · IN_PROGRESS · SUBMITTED (by the learner, or by the teacher's
 *  lock — see attempt.lockedAt) · CLOSED (the teacher closed the test before
 *  this learner started it). */
export type ClassTestState = 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'CLOSED';

export interface ClassTestStudent {
  scheduledLessonId: string;
  studentUserId: string;
  studentName: string;
  state: ClassTestState;
  closedAt: string | null;
  attempt: {
    id: string;
    status: AttemptStatus;
    startedAt: string | null;
    submittedAt: string | null;
    lockedAt: string | null;
    total: number;
    answered: number;
    codingSaved: boolean;
    report: { id: string; status: ReportStatus } | null;
  } | null;
}

export interface ClassTestOverview {
  scheduledLessonId: string;
  serverTime: string;
  clockOffsetMs: number;
  assessment: {
    id: string;
    type: TestType;
    title: string;
    isPublished: boolean;
    counts: { mcq: number; trueFalse: number; practical: number };
    totalMarks: number;
    meetsStandard: boolean;
    format?: AssessmentFormat;
    /** Little Coders: the version of the practical this assessment gives by default, and this class's own choice. */
    activeVariant?: string | null;
    classVariant?: string | null;
  } | null;
  students: ClassTestStudent[];
}

export type LockOutcome = 'SUBMITTED' | 'ALREADY_SUBMITTED' | 'CLOSED' | 'ALREADY_CLOSED' | 'FAILED';

export interface LockResult {
  scheduledLessonId: string;
  studentUserId: string;
  studentName: string;
  outcome: LockOutcome;
  error?: string;
}

export interface LockClassResponse {
  results: LockResult[];
  submitted: number;
  closed: number;
  alreadyDone: number;
  failed: number;
}

export interface SubmitResponse {
  attemptId: string;
  status: AttemptStatus;
  submittedAt: string | null;
  alreadySubmitted: boolean;
  report: { id: string; status: ReportStatus } | null;
}

// ── Teacher report card ─────────────────────────────────────────────────────

export interface ReportQuestion {
  questionId: string;
  order: number;
  kind: QuestionKind;
  text: string;
  options: string[];
  selectedIndex: number | null;
  correctIndex: number;
  autoCorrect: boolean;
  explanation: string | null;
  override: { correct: boolean; note: string | null; at: string } | null;
}

export interface ReportRubricScore {
  criterion: string;
  maxPoints: number;
  lookFor?: string;
  score: number | null;
}

/** Little Coders: what the student handed in, as the teacher reviews it. */
export interface ReportLc {
  spec: Omit<LcPracticalSpec, 'adminEdited'> | null;
  links: string[];
  note: string | null;
  files: { id: string; name: string; size: number; kind: LcAssessmentFile['kind']; removed: boolean }[];
  /** Every file was removed from storage (the review was finalised). */
  filesRemoved: boolean;
}

export interface ReportDetail {
  id: string;
  attemptId: string;
  status: ReportStatus;
  assessmentType: TestType;
  littleCoders?: boolean;
  typeLabel: string;
  testTitle: string;
  courseTitle: string;
  student: { id: string; fullName: string; avatarUrl: string | null };
  teacher: { id: string; fullName: string };
  passScorePct: number;
  objective: {
    mcq: { correct: number; total: number };
    trueFalse: { correct: number; total: number };
    score: number;
    autoScore: number;
    max: number;
    overrides: number;
    unanswered: number;
  };
  questions: ReportQuestion[];
  /** Structured assessments: Part B, the written answers and the teacher's rubric marks. */
  shortAnswers?: {
    score: number | null;
    max: number | null;
    items: {
      questionId: string;
      order: number;
      prompt: string;
      answer: string;
      maxScore: number;
      rubric: ReportRubricScore[];
      comment: string | null;
      modelAnswer: string | null;
    }[];
  } | null;
  coding: {
    project: { questionId: string; title: string; instructions: string; language: string; code: string; savedAt: string | null } | null;
    rubric: ReportRubricScore[];
    score: number | null;
    max: number | null;
    feedback: string | null;
    evaluatedAt: string | null;
    hasCode: boolean;
    /** Little Coders only (null for every other program). */
    lc?: ReportLc | null;
  } | null;
  totals: { total: number | null; totalMax: number; percentage: number | null; passed: boolean | null };
  feedback: string | null;
  strengths: string | null;
  improvements: string | null;
  teacherEdited: boolean;
  timeline: {
    startedAt: string | null;
    submittedAt: string;
    /** Set when the teacher locked the test instead of the student handing it
     *  in — the answers are whatever had been saved by then. */
    lockedByTeacherAt: string | null;
    timeTakenSeconds: number | null;
    lastEditedAt: string | null;
    approvedAt: string | null;
    sharedAt: string | null;
  };
  share: {
    recipient: { email: string; kind: 'BILLING_CONTACT' | 'STUDENT_ACCOUNT' };
    sharedAt: string | null;
    sharedToEmail: string | null;
    sharedToKind: string | null;
    deliveryStatus: 'PENDING' | 'SENT' | 'FAILED' | null;
    lastError: string | null;
    attempts: number;
    /** An email for this report is going out right now (or just timed out). */
    sending: boolean;
    canShare: boolean;
  };
  updatedAt: string;
}

export interface ReportListItem {
  id: string;
  status: ReportStatus;
  testTitle: string;
  assessmentType: TestType;
  littleCoders?: boolean;
  typeLabel: string;
  courseTitle: string;
  submittedAt: string;
  hasCodingProject: boolean;
  /** Pre-University CSE: the report has written answers (Part B) that the teacher marks. */
  hasShortAnswers?: boolean;
  shortAnswerScore?: number | null;
  shortAnswerMaxScore?: number | null;
  objectiveScore: number;
  autoObjectiveScore: number;
  objectiveMaxScore: number;
  codingScore: number | null;
  codingMaxScore: number | null;
  totalScore: number | null;
  totalMaxScore: number;
  percentage: number | null;
  passed: boolean | null;
  teacherEdited: boolean;
  approvedAt: string | null;
  sharedAt: string | null;
  updatedAt: string;
  needsAction: boolean;
  student: { id: string; fullName: string; avatarUrl: string | null };
}

export interface ReportSummary {
  pendingReview: number;
  pendingCodeEvaluation: number;
  readyToShare: number;
  sharedWithParents: number;
  needsAction: number;
}
