# Lumexa Mission Log: Python, Artificial Intelligence & Modern Computing

**Course/Path:** Python, Artificial Intelligence & Modern Computing
**Lesson:** 02 of 08
**Title:** Python Data Types, Collections, Functions and Modules
**Duration:** 60 minutes
**Difficulty:** Intermediate
**Technology:** Python

---

## Mission Brief

In the last lesson your marks report worked on a plain list of numbers. Real programs work on **records**: a student has an id, a name and marks in several subjects, and a program must store many of them, find them, check them, summarise them and save them. Python's built-in collections make this astonishingly short, but each collection has its own rules, and a program becomes a tool only when its parts are packaged as **functions** and **modules** that other code can reuse and test.

In this lesson you learn the four collections (`list`, `tuple`, `set` and `dict`) and when to choose each, how to write functions that are safe to call (defaults, keyword arguments, clear errors), how to model a record with a **dataclass** and save it as JSON, and how to organise code into **modules** and use the standard library. You then build the **Student Records Toolkit**, the reusable module that the rest of the course project uses.

## Learning Objectives

1. Choose between `list`, `tuple`, `set` and `dict`, and use indexing, slicing, comprehensions, sorting with a key and set operations.
2. Write functions with parameters, default and keyword arguments, return values and docstrings, and explain scope and the danger of mutable default arguments.
3. Raise and handle exceptions (`ValueError`, `try`, `except`, `finally`) so that bad input produces a clear message instead of a crash.
4. Model records with dictionaries and dataclasses, and convert them to and from JSON text.
5. Organise code into modules, use `import` and the `__main__` guard, and use the standard library (`statistics`, `collections`, `json`).
6. Build the Student Records Toolkit: validated records, class statistics, a ranking and a report, with a JSON round trip check.

## Prerequisites

- Lesson 1: Python values, f-strings, conditions, loops and simple functions.
- Lists, dictionaries and functions from the earlier programming courses, and the idea of the cost of searching a list and a hash table from the course on data structures.
- Basic statistics words: mean, median, minimum and maximum.

## Concept Explanation

### Collections: list, tuple, set and dict

A **list** is an ordered, changeable sequence: `marks = [72, 45, 88]`. You reach items by position (`marks[0]`, `marks[-1]` for the last), cut pieces with **slices** (`marks[1:3]`), and change it with `append`, `insert`, `remove`, `pop` and `sort`. A **tuple** is an ordered sequence that cannot change, `(1972, "C")`, perfect for a record of fixed shape and for returning several values from a function; **unpacking** (`year, name = pair`) takes it apart. A **set** is an unordered collection of **unique** items, `{"Ayesha", "Tanvir"}`, with fast membership tests (`x in s`) and the operations of the discrete mathematics course: `&` intersection, `|` union, `-` difference. A **dict** maps **keys** to values, `{"Maths": 92}`; `d[key]` reads (and raises `KeyError` if the key is missing), `d.get(key, default)` reads safely, `d.items()` walks through the pairs, and the pairs keep the order in which they were added.

The choice follows from the question. Need to look something up by a name or an id? A `dict`. Need each item only once, or need to compare groups? A `set`. A fixed group of values, never changed? A `tuple`. Otherwise a `list`. The choice also decides the speed: asking whether an item is in a list looks at the items one by one, **O(n)**, while the same question for a set or a dict is answered in about **O(1)** because they use a hash table. A **comprehension** builds a collection in one expression: `[m for m in marks if m >= 33]`, `{name for name, subject, _ in rows}`, `{s: len(s) for s in names}`. `sorted(items, key=..., reverse=True)` returns a new sorted list, where the **key function** says what to sort by; `list.sort()` sorts in place and returns `None`, a classic trap. Remember from Lesson 1 that `b = a` only makes a second name for a list: copy it with `a.copy()` or `list(a)`.

### Functions, scope and errors

