// Python Foundations is authored as Markdown lessons + notebooks under prisma/python-foundations and
// compiled into prisma/curriculum-data/python-foundations-path.json, the dataset the course seed
// reads. These checks keep the pieces in step: the dataset on disk is the build of the lessons, the
// program has the agreed shape (3 courses × 8 lessons, 9 portfolio projects), every project has a
// notebook, and the project placeholders the seed writes point at the right lessons.

import * as fs from 'fs';
import * as path from 'path';
import { OUTLINE, PATHWAY_FILE } from '../../prisma/python-foundations/outline';
import {
  DATASET_PATH,
  allProblems,
  buildDataset,
  pythonSyntaxProblems,
} from '../../prisma/python-foundations/build';
import { PYTHON_FOUNDATIONS_PROJECT_LINKS } from './curriculum-catalog.seed';
import { PATHWAY_SLUGS } from './curriculum-source';
import { COURSE_CATALOG } from './course-catalog.seed';
import { PROGRAM_FACTS } from './program-facts';

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

  it('is three courses of eight lessons, with the agreed titles', () => {
    expect(dataset.modules.map((m) => m.title)).toEqual([
      'Python Programming Essentials',
      'Problem Solving & Program Design',
      'Python Tools & Data Foundations',
    ]);
    for (const m of dataset.modules) {
      expect(m.lessons).toHaveLength(8);
      expect(m.lessons.map((l) => l.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
      expect(m.projects).toHaveLength(3);
      expect(m.explicitCheckpoints).toBe(true);
    }
    expect(dataset.modules.flatMap((m) => m.lessons)).toHaveLength(24);
    expect(dataset.modules.flatMap((m) => m.projects)).toHaveLength(9);
  });

  it('gives every lesson a checkpoint that names its hands-on build, and a capstone at the end of each course', () => {
    for (const m of dataset.modules) {
      m.lessons.forEach((l, i) => {
        const build = OUTLINE.find((o) => o.slug === m.slug)!.lessons[i].build;
        expect(l.checkpoint).toBe(
          `${i === 7 ? 'Capstone project' : 'Hands-on build'}: ${build}`,
        );
        expect(l.homework.length).toBeGreaterThan(100);
        expect(l.objectives.length).toBeGreaterThanOrEqual(5);
        expect(l.codeSnippets.length).toBeGreaterThan(0);
      });
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

describe('Python Foundations: the nine portfolio projects', () => {
  const projects = OUTLINE.flatMap((m) => m.projects);

  it('each have a notebook that is ready for Google Colab: no saved output, a Python kernel, titled after the project', () => {
    expect(projects).toHaveLength(9);
    expect(new Set(projects.map((p) => p.notebook)).size).toBe(9);
    // Exactly the nine notebooks and nothing else: a notebook run inside this folder leaves data files and
    // charts behind (they were committed once by mistake), so run a copy elsewhere.
    expect(fs.readdirSync(NOTEBOOKS).sort()).toEqual(
      projects.map((p) => p.notebook).sort(),
    );
    for (const p of projects) {
      const nb = readNotebook(p.notebook);
      expect({ file: p.notebook, nbformat: nb.nbformat }).toEqual({
        file: p.notebook,
        nbformat: 4,
      });
      expect(nb.metadata.kernelspec?.name).toBe('python3');
      const first = textOf(nb.cells[0].source);
      expect({ file: p.notebook, titled: first.includes(p.title) }).toEqual({
        file: p.notebook,
        titled: true,
      });
      const code = nb.cells.filter((c) => c.cell_type === 'code');
      expect(code.length).toBeGreaterThan(3);
      for (const c of code) {
        expect({ file: p.notebook, outputs: c.outputs ?? [] }).toEqual({
          file: p.notebook,
          outputs: [],
        });
        expect(c.execution_count ?? null).toBeNull();
      }
    }
  });

  it('are built by exactly one lesson each, in the order of the curriculum', () => {
    const built = OUTLINE.flatMap((m) => m.lessons)
      .filter((l) => l.projectSlug)
      .map((l) => l.projectSlug);
    expect(built).toEqual(projects.map((p) => p.slug));
  });

  it('get one project row on the lesson that builds them, with no link until an admin adds the notebook link', () => {
    // Lesson `order` on the Course row: each course's eight lessons are followed by its course test.
    const expected: Record<number, string> = {};
    OUTLINE.forEach((m, mi) =>
      m.lessons.forEach((l, li) => {
        if (!l.projectSlug) return;
        expected[mi * 9 + li + 1] = m.projects.find(
          (p) => p.slug === l.projectSlug,
        )!.title;
      }),
    );
    expect(Object.keys(PYTHON_FOUNDATIONS_PROJECT_LINKS).map(Number)).toEqual(
      Object.keys(expected).map(Number),
    );
    expect(Object.keys(expected)).toHaveLength(9);
    for (const [order, title] of Object.entries(expected)) {
      expect(PYTHON_FOUNDATIONS_PROJECT_LINKS[Number(order)]).toEqual([
        { title, url: '' },
      ]);
    }
  });
});
