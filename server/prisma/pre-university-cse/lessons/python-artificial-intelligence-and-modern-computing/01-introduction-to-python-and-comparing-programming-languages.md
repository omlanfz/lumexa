# Lumexa Mission Log: Python, Artificial Intelligence & Modern Computing

**Course/Path:** Python, Artificial Intelligence & Modern Computing
**Lesson:** 01 of 08
**Title:** Introduction to Python and Comparing Programming Languages
**Duration:** 60 minutes
**Difficulty:** Beginner to Intermediate
**Technology:** Python

---

## Mission Brief

You have already written programs in C, C++, Java and JavaScript. Now meet the language that most of the world's data science and artificial intelligence code is written in: **Python**. It is the language in which a beginner can say "read these marks, average them and print a report" in four short lines, and in which a researcher can then train a neural network with the same skills. But Python is not magic and it is not "the best language". It is a **set of trade-offs**, and a computer scientist must be able to explain them.

In this lesson you learn the Python you need for the rest of the course (values, decisions, loops, functions and the way Python treats types and lists), and you compare it honestly with the languages you know by solving the **same task in five languages**. You finish by starting the **course project folder** with a language comparison table and your first Python utility: a marks report that copes with bad input.

## Learning Objectives

1. Write and run small Python programs with variables, `print`, f-strings, `if`/`elif`/`else`, `for` and `while` loops, lists, dictionaries and functions.
2. Explain how Python differs from C, C++, Java and JavaScript in typing, in the way programs are run, in memory management and in syntax.
3. Solve the same task in five languages and compare the code, the results and the trade-offs.
4. Use the interactive REPL, run a script, and explain what `pip`, a virtual environment and PEP 8 are for.
5. Choose a language for a task by stating criteria (speed, safety, ecosystem, readability, platform) instead of preferences.
6. Start the course project folder: a language comparison table and a first Python utility that cleans and reports marks.

## Prerequisites

- Programming from the earlier courses: variables, conditions, loops, functions and arrays in C, C++ or Java, and the JavaScript of the web lessons.
- The idea of a compiler, a virtual machine and memory management from the courses on programming languages and on computer organisation.
- Optional: Python 3 installed on your computer. You can also run every example in the code editors of this lesson.

## Concept Explanation

### Python at a glance

**Python** was created by Guido van Rossum and first released in 1991. Its design goal is **readability**: the layout of the code *is* its structure, because blocks are marked by **indentation** (four spaces by convention) instead of braces. Python is **dynamically typed** (a variable is just a name that refers to a value, and the value has the type), **interpreted** in the sense that you run the source text directly (CPython, the standard implementation, first compiles it to **bytecode** and then a **virtual machine** executes that), and **garbage collected** (the memory of objects that are no longer used is freed for you, mainly by reference counting). It comes with a large standard library ("batteries included") and with a gigantic ecosystem of third-party packages; the fast numerical code of data science and AI usually sits inside libraries written in C, C++ and CUDA, with Python as the readable control language on top.

You can use Python in three ways. The **REPL** (read, evaluate, print, loop) is an interactive prompt: type `2 + 3` and see `5` at once, ideal for experiments. A **script** is a file such as `report.py` that you run with `python3 report.py`. **Notebooks** mix text, code and charts. The basics will look familiar. `name = "Ayesha"` and `mark = 92` create values without declarations; the types you meet most are `int` (of any size), `float`, `str`, `bool`, `None`, `list`, `tuple` and `dict`. Arithmetic has `/` (always a float), `//` (floor division), `%` (remainder) and `**` (power). Text is built with **f-strings**: `f"{name} scored {mark}"`. Decisions use `if`, `elif` and `else` followed by a colon; loops are `for item in collection:` (also `for i in range(5):`) and `while condition:`; functions are written with `def name(parameters):` and give a value back with `return`. A list such as `[72, 45, 88]` is written with square brackets, and a dictionary such as `{"C": 1972}` maps keys to values.