A function is defined with `def name(parameters):`, documented with a **docstring** and finished with `return` (a function with no `return` gives `None`). Parameters can have **default values** (`def describe(values, label="values")`), and callers may pass **keyword arguments** (`describe(marks, label="scores")`), which makes calls readable. A function can return several values as a tuple. **Scope** decides which names a function can see: its own **local** names, then the names of enclosing functions, then the **global** names of the file, then the built-ins. Assigning to a name inside a function creates a local name; the safe habit is to pass data in as arguments and to return results instead of changing globals.

There is one famous trap. A default value is created **once**, when the `def` runs, so a list used as a default is shared by all calls: `def add(item, bucket=[])` remembers the earlier items. The standard cure is `bucket=None` and `if bucket is None: bucket = []` inside the function. Errors are handled with **exceptions**. `raise ValueError("clear message")` signals a problem; `try:` runs risky code and `except ValueError as error:` handles it; `finally:` runs in every case, handled or not. Catch the **specific** exception that you expect (never a bare `except:`), raise errors early with messages that say what was wrong, and let programmers' mistakes such as `NameError` stop the program loudly. Common exceptions are `ValueError` (right type, wrong value), `TypeError` (wrong type), `KeyError`, `IndexError`, `ZeroDivisionError` and `FileNotFoundError`.

### Records: dictionaries and dataclasses

A record can be a dictionary, `{"id": 1, "name": "Ayesha", "marks": {"Maths": 92}}`, which is flexible but has no protection against a misspelled key. A **dataclass** declares the fields once and writes the constructor, the printed form and the comparison for you:

`@dataclass` above `class Student:` with `student_id: int`, `name: str` and `marks: dict = field(default_factory=dict)` (a mutable default must use `default_factory`, the same trap as before). Methods such as `average()` belong to the class, so the data and the code that understands it stay together (the idea of object-oriented programming from the earlier course). To store records as text, use **JSON**, which you know from the web lessons: `json.dumps([asdict(s) for s in students])` turns them into text and `[Student(**item) for item in json.loads(text)]` rebuilds them. A **round trip** check, "save, load, compare", is a cheap and powerful test.

### Modules, packages and the standard library

A **module** is a Python file whose names you can reuse with `import`. `import statistics` gives you `statistics.mean(...)`; `from statistics import mean` gives you `mean(...)` directly; `import statistics as st` renames it. A **package** is a folder of modules. Python searches the folder of the running script and then the installed packages. Every module has a name in the variable `__name__`: it is the module's own name when imported, and `"__main__"` when the file is run directly. The guard `if __name__ == "__main__":` therefore runs a demonstration only when you run the file itself, so that `records.py` can be both a **library** and a **program**: another file may `import records` without printing anything.

Splitting a project into modules is the first step of software architecture: `records.py` holds the data and the rules, `main.py` holds the program that uses them, and a tests file checks them (Lesson 3). The **standard library** is large, and knowing it saves days of work: `math` (functions and constants), `statistics` (mean, median, mode, standard deviation), `collections` (`Counter`, `defaultdict`, `deque`), `itertools`, `random` (use a fixed seed for repeatable results), `datetime`, `json`, `csv`, `re` (regular expressions) and `pathlib` (files). This course uses only the standard library, so that all programs run in the editors of the lessons.

## Key Vocabulary

| Term | Definition |
|---|---|
| **List / tuple** | An ordered, changeable sequence / an ordered sequence that cannot change. |
| **Set** | An unordered collection of unique items with fast membership tests. |
| **Dictionary** | A collection that maps keys to values; the lookup by key is fast. |
| **Slice / comprehension** | A piece of a sequence such as `marks[1:3]` / an expression that builds a collection from another. |
| **Key function** | The function given to `sorted`, `min` or `max` that says what to compare. |
| **Default argument** | A value that a parameter takes when the caller gives none; it is created once. |
| **Scope** | The part of a program in which a name can be seen: local, enclosing, global, built-in. |
| **Exception** | An object that signals an error and is handled with `try` and `except`. |
| **Dataclass** | A class declared with `@dataclass` that gets its constructor and comparison automatically. |
| **JSON** | A text format for dictionaries and lists that most languages can read and write. |
| **Module / package** | A file of Python code that can be imported / a folder of modules. |
| **`__main__` guard** | `if __name__ == "__main__":`, code that runs only when the file is run directly. |
| **Standard library** | The modules that come with Python, such as `math`, `statistics` and `json`. |

