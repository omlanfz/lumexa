# Lumexa Mission Log: Problem Solving & Program Design

**Course/Path:** Problem Solving & Program Design
**Lesson:** 03 of 08
**Title:** Advanced Collections & Nested Data Structures
**Duration:** 60 minutes
**Difficulty:** Beginner
**Technology:** Python 3

---

## Mission Brief

A real crew database is not a single list of names. It stores, for every astronaut, a name, a role, a set of training scores, an emergency contact and a list of missions. Real information is rarely flat. It is *nested*: things inside things, like cargo crates inside a cargo bay inside a spaceship. Today you will learn to build and read nested lists and dictionaries, to keep structured records in a list of dictionaries, and to choose the right structure for the data you are given. You will also use these ideas to design the world of your **Text-Based Adventure Game**.

## Learning Objectives

1. Create nested lists and nested dictionaries.
2. Store structured records as a list of dictionaries.
3. Access and modify information deep inside a nested structure.
4. Iterate through nested collections with loops.
5. Choose the data structure that suits a problem.
6. Transform and process collections with loops and list comprehensions.

## Prerequisites

- From Course 1: you can use lists, tuples, sets and dictionaries.
- Lesson 2: you can write functions that take and return collections.

## Concept Explanation

### Revisiting lists and dictionaries

A **list** keeps items in order and you find them by position (`items[0]`). A **dictionary** keeps values under keys and you find them by name (`data["name"]`). Both can hold *any* kind of value, including other lists and dictionaries. That is what makes nesting possible.

### Nested lists

A list that contains lists is a **nested list**. It is the natural way to store a grid, such as seats in a shuttle: each inner list is one row.

```python
seats = [
    ["free", "taken", "free"],
    ["taken", "taken", "free"],
]
print(seats[0])        # ['free', 'taken', 'free'], the whole first row
print(seats[1][0])     # taken: row 1, then position 0 in that row
seats[0][2] = "taken"  # change one seat
```

Read `seats[1][0]` from left to right: first pick the row, then pick the item in that row.

### Nested dictionaries

A dictionary whose values are dictionaries is a **nested dictionary**. It is a good fit for a map of places, because every place has several facts about it:

```python
rooms = {
    "hangar": {"description": "A huge hangar.", "exits": {"north": "lab"}},
    "lab": {"description": "A quiet laboratory.", "exits": {"south": "hangar", "east": "garden"}},
}
print(rooms["lab"]["description"])
print(rooms["lab"]["exits"]["east"])    # garden
```

### A list containing dictionaries: structured records

The most common structure in real programs is a **list of dictionaries**. Each dictionary is one **record** (one student, one book, one expense) and every record has the same keys, a bit like the rows and columns of a spreadsheet:

```python
crew = [
    {"name": "Nova", "role": "Pilot", "scores": [88, 92, 79]},
    {"name": "Orion", "role": "Engineer", "scores": [75, 81, 90]},
]
print(crew[0]["name"])            # Nova
print(crew[1]["scores"][2])       # 90
```

### Accessing and modifying nested information

Each pair of brackets takes you one level deeper. Use the same brackets to change data, and the usual list and dictionary tools to add or remove it:

```python
crew[1]["scores"].append(84)        # add to a list inside a record
crew[0]["role"] = "Commander"       # change a value
crew[0]["email"] = "nova@mission.example"   # add a new key to one record
crew.append({"name": "Lyra", "role": "Doctor", "scores": []})   # add a record
del crew[1]                         # remove a record
```

If you ever forget how deep you are, print the structure and read it layer by layer.

### Iterating through nested collections

Use one loop for each level of nesting:

```python
for member in crew:                       # each record (a dictionary)
    for score in member["scores"]:        # each score inside the record
        print(member["name"], score)
```

When you only need to process the records, give the loop variable a meaningful name such as `member`. Never use `item` or `x` for a record: the name explains the structure.

### Storing structured records

Before you write the code, decide on the **shape** of one record and keep it identical everywhere: the same keys, the same types, in every dictionary. A record with a missing key is the most common cause of a `KeyError`. Writing a small function such as `make_student(name, grade)` that always builds a correctly-shaped dictionary protects you from that mistake.

