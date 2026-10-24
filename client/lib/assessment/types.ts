// FILE PATH: client/lib/assessment/types.ts
//
// Shapes of the assessment + report-card APIs (server/src/assessments). Types
// only — no runtime code lives here.

export type QuestionKind = 'MCQ' | 'TRUE_FALSE';
export type AttemptStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED';
export type TestType = 'COURSE_TEST' | 'STAGE_TEST' | 'FINAL_TEST';
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
}

export interface AttemptResult {
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
  };
  student: { id: string; fullName: string };
  questions: AttemptQuestion[];
  codingProject: CodingProject | null;
  answeredCount: number;
  startedAt: string | null;
  submittedAt: string | null;
  gradedAt: string | null;
  report: { id: string; status: ReportStatus } | null;
  result: AttemptResult | null;
}

export interface LessonTestStatus {
  scheduledLessonId: string;
  studentName: string;
  assessment: {
    id: string;
    type: TestType;
    title: string;
    isPublished: boolean;
    counts: { mcq: number; trueFalse: number; practical: number };
    totalMarks: number;
    meetsStandard: boolean;
  } | null;
  attempt: {
    id: string;
    status: AttemptStatus;
    startedAt: string | null;
    submittedAt: string | null;
    total: number;
    answered: number;
  } | null;
  report: { id: string; status: ReportStatus } | null;
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

export interface ReportDetail {
  id: string;
  attemptId: string;
  status: ReportStatus;
  assessmentType: TestType;
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
  coding: {
    project: { questionId: string; title: string; instructions: string; language: string; code: string; savedAt: string | null } | null;
    rubric: ReportRubricScore[];
    score: number | null;
    max: number | null;
    feedback: string | null;
    evaluatedAt: string | null;
    hasCode: boolean;
  } | null;
  totals: { total: number | null; totalMax: number; percentage: number | null; passed: boolean | null };
  feedback: string | null;
  strengths: string | null;
  improvements: string | null;
  teacherEdited: boolean;
  timeline: { submittedAt: string; lastEditedAt: string | null; approvedAt: string | null; sharedAt: string | null };
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
  typeLabel: string;
  courseTitle: string;
  submittedAt: string;
  hasCodingProject: boolean;
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
