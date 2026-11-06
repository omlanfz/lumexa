// FILE PATH: server/src/curriculum/lesson-content/quiz-mcq.ts
//
// THE RULE: every quiz question is a multiple-choice question with exactly four options.
//
// This module brings older questions up to it. Quizzes extracted from lesson text and
// quizzes stored by the first release contained true/false, ordering, matching,
// "write your answer" (self-check) and reflection questions, and multiple-choice
// questions with the wrong number of options. conformQuiz() turns each into a
// four-option multiple-choice question, in this order of preference:
//
//   1. already conforming            -> kept exactly as it is (an admin's edit is never touched);
//   2. an authored rewrite           -> a hand-written question with one right answer and three
//                                       plausible wrong ones (see catalog/mcq-*.ts), found by the
//                                       start of the ORIGINAL question's text;
//   3. the lesson's authored quiz    -> for a question we authored ourselves, the same question id
//                                       in the catalog's current version;
//   4. a derived conversion          -> ordering ("which order is right?") and matching ("which pair
//                                       is right?") need no new facts; an over-long list of options
//                                       is trimmed to the right answer plus three wrong ones;
//   5. a repeat                      -> the same statement written twice ("True or False: …") is not kept twice;
//   6. otherwise                     -> the question cannot be asked as multiple choice without
//                                       inventing answers. It is NOT kept in the quiz and NOT lost:
//                                       it is returned as `leftover` so the caller can keep it for
//                                       the teacher as a discussion prompt, and it is reported.

import { isConformingQuestion, normalizeQuiz } from './quiz';
import { comparable, hash32, seededRandom, stripInlineMarkdown } from './text';
import { MCQ_OPTION_COUNT, type ChangeRecord, type McqQuestion, type ReviewRecord } from './types';

// ─── Authored rewrites ───────────────────────────────────────────────────────

export interface McqRewrite {
  /**
   * The start of the ORIGINAL question's text. Compared without punctuation, spacing, code ticks or case —
   * so it must be specific enough to match one question of the lesson only (a coverage test enforces that).
   */
  from: string;
  /** The question to ask. Omit to keep the original wording. */
  prompt?: string;
  /** The four answers: the RIGHT one first, then three plausible wrong ones. */
  options: [string, string, string, string];
  /** Shown to the learner right after they answer. */
  explanation: string;
  /** A snippet to show with the question (e.g. "what does this print?"). */
  code?: { language: string; code: string };
}

type RewriteSource = Record<string, McqRewrite[]>;
const BY_LINEAGE: RewriteSource[] = [];
const BY_TITLE: RewriteSource = {};

/** Rewrites for lessons identified by lineage key ("<module-slug>/<position>"). */
export function registerMcqRewrites(source: RewriteSource): void {
  BY_LINEAGE.push(source);
}

/** Rewrites for redesigned custom lessons that have no lineage — matched by lesson title. */
export function registerMcqRewritesByTitle(source: RewriteSource): void {
  for (const [k, v] of Object.entries(source)) BY_TITLE[k.trim().toLowerCase()] = v;
}

export function mcqRewritesFor(lineage: string | null, title: string): McqRewrite[] {
  const byTitle = BY_TITLE[title.trim().toLowerCase()];
  if (byTitle) return byTitle;
  if (!lineage) return [];
  return BY_LINEAGE.flatMap((s) => s[lineage] ?? []);
}

export function mcqRewriteKeys(): { lineages: string[]; titles: string[] } {
  return { lineages: [...new Set(BY_LINEAGE.flatMap((s) => Object.keys(s)))], titles: Object.keys(BY_TITLE) };
}

// ─── Conversion ──────────────────────────────────────────────────────────────

export interface ConformContext {
  lineage: string | null;
  title: string;
  /** The lesson's authored quiz (catalog), used for questions we wrote ourselves. */
  authored?: McqQuestion[] | null;
}

