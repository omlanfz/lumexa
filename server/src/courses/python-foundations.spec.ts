// Python Foundations is authored as Markdown lessons + notebooks under prisma/python-foundations and
// compiled into prisma/curriculum-data/python-foundations-path.json, the dataset the course seed
// reads. These checks keep the pieces in step: the dataset on disk is the build of the lessons, the
// program has the agreed shape (3 courses × 8 lessons, 9 portfolio projects), every lesson follows the
// standard project pattern of every program (lesson 1 intro · 2-3 project 1 · 4-5 project 2 · 6-7
// project 3 · 8 recap), each project notebook is one description cell and one code cell that says which
// two lessons it belongs to, and the upgrade for a database seeded by the previous release only
// touches what the previous release wrote.

import { createHash } from 'crypto';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { OUTLINE, PATHWAY_FILE } from '../../prisma/python-foundations/outline';
import {
  DATASET_PATH,
  allProblems,
  buildDataset,
  pythonSyntaxProblems,
  sectionsOf,
} from '../../prisma/python-foundations/build';
import {
  PYTHON_FOUNDATIONS_PROJECT_LINKS,
  assignStandardCheckpoints,
} from './curriculum-catalog.seed';
import { PATHWAY_SLUGS, loadPathway } from './curriculum-source';
import { COURSE_CATALOG } from './course-catalog.seed';
import { PROGRAM_FACTS } from './program-facts';
import {
  PYTHON_FOUNDATIONS_PREVIOUS,
  PYTHON_FOUNDATIONS_PREVIOUS_PROJECTS,
  planPythonFoundationsUpgrade,
  wantedPythonFoundations,
  type PreviousRelease,
  type StoredLesson,
  type StoredProject,
  type UpgradePlan,
  type WantedLesson,
  type WantedProject,
} from './python-foundations.upgrade';

const NOTEBOOKS = path.join(
  __dirname,
  '../../prisma/python-foundations/notebooks',
);

interface Notebook {
  nbformat: number;
  cells: {
    cell_type: string;
    source: string[] | string;
    outputs?: unknown[];
    execution_count?: number | null;
  }[];
  metadata: { kernelspec?: { name?: string } };
}
const readNotebook = (file: string): Notebook =>
  JSON.parse(fs.readFileSync(path.join(NOTEBOOKS, file), 'utf8')) as Notebook;
const textOf = (source: string[] | string): string =>
  Array.isArray(source) ? source.join('') : source;
const sha256 = (text: string): string =>
  createHash('sha256').update(text, 'utf8').digest('hex');

/** The two lessons (1-based position in the course) that build project number `k` (0-based) of a course. */
const lessonsOfProject = (k: number): [number, number] => [
  2 * k + 2,
  2 * k + 3,
];

describe('Python Foundations: the authored lessons', () => {
  it('have no problems (sections, objectives, vocabulary table, depth) and valid Python code', () => {
    expect(allProblems()).toEqual([]);
    expect(pythonSyntaxProblems()).toEqual([]);
  });

  it('are compiled into the dataset on disk — run `npm run build:python-foundations` after editing a lesson', () => {
    const onDisk = fs.readFileSync(DATASET_PATH, 'utf8');
    expect(onDisk).toBe(JSON.stringify(buildDataset(), null, 2) + '\n');
    expect(path.basename(DATASET_PATH)).toBe(`${PATHWAY_FILE}.json`);
  });
});

