// FILE PATH: server/prisma/pre-university-cse/build.ts
//
// Builds server/prisma/curriculum-data/pre-university-cse-path.json — the dataset the course seed
// reads for the Pre-University CSE program — from
//
//   * src/pre-university-cse/outline.ts     the eight courses, 64 lessons, their projects and tools
//   * ./lessons/<course>/<file>.md          the text of every lesson (64 files)
//
// Each lesson file follows ONE structure (the "Mission Log"), so every lesson has the same sixteen
// ingredients: an introduction, objectives, explanations, vocabulary, examples, worked examples and
// walkthroughs, common mistakes, a guided activity, its own project (objective, requirements,
// instructions, expected output, hints, success criteria, extension), a recap, homework and the link
// to the course project. The lesson-content pipeline (src/curriculum/lesson-content) then treats it
// exactly like every other program's lessons: the banner and metadata lines the page already shows
// are dropped, "Learning Objectives" and "Homework / Extension Mission" become the structured fields,
// "Instructor-Guided Teaching Notes" become teacher-only notes, and the visuals and the Mini Quiz
// come from the catalogs (catalog/pre-university-cse.ts, catalog/pre-university-cse-quiz.ts).
//
//   npm run build:pre-university-cse              write the JSON
//   npm run build:pre-university-cse -- --check   fail if a lesson has a problem or the JSON is stale
//   npm run verify:pre-university-cse-code        compile and run every program in every lesson
//
// The same functions are used by src/courses/pre-university-cse.spec.ts, so a lesson file that was
// edited without rebuilding the JSON fails the test suite.

import * as fs from 'fs';
import * as path from 'path';
import {
  PUCSE_COURSES,
  PUCSE_LESSONS_PER_COURSE,
  PUCSE_PATHWAY_FILE,
  type PuCourse,
  type PuLesson,
} from '../../src/pre-university-cse/outline';

export const LESSONS_DIR = path.join(__dirname, 'lessons');
export const DATASET_PATH = path.join(__dirname, '../curriculum-data', `${PUCSE_PATHWAY_FILE}.json`);

/** The H2 sections every lesson has, in this order (matched by the start of the heading). */
export const REQUIRED_SECTIONS = [
  'Mission Brief',
  'Learning Objectives',
  'Prerequisites',
  'Concept Explanation',
  'Key Vocabulary',
  'Worked Examples',
  'Common Mistakes',
  'Guided Hands-On Activity',
  'Lesson Project',
  'Lesson Recap',
  'Homework / Extension Mission',
  'Course Project Connection',
  'Instructor-Guided Teaching Notes',
] as const;

/** The H3 parts of "Lesson Project", in this order. */
export const PROJECT_PARTS = [
  'Objective',
  'Requirements',
  'Instructions',
  'Expected Output',
  'Hints',
  'Success Criteria',
  'Extension Challenge',
] as const;

/** Headings the lesson-content pipeline turns into quiz questions or answer keys. The Mini Quiz is authored in the quiz catalog. */
const QUIZ_HEADING =
  /^(?:mini[\s-]*quiz|quiz|check\s+your\s+understanding|knowledge\s+checks?|self[\s-]*checks?|quick\s+checks?|answer\s*keys?|answers)\b/i;

interface Line {
  text: string;
  inFence: boolean;
}

