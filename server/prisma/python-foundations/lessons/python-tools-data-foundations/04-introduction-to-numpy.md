# Lumexa Mission Log: Python Tools & Data Foundations

**Course/Path:** Python Tools & Data Foundations
**Lesson:** 04 of 08
**Title:** Introduction to NumPy
**Duration:** 60 minutes
**Difficulty:** Beginner
**Technology:** Python 3, NumPy, Jupyter Notebook

---

## Mission Brief

A space telescope records millions of measurements every second: brightness, temperature, position. If you tried to process them with Python lists and loops, you would still be waiting for the answer next week. Scientists use a library built for exactly this job. It is called **NumPy** (Numerical Python), and it is the foundation under almost every data and AI tool in Python. Today you will learn what a NumPy array is, why it is so much faster and more convenient than a list for numbers, and how to do calculations on thousands of values with a single line. You will then build a **NumPy Scientific Calculator**.

## Learning Objectives

1. Explain what NumPy is and why arrays are useful.
2. Create arrays and describe their dimensions, shape and data type.
3. Index and slice one-dimensional and two-dimensional arrays.
4. Perform mathematical operations on whole arrays at once.
5. Reshape, sort and filter arrays.
6. Explain what a vectorized operation is.

## Prerequisites

- Lesson 3: you can run code in a notebook (Colab or Jupyter).
- Lesson 2: you can import a library, and know that NumPy comes from PyPI.
- From Course 1: you can use lists and loops.

## Concept Explanation

### What is NumPy, and why use it?

**NumPy** is a library for working with large collections of numbers. Everything else in Python's data world, including Pandas, Matplotlib and machine learning libraries, is built on top of it. By convention it is imported with the nickname `np`:

```python
import numpy as np
```

### Arrays and their advantages

An **array** is a grid of values that all have **the same type**. It looks like a list, but it behaves differently, and for numbers it is better in three ways:

- **Faster:** NumPy does its work in highly optimised compiled code, so it can be tens or hundreds of times quicker than a Python loop.
- **Shorter:** you can calculate with a whole array in one expression, without a loop.
- **More powerful:** it comes with a large toolbox of functions for maths, sorting and statistics.

### Creating NumPy arrays

```python
temps = np.array([21.5, 19.0, 23.4, 22.1])   # from a list
steps = np.arange(0, 10, 2)                   # [0 2 4 6 8]  (start, stop, step)
points = np.linspace(0, 1, 5)                 # 5 evenly spaced numbers from 0 to 1
zeros = np.zeros(4)                           # [0. 0. 0. 0.]
ones = np.ones((2, 3))                        # 2 rows and 3 columns of ones
```

### Array dimensions and shapes

An array has **dimensions** (how many directions it extends in) and a **shape** (how many items in each direction):

| Array | `.ndim` | `.shape` |
|---|---|---|
| `np.array([1, 2, 3])` | 1 | `(3,)` |
| `np.array([[1, 2, 3], [4, 5, 6]])` | 2 | `(2, 3)` (2 rows, 3 columns) |

Other useful attributes are `.size` (the total number of items) and `.dtype` (the type of the items, such as `float64` or `int64`).

### Indexing and slicing

Indexing and slicing work just like lists, and for two dimensions you give the row first and then the column, separated by a comma:

```python
grid = np.arange(1, 13).reshape(3, 4)     # 3 rows, 4 columns
# [[ 1  2  3  4]
#  [ 5  6  7  8]
#  [ 9 10 11 12]]

print(temps[0], temps[-1])      # the first and last item
print(temps[1:3])               # a slice of a 1D array
print(grid[1, 2])               # row 1, column 2 -> 7
print(grid[0])                  # the whole first row
print(grid[:, 1])               # every row, column 1 -> [ 2  6 10]
```

### Mathematical operations on arrays

Arithmetic on an array is applied to **every element at once**. This is called working **element-wise**:

```python
temps_c = np.array([21.5, 19.0, 23.4])
temps_f = temps_c * 9 / 5 + 32          # the whole array, no loop
total = temps_c + np.array([1, 1, 1])   # two arrays add item by item
print(np.sqrt(np.array([4, 9, 16])))    # [2. 3. 4.]
```

Summary functions reduce an array to one number, or to one number per row or column when you pass `axis`:

