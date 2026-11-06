'use client';

// FILE PATH: client/components/lesson/MiniQuiz.tsx
//
// The Mini Quiz for a learning lesson (not the assessment/test system).
//
// Every question is multiple choice with four options — there is no typed answer, no
// true/false, no ordering or matching. One question at a time. The answer is checked by
// the server the moment the learner presses "Check answer": the learner never has the
// answer key in advance, and the verdict comes back with the correct option and the
// explanation, which is shown straight away. Finishes with a score, the questions to
// revisit, and a retry. Keyboard operable (arrow keys or the numbers 1–4 choose an
// option), announced to screen readers, light/dark/mobile.

import { useEffect, useMemo, useReducer, useRef, useState, type KeyboardEvent } from 'react';
import api from '@/lib/axios';
import { errorMessage } from '@/lib/homeworkFiles';
import {
  buildAnswer,
  initialQuizState,
  isAnswerReady,
  quizReducer,
  scoreMessage,
  summarize,
  type Draft,
  type QuizSummary,
} from '@/lib/lesson/quizFlow';
import type { ProgressView, PublicOption, PublicQuiz, PublicQuizQuestion, QuizCheckResult } from '@/lib/lesson/types';
import InlineMarkdown from './InlineMarkdown';
import LessonMarkdown from './LessonMarkdown';

export interface MiniQuizProps {
  lessonId: string;
  quiz: PublicQuiz;
  scheduledLessonId?: string | null;
  inClassroom?: boolean;
  /** A teacher or admin looking at the quiz: nothing is recorded. */
  preview?: boolean;
  /** The student's last pass, from the server (intro card). */
  previous?: ProgressView['quiz'] | null;
  onFinished?: (summary: QuizSummary) => void;
  /** After each answer the server has checked (so progress can refresh). */
  onAnswered?: () => void;
}

const LETTERS = 'ABCD';
const CARD = 'rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-800/60';
const BTN_PRIMARY =
  'inline-flex items-center justify-center rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-5 py-2.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400';

function Prompt({ text }: { text: string }) {
  return text.includes('```') ? <LessonMarkdown markdown={text} /> : <InlineMarkdown text={text} />;
}

const optText = (list: PublicOption[], id: string | undefined) => list.find((o) => o.id === id)?.text ?? '';

// ─── The four options ───────────────────────────────────────────────────────

