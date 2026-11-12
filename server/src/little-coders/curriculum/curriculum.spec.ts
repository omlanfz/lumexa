// The redesigned Little Coders curriculum, checked against the source of truth in the brief:
// five independent courses × eight lessons, the exact titles and projects, the finalized Course 3
// (classes, sprites, platforms), the "Your Learning Preview" video scripts, the project cards and
// the homework cards. Every block name / sprite in the lessons is also validated when each lesson is
// built (see build-lesson.ts), so a typo in a block or a sprite fails this suite.

import { pythonAvailable, runPython } from '../../assessments/bank/bank.verify';
import { toPythonSource } from '../blocks/block-dsl';
import { LC_COURSES, LC_LESSONS_PER_COURSE, LC_LEARNING_TOTAL, LC_SESSIONS_TOTAL, lcLessonOrder } from '../lc.constants';
import { narrationWords } from '../lc.validate';
import { pythonProgram, syntaxCheckProgram } from '../testing/python-stub';
import { LC_LESSON_SPECS, lcLessonPatches, lcPatchFor } from './index';

/** [course, lesson, title, project] — copied from the brief, not from the data files. */
const EXPECTED: [number, number, string, string | null][] = [
  [1, 1, 'Welcome to Scratch!', 'Rocket Launch'],
  [1, 2, "Let's Make Things Move!", 'Dancing Alien'],
  [1, 3, 'Give Your Characters a Personality', 'Talking Space Pet'],
  [1, 4, 'Making Things Interactive', 'Control Your Rocket'],
  [1, 5, 'Sounds, Music & Effects', 'Space DJ'],
  [1, 6, 'The Magic of Repetition', 'Dancing Starfield'],
  [1, 7, 'Bringing Characters to Life', 'Alien Animation Studio'],
  [1, 8, 'My First Animated Story', 'Lost Space Puppy'],
  [2, 1, 'Game Controls & Movement', 'Asteroid Maze'],
  [2, 2, 'Making Sprites Interact', 'Catch the Falling Stars'],
  [2, 3, 'Keeping Score!', 'Star Collector'],
  [2, 4, 'Making Decisions with Code', 'Keycard Escape'],
  [2, 5, 'Randomness & Game Challenges', 'Mystery Prize Machine'],
  [2, 6, 'Timers, Lives & Survival', 'Meteor Dodge'],
  [2, 7, 'Multiple Levels & Game Scenes', 'Space Mission: Three Levels'],
  [2, 8, 'Clones & Arcade Games', 'Meteor Blaster'],
  [3, 1, "Giga's AI Snack Buddy", 'Alien Pet Café'],
  [3, 2, "Pico's AI Space Rescue Scanner", null],
  [3, 3, 'AI Recycling Rangers', null],
  [3, 4, 'AI Superhero Power-Up Lab', null],
  [3, 5, 'AI Space Explorer Packing Mission', null],
  [3, 6, 'AI Voice-Controlled Rocket Mission', null],
  [3, 7, "The Wizard's Magic Spellbook", null],
  [3, 8, 'The AI Quiz Show Challenge', null],
  [4, 1, 'Welcome to Python!', 'Mission Control Console'],
  [4, 2, 'Drawing with Python', 'Rocket Badge'],
  [4, 3, 'Repeat Magic in Python', 'Rainbow Galaxy'],
  [4, 4, 'Variables & Calculations', 'Moon Base Supply Calculator'],
  [4, 5, 'Let the User Join In!', 'Space Passport Generator'],
  [4, 6, 'Making Decisions in Python', 'Oxygen Safety Checker'],
  [4, 7, 'Randomness & Smart Decisions', 'Alien Treasure Machine'],
  [4, 8, 'My First Python Game', 'Space Rescue Quiz'],
  [5, 1, 'Working with Lists', 'Planet Picker'],
  [5, 2, 'Loops & Collections', 'Solar System Parade'],
  [5, 3, 'Creating Your Own Functions', 'Star Stamp Studio'],
  [5, 4, 'Functions with Superpowers', 'Custom Planet Maker'],
  [5, 5, 'Keep Going Until It Works!', 'Space Password Challenge'],
  [5, 6, 'Loops Inside Loops', 'Galaxy Pattern Generator'],
  [5, 7, 'Finding & Fixing Bugs', 'Repair Mission Control'],
  [5, 8, 'My Python Capstone', 'Space Explorer Adventure'],
];

