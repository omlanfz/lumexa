import type { ProgramContent } from '../types';
import {
  PERK_BUILD,
  PERK_PORTFOLIO,
  PERK_TESTED,
  standardAssessments,
  withTest,
} from './shared';
import { moduleLessons } from './data';

export const AI_BUILDER: ProgramContent = {
  slug: 'ai-builder',
  fileName: 'ai-builder-path-curriculum.pdf',
  attachToCertificateEmail: true,
  themeKey: 'ai',
  shortName: 'AI Builder',
  eyebrow: 'CURRICULUM OVERVIEW',
  heroTitle: 'AI Builder Path',
  heroSubtitle: 'Build 3 Real AI Projects',
  intro:
    'A complete, project-driven journey from your first machine learning model to computer vision and large language model applications. Students don’t just learn about AI — they write the code, train the models, and ship three working portfolio projects.',
  strip: [
    {
      big: '3',
      label: 'Real AI projects',
      sub: 'Models, vision apps and chatbots',
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
      title: 'Python and AI Foundations',
      subtitle:
        'Write Python scripts and understand how machine learning really works',
      tools: ['Python 3', 'Jupyter Notebooks', 'scikit-learn', 'NumPy'],
      overview:
        'The foundation of everything. With basic Python in hand, your child sharpens it for data work — variables, loops, functions and lists — then builds their first machine learning model. No fluff, just real code.',
      projects: [
        'Number prediction model',
        'Simple image classifier',
        'Data pattern finder',
      ],
      why: 'Every machine learning system — from spam filters to recommendation engines — follows this same workflow: prepare data, train a model, test it honestly, and explain the result. This course is the foundation every later project builds on.',
      lessons: moduleLessons('ai-builder-path', 'python-ai-foundations'),
      snapshots: [
        {
          id: 'image-classifier',
          title: 'Handwritten Digit Classifier',
          tech: 'Python · scikit-learn',
        },
      ],
      snapshotNote:
        'A first image classifier: it learns from labelled examples, makes a prediction and reports how sure it is.',
      teaser: 'Python skills, then a first machine learning model.',
    }),
    withTest({
      title: 'Computer Vision Projects',
      subtitle: 'Build apps that see, detect, and recognize the real world',
      tools: ['Python', 'OpenCV', 'TensorFlow / Keras', 'Webcam API'],
      overview:
        'Your child builds apps that use a camera to detect faces, recognize objects, and read emotions — the same technology used in self-driving cars and medical diagnostics.',
      projects: [
        'Real-time emotion detector',
        'Object recognition app',
        'Motion-activated security cam',
      ],
      why: 'Computer vision powers everyday technology students already use — unlocking a phone with a face, sorting photos, or a car spotting a pedestrian. Students learn how these systems actually work, including where they can fail.',
      lessons: moduleLessons('ai-builder-path', 'computer-vision'),
      snapshots: [
        {
          id: 'mood-detector',
          title: 'Mood Detector AI',
          tech: 'Python · TensorFlow · OpenCV',
        },
      ],
      snapshotNote:
        'A webcam app that finds a face and guesses the emotion in real time, with the model’s confidence on screen.',
      teaser: 'Apps that see: faces, emotions and objects in real time.',
    }),
    withTest({
      title: 'Language Models and Chatbots',
      subtitle: 'Build conversational AI apps using real LLM APIs',
      tools: ['Python', 'OpenAI API', 'LangChain', 'Streamlit'],
      overview:
        'Your child learns how ChatGPT actually works, then builds their own chatbot applications using the OpenAI API — complete with memory, personality, and real-world purpose.',
      projects: [
        'Recipe chatbot with memory',
        'Study assistant bot',
        'Creative story generator',
      ],
      why: 'Large language models now power search, customer support, and everyday writing tools. Students learn what’s actually happening behind the chat window, then build and ship their own AI-powered application with a real interface.',
      lessons: moduleLessons('ai-builder-path', 'language-models'),
      snapshots: [
        {
          id: 'recipe-chatbot',
          title: 'Recipe Chatbot',
          tech: 'Python · OpenAI API · Streamlit',
        },
        {
          id: 'study-planner',
          title: 'Smart Study Planner',
          tech: 'Python · OpenAI API',
          focus: 'left 40%',
        },
      ],
      snapshotNote:
        'Chatbots with memory and purpose: one suggests recipes from the ingredients at home, one plans a week of study.',
      teaser: 'Real LLM apps with memory, personality and a live interface.',
    }),
  ],
  highlights: [
    PERK_BUILD,
    {
      ...PERK_PORTFOLIO,
      body: 'Students finish with three working AI applications they can show, explain and keep building on.',
    },
    PERK_TESTED,
  ],
  assessments: standardAssessments({
    intro:
      'In AI it is easy to run code you do not understand. The tests make sure students can explain how models are trained, evaluated and used — not just press run.',
    finalBlurb:
      'One final test across machine learning, computer vision and language models: questions plus a small practical project.',
    sample: {
      mcq: {
        question: 'Why is some data kept aside as a test set?',
        options: [
          'To check the model on examples it has never seen',
          'To make training slower',
          'To hide mistakes',
          'To use less memory',
        ],
        answer: 0,
      },
      trueFalse: {
        statement:
          'A model that is 99% accurate on its training data is always accurate on new data.',
        answer: false,
      },
    },
  }),
  journeyIntro:
    'Across 3 courses, 24 lessons and 4 tests, students progress from their first machine learning model to building and deploying full AI applications — walking away with three real, working projects for their portfolio.',
  outcomes: [
    'Write real Python programs and explain how a machine learning model is trained, tested and evaluated.',
    'Build a computer vision application that detects faces and objects in real time from a webcam.',
    'Build and deploy a conversational AI application powered by a real large language model API.',
  ],
  journeyProjects: [
    [
      'Number prediction model',
      'Simple image classifier',
      'Data pattern finder',
    ],
    [
      'Real-time emotion detector',
      'Object recognition app',
      'Motion-activated security cam',
    ],
    [
      'Recipe chatbot with memory',
      'Study assistant bot',
      'Creative story generator',
    ],
  ],
  ctaLine: 'Ready to start building?',
};
