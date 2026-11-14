// FILE PATH: server/src/structured-assessments/structured.helpers.ts
//
// Compact authoring helpers for the structured assessment banks. A bank file is three things:
// ten multiple-choice questions, three short-answer questions and one practical.
//
//   mcq(topic, text, correct, [wrong, wrong, wrong], explanation)       — as in the standard banks
//   codeOut(topic, language, code, output, [wrong ×3], explanation)     — verified by running the code
//   shortAnswer(topic, prompt, modelAnswer, rubric)                      — 5 marks, rubric adds up to 5
//   practical({ title, instructions, language, starterCode, … })         — 20 marks, rubric adds up to 20
//   structuredBank({ id, title, kind, mcq, shortAnswers, practical })    — assigns the keys

import {
  codeOut as standardCodeOut,
  mcq as standardMcq,
  type DraftMcq,
} from '../assessments/bank/bank.helpers';
import type { BankRubricCriterion } from '../assessments/bank/bank.types';
import { STRUCTURED_SHAPE } from './structured.constants';
import type {
  PracticalLanguage,
  StructuredBank,
  StructuredKind,
  StructuredPractical,
  StructuredShortAnswer,
} from './structured.types';

export const mcq = standardMcq;
export const codeOut = standardCodeOut;
export type { DraftMcq };

/** One rubric criterion: what it is, how many marks, and what the teacher looks for. */
export const crit = (criterion: string, maxPoints: number, lookFor: string): BankRubricCriterion => ({
  criterion,
  maxPoints,
  lookFor,
});

export type DraftShortAnswer = Omit<StructuredShortAnswer, 'key' | 'maxScore'>;

/** A 5-mark short-answer question. `rubric` criteria must add up to 5 (validated). */
export function shortAnswer(
  topic: number,
  prompt: string,
  modelAnswer: string,
  rubric: BankRubricCriterion[],
): DraftShortAnswer {
  return { topic, prompt, modelAnswer, rubric };
}

export interface PracticalDef {
  title: string;
  instructions: string;
  language: PracticalLanguage;
  starterCode: string;
  deliverables: string[];
  sqlSetup?: string;
  rubric: BankRubricCriterion[];
}

/** The 20-mark practical problem. `rubric` criteria must add up to 20 (validated). */
export function practical(def: PracticalDef): Omit<StructuredPractical, 'key' | 'maxScore'> {
  return { ...def };
}

const pad = (n: number) => String(n).padStart(2, '0');

export function structuredBank(def: {
  id: string;
  title: string;
  kind: StructuredKind;
  mcq: DraftMcq[];
  shortAnswers: DraftShortAnswer[];
  practical: Omit<StructuredPractical, 'key' | 'maxScore'>;
}): StructuredBank {
  const rubricTotal = (r: BankRubricCriterion[]) => r.reduce((sum, c) => sum + c.maxPoints, 0);
  return {
    id: def.id,
    title: def.title,
    kind: def.kind,
    mcq: def.mcq.map((q, i) => ({ ...q, key: `M${pad(i + 1)}` })),
    shortAnswers: def.shortAnswers.map((q, i) => ({
      ...q,
      key: `S${pad(i + 1)}`,
      // The marks of a short answer are always the sum of its rubric, so the two can never disagree;
      // the validation then checks that sum is the 5 the standard requires.
      maxScore: rubricTotal(q.rubric) || STRUCTURED_SHAPE.shortAnswer.marksEach,
    })),
    practical: {
      ...def.practical,
      key: 'P01',
      maxScore: rubricTotal(def.practical.rubric),
    },
  };
}