Two properties surprise people who come from C. First, Python's integers never overflow: `2 ** 100` is simply a very big number. Second, names are **references**: `b = a` does not copy a list, it makes a second name for the same list, so changing one changes the other (use `a.copy()` for a real copy). Types are checked **when the line runs**, not before: `"3" + 4` is only noticed when the program reaches it, and then Python raises a `TypeError`. A compiled, statically typed language would have refused the program before it ran.

### Five languages, five answers

Every language answers the same few questions differently, and none of the answers is "right" for every job.

- **How is the program run?** C and C++ are **compiled** to machine code for one kind of CPU, which gives the best speed and the least overhead. Java is compiled to **bytecode** for the Java virtual machine, which also compiles the hot parts to machine code while the program runs (a **JIT** compiler). JavaScript is run by a browser or server engine such as V8, which also uses JIT compilation. Python (CPython) compiles to bytecode and interprets it, which is simple and flexible but slower for heavy loops.
- **How are types handled?** C, C++ and Java are **statically typed**: types are fixed in the source and checked before the program runs, so many mistakes are caught early. JavaScript and Python are **dynamically typed**: shorter code, more freedom, and more errors found only at run time (optional **type hints** and tools such as linters help in Python).
- **Who manages memory?** In C you call `malloc` and `free` yourself, and in C++ you use constructors, destructors and smart pointers (**RAII**); both give control and both allow serious memory errors. Java, JavaScript and Python use a **garbage collector**, which is safer and slower in the worst case.
- **What is it used for?** C: operating systems, embedded devices and libraries that everything else calls. C++: games, browsers, databases and anything that needs speed and control. Java: large business systems and Android apps. JavaScript: everything in the browser, and servers. Python: scripting, data science, machine learning, research and teaching.

The honest summary is a trade-off between **speed**, **safety**, **productivity** and **ecosystem**. Python trades raw speed for short, readable code and a rich ecosystem; C trades convenience for control. Professional programmers use several languages and choose per problem.

### Tools: the REPL, scripts and packages

Start with the REPL for small questions and use scripts for programs. A script is often guarded by `if __name__ == "__main__":`, which runs the code only when the file is run directly and not when another file imports it (Lesson 2 uses this). **Modules** are files that you import (`import math`); a **package** is a folder of modules. Third-party packages are installed with **`pip`** (`pip install requests`), and a **virtual environment** (`python3 -m venv .venv`) gives each project its own set of packages so that projects do not break each other; the list of packages goes into a `requirements.txt` file. **PEP 8** is the community style guide (four spaces, `snake_case` names, lines under about 80 characters), and a **docstring** (the string at the top of a function) documents it. In this course you use only the standard library, so that every example runs in the code editors of the lessons.

### Choosing a language

