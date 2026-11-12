// Little Coders (ages 6–12): built from the same course and lesson definitions the platform runs on,
// so the PDF can never list a lesson, tool or project the program does not have.

import {
  LC_COURSES,
  DEFAULT_PLATFORMS,
  type LcCourseMeta,
} from '../../../src/little-coders/lc.constants';
import { LC_LESSON_SPECS } from '../../../src/little-coders/curriculum';
import type {
  AssessmentContent,
  CourseContent,
  ProgramContent,
  TestKind,
} from '../types';
import { PERK_BUILD } from './shared';

const lowerFirst = (s: string): string =>
  s.charAt(0).toLowerCase() + s.slice(1);

const lessonsOf = (course: number) =>
  LC_LESSON_SPECS.filter((s) => s.course === course).sort(
    (a, b) => a.lesson - b.lesson,
  );

function toolsOf(c: LcCourseMeta): string[] {
  const names = c.platforms.map(
    (key) => DEFAULT_PLATFORMS.find((p) => p.key === key)?.name ?? key,
  );
  if (c.track === 'ai') names.push('TM2Scratch extension');
  if (c.track === 'python') names.push('Python');
  return names;
}

/** What each course is for, in a sentence a parent can read at a glance. */
const WHY: Record<number, string> = {
  1: 'Scratch turns “how does code work?” into play. Children learn to give instructions in order, make characters move and talk, and finish a story — the foundation of every later project.',
  2: 'Games are the best reason to practise logic. Controls, scores, lives and levels teach children to plan, test and fix — and they end with a game friends can play.',
  3: 'Children use AI every day without seeing how it learns. Here they train their own model with a webcam and a microphone, so AI stops being magic and becomes something they understand.',
  4: 'Block-based Python gives children real Python ideas — loops, variables, decisions — without the typing hurdle, so the move to typed code later feels natural.',
  5: 'Lists, functions and bug-hunting are the habits of real programmers. This course lets children use them on their own space adventure, independently.',
};

const NOTE: Record<number, string> = {
  1: 'A story project where sprites move, talk and react — the animation and event ideas of this course in action.',
  2: 'A game with controls, a score and a challenge, built from sprites, variables and decisions.',
  3: 'A sorting game powered by a model the student trained themselves on everyday objects with a webcam.',
  4: 'Python drawing with loops: code that makes the turtle trace a pattern, shown next to the shape it draws.',
  5: 'A block-based Python program with lists, functions and loops that runs a whole space parade.',
};

const SNAPSHOT: Record<number, { id: string; title: string; tech: string }> = {
  1: {
    id: 'safari-adventure',
    title: 'Safari Adventure',
    tech: 'Scratch-style blocks',
  },
  2: {
    id: 'space-maths-quiz',
    title: 'Space Maths Game',
    tech: 'Scratch-style blocks',
  },
  3: {
    id: 'ai-recycling-rangers',
    title: 'AI Recycling Rangers',
    tech: 'Teachable Machine · Stretch3',
  },
  4: { id: 'drawing-robot', title: 'Drawing Robot', tech: 'Python · Turtle' },
  5: {
    id: 'python-space-adventure',
    title: 'Space Parade',
    tech: 'EduBlocks · Python',
  },
};

const courses: CourseContent[] = LC_COURSES.map((c) => {
  const lessons = lessonsOf(c.number);
  if (lessons.length !== 8)
    throw new Error(
      `Little Coders course ${c.number} has ${lessons.length} lessons, expected 8.`,
    );
  return {
    title: c.title,
    subtitle: c.description,
    tools: toolsOf(c),
    overview: `${c.focus}. Students learn to ${lowerFirst(c.outcomes[0])} and ${lowerFirst(c.outcomes[1])} — and more.`,
    projects: lessons.map((l) => l.project.name),
    why: WHY[c.number],
    lessons: lessons.map((l) => l.title),
    snapshots: [SNAPSHOT[c.number]],
    snapshotNote: NOTE[c.number],
    testTitle: `${c.title} — Course Assessment`,
    testBlurb:
      'A friendly check on what you built in this course: think in blocks, a quick check, then build a project. Taken after lesson 8.',
    teaser: c.focus,
  };
});

