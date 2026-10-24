'use client';

// A student's test, taken in its OWN browser tab (the /assessment/[id] page).
//
// Students share their whole screen while they sit a test so the teacher can
// follow along, and a screen share takes over the classroom stage — so the test
// never lives inside the classroom. "Start test" in the classroom opens this page
// in a new tab with ?autostart=1 (see StudentTestLauncher); the attempt is then
// created here and the stopwatch starts from 00:00.
//
//   loading → intro (not started) → taking → submitted (teacher reviewing)
//                                          → released (teacher approved)
//                                   ↘ locked by the teacher (submitted as saved)
//
// Every state the student can be in has a visible, worded status: loading,
// couldn't-load (with retry), not-open-yet / closed / unpublished, in progress,
// submitted, locked by the teacher, and results. See TestTakingView for the
// saving/submitting rules.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ClipboardList, Loader2, Lock, Play, RefreshCw } from 'lucide-react';
import { errorMessage, getAttempt, getAttemptState, getTestStatus, startAttempt } from '@/lib/assessment/api';
import { testTypeLabel } from '@/lib/assessment/progress';
import { HEARTBEAT_EVERY_MS, clearTestTabHeartbeat, writeTestTabHeartbeat } from '@/lib/assessment/testTab';
import type { AttemptView, LessonTestStatus } from '@/lib/assessment/types';
import { themeVars } from './theme';
import TestTakingView from './TestTakingView';
import { ResultsPanel, SubmittedPanel } from './TestResultView';

const RELEASE_POLL_MS = 15_000;
/** How often a test in progress asks "is my test still open?" — the teacher can
 *  lock it at any moment, and the student should be told within seconds. */
const STATE_POLL_MS = 4_000;

function safeStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** ?autostart=1 is for the first load only: take it off the address so a refresh
 *  or the browser history can never start a test by itself. */
function dropAutostartFromUrl() {
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has('autostart')) return;
    url.searchParams.delete('autostart');
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  } catch {
    /* cosmetic */
  }
}

