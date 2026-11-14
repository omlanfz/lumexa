# Lumexa Mission Log: Python Programming Essentials

**Course/Path:** Python Programming Essentials
**Lesson:** 06 of 08
**Title:** Working with Strings
**Duration:** 60 minutes
**Difficulty:** Beginner
**Technology:** Python 3

---

## Mission Brief

Every message that travels between a rover and Mission Control is text: sensor reports, commands, names, coordinates. Programs that handle text need ways to look inside it, cut it into pieces, search it and tidy it up. Today you will learn how Python stores text as a sequence of characters, how to pick out any character or slice of a string, and how to use string methods to search, replace, split and join text. You will finish by building a **Word and Text Analyzer**.

## Learning Objectives

1. Explain that a string is a sequence of characters, each with a position.
2. Use indexing and slicing to read parts of a string.
3. Join strings with `+` and repeat them with `*`.
4. Use common string methods such as `upper()`, `lower()`, `strip()` and `title()`.
5. Search and replace text with `in`, `find()`, `count()` and `replace()`.
6. Split a string into a list of words and join a list back into a string.

## Prerequisites

- Lesson 5: you can write `for` loops and use `range()`.
- Lesson 3: you can build sentences with f-strings.

## Concept Explanation

### Strings and character positions

A string is a **sequence** of characters: letters, digits, spaces and symbols, in order. Python gives every character a numbered position called an **index**, and the numbering starts at **0**:

| Character | R | o | v | e | r |
|---|---|---|---|---|---|
| Index | 0 | 1 | 2 | 3 | 4 |
| Negative index | -5 | -4 | -3 | -2 | -1 |

`len()` tells you how many characters a string has, including spaces: `len("Rover")` is `5`.

### Indexing

Use square brackets to pick out one character:

```python
name = "Rover"
print(name[0])     # R, the first character
print(name[4])     # r, the last character
print(name[-1])    # r, the last character again, counted from the end
```

Asking for an index that does not exist, such as `name[10]`, causes an `IndexError`.

### Slicing

A **slice** takes a piece of a string using `[start:stop]`. The slice includes `start` and stops just **before** `stop`:

```python
print(name[0:3])    # Rov
print(name[:3])     # Rov  (start defaults to the beginning)
print(name[2:])     # ver  (stop defaults to the end)
print(name[::-1])   # revoR  (a step of -1 reverses the string)
```

### Concatenation and repetition

Join two strings with `+` (**concatenation**) and repeat a string with `*`:

```python
print("Mission" + " " + "Control")   # Mission Control
print("=-" * 5)                       # =-=-=-=-=-
```

### Strings cannot be changed

A string is **immutable**: you can read its characters but you cannot change one in place. `name[0] = "L"` causes an error. Instead you create a new string, for example `"L" + name[1:]`.

### Common string methods

A **method** is a function that belongs to a value and is called with a dot. Strings have dozens of them. These are the ones you will use most:

| Method | What it does | Example | Result |
|---|---|---|---|
| `.upper()` | All capitals | `"nova".upper()` | `"NOVA"` |
| `.lower()` | All lowercase | `"NOVA".lower()` | `"nova"` |
| `.title()` | Capital letter on each word | `"moon base".title()` | `"Moon Base"` |
| `.strip()` | Removes spaces from both ends | `"  hi  ".strip()` | `"hi"` |
| `.startswith(x)` | Does it begin with x? | `"launch".startswith("la")` | `True` |
| `.endswith(x)` | Does it end with x? | `"launch".endswith("x")` | `False` |
| `.isdigit()` | Only digits? | `"2030".isdigit()` | `True` |

Methods never change the original string; they return a new one. To keep the result, store it: `name = name.upper()`.

### Searching and replacing

```python
report = "water found near crater seven"
print("water" in report)            # True: is it inside?
print(report.find("crater"))        # 17: the index where it starts (or -1 if missing)
print(report.count("e"))            # how many times "e" appears
print(report.replace("seven", "9")) # water found near crater 9
```

### Splitting and joining

`split()` cuts a string into a **list** of pieces (you will study lists in the next lesson), and `join()` glues a list of strings back together using a separator:

```python
sentence = "all systems are go"
words = sentence.split()           # ['all', 'systems', 'are', 'go']
print(len(words))                  # 4
print("-".join(words))             # all-systems-are-go
print("a,b,c".split(","))          # ['a', 'b', 'c']
```

### Formatting and manipulating text

You already know f-strings. Two small methods make output line up neatly: `.center(width)` centres text in a space of that width, and `.ljust(width)` pads it on the right. Together with slicing and the methods above, you can clean up almost any text a user types.

## Key Vocabulary

| Term | Definition |
|---|---|
| **Sequence** | Items in a fixed order, each with a position. |
| **Index** | The position number of a character, starting at 0. |
| **Slice** | A piece of a string taken with `[start:stop]`. |
| **Concatenation** | Joining strings together with `+`. |
| **Immutable** | Cannot be changed after it is created. |
| **Method** | A function attached to a value and called with a dot, such as `.upper()`. |
| **`find()`** | A method that returns the index where text starts, or `-1` if it is not there. |
| **`split()`** | A method that cuts a string into a list of pieces. |
| **`join()`** | A method that glues a list of strings together with a separator. |
| **`len()`** | A function that returns how many characters (or items) something has. |

## Code Example: Transmission Analyzer

