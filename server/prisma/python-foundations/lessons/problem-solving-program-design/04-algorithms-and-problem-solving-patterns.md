# Lumexa Mission Log: Problem Solving & Program Design

**Course/Path:** Problem Solving & Program Design
**Lesson:** 04 of 08
**Title:** Algorithms & Problem-Solving Patterns
**Duration:** 60 minutes
**Difficulty:** Beginner
**Technology:** Python 3

---

## Mission Brief

A navigation computer has to find one star among thousands, rank the safest landing sites, and count how often a sensor reports the same fault. None of these jobs needs a new idea each time. They are all solved with a handful of well-known **patterns**: search, sort, find the biggest, count, filter, add up. Learn the patterns once and you will recognise them inside problems that look completely different. Today you will learn these patterns, write your first searching algorithm, use Python's built-in sorting tools, and get a first taste of how to compare algorithms by how much work they do.

## Learning Objectives

1. Explain what an algorithm is and why algorithms matter.
2. Write a linear search to find an item in a collection.
3. Sort data with Python's built-in tools, including sorting records by a chosen key.
4. Find minimum and maximum values with the accumulator pattern.
5. Count items and analyse frequency with a dictionary.
6. Apply filtering patterns, and describe algorithm efficiency in simple terms.

## Prerequisites

- Lesson 3: you can store records in lists and dictionaries and loop through them.
- Lesson 1: you can describe a problem as inputs, processes and outputs.

## Concept Explanation

### What is an algorithm, and why does it matter?

An **algorithm** is a step-by-step method for solving a problem. The same problem can usually be solved in several ways, and some ways are much faster or simpler than others. When a program handles thousands or millions of items, the choice of algorithm decides whether it finishes in a blink or in an hour.

### Searching: linear search

**Linear search** checks the items one by one, from the first to the last, until it finds the one it is looking for or runs out of items:

```python
def linear_search(items, target):
    for index in range(len(items)):
        if items[index] == target:
            return index          # found it
    return -1                     # not found
```

It works on any list, sorted or not. The price is time: in the worst case it has to look at every single item. Python's built-in `in` operator and `list.index()` do a linear search for you.

### Sorting with Python's built-in tools

You do not have to write a sorting algorithm yourself. Python has two tools:

- `sorted(items)` returns a **new** sorted list and leaves the original alone.
- `items.sort()` sorts the list **in place** and returns nothing.

Both accept `reverse=True` for a descending order. To sort records by one of their fields, give `key=` a function that tells Python what to compare:

```python
def get_score(record):
    return record[1]

players = [("Nova", 88), ("Orion", 75), ("Lyra", 95)]
print(sorted(players, key=get_score, reverse=True))   # highest score first
```

### Finding minimum and maximum values

To find the biggest value, start by assuming the first item is the biggest, then look at every other item. Whenever you meet a bigger one, replace your answer. This is called the **accumulator pattern**, and it works for the smallest value too:

```python
highest = scores[0]
for score in scores:
    if score > highest:
        highest = score
```

Python's `min()` and `max()` do the same job. Writing the pattern yourself once is how you learn it, and it is useful when you need the *position* or the *record* that holds the biggest value.

### Counting and frequency analysis

A **frequency table** counts how many times each value appears. A dictionary is the perfect tool: the keys are the values and the dictionary values are the counts.

```python
frequency = {}
for score in scores:
    frequency[score] = frequency.get(score, 0) + 1
```

`frequency.get(score, 0)` gives the current count, or `0` the first time a value is seen. The same pattern counts letters in a word, words in a text or votes in an election.

### Accumulators and filtering patterns

The accumulator idea appears in many forms:

- **Totals:** `total += value`
- **Counters:** `count += 1` inside an `if`
- **Filtering:** build a new list of only the items that pass a test.

```python
passed = [s for s in scores if s >= 50]     # filter with a comprehension
```

Many problems are really a combination: *filter* the items that matter, then *count* or *sum* them, then *find the biggest*.

### Introduction to algorithm efficiency

How do you compare two algorithms? Not with a stopwatch (computers differ) but by counting the **steps** they take as the amount of data **n** grows. Computer scientists call this **time complexity**:

