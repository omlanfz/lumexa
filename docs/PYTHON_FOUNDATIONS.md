# Python Foundations

A beginner program for ages 12–18 who have never written code: **3 courses × 8 lessons = 24 lessons**,
a course test after each course and a final test (**28 sessions**), and **9 portfolio projects**.
It is a core (default) program like Game Creator, so it appears everywhere a program does: the homepage
card (with the Python logo), `/programs`, `/pricing`, the free-trial form, the admin course screens, the
lesson pages, the assessments, the certificate emails and the downloadable curriculum PDF.

| Course | Lessons | Portfolio projects |
|---|---|---|
| 1 · Python Programming Essentials | Python Setup and Your First Program · Variables, Data Types, and Values · User Input, Output, and Operators · Making Decisions with Conditional Logic · Repetition with Python Loops · Working with Strings · Working with Python Collections · Creating Reusable Code with Functions | Smart Calculator · Number Guessing Game · Python Quiz Master |
| 2 · Problem Solving & Program Design | Computational Thinking & Problem Decomposition · Functions in Depth & Modular Programming · Advanced Collections & Nested Data Structures · Algorithms & Problem-Solving Patterns · Debugging, Testing & Fixing Problems · Error Handling & Input Validation · Working with Files & Structured Data · Introduction to Object-Oriented Programming | Text-Based Adventure Game · Library Management System · Personal Expense Tracker |
| 3 · Python Tools & Data Foundations | Python Development Environment & Workflow · Python Modules, Libraries & Packages · Introduction to Jupyter Notebooks · Introduction to NumPy · Introduction to Pandas & DataFrames · Data Cleaning, Summaries & Basic Visualization · Working with APIs & JSON Data · Python Capstone: Build, Document & Share | Student Life Data Explorer · Dataset Explorer · Live Data Explorer |

The projects are listed in the order they are built (see the next section).

## Which lesson builds which project

Python Foundations follows the same shape as every other program. In **each course of eight lessons**:

| Lesson | What happens |
|---|---|
| 1 | Introduction: concepts and the short coding exercises that are already in the lesson. **No portfolio project.** |
| 2 – 3 | **Project 1**: Part 1 in lesson 2, Part 2 in lesson 3 |
| 4 – 5 | **Project 2**: Part 1 in lesson 4, Part 2 in lesson 5 |
| 6 – 7 | **Project 3**: Part 1 in lesson 6, Part 2 in lesson 7 |
| 8 | **Recap** of the three projects of the course. No new project. |

Each project sits on the two lessons that teach what it needs:

| Course | Project | Part 1 | Part 2 |
|---|---|---|---|
| 1 | Smart Calculator | L2 Variables, Data Types, and Values | L3 User Input, Output, and Operators |
| 1 | Number Guessing Game | L4 Making Decisions with Conditional Logic | L5 Repetition with Python Loops |
| 1 | Python Quiz Master | L6 Working with Strings | L7 Working with Python Collections |
| 2 | Text-Based Adventure Game | L2 Functions in Depth & Modular Programming | L3 Advanced Collections & Nested Data Structures |
| 2 | Library Management System | L4 Algorithms & Problem-Solving Patterns | L5 Debugging, Testing & Fixing Problems |
| 2 | Personal Expense Tracker | L6 Error Handling & Input Validation | L7 Working with Files & Structured Data |
| 3 | Student Life Data Explorer | L2 Python Modules, Libraries & Packages | L3 Introduction to Jupyter Notebooks |
| 3 | Dataset Explorer | L4 Introduction to NumPy | L5 Introduction to Pandas & DataFrames |
| 3 | Live Data Explorer | L6 Data Cleaning, Summaries & Basic Visualization | L7 Working with APIs & JSON Data |

The *checkpoint* shown on every lesson page (and the project card above it) is the standard one: *Set up your
environment and explore what you'll build this module* (lesson 1), *Part 1 of "…"* and *Part 2 — Finish of "…"*
(lessons 2 – 7) and *Polish, review, and synthesize all 3 projects from this module* (lesson 8). It is created by
`assignStandardCheckpoints` in `server/src/courses/curriculum-catalog.seed.ts`, not by the lesson files. The
order of the projects in `outline.ts` is what decides which pair of lessons each one gets.

