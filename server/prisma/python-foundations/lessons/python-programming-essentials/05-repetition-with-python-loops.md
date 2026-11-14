# Lumexa Mission Log: Python Programming Essentials

**Course/Path:** Python Programming Essentials
**Lesson:** 05 of 08
**Title:** Repetition with Python Loops
**Duration:** 60 minutes
**Difficulty:** Beginner
**Technology:** Python 3

---

## Mission Brief

A satellite circles the Earth once every ninety minutes, and its computer repeats the same checks on every single orbit: read the sensors, store the data, send a signal. Nobody writes that code ten thousand times. They write it once and tell the computer to repeat it. Repeating instructions is called **iteration**, and the tool for it is the **loop**. Today you will learn Python's two loops, `for` and `while`, and you will use them to build a complete game: the **Number Guessing Game**.

## Learning Objectives

1. Explain what iteration is and when a loop is the right tool.
2. Write `for` loops, and control them with `range()`.
3. Write `while` loops with a condition that eventually becomes false.
4. Use counters and accumulators to keep track of totals as a loop runs.
5. Use `break`, `continue` and nested loops.
6. Recognise and prevent infinite loops.

## Prerequisites

- Lesson 4: you can write `if`, `elif` and `else` statements with correct indentation.
- Lesson 3: you can update a variable with an augmented assignment such as `+=`.

## Concept Explanation

### Why loops?

Imagine printing the numbers from 1 to 100. Without a loop you would write 100 `print()` lines. With a loop, three lines do it. Loops save typing, avoid mistakes and make programs flexible, because the number of repeats can depend on the data.

### The `for` loop

Use a `for` loop when you know **how many times** to repeat, or when you want to visit **every item** in something. The loop variable takes a new value on each pass:

```python
for count in range(1, 4):
    print("Orbit number", count)
```

This prints three lines, with `count` equal to 1, then 2, then 3. The line with `for` ends in a colon, and the repeated lines are indented, exactly like an `if` block.

### `range()`

`range()` produces a sequence of whole numbers. It stops **just before** the end value:

| Call | Numbers produced |
|---|---|
| `range(5)` | 0, 1, 2, 3, 4 |
| `range(2, 6)` | 2, 3, 4, 5 |
| `range(0, 10, 3)` | 0, 3, 6, 9 (the third value is the **step**) |
| `range(5, 0, -1)` | 5, 4, 3, 2, 1 (a negative step counts down) |

A `for` loop can also visit the items of a **list**: values written between square brackets. You will study lists properly in Lesson 7, but here is a preview:

```python
for stage_fuel in [12, 18, 9, 21]:
    print(stage_fuel)
```

### The `while` loop

Use a `while` loop when you do **not** know how many repeats are needed. It repeats as long as its condition is `True`:

```python
fuel = 100
while fuel > 40:
    print("Orbiting... fuel is", fuel)
    fuel -= 15
```

Python checks the condition **before every pass**. When `fuel` drops to 40 or less, the condition is `False` and the loop ends. A good rule: use `for` when you can count the repeats, and `while` when you are waiting for something to happen.

### Counters and accumulators

Loops usually come with helper variables that you update on every pass:

- A **counter** counts how many times something happens: `orbits += 1`.
- An **accumulator** builds a running total: `total_fuel += burn`.

Create the variable **before** the loop, update it **inside** the loop, and use it **after** the loop.

### Stopping and skipping: `break` and `continue`

- `break` ends the whole loop immediately.
- `continue` skips the rest of the current pass and jumps to the next one.

```python
for reading in [21, -1, 23, 99, 24]:
    if reading < 0:
        continue          # skip a bad reading
    if reading > 50:
        break             # stop the scan completely
    print("OK:", reading)
```

### Nested loops

A loop inside a loop is a **nested loop**. The inner loop runs completely for every single pass of the outer loop. They are perfect for grids, tables and seating plans:

```python
for row in range(1, 3):
    for seat in range(1, 4):
        print("Row", row, "Seat", seat)
```

### Preventing infinite loops

A loop that never stops is an **infinite loop**. It almost always happens because the condition can never become false, usually because the variable in the condition is never changed:

```python
fuel = 100
while fuel > 40:
    print("Orbiting...")     # fuel never changes, so this runs forever!
```

To prevent it, check three things: the condition uses a variable, something inside the loop changes that variable, and the change moves it toward the end. If your program does get stuck, use your editor's **Stop** button (or press `Ctrl + C` in a terminal) to interrupt it.

### Borrowing a tool: `import random`

Python comes with extra toolboxes called **modules**. The `random` module can pick unpredictable numbers, which is exactly what a game needs. You bring a module in with `import`:

```python
import random

secret = random.randint(1, 100)   # a random whole number from 1 to 100, both included
print(secret)
```

You will learn much more about modules in the next course. For now, remember only the two lines above.

## Key Vocabulary

| Term | Definition |
|---|---|
| **Iteration** | Repeating a set of instructions. |
| **Loop** | A structure that repeats a block of code. |
| **`for` loop** | A loop that repeats once for each item in a sequence, such as a `range()`. |
| **`while` loop** | A loop that repeats as long as its condition is `True`. |
| **`range()`** | A function that produces a sequence of whole numbers to loop over. |
| **Counter** | A variable that counts how many times something happens. |
| **Accumulator** | A variable that collects a running total as a loop runs. |
| **`break`** | Ends the loop immediately. |
| **`continue`** | Skips the rest of this pass and starts the next one. |
| **Infinite loop** | A loop whose condition never becomes `False`, so it never stops by itself. |

## Code Example: Orbit Loops