### Choosing suitable data structures

| The data is... | Use |
|---|---|
| A sequence of similar things you loop over | a **list** |
| Facts about one thing, looked up by name | a **dictionary** |
| Many things that each have several facts | a **list of dictionaries** |
| Things you look up by a unique id | a **dictionary of dictionaries** |
| A table with rows and columns of the same kind | a **nested list** |
| Values that must be unique | a **set** |

### Transforming and processing collections

A **list comprehension** builds a new list from an old one in a single line. It reads almost like English:

```python
names = [member["name"] for member in crew]
high = [member["name"] for member in crew if max(member["scores"]) >= 90]
doubled = [n * 2 for n in [1, 2, 3]]       # [2, 4, 6]
```

The pattern is `[what to keep  for each item  in the collection  if condition]`. It is a shorter way to write the "start with an empty list, loop, append" pattern you already know.

## Key Vocabulary

| Term | Definition |
|---|---|
| **Nested structure** | A collection that contains other collections. |
| **Nested list** | A list that contains lists, often used for grids and tables. |
| **Nested dictionary** | A dictionary whose values are dictionaries. |
| **Record** | One item of structured data, such as one student, stored as a dictionary. |
| **List of dictionaries** | A list in which every item is a record. |
| **Depth** | How many levels of brackets are needed to reach a value. |
| **List comprehension** | A one-line way to build a new list from another collection. |
| **Shape** | The set of keys and types that every record is expected to have. |
| **Transform** | To build a new collection from an existing one. |
| **Lookup** | Finding a value by its key or index. |

## Code Example: Mission Records

```python
# mission_records.py
# Nested lists, nested dictionaries and a list of dictionaries

# A list of dictionaries: each dictionary is one record
crew = [
    {"name": "Nova", "role": "Pilot", "scores": [88, 92, 79]},
    {"name": "Orion", "role": "Engineer", "scores": [75, 81, 78]},
    {"name": "Lyra", "role": "Doctor", "scores": [95, 89, 93]},
]

# Access and modify nested information
print("First crew member:", crew[0]["name"])
print("Orion's second score:", crew[1]["scores"][1])
crew[1]["scores"].append(84)
crew[2]["role"] = "Chief Doctor"

# Iterate through nested collections
for member in crew:
    average = sum(member["scores"]) / len(member["scores"])
    print(f"{member['name']:6} {member['role']:13} average {average:.1f}")

# Transform and process: build new collections
names = [member["name"] for member in crew]
high_scorers = [member["name"] for member in crew if max(member["scores"]) >= 90]
print("Names:", names)
print("Scored 90 or more at least once:", high_scorers)

# A nested dictionary: a map of rooms
rooms = {
    "hangar": {"description": "A huge hangar.", "exits": {"north": "lab"}},
    "lab": {"description": "A quiet laboratory.", "exits": {"south": "hangar", "east": "garden"}},
    "garden": {"description": "A green space garden.", "exits": {"west": "lab"}},
}
location = "lab"
print(rooms[location]["description"])
print("Exits:", ", ".join(rooms[location]["exits"]))
location = rooms[location]["exits"]["east"]
print("You walk east to the", location)

# A nested list: a grid of seats
seats = [["free", "taken", "free"], ["taken", "taken", "free"]]
seats[0][2] = "taken"
taken = 0
for row in seats:
    for seat in row:
        if seat == "taken":
            taken += 1
print("Seats taken:", taken, "of", len(seats) * len(seats[0]))
```

Expected output:

```text
First crew member: Nova
Orion's second score: 81
Nova   Pilot         average 86.3
Orion  Engineer      average 79.5
Lyra   Chief Doctor  average 92.3
Names: ['Nova', 'Orion', 'Lyra']
Scored 90 or more at least once: ['Nova', 'Lyra']
A quiet laboratory.
Exits: south, east
You walk east to the garden
Seats taken: 4 of 6
```

