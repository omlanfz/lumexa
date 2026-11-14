# Lumexa Mission Log: Python Tools & Data Foundations

**Course/Path:** Python Tools & Data Foundations
**Lesson:** 03 of 08
**Title:** Introduction to Jupyter Notebooks
**Duration:** 60 minutes
**Difficulty:** Beginner
**Technology:** Python 3, Jupyter Notebook, Google Colab

---

## Mission Brief

Scientists on a space mission do not just run a program and walk away. They keep a **logbook**: they try something, look at the result, write down what it means, then try the next thing. A normal `.py` file is great for finished programs, but it is awkward for this kind of exploring. Python has a tool built for it: the **Jupyter Notebook**, a single document that mixes live code, its results and your own explanations. Data scientists, researchers and students use notebooks every day, and all of the Lumexa project notebooks you open from your lessons are Jupyter notebooks. Today you will learn how a notebook works, why the order you run cells in matters, and how to write a notebook that someone else can read and re-run.

## Learning Objectives

1. Explain what a Jupyter Notebook is and when to use one instead of a script.
2. Work with code cells and Markdown cells.
3. Run and re-run cells, and explain execution order and kernel state.
4. Display results and experiment with code in small steps.
5. Organise exploratory work with headings and short explanations.
6. Write a readable notebook that runs correctly from top to bottom.

## Prerequisites

- Lesson 1: you can work in a project folder and run Python from an editor.
- Course 1: you are comfortable with variables, lists and loops.

## Concept Explanation

### What are Jupyter Notebooks?

A **notebook** is a document made of **cells**, which are boxes you can fill with code or with text. You run a code cell and the result appears directly **underneath** it, and everything is saved together in one file with the extension `.ipynb`. You can open notebooks in:

- **Google Colab**, a free online service that needs no installation (the Lumexa project links open here).
- **Jupyter** (Notebook or JupyterLab) running on your own computer.
- **VS Code**, which can open and run `.ipynb` files.

All of them work in the same way.

### Notebooks and scripts

| | Script (`.py`) | Notebook (`.ipynb`) |
|---|---|---|
| Best for | A finished program that runs start to finish | Exploring, experimenting and explaining |
| Runs | All at once, from top to bottom | One cell at a time, in any order you choose |
| Output | In the terminal | Under the cell that made it, including charts |
| Explanations | Comments only | Headings, formatted text and pictures |

Neither is better. Many projects use both: explore in a notebook, then move the code that works into a script.

### Code cells and Markdown cells

There are two kinds of cell:

- A **code cell** contains Python. Run it with **Shift + Enter** (or the play button); the output appears below it.
- A **Markdown cell** contains formatted text. It is not run; it is *rendered* to look like a document. Markdown is a simple way of writing headings, lists and emphasis:

```text
# A big heading
## A smaller heading
**bold** and *italic*
- a bullet point
1. a numbered item
`code` inside a sentence
```

Choose the kind of cell with the drop-down menu (or the *+ Code* and *+ Text* buttons in Colab). Use Markdown cells to explain **what** you are about to do and **what you found**.

### Running and re-running cells

You can run a cell as many times as you like. The last line of a code cell is displayed automatically, so you often do not need `print()`:

```python
distance_km = 384400
distance_km * 2
```

If you change a cell, you must run it again for the change to take effect. Nothing updates by itself.

### Execution order and kernel state

This is the most important idea in the lesson. Behind every notebook is a **kernel**, the running Python process that remembers all the variables you have created. The kernel remembers them *in the order you ran the cells*, **not** in the order the cells appear on the page.

Imagine two cells:

```python
# Cell A
score = 10
```

```python
# Cell B
score = score * 2
print(score)
```

Run A, then B: you see `20`. Run B a second time: you see `40`, because the kernel still remembers the old value. Run B *before* A in a fresh notebook: `NameError`. The page looks the same each time, but the results differ. Each cell shows a small number such as `[3]` that tells you the order in which it was run.

Two remedies keep you safe:

