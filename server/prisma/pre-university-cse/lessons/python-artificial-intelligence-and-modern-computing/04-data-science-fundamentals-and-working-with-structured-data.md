# Lumexa Mission Log: Python, Artificial Intelligence & Modern Computing

**Course/Path:** Python, Artificial Intelligence & Modern Computing
**Lesson:** 04 of 08
**Title:** Data Science Fundamentals and Working with Structured Data
**Duration:** 60 minutes
**Difficulty:** Intermediate
**Technology:** Python

---

## Mission Brief

Every phone, school and shop produces data, and somebody has to turn the numbers into answers: *Do students who study more hours score higher? Which class needs help? Is that one strange result a mistake or a discovery?* This is **data science**: asking questions of data in a disciplined way, and being honest about what the data can and cannot tell you. The surprise for beginners is that most of the work is not clever mathematics. It is **cleaning**: real data is incomplete, inconsistent and sometimes simply wrong.

In this lesson you learn the data science workflow, how to load structured data from a CSV file, how to clean it with explicit and logged rules, how to summarise it with the mean, the median, the spread, groups and histograms, and how to measure a relationship with the correlation coefficient and a fitted line, without mistaking correlation for cause. You then build the **Exam Results Explorer**, which takes a messy CSV file of results and produces a trustworthy report.

## Learning Objectives

1. Describe the data science workflow and distinguish structured, semi-structured and unstructured data, and categorical from numerical variables.
2. Load a CSV file with the standard library and convert its text values to numbers.
3. Clean data with explicit rules (duplicates, missing values, impossible values) and keep a log of everything that was removed.
4. Summarise data with the mean, median, mode, standard deviation, quartiles, groups, frequency tables and text histograms, and find outliers with the 1.5 x IQR rule.
5. Compute and interpret the correlation coefficient and a least-squares line, and explain why correlation is not causation and why a prediction outside the data is dangerous.
6. Build the Exam Results Explorer: clean a CSV file, summarise it by class, report the outliers, and measure how hours of study relate to scores.

## Prerequisites

- Lessons 1 to 3: Python collections, functions, modules and the habit of testing.
- The idea of a table with rows and columns from the lessons on databases, and the basic statistics words (mean, median, minimum, maximum).
- Python 3.10 or newer, because `statistics.correlation` is used as a cross-check.

## Concept Explanation

### The data science workflow

The steps of a data science project form a loop, not a line. Ask a clear **question** ("Do students who study more hours score higher?"). **Collect** the data, and ask who collected it, how and why. **Clean** it. **Explore** it with summaries and charts. **Model** or test an idea. **Communicate** the result honestly. Then decide what to ask next. Most of the effort goes into the cleaning step.

Data comes in several kinds. **Structured** data lives in tables with rows and columns: a CSV file, a database table. **Semi-structured** data such as JSON has a flexible shape. **Unstructured** data such as free text, images and sound has no table at all (Lesson 6 looks at it). Each column, or **variable**, is **categorical** (a class label such as 10, or an ordered grade such as A+, A, A-) or **numerical** (a count, which is discrete, or a measurement such as hours, which is continuous). The kind decides which summary makes sense: the **mode** for categories, the **median** for ordered data, the **mean** for numbers that are not wildly skewed. Professionals use libraries such as **pandas** for tables, **NumPy** for fast arrays and **matplotlib** for charts. In this lesson you use only the standard library (`csv`, `statistics`, `collections`), so that you see exactly what those libraries do for you, and the same ideas transfer.

### Loading and cleaning data

A **CSV** file (comma separated values) is plain text: one line per row, the first line holds the column names. `csv.DictReader(io.StringIO(text))` turns every line into a dictionary, and every value arrives as **text**: `"12"` is not the number 12, and comparing `"9"` with `"10"` as text puts 9 after 10. Convert each column to its real type with `int(...)` or `float(...)` and decide what to do when the conversion fails.

