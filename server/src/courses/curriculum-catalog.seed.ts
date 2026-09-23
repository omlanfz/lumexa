// FILE PATH: server/src/courses/curriculum-catalog.seed.ts
//
// Assembles the 28-session specialized-pathway structure and the 85-session
// Odyssey structure on top of course-catalog.seed.ts's plain Course rows.
//
// Source content lives in server/prisma/curriculum-data/<pathway-slug>.json
// — extracted from the sibling lumexa-all-lessons/lumexa-all-projects repos
// by scripts/extract-curriculum.mjs and scripts/build-web-developer.mjs (run
// offline, not at app runtime; see those scripts' header comments). This
// file turns that raw content into real DB rows: CourseModule, Lesson
// (LEARNING + COURSE_TEST/STAGE_TEST/FINAL_TEST), Project, Assessment,
// MCQQuestion, PracticalQuestion — never inventing curriculum content, only
// assembling and (for MCQ distractors only) mechanically generating options
// around a real, extracted correct answer.
//
// Every specialized pathway becomes: 3 modules × (8 learning + 1 course
// test) + 1 final test = 28 sessions (24 learning + 4 assessment).
// Odyssey becomes: 3 stages × (3 modules × (8 learning + 1 course test) + 1
// stage test) + 1 final test = 85 sessions (72 learning + 13 assessment),
// reusing the exact same 9 source modules the specialized pathways use (per
// the Lumexa Odyssey Curriculum PDF's stage → course mapping), each stage
// getting its own CourseModule/Lesson rows scoped to the Odyssey Course so
// Odyssey students progress independently of specialized-pathway students.
//
// Idempotent and non-destructive: a course already carrying the target
// module/lesson count is left alone. A course found with the OLD flat
// (moduleId-less) Lesson[] shape from the previous version of this seed is
// upgraded in place — but only when no AssessmentAttempt/ScheduledLesson
// history exists yet against it, so real production data is never touched
// automatically; if history exists, the mismatch is logged for a manual
// admin-driven migration instead (see SchedulingService.reconcileCourseSchedules
// for the *supported* path once a course is genuinely restructured live).

import { LessonStatus, PrismaClient, SessionType } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(__dirname, '../../prisma/curriculum-data');

// ── Raw JSON shapes (see scripts/extract-curriculum.mjs) ───────────────────

interface RawCodeSnippet {
  label: string;
  language: string;
  code: string;
  part?: string;
}
interface RawQuizItem {
  questionText: string;
  options: string[] | null;
  correctIndex?: number;
  correctAnswerText?: string;
}
interface RawLesson {
  order: number;
  title: string;
  objectives: string[];
  contentMarkdown: string;
  homework?: string | null;
  teacherNotes?: string | null;
  codeSnippets: RawCodeSnippet[];
  miniQuiz: RawQuizItem[];
  sourceRefs?: unknown;
  hasEmbeddedProject?: boolean;
  checkpoint?: string;
  projectSlug?: string | null;
}
interface RawProjectFile {
  label: string;
  language: string;
  code: string;
  part?: string;
}
interface RawProject {
  slug: string;
  title: string;
  order: number;
  description?: string | null;
  sourceRepoPath?: string;
  files: RawProjectFile[];
}
interface RawModule {
  slug: string;
  title: string;
  lessons: RawLesson[];
  projects: RawProject[];
}
interface RawPathway {
  slug: string;
  modules: RawModule[];
}

// Some source markdown (PDF-derived content in particular) contains
// unpaired UTF-16 surrogate code units from lossy extraction — Postgres'
// UTF-8 encoder rejects those outright ("lone leading surrogate in hex
// escape"). Stripped once here, at load time, so every downstream Prisma
// write is already clean.
function stripLoneSurrogates(str: string): string {
  let out = '';
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = str.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        out += str[i] + str[i + 1];
        i++;
      } // else: lone high surrogate — drop it
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      // lone low surrogate — drop it
    } else {
      out += str[i];
    }
  }
  return out;
}

function deepCleanStrings<T>(value: T): T {
  if (typeof value === 'string') return stripLoneSurrogates(value) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => deepCleanStrings(v)) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = deepCleanStrings(v);
    return out as T;
  }
  return value;
}

function loadPathway(slug: string): RawPathway {
  const file = path.join(DATA_DIR, `${slug}.json`);
  return deepCleanStrings(JSON.parse(fs.readFileSync(file, 'utf8')));
}

// ── Seeded PRNG (mulberry32) so MCQ distractor shuffling is stable across
// re-runs of the same content, instead of producing a different bank on
// every boot ───────────────────────────────────────────────────────────────