Course 3 is deliberately **introductory**. NumPy, Pandas, APIs and charts are first steps, not a data-science
course: deeper analysis, statistics, visualization and machine learning belong to the Data Scientist and
AI Builder programs.

## Where everything lives

| What | Where |
|---|---|
| Ages, level, badges, audience (12–18 · Beginner · *Beginner friendly* · *No prior coding experience needed*) | `server/src/courses/program-facts.ts` |
| The course row in the default catalog (title, 🐍, 28 sessions, description) | `server/src/courses/course-catalog.seed.ts` |
| The 24 lessons, as Markdown | `server/prisma/python-foundations/lessons/<course-slug>/NN-*.md` |
| The shape of the program (course and lesson titles, the three projects of each course in build order) | `server/prisma/python-foundations/outline.ts` |
| The compiled dataset the seed reads | `server/prisma/curriculum-data/python-foundations-path.json` (generated) |
| The 9 project notebooks | `server/prisma/python-foundations/notebooks/*.ipynb` |
| Project link rows of every lesson (empty until an admin pastes a Colab link) | `PYTHON_FOUNDATIONS_PROJECT_LINKS` in `server/src/courses/curriculum-catalog.seed.ts` |
| Moving a database that was seeded by the previous release to this pattern | `server/src/courses/python-foundations.upgrade.ts` |
| Visuals of every lesson | `server/src/curriculum/lesson-content/catalog/python-foundations.ts` |
| The Mini Quiz of every lesson (5 four-option multiple-choice questions) | `server/src/curriculum/lesson-content/catalog/python-foundations-quiz.ts` |
| 3 course tests (30 multiple-choice + 10 true/false = 40 marks) | `server/src/assessments/bank/course-tests/python-programming-essentials.ts`, `problem-solving-program-design.ts`, `python-tools-data-foundations.ts` |
| Final test (25 + 5 + a 20-mark practical = 50 marks) | `server/src/assessments/bank/final-tests/python-foundations-path.ts` |
| Curriculum PDF | `server/prisma/curriculum-pdf/content/python-foundations.ts` → `client/public/curriculums/python-foundations-curriculum.pdf` |
| Card look, tagline, price, PDF link, logo | `client/lib/programs.ts` (`PRESETS['python-foundations']`) |
| The Python logo | `client/public/brand/python-logo.svg` (the card icon is `client/components/marketing/ProgramIcon.tsx`) |

## Pricing

Identical to Game Creator, because both use `blockPrice: 6000` and prices are computed from it
(`client/lib/pricing.ts`):

* **Private 1:1** — ৳6,000 per 8 lessons
* **Small Learning Batch** — ৳3,600 per 8 lessons (60%)
* **Whole program paid upfront** — the same 10% specialized-program discount (28 sessions: ৳21,000 → ৳18,900 for 1:1,
  ৳12,600 → ৳11,340 for a batch)

A test in `client/lib/programs.test.ts` pins this to Game Creator.

## Editing the lessons

Each lesson is one Markdown file with the same twelve sections (Mission Brief, Learning Objectives, Prerequisites,
Concept Explanation, Key Vocabulary, Code Example, Instructor-Guided Coding Walkthrough, Student Mission, Common
Mistakes, Lesson Recap, Homework / Extension Mission, Portfolio Connection). The Mini Quiz is **not** in the
Markdown: it lives in the quiz catalog so every question is exactly four-option multiple choice.

The **Portfolio Connection** of a lesson says which project (and which part) the lesson belongs to. Keep it in step
with the table above: the introduction and the recap name all three projects, every other lesson names *its*
project and "(Part 1)" or "(Part 2)". `python-foundations.spec.ts` checks this for all 24 lessons.

After editing a lesson, rebuild the dataset and check it:

```bash
cd server
npm run build:python-foundations              # rewrites prisma/curriculum-data/python-foundations-path.json
npm run build:python-foundations -- --check   # fails if the lessons have a problem, or the JSON is out of date
npm run export:public-catalog                 # only if a lesson TITLE changed (client/lib/catalog-snapshot.json)
npm run export:curriculum-pdfs -- --program python-foundations   # only if titles or projects changed
```

`src/courses/python-foundations.spec.ts` fails in CI when the JSON on disk is not the build of the lessons.
The Python in every `Code Example` block is syntax-checked, and the "Expected output" blocks were checked by
running the code.

Lessons that are already in a database are **not** rewritten on boot (an admin may have edited them). To change
what a live lesson says, edit it in **/admin/courses → Curriculum → the lesson → Edit**, or use the existing
lesson-content upgrade tooling ([LESSON_CONTENT_UPGRADE.md](LESSON_CONTENT_UPGRADE.md)).

### Moving an existing database to the project pattern

A database that was seeded by the previous release of Python Foundations (each project in the one lesson that built
it, with a *Hands-on build* checkpoint on every lesson) is brought across on the next boot by
`upgradePythonFoundations` (`server/src/courses/python-foundations.upgrade.ts`, called from the curriculum seed). A new
database is seeded straight into the new pattern and needs nothing.

The upgrade is **admin-safe and idempotent**. For every lesson it replaces a value only while it is still *exactly*
what the previous release wrote, so anything an administrator changed is left alone and a second boot changes nothing:

| What | Replaced only while it is still… |
|---|---|
| the checkpoint | the previous *Hands-on build* / *Capstone project* line |
| the lesson's project | the project the previous release attached |
| the project-link row | the previous empty placeholder (**a pasted Colab link is never touched**) |
| the lesson text and homework | byte-for-byte the previous text (compared by SHA-256), with the seeded quiz and visuals |
| the order and wording of a project | what the previous release wrote |

The fingerprints live in `PYTHON_FOUNDATIONS_PREVIOUS` and `PYTHON_FOUNDATIONS_PREVIOUS_PROJECTS` in the same file; the
rules are unit-tested in `python-foundations.spec.ts`. Once every environment has been upgraded the file can be
deleted together with its call in `seedCurriculumContent`.

## The 9 project notebooks and their Colab links

Every portfolio project is a separate, Colab-ready notebook in `server/prisma/python-foundations/notebooks/`. A
notebook is deliberately simple: **one short description (text) cell and one code cell** that holds the whole
program, with no saved output. The program is written in two parts that match the two lessons of the project: the
code cell is divided with `PART 1 · Lesson N` and `PART 2 · Lesson M` banners, and uses only what those lessons (and
the ones before them) teach.

| Project | Course · lessons | Notebook |
|---|---|---|
| Smart Calculator | 1 · lessons 2–3 | `01-smart-calculator.ipynb` |
| Number Guessing Game | 1 · lessons 4–5 | `02-number-guessing-game.ipynb` |
| Python Quiz Master | 1 · lessons 6–7 | `03-python-quiz-master.ipynb` |
| Text-Based Adventure Game | 2 · lessons 2–3 | `04-text-based-adventure-game.ipynb` |
| Library Management System | 2 · lessons 4–5 | `06-library-management-system.ipynb` |
| Personal Expense Tracker | 2 · lessons 6–7 | `05-personal-expense-tracker.ipynb` |
| Student Life Data Explorer | 3 · lessons 2–3 | `09-student-life-data-explorer.ipynb` |
| Dataset Explorer | 3 · lessons 4–5 | `07-dataset-explorer.ipynb` |
| Live Data Explorer | 3 · lessons 6–7 | `08-live-data-explorer.ipynb` |

(The file numbers follow the order the projects were first listed in, not the order they are built, so use the
project name and the lessons above when you pick a file.) Lesson 1 of each course has no project, and lesson 8 of each
course recaps the three projects, so those lessons have no notebook of their own.

