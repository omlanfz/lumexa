'use client';

// One test's Test Evaluation report card, as the teacher works on it:
//
//   1. the REPORT CARD — student/course/test, date, objective + coding scores,
//      total, percentage, pass/fail and status (live preview while editing);
//   2. the objective section, auto-graded at submit — the automatic result is
//      always shown, and a teacher override sits clearly next to it;
//   3. the coding project (Final Tests): the student's code, a rubric the
//      teacher marks, written feedback;
//   4. overall feedback → Save → Approve (releases the result to the student)
//      → Share with the parent (a real email — the screen says so when it
//      isn't delivered).
//
// The server recomputes every total on save; the numbers shown while typing
// come from lib/assessment/reportMath.ts, which mirrors the server's rules.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Check, CheckCircle2, Copy, Loader2, Mail, Printer, RotateCcw, Save, XCircle } from 'lucide-react';
import { approveReport, errorMessage, getReport, reopenReport, shareReport, updateReport, type ReportEdit } from '@/lib/assessment/api';
import { formatMarks, formatPercent, questionHeadline, reportStatusMeta } from '@/lib/assessment/progress';
import { objectivePreview, rubricTotal, totalsPreview, validateMark } from '@/lib/assessment/reportMath';
import type { ReportDetail, ReportQuestion } from '@/lib/assessment/types';
import QuestionText from '@/components/assessment/QuestionText';
import { themeVars } from '@/components/assessment/theme';
import ReportStatusBadge from './ReportStatusBadge';

interface Draft {
  /** per question: the teacher's decision (null = keep the automatic result) */
  overrides: Record<string, { correct: boolean | null; note: string }>;
  marks: Record<string, string>;
  feedback: string;
  strengths: string;
  improvements: string;
  codingFeedback: string;
}

function draftFrom(report: ReportDetail): Draft {
  const overrides: Draft['overrides'] = {};
  for (const q of report.questions) overrides[q.questionId] = { correct: q.override?.correct ?? null, note: q.override?.note ?? '' };
  const marks: Draft['marks'] = {};
  for (const r of report.coding?.rubric ?? []) marks[r.criterion] = r.score === null ? '' : String(r.score);
  return {
    overrides,
    marks,
    feedback: report.feedback ?? '',
    strengths: report.strengths ?? '',
    improvements: report.improvements ?? '',
    codingFeedback: report.coding?.feedback ?? '',
  };
}

const parseMark = (v: string): number | null => (v.trim() === '' ? null : Number(v));

/** Only what changed, in the shape the API takes — or null if nothing did. */
function buildEdit(report: ReportDetail, draft: Draft): ReportEdit | null {
  const edit: ReportEdit = {};
  const overrides: NonNullable<ReportEdit['questionOverrides']> = [];
  for (const q of report.questions) {
    const d = draft.overrides[q.questionId];
    const was = q.override?.correct ?? null;
    const wasNote = q.override?.note ?? '';
    if (d.correct !== was || (d.correct !== null && d.note.trim() !== wasNote.trim())) {
      overrides.push({ questionId: q.questionId, correct: d.correct, note: d.correct === null ? null : d.note.trim() || null });
    }
  }
  if (overrides.length) edit.questionOverrides = overrides;

  const scores: NonNullable<ReportEdit['codingRubricScores']> = [];
  for (const r of report.coding?.rubric ?? []) {
    const next = parseMark(draft.marks[r.criterion] ?? '');
    if (next !== r.score) scores.push({ criterion: r.criterion, score: next });
  }
  if (scores.length) edit.codingRubricScores = scores;

  const text = (next: string, prev: string | null) => (next.trim() === (prev ?? '').trim() ? undefined : next.trim() || null);
  const feedback = text(draft.feedback, report.feedback);
  const strengths = text(draft.strengths, report.strengths);
  const improvements = text(draft.improvements, report.improvements);
  const codingFeedback = report.coding ? text(draft.codingFeedback, report.coding.feedback) : undefined;
  if (feedback !== undefined) edit.feedback = feedback;
  if (strengths !== undefined) edit.strengths = strengths;
  if (improvements !== undefined) edit.improvements = improvements;
  if (codingFeedback !== undefined) edit.codingFeedback = codingFeedback;

  return Object.keys(edit).length ? edit : null;
}