1. **Restart and run all** (in Jupyter: *Kernel, Restart and Run All*; in Colab: *Runtime, Restart session and run all*). It wipes the kernel's memory and runs every cell from top to bottom. If the notebook still works, it is trustworthy.
2. Write your notebook so that each cell depends only on cells **above** it.

### Displaying results and experimenting

Notebooks make it easy to experiment in tiny steps: make a list, look at it; slice it, look at it; change one number, look again. Use small cells, so that when something goes wrong you know exactly which step it was. Charts and tables, which you will create in later lessons, also appear right under the cell that created them.

### Organising exploratory programming work

Treat a notebook like a lab report:

1. A **title** and one sentence about the goal at the top.
2. A **setup** cell with all the imports.
3. **Sections** with headings: *Load*, *Explore*, *Clean*, *Chart*, *Conclusions*.
4. A short Markdown note before each step, saying what it does and why.
5. A final **conclusions** cell that says what you found.

### Writing readable notebook-based programs

A notebook that only you can understand is not finished. Keep each cell short and focused on one idea, use clear variable names, delete cells that you no longer need, and finish by running *Restart and run all*. Remember that anyone who opens a notebook sees your thinking, so make it a pleasure to read.

## Key Vocabulary

| Term | Definition |
|---|---|
| **Jupyter Notebook** | A document that mixes code, results and text, saved as an `.ipynb` file. |
| **Cell** | One box in a notebook that holds code or text. |
| **Code cell** | A cell that contains Python code you can run. |
| **Markdown cell** | A cell with formatted text that is not run. |
| **Kernel** | The running Python process that remembers the notebook's variables. |
| **Execution order** | The order in which cells were actually run. |
| **Restart and run all** | Clearing the kernel's memory and running every cell from the top. |
| **Output** | The result shown under a cell after it runs. |
| **Google Colab** | A free online service for running notebooks in a web browser. |
| **Markdown** | A simple way of writing headings, lists and emphasis in plain text. |

## Code Example: Mission Logbook (as a script)

A notebook cannot be pasted into a lesson page, but a Python file can show the same structure. Lines that begin with `# %%` mark where each cell starts, and many editors (VS Code included) can run such a file cell by cell.

```python
# solar_logbook.py
# Each "# %%" line marks a notebook-style cell.

# %% [markdown]
# # Mission Logbook: Solar System Explorer
# Distances of some planets from the Sun, in astronomical units (AU).

# %% Setup
planets = {"Mercury": 0.39, "Venus": 0.72, "Earth": 1.00, "Mars": 1.52, "Jupiter": 5.20}
AU_IN_MILLION_KM = 149.6

# %% Explore: a table of distances
for name, au in planets.items():
    print(f"{name:8} {au:5.2f} AU = {au * AU_IN_MILLION_KM:7.1f} million km")

# %% Explore: which planet is farthest?
farthest_name = ""
farthest_au = 0
for name, au in planets.items():
    if au > farthest_au:
        farthest_name, farthest_au = name, au
print("Farthest planet in this list:", farthest_name)

# %% Conclusions
# In a real notebook this would be a Markdown cell that explains what we found.
print("Light takes about", round(farthest_au * 499 / 60, 1), "minutes to reach", farthest_name)
```

Expected output:

```text
Mercury   0.39 AU =    58.3 million km
Venus     0.72 AU =   107.7 million km
Earth     1.00 AU =   149.6 million km
Mars      1.52 AU =   227.4 million km
Jupiter   5.20 AU =   777.9 million km
Farthest planet in this list: Jupiter
Light takes about 43.2 minutes to reach Jupiter
```

In a notebook, the table and the last sentence would appear *under* their own cells, and the notes would be formatted Markdown. Light needs about 499 seconds to travel one AU, which the last cell converts to minutes.

## Instructor-Guided Coding Walkthrough