Real data is dirty in predictable ways. **Missing values** (an empty cell, `NA`, `-`). **Duplicates** (the same row entered twice). **Impossible values** (a score of 105 out of 100, an age of -3). **Inconsistent labels** (`Class 10`, `class10`, ` 10 `). **Wrong types** (the text `abc` in a number column). For each problem you must choose a rule: drop the row, fill in a value, or flag it. Whatever you choose, follow three habits. Keep the **raw data untouched** and write the cleaned data somewhere else. Never delete silently: write a **log** that says which row was removed and why, so that anybody can check your decision. And do not confuse an **error** with an **outlier**: a score of 105 is impossible, but a student who studied 28 hours a week is merely unusual, and removing a true value because it is inconvenient would be dishonest.

### Summarising data

The **mean** is the sum divided by the count; the **median** is the middle value of the sorted data (the mean of the two middle values if the count is even); the **mode** is the most common value. They answer "what is typical?" differently, and **outliers** affect them differently: one extreme value moves the mean a lot and the median hardly at all, which is why the median is called **robust**. To describe the **spread** use the range (maximum minus minimum), the **standard deviation** (about how far values are from the mean; use `statistics.stdev` for a sample and `statistics.pstdev` for a whole population) and the **quartiles**: Q1, the median and Q3 split the sorted data into four equal parts, and the **interquartile range** IQR = Q3 - Q1 is the spread of the middle half. A common rule marks a value as an outlier if it lies below Q1 - 1.5 x IQR or above Q3 + 1.5 x IQR.

To compare groups, **group by** a category: collect the values of each class in a `defaultdict(list)` and summarise every list. A **frequency table** counts how often each value or band occurs (`collections.Counter`), and a **histogram** draws those counts as bars; a text histogram with `'#' * count` is enough to see the shape. Be careful with small groups: a class of four students can have a high mean by luck, and a mean of group means is not the overall mean when the groups have different sizes. Report the **number of cases** next to every summary.

### Relationships, correlation and honest conclusions

To see whether two numerical variables move together, draw a **scatter plot**, one point per student, and compute the **Pearson correlation coefficient r**. It lies between -1 and 1: near 1 means that large values of one go with large values of the other, near -1 means the opposite, near 0 means no straight-line relationship. It is computed by multiplying the deviations from the means of both variables, adding them up and scaling the result by the spread of each. A **least-squares line** `y = intercept + slope * x` is the straight line with the smallest total squared distance to the points, and it lets you **predict**: the slope says how much the score rises for one more hour.

Four warnings keep you honest. **Correlation is not causation.** Ice cream sales and sunburn cases rise together, but ice cream does not cause sunburn: hot weather, a **confounder**, causes both. **A single outlier can change r a great deal**, so look at the scatter plot and report r with and without it. **Do not extrapolate**: a line fitted to 2 to 15 hours of study says nothing sensible about 40 hours. And **the sample matters**: a result about 20 students of one school is not a law about all students, and the data may be **biased** if some students were never asked.

## Key Vocabulary

| Term | Definition |
|---|---|
| **Structured data** | Data in tables with rows and columns, such as a CSV file. |
| **Variable (column)** | One property that is recorded for every row: categorical or numerical. |
| **CSV** | Comma separated values: a plain text table, one row per line. |
| **Missing value** | A cell without a usable value: empty, `NA` or the wrong type. |
| **Outlier** | A value that lies far from the rest; it may be an error or a true extreme. |
| **Mean / median / mode** | The average / the middle value / the most common value. |
| **Standard deviation** | A measure of how far values are from the mean, typically. |
| **Quartile / IQR** | One of three cut points that split sorted data in four / Q3 minus Q1. |
| **Frequency table / histogram** | Counts of each value or band / a chart of those counts. |
| **Correlation (r)** | A number from -1 to 1 that measures a straight-line relationship. |
| **Regression line** | The straight line closest to the points, used for prediction. |
| **Confounder** | A hidden factor that causes both of two correlated variables. |
| **Sampling bias** | A sample that does not fairly represent the group you want to know about. |

## Worked Examples

### Example 1: Load and clean a CSV file

