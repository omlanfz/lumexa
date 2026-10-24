'use client';

// What the teacher sees in the classroom while a student sits a test: the test
// they are running (counts, marks, a question preview), the student's live
// progress, and a one-click path to the report card once it is submitted.
// The answer key is hidden unless the teacher deliberately reveals it.

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardList, Eye, EyeOff, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { errorMessage, getTestPreview, getTestStatus, TestPreview } from '@/lib/assessment/api';
import { formatMarks, reportStatusMeta, testTypeLabel } from '@/lib/assessment/progress';
import type { LessonTestStatus } from '@/lib/assessment/types';
import { themeVars, Variant } from './theme';
import QuestionText from './QuestionText';

const POLL_MS = 8_000;

export default function TeacherTestMonitor({ scheduledLessonId, variant }: { scheduledLessonId: string; variant: Exclude<Variant, 'page'> }) {
  const [status, setStatus] = useState<LessonTestStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<TestPreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setStatus(await getTestStatus(scheduledLessonId));
      setError(null);
    } catch (err) {
      setError(errorMessage(err, "Couldn't load the test status."));
    } finally {
      setLoading(false);
    }
  }, [scheduledLessonId]);

  useEffect(() => {
    void refresh();
    const t = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(t);
  }, [refresh]);

  const assessmentId = status?.assessment?.id;
  const loadPreview = useCallback(
    async (withKey: boolean) => {
      if (!assessmentId) return;
      setPreviewing(true);
      setPreviewError(null);
      try {
        setPreview(await getTestPreview(assessmentId, withKey));
        setShowKey(withKey);
      } catch (err) {
        setPreviewError(errorMessage(err, "Couldn't load the questions."));
      } finally {
        setPreviewing(false);
      }
    },
    [assessmentId],
  );

  const a = status?.assessment;
  const attempt = status?.attempt;
  const objective = a ? a.counts.mcq + a.counts.trueFalse : 0;

  return (
    <div className="@container w-full space-y-4 text-[var(--ar-text)]" style={themeVars(variant)}>
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-[var(--ar-muted)]" role="status">
          <Loader2 className="animate-spin" size={18} /> Loading the test…
        </div>
      ) : error && !status ? (
        <div role="alert" className="space-y-2 rounded-xl border border-[var(--ar-danger)]/40 bg-[var(--ar-danger)]/10 p-4 text-center text-sm">
          <AlertTriangle className="mx-auto text-[var(--ar-danger)]" size={22} />
          <p>{error}</p>
          <button type="button" onClick={() => void refresh()} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--ar-border-strong)] px-3 py-1.5 text-xs">
            <RefreshCw size={13} /> Try again
          </button>
        </div>
      ) : !a ? (
        <div className="space-y-1 rounded-xl border border-[var(--ar-border)] bg-[var(--ar-surface)] p-5 text-center text-sm text-[var(--ar-muted)]">
          <ClipboardList className="mx-auto text-[var(--ar-faint)]" size={24} />
          <p className="font-semibold text-[var(--ar-text)]">No question bank is linked to this test session</p>
          <p>Ask Lumexa Operations to link or build one from Admin → Courses → Curriculum.</p>
        </div>
      ) : (
        <>
          <section className="space-y-3 rounded-xl border border-[var(--ar-border)] bg-[var(--ar-surface)] p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ar-faint)]">{testTypeLabel(a.type)} · you are running this test</p>
                <h2 className="text-lg font-bold leading-tight">{a.title}</h2>
              </div>
              {a.meetsStandard ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-[var(--ar-success)]/40 px-2 py-0.5 text-[11px] font-medium text-[var(--ar-success)]">
                  <CheckCircle2 size={12} /> Standard format
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-[var(--ar-warning)]/50 px-2 py-0.5 text-[11px] font-medium text-[var(--ar-warning)]">
                  <AlertTriangle size={12} /> Question bank incomplete
                </span>
              )}
            </div>
            <p className="text-sm text-[var(--ar-muted)]">
              {a.counts.mcq} multiple-choice + {a.counts.trueFalse} True/False = {objective} questions
              {a.counts.practical > 0 ? ' + 1 coding project' : ''} · {formatMarks(a.totalMarks)} marks
            </p>
            {!a.isPublished && (
              <p className="rounded-lg border border-[var(--ar-warning)]/40 bg-[var(--ar-warning)]/10 px-3 py-2 text-xs">
                This test is not published, so the student cannot start it. Ask Lumexa Operations to publish it.
              </p>
            )}
          </section>

          <section className="space-y-2 rounded-xl border border-[var(--ar-border)] bg-[var(--ar-surface)] p-4" aria-live="polite">
            <h3 className="text-sm font-semibold">{status?.studentName ?? 'Student'}&apos;s progress</h3>
            {!attempt ? (
              <p className="text-sm text-[var(--ar-muted)]">Not started yet. The test appears in the student&apos;s classroom view automatically.</p>
            ) : attempt.status === 'IN_PROGRESS' ? (
              <>
                <p className="text-sm text-[var(--ar-muted)]">
                  In progress — {attempt.answered} of {attempt.total} answered
                </p>
                <div className="h-1.5 overflow-hidden rounded-full bg-[var(--ar-surface-2)]">
                  <div className="h-full rounded-full bg-[var(--ar-accent)] transition-all" style={{ width: `${attempt.total ? (attempt.answered / attempt.total) * 100 : 0}%` }} />
                </div>
              </>
            ) : (
              <p className="text-sm text-[var(--ar-text)]">
                ✓ Submitted
                {attempt.submittedAt ? ` at ${new Date(attempt.submittedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : ''}
                {attempt.status === 'GRADED' ? ' · result released to the student' : ' · the objective part is auto-graded'}
              </p>
            )}
            {status?.report && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="rounded-full border border-[var(--ar-border-strong)] px-2 py-0.5 text-[11px] font-medium">
                  {reportStatusMeta(status.report.status).label}
                </span>
                <a
                  href={`/teacher-test-evaluations/${status.report.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--ar-accent)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                >
                  Open report card <ExternalLink size={12} />
                </a>
              </div>
            )}
          </section>

          <section className="space-y-2 rounded-xl border border-[var(--ar-border)] bg-[var(--ar-surface)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Questions</h3>
              <div className="flex gap-2">
                {!preview ? (
                  <button type="button" onClick={() => void loadPreview(false)} disabled={previewing} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--ar-border-strong)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--ar-surface-2)] disabled:opacity-60">
                    {previewing ? <Loader2 size={13} className="animate-spin" /> : <Eye size={13} />} Preview questions
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => void loadPreview(!showKey)}
                      disabled={previewing}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--ar-border-strong)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--ar-surface-2)] disabled:opacity-60"
                    >
                      {showKey ? <EyeOff size={13} /> : <Eye size={13} />} {showKey ? 'Hide answer key' : 'Show answer key'}
                    </button>
                    <button type="button" onClick={() => setPreview(null)} className="rounded-lg px-2 py-1.5 text-xs text-[var(--ar-muted)] hover:underline">
                      Close
                    </button>
                  </>
                )}
              </div>
            </div>
            {previewError && <p role="alert" className="text-xs text-[var(--ar-danger)]">{previewError}</p>}
            {showKey && <p className="text-[11px] text-[var(--ar-warning)]">The answer key is showing — don&apos;t share your screen right now.</p>}
            {preview && (
              <ol className="max-h-[28rem] space-y-3 overflow-y-auto pr-1">
                {preview.questions.map((q) => (
                  <li key={q.id} className="text-sm">
                    <p className="text-[11px] text-[var(--ar-faint)]">
                      {q.order}. {q.kind === 'TRUE_FALSE' ? 'True / False' : 'Multiple choice'}
                    </p>
                    <QuestionText text={q.text} />
                    <ul className="mt-1 space-y-0.5 text-xs text-[var(--ar-muted)]">
                      {q.options.map((o, i) => (
                        <li key={i} className={showKey && q.correctIndex === i ? 'font-semibold text-[var(--ar-success)]' : ''}>
                          {showKey && q.correctIndex === i ? '✓ ' : '• '}
                          {o}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
                {preview.codingProjects.map((p) => (
                  <li key={p.id} className="rounded-lg border border-[var(--ar-border)] bg-[var(--ar-bg)] p-3 text-sm">
                    <p className="font-semibold">💻 Coding project · {p.title} ({p.maxScore} marks)</p>
                    <QuestionText text={p.instructions} className="mt-1 text-xs text-[var(--ar-muted)]" />
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      )}
    </div>
  );
}
