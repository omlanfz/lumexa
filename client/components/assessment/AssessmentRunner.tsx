'use client';

// A student's whole test experience for ONE scheduled class — used both inside
// the live classroom (LessonPanel) and on the standalone /assessment page, so
// the two can never drift apart.
//
//   loading → intro (not started) → taking → submitted (teacher reviewing)
//                                          → released (teacher approved)
//
// Every state the student can be in has a visible, worded status: loading,
// couldn't-load (with retry), not-open-yet / closed / unpublished, in progress,
// submitted, and results. See TestTakingView for the saving/submitting rules.

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ClipboardList, Loader2, Play, RefreshCw } from 'lucide-react';
import { errorMessage, getAttempt, getTestStatus, startAttempt } from '@/lib/assessment/api';
import { testTypeLabel } from '@/lib/assessment/progress';
import type { AttemptView, LessonTestStatus } from '@/lib/assessment/types';
import { themeVars, Variant } from './theme';
import TestTakingView from './TestTakingView';
import { ResultsPanel, SubmittedPanel } from './TestResultView';

const RELEASE_POLL_MS = 15_000;

export default function AssessmentRunner({
  scheduledLessonId,
  variant,
}: {
  scheduledLessonId: string;
  variant: Exclude<Variant, 'teacher'>;
}) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [status, setStatus] = useState<LessonTestStatus | null>(null);
  const [attempt, setAttempt] = useState<AttemptView | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const st = await getTestStatus(scheduledLessonId);
      setStatus(st);
      setAttempt(st.attempt ? await getAttempt(st.attempt.id) : null);
    } catch (err) {
      setLoadError(errorMessage(err, "We couldn't load this test. Check your connection and try again."));
    } finally {
      setLoading(false);
    }
  }, [scheduledLessonId]);

  useEffect(() => {
    void load();
  }, [load]);

  // While the teacher is reviewing, quietly check whether the result was released.
  const attemptId = attempt?.id;
  const attemptStatus = attempt?.status;
  useEffect(() => {
    if (!attemptId || attemptStatus !== 'SUBMITTED') return;
    const t = setInterval(() => {
      getAttempt(attemptId)
        .then((fresh) => setAttempt(fresh))
        .catch(() => {
          /* transient — try again next tick */
        });
    }, RELEASE_POLL_MS);
    return () => clearInterval(t);
  }, [attemptId, attemptStatus]);

  const start = async () => {
    if (!status?.assessment) return;
    setStarting(true);
    setStartError(null);
    try {
      setAttempt(await startAttempt(status.assessment.id, scheduledLessonId));
    } catch (err) {
      setStartError(errorMessage(err, "We couldn't start the test. Please try again."));
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="@container w-full text-[var(--ar-text)]" style={themeVars(variant)}>
      {loading ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-sm text-[var(--ar-muted)]" role="status">
          <Loader2 className="animate-spin" size={24} />
          Loading your test…
        </div>
      ) : loadError ? (
        <ErrorBox message={loadError} onRetry={() => void load()} />
      ) : !status?.assessment ? (
        <Notice icon={<ClipboardList size={26} />} title="No test is linked to this session yet">
          Your teacher can see this too — please let them know so Lumexa Operations can set the test up.
        </Notice>
      ) : attempt && attempt.status === 'IN_PROGRESS' ? (
        <TestTakingView key={attempt.id} attempt={attempt} onSubmitted={setAttempt} hideTitle={variant === 'classroom'} />
      ) : attempt && attempt.status === 'SUBMITTED' ? (
        <SubmittedPanel attempt={attempt} />
      ) : attempt && attempt.status === 'GRADED' ? (
        <ResultsPanel attempt={attempt} />
      ) : (
        <Intro status={status} starting={starting} startError={startError} onStart={() => void start()} />
      )}
    </div>
  );
}