## Worked Examples

### Example 1: The four collections at work

```python
from collections import Counter

rows = [
    ("Ayesha", "Maths", 92), ("Tanvir", "Maths", 67), ("Sadia", "Maths", 38),
    ("Ayesha", "Physics", 85), ("Tanvir", "Physics", 71), ("Mim", "Physics", 88),
    ("Nabil", "ICT", 75),
]

best_three = sorted(rows, key=lambda row: row[2], reverse=True)[:3]
print("top 3:", best_three)

maths = {name for name, subject, _ in rows if subject == "Maths"}
physics = {name for name, subject, _ in rows if subject == "Physics"}
print("both:", sorted(maths & physics))
print("maths only:", sorted(maths - physics))
print("either:", sorted(maths | physics))

by_subject = {}
for name, subject, mark in rows:
    by_subject.setdefault(subject, []).append(mark)
print(by_subject)
print({subject: round(sum(marks) / len(marks), 1) for subject, marks in by_subject.items()})
print(Counter(subject for _, subject, _ in rows).most_common())
print("Mim" in physics, "Mim" in maths)
```

```output
top 3: [('Ayesha', 'Maths', 92), ('Mim', 'Physics', 88), ('Ayesha', 'Physics', 85)]
both: ['Ayesha', 'Tanvir']
maths only: ['Sadia']
either: ['Ayesha', 'Mim', 'Sadia', 'Tanvir']
{'Maths': [92, 67, 38], 'Physics': [85, 71, 88], 'ICT': [75]}
{'Maths': 65.7, 'Physics': 81.3, 'ICT': 75.0}
[('Maths', 3), ('Physics', 3), ('ICT', 1)]
True False
```

1. `rows` is a list of **tuples**, each a record of fixed shape. `sorted(..., key=lambda row: row[2], reverse=True)` sorts by the third item, the mark, from high to low, and the slice `[:3]` keeps the first three.
2. The two **set comprehensions** collect the students of each subject, ignoring the mark with the throwaway name `_`. Then `&` finds the students in both subjects, `-` those in Maths only, and `|` all students that appear in either. `sorted(...)` turns each set into a list in a fixed order, because a set has none.
3. `by_subject` is a **dictionary of lists**: `setdefault(subject, [])` creates the empty list the first time a subject appears, and `append` adds the mark to it. The dictionary comprehension then turns every list into its average, rounded to one decimal place.
4. `Counter` counts how often each subject appears, and `most_common()` lists the counts from the largest. The last line shows the fast membership test of a set: Mim is in the Physics set and not in the Maths set.

### Example 2: Functions, errors and the default-argument trap

```python
def describe(values, label="values"):
    """Return the count, mean, minimum and maximum of a list of numbers."""
    if not values:
        raise ValueError(f"no {label} to describe")
    return len(values), round(sum(values) / len(values), 1), min(values), max(values)


def parse_mark(text):
    """Turn text into a mark from 0 to 100, or raise ValueError with a clear message."""
    value = int(text)
    if not 0 <= value <= 100:
        raise ValueError(f"{value} is outside 0 to 100")
    return value


count, mean, low, high = describe([92, 67, 38, 75, 88])
print(count, mean, low, high)
print(describe([5, 9], label="scores")[1])

for text in ["72", "abc", "105"]:
    try:
        print("ok:", parse_mark(text))
    except ValueError as error:
        print("bad:", error)
    finally:
        print("checked", repr(text))

try:
    describe([], label="marks")
except ValueError as error:
    print("error:", error)


def add_bad(item, bucket=[]):
    bucket.append(item)
    return bucket


def add_good(item, bucket=None):
    if bucket is None:
        bucket = []
    bucket.append(item)
    return bucket


add_bad(1)
print("bad default:", add_bad(2))
add_good(1)
print("good default:", add_good(2))
```

```output
5 72.0 38 92
7.0
ok: 72
checked '72'
bad: invalid literal for int() with base 10: 'abc'
checked 'abc'
bad: 105 is outside 0 to 100
checked '105'
error: no marks to describe
bad default: [1, 2]
good default: [2]
```