```python
import csv
import io

RAW = """id,name,class,hours,score
1,Ayesha,10,12,88
2,Tanvir,10,8,67
3,Sadia,9,3,38
4,Nabil,11,10,75
5,Mim,10,14,94
6,Rafi,12,,60
7,Tasnim,9,6,105
8,Fahim,11,9,72
8,Fahim,11,9,72
9,Zara,10,abc,81
10,Imran,12,7,55
"""


def clean(raw_text):
    """Return the clean rows and a log that explains every row that was removed."""
    rows, log, seen = [], [], set()
    for line, row in enumerate(csv.DictReader(io.StringIO(raw_text)), start=2):
        name = row["name"].strip()
        if row["id"] in seen:
            log.append(f"line {line}: {name} dropped, the id {row['id']} is a duplicate")
            continue
        seen.add(row["id"])
        try:
            hours = float(row["hours"])
        except ValueError:
            problem = "hours is missing" if row["hours"].strip() == "" else f"hours '{row['hours']}' is not a number"
            log.append(f"line {line}: {name} dropped, {problem}")
            continue
        score = int(row["score"])
        if not 0 <= score <= 100:
            log.append(f"line {line}: {name} dropped, score {score} is outside 0 to 100")
            continue
        rows.append({"id": int(row["id"]), "name": name, "class": int(row["class"]), "hours": hours, "score": score})
    return rows, log


rows, log = clean(RAW)
print("\n".join(log))
print(f"{len(RAW.splitlines()) - 1} data lines read, {len(rows)} kept, {len(log)} removed")
print(rows[0])
print("kept names:", ", ".join(r["name"] for r in rows))
print("types:", type(rows[0]["hours"]).__name__, type(rows[0]["score"]).__name__, type(rows[0]["class"]).__name__)
```

```output
line 7: Rafi dropped, hours is missing
line 8: Tasnim dropped, score 105 is outside 0 to 100
line 10: Fahim dropped, the id 8 is a duplicate
line 11: Zara dropped, hours 'abc' is not a number
11 data lines read, 7 kept, 4 removed
{'id': 1, 'name': 'Ayesha', 'class': 10, 'hours': 12.0, 'score': 88}
kept names: Ayesha, Tanvir, Sadia, Nabil, Mim, Fahim, Imran
types: float int int
```

1. `RAW` is the text of a CSV file. `csv.DictReader` reads the first line as the column names and gives every other line as a dictionary whose values are **all text**. `enumerate(..., start=2)` numbers the lines the way an editor does: the header is line 1.
2. `clean` applies **four rules** and logs each decision: a repeated id is dropped (the first row wins), a `hours` that is empty or not a number is dropped with a message that says which, and a `score` outside 0 to 100 is dropped. Rafi (line 7), Tasnim (line 8), the second Fahim (line 10) and Zara (line 11) are removed, and the log says why for each.
3. The result is 7 clean rows out of 11 data lines. The raw text is untouched. The converted rows hold **real types**: `hours` is a `float`, `score` and `class` are `int`, which the last line shows.
4. A log makes the cleaning **auditable**: a teacher can see that Tasnim's 105 was removed because it is impossible, and can decide to correct the entry instead. Silent deletion would hide that decision.

### Example 2: Summarising with statistics and groups

```python
import statistics
from collections import Counter, defaultdict

DATA = [  # class, hours studied, score
    (10, 12, 88), (10, 8, 67), (9, 3, 38), (11, 10, 75), (10, 14, 94), (12, 9, 72), (9, 6, 58), (11, 11, 83),
    (12, 7, 55), (9, 5, 80), (10, 10, 79), (11, 4, 71), (12, 13, 91), (9, 8, 64), (10, 6, 61), (11, 12, 70),
    (12, 2, 41), (9, 9, 70), (10, 15, 97), (11, 5, 57),
]
scores = [score for _, _, score in DATA]

print("n:", len(scores), "| mean:", round(statistics.mean(scores), 1), "| median:", statistics.median(scores))
print("range:", min(scores), "to", max(scores), "| stdev:", round(statistics.stdev(scores), 1))
q1, q2, q3 = statistics.quantiles(scores, n=4)
print("quartiles:", q1, q2, q3, "| IQR:", q3 - q1)

by_class = defaultdict(list)
for school_class, _, score in DATA:
    by_class[school_class].append(score)
for school_class in sorted(by_class):
    values = by_class[school_class]
    print(f"class {school_class}: {len(values)} students, mean {statistics.mean(values):.1f}, median {statistics.median(values)}, best {max(values)}")

bands = Counter(score // 10 * 10 for score in scores)
for band in range(30, 100, 10):
    print(f"{band}-{band + 9} | {'#' * bands[band]} {bands[band] or ''}".rstrip())

with_outlier = scores + [5]
print("add one score of 5: mean", round(statistics.mean(with_outlier), 1), "median", statistics.median(with_outlier))
```

