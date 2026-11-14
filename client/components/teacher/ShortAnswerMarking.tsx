'use client';

// Part B of a structured assessment (Pre-University CSE), as the teacher marks it: for each written answer the
// question, what the student wrote, the marking guide (what to look for in each criterion, and the model
// answer) and one mark box per criterion, then an optional note for the student. The numbers are only
// a preview — the server recomputes everything on save (see ReportCardEditor).

import QuestionText from '@/components/assessment/QuestionText';
import { formatMarks } from '@/lib/assessment/progress';
import type { ReportDetail } from '@/lib/assessment/types';

type Items = NonNullable<ReportDetail['shortAnswers']>['items'];

export interface ShortAnswerDraft {
  /** Typed marks by criterion name ('' = not marked yet). */
  marks: Record<string, string>;
  comment: string;
}

export default function ShortAnswerMarking({
  items,
  drafts,
  subtotals,
  errors,
  editable,
  onMark,
  onComment,
}: {
  items: Items;
  drafts: Record<string, ShortAnswerDraft>;
  /** The preview subtotal of each answer (null until every criterion is marked). */
  subtotals: (number | null)[];
  /** Error messages by `${questionId}::${criterion}`. */
  errors: Record<string, string>;
  editable: boolean;
  onMark: (questionId: string, criterion: string, value: string) => void;
  onComment: (questionId: string, value: string) => void;
}) {
  return (
    <ol className="space-y-5">
      {items.map((item, index) => {
        const draft = drafts[item.questionId] ?? { marks: {}, comment: '' };
        const subtotal = subtotals[index] ?? null;
        const blank = !item.answer.trim();
        return (
          <li key={item.questionId} className="space-y-3 rounded-xl border border-[var(--t-border)] bg-[var(--t-surface)] p-4" data-testid="short-answer-marking">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--t-text-faint)]">Short answer {item.order}</p>
              <p className="rounded-full border border-[var(--t-border-strong)] px-2.5 py-0.5 text-xs font-bold tabular-nums text-[var(--t-text)]">
                {subtotal === null ? '—' : formatMarks(subtotal)} / {item.maxScore}
              </p>
            </div>

            <QuestionText text={item.prompt} className="text-sm text-[var(--t-text)]" />

            <div>
              <p className="mb-1 text-xs font-semibold text-[var(--t-text)]">
                Student&apos;s answer{blank && <span className="ml-2 font-normal text-[var(--t-warning)]">— nothing was written</span>}
              </p>
              <p className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-[var(--t-border)] bg-[var(--t-surface-2)] p-3 text-sm text-[var(--t-text)]">
                {blank ? '(no answer)' : item.answer}
              </p>
            </div>

            {item.modelAnswer && (
              <details className="rounded-lg border border-[var(--t-border)] p-3 text-sm">
                <summary className="cursor-pointer text-xs font-semibold text-[var(--t-text)]">Model answer (only you see this)</summary>
                <QuestionText text={item.modelAnswer} className="mt-2 text-xs text-[var(--t-text-muted)]" />
              </details>
            )}

            <div className="overflow-x-auto">
              <table className="w-full min-w-[22rem] text-sm">
                <caption className="mb-1 text-left text-xs font-semibold text-[var(--t-text)]">Mark each criterion</caption>
                <tbody className="divide-y divide-[var(--t-border)]">
                  {item.rubric.map((r) => {
                    const error = errors[`${item.questionId}::${r.criterion}`];
                    const id = `mark-${item.questionId}-${r.criterion}`;
                    return (
                      <tr key={r.criterion}>
                        <td className="py-2 pr-3 align-top">
                          <p className="font-medium text-[var(--t-text)]">{r.criterion}</p>
                          {r.lookFor && <p className="text-xs text-[var(--t-text-muted)]">{r.lookFor}</p>}
                        </td>
                        <td className="py-2 text-right align-top">
                          <label className="sr-only" htmlFor={id}>{`Mark for ${r.criterion} of short answer ${item.order}, out of ${r.maxPoints}`}</label>
                          <div className="inline-flex items-center gap-1.5">
                            <input
                              id={id}
                              inputMode="decimal"
                              value={draft.marks[r.criterion] ?? ''}
                              disabled={!editable}
                              onChange={(e) => onMark(item.questionId, r.criterion, e.target.value)}
                              aria-invalid={!!error}
                              className={`w-16 rounded-lg border px-2 py-1.5 text-right text-sm tabular-nums ${error ? 'border-[var(--t-danger)]' : 'border-[var(--t-border)]'} bg-[var(--t-surface)] text-[var(--t-text)] disabled:opacity-70`}
                            />
                            <span className="text-xs text-[var(--t-text-muted)]">/ {r.maxPoints}</span>
                          </div>
                          {error && (
                            <p role="alert" className="mt-0.5 text-[11px] text-[var(--t-danger)]">
                              {error}
                            </p>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div>
              <label htmlFor={`comment-${item.questionId}`} className="mb-1 block text-xs font-semibold text-[var(--t-text)]">
                Note for the student (optional)
              </label>
              <textarea
                id={`comment-${item.questionId}`}
                value={draft.comment}
                disabled={!editable}
                onChange={(e) => onComment(item.questionId, e.target.value)}
                rows={2}
                maxLength={1000}
                placeholder="What was good, and what would have earned the missing marks."
                className="w-full rounded-lg border border-[var(--t-border)] bg-[var(--t-surface)] px-3 py-2 text-sm text-[var(--t-text)] disabled:opacity-70"
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
