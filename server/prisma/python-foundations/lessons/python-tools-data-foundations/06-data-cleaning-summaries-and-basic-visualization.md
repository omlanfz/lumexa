# Lumexa Mission Log: Python Tools & Data Foundations

**Course/Path:** Python Tools & Data Foundations
**Lesson:** 06 of 08
**Title:** Data Cleaning, Summaries & Basic Visualization
**Duration:** 60 minutes
**Difficulty:** Beginner
**Technology:** Python 3, Pandas, Matplotlib, Jupyter Notebook

---

## Mission Brief

Data from the real world is messy. A sensor goes offline and leaves a gap. A form is submitted twice. Someone types "five" in a column of numbers, and someone else adds a space before a name. Data scientists often say that most of their time goes into **cleaning**, because a chart or a calculation made from dirty data is simply wrong. Today you will learn to spot the most common problems in a dataset, fix them with Pandas, summarise the clean data with a few simple statistics and draw your first charts with Matplotlib. This lesson is an introduction. It gives you the habits and the basic tools, and you will go deeper into analysis and visualisation in the Data Scientist program.

## Learning Objectives

1. Recognise raw, messy data and describe common problems.
2. Find and handle missing values and duplicate records.
3. Check and correct data types.
4. Apply basic cleaning techniques to text columns.
5. Calculate simple summaries and use `groupby` to summarise by category.
6. Create line, bar and scatter charts with titles, labels and legends.

## Prerequisites

- Lesson 5: you can load a DataFrame, and select, filter and sort it.
- Lesson 3: you can work in a notebook.

## Concept Explanation

### Raw and messy datasets

**Raw data** is data exactly as it was collected. It is rarely ready to use. Typical problems are:

- **Missing values:** empty cells, shown by Pandas as `NaN` (not a number).
- **Duplicates:** the same record entered more than once.
- **Wrong types:** numbers stored as text, or dates stored as text.
- **Inconsistent text:** `" Nova"`, `"nova"` and `"NOVA"` for the same person.
- **Impossible values:** an age of 250, or a negative number of hours.

The golden rule of cleaning: **look first, change second, and keep a record of what you changed.** Never overwrite your original file; clean a copy in your notebook.

### Identifying missing values

```python
df.isna().sum()          # the number of missing values in each column
df.isna().sum().sum()    # the total
df[df["mass"].isna()]    # the rows where mass is missing
```

Compare this with `df.info()`, which shows the non-missing count for each column.

### Handling missing values

There are three common choices, and none is always right. It depends on what the data means:

| Choice | How | When it is reasonable |
|---|---|---|
| **Drop** the rows | `df.dropna()` or `df.dropna(subset=["mass"])` | Few rows are affected and the column matters |
| **Fill** with a typical value | `df["x"].fillna(df["x"].median())` | A numeric column where a typical value is a fair guess |
| **Leave** them | nothing | The question does not need that column |

Write down which choice you made and why. Filling in values is a *guess*, and it should be reported honestly.

```python
df["study_hours"] = df["study_hours"].fillna(df["study_hours"].median())
```

### Detecting and handling duplicate records

```python
df.duplicated().sum()          # how many rows repeat an earlier row
df = df.drop_duplicates()      # keep the first copy of each
```

Think before dropping: two students can truly have the same score, so make sure a *whole row* repeats.

### Understanding and correcting data types

`df.dtypes` shows the type of every column. A column that should be numeric but holds text cannot be averaged. Convert it:

```python
df["sleep_hours"] = pd.to_numeric(df["sleep_hours"], errors="coerce")   # bad values become NaN
df["date"] = pd.to_datetime(df["date"])
df["grade"] = df["grade"].astype(int)
```

`errors="coerce"` turns anything that cannot be converted into a missing value, which you can then handle in the usual way.

### Basic cleaning techniques

Text columns need tidying so that equal things look equal:

```python
df["student"] = df["student"].str.strip()          # remove spaces at both ends
df["student"] = df["student"].str.title()          # Nova, not nova or NOVA
df = df.rename(columns={"study_hours": "study"})   # clearer column names
df = df[df["study"] >= 0]                          # remove impossible values
```

### Calculating simple statistical summaries

A few numbers describe a column well:

```python
df["study"].mean()        # the average
df["study"].median()      # the middle value
df["study"].min()
df["study"].max()
df["grade"].value_counts()   # how often each value appears
```

Remember that the **median** is less affected by extreme values than the mean, which is why it is a good choice for filling gaps.

### Grouping and aggregating data

**`groupby`** splits the rows into groups, applies a calculation to each and gives one result per group:

