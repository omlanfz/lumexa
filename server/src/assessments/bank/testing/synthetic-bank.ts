// FILE PATH: server/src/assessments/bank/testing/synthetic-bank.ts
//
// Test support only: builds a bank that meets the standard (so it passes
// validateBank) out of generated questions. Lets the sync, grading and e2e
// tests exercise the full pipeline without depending on the real content.

import { bank, mcq, project, tf } from '../bank.helpers';
import { BankTestType, TestBank } from '../bank.types';
import { TEST_SHAPES } from '../bank.constants';

export function syntheticBank(
  id: string,
  type: BankTestType,
  variant = 'a',
): TestBank {
  const shape = TEST_SHAPES[type];
  const topics = type === 'COURSE_TEST' ? 8 : 3;
  const mcqs = Array.from({ length: shape.mcq }, (_, i) =>
    mcq(
      (i % topics) + 1,
      `Synthetic ${id} (${variant}) question ${i + 1}: which statement about idea number ${i + 1} is correct?`,
      `Idea ${i + 1} is the correct statement in ${id}`,
      [
        `Idea ${i + 1} is wrong because of reason one`,
        `Idea ${i + 1} is wrong because of reason two`,
        `Idea ${i + 1} is wrong because of reason three`,
      ],
      `Idea ${i + 1} is the only statement that holds, so the other three are distractors.`,
    ),
  );
  const tfs = Array.from({ length: shape.trueFalse }, (_, i) =>
    tf(
      (i % topics) + 1,
      `Synthetic ${id} (${variant}) statement ${i + 1} is something a student should judge.`,
      i % 2 === 0,
      `The statement is ${i % 2 === 0 ? 'true' : 'false'} by construction for the synthetic bank.`,
    ),
  );
  return bank({
    id,
    title: `Synthetic ${id}`,
    type,
    mcq: mcqs,
    trueFalse: tfs,
    codingProject: shape.codingProject
      ? project({
          key: 'P01',
          title: `Synthetic project for ${id}`,
          language: 'python',
          starterCode: '# your code here\n',
          instructions:
            'Spend about 15 minutes on this small project. Write a short Python program that asks for two numbers, adds them, and prints the sum with a friendly message. ' +
            'Use at least one variable and one print() call, and add a comment explaining what the program does.',
          rubric: [
            {
              criterion: 'Works as described',
              maxPoints: 8,
              lookFor:
                'The program runs and prints the correct sum for several inputs.',
            },
            {
              criterion: 'Uses variables and input correctly',
              maxPoints: 5,
              lookFor:
                'Values are stored in well-named variables and converted to numbers.',
            },
            {
              criterion: 'Readable code',
              maxPoints: 4,
              lookFor:
                'Sensible names, spacing and at least one helpful comment.',
            },
            {
              criterion: 'Extra care',
              maxPoints: 3,
              lookFor: 'Handles a small edge case or adds a thoughtful touch.',
            },
          ],
        })
      : undefined,
  });
}