function scan(markdown: string): Line[] {
  let open = false;
  return markdown.split('\n').map((text) => {
    if (/^ {0,3}(`{3,}|~{3,})/.test(text)) {
      open = !open;
      return { text, inFence: true };
    }
    return { text, inFence: open };
  });
}

export interface Section {
  title: string;
  /** The lines under the heading, up to the next heading of the same or a higher level. */
  body: string[];
}

function sectionsAt(markdown: string, level: 2 | 3, within?: string[]): Section[] {
  const lines = scan(within ? within.join('\n') : markdown);
  const re = level === 2 ? /^##\s+(.+?)\s*$/ : /^###\s+(.+?)\s*$/;
  const out: Section[] = [];
  let current: Section | null = null;
  for (const l of lines) {
    const h = !l.inFence ? re.exec(l.text) : null;
    if (h) {
      current = { title: h[1], body: [] };
      out.push(current);
    } else if (!l.inFence && level === 3 && /^##\s+/.test(l.text)) {
      current = null;
    } else if (current) {
      current.body.push(l.text);
    }
  }
  return out;
}

export const sectionsOf = (markdown: string): Section[] => sectionsAt(markdown, 2);
export const subsectionsOf = (body: string[]): Section[] => sectionsAt('', 3, body);

const trimBlock = (lines: string[]): string => lines.join('\n').replace(/^\s*\n/, '').replace(/\s+$/, '');

export interface CodeBlock {
  /** The first word of the fence's info string, lower-cased ("c", "cpp", "output", "input"…). */
  language: string;
  /** The rest of the info string (attributes such as "fragment"). */
  attrs: string[];
  code: string;
  /** Where it is, for messages. */
  section: string;
}

/** Fenced code blocks of one section. */
export function codeBlocks(body: string[], section = ''): CodeBlock[] {
  const blocks: CodeBlock[] = [];
  let open: { language: string; attrs: string[]; code: string[] } | null = null;
  for (const text of body) {
    const m = /^ {0,3}`{3,}\s*(.*?)\s*$/.exec(text);
    if (m) {
      if (open) {
        blocks.push({ language: open.language, attrs: open.attrs, code: open.code.join('\n'), section });
        open = null;
      } else {
        const [language = '', ...attrs] = m[1].split(/\s+/);
        open = { language: language.toLowerCase(), attrs, code: [] };
      }
    } else if (open) {
      open.code.push(text);
    }
  }
  return blocks;
}

/** Every fenced block of a whole lesson file, with the section it is in. */
export function allCodeBlocks(markdown: string): CodeBlock[] {
  return sectionsOf(markdown).flatMap((s) => codeBlocks(s.body, s.title));
}

function objectivesOf(section: Section): string[] {
  return section.body
    .map((l) => /^\s*(?:\d+[.)]|[-*])\s+(.+?)\s*$/.exec(l)?.[1])
    .filter((x): x is string => !!x);
}

const listItems = (body: string[]): number => body.filter((l) => /^\s*(?:\d+[.)]|[-*]|- \[[ x]\])\s+\S/.test(l)).length;

export interface BuiltLesson {
  order: number;
  title: string;
  objectives: string[];
  contentMarkdown: string;
  homework: string;
  codeSnippets: never[];
  sourceRefs: { lessonSource: string };
  projectSlug: string;
  checkpoint: string;
}

export interface BuiltModule {
  slug: string;
  title: string;
  explicitCheckpoints: true;
  lessons: BuiltLesson[];
  projects: {
    slug: string;
    title: string;
    order: number;
    description: string;
    sourceRepoPath: string;
    files: never[];
  }[];
}

export interface Dataset {
  slug: string;
  modules: BuiltModule[];
}

export function lessonPath(course: PuCourse, lesson: PuLesson): string {
  return path.join(LESSONS_DIR, course.slug, `${lesson.file}.md`);
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const MIN_LESSON_CHARS = 9_000;
export const MAX_LESSON_CHARS = 48_000;

/** Everything wrong with one lesson file, as readable lines (empty = fine). */
export function problemsWithLesson(course: PuCourse, lesson: PuLesson, markdown: string): string[] {
  const where = `${course.slug}/${lesson.file}`;
  const problems: string[] = [];
  const add = (m: string) => problems.push(`${where}: ${m}`);
  const sections = sectionsOf(markdown);
  const find = (start: string) => sections.find((s) => norm(s.title).startsWith(norm(start)));

  // ── Structure ──
  REQUIRED_SECTIONS.forEach((want, i) => {
    const at = sections.findIndex((s) => norm(s.title).startsWith(norm(want)));
    if (at === -1) add(`missing the "${want}" section`);
    else if (i > 0) {
      const prev = sections.findIndex((s) => norm(s.title).startsWith(norm(REQUIRED_SECTIONS[i - 1])));
      if (prev !== -1 && prev > at) add(`"${want}" must come after "${REQUIRED_SECTIONS[i - 1]}"`);
    }
  });
  for (const s of sections) {
    if (QUIZ_HEADING.test(s.title))
      add(`the section "${s.title}" would be turned into quiz questions — the Mini Quiz is authored in the quiz catalog`);
  }
  const lines = markdown.split('\n');
  if (lines[0] !== `# Lumexa Mission Log: ${course.title}`) add(`the first line must be "# Lumexa Mission Log: ${course.title}"`);
  if (!new RegExp(`^\\*\\*Title:\\*\\* ${escapeRe(lesson.title)}\\s*$`, 'm').test(markdown)) add(`the "**Title:**" line must say "${lesson.title}"`);
  if (!new RegExp(`^\\*\\*Lesson:\\*\\* ${String(lesson.position).padStart(2, '0')} of 0?${PUCSE_LESSONS_PER_COURSE}\\s*$`, 'm').test(markdown))
    add(`the "**Lesson:**" line must say "${String(lesson.position).padStart(2, '0')} of 08"`);

  // ── Objectives, vocabulary, mistakes ──
  const objectives = objectivesOf(find('Learning Objectives') ?? { title: '', body: [] });
  if (objectives.length < 5 || objectives.length > 7) add(`has ${objectives.length} learning objectives, expected 5–7`);
  if (!find('Key Vocabulary')?.body.some((l) => l.trim().startsWith('|'))) add('"Key Vocabulary" must be a table');
  else {
    const rows = find('Key Vocabulary')!.body.filter((l) => l.trim().startsWith('|')).length - 2;
    if (rows < 6) add(`"Key Vocabulary" has ${rows} terms, expected at least 6`);
  }
  const concept = find('Concept Explanation');
  if (concept && subsectionsOf(concept.body).length < 3) add('"Concept Explanation" needs at least three ### subsections');
  const worked = find('Worked Examples');
  if (worked && subsectionsOf(worked.body).length < 2) add('"Worked Examples" needs at least two ### examples');
  if (worked && !worked.body.some((l) => /^\s*\d+[.)]\s+\S/.test(l))) add('"Worked Examples" needs a numbered step-by-step explanation');
  const mistakes = find('Common Mistakes');
  if (mistakes && listItems(mistakes.body) + subsectionsOf(mistakes.body).length < 4) add('"Common Mistakes" needs at least four mistakes or misconceptions');
  const activity = find('Guided Hands-On Activity');
  if (activity && listItems(activity.body) < 4) add('"Guided Hands-On Activity" needs at least four numbered steps');
  const recap = find('Lesson Recap');
  if (recap && listItems(recap.body) < 3) add('"Lesson Recap" needs at least three points');
  const homework = trimBlock(find('Homework / Extension Mission')?.body ?? []);
  if (homework.length < 150) add('the homework is too short to be a clear assignment');
  const connection = trimBlock(find('Course Project Connection')?.body ?? []);
  if (connection.length < 80) add('"Course Project Connection" is too short');
  if (norm(connection).indexOf(norm(course.project.title.split(':')[0]).split(' using')[0]) === -1 && !/course project/i.test(connection))
    add('"Course Project Connection" should name the course project');

  // ── The lesson's own project ──
  const project = find('Lesson Project');
  if (project) {
    if (!norm(project.title).includes(norm(lesson.project))) add(`the project heading must name the project "${lesson.project}"`);
    const parts = subsectionsOf(project.body);
    const names = parts.map((p) => norm(p.title));
    PROJECT_PARTS.forEach((part, i) => {
      const at = names.findIndex((n) => n.startsWith(norm(part)));
      if (at === -1) add(`the Lesson Project is missing "### ${part}"`);
      else if (i > 0) {
        const prev = names.findIndex((n) => n.startsWith(norm(PROJECT_PARTS[i - 1])));
        if (prev !== -1 && prev > at) add(`"### ${part}" must come after "### ${PROJECT_PARTS[i - 1]}"`);
      }
    });
    const part = (name: string) => parts.find((p) => norm(p.title).startsWith(norm(name)));
    if (part('Objective') && trimBlock(part('Objective')!.body).length < 60) add('the project Objective is too short');
    if (part('Requirements') && listItems(part('Requirements')!.body) < 3) add('the project needs at least three Requirements');
    if (part('Instructions') && listItems(part('Instructions')!.body) < 4) add('the project needs at least four numbered Instructions');
    const expected = part('Expected Output');
    if (expected && trimBlock(expected.body).length < 40) add('the project Expected Output is too short');
    if (part('Hints') && listItems(part('Hints')!.body) < 3) add('the project needs at least three progressive Hints');
    if (part('Success Criteria') && listItems(part('Success Criteria')!.body) < 4) add('the project needs at least four Success Criteria');
    if (part('Extension Challenge') && trimBlock(part('Extension Challenge')!.body).length < 60) add('the Extension Challenge is too short');
  }

  // ── Size and hygiene ──
  if (markdown.length < MIN_LESSON_CHARS) add(`is only ${markdown.length} characters — a lesson needs real depth (≥ ${MIN_LESSON_CHARS})`);
  if (markdown.length > MAX_LESSON_CHARS) add(`is ${markdown.length} characters — too long for one lesson (≤ ${MAX_LESSON_CHARS})`);
  if (/\t/.test(markdown)) add('contains a tab character');
  if (/[​﻿]/.test(markdown)) add('contains an invisible character');
  if (/\bTODO\b|\bTBD\b|lorem ipsum|coming soon|to be written|\[insert/i.test(markdown)) add('contains unfinished text (TODO, TBD, lorem ipsum, coming soon…)');
  if (/\bwait:|\.\.\.\s*wait\b|\boops\b|\bhmm+\b|\blet me (?:re)?think\b/i.test(markdown)) add('contains drafting chatter ("wait:", "oops", "hmm"): rewrite the sentence');
  if (/\bIMPORTANT correction\b|\bmust be fixed before\b|\bdeliberate(?:ly)? (?:error|mistake|wrong)\b|\bthis (?:output|answer|block) is wrong\b/i.test(markdown)) add('contains a note about an error in the lesson itself: fix the lesson instead');
  return problems;
}

export function buildLesson(course: PuCourse, lesson: PuLesson): BuiltLesson {
  const markdown = fs.readFileSync(lessonPath(course, lesson), 'utf8').replace(/\r\n/g, '\n').replace(/\s+$/, '') + '\n';
  const sections = sectionsOf(markdown);
  const find = (start: string) => sections.find((s) => norm(s.title).startsWith(norm(start)));
  return {
    order: lesson.position,
    title: lesson.title,
    objectives: objectivesOf(find('Learning Objectives') ?? { title: '', body: [] }),
    contentMarkdown: markdown,
    homework: trimBlock(find('Homework / Extension Mission')?.body ?? []),
    codeSnippets: [],
    sourceRefs: { lessonSource: `pre-university-cse/${course.slug}/${lesson.file}.md` },
    projectSlug: course.project.slug,
    checkpoint: `Lesson project: ${lesson.project}. ${lesson.adds}`,
  };
}

export function buildDataset(): Dataset {
  return {
    slug: PUCSE_PATHWAY_FILE,
    modules: PUCSE_COURSES.map((course) => ({
      slug: course.slug,
      title: course.title,
      explicitCheckpoints: true as const,
      // Lesson `order` is the position inside the course (1–8), as in the other datasets.
      lessons: course.lessons.map((lesson) => buildLesson(course, lesson)),
      projects: [
        {
          slug: course.project.slug,
          title: course.project.title,
          order: 1,
          description: course.project.description,
          sourceRepoPath: `pre-university-cse/${course.slug}/`,
          files: [] as never[],
        },
      ],
    })),
  };
}

/** Every problem in every lesson file (and in the outline itself). */
export function allProblems(): string[] {
  const out: string[] = [];
  const seenProjects = new Set<string>();
  for (const course of PUCSE_COURSES) {
    if (course.lessons.length !== PUCSE_LESSONS_PER_COURSE) out.push(`${course.slug}: has ${course.lessons.length} lessons, expected ${PUCSE_LESSONS_PER_COURSE}`);
    for (const lesson of course.lessons) {
      const key = norm(lesson.project);
      if (seenProjects.has(key)) out.push(`${course.slug}/${lesson.file}: the project "${lesson.project}" is used by another lesson`);
      seenProjects.add(key);
      const file = lessonPath(course, lesson);
      if (!fs.existsSync(file)) {
        out.push(`${course.slug}/${lesson.file}: the lesson file is missing`);
        continue;
      }
      out.push(...problemsWithLesson(course, lesson, fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n')));
    }
    const onDisk = fs.existsSync(path.join(LESSONS_DIR, course.slug)) ? fs.readdirSync(path.join(LESSONS_DIR, course.slug)) : [];
    const known = new Set(course.lessons.map((l) => `${l.file}.md`));
    for (const f of onDisk) if (!known.has(f)) out.push(`${course.slug}/${f}: a lesson file the outline does not list`);
  }
  return out;
}

function main(): void {
  const check = process.argv.includes('--check');
  const problems = allProblems();
  if (problems.length > 0) {
    console.error(`Pre-University CSE: ${problems.length} problem(s)\n  - ${problems.join('\n  - ')}`);
    process.exit(1);
  }
  const json = JSON.stringify(buildDataset(), null, 2) + '\n';
  if (check) {
    const onDisk = fs.existsSync(DATASET_PATH) ? fs.readFileSync(DATASET_PATH, 'utf8') : '';
    if (onDisk !== json) {
      console.error('pre-university-cse-path.json is out of date — run `npm run build:pre-university-cse`.');
      process.exit(1);
    }
    console.log('pre-university-cse-path.json is up to date.');
    return;
  }
  fs.writeFileSync(DATASET_PATH, json);
  const lessons = PUCSE_COURSES.reduce((n, c) => n + c.lessons.length, 0);
  console.log(`Wrote ${path.relative(process.cwd(), DATASET_PATH)} (${PUCSE_COURSES.length} courses, ${lessons} lessons, ${(json.length / 1024).toFixed(0)} KB).`);
}

if (require.main === module) main();
