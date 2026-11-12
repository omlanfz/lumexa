// Pieces every program's PDF content shares: the standard test formats (from the assessment banks),
// the wording around them, and the three "perks" on the cover.

import type {
  AssessmentContent,
  CourseContent,
  SampleQuestions,
  TestKind,
} from '../types';

// ─── Test formats ───────────────────────────────────────────────────────────
// These mirror what the platform really gives students (server/src/assessments/bank/bank.constants.ts):
//   course test / stage test  30 multiple-choice + 10 true/false, 1 mark each = 40 marks
//   final test                25 multiple-choice + 5 true/false + a ~15-minute coding project (20 marks) = 50 marks
// Little Coders has its own layout (10 + 5 + a 25-mark practical, 40 minutes, 40 marks) — see little-coders.ts.

export const COURSE_TEST: TestKind = {
  name: 'COURSE TEST',
  headline: 'Show what you built and learned',
  blurb:
    'After every 8 lessons a course test checks the ideas and skills of that course, so each next course starts on solid ground.',
  tags: ['30 multiple-choice', '10 true / false', '40 marks'],
  parts: [
    {
      label: '30',
      detail: 'multiple-choice questions — choose one of four answers',
    },
    { label: '10', detail: 'true / false questions' },
    { label: '40', detail: 'marks in total — 1 mark for every question' },
  ],
};

export const STAGE_TEST: TestKind = {
  name: 'STAGE TEST',
  headline: 'Prove a whole stage',
  blurb:
    'At the end of each stage, a stage test looks across the three courses just finished, so nothing is left behind.',
  tags: ['30 multiple-choice', '10 true / false', '40 marks'],
  parts: [
    { label: '30', detail: 'multiple-choice questions across the stage' },
    { label: '10', detail: 'true / false questions' },
    { label: '40', detail: 'marks in total — 1 mark for every question' },
  ],
};

export const FINAL_TEST: TestKind = {
  name: 'FINAL TEST',
  headline: 'One final test on the whole curriculum',
  blurb:
    'The finish line: questions across everything in the program, plus a small practical project that your teacher marks.',
  tags: [
    '25 multiple-choice',
    '5 true / false',
    'practical project',
    '50 marks',
  ],
  parts: [
    { label: '25', detail: 'multiple-choice questions' },
    { label: '5', detail: 'true / false questions' },
    {
      label: '20',
      detail:
        'marks for one small practical project (about 15 minutes) that your teacher marks',
    },
  ],
};

export const AFTER_EVERY_TEST: AssessmentContent['afterwards'] = [
  {
    title: 'Saved as you go',
    body: 'Answers save automatically while a student works, so nothing is lost if the connection drops.',
  },
  {
    title: 'Checked by the teacher',
    body: 'The teacher reviews the report and shares the result with the student.',
  },
  {
    title: 'Fair for everyone',
    body: 'Questions and answer options appear in a different order for every student.',
  },
];

export function standardAssessments(opts: {
  intro: string;
  stages?: boolean;
  finalBlurb?: string;
  sample: SampleQuestions;
}): AssessmentContent {
  return {
    title: 'Level-Up Checkpoints',
    intro: opts.intro,
    courseTest: COURSE_TEST,
    ...(opts.stages ? { stageTest: STAGE_TEST } : {}),
    finalTest: {
      ...FINAL_TEST,
      ...(opts.finalBlurb ? { blurb: opts.finalBlurb } : {}),
    },
    sample: opts.sample,
    afterwards: AFTER_EVERY_TEST,
  };
}

// ─── Courses ────────────────────────────────────────────────────────────────

/** A course with its test title and blurb filled in the same way everywhere. */
export function withTest(
  c: Omit<CourseContent, 'testTitle' | 'testBlurb'>,
  testWord: 'Course Test' | 'Course Assessment' = 'Course Test',
): CourseContent {
  return {
    ...c,
    testTitle: `${c.title} — ${testWord}`,
    testBlurb: `Checks what you built and learned in ${c.title}. Taken after lesson 8, before the next course begins.`,
  };
}

// ─── Cover perks ────────────────────────────────────────────────────────────

export const PERK_BUILD = {
  title: 'Learn by building, not by watching',
  body: 'Every lesson pairs a real idea with a real, hands-on build. No shallow demos, no unfinished prototypes.',
};
export const PERK_PORTFOLIO = {
  title: 'A portfolio, not just a certificate',
  body: 'Students finish with real projects they can show, explain and keep building on.',
};
export const PERK_TESTED = {
  title: 'Tested, so progress is real',
  body: 'Every course ends with a test, and a final test closes the program, so progress is proven, not assumed.',
};
