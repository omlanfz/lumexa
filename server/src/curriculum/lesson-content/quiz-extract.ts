// FILE PATH: server/src/curriculum/lesson-content/quiz-extract.ts
//
// Turns the text-based quizzes buried in lesson Markdown ("Mini Quiz",
// "Check Your Understanding", "Knowledge Check", plus their answer keys) into the
// structured Mini Quiz format.
//
// Principles:
//   * Only convert what can be parsed completely and unambiguously. A question
//     whose answer cannot be determined stays exactly where it was and is
//     reported for review — it is never guessed at.
//   * An answer key is never left in student-facing text. If its questions could
//     not be converted, the key is moved verbatim into the teacher-only notes.
//   * Nothing is lost: questions from the structured source dataset that the
//     Markdown parse did not produce are added to the quiz.

import {
  applyCuts,
  fenceMask,
  findHeadings,
  isBlank,
  isDivider,
  sectionRange,
  toLines,
  type Cut,
  type LineRange,
  type MdHeading,
} from './markdown';
import { comparable, normalizeQuotes, stripLeadingEmoji, textSimilarity } from './text';
import type {
  ChangeRecord,
  ChoiceQuestion,
  QuizQuestion,
  ReviewRecord,
  SelfCheckQuestion,
  SourceQuizQuestion,
} from './types';

export const QUIZ_BLOCK_LANG = 'lumexa-quiz';
export const QUIZ_PLACEHOLDER = ['## Knowledge Check', '', '```' + QUIZ_BLOCK_LANG, '```'];

/**
 * Adds a "Knowledge Check" section (holding the quiz block) to a lesson that has none:
 * just before the first of its closing sections (celebration / activities / recap /
 * portfolio), or at the end. Does nothing when the lesson already places a quiz.
 */
export function addQuizPlaceholder(markdown: string, before: RegExp[] = [/victory moment/, /^activities$/, /recap/, /portfolio/]): string {
  const lines = toLines(markdown);
  const hasBlock = new RegExp('^ {0,3}`{3,}\\s*' + QUIZ_BLOCK_LANG + '\\s*$');
  if (lines.some((l) => hasBlock.test(l))) return markdown;
  const heads = findHeadings(lines, fenceMask(lines)).filter((h) => h.level === 2);
  const target = heads.find((h) => before.some((re) => re.test(comparable(stripLeadingEmoji(h.text)))));
  const at = target ? target.line : lines.length;
  const head = lines.slice(0, at);
  while (head.length > 0 && isBlank(head[head.length - 1])) head.pop();
  const tail = lines.slice(at);
  return [...head, '', ...QUIZ_PLACEHOLDER, ...(tail.length > 0 ? ['', ...tail] : [])].join('\n');
}

type GroupKind = 'mini' | 'cyu' | 'kc';

const LEAD = '^[^\\p{L}\\p{N}]*';
const MINI_RE = new RegExp(`${LEAD}(?:mini[\\s-]*quiz|quiz)\\b`, 'iu');
const CYU_RE = new RegExp(`${LEAD}check\\s+your\\s+understanding\\b`, 'iu');
const KC_RE = new RegExp(`${LEAD}(?:knowledge\\s+checks?|self[\\s-]*checks?|quick\\s+checks?)\\b`, 'iu');
const KEY_HEADING_RE = new RegExp(`${LEAD}(?:answer\\s*keys?|answers)\\b`, 'iu');

export function quizHeadingKind(text: string): GroupKind | 'key' | null {
  if (KEY_HEADING_RE.test(text) && !MINI_RE.test(text)) return 'key';
  if (MINI_RE.test(text)) return 'mini';
  if (CYU_RE.test(text)) return 'cyu';
  if (KC_RE.test(text)) return 'kc';
  return null;
}

// ─── Parsing one quiz section ───────────────────────────────────────────────

interface ParsedQuestion {
  prompt: string;
  options: { letter: string; text: string }[];
  code?: { language: string; code: string };
}

interface ParsedAnswer {
  n: number;
  text: string;
}

/** A run of answer entries; `kind` is set when the key labels it ("Mini Quiz: …"). */
interface AnswerBlock {
  kind?: GroupKind;
  entries: ParsedAnswer[];
}