```output
n: 20 | mean: 70.5 | median: 70.5
range: 38 to 97 | stdev: 16.2
quartiles: 58.75 70.5 82.25 | IQR: 23.5
class 9: 5 students, mean 62.0, median 64, best 80
class 10: 6 students, mean 81.0, median 83.5, best 97
class 11: 5 students, mean 71.2, median 71, best 83
class 12: 4 students, mean 64.8, median 63.5, best 91
30-39 | # 1
40-49 | # 1
50-59 | ### 3
60-69 | ### 3
70-79 | ###### 6
80-89 | ### 3
90-99 | ### 3
add one score of 5: mean 67.4 median 70
```

1. The data are 20 students as tuples. The mean and the median are both 70.5, the scores range from 38 to 97, and the standard deviation is 16.2: most scores lie within about 16 points of the mean. `statistics.quantiles(scores, n=4)` returns the three quartiles 58.75, 70.5 and 82.25, so the **IQR** is 23.5.
2. `defaultdict(list)` collects the scores of each class. The classes are of different sizes (5, 6, 5 and 4 students): class 10 has the highest mean, 81.0, and class 9 the lowest, 62.0. With so few students, such differences may be partly luck, which is why the count is printed with every mean.
3. The **frequency table** uses integer division to put each score into a band of ten (`88 // 10 * 10` is 80) and `Counter` counts them. The text histogram shows a bump in the 70s, with six scores, and thin tails on both sides.
4. The last line shows **robustness**: one extra score of 5 pulls the mean down from 70.5 to 67.4, about 3 points, but moves the median only from 70.5 to 70. When the data may contain extremes, report the median next to the mean.

### Example 3: Correlation, prediction and a confounder

```python
import statistics

hours = [12, 8, 3, 10, 14, 9, 6, 11, 7, 5, 10, 4, 13, 8, 6, 12, 2, 9, 15, 5]
scores = [88, 67, 38, 75, 94, 72, 58, 83, 55, 80, 79, 71, 91, 64, 61, 70, 41, 70, 97, 57]


def pearson(xs, ys):
    """The correlation coefficient r, from -1 to 1."""
    mx, my = sum(xs) / len(xs), sum(ys) / len(ys)
    sxy = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    sxx = sum((x - mx) ** 2 for x in xs)
    syy = sum((y - my) ** 2 for y in ys)
    return sxy / (sxx * syy) ** 0.5


def least_squares(xs, ys):
    """The line y = intercept + slope * x that is closest to the points."""
    mx, my = sum(xs) / len(xs), sum(ys) / len(ys)
    slope = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / sum((x - mx) ** 2 for x in xs)
    return my - slope * mx, slope


r = pearson(hours, scores)
print("r =", round(r, 3), "| library check:", round(statistics.correlation(hours, scores), 3))
intercept, slope = least_squares(hours, scores)
print(f"score = {intercept:.1f} + {slope:.1f} x hours")
print("prediction for 10 hours:", round(intercept + slope * 10), "| for 40 hours:", round(intercept + slope * 40))
print("r with one odd student (20 hours, score 45):", round(pearson(hours + [20], scores + [45]), 3))

temperature = [15, 18, 24, 28, 33, 35]
ice_cream = [20, 25, 40, 60, 85, 90]
sunburn = [3, 4, 9, 14, 22, 24]
print("ice cream and sunburn: r =", round(pearson(ice_cream, sunburn), 3))
print("temperature and ice cream: r =", round(pearson(temperature, ice_cream), 3), "| temperature and sunburn: r =", round(pearson(temperature, sunburn), 3))
```

```output
r = 0.852 | library check: 0.852
score = 39.1 + 3.7 x hours
prediction for 10 hours: 76 | for 40 hours: 188
r with one odd student (20 hours, score 45): 0.468
ice cream and sunburn: r = 0.999
temperature and ice cream: r = 0.987 | temperature and sunburn: r = 0.985
```

