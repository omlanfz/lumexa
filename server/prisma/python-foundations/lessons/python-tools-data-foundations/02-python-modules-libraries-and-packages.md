# Lumexa Mission Log: Python Tools & Data Foundations

**Course/Path:** Python Tools & Data Foundations
**Lesson:** 02 of 08
**Title:** Python Modules, Libraries & Packages
**Duration:** 60 minutes
**Difficulty:** Beginner
**Technology:** Python 3, pip, virtual environments

---

## Mission Brief

When engineers build a rover they do not manufacture every bolt, wire and camera themselves. They use parts that other people designed and tested. Programmers do the same. Python comes with a big toolbox of ready-made code, and a worldwide community has shared hundreds of thousands more tools that you can add to your project in a single command. Today you will learn how to find, import and use those tools, how to add outside libraries safely with `pip`, how to keep each project's tools separate with a virtual environment and how to record them in a `requirements.txt` file so that anyone can rebuild your setup. Then you will use several of them together in a **Multi-Tool Python Application**.

## Learning Objectives

1. Explain the difference between a module, a library and a package.
2. Import and use modules from Python's standard library.
3. Use the `math`, `random`, `datetime` and `statistics` modules.
4. Explain what third-party libraries are and add one with `pip`.
5. Explain why virtual environments exist and how they are used.
6. Record a project's dependencies in `requirements.txt`.

## Prerequisites

- Lesson 1: you can work in a project folder, in VS Code and in the terminal.
- From Course 2: you can import functions from your own module.

## Concept Explanation

### Modules, libraries and packages

These three words are closely related:

| Word | What it is | Example |
|---|---|---|
| **Module** | One Python file of reusable code | `math` |
| **Package** | A folder of modules that belong together | `pandas` |
| **Library** | A general word for a collection of reusable code (modules or packages) | the NumPy library |

In everyday talk, people use *library* for any of them. What matters is that **you do not have to write everything yourself.**

### The standard library

Python is famous for being "batteries included": it ships with a **standard library** of modules for maths, dates, files, random numbers, statistics, web addresses, compression and much more. Nothing extra needs to be installed. You can see the full list at the official Python documentation, which is an excellent place to look first when you wonder, "Is there a tool for this?"

### Importing built-in modules

There are three ways to import, and they all give you access to the module's contents:

```python
import math                     # use as math.sqrt(16)
from math import sqrt, pi       # use as sqrt(16) and pi
import statistics as stats      # a nickname: stats.mean([1, 2, 3])
```

Prefer `import module` while you are learning: the module name in front (`math.sqrt`) shows where the tool comes from. Put all imports at the **top** of the file.

### Useful standard modules

**`math`** has the mathematical tools you would find on a scientific calculator:

```python
import math
print(math.pi)                 # 3.141592653589793
print(math.sqrt(144))          # 12.0
print(math.ceil(4.2), math.floor(4.8))   # 5 4
```

**`random`** produces unpredictable choices. Calling `random.seed(n)` first makes the sequence repeat, which is useful for testing:

```python
import random
random.seed(7)                         # repeatable
print(random.randint(1, 6))            # a whole number from 1 to 6
print(random.choice(["red", "blue"]))  # one item from a list
random.shuffle(crew)                   # mix up a list in place
```

**`datetime`** works with dates and times:

```python
from datetime import date, datetime
launch = date(2030, 7, 20)
today = date.today()
print((launch - today).days)           # days until launch
print(datetime.now().strftime("%Y-%m-%d %H:%M"))
```

**`statistics`** summarises lists of numbers:

```python
import statistics
temps = [21.5, 19.0, 23.4]
print(statistics.mean(temps), statistics.median(temps))
```

### Third-party libraries

Libraries written by other people and shared on the **Python Package Index (PyPI)** are called **third-party libraries**. The ones you will meet in this course include `requests` (talking to websites), `numpy` and `pandas` (working with data) and `matplotlib` (drawing charts). They are not part of Python itself, so you have to add them to your computer.

Before you add any library, check that you trust it: look at its official page, check that the name is spelled exactly right (fake packages with similar names exist) and ask a teacher if you are not sure.