```python
df.groupby("grade")["study"].mean()       # average study time for each grade
df.groupby("grade")["study"].agg(["mean", "max", "count"])   # several at once
```

Read it aloud: *"Group by grade, take the study column, and find the mean."*

### Introduction to Matplotlib

**Matplotlib** is the standard library for drawing charts in Python. Import its plotting module as `plt`. Every chart follows the same steps: **create it, label it, show it**.

```python
import matplotlib.pyplot as plt

averages = df.groupby("grade")["study"].mean()
plt.bar(averages.index.astype(str), averages.values, label="Average study hours")
plt.title("Study time by grade")
plt.xlabel("Grade")
plt.ylabel("Hours per day")
plt.legend()
plt.show()
```

### Creating basic line, bar and scatter plots

| Chart | Function | Best for |
|---|---|---|
| **Line** | `plt.plot(x, y)` | Change over time |
| **Bar** | `plt.bar(categories, values)` | Comparing categories |
| **Scatter** | `plt.scatter(x, y)` | The relationship between two numbers |

### Adding titles, labels and legends

A chart without labels is only a drawing. Always add:

- a **title** (`plt.title`) that says what the chart shows,
- **axis labels** (`plt.xlabel`, `plt.ylabel`) with units,
- a **legend** (`plt.legend`) when there is more than one series, using `label=` in each plot call.

Choose the chart that answers your question, keep it simple and say what it shows in a sentence underneath.

## Key Vocabulary

| Term | Definition |
|---|---|
| **Data cleaning** | Finding and fixing problems in a dataset before analysing it. |
| **Missing value (`NaN`)** | An empty cell, meaning that no value was recorded. |
| **Duplicate** | A record that appears more than once. |
| **Data type** | The kind of value in a column, such as number, text or date. |
| **`to_numeric()`** | A function that converts a column to numbers. |
| **Median** | The middle value when the numbers are put in order. |
| **`groupby`** | A method that splits the rows into groups so each can be summarised. |
| **Aggregate** | To combine many values into one, such as a mean or a count. |
| **Matplotlib** | The standard Python library for drawing charts. |
| **Legend** | The key that says which colour or line shows which series. |

## Code Example: Cleaning the Student Survey

```python
# survey_cleaning.py
# Clean a messy dataset, summarise it and draw a chart

import io
import pandas as pd
import matplotlib.pyplot as plt

raw_csv = """student,grade,study_hours,sleep_hours
 Nova ,8,2.5,7.5
Orion,9,,6.0
lyra,8,3.0,8.0
Orion,9,,6.0
Kai,9,4.5,five
Mia,8,1.5,7.0
ELI,9,3.5,6.5
Zoe,8,2.0,
"""

df = pd.read_csv(io.StringIO(raw_csv))
print("Rows and columns:", df.shape)
print("Missing values per column:")
print(df.isna().sum())
print("Duplicate rows:", df.duplicated().sum())

# 1. Tidy the text, remove the duplicate, fix the types
df["student"] = df["student"].str.strip().str.title()
df = df.drop_duplicates()
df["sleep_hours"] = pd.to_numeric(df["sleep_hours"], errors="coerce")

# 2. Fill the gaps with the median of each column
df["study_hours"] = df["study_hours"].fillna(df["study_hours"].median())
df["sleep_hours"] = df["sleep_hours"].fillna(df["sleep_hours"].median())

print("\nAfter cleaning:", df.shape, "| missing:", int(df.isna().sum().sum()))
print(df)

# 3. Summaries
print("\nMean study time:", round(df["study_hours"].mean(), 2), "| median:", df["study_hours"].median())
print(df.groupby("grade")["study_hours"].mean().round(2))

# 4. A chart: average study time by grade
averages = df.groupby("grade")["study_hours"].mean()
plt.bar(averages.index.astype(str), averages.values, label="Average study hours")
plt.title("Study time by grade")
plt.xlabel("Grade")
plt.ylabel("Hours per day")
plt.legend()
plt.savefig("study_by_grade.png")
print("\nChart saved as study_by_grade.png")
plt.show()
```

Expected output:

```text
Rows and columns: (8, 4)
Missing values per column:
student        0
grade          0
study_hours    2
sleep_hours    1
dtype: int64
Duplicate rows: 1

After cleaning: (7, 4) | missing: 0
  student  grade  study_hours  sleep_hours
0    Nova      8         2.50          7.5
1   Orion      9         2.75          6.0
2    Lyra      8         3.00          8.0
4     Kai      9         4.50          7.0
5     Mia      8         1.50          7.0
6     Eli      9         3.50          6.5
7     Zoe      8         2.00          7.0

Mean study time: 2.82 | median: 2.75
grade
8    2.25
9    3.58
Name: study_hours, dtype: float64

Chart saved as study_by_grade.png
```