1. Open a new notebook (Colab or Jupyter) on the shared screen. Add a Markdown cell with a title and a short description, and a code cell with `print("Hello, notebook!")`. Run both with Shift + Enter.
2. Show that the last expression of a cell is displayed automatically, and that `print()` is only needed for extra output.
3. Run the out-of-order experiment: create `score = 10` in one cell and `score = score * 2` in another. Run the second one three times and ask why the result keeps changing.
4. Run a cell that uses a variable defined in a cell *below* it before running that one. Read the `NameError` and look at the execution numbers.
5. Use *Restart and run all* and show the numbers resetting to 1, 2, 3, 4 in page order.
6. Restructure a messy notebook together: add headings, split one big cell into three small ones and add notes.

Discussion questions:

- Why can a notebook give a different answer from the same code, depending on how it was run?
- When would you prefer a script to a notebook?
- What makes a notebook pleasant for another person to read?

## Student Mission / Guided Challenge

**Explorer Challenge: Interactive Python Exploration Notebook**

Create a notebook called `exploration.ipynb` in Google Colab (or Jupyter) that explores a topic you like.

1. Start with a Markdown title cell (a heading), a one-sentence goal and a short bullet list of what you will explore.
2. Add a **Setup** section with a code cell for any variables and imports you need.
3. Add at least **three exploration sections**, each with a heading, a Markdown note, and one or more small code cells. For example: planet distances and travel times; a list of your favourite songs with their lengths and a total; a string experiment with a message and its methods.
4. In one section, use a loop to build a small table of results, and in another, display a list or dictionary by putting its name on the last line of a cell.
5. Create an **out-of-order bug** on purpose (run a cell twice so that a number grows), explain it in a Markdown cell, then fix the notebook so that it does not depend on that.
6. Add a **Conclusions** section that says what you learned and answers one question using your results.
7. Choose *Restart and run all* (or the Colab equivalent) and check that every cell runs from top to bottom without an error.
8. Save the notebook (in Colab, to Google Drive) and download a copy as an `.ipynb` file.

**Bonus objective:** Add a table in Markdown that summarises your findings and a Markdown cell with a clickable link to a source you used.

## Common Mistakes

- Running cells out of order and trusting the result.
- Forgetting to re-run a cell after changing it.
- Putting everything in one enormous cell, so no one can follow it.
- Not writing any Markdown, so the notebook is just unexplained code.
- Leaving old experiments in the notebook that break when it is run from the top.
- Never using *Restart and run all* before sharing.

## Lesson Recap

A Jupyter Notebook is a living document of code cells, results and Markdown explanations, ideal for exploring and sharing ideas. You learned to run and re-run cells, to read the execution numbers, and to understand that the kernel remembers what *you ran*, not what you see on the page. You organised a notebook like a lab report and learned the golden rule: if *Restart and run all* works, the notebook can be trusted. Notebooks will be your main tool for working with data in the next lessons.

## Homework / Extension Mission

**Solo Mission: Space Facts Notebook**

Create a notebook called `space_facts.ipynb` that works as a short, readable report. Your notebook must:

1. Have a title, an introduction and a table of contents made of Markdown headings.
2. Store at least five space objects (planets, moons or spacecraft) in a list of dictionaries, with at least three facts about each.
3. Use loops and f-strings to print a formatted table and to calculate at least two new values for each object (for example, how long light takes to reach it, or a weight on its surface).
4. Use at least six code cells and six Markdown cells, each code cell short enough to be explained in one sentence.
5. Include one section that uses `random` with a seed to quiz the reader on a fact.
6. End with a **Conclusions** cell that interprets at least two of your results in sentences.
7. Pass the *Restart and run all* test, and describe in a final Markdown cell what you checked.

## Portfolio Connection

Today you finish the **Student Life Data Explorer** (Part 2): the same exploration, told as a clear notebook-style report with a title, questions, a description of the data, results and conclusions. Every remaining lesson of this course happens in notebooks, and so do your other portfolio projects: the **Dataset Explorer** (Lessons 4 and 5) loads and examines a real dataset, and the **Live Data Explorer** (Lessons 6 and 7) works with live data. The habit of explaining each step is what makes these projects stand out in your portfolio.
