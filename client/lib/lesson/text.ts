// FILE PATH: client/lib/lesson/text.ts
//
// Text normalisation + similarity, used by the render-time duplicate safeguard.
// A small mirror of server/src/curriculum/lesson-content/text.ts (the two packages
// share no code); keep their behaviour in step.

const CURLY_SINGLE = /[‘’‛′]/g;
const CURLY_DOUBLE = /[“”‟″]/g;

export function normalizeQuotes(s: string): string {
  return s
    .replace(CURLY_SINGLE, "'")
    .replace(CURLY_DOUBLE, '"')
    .replace(/[   ]/g, ' ')
    .replace(/[​-‍﻿]/g, '');
}

export function stripInlineMarkdown(s: string): string {
  return s
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/`+/g, '')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/~~(.*?)~~/g, '$1');
}

const LEADING_EMOJI = /^[\s\p{Extended_Pictographic}‍️⃣]+/u;
export function stripLeadingEmoji(s: string): string {
  return s.replace(LEADING_EMOJI, '').trim();
}

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
    'been but do does each more most not only other out over than too use used using via able would should could ' +
    'lesson students student learn'
  ).split(' '),
);

function stem(w: string): string {
  if (w.length <= 3) return w;
  if (w.endsWith('ies') && w.length > 4) return w.slice(0, -3) + 'y';
  for (const suf of ['ing', 'ed', 'es', 'ly', 's']) {
    if (w.endsWith(suf) && w.length - suf.length >= 3) return w.slice(0, -suf.length);
  }
  return w;
}

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

export function containment(small: string[], big: string[]): number {
  const S = new Set(small);
  if (S.size === 0) return 0;
  const B = new Set(big);
  let hit = 0;
  for (const x of S) if (B.has(x)) hit++;
  return hit / S.size;
}

export function textSimilarity(a: string, b: string): number {
  const ta = contentTokens(a);
  const tb = contentTokens(b);
  return Math.max(jaccard(ta, tb), Math.min(containment(ta, tb), containment(tb, ta)));
}

/**
 * A URL-fragment- and DOM-id-safe id from heading text: ASCII letters, digits and
 * dashes only (the server validates progress ids against /^[a-z0-9][a-z0-9-]{0,59}$/).
 */
export function slugify(s: string): string {
  const id = normalizeQuotes(stripInlineMarkdown(stripLeadingEmoji(s)))
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 56)
    .replace(/-+$/g, '');
  return id || 'section';
}