1. `pearson` follows the definition: the deviations of the two variables from their means are multiplied pair by pair and added up (`sxy`), then divided by the square root of the product of the two sums of squared deviations. It gives r = 0.852 for hours of study against score, and the library function `statistics.correlation` agrees, which is a **cross-check** against a trusted answer.
2. `least_squares` computes the slope (the covariance part divided by the variance of the hours) and the intercept. The line is `score = 39.1 + 3.7 x hours`: every extra hour goes with about 3.7 more points. The prediction for 10 hours is 76, which lies inside the data and is sensible.
3. The prediction for **40 hours is 188**, which is impossible for a score out of 100. The line was fitted to 2 to 15 hours, and using it far outside that range is **extrapolation**, which is not trustworthy.
4. One odd student (20 hours, score 45) drops r from 0.852 to 0.468. A **single outlier can change a correlation dramatically**, so look at the data and report r with and without it.
5. The last data are invented for this lesson. Ice cream sales and sunburn cases have r = 0.999, but neither causes the other: **temperature** is correlated with both (0.987 and 0.985) and is the confounder. A strong correlation tells you that two things move together, never why.

## Common Mistakes and Misconceptions

- **Deleting dirty rows silently.** Keep the raw data and write a log that says what was removed and why.
- **Comparing numbers as text.** CSV values are text until you convert them: `"9" > "10"` is true.
- **Treating every outlier as an error,** or never checking them. An impossible value is an error; an unusual true value is information.
- **Reporting only the mean.** One extreme value moves the mean; show the median and the spread as well.
- **Averaging the averages.** The mean of class means is not the overall mean when the classes differ in size.
- **Concluding cause from correlation.** Look for a confounder, a second explanation or a reversed direction.
- **Extrapolating a fitted line** far beyond the data that were used to fit it.
- **Trusting a small or biased sample.** Always print how many cases a summary is based on, and ask who is missing from the data.

## Guided Hands-On Activity

**Clean, summarise, question.** Work with your teacher and the code editors.

1. In Example 1 add a row with the score `-5` and a row with the class written as ` 10 ` (with spaces). What happens to each, and how would you change the rules?
2. In Example 1 change the rule so that a missing `hours` does not drop the row but sets `hours` to `None`, and log that decision instead. What would you have to change in a later summary?
3. In Example 2 add the mode of the scores with `statistics.mode`, and `statistics.multimode` for a list with two modes such as `[1, 1, 2, 2, 3]`.
4. In Example 2 find the outliers with the 1.5 x IQR rule. Are there any? Then add the score 5 and check again.
5. In Example 3 predict the correlation if every student studied exactly 3 hours more and then run it. Why does r not change?
6. In Example 3 compute the correlation between hours of study and the number of letters in each student's name (invent the data). Is it near zero? What does that teach you about "no relationship" and "chance"?
7. Write two questions that the data of Example 2 *cannot* answer, and say what data you would need.

## Lesson Project: Exam Results Explorer

### Objective

Build the **Exam Results Explorer** for the course project: a program that loads a messy CSV file of exam results, cleans it with logged rules, summarises it by class, reports the outliers, and measures how hours of study relate to scores, with and without the unusual student.

### Requirements

- **Load and clean.** `clean(raw_text)` reads the CSV text with `csv.DictReader`, trims the names, converts the numbers, and drops (never silently) a **duplicate id** (the first row is kept), a **missing or non-numeric `hours`**, and a **score outside 0 to 100**. It returns the clean rows and a log with one line for every removed row, including its line number.
- **Summarise.** The number, mean, median, sample standard deviation, minimum and maximum of the scores; a table for each class with the number of students, the mean, the median and the best student.
- **Outliers.** A function `fences(values)` for the 1.5 x IQR rule, applied to `hours` and to `score`, listing the outliers by name. Outliers are **kept** in the data.
- **Relationship.** The correlation r of hours and score for all students and for the students whose hours are not outliers, and the least-squares line and the prediction for 10 hours for the second group.
- Run it on the CSV text below: 25 data lines, of which four are dirty and one is a true but extreme value.