```python
# orbit_loops.py
# for loops, while loops, range(), break, continue, counters and accumulators

# 1. A for loop with range(): the launch countdown
for count in range(5, 0, -1):
    print(f"T-minus {count}")
print("Liftoff!")

# 2. An accumulator: add up the fuel burned in each of 4 stages
fuel_per_stage = [12, 18, 9, 21]
total_fuel = 0
for burn in fuel_per_stage:
    total_fuel += burn
print("Total fuel used:", total_fuel)

# 3. A while loop with a counter: orbit until fuel runs low
fuel = 100
orbits = 0
while fuel > 40:
    fuel -= 15
    orbits += 1
print(f"Completed {orbits} orbits, fuel left: {fuel}")

# 4. continue skips a bad reading; break stops the scan early
readings = [21, 22, -1, 23, 99, 24]
valid = 0
for value in readings:
    if value < 0:
        continue
    if value > 50:
        print("Overheat detected:", value, "- stopping the scan")
        break
    valid += 1
print("Valid readings before the alarm:", valid)

# 5. Nested loops: a 3 x 4 seating plan
for row in range(1, 4):
    line = ""
    for seat in range(1, 5):
        line += f"R{row}S{seat} "
    print(line)
```

Expected output:

```text
T-minus 5
T-minus 4
T-minus 3
T-minus 2
T-minus 1
Liftoff!
Total fuel used: 60
Completed 4 orbits, fuel left: 40
Overheat detected: 99 - stopping the scan
Valid readings before the alarm: 3
R1S1 R1S2 R1S3 R1S4 
R2S1 R2S2 R2S3 R2S4 
R3S1 R3S2 R3S3 R3S4 
```

Follow the counter in part 3: the loop ran four times, because the fuel went 100, 85, 70, 55 and finally 40, when the condition `fuel > 40` stopped being true.

## Instructor-Guided Coding Walkthrough

1. Show the 100 `print()` lines problem on the board, then replace it with a three-line `for` loop. Let students change the numbers in `range()`.
2. Print `range(5)` values and ask students to say the last number before running. Reinforce that the end value is excluded.
3. Build the fuel `while` loop live. Ask students to predict the final fuel value, then run it.
4. Remove the `fuel -= 15` line and run it so the loop never ends. Show how to stop it with the Stop button, and ask students to explain what is missing.
5. Add `continue` and `break` to the readings loop one at a time, asking students to say what is different before each run.
6. Build the guessing game skeleton together: the secret number, a `while` loop, and a counter for the attempts. Leave the hints for the guided challenge.

Discussion questions:

- How do you decide between a `for` loop and a `while` loop?
- Why is it good practice to create a counter before the loop starts?
- Where in a mobile app or a game would you find a loop running?

## Student Mission / Guided Challenge

**Explorer Challenge: Number Guessing Game**

Build `guessing_game.py`. This is Part 2 of your second portfolio project (you started it in Lesson 4), and a ready-to-run Google Colab version of the whole project is linked in the Project section below this lesson.

1. Import `random` and choose a secret number between 1 and 100 with `random.randint(1, 100)`.
2. Give the player at most 7 attempts. Keep an `attempts_left` counter that goes down by one for every guess.
3. Use a `while` loop that continues while there are attempts left and the player has not guessed the number.
4. On every guess, ask for an integer and print a hint: `Too high!`, `Too low!` or a winning message. Show how many attempts are left.
5. If the player wins, calculate a **score** (for example `attempts_left * 10 + 10`) and print it.
6. If the attempts run out, reveal the secret number.
7. Test the game by playing several rounds and checking that every branch works: a win, a loss and a hint in each direction.

**Bonus objective:** Ask "Play again? (yes/no)" and wrap the whole game in another loop. Keep a running **best score** across rounds.

## Common Mistakes

- Forgetting to change the variable in a `while` condition, which creates an infinite loop.
- Being off by one with `range()`, forgetting that it stops before the end value.
- Creating a counter or accumulator inside the loop, so it resets to zero on every pass.
- Indenting a line that should run after the loop, so it repeats every time.
- Using `break` when `continue` was needed (or the other way round).
- Forgetting that `input()` returns text, so a guess must be converted with `int()` before it is compared.

## Lesson Recap

Loops let you write instructions once and repeat them as often as you need. You used `for` loops with `range()` when the number of repeats was known, `while` loops when it was not, counters and accumulators to remember totals, `break` and `continue` to control the flow, and nested loops for grids. You also learned the checklist that prevents infinite loops, and you borrowed the `random` module to make a game unpredictable.

## Homework / Extension Mission

**Solo Mission: Asteroid Field Navigator**

Create `asteroid_navigator.py` that helps a ship cross an asteroid field. Your program must:

1. Ask how many asteroids are in the field, then use a `for` loop to ask for the distance (in kilometres) of each one from the ship.
2. Use a counter to count the asteroids closer than 100 km, and an accumulator to add up all the distances so you can print the average distance.
3. Track the closest asteroid so far and print it at the end.
4. Add a `while` loop that keeps asking for a ship speed until the user types a speed between 1 and 50. Print a helpful message for every invalid value.
5. Use `continue` to skip any asteroid whose distance is entered as `0` (a sensor error) and `break` to stop early if the user types a distance of `-1`.
6. Use a nested loop to print a triangle of stars, one row per dangerous asteroid, at the end of the report.

Include comments that explain each counter and accumulator.

## Portfolio Connection

Today you finish your second portfolio project, the **Number Guessing Game** (Part 2): random numbers, attempts, hints and score tracking all rely on the loops you learned today. The same `while` loop idea powers the menu of your Shopping List Manager and every round of the **Python Quiz Master**, which you start in Lesson 6. In Lesson 8 you will recap the game by splitting it into reusable functions.
