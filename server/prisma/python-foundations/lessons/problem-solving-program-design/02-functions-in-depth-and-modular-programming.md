# Lumexa Mission Log: Problem Solving & Program Design

**Course/Path:** Problem Solving & Program Design
**Lesson:** 02 of 08
**Title:** Functions in Depth & Modular Programming
**Duration:** 60 minutes
**Difficulty:** Beginner
**Technology:** Python 3

---

## Mission Brief

A space station is not one giant machine. It is built from modules: a life-support module, a laboratory, a docking port. Each is designed and tested separately, then joined together. Great programs are built the same way. In Course 1 you wrote your first functions. Today you take them much further: you will call them in more flexible ways, return several results at once, understand exactly where variables live, and then move your functions into **modules** (separate files) that any program can import. By the end you will have built a reusable **Modular Utility Toolkit**.

## Learning Objectives

1. Use positional and keyword arguments and default values confidently.
2. Return one or several values from a function.
3. Explain variable scope, and the difference between local and global variables.
4. Organise code into small functions that each do one job.
5. Create your own module and import it into another file.
6. Use the `if __name__ == "__main__":` pattern to make a file both reusable and runnable.

## Prerequisites

- From Course 1: you can define and call a function with parameters and `return`.
- You can create and save more than one `.py` file in the same folder.

## Concept Explanation

### Revisiting functions and why they matter

A function lets you give a name to a job, test it once and reuse it everywhere. As programs grow beyond fifty lines, functions are what keep them readable. A useful rule: **if you copy and paste code, it probably wants to be a function.**

### Positional and keyword arguments

You can pass arguments **by position**, so the first value goes to the first parameter, or **by keyword**, where you name the parameter yourself. Keyword arguments can be in any order and make calls much easier to read:

```python
def describe_trip(destination, distance_km, crew):
    return f"{crew} astronauts travel {distance_km} km to {destination}."

print(describe_trip("Mars", 225000000, 4))                          # positional
print(describe_trip(crew=4, destination="Mars", distance_km=225000000))  # keyword
print(describe_trip("Mars", crew=4, distance_km=225000000))         # a mix
```

When you mix the two, positional arguments must come first.

### Default arguments and return values

A parameter with a default value is optional. Make sure it comes **after** the parameters without defaults:

```python
def greet(name, role="Cadet"):
    return f"Welcome, {role} {name}!"

print(greet("Nova"))                 # Welcome, Cadet Nova!
print(greet("Orion", "Pilot"))       # Welcome, Pilot Orion!
```

A function ends as soon as it reaches `return`, and the value it returns can be stored, printed, compared or passed straight into another function.

### Returning multiple values

A function can return several values at once. Python packages them into a tuple, and you can **unpack** them into separate variables:

```python
def summarise(numbers):
    return min(numbers), max(numbers), sum(numbers) / len(numbers)

lowest, highest, average = summarise([72, 45, 88, 50])
print(lowest, highest, average)       # 45 88 63.75
```

### Understanding variable scope

Python looks for a variable in this order: first **inside the current function** (local), then **outside** it (global). A local variable disappears when the function ends. Two functions can use the same local name without any conflict, because each has its own private copy:

```python
def stage_one():
    fuel = 40
    return fuel

def stage_two():
    fuel = 25          # a different variable, local to stage_two
    return fuel
```

Avoid changing global variables inside functions. If a function needs a value, pass it in as a parameter; if it produces one, return it. Functions written like this are easy to test and reuse.

### Organising code into smaller functions

Compare one 60-line block with a program made of five 10-line functions and a `main()` that calls them. The second is easier to read, easier to test (you can test each function alone) and easier to change. Aim for functions that do **one** thing, have a name that starts with a verb, and fit on one screen.

### Introduction to Python modules

A **module** is simply a Python file whose functions other files can use. Suppose you save these functions in a file called `toolkit.py`:

```python
# toolkit.py
def km_to_miles(km):
    return km * 0.621371

def format_duration(total_minutes):
    hours = total_minutes // 60
    minutes = total_minutes % 60
    return f"{hours} h {minutes:02d} min"
```

### Importing and reusing code from other files

In another file in the **same folder**, bring the module in with `import`:

```python
# main.py
import toolkit

print(toolkit.km_to_miles(100))
print(toolkit.format_duration(125))
```

You can also import just the names you need, or give a module a shorter nickname:

```python
from toolkit import km_to_miles, format_duration
import toolkit as tk
```

Python also comes with a large **standard library** of ready-made modules, such as `math` and `random`, which you import the same way.

### Making a file both runnable and importable

When Python imports a module it runs the whole file. If your module has test code at the bottom, that code would run every time someone imports it. The guard below prevents that. The code inside runs only when you run the file directly, not when it is imported:

```python
if __name__ == "__main__":
    print(km_to_miles(10))      # quick self-test
```

## Key Vocabulary

| Term | Definition |
|---|---|
| **Positional argument** | An argument matched to a parameter by its position in the call. |
| **Keyword argument** | An argument passed with the parameter's name, such as `crew=4`. |
| **Default argument** | A value a parameter takes when the caller does not provide one. |
| **Return value** | The result a function sends back to the code that called it. |
| **Unpacking** | Assigning the values of a tuple to separate variables in one line. |
| **Scope** | The part of a program in which a variable can be used. |
| **Module** | A Python file whose functions and variables can be imported by other files. |
| **`import`** | The statement that makes a module's contents available. |
| **Standard library** | The collection of modules that comes with Python. |
| **`__name__`** | A special variable that is `"__main__"` when a file is run directly. |