interface ParsedBody {
  questions: ParsedQuestion[];
  blocks: AnswerBlock[];
  /** Index (within the body) of the first line of the answer-key portion, if any. */
  keyStart: number | null;
  /** Non-blank lines that were neither a question, an option nor an answer. */
  leftover: string[];
}

const Q_NUM = /^\s{0,3}(\d{1,2})[.)]\s+(.+)$/;
const Q_BOLD = /^\s{0,3}(?:\*\*|__)?\s*Q(\d{1,2})\s*[.):]\s*(?:\*\*|__)?\s*(.*)$/i;
const Q_BULLET = /^\s{0,3}[-*•]\s+(.+)$/;
const OPT_LINE = /^\s*\(?([a-dA-D])[.)]\s+(.+)$/;
const KEY_MARKER = /^\s*(?:#{1,6}\s+)?(?:\*\*|__)?\s*(?:answer\s*keys?|answers?)\b\s*(?:\*\*|__)?\s*[:.\-–—]?\s*(?:\*\*|__)?\s*(.*)$/i;
const KEY_START = /^\s*(?:#{1,6}\s+|\*\*|__)?\s*(?:answer\s*keys?|answers?)\b/i;
const LABEL_ONLY = /^\s*(?:\*\*|__)\s*(?:quiz|questions?)\s*:?\s*(?:\*\*|__)\s*$/i;
/** "Mini Quiz: 1-b, 2-c" / "Check Your Understanding (sample answers):" inside an answer key. */
const LABEL_BLOCK = /^\s*(?:\*\*|__)?\s*(mini[\s-]*quiz|quiz|check\s+your\s+understanding|knowledge\s+checks?)\b[^:\n]*:\s*(?:\*\*|__)?\s*(.*)$/i;
const INLINE_KEY = /(\d{1,2})\s*[-–:.)]\s*([a-dA-D]|true|false)\b/gi;

function labelKind(label: string): GroupKind {
  const l = label.toLowerCase();
  if (l.startsWith('check')) return 'cyu';
  if (l.startsWith('knowledge')) return 'kc';
  return 'mini';
}

/** "a) x  b) y  c) z" → options (letters must run a, b, c… in order, any case). */
function splitInlineOptions(text: string): { stem: string; options: { letter: string; text: string }[] } | null {
  const marks = [...text.matchAll(/(?:^|\s)([a-dA-D])\)\s/g)];
  if (marks.length < 2) return null;
  const letters = marks.map((m) => m[1].toLowerCase());
  if (letters[0] !== 'a' || !letters.every((l, i) => l.charCodeAt(0) === 97 + i)) return null;
  const options = marks.map((m, i) => {
    const from = (m.index ?? 0) + m[0].length;
    const to = i + 1 < marks.length ? (marks[i + 1].index ?? text.length) : text.length;
    return { letter: letters[i], text: text.slice(from, to).trim() };
  });
  if (options.some((o) => o.text === '')) return null;
  const stem = text.slice(0, (marks[0].index ?? 0)).trim();
  return { stem, options };
}