> **Do not run a notebook inside `server/prisma/python-foundations/notebooks/`.** Jupyter starts the kernel in the
> notebook's own folder, so a notebook that saves a file would leave it behind (this once put seven generated files
> into the repository). Run a *copy* in another folder. The build check and `python-foundations.spec.ts` fail if
> anything but the nine `.ipynb` files is in that folder.

**How the notebooks behave**

* **Smart Calculator, Number Guessing Game, Python Quiz Master, Text-Based Adventure Game, Library Management System**
  and **Personal Expense Tracker** are interactive: the student runs the cell and types the answers into the boxes
  that appear (`input()`). The Personal Expense Tracker also saves `expenses.json` and `expenses.csv` in the files of
  the Colab session.
* **Student Life Data Explorer** carries its own invented practice survey, so it needs no download and prints a
  top-to-bottom report.
* **Dataset Explorer** downloads a small public table of exoplanets and falls back to a built-in sample when the
  download does not work, so it never fails in class.
* **Live Data Explorer** cleans a saved sample of ISS readings and draws three charts (Part 1), then calls a free
  public API (`api.wheretheiss.at`, no key) for live readings (Part 2). If the API cannot be reached it uses saved
  readings and says so.

### Adding the Colab links (admin)

The notebooks are not hosted anywhere yet. Until a link is added, each project lesson shows the project with
**Open Project** and **Copy Link** switched off and the note *Project link coming soon*.

1. Upload a notebook to Google Drive and open it in Google Colab. Set sharing to *Anyone with the link can view*
   (students use *File → Save a copy in Drive*).
2. Open **/admin/courses**, choose the **Curriculum** of *Python Foundations*, find the lesson from the tables above
   and click **Edit**. A project shows on its two lessons (for example Smart Calculator on lessons 2 and 3 of
   Course 1) and, with the other two projects of the course, on lesson 8, so paste its link in each of those three
   lessons.
3. In the **💻 Project** section, paste the Colab link in the row's link field (the project name is already there)
   and **Save**.
4. Open the lesson as a student: **Open Project** and **Copy Link** now work.

Links are stored on the lesson (`Lesson.projectLinks`). The seed only creates the empty project rows when a lesson
has no project data at all; it never overwrites a link an admin has pasted (or a row an admin deleted). The same is
true of AI Builder and Data Scientist.

## Assessments

Registered like every other program: `python-foundations` is in `CATALOG_COURSE_SLUGS`, the three course-test
banks are keyed by course slug and the final-test bank by `python-foundations`. The banks follow the platform
standard (`bank.validate.ts`): exact formats, no setup/install wording, balanced answer positions, and every
code-reading answer is verified by running the Python.

```bash
cd server
npm run verify:banks                 # validates every bank
BANK_VERIFY_PYTHON=/path/to/python npx jest src/assessments/bank   # also runs the code answers (needs numpy + pandas)
```

The final test's practical is the *Mission Log Analyser* (15 minutes, 20 marks, a four-criterion rubric).

## Logo

The card shows the Python logo (`client/public/brand/python-logo.svg`, the "python-original" mark from the
[devicon](https://github.com/devicons/devicon) set, MIT licensed). The Python logo is a trademark of the Python
Software Foundation; it is used here to say that the program teaches Python, not to suggest endorsement.

## Checks that guard this program

* `server/src/courses/python-foundations.spec.ts` — lessons valid, dataset fresh, 3 × 8 × 3 shape, the project pattern
  of every lesson (checkpoint, project, link rows, and what its Portfolio Connection says), the nine notebooks (two
  cells, Colab-ready, naming the right lessons, valid Python) and the rules of the upgrade for existing databases.
* `server/src/assessments/bank/bank.spec.ts` — bank standard and code answers.
* `server/src/curriculum/lesson-content/*.spec.ts` — every lesson has visuals and an authored four-option quiz.
* `server/src/courses/program-facts.spec.ts`, `curriculum-pdf.spec.ts` — facts, PDF and file names.
* `client/lib/programs.test.ts` — card, logo, order, pricing identical to Game Creator.
* `client/components/curriculum/ProjectLinksSection.test.tsx` — the project card, with and without a link.
