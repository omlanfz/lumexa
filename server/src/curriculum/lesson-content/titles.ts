// FILE PATH: server/src/curriculum/lesson-content/titles.ts
//
// Lesson title cleanup. The database title is the canonical page title; this
// only strips noise that earlier content imports glued onto it:
//   "Course 13 · Python for Data — Lesson 1: Why Data Science Matters"
//   "Student Guide — Lesson 3: Connecting AI to Scratch"
//   "— Game Design Fundamentals"
// A title that carries no topic at all ("Course 14: Data Visualisation —
// Lesson 1") is reported as generic so the caller can derive one from the
// lesson's own content instead of inventing it.

import { comparable, stripLeadingEmoji } from './text';

const PREFIXES: RegExp[] = [
  // "Student Guide — ", "Student Lesson: ", "Instructor Guide — "
  /^(?:student|teacher|instructor)\s+(?:guide|lesson)\s*[:\-–—·]\s*/i,
  // "Course 13 · ", "Course 18, ", "Course 14: "
  /^course\s+\d+\s*(?:[,·:\-–—]\s*)?/i,
  // "Python for Data — Lesson 1: " (a module/course label, then the lesson number)
  /^[^:—–\-·]{1,60}?\s*[—–-]\s*lesson\s+\d+\s*[:.\-–—]\s*/i,
  // "Lesson 3: ", "Lesson 3 — "
  /^lesson\s+\d+\s*[:.\-–—·]\s*/i,
  // dangling separators: "— Game Design Fundamentals"
  /^[\s\-–—·:|]+/,
];

export interface CleanedTitle {
  title: string;
  /** The text carried no topic of its own (e.g. "Data Visualisation — Lesson 1"). */
  generic: boolean;
}

/** "Lesson 3" / "Data Visualisation — Lesson 3 (Final)" with nothing after it. */
const BARE_LESSON_LABEL = /\blesson\s+\d+\s*(?:\(final\))?\s*$/i;

export function stripTitlePrefixes(raw: string): string {
  let t = stripLeadingEmoji(raw).trim();
  for (let i = 0; i < 6; i++) {
    let next = t;
    for (const re of PREFIXES) next = next.replace(re, '');
    next = next.trim();
    if (next === t) break;
    t = next;
  }
  return t;
}

export function cleanLessonTitle(
  raw: string,
  names: { moduleTitle?: string | null; courseTitle?: string | null } = {},
): CleanedTitle {
  const original = raw.trim();
  const stripped = stripTitlePrefixes(original);

  const label = comparable(stripped);
  const isModuleOrCourseName =
    label !== '' &&
    [names.moduleTitle, names.courseTitle].some((n) => !!n && comparable(n) === label);

  const generic =
    stripped === '' ||
    BARE_LESSON_LABEL.test(stripped) ||
    BARE_LESSON_LABEL.test(original) ||
    isModuleOrCourseName;

  // A generic title is left exactly as it is: the caller derives a real one from
  // the lesson's content, or reports it for a person to name.
  if (generic) return { title: original, generic: true };
  return { title: stripped, generic: false };
}