function parseBody(lines: string[]): ParsedBody {
  const mask = fenceMask(lines);
  const questions: ParsedQuestion[] = [];
  const blocks: AnswerBlock[] = [];
  const leftover: string[] = [];
  let mode: 'q' | 'a' = 'q';
  let keyStart: number | null = null;
  let cur: ParsedQuestion | null = null;
  let curAnswer: ParsedAnswer | null = null;
  let block: AnswerBlock | null = null;
  let fence: { lang: string; buf: string[] } | null = null;

  const startBlock = (kind?: GroupKind) => {
    block = { kind, entries: [] };
    blocks.push(block);
    curAnswer = null;
  };
  const pushEntries = (rest: string) => {
    for (const m of rest.matchAll(INLINE_KEY)) block!.entries.push({ n: Number(m[1]), text: m[2] });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (mask[i]) {
      // A fenced block belongs to the question above it (a code snippet).
      if (!fence) {
        const open = line.match(/^ {0,3}(?:`{3,}|~{3,})\s*([\w+#.-]*)/);
        fence = { lang: open?.[1] || 'text', buf: [] };
      } else if (/^ {0,3}(?:`{3,}|~{3,})\s*$/.test(line)) {
        if (cur && mode === 'q' && !cur.code) cur.code = { language: fence.lang, code: fence.buf.join('\n') };
        else leftover.push('```' + fence.lang + '\n' + fence.buf.join('\n') + '\n```');
        fence = null;
      } else {
        fence.buf.push(line);
      }
      continue;
    }

    if (isBlank(line) || isDivider(line) || LABEL_ONLY.test(line)) continue;

    const marker = line.match(KEY_MARKER);
    if (marker && KEY_START.test(line)) {
      if (keyStart === null) keyStart = i;
      mode = 'a';
      cur = null;
      startBlock();
      pushEntries(marker[1] ?? '');
      continue;
    }

    if (mode === 'a') {
      const label = line.match(LABEL_BLOCK);
      if (label && !Q_NUM.test(line)) {
        startBlock(labelKind(label[1]));
        pushEntries(label[2] ?? '');
        continue;
      }
      const num = line.match(Q_NUM);
      if (num) {
        curAnswer = { n: Number(num[1]), text: num[2].trim() };
        block!.entries.push(curAnswer);
        continue;
      }
      const inline = [...line.matchAll(INLINE_KEY)];
      if (inline.length >= 2) {
        for (const m of inline) block!.entries.push({ n: Number(m[1]), text: m[2] });
        curAnswer = null;
        continue;
      }
      if (curAnswer) {
        // An indented or lazy continuation of the previous answer.
        (curAnswer as ParsedAnswer).text += ' ' + line.trim();
        continue;
      }
      leftover.push(line.trim());
      continue;
    }

    // mode === 'q'
    const num = line.match(Q_NUM) ?? line.match(Q_BOLD);
    const bullet = num ? null : line.match(Q_BULLET);
    if (num || bullet) {
      cur = { prompt: (num ? num[2] : bullet![1]).trim(), options: [] };
      questions.push(cur);
      const inline = splitInlineOptions(cur.prompt);
      if (inline) {
        cur.prompt = inline.stem;
        cur.options = inline.options;
      }
      continue;
    }
    if (cur) {
      // Options written on one line ("a) x  b) y  c) z"), before the one-per-line form.
      const inline = splitInlineOptions(line.trim());
      if (inline && cur.options.length === 0) {
        if (inline.stem) cur.prompt += ' ' + inline.stem;
        cur.options = inline.options;
        continue;
      }
      const opt = line.match(OPT_LINE);
      if (opt && opt[1].toLowerCase().charCodeAt(0) === 97 + cur.options.length) {
        cur.options.push({ letter: opt[1].toLowerCase(), text: opt[2].trim() });
        continue;
      }
      if (/^\s+\S/.test(line) && cur.options.length === 0) {
        cur.prompt += ' ' + line.trim();
        continue;
      }
    }
    leftover.push(line.trim());
  }
  return { questions, blocks: blocks.filter((b) => b.entries.length > 0), keyStart, leftover };
}

// ─── Answers ────────────────────────────────────────────────────────────────

interface ParsedEntry {
  letter?: number; // 0-based option index
  tf?: boolean; // true = "True"
  rest: string; // text after the marker (or the whole entry)
}

const LETTER_ENTRY = /^\s*(?:\*\*)?\(?([a-dA-D])(?:\*\*)?(?:\/\([^)]{1,20}\))?\s*(?:[).:]|\s+[—–-]|[—–])\s*(.*)$/;
const BARE_LETTER = /^\s*(?:\*\*)?\(?([a-dA-D])\)?(?:\*\*)?\s*[.]?\s*$/;
const TF_ENTRY = /^\s*(?:\*\*)?(true|false)(?:\*\*)?\b\s*[.—–:,-]?\s*(.*)$/i;

