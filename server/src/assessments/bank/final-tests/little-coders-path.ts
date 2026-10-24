// FILE PATH: server/src/assessments/bank/final-tests/little-coders-path.ts
//
// Little Coders Path — Final Test: 25 MCQ + 5 True/False drawn from the
// pathway's three modules (Scratch Adventures, Python for Young Builders, AI
// for Kids) plus one ~15-minute beginner Python project the teacher marks.

import { composeBank, project } from '../bank.helpers';
import { aiForKidsExtras } from '../course-tests/ai-for-kids';
import { pythonForYoungBuildersExtras } from '../course-tests/python-for-young-builders';
import { scratchAdventuresExtras } from '../course-tests/scratch-adventures';

export const littleCodersFinal = composeBank({
  id: 'final-test/little-coders-path',
  title: 'Little Coders Path — Final Test',
  type: 'FINAL_TEST',
  slices: [
    scratchAdventuresExtras.final,
    pythonForYoungBuildersExtras.final,
    aiForKidsExtras.final,
  ],
  codingProject: project({
    key: 'P01',
    title: 'Crew Quiz Game',
    language: 'python',
    instructions: `You are going to make a tiny space quiz in Python. You have about 15 minutes. Follow the steps and use the starter code to begin.

1. Make a list called crew with three names. Use a for loop to print "Crew member: " and each name (an f-string will help).
2. Ask the player two questions with input():
   - "What colour do you get when you mix blue and yellow?"  (the answer is green)
   - "How many legs does a spider have?"  (the answer is 8)
   Start with score = 0. For each correct answer, say "Correct!" and add 1 to score. For a wrong answer, say "Oops!" and show the right answer.
3. Print "You scored ... out of 2!" using an f-string.
4. Finish with a message that depends on the score, using if / elif / else:
   2 points = "Perfect score!", 1 point = "Good try!", 0 points = "Let's try again next time!"

Remember: input() gives you text, so compare the spider answer with "8" in quotes. Do not forget the colons and the indented lines!`,
    starterCode: `# Crew Quiz Game

# 1. The crew list and the loop


# 2. The two quiz questions
score = 0


# 3. Print the score


# 4. A final message that depends on the score
`,
    rubric: [
      {
        criterion: 'Lists and loops',
        maxPoints: 4,
        lookFor:
          'A list called crew holds three names and a for loop prints each one with the words "Crew member:" (an f-string is ideal, but joining text with commas is accepted). Award partial marks if the loop works but the list is built some other way.',
      },
      {
        criterion: 'Variables, input and if/else',
        maxPoints: 6,
        lookFor:
          'Both answers are collected with input() and stored in variables. The answers are compared with text in quotes (for example == "8", not == 8), the score goes up by 1 for each correct answer (score = score + 1), and a wrong answer shows an "Oops!" message with the right answer.',
      },
      {
        criterion: 'Final message with if / elif / else',
        maxPoints: 5,
        lookFor:
          'The score is printed with an f-string, and an if / elif / else chain gives three different messages for 2, 1 and 0 points. Colons and indentation are correct. Award partial marks for two correct branches.',
      },
      {
        criterion: 'Working, tidy code',
        maxPoints: 5,
        lookFor:
          'The program would run without errors: spelling of variable names matches everywhere, every if / elif / else / for line ends with a colon, and the lines inside are indented. Names are sensible and there are a few short comments.',
      },
    ],
  }),
});
