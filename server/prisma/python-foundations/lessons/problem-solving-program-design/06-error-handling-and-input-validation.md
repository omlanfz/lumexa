# Lumexa Mission Log: Problem Solving & Program Design

**Course/Path:** Problem Solving & Program Design
**Lesson:** 06 of 08
**Title:** Error Handling & Input Validation
**Duration:** 60 minutes
**Difficulty:** Beginner
**Technology:** Python 3

---

## Mission Brief

A rover on Mars cannot stop and wait for a technician every time something unexpected happens. If a wheel slips or a sensor sends nonsense, the software must notice, deal with the problem and carry on, or at least shut down safely. In the last lesson you learned to *find* errors. Today you learn to *handle* them. You will use `try` and `except` to catch problems before they crash a program, validate the information users type, and raise your own exceptions when something is not acceptable. Then you will build a **Secure Registration and Login Simulator** that no clumsy typist can break.

## Learning Objectives

1. Explain what an exception is and name the most common ones.
2. Catch errors with `try` and `except`.
3. Use `else` and `finally` blocks correctly.
4. Handle specific exceptions in different ways.
5. Validate user input and keep asking until it is correct.
6. Raise your own exceptions with `raise`.

## Prerequisites

- Lesson 5: you can read a traceback and name the common error types.
- From Course 1: you can use a `while` loop to repeat until a condition is met.

## Concept Explanation

### Understanding exceptions

When Python cannot carry out an instruction, it creates an **exception** (an object that describes the problem) and **raises** it. If nothing deals with the exception, the program stops and prints a traceback. You have already met several:

| Exception | Typical cause |
|---|---|
| `ValueError` | The right type, but a value that cannot be used: `int("abc")` |
| `TypeError` | The wrong type for an operation: `"5" + 3` |
| `ZeroDivisionError` | Dividing by zero: `10 / 0` |
| `IndexError` | A list position that does not exist: `items[99]` |
| `KeyError` | A dictionary key that does not exist: `data["missing"]` |
| `FileNotFoundError` | Opening a file that is not there |
| `NameError` | Using a variable that was never defined |

### Catching errors with `try` and `except`

Put the risky code in a `try` block and say what to do in an `except` block. If no error happens, the `except` block is skipped; if one does, Python jumps straight to it instead of crashing:

```python
try:
    crew = int(input("Crew size: "))
    print("Meals per day:", crew * 3)
except ValueError:
    print("Please type a whole number.")
```

### Handling specific exceptions

Name the exception you expect. A bare `except:` that catches everything would also hide your own typing mistakes and make bugs impossible to find. You can handle several different exceptions in different ways:

```python
try:
    speed = distance / hours
except ZeroDivisionError:
    print("Hours cannot be zero.")
except TypeError:
    print("Distance and hours must be numbers.")
```

You can also capture the error itself to show its message: `except ValueError as error:` and then `print(error)`.

### `else` and `finally`

Two optional blocks make `try` statements tidier:

- **`else`** runs only if the `try` block finished **without** an error. Put the code that depends on success there.
- **`finally`** runs **always**, whether or not an error occurred. It is the place for clean-up, such as closing a file or printing a final message.

```python
try:
    number = int(text)
except ValueError:
    print("Not a number")
else:
    print("Got", number)
finally:
    print("Input step finished")
```

### Validating user input

**Input validation** means checking that what the user typed is acceptable *before* using it. The classic pattern is a loop that keeps asking until the answer is valid:

```python
def read_number(prompt, low, high):
    while True:
        text = input(prompt)
        try:
            number = int(text)
        except ValueError:
            print("  That is not a whole number. Try again.")
            continue
        if number < low or number > high:
            print(f"  Please choose a number from {low} to {high}.")
            continue
        return number
```

Validation has two layers: *Is it the right type?* (`try`/`except`) and *is it an acceptable value?* (`if`). Wrapping the pattern in a function means you write it once and use it for every question in your program.

### Raising exceptions with `raise`

