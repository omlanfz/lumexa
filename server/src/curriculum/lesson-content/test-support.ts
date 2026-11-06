// FILE PATH: server/src/curriculum/lesson-content/test-support.ts
//
// Shared by the lesson-content specs: the real curriculum datasets, so the tests
// exercise the content that actually ships rather than hand-made samples.

import * as fs from 'fs';
import * as path from 'path';
import { upgradeLesson, type UpgradeInput, type UpgradePatch, type UpgradeResult } from './upgrade';
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

/** The upgrade input for a shipped lesson as a fresh seed sees it (a new row, version 0). */
export function upgradeInputFor(c: SourceLessonCase, over: Partial<UpgradeInput['row']> = {}): UpgradeInput {
  return {
    row: {
      id: `row-${c.key}`,
      title: c.raw.title,
      type: 'LEARNING',
      objectives: c.raw.objectives,
      contentMarkdown: c.raw.contentMarkdown,
      homework: c.raw.homework ?? null,
      teacherNotes: null,
      miniQuiz: null,
      visuals: null,
      contentVersion: 0,
      sourceRefs: null,
      duration: 60,
      ...over,
    },
    courseTitle: c.pathway,
    module: { slug: c.moduleSlug, title: c.moduleTitle },
    positionInGroup: c.position,
    groupSize: c.moduleSize,
    source: { teacherNotes: c.raw.teacherNotes ?? null, miniQuiz: (c.raw.miniQuiz ?? null) as never, moduleLessonCount: c.moduleSize },
  };
}

/** What the database row holds after an upgrade patch has been written. */
export function rowAfter(c: SourceLessonCase, patch: UpgradePatch): UpgradeInput {
  return upgradeInputFor(c, {
    title: patch.title ?? c.raw.title,
    objectives: patch.objectives ?? c.raw.objectives,
    contentMarkdown: patch.contentMarkdown !== undefined ? patch.contentMarkdown : c.raw.contentMarkdown,
    homework: patch.homework !== undefined ? patch.homework : c.raw.homework ?? null,
    teacherNotes: patch.teacherNotes ?? null,
    miniQuiz: patch.miniQuiz ?? null,
    visuals: patch.visuals ?? null,
    contentVersion: patch.contentVersion,
    sourceRefs: patch.sourceRefs ?? null,
  });
}

let upgraded: { c: SourceLessonCase; res: UpgradeResult; patch: UpgradePatch }[] | null = null;

/** Every shipped lesson run through the real upgrade, as a fresh seed does (pure, so cached). */
export function upgradeAll(): { c: SourceLessonCase; res: UpgradeResult; patch: UpgradePatch }[] {
  if (!upgraded) {
    upgraded = allSourceLessons().map((c) => {
      const res = upgradeLesson(upgradeInputFor(c));
      return { c, res, patch: res.patch as UpgradePatch };
    });
  }
  return upgraded;
}
