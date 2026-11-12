import type { ProgramContent } from '../types';
import {
  PERK_BUILD,
  PERK_PORTFOLIO,
  PERK_TESTED,
  standardAssessments,
  withTest,
} from './shared';
import { moduleLessons } from './data';

export const DATA_SCIENTIST: ProgramContent = {
  slug: 'data-scientist',
  fileName: 'data-scientist-path-curriculum.pdf',
  attachToCertificateEmail: true,
  themeKey: 'data',
  shortName: 'Data Scientist',
  eyebrow: 'CURRICULUM OVERVIEW',
  heroTitle: 'Data Scientist Path',
  heroSubtitle: 'Build 3 Data Projects',
  intro:
    'A complete, project-driven journey from messy raw data to real, working predictive models. Students don’t just learn about data science — they clean real datasets, build compelling visualizations, and train machine learning models that make real decisions.',
  strip: [
    {
      big: '3',
      label: 'Real data projects',
      sub: 'Analysis, dashboards and models',
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
      title: 'Python for Data',
      subtitle: 'Load, clean, and analyse real-world datasets using Python',
      tools: ['Python 3', 'Pandas', 'NumPy', 'Jupyter Notebooks'],
      overview:
        'Every data project starts with messy, real-world data. Your child learns to wrangle it into something useful — finding patterns, calculating stats, and drawing conclusions.',
      projects: [
        'Sports performance analysis',
        'School grade analysis',
        'City population trends',
      ],
      why: 'Real data is never clean. Learning to load, filter, and fix it in Pandas is the single most-used skill in data science — the foundation every chart, model, and insight in this path depends on.',
      lessons: moduleLessons('data-scientist-path', 'python-for-data'),
      snapshots: [
        {
          id: 'sports-stats',
          title: 'Sports Stats Analyser',
          tech: 'Python · Pandas',
        },
      ],
      snapshotNote:
        'A player-comparison tool built from a real season of sports data: loaded, cleaned, grouped and compared with Pandas.',
      teaser: 'Load, clean and analyse real datasets with Pandas.',
    }),
    withTest({
      title: 'Data Visualisation',
      subtitle:
        'Turn raw data into compelling, interactive charts and dashboards',
      tools: ['Python', 'Matplotlib', 'Seaborn', 'Plotly', 'Dash'],
      overview:
        'Data without visuals is just numbers. Your child learns to create charts that tell stories — the kind that make people say “I never knew that” when they look at the data.',
      projects: [
        'Climate change dashboard',
        'Market trends chart',
        'Sports comparison visualiser',
      ],
      why: 'A brilliant analysis nobody can read is wasted. This course teaches students to choose the right chart, design it clearly, and build interactive dashboards — the way data scientists actually communicate results.',
      lessons: [
        'The science of good data visualisation',
        'Matplotlib: line, bar, scatter plots',
        'Seaborn: statistical visualisations',
        'Choosing the right chart for your data',
        'Color, labels, and storytelling',
        'Interactive charts with Plotly',
        'Building a Dash dashboard',
        'Final: your own interactive dashboard',
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
      teaser: 'Charts and dashboards that tell a clear story.',
    }),
    withTest({
      title: 'Machine Learning Projects',
      subtitle:
        'Build predictive models that make real decisions from real data',
      tools: ['Python', 'scikit-learn', 'XGBoost', 'Joblib'],
      overview:
        'The pinnacle of data science: teaching a computer to predict outcomes. Your child builds real machine learning models — the same technology behind Netflix recommendations and fraud detection.',
      projects: [
        'House price predictor',
        'Customer churn predictor',
        'Movie recommendation engine',
      ],
      why: 'This is where cleaned data and clear charts become real predictions. Students learn the complete machine learning workflow — training, evaluating, tuning, and deploying a model — the same process used in industry.',
      lessons: [
        'How machine learning works (no maths jargon)',
        'Types of ML: regression vs classification',
        'Train/test splits and model evaluation',
        'Linear regression from scratch',
        'Decision trees and random forests',
        'Feature engineering and selection',
        'Model tuning and improving accuracy',
        'Deploying a prediction model as an API',
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
      teaser: 'Train, evaluate and deploy models that predict.',
    }),
  ],
  highlights: [
    {
      ...PERK_BUILD,
      title: 'Learn by analysing, not by watching',
      body: 'Every lesson pairs a real concept with a real dataset — no toy examples, no invented numbers.',
    },
    {
      ...PERK_PORTFOLIO,
      body: 'Students finish with three real data projects they can present, explain and keep building on.',
    },
    PERK_TESTED,
  ],
  assessments: standardAssessments({
    intro:
      'Data science is only as good as the thinking behind it. Course tests check that students can explain how they cleaned, charted and modelled — and a final test closes the path.',
    finalBlurb:
      'One final test across data analysis, visualisation and machine learning: questions plus a small practical project.',
    sample: {
      mcq: {
        question: 'Which Pandas method gives the average of a column?',
        options: ['.sort()', '.drop()', '.mean()', '.head()'],
        answer: 2,
      },
      trueFalse: {
        statement: 'Duplicate rows never affect an analysis.',
        answer: false,
      },
    },
  }),
  journeyIntro:
    'Across 3 courses, 24 lessons and 4 tests, students progress from loading a messy spreadsheet to training a deployable prediction model — walking away with three real, working data projects for their portfolio.',
  outcomes: [
    'Load, clean, and analyse a real-world dataset using Python and Pandas.',
    'Design clear, compelling charts and build an interactive data dashboard.',
    'Train, evaluate, and deploy a real machine learning prediction model.',
  ],
  journeyProjects: [
    [
      'Sports performance analysis',
      'School grade analysis',
      'City population trends',
    ],
    [
      'Climate change dashboard',
      'Market trends chart',
      'Sports comparison visualiser',
    ],
    [
      'House price predictor',
      'Customer churn predictor',
      'Movie recommendation engine',
    ],
  ],
  ctaLine: 'Ready to start analysing?',
};
