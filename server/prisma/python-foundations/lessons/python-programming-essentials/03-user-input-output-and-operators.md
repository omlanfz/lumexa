# Lumexa Mission Log: Python Programming Essentials

**Course/Path:** Python Programming Essentials
**Lesson:** 03 of 08
**Title:** User Input, Output, and Operators
**Duration:** 60 minutes
**Difficulty:** Beginner
**Technology:** Python 3

---

## Mission Brief

So far your programs have talked and never listened. Real mission software does both: an astronaut types a command, the computer does the maths, and a clear answer appears on the display. Today you open the communication channel. You will use `input()` to ask the user for information, turn what they type into numbers, calculate with Python's operators and present the results in tidy, readable sentences. By the end of the lesson you will build your first portfolio project, the **Smart Calculator**.

## Learning Objectives

1. Collect information from the user with `input()`.
2. Convert typed input into numbers with `int()` and `float()`.
3. Display formatted output with f-strings, `sep` and `end`.
4. Use the arithmetic operators `+`, `-`, `*`, `/`, `//`, `%` and `**`.
5. Use comparison, logical and augmented assignment operators.
6. Predict the result of an expression using operator precedence and brackets.

## Prerequisites

- Lesson 2: you can create variables and convert between strings, integers and floats.
- You can run a program and read the output it prints.

## Concept Explanation

### Asking the user with `input()`

`input()` pauses the program, shows a message called a **prompt**, waits for the user to type something and press Enter, and then gives back what they typed:

```python
name = input("What is your name? ")
print("Welcome aboard,", name)
```

There is one thing you must remember: **`input()` always gives back a string**, even when the user types digits. That matters as soon as you want to calculate:

```python
crew = input("How many astronauts? ")   # the user types 4
print(crew + crew)                      # prints 44 — joined text, not maths!
```

To do maths, convert the text into a number:

```python
crew = int(input("How many astronauts? "))     # whole number
distance = float(input("Distance in km: "))    # decimal number
```

Wrapping `input()` inside `int()` or `float()` is a pattern you will use again and again.

### Formatting output with f-strings

An **f-string** is a string with an `f` in front of the opening quotation mark. Anything inside curly braces `{ }` is replaced by its value, and you can put whole calculations inside them:

```python
name = "Nova"
crew = 4
print(f"Commander {name} is leading a crew of {crew}.")
print(f"Meals needed for 3 days: {crew * 3 * 3}")
```

You can also control how numbers are displayed by adding a colon and a format after the value. `:.2f` means "a float with two decimal places" and `:,` adds thousands separators:

```python
cost = 12345.6789
print(f"Cost: ${cost:.2f}")      # Cost: $12345.68
print(f"Distance: {384400:,} km")  # Distance: 384,400 km
```

`print()` has two more helpers. `sep` changes the separator placed between items, and `end` changes what is printed at the end (a new line by default):

```python
print("Mission", "Control", sep="-")     # Mission-Control
print("Counting", end="... ")
print("done")                            # Counting... done
```

### Arithmetic operators

An **operator** is a symbol that makes Python do something with values. The arithmetic operators are:

| Operator | Meaning | Example | Result |
|---|---|---|---|
| `+` | Addition | `7 + 2` | `9` |
| `-` | Subtraction | `7 - 2` | `5` |
| `*` | Multiplication | `7 * 2` | `14` |
| `/` | Division (always a float) | `7 / 2` | `3.5` |
| `//` | Floor division (drops the remainder) | `7 // 2` | `3` |
| `%` | Modulo (the remainder) | `7 % 2` | `1` |
| `**` | Power | `2 ** 3` | `8` |

`//` and `%` work as a pair. If a rocket has 17 fuel cells and each stage uses 5, then `17 // 5` is `3` full stages and `17 % 5` is `2` cells left over.

### Comparison and logical operators

**Comparison operators** compare two values and give back a boolean, `True` or `False`:

| Operator | Meaning | Example | Result |
|---|---|---|---|
| `==` | Equal to | `5 == 5` | `True` |
| `!=` | Not equal to | `5 != 3` | `True` |
| `<` and `>` | Less than, greater than | `2 < 9` | `True` |
| `<=` and `>=` | Less than or equal, greater than or equal | `4 >= 5` | `False` |

Remember: one `=` stores a value, two `==` ask a question.

**Logical operators** combine booleans: `and` is `True` only when both sides are `True`, `or` is `True` when at least one side is, and `not` flips a value:

```python
fuel_ok = True
crew_ready = False
print(fuel_ok and crew_ready)   # False
print(fuel_ok or crew_ready)    # True
print(not crew_ready)           # True
```

### Assignment and augmented assignment

You already know `=`. **Augmented assignment** operators are shortcuts for updating a variable using its own value:

| Shortcut | Means the same as |
|---|---|
| `x += 5` | `x = x + 5` |
| `x -= 5` | `x = x - 5` |
| `x *= 2` | `x = x * 2` |
| `x /= 2` | `x = x / 2` |
| `x //= 2` and `x %= 2` and `x **= 2` | the same idea with `//`, `%` and `**` |

### Operator precedence and expressions

An **expression** is anything Python can work out to a single value, such as `2 + 3 * 4`. When an expression has several operators, Python follows an order called **precedence**, just like in maths class:

1. Brackets `( )`
2. Powers `**`
3. Multiplication, division, floor division and modulo `*  /  //  %` (left to right)
4. Addition and subtraction `+  -` (left to right)
5. Comparisons `==  !=  <  >  <=  >=`
6. `not`, then `and`, then `or`

So `2 + 3 * 4` is `14`, because the multiplication happens first, and `(2 + 3) * 4` is `20`. When in doubt, add brackets: they cost nothing and make your intention clear to the reader.

## Key Vocabulary

| Term | Definition |
|---|---|
| **Input** | Information that a user types into a program. |
| **Prompt** | The message shown to the user by `input()`. |
| **f-string** | A string starting with `f` that puts the values of expressions inside `{ }`. |
| **Operator** | A symbol, such as `+` or `==`, that makes Python work something out. |
| **Operand** | A value that an operator works on, such as the `7` and `2` in `7 + 2`. |
| **Floor division (`//`)** | Division that drops the fraction and keeps only the whole part. |
| **Modulo (`%`)** | The remainder left over after a division. |
| **Augmented assignment** | A shortcut such as `+=` that updates a variable using its old value. |
| **Expression** | A combination of values and operators that Python works out to one value. |
| **Precedence** | The order in which Python works out the operators in an expression. |

## Code Example: Mission Meal Planner

```python
# mission_calculator.py
# Input, f-strings and operators working together

commander = input("Commander name: ")
crew = int(input("Crew size: "))
days = int(input("Mission length (days): "))
meals_per_day = 3

total_meals = crew * days * meals_per_day
cost_per_meal = 4.75
food_cost = total_meals * cost_per_meal

print()
print(f"Mission report for Commander {commander}")
print(f"Total meals needed: {total_meals}")
print(f"Food budget: ${food_cost:.2f}")
print(f"Full 7-day cycles: {days // 7}, days left over: {days % 7}")

total_meals += 10  # extra emergency rations
print(f"With emergency rations: {total_meals} meals")
print("Enough crew for two shifts?", crew >= 4 and crew % 2 == 0)
```

Expected output:

```text
Commander name: Nova
Crew size: 4
Mission length (days): 30

Mission report for Commander Nova
Total meals needed: 360
Food budget: $1710.00
Full 7-day cycles: 4, days left over: 2
With emergency rations: 370 meals
Enough crew for two shifts? True
```

In this run the user typed `Nova`, `4` and `30`. Notice how `input()` text was converted with `int()`, how `//` and `%` split 30 days into 4 whole weeks plus 2 days, and how `+=` added to an existing variable.

## Instructor-Guided Coding Walkthrough

