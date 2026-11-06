// FILE PATH: server/src/curriculum/lesson-content/text.ts
//
// Text normalisation + similarity helpers shared by the lesson-content cleanup
// engine. Everything here is pure and deterministic (no I/O, no randomness) so
// the cleanup stays idempotent and unit-testable.

const CURLY_SINGLE = /[‘’‛′]/g;
const CURLY_DOUBLE = /[“”‟″]/g;

/** Straight quotes + collapsed NBSP/zero-width characters. */
export function normalizeQuotes(s: string): string {
  return s
    .replace(CURLY_SINGLE, "'")
    .replace(CURLY_DOUBLE, '"')
    .replace(/[   ]/g, ' ')
    .replace(/[​-‍﻿]/g, '');
}

/** Removes inline Markdown decoration, keeping the readable text. */
export function stripInlineMarkdown(s: string): string {
  return s
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/`+/g, '')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/~~(.*?)~~/g, '$1');
}

/** Leading emoji / pictographs and presentation selectors (headings like "🚀 Lesson 1"). */
const LEADING_EMOJI = /^[\s\p{Extended_Pictographic}‍️⃣]+/u;
export function stripLeadingEmoji(s: string): string {
  return s.replace(LEADING_EMOJI, '').trim();
}

/** A comparison key: lower-case, straight quotes, no Markdown, no list markers. */
export function comparable(s: string): string {
  return normalizeQuotes(stripInlineMarkdown(s))
    .toLowerCase()
    .replace(/^\s*(?:\d+[.)]|[-*•])\s+/, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOP = new Set(
  (
    'a an and are as at be by can for from has have how i if in into is it its of on or our so that the their them then ' +
    'there these they this to was we were what when where which who why will with you your yours about after also any ' +
    'been but do does each more most not only other out over than too use used using via able will would should could ' +
    'lesson students student learn'
  ).split(' '),
);

/** A deliberately light stemmer — enough to equate "linked"/"link", "fonts"/"font". */
export function stem(w: string): string {
  if (w.length <= 3) return w;
  if (w.endsWith('ies') && w.length > 4) return w.slice(0, -3) + 'y';
  for (const suf of ['ing', 'ed', 'es', 'ly', 's']) {
    if (w.endsWith(suf) && w.length - suf.length >= 3) return w.slice(0, -suf.length);
  }
  return w;
}

/** Significant, stemmed tokens of a string. */
export function contentTokens(s: string): string[] {
  const out: string[] = [];
  for (const w of comparable(s).split(' ')) {
    if (!w || STOP.has(w)) continue;
    if (w.length < 2 && !/\d/.test(w)) continue;
    out.push(stem(w));
  }
  return out;
}

export function jaccard(a: string[], b: string[]): number {
  const A = new Set(a);
  const B = new Set(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter);
}

/** Share of `small`'s tokens that also occur in `big` (0..1). */
export function containment(small: string[], big: string[]): number {
  const S = new Set(small);
  if (S.size === 0) return 0;
  const B = new Set(big);
  let hit = 0;
  for (const x of S) if (B.has(x)) hit++;
  return hit / S.size;
}

/** Best similarity of two strings, tolerant of one being a rewording of the other. */
export function textSimilarity(a: string, b: string): number {
  const ta = contentTokens(a);
  const tb = contentTokens(b);
  return Math.max(jaccard(ta, tb), Math.min(containment(ta, tb), containment(tb, ta)));
}

/** Lower-cased slug used for heading ids and lineage keys. */
export function slugify(s: string): string {
  return (
    normalizeQuotes(stripInlineMarkdown(stripLeadingEmoji(s)))
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'section'
  );
}

/** Deterministic 32-bit string hash (FNV-1a) — used for seeded shuffles and ids. */
export function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Small deterministic PRNG (mulberry32). */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