```text
id,name,class,hours,score
1,Ayesha,10,12,88
2,Tanvir,10,8,67
3,Sadia,9,3,38
4,Nabil,11,10,75
5,Mim,10,14,94
6,Rafi,12,9,72
7,Tasnim,9,6,58
8,Fahim,11,11,83
8,Fahim,11,11,83
9,Zara,12,7,55
10,Imran,9,5,80
11,Nusrat,10,10,79
12,Arif,11,4,71
13,Lina,12,13,91
14,Sohan,9,8,64
15,Mehnaz,10,6,61
16,Rubel,11,12,70
17,Farhana,12,2,41
18,Kabir,9,9,70
19,Tania,10,15,97
20,Jahid,11,5,57
21,Rina,10,,66
22,Tushar,9,7,105
23,Shila,12,abc,70
24,Parvez,12,28,45
```

### Instructions

1. Store the CSV text in a string `RAW` (a triple-quoted string works well).
2. Write `clean` with the four rules and the log lines; check that it returns 21 rows and 4 log lines.
3. Print the log and the summary line of the scores.
4. Group the rows by class and print the class table.
5. Write `fences` with `statistics.quantiles(values, n=4)` and print the outliers of `hours` and of `score`.
6. Write `pearson` and `least_squares`, and print r for all students and for the students without hours outliers, and the prediction for 10 hours.
7. Compare your output with the expected output.

### Expected Output

```text
Cleaning log
line 10: Fahim dropped, the id 8 is a duplicate
line 23: Rina dropped, hours is missing
line 24: Tushar dropped, score 105 is outside 0 to 100
line 25: Shila dropped, hours 'abc' is not a number
25 data lines read, 21 kept, 4 removed

Scores: n=21, mean 69.3, median 70, stdev 16.7, min 38, max 97

Class  Students  Mean   Median  Best
9      5         62.0   64      Imran (80)
10     6         81.0   83.5    Tania (97)
11     5         71.2   71      Fahim (83)
12     5         60.8   55      Lina (91)

Outliers (1.5 x IQR rule)
hours: fences -4.2 to 21.8; outliers: Parvez (28)
score: fences 21.5 to 117.5; outliers: none

Hours studied and score: r = 0.26 for all 21 students
without the hours outliers: r = 0.85 for 20 students
score = 39.1 + 3.7 x hours; prediction for 10 hours: 76
```

### Hints

1. **Hint 1 (the line numbers).** `enumerate(reader, start=2)` gives the line number of each data row.
2. **Hint 2 (the checks).** Test the duplicate first, then convert `hours` inside `try`, then check the score range.
3. **Hint 3 (the groups).** `defaultdict(list)` collects the rows of each class; `max(group, key=lambda r: r["score"])` finds the best student.
4. **Hint 4 (the fences).** `q1, _, q3 = statistics.quantiles(values, n=4)`, then `q1 - 1.5 * (q3 - q1)` and `q3 + 1.5 * (q3 - q1)`.
5. **Hint 5 (the format).** `{value:g}` prints 28.0 as 28; `{x:.1f}` prints one decimal.
6. **Hint 6 (the comparison).** Filter the rows by the fences of `hours` first, and then compute r and the line from the filtered lists.

### Success Criteria

- [ ] The log has exactly four lines: a duplicate id, a missing hours, a score outside the range and a text in hours.
- [ ] 21 rows are kept and the raw text is not changed.
- [ ] The class table shows four classes with their numbers of students, means, medians and best students.
- [ ] Parvez is reported as an outlier for hours but is not removed from the data.
- [ ] The correlation is reported twice, 0.26 for all students and 0.85 without the outlier, and the prediction for 10 hours is 76.

### Extension Challenge

Add a text histogram of the scores in bands of ten, a function `top(rows, n)` that returns the best `n` students, and a `summary_as_json(rows)` that returns the main numbers as JSON text. Then read the CSV text from a file with `pathlib.Path(...).read_text()` and handle `FileNotFoundError` with a clear message. Finally, write a short paragraph, as an honest report to the head teacher, that says what the data show about hours of study and what they do not show.

## Lesson Recap

- The **data science workflow** is a loop: question, collect, clean, explore, model, communicate; most effort goes into **cleaning**.
- Load CSV with `csv.DictReader` (all values are text), convert the types, clean with explicit rules, keep the raw data, and **log** every removed row.
- Summarise with the **mean, median, mode, spread, quartiles**, groups and frequency tables; the median is robust against outliers; find outliers with the **1.5 x IQR** rule and keep true extremes.
- **Correlation r** measures a straight-line relationship and a **least-squares line** predicts; **correlation is not causation**, one outlier can change r, and a line must not be extrapolated.

