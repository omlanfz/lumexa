// FILE PATH: server/src/assessments/bank/course-tests/python-for-data.ts
//
// Data Scientist Path → "Python for Data" (8 lessons, 3 projects: Sports
// Performance Analysis, School Grade Analysis, City Population Trends).
// Topics: 1 why data science matters · 2 Python refresher & notebooks ·
// 3 loading CSV/Excel into pandas · 4 selecting, filtering, sorting ·
// 5 cleaning data · 6 group-by & pivot tables · 7 statistics & correlation ·
// 8 a full analysis from raw file to written conclusions.
//
// Code answers print scalars (numbers, strings, shapes), never a whole Series
// or DataFrame, so they read the same on every pandas version.

import { ModuleExtras, bank, codeOut, mcq, tf } from '../bank.helpers';

const PANDAS = { requires: ['pandas'] };

export const pythonForData = bank({
  id: 'course-test/python-for-data',
  title: 'Python for Data — Course Test',
  type: 'COURSE_TEST',
  mcq: [
    // ── Lesson 1 · Why data science matters ─────────────────────────────────
    mcq(
      1,
      'Which order describes the data science pipeline taught in this course?',
      'Collect → clean → analyze → communicate',
      [
        'Collect → analyze → clean → communicate',
        'Clean → collect → analyze → communicate',
        'Analyze → communicate → collect → clean',
      ],
      'Raw data is almost always messy, so it has to be cleaned before analysis, and the findings are only useful once they are communicated clearly.',
    ),
    mcq(
      1,
      "A team's win count has risen every season since a coaching change. What is this finding called?",
      'An insight',
      ['Raw data', 'A dataset', 'A variable'],
      'Data is a bare number such as 82; information gives it context ("82 wins in a season"); an insight is the meaningful conclusion you draw by comparing and analysing.',
    ),
    codeOut(
      1,
      'python',
      `team_wins = {"Celtics": [51, 57, 64], "Heat": [54, 44, 53]}
best = max(team_wins, key=lambda t: sum(team_wins[t]) / len(team_wins[t]))
print(best)`,
      'Celtics',
      ['Heat', '57.33', '172'],
      "The key function gives each team's average: Celtics 172 / 3 ≈ 57.3 and Heat 151 / 3 ≈ 50.3. max() returns the dictionary key (the team name) with the highest average.",
    ),
    mcq(
      1,
      'A student writes `average = total / 3` for every team. Why can this give wrong answers?',
      'A team with a different number of seasons is divided by the wrong count — use len() instead',
      [
        'Python does not allow division by a whole number',
        'The average of a list must always be rounded to a whole number',
        'The sum() function cannot be used inside a division',
      ],
      'Hard-coding the count only works while every list has three items. len(wins) always uses the real number of entries.',
    ),

    // ── Lesson 2 · Python refresher and notebooks ───────────────────────────
    mcq(
      2,
      'In a Jupyter notebook, what is the kernel?',
      'The background Python process that runs your code and keeps your variables in memory',
      [
        'The cell type used for formatted text',
        'The file extension of a notebook',
        'The button that saves the notebook',
      ],
      'Because the kernel holds the variables, the order in which cells are run matters, not just the order they appear on the page.',
    ),
    mcq(
      2,
      'A variable `rate = 5` is defined in cell 5, which has not been run. Cell 3 uses `rate` and is run. What happens?',
      'Cell 3 raises a NameError, because the kernel does not know `rate` yet',
      [
        'Cell 3 uses 5, because Jupyter reads the whole notebook first',
        'Cell 3 uses 0 as a default value',
        'Jupyter runs cell 5 automatically before cell 3',
      ],
      'Jupyter only knows what has been executed. Check the run numbers beside each cell (In [3]:) if results look strange.',
    ),
    mcq(
      2,
      'Which kind of notebook cell would you use for a heading and an explanation of your analysis?',
      'A markdown cell',
      ['A code cell', 'An output cell', 'A kernel cell'],
      'Markdown cells hold formatted text such as headings and bullet points; code cells run Python and show their output underneath.',
    ),
    codeOut(
      2,
      'python',
      `import pandas as pd

scores = pd.Series([88, 92, 79, 95, 84])
print(scores.mean(), scores.max())`,
      '87.6 95',
      ['88 95', '87.6 92', '438 95'],
      'The five scores add up to 438, and 438 / 5 = 87.6. The highest score is 95.',
      'What is printed when this code runs?',
      PANDAS,
    ),

    // ── Lesson 3 · Loading data ─────────────────────────────────────────────
    codeOut(
      3,
      'python',
      `import pandas as pd

df = pd.DataFrame({"team": ["BOS", "LAL", "MIA"], "wins": [57, 52, 44]})
print(df.shape)`,
      '(3, 2)',
      ['(2, 3)', '(3,)', '(5, 2)'],
      '.shape is (number of rows, number of columns): three teams make three rows, and team and wins make two columns.',
      'What is printed when this code runs?',
      PANDAS,
    ),
    mcq(
      3,
      'Why is `index=False` used in `df.to_csv("output.csv", index=False)`?',
      'Without it, pandas writes its own row numbers into the file as an extra column',
      [
        'Without it, the file cannot be opened in a spreadsheet',
        'It makes the file smaller by compressing it',
        'It sorts the rows before saving',
      ],
      "The index is pandas' internal row numbering. It is almost never wanted in the saved file.",
    ),
    mcq(
      3,
      'What does `df.info()` tell you about a freshly loaded DataFrame?',
      "Each column's name, how many non-null values it has, and its data type",
      [
        'Only the first five rows',
        'Only the number of rows and columns',
        'The correlation between every pair of columns',
      ],
      'info() is the quickest way to spot missing data and confirm that columns have the types you expect.',
    ),
    mcq(
      3,
      'Loading a file with `read_csv` raises a FileNotFoundError. What is the most likely cause?',
      "The file path is misspelled, or the notebook isn't running in the folder you think it is",
      [
        'The DataFrame is too large to load',
        'pandas cannot read CSV files',
        'The `index=False` argument is missing',
      ],
      'A path is relative to the folder the notebook is running in. Printing the current folder with os.getcwd() is a quick check.',
    ),

    // ── Lesson 4 · Selecting, filtering, sorting ────────────────────────────
    codeOut(
      4,
      'python',
      `import pandas as pd

df = pd.DataFrame({"team": ["BOS", "LAL", "MIA", "SAS"], "pts": [101, 118, 95, 112]})
print(len(df[df["pts"] > 100]))`,
      '3',
      ['2', '4', '1'],
      'The condition df["pts"] > 100 is a True/False mask (True, True, False, True). Putting it inside df[...] keeps the three True rows.',
      'What is printed when this code runs?',
      PANDAS,
    ),
    codeOut(
      4,
      'python',
      `import pandas as pd

df = pd.DataFrame({"team": ["BOS", "LAL", "MIA", "SAS"], "pts": [101, 118, 95, 112]})
top = df.sort_values("pts", ascending=False)
print(top["team"].iloc[0])`,
      'LAL',
      ['BOS', 'MIA', 'SAS'],
      'Sorting descending puts the highest points first (118, from LAL). .iloc[0] then takes the first row by position.',
      'What is printed when this code runs?',
      PANDAS,
    ),
    mcq(
      4,
      '`df[df["a"] > 1 & df["b"] < 2]` raises an error. How is it fixed?',
      'Wrap each condition in its own parentheses: `df[(df["a"] > 1) & (df["b"] < 2)]`',
      [
        'Replace `&` with the word `and`',
        'Use `.iloc` instead of the square brackets',
        'Combine the two columns into one before filtering',
      ],
      'The & operator binds more tightly than the comparisons, so each condition needs parentheses. Plain `and` / `or` do not work element-wise on Series.',
    ),
    mcq(
      4,
      'Which expression selects the first 3 rows and the first 2 columns purely by position?',
      '`df.iloc[0:3, 0:2]`',
      ['`df.loc[0:3, 0:2]`', '`df[0:3, 0:2]`', '`df.sort_values(0:2)`'],
      '.iloc works with integer positions. .loc works with labels or True/False conditions.',
    ),

    // ── Lesson 5 · Cleaning data ────────────────────────────────────────────
    codeOut(
      5,
      'python',
      `import pandas as pd

df = pd.DataFrame({"score": [88, None, 79, None, 95]})
print(df["score"].isnull().sum())`,
      '2',
      ['3', '5', '0'],
      'isnull() marks each missing value True, and sum() counts the Trues: two scores are missing.',
      'What is printed when this code runs?',
      PANDAS,
    ),
    mcq(
      5,
      'A column of test scores has a few missing values. Which way of handling them is a mistake?',
      'Filling them with 0, because that falsely suggests the students scored zero',
      [
        'Filling them with the median score',
        'Filling them with the mean score',
        'Dropping those rows when only a handful are missing',
      ],
      'A missing score means "unknown", not "zero". The right choice depends on why the data is missing and what the column represents.',
    ),
    mcq(
      5,
      '`nba["notes"].fillna("none")` is run on its own, without assigning the result to anything. What happens to the DataFrame?',
      'Nothing — the filled copy is returned, but the DataFrame is unchanged unless you reassign it',
      [
        'The notes column is filled permanently',
        'Every row with a missing value is deleted',
        'An error is raised because fillna needs inplace=True',
      ],
      'Most pandas methods return a new object. Reassign it (nba["notes"] = nba["notes"].fillna("none")) to keep the change.',
    ),
    codeOut(
      5,
      'python',
      `import pandas as pd

df = pd.DataFrame({"team": ["Lakers", "Celtics", "Lakers"], "points": [102, 98, 102]})
print(len(df.drop_duplicates()))`,
      '2',
      ['3', '1', '0'],
      'Rows 0 and 2 are identical, so drop_duplicates() keeps the first one and removes the repeat, leaving two rows.',
      'What is printed when this code runs?',
      PANDAS,
    ),

    // ── Lesson 6 · Group by and pivot tables ────────────────────────────────
    codeOut(
      6,
      'python',
      `import pandas as pd

df = pd.DataFrame({"team": ["BOS", "LAL", "BOS", "LAL"], "pts": [100, 110, 90, 120]})
print(df.groupby("team")["pts"].mean()["BOS"])`,
      '95.0',
      ['115.0', '105.0', '190'],
      'groupby("team") makes one group per team, and mean() averages pts inside each group. BOS scored 100 and 90, so its mean is 95.0. (105.0 would be the average of all four rows.)',
      'What is printed when this code runs?',
      PANDAS,
    ),
    mcq(
      6,
      'You run `nba.groupby("team_id")` and print it without anything else. What do you see?',
      'A DataFrameGroupBy object — you must chain an aggregation such as `.mean()` to get results',
      [
        'The average of every column',
        'The rows sorted by team',
        'An error saying groupby needs a list',
      ],
      'groupby only splits the data into groups. Nothing is calculated until you aggregate.',
    ),
    mcq(
      6,
      'Which statement about `.count()` and `.size()` on grouped data is correct?',
      '.count() skips missing values in a column, while .size() counts every row in each group',
      [
        '.size() skips missing values, while .count() counts every row',
        'They always give identical results',
        '.size() only works on pivot tables',
      ],
      'Using the wrong one can silently produce different totals when the data has gaps.',
    ),
    mcq(
      6,
      'In a pivot table, a NaN cell for one team in one season most likely means…',
      'That combination did not occur in the data',
      [
        'The value was exactly zero',
        'pandas could not calculate a mean',
        'The team lost every game that season',
      ],
      'A NaN here usually means the team did not play that season — which is not the same as a value of zero.',
    ),

    // ── Lesson 7 · Statistics and correlation ───────────────────────────────
    codeOut(
      7,
      'python',
      `import pandas as pd

incomes = pd.Series([30, 32, 35, 38, 1000])
print(incomes.mean(), incomes.median())`,
      '227.0 35.0',
      ['35.0 227.0', '227.0 227.0', '35.0 35.0'],
      'The single huge value (1000) drags the mean up to 227.0, but the median — the middle value once sorted — stays at 35.0. The median is much more resistant to outliers.',
      'What is printed when this code runs?',
      PANDAS,
    ),
    mcq(
      7,
      'A correlation coefficient of -0.85 between two variables means…',
      'A strong negative relationship: when one rises, the other tends to fall',
      [
        'There is no relationship',
        'A weak positive relationship',
        'The first variable causes the second to fall',
      ],
      'The sign gives the direction and the size gives the strength. A negative correlation is still a real relationship, and correlation alone never proves causation.',
    ),
    mcq(
      7,
      'What are the values on the diagonal of a correlation matrix from `df.corr()`?',
      '1.0, because every variable is perfectly correlated with itself',
      [
        '0.0, because a variable has no relationship with itself',
        '-1.0, because a variable is the opposite of itself',
        "The mean of that variable's column",
      ],
      'Every column compared with itself moves perfectly together, so its coefficient is exactly 1.0.',
    ),
    mcq(
      7,
      'Elo rating and points scored have a correlation of 0.09. Which statement is the most accurate?',
      'There is only a weak positive association, and it does not show that a high Elo causes more points',
      [
        'There is no relationship at all',
        'It is a strong effect: a high Elo rating causes high scoring',
        'The correlation proves the data is wrong',
      ],
      'A value of 0.09 should be described as weak — not as "no relationship" and not as "a strong effect".',
    ),

    // ── Lesson 8 · A full analysis ──────────────────────────────────────────
    mcq(
      8,
      'Which sequence matches the shape of a complete data analysis project?',
      'Load → inspect → clean → explore → summarize statistically → conclude',
      [
        'Conclude → load → clean → inspect → explore',
        'Clean → conclude → load → explore → inspect',
        'Load → conclude → inspect → clean → explore',
      ],
      'Whatever the dataset, you need to see and fix the data before you explore it, and the conclusion comes last, backed by your results.',
    ),
    mcq(
      8,
      'A written conclusion says "a higher Elo causes more points", but the analysis only found a correlation of 0.09. What is wrong?',
      'The claim goes beyond the evidence: it states causation and overstates a weak relationship',
      [
        'Nothing — conclusions should always sound confident',
        'Conclusions should never mention numbers',
        'It should have said there is no relationship at all',
      ],
      'Every sentence of a conclusion must be backed by a number the analysis actually computed, described at the strength the number supports.',
    ),
  ],
  trueFalse: [
    tf(
      1,
      'An insight that nobody understands is still useful, as long as the calculation behind it was correct.',
      false,
      'Communication is a core step: a finding is only useful when the people who need it can understand it.',
    ),
    tf(
      2,
      'Using a single `=` inside an `if` condition to compare two values works exactly like `==`.',
      false,
      'A single = assigns a value, and using it in a condition is a syntax error. Use == to compare.',
    ),
    tf(
      3,
      'Every column of a pandas DataFrame is a Series.',
      true,
      'A DataFrame is essentially a dictionary of Series that share the same row index.',
    ),
    tf(
      4,
      '`df["col"]` returns a Series, while `df[["col"]]` returns a one-column DataFrame.',
      true,
      'Double square brackets pass a list of column names, which gives back a DataFrame.',
    ),
    tf(
      5,
      'Running `.dropna()` on a DataFrame where one column is empty in almost every row can remove most of the dataset.',
      true,
      'By default dropna() deletes any row that has a missing value, so check which columns have gaps before dropping.',
    ),
    tf(
      6,
      '`.agg(["mean", "max"])` can calculate several statistics in a single call.',
      true,
      'agg() takes a list (or a dictionary) of aggregation functions and returns a table with one column per statistic.',
    ),
    tf(
      7,
      'A strong correlation between two variables proves that one of them causes the other.',
      false,
      'Both could be driven by a third factor, or the link could be coincidence. Correlation is not causation.',
    ),
    tf(
      7,
      'The mode of a dataset is its most frequently occurring value.',
      true,
      'The mode is most useful for categorical or repeated discrete data.',
    ),
    tf(
      8,
      'Every claim in a written conclusion should be backed by a number that the analysis actually computed.',
      true,
      'Conclusions are evidence-based statements, never assumptions.',
    ),
    tf(
      8,
      'After cleaning a dataset there is no need to check it again, because the cleaning code has already run.',
      false,
      'Re-run .isnull().sum() and .dtypes after cleaning to confirm that the fixes actually worked.',
    ),
  ],
});

