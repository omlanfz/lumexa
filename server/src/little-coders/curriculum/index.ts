// FILE PATH: server/src/little-coders/curriculum/index.ts
//
// The complete authored Little Coders curriculum: 5 courses × 8 lessons = 40 lessons.

import { LC_COURSES, LC_LESSONS_PER_COURSE } from '../lc.constants';
import type { LcLessonSpec } from '../lc.types';
import { buildLessonPatch, type LcLessonPatch } from './build-lesson';
import { COURSE_1 } from './course1';
import { COURSE_2 } from './course2';
import { COURSE_3 } from './course3';
import { COURSE_4 } from './course4';
import { COURSE_5 } from './course5';

export const LC_LESSON_SPECS: LcLessonSpec[] = [...COURSE_1, ...COURSE_2, ...COURSE_3, ...COURSE_4, ...COURSE_5];

export const lcKey = (course: number, lesson: number) => `c${course}l${lesson}`;

/** Every lesson's stored fields, built and validated once (throws, listing every problem). */
let cache: Map<string, LcLessonPatch> | null = null;
export function lcLessonPatches(): Map<string, LcLessonPatch> {
  if (cache) return cache;
  const out = new Map<string, LcLessonPatch>();
  const problems: string[] = [];
  for (const spec of LC_LESSON_SPECS) {
    try {
      out.set(lcKey(spec.course, spec.lesson), buildLessonPatch(spec));
    } catch (e) {
      problems.push((e as Error).message);
    }
  }
  const expected = LC_COURSES.length * LC_LESSONS_PER_COURSE;
  if (out.size !== expected && problems.length === 0) problems.push(`expected ${expected} lessons, built ${out.size}`);
  if (problems.length > 0) throw new Error(`Little Coders curriculum is invalid:\n${problems.join('\n')}`);
  cache = out;
  return out;
}

export function lcPatchFor(course: number, lesson: number): LcLessonPatch {
  const p = lcLessonPatches().get(lcKey(course, lesson));
  if (!p) throw new Error(`No Little Coders lesson ${course}.${lesson}`);
  return p;
}

export { buildLessonPatch };
export type { LcLessonPatch };
