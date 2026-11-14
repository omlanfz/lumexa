// FILE PATH: server/prisma/python-foundations/build.ts
//
// Builds server/prisma/curriculum-data/python-foundations-path.json — the dataset the course
// seed reads for the Python Foundations program — from
//
//   * ./outline.ts                      the three courses, their lessons and the nine projects
//   * ./lessons/<module>/<file>.md      the text of every lesson (24 files)
//
// Each lesson file is written in the same "Mission Log" structure as the AI Builder and Data
// Scientist lessons; the lesson-content pipeline (server/src/curriculum/lesson-content) then
// cleans it exactly as it does for those programs: the banner and the metadata lines the page
// already shows are dropped, "Learning Objectives" and "Homework / Extension Mission" become
// the structured fields, "Instructor-Guided Coding Walkthrough" becomes teacher-only notes,
// and the visuals and the Mini Quiz come from the catalogs
// (src/curriculum/lesson-content/catalog/python-foundations.ts and
// catalog/quiz/python-foundations.ts).
//
//   npm run build:python-foundations              write the JSON
//   npm run build:python-foundations -- --check   fail if the JSON on disk is out of date
//
// The same functions are used by python-foundations.dataset.spec.ts, so a lesson file that was
// edited without rebuilding the JSON fails the test suite.

import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';
import {
  OUTLINE,
  PATHWAY_FILE,
  type OutlineLesson,
  type OutlineModule,
} from './outline';

export const LESSONS_DIR = path.join(__dirname, 'lessons');
export const DATASET_PATH = path.join(
  __dirname,
  '../curriculum-data',
  `${PATHWAY_FILE}.json`,
);

/** The H2 sections every lesson has, in this order (matched by the start of the heading). */
export const REQUIRED_SECTIONS = [
  'Mission Brief',
  'Learning Objectives',
  'Prerequisites',
  'Concept Explanation',
  'Key Vocabulary',
  'Code Example',
  'Instructor-Guided Coding Walkthrough',
  'Student Mission',
  'Common Mistakes',
  'Lesson Recap',
  'Homework / Extension Mission',
  'Portfolio Connection',
] as const;

/**
 * Headings the lesson-content pipeline turns into quiz questions or answer keys. The Python
 * Foundations Mini Quiz is authored in the quiz catalog (four-option multiple choice, checked
 * by tests), so a lesson file must not carry one of its own.
 */
const QUIZ_HEADING =
  /^(?:mini[\s-]*quiz|quiz|check\s+your\s+understanding|knowledge\s+checks?|self[\s-]*checks?|quick\s+checks?|answer\s*keys?|answers)\b/i;

interface Line {
  text: string;
  inFence: boolean;
}

/** Marks every line that is inside (or is the edge of) a ``` fence. */
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
  /** The lines under the heading, up to the next H2. */
  body: string[];
}

export function sectionsOf(markdown: string): Section[] {
  const lines = scan(markdown);
  const out: Section[] = [];
  let current: Section | null = null;
  for (const l of lines) {
    const h = !l.inFence ? /^##\s+(.+?)\s*$/.exec(l.text) : null;
    if (h) {
      current = { title: h[1], body: [] };
      out.push(current);
    } else if (current) {
      current.body.push(l.text);
    }
  }
  return out;
}

const trimBlock = (lines: string[]): string =>
  lines
    .join('\n')
    .replace(/^\s*\n/, '')
    .replace(/\s+$/, '');