function parseEntry(text: string): ParsedEntry {
  const t = text.trim();
  const bare = t.match(BARE_LETTER);
  if (bare) return { letter: bare[1].toLowerCase().charCodeAt(0) - 97, rest: '' };
  const letter = t.match(LETTER_ENTRY);
  if (letter) return { letter: letter[1].toLowerCase().charCodeAt(0) - 97, rest: letter[2].trim() };
  const tf = t.match(TF_ENTRY);
  if (tf) return { tf: tf[1].toLowerCase() === 'true', rest: tf[2].trim() };
  return { rest: t };
}

const TF_PROMPT = /^\s*(?:true\s*(?:or|\/)\s*false|t\s*\/\s*f)\s*[:.\-–—)]\s*/i;

function cleanExplanation(rest: string, optionText?: string): string | undefined {
  const t = rest.replace(/^[—–:.\-\s]+/, '').trim();
  if (!t) return undefined;
  // "a) `.py`" — the "explanation" is just the option again.
  if (optionText) {
    const bare = (s: string) => normalizeQuotes(s).toLowerCase().replace(/[\s.]+$/, '');
    if (bare(t) === bare(optionText) || textSimilarity(t, optionText) >= 0.85) return undefined;
  }
  return t;
}

function codeKind(prompt: string): ChoiceQuestion['type'] {
  if (/\b(?:what|which)\b.*\b(?:print|output|display|result|return|value)s?\b.*\b(?:code|program|script|snippet|following)\b|\bwhat (?:will|does) (?:this|the following)\b/i.test(prompt)) return 'code_output';
  if (/\b(?:error|bug|mistake|wrong|incorrect|broken|fix)\b/i.test(prompt)) return 'code_error';
  return 'multiple_choice';
}

function withCode(prompt: string, code?: { language: string; code: string }): string {
  return code ? `${prompt}\n\n\`\`\`${code.language}\n${code.code}\n\`\`\`` : prompt;
}

/** Builds one structured question, or a reason it cannot be built. */
function buildQuestion(
  kind: GroupKind,
  pq: ParsedQuestion,
  entry: ParsedAnswer | undefined,
): QuizQuestion | { problem: string } {
  const prompt = pq.prompt.trim();
  if (prompt === '') return { problem: 'empty question text' };
  const parsed = entry ? parseEntry(entry.text) : undefined;

  // ── Multiple choice ──
  if (pq.options.length >= 2) {
    if (!parsed) return { problem: `no answer key entry for "${prompt.slice(0, 60)}"` };
    let idx = parsed.letter;
    if (idx === undefined) {
      const sims = pq.options.map((o) => textSimilarity(o.text, parsed.rest));
      const best = Math.max(...sims);
      if (best >= 0.8 && sims.filter((s) => s === best).length === 1) idx = sims.indexOf(best);
    }
    if (idx === undefined || idx < 0 || idx >= pq.options.length) {
      return { problem: `answer key entry does not identify an option for "${prompt.slice(0, 60)}"` };
    }
    const options = pq.options.map((o) => o.text);
    return {
      id: '',
      type: pq.code ? codeKind(prompt) : 'multiple_choice',
      prompt,
      options,
      correctIndex: idx,
      ...(pq.code ? { code: pq.code } : {}),
      explanation: cleanExplanation(parsed.rest, options[idx]),
      source: 'markdown',
    } as ChoiceQuestion;
  }

  // ── True / False ──
  const tfPrompt = TF_PROMPT.test(prompt);
  if (tfPrompt && parsed && parsed.tf !== undefined) {
    return {
      id: '',
      type: 'true_false',
      prompt: prompt.replace(TF_PROMPT, '').trim(),
      options: ['True', 'False'],
      correctIndex: parsed.tf ? 0 : 1,
      explanation: cleanExplanation(parsed.rest),
      source: 'markdown',
    } as ChoiceQuestion;
  }
  if (tfPrompt && !parsed && kind === 'mini') return { problem: `no answer key entry for "${prompt.slice(0, 60)}"` };

  // ── No options: a short-answer or reflective prompt ──
  if (parsed && parsed.letter !== undefined) {
    // The key gives a letter but the question has no options: the options were not recognised.
    return { problem: `answer key gives an option letter but no options were found for "${prompt.slice(0, 60)}"` };
  }
  if (parsed && parsed.rest) {
    return { id: '', type: 'self_check', prompt: withCode(prompt, pq.code), sampleAnswer: parsed.rest, source: 'markdown' } as SelfCheckQuestion;
  }
  return { id: '', type: 'reflection', prompt: withCode(prompt, pq.code), source: 'markdown' } as QuizQuestion;
}

