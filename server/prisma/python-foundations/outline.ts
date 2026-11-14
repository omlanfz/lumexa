// FILE PATH: server/prisma/python-foundations/outline.ts
//
// The shape of the Python Foundations program: its three courses ("modules"), the eight
// lessons of each (in order), and the nine portfolio projects. The lesson TEXT lives in
// ./lessons/<module-slug>/<file>.md; build.ts joins the two into
// server/prisma/curriculum-data/python-foundations-path.json, the dataset the course seed
// reads (like every other pathway).
//
// THE PROJECT PATTERN (the same standard shape as every other program; see
// assignStandardCheckpoints in src/courses/curriculum-catalog.seed.ts):
//
//   Lesson 1      intro: concepts and the short exercises in the lesson, no portfolio project
//   Lessons 2-3   project 1 of the course, Part 1 and Part 2 (the notebook is the same for both)
//   Lessons 4-5   project 2, Part 1 and Part 2
//   Lessons 6-7   project 3, Part 1 and Part 2
//   Lesson 8      recap of the three projects (no new project)
//
// So the ORDER of `projects` below is the order they are built in, and it decides which pair of
// lessons each one gets. Each project finishes in the lesson that teaches the tool it is about:
//
//   Course 1  Smart Calculator (variables, then input and operators) · Number Guessing Game
//             (decisions, then loops) · Python Quiz Master (strings, then collections)
//   Course 2  Text-Based Adventure Game (functions, then nested data) · Library Management
//             System (algorithms, then testing) · Personal Expense Tracker (validation and
//             errors, then files)
//   Course 3  Student Life Data Explorer (modules, then notebooks) · Dataset Explorer (NumPy,
//             then Pandas) · Live Data Explorer (cleaning and charts, then APIs and JSON)
//
// Project titles follow the Python Foundations curriculum document. Keep them in step with
// server/prisma/curriculum-pdf/content/python-foundations.ts.

export interface OutlineProject {
  slug: string;
  title: string;
  /** What the student builds — one sentence, shown in the admin course builder. */
  description: string;
  /** The Google Colab notebook (an .ipynb file in ./notebooks) that this project is. */
  notebook: string;
}

export interface OutlineLesson {
  /** File name (without .md) in ./lessons/<module-slug>/. */
  file: string;
  /** The lesson title shown on the lesson page. */
  title: string;
}

export interface OutlineModule {
  slug: string;
  title: string;
  /** In the order they are built: project 1 = lessons 2-3, project 2 = lessons 4-5, project 3 = lessons 6-7. */
  projects: OutlineProject[];
  lessons: OutlineLesson[];
}

export const PATHWAY_FILE = 'python-foundations-path';