## Code Example: Mission Utility Toolkit

```python
# toolkit_demo.py
# Arguments, multiple return values and a main() guard in one file

def km_to_miles(km):
    """Convert kilometres to miles."""
    return km * 0.621371

def format_duration(total_minutes):
    """Turn a number of minutes into text such as '2 h 05 min'."""
    hours = total_minutes // 60
    minutes = total_minutes % 60
    return f"{hours} h {minutes:02d} min"

def summarise(numbers):
    """Return the lowest, highest and average of a list of numbers."""
    return min(numbers), max(numbers), sum(numbers) / len(numbers)

def describe_trip(destination, distance_km, crew=3):
    """Describe a trip with a default crew size."""
    miles = km_to_miles(distance_km)
    return f"{crew} astronauts travel {distance_km} km ({miles:.1f} miles) to {destination}."

def main():
    print(describe_trip("the Moon", 384400))
    print(describe_trip(destination="Mars", distance_km=225000000, crew=4))
    print("Burn time:", format_duration(125))
    lowest, highest, average = summarise([72, 45, 88, 50])
    print(f"Lowest {lowest}, highest {highest}, average {average}")

if __name__ == "__main__":
    main()
```

Expected output:

```text
3 astronauts travel 384400 km (238855.0 miles) to the Moon.
4 astronauts travel 225000000 km (139808475.0 miles) to Mars.
Burn time: 2 h 05 min
Lowest 45, highest 88, average 63.75
```

Each function does one job and `describe_trip()` reuses `km_to_miles()`. If this file were saved as `toolkit_demo.py` and imported from another file, the guard at the bottom would stop `main()` from running by itself.

## Instructor-Guided Coding Walkthrough

1. Call `describe_trip()` three ways (positional, keyword and mixed) and ask which is easiest to read, and why.
2. Return a single value, then three values, from `summarise()`. Show the tuple that comes back and the unpacking into three variables.
3. Create the same variable name in two functions and print both. Use it to explain that scope keeps functions separate.
4. Save `toolkit.py` and `main.py` in the same folder. Run `main.py` and show the import working. Then move one file into another folder and read the `ModuleNotFoundError`.
5. Add test code to the bottom of `toolkit.py` without the guard. Import the module and watch the test code run. Add the guard and run again.
6. Refactor a long block of the Lesson 1 planner into three functions with the class.

Discussion questions:

- Why is it better for a function to return a value than to print it?
- When would you choose keyword arguments over positional ones?
- How does a module help a team of people work on one program?

## Student Mission / Guided Challenge

**Explorer Challenge: Modular Utility Toolkit**

Create a reusable toolkit and a program that uses it.

1. Create `toolkit.py` with at least six functions, each with a docstring: a unit converter (for example `km_to_miles`), a function that formats a number of seconds as `h:mm:ss`, a function returning the lowest, highest and average of a list, a function that checks whether a number is a prime, a function that builds a title banner and a function of your own.
2. Make at least one function use a default argument and one return several values.
3. Add a test section at the bottom of `toolkit.py` protected by `if __name__ == "__main__":`.
4. Create `main.py` in the same folder and import the toolkit in two different ways: `import toolkit` and `from toolkit import ...`.
5. In `main.py`, build a menu loop that lets the user pick a tool, ask for the input it needs, call your function and display the result.
6. Call at least one of your functions with keyword arguments, and unpack at least one multiple return value.
7. Make sure importing `toolkit` prints nothing by itself.

**Bonus objective:** Import the standard `math` module in your toolkit and use it in one of your functions.

## Common Mistakes

- Putting a positional argument after a keyword argument.
- Giving a default value to a parameter that comes before one without a default.
- Using `print()` where `return` was needed, so the caller cannot reuse the result.
- Expecting a local variable from one function to exist in another.
- Saving the module in a different folder from the program that imports it, or misspelling its name.
- Naming your own file the same as a standard module, such as `random.py`, which hides the real one.

## Lesson Recap

You deepened your use of functions: positional, keyword and default arguments; multiple return values; and scope. You learned to build programs from small functions that each do one job. Then you went one step further and moved functions into a module, imported them into another file and protected test code with the `__name__` guard. Modular programs are easier to read, test, share and extend.

## Homework / Extension Mission

**Solo Mission: Rover Maintenance Module**

Create a module for a rover maintenance crew, plus a program that uses it. Your submission must include:

1. A file `rover_tools.py` with at least five functions, each with a docstring and a clear verb-based name. Include a function that returns more than one value and a function with a default argument.
2. At least one function that calls another function from the same module.
3. A test section at the bottom of `rover_tools.py` that runs only when the file is executed directly.
4. A file `maintenance_log.py` that imports your module, asks the user for inputs (battery percentage, wheel temperatures, hours driven) and prints a clear maintenance report that uses every function.
5. Use keyword arguments in at least two of your calls.
6. A comment at the top of each file that explains its purpose.

Finish with a short note on a decision you made about which function a piece of code should live in.

## Portfolio Connection

Modular thinking is behind all three portfolio projects of this course. The **Text-Based Adventure Game** is built from small functions such as `show_room()` and `get_choice()`. The **Personal Expense Tracker** keeps its file-handling code in its own functions, and the **Library Management System** goes one step further and groups functions and data into classes. The functions you reuse from your toolkit will save you time in every one of them.