export function ChoiceList({
  q,
  draft,
  result,
  locked,
  onPick,
  labelledBy,
}: {
  q: PublicQuizQuestion;
  draft: Draft | undefined;
  result: QuizCheckResult | undefined;
  locked: boolean;
  onPick: (id: string) => void;
  labelledBy: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const correctId = result?.reveal.optionId;
  const selectedIndex = q.options.findIndex((o) => o.id === draft?.optionId);
  const focusable = selectedIndex === -1 ? 0 : selectedIndex;

  const pick = (i: number) => {
    const at = Math.max(0, Math.min(q.options.length - 1, i));
    onPick(q.options[at].id);
    refs.current[at]?.focus();
  };
  const onKey = (e: KeyboardEvent, i: number) => {
    if (locked) return;
    let to: number | null = null;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') to = i + 1;
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') to = i - 1;
    else if (/^[1-4]$/.test(e.key) && Number(e.key) <= q.options.length) to = Number(e.key) - 1;
    if (to !== null) {
      e.preventDefault();
      pick(to);
    }
  };

  return (
    <div role="radiogroup" aria-labelledby={labelledBy} className="grid gap-2.5">
      {q.options.map((o, i) => {
        const selected = draft?.optionId === o.id;
        const isCorrect = locked && correctId === o.id;
        const isWrongPick = locked && selected && result?.correct === false;
        const tone = isCorrect
          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/25 ring-2 ring-emerald-500/40'
          : isWrongPick
            ? 'border-red-500 bg-red-50 dark:bg-red-900/25 ring-2 ring-red-500/40'
            : selected
              ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/25 ring-2 ring-violet-500/40'
              : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800/40 hover:border-violet-400 hover:bg-violet-50/60 dark:hover:bg-violet-900/15';
        return (
          <button
            key={o.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={locked}
            tabIndex={i === focusable ? 0 : -1}
            onClick={() => onPick(o.id)}
            onKeyDown={(e) => onKey(e, i)}
            className={`flex w-full items-start gap-3 rounded-xl border-2 px-3.5 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 disabled:cursor-default ${tone}`}
          >
            <span className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${isCorrect ? 'bg-emerald-600 text-white' : isWrongPick ? 'bg-red-600 text-white' : selected ? 'bg-violet-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`} aria-hidden="true">
              {isCorrect ? '✓' : isWrongPick ? '✗' : LETTERS[i]}
            </span>
            <span className="min-w-0 flex-1 text-[0.95rem] leading-relaxed text-gray-900 dark:text-gray-100 break-words">
              <InlineMarkdown text={o.text} />
              {isCorrect && <span className="sr-only"> — correct answer</span>}
              {isWrongPick && <span className="sr-only"> — your answer, not correct</span>}
              {selected && !locked && <span className="sr-only"> — selected</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** The correct answer, in words, for a question the learner has answered. */
export function CorrectAnswer({ q, result, withWhy }: { q: PublicQuizQuestion; result: QuizCheckResult | undefined; withWhy?: boolean }) {
  if (!result) return null;
  return (
    <div className="mt-2 text-sm text-gray-900 dark:text-gray-100 leading-relaxed">
      <span className="font-semibold">Correct answer: </span>
      <InlineMarkdown text={optText(q.options, result.reveal.optionId)} />
      {withWhy && result.explanation && (
        <div className="mt-1 text-gray-700 dark:text-gray-300">
          <InlineMarkdown text={result.explanation} />
        </div>
      )}
    </div>
  );
}

// ─── The component ──────────────────────────────────────────────────────────

export default function MiniQuiz({ lessonId, quiz, scheduledLessonId, inClassroom, preview, previous, onFinished, onAnswered }: MiniQuizProps) {
  const questions = quiz.questions;
  const [state, dispatch] = useReducer(quizReducer, undefined, initialQuizState);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const q = questions[state.index];
  const nextRef = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const summary = useMemo(() => summarize(questions, state), [questions, state]);
  const finishedRef = useRef(onFinished);
  finishedRef.current = onFinished;

  useEffect(() => {
    if (state.phase === 'feedback') nextRef.current?.focus();
    else if (state.phase === 'question') headingRef.current?.focus();
  }, [state.phase, state.index]);

  useEffect(() => {
    if (state.phase === 'summary') finishedRef.current?.(summary);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase]);

  async function check() {
    if (!q || checking) return;
    const draft = state.drafts[q.id];
    if (!isAnswerReady(q, draft)) return;
    setChecking(true);
    setError(null);
    try {
      const res = await api.post<QuizCheckResult>(`/curriculum/lessons/${lessonId}/quiz/check`, {
        questionId: q.id,
        answer: buildAnswer(q, draft),
        scheduledLessonId: scheduledLessonId ?? undefined,
        inClassroom: inClassroom || undefined,
      });
      dispatch({ type: 'checked', result: res.data });
      onAnswered?.();
    } catch (err) {
      setError(errorMessage(err, 'Could not check that answer. Please try again.'));
    } finally {
      setChecking(false);
    }
  }

  // ── Intro ──
  if (state.phase === 'intro') {
    return (
      <div className={`${CARD} p-5 sm:p-6`} role="region" aria-label="Knowledge check">
        <div className="flex items-start gap-4">
          <span className="text-3xl" aria-hidden="true">🧠</span>
          <div className="min-w-0 flex-1">
            <div className="text-lg font-bold text-gray-900 dark:text-white">Check what you know</div>
            <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              {questions.length} multiple-choice question{questions.length === 1 ? '' : 's'}. You see right away whether you are right — and why.
            </div>
            {previous?.completed && previous.total > 0 && (
              <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-gray-100 dark:bg-gray-700/60 px-3 py-1 text-xs text-gray-700 dark:text-gray-200">
                Last time: {previous.score} of {previous.total} right
              </div>
            )}
            {preview && (
              <div className="mt-2 text-xs text-amber-700 dark:text-amber-300">Preview — your answers are not recorded.</div>
            )}
            <div className="mt-4">
              <button type="button" className={BTN_PRIMARY} onClick={() => dispatch({ type: 'start' })}>
                {previous?.completed ? 'Take it again' : 'Start'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Summary ──
  if (state.phase === 'summary') {
    const revisit = questions.filter((x) => summary.revisit.includes(x.id));
    const pct = summary.total ? Math.round((summary.score / summary.total) * 100) : 100;
    return (
      <div className={`${CARD} p-5 sm:p-6`} role="region" aria-label="Knowledge check results">
        <div className="flex flex-wrap items-center gap-5">
          <svg width="92" height="92" viewBox="0 0 92 92" role="img" aria-label={`Score: ${summary.score} of ${summary.total}`}>
            <circle cx="46" cy="46" r="38" fill="none" strokeWidth="9" className="stroke-gray-200 dark:stroke-gray-700" />
            <circle cx="46" cy="46" r="38" fill="none" strokeWidth="9" strokeLinecap="round" transform="rotate(-90 46 46)" strokeDasharray={`${(pct / 100) * 238.76} 238.76`} className={pct >= 70 ? 'stroke-emerald-500' : pct >= 40 ? 'stroke-amber-500' : 'stroke-red-500'} />
            <text x="46" y="52" textAnchor="middle" fontSize="20" fontWeight="700" className="fill-gray-900 dark:fill-white">
              {`${summary.score}/${summary.total}`}
            </text>
          </svg>
          <div className="min-w-0 flex-1">
            <div className="text-lg font-bold text-gray-900 dark:text-white" role="status">
              You got {summary.score} of {summary.total} right
            </div>
            <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">{scoreMessage(summary.score, summary.total)}</div>
            {preview && <div className="mt-1 text-xs text-amber-700 dark:text-amber-300">Preview — nothing was recorded.</div>}
          </div>
        </div>

        {revisit.length > 0 && (
          <div className="mt-5">
            <div className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Questions to revisit</div>
            <div className="grid gap-3">
              {revisit.map((x) => (
                <div key={x.id} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-3.5">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100"><Prompt text={x.prompt} /></div>
                  <CorrectAnswer q={x} result={state.results[x.id]} withWhy />
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="mt-5">
          <button type="button" className={BTN_PRIMARY} onClick={() => dispatch({ type: 'retry' })}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  // ── A question (or its feedback) ──
  if (!q) return null;
  const result = state.results[q.id];
  const draft = state.drafts[q.id];
  const locked = state.phase === 'feedback';
  const isLast = state.index + 1 >= questions.length;
  const ready = isAnswerReady(q, draft);
  const labelId = `quiz-${lessonId}-${q.id}-label`;

  return (
    <div className={`${CARD} p-4 sm:p-6`} role="region" aria-label="Knowledge check">
      <div className="flex items-center justify-between gap-3 mb-2 text-xs text-gray-600 dark:text-gray-300">
        <span className="font-semibold">Question {state.index + 1} of {questions.length}</span>
        {preview && <span className="text-amber-700 dark:text-amber-300">Preview</span>}
      </div>
      <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden mb-4" role="progressbar" aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={state.index + (locked ? 1 : 0)} aria-label="Quiz progress">
        <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${((state.index + (locked ? 1 : 0)) / questions.length) * 100}%` }} />
      </div>

      <div id={labelId} ref={headingRef} tabIndex={-1} className="text-[1.05rem] font-semibold leading-snug text-gray-900 dark:text-white mb-3 outline-none">
        <Prompt text={q.prompt} />
      </div>
      {q.code && <LessonMarkdown markdown={'```' + q.code.language + '\n' + q.code.code + '\n```'} />}

      <ChoiceList q={q} draft={draft} result={result} locked={locked} labelledBy={labelId} onPick={(id) => dispatch({ type: 'draft', id: q.id, draft: { optionId: id } })} />

      {error && (
        <div className="mt-3 text-sm text-red-700 dark:text-red-300" role="alert">{error}</div>
      )}

      {!locked && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" className={BTN_PRIMARY} disabled={!ready || checking} onClick={check}>
            {checking ? 'Checking…' : 'Check answer'}
          </button>
          {!ready && <span className="text-xs text-gray-500 dark:text-gray-400">Choose an answer to continue.</span>}
        </div>
      )}

      {locked && result && (
        <div className="mt-4" aria-live="polite">
          <div role="status" className={`rounded-xl border p-3.5 ${result.correct ? 'border-emerald-500/50 bg-emerald-50 dark:bg-emerald-900/20' : 'border-red-500/50 bg-red-50 dark:bg-red-900/20'}`}>
            <div className={`font-bold ${result.correct ? 'text-emerald-800 dark:text-emerald-300' : 'text-red-800 dark:text-red-300'}`}>
              <span aria-hidden="true">{result.correct ? '✓ ' : '✗ '}</span>
              {result.correct ? 'Correct!' : 'Not quite'}
            </div>
            {result.explanation && (
              <div className="mt-1.5 text-sm text-gray-900 dark:text-gray-100 leading-relaxed">
                <span className="font-semibold">Why: </span>
                <InlineMarkdown text={result.explanation} />
              </div>
            )}
            {!result.correct && <CorrectAnswer q={q} result={result} />}
          </div>
          <div className="mt-4">
            <button ref={nextRef} type="button" className={BTN_PRIMARY} onClick={() => dispatch({ type: 'next', total: questions.length })}>
              {isLast ? 'See results' : 'Next question'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
