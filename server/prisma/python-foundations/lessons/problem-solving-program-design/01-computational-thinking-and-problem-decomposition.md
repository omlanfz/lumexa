# Lumexa Mission Log: Problem Solving & Program Design

**Course/Path:** Problem Solving & Program Design
**Lesson:** 01 of 08
**Title:** Computational Thinking & Problem Decomposition
**Duration:** 60 minutes
**Difficulty:** Beginner
**Technology:** Python 3

---

## Mission Brief

Welcome to Flight Control, Cadet. In Course 1 you learned the vocabulary of Python. Now you learn to think like the people who use it. When engineers plan a Moon landing they do not start typing. They break the mission into small problems, work out what information goes in and what must come out, write the steps in plain language, and walk through them by hand to look for mistakes. That way of thinking is called **computational thinking**, and it is the most valuable skill in this course. Today you will practise it on a real problem and design your own **Daily Task Planner**.

## Learning Objectives

1. Explain what computational thinking is and name its four main parts.
2. Break a complex problem into smaller tasks (decomposition).
3. Describe a problem's inputs, processes and outputs.
4. Write a step-by-step solution as pseudocode and sketch a simple flowchart.
5. Trace a program by hand with a dry run.
6. Identify edge cases and decide what the expected outcome should be.

## Prerequisites

- Course 1: you can write programs with variables, input, `if` statements, loops, lists and functions.
- You are willing to think on paper before you type.

## Concept Explanation

### What is computational thinking?

**Computational thinking** is a way of solving problems so that a person *or a computer* can carry out the solution. It has four parts:

| Part | The question it asks | Example: planning a school trip |
|---|---|---|
| **Decomposition** | How can I split this into smaller problems? | Transport, food, money, permission slips |
| **Pattern recognition** | Have I seen something like this before? | Every trip needs a list and a budget |
| **Abstraction** | Which details matter, and which can I ignore? | The bus colour does not matter; the seats do |
| **Algorithm design** | What are the exact steps, in order? | A numbered plan anyone could follow |

You will use all four on every project from now on.

### Breaking problems into smaller tasks

**Decomposition** means splitting a big problem until every piece is small enough to solve on its own. "Build a mission planner" is too big. But "read the tasks", "sort them by importance", "fit them into the time available" and "print the plan" are all things you can already do. Each small task can often become a function later.

### Inputs, processes and outputs

Every program, however large, does three things: it takes **input**, performs a **process** and gives **output**. Writing these down first keeps you focused:

| Input | Process | Output |
|---|---|---|
| A list of tasks with their length and priority; the minutes available | Sort by priority, add tasks while there is time left | The ordered plan and the tasks that did not fit |

If you cannot say what the inputs and outputs are, you are not ready to write code.

### Step-by-step solutions and pseudocode

An **algorithm** is a precise list of steps that solves a problem. **Pseudocode** is a way of writing an algorithm in plain, structured English, halfway between ordinary language and Python. It ignores punctuation and syntax so you can concentrate on the logic:

```text
SET available time to 150 minutes
SET minutes used to 0
FOR each priority level from 1 to 3
    FOR each task with that priority
        IF minutes used + task length fits in the available time
            ADD the task to the plan
            ADD its length to minutes used
        ENDIF
    ENDFOR
ENDFOR
PRINT the plan
```

Good pseudocode uses a small set of words: `SET`, `INPUT`, `PRINT`, `IF / ELSE`, `FOR`, `WHILE`. Anyone who knows Python should be able to translate it line by line.

### Flowcharts

A **flowchart** draws the same algorithm as shapes and arrows: an oval for start and end, a rectangle for an action, a parallelogram for input or output, and a diamond for a yes/no decision. Arrows show the order. Flowcharts make branches and loops easy to see at a glance, so draw one whenever a program has a decision you find hard to describe in words.

### Tracing with a dry run

A **dry run** means executing your algorithm by hand, with sample data, **before** you write the code. You keep a **trace table** with one row per step and one column per variable:

| Step | Task | Fits? | minutes used |
|---|---|---|---|
| start | | | 0 |
| 1 | Check oxygen (15) | yes | 15 |
| 2 | Repair antenna (90) | yes | 105 |
| 3 | Exercise (45) | no, 150 would be exceeded | 105 |

Dry runs find logic mistakes in minutes. Finding the same mistake after hours of coding is far more painful.

### Edge cases and expected outcomes

An **edge case** is an unusual but possible situation at the edge of what your program expects. A good designer lists them before coding and decides what *should* happen:

- The task list is **empty**. (Print "Nothing to plan".)
- **No** task fits in the time available.
- Two tasks have the **same priority**.
- The available time is **zero** or negative.
- A task is **longer than the whole day**.

For each edge case write the **expected outcome**. Later, these become the tests that prove your program works.

## Key Vocabulary

| Term | Definition |
|---|---|
| **Computational thinking** | Solving problems in a way that a person or a computer can carry out. |
| **Decomposition** | Breaking a big problem into smaller, simpler problems. |
| **Abstraction** | Focusing on the important details and ignoring the rest. |
| **Algorithm** | A precise, ordered list of steps that solves a problem. |
| **Pseudocode** | A plain-language, structured description of an algorithm. |
| **Flowchart** | A diagram that shows the steps and decisions of an algorithm with shapes and arrows. |
| **Dry run** | Tracing an algorithm by hand with sample data. |
| **Trace table** | A table that records the value of each variable at every step of a dry run. |
| **Edge case** | An unusual situation at the limits of what a program expects. |
| **Expected outcome** | What the correct result should be for a given input. |