// ─── Section discovery + answer mapping ─────────────────────────────────────

interface Group {
  kind: GroupKind;
  heading: MdHeading;
  range: LineRange;
  body: ParsedBody;
  /** Line range (absolute) of the answer-key portion inside this section. */
  keyRange: LineRange | null;
}

export interface QuizExtraction {
  lines: string[];
  questions: QuizQuestion[];
  teacherChunks: { title: string; text: string }[];
  changes: ChangeRecord[];
  review: ReviewRecord[];
}

const excerpt = (s: string, n = 200) => (s.length > n ? s.slice(0, n) + '…' : s);

function isInside(inner: LineRange, outer: LineRange): boolean {
  return inner.start >= outer.start && inner.end <= outer.end;
}

/** Lists with real options or a true/false stem need their answer; open prompts do not. */
function needsAnswers(g: Group): boolean {
  return g.kind === 'mini';
}

/**
 * Pairs answer entries with questions. A key may label its blocks ("Mini Quiz:",
 * "Check Your Understanding (sample answers):"), in which case labels decide —
 * the labelled order need not match the order of the questions in the lesson.
 * Unlabelled entries are matched by count: across every question, or onto the one
 * list whose length they equal. Nothing is paired unless the counts agree exactly.
 */
function mapAnswers(
  groups: Group[],
  blocks: AnswerBlock[],
): { assigned: Map<ParsedQuestion, ParsedAnswer | undefined>; failed: Map<Group, string> } {
  const assigned = new Map<ParsedQuestion, ParsedAnswer | undefined>();
  const failed = new Map<Group, string>();
  const mapped = new Set<Group>();
  groups.forEach((g) => g.body.questions.forEach((q) => assigned.set(q, undefined)));

  const apply = (g: Group, entries: ParsedAnswer[]) => {
    g.body.questions.forEach((q, i) => assigned.set(q, entries[i]));
    mapped.add(g);
  };

  for (const b of blocks.filter((x) => x.kind)) {
    const g = groups.find((x) => x.kind === b.kind && !mapped.has(x));
    if (!g) continue;
    if (b.entries.length === g.body.questions.length) apply(g, b.entries);
    else if (needsAnswers(g)) failed.set(g, `The answer key lists ${b.entries.length} answer(s) for ${g.body.questions.length} question(s).`);
  }

  const rest = groups.filter((g) => !mapped.has(g) && !failed.has(g));
  const entries = blocks.filter((b) => !b.kind).flatMap((b) => b.entries);
  if (entries.length === 0 || rest.length === 0) return { assigned, failed };

  const total = rest.reduce((a, g) => a + g.body.questions.length, 0);
  if (entries.length === total) {
    let at = 0;
    for (const g of rest) {
      apply(g, entries.slice(at, at + g.body.questions.length));
      at += g.body.questions.length;
    }
    return { assigned, failed };
  }
  const sameSize = rest.filter((g) => g.body.questions.length === entries.length);
  const target = sameSize.find((g) => g.kind === 'mini') ?? (sameSize.length === 1 ? sameSize[0] : undefined);
  if (target) {
    apply(target, entries);
    return { assigned, failed };
  }
  for (const g of rest) {
    if (needsAnswers(g)) failed.set(g, `The answer key (${entries.length} entries) does not line up with the questions (${total}).`);
  }
  return { assigned, failed };
}

/**
 * Extracts quiz sections from `lines`.
 *
 * `mode: 'extract'` converts sections into structured questions and replaces the
 * first with a `lumexa-quiz` placeholder. `mode: 'secure-only'` (used when the
 * lesson already has a structured quiz) leaves the questions alone and only moves
 * answer keys out of the student-facing text.
 */
