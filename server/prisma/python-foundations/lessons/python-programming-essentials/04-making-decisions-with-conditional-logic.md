# Lumexa Mission Log: Python Programming Essentials

**Course/Path:** Python Programming Essentials
**Lesson:** 04 of 08
**Title:** Making Decisions with Conditional Logic
**Duration:** 60 minutes
**Difficulty:** Beginner
**Technology:** Python 3

---

## Mission Brief

Ten seconds before launch, a computer checks the fuel, the weather and the crew. If everything is fine it says GO; if one thing is wrong it says HOLD and explains why. Programs are only useful when they can make choices like this, running some instructions and skipping others depending on what is true right now. In Python the tool for making choices is the `if` statement. Today you will learn to ask questions with Boolean expressions and to build decision-making programs that respond differently to different situations.

## Learning Objectives

1. Write Boolean expressions that give `True` or `False`.
2. Write `if`, `elif` and `else` statements with correct indentation.
3. Use comparison and logical operators to build conditions.
4. Nest one conditional statement inside another.
5. Combine several conditions into one decision.
6. Plan and build a decision-making program that handles every case.

## Prerequisites

- Lesson 3: you can use `input()`, convert text to numbers, and use comparison and logical operators.
- You understand that a comparison such as `fuel < 20` produces `True` or `False`.

## Concept Explanation

### Boolean expressions

A **Boolean expression** is any piece of code that works out to `True` or `False`. Comparisons are the most common kind:

```python
fuel = 45
print(fuel < 50)       # True
print(fuel == 100)     # False
print(fuel != 0)       # True
```

Text can be compared too, but case matters: `"Yes" == "yes"` is `False`. When you read answers typed by a person, convert them to lowercase first with `.lower()`, then compare:

```python
answer = input("Ready? (yes/no): ").lower()
print(answer == "yes")
```

### The `if` statement

An `if` statement runs a block of code **only when** its condition is `True`:

```python
fuel = 15
if fuel < 20:
    print("WARNING: fuel is low")
    print("Return to base")
print("Status check complete")
```

Two details are essential:

- The line with `if` ends with a **colon** `:`.
- The lines that belong to the `if` are **indented** by four spaces. The first line that is not indented is back in the main program, so `"Status check complete"` is always printed.

Indentation is not decoration. It is how Python knows which lines belong together, and it is the reason Lesson 1 told you not to add stray spaces.

### `else`: the other branch

`else` gives a block that runs when the condition is `False`:

```python
if fuel < 20:
    print("Refuel now")
else:
    print("Fuel is fine")
```

### `elif`: several choices in a row

`elif` (short for "else if") lets you check more than two possibilities. Python tests the conditions from top to bottom and runs **only the first block whose condition is true**:

```python
if fuel >= 80:
    print("Fuel: excellent")
elif fuel >= 50:
    print("Fuel: good")
elif fuel >= 20:
    print("Fuel: low")
else:
    print("Fuel: critical")
```

The order matters. If you tested `fuel >= 20` first, a fuel level of 95 would be called "low", because that is the first true condition Python finds.

### Combining conditions

Use `and`, `or` and `not` to combine conditions:

```python
fuel = 75
weather = "clear"
if fuel >= 60 and weather == "clear":
    print("Good to go")
if weather == "storm" or fuel < 20:
    print("Do not launch")
if not weather == "storm":
    print("No storm today")
```

`and` needs both sides true; `or` needs at least one; `not` reverses the answer. The `in` operator is another useful way to combine several tests: `answer in ("y", "yes")` is `True` when the answer matches either word.

### Nested conditionals

You can put an `if` inside another `if`. The inner decision is only made when the outer condition is true:

```python
if fuel >= 50:
    if crew_ready:
        print("GO FOR LAUNCH")
    else:
        print("Waiting for the crew")
else:
    print("Refuel first")
```

Nesting is powerful but easy to overdo. If you can write the same rule with `and`, such as `if fuel >= 50 and crew_ready:`, the code is usually easier to read.

### Planning a decision-making program

Before you write conditions, write down every case. A tiny table of *situation → result* helps you spot missing cases and overlapping rules. Then ask yourself three questions about your finished program:

1. Does every possible input end in a sensible result (is there an `else`)?
2. Is the order of the `elif` checks correct?
3. Have I tested a value at every boundary, such as exactly 20 or exactly 50?

## Key Vocabulary

| Term | Definition |
|---|---|
| **Boolean expression** | Code that works out to `True` or `False`. |
| **Condition** | The Boolean expression after `if` or `elif` that decides whether a block runs. |
| **`if` statement** | Runs a block of code only when its condition is `True`. |
| **`elif`** | "Else if": another condition to test when the earlier ones were false. |
| **`else`** | The block that runs when none of the conditions above it was true. |
| **Block** | A group of indented lines that belong together. |
| **Nested conditional** | An `if` statement placed inside another `if` statement. |
| **Logical operator** | `and`, `or` or `not`, used to combine conditions. |
| **Boundary value** | A value exactly on the edge of a rule, such as 20 in `fuel < 20`. |

## Code Example: Launch Clearance Checker