## Code Example: Daily Task Planner (from pseudocode to Python)

```python
# task_planner.py
# Turning pseudocode into Python: organise and prioritise a day's tasks

# INPUT: (task name, minutes needed, priority) where 1 is the most important
tasks = [
    ("Check oxygen levels", 15, 1),
    ("Update mission log", 30, 3),
    ("Repair antenna", 90, 1),
    ("Water the space garden", 20, 2),
    ("Exercise", 45, 2),
]
available_minutes = 150

# PROCESS: take tasks in priority order while there is time left
planned = []
skipped = []
minutes_used = 0
for priority in (1, 2, 3):
    for name, minutes, task_priority in tasks:
        if task_priority == priority:
            if minutes_used + minutes <= available_minutes:
                planned.append(name)
                minutes_used += minutes
            else:
                skipped.append(name)

# OUTPUT
print(f"Plan for today ({minutes_used} of {available_minutes} minutes):")
step = 1
for name in planned:
    print(f"  {step}. {name}")
    step += 1
if len(skipped) > 0:
    print("Did not fit today:", ", ".join(skipped))
else:
    print("Everything fits today!")
```

Expected output:

```text
Plan for today (125 of 150 minutes):
  1. Check oxygen levels
  2. Repair antenna
  3. Water the space garden
Did not fit today: Exercise, Update mission log
```

Compare the program with the pseudocode above: the structure is the same, line for line. The three comments `INPUT`, `PROCESS` and `OUTPUT` keep the program organised, and the `skipped` list handles an edge case that the first draft of the pseudocode forgot.

## Instructor-Guided Coding Walkthrough

1. Start with the vague request "Make a planner for my day". Ask students what they would need to know before writing any code, and collect their questions on the board as inputs, processes and outputs.
2. Decompose the problem together into four or five small tasks. Ask which of them could become a function later.
3. Write the pseudocode on the board with the class, then run a dry run with the five sample tasks. Fill in a trace table step by step.
4. Ask students to find the edge cases: the empty list, no task fits, a task longer than the day. Add the expected outcome for each.
5. Translate the pseudocode into Python one line at a time and run it. Compare the real output with the dry run.
6. Change `available_minutes` to 20 and then to 0, and discuss what the program does and what it *should* do.

Discussion questions:

- Which of the four parts of computational thinking was hardest, and why?
- When would you skip pseudocode, and when would skipping it cost you time?
- How does a dry run save time compared with testing only by running the code?

## Student Mission / Guided Challenge

**Explorer Challenge: Daily Task Planner**

Design, then build, a program that organises and prioritises your own tasks. Do the design work **before** you open the editor.

1. Write down the inputs, processes and outputs of the planner in a three-column table.
2. Decompose the problem into at least four smaller tasks.
3. Write the algorithm as pseudocode, then draw a flowchart on paper that shows the main decision.
4. Do a dry run with at least five tasks and fill in a trace table.
5. List at least four edge cases, with the expected outcome of each.
6. Only now write `daily_planner.py`. Store tasks as tuples in a list (task name, minutes, priority), ask the user for the number of minutes available, and print the plan and the tasks that did not fit.
7. Run your program on every edge case and compare the results with your expected outcomes. Fix any difference.

**Bonus objective:** Let the user type their own tasks in a loop until they enter an empty name.

## Common Mistakes

- Starting to type code before understanding the inputs and outputs.
- Writing pseudocode that is really Python in disguise, with brackets and colons, instead of describing the logic.
- Skipping the dry run, so a logic mistake is only discovered after a lot of code exists.
- Testing only the "normal" case and never the empty list, the zero or the very large value.
- Decomposing into pieces that are still too big, such as "do the maths".
- Forgetting to decide the expected outcome, so there is no way to tell whether the program is right.

## Lesson Recap

You learned to think before you type. Computational thinking combines decomposition, pattern recognition, abstraction and algorithm design. You described problems as inputs, processes and outputs, wrote step-by-step solutions in pseudocode, sketched flowcharts, and traced a plan by hand with a dry run. You also learned to list edge cases and expected outcomes so that you can prove a program works. These habits turn guessing into engineering.

## Homework / Extension Mission

**Solo Mission: Launch Day Planner**

Plan a software tool for launch day at a small space centre. Your submission must include:

1. A one-paragraph description of the problem in your own words.
2. An input, process and output table.
3. A decomposition into at least five smaller tasks, with a note on which could become functions.
4. Pseudocode of at least twelve lines that includes one loop and one decision.
5. A flowchart (photograph a hand-drawn one) of the main decision.
6. A dry run with a trace table of at least six rows.
7. A list of at least five edge cases with the expected outcome of each.
8. A Python program `launch_planner.py` that implements your design, and a short note that compares what your dry run predicted with what the program actually did.

## Portfolio Connection

Your portfolio projects in this course all start the way you worked today: with a clear description of inputs, processes and outputs. You build three of them, each in two parts: the **Text-Based Adventure Game** in Lessons 2 and 3, the **Library Management System** in Lessons 4 and 5 and the **Personal Expense Tracker** in Lessons 6 and 7. In Lesson 8 you recap all three. The game needs a plan for its rooms and choices before you code them, the library begins with decomposition into books, borrowers and records, and the tracker needs its edge cases (a negative amount, an empty file) listed first. Keep your pseudocode and flowcharts, because they are part of what makes a portfolio project impressive.
