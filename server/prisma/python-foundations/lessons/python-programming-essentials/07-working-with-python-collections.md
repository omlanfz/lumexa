# Lumexa Mission Log: Python Programming Essentials

**Course/Path:** Python Programming Essentials
**Lesson:** 07 of 08
**Title:** Working with Python Collections
**Duration:** 60 minutes
**Difficulty:** Beginner
**Technology:** Python 3

---

## Mission Brief

A spacecraft's cargo bay holds hundreds of items: food packs, tools, spare parts, experiments. The crew cannot give every item its own variable called `item1`, `item2`, `item3` and so on. They need a way to keep many things together, count them, look one up, add a new one and throw one out. Python gives you four built-in **collections** for exactly this job: lists, tuples, sets and dictionaries. Today you will learn what each one is for and how to choose the right one, and you will build an **Interactive Shopping List Manager**.

## Learning Objectives

1. Explain why collections are useful and name Python's four main ones.
2. Create lists and use list operations to add, remove, sort and slice.
3. Use tuples for data that should not change, and sets for unique values.
4. Use dictionaries to store and look up key-value pairs.
5. Access, update and remove elements, and loop through every kind of collection.
6. Choose the right collection for a given problem.

## Prerequisites

- Lesson 6: you can index and slice strings and use `split()`.
- Lesson 5: you can write `for` loops and `while` loops.

## Concept Explanation

### Why collections?

A variable holds one value. A **collection** holds many values under a single name, so you can store a whole crew, a whole inventory or a whole score table and process it with a loop.

### Lists: ordered and changeable

A **list** is written with square brackets. The items are ordered, each has an index starting at 0 (just like a string), and you can change the list after you create it:

```python
cargo = ["oxygen tank", "food pack", "toolkit"]
print(cargo[0])          # oxygen tank
print(cargo[-1])         # toolkit
print(len(cargo))        # 3
print(cargo[0:2])        # ['oxygen tank', 'food pack']
```

The most useful list operations are:

| Operation | What it does |
|---|---|
| `cargo.append(x)` | Adds `x` at the end |
| `cargo.insert(i, x)` | Adds `x` at position `i` |
| `cargo.remove(x)` | Removes the first item equal to `x` |
| `cargo.pop()` | Removes and returns the last item (`pop(i)` removes position `i`) |
| `cargo[i] = x` | Replaces the item at position `i` |
| `x in cargo` | `True` if `x` is in the list |
| `sorted(cargo)` | A new, sorted copy (`cargo.sort()` sorts in place) |

### Tuples: ordered and fixed

A **tuple** is written with round brackets. It works like a list, but it is **immutable**: you cannot add, remove or change items after you create it. Use a tuple for data that belongs together and should never change, such as a pair of coordinates:

```python
landing_site = (4.5, -12.3)
latitude, longitude = landing_site     # unpacking: one value into each variable
```

### Sets: unique values

A **set** is written with curly braces and keeps only **unique** values. It has no order and no indexes, so it is perfect for removing duplicates and for asking "is this in the set?" very quickly:

```python
tools_logged = {"drill", "camera", "drill", "sensor", "camera"}
print(len(tools_logged))       # 3
tools_logged.add("radio")
tools_logged.discard("camera")
```

You can also create a set from a list to drop the duplicates: `set(["a", "b", "a"])` gives `{"a", "b"}`.

### Dictionaries: key-value pairs

A **dictionary** stores values under **keys** and is written with curly braces and colons. Instead of asking for "item number 2", you ask for "the value for this key":

```python
supplies = {"oxygen": 5, "food": 12, "water": 8}
print(supplies["food"])            # 12
supplies["water"] = 12             # update
supplies["fuel"] = 20              # add a new key
del supplies["oxygen"]             # remove a key
print(supplies.get("medkit", 0))   # 0: .get() gives a default instead of an error
print("food" in supplies)          # True: checks the keys
```