function Intro({
  status,
  starting,
  startError,
  onStart,
}: {
  status: LessonTestStatus;
  starting: boolean;
  startError: string | null;
  onStart: () => void;
}) {
  const a = status.assessment!;
  const objective = a.counts.mcq + a.counts.trueFalse;
  const empty = objective === 0;
  const parts: string[] = [];
  if (a.counts.mcq) parts.push(`${a.counts.mcq} multiple-choice`);
  if (a.counts.trueFalse) parts.push(`${a.counts.trueFalse} True/False`);

  return (
    <section className="space-y-4 rounded-xl border border-[var(--ar-border)] bg-[var(--ar-surface)] p-5">
      <div className="flex items-start gap-3">
        <ClipboardList size={28} className="mt-0.5 flex-shrink-0 text-[var(--ar-accent)]" />
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ar-faint)]">{testTypeLabel(a.type)}</p>
          <h2 className="text-lg font-bold leading-tight text-[var(--ar-text)]">{a.title}</h2>
        </div>
      </div>

      {empty ? (
        <p role="alert" className="rounded-lg border border-[var(--ar-warning)]/40 bg-[var(--ar-warning)]/10 px-3 py-2 text-sm">
          This test has no questions yet. Please tell your teacher so Lumexa Operations can fix it.
        </p>
      ) : (
        <>
          <ul className="space-y-1.5 text-sm text-[var(--ar-text)]">
            <li>
              📝 <strong>{objective} questions</strong> — {parts.join(' and ')}. Each is worth 1 mark.
            </li>
            {a.counts.practical > 0 && <li>💻 Plus <strong>one small coding project</strong> (about 15 minutes) that your teacher marks.</li>}
            <li>🔘 Choose <strong>one answer</strong> for each question. You can go back and change answers any time before you submit.</li>
            <li>💾 Your answers <strong>save automatically</strong>. If you refresh the page, you&apos;ll continue where you left off.</li>
            <li>🔒 When you press <strong>Submit</strong>, your test is locked. Your teacher then reviews it and shares your result.</li>
          </ul>
          {!a.isPublished && (
            <p role="alert" className="rounded-lg border border-[var(--ar-warning)]/40 bg-[var(--ar-warning)]/10 px-3 py-2 text-sm">
              This test hasn&apos;t been opened for students yet. Ask your teacher.
            </p>
          )}
          {startError && (
            <p role="alert" className="flex items-start gap-2 rounded-lg border border-[var(--ar-danger)]/40 bg-[var(--ar-danger)]/10 px-3 py-2 text-sm">
              <AlertTriangle size={16} className="mt-0.5 flex-shrink-0 text-[var(--ar-danger)]" />
              {startError}
            </p>
          )}
          <button
            type="button"
            onClick={onStart}
            disabled={starting || !a.isPublished}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--ar-accent)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {starting ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            {starting ? 'Starting…' : startError ? 'Try again' : 'Start test'}
          </button>
        </>
      )}
    </section>
  );
}

function ErrorBox({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <section role="alert" className="space-y-3 rounded-xl border border-[var(--ar-danger)]/40 bg-[var(--ar-danger)]/10 p-5 text-center">
      <AlertTriangle size={26} className="mx-auto text-[var(--ar-danger)]" />
      <p className="text-sm text-[var(--ar-text)]">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-2 rounded-lg border border-[var(--ar-border-strong)] px-4 py-2 text-sm font-medium text-[var(--ar-text)] hover:bg-[var(--ar-surface)]"
      >
        <RefreshCw size={14} /> Try again
      </button>
    </section>
  );
}

function Notice({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2 rounded-xl border border-[var(--ar-border)] bg-[var(--ar-surface)] p-6 text-center text-[var(--ar-muted)]">
      <div className="mx-auto w-fit text-[var(--ar-faint)]">{icon}</div>
      <p className="font-semibold text-[var(--ar-text)]">{title}</p>
      <p className="text-sm">{children}</p>
    </section>
  );
}