export const OUTLINE: OutlineModule[] = [
  {
    slug: 'python-programming-essentials',
    title: 'Python Programming Essentials',
    projects: [
      {
        slug: 'smart-calculator',
        title: 'Smart Calculator',
        description:
          'An interactive calculator that supports different mathematical operations.',
        notebook: '01-smart-calculator.ipynb',
      },
      {
        slug: 'number-guessing-game',
        title: 'Number Guessing Game',
        description:
          'A game with a random secret number, limited attempts, hints and score tracking.',
        notebook: '02-number-guessing-game.ipynb',
      },
      {
        slug: 'python-quiz-master',
        title: 'Python Quiz Master',
        description:
          'A customizable quiz application with questions, answer checking and scoring, built with strings and collections.',
        notebook: '03-python-quiz-master.ipynb',
      },
    ],
    lessons: [
      {
        file: '01-python-setup-and-your-first-program',
        title: 'Python Setup and Your First Program',
      },
      {
        file: '02-variables-data-types-and-values',
        title: 'Variables, Data Types, and Values',
      },
      {
        file: '03-user-input-output-and-operators',
        title: 'User Input, Output, and Operators',
      },
      {
        file: '04-making-decisions-with-conditional-logic',
        title: 'Making Decisions with Conditional Logic',
      },
      {
        file: '05-repetition-with-python-loops',
        title: 'Repetition with Python Loops',
      },
      {
        file: '06-working-with-strings',
        title: 'Working with Strings',
      },
      {
        file: '07-working-with-python-collections',
        title: 'Working with Python Collections',
      },
      {
        file: '08-creating-reusable-code-with-functions',
        title: 'Creating Reusable Code with Functions',
      },
    ],
  },
  {
    slug: 'problem-solving-program-design',
    title: 'Problem Solving & Program Design',
    projects: [
      {
        slug: 'text-based-adventure-game',
        title: 'Text-Based Adventure Game',
        description:
          'An interactive game with decisions, branching scenarios, reusable functions and structured data.',
        notebook: '04-text-based-adventure-game.ipynb',
      },
      {
        slug: 'library-management-system',
        title: 'Library Management System',
        description:
          'A library system that manages books and borrowing: search, sorting, loans and tests. You rebuild it with classes in the recap lesson.',
        notebook: '06-library-management-system.ipynb',
      },
      {
        slug: 'personal-expense-tracker',
        title: 'Personal Expense Tracker',
        description:
          'A program that stores, retrieves, validates and organizes financial records in a file.',
        notebook: '05-personal-expense-tracker.ipynb',
      },
    ],
    lessons: [
      {
        file: '01-computational-thinking-and-problem-decomposition',
        title: 'Computational Thinking & Problem Decomposition',
      },
      {
        file: '02-functions-in-depth-and-modular-programming',
        title: 'Functions in Depth & Modular Programming',
      },
      {
        file: '03-advanced-collections-and-nested-data-structures',
        title: 'Advanced Collections & Nested Data Structures',
      },
      {
        file: '04-algorithms-and-problem-solving-patterns',
        title: 'Algorithms & Problem-Solving Patterns',
      },
      {
        file: '05-debugging-testing-and-fixing-problems',
        title: 'Debugging, Testing & Fixing Problems',
      },
      {
        file: '06-error-handling-and-input-validation',
        title: 'Error Handling & Input Validation',
      },
      {
        file: '07-working-with-files-and-structured-data',
        title: 'Working with Files & Structured Data',
      },
      {
        file: '08-introduction-to-object-oriented-programming',
        title: 'Introduction to Object-Oriented Programming',
      },
    ],
  },
  {
    slug: 'python-tools-data-foundations',
    title: 'Python Tools & Data Foundations',
    projects: [
      {
        slug: 'student-life-data-explorer',
        title: 'Student Life Data Explorer',
        description:
          'An end-to-end Python project combining data processing, basic analysis, visualization and project documentation.',
        notebook: '09-student-life-data-explorer.ipynb',
      },
      {
        slug: 'dataset-explorer',
        title: 'Dataset Explorer',
        description:
          'A Jupyter Notebook project that loads, inspects, filters and analyzes a real-world dataset.',
        notebook: '07-dataset-explorer.ipynb',
      },
      {
        slug: 'live-data-explorer',
        title: 'Live Data Explorer',
        description:
          'A Python application that retrieves live information from an external API, cleans and summarises it and displays selected results.',
        notebook: '08-live-data-explorer.ipynb',
      },
    ],
    lessons: [
      {
        file: '01-python-development-environment-and-workflow',
        title: 'Python Development Environment & Workflow',
      },
      {
        file: '02-python-modules-libraries-and-packages',
        title: 'Python Modules, Libraries & Packages',
      },
      {
        file: '03-introduction-to-jupyter-notebooks',
        title: 'Introduction to Jupyter Notebooks',
      },
      {
        file: '04-introduction-to-numpy',
        title: 'Introduction to NumPy',
      },
      {
        file: '05-introduction-to-pandas-and-dataframes',
        title: 'Introduction to Pandas & DataFrames',
      },
      {
        file: '06-data-cleaning-summaries-and-basic-visualization',
        title: 'Data Cleaning, Summaries & Basic Visualization',
      },
      {
        file: '07-working-with-apis-and-json-data',
        title: 'Working with APIs & JSON Data',
      },
      {
        file: '08-python-capstone-build-document-and-share',
        title: 'Python Capstone: Build, Document & Share',
      },
    ],
  },
];
