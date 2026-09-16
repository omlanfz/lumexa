// FILE PATH: server/src/courses/course-catalog.seed.ts
//
// The default Lumexa course catalog — the 7 courses Lumexa currently offers:
// the flagship "Lumexa Odyssey" path and its 6 specialized 24-lesson
// pathways (Little Coders, Game Creator, Web Developer, AI Builder, Data
// Scientist, Digital Independence). Sourced directly from the curriculum
// PDFs, one Course row per path (not per sub-course) so this is exactly what
// Operations sees on /admin/courses out of the box.
//
// A student who needs something other than one of these 7 (e.g. an Odyssey
// track starting partway through because they already know the first two
// courses) gets a one-off custom Course created by an admin from the
// "Custom course for one student" option in the New Course modal — this
// catalog is only the default set, not the only courses that can ever exist.
//
// Idempotent — safe to call on every server boot (see CoursesService
// onModuleInit) and from the standalone `npm run seed:courses` script:
//   - Courses are upserted by `slug`, never duplicated.
//   - Lessons are only inserted the first time a course has none, so manual
//     edits made afterwards in the admin UI survive future boots.

import { PrismaClient } from '@prisma/client';

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
  /** Lesson titles, in order. Row `duration` is spread evenly across
   *  `sessions` so course total time always matches `sessions` hours. */
  lessons: string[];
}

