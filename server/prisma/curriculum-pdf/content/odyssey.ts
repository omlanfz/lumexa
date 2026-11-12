import type { ProgramContent } from '../types';
import { PERK_TESTED, standardAssessments, withTest } from './shared';
import { moduleLessons } from './data';

export const ODYSSEY: ProgramContent = {
  slug: 'lumexa-odyssey',
  fileName: 'lumexa-odyssey-curriculum.pdf',
  attachToCertificateEmail: true,
  themeKey: 'odyssey',
  shortName: 'Odyssey',
  eyebrow: 'FLAGSHIP CURRICULUM',
  heroTitle: 'Lumexa Odyssey',
  heroSubtitle: '72 Lessons. One Big Launchpad.',
  intro:
    'The first path every new student takes. Odyssey is a guided journey across nine real courses — games, websites, apps, data, and AI — giving your child broad, hands-on exposure before they choose a specialty. No prior coding experience needed.',
  strip: [
    {
      big: '72',
      label: 'Lessons · 9 real courses',
      sub: 'Scratch, Python, the web, data and AI',
    },
    {
      big: '13',
      label: 'Tests along the way',
      sub: '9 course tests + 3 stage tests + 1 final test',
    },
  ],
  stats: [
    { value: '9', label: 'Courses' },
    { value: '72', label: 'Lessons' },
    { value: '85', label: 'Sessions in total' },
  ],
  stages: [
    {
      number: 1,
      name: 'Foundation',
      blurb:
        'Every great builder starts somewhere. Stage 1 turns total beginners into confident, independent coders through games and playful logic.',
      range: 'LESSONS 1–24',
      courseIndexes: [0, 1, 2],
      testTitle: 'Stage 1 Test',
    },
    {
      number: 2,
      name: 'Create & Apply',
      blurb:
        'With coding fundamentals in place, students start building real things for the real internet — and start presenting themselves professionally along the way.',
      range: 'LESSONS 25–48',
      courseIndexes: [3, 4, 5],
      testTitle: 'Stage 2 Test',
    },
    {
      number: 3,
      name: 'Explore & Advance',
      blurb:
        'A guided tour of the paths ahead — data, artificial intelligence, and 3D world building — so students choose their specialty with real experience, not guesswork.',
      range: 'LESSONS 49–72',
      courseIndexes: [6, 7, 8],
      testTitle: 'Stage 3 Test',
    },
  ],
  courses: [
    withTest({
      title: 'Scratch Adventures',
      subtitle: 'Interactive stories and games in Scratch',
      tools: ['Scratch', 'Sequencing', 'Loops & events'],
      overview:
        'Students build their first interactive stories and games in Scratch’s drag-and-drop editor — learning sequencing, loops, and events through play.',
      projects: ['Interactive story', 'First game'],
      why: '',
      lessons: moduleLessons('little-coders-path', 'scratch-adventures'),
      snapshots: [
        {
          id: 'safari-adventure',
          title: 'Safari Adventure',
          tech: 'Scratch-style blocks',
        },
      ],
      snapshotNote: '',
      teaser: '',
    }),
    withTest({
      title: 'Python for Young Builders',
      subtitle: 'A gentle start with real Python',
      tools: ['Python 3', 'Variables', 'Conditionals', 'Loops'],
      overview:
        'A gentle, guided introduction to real text-based programming in Python — variables, conditionals, and loops, applied to small practical tools.',
      projects: ['Quiz app', 'Mini game'],
      why: '',
      lessons: moduleLessons('little-coders-path', 'python-for-young-builders'),
      snapshots: [
        {
          id: 'space-maths-quiz',
          title: 'Space Maths Quiz',
          tech: 'Python · decisions',
        },
      ],
      snapshotNote: '',
      teaser: '',
    }),
    withTest({
      title: 'Python Arcade Games',
      subtitle: 'Arcade games with Python',
      tools: ['Python', 'Pygame', 'Game development'],
      overview:
        'Students apply their new Python skills to build real, playable arcade-style games — turning foundational logic into something they can show off.',
      projects: ['Space shooter', 'Maze runner', 'Brick breaker'],
      why: '',
      lessons: moduleLessons('game-creator-path', 'python-arcade-games'),
      snapshots: [
        {
          id: 'python-arcade',
          title: 'Python Arcade Game',
          tech: 'Python · Pygame',
        },
      ],
      snapshotNote: '',
      teaser: '',
    }),
    withTest({
      title: 'HTML and CSS Mastery',
      subtitle: 'Structure and style real webpages',
      tools: ['HTML5', 'CSS3', 'Web design basics'],
      overview:
        'Students learn to structure and style real webpages from scratch — the foundational language of every website on the internet.',
      projects: ['Landing page', 'Responsive layout'],
      why: '',
      lessons: moduleLessons('web-developer-path', 'html-css-mastery'),
      snapshots: [
        {
          id: 'photography-portfolio',
          title: 'Photography Portfolio',
          tech: 'HTML · CSS',
        },
      ],
      snapshotNote: '',
      teaser: '',
    }),
    withTest({
      title: 'Build Your Professional Identity',
      subtitle: 'A live portfolio and an honest online presence',
      tools: ['Portfolio site', 'Professional identity'],
      overview:
        'Students build a live personal portfolio site and learn to present their growing skills honestly and professionally online.',
      projects: ['Portfolio site', 'Brand kit'],
      why: '',
      lessons: moduleLessons(
        'digital-independence-path',
        'build-your-professional-identity',
      ),
      snapshots: [
        {
          id: 'freelance-brand-kit',
          title: 'Brand Kit & Portfolio',
          tech: 'HTML · CSS · Canva',
        },
      ],
      snapshotNote: '',
      teaser: '',
    }),
    withTest({
      title: 'JavaScript and Interactivity',
      subtitle: 'Bring websites to life',
      tools: ['JavaScript', 'Interactive web'],
      overview:
        'Students bring their websites to life — adding buttons, animations, and interactive logic using real JavaScript.',
      projects: ['Interactive app'],
      why: '',
      lessons: moduleLessons('web-developer-path', 'javascript-interactivity'),
      snapshots: [
        {
          id: 'school-events-app',
          title: 'School Events App',
          tech: 'HTML · CSS · JavaScript',
        },
      ],
      snapshotNote: '',
      teaser: '',
    }),
    withTest({
      title: 'Python for Data',
      subtitle: 'A first taste of the data scientist’s toolkit',
      tools: ['Python', 'Data basics'],
      overview:
        'Students learn to organize, analyze, and visualize real data using Python — a first taste of the data scientist’s toolkit.',
      projects: ['Data analysis'],
      why: '',
      lessons: moduleLessons('data-scientist-path', 'python-for-data'),
      snapshots: [
        {
          id: 'sports-stats',
          title: 'Sports Stats Analyser',
          tech: 'Python · Pandas',
        },
      ],
      snapshotNote: '',
      teaser: '',
    }),
    withTest({
      title: 'Python and AI Foundations',
      subtitle: 'How artificial intelligence really works',
      tools: ['Python', 'AI foundations'],
      overview:
        'An approachable introduction to how artificial intelligence actually works — students build and experiment with simple, real AI models.',
      projects: ['Simple AI model'],
      why: '',
      lessons: moduleLessons('ai-builder-path', 'python-ai-foundations'),
      snapshots: [
        {
          id: 'image-classifier',
          title: 'Handwritten Digit Classifier',
          tech: 'Python · scikit-learn',
        },
      ],
      snapshotNote: '',
      teaser: '',
    }),
    withTest({
      title: 'Roblox World Builder',
      subtitle: 'Design and script a 3D world',
      tools: ['Roblox Studio', '3D & game design'],
      overview:
        'Students design and script an interactive 3D world in Roblox Studio — combining creativity, logic, and game design in one capstone-style course.',
      projects: ['3D world'],
      why: '',
      lessons: moduleLessons('game-creator-path', 'roblox-world-builder'),
      snapshots: [
        {
          id: 'galactic-shooter',
          title: 'Galactic Shooter',
          tech: 'Roblox · Lua',
        },
      ],
      snapshotNote: '',
      teaser: '',
    }),
  ],
  highlights: [
    {
      title: 'Breadth before depth',
      body: 'Nine real courses across games, websites, data and AI — so students choose a specialty from experience, not guesswork.',
    },
    {
      title: 'Real projects at every step',
      body: 'Students build and show finished work in Scratch, Python, HTML/CSS and JavaScript, plus a live portfolio and a 3D world.',
    },
    PERK_TESTED,
  ],
  assessments: standardAssessments({
    stages: true,
    intro:
      'Odyssey is tested the whole way: a course test after every 8 lessons, a stage test after every three courses, and one final test over the entire journey — 13 checkpoints that show a student is ready to choose a specialty.',
    finalBlurb:
      'The finish line of the Odyssey: questions across all nine courses and all three stages, plus a small practical project.',
    sample: {
      mcq: {
        question: 'Which language gives a web page its structure?',
        options: ['HTML', 'Lua', 'Pandas', 'Scratch'],
        answer: 0,
      },
      trueFalse: {
        statement:
          'A loop lets a program repeat steps without writing them out again.',
        answer: true,
      },
    },
  }),
  journeyIntro:
    'Across 9 courses, 72 lessons and 13 tests, students move from total beginner to confident, well-rounded builder — with hands-on experience across games, the web, data, and AI, all before choosing where to specialize.',
  outcomes: [
    'Write and debug real code across multiple languages — Scratch, Python, HTML/CSS, and JavaScript.',
    'Build and show off real, finished projects: games, a live website, a personal portfolio, and a 3D world.',
    'Confidently choose a specialized 24-lesson pathway based on real hands-on experience, not guesswork.',
  ],
  journeyProjects: [
    ['Scratch', 'Stories & games'],
    ['Python', 'Quiz app & mini game'],
    ['Python', 'Arcade games'],
    ['HTML & CSS', 'Real webpages'],
    ['Portfolio', 'Professional identity'],
    ['JavaScript', 'Interactive web'],
    ['Python', 'Real data'],
    ['Python', 'AI foundations'],
    ['Roblox Studio', '3D world & game design'],
  ],
  whatsNext: [
    'Game Creator',
    'AI Builder',
    'Web Developer',
    'Data Scientist',
    'Digital Independence',
  ],
  ctaLine: 'The best first step into coding, for any beginner.',
};
