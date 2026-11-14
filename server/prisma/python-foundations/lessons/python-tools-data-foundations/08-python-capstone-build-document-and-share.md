# Lumexa Mission Log: Python Tools & Data Foundations

**Course/Path:** Python Tools & Data Foundations
**Lesson:** 08 of 08
**Title:** Python Capstone: Build, Document & Share
**Duration:** 60 minutes
**Difficulty:** Beginner
**Technology:** Python 3, Pandas, Matplotlib, Git, Jupyter Notebook

---

## Mission Brief

Every space mission ends with two things: a successful landing and a **debrief**. In the debrief, the crew explains what they did, what they found and how someone else could repeat it. A project that nobody can understand, run or find is only half finished. Today is the final lesson of the Python Foundations program, and it is all about finishing well. You will plan an independent project, structure it, combine everything you have learned (functions, collections, modules, libraries and data), test it, write a README that explains it and record its history with Git. Then you will upgrade the **Student Life Data Explorer** you began in Lessons 2 and 3 into your capstone.

## Learning Objectives

1. Plan an independent project and write down its requirements.
2. Organise a project's structure.
3. Combine functions, collections, modules and libraries in one application.
4. Process and present information from a dataset.
5. Debug and test a complete application.
6. Write a README and save your project's history with Git, and explain how to share a project safely.

## Prerequisites

- Everything so far in this course: workspace, libraries, notebooks, NumPy, Pandas, charts and APIs.
- Course 2: planning, functions, testing, error handling and files.

## Concept Explanation

### Planning an independent project

Good projects start on paper. Before you write any code, answer five questions:

1. **What problem** does it solve, or what question does it answer?
2. **Who** is it for?
3. **What goes in** (data, user input) and **what comes out** (report, chart, file)?
4. **What is the smallest version** that would already be useful? (Build that first.)
5. **What could go wrong?** (missing data, bad input, no network)

You already know the method: it is the computational thinking from Course 2, applied to a whole project.

### Identifying project requirements

A **requirement** is a clear statement of something the project must do. Write them as short sentences you can *tick off*:

```text
Must:   load the survey CSV and report how many students answered
Must:   clean missing values and duplicates and say what was changed
Must:   show at least three charts with titles and labels
Should: let the user choose a grade to look at
Could:  save the charts as image files
```

**Must** items are the core; **Should** and **Could** items are extras for when the core works. Requirements become your checklist and, later, your tests.

### Organising project structure

Use the layout from Lesson 1: `src/` for code, `data/` for datasets, `notebooks/` for exploring, `docs/` for notes and charts, plus a `README.md`, a `requirements.txt` and a `.gitignore`. Inside the code, keep each file focused: one module for loading and cleaning data, one for calculations, one for charts.

### Combining functions, collections, modules and libraries

A complete project is built from small, tested pieces:

```python
def load_data(path): ...          # reads the CSV into a DataFrame
def clean_data(df): ...           # returns a clean copy
def summarise(df): ...            # returns a dictionary of results
def make_charts(df): ...          # draws and saves the charts
def main(): ...                   # calls the steps in order
```

Each function takes what it needs as parameters and returns its result, which is exactly the style you practised in Course 2.

### Working with external or locally stored datasets

Your data can come from a file you store in `data/` (best for a capstone, because it never changes), from a website, or from an API. When you collect data about people, such as a class survey, follow these rules: **ask for permission, keep it anonymous** (use numbers instead of names) and never publish anything personal.

### Processing and presenting information

Presenting means turning numbers into understanding: clear tables, charts with titles and labels, and sentences that say what they mean. Always state the **limits** of your data, such as how many rows were used, how many values were filled in and how small the sample is.

### Debugging and testing the complete application

Run your whole project from a clean start. Test with **normal**, **edge** and **invalid** inputs. Add `assert` checks for important functions, for example that `clean_data()` leaves no missing values. When something fails, follow the debugging routine: reproduce, read the message, isolate, hypothesise, change one thing and retest.

### Writing a project README

The **README** is the front door of your project. A good one answers a visitor's questions in about a page:

```markdown
# Student Life Data Explorer

One sentence: what it does and why.

## What it shows
A short description, with a picture of one chart.

## How to run it
1. Install the libraries: `python -m pip install -r requirements.txt`
2. Run: `python src/main.py`

## The data
Where it came from, how many rows, and what each column means.

## What I learned
Three things, and one limit of the project.
```

