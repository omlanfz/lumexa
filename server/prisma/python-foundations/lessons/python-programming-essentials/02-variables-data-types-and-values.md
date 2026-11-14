# Lumexa Mission Log: Python Programming Essentials

**Course/Path:** Python Programming Essentials
**Lesson:** 02 of 08
**Title:** Variables, Data Types, and Values
**Duration:** 60 minutes
**Difficulty:** Beginner
**Technology:** Python 3

---

## Mission Brief

A spacecraft is full of numbers that change all the time: fuel left, speed, cabin temperature, distance to the Moon. Mission Control cannot write each new value on a sticky note, so the onboard computer stores them in labelled slots that it can read and update whenever it likes. In Python, those labelled slots are called **variables**. Today, Cadet, you will learn how to create them, how to name them well, what kinds of information they can hold, and how to convert one kind of value into another.

## Learning Objectives

1. Create variables and store values in them with the `=` operator.
2. Choose clear variable names and avoid Python's reserved keywords.
3. Recognise strings, integers, floats and booleans.
4. Check what kind of value you have with `type()`.
5. Convert values from one type to another with `int()`, `float()` and `str()`.
6. Update and reassign variables while a program runs.

## Prerequisites

- Lesson 1: you can write, save and run a program that uses `print()`.
- You know that text goes inside quotation marks and numbers do not.

## Concept Explanation

### Variables: labelled storage boxes

A **variable** is a name that refers to a value stored in the computer's memory. Think of a labelled storage locker on a space station: the label is the variable name, and what is inside is the value. You create a variable by choosing a name and giving it a value with the **assignment operator**, `=`:

```python
fuel_percent = 87
ship_name = "Aurora-7"
```

Read `fuel_percent = 87` as "let `fuel_percent` be 87". The single `=` does **not** mean "is equal to" like in maths; it means "store this value under this name". Once a variable exists, you can use its name anywhere you could use the value:

```python
print(fuel_percent)
print("Ship:", ship_name)
```

### Naming variables

Python has a few strict rules and a few friendly habits.

**Rules (break them and Python shows an error):**

- Use only letters, digits and underscores.
- Do not start with a digit: `3rd_stage` is not allowed, `stage_3` is.
- No spaces: write `crew_count`, not `crew count`.
- Names are case-sensitive: `Fuel` and `fuel` are two different variables.
- Never use a **reserved keyword**: a word Python already uses for its own grammar, such as `if`, `else`, `for`, `while`, `True`, `False`, `None`, `def`, `class` or `import`.

**Habits (professionals follow these):**

- Use **snake_case**: lowercase words joined by underscores, like `fuel_level`.
- Pick names that explain themselves: `distance_km` beats `d`.
- Avoid names that Python already uses for useful tools, such as `print`, `type` or `str`. They are allowed, but they would hide the tool.

### Data types

Every value in Python has a **data type**, which decides what you can do with it. Four types cover most of what you will do in this course:

| Type | Python name | Example values | Used for |
|---|---|---|---|
| String | `str` | `"Aurora-7"`, `'Nova'`, `"42"` | Text and labels |
| Integer | `int` | `4`, `-12`, `0` | Whole numbers and counting |
| Float | `float` | `92.5`, `-0.75`, `3.0` | Numbers with a decimal point |
| Boolean | `bool` | `True`, `False` | Yes or no answers |

Python works out the type from the value, so you never have to declare it. Ask for it with `type()`:

```python
print(type(87))
print(type(92.5))
print(type("87"))
print(type(True))
```

Notice that `"87"` is a **string**, not a number, because it is inside quotation marks. You can see the three digits, but Python treats them as text, so `"87" + "13"` makes `"8713"`, not `100`. Booleans are always written with a capital first letter: `True` and `False`.

### Mixing types

Python will not guess what you mean when you mix text and numbers:

```text
>>> "Crew: " + 4
TypeError: can only concatenate str (not "int") to str
```

You can avoid the problem by giving `print()` separate items, as you did in Lesson 1, or by converting the number to text first.

### Type conversion (casting)

**Type conversion**, also called **type casting**, turns a value of one type into another by calling the type's name like a function:

```python
supplies_text = "250"
supplies = int(supplies_text)     # the text "250" becomes the integer 250
ratio = float("3.5")              # the text "3.5" becomes the float 3.5
label = str(4) + " astronauts"    # the integer 4 becomes the text "4"
whole = int(9.99)                 # a float becomes an integer by dropping the decimals: 9
```

Two warnings. First, `int(9.99)` gives `9`, not `10`: it cuts off the decimals, it does not round. Second, you can only convert text that really looks like a number. `int("hello")` stops the program with a `ValueError`. You will learn how to handle that kind of problem safely in a later course.

### Updating and reassigning variables

The word *variable* means the value can **vary**. Give an existing name a new value and the old value is replaced:

```python
fuel_percent = 87
fuel_percent = 80            # replaced
fuel_percent = fuel_percent - 12.5   # use the old value to build the new one
```

The last line is the most useful. Python first works out the right-hand side using the current value (`80 - 12.5`), then stores the answer back in `fuel_percent`. Programs use this pattern for scores, timers, counters and fuel gauges.

## Key Vocabulary

