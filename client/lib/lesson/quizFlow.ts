// FILE PATH: client/lib/lesson/quizFlow.ts
//
// The Mini Quiz as a pure state machine: one question at a time, check, feedback,
// next, summary, retry. No React and no network in here — the component feeds it
// what the server said — so every question type and the scoring are unit-tested.

import type { PublicQuizQuestion, QuizAnswer, QuizCheckResult } from './types';

export type Phase = 'intro' | 'question' | 'feedback' | 'summary';

export interface Draft {
  optionId?: string;
  /** Item ids in the learner's current order (ordering questions). */
  order?: string[];
  /** leftId → rightId (matching questions). */
  pairs?: Record<string, string>;
  /** Kept on the device only; never sent. */
  text?: string;
}

export interface QuizState {
  phase: Phase;
  index: number;
  drafts: Record<string, Draft>;
  /** The latest server verdict for each question. */
  results: Record<string, QuizCheckResult>;
  ratings: Record<string, 'got_it' | 'review'>;
  attempt: number;
}

export type QuizAction =
  | { type: 'start' }
  | { type: 'draft'; id: string; draft: Partial<Draft> }
  | { type: 'checked'; result: QuizCheckResult }
  | { type: 'rate'; id: string; rating: 'got_it' | 'review' }
  | { type: 'next'; total: number }
  | { type: 'retry' };

export const initialQuizState = (): QuizState => ({ phase: 'intro', index: 0, drafts: {}, results: {}, ratings: {}, attempt: 1 });

export function quizReducer(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
    case 'start':
      return { ...state, phase: 'question', index: 0 };
    case 'draft':
      // A draft can only change while the question is open (not after it was checked).
      if (state.phase !== 'question') return state;
      return { ...state, drafts: { ...state.drafts, [action.id]: { ...state.drafts[action.id], ...action.draft } } };
    case 'checked':
      if (state.phase !== 'question') return state;
      return { ...state, phase: 'feedback', results: { ...state.results, [action.result.questionId]: action.result } };
    case 'rate':
      return { ...state, ratings: { ...state.ratings, [action.id]: action.rating } };
    case 'next':
      if (state.phase !== 'feedback') return state;
      return state.index + 1 >= action.total ? { ...state, phase: 'summary' } : { ...state, phase: 'question', index: state.index + 1 };
    case 'retry':
      return { ...initialQuizState(), phase: 'question', attempt: state.attempt + 1 };
  }
}

/** Is there enough in the draft to check this question? */
export function isAnswerReady(q: PublicQuizQuestion, d: Draft | undefined): boolean {
  switch (q.type) {
    case 'multiple_choice':
    case 'true_false':
    case 'code_output':
    case 'code_error':
      return !!d?.optionId && q.options.some((o) => o.id === d.optionId);
    case 'ordering':
      return true; // the current order is an answer
    case 'matching':
      return !!d?.pairs && q.left.every((l) => !!d.pairs![l.id]);
    case 'self_check':
      return !!d?.text && d.text.trim() !== '';
    case 'reflection':
      return true; // optional to write anything
  }
}

/** The submission for a question. A learner's own words are never part of it. */
export function buildAnswer(q: PublicQuizQuestion, d: Draft | undefined): QuizAnswer {
  switch (q.type) {
    case 'multiple_choice':
    case 'true_false':
    case 'code_output':
    case 'code_error':
      return { optionId: d?.optionId ?? '' };
    case 'ordering':
      return { order: d?.order ?? q.items.map((i) => i.id) };
    case 'matching':
      return { pairs: q.left.map((l) => ({ leftId: l.id, rightId: d?.pairs?.[l.id] ?? '' })) };
    case 'self_check':
    case 'reflection':
      return { answered: true };
  }
}

/** The order an ordering question starts in (what the server sent). */
export function initialOrder(q: Extract<PublicQuizQuestion, { type: 'ordering' }>): string[] {
  return q.items.map((i) => i.id);
}

/** Move item `from` to `to` (clamped), returning a new array. */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from < 0 || from >= list.length) return list;
  const target = Math.max(0, Math.min(list.length - 1, to));
  if (target === from) return list;
  const copy = [...list];
  const [item] = copy.splice(from, 1);
  copy.splice(target, 0, item);
  return copy;
}

export interface QuizSummary {
  /** Machine-graded questions answered correctly. */
  score: number;
  /** Machine-graded questions in the quiz. */
  gradedTotal: number;
  /** Questions worth another look: wrong answers, and self-checks the learner marked "review". */
  revisit: string[];
  answered: number;
  total: number;
}

export function summarize(questions: PublicQuizQuestion[], state: Pick<QuizState, 'results' | 'ratings'>): QuizSummary {
  let score = 0;
  let gradedTotal = 0;
  let answered = 0;
  const revisit: string[] = [];
  for (const q of questions) {
    const r = state.results[q.id];
    if (r) answered++;
    if (q.type === 'self_check' || q.type === 'reflection') {
      if (state.ratings[q.id] === 'review') revisit.push(q.id);
      continue;
    }
    gradedTotal++;
    if (r?.correct === true) score++;
    else if (r) revisit.push(q.id);
  }
  return { score, gradedTotal, revisit, answered, total: questions.length };
}

/** A friendly, honest line for the score. Never claims anything about ungraded prompts. */
export function scoreMessage(score: number, gradedTotal: number): string {
  if (gradedTotal === 0) return 'Nice thinking! These prompts are for your own reflection, so there is no score.';
  if (score === gradedTotal) return 'Perfect — you got every question right!';
  if (score / gradedTotal >= 0.7) return 'Great work! Have a quick look at the ones below, then you are all set.';
  if (score / gradedTotal >= 0.4) return 'Good effort. Read the explanations below and try again when you are ready.';
  return 'This was a tough one — and that is how learning works. Re-read the lesson, then try again.';
}
