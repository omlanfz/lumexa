// FILE PATH: server/src/assessments/bank/final-tests/ai-builder-path.ts
//
// AI Builder Path — Final Test: 25 MCQ + 5 True/False drawn from the pathway's
// three modules (Python and AI Foundations, Computer Vision Projects, Language
// Models and Chatbots) plus one ~15-minute Python project the teacher marks.

import { composeBank, project } from '../bank.helpers';
import { computerVisionExtras } from '../course-tests/computer-vision';
import { languageModelsExtras } from '../course-tests/language-models';
import { pythonAiFoundationsExtras } from '../course-tests/python-ai-foundations';

export const aiBuilderFinal = composeBank({
  id: 'final-test/ai-builder-path',
  title: 'AI Builder Path — Final Test',
  type: 'FINAL_TEST',
  slices: [
    pythonAiFoundationsExtras.final,
    computerVisionExtras.final,
    languageModelsExtras.final,
  ],
  codingProject: project({
    key: 'P01',
    title: 'Check a Prediction Model',
    language: 'python',
    instructions: `A teacher has a simple model that predicts a test score from the hours a student studied:

    predicted score = 45 + 7 × hours studied

You have about 15 minutes to check how good this model is, using the data in the starter code. Write Python that:

1. Defines predict(hours_studied), which RETURNS the model's predicted score.
2. Defines mean_squared_error(actual, predicted), which takes two lists and RETURNS the average of the squared differences.
3. Uses list slicing to treat the first 4 students as "training" data and the last 2 as "test" data. Evaluate the model on the TEST students only.
4. Prints the test predictions, the mean squared error, and one plain-language sentence a parent could understand (for example: "On average our predictions are about ... points away from the real score").

Use clear names and add a short comment above each function. Plain Python is enough — you do not need any extra libraries.`,
    starterCode: `# Hours each student studied, and the test score they got
hours = [1, 2, 3, 4, 5, 6]
scores = [52, 58, 66, 71, 79, 84]


# 1. The model: predicted score = 45 + 7 * hours
def predict(hours_studied):
    pass  # replace this line


# 2. Mean Squared Error: the average of (actual - predicted) squared
def mean_squared_error(actual, predicted):
    pass  # replace this line


# 3. Split the data: first 4 students = training, last 2 students = test
#    (the model above is already trained, so you only need the test students)


# 4. Evaluate the model on the test students and print your results
`,
    rubric: [
      {
        criterion: 'Functions with parameters and return values',
        maxPoints: 5,
        lookFor:
          'predict() returns 45 + 7 * hours (it does not just print). mean_squared_error() takes two lists and returns a single number. Both are reusable functions, not code pasted into the main program.',
      },
      {
        criterion: 'Correct calculations',
        maxPoints: 6,
        lookFor:
          'Test predictions are 80 and 87, the errors are -1 and -3, and the MSE is 5.0 (the square root, about 2.2, is the typical error in points). Give partial marks for a correct method with a small slip, such as forgetting to divide by the number of examples.',
      },
      {
        criterion: 'Honest train/test split',
        maxPoints: 4,
        lookFor:
          'Uses slicing such as hours[4:] and scores[4:] (or an equivalent) so only the last two students are evaluated. Award 0 if the model is scored on all six students and presented as the test result.',
      },
      {
        criterion: 'Plain-language summary and clarity',
        maxPoints: 5,
        lookFor:
          'Prints the predictions, the MSE and a sentence a non-technical person could follow (for example "about 2.2 points"). Variable and function names are meaningful and the code has short comments.',
      },
    ],
  }),
});