/** Fenced code blocks of one section, with their language. */
export function codeBlocks(
  body: string[],
): { language: string; code: string }[] {
  const blocks: { language: string; code: string }[] = [];
  let open: { language: string; code: string[] } | null = null;
  for (const text of body) {
    const m = /^ {0,3}`{3,}\s*([\w+-]*)\s*$/.exec(text);
    if (m) {
      if (open) {
        blocks.push({ language: open.language, code: open.code.join('\n') });
        open = null;
      } else {
        open = { language: m[1].toLowerCase(), code: [] };
      }
    } else if (open) {
      open.code.push(text);
    }
  }
  return blocks;
}

function objectivesOf(section: Section): string[] {
  return section.body
    .map((l) => /^\s*(?:\d+[.)]|[-*])\s+(.+?)\s*$/.exec(l)?.[1])
    .filter((x): x is string => !!x);
}

export interface BuiltLesson {
  order: number;
  title: string;
  objectives: string[];
  contentMarkdown: string;
  homework: string;
  codeSnippets: {
    label: string;
    language: string;
    code: string;
    part: string;
  }[];
  sourceRefs: { lessonSource: string };
}

export interface BuiltModule {
  slug: string;
  title: string;
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

export function lessonPath(mod: OutlineModule, lesson: OutlineLesson): string {
  return path.join(LESSONS_DIR, mod.slug, `${lesson.file}.md`);
}

/** Everything wrong with one lesson file, as readable lines (empty = fine). */
export function problemsWithLesson(
  mod: OutlineModule,
  lesson: OutlineLesson,
  markdown: string,
): string[] {
  const where = `${mod.slug}/${lesson.file}`;
  const problems: string[] = [];
  const add = (m: string) => problems.push(`${where}: ${m}`);
  const sections = sectionsOf(markdown);

  REQUIRED_SECTIONS.forEach((want, i) => {
    const at = sections.findIndex((s) =>
      s.title.toLowerCase().startsWith(want.toLowerCase()),
    );
    if (at === -1) add(`missing the "${want}" section`);
    else if (i > 0) {
      const prev = sections.findIndex((s) =>
        s.title
          .toLowerCase()
          .startsWith(REQUIRED_SECTIONS[i - 1].toLowerCase()),
      );
      if (prev !== -1 && prev > at)
        add(`"${want}" must come after "${REQUIRED_SECTIONS[i - 1]}"`);
    }
  });
  for (const s of sections) {
    if (QUIZ_HEADING.test(s.title))
      add(
        `the section "${s.title}" would be turned into quiz questions — the Mini Quiz is authored in the quiz catalog`,
      );
  }
  const lines = markdown.split('\n');
  if (!lines[0].startsWith('# Lumexa Mission Log:'))
    add('the first line must be "# Lumexa Mission Log: <course title>"');
  if (
    !new RegExp(
      `^\\*\\*Title:\\*\\* ${lesson.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`,
      'm',
    ).test(markdown)
  ) {
    add(`the "**Title:**" line must say "${lesson.title}"`);
  }
  const objectives = objectivesOf(
    sections.find((s) =>
      s.title.toLowerCase().startsWith('learning objectives'),
    ) ?? { title: '', body: [] },
  );
  if (objectives.length < 5 || objectives.length > 7)
    add(`has ${objectives.length} learning objectives, expected 5–7`);
  const homework = trimBlock(
    sections.find((s) => s.title.toLowerCase().startsWith('homework'))?.body ??
      [],
  );
  if (homework.length < 120)
    add('the homework is too short to be a clear assignment');
  const code = sections.find((s) =>
    s.title.toLowerCase().startsWith('code example'),
  );
  if (code && !codeBlocks(code.body).some((b) => b.language === 'python'))
    add('"Code Example" has no ```python block');
  if (
    !sections
      .find((s) => s.title.toLowerCase().startsWith('key vocabulary'))
      ?.body.some((l) => l.trim().startsWith('|'))
  ) {
    add('"Key Vocabulary" must be a table');
  }
  if (markdown.length < 5500)
    add(
      `is only ${markdown.length} characters — a lesson needs real depth (≥ 5,500)`,
    );
  if (markdown.length > 22000)
    add(
      `is ${markdown.length} characters — too long for one lesson (≤ 22,000)`,
    );
  if (/\t/.test(markdown)) add('contains a tab character');
  if (/[\u200b\ufeff]/.test(markdown)) add('contains an invisible character');
  return problems;
}

export function buildLesson(
  mod: OutlineModule,
  lesson: OutlineLesson,
  index: number,
  orderStart: number,
): BuiltLesson {
  const markdown =
    fs
      .readFileSync(lessonPath(mod, lesson), 'utf8')
      .replace(/\r\n/g, '\n')
      .replace(/\s+$/, '') + '\n';
  const sections = sectionsOf(markdown);
  const find = (start: string) =>
    sections.find((s) => s.title.toLowerCase().startsWith(start.toLowerCase()));
  return {
    order: orderStart + index,
    title: lesson.title,
    objectives: objectivesOf(
      find('Learning Objectives') ?? { title: '', body: [] },
    ),
    contentMarkdown: markdown,
    homework: trimBlock(find('Homework / Extension Mission')?.body ?? []),
    codeSnippets: codeBlocks(find('Code Example')?.body ?? [])
      .filter((b) => b.language === 'python')
      .map((b, i) => ({
        label: `Code Example ${i + 1}`,
        language: 'python',
        code: b.code,
        part: 'reference',
      })),
    sourceRefs: {
      lessonSource: `python-foundations/${mod.slug}/${lesson.file}.md`,
    },
  };
}

export function buildDataset(): Dataset {
  return {
    slug: PATHWAY_FILE,
    modules: OUTLINE.map((mod) => ({
      slug: mod.slug,
      title: mod.title,
      // Lesson `order` is the position inside the course (1–8), as in the other datasets.
      lessons: mod.lessons.map((lesson, i) => buildLesson(mod, lesson, i, 1)),
      projects: mod.projects.map((p, i) => ({
        slug: p.slug,
        title: p.title,
        order: i + 1,
        description: p.description,
        sourceRepoPath: `python-foundations/notebooks/${p.notebook}`,
        files: [] as never[],
      })),
    })),
  };
}

/** Every problem in every lesson file (and in the outline itself). */
export function allProblems(): string[] {
  const out: string[] = [];
  for (const mod of OUTLINE) {
    if (mod.lessons.length !== 8)
      out.push(`${mod.slug}: has ${mod.lessons.length} lessons, expected 8`);
    if (mod.projects.length !== 3)
      out.push(`${mod.slug}: has ${mod.projects.length} projects, expected 3`);
    for (const lesson of mod.lessons) {
      const file = lessonPath(mod, lesson);
      if (!fs.existsSync(file)) {
        out.push(`${mod.slug}/${lesson.file}: the lesson file is missing`);
        continue;
      }
      out.push(
        ...problemsWithLesson(
          mod,
          lesson,
          fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n'),
        ),
      );
    }
    for (const p of mod.projects) {
      if (!fs.existsSync(path.join(__dirname, 'notebooks', p.notebook)))
        out.push(`${mod.slug}: the notebook ${p.notebook} is missing`);
    }
  }
  // The folder holds the project notebooks and nothing else. Running a notebook inside it leaves
  // data files and charts behind, so run a copy somewhere else.
  const notebooksDir = path.join(__dirname, 'notebooks');
  const expected = new Set(
    OUTLINE.flatMap((m) => m.projects.map((p) => p.notebook)),
  );
  if (fs.existsSync(notebooksDir)) {
    for (const entry of fs.readdirSync(notebooksDir)) {
      if (!expected.has(entry))
        out.push(
          `notebooks/${entry} is not a project notebook (running a notebook in this folder leaves files behind: run a copy elsewhere)`,
        );
    }
  }
  return out;
}

/** Python syntax check of every ```python block (needs python3; skipped when it is not installed). */
export function pythonSyntaxProblems(): string[] {
  const blocks: { where: string; code: string }[] = [];
  for (const mod of OUTLINE) {
    for (const lesson of mod.lessons) {
      const file = lessonPath(mod, lesson);
      if (!fs.existsSync(file)) continue;
      const sections = sectionsOf(fs.readFileSync(file, 'utf8'));
      sections.forEach((s) =>
        codeBlocks(s.body)
          .filter((b) => b.language === 'python')
          .forEach((b, i) =>
            blocks.push({
              where: `${mod.slug}/${lesson.file} · ${s.title} · block ${i + 1}`,
              code: b.code,
            }),
          ),
      );
    }
  }
  const script =
    'import ast,json,sys\nfor b in json.load(sys.stdin):\n    try:\n        ast.parse(b["code"])\n    except SyntaxError as e:\n        print(b["where"] + ": " + str(e))\n';
  const res = spawnSync('python3', ['-c', script], {
    input: JSON.stringify(blocks),
    encoding: 'utf8',
  });
  if (res.error) return [];
  return res.stdout.split('\n').filter(Boolean);
}

function main(): void {
  const check = process.argv.includes('--check');
  const problems = [...allProblems(), ...pythonSyntaxProblems()];
  if (problems.length > 0) {
    console.error(
      `Python Foundations: ${problems.length} problem(s)\n  - ${problems.join('\n  - ')}`,
    );
    process.exit(1);
  }
  const json = JSON.stringify(buildDataset(), null, 2) + '\n';
  if (check) {
    const onDisk = fs.existsSync(DATASET_PATH)
      ? fs.readFileSync(DATASET_PATH, 'utf8')
      : '';
    if (onDisk !== json) {
      console.error(
        'python-foundations-path.json is out of date — run `npm run build:python-foundations`.',
      );
      process.exit(1);
    }
    console.log('python-foundations-path.json is up to date.');
    return;
  }
  fs.writeFileSync(DATASET_PATH, json);
  const lessons = OUTLINE.reduce((n, m) => n + m.lessons.length, 0);
  console.log(
    `Wrote ${path.relative(process.cwd(), DATASET_PATH)} (${OUTLINE.length} courses, ${lessons} lessons, ${(json.length / 1024).toFixed(0)} KB).`,
  );
}

if (require.main === module) main();
