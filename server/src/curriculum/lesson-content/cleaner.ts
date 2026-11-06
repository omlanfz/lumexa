// FILE PATH: server/src/curriculum/lesson-content/cleaner.ts
//
// The lesson-content cleanup: a pure, idempotent function from a lesson's stored
// fields to cleaned fields plus a report. It removes only what is provably
// redundant (the banner and metadata the page already shows from the database,
// objectives and homework that merely repeat the structured fields), moves
// teacher-only material and answer keys out of student-facing text, converts text
// quizzes into the structured Mini Quiz, and links "Lesson N" mentions. Anything
// it is unsure about is left exactly as written and listed for review.
//
// Idempotent: running it on its own output changes nothing.

import {
  applyCuts,
  findHeadings,
  isBlank,
  isDivider,
  parseList,
  sectionRange,
  toLines,
  type Cut,
} from './markdown';
import { extractQuiz } from './quiz-extract';
import { linkLessonReferences } from './refs';
import {
  comparable,
  containment,
  contentTokens,
  jaccard,
  normalizeQuotes,
  stripInlineMarkdown,
  stripLeadingEmoji,
  textSimilarity,
} from './text';
import { cleanLessonTitle, stripTitlePrefixes } from './titles';
import type {
  ChangeRecord,
  ChoiceQuestion,
  LessonContentFields,
  LessonContext,
  QuizQuestion,
  ReviewRecord,
  SelfCheckQuestion,
} from './types';

export interface CleanResult {
  fields: LessonContentFields;
  changed: boolean;
  changes: ChangeRecord[];
  review: ReviewRecord[];
}

const excerpt = (s: string, n = 240) => {
  const t = s.trim();
  return t.length > n ? t.slice(0, n) + '…' : t;
};

/** Heading text reduced to what it says: no emoji, straight quotes, no emphasis. */
function headingKey(text: string): string {
  return normalizeQuotes(stripInlineMarkdown(stripLeadingEmoji(text))).toLowerCase().replace(/\s+/g, ' ').trim();
}

// ─── A. Leading banner, container heading and metadata ─────────────────────

const NOISE = new Set(['lumexa', 'mission', 'log', 'path', 'course', 'lesson', 'student', 'guide', 'school']);
const REMOVABLE_META = new Set([
  'course/path',
  'course / path',
  'course',
  'path',
  'lesson',
  'lesson number',
  'title',
  'duration',
  'estimated duration',
]);
const META_LINE = /^\s*(?:[-*•]\s+)?\*\*\s*([^*:\n]{2,40}?)\s*:?\s*\*\*\s*:?\s*(.*)$/;

function isBannerHeading(text: string, title: string, ctx: LessonContext): boolean {
  const stripped = stripTitlePrefixes(text);
  const cleanTitle = stripTitlePrefixes(title);
  // Restates the lesson title.
  if (comparable(stripped) !== '' && (comparable(stripped) === comparable(cleanTitle) || textSimilarity(stripped, cleanTitle) >= 0.75)) return true;
  // The raw text is a course / lesson label ("Course 14: Data Visualisation — Lesson 1").
  if (/^\s*(?:[^\p{L}\p{N}]*)course\s+\d+\b/iu.test(text) && /\blesson\s+\d+\b|[:·]/i.test(text)) return true;
  if (/—\s*lesson\s+\d+\s*(?:\(final\))?\s*$/i.test(text)) return true;
  // "Lumexa — Digital Independence Path", "Lumexa Mission Log: Python AI Foundations".
  const names = `${ctx.moduleTitle ?? ''} ${ctx.courseTitle ?? ''}`;
  const toks = contentTokens(stripped).filter((t) => !NOISE.has(t));
  if (/^\s*[^\p{L}\p{N}]*lumexa\b/iu.test(text) && (toks.length === 0 || containment(toks, contentTokens(names)) >= 0.99)) return true;
  if (toks.length > 0 && names.trim() !== '' && containment(toks, contentTokens(names)) >= 0.99 && /\bpath\b|\bmission log\b/i.test(text)) return true;
  return false;
}

interface BannerResult {
  lines: string[];
  derivedTitle: string | null;
}