```python
# launch_clearance.py
# if / elif / else with comparison and logical operators

fuel = int(input("Fuel level (0-100): "))
weather = input("Weather (clear/windy/storm): ").lower()
crew_ready = input("Is the crew ready? (yes/no): ").lower() == "yes"

print()
if fuel < 20:
    print("ABORT: not enough fuel.")
elif weather == "storm":
    print("HOLD: storm over the launch pad.")
elif weather == "windy" and fuel < 60:
    print("HOLD: windy weather needs at least 60 percent fuel.")
else:
    if crew_ready:
        print("GO FOR LAUNCH!")
    else:
        print("HOLD: waiting for the crew.")

# Combining conditions
if fuel >= 90 and weather == "clear":
    print("Bonus: perfect launch window.")
if not crew_ready or fuel < 50:
    print("Reminder: run the pre-flight checklist again.")
```

Expected output:

```text
Fuel level (0-100): 45
Weather (clear/windy/storm): Windy
Is the crew ready? (yes/no): yes

HOLD: windy weather needs at least 60 percent fuel.
Reminder: run the pre-flight checklist again.
```

In this run the user typed `45`, `Windy` and `yes`. The `elif` chain stopped at the windy-weather rule, the final `if` statements are separate checks, and `.lower()` made `Windy` match `windy`.

## Instructor-Guided Coding Walkthrough

1. Start with a single `if fuel < 20:` and run it with a value above and below 20. Ask what is different about the indentation of the last `print`.
2. Remove the indentation from a line inside the block and run it. Read the `IndentationError` together, then fix it.
3. Add `else`, then three `elif` branches for the fuel levels. Run it with 95, 55, 25 and 5.
4. Swap the order of two `elif` branches so that a high value gets the wrong answer. Ask students to explain why and to repair it.
5. Rewrite one nested `if` as a single `if ... and ...` and compare readability.
6. Test the boundaries: run the program with exactly 20, then exactly 50, and ask which branch should handle those values.

Discussion questions:

- Why must the `else` branch come last?
- When is a nested `if` clearer than `and`?
- What is the danger of testing only the "normal" values of a program?

## Student Mission / Guided Challenge

**Explorer Challenge: Smart Eligibility Checker**

Build `eligibility_checker.py`, a program that decides whether a visitor may join the Lumexa Space Camp.

1. Ask for the visitor's name and age (an integer).
2. Ask whether they have completed the safety course and whether a parent or guardian has given permission. Convert each yes/no answer into a Boolean with `.lower() == "yes"`.
3. A visitor is **eligible** when they are between 12 and 18 years old (including both), have completed the safety course, and either are 16 or older or have permission.
4. Print a clear decision that includes the visitor's name. If the answer is no, print the exact reason (age, safety course or permission), using `elif` so that only one reason is shown.
5. For eligible visitors, print their group: **Junior** for ages 12 to 14 and **Senior** for ages 15 to 18.
6. Test your program with at least six different visitors, including ages exactly 12, 18, 11 and 19.

**Bonus objective:** Give a 10 percent discount message to visitors who are 12 years old or who have completed a second course.

## Common Mistakes

- Forgetting the colon at the end of the `if`, `elif` or `else` line.
- Writing `=` instead of `==` in a condition.
- Inconsistent indentation, such as three spaces on one line and four on the next.
- Putting `else` first, or an `elif` with no `if` before it.
- Writing the checks in the wrong order, so a broad condition catches values meant for a later branch.
- Comparing text without making allowance for capital letters, such as `"Yes"` against `"yes"`.

## Lesson Recap

You gave your programs the power to choose. Boolean expressions ask questions; `if`, `elif` and `else` run the right block; `and`, `or` and `not` combine conditions; and nesting lets you ask a second question after the first. You also learned to plan every case, test the boundaries and keep the order of your checks correct. Almost every useful program is built on these ideas.

## Homework / Extension Mission

**Solo Mission: Space Weather Advisor**

Create `space_weather.py` that advises a spacewalk team. Your program must:

1. Ask for the solar wind speed in kilometres per second (a float), the radiation level from 0 to 10 (an integer) and whether a solar flare has been detected (yes or no).
2. Print one of at least four different advice messages, such as `SAFE`, `CAUTION`, `DELAY` or `ABORT`, chosen with `if`, `elif` and `else`.
3. Use `and`, `or` or `not` in at least two conditions, and use one nested `if` somewhere sensible.
4. Make sure every possible combination of inputs ends in an advice message.
5. Test it with at least eight different sets of inputs and write the results in a comment table at the bottom of the file, with columns for the inputs and the message you expected.

Finish with a comment that names one boundary value you tested and why it mattered.

## Portfolio Connection

Today you start your second portfolio project, the **Number Guessing Game** (Part 1). Part 1 is one round of the game: the program keeps a secret number and answers a single guess with "too high", "too low" or "correct", using the `if`, `elif` and `else` statements you wrote today. In Lesson 5 you finish the game (Part 2) with loops, so that the player gets several attempts. Decisions turn every project into an interactive program: in the **Python Quiz Master** (Lessons 6 and 7) every answer is marked right or wrong in the same way. You can also return to your **Smart Calculator** and let the user choose the operation instead of showing every result.
