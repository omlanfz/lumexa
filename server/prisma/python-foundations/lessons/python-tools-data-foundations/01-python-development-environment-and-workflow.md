# Lumexa Mission Log: Python Tools & Data Foundations

**Course/Path:** Python Tools & Data Foundations
**Lesson:** 01 of 08
**Title:** Python Development Environment & Workflow
**Duration:** 60 minutes
**Difficulty:** Beginner
**Technology:** Python 3, Visual Studio Code, Git

---

## Mission Brief

Welcome to the launch pad, Cadet. In the first two courses you learned what to write. Now you learn *where* and *how* professionals write it. A real space programme does not keep its software in a single loose file: it has a workspace with a clear structure, tools that help find mistakes, a way to run the code from different places, and a complete history of every change ever made. Today you will set up your own professional-style Python workspace, learn how a project is organised, run scripts from an editor and from the terminal, and take your first steps with Git, the tool that records the history of a project.

## Learning Objectives

1. Explain how a Python project is organised into files and folders.
2. Describe what the Python interpreter is and how an editor chooses which one to use.
3. Find your way around Visual Studio Code and run a script from the editor and from the terminal.
4. Work with directories and file paths, and organise project files sensibly.
5. Explain what version control and Git are for, and make a first commit.
6. Explain what GitHub is, and what a repository is.

## Prerequisites

- Course 2: you can write a program with functions, files and classes.
- A computer with Python 3 installed, and permission from a parent or guardian to install the free tools used in this lesson. Your teacher will help with setup in class.

## Concept Explanation

### How Python projects are organised

A single `.py` file is fine for a small experiment. A real **project** is a folder that holds everything the program needs. A tidy layout makes a project easy to understand for you next month and for anyone else who opens it:

```text
personal_workspace/
├── README.md          what the project is and how to run it
├── .gitignore         files Git should not record
├── src/               the Python code
│   └── main.py
├── data/              input files such as CSV and JSON
├── notebooks/         Jupyter notebooks (Lesson 3)
└── docs/              notes, diagrams, screenshots
```

Give files and folders short, lowercase names without spaces (`data_cleaning.py`, not `Data Cleaning FINAL (2).py`). Keep **one** place for each kind of thing.

### The Python interpreter

You met the **interpreter** in Course 1: the program that reads your code and runs it. A computer can have several versions of Python installed. When an editor runs your file, it must choose one interpreter. Knowing *which one* matters, because libraries you add later are installed for a particular interpreter. You can ask any interpreter for its version:

```text
python --version
```

On some computers the command is `python3` instead of `python`. Your teacher will tell you which one to use.

### A development environment: Visual Studio Code

An **editor** is a program for writing code; an **IDE** (integrated development environment) adds tools for running and debugging it. **Visual Studio Code**, usually called **VS Code**, is a free editor that millions of developers use. Its main areas are:

| Area | What it is for |
|---|---|
| **Explorer** (left) | Shows the folders and files of your project |
| **Editor** (centre) | Where you write the code, with colours and suggestions |
| **Terminal** (bottom) | A text window for typing commands |
| **Status bar** (bottom edge) | Shows which Python interpreter is selected |
| **Run button** (top right) | Runs the file that is open |

Open a **folder** (not just a file) with *File, Open Folder*, so that VS Code understands the whole project. Install the Microsoft **Python extension**, then choose your interpreter from the Command Palette (`Ctrl + Shift + P`, or `Cmd + Shift + P` on a Mac) with *Python: Select Interpreter*.

### Running scripts from the editor and the terminal

You can run a script in two ways, and both do the same thing:

1. **From the editor:** click the **Run** button. Output appears in the terminal panel.
2. **From the terminal:** type the command yourself.

```text
python src/main.py
```

Running from the terminal teaches you what the Run button does behind the scenes, and it is how scripts are run on servers, where there is no editor.

### Working with directories and file paths

The terminal always works *inside* a folder, called the **current working directory**. A handful of commands help you move around:

| Task | Windows (Command Prompt) | macOS / Linux |
|---|---|---|
| Show the current folder | `cd` | `pwd` |
| List the files in it | `dir` | `ls` |
| Go into a folder | `cd data` | `cd data` |
| Go up one level | `cd ..` | `cd ..` |
| Make a new folder | `mkdir notes` | `mkdir notes` |

A script's **relative paths** start from the working directory, so `open("data/scores.csv")` works only when you run the program from the project's top folder. If a program says `FileNotFoundError` for a file you are sure exists, check which folder you ran it from.

### Organising project files and folders

Good habits: keep code in `src/`, data in `data/`, notes in `docs/`; never save passwords or private keys inside a project; and write a short `README.md` that says what the project does and how to run it. Python's `pathlib` module (from Course 2) can create the whole layout for you in code, as the example below shows.

### Introduction to version control and Git

Have you ever saved `report_final.docx`, `report_final2.docx` and `report_REALLY_final.docx`? **Version control** does this properly. It records the history of a project as a series of **commits**, each a snapshot of every file with a message that says what changed and why. You can look back at any snapshot, compare versions or undo a mistake.

**Git** is the most popular version-control tool. The commands you need for now are:

```text
git init                 start tracking the current folder
git status               what has changed since the last commit?
git add .                choose all changes for the next snapshot
git commit -m "Add the first version of main.py"
git log --oneline        show the history
```

Write commit messages that describe the change, as a short sentence in the present tense: *"Add vowel counter"*, not *"stuff"*. Git also reads a file called `.gitignore` that lists files it should never record, such as caches and private keys.

### The purpose of GitHub and repositories

A **repository** (or **repo**) is a project folder together with its Git history. **GitHub** is a website that stores repositories online, so you can back them up, share them and work with other people. Git works on your own computer; GitHub is the place where repositories can be shared.

Two safety rules apply from the start. First, **never put passwords, API keys or personal information in a repository.** Second, GitHub requires account holders to be at least 13 years old, and younger learners should ask a parent or guardian before they create any online account. You can use Git on your own computer without an account at all.

## Key Vocabulary

| Term | Definition |
|---|---|
| **Project** | A folder that holds all the files a program needs. |
| **Interpreter** | The program that reads Python code and runs it. |
| **Editor / IDE** | A program for writing code, with tools to run and debug it. |
| **Terminal** | A text window where you type commands. |
| **Working directory** | The folder a command or program is currently running in. |
| **Relative path** | A file path that starts from the working directory. |
| **Version control** | A system that records the history of a project's files. |
| **Git** | A popular version-control tool. |
| **Commit** | A saved snapshot of a project with a message that describes the change. |
| **Repository** | A project folder together with its history; online copies live on GitHub. |

## Code Example: Personal Workspace Builder

```python
# create_workspace.py
# Build a tidy project layout, then print its structure

from pathlib import Path

project = Path("personal_workspace")
for name in ["src", "data", "notebooks", "docs"]:
    (project / name).mkdir(parents=True, exist_ok=True)

# write_text() creates a small text file in one line
(project / "README.md").write_text("# Personal Workspace\n\nMy first organised Python project.\n")
(project / "src" / "main.py").write_text('print("Hello from my workspace!")\n')
(project / ".gitignore").write_text("__pycache__/\n.venv/\n*.pyc\n")

entries = []
for item in project.rglob("*"):
    path_text = item.relative_to(project).as_posix()
    kind = "folder" if item.is_dir() else "file"
    entries.append((path_text, kind, item.name))

print("Project:", project.name)
for path_text, kind, name in sorted(entries):
    depth = path_text.count("/")
    print(f"{'  ' * depth}{kind:6} {name}")
```

Expected output:

```text
Project: personal_workspace
file   .gitignore
file   README.md
folder data
folder docs
folder notebooks
folder src
  file   main.py
```

Run it from any folder: it creates `personal_workspace` there. The program does in a second what would take several clicks, and the result is a layout that every later project in this course can start from.

