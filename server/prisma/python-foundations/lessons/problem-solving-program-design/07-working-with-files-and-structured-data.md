# Lumexa Mission Log: Problem Solving & Program Design

**Course/Path:** Problem Solving & Program Design
**Lesson:** 07 of 08
**Title:** Working with Files & Structured Data
**Duration:** 60 minutes
**Difficulty:** Beginner
**Technology:** Python 3

---

## Mission Brief

Every spacecraft carries a flight recorder, a device that keeps a permanent record of everything that happened, even after the power goes off. Your programs have a memory problem of their own. Everything stored in a variable disappears the moment the program ends. To keep data, such as scores, expenses or a library catalogue, a program must **write it to a file** and **read it back** the next time it runs. Today you will learn to read and write text files, to store structured data in CSV and JSON, and to use these skills to build a **Personal Expense Tracker** that remembers every expense you have ever entered.

## Learning Objectives

1. Explain why programs need files and what a file path is.
2. Open, read and write text files with `open()` and the `with` statement.
3. Choose the correct file mode: read, write or append.
4. Read and write CSV files with the `csv` module.
5. Load and store structured data in JSON files with the `json` module.
6. Build a program that loads its data at the start and saves it after every change.

## Prerequisites

- Lesson 6: you can use `try` and `except` to handle errors such as a missing file.
- Lesson 3: you can store records as a list of dictionaries.

## Concept Explanation

### Why files?

A variable lives in the computer's memory and vanishes when the program stops. A **file** lives on the disk and stays there. Files let your program keep its data between runs, share data with other programs and read data created by other people, such as a spreadsheet of scores.

### Understanding file paths

A **file path** says where a file is stored. A **relative path** such as `data/expenses.json` starts from the folder your program is running in. An **absolute path** such as `C:/Users/Nova/data/expenses.json` or `/home/nova/data/expenses.json` starts from the very top of the disk. Prefer relative paths in your projects: they keep working when the project moves to another computer. Python's `pathlib` module builds paths for you and works on every operating system:

```python
from pathlib import Path

folder = Path("flight_data")
folder.mkdir(exist_ok=True)          # create the folder if it is missing
log_file = folder / "flight_log.txt"  # the / joins path pieces
print(log_file.exists())             # does the file exist yet?
```

### Opening files with `open()` and the `with` statement

`open(path, mode)` connects your program to a file. Always use it inside a **`with` statement**, which closes the file for you automatically, even if an error happens halfway:

```python
with open("flight_log.txt", "r") as file:
    text = file.read()
```

If you forget to close a file, data may not be saved. With `with` you cannot forget.

### File modes

The second argument of `open()` is the **mode**:

| Mode | Meaning | Careful! |
|---|---|---|
| `"r"` | **Read** an existing file (the default) | `FileNotFoundError` if it is missing |
| `"w"` | **Write**: create the file or **replace** its contents | Deletes whatever was there before |
| `"a"` | **Append**: add to the end of the file | Creates it if missing; keeps old content |

### Reading and writing text files

```python
with open("flight_log.txt", "w") as file:       # write
    file.write("T+00:00 Engines started\n")      # \n starts a new line
    file.write("T+00:05 Liftoff\n")

with open("flight_log.txt", "r") as file:       # read everything
    text = file.read()

with open("flight_log.txt") as file:            # read line by line
    for line in file:
        print(line.strip())                      # strip() removes the \n
```

`file.write()` only accepts **strings**, so convert numbers first with `str()` or an f-string. `file.readlines()` returns every line as a list.

### Reading and writing CSV files

**CSV** (comma-separated values) is the simplest way to store a table: one row per line, with the values separated by commas. Spreadsheet programs open CSV files, and so do data tools. The `csv` module handles commas and quotes for you:

```python
import csv

with open("expenses.csv", "w", newline="") as file:
    writer = csv.DictWriter(file, fieldnames=["item", "amount"])
    writer.writeheader()
    writer.writerow({"item": "Oxygen filter", "amount": 12.5})

with open("expenses.csv", newline="") as file:
    for row in csv.DictReader(file):
        print(row["item"], float(row["amount"]))
```

