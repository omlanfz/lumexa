'use client';

// The teacher's test dashboard: every learner of the class at a glance — state,
// answers so far, own stopwatch — and the controls to end the test.
//
// Students sit the test in their own browser tab while sharing their whole
// screen, so nothing about the test lives on the classroom stage any more. That
// is why this is a fixed dock ABOVE the stage (and a floating bar over a
// fullscreen screen share): whatever the stage is showing — the lesson, a camera,
// one share or four — the teacher still sees everyone's progress.
//
// Time limits are the teacher's call and learners start at different moments, so
// the buttons are how a test ends:
//   * "Lock & submit" (per learner) — their test is submitted with what is saved
//     and they can no longer change it.
//   * "Time's up — lock & submit all" — the same for everyone in the class.
// Nothing a learner has saved is ever lost; both ask for confirmation first, and
// say exactly what will happen.

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Loader2, Lock, RefreshCw, Users, X } from 'lucide-react';
import { errorMessage, getClassStatus, lockClassTests, lockStudentTest, reopenStudentTest } from '@/lib/assessment/api';
import {
  describeLockAll,
  describeLockOne,
  plural,
  previewLockAll,
  summarizeClass,
  type LockReport,
} from '@/lib/assessment/classProgress';
import type { ClassTestOverview, ClassTestStudent } from '@/lib/assessment/types';
import { themeVars, Variant } from './theme';
import ClassTestStudentCard, { type CardAction } from './ClassTestStudentCard';

const POLL_MS = 4_000;
const COLLAPSE_KEY = 'lumexa:class-test-monitor:collapsed';

export type MonitorLayout = 'dock' | 'overlay' | 'page';

interface Notice {
  tone: 'success' | 'warning';
  text: string;
  failures: LockReport['failures'];
}

/** The teacher's own choice if they made one; otherwise open on a screen with
 *  room for the cards and folded away on a phone, where they would fill it. */
function readCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const stored = window.localStorage.getItem(COLLAPSE_KEY);
    if (stored === '1') return true;
    if (stored === '0') return false;
  } catch {
    /* blocked storage — fall through to the default */
  }
  return window.innerWidth < 640;
}