### Installing packages with `pip`

`pip` is Python's package installer. You run it in the terminal:

```text
python -m pip install requests
python -m pip list
python -m pip install --upgrade requests
```

Using `python -m pip` makes sure that the package is added for *the same interpreter* you use to run your code, which avoids a common source of confusion.

### Virtual environments

If every project shared one set of libraries, they would eventually clash: one project needs version 1 of a library and another needs version 2. A **virtual environment** solves this by giving each project its own private folder of libraries. Create one inside the project, then **activate** it:

```text
python -m venv .venv

.venv\Scripts\activate          (Windows)
source .venv/bin/activate       (macOS and Linux)
```

While it is active, your terminal prompt shows `(.venv)`, and `pip install` adds libraries to *this project only*. To leave it, type `deactivate`. Never commit the `.venv` folder to Git; it is listed in your `.gitignore`.

### Managing project dependencies and `requirements.txt`

A project's **dependencies** are the libraries it needs. List them in a text file called `requirements.txt`, one per line, usually with a version:

```text
requests==2.32.3
pandas==2.2.2
```

You can write the file by hand or ask `pip` to list what is installed:

```text
python -m pip freeze > requirements.txt
```

Anyone who receives your project can then rebuild your environment with one command:

```text
python -m pip install -r requirements.txt
```

This is why the file matters: *"it works on my computer"* becomes *"it works on every computer."*

## Key Vocabulary

| Term | Definition |
|---|---|
| **Module** | A single Python file of reusable code. |
| **Package** | A folder of related modules. |
| **Library** | A collection of reusable code that you can import. |
| **Standard library** | The modules that come with Python. |
| **Third-party library** | A library written by other people that you add yourself. |
| **PyPI** | The Python Package Index, the online store of third-party packages. |
| **`pip`** | The tool that installs Python packages. |
| **Virtual environment** | A private folder of libraries for one project. |
| **Dependency** | A library that a project needs in order to run. |
| **`requirements.txt`** | A text file that lists a project's dependencies. |

## Code Example: Multi-Tool Mission Briefing

```python
# mission_briefing.py
# Four standard-library modules working together

import math
import random
import statistics
from datetime import date

random.seed(7)     # repeatable "random" results, so everyone sees the same output

# math: circumference of the Earth from its radius
radius_km = 6371
circumference = 2 * math.pi * radius_km
print(f"Earth's circumference: {circumference:,.0f} km")
print("Square root of 144:", math.sqrt(144), "| ceil(4.2):", math.ceil(4.2), "| floor(4.8):", math.floor(4.8))

# random: pick a crew member and roll a die
crew = ["Nova", "Orion", "Lyra", "Kai"]
print("Duty officer today:", random.choice(crew))
print("Dice roll:", random.randint(1, 6))

# datetime: how long until landing?
launch = date(2030, 7, 20)
landing = date(2030, 11, 3)
print("Launch day:", launch.strftime("%A, %d %B %Y"))
print("Days in transit:", (landing - launch).days)

# statistics: summarise cabin temperatures
temps = [21.5, 19.0, 23.4, 22.1, 20.8]
print("Mean temperature:", round(statistics.mean(temps), 2))
print("Median temperature:", statistics.median(temps))
print("Range:", round(max(temps) - min(temps), 2))
```

Expected output:

```text
Earth's circumference: 40,030 km
Square root of 144: 12.0 | ceil(4.2): 5 | floor(4.8): 4
Duty officer today: Lyra
Dice roll: 2
Launch day: Saturday, 20 July 2030
Days in transit: 106
Mean temperature: 21.36
Median temperature: 21.5
Range: 4.4
```

Every line of output comes from a tool somebody else wrote. The `random.seed(7)` line fixes the sequence, so if you run the program again you get exactly the same "random" picks.

## Instructor-Guided Coding Walkthrough