describe('Python Foundations: the shape of the program', () => {
  const dataset = buildDataset();

  it('is three courses of eight lessons and three projects each, with the agreed titles', () => {
    expect(dataset.modules.map((m) => m.title)).toEqual([
      'Python Programming Essentials',
      'Problem Solving & Program Design',
      'Python Tools & Data Foundations',
    ]);
    for (const m of dataset.modules) {
      expect(m.lessons).toHaveLength(8);
      expect(m.lessons.map((l) => l.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
      expect(m.projects).toHaveLength(3);
      expect(m.projects.map((p) => p.order)).toEqual([1, 2, 3]);
    }
    expect(dataset.modules.flatMap((m) => m.lessons)).toHaveLength(24);
    expect(dataset.modules.flatMap((m) => m.projects)).toHaveLength(9);
  });

  it('gives every lesson objectives, homework and code, and leaves the project pattern to the standard seed', () => {
    for (const m of dataset.modules) {
      for (const l of m.lessons) {
        expect(l.homework.length).toBeGreaterThan(100);
        expect(l.objectives.length).toBeGreaterThanOrEqual(5);
        expect(l.codeSnippets.length).toBeGreaterThan(0);
        // The checkpoint and the project of a lesson come from assignStandardCheckpoints, like every program.
        expect(l).not.toHaveProperty('checkpoint');
        expect(l).not.toHaveProperty('projectSlug');
      }
    }
  });

  it('is registered as a default program: ages 12–18, no prerequisite, 28 sessions, its own dataset', () => {
    const seed = COURSE_CATALOG.find((c) => c.slug === 'python-foundations')!;
    expect(seed.title).toBe('Python Foundations');
    expect(seed.sessions).toBe(28);
    expect([seed.ageMin, seed.ageMax]).toEqual([12, 18]);
    expect(PATHWAY_SLUGS['python-foundations']).toBe(PATHWAY_FILE);
    expect(PROGRAM_FACTS['python-foundations'].prerequisite).toBeNull();
  });
});

describe('Python Foundations: the project pattern of every lesson', () => {
  // Exactly what the seed does when it creates the lessons of a course.
  const pathway = loadPathway(PATHWAY_SLUGS['python-foundations']);
  pathway.modules.forEach(assignStandardCheckpoints);

  it('is: lesson 1 an introduction, lessons 2-3, 4-5 and 6-7 the two parts of one project each, lesson 8 a recap', () => {
    for (const mod of pathway.modules) {
      expect(mod.lessons).toHaveLength(8);
      expect(mod.lessons[0].projectSlug).toBeNull();
      expect(mod.lessons[0].checkpoint).toBe(
        "Set up your environment and explore what you'll build this module",
      );
      mod.projects.forEach((project, k) => {
        const [part1, part2] = lessonsOfProject(k);
        const first = mod.lessons[part1 - 1];
        const second = mod.lessons[part2 - 1];
        expect(first.projectSlug).toBe(project.slug);
        expect(first.checkpoint).toBe(`Part 1 of "${project.title}"`);
        expect(second.projectSlug).toBe(project.slug);
        expect(second.checkpoint).toBe(`Part 2 — Finish of "${project.title}"`);
      });
      expect(mod.lessons[7].projectSlug).toBeNull();
      expect(mod.lessons[7].checkpoint).toBe(
        'Polish, review, and synthesize all 3 projects from this module',
      );
    }
  });

  it('is what every lesson says: the Portfolio Connection names the project and the part (or all three projects)', () => {
    for (const mod of pathway.modules) {
      mod.lessons.forEach((lesson, i) => {
        const where = `${mod.slug} lesson ${i + 1}`;
        const section = sectionsOf(lesson.contentMarkdown).find((s) =>
          s.title.toLowerCase().startsWith('portfolio connection'),
        );
        const text = (section?.body ?? []).join('\n');
        expect({ where, has: text.length > 0 }).toEqual({ where, has: true });
        if (i === 0 || i === 7) {
          // Introduction and recap: all three projects of the course, and no "Part N" of a single one.
          for (const p of mod.projects)
            expect({
              where,
              mentions: text.includes(`**${p.title}**`),
            }).toEqual({ where, mentions: true });
        } else {
          const project = mod.projects[Math.floor((i - 1) / 2)];
          const part = i % 2 === 1 ? 1 : 2;
          expect({
            where,
            project: text.includes(`**${project.title}** (Part ${part})`),
          }).toEqual({ where, project: true });
        }
      });
    }
  });

  it('writes one empty project-link row per project lesson, and all three on the recap, until an admin pastes the notebook links', () => {
    const expected: Record<number, { title: string; url: string }[]> = {};
    pathway.modules.forEach((mod, m) => {
      const firstOrder = m * 9 + 1; // eight lessons and a course test per course
      mod.projects.forEach((project, k) => {
        for (const lesson of lessonsOfProject(k))
          expected[firstOrder + lesson - 1] = [
            { title: project.title, url: '' },
          ];
      });
      expected[firstOrder + 7] = mod.projects.map((p) => ({
        title: p.title,
        url: '',
      }));
    });
    expect(Object.keys(PYTHON_FOUNDATIONS_PROJECT_LINKS).map(Number)).toEqual(
      Object.keys(expected).map(Number),
    );
    expect(Object.keys(expected)).toHaveLength(21);
    expect(PYTHON_FOUNDATIONS_PROJECT_LINKS).toEqual(expected);
  });
});

describe('Python Foundations: the nine portfolio projects', () => {
  const projects = OUTLINE.flatMap((m) => m.projects);

  /** Code of every notebook, checked by Python itself (skipped when python3 is not installed). */
  function notebookSyntaxProblems(): string[] {
    const blocks = projects.map((p) => ({
      where: p.notebook,
      code: textOf(readNotebook(p.notebook).cells[1].source),
    }));
    const script =
      'import ast,json,sys\nfor b in json.load(sys.stdin):\n    try:\n        ast.parse(b["code"])\n    except SyntaxError as e:\n        print(b["where"] + ": " + str(e))\n';
    const res = spawnSync('python3', ['-c', script], {
      input: JSON.stringify(blocks),
      encoding: 'utf8',
    });
    if (res.error) return [];
    return res.stdout.split('\n').filter(Boolean);
  }

  it('are the nine notebooks in the folder and nothing else, one per project', () => {
    expect(projects).toHaveLength(9);
    expect(new Set(projects.map((p) => p.notebook)).size).toBe(9);
    // A notebook run inside this folder leaves data files and charts behind (they were committed once
    // by mistake), so run a copy elsewhere.
    expect(fs.readdirSync(NOTEBOOKS).sort()).toEqual(
      projects.map((p) => p.notebook).sort(),
    );
  });

  it('are each ONE short description cell and ONE code cell, ready for Google Colab: a Python kernel, no saved output', () => {
    for (const p of projects) {
      const nb = readNotebook(p.notebook);
      expect({ file: p.notebook, nbformat: nb.nbformat }).toEqual({
        file: p.notebook,
        nbformat: 4,
      });
      expect(nb.metadata.kernelspec?.name).toBe('python3');
      expect({
        file: p.notebook,
        cells: nb.cells.map((c) => c.cell_type),
      }).toEqual({ file: p.notebook, cells: ['markdown', 'code'] });
      const [intro, program] = nb.cells;
      expect(textOf(intro.source).startsWith(`# ${p.title}`)).toBe(true);
      expect(textOf(intro.source).length).toBeLessThan(1000);
      expect(textOf(program.source).split('\n').length).toBeGreaterThan(50);
      expect({ file: p.notebook, outputs: program.outputs ?? [] }).toEqual({
        file: p.notebook,
        outputs: [],
      });
      expect(program.execution_count ?? null).toBeNull();
    }
    expect(notebookSyntaxProblems()).toEqual([]);
  });

  it('say which two lessons they belong to, in the description and in the code', () => {
    OUTLINE.forEach((mod) =>
      mod.projects.forEach((p, k) => {
        const [first, second] = lessonsOfProject(k);
        const [intro, program] = readNotebook(p.notebook).cells;
        const description = textOf(intro.source);
        const code = textOf(program.source);
        const expected = {
          file: p.notebook,
          course: description.includes(mod.title),
          lessons: description.includes(`Lessons ${first}–${second}`),
          part1: description.includes(`**Part 1 · Lesson ${first}:**`),
          part2: description.includes(`**Part 2 · Lesson ${second}:**`),
          codePart1: new RegExp(`PART 1 · Lesson ${first}\\b`).test(code),
          codePart2: new RegExp(`PART 2 · Lesson ${second}\\b`).test(code),
        };
        expect(expected).toEqual({
          file: p.notebook,
          course: true,
          lessons: true,
          part1: true,
          part2: true,
          codePart1: true,
          codePart2: true,
        });
      }),
    );
  });

  it('are built by the lessons of the order of the outline: project 1 is lessons 2-3, project 2 is 4-5, project 3 is 6-7', () => {
    const dataset = buildDataset();
    dataset.modules.forEach((mod, m) => {
      expect(mod.projects.map((p) => p.slug)).toEqual(
        OUTLINE[m].projects.map((p) => p.slug),
      );
      expect(mod.projects.map((p) => p.sourceRepoPath)).toEqual(
        OUTLINE[m].projects.map(
          (p) => `python-foundations/notebooks/${p.notebook}`,
        ),
      );
    });
  });
});

describe('Python Foundations: upgrading a database seeded by the previous release', () => {
  const MODULE = 'course';

  const previous: PreviousRelease = {
    lessons: {
      [MODULE]: [
        {
          checkpoint: 'Hands-on build: Greeter',
          project: null,
          content: sha256('old introduction'),
          homework: sha256('old homework'),
        },
        {
          checkpoint: 'Hands-on build: Profile',
          project: null,
          content: sha256('old lesson 2'),
        },
        {
          checkpoint: 'Hands-on build: Alpha',
          project: 'alpha',
          content: sha256('old lesson 3'),
        },
        {
          checkpoint: 'Capstone project: Beta',
          project: 'beta',
          content: sha256('old lesson 4'),
        },
      ],
    },
    projects: {
      [`${MODULE}/alpha`]: { order: 1, description: 'Old alpha' },
      [`${MODULE}/beta`]: { order: 2, description: 'Old beta' },
    },
  };
  const wantedLessons = (): Map<string, WantedLesson> =>
    new Map<string, WantedLesson>([
      [
        `${MODULE}::0`,
        {
          checkpoint: 'Set up',
          projectSlug: null,
          projectLinks: null,
          contentMarkdown: 'new introduction',
          homework: 'new homework',
          visuals: [{ v: 1 }],
          miniQuiz: [{ q: 1 }],
        },
      ],
      [
        `${MODULE}::1`,
        {
          checkpoint: 'Part 1 of "Alpha"',
          projectSlug: 'alpha',
          projectLinks: [{ title: 'Alpha', url: '' }],
          contentMarkdown: 'new lesson 2',
          homework: null,
          visuals: null,
          miniQuiz: null,
        },
      ],
      [
        `${MODULE}::2`,
        {
          checkpoint: 'Part 2 — Finish of "Alpha"',
          projectSlug: 'alpha',
          projectLinks: [{ title: 'Alpha', url: '' }],
          contentMarkdown: 'new lesson 3',
          homework: null,
          visuals: null,
          miniQuiz: null,
        },
      ],
      [
        `${MODULE}::3`,
        {
          checkpoint: 'Polish, review, and synthesize all 2 projects',
          projectSlug: null,
          projectLinks: [
            { title: 'Alpha', url: '' },
            { title: 'Beta', url: '' },
          ],
          contentMarkdown: 'new lesson 4',
          homework: null,
          visuals: null,
          miniQuiz: null,
        },
      ],
    ]);
  const wantedProjects = (): Map<string, WantedProject> =>
    new Map<string, WantedProject>([
      [
        `${MODULE}/alpha`,
        { title: 'Alpha', order: 1, description: 'New alpha' },
      ],
      [`${MODULE}/beta`, { title: 'Beta', order: 2, description: 'New beta' }],
    ]);
  const plan = (stored: {
    lessons: StoredLesson[];
    projects: StoredProject[];
  }): UpgradePlan =>
    planPythonFoundationsUpgrade(
      stored,
      { lessons: wantedLessons(), projects: wantedProjects() },
      previous,
    );

  /** A database exactly as the previous release left it. */
  const untouched = (): {
    lessons: StoredLesson[];
    projects: StoredProject[];
  } => ({
    lessons: [
      {
        id: 'l1',
        moduleSlug: MODULE,
        index: 0,
        checkpoint: 'Hands-on build: Greeter',
        projectSlug: null,
        projectLinks: null,
        contentMarkdown: 'old introduction',
        homework: 'old homework',
        visuals: [{ v: 1 }],
        miniQuiz: [{ q: 1 }],
      },
      {
        id: 'l2',
        moduleSlug: MODULE,
        index: 1,
        checkpoint: 'Hands-on build: Profile',
        projectSlug: null,
        projectLinks: null,
        contentMarkdown: 'old lesson 2',
        homework: null,
        visuals: null,
        miniQuiz: null,
      },
      {
        id: 'l3',
        moduleSlug: MODULE,
        index: 2,
        checkpoint: 'Hands-on build: Alpha',
        projectSlug: 'alpha',
        projectLinks: [{ title: 'Alpha', url: '' }],
        contentMarkdown: 'old lesson 3',
        homework: null,
        visuals: null,
        miniQuiz: null,
      },
      {
        id: 'l4',
        moduleSlug: MODULE,
        index: 3,
        checkpoint: 'Capstone project: Beta',
        projectSlug: 'beta',
        projectLinks: [{ title: 'Beta', url: '' }],
        contentMarkdown: 'old lesson 4',
        homework: null,
        visuals: null,
        miniQuiz: null,
      },
    ],
    projects: [
      { moduleSlug: MODULE, slug: 'alpha', order: 1, description: 'Old alpha' },
      { moduleSlug: MODULE, slug: 'beta', order: 2, description: 'Old beta' },
    ],
  });

  /** What the upgrade does to the rows, so the plan can be applied and planned again. */
  function apply(
    stored: { lessons: StoredLesson[]; projects: StoredProject[] },
    p: UpgradePlan,
  ): void {
    for (const change of p.lessons) {
      const lesson = stored.lessons.find((l) => l.id === change.id)!;
      const c = change.changes;
      if (c.checkpoint !== undefined) lesson.checkpoint = c.checkpoint;
      if (c.project) lesson.projectSlug = c.project.slug;
      if (c.projectLinks) lesson.projectLinks = c.projectLinks;
      if (c.contentMarkdown !== undefined)
        lesson.contentMarkdown = c.contentMarkdown;
      if (c.homework !== undefined) lesson.homework = c.homework;
    }
    for (const change of p.projects) {
      const project = stored.projects.find(
        (x) => x.moduleSlug === change.moduleSlug && x.slug === change.slug,
      )!;
      Object.assign(project, change.data);
    }
  }

  it('moves every lesson that still holds exactly what the previous release wrote', () => {
    const result = plan(untouched());
    const byId = Object.fromEntries(
      result.lessons.map((l) => [l.id, l.changes]),
    );
    // Lesson 1: only the checkpoint, the text and the homework.
    expect(byId.l1).toEqual({
      checkpoint: 'Set up',
      contentMarkdown: 'new introduction',
      homework: 'new homework',
    });
    // Lesson 2 begins project Alpha: the project is set, and the empty link row is left to the backfill.
    expect(byId.l2).toEqual({
      checkpoint: 'Part 1 of "Alpha"',
      project: { slug: 'alpha' },
      contentMarkdown: 'new lesson 2',
    });
    // Lesson 3 stays in Alpha: its link row is already right.
    expect(byId.l3).toEqual({
      checkpoint: 'Part 2 — Finish of "Alpha"',
      contentMarkdown: 'new lesson 3',
    });
    // Lesson 4 was the capstone of Beta and is now the recap of both projects.
    expect(byId.l4).toEqual({
      checkpoint: 'Polish, review, and synthesize all 2 projects',
      project: { slug: null },
      projectLinks: [
        { title: 'Alpha', url: '' },
        { title: 'Beta', url: '' },
      ],
      contentMarkdown: 'new lesson 4',
    });
    expect(result.projects).toEqual([
      {
        moduleSlug: MODULE,
        slug: 'alpha',
        data: { description: 'New alpha' },
      },
      { moduleSlug: MODULE, slug: 'beta', data: { description: 'New beta' } },
    ]);
  });

  it('moves the order of a project too, while it is still the previous one', () => {
    const stored = untouched();
    const wanted = { lessons: wantedLessons(), projects: wantedProjects() };
    wanted.projects.get(`${MODULE}/beta`)!.order = 3;
    const result = planPythonFoundationsUpgrade(stored, wanted, previous);
    expect(result.projects.find((p) => p.slug === 'beta')!.data).toEqual({
      order: 3,
      description: 'New beta',
    });
  });

  it('leaves alone everything an administrator changed: checkpoint, project, pasted link, text, homework, project wording', () => {
    const stored = untouched();
    stored.lessons[0].checkpoint = 'My own checkpoint';
    stored.lessons[0].contentMarkdown = 'old introduction, edited by an admin';
    stored.lessons[0].homework = 'a different homework';
    stored.lessons[1].projectSlug = 'beta'; // moved to another project by an admin
    stored.lessons[1].checkpoint = 'Part 1 of "Alpha"'; // already what is wanted
    stored.lessons[1].contentMarkdown = 'new lesson 2';
    stored.lessons[2].checkpoint = 'Part 2 — Finish of "Alpha"';
    stored.lessons[2].contentMarkdown = 'new lesson 3';
    stored.lessons[2].projectLinks = [
      { title: 'Alpha', url: 'https://colab.research.google.com/drive/abc' },
    ];
    stored.lessons[3].checkpoint =
      'Polish, review, and synthesize all 2 projects';
    stored.lessons[3].projectSlug = 'alpha'; // given another project by an admin
    stored.lessons[3].projectLinks = [
      { title: 'Beta', url: 'https://colab.research.google.com/drive/def' },
    ];
    stored.lessons[3].contentMarkdown = 'new lesson 4';
    stored.projects[0].description = 'Alpha, described by an admin';
    stored.projects[1].description = 'New beta';

    const result = plan(stored);
    // Lesson 1 keeps its own checkpoint, text and homework. Lesson 2 was moved to another project by an
    // admin, so it is not moved back. Lesson 3 keeps the pasted link. Lesson 4 keeps the admin's project
    // and the pasted link. The projects keep the wording an admin gave them.
    expect(result).toEqual({ lessons: [], projects: [] });
  });

  it('rewrites the text only while the quiz and the visuals are still what the seed wrote', () => {
    const stored = untouched();
    stored.lessons[0].miniQuiz = [{ q: 'rewritten by an admin' }];
    const result = plan(stored);
    expect(
      result.lessons.find((l) => l.id === 'l1')!.changes.contentMarkdown,
    ).toBeUndefined();
    expect(result.lessons.find((l) => l.id === 'l1')!.changes.checkpoint).toBe(
      'Set up',
    );
  });

  it('does not recognise a course or a position it has no fingerprint for, and changes nothing there', () => {
    const stored = untouched();
    stored.lessons.forEach((l) => (l.moduleSlug = 'another-course'));
    stored.projects.forEach((p) => (p.moduleSlug = 'another-course'));
    expect(plan(stored)).toEqual({ lessons: [], projects: [] });
  });

  it('is idempotent: once applied, a second run has nothing left to change', () => {
    const stored = untouched();
    const first = plan(stored);
    expect(first.lessons.length).toBeGreaterThan(0);
    apply(stored, first);
    expect(plan(stored)).toEqual({ lessons: [], projects: [] });
  });

  describe('with the real fingerprints of the previous release', () => {
    const wanted = wantedPythonFoundations(
      assignStandardCheckpoints,
      PYTHON_FOUNDATIONS_PROJECT_LINKS,
      (moduleIndex) => moduleIndex * 9 + 1,
    );

    it('knows the 3 courses × 8 lessons and 9 projects the previous release wrote, and every project still exists', () => {
      expect(Object.keys(PYTHON_FOUNDATIONS_PREVIOUS)).toEqual(
        OUTLINE.map((m) => m.slug),
      );
      for (const lessons of Object.values(PYTHON_FOUNDATIONS_PREVIOUS)) {
        expect(lessons).toHaveLength(8);
        for (const l of lessons) expect(l.content).toMatch(/^[0-9a-f]{64}$/);
      }
      const keys = OUTLINE.flatMap((m) =>
        m.projects.map((p) => `${m.slug}/${p.slug}`),
      );
      expect(Object.keys(PYTHON_FOUNDATIONS_PREVIOUS_PROJECTS).sort()).toEqual(
        [...keys].sort(),
      );
      for (const [mod, lessons] of Object.entries(PYTHON_FOUNDATIONS_PREVIOUS))
        for (const l of lessons)
          if (l.project) expect(keys).toContain(`${mod}/${l.project}`);
    });

    it('wants, for every lesson, the standard checkpoint, the project of its pair and its link row', () => {
      expect(wanted.lessons.size).toBe(24);
      expect(wanted.projects.size).toBe(9);
      OUTLINE.forEach((mod, m) => {
        mod.lessons.forEach((_, i) => {
          const w = wanted.lessons.get(`${mod.slug}::${i}`)!;
          const k = Math.floor((i - 1) / 2);
          if (i === 0 || i === 7) expect(w.projectSlug).toBeNull();
          else expect(w.projectSlug).toBe(mod.projects[k].slug);
          expect(w.checkpoint).toBeTruthy();
          expect(w.projectLinks).toEqual(
            PYTHON_FOUNDATIONS_PROJECT_LINKS[m * 9 + i + 1] ?? null,
          );
          expect(w.contentMarkdown.length).toBeGreaterThan(2000);
        });
      });
    });

    it('would change the checkpoint of every lesson (none of the previous checkpoints is the new one)', () => {
      for (const [mod, lessons] of Object.entries(PYTHON_FOUNDATIONS_PREVIOUS))
        lessons.forEach((l, i) =>
          expect(l.checkpoint).not.toBe(
            wanted.lessons.get(`${mod}::${i}`)!.checkpoint,
          ),
        );
    });
  });
});