export function extractQuiz(
  lines: string[],
  opts: { mode?: 'extract' | 'secure-only'; sourceQuiz?: SourceQuizQuestion[] | null } = {},
): QuizExtraction {
  const mode = opts.mode ?? 'extract';
  const result: QuizExtraction = { lines, questions: [], teacherChunks: [], changes: [], review: [] };
  const mask = fenceMask(lines);
  const headings = findHeadings(lines, mask);

  // 1. Find candidate quiz sections and standalone answer-key sections.
  const groups: Group[] = [];
  const keySections: { heading: MdHeading; range: LineRange }[] = [];
  headings.forEach((h, idx) => {
    if (h.level < 2 || h.level > 4) return;
    const kind = quizHeadingKind(h.text);
    if (!kind) return;
    const range = sectionRange(lines, headings, idx);
    if (kind === 'key') {
      keySections.push({ heading: h, range });
      return;
    }
    // A section nested in an already-found quiz section is part of it.
    if (groups.some((g) => isInside(range, g.range))) return;
    const bodyLines = lines.slice(h.line + 1, range.end);
    const body = parseBody(bodyLines);
    if (body.questions.length === 0 && body.blocks.length === 0) return;
    const keyRange = body.keyStart === null ? null : { start: h.line + 1 + body.keyStart, end: range.end };
    groups.push({ kind, heading: h, range, body, keyRange });
  });
  if (groups.length === 0 && keySections.length === 0) return result;

  // Answer-key sections that live inside a quiz section are already in its body.
  const standaloneKeys = keySections.filter((k) => !groups.some((g) => isInside(k.range, g.range)));
  const standaloneBlocks: AnswerBlock[] = [];
  for (const k of standaloneKeys) standaloneBlocks.push(...parseBody(lines.slice(k.heading.line, k.range.end)).blocks);
  const allBlocks: AnswerBlock[] = [...groups.flatMap((g) => g.body.blocks), ...standaloneBlocks];

  const cuts: Cut[] = [];
  const keyText = (g: Group) => (g.keyRange ? lines.slice(g.keyRange.start, g.keyRange.end).join('\n').trim() : '');
  const plainTitle = (t: string) => t.replace(/^[^\p{L}\p{N}]+/u, '');

  // 2. secure-only: keep questions, move any answer key into teacher notes.
  if (mode === 'secure-only') {
    for (const g of groups) {
      if (!g.keyRange) continue;
      const text = keyText(g);
      cuts.push({ start: g.keyRange.start, end: g.keyRange.end });
      result.teacherChunks.push({ title: `Answer key — ${plainTitle(g.heading.text)}`, text });
      result.changes.push({ kind: 'teacher-section-moved', detail: `Moved the answer key under "${g.heading.text}" to teacher-only notes.`, excerpt: excerpt(text) });
    }
    for (const k of standaloneKeys) {
      const text = lines.slice(k.heading.line + 1, k.range.end).join('\n').trim();
      cuts.push({ start: k.heading.line, end: k.range.end });
      result.teacherChunks.push({ title: plainTitle(k.heading.text), text });
      result.changes.push({ kind: 'teacher-section-moved', detail: `Moved "${k.heading.text}" to teacher-only notes.`, excerpt: excerpt(text) });
    }
    result.lines = applyCuts(lines, cuts);
    return result;
  }

  // 3. Map answers onto questions.
  const { assigned, failed: mappingFailed } = mapAnswers(groups, allBlocks);

  // 4. Build structured questions group by group.
  const built: { group: Group; items: QuizQuestion[] }[] = [];
  const failed: { group: Group; reason: string }[] = [];
  for (const g of groups) {
    const early = mappingFailed.get(g);
    if (early) {
      failed.push({ group: g, reason: early });
      continue;
    }
    const items: QuizQuestion[] = [];
    let problem: string | null = null;
    for (const q of g.body.questions) {
      const b = buildQuestion(g.kind, q, assigned.get(q));
      if ('problem' in b) {
        problem = b.problem;
        break;
      }
      items.push(b);
    }
    // Leftover prose inside the section means we do not fully understand it.
    const leftover = g.body.leftover.filter((l) => l !== '');
    if (!problem && leftover.length > 0) problem = `unrecognised text in the section: "${excerpt(leftover[0], 80)}"`;
    if (!problem && items.length === 0) problem = 'no questions were found';
    if (problem) failed.push({ group: g, reason: problem });
    else built.push({ group: g, items });
  }

  // 5. Cut converted sections; protect unconverted ones' answer keys.
  const order: GroupKind[] = ['mini', 'cyu', 'kc'];
  built.sort((a, b) => order.indexOf(a.group.kind) - order.indexOf(b.group.kind));
  const firstStart = built.length ? Math.min(...built.map((b) => b.group.range.start)) : -1;
  for (const b of built) {
    const isFirst = b.group.range.start === firstStart;
    cuts.push({
      start: b.group.range.start,
      end: b.group.range.end,
      ...(isFirst ? { replacement: ['', ...QUIZ_PLACEHOLDER, ''] } : {}),
    });
    result.changes.push({
      kind: 'quiz-extracted',
      detail: `Converted "${b.group.heading.text}" (${b.items.length} question${b.items.length === 1 ? '' : 's'}) into the interactive quiz.`,
    });
  }
  for (const f of failed) {
    result.review.push({
      kind: 'quiz-unparsed',
      detail: `"${f.group.heading.text}" was left as text: ${f.reason}`,
      excerpt: excerpt(lines.slice(f.group.heading.line, f.group.range.end).join('\n').trim()),
    });
    if (f.group.keyRange) {
      const text = keyText(f.group);
      cuts.push({ start: f.group.keyRange.start, end: f.group.keyRange.end });
      result.teacherChunks.push({ title: `Answer key — ${plainTitle(f.group.heading.text)}`, text });
      result.changes.push({ kind: 'teacher-section-moved', detail: `Moved the unconverted answer key under "${f.group.heading.text}" to teacher-only notes.`, excerpt: excerpt(text) });
    }
  }
  for (const k of standaloneKeys) {
    const text = lines.slice(k.heading.line + 1, k.range.end).join('\n').trim();
    cuts.push({ start: k.heading.line, end: k.range.end });
    if (failed.length > 0 || built.length === 0) {
      result.teacherChunks.push({ title: plainTitle(k.heading.text), text });
      result.changes.push({ kind: 'teacher-section-moved', detail: `Moved "${k.heading.text}" to teacher-only notes.`, excerpt: excerpt(text) });
    }
  }

  let questions = built.flatMap((b) => b.items);

  // 6. Nothing from the source dataset may be lost.
  if (opts.sourceQuiz && built.length > 0) {
    for (const sq of opts.sourceQuiz) {
      const text = sq.questionText?.trim();
      if (!text) continue;
      if (questions.some((q) => textSimilarity(q.prompt, text) >= 0.85)) continue;
      if (sq.options && sq.options.length >= 2 && Number.isInteger(sq.correctIndex) && (sq.correctIndex as number) >= 0 && (sq.correctIndex as number) < sq.options.length) {
        questions.push({ id: '', type: 'multiple_choice', prompt: text, options: sq.options, correctIndex: sq.correctIndex as number, source: 'json' } as ChoiceQuestion);
      } else if (sq.correctAnswerText) {
        questions.push({ id: '', type: 'self_check', prompt: text, sampleAnswer: sq.correctAnswerText, source: 'json' } as SelfCheckQuestion);
      }
    }
  }

  // 7. Report a suspicious answer distribution (the source content favours "b").
  const mc = questions.filter((q): q is ChoiceQuestion => q.type === 'multiple_choice');
  if (mc.length >= 4) {
    const counts = new Map<number, number>();
    mc.forEach((q) => counts.set(q.correctIndex, (counts.get(q.correctIndex) ?? 0) + 1));
    const [idx, n] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (n / mc.length >= 0.8) {
      result.review.push({
        kind: 'quiz-answer-bias',
        detail: `${n} of ${mc.length} multiple-choice answers are option ${String.fromCharCode(97 + idx)}. Options are shuffled for learners, but the authored order is predictable.`,
      });
    }
  }

  questions = questions.map((q, i) => ({ ...q, id: `q${i + 1}` }) as QuizQuestion);
  result.questions = questions;
  result.lines = applyCuts(lines, cuts);
  return result;
}
