# Lumexa Mission Log: Python Programming Essentials

**Course/Path:** Python Programming Essentials
**Lesson:** 01 of 08
**Title:** Python Setup and Your First Program
**Duration:** 60 minutes
**Difficulty:** Beginner
**Technology:** Python 3

---

## Mission Brief

Every space mission begins the same way: somebody types the first command into a computer. Rockets, rovers, satellites and space telescopes are all controlled by programs — long lists of instructions written by people just like you. Today, Cadet, you take your seat at Mission Control. You will meet **Python**, one of the world's most popular programming languages, learn how a computer turns your words into actions, and write and run your very first program. No coding experience is needed — we start at the very beginning.

## Learning Objectives

1. Explain what Python is and what it is used for.
2. Describe the difference between source code and the Python interpreter.
3. Write, save and run a Python program in your editor.
4. Use `print()` to display text and numbers on the screen.
5. Add comments to a program and follow Python's basic syntax and indentation rules.
6. Explain how Python runs a program: one instruction at a time, from top to bottom.

## Prerequisites

- No coding experience at all — this is where we begin.
- A computer with Python 3 and a code editor, set up by your teacher (or a parent or guardian). At the start of class your teacher will check that it works with a one-line test program.

## Concept Explanation

### What is Python?

**Python** is a programming language: a way of writing instructions that a computer can follow. It was created by Guido van Rossum and first released in 1991, and it is famous for being readable — a lot of Python looks almost like English. That is why it is the favourite first language of schools and the favourite working language of scientists, web developers, game makers and artificial-intelligence researchers.

Everything you build in this program — calculators, games, quiz apps, data explorers — starts with the ideas in this lesson, so take your time.

### Source code and the interpreter

A program is just a **text file** full of instructions. The text you write is called **source code**, and Python files end in `.py` (for example `greeting.py`).

A computer's processor cannot read English-like text directly. Between your source code and the computer sits a helper called the **Python interpreter**. The interpreter reads your file, works out what each instruction means, and asks the computer to carry it out.

You write the code, the interpreter reads it, the computer runs it, and the result appears as **output**. This happens in seconds, which is why Python is great for experimenting: write a line, run it, see what happens.

### Running your first program

Whatever editor your class uses, the steps are the same:

1. Create a **new file** and save it with a name that ends in `.py`, such as `hello.py`.
2. Type your instructions into the file.
3. Press **Run**.
4. Look for the output in the output panel (sometimes called the console).

Your first instruction is `print()`.

### Displaying output with `print()`

`print()` shows something on the screen. Whatever you put between the brackets is what gets displayed:

```python
print("Hello, Mission Control!")
```

The text inside quotation marks is called a **string**. The quotes tell Python "this is text, not a command". You can use single quotes or double quotes, as long as you start and finish with the same kind.

Numbers do not need quotes, and Python can do maths for you:

```python
print(42)
print(7 + 5)
print("7 + 5")
```

The first line prints `42`. The second *calculates* and prints `12`. The third prints the text `7 + 5` exactly as written, because it is inside quotes.

You can give `print()` several things separated by commas. Python puts a space between them:

```python
print("Launch in", 10, "seconds")
```

Calling `print()` with nothing inside the brackets prints an empty line, which is handy for spacing.

### Special characters in strings

Inside a string, a backslash followed by a letter makes a special character. The most useful is `\n`, which starts a new line:

```python
print("Line one\nLine two")
```

If your text contains a quotation mark, wrap it in the other kind of quote:

```python
print("It's launch day!")
print('She said "Go!"')
```

### Comments

A **comment** is a note for humans. Python ignores everything after a `#` on a line:

```python
# This line is only a note for people reading the code
print("Systems check")  # a comment can also sit at the end of a line
```

Good comments say *why* the code does something. Use them to leave yourself clues.

### Syntax: the grammar of Python

**Syntax** means the rules of the language, like grammar in English. Three rules to remember today:

- **Python is case-sensitive.** `print` works; `Print` and `PRINT` do not.
- **Brackets and quotes come in pairs.** If you open one, you must close it.
- **Each instruction normally goes on its own line**, starting at the left edge. Spaces at the start of a line are called **indentation**. Python uses indentation to group instructions, so you must not add spaces at the start of a line unless Python expects them (you will meet that in the lesson on decisions).

### How Python executes instructions

Python starts at the first line and runs **one instruction at a time, from top to bottom**. It never skips ahead, and it never goes back unless you tell it to. So the order of your lines is the order of the output:

```python
print("3")
print("2")
print("1")
print("Liftoff!")
```

If Python finds a mistake, it stops at that line and shows an **error message**. Instructions after the mistake do not run. Error messages look scary at first, but they are really helpful: the last line tells you what went wrong, and the line number tells you where.

```text
  File "hello.py", line 1
    print("Hello, Mission Control!)
          ^
SyntaxError: unterminated string literal (detected at line 1)
```

Here the closing quotation mark is missing. Fix the mistake, run again — that loop of *write, run, fix* is how every programmer works.