You can raise an exception yourself when a function receives something unacceptable. This lets the function report the problem instead of quietly returning nonsense:

```python
def set_fuel(percent):
    if percent < 0 or percent > 100:
        raise ValueError("fuel must be between 0 and 100")
    return percent
```

The code that *calls* the function can then catch the problem with `try` and `except`. Choose the exception type that best describes the problem, and write a message that tells the user what to fix.

### Creating reliable programs

A reliable program expects the unexpected. Before you finish any program, ask: *What if the user types nothing? Text instead of a number? A negative number? A key that does not exist? A file that is missing?* Handle what you reasonably can, and never hide an error silently: tell the user what went wrong and what to do next.

## Key Vocabulary

| Term | Definition |
|---|---|
| **Exception** | An object that Python creates when it cannot carry out an instruction. |
| **Raise** | To create and trigger an exception. |
| **`try`** | The block that contains code that might cause an exception. |
| **`except`** | The block that runs when a matching exception happens. |
| **`else` (in `try`)** | The block that runs only when the `try` block had no exception. |
| **`finally`** | The block that always runs at the end, error or not. |
| **Input validation** | Checking that input is acceptable before using it. |
| **Robust** | Able to keep working when something unexpected happens. |
| **Error message** | The text that tells the user what went wrong and how to fix it. |
| **Sentinel loop** | A loop that repeats until the user gives an acceptable answer. |

## Code Example: Safe Landing Console

```python
# safe_console.py
# try / except / else / finally, validation and raise

def read_number(prompt, low, high):
    """Keep asking until the user types a whole number from low to high."""
    while True:
        text = input(prompt)
        try:
            number = int(text)
        except ValueError:
            print("  That is not a whole number. Try again.")
            continue
        if number < low or number > high:
            print(f"  Please choose a number from {low} to {high}.")
            continue
        return number

def safe_divide(a, b):
    """Divide a by b, returning None when b is zero."""
    try:
        result = a / b
    except ZeroDivisionError:
        print("  Cannot divide by zero.")
        return None
    else:
        return result
    finally:
        print("  (division attempted)")

def validate_callsign(callsign):
    """Return the callsign in capitals, or raise ValueError."""
    if len(callsign) < 3:
        raise ValueError("a callsign needs at least 3 characters")
    if not callsign.isalnum():
        raise ValueError("a callsign may only contain letters and digits")
    return callsign.upper()

crew = read_number("Crew size (1-6): ", 1, 6)
print("Crew size accepted:", crew)

print(safe_divide(10, 4))
print(safe_divide(10, 0))

for attempt in ["nova7", "ab", "no va!"]:
    try:
        print("Accepted:", validate_callsign(attempt))
    except ValueError as error:
        print("Rejected:", attempt, "->", error)

cargo = {"oxygen": 5}
try:
    print(cargo["medkit"])
except KeyError as error:
    print("Missing cargo item:", error)
```

Expected output:

```text
Crew size (1-6): abc
  That is not a whole number. Try again.
Crew size (1-6): 9
  Please choose a number from 1 to 6.
Crew size (1-6): 4
Crew size accepted: 4
  (division attempted)
2.5
  Cannot divide by zero.
  (division attempted)
None
Accepted: NOVA7
Rejected: ab -> a callsign needs at least 3 characters
Rejected: no va! -> a callsign may only contain letters and digits
Missing cargo item: 'medkit'
```

In this run the user typed `abc`, then `9`, then `4`. The first two were rejected by the two layers of validation, and only the third was accepted. Notice that `finally` printed its message even for the division that worked, and that `raise` let the function reject bad callsigns while the *caller* decided what to do about it.

## Instructor-Guided Coding Walkthrough

