# Lumexa Mission Log: Python Tools & Data Foundations

**Course/Path:** Python Tools & Data Foundations
**Lesson:** 05 of 08
**Title:** Introduction to Pandas & DataFrames
**Duration:** 60 minutes
**Difficulty:** Beginner
**Technology:** Python 3, Pandas, Jupyter Notebook

---

## Mission Brief

Astronomers have discovered thousands of planets orbiting other stars. Each discovery is a row in a giant table: the method used to find it, the year, the planet's mass, its distance. Questions such as *"How many were found each year?"* or *"Which ones are closest?"* are impossible to answer by reading a table with a thousand rows, and awkward to answer with lists and dictionaries. The library that data scientists use for this job is **Pandas**. Today you will meet its two main building blocks, the **Series** and the **DataFrame**, load a real dataset from a CSV file, and learn to inspect it, select from it, filter it and sort it. You will use these skills in your **Dataset Explorer** project.

## Learning Objectives

1. Explain what Pandas is and what it is used for.
2. Describe Series and DataFrames, and create a DataFrame.
3. Load a CSV file into a DataFrame with `read_csv()`.
4. Inspect a dataset with `head()`, `info()` and `describe()`.
5. Select columns and rows, and filter rows with conditions.
6. Sort records, and explain columns, indexes and tabular data.

## Prerequisites

- Lesson 3: you can use a notebook (Colab or Jupyter).
- Lesson 4: you understand arrays, masks and vectorized operations.
- From Course 2: you can read CSV files.

## Concept Explanation

### What is Pandas?

**Pandas** is the Python library for working with **tabular data**, meaning data arranged in rows and columns like a spreadsheet. It reads files, selects and filters data, calculates summaries and prepares data for charts and machine learning. By convention it is imported as `pd`:

```python
import pandas as pd
```

You do not have to write loops: just like NumPy, Pandas applies operations to whole columns at once. In fact, every Pandas column is built on a NumPy array.

### Series and DataFrames

A **Series** is a single column of values with a label for each value, like a NumPy array with an index:

```python
radius = pd.Series([2440, 6052, 6371], index=["Mercury", "Venus", "Earth"])
print(radius["Earth"])    # 6371
```

A **DataFrame** is a whole table: a collection of Series (columns) that share the same index (row labels). It is the object you will use most.

### Creating and understanding DataFrames

The simplest way to make a DataFrame is from a dictionary where each key is a column name and each value is a list:

```python
planets = pd.DataFrame({
    "name": ["Mercury", "Venus", "Earth"],
    "type": ["rocky", "rocky", "rocky"],
    "radius_km": [2440, 6052, 6371],
})
print(planets)
```

Every DataFrame has three parts: the **columns** (named variables, such as `radius_km`), the **rows** (one record each) and the **index** (the label of each row, `0, 1, 2…` by default). All the values in one column share one data type, but different columns can have different types.

### Loading CSV datasets

Real data usually lives in a file or on a website. `pd.read_csv()` turns a CSV into a DataFrame in one line, from a file name or a web address:

```python
df = pd.read_csv("data/planets.csv")
df = pd.read_csv("https://raw.githubusercontent.com/mwaskom/seaborn-data/master/planets.csv")
```

### Inspecting a dataset

The first thing to do with any dataset is to look at it:

| Tool | What it shows |
|---|---|
| `df.head()` | The first five rows (`df.head(10)` for ten) |
| `df.tail()` | The last five rows |
| `df.shape` | The number of rows and columns, such as `(1035, 6)` |
| `df.columns` | The column names |
| `df.info()` | For every column: its name, the number of **non-missing** values and its data type |
| `df.describe()` | A summary of the numeric columns: count, mean, minimum, maximum and more |

Compare `shape` with the counts in `info()`: a column with fewer values than the number of rows has **missing data**, which you will deal with in the next lesson.

### Selecting rows and columns

```python
df["radius_km"]                 # one column (a Series)
df[["name", "radius_km"]]       # several columns (a DataFrame): note the double brackets
df.loc[2]                       # the row with index label 2
df.iloc[0]                      # the first row by position
df.loc[0:2, ["name", "type"]]   # rows with labels 0 to 2 (included) and two columns
df.iloc[0:2, 0:2]               # rows and columns by position (end excluded)
```

Use `loc` for labels and `iloc` for positions. Row selection with `loc` includes the last label; `iloc` follows the usual Python rule and leaves the end out.

### Filtering and sorting records

A condition on a column gives a column of `True` and `False` values, which you can use to pick the matching rows, just like a mask in NumPy:

