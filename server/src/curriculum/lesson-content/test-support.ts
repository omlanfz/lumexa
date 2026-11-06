// FILE PATH: server/src/curriculum/lesson-content/test-support.ts
//
// Shared by the lesson-content specs: the real curriculum datasets, so the tests
// exercise the content that actually ships rather than hand-made samples.

import * as fs from 'fs';
import * as path from 'path';
import type { LessonContentFields, LessonContext } from './types';

const DIR = path.join(__dirname, '../../../prisma/curriculum-data');

export interface SourceLessonCase {
  pathway: string;
  moduleSlug: string;
  moduleTitle: string;
  position: number;
  moduleSize: number;
  key: string;
  raw: {
    title: string;
    objectives: string[];
    contentMarkdown: string;
    homework?: string | null;
    teacherNotes?: string | null;
    miniQuiz?: unknown[] | null;
  };
}

let cache: SourceLessonCase[] | null = null;

/** Every lesson of every pathway dataset. */
export function allSourceLessons(): SourceLessonCase[] {
  if (cache) return cache;
  const out: SourceLessonCase[] = [];
  for (const file of fs.readdirSync(DIR).filter((f) => f.endsWith('.json')).sort()) {
    const pathway = JSON.parse(fs.readFileSync(path.join(DIR, file), 'utf8'));
    for (const m of pathway.modules) {
      m.lessons.forEach((l: SourceLessonCase['raw'], i: number) => {
        out.push({ pathway: pathway.slug, moduleSlug: m.slug, moduleTitle: m.title, position: i + 1, moduleSize: m.lessons.length, key: `${m.slug}/${i + 1}`, raw: l });
      });
    }
  }
  cache = out;
  return out;
}

export function fieldsOf(c: SourceLessonCase): LessonContentFields {
  return {
    title: c.raw.title,
    objectives: c.raw.objectives,
    contentMarkdown: c.raw.contentMarkdown,
    homework: c.raw.homework ?? null,
    teacherNotes: null,
    miniQuiz: null,
    visuals: null,
  };
}

export function contextOf(c: SourceLessonCase): LessonContext {
  return {
    courseTitle: c.pathway,
    moduleTitle: c.moduleTitle,
    duration: 60,
    positionInModule: c.position,
    moduleLessonCount: c.moduleSize,
    lineageModule: c.moduleSlug,
    sourceTeacherNotes: c.raw.teacherNotes ?? null,
    sourceQuiz: (c.raw.miniQuiz ?? null) as LessonContext['sourceQuiz'],
  };
}
