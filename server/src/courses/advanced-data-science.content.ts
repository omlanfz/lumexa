// FILE PATH: server/src/courses/advanced-data-science.content.ts
//
// One-time content migration for the "Advanced Data Science" CUSTOM course
// (slug: advanced-data-science, isCustom: true) — a one-off curriculum an
// admin built via the Custom Curriculum Builder by importing lessons from
// little-coders-path's python-for-young-builders module (orders 1-8) and
// game-creator-path's python-arcade-games module (order 10 and 17). Unlike
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
// gated per-lesson on the lesson's CURRENT title still matching its known
// original value — so re-running this on every boot is a no-op once
// applied, and an admin who has since retitled a lesson by hand is never
// overwritten. Orders 11-16 and 18-46 are deliberately absent from this
// list — left exactly as imported, per the redesign scope.

export interface AdvancedDataScienceLessonFix {
  order: number;
  /** Guard: only applied while the lesson's title is still exactly this. */
  matchTitle: string;
  /** New title — omit to keep the current (matched) title unchanged. */
  title?: string;
  objectives: string[];
  contentMarkdown: string;
  homework: string;
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
      'Extend `ship_status_simulator.py` with a `Cargo` class representing collectible resources. Give it a `value` attribute and a method `collect(self, ship)` that adds its value to `ship.score` and removes the cargo from play (you can use a `collected` boolean flag). Create a list of 5 `Cargo` objects and simulate the ship "encountering" one every few ticks, adding to its score when it does.',
    contentMarkdown: `# Advanced Data Science — Lesson 10: Python Basics for Game Development

**Course/Path:** Python Game Development
**Lesson:** 01 of 08
**Title:** Python Basics for Game Development
**Duration:** 60 minutes
**Difficulty:** Beginner
**Technology:** Python 3.10+

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

A terminal-based **"Ship Status Simulator"** — a text program that tracks a spaceship's position, fuel, and health across a simulated flight, using variables, loops, conditionals, functions, and a \`Ship\` class. This is not a graphical game yet, but every concept here maps directly onto real Pygame code you'll write in the lessons ahead.

## Prerequisites

- Python 3.10+ installed on your machine.
- A code editor (VS Code recommended) with the Python extension.
- No prior Pygame knowledge required.
- Comfortable typing and running a \`.py\` file from a terminal.

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

1. Install Python 3.10 or later from python.org if you haven't already.
2. Open VS Code, install the official "Python" extension from Microsoft if prompted.
3. Create a new folder for this lesson and open it in VS Code.
4. Create \`ship_status_simulator.py\` and paste in the code above.
5. Open a terminal in VS Code (\`\`Ctrl+\` \`\` or \`\`Cmd+\` \`\`) and run:
   \`\`\`
   python ship_status_simulator.py
   \`\`\`
6. You should see 12 lines of simulated flight followed by a final report. Run it several times — since it uses \`random\`, the output changes each time.

No external libraries are needed for this lesson — pure Python only. Pygame installation begins next lesson.

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

Extend \`ship_status_simulator.py\` with a \`Cargo\` class representing collectible resources. Give it a \`value\` attribute and a method \`collect(self, ship)\` that adds its value to \`ship.score\` and removes the cargo from play (you can use a \`collected\` boolean flag). Create a list of 5 \`Cargo\` objects and simulate the ship "encountering" one every few ticks, adding to its score when it does.

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
    projectLinks: null,
  },

  // ─────────────────────────────────────────────────────────────────────
  // Lesson 17 — Packaging and Sharing Your Work
  // (REWRITTEN from "Packaging and Sharing Your Game" — per the redesign,
  // this lesson introduces no new Pygame project; lessons 11-16 are left
  // exactly as imported with no project data yet. Instead it reframes the
  // same packaging/README/sharing skills around the 3 REAL named projects
  // already built in lessons 2-8: Personal Quiz App, Simple Calculator,
  // and Word Guessing Game.)
  // ─────────────────────────────────────────────────────────────────────
  {
    order: 17,
    matchTitle: 'Packaging and Sharing Your Game',
    title: 'Packaging and Sharing Your Work',
    objectives: [
      'Write a clear README that explains what a program does and how to run it.',
      'Organize a project’s files so someone else could open and understand them.',
      'Add meaningful comments to existing code written in earlier lessons.',
      'Share a finished Python project with another person using a Replit or Colab link.',
      'Reflect on and review all three Python Foundations portfolio projects as a complete body of work.',
    ],
    homework:
      'Pick your favorite of the three projects and write a complete README for it at home, including what it does, how to run it, and a short "what I learned" paragraph. Share the project (and its README) with a family member, and write down one question they asked that you’d like to answer even more clearly. Bring it to share next class!',
    contentMarkdown: `# Advanced Data Science — Lesson 17: Packaging and Sharing Your Work

**Course/Path:** Python Game Development
**Lesson:** 08 of 08
**Title:** Packaging and Sharing Your Work
**Duration:** 45–60 minutes
**Difficulty:** Beginner
**Technology:** Python 3.10+, any text editor

---

## Mission Brief
A program that only runs on your own computer, that only you understand, isn't finished — it's still in the workshop. Today's mission isn't about writing a new game; it's about taking the three real projects from your Python Foundations portfolio — the **Personal Quiz App**, the **Simple Calculator**, and the **Word Guessing Game** — and preparing them properly to share: clear documentation, tidy organization, and a way for anyone to try them out.

## Learning Objectives
1. Write a clear README that explains what a program does and how to run it.
2. Organize a project's files so someone else could open and understand them.
3. Add meaningful comments to existing code written in earlier lessons.
4. Share a finished Python project with another person using a Replit or Colab link.
5. Reflect on and review all three Python Foundations portfolio projects as a complete body of work.

## What You'll Learn
You'll learn how real programmers prepare a project to hand off to someone else: writing a **README** (a short document explaining what a project is and how to use it), organizing files so they're easy to navigate, and sharing a working link so a friend, parent, or teacher can try your program themselves — no installation required.

## Why It Matters
Code that works is only useful if someone else can actually use it. A brilliant program with no explanation, confusing file names, and no way to run it might as well not exist to anyone but you. Documentation and packaging are exactly what separates "a program I wrote" from "a project I can proudly share."

## Real-World Connection
- Every project on GitHub — the place professional programmers share code — starts with a README file explaining what it does.
- App stores require a clear description and instructions before anyone can download an app.
- When programmers apply for jobs or scholarships, a well-documented portfolio project is often what gets them noticed.

## Key Terminology
| Term | Definition |
|---|---|
| **README** | A short document that explains what a project is, what it does, and how to run it. |
| **Documentation** | Any writing — comments, READMEs, instructions — that explains how code works to a human reader. |
| **Portfolio** | A collection of finished, documented projects that show off what someone can build. |
| **Share Link** | A URL (like a Replit or Colab link) that lets someone else open and run your project without installing anything. |

## Concept Explanation
A **README** answers the questions a first-time visitor to your project would ask: What is this? What does it do? How do I run it? A good README for the Word Guessing Game, for example, might look like this:

\`\`\`
# Word Guessing Game

A text-based game where Python picks a secret word at random,
and the player has 3 guesses to find it.

## How to run it
1. Open the file in Thonny or Replit.
2. Click Run.
3. Type your guess each time it's your turn.

## What I learned
Lists, the random module, while loops, and comparing
strings fairly using .lower().
\`\`\`

Notice the README doesn't repeat the code — it explains it in plain language, for someone who hasn't read a single line of Python.

**Comments** inside the code itself are a second, closer layer of documentation — short notes explaining *why* a tricky line exists, right where that line lives:

\`\`\`python
# .lower() makes the comparison fair, so "Python" and "python" both count
if guess.lower() == secret_word.lower():
    won = True
\`\`\`

Finally, **sharing** means giving someone a working link — a Replit project or a Colab notebook — rather than a file they have to download and set up themselves. This is exactly how the project buttons on this very page work: one click opens the real project, ready to run.

## Step-by-Step Instruction
1. Pick one of your three projects to start with.
2. Reread the whole program from top to bottom, and add at least three comments explaining tricky or important lines.
3. Write a README with three sections: What It Does, How to Run It, What I Learned.
4. Repeat steps 2–3 for your other two projects.
5. Make sure each project is saved somewhere you can share a link to (a Replit project, or a shared Colab notebook).
6. Practice explaining one of your projects out loud in under 30 seconds, as if introducing it to someone who has never coded.

## Code Example
\`\`\`python
# Personal Quiz App - with documentation comments added

# Collects the player's info and stores it for later use throughout the quiz
name = input("What is your name, quiz champion? ")
age = int(input("How old are you? "))
topic = input("What's your favorite quiz topic? ")

# f-strings combine the stored variables into one natural welcome sentence
print(f"Welcome, {name}! Get ready for a quiz about {topic}.")
print(f"You are {age} years old, which means next year you'll be {age + 1}!")

# score tracks how many questions the player gets right, starting at 0
score = 0

# Each question compares the player's typed answer to the correct one
q1 = input("What is 5 + 5? ")
if q1 == "10":
    print(f"Nice work, {name}!")
    score = score + 1
else:
    print(f"Not quite, {name} — the answer was 10.")

print(f"{name}, you scored {score} out of 1!")
\`\`\`

## Code Explanation
- Comments above each major section explain *why* that section exists, not just repeat what the code obviously does.
- Documentation like this doesn't change how the program runs at all — Python ignores every comment completely.
- Good comments are short and focused on the parts that aren't immediately obvious, like *why* \`.lower()\` is used, or *why* a variable gets reassigned.
- A reader who has never seen this code before should be able to follow the program's logic using the comments alone.

## Expected Output
\`\`\`
What is your name, quiz champion? Maya
How old are you? 11
What's your favorite quiz topic? Space
Welcome, Maya! Get ready for a quiz about Space.
You are 11 years old, which means next year you'll be 12!
What is 5 + 5? 10
Nice work, Maya!
Maya, you scored 1 out of 1!
\`\`\`
(The program's behavior is identical to before — only the documentation around it changed.)

## Guided Practice
1. Write a full README for your Simple Calculator, using the three-section template (What It Does / How to Run It / What I Learned).
2. Add at least two comments to your Word Guessing Game explaining the attempt-counter and the Boolean flag.
3. Read your Personal Quiz App's README out loud to a partner — can they guess what the program does before you tell them?

## Hands-On Activity
Create one combined document (or one page per project) listing all three projects with their READMEs, ready to share as your Python Foundations portfolio.

## Student Challenge
Add a "Known Limitations" section to one README — a short, honest note about something your project doesn't handle yet (for example, "the calculator doesn't check for non-number input yet"). Being upfront about limitations is a real, professional documentation habit.

## Common Mistakes
- **A README that just repeats the code** — it should explain *in plain language*, not restate Python syntax.
- **Comments that state the obvious** — \`# this is a variable\` adds nothing; \`# converts text to a number so math works\` is useful.
- **Skipping "How to Run It"** — even a program you understand perfectly can be a mystery to someone seeing it cold.
- **Sharing a broken or outdated link** — always test your share link yourself, from a different device or incognito window, before sending it to someone else.

## Debugging Guidance
- If a comment is hard to write clearly, that's often a sign the code itself could be simplified or renamed for clarity.
- Ask someone unfamiliar with your project to follow your README exactly — wherever they get confused is exactly what needs rewriting.
- Reread your own README a day later — anything that doesn't immediately make sense to you probably won't make sense to someone else either.

## Mini Quiz
1. What three questions should a good README answer?
2. What's the difference between a README and a code comment?
3. Why is "the program doesn't check for X yet" useful information to share?
4. What should you do before sending someone a share link?
5. True or False: comments change how a Python program actually runs.

### Answer Key
1. What is this? What does it do? How do I run it?
2. A README documents the whole project for someone who hasn't opened the code; a comment documents one specific part, right inside the code.
3. It sets honest expectations and shows the reader you understand your own project's current boundaries.
4. Test it yourself first, ideally from a different device or window, to confirm it actually works.
5. False — Python ignores comments completely; they're for human readers only.

## Lesson Recap
You reviewed and documented all three of your Python Foundations portfolio projects, writing clear READMEs, adding meaningful comments, and preparing each one to be shared with someone who has never seen your code before — turning three working programs into a real, presentable portfolio.

## Homework / Extension
Pick your favorite of the three projects and write a complete README for it at home, including what it does, how to run it, and a short "what I learned" paragraph. Share the project (and its README) with a family member, and write down one question they asked that you'd like to answer even more clearly. Bring it to share next class!

## Portfolio Project Connection
This lesson wraps a bow around your entire Python Foundations portfolio: the **Personal Quiz App**, the **Simple Calculator**, and the **Word Guessing Game**. Every one of them is now documented and ready to open, play, and share directly using the buttons below.`,
    codeSnippets: [
      {
        label: 'Code Example 1',
        language: 'python',
        part: 'reference',
        code: `# Personal Quiz App - with documentation comments added

# Collects the player's info and stores it for later use throughout the quiz
name = input("What is your name, quiz champion? ")
age = int(input("How old are you? "))
topic = input("What's your favorite quiz topic? ")

# f-strings combine the stored variables into one natural welcome sentence
print(f"Welcome, {name}! Get ready for a quiz about {topic}.")
print(f"You are {age} years old, which means next year you'll be {age + 1}!")

# score tracks how many questions the player gets right, starting at 0
score = 0

# Each question compares the player's typed answer to the correct one
q1 = input("What is 5 + 5? ")
if q1 == "10":
    print(f"Nice work, {name}!")
    score = score + 1
else:
    print(f"Not quite, {name} — the answer was 10.")

print(f"{name}, you scored {score} out of 1!")`,
      },
    ],
    projectLinks: [PERSONAL_QUIZ_APP, SIMPLE_CALCULATOR, WORD_GUESSING_GAME],
  },
];
