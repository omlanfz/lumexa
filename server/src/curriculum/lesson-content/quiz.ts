// FILE PATH: server/src/curriculum/lesson-content/quiz.ts
//
// Mini Quiz runtime: shaping questions for learners (no answers, no
// explanations), grading submitted answers deterministically, and validating
// authored quizzes. This is a separate system from the assessment / question-bank
// / test machinery and shares nothing with it.
//
// Answer secrecy:
//   * toPublicQuiz() never includes a correct answer, an explanation or a sample
//     answer — only what is needed to render and answer the question.
//   * Option / item ids are opaque hashes, not positions, so neither the id nor
//     the display order says anything about which answer is right. (The source
//     content puts the right answer at "b" in the large majority of questions,
//     so authored order is shuffled — deterministically, so the teacher sharing
//     the page and a student studying later see the very same order.)
//   * gradeAnswer() reveals the correct answer and the explanation only in
//     response to a submitted answer.

import {
  CHOICE_TYPES,
  QUIZ_QUESTION_TYPES,
  type ChoiceQuestion,
  type ChoiceQuestionType,
  type MatchingQuestion,
  type OrderingQuestion,
  type PublicOption,
  type PublicQuizQuestion,
  type QuizAnswer,
  type QuizCheckResult,
  type QuizQuestion,
  type ReflectionQuestion,
  type SelfCheckQuestion,
} from './types';
import { hash32, seededRandom } from './text';

const SALT = 'lumexa-mini-quiz-v1';

export function optionId(questionId: string, index: number): string {
  return 'o' + hash32(`${SALT}:opt:${questionId}:${index}`).toString(36);
}
function itemId(questionId: string, index: number): string {
  return 'i' + hash32(`${SALT}:item:${questionId}:${index}`).toString(36);
}
function leftId(questionId: string, index: number): string {
  return 'l' + hash32(`${SALT}:left:${questionId}:${index}`).toString(36);
}
function rightId(questionId: string, index: number): string {
  return 'r' + hash32(`${SALT}:right:${questionId}:${index}`).toString(36);
}

export class QuizAnswerError extends Error {}

/** Options that refer to one another ("All of the above", "a and b") must not move. */
export function hasFixedOrder(q: ChoiceQuestion): boolean {
  if (q.fixedOrder !== undefined) return q.fixedOrder;
  if (q.type === 'true_false') return true;
  return q.options.some((o) =>
    /\b(?:all|none|both|neither)\s+of\s+the\s+above\b|\b(?:a|b|c|d)\s+(?:and|&|or)\s+(?:a|b|c|d)\b|^\s*[a-d]\)/i.test(o),
  );
}

/** Deterministic shuffle that is guaranteed to change a list of two or more entries. */
function shuffled<T>(items: T[], seed: string): T[] {
  if (items.length < 2) return [...items];
  const rand = seededRandom(hash32(seed));
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  if (out.every((v, i) => v === items[i])) out.push(out.shift() as T);
  return out;
}

function publicChoice(q: ChoiceQuestion, seedKey: string): PublicQuizQuestion {
  const options: PublicOption[] = q.options.map((text, i) => ({ id: optionId(q.id, i), text }));
  return {
    id: q.id,
    type: q.type,
    prompt: q.prompt,
    ...(q.code ? { code: q.code } : {}),
    options: hasFixedOrder(q) ? options : shuffled(options, `${seedKey}:${q.id}`),
  };
}

/** The learner-facing form of a quiz: nothing in it reveals an answer. */
export function toPublicQuiz(questions: QuizQuestion[] | null | undefined, seedKey: string): PublicQuizQuestion[] {
  return (questions ?? []).map((q): PublicQuizQuestion => {
    switch (q.type) {
      case 'multiple_choice':
      case 'true_false':
      case 'code_output':
      case 'code_error':
        return publicChoice(q, seedKey);
      case 'ordering': {
        const items = q.items.map((text, i) => ({ id: itemId(q.id, i), text }));
        return { id: q.id, type: 'ordering', prompt: q.prompt, items: shuffled(items, `${seedKey}:${q.id}`) };
      }
      case 'matching': {
        const left = q.pairs.map((p, i) => ({ id: leftId(q.id, i), text: p.left }));
        const right = q.pairs.map((p, i) => ({ id: rightId(q.id, i), text: p.right }));
        return {
          id: q.id,
          type: 'matching',
          prompt: q.prompt,
          left,
          right: shuffled(right, `${seedKey}:${q.id}`),
        };
      }
      case 'self_check':
        return { id: q.id, type: 'self_check', prompt: q.prompt, hasSampleAnswer: !!q.sampleAnswer };
      case 'reflection':
      default:
        return { id: q.id, type: 'reflection', prompt: q.prompt };
    }
  });
}