function stripBanner(
  input: string[],
  title: string,
  ctx: LessonContext,
  changes: ChangeRecord[],
  review: ReviewRecord[],
): BannerResult {
  let lines = input;
  const cuts: Cut[] = [];
  let derivedTitle: string | null = null;

  // 1. A run of leading headings that only restate the lesson / course / module.
  let i = 0;
  const removedHeadings: string[] = [];
  for (let guard = 0; guard < 4; guard++) {
    while (i < lines.length && isBlank(lines[i])) i++;
    const h = i < lines.length ? findHeadings([lines[i]])[0] : undefined;
    if (!h || h.level > 3) break;
    if (isBannerHeading(h.text, title, ctx)) {
      cuts.push({ start: i, end: i + 1 });
      removedHeadings.push(lines[i].trim());
      i++;
      continue;
    }
    if (h.level === 1) {
      review.push({ kind: 'leading-h1-unrecognized', detail: `The text starts with a top-level heading that is not the lesson title: "${h.text}". Left in place.`, excerpt: h.text });
    }
    break;
  }
  if (removedHeadings.length) changes.push({ kind: 'banner-removed', detail: 'Removed a heading that repeats the lesson/course title.', excerpt: removedHeadings.join(' | ') });
  if (cuts.length) lines = applyCuts(lines, cuts);

  // 2. A single topic heading wrapping the whole lesson ("## The Science of …"),
  //    used when the real title was lost: unwrap it, and use it as the title.
  const heads = findHeadings(lines);
  if (heads.length >= 3) {
    const min = Math.min(...heads.map((h) => h.level));
    const top = heads.filter((h) => h.level === min);
    const first = heads[0];
    const deeper = heads.filter((h) => h.level > min);
    const titleInfo = cleanLessonTitle(title, ctx);
    if (min >= 2 && top.length === 1 && first === top[0] && deeper.length >= 2) {
      const topic = stripTitlePrefixes(first.text);
      const restates = comparable(topic) !== '' && textSimilarity(topic, stripTitlePrefixes(title)) >= 0.7;
      const lessonLabel = /^\s*lesson\s+\d+\b/i.test(first.text);
      if (titleInfo.generic || restates || lessonLabel) {
        if (titleInfo.generic && topic && !cleanLessonTitle(topic, ctx).generic) derivedTitle = topic;
        if (titleInfo.generic ? !!derivedTitle : true) {
          lines = applyCuts(lines, [{ start: first.line, end: first.line + 1 }]);
          lines = shiftHeadings(lines, -1);
          changes.push({ kind: 'heading-relevelled', detail: `Unwrapped the "${first.text}" wrapper heading and moved its sections up one level.` });
        }
      }
    }
  }

  // 3. The metadata block the page already shows from the database.
  let s = 0;
  while (s < lines.length && isBlank(lines[s])) s++;
  const metaCuts: Cut[] = [];
  const removedMeta: string[] = [];
  let seenAny = false;
  for (let k = s; k < lines.length; k++) {
    const line = lines[k];
    if (isBlank(line)) continue;
    const m = line.match(META_LINE);
    if (!m) break;
    seenAny = true;
    const key = m[1].trim().toLowerCase().replace(/\s+/g, ' ');
    if (REMOVABLE_META.has(key)) {
      metaCuts.push({ start: k, end: k + 1 });
      removedMeta.push(line.trim());
      checkMetaAgainstDatabase(key, m[2].trim(), ctx, review);
    }
  }
  if (seenAny && metaCuts.length) {
    lines = applyCuts(lines, metaCuts);
    changes.push({ kind: 'metadata-removed', detail: 'Removed lesson metadata the page already shows from the database.', excerpt: removedMeta.join(' | ') });
  }
  return { lines, derivedTitle };
}