// Position 1 of the Data Scientist Final Test, position 1 of Odyssey Stage 3 and
// position 7 of the Odyssey Final Test.
export const pythonForDataExtras: ModuleExtras = {
  final: {
    mcq: [
      mcq(
        1,
        'A table lists one NBA game per line, with columns for team, points and result. What is "points"?',
        'A variable (column): one measured attribute of each game',
        ['A record (row)', 'The whole dataset', 'An insight'],
        'Columns are variables (also called features); each row is one record or observation, such as a single game.',
      ),
      codeOut(
        2,
        'python',
        `def calculate_average(nums):
    return sum(nums) / len(nums)

print(calculate_average([88, 92, 79, 95, 84]))`,
        '87.6',
        ['438', '88', '84'],
        'The function returns the sum (438) divided by the count (5), which is 87.6.',
      ),
      mcq(
        2,
        'What does `import pandas as pd` do?',
        'Loads the pandas library and lets you refer to it by the short name `pd`',
        [
          'Creates a DataFrame called pd',
          'Saves your notebook as pd.ipynb',
          'Converts every column to a Series',
        ],
        'The as pd alias is a universal data science convention, so that code can say pd.read_csv instead of pandas.read_csv.',
      ),
      mcq(
        3,
        'What does `df.tail(3)` show?',
        'The last 3 rows of the DataFrame',
        [
          'The first 3 rows of the DataFrame',
          'The last 3 columns of the DataFrame',
          'The 3 rows with the highest values',
        ],
        'head() previews the top rows and tail() previews the bottom rows; both default to 5 rows when no number is given.',
      ),
      codeOut(
        4,
        'python',
        `import pandas as pd

df = pd.DataFrame({"team": ["BOS", "LAL", "MIA"], "pts": [101, 118, 95]})
print(df.iloc[1, 0])`,
        'LAL',
        ['BOS', '118', 'MIA'],
        '.iloc works by position: row 1 is the second row (LAL) and column 0 is the first column (team).',
        'What is printed when this code runs?',
        PANDAS,
      ),
      mcq(
        4,
        'In `df.sort_values(["year_id", "pts"])`, how is the second column used?',
        'It breaks ties between rows that have the same year_id',
        [
          'It is ignored',
          'It is sorted first, before year_id',
          'It becomes the new index',
        ],
        'pandas sorts by the first column, and uses the next ones to order rows that are tied.',
      ),
      mcq(
        5,
        'You call `.astype(int)` on a column that contains a text value such as "N/A". What happens?',
        "A ValueError is raised, so check the column's unique values first",
        [
          'The text is silently turned into 0',
          'The text value is dropped from the column',
          'The column becomes a Series of True/False values',
        ],
        'Converting types blindly can fail. Inspecting the column with .unique() first shows you the values that need cleaning.',
      ),
      codeOut(
        6,
        'python',
        `import pandas as pd

df = pd.DataFrame({"team": ["BOS", "LAL", "BOS", "BOS", "LAL"], "result": ["W", "L", "W", "L", "W"]})
wins = df[df["result"] == "W"].groupby("team").size()
print(wins["BOS"])`,
        '2',
        ['3', '1', '5'],
        'Filtering to the winning rows leaves BOS twice and LAL once; size() then counts the rows in each group.',
        'What is printed when this code runs?',
        PANDAS,
      ),
      mcq(
        7,
        "Two classes both have a mean score of 70. Class A's scores range from 68 to 72, and Class B's from 40 to 100. Which statement is correct?",
        'Class B has the larger standard deviation',
        [
          'Class A has the larger standard deviation',
          'They have the same standard deviation because the means match',
          'Class B has the higher median',
        ],
        'Standard deviation measures how spread out values are around the mean. Class B is far more spread out.',
      ),
    ],
    trueFalse: [
      tf(
        7,
        'In the output of `.describe()`, the 50% row is the median.',
        true,
        'The 25%, 50% and 75% rows are the quartiles, and the 50% value is the middle of the sorted data.',
      ),
      tf(
        3,
        'The argument `index=False` in `to_csv` removes the column names from the saved file.',
        false,
        'It leaves out the row-number index. The column names (the header row) are still written.',
      ),
    ],
  },
  stage: {
    mcq: [
      mcq(
        1,
        'Which step of the data science pipeline turns the findings into a clear chart or written summary for other people?',
        'Communicate',
        ['Collect', 'Clean', 'Analyze'],
        'Communicating is as important as the maths — an insight nobody understands is not useful to anyone.',
      ),
      mcq(
        1,
        'The number 82 means nothing on its own. "82 wins in an NBA season" is best described as…',
        'Information — the number now has context',
        ['Raw data', 'An insight', 'A dataset'],
        'Data plus context is information. An insight comes from comparing and analysing information to find a pattern.',
      ),
      codeOut(
        2,
        'python',
        `for score in [88, 52]:
    print("Pass" if score >= 60 else "Fail")`,
        'Pass\nFail',
        ['Fail\nPass', 'Pass\nPass', 'Pass'],
        'The one-line if/else expression is evaluated for each score: 88 is at least 60 so it prints Pass; 52 is not, so it prints Fail.',
      ),
      codeOut(
        3,
        'python',
        `import pandas as pd

df = pd.DataFrame({"team": ["BOS"], "pts": [101]})
print(df.columns.tolist())`,
        "['team', 'pts']",
        ["('team', 'pts')", "[['team'], ['pts']]", "['BOS', 101]"],
        '.columns lists the column names, and tolist() turns them into an ordinary Python list.',
        'What is printed when this code runs?',
        PANDAS,
      ),
      codeOut(
        4,
        'python',
        `import pandas as pd

df = pd.DataFrame({"pts": [105, 130, 98, 140], "playoffs": [0, 1, 1, 1]})
print(len(df[(df["pts"] > 100) & (df["playoffs"] == 1)]))`,
        '2',
        ['3', '1', '4'],
        'Both conditions must be True: only the 130 and 140 rows are playoff games with more than 100 points. (Three rows pass the points test alone.)',
        'What is printed when this code runs?',
        PANDAS,
      ),
      mcq(
        5,
        'Why is `.fillna("none")` sensible for the NBA "notes" column, but `.fillna(0)` is wrong for missing test scores?',
        '"notes" is only filled in for special games, so "none" is honest; a 0 score would falsely mean the student scored zero',
        [
          'fillna only accepts text values, never numbers',
          'Test scores can never be missing',
          'Zero is not a valid number in a DataFrame',
        ],
        'The right fix depends on what the missing value means. "No note" is a true description; "score of 0" is a false one.',
      ),
      codeOut(
        6,
        'python',
        `import pandas as pd

df = pd.DataFrame({"team": ["BOS", "BOS", "LAL"], "pts": [100, None, 120]})
print(df.groupby("team")["pts"].count()["BOS"], df.groupby("team").size()["BOS"])`,
        '1 2',
        ['2 2', '2 1', '1 1'],
        'BOS has two rows but one of its pts values is missing. count() ignores the missing value (1), while size() counts both rows (2).',
        'What is printed when this code runs?',
        PANDAS,
      ),
      codeOut(
        7,
        'python',
        `import pandas as pd

a = pd.Series([1, 2, 3, 4])
b = pd.Series([2, 4, 6, 8])
print(round(a.corr(b), 2))`,
        '1.0',
        ['0.0', '-1.0', '2.0'],
        'b is always exactly twice a, so the two move together perfectly: a correlation of +1.0.',
        'What is printed when this code runs?',
        PANDAS,
      ),
      codeOut(
        7,
        'python',
        `import pandas as pd

print(pd.Series([2, 3, 3, 5]).mode()[0])`,
        '3',
        ['2', '5', '3.25'],
        'The mode is the most frequent value (3 appears twice). mode() returns a Series because there can be several modes, so [0] takes the first.',
        'What is printed when this code runs?',
        PANDAS,
      ),
      mcq(
        8,
        'In the Celtics investigation, why was the data filtered to one team before the season averages were calculated?',
        "To answer a scoped question about that team's history — averaging all teams together would hide it",
        [
          'Because pandas can only group one team at a time',
          'To remove every row with a missing value',
          'Because the Elo column cannot be used with other teams',
        ],
        'A good analysis starts from a well-scoped question and filters the data to match it.',
      ),
    ],
    trueFalse: [
      tf(
        3,
        'A DataFrame is a table of rows and columns — like a spreadsheet inside Python.',
        true,
        "It is pandas' central 2-dimensional structure, with labelled rows and columns.",
      ),
      tf(
        4,
        '`.loc[]` selects rows and columns by their integer position and ignores labels.',
        false,
        '.loc works with labels and conditions. It is .iloc that selects purely by integer position.',
      ),
      tf(
        7,
        'A low standard deviation means the values are clustered tightly around the mean.',
        true,
        'Standard deviation measures the typical spread around the mean: low means tight, high means widely spread.',
      ),
    ],
  },
  odyssey: {
    mcq: [
      codeOut(
        3,
        'python',
        `import pandas as pd

print(len(pd.DataFrame({"x": range(10)}).head()))`,
        '5',
        ['10', '1', '3'],
        'head() returns the first 5 rows by default.',
        'What is printed when this code runs?',
        PANDAS,
      ),
      mcq(
        5,
        'Which pandas method flags the rows that are exact repeats of an earlier row?',
        '`.duplicated()`',
        ['`.isnull()`', '`.astype()`', '`.fillna()`'],
        'duplicated() marks repeats as True; drop_duplicates() is the method that removes them.',
      ),
      mcq(
        6,
        'In `pd.pivot_table(df, values="pts", index="team_id", columns="year_id", aggfunc="mean")`, what does each cell show?',
        'The mean points for that team in that year',
        ['The number of games played', 'The team id', 'The year id'],
        'The index gives the rows, the columns argument gives the columns, and aggfunc decides what is calculated in each cell.',
      ),
    ],
    trueFalse: [],
  },
};