1. Start with `name = input("What is your name? ")` and a greeting. Run it and let students type their own names.
2. Ask students to predict `crew + crew` when the user types `4`, then run it. Explain that `input()` always returns a string, and fix it with `int()`.
3. Change the food cost line and show `{food_cost}` against `{food_cost:.2f}`. Ask students why the second looks like money.
4. Use `17 // 5` and `17 % 5` with a fuel-cell story, then let students invent their own pair of numbers.
5. Write `2 + 3 * 4` on the board and have students predict the answer before running it. Add brackets and ask what changes.
6. Show what happens if the user types `abc` when the program expects an integer. Read the `ValueError` aloud and tell students that in a later course they will learn to handle that safely.

Discussion questions:

- Why does `input()` return text rather than guessing the type?
- When would you choose `/` and when `//`?
- Why do professional programmers add brackets even when precedence would give the right answer?

## Student Mission / Guided Challenge

**Explorer Challenge: Smart Calculator**

Build `smart_calculator.py`. This is Part 2 of your first portfolio project (you started it in Lesson 2), and a ready-to-run Google Colab version of the whole project is linked in the Project section below this lesson.

1. Print a title banner for your calculator.
2. Ask the user for two numbers and store them as floats.
3. Calculate and print the sum, difference, product, quotient, floor division, remainder and power of the two numbers. Use an f-string for every line and show decimals with `:.2f` where it makes sense.
4. Ask the user for a price and a discount percentage, then calculate and print the final price (price minus the discount).
5. Ask for three test scores and print their average to one decimal place.
6. Use at least one augmented assignment operator, for example to add a bonus point to the final score.
7. Print a final line that uses a comparison, for example `Is the first number bigger? True`.

**Bonus objective:** Ask for a temperature in Celsius and print it in Fahrenheit using `celsius * 9 / 5 + 32`. After Lesson 4, come back and let the user *choose* which operation to run.

## Common Mistakes

- Forgetting that `input()` returns a string, so `"4" + "4"` makes `44` instead of `8`.
- Converting with `int()` when the user may type a decimal, which stops the program. Use `float()` for decimals.
- Using `/` and expecting a whole number: `10 / 2` is `5.0`, a float.
- Mixing up `=` (store a value) with `==` (compare two values).
- Forgetting the `f` before the opening quote, so the braces are printed as text.
- Relying on precedence you are not sure about instead of adding brackets.

## Lesson Recap

You now have two-way communication. You collected input with `input()`, converted it into numbers, and displayed tidy results with f-strings, `sep` and `end`. You used the seven arithmetic operators, compared values, combined booleans with `and`, `or` and `not`, updated variables with augmented assignment, and predicted results using precedence and brackets. Together these skills are enough to build a working calculator.

## Homework / Extension Mission

**Solo Mission: Fuel and Distance Planner**

Create `trip_planner.py` that helps a crew plan a journey. Your program must:

1. Ask for the distance of the trip in kilometres (a float) and the ship's speed in kilometres per hour (a float).
2. Calculate the travel time and print it as whole hours and leftover minutes using `//` and `%` (hint: convert the hours to minutes first).
3. Ask for the ship's fuel use per 100 kilometres, calculate the fuel needed for the trip, and print it with two decimal places.
4. Ask for the amount of fuel on board and print `True` or `False` for the question "Is there enough fuel?" using a comparison.
5. Use at least one augmented assignment operator, for example to add a 10 percent safety reserve to the fuel needed.
6. Print a final report using f-strings, with one line for each result.

Add a comment above any calculation where precedence matters and explain why you used brackets.

## Portfolio Connection

Today you finish your first portfolio project, the **Smart Calculator** (Part 2). It uses everything from the last two lessons: the variables and type conversion from Lesson 2, and `input()`, operators and f-strings from today. Keep your file. In Lesson 4 you start the next project, the **Number Guessing Game**, and you can also return to your calculator after that lesson and let the user *choose* the operation with `if` statements. In Lesson 8 you will recap it as reusable functions.
