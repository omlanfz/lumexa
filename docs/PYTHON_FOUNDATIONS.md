# Python Foundations

A beginner program for ages 12–18 who have never written code: **3 courses × 8 lessons = 24 lessons**,
a course test after each course and a final test (**28 sessions**), and **9 portfolio projects**.
It is a core (default) program like Game Creator, so it appears everywhere a program does: the homepage
card (with the Python logo), `/programs`, `/pricing`, the free-trial form, the admin course screens, the
lesson pages, the assessments, the certificate emails and the downloadable curriculum PDF.

| Course | Lessons | Portfolio projects |
|---|---|---|
| 1 · Python Programming Essentials | Python Setup and Your First Program · Variables, Data Types, and Values · User Input, Output, and Operators · Making Decisions with Conditional Logic · Repetition with Python Loops · Working with Strings · Working with Python Collections · Creating Reusable Code with Functions | Smart Calculator · Number Guessing Game · Python Quiz Master |
| 2 · Problem Solving & Program Design | Computational Thinking & Problem Decomposition · Functions in Depth & Modular Programming · Advanced Collections & Nested Data Structures · Algorithms & Problem-Solving Patterns · Debugging, Testing & Fixing Problems · Error Handling & Input Validation · Working with Files & Structured Data · Introduction to Object-Oriented Programming | Text-Based Adventure Game · Personal Expense Tracker · Library Management System |
| 3 · Python Tools & Data Foundations | Python Development Environment & Workflow · Python Modules, Libraries & Packages · Introduction to Jupyter Notebooks · Introduction to NumPy · Introduction to Pandas & DataFrames · Data Cleaning, Summaries & Basic Visualization · Working with APIs & JSON Data · Python Capstone: Build, Document & Share | Dataset Explorer · Live Data Explorer · Student Life Data Explorer |

Course 3 is deliberately **introductory**. NumPy, Pandas, APIs and charts are first steps, not a data-science
course: deeper analysis, statistics, visualization and machine learning belong to the Data Scientist and
AI Builder programs.

## Where everything lives

| What | Where |
|---|---|
| Ages, level, badges, audience (12–18 · Beginner · *Beginner friendly* · *No prior coding experience needed*) | `server/src/courses/program-facts.ts` |
| The course row in the default catalog (title, 🐍, 28 sessions, description) | `server/src/courses/course-catalog.seed.ts` |
| The 24 lessons, as Markdown | `server/prisma/python-foundations/lessons/<course-slug>/NN-*.md` |
| The shape of the program (course/lesson titles, hands-on builds, projects) | `server/prisma/python-foundations/outline.ts` |
| The compiled dataset the seed reads | `server/prisma/curriculum-data/python-foundations-path.json` (generated) |
| The 9 project notebooks | `server/prisma/python-foundations/notebooks/*.ipynb` |
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

## The 9 project notebooks and their Colab links

Every portfolio project is a separate, Colab-ready notebook in `server/prisma/python-foundations/notebooks/`.
They contain no saved output and run top to bottom with **Run all**.

| # | Project | Built in | Session order | Notebook |
|---|---|---|---|---|
| 1 | Smart Calculator | Course 1 · Lesson 3 | 3 | `01-smart-calculator.ipynb` |
| 2 | Number Guessing Game | Course 1 · Lesson 5 | 5 | `02-number-guessing-game.ipynb` |
| 3 | Python Quiz Master | Course 1 · Lesson 8 (capstone) | 8 | `03-python-quiz-master.ipynb` |
| 4 | Text-Based Adventure Game | Course 2 · Lesson 3 | 12 | `04-text-based-adventure-game.ipynb` |
| 5 | Personal Expense Tracker | Course 2 · Lesson 7 | 16 | `05-personal-expense-tracker.ipynb` |
| 6 | Library Management System | Course 2 · Lesson 8 (capstone) | 17 | `06-library-management-system.ipynb` |
| 7 | Dataset Explorer | Course 3 · Lesson 5 | 23 | `07-dataset-explorer.ipynb` |
| 8 | Live Data Explorer | Course 3 · Lesson 7 | 25 | `08-live-data-explorer.ipynb` |
| 9 | Student Life Data Explorer | Course 3 · Lesson 8 (capstone) | 26 | `09-student-life-data-explorer.ipynb` |

The other fifteen lessons each end with a small hands-on build (the lesson's "checkpoint") that students write
during the class, so they have no notebook.

> **Do not run a notebook inside `server/prisma/python-foundations/notebooks/`.** Jupyter starts the kernel in the
> notebook's own folder, so the notebooks that save data files and charts would leave them behind (this once put
> seven generated files into the repository). Run a *copy* in another folder. The build check and
> `python-foundations.spec.ts` fail if anything but the nine `.ipynb` files is in that folder.

**How the notebooks behave**

* Notebooks 1–6 start with a setup cell: `INTERACTIVE = False` makes a scripted `ask()` "type" the answers, so
  *Run all* works without stopping; set `INTERACTIVE = True` to play with real `input()`.
* Notebook 7 downloads a small public table of exoplanets and falls back to a built-in sample when offline.
* Notebook 8 calls a free public API (`api.wheretheiss.at`, no key) and falls back to a saved response, so it never
  fails in class if the network is down.
* Notebook 9 carries its own invented practice survey, so it needs no download.

### Adding the Colab links (admin)

The notebooks are not hosted anywhere yet. Until a link is added, each project lesson shows the project with
**Open Project** and **Copy Link** switched off and the note *Project link coming soon*.

1. Upload a notebook to Google Drive and open it in Google Colab. Set sharing to *Anyone with the link can view*
   (students use *File → Save a copy in Drive*).
2. Open **/admin/courses**, choose the **Curriculum** of *Python Foundations*, find the lesson from the table above
   and click **Edit**.
3. In the **💻 Project** section, paste the Colab link in the row's link field (the project name is already there)
   and **Save**.
4. Open the lesson as a student: **Open Project** and **Copy Link** now work.

Links are stored on the lesson (`Lesson.projectLinks`). The seed only creates the empty project rows when a lesson
has no project data at all; it never overwrites a link an admin has pasted (or a row an admin deleted).

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

* `server/src/courses/python-foundations.spec.ts` — lessons valid, dataset fresh, 3 × 8 × 3 shape, notebooks Colab-ready,
  project rows on the right lessons.
* `server/src/assessments/bank/bank.spec.ts` — bank standard and code answers.
* `server/src/curriculum/lesson-content/*.spec.ts` — every lesson has visuals and an authored four-option quiz.
* `server/src/courses/program-facts.spec.ts`, `curriculum-pdf.spec.ts` — facts, PDF and file names.
* `client/lib/programs.test.ts` — card, logo, order, pricing identical to Game Creator.
* `client/components/curriculum/ProjectLinksSection.test.tsx` — the project card, with and without a link.