Asking for a key that is not there with `supplies["medkit"]` causes a `KeyError`, which is why `.get()` is so handy. A dictionary's keys must be unique and unchangeable (strings and numbers are the usual choices).

### Accessing, updating and removing elements

| Task | List | Dictionary |
|---|---|---|
| Read | `items[2]` | `data["key"]` |
| Update | `items[2] = x` | `data["key"] = x` |
| Add | `items.append(x)` | `data["new key"] = x` |
| Remove | `items.remove(x)` or `items.pop()` | `del data["key"]` |

### Iterating through collections

A `for` loop can visit every element of any collection:

```python
for item in cargo:                       # each item of a list
    print(item)

for key, value in supplies.items():      # each pair of a dictionary
    print(key, value)

for key in supplies:                     # just the keys
    print(key)
```

Useful partners for loops are `len()`, `sum()`, `max()` and `min()`, which work on collections of numbers: `sum([4, 8, 3])` is `15`.

### Choosing the right collection

| If you need... | Use a... |
|---|---|
| An ordered group you will change | **list** |
| A fixed group that must not change | **tuple** |
| Only unique items, or fast "is it there?" checks | **set** |
| To look things up by a name or label | **dictionary** |

## Key Vocabulary

| Term | Definition |
|---|---|
| **Collection** | A single value that holds many other values. |
| **List** | An ordered, changeable collection written with square brackets. |
| **Tuple** | An ordered collection that cannot be changed, written with round brackets. |
| **Set** | A collection of unique values with no order. |
| **Dictionary** | A collection of key-value pairs. |
| **Key** | The label used to look up a value in a dictionary. |
| **Element (item)** | One value inside a collection. |
| **Mutable** | Can be changed after it is created, like a list or dictionary. |
| **Unpacking** | Storing the items of a tuple (or list) into separate variables. |
| **Iterate** | To visit every element of a collection one by one. |

## Code Example: Cargo Bay Inventory

```python
# cargo_bay.py
# Lists, tuples, sets and dictionaries

# List: ordered and changeable
cargo = ["oxygen tank", "food pack", "toolkit"]
cargo.append("spare battery")
cargo.insert(1, "water filter")
removed = cargo.pop()
print("Cargo list:", cargo, "| removed:", removed)
print("First item:", cargo[0], "| number of items:", len(cargo))

# Tuple: ordered but fixed
landing_site = (4.5, -12.3)
latitude, longitude = landing_site
print(f"Landing site: latitude {latitude}, longitude {longitude}")

# Set: unique values only
tools_logged = {"drill", "camera", "drill", "sensor", "camera"}
print("Unique tools:", sorted(tools_logged))
print("Number of unique tools:", len(tools_logged))

# Dictionary: key -> value
supplies = {"oxygen": 5, "food": 12, "water": 8}
supplies["water"] += 4
supplies["fuel"] = 20
del supplies["food"]
print("Supplies:", supplies)
for item, amount in supplies.items():
    print(f"  {item}: {amount}")
print("Oxygen left:", supplies.get("oxygen", 0), "| medkits:", supplies.get("medkit", 0))
print("Total units in store:", sum(supplies.values()))
```

Expected output:

```text
Cargo list: ['oxygen tank', 'water filter', 'food pack', 'toolkit'] | removed: spare battery
First item: oxygen tank | number of items: 4
Landing site: latitude 4.5, longitude -12.3
Unique tools: ['camera', 'drill', 'sensor']
Number of unique tools: 3
Supplies: {'oxygen': 5, 'water': 12, 'fuel': 20}
  oxygen: 5
  water: 12
  fuel: 20
Oxygen left: 5 | medkits: 0
Total units in store: 37
```

A set has no fixed order, so the example prints `sorted(tools_logged)` to make the output the same every time.

## Instructor-Guided Coding Walkthrough