Ask the questions in an order: What must the program do, and on which platform (a web page needs JavaScript, an Android app Kotlin or Java, a microcontroller C or C++)? How fast must it be, and is the speed limited by the language or by the algorithm (a better algorithm beats a faster language)? What libraries already exist (for data and AI, Python's)? Who will maintain it, and what do they know? How costly is a bug (a pacemaker is not written in a language that allows silent type errors)? Finally, think in **combinations**: a Python program can call a C library for the heavy part, a web page can ask a Python server, and the best systems use each language where it is strongest.

## Key Vocabulary

| Term | Definition |
|---|---|
| **Interpreter / compiler** | A program that runs source code step by step / a program that translates source code to another form before it runs. |
| **Bytecode / virtual machine** | A compact instruction set that is not tied to one CPU / the program that executes it. |
| **JIT compilation** | Translating the frequently used parts of a program to machine code while it runs. |
| **Static / dynamic typing** | Types are fixed and checked before the program runs / types belong to values and are checked when a line runs. |
| **Garbage collection** | Automatic freeing of the memory of objects that can no longer be reached. |
| **REPL** | An interactive prompt that reads a line, evaluates it, prints the result and repeats. |
| **Indentation** | The spaces at the start of a line, which in Python mark a block. |
| **f-string** | A string such as `f"{name} has {mark}"` that inserts the values of expressions. |
| **Reference / alias** | A name that points to an object / a second name for the same object. |
| **Module / package** | A file of Python code that can be imported / a folder of modules. |
| **pip / virtual environment** | The installer of third-party packages / an isolated set of packages for one project. |
| **PEP 8** | The community style guide for Python code. |

## Worked Examples

### Example 1: The same task in five languages

The task: given six exam marks, print how many there are, their average to one decimal place, the highest mark and how many marks are 33 or more.

```c
#include <stdio.h>

int main(void) {
    int marks[] = {72, 45, 88, 30, 91, 66};
    int count = sizeof marks / sizeof marks[0];
    int total = 0, highest = marks[0], passed = 0;
    for (int i = 0; i < count; i++) {
        total += marks[i];
        if (marks[i] > highest) highest = marks[i];
        if (marks[i] >= 33) passed++;
    }
    printf("count %d\naverage %.1f\nhighest %d\npassed %d\n", count, (double)total / count, highest, passed);
    return 0;
}
```

```output
count 6
average 65.3
highest 91
passed 5
```

```cpp
#include <algorithm>
#include <iomanip>
#include <iostream>
#include <numeric>
#include <vector>

int main() {
    std::vector<int> marks = {72, 45, 88, 30, 91, 66};
    int total = std::accumulate(marks.begin(), marks.end(), 0);
    int highest = *std::max_element(marks.begin(), marks.end());
    int passed = std::count_if(marks.begin(), marks.end(), [](int m) { return m >= 33; });
    std::cout << "count " << marks.size() << "\n"
              << "average " << std::fixed << std::setprecision(1) << (double)total / marks.size() << "\n"
              << "highest " << highest << "\n"
              << "passed " << passed << "\n";
}
```

```output
count 6
average 65.3
highest 91
passed 5
```

```java
import java.util.Arrays;

public class Main {
    public static void main(String[] args) {
        int[] marks = {72, 45, 88, 30, 91, 66};
        int total = Arrays.stream(marks).sum();
        int highest = Arrays.stream(marks).max().getAsInt();
        long passed = Arrays.stream(marks).filter(m -> m >= 33).count();
        System.out.printf("count %d%n", marks.length);
        System.out.printf("average %.1f%n", (double) total / marks.length);
        System.out.printf("highest %d%n", highest);
        System.out.printf("passed %d%n", passed);
    }
}
```

```output
count 6
average 65.3
highest 91
passed 5
```

```javascript
const marks = [72, 45, 88, 30, 91, 66];
const total = marks.reduce((sum, m) => sum + m, 0);
console.log("count", marks.length);
console.log("average", (total / marks.length).toFixed(1));
console.log("highest", Math.max(...marks));
console.log("passed", marks.filter((m) => m >= 33).length);
```

```output
count 6
average 65.3
highest 91
passed 5
```

```python
marks = [72, 45, 88, 30, 91, 66]
print("count", len(marks))
print("average", f"{sum(marks) / len(marks):.1f}")
print("highest", max(marks))
print("passed", sum(1 for m in marks if m >= 33))
```

```output
count 6
average 65.3
highest 91
passed 5
```

1. All five programs print the **same four lines**. The task and the answer are language independent; only the way of saying it differs. That is the first lesson of comparing languages: the algorithm comes first.
2. **C** needs the most words: the header, `main`, the array size computed by `sizeof`, a loop that updates three variables, a cast to `double` so that the division is not an integer division, and format codes. The reward is a program that compiles to a few machine instructions. **C++** shortens the loop with library algorithms and a lambda, but needs several headers and stream manipulators.
3. **Java** needs a class and a typed array, and its streams read like a pipeline. **JavaScript** and **Python** need no declarations of types at all: the data is an array or a list, and the library gives `reduce`, `Math.max`, `sum`, `max` and `len`.
4. Count the lines that are not blank: C 13, C++ 15, Java 13, JavaScript 6, Python 5. **Fewer lines are not automatically better**, but for exploring data they mean faster experiments. In exchange C and C++ run this kind of loop many times faster than Python when the list has millions of items.

### Example 2: Python in a few lines

```python
def grade(mark):
    if mark >= 80:
        return "A+"
    elif mark >= 70:
        return "A"
    elif mark >= 60:
        return "A-"
    elif mark >= 50:
        return "B"
    elif mark >= 40:
        return "C"
    elif mark >= 33:
        return "D"
    return "F"


students = ["Ayesha", "Tanvir", "Sadia", "Nabil", "Mim"]
marks = [92, 67, 38, 75, 29]

print(f"{'Name':<8}{'Mark':>5}  Grade")
counts = {}
for name, mark in zip(students, marks):
    letter = grade(mark)
    counts[letter] = counts.get(letter, 0) + 1
    print(f"{name:<8}{mark:>5}  {letter}")

print()
print("grades:", dict(sorted(counts.items())))
best_mark, best_name = max(zip(marks, students))
print("best:", best_name, "with", best_mark)
print("passed:", ", ".join(name for name, mark in zip(students, marks) if mark >= 33))
```

```output
Name     Mark  Grade
Ayesha     92  A+
Tanvir     67  A-
Sadia      38  D
Nabil      75  A
Mim        29  F

grades: {'A': 1, 'A+': 1, 'A-': 1, 'D': 1, 'F': 1}
best: Ayesha with 92
passed: Ayesha, Tanvir, Sadia, Nabil
```

1. `def grade(mark)` is a **function**: the body is the indented block, and `return` gives the answer. The `if`/`elif`/`else` ladder checks the thresholds from the top and stops at the first true one; the final `return "F"` runs only when no threshold matched.
2. `zip(students, marks)` walks through two lists in step, giving a pair on every turn, and `for name, mark in ...` unpacks the pair into two names. The f-string `{name:<8}` pads a text to 8 characters on the left and `{mark:>5}` right-aligns a number in 5.
3. `counts` is a **dictionary** that maps a grade to how many students have it. `counts.get(letter, 0) + 1` reads the old count (0 if the key is new) and adds one. `sorted(counts.items())` puts the pairs in the order of the keys.
4. `max(zip(marks, students))` compares the pairs, mark first, so it finds the best student in one line, and the last line shows a generator expression filtering the passed students inside `join`. Each of these ideas takes noticeably more code in C or Java.

### Example 3: Dynamic types, big integers and aliases

```python
print(type(7), type(7.0), type("7"), type([7]), type(None))
print(7 / 2, 7 // 2, 7 % 2, 2 ** 100)

a = [1, 2, 3]
b = a
b.append(4)
print(a, a is b)
c = a.copy()
c.append(5)
print(a, c)

try:
    print("3" + 4)
except TypeError as error:
    print("TypeError:", error)
```

```output
<class 'int'> <class 'float'> <class 'str'> <class 'list'> <class 'NoneType'>
3.5 3 1 1267650600228229401496703205376
[1, 2, 3, 4] True
[1, 2, 3, 4] [1, 2, 3, 4, 5]
TypeError: can only concatenate str (not "int") to str
```

1. `type(...)` shows that **values** carry the type, not the names. `7` is an `int`, `7.0` a `float`, `"7"` a `str`, and `None` is the special "no value" object.
2. `7 / 2` is `3.5` (true division is always a float), `7 // 2` is `3` (floor division) and `7 % 2` is `1`. `2 ** 100` is exactly 1267650600228229401496703205376: Python integers grow as needed, whereas a C `int` would overflow long before.
3. `b = a` makes a **second name for the same list**: after `b.append(4)` the list that `a` names has changed too, and `a is b` is `True`. `a.copy()` makes a real copy: `c.append(5)` leaves `a` alone.
4. `"3" + 4` mixes text and a number. Python only finds out when the line runs, and raises a `TypeError` that the `try`/`except` catches and prints. A statically typed language would have refused to compile the program.

## Common Mistakes and Misconceptions

- **Wrong indentation.** An `IndentationError` or a statement in the wrong block comes from mixing tabs and spaces or from misaligned lines; use four spaces everywhere.
- **Forgetting the colon** after `if`, `for`, `while` or `def`.
- **Using `=` where `==` is needed.** `=` assigns, `==` compares; Python refuses `if x = 3` with a syntax error.
- **Expecting `/` to give an integer.** `7 / 2` is `3.5`; use `//` for floor division.
- **Treating `input()` as a number.** It always returns text; convert it with `int(...)` or `float(...)`.
- **Copying a list with `b = a`.** That only creates a second name; use `a.copy()` or `list(a)`.
- **Judging a language by one benchmark or by its syntax.** Speed depends on the algorithm and the task, and each language has areas where it is the natural choice.
- **Believing that "slow" Python cannot do serious work.** The heavy numerical work of data science runs inside fast libraries; Python orchestrates it.

## Guided Hands-On Activity

**Compare and explore.** Work with your teacher and your own editor or the code labs.

1. Run the five programs of Example 1 (the Python and JavaScript ones in the editors; C, C++ and Java if the toolchain or the code runner is available). Check that the four lines are identical.
2. Change a mark to 100 in every version you can run, and predict the new average and the highest mark first.
3. In Example 2 change the list of marks so that two students have an "A+". What does the dictionary of grades look like now?
4. Write a `while` loop that starts with the mark 92 and halves it (`mark = mark // 2`) until it is below 33, printing each value. How many lines does it print?
5. In Example 3 predict what `print(a, c)` shows if you add `c = a` instead of `c = a.copy()`. Then run it.
6. Write down, for the task "show the marks of a class of 1,000,000 students on a web page", which language you would use for each part (data crunching, the page) and why.

## Lesson Project: Same Task, Five Languages

### Objective

Start the **course project folder** of the Python-based computational project: a **language comparison** of the five languages and your **first Python utility**, a marks report that skips bad input instead of crashing. These two files are the base that the next lessons extend.

### Requirements

- **The comparison.** A list of five languages (C, C++, Python, Java, JavaScript) with the year of the first release (1972, 1985, 1991, 1995, 1995), the typing (static or dynamic), how the program is run (machine code, bytecode in a virtual machine, or a JIT in the engine) and the memory management (manual, manual with RAII, or garbage collected). Print it as an aligned table with a header, sorted by year and then by name.
- **The utility.** A function `parse_marks(text)` that splits a text into words, converts each to a whole number, keeps the numbers from 0 to 100 and collects the rest in a list of explanations ("not a number" or "outside 0 to 100"). A function `report(marks, skipped)` that returns the lines of a report: the number of valid marks, the skipped words with their reasons (only if there are any), the average to one decimal place, the highest mark, the lowest mark and how many marks are at least 33.
- **The run.** Use the text `72 45 88 30 abc 91 -5 66 105` and print the table, a blank line, the title "Marks report" and the report. Nothing may crash.
- Keep the code in one file, `starter.py`, with a docstring at the top and the functions before the part that runs.

### Instructions

1. Write the list of languages as a list of tuples and the `comparison_table` function that finds the width of each column and pads the cells with `ljust`.
2. Write `parse_marks` with a `try`/`except ValueError` around `int(word)`.
3. Write `report` and make sure it also works for an empty list of marks.
4. Print the table, the blank line, the title and the report for the given text.
5. Compare your output with the expected output, character by character.
6. Run the file again with another text of your own, with at least one bad word and one mark outside the range.

### Expected Output

```text
Language    Year  Typing   Runs as              Memory
C           1972  static   machine code         manual
C++         1985  static   machine code         manual / RAII
Python      1991  dynamic  bytecode in the VM   garbage collected
Java        1995  static   bytecode in the JVM  garbage collected
JavaScript  1995  dynamic  JIT in the engine    garbage collected

Marks report
valid marks: 6
skipped: abc (not a number), -5 (outside 0 to 100), 105 (outside 0 to 100)
average 65.3
highest 91
lowest 30
passed 5 of 6
```

### Hints

1. **Hint 1 (sorting).** `sorted(languages, key=lambda row: (row[1], row[0]))` sorts by year and then by name.
2. **Hint 2 (the widths).** `max(len(row[i]) for row in rows)` gives the width of column `i`, header included.
3. **Hint 3 (the padding).** `cell.ljust(width)` pads a text on the right; remove the spaces at the end of each line with `.rstrip()`.
4. **Hint 4 (the conversion).** `int("abc")` raises `ValueError`; so does `int("4.5")`.
5. **Hint 5 (the passed marks).** `sum(1 for m in marks if m >= 33)` counts the passes.
6. **Hint 6 (the order).** Check "not a number" in the `except` block, and the range after the conversion.

### Success Criteria

- [ ] The table has a header and five aligned rows, in the order C, C++, Python, Java, JavaScript.
- [ ] `parse_marks` keeps six marks and explains three skipped words with the right reasons.
- [ ] The report shows the average 65.3, the highest 91, the lowest 30 and 5 passed of 6.
- [ ] A text with only bad words does not crash the report.
- [ ] The file has a docstring and the functions come before the code that runs.

### Extension Challenge

Add a fifth column to the table with the number of lines of the task in that language (from Example 1) and print it. Then let the user pick the pass mark with `input()` and print the grade of each valid mark with the `grade` function of Example 2. Finally, write two sentences that recommend a language for a school marks system, and say what you gave up by choosing it.

## Lesson Recap

- **Python** is dynamically typed, readable, garbage collected and run through bytecode on a virtual machine; blocks are marked by indentation, and names are references to objects.
- The **same task** can be written in C, C++, Java, JavaScript and Python with the same result; the languages differ in typing, execution, memory management and amount of code, which is a trade-off, not a ranking.
- Tools: the **REPL** for experiments, **scripts** for programs, **pip** and **virtual environments** for packages, **PEP 8** for style.
- Choose a language by the problem, the platform, the speed that is needed, the libraries and the people who will maintain the code, often in combination.

## Homework / Extension Mission

Pick a small task of your own (for example, count the vowels in a sentence) and write it in Python and in one language from the earlier courses. Compare the two versions in a table: lines, readability, what errors the compiler or interpreter caught and when. Then write a paragraph that answers: if you had to write the same program for a smartphone, a web page and a tiny sensor, which language would you choose for each, and why?

## Course Project Connection

This lesson starts the **course project**, the small Python-based computational application or data exploration project. The folder now holds `starter.py` with the language comparison and the first utility: a function that cleans text input and a report that does not crash on bad data. In the next lessons you add records and statistics, tested algorithms, a data explorer, a classifier, text and image analysers and a sensor pipeline, and you finish with tests, a report and a plan for what to build next.

## Instructor-Guided Teaching Notes

**Pacing (60 minutes).** 10 minutes: the REPL and the Python basics, live; 15 minutes: Example 1, with the five programs side by side (students predict the output before it is shown); 10 minutes: Examples 2 and 3 and the alias demonstration on the board with boxes and arrows; 10 minutes: the trade-offs discussion; 15 minutes: the project.

**Live demonstrations.** Type expressions in the REPL (`7 / 2`, `2 ** 100`, `"3" + 4`). Draw `a` and `b` as two labels on one box. Show a `NameError` and an `IndentationError` and read the messages aloud. Time a loop of ten million additions in Python and in C if both are installed, to show the speed gap honestly, then show that `sum(range(10_000_000))` in Python is fast because the loop runs in C.

**Misconceptions.** "Python is not a real programming language." "Compiled is better than interpreted." "Dynamic typing means no types." "Variables are boxes that hold values."

**Assessment of the project.** Check the output of `starter.py` against the expected output, then give a text with another bad word and one more out-of-range mark; the program must not crash. Check that the functions have docstrings or comments and that the code that runs comes after them. Ask each student which language they would choose for a school marks system and what they gave up.

**Reference solution `starter.py`** (run with `python3 starter.py`):

```python
"""Course project, step 1: a language comparison and the first Python utility."""

LANGUAGES = [
    # name, year of the first release, typing, how it runs, memory
    ("C", 1972, "static", "machine code", "manual"),
    ("C++", 1985, "static", "machine code", "manual / RAII"),
    ("Python", 1991, "dynamic", "bytecode in the VM", "garbage collected"),
    ("Java", 1995, "static", "bytecode in the JVM", "garbage collected"),
    ("JavaScript", 1995, "dynamic", "JIT in the engine", "garbage collected"),
]


def comparison_table(languages):
    """Return the lines of an aligned table, oldest language first."""
    rows = [("Language", "Year", "Typing", "Runs as", "Memory")]
    for name, year, typing, runs, memory in sorted(languages, key=lambda row: (row[1], row[0])):
        rows.append((name, str(year), typing, runs, memory))
    widths = [max(len(row[i]) for row in rows) for i in range(5)]
    return ["  ".join(cell.ljust(width) for cell, width in zip(row, widths)).rstrip() for row in rows]


def parse_marks(text):
    """Split the text into words; return the valid marks and the reasons for the skipped words."""
    marks, skipped = [], []
    for word in text.split():
        try:
            value = int(word)
        except ValueError:
            skipped.append(f"{word} (not a number)")
            continue
        if 0 <= value <= 100:
            marks.append(value)
        else:
            skipped.append(f"{word} (outside 0 to 100)")
    return marks, skipped


def report(marks, skipped, pass_mark=33):
    """Return the lines of the marks report."""
    lines = [f"valid marks: {len(marks)}"]
    if skipped:
        lines.append("skipped: " + ", ".join(skipped))
    if marks:
        lines.append(f"average {sum(marks) / len(marks):.1f}")
        lines.append(f"highest {max(marks)}")
        lines.append(f"lowest {min(marks)}")
        lines.append(f"passed {sum(1 for m in marks if m >= pass_mark)} of {len(marks)}")
    return lines


if __name__ == "__main__":
    print("\n".join(comparison_table(LANGUAGES)))
    print()
    print("Marks report")
    marks, skipped = parse_marks("72 45 88 30 abc 91 -5 66 105")
    print("\n".join(report(marks, skipped)))
```

```output
Language    Year  Typing   Runs as              Memory
C           1972  static   machine code         manual
C++         1985  static   machine code         manual / RAII
Python      1991  dynamic  bytecode in the VM   garbage collected
Java        1995  static   bytecode in the JVM  garbage collected
JavaScript  1995  dynamic  JIT in the engine    garbage collected

Marks report
valid marks: 6
skipped: abc (not a number), -5 (outside 0 to 100), 105 (outside 0 to 100)
average 65.3
highest 91
lowest 30
passed 5 of 6
```

**Differentiation.** Support: give `comparison_table` and let students write `parse_marks` and `report`. Stretch: the line-count column, the grade of each mark with `input()`, and a version that reads the marks from a file with `open`.

**Discussion questions (not for the student quiz).** If Python is slower than C, why do data scientists use it? What kinds of mistakes does a static type system prevent, and what does it cost the programmer? When would you rewrite a Python program in C?
