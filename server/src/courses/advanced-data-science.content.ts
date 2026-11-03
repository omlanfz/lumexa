// FILE PATH: server/src/courses/advanced-data-science.content.ts
//
// One-time content migration for the "Advanced Data Science" CUSTOM course
// (slug: advanced-data-science, isCustom: true) — a one-off curriculum an
// admin built via the Custom Curriculum Builder by importing lessons from
// little-coders-path's python-for-young-builders module (orders 1-8) and
// game-creator-path's python-arcade-games module (orders 10-17). Unlike
// the default pathway courses, this course is never touched by
// seedCurriculumContent's course loop (that only processes PATHWAY_SLUGS +
// lumexa-odyssey) and has no CourseModule/Project rows of its own — custom
// course lessons are always flat, moduleId: null (see lessonImportData) —
// so its content can only be fixed by directly targeting this course's own
// Lesson rows. The shared little-coders-path/game-creator-path source JSON
// is deliberately left untouched: those modules still serve every OTHER
// course/student using them unchanged.
//
// Applied by backfillAdvancedDataScience in curriculum-catalog.seed.ts,
// gated per-lesson on the lesson's CURRENT title still matching one of its
// known prior values (matchTitle accepts a single string or an array, for
// lessons whose live title could be in either of two known prior states)
// — so re-running this on every boot is a no-op once applied, and an admin
// who has since retitled a lesson by hand is never overwritten. Orders
// 11-16 were added in the Cosmic Defender redesign (previously the generic
// python-arcade-games activities at those orders, left untouched until
// then). Order 18 (Course Test) and orders 19-46 are deliberately absent
// from this list — left exactly as imported, per the redesign scope.

export interface AdvancedDataScienceLessonFix {
  order: number;
  /**
   * Guard: only applied while the lesson's title is still exactly this (or,
   * if an array, still exactly one of these) — an array covers a lesson
   * whose live title could currently be in either of two known states
   * (e.g. the original imported title, or a title a previous redesign pass
   * already applied, depending on whether that pass has reached this
   * environment's database yet).
   */
  matchTitle: string | string[];
  /** New title — omit to keep the current (matched) title unchanged. */
  title?: string;
  objectives: string[];
  contentMarkdown: string;
  homework: string;
  /** Short "what's due by the end of this session" line — omit to leave unset. */
  checkpoint?: string;
  codeSnippets: {
    label: string;
    language: string;
    code: string;
    part?: string;
  }[];
  projectLinks: { title: string; url: string }[] | null;
}

const PERSONAL_QUIZ_APP = {
  title: 'Personal Quiz App',
  url: 'https://colab.research.google.com/drive/1NjFcm03taB5wqdiiQ6Bk9N6ZAbYftwdJ?usp=sharing',
};
const SIMPLE_CALCULATOR = {
  title: 'Simple Calculator',
  url: 'https://colab.research.google.com/drive/1Rmd1w3KT76Eni7CYYFiRd8FtGfeWx4BS?usp=sharing',
};
const WORD_GUESSING_GAME = {
  title: 'Word Guessing Game',
  url: 'https://colab.research.google.com/drive/1Fh01Rq7laGPgQ9e91aIsZQm2sNuC1huY?usp=sharing',
};