/** Course 3: the model classes of each lesson, exactly as finalized. */
const AI_CLASSES: Record<number, string[]> = {
  1: ['Apple', 'Banana', 'Bread'],
  2: ['Key', 'Pencil', 'Ball'],
  3: ['Paper', 'Plastic bottle', 'Metal can'],
  4: ['Book', 'Spoon', 'Flashlight'],
  5: ['Shirt', 'Shoes', 'Glass of water'],
  6: ['Go', 'Stop', 'Home'],
  7: ['Fire', 'Ice', 'Zap'],
  8: ['Yes', 'No', 'Help'],
};

/** Course 3: the built-in Scratch sprites and costumes of each lesson, exactly as finalized. */
const AI_SPRITES: Record<number, Record<string, string[]>> = {
  1: { Giga: ['Giga-a', 'Giga-b', 'Giga-c', 'Giga-d'], Apple: ['Apple'], Bananas: ['Bananas'], Bread: ['Bread'] },
  2: {
    Pico: ['Pico-a', 'Pico-b', 'Pico-c', 'Pico-d'],
    Key: ['Key'],
    Pencil: ['Pencil-a', 'Pencil-b'],
    Ball: ['Ball-a', 'Ball-b', 'Ball-c', 'Ball-d', 'Ball-e'],
    Rocketship: ['Rocketship-a', 'Rocketship-b', 'Rocketship-c', 'Rocketship-d', 'Rocketship-e'],
  },
  3: { Robot: ['Robot-a', 'Robot-b', 'Robot-c', 'Robot-d'], Bowl: ['Bowl-a'], Star: ['Star'] },
  4: { Pico: ['Pico-a', 'Pico-b', 'Pico-c', 'Pico-d'], Lightning: ['Lightning'], Star: ['Star'] },
  5: {
    Tera: ['Tera-a', 'Tera-b', 'Tera-c', 'Tera-d'],
    Shirt: ['Shirt-a'],
    Shoes: ['Shoes-a', 'Shoes-b', 'Shoes-c', 'Shoes-d'],
    'Glass Water': ['Glass Water-a', 'Glass Water-b'],
    Rocketship: ['Rocketship-a', 'Rocketship-b', 'Rocketship-c', 'Rocketship-d', 'Rocketship-e'],
  },
  6: {
    Rocketship: ['Rocketship-a', 'Rocketship-b', 'Rocketship-c', 'Rocketship-d', 'Rocketship-e'],
    Robot: ['Robot-a', 'Robot-b', 'Robot-c', 'Robot-d'],
  },
  7: {
    Wizard: ['Wizard-a', 'Wizard-b', 'Wizard-c'],
    'Magic Wand': ['Magicwand'],
    Potion: ['Potion-a', 'Potion-b', 'Potion-c'],
    Snowflake: ['Snowflake'],
    Lightning: ['Lightning'],
  },
  8: { Giga: ['Giga-a', 'Giga-b', 'Giga-c', 'Giga-d'], Star: ['Star'] },
};

const specOf = (course: number, lesson: number) => LC_LESSON_SPECS.find((s) => s.course === course && s.lesson === lesson)!;

