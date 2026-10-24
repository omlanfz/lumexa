// FILE PATH: server/src/assessments/bank/bank.types.ts
//
// The maintained question-bank content format. Every course/stage/final test
// is authored as a `TestBank` in this folder and applied to the database by
// bank.sync.ts. Authoring is deliberately "answer-by-text": an MCQ is written
// as the correct answer plus three wrong answers, never as an options array
// with a separate index — the loader (bank.materialize.ts) places the correct
// answer, so a misaligned answer key (the defect in the old mechanically
// generated banks) cannot be written by mistake.

export type BankTestType = 'COURSE_TEST' | 'STAGE_TEST' | 'FINAL_TEST';

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

/** Executable proof for a "what does this code print?" question. The bank
 *  test suite runs `code` and requires its output to equal the question's
 *  correct answer, so these answer keys are verified by execution, not by
 *  eye. */
export interface CodeCheck {
  /** `lua` snippets run on Lua 5.4 (via the `lupa` Python module) while the
   *  course teaches Roblox Luau — so a Lua snippet must stay in the subset
   *  both agree on (no whole-number results from `/` or `^`, which Lua 5.4
   *  prints as "5.0" and Luau as "5"). */
  language: 'python' | 'javascript' | 'lua';
  code: string;
  /** Third-party Python modules the snippet imports (e.g. "numpy"). The bank
   *  test suite runs the check only when they are installed, and skips it
   *  otherwise — so CI without them still passes while a developer machine
   *  that has them proves the answer. */
  requires?: string[];
  /** True/False only: the output the statement claims the code prints. The
   *  test requires `(actual output === claim) === answer`. For an MCQ the
   *  expected output is simply the question's correct answer. */
  claim?: string;
}

export interface BankMcq {
  kind: 'MCQ';
  /** Auto-assigned from position when the bank is built: M01, M02 … */
  key: string;
  /** Lesson (1–8) of a course test, or module (1–N) of a stage/final test. */
  topic: number;
  text: string;
  correct: string;
  wrong: [string, string, string];
  explanation: string;
  difficulty?: Difficulty;
  codeCheck?: CodeCheck;
}

export interface BankTrueFalse {
  kind: 'TRUE_FALSE';
  /** Auto-assigned from position: T01, T02 … */
  key: string;
  topic: number;
  /** A statement the student judges true or false. */
  text: string;
  answer: boolean;
  explanation: string;
  difficulty?: Difficulty;
  codeCheck?: CodeCheck;
}

export interface BankRubricCriterion {
  criterion: string;
  maxPoints: number;
  /** What the teacher looks for when awarding marks for this criterion. */
  lookFor: string;
}

/** The ~15-minute practical project at the end of a Final Test — marked by
 *  the teacher against this rubric (never auto-graded). */
export interface BankCodingProject {
  key: string;
  title: string;
  /** Markdown-ish plain text: what to build, requirements, example. */
  instructions: string;
  language: 'python' | 'javascript' | 'html' | 'lua' | 'text';
  starterCode: string;
  rubric: BankRubricCriterion[];
  /** Always the sum of the rubric (validated). */
  maxScore: number;
}

export interface TestBank {
  /** Stable id, e.g. "course-test/python-ai-foundations". Used in bankKey. */
  id: string;
  title: string;
  type: BankTestType;
  mcq: BankMcq[];
  trueFalse: BankTrueFalse[];
  codingProject?: BankCodingProject;
}

/** One question row as stored in MCQQuestion (what the sync writes). */
export interface MaterializedQuestion {
  bankKey: string;
  questionType: 'MCQ' | 'TRUE_FALSE';
  questionText: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty: Difficulty | null;
  tags: string[];
  order: number;
}

export interface MaterializedCoding {
  bankKey: string;
  title: string;
  instructions: string;
  language: string;
  starterCode: string;
  rubric: BankRubricCriterion[];
  maxScore: number;
}

export interface MaterializedBank {
  questions: MaterializedQuestion[];
  coding: MaterializedCoding | null;
}