export interface Leftover {
  prompt: string;
  /** The kind of question it was ("self_check", "true_false", …). */
  kind: string;
}

export interface ConformResult {
  quiz: McqQuestion[];
  changed: boolean;
  changes: ChangeRecord[];
  review: ReviewRecord[];
  leftover: Leftover[];
  /** Authored rewrites for this lesson that matched none of its questions (a coverage check reads this). */
  unusedRewrites: string[];
  /** Questions dropped because the same question had already been asked (see `asked` below). */
  duplicates: number;
}

type Loose = Record<string, unknown>;

/** JSON with sorted keys, so two copies of a quiz compare equal however a database ordered their keys. */
const stable = (v: unknown): string =>
  JSON.stringify(v, (_k, val) => (val && typeof val === 'object' && !Array.isArray(val) ? Object.fromEntries(Object.entries(val).sort(([a], [b]) => (a < b ? -1 : 1))) : val));

const text = (v: unknown): string => (typeof v === 'string' ? v : '');
/**
 * The text with nothing but letters and digits left, so a rewrite is found whatever punctuation, spacing,
 * code ticks or Markdown emphasis (`fuel_level` vs fuel level) the question happens to carry.
 */
export const squash = (s: string): string => comparable(s).replace(/\s+/g, '');
const plain = (s: string): string => stripInlineMarkdown(s).replace(/\s+/g, ' ').trim();

/** Puts the right answer (given first) at a spot that depends on the question, not always first. */
function place(correctFirst: string[], seed: string): { options: string[]; correctIndex: number } {
  const at = hash32(`mcq:${seed}`) % MCQ_OPTION_COUNT;
  const options: string[] = new Array(MCQ_OPTION_COUNT);
  options[at] = correctFirst[0];
  let k = 1;
  for (let i = 0; i < MCQ_OPTION_COUNT; i++) if (i !== at) options[i] = correctFirst[k++];
  return { options, correctIndex: at };
}

/** A four-option multiple-choice question from its answers, the RIGHT one first (placed deterministically). */
export function buildMcq(
  id: string,
  prompt: string,
  optionsRightFirst: [string, string, string, string],
  explanation: string,
  extra: { code?: { language: string; code: string }; source?: McqQuestion['source'] } = {},
): McqQuestion {
  const { options, correctIndex } = place([...optionsRightFirst], comparable(prompt));
  return {
    id,
    type: 'multiple_choice',
    prompt,
    explanation,
    source: extra.source ?? 'authored',
    ...(extra.code ? { code: extra.code } : {}),
    options,
    correctIndex,
  };
}

function fromRewrite(r: McqRewrite, id: string, originalPrompt: string): McqQuestion {
  return buildMcq(id, r.prompt ?? originalPrompt, r.options, r.explanation, { code: r.code });
}