1. Show how clumsy `item1`, `item2`, `item3` variables are, then replace them with one list. Let students add their own items.
2. Run `append`, `insert`, `remove` and `pop`, printing the list after each one. Ask students to predict the printed list before you run it.
3. Try to change an item of a tuple and read the `TypeError`. Ask when immutability is a feature rather than a limitation.
4. Create a list with duplicates and convert it to a set. Ask what was lost (the duplicates and the order).
5. Build a dictionary of three supplies. Look up a missing key with `[]`, read the `KeyError`, then use `.get()`.
6. Loop over a list, then a dictionary with `.items()`. Ask students which collection they would use for a phone book and why.

Discussion questions:

- Which collection would you use for a leaderboard of player names and scores?
- Why does a set not allow you to ask for "the third item"?
- What are the dangers of changing a list while looping over it?

## Student Mission / Guided Challenge

**Explorer Challenge: Interactive Shopping List Manager**

Build `shopping_list.py`, a menu-driven program for managing a supply list.

1. Start with an empty list called `shopping_list`.
2. Use a `while` loop to show a menu: `1` Add an item, `2` Remove an item, `3` Show the list, `4` Quit.
3. **Add:** ask for an item and append it, but do not allow the same item twice (check with `in` and print a friendly message).
4. **Remove:** ask for an item and remove it if it is in the list; otherwise say that it was not found.
5. **Show:** print the items numbered from 1 in alphabetical order (use `sorted()` and a `for` loop), and print how many items there are.
6. **Quit:** say goodbye and stop the loop. Print a message for any menu choice that is not valid.
7. Keep the program running until the user chooses to quit, and test every menu option, including removing an item that is not in the list.

**Bonus objective:** Change the list into a dictionary so that every item also has a quantity, and add an option that shows the total number of units.

## Common Mistakes

- Using round brackets when you meant a list, or square brackets when you meant a tuple.
- Forgetting that list indexes start at 0, so the last index is `len(items) - 1`.
- Trying to use an index that is too big, which causes an `IndexError`.
- Looking up a dictionary key that is not there with `[]` instead of `.get()`.
- Writing `{}` and expecting an empty set. It is an empty dictionary. Use `set()` for an empty set.
- Calling `.remove()` on an item that is not in the list, which causes a `ValueError`.

## Lesson Recap

You can now store many values under one name. Lists keep ordered, changeable items; tuples keep fixed groups; sets keep unique values; and dictionaries keep key-value pairs that you look up by key. You practised adding, updating and removing elements, looping through collections, and choosing the right one for a problem. Collections appear in every real program, from a game's inventory to the contacts on your phone.

## Homework / Extension Mission

**Solo Mission: Crew Roster Manager**

Create `crew_roster.py` that manages the crew of a space station. Your program must:

1. Store the crew as a dictionary where each key is a crew member's name and each value is their role (for example `"Nova": "Pilot"`). Start with at least four crew members.
2. Provide a menu loop with options to add a crew member, change a role, remove a crew member, show the roster and quit.
3. Use a set to store the **unique skills** the crew has. Ask for a skill whenever a member is added and add it to the set. Show the sorted skills when the roster is displayed.
4. Store each crew member's quarters as a tuple of two numbers (a deck and a room number) and unpack it when printing.
5. Use `.get()` somewhere so that looking up an unknown name never crashes the program.
6. Print summary lines at the end: the number of crew, the number of unique skills and the names in alphabetical order.

Add a comment above each collection that explains why you chose it.

## Portfolio Connection

Today you finish your third portfolio project, the **Python Quiz Master** (Part 2). It stores its questions in a list, keeps the score and the wrong answers in collections and shows a results summary at the end. The Shopping List Manager is the model for the menus in your later projects, and in Course 2 you will combine lists and dictionaries into real records for your **Text-Based Adventure Game** and **Library Management System**. Data scientists use the very same ideas when they store a column of numbers or a table of records.
