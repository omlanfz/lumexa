'use client';

// A student's test, as seen from inside the live classroom.
//
// The test itself is NOT taken here. Students share their whole screen while
// they sit it, and a screen share takes over the classroom stage — a test living
// inside the classroom would disappear for everyone the moment anyone shared. So
// "Start test" opens the test in its own browser tab (see lib/assessment/testTab)
// and this card just keeps the classroom informed: whether the test is open,
// how far along it is, and what happened to it (submitted, or locked by the
// teacher).

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardList, ExternalLink, Loader2, Lock, MonitorUp, Play, RefreshCw, Timer } from 'lucide-react';
import { errorMessage, getTestStatus } from '@/lib/assessment/api';
import { elapsedMs } from '@/lib/assessment/clock';
import { formatElapsed, testTypeLabel } from '@/lib/assessment/progress';
import { isTestTabOpen, openTestTab, testTabUrl } from '@/lib/assessment/testTab';
import type { LessonTestStatus } from '@/lib/assessment/types';
import { themeVars } from './theme';

const POLL_MS = 5_000;

export default function StudentTestLauncher({ scheduledLessonId }: { scheduledLessonId: string }) {
  const [status, setStatus] = useState<LessonTestStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [tabOpen, setTabOpen] = useState(false);
  const [blocked, setBlocked] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setStatus(await getTestStatus(scheduledLessonId));
      setLoadError(null);
    } catch (err) {
      setLoadError(errorMessage(err, "We couldn't load this test. Check your connection and try again."));
    } finally {
      setLoading(false);
    }
  }, [scheduledLessonId]);

  useEffect(() => {
    void refresh();
    const t = setInterval(() => {
      if (!document.hidden) void refresh();
    }, POLL_MS);
    const onVisible = () => {
      if (!document.hidden) void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh]);

  // The test tab writes a heartbeat; read it to say whether the tab is open.
  useEffect(() => {
    const check = () => {
      setNow(Date.now());
      try {
        setTabOpen(isTestTabOpen(scheduledLessonId, Date.now(), window.localStorage));
      } catch {
        setTabOpen(false);
      }
    };
    check();
    const t = setInterval(check, 1000);
    return () => clearInterval(t);
  }, [scheduledLessonId]);

  // Straight from the click, as browsers insist for a new tab.
  const openTest = (autostart: boolean) => {
    const result = openTestTab(scheduledLessonId, { autostart });
    setBlocked(result === 'blocked');
  };

  const a = status?.assessment;
  const attempt = status?.attempt;
  const objective = a ? a.counts.mcq + a.counts.trueFalse : 0;
  const elapsed = attempt?.status === 'IN_PROGRESS' ? elapsedMs(attempt.startedAt, now, status?.clockOffsetMs ?? 0) : null;

  return (
    <div className="@container w-full text-[var(--ar-text)]" style={themeVars('classroom')} data-testid="student-test-launcher">
      {loading ? (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-sm text-[var(--ar-muted)]" role="status">
          <Loader2 className="animate-spin" size={22} /> Loading your test…
        </div>
      ) : loadError && !status ? (
        <section role="alert" className="space-y-3 rounded-xl border border-[var(--ar-danger)]/40 bg-[var(--ar-danger)]/10 p-5 text-center">
          <AlertTriangle size={24} className="mx-auto text-[var(--ar-danger)]" />
          <p className="text-sm">{loadError}</p>
          <button
            type="button"
            onClick={() => void refresh()}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--ar-border-strong)] px-4 py-2 text-sm font-medium hover:bg-[var(--ar-surface)]"
          >
            <RefreshCw size={14} /> Try again
          </button>
        </section>
      ) : !a ? (
        <section className="space-y-2 rounded-xl border border-[var(--ar-border)] bg-[var(--ar-surface)] p-6 text-center text-[var(--ar-muted)]">
          <ClipboardList size={26} className="mx-auto text-[var(--ar-faint)]" />
          <p className="font-semibold text-[var(--ar-text)]">No test is linked to this session yet</p>
          <p className="text-sm">Your teacher can see this too — please let them know so Lumexa Operations can set the test up.</p>
        </section>
      ) : attempt?.status === 'GRADED' ? (
        <Card icon={<CheckCircle2 size={34} className="text-[var(--ar-success)]" />} title="Your result is ready" subtitle={testTypeLabel(a.type)}>
          <p className="text-sm text-[var(--ar-muted)]">Your teacher has reviewed your test and shared your result.</p>
          <OpenTestButton label="View my result" onClick={() => openTest(false)} />
          <BlockedNote blocked={blocked} href={testTabUrl(scheduledLessonId)} />
        </Card>
      ) : attempt?.status === 'SUBMITTED' ? (
        attempt.lockedByTeacher ? (
          <Card icon={<Lock size={30} className="text-[var(--ar-warning)]" />} title="Your teacher locked the test" subtitle={testTypeLabel(a.type)}>
            <p className="text-sm text-[var(--ar-text)]">
              Time was up, so your teacher locked the test. The <strong>{attempt.answered} answer{attempt.answered === 1 ? '' : 's'}</strong> you had saved
              (of {attempt.total}) were submitted automatically — nothing you saved was lost.
            </p>
            <p className="text-xs text-[var(--ar-muted)]">Your teacher will review your test and share your result. You can stop sharing your screen now if your teacher says so.</p>
          </Card>
        ) : (
          <Card icon={<CheckCircle2 size={34} className="text-[var(--ar-success)]" />} title="Test submitted" subtitle={testTypeLabel(a.type)}>
            <p className="text-sm text-[var(--ar-text)]">
              Your {attempt.answered} answer{attempt.answered === 1 ? '' : 's'} (of {attempt.total}) were saved and graded automatically.
            </p>
            <p className="text-xs text-[var(--ar-muted)]">Your teacher will review your test and share your result. You can’t change your answers now.</p>
          </Card>
        )
      ) : attempt?.status === 'IN_PROGRESS' ? (
        <Card icon={<Timer size={30} className="text-[var(--ar-accent)]" />} title="Your test is in progress" subtitle={testTypeLabel(a.type)}>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="tabular-nums">
                <strong>{attempt.answered}</strong> of {attempt.total} answered
              </span>
              {elapsed !== null && (
                <span className="font-semibold tabular-nums" aria-label="Time on the test so far">
                  ⏱ {formatElapsed(elapsed)}
                </span>
              )}
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--ar-surface-2)]">
              <div
                className="h-full rounded-full bg-[var(--ar-accent)] transition-all"
                style={{ width: `${attempt.total ? (attempt.answered / attempt.total) * 100 : 0}%` }}
              />
            </div>
          </div>
          <p
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
              tabOpen
                ? 'border-[var(--ar-success)]/40 bg-[var(--ar-success)]/10'
                : 'border-[var(--ar-warning)]/50 bg-[var(--ar-warning)]/10'
            }`}
          >
            {tabOpen ? (
              <>
                <CheckCircle2 size={14} className="flex-shrink-0 text-[var(--ar-success)]" /> Your test is open in another tab.
              </>
            ) : (
              <>
                <AlertTriangle size={14} className="flex-shrink-0 text-[var(--ar-warning)]" /> Your test tab isn’t open. Your answers are safe — open it again to carry on.
              </>
            )}
          </p>
          <OpenTestButton label={tabOpen ? 'Go to my test tab' : 'Open my test tab'} onClick={() => openTest(false)} />
          <BlockedNote blocked={blocked} href={testTabUrl(scheduledLessonId)} />
          <KeepSharing />
        </Card>
      ) : status?.closedAt ? (
        <Card icon={<Lock size={30} className="text-[var(--ar-warning)]" />} title="Your teacher closed this test" subtitle={testTypeLabel(a.type)}>
          <p className="text-sm text-[var(--ar-muted)]">The test can no longer be started. If you think this is a mistake, please tell your teacher.</p>
        </Card>
      ) : (
        <Card icon={<ClipboardList size={30} className="text-[var(--ar-accent)]" />} title="Start your test" subtitle={testTypeLabel(a.type)}>
          {objective === 0 ? (
            <p role="alert" className="rounded-lg border border-[var(--ar-warning)]/40 bg-[var(--ar-warning)]/10 px-3 py-2 text-sm">
              This test has no questions yet. Please tell your teacher so Lumexa Operations can fix it.
            </p>
          ) : (
            <>
              <ul className="space-y-1.5 text-sm">
                <li>
                  📝 <strong>{objective} questions</strong> — {a.counts.mcq} multiple-choice and {a.counts.trueFalse} True/False
                  {a.counts.practical > 0 ? ', plus one small coding project your teacher marks' : ''}.
                </li>
                <li>
                  🖥️ The test opens in a <strong>new tab</strong>. Keep sharing your <strong>entire screen</strong> so your teacher can follow along.
                </li>
                <li>
                  ⏱ The stopwatch starts at <strong>00:00</strong> when the test opens. There’s no fixed time limit — your teacher tells you when time is up and
                  locks the test. Everything you’ve saved is submitted automatically.
                </li>
                <li>💾 Your answers save automatically, so you can’t lose them if your page refreshes.</li>
              </ul>
              {!a.isPublished && (
                <p role="alert" className="rounded-lg border border-[var(--ar-warning)]/40 bg-[var(--ar-warning)]/10 px-3 py-2 text-sm">
                  This test hasn’t been opened for students yet. Ask your teacher.
                </p>
              )}
              <button
                type="button"
                data-testid="start-test"
                onClick={() => openTest(true)}
                disabled={!a.isPublished}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--ar-accent)] px-4 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                <Play size={16} /> Start test
              </button>
              <BlockedNote blocked={blocked} href={testTabUrl(scheduledLessonId, { autostart: true })} />
            </>
          )}
        </Card>
      )}
    </div>
  );
}

function Card({ icon, title, subtitle, children }: { icon: React.ReactNode; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-xl border border-[var(--ar-border)] bg-[var(--ar-surface)] p-5" aria-live="polite">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex-shrink-0">{icon}</div>
        <div className="min-w-0">
          <h2 className="text-lg font-bold leading-tight text-[var(--ar-text)]">{title}</h2>
          {subtitle && <p className="text-xs font-medium uppercase tracking-wide text-[var(--ar-faint)]">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function OpenTestButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      data-testid="open-test-tab"
      onClick={onClick}
      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--ar-accent)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
    >
      <ExternalLink size={15} /> {label}
    </button>
  );
}

/** The browser refused the new tab — give a way through that cannot be blocked. */
function BlockedNote({ blocked, href }: { blocked: boolean; href: string }) {
  if (!blocked) return null;
  return (
    <p role="alert" className="rounded-lg border border-[var(--ar-warning)]/50 bg-[var(--ar-warning)]/10 px-3 py-2 text-xs">
      Your browser blocked the new tab. Allow pop-ups for Lumexa and try again, or{' '}
      <a href={href} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
        open the test here
      </a>
      .
    </p>
  );
}

function KeepSharing() {
  return (
    <p className="flex items-start gap-2 text-xs text-[var(--ar-muted)]">
      <MonitorUp size={14} className="mt-0.5 flex-shrink-0" /> Keep sharing your entire screen while you take the test.
    </p>
  );
}
