import type { ProgramContent } from '../types';
import {
  PERK_BUILD,
  PERK_PORTFOLIO,
  PERK_TESTED,
  standardAssessments,
  withTest,
} from './shared';
import { moduleLessons } from './data';

// Python Foundations: three courses, 24 lessons, 9 portfolio projects. The lesson titles are read from
// the dataset the database is seeded from (curriculum-data/python-foundations-path.json), so this
// document can never list a lesson the program does not teach. Course 3 stays introductory:
// NumPy, Pandas, APIs and charts are first steps; the deeper analysis, statistics and machine learning
// belong to the Data Scientist and AI Builder programs.

export const PYTHON_FOUNDATIONS: ProgramContent = {
  slug: 'python-foundations',
  fileName: 'python-foundations-curriculum.pdf',
  attachToCertificateEmail: true,
  themeKey: 'python',
  shortName: 'Python Foundations',
  eyebrow: 'CURRICULUM OVERVIEW',
  heroTitle: 'Python Foundations',
  heroSubtitle: 'Build 9 Real Python Projects',
  intro:
    'A complete, hands-on journey into text-based Python. Students start from the very first line of code, then learn to solve problems, structure and debug programs, work with files and external libraries, and explore the tools used in modern Python development.',
  strip: [
    {
      big: '9',
      label: 'Real Python projects',
      sub: 'From a calculator to live data',
    },
    {
      big: '4',
      label: 'Tests along the way',
      sub: '3 course tests + 1 final test',
    },
  ],
  stats: [
    { value: '3', label: 'Courses' },
    { value: '24', label: 'Lessons' },
    { value: '28', label: 'Sessions in total' },
  ],
  courses: [
    withTest({
      title: 'Python Programming Essentials',
      subtitle: 'Write your first real Python programs, from scratch',
      tools: [
        'Python 3',
        'Python editor',
        'Control flow',
        'Collections',
        'Functions',
      ],
      overview:
        'No coding experience needed. Students learn how to write, understand and run Python programs, and gradually combine variables, decisions, loops, strings, collections and functions into interactive applications.',
      projects: [
        'Smart Calculator',
        'Number Guessing Game',
        'Python Quiz Master',
      ],
      why: 'Every programmer starts here. Fluency with syntax, data types, conditions, loops and functions is the foundation for everything that follows, from games and websites to data science and AI.',
      lessons: moduleLessons(
        'python-foundations-path',
        'python-programming-essentials',
      ),
      snapshots: [
        {
          id: 'python-quiz-master',
          title: 'Python Quiz Master',
          tech: 'Python · Strings · Collections',
        },
      ],
      snapshotNote:
        'A quiz application built with strings and collections: it asks questions, checks the answers, keeps score and awards a rank.',
      teaser: 'Write independent Python programs from the very first line.',
    }),
    withTest({
      title: 'Problem Solving & Program Design',
      subtitle: 'Think, solve, structure and build like a programmer',
      tools: [
        'Python 3',
        'Algorithms',
        'Debugging',
        'Files · JSON · CSV',
        'OOP',
      ],
      overview:
        'Students move beyond single statements and learn to approach problems systematically: designing solutions, organising larger programs, finding and fixing errors, handling the unexpected and working with persistent data.',
      projects: [
        'Text-Based Adventure Game',
        'Library Management System',
        'Personal Expense Tracker',
      ],
      why: 'Writing code is only half of programming. Planning, testing, debugging and organising code into functions and classes is what turns a script into software that other people can trust.',
      lessons: moduleLessons(
        'python-foundations-path',
        'problem-solving-program-design',
      ),
      snapshots: [
        {
          id: 'text-adventure-game',
          title: 'Text-Based Adventure Game',
          tech: 'Python · Dictionaries',
        },
      ],
      snapshotNote:
        'A text adventure: the world is a nested dictionary, the player is a record, and small functions run the game.',
      teaser: 'Plan, debug, handle errors and build with files and classes.',
    }),
    withTest({
      title: 'Python Tools & Data Foundations',
      subtitle: 'Prepare for real-world Python development',
      tools: ['VS Code', 'Git', 'Jupyter', 'NumPy', 'Pandas', 'Matplotlib'],
      overview:
        'Students explore the tools professionals use: development environments, libraries and packages, Jupyter Notebooks, NumPy, Pandas and APIs. They take their first steps with real data and learn to document and share a finished project.',
      projects: [
        'Student Life Data Explorer',
        'Dataset Explorer',
        'Live Data Explorer',
      ],
      why: 'This course is the bridge to specialisation. It introduces the workflows and libraries behind data science and AI, so students arrive at those programs with confidence in their tools.',
      lessons: moduleLessons(
        'python-foundations-path',
        'python-tools-data-foundations',
      ),
      snapshots: [
        {
          id: 'student-life-explorer',
          title: 'Student Life Data Explorer',
          tech: 'Python · Pandas · Matplotlib',
        },
      ],
      snapshotNote:
        "A data project that grows through the course: a survey summarised with Python's own modules and a clear notebook report, then upgraded with Pandas and charts.",
      teaser: 'Use real tools and data: notebooks, NumPy, Pandas and APIs.',
    }),
  ],
  highlights: [
    {
      ...PERK_BUILD,
      title: 'Learn to think like a programmer',
      body: 'Students break down problems, design solutions and approach unfamiliar challenges independently, not just copy code.',
    },
    {
      ...PERK_PORTFOLIO,
      body: 'Students finish with nine real projects they can build, demonstrate and add to their portfolios.',
    },
    PERK_TESTED,
  ],
  assessments: standardAssessments({
    intro:
      'Every course ends with a test of both ideas and practical skills, and a final test closes the program with questions and an independent Python project.',
    finalBlurb:
      'One final test across the whole program: questions on Python, problem solving and tools, plus a practical programming task.',
    sample: {
      mcq: {
        question: 'Which Python function shows text on the screen?',
        options: ['input()', 'print()', 'range()', 'len()'],
        answer: 1,
      },
      trueFalse: {
        statement:
          'A variable created inside a function can be used anywhere in the program.',
        answer: false,
      },
    },
  }),
  journeyIntro:
    'Across 3 courses, 24 lessons and 4 tests, students progress from writing their first Python statement to building structured applications and exploring real-world data, finishing with nine projects for their portfolio.',
  outcomes: [
    'Write independent Python programs using variables, data structures, functions, conditions, loops and objects.',
    'Break down problems, design algorithms, debug, handle errors and work with files to build complete applications.',
    'Work with real Python tools and data: libraries, Jupyter Notebooks, NumPy, Pandas, APIs and basic charts.',
  ],
  journeyProjects: [
    ['Smart Calculator', 'Number Guessing Game', 'Python Quiz Master'],
    [
      'Text-Based Adventure Game',
      'Library Management System',
      'Personal Expense Tracker',
    ],
    ['Student Life Data Explorer', 'Dataset Explorer', 'Live Data Explorer'],
  ],
  ctaLine: 'Ready to start building?',
};
