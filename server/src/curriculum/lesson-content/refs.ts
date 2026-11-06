// FILE PATH: server/src/curriculum/lesson-content/refs.ts
//
// Cross-lesson references.
//
// Source lessons say things like "we'll cover indentation in Lesson 3" or
// "Completion of Lessons 01–02". Those numbers are module-relative. Rewriting
// them as plain links to a lesson ID would break the moment a lesson is copied
// into Odyssey or a custom course, and rewriting them by displayed number alone
// would point at the wrong lesson in a course that numbers differently.
//
// Instead a reference is stored as a link carrying a stable LINEAGE KEY —
// "<module-slug>/<position-in-module>" — which identifies where a lesson's
// content originated and travels with the lesson when it is copied:
//
//     [Lesson 3](lumexa:lesson/python-ai-foundations/3)
//
// At read time the server resolves the key inside the course the learner is
// actually looking at (see resolveLessonRefs), so a copy automatically links to
// the copy in the same course, a missing target stays plain text, and a student
// is never handed a link to a lesson they have not unlocked.

import { isDivider, fenceMask, toLines } from './markdown';
import type { ReviewRecord } from './types';

export const LESSON_REF_PREFIX = 'lumexa:lesson/';

export function lineageKey(moduleSlug: string, position: number): string {
  return `${moduleSlug}/${position}`;
}

export function parseLineageKey(key: string): { moduleSlug: string; position: number } | null {
  const m = key.match(/^([a-z0-9][a-z0-9-]*)\/(\d{1,3})$/);
  return m ? { moduleSlug: m[1], position: Number(m[2]) } : null;
}

export function refHref(key: string): string {
  return `${LESSON_REF_PREFIX}${key}`;
}

/** Every lineage key referenced by `lumexa:lesson/…` links in the text. */
export function extractRefKeys(markdown: string | null | undefined): string[] {
  if (!markdown) return [];
  const keys = new Set<string>();
  const re = /\]\(lumexa:lesson\/([a-z0-9][a-z0-9-]*\/\d{1,3})\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(markdown))) keys.add(m[1]);
  return [...keys];
}

// ─── Rewriting "Lesson N" into reference links ─────────────────────────────

export interface LinkRefsOptions {
  /** Module the text's "Lesson N" numbers are relative to. */
  lineageModule: string;
  /** Lessons in that module (an N above this is not a lesson in it). */
  moduleLessonCount: number;
  /** This lesson's own position, so "today's Lesson 3" inside Lesson 3 stays text. */
  selfPosition?: number | null;
}

export interface LinkRefsResult {
  markdown: string;
  linked: number;
  review: ReviewRecord[];
}

// "Lesson 3", "Lessons 01–04", "Lessons 1-4", "Lesson 6 and 7", "Lessons 1, 2 and 3".
const REF_RE =
  /\b(Lessons?)\s+(\d{1,2})(?!\d)((?:\s*(?:[-–—]|to)\s*\d{1,2}(?!\d))|(?:(?:\s*,\s*\d{1,2}(?!\d))+\s*,?\s*(?:and|&)\s*\d{1,2}(?!\d))|(?:\s*(?:and|&)\s*\d{1,2}(?!\d)))?/gi;

// Spans that must never be rewritten: inline code, existing links/images, autolinks, URLs.
const PROTECTED =
  /(`+)[\s\S]*?\1|!?\[[^\]]*\]\([^)]*\)|<[^>\s]+>|https?:\/\/[^\s)]+/g;

function excerptAround(text: string, index: number, len: number): string {
  return text.slice(Math.max(0, index - 40), index + len + 30).replace(/\s+/g, ' ').trim();
}

function rewriteSegment(
  text: string,
  opts: LinkRefsOptions,
  out: { linked: number; review: ReviewRecord[] },
): string {
  return text.replace(REF_RE, (match, _word: string, first: string, rest: string | undefined, offset: number) => {
    const before = text.slice(0, offset);
    const after = text.slice(offset + match.length);

    // "Lesson 3 of 8" is numbering metadata, not a pointer to another lesson.
    if (/^\s+of\s+\d+\b/i.test(after)) return match;

    // Qualified references name some other course/module — never assume ours.
    const qualifiedBefore = /\b(?:course|module|stage|path|unit)\s*\d*[\s,·:–—-]*$/i.test(before);
    const qualifiedAfter = /^\s*(?:,|\s)\s*(?:of|in|from)\s+(?:the\s+)?(?:course|module|stage|path|[A-Z][\w&]*(?:\s+[A-Z][\w&]*){0,3}\s+(?:course|module|path))\b/i.test(
      after,
    );
    if (qualifiedBefore || qualifiedAfter) {
      out.review.push({
        kind: 'ref-qualified',
        detail: 'Reference names another course/module; left as text.',
        excerpt: excerptAround(text, offset, match.length),
      });
      return match;
    }

    const numbers = [Number(first), ...(rest ? [...rest.matchAll(/\d{1,2}/g)].map((x) => Number(x[0])) : [])];
    const inRange = numbers.every((n) => n >= 1 && n <= opts.moduleLessonCount);
    if (!inRange) {
      out.review.push({
        kind: 'ref-unresolved',
        detail: `Lesson number outside the module's 1–${opts.moduleLessonCount}; left as text.`,
        excerpt: excerptAround(text, offset, match.length),
      });
      return match;
    }

    // A self-reference ("today's Lesson 3" inside Lesson 3) has nothing to link to.
    if (opts.selfPosition != null && numbers.length === 1 && numbers[0] === opts.selfPosition) return match;

    const link = (digits: string) => {
      const n = Number(digits);
      if (opts.selfPosition != null && n === opts.selfPosition) return digits;
      out.linked++;
      return `[${digits}](${refHref(lineageKey(opts.lineageModule, n))})`;
    };

    if (!rest) {
      // Single reference: the whole phrase is the link text.
      out.linked++;
      return `[${match}](${refHref(lineageKey(opts.lineageModule, numbers[0]))})`;
    }

    // A list or range: keep the wording, link each number.
    const head = match.slice(0, match.indexOf(first));
    const restLinked = rest.replace(/\d{1,2}/g, (d) => link(d));
    return `${head}${link(first)}${restLinked}`;
  });
}

/**
 * Rewrites module-relative "Lesson N" mentions in `markdown` as lineage links.
 * Idempotent: text already inside a link is never touched. Code (fenced or
 * inline), headings and existing links are left alone.
 */
export function linkLessonReferences(markdown: string, opts: LinkRefsOptions): LinkRefsResult {
  const lines = toLines(markdown);
  const mask = fenceMask(lines);
  const state = { linked: 0, review: [] as ReviewRecord[] };

  const rewritten = lines.map((line, i) => {
    if (mask[i] || /^\s{0,3}#{1,6}\s/.test(line) || isDivider(line) || line.trim() === '') return line;
    // Split into protected spans and plain text; rewrite only the plain text.
    let result = '';
    let cursor = 0;
    for (const m of line.matchAll(PROTECTED)) {
      const idx = m.index ?? 0;
      result += rewriteSegment(line.slice(cursor, idx), opts, state) + m[0];
      cursor = idx + m[0].length;
    }
    result += rewriteSegment(line.slice(cursor), opts, state);
    return result;
  });

  return { markdown: rewritten.join('\n'), linked: state.linked, review: state.review };
}
