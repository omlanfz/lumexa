// FILE PATH: server/src/courses/curriculum-source.ts
//
// The raw curriculum datasets (server/prisma/curriculum-data/<pathway>.json) and
// an index over them. Shared by the seed (curriculum-catalog.seed.ts, which builds
// rows from them) and the lesson-content backfill (lesson-content.backfill.ts,
// which enriches already-seeded rows with what the seed used to drop: the
// instructor guides and the structured mini quizzes).

import * as fs from 'fs';
import * as path from 'path';
import type { SourceQuizQuestion } from '../curriculum/lesson-content';

export const DATA_DIR = path.join(__dirname, '../../prisma/curriculum-data');

// ── Raw JSON shapes (see scripts/extract-curriculum.mjs) ───────────────────

export interface RawCodeSnippet {
  label: string;
  language: string;
  code: string;
  part?: string;
}
export interface RawLesson {
  order: number;
  title: string;
  objectives: string[];
  contentMarkdown: string;
  homework?: string | null;
  teacherNotes?: string | null;
  miniQuiz?: SourceQuizQuestion[] | null;
  codeSnippets: RawCodeSnippet[];
  sourceRefs?: unknown;
  hasEmbeddedProject?: boolean;
  checkpoint?: string;
  projectSlug?: string | null;
}
export interface RawProjectFile {
  label: string;
  language: string;
  code: string;
  part?: string;
}
export interface RawProject {
  slug: string;
  title: string;
  order: number;
  description?: string | null;
  sourceRepoPath?: string;
  files: RawProjectFile[];
}
export interface RawModule {
  slug: string;
  title: string;
  lessons: RawLesson[];
  projects: RawProject[];
}
export interface RawPathway {
  slug: string;
  modules: RawModule[];
}

// Some source markdown (PDF-derived content in particular) contains
// unpaired UTF-16 surrogate code units from lossy extraction — Postgres'
// UTF-8 encoder rejects those outright ("lone leading surrogate in hex
// escape"). Stripped once here, at load time, so every downstream Prisma
// write is already clean.
export function stripLoneSurrogates(str: string): string {
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

export function deepCleanStrings<T>(value: T): T {
  if (typeof value === 'string') return stripLoneSurrogates(value) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => deepCleanStrings(v)) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = deepCleanStrings(v);
    return out as T;
  }
  return value;
}

export function loadPathway(slug: string): RawPathway {
  const file = path.join(DATA_DIR, `${slug}.json`);
  return deepCleanStrings(JSON.parse(fs.readFileSync(file, 'utf8')));
}

// ── Index by lineage key ("<module-slug>/<position>") ──────────────────────

/** Course slug -> source file (curriculum-data/<file>.json). Keys are the
 *  canonical slugs; the file names keep their historical "-path" spelling. */
export const PATHWAY_SLUGS: Record<string, string> = {
  'ai-builder': 'ai-builder-path',
  'data-scientist': 'data-scientist-path',
  'game-creator': 'game-creator-path',
  'little-coders': 'little-coders-path',
  'digital-independence': 'digital-independence-path',
  'web-developer': 'web-developer-path',
};

export interface SourceLesson {
  teacherNotes: string | null;
  miniQuiz: SourceQuizQuestion[] | null;
  /** Raw body, to confirm a stored lesson still IS this one before attaching anything. */
  contentMarkdown: string;
  firstObjective: string | null;
  moduleLessonCount: number;
}

let cache: Map<string, SourceLesson> | null = null;

/** Every source lesson, keyed by lineage key. Loaded once per process. */
export function getSourceIndex(): Map<string, SourceLesson> {
  if (cache) return cache;
  const index = new Map<string, SourceLesson>();
  for (const slug of Object.values(PATHWAY_SLUGS)) {
    const pathway = loadPathway(slug);
    for (const mod of pathway.modules) {
      mod.lessons.forEach((lesson, i) => {
        index.set(`${mod.slug}/${i + 1}`, {
          teacherNotes: lesson.teacherNotes ?? null,
          miniQuiz: lesson.miniQuiz ?? null,
          contentMarkdown: lesson.contentMarkdown,
          firstObjective: lesson.objectives?.[0] ?? null,
          moduleLessonCount: mod.lessons.length,
        });
      });
    }
  }
  cache = index;
  return index;
}
