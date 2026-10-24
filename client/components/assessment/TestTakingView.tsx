'use client';

// The in-progress test: one question at a time with radio-button answers,
// previous/next + a question palette, per-question save status, the coding
// project editor (Final Tests), and a review-and-submit step.
//
// Reliability model (see lib/assessment/answerQueue.ts):
//   * every click is autosaved to the server, one request per question at a
//     time, retried with backoff while the network is down;
//   * the whole answer sheet is ALSO mirrored to localStorage, so a refresh
//     (or a tab crash) while offline still restores it;
//   * final submit sends the complete answer sheet, so a submission can never
//     lose an answer whose autosave failed — and submitting twice is harmless.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, ChevronLeft, ChevronRight, CloudOff, Loader2, ListChecks, Send } from 'lucide-react';
import { AnswerQueue, QueueSnapshot } from '@/lib/assessment/answerQueue';
import { errorMessage, getAttempt, httpStatus, isNetworkError, saveAnswer, saveCode, submitAttempt } from '@/lib/assessment/api';
import { countAnswered, formatElapsed, kindLabel, splitSections, unansweredQuestions } from '@/lib/assessment/progress';
import type { AttemptView } from '@/lib/assessment/types';
import QuestionText, { OptionText } from './QuestionText';

const CODE_AUTOSAVE_MS = 1200;
const mirrorKey = (attemptId: string) => `lumexa:test:${attemptId}`;

interface Mirror {
  answers: Record<string, number | null>;
  code?: string;
  codeAt?: number;
}

function readMirror(attemptId: string): Mirror | null {
  try {
    const raw = localStorage.getItem(mirrorKey(attemptId));
    return raw ? (JSON.parse(raw) as Mirror) : null;
  } catch {
    return null;
  }
}

function writeMirror(attemptId: string, mirror: Mirror) {
  try {
    localStorage.setItem(mirrorKey(attemptId), JSON.stringify(mirror));
  } catch {
    // storage blocked/full — the server copy is the real one
  }
}

type CodeSave = 'idle' | 'saving' | 'saved' | 'error';