| Growth | Name | What it means | Example |
|---|---|---|---|
| Same work however big `n` is | constant | Does not depend on `n` | Reading `items[0]` |
| Work grows in step with `n` | linear | Double the data, double the work | Linear search |
| Work grows with `n` times `n` | quadratic | Double the data, four times the work | Comparing every pair of items |

Linear search on 1,000 items needs up to 1,000 checks; on a million items, up to a million. Knowing this helps you spot code that will become slow, and later you will learn faster methods for special cases, such as searching in sorted data.

## Key Vocabulary

| Term | Definition |
|---|---|
| **Algorithm** | A precise step-by-step method for solving a problem. |
| **Linear search** | Checking each item in turn until the target is found. |
| **`sorted()`** | A built-in function that returns a new, sorted list. |
| **`key=`** | An option that tells `sorted()` which part of each item to compare. |
| **Accumulator pattern** | Keeping a running result, such as a total or the largest value so far, while looping. |
| **Frequency table** | A dictionary that counts how many times each value appears. |
| **Filtering** | Keeping only the items that pass a test. |
| **Time complexity** | How the number of steps an algorithm takes grows with the size of the data. |
| **Worst case** | The input that makes an algorithm do the most work. |
| **Efficiency** | How little time or memory an algorithm needs. |

## Code Example: Score Analyzer

```python
# score_analyzer.py
# Searching, sorting, min/max, counting, filtering and efficiency

scores = [72, 45, 88, 50, 91, 45, 66, 88, 88, 30]

def linear_search(items, target):
    """Return (index, number of checks); the index is -1 when not found."""
    checks = 0
    for index in range(len(items)):
        checks += 1
        if items[index] == target:
            return index, checks
    return -1, checks

position, checks = linear_search(scores, 91)
print(f"Found 91 at index {position} after {checks} checks")
position, checks = linear_search(scores, 100)
print(f"Looking for 100: index {position} after {checks} checks")

# Minimum and maximum with the accumulator pattern
lowest = scores[0]
highest = scores[0]
for score in scores:
    if score < lowest:
        lowest = score
    if score > highest:
        highest = score
print("Lowest:", lowest, "| highest:", highest)
print("Built-in agrees:", min(scores) == lowest and max(scores) == highest)

# Sorting
print("Ascending: ", sorted(scores))
print("Top three: ", sorted(scores, reverse=True)[:3])

def get_score(record):
    return record[1]

players = [("Nova", 88), ("Orion", 75), ("Lyra", 95)]
print("By score:  ", sorted(players, key=get_score, reverse=True))

# Counting and frequency analysis
frequency = {}
for score in scores:
    frequency[score] = frequency.get(score, 0) + 1
best_score, best_count = 0, 0
for score, count in frequency.items():
    if count > best_count:
        best_score, best_count = score, count
print(f"Most common score: {best_score} (appears {best_count} times)")

# Filtering and accumulating
passed = [s for s in scores if s >= 50]
print(f"Passed: {len(passed)} of {len(scores)}, average of passing scores {sum(passed) / len(passed):.1f}")

# Efficiency: checks needed in the worst case as the list grows
for size in (10, 100, 1000):
    data = list(range(size))
    _, steps = linear_search(data, size - 1)
    print(f"List of {size:4} items: {steps:4} checks")
```

Expected output:

```text
Found 91 at index 4 after 5 checks
Looking for 100: index -1 after 10 checks
Lowest: 30 | highest: 91
Built-in agrees: True
Ascending:  [30, 45, 45, 50, 66, 72, 88, 88, 88, 91]
Top three:  [91, 88, 88]
By score:   [('Lyra', 95), ('Nova', 88), ('Orion', 75)]
Most common score: 88 (appears 3 times)
Passed: 7 of 10, average of passing scores 77.6
List of   10 items:   10 checks
List of  100 items:  100 checks
List of 1000 items: 1000 checks
```

The last loop shows linear growth: ten times more data means ten times more checks.

## Instructor-Guided Coding Walkthrough