### Saving project history with Git

Make a commit every time something works, with a message that says what changed. A project history that reads *"Add data loading"*, *"Clean missing values"*, *"Add study-time chart"*, *"Write README"* tells the story of how it was built. Aim for small, frequent commits, and never commit private data or keys.

### Sharing a project

When you are ready to share, GitHub is a popular place to publish a repository, and a README makes it welcoming. Share **where it is age-appropriate**: GitHub requires users to be at least 13 years old, and you should always ask a parent or guardian before you create an account or publish anything online. Check that the repository contains no passwords, keys or personal information, and consider sharing a notebook link or a PDF export with your teacher instead. A short **demo** is also a great way to share: explain the problem, show the result and say what you would do next.

## Key Vocabulary

| Term | Definition |
|---|---|
| **Requirement** | A clear statement of something the project must do. |
| **Capstone** | A final project that combines everything learned in a course. |
| **Project structure** | The way files and folders are organised. |
| **README** | The file that explains what a project is and how to run it. |
| **Dataset** | A collection of data, such as the rows of a CSV file. |
| **Anonymous data** | Data that does not identify any person. |
| **Test** | A check that proves that part of a program works. |
| **Commit message** | The short sentence that describes a change saved in Git. |
| **Repository** | A project folder together with its Git history. |
| **Demo** | A short presentation that shows what a project does. |

## Code Example: Student Life Summary

```python
# student_life_summary.py
# The core of the capstone: load, clean and summarise, one function per step

import io
import pandas as pd

SURVEY_CSV = """student_id,grade,study_hours,sleep_hours,screen_hours,exam_score
S01,8,2.5,7.5,3.0,78
S02,9,3.0,6.0,5.5,71
S03,8,3.5,8.0,2.0,88
S04,9,,6.5,4.0,74
S05,8,1.5,7.0,4.5,65
S06,9,4.0,7.5,3.5,90
S06,9,4.0,7.5,3.5,90
S07,8,2.0,,5.0,69
S08,9,3.5,8.0,2.5,85
"""

def load_data(text):
    """Read the survey data into a DataFrame."""
    return pd.read_csv(io.StringIO(text))

def clean_data(df):
    """Return a clean copy: no duplicate rows and no missing values."""
    clean = df.drop_duplicates().copy()
    for column in ["study_hours", "sleep_hours"]:
        clean[column] = clean[column].fillna(clean[column].median())
    return clean

def summarise(df):
    """Return the main results as a dictionary."""
    well_rested = df["sleep_hours"] >= 7
    return {
        "students": len(df),
        "average_score": round(df["exam_score"].mean(), 1),
        "best_student": df.loc[df["exam_score"].idxmax(), "student_id"],
        "score_by_grade": df.groupby("grade")["exam_score"].mean().round(1).to_dict(),
        "score_well_rested": round(df[well_rested]["exam_score"].mean(), 1),
        "score_less_rested": round(df[~well_rested]["exam_score"].mean(), 1),
    }

def main():
    raw = load_data(SURVEY_CSV)
    clean = clean_data(raw)
    assert clean.isna().sum().sum() == 0, "clean_data left missing values"
    assert not clean.duplicated().any(), "clean_data left duplicates"
    print(f"Rows: {len(raw)} raw, {len(clean)} after cleaning")
    results = summarise(clean)
    for name, value in results.items():
        print(f"{name}: {value}")

if __name__ == "__main__":
    main()
```

Expected output:

```text
Rows: 9 raw, 8 after cleaning
students: 8
average_score: 77.5
best_student: S06
score_by_grade: {8: 75.0, 9: 80.0}
score_well_rested: 79.2
score_less_rested: 72.5
```

The program is organised like a real project: one small function per job, two `assert` checks as tests, and a `main()` that tells the story from start to finish. (The question *"do well-rested students score better?"* can only be answered cautiously: this is a tiny sample, and the data shows a **relationship**, not a proof of cause. Saying so is part of presenting honestly.)

## Instructor-Guided Coding Walkthrough

1. Ask the class to pitch a project idea in one sentence, then write the five planning questions on the board and answer them for one of the ideas.
2. Turn that idea into five or six requirements and sort them into Must, Should and Could.
3. Sketch the folder structure and the list of functions on the board. Ask where each requirement will be handled.
4. Build the first thin slice live: `load_data()` and a `print` of the shape. Commit it with a clear message.
5. Add `clean_data()` with its `assert` tests. Ask students what the tests prove and what they do not.
6. Open a README template together. Ask a student who has not seen the project to say, from the README alone, how they would run it.