The raw data had a missing value in two columns, a duplicate row (Orion), a text value (`five`) in a numeric column and untidy names. Every problem was found *before* anything was changed. In a notebook the chart would appear right below the code, and `plt.savefig()` is optional there.

## Instructor-Guided Coding Walkthrough

1. Show the raw data in a spreadsheet and ask students what is wrong with it before any code is run. List their answers on the board and match them with the problems above.
2. Run `isna().sum()`, `duplicated().sum()` and `dtypes` to find the same problems with code. Discuss why the column with `five` is not numeric.
3. Clean one problem at a time, printing the DataFrame after each step. Ask for a choice: should we drop or fill the missing study times, and why?
4. Compare the mean and the median of a column that has one extreme value. Ask which one is a fairer description of a typical student.
5. Build the `groupby` line by reading it aloud, then change the group column and re-run.
6. Create the chart and then take away the title and the labels. Ask what is lost, and put them back.

Discussion questions:

- When is it better to drop a row with missing data, and when is it better to fill it?
- Why must you never overwrite the original data file?
- What could go wrong if you fill many gaps with the same number?

## Student Mission / Guided Challenge

**Explorer Challenge: Data Insights Dashboard**

Build a notebook that cleans a dataset, calculates useful summaries and presents the findings in charts.

1. Choose a dataset with some problems in it: the exoplanet dataset from the last lesson (which has missing values), or a CSV approved by your teacher. Load it and write a Markdown **data report** that lists every problem you find, with the code that found it.
2. Clean the data in a new DataFrame (keep the original). Handle missing values (drop some rows, fill others and leave one column alone), remove duplicates, and fix at least one data type or text problem. Add a Markdown note for each decision.
3. Show `shape`, `isna().sum()` and `dtypes` before and after cleaning, in a before and after comparison.
4. Calculate at least four summaries, such as mean, median, minimum, maximum and a `value_counts()`, and use `groupby` at least twice.
5. Create at least **three charts**: a line chart, a bar chart and a scatter plot. Every chart needs a title, labelled axes with units and a legend where it helps.
6. Under each chart, write one sentence that says what it shows.
7. Add a **Key insights** section with three to five findings and one limit of the data (for example, how many values you had to fill).
8. Arrange the notebook as a short dashboard report with headings, and pass *Restart and run all*.

**Bonus objective:** Draw two lines on one chart with a legend, and explain what you see.

## Common Mistakes

- Cleaning the data without looking at it first.
- Dropping every row that has a missing value, and ending up with very little data.
- Filling missing values and not telling the reader.
- Forgetting that `drop_duplicates()` and `fillna()` return a new DataFrame, so the result must be stored.
- Making a chart with no title, no axis labels and no units.
- Choosing the wrong chart, such as a line chart for categories that have no order.

## Lesson Recap

Messy data is normal, and cleaning it is a core skill. You found missing values, duplicates, wrong types and untidy text, then decided how to handle each one and recorded why. You summarised clean data with the mean, median, minimum, maximum and `value_counts()`, split it into groups with `groupby`, and drew line, bar and scatter charts with titles, labels and legends. A chart is only as honest as the data behind it, and you now know how to look after that data.

## Homework / Extension Mission

**Solo Mission: The Messy Data Detective**

Create `messy_data_detective.ipynb` that investigates a deliberately messy dataset that you create. Your notebook must:

1. Write a CSV text of at least 20 rows, with at least five different problems: missing values, a duplicate row, a number stored as text, inconsistent capital letters or spaces and one impossible value (such as a negative age).
2. Load it with `io.StringIO` and `read_csv()`, and detect every problem with code.
3. Clean it step by step in a new DataFrame, adding a Markdown note for every decision.
4. Create a **before and after table** showing how many rows, missing values and duplicates there were before and after.
5. Calculate three summaries and one `groupby` result on the clean data.
6. Draw two different charts with titles, labels and, where it helps, a legend, with one sentence of explanation each.
7. Finish with a paragraph that says how much you trust your result and why.

## Portfolio Connection

Cleaning, summarising and charting are the three steps of your **Student Life Data Explorer** capstone in Lesson 8. The habits from today, noting every decision, keeping the original data and labelling every chart, are what make a data project trustworthy. In the Data Scientist program, you will go much further with analysis and visualisation; today you built the foundation.