export default function AssessmentRunner({
  scheduledLessonId,
  autostart = false,
  backHref,
  backLabel = 'Back',
}: {
  scheduledLessonId: string;
  /** Start the test as soon as the page has loaded (set by "Start test" in the
   *  classroom). Only ever honoured for a test that has not been started. */
  autostart?: boolean;
  backHref: string;
  backLabel?: string;
}) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [status, setStatus] = useState<LessonTestStatus | null>(null);
  const [attempt, setAttempt] = useState<AttemptView | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const load = useCallback(
    async (opts: { autostart?: boolean; isCancelled?: () => boolean } = {}) => {
      const cancelled = () => !!opts.isCancelled?.();
      setLoading(true);
      setLoadError(null);
      try {
        const st = await getTestStatus(scheduledLessonId);
        if (cancelled()) return;
        setStatus(st);
        if (st.attempt) {
          const fresh = await getAttempt(st.attempt.id);
          if (!cancelled()) setAttempt(fresh);
          return;
        }
        setAttempt(null);
        const a = st.assessment;
        if (opts.autostart && a && a.isPublished && !st.closedAt && a.counts.mcq + a.counts.trueFalse > 0) {
          // Keep the loading screen up while it starts — no flash of the intro.
          try {
            const started = await startAttempt(a.id, scheduledLessonId);
            if (!cancelled()) setAttempt(started);
          } catch (err) {
            if (!cancelled()) setStartError(errorMessage(err, "We couldn't start the test. Please try again."));
          }
        }
      } catch (err) {
        if (!cancelled()) setLoadError(errorMessage(err, "We couldn't load this test. Check your connection and try again."));
      } finally {
        if (!cancelled()) setLoading(false);
      }
    },
    [scheduledLessonId],
  );

  useEffect(() => {
    let cancelled = false;
    void load({ autostart, isCancelled: () => cancelled }).then(() => {
      if (!cancelled && autostart) dropAutostartFromUrl();
    });
    return () => {
      cancelled = true;
    };
  }, [load, autostart]);

  const attemptId = attempt?.id;
  const attemptStatus = attempt?.status;

  // Name the browser tab after the test, so it can be told apart from the
  // classroom tab.
  const testTitle = status?.assessment?.title;
  useEffect(() => {
    if (testTitle) document.title = `${testTitle} · Lumexa`;
  }, [testTitle]);

  // Re-read the attempt: its status changed behind our back (the teacher locked
  // it, or it was submitted from somewhere else).
  const recheck = useCallback(async () => {
    if (!attemptId) return;
    try {
      const state = await getAttemptState(attemptId);
      if (state.status !== 'IN_PROGRESS') setAttempt(await getAttempt(attemptId));
    } catch {
      /* transient — the next tick tries again */
    }
  }, [attemptId]);

  // While the test is open: ask every few seconds whether it still is.
  useEffect(() => {
    if (!attemptId || attemptStatus !== 'IN_PROGRESS') return;
    const t = setInterval(() => void recheck(), STATE_POLL_MS);
    const onVisible = () => {
      if (!document.hidden) void recheck();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [attemptId, attemptStatus, recheck]);

  // Tell the classroom tab that this tab is open (it shows "Go to my test tab").
  useEffect(() => {
    if (attemptStatus !== 'IN_PROGRESS') return;
    const store = safeStorage();
    if (!store) return;
    const beat = () => writeTestTabHeartbeat(scheduledLessonId, Date.now(), store);
    const clear = () => clearTestTabHeartbeat(scheduledLessonId, store);
    beat();
    const t = setInterval(beat, HEARTBEAT_EVERY_MS);
    window.addEventListener('pagehide', clear);
    return () => {
      clearInterval(t);
      window.removeEventListener('pagehide', clear);
      clear();
    };
  }, [scheduledLessonId, attemptStatus]);

  // While the teacher is reviewing, quietly check whether the result was released.
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

  // The test in progress owns the whole window; every other state is a short
  // page, centered, with a way back.
  if (!loading && !loadError && status?.assessment && attempt?.status === 'IN_PROGRESS') {
    return (
      <div className="@container/runner w-full text-[var(--ar-text)]" style={themeVars('page')}>
        <TestTakingView key={attempt.id} attempt={attempt} onSubmitted={setAttempt} onClosed={() => void recheck()} />
      </div>
    );
  }

  // A released result is a wide two-column page; everything else is a short card.
  const wide = attempt?.status === 'GRADED';
  return (
    <div
      className={`@container mx-auto w-full space-y-4 p-4 text-[var(--ar-text)] sm:p-6 ${wide ? 'max-w-5xl' : 'max-w-2xl'}`}
      style={themeVars('page')}
    >
      <Link href={backHref} className="inline-block text-sm text-[var(--ar-accent)] hover:underline">
        ← {backLabel}
      </Link>
      {loading ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-sm text-[var(--ar-muted)]" role="status">
          <Loader2 className="animate-spin" size={24} />
          {autostart ? 'Opening your test…' : 'Loading your test…'}
        </div>
      ) : loadError ? (
        <ErrorBox message={loadError} onRetry={() => void load()} />
      ) : !status?.assessment ? (
        <Notice icon={<ClipboardList size={26} />} title="No test is linked to this session yet">
          Your teacher can see this too — please let them know so Lumexa Operations can set the test up.
        </Notice>
      ) : attempt && attempt.status === 'SUBMITTED' ? (
        <SubmittedPanel attempt={attempt} />
      ) : attempt && attempt.status === 'GRADED' ? (
        <ResultsPanel attempt={attempt} />
      ) : status.closedAt ? (
        <Notice icon={<Lock size={26} />} title="Your teacher closed this test">
          The test can no longer be started. If you think this is a mistake, please tell your teacher.
        </Notice>
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
    <section className="space-y-4 rounded-xl border border-[var(--ar-border)] bg-[var(--ar-surface)] p-5 sm:p-6">
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
            {a.counts.practical > 0 && (
              <li>
                💻 Plus <strong>one small coding project</strong> (about 15 minutes) that your teacher marks.
              </li>
            )}
            <li>
              🔘 Choose <strong>one answer</strong> for each question. You can go back and change answers any time before you submit.
            </li>
            <li>
              ⏱ The stopwatch starts at <strong>00:00</strong> when you press Start. There&apos;s no fixed time limit — your teacher tells you when time is up and
              locks the test. Everything you&apos;ve saved is submitted automatically.
            </li>
            <li>
              💾 Your answers <strong>save automatically</strong>. If you refresh the page, you&apos;ll continue where you left off.
            </li>
            <li>
              🔒 When you press <strong>Submit</strong>, your test is locked. Your teacher then reviews it and shares your result.
            </li>
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
            data-testid="start-test"
            onClick={onStart}
            disabled={starting || !a.isPublished}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--ar-accent)] px-4 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
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
