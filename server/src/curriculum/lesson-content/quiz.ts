// FILE PATH: server/src/curriculum/lesson-content/quiz.ts
//
// Mini Quiz runtime. THE RULE: every question is a multiple-choice question with
// exactly four options — nothing else is stored, validated, served or graded here.
// (Older question shapes are converted by quiz-mcq.ts; validation below rejects them.)
//
// This is a separate system from the assessment / question-bank / test machinery and
// shares nothing with it.
//
// Answer secrecy:
//   * toPublicQuiz() never includes a correct answer or an explanation — only what is
//     needed to render and answer the question.
//   * Option ids are opaque hashes, not positions, so neither the id nor the display
//     order says anything about which answer is right. (The source content puts the
//     right answer at "b" in the large majority of questions, so authored order is
//     shuffled — deterministically, so the teacher sharing the page and a student
//     studying later see the very same order.)
//   * gradeAnswer() reveals the correct answer and the explanation only in response to
//     a submitted answer.

import {
  MCQ_OPTION_COUNT,
  type McqQuestion,
  type PublicOption,
  type PublicQuizQuestion,
  type QuizAnswer,
  type QuizCheckResult,
} from './types';
import { hash32, seededRandom } from './text';

const SALT = 'lumexa-mini-quiz-v1';

export function optionId(questionId: string, index: number): string {
  return 'o' + hash32(`${SALT}:opt:${questionId}:${index}`).toString(36);
}

export class QuizAnswerError extends Error {}

/** Options that refer to one another ("All of the above", "a and b") must not move. */
export function hasFixedOrder(q: McqQuestion): boolean {
  if (q.fixedOrder !== undefined) return q.fixedOrder;
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

/** The learner-facing form of a quiz: nothing in it reveals an answer. */
export function toPublicQuiz(questions: McqQuestion[] | null | undefined, seedKey: string): PublicQuizQuestion[] {
  return (questions ?? []).map((q): PublicQuizQuestion => {
    const options: PublicOption[] = q.options.map((text, i) => ({ id: optionId(q.id, i), text }));
    return {
      id: q.id,
      type: 'multiple_choice',
      prompt: q.prompt,
      ...(q.code ? { code: q.code } : {}),
      options: hasFixedOrder(q) ? options : shuffled(options, `${seedKey}:${q.id}`),
    };
  });
}

/** Grades one submitted answer. Throws QuizAnswerError for a malformed submission. */
export function gradeAnswer(q: McqQuestion, answer: QuizAnswer | undefined | null): QuizCheckResult {
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

/** Number of questions that are scored (all of them — every question is multiple choice). */
export function gradedCount(questions: McqQuestion[] | null | undefined): number {
  return (questions ?? []).length;
}

// ─── Validation / normalisation of authored quizzes ────────────────────────

export interface QuizValidation {
  quiz: McqQuestion[];
  errors: string[];
  warnings: string[];
}

const str = (v: unknown, max: number): string | null =>
  typeof v === 'string' && v.trim() !== '' && v.length <= max ? v.trim() : null;

/** What a person is told when a question is not a four-option multiple-choice question. */
export const MCQ_RULE = `Every quiz question must be a multiple-choice question with exactly ${MCQ_OPTION_COUNT} answer options.`;

/**
 * Coerces untrusted input (the admin editor, an import, a stored row) into a clean quiz and
 * reports everything that is wrong with it. A question that breaks the rule is reported and
 * left OUT of `quiz` — a learner is never served one. Never throws; the caller decides
 * whether `errors` blocks a save.
 */
export function normalizeQuiz(raw: unknown): QuizValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const quiz: McqQuestion[] = [];
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
    if (r.type !== 'multiple_choice') {
      errors.push(`${label}: only multiple-choice questions are allowed (this one is "${String(r.type)}"). ${MCQ_RULE}`);
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
    if (!explanation) warnings.push(`${label}: add a short explanation — learners see it right after they answer.`);

    const optsRaw = Array.isArray(r.options) ? r.options : [];
    if (optsRaw.length !== MCQ_OPTION_COUNT) {
      errors.push(`${label}: needs exactly ${MCQ_OPTION_COUNT} answer options (it has ${optsRaw.length}). ${MCQ_RULE}`);
      return;
    }
    const options = optsRaw.map((o) => str(o, 400));
    if (options.some((o) => !o)) {
      errors.push(`${label}: every one of the ${MCQ_OPTION_COUNT} options needs text (400 characters max each).`);
      return;
    }
    const texts = options as string[];
    if (new Set(texts.map((o) => o.replace(/\s+/g, ' ').trim())).size !== texts.length) {
      // Exact comparison on purpose: `Header()` and `header()` are different answers in code.
      errors.push(`${label}: answer options must all be different.`);
      return;
    }
    const ci = Number(r.correctIndex);
    if (!Number.isInteger(ci) || ci < 0 || ci >= MCQ_OPTION_COUNT) {
      errors.push(`${label}: choose which one option is correct.`);
      return;
    }
    let code: McqQuestion['code'];
    if (r.code && typeof r.code === 'object') {
      const c = r.code as Record<string, unknown>;
      const language = str(c.language, 24) ?? 'text';
      const text = typeof c.code === 'string' && c.code.trim() !== '' && c.code.length <= 4000 ? c.code : null;
      if (!text) {
        errors.push(`${label}: the code snippet is empty or too long (4000 characters max).`);
        return;
      }
      code = { language, code: text };
    }
    quiz.push({
      id,
      type: 'multiple_choice',
      prompt,
      ...(explanation ? { explanation } : {}),
      ...(typeof r.fixedOrder === 'boolean' ? { fixedOrder: r.fixedOrder } : {}),
      ...(typeof r.source === 'string' && ['markdown', 'json', 'authored', 'derived'].includes(r.source) ? { source: r.source as McqQuestion['source'] } : {}),
      ...(code ? { code } : {}),
      options: texts.map((o) => o.trim()),
      correctIndex: ci,
    });
  });

  return { quiz, errors, warnings };
}

/** True when a stored question already obeys the rule (so it can be kept as it is). */
export function isConformingQuestion(raw: unknown): boolean {
  const v = normalizeQuiz([raw]);
  return v.errors.length === 0 && v.quiz.length === 1;
}