/** Grades one submitted answer. Throws QuizAnswerError for a malformed submission. */
export function gradeAnswer(q: QuizQuestion, answer: QuizAnswer | undefined | null): QuizCheckResult {
  switch (q.type) {
    case 'multiple_choice':
    case 'true_false':
    case 'code_output':
    case 'code_error': {
      const id = (answer as { optionId?: unknown } | null | undefined)?.optionId;
      if (typeof id !== 'string') throw new QuizAnswerError('Choose one of the options.');
      const chosen = q.options.findIndex((_, i) => optionId(q.id, i) === id);
      if (chosen === -1) throw new QuizAnswerError('That option does not belong to this question.');
      return {
        questionId: q.id,
        graded: true,
        correct: chosen === q.correctIndex,
        explanation: q.explanation,
        reveal: { optionId: optionId(q.id, q.correctIndex) },
      };
    }
    case 'ordering': {
      const order = (answer as { order?: unknown } | null | undefined)?.order;
      const expected = q.items.map((_, i) => itemId(q.id, i));
      if (!Array.isArray(order) || order.length !== expected.length || new Set(order).size !== expected.length || !order.every((x) => expected.includes(x as string))) {
        throw new QuizAnswerError('Put every step in an order.');
      }
      return {
        questionId: q.id,
        graded: true,
        correct: expected.every((id, i) => order[i] === id),
        explanation: q.explanation,
        reveal: { order: expected },
      };
    }
    case 'matching': {
      const pairs = (answer as { pairs?: unknown } | null | undefined)?.pairs;
      const n = q.pairs.length;
      const lefts = q.pairs.map((_, i) => leftId(q.id, i));
      const rights = q.pairs.map((_, i) => rightId(q.id, i));
      if (!Array.isArray(pairs) || pairs.length !== n) throw new QuizAnswerError('Match every term.');
      const seenL = new Set<string>();
      const seenR = new Set<string>();
      let all = true;
      for (const p of pairs as { leftId?: unknown; rightId?: unknown }[]) {
        const li = lefts.indexOf(p?.leftId as string);
        const ri = rights.indexOf(p?.rightId as string);
        if (li === -1 || ri === -1 || seenL.has(lefts[li]) || seenR.has(rights[ri])) {
          throw new QuizAnswerError('Match every term exactly once.');
        }
        seenL.add(lefts[li]);
        seenR.add(rights[ri]);
        if (li !== ri) all = false;
      }
      return {
        questionId: q.id,
        graded: true,
        correct: all,
        explanation: q.explanation,
        reveal: { pairs: lefts.map((l, i) => ({ leftId: l, rightId: rights[i] })) },
      };
    }
    case 'self_check': {
      // Never machine-graded: the learner commits to an answer, then compares.
      // The learner's own words stay on their device: the client only says it has answered.
      const a = (answer ?? {}) as { text?: unknown; selfRating?: unknown; answered?: unknown };
      const wrote = typeof a.text === 'string' && a.text.trim() !== '';
      if (a.answered !== true && !wrote && a.selfRating !== 'got_it' && a.selfRating !== 'review') {
        throw new QuizAnswerError('Write your answer, or say how confident you feel, first.');
      }
      return {
        questionId: q.id,
        graded: false,
        correct: null,
        explanation: q.explanation,
        ...(q.sampleAnswer ? { reveal: { sampleAnswer: q.sampleAnswer } } : {}),
      };
    }
    case 'reflection':
    default:
      return { questionId: q.id, graded: false, correct: null };
  }
}

/** Number of questions that are machine-graded (the score's denominator). */
export function gradedCount(questions: QuizQuestion[] | null | undefined): number {
  return (questions ?? []).filter((q) => q.type !== 'self_check' && q.type !== 'reflection').length;
}

// ─── Validation / normalisation of authored quizzes ────────────────────────

export interface QuizValidation {
  quiz: QuizQuestion[];
  errors: string[];
  warnings: string[];
}

const str = (v: unknown, max: number): string | null =>
  typeof v === 'string' && v.trim() !== '' && v.length <= max ? v.trim() : null;

/**
 * Coerces untrusted input (the admin editor, an import) into a clean quiz and
 * reports everything that is wrong with it. Never throws; the caller decides
 * whether `errors` blocks a save.
 */
