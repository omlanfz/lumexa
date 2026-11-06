// FILE PATH: client/lib/lesson/quizFlow.ts
//
// The Mini Quiz as a pure state machine: one question at a time, check, feedback,
// next, summary, retry. Every question is multiple choice with four options, so the
// whole flow is "choose an option → the server says right or wrong, and why".
// No React and no network in here — the component feeds it what the server said — so
// the flow and the scoring are unit-tested.

import type { PublicQuizQuestion, QuizAnswer, QuizCheckResult } from './types';

export type Phase = 'intro' | 'question' | 'feedback' | 'summary';

export interface Draft {
  /** The option the learner has chosen (not yet checked). */
  optionId?: string;
}

export interface QuizState {
  phase: Phase;
  index: number;
  drafts: Record<string, Draft>;
  /** The latest server verdict for each question. */
  results: Record<string, QuizCheckResult>;
  attempt: number;
}

export type QuizAction =
  | { type: 'start' }
  | { type: 'draft'; id: string; draft: Partial<Draft> }
  | { type: 'checked'; result: QuizCheckResult }
  | { type: 'next'; total: number }
  | { type: 'retry' };

export const initialQuizState = (): QuizState => ({ phase: 'intro', index: 0, drafts: {}, results: {}, attempt: 1 });

export function quizReducer(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
    case 'start':
      return { ...state, phase: 'question', index: 0 };
    case 'draft':
      // A choice can only change while the question is open (not after it was checked).
      if (state.phase !== 'question') return state;
      return { ...state, drafts: { ...state.drafts, [action.id]: { ...state.drafts[action.id], ...action.draft } } };
    case 'checked':
      if (state.phase !== 'question') return state;
      return { ...state, phase: 'feedback', results: { ...state.results, [action.result.questionId]: action.result } };
    case 'next':
      if (state.phase !== 'feedback') return state;
      return state.index + 1 >= action.total ? { ...state, phase: 'summary' } : { ...state, phase: 'question', index: state.index + 1 };
    case 'retry':
      return { ...initialQuizState(), phase: 'question', attempt: state.attempt + 1 };
  }
}

/** Has the learner chosen one of this question's options? */
export function isAnswerReady(q: PublicQuizQuestion, d: Draft | undefined): boolean {
  return !!d?.optionId && q.options.some((o) => o.id === d.optionId);
}

/** The submission for a question: the id of the chosen option, nothing else. */
export function buildAnswer(_q: PublicQuizQuestion, d: Draft | undefined): QuizAnswer {
  return { optionId: d?.optionId ?? '' };
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
  /** Questions answered correctly. */
  score: number;
  /** Questions in the quiz (every one is scored). */
  total: number;
  /** The questions that were answered wrongly, worth another look. */
  revisit: string[];
  answered: number;
}

export function summarize(questions: PublicQuizQuestion[], state: Pick<QuizState, 'results'>): QuizSummary {
  let score = 0;
  let answered = 0;
  const revisit: string[] = [];
  for (const q of questions) {
    const r = state.results[q.id];
    if (r) answered++;
    if (r?.correct === true) score++;
    else if (r) revisit.push(q.id);
  }
  return { score, total: questions.length, revisit, answered };
}

/** A friendly, honest line for the score. */
export function scoreMessage(score: number, total: number): string {
  if (total === 0) return 'There are no questions in this quiz yet.';
  if (score === total) return 'Perfect — you got every question right!';
  if (score / total >= 0.7) return 'Great work! Have a quick look at the ones below, then you are all set.';
  if (score / total >= 0.4) return 'Good effort. Read the explanations below and try again when you are ready.';
  return 'This was a tough one — and that is how learning works. Re-read the lesson, then try again.';
}
