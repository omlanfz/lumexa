# Lumexa Mission Log: Problem Solving & Program Design

**Course/Path:** Problem Solving & Program Design
**Lesson:** 05 of 08
**Title:** Debugging, Testing & Fixing Problems
**Duration:** 60 minutes
**Difficulty:** Beginner
**Technology:** Python 3

---

## Mission Brief

In 1947, engineers working on an early computer found a real moth stuck inside it, and wrote in their logbook: "first actual case of bug being found." Ever since, a mistake in a program has been called a **bug**, and finding and fixing it is called **debugging**. Every programmer, from a beginner to the engineers who write spacecraft software, spends a great deal of time debugging. The difference between a frustrated coder and a skilled one is not that the skilled one makes fewer mistakes. It is that they have a *method*. Today you will learn that method: how to read error messages, how to look inside a running program, how to test it properly and how to fix problems systematically instead of guessing.

## Learning Objectives

1. Tell syntax errors, runtime errors and logic errors apart.
2. Read a Python traceback and find where an error happened.
3. Use `print()` statements to inspect a program, and describe how a debugger with breakpoints works.
4. Test a program with a variety of inputs and write simple test cases.
5. Use `assert` to check that a function behaves as expected.
6. Fix errors systematically rather than by guessing.

## Prerequisites

- Lesson 4: you can write functions and use patterns such as searching and counting.
- Lesson 1: you can list the edge cases of a problem.

## Concept Explanation

### Three kinds of errors

| Kind | When it happens | What you see | Example |
|---|---|---|---|
| **Syntax error** | Before the program runs: Python cannot understand the code | `SyntaxError` and a line number | A missing colon or closing bracket |
| **Runtime error** | While running: Python understands the line but cannot do it | A traceback and an error name | Dividing by zero, a missing key |
| **Logic error** | The program runs without any error but gives the wrong answer | Nothing at all | Using `+` where `-` was needed |

Logic errors are the hardest, because Python cannot see that anything is wrong. Only *you* know what the right answer should have been, which is why testing matters.

### Reading a traceback

When a runtime error happens, Python prints a **traceback**: a report of exactly how it got there. Read it from the **bottom up**:

```text
Traceback (most recent call last):
  File "mission.py", line 12, in <module>
    result = average_speed(300, 0)
  File "mission.py", line 5, in average_speed
    return distance / hours
ZeroDivisionError: division by zero
```

1. **The last line** names the error (`ZeroDivisionError`) and gives a message.
2. **The line above** shows the exact code that failed and its line number (line 5).
3. **The lines before** show who called it: the code on line 12 called `average_speed`.

Common error names and what they usually mean: `NameError` (a misspelled or undefined name), `TypeError` (the wrong kind of value, such as adding text to a number), `ValueError` (the right type but an impossible value, such as `int("abc")`), `IndexError` (a list position that does not exist), `KeyError` (a dictionary key that does not exist) and `IndentationError` (spaces that do not line up).

### Debugging with `print()`

The simplest debugging tool is the one you already know. Print the values of your variables at key moments to see what the program is *really* doing, not what you *think* it is doing:

```python
for n in [3, 5, 8]:
    total += n
    print("DEBUG: n =", n, "| total =", total)
```

Label every debug line so you can spot it, and remove the debug prints when the bug is fixed.

### Breakpoints and debugging tools

Editors such as VS Code and Thonny include a **debugger**. You set a **breakpoint**, a marker on a line where the program should pause. When it pauses you can look at every variable, then run the program **one line at a time** with *step over* (run this line) or *step into* (go inside the function this line calls). It is like a slow-motion replay of your program, and it gives you the same view as the trace tables you wrote in Lesson 1.

### Testing with different inputs

A program that works for one input may fail for another. Test three kinds of input:

- **Normal:** typical values (`count_vowels("Mars")`).
- **Edge:** the limits and unusual cases (an empty string, zero, the largest allowed value).
- **Invalid:** values that should be rejected (text where a number is expected).

### Writing test cases

A **test case** pairs an input with the output you *expect*. Write the table **before** you run the code, and the "expected" column cannot be influenced by what the code does:

| Input | Expected | Actual | Pass? |
|---|---|---|---|
| `"Mars"` | 1 | 1 | yes |
| `""` | 0 | 0 | yes |
| `"AEIOU"` | 5 | 5 | yes |

### Introduction to assertions

An **assertion** is a claim that must be true. Python's `assert` statement checks it and stops the program with an `AssertionError` if it is false, so a broken function cannot hide:

```python
assert average([2, 4, 6]) == 4
assert average([]) == 0, "average of an empty list should be 0"
```

When every assert passes, nothing is printed. That is good news. A collection of asserts in your file is a mini test suite you can run again whenever you change your code.

### Fixing errors systematically

Changing things at random until the error disappears wastes time and often hides the real problem. Follow this routine instead:

1. **Reproduce** the bug so it happens every time.
2. **Read** the error message and the line number.
3. **Isolate** the problem: find the smallest piece of code that still fails.
4. **Form a hypothesis**: "I think `total` is not reset because…"
5. **Change one thing**, then run again.
6. **Retest** with your test cases, and add a new test that would have caught the bug.

Explaining the problem aloud to a friend, or even a rubber duck on your desk, often reveals the answer. Programmers call it *rubber duck debugging*.

## Key Vocabulary

| Term | Definition |
|---|---|
| **Bug** | A mistake in a program. |
| **Debugging** | Finding and fixing bugs. |
| **Syntax error** | Code that breaks the rules of the language so Python cannot run it. |
| **Runtime error** | A problem that stops a program while it is running. |
| **Logic error** | A mistake that makes the program give the wrong result without any error message. |
| **Traceback** | Python's report of where a runtime error happened and how the program got there. |
| **Breakpoint** | A marker that pauses the program at a chosen line in a debugger. |
| **Test case** | An input together with the output that is expected for it. |
| **`assert`** | A statement that stops the program if a condition is not true. |
| **Hypothesis** | An educated guess about the cause of a bug that you can test. |

## Code Example: Anomaly Investigation Toolkit

```python
# debug_toolkit.py
# Test cases, assert and print debugging

def count_vowels(text):
    """Return how many vowels (a, e, i, o, u) a piece of text has."""
    vowels = "aeiou"
    count = 0
    for letter in text.lower():
        if letter in vowels:
            count += 1
    return count

def average(numbers):
    """Return the average of a list of numbers, or 0 for an empty list."""
    if len(numbers) == 0:
        return 0
    return sum(numbers) / len(numbers)

def is_leap_year(year):
    """Divisible by 4, except centuries, unless divisible by 400."""
    return (year % 4 == 0 and year % 100 != 0) or year % 400 == 0

# A table of test cases: (input, expected output)
vowel_tests = [("Mars", 1), ("AEIOU", 5), ("", 0), ("rhythm", 0), ("Orbit Around Earth", 7)]
for text, expected in vowel_tests:
    actual = count_vowels(text)
    status = "PASS" if actual == expected else "FAIL"
    print(f"count_vowels({text!r}) expected {expected}, got {actual}: {status}")

# assert stops the program loudly if a claim is false
assert average([2, 4, 6]) == 4
assert average([]) == 0
assert is_leap_year(2024) is True
assert is_leap_year(1900) is False
assert is_leap_year(2000) is True
print("All assert checks passed.")

# Print debugging: show the values at each step
total = 0
for n in [3, 5, 8]:
    total += n
    print("DEBUG: n =", n, "| total =", total)
```

Expected output:

```text
count_vowels('Mars') expected 1, got 1: PASS
count_vowels('AEIOU') expected 5, got 5: PASS
count_vowels('') expected 0, got 0: PASS
count_vowels('rhythm') expected 0, got 0: PASS
count_vowels('Orbit Around Earth') expected 7, got 7: PASS
All assert checks passed.
DEBUG: n = 3 | total = 3
DEBUG: n = 5 | total = 8
DEBUG: n = 8 | total = 16
```

Every test case was written before the function was run, and the three kinds of input (normal, edge and a case with no vowels) are all covered.

## Instructor-Guided Coding Walkthrough

