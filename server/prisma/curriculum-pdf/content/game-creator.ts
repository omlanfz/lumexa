import type { ProgramContent } from '../types';
import {
  PERK_BUILD,
  PERK_PORTFOLIO,
  PERK_TESTED,
  standardAssessments,
  withTest,
} from './shared';
import { moduleLessons } from './data';

export const GAME_CREATOR: ProgramContent = {
  slug: 'game-creator',
  fileName: 'game-creator-path-curriculum.pdf',
  attachToCertificateEmail: true,
  themeKey: 'game',
  shortName: 'Game Creator',
  eyebrow: 'CURRICULUM OVERVIEW',
  heroTitle: 'Game Creator Path',
  heroSubtitle: 'Build 3 Real Games',
  intro:
    'A complete, project-driven journey from a first Roblox build to a polished, published game. Students don’t just play games — they design them, script them, and ship three real, playable games friends can actually try.',
  strip: [
    {
      big: '3',
      label: 'Real games to ship',
      sub: 'Playable, shareable, portfolio-ready',
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
      title: 'Roblox World Builder',
      subtitle: 'Build and publish a multiplayer Roblox game from scratch',
      tools: ['Roblox Studio', 'Lua scripting', 'Roblox DevHub'],
      overview:
        'Your child goes from zero to a working multiplayer Roblox game. They design the world, write the Lua code, set up game logic, and publish it so friends can actually play it.',
      projects: [
        'Obstacle course with scoring',
        'Multiplayer arena with teams',
        'Custom game world with NPCs',
      ],
      why: 'Roblox is where millions of players already spend time — and where they build. Scripting in Lua teaches real programming logic while students create something their friends can join and play immediately.',
      lessons: moduleLessons('game-creator-path', 'roblox-world-builder'),
      snapshots: [
        {
          id: 'galactic-shooter',
          title: 'Galactic Shooter',
          tech: 'Roblox · Lua',
        },
      ],
      snapshotNote:
        'A space shooter with lasers, a score and a live leaderboard — the game loop and scoring ideas this course teaches.',
      teaser: 'Build and publish a multiplayer Roblox game.',
    }),
    withTest({
      title: 'Python Arcade Games',
      subtitle: 'Build 2D games using Python and Pygame',
      tools: ['Python 3', 'Pygame', 'VS Code'],
      overview:
        'After Roblox, your child levels up to Python, the real language used by professional game developers and AI engineers. They build 2D arcade games from scratch.',
      projects: [
        'Space shooter with enemies',
        'Maze runner with timer',
        'Brick-breaker clone',
      ],
      why: 'Every real game — from indie hits to AAA titles — runs on the same fundamentals taught here: a game loop, sprites, collision detection, and state management. Pygame makes those ideas concrete and visible.',
      lessons: moduleLessons('game-creator-path', 'python-arcade-games'),
      snapshots: [
        {
          id: 'python-arcade',
          title: 'Python Arcade Game',
          tech: 'Python · Pygame',
        },
      ],
      snapshotNote:
        'A side-scrolling arcade game with enemies, coins, power-ups and a high-score table, built with Pygame.',
      teaser: 'Build 2D arcade games with Python and Pygame.',
    }),
    withTest({
      title: 'Advanced Game Design',
      subtitle:
        'Design, polish, and publish a complete game with professional quality',
      tools: ['Python / Pygame', 'Unity Basics', 'Game Design Frameworks'],
      overview:
        'The capstone course. Your child applies everything they know to design and ship a complete game — proper level design, a polished UI, and real playtesters giving feedback.',
      projects: [
        'RPG adventure with storyline',
        'Physics-based puzzle game',
        'Published portfolio game',
      ],
      why: 'Making a fun game takes more than code — it takes design thinking, iteration, and real player feedback. This course teaches the professional workflow behind every shipped title, from prototype to playtested, polished release.',
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
      snapshots: [
        { id: 'rpg-quest-world', title: 'RPG Quest World', tech: 'Unity · C#' },
      ],
      snapshotNote:
        'A top-down adventure with quests, friendly characters and simple combat — designed, playtested and polished.',
      teaser: 'Design, polish and publish a complete game.',
    }),
  ],
  highlights: [
    { ...PERK_BUILD, title: 'Learn by shipping, not by watching' },
    {
      ...PERK_PORTFOLIO,
      body: 'Students finish with three real games they can publish, share and keep building on.',
    },
    PERK_TESTED,
  ],
  assessments: standardAssessments({
    intro:
      'Every game course ends with a course test, and a final test closes the path. They check the ideas behind the games — game loops, scripting, collisions and design — not just the finished build.',
    finalBlurb:
      'One final test across Roblox, Python games and game design: questions plus a small practical project.',
    sample: {
      mcq: {
        question: 'What does a game loop do on every frame?',
        options: [
          'It deletes the game',
          'It updates the game and redraws everything',
          'It saves the high score online',
          'It turns the sound off',
        ],
        answer: 1,
      },
      trueFalse: {
        statement:
          'Collision detection checks whether two objects are touching.',
        answer: true,
      },
    },
  }),
  journeyIntro:
    'Across 3 courses, 24 lessons and 4 tests, students progress from their first Roblox build to a fully designed and polished game — walking away with three real, playable games for their portfolio.',
  outcomes: [
    'Script and publish a working multiplayer game in Roblox Studio using Lua.',
    'Build a complete 2D arcade game in Python, including sprites, collisions, and sound.',
    'Design, playtest, and publish a polished, professional-quality game of their own.',
  ],
  journeyProjects: [
    ['Obstacle course', 'Multiplayer arena', 'Custom world with NPCs'],
    ['Space shooter', 'Maze runner with timer', 'Brick-breaker clone'],
    ['RPG adventure', 'Physics puzzle game', 'Published portfolio game'],
  ],
  ctaLine: 'Ready to start building?',
};
