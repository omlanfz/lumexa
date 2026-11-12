import type { ProgramContent } from '../types';
import {
  PERK_BUILD,
  PERK_PORTFOLIO,
  PERK_TESTED,
  standardAssessments,
  withTest,
} from './shared';
import { moduleLessons } from './data';

export const WEB_DEVELOPER: ProgramContent = {
  slug: 'web-developer',
  fileName: 'web-developer-path-curriculum.pdf',
  attachToCertificateEmail: true,
  themeKey: 'web',
  shortName: 'Web Developer',
  eyebrow: 'CURRICULUM OVERVIEW',
  heroTitle: 'Web Developer Path',
  heroSubtitle: 'Build 3 Live Websites',
  intro:
    'A complete, project-driven journey from a first HTML page to a deployed, full-stack React application. Students don’t just learn about the web — they write the code, style real interfaces, and ship three live, working websites anyone can visit.',
  strip: [
    {
      big: '3',
      label: 'Live websites to launch',
      sub: 'Real addresses anyone can visit',
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
      title: 'HTML and CSS Mastery',
      subtitle:
        'Build beautiful, responsive websites that look great on any device',
      tools: ['HTML5', 'CSS3', 'Flexbox', 'CSS Grid', 'Vercel'],
      overview:
        'Your child learns the fundamentals of the web — HTML structure and CSS styling — and builds their first real, deployed website that anyone can visit.',
      projects: [
        'Personal landing page',
        'Responsive portfolio layout',
        'Product showcase site',
      ],
      why: 'HTML and CSS are the base layer of every website on the internet. Students learn to structure content and design layouts that adapt to any screen — the skill every later project builds on.',
      lessons: moduleLessons('web-developer-path', 'html-css-mastery'),
      snapshots: [
        {
          id: 'photography-portfolio',
          title: 'Photography Portfolio',
          tech: 'HTML · CSS · JavaScript',
        },
      ],
      snapshotNote:
        'A responsive photo-gallery website, published live — structure, style and layout that adapt to any screen.',
      teaser: 'Structure and style responsive websites, then go live.',
    }),
    withTest({
      title: 'JavaScript and Interactivity',
      subtitle: 'Add dynamic, interactive behavior to any webpage',
      tools: ['JavaScript (ES6+)', 'DOM API', 'Fetch API', 'Local Storage'],
      overview:
        'Static websites are just the beginning. Your child learns JavaScript to make pages that react to clicks, fetch live data, and behave like real apps.',
      projects: [
        'Interactive to-do app',
        'Live weather dashboard',
        'Memory card game',
      ],
      why: 'JavaScript is what turns a static page into a real application. Students learn to handle user actions, talk to live APIs, and save data — the core skills behind every interactive website.',
      lessons: moduleLessons('web-developer-path', 'javascript-interactivity'),
      snapshots: [
        {
          id: 'school-events-app',
          title: 'School Events App',
          tech: 'HTML · CSS · JavaScript',
        },
      ],
      snapshotNote:
        'An events app that filters, registers and remembers — a page that reacts to clicks and keeps its data.',
      teaser: 'Pages that react to clicks, fetch live data and save it.',
    }),
    withTest({
      title: 'React and Full-Stack Web',
      subtitle:
        'Build and deploy modern React applications used in real companies',
      tools: ['React 18', 'Next.js', 'Vercel', 'REST APIs'],
      overview:
        'React is the most in-demand frontend framework in the world. Your child builds reusable components, manages state, fetches data from APIs, and deploys a full React app live.',
      projects: [
        'E-commerce product page',
        'Social media feed clone',
        'Full portfolio React app',
      ],
      why: 'React and Next.js power the majority of modern production websites. Students learn the same component model, data-fetching patterns, and deployment workflow used by real engineering teams.',
      lessons: moduleLessons('web-developer-path', 'react-fullstack-web'),
      snapshots: [
        {
          id: 'ecommerce-store',
          title: 'E-Commerce Store',
          tech: 'React · Node.js',
        },
      ],
      snapshotNote:
        'An online shop with product pages, a working cart and a checkout flow, built from reusable React components.',
      teaser: 'Modern React apps, deployed live like a real team would.',
    }),
  ],
  highlights: [
    {
      ...PERK_BUILD,
      title: 'Learn by shipping, not by watching',
      body: 'Every lesson pairs a real idea with running code that deploys live on the web.',
    },
    {
      ...PERK_PORTFOLIO,
      body: 'Students finish with three live websites they can show, share and keep building on.',
    },
    PERK_TESTED,
  ],
  assessments: standardAssessments({
    intro:
      'A website that looks right can still be built wrong. Course tests check the ideas under the pixels — HTML structure, CSS layout, JavaScript behaviour and React components — and a final test closes the path.',
    finalBlurb:
      'One final test across HTML & CSS, JavaScript and React: questions plus a small practical project.',
    sample: {
      mcq: {
        question:
          'Which CSS feature lays items out in a flexible row or column?',
        options: ['Flexbox', 'Alt text', 'A favicon', 'A hyperlink'],
        answer: 0,
      },
      trueFalse: {
        statement:
          'JavaScript can change what is on a page after it has loaded.',
        answer: true,
      },
    },
  }),
  journeyIntro:
    'Across 3 courses, 24 lessons and 4 tests, students progress from writing their first HTML page to building and deploying a full-stack React application — walking away with three real, live websites for their portfolio.',
  outcomes: [
    'Structure and style a fully responsive website from scratch using HTML and CSS.',
    'Add real interactivity with JavaScript, including live data from external APIs.',
    'Build and deploy a modern, full-stack React application live on the web.',
  ],
  journeyProjects: [
    [
      'Personal landing page',
      'Responsive portfolio layout',
      'Product showcase site',
    ],
    ['Interactive to-do app', 'Live weather dashboard', 'Memory card game'],
    [
      'E-commerce product page',
      'Social media feed clone',
      'Full portfolio React app',
    ],
  ],
  ctaLine: 'Ready to start building?',
};