```python
# transmission_analyzer.py
# Strings: indexing, slicing, methods, searching, splitting and joining

message = "  Rover Nova reports: water found near CRATER-7, over  "
clean = message.strip()
print("Clean message:", clean)
print("Length:", len(clean))
print("First letter:", clean[0], "| last letter:", clean[-1])
print("First five letters:", clean[:5])
print("Uppercase:", clean.upper())

# Searching and replacing
print("Contains 'water'?", "water" in clean)
print("Position of 'CRATER':", clean.find("CRATER"))
print("Count of 'o':", clean.count("o"))
print(clean.replace("CRATER-7", "CRATER-9"))

# Splitting and joining
words = clean.split()
print("Number of words:", len(words))
print("First word:", words[0], "| last word:", words[-1])
print(" | ".join(words[:3]))

# Reversing with a slice
code = "ORBIT"
print(code, "backwards is", code[::-1])
```

Expected output:

```text
Clean message: Rover Nova reports: water found near CRATER-7, over
Length: 51
First letter: R | last letter: r
First five letters: Rover
Uppercase: ROVER NOVA REPORTS: WATER FOUND NEAR CRATER-7, OVER
Contains 'water'? True
Position of 'CRATER': 37
Count of 'o': 5
Rover Nova reports: water found near CRATER-9, over
Number of words: 8
First word: Rover | last word: over
Rover | Nova | reports:
ORBIT backwards is TIBRO
```

Notice that `strip()` removed the spaces at both ends before anything was measured, so the first letter is `R`, not a space.

## Instructor-Guided Coding Walkthrough

1. Write `"Rover"` on the board with the index numbers underneath, counting from 0. Ask students for the index of `v` before testing it in the editor.
2. Show `name[0]`, `name[-1]` and `name[10]`. Read the `IndexError` and explain what "out of range" means.
3. Slice `name[1:4]`, then `name[:2]` and `name[2:]`. Ask students to predict each before running it.
4. Run `name.upper()` without storing the result, then print `name` again. Establish that strings are not changed by methods, and show `name = name.upper()`.
5. Use `find()` to locate a word and a word that is missing (`-1`). Ask why `-1` is a sensible "not found" signal.
6. Split a sentence into words, loop over the words with a `for` loop and print each on its own line.

Discussion questions:

- Why do you think indexing starts at 0?
- Which string methods could a messaging app use to tidy what users type?
- Why are strings immutable? What does the language gain?

## Student Mission / Guided Challenge

**Explorer Challenge: Word and Text Analyzer**

Build `text_analyzer.py`, a tool that reports facts about any sentence.

1. Ask the user to type a sentence and store it after using `.strip()` to remove extra spaces.
2. Print the number of characters, the number of words and the first and last characters.
3. Print the sentence in uppercase, in lowercase and in title case.
4. Count how many vowels (`a`, `e`, `i`, `o`, `u`) the sentence has. Convert it to lowercase first, then use `.count()` for each vowel and add the counts together.
5. Ask for a word to search for. Print whether the word appears, and the index where it first appears, using `in` and `find()`.
6. Ask for a word to replace and a new word, then print the updated sentence.
7. Use a `for` loop over the list from `.split()` to find and print the **longest word**.
8. Print the sentence backwards and say whether it reads the same backwards as forwards (compare the sentence in lowercase with its reverse, using `[::-1]`).

**Bonus objective:** Print the sentence with every word's first letter capitalised, using `.split()`, a `for` loop and `.join()`.

## Common Mistakes

- Starting to count positions at 1 instead of 0.
- Expecting the slice `[0:3]` to include the character at index 3. It stops just before it.
- Calling a method such as `.upper()` and forgetting to store the result in a variable.
- Trying to change a character in place with `name[0] = "L"`.
- Forgetting the brackets when calling a method, as in `name.upper`, which does not run it.
- Forgetting that `find()` returns `-1` when the text is not found, and using that `-1` as if it were a real position.

## Lesson Recap

Strings are ordered sequences of characters, each with an index that starts at 0. You read characters with indexing, took pieces with slicing, joined and repeated text, and used methods such as `strip()`, `upper()`, `find()`, `count()` and `replace()` to clean and search it. You also met `split()` and `join()`, which convert between a string and a list of words. Text handling like this sits behind search boxes, spell checkers and chat apps.

## Homework / Extension Mission

**Solo Mission: Callsign Generator**

Create `callsign_generator.py` that makes a radio callsign for a crew member. Your program must:

1. Ask for the person's first name, last name and favourite planet.
2. Build a callsign from pieces of those answers using slicing, for example the first three letters of the first name, then a dash, then the last two letters of the planet in capitals, then the length of the last name.
3. Print the callsign in uppercase, and print the full name in title case even if the user typed it in capitals or with extra spaces.
4. Check whether the first name starts and ends with the same letter and print the result.
5. Use `.replace()` to swap every `a` in the callsign for a `4` and print this "secret" version.
6. Ask the user for a message to transmit, use `.split()` to count the words, and print the words joined with `" - "` between them.
7. Check whether the planet name is a palindrome (reads the same forwards and backwards) and print the answer.

Write a comment above each step that explains which string tool you used.

## Portfolio Connection

Today you start your third portfolio project, the **Python Quiz Master** (Part 1). Part 1 asks the questions and checks the answers with string tools: it compares what the player typed with the right answer using `.strip()` and `.lower()` and builds the feedback messages. String skills are part of every project in your portfolio: the **Smart Calculator** formats its answers and the **Number Guessing Game** prints hints. In Lesson 7 you finish the quiz (Part 2) with collections. Later, in Course 3, you will clean messy text columns in real data using the same methods.
