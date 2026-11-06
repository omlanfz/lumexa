// FILE PATH: server/src/curriculum/lesson-content/serialize.ts
//
// What leaves the server about a lesson, and to whom.
//
// The shared lesson (what a teacher puts on the screen and what a student studies
// later) is built from an ALLOWLIST of fields. Teacher-only material —
// teacherNotes, reviewNotes, the quiz answer key — is simply not a field of the
// shared payload, so no read path can leak it by passing a database row through.
// It is available only from buildTeacherPrep(), which the controller serves to an
// assigned teacher or an admin and to no one else.

import { numberingFor, findByLineage, neighbours, type IndexedLesson } from './numbering';
import { normalizeQuiz, gradedCount, toPublicQuiz } from './quiz';
import { extractRefKeys } from './refs';
import { normalizeVisuals } from './visuals';
import type { LessonVisual, McqQuestion, PublicQuizQuestion } from './types';

export type Viewer = 'student' | 'teacher' | 'admin';

/** The columns a lesson read needs (a subset of the Prisma Lesson row). */
export interface LessonRow {
  id: string;
  title: string;
  type: string;
  order: number;
  duration?: number | null;
  objectives: string[];
  contentMarkdown: string | null;
  reviewNotes?: string | null;
  teacherNotes?: string | null;
  miniQuiz?: unknown;
  visuals?: unknown;
  homework: string | null;
  checkpoint: string | null;
  codeSnippets: unknown;
  projectLinks: unknown;
  module?: { id: string; title: string; stageNumber: number | null } | null;
  project?: { id: string; title: string; description: string | null } | null;
}

export interface PublicQuiz {
  questions: PublicQuizQuestion[];
  /** The score's denominator: every question is scored. */
  gradedCount: number;
}

/** The lesson as every viewer receives it. Nothing teacher-only is a member of this type. */
export interface SharedLesson {
  id: string;
  title: string;
  type: string;
  duration: number | null;
  objectives: string[];
  contentMarkdown: string | null;
  homework: string | null;
  checkpoint: string | null;
  codeSnippets: unknown;
  projectLinks: unknown;
  module: { id: string; title: string; stageNumber: number | null } | null;
  project: { id: string; title: string; description: string | null } | null;
  quiz: PublicQuiz | null;
  visuals: LessonVisual[];
}

/** The lesson's quiz as stored — and only the questions that obey the rule (four-option multiple choice). */
export function readQuiz(raw: unknown): McqQuestion[] {
  return normalizeQuiz(raw).quiz;
}

export function readVisuals(raw: unknown): LessonVisual[] {
  return normalizeVisuals(raw).visuals;
}

export function buildSharedLesson(
  row: LessonRow,
  opts: { contentMarkdown?: string | null; projectLinks?: unknown },
): SharedLesson {
  const questions = readQuiz(row.miniQuiz);
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    duration: row.duration ?? null,
    objectives: row.objectives ?? [],
    contentMarkdown: opts.contentMarkdown !== undefined ? opts.contentMarkdown : row.contentMarkdown,
    homework: row.homework,
    checkpoint: row.checkpoint,
    codeSnippets: row.codeSnippets,
    projectLinks: opts.projectLinks !== undefined ? opts.projectLinks : row.projectLinks,
    module: row.module ? { id: row.module.id, title: row.module.title, stageNumber: row.module.stageNumber } : null,
    project: row.project ? { id: row.project.id, title: row.project.title, description: row.project.description } : null,
    quiz:
      questions.length > 0
        ? { questions: toPublicQuiz(questions, row.id), gradedCount: gradedCount(questions) }
        : null,
    visuals: readVisuals(row.visuals),
  };
}

export interface TeacherPrep {
  lessonId: string;
  teacherNotes: string | null;
  reviewNotes: string | null;
  /** The whole quiz, answers and explanations included. */
  answerKey: McqQuestion[];
}

/** Served only to an assigned teacher or an admin. */
export function buildTeacherPrep(row: LessonRow): TeacherPrep {
  return {
    lessonId: row.id,
    teacherNotes: row.teacherNotes && row.teacherNotes.trim() !== '' ? row.teacherNotes : null,
    reviewNotes: row.reviewNotes && row.reviewNotes.trim() !== '' ? row.reviewNotes : null,
    answerKey: readQuiz(row.miniQuiz),
  };
}

/** True when a teacher has anything in the prep panel (so the UI can offer it). */
export function hasTeacherPrep(row: LessonRow): boolean {
  const p = buildTeacherPrep(row);
  return !!p.teacherNotes || !!p.reviewNotes || p.answerKey.length > 0;
}

// ─── Numbering, navigation and references ───────────────────────────────────

/** How a viewer may reach another lesson. `href: null` + `locked: false` means "not linkable here". */
export type LinkFor = (target: IndexedLesson) => { href: string | null; locked: boolean };

export interface LessonLink {
  lessonId: string;
  title: string;
  /** Course-wide session number. */
  session: number;
  lessonIndex: number | null;
  lessonTotal: number | null;
  href: string | null;
  locked: boolean;
  current: boolean;
}

function toLink(target: IndexedLesson, current: string, linkFor: LinkFor): LessonLink {
  const { href, locked } = linkFor(target);
  return {
    lessonId: target.id,
    title: target.title,
    session: target.order,
    lessonIndex: target.lessonIndex,
    lessonTotal: target.lessonTotal,
    href,
    locked,
    current: target.id === current,
  };
}

/** Resolves every lineage key mentioned in the given Markdown against THIS course. */
export function resolveLessonRefs(
  markdowns: (string | null | undefined)[],
  index: IndexedLesson[],
  current: string,
  linkFor: LinkFor,
): Record<string, LessonLink | null> {
  const out: Record<string, LessonLink | null> = {};
  for (const md of markdowns) {
    for (const key of extractRefKeys(md)) {
      if (key in out) continue;
      const target = findByLineage(index, key);
      out[key] = target ? toLink(target, current, linkFor) : null;
    }
  }
  return out;
}

export function buildNavigation(
  index: IndexedLesson[],
  current: string,
  linkFor: LinkFor,
): { prev: LessonLink | null; next: LessonLink | null } {
  const n = neighbours(index, current);
  return {
    prev: n.prev ? toLink(n.prev, current, linkFor) : null,
    next: n.next ? toLink(n.next, current, linkFor) : null,
  };
}

export { numberingFor };