export default function ClassTestMonitor({
  scheduledLessonId,
  variant,
  layout,
  canLock = true,
}: {
  scheduledLessonId: string;
  /** Which design tokens the host uses: the classroom's or the teacher pages'. */
  variant: Extract<Variant, 'classroom' | 'teacher'>;
  /** 'dock' = a strip above the classroom stage · 'overlay' = floating over a
   *  fullscreen screen share · 'page' = a roomy panel on a standalone page. */
  layout: MonitorLayout;
  /** An admin looking in can watch but not lock. */
  canLock?: boolean;
}) {
  const [overview, setOverview] = useState<ClassTestOverview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [collapsed, setCollapsed] = useState(layout !== 'page' && readCollapsed());
  const [confirmOne, setConfirmOne] = useState<{ id: string; action: CardAction } | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const [busy, setBusy] = useState<string | null>(null); // a scheduledLessonId, or 'all'
  const [notice, setNotice] = useState<Notice | null>(null);

  const inflight = useRef(false);
  const latestRequest = useRef(0);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // `force` is for right after a lock: it must not be skipped because a routine
  // poll is in flight, and an answer that was asked for BEFORE the lock (and so
  // still shows the old state) must never overwrite the fresh one.
  const refresh = useCallback(
    async (force = false) => {
      if (inflight.current && !force) return;
      inflight.current = true;
      const mine = ++latestRequest.current;
      try {
        const fresh = await getClassStatus(scheduledLessonId);
        if (mine !== latestRequest.current) return;
        setOverview(fresh);
        setNow(Date.now());
        setLoadError(null);
        setStale(false);
      } catch (err) {
        if (mine !== latestRequest.current) return;
        setStale(true);
        setLoadError(errorMessage(err, "Couldn't load the class's test progress."));
      } finally {
        if (mine === latestRequest.current) inflight.current = false;
      }
    },
    [scheduledLessonId],
  );

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => {
      if (!document.hidden) void refresh();
    }, POLL_MS);
    const onVisible = () => {
      if (!document.hidden) void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh]);

  // One-second tick for the stopwatches, only while someone is still working.
  const anyRunning = !!overview?.students.some((s) => s.state === 'IN_PROGRESS');
  useEffect(() => {
    if (!anyRunning) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [anyRunning]);

  useEffect(
    () => () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    },
    [],
  );

  const showNotice = (n: Notice) => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    setNotice(n);
    // Good news fades; a problem stays until it is dismissed.
    if (n.tone === 'success') noticeTimer.current = setTimeout(() => setNotice(null), 10_000);
  };

  const toggleCollapsed = () => {
    setCollapsed((v) => {
      try {
        window.localStorage.setItem(COLLAPSE_KEY, v ? '0' : '1');
      } catch {
        /* a per-viewer convenience only */
      }
      return !v;
    });
  };

  const students: ClassTestStudent[] = overview?.students ?? [];
  const summary = summarizeClass(students);
  const hasCoding = (overview?.assessment?.counts.practical ?? 0) > 0;

  const runOne = async (student: ClassTestStudent, action: CardAction) => {
    setBusy(student.scheduledLessonId);
    setNotice(null);
    try {
      if (action === 'reopen') {
        await reopenStudentTest(student.scheduledLessonId);
        showNotice({ tone: 'success', text: `${student.studentName} can start the test again.`, failures: [] });
      } else {
        const r = await lockStudentTest(student.scheduledLessonId);
        showNotice({ tone: r.outcome === 'FAILED' ? 'warning' : 'success', text: describeLockOne(r), failures: [] });
      }
      setConfirmOne(null);
      await refresh(true);
    } catch (err) {
      showNotice({
        tone: 'warning',
        text: errorMessage(err, `That didn't work for ${student.studentName}. Please try again.`),
        failures: [],
      });
    } finally {
      setBusy(null);
    }
  };

  const runAll = async () => {
    setBusy('all');
    setNotice(null);
    try {
      const report = describeLockAll(await lockClassTests(scheduledLessonId));
      showNotice({ tone: report.tone, text: report.headline, failures: report.failures });
      setConfirmAll(false);
      setConfirmOne(null);
      await refresh(true);
    } catch (err) {
      setConfirmAll(false);
      showNotice({
        tone: 'warning',
        text: errorMessage(err, "The tests couldn't be locked — nothing was changed that you can't repeat. Please press the button again."),
        failures: [],
      });
    } finally {
      setBusy(null);
    }
  };

  const roomy = layout === 'page';
  const sectionClass =
    layout === 'overlay'
      ? 'rounded-2xl border border-white/15 bg-[var(--ar-surface)]/97 shadow-2xl backdrop-blur-md'
      : 'rounded-2xl border border-[var(--ar-border)] bg-[var(--ar-surface)] shadow-sm';
  // items-start: a card asking for confirmation grows on its own, without
  // stretching its neighbours into tall empty boxes.
  const gridClass = roomy
    ? 'grid items-start gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(100%,18rem),1fr))]'
    : 'grid items-start gap-2 [grid-template-columns:repeat(auto-fit,minmax(min(100%,14.5rem),1fr))]';

  const lockAllButton =
    canLock && summary.total > 0 ? (
      summary.needsLock > 0 ? (
        <button
          type="button"
          data-testid="lock-all-button"
          onClick={() => setConfirmAll(true)}
          disabled={busy !== null}
          title="Time's up — submit every learner's saved answers and lock the test for the whole class"
          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--ar-danger)] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-60"
        >
          {busy === 'all' ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
          <span className="hidden @lg:inline">Time’s up — lock &amp; submit all</span>
          <span className="@lg:hidden">Lock &amp; submit all</span>
        </button>
      ) : (
        <span
          data-testid="all-locked"
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--ar-success)]/40 bg-[var(--ar-success)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--ar-success)]"
        >
          <CheckCircle2 size={14} /> All tests locked
        </span>
      )
    ) : null;

  return (
    <div className="w-full text-[var(--ar-text)]" style={themeVars(variant)} data-testid="class-test-monitor" data-layout={layout}>
      {/* The container is its own element, and the confirmation sits OUTSIDE it:
          a size container is also the containing block of fixed descendants, so a
          dialog inside it would be positioned against this strip, not the screen. */}
      <div className="@container w-full">
        <section className={sectionClass} aria-label="Class test progress">
          {/* Header */}
          <div className={`flex flex-wrap items-center gap-x-3 gap-y-2 ${roomy ? 'px-4 py-3' : 'px-3 py-2'}`}>
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Users size={16} className="flex-shrink-0 text-[var(--ar-accent)]" aria-hidden />
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold leading-tight">
                  Test progress
                  {overview?.assessment && <span className="font-normal text-[var(--ar-muted)]"> · {overview.assessment.title}</span>}
                </p>
                {summary.total > 0 && (
                  <p className="flex flex-wrap items-center gap-x-2 text-[11px] leading-tight text-[var(--ar-muted)]" aria-live="polite">
                    {summary.inProgress > 0 && <span className="font-medium text-[var(--ar-accent)]">{summary.inProgress} in progress</span>}
                    {summary.submitted > 0 && <span className="text-[var(--ar-success)]">{summary.submitted} submitted</span>}
                    {summary.notStarted > 0 && <span>{summary.notStarted} not started</span>}
                    {summary.closed > 0 && <span className="text-[var(--ar-warning)]">{summary.closed} closed</span>}
                    {summary.total > 1 && <span className="text-[var(--ar-faint)]">· {plural(summary.total, 'student')}</span>}
                  </p>
                )}
              </div>
            </div>

            {stale && overview && (
              <span role="status" className="inline-flex items-center gap-1 text-[11px] text-[var(--ar-warning)]">
                <RefreshCw size={11} className="animate-spin" /> Can’t reach Lumexa — retrying…
              </span>
            )}
            {lockAllButton}
            {layout !== 'page' && (
              <button
                type="button"
                onClick={toggleCollapsed}
                aria-expanded={!collapsed}
                aria-label={collapsed ? 'Show every student’s progress' : 'Hide the student cards'}
                title={collapsed ? 'Show every student’s progress' : 'Hide the student cards'}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--ar-muted)] hover:bg-[var(--ar-surface-2)] hover:text-[var(--ar-text)]"
              >
                {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
              </button>
            )}
          </div>

          {/* Result of the last lock */}
          {notice && (
            <div
              role="status"
              data-testid="monitor-notice"
              className={`mx-3 mb-2 flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${
                notice.tone === 'success'
                  ? 'border-[var(--ar-success)]/40 bg-[var(--ar-success)]/10'
                  : 'border-[var(--ar-warning)]/50 bg-[var(--ar-warning)]/10'
              }`}
            >
              {notice.tone === 'success' ? (
                <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0 text-[var(--ar-success)]" />
              ) : (
                <AlertTriangle size={14} className="mt-0.5 flex-shrink-0 text-[var(--ar-warning)]" />
              )}
              <div className="min-w-0 flex-1">
                <p>{notice.text}</p>
                {notice.failures.length > 0 && (
                  <ul className="mt-1 list-disc pl-4 text-[11px] text-[var(--ar-muted)]">
                    {notice.failures.map((f) => (
                      <li key={f.name}>
                        <strong>{f.name}</strong> — {f.error}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss" className="text-[var(--ar-faint)] hover:text-[var(--ar-text)]">
                <X size={13} />
              </button>
            </div>
          )}

          {/* Body */}
          {!collapsed && (
            <div className={roomy ? 'px-4 pb-4' : 'px-3 pb-3'}>
              {!overview && !loadError && (
                <p className="flex items-center gap-2 py-3 text-xs text-[var(--ar-muted)]" role="status">
                  <Loader2 size={14} className="animate-spin" /> Loading everyone’s progress…
                </p>
              )}
              {!overview && loadError && (
                <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--ar-danger)]/40 bg-[var(--ar-danger)]/10 px-3 py-2 text-xs">
                  <AlertTriangle size={14} className="text-[var(--ar-danger)]" />
                  <span className="min-w-0 flex-1">{loadError}</span>
                  <button
                    type="button"
                    onClick={() => void refresh()}
                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--ar-border-strong)] px-2.5 py-1 hover:bg-[var(--ar-surface-2)]"
                  >
                    <RefreshCw size={12} /> Try again
                  </button>
                </div>
              )}
              {overview && overview.students.length === 0 && (
                <p className="py-2 text-xs text-[var(--ar-muted)]">No students are scheduled for this test yet.</p>
              )}
              {overview && overview.students.length > 0 && (
                <div className={gridClass}>
                  {overview.students.map((s) => (
                    <ClassTestStudentCard
                      key={s.scheduledLessonId}
                      student={s}
                      now={now}
                      clockOffsetMs={overview.clockOffsetMs}
                      hasCoding={hasCoding}
                      canLock={canLock}
                      roomy={roomy}
                      busy={busy === s.scheduledLessonId}
                      confirming={confirmOne?.id === s.scheduledLessonId ? confirmOne.action : null}
                      onAsk={(action) => setConfirmOne({ id: s.scheduledLessonId, action })}
                      onCancel={() => setConfirmOne(null)}
                      onConfirm={(action) => void runOne(s, action)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {confirmAll && (
        <LockAllDialog
          students={students}
          busy={busy === 'all'}
          onCancel={() => setConfirmAll(false)}
          onConfirm={() => void runAll()}
        />
      )}
    </div>
  );
}

// ── "Time's up" confirmation ────────────────────────────────────────────────

function LockAllDialog({
  students,
  busy,
  onCancel,
  onConfirm,
}: {
  students: ClassTestStudent[];
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const preview = previewLockAll(students);
  const keepGoing = useRef<HTMLButtonElement | null>(null);

  // Focus the safe choice, and let Escape back out.
  useEffect(() => {
    keepGoing.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onCancel]);

  const nothingToDo = preview.submitNow.length === 0 && preview.closeNow.length === 0;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/55 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="lock-all-title"
        data-testid="confirm-lock-all"
        className="w-full max-w-md space-y-3 rounded-2xl border border-[var(--ar-border-strong)] bg-[var(--ar-surface)] p-5 text-[var(--ar-text)] shadow-2xl"
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[var(--ar-danger)]/12 text-[var(--ar-danger)]">
            <Lock size={18} />
          </span>
          <div>
            <h2 id="lock-all-title" className="text-base font-bold leading-tight">
              Time’s up — lock the test for everyone?
            </h2>
            <p className="mt-1 text-xs text-[var(--ar-muted)]">
              Nobody will be able to change or start the test afterwards. Everything already saved is kept and goes to your Test Evaluations.
            </p>
          </div>
        </div>

        <ul className="space-y-2 text-sm">
          {preview.submitNow.length > 0 && (
            <li>
              <p className="font-medium">
                {plural(preview.submitNow.length, 'test')} in progress — submitted now with what’s saved
              </p>
              <ul className="mt-1 space-y-0.5 text-xs text-[var(--ar-muted)]">
                {preview.submitNow.map((s) => (
                  <li key={s.name} className="flex justify-between gap-3">
                    <span className="truncate">{s.name}</span>
                    <span className="flex-shrink-0 tabular-nums">
                      {s.answered} of {s.total} answered
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          )}
          {preview.closeNow.length > 0 && (
            <li>
              <p className="font-medium">{plural(preview.closeNow.length, 'student')} not started — can no longer start</p>
              <p className="mt-0.5 text-xs text-[var(--ar-muted)]">{preview.closeNow.join(', ')}</p>
            </li>
          )}
          {preview.unchanged > 0 && (
            <li className="text-xs text-[var(--ar-muted)]">{plural(preview.unchanged, 'student')} already finished — nothing changes for them.</li>
          )}
          {nothingToDo && <li className="text-xs text-[var(--ar-muted)]">Everyone’s test is already locked.</li>}
        </ul>

        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <button
            ref={keepGoing}
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg border border-[var(--ar-border-strong)] px-4 py-2 text-sm font-medium hover:bg-[var(--ar-surface-2)] disabled:opacity-60"
          >
            Keep going
          </button>
          <button
            type="button"
            data-testid="confirm-lock-all-yes"
            onClick={onConfirm}
            disabled={busy || nothingToDo}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--ar-danger)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Lock size={15} />}
            {busy ? 'Locking…' : 'Lock & submit all'}
          </button>
        </div>
      </div>
    </div>
  );
}