type QFilter = 'ALL' | 'INCORRECT' | 'UNANSWERED' | 'CHANGED';

export default function ReportCardEditor({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | 'save' | 'approve' | 'reopen' | 'share'>(null);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [filter, setFilter] = useState<QFilter>('ALL');
  const [copied, setCopied] = useState(false);

  const apply = useCallback((r: ReportDetail) => {
    setReport(r);
    setDraft(draftFrom(r));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      apply(await getReport(reportId));
    } catch (err) {
      setLoadError(errorMessage(err, 'Could not load this report.'));
    } finally {
      setLoading(false);
    }
  }, [reportId, apply]);

  useEffect(() => {
    void load();
  }, [load]);

  const editable = report?.status === 'PENDING_REVIEW' || report?.status === 'PENDING_CODE_EVALUATION';
  const edit = useMemo(() => (report && draft && editable ? buildEdit(report, draft) : null), [report, draft, editable]);

  // ── Live preview of the numbers (the server recomputes on save) ───────────
  const preview = useMemo(() => {
    if (!report || !draft) return null;
    const questions = report.questions.map((q) => ({
      kind: q.kind,
      autoCorrect: q.autoCorrect,
      override: draft.overrides[q.questionId].correct === null ? null : { correct: draft.overrides[q.questionId].correct as boolean },
    }));
    const objective = objectivePreview(questions);
    const rubric = (report.coding?.rubric ?? []).map((r) => ({ criterion: r.criterion, maxPoints: r.maxPoints, score: parseMark(draft.marks[r.criterion] ?? '') }));
    const codingScore = report.coding ? rubricTotal(rubric) : null;
    const totals = totalsPreview({
      objectiveScore: objective.score,
      objectiveMax: objective.max,
      codingMax: report.coding ? (report.coding.max ?? 0) : null,
      codingScore,
      passScorePct: report.passScorePct,
    });
    const markErrors: Record<string, string> = {};
    for (const r of report.coding?.rubric ?? []) {
      const m = validateMark(draft.marks[r.criterion] ?? '', r.maxPoints);
      if (m) markErrors[r.criterion] = m;
    }
    return { objective, codingScore, totals, markErrors, hasMarkErrors: Object.keys(markErrors).length > 0 };
  }, [report, draft]);

  if (loading) {
    return <div className="h-64 animate-pulse rounded-2xl bg-[var(--t-surface-2)]" role="status" aria-label="Loading report" />;
  }
  if (loadError || !report || !draft || !preview) {
    return (
      <div role="alert" className="t-card space-y-3 p-6 text-center">
        <p className="text-sm text-[var(--t-danger)]">{loadError ?? 'Report not found.'}</p>
        <div className="flex justify-center gap-2">
          <button onClick={() => void load()} className="rounded-lg border border-[var(--t-border)] px-3 py-1.5 text-sm">Try again</button>
          <button onClick={() => router.push('/teacher-test-evaluations')} className="rounded-lg px-3 py-1.5 text-sm text-[var(--t-text-muted)] hover:underline">Back to list</button>
        </div>
      </div>
    );
  }

  const meta = reportStatusMeta(report.status);
  const final = report.assessmentType === 'FINAL_TEST';
  const statusLocked = report.status === 'SHARED_WITH_PARENTS';
  const codingUnmarked = !!report.coding && preview.codingScore === null;
  const dateTaken = new Date(report.timeline.submittedAt).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' });

  const setOverride = (q: ReportQuestion, correct: boolean | null) =>
    setDraft((d) => (d ? { ...d, overrides: { ...d.overrides, [q.questionId]: { correct, note: correct === null ? '' : d.overrides[q.questionId].note } } } : d));

  const run = async (kind: NonNullable<typeof busy>, fn: () => Promise<ReportDetail>, success: string) => {
    setBusy(kind);
    setNotice(null);
    try {
      apply(await fn());
      setNotice({ tone: 'ok', text: success });
      return true;
    } catch (err) {
      setNotice({ tone: 'error', text: errorMessage(err, 'Something went wrong. Please try again.') });
      return false;
    } finally {
      setBusy(null);
    }
  };

  const save = () => {
    if (!edit) return Promise.resolve(true);
    if (preview.hasMarkErrors) {
      setNotice({ tone: 'error', text: 'Fix the highlighted marks before saving.' });
      return Promise.resolve(false);
    }
    return run('save', () => updateReport(report.id, { ...edit, expectedUpdatedAt: report.updatedAt }), 'Saved. Totals were recalculated.');
  };

  const approve = async () => {
    setConfirmApprove(false);
    if (preview.hasMarkErrors) {
      setNotice({ tone: 'error', text: 'Fix the highlighted marks first.' });
      return;
    }
    if (edit && !(await save())) return;
    await run('approve', () => approveReport(report.id), 'Report approved. The result is now visible to the student.');
  };

  const visibleQuestions = report.questions.filter((q) => {
    const d = draft.overrides[q.questionId];
    const effective = d.correct ?? q.autoCorrect;
    if (filter === 'INCORRECT') return !effective;
    if (filter === 'UNANSWERED') return q.selectedIndex === null;
    if (filter === 'CHANGED') return d.correct !== null && d.correct !== q.autoCorrect;
    return true;
  });
  const changedCount = report.questions.filter((q) => draft.overrides[q.questionId].correct !== null && draft.overrides[q.questionId].correct !== q.autoCorrect).length;

  const inputCls = 'w-full rounded-lg border border-[var(--t-border)] bg-[var(--t-surface)] px-3 py-2 text-sm text-[var(--t-text)] disabled:opacity-70';

  return (
    <div className="space-y-5" style={themeVars('teacher')}>
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <button onClick={() => router.push('/teacher-test-evaluations')} className="text-sm text-[var(--t-text-muted)] hover:text-[var(--t-text)]">
          ← All test evaluations
        </button>
        <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--t-border)] px-3 py-1.5 text-xs text-[var(--t-text-muted)] hover:text-[var(--t-text)]">
          <Printer size={13} /> Print
        </button>
      </div>

      {/* ═══ The report card ═══ */}
      <section className="t-card overflow-hidden" aria-labelledby="report-title">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--t-border)] bg-[var(--t-surface-2)] p-5">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--t-text-faint)]">Test Evaluation Report Card</p>
            <h1 id="report-title" className="text-xl font-bold text-[var(--t-text)]">{report.student.fullName}</h1>
            <p className="text-sm text-[var(--t-text-muted)]">
              {report.testTitle} · {report.typeLabel}
            </p>
          </div>
          <div className="text-right">
            <ReportStatusBadge status={report.status} />
            <p className="mt-1 max-w-[16rem] text-xs text-[var(--t-text-muted)]">{meta.hint}</p>
          </div>
        </div>

        <dl className="grid gap-x-6 gap-y-2 p-5 text-sm sm:grid-cols-2">
          <Row label="Student" value={report.student.fullName} />
          <Row label="Course" value={report.courseTitle} />
          <Row label="Assessment" value={`${report.typeLabel} — ${report.testTitle}`} />
          <Row label="Date taken" value={dateTaken} />
          <Row label="Teacher" value={report.teacher.fullName} />
          <Row label="Pass mark" value={`${report.passScorePct}%`} />
        </dl>

        <div className="overflow-x-auto px-5 pb-5">
          <table className="w-full min-w-[22rem] text-sm">
            <caption className="sr-only">Scores</caption>
            <tbody className="divide-y divide-[var(--t-border)]">
              <Score label={`Multiple choice (${preview.objective.mcqTotal} questions)`} value={`${preview.objective.mcqCorrect} / ${preview.objective.mcqTotal}`} />
              <Score label={`True / False (${preview.objective.tfTotal} questions)`} value={`${preview.objective.tfCorrect} / ${preview.objective.tfTotal}`} />
              <Score
                label="Objective total"
                strong
                value={`${formatMarks(preview.objective.score)} / ${formatMarks(preview.objective.max)}`}
                note={
                  preview.objective.overrides > 0 ? (
                    <span className="text-[var(--t-warning)]">
                      auto-graded {formatMarks(preview.objective.autoScore)} · {preview.objective.overrides} teacher override{preview.objective.overrides === 1 ? '' : 's'}
                    </span>
                  ) : (
                    <span className="text-[var(--t-text-faint)]">auto-graded</span>
                  )
                }
              />
              {report.coding && (
                <Score
                  label="Coding project (marked by teacher)"
                  value={preview.codingScore === null ? 'Pending manual evaluation' : `${formatMarks(preview.codingScore)} / ${formatMarks(report.coding.max)}`}
                  muted={preview.codingScore === null}
                />
              )}
              <Score
                label="Total"
                strong
                value={preview.totals.total === null ? '—' : `${formatMarks(preview.totals.total)} / ${formatMarks(preview.totals.totalMax)}`}
              />
              <tr>
                <td className="py-3 font-semibold text-[var(--t-text)]">Percentage</td>
                <td className="py-3 text-right">
                  <span className="text-2xl font-extrabold tabular-nums text-[var(--t-text)]">{formatPercent(preview.totals.percentage)}</span>
                  {preview.totals.passed !== null && (
                    <span className={`ml-2 text-xs font-semibold ${preview.totals.passed ? 'text-[var(--t-success)]' : 'text-[var(--t-warning)]'}`}>
                      {preview.totals.passed ? 'Pass' : 'Below pass mark'}
                    </span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
          {editable && edit && <p className="mt-1 text-xs text-[var(--t-warning)]">Preview of your unsaved changes — press Save to apply them.</p>}
          {report.teacherEdited && !edit && <p className="mt-1 text-xs text-[var(--t-text-muted)]">This report includes teacher input (overrides, marks or written feedback).</p>}
        </div>
      </section>

      {notice && (
        <div role={notice.tone === 'error' ? 'alert' : 'status'} className={`rounded-xl p-3 text-sm ${notice.tone === 'error' ? 'bg-[var(--t-danger-bg)] text-[var(--t-danger)]' : 'bg-[var(--t-success-bg)] text-[var(--t-success-text)]'}`}>
          {notice.text}
          {notice.tone === 'error' && /changed somewhere else/i.test(notice.text) && (
            <button onClick={() => void load()} className="ml-3 underline">Reload</button>
          )}
        </div>
      )}

      {/* ═══ Objective questions ═══ */}
      <section className="t-card p-5" aria-labelledby="objective-title">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 id="objective-title" className="font-semibold text-[var(--t-text)]">Objective questions</h2>
            <p className="text-xs text-[var(--t-text-muted)]">
              Graded automatically at submission{preview.objective.overrides > 0 ? `; ${preview.objective.overrides} changed by you` : ''}. {editable ? 'Open a question to override its result.' : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 text-xs" role="group" aria-label="Filter questions">
            {([
              ['ALL', `All (${report.questions.length})`],
              ['INCORRECT', 'Incorrect'],
              ['UNANSWERED', `Unanswered (${report.objective.unanswered})`],
              ['CHANGED', `Changed (${changedCount})`],
            ] as [QFilter, string][]).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                aria-pressed={filter === k}
                className={`rounded-lg px-2.5 py-1 font-medium ${filter === k ? 'bg-[var(--t-nav-active)] text-[var(--t-nav-active-text)]' : 'text-[var(--t-text-muted)] hover:bg-[var(--t-nav-hover)]'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <ol className="space-y-2">
          {visibleQuestions.length === 0 && <li className="text-sm text-[var(--t-text-muted)]">No questions match this filter.</li>}
          {visibleQuestions.map((q) => {
            const d = draft.overrides[q.questionId];
            const effective = d.correct ?? q.autoCorrect;
            const changed = d.correct !== null && d.correct !== q.autoCorrect;
            return (
              <li key={q.questionId}>
                <details className="group rounded-xl border border-[var(--t-border)] bg-[var(--t-surface)]">
                  <summary className="flex cursor-pointer list-none items-start gap-2 p-3 text-sm">
                    {effective ? <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0 text-[var(--t-success)]" aria-label="Counted as correct" /> : <XCircle size={16} className="mt-0.5 flex-shrink-0 text-[var(--t-danger)]" aria-label="Counted as incorrect" />}
                    <span className="min-w-0 flex-1">
                      <span className="text-[11px] text-[var(--t-text-faint)]">
                        {q.order}. {q.kind === 'TRUE_FALSE' ? 'True / False' : 'Multiple choice'} · auto: {q.autoCorrect ? 'correct' : q.selectedIndex === null ? 'unanswered' : 'incorrect'}
                        {changed && <span className="ml-1 font-semibold text-[var(--t-warning)]">· teacher override: {d.correct ? 'correct' : 'incorrect'}</span>}
                      </span>
                      <span className="block truncate text-[var(--t-text)]">{questionHeadline(q.text)}</span>
                    </span>
                  </summary>
                  <div className="space-y-3 border-t border-[var(--t-border)] p-3 text-sm">
                    <QuestionText text={q.text} className="text-[var(--t-text)]" />
                    <ul className="space-y-1">
                      {q.options.map((o, i) => {
                        const chosen = q.selectedIndex === i;
                        const correct = q.correctIndex === i;
                        return (
                          <li key={i} className={`flex items-start gap-2 rounded-lg border px-2.5 py-1.5 text-xs ${correct ? 'border-[var(--t-success)]/50 bg-[var(--t-success)]/10' : chosen ? 'border-[var(--t-danger)]/40 bg-[var(--t-danger)]/10' : 'border-[var(--t-border)]'}`}>
                            <span className="w-24 flex-shrink-0 font-semibold text-[var(--t-text-muted)]">
                              {chosen ? 'Student chose' : ''}
                              {chosen && correct ? ' · ' : ''}
                              {correct ? 'Correct' : ''}
                            </span>
                            <span className="min-w-0 flex-1 whitespace-pre-wrap break-words text-[var(--t-text)]">{o}</span>
                          </li>
                        );
                      })}
                      {q.selectedIndex === null && <li className="text-xs italic text-[var(--t-text-muted)]">The student left this unanswered.</li>}
                    </ul>
                    {q.explanation && <p className="text-xs text-[var(--t-text-muted)]">💡 {q.explanation}</p>}
                    {editable ? (
                      <fieldset className="space-y-2 rounded-lg bg-[var(--t-surface-2)] p-3">
                        <legend className="px-1 text-xs font-semibold text-[var(--t-text)]">Your decision for this question</legend>
                        <div className="flex flex-wrap gap-3 text-xs text-[var(--t-text)]">
                          <label className="inline-flex cursor-pointer items-center gap-1.5">
                            <input
                              type="radio"
                              name={`override-${q.questionId}`}
                              checked={!changed}
                              onChange={() => setOverride(q, null)}
                              className="accent-[var(--t-accent)]"
                            />
                            Keep automatic result ({q.autoCorrect ? 'correct' : 'incorrect'})
                          </label>
                          <label className="inline-flex cursor-pointer items-center gap-1.5">
                            <input
                              type="radio"
                              name={`override-${q.questionId}`}
                              checked={changed}
                              onChange={() => setOverride(q, !q.autoCorrect)}
                              className="accent-[var(--t-accent)]"
                            />
                            Count as {q.autoCorrect ? 'incorrect' : 'correct'} instead
                          </label>
                        </div>
                        {changed && (
                          <input
                            value={d.note}
                            onChange={(e) => setDraft((cur) => (cur ? { ...cur, overrides: { ...cur.overrides, [q.questionId]: { ...cur.overrides[q.questionId], note: e.target.value } } } : cur))}
                            maxLength={500}
                            placeholder="Why? (optional note, kept on the report)"
                            className={inputCls}
                            aria-label="Reason for override"
                          />
                        )}
                      </fieldset>
                    ) : (
                      changed && q.override?.note && <p className="text-xs text-[var(--t-text-muted)]">Teacher note: {q.override.note}</p>
                    )}
                  </div>
                </details>
              </li>
            );
          })}
        </ol>
      </section>

      {/* ═══ Coding project ═══ */}
      {report.coding && (
        <section className="t-card space-y-4 p-5" aria-labelledby="coding-title">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="coding-title" className="font-semibold text-[var(--t-text)]">Coding project{report.coding.project ? ` · ${report.coding.project.title}` : ''}</h2>
            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${codingUnmarked ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400' : 'border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-400'}`}>
              {codingUnmarked ? 'Pending manual evaluation' : 'Evaluated'}
            </span>
          </div>
          {report.coding.project && (
            <>
              <details className="rounded-xl border border-[var(--t-border)] p-3 text-sm">
                <summary className="cursor-pointer font-medium text-[var(--t-text)]">The task the student was given</summary>
                <QuestionText text={report.coding.project.instructions} className="mt-2 text-xs text-[var(--t-text-muted)]" />
              </details>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-xs font-semibold text-[var(--t-text)]">
                    Student&apos;s code ({report.coding.project.language}){!report.coding.hasCode && <span className="ml-2 font-normal text-[var(--t-warning)]">— nothing was written</span>}
                  </p>
                  {report.coding.hasCode && (
                    <button
                      onClick={() => {
                        void navigator.clipboard?.writeText(report.coding?.project?.code ?? '');
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1500);
                      }}
                      className="inline-flex items-center gap-1 text-xs text-[var(--t-text-muted)] hover:text-[var(--t-text)]"
                    >
                      {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copied' : 'Copy'}
                    </button>
                  )}
                </div>
                <pre className="max-h-96 overflow-auto rounded-lg bg-black/85 p-3 text-[13px] leading-snug text-gray-100">
                  <code>{report.coding.project.code || '(no code submitted)'}</code>
                </pre>
              </div>
            </>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[24rem] text-sm">
              <caption className="mb-1 text-left text-xs font-semibold text-[var(--t-text)]">Rubric — enter a mark for each criterion</caption>
              <thead className="text-left text-xs text-[var(--t-text-muted)]">
                <tr>
                  <th className="py-1 pr-3 font-medium">Criterion</th>
                  <th className="w-28 py-1 text-right font-medium">Mark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--t-border)]">
                {report.coding.rubric.map((r) => (
                  <tr key={r.criterion}>
                    <td className="py-2 pr-3 align-top">
                      <p className="font-medium text-[var(--t-text)]">{r.criterion}</p>
                      {r.lookFor && <p className="text-xs text-[var(--t-text-muted)]">{r.lookFor}</p>}
                    </td>
                    <td className="py-2 text-right align-top">
                      <label className="sr-only" htmlFor={`mark-${r.criterion}`}>{`Mark for ${r.criterion}, out of ${r.maxPoints}`}</label>
                      <div className="inline-flex items-center gap-1.5">
                        <input
                          id={`mark-${r.criterion}`}
                          inputMode="decimal"
                          value={draft.marks[r.criterion] ?? ''}
                          disabled={!editable}
                          onChange={(e) => setDraft((cur) => (cur ? { ...cur, marks: { ...cur.marks, [r.criterion]: e.target.value } } : cur))}
                          aria-invalid={!!preview.markErrors[r.criterion]}
                          className={`w-16 rounded-lg border px-2 py-1.5 text-right text-sm tabular-nums ${preview.markErrors[r.criterion] ? 'border-[var(--t-danger)]' : 'border-[var(--t-border)]'} bg-[var(--t-surface)] text-[var(--t-text)] disabled:opacity-70`}
                        />
                        <span className="text-xs text-[var(--t-text-muted)]">/ {r.maxPoints}</span>
                      </div>
                      {preview.markErrors[r.criterion] && <p role="alert" className="mt-0.5 text-[11px] text-[var(--t-danger)]">{preview.markErrors[r.criterion]}</p>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-[var(--t-border)]">
                  <td className="py-2 font-semibold text-[var(--t-text)]">Coding project total</td>
                  <td className="py-2 text-right font-bold tabular-nums text-[var(--t-text)]">
                    {preview.codingScore === null ? '—' : formatMarks(preview.codingScore)} / {formatMarks(report.coding.max)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div>
            <label htmlFor="coding-feedback" className="mb-1 block text-xs font-semibold text-[var(--t-text)]">Feedback on the coding project</label>
            <textarea
              id="coding-feedback"
              value={draft.codingFeedback}
              disabled={!editable}
              onChange={(e) => setDraft((cur) => (cur ? { ...cur, codingFeedback: e.target.value } : cur))}
              rows={3}
              maxLength={2000}
              placeholder="What worked, what to improve — the student and parent will see this."
              className={inputCls}
            />
          </div>
        </section>
      )}

      {/* ═══ Overall feedback ═══ */}
      <section className="t-card space-y-3 p-5" aria-labelledby="feedback-title">
        <h2 id="feedback-title" className="font-semibold text-[var(--t-text)]">Teacher feedback</h2>
        {(
          [
            ['feedback', 'Overall feedback', 'A short note about how the test went.', 2000],
            ['strengths', 'Strengths', 'What the student did well.', 1500],
            ['improvements', 'Areas to work on', 'What to practise next.', 1500],
          ] as [keyof Pick<Draft, 'feedback' | 'strengths' | 'improvements'>, string, string, number][]
        ).map(([key, label, ph, max]) => (
          <div key={key}>
            <label htmlFor={`fb-${key}`} className="mb-1 block text-xs font-semibold text-[var(--t-text)]">{label}</label>
            <textarea
              id={`fb-${key}`}
              value={draft[key]}
              disabled={!editable}
              onChange={(e) => setDraft((cur) => (cur ? { ...cur, [key]: e.target.value } : cur))}
              rows={2}
              maxLength={max}
              placeholder={ph}
              className={inputCls}
            />
          </div>
        ))}
      </section>

      {/* ═══ Actions ═══ */}
      <section className="t-card space-y-4 p-5 print:hidden" aria-labelledby="actions-title">
        <h2 id="actions-title" className="font-semibold text-[var(--t-text)]">{editable ? 'Finish this report' : 'Sharing'}</h2>

        {editable && (
          <>
            {final && codingUnmarked && (
              <p className="flex items-start gap-2 text-xs text-[var(--t-warning)]">
                <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" /> Mark every rubric criterion of the coding project to complete this report card.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => void save()}
                disabled={!edit || busy !== null}
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--t-border-strong)] px-4 py-2 text-sm font-medium text-[var(--t-text)] hover:bg-[var(--t-nav-hover)] disabled:opacity-50"
              >
                {busy === 'save' ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} {edit ? 'Save changes' : 'No unsaved changes'}
              </button>
              {!confirmApprove ? (
                <button
                  onClick={() => setConfirmApprove(true)}
                  disabled={busy !== null || codingUnmarked || preview.hasMarkErrors}
                  title={codingUnmarked ? 'Mark every rubric criterion first' : undefined}
                  className="inline-flex items-center gap-2 rounded-lg bg-[var(--t-accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--t-accent-hover)] disabled:opacity-50"
                >
                  <CheckCircle2 size={15} /> {final ? 'Complete report card' : 'Approve report'}
                </button>
              ) : (
                <div role="alertdialog" aria-label="Confirm approval" className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--t-border-strong)] bg-[var(--t-surface-2)] p-2 text-xs text-[var(--t-text)]">
                  <span>
                    Approving {edit ? 'saves your changes and ' : ''}releases the result to {report.student.fullName}. You can still reopen it until it is shared.
                  </span>
                  <button onClick={() => void approve()} disabled={busy !== null} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--t-accent)] px-3 py-1.5 font-semibold text-white disabled:opacity-60">
                    {busy === 'approve' && <Loader2 size={13} className="animate-spin" />} Yes, approve
                  </button>
                  <button onClick={() => setConfirmApprove(false)} className="rounded-lg px-3 py-1.5 text-[var(--t-text-muted)] hover:underline">Cancel</button>
                </div>
              )}
            </div>
          </>
        )}

        {report.status === 'READY_TO_SHARE' && (
          <div className="space-y-3">
            <p className="text-sm text-[var(--t-text)]">
              This report is approved and visible to {report.student.fullName}. Next, send it to the parent.
            </p>
            <div className="rounded-xl border border-[var(--t-border)] bg-[var(--t-surface-2)] p-3 text-sm">
              <p className="flex items-center gap-2 text-[var(--t-text)]">
                <Mail size={15} /> Will be emailed to <strong>{report.share.recipient.email}</strong>
              </p>
              <p className="mt-0.5 text-xs text-[var(--t-text-muted)]">
                {report.share.recipient.kind === 'BILLING_CONTACT'
                  ? "This is the parent/guardian contact on the student's profile."
                  : "No separate parent contact is on file, so this is the student account's email address (the same one Lumexa uses for certificates and billing notices)."}
              </p>
            </div>
            {report.share.sending && (
              <div role="status" className="rounded-lg border border-[var(--t-border)] bg-[var(--t-surface-2)] p-3 text-xs text-[var(--t-text)]">
                <p className="font-semibold">An email for this report is being sent right now.</p>
                <p className="text-[var(--t-text-muted)]">Reload in a moment to see whether the mail server accepted it. The buttons unlock when it is done.</p>
              </div>
            )}
            {report.share.lastError && (
              <div role="alert" className="rounded-lg border border-[var(--t-danger)]/40 bg-[var(--t-danger-bg)] p-3 text-xs text-[var(--t-danger)]">
                <p className="font-semibold">The last attempt to email this report did not go through.</p>
                <p>{report.share.lastError}</p>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => void run('share', () => shareReport(report.id), `Emailed to ${report.share.recipient.email}.`)}
                disabled={busy !== null || report.share.sending}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--t-accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--t-accent-hover)] disabled:opacity-60"
              >
                {busy === 'share' ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />}
                {busy === 'share' ? 'Sending…' : report.share.attempts > 0 ? 'Try sharing again' : 'Share with parent'}
              </button>
              <button
                onClick={() => void run('reopen', () => reopenReport(report.id), 'Reopened — the result is hidden from the student again while you edit.')}
                disabled={busy !== null || report.share.sending}
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--t-border-strong)] px-4 py-2 text-sm font-medium text-[var(--t-text)] hover:bg-[var(--t-nav-hover)] disabled:opacity-60"
              >
                {busy === 'reopen' ? <Loader2 size={15} className="animate-spin" /> : <RotateCcw size={15} />} Reopen to edit
              </button>
            </div>
          </div>
        )}

        {statusLocked && (
          <div className="space-y-1 text-sm text-[var(--t-text)]">
            <p className="flex items-center gap-2 font-semibold text-[var(--t-success)]">
              <CheckCircle2 size={16} /> Emailed to {report.share.sharedToEmail ?? report.share.recipient.email}
              {report.timeline.sharedAt ? ` on ${new Date(report.timeline.sharedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}` : ''}
            </p>
            <p className="text-xs text-[var(--t-text-muted)]">
              Mail server status: {report.share.deliveryStatus === 'SENT' ? 'accepted the message' : (report.share.deliveryStatus ?? 'unknown').toLowerCase()}. This report is now locked.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-[var(--t-border)] py-1 sm:block sm:border-0">
      <dt className="text-xs text-[var(--t-text-faint)]">{label}</dt>
      <dd className="font-medium text-[var(--t-text)]">{value}</dd>
    </div>
  );
}

function Score({ label, value, note, strong, muted }: { label: string; value: string; note?: React.ReactNode; strong?: boolean; muted?: boolean }) {
  return (
    <tr>
      <td className={`py-2 pr-3 ${strong ? 'font-semibold text-[var(--t-text)]' : 'text-[var(--t-text-muted)]'}`}>
        {label}
        {note && <span className="ml-2 text-xs font-normal">{note}</span>}
      </td>
      <td className={`py-2 text-right tabular-nums ${strong ? 'font-bold text-[var(--t-text)]' : muted ? 'text-[var(--t-warning)]' : 'text-[var(--t-text)]'}`}>{value}</td>
    </tr>
  );
}