```python
grid.sum()          # 78: everything
grid.mean()         # 6.5
grid.max()          # 12
grid.sum(axis=0)    # [15 18 21 24]: one total per column
grid.sum(axis=1)    # [10 26 42]: one total per row
```

### Basic array manipulation

```python
np.arange(6).reshape(2, 3)       # change the shape without changing the data
np.sort(np.array([3, 1, 2]))     # [1 2 3]
np.concatenate([a, b])           # join two arrays end to end
temps[temps > 22]                # filter with a condition (a "mask")
```

A comparison such as `temps > 22` produces an array of `True` and `False`, and putting it inside the brackets keeps only the items where it is `True`. This replaces a loop and an `if`.

### Vectorized operations

An operation that works on the whole array at once is called **vectorized**. Compare two ways of doubling a million numbers:

```python
# a Python loop
doubled = []
for value in numbers:
    doubled.append(value * 2)

# a vectorized operation
doubled = numbers * 2
```

The second version is shorter, easier to read and far faster. Whenever you find yourself writing a loop over numbers, ask: *can NumPy do this in one step?*

## Key Vocabulary

| Term | Definition |
|---|---|
| **NumPy** | A Python library for fast calculations on arrays of numbers. |
| **Array** | A grid of values that all have the same type. |
| **Dimension** | One direction of an array: 1D is a row, 2D is a table. |
| **Shape** | The number of items in each dimension, such as `(3, 4)`. |
| **`dtype`** | The data type of the items in an array. |
| **Element-wise** | Applied to every item of an array separately. |
| **Vectorized operation** | A calculation applied to a whole array without a Python loop. |
| **`axis`** | The direction along which a function works: 0 for columns, 1 for rows. |
| **Mask** | An array of `True` and `False` values used to select items. |
| **Reshape** | To give the same data a different shape. |

## Code Example: Telemetry Arrays

```python
# telemetry_arrays.py
# NumPy: arrays, shapes, indexing, element-wise maths, masks and 2D arrays

import numpy as np

temps_c = np.array([21.5, 19.0, 23.4, 22.1, 20.8, 25.0])
print("Array:", temps_c)
print("Shape:", temps_c.shape, "| dtype:", temps_c.dtype, "| size:", temps_c.size)

# Vectorized maths: no loop needed
temps_f = temps_c * 9 / 5 + 32
print("Fahrenheit:", np.round(temps_f, 1))
print("Mean:", round(float(temps_c.mean()), 2), "| max:", temps_c.max(), "| min:", temps_c.min())

# Indexing, slicing and masks
print("First:", temps_c[0], "| last:", temps_c[-1], "| slice [1:4]:", temps_c[1:4])
print("Readings above 22 degrees:", temps_c[temps_c > 22])
print("How many above 22?", (temps_c > 22).sum())

# A 2D array: 3 rows (days) and 4 columns (sensors)
grid = np.arange(1, 13).reshape(3, 4)
print(grid)
print("Element [2, 3]:", grid[2, 3], "| row 1:", grid[1], "| column 2:", grid[:, 2])
print("Column sums:", grid.sum(axis=0), "| row sums:", grid.sum(axis=1))

# Combining arrays
readings_a = np.array([1.0, 2.0, 3.0])
readings_b = np.array([0.5, 0.5, 0.5])
print("Sum:", readings_a + readings_b, "| scaled:", readings_a * 10, "| sorted:", np.sort(np.array([3, 1, 2])))
```

Expected output:

```text
Array: [21.5 19.  23.4 22.1 20.8 25. ]
Shape: (6,) | dtype: float64 | size: 6
Fahrenheit: [70.7 66.2 74.1 71.8 69.4 77. ]
Mean: 21.97 | max: 25.0 | min: 19.0
First: 21.5 | last: 25.0 | slice [1:4]: [19.  23.4 22.1]
Readings above 22 degrees: [23.4 22.1 25. ]
How many above 22? 3
[[ 1  2  3  4]
 [ 5  6  7  8]
 [ 9 10 11 12]]
Element [2, 3]: 12 | row 1: [5 6 7 8] | column 2: [ 3  7 11]
Column sums: [15 18 21 24] | row sums: [10 26 42]
Sum: [1.5 2.5 3.5] | scaled: [10. 20. 30.] | sorted: [1 2 3]
```

Every calculation above works on the whole array at once. The mask `temps_c > 22` produced an array of `True` and `False` values, which was used both to select readings and to count them with `.sum()` (because `True` counts as 1).

