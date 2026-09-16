/**
 * One-time catalog seed: creates the Lumexa course catalog from the current
 * curriculum PDFs — the 18 courses that make up the 6 specialized paths
 * (Little Coders, Game Creator, Web Developer, AI Builder, Data Scientist,
 * Digital Independence), plus the flagship "Lumexa Odyssey" bundle course.
 *
 * Idempotent / safe to re-run:
 *   - Courses are upserted by `slug` — re-running updates title/description/
 *     category/level/age/session metadata to match this file, it never
 *     duplicates a course.
 *   - Lessons are only created the first time a course has none, so manual
 *     lesson edits made afterwards in the admin UI are never clobbered by a
 *     re-run.
 *
 * Pricing note: Lumexa sells these in fixed BDT packages set outside this
 * admin tool (per curriculum: Little Coders ~5k/course, Game Creator &
 * Digital Independence ~6k/course, Web Developer & Data Scientist ~7k/course,
 * AI Builder ~7.5k/course, full Odyssey bundle 56,500 BDT flat). `gemCost` is
 * left at its schema default since nothing in the product currently maps
 * gems to a BDT rate — this script only sets catalog/curriculum fields.
 *
 * Usage (from server/):
 *   npm run seed:courses
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CourseSeed {
  slug: string;
  title: string;
  description: string;
  emoji: string;
  category: string;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  ageMin: number;
  ageMax: number;
  sessions: number;
  lessons: string[];
}

// ─── The 18 specialized-path courses (8 lessons each) ───────────────────────

const SPECIALIZED_COURSES: CourseSeed[] = [
  // Little Coders Path — Ages 6-11
  {
    slug: 'scratch-adventures',
    title: 'Scratch Adventures',
    description:
      "The perfect first step for young learners. Scratch uses visual blocks instead of text, so your child focuses on logic and creativity, not syntax. By the end, they have real animated projects to show off.",
    emoji: '✦',
    category: 'Little Coders',
    level: 'BEGINNER',
    ageMin: 6,
    ageMax: 11,
    sessions: 8,
    lessons: [
      'What is coding and why does it matter',
      'Scratch setup and first sprite',
      'Motion, looks, and sounds blocks',
      'Events and broadcasting',
      'Loops and repetition',
      'Conditionals and decisions',
      'Building an interactive story',
      'Final project: our own game',
    ],
  },
  {
    slug: 'python-for-young-builders',
    title: 'Python for Young Builders',
    description:
      'The bridge from visual to text-based coding. Your child writes their first Python programs — variables, loops, and their very own mini projects. Taught slowly, with patience, and lots of fun.',
    emoji: '✦',
    category: 'Little Coders',
    level: 'INTERMEDIATE',
    ageMin: 6,
    ageMax: 11,
    sessions: 8,
    lessons: [
      'From Scratch blocks to Python text',
      'Variables and user input',
      'Printing and string formatting',
      'If/else decisions',
      'While loops and for loops',
      'Lists and simple data',
      'Building a mini quiz app',
      'Final project: our own mini game',
    ],
  },
  {
    slug: 'ai-for-kids-smart-projects',
    title: 'AI for Kids: Smart Projects',
    description:
      "Your child discovers how AI actually works, not by reading about it, but by building with it. Using Google's Teachable Machine and ML4Kids, they train machine learning models that recognize images and sounds, then connect them to Scratch.",
    emoji: '✦',
    category: 'Little Coders',
    level: 'ADVANCED',
    ageMin: 6,
    ageMax: 11,
    sessions: 8,
    lessons: [
      'What is AI and how do machines actually learn',
      'Training your first image recognition model',
      'Connecting an AI model to Scratch with ML4Kids',
      'Building an AI rock-paper-scissors game',
      'Voice commands: training a sound recognizer',
      'Creating a voice-activated story in Scratch',
      'Facial expression recognition and virtual pets',
      'Showcase: presenting your AI project to the world',
    ],
  },

  // Game Creator Path — Ages 10-18
  {
    slug: 'roblox-world-builder',
    title: 'Roblox World Builder',
    description:
      'Your child goes from zero to a working multiplayer Roblox game. They design the world, write the Lua code, set up game logic, and publish it so friends can actually play it.',
    emoji: '🎮',
    category: 'Game Creator',
    level: 'BEGINNER',
    ageMin: 10,
    ageMax: 18,
    sessions: 8,
    lessons: [
      'Roblox Studio setup and first build',
      'Scripting basics in Lua',
      'Player mechanics and movement',
      'Game logic and scoring systems',
      'Multiplayer networking basics',
      'World design and aesthetics',
      'Testing, debugging, polishing',
      'Publishing and sharing with friends',
    ],
  },
  {
    slug: 'python-arcade-games',
    title: 'Python Arcade Games',
    description:
      'After Roblox, your child levels up to Python, the real language used by professional game developers and AI engineers. They build 2D arcade games from scratch.',
    emoji: '🎮',
    category: 'Game Creator',
    level: 'INTERMEDIATE',
    ageMin: 10,
    ageMax: 18,
    sessions: 8,
    lessons: [
      'Python basics for game development',
      'Pygame setup and game loop',
      'Sprites, images, and movement',
      'Collision detection',
      'Enemies, AI behavior, and scoring',
      'Sound effects and music',
      'Game states (menu, play, game over)',
      'Packaging and sharing your game',
    ],
  },
  {
    slug: 'advanced-game-design',
    title: 'Advanced Game Design',
    description:
      'The capstone course. Your child applies everything they know to design and ship a complete game — proper level design, a polished UI, and real playtesters giving feedback.',
    emoji: '🎮',
    category: 'Game Creator',
    level: 'ADVANCED',
    ageMin: 10,
    ageMax: 18,
    sessions: 8,
    lessons: [
      'Game design fundamentals (loops, balance, flow)',
      'Level design theory and practice',
      'Advanced Python: classes and game architecture',
      'Unity introduction and first scene',
      'UI design and player experience',
      'Playtesting and iteration',
      'Performance optimization',
      'Final polish and portfolio submission',
    ],
  },

  // Web Developer Path — Ages 12-18
  {
    slug: 'html-and-css-mastery',
    title: 'HTML and CSS Mastery',
    description:
      'Your child learns the fundamentals of the web — HTML structure and CSS styling — and builds their first real, deployed website that anyone can visit.',
    emoji: '🌐',
    category: 'Web Developer',
    level: 'BEGINNER',
    ageMin: 12,
    ageMax: 18,
    sessions: 8,
    lessons: [
      'How the web works (browsers, servers, HTML)',
      'HTML structure and semantic elements',
      'CSS basics: colors, fonts, spacing',
      'Flexbox for modern layouts',
      'CSS Grid for complex designs',
      'Responsive design and mobile-first',
      'Animations and hover effects',
      'Deploying to Vercel and sharing',
    ],
  },
  {
    slug: 'javascript-and-interactivity',
    title: 'JavaScript and Interactivity',
    description:
      'Static websites are just the beginning. Your child learns JavaScript to make pages that react to clicks, fetch live data, and behave like real apps.',
    emoji: '🌐',
    category: 'Web Developer',
    level: 'INTERMEDIATE',
    ageMin: 12,
    ageMax: 18,
    sessions: 8,
    lessons: [
      'JavaScript fundamentals (variables, functions, loops)',
      'DOM manipulation: selecting and changing elements',
      'Event listeners: responding to user actions',
      'Fetch API: pulling live data from the web',
      'Async/await and working with APIs',
      'Local Storage for saving user data',
      'Building a complete interactive app',
      'Debugging and polishing',
    ],
  },
  {
    slug: 'react-and-full-stack-web',
    title: 'React and Full-Stack Web',
    description:
      'React is the most in-demand frontend framework in the world. Your child builds reusable components, manages state, fetches data from APIs, and deploys a full React app live.',
    emoji: '🌐',
    category: 'Web Developer',
    level: 'ADVANCED',
    ageMin: 12,
    ageMax: 18,
    sessions: 8,
    lessons: [
      'Why React exists and how components work',
      'JSX, props, and component trees',
      'State with useState and event handling',
      'Fetching data with useEffect',
      'React Router and multi-page apps',
      'Next.js and server-side rendering',
      'Styling with Tailwind CSS',
      'Deploying to Vercel and final project',
    ],
  },

  // AI Builder Path — Ages 12-18
  {
    slug: 'python-and-ai-foundations',
    title: 'Python and AI Foundations',
    description:
      'The foundation of everything. Your child learns Python from scratch — variables, loops, functions, data — then builds their first machine learning model. No fluff, just real code.',
    emoji: '🤖',
    category: 'AI Builder',
    level: 'BEGINNER',
    ageMin: 12,
    ageMax: 18,
    sessions: 8,
    lessons: [
      'Python setup and first program',
      'Variables, data types, and logic',
      'Loops, functions, and modules',
      'Working with data and lists',
      'Introduction to machine learning concepts',
      'Building a first prediction model',
      'Training, testing, and evaluating models',
      'Presenting results to non-technical audiences',
    ],
  },
  {
    slug: 'computer-vision-projects',
    title: 'Computer Vision Projects',
    description:
      'Your child builds apps that use a camera to detect faces, recognize objects, and read emotions — the same technology used in self-driving cars and medical diagnostics.',
    emoji: '🤖',
    category: 'AI Builder',
    level: 'INTERMEDIATE',
    ageMin: 12,
    ageMax: 18,
    sessions: 8,
    lessons: [
      'How computers see images (pixels and arrays)',
      'OpenCV setup and first image processing',
      'Face detection with pre-trained models',
      'Emotion recognition and classification',
      'Object detection with YOLO',
      'Real-time webcam processing',
      'Building a full computer vision app',
      'Deploying and demoing your project',
    ],
  },
  {
    slug: 'language-models-and-chatbots',
    title: 'Language Models and Chatbots',
    description:
      "Your child learns how ChatGPT actually works, then builds their own chatbot applications using the OpenAI API — complete with memory, personality, and real-world purpose.",
    emoji: '🤖',
    category: 'AI Builder',
    level: 'ADVANCED',
    ageMin: 12,
    ageMax: 18,
    sessions: 8,
    lessons: [
      'How language models work (transformers simplified)',
      'OpenAI API setup and first call',
      'Prompt engineering fundamentals',
      'Building conversational memory',
      'Giving your bot a personality and purpose',
      'Connecting to external data sources',
      'Building a UI with Streamlit',
      'Deployment and sharing',
    ],
  },

  // Data Scientist Path — Ages 13-18
  {
    slug: 'python-for-data',
    title: 'Python for Data',
    description:
      'Every data project starts with messy, real-world data. Your child learns to wrangle it into something useful — finding patterns, calculating stats, and drawing conclusions.',
    emoji: '📊',
    category: 'Data Scientist',
    level: 'BEGINNER',
    ageMin: 13,
    ageMax: 18,
    sessions: 8,
    lessons: [
      'Why data science matters (real examples)',
      'Python refresher and Jupyter setup',
      'Loading data from CSV and Excel',
      'Pandas: selecting, filtering, sorting',
      'Cleaning data: nulls, duplicates, types',
      'Aggregations: group by, pivot tables',
      'Statistical summaries and correlation',
      'Full analysis project with a real dataset',
    ],
  },
  {
    slug: 'data-visualisation',
    title: 'Data Visualisation',
    description:
      'Data without visuals is just numbers. Your child learns to create charts that tell stories — the kind that make people say "I never knew that" when they look at the data.',
    emoji: '📊',
    category: 'Data Scientist',
    level: 'INTERMEDIATE',
    ageMin: 13,
    ageMax: 18,
    sessions: 8,
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
  },
  {
    slug: 'machine-learning-projects',
    title: 'Machine Learning Projects',
    description:
      'The pinnacle of data science: teaching a computer to predict outcomes. Your child builds real machine learning models — the same technology behind Netflix recommendations and fraud detection.',
    emoji: '📊',
    category: 'Data Scientist',
    level: 'ADVANCED',
    ageMin: 13,
    ageMax: 18,
    sessions: 8,
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
  },

  // Digital Independence Path — Ages 15-18
  {
    slug: 'build-your-professional-identity',
    title: 'Build Your Professional Identity',
    description:
      "Before you can pursue any opportunity, you need a credible online presence. Students learn to present themselves professionally, define a realistic area of focus, and turn real Lumexa projects into honest, demonstrated evidence of their skills.",
    emoji: '💼',
    category: 'Digital Independence',
    level: 'BEGINNER',
    ageMin: 15,
    ageMax: 18,
    sessions: 8,
    lessons: [
      'What professional identity means in the digital age',
      'Define your strengths and direction',
      'Build your portfolio website',
      'Tell your story professionally',
      'Create your personal brand',
      'Turn projects into proof',
      'Launch your professional website',
      'Build social proof',
    ],
  },
  {
    slug: 'skills-that-pay',
    title: 'Skills That Pay',
    description:
      'Students learn how skills become services and services become professional opportunities — without assuming every teenager can independently use adult marketplaces. Real platforms are taught as case studies, with their actual age and account rules, never a workaround.',
    emoji: '💼',
    category: 'Digital Independence',
    level: 'INTERMEDIATE',
    ageMin: 15,
    ageMax: 18,
    sessions: 8,
    lessons: [
      'How the freelance economy works',
      'Turn a skill into a service',
      'Build a service package',
      'Pricing, scope and agreements',
      'Finding your first opportunities',
      'Marketplace models: what changes at different ages?',
      'Proposals, communication and delivery',
      'The client simulation',
    ],
  },
  {
    slug: 'professional-presence-and-opportunity-building',
    title: 'Professional Presence & Opportunity Building',
    description:
      "Students build reputation and communicate professionally using LinkedIn where they're age-eligible (16+, subject to local law), and an equally credible portfolio-first path where they're not — so every student leaves discoverable and prepared.",
    emoji: '💼',
    category: 'Digital Independence',
    level: 'ADVANCED',
    ageMin: 15,
    ageMax: 18,
    sessions: 8,
    lessons: [
      'Your professional presence',
      'Build your professional profile',
      'Showcase your work',
      'Share what you know',
      'Build a professional presence beyond LinkedIn',
      'Networking & professional communication',
      'Build your 90-day opportunity plan',
      'Measure, reflect & improve',
    ],
  },
];

// ─── The flagship Odyssey bundle (9 courses / 72 lessons) ───────────────────
//
// The Odyssey overview PDF names each of its 9 stage-courses and their
// 8-lesson count, but (unlike the specialized-path PDFs) doesn't give a
// lesson-by-lesson breakdown for each one — so rather than inventing lesson
// titles that aren't in the source material, each module is seeded as one
// Lesson row (order 1-9) representing its 8-lesson block.

const ODYSSEY: CourseSeed & { modules: { title: string; sessions: number }[] } = {
  slug: 'lumexa-odyssey',
  title: 'Lumexa Odyssey',
  description:
    'The flagship path every new student takes. Odyssey is a guided journey across nine real courses — games, websites, apps, data, and AI — giving students broad, hands-on exposure before they choose a specialty. No prior coding experience needed.',
  emoji: '🚀',
  category: 'Odyssey',
  level: 'BEGINNER',
  ageMin: 12,
  ageMax: 18,
  sessions: 72,
  lessons: [],
  modules: [
    { title: 'Stage 1 · Scratch Adventures', sessions: 8 },
    { title: 'Stage 1 · Python for Young Builders', sessions: 8 },
    { title: 'Stage 1 · Python Arcade Games', sessions: 8 },
    { title: 'Stage 2 · HTML and CSS Mastery', sessions: 8 },
    { title: 'Stage 2 · Build Your Digital Identity', sessions: 8 },
    { title: 'Stage 2 · JavaScript and Interactivity', sessions: 8 },
    { title: 'Stage 3 · Python for Data', sessions: 8 },
    { title: 'Stage 3 · Python and AI Foundations', sessions: 8 },
    { title: 'Stage 3 · Roblox World Builder', sessions: 8 },
  ],
};

async function seedCourse(seed: CourseSeed, moduleLessons?: string[]) {
  const course = await prisma.course.upsert({
    where: { slug: seed.slug },
    update: {
      title: seed.title,
      description: seed.description,
      emoji: seed.emoji,
      category: seed.category,
      level: seed.level,
      ageMin: seed.ageMin,
      ageMax: seed.ageMax,
      sessions: seed.sessions,
    },
    create: {
      slug: seed.slug,
      title: seed.title,
      description: seed.description,
      emoji: seed.emoji,
      category: seed.category,
      level: seed.level,
      ageMin: seed.ageMin,
      ageMax: seed.ageMax,
      sessions: seed.sessions,
    },
  });

  const lessonTitles = moduleLessons ?? seed.lessons;
  const existingCount = await prisma.lesson.count({ where: { courseId: course.id } });
  if (existingCount === 0 && lessonTitles.length > 0) {
    await prisma.lesson.createMany({
      data: lessonTitles.map((title, i) => ({
        courseId: course.id,
        title,
        order: i + 1,
        duration: seed.sessions === lessonTitles.length ? 60 : Math.round((seed.sessions / lessonTitles.length) * 60),
      })),
    });
  }

  return course;
}

async function main() {
  console.log(`[seed:courses] Seeding ${SPECIALIZED_COURSES.length} specialized courses…`);
  for (const seed of SPECIALIZED_COURSES) {
    const course = await seedCourse(seed);
    console.log(`  ✓ ${course.category} — ${course.title}`);
  }

  console.log('[seed:courses] Seeding Lumexa Odyssey bundle…');
  const odyssey = await seedCourse(
    ODYSSEY,
    ODYSSEY.modules.map((m) => `${m.title} (8 lessons)`),
  );
  console.log(`  ✓ ${odyssey.category} — ${odyssey.title}`);

  console.log('[seed:courses] Done.');
}

main()
  .catch((err) => {
    console.error('[seed:courses] Fatal error:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
