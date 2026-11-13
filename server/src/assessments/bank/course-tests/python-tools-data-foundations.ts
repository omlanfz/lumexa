// FILE PATH: server/src/assessments/bank/course-tests/python-tools-data-foundations.ts
//
// Python Foundations → "Python Tools & Data Foundations" (8 lessons, 3 projects: Dataset
// Explorer, Live Data Explorer, Student Life Data Explorer).
// Topics: 1 project workflow & version control · 2 modules, libraries & dependencies ·
// 3 Jupyter notebooks · 4 NumPy · 5 Pandas · 6 data cleaning, summaries & charts ·
// 7 APIs & JSON · 8 capstone: build, document & share.
//
// Setup, installation and command-line chores are not tested (see bank.validate.ts); these
// questions test the ideas behind the tools. Snippets that need NumPy or Pandas are checked
// by execution when those libraries are available (see bank.verify.ts).

import { ModuleExtras, bank, codeOut, mcq, tf } from '../bank.helpers';

const NUMPY = { requires: ['numpy'] };
const PANDAS = { requires: ['pandas'] };

export const pythonToolsDataFoundations = bank({
  id: 'course-test/python-tools-data-foundations',
  title: 'Python Tools & Data Foundations — Course Test',
  type: 'COURSE_TEST',
  mcq: [
    // ── Lesson 1 · Project workflow and version control ─────────────────────
    mcq(
      1,
      'A program opens "data/scores.csv" and fails because the file cannot be found, although the file exists in the project. What should you check first?',
      'Which folder the program was run from, because a relative path starts there',
      [
        'Whether the file is too large for Python',
        'Whether the file name is written in capital letters',
        'Whether the program has too many comments',
      ],
      'A relative path is worked out from the working directory, so running the program from another folder breaks it.',
    ),
    mcq(
      1,
      'In a tidy project layout, where would you keep the CSV files that the program reads?',
      'In a folder called data',
      [
        'In the README file',
        'Inside the .gitignore file',
        'In the same file as the functions',
      ],
      'A separate data folder keeps files of one kind in one place.',
    ),
    mcq(
      1,
      'What is the main purpose of a version control tool such as Git?',
      'To record the history of a project as snapshots so changes can be reviewed or undone',
      [
        'To make the Python code run faster',
        'To check the spelling of your comments',
        'To draw charts from a dataset',
      ],
      'Each commit is a snapshot with a message, so you can look back at any earlier version.',
    ),
    mcq(
      1,
      'What is a repository?',
      'A project folder together with its history of commits',
      [
        'A single Python file with many functions in it',
        'A library of ready-made charts',
        'A list of every error a project has had',
      ],
      'A repository can live on your own computer and can also be stored online on a site such as GitHub.',
    ),

    // ── Lesson 2 · Modules, libraries and dependencies ──────────────────────
    mcq(
      2,
      'Which statement makes the functions of the math module available in a program?',
      'import math',
      ['include math', 'using math', 'open math'],
      'Python brings in a module with import, followed by its name.',
    ),
    codeOut(
      2,
      'python',
      `import statistics

print(statistics.median([3, 9, 5]))`,
      '5',
      ['9', '3', '17'],
      'The median is the middle value once the numbers are in order: 3, 5, 9.',
    ),
    mcq(
      2,
      'What is the purpose of a requirements.txt file in a project?',
      'To list the libraries (and versions) the project depends on, so that others can rebuild its setup',
      [
        'To store the data that the program reads',
        'To explain in words what the program does',
        'To record who changed which line of code',
      ],
      'With the list in one file, "it works on my computer" can become "it works on every computer".',
    ),

    // ── Lesson 3 · Jupyter notebooks ────────────────────────────────────────
    mcq(
      3,
      'Which kind of notebook cell is used for headings and written explanations?',
      'A Markdown cell',
      ['A code cell', 'An output cell', 'A kernel cell'],
      'Markdown cells are not run; they are shown as formatted text.',
    ),
    mcq(
      3,
      "A notebook's kernel remembers the values of its variables in the order that you...",
      'Ran the cells, which is not always the order they appear on the page',
      [
        'Created the cells',
        'Saved the notebook',
        'Gave the cells their titles',
      ],
      'Running cells out of order can leave values in the kernel that the page does not show.',
    ),
    mcq(
      3,
      'What should you do before sharing a notebook so that other people can trust it?',
      'Restart it and run all the cells from the top, and check that it still works',
      [
        'Delete all the Markdown cells',
        'Run only the last cell',
        'Rename every variable to a single letter',
      ],
      'A notebook that runs from a fresh start does not depend on a hidden state.',
    ),

    // ── Lesson 4 · NumPy ────────────────────────────────────────────────────
    codeOut(
      4,
      'python',
      `import numpy as np

a = np.array([1, 2, 3, 4])
print(a.sum())`,
      '10',
      ['4', '24', '[1 2 3 4]'],
      'The sum() method adds up every item of the array: 1 + 2 + 3 + 4 = 10.',
      undefined,
      NUMPY,
    ),
    codeOut(
      4,
      'python',
      `import numpy as np

print(np.arange(6).reshape(2, 3).shape)`,
      '(2, 3)',
      ['(3, 2)', '(6,)', '(2, 6)'],
      'reshape(2, 3) arranges the six numbers in 2 rows and 3 columns.',
      undefined,
      NUMPY,
    ),
    codeOut(
      4,
      'python',
      `import numpy as np

temps = np.array([18, 25, 31, 22])
print((temps > 20).sum())`,
      '3',
      ['4', '1', '31'],
      'The comparison makes an array of True and False values, and True counts as 1 when summed: 25, 31 and 22 are above 20.',
      undefined,
      NUMPY,
    ),
    mcq(
      4,
      'What is the main advantage of a NumPy array over a Python list for calculations on numbers?',
      'A calculation can be applied to the whole array at once, without a loop, and it is much faster',
      [
        'An array can hold text and numbers mixed together',
        'An array never needs to be imported',
        'An array can be changed only once',
      ],
      'Vectorized operations are shorter to write and run far faster than Python loops.',
    ),

    // ── Lesson 5 · Pandas ───────────────────────────────────────────────────
    codeOut(
      5,
      'python',
      `import pandas as pd

df = pd.DataFrame({"name": ["Mars", "Venus"], "radius": [3390, 6052]})
print(df["radius"].max())`,
      '6052',
      ['3390', '9442', 'Venus'],
      'df["radius"] is a column, and max() gives its largest value.',
      undefined,
      PANDAS,
    ),
    codeOut(
      5,
      'python',
      `import pandas as pd

df = pd.DataFrame({"x": [1, 5, 8, 3]})
print(len(df[df["x"] > 2]))`,
      '3',
      ['4', '2', '14'],
      'The filter keeps the rows where x is greater than 2: the values 5, 8 and 3, which makes 3 rows.',
      undefined,
      PANDAS,
    ),
    mcq(
      5,
      'Which attribute gives the number of rows and columns of a DataFrame?',
      'shape',
      ['size_of', 'dimensions()', 'count_all'],
      'df.shape returns a pair such as (1035, 6): rows first, then columns.',
    ),
    mcq(
      5,
      'What is the difference between loc and iloc?',
      'loc selects by label; iloc selects by position',
      [
        'loc selects columns only; iloc selects rows only',
        'loc changes the data; iloc only reads it',
        'There is no difference',
      ],
      'Use loc with row and column labels, and iloc with positions that count from 0.',
    ),

    // ── Lesson 6 · Cleaning, summaries and charts ───────────────────────────
    codeOut(
      6,
      'python',
      `import pandas as pd

s = pd.Series([4, None, 6])
print(s.isna().sum())`,
      '1',
      ['0', '2', '3'],
      'isna() marks the missing value, and summing counts the True values: there is one.',
      undefined,
      PANDAS,
    ),
    codeOut(
      6,
      'python',
      `import pandas as pd

df = pd.DataFrame({"g": ["a", "b", "a"], "v": [10, 20, 30]})
print(df.groupby("g")["v"].sum()["a"])`,
      '40',
      ['60', '10', '30'],
      'groupby splits the rows by g. The rows for "a" hold 10 and 30, which add up to 40.',
      undefined,
      PANDAS,
    ),
    mcq(
      6,
      'Which Matplotlib function draws a scatter plot?',
      'plt.scatter',
      ['plt.dots', 'plt.spread', 'plt.points'],
      'A scatter plot shows the relationship between two numbers, one dot per row.',
    ),
    mcq(
      6,
      'You receive a messy dataset. What is the most sensible first step?',
      'Look at it first (for example with head, info and a count of missing values) before changing anything',
      [
        'Delete every row that has a gap in it',
        'Overwrite the original file with a guess',
        'Draw a chart and hope the problems go away',
      ],
      'Look first, change second, and keep a record of what you changed.',
    ),

    // ── Lesson 7 · APIs and JSON ────────────────────────────────────────────
    mcq(
      7,
      'Which HTTP status code means that a request succeeded?',
      '200',
      ['404', '429', '500'],
      '200 means OK. 404 means not found, 429 means too many requests and 500 is a server problem.',
    ),
    mcq(
      7,
      'What should a program do before it uses the data from an API response?',
      'Check the status code',
      [
        'Wait for ten minutes',
        'Delete the response',
        'Send the same request ten more times',
      ],
      'A status code other than 200 means the data may be missing or wrong.',
    ),
    codeOut(
      7,
      'python',
      `import json

text = '{"name": "iss", "altitude": 420.5}'
data = json.loads(text)
print(data["altitude"])`,
      '420.5',
      ['iss', '"altitude"', '{"altitude": 420.5}'],
      'json.loads turns the JSON text into a dictionary, so the value can be looked up by its key.',
    ),
    mcq(
      7,
      'Which is the safest place to keep a secret API key?',
      'In a private settings file that is kept out of the shared project',
      [
        'In a comment at the top of the main program',
        'In the title of the notebook',
        'In the README so that everyone can find it',
      ],
      'Anyone who can see a key can use your account, so it must never be in shared code.',
    ),

    // ── Lesson 8 · Capstone: build, document and share ──────────────────────
    mcq(
      8,
      'Which of these is a requirement for a data project?',
      'The program must report how many rows were removed during cleaning',
      [
        'The code should feel nice',
        'The project is probably going to be fun',
        'Maybe it will have some charts',
      ],
      'A requirement is a clear statement you can tick off: it is either done or not done.',
    ),
    mcq(
      8,
      'Which section of a README tells a visitor how to start the project?',
      'The "How to run it" section',
      ['The title line only', 'The list of contributors', 'The licence text'],
      'A good README says what the project is, how to run it, what the data is and what you learned.',
    ),
    mcq(
      8,
      'What is the best reason to make small, frequent commits?',
      'Each commit is a clear step that can be understood, reviewed or undone',
      [
        'It makes the files smaller',
        'It stops other people from reading the project',
        'It is needed for the code to run',
      ],
      'A history of small steps tells the story of how the project was built.',
    ),
    mcq(
      8,
      'Why should a survey of classmates be kept anonymous?',
      "So that nobody's personal information is exposed",
      [
        'So that the charts look better',
        'So that the file is smaller',
        'So that Pandas can read it',
      ],
      'Use numbers instead of names, ask for permission and never publish anything personal.',
    ),
  ],
  trueFalse: [
    tf(
      1,
      'A .gitignore file tells Git which files it should not record.',
      true,
      "It is used to keep things such as caches and secret keys out of a project's history.",
    ),
    tf(
      2,
      'A third-party library is part of Python itself, so no extra step is needed before you can use it.',
      false,
      'Third-party libraries are written by other people and come from the Python Package Index. They have to be added to your project first.',
    ),
    tf(
      3,
      'The result of a notebook code cell is shown directly underneath that cell.',
      true,
      'That is why notebooks are so good for exploring: you see each result right next to its code.',
    ),
    tf(
      4,
      'All the items of a NumPy array can have different data types.',
      false,
      'An array holds items that all have the same type, which is part of what makes it fast.',
    ),
    tf(
      5,
      'A DataFrame column holds values of one data type, but different columns can hold different types.',
      true,
      'For example, one column of names (text) can sit beside a column of radii (numbers).',
    ),
    tf(
      6,
      'You should overwrite the original data file with the cleaned data so that no copy of the raw data remains.',
      false,
      'Keep the original untouched and clean a copy, so you can always go back and check your work.',
    ),
    tf(
      6,
      'A chart should have a title and labelled axes so that a reader knows what it shows.',
      true,
      'A chart without labels is only a drawing.',
    ),
    tf(
      7,
      'It is fine to share your API key in a public repository if the repository has a good README.',
      false,
      'A key in a public repository can be used by anyone. Keep keys private.',
    ),
    tf(
      8,
      'A relationship between two columns in a small dataset does not prove that one causes the other.',
      true,
      'Two things can move together without one causing the other, so state the limits of your data.',
    ),
    tf(
      8,
      'A project is finished as soon as the code runs, even if nobody else could tell how to use it.',
      false,
      'Documentation, such as a README, is part of finishing a project.',
    ),
  ],
});