function checkMetaAgainstDatabase(key: string, value: string, ctx: LessonContext, review: ReviewRecord[]) {
  if ((key === 'duration' || key === 'estimated duration') && ctx.duration) {
    const m = value.match(/(\d{1,3})(?:\s*[–-]\s*(\d{1,3}))?\s*(?:min|minute)/i);
    if (m) {
      const lo = Number(m[1]);
      const hi = m[2] ? Number(m[2]) : lo;
      if (ctx.duration < lo || ctx.duration > hi) {
        review.push({ kind: 'metadata-mismatch', detail: `The text said "${value}" but the lesson's stored duration is ${ctx.duration} minutes (the stored value is what the page shows).` });
      }
    }
  }
  if ((key === 'lesson' || key === 'lesson number') && ctx.positionInModule && ctx.moduleLessonCount) {
    const m = value.match(/(\d{1,2})\s*(?:of|\/)\s*(\d{1,2})/i);
    if (m && (Number(m[1]) !== ctx.positionInModule || Number(m[2]) !== ctx.moduleLessonCount)) {
      review.push({ kind: 'metadata-mismatch', detail: `The text said "Lesson ${m[1]} of ${m[2]}" but this is lesson ${ctx.positionInModule} of ${ctx.moduleLessonCount} in its module.` });
    }
  }
}

/** Moves every heading up (negative) or down (positive), never past H1..H6. */
export function shiftHeadings(lines: string[], delta: number, from = 0, to = lines.length): string[] {
  if (delta === 0) return lines;
  const heads = findHeadings(lines);
  const out = [...lines];
  for (const h of heads) {
    if (h.line < from || h.line >= to) continue;
    out[h.line] = '#'.repeat(Math.max(1, Math.min(6, h.level + delta))) + ' ' + h.text;
  }
  return out;
}

// ─── B. Objectives ──────────────────────────────────────────────────────────