1. `describe` returns **four values as a tuple**, which the caller unpacks into four names. `label="values"` is a **default argument**, and the call `describe([5, 9], label="scores")` uses a **keyword argument**; `[1]` picks the mean out of the tuple.
2. `parse_mark` lets `int(text)` raise its own `ValueError` for text such as `"abc"`, and raises another one with a clear message for a number outside the range. The caller handles both in one `except ValueError` and prints the message; `finally` runs after every attempt, even the failed ones.
3. `describe([])` raises `ValueError` as designed, and the last `try` shows the message instead of crashing. A function that **fails early with a clear message** is far easier to debug than one that returns nonsense.
4. `add_bad` shares one list between all calls, because the default `[]` was created once when the function was defined: the second call returns `[1, 2]`. `add_good` creates a new list for every call that gives none, so it returns `[2]`.

### Example 3: Records with a dataclass and JSON

```python
import json
from dataclasses import asdict, dataclass, field


@dataclass
class Student:
    student_id: int
    name: str
    marks: dict = field(default_factory=dict)

    def average(self):
        return round(sum(self.marks.values()) / len(self.marks), 1) if self.marks else None

    def best_subject(self):
        return max(self.marks, key=self.marks.get) if self.marks else None


students = [
    Student(1, "Ayesha Rahman", {"Maths": 92, "Physics": 85, "ICT": 90}),
    Student(2, "Tanvir Ahmed", {"Maths": 67, "Physics": 71, "ICT": 64}),
    Student(3, "Sadia Islam"),
]
print(students[0])
for student in students:
    print(student.name, student.average(), student.best_subject())

text = json.dumps([asdict(s) for s in students])
print(text[:72] + "...")
loaded = [Student(**item) for item in json.loads(text)]
print("round trip equal:", loaded == students)
print("module name:", __name__)
```

```output
Student(student_id=1, name='Ayesha Rahman', marks={'Maths': 92, 'Physics': 85, 'ICT': 90})
Ayesha Rahman 89.0 Maths
Tanvir Ahmed 67.3 Physics
Sadia Islam None None
[{"student_id": 1, "name": "Ayesha Rahman", "marks": {"Maths": 92, "Phys...
round trip equal: True
module name: __main__
```

1. `@dataclass` writes `__init__`, `__repr__` and `==` from the three field declarations, so `print(students[0])` shows all the fields. The field `marks` uses `default_factory=dict` so that every student gets **its own** dictionary.
2. `average` and `best_subject` are **methods**: they use `self.marks`. `max(self.marks, key=self.marks.get)` finds the key with the largest value. Sadia has no marks, and both methods return `None` instead of dividing by zero.
3. `asdict` turns each student into a dictionary and `json.dumps` turns the list into text; only the first 72 characters are printed. `Student(**item)` rebuilds each student from a dictionary, and `loaded == students` is `True`: the **round trip** lost nothing.
4. The last line prints `__main__`, because this file is being run directly. If another file imported it, `__name__` would be the name of the module, and the `__main__` guard would keep the demonstration quiet.

## Common Mistakes and Misconceptions

- **A mutable default argument** (`def f(x, bucket=[])`). The default is shared by every call; use `None` and create the list inside.
- **`marks.sort()` used as a value.** It sorts in place and returns `None`; use `sorted(marks)` when you need the new list.
- **Searching a big list again and again.** `x in big_list` is O(n); use a set or a dict when you ask many times.
- **Reading a missing key with `d[key]`.** It raises `KeyError`; use `d.get(key, default)` when the key may be absent.
- **A bare `except:`.** It hides programmers' mistakes as well; catch the specific exception that you expect.
- **Changing a list while looping over it.** Items are skipped; loop over a copy or build a new list with a comprehension.
- **Naming a variable `list`, `max` or `sum`.** The name hides the built-in function and breaks later code.
- **Putting everything in one file with no `__main__` guard.** Nothing can be imported without running it.

## Guided Hands-On Activity

**Collect, call and import.** Work with your teacher and the code editors.

