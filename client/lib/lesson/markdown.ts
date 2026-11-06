// FILE PATH: client/lib/lesson/markdown.ts
//
// Pure helpers for the lesson renderer: fence-aware heading and section structure
// (for the table of contents, collapsible sections and read tracking), URL safety,
// and the render-time duplicate guard. No React in here, so all of it is unit-tested.

import {
  comparable,
  containment,
  contentTokens,
  jaccard,
  normalizeQuotes,
  slugify,
  stripInlineMarkdown,
  stripLeadingEmoji,
  textSimilarity,
} from './text';

export const VISUAL_BLOCK_LANG = 'lumexa-visual';
export const QUIZ_BLOCK_LANG = 'lumexa-quiz';
export const LESSON_REF_PREFIX = 'lumexa:lesson/';

export function toLines(md: string): string[] {
  return md.replace(/\r\n?/g, '\n').split('\n');
}

const isBlank = (l: string | undefined) => l === undefined || l.trim() === '';
const DIVIDER = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/;
const isDivider = (l: string | undefined) => l !== undefined && DIVIDER.test(l);

/** True for every line inside a fenced code block, fence lines included. */
export function fenceMask(lines: string[]): boolean[] {
  const mask = new Array<boolean>(lines.length).fill(false);
  let open: { ch: string; len: number } | null = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (open) {
      mask[i] = true;
      const close = line.match(/^ {0,3}(`{3,}|~{3,})\s*$/);
      if (close && close[1][0] === open.ch && close[1].length >= open.len) open = null;
      continue;
    }
    const m = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (m) {
      if (m[1][0] === '`' && m[2].includes('`')) continue; // inline code, not a fence
      open = { ch: m[1][0], len: m[1].length };
      mask[i] = true;
    }
  }
  return mask;
}

// ─── Headings, ids, table of contents ───────────────────────────────────────

export interface Heading {
  /** Zero-based line index. */
  line: number;
  level: number;
  /** Heading text (Markdown inline syntax removed, emoji kept). */
  text: string;
  /** Unique, ASCII, DOM-safe. */
  id: string;
}

const ATX = /^ {0,3}(#{1,6})[ \t]+(.*?)[ \t]*#*[ \t]*$/;

/** Plain text of a heading: no emphasis, code ticks or link syntax. */
export function headingPlainText(raw: string): string {
  return normalizeQuotes(stripInlineMarkdown(raw)).replace(/\s+/g, ' ').trim();
}

export function extractHeadings(md: string): Heading[] {
  const lines = toLines(md);
  const mask = fenceMask(lines);
  const used = new Map<string, number>();
  const out: Heading[] = [];
  lines.forEach((line, i) => {
    if (mask[i]) return;
    const m = line.match(ATX);
    if (!m || m[2].trim() === '') return;
    const text = headingPlainText(m[2]);
    const base = slugify(text);
    const n = (used.get(base) ?? 0) + 1;
    used.set(base, n);
    out.push({ line: i, level: m[1].length, text, id: n === 1 ? base : `${base}-${n}` });
  });
  return out;
}

export type SectionKind = 'core' | 'supplementary';

/**
 * Supplementary sections (prerequisites, vocabulary, common mistakes, optional
 * extensions) are collapsible. Everything that teaches the lesson stays open.
 */
const SUPPLEMENTARY =
  /^(?:prerequisites?|before you (?:start|begin)|key (?:vocabulary|terms|terminology)|glossary|new words(?: you learned)?|vocabulary|common (?:mistakes|errors|pitfalls)|debugging (?:tips|guidance)|troubleshooting|experiment\b|extension|extensions\b|bonus\b|optional\b|go further|extra credit)/;

export function classifySection(title: string): SectionKind {
  const key = comparable(stripLeadingEmoji(title));
  return SUPPLEMENTARY.test(key) ? 'supplementary' : 'core';
}

export interface Section {
  id: string;
  title: string;
  /** First line (of the document) of this section — its heading line. */
  startLine: number;
  /** Exclusive end line. */
  endLine: number;
  /** The section's Markdown, heading line included. */
  markdown: string;
  kind: SectionKind;
  hasQuizBlock: boolean;
}

function hasBlock(lines: string[], from: number, to: number, lang: string): boolean {
  const re = new RegExp('^ {0,3}`{3,}\\s*' + lang + '\\s*$');
  for (let i = from; i < to; i++) if (re.test(lines[i])) return true;
  return false;
}

/** The document split at its H2 headings; `intro` is whatever precedes the first. */
export function splitSections(md: string): { intro: string; introLines: number; sections: Section[]; headings: Heading[] } {
  const lines = toLines(md);
  const headings = extractHeadings(md);
  const h2 = headings.filter((h) => h.level === 2);
  if (h2.length === 0) return { intro: md, introLines: lines.length, sections: [], headings };
  const sections: Section[] = h2.map((h, i) => {
    const end = i + 1 < h2.length ? h2[i + 1].line : lines.length;
    return {
      id: h.id,
      title: h.text,
      startLine: h.line,
      endLine: end,
      markdown: lines.slice(h.line, end).join('\n'),
      kind: classifySection(h.text),
      hasQuizBlock: hasBlock(lines, h.line, end, QUIZ_BLOCK_LANG),
    };
  });
  return { intro: lines.slice(0, h2[0].line).join('\n'), introLines: h2[0].line, sections, headings };
}

/** Does the Markdown contain a ```lumexa-quiz block anywhere? */
export function hasQuizBlock(md: string | null | undefined): boolean {
  return !!md && hasBlock(toLines(md), 0, toLines(md).length, QUIZ_BLOCK_LANG);
}

// ─── URL safety ─────────────────────────────────────────────────────────────

/**
 * The only addresses a lesson may link to or load: http(s), mailto, this app's own
 * relative paths and anchors, and lesson references. Anything else ("javascript:",
 * "data:", "vbscript:", protocol-relative "//host", …) becomes an empty string.
 */
export function safeUrl(url: string | undefined | null): string {
  if (!url) return '';
  // Browsers ignore control characters and whitespace inside a scheme ("java\tscript:").
  // eslint-disable-next-line no-control-regex
  const compact = url.replace(/[\u0000- \u007f-\u009f]/g, '');
  if (compact.startsWith('#')) return compact;
  if (compact.startsWith('//')) return '';
  if (compact.startsWith('/')) return compact;
  const scheme = compact.match(/^([a-z][a-z0-9+.-]*):/i);
  if (!scheme) return /^[\w.~-]+(?:[/?#]|$)/.test(compact) ? compact : '';
  const s = scheme[1].toLowerCase();
  if (s === 'http' || s === 'https' || s === 'mailto') return compact;
  if (s === 'lumexa' && /^lumexa:lesson\/[a-z0-9][a-z0-9-]*\/\d{1,3}$/.test(compact)) return compact;
  return '';
}

/** Is this a safe address for an image / video source? https, or this app's own assets. */
export function safeMediaSrc(src: string | undefined | null): string {
  if (!src) return '';
  if (src.startsWith('/lesson-assets/') && !src.includes('..') && !/[\s"'<>\\]/.test(src)) return src;
  return /^https:\/\/[^\s"'<>\\]+$/i.test(src) ? src : '';
}

export function refKeyFromHref(href: string | undefined | null): string | null {
  if (!href || !href.startsWith(LESSON_REF_PREFIX)) return null;
  const key = href.slice(LESSON_REF_PREFIX.length);
  return /^[a-z0-9][a-z0-9-]*\/\d{1,3}$/.test(key) ? key : null;
}

// ─── Render-time duplicate guard ────────────────────────────────────────────

const META_KEYS = new Set(['course/path', 'course / path', 'course', 'path', 'lesson', 'lesson number', 'title', 'duration', 'estimated duration']);
const META_LINE = /^\s*(?:[-*•]\s+)?\*\*\s*([^*:\n]{2,40}?)\s*:?\s*\*\*\s*:?\s*(.*)$/;
const PRIMARY_OBJ = /^(?:learning |lesson )?(?:objectives?|goals?)\b/;
const LEAD_IN = /^(?:by the end of (?:this|the) lesson|after (?:this|the) lesson|in this lesson|at the end of (?:this|the) lesson)[^.]{0,120}[:.]?$|^(?:students|learners|you) (?:will|should) be able to[^.]{0,60}:?$/i;
const HOMEWORK_HEADING = /\b(?:homework|take[- ]home|assignment)\b/;
const ANSWER_KEY_HEADING = /^answer\s*keys?\b/;
const LISTISH = /^\s*(?:[-*•]|\d+[.)])\s+/;

export interface DedupeContext {
  title: string;
  objectives: string[];
  homework: string | null;
  /** Remove answer keys that slipped into the text (anywhere a learner could see them). */
  hideAnswerKeys: boolean;
}

function sectionEnd(lines: string[], mask: boolean[], start: number, level: number): number {
  for (let i = start + 1; i < lines.length; i++) {
    if (mask[i]) continue;
    const m = lines[i].match(ATX);
    if (m && m[1].length <= level) return i;
  }
  return lines.length;
}

/**
 * A last line of defence for text that never went through the content backfill (or was
 * edited since): drops the title banner and metadata the page already shows, a "Learning
 * Objectives" section that repeats the objectives card, a homework section that repeats
 * the homework card, and any answer key. Conservative — only removes what is a copy.
 */
export function dedupeForRender(md: string, ctx: DedupeContext): { markdown: string; removed: string[] } {
  const removed: string[] = [];
  let lines = toLines(md);
  const cut = (from: number, to: number, why: string) => {
    removed.push(why);
    lines = [...lines.slice(0, from), ...lines.slice(to)];
  };

  // 1. A leading heading that only restates the lesson title / course.
  for (let guard = 0; guard < 3; guard++) {
    const first = lines.findIndex((l) => !isBlank(l));
    if (first === -1) break;
    const m = lines[first].match(ATX);
    if (!m || m[1].length > 3) break;
    const text = headingPlainText(m[2]);
    const stripped = text.replace(/^(?:student\s+(?:guide|lesson)|course\s+\d+|lesson\s+\d+)\s*[·:,—–-]\s*/i, '');
    const label = /^(?:course\s+\d+|lesson\s+\d+|student\s+(?:guide|lesson))\b/i.test(text) || /^lumexa\b/i.test(text);
    if (label || textSimilarity(stripped, ctx.title) >= 0.6) cut(first, first + 1, `banner: ${text}`);
    else break;
  }

  // 2. Metadata lines the page already shows.
  {
    const first = lines.findIndex((l) => !isBlank(l));
    if (first !== -1) {
      const drop: number[] = [];
      for (let i = first; i < lines.length; i++) {
        if (isBlank(lines[i])) continue;
        const m = lines[i].match(META_LINE);
        if (!m) break;
        if (META_KEYS.has(m[1].trim().toLowerCase().replace(/\s+/g, ' '))) drop.push(i);
      }
      for (const i of drop.reverse()) cut(i, i + 1, `metadata: ${lines[i].trim()}`);
    }
  }

  // 3. A "Learning Objectives" section that is the objectives card again.
  {
    const mask = fenceMask(lines);
    const heads = lines.map((l, i) => ({ i, m: mask[i] ? null : l.match(ATX) })).filter((x) => x.m);
    for (const h of [...heads].reverse()) {
      const level = h.m![1].length;
      if (level < 2 || level > 4) continue;
      const key = comparable(stripLeadingEmoji(headingPlainText(h.m![2])));
      if (!PRIMARY_OBJ.test(key) || ctx.objectives.length === 0) continue;
      const end = sectionEnd(lines, mask, h.i, level);
      const body = lines.slice(h.i + 1, end).filter((l) => !isBlank(l) && !isDivider(l));
      const items = body.filter((l) => LISTISH.test(l));
      const others = body.filter((l) => !LISTISH.test(l) && !LEAD_IN.test(normalizeQuotes(l.trim())));
      if (items.length === 0 || others.length > 0) continue;
      const texts = items.map((l) => l.replace(LISTISH, ''));
      const sims = texts.map((t) => Math.max(0, ...ctx.objectives.map((o) => textSimilarity(t, o))));
      const exact = texts.length === ctx.objectives.length && texts.every((t, k) => comparable(t) === comparable(ctx.objectives[k]));
      const aligned = texts.length === ctx.objectives.length && texts.every((t, k) => textSimilarity(t, ctx.objectives[k]) >= 0.12) && texts.reduce((a, t, k) => a + textSimilarity(t, ctx.objectives[k]), 0) / texts.length >= 0.35;
      if (exact || aligned || sims.every((s) => s >= 0.3)) cut(h.i, end, `objectives: ${h.m![2]}`);
    }
  }

  // 4. A homework section that is the homework card again (line for line).
  if (ctx.homework && ctx.homework.trim() !== '') {
    const want = toLines(ctx.homework).filter((l) => !isBlank(l) && !isDivider(l));
    const mask = fenceMask(lines);
    for (let i = lines.length - 1; i >= 0; i--) {
      if (mask[i]) continue;
      const m = lines[i].match(ATX);
      if (!m || m[1].length < 2 || m[1].length > 3) continue;
      if (!HOMEWORK_HEADING.test(comparable(stripLeadingEmoji(headingPlainText(m[2]))))) continue;
      let j = i + 1;
      let ok = true;
      for (const w of want) {
        while (j < lines.length && (isBlank(lines[j]) || isDivider(lines[j]))) j++;
        if (j >= lines.length || (comparable(lines[j]) !== comparable(w) && textSimilarity(lines[j], w) < 0.92)) {
          ok = false;
          break;
        }
        j++;
      }
      if (ok) cut(i, j, `homework: ${m[2]}`);
    }
  }

  // 5. Answer keys never belong in learner-facing text.
  if (ctx.hideAnswerKeys) {
    let mask = fenceMask(lines);
    for (let i = lines.length - 1; i >= 0; i--) {
      if (mask[i]) continue;
      const m = lines[i].match(ATX);
      if (m && ANSWER_KEY_HEADING.test(comparable(stripLeadingEmoji(headingPlainText(m[2]))))) {
        cut(i, sectionEnd(lines, mask, i, m[1].length), `answer key: ${m[2]}`);
        mask = fenceMask(lines);
      } else if (/^\s*(?:\*\*|__)\s*answer\s*keys?\b/i.test(lines[i])) {
        cut(i, i + 1, 'answer key line');
        mask = fenceMask(lines);
      }
    }
  }

  // 6. The page's own title is the only H1: demote stray ones, and lift a document whose
  //    headings all start below H2.
  {
    const mask = fenceMask(lines);
    const levels: number[] = [];
    lines.forEach((l, i) => {
      if (!mask[i]) {
        const m = l.match(ATX);
        if (m) levels.push(m[1].length);
      }
    });
    if (levels.length > 0) {
      const min = Math.min(...levels);
      const shift = min === 1 ? 1 : min > 2 ? 2 - min : 0;
      if (shift !== 0) {
        lines = lines.map((l, i) => {
          if (mask[i]) return l;
          const m = l.match(ATX);
          return m ? '#'.repeat(Math.max(1, Math.min(6, m[1].length + shift))) + ' ' + m[2] : l;
        });
        removed.push('hierarchy: shifted headings');
      }
    }
  }

  // Tidy blank runs left behind (never touching fenced code).
  const mask = fenceMask(lines);
  const tidy: string[] = [];
  lines.forEach((l, i) => {
    if (!mask[i] && isBlank(l) && (tidy.length === 0 || isBlank(tidy[tidy.length - 1]))) return;
    tidy.push(l);
  });
  while (tidy.length > 0 && isBlank(tidy[tidy.length - 1])) tidy.pop();
  return { markdown: removed.length > 0 ? tidy.join('\n') : md, removed };
}


// ─── Small structural helpers for the lesson view ───────────────────────────

/** The text of every fenced code block (language tag excluded), outside nested fences. */
export function extractFencedBlocks(md: string): string[] {
  const lines = toLines(md);
  const out: string[] = [];
  let open: { ch: string; len: number } | null = null;
  let buf: string[] = [];
  for (const line of lines) {
    if (open) {
      const close = line.match(/^ {0,3}(`{3,}|~{3,})\s*$/);
      if (close && close[1][0] === open.ch && close[1].length >= open.len) {
        out.push(buf.join('\n'));
        open = null;
        buf = [];
      } else buf.push(line);
      continue;
    }
    const m = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (m && !(m[1][0] === '`' && m[2].includes('`'))) {
      open = { ch: m[1][0], len: m[1].length };
      buf = [];
    }
  }
  return out;
}

const squash = (s: string) => s.replace(/\s+/g, ' ').trim();

/** Is this snippet already shown (as a fenced block) in the lesson text? */
export function codeAlreadyInText(code: string, blocks: string[]): boolean {
  const c = squash(code);
  if (c === '') return true;
  return blocks.some((b) => {
    const t = squash(b);
    return t === c || (c.length > 40 && t.includes(c)) || (t.length > 40 && c.includes(t));
  });
}

/** Removes a leading H1 (a title that restates the card it sits in). */
export function stripLeadingH1(md: string): string {
  const lines = toLines(md);
  const first = lines.findIndex((l) => !isBlank(l));
  if (first !== -1 && /^ {0,3}#[ \t]+\S/.test(lines[first])) {
    return lines
      .slice(first + 1)
      .join('\n')
      .replace(/^\s*\n/, '');
  }
  return md;
}

/** Shifts headings so the shallowest becomes `start` (e.g. under a card's own heading). */
export function normalizeHeadingsFrom(md: string, start: number): string {
  const lines = toLines(md);
  const mask = fenceMask(lines);
  const levels: number[] = [];
  lines.forEach((l, i) => {
    if (mask[i]) return;
    const m = l.match(ATX);
    if (m && m[2].trim() !== '') levels.push(m[1].length);
  });
  if (levels.length === 0) return md;
  const shift = start - Math.min(...levels);
  if (shift === 0) return md;
  return lines
    .map((l, i) => {
      if (mask[i]) return l;
      const m = l.match(ATX);
      return m && m[2].trim() !== '' ? '#'.repeat(Math.max(1, Math.min(6, m[1].length + shift))) + ' ' + m[2] : l;
    })
    .join('\n');
}

/** Ids placed in the text with ```lumexa-visual blocks, in order. */
export function extractVisualIds(md: string | null | undefined): string[] {
  if (!md) return [];
  const lines = toLines(md);
  const re = new RegExp('^ {0,3}`{3,}\\s*' + VISUAL_BLOCK_LANG + '\\s*$');
  const ids: string[] = [];
  lines.forEach((l, i) => {
    if (re.test(l) && lines[i + 1] && lines[i + 1].trim()) ids.push(lines[i + 1].trim());
  });
  return ids;
}

export { contentTokens, jaccard, containment };