const COURSE_ASSESSMENT: TestKind = {
  name: 'COURSE ASSESSMENT',
  headline: 'Think, check and build',
  blurb:
    'Every course ends with an assessment in the same friendly layout: think in blocks, a quick check, then build a project of your own.',
  tags: [
    '10 multiple-choice',
    '5 true / false',
    '25-mark project',
    '40 minutes',
  ],
  parts: [
    {
      label: '10',
      detail:
        'Think in Blocks — multiple-choice questions, many with a block script',
    },
    { label: '5', detail: 'Quick Check — true / false' },
    {
      label: '25',
      detail:
        'Build It! — one practical project in Stretch3 (courses 1–3) or EduBlocks (4–5)',
    },
  ],
};

const FINAL_ASSESSMENT: TestKind = {
  name: 'FINAL ASSESSMENT',
  headline: 'One assessment on the whole program',
  blurb:
    'The finish line: the same three parts, drawing on all five courses — with a Scratch & AI project or a Python project.',
  tags: ['10 multiple-choice', '5 true / false', '25-mark project', '40 marks'],
  parts: COURSE_ASSESSMENT.parts,
};

const assessments: AssessmentContent = {
  title: 'Level-Up Checkpoints',
  intro:
    'Each of the five courses ends with an assessment, and a final assessment closes the program. They are 40 minutes and 40 marks, in a friendly layout: think in blocks, a quick check, then a build-it project. No negative marking, ever.',
  courseTest: COURSE_ASSESSMENT,
  finalTest: FINAL_ASSESSMENT,
  sample: {
    mcq: {
      question:
        'Which block makes a sprite repeat the same steps again and again?',
      options: ['forever', 'say Hello!', 'play sound Meow', 'go to x: 0 y: 0'],
      answer: 0,
    },
    trueFalse: {
      statement: 'In Python, print() shows words on the screen.',
      answer: true,
    },
  },
  afterwards: [
    {
      title: 'Marked and checked',
      body: 'The quiz parts are marked automatically. A teacher marks the Build It! project against a clear rubric.',
    },
    {
      title: 'Shared with parents',
      body: 'A report reaches parents once the teacher has completed the review.',
    },
    {
      title: 'Never a penalty for guessing',
      body: 'There is no negative marking, and the last five minutes are kept for review and hand-in.',
    },
  ],
};

export const LITTLE_CODERS: ProgramContent = {
  slug: 'little-coders',
  fileName: 'little-coders-path-curriculum.pdf',
  attachToCertificateEmail: true,
  themeKey: 'little',
  shortName: 'Little Coders',
  eyebrow: 'CURRICULUM OVERVIEW',
  heroTitle: 'Little Coders',
  heroSubtitle: 'Scratch, AI & Python — One Playful Step at a Time',
  intro:
    'A gentle, hands-on journey: from colourful Scratch blocks to games, AI-powered projects and block-based Python — building real, shareable projects the whole way. Five independent courses; families enrol one course at a time.',
  strip: [
    {
      big: '40',
      label: 'Lessons · 5 courses',
      sub: 'Scratch, AI and Python — each lesson ends in a project',
    },
    {
      big: '6',
      label: 'Assessments',
      sub: '5 course assessments + 1 final assessment',
    },
  ],
  stats: [
    { value: '5', label: 'Courses' },
    { value: '40', label: 'Lessons' },
    { value: '46', label: 'Classes in total' },
  ],
  courses,
  highlights: [
    {
      ...PERK_BUILD,
      title: 'Learn by making',
      body: 'Every lesson has a mission, a demo and a project — children build something they can open, share and show.',
    },
    {
      title: 'One course at a time',
      body: 'The five courses are independent: start with Scratch Adventures, or pick up where your child left off.',
    },
    {
      title: 'Assessments that feel like a game',
      body: 'Think in blocks, a quick check, then build it: friendly 40-minute assessments, with no negative marking.',
    },
  ],
  assessments,
  journeyIntro:
    'Across 5 courses, 40 lessons and 6 assessments, children move from their first Scratch sprite to AI projects and block-based Python — about six months at two classes a week, and a real project at the end of every lesson.',
  outcomes: [
    'Build animated stories and arcade-style games in Scratch.',
    'Train an AI model with a webcam and a microphone, and use it in a Scratch project.',
    'Read and build Python programs with blocks, then finish a space adventure of their own.',
  ],
  journeyProjects: [1, 2, 3, 4, 5].map((n) => {
    const l = lessonsOf(n);
    return [l[1].project.name, l[4].project.name, l[7].project.name];
  }),
  ctaLine: 'Ready for the first mission?',
};