## Instructor-Guided Coding Walkthrough

1. Show a messy folder (files with names such as `final2.py`, data and code mixed together) and ask students what they would find difficult. Then show the tidy `personal_workspace` layout.
2. Open VS Code with *Open Folder*. Point out the Explorer, the editor, the terminal and the status bar, and have students find the interpreter name in the status bar.
3. Run a `print` script with the Run button, then with `python src/main.py` in the terminal. Ask what is the same and what is different.
4. Run the script from the wrong working directory so that a relative file path fails. Read the `FileNotFoundError` and fix it with `cd`.
5. Run `git init`, `git status`, `git add .` and `git commit -m "..."`. Make a change, commit again, and show `git log --oneline`.
6. Discuss safety: show a `.gitignore`, and explain why an API key must never be committed.

Discussion questions:

- Why does a well-organised project matter when you work in a team?
- What would you do if you broke your program and needed yesterday's version?
- What should never be saved in a repository that other people can see?

## Student Mission / Guided Challenge

**Explorer Challenge: Personal Python Workspace**

Create and organise a structured Python project that you will use for the rest of this course.

1. Create a folder called `python_foundations` and open it in VS Code with *Open Folder*.
2. Create the folders `src`, `data`, `notebooks` and `docs`. (You can create them by hand, or run the workspace builder above and then rename the folder.)
3. In `src/`, create `main.py` that prints your name and the date, and `tools.py` with one function of your own. Import the function in `main.py`.
4. Write a `README.md` with the project name, a one-sentence description and the command that runs the program.
5. Run `main.py` from the Run button, then run it from the terminal. Write down the command you used and which folder you were in.
6. Make `data/notes.txt`, and write a small function in `main.py` that reads it using a relative path. Run it from the right folder and then from the wrong folder to see the difference.
7. Create a `.gitignore`, run `git init`, and make **three commits** with clear messages: the first structure, the first working program and the README.
8. Run `git log --oneline` and take a screenshot of your history.

**Bonus objective:** Ask a parent or guardian whether you may create a GitHub account (you need to be at least 13), then connect your repository to it with their help.

## Common Mistakes

- Running a script from the wrong folder, so relative paths cannot find their files.
- Choosing the wrong interpreter in the editor, so a library that is installed seems to be missing.
- Naming your own file after a module, such as `random.py` or `math.py`, which hides the real one.
- Using vague commit messages such as `update` or `stuff`.
- Committing passwords, API keys or private data to a repository.
- Keeping everything in one big folder so that nothing can be found.

## Lesson Recap

You learned how professional Python work is organised. A project is a tidy folder with separate places for code, data and notes. The interpreter runs your code, VS Code is an editor that makes writing and running it comfortable, and the terminal lets you run scripts and move between folders. You learned how paths depend on the working directory, and how Git records the history of a project as commits, with GitHub as an online home for repositories. These habits turn small programs into real projects.

## Homework / Extension Mission

**Solo Mission: Workspace Check-Up**

Improve your `python_foundations` workspace and document what you did. Your submission must include:

1. A project layout with `src`, `data`, `notebooks` and `docs`, and at least three Python files in `src/` that import each other.
2. A `README.md` that includes the project name, a description, the folder layout (as a text tree), how to run it and what you learned.
3. A script `src/workspace_report.py` that uses `pathlib` to count the files in each folder and prints the report, run from the project's top folder.
4. At least **five commits** with meaningful messages, and a copy of the output of `git log --oneline`.
5. A `.gitignore` that excludes caches and a file called `secrets.txt`. Test it: create `secrets.txt` and check that `git status` does not list it.
6. A short paragraph explaining the difference between Git and GitHub in your own words.

## Portfolio Connection

A tidy workspace and a clear Git history are what turn a collection of programs into a real portfolio. In Lesson 8 you will use the workspace skills from today to plan, organise, document and share your capstone project. Everything you build in the next lessons, from your first Jupyter notebook to your **Live Data Explorer**, will live in the folders you set up today.
