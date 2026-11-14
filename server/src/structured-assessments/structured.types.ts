// FILE PATH: server/src/structured-assessments/structured.types.ts
//
// The authored content format of a structured assessment (AssessmentFormat.STRUCTURED_V1). Like the
// standard banks, a multiple-choice question is written as the correct answer plus three wrong ones
// (never an options array and an index), so an answer key cannot drift; structured.materialize.ts
// places the correct answer.

import type { BankMcq, BankRubricCriterion } from '../assessments/bank/bank.types';
import type { StructuredKind } from './structured.constants';

export type { BankMcq, BankRubricCriterion, StructuredKind };

export type PracticalLanguage =
  | 'c'
  | 'cpp'
  | 'java'
  | 'python'
  | 'javascript'
  | 'sql'
  | 'html'
  | 'text';

/** Part B: a written question, marked by the teacher against a rubric (never auto-graded). */
export interface StructuredShortAnswer {
  /** Auto-assigned from position: S01, S02, S03. */
  key: string;
  /** The lesson (course assessment: 1–8) or course (final assessment: 1–8) it comes from. */
  topic: number;
  /** Markdown: the question as the student reads it (tracing, explaining, reasoning, analysis). */
  prompt: string;
  /** Teacher-only exemplar. */
  modelAnswer: string;
  /** Teacher-only marking guide; criteria add up to the question's marks. */
  rubric: BankRubricCriterion[];
  maxScore: number;
}

/** Part C: the practical problem, marked by the teacher against a rubric. */
export interface StructuredPractical {
  /** Always P01. */
  key: string;
  title: string;
  /** Markdown: the scenario, the tasks, the constraints and the expected output. */
  instructions: string;
  language: PracticalLanguage;
  /** What the editor starts with (a skeleton, buggy code to debug, or a comment block). */
  starterCode: string;
  /** What the student hands in, e.g. "Your complete C program". Shown on the screen. */
  deliverables: string[];
  /** SQL practicals only: statements that create and fill the practice database. */
  sqlSetup?: string;
  rubric: BankRubricCriterion[];
  /** Always the sum of the rubric (validated): 20. */
  maxScore: number;
}

export interface StructuredBank {
  /** Stable id, e.g. "structured/programming-foundations-with-c". Used in every bankKey. */
  id: string;
  title: string;
  kind: StructuredKind;
  mcq: BankMcq[];
  shortAnswers: StructuredShortAnswer[];
  practical: StructuredPractical;
}

// ─── What the sync writes ──────────────────────────────────────────────────

export interface MaterializedStructuredMcq {
  bankKey: string;
  questionText: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty: string | null;
  tags: string[];
  order: number;
}

export interface MaterializedShortAnswer {
  bankKey: string;
  prompt: string;
  maxScore: number;
  rubric: BankRubricCriterion[];
  modelAnswer: string;
  order: number;
}

export interface MaterializedStructuredPractical {
  bankKey: string;
  title: string;
  instructions: string;
  language: string;
  starterCode: string;
  rubric: BankRubricCriterion[];
  maxScore: number;
  /** PracticalQuestion.spec */
  spec: { structured: true; deliverables: string[]; sqlSetup?: string };
  order: number;
}

export interface MaterializedStructuredBank {
  mcq: MaterializedStructuredMcq[];
  shortAnswers: MaterializedShortAnswer[];
  practical: MaterializedStructuredPractical;
}

// ─── Which bank belongs to which test session ───────────────────────────────

export interface StructuredRegistry {
  /** The catalog course (slug) whose assessments these banks belong to. */
  courseSlug: string;
  /** A course assessment belongs to its module (CourseModule.slug). */
  courseTests: Record<string, StructuredBank>;
  /** The final assessment of the program. */
  finalBank: StructuredBank;
}
