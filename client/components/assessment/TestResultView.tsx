'use client';

// What a student sees after submitting: first a confirmation while the teacher
// reviews (no score yet — see AssessmentsService: results are released only
// when the teacher approves), then the released result.

import { useState } from 'react';
import { CheckCircle2, Clock, Lock, XCircle } from 'lucide-react';
import { elapsedMs } from '@/lib/assessment/clock';
import { formatElapsed, formatMarks, formatPercent } from '@/lib/assessment/progress';
import type { AttemptView } from '@/lib/assessment/types';
import QuestionText, { OptionText } from './QuestionText';

export function SubmittedPanel({ attempt }: { attempt: AttemptView }) {
  const a = attempt.assessment;
  const when = attempt.submittedAt
    ? new Date(attempt.submittedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
    : null;
  const took = elapsedMs(attempt.startedAt, 0, 0, attempt.submittedAt);
  // The teacher locked the test (time was up): what the student had saved was
  // submitted for them. Say so plainly — nothing they saved was lost.
  const locked = attempt.lockedByTeacher;
  return (
    <section
      className="mx-auto max-w-2xl space-y-4 rounded-xl border border-[var(--ar-border)] bg-[var(--ar-surface)] p-5 text-center sm:p-8"
      aria-live="polite"
      data-testid={locked ? 'locked-panel' : 'submitted-panel'}
    >
      {locked ? (
        <Lock size={38} className="mx-auto text-[var(--ar-warning)]" />
      ) : (
        <CheckCircle2 size={38} className="mx-auto text-[var(--ar-success)]" />
      )}
      <div>
        <h2 className="text-lg font-bold text-[var(--ar-text)]">{locked ? 'Your teacher locked the test' : 'Test submitted'}</h2>
        <p className="text-sm text-[var(--ar-muted)]">
          {a.title}
          {when ? ` · ${when}` : ''}
          {took !== null ? ` · ${formatElapsed(took)} on the test` : ''}
        </p>
      </div>
      <ul className="mx-auto max-w-md space-y-1.5 text-left text-sm text-[var(--ar-text)]">
        {locked && (
          <li className="flex gap-2">
            <Lock size={16} className="mt-0.5 flex-shrink-0 text-[var(--ar-warning)]" />
            <span>Time was up, so your teacher locked the test. You can’t change your answers now.</span>
          </li>
        )}
        <li className="flex gap-2">
          <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0 text-[var(--ar-success)]" />
          <span>
            {locked
              ? `The ${attempt.answeredCount} answer${attempt.answeredCount === 1 ? '' : 's'} you had saved (of ${a.questionCount}) were submitted automatically — nothing you saved was lost.`
              : `Your ${attempt.answeredCount} answer${attempt.answeredCount === 1 ? '' : 's'} (of ${a.questionCount}) were saved and graded automatically.`}
          </span>
        </li>
        {a.hasCodingProject && (
          <li className="flex gap-2">
            <Clock size={16} className="mt-0.5 flex-shrink-0 text-[var(--ar-warning)]" />
            <span>{locked ? 'The code you had saved for your coding project was sent to your teacher to mark.' : 'Your coding project was sent to your teacher to mark.'}</span>
          </li>
        )}
        <li className="flex gap-2">
          <Clock size={16} className="mt-0.5 flex-shrink-0 text-[var(--ar-warning)]" />
          <span>Your teacher will review your result and share your report. It will appear here once it&apos;s ready.</span>
        </li>
      </ul>
      <p className="text-xs text-[var(--ar-faint)]">You can safely close this page{locked ? ' — and stop sharing your screen if your teacher says so' : ''}.</p>
    </section>
  );
}

export function ResultsPanel({ attempt }: { attempt: AttemptView }) {
  const [showAnswers, setShowAnswers] = useState(false);
  const r = attempt.result;
  const a = attempt.assessment;
  if (!r) {
    return <p className="text-sm text-[var(--ar-muted)]">Your result is not available yet.</p>;
  }
  const mcqCorrect = attempt.questions.filter((q) => q.kind === 'MCQ' && q.isCorrect).length;
  const tfCorrect = attempt.questions.filter((q) => q.kind === 'TRUE_FALSE' && q.isCorrect).length;

  return (
    <div className="space-y-4 @4xl:grid @4xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] @4xl:items-start @4xl:gap-6 @4xl:space-y-0">
      <section className="rounded-xl border border-[var(--ar-border)] bg-[var(--ar-surface)] p-5 text-center @4xl:sticky @4xl:top-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ar-faint)]">{a.title}</p>
        <p className="mt-1 text-4xl font-extrabold tabular-nums text-[var(--ar-text)]">{formatPercent(r.percentage)}</p>
        <p className="text-sm text-[var(--ar-muted)]">
          {formatMarks(r.total)} / {formatMarks(r.totalMax)} marks
        </p>
        <p className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${r.passed ? 'bg-[var(--ar-success)]/15 text-[var(--ar-success)]' : 'bg-[var(--ar-warning)]/15 text-[var(--ar-warning)]'}`}>
          {r.passed ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
          {r.passed ? `Passed (pass mark ${r.passScorePct}%)` : `Below the ${r.passScorePct}% pass mark — your teacher will help you revisit it`}
        </p>
        <dl className="mx-auto mt-4 grid max-w-md grid-cols-2 gap-2 text-left text-xs">
          <div className="rounded-lg bg-[var(--ar-bg)] p-2.5">
            <dt className="text-[var(--ar-faint)]">Multiple choice</dt>
            <dd className="font-bold text-[var(--ar-text)]">{mcqCorrect} / {r.objective.mcqTotal}</dd>
          </div>
          <div className="rounded-lg bg-[var(--ar-bg)] p-2.5">
            <dt className="text-[var(--ar-faint)]">True / False</dt>
            <dd className="font-bold text-[var(--ar-text)]">{tfCorrect} / {r.objective.trueFalseTotal}</dd>
          </div>
          {r.coding && (
            <div className="col-span-2 rounded-lg bg-[var(--ar-bg)] p-2.5">
              <dt className="text-[var(--ar-faint)]">Coding project (marked by your teacher)</dt>
              <dd className="font-bold text-[var(--ar-text)]">{formatMarks(r.coding.score)} / {formatMarks(r.coding.max)}</dd>
            </div>
          )}
        </dl>
      </section>

      {/* On a wide screen the summary stays in view on the left while the
          teacher's feedback and the answer review use the room on the right. */}
      <div className="min-w-0 space-y-4">
        {(r.feedback || r.strengths || r.improvements) && (
          <section className="space-y-3 rounded-xl border border-[var(--ar-border)] bg-[var(--ar-surface)] p-4 text-sm">
            {r.feedback && <Note title="Message from your teacher" text={r.feedback} />}
            {r.strengths && <Note title="What you did well" text={r.strengths} />}
            {r.improvements && <Note title="What to work on next" text={r.improvements} />}
          </section>
        )}

        {r.coding && (r.coding.feedback || (r.coding.rubric && r.coding.rubric.length > 0)) && (
          <section className="space-y-2 rounded-xl border border-[var(--ar-border)] bg-[var(--ar-surface)] p-4 text-sm">
            <h3 className="font-semibold text-[var(--ar-text)]">Coding project feedback</h3>
            {r.coding.rubric && (
              <ul className="space-y-0.5 text-xs text-[var(--ar-muted)]">
                {r.coding.rubric.map((c) => (
                  <li key={c.criterion} className="flex justify-between gap-3">
                    <span>{c.criterion}</span>
                    <span className="tabular-nums">{formatMarks(c.score)} / {c.maxPoints}</span>
                  </li>
                ))}
              </ul>
            )}
            {r.coding.feedback && <p className="whitespace-pre-wrap text-[var(--ar-text)]">{r.coding.feedback}</p>}
          </section>
        )}

        <button
          type="button"
          onClick={() => setShowAnswers((v) => !v)}
          className="w-full rounded-lg border border-[var(--ar-border-strong)] px-4 py-2 text-sm font-medium text-[var(--ar-text)] hover:bg-[var(--ar-surface)]"
          aria-expanded={showAnswers}
        >
          {showAnswers ? 'Hide my answers' : 'Review my answers'}
        </button>

        {showAnswers && (
          <ol className="space-y-3">
            {attempt.questions.map((q) => (
              <li key={q.id} className="rounded-xl border border-[var(--ar-border)] bg-[var(--ar-surface)] p-4">
                <div className="mb-1 flex items-start gap-2">
                  {q.isCorrect ? (
                    <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0 text-[var(--ar-success)]" aria-label="Correct" />
                  ) : (
                    <XCircle size={16} className="mt-0.5 flex-shrink-0 text-[var(--ar-danger)]" aria-label="Incorrect" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-[var(--ar-faint)]">Question {q.order}</p>
                    <QuestionText text={q.text} className="text-sm text-[var(--ar-text)]" />
                  </div>
                </div>
                <p className="ml-6 text-xs text-[var(--ar-muted)]">
                  Your answer: <OptionText text={q.selectedIndex === null ? 'No answer' : q.options[q.selectedIndex]} className="font-medium text-[var(--ar-text)]" />
                </p>
                {!q.isCorrect && q.correctIndex !== undefined && (
                  <p className="ml-6 text-xs text-[var(--ar-muted)]">
                    Correct answer: <OptionText text={q.options[q.correctIndex]} className="font-medium text-[var(--ar-success)]" />
                  </p>
                )}
                {q.explanation && <p className="ml-6 mt-1 text-xs text-[var(--ar-muted)]">💡 {q.explanation}</p>}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

function Note({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-[var(--ar-text)]">{title}</p>
      <p className="whitespace-pre-wrap text-[var(--ar-muted)]">{text}</p>
    </div>
  );
}