function seedFromString(s: string): number {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function seededShuffle<T>(arr: T[], seedStr: string): T[] {
  const rnd = mulberry32(seedFromString(seedStr));
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ── Project-checkpoint assignment: the standard 8-lesson shape ─────────────
// L1 intro · L2-3 Project1 · L4-5 Project2 · L6-7 Project3 · L8 review

function assignStandardCheckpoints(mod: RawModule) {
  const projects = mod.projects;
  mod.lessons.forEach((lesson, i) => {
    if (lesson.projectSlug !== undefined && lesson.projectSlug !== null) return; // web-developer already assigned
    if (i === 0) {
      lesson.projectSlug = null;
      lesson.checkpoint = projects.length
        ? `Set up your environment and explore what you'll build this module`
        : undefined;
      return;
    }
    if (i === 7) {
      lesson.projectSlug = null;
      lesson.checkpoint = projects.length
        ? `Polish, review, and synthesize all ${projects.length} projects from this module`
        : undefined;
      return;
    }
    const pairIndex = Math.floor((i - 1) / 2); // 0,0,1,1,2,2 for i=1..6
    const proj = projects[pairIndex];
    if (!proj) {
      lesson.projectSlug = null;
      return;
    }
    const part = (i - 1) % 2 === 0 ? 'Part 1' : 'Part 2 — Finish';
    lesson.projectSlug = proj.slug;
    lesson.checkpoint = `${part} of "${proj.title}"`;
  });
}

// Digital Independence: projects are embedded 1:1 on specific lessons
// (hasEmbeddedProject), never spanning multiple lessons — many lessons are
// deliberately non-coding (career-readiness content), so the standard
// project-every-two-lessons shape does not apply. See
// Content_Schema_Proposal.md in the source repo (Project.type: coding |
// non-coding) for the origin of this distinction.
function assignDigitalIndependenceCheckpoints(mod: RawModule) {
  for (const lesson of mod.lessons) {
    if (lesson.hasEmbeddedProject) {
      const slug = lesson.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      lesson.projectSlug = slug;
      lesson.checkpoint = `Complete the "${lesson.title}" project deliverable for this session`;
      if (!mod.projects.find((p) => p.slug === slug)) {
        mod.projects.push({
          slug,
          title: lesson.title,
          order: mod.projects.length + 1,
          description: `Embedded project for Lesson: ${lesson.title}`,
          sourceRepoPath: (lesson.sourceRefs as { lessonSource?: string })?.lessonSource,
          files: lesson.codeSnippets.filter((c) => c.part === 'project'),
        });
      }
    } else {
      lesson.projectSlug = null;
      lesson.checkpoint = `Complete the "${lesson.title}" worksheet and reflection`;
    }
  }
}

// ── MCQ bank generation ─────────────────────────────────────────────────────
//
// True-MCQ quiz items (real options + correct letter, from ai-builder's
// Mini Quiz sections) are used as-is. Open-response quiz items (question +
// a real correct answer, but no options — data-scientist/game-creator's
// Mini Quiz sections) are turned into 4-option MCQs by drawing 3 distractors
// from OTHER real answers in the same module's quiz pool — the question and
// the correct answer are always the source material's own; only the wrong
// options are synthesized, and only from other real, in-scope answers.
// Modules with no Mini Quiz section at all (little-coders,
// digital-independence, web-developer) fall back to an objectives-recall
// pool built the same way, from that module's own authored lesson
// objectives — still real, module-grounded content, never invented facts.

interface MCQSeed {
  questionText: string;
  options: string[];
  correctIndex: number;
  tags: string[];
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + '…';
}

function buildMCQPoolFromQuiz(mod: RawModule): MCQSeed[] {
  const trueChoice: MCQSeed[] = [];
  const openResponse: { questionText: string; answer: string; lessonTitle: string }[] = [];

  for (const lesson of mod.lessons) {
    for (const item of lesson.miniQuiz) {
      if (item.options && item.correctIndex !== undefined && item.correctIndex !== null) {
        trueChoice.push({
          questionText: item.questionText,
          options: item.options,
          correctIndex: item.correctIndex,
          tags: [lesson.title],
        });
      } else if (item.correctAnswerText) {
        openResponse.push({
          questionText: item.questionText,
          answer: truncate(item.correctAnswerText, 160),
          lessonTitle: lesson.title,
        });
      }
    }
  }

  const answerPool = openResponse.map((o) => o.answer);
  const synthesized: MCQSeed[] = openResponse.map((o, idx) => {
    const others = seededShuffle(
      answerPool.filter((a) => a !== o.answer),
      `${mod.slug}:${idx}:${o.questionText}`,
    ).slice(0, 3);
    while (others.length < 3) others.push('None of the other options');
    const options = seededShuffle([o.answer, ...others], `${mod.slug}:opts:${idx}`);
    return {
      questionText: o.questionText,
      options,
      correctIndex: options.indexOf(o.answer),
      tags: [o.lessonTitle],
    };
  });

  return [...trueChoice, ...synthesized];
}

function buildMCQPoolFromObjectives(mod: RawModule): MCQSeed[] {
  const items: { text: string; lessonTitle: string }[] = [];
  for (const lesson of mod.lessons) {
    for (const obj of lesson.objectives.slice(0, 2)) {
      items.push({ text: truncate(obj, 160), lessonTitle: lesson.title });
    }
  }
  const pool = items.map((i) => i.text);
  return items.map((item, idx) => {
    const others = seededShuffle(
      pool.filter((t) => t !== item.text),
      `${mod.slug}:obj:${idx}:${item.text}`,
    ).slice(0, 3);
    while (others.length < 3) others.push('None of the above');
    const options = seededShuffle([item.text, ...others], `${mod.slug}:objopts:${idx}`);
    return {
      questionText: `Which of these is a real learning objective from "${item.lessonTitle}"?`,
      options,
      correctIndex: options.indexOf(item.text),
      tags: [item.lessonTitle],
    };
  });
}

function buildModuleMCQPool(mod: RawModule): MCQSeed[] {
  const fromQuiz = buildMCQPoolFromQuiz(mod);
  if (fromQuiz.length >= 10) return fromQuiz;
  return [...fromQuiz, ...buildMCQPoolFromObjectives(mod)];
}

// ── Practical question templates ────────────────────────────────────────────
//
// One deterministically-gradable coding task where the module's real
// dominant language supports server-side execution (python/javascript —
// see AiGradingService/PracticalGradingService), else a rubric+AI-graded
// task (html/css/lua/visual work, where "executable tests" genuinely aren't
// meaningful — see requirement #7B: AI grading never bypasses deterministic
// checks WHERE POSSIBLE, and for these it is not). Each template's
// instructions are grounded in the module's real title/topic.

interface PracticalSeed {
  title: string;
  instructions: string;
  language: string;
  starterCode: string;
  testCases: { name: string; input: unknown[]; expectedOutput: unknown }[] | null;
  rubric: { criterion: string; maxPoints: number }[];
  maxScore: number;
}

function pythonClassifierTemplate(moduleTitle: string): PracticalSeed {
  return {
    title: `${moduleTitle}: Build a Threshold Classifier`,
    instructions:
      `Write a Python function \`classify(score, threshold)\` that returns the string "pass" if ` +
      `\`score >= threshold\`, otherwise returns "fail". This is the same core pattern used throughout ` +
      `"${moduleTitle}" — turning a raw number into a real decision.\n\n` +
      `Requirements:\n- Function name must be exactly \`classify\`.\n- It takes two arguments: \`score\`, \`threshold\`.\n- It returns a string, never prints.`,
    language: 'python',
    starterCode: `def classify(score, threshold):\n    # your code here\n    pass\n`,
    testCases: [
      { name: 'above threshold', input: [82, 60], expectedOutput: 'pass' },
      { name: 'exactly at threshold', input: [60, 60], expectedOutput: 'pass' },
      { name: 'below threshold', input: [45, 60], expectedOutput: 'fail' },
      { name: 'zero score', input: [0, 50], expectedOutput: 'fail' },
      { name: 'negative threshold edge', input: [-5, -10], expectedOutput: 'pass' },
    ],
    rubric: [
      { criterion: 'All test cases pass', maxPoints: 70 },
      { criterion: 'Correct function signature and return type (string, not print)', maxPoints: 15 },
      { criterion: 'Readable, reasonably concise implementation', maxPoints: 15 },
    ],
    maxScore: 100,
  };
}

function pythonAggregateTemplate(moduleTitle: string): PracticalSeed {
  return {
    title: `${moduleTitle}: Summarize a Dataset`,
    instructions:
      `Write a Python function \`summarize(values)\` that takes a list of numbers and returns a dict with keys ` +
      `\`"average"\`, \`"minimum"\`, and \`"maximum"\`. Round the average to 2 decimal places. If the list is ` +
      `empty, return \`{"average": 0, "minimum": None, "maximum": None}\`. This mirrors the real ` +
      `collect → clean → analyze → communicate workflow from "${moduleTitle}".`,
    language: 'python',
    starterCode: `def summarize(values):\n    # your code here\n    pass\n`,
    testCases: [
      { name: 'basic list', input: [[1, 2, 3, 4, 5]], expectedOutput: { average: 3.0, minimum: 1, maximum: 5 } },
      { name: 'single value', input: [[10]], expectedOutput: { average: 10.0, minimum: 10, maximum: 10 } },
      { name: 'negatives', input: [[-2, 4, -6, 8]], expectedOutput: { average: 1.0, minimum: -6, maximum: 8 } },
      { name: 'empty list', input: [[]], expectedOutput: { average: 0, minimum: null, maximum: null } },
    ],
    rubric: [
      { criterion: 'All test cases pass', maxPoints: 70 },
      { criterion: 'Handles the empty-list edge case explicitly', maxPoints: 15 },
      { criterion: 'Readable, reasonably concise implementation', maxPoints: 15 },
    ],
    maxScore: 100,
  };
}

function javascriptFilterTemplate(moduleTitle: string): PracticalSeed {
  return {
    title: `${moduleTitle}: Filter and Transform`,
    instructions:
      `Write a JavaScript function \`activeTotals(items)\` that takes an array of objects shaped like ` +
      `\`{ name, active, amount }\` and returns the sum of \`amount\` for every item where \`active === true\`. ` +
      `Return \`0\` if there are none. This is the same "read real data, compute something useful" pattern ` +
      `behind "${moduleTitle}".\n\nRequirements:\n- Function name must be exactly \`activeTotals\`.\n- It must not mutate the input array.`,
    language: 'javascript',
    starterCode: `function activeTotals(items) {\n  // your code here\n}\n`,
    testCases: [
      { name: 'mixed active/inactive', input: [[{ name: 'a', active: true, amount: 10 }, { name: 'b', active: false, amount: 5 }, { name: 'c', active: true, amount: 7 }]], expectedOutput: 17 },
      { name: 'all inactive', input: [[{ name: 'a', active: false, amount: 10 }]], expectedOutput: 0 },
      { name: 'empty array', input: [[]], expectedOutput: 0 },
      { name: 'all active', input: [[{ name: 'a', active: true, amount: 3 }, { name: 'b', active: true, amount: 4 }]], expectedOutput: 7 },
    ],
    rubric: [
      { criterion: 'All test cases pass', maxPoints: 70 },
      { criterion: 'Does not mutate the input array', maxPoints: 15 },
      { criterion: 'Readable, idiomatic JavaScript (e.g. array methods over manual loops)', maxPoints: 15 },
    ],
    maxScore: 100,
  };
}

function rubricOnlyTemplate(moduleTitle: string, language: string, promptHint: string): PracticalSeed {
  return {
    title: `${moduleTitle}: Practical Challenge`,
    instructions:
      `${promptHint}\n\nSubmit your ${language.toUpperCase()} solution below. This is graded by a teacher/AI review ` +
      `against the rubric (no automated test cases for ${language} in Lumexa yet) — write real, working code, not ` +
      `pseudocode.`,
    language,
    starterCode: '',
    testCases: null,
    rubric: [
      { criterion: 'Meets the functional requirement described', maxPoints: 50 },
      { criterion: 'Code is organized and readable', maxPoints: 25 },
      { criterion: 'Applies the concepts taught in this module correctly', maxPoints: 25 },
    ],
    maxScore: 100,
  };
}

const MODULE_PRACTICAL: Record<string, (title: string) => PracticalSeed> = {
  'python-ai-foundations': pythonClassifierTemplate,
  'computer-vision': pythonClassifierTemplate,
  'language-models': pythonAggregateTemplate,
  'python-for-data': pythonAggregateTemplate,
  'data-visualisation': pythonAggregateTemplate,
  'machine-learning-projects': pythonClassifierTemplate,
  'python-arcade-games': pythonClassifierTemplate,
  'advanced-game-design': pythonAggregateTemplate,
  'python-for-young-builders': pythonClassifierTemplate,
  'html-css-mastery': (t) => rubricOnlyTemplate(t, 'html', `Build a small responsive page section (a card row or hero) using semantic HTML and CSS Flexbox/Grid, applying what "${t}" covered.`),
  'javascript-interactivity': javascriptFilterTemplate,
  'react-fullstack-web': javascriptFilterTemplate,
};

function buildPracticalForModule(mod: RawModule): PracticalSeed {
  const fn = MODULE_PRACTICAL[mod.slug];
  if (fn) return fn(mod.title);
  return rubricOnlyTemplate(mod.title, 'text', `Describe and script out, step by step, how you would build a small project applying what "${mod.title}" covered. Where relevant, include real code/pseudo-block sequence.`);
}

// ── Core builders ────────────────────────────────────────────────────────────

async function createModuleRows(
  prisma: PrismaClient,
  courseId: string,
  mod: RawModule,
  moduleOrder: number,
  lessonOrderStart: number,
  stageNumber: number | null,
): Promise<number> {
  const courseModule = await prisma.courseModule.create({
    data: {
      courseId,
      slug: mod.slug,
      title: mod.title,
      order: moduleOrder,
      stageNumber: stageNumber ?? undefined,
    },
  });

  const projectRows = new Map<string, string>();
  for (const p of mod.projects) {
    const row = await prisma.project.create({
      data: {
        moduleId: courseModule.id,
        slug: p.slug,
        title: p.title,
        description: p.description ?? undefined,
        sourceRepoPath: p.sourceRepoPath ?? undefined,
        order: p.order,
      },
    });
    projectRows.set(p.slug, row.id);
  }

  let order = lessonOrderStart;
  for (const lesson of mod.lessons) {
    await prisma.lesson.create({
      data: {
        courseId,
        moduleId: courseModule.id,
        title: lesson.title,
        order,
        type: SessionType.LEARNING,
        objectives: lesson.objectives,
        contentMarkdown: lesson.contentMarkdown,
        homework: lesson.homework ?? undefined,
        checkpoint: lesson.checkpoint,
        projectId: lesson.projectSlug ? projectRows.get(lesson.projectSlug) : undefined,
        codeSnippets: (lesson.codeSnippets as unknown as object[]) ?? [],
        sourceRefs: (lesson.sourceRefs as object) ?? undefined,
      },
    });
    order++;
  }

  // Course Test session directly after this module's 8 lessons.
  const pool = buildModuleMCQPool(mod);
  const mcqCount = Math.min(18, Math.max(10, pool.length));
  const testLesson = await prisma.lesson.create({
    data: {
      courseId,
      moduleId: courseModule.id,
      title: `${mod.title} — Course Test`,
      order,
      type: SessionType.COURSE_TEST,
      objectives: [`Demonstrate mastery of everything taught in "${mod.title}"`],
    },
  });
  const practical = buildPracticalForModule(mod);
  await createAssessment(prisma, testLesson.id, SessionType.COURSE_TEST, `${mod.title} — Course Test`, pool, mcqCount, [practical]);

  return order + 1; // next free lesson order
}

async function createAssessment(
  prisma: PrismaClient,
  lessonId: string,
  type: SessionType,
  title: string,
  mcqPool: MCQSeed[],
  mcqCount: number,
  practicals: PracticalSeed[],
) {
  const assessment = await prisma.assessment.create({
    data: {
      lessonId,
      type,
      title,
      instructions:
        type === SessionType.FINAL_TEST
          ? 'Part A: concept-check MCQs. Part B: a hands-on practical challenge. Part C: a live viva with your teacher.'
          : 'Part A: knowledge-check MCQs. Part B: a hands-on practical challenge.',
      mcqCount,
      randomizeQuestions: true,
      randomizeOptions: true,
      vivaMaxScore: type === SessionType.FINAL_TEST ? 20 : 0,
      isPublished: true,
    },
  });

  if (mcqPool.length > 0) {
    await prisma.mCQQuestion.createMany({
      data: mcqPool.map((q, i) => ({
        assessmentId: assessment.id,
        questionText: q.questionText,
        options: q.options as unknown as object,
        correctIndex: q.correctIndex,
        tags: q.tags,
        order: i,
      })),
    });
  }
  for (let i = 0; i < practicals.length; i++) {
    const p = practicals[i];
    await prisma.practicalQuestion.create({
      data: {
        assessmentId: assessment.id,
        title: p.title,
        instructions: p.instructions,
        language: p.language,
        starterCode: p.starterCode,
        testCases: (p.testCases as unknown as object) ?? undefined,
        rubric: p.rubric as unknown as object,
        maxScore: p.maxScore,
        order: i,
      },
    });
  }
  return assessment;
}

// ── Pathway (specialized, 28-session) builder ───────────────────────────────

export async function seedPathwayCurriculum(prisma: PrismaClient, courseId: string, pathwaySlug: string) {
  const raw = loadPathway(pathwaySlug);
  for (const mod of raw.modules) {
    if (mod.slug === 'build-your-professional-identity' || mod.slug === 'skills-that-pay' || mod.slug === 'professional-presence') {
      assignDigitalIndependenceCheckpoints(mod);
    } else {
      assignStandardCheckpoints(mod);
    }
  }

  let order = 1;
  for (let i = 0; i < raw.modules.length; i++) {
    order = await createModuleRows(prisma, courseId, raw.modules[i], i + 1, order, null);
  }

  // Final Test: MCQ pool spans all 3 modules (10-15 concept-check questions),
  // one practical challenge from the pathway's final module, plus Part C
  // (viva) recorded live by the teacher via VivaRecord.
  const allPool = raw.modules.flatMap((m) => buildModuleMCQPool(m));
  const finalMcq = seededShuffle(allPool, `${pathwaySlug}:final`).slice(0, 15);
  const finalPractical = buildPracticalForModule(raw.modules[raw.modules.length - 1]);
  const finalLesson = await prisma.lesson.create({
    data: {
      courseId,
      title: `${raw.slug} — Final Test`,
      order,
      type: SessionType.FINAL_TEST,
      objectives: ['Demonstrate complete mastery of every module in this pathway'],
    },
  });
  await createAssessment(prisma, finalLesson.id, SessionType.FINAL_TEST, `Final Test`, finalMcq, finalMcq.length, [finalPractical]);

  return order; // total session count
}

// ── Odyssey (85-session) builder ────────────────────────────────────────────
//
// Stage → module mapping per the Lumexa Odyssey Curriculum PDF:
//   Stage 1 (Foundation):      little-coders/scratch-adventures,
//                               little-coders/python-for-young-builders,
//                               game-creator/python-arcade-games
//   Stage 2 (Create & Apply):  web-developer/html-css-mastery,
//                               digital-independence/build-your-professional-identity,
//                               web-developer/javascript-interactivity
//   Stage 3 (Explore & Advance): data-scientist/python-for-data,
//                               ai-builder/python-ai-foundations,
//                               game-creator/roblox-world-builder

const ODYSSEY_STAGES: { pathway: string; module: string }[][] = [
  [
    { pathway: 'little-coders-path', module: 'scratch-adventures' },
    { pathway: 'little-coders-path', module: 'python-for-young-builders' },
    { pathway: 'game-creator-path', module: 'python-arcade-games' },
  ],
  [
    { pathway: 'web-developer-path', module: 'html-css-mastery' },
    { pathway: 'digital-independence-path', module: 'build-your-professional-identity' },
    { pathway: 'web-developer-path', module: 'javascript-interactivity' },
  ],
  [
    { pathway: 'data-scientist-path', module: 'python-for-data' },
    { pathway: 'ai-builder-path', module: 'python-ai-foundations' },
    { pathway: 'game-creator-path', module: 'roblox-world-builder' },
  ],
];

export async function seedOdysseyCurriculum(prisma: PrismaClient, courseId: string) {
  const pathwayCache = new Map<string, RawPathway>();
  function getModule(pathwaySlug: string, moduleSlug: string): RawModule {
    if (!pathwayCache.has(pathwaySlug)) pathwayCache.set(pathwaySlug, loadPathway(pathwaySlug));
    const pw = pathwayCache.get(pathwaySlug)!;
    const mod = pw.modules.find((m) => m.slug === moduleSlug);
    if (!mod) throw new Error(`Odyssey mapping error: ${pathwaySlug}/${moduleSlug} not found`);
    // Deep clone — Odyssey gets its own Lesson/Project rows, and checkpoint
    // assignment mutates the object in place.
    return JSON.parse(JSON.stringify(mod));
  }

  let order = 1;
  let moduleOrderCounter = 1;
  const allPoolsByStage: MCQSeed[][] = [];

  for (let stageIdx = 0; stageIdx < ODYSSEY_STAGES.length; stageIdx++) {
    const stageModules = ODYSSEY_STAGES[stageIdx].map(({ pathway, module }) => getModule(pathway, module));
    for (const mod of stageModules) {
      if (mod.slug === 'build-your-professional-identity') assignDigitalIndependenceCheckpoints(mod);
      else assignStandardCheckpoints(mod);
    }

    const stagePool: MCQSeed[] = [];
    for (const mod of stageModules) {
      order = await createModuleRows(prisma, courseId, mod, moduleOrderCounter, order, stageIdx + 1);
      moduleOrderCounter++;
      stagePool.push(...buildModuleMCQPool(mod));
    }
    allPoolsByStage.push(stagePool);

    // Stage Test — spans this stage's 3 modules.
    const stageMcq = seededShuffle(stagePool, `odyssey:stage${stageIdx + 1}`).slice(0, 18);
    const stagePractical = buildPracticalForModule(stageModules[stageModules.length - 1]);
    const stageLesson = await prisma.lesson.create({
      data: {
        courseId,
        title: `Stage ${stageIdx + 1} Test`,
        order,
        type: SessionType.STAGE_TEST,
        objectives: [`Demonstrate mastery of everything taught in Stage ${stageIdx + 1}`],
      },
    });
    await createAssessment(prisma, stageLesson.id, SessionType.STAGE_TEST, `Stage ${stageIdx + 1} Test`, stageMcq, stageMcq.length, [stagePractical]);
    order++;
  }

  // Final Test — spans all 9 modules across all 3 stages.
  const grandPool = allPoolsByStage.flat();
  const finalMcq = seededShuffle(grandPool, 'odyssey:final').slice(0, 15);
  const finalStageModules = ODYSSEY_STAGES[2].map(({ pathway, module }) => getModule(pathway, module));
  const finalPractical = buildPracticalForModule(finalStageModules[finalStageModules.length - 1]);
  const finalLesson = await prisma.lesson.create({
    data: {
      courseId,
      title: `Lumexa Odyssey — Final Test`,
      order,
      type: SessionType.FINAL_TEST,
      objectives: ['Demonstrate complete mastery of the entire Odyssey journey across all 3 stages'],
    },
  });
  await createAssessment(prisma, finalLesson.id, SessionType.FINAL_TEST, 'Final Test', finalMcq, finalMcq.length, [finalPractical]);

  return order;
}

// ── Orchestration + idempotency guard ───────────────────────────────────────

const PATHWAY_SLUGS: Record<string, string> = {
  'ai-builder-path': 'ai-builder-path',
  'data-scientist-path': 'data-scientist-path',
  'game-creator-path': 'game-creator-path',
  'little-coders-path': 'little-coders-path',
  'digital-independence-path': 'digital-independence-path',
  'web-developer-path': 'web-developer-path',
};

async function buildFreshStructure(prisma: PrismaClient, course: { id: string; slug: string }) {
  if (course.slug === 'lumexa-odyssey') return seedOdysseyCurriculum(prisma, course.id);
  return seedPathwayCurriculum(prisma, course.id, PATHWAY_SLUGS[course.slug]);
}

// One-time upgrade for a course that already has real enrollment data on
// the OLD flat (moduleId-less) Lesson list — this is exactly the state
// every already-deployed environment is in the first time this ships, so
// it must be handled for real rather than skipped (a skip would silently
// leave admin/student/teacher looking at empty lesson content forever).
//
// Safe by construction:
//   - COMPLETED ScheduledLesson rows are never deleted. Each student's
//     completed history is remapped in place to the new sequence using the
//     app's own invariant that a student's completed lessonNumbers are
//     always contiguous from 1 (see SchedulingService) — "this was my Nth
//     completed lesson" is preserved 1:1 onto the Nth new learning lesson,
//     clamped if a student somehow completed more than the new curriculum
//     has (never crashes, never orphans a row).
//   - UPCOMING/CANCELLED rows are deleted and regenerated by the same
//     `reconcile` callback CoursesService already uses for ordinary
//     add/remove/reorder edits — same code path, so this is exercised by
//     the exact same logic as every future curriculum change.
async function migrateFlatCourseToModules(
  prisma: PrismaClient,
  logger: { log: (msg: string) => void; warn: (msg: string) => void },
  course: { id: string; slug: string },
  reconcile?: (courseId: string, actorId: string) => Promise<unknown>,
) {
  const oldLessonCount = await prisma.lesson.count({ where: { courseId: course.id, moduleId: null } });
  logger.log(`[curriculum-seed] Migrating ${course.slug}: ${oldLessonCount} legacy flat lesson(s) -> modular structure (preserving history).`);

  const completedRows = await prisma.scheduledLesson.findMany({
    where: { courseId: course.id, status: LessonStatus.COMPLETED },
    orderBy: [{ studentUserId: 'asc' }, { lessonNumber: 'asc' }],
    select: { id: true, studentUserId: true, lessonNumber: true },
  });

  // Drop stale UPCOMING/CANCELLED rows FIRST — they're about to be
  // regenerated fresh anyway, and leaving them in place would collide with
  // the completed-lesson remap below (their old lessonNumbers overlap the
  // new positions completed rows are about to claim).
  await prisma.scheduledLesson.deleteMany({
    where: { courseId: course.id, status: { in: [LessonStatus.UPCOMING, LessonStatus.CANCELLED] } },
  });

  // Old rows predate the lessonId column entirely, so there is no FK to
  // clear before removing them.
  await prisma.lesson.deleteMany({ where: { courseId: course.id, moduleId: null } });

  const newTotal = await buildFreshStructure(prisma, course);

  const newLearningLessons = await prisma.lesson.findMany({
    where: { courseId: course.id, type: SessionType.LEARNING },
    orderBy: { order: 'asc' },
    select: { id: true, order: true },
  });

  const byStudent = new Map<string, typeof completedRows>();
  for (const row of completedRows) {
    if (!byStudent.has(row.studentUserId)) byStudent.set(row.studentUserId, []);
    byStudent.get(row.studentUserId)!.push(row);
  }

  // ScheduledLesson.lessonNumber must always equal the catalog Lesson's
  // absolute `order` (test sessions included) — every other read path
  // (attachLessonTitles, reconcileStudentCourseSchedule's lessonIdByOrder
  // lookup, setStudentSchedule) depends on that equality. The i-th
  // completed LEARNING lesson under the old test-less curriculum maps to
  // the i-th LEARNING lesson under the new one (same content, same
  // relative order — only test sessions were inserted), so `i` selects
  // which new lesson it is, but the stored lessonNumber must be that
  // lesson's real `order`, not the compressed learning-only index `i`.
  // Any course/stage tests that now fall chronologically BEFORE a
  // student's last remapped position are deliberately not retrofitted
  // as "owed" — they didn't exist when that student was actually taught,
  // so their future schedule simply continues forward from their real
  // last completed lesson's new position.
  // Two-phase update: test insertions shift most rows' lessonNumber upward
  // by a different amount each, so updating them one at a time in place
  // routinely tries to claim a lessonNumber a later (not-yet-updated) row
  // in the same student+course still holds — @@unique([studentUserId,
  // courseId, lessonNumber]) rejects that. Phase 1 moves every affected
  // row to a guaranteed-free negative placeholder; phase 2 assigns the
  // real target now that no old positive value is in the way.
  let remapped = 0;
  for (const [studentUserId, rows] of byStudent) {
    const targets = rows.map((row, i) => {
      const learningIndex = Math.min(i + 1, newLearningLessons.length || 1);
      const newLesson = newLearningLessons[learningIndex - 1];
      return { row, lessonNumber: newLesson?.order ?? row.lessonNumber, lessonId: newLesson?.id ?? null };
    });

    for (let i = 0; i < targets.length; i++) {
      await prisma.scheduledLesson.update({ where: { id: targets[i].row.id }, data: { lessonNumber: -(i + 1) } });
    }
    for (const t of targets) {
      try {
        await prisma.scheduledLesson.update({
          where: { id: t.row.id },
          data: { lessonNumber: t.lessonNumber, lessonId: t.lessonId },
        });
        remapped++;
      } catch (err) {
        logger.warn(`[curriculum-seed] Could not remap completed session ${t.row.id} (student ${studentUserId}): ${(err as Error).message}`);
      }
    }
  }
  logger.log(
    `[curriculum-seed] ${course.slug}: remapped ${remapped} completed session(s) across ${byStudent.size} student(s) -> ${newTotal} total sessions.`,
  );

  if (reconcile) {
    const result = await reconcile(course.id, 'system-curriculum-migration');
    logger.log(`[curriculum-seed] ${course.slug}: regenerated upcoming schedule — ${JSON.stringify(result)}.`);
  } else {
    logger.warn(
      `[curriculum-seed] ${course.slug}: no reconcile callback available (standalone script run) — ` +
        `enrolled students' upcoming schedule was cleared but NOT regenerated. Restart the app server ` +
        `(which does pass a reconcile callback) or trigger it from the admin curriculum editor.`,
    );
  }

  return newTotal;
}

export async function seedCurriculumContent(
  prisma: PrismaClient,
  logger: { log: (msg: string) => void; warn: (msg: string) => void },
  reconcile?: (courseId: string, actorId: string) => Promise<unknown>,
) {
  const courses = await prisma.course.findMany({
    where: { slug: { in: [...Object.keys(PATHWAY_SLUGS), 'lumexa-odyssey'] } },
    select: { id: true, slug: true, sessions: true },
  });

  for (const course of courses) {
    const moduleCount = await prisma.courseModule.count({ where: { courseId: course.id } });
    const lessonCount = await prisma.lesson.count({ where: { courseId: course.id } });
    const expectedSessions = course.sessions;

    if (moduleCount > 0 && lessonCount === expectedSessions) {
      continue; // already fully migrated to the module/assessment structure
    }

    if (lessonCount > 0 && moduleCount === 0) {
      // The OLD flat (pre-modules) shape — this is the state every
      // already-deployed environment is in the first time this code runs,
      // including ones with real student schedules/history. Migrate it for
      // real rather than skipping (see migrateFlatCourseToModules).
      await migrateFlatCourseToModules(prisma, logger, course, reconcile);
      continue;
    }

    if (lessonCount > 0 && moduleCount > 0) {
      // Partially migrated (moduleCount doesn't match expectedSessions —
      // e.g. an interrupted previous run, or an admin has since hand-edited
      // sessions independently of this seed). Never touched automatically:
      // real assessment attempts or admin edits may already depend on the
      // current shape. Surface it and move on.
      logger.warn(
        `[curriculum-seed] ${course.slug} has ${moduleCount} module(s)/${lessonCount} lesson(s), expected ${expectedSessions} — ` +
          `leaving as-is (looks hand-edited or partially migrated). Use the admin curriculum editor to adjust it directly.`,
      );
      continue;
    }

    // No lessons at all yet — brand new course, fresh build.
    const total = await buildFreshStructure(prisma, course);
    logger.log(`[curriculum-seed] ${course.slug} seeded: ${total} sessions.`);
  }

  await backfillAiBuilderProjectLinks(prisma, logger);
}

// ── AI Builder Path: portfolio-project links ────────────────────────────────
//
// The lesson page shows a "💻 Project" section (Open Project / Copy Link
// buttons) in place of the plain Code section whenever Lesson.projectLinks
// is set — see LessonDetailsView on the client. Keyed by the lesson's
// absolute `order` within the ai-builder-path course (1-28, matching
// python-ai-foundations 1-8 + Course Test 9, computer-vision 10-17 + Course
// Test 18, language-models 19-26 + Course Test 27, Final Test 28 — see
// createModuleRows/seedPathwayCurriculum above). Lessons not listed here
// (the first lesson of each module, and every assessment session) keep
// showing the plain Code section instead. The 3 "polish/recap" lessons (8,
// 17, 26) link back to all 3 projects finished in that module so far.
const NUMBER_PREDICTION_MODEL = {
  title: 'Number Prediction Model',
  url: 'https://colab.research.google.com/drive/1t_GfYWRaBp8tHM9py5DPzqk_aMMIaPwy?usp=sharing',
};
const SIMPLE_IMAGE_CLASSIFIER = {
  title: 'Simple Image Classifier',
  url: 'https://colab.research.google.com/drive/1oJkbUz5HbehVtkpOG3e6lVCH4xHidcJv?usp=sharing',
};
const DATA_PATTERN_FINDER = {
  title: 'Data Pattern Finder',
  url: 'https://colab.research.google.com/drive/1X94pQT5P4kYaQKYJN8C8DrmRcrq7A4ZY?usp=sharing',
};
const REALTIME_EMOTION_DETECTOR = {
  title: 'Real-Time Emotion Detector',
  url: 'https://colab.research.google.com/drive/1ZuSs3-MPXQw2MWS05tfW4MSsjEPFOY51?usp=sharing',
};
const OBJECT_RECOGNITION_YOLOV8 = {
  title: 'Object Recognition with YOLOv8',
  url: 'https://colab.research.google.com/drive/1zAf46thbfCJHHcTR7D_5vPZt9D0KsSFl?usp=sharing',
};
const MOTION_ACTIVATED_SECURITY_CAM = {
  title: 'Motion-Activated Security Cam',
  url: 'https://colab.research.google.com/drive/15blXXC1wVOZIPQXYTRNLDZESl7Cx_ZGG?usp=sharing',
};
const RECIPE_CHATBOT_WITH_MEMORY = {
  title: 'Recipe Chatbot with Memory',
  url: 'https://colab.research.google.com/drive/1l41gSrZspbKCQNgWOwak-YSelgWLM117?usp=sharing',
};
const STUDY_ASSISTANT_ORBIT = {
  title: 'Study Assistant — Orbit',
  url: 'https://colab.research.google.com/drive/1gxA9s1KhEXkRA3cQ_4mjfRsJWJ0IB2ta?usp=sharing',
};
const CREATIVE_STORY_GENERATOR_NOVA = {
  title: 'Creative Story Generator — Nova',
  url: 'https://colab.research.google.com/drive/1pbP6LEAufmfv9_Rb86LmHlaVvuzjNvxu?usp=sharing',
};

const AI_BUILDER_PROJECT_LINKS: Record<number, { title: string; url: string }[]> = {
  // python-ai-foundations (lessons 1-8; 9 = Course Test)
  2: [NUMBER_PREDICTION_MODEL],
  3: [NUMBER_PREDICTION_MODEL],
  4: [SIMPLE_IMAGE_CLASSIFIER],
  5: [SIMPLE_IMAGE_CLASSIFIER],
  6: [DATA_PATTERN_FINDER],
  7: [DATA_PATTERN_FINDER],
  8: [NUMBER_PREDICTION_MODEL, SIMPLE_IMAGE_CLASSIFIER, DATA_PATTERN_FINDER],
  // computer-vision (lessons 10-17; 18 = Course Test)
  11: [REALTIME_EMOTION_DETECTOR],
  12: [REALTIME_EMOTION_DETECTOR],
  13: [OBJECT_RECOGNITION_YOLOV8],
  14: [OBJECT_RECOGNITION_YOLOV8],
  15: [MOTION_ACTIVATED_SECURITY_CAM],
  16: [MOTION_ACTIVATED_SECURITY_CAM],
  17: [REALTIME_EMOTION_DETECTOR, OBJECT_RECOGNITION_YOLOV8, MOTION_ACTIVATED_SECURITY_CAM],
  // language-models (lessons 19-26; 27 = Course Test, 28 = Final Test)
  20: [RECIPE_CHATBOT_WITH_MEMORY],
  21: [RECIPE_CHATBOT_WITH_MEMORY],
  22: [STUDY_ASSISTANT_ORBIT],
  23: [STUDY_ASSISTANT_ORBIT],
  24: [CREATIVE_STORY_GENERATOR_NOVA],
  25: [CREATIVE_STORY_GENERATOR_NOVA],
  26: [RECIPE_CHATBOT_WITH_MEMORY, STUDY_ASSISTANT_ORBIT, CREATIVE_STORY_GENERATOR_NOVA],
};

/** Read-time fallback for ai-builder-path's project links, used by
 * CurriculumService wherever a Lesson is returned to the client
 * (getCatalogLessonDetails/getScheduledLessonDetails/
 * getDemoExampleLessonDetails) — so the correct project always shows up
 * immediately even on an environment whose backend hasn't rebooted (and
 * hence hasn't run backfillAiBuilderProjectLinks below) since this feature
 * shipped, without waiting on a restart. Only ever consulted when the
 * lesson's own stored projectLinks is null/undefined (see call sites) — an
 * admin-set value, including an intentionally-cleared `[]`, always wins. */
export function getAiBuilderProjectLinksFallback(order: number): { title: string; url: string }[] | null {
  return AI_BUILDER_PROJECT_LINKS[order] ?? null;
}

/** Idempotent, admin-safe: only ever fills in a lesson whose projectLinks is
 * still unset (null) — an admin who has since edited or cleared it (an
 * empty array, `[]`, counts as "set") is never overwritten on a later boot.
 * Runs unconditionally (unlike buildFreshStructure above) so it also
 * back-fills an already-seeded ai-builder-path course, not just a fresh one. */
async function backfillAiBuilderProjectLinks(
  prisma: PrismaClient,
  logger: { log: (msg: string) => void; warn: (msg: string) => void },
) {
  const course = await prisma.course.findUnique({
    where: { slug: 'ai-builder-path' },
    select: { id: true },
  });
  if (!course) return;

  const lessons = await prisma.lesson.findMany({
    where: { courseId: course.id, order: { in: Object.keys(AI_BUILDER_PROJECT_LINKS).map(Number) } },
    select: { id: true, order: true, projectLinks: true },
  });

  let updated = 0;
  for (const lesson of lessons) {
    if (lesson.projectLinks !== null) continue;
    const links = getAiBuilderProjectLinksFallback(lesson.order);
    if (!links) continue;
    await prisma.lesson.update({
      where: { id: lesson.id },
      data: { projectLinks: links as unknown as object },
    });
    updated++;
  }
  if (updated > 0) {
    logger.log(`[curriculum-seed] ai-builder-path: backfilled projectLinks on ${updated} lesson(s).`);
  }
}
