'use client';

// One learner on the teacher's class test monitor: who they are, how far they
// have got, how long they have been at it, and what the teacher can do —
// "Lock & submit" while they work, "Close test" before they start, "Reopen" after.
//
// The lock buttons ask for confirmation INLINE (no pop-up to lose track of while
// a class is running), and say exactly what will happen. Copy avoids gendered
// pronouns: the teacher knows who the learner is.

import { Check, ExternalLink, Loader2, Lock, RotateCcw } from 'lucide-react';
import { formatElapsed } from '@/lib/assessment/progress';
import { percent, studentBadge, studentElapsedMs, type BadgeTone } from '@/lib/assessment/classProgress';
import type { ClassTestStudent } from '@/lib/assessment/types';

const TONE: Record<BadgeTone, string> = {
  neutral: 'border-[var(--ar-border-strong)] text-[var(--ar-muted)]',
  info: 'border-[var(--ar-accent)]/50 bg-[var(--ar-accent-soft)] text-[var(--ar-accent)]',
  success: 'border-[var(--ar-success)]/40 bg-[var(--ar-success)]/10 text-[var(--ar-success)]',
  warning: 'border-[var(--ar-warning)]/50 bg-[var(--ar-warning)]/10 text-[var(--ar-warning)]',
};

export type CardAction = 'lock' | 'close' | 'reopen';