Remember: **everything read from a CSV file is a string**. Convert numbers with `float()` or `int()`.

### Working with JSON data

**JSON** (JavaScript Object Notation) stores nested data, with dictionaries, lists, text, numbers, `true`/`false` and `null`, in a format that looks very much like Python. The `json` module converts between Python objects and JSON text, and it keeps numbers as numbers:

```python
import json

profile = {"name": "Nova", "missions": ["Apollo-X", "Lunar-3"], "active": True}

with open("profile.json", "w") as file:
    json.dump(profile, file, indent=2)      # write (indent makes it readable)

with open("profile.json") as file:
    loaded = json.load(file)                # read it back as a dictionary
```

Use JSON when your data has structure (lists of records, nested dictionaries), and CSV when it is a simple table.

### Loading, storing and updating persistent information

Most programs with saved data follow one pattern: **load** the data when the program starts, work on it in memory, and **save** it after every change. Handle the "first run" case, when there is no file yet:

```python
import json

def load_data(path):
    try:
        with open(path) as file:
            return json.load(file)
    except FileNotFoundError:
        return []                  # first run: start with an empty list

def save_data(path, data):
    with open(path, "w") as file:
        json.dump(data, file, indent=2)
```

## Key Vocabulary

| Term | Definition |
|---|---|
| **File** | Data stored on a disk so that it lasts after a program ends. |
| **File path** | The address that says where a file is stored. |
| **Relative path** | A path that starts from the folder the program is running in. |
| **`with` statement** | A statement that opens a file and closes it automatically. |
| **File mode** | A letter that tells `open()` whether to read, write or append. |
| **CSV** | Comma-separated values: a simple text format for tables. |
| **JSON** | A text format for structured data made of dictionaries and lists. |
| **Persistent data** | Data that is saved to a file so that it survives after the program stops. |
| **Serialise** | To convert data into text that can be saved, as `json.dump` does. |
| **`pathlib`** | A Python module for building and checking file paths. |

## Code Example: Flight Recorder

```python
# flight_recorder.py
# Text, CSV and JSON files, plus the load / save pattern

import csv
import json
from pathlib import Path

folder = Path("flight_data")
folder.mkdir(exist_ok=True)

# 1. A text file: write, append, then read line by line
log_file = folder / "flight_log.txt"
with open(log_file, "w") as file:
    file.write("T+00:00 Engines started\n")
    file.write("T+00:05 Liftoff\n")
with open(log_file, "a") as file:
    file.write("T+09:12 Orbit reached\n")
with open(log_file) as file:
    for line in file:
        print(line.strip())

# 2. A CSV file: a table of expenses
expenses = [{"item": "Oxygen filter", "amount": 12.5}, {"item": "Solar cell", "amount": 40.0}]
csv_file = folder / "expenses.csv"
with open(csv_file, "w", newline="") as file:
    writer = csv.DictWriter(file, fieldnames=["item", "amount"])
    writer.writeheader()
    writer.writerows(expenses)
total = 0
with open(csv_file, newline="") as file:
    for row in csv.DictReader(file):
        total += float(row["amount"])      # CSV values come back as text
print("Total from the CSV file:", total)

# 3. A JSON file: structured data survives a round trip
profile = {"name": "Nova", "missions": ["Apollo-X", "Lunar-3"], "active": True}
json_file = folder / "profile.json"
with open(json_file, "w") as file:
    json.dump(profile, file, indent=2)
with open(json_file) as file:
    loaded = json.load(file)
print(loaded["name"], loaded["missions"][1], type(loaded["active"]))

# 4. Load and save with a safe first run
def load_data(path):
    try:
        with open(path) as file:
            return json.load(file)
    except FileNotFoundError:
        return []

missing = load_data(folder / "does_not_exist.json")
print("First-run data:", missing)
```

Expected output:

```text
T+00:00 Engines started
T+00:05 Liftoff
T+09:12 Orbit reached
Total from the CSV file: 52.5
Nova Lunar-3 <class 'bool'>
First-run data: []
```

The program creates a `flight_data` folder next to itself. If you run it twice, the text file is rewritten from scratch (mode `"w"`) and then appended to, so the output is the same each time.

## Instructor-Guided Coding Walkthrough