const PRIMARY_OBJ = /^(?:learning |lesson )?(?:objectives?|goals?)\b/;
const SECONDARY_OBJ = /^(?:what you(?:'|)ll learn|by the end of (?:this|the) lesson|you will learn|today you will learn)\b/;
const LEAD_IN = /^(?:by the end of (?:this|the) lesson|after (?:this|the) lesson|in this lesson|at the end of (?:this|the) lesson)[^.]{0,120}[:.]?$|^(?:students|learners|you) (?:will|should) be able to[^.]{0,60}:?$|^(?:you(?:'|)ll learn|in this lesson you(?:'|)ll)[^.]{0,80}:?$/i;

function dedupeObjectives(
  lines: string[],
  objectives: string[],
  changes: ChangeRecord[],
  review: ReviewRecord[],
): { lines: string[]; objectives: string[] } {
  const heads = findHeadings(lines);
  const cuts: Cut[] = [];
  let result = objectives;

  heads.forEach((h, idx) => {
    if (h.level < 2 || h.level > 4) return;
    const key = headingKey(h.text);
    const primary = PRIMARY_OBJ.test(key);
    const secondary = !primary && SECONDARY_OBJ.test(key);
    if (!primary && !secondary) return;

    const range = sectionRange(lines, heads, idx);
    const body = parseList(lines, h.line + 1, range.end);
    const prose = body.otherLines.filter((o) => !isDivider(o.text));
    const lead = prose.filter((o) => LEAD_IN.test(normalizeQuotes(o.text.trim())));
    const extra = prose.filter((o) => !LEAD_IN.test(normalizeQuotes(o.text.trim())));
    if (body.items.length === 0) return;
    if (extra.length > 0) {
      review.push({ kind: 'objectives-ambiguous', detail: `"${h.text}" contains text besides a list of objectives; left in place.`, excerpt: excerpt(extra[0].text) });
      return;
    }
    void lead;

    const items = body.items.map((it) => it.text);
    const removedText = excerpt(lines.slice(h.line, range.end).join('\n'), 600);
    const remove = (detail: string, kind: ChangeRecord['kind'] = 'objectives-removed') => {
      cuts.push({ start: h.line, end: range.end });
      changes.push({ kind, detail, excerpt: removedText });
    };

    if (result.length === 0 && primary) {
      result = items;
      remove(`Moved the objectives from "${h.text}" into the structured objectives (there were none).`, 'objectives-merged');
      return;
    }

    const sameLength = items.length === result.length;
    const exact = sameLength && items.every((it, i) => comparable(it) === comparable(result[i]));
    const sims = items.map((it) => Math.max(0, ...result.map((r) => textSimilarity(it, r))));
    // The same objectives in the same order, merely reworded: positional pairs share their subject.
    const pairSims = sameLength ? items.map((it, i) => textSimilarity(it, result[i])) : [];
    const aligned = sameLength && pairSims.every((v) => v >= 0.12) && pairSims.reduce((a, b) => a + b, 0) / items.length >= 0.35;
    // Every item of the body list has a counterpart in the structured list.
    const covered = sims.every((v) => v >= 0.3);

    if (exact) return remove(`Removed "${h.text}": identical to the structured objectives.`);
    if (aligned) return remove(`Removed "${h.text}": the same ${items.length} objectives, reworded.`);
    if (covered) return remove(`Removed "${h.text}": every item is already covered by the structured objectives.`);

    if (primary) {
      const meanBest = sims.reduce((a, b) => a + b, 0) / sims.length;
      if (result.length > 0 && meanBest < 0.15) {
        review.push({ kind: 'objectives-ambiguous', detail: `"${h.text}" does not resemble the structured objectives; left in place.`, excerpt: excerpt(items.join(' / ')) });
        return;
      }
      // The body list has detail the structured list lacks: keep the union.
      const bodyTokens = items.flatMap((it) => contentTokens(it));
      // A structured item is dropped when some body item restates it, or when the body
      // items together cover it (an umbrella such as "use selectors, colors and fonts").
      const keep = result.filter((r) => Math.max(0, ...items.map((it) => textSimilarity(r, it))) < 0.3 && containment(contentTokens(r), bodyTokens) < 0.55);
      const merged = [...items, ...keep];
      result = merged;
      remove(`Merged "${h.text}" into the structured objectives (${items.length} from the text + ${keep.length} that it did not cover) and removed it from the body.`, 'objectives-merged');
      return;
    }

    // A "What you'll learn" preview that is not just the objectives again: keep it.
    const mean = sims.reduce((a, b) => a + b, 0) / sims.length;
    if (mean >= 0.3) {
      review.push({ kind: 'objectives-ambiguous', detail: `"${h.text}" partly overlaps the structured objectives; left in place.`, excerpt: excerpt(items.join(' / ')) });
    }
  });

  return { lines: applyCuts(lines, cuts), objectives: result };
}

// ─── C. Homework ────────────────────────────────────────────────────────────

const HOMEWORK_HEADING = /\b(?:homework|take[- ]home|assignment)\b/;

/** Does the document, starting at `from`, repeat `hw` line for line? Returns the end (exclusive). */
function matchHomeworkAt(lines: string[], from: number, hwLines: string[]): number | null {
  let i = from;
  for (const want of hwLines) {
    while (i < lines.length && (isBlank(lines[i]) || isDivider(lines[i]))) i++;
    if (i >= lines.length) return null;
    const got = lines[i];
    if (comparable(got) !== comparable(want) && textSimilarity(got, want) < 0.92) return null;
    i++;
  }
  return i;
}

function dedupeHomework(
  lines: string[],
  homework: string | null,
  changes: ChangeRecord[],
  review: ReviewRecord[],
): string[] {
  if (!homework || homework.trim() === '') return lines;
  const hwLines = toLines(homework).filter((l) => !isBlank(l) && !isDivider(l));
  if (hwLines.length === 0) return lines;
  const heads = findHeadings(lines);
  const cuts: Cut[] = [];
  const hwTokens = contentTokens(homework);

  heads.forEach((h, idx) => {
    if (h.level < 2 || h.level > 3) return;
    if (!HOMEWORK_HEADING.test(headingKey(h.text))) return;
    const sec = sectionRange(lines, heads, idx);

    // 1. Verbatim: the homework text, line for line, right under the heading.
    const end = matchHomeworkAt(lines, h.line + 1, hwLines);
    if (end !== null) {
      let stop = end;
      while (stop < lines.length && isBlank(lines[stop])) stop++;
      // Anything else left inside this section means the heading carries more than the homework.
      const leftover = lines.slice(end, sec.end).filter((l) => !isBlank(l) && !isDivider(l));
      if (leftover.length === 0 || end >= sec.end) {
        cuts.push({ start: h.line, end });
        changes.push({ kind: 'homework-removed', detail: `Removed "${h.text}": a verbatim copy of the structured homework.`, excerpt: excerpt(lines.slice(h.line, end).join('\n'), 600) });
      } else {
        review.push({ kind: 'homework-ambiguous', detail: `"${h.text}" repeats the homework but also contains other text; left in place.`, excerpt: excerpt(leftover[0]) });
      }
      return;
    }

    // 2. A reformatted copy of the same text.
    const body = lines.slice(h.line + 1, sec.end).join('\n');
    const bodyTokens = contentTokens(body);
    const sim = jaccard(hwTokens, bodyTokens);
    if (sim >= 0.85 && containment(hwTokens, bodyTokens) >= 0.9) {
      cuts.push({ start: h.line, end: sec.end });
      changes.push({ kind: 'homework-removed', detail: `Removed "${h.text}": a reformatted copy of the structured homework.`, excerpt: excerpt(lines.slice(h.line, sec.end).join('\n'), 600) });
    } else if (sim >= 0.5) {
      review.push({ kind: 'homework-ambiguous', detail: `"${h.text}" resembles the structured homework but is not a copy; left in place.`, excerpt: excerpt(body) });
    }
  });

  return applyCuts(lines, cuts);
}

// ─── E. Teacher-only sections ───────────────────────────────────────────────

const TEACHER_SUFFIX =
  '(?:guided|led|notes?|guide|guidance|tips?|script|walkthrough|prep|preparation|only|resources?|checklist|reminders?|cues?|solutions?|answers?)';
const TEACHER_HEADINGS: RegExp[] = [
  new RegExp(`^(?:instructor|teacher|facilitator|educator)[\\s-]*${TEACHER_SUFFIX}\\b`),
  /^(?:notes?|tips?|guide|guidance|prompts?|script)\s+(?:for|to)\s+(?:the\s+)?(?:instructors?|teachers?|facilitators?|educators?)\b/,
  /^(?:teaching|facilitation|classroom management)\s+(?:notes?|tips?|guide|plan)\b/,
  /^(?:suggested|sample|model|teacher)\s+(?:answers?|solutions?|responses?)\b/,
  /^answer\s*keys?\b/,
];
const TEACHER_VOICE = /^(?:walk through|show (?:the )?(?:students|class)|have (?:the )?(?:students|everyone|class)|ask (?:the )?(?:students|class)|tell (?:the )?(?:students|class)|remind (?:the )?(?:students|class)|demonstrate (?:to|for))\b/i;

function moveTeacherSections(
  lines: string[],
  changes: ChangeRecord[],
  review: ReviewRecord[],
): { lines: string[]; chunks: { title: string; text: string }[] } {
  const heads = findHeadings(lines);
  const cuts: Cut[] = [];
  const chunks: { title: string; text: string }[] = [];
  const claimed: { start: number; end: number }[] = [];

  heads.forEach((h, idx) => {
    if (h.level < 2 || h.level > 4) return;
    const range = sectionRange(lines, heads, idx);
    if (claimed.some((c) => h.line >= c.start && h.line < c.end)) return;
    const key = headingKey(h.text);
    if (TEACHER_HEADINGS.some((re) => re.test(key))) {
      claimed.push(range);
      cuts.push({ start: h.line, end: range.end });
      const text = lines.slice(h.line + 1, range.end).join('\n').trim();
      chunks.push({ title: stripLeadingEmoji(h.text), text });
      changes.push({ kind: 'teacher-section-moved', detail: `Moved "${h.text}" to the teacher-only notes.`, excerpt: excerpt(text) });
      return;
    }
    const firstProse = lines.slice(h.line + 1, range.end).find((l) => !isBlank(l));
    if (firstProse && TEACHER_VOICE.test(firstProse.trim())) {
      review.push({ kind: 'teacher-section-ambiguous', detail: `"${h.text}" begins with an instruction to the teacher but is not marked as teacher material; left in place.`, excerpt: excerpt(firstProse) });
    }
  });

  return { lines: applyCuts(lines, cuts), chunks };
}

// ─── F. Heading hierarchy ───────────────────────────────────────────────────

function normalizeHeadings(lines: string[], changes: ChangeRecord[]): string[] {
  let out = lines;
  const before = out.join('\n');

  // Stray H1s (the lesson title is already the page's H1).
  for (let guard = 0; guard < 12; guard++) {
    const heads = findHeadings(out);
    const k = heads.findIndex((h) => h.level === 1);
    if (k === -1) break;
    const h1 = heads[k];
    const prev = heads[k - 1];
    const sectionEnd = (() => {
      for (let n = k + 1; n < heads.length; n++) if (heads[n].level === 1) return heads[n].line;
      return out.length;
    })();
    const prevBodyEmpty = prev && out.slice(prev.line + 1, h1.line).every((l) => isBlank(l) || isDivider(l));
    const restatesPrev =
      prev && prev.level === 2 && prevBodyEmpty && (textSimilarity(stripTitlePrefixes(h1.text).replace(/\b(?:lesson|course)\s*\d+\b/gi, ''), prev.text) >= 0.3 || comparable(h1.text).replace(/\b(?:lesson|course)\s*\d+\b/g, '').includes(comparable(prev.text)) || comparable(prev.text).includes(comparable(h1.text).replace(/\b(?:lesson|course)\s*\d+\b/g, '').trim()));
    if (restatesPrev) {
      // "## Activities" + "# Lesson 1 Activities": drop the repeat, nest what follows under the first.
      const nextContainer = heads.slice(k + 1).find((h, n, arr) => h.level === 2 && out.slice(h.line + 1, (arr[n + 1] ?? { line: out.length }).line).every((l) => isBlank(l) || isDivider(l)) && arr[n + 1]?.level === 1);
      const spanEnd = Math.min(sectionEnd, nextContainer ? nextContainer.line : out.length);
      out = shiftHeadings(out, 1, h1.line + 1, spanEnd);
      out = applyCuts(out, [{ start: h1.line, end: h1.line + 1 }]);
    } else {
      out = shiftHeadings(out, 1, h1.line, sectionEnd);
    }
  }

  // The first heading level should be H2, and levels must not skip.
  const heads = findHeadings(out);
  if (heads.length > 0) {
    const min = Math.min(...heads.map((h) => h.level));
    if (min > 2) out = shiftHeadings(out, 2 - min);
  }
  const fixed = findHeadings(out);
  let prev = 1;
  const rewrite = [...out];
  for (const h of fixed) {
    const lvl = Math.min(h.level, prev + 1);
    if (lvl !== h.level) rewrite[h.line] = '#'.repeat(lvl) + ' ' + h.text;
    prev = lvl;
  }
  out = rewrite;

  if (out.join('\n') !== before) changes.push({ kind: 'heading-relevelled', detail: 'Normalised the heading hierarchy (one page title, then H2 sections with properly nested H3/H4).' });
  return out;
}

// ─── The orchestrator ───────────────────────────────────────────────────────

const stripLeadH1 = (md: string): string => {
  const lines = toLines(md);
  const first = lines.findIndex((l) => !isBlank(l));
  if (first !== -1 && /^ {0,3}#\s+\S/.test(lines[first])) return applyCuts(lines, [{ start: first, end: first + 1 }]).join('\n');
  return md;
};

/** Source-derived quiz questions for a lesson that has no quiz text at all. */
function quizFromSource(ctx: LessonContext): QuizQuestion[] {
  const out: QuizQuestion[] = [];
  for (const sq of ctx.sourceQuiz ?? []) {
    const prompt = sq.questionText?.trim();
    if (!prompt) continue;
    if (sq.options && sq.options.length >= 2 && Number.isInteger(sq.correctIndex) && (sq.correctIndex as number) >= 0 && (sq.correctIndex as number) < sq.options.length) {
      out.push({ id: '', type: 'multiple_choice', prompt, options: sq.options, correctIndex: sq.correctIndex as number, source: 'json' } as ChoiceQuestion);
    } else if (sq.correctAnswerText) {
      out.push({ id: '', type: 'self_check', prompt, sampleAnswer: sq.correctAnswerText, source: 'json' } as SelfCheckQuestion);
    }
  }
  return out.map((q, i) => ({ ...q, id: `q${i + 1}` }) as QuizQuestion);
}

export function cleanLesson(input: LessonContentFields, ctx: LessonContext = {}): CleanResult {
  const changes: ChangeRecord[] = [];
  const review: ReviewRecord[] = [];

  let title = input.title;
  let objectives = [...input.objectives];
  let homework = input.homework;
  let miniQuiz = input.miniQuiz;
  let teacherNotes = input.teacherNotes;
  let lines = input.contentMarkdown === null ? [] : toLines(input.contentMarkdown);
  const teacherChunks: { title: string; text: string }[] = [];

  if (input.contentMarkdown !== null) {
    // A. leading banner / wrapper heading / metadata
    const banner = stripBanner(lines, title, ctx, changes, review);
    lines = banner.lines;
    if (banner.derivedTitle) {
      changes.push({ kind: 'title-derived', detail: `Titled from the lesson's own topic heading: "${banner.derivedTitle}" (was "${title}").` });
      title = banner.derivedTitle;
    }

    // B. objectives
    const o = dedupeObjectives(lines, objectives, changes, review);
    lines = o.lines;
    objectives = o.objectives;

    // C. homework
    lines = dedupeHomework(lines, homework, changes, review);

    // D. quizzes
    const q = extractQuiz(lines, { mode: miniQuiz === null ? 'extract' : 'secure-only', sourceQuiz: ctx.sourceQuiz });
    lines = q.lines;
    changes.push(...q.changes);
    review.push(...q.review);
    teacherChunks.push(...q.teacherChunks);
    if (miniQuiz === null && q.questions.length > 0) miniQuiz = q.questions;

    // E. teacher-only sections
    const t = moveTeacherSections(lines, changes, review);
    lines = t.lines;
    teacherChunks.push(...t.chunks);

    // F. heading hierarchy
    lines = normalizeHeadings(lines, changes);
  }

  // A lesson with a structured quiz in the source data but no quiz text at all.
  if (miniQuiz === null) {
    const fromSource = quizFromSource(ctx);
    if (fromSource.length > 0) {
      miniQuiz = fromSource;
      changes.push({ kind: 'quiz-extracted', detail: `Added ${fromSource.length} question(s) from the structured source quiz.` });
    }
  }

  // The title: strip prefixes; a generic title that could not be derived is reported.
  const cleaned = cleanLessonTitle(title, ctx);
  if (!cleaned.generic && cleaned.title !== title) {
    changes.push({ kind: 'title-cleaned', detail: `"${title}" → "${cleaned.title}"` });
    title = cleaned.title;
  } else if (cleaned.generic) {
    review.push({ kind: 'title-generic', detail: `The title "${title}" names no topic and no topic heading was found to derive one from.` });
  }

  // Teacher-only notes: source guide (first time only) + everything moved out of the body.
  if (teacherNotes === null && ctx.sourceTeacherNotes && ctx.sourceTeacherNotes.trim() !== '') {
    teacherNotes = stripLeadH1(ctx.sourceTeacherNotes).trim();
    changes.push({ kind: 'teacher-notes-attached', detail: `Attached the ${teacherNotes.length}-character instructor guide from the source curriculum.` });
  }
  if (teacherChunks.length > 0) {
    const extra = teacherChunks
      .filter((c) => c.text !== '')
      .map((c) => `## ${c.title}\n\n${c.text}`)
      .join('\n\n');
    if (extra) teacherNotes = [teacherNotes ?? '', extra].filter((x) => x.trim() !== '').join('\n\n');
  }

  // G. "Lesson N" → lineage links, in every Markdown field.
  let contentMarkdown = input.contentMarkdown === null ? null : lines.join('\n');
  const link = (md: string | null): string | null => {
    if (!md || !ctx.lineageModule || !ctx.moduleLessonCount) return md;
    const r = linkLessonReferences(md, { lineageModule: ctx.lineageModule, moduleLessonCount: ctx.moduleLessonCount, selfPosition: ctx.positionInModule });
    if (r.linked > 0) changes.push({ kind: 'refs-linked', detail: `Linked ${r.linked} reference(s) to other lessons.` });
    review.push(...r.review);
    return r.markdown;
  };
  contentMarkdown = link(contentMarkdown);
  homework = link(homework);
  teacherNotes = link(teacherNotes);

  const fields: LessonContentFields = {
    title,
    objectives,
    contentMarkdown,
    homework,
    teacherNotes,
    miniQuiz,
    visuals: input.visuals,
  };
  const changed =
    fields.title !== input.title ||
    JSON.stringify(fields.objectives) !== JSON.stringify(input.objectives) ||
    fields.contentMarkdown !== input.contentMarkdown ||
    fields.homework !== input.homework ||
    fields.teacherNotes !== input.teacherNotes ||
    JSON.stringify(fields.miniQuiz) !== JSON.stringify(input.miniQuiz);

  return { fields, changed, changes, review };
}
