// FILE PATH: server/prisma/python-foundations/outline.ts
//
// The shape of the Python Foundations program: its three courses ("modules"), the eight
// lessons of each (in order), and the nine portfolio projects. The lesson TEXT lives in
// ./lessons/<module-slug>/<file>.md; build.ts joins the two into
// server/prisma/curriculum-data/python-foundations-path.json, the dataset the course seed
// reads (like every other pathway).
//
// Titles, hands-on builds and project names follow the Python Foundations curriculum
// document. Keep them in step with server/prisma/curriculum-pdf/content/python-foundations.ts.

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
  /** The lesson's hands-on build, from the curriculum document. */
  build: string;
  /** The portfolio project this lesson builds, or null. */
  projectSlug: string | null;
}

export interface OutlineModule {
  slug: string;
  title: string;
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
          'A customizable quiz application with questions, answer checking and scoring, built from reusable functions.',
        notebook: '03-python-quiz-master.ipynb',
      },
    ],
    lessons: [
      {
        file: '01-python-setup-and-your-first-program',
        title: 'Python Setup and Your First Program',
        build: 'Personalized Greeting Program',
        projectSlug: null,
      },
      {
        file: '02-variables-data-types-and-values',
        title: 'Variables, Data Types, and Values',
        build: 'Student Profile Generator',
        projectSlug: null,
      },
      {
        file: '03-user-input-output-and-operators',
        title: 'User Input, Output, and Operators',
        build: 'Smart Calculator',
        projectSlug: 'smart-calculator',
      },
      {
        file: '04-making-decisions-with-conditional-logic',
        title: 'Making Decisions with Conditional Logic',
        build: 'Smart Eligibility Checker',
        projectSlug: null,
      },
      {
        file: '05-repetition-with-python-loops',
        title: 'Repetition with Python Loops',
        build: 'Number Guessing Game',
        projectSlug: 'number-guessing-game',
      },
      {
        file: '06-working-with-strings',
        title: 'Working with Strings',
        build: 'Word and Text Analyzer',
        projectSlug: null,
      },
      {
        file: '07-working-with-python-collections',
        title: 'Working with Python Collections',
        build: 'Interactive Shopping List Manager',
        projectSlug: null,
      },
      {
        file: '08-creating-reusable-code-with-functions',
        title: 'Creating Reusable Code with Functions',
        build: 'Python Quiz Master',
        projectSlug: 'python-quiz-master',
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
        slug: 'personal-expense-tracker',
        title: 'Personal Expense Tracker',
        description:
          'A program that stores, retrieves, validates and organizes financial records in a file.',
        notebook: '05-personal-expense-tracker.ipynb',
      },
      {
        slug: 'library-management-system',
        title: 'Library Management System',
        description:
          'An object-oriented application that manages books, borrowers and borrowing records with file storage.',
        notebook: '06-library-management-system.ipynb',
      },
    ],
    lessons: [
      {
        file: '01-computational-thinking-and-problem-decomposition',
        title: 'Computational Thinking & Problem Decomposition',
        build: 'Daily Task Planner',
        projectSlug: null,
      },
      {
        file: '02-functions-in-depth-and-modular-programming',
        title: 'Functions in Depth & Modular Programming',
        build: 'Modular Utility Toolkit',
        projectSlug: null,
      },
      {
        file: '03-advanced-collections-and-nested-data-structures',
        title: 'Advanced Collections & Nested Data Structures',
        build: 'Student Record Management System',
        projectSlug: 'text-based-adventure-game',
      },
      {
        file: '04-algorithms-and-problem-solving-patterns',
        title: 'Algorithms & Problem-Solving Patterns',
        build: 'Smart Score Analyzer',
        projectSlug: null,
      },
      {
        file: '05-debugging-testing-and-fixing-problems',
        title: 'Debugging, Testing & Fixing Problems',
        build: 'Debugging Challenge',
        projectSlug: null,
      },
      {
        file: '06-error-handling-and-input-validation',
        title: 'Error Handling & Input Validation',
        build: 'Secure Registration and Login Simulator',
        projectSlug: null,
      },
      {
        file: '07-working-with-files-and-structured-data',
        title: 'Working with Files & Structured Data',
        build: 'Personal Expense Tracker',
        projectSlug: 'personal-expense-tracker',
      },
      {
        file: '08-introduction-to-object-oriented-programming',
        title: 'Introduction to Object-Oriented Programming',
        build: 'Library Management System',
        projectSlug: 'library-management-system',
      },
    ],
  },
  {
    slug: 'python-tools-data-foundations',
    title: 'Python Tools & Data Foundations',
    projects: [
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
          'A Python application that retrieves information from an external API and displays selected results.',
        notebook: '08-live-data-explorer.ipynb',
      },
      {
        slug: 'student-life-data-explorer',
        title: 'Student Life Data Explorer',
        description:
          'An end-to-end Python project combining data processing, basic analysis, visualization and project documentation.',
        notebook: '09-student-life-data-explorer.ipynb',
      },
    ],
    lessons: [
      {
        file: '01-python-development-environment-and-workflow',
        title: 'Python Development Environment & Workflow',
        build: 'Personal Python Workspace',
        projectSlug: null,
      },
      {
        file: '02-python-modules-libraries-and-packages',
        title: 'Python Modules, Libraries & Packages',
        build: 'Multi-Tool Python Application',
        projectSlug: null,
      },
      {
        file: '03-introduction-to-jupyter-notebooks',
        title: 'Introduction to Jupyter Notebooks',
        build: 'Interactive Python Exploration Notebook',
        projectSlug: null,
      },
      {
        file: '04-introduction-to-numpy',
        title: 'Introduction to NumPy',
        build: 'NumPy Scientific Calculator',
        projectSlug: null,
      },
      {
        file: '05-introduction-to-pandas-and-dataframes',
        title: 'Introduction to Pandas & DataFrames',
        build: 'Dataset Explorer',
        projectSlug: 'dataset-explorer',
      },
      {
        file: '06-data-cleaning-summaries-and-basic-visualization',
        title: 'Data Cleaning, Summaries & Basic Visualization',
        build: 'Data Insights Dashboard',
        projectSlug: null,
      },
      {
        file: '07-working-with-apis-and-json-data',
        title: 'Working with APIs & JSON Data',
        build: 'Live Data Explorer',
        projectSlug: 'live-data-explorer',
      },
      {
        file: '08-python-capstone-build-document-and-share',
        title: 'Python Capstone: Build, Document & Share',
        build: 'Student Life Data Explorer',
        projectSlug: 'student-life-data-explorer',
      },
    ],
  },
];