/** "Which order is right?" — the right order and three different shuffles of it. */
function fromOrdering(q: Loose, id: string): McqQuestion | null {
  const items = (Array.isArray(q.items) ? q.items : []).map((x) => plain(text(x))).filter(Boolean);
  if (items.length < 3 || items.length > 6) return null;
  const rand = seededRandom(hash32(`order:${comparable(text(q.prompt))}`));
  const seen = new Set<string>([items.join(' → ')]);
  const wrong: string[] = [];
  for (let attempt = 0; attempt < 60 && wrong.length < 3; attempt++) {
    const p = [...items];
    for (let i = p.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    const s = p.join(' → ');
    if (!seen.has(s)) {
      seen.add(s);
      wrong.push(s);
    }
  }
  if (wrong.length < 3) return null;
  const correct = items.join(' → ');
  if ([correct, ...wrong].some((o) => o.length > 400)) return null;
  const { options, correctIndex } = place([correct, ...wrong], text(q.prompt));
  return {
    id,
    type: 'multiple_choice',
    prompt: `${text(q.prompt).trim()}\n\nWhich of these shows the correct order?`,
    ...(text(q.explanation) ? { explanation: text(q.explanation) } : {}),
    source: 'derived',
    options,
    correctIndex,
  };
}

/** "Which pairing is right?" — one real pair and three crossed-over pairs. */
function fromMatching(q: Loose, id: string): McqQuestion | null {
  const pairs = (Array.isArray(q.pairs) ? q.pairs : [])
    .map((p) => ({ left: plain(text((p as Loose)?.left)), right: plain(text((p as Loose)?.right)) }))
    .filter((p) => p.left && p.right);
  if (pairs.length < 3) return null;
  const k = hash32(`match:${comparable(text(q.prompt))}`) % pairs.length;
  const fmt = (l: string, r: string) => `${l} → ${r}`;
  const wrong: string[] = [];
  for (let j = 0; j < pairs.length && wrong.length < 3; j++) if (j !== k) wrong.push(fmt(pairs[k].left, pairs[j].right));
  for (let j = 0; j < pairs.length && wrong.length < 3; j++) if (j !== k) wrong.push(fmt(pairs[j].left, pairs[k].right));
  if (wrong.length < 3) return null;
  const { options, correctIndex } = place([fmt(pairs[k].left, pairs[k].right), ...wrong.slice(0, 3)], text(q.prompt));
  return {
    id,
    type: 'multiple_choice',
    prompt: `${text(q.prompt).trim()}\n\nWhich of these pairings is correct?`,
    ...(text(q.explanation) ? { explanation: text(q.explanation) } : {}),
    source: 'derived',
    options,
    correctIndex,
  };
}

/** A multiple-choice question with more than four options: keep the right one and three wrong ones. */
function trimmed(q: Loose, id: string): McqQuestion | null {
  const options = (Array.isArray(q.options) ? q.options : []).map((o) => text(o).trim());
  const ci = Number(q.correctIndex);
  if (options.length <= MCQ_OPTION_COUNT || !Number.isInteger(ci) || ci < 0 || ci >= options.length) return null;
  // "All of the above" and friends only make sense next to the options they refer to.
  if (options.some((o) => /\b(?:all|none|both|neither)\s+of\s+the\s+above\b/i.test(o))) return null;
  const keep = [options[ci], ...options.filter((_, i) => i !== ci).slice(0, MCQ_OPTION_COUNT - 1)];
  if (new Set(keep).size !== MCQ_OPTION_COUNT || keep.some((o) => !o)) return null;
  const { options: placed, correctIndex } = place(keep, text(q.prompt));
  const v = normalizeQuiz([{ ...q, id, type: 'multiple_choice', options: placed, correctIndex, source: 'derived' }]);
  return v.quiz[0] ?? null;
}

/**
 * Brings a stored / extracted quiz up to the rule. Never throws; never drops a question
 * silently (what cannot be converted is returned in `leftover`).
 */
export function conformQuiz(raw: unknown, ctx: ConformContext): ConformResult {
  const list: unknown[] = Array.isArray(raw) ? raw : [];
  const rewrites = mcqRewritesFor(ctx.lineage, ctx.title).map((r) => ({ r, key: squash(r.from), used: false }));
  const out: McqQuestion[] = [];
  const leftover: Leftover[] = [];
  const how = { rewritten: 0, authored: 0, derived: 0, kept: 0, duplicates: 0 };
  /** What has already been asked, so the same statement written twice ("True or False: …") is not kept twice. */
  const asked = new Set<string>();
  const askedKey = (prompt: string) => comparable(prompt.replace(/^\s*true\s+or\s+false\s*[:\-–—]?\s*/i, ''));
  /** The same question again — word for word, or cut short (the source repeats some questions truncated). */
  const isRepeat = (k: string) => k.length >= 20 && [...asked].some((a) => a === k || a.startsWith(k) || k.startsWith(a));

  list.forEach((item, i) => {
    const q = (item && typeof item === 'object' ? item : {}) as Loose;
    const id = text(q.id) || `q${i + 1}`;
    const prompt = text(q.prompt);

    // 1. Already conforming (a code-output / code-error question with four options just becomes multiple choice).
    const retyped = q.type === 'code_output' || q.type === 'code_error' ? { ...q, type: 'multiple_choice' } : q;
    if (isConformingQuestion(retyped)) {
      out.push(normalizeQuiz([retyped]).quiz[0]);
      asked.add(askedKey(prompt));
      how.kept++;
      return;
    }

    // 2. An authored rewrite, found by the start of the original text.
    const key = comparable(prompt);
    const squashed = squash(prompt);
    const hit = key ? rewrites.find((w) => !w.used && w.key !== '' && squashed.startsWith(w.key)) : undefined;
    if (hit) {
      hit.used = true;
      out.push(fromRewrite(hit.r, `${id}m`, prompt));
      asked.add(askedKey(prompt));
      how.rewritten++;
      return;
    }

    // 3. The catalog's current version of a question we authored ourselves.
    if (q.source === 'authored') {
      const a = ctx.authored?.find((x) => x.id === id);
      if (a) {
        out.push({ ...a, id: `${id}m` });
        asked.add(askedKey(prompt));
        how.authored++;
        return;
      }
    }

    // 4. Derived conversions that need no new facts.
    const derived = q.type === 'ordering' ? fromOrdering(q, `${id}m`) : q.type === 'matching' ? fromMatching(q, `${id}m`) : q.type === 'multiple_choice' ? trimmed(q, `${id}m`) : null;
    if (derived) {
      out.push(derived);
      asked.add(askedKey(prompt));
      how.derived++;
      return;
    }

    // 5. The same statement was already asked (the source repeats some as "True or False: …"): nothing to keep.
    if (key && isRepeat(askedKey(prompt))) {
      how.duplicates++;
      return;
    }

    // 6. Cannot be multiple choice without inventing answers: keep it for the teacher.
    leftover.push({ prompt: plain(prompt) || '(no text)', kind: text(q.type) || 'unknown' });
  });

  const converted = how.rewritten + how.authored + how.derived;
  const changes: ChangeRecord[] = [];
  const review: ReviewRecord[] = [];
  if (converted > 0) {
    changes.push({
      kind: 'quiz-converted',
      detail: `Converted ${converted} quiz question${converted === 1 ? '' : 's'} to four-option multiple choice (${how.rewritten + how.authored} rewritten, ${how.derived} derived).`,
    });
  }
  if (how.duplicates > 0) {
    changes.push({
      kind: 'quiz-converted',
      detail: `Removed ${how.duplicates} repeated quiz question${how.duplicates === 1 ? '' : 's'} (the same statement was already asked).`,
    });
  }
  if (leftover.length > 0) {
    review.push({
      kind: 'quiz-needs-rewrite',
      detail: `${leftover.length} quiz question${leftover.length === 1 ? '' : 's'} could not be asked as multiple choice and ${leftover.length === 1 ? 'was' : 'were'} moved to the teacher notes as discussion prompts: ${leftover.map((l) => `"${l.prompt.slice(0, 70)}"`).join('; ')}`,
    });
  }
  const changed = out.length !== list.length || leftover.length > 0 || converted > 0 || stable(out) !== stable(list);
  return { quiz: out, changed, changes, review, leftover, unusedRewrites: rewrites.filter((w) => !w.used).map((w) => w.r.from), duplicates: how.duplicates };
}

/** The teacher-notes section that keeps the questions that were not turned into multiple choice. */
export const DISCUSSION_HEADING = 'Discussion questions (not in the student quiz)';

export function discussionSection(leftover: Leftover[]): string {
  const lines = leftover.map((l) => `- ${l.prompt}`);
  return `## ${DISCUSSION_HEADING}\n\nThe student quiz is multiple choice only. These were written as open-ended questions, so they are kept here as prompts you can ask aloud.\n\n${lines.join('\n')}`;
}