1. In Example 1 add the row `("Mim", "Maths", 88)` and predict the new `both` and `either` sets before you run it.
2. In Example 1 print the names of the students that are in Physics only, and the number of different students in all rows (use one set).
3. In Example 2 call `describe` with the keyword arguments in the other order and predict whether it still works. Then add a `default` argument that is returned instead of raising an error.
4. Write `safe_average(values)` that returns `None` for an empty list, and call it with `[]`, `[4]` and `[1, 2, 6]`.
5. In Example 3 add a `best_subject` for a student whose two best marks are equal. Which subject does `max` return?
6. Use `statistics.median` and `statistics.mode` on the list `[2, 3, 3, 5, 9]` and on a list with an even number of items. What do you notice?
7. Put the `Student` class and its functions in a file `records.py` and write a second file `main.py` that starts with `from records import Student`. Run `python3 main.py`.

## Lesson Project: Student Records Toolkit

### Objective

Build the **Student Records Toolkit**, a reusable module for the course project: validated student records, class statistics for each subject, a ranking and a report, with a JSON round trip check. The next lessons import this module.

### Requirements

- **The record.** A dataclass `Student` with `student_id`, `name` and `marks` (a dictionary from subject to mark) and a method `average()` rounded to one decimal place.
- **Validation.** A function `make_student(student_id, name, marks)` that raises `ValueError` with a clear message when the name is empty, when there are no marks, or when a mark is outside 0 to 100. A function `load_students(raw_rows)` that builds the students, catches the errors and returns the students together with the list of rejection messages.
- **Statistics.** A function `subject_statistics(students, subject)` that returns the mean, the median, the best (mark and name) and the worst (mark and name) of one subject, using the `statistics` module.
- **Ranking and JSON.** A function `rank_students(students)` that sorts by average from the highest, then by name, and the functions `to_json(students)` and `from_json(text)`.
- **The run.** A `__main__` guard that loads the seven rows of the data below (two of them are invalid), prints the rejections, a table of statistics for Maths, Physics and ICT, the ranking, and "JSON round trip: ok" or "FAILED".

Data: (1, "Ayesha Rahman", Maths 92, Physics 85, ICT 90), (2, "Tanvir Ahmed", 67, 71, 64), (3, "Sadia Islam", 38, 45, 52), (4, "Nabil Hasan", 75, 68, 80), (5, "Mim Akter", 88, 94, 91), (6, "Rafi Karim", Maths 105, Physics 60, ICT 70) and (7, "", Maths 50).

### Instructions

1. Write the dataclass and `average()`.
2. Write `make_student` with the three checks, each with a message that names the student and the problem.
3. Write `load_students` with `try` and `except ValueError`, collecting the messages.
4. Write `subject_statistics`, `rank_students`, `to_json` and `from_json`.
5. Write `print_report` and the `__main__` guard.
6. Compare your output with the expected output.
7. Move the functions to `records.py` and the guarded part to `main.py` with `from records import ...`, and run `main.py` again.

### Expected Output

```text
rejected: Rafi Karim: Maths mark 105 is outside 0 to 100
rejected: student 7: the name is required

5 students loaded

Subject  Mean  Median  Best         Worst
Maths    72.0  75      Ayesha (92)  Sadia (38)
Physics  72.6  71      Mim (94)     Sadia (45)
ICT      75.4  80      Mim (91)     Sadia (52)

Ranking by average
1. Mim Akter       91.0
2. Ayesha Rahman   89.0
3. Nabil Hasan     74.3
4. Tanvir Ahmed    67.3
5. Sadia Islam     45.0

JSON round trip: ok
```

### Hints

1. **Hint 1 (the checks).** `if not name.strip():` catches an empty name or a name of only spaces; `if not 0 <= mark <= 100:` is a readable range check.
2. **Hint 2 (the messages).** Use f-strings such as `f"{name}: {subject} mark {mark} is outside 0 to 100"`.
3. **Hint 3 (the statistics).** Build a list of `(mark, name)` pairs; `max` and `min` of the pairs give the best and the worst student.
4. **Hint 4 (the ranking).** `sorted(students, key=lambda s: (-s.average(), s.name))` sorts by the negative average and then by name.
5. **Hint 5 (the table).** Compute the width of each column with `max(len(row[i]) for row in rows)` and pad with `ljust`.
6. **Hint 6 (the round trip).** `from_json(to_json(students)) == students` works because dataclasses compare field by field.