1. Ask a student to find a name in a shuffled list of papers. Ask how many papers they looked at in the best case and in the worst case, then show the same idea in `linear_search()`.
2. Run `sorted(scores)` and print `scores` again. Then use `scores.sort()` and print the list. Ask what the difference is and when each is useful.
3. Write the maximum-finding loop live and trace it with a dry run on four numbers. Compare it with `max()`.
4. Build the frequency table, printing the dictionary after each pass of the loop for the first four scores.
5. Show `sorted(players, key=get_score)`. Ask students to explain what `key` receives and what it must return.
6. Run the efficiency loop. Predict the steps for 10,000 items before changing the numbers.

Discussion questions:

- Why does an algorithm that is fast for 10 items sometimes feel slow for a million?
- What patterns do you see in everyday apps (search, sort, count, filter)?
- When would you write a loop yourself instead of using `max()`?

## Student Mission / Guided Challenge

**Explorer Challenge: Smart Score Analyzer**

Build `smart_score_analyzer.py` that analyses a set of test scores.

1. Ask the user how many scores to enter, then read them into a list of integers (re-asking when a score is outside 0 to 100).
2. Write a function `find_score(scores, target)` that uses linear search and returns the index of the target or `-1`.
3. Write your own loop to find the lowest and highest score, and then check your answer with `min()` and `max()`.
4. Print the scores sorted from highest to lowest and the top three scores.
5. Build a frequency table of the scores in tens (0 to 9, 10 to 19, and so on up to 90 to 100) and print it as a text histogram using `"#" * count`.
6. Use filtering to print the scores that are above average and how many students passed (a score of 50 or more).
7. Store each student as a tuple of a name and a score, and print a leaderboard sorted with `key=`.
8. Add a comment next to each function that states whether its work grows in a constant, linear or quadratic way.

**Bonus objective:** Count how many comparisons your own maximum-finding loop makes and print it next to the size of the list.

## Common Mistakes

- Writing `sorted(scores)` and expecting `scores` itself to change.
- Writing `scores = scores.sort()`, which stores `None` because `sort()` returns nothing.
- Starting a maximum search with `highest = 0`, which gives the wrong answer if all values are negative. Start with the first item.
- Dividing by `len()` of an empty list when filtering leaves nothing.
- Forgetting that `.get(key, 0)` is needed the first time a value is counted.
- Returning inside the loop at the wrong indentation, so linear search stops after checking only the first item.

## Lesson Recap

Algorithms are reusable patterns. You wrote a linear search, used `sorted()` and `key=` to sort lists and records, found the smallest and biggest values with the accumulator pattern, counted items with a frequency dictionary and filtered lists with comprehensions. You also learned that efficiency means how the number of steps grows with the amount of data, and you saw linear growth for yourself. These patterns are the toolbox of every data-handling program.

## Homework / Extension Mission

**Solo Mission: Asteroid Catalog Analyzer**

Create `asteroid_catalog.py` that analyses a catalogue stored as a list of tuples of name, diameter in metres and distance from Earth in thousands of kilometres. Use at least ten asteroids that you invent. Your program must:

1. Search for an asteroid by name with a linear search function and print how many comparisons were made.
2. Sort the catalogue by diameter (largest first) and by distance (closest first), using `key=`.
3. Find the largest, smallest and closest asteroid with your own accumulator loops.
4. Build a frequency table of the asteroids by size class: small (under 50 m), medium (50 to 500 m) and large (over 500 m).
5. Filter the catalogue to list every asteroid that is both larger than 100 m and closer than 5,000 thousand km, and print how many there are.
6. Calculate the average diameter of the catalogue.
7. Include a comment block that explains which parts are constant, linear or quadratic, and what would happen if the catalogue held one million asteroids.

## Portfolio Connection

The patterns from today appear in all of your Course 2 projects: the **Personal Expense Tracker** filters expenses by month and totals them by category, and the **Library Management System** searches for books and sorts them by title. In Course 3, Pandas gives you ready-made, much faster versions of the same ideas (`sort_values`, `groupby`, `value_counts`), and you will recognise every one of them because you have written the patterns by hand.
