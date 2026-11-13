# Lumexa Mission Log: Python Programming Essentials

**Course/Path:** Python Programming Essentials
**Lesson:** 08 of 08
**Title:** Creating Reusable Code with Functions
**Duration:** 60 minutes
**Difficulty:** Beginner
**Technology:** Python 3

---

## Mission Brief

Mission Control does not rewrite the landing procedure for every mission. The procedure is written once, tested, named, and called whenever it is needed. In programming, a named, reusable block of code is called a **function**, and you have been using them since your first lesson: `print()`, `input()` and `len()` are all functions that someone else wrote. Today you learn to write your own. It is the last lesson of the course, so you will also pull everything together into your capstone project: the **Python Quiz Master**.

## Learning Objectives

1. Explain what a function is and why reusing code is better than copying it.
2. Define and call a function with `def`.
3. Pass information in with parameters and arguments, including default values.
4. Send results back with `return`.
5. Explain local and global scope.
6. Organise a program into small functions that work with loops and collections.

## Prerequisites

- Lesson 7: you can store and loop through lists, tuples and dictionaries.
- Lessons 4 and 5: you can use `if` statements and loops confidently.

## Concept Explanation

### What is a function?

A **function** is a named block of code that does one job. You **define** it once and **call** it as many times as you like. Functions give you three big benefits:

- **Reuse:** write the code once, use it everywhere.
- **Clarity:** a name such as `calculate_fuel()` explains the job better than ten lines of arithmetic.
- **Easier fixing:** if there is a bug, you fix it in one place.

### Defining and calling a function

You define a function with the keyword `def`, a name, brackets and a colon. The body is indented:

```python
def print_banner():
    print("=" * 25)
    print("   MISSION CONTROL")
    print("=" * 25)

print_banner()     # call it
print_banner()     # and again
```

Defining a function does not run it. The code inside only runs when you **call** it by writing its name followed by brackets.

### Parameters and arguments

A **parameter** is a variable in the function's definition that receives information. An **argument** is the actual value you pass when you call the function:

```python
def greet(name, role):          # name and role are parameters
    print(f"Welcome, {role} {name}!")

greet("Nova", "Commander")      # "Nova" and "Commander" are arguments
greet("Orion", "Pilot")
```

The arguments are matched to the parameters in order.

### Returning values

`print()` shows something on the screen, but a function often needs to **send a value back** so that other code can use it. That is the job of `return`:

```python
def celsius_to_fahrenheit(celsius):
    return celsius * 9 / 5 + 32

temp = celsius_to_fahrenheit(100)
print(temp)                              # 212.0
print(celsius_to_fahrenheit(0) + 10)     # 42.0
```

When Python reaches `return`, the function ends immediately and hands back the value. A function with no `return` gives back the special value `None`.

### Default parameters

Give a parameter a default value and it becomes optional:

```python
def fuel_needed(distance_km, burn_rate=2.5):
    return distance_km / 100 * burn_rate

print(fuel_needed(400))        # uses the default burn rate: 10.0
print(fuel_needed(400, 3))     # overrides it: 12.0
```

Parameters with defaults must come after those without.

### Local and global scope

**Scope** is the part of a program where a variable can be used. A variable created inside a function is **local**: it exists only while the function runs, and the rest of the program cannot see it. A variable created outside every function is **global**, and functions can read it:

```python
rocket = "Aurora"           # global

def show_stage():
    stage = 2               # local to show_stage
    print(rocket, "is on stage", stage)

show_stage()
print(stage)                # NameError: stage only exists inside the function
```

The safest habit is to pass information **in** with parameters and get results **out** with `return`, instead of depending on global variables.

### Combining functions with loops and collections

Functions work happily with everything you have learned. A function can loop over a list it receives, and your own loop can call a function many times:

```python
def average(numbers):
    return sum(numbers) / len(numbers)

for crew_scores in ([80, 90], [70, 75, 80]):
    print(average(crew_scores))
```

### Organising a program into small, reusable parts

Professional programs are built from many small functions that each do one thing, plus a short `main()` function that calls them in order. A good function has a clear name that starts with a verb (`calculate_total`, `ask_question`), does one job, and has a one-line description in triple quotes right under the `def` line (a **docstring**).

## Key Vocabulary

| Term | Definition |
|---|---|
| **Function** | A named block of code that does one job and can be reused. |
| **`def`** | The keyword used to define a function. |
| **Call** | To run a function by writing its name with brackets. |
| **Parameter** | A variable in a function definition that receives a value. |
| **Argument** | The actual value passed to a function when it is called. |
| **`return`** | Sends a value back from a function and ends it. |
| **Default parameter** | A parameter with a value to use when no argument is given. |
| **Scope** | The part of a program where a variable can be used. |
| **Local variable** | A variable created inside a function, usable only there. |
| **Docstring** | A short description in triple quotes at the start of a function. |

## Code Example: Mission Toolkit

