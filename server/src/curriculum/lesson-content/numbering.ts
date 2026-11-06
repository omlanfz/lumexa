// FILE PATH: server/src/curriculum/lesson-content/numbering.ts
//
// Two different numbers, never to be confused:
//
//   Session N     — the lesson's place in the course's whole schedule. It counts
//                   test sessions too. This is Lesson.order, which is also the
//                   ScheduledLesson.lessonNumber of every class held for it.
//   Lesson i of M — a LEARNING lesson's place among the learning lessons of its
//                   module. For a custom course whose lessons have no module it
//                   is the place among the course's learning lessons.
//
// Both are computed here from the real structure of the course the lesson is
// being viewed in, so a lesson copied into another course is numbered correctly
// there — nothing is stored on the lesson.

import { lineageKey, parseLineageKey } from './refs';

export interface CourseLessonRow {
  id: string;
  order: number;
  type: string;
  title: string;
  moduleId: string | null;
  module?: {
    id: string;
    slug: string;
    title: string;
    stageNumber: number | null;
  } | null;
  sourceRefs?: unknown;
}

export interface IndexedLesson {
  id: string;
  /** Course-wide session number (tests included). */
  order: number;
  type: string;
  title: string;
  moduleId: string | null;
  moduleTitle: string | null;
  moduleSlug: string | null;
  stageNumber: number | null;
  /** Where this lesson's content originated — see refs.ts. */
  lineage: string | null;
  /** Position among the group's learning lessons (null for a test session). */
  lessonIndex: number | null;
  /** Number of learning lessons in the group. */
  lessonTotal: number | null;
}

/** The lineage key stored on a lesson by import/backfill, if any. */
export function persistedLineage(sourceRefs: unknown): string | null {
  if (sourceRefs && typeof sourceRefs === 'object') {
    const key = (sourceRefs as { lineageKey?: unknown }).lineageKey;
    if (typeof key === 'string' && parseLineageKey(key)) return key;
  }
  return null;
}

/** All of a course's lessons, in session order, with numbering and lineage. */
export function indexCourseLessons(rows: CourseLessonRow[]): IndexedLesson[] {
  const sorted = [...rows].sort((a, b) => a.order - b.order);

  // Group learning lessons by module (or the module-less group).
  const groups = new Map<string, string[]>();
  for (const r of sorted) {
    if (r.type !== 'LEARNING') continue;
    const g = r.moduleId ?? '__course__';
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(r.id);
  }

  return sorted.map((r) => {
    const g = r.moduleId ?? '__course__';
    const members = groups.get(g) ?? [];
    const pos = r.type === 'LEARNING' ? members.indexOf(r.id) + 1 : 0;
    const moduleSlug = r.module?.slug ?? null;
    const lineage =
      persistedLineage(r.sourceRefs) ??
      (r.type === 'LEARNING' && moduleSlug && pos > 0 ? lineageKey(moduleSlug, pos) : null);
    return {
      id: r.id,
      order: r.order,
      type: r.type,
      title: r.title,
      moduleId: r.moduleId,
      moduleTitle: r.module?.title ?? null,
      moduleSlug,
      stageNumber: r.module?.stageNumber ?? null,
      lineage,
      lessonIndex: pos > 0 ? pos : null,
      lessonTotal: r.type === 'LEARNING' ? members.length : null,
    };
  });
}

export interface LessonNumbering {
  /** Course-wide session number — tests included. */
  session: number;
  /** "Lesson i" — null for a test session. */
  lessonIndex: number | null;
  /** "of M". */
  lessonTotal: number | null;
  module: { id: string; title: string; stageNumber: number | null } | null;
}

export function numberingFor(index: IndexedLesson[], lessonId: string): LessonNumbering | null {
  const l = index.find((x) => x.id === lessonId);
  if (!l) return null;
  return {
    session: l.order,
    lessonIndex: l.lessonIndex,
    lessonTotal: l.lessonTotal,
    module: l.moduleId
      ? { id: l.moduleId, title: l.moduleTitle ?? '', stageNumber: l.stageNumber }
      : null,
  };
}

/** The learning lessons either side of this one (tests are separate experiences). */
export function neighbours(
  index: IndexedLesson[],
  lessonId: string,
): { prev: IndexedLesson | null; next: IndexedLesson | null } {
  const learning = index.filter((x) => x.type === 'LEARNING');
  const i = learning.findIndex((x) => x.id === lessonId);
  if (i === -1) return { prev: null, next: null };
  return { prev: learning[i - 1] ?? null, next: learning[i + 1] ?? null };
}

/** The lesson in THIS course whose content originated at `key`, if there is one. */
export function findByLineage(index: IndexedLesson[], key: string): IndexedLesson | null {
  return index.find((x) => x.type === 'LEARNING' && x.lineage === key) ?? null;
}

/** Header text: "Session 12 · Lesson 3 of 8" (or just the session for a test). */
export function describeNumbering(n: LessonNumbering): string {
  const parts = [`Session ${n.session}`];
  if (n.lessonIndex && n.lessonTotal) parts.push(`Lesson ${n.lessonIndex} of ${n.lessonTotal}`);
  return parts.join(' · ');
}