describe('Little Coders — program structure', () => {
  it('is five independent courses of eight lessons: 40 lessons, 5 course assessments, 1 final = 46 classes', () => {
    expect(LC_COURSES).toHaveLength(5);
    expect(LC_LESSONS_PER_COURSE).toBe(8);
    expect(LC_LEARNING_TOTAL).toBe(40);
    expect(LC_SESSIONS_TOTAL).toBe(46);
    expect(LC_LESSON_SPECS).toHaveLength(40);
    for (const course of LC_COURSES) {
      expect(LC_LESSON_SPECS.filter((s) => s.course === course.number)).toHaveLength(8);
    }
  });

  it('names the courses and platforms as agreed — and "Python for Young Builders" no longer exists', () => {
    expect(LC_COURSES.map((c) => c.title)).toEqual([
      'Scratch Adventures',
      'Scratch Game Studio',
      'AI for Kids: Smart Projects',
      'Python Explorers',
      'Python Creative Lab',
    ]);
    expect(LC_COURSES.map((c) => c.track)).toEqual(['scratch', 'scratch', 'ai', 'python', 'python']);
    expect(JSON.stringify(LC_COURSES)).not.toMatch(/Python for Young Builders/i);
    expect(JSON.stringify(LC_LESSON_SPECS)).not.toMatch(/Python for Young Builders/i);
  });

  it('numbers the sessions 9 per course: 8 lessons, then that course’s assessment; the final is 46', () => {
    expect(lcLessonOrder(1, 1)).toBe(1);
    expect(lcLessonOrder(1, 8)).toBe(8);
    expect(lcLessonOrder(2, 1)).toBe(10);
    expect(lcLessonOrder(5, 8)).toBe(44);
  });

  it.each(EXPECTED)('course %i lesson %i is “%s”', (course, lesson, title, project) => {
    const spec = specOf(course, lesson);
    expect(spec.title).toBe(title);
    if (project) expect(spec.project.name).toBe(project);
  });
});

describe('Little Coders — every lesson builds and validates', () => {
  const patches = lcLessonPatches();

  it('builds all 40 lessons (blocks, sprites and Python are checked against the verified catalogs)', () => {
    expect(patches.size).toBe(40);
  });

  it.each(EXPECTED)('course %i lesson %i has the full lesson page', (course, lesson) => {
    const p = lcPatchFor(course, lesson);
    const e = p.experience;
    // The structure the brief asks for: a mission, big ideas, a live demo, real examples, tips and a common
    // mistake, a challenge, the in-class project and a homework.
    expect(e.mission.hook.length).toBeGreaterThan(10);
    expect(e.concepts.length).toBeGreaterThanOrEqual(3);
    expect(e.demo.kind).toMatch(/scratch-stage|python-run|ai-image|ai-voice/);
    expect(e.examples.length).toBeGreaterThanOrEqual(1);
    expect(e.tips.some((t) => t.kind === 'mistake' && !!t.fix)).toBe(true);
    expect(['choose', 'order']).toContain(e.challenge.kind);
    expect(e.project.steps.length).toBeGreaterThanOrEqual(4);
    expect(e.project.checklist.length).toBeGreaterThanOrEqual(3);
    expect(e.homework.deliverable.length).toBeGreaterThan(5);
    expect(e.toolbox.length).toBeGreaterThan(0);
    expect(p.teacherNotes.length).toBeGreaterThan(40);
    expect(p.contentMarkdown).toContain(`# ${p.title}`);
    expect(p.checkpoint).toContain(e.project.name);
  });

  it('every lesson’s demo, examples and project are in the language of its course', () => {
    for (const spec of LC_LESSON_SPECS) {
      const lang = spec.platform === 'EDUBLOCKS' ? 'edublocks' : 'scratch';
      for (const s of [...spec.examples, ...spec.project.stacks]) expect(s.language).toBe(lang);
      if (spec.platform === 'EDUBLOCKS') expect(spec.demo.kind).toBe('python-run');
      else if (spec.ai) expect(spec.demo.kind).toMatch(/^ai-/);
      else expect(spec.demo.kind).toBe('scratch-stage');
    }
  });
});

