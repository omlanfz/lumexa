import type { ProgramContent } from '../types';
import {
  PERK_BUILD,
  PERK_PORTFOLIO,
  PERK_TESTED,
  standardAssessments,
  withTest,
} from './shared';

export const ADVANCED_DATA_SCIENCE: ProgramContent = {
  slug: 'advanced-data-science',
  fileName: 'advanced-data-science-curriculum.pdf',
  attachToCertificateEmail: false,
  themeKey: 'ads',
  shortName: 'Advanced Data Science',
  eyebrow: 'CURRICULUM OVERVIEW',
  heroTitle: 'Advanced Data Science',
  heroSubtitle: 'Build 15+ Real AI & Data Science Projects',
  intro:
    'A complete, project-driven journey from your first line of Python to arcade games, data dashboards and machine learning models you can deploy. Students don’t just learn about AI and data. They write the code, build the projects and prove it with tests.',
  strip: [
    {
      big: '15+',
      label: 'Real AI & data science projects',
      sub: 'Portfolio-ready work',
    },
    {
      big: '6',
      label: 'Tests to prove it',
      sub: '5 course tests + 1 final test on the whole curriculum',
    },
  ],
  stats: [
    { value: '5', label: 'Courses' },
    { value: '40', label: 'Lessons' },
    { value: '46', label: 'Sessions in total' },
  ],
  courses: [
    withTest({
      title: 'Python for Young Builders',
      subtitle:
        'Go from block coding to real Python by building your first apps and games',
      tools: ['Python 3', 'Variables & Input', 'Loops & Lists', 'Mini Games'],
      overview:
        'The foundation of everything. Your child moves from blocks to real Python: variables, decisions, loops and lists, and finishes with a mini game of their own. No fluff, just real code.',
      projects: [
        'Personal Quiz App',
        'Simple Calculator',
        'Word Guessing Game',
      ],
      why: 'Every program, from a quiz app to an AI model, is built from these same building blocks. Students learn to think in code, break problems down and ship small projects that actually run.',
      lessons: [
        'From Blocks to Words — Hello, Python!',
        'Variables and User Input',
        'Printing and String Formatting',
        'If/Else Decisions',
        'While Loops and For Loops',
        'Lists and Simple Data',
        'Building a Mini Quiz App',
        'Final Project — Our Own Mini Game!',
      ],
      snapshots: [
        {
          id: 'space-maths-quiz',
          title: 'Space Maths Quiz',
          tech: 'Python · Variables · Decisions',
        },
      ],
      snapshotNote:
        'The kind of first app students build: a quiz that asks questions, checks answers and keeps score — all in their own Python.',
      teaser: 'From block coding to real Python. Build 3 apps and a mini game.',
    }),
    withTest({
      title: 'Python Arcade Games',
      subtitle:
        'Build playable arcade games with Pygame and share them with the world',
      tools: ['Python', 'Pygame', 'Sprites & Sound', 'Game Loop'],
      overview:
        'Your child builds real arcade games: a space shooter, a maze runner and a brick breaker. They learn how game loops, collisions, enemies and scoring really work, then package and share their games.',
      projects: [
        'Space Shooter',
        'Maze Runner with Timer',
        'Brick Breaker Clone',
      ],
      why: 'Games are the most motivating way to master programming. Students practise logic, maths and problem-solving every time they tweak a level, and finish with games friends and family can play.',
      lessons: [
        'Python Basics for Game Development',
        'Pygame Setup and the Game Loop',
        'Sprites, Images, and Movement',
        'Collision Detection',
        'Enemies, AI Behavior, and Scoring',
        'Sound Effects and Music',
        'Game States — Menu, Play, Game Over',
        'Packaging and Sharing Your Game',
      ],
      snapshots: [
        {
          id: 'python-arcade',
          title: 'Python Arcade Game',
          tech: 'Python · Pygame',
        },
      ],
      snapshotNote:
        'A side-scrolling arcade game with enemies, coins and a high-score table — built from the game loop up.',
      teaser: 'Pygame, sprites and collisions. Ship 3 playable arcade games.',
    }),
    withTest({
      title: 'Python for Data',
      subtitle:
        'Turn raw data into answers with Pandas and real-world datasets',
      tools: ['Python', 'Pandas', 'Jupyter Notebooks', 'CSV & Excel'],
      overview:
        'Your child learns how data scientists work: loading real data, cleaning it, grouping it and finding patterns. They analyse sports, school and city datasets, the same skills used in business and research.',
      projects: [
        'Sports Performance Analysis',
        'School Grade Analysis',
        'City Population Trends',
      ],
      why: 'Data drives decisions in every industry. Students learn the full analysis workflow, from messy files to clear insights, which is the first step of every data science and AI project.',
      lessons: [
        'Why Data Science Matters (Real Examples)',
        'Python Refresher and Jupyter Setup',
        'Loading Data from CSV and Excel',
        'Pandas — Selecting, Filtering, Sorting',
        'Cleaning Data — Nulls, Duplicates, Types',
        'Aggregations — Group By, Pivot Tables',
        'Statistical Summaries and Correlation',
        'Full Analysis Project with a Real Dataset',
      ],
      snapshots: [
        {
          id: 'sports-stats',
          title: 'Sports Stats Analyser',
          tech: 'Python · Pandas',
        },
      ],
      snapshotNote:
        'A player-comparison tool built from a real season of sports data: loaded, cleaned, grouped and compared with Pandas.',
      teaser: 'Pandas, cleaning and statistics on real datasets.',
    }),
    withTest({
      title: 'Data Visualisation',
      subtitle:
        'Create charts and interactive dashboards that tell a clear story',
      tools: ['Matplotlib', 'Seaborn', 'Plotly', 'Dash'],
      overview:
        'Your child learns to make data visible: from classic charts to interactive dashboards. They build a climate dashboard, a market trends chart and a sports comparison tool that anyone can explore.',
      projects: [
        'Climate Change Dashboard',
        'Market Trends Chart',
        'Sports Comparison Visualiser',
      ],
      why: 'A good chart can change minds. Students learn which chart fits which data, how colour and labels shape the message, and how to present findings to people who are not technical.',
      lessons: [
        'The Science of Good Data Visualisation',
        'Matplotlib: Line, Bar, Scatter Plots',
        'Seaborn: Statistical Visualisations',
        'Choosing the Right Chart for Your Data',
        'Color, Labels, and Storytelling',
        'Interactive Charts with Plotly',
        'Building a Dash Dashboard',
        'Your Own Interactive Dashboard',
      ],
      snapshots: [
        {
          id: 'climate-dashboard',
          title: 'Climate Change Dashboard',
          tech: 'Python · Plotly · Dash',
        },
        {
          id: 'market-trends',
          title: 'Market Trends Forecast',
          tech: 'Python · Matplotlib',
        },
      ],
      snapshotNote:
        'Charts that tell a story: an interactive climate dashboard and a market trend chart with a forecast line.',
      teaser: 'Charts, Plotly and Dash dashboards that tell a story.',
    }),
    withTest({
      title: 'Machine Learning Projects',
      subtitle:
        'Train, test and deploy models that predict, classify and recommend',
      tools: ['Python', 'scikit-learn', 'Pandas', 'Model APIs'],
      overview:
        'Your child learns how machine learning really works, with no maths jargon. They train models that predict house prices, spot customers about to leave and recommend movies, then deploy one as an API.',
      projects: [
        'House Price Predictor',
        'Customer Churn Predictor',
        'Movie Recommendation Engine',
      ],
      why: 'Every ML system, from spam filters to recommendation engines, follows the same workflow: prepare data, train a model, test it honestly and explain the result. This course puts it all together.',
      lessons: [
        'How Machine Learning Works (No Maths Jargon)',
        'Types of ML — Regression vs Classification',
        'Train/Test Splits and Model Evaluation',
        'Linear Regression From Scratch',
        'Decision Trees and Random Forests',
        'Feature Engineering and Selection',
        'Model Tuning and Improving Accuracy',
        'Deploying a Prediction Model as an API',
      ],
      snapshots: [
        {
          id: 'house-price-predictor',
          title: 'House Price Predictor',
          tech: 'Python · scikit-learn',
        },
      ],
      snapshotNote:
        'A model trained on real housing data that predicts a price from size, rooms and age — with its accuracy shown honestly.',
      teaser: 'Train, tune and deploy models that predict and recommend.',
    }),
  ],
  highlights: [PERK_BUILD, PERK_PORTFOLIO, PERK_TESTED],
  assessments: standardAssessments({
    intro:
      'Five course tests and one final test turn “I watched” into “I can”. Each course ends with a checkpoint on what that course taught, and the final test pulls the whole curriculum together.',
    finalBlurb:
      'One final test across Python, games, data, visualisation and machine learning: questions plus a small practical project.',
    sample: {
      mcq: {
        question: 'Why do we keep some of the data aside as a test set?',
        options: [
          'To make the model train faster',
          'To check the model on examples it has never seen',
          'To delete the rows we do not like',
          'To make the chart colourful',
        ],
        answer: 1,
      },
      trueFalse: {
        statement:
          'A chart’s colours and labels can change the message it sends.',
        answer: true,
      },
    },
  }),
  journeyIntro:
    'Across 5 courses, 40 lessons and 6 tests, students progress from their first Python program to building, visualising and deploying real AI and data science projects, finishing with 15+ working projects for their portfolio.',
  outcomes: [
    'Write real Python programs and build playable games from scratch.',
    'Clean, analyse and visualise real data with Pandas, Matplotlib and Plotly.',
    'Train, test and deploy machine learning models as a working API.',
  ],
  journeyProjects: [
    ['Personal Quiz App', 'Simple Calculator', 'Word Guessing Game'],
    ['Space Shooter', 'Maze Runner with Timer', 'Brick Breaker Clone'],
    [
      'Sports Performance Analysis',
      'School Grade Analysis',
      'City Population Trends',
    ],
    [
      'Climate Change Dashboard',
      'Market Trends Chart',
      'Sports Comparison Visualiser',
    ],
    [
      'House Price Predictor',
      'Customer Churn Predictor',
      'Movie Recommendation Engine',
    ],
  ],
  ctaLine: 'Ready to start building?',
};
