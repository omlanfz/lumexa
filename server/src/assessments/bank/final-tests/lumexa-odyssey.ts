// FILE PATH: server/src/assessments/bank/final-tests/lumexa-odyssey.ts
//
// Lumexa Odyssey — Final Test: 25 MCQ + 5 True/False spanning all nine modules
// of the journey (two or three questions from each, in Odyssey order) plus one
// ~15-minute Python project the teacher marks. The project uses the ideas the
// whole journey shares — variables, loops, functions, decisions and a little
// data summarising — so it is fair to every stage.

import { composeBank, project } from '../bank.helpers';
import { buildYourProfessionalIdentityExtras } from '../course-tests/build-your-professional-identity';
import { htmlCssMasteryExtras } from '../course-tests/html-css-mastery';
import { javascriptInteractivityExtras } from '../course-tests/javascript-interactivity';
import { pythonAiFoundationsExtras } from '../course-tests/python-ai-foundations';
import { pythonArcadeGamesExtras } from '../course-tests/python-arcade-games';
import { pythonForDataExtras } from '../course-tests/python-for-data';
import { pythonForYoungBuildersExtras } from '../course-tests/python-for-young-builders';
import { robloxWorldBuilderExtras } from '../course-tests/roblox-world-builder';
import { scratchAdventuresExtras } from '../course-tests/scratch-adventures';
import { ModuleExtras } from '../bank.helpers';

function odysseySlice(name: string, extras: ModuleExtras) {
  if (!extras.odyssey)
    throw new Error(
      `${name} is an Odyssey module and must define an Odyssey slice`,
    );
  return extras.odyssey;
}

export const odysseyFinal = composeBank({
  id: 'final-test/lumexa-odyssey',
  title: 'Lumexa Odyssey — Final Test',
  type: 'FINAL_TEST',
  slices: [
    // Stage 1
    odysseySlice('scratch-adventures', scratchAdventuresExtras),
    odysseySlice('python-for-young-builders', pythonForYoungBuildersExtras),
    odysseySlice('python-arcade-games', pythonArcadeGamesExtras),
    // Stage 2
    odysseySlice('html-css-mastery', htmlCssMasteryExtras),
    odysseySlice(
      'build-your-professional-identity',
      buildYourProfessionalIdentityExtras,
    ),
    odysseySlice('javascript-interactivity', javascriptInteractivityExtras),
    // Stage 3
    odysseySlice('python-for-data', pythonForDataExtras),
    odysseySlice('python-ai-foundations', pythonAiFoundationsExtras),
    odysseySlice('roblox-world-builder', robloxWorldBuilderExtras),
  ],
  codingProject: project({
    key: 'P01',
    title: 'Odyssey Mission Log',
    language: 'python',
    instructions: `You are building a small "mission log" for the Lumexa Odyssey. You have about 15 minutes. The starter code contains a list of missions, each with a name, a stage number and a score. Write Python that:

1. Defines average(numbers), which RETURNS the average of a list of numbers.
2. Loops over the missions and prints one line for each, like "Scratch Story (Stage 1): 82 - Good", using an f-string. Use if / elif / else for the label: 85 or more is "Excellent", 70 or more is "Good", anything lower is "Keep practising".
3. Prints the average score of all the missions (use your average function).
4. Prints the name of the mission with the highest score.
5. Prints the average score for each stage. Use a dictionary (or another clear way) to group the scores by stage first.

Use clear names and add a few short comments.`,
    starterCode: `missions = [
    {"name": "Scratch Story", "stage": 1, "score": 82},
    {"name": "Arcade Game", "stage": 1, "score": 74},
    {"name": "Landing Page", "stage": 2, "score": 90},
    {"name": "Data Report", "stage": 3, "score": 68},
]


# 1. average(numbers)


# 2. Print one line for each mission, with its label


# 3. Average score of all the missions


# 4. The mission with the highest score


# 5. Average score for each stage
`,
    rubric: [
      {
        criterion: 'Function with a parameter and a return value',
        maxPoints: 4,
        lookFor:
          'average(numbers) takes a list and RETURNS the average (sum divided by len) instead of printing it, and is reused rather than the sum being recalculated by hand. With the starter data the overall average is 78.5.',
      },
      {
        criterion: 'Loop and formatted output',
        maxPoints: 4,
        lookFor:
          'A for loop prints one line per mission using an f-string (or equivalent) that shows the name, the stage and the score, for example "Scratch Story (Stage 1): 82 - Good".',
      },
      {
        criterion: 'Decisions with if / elif / else',
        maxPoints: 4,
        lookFor:
          'Labels are correct: 82 and 74 are "Good", 90 is "Excellent" and 68 is "Keep practising". Colons and indentation are correct, and the conditions are checked in a sensible order.',
      },
      {
        criterion: 'Summarising the data',
        maxPoints: 5,
        lookFor:
          'Finds the best mission (Landing Page) with max() or a loop, and groups the scores by stage (for example in a dictionary of lists) to get the stage averages: Stage 1 = 78.0, Stage 2 = 90.0, Stage 3 = 68.0. Award partial marks for a correct idea with a small mistake.',
      },
      {
        criterion: 'Clear, working code',
        maxPoints: 3,
        lookFor:
          'The program would run without errors, names are meaningful and spelled consistently, and there are a few short comments.',
      },
    ],
  }),
});
