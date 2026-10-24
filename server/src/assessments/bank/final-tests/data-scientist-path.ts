// FILE PATH: server/src/assessments/bank/final-tests/data-scientist-path.ts
//
// Data Scientist Path — Final Test: 25 MCQ + 5 True/False drawn from the
// pathway's three modules (Python for Data, Data Visualisation, Machine
// Learning Projects) plus one ~15-minute pandas project the teacher marks.

import { composeBank, project } from '../bank.helpers';
import { dataVisualisationExtras } from '../course-tests/data-visualisation';
import { machineLearningProjectsExtras } from '../course-tests/machine-learning-projects';
import { pythonForDataExtras } from '../course-tests/python-for-data';

export const dataScientistFinal = composeBank({
  id: 'final-test/data-scientist-path',
  title: 'Data Scientist Path — Final Test',
  type: 'FINAL_TEST',
  slices: [
    pythonForDataExtras.final,
    dataVisualisationExtras.final,
    machineLearningProjectsExtras.final,
  ],
  codingProject: project({
    key: 'P01',
    title: 'Quiz Results Analysis',
    language: 'python',
    instructions: `A teacher recorded how long 8 students studied and the score each one got on a quiz. One score is missing. You have about 15 minutes to analyse the data with pandas. The data is already in the starter code. Write code that:

1. Finds and handles the missing score (fill it with a sensible value, or drop the row). Add a one-line comment saying why you chose that.
2. Keeps only the students who scored more than 70 and prints their names from the highest score to the lowest.
3. Uses groupby to print the average score of each class.
4. Calculates the correlation between hours_studied and score, prints it, and finishes with one sentence that explains the result in plain language to the teacher.

Use clear variable names and short comments. Remember to save the result of any cleaning step back into your DataFrame.`,
    starterCode: `import pandas as pd

# Quiz results for 8 students (Eli's score is missing)
data = {
    "student": ["Ana", "Ben", "Cara", "Dev", "Eli", "Fay", "Gus", "Hana"],
    "class": ["A", "A", "A", "B", "B", "B", "C", "C"],
    "hours_studied": [2, 5, 8, 1, 4, 7, 3, 6],
    "score": [58, 72, 90, 50, None, 85, 64, 80],
}
df = pd.DataFrame(data)


# 1. Handle the missing score (and say why in a comment)


# 2. Students who scored more than 70, highest score first


# 3. Average score for each class


# 4. Correlation between hours_studied and score, plus one plain-language sentence
`,
    rubric: [
      {
        criterion: 'Cleaning the missing value',
        maxPoints: 4,
        lookFor:
          'Finds the missing score (isnull().sum() or similar) and either fills it sensibly (the median 72 is ideal; the mean is acceptable) or drops the row, with a comment explaining the choice. The result is saved back into the DataFrame, not just calculated and thrown away. Filling with 0 earns no marks for this criterion.',
      },
      {
        criterion: 'Filtering and sorting',
        maxPoints: 5,
        lookFor:
          'Uses a boolean condition such as df[df["score"] > 70] and sort_values("score", ascending=False). After a median fill the printed order is Cara (90), Fay (85), Hana (80), then Ben and Eli (72 each). Award partial marks if the filter or the sort is right but not both.',
      },
      {
        criterion: 'Group by average',
        maxPoints: 5,
        lookFor:
          'Uses groupby("class") with ["score"].mean(). After a median fill the averages are A ≈ 73.3, B = 69.0 and C = 72.0 (if Eli is dropped instead, B is 67.5). Partial marks for the right idea with a small mistake, such as averaging every numeric column.',
      },
      {
        criterion: 'Correlation and interpretation',
        maxPoints: 6,
        lookFor:
          'Calculates the correlation with .corr() (about 0.99, a very strong positive relationship) and writes a sentence in plain language. Full marks need an honest wording: it avoids claiming that studying causes the score, and mentions that this is only 8 students. Clear names and short comments are expected throughout.',
      },
    ],
  }),
});