```python
df[df["radius_km"] > 6000]                              # one condition
df[(df["type"] == "rocky") & (df["radius_km"] > 6000)]  # both conditions: & means "and"
df[(df["type"] == "gas giant") | (df["radius_km"] < 3000)]   # either: | means "or"
```

Use `&`, `|` and `~` (not), **not** the words `and`, `or`, `not`, and put each condition in **brackets**. To sort:

```python
df.sort_values("radius_km")                          # smallest first
df.sort_values("radius_km", ascending=False)         # largest first
df.sort_values(["type", "radius_km"])                # by type, then radius
```

Neither filtering nor sorting changes the original DataFrame; both return a **new** one. Store it in a variable if you want to keep it.

### Columns, indexes and tabular data

Think of a DataFrame as a table where *each column is a variable* and *each row is one observation*. In the exoplanet dataset used in this lesson, every row is one discovered planet, and the columns say how, when and where. If your data is arranged this way, almost every question becomes one or two lines of Pandas. You can also use a column as the index with `df.set_index("name")`, after which `df.loc["Earth"]` finds a row by name.

## Key Vocabulary

| Term | Definition |
|---|---|
| **Pandas** | A Python library for working with tables of data. |
| **Series** | A single labelled column of values. |
| **DataFrame** | A table of rows and columns, made of Series that share an index. |
| **Index** | The labels of the rows of a Series or DataFrame. |
| **Column** | A named variable in a table, holding one type of value. |
| **`read_csv()`** | The function that loads a CSV file into a DataFrame. |
| **`head()`** | A method that shows the first rows of a DataFrame. |
| **`describe()`** | A method that summarises the numeric columns. |
| **Filtering** | Keeping only the rows that match a condition. |
| **Missing value** | An empty cell, shown in Pandas as `NaN`. |

## Code Example: Planet Data Bay

```python
# planet_data_bay.py
# Pandas: DataFrames, selecting, filtering, sorting and summarising

import pandas as pd

planets = pd.DataFrame({
    "name": ["Mercury", "Venus", "Earth", "Mars", "Jupiter", "Saturn"],
    "type": ["rocky", "rocky", "rocky", "rocky", "gas giant", "gas giant"],
    "radius_km": [2440, 6052, 6371, 3390, 69911, 58232],
    "orbit_days": [88, 225, 365, 687, 4333, 10759],
    "gravity": [3.7, 8.87, 9.81, 3.71, 24.79, 10.44],
})

print(planets)
print("Shape:", planets.shape)
print("Columns:", list(planets.columns))

# Selecting
print("Largest radius:", planets["radius_km"].max(), "km")
print("Average gravity:", round(planets["gravity"].mean(), 2))
print(planets[["name", "gravity"]].head(3))
print("Third row:", planets.iloc[2]["name"], "has gravity", planets.iloc[2]["gravity"])

# Filtering
print("\nGas giants:")
print(planets[planets["type"] == "gas giant"][["name", "radius_km"]])
print("\nRocky planets with gravity above 5:")
print(planets[(planets["type"] == "rocky") & (planets["gravity"] > 5)][["name", "gravity"]])

# Sorting
print("\nLongest years first:")
print(planets.sort_values("orbit_days", ascending=False)[["name", "orbit_days"]].head(3))

# A summary of the number columns
print("\nSummary of radius_km:")
print(planets["radius_km"].describe())
```

Expected output:

```text
      name       type  radius_km  orbit_days  gravity
0  Mercury      rocky       2440          88     3.70
1    Venus      rocky       6052         225     8.87
2    Earth      rocky       6371         365     9.81
3     Mars      rocky       3390         687     3.71
4  Jupiter  gas giant      69911        4333    24.79
5   Saturn  gas giant      58232       10759    10.44
Shape: (6, 5)
Columns: ['name', 'type', 'radius_km', 'orbit_days', 'gravity']
Largest radius: 69911 km
Average gravity: 10.22
      name  gravity
0  Mercury     3.70
1    Venus     8.87
2    Earth     9.81
Third row: Earth has gravity 9.81

Gas giants:
      name  radius_km
4  Jupiter      69911
5   Saturn      58232

Rocky planets with gravity above 5:
    name  gravity
1  Venus     8.87
2  Earth     9.81

Longest years first:
      name  orbit_days
5   Saturn       10759
4  Jupiter        4333
3     Mars         687

Summary of radius_km:
count        6.000000
mean     24399.333333
std      30987.774968
min       2440.000000
25%       4055.500000
50%       6211.500000
75%      45266.750000
max      69911.000000
Name: radius_km, dtype: float64
```