### Success Criteria

- [ ] Two rows are rejected, each with a clear message that names the problem.
- [ ] The table shows the mean, the median, the best and the worst student for the three subjects.
- [ ] The ranking is by average, from Mim Akter at the top to Sadia Islam at the bottom.
- [ ] The JSON round trip check prints "ok".
- [ ] The functions live in a module and the demonstration is guarded by `__name__`.

### Extension Challenge

Add `top_n(students, n)` and a function `students_below(students, subject, mark)` that lists the students under a mark, and use a set to list the students that are below 50 in at least two subjects. Then add `save(students, path)` and `load(path)` with `pathlib.Path` and `read_text`, and handle `FileNotFoundError` with a clear message. Finally, give the toolkit a function `histogram(students, subject)` that counts the marks in bands of ten with a `Counter`.

## Lesson Recap

- **Collections:** a `list` is ordered and changeable, a `tuple` is a fixed group, a `set` holds unique items with fast membership and set algebra, a `dict` maps keys to values; comprehensions and `sorted` with a key build and order them.
- **Functions** have defaults, keyword arguments and docstrings; never use a mutable default; raise `ValueError` early with a clear message and catch specific exceptions.
- A **dataclass** models a record, and **JSON** saves it; "save, load, compare" is a cheap round trip test.
- **Modules** are files that you import; the `__main__` guard lets a file be a library and a program, and the **standard library** (`statistics`, `collections`, `json`) saves work.

## Homework / Extension Mission

Design a record for something that you know well (a library book, a bus route, a football match) as a dataclass with at least four fields and two methods. Write a function that validates it and raises `ValueError` with a clear message, a list of five records, a ranking or a summary by one field, and a JSON round trip check. Then explain, in four sentences, why you chose each collection and where a set or a dictionary made your code shorter or faster.

## Course Project Connection

This lesson gives the **course project**, the small Python-based computational application or data exploration project, its first real component: the Student Records Toolkit in `records.py`, with validated records, statistics, a ranking and JSON storage. Lesson 1 gave you the marks cleaning code, and from now on the toolkit is the part that the other lessons import: the algorithm library of Lesson 3 will be tested against it, and the explorer of Lesson 4 will read larger data into the same kind of records.

## Instructor-Guided Teaching Notes

**Pacing (60 minutes).** 15 minutes: the four collections with a live REPL session and a "which collection?" quiz; 10 minutes: Example 2, with the default-argument trap predicted by the class before it runs; 10 minutes: dataclasses, JSON and modules, and splitting a file into two; 10 minutes: Example 1 and 3 in the editors; 15 minutes: the project.

**Live demonstrations.** Show `x in big_list` against `x in big_set` for a million items with `timeit`. Run `add_bad` three times and let students predict each result. Import a module that prints at the top and then guard it. Show a `KeyError` and a `TypeError` traceback and read it from the bottom.

**Misconceptions.** "A set keeps the order of insertion." "`sort()` returns the sorted list." "A default argument is created at every call." "Catching `Exception` is always safer."

**Assessment of the project.** Run the module with the data and compare the output. Add one more invalid row (a mark of -1) and check that it is rejected with a clear message. Check that the functions are importable without printing anything, and that the ranking breaks ties by name. Ask: why did we use a dictionary for marks and a tuple for the pairs?

**Reference solution `records.py`** (run with `python3 records.py`):