## Homework / Extension Mission

Collect a small data set of your own (at least 15 rows, for example the hours of sleep and the minutes of travel of your classmates, with their agreement and without names) and write it as CSV text with at least two deliberate mistakes. Use your own `clean` function with a log, report the mean, the median and the spread of one column, draw the text histogram, and compute the correlation of two columns. Then write one paragraph that says what you can conclude, what you cannot, and which confounder or bias might fool you.

## Course Project Connection

This lesson adds the **Exam Results Explorer** to the **course project**, the small Python-based computational application or data exploration project. It is the data-handling part of the project: it loads, cleans and summarises structured data and reports the relationships honestly. The records and statistics of Lesson 2 and the tested algorithms of Lesson 3 are the tools that it builds on. In Lesson 5 the same data become the training examples of a classifier.

## Instructor-Guided Teaching Notes

**Pacing (60 minutes).** 10 minutes: the workflow and the data types, with a messy spreadsheet shown on screen; 10 minutes: Example 1, with the class predicting which rows will be dropped; 15 minutes: Example 2, with the mean and median compared on the board before the extra score is added; 10 minutes: Example 3 and the ice cream and sunburn discussion; 15 minutes: the project.

**Live demonstrations.** Open the CSV file in a text editor and in a spreadsheet and show that it is only text. Draw the scatter plot of the 20 students by hand and add the odd student. Ask the class for other pairs of variables that are correlated because of a third one (shoe size and reading ability in primary school children, umbrellas and traffic jams).

**Misconceptions.** "Cleaning means deleting what I do not like." "The mean is always the best summary." "A high correlation means that one thing causes the other." "More data always means a better answer."

**Assessment of the project.** Run the explorer on the data and compare the output. Check that the log has four lines and the right reasons, that the outlier is kept and reported, and that both correlations are printed. Add a fifth dirty row (a score of -3) and check that it is logged. Ask: why is the correlation 0.26 with Parvez and 0.85 without him, and which number would you report?

**Reference solution `explorer.py`** (run with `python3 explorer.py`):