/** What this course adds to the Python Foundations Final Test (never a copy of a Course Test question). */
export const pythonToolsDataFoundationsExtras: ModuleExtras = {
  final: {
    mcq: [
      mcq(
        1,
        'What does a commit message describe?',
        'The change that was saved in that snapshot',
        [
          'The name of the computer that was used',
          'The size of the project in megabytes',
          'The next change you plan to make',
        ],
        'A short message that describes the change helps a future reader understand the history.',
      ),
      codeOut(
        2,
        'python',
        `import random

random.seed(3)
a = random.randint(1, 100)
random.seed(3)
b = random.randint(1, 100)
print(a == b)`,
        'True',
        ['False', '3', '100'],
        'Setting the same seed makes the random sequence start again from the same place, so both numbers match.',
      ),
      mcq(
        3,
        'Why can the same notebook show different results after its cells are run in a different order?',
        'The kernel keeps the values left behind by whichever cells ran earlier',
        [
          'Python picks a new answer every time',
          'Markdown cells change the code underneath them',
          'The notebook file changes its own text',
        ],
        'The page looks the same, but the hidden state of the kernel is different.',
      ),
      codeOut(
        4,
        'python',
        `import numpy as np

print((np.array([1, 2, 3]) * 2).tolist())`,
        '[2, 4, 6]',
        ['[1, 2, 3, 1, 2, 3]', '[1, 2, 3, 2]', '12'],
        'An array is multiplied element by element, and tolist() turns the result into an ordinary list.',
        undefined,
        NUMPY,
      ),
      codeOut(
        5,
        'python',
        `import pandas as pd

df = pd.DataFrame({"n": ["a", "b", "c"], "v": [3, 9, 5]})
print(df.sort_values("v", ascending=False).iloc[0]["n"])`,
        'b',
        ['a', 'c', '9'],
        'Sorting from the largest value puts the row with v = 9 first, and that row belongs to "b".',
        undefined,
        PANDAS,
      ),
      codeOut(
        6,
        'python',
        `import pandas as pd

s = pd.Series([2.0, None, 4.0])
print(s.fillna(s.mean()).tolist())`,
        '[2.0, 3.0, 4.0]',
        ['[2.0, 0.0, 4.0]', '[2.0, 2.0, 4.0]', '[3.0, 3.0, 3.0]'],
        'The mean of 2.0 and 4.0 is 3.0, and fillna replaces the missing value with it.',
        undefined,
        PANDAS,
      ),
      codeOut(
        7,
        'python',
        `response = {"status": 404, "data": None}
if response["status"] == 200:
    print("use the data")
else:
    print("check the address")`,
        'check the address',
        ['use the data', '404', 'None'],
        'The status is 404 (not found), so the program must not use the data, and the else branch runs.',
      ),
      mcq(
        8,
        'Why keep the raw data file unchanged and clean a copy of it?',
        'You can always go back to the original and repeat or correct the cleaning',
        [
          'Because Python cannot change a file',
          'Because cleaned data cannot be charted',
          'Because a copy runs faster than the original',
        ],
        'Cleaning involves choices, and the original data lets you check those choices later.',
      ),
    ],
    trueFalse: [
      tf(
        2,
        'Setting a random seed makes a sequence of random numbers repeat, which is useful for testing.',
        true,
        'The same seed gives the same "random" numbers every run.',
      ),
    ],
  },
};