Discussion questions:

- Why is it a good idea to build the smallest useful version first?
- What makes a README helpful to somebody who has never met the author?
- How can you tell whether a conclusion from a small dataset can be trusted?

## Student Mission / Guided Challenge

**Capstone Recap: The Student Life Data Explorer, Upgraded**

Upgrade your Student Life Data Explorer from Lessons 2 and 3 into an independent Python application that loads a dataset about student life, processes and summarises it with Pandas and presents meaningful findings through visualisations. This lesson recaps all three projects of the course, and their ready-to-run Google Colab versions are linked in the Project section below this lesson.

1. **Plan.** Write the problem, the audience, the inputs and outputs, and at least **three questions** the project will answer (for example: *Does more sleep go with higher scores? Do older students study more? How does screen time vary?*).
2. **Requirements.** Write at least eight requirements sorted into Must, Should and Could.
3. **Structure.** Set up the project with `src/`, `data/`, `notebooks/`, `docs/`, a `README.md` and a `.gitignore`, and make your first commit.
4. **Data.** Use the dataset in the project notebook (it is synthetic practice data), or create your own **anonymous** class survey with your teacher's permission.
5. **Build** functions for loading, cleaning, summarising and charting. Clean at least one missing-value problem and one duplicate or type problem, and report what you changed.
6. **Process** the data: calculate at least five summaries, including a `groupby`, and answer each of your questions.
7. **Present** with at least **three charts** (a bar, a scatter and a line or histogram-style chart of your choice) with titles, labels and legends where they help. Add one sentence under each.
8. **Test** with at least three `assert` checks, and run the project from a clean start (*Restart and run all* for the notebook).
9. **Document** with a README that has a title, a description, how to run it, the data description and what you learned, including one limit of the data.
10. **Save the history:** make at least five commits with meaningful messages.

**Bonus objective:** Add a command-line or notebook option that lets the user choose a grade and shows only that grade's results.

## Common Mistakes

- Starting to code before the question and the requirements are clear.
- Building every feature at once instead of finishing a small working version first.
- Cleaning data without saying what was changed.
- Presenting a chart with no title, labels or explanation.
- Claiming that one thing *causes* another because two numbers move together.
- Committing everything in one giant commit, or committing private data and keys.

## Lesson Recap

You turned everything from this program into one finished project. You planned it with questions and requirements, organised its structure, combined functions, collections, modules and libraries, processed a dataset with Pandas and presented findings through charts. You tested the application, documented it with a README and recorded its history with Git, and you learned how to share it safely and only where it is age-appropriate. This is the full workflow of a real Python developer, and you can now explain, run and share your own work.

## Homework / Extension Mission

**Solo Mission: Ready to Share**

Polish your capstone so that another person could run it and understand it without you in the room. Your submission must include:

1. A final **README** with the title, a description, a screenshot or chart, installation and run instructions, the dataset description and a *What I learned* section.
2. A `requirements.txt` that lists every library the project needs, tested by creating a fresh virtual environment and installing from it.
3. A Git history with at least **eight** clear commits, and the output of `git log --oneline`.
4. A **privacy and safety check**: a short list that confirms no names, keys or passwords are in the project, and says where the data came from.
5. A **two-minute demo script** (what problem, what you built, what you found and what you would do next) that you can read aloud or record.
6. A short **reflection** (one paragraph) on the hardest part of the project and what you would do differently.
7. If a parent or guardian agrees and you are 13 or older, a plan for publishing the repository on GitHub. Otherwise, a plan to share a PDF or a notebook link with your teacher.

## Portfolio Connection

Today recaps the three portfolio projects of Course 3: the **Student Life Data Explorer**, the **Dataset Explorer** and the **Live Data Explorer**. You built each of them in two parts, and today you plan, document and share them like a real project, with a README, a clean structure, a `requirements.txt` and a Git history. The nine-project portfolio of Python Foundations is now complete: the **Smart Calculator**, the **Number Guessing Game** and the **Python Quiz Master**, then the **Text-Based Adventure Game**, the **Library Management System** and the **Personal Expense Tracker**, and finally these three data projects. Together they show a path from your first `print()` to a documented, tested data project. With these foundations you are ready for the next adventure: the AI Builder program, the Data Scientist program and beyond.