export const ADVANCED_DATA_SCIENCE_FIXES: AdvancedDataScienceLessonFix[] = [
  // ─────────────────────────────────────────────────────────────────────
  // Lesson 1 — From Blocks to Words — Hello, Python! (no project yet)
  // ─────────────────────────────────────────────────────────────────────
  {
    order: 1,
    matchTitle: 'From Blocks to Words — Hello, Python!',
    objectives: [
      'Open a Python editor (Thonny or Replit) and identify where to type and run code.',
      'Use the `print()` function to display text on the screen.',
      'Run a Python program and read its output in the console.',
      'Explain what a string is and why it needs quotation marks.',
      'Find and fix a simple syntax error, like a missing quote or parenthesis.',
    ],
    homework:
      'Think of your favorite book, movie, or video game character. Write three `print()` lines that introduce them — their name, one fact about them, and one special power or skill. Example:\n```python\nprint("This is Luigi!")\nprint("He is Mario\'s brother.")\nprint("He can jump very high and is scared of ghosts!")\n```\nIf you have a computer at home, run it in Thonny or Replit to make sure it works, and bring your character to share next class.',
    contentMarkdown: `# Advanced Data Science — Lesson 1: From Blocks to Words — Hello, Python!

**Course/Path:** Python Foundations
**Lesson:** 01 of 08
**Title:** From Blocks to Words — Hello, Python!
**Duration:** 45–60 minutes
**Difficulty:** Beginner
**Technology:** Python 3.11+ (Thonny or Replit)

---

## Mission Brief
You've snapped blocks together before to make a sprite talk. Today you trade blocks for typed words — the exact same idea, but written in **Python**, a real programming language used by professional coders, scientists, and game studios all over the world. By the end of this lesson you'll have written and run your very first real program.

## Learning Objectives
1. Open a Python editor (Thonny or Replit) and identify where to type and run code.
2. Use the \`print()\` function to display text on the screen.
3. Run a Python program and read its output in the console.
4. Explain what a **string** is and why it needs quotation marks.
5. Find and fix a simple syntax error, like a missing quote or parenthesis.

## What You'll Learn
You already know that a Scratch "say" block makes a sprite talk. In Python, the job of "making words appear" belongs to one command: \`print()\`. You'll type your first real line of code, run it, watch it work, and then learn what happens when something is typed slightly wrong — because finding and fixing small mistakes is a normal, everyday part of coding, not a sign you did something wrong.

## Why It Matters
Every programming language — Python, JavaScript, the language behind your favorite game — has some version of "make text appear on the screen," because that's how a program talks back to the person using it. \`print()\` is the very first tool every Python programmer learns, and you'll use it in every project for the rest of this course, from quiz apps to full games.

## Real-World Connection
- Video games print score updates and dialogue to the screen using the same core idea as \`print()\`.
- Websites show you messages like "Item added to cart!" using this same "display something to the user" concept.
- Even mission control software prints live status updates to screens during a real rocket launch.

## Key Terminology
| Term | Definition |
|---|---|
| **Python** | A real, typed programming language used by professional coders worldwide. |
| **print()** | A built-in Python function that displays text or values on the screen. |
| **String** | Text data, always wrapped in quotation marks, like \`"Hello, world!"\`. |
| **Syntax** | The exact spelling and punctuation rules a programming language requires. |
| **Syntax Error** | A message Python shows when your code breaks a syntax rule, like a missing quote. |
| **Shell / Console** | The area where your program's output (and error messages) appear after you run it. |
| **Run** | The action of telling Python to actually execute your code, line by line. |

## Concept Explanation
Python reads your code one line at a time, from top to bottom, and does exactly what each line says — nothing more, nothing less. The \`print()\` function is Python's way of showing something to the person running the program: whatever you put inside the parentheses gets displayed in the **shell** (the output area).

Text in Python is called a **string**, and it must always be wrapped in quotation marks — either \`"double quotes"\` or \`'single quotes'\`, as long as you use the same kind on both ends. The quotes tell Python "everything between us is just text, not a command." Leave one out, and Python can't tell where your text starts or ends — that's a **syntax error**, and it's completely normal. Every programmer, from total beginners to engineers at the biggest tech companies, sees syntax errors constantly. The skill isn't avoiding them — it's reading the error message and fixing them quickly.

## Step-by-Step Instruction
1. Open Thonny (or your Replit project).
2. Find the **editor** (where you type code) and the **shell** (where output appears).
3. Click in the editor and type: \`print("Hello, world!")\`
4. Press the green **Run** button (or F5).
5. Look in the shell — you should see \`Hello, world!\` appear.
6. Add a second line below it: \`print("My name is Python, and I love to help you build things!")\`
7. Run the program again and watch both lines print, in order, top to bottom.

## Code Example
\`\`\`python
# My first Python program

print("Hello, world!")
print("My name is Python, and I love to help you build things!")

# Try changing the message to use your own name
print("Hello, my name is Maya!")
\`\`\`

## Code Explanation
- Each \`print(...)\` line runs separately and in order — Python always goes top to bottom.
- The text inside the quotes is a **string** — Python displays it exactly as typed.
- Lines that start with \`#\` are **comments** — Python ignores them completely. They're notes for humans, not instructions for the computer.
- There's no limit to how many \`print()\` lines a program can have.

## Expected Output
\`\`\`
Hello, world!
My name is Python, and I love to help you build things!
Hello, my name is Maya!
\`\`\`

## Guided Practice
1. Change the greeting to use your own name instead of "Maya."
2. Add a fourth \`print()\` line sharing your favorite color.
3. Add a fifth line sharing your favorite animal.
4. Run the program and check that all five lines appear, in the order you typed them.

## Hands-On Activity
Write a program with exactly three \`print()\` lines that introduce you: your name, your favorite color, and your favorite animal. Run it, then compare your output with a partner's — whose favorite animal is different from yours?

## Student Challenge
Use several \`print()\` lines to draw a tiny picture out of text characters (this is called **ASCII art**). Try a rocket:
\`\`\`python
print("   /\\\\   ")
print("  /  \\\\  ")
print(" |    | ")
print(" |PYTHON|")
print("/______\\\\")
\`\`\`
Can you design your own picture — a star, a house, or a robot face?

## Common Mistakes
- **Missing a quote**: \`print("Hello, world!)\` is missing its closing \`"\` — Python can't tell where the string ends.
- **Missing a parenthesis**: \`print("Hello, world!"\` is missing its closing \`)\`.
- **Mixing quote types**: starting with \`"\` and ending with \`'\` confuses Python — always match the same kind on both ends.
- **Forgetting parentheses entirely**: \`print "Hello"\` (without parentheses) is not valid Python.

## Debugging Guidance
- Read the error message in the shell — it usually names the exact problem, like \`SyntaxError: unterminated string literal\`.
- Count your quote marks and parentheses — every opening one needs a matching closing one.
- If you're stuck, delete the line and retype it carefully rather than hunting character by character.
- A friend's fresh eyes catch typos faster than your own — ask a partner to look if you're stuck for more than a minute.

## Mini Quiz
1. What function do you use to display text on the screen?
2. What punctuation marks must wrap around a string?
3. What does Python call a line that starts with \`#\`?
4. What happens if you forget a closing quotation mark?
5. True or False: Python runs your program's lines in a random order.

### Answer Key
1. \`print()\`.
2. Quotation marks (\`" "\` or \`' '\`).
3. A comment — Python ignores it.
4. Python shows a syntax error because it can't tell where the string ends.
5. False — Python always runs lines in order, from top to bottom.

## Lesson Recap
You opened a Python editor, wrote and ran your very first program using \`print()\`, learned what a string is and why it needs quotation marks, and practiced finding and fixing a simple syntax error. This is the exact same first step every professional Python programmer once took.

## Homework / Extension
Think of your favorite book, movie, or video game character. Write three \`print()\` lines that introduce them — their name, one fact about them, and one special power or skill. Example:
\`\`\`python
print("This is Luigi!")
print("He is Mario's brother.")
print("He can jump very high and is scared of ghosts!")
\`\`\`
If you have a computer at home, run it in Thonny or Replit to make sure it works, and bring your character to share next class.

## Portfolio Project Connection
Starting next lesson, you'll begin building three real programs for your portfolio: a **Personal Quiz App**, a **Simple Calculator**, and a **Word Guessing Game**. Every single one of them starts with the exact same tool you just learned — \`print()\` — to show questions, results, and messages to the player.`,
    codeSnippets: [
      {
        label: 'Code Example 1',
        language: 'python',
        part: 'reference',
        code: `# My first Python program

print("Hello, world!")
print("My name is Python, and I love to help you build things!")

# Try changing the message to use your own name
print("Hello, my name is Maya!")`,
      },
    ],
    projectLinks: null,
  },

  // ─────────────────────────────────────────────────────────────────────
  // Lesson 2 — Variables and User Input (Personal Quiz App, Part 1)
  // ─────────────────────────────────────────────────────────────────────
  {
    order: 2,
    matchTitle: 'Variables and User Input',
    objectives: [
      'Create a variable to store a piece of information.',
      'Use `input()` to ask the player a question and store their answer.',
      'Explain why a variable name should clearly describe what it stores.',
      'Use `print()` to display stored variables back to the player.',
      'Begin building the Personal Quiz App by collecting the player’s name.',
    ],
    homework:
      'Think about your dream pet — maybe a dragon, a robot dog, or a flying cat. Write three variables describing it, then print them:\n```python\npet_name = "Sparkle"\npet_type = "dragon"\npet_power = "breathes rainbow fire"\n\nprint(pet_name)\nprint(pet_type)\nprint(pet_power)\n```\nIf you have a computer at home, run it in Thonny or Replit. Bring your dream pet to share with the class next time!',
    contentMarkdown: `# Advanced Data Science — Lesson 2: Variables and User Input

**Course/Path:** Python Foundations
**Lesson:** 02 of 08
**Title:** Variables and User Input
**Duration:** 45–60 minutes
**Difficulty:** Beginner
**Technology:** Python 3.11+ (Thonny or Replit)

---

## Mission Brief
Today you start building your very first portfolio project: the **Personal Quiz App**. Before any quiz can ask a question, your program needs a way to *remember* things — the player's name, their answer, their score. That's exactly what a **variable** does. By the end of this lesson, your program will greet a player by name and start collecting information from them.

## Learning Objectives
1. Create a variable to store a piece of information.
2. Use \`input()\` to ask the player a question and store their answer.
3. Explain why a variable name should clearly describe what it stores.
4. Use \`print()\` to display stored variables back to the player.
5. Begin building the Personal Quiz App by collecting the player's name.

## What You'll Learn
You'll learn how to create a **variable** — a labeled box that holds a piece of information — and how to use \`input()\` to ask the player a question and store whatever they type. Together, these two tools are the foundation of every interactive program you'll ever write, including the quiz app you'll finish next lesson.

## Why It Matters
A program that only ever prints the same fixed text is not very interesting — it can't respond to the person using it. The moment a program can **ask** something and **remember** the answer, it becomes interactive. That's the difference between a poster and a conversation, and it's the first real step toward building apps, games, and quizzes that feel alive.

## Real-World Connection
- Every login screen asks for your username and remembers it in a variable while you use the app.
- A video game remembers your character's name, score, and health in variables that update constantly.
- Even a simple calculator app stores the numbers you type into variables before doing any math with them.

## Key Terminology
| Term | Definition |
|---|---|
| **Variable** | A named container that stores a value which can change. |
| **Assignment (\`=\`)** | The operator that stores a value in a variable, e.g. \`name = "Nova"\`. |
| **input()** | A built-in function that pauses the program, asks a question, and returns whatever the player types. |
| **String** | Text data, like a name typed by the player. |
| **Variable Name** | The label used to refer to a stored value — should clearly describe what it holds. |

## Concept Explanation
A **variable** is like a labeled box: you put something inside it, and the label tells you (and Python) what's there. In Python, you create a variable with the \`=\` sign, which means "store this value in this box" — not "these two things are equal," like in math class.

\`\`\`python
name = "Captain Nova"
print(name)
\`\`\`

Notice there are no quotes around \`name\` in the \`print()\` line — that's because we want what's **inside** the box, not the literal word "name." Quotes mean "this is just text"; no quotes around a word means "look up what's stored in this variable."

The \`input()\` function lets your program ask a real question and wait for the player to type an answer. Whatever the player types gets stored in a variable, as text:

\`\`\`python
name = input("What is your name? ")
print(name)
\`\`\`

Run this, and Python pauses at the \`input()\` line until you type something and press Enter — then it continues, with your answer safely stored in \`name\`.

## Step-by-Step Instruction
1. Open Thonny or Replit.
2. Type \`name = "Captain Nova"\` and then \`print(name)\` — run it and confirm you see \`Captain Nova\`.
3. Replace the first line with \`name = input("What is your name? ")\` and run it again — type your name when asked.
4. Add a second variable: \`age = input("How old are you? ")\` and print it too.
5. Add a third variable for a favorite topic: \`topic = input("What's your favorite quiz topic? ")\`.
6. Print all three variables, one per line.

## Code Example
\`\`\`python
# Personal Quiz App - Part 1: Collecting the player's info

name = input("What is your name, quiz champion? ")
age = input("How old are you? ")
topic = input("What's your favorite quiz topic? ")

print("Welcome to the quiz, " + name + "!")
print(name)
print(age)
print(topic)
\`\`\`

## Code Explanation
- \`input("...")\` displays the question in the quotes, then waits for the player to type and press Enter.
- Whatever the player types is **always text (a string)**, even if it looks like a number — we'll fix that problem next lesson.
- The \`+\` sign between two strings joins ("concatenates") them into one piece of text.
- Storing \`name\`, \`age\`, and \`topic\` in separate variables means we can use each one again later, anywhere in the program.

## Expected Output
\`\`\`
What is your name, quiz champion? Maya
How old are you? 11
What's your favorite quiz topic? Space
Welcome to the quiz, Maya!
Maya
11
Space
\`\`\`
(Your own output will show whatever you typed instead.)

## Guided Practice
1. Add a fourth question asking for the player's favorite subject in school.
2. Print a full sentence combining at least two variables, like \`"Maya is 11 years old."\`
3. Try printing a variable with the wrong spelling (like \`nam\` instead of \`name\`) on purpose — read the error Python gives you, then fix it.

## Hands-On Activity
Build a "Quiz Champion ID Card": ask for the player's name, age, and favorite quiz topic using three separate \`input()\` calls, store each in a clearly-named variable, then print all three back in a short welcome message.

## Student Challenge
Variables can hold numbers too, and Python can do math with them directly (not from \`input()\` yet — that trick comes next lesson). Try:
\`\`\`python
score = 10
bonus = 5
total = score + bonus
print(total)
\`\`\`
Add a \`penalty\` variable and subtract it from \`total\`. What's the new value?

## Common Mistakes
- **Typos in variable names**: \`name = input(...)\` then \`print(nam)\` causes a \`NameError\` — spelling must match exactly every time.
- **Forgetting quotes in the question**: \`input(What is your name?)\` without quotes is a syntax error — the question itself is a string too.
- **Confusing \`=\` with "equals"**: \`=\` stores a value; it does not compare two things.
- **Reusing a variable name by accident**: storing something new into \`name\` overwrites whatever was there before.

## Debugging Guidance
- A \`NameError\` almost always means a variable name is misspelled or was never created — check your spelling character by character.
- If output looks wrong, add an extra \`print()\` right after you create a variable to confirm what's actually stored in it.
- Read error messages from the bottom up — the last line names the real problem.

## Mini Quiz
1. What symbol do you use to store a value in a variable?
2. What does \`input()\` always return, no matter what the player types?
3. Why should a variable be named \`age\` instead of \`x\`?
4. What happens if you spell a variable name differently in two places?
5. True or False: quotes belong around a variable's name when you print it.

### Answer Key
1. The \`=\` (assignment) sign.
2. Text (a string).
3. A clear name describes what the variable stores, which makes code easier to read and debug.
4. Python treats them as two different (and the second one, nonexistent) variables, causing a \`NameError\`.
5. False — quotes are for literal text, not for the variable's name.

## Lesson Recap
You created your first variables, learned the difference between storing a value and comparing two values, and used \`input()\` to start collecting real information from the player — the first working piece of your Personal Quiz App.

## Homework / Extension
Think about your dream pet — maybe a dragon, a robot dog, or a flying cat. Write three variables describing it, then print them:
\`\`\`python
pet_name = "Sparkle"
pet_type = "dragon"
pet_power = "breathes rainbow fire"

print(pet_name)
print(pet_type)
print(pet_power)
\`\`\`
If you have a computer at home, run it in Thonny or Replit. Bring your dream pet to share with the class next time!

## Portfolio Project Connection
This lesson is **Part 1 of your Personal Quiz App**. You've already built the part that greets the player and collects their info — next lesson, you'll make the welcome message smoother with string formatting, and the lesson after that you'll add real quiz questions and scoring.`,
    codeSnippets: [
      {
        label: 'Code Example 1',
        language: 'python',
        part: 'reference',
        code: `# Personal Quiz App - Part 1: Collecting the player's info

name = input("What is your name, quiz champion? ")
age = input("How old are you? ")
topic = input("What's your favorite quiz topic? ")

print("Welcome to the quiz, " + name + "!")
print(name)
print(age)
print(topic)`,
      },
    ],
    projectLinks: [PERSONAL_QUIZ_APP],
  },

  // ─────────────────────────────────────────────────────────────────────
  // Lesson 3 — Printing and String Formatting (Personal Quiz App, Part 2)
  // ─────────────────────────────────────────────────────────────────────
  {
    order: 3,
    matchTitle: 'Printing and String Formatting',
    objectives: [
      'Build an f-string that mixes text and a variable together.',
      'Use `int()` to convert typed input into a real number.',
      'Combine multiple variables into one smooth, printed sentence.',
      'Explain why `input()` always returns text, even when it looks like a number.',
      'Finish the welcome section of the Personal Quiz App with proper formatting.',
    ],
    homework:
      'Pick a family member and write an f-string birthday message about them:\n```python\nname = "Grandma Rosa"\nfun_fact = "makes the best pancakes"\nprint(f"Happy Birthday, {name}! Everyone knows you {fun_fact}.")\n```\nIf you have a computer at home, try running it in Thonny or Replit. Bring your message to share next class!',
    contentMarkdown: `# Advanced Data Science — Lesson 3: Printing and String Formatting

**Course/Path:** Python Foundations
**Lesson:** 03 of 08
**Title:** Printing and String Formatting
**Duration:** 45–60 minutes
**Difficulty:** Beginner
**Technology:** Python 3.11+ (Thonny or Replit)

---

## Mission Brief
Last lesson your Personal Quiz App learned to collect a player's name, age, and favorite topic — but the output looked clunky, printed on separate lines. Today you'll learn **f-strings**, the tool real Python programmers use to weave variables smoothly into real sentences, and you'll fix a hidden problem with numbers typed through \`input()\`.

## Learning Objectives
1. Build an f-string that mixes text and a variable together.
2. Use \`int()\` to convert typed input into a real number.
3. Combine multiple variables into one smooth, printed sentence.
4. Explain why \`input()\` always returns text, even when it looks like a number.
5. Finish the welcome section of the Personal Quiz App with proper formatting.

## What You'll Learn
You'll learn to build **f-strings** — a fill-in-the-blank style of printing that mixes plain words with variable values in one smooth sentence — and how to convert text typed by the player into a real number using \`int()\`, so you can safely do math with it.

## Why It Matters
"Welcome\\nMaya\\n11\\nSpace" on four separate lines works, but it doesn't read like a real app. Every polished program — quiz apps, games, websites — formats its output into natural sentences. F-strings are the single most common formatting tool in professional Python code, and getting comfortable with them now will make every future lesson easier.

## Real-World Connection
- Shopping apps print messages like \`"Your order of 3 items totals $24.99"\` — a sentence built entirely from variables.
- Fitness apps say things like \`"You walked 8,342 steps today, Jamie!"\` — mixing a name and a number into one sentence.
- Games constantly format score messages like \`"Level 4 complete! You earned 250 points."\`

## Key Terminology
| Term | Definition |
|---|---|
| **F-string** | A string prefixed with \`f\`, where \`{curly braces}\` get replaced by variable values. |
| **int()** | A function that converts text into a whole number, so it can be used in math. |
| **Type Conversion** | Changing a value from one data type to another, like text to a number. |
| **Concatenation** | Joining strings together, either with \`+\` or by using an f-string. |

## Concept Explanation
An f-string is like a fill-in-the-blank sentence. The letter \`f\` right before the opening quote tells Python "get ready — some blanks need to be filled in with variable values!" Anything inside \`{curly braces}\` gets replaced with that variable's actual value:

\`\`\`python
name = "Nova"
age = 11
print(f"Hello, {name}! You are {age} years old.")
\`\`\`

This prints \`Hello, Nova! You are 11 years old.\` — much smoother than printing each piece on its own line. Forget the \`f\` before the quotes, and Python prints the curly braces literally, like \`Hello, {name}!\` — not what we want.

There's a second problem lurking from last lesson: \`input()\` **always** returns text, even if the player types \`11\`. That's fine for printing, but Python can't do math with text — \`"11" + 1\` causes an error. To fix it, we wrap the input in \`int()\`, which converts the text into a real whole number:

\`\`\`python
age_text = input("How old are you? ")
age_number = int(age_text)
print(f"Next year you will be {age_number + 1}!")
\`\`\`

## Step-by-Step Instruction
1. Rewrite your Lesson 2 greeting using an f-string instead of separate \`print()\` lines.
2. Ask for the player's age with \`input()\`, and immediately wrap it in \`int()\`.
3. Print a sentence that does math with the age, like \`f"Next year you will be {age + 1}!"\`.
4. Combine the player's name, age, and topic into one final welcome sentence.
5. Run the program a few times with different answers to make sure it reads naturally.

## Code Example
\`\`\`python
# Personal Quiz App - Part 2: Smooth formatting with f-strings

name = input("What is your name, quiz champion? ")
age = input("How old are you? ")
age = int(age)
topic = input("What's your favorite quiz topic? ")

print(f"Welcome, {name}! Get ready for a quiz about {topic}.")
print(f"You are {age} years old, which means next year you'll be {age + 1}!")
\`\`\`

## Code Explanation
- \`age = int(age)\` overwrites \`age\` with its numeric version — now math like \`age + 1\` works correctly.
- \`f"Welcome, {name}! Get ready for a quiz about {topic}."\` mixes two variables into one natural sentence.
- You can even do math directly inside the curly braces, like \`{age + 1}\` — Python calculates it before printing.
- Reusing the same variable name (\`age = int(age)\`) is a common, safe pattern — it replaces the old text value with the new number value.

## Expected Output
\`\`\`
What is your name, quiz champion? Maya
How old are you? 11
What's your favorite quiz topic? Space
Welcome, Maya! Get ready for a quiz about Space.
You are 11 years old, which means next year you'll be 12!
\`\`\`

## Guided Practice
1. Add a line showing how old the player will be in 10 years, using math inside an f-string.
2. Ask for the player's favorite hobby and mix it into a sentence: \`f"You love {hobby}! That's awesome."\`
3. On purpose, remove \`int()\` around \`age\` and try \`age + 1\` — read the error message Python gives you, then put \`int()\` back.

## Hands-On Activity
Finish "The Welcome Message Machine": collect the player's name, age (converted with \`int()\`), and favorite topic, then print a single, natural-sounding paragraph using f-strings that combines all three — no separate single-variable \`print()\` lines allowed.

## Student Challenge
Write a short f-string "fun fact" generator: ask for a person's name and favorite number, then print \`f"{name}'s lucky number squared is {favorite_number * favorite_number}!"\` — remember to convert the favorite number with \`int()\` first.

## Common Mistakes
- **Forgetting the \`f\`**: without it, \`{name}\` prints literally instead of the variable's value.
- **Forgetting \`int()\` before math**: \`age + 1\` crashes with a \`TypeError\` if \`age\` is still text from \`input()\`.
- **Mismatched braces**: every \`{\` inside an f-string needs a matching \`}\`.
- **Converting non-numbers**: \`int("eleven")\` crashes — \`int()\` only works on text that looks like a real number.

## Debugging Guidance
- A \`TypeError: can only concatenate str...\` usually means you tried to mix text and a number without converting first.
- A \`ValueError: invalid literal for int()\` means the text you tried to convert wasn't actually a number — check what the player typed.
- Print a variable right after creating it to confirm its value AND its type look correct before using it further.

## Mini Quiz
1. What letter goes right before the opening quote of an f-string?
2. What do curly braces \`{ }\` do inside an f-string?
3. Why do we need \`int()\` after using \`input()\` for a number?
4. What error appears if you try to add a string and an integer directly?
5. Can you do math directly inside an f-string's curly braces?

### Answer Key
1. \`f\`.
2. They get replaced by the value of whatever variable or expression is inside them.
3. Because \`input()\` always returns text, even for numbers, and Python can't do math on text without converting it first.
4. A \`TypeError\`.
5. Yes — Python calculates it before inserting the result into the string.

## Lesson Recap
You learned to build f-strings that weave variables smoothly into sentences, and you fixed the hidden "text, not a number" problem with \`int()\`. Your Personal Quiz App now greets the player with a natural, well-formatted welcome message.

## Homework / Extension
Pick a family member and write an f-string birthday message about them:
\`\`\`python
name = "Grandma Rosa"
fun_fact = "makes the best pancakes"
print(f"Happy Birthday, {name}! Everyone knows you {fun_fact}.")
\`\`\`
If you have a computer at home, try running it in Thonny or Replit. Bring your message to share next class!

## Portfolio Project Connection
This completes **Part 2 — Finish of your Personal Quiz App's welcome section**. With smooth f-string formatting in place, you're ready for lesson 4's conditionals, which you'll use two lessons from now to check quiz answers and calculate a score.`,
    codeSnippets: [
      {
        label: 'Code Example 1',
        language: 'python',
        part: 'reference',
        code: `# Personal Quiz App - Part 2: Smooth formatting with f-strings

name = input("What is your name, quiz champion? ")
age = input("How old are you? ")
age = int(age)
topic = input("What's your favorite quiz topic? ")

print(f"Welcome, {name}! Get ready for a quiz about {topic}.")
print(f"You are {age} years old, which means next year you'll be {age + 1}!")`,
      },
    ],
    projectLinks: [PERSONAL_QUIZ_APP],
  },

  // ─────────────────────────────────────────────────────────────────────
  // Lesson 4 — If/Else Decisions (Simple Calculator, Part 1)
  // ─────────────────────────────────────────────────────────────────────
  {
    order: 4,
    matchTitle: 'If/Else Decisions',
    objectives: [
      'Use `if`/`else` to make a program choose between two responses.',
      'Add `elif` to check for additional possible cases.',
      'Combine two conditions using `and`/`or`.',
      'Compare values correctly using `==`, `>`, and `>=`.',
      'Begin building the Simple Calculator by choosing an operation based on player input.',
    ],
    homework:
      'Design a riddle gate: ask a riddle question, and if the player’s answer matches, let them "pass"; otherwise, they must "try again."\n```python\nanswer = input("Riddle: I have keys but no locks. I have space but no room. What am I? ")\nif answer == "keyboard":\n    print("Correct! You may pass!")\nelse:\n    print("Not quite — try again!")\n```\nIf you have a computer at home, try running it and see if a family member can solve your riddle!',
    contentMarkdown: `# Advanced Data Science — Lesson 4: If/Else Decisions

**Course/Path:** Python Foundations
**Lesson:** 04 of 08
**Title:** If/Else Decisions
**Duration:** 45–60 minutes
**Difficulty:** Beginner
**Technology:** Python 3.11+ (Thonny or Replit)

---

## Mission Brief
Today you start your second portfolio project: the **Simple Calculator**. A calculator has to make a choice — is the player adding, subtracting, multiplying, or dividing? Programs make choices using \`if\`, \`elif\`, and \`else\` — exactly the tool your calculator needs to pick the right operation.

## Learning Objectives
1. Use \`if\`/\`else\` to make a program choose between two responses.
2. Add \`elif\` to check for additional possible cases.
3. Combine two conditions using \`and\`/\`or\`.
4. Compare values correctly using \`==\`, \`>\`, and \`>=\`.
5. Begin building the Simple Calculator by choosing an operation based on player input.

## What You'll Learn
You'll learn how to make your program choose between different paths depending on what's true, using \`if\`, \`elif\`, and \`else\` — and how to compare values with \`==\`, \`>\`, and \`>=\`. This is exactly the logic your Simple Calculator needs to decide which math operation to run.

## Why It Matters
Every interesting program makes decisions: a game checks if you've run out of lives, a login screen checks if your password is correct, and your calculator needs to check which button you pressed. Without decision-making, a program can only ever do the exact same thing every single time — which isn't very useful.

## Real-World Connection
- A calculator app decides which math operation to perform based on which button you tapped.
- A game checks \`if health <= 0:\` to decide when to show "Game Over."
- Streaming apps check your age before deciding whether to show certain content.

## Key Terminology
| Term | Definition |
|---|---|
| **Conditional** | Code that runs different blocks depending on whether a condition is true (\`if\`/\`elif\`/\`else\`). |
| **Comparison Operator** | A symbol like \`==\`, \`>\`, \`>=\` that compares two values and gives \`True\` or \`False\`. |
| **Logical Operator** | \`and\`/\`or\` — combine two conditions into one bigger check. |
| **Boolean** | A value that is either \`True\` or \`False\`. |
| **Indentation** | Consistent spacing that defines which lines belong inside an \`if\`/\`elif\`/\`else\` block. |

## Concept Explanation
\`if\` is like a fork in the road. If something is \`True\`, Python runs the code underneath \`if\`. If it's \`False\`, Python skips down to \`else\` instead:

\`\`\`python
age = int(input("How old are you? "))
if age >= 10:
    print("You are old enough for the advanced quiz!")
else:
    print("You'll be ready soon!")
\`\`\`

Notice two important rules: every \`if\` and \`else\` line ends with a **colon** \`:\`, and the lines underneath are **indented** (pushed in). Python uses indentation — not curly braces like some other languages — to know which lines belong inside the \`if\` block.

\`elif\` means "else, if this other thing is true" — it lets you check more than two possibilities, which is exactly what a calculator needs (add, subtract, multiply, divide — four possibilities, not two):

\`\`\`python
operation = input("Choose + - * or /: ")
if operation == "+":
    print("You chose addition.")
elif operation == "-":
    print("You chose subtraction.")
elif operation == "*":
    print("You chose multiplication.")
else:
    print("You chose division.")
\`\`\`

Remember: \`==\` (two equal signs) **compares** two things; \`=\` (one equal sign) **stores** a value. Mixing them up is one of the most common beginner mistakes.

## Step-by-Step Instruction
1. Ask the player for two numbers using \`input()\`, converting each with \`int()\`.
2. Ask the player which operation they want: \`+\`, \`-\`, \`*\`, or \`/\`.
3. Write an \`if\`/\`elif\`/\`else\` chain that checks the operation and prints the matching result.
4. Test your calculator with every operation to make sure each branch works.
5. Try an operation symbol that isn't \`+\`, \`-\`, \`*\`, or \`/\` and see which branch catches it.

## Code Example
\`\`\`python
# Simple Calculator - Part 1: Choosing an operation

first_number = int(input("Enter the first number: "))
second_number = int(input("Enter the second number: "))
operation = input("Choose an operation (+, -, *, /): ")

if operation == "+":
    result = first_number + second_number
    print(f"{first_number} + {second_number} = {result}")
elif operation == "-":
    result = first_number - second_number
    print(f"{first_number} - {second_number} = {result}")
elif operation == "*":
    result = first_number * second_number
    print(f"{first_number} * {second_number} = {result}")
elif operation == "/":
    result = first_number / second_number
    print(f"{first_number} / {second_number} = {result}")
else:
    print("That's not an operation I recognize!")
\`\`\`

## Code Explanation
- Converting both numbers with \`int()\` right away means every branch below can safely do real math.
- Each \`elif\` checks one operation symbol — Python stops at the first match and skips the rest.
- The final \`else\` catches anything that didn't match any operation — a safety net so the program never silently does nothing.
- Each branch builds its own f-string showing the full equation and result.

## Expected Output
\`\`\`
Enter the first number: 8
Enter the second number: 3
Choose an operation (+, -, *, /): *
8 * 3 = 24
\`\`\`

## Guided Practice
1. Run the calculator with each of the four operations and confirm every result is correct.
2. Add an \`elif\` that handles exactly when the two numbers are equal, before checking the operation.
3. Combine two conditions with \`and\`: only allow division if \`second_number\` is not \`0\`.

## Hands-On Activity
Extend the calculator so it also checks for a **remainder** operation using \`%\` when the player types \`"mod"\`, printing a sentence like \`f"{first_number} mod {second_number} = {result}"\`.

## Student Challenge
Use \`and\` to add a safety check before dividing: if the operation is \`/\` **and** \`second_number == 0\`, print \`"Can't divide by zero!"\` instead of attempting the division.

## Common Mistakes
- **Using \`=\` instead of \`==\`** inside an \`if\` — this is a syntax error, since \`=\` stores a value, not compares one.
- **Missing the colon \`:\`** at the end of an \`if\`/\`elif\`/\`else\` line.
- **Inconsistent indentation** — every line inside the same block must line up exactly.
- **Forgetting the final \`else\`** — without it, an unrecognized operation silently does nothing instead of giving useful feedback.

## Debugging Guidance
- A missing colon or bad indentation causes a \`SyntaxError\` or \`IndentationError\` pointing at the exact line — read it carefully.
- If the wrong branch runs, print the variable being compared right before the \`if\` to confirm its actual value.
- Test every single branch on purpose, not just the one you expect a player to pick.

## Mini Quiz
1. What symbol compares two values for equality?
2. What keyword lets you check a third (or fourth) possibility?
3. What two things must every \`if\`/\`elif\`/\`else\` line have?
4. What does \`and\` require for a combined condition to be \`True\`?
5. Why is a final \`else\` useful even when you think you've covered every case?

### Answer Key
1. \`==\`.
2. \`elif\`.
3. A condition, and a colon \`:\` at the end of the line.
4. Both conditions must be \`True\`.
5. It safely catches any unexpected input instead of the program silently doing nothing.

## Lesson Recap
You learned how \`if\`/\`elif\`/\`else\` lets a program choose between several possible paths, practiced comparing values correctly, and used this logic to build the operation-choosing core of your Simple Calculator.

## Homework / Extension
Design a riddle gate: ask a riddle question, and if the player's answer matches, let them "pass"; otherwise, they must "try again."
\`\`\`python
answer = input("Riddle: I have keys but no locks. I have space but no room. What am I? ")
if answer == "keyboard":
    print("Correct! You may pass!")
else:
    print("Not quite — try again!")
\`\`\`
If you have a computer at home, try running it and see if a family member can solve your riddle!

## Portfolio Project Connection
This is **Part 1 of your Simple Calculator**. You've built the decision-making core that picks the right math operation — next lesson, you'll add a loop so the player can calculate again and again without restarting the program.`,
    codeSnippets: [
      {
        label: 'Code Example 1',
        language: 'python',
        part: 'reference',
        code: `# Simple Calculator - Part 1: Choosing an operation

first_number = int(input("Enter the first number: "))
second_number = int(input("Enter the second number: "))
operation = input("Choose an operation (+, -, *, /): ")

if operation == "+":
    result = first_number + second_number
    print(f"{first_number} + {second_number} = {result}")
elif operation == "-":
    result = first_number - second_number
    print(f"{first_number} - {second_number} = {result}")
elif operation == "*":
    result = first_number * second_number
    print(f"{first_number} * {second_number} = {result}")
elif operation == "/":
    result = first_number / second_number
    print(f"{first_number} / {second_number} = {result}")
else:
    print("That's not an operation I recognize!")`,
      },
    ],
    projectLinks: [SIMPLE_CALCULATOR],
  },

  // ─────────────────────────────────────────────────────────────────────
  // Lesson 5 — While Loops and For Loops (Simple Calculator, Part 2)
  // ─────────────────────────────────────────────────────────────────────
  {
    order: 5,
    matchTitle: 'While Loops and For Loops',
    objectives: [
      'Use a `for` loop with `range()` to repeat an action a set number of times.',
      'Use a `while` loop to repeat an action until a condition changes.',
      'Explain the difference between a `for` loop and a `while` loop.',
      'Avoid writing an infinite loop by including a way to stop it.',
      'Finish the Simple Calculator by letting the player calculate again and again.',
    ],
    homework:
      'Write a `for` loop that prints "I love coding!" five times:\n```python\nfor i in range(5):\n    print("I love coding!")\n```\nIf you have a computer at home, run it and count the lines of output to make sure there are exactly 5. Try changing the number to print it 10 times instead!',
    contentMarkdown: `# Advanced Data Science — Lesson 5: While Loops and For Loops

**Course/Path:** Python Foundations
**Lesson:** 05 of 08
**Title:** While Loops and For Loops
**Duration:** 45–60 minutes
**Difficulty:** Beginner
**Technology:** Python 3.11+ (Thonny or Replit)

---

## Mission Brief
Right now your Simple Calculator can only do one calculation before the program ends — annoying for a real user! Today you'll learn **loops**, Python's tool for repeating actions, and use a \`while\` loop to let the player calculate as many times as they like.

## Learning Objectives
1. Use a \`for\` loop with \`range()\` to repeat an action a set number of times.
2. Use a \`while\` loop to repeat an action until a condition changes.
3. Explain the difference between a \`for\` loop and a \`while\` loop.
4. Avoid writing an infinite loop by including a way to stop it.
5. Finish the Simple Calculator by letting the player calculate again and again.

## What You'll Learn
You'll learn two kinds of loops: \`for\` loops, which repeat a set number of times, and \`while\` loops, which repeat until a condition becomes false. You'll use a \`while\` loop to wrap your calculator so the player can keep calculating until they choose to stop.

## Why It Matters
Without loops, repeating an action means retyping the same code over and over — annoying, error-prone, and impossible for anything that needs to repeat hundreds or thousands of times, like checking every row in a spreadsheet or running every frame of a game. Loops are one of the most powerful tools in any programming language.

## Real-World Connection
- A calculator app keeps running, calculation after calculation, until you close it — a \`while\` loop.
- A game's main loop runs 60 times every second, checking input and updating the screen — also a \`while\` loop.
- A school attendance program might loop through exactly 30 students' names, one per \`for\` loop pass.

## Key Terminology
| Term | Definition |
|---|---|
| **Loop** | Code that repeats an action multiple times without retyping it. |
| **for loop** | Repeats a fixed number of times, often using \`range()\`. |
| **while loop** | Repeats as long as a condition stays \`True\`. |
| **range()** | A function that generates a sequence of numbers for a \`for\` loop to count through. |
| **Infinite Loop** | A loop whose condition never becomes \`False\`, so it never stops. |

## Concept Explanation
A \`for\` loop repeats a set number of times:

\`\`\`python
for i in range(5):
    print("Blast off in", i)
\`\`\`

\`range(5)\` means "5 numbers, starting at 0" — so this counts 0, 1, 2, 3, 4 (still exactly 5 numbers total). If you want to count 1 through 5 instead, use \`range(1, 6)\`.

A \`while\` loop repeats as long as its condition stays \`True\` — perfect for "keep going until the player says stop":

\`\`\`python
calculate_again = "yes"
while calculate_again == "yes":
    print("Calculating...")
    calculate_again = input("Calculate again? (yes/no) ")
\`\`\`

Every \`while\` loop needs something that can eventually make its condition \`False\` — here, that's the player typing something other than \`"yes"\`. Forget to update the condition, and you get an **infinite loop** that never stops (if that happens by accident, use the Stop button in Thonny).

## Step-by-Step Instruction
1. Wrap your Lesson 4 calculator code inside a \`while\` loop that keeps going while a variable like \`calculate_again\` equals \`"yes"\`.
2. At the end of each loop pass, ask \`"Calculate again? (yes/no) "\` and store the answer back into \`calculate_again\`.
3. Run the program and test calculating three or four times in a row, then type \`"no"\` to stop.
4. Confirm the loop actually stops — if it doesn't, check that you're updating \`calculate_again\` inside the loop.

## Code Example
\`\`\`python
# Simple Calculator - Part 2: Calculate again and again

calculate_again = "yes"

while calculate_again == "yes":
    first_number = int(input("Enter the first number: "))
    second_number = int(input("Enter the second number: "))
    operation = input("Choose an operation (+, -, *, /): ")

    if operation == "+":
        result = first_number + second_number
    elif operation == "-":
        result = first_number - second_number
    elif operation == "*":
        result = first_number * second_number
    elif operation == "/":
        result = first_number / second_number
    else:
        result = "unknown"

    print(f"Result: {result}")
    calculate_again = input("Calculate again? (yes/no) ")

print("Thanks for using the Simple Calculator!")
\`\`\`

## Code Explanation
- \`calculate_again = "yes"\` starts true so the loop runs at least once.
- Everything the calculator does lives inside the \`while\` block, indented one level in.
- The very last line inside the loop re-asks the player and updates \`calculate_again\` — this is what lets the loop eventually stop.
- The final \`print()\` is outside the loop (not indented), so it only runs once, after the player is done.

## Expected Output
\`\`\`
Enter the first number: 4
Enter the second number: 2
Choose an operation (+, -, *, /): +
Result: 6
Calculate again? (yes/no) yes
Enter the first number: 9
Enter the second number: 3
Choose an operation (+, -, *, /): /
Result: 3.0
Calculate again? (yes/no) no
Thanks for using the Simple Calculator!
\`\`\`

## Guided Practice
1. Change a \`for i in range(5):\` countdown loop to count from 1 to 5 instead of 0 to 4.
2. Add a counter variable that tracks how many calculations the player performed, and print it at the end.
3. On purpose, remove the line that updates \`calculate_again\` and observe the infinite loop — then use the Stop button and fix it.

## Hands-On Activity
Add a running total to the calculator: a variable that adds up every \`result\` across all calculations in the session, printed in the final "Thanks for using the Simple Calculator!" message.

## Student Challenge
Use a \`for\` loop to let the calculator ask for exactly 3 calculations and then stop automatically, no \`"yes"/"no"\` question needed — printing \`"Calculation N of 3"\` before each one.

## Common Mistakes
- **Forgetting to update the loop's condition** — causes an infinite loop.
- **Off-by-one errors with \`range()\`** — \`range(5)\` is 0 through 4, not 1 through 5.
- **Indenting code outside the loop** — code meant to run once after the loop must NOT be indented inside it.
- **Checking the wrong variable** — \`while answer == "yes":\` only works if you actually reassign \`answer\` inside the loop.

## Debugging Guidance
- If your program seems "frozen," it's likely an infinite loop — use Thonny's Stop button, then check what's supposed to change the condition.
- Add a \`print()\` of the loop's condition variable each pass to watch exactly when (or if) it changes.
- Count carefully with \`range()\` — write out the numbers it actually produces on paper if you're unsure.

## Mini Quiz
1. What's the difference between a \`for\` loop and a \`while\` loop?
2. What does \`range(5)\` actually produce?
3. What causes an infinite loop?
4. What must happen inside a \`while\` loop for it to eventually stop?
5. True or False: code indented inside a loop runs once per pass through the loop.

### Answer Key
1. A \`for\` loop repeats a set number of times; a \`while\` loop repeats until a condition becomes false.
2. The numbers 0, 1, 2, 3, 4 (five numbers total).
3. A condition that never becomes \`False\`, so the loop never stops.
4. Something inside the loop must change the condition being checked.
5. True.

## Lesson Recap
You learned the difference between \`for\` and \`while\` loops, practiced avoiding infinite loops, and used a \`while\` loop to finish your Simple Calculator so it can run as many calculations as the player wants.

## Homework / Extension
Write a \`for\` loop that prints "I love coding!" five times:
\`\`\`python
for i in range(5):
    print("I love coding!")
\`\`\`
If you have a computer at home, run it and count the lines of output to make sure there are exactly 5. Try changing the number to print it 10 times instead!

## Portfolio Project Connection
This completes **Part 2 — Finish of your Simple Calculator**. With a working loop, your calculator can now run as many times as the player wants in one session — next lesson introduces lists, which you'll use to start your third project, the Word Guessing Game.`,
    codeSnippets: [
      {
        label: 'Code Example 1',
        language: 'python',
        part: 'reference',
        code: `# Simple Calculator - Part 2: Calculate again and again

calculate_again = "yes"

while calculate_again == "yes":
    first_number = int(input("Enter the first number: "))
    second_number = int(input("Enter the second number: "))
    operation = input("Choose an operation (+, -, *, /): ")

    if operation == "+":
        result = first_number + second_number
    elif operation == "-":
        result = first_number - second_number
    elif operation == "*":
        result = first_number * second_number
    elif operation == "/":
        result = first_number / second_number
    else:
        result = "unknown"

    print(f"Result: {result}")
    calculate_again = input("Calculate again? (yes/no) ")

print("Thanks for using the Simple Calculator!")`,
      },
    ],
    projectLinks: [SIMPLE_CALCULATOR],
  },

  // ─────────────────────────────────────────────────────────────────────
  // Lesson 6 — Lists and Simple Data (Word Guessing Game, Part 1)
  // ─────────────────────────────────────────────────────────────────────
  {
    order: 6,
    matchTitle: 'Lists and Simple Data',
    objectives: [
      'Create a list to store multiple related pieces of data.',
      'Use a `for` loop to print every item in a list.',
      'Use `random.choice()` to pick a random item from a list.',
      'Find an item’s position (index) in a list.',
      'Begin building the Word Guessing Game by picking a secret word from a list.',
    ],
    homework:
      'Write a list of your 5 favorite foods, then let Python pick one randomly:\n```python\nimport random\n\nfoods = ["pizza", "tacos", "sushi", "pasta", "burgers"]\nchoice = random.choice(foods)\nprint(f"Tonight\'s dinner is... {choice}!")\n```\nIf you have a computer at home, run it a few times and see what Python picks! Bring your favorite foods list to share next class.',
    contentMarkdown: `# Advanced Data Science — Lesson 6: Lists and Simple Data

**Course/Path:** Python Foundations
**Lesson:** 06 of 08
**Title:** Lists and Simple Data
**Duration:** 45–60 minutes
**Difficulty:** Beginner
**Technology:** Python 3.11+ (Thonny or Replit)

---

## Mission Brief
Time to start your third and final portfolio project: the **Word Guessing Game**. Every guessing game needs a pool of possible secret words to choose from — and that's exactly what a **list** is for. Today you'll learn how to store many related pieces of data in one variable, and use Python's \`random\` module to pick a secret word automatically.

## Learning Objectives
1. Create a list to store multiple related pieces of data.
2. Use a \`for\` loop to print every item in a list.
3. Use \`random.choice()\` to pick a random item from a list.
4. Find an item's position (index) in a list.
5. Begin building the Word Guessing Game by picking a secret word from a list.

## What You'll Learn
You'll learn how to create a **list** — a single variable that holds many related values in order — how to loop through every item in it, and how to use \`random.choice()\` to pick one item unpredictably. These three skills are exactly what your Word Guessing Game needs to choose a secret word.

## Why It Matters
Real data almost never comes as a single value — it comes as a group: a class full of students, a game full of enemies, a quiz full of questions, a dictionary full of possible secret words. Lists are how Python stores and works with groups of related information, and they're one of the most-used tools in this entire course.

## Real-World Connection
- A playlist app stores every song as an item in a list, and a "shuffle" button is really just \`random.choice()\`.
- A game's enemy spawner might pick a random enemy type from a list of possibilities.
- A quiz app stores all its questions in a list and works through them one at a time with a loop.

## Key Terminology
| Term | Definition |
|---|---|
| **List** | An ordered collection of values, written with square brackets, like \`["Nova", "Max", "Zara"]\`. |
| **Index** | A number showing an item's position in a list, starting at \`0\`. |
| **random.choice()** | A function from the \`random\` module that picks one random item from a list. |
| **len()** | A function that returns how many items are in a list. |
| **IndexError** | An error that happens when you try to access a list position that doesn't exist. |

## Concept Explanation
A list is like a row of connected, numbered boxes, all sharing one label, holding many pieces of information in order:

\`\`\`python
words = ["python", "variable", "function", "loop"]
print(words[0])
print(words[1])
\`\`\`

Lists start counting at **index 0**, not 1 — so \`words[0]\` is the FIRST item ("python"), not the second. Trying to access an index that doesn't exist, like \`words[10]\` on a 4-item list, causes an \`IndexError\`.

A \`for\` loop can walk through every item in a list automatically, without you needing to know how many there are:

\`\`\`python
for word in words:
    print(f"Possible word: {word}")
\`\`\`

To pick one item **randomly**, Python's built-in \`random\` module has exactly the tool you need — \`random.choice()\`:

\`\`\`python
import random

words = ["python", "variable", "function", "loop"]
secret_word = random.choice(words)
print(secret_word)
\`\`\`

Run this program several times — a different word gets picked (almost) every time, because \`random.choice()\` picks unpredictably.

## Step-by-Step Instruction
1. Create a list called \`words\` containing at least 5 words related to a topic you enjoy.
2. Use a \`for\` loop to print every word in the list, confirming it's correct.
3. Add \`import random\` at the very top of your program.
4. Use \`random.choice(words)\` to pick a \`secret_word\`, and print it (just for testing — you'll hide it from the player in the next lesson).
5. Run the program several times and confirm the chosen word changes.

## Code Example
\`\`\`python
# Word Guessing Game - Part 1: Picking a secret word

import random

words = ["python", "variable", "function", "loop", "list"]

print("Here are all the possible words:")
for word in words:
    print(f"- {word}")

print(f"\\nThere are {len(words)} possible words.")

secret_word = random.choice(words)
print(f"\\n(For testing only) The secret word is: {secret_word}")
\`\`\`

## Code Explanation
- \`import random\` must come before you use anything from the \`random\` module — usually placed at the very top of the file.
- The \`for word in words:\` loop prints every item without needing to know the list's length in advance.
- \`len(words)\` counts how many items are in the list — handy for showing the player how many possibilities there are.
- \`random.choice(words)\` returns one single item from the list, chosen unpredictably each time the program runs.

## Expected Output
\`\`\`
Here are all the possible words:
- python
- variable
- function
- loop
- list

There are 5 possible words.

(For testing only) The secret word is: function
\`\`\`
(Your own "secret word" line will likely show a different word each run — that's expected, since it's chosen randomly.)

## Guided Practice
1. Add a 6th word to your list and confirm the \`for\` loop and \`len()\` count both update automatically.
2. Print the word at a specific index, like \`words[2]\`, and confirm it matches the correct item in your list.
3. Use \`len()\` together with \`range()\` to print every word's index number next to it: \`f"Position {i}: {words[i]}"\`.

## Hands-On Activity
Build "The Random Mission Picker": create a list of at least 5 mission names (anything you like — space missions, game levels, chores), use a \`for\` loop to display them all, then use \`random.choice()\` to announce which mission was randomly selected.

## Student Challenge
Write a program that picks a random word from your list, then checks whether that word's length is longer than 5 letters using \`len(secret_word)\`, printing a different message depending on the result.

## Common Mistakes
- **Forgetting \`import random\`** — causes a \`NameError: name 'random' is not defined\`.
- **Off-by-one index mistakes** — the first item is at index \`0\`, not \`1\`.
- **Accessing an index that doesn't exist** — causes an \`IndexError\`; always check against \`len()\` first if unsure.
- **Confusing \`random.choice(words)\` with \`random.choice(word)\`** — it must be called on the whole list, not one word.

## Debugging Guidance
- An \`IndexError\` means you asked for a position that's out of range — print \`len(your_list)\` to see how many valid positions actually exist.
- A \`NameError\` mentioning \`random\` means you forgot (or misplaced) \`import random\`.
- Print the whole list with \`print(words)\` any time you're unsure exactly what's stored in it.

## Mini Quiz
1. What index number does the first item in a list have?
2. What module do you need to import to use \`random.choice()\`?
3. What does \`len(words)\` return?
4. What error happens if you access an index that doesn't exist?
5. True or False: \`random.choice()\` always picks the same item every time you run the program.

### Answer Key
1. \`0\`.
2. The \`random\` module.
3. The number of items in the list.
4. An \`IndexError\`.
5. False — it picks unpredictably, so the result normally changes between runs.

## Lesson Recap
You learned how to create a list, loop through every item in it, and use \`random.choice()\` to pick one item unpredictably — the exact foundation your Word Guessing Game needs to select a secret word.

## Homework / Extension
Write a list of your 5 favorite foods, then let Python pick one randomly:
\`\`\`python
import random

foods = ["pizza", "tacos", "sushi", "pasta", "burgers"]
choice = random.choice(foods)
print(f"Tonight's dinner is... {choice}!")
\`\`\`
If you have a computer at home, run it a few times and see what Python picks! Bring your favorite foods list to share next class.

## Portfolio Project Connection
This is **Part 1 of your Word Guessing Game**. You've built the list of possible words and the random selection logic — next lesson, you'll make it an actual playable game, where the player gets a limited number of guesses to find the secret word.`,
    codeSnippets: [
      {
        label: 'Code Example 1',
        language: 'python',
        part: 'reference',
        code: `# Word Guessing Game - Part 1: Picking a secret word

import random

words = ["python", "variable", "function", "loop", "list"]

print("Here are all the possible words:")
for word in words:
    print(f"- {word}")

print(f"\\nThere are {len(words)} possible words.")

secret_word = random.choice(words)
print(f"\\n(For testing only) The secret word is: {secret_word}")`,
      },
    ],
    projectLinks: [WORD_GUESSING_GAME],
  },

  // ─────────────────────────────────────────────────────────────────────
  // Lesson 7 — Randomness and Finishing Your Game
  // (REWRITTEN from "Building a Mini Quiz App" — that title/content
  // duplicated the Personal Quiz App project from lessons 2-3. This lesson
  // now correctly continues Word Guessing Game, Part 2 — Finish, matching
  // what this module's own checkpoint text already said.)
  // ─────────────────────────────────────────────────────────────────────
  {
    order: 7,
    matchTitle: 'Building a Mini Quiz App',
    title: 'Randomness and Finishing Your Game',
    objectives: [
      'Give the player a limited number of attempts using a counter.',
      'Compare the player’s guess to the secret word, ignoring upper/lowercase differences.',
      'Use a `while` loop combined with a condition to control a multi-guess game.',
      'Track whether the player has won using a Boolean flag.',
      'Finish the Word Guessing Game with clear win and lose messages.',
    ],
    homework:
      'Add a hint system to your Word Guessing Game: after the player’s first wrong guess, print the secret word’s length as a hint.\n```python\nif guess_count == 1 and not won:\n    print(f"Hint: the word has {len(secret_word)} letters.")\n```\nIf you have a computer at home, try it out and see if the hint makes the game easier. Bring your finished game to share next class!',
    contentMarkdown: `# Advanced Data Science — Lesson 7: Randomness and Finishing Your Game

**Course/Path:** Python Foundations
**Lesson:** 07 of 08
**Title:** Randomness and Finishing Your Game
**Duration:** 45–60 minutes
**Difficulty:** Beginner
**Technology:** Python 3.11+ (Thonny or Replit)

---

## Mission Brief
Last lesson your Word Guessing Game learned to pick a random secret word — but right now, nobody can actually *play* it yet! Today you'll finish the game: giving the player a limited number of guesses, checking each guess fairly (even if they type in different capitalization), and showing a clear win or lose message at the end.

## Learning Objectives
1. Give the player a limited number of attempts using a counter.
2. Compare the player's guess to the secret word, ignoring upper/lowercase differences.
3. Use a \`while\` loop combined with a condition to control a multi-guess game.
4. Track whether the player has won using a Boolean flag.
5. Finish the Word Guessing Game with clear win and lose messages.

## What You'll Learn
You'll combine everything from the last five lessons — variables, f-strings, conditionals, and loops — with one new trick: a **Boolean flag** that tracks whether the player has won, so your \`while\` loop knows exactly when to stop. You'll also learn \`.lower()\`, so "PYTHON" and "python" count as the same correct guess.

## Why It Matters
A real game needs rules: a limited number of tries, a way to know when it's over, and a fair way to check the player's answer. This lesson is where your Word Guessing Game stops being "just a random word picker" and becomes an actual game someone could enjoy playing.

## Real-World Connection
- Word games like Wordle give you a limited number of guesses and track whether you've won — the exact pattern you're building today.
- Login forms often ignore capitalization in a username, using the same \`.lower()\` trick to compare fairly.
- Any game with "lives" or "attempts left" uses a counter that goes down each try, exactly like the one you'll build here.

## Key Terminology
| Term | Definition |
|---|---|
| **Counter** | A variable that increases (or decreases) each time through a loop, used to track attempts. |
| **Boolean Flag** | A \`True\`/\`False\` variable used to track whether something has happened, like winning. |
| **.lower()** | A string method that converts text to all-lowercase, useful for fair comparisons. |
| **String Method** | A built-in action you can call on a string, written as \`text.method()\`. |

## Concept Explanation
To limit the player's attempts, you need a **counter** — a variable that goes up by 1 each time through the loop — and a \`while\` loop that stops once the counter reaches the limit:

\`\`\`python
attempts = 3
guess_count = 0

while guess_count < attempts:
    guess_count = guess_count + 1
    print(f"Attempt {guess_count} of {attempts}")
\`\`\`

To track whether the player has already won, programmers use a **Boolean flag** — a variable that starts as \`False\` and switches to \`True\` the moment the win condition happens. Combining it with \`and\`/\`not\` in the loop's condition lets the loop stop EITHER when attempts run out OR when the player wins, whichever happens first:

\`\`\`python
won = False
while guess_count < attempts and not won:
    ...
    if guess == secret_word:
        won = True
\`\`\`

Finally, comparing text fairly matters: if the secret word is \`"python"\` but the player types \`"Python"\`, a plain \`==\` comparison would mark it wrong, even though it's clearly the right answer. The \`.lower()\` string method fixes this by converting both sides to lowercase before comparing:

\`\`\`python
if guess.lower() == secret_word.lower():
    print("Correct!")
\`\`\`

## Step-by-Step Instruction
1. Start from your Lesson 6 code that picks a \`secret_word\` using \`random.choice()\`.
2. Create \`attempts = 3\`, \`guess_count = 0\`, and \`won = False\`.
3. Build a \`while guess_count < attempts and not won:\` loop.
4. Inside the loop, ask for a guess, increase \`guess_count\`, and compare using \`.lower()\` on both sides.
5. If correct, print a win message and set \`won = True\`; otherwise, print how many attempts remain.
6. After the loop, print a lose message if \`won\` is still \`False\`, revealing the secret word.

## Code Example
\`\`\`python
# Word Guessing Game - Part 2: Finishing the game

import random

words = ["python", "variable", "function", "loop", "list"]
secret_word = random.choice(words)

attempts = 3
guess_count = 0
won = False

print("I'm thinking of a Python word. Can you guess it?")

while guess_count < attempts and not won:
    guess = input(f"Guess {guess_count + 1} of {attempts}: ")
    guess_count = guess_count + 1

    if guess.lower() == secret_word.lower():
        print("🎉 Correct! You guessed the word!")
        won = True
    else:
        remaining = attempts - guess_count
        if remaining > 0:
            print(f"Not quite! You have {remaining} guess(es) left.")

if not won:
    print(f"Out of guesses! The word was '{secret_word}'.")

print("Thanks for playing the Word Guessing Game!")
\`\`\`

## Code Explanation
- \`while guess_count < attempts and not won:\` combines two conditions — the loop stops the moment EITHER becomes false.
- \`guess.lower() == secret_word.lower()\` compares both sides fairly, regardless of capitalization.
- \`won = True\` is set only on a correct guess, which both ends the loop early and controls the final message.
- The final \`if not won:\` block only runs when the player never guessed correctly — revealing the answer.

## Expected Output
\`\`\`
I'm thinking of a Python word. Can you guess it?
Guess 1 of 3: loop
Not quite! You have 2 guess(es) left.
Guess 2 of 3: Python
🎉 Correct! You guessed the word!
Thanks for playing the Word Guessing Game!
\`\`\`

## Guided Practice
1. Change \`attempts\` to \`5\` and confirm the player now gets five tries instead of three.
2. Remove \`.lower()\` from the comparison on purpose, then type the secret word with different capitalization — observe it being marked wrong.
3. Add a counter that tracks and prints the player's total number of wins across several rounds, using an outer \`while\` loop that asks "Play again?"

## Hands-On Activity
Add a hint after the first wrong guess: print the secret word's first letter using \`secret_word[0]\`, but only once, after \`guess_count == 1\` and the player hasn't won yet.

## Student Challenge
Rewrite the win-checking logic so the player also sees how many letters their guess shares in common with the secret word's length — e.g., \`"Your guess has {len(guess)} letters; the secret word has {len(secret_word)}."\` — printed after every incorrect guess.

## Common Mistakes
- **Forgetting \`.lower()\` on BOTH sides** — comparing only one side still fails for mismatched capitalization.
- **Never updating \`guess_count\`** — causes an infinite loop, since the condition never becomes false.
- **Setting \`won = True\` outside the \`if\`** — this would mark every guess as a win, even wrong ones.
- **Checking \`won\` before it's ever created** — always initialize \`won = False\` before the loop starts.

## Debugging Guidance
- If the game never recognizes a correct guess, print both \`guess.lower()\` and \`secret_word.lower()\` right before comparing them to spot a mismatch.
- If the loop never ends, check that \`guess_count\` is actually increasing every pass.
- If the "out of guesses" message appears even after a win, double check that \`won = True\` is set inside the correct \`if\` block.

## Mini Quiz
1. What does \`.lower()\` do to a string?
2. What is a Boolean flag used for?
3. Why does the \`while\` loop check both \`guess_count < attempts\` and \`not won\`?
4. What would happen if \`guess_count\` were never increased inside the loop?
5. Where should \`won = False\` be placed — before or inside the loop?

### Answer Key
1. It converts all the letters in the string to lowercase.
2. To track whether something (like winning) has happened, using \`True\`/\`False\`.
3. So the loop stops as soon as EITHER the player runs out of attempts OR wins — whichever comes first.
4. The loop would never end, since its condition would always stay true (an infinite loop).
5. Before the loop, so it starts as \`False\` every time the game begins.

## Lesson Recap
You finished the Word Guessing Game by adding a limited number of attempts, fair case-insensitive comparison with \`.lower()\`, and a Boolean flag to track winning — combining variables, conditionals, and loops into one complete, playable game.

## Homework / Extension
Add a hint system to your Word Guessing Game: after the player's first wrong guess, print the secret word's length as a hint.
\`\`\`python
if guess_count == 1 and not won:
    print(f"Hint: the word has {len(secret_word)} letters.")
\`\`\`
If you have a computer at home, try it out and see if the hint makes the game easier. Bring your finished game to share next class!

## Portfolio Project Connection
This completes **Part 2 — Finish of your Word Guessing Game**, the third and final project in your Python Foundations portfolio. Next lesson, you'll polish all three projects — Personal Quiz App, Simple Calculator, and Word Guessing Game — and get them ready to present.`,
    codeSnippets: [
      {
        label: 'Code Example 1',
        language: 'python',
        part: 'reference',
        code: `# Word Guessing Game - Part 2: Finishing the game

import random

words = ["python", "variable", "function", "loop", "list"]
secret_word = random.choice(words)

attempts = 3
guess_count = 0
won = False

print("I'm thinking of a Python word. Can you guess it?")

while guess_count < attempts and not won:
    guess = input(f"Guess {guess_count + 1} of {attempts}: ")
    guess_count = guess_count + 1

    if guess.lower() == secret_word.lower():
        print("🎉 Correct! You guessed the word!")
        won = True
    else:
        remaining = attempts - guess_count
        if remaining > 0:
            print(f"Not quite! You have {remaining} guess(es) left.")

if not won:
    print(f"Out of guesses! The word was '{secret_word}'.")

print("Thanks for playing the Word Guessing Game!")`,
      },
    ],
    projectLinks: [WORD_GUESSING_GAME],
  },

  // ─────────────────────────────────────────────────────────────────────
  // Lesson 8 — Your Python Portfolio — Polish and Present
  // (REWRITTEN from "Final Project — Our Own Mini Game!" — per the
  // redesign, this lesson introduces no new project; it polishes and
  // recaps the 3 real projects already built in lessons 2-7.)
  // ─────────────────────────────────────────────────────────────────────
  {
    order: 8,
    matchTitle: 'Final Project — Our Own Mini Game!',
    title: 'Your Python Portfolio — Polish and Present',
    objectives: [
      'Review the variables, conditionals, and loops used across all three portfolio projects.',
      'Add clear comments to existing code to explain what it does.',
      'Combine the three projects into a single menu program using `if`/`elif`.',
      'Practice presenting a finished program clearly to another person.',
      'Collect and note feedback on a finished project from a real player.',
    ],
    homework:
      'Finish and polish your menu program at home so it correctly launches all three projects. Show it to a family member, let them pick and play one project from the menu, and write down one thing they suggested you add or change. Bring your menu program AND their feedback to share next class!',
    contentMarkdown: `# Advanced Data Science — Lesson 8: Your Python Portfolio — Polish and Present

**Course/Path:** Python Foundations
**Lesson:** 08 of 08
**Title:** Your Python Portfolio — Polish and Present
**Duration:** 45–60 minutes
**Difficulty:** Beginner
**Technology:** Python 3.11+ (Thonny or Replit)

---

## Mission Brief
Over the last six lessons you built three real programs: the **Personal Quiz App**, the **Simple Calculator**, and the **Word Guessing Game**. Today is not about building something new — it's about polishing what you already have, understanding how all three share the same core building blocks, and combining them into one program a player can launch from a single menu.

## Learning Objectives
1. Review the variables, conditionals, and loops used across all three portfolio projects.
2. Add clear comments to existing code to explain what it does.
3. Combine the three projects into a single menu program using \`if\`/\`elif\`.
4. Practice presenting a finished program clearly to another person.
5. Collect and note feedback on a finished project from a real player.

## What You'll Learn
You'll revisit the Personal Quiz App, Simple Calculator, and Word Guessing Game, add comments explaining how each one works, and wrap all three together behind a single "launcher" menu using exactly the \`if\`/\`elif\` decision-making you learned in lesson 4. By the end, you'll have one polished program that shows off everything you've built.

## Why It Matters
Building something is only half the job — a real programmer also organizes, documents, and presents their work so other people can understand and use it. This is exactly what professional software teams do before sharing any project: polish it, explain it clearly, and make it easy for someone else to try.

## Real-World Connection
- App stores show one "home screen" that launches many different features — exactly like the menu you'll build today.
- Professional codebases are full of comments explaining *why* code works the way it does, not just *what* it does.
- Every coding portfolio — the kind real programmers show to schools, teams, or employers — is a collection of polished, explained projects, just like the one you're building today.

## Key Terminology
| Term | Definition |
|---|---|
| **Comment** | A note in code, starting with \`#\`, that Python ignores but humans read to understand the code. |
| **Portfolio** | A collection of finished projects that show off what someone can build. |
| **Menu** | A program structure that lets the user choose which feature or project to run. |
| **Code Readability** | How easy a program is for a human to read and understand, not just for Python to run. |
| **Feedback** | Specific, useful comments from someone who tried your program, used to improve it. |

## Concept Explanation
Every one of your three projects uses the exact same core ingredients: **variables** to store information, **f-strings** to format output, **conditionals** (\`if\`/\`elif\`/\`else\`) to make decisions, and **loops** (\`while\`/\`for\`) to repeat actions. The Personal Quiz App stores answers in variables and checks them with \`if\`. The Simple Calculator picks an operation with \`elif\` and loops with \`while\`. The Word Guessing Game combines a list, \`random.choice()\`, a loop, and a Boolean flag. Seeing how the SAME small set of tools builds three completely different programs is one of the most important lessons in learning to code.

A **menu** is just one more use of the \`if\`/\`elif\` pattern you already know — instead of choosing a math operation, the player chooses which whole project to run:

\`\`\`python
choice = input("Choose: 1) Quiz  2) Calculator  3) Word Game  ")
if choice == "1":
    print("Launching the Personal Quiz App...")
elif choice == "2":
    print("Launching the Simple Calculator...")
elif choice == "3":
    print("Launching the Word Guessing Game...")
else:
    print("That's not a valid choice.")
\`\`\`

Adding **comments** — short notes starting with \`#\` — above tricky or important lines makes your code easier for anyone (including future you) to understand at a glance.

## Step-by-Step Instruction
1. Open each of your three project files and add at least two comments to each, explaining what a tricky or important section does.
2. Create a new file for your menu program.
3. Print a short welcome message explaining the three options.
4. Use \`input()\` to ask the player which project they want, then \`if\`/\`elif\`/\`else\` to respond.
5. Inside each branch, either paste in that project's full code, or (simpler) just print a short description of what that project does, for today's demo.
6. Test the menu with all three choices, plus an invalid choice.

## Code Example
\`\`\`python
# Python Foundations Portfolio - Project Launcher Menu

print("=== Welcome to My Python Portfolio ===")
print("1) Personal Quiz App")
print("2) Simple Calculator")
print("3) Word Guessing Game")

choice = input("Which project would you like to try? (1/2/3): ")

if choice == "1":
    # The Personal Quiz App asks the player's name and a quiz topic,
    # then tracks their score as they answer questions.
    print("Starting the Personal Quiz App!")
elif choice == "2":
    # The Simple Calculator asks for two numbers and an operation,
    # then loops so the player can calculate again and again.
    print("Starting the Simple Calculator!")
elif choice == "3":
    # The Word Guessing Game picks a random word from a list and
    # gives the player a limited number of guesses to find it.
    print("Starting the Word Guessing Game!")
else:
    print("That's not a valid choice — please pick 1, 2, or 3.")

print("Thanks for exploring my Python portfolio!")
\`\`\`

## Code Explanation
- The menu reuses the exact \`if\`/\`elif\`/\`else\` pattern from lesson 4 — just checking a different kind of choice.
- Each branch has a comment explaining that project's purpose — useful both for you and for anyone trying your portfolio.
- In a full version, each branch would contain (or call) that project's actual code, so choosing \`"1"\` really launches the quiz, not just a message about it.
- The final \`print()\` runs no matter which choice was made, since it's outside every \`if\`/\`elif\`/\`else\` branch.

## Expected Output
\`\`\`
=== Welcome to My Python Portfolio ===
1) Personal Quiz App
2) Simple Calculator
3) Word Guessing Game
Which project would you like to try? (1/2/3): 3
Starting the Word Guessing Game!
Thanks for exploring my Python portfolio!
\`\`\`

## Guided Practice
1. Paste your actual Word Guessing Game code into the \`choice == "3"\` branch so it really runs the game, not just a message.
2. Do the same for the Quiz App and Calculator branches.
3. Test the full menu with every choice to confirm each project actually launches and works correctly.

## Hands-On Activity
Add one polish touch to each of your three projects: a clearer welcome message, an extra comment explaining the trickiest line, or a friendlier error message for invalid input. Small, thoughtful improvements count as real progress.

## Student Challenge
Add a \`while\` loop around your whole menu so that after finishing one project, the player returns to the menu and can choose another — continuing until they type \`"quit"\`.

## Common Mistakes
- **Pasting code into the wrong branch** — double check each \`elif\` matches the project you intend.
- **Forgetting a comment explains WHY, not just WHAT** — \`# ask for a number\` is less useful than \`# convert to int so math works correctly\`.
- **Skipping real testing** — always try every single menu option before considering it finished.
- **Vague feedback requests** — asking "is it good?" gets a less useful answer than asking "what was confusing?"

## Debugging Guidance
- If a branch's project doesn't run correctly after pasting it in, check that indentation lines up correctly under its \`if\`/\`elif\`.
- Test one project at a time rather than all three at once, to isolate exactly where a problem is.
- Ask a partner to try your menu without any help from you — wherever they get confused is exactly what needs more polish.

## Mini Quiz
1. What symbol starts a comment in Python?
2. What do all three of your projects have in common?
3. What pattern does a menu reuse from lesson 4?
4. Why is specific feedback more useful than "is it good?"
5. What should you do before considering a project finished?

### Answer Key
1. \`#\`.
2. They all use variables, f-strings, conditionals, and loops — the same core building blocks combined in different ways.
3. The \`if\`/\`elif\`/\`else\` decision-making pattern.
4. Specific feedback points to exactly what to improve, while vague feedback doesn't give you anything actionable to change.
5. Test every option/path yourself, and ideally have someone else try it too.

## Lesson Recap
You reviewed how all three of your portfolio projects share the same core Python tools, added comments to make your code easier to understand, and combined everything into a single menu program — turning three separate projects into one polished portfolio piece.

## Homework / Extension
Finish and polish your menu program at home so it correctly launches all three projects. Show it to a family member, let them pick and play one project from the menu, and write down one thing they suggested you add or change. Bring your menu program AND their feedback to share next class!

## Portfolio Project Connection
This lesson ties together everything from your **Personal Quiz App**, **Simple Calculator**, and **Word Guessing Game** — the three projects that make up your Python Foundations portfolio. You can open, play, and share each one directly using the buttons below.`,
    codeSnippets: [
      {
        label: 'Code Example 1',
        language: 'python',
        part: 'reference',
        code: `# Python Foundations Portfolio - Project Launcher Menu

print("=== Welcome to My Python Portfolio ===")
print("1) Personal Quiz App")
print("2) Simple Calculator")
print("3) Word Guessing Game")

choice = input("Which project would you like to try? (1/2/3): ")

if choice == "1":
    # The Personal Quiz App asks the player's name and a quiz topic,
    # then tracks their score as they answer questions.
    print("Starting the Personal Quiz App!")
elif choice == "2":
    # The Simple Calculator asks for two numbers and an operation,
    # then loops so the player can calculate again and again.
    print("Starting the Simple Calculator!")
elif choice == "3":
    # The Word Guessing Game picks a random word from a list and
    # gives the player a limited number of guesses to find it.
    print("Starting the Word Guessing Game!")
else:
    print("That's not a valid choice — please pick 1, 2, or 3.")

print("Thanks for exploring my Python portfolio!")`,
      },
    ],
    projectLinks: [PERSONAL_QUIZ_APP, SIMPLE_CALCULATOR, WORD_GUESSING_GAME],
  },

  // ─────────────────────────────────────────────────────────────────────
  // Lesson 10 — Python Basics for Game Development (no project yet)
  // Light touch: this lesson's content already matched the target house
  // style almost exactly (Mission Brief, Learning Objectives, Concept
  // Explanation, Mini Quiz, Portfolio Project Connection, etc.) — the only
  // real gaps were "Key Concepts" (bulleted, not a table) and two
  // cross-references to this module's OWN internal lesson numbering
  // ("Lesson 3", "Space Shooter"/"Maze Runner"/"Brick Breaker") that don't
  // apply inside this custom course, where those later lessons/projects
  // are left exactly as imported and carry no project data yet. Title and
  // every other section are otherwise unchanged from the source.
  // ─────────────────────────────────────────────────────────────────────
  {
    order: 10,
    matchTitle: 'Python Basics for Game Development',
    objectives: [
      'Declare and update variables that represent game state (position, health, score).',
      'Use `if`/`elif`/`else` conditionals to make decisions based on game state.',
      'Use `for` and `while` loops to repeat actions — including the concept behind a "game loop."',
      'Write functions with parameters and return values to organize game logic.',
      'Define a simple Python class with an `__init__` method and instance methods, in preparation for `Player` and `Enemy` classes later in the course.',
    ],
    homework:
      'In your Ship Status Simulator Colab notebook, extend `ship_status_simulator.py` with a `Cargo` class representing collectible resources. Give it a `value` attribute and a method `collect(self, ship)` that adds its value to `ship.score` and removes the cargo from play (you can use a `collected` boolean flag). Create a list of 5 `Cargo` objects and simulate the ship "encountering" one every few ticks, adding to its score when it does.',
    checkpoint:
      'Run the Ship Status Simulator end-to-end in Colab and show a completed run (at least 12 ticks, with at least one asteroid impact) plus your Cargo-class homework extension.',
    contentMarkdown: `# Advanced Data Science — Lesson 10: Python Basics for Game Development

**Course/Path:** Python Game Development
**Lesson:** 01 of 08
**Title:** Python Basics for Game Development
**Duration:** 60 minutes
**Difficulty:** Beginner
**Technology:** Python 3.10+, Google Colab

---

## Mission Brief

Cadet, welcome aboard the Lumexa Arcade Division! Before any starship can fly, its engineers must understand the raw materials it's built from — bolts, wiring, fuel lines. Before you can build a space shooter, a maze runner, or a brick-breaking cannon, you need the raw materials of every game: **variables, loops, conditionals, functions, and classes**. Today's mission is a systems check on your Python engineering fundamentals, refactored specifically for game logic. By the end of this hour, you'll have written the exact building blocks that will power your ship, your enemies, and your score counter in every project this course.

## Learning Objectives

By the end of this lesson, you will be able to:

1. Declare and update variables that represent game state (position, health, score).
2. Use \`if\`/\`elif\`/\`else\` conditionals to make decisions based on game state.
3. Use \`for\` and \`while\` loops to repeat actions — including the concept behind a "game loop."
4. Write functions with parameters and return values to organize game logic.
5. Define a simple Python class with an \`__init__\` method and instance methods, in preparation for \`Player\` and \`Enemy\` classes later in the course.

## What You'll Build

A **Google Colab notebook** running the **"Ship Status Simulator"** — a text-based Python program (no graphics yet) that tracks a spaceship's position, fuel, and health across a simulated flight, using variables, loops, conditionals, functions, and a \`Ship\` class. Colab runs entirely in your browser with nothing to install, so you can focus on the Python itself. Every concept here maps directly onto real Pygame code you'll write starting next lesson, when **Cosmic Defender** — your 6-part arcade game project — begins.

## Prerequisites

- A Google account to open and run the Colab notebook — no Python installation required.
- (Optional) Python 3.10+ installed locally with a code editor (VS Code recommended), if you'd rather run this outside Colab.
- No prior Pygame knowledge required.
- Comfortable reading simple Python code and running a notebook cell (or a \`.py\` file from a terminal, if working locally).

## Key Terminology
| Term | Definition |
|---|---|
| **Variables** | Named containers for data that changes over time (\`x\`, \`y\`, \`health\`, \`score\`). |
| **Data Types** | \`int\`, \`float\`, \`str\`, \`bool\`, and \`tuple\`/\`list\` for grouping values like \`(x, y)\` coordinates. |
| **Conditionals** | \`if\`/\`elif\`/\`else\` for branching logic ("if health <= 0, game over"). |
| **Loops** | \`for\` (fixed number of repetitions) and \`while\` (repeat until a condition changes) — the ancestor of the game loop. |
| **Functions** | Reusable blocks of code with parameters and \`return\` values. |
| **Classes and Objects** | Blueprints (\`class Ship:\`) and instances (\`my_ship = Ship()\`) that bundle data and behavior together. |

## Concept Explanation

Every game, no matter how flashy, is really just a program that keeps track of numbers and updates them over and over, many times per second. A player's x and y position are variables. Health is a variable. Score is a variable. The game "AI" of an enemy is just a function that changes an enemy's variables based on conditions.

Think of a spaceship's dashboard: fuel gauge, hull integrity, coordinates. Each of those is a **variable** in Python:

\`\`\`python
fuel = 100
hull_integrity = 100
x_position = 0
y_position = 0
\`\`\`

A **conditional** lets the ship's computer make decisions: "if fuel is less than 10, sound the alarm." A **loop** lets the simulation run for many "ticks" of time — in a real game, this loop runs 60 times per second and is called the **game loop**, which you'll build for real in an upcoming lesson. A **function** lets us package up a behavior, like \`burn_fuel(amount)\`, so we don't repeat code. And a **class** lets us bundle all of a ship's variables and behaviors into one clean object, \`Ship\`, instead of juggling a dozen separate variables — this is exactly the pattern you'll use for \`Player\` and \`Enemy\` classes later.

## Guided Coding

Create a file called \`ship_status_simulator.py\` and build it up step by step as described below. Here is the complete, final version:

\`\`\`python
"""
Advanced Data Science - Python Game Development, Lesson 01
Ship Status Simulator: Python fundamentals for game development.
"""

import random

# ---------------------------------------------------------
# STEP 1: Variables representing game state
# ---------------------------------------------------------
MAX_FUEL = 100
MAX_HULL = 100


# ---------------------------------------------------------
# STEP 2: A function that makes a decision (conditional)
# ---------------------------------------------------------
def check_status(fuel, hull_integrity):
    """Return a short status message based on current ship stats."""
    if hull_integrity <= 0:
        return "CRITICAL: Hull breached! Ship destroyed."
    elif hull_integrity < 30:
        return "WARNING: Hull integrity low!"
    elif fuel <= 0:
        return "CRITICAL: Out of fuel, drifting in space."
    elif fuel < 20:
        return "WARNING: Fuel running low."
    else:
        return "Status nominal. All systems green."


# ---------------------------------------------------------
# STEP 3: A class that bundles data + behavior together
# ---------------------------------------------------------
class Ship:
    """Represents a single spaceship and its changing state."""

    def __init__(self, name):
        self.name = name
        self.fuel = MAX_FUEL
        self.hull_integrity = MAX_HULL
        self.x = 0
        self.y = 0
        self.score = 0

    def move(self, dx, dy):
        """Move the ship and burn fuel proportional to distance traveled."""
        distance = abs(dx) + abs(dy)
        self.burn_fuel(distance)
        self.x += dx
        self.y += dy

    def burn_fuel(self, amount):
        """Reduce fuel, never going below zero."""
        self.fuel = max(0, self.fuel - amount)

    def take_damage(self, amount):
        """Reduce hull integrity, never going below zero."""
        self.hull_integrity = max(0, self.hull_integrity - amount)

    def add_score(self, points):
        self.score += points

    def is_alive(self):
        return self.hull_integrity > 0

    def __str__(self):
        return (f"[{self.name}] pos=({self.x},{self.y}) "
                f"fuel={self.fuel} hull={self.hull_integrity} score={self.score}")


# ---------------------------------------------------------
# STEP 4: A loop that simulates many "ticks" of gameplay
# ---------------------------------------------------------
def run_simulation(ticks=10):
    ship = Ship("Lumexa Voyager")
    print(f"Launching {ship.name}!\\n")

    for tick in range(1, ticks + 1):
        if not ship.is_alive():
            print(f"Tick {tick}: Ship destroyed. Simulation ended early.")
            break

        # Simulate random movement and events each tick
        dx = random.choice([-2, -1, 0, 1, 2])
        dy = random.choice([-2, -1, 0, 1, 2])
        ship.move(dx, dy)

        # Random chance of an asteroid hit
        if random.random() < 0.2:
            damage = random.randint(5, 15)
            ship.take_damage(damage)
            print(f"Tick {tick}: Asteroid impact! -{damage} hull.")
        else:
            ship.add_score(10)

        print(f"Tick {tick}: {ship} -> {check_status(ship.fuel, ship.hull_integrity)}")

    print("\\n--- Final Report ---")
    print(ship)
    print("Mission complete!" if ship.is_alive() else "Mission failed.")


if __name__ == "__main__":
    run_simulation(ticks=12)
\`\`\`

## Code Walkthrough

- \`import random\` — the \`random\` module lets us simulate unpredictable events (asteroid hits), the same way randomness will drive enemy spawn timing and movement patterns in later lessons.
- \`MAX_FUEL = 100\` — constants written in ALL_CAPS by convention. In Pygame projects, this pattern becomes \`settings.py\`, a dedicated file of constants like \`SCREEN_WIDTH\` and \`PLAYER_SPEED\`.
- \`check_status(fuel, hull_integrity)\` — a **function with parameters**. It takes inputs and \`return\`s a string, rather than printing directly, which makes it reusable and testable.
- \`class Ship:\` — the **class definition**. \`__init__(self, name)\` is the **constructor**, run automatically when you write \`Ship("Lumexa Voyager")\`. \`self\` refers to "this particular ship" — every method needs it as the first parameter.
- \`self.fuel\`, \`self.hull_integrity\`, etc. — **instance attributes**, unique to each \`Ship\` object. This is precisely how \`Player\` and \`Enemy\` will store \`self.rect\`, \`self.speed\`, and \`self.health\` in Pygame.
- \`def move(self, dx, dy):\` — a **method**, a function that belongs to the class and can read/modify \`self\`'s attributes.
- \`max(0, self.fuel - amount)\` — a defensive pattern that prevents fuel from going negative; you'll use the identical pattern to clamp player health.
- \`for tick in range(1, ticks + 1):\` — a **for loop** simulating repeated "frames" of gameplay, foreshadowing the real game loop later in the course, which uses \`while True:\` instead of a fixed range.
- \`if not ship.is_alive(): break\` — combining a conditional with \`break\` to exit a loop early, exactly how you'll exit the game loop when the player dies.
- \`if __name__ == "__main__":\` — ensures \`run_simulation()\` only runs when the file is executed directly, not when imported elsewhere — a pattern every \`main.py\` in this course will use.

## Build Instructions

1. Open the **Ship Status Simulator** project on Google Colab (linked in this lesson's Project section below) — it runs entirely in your browser, with nothing to install.
2. Click into a code cell and type in the code above yourself, rather than only reading it — you'll remember it far better.
3. Run the cell (the ▶ button, or \`Shift+Enter\`) and confirm you see 12 lines of simulated flight followed by a final report.
4. Run it several more times — since it uses \`random\`, the output changes every run.
5. (Optional, local alternative) If you'd rather work outside Colab: install Python 3.10+, save the code as \`ship_status_simulator.py\`, and run \`python ship_status_simulator.py\` from a terminal — the behavior is identical either way.

No external libraries are needed for this lesson — pure Python only. Pygame installation begins next lesson, when Cosmic Defender's first version brings up a real graphical window.

## Student Mission

Modify \`run_simulation\` so that:
1. The simulation runs for 20 ticks instead of 12.
2. Every 5th tick, the ship automatically refuels by 15 (simulating passing a space station), clamped at \`MAX_FUEL\`.
3. Print a special message when the ship's score crosses 100 for the first time.

## Challenge

Add a second \`Ship\` object representing a rival racer. Run both ships through the same number of ticks (you can call \`run_simulation\`-style logic twice, or refactor it to accept a \`Ship\` object as a parameter instead of creating one internally). At the end, print which ship has the higher score.

## Experiment / Extension (Progressive)

1. **Change a value** — set \`MAX_FUEL = 50\` and rerun. Notice ships run out of fuel much faster.
2. **Observe** — change the asteroid probability from \`0.2\` to \`0.5\` and note how much more damage accumulates.
3. **Modify a mechanic** — add a \`shield\` attribute to \`Ship\` that absorbs the first 5 points of damage each hit before hull integrity is touched.
4. **Combine mechanics** — make \`take_damage\` reduce \`fuel\` slightly too (a hit damages engines), combining two systems in one method.
5. **Build independently** — design your own \`PowerCore\` class with its own attributes and a method that interacts with \`Ship\` (e.g., \`power_core.recharge(ship)\`).

## Common Mistakes

- **Forgetting \`self\`** in method definitions (\`def move(dx, dy):\` instead of \`def move(self, dx, dy):\`) — Python will raise a \`TypeError\` about missing arguments.
- **Confusing \`=\` and \`==\`** — \`=\` assigns a value, \`==\` compares two values. Using \`=\` inside an \`if\` statement is a syntax error in Python (which actually helps you catch this mistake early).
- **Modifying a variable without \`self.\`** inside a method, e.g. writing \`fuel = fuel - 1\` instead of \`self.fuel = self.fuel - 1\` — this creates a local variable that disappears instead of updating the object.
- **Off-by-one errors in \`range()\`** — \`range(1, ticks + 1)\` is deliberate so tick numbers start at 1 and include the final tick; \`range(1, ticks)\` would stop one short.

## Debugging Tips

- Add temporary \`print()\` statements inside functions to see intermediate values — this is the single most useful beginner debugging technique.
- Read Python error messages from the **bottom up** — the last line tells you the actual error type and message.
- If you get \`AttributeError: 'Ship' object has no attribute 'x'\`, check that \`__init__\` actually sets \`self.x\` before any method tries to use it.
- Use VS Code's built-in debugger (the "Run and Debug" panel) to set a breakpoint and step through \`run_simulation\` one line at a time.

## Check Your Understanding

- Can you explain, in your own words, the difference between a variable and an attribute (\`self.something\`)?
- Why does \`check_status\` return a string instead of printing it directly? What advantage does that give us?
- What would happen if \`move()\` didn't call \`burn_fuel()\`?

## Mini Quiz

1. What keyword defines a class in Python?
   a) \`def\`  b) \`class\`  c) \`struct\`  d) \`object\`

2. In \`def move(self, dx, dy):\`, what does \`self\` represent?
   a) A global variable  b) The specific object the method is called on  c) A required Python keyword unrelated to the object  d) The class name

3. Predict the output: given \`fuel = 5\` and calling \`burn_fuel(10)\` where \`burn_fuel\` does \`self.fuel = max(0, self.fuel - amount)\`, what is \`self.fuel\` afterward?
   a) -5  b) 0  c) 5  d) 10

4. Which loop type is best suited for "repeat until the player's health reaches zero," where you don't know in advance how many repetitions will occur?
   a) \`for i in range(10):\`  b) \`while\` loop  c) A function with no loop  d) \`if\` statement

5. What does \`if __name__ == "__main__":\` accomplish?
   a) It defines the main class  b) It only runs the indented code when the file is executed directly, not when imported  c) It is required in every Python file or it will not run  d) It names the program "main"

6. (Code reading) What will \`check_status(fuel=15, hull_integrity=80)\` return, given the function body shown in this lesson?
   a) "Status nominal. All systems green."  b) "WARNING: Fuel running low."  c) "CRITICAL: Out of fuel, drifting in space."  d) "WARNING: Hull integrity low!"

### Answer Key

1. b — \`class\`
2. b — the specific object the method is called on
3. b — \`0\` (since \`5 - 10 = -5\`, clamped to \`0\` by \`max(0, ...)\`)
4. b — \`while\` loop
5. b — guards code so it only runs when the file is executed directly
6. b — "WARNING: Fuel running low." (fuel \`15\` is below \`20\`, and hull \`80\` doesn't trigger any hull warning first, since fuel check comes after hull checks in the \`elif\` chain but hull is fine so it falls through to fuel)

## Lesson Recap

Today you engineered the fundamental components every game needs: variables to hold changing state, conditionals to make decisions, loops to repeat actions over time, functions to organize logic, and a class to bundle it all into a clean, reusable \`Ship\` blueprint. This \`Ship\` class is a direct preview of the \`Player\` class you'll build in an upcoming lesson — same idea, same structure, just with a graphical \`pygame.Rect\` instead of plain \`x\`/\`y\` numbers, and \`pygame.sprite.Sprite\` instead of a plain Python class.

## Homework / Practice Mission

In your Ship Status Simulator Colab notebook, extend \`ship_status_simulator.py\` with a \`Cargo\` class representing collectible resources. Give it a \`value\` attribute and a method \`collect(self, ship)\` that adds its value to \`ship.score\` and removes the cargo from play (you can use a \`collected\` boolean flag). Create a list of 5 \`Cargo\` objects and simulate the ship "encountering" one every few ticks, adding to its score when it does.

## Portfolio Project Connection

The \`Ship\` class you built today is the direct ancestor of the \`Player\` class you'll build in the lessons ahead, where \`self.health\`, \`self.x\`/\`self.y\` (as a \`pygame.Rect\`), and methods like \`take_damage()\` and \`move()\` reappear nearly unchanged, now driven by real keyboard input and rendered on screen. The scoring pattern (\`self.score\`, \`add_score()\`) is reused identically across every game you build from here on. Mastering these fundamentals today means you'll recognize this exact code shape in every project for the rest of the module.`,
    codeSnippets: [
      {
        label: 'Code Example 1',
        language: 'python',
        part: 'reference',
        code: `"""
Advanced Data Science - Python Game Development, Lesson 01
Ship Status Simulator: Python fundamentals for game development.
"""

import random

MAX_FUEL = 100
MAX_HULL = 100


def check_status(fuel, hull_integrity):
    """Return a short status message based on current ship stats."""
    if hull_integrity <= 0:
        return "CRITICAL: Hull breached! Ship destroyed."
    elif hull_integrity < 30:
        return "WARNING: Hull integrity low!"
    elif fuel <= 0:
        return "CRITICAL: Out of fuel, drifting in space."
    elif fuel < 20:
        return "WARNING: Fuel running low."
    else:
        return "Status nominal. All systems green."


class Ship:
    """Represents a single spaceship and its changing state."""

    def __init__(self, name):
        self.name = name
        self.fuel = MAX_FUEL
        self.hull_integrity = MAX_HULL
        self.x = 0
        self.y = 0
        self.score = 0

    def move(self, dx, dy):
        distance = abs(dx) + abs(dy)
        self.burn_fuel(distance)
        self.x += dx
        self.y += dy

    def burn_fuel(self, amount):
        self.fuel = max(0, self.fuel - amount)

    def take_damage(self, amount):
        self.hull_integrity = max(0, self.hull_integrity - amount)

    def add_score(self, points):
        self.score += points

    def is_alive(self):
        return self.hull_integrity > 0

    def __str__(self):
        return (f"[{self.name}] pos=({self.x},{self.y}) "
                f"fuel={self.fuel} hull={self.hull_integrity} score={self.score}")


def run_simulation(ticks=10):
    ship = Ship("Lumexa Voyager")
    print(f"Launching {ship.name}!\\n")

    for tick in range(1, ticks + 1):
        if not ship.is_alive():
            print(f"Tick {tick}: Ship destroyed. Simulation ended early.")
            break

        dx = random.choice([-2, -1, 0, 1, 2])
        dy = random.choice([-2, -1, 0, 1, 2])
        ship.move(dx, dy)

        if random.random() < 0.2:
            damage = random.randint(5, 15)
            ship.take_damage(damage)
            print(f"Tick {tick}: Asteroid impact! -{damage} hull.")
        else:
            ship.add_score(10)

        print(f"Tick {tick}: {ship} -> {check_status(ship.fuel, ship.hull_integrity)}")

    print("\\n--- Final Report ---")
    print(ship)
    print("Mission complete!" if ship.is_alive() else "Mission failed.")


if __name__ == "__main__":
    run_simulation(ticks=12)`,
      },
    ],
    projectLinks: [
      {
        title: 'Ship Status Simulator',
        url: 'https://colab.research.google.com/drive/1QcWpmkzYZ7QcvFu7nT61Jm0HWkM6ryri?usp=sharing',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // Lessons 11-16 — Cosmic Defender, Parts 1-6 (NEW)
  // A single continuous, cumulative 6-part Pygame project replacing the
  // individual python-arcade-games activities previously imported at these
  // orders (originally "Pygame Setup and the Game Loop" through "Game
  // States — Menu, Play, Game Over"). Each part is a complete, runnable
  // game — never a stripped-down snippet — that keeps every feature from
  // the part before it and adds exactly one new system on top. See each
  // lesson's own "What Changed From Part N" section for the NEW/MODIFIED/
  // REMOVED breakdown against the previous part. Lesson 11 has no such
  // section since it is the project's starting point.
  // ─────────────────────────────────────────────────────────────────────
  {
    order: 11,
    matchTitle: `Pygame Setup and the Game Loop`,
    title: `Cosmic Defender — Part 1: Player & Game Window`,
    objectives: [
      `Install Pygame and verify the installation works.`,
      `Create a game window with \`pygame.display.set_mode\` and give it a title with \`pygame.display.set_caption\`.`,
      `Build a correct game loop: handle events, update game state, draw everything, and control the frame rate.`,
      `Read which keys are currently held down with \`pygame.key.get_pressed()\` and use that to move an object.`,
      `Keep the player's ship from flying off the edges of the screen using simple boundary checks.`,
    ],
    homework: `Open your \`main.py\` from today and make two small, personal changes: (1) tune \`PLAYER_SPEED\` to a value that feels best to you, and (2) add an "engine glow" circle drawn just behind the ship in \`Player.draw()\` using \`pygame.draw.circle\`. Run the game and confirm the ship still moves correctly and stays fully on screen with your changes in place.`,
    checkpoint: `Run main.py and show a ship that moves left/right with the arrow keys (or A/D) and never leaves the window.`,
    contentMarkdown: `# Advanced Data Science — Lesson 11: Cosmic Defender — Part 1: Player & Game Window

**Course/Path:** Cosmic Defender (6-Part Pygame Project)
**Lesson:** 02 of 08
**Title:** Cosmic Defender — Part 1: Player & Game Window
**Duration:** 60 minutes
**Difficulty:** Beginner
**Technology:** Python 3.10+, Pygame

---

## Mission Brief

Cadet, your cockpit just came online. Today you open a real graphical window for the first time and bring your very first spaceship to life on screen — one that you can actually steer with your own keyboard. This is day one of **Cosmic Defender**, the single big project you'll keep building, lesson after lesson, all the way through Lesson 16. Nothing you write today gets thrown away later — the window, the ship, and the movement code you build right now will still be sitting inside the finished game at the end of the course. By the end of this hour you'll have a real game window, a triangle-shaped ship, and full left/right keyboard control.

## Learning Objectives

By the end of this lesson, you will be able to:

1. Install Pygame and verify the installation works.
2. Create a game window with \`pygame.display.set_mode\` and give it a title with \`pygame.display.set_caption\`.
3. Build a correct **game loop**: handle events, update game state, draw everything, and control the frame rate.
4. Read which keys are currently held down with \`pygame.key.get_pressed()\` and use that to move an object.
5. Keep the player's ship from flying off the edges of the screen using simple boundary checks.

## What You'll Build

**Cosmic Defender v1 — Player & Game Window.** A real Pygame window titled "Cosmic Defender," filled with a dark space-blue background, containing one cyan triangular ship near the bottom of the screen. Press the left/right arrow keys (or A/D) and the ship slides smoothly across the screen, stopping exactly at the edges instead of flying off into nothing.

## Prerequisites

- Completion of Lesson 10 (Python Basics for Game Development) — you should be comfortable with variables, functions, and classes.
- Python 3.10+ installed, or working directly inside the Cosmic Defender Pickcode project for this lesson (recommended — no local setup needed).
- If working locally: Pygame installed (\`pip install pygame\`).

## Key Terminology

| Term | Definition |
|---|---|
| **\`pygame.init()\`** | Starts up every one of Pygame's internal systems (graphics, input, timing) before you use any of them. |
| **Game Window** | The rectangular area created by \`pygame.display.set_mode((width, height))\` that everything gets drawn into. |
| **Game Loop** | The \`while running:\` loop that repeats continuously, usually 60 times per second: handle events, update state, draw the screen. |
| **Clock / FPS** | \`pygame.time.Clock()\` paired with \`clock.tick(60)\`, which caps the loop at a steady 60 **F**rames **P**er **S**econd so the game runs at the same speed on every computer. |
| **Event** | Something that happened since the last frame — a key press, a window close click — delivered through \`pygame.event.get()\`. |
| **Boundary Clamping** | Using \`if\` checks to stop a value (like the ship's \`x\` position) from ever going past a limit, as if there were an invisible wall there. |

## Concept Explanation

Think of a Pygame game like a flipbook cartoon. Each "page" of the flipbook is one still image — but if you flip through 60 pages every second, it looks like smooth motion. The **game loop** is the part of your program that draws a new "page" 60 times a second, forever, until you close the window. Every single trip around that loop does the same three jobs, always in the same order: **check for anything the player just did** (an event), **update the game's numbers** based on that (movement, health, score), and **draw** the current picture. \`clock.tick(60)\` is what keeps the flipbook flipping at a steady, comfortable speed instead of running too fast on a powerful computer or too slow on an old one.

An **event** is Pygame's way of telling your program "something just happened." Imagine checking a mailbox once per loop: most of the time it's empty, but sometimes there's a letter inside that says "the X key was pressed" or "the player clicked the close button." \`pygame.event.get()\` hands you every letter that arrived since you last checked, as a list, and your job is to read through them and react.

**Boundary clamping** is simpler than it sounds: it's just an \`if\` statement that says "if you're about to go past this line, snap back to the line instead." Picture invisible walls on the left and right edges of the screen — the ship can slide right up to a wall, but never through it.

## How This Shows Up in Cosmic Defender

Cosmic Defender's \`Player\` class bundles everything about the ship into one object, exactly like the \`Ship\` class you built in Lesson 10 — except now \`self.x\` and \`self.y\` control something you can actually *see* on screen, and \`self.speed\` is read every single frame instead of just once. The \`move()\` method reads \`pygame.key.get_pressed()\` (a long list of \`True\`/\`False\` values, one per key on the keyboard) to check whether the left or right arrow — or \`A\`/\`D\` — is currently held down, adjusts \`self.x\` accordingly, and then immediately clamps \`self.x\` between \`0\` and \`SCREEN_WIDTH - self.width\` so the ship can never slide off either edge. The \`draw()\` method uses \`pygame.draw.polygon()\` to paint a simple triangle at the ship's current position — no image files needed, just three points and a color.

## Starting From Scratch: What's In This First Version

Since this is the very first version of Cosmic Defender, there's no "previous version" to compare against yet — here's everything this starting version contains:

- **Constants** (\`SCREEN_WIDTH\`, \`SCREEN_HEIGHT\`, \`FPS\`, \`PLAYER_SPEED\`, and two colors) — all the tunable numbers for this version, written in ALL_CAPS by convention, living at the top of the file so they're easy to find and adjust.
- **Pygame setup** — \`pygame.init()\`, \`pygame.display.set_mode()\`, \`pygame.display.set_caption()\`, and a \`pygame.time.Clock()\`, run once when the program starts.
- **The \`Player\` class** — holds the ship's position, size, and speed, and knows how to \`move()\` itself based on keyboard input and \`draw()\` itself on screen.
- **\`main()\`** — creates one \`Player\`, then runs the game loop: handle the \`QUIT\` event, read the keyboard, move the player, fill the screen with the background color, draw the player, and flip the display to show the new frame.

## Guided Coding

Here is the complete, current version of \`main.py\`. Type it out yourself rather than copy-pasting — you'll remember it far better, and you'll be far quicker to spot a typo if the game doesn't run.

\`\`\`python
# Cosmic Defender - Part 1: Player & Game Window
# Advanced Data Science - Lesson 11

import sys
import pygame

# --- Constants ---
SCREEN_WIDTH = 800
SCREEN_HEIGHT = 600
FPS = 60

PLAYER_SPEED = 6

BLACK = (10, 10, 30)
CYAN = (0, 255, 255)

# --- Pygame setup ---
pygame.init()
screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
pygame.display.set_caption("Cosmic Defender")
clock = pygame.time.Clock()


class Player:
    """The player's spaceship."""

    def __init__(self):
        self.width = 50
        self.height = 40
        # Start centered near the bottom of the screen
        self.x = SCREEN_WIDTH // 2 - self.width // 2
        self.y = SCREEN_HEIGHT - self.height - 20
        self.speed = PLAYER_SPEED

    def move(self, keys):
        """Move left/right based on which keys are currently held down."""
        if keys[pygame.K_LEFT] or keys[pygame.K_a]:
            self.x -= self.speed
        if keys[pygame.K_RIGHT] or keys[pygame.K_d]:
            self.x += self.speed

        # Keep the ship from flying off the left or right edge
        if self.x < 0:
            self.x = 0
        if self.x > SCREEN_WIDTH - self.width:
            self.x = SCREEN_WIDTH - self.width

    def draw(self, surface):
        # A simple triangle-shaped ship, pointing up
        points = [
            (self.x + self.width // 2, self.y),
            (self.x, self.y + self.height),
            (self.x + self.width, self.y + self.height),
        ]
        pygame.draw.polygon(surface, CYAN, points)


def main():
    player = Player()
    running = True

    while running:
        clock.tick(FPS)

        # --- Handle events ---
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False

        # --- Update ---
        keys = pygame.key.get_pressed()
        player.move(keys)

        # --- Draw ---
        screen.fill(BLACK)
        player.draw(screen)
        pygame.display.flip()

    pygame.quit()
    sys.exit()


if __name__ == "__main__":
    main()
\`\`\`

## Code Walkthrough

- \`pygame.init()\` — must be called before any other Pygame function; it starts up the library's graphics, input, and timing systems.
- \`pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))\` — creates the actual window and returns a \`Surface\` (Pygame's word for "a rectangle of pixels you can draw on") that we store in \`screen\`.
- \`clock = pygame.time.Clock()\` then \`clock.tick(FPS)\` inside the loop — \`tick(60)\` pauses just long enough so the loop runs at a steady 60 times per second, no matter how fast the computer is.
- \`class Player:\` — bundles the ship's data (\`x\`, \`y\`, \`width\`, \`height\`, \`speed\`) and behavior (\`move\`, \`draw\`) into one object, the exact same pattern as the \`Ship\` class from Lesson 10.
- \`keys = pygame.key.get_pressed()\` — returns a list-like object where \`keys[pygame.K_LEFT]\` is \`True\` only while the left arrow is physically held down. Checking this every frame (instead of only reacting to one key-press event) is what makes movement feel smooth and continuous.
- \`if self.x < 0: self.x = 0\` and the matching check against \`SCREEN_WIDTH - self.width\` — this is boundary clamping: the ship can get right up against an edge but never cross it.
- \`for event in pygame.event.get(): if event.type == pygame.QUIT: running = False\` — the standard way every Pygame program checks whether the player clicked the window's close button.
- \`screen.fill(BLACK)\` then \`player.draw(screen)\` then \`pygame.display.flip()\` — every frame, Cosmic Defender repaints the *entire* background first, then draws the ship on top, then shows the finished frame all at once. Skipping \`fill()\` would leave "ghost trails" of every previous position on screen.
- \`pygame.quit()\` and \`sys.exit()\` — clean shutdown once \`running\` becomes \`False\`.

## Build Instructions

1. Open the Cosmic Defender v1 project on Pickcode (linked in this lesson's Project section) — Pygame is already installed there, so you can start typing immediately.
2. If you'd rather work locally: install Python 3.10+, then run \`pip install pygame\` in a terminal.
3. Create a file named \`main.py\` and type in the code above.
4. Run it with \`python main.py\` (or the Run button on Pickcode).
5. Confirm a dark window titled "Cosmic Defender" opens, with a cyan triangle ship near the bottom.
6. Hold the left and right arrow keys (or A/D) and confirm the ship slides smoothly and stops exactly at each edge.

## Student Mission

Make the ship feel more like *your* ship:

1. Change \`PLAYER_SPEED\` to \`2\` and then to \`15\` — notice how differently the controls feel at each speed, then pick a value you personally like best.
2. Change the ship's color by editing the \`CYAN\` tuple — remember, each color is \`(red, green, blue)\`, each from \`0\` to \`255\`.
3. Add a small "engine glow": inside \`Player.draw()\`, after drawing the triangle, draw a small circle (\`pygame.draw.circle\`) just behind the ship using a second color, so it looks like the engine is firing.

## Challenge

Right now the ship only moves left and right. Add vertical movement too: let the up/down arrow keys (or W/S) adjust \`self.y\`, clamped between some reasonable top and bottom boundary so the ship can roam a wider area of the screen without disappearing off the top or bottom. (Cosmic Defender's final version keeps the ship on one horizontal line on purpose — this is just for your own practice with the same clamping idea applied to a second axis.)

## Common Mistakes

- **Forgetting to call \`pygame.init()\` first** — most Pygame functions will raise confusing errors if the library hasn't been started up yet.
- **Clamping only one side of the boundary** — if you check \`self.x < 0\` but forget the right-edge check, the ship will happily vanish off the right side of the screen.
- **Drawing before filling the background** — if you call \`player.draw(screen)\` before \`screen.fill(BLACK)\`, the fill will immediately paint over the ship you just drew, and nothing will appear.
- **Using an \`if\` instead of checking every key independently** — writing \`if keys[pygame.K_LEFT]: ... elif keys[pygame.K_RIGHT]: ...\` (with \`elif\`) means holding both keys at once does nothing, which feels buggy; two separate \`if\` statements let each key act independently, matching what players expect.

## Debugging Tips

- If the window opens and instantly closes, you're missing the game loop entirely — check that \`while running:\` actually wraps your event/update/draw code.
- If the ship doesn't move at all, add a temporary \`print(self.x)\` inside \`move()\` to confirm the function is even being called and whether \`x\` is changing.
- If the window feels "frozen" or unresponsive, make sure you're calling \`pygame.event.get()\` every frame — without it, your operating system assumes the program has stopped responding.
- A blank or black screen with no ship usually means a drawing-order bug (see Common Mistakes above) — check the order of your \`fill()\` and \`draw()\` calls.

## Check Your Understanding

- In your own words, what are the three jobs every single trip around the game loop performs?
- Why does \`clock.tick(60)\` matter — what would happen to the game's speed without it?
- Why do we check \`pygame.key.get_pressed()\` every frame instead of only reacting once when a key is first pressed?

## Mini Quiz

1. What must be called before any other Pygame function?
   a) \`pygame.quit()\`  b) \`pygame.init()\`  c) \`pygame.display.flip()\`  d) \`main()\`

2. What does \`clock.tick(60)\` control?
   a) The window's size  b) The number of enemies  c) The frame rate (how many loops run per second)  d) The ship's color

3. Which line actually shows the finished frame on screen?
   a) \`screen.fill(BLACK)\`  b) \`player.draw(screen)\`  c) \`pygame.display.flip()\`  d) \`pygame.init()\`

4. What does \`pygame.key.get_pressed()\` return?
   a) The last key that was pressed, as a string  b) A list-like object of every key's current held-down state  c) The mouse position  d) Nothing — it's used for events, not key state

5. If \`self.x > SCREEN_WIDTH - self.width\`, what should happen?
   a) Nothing  b) \`self.x\` should be set to \`0\`  c) \`self.x\` should be clamped back to \`SCREEN_WIDTH - self.width\`  d) The game should quit

6. (Code reading) If \`PLAYER_SPEED = 6\` and the left arrow is held for exactly 10 frames in a row, roughly how far has the ship moved (ignoring any boundary clamp)?
   a) 6 pixels  b) 10 pixels  c) 16 pixels  d) 60 pixels

### Answer Key

1. b — \`pygame.init()\`
2. c — the frame rate
3. c — \`pygame.display.flip()\`
4. b — a list-like object of every key's current held-down state
5. c — clamped back to \`SCREEN_WIDTH - self.width\`
6. d — 60 pixels (6 pixels per frame × 10 frames)

## Lesson Recap

Today you opened your very first real game window and brought a controllable ship to life inside it, using the same event → update → draw rhythm that every Pygame project — including every version of Cosmic Defender you'll build from here on — repeats 60 times a second. The \`Player\` class, its \`move()\` and \`draw()\` methods, and the boundary-clamping pattern you wrote today are permanent: they'll still be sitting inside the finished, 6-part game at Lesson 16, completely unchanged.

## Homework / Practice Mission

Open your \`main.py\` from today and make two small, personal changes: (1) tune \`PLAYER_SPEED\` to a value that feels best to you, and (2) add the "engine glow" circle described in the Student Mission, drawn just behind the ship in \`Player.draw()\`. Run the game and confirm the ship still moves correctly and stays fully on screen with your changes in place.

## Portfolio Project Connection

Everything you wrote today — the constants, the \`Player\` class, the game loop structure — is the permanent foundation of Cosmic Defender. Next lesson you'll add an entire fleet of enemies on top of this exact code, without changing a single line of what you built today.`,
    codeSnippets: [
      {
        label: `Cosmic Defender — Part 1 Code (main.py)`,
        language: 'python',
        part: 'reference',
        code: `# Cosmic Defender - Part 1: Player & Game Window
# Advanced Data Science - Lesson 11

import sys
import pygame

# --- Constants ---
SCREEN_WIDTH = 800
SCREEN_HEIGHT = 600
FPS = 60

PLAYER_SPEED = 6

BLACK = (10, 10, 30)
CYAN = (0, 255, 255)

# --- Pygame setup ---
pygame.init()
screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
pygame.display.set_caption("Cosmic Defender")
clock = pygame.time.Clock()


class Player:
    """The player's spaceship."""

    def __init__(self):
        self.width = 50
        self.height = 40
        # Start centered near the bottom of the screen
        self.x = SCREEN_WIDTH // 2 - self.width // 2
        self.y = SCREEN_HEIGHT - self.height - 20
        self.speed = PLAYER_SPEED

    def move(self, keys):
        """Move left/right based on which keys are currently held down."""
        if keys[pygame.K_LEFT] or keys[pygame.K_a]:
            self.x -= self.speed
        if keys[pygame.K_RIGHT] or keys[pygame.K_d]:
            self.x += self.speed

        # Keep the ship from flying off the left or right edge
        if self.x < 0:
            self.x = 0
        if self.x > SCREEN_WIDTH - self.width:
            self.x = SCREEN_WIDTH - self.width

    def draw(self, surface):
        # A simple triangle-shaped ship, pointing up
        points = [
            (self.x + self.width // 2, self.y),
            (self.x, self.y + self.height),
            (self.x + self.width, self.y + self.height),
        ]
        pygame.draw.polygon(surface, CYAN, points)


def main():
    player = Player()
    running = True

    while running:
        clock.tick(FPS)

        # --- Handle events ---
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False

        # --- Update ---
        keys = pygame.key.get_pressed()
        player.move(keys)

        # --- Draw ---
        screen.fill(BLACK)
        player.draw(screen)
        pygame.display.flip()

    pygame.quit()
    sys.exit()


if __name__ == "__main__":
    main()`,
      },
    ],
    projectLinks: [
      {
        title: `Cosmic Defender v1`,
        url: `https://app.pickcode.io/project/cmvzz0cta02n0ireuz6olzz6q`,
      },
    ],
  },

  {
    order: 12,
    matchTitle: `Sprites, Images, and Movement`,
    title: `Cosmic Defender — Part 2: Enemy Fleet`,
    objectives: [
      `Create a second class (\`Enemy\`) that follows the same object pattern as \`Player\`.`,
      `Use a nested loop (\`for row... for col...\`) to generate a whole grid of objects at once.`,
      `Store many objects together in a Python list and loop over that list to move and draw every one of them.`,
      `Write a function that moves a whole group of objects together and makes a group decision (reverse direction) based on any one of them.`,
      `Explain why organizing related objects into a list is better than creating 18 separate variables.`,
    ],
    homework: `Using only what you learned today (lists, nested loops, and group movement — no shooting or scoring yet), change the fleet's formation from a rectangle into a V-shape: for each row, reduce the number of enemies and shift the starting \`x\` further right as the row number increases, so the fleet looks like a wedge instead of a block. Confirm the fleet still marches and reverses direction correctly in its new shape.`,
    checkpoint: `Run main.py and show an 18-enemy fleet that marches sideways as a group and drops down, reversing direction, when it reaches a screen edge.`,
    contentMarkdown: `# Advanced Data Science — Lesson 12: Cosmic Defender — Part 2: Enemy Fleet

**Course/Path:** Cosmic Defender (6-Part Pygame Project)
**Lesson:** 03 of 08
**Title:** Cosmic Defender — Part 2: Enemy Fleet
**Duration:** 60 minutes
**Difficulty:** Beginner
**Technology:** Python 3.10+, Pygame

---

## Mission Brief

Cadet, sensors just picked up something big: an entire enemy fleet, marching in formation. Today you bring a whole squadron of alien ships onto the screen at once — not one at a time, but 18 of them, arranged in a neat grid, marching sideways together and dropping down a row every time they bump the edge of the screen, just like the enemies in classic arcade shooters. Your ship from last lesson doesn't change at all today — it's still sitting exactly where you left it, fully working. You're only adding something new on top.

## Learning Objectives

By the end of this lesson, you will be able to:

1. Create a second class (\`Enemy\`) that follows the same object pattern as \`Player\`.
2. Use a nested loop (\`for row... for col...\`) to generate a whole grid of objects at once.
3. Store many objects together in a Python list and loop over that list to move and draw every one of them.
4. Write a function that moves a whole group of objects together and makes a group decision (reverse direction) based on any one of them.
5. Explain why organizing related objects into a list is better than creating 18 separate variables.

## What You'll Build

**Cosmic Defender v2 — Enemy Fleet.** Everything from Part 1 (the window, your controllable ship) plus a 3-row-by-6-column grid of red rectangular enemies that marches sideways across the screen together, and — just like the classic arcade games this is inspired by — drops down one row and reverses direction the instant any enemy in the fleet touches a screen edge.

## Prerequisites

- Completion of Lesson 11 (Cosmic Defender Part 1) — you should have a working \`main.py\` with a moving \`Player\`.
- Comfortable with Python lists and \`for\` loops from Lesson 10.

## Key Terminology

| Term | Definition |
|---|---|
| **Nested Loop** | A loop inside another loop — here, a \`for col\` loop running completely, once for every single value of an outer \`for row\` loop, to cover every cell of a grid. |
| **List of Objects** | A single Python list (\`enemies = []\`) where every item is a full object (an \`Enemy\` instance), not just a number or string. |
| **Grid Spacing** | Fixed horizontal and vertical gaps (\`spacing_x\`, \`spacing_y\`) used to position each enemy a consistent distance from its neighbors. |
| **Group Movement** | Moving every object in a list the same way, in one loop, so they visually move together as a unit. |
| **Edge Detection** | Checking whether any object in a group has reached a screen boundary, in order to make one decision (like reversing direction) that affects the *whole* group at once. |

## Concept Explanation

You already know how to track *one* object with a class — your \`Player\`. But what about 18 enemies? You could create \`enemy1\`, \`enemy2\`, \`enemy3\`, all the way to \`enemy18\`, but imagine trying to move all of them: you'd need 18 nearly-identical lines of code, and if you ever wanted 20 enemies instead of 18, you'd have to add more variables and more lines by hand. A **list of objects** solves this instantly: \`enemies = [Enemy(...), Enemy(...), ...]\` holds all of them in one place, and a single \`for enemy in enemies:\` loop can move or draw every single one, whether there are 3 enemies or 300.

To arrange them neatly into a grid, we use a **nested loop**: the outer loop counts rows (\`0, 1, 2\`), and for *each* row, the inner loop counts columns (\`0, 1, 2, 3, 4, 5\`) — so the inner loop runs completely 3 separate times, once per row, creating all \`3 × 6 = 18\` positions. Each position's \`x\` and \`y\` is just the row/column number multiplied by a fixed spacing, plus a starting offset.

Finally, **group movement with edge detection** is what makes the fleet feel alive: every frame, every enemy shifts sideways by the same small amount. But if *any single enemy* in the whole fleet has reached the left or right edge, the *entire fleet* drops down a row and reverses direction together — one shared decision based on checking every member of the group.

## How This Shows Up in Cosmic Defender

The new \`Enemy\` class looks almost exactly like a smaller version of \`Player\` — it has \`x\`, \`y\`, \`width\`, \`height\`, and a \`draw()\` method, just no \`move()\` of its own, because enemies in this fleet don't move individually; they move as a *group*. \`create_enemy_fleet()\` is the nested loop in action: it builds a Python list of 18 \`Enemy\` objects, positioned using \`spacing_x\`/\`spacing_y\` and the row/column numbers. \`move_fleet(enemies, direction)\` is the group-movement function: it loops over every enemy, shifting \`enemy.x\` by \`ENEMY_SPEED * direction\`, and if *any* enemy's edge check comes back true, it loops over the fleet a second time to drop every enemy down by \`ENEMY_DROP\` and flips \`direction\` from \`1\` to \`-1\` (or back). \`main()\` now creates the fleet once before the loop starts, tracks \`fleet_direction\`, calls \`move_fleet()\` every frame, and draws every enemy in the list right after drawing the player.

## What Changed From Part 1

- **NEW** — \`ENEMY_SPEED\`, \`ENEMY_DROP\`, \`ENEMY_ROWS\`, and \`ENEMY_COLS\` constants, plus a new \`RED\` color, to control how the fleet looks and moves.
- **NEW** — the \`Enemy\` class, a simple rectangle-drawing object with its own \`x\`, \`y\`, \`width\`, and \`height\`.
- **NEW** — \`create_enemy_fleet()\`, a function that uses a nested loop to build and return a list of 18 \`Enemy\` objects arranged in a grid.
- **NEW** — \`move_fleet(enemies, direction)\`, a function that moves every enemy in the list sideways each frame and reverses the whole fleet's direction (dropping it down a row) whenever any enemy touches an edge.
- **MODIFIED** — \`main()\` now creates the enemy fleet and a \`fleet_direction\` variable before the loop starts, calls \`move_fleet()\` every frame, and draws every enemy in the fleet right after drawing the player.
- **REMOVED** — nothing. Every line from Part 1 — the \`Player\` class, its movement, and its drawing — is still here, completely unchanged.

## Guided Coding

Here is the complete, current version of \`main.py\`, with everything from Part 1 still intact:

\`\`\`python
# Cosmic Defender - Part 2: Enemy Fleet
# Advanced Data Science - Lesson 12
# Builds on Part 1 (Player & Game Window) - nothing from Part 1 is removed.

import sys
import pygame

# --- Constants ---
SCREEN_WIDTH = 800
SCREEN_HEIGHT = 600
FPS = 60

PLAYER_SPEED = 6

# NEW: enemy fleet constants
ENEMY_SPEED = 2
ENEMY_DROP = 20
ENEMY_ROWS = 3
ENEMY_COLS = 6

BLACK = (10, 10, 30)
CYAN = (0, 255, 255)
RED = (255, 60, 60)

# --- Pygame setup ---
pygame.init()
screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
pygame.display.set_caption("Cosmic Defender")
clock = pygame.time.Clock()


class Player:
    """The player's spaceship. (Unchanged from Part 1.)"""

    def __init__(self):
        self.width = 50
        self.height = 40
        self.x = SCREEN_WIDTH // 2 - self.width // 2
        self.y = SCREEN_HEIGHT - self.height - 20
        self.speed = PLAYER_SPEED

    def move(self, keys):
        if keys[pygame.K_LEFT] or keys[pygame.K_a]:
            self.x -= self.speed
        if keys[pygame.K_RIGHT] or keys[pygame.K_d]:
            self.x += self.speed

        if self.x < 0:
            self.x = 0
        if self.x > SCREEN_WIDTH - self.width:
            self.x = SCREEN_WIDTH - self.width

    def draw(self, surface):
        points = [
            (self.x + self.width // 2, self.y),
            (self.x, self.y + self.height),
            (self.x + self.width, self.y + self.height),
        ]
        pygame.draw.polygon(surface, CYAN, points)


# NEW: Enemy class
class Enemy:
    """One enemy ship in the fleet."""

    def __init__(self, x, y):
        self.width = 40
        self.height = 30
        self.x = x
        self.y = y

    def draw(self, surface):
        pygame.draw.rect(surface, RED, (self.x, self.y, self.width, self.height))


# NEW: build a grid of enemies
def create_enemy_fleet():
    """Create a grid of enemies (rows x cols) with even spacing."""
    enemies = []
    spacing_x = 90
    spacing_y = 70
    start_x = 60
    start_y = 50
    for row in range(ENEMY_ROWS):
        for col in range(ENEMY_COLS):
            x = start_x + col * spacing_x
            y = start_y + row * spacing_y
            enemies.append(Enemy(x, y))
    return enemies


# NEW: move the whole fleet together, bouncing off the screen edges
def move_fleet(enemies, direction):
    """Move every enemy sideways. If any enemy touches an edge, drop the
    whole fleet down a row and reverse direction (classic arcade style)."""
    edge_hit = False
    for enemy in enemies:
        enemy.x += ENEMY_SPEED * direction
        if enemy.x <= 0 or enemy.x + enemy.width >= SCREEN_WIDTH:
            edge_hit = True

    if edge_hit:
        for enemy in enemies:
            enemy.y += ENEMY_DROP
        direction *= -1

    return direction


def main():
    player = Player()
    enemies = create_enemy_fleet()  # NEW
    fleet_direction = 1  # NEW: 1 = moving right, -1 = moving left
    running = True

    while running:
        clock.tick(FPS)

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False

        keys = pygame.key.get_pressed()
        player.move(keys)
        fleet_direction = move_fleet(enemies, fleet_direction)  # NEW

        screen.fill(BLACK)
        player.draw(screen)
        for enemy in enemies:  # NEW
            enemy.draw(screen)
        pygame.display.flip()

    pygame.quit()
    sys.exit()


if __name__ == "__main__":
    main()
\`\`\`

## Code Walkthrough

- \`class Enemy:\` — notice it has no \`move()\` method of its own; unlike the player, individual enemies never decide to move themselves — the fleet moves them, which you'll see next.
- \`def create_enemy_fleet():\` — the nested loop \`for row in range(ENEMY_ROWS): for col in range(ENEMY_COLS):\` runs the inner loop a total of \`ENEMY_ROWS × ENEMY_COLS\` times, once per grid cell, appending one new \`Enemy\` to the \`enemies\` list each time.
- \`x = start_x + col * spacing_x\` — this one line of math is what spaces enemies evenly: column \`0\` sits at \`start_x\`, column \`1\` sits \`spacing_x\` pixels further right, and so on.
- \`def move_fleet(enemies, direction):\` — takes the *entire list* and a direction (\`1\` for right, \`-1\` for left), and returns the (possibly flipped) direction so \`main()\` can remember it for next frame.
- \`edge_hit = False\` then \`if enemy.x <= 0 or enemy.x + enemy.width >= SCREEN_WIDTH: edge_hit = True\` — checked for *every* enemy in the first loop; as soon as even one enemy trips this, the whole fleet reacts together in the second loop.
- \`direction *= -1\` — a compact way to flip a number's sign: multiplying by \`-1\` turns \`1\` into \`-1\` and \`-1\` back into \`1\`.
- \`fleet_direction = move_fleet(enemies, fleet_direction)\` in \`main()\` — because Python function arguments don't let a function permanently change a plain number passed into it, \`move_fleet\` must \`return\` the new direction, and \`main()\` must store it back into \`fleet_direction\` to remember it next frame.
- \`for enemy in enemies: enemy.draw(screen)\` — one short loop replaces what would otherwise be 18 separate \`draw()\` calls.

## Build Instructions

1. Continue inside the same Cosmic Defender project on Pickcode — Part 2 picks up exactly where Part 1 left off.
2. Add the new constants, the \`Enemy\` class, \`create_enemy_fleet()\`, and \`move_fleet()\` to your existing \`main.py\`.
3. Update \`main()\` as shown above — create the fleet, track \`fleet_direction\`, call \`move_fleet()\`, and draw every enemy.
4. Run the game and confirm your ship still moves exactly as before, and that 18 red enemies now march across the screen as a group, dropping down and reversing direction at each edge.

## Student Mission

1. Change \`ENEMY_ROWS\` and \`ENEMY_COLS\` to different numbers (try \`2\` and \`8\`) and observe how the fleet's shape changes.
2. Change \`ENEMY_SPEED\` to make the fleet march faster or slower.
3. Change \`ENEMY_DROP\` to a much bigger number (like \`60\`) and watch how dramatically the fleet jumps down each time it hits an edge.

## Challenge

Give each *row* of the fleet a slightly different color (for example, the top row red, the middle row orange, the bottom row yellow) by passing a \`row\` number into \`Enemy.__init__\` and picking a color based on it inside \`draw()\`. This is good practice for passing extra information into an object's constructor.

## Common Mistakes

- **Forgetting to return \`direction\` from \`move_fleet\`** — since numbers passed into functions don't change outside the function automatically, forgetting the \`return\` (and forgetting to store it back in \`main()\`) means the fleet will never actually reverse.
- **Checking the edge condition only once instead of for every enemy** — if you check just \`enemies[0]\` instead of looping through all of them, enemies on the far side of the fleet can silently go off-screen before the fleet reacts.
- **Mixing up \`row\`/\`col\` order in the spacing math** — swapping \`start_x + col * spacing_x\` for \`start_x + row * spacing_x\` will stack enemies in a diagonal line instead of a grid.
- **Forgetting \`enemy.width\` in the right-edge check** — checking \`enemy.x >= SCREEN_WIDTH\` instead of \`enemy.x + enemy.width >= SCREEN_WIDTH\` lets part of the enemy hang off the edge before the fleet reacts.

## Debugging Tips

- If enemies overlap each other, double-check your \`spacing_x\`/\`spacing_y\` values are bigger than \`enemy.width\`/\`enemy.height\`.
- If the fleet never reverses, add a temporary \`print(edge_hit)\` inside \`move_fleet\` right before the \`if edge_hit:\` line to confirm it's actually becoming \`True\`.
- If only *some* enemies move, check that your drawing loop uses \`for enemy in enemies:\` and not a leftover single \`enemy.draw(screen)\` call referring to just one object.
- Count the printed length of your list (\`print(len(enemies))\`) if the fleet looks smaller than expected — it should always equal \`ENEMY_ROWS * ENEMY_COLS\`.

## Check Your Understanding

- Why is a Python list a better way to manage 18 enemies than 18 separate variables?
- In your own words, what job does the *outer* loop do in \`create_enemy_fleet()\`, and what job does the *inner* loop do?
- Why does \`move_fleet\` need to \`return\` the direction instead of just changing it directly?

## Mini Quiz

1. What does a nested loop let you do?
   a) Run two programs at once  b) Repeat an inner loop fully for every value of an outer loop, covering a grid  c) Make a loop run forever  d) Skip every other repetition

2. Why does \`Enemy\` have a \`draw()\` method but no \`move()\` method of its own?
   a) Enemies never move  b) The fleet moves every enemy together through \`move_fleet\`, rather than each enemy moving itself  c) It's a mistake that will be fixed later  d) \`Enemy\` inherits \`move()\` from \`Player\`

3. What does \`direction *= -1\` do?
   a) Doubles the direction  b) Resets direction to 0  c) Flips the direction's sign (1 becomes -1, and -1 becomes 1)  d) Has no effect

4. If \`ENEMY_ROWS = 3\` and \`ENEMY_COLS = 6\`, how many \`Enemy\` objects does \`create_enemy_fleet()\` return?
   a) 3  b) 6  c) 9  d) 18

5. Why must \`move_fleet\` \`return\` the updated direction instead of just modifying it inside the function?
   a) Python requires every function to return something  b) Plain numbers passed into a function don't change outside it unless you return the new value and store it  c) It's purely a style preference  d) \`direction\` is a global variable

6. (Code reading) If every enemy's \`edge_hit\` check is \`False\` this frame, what happens to \`direction\`?
   a) It becomes 0  b) It flips sign  c) It stays exactly the same  d) It becomes \`None\`

### Answer Key

1. b — repeats the inner loop fully for every value of the outer loop
2. b — the fleet moves every enemy together through \`move_fleet\`
3. c — flips the direction's sign
4. d — 18
5. b — plain numbers don't change outside a function unless you return and store the new value
6. c — stays exactly the same

## Lesson Recap

Today your lone ship got real company: a full 18-enemy fleet, built with a nested loop and managed as a single Python list, moving and reversing direction together using a group-decision function. Your \`Player\` class from Part 1 didn't change at all — you only ever added new code alongside it, which is exactly the pattern you'll keep following for the rest of this project.

## Homework / Practice Mission

Using only what you learned today (lists, nested loops, and group movement — no shooting or scoring yet), change the fleet's formation from a rectangle into a V-shape: for each row, reduce the number of enemies and shift the starting \`x\` further right as the row number increases, so the fleet looks like a wedge instead of a block. Confirm the fleet still marches and reverses direction correctly in its new shape.

## Portfolio Project Connection

The \`Enemy\` class and the enemy fleet you built today will stay in Cosmic Defender for the rest of the course — next lesson, you'll give your ship something to do about them: lasers.`,
    codeSnippets: [
      {
        label: `Cosmic Defender — Part 2 Code (main.py)`,
        language: 'python',
        part: 'reference',
        code: `# Cosmic Defender - Part 2: Enemy Fleet
# Advanced Data Science - Lesson 12
# Builds on Part 1 (Player & Game Window) - nothing from Part 1 is removed.

import sys
import pygame

# --- Constants ---
SCREEN_WIDTH = 800
SCREEN_HEIGHT = 600
FPS = 60

PLAYER_SPEED = 6

# NEW: enemy fleet constants
ENEMY_SPEED = 2
ENEMY_DROP = 20
ENEMY_ROWS = 3
ENEMY_COLS = 6

BLACK = (10, 10, 30)
CYAN = (0, 255, 255)
RED = (255, 60, 60)

# --- Pygame setup ---
pygame.init()
screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
pygame.display.set_caption("Cosmic Defender")
clock = pygame.time.Clock()


class Player:
    """The player's spaceship. (Unchanged from Part 1.)"""

    def __init__(self):
        self.width = 50
        self.height = 40
        self.x = SCREEN_WIDTH // 2 - self.width // 2
        self.y = SCREEN_HEIGHT - self.height - 20
        self.speed = PLAYER_SPEED

    def move(self, keys):
        if keys[pygame.K_LEFT] or keys[pygame.K_a]:
            self.x -= self.speed
        if keys[pygame.K_RIGHT] or keys[pygame.K_d]:
            self.x += self.speed

        if self.x < 0:
            self.x = 0
        if self.x > SCREEN_WIDTH - self.width:
            self.x = SCREEN_WIDTH - self.width

    def draw(self, surface):
        points = [
            (self.x + self.width // 2, self.y),
            (self.x, self.y + self.height),
            (self.x + self.width, self.y + self.height),
        ]
        pygame.draw.polygon(surface, CYAN, points)


# NEW: Enemy class
class Enemy:
    """One enemy ship in the fleet."""

    def __init__(self, x, y):
        self.width = 40
        self.height = 30
        self.x = x
        self.y = y

    def draw(self, surface):
        pygame.draw.rect(surface, RED, (self.x, self.y, self.width, self.height))


# NEW: build a grid of enemies
def create_enemy_fleet():
    """Create a grid of enemies (rows x cols) with even spacing."""
    enemies = []
    spacing_x = 90
    spacing_y = 70
    start_x = 60
    start_y = 50
    for row in range(ENEMY_ROWS):
        for col in range(ENEMY_COLS):
            x = start_x + col * spacing_x
            y = start_y + row * spacing_y
            enemies.append(Enemy(x, y))
    return enemies


# NEW: move the whole fleet together, bouncing off the screen edges
def move_fleet(enemies, direction):
    """Move every enemy sideways. If any enemy touches an edge, drop the
    whole fleet down a row and reverse direction (classic arcade style)."""
    edge_hit = False
    for enemy in enemies:
        enemy.x += ENEMY_SPEED * direction
        if enemy.x <= 0 or enemy.x + enemy.width >= SCREEN_WIDTH:
            edge_hit = True

    if edge_hit:
        for enemy in enemies:
            enemy.y += ENEMY_DROP
        direction *= -1

    return direction


def main():
    player = Player()
    enemies = create_enemy_fleet()  # NEW
    fleet_direction = 1  # NEW: 1 = moving right, -1 = moving left
    running = True

    while running:
        clock.tick(FPS)

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False

        keys = pygame.key.get_pressed()
        player.move(keys)
        fleet_direction = move_fleet(enemies, fleet_direction)  # NEW

        screen.fill(BLACK)
        player.draw(screen)
        for enemy in enemies:  # NEW
            enemy.draw(screen)
        pygame.display.flip()

    pygame.quit()
    sys.exit()


if __name__ == "__main__":
    main()`,
      },
    ],
    projectLinks: [
      {
        title: `Cosmic Defender v2`,
        url: `https://app.pickcode.io/project/cmw00ohhd07u5m3aliuwf27jl`,
      },
    ],
  },

  {
    order: 13,
    matchTitle: `Collision Detection`,
    title: `Cosmic Defender — Part 3: Lasers & Shooting`,
    objectives: [
      `Create a new object in response to a single key press (not a held-down key) using a \`pygame.KEYDOWN\` event.`,
      `Explain the difference between checking \`pygame.key.get_pressed()\` (held down) and reacting to a \`KEYDOWN\` event (pressed once).`,
      `Add new objects to a list while the game is running, not just when it starts.`,
      `Remove objects from a list once they're no longer needed, using a list comprehension.`,
      `Explain why cleaning up off-screen objects matters for a game's performance.`,
    ],
    homework: `Using only what you learned today (spawning on a \`KEYDOWN\` event and cleaning up with a list comprehension — no collision detection or scoring yet), add a second weapon: pressing a different key (try \`pygame.K_LSHIFT\`) spawns two bullets at once, slightly left and right of center, instead of one. Confirm both new bullets move and clean themselves up correctly, exactly like the original single bullet.`,
    checkpoint: `Run main.py and show the ship firing a yellow bullet on each space-bar tap, with bullets disappearing cleanly once they scroll off-screen.`,
    contentMarkdown: `# Advanced Data Science — Lesson 13: Cosmic Defender — Part 3: Lasers & Shooting

**Course/Path:** Cosmic Defender (6-Part Pygame Project)
**Lesson:** 04 of 08
**Title:** Cosmic Defender — Part 3: Lasers & Shooting
**Duration:** 60 minutes
**Difficulty:** Beginner
**Technology:** Python 3.10+, Pygame

---

## Mission Brief

Cadet, weapons systems are finally online. Your ship can fly and the enemy fleet can march — but right now, neither one can actually do anything *to* the other. Today you give your ship a laser cannon: press the space bar, and a glowing bolt streaks upward from your ship. You'll also solve a problem every shooting game has to solve — what happens to a bullet once it flies off the top of the screen forever? If you don't clean it up, your game slowly fills up with invisible, forgotten bullets until it crawls to a halt. Today's lesson is about creating things on demand, and cleaning up after them responsibly.

## Learning Objectives

By the end of this lesson, you will be able to:

1. Create a new object in response to a single key *press* (not a held-down key) using a \`pygame.KEYDOWN\` event.
2. Explain the difference between checking \`pygame.key.get_pressed()\` (held down) and reacting to a \`KEYDOWN\` event (pressed once).
3. Add new objects to a list while the game is running, not just when it starts.
4. Remove objects from a list once they're no longer needed, using a list comprehension.
5. Explain why cleaning up off-screen objects matters for a game's performance.

## What You'll Build

**Cosmic Defender v3 — Lasers & Shooting.** Everything from Part 2 (ship, enemy fleet) plus a working laser cannon: tap the space bar and a small yellow bullet appears at your ship's position and flies straight up at a steady speed, automatically disappearing once it scrolls off the top of the screen.

## Prerequisites

- Completion of Lesson 12 (Cosmic Defender Part 2) — you should have a working \`main.py\` with a player and a marching enemy fleet.
- Comfortable with Python list comprehensions, or willing to learn the pattern today (we explain it fully below).

## Key Terminology

| Term | Definition |
|---|---|
| **\`KEYDOWN\` Event** | A one-time event fired the instant a key is first pressed down — different from \`get_pressed()\`, which reports every single frame that a key is *still* held. |
| **Spawning** | Creating a brand-new object while the game is already running (as opposed to only creating objects once, before the loop starts). |
| **Off-Screen Check** | A method that reports whether an object has moved past the edge of the visible screen. |
| **List Comprehension** | A compact Python way to build a new, filtered list from an old one in a single line: \`[item for item in old_list if condition]\`. |
| **Cleanup / Garbage Collection (by hand)** | Removing objects your game no longer needs so the list of "things to update and draw" doesn't grow forever. |

## Concept Explanation

So far, every object in Cosmic Defender has been created once, before the game loop even starts: one player, 18 enemies. But a laser cannon is different — you don't know in advance how many bullets will exist, because that depends entirely on how often the player presses the space bar. This is called **spawning**: creating a new object *while the game is running*, in reaction to something the player does, and adding it to a list that already has other objects in it.

To detect "the space bar was just pressed," we need something new: a **\`KEYDOWN\` event**. You've already used \`pygame.key.get_pressed()\` to check "is this key currently being held down right now" — that's perfect for smooth movement, but terrible for shooting, because if you fired a new bullet on every single frame the space bar was held, you'd spawn 60 bullets a second. A \`KEYDOWN\` event fires exactly once, at the exact moment a key goes from "up" to "down" — exactly what shooting needs.

Every bullet you spawn also needs to disappear eventually. If you never removed old bullets, your \`bullets\` list would grow forever — after a minute of enthusiastic shooting, your game could be tracking thousands of invisible bullets far above the screen, each one still being checked and moved every frame, slowly grinding your game to a halt. The fix is a **list comprehension**: \`bullets = [b for b in bullets if not b.is_off_screen()]\` builds a brand-new list containing only the bullets that *should* survive, in one line, every single frame.

## How This Shows Up in Cosmic Defender

The new \`Bullet\` class is the simplest class in the whole project so far: just a position, a size, a speed, a \`move()\` method that subtracts from \`self.y\` every frame (moving *up* the screen), a \`draw()\` method, and an \`is_off_screen()\` method that returns \`True\` once the bullet's bottom edge has scrolled above \`y = 0\`. Inside \`main()\`'s event loop, alongside the existing \`pygame.QUIT\` check, there's now a check for \`event.type == pygame.KEYDOWN\` combined with \`event.key == pygame.K_SPACE\` — the instant that's true, a brand-new \`Bullet\` is created at the ship's current position and \`.append()\`-ed onto the \`bullets\` list. Every frame, every bullet in the list moves upward, and then the list comprehension rebuilds \`bullets\` to drop any that have gone off-screen — all *before* drawing, so the screen never shows a bullet that's about to vanish.

## What Changed From Part 2

- **NEW** — \`BULLET_SPEED\` constant and a \`YELLOW\` color for the lasers.
- **NEW** — the \`Bullet\` class, with \`move()\`, \`draw()\`, and \`is_off_screen()\`.
- **NEW** — a \`bullets\` list in \`main()\`, starting empty, that grows as the player shoots.
- **NEW** — off-screen cleanup using a list comprehension, run every frame right after moving the bullets.
- **MODIFIED** — the event loop inside \`main()\` now also checks for \`pygame.KEYDOWN\` with \`event.key == pygame.K_SPACE\`, in addition to the existing \`pygame.QUIT\` check, to spawn a new bullet.
- **MODIFIED** — the drawing section now also loops over \`bullets\` and draws each one, after the player and the enemies.
- **REMOVED** — nothing. The \`Player\`, \`Enemy\`, \`create_enemy_fleet()\`, and \`move_fleet()\` code from Parts 1 and 2 are all still here, completely unchanged.

## Guided Coding

Here is the complete, current version of \`main.py\`, with everything from Parts 1 and 2 still intact:

\`\`\`python
# Cosmic Defender - Part 3: Lasers & Shooting
# Advanced Data Science - Lesson 13
# Builds on Part 2 (Player & Game Window + Enemy Fleet) - nothing removed.

import sys
import pygame

# --- Constants ---
SCREEN_WIDTH = 800
SCREEN_HEIGHT = 600
FPS = 60

PLAYER_SPEED = 6

ENEMY_SPEED = 2
ENEMY_DROP = 20
ENEMY_ROWS = 3
ENEMY_COLS = 6

# NEW: bullet constants
BULLET_SPEED = 10

BLACK = (10, 10, 30)
CYAN = (0, 255, 255)
RED = (255, 60, 60)
YELLOW = (255, 255, 0)

# --- Pygame setup ---
pygame.init()
screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
pygame.display.set_caption("Cosmic Defender")
clock = pygame.time.Clock()


class Player:
    """The player's spaceship. (Unchanged from Part 1/2.)"""

    def __init__(self):
        self.width = 50
        self.height = 40
        self.x = SCREEN_WIDTH // 2 - self.width // 2
        self.y = SCREEN_HEIGHT - self.height - 20
        self.speed = PLAYER_SPEED

    def move(self, keys):
        if keys[pygame.K_LEFT] or keys[pygame.K_a]:
            self.x -= self.speed
        if keys[pygame.K_RIGHT] or keys[pygame.K_d]:
            self.x += self.speed

        if self.x < 0:
            self.x = 0
        if self.x > SCREEN_WIDTH - self.width:
            self.x = SCREEN_WIDTH - self.width

    def draw(self, surface):
        points = [
            (self.x + self.width // 2, self.y),
            (self.x, self.y + self.height),
            (self.x + self.width, self.y + self.height),
        ]
        pygame.draw.polygon(surface, CYAN, points)


class Enemy:
    """One enemy ship in the fleet. (Unchanged from Part 2.)"""

    def __init__(self, x, y):
        self.width = 40
        self.height = 30
        self.x = x
        self.y = y

    def draw(self, surface):
        pygame.draw.rect(surface, RED, (self.x, self.y, self.width, self.height))


def create_enemy_fleet():
    enemies = []
    spacing_x = 90
    spacing_y = 70
    start_x = 60
    start_y = 50
    for row in range(ENEMY_ROWS):
        for col in range(ENEMY_COLS):
            x = start_x + col * spacing_x
            y = start_y + row * spacing_y
            enemies.append(Enemy(x, y))
    return enemies


def move_fleet(enemies, direction):
    edge_hit = False
    for enemy in enemies:
        enemy.x += ENEMY_SPEED * direction
        if enemy.x <= 0 or enemy.x + enemy.width >= SCREEN_WIDTH:
            edge_hit = True

    if edge_hit:
        for enemy in enemies:
            enemy.y += ENEMY_DROP
        direction *= -1

    return direction


# NEW: Bullet class
class Bullet:
    """A laser bullet fired by the player, travelling straight up."""

    def __init__(self, x, y):
        self.width = 4
        self.height = 12
        self.x = x
        self.y = y
        self.speed = BULLET_SPEED

    def move(self):
        self.y -= self.speed

    def draw(self, surface):
        pygame.draw.rect(surface, YELLOW, (self.x, self.y, self.width, self.height))

    def is_off_screen(self):
        """True once the bullet has scrolled past the top of the screen."""
        return self.y + self.height < 0


def main():
    player = Player()
    enemies = create_enemy_fleet()
    fleet_direction = 1
    bullets = []  # NEW: every laser currently on screen
    running = True

    while running:
        clock.tick(FPS)

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            # NEW: fire a bullet each time SPACE is pressed
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_SPACE:
                    bullet_x = player.x + player.width // 2 - 2
                    bullet_y = player.y
                    bullets.append(Bullet(bullet_x, bullet_y))

        keys = pygame.key.get_pressed()
        player.move(keys)
        fleet_direction = move_fleet(enemies, fleet_direction)

        # NEW: move every bullet, then drop any that scrolled off-screen
        for bullet in bullets:
            bullet.move()
        bullets = [b for b in bullets if not b.is_off_screen()]

        screen.fill(BLACK)
        player.draw(screen)
        for enemy in enemies:
            enemy.draw(screen)
        for bullet in bullets:  # NEW
            bullet.draw(screen)
        pygame.display.flip()

    pygame.quit()
    sys.exit()


if __name__ == "__main__":
    main()
\`\`\`

## Code Walkthrough

- \`class Bullet:\` — just four pieces of data (\`x\`, \`y\`, \`width\`, \`height\`, \`speed\`) and three small methods; a deliberately simple class, since a bullet doesn't need to do much.
- \`def move(self): self.y -= self.speed\` — subtracting from \`y\` moves the bullet *up*, since Pygame's y-axis increases downward (y=0 is the top of the screen).
- \`def is_off_screen(self): return self.y + self.height < 0\` — checks whether the bullet's bottom edge is already above the very top of the screen; once true, this bullet has fully left the visible area.
- \`if event.type == pygame.KEYDOWN: if event.key == pygame.K_SPACE:\` — two separate checks: first "was any key just pressed," then "specifically, was it the space bar." This only runs once per press, no matter how long the key is held afterward.
- \`bullet_x = player.x + player.width // 2 - 2\` — centers the bullet horizontally on the ship: the middle of the ship, minus half the bullet's own width, so the bullet appears to fire straight out of the ship's nose.
- \`bullets.append(Bullet(bullet_x, bullet_y))\` — creates a brand-new \`Bullet\` object and adds it to the end of the list, all in one line.
- \`for bullet in bullets: bullet.move()\` then \`bullets = [b for b in bullets if not b.is_off_screen()]\` — notice these are two *separate* steps: first every bullet moves, *then* the list is filtered. Filtering first would check positions that hadn't been updated yet.
- \`bullets = [b for b in bullets if not b.is_off_screen()]\` — read aloud, this says "give me a new list of \`b\`, taken from the old \`bullets\`, for every \`b\` where \`not b.is_off_screen()\` (meaning: it's still on screen) is true." The bullets that fail the condition are simply left out.

## Build Instructions

1. Continue inside the same Cosmic Defender project on Pickcode — Part 3 builds directly on Part 2.
2. Add \`BULLET_SPEED\`, \`YELLOW\`, and the \`Bullet\` class to your existing \`main.py\`.
3. Add an empty \`bullets = []\` list in \`main()\`, the \`KEYDOWN\`/\`K_SPACE\` handling in the event loop, the per-frame move-and-filter steps, and the bullet-drawing loop.
4. Run the game, confirm the ship and enemy fleet still behave exactly as before, and that tapping space fires a yellow bullet that flies upward and vanishes cleanly once it's off-screen.

## Student Mission

1. Change \`BULLET_SPEED\` to see how a faster or slower laser changes the feel of shooting.
2. Change the bullet's color and size (\`self.width\`, \`self.height\`) to design your own laser look.
3. Add a \`print(len(bullets))\` right after the cleanup step, hold space for a few seconds, and watch the number in the console — confirm it stops growing once you let go and the existing bullets scroll off-screen, proving the cleanup is working.

## Challenge

Right now, holding space and tapping it rapidly feels different only because of how fast you can physically tap. Add a cooldown: track the number of frames since the last shot (a simple counter that increases every frame and resets to \`0\` whenever a bullet fires), and only allow a new bullet to spawn if that counter has reached some minimum value (like \`15\` frames) — this prevents firing a new bullet on literally every frame if you held space down and switched to checking it with \`get_pressed()\` instead of \`KEYDOWN\`.

## Common Mistakes

- **Using \`pygame.key.get_pressed()\` for shooting instead of a \`KEYDOWN\` event** — this fires a new bullet on *every single frame* the key is held, instantly flooding the screen with bullets.
- **Filtering the list before moving the bullets** — this checks \`is_off_screen()\` against last frame's position, so a bullet gets removed one frame later than it should (usually harmless, but worth understanding why order matters).
- **Forgetting to reassign \`bullets =\` when filtering** — writing \`[b for b in bullets if ...]\` without storing the result back into \`bullets\` builds a new list and then throws it away, leaving the old list completely unchanged.
- **Checking \`self.y < 0\` instead of \`self.y + self.height < 0\`** — this removes a bullet slightly too early, while part of it is technically still visible.

## Debugging Tips

- If no bullet appears when you press space, add a temporary \`print("fired!")\` right where the \`Bullet\` is created, to confirm the \`KEYDOWN\`/\`K_SPACE\` check is actually triggering.
- If bullets never disappear, print \`len(bullets)\` every frame and confirm the number eventually stops increasing — if it only ever grows, your list comprehension line is either missing or not being reassigned.
- If bullets appear in the wrong horizontal position, double check the centering math (\`player.x + player.width // 2 - bullet_half_width\`).
- If the game slows down over time, that's the exact "forgot to clean up" bug this lesson is about — check your cleanup line is actually inside the main loop, not accidentally placed outside it.

## Check Your Understanding

- What's the difference between \`pygame.key.get_pressed()\` and a \`pygame.KEYDOWN\` event, and why does shooting specifically need the second one?
- In your own words, explain what the list comprehension \`[b for b in bullets if not b.is_off_screen()]\` does.
- Why does moving every bullet need to happen *before* filtering out the off-screen ones, in that order?

## Mini Quiz

1. What is the key difference between \`get_pressed()\` and a \`KEYDOWN\` event?
   a) They are identical  b) \`get_pressed()\` fires once per press; \`KEYDOWN\` fires every frame a key is held  c) \`KEYDOWN\` fires once per press; \`get_pressed()\` reports every frame a key is held  d) Neither works for the space bar

2. Why does \`Bullet.move()\` subtract from \`self.y\` instead of adding?
   a) It's a typo  b) Pygame's y-axis increases downward, so subtracting moves the bullet up the screen  c) Bullets always move sideways  d) Subtraction is faster than addition

3. What does \`bullets = [b for b in bullets if not b.is_off_screen()]\` produce?
   a) The same list, unchanged  b) A new list containing only bullets still on screen  c) A new list containing only off-screen bullets  d) An empty list

4. Where should new-bullet creation be checked?
   a) Inside \`Player.move()\`  b) Inside the event loop, on a \`KEYDOWN\` event for \`K_SPACE\`  c) Once, before the game loop starts  d) Inside \`Enemy.draw()\`

5. What would happen if the game never removed off-screen bullets?
   a) Nothing, Pygame handles it automatically  b) The bullets list would grow forever, gradually slowing the game down  c) The game would crash immediately  d) The player would lose a life

6. (Code reading) If \`player.x = 100\` and \`player.width = 50\`, what is \`bullet_x\` using \`bullet_x = player.x + player.width // 2 - 2\`?
   a) 100  b) 123  c) 150  d) 148

### Answer Key

1. c — \`KEYDOWN\` fires once per press; \`get_pressed()\` reports every frame a key is held
2. b — Pygame's y-axis increases downward, so subtracting moves the bullet up
3. b — a new list containing only bullets still on screen
4. b — inside the event loop, on a \`KEYDOWN\` event for \`K_SPACE\`
5. b — the list would grow forever, gradually slowing the game down
6. b — 123 (100 + 25 - 2)

## Lesson Recap

Today your ship's laser cannon came online: a new object type spawned on demand in response to a one-time key event, tracked in a growing-and-shrinking list, and automatically cleaned up once it's no longer useful. The spawn-track-clean-up pattern you learned today — create on event, update every frame, filter out what's no longer needed — is one you'll reuse for the rest of your programming life, in Cosmic Defender and far beyond it.

## Homework / Practice Mission

Using only what you learned today (spawning on a \`KEYDOWN\` event and cleaning up with a list comprehension — no collision detection or scoring yet), add a second weapon: pressing a different key (try \`pygame.K_LSHIFT\`) spawns *two* bullets at once, slightly left and right of center, instead of one. Confirm both new bullets move and clean themselves up correctly, exactly like the original single bullet.

## Portfolio Project Connection

Your ship can now fly and shoot, and the enemy fleet can march — but nothing happens when they meet yet. Next lesson, you'll connect these two systems together with collision detection, turning your lasers into something that actually destroys enemies and earns points.`,
    codeSnippets: [
      {
        label: `Cosmic Defender — Part 3 Code (main.py)`,
        language: 'python',
        part: 'reference',
        code: `# Cosmic Defender - Part 3: Lasers & Shooting
# Advanced Data Science - Lesson 13
# Builds on Part 2 (Player & Game Window + Enemy Fleet) - nothing removed.

import sys
import pygame

# --- Constants ---
SCREEN_WIDTH = 800
SCREEN_HEIGHT = 600
FPS = 60

PLAYER_SPEED = 6

ENEMY_SPEED = 2
ENEMY_DROP = 20
ENEMY_ROWS = 3
ENEMY_COLS = 6

# NEW: bullet constants
BULLET_SPEED = 10

BLACK = (10, 10, 30)
CYAN = (0, 255, 255)
RED = (255, 60, 60)
YELLOW = (255, 255, 0)

# --- Pygame setup ---
pygame.init()
screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
pygame.display.set_caption("Cosmic Defender")
clock = pygame.time.Clock()


class Player:
    """The player's spaceship. (Unchanged from Part 1/2.)"""

    def __init__(self):
        self.width = 50
        self.height = 40
        self.x = SCREEN_WIDTH // 2 - self.width // 2
        self.y = SCREEN_HEIGHT - self.height - 20
        self.speed = PLAYER_SPEED

    def move(self, keys):
        if keys[pygame.K_LEFT] or keys[pygame.K_a]:
            self.x -= self.speed
        if keys[pygame.K_RIGHT] or keys[pygame.K_d]:
            self.x += self.speed

        if self.x < 0:
            self.x = 0
        if self.x > SCREEN_WIDTH - self.width:
            self.x = SCREEN_WIDTH - self.width

    def draw(self, surface):
        points = [
            (self.x + self.width // 2, self.y),
            (self.x, self.y + self.height),
            (self.x + self.width, self.y + self.height),
        ]
        pygame.draw.polygon(surface, CYAN, points)


class Enemy:
    """One enemy ship in the fleet. (Unchanged from Part 2.)"""

    def __init__(self, x, y):
        self.width = 40
        self.height = 30
        self.x = x
        self.y = y

    def draw(self, surface):
        pygame.draw.rect(surface, RED, (self.x, self.y, self.width, self.height))


def create_enemy_fleet():
    enemies = []
    spacing_x = 90
    spacing_y = 70
    start_x = 60
    start_y = 50
    for row in range(ENEMY_ROWS):
        for col in range(ENEMY_COLS):
            x = start_x + col * spacing_x
            y = start_y + row * spacing_y
            enemies.append(Enemy(x, y))
    return enemies


def move_fleet(enemies, direction):
    edge_hit = False
    for enemy in enemies:
        enemy.x += ENEMY_SPEED * direction
        if enemy.x <= 0 or enemy.x + enemy.width >= SCREEN_WIDTH:
            edge_hit = True

    if edge_hit:
        for enemy in enemies:
            enemy.y += ENEMY_DROP
        direction *= -1

    return direction


# NEW: Bullet class
class Bullet:
    """A laser bullet fired by the player, travelling straight up."""

    def __init__(self, x, y):
        self.width = 4
        self.height = 12
        self.x = x
        self.y = y
        self.speed = BULLET_SPEED

    def move(self):
        self.y -= self.speed

    def draw(self, surface):
        pygame.draw.rect(surface, YELLOW, (self.x, self.y, self.width, self.height))

    def is_off_screen(self):
        """True once the bullet has scrolled past the top of the screen."""
        return self.y + self.height < 0


def main():
    player = Player()
    enemies = create_enemy_fleet()
    fleet_direction = 1
    bullets = []  # NEW: every laser currently on screen
    running = True

    while running:
        clock.tick(FPS)

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            # NEW: fire a bullet each time SPACE is pressed
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_SPACE:
                    bullet_x = player.x + player.width // 2 - 2
                    bullet_y = player.y
                    bullets.append(Bullet(bullet_x, bullet_y))

        keys = pygame.key.get_pressed()
        player.move(keys)
        fleet_direction = move_fleet(enemies, fleet_direction)

        # NEW: move every bullet, then drop any that scrolled off-screen
        for bullet in bullets:
            bullet.move()
        bullets = [b for b in bullets if not b.is_off_screen()]

        screen.fill(BLACK)
        player.draw(screen)
        for enemy in enemies:
            enemy.draw(screen)
        for bullet in bullets:  # NEW
            bullet.draw(screen)
        pygame.display.flip()

    pygame.quit()
    sys.exit()


if __name__ == "__main__":
    main()`,
      },
    ],
    projectLinks: [
      {
        title: `Cosmic Defender v3`,
        url: `https://app.pickcode.io/project/cmw00r2sl0c6b31zlzns5r0cl`,
      },
    ],
  },

  {
    order: 14,
    matchTitle: `Enemies, AI Behavior, and Scoring`,
    title: `Cosmic Defender — Part 4: Combat & Scoring`,
    objectives: [
      `Use \`pygame.Rect\` and \`.colliderect()\` to detect whether two objects are overlapping.`,
      `Write a function that checks every bullet against every enemy and resolves any hits it finds.`,
      `Track a running score as a plain integer variable and display it on screen using \`pygame.font\`.`,
      `Render text onto the screen with \`font.render()\` and \`surface.blit()\`.`,
      `Detect an empty list (\`if not enemies:\`) and use it to trigger a new wave of enemies.`,
    ],
    homework: `Using only what you learned today (collision detection and score display — no health or game-over logic yet), add a visible "Enemies Remaining: N" counter next to the score, using \`len(enemies)\` and a second \`font.render()\` call. Confirm the number correctly counts down as you destroy enemies and resets to 18 every time a new wave spawns.`,
    checkpoint: `Run main.py and show bullets destroying enemies, the score increasing by 10 per hit, and a fresh wave spawning automatically once a wave is cleared.`,
    contentMarkdown: `# Advanced Data Science — Lesson 14: Cosmic Defender — Part 4: Combat & Scoring

**Course/Path:** Cosmic Defender (6-Part Pygame Project)
**Lesson:** 05 of 08
**Title:** Cosmic Defender — Part 4: Combat & Scoring
**Duration:** 60 minutes
**Difficulty:** Beginner
**Technology:** Python 3.10+, Pygame

---

## Mission Brief

Cadet, today your lasers finally connect with their targets. So far your bullets have flown straight through the enemy fleet as if they weren't even there — today you teach the game to notice when a bullet and an enemy occupy the same space, destroy both of them, and reward the player with points. You'll also solve a problem every shooter eventually runs into: what happens when the player wipes out the *entire* fleet? Today, a fresh wave flies in to keep the mission going.

## Learning Objectives

By the end of this lesson, you will be able to:

1. Use \`pygame.Rect\` and \`.colliderect()\` to detect whether two objects are overlapping.
2. Write a function that checks every bullet against every enemy and resolves any hits it finds.
3. Track a running score as a plain integer variable and display it on screen using \`pygame.font\`.
4. Render text onto the screen with \`font.render()\` and \`surface.blit()\`.
5. Detect an empty list (\`if not enemies:\`) and use it to trigger a new wave of enemies.

## What You'll Build

**Cosmic Defender v4 — Combat & Scoring.** Everything from Part 3 (ship, fleet, lasers) plus real combat: bullets that destroy any enemy they touch, a running score displayed in the corner of the screen that goes up by 10 for every enemy destroyed, and an endless supply of enemies — a brand-new wave flies in automatically the instant the current one is wiped out.

## Prerequisites

- Completion of Lesson 13 (Cosmic Defender Part 3) — you should have a working \`main.py\` with shooting and off-screen bullet cleanup.
- Comfortable with Python lists and functions that return more than one value (\`return a, b\`).

## Key Terminology

| Term | Definition |
|---|---|
| **\`pygame.Rect\`** | A rectangle object (position + size) that Pygame can check for overlap against other rectangles — the standard way to represent "the space this object occupies." |
| **\`.colliderect()\`** | A \`Rect\` method that returns \`True\` if two rectangles overlap at all, \`False\` otherwise. |
| **Collision Detection** | The general idea of checking whether two objects' shapes overlap, used for everything from bullet hits to walking into a wall. |
| **\`pygame.font\`** | Pygame's text-drawing system — turns a string into an image (\`font.render()\`) that can then be drawn like anything else. |
| **Wave / Respawn** | Creating a brand-new batch of enemies once the previous batch has been fully destroyed, so the game never simply "runs out" of things to shoot. |

## Concept Explanation

Up to now, bullets and enemies have been completely unaware of each other — they just happened to occupy the same window. **Collision detection** is how we teach the game to actually notice when two things are in the same place. Pygame makes this easy with \`pygame.Rect\`, a simple rectangle built from an x, a y, a width, and a height. Every \`Rect\` has a \`.colliderect(other_rect)\` method that answers one yes/no question: "does this rectangle overlap that one, even a little?" We give both \`Bullet\` and \`Enemy\` a \`get_rect()\` method that builds a fresh \`Rect\` from their current position every time it's needed, so the collision check is always based on where they are *right now*, not where they started.

Checking collisions between bullets and enemies means comparing *every bullet* against *every enemy* — a nested loop again, just like building the fleet, except this time it's a search instead of a construction. The moment a match is found, both objects are removed, and the score goes up.

**Score** is refreshingly simple: just one integer variable that starts at \`0\` and increases by a fixed amount (\`POINTS_PER_ENEMY\`) every time an enemy is destroyed. The only new idea is *showing* that number on screen, which needs \`pygame.font\`: you create a font once with \`pygame.font.SysFont(None, 32)\`, then every frame call \`font.render("Score: 10", True, WHITE)\` to turn that text into a drawable image, and \`surface.blit()\` to actually paint it onto the screen, exactly like drawing a shape.

Finally, **wave respawn** uses a check you've already seen in a different context — \`if not enemies:\` is \`True\` exactly when the list is empty (Python treats an empty list as "falsy"). The instant the fleet's list becomes empty, we simply call \`create_enemy_fleet()\` again and the mission continues.

## How This Shows Up in Cosmic Defender

\`Player\`, \`Enemy\`, and \`Bullet\` each gain a \`get_rect()\` method that returns \`pygame.Rect(self.x, self.y, self.width, self.height)\` — a fresh rectangle matching their current position and size. The new \`handle_collisions(bullets, enemies, score)\` function loops through every bullet, and for each one, loops through every enemy checking \`bullet.get_rect().colliderect(enemy.get_rect())\`; the first match it finds is removed from the \`enemies\` list, \`POINTS_PER_ENEMY\` is added to \`score\`, and that bullet is *not* kept in the surviving-bullets list being built. Bullets that hit nothing are kept exactly as before. \`main()\` calls this function every frame and stores both return values back into \`bullets\` and \`score\`. A new \`draw_score()\` function handles the text display, and a one-line check, \`if not enemies: enemies = create_enemy_fleet()\`, keeps fresh waves coming.

## What Changed From Part 3

- **NEW** — \`POINTS_PER_ENEMY\` constant and a \`WHITE\` color for the score text.
- **NEW** — a \`pygame.font.SysFont\` font object, created once near the top of the file.
- **NEW** — \`get_rect()\` methods on \`Player\`, \`Enemy\`, and \`Bullet\`, used for collision checks.
- **NEW** — \`handle_collisions(bullets, enemies, score)\`, which checks every bullet against every enemy, removes any matched pair, and returns the updated bullets list and score.
- **NEW** — \`draw_score(surface, score)\`, which renders the current score as text in the top-left corner.
- **NEW** — wave-respawn logic: \`if not enemies: enemies = create_enemy_fleet()\`.
- **MODIFIED** — \`main()\` now tracks a \`score\` variable, calls \`handle_collisions()\` every frame, checks for an empty fleet, and calls \`draw_score()\` during drawing.
- **REMOVED** — nothing. The \`Player\`, \`Enemy\`, \`Bullet\`, fleet movement, and shooting code from Parts 1–3 are all still here, completely unchanged in behavior.

## Guided Coding

Here is the complete, current version of \`main.py\`, with everything from Parts 1–3 still intact:

\`\`\`python
# Cosmic Defender - Part 4: Combat & Scoring
# Advanced Data Science - Lesson 14
# Builds on Part 3 (Player, Enemy Fleet, Lasers & Shooting) - nothing removed.

import sys
import pygame

# --- Constants ---
SCREEN_WIDTH = 800
SCREEN_HEIGHT = 600
FPS = 60

PLAYER_SPEED = 6

ENEMY_SPEED = 2
ENEMY_DROP = 20
ENEMY_ROWS = 3
ENEMY_COLS = 6

BULLET_SPEED = 10

# NEW: scoring
POINTS_PER_ENEMY = 10

BLACK = (10, 10, 30)
CYAN = (0, 255, 255)
RED = (255, 60, 60)
YELLOW = (255, 255, 0)
WHITE = (255, 255, 255)

# --- Pygame setup ---
pygame.init()
screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
pygame.display.set_caption("Cosmic Defender")
clock = pygame.time.Clock()
font = pygame.font.SysFont(None, 32)  # NEW: for drawing the score


class Player:
    """The player's spaceship. (Unchanged.)"""

    def __init__(self):
        self.width = 50
        self.height = 40
        self.x = SCREEN_WIDTH // 2 - self.width // 2
        self.y = SCREEN_HEIGHT - self.height - 20
        self.speed = PLAYER_SPEED

    def move(self, keys):
        if keys[pygame.K_LEFT] or keys[pygame.K_a]:
            self.x -= self.speed
        if keys[pygame.K_RIGHT] or keys[pygame.K_d]:
            self.x += self.speed

        if self.x < 0:
            self.x = 0
        if self.x > SCREEN_WIDTH - self.width:
            self.x = SCREEN_WIDTH - self.width

    def get_rect(self):  # NEW: needed for collision checks
        return pygame.Rect(self.x, self.y, self.width, self.height)

    def draw(self, surface):
        points = [
            (self.x + self.width // 2, self.y),
            (self.x, self.y + self.height),
            (self.x + self.width, self.y + self.height),
        ]
        pygame.draw.polygon(surface, CYAN, points)


class Enemy:
    """One enemy ship in the fleet. (Unchanged.)"""

    def __init__(self, x, y):
        self.width = 40
        self.height = 30
        self.x = x
        self.y = y

    def get_rect(self):  # NEW: needed for collision checks
        return pygame.Rect(self.x, self.y, self.width, self.height)

    def draw(self, surface):
        pygame.draw.rect(surface, RED, (self.x, self.y, self.width, self.height))


def create_enemy_fleet():
    enemies = []
    spacing_x = 90
    spacing_y = 70
    start_x = 60
    start_y = 50
    for row in range(ENEMY_ROWS):
        for col in range(ENEMY_COLS):
            x = start_x + col * spacing_x
            y = start_y + row * spacing_y
            enemies.append(Enemy(x, y))
    return enemies


def move_fleet(enemies, direction):
    edge_hit = False
    for enemy in enemies:
        enemy.x += ENEMY_SPEED * direction
        if enemy.x <= 0 or enemy.x + enemy.width >= SCREEN_WIDTH:
            edge_hit = True

    if edge_hit:
        for enemy in enemies:
            enemy.y += ENEMY_DROP
        direction *= -1

    return direction


class Bullet:
    """A laser bullet fired by the player, travelling straight up. (Unchanged.)"""

    def __init__(self, x, y):
        self.width = 4
        self.height = 12
        self.x = x
        self.y = y
        self.speed = BULLET_SPEED

    def move(self):
        self.y -= self.speed

    def get_rect(self):  # NEW: needed for collision checks
        return pygame.Rect(self.x, self.y, self.width, self.height)

    def draw(self, surface):
        pygame.draw.rect(surface, YELLOW, (self.x, self.y, self.width, self.height))

    def is_off_screen(self):
        return self.y + self.height < 0


# NEW: check every bullet against every enemy and resolve hits
def handle_collisions(bullets, enemies, score):
    """Remove any bullet/enemy pair that touches. Return the updated score."""
    surviving_bullets = []
    for bullet in bullets:
        hit_enemy = None
        for enemy in enemies:
            if bullet.get_rect().colliderect(enemy.get_rect()):
                hit_enemy = enemy
                break
        if hit_enemy is not None:
            enemies.remove(hit_enemy)
            score += POINTS_PER_ENEMY
        else:
            surviving_bullets.append(bullet)
    return surviving_bullets, score


def draw_score(surface, score):
    """NEW: show the current score in the top-left corner."""
    text = font.render(f"Score: {score}", True, WHITE)
    surface.blit(text, (10, 10))


def main():
    player = Player()
    enemies = create_enemy_fleet()
    fleet_direction = 1
    bullets = []
    score = 0  # NEW
    running = True

    while running:
        clock.tick(FPS)

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_SPACE:
                    bullet_x = player.x + player.width // 2 - 2
                    bullet_y = player.y
                    bullets.append(Bullet(bullet_x, bullet_y))

        keys = pygame.key.get_pressed()
        player.move(keys)
        fleet_direction = move_fleet(enemies, fleet_direction)

        for bullet in bullets:
            bullet.move()
        bullets = [b for b in bullets if not b.is_off_screen()]

        # NEW: resolve laser hits and award points
        bullets, score = handle_collisions(bullets, enemies, score)

        # NEW: when the whole fleet is destroyed, send in a fresh wave
        if not enemies:
            enemies = create_enemy_fleet()

        screen.fill(BLACK)
        player.draw(screen)
        for enemy in enemies:
            enemy.draw(screen)
        for bullet in bullets:
            bullet.draw(screen)
        draw_score(screen, score)  # NEW
        pygame.display.flip()

    pygame.quit()
    sys.exit()


if __name__ == "__main__":
    main()
\`\`\`

## Code Walkthrough

- \`def get_rect(self): return pygame.Rect(self.x, self.y, self.width, self.height)\` — appears on three different classes with identical logic; a small amount of repeated code here keeps each class simple and independent.
- \`def handle_collisions(bullets, enemies, score):\` — notice it takes \`score\` *in* as a parameter and returns an updated version, following the exact same "functions don't change their arguments permanently, so return the new value" rule you learned with \`move_fleet\`'s \`direction\`.
- \`hit_enemy = None\` then the inner \`for enemy in enemies:\` loop with \`break\` — stops checking further enemies the instant one match is found for this bullet, since one bullet can't hit two enemies at once.
- \`enemies.remove(hit_enemy)\` — removes one specific object from a list by value (not by index), which only works cleanly because \`hit_enemy\` is a reference to one exact object in the list.
- \`surviving_bullets.append(bullet)\` inside the \`else\` branch — only bullets that *didn't* hit anything get carried into next frame's list; a bullet that scored a hit simply isn't added, which is how it "disappears."
- \`font = pygame.font.SysFont(None, 32)\` — created once, outside \`main()\`, because creating a font object is relatively slow; reusing the same one every frame (just calling \`.render()\` on it repeatedly) is the efficient pattern.
- \`text = font.render(f"Score: {score}", True, WHITE)\` then \`surface.blit(text, (10, 10))\` — \`render()\` turns a string into an image-like \`Surface\`; \`blit()\` is the general Pygame word for "stamp this image onto that surface at this position," the same operation used for drawing sprites with actual picture files.
- \`if not enemies: enemies = create_enemy_fleet()\` — reuses the exact same function from Part 2 to build a brand-new wave; nothing about \`create_enemy_fleet()\` itself needed to change.

## Build Instructions

1. Continue inside the same Cosmic Defender project on Pickcode — Part 4 builds directly on Part 3.
2. Add \`POINTS_PER_ENEMY\`, \`WHITE\`, the font setup, the three \`get_rect()\` methods, \`handle_collisions()\`, and \`draw_score()\` to your existing \`main.py\`.
3. Update \`main()\` to track \`score\`, call \`handle_collisions()\`, check for an empty fleet, and draw the score.
4. Run the game, confirm shooting an enemy removes both the bullet and the enemy, the score increases by 10 each time, and a fresh wave of 18 enemies appears automatically once you clear one out.

## Student Mission

1. Change \`POINTS_PER_ENEMY\` to a different value and confirm the score updates correctly.
2. Move the score display to a different corner of the screen by changing the \`(10, 10)\` position passed to \`blit()\`.
3. Add a second line of text below the score showing how many enemies remain, using \`len(enemies)\`.

## Challenge

Right now every enemy is worth the same number of points. Give the *back row* of enemies (the ones created with the smallest \`row\` value, closest to the top of the screen) a higher point value than the front row, by passing each enemy's row number into its constructor and using it inside \`handle_collisions\` to decide how many points to award. This requires carrying one extra piece of information on the \`Enemy\` object — good practice for designing your own object attributes.

## Common Mistakes

- **Removing an enemy from the list while still looping over it** — modifying a list (like with \`.remove()\`) *while* a \`for\` loop is iterating directly over that same list can skip entries or crash; this is exactly why \`handle_collisions\` builds a brand-new \`surviving_bullets\` list rather than trying to remove bullets from \`bullets\` mid-loop.
- **Forgetting the \`break\` after a hit is found** — without it, one bullet could theoretically be checked against remaining enemies after already finding a hit, which wastes time and can cause confusing double-counting bugs.
- **Creating a new font object every frame** — \`pygame.font.SysFont(...)\` is meant to be created once; calling it 60 times a second noticeably slows the game down.
- **Forgetting to store the returned values** — writing \`handle_collisions(bullets, enemies, score)\` without \`bullets, score = ...\` silently discards the results, so the score will never visibly change even though the function ran correctly.

## Debugging Tips

- If shooting an enemy does nothing, check that you're calling \`get_rect()\` on both the bullet and the enemy, not comparing raw \`x\`/\`y\` numbers directly.
- If the score never updates on screen but you believe the math is right, check whether \`draw_score()\` is actually being called every frame, after \`handle_collisions()\` runs.
- If enemies vanish in groups instead of one at a time, double-check the inner loop has a \`break\` right after a hit is found, so one bullet can't match multiple enemies.
- If new waves never appear, add a temporary \`print(len(enemies))\` right before the \`if not enemies:\` check to confirm the list is actually reaching zero.

## Check Your Understanding

- In your own words, what does \`.colliderect()\` tell you, and what two pieces of information does a \`pygame.Rect\` need to be built?
- Why does \`handle_collisions\` build a brand-new \`surviving_bullets\` list instead of removing hit bullets directly from \`bullets\` while looping over it?
- Why is the score passed into \`handle_collisions\` *and* returned back out, instead of just being changed directly inside the function?

## Mini Quiz

1. What does \`bullet.get_rect().colliderect(enemy.get_rect())\` return?
   a) The distance between them  b) \`True\` if the two rectangles overlap, otherwise \`False\`  c) The enemy's score value  d) Nothing — it has no return value

2. Why is a \`break\` used right after a hit is found inside the inner loop?
   a) It ends the whole program  b) It stops checking the current bullet against any more enemies, since it already found its one match  c) It removes the bullet from the screen  d) It is required by Python syntax

3. What does \`pygame.font.SysFont(None, 32)\` create?
   a) A new window  b) A font object used to turn text into a drawable image  c) A sound effect  d) A new enemy

4. Why is the font object created once, outside \`main()\`'s loop, instead of inside it?
   a) It only works outside loops  b) Creating a font is relatively slow, so reusing one object is far more efficient than recreating it every frame  c) Pygame forbids creating fonts inside loops  d) There's no real reason, it's just a style choice

5. What does \`if not enemies:\` check?
   a) Whether any enemy is red  b) Whether the enemies list is empty  c) Whether the player is alive  d) Whether the game is paused

6. (Code reading) If \`score = 50\` before a frame and exactly 2 enemies are destroyed that frame with \`POINTS_PER_ENEMY = 10\`, what is \`score\` afterward?
   a) 50  b) 60  c) 70  d) 20

### Answer Key

1. b — \`True\` if the two rectangles overlap, otherwise \`False\`
2. b — stops checking the current bullet against more enemies, since it found its one match
3. b — a font object used to turn text into a drawable image
4. b — creating a font is relatively slow, so reusing one object is efficient
5. b — whether the enemies list is empty
6. c — 70 (50 + 10 + 10)

## Lesson Recap

Today your lasers and enemies finally noticed each other: collision detection connects bullets to enemies, a running score rewards every hit, and automatic wave respawn keeps the mission going forever. Every system from Parts 1–3 — movement, the fleet, shooting — kept working exactly as before; you only ever added new code that *uses* what already existed.

## Homework / Practice Mission

Using only what you learned today (collision detection and score display — no health or game-over logic yet), add a visible "Enemies Remaining: N" counter next to the score, using \`len(enemies)\` and a second \`font.render()\` call. Confirm the number correctly counts down as you destroy enemies and resets to 18 every time a new wave spawns.

## Portfolio Project Connection

Combat finally feels real — but right now, the player can never actually *lose*. Next lesson, you'll give the player health, let enemies fight back, and build a proper Game Over.`,
    codeSnippets: [
      {
        label: `Cosmic Defender — Part 4 Code (main.py)`,
        language: 'python',
        part: 'reference',
        code: `# Cosmic Defender - Part 4: Combat & Scoring
# Advanced Data Science - Lesson 14
# Builds on Part 3 (Player, Enemy Fleet, Lasers & Shooting) - nothing removed.

import sys
import pygame

# --- Constants ---
SCREEN_WIDTH = 800
SCREEN_HEIGHT = 600
FPS = 60

PLAYER_SPEED = 6

ENEMY_SPEED = 2
ENEMY_DROP = 20
ENEMY_ROWS = 3
ENEMY_COLS = 6

BULLET_SPEED = 10

# NEW: scoring
POINTS_PER_ENEMY = 10

BLACK = (10, 10, 30)
CYAN = (0, 255, 255)
RED = (255, 60, 60)
YELLOW = (255, 255, 0)
WHITE = (255, 255, 255)

# --- Pygame setup ---
pygame.init()
screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
pygame.display.set_caption("Cosmic Defender")
clock = pygame.time.Clock()
font = pygame.font.SysFont(None, 32)  # NEW: for drawing the score


class Player:
    """The player's spaceship. (Unchanged.)"""

    def __init__(self):
        self.width = 50
        self.height = 40
        self.x = SCREEN_WIDTH // 2 - self.width // 2
        self.y = SCREEN_HEIGHT - self.height - 20
        self.speed = PLAYER_SPEED

    def move(self, keys):
        if keys[pygame.K_LEFT] or keys[pygame.K_a]:
            self.x -= self.speed
        if keys[pygame.K_RIGHT] or keys[pygame.K_d]:
            self.x += self.speed

        if self.x < 0:
            self.x = 0
        if self.x > SCREEN_WIDTH - self.width:
            self.x = SCREEN_WIDTH - self.width

    def get_rect(self):  # NEW: needed for collision checks
        return pygame.Rect(self.x, self.y, self.width, self.height)

    def draw(self, surface):
        points = [
            (self.x + self.width // 2, self.y),
            (self.x, self.y + self.height),
            (self.x + self.width, self.y + self.height),
        ]
        pygame.draw.polygon(surface, CYAN, points)


class Enemy:
    """One enemy ship in the fleet. (Unchanged.)"""

    def __init__(self, x, y):
        self.width = 40
        self.height = 30
        self.x = x
        self.y = y

    def get_rect(self):  # NEW: needed for collision checks
        return pygame.Rect(self.x, self.y, self.width, self.height)

    def draw(self, surface):
        pygame.draw.rect(surface, RED, (self.x, self.y, self.width, self.height))


def create_enemy_fleet():
    enemies = []
    spacing_x = 90
    spacing_y = 70
    start_x = 60
    start_y = 50
    for row in range(ENEMY_ROWS):
        for col in range(ENEMY_COLS):
            x = start_x + col * spacing_x
            y = start_y + row * spacing_y
            enemies.append(Enemy(x, y))
    return enemies


def move_fleet(enemies, direction):
    edge_hit = False
    for enemy in enemies:
        enemy.x += ENEMY_SPEED * direction
        if enemy.x <= 0 or enemy.x + enemy.width >= SCREEN_WIDTH:
            edge_hit = True

    if edge_hit:
        for enemy in enemies:
            enemy.y += ENEMY_DROP
        direction *= -1

    return direction


class Bullet:
    """A laser bullet fired by the player, travelling straight up. (Unchanged.)"""

    def __init__(self, x, y):
        self.width = 4
        self.height = 12
        self.x = x
        self.y = y
        self.speed = BULLET_SPEED

    def move(self):
        self.y -= self.speed

    def get_rect(self):  # NEW: needed for collision checks
        return pygame.Rect(self.x, self.y, self.width, self.height)

    def draw(self, surface):
        pygame.draw.rect(surface, YELLOW, (self.x, self.y, self.width, self.height))

    def is_off_screen(self):
        return self.y + self.height < 0


# NEW: check every bullet against every enemy and resolve hits
def handle_collisions(bullets, enemies, score):
    """Remove any bullet/enemy pair that touches. Return the updated score."""
    surviving_bullets = []
    for bullet in bullets:
        hit_enemy = None
        for enemy in enemies:
            if bullet.get_rect().colliderect(enemy.get_rect()):
                hit_enemy = enemy
                break
        if hit_enemy is not None:
            enemies.remove(hit_enemy)
            score += POINTS_PER_ENEMY
        else:
            surviving_bullets.append(bullet)
    return surviving_bullets, score


def draw_score(surface, score):
    """NEW: show the current score in the top-left corner."""
    text = font.render(f"Score: {score}", True, WHITE)
    surface.blit(text, (10, 10))


def main():
    player = Player()
    enemies = create_enemy_fleet()
    fleet_direction = 1
    bullets = []
    score = 0  # NEW
    running = True

    while running:
        clock.tick(FPS)

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_SPACE:
                    bullet_x = player.x + player.width // 2 - 2
                    bullet_y = player.y
                    bullets.append(Bullet(bullet_x, bullet_y))

        keys = pygame.key.get_pressed()
        player.move(keys)
        fleet_direction = move_fleet(enemies, fleet_direction)

        for bullet in bullets:
            bullet.move()
        bullets = [b for b in bullets if not b.is_off_screen()]

        # NEW: resolve laser hits and award points
        bullets, score = handle_collisions(bullets, enemies, score)

        # NEW: when the whole fleet is destroyed, send in a fresh wave
        if not enemies:
            enemies = create_enemy_fleet()

        screen.fill(BLACK)
        player.draw(screen)
        for enemy in enemies:
            enemy.draw(screen)
        for bullet in bullets:
            bullet.draw(screen)
        draw_score(screen, score)  # NEW
        pygame.display.flip()

    pygame.quit()
    sys.exit()


if __name__ == "__main__":
    main()`,
      },
    ],
    projectLinks: [
      {
        title: `Cosmic Defender v4`,
        url: `https://app.pickcode.io/project/cmw00uqaj0a0dm3alsvlznixs`,
      },
    ],
  },

  {
    order: 15,
    matchTitle: `Sound Effects and Music`,
    title: `Cosmic Defender — Part 5: Health & Survival`,
    objectives: [
      `Add a \`health\` attribute to an object and write a method that safely decreases it, never letting it go below zero.`,
      `Detect two different kinds of collision (an enemy reaching the bottom of the screen, and an enemy touching the player directly) inside one function.`,
      `Display a second piece of UI text (health) alongside an existing one (score).`,
      `Use a boolean flag (\`game_over\`) to freeze gameplay updates while still keeping the window responsive.`,
      `Explain why checking \`is_alive()\` through a method is better than checking \`health > 0\` directly everywhere in your code.`,
    ],
    homework: `Using only what you learned today (health, damage, and the \`game_over\` flag — no menus or restarting yet), add a visible warning: when \`player.health\` drops to exactly 1, draw a brightly colored "LOW HEALTH!" message near the health display. Confirm it disappears correctly if health changes, and that it does not appear at any other health value.`,
    checkpoint: `Run main.py and show the player losing health from enemy contact, a health display on screen, and a GAME OVER message that freezes gameplay once health reaches zero.`,
    contentMarkdown: `# Advanced Data Science — Lesson 15: Cosmic Defender — Part 5: Health & Survival

**Course/Path:** Cosmic Defender (6-Part Pygame Project)
**Lesson:** 06 of 08
**Title:** Cosmic Defender — Part 5: Health & Survival
**Duration:** 60 minutes
**Difficulty:** Beginner
**Technology:** Python 3.10+, Pygame

---

## Mission Brief

Cadet, so far this has been a one-sided fight — your lasers can destroy enemies, but nothing can touch *you*. Today that changes. Your ship gets a health bar, enemies become a real threat (reaching the bottom of the screen or crashing into you costs you a point of health), and for the first time, Cosmic Defender can actually end: lose all your health, and it's game over. This is the lesson that turns your project from a toy into a real game with real stakes.

## Learning Objectives

By the end of this lesson, you will be able to:

1. Add a \`health\` attribute to an object and write a method that safely decreases it, never letting it go below zero.
2. Detect two different kinds of collision (an enemy reaching the bottom of the screen, and an enemy touching the player directly) inside one function.
3. Display a second piece of UI text (health) alongside an existing one (score).
4. Use a boolean flag (\`game_over\`) to freeze gameplay updates while still keeping the window responsive.
5. Explain why checking \`is_alive()\` through a method is better than checking \`health > 0\` directly everywhere in your code.

## What You'll Build

**Cosmic Defender v5 — Health & Survival.** Everything from Part 4 (ship, fleet, lasers, combat, scoring) plus a 3-point health bar for the player, enemy-caused damage (from reaching the bottom of the screen or crashing into the ship), a health display next to the score, and a real "GAME OVER" screen that appears once health reaches zero and freezes the action.

## Prerequisites

- Completion of Lesson 14 (Cosmic Defender Part 4) — you should have a working \`main.py\` with collision detection and scoring.
- Comfortable with \`pygame.Rect.colliderect()\` from last lesson.

## Key Terminology

| Term | Definition |
|---|---|
| **Health / Hit Points** | A numeric attribute representing how much damage an object can take before it's considered defeated. |
| **Clamping (lower bound)** | Preventing a number from dropping below a minimum value — here, making sure \`health\` never goes negative. |
| **Boolean Flag** | A single \`True\`/\`False\` variable (like \`game_over\`) used to switch the game's behavior on or off. |
| **Freezing Updates** | Skipping the "update game state" step of the game loop while still running the "handle events" and "draw" steps, so the window stays open and responsive even though nothing is moving. |
| **Game Over State** | The condition where the player has lost, usually shown with a message and a way to restart (restarting itself comes in the next lesson). |

## Concept Explanation

Giving the player **health** is the same idea as the \`hull_integrity\` you tracked back in Lesson 10's \`Ship\` class — a number that starts at some maximum and decreases when something bad happens. The one new rule: health should never drop below zero, since "negative three health" doesn't mean anything. That's why \`take_damage()\` clamps the result with the same \`max(0, ...)\` pattern you've already used before.

Detecting *when* the player should take damage means checking for two different situations at once: an enemy reaching the very bottom of the screen (it got past the player completely), or an enemy's rectangle directly overlapping the player's rectangle (a head-on crash). Both situations remove that enemy and cost the player one point of health — we just check for either condition with an \`or\`.

The most important new idea this lesson is **freezing updates** without freezing the whole program. A naive "game over" might just stop the entire \`while running:\` loop — but that would also stop checking for the \`QUIT\` event, meaning the player couldn't even close the window normally, and the game-over message would never actually get a chance to be drawn and shown. Instead, Cosmic Defender keeps the loop running forever, but wraps *only* the gameplay-update code (movement, collisions, spawning) inside \`if not game_over:\` — so once \`game_over\` becomes \`True\`, the window stays open, still responds to being closed, and still draws every frame, but nothing in the game moves anymore.

## How This Shows Up in Cosmic Defender

\`Player\` gains a \`self.health\` attribute (starting at \`STARTING_HEALTH\`), a \`take_damage(amount)\` method using the familiar clamp pattern, and an \`is_alive()\` method that simply returns \`self.health > 0\`. The new \`handle_player_damage(player, enemies)\` function loops through every enemy, checking \`enemy.y + enemy.height >= SCREEN_HEIGHT\` (reached the bottom) or \`enemy.get_rect().colliderect(player.get_rect())\` (crashed into the player); either one calls \`player.take_damage()\` and removes that enemy, while every other enemy survives into a new list exactly like \`handle_collisions\` did for bullets. \`main()\` gains a \`game_over\` flag, starting \`False\`; the entire block of movement, fleet-moving, bullet-updating, and collision code is now indented inside \`if not game_over:\`, and right after that block, \`if not player.is_alive(): game_over = True\` flips the switch for good. Drawing always happens regardless of \`game_over\`, and a new \`draw_game_over()\` function paints a large "GAME OVER" message over everything whenever the flag is set.

## What Changed From Part 4

- **NEW** — \`STARTING_HEALTH\` and \`ENEMY_REACHED_BOTTOM_DAMAGE\` constants, and a \`big_font\` for large text.
- **NEW** — \`self.health\` on \`Player\`, plus \`take_damage()\` and \`is_alive()\` methods.
- **NEW** — \`handle_player_damage(player, enemies)\`, which checks every enemy for reaching the bottom or touching the player, applies damage, and returns the surviving enemies.
- **NEW** — \`draw_health(surface, health)\` and \`draw_game_over(surface)\` for the new UI.
- **NEW** — a \`game_over\` flag in \`main()\`.
- **MODIFIED** — all of \`main()\`'s gameplay-update code (movement, fleet movement, bullet updates, collisions) is now wrapped inside \`if not game_over:\`, so it stops running the instant the player is defeated.
- **MODIFIED** — shooting is now also guarded by \`and not game_over\`, so the player can't keep firing after losing.
- **MODIFIED** — the drawing section now also calls \`draw_health()\` every frame, and \`draw_game_over()\` only while \`game_over\` is \`True\`.
- **REMOVED** — nothing. Movement, the fleet, shooting, collisions, and scoring from Parts 1–4 all still work exactly as before while the game is in progress.

## Guided Coding

Here is the complete, current version of \`main.py\`, with everything from Parts 1–4 still intact:

\`\`\`python
# Cosmic Defender - Part 5: Health & Survival
# Advanced Data Science - Lesson 15
# Builds on Part 4 (Player, Enemies, Lasers, Combat & Scoring) - nothing removed.

import sys
import pygame

# --- Constants ---
SCREEN_WIDTH = 800
SCREEN_HEIGHT = 600
FPS = 60

PLAYER_SPEED = 6

ENEMY_SPEED = 2
ENEMY_DROP = 20
ENEMY_ROWS = 3
ENEMY_COLS = 6

BULLET_SPEED = 10

POINTS_PER_ENEMY = 10

# NEW: health & survival
STARTING_HEALTH = 3
ENEMY_REACHED_BOTTOM_DAMAGE = 1

BLACK = (10, 10, 30)
CYAN = (0, 255, 255)
RED = (255, 60, 60)
YELLOW = (255, 255, 0)
WHITE = (255, 255, 255)

# --- Pygame setup ---
pygame.init()
screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
pygame.display.set_caption("Cosmic Defender")
clock = pygame.time.Clock()
font = pygame.font.SysFont(None, 32)
big_font = pygame.font.SysFont(None, 64)  # NEW: for the Game Over text


class Player:
    """The player's spaceship."""

    def __init__(self):
        self.width = 50
        self.height = 40
        self.x = SCREEN_WIDTH // 2 - self.width // 2
        self.y = SCREEN_HEIGHT - self.height - 20
        self.speed = PLAYER_SPEED
        self.health = STARTING_HEALTH  # NEW

    def move(self, keys):
        if keys[pygame.K_LEFT] or keys[pygame.K_a]:
            self.x -= self.speed
        if keys[pygame.K_RIGHT] or keys[pygame.K_d]:
            self.x += self.speed

        if self.x < 0:
            self.x = 0
        if self.x > SCREEN_WIDTH - self.width:
            self.x = SCREEN_WIDTH - self.width

    def get_rect(self):
        return pygame.Rect(self.x, self.y, self.width, self.height)

    def take_damage(self, amount=1):  # NEW
        """Lose health. Health never drops below 0."""
        self.health -= amount
        if self.health < 0:
            self.health = 0

    def is_alive(self):  # NEW
        return self.health > 0

    def draw(self, surface):
        points = [
            (self.x + self.width // 2, self.y),
            (self.x, self.y + self.height),
            (self.x + self.width, self.y + self.height),
        ]
        pygame.draw.polygon(surface, CYAN, points)


class Enemy:
    """One enemy ship in the fleet."""

    def __init__(self, x, y):
        self.width = 40
        self.height = 30
        self.x = x
        self.y = y

    def get_rect(self):
        return pygame.Rect(self.x, self.y, self.width, self.height)

    def draw(self, surface):
        pygame.draw.rect(surface, RED, (self.x, self.y, self.width, self.height))


def create_enemy_fleet():
    enemies = []
    spacing_x = 90
    spacing_y = 70
    start_x = 60
    start_y = 50
    for row in range(ENEMY_ROWS):
        for col in range(ENEMY_COLS):
            x = start_x + col * spacing_x
            y = start_y + row * spacing_y
            enemies.append(Enemy(x, y))
    return enemies


def move_fleet(enemies, direction):
    edge_hit = False
    for enemy in enemies:
        enemy.x += ENEMY_SPEED * direction
        if enemy.x <= 0 or enemy.x + enemy.width >= SCREEN_WIDTH:
            edge_hit = True

    if edge_hit:
        for enemy in enemies:
            enemy.y += ENEMY_DROP
        direction *= -1

    return direction


class Bullet:
    """A laser bullet fired by the player, travelling straight up."""

    def __init__(self, x, y):
        self.width = 4
        self.height = 12
        self.x = x
        self.y = y
        self.speed = BULLET_SPEED

    def move(self):
        self.y -= self.speed

    def get_rect(self):
        return pygame.Rect(self.x, self.y, self.width, self.height)

    def draw(self, surface):
        pygame.draw.rect(surface, YELLOW, (self.x, self.y, self.width, self.height))

    def is_off_screen(self):
        return self.y + self.height < 0


def handle_collisions(bullets, enemies, score):
    surviving_bullets = []
    for bullet in bullets:
        hit_enemy = None
        for enemy in enemies:
            if bullet.get_rect().colliderect(enemy.get_rect()):
                hit_enemy = enemy
                break
        if hit_enemy is not None:
            enemies.remove(hit_enemy)
            score += POINTS_PER_ENEMY
        else:
            surviving_bullets.append(bullet)
    return surviving_bullets, score


# NEW: check if any enemy has reached the bottom of the screen or touched the player
def handle_player_damage(player, enemies):
    """If an enemy reaches the bottom of the screen or crashes into the
    player, the player takes damage and that enemy is removed."""
    surviving_enemies = []
    for enemy in enemies:
        reached_bottom = enemy.y + enemy.height >= SCREEN_HEIGHT
        hit_player = enemy.get_rect().colliderect(player.get_rect())
        if reached_bottom or hit_player:
            player.take_damage(ENEMY_REACHED_BOTTOM_DAMAGE)
        else:
            surviving_enemies.append(enemy)
    return surviving_enemies


def draw_score(surface, score):
    text = font.render(f"Score: {score}", True, WHITE)
    surface.blit(text, (10, 10))


def draw_health(surface, health):  # NEW
    """Show the player's remaining health in the top-right corner."""
    text = font.render(f"Health: {health}", True, WHITE)
    surface.blit(text, (SCREEN_WIDTH - text.get_width() - 10, 10))


def draw_game_over(surface):  # NEW
    text = big_font.render("GAME OVER", True, RED)
    rect = text.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2))
    surface.blit(text, rect)


def main():
    player = Player()
    enemies = create_enemy_fleet()
    fleet_direction = 1
    bullets = []
    score = 0
    game_over = False  # NEW
    running = True

    while running:
        clock.tick(FPS)

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_SPACE and not game_over:
                    bullet_x = player.x + player.width // 2 - 2
                    bullet_y = player.y
                    bullets.append(Bullet(bullet_x, bullet_y))

        if not game_over:  # NEW: freeze gameplay updates once the game is over
            keys = pygame.key.get_pressed()
            player.move(keys)
            fleet_direction = move_fleet(enemies, fleet_direction)

            for bullet in bullets:
                bullet.move()
            bullets = [b for b in bullets if not b.is_off_screen()]

            bullets, score = handle_collisions(bullets, enemies, score)
            enemies = handle_player_damage(player, enemies)  # NEW

            if not enemies:
                enemies = create_enemy_fleet()

            if not player.is_alive():  # NEW
                game_over = True

        screen.fill(BLACK)
        player.draw(screen)
        for enemy in enemies:
            enemy.draw(screen)
        for bullet in bullets:
            bullet.draw(screen)
        draw_score(screen, score)
        draw_health(screen, player.health)  # NEW
        if game_over:  # NEW
            draw_game_over(screen)
        pygame.display.flip()

    pygame.quit()
    sys.exit()


if __name__ == "__main__":
    main()
\`\`\`

## Code Walkthrough

- \`self.health = STARTING_HEALTH\` in \`Player.__init__\` — a new attribute, set up fresh every time a \`Player\` is created, exactly like \`self.x\` and \`self.y\` already were.
- \`def take_damage(self, amount=1): self.health -= amount; if self.health < 0: self.health = 0\` — the default parameter \`amount=1\` means you can call \`take_damage()\` with no arguments for the common case, or \`take_damage(5)\` for a bigger hit.
- \`def is_alive(self): return self.health > 0\` — a tiny method, but an important habit: anywhere else in the code that needs to check if the player is alive calls \`player.is_alive()\` instead of repeating \`player.health > 0\` everywhere, so if the rule ever changes, there's only one place to fix it.
- \`reached_bottom = enemy.y + enemy.height >= SCREEN_HEIGHT\` and \`hit_player = enemy.get_rect().colliderect(player.get_rect())\` — two independent yes/no checks, computed first and stored in clearly-named variables, which makes the \`if reached_bottom or hit_player:\` line underneath much easier to read than cramming both checks directly into the \`if\`.
- \`enemies = handle_player_damage(player, enemies)\` in \`main()\` — notice \`enemies\` gets reassigned here, in addition to already being reassigned by \`handle_collisions\` just above it; both functions independently filter the same list for different reasons, one frame apart.
- \`if not game_over:\` wrapping the entire update block — this single \`if\` is what "freezes" the game; everything indented beneath it simply doesn't run once \`game_over\` is \`True\`, but the code *outside* this \`if\` (handling \`QUIT\`, drawing) runs every frame no matter what.
- \`if not player.is_alive(): game_over = True\` — placed *after* the update block, so this check always sees this frame's very latest health value.
- \`if game_over: draw_game_over(screen)\` in the drawing section of \`main()\` — drawing the game-over message is just one more \`if\`, layered on top of the normal drawing that still happens underneath it.

## Build Instructions

1. Continue inside the same Cosmic Defender project on Pickcode — Part 5 builds directly on Part 4.
2. Add \`STARTING_HEALTH\`, \`ENEMY_REACHED_BOTTOM_DAMAGE\`, \`big_font\`, the \`Player\` health additions, \`handle_player_damage()\`, \`draw_health()\`, and \`draw_game_over()\` to your existing \`main.py\`.
3. Wrap the gameplay-update code in \`main()\` inside \`if not game_over:\`, add the \`is_alive()\` check right after it, and update the drawing section.
4. Run the game, confirm health goes down when an enemy reaches the bottom or crashes into you, and confirm a "GAME OVER" message appears and gameplay freezes once health hits zero (closing the window should still work).

## Student Mission

1. Change \`STARTING_HEALTH\` to \`5\` or \`1\` and feel how differently the game plays at each setting.
2. Change \`ENEMY_REACHED_BOTTOM_DAMAGE\` to \`2\` and notice how much faster the game becomes dangerous.
3. Add a short, different message that appears *only* when health drops to exactly \`1\` (a "warning" state), using a simple \`if player.health == 1:\` check in the drawing section.

## Challenge

Give the player a brief moment of "invincibility" right after taking damage: add a small counter (like \`invincible_timer\`) that gets set to some number of frames (say \`30\`) every time \`take_damage()\` is called, counts down by \`1\` every frame, and skips applying any *further* damage while it's above \`0\`. This prevents a single clumsy moment from draining several points of health all at once.

## Common Mistakes

- **Checking \`is_alive()\` before the update block instead of after** — since enemies can only damage the player *during* the update block, checking too early will always see last frame's health, delaying the game-over by one frame and potentially letting the player take one extra "free" hit.
- **Forgetting to guard shooting with \`game_over\`** — without \`and not game_over\` on the space-bar check, the player can keep firing lasers into an already-ended game, which looks like a bug even though nothing is technically broken.
- **Putting the entire \`while running:\` loop inside an \`if not game_over:\`** — this would also stop checking for \`QUIT\`, meaning the player couldn't even close the window normally once the game ended.
- **Using \`health <= 0\` in some places and \`health == 0\` in others** — inconsistent checks like this are exactly why wrapping the rule in one \`is_alive()\` method, used everywhere, is safer than repeating raw comparisons.

## Debugging Tips

- If health never decreases, add a temporary \`print(player.health)\` right after calling \`handle_player_damage()\` to confirm the function is actually being reached and returning a shorter enemies list.
- If the game-over message never appears, check that \`if not player.is_alive(): game_over = True\` is placed *after* the update block runs each frame, not before it.
- If the window becomes unresponsive once the game ends, double-check that only the gameplay-update code — not the event-handling code — is wrapped inside \`if not game_over:\`.
- If health goes negative, double check \`take_damage()\`'s clamp line is exactly \`if self.health < 0: self.health = 0\`, not accidentally comparing to the wrong variable.

## Check Your Understanding

- Why does \`take_damage()\` need a clamp, the same way \`burn_fuel()\` did back in Lesson 10?
- In your own words, explain what "freezing updates" means, and why the event-handling code must stay *outside* the \`if not game_over:\` block.
- Why does the project use a dedicated \`is_alive()\` method instead of writing \`player.health > 0\` everywhere it's needed?

## Mini Quiz

1. What does \`take_damage()\`'s clamp (\`if self.health < 0: self.health = 0\`) prevent?
   a) Health from going above the maximum  b) Health from going negative  c) The game from closing  d) Enemies from spawning

2. Why is the gameplay-update code wrapped in \`if not game_over:\` instead of stopping the whole \`while running:\` loop?
   a) It isn't necessary, both work identically  b) Stopping the whole loop would also stop handling the QUIT event and drawing the game-over message  c) Python doesn't allow stopping a \`while\` loop early  d) \`game_over\` must always be \`False\`

3. What two conditions does \`handle_player_damage\` check for each enemy?
   a) Color and size  b) Whether it reached the bottom of the screen, or collided directly with the player  c) Whether it was created in the first or second row  d) Whether it's moving left or right

4. What does \`player.is_alive()\` return?
   a) The player's exact health number  b) \`True\` if health is greater than 0, otherwise \`False\`  c) Always \`True\`  d) The player's position

5. Where should \`if not player.is_alive(): game_over = True\` be placed?
   a) Before any damage is applied this frame  b) After the update block, so it sees this frame's latest health value  c) Inside \`Player.__init__\`  d) It doesn't matter where it goes

6. (Code reading) If \`player.health = 1\` and the player takes 1 damage, what does \`is_alive()\` return immediately after?
   a) \`True\`  b) \`False\`  c) An error  d) \`None\`

### Answer Key

1. b — health from going negative
2. b — stopping the whole loop would also stop handling QUIT and drawing the game-over message
3. b — reaching the bottom of the screen, or colliding directly with the player
4. b — \`True\` if health is greater than 0, otherwise \`False\`
5. b — after the update block, so it sees this frame's latest health value
6. b — \`False\` (health becomes 0, and \`0 > 0\` is \`False\`)

## Lesson Recap

Today Cosmic Defender became a real game with real stakes: a health system, two distinct kinds of enemy-caused damage, and a Game Over screen that freezes gameplay while keeping the window itself fully responsive. Every system from Parts 1–4 kept working exactly as it did before — health just adds a way for the mission to finally come to an end.

## Homework / Practice Mission

Using only what you learned today (health, damage, and the \`game_over\` flag — no menus or restarting yet), add a visible warning: when \`player.health\` drops to exactly \`1\`, draw a flashing or brightly colored "LOW HEALTH!" message near the health display (a simple \`if player.health == 1:\` check is enough — flashing is optional bonus polish). Confirm it disappears correctly if health changes, and that it does not appear at any other health value.

## Portfolio Project Connection

Your game can now truly be won or lost — but once it ends, there's no way back in except closing and reopening the whole program. Next lesson, you'll build a proper main menu and a restart option, organizing everything you've built so far into one clean \`Game\` class.`,
    codeSnippets: [
      {
        label: `Cosmic Defender — Part 5 Code (main.py)`,
        language: 'python',
        part: 'reference',
        code: `# Cosmic Defender - Part 5: Health & Survival
# Advanced Data Science - Lesson 15
# Builds on Part 4 (Player, Enemies, Lasers, Combat & Scoring) - nothing removed.

import sys
import pygame

# --- Constants ---
SCREEN_WIDTH = 800
SCREEN_HEIGHT = 600
FPS = 60

PLAYER_SPEED = 6

ENEMY_SPEED = 2
ENEMY_DROP = 20
ENEMY_ROWS = 3
ENEMY_COLS = 6

BULLET_SPEED = 10

POINTS_PER_ENEMY = 10

# NEW: health & survival
STARTING_HEALTH = 3
ENEMY_REACHED_BOTTOM_DAMAGE = 1

BLACK = (10, 10, 30)
CYAN = (0, 255, 255)
RED = (255, 60, 60)
YELLOW = (255, 255, 0)
WHITE = (255, 255, 255)

# --- Pygame setup ---
pygame.init()
screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
pygame.display.set_caption("Cosmic Defender")
clock = pygame.time.Clock()
font = pygame.font.SysFont(None, 32)
big_font = pygame.font.SysFont(None, 64)  # NEW: for the Game Over text


class Player:
    """The player's spaceship."""

    def __init__(self):
        self.width = 50
        self.height = 40
        self.x = SCREEN_WIDTH // 2 - self.width // 2
        self.y = SCREEN_HEIGHT - self.height - 20
        self.speed = PLAYER_SPEED
        self.health = STARTING_HEALTH  # NEW

    def move(self, keys):
        if keys[pygame.K_LEFT] or keys[pygame.K_a]:
            self.x -= self.speed
        if keys[pygame.K_RIGHT] or keys[pygame.K_d]:
            self.x += self.speed

        if self.x < 0:
            self.x = 0
        if self.x > SCREEN_WIDTH - self.width:
            self.x = SCREEN_WIDTH - self.width

    def get_rect(self):
        return pygame.Rect(self.x, self.y, self.width, self.height)

    def take_damage(self, amount=1):  # NEW
        """Lose health. Health never drops below 0."""
        self.health -= amount
        if self.health < 0:
            self.health = 0

    def is_alive(self):  # NEW
        return self.health > 0

    def draw(self, surface):
        points = [
            (self.x + self.width // 2, self.y),
            (self.x, self.y + self.height),
            (self.x + self.width, self.y + self.height),
        ]
        pygame.draw.polygon(surface, CYAN, points)


class Enemy:
    """One enemy ship in the fleet."""

    def __init__(self, x, y):
        self.width = 40
        self.height = 30
        self.x = x
        self.y = y

    def get_rect(self):
        return pygame.Rect(self.x, self.y, self.width, self.height)

    def draw(self, surface):
        pygame.draw.rect(surface, RED, (self.x, self.y, self.width, self.height))


def create_enemy_fleet():
    enemies = []
    spacing_x = 90
    spacing_y = 70
    start_x = 60
    start_y = 50
    for row in range(ENEMY_ROWS):
        for col in range(ENEMY_COLS):
            x = start_x + col * spacing_x
            y = start_y + row * spacing_y
            enemies.append(Enemy(x, y))
    return enemies


def move_fleet(enemies, direction):
    edge_hit = False
    for enemy in enemies:
        enemy.x += ENEMY_SPEED * direction
        if enemy.x <= 0 or enemy.x + enemy.width >= SCREEN_WIDTH:
            edge_hit = True

    if edge_hit:
        for enemy in enemies:
            enemy.y += ENEMY_DROP
        direction *= -1

    return direction


class Bullet:
    """A laser bullet fired by the player, travelling straight up."""

    def __init__(self, x, y):
        self.width = 4
        self.height = 12
        self.x = x
        self.y = y
        self.speed = BULLET_SPEED

    def move(self):
        self.y -= self.speed

    def get_rect(self):
        return pygame.Rect(self.x, self.y, self.width, self.height)

    def draw(self, surface):
        pygame.draw.rect(surface, YELLOW, (self.x, self.y, self.width, self.height))

    def is_off_screen(self):
        return self.y + self.height < 0


def handle_collisions(bullets, enemies, score):
    surviving_bullets = []
    for bullet in bullets:
        hit_enemy = None
        for enemy in enemies:
            if bullet.get_rect().colliderect(enemy.get_rect()):
                hit_enemy = enemy
                break
        if hit_enemy is not None:
            enemies.remove(hit_enemy)
            score += POINTS_PER_ENEMY
        else:
            surviving_bullets.append(bullet)
    return surviving_bullets, score


# NEW: check if any enemy has reached the bottom of the screen or touched the player
def handle_player_damage(player, enemies):
    """If an enemy reaches the bottom of the screen or crashes into the
    player, the player takes damage and that enemy is removed."""
    surviving_enemies = []
    for enemy in enemies:
        reached_bottom = enemy.y + enemy.height >= SCREEN_HEIGHT
        hit_player = enemy.get_rect().colliderect(player.get_rect())
        if reached_bottom or hit_player:
            player.take_damage(ENEMY_REACHED_BOTTOM_DAMAGE)
        else:
            surviving_enemies.append(enemy)
    return surviving_enemies


def draw_score(surface, score):
    text = font.render(f"Score: {score}", True, WHITE)
    surface.blit(text, (10, 10))


def draw_health(surface, health):  # NEW
    """Show the player's remaining health in the top-right corner."""
    text = font.render(f"Health: {health}", True, WHITE)
    surface.blit(text, (SCREEN_WIDTH - text.get_width() - 10, 10))


def draw_game_over(surface):  # NEW
    text = big_font.render("GAME OVER", True, RED)
    rect = text.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2))
    surface.blit(text, rect)


def main():
    player = Player()
    enemies = create_enemy_fleet()
    fleet_direction = 1
    bullets = []
    score = 0
    game_over = False  # NEW
    running = True

    while running:
        clock.tick(FPS)

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_SPACE and not game_over:
                    bullet_x = player.x + player.width // 2 - 2
                    bullet_y = player.y
                    bullets.append(Bullet(bullet_x, bullet_y))

        if not game_over:  # NEW: freeze gameplay updates once the game is over
            keys = pygame.key.get_pressed()
            player.move(keys)
            fleet_direction = move_fleet(enemies, fleet_direction)

            for bullet in bullets:
                bullet.move()
            bullets = [b for b in bullets if not b.is_off_screen()]

            bullets, score = handle_collisions(bullets, enemies, score)
            enemies = handle_player_damage(player, enemies)  # NEW

            if not enemies:
                enemies = create_enemy_fleet()

            if not player.is_alive():  # NEW
                game_over = True

        screen.fill(BLACK)
        player.draw(screen)
        for enemy in enemies:
            enemy.draw(screen)
        for bullet in bullets:
            bullet.draw(screen)
        draw_score(screen, score)
        draw_health(screen, player.health)  # NEW
        if game_over:  # NEW
            draw_game_over(screen)
        pygame.display.flip()

    pygame.quit()
    sys.exit()


if __name__ == "__main__":
    main()`,
      },
    ],
    projectLinks: [
      {
        title: `Cosmic Defender v5`,
        url: `https://app.pickcode.io/project/cmw00wf9c0ak3m3al40q40huo`,
      },
    ],
  },

  {
    order: 16,
    matchTitle: `Game States — Menu, Play, Game Over`,
    title: `Cosmic Defender — Part 6: Menus & Game States`,
    objectives: [
      `Explain what a state machine is, using plain, simple states like "menu", "playing", and "game_over".`,
      `Group related data (player, enemies, bullets, score, state) together as attributes of a single class instead of loose variables.`,
      `Write methods that each do one clear job (\`handle_event\`, \`update\`, \`draw\`) and call them from a short, simple \`main()\`.`,
      `Implement a \`reset()\` method that sets a game back to a fresh starting state, and use it both to start a new game and to restart after losing.`,
      `Draw different screens depending on the game's current state.`,
    ],
    homework: `Using only what you learned today (states and the Game class — this is the final version, so nothing further to forward-reference), implement a "Paused" state: pressing P during gameplay should freeze the game and show a "PAUSED" message, and pressing P again should resume exactly where play left off, with health, score, and enemy positions all unchanged.`,
    checkpoint: `Run main.py and show the full flow: a main menu, starting the game with SPACE, playing with all Part 1-5 features intact, a Game Over screen on defeat, and restarting with R.`,
    contentMarkdown: `# Advanced Data Science — Lesson 16: Cosmic Defender — Part 6: Menus & Game States

**Course/Path:** Cosmic Defender (6-Part Pygame Project)
**Lesson:** 07 of 08
**Title:** Cosmic Defender — Part 6: Menus & Game States
**Duration:** 60 minutes
**Difficulty:** Beginner
**Technology:** Python 3.10+, Pygame

---

## Mission Brief

Cadet, this is it — final systems integration. Cosmic Defender can already fly, fight, and end in defeat, but right now it dives straight into gameplay the instant it opens, and once it's over, that's it — there's no way to play again without closing and restarting the whole program by hand. Today you build the three screens every real game needs — a main menu, the game itself, and a game-over screen you can restart from — and you organize everything you've built over the last five lessons into one clean, well-structured \`Game\` class. Nothing gets rewritten from scratch today. Every piece of code you've already built gets reused exactly as it is; you're only changing how it's *organized*.

## Learning Objectives

By the end of this lesson, you will be able to:

1. Explain what a **state machine** is, using plain, simple states like \`"menu"\`, \`"playing"\`, and \`"game_over"\`.
2. Group related data (player, enemies, bullets, score, state) together as attributes of a single class instead of loose variables.
3. Write methods that each do one clear job (\`handle_event\`, \`update\`, \`draw\`) and call them from a short, simple \`main()\`.
4. Implement a \`reset()\` method that sets a game back to a fresh starting state, and use it both to start a new game and to restart after losing.
5. Draw different screens depending on the game's current state.

## What You'll Build

**Cosmic Defender v6 (final) — Menus & Game States.** The complete, finished Cosmic Defender: a main menu screen you see when the game opens ("Press SPACE to start"), the full playing experience from Parts 1–5 unchanged, and a Game Over screen with a "Press R to restart" prompt that takes you straight back into a fresh game — all organized inside one \`Game\` class.

## Prerequisites

- Completion of Lesson 15 (Cosmic Defender Part 5) — you should have a working \`main.py\` with health, damage, and a Game Over message.
- Comfortable with Python classes (\`__init__\`, \`self\`, methods) from Lesson 10 onward.

## Key Terminology

| Term | Definition |
|---|---|
| **State Machine** | A simple pattern where a program is always in exactly one named "state" (like \`"menu"\`), and that state decides what the program currently does and draws. |
| **State Variable** | A single attribute (here, \`self.state\`) holding the name of the current state, checked with plain \`if\`/\`elif\` comparisons. |
| **Encapsulation** | Grouping related data and the methods that work on it together inside one class, instead of scattering loose variables through a function. |
| **\`reset()\` Method** | A method that sets (or resets) an object back to a known starting condition — used both the first time a game starts and every time it restarts. |
| **Delegation** | Having a short, simple function (like \`main()\`) hand off real work to an object's methods, rather than doing everything itself. |

## Concept Explanation

A **state machine** sounds complicated but is a genuinely simple idea: at any given moment, your game is doing exactly *one* of a small number of things — showing a menu, actively being played, or showing a game-over screen — and it can only be in one of these at a time. We represent "which one" with a single variable, \`self.state\`, holding a plain string like \`"menu"\`. Every part of the game — handling input, updating the world, drawing the screen — starts by asking "what's the current state?" and behaves differently depending on the answer. Moving between states (menu → playing, playing → game over, game over → playing again) is called a **state transition**, and it always happens in reaction to something: pressing space, losing all your health, pressing R.

The second big idea today is **encapsulation**: instead of \`player\`, \`enemies\`, \`bullets\`, \`score\`, and \`game_over\` being five separate loose variables sitting inside \`main()\`, they all become attributes of one object: \`self.player\`, \`self.enemies\`, \`self.bullets\`, \`self.score\`, and (replaced by something better) \`self.state\`. This isn't a new feature — it's the exact same data you've already been tracking since Part 1 — just gathered into one well-organized \`Game\` object instead of loose variables.

That reorganization is what makes a clean \`reset()\` method possible: instead of writing out "set up a fresh player, a fresh fleet, an empty bullet list, score at zero" twice (once to start the game, once to restart after losing), it's written *once*, as a method, and called from both places.

## How This Shows Up in Cosmic Defender

The new \`Game\` class has three string constants for its possible states (\`STATE_MENU\`, \`STATE_PLAYING\`, \`STATE_GAME_OVER\`) and an \`__init__\` that starts \`self.state = STATE_MENU\` with no player or enemies yet. \`reset()\` is almost a direct copy of the setup code that used to live at the top of \`main()\`: it creates a fresh \`Player\`, a fresh enemy fleet, empties the bullets list, zeroes the score, and sets \`self.state = STATE_PLAYING\`. \`handle_event(event)\` replaces the old inline event-handling code: it always checks for \`QUIT\` first, and then checks the *current state* to decide what a \`KEYDOWN\` should mean — space starts the game from the menu, space fires a bullet while playing, and \`R\` restarts from the game-over screen. \`update()\` is the exact gameplay-update code from Part 5, just moved inside a method and only run \`if self.state == STATE_PLAYING:\`. \`draw()\` checks the state and calls one of three small drawing methods: \`draw_menu()\`, \`draw_playing()\` (the exact drawing code from Part 5), or both \`draw_playing()\` and a new game-over overlay on top, so the player can still see the final battle frozen behind the "GAME OVER" text. Finally, \`main()\` shrinks down to almost nothing: create one \`Game\`, and every frame, call \`game.handle_event()\` for each event, then \`game.update()\`, then \`game.draw()\`.

## What Changed From Part 5

- **NEW** — \`STATE_MENU\`, \`STATE_PLAYING\`, and \`STATE_GAME_OVER\` string constants, and a \`GRAY\` color for menu hint text.
- **NEW** — the \`Game\` class: \`__init__\`, \`reset()\`, \`handle_event(event)\`, \`update()\`, \`draw(surface)\`, \`draw_menu(surface)\`, \`draw_playing(surface)\`, and \`draw_game_over_overlay(surface)\`.
- **NEW** — a real main menu screen (title text + "Press SPACE to start" + a controls reminder) and a restart flow (pressing \`R\` on the game-over screen calls \`reset()\` again).
- **MODIFIED** — \`main()\` is dramatically simplified: it now just creates one \`Game\` object and calls \`game.handle_event()\`, \`game.update()\`, and \`game.draw()\` every frame, instead of containing all the gameplay logic directly.
- **MODIFIED** — all the gameplay-update code from Part 5 (player movement, fleet movement, bullet updates, collisions, player damage, wave respawn, the alive check) now lives inside \`Game.update()\`, guarded by \`if self.state != STATE_PLAYING: return\` instead of the old \`if not game_over:\` wrapper.
- **MODIFIED** — all the drawing code from Part 5 now lives inside \`Game.draw_playing()\`, called from \`Game.draw()\` depending on the current state.
- **REMOVED** — the loose variables that used to live directly inside \`main()\` (\`player\`, \`enemies\`, \`fleet_direction\`, \`bullets\`, \`score\`, and the \`game_over\` boolean) are removed *from \`main()\` itself* — but none of the data or behavior they represented is gone. Every one of them now lives on, as an attribute of the \`Game\` object (\`self.player\`, \`self.enemies\`, and so on) or as the more flexible \`self.state\` in place of the old \`True\`/\`False\` flag. This is a reorganization, not a feature loss — nothing the player can do or see has changed.

## Guided Coding

Here is the complete, final version of \`main.py\` — the finished Cosmic Defender:

\`\`\`python
# Cosmic Defender - Part 6: Menus & Game States (FINAL)
# Advanced Data Science - Lesson 16
# Builds on Part 5 (Player, Enemies, Lasers, Combat & Scoring, Health & Survival).
# Nothing is removed - every class and function from Part 5 is still here.
# The only new idea in this version is the Game class, which organizes
# everything we already built into a main menu -> playing -> game over flow.

import sys
import pygame

# --- Constants ---
SCREEN_WIDTH = 800
SCREEN_HEIGHT = 600
FPS = 60

PLAYER_SPEED = 6

ENEMY_SPEED = 2
ENEMY_DROP = 20
ENEMY_ROWS = 3
ENEMY_COLS = 6

BULLET_SPEED = 10

POINTS_PER_ENEMY = 10

STARTING_HEALTH = 3
ENEMY_REACHED_BOTTOM_DAMAGE = 1

# NEW: the three states our game can be in
STATE_MENU = "menu"
STATE_PLAYING = "playing"
STATE_GAME_OVER = "game_over"

BLACK = (10, 10, 30)
CYAN = (0, 255, 255)
RED = (255, 60, 60)
YELLOW = (255, 255, 0)
WHITE = (255, 255, 255)
GRAY = (160, 160, 160)

# --- Pygame setup ---
pygame.init()
screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
pygame.display.set_caption("Cosmic Defender")
clock = pygame.time.Clock()
font = pygame.font.SysFont(None, 32)
big_font = pygame.font.SysFont(None, 64)


class Player:
    """The player's spaceship. (Unchanged from Part 5.)"""

    def __init__(self):
        self.width = 50
        self.height = 40
        self.x = SCREEN_WIDTH // 2 - self.width // 2
        self.y = SCREEN_HEIGHT - self.height - 20
        self.speed = PLAYER_SPEED
        self.health = STARTING_HEALTH

    def move(self, keys):
        if keys[pygame.K_LEFT] or keys[pygame.K_a]:
            self.x -= self.speed
        if keys[pygame.K_RIGHT] or keys[pygame.K_d]:
            self.x += self.speed

        if self.x < 0:
            self.x = 0
        if self.x > SCREEN_WIDTH - self.width:
            self.x = SCREEN_WIDTH - self.width

    def get_rect(self):
        return pygame.Rect(self.x, self.y, self.width, self.height)

    def take_damage(self, amount=1):
        self.health -= amount
        if self.health < 0:
            self.health = 0

    def is_alive(self):
        return self.health > 0

    def draw(self, surface):
        points = [
            (self.x + self.width // 2, self.y),
            (self.x, self.y + self.height),
            (self.x + self.width, self.y + self.height),
        ]
        pygame.draw.polygon(surface, CYAN, points)


class Enemy:
    """One enemy ship in the fleet. (Unchanged from Part 5.)"""

    def __init__(self, x, y):
        self.width = 40
        self.height = 30
        self.x = x
        self.y = y

    def get_rect(self):
        return pygame.Rect(self.x, self.y, self.width, self.height)

    def draw(self, surface):
        pygame.draw.rect(surface, RED, (self.x, self.y, self.width, self.height))


def create_enemy_fleet():
    """(Unchanged from Part 5.)"""
    enemies = []
    spacing_x = 90
    spacing_y = 70
    start_x = 60
    start_y = 50
    for row in range(ENEMY_ROWS):
        for col in range(ENEMY_COLS):
            x = start_x + col * spacing_x
            y = start_y + row * spacing_y
            enemies.append(Enemy(x, y))
    return enemies


def move_fleet(enemies, direction):
    """(Unchanged from Part 5.)"""
    edge_hit = False
    for enemy in enemies:
        enemy.x += ENEMY_SPEED * direction
        if enemy.x <= 0 or enemy.x + enemy.width >= SCREEN_WIDTH:
            edge_hit = True

    if edge_hit:
        for enemy in enemies:
            enemy.y += ENEMY_DROP
        direction *= -1

    return direction


class Bullet:
    """A laser bullet fired by the player, travelling straight up. (Unchanged.)"""

    def __init__(self, x, y):
        self.width = 4
        self.height = 12
        self.x = x
        self.y = y
        self.speed = BULLET_SPEED

    def move(self):
        self.y -= self.speed

    def get_rect(self):
        return pygame.Rect(self.x, self.y, self.width, self.height)

    def draw(self, surface):
        pygame.draw.rect(surface, YELLOW, (self.x, self.y, self.width, self.height))

    def is_off_screen(self):
        return self.y + self.height < 0


def handle_collisions(bullets, enemies, score):
    """(Unchanged from Part 5.)"""
    surviving_bullets = []
    for bullet in bullets:
        hit_enemy = None
        for enemy in enemies:
            if bullet.get_rect().colliderect(enemy.get_rect()):
                hit_enemy = enemy
                break
        if hit_enemy is not None:
            enemies.remove(hit_enemy)
            score += POINTS_PER_ENEMY
        else:
            surviving_bullets.append(bullet)
    return surviving_bullets, score


def handle_player_damage(player, enemies):
    """(Unchanged from Part 5.)"""
    surviving_enemies = []
    for enemy in enemies:
        reached_bottom = enemy.y + enemy.height >= SCREEN_HEIGHT
        hit_player = enemy.get_rect().colliderect(player.get_rect())
        if reached_bottom or hit_player:
            player.take_damage(ENEMY_REACHED_BOTTOM_DAMAGE)
        else:
            surviving_enemies.append(enemy)
    return surviving_enemies


def draw_score(surface, score):
    """(Unchanged from Part 5.)"""
    text = font.render(f"Score: {score}", True, WHITE)
    surface.blit(text, (10, 10))


def draw_health(surface, health):
    """(Unchanged from Part 5.)"""
    text = font.render(f"Health: {health}", True, WHITE)
    surface.blit(text, (SCREEN_WIDTH - text.get_width() - 10, 10))


# NEW: the Game class ties every piece above into one organized whole.
# Instead of loose variables sitting inside main(), each piece of game
# data (player, enemies, bullets, score, state) becomes an attribute of
# a single Game object, and the three jobs every frame needs - reacting
# to events, updating the world, and drawing it - become its methods.
class Game:
    """Owns all game data and runs the menu -> playing -> game over flow."""

    def __init__(self):
        self.state = STATE_MENU
        self.player = None
        self.enemies = []
        self.fleet_direction = 1
        self.bullets = []
        self.score = 0

    def reset(self):
        """Start a brand new round: fresh player, fresh fleet, score back to 0."""
        self.player = Player()
        self.enemies = create_enemy_fleet()
        self.fleet_direction = 1
        self.bullets = []
        self.score = 0
        self.state = STATE_PLAYING

    def handle_event(self, event):
        """React to one pygame event. Returns False if the game should quit."""
        if event.type == pygame.QUIT:
            return False

        if event.type == pygame.KEYDOWN:
            if self.state == STATE_MENU:
                if event.key in (pygame.K_SPACE, pygame.K_RETURN):
                    self.reset()
            elif self.state == STATE_PLAYING:
                if event.key == pygame.K_SPACE:
                    bullet_x = self.player.x + self.player.width // 2 - 2
                    bullet_y = self.player.y
                    self.bullets.append(Bullet(bullet_x, bullet_y))
            elif self.state == STATE_GAME_OVER:
                if event.key == pygame.K_r:
                    self.reset()

        return True

    def update(self):
        """Advance the world by one frame. Only does anything while playing."""
        if self.state != STATE_PLAYING:
            return

        keys = pygame.key.get_pressed()
        self.player.move(keys)
        self.fleet_direction = move_fleet(self.enemies, self.fleet_direction)

        for bullet in self.bullets:
            bullet.move()
        self.bullets = [b for b in self.bullets if not b.is_off_screen()]

        self.bullets, self.score = handle_collisions(self.bullets, self.enemies, self.score)
        self.enemies = handle_player_damage(self.player, self.enemies)

        if not self.enemies:
            self.enemies = create_enemy_fleet()

        if not self.player.is_alive():
            self.state = STATE_GAME_OVER

    def draw(self, surface):
        """Draw whichever screen matches the current state."""
        surface.fill(BLACK)
        if self.state == STATE_MENU:
            self.draw_menu(surface)
        elif self.state == STATE_PLAYING:
            self.draw_playing(surface)
        elif self.state == STATE_GAME_OVER:
            self.draw_playing(surface)
            self.draw_game_over_overlay(surface)

    def draw_menu(self, surface):
        title = big_font.render("COSMIC DEFENDER", True, CYAN)
        title_rect = title.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 - 40))
        surface.blit(title, title_rect)

        hint = font.render("Press SPACE to start", True, WHITE)
        hint_rect = hint.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 + 30))
        surface.blit(hint, hint_rect)

        controls = font.render("Arrow keys / A D to move, SPACE to shoot", True, GRAY)
        controls_rect = controls.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 + 70))
        surface.blit(controls, controls_rect)

    def draw_playing(self, surface):
        self.player.draw(surface)
        for enemy in self.enemies:
            enemy.draw(surface)
        for bullet in self.bullets:
            bullet.draw(surface)
        draw_score(surface, self.score)
        draw_health(surface, self.player.health)

    def draw_game_over_overlay(self, surface):
        text = big_font.render("GAME OVER", True, RED)
        text_rect = text.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 - 20))
        surface.blit(text, text_rect)

        hint = font.render("Press R to restart", True, WHITE)
        hint_rect = hint.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 + 30))
        surface.blit(hint, hint_rect)


def main():
    game = Game()  # NEW: one object now holds everything main() used to track
    running = True

    while running:
        clock.tick(FPS)

        for event in pygame.event.get():
            running = game.handle_event(event)

        game.update()
        game.draw(screen)
        pygame.display.flip()

    pygame.quit()
    sys.exit()


if __name__ == "__main__":
    main()
\`\`\`

## Code Walkthrough

- \`STATE_MENU = "menu"\` (and the other two) — plain strings, not some special Python "enum" type; comparing strings with \`==\` is simple, readable, and more than good enough for a game this size.
- \`class Game:\` with \`def __init__(self):\` — sets up \`self.state = STATE_MENU\` and placeholder values (\`self.player = None\`, \`self.enemies = []\`) since nothing is actually playable yet until \`reset()\` is called.
- \`def reset(self):\` — notice this is almost line-for-line the same setup code that used to sit at the very top of \`main()\` in every previous version; moving it into a method didn't require rewriting the logic, just relocating it and adding \`self.\` in front of each variable.
- \`def handle_event(self, event):\` — returns \`True\` to mean "keep running" and \`False\` to mean "quit," which is why \`main()\` now writes \`running = game.handle_event(event)\` instead of setting \`running = False\` directly.
- \`if self.state == STATE_MENU: if event.key in (pygame.K_SPACE, pygame.K_RETURN): self.reset()\` — pressing space *or* enter on the menu both start the game, by simply calling the same \`reset()\` used elsewhere.
- \`def update(self): if self.state != STATE_PLAYING: return\` — an early \`return\` is a clean way to say "do nothing at all unless we're actually playing," replacing the old \`if not game_over:\` wrapper around a big indented block.
- \`def draw(self, surface): surface.fill(BLACK)\` then \`if self.state == STATE_MENU: self.draw_menu(surface)\` and so on — one \`draw()\` method decides *which* screen to show, while three small, separate methods each know how to draw exactly one of those screens.
- \`elif self.state == STATE_GAME_OVER: self.draw_playing(surface); self.draw_game_over_overlay(surface)\` — drawing the game-over screen *first* draws the final frozen battle, then draws the "GAME OVER" text on top of it, so the player can see exactly how the mission ended.
- \`def main(): game = Game()\` then the loop body \`for event in pygame.event.get(): running = game.handle_event(event)\` → \`game.update()\` → \`game.draw(screen)\` → \`pygame.display.flip()\` — four short lines now do everything that used to take dozens of lines directly inside \`main()\`.

## Build Instructions

1. Continue inside the same Cosmic Defender project on Pickcode — Part 6 is the final version, building directly on Part 5.
2. Add the three state constants and \`GRAY\` to your existing \`main.py\`.
3. Build the \`Game\` class method by method: start with \`__init__\` and \`reset()\`, then \`handle_event()\`, then \`update()\`, then the three draw methods.
4. Replace the body of \`main()\` with the short version that creates one \`Game\` and delegates to its three methods every frame.
5. Run the game: confirm it opens on a menu, space starts a fresh game, everything from Parts 1–5 still works exactly as before, losing shows a game-over screen over the frozen final frame, and pressing \`R\` takes you straight back into a brand-new game.

## Student Mission

1. Add a fourth piece of text to the menu screen showing the high score from your *previous* run (store it as \`self.high_score\` on \`Game\`, update it inside \`reset()\` by comparing against the score you're about to erase).
2. Change the menu's title text, colors, or layout to make it feel like your own game.
3. Add a short "Paused" state: pressing \`P\` while \`STATE_PLAYING\` switches to a new \`STATE_PAUSED\`, drawing the frozen playing screen with a "PAUSED — press P to resume" message, and pressing \`P\` again switches back.

## Challenge

Add a difficulty selection to the menu: before starting, let the player press \`1\`, \`2\`, or \`3\` to choose easy/medium/hard, storing the choice as \`self.difficulty\` on \`Game\`. Use it inside \`reset()\` to scale \`ENEMY_SPEED\` or \`STARTING_HEALTH\` accordingly (for example, hard mode could use a faster fleet and only 2 starting health). This is a great exercise in letting player choices affect how \`reset()\` builds the game.

## Common Mistakes

- **Forgetting \`self.\` when moving code into the \`Game\` class** — code copied from the old \`main()\` will reference bare names like \`player\` and \`score\`; every one of those needs to become \`self.player\` and \`self.score\` once it lives inside a method.
- **Calling \`self.reset()\` without updating \`self.state\`** — if \`reset()\` forgets to set \`self.state = STATE_PLAYING\` at the end, the game will look like it's stuck on the menu even though a fresh player and fleet were created.
- **Checking the wrong state in \`handle_event\`** — for example, checking for the \`R\` key while \`self.state == STATE_PLAYING\` instead of \`STATE_GAME_OVER\` would let the player accidentally restart mid-game.
- **Putting gameplay logic in \`draw()\` instead of \`update()\`** — mixing "deciding what happens" with "drawing what already happened" makes a \`Game\` class much harder to follow; keep \`update()\` focused purely on changing state, and \`draw()\` focused purely on displaying it.

## Debugging Tips

- If the game starts directly in gameplay instead of on the menu, check that \`Game.__init__\` sets \`self.state = STATE_MENU\`, not \`STATE_PLAYING\`.
- If pressing space on the menu does nothing, add a temporary \`print(self.state)\` inside \`handle_event\` to confirm the method is even being reached with the state you expect.
- If restarting seems to "half work" (for example, the score resets but old enemies remain), check that every single piece of game data is reset inside \`reset()\`, not just some of it.
- If the window never responds to being closed once you reach the menu or game-over screen, double-check that the \`QUIT\` check in \`handle_event\` runs *before* any state-specific checks, so it always applies no matter the current state.

## Check Your Understanding

- In your own words, what is a state machine, and what are Cosmic Defender's three states?
- Why does moving existing code into the \`Game\` class mostly just mean adding \`self.\` in front of variable names, rather than rewriting the logic itself?
- Why is it useful that \`reset()\` is called from two different places (starting fresh, and restarting after a loss) instead of writing similar setup code twice?

## Mini Quiz

1. What is a state machine, as used in Cosmic Defender?
   a) A physical machine  b) A pattern where the game is always in exactly one named state that decides its current behavior  c) A type of enemy  d) A way to speed up the game loop

2. What does \`Game.reset()\` do?
   a) Closes the game window  b) Sets up a fresh player, fleet, and score, and switches the state to playing  c) Deletes the Game class  d) Pauses the game

3. Why does \`update()\` start with \`if self.state != STATE_PLAYING: return\`?
   a) To crash the game intentionally  b) So gameplay only advances while actually in the playing state, doing nothing otherwise  c) To reset the score every frame  d) It has no real purpose

4. What does \`main()\` look like after this lesson, compared to Part 5?
   a) Identical, nothing changed  b) Much longer, with more gameplay code directly inside it  c) Much shorter — it creates one \`Game\` object and calls its \`handle_event\`, \`update\`, and \`draw\` methods  d) Completely deleted

5. According to this lesson, what happened to the player, enemies, bullets, and score variables that used to live directly inside \`main()\`?
   a) They were deleted and the features no longer exist  b) They still exist, now as attributes of the \`Game\` object, instead of loose variables  c) They were moved into the \`Enemy\` class  d) Nothing changed about them at all

6. (Code reading) If \`self.state == STATE_GAME_OVER\` and the player presses the \`R\` key, what should \`handle_event\` do?
   a) Nothing  b) Fire a bullet  c) Call \`self.reset()\`, returning the game to \`STATE_PLAYING\`  d) Quit the program

### Answer Key

1. b — a pattern where the game is always in exactly one named state that decides its current behavior
2. b — sets up a fresh player, fleet, and score, and switches the state to playing
3. b — so gameplay only advances while actually in the playing state
4. c — much shorter, delegating to \`handle_event\`, \`update\`, and \`draw\`
5. b — they still exist, now as attributes of the \`Game\` object
6. c — call \`self.reset()\`, returning the game to \`STATE_PLAYING\`

## Lesson Recap

Today you completed Cosmic Defender: a real main menu, a proper restart flow, and every system you built across five earlier lessons — movement, the enemy fleet, lasers, combat and scoring, health and survival — reorganized into one clean \`Game\` class with three clear jobs: \`handle_event\`, \`update\`, and \`draw\`. Nothing about how the game *plays* changed today; only how the code that runs it is *organized* — and that organization is exactly what let a simple menu and restart button slot in so cleanly.

## Homework / Practice Mission

Using only what you learned today (states and the \`Game\` class — this is the final version, so nothing further to forward-reference), implement the "Paused" state described in the Student Mission above: pressing \`P\` during \`STATE_PLAYING\` should freeze the game and show a "PAUSED" message, and pressing \`P\` again should resume exactly where play left off, with health, score, and enemy positions all unchanged.

## Portfolio Project Connection

Cosmic Defender is complete — a full 6-part Pygame project, built one working piece at a time, with nothing ever thrown away along the way. Next lesson, you'll step back from building anything new and instead polish, test, and showcase both Cosmic Defender and your Lesson 10 Ship Status Simulator as finished, presentable projects.`,
    codeSnippets: [
      {
        label: `Cosmic Defender — Part 6 (Final) Code (main.py)`,
        language: 'python',
        part: 'reference',
        code: `# Cosmic Defender - Part 6: Menus & Game States (FINAL)
# Advanced Data Science - Lesson 16
# Builds on Part 5 (Player, Enemies, Lasers, Combat & Scoring, Health & Survival).
# Nothing is removed - every class and function from Part 5 is still here.
# The only new idea in this version is the Game class, which organizes
# everything we already built into a main menu -> playing -> game over flow.

import sys
import pygame

# --- Constants ---
SCREEN_WIDTH = 800
SCREEN_HEIGHT = 600
FPS = 60

PLAYER_SPEED = 6

ENEMY_SPEED = 2
ENEMY_DROP = 20
ENEMY_ROWS = 3
ENEMY_COLS = 6

BULLET_SPEED = 10

POINTS_PER_ENEMY = 10

STARTING_HEALTH = 3
ENEMY_REACHED_BOTTOM_DAMAGE = 1

# NEW: the three states our game can be in
STATE_MENU = "menu"
STATE_PLAYING = "playing"
STATE_GAME_OVER = "game_over"

BLACK = (10, 10, 30)
CYAN = (0, 255, 255)
RED = (255, 60, 60)
YELLOW = (255, 255, 0)
WHITE = (255, 255, 255)
GRAY = (160, 160, 160)

# --- Pygame setup ---
pygame.init()
screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
pygame.display.set_caption("Cosmic Defender")
clock = pygame.time.Clock()
font = pygame.font.SysFont(None, 32)
big_font = pygame.font.SysFont(None, 64)


class Player:
    """The player's spaceship. (Unchanged from Part 5.)"""

    def __init__(self):
        self.width = 50
        self.height = 40
        self.x = SCREEN_WIDTH // 2 - self.width // 2
        self.y = SCREEN_HEIGHT - self.height - 20
        self.speed = PLAYER_SPEED
        self.health = STARTING_HEALTH

    def move(self, keys):
        if keys[pygame.K_LEFT] or keys[pygame.K_a]:
            self.x -= self.speed
        if keys[pygame.K_RIGHT] or keys[pygame.K_d]:
            self.x += self.speed

        if self.x < 0:
            self.x = 0
        if self.x > SCREEN_WIDTH - self.width:
            self.x = SCREEN_WIDTH - self.width

    def get_rect(self):
        return pygame.Rect(self.x, self.y, self.width, self.height)

    def take_damage(self, amount=1):
        self.health -= amount
        if self.health < 0:
            self.health = 0

    def is_alive(self):
        return self.health > 0

    def draw(self, surface):
        points = [
            (self.x + self.width // 2, self.y),
            (self.x, self.y + self.height),
            (self.x + self.width, self.y + self.height),
        ]
        pygame.draw.polygon(surface, CYAN, points)


class Enemy:
    """One enemy ship in the fleet. (Unchanged from Part 5.)"""

    def __init__(self, x, y):
        self.width = 40
        self.height = 30
        self.x = x
        self.y = y

    def get_rect(self):
        return pygame.Rect(self.x, self.y, self.width, self.height)

    def draw(self, surface):
        pygame.draw.rect(surface, RED, (self.x, self.y, self.width, self.height))


def create_enemy_fleet():
    """(Unchanged from Part 5.)"""
    enemies = []
    spacing_x = 90
    spacing_y = 70
    start_x = 60
    start_y = 50
    for row in range(ENEMY_ROWS):
        for col in range(ENEMY_COLS):
            x = start_x + col * spacing_x
            y = start_y + row * spacing_y
            enemies.append(Enemy(x, y))
    return enemies


def move_fleet(enemies, direction):
    """(Unchanged from Part 5.)"""
    edge_hit = False
    for enemy in enemies:
        enemy.x += ENEMY_SPEED * direction
        if enemy.x <= 0 or enemy.x + enemy.width >= SCREEN_WIDTH:
            edge_hit = True

    if edge_hit:
        for enemy in enemies:
            enemy.y += ENEMY_DROP
        direction *= -1

    return direction


class Bullet:
    """A laser bullet fired by the player, travelling straight up. (Unchanged.)"""

    def __init__(self, x, y):
        self.width = 4
        self.height = 12
        self.x = x
        self.y = y
        self.speed = BULLET_SPEED

    def move(self):
        self.y -= self.speed

    def get_rect(self):
        return pygame.Rect(self.x, self.y, self.width, self.height)

    def draw(self, surface):
        pygame.draw.rect(surface, YELLOW, (self.x, self.y, self.width, self.height))

    def is_off_screen(self):
        return self.y + self.height < 0


def handle_collisions(bullets, enemies, score):
    """(Unchanged from Part 5.)"""
    surviving_bullets = []
    for bullet in bullets:
        hit_enemy = None
        for enemy in enemies:
            if bullet.get_rect().colliderect(enemy.get_rect()):
                hit_enemy = enemy
                break
        if hit_enemy is not None:
            enemies.remove(hit_enemy)
            score += POINTS_PER_ENEMY
        else:
            surviving_bullets.append(bullet)
    return surviving_bullets, score


def handle_player_damage(player, enemies):
    """(Unchanged from Part 5.)"""
    surviving_enemies = []
    for enemy in enemies:
        reached_bottom = enemy.y + enemy.height >= SCREEN_HEIGHT
        hit_player = enemy.get_rect().colliderect(player.get_rect())
        if reached_bottom or hit_player:
            player.take_damage(ENEMY_REACHED_BOTTOM_DAMAGE)
        else:
            surviving_enemies.append(enemy)
    return surviving_enemies


def draw_score(surface, score):
    """(Unchanged from Part 5.)"""
    text = font.render(f"Score: {score}", True, WHITE)
    surface.blit(text, (10, 10))


def draw_health(surface, health):
    """(Unchanged from Part 5.)"""
    text = font.render(f"Health: {health}", True, WHITE)
    surface.blit(text, (SCREEN_WIDTH - text.get_width() - 10, 10))


# NEW: the Game class ties every piece above into one organized whole.
# Instead of loose variables sitting inside main(), each piece of game
# data (player, enemies, bullets, score, state) becomes an attribute of
# a single Game object, and the three jobs every frame needs - reacting
# to events, updating the world, and drawing it - become its methods.
class Game:
    """Owns all game data and runs the menu -> playing -> game over flow."""

    def __init__(self):
        self.state = STATE_MENU
        self.player = None
        self.enemies = []
        self.fleet_direction = 1
        self.bullets = []
        self.score = 0

    def reset(self):
        """Start a brand new round: fresh player, fresh fleet, score back to 0."""
        self.player = Player()
        self.enemies = create_enemy_fleet()
        self.fleet_direction = 1
        self.bullets = []
        self.score = 0
        self.state = STATE_PLAYING

    def handle_event(self, event):
        """React to one pygame event. Returns False if the game should quit."""
        if event.type == pygame.QUIT:
            return False

        if event.type == pygame.KEYDOWN:
            if self.state == STATE_MENU:
                if event.key in (pygame.K_SPACE, pygame.K_RETURN):
                    self.reset()
            elif self.state == STATE_PLAYING:
                if event.key == pygame.K_SPACE:
                    bullet_x = self.player.x + self.player.width // 2 - 2
                    bullet_y = self.player.y
                    self.bullets.append(Bullet(bullet_x, bullet_y))
            elif self.state == STATE_GAME_OVER:
                if event.key == pygame.K_r:
                    self.reset()

        return True

    def update(self):
        """Advance the world by one frame. Only does anything while playing."""
        if self.state != STATE_PLAYING:
            return

        keys = pygame.key.get_pressed()
        self.player.move(keys)
        self.fleet_direction = move_fleet(self.enemies, self.fleet_direction)

        for bullet in self.bullets:
            bullet.move()
        self.bullets = [b for b in self.bullets if not b.is_off_screen()]

        self.bullets, self.score = handle_collisions(self.bullets, self.enemies, self.score)
        self.enemies = handle_player_damage(self.player, self.enemies)

        if not self.enemies:
            self.enemies = create_enemy_fleet()

        if not self.player.is_alive():
            self.state = STATE_GAME_OVER

    def draw(self, surface):
        """Draw whichever screen matches the current state."""
        surface.fill(BLACK)
        if self.state == STATE_MENU:
            self.draw_menu(surface)
        elif self.state == STATE_PLAYING:
            self.draw_playing(surface)
        elif self.state == STATE_GAME_OVER:
            self.draw_playing(surface)
            self.draw_game_over_overlay(surface)

    def draw_menu(self, surface):
        title = big_font.render("COSMIC DEFENDER", True, CYAN)
        title_rect = title.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 - 40))
        surface.blit(title, title_rect)

        hint = font.render("Press SPACE to start", True, WHITE)
        hint_rect = hint.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 + 30))
        surface.blit(hint, hint_rect)

        controls = font.render("Arrow keys / A D to move, SPACE to shoot", True, GRAY)
        controls_rect = controls.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 + 70))
        surface.blit(controls, controls_rect)

    def draw_playing(self, surface):
        self.player.draw(surface)
        for enemy in self.enemies:
            enemy.draw(surface)
        for bullet in self.bullets:
            bullet.draw(surface)
        draw_score(surface, self.score)
        draw_health(surface, self.player.health)

    def draw_game_over_overlay(self, surface):
        text = big_font.render("GAME OVER", True, RED)
        text_rect = text.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 - 20))
        surface.blit(text, text_rect)

        hint = font.render("Press R to restart", True, WHITE)
        hint_rect = hint.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 + 30))
        surface.blit(hint, hint_rect)


def main():
    game = Game()  # NEW: one object now holds everything main() used to track
    running = True

    while running:
        clock.tick(FPS)

        for event in pygame.event.get():
            running = game.handle_event(event)

        game.update()
        game.draw(screen)
        pygame.display.flip()

    pygame.quit()
    sys.exit()


if __name__ == "__main__":
    main()`,
      },
    ],
    projectLinks: [
      {
        title: `Cosmic Defender v6 (final)`,
        url: `https://app.pickcode.io/project/cmw00y75t0epj31zlvnng0yju`,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // Lesson 17 — Polish & Showcase Your Projects
  // (REWRITTEN again — previously "Packaging and Sharing Your Work" per an
  // earlier redesign pass, originally "Packaging and Sharing Your Game".
  // matchTitle lists both known prior titles so this still applies no
  // matter which one is currently live. This is a review/refinement lesson
  // only: it introduces no new project and reuses only the two URLs already
  // established at Lesson 10 (Ship Status Simulator, Colab) and Lesson 16
  // (Cosmic Defender v6 final, Pickcode) — no invented links.)
  // ─────────────────────────────────────────────────────────────────────
  {
    order: 17,
    matchTitle: [
      `Packaging and Sharing Your Game`,
      `Packaging and Sharing Your Work`,
    ],
    title: `Polish & Showcase Your Projects`,
    objectives: [
      `Re-explain, in your own words, how the major concepts from this module (variables, functions, classes, the game loop, collisions, state machines) show up in your own finished projects.`,
      `Systematically test a program by deliberately trying its edge cases, not just its happy path.`,
      `Identify and fix small readability problems: unclear names, missing comments, leftover debug \`print()\` statements, and inconsistent style.`,
      `Write a short, clear project description that explains what a program does and how to run it.`,
      `Explain what makes a good live demo of a project you built.`,
    ],
    homework: `Finish both review checklists if you haven't already, and give your two-minute demo of Cosmic Defender (and, if time allows, the Ship Status Simulator too) to one other person, using the four-part demo structure from the lesson. Write down any question they asked that you couldn't answer immediately.`,
    checkpoint: `Show a completed review checklist for both projects (Ship Status Simulator and Cosmic Defender), with any bugs found during playtesting fixed and a short written summary/README for each.`,
    contentMarkdown: `# Advanced Data Science — Lesson 17: Polish & Showcase Your Projects

**Course/Path:** Cosmic Defender (6-Part Pygame Project)
**Lesson:** 08 of 08
**Title:** Polish & Showcase Your Projects
**Duration:** 60 minutes
**Difficulty:** Beginner
**Technology:** Python 3.10+, Pygame, Google Colab

---

## Mission Brief

Cadet, stand down from active development — today there's no new code to write and no new concept to learn. Today is about two things every real programmer eventually has to do: **making sure what you already built actually works**, and **making it look good enough to show someone else**. You're going to revisit your two biggest projects from this module — the Ship Status Simulator from Lesson 10, and the full 6-part Cosmic Defender you've built since — test them carefully, clean them up, and get them ready to demo with pride.

## Learning Objectives

By the end of this lesson, you will be able to:

1. Re-explain, in your own words, how the major concepts from this module (variables, functions, classes, the game loop, collisions, state machines) show up in your own finished projects.
2. Systematically test a program by deliberately trying its edge cases, not just its "happy path."
3. Identify and fix small readability problems: unclear names, missing comments, leftover debug \`print()\` statements, and inconsistent style.
4. Write a short, clear project description that explains what a program does and how to run it.
5. Explain what makes a good live demo of a project you built.

## What You'll Do

Revisit **both** of your major projects — the Colab-based **Ship Status Simulator** and the Pickcode-based **Cosmic Defender** — and take each through the same three-step process: **test it**, **polish it**, **prepare to show it off**. This lesson introduces no new project and no new game features; everything you need is already sitting in the two projects you've already built.

## Prerequisites

- Completion of Lesson 10 (Ship Status Simulator, in Google Colab).
- Completion of Lessons 11–16 (the complete, 6-part Cosmic Defender, in Pickcode).

## Key Terminology

| Term | Definition |
|---|---|
| **Playtesting** | Deliberately playing or running your own program the way a stranger would, specifically looking for things that feel confusing, broken, or unfinished. |
| **Edge Case** | An unusual or extreme input or situation (very low health, zero enemies, mashing a key rapidly) that's easy to forget to test but often reveals hidden bugs. |
| **Readability** | How easy your code is for another person (or future you) to read and understand, independent of whether it technically works. |
| **Dead Code** | Leftover code that no longer does anything useful — an old \`print()\` left in from debugging, a variable that's set but never used, a commented-out block nobody needs anymore. |
| **Demo** | A short, deliberate walkthrough of a project for an audience, designed to show its best features clearly rather than everything at once. |

## Concept Explanation

There's a big difference between "my code runs without crashing" and "my project actually works well." **Playtesting** is how you find that gap: instead of running your program the one way you always run it while building it, you deliberately try to break it — mash the shoot key as fast as possible, let your health drop to exactly 1, try to move the ship off both edges at once, click through the Cosmic Defender menu a dozen times in a row. Professional developers call these unusual situations **edge cases**, and most real bugs live in exactly these corners, not in the simple, expected path you tested while writing the code.

**Readability** matters just as much as correctness. A working program with a variable named \`x2\` and no comments is much harder for anyone — including you, in six months — to understand than the same program with \`enemy_spawn_timer\` and one short comment explaining a tricky line. Today's polish pass is about going back through code you already know works, and asking: "if a stranger opened this file, would they understand it?"

Finally, every finished project deserves a real **demo** — a short, intentional walkthrough that shows off what it does, rather than just handing someone a file and hoping they figure it out themselves. A good demo has a clear order: say what the project is in one sentence, show it running, point out one or two specific things you're proud of, and explain how to try it themselves.

## Project 01 — Ship Status Simulator: Review Checklist

Open your Lesson 10 Colab notebook and work through this checklist:

- **Re-read \`run_simulation()\` out loud**, explaining to yourself what each line does — variables, the \`check_status()\` function, the \`Ship\` class's \`__init__\` and methods. If any part feels fuzzy, that's exactly what to review from Lesson 10.
- **Playtest it**: run it at least five times (remember, it uses \`random\`, so every run is different) and confirm the final report always makes sense — does "Mission failed" only ever appear when hull integrity actually hit 0?
- **Try an edge case**: temporarily set \`MAX_FUEL = 1\` and rerun — does the simulation handle running out of fuel almost immediately without crashing?
- **Check your homework addition** (the \`Cargo\` class, if you completed it): does \`collect()\` correctly add to the ship's score and mark cargo as collected exactly once, not repeatedly?
- **Clean up**: remove any stray \`print()\` statements you added only for debugging, and make sure every function and class still has a short docstring explaining its purpose.
- **Write a one-paragraph summary** in a Colab text cell above your code, explaining in your own words what the simulator does and which Python concepts it demonstrates.

## Project 02 — Cosmic Defender: Review Checklist

Open your finished \`main.py\` (the Part 6 / final version) and work through this checklist:

- **Re-explain each state**: what exactly happens in \`STATE_MENU\`, \`STATE_PLAYING\`, and \`STATE_GAME_OVER\`, and which method (\`handle_event\`, \`update\`, \`draw\`) is responsible for each one?
- **Playtest the full loop**: start on the menu, play until you deliberately lose, confirm the game-over screen appears correctly over the frozen final frame, then press \`R\` and confirm you get a completely fresh game — zero score, full health, a brand-new fleet.
- **Try edge cases**: what happens if you mash the space bar as fast as possible — do bullets ever behave strangely? What happens if you let the *entire* fleet reach the bottom of the screen at once? What happens if you press \`R\` while still on the menu, or \`SPACE\` while already on the game-over screen (both should safely do nothing)?
- **Trace one full feature across every lesson**: pick one system — shooting, say — and confirm you can point to exactly where it was introduced (Lesson 13), and exactly how it still works, unchanged, inside the finished \`Game\` class.
- **Clean up**: check for consistent naming across every class and function, remove any leftover debug \`print()\` statements, and make sure constants are still grouped clearly near the top of the file.
- **Write a short README** (as a text cell, comment block, or separate note) describing Cosmic Defender in a few sentences: what it is, the controls, and what each of the three screens does.

## Testing & Debugging Guide

Use this general process on *both* projects:

1. **Run the happy path first** — the normal, expected way of using the program — and confirm it still works exactly as it did when you finished building it.
2. **Deliberately try to break it** — unusual key combinations, extreme values, doing things in an unexpected order (like restarting immediately after starting).
3. **Read any error message from the bottom up** — the last line names the actual error type; work upward from there to find which line caused it.
4. **Fix one issue at a time**, re-testing after each fix — fixing several things at once makes it much harder to tell which change actually solved the problem.
5. **Re-run your full playtest** after any fix, to confirm you didn't accidentally break something that used to work.

## Improving Readability & Presentation

- **Naming**: does every variable and function name clearly describe what it holds or does? \`e\` tells a reader nothing; \`enemy\` or \`enemies\` does.
- **Comments**: do your comments explain *why* a tricky line exists, rather than just repeating what the code already says? A comment on \`direction *= -1\` explaining "flips left/right" is useful; a comment on \`self.x = 0\` saying "sets x to 0" is not.
- **Consistency**: do you consistently use the same style for similar things — for example, always \`snake_case\` for variables and functions, always \`PascalCase\` for class names?
- **No dead code**: search both projects for leftover debug \`print()\` statements, unused variables, and commented-out blocks you no longer need, and remove them.

## Preparing to Share

For each project, prepare a short (under two minutes) demo:

1. **One sentence**: what is this project? ("Cosmic Defender is a full arcade space-shooter game I built from scratch in Pygame.")
2. **Show it running**: for Cosmic Defender, play through the menu, a short bit of gameplay, and a game over; for the Ship Status Simulator, run it and read through one interesting part of the output.
3. **Point out one thing you're proud of**: a specific piece of code or behavior — the state machine, the wave-respawn system, the \`Cargo\` class, whatever feels like your own best work.
4. **Explain how someone else could try it**: for Cosmic Defender, the Pickcode link and the controls; for the Ship Status Simulator, the Colab link and how to run the cell.

## Student Mission

1. Complete both review checklists above in full, fixing anything you find.
2. Write the one-paragraph Ship Status Simulator summary and the short Cosmic Defender README described above.
3. Practice your two-minute demo for each project out loud at least once, even if it's just to yourself.

## Common Mistakes

- **Only testing the way you always test it while building** — the single most common way real bugs stay hidden; always deliberately try something you haven't tried before.
- **Polishing code you haven't actually re-read** — skimming instead of reading every line carefully means readability issues and small bugs both slip through.
- **A demo with no clear order** — jumping around a project live, without a plan, makes even an impressive project look messier than it is.
- **Fixing several things at once without re-testing** — makes it easy to accidentally introduce a new bug while fixing an old one, without noticing.

## Debugging Tips

- If you find a bug while playtesting Cosmic Defender, first figure out *which state* it happens in — that tells you whether to look in \`handle_event\`, \`update\`, or one of the \`draw\` methods.
- If you're not sure whether something is dead code, try temporarily removing it and re-running everything — if nothing changes, it was safe to remove.
- When writing your project summaries, try explaining the project out loud to a rubber duck, a pet, or a family member before writing it down — if you stumble explaining a part, that's the part to review more carefully first.
- Keep a short list of every bug you find and fix today — it's genuinely satisfying (and useful for your own learning) to look back at everything you cleaned up in one sitting.

## Check Your Understanding

- What's the difference between testing the "happy path" and testing edge cases, and why do most real bugs hide in the second kind?
- Pick one piece of either project and explain why its current name, comment, or structure is (or isn't) as readable as it could be.
- What are the four parts of a good short demo, in order?

## Mini Quiz

1. What is an "edge case"?
   a) A visual effect at the edge of the screen  b) An unusual or extreme situation that's easy to forget to test but often reveals hidden bugs  c) A type of enemy in Cosmic Defender  d) A syntax error

2. Why is \`enemy_spawn_timer\` a better variable name than \`t\`?
   a) It's longer, and longer is always better  b) It clearly describes what the variable holds, making the code easier to read  c) Python requires descriptive names  d) There's no real difference

3. What should you do after fixing one bug found during playtesting?
   a) Immediately look for a second bug without re-testing  b) Re-run your full playtest to confirm the fix worked and nothing else broke  c) Delete the project and start over  d) Nothing further is needed

4. What is "dead code"?
   a) Code that causes a crash  b) Leftover code that no longer serves any purpose, like a stray debug \`print()\`  c) Any code written more than a day ago  d) Code inside a class

5. What is the first thing a good two-minute demo should say?
   a) A detailed list of every feature  b) One clear sentence explaining what the project is  c) The entire source code  d) A list of known bugs

6. (Scenario) While playtesting Cosmic Defender, you discover that pressing \`R\` while still on the main menu causes an error. Which method should you look in first?
   a) \`draw_menu\`  b) \`handle_event\`, since that's what decides what a key press does in each state  c) \`create_enemy_fleet\`  d) \`move_fleet\`

### Answer Key

1. b — an unusual or extreme situation that often reveals hidden bugs
2. b — it clearly describes what the variable holds
3. b — re-run your full playtest to confirm the fix worked and nothing else broke
4. b — leftover code that no longer serves any purpose
5. b — one clear sentence explaining what the project is
6. b — \`handle_event\`

## Lesson Recap

Today you didn't add a single new feature to either project — and that was the point. You tested both the Ship Status Simulator and the full 6-part Cosmic Defender against situations you hadn't tried before, cleaned up names, comments, and leftover debug code, and prepared a short, clear way to show each one off. Testing, polishing, and presenting your own finished work is just as real a skill as writing it in the first place.

## Homework / Practice Mission

Finish both review checklists if you haven't already, and give your two-minute demo of Cosmic Defender (and, if time allows, the Ship Status Simulator too) to one other person — a classmate, a family member, or a friend — using the four-part structure from "Preparing to Share." Write down any question they asked that you couldn't answer immediately; that's useful information about what to understand even more deeply.

## Portfolio Project Connection

Both the Ship Status Simulator and Cosmic Defender are now finished, tested, and demo-ready — real, complete projects for your programming portfolio, built entirely by you across this module, one working piece at a time.`,
    codeSnippets: [
      {
        label: `Ship Status Simulator — Full Code (Lesson 10)`,
        language: 'python',
        part: 'review',
        code: `"""
Advanced Data Science - Python Game Development, Lesson 01
Ship Status Simulator: Python fundamentals for game development.
"""

import random

MAX_FUEL = 100
MAX_HULL = 100


def check_status(fuel, hull_integrity):
    """Return a short status message based on current ship stats."""
    if hull_integrity <= 0:
        return "CRITICAL: Hull breached! Ship destroyed."
    elif hull_integrity < 30:
        return "WARNING: Hull integrity low!"
    elif fuel <= 0:
        return "CRITICAL: Out of fuel, drifting in space."
    elif fuel < 20:
        return "WARNING: Fuel running low."
    else:
        return "Status nominal. All systems green."


class Ship:
    """Represents a single spaceship and its changing state."""

    def __init__(self, name):
        self.name = name
        self.fuel = MAX_FUEL
        self.hull_integrity = MAX_HULL
        self.x = 0
        self.y = 0
        self.score = 0

    def move(self, dx, dy):
        distance = abs(dx) + abs(dy)
        self.burn_fuel(distance)
        self.x += dx
        self.y += dy

    def burn_fuel(self, amount):
        self.fuel = max(0, self.fuel - amount)

    def take_damage(self, amount):
        self.hull_integrity = max(0, self.hull_integrity - amount)

    def add_score(self, points):
        self.score += points

    def is_alive(self):
        return self.hull_integrity > 0

    def __str__(self):
        return (f"[{self.name}] pos=({self.x},{self.y}) "
                f"fuel={self.fuel} hull={self.hull_integrity} score={self.score}")


def run_simulation(ticks=10):
    ship = Ship("Lumexa Voyager")
    print(f"Launching {ship.name}!\\n")

    for tick in range(1, ticks + 1):
        if not ship.is_alive():
            print(f"Tick {tick}: Ship destroyed. Simulation ended early.")
            break

        dx = random.choice([-2, -1, 0, 1, 2])
        dy = random.choice([-2, -1, 0, 1, 2])
        ship.move(dx, dy)

        if random.random() < 0.2:
            damage = random.randint(5, 15)
            ship.take_damage(damage)
            print(f"Tick {tick}: Asteroid impact! -{damage} hull.")
        else:
            ship.add_score(10)

        print(f"Tick {tick}: {ship} -> {check_status(ship.fuel, ship.hull_integrity)}")

    print("\\n--- Final Report ---")
    print(ship)
    print("Mission complete!" if ship.is_alive() else "Mission failed.")


if __name__ == "__main__":
    run_simulation(ticks=12)`,
      },
      {
        label: `Cosmic Defender — Final Code (Lesson 16)`,
        language: 'python',
        part: 'review',
        code: `# Cosmic Defender - Part 6: Menus & Game States (FINAL)
# Advanced Data Science - Lesson 16
# Builds on Part 5 (Player, Enemies, Lasers, Combat & Scoring, Health & Survival).
# Nothing is removed - every class and function from Part 5 is still here.
# The only new idea in this version is the Game class, which organizes
# everything we already built into a main menu -> playing -> game over flow.

import sys
import pygame

# --- Constants ---
SCREEN_WIDTH = 800
SCREEN_HEIGHT = 600
FPS = 60

PLAYER_SPEED = 6

ENEMY_SPEED = 2
ENEMY_DROP = 20
ENEMY_ROWS = 3
ENEMY_COLS = 6

BULLET_SPEED = 10

POINTS_PER_ENEMY = 10

STARTING_HEALTH = 3
ENEMY_REACHED_BOTTOM_DAMAGE = 1

# NEW: the three states our game can be in
STATE_MENU = "menu"
STATE_PLAYING = "playing"
STATE_GAME_OVER = "game_over"

BLACK = (10, 10, 30)
CYAN = (0, 255, 255)
RED = (255, 60, 60)
YELLOW = (255, 255, 0)
WHITE = (255, 255, 255)
GRAY = (160, 160, 160)

# --- Pygame setup ---
pygame.init()
screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
pygame.display.set_caption("Cosmic Defender")
clock = pygame.time.Clock()
font = pygame.font.SysFont(None, 32)
big_font = pygame.font.SysFont(None, 64)


class Player:
    """The player's spaceship. (Unchanged from Part 5.)"""

    def __init__(self):
        self.width = 50
        self.height = 40
        self.x = SCREEN_WIDTH // 2 - self.width // 2
        self.y = SCREEN_HEIGHT - self.height - 20
        self.speed = PLAYER_SPEED
        self.health = STARTING_HEALTH

    def move(self, keys):
        if keys[pygame.K_LEFT] or keys[pygame.K_a]:
            self.x -= self.speed
        if keys[pygame.K_RIGHT] or keys[pygame.K_d]:
            self.x += self.speed

        if self.x < 0:
            self.x = 0
        if self.x > SCREEN_WIDTH - self.width:
            self.x = SCREEN_WIDTH - self.width

    def get_rect(self):
        return pygame.Rect(self.x, self.y, self.width, self.height)

    def take_damage(self, amount=1):
        self.health -= amount
        if self.health < 0:
            self.health = 0

    def is_alive(self):
        return self.health > 0

    def draw(self, surface):
        points = [
            (self.x + self.width // 2, self.y),
            (self.x, self.y + self.height),
            (self.x + self.width, self.y + self.height),
        ]
        pygame.draw.polygon(surface, CYAN, points)


class Enemy:
    """One enemy ship in the fleet. (Unchanged from Part 5.)"""

    def __init__(self, x, y):
        self.width = 40
        self.height = 30
        self.x = x
        self.y = y

    def get_rect(self):
        return pygame.Rect(self.x, self.y, self.width, self.height)

    def draw(self, surface):
        pygame.draw.rect(surface, RED, (self.x, self.y, self.width, self.height))


def create_enemy_fleet():
    """(Unchanged from Part 5.)"""
    enemies = []
    spacing_x = 90
    spacing_y = 70
    start_x = 60
    start_y = 50
    for row in range(ENEMY_ROWS):
        for col in range(ENEMY_COLS):
            x = start_x + col * spacing_x
            y = start_y + row * spacing_y
            enemies.append(Enemy(x, y))
    return enemies


def move_fleet(enemies, direction):
    """(Unchanged from Part 5.)"""
    edge_hit = False
    for enemy in enemies:
        enemy.x += ENEMY_SPEED * direction
        if enemy.x <= 0 or enemy.x + enemy.width >= SCREEN_WIDTH:
            edge_hit = True

    if edge_hit:
        for enemy in enemies:
            enemy.y += ENEMY_DROP
        direction *= -1

    return direction


class Bullet:
    """A laser bullet fired by the player, travelling straight up. (Unchanged.)"""

    def __init__(self, x, y):
        self.width = 4
        self.height = 12
        self.x = x
        self.y = y
        self.speed = BULLET_SPEED

    def move(self):
        self.y -= self.speed

    def get_rect(self):
        return pygame.Rect(self.x, self.y, self.width, self.height)

    def draw(self, surface):
        pygame.draw.rect(surface, YELLOW, (self.x, self.y, self.width, self.height))

    def is_off_screen(self):
        return self.y + self.height < 0


def handle_collisions(bullets, enemies, score):
    """(Unchanged from Part 5.)"""
    surviving_bullets = []
    for bullet in bullets:
        hit_enemy = None
        for enemy in enemies:
            if bullet.get_rect().colliderect(enemy.get_rect()):
                hit_enemy = enemy
                break
        if hit_enemy is not None:
            enemies.remove(hit_enemy)
            score += POINTS_PER_ENEMY
        else:
            surviving_bullets.append(bullet)
    return surviving_bullets, score


def handle_player_damage(player, enemies):
    """(Unchanged from Part 5.)"""
    surviving_enemies = []
    for enemy in enemies:
        reached_bottom = enemy.y + enemy.height >= SCREEN_HEIGHT
        hit_player = enemy.get_rect().colliderect(player.get_rect())
        if reached_bottom or hit_player:
            player.take_damage(ENEMY_REACHED_BOTTOM_DAMAGE)
        else:
            surviving_enemies.append(enemy)
    return surviving_enemies


def draw_score(surface, score):
    """(Unchanged from Part 5.)"""
    text = font.render(f"Score: {score}", True, WHITE)
    surface.blit(text, (10, 10))


def draw_health(surface, health):
    """(Unchanged from Part 5.)"""
    text = font.render(f"Health: {health}", True, WHITE)
    surface.blit(text, (SCREEN_WIDTH - text.get_width() - 10, 10))


# NEW: the Game class ties every piece above into one organized whole.
# Instead of loose variables sitting inside main(), each piece of game
# data (player, enemies, bullets, score, state) becomes an attribute of
# a single Game object, and the three jobs every frame needs - reacting
# to events, updating the world, and drawing it - become its methods.
class Game:
    """Owns all game data and runs the menu -> playing -> game over flow."""

    def __init__(self):
        self.state = STATE_MENU
        self.player = None
        self.enemies = []
        self.fleet_direction = 1
        self.bullets = []
        self.score = 0

    def reset(self):
        """Start a brand new round: fresh player, fresh fleet, score back to 0."""
        self.player = Player()
        self.enemies = create_enemy_fleet()
        self.fleet_direction = 1
        self.bullets = []
        self.score = 0
        self.state = STATE_PLAYING

    def handle_event(self, event):
        """React to one pygame event. Returns False if the game should quit."""
        if event.type == pygame.QUIT:
            return False

        if event.type == pygame.KEYDOWN:
            if self.state == STATE_MENU:
                if event.key in (pygame.K_SPACE, pygame.K_RETURN):
                    self.reset()
            elif self.state == STATE_PLAYING:
                if event.key == pygame.K_SPACE:
                    bullet_x = self.player.x + self.player.width // 2 - 2
                    bullet_y = self.player.y
                    self.bullets.append(Bullet(bullet_x, bullet_y))
            elif self.state == STATE_GAME_OVER:
                if event.key == pygame.K_r:
                    self.reset()

        return True

    def update(self):
        """Advance the world by one frame. Only does anything while playing."""
        if self.state != STATE_PLAYING:
            return

        keys = pygame.key.get_pressed()
        self.player.move(keys)
        self.fleet_direction = move_fleet(self.enemies, self.fleet_direction)

        for bullet in self.bullets:
            bullet.move()
        self.bullets = [b for b in self.bullets if not b.is_off_screen()]

        self.bullets, self.score = handle_collisions(self.bullets, self.enemies, self.score)
        self.enemies = handle_player_damage(self.player, self.enemies)

        if not self.enemies:
            self.enemies = create_enemy_fleet()

        if not self.player.is_alive():
            self.state = STATE_GAME_OVER

    def draw(self, surface):
        """Draw whichever screen matches the current state."""
        surface.fill(BLACK)
        if self.state == STATE_MENU:
            self.draw_menu(surface)
        elif self.state == STATE_PLAYING:
            self.draw_playing(surface)
        elif self.state == STATE_GAME_OVER:
            self.draw_playing(surface)
            self.draw_game_over_overlay(surface)

    def draw_menu(self, surface):
        title = big_font.render("COSMIC DEFENDER", True, CYAN)
        title_rect = title.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 - 40))
        surface.blit(title, title_rect)

        hint = font.render("Press SPACE to start", True, WHITE)
        hint_rect = hint.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 + 30))
        surface.blit(hint, hint_rect)

        controls = font.render("Arrow keys / A D to move, SPACE to shoot", True, GRAY)
        controls_rect = controls.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 + 70))
        surface.blit(controls, controls_rect)

    def draw_playing(self, surface):
        self.player.draw(surface)
        for enemy in self.enemies:
            enemy.draw(surface)
        for bullet in self.bullets:
            bullet.draw(surface)
        draw_score(surface, self.score)
        draw_health(surface, self.player.health)

    def draw_game_over_overlay(self, surface):
        text = big_font.render("GAME OVER", True, RED)
        text_rect = text.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 - 20))
        surface.blit(text, text_rect)

        hint = font.render("Press R to restart", True, WHITE)
        hint_rect = hint.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 + 30))
        surface.blit(hint, hint_rect)


def main():
    game = Game()  # NEW: one object now holds everything main() used to track
    running = True

    while running:
        clock.tick(FPS)

        for event in pygame.event.get():
            running = game.handle_event(event)

        game.update()
        game.draw(screen)
        pygame.display.flip()

    pygame.quit()
    sys.exit()


if __name__ == "__main__":
    main()`,
      },
    ],
    projectLinks: [
      {
        title: `Project 01 — Ship Status Simulator`,
        url: `https://colab.research.google.com/drive/1QcWpmkzYZ7QcvFu7nT61Jm0HWkM6ryri?usp=sharing`,
      },
      {
        title: `Project 02 — Cosmic Defender`,
        url: `https://app.pickcode.io/project/cmw00y75t0epj31zlvnng0yju`,
      },
    ],
  },
];