describe('Little Coders — Course 3 (AI for Kids: Smart Projects), as finalized', () => {
  it.each(Object.keys(AI_CLASSES).map(Number))('lesson %i trains exactly its three agreed classes', (lesson) => {
    const ai = specOf(3, lesson).ai!;
    expect(ai.classes.map((c) => c.name)).toEqual(AI_CLASSES[lesson]);
    expect(ai.classes).toHaveLength(3);
    expect(ai.kind).toBe(lesson <= 5 ? 'image' : 'sound');
    // A background-noise class only for sound models.
    expect(ai.background).toBe(lesson > 5);
    expect(ai.classes.every((c) => c.minExamples >= 5)).toBe(true);
  });

  it.each(Object.keys(AI_SPRITES).map(Number))('lesson %i uses exactly the built-in sprites and costumes of the brief', (lesson) => {
    const assets = specOf(3, lesson).project.assets ?? [];
    const got = Object.fromEntries(assets.map((a) => [a.name, a.costumes ?? []]));
    expect(got).toEqual(AI_SPRITES[lesson]);
  });

  it('there are five image-classification lessons, then three spoken-word lessons', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8].map((l) => specOf(3, l).ai!.kind)).toEqual(['image', 'image', 'image', 'image', 'image', 'sound', 'sound', 'sound']);
  });

  it('uses the webcam / microphone for everyday objects and words — no pose, gesture or hand tracking', () => {
    for (let lesson = 1; lesson <= 8; lesson++) {
      const text = JSON.stringify(lcPatchFor(3, lesson).experience).toLowerCase();
      expect(text).not.toMatch(/pose|gesture|hand.?track|body.?track|skeleton/);
    }
  });

  it('every lesson trains in Teachable Machine and builds in Stretch3, and homework reuses the model', () => {
    for (let lesson = 1; lesson <= 8; lesson++) {
      const p = lcPatchFor(3, lesson);
      expect(p.projectCard.platforms.map((b) => b.platform)).toEqual(['TEACHABLE_MACHINE', 'STRETCH3']);
      expect(p.projectCard.platforms.map((b) => b.label)).toEqual(['Train AI Model', 'Build in Stretch3']);
      expect(p.homeworkCard.platforms.map((b) => b.platform)).toEqual(['STRETCH3']);
      expect(p.homeworkCard.helper).toMatch(/model you trained/i);
    }
  });
});

describe('Little Coders — "Your Learning Preview" video of every lesson', () => {
  it.each(EXPECTED)('course %i lesson %i has a complete 90-second script and storyboard', (course, lesson) => {
    const v = lcPatchFor(course, lesson).previewVideo;
    expect(v.title).toBe('Your Learning Preview');
    expect(v.brief.targetSeconds).toBe(90);
    // hook · concept · visuals · example · tip · challenge + close
    expect(v.brief.scenes.map((s) => s.time)).toEqual(['0:00–0:08', '0:08–0:20', '0:20–0:50', '0:50–1:10', '1:10–1:20', '1:20–1:30']);
    for (const s of v.brief.scenes) {
      expect(s.visual.length).toBeGreaterThan(10);
      expect(s.narration.length).toBeGreaterThan(10);
      expect(s.onScreen.length).toBeGreaterThan(1);
    }
    const words = narrationWords(v);
    expect(words).toBeGreaterThanOrEqual(100);
    expect(words).toBeLessThanOrEqual(135);
    expect(v.brief.tip.length).toBeGreaterThan(5);
    expect(v.brief.challenge.length).toBeGreaterThan(5);
  });

  it('never claims a video exists: every address starts empty for an admin to add', () => {
    for (const spec of LC_LESSON_SPECS) {
      const v = lcPatchFor(spec.course, spec.lesson).previewVideo;
      expect([v.videoUrl, v.posterUrl, v.captionsUrl]).toEqual(['', '', '']);
      expect(v.durationSeconds).toBeNull();
    }
  });
});