Each result above came from one line. `planets[planets["type"] == "gas giant"]` first produced a column of `True` and `False` values and then used it to keep the matching rows, exactly like a mask in NumPy.

## Instructor-Guided Coding Walkthrough

1. Ask students how they would answer "which planets have a gravity above 5?" with the list of dictionaries from Course 2. Then build the DataFrame and show the same answer in one line.
2. Load the real exoplanet CSV with `read_csv()` and ask students to say what each row and column means after looking at `head()`, `shape` and `columns`.
3. Run `info()`. Ask which columns have missing values, and how they can tell from the counts.
4. Select one column with single brackets and several with double brackets. Compare the type of each result.
5. Filter with one condition, then two. Remove the brackets around one condition and read the error to show why they matter.
6. Sort by two different columns, and ask students to describe the order in words before they run it.

Discussion questions:

- What is the difference between selecting with `loc` and with `iloc`?
- Why does a filter return a new DataFrame rather than changing the original?
- What kinds of questions are easy to answer with a DataFrame that were hard with lists?

## Student Mission / Guided Challenge

**Explorer Challenge: Dataset Explorer**

Load and investigate a real-world dataset in a notebook. This is your first portfolio project of Course 3, and a guided Google Colab version is linked in the Project section below this lesson. Use the exoplanet dataset at `https://raw.githubusercontent.com/mwaskom/seaborn-data/master/planets.csv` (or another dataset your teacher approves).

1. Write a Markdown introduction that says what the dataset is and what questions you want to ask.
2. Load it with `pd.read_csv()`, and display the first ten rows, the shape, the column names and the result of `info()` and `describe()`.
3. In a Markdown cell, explain in your own words what each column means and which columns have missing values.
4. Select a single column, then three columns, and select the rows 100 to 104 with `iloc`.
5. Filter the data to answer at least **four questions** of your own, using single conditions and combined conditions (for example: how many planets were discovered after 2010? which ones are closer than 50 parsecs and have a known mass?).
6. Sort the dataset to find the five largest orbital periods and the five closest planets, and display only the useful columns.
7. Add a short **findings** section in Markdown that answers your questions in sentences.
8. Run *Restart and run all* and fix anything that fails.

**Bonus objective:** Use `df["method"].value_counts()` to list the discovery methods and write a sentence about the most common one.

## Common Mistakes

- Using single brackets for several columns (`df["a", "b"]`) instead of a list inside the brackets (`df[["a", "b"]]`).
- Using `and` or `or` instead of `&` and `|`, or leaving out the brackets around each condition.
- Expecting `sort_values()` or a filter to change the DataFrame itself, without storing the result.
- Confusing `loc` (labels, end included) with `iloc` (positions, end excluded).
- Forgetting that the missing values in a column are not counted by `describe()`.
- Typing a column name with a different capital letter or a stray space.

## Lesson Recap

Pandas turns a table of data into one object you can question. You met the Series and the DataFrame, built one from a dictionary, and loaded a real CSV with `read_csv()`. You inspected it with `head()`, `shape`, `info()` and `describe()`, selected columns and rows with brackets, `loc` and `iloc`, filtered with conditions joined by `&` and `|`, and sorted with `sort_values()`. These are the first steps in every data investigation.

## Homework / Extension Mission

**Solo Mission: Pick Your Own Dataset**

Create a notebook `my_dataset_explorer.ipynb` that investigates a dataset you choose. Your notebook must:

1. Use a small, public CSV dataset about a topic that interests you (sport, music, weather, space, food). Check with your teacher that the source is suitable and credit it in a Markdown cell with the link.
2. Load it with `read_csv()` and show `head()`, `shape`, `columns`, `info()` and `describe()`.
3. Describe every column in a Markdown table (name, meaning, type) and say which have missing values.
4. Answer at least **six questions** with selecting, filtering and sorting, including two questions that need two conditions.
5. Use `value_counts()` on one column and describe what it shows.
6. Finish with a **findings** section of at least five sentences, and one thing about the data that surprised you.
7. Pass *Restart and run all*.

## Portfolio Connection

Your **Dataset Explorer** is the second notebook-based project of your portfolio: it shows that you can load real data and ask it questions. The same DataFrame skills appear in your **Student Life Data Explorer** capstone (Lesson 8), where you will clean, summarise and chart a dataset of your own. And when you move on to the Data Scientist or AI Builder programs, a DataFrame is the object you will hand to every chart and every model.