```python
"""Course project, step 4: the Exam Results Explorer."""
import csv
import io
import statistics
from collections import defaultdict

RAW = """id,name,class,hours,score
1,Ayesha,10,12,88
2,Tanvir,10,8,67
3,Sadia,9,3,38
4,Nabil,11,10,75
5,Mim,10,14,94
6,Rafi,12,9,72
7,Tasnim,9,6,58
8,Fahim,11,11,83
8,Fahim,11,11,83
9,Zara,12,7,55
10,Imran,9,5,80
11,Nusrat,10,10,79
12,Arif,11,4,71
13,Lina,12,13,91
14,Sohan,9,8,64
15,Mehnaz,10,6,61
16,Rubel,11,12,70
17,Farhana,12,2,41
18,Kabir,9,9,70
19,Tania,10,15,97
20,Jahid,11,5,57
21,Rina,10,,66
22,Tushar,9,7,105
23,Shila,12,abc,70
24,Parvez,12,28,45
"""


def clean(raw_text):
    """Return the clean rows and a log that explains every row that was removed."""
    rows, log, seen = [], [], set()
    for line, row in enumerate(csv.DictReader(io.StringIO(raw_text)), start=2):
        name = row["name"].strip()
        if row["id"] in seen:
            log.append(f"line {line}: {name} dropped, the id {row['id']} is a duplicate")
            continue
        seen.add(row["id"])
        try:
            hours = float(row["hours"])
        except ValueError:
            problem = "hours is missing" if not row["hours"].strip() else f"hours '{row['hours']}' is not a number"
            log.append(f"line {line}: {name} dropped, {problem}")
            continue
        score = int(row["score"])
        if not 0 <= score <= 100:
            log.append(f"line {line}: {name} dropped, score {score} is outside 0 to 100")
            continue
        rows.append({"name": name, "class": int(row["class"]), "hours": hours, "score": score})
    return rows, log


def fences(values):
    """The limits beyond which a value counts as an outlier (1.5 x IQR rule)."""
    q1, _, q3 = statistics.quantiles(values, n=4)
    return q1 - 1.5 * (q3 - q1), q3 + 1.5 * (q3 - q1)


def pearson(xs, ys):
    """The correlation coefficient r."""
    mx, my = statistics.mean(xs), statistics.mean(ys)
    sxy = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    return sxy / (sum((x - mx) ** 2 for x in xs) * sum((y - my) ** 2 for y in ys)) ** 0.5


def least_squares(xs, ys):
    """The line y = intercept + slope * x that is closest to the points."""
    mx, my = statistics.mean(xs), statistics.mean(ys)
    slope = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / sum((x - mx) ** 2 for x in xs)
    return my - slope * mx, slope


def report(raw_text):
    rows, log = clean(raw_text)
    print("Cleaning log")
    print("\n".join(log))
    print(f"{len(raw_text.splitlines()) - 1} data lines read, {len(rows)} kept, {len(log)} removed")

    scores = [r["score"] for r in rows]
    print(f"\nScores: n={len(scores)}, mean {statistics.mean(scores):.1f}, median {statistics.median(scores)}, "
          f"stdev {statistics.stdev(scores):.1f}, min {min(scores)}, max {max(scores)}")

    by_class = defaultdict(list)
    for r in rows:
        by_class[r["class"]].append(r)
    print("\nClass  Students  Mean   Median  Best")
    for school_class in sorted(by_class):
        group = by_class[school_class]
        values = [r["score"] for r in group]
        best = max(group, key=lambda r: r["score"])
        print(f"{school_class:<7}{len(group):<10}{statistics.mean(values):<7.1f}{statistics.median(values):<8}{best['name']} ({best['score']})")

    print("\nOutliers (1.5 x IQR rule)")
    for column in ("hours", "score"):
        values = [r[column] for r in rows]
        low, high = fences(values)
        odd = [f"{r['name']} ({r[column]:g})" for r in rows if not low <= r[column] <= high]
        print(f"{column}: fences {low:.1f} to {high:.1f}; outliers: {', '.join(odd) or 'none'}")

    low, high = fences([r["hours"] for r in rows])
    typical = [r for r in rows if low <= r["hours"] <= high]
    print(f"\nHours studied and score: r = {pearson([r['hours'] for r in rows], scores):.2f} for all {len(rows)} students")
    hours, marks = [r["hours"] for r in typical], [r["score"] for r in typical]
    print(f"without the hours outliers: r = {pearson(hours, marks):.2f} for {len(typical)} students")
    intercept, slope = least_squares(hours, marks)
    print(f"score = {intercept:.1f} + {slope:.1f} x hours; prediction for 10 hours: {intercept + slope * 10:.0f}")


if __name__ == "__main__":
    report(RAW)
```

```output
Cleaning log
line 10: Fahim dropped, the id 8 is a duplicate
line 23: Rina dropped, hours is missing
line 24: Tushar dropped, score 105 is outside 0 to 100
line 25: Shila dropped, hours 'abc' is not a number
25 data lines read, 21 kept, 4 removed

Scores: n=21, mean 69.3, median 70, stdev 16.7, min 38, max 97

Class  Students  Mean   Median  Best
9      5         62.0   64      Imran (80)
10     6         81.0   83.5    Tania (97)
11     5         71.2   71      Fahim (83)
12     5         60.8   55      Lina (91)

Outliers (1.5 x IQR rule)
hours: fences -4.2 to 21.8; outliers: Parvez (28)
score: fences 21.5 to 117.5; outliers: none

Hours studied and score: r = 0.26 for all 21 students
without the hours outliers: r = 0.85 for 20 students
score = 39.1 + 3.7 x hours; prediction for 10 hours: 76
```

**Differentiation.** Support: give `clean` and the log, and let students write the summary and the class table. Stretch: the text histogram, the JSON summary, reading the file with `pathlib`, and a function that predicts the score from the hours with the fitted line and refuses values outside the range of the data.

**Discussion questions (not for the student quiz).** When is it right to remove an outlier, and who should decide? Why is the mean a poor summary of incomes? What data would you need to show that studying causes better scores?