export default function ClassTestStudentCard({
  student,
  now,
  clockOffsetMs,
  hasCoding,
  canLock,
  busy,
  confirming,
  onAsk,
  onCancel,
  onConfirm,
  roomy,
}: {
  student: ClassTestStudent;
  now: number;
  clockOffsetMs: number;
  /** The test has a coding project (Final Test). */
  hasCoding: boolean;
  canLock: boolean;
  /** A lock/close/reopen for this learner is in flight. */
  busy: boolean;
  /** This learner's action is waiting for the teacher's "yes". */
  confirming: CardAction | null;
  onAsk: (action: CardAction) => void;
  onCancel: () => void;
  onConfirm: (action: CardAction) => void;
  /** More padding and type — the standalone page, not the classroom dock. */
  roomy?: boolean;
}) {
  const badge = studentBadge(student);
  const a = student.attempt;
  const elapsed = studentElapsedMs(student, now, clockOffsetMs);
  const pct = a ? percent(a.answered, a.total) : 0;
  const initial = student.studentName.trim().charAt(0).toUpperCase() || '?';
  const name = student.studentName;

  return (
    <div
      data-testid={`student-card-${name}`}
      data-state={student.state}
      className={`flex min-w-0 flex-col gap-2 rounded-xl border border-[var(--ar-border)] bg-[var(--ar-bg)] ${roomy ? 'p-4' : 'p-2.5'}`}
    >
      {/* Who + stopwatch */}
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[var(--ar-accent-soft)] text-xs font-bold text-[var(--ar-accent)]"
        >
          {initial}
        </span>
        <p className={`min-w-0 flex-1 truncate font-semibold text-[var(--ar-text)] ${roomy ? 'text-sm' : 'text-[13px]'}`} title={name}>
          {name}
        </p>
        {elapsed !== null && (
          <span
            className="flex-shrink-0 text-xs font-medium tabular-nums text-[var(--ar-muted)]"
            title={student.state === 'IN_PROGRESS' ? 'Time on the test so far' : 'Time the test took'}
          >
            ⏱ {formatElapsed(elapsed)}
          </span>
        )}
      </div>

      {/* Progress */}
      {a ? (
        <div className="space-y-1">
          <div
            role="progressbar"
            aria-label={`${name}: ${a.answered} of ${a.total} answered`}
            aria-valuemin={0}
            aria-valuemax={a.total}
            aria-valuenow={a.answered}
            className="h-2 overflow-hidden rounded-full bg-[var(--ar-surface-2)]"
          >
            <div
              className={`h-full rounded-full transition-all duration-500 ${student.state === 'SUBMITTED' ? 'bg-[var(--ar-success)]' : 'bg-[var(--ar-accent)]'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex items-center justify-between gap-2 text-[11px] text-[var(--ar-muted)]">
            <span className="tabular-nums">
              <strong className="text-[var(--ar-text)]">{a.answered}</strong> of {a.total} answered
            </span>
            {hasCoding && <span>{a.codingSaved ? '💻 Code started' : '💻 No code yet'}</span>}
          </div>
        </div>
      ) : (
        <p className="text-[11px] text-[var(--ar-muted)]">
          {student.state === 'CLOSED' ? 'Test closed — they can’t start it.' : 'Waiting to start the test…'}
        </p>
      )}

      {/* Status + action */}
      {confirming ? (
        <div role="alertdialog" aria-label={`Confirm for ${name}`} className="space-y-2 rounded-lg border border-[var(--ar-border-strong)] bg-[var(--ar-surface)] p-2.5">
          <p className="text-xs font-semibold text-[var(--ar-text)]">
            {confirming === 'lock' && `Lock & submit ${name}’s test?`}
            {confirming === 'close' && `Close the test for ${name}?`}
            {confirming === 'reopen' && `Let ${name} start the test?`}
          </p>
          <p className="text-[11px] leading-snug text-[var(--ar-muted)]">
            {confirming === 'lock' &&
              (a && a.answered > 0
                ? `Their ${a.answered} saved answer${a.answered === 1 ? '' : 's'} will be submitted now, and they won’t be able to change anything.`
                : 'They haven’t answered anything yet, so a blank test will be submitted and they won’t be able to continue.')}
            {confirming === 'close' && 'They haven’t started, so they won’t be able to start it. You can reopen it later.'}
            {confirming === 'reopen' && 'They will be able to start the test again.'}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              data-testid={`confirm-${confirming}-${name}`}
              onClick={() => onConfirm(confirming)}
              disabled={busy}
              className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60 ${
                confirming === 'reopen' ? 'bg-[var(--ar-accent)]' : 'bg-[var(--ar-danger)]'
              }`}
            >
              {busy ? <Loader2 size={13} className="animate-spin" /> : confirming === 'reopen' ? <RotateCcw size={13} /> : <Lock size={13} />}
              {confirming === 'lock' ? 'Lock & submit' : confirming === 'close' ? 'Close test' : 'Reopen'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="rounded-lg border border-[var(--ar-border-strong)] px-2.5 py-1.5 text-xs text-[var(--ar-text)] hover:bg-[var(--ar-surface-2)] disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${TONE[badge.tone]}`}>
            {student.state === 'SUBMITTED' && <Check size={11} />}
            {student.state === 'CLOSED' && <Lock size={11} />}
            {badge.label}
          </span>

          {student.state === 'IN_PROGRESS' && canLock && (
            <button
              type="button"
              data-testid={`lock-one-${name}`}
              onClick={() => onAsk('lock')}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--ar-danger)]/60 px-2.5 py-1 text-xs font-semibold text-[var(--ar-danger)] hover:bg-[var(--ar-danger)]/10 disabled:opacity-60"
            >
              {busy ? <Loader2 size={13} className="animate-spin" /> : <Lock size={13} />} Lock &amp; submit
            </button>
          )}
          {student.state === 'NOT_STARTED' && canLock && (
            <button
              type="button"
              data-testid={`close-one-${name}`}
              onClick={() => onAsk('close')}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--ar-border-strong)] px-2.5 py-1 text-xs font-medium text-[var(--ar-text)] hover:bg-[var(--ar-surface-2)] disabled:opacity-60"
            >
              {busy ? <Loader2 size={13} className="animate-spin" /> : <Lock size={13} />} Close test
            </button>
          )}
          {student.state === 'CLOSED' && canLock && (
            <button
              type="button"
              data-testid={`reopen-one-${name}`}
              onClick={() => onAsk('reopen')}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--ar-border-strong)] px-2.5 py-1 text-xs font-medium text-[var(--ar-text)] hover:bg-[var(--ar-surface-2)] disabled:opacity-60"
            >
              {busy ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />} Reopen
            </button>
          )}
          {student.state === 'SUBMITTED' && a?.report && (
            <a
              href={`/teacher-test-evaluations/${a.report.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-[var(--ar-accent)] hover:underline"
            >
              Report card <ExternalLink size={11} />
            </a>
          )}
        </div>
      )}
    </div>
  );
}