## Instructor-Guided Coding Walkthrough

1. Ask students to convert six temperatures from Celsius to Fahrenheit using a list and a loop. Then show the same result with one NumPy line and compare the code.
2. Print `.shape`, `.ndim`, `.size` and `.dtype` for a 1D and a 2D array. Ask students to describe the arrays in plain words from those attributes.
3. Index the 2D array, asking students to predict the result of `grid[1, 2]`, `grid[:, 1]` and `grid[0]` before running them.
4. Put a mask inside the brackets and read the `True` and `False` array first, then the filtered result.
5. Compare `axis=0` and `axis=1` on a small grid. Draw the grid on the board and mark what is being added.
6. Time a Python loop and a vectorized operation on a million numbers with the `time` module, and discuss the difference.

Discussion questions:

- Why do you think NumPy insists that all the items of an array have the same type?
- What kinds of real data are naturally arrays (pictures, sound, grids of sensors)?
- When would a plain list still be the better choice?

## Student Mission / Guided Challenge

**Explorer Challenge: NumPy Scientific Calculator**

Build `numpy_calculator.py` (or a notebook) that performs scientific calculations and analyses numerical arrays.

1. Ask the user for a list of numbers separated by spaces, and convert it to an array with `np.array([float(x) for x in text.split()])`. Print its shape and size.
2. Write `summary(values)` that returns the sum, mean, median (`np.median`), minimum and maximum, and print them as a neat report using f-strings.
3. Write `convert_units(values, kind)` with vectorized formulas: Celsius to Fahrenheit, kilometres to miles and kilograms to pounds.
4. Write `normalise(values)` that rescales an array to the range 0 to 1 using `(values - values.min()) / (values.max() - values.min())`.
5. Write `filter_values(values, low, high)` that uses a mask to return only the values between `low` and `high`, and report how many were kept.
6. Create a 2D array of at least 3 rows and 4 columns (for example, the daily readings of four sensors) and print its row sums, column sums and the position of its largest value.
7. Build a menu that lets the user choose each tool, and use `try` and `except` for invalid input.
8. Add a docstring and a comment to every function that says which operations are vectorized.

**Bonus objective:** Use the `time` module to compare how long it takes to square a million numbers with a loop and with NumPy, and print the result.

## Common Mistakes

- Forgetting `import numpy as np` and getting a `NameError` on `np`.
- Using the Python `+` on two lists and expecting addition: it joins the lists. Arrays add item by item.
- Mixing up rows and columns: in `grid[row, column]` the row always comes first.
- Forgetting that `axis=0` works *down* the columns and `axis=1` works *across* the rows.
- Writing a loop over an array when a vectorized operation would do.
- Adding arrays of different shapes and getting a shape error.

## Lesson Recap

NumPy gives Python a fast, concise way to work with numbers. You created arrays and read their shape, size and data type, indexed and sliced them in one and two dimensions, and used element-wise arithmetic and summary functions with `axis`. You reshaped and sorted arrays, selected data with masks and saw why vectorized operations replace loops. Almost every data tool you will meet next is built on exactly these ideas.

## Homework / Extension Mission

**Solo Mission: Rover Sensor Analyser**

Create a notebook `rover_sensors.ipynb` that analyses the readings of a rover's sensors. Your notebook must:

1. Create a 2D array of readings with at least 5 rows (hours) and 4 columns (sensors: temperature, battery, dust level and wheel speed), using values that you invent. Display its shape and data type.
2. Calculate, using NumPy functions only (no loops), the average of each sensor, the maximum of each hour, and the hour and sensor of the largest value.
3. Convert the temperature column from Celsius to Fahrenheit with a vectorized formula and put the result in a new array.
4. Use a mask to find all the hours when the battery value was below 30 and report how many there were.
5. Normalise each sensor column to the range 0 to 1 and show the result.
6. Add Markdown cells that explain each step in plain language, and finish with a conclusion that says which sensor changed the most.
7. Pass the *Restart and run all* test.

## Portfolio Connection

NumPy is the engine that powers the next lesson. A Pandas **DataFrame**, the table at the heart of your **Dataset Explorer** and your **Student Life Data Explorer** projects, is built from NumPy arrays, and you will see the same ideas: shapes, masks and vectorized operations. The matplotlib charts you draw in Lesson 6 also take NumPy arrays as input, and the AI Builder and Data Scientist programs rely on NumPy in every lesson.