1. Ask students how they would work out the square root of a number without a tool. Then show `math.sqrt()` and have them explore the other functions with `dir(math)` or the documentation.
2. Demonstrate the three import styles and ask which one makes it easiest to see where a function comes from.
3. Run the same `random` code three times, then add `random.seed(7)` and repeat. Ask why a programmer might *want* repeatable randomness.
4. Try `import requests` before it is installed and read the `ModuleNotFoundError`. Then install it with `python -m pip install requests` and run the import again.
5. Create a virtual environment, activate it and show the prompt change. Install a package, run `python -m pip list` inside and outside the environment, and compare.
6. Generate `requirements.txt` with `pip freeze`, delete the environment and rebuild it from the file.

Discussion questions:

- What are the risks of installing a library you know nothing about?
- Why does each project deserve its own virtual environment?
- Why is a `requirements.txt` file useful when someone else wants to run your code?

## Student Mission / Guided Challenge

**Explorer Challenge: Multi-Tool Python Application**

Build `multi_tool.py`, a small application that uses several standard-library modules and one external library.

1. Create and activate a virtual environment in your project folder, and install the external library `pyfiglet` (it draws large text banners) with `python -m pip install pyfiglet`. Generate a `requirements.txt` file.
2. Start the program with a banner made by `pyfiglet.figlet_format("MISSION TOOLS")`.
3. Build a menu with at least five tools, each in its own function:
   - **Calculator tool:** uses `math` for square roots, powers and rounding.
   - **Countdown tool:** asks for a date and uses `datetime` to print how many days remain.
   - **Dice and picker tool:** uses `random` to roll a die and to choose a name from a list.
   - **Statistics tool:** asks for a list of numbers separated by spaces and prints the mean, median, highest and lowest with `statistics`.
   - **A tool of your own** that uses a library you have not used yet. Check the documentation first.
4. Validate every input with `try` and `except`, as in Course 2.
5. Put all the imports at the top, and use `if __name__ == "__main__":` to start the program.
6. Write a `README.md` that tells another student how to rebuild your environment with `requirements.txt` and run the application.

**Bonus objective:** Move the tools into a separate module `tools.py` and import it from `main.py`.

## Common Mistakes

- Installing a package for one interpreter and running the program with another.
- Misspelling a package name when installing, which may install a different, unwanted package.
- Naming your own file after a module, such as `random.py`, so that `import random` loads your file.
- Committing the `.venv` folder to Git, instead of listing it in `.gitignore`.
- Forgetting to activate the virtual environment before installing packages.
- Not writing down the project's dependencies, so nobody else can run it.

## Lesson Recap

You learned that you do not have to write everything yourself. You separated modules, packages and libraries, imported tools from the standard library and used `math`, `random`, `datetime` and `statistics`. You learned that third-party libraries come from PyPI and are added with `pip`, that a virtual environment keeps every project's libraries separate, and that `requirements.txt` makes a project reproducible. These are the habits of every professional Python developer.

## Homework / Extension Mission

**Solo Mission: Library Explorer Report**

Choose **two** standard-library modules you did not use in class (for example `collections`, `time`, `textwrap`, `calendar`, `string` or `itertools`) and explore them. Your submission must include:

1. A file `library_explorer.py` that imports both modules and demonstrates at least three functions or tools from each one, with a comment that explains each demonstration in your own words.
2. A short `report.md` that says what each module is for, where you found the documentation and one real situation where it would help.
3. A `requirements.txt` file for your project (it may only contain a comment if you used just the standard library) and a sentence about why.
4. The commands you would give another student who wanted to set up the same project in a new virtual environment.
5. A list of two safety checks you do before installing an outside library.

## Portfolio Connection

Today you start the first portfolio project of Course 3, the **Student Life Data Explorer** (Part 1). Part 1 uses modules from the standard library: `csv` to read the survey, `statistics` for the averages, `collections` to count the answers and `datetime` for the dates. The **Multi-Tool Python Application** shows that you can combine tools from many places. Over the rest of this course you will add three important libraries to your toolbox: **NumPy** and **Pandas** for data, and **requests** for APIs, and you will use `matplotlib` to draw charts. Each one comes from PyPI, is installed with `pip` and is recorded in the `requirements.txt` file of your projects.