export function normalizeQuiz(raw: unknown): QuizValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const quiz: QuizQuestion[] = [];
  if (raw === null || raw === undefined) return { quiz, errors, warnings };
  if (!Array.isArray(raw)) return { quiz, errors: ['The quiz must be a list of questions.'], warnings };
  if (raw.length > 40) errors.push('A quiz can have at most 40 questions.');

  const seen = new Set<string>();
  raw.slice(0, 40).forEach((item, idx) => {
    const label = `Question ${idx + 1}`;
    if (!item || typeof item !== 'object') {
      errors.push(`${label}: is not a question.`);
      return;
    }
    const r = item as Record<string, unknown>;
    const type = r.type as QuizQuestion['type'];
    if (!QUIZ_QUESTION_TYPES.includes(type)) {
      errors.push(`${label}: unknown question type "${String(r.type)}".`);
      return;
    }
    let id = str(r.id, 40) ?? `q${idx + 1}`;
    if (seen.has(id)) {
      errors.push(`${label}: duplicate question id "${id}".`);
      id = `${id}-${idx + 1}`;
    }
    seen.add(id);
    const prompt = str(r.prompt, 1500);
    if (!prompt) {
      errors.push(`${label}: the question text is required (up to 1500 characters).`);
      return;
    }
    const explanation = r.explanation === undefined || r.explanation === null || r.explanation === '' ? undefined : str(r.explanation, 1500);
    if (r.explanation && !explanation) errors.push(`${label}: the explanation is too long (1500 characters max).`);
    const base = {
      id,
      prompt,
      ...(explanation ? { explanation } : {}),
      ...(typeof r.fixedOrder === 'boolean' ? { fixedOrder: r.fixedOrder } : {}),
      ...(typeof r.source === 'string' && ['markdown', 'json', 'authored', 'derived'].includes(r.source)
        ? { source: r.source as QuizQuestion['source'] }
        : {}),
    };

    if ((CHOICE_TYPES as readonly string[]).includes(type)) {
      const optsRaw = Array.isArray(r.options) ? r.options : [];
      const options = optsRaw.map((o) => str(o, 400)).filter((o): o is string => !!o);
      const ci = Number(r.correctIndex);
      if (type === 'true_false') {
        if (options.length !== 2 || options[0] !== 'True' || options[1] !== 'False') {
          errors.push(`${label}: a True/False question's options must be exactly "True" and "False".`);
          return;
        }
      } else if (options.length < 2 || options.length > 6) {
        errors.push(`${label}: needs between 2 and 6 answer options.`);
        return;
      } else if (new Set(options.map((o) => o.replace(/\s+/g, ' ').trim())).size !== options.length) {
        // Exact comparison on purpose: `Header()` and `header()` are different answers in code.
        errors.push(`${label}: answer options must all be different.`);
        return;
      }
      if (!Number.isInteger(ci) || ci < 0 || ci >= options.length) {
        errors.push(`${label}: choose which option is correct.`);
        return;
      }
      let code: ChoiceQuestion['code'];
      if (r.code && typeof r.code === 'object') {
        const c = r.code as Record<string, unknown>;
        const language = str(c.language, 24) ?? 'text';
        const text = typeof c.code === 'string' && c.code.trim() !== '' && c.code.length <= 4000 ? c.code : null;
        if (!text) errors.push(`${label}: the code snippet is empty or too long (4000 characters max).`);
        else code = { language, code: text };
      }
      if ((type === 'code_output' || type === 'code_error') && !code) {
        warnings.push(`${label}: a ${type === 'code_output' ? 'code-output' : 'code-error'} question normally includes a code snippet.`);
      }
      quiz.push({ ...base, type: type as ChoiceQuestionType, options, correctIndex: ci, ...(code ? { code } : {}) } as ChoiceQuestion);
      return;
    }

    if (type === 'ordering') {
      const items = (Array.isArray(r.items) ? r.items : []).map((o) => str(o, 300)).filter((o): o is string => !!o);
      if (items.length < 2 || items.length > 8) {
        errors.push(`${label}: an ordering question needs between 2 and 8 steps.`);
        return;
      }
      quiz.push({ ...base, type: 'ordering', items } as OrderingQuestion);
      return;
    }

    if (type === 'matching') {
      const pairs = (Array.isArray(r.pairs) ? r.pairs : [])
        .map((p) => {
          const o = (p ?? {}) as Record<string, unknown>;
          const left = str(o.left, 200);
          const right = str(o.right, 400);
          return left && right ? { left, right } : null;
        })
        .filter((p): p is { left: string; right: string } => !!p);
      if (pairs.length < 2 || pairs.length > 8) {
        errors.push(`${label}: a matching question needs between 2 and 8 pairs.`);
        return;
      }
      if (new Set(pairs.map((p) => p.left.toLowerCase())).size !== pairs.length || new Set(pairs.map((p) => p.right.toLowerCase())).size !== pairs.length) {
        errors.push(`${label}: every term and every definition must be different.`);
        return;
      }
      quiz.push({ ...base, type: 'matching', pairs } as MatchingQuestion);
      return;
    }

    if (type === 'self_check') {
      const sample = r.sampleAnswer === undefined || r.sampleAnswer === null || r.sampleAnswer === '' ? undefined : str(r.sampleAnswer, 2000);
      if (r.sampleAnswer && !sample) errors.push(`${label}: the sample answer is too long (2000 characters max).`);
      quiz.push({ ...base, type: 'self_check', ...(sample ? { sampleAnswer: sample } : {}) } as SelfCheckQuestion);
      return;
    }

    quiz.push({ ...base, type: 'reflection' } as ReflectionQuestion);
  });

  return { quiz, errors, warnings };
}