1. Run `int(input("Crew size: "))` and type a word. Read the `ValueError`. Then wrap it in `try` and `except` and run it again.
2. Show a bare `except:` hiding a typing mistake such as a misspelled variable, and use it to explain why we name the exception.
3. Write `read_number()` step by step. Ask students to name the two things it checks, and test it with `abc`, `0`, `99` and a valid number.
4. Add `else` and `finally` to a division example. Ask students to say in what order the blocks run when the division works and when it fails.
5. Write `validate_callsign()` with `raise`. Call it from a `try` block and print the error message.
6. Ask students to list what could go wrong in a program they have already written and handle two of the risks.

Discussion questions:

- Why is it better to catch `ValueError` than any error at all?
- When should a function `raise` an exception and when should it return a special value?
- What is the difference between a program that is *correct* and one that is *robust*?

## Student Mission / Guided Challenge

**Explorer Challenge: Secure Registration and Login Simulator**

Build `login_simulator.py`, a registration and login system for a make-believe space academy. It is a **simulation**: never use a real password, and remember that real systems never store passwords as plain text (they store a scrambled version called a *hash*).

1. Store the users in a dictionary of username to password. Start it empty.
2. Write `validate_username(name)` that raises `ValueError` with a clear message when the name is shorter than 3 or longer than 12 characters, contains anything other than letters and digits, or already exists.
3. Write `validate_password(password, username)` that raises `ValueError` unless the password has at least 8 characters, at least one digit, at least one capital letter and does not contain the username.
4. Write `register()` that asks for the details inside a loop. It catches the `ValueError` from your validators, prints the message and asks again.
5. Write `login()` that gives the user three attempts. A wrong password shows how many attempts remain, and after the third it prints a lockout message.
6. Build a menu loop (register, log in, quit). Use `try` and `except` so that typing a letter at the menu does not crash the program.
7. Use `finally` or `else` at least once, and write a test table of at least eight inputs (valid and invalid) with the result you expect for each.

**Bonus objective:** Count the failed logins per user in a dictionary and lock the account after five failures in total.

## Common Mistakes

- Using a bare `except:` that hides every kind of error, including your own mistakes.
- Putting too much code in the `try` block, so you cannot tell which line failed.
- Catching an error and doing nothing (`pass`), so the problem silently disappears.
- Forgetting `continue` in a validation loop, so the program carries on with bad data.
- Printing an error message that does not tell the user how to fix the problem.
- Validating only the type (`int()` worked) and forgetting to check the range or the length.

## Lesson Recap

You learned that exceptions are Python's way of reporting a problem, and that you can catch them with `try` and `except`, name the specific ones you expect, and add `else` and `finally` blocks for tidy code. You wrote a reusable validation loop, raised your own exceptions with `raise`, and thought about what could go wrong before it does. Programs that handle the unexpected feel professional, and they are the ones people trust.

## Homework / Extension Mission

**Solo Mission: Mission Data Validator**

Create `data_validator.py` that protects a mission database from bad data. Your program must:

1. Write `read_int(prompt, low, high)`, `read_float(prompt, low, high)` and `read_choice(prompt, valid_options)` functions that keep asking until the answer is acceptable.
2. Write a function `validate_astronaut(record)` that takes a dictionary with a `name`, an `age` and a `height_cm` and raises a `ValueError` with a specific message for each rule that is broken.
3. Ask the user for three astronaut records, catching and reporting every `ValueError` without crashing, and keep only the valid records in a list.
4. Handle a `KeyError` if a record is missing one of its keys and a `TypeError` if a value has the wrong type.
5. Use `else` to print a success message and `finally` to print how many records were checked.
6. Include a table of at least ten test inputs (normal, edge and invalid) with the expected result of each, and a loop that checks your validators against the table.

## Portfolio Connection

Today you start your third portfolio project of Course 2, the **Personal Expense Tracker** (Part 1). Error handling is what makes a project feel finished: Part 1 checks every amount, date and category before it accepts an expense, and keeps asking until the answer is valid. In Lesson 7 you finish the tracker (Part 2) with files, so that the expenses are still there tomorrow. Your **Library Management System** can use the same tools: it must refuse to lend a book that is already out. All of them use the exact tools from today: `try` and `except`, validation loops and `raise`.