## Key Vocabulary

| Term | Definition |
|---|---|
| **Program** | A list of instructions that tells a computer what to do. |
| **Source code** | The text of a program, written by a person. |
| **Python interpreter** | The tool that reads Python source code and carries out its instructions. |
| **Output** | What a program shows or produces, such as text on the screen. |
| **`print()`** | A built-in Python function that displays things on the screen. |
| **String** | Text inside quotation marks, such as `"Hello"`. |
| **Comment** | A note starting with `#` that Python ignores. |
| **Syntax** | The rules that decide how Python code must be written. |
| **Indentation** | Spaces at the start of a line; Python uses them to group code. |
| **Error message** | Python's report that it could not run a line, with the line number and the reason. |

## Code Example: Mission Control Welcome Banner

```python
# welcome_banner.py
# Lumexa Mission Control - our very first program

print("=================================")
print("  WELCOME TO MISSION CONTROL")
print("=================================")
print()  # a blank line for spacing

print("Cadet on duty: Nova")
print("Launch countdown starts in", 10, "seconds")
print("Fuel check:", 100 - 8, "percent remaining")
print("All systems", "GO!")
```

Expected output:

```text
=================================
  WELCOME TO MISSION CONTROL
=================================

Cadet on duty: Nova
Launch countdown starts in 10 seconds
Fuel check: 92 percent remaining
All systems GO!
```

Notice how the output follows the order of the lines, how `100 - 8` was calculated before printing, and how the comments never appear on the screen.

## Instructor-Guided Coding Walkthrough

1. Open the editor on the shared screen and create `hello.py` together. Ask students to predict what `print("Hello, Mission Control!")` will do before pressing Run.
2. Break the program on purpose: delete the closing quotation mark and run it again. Read the error message aloud together — line number first, then the last line of the message — and fix it.
3. Change `print` to `Print`. Ask: "Why did that fail when it looks almost the same?" Establish that Python is case-sensitive.
4. Type `print(7 + 5)` and `print("7 + 5")` one after the other. Ask students to explain the difference between a calculation and a string.
5. Add an extra space at the start of one `print` line and run it. Show the `IndentationError` and explain that indentation is meaningful in Python.
6. Live-code the welcome banner and have students change the name and the numbers.

Discussion questions:

- Why is it useful that the interpreter stops at the first error instead of skipping it?
- What is the difference between source code and output?
- Where in everyday life do we give instructions that must be followed in order?

## Student Mission / Guided Challenge

**Explorer Challenge: Personalized Greeting Program**

Create a file called `greeting.py` that welcomes a visitor to your own mission control room.

1. Start with two comment lines: your name and what the program does.
2. Print a decorative line of symbols, then a title such as `WELCOME TO <YOUR NAME>'S MISSION CONTROL`, then another line of symbols.
3. Print a greeting that includes your name and your age.
4. Print your favourite planet, star or space mission on its own line.
5. Print the number of days until your next birthday (or any number you like) using a calculation such as `365 - 120` inside `print()`.
6. Finish with a goodbye message on a new line using `\n`.
7. Run it, then fix any error messages one at a time.

**Bonus objective:** Use several `print()` lines to draw a small rocket made of text characters.

## Common Mistakes

- Forgetting the closing quotation mark or closing bracket.
- Writing `Print` or `PRINT` instead of `print` — Python is case-sensitive.
- Using curly "smart quotes" copied from a word processor instead of the straight quotes `"` and `'` on the keyboard.
- Leaving off the brackets, as in `print "Hello"`.
- Adding spaces at the start of a line by accident, which causes an `IndentationError`.
- Putting quotes around a calculation, so `print("2 + 3")` shows the text instead of `5`.

## Lesson Recap

Today you met Python, the language you will use for the rest of this program. You learned that source code is text written by a person, and that the interpreter reads it and runs it one instruction at a time from top to bottom. You wrote and ran programs with `print()`, used strings, numbers and calculations, added comments, and learned the first rules of Python syntax. Most importantly, you practised the programmer's loop: write, run, read the error, fix.

## Homework / Extension Mission

**Solo Mission: Mission Patch Printer**

Create `mission_patch.py` that prints a design for your own mission patch. Your program must:

1. Begin with at least two comment lines that explain what the program does.
2. Print at least eight lines of output that together form a patch, including a border made of symbols.
3. Show your mission name, your crew name, and a destination (a planet, moon or star).
4. Include at least one calculation inside `print()`, such as the number of days of a trip (`7 * 24`).
5. Use `\n` once to create a new line inside a single `print()`.

Then break the program on purpose in two different ways (for example a missing quote and a misspelled `print`). Copy each error message into a comment at the bottom of the file, and write one sentence about how you fixed it.

## Portfolio Connection

Everything in this program is built from the idea you practised today: write instructions, run them, read what happens. In Lesson 3 you will replace fixed text with information typed by the user and build your first portfolio project, the **Smart Calculator**. Every project that follows, up to the **Python Quiz Master**, begins with a file like the one you made today.