```python
# mission_toolkit.py
# Functions: parameters, return values, default parameters and scope

def print_banner(title):
    """Print a title between two lines."""
    print("=" * 30)
    print(title.center(30))
    print("=" * 30)

def celsius_to_fahrenheit(celsius):
    """Convert a temperature from Celsius to Fahrenheit."""
    return celsius * 9 / 5 + 32

def fuel_needed(distance_km, burn_rate=2.5):
    """Fuel needed for a trip. burn_rate is the fuel used per 100 km."""
    return distance_km / 100 * burn_rate

def describe_crew(crew):
    """Return a sentence about a list of crew names."""
    return f"{len(crew)} astronauts on board: " + ", ".join(crew)

def count_passed(scores, pass_mark=50):
    """How many scores reach the pass mark?"""
    passed = 0
    for score in scores:
        if score >= pass_mark:
            passed += 1
    return passed

def main():
    print_banner("MISSION TOOLKIT")
    print("Cabin temperature:", celsius_to_fahrenheit(21), "F")
    print("Fuel for 400 km:", fuel_needed(400))
    print("Fuel for 400 km (heavy ship):", fuel_needed(400, burn_rate=4))
    print(describe_crew(["Nova", "Orion", "Lyra"]))
    exam = [72, 45, 88, 50, 31]
    print("Passed:", count_passed(exam), "of", len(exam))

main()
```

Expected output:

```text
==============================
       MISSION TOOLKIT        
==============================
Cabin temperature: 69.8 F
Fuel for 400 km: 10.0
Fuel for 400 km (heavy ship): 16.0
3 astronauts on board: Nova, Orion, Lyra
Passed: 3 of 5
```

Look at the structure: five small functions that each do one job, and a `main()` that calls them in order. The call `fuel_needed(400, burn_rate=4)` shows that you can name an argument as you pass it.

## Instructor-Guided Coding Walkthrough

1. Start with the same three-line banner printed three times by copy and paste. Then define `print_banner()` and ask students what is better now.
2. Define a function but do not call it. Run the program and ask why nothing happened. Then call it.
3. Write `greet(name, role)` and call it with the arguments in the wrong order. Ask what the output means.
4. Compare a function that prints a result with one that returns it. Show that only the second can be used inside another calculation.
5. Demonstrate local scope: print a variable from inside the function after the call and read the `NameError`.
6. Refactor the earlier Lesson 3 calculator live: move the operations into functions and call them from `main()`.

Discussion questions:

- What is the difference between a parameter and an argument?
- Why is `return` more flexible than `print()` inside a function?
- What makes a function name a good one?

## Student Mission / Guided Challenge

**Capstone Project: Python Quiz Master**

Build `quiz_master.py`, an interactive quiz application, from reusable functions. This is your third portfolio project, and a guided Google Colab version is linked in the Project section below this lesson.

1. Store at least eight questions in a list. Each question is a tuple with the question text, a list of four answer options and the number of the correct option (1 to 4).
2. Write `ask_question(number, question, options, correct)` that prints the question and the numbered options, asks for the answer and **returns** `True` or `False`.
3. Validate the answer: if the player types something that is not a number from 1 to 4, ask again instead of marking it wrong. Use a `while` loop.
4. Write `show_feedback(is_correct, explanation)` that prints a different message for a right and a wrong answer.
5. Keep a score in `main()`: loop over the questions, call `ask_question()` for each and add one point for every right answer.
6. Write `show_results(score, total)` that prints the score, the percentage and a rank such as **Cadet**, **Pilot** or **Commander** based on the percentage.
7. Add a default parameter somewhere sensible, for example a `pass_mark=60` in `show_results()`.
8. Use clear function names, a docstring for each function and a `main()` function that starts the quiz.

**Bonus objective:** Shuffle the questions with `random.shuffle()`, ask only five of them per game and keep track of the best score.

## Common Mistakes

- Defining a function but forgetting to call it.
- Forgetting the brackets when calling, as in `print_banner` instead of `print_banner()`.
- Using `print()` where `return` was needed, so the answer cannot be stored or reused.
- Writing code after `return` that can never run, because `return` ends the function.
- Trying to use a function's local variable outside it.
- Putting a parameter with a default value before a parameter without one.

## Lesson Recap

A function is a named, reusable block of code. You defined functions with `def`, passed information in with parameters, sent results out with `return`, gave parameters default values and learned why local variables stay inside their functions. You combined functions with loops and collections and organised a whole program into small parts under a `main()` function. That is the style of real software, and it completes your first course: you can now write complete, interactive Python programs of your own.

## Homework / Extension Mission

**Solo Mission: Quiz Master, Version 2**

Extend your `quiz_master.py` into a better quiz. Your program must:

1. Add at least five new questions, bringing the total to at least thirteen, on a topic you love (space, sport, music, anything).
2. Group the questions into at least two categories stored in a dictionary (category name to a list of questions), and let the player choose a category at the start.
3. Add a function `choose_category(categories)` that shows the categories, validates the player's choice and returns the chosen list of questions.
4. Write a function `calculate_rank(percentage)` that **returns** a rank name, and use it in your results.
5. Track the best score of the session in a variable that is passed and returned between functions rather than using a global variable.
6. Write at least one function that does not print anything at all but only returns a value, and explain in a comment why that is useful.

Test every function on its own before testing the whole quiz, and note one bug you found along the way.

## Portfolio Connection

The **Python Quiz Master** is the capstone of Course 1 and the third project in your portfolio. It shows that you can combine variables, input, decisions, loops, strings, collections and functions into one finished application, and that is the foundation for Course 2. There you will learn to plan programs before you code them, find and fix bugs, handle errors, save data to files and organise your code with classes.