```python
"""Course project, step 2: the Student Records Toolkit."""
import json
import statistics
from dataclasses import asdict, dataclass


@dataclass
class Student:
    student_id: int
    name: str
    marks: dict

    def average(self):
        return round(sum(self.marks.values()) / len(self.marks), 1)


def make_student(student_id, name, marks):
    """Validate the data and return a Student; raise ValueError with a clear message otherwise."""
    if not name.strip():
        raise ValueError(f"student {student_id}: the name is required")
    if not marks:
        raise ValueError(f"{name}: at least one mark is required")
    for subject, mark in marks.items():
        if not 0 <= mark <= 100:
            raise ValueError(f"{name}: {subject} mark {mark} is outside 0 to 100")
    return Student(student_id, name.strip(), dict(marks))


def load_students(raw_rows):
    """Build the students; return them together with the rejection messages."""
    students, rejected = [], []
    for student_id, name, marks in raw_rows:
        try:
            students.append(make_student(student_id, name, marks))
        except ValueError as error:
            rejected.append(str(error))
    return students, rejected


def subject_statistics(students, subject):
    """Mean, median, best and worst (mark, name) of one subject."""
    scored = [(s.marks[subject], s.name) for s in students if subject in s.marks]
    values = [mark for mark, _ in scored]
    return {"mean": statistics.mean(values), "median": statistics.median(values), "best": max(scored), "worst": min(scored)}


def rank_students(students):
    """Highest average first; ties are broken by name."""
    return sorted(students, key=lambda s: (-s.average(), s.name))


def to_json(students):
    return json.dumps([asdict(s) for s in students])


def from_json(text):
    return [Student(**item) for item in json.loads(text)]


def print_report(students, rejected):
    for message in rejected:
        print("rejected:", message)
    print(f"\n{len(students)} students loaded\n")
    rows = [("Subject", "Mean", "Median", "Best", "Worst")]
    for subject in ("Maths", "Physics", "ICT"):
        info = subject_statistics(students, subject)
        best, worst = info["best"], info["worst"]
        rows.append((subject, f"{info['mean']:.1f}", str(info["median"]), f"{best[1].split()[0]} ({best[0]})", f"{worst[1].split()[0]} ({worst[0]})"))
    widths = [max(len(row[i]) for row in rows) for i in range(5)]
    for row in rows:
        print("  ".join(cell.ljust(width) for cell, width in zip(row, widths)).rstrip())
    print("\nRanking by average")
    for place, student in enumerate(rank_students(students), start=1):
        print(f"{place}. {student.name:<15}{student.average():>5.1f}")
    print("\nJSON round trip:", "ok" if from_json(to_json(students)) == students else "FAILED")


RAW_ROWS = [
    (1, "Ayesha Rahman", {"Maths": 92, "Physics": 85, "ICT": 90}),
    (2, "Tanvir Ahmed", {"Maths": 67, "Physics": 71, "ICT": 64}),
    (3, "Sadia Islam", {"Maths": 38, "Physics": 45, "ICT": 52}),
    (4, "Nabil Hasan", {"Maths": 75, "Physics": 68, "ICT": 80}),
    (5, "Mim Akter", {"Maths": 88, "Physics": 94, "ICT": 91}),
    (6, "Rafi Karim", {"Maths": 105, "Physics": 60, "ICT": 70}),
    (7, "", {"Maths": 50}),
]

if __name__ == "__main__":
    loaded, rejected_messages = load_students(RAW_ROWS)
    print_report(loaded, rejected_messages)
```

```output
rejected: Rafi Karim: Maths mark 105 is outside 0 to 100
rejected: student 7: the name is required

5 students loaded

Subject  Mean  Median  Best         Worst
Maths    72.0  75      Ayesha (92)  Sadia (38)
Physics  72.6  71      Mim (94)     Sadia (45)
ICT      75.4  80      Mim (91)     Sadia (52)

Ranking by average
1. Mim Akter       91.0
2. Ayesha Rahman   89.0
3. Nabil Hasan     74.3
4. Tanvir Ahmed    67.3
5. Sadia Islam     45.0

JSON round trip: ok
```

**Differentiation.** Support: give the dataclass and `make_student`, and let students write the statistics and the ranking. Stretch: `save` and `load` with `pathlib`, the histogram with `Counter`, and the set of students below 50 in at least two subjects.

**Discussion questions (not for the student quiz).** Why is it better that `make_student` raises an error than that it silently corrects the data? When would you choose a tuple over a dataclass for a record? What does the `__main__` guard make possible?