| Term | Definition |
|---|---|
| **Variable** | A named place in memory that holds a value which can change. |
| **Assignment** | Storing a value in a variable with `=`. |
| **Value** | A piece of data, such as `87`, `"Nova"` or `True`. |
| **Data type** | The kind of value something is, which decides what you can do with it. |
| **String (`str`)** | Text inside quotation marks. |
| **Integer (`int`)** | A whole number, with no decimal point. |
| **Float (`float`)** | A number with a decimal point. |
| **Boolean (`bool`)** | A value that is either `True` or `False`. |
| **Type conversion** | Changing a value from one type to another, such as `int("7")`. |
| **Reserved keyword** | A word Python keeps for its own grammar, so it cannot be a variable name. |

## Code Example: Cargo Manifest

```python
# cargo_manifest.py
# Variables, data types and conversion in one mission report

ship_name = "Aurora-7"
crew_count = 4
fuel_percent = 92.5
oxygen_ok = True

print("Ship:", ship_name, "| type:", type(ship_name))
print("Crew:", crew_count, "| type:", type(crew_count))
print("Fuel:", fuel_percent, "| type:", type(fuel_percent))
print("Oxygen OK:", oxygen_ok, "| type:", type(oxygen_ok))

# Reassigning: values change as the mission goes on
fuel_percent = fuel_percent - 12.5
crew_count = crew_count + 1
print("After the burn: fuel is", fuel_percent, "and the crew is", crew_count)

# Type conversion
supplies_text = "250"
supplies = int(supplies_text)
print("Supplies doubled:", supplies * 2)
print("Crew as text:", str(crew_count) + " astronauts")
print("Fuel as a whole number:", int(fuel_percent))
```

Expected output:

```text
Ship: Aurora-7 | type: <class 'str'>
Crew: 4 | type: <class 'int'>
Fuel: 92.5 | type: <class 'float'>
Oxygen OK: True | type: <class 'bool'>
After the burn: fuel is 80.0 and the crew is 5
Supplies doubled: 500
Crew as text: 5 astronauts
Fuel as a whole number: 80
```

Look at what changed: `fuel_percent` and `crew_count` were updated, `"250"` became a number we could double, and `int(80.0)` gave `80`.

## Instructor-Guided Coding Walkthrough

1. Live-code the four variables. Before running, ask each student to predict the four `type()` results, then run and compare.
2. Change `crew_count = 4` to `crew_count = "4"` and ask what changes. Show that `crew_count + 1` now fails with a `TypeError`, and explain why text and numbers cannot be added.
3. Try to create a variable called `3rd_stage`, then one called `class`. Read the errors aloud and relate each to a naming rule.
4. Show that `int(9.99)` is `9` and ask students to explain why it is not `10`.
5. Reassign `fuel_percent` three times in a row and ask what the variable holds after each line. Draw the "locker" on the board and cross out the old value each time.

Discussion questions:

- Why would a programmer choose `fuel_percent` over `f` as a name?
- When could a number stored as a string be useful, and when does it cause problems?
- What would happen if two different variables had the same name?

## Student Mission / Guided Challenge

**Explorer Challenge: Student Profile Generator**

Create `student_profile.py` that builds a profile card from variables.

1. Create variables for your `full_name` (string), `age` (integer), `grade_level` (integer), `favorite_planet` (string), `height_m` (float) and `likes_robots` (boolean).
2. Print a title line, then print each value on its own line with a clear label.
3. Print the type of every variable using `type()`.
4. Create `birth_year` by subtracting your age from the current year, then print it. Use a variable for the current year.
5. Convert your age to a string and print a sentence such as `"I am 13 years old"` using `+` to join the pieces.
6. Reassign `grade_level` to next year's grade and print the profile line again.

**Bonus objective:** Store your height in centimetres by multiplying `height_m` by 100, then print it as a whole number with `int()`.

## Common Mistakes

- Treating `=` as "equals" and expecting `5 = x` to work. The variable name always goes on the left.
- Using a name before giving it a value, which causes a `NameError`.
- Writing `Fuel` in one place and `fuel` in another, creating two different variables by accident.
- Starting a name with a digit or using a space, a hyphen or another symbol in it.
- Trying to join text and a number with `+` without converting the number using `str()`.
- Believing `int(9.99)` rounds up, when it simply drops the decimals.

## Lesson Recap

You learned that a variable is a labelled box in memory, created with `=` and named using clear snake_case names that avoid reserved keywords. You met the four basic data types — strings, integers, floats and booleans — and checked them with `type()`. You converted values with `int()`, `float()` and `str()`, and you updated variables by reassigning them. These building blocks hold every piece of information your future programs will work with.

## Homework / Extension Mission

**Solo Mission: Planet Passport**

Create `planet_passport.py` that stores and prints the details of a planet or moon of your choice. Your program must:

1. Use at least eight variables that include all four data types: a name (string), a diameter in kilometres (integer), a gravity compared to Earth (float), and whether it has an atmosphere (boolean).
2. Print every value with a label, and print the data type of at least four of the variables.
3. Create a variable `earth_weight_kg` for a person (use your own weight or any number). Calculate and print how much that person would weigh on your chosen world by multiplying by its gravity.
4. Reassign one variable at least twice, printing it after each change.
5. Include one conversion with `int()`, one with `float()` and one with `str()`.
6. Use clear snake_case names and at least three comments.

Finish with a comment explaining one error you ran into and how you fixed it.

## Portfolio Connection

Today you start your first portfolio project, the **Smart Calculator** (Part 1). Part 1 uses the skills from this lesson: you store numbers in variables, check their types and convert between text and numbers. In Lesson 3 you finish the project (Part 2) by letting the user type the values with `input()` and by adding all the operators. Almost every later project stores information in variables too: scores in the **Number Guessing Game**, answers in the **Python Quiz Master**, and prices and totals later on.