export const COURSE_CATALOG: CourseSeed[] = [
  {
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
    // The Odyssey overview PDF names each of its 9 stage-courses and their
    // 8-lesson count, but (unlike the specialized-path PDFs) doesn't give a
    // lesson-by-lesson breakdown for each one — so each module is one row
    // representing its 8-lesson block rather than inventing lesson titles
    // that aren't in the source material.
    lessons: [
      'Stage 1 · Scratch Adventures (8 lessons)',
      'Stage 1 · Python for Young Builders (8 lessons)',
      'Stage 1 · Python Arcade Games (8 lessons)',
      'Stage 2 · HTML and CSS Mastery (8 lessons)',
      'Stage 2 · Build Your Digital Identity (8 lessons)',
      'Stage 2 · JavaScript and Interactivity (8 lessons)',
      'Stage 3 · Python for Data (8 lessons)',
      'Stage 3 · Python and AI Foundations (8 lessons)',
      'Stage 3 · Roblox World Builder (8 lessons)',
    ],
  },
  {
    slug: 'little-coders-path',
    title: 'Little Coders Path',
    description:
      'A gentle, hands-on introduction to computing for young learners. Students move from colorful visual blocks to real Python code and even a first taste of AI — building genuine, shareable projects the whole way, at a pace made for ages 6–11.',
    emoji: '✦',
    category: 'Little Coders',
    level: 'BEGINNER',
    ageMin: 6,
    ageMax: 11,
    sessions: 24,
    lessons: [
      // Course 10 · Scratch Adventures
      'What is coding and why does it matter',
      'Scratch setup and first sprite',
      'Motion, looks, and sounds blocks',
      'Events and broadcasting',
      'Loops and repetition',
      'Conditionals and decisions',
      'Building an interactive story',
      'Final project: our own game',
      // Course 11 · Python for Young Builders
      'From Scratch blocks to Python text',
      'Variables and user input',
      'Printing and string formatting',
      'If/else decisions',
      'While loops and for loops',
      'Lists and simple data',
      'Building a mini quiz app',
      'Final project: our own mini game',
      // Course 12 · AI for Kids: Smart Projects
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
  {
    slug: 'game-creator-path',
    title: 'Game Creator Path',
    description:
      "A complete, project-driven journey from a first Roblox build to a polished, published game. Students don't just play games — they design them, script them, and ship three real, playable games friends can actually try.",
    emoji: '🎮',
    category: 'Game Creator',
    level: 'INTERMEDIATE',
    ageMin: 10,
    ageMax: 18,
    sessions: 24,
    lessons: [
      // Course 01 · Roblox World Builder
      'Roblox Studio setup and first build',
      'Scripting basics in Lua',
      'Player mechanics and movement',
      'Game logic and scoring systems',
      'Multiplayer networking basics',
      'World design and aesthetics',
      'Testing, debugging, polishing',
      'Publishing and sharing with friends',
      // Course 02 · Python Arcade Games
      'Python basics for game development',
      'Pygame setup and game loop',
      'Sprites, images, and movement',
      'Collision detection',
      'Enemies, AI behavior, and scoring',
      'Sound effects and music',
      'Game states (menu, play, game over)',
      'Packaging and sharing your game',
      // Course 03 · Advanced Game Design
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
  {
    slug: 'web-developer-path',
    title: 'Web Developer Path',
    description:
      "A complete, project-driven journey from a first HTML page to a deployed, full-stack React application. Students don't just learn about the web — they write the code, style real interfaces, and ship three live, working websites anyone can visit.",
    emoji: '🌐',
    category: 'Web Developer',
    level: 'INTERMEDIATE',
    ageMin: 12,
    ageMax: 18,
    sessions: 24,
    lessons: [
      // Course 07 · HTML and CSS Mastery
      'How the web works (browsers, servers, HTML)',
      'HTML structure and semantic elements',
      'CSS basics: colors, fonts, spacing',
      'Flexbox for modern layouts',
      'CSS Grid for complex designs',
      'Responsive design and mobile-first',
      'Animations and hover effects',
      'Deploying to Vercel and sharing',
      // Course 08 · JavaScript and Interactivity
      'JavaScript fundamentals (variables, functions, loops)',
      'DOM manipulation: selecting and changing elements',
      'Event listeners: responding to user actions',
      'Fetch API: pulling live data from the web',
      'Async/await and working with APIs',
      'Local Storage for saving user data',
      'Building a complete interactive app',
      'Debugging and polishing',
      // Course 09 · React and Full-Stack Web
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
  {
    slug: 'ai-builder-path',
    title: 'AI Builder Path',
    description:
      "A complete, project-driven journey from first line of Python to real machine learning, computer vision, and large language model applications. Students don't just learn about AI — they write the code, train the models, and ship three working portfolio projects.",
    emoji: '🤖',
    category: 'AI Builder',
    level: 'INTERMEDIATE',
    ageMin: 12,
    ageMax: 18,
    sessions: 24,
    lessons: [
      // Course 04 · Python and AI Foundations
      'Python setup and first program',
      'Variables, data types, and logic',
      'Loops, functions, and modules',
      'Working with data and lists',
      'Introduction to machine learning concepts',
      'Building a first prediction model',
      'Training, testing, and evaluating models',
      'Presenting results to non-technical audiences',
      // Course 05 · Computer Vision Projects
      'How computers see images (pixels and arrays)',
      'OpenCV setup and first image processing',
      'Face detection with pre-trained models',
      'Emotion recognition and classification',
      'Object detection with YOLO',
      'Real-time webcam processing',
      'Building a full computer vision app',
      'Deploying and demoing your project',
      // Course 06 · Language Models and Chatbots
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
  {
    slug: 'data-scientist-path',
    title: 'Data Scientist Path',
    description:
      "A complete, project-driven journey from messy raw data to real, working predictive models. Students don't just learn about data science — they clean real datasets, build compelling visualizations, and train machine learning models that make real decisions.",
    emoji: '📊',
    category: 'Data Scientist',
    level: 'INTERMEDIATE',
    ageMin: 13,
    ageMax: 18,
    sessions: 24,
    lessons: [
      // Course 13 · Python for Data
      'Why data science matters (real examples)',
      'Python refresher and Jupyter setup',
      'Loading data from CSV and Excel',
      'Pandas: selecting, filtering, sorting',
      'Cleaning data: nulls, duplicates, types',
      'Aggregations: group by, pivot tables',
      'Statistical summaries and correlation',
      'Full analysis project with a real dataset',
      // Course 14 · Data Visualisation
      'The science of good data visualisation',
      'Matplotlib: line, bar, scatter plots',
      'Seaborn: statistical visualisations',
      'Choosing the right chart for your data',
      'Color, labels, and storytelling',
      'Interactive charts with Plotly',
      'Building a Dash dashboard',
      'Final: your own interactive dashboard',
      // Course 15 · Machine Learning Projects
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
  {
    slug: 'digital-independence-path',
    title: 'Digital Independence Path',
    description:
      'Build the portfolio, professional skills, digital reputation and business knowledge needed to turn your abilities into legitimate opportunities. The progression is Identity → Services → Clients → Professional Presence → Opportunities.',
    emoji: '💼',
    category: 'Digital Independence',
    level: 'ADVANCED',
    ageMin: 15,
    ageMax: 18,
    sessions: 24,
    lessons: [
      // Course 16 · Build Your Professional Identity
      'What professional identity means in the digital age',
      'Define your strengths and direction',
      'Build your portfolio website',
      'Tell your story professionally',
      'Create your personal brand',
      'Turn projects into proof',
      'Launch your professional website',
      'Build social proof',
      // Course 17 · Skills That Pay
      'How the freelance economy works',
      'Turn a skill into a service',
      'Build a service package',
      'Pricing, scope and agreements',
      'Finding your first opportunities',
      'Marketplace models: what changes at different ages?',
      'Proposals, communication and delivery',
      'The client simulation',
      // Course 18 · Professional Presence & Opportunity Building
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

/** Upserts every course in COURSE_CATALOG and (only the first time, so
 *  manual admin edits are never overwritten) its lessons. Accepts any
 *  Prisma client — PrismaService in the running app, or a bare PrismaClient
 *  from the standalone seed script. */
export async function seedCourseCatalog(
  prisma: PrismaClient | { course: any; lesson: any },
) {
  const results: { slug: string; title: string; created: boolean }[] = [];

  for (const seed of COURSE_CATALOG) {
    const existing = await prisma.course.findUnique({
      where: { slug: seed.slug },
      select: { id: true },
    });

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

    const lessonCount = await prisma.lesson.count({
      where: { courseId: course.id },
    });
    if (lessonCount === 0 && seed.lessons.length > 0) {
      const duration = Math.round((seed.sessions / seed.lessons.length) * 60);
      await prisma.lesson.createMany({
        data: seed.lessons.map((title, i) => ({
          courseId: course.id,
          title,
          order: i + 1,
          duration,
        })),
      });
    }

    results.push({ slug: seed.slug, title: seed.title, created: !existing });
  }

  return results;
}