Notice how every level is reached with one more pair of brackets, and how the same loop pattern works whether the structure is a list of records or a grid.

## Instructor-Guided Coding Walkthrough

1. Draw the crew data as a table on the board and then as a list of dictionaries. Ask how many pairs of brackets are needed to reach Orion's second score before testing it.
2. Add a key to one record only, then loop over all records and print that key. Read the `KeyError` and discuss why every record should have the same shape.
3. Build the `rooms` dictionary together. Ask students to walk from the hangar to the garden by writing the lookups one at a time.
4. Convert one `for` loop that builds a list into a list comprehension, and ask which version is easier to read.
5. Make `seats` and loop through it with two loops. Ask what would change for a grid with ten rows.
6. Present three small datasets (a playlist, a school timetable, a contact book) and have students choose the best structure for each and defend the choice.

Discussion questions:

- What would be the problem with storing a crew as five separate lists (names, roles, and so on)?
- When is a nested dictionary clearer than a list of dictionaries?
- What can go wrong when records have different keys?

## Student Mission / Guided Challenge

**Explorer Challenge: Student Record Management System**

Build `student_records.py`, a small database for a class. Keep the records in a list of dictionaries.

1. Write a function `make_student(name, grade_level, scores)` that returns a record with the keys `name`, `grade_level` and `scores` (a list of integers).
2. Start the program with at least four students in a list called `students`.
3. Build a menu loop with these options: add a student, show all students, find a student by name, add a score to a student, remove a student, show class statistics and quit.
4. Write one function for each option, and pass the `students` list into it as a parameter.
5. The statistics option must print each student's average score, the class average, and the name of the student with the highest average. Use a list comprehension at least once.
6. Searching must ignore capital letters, and every option must handle a student that does not exist with a friendly message.
7. Test all options, including the empty list and a student with no scores yet.

**Bonus objective:** Group the students by grade level in a dictionary whose keys are the grades and whose values are lists of names.

## Common Mistakes

- Using the wrong number of brackets and getting the wrong level, such as `crew[0]["scores"]` when a single score was needed.
- Giving some records a key that others are missing, causing a `KeyError` later.
- Forgetting that a plain `=` copy of a list or dictionary refers to the *same* object, so a change shows up in both names.
- Modifying a list while looping over it.
- Dividing by `len(scores)` when the list is empty, which causes a `ZeroDivisionError`.
- Choosing a nested structure when a simple flat list or one dictionary would be easier to read.

## Lesson Recap

You learned that real data is nested. You built nested lists for grids and nested dictionaries for maps, stored structured records as a list of dictionaries, and reached any value by following brackets level by level. You iterated through every level with loops, used a list comprehension to transform data, and learned to pick a structure that fits the problem. These skills let a program store anything from a class register to a whole game world.

## Homework / Extension Mission

**Solo Mission: Text-Based Adventure Game**

Open the **Text-Based Adventure Game** project notebook linked in the Project section below this lesson and complete it. This is the first portfolio project of Course 2. Your submission must include:

1. A world of at least six rooms stored in a nested dictionary, where each room has a description, a dictionary of exits and a list of items.
2. The three engine functions from the notebook (`show_room`, `get_choice` and `move_player`) completed, with docstrings.
3. A player stored as a dictionary with the current room, an inventory list and a health value.
4. At least one item the player must pick up before they can pass a certain room, and at least one way to win and one way to lose.
5. **Two new rooms and one puzzle of your own** that extend the story, using the same structure as the rest of the world.
6. A short list of the edge cases you tested, such as typing a direction that does not exist, and the result of each.

Submit your finished notebook link or your `adventure.py` file.

## Portfolio Connection

This lesson is the foundation of the **Text-Based Adventure Game**, the first portfolio project of Course 2: the rooms are a nested dictionary, the player is a record and the inventory is a list. The same list-of-dictionaries pattern appears in the **Personal Expense Tracker** (each expense is a record) and in the **Library Management System** (each book and borrower is a record). In Course 3 you will meet it once more as a *table*, when Pandas turns a list of dictionaries into a DataFrame.