1. Ask students to store a number in a variable, stop the program, run it again and read the variable. Establish the need for files.
2. Write a text file in mode `"w"`, then run the program again. Ask students what happened to the old lines, and repeat with `"a"`.
3. Show a file path error by opening a file that does not exist. Read the `FileNotFoundError` together and wrap the call in `try` and `except`.
4. Open the CSV file in a spreadsheet or a text editor and compare. Show that numbers return as text, and fix it with `float()`.
5. Print the JSON file, then change a value inside it by hand and load it again. Discuss how the program sees the change.
6. Write the `load_data` and `save_data` pair live and ask students why the `"w"` mode in `save_data` does not lose data.

Discussion questions:

- What are the dangers of opening a file in `"w"` mode by mistake?
- When would you choose CSV over JSON, and the other way round?
- Why should a program never assume that its data file already exists?

## Student Mission / Guided Challenge

**Explorer Challenge: Personal Expense Tracker**

Build `expense_tracker.py`, a program that records, retrieves and organises your spending, and remembers it between runs. This is Part 2 of your third portfolio project of Course 2 (you started it in Lesson 6), and a ready-to-run Google Colab version of the whole project is linked in the Project section below this lesson.

1. Store every expense as a dictionary with a `date` (text like `2030-07-14`), a `category`, a `description` and an `amount` (a float). Keep them in a list.
2. Write `load_expenses()` and `save_expenses()` that use a JSON file called `expenses.json` and cope with a first run when there is no file.
3. Write `add_expense()` that asks for the details and **validates** them (the date must have the form `YYYY-MM-DD`, the category must not be empty and the amount must be a positive number). It saves the file straight away.
4. Write `show_expenses()` that prints a neat table with the expenses numbered and totals for the list.
5. Write `total_by_category()` that builds a dictionary of category totals and prints them from largest to smallest.
6. Write `filter_by_month()` that asks for a month such as `2030-07` and prints only the expenses whose date starts with it, plus their total.
7. Add an `export_csv()` option that writes all expenses to `expenses.csv`.
8. Build a menu loop, and handle every error that could crash it (a missing file, text instead of a number, a damaged JSON file).

**Bonus objective:** Let the user set a monthly budget and print a warning when the total for a month goes over it.

## Common Mistakes

- Using mode `"w"` when you meant `"a"`, and erasing the existing data.
- Forgetting the `\n` when writing lines, so everything ends up on one line.
- Trying to write a number or a list directly with `file.write()`, instead of converting to text.
- Forgetting that values from a CSV file are strings.
- Not handling `FileNotFoundError` on the first run, so the program crashes before it has ever saved anything.
- Using an absolute path that only works on one computer.

## Lesson Recap

You gave your programs a memory. You learned how paths locate files, how to open them safely with `with`, and how the modes `"r"`, `"w"` and `"a"` differ. You stored tables in CSV and structured data in JSON, and you followed the load, change and save pattern that powers real applications. With these tools your programs can keep records for as long as you like.

## Homework / Extension Mission

**Solo Mission: Expense Tracker Upgrade**

Improve your `expense_tracker.py` so that it feels like a finished product. Your program must:

1. Allow the user to **edit** and **delete** an expense by its number, with validation of that number.
2. Keep a separate `settings.json` file that stores the user's name, currency symbol and monthly budget, and read it when the program starts.
3. Write a summary report to a text file called `monthly_report.txt` that includes the month, the number of expenses, the total and the total for each category.
4. Import expenses from a CSV file chosen by the user, skipping and reporting every row that has a bad date or amount instead of crashing.
5. Create a backup copy of `expenses.json` named with today's date each time the program starts (use `datetime` if you can, or ask for the date).
6. Document at least five test cases in comments (a missing file, an empty file, a negative amount, a badly formatted date and a huge amount) and the result you expect for each.

## Portfolio Connection

Today you finish the **Personal Expense Tracker** (Part 2), the third portfolio project of Course 2: it combines functions, records, validation, error handling and persistent files. The same load, change and save pattern can store your **Library Management System** too. In Course 3 you will read CSV files with Pandas instead, one line of code per file, and you will be glad you understand what happens inside.