describe('Little Coders — project and homework cards', () => {
  it('every project card starts with EMPTY project and copy links (never pre-populated)', () => {
    for (const spec of LC_LESSON_SPECS) {
      const c = lcPatchFor(spec.course, spec.lesson).projectCard;
      expect(c.projectUrl).toBe('');
      expect(c.copyUrl).toBe('');
      expect(c.openLabel).toBe('Open Project');
      expect(c.copyLabel).toBe('Copy Link');
      expect(c.title).toBe(spec.project.name);
      expect(c.teacherInstructions.length).toBeGreaterThan(20);
    }
  });

  it('puts the right platform buttons on each course, in order, with the agreed labels', () => {
    const labels = (course: number, lesson: number) => lcPatchFor(course, lesson).projectCard.platforms.map((b) => `${b.platform}:${b.label}`);
    expect(labels(1, 1)).toEqual(['SCRATCH:Start Coding in Scratch']);
    expect(labels(2, 8)).toEqual(['SCRATCH:Start Coding in Scratch']);
    expect(labels(3, 1)).toEqual(['TEACHABLE_MACHINE:Train AI Model', 'STRETCH3:Build in Stretch3']);
    expect(labels(4, 1)).toEqual(['EDUBLOCKS:Start Coding in EduBlocks']);
    expect(labels(5, 8)).toEqual(['EDUBLOCKS:Start Coding in EduBlocks']);
  });

  it('gives every lesson a homework card with its own deliverable and a way to start coding', () => {
    for (const spec of LC_LESSON_SPECS) {
      const h = lcPatchFor(spec.course, spec.lesson).homeworkCard;
      expect(h.title).toBe(spec.homework.name);
      expect(h.deliverable.length).toBeGreaterThan(5);
      expect(h.platforms.length).toBeGreaterThanOrEqual(1);
    }
  });
});

// ─── The Python lessons are real Python ──────────────────────────────────────

const itPython = pythonAvailable() ? it : it.skip;
const pythonSpecs = LC_LESSON_SPECS.filter((s) => s.platform === 'EDUBLOCKS');

describe('Little Coders — the Python lessons (courses 4 and 5) are real Python', () => {
  itPython('every block script in every Python lesson is valid Python', () => {
    const sources: string[] = [];
    const labels: string[] = [];
    const add = (label: string, lines: string[]) => {
      labels.push(label);
      sources.push(toPythonSource(lines));
    };
    for (const spec of pythonSpecs) {
      const at = `${spec.course}.${spec.lesson}`;
      for (const s of [...spec.examples, ...spec.project.stacks, ...(spec.homework.stack ? [spec.homework.stack] : [])]) add(`${at} ${s.id}`, s.lines);
      if (spec.demo.kind === 'python-run') add(`${at} demo`, spec.demo.lines);
      if (spec.challenge.kind === 'choose' && spec.challenge.code) add(`${at} challenge code`, spec.challenge.code.lines);
      // An ordering challenge may show a loop / function HEADER block on its own (the learner orders the
      // blocks, they do not run the pile) — only a pile of complete statements is a program.
      if (spec.challenge.kind === 'order' && !spec.challenge.lines.some((l) => /:\s*$/.test(l))) add(`${at} order challenge`, spec.challenge.lines);
    }
    expect(sources.length).toBeGreaterThanOrEqual(55);
    const out = runPython(syntaxCheckProgram(sources));
    const problems = out.stdout
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((l) => l.replace(/^(\d+):/, (_m, i) => `${labels[Number(i)]}:`));
    expect({ ok: out.ok, problems }).toEqual({ ok: true, problems: [] });
  });

  itPython.each(pythonSpecs.map((s) => [`${s.course}.${s.lesson} ${s.title}`, s] as const))('the live demo of %s runs the way the lesson says', (_name, spec) => {
    if (spec.demo.kind !== 'python-run') throw new Error('a Python lesson needs a Python demo');
    const out = runPython(pythonProgram(spec.demo.lines, spec.demo.inputs ?? []));
    if (spec.demo.expectError) {
      // A debugging lesson: the demo is MEANT to stop with a Python error.
      expect(out.ok).toBe(false);
      expect(out.stderr).toMatch(/Error/);
    } else {
      expect({ ok: out.ok, err: out.ok ? '' : out.stderr.trim().split('\n').pop() }).toEqual({ ok: true, err: '' });
      // A Turtle demo draws instead of printing; every other demo shows its output in the console.
      if (!spec.demo.lines.some((l) => /turtle/.test(l))) expect(out.stdout.trim().length).toBeGreaterThan(0);
    }
  });
});