export default function TestTakingView({
  attempt,
  onSubmitted,
  hideTitle = false,
}: {
  attempt: AttemptView;
  onSubmitted: (fresh: AttemptView) => void;
  /** The host already shows the course and test title (the live classroom's
   *  lesson panel does) — keep only the timer and save status. */
  hideTitle?: boolean;
}) {
  const questions = attempt.questions;
  const project = attempt.codingProject;
  const total = questions.length;
  const codingStep = project ? total : -1;
  const reviewStep = total + (project ? 1 : 0);

  // ── Restore: server state first, then anything only the local backup has ──
  const initial = useMemo(() => {
    const selections: Record<string, number | null> = {};
    for (const q of questions) selections[q.id] = q.selectedIndex;
    const mirror = readMirror(attempt.id);
    const restoredFromBackup: string[] = [];
    if (mirror) {
      for (const q of questions) {
        const local = mirror.answers?.[q.id];
        if (selections[q.id] === null && local !== undefined && local !== null && local >= 0 && local < q.options.length) {
          selections[q.id] = local;
          restoredFromBackup.push(q.id);
        }
      }
    }
    let code = project?.code ?? '';
    let codeFromBackup = false;
    if (project && mirror?.code && mirror.code !== code) {
      const serverAt = project.savedAt ? new Date(project.savedAt).getTime() : 0;
      if ((mirror.codeAt ?? 0) > serverAt) {
        code = mirror.code;
        codeFromBackup = true;
      }
    }
    return { selections, restoredFromBackup, code, codeFromBackup };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt.id]);

  const [selections, setSelections] = useState<Record<string, number | null>>(initial.selections);
  const [code, setCode] = useState(initial.code);
  // Coming back to a test in progress (a refresh, a dropped connection): pick
  // up at the first question that has no answer yet, not at question 1.
  const [step, setStep] = useState(() => {
    const open = questions.findIndex((q) => initial.selections[q.id] == null);
    if (open === -1) return questions.some((q) => initial.selections[q.id] != null) ? reviewStep : 0;
    return open;
  });
  const [queueSnap, setQueueSnap] = useState<QueueSnapshot>({ states: {}, unsaved: 0, hasError: false, fatal: false });
  const [codeSave, setCodeSave] = useState<CodeSave>('idle');
  const [showList, setShowList] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const queueRef = useRef<AnswerQueue | null>(null);
  const selectionsRef = useRef(initial.selections);
  const codeDirty = useRef(initial.codeFromBackup);
  const codeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const codeRef = useRef(code);
  codeRef.current = code;
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  // The save queue lives for the life of this attempt.
  useEffect(() => {
    const queue = new AnswerQueue({
      send: (questionId, selectedIndex) => saveAnswer(attempt.id, questionId, selectedIndex).then(() => undefined),
      onChange: setQueueSnap,
      isFatal: (err) => {
        const s = httpStatus(err);
        return s === 409 || s === 403 || s === 404;
      },
    });
    for (const q of questions) queue.hydrate(q.id, q.selectedIndex);
    for (const id of initial.restoredFromBackup) queue.enqueue(id, initial.selections[id]);
    queueRef.current = queue;
    return () => {
      queue.dispose();
      queueRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt.id]);

  // Retry failed saves the moment the browser says it is back online.
  useEffect(() => {
    const online = () => queueRef.current?.retryNow();
    window.addEventListener('online', online);
    return () => window.removeEventListener('online', online);
  }, []);

  // Elapsed clock (informational — there is no time limit).
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Warn before leaving with answers that have not reached the server.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (queueSnap.unsaved > 0 || codeSave === 'saving' || codeSave === 'error') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [queueSnap.unsaved, codeSave]);

  // ── Coding project autosave ────────────────────────────────────────────────
  const flushCode = useCallback(async () => {
    if (!project || !codeDirty.current) return;
    codeDirty.current = false;
    setCodeSave('saving');
    try {
      await saveCode(attempt.id, project.id, codeRef.current);
      setCodeSave('saved');
    } catch (err) {
      codeDirty.current = true;
      setCodeSave('error');
      if (!isNetworkError(err) && httpStatus(err) !== undefined && httpStatus(err)! < 500) return; // not retryable
      codeTimer.current = setTimeout(() => void flushCode(), 4000);
    }
  }, [attempt.id, project]);

  useEffect(() => {
    if (initial.codeFromBackup) void flushCode();
    return () => {
      if (codeTimer.current) clearTimeout(codeTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onCodeChange = (value: string) => {
    setCode(value);
    codeDirty.current = true;
    setCodeSave('saving');
    writeMirror(attempt.id, { answers: selectionsRef.current, code: value, codeAt: Date.now() });
    if (codeTimer.current) clearTimeout(codeTimer.current);
    codeTimer.current = setTimeout(() => void flushCode(), CODE_AUTOSAVE_MS);
  };

  // ── Answers ────────────────────────────────────────────────────────────────
  const choose = (questionId: string, index: number | null) => {
    const next = { ...selectionsRef.current, [questionId]: index };
    selectionsRef.current = next;
    setSelections(next);
    writeMirror(attempt.id, { answers: next, code: codeRef.current, codeAt: codeDirty.current ? Date.now() : undefined });
    queueRef.current?.enqueue(questionId, index);
  };

  const answered = countAnswered(questions, selections);
  const unanswered = unansweredQuestions(questions, selections);

  const goTo = (next: number) => {
    setStep(Math.max(0, Math.min(reviewStep, next)));
    setConfirming(false);
    setTimeout(() => headingRef.current?.focus(), 0);
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const submit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      if (codeTimer.current) clearTimeout(codeTimer.current);
      await submitAttempt(attempt.id, {
        answers: questions.map((q) => ({ questionId: q.id, selectedIndex: selections[q.id] ?? null })),
        practical: project ? [{ questionId: project.id, code }] : undefined,
      });
      try {
        localStorage.removeItem(mirrorKey(attempt.id));
      } catch {
        /* ignore */
      }
      onSubmitted(await getAttempt(attempt.id));
    } catch (err) {
      setSubmitError(
        isNetworkError(err)
          ? "We couldn't reach Lumexa, so your test has NOT been submitted yet. Your answers are still on this page — check your connection and press Submit again."
          : errorMessage(err, 'The test could not be submitted. Please try again.'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const sections = useMemo(() => splitSections(questions), [questions]);
  const elapsed = attempt.startedAt ? formatElapsed(now - new Date(attempt.startedAt).getTime()) : null;
  const current = step < total ? questions[step] : null;
  const letter = (i: number) => String.fromCharCode(65 + i);

  const saveBadge = queueSnap.fatal ? (
    <Badge tone="danger" icon={<CloudOff size={13} />}>This test can no longer be changed</Badge>
  ) : queueSnap.hasError ? (
    <Badge tone="danger" icon={<CloudOff size={13} />}>Not saved yet — retrying…</Badge>
  ) : queueSnap.unsaved > 0 || codeSave === 'saving' ? (
    <Badge tone="muted" icon={<Loader2 size={13} className="animate-spin" />}>Saving…</Badge>
  ) : (
    <Badge tone="ok" icon={<Check size={13} />}>All answers saved</Badge>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className={`flex flex-wrap items-center gap-2 ${hideTitle ? 'justify-end' : 'justify-between'}`}>
        {!hideTitle && (
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ar-faint)]">
              {attempt.assessment.courseTitle}
            </p>
            <h2 className="text-lg font-bold leading-tight text-[var(--ar-text)]">{attempt.assessment.title}</h2>
          </div>
        )}
        <div className="flex items-center gap-2 text-xs text-[var(--ar-muted)]">
          {elapsed && <span className="tabular-nums">⏱ {elapsed}</span>}
          {saveBadge}
        </div>
      </div>

      {initial.restoredFromBackup.length > 0 && (
        <p className="rounded-lg border border-[var(--ar-warning)]/40 bg-[var(--ar-warning)]/10 px-3 py-2 text-xs text-[var(--ar-text)]">
          We restored {initial.restoredFromBackup.length} answer{initial.restoredFromBackup.length === 1 ? '' : 's'} from this device that hadn&apos;t reached Lumexa yet.
        </p>
      )}

      {/* Progress */}
      <div>
        <div className="mb-1 flex justify-between text-xs text-[var(--ar-muted)]">
          <span>
            {answered} of {total} answered
          </span>
          {project && <span>+ coding project</span>}
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--ar-surface-2)]">
          <div className="h-full rounded-full bg-[var(--ar-accent)] transition-all" style={{ width: `${total ? (answered / total) * 100 : 0}%` }} />
        </div>
      </div>

      <div className="grid gap-4 @2xl:grid-cols-[minmax(0,1fr)_15rem]">
        {/* Main panel */}
        <div className="min-w-0 space-y-4">
          {current && (
            <section className="rounded-xl border border-[var(--ar-border)] bg-[var(--ar-surface)] p-4 sm:p-5" aria-labelledby="q-heading">
              <div className="mb-2 flex items-center justify-between gap-2 text-xs text-[var(--ar-muted)]">
                <h3 id="q-heading" ref={headingRef} tabIndex={-1} className="font-semibold text-[var(--ar-text)] outline-none">
                  Question {step + 1} of {total}
                </h3>
                <span>
                  {kindLabel(current.kind)} · 1 mark
                </span>
              </div>
              <QuestionText text={current.text} className="mb-4 text-[15px] text-[var(--ar-text)]" />
              <div role="radiogroup" aria-label={`Answer for question ${step + 1}`} className="space-y-2">
                {current.options.map((opt, i) => {
                  const selected = selections[current.id] === i;
                  return (
                    <label
                      key={i}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                        selected
                          ? 'border-[var(--ar-accent)] bg-[var(--ar-accent-soft)]'
                          : 'border-[var(--ar-border)] bg-[var(--ar-bg)] hover:border-[var(--ar-border-strong)]'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`q-${current.id}`}
                        value={i}
                        checked={selected}
                        onChange={() => choose(current.id, i)}
                        className="mt-1 h-4 w-4 flex-shrink-0 accent-[var(--ar-accent)]"
                      />
                      {current.kind === 'MCQ' && (
                        <span className="mt-0.5 w-4 flex-shrink-0 text-xs font-bold text-[var(--ar-faint)]">{letter(i)}</span>
                      )}
                      <OptionText text={opt} className="min-w-0 flex-1 text-[var(--ar-text)]" />
                    </label>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center justify-between text-xs">
                <SaveHint state={queueSnap.states[current.id]} answered={selections[current.id] !== null && selections[current.id] !== undefined} />
                {selections[current.id] !== null && selections[current.id] !== undefined && (
                  <button type="button" onClick={() => choose(current.id, null)} className="text-[var(--ar-muted)] underline hover:text-[var(--ar-text)]">
                    Clear answer
                  </button>
                )}
              </div>
            </section>
          )}

          {step === codingStep && project && (
            <section className="space-y-3 rounded-xl border border-[var(--ar-border)] bg-[var(--ar-surface)] p-4 sm:p-5" aria-labelledby="code-heading">
              <h3 id="code-heading" ref={headingRef} tabIndex={-1} className="text-sm font-semibold text-[var(--ar-text)] outline-none">
                Coding project · {project.title}
              </h3>
              <QuestionText text={project.instructions} className="text-sm text-[var(--ar-text)]" />
              {project.rubric.length > 0 && (
                <div className="rounded-lg border border-[var(--ar-border)] bg-[var(--ar-bg)] p-3">
                  <p className="mb-1 text-xs font-semibold text-[var(--ar-text)]">How it will be marked · {project.maxScore} marks</p>
                  <ul className="space-y-0.5 text-xs text-[var(--ar-muted)]">
                    {project.rubric.map((r) => (
                      <li key={r.criterion} className="flex justify-between gap-3">
                        <span>{r.criterion}</span>
                        <span className="tabular-nums">{r.maxPoints}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <label className="block text-xs font-medium text-[var(--ar-muted)]" htmlFor="code-editor">
                Your code ({project.language})
              </label>
              <textarea
                id="code-editor"
                value={code}
                onChange={(e) => onCodeChange(e.target.value)}
                onKeyDown={(e) => {
                  // Tab inserts spaces like a code editor; Esc then Tab moves focus on.
                  if (e.key === 'Tab' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
                    e.preventDefault();
                    const el = e.currentTarget;
                    const { selectionStart: s, selectionEnd: en } = el;
                    onCodeChange(code.slice(0, s) + '    ' + code.slice(en));
                    requestAnimationFrame(() => el.setSelectionRange(s + 4, s + 4));
                  }
                }}
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                aria-describedby="code-hint"
                rows={14}
                maxLength={20000}
                className="min-h-[16rem] w-full rounded-lg border border-[var(--ar-border-strong)] bg-black/85 p-3 font-mono text-[13px] leading-snug text-gray-100 focus:outline-none focus:ring-2 focus:ring-[var(--ar-accent)]"
              />
              <p id="code-hint" className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--ar-faint)]">
                <span>Press Esc then Tab to leave the editor. Your teacher marks this project — it is not run automatically.</span>
                <span>
                  {codeSave === 'saving' && 'Saving…'}
                  {codeSave === 'saved' && '✓ Saved'}
                  {codeSave === 'error' && <span className="text-[var(--ar-danger)]">Not saved yet — retrying…</span>}
                </span>
              </p>
            </section>
          )}

          {step === reviewStep && (
            <section className="space-y-4 rounded-xl border border-[var(--ar-border)] bg-[var(--ar-surface)] p-4 sm:p-5" aria-labelledby="review-heading">
              <h3 id="review-heading" ref={headingRef} tabIndex={-1} className="text-sm font-semibold text-[var(--ar-text)] outline-none">
                Review &amp; submit
              </h3>
              <ul className="space-y-1.5 text-sm text-[var(--ar-text)]">
                <li className="flex items-center gap-2">
                  {unanswered.length === 0 ? <Check size={15} className="text-[var(--ar-success)]" /> : <AlertTriangle size={15} className="text-[var(--ar-warning)]" />}
                  {answered} of {total} questions answered
                </li>
                {project && (
                  <li className="flex items-center gap-2">
                    {code.trim() && code.trim() !== (project.starterCode ?? '').trim() ? (
                      <Check size={15} className="text-[var(--ar-success)]" />
                    ) : (
                      <AlertTriangle size={15} className="text-[var(--ar-warning)]" />
                    )}
                    {code.trim() && code.trim() !== (project.starterCode ?? '').trim() ? 'Coding project written' : "You haven't written any code for the coding project yet"}
                  </li>
                )}
              </ul>
              {unanswered.length > 0 && (
                <div>
                  <p className="mb-1 text-xs font-medium text-[var(--ar-muted)]">Unanswered — tap to go back:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {unanswered.map((q) => (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => goTo(questions.indexOf(q))}
                        className="rounded-md border border-[var(--ar-warning)]/50 px-2 py-0.5 text-xs font-semibold text-[var(--ar-text)] hover:bg-[var(--ar-warning)]/10"
                      >
                        {questions.indexOf(q) + 1}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!confirming ? (
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  disabled={queueSnap.fatal}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--ar-accent)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                >
                  <Send size={15} /> Submit test
                </button>
              ) : (
                <div role="alertdialog" aria-labelledby="confirm-title" className="space-y-3 rounded-lg border border-[var(--ar-border-strong)] bg-[var(--ar-bg)] p-4">
                  <p id="confirm-title" className="text-sm font-semibold text-[var(--ar-text)]">Submit your test now?</p>
                  <p className="text-xs text-[var(--ar-muted)]">
                    You can&apos;t change your answers after submitting.
                    {unanswered.length > 0 && ` ${unanswered.length} unanswered question${unanswered.length === 1 ? '' : 's'} will count as incorrect.`}
                  </p>
                  {submitError && (
                    <p role="alert" className="rounded-md border border-[var(--ar-danger)]/40 bg-[var(--ar-danger)]/10 px-3 py-2 text-xs text-[var(--ar-text)]">
                      {submitError}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void submit()}
                      disabled={submitting}
                      className="inline-flex items-center gap-2 rounded-lg bg-[var(--ar-accent)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                    >
                      {submitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                      {submitting ? 'Submitting…' : submitError ? 'Try again' : 'Yes, submit'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setConfirming(false);
                        setSubmitError(null);
                      }}
                      disabled={submitting}
                      className="rounded-lg border border-[var(--ar-border-strong)] px-4 py-2 text-sm text-[var(--ar-text)] hover:bg-[var(--ar-surface)]"
                    >
                      Keep checking
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => goTo(step - 1)}
              disabled={step === 0}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--ar-border-strong)] px-3 py-2 text-sm text-[var(--ar-text)] hover:bg-[var(--ar-surface)] disabled:opacity-40"
            >
              <ChevronLeft size={15} /> Previous
            </button>
            <button
              type="button"
              onClick={() => setShowList((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-[var(--ar-muted)] hover:text-[var(--ar-text)] @2xl:hidden"
            >
              <ListChecks size={14} /> Questions
            </button>
            {step < reviewStep ? (
              <button
                type="button"
                onClick={() => goTo(step + 1)}
                className="inline-flex items-center gap-1 rounded-lg bg-[var(--ar-accent)] px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                {step === reviewStep - 1 ? 'Review & submit' : 'Next'} <ChevronRight size={15} />
              </button>
            ) : (
              <span />
            )}
          </div>
        </div>

        {/* Question palette */}
        <aside className={`${showList ? 'block' : 'hidden'} space-y-3 rounded-xl border border-[var(--ar-border)] bg-[var(--ar-surface)] p-3 @2xl:block @2xl:self-start`} aria-label="Question list">
          {sections.map((section) => (
            <div key={section.key}>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--ar-faint)]">{section.title}</p>
              <div className="flex flex-wrap gap-1.5">
                {section.questions.map((q) => {
                  const idx = questions.indexOf(q);
                  const isAnswered = selections[q.id] !== null && selections[q.id] !== undefined;
                  const failing = queueSnap.states[q.id] === 'error';
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => goTo(idx)}
                      aria-label={`Question ${idx + 1}${isAnswered ? ', answered' : ', not answered'}`}
                      aria-current={step === idx ? 'step' : undefined}
                      className={`h-7 w-7 rounded-md border text-[11px] font-semibold tabular-nums transition-colors ${
                        step === idx ? 'ring-2 ring-[var(--ar-accent)] ring-offset-1 ring-offset-[var(--ar-surface)]' : ''
                      } ${
                        failing
                          ? 'border-[var(--ar-danger)] text-[var(--ar-danger)]'
                          : isAnswered
                            ? 'border-[var(--ar-accent)] bg-[var(--ar-accent)] text-white'
                            : 'border-[var(--ar-border-strong)] text-[var(--ar-muted)] hover:bg-[var(--ar-surface-2)]'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {project && (
            <button
              type="button"
              onClick={() => goTo(codingStep)}
              className={`w-full rounded-md border px-2 py-1.5 text-left text-xs font-semibold ${
                step === codingStep ? 'border-[var(--ar-accent)] bg-[var(--ar-accent-soft)]' : 'border-[var(--ar-border-strong)] hover:bg-[var(--ar-surface-2)]'
              } text-[var(--ar-text)]`}
            >
              💻 Coding project {code.trim() && code.trim() !== (project.starterCode ?? '').trim() ? '✓' : ''}
            </button>
          )}
          <button
            type="button"
            onClick={() => goTo(reviewStep)}
            className={`w-full rounded-md border px-2 py-1.5 text-left text-xs font-semibold ${
              step === reviewStep ? 'border-[var(--ar-accent)] bg-[var(--ar-accent-soft)]' : 'border-[var(--ar-border-strong)] hover:bg-[var(--ar-surface-2)]'
            } text-[var(--ar-text)]`}
          >
            ✅ Review &amp; submit
          </button>
          <p className="flex items-center gap-3 text-[10px] text-[var(--ar-faint)]">
            <span className="inline-flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-[var(--ar-accent)]" /> answered</span>
            <span className="inline-flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm border border-[var(--ar-border-strong)]" /> open</span>
          </p>
        </aside>
      </div>
    </div>
  );
}

function SaveHint({ state, answered }: { state: string | undefined; answered: boolean }) {
  if (state === 'error') return <span className="text-[var(--ar-danger)]">Not saved yet — retrying…</span>;
  if (state === 'saving') return <span className="text-[var(--ar-faint)]">Saving…</span>;
  if (answered) return <span className="text-[var(--ar-success)]">✓ Saved</span>;
  return <span className="text-[var(--ar-faint)]">Choose one answer</span>;
}

function Badge({ tone, icon, children }: { tone: 'ok' | 'muted' | 'danger'; icon: React.ReactNode; children: React.ReactNode }) {
  const cls =
    tone === 'ok'
      ? 'border-[var(--ar-success)]/40 text-[var(--ar-success)]'
      : tone === 'danger'
        ? 'border-[var(--ar-danger)]/50 text-[var(--ar-danger)]'
        : 'border-[var(--ar-border-strong)] text-[var(--ar-muted)]';
  return (
    <span role="status" className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${cls}`}>
      {icon}
      {children}
    </span>
  );
}