1. Show a short program with one error of each kind (a missing colon, a division by zero, and an average that divides by the wrong number). Ask students which one Python found before running, which one it found while running, and which one it never found.
2. Run the division by zero and read the traceback from the bottom up. Ask students to point to the file name, the line number, the code and the error name.
3. Add debug `print()` lines to the logic error and let students find the line where the value first goes wrong.
4. Open the editor's debugger. Set a breakpoint, step through a loop and watch a variable change in the variables panel.
5. Write the test table for `count_vowels` on the board *before* showing the function, then run it.
6. Add an `assert` that is false on purpose, read the `AssertionError`, and fix the function.

Discussion questions:

- Why is a logic error harder to find than a syntax error?
- Why should the expected results be written before running the tests?
- What is the risk of fixing a bug by changing several things at once?

## Student Mission / Guided Challenge

**Explorer Challenge: Debugging Challenge**

Investigate and repair the five broken programs below. For each one: run it, read the message (if there is one), write down your hypothesis, fix **one** thing at a time and retest. Copy each program into its own file.

**Program 1: the launch greeting** (it will not run)

```py
name = input("Pilot name: ")
if name == "Nova"
    print("Welcome back, Commander!")
else:
    print("Welcome aboard, " + name)
```

**Program 2: the fuel report** (it crashes)

```py
fuel_level = 80
fuel_used = 25
print("Fuel remaining: " + fuel_leve - fuel_used)
```

**Program 3: the crew counter** (it crashes after you type a number)

```py
crew = input("How many astronauts? ")
print("Meals needed for 3 days:", crew * 3 * 3)
print("Total crew after pilot joins:", crew + 1)
```

**Program 4: the average** (it runs, but the answer is wrong)

```py
scores = [80, 90, 70]
total = 0
for score in scores:
    total += score
average = total / len(scores) + 1
print("Average score:", average)
```

**Program 5: the countdown** (it never finishes)

```py
count = 5
while count > 0:
    print("T-minus", count)
    count + 1
print("Liftoff!")
```

For every program, finish by:

1. Naming the **kind** of error (syntax, runtime or logic) and the error name if there is one.
2. Writing at least **three test cases** (a normal case, an edge case and an invalid case) in a table.
3. Adding at least one `assert` or test loop that would have caught the bug.

**Bonus objective:** Write your own broken program with a hidden logic error, swap it with a classmate and see who finds it faster.

## Common Mistakes

- Changing code at random instead of reading the error message and forming a hypothesis.
- Reading the traceback from the top instead of the bottom.
- Fixing the symptom (the wrong output) instead of the cause.
- Testing only the cases you know work.
- Leaving debugging `print()` lines in a finished program.
- Writing the expected result *after* seeing the actual output, so the test cannot fail.

## Lesson Recap

Debugging is a method, not a mystery. You learned to tell syntax, runtime and logic errors apart, to read a traceback from the bottom up, and to look inside a program with `print()` and with a debugger's breakpoints. You wrote test cases with normal, edge and invalid inputs, used `assert` to check functions automatically, and followed a systematic routine: reproduce, read, isolate, hypothesise, change one thing, retest. These habits will save you hours in every project you build.

## Homework / Extension Mission

**Solo Mission: Anomaly Report**

Create a debugging portfolio page in a file called `anomaly_report.md` plus a Python file `fixed_programs.py`. Your submission must include:

1. Three short programs of your own, each with a different deliberate bug: one syntax error, one runtime error and one logic error. Keep the broken versions in the report.
2. For each bug: the exact error message (or "no error message"), the line where the problem was, your hypothesis, what you changed and how you confirmed the fix.
3. In `fixed_programs.py`, the corrected versions of the three programs as functions.
4. A table of at least five test cases for each function (normal, edge and invalid inputs).
5. At least three `assert` statements per function, and a final line that prints `All tests passed` only when they all pass.
6. A short paragraph on the debugging step you find hardest and one tip you would give another student.

## Portfolio Connection

Every portfolio project in this program needs testing. Before you call your **Text-Based Adventure Game** finished, try to break it with directions that do not exist. Your **Personal Expense Tracker** must survive a negative amount and a missing file, and your **Library Management System** must cope with borrowing a book that is already out. In Lesson 6 you will learn to *handle* the errors you have learned to find, so that your programs keep running instead of crashing.
