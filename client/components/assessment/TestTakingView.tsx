'use client';

// The in-progress test, laid out for the whole window — it lives in its own
// browser tab, not in a narrow column:
//
//   ┌ sticky bar: title · progress · stopwatch · save status · Review & submit ┐
//   ├ question list ┬ the question (code and choices side by side) ┬ progress ──┤
//
// Wide screens use every pixel for something useful: the question list on the
// left, the question in the middle (a code question puts the code on the left and
// the choices on the right; short choices sit two to a row; True/False are two big
// buttons), and a progress/help column on the right. Narrower screens fold down to
// one column, and the list becomes a button.
//
// Reliability model (see lib/assessment/answerQueue.ts):
//   * every click is autosaved to the server, one request per question at a
//     time, retried with backoff while the network is down;
//   * the whole answer sheet is ALSO mirrored to localStorage, so a refresh
//     (or a tab crash) while offline still restores it;
//   * final submit sends the complete answer sheet, so a submission can never
//     lose an answer whose autosave failed — and submitting twice is harmless;
//   * if the teacher locks the test (time is up), the server refuses further
//     saves and everything already saved is submitted — this view then hands over
//     to the runner, which shows what happened.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, ChevronLeft, ChevronRight, CloudOff, Loader2, ListChecks, MonitorUp, Send, Timer } from 'lucide-react';
import { AnswerQueue, QueueSnapshot } from '@/lib/assessment/answerQueue';
import { errorMessage, getAttempt, httpStatus, isNetworkError, saveAnswer, saveCode, submitAttempt } from '@/lib/assessment/api';
import { elapsedMs } from '@/lib/assessment/clock';
import {
  countAnswered,
  formatElapsed,
  kindLabel,
  optionsAreShort,
  questionHasCode,
  splitSections,
  unansweredQuestions,
} from '@/lib/assessment/progress';
import type { AttemptQuestion, AttemptView, CodingProject } from '@/lib/assessment/types';
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
  onClosed,
}: {
  attempt: AttemptView;
  onSubmitted: (fresh: AttemptView) => void;
  /** The server refused a save because the test is no longer open (the teacher
   *  locked it, or it was submitted elsewhere) — the host should re-read it. */
  onClosed: () => void;
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
  const onClosedRef = useRef(onClosed);
  onClosedRef.current = onClosed;

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

  // The server will not take another answer: find out why (locked? submitted?).
  useEffect(() => {
    if (queueSnap.fatal) onClosedRef.current();
  }, [queueSnap.fatal]);

  // Retry failed saves the moment the browser says it is back online.
  useEffect(() => {
    const online = () => queueRef.current?.retryNow();
    window.addEventListener('online', online);
    return () => window.removeEventListener('online', online);
  }, []);

  // Stopwatch (informational — there is no time limit; the teacher ends the test).
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
      if (httpStatus(err) === 409) onClosedRef.current(); // the test is closed
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
    setShowList(false);
    window.scrollTo({ top: 0 });
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
  const elapsed = elapsedMs(attempt.startedAt, now, attempt.clockOffsetMs);
  const current = step < total ? questions[step] : null;
  const codeWritten = !!project && !!code.trim() && code.trim() !== (project.starterCode ?? '').trim();
  const pct = total ? (answered / total) * 100 : 0;

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
    <div className="flex min-h-dvh flex-col bg-[var(--s-bg)]" data-testid="test-taking-view">
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-[var(--ar-border)] bg-[var(--ar-surface)]/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[2200px] items-center gap-3 px-3 py-2 @4xl:px-6">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-[var(--ar-faint)]">{attempt.assessment.courseTitle}</p>
            <h1 className="truncate text-sm font-bold leading-tight text-[var(--ar-text)] @4xl:text-base">{attempt.assessment.title}</h1>
          </div>

          <div className="hidden w-56 flex-shrink-0 @3xl:block" aria-hidden>
            <div className="mb-1 flex justify-between text-[11px] text-[var(--ar-muted)]">
              <span className="tabular-nums">
                <strong className="text-[var(--ar-text)]">{answered}</strong> of {total} answered
              </span>
              {project && <span>+ coding</span>}
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--ar-surface-2)]">
              <div className="h-full rounded-full bg-[var(--ar-accent)] transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>

          {elapsed !== null && (
            <div
              className="flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-[var(--ar-border)] bg-[var(--ar-bg)] px-2.5 py-1"
              title="Time on the test so far. There is no fixed limit — your teacher tells you when time is up."
              data-testid="stopwatch"
            >
              <Timer size={15} className="text-[var(--ar-accent)]" aria-hidden />
              <span className="text-sm font-bold tabular-nums text-[var(--ar-text)]" role="timer" aria-label="Time on the test so far">
                {formatElapsed(elapsed)}
              </span>
            </div>
          )}

          <div className="hidden flex-shrink-0 @2xl:block">{saveBadge}</div>

          <button
            type="button"
            onClick={() => goTo(reviewStep)}
            className="hidden flex-shrink-0 items-center gap-1.5 rounded-lg bg-[var(--ar-accent)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 @xl:inline-flex"
          >
            <Send size={13} /> Review &amp; submit
          </button>
        </div>
        {/* Always-visible progress strip (the wide bar above is hidden on phones). */}
        <div className="h-1 bg-[var(--ar-surface-2)] @3xl:hidden">
          <div className="h-full bg-[var(--ar-accent)] transition-all" style={{ width: `${pct}%` }} />
        </div>
      </header>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="mx-auto grid w-full max-w-[2200px] flex-1 items-start gap-4 p-3 @4xl:grid-cols-[15rem_minmax(0,1fr)] @4xl:gap-6 @4xl:p-6 @7xl:grid-cols-[16rem_minmax(0,1fr)_21rem]">
        {/* Question list */}
        <aside
          className={`${showList ? 'block' : 'hidden'} space-y-4 rounded-2xl border border-[var(--ar-border)] bg-[var(--ar-surface)] p-4 @4xl:sticky @4xl:top-[5.25rem] @4xl:block @4xl:max-h-[calc(100dvh-6.5rem)] @4xl:overflow-y-auto`}
          aria-label="Question list"
        >
          {sections.map((section) => (
            <div key={section.key}>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--ar-faint)]">
                {section.title}{' '}
                <span className="font-normal normal-case tabular-nums">
                  · {section.questions.filter((q) => selections[q.id] != null).length}/{section.questions.length}
                </span>
              </p>
              <div className="grid grid-cols-6 gap-1.5 @4xl:grid-cols-5">
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
                      className={`h-9 rounded-lg border text-xs font-semibold tabular-nums transition-colors ${
                        step === idx ? 'ring-2 ring-[var(--ar-accent)] ring-offset-2 ring-offset-[var(--ar-surface)]' : ''
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
              className={`w-full rounded-lg border px-3 py-2 text-left text-xs font-semibold text-[var(--ar-text)] ${
                step === codingStep ? 'border-[var(--ar-accent)] bg-[var(--ar-accent-soft)]' : 'border-[var(--ar-border-strong)] hover:bg-[var(--ar-surface-2)]'
              }`}
            >
              💻 Coding project {codeWritten ? '✓' : ''}
            </button>
          )}
          <button
            type="button"
            onClick={() => goTo(reviewStep)}
            className={`w-full rounded-lg border px-3 py-2 text-left text-xs font-semibold text-[var(--ar-text)] ${
              step === reviewStep ? 'border-[var(--ar-accent)] bg-[var(--ar-accent-soft)]' : 'border-[var(--ar-border-strong)] hover:bg-[var(--ar-surface-2)]'
            }`}
          >
            ✅ Review &amp; submit
          </button>
          <p className="flex items-center gap-3 text-[10px] text-[var(--ar-faint)]">
            <span className="inline-flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-[var(--ar-accent)]" /> answered</span>
            <span className="inline-flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm border border-[var(--ar-border-strong)]" /> open</span>
          </p>
        </aside>

        {/* Main */}
        {/* The main column is its own size container: the cards inside lay themselves
            out by the room THEY have (a split pane only when the column is wide
            enough), not by the width of the window — the side columns take their
            share first. Window-level decisions inside it use the named container. */}
        <main className="@container flex min-w-0 flex-col gap-4 @4xl/runner:min-h-[calc(100dvh-6.75rem)]">
          {initial.restoredFromBackup.length > 0 && (
            <p className="rounded-lg border border-[var(--ar-warning)]/40 bg-[var(--ar-warning)]/10 px-3 py-2 text-xs text-[var(--ar-text)]">
              We restored {initial.restoredFromBackup.length} answer{initial.restoredFromBackup.length === 1 ? '' : 's'} from this device that hadn&apos;t reached Lumexa yet.
            </p>
          )}

          <div className="flex items-center justify-between gap-2 @2xl/runner:hidden">{saveBadge}</div>

          {current && (
            <QuestionCard
              question={current}
              number={step + 1}
              total={total}
              selected={selections[current.id] ?? null}
              saveState={queueSnap.states[current.id]}
              onChoose={(i) => choose(current.id, i)}
              headingRef={headingRef}
            />
          )}

          {step === codingStep && project && (
            <CodingCard project={project} code={code} codeSave={codeSave} onChange={onCodeChange} headingRef={headingRef} />
          )}

          {step === reviewStep && (
            <ReviewCard
              total={total}
              answered={answered}
              unanswered={unanswered}
              questions={questions}
              project={project}
              codeWritten={codeWritten}
              confirming={confirming}
              submitting={submitting}
              submitError={submitError}
              disabled={queueSnap.fatal}
              onGoTo={goTo}
              onAsk={() => setConfirming(true)}
              onCancel={() => {
                setConfirming(false);
                setSubmitError(null);
              }}
              onSubmit={() => void submit()}
              headingRef={headingRef}
            />
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => goTo(step - 1)}
              disabled={step === 0}
              className="inline-flex items-center gap-1 rounded-xl border border-[var(--ar-border-strong)] bg-[var(--ar-surface)] px-4 py-2.5 text-sm font-medium text-[var(--ar-text)] hover:bg-[var(--ar-surface-2)] disabled:opacity-40"
            >
              <ChevronLeft size={16} /> Previous
            </button>
            <button
              type="button"
              onClick={() => setShowList((v) => !v)}
              aria-expanded={showList}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-[var(--ar-muted)] hover:text-[var(--ar-text)] @4xl/runner:hidden"
            >
              <ListChecks size={14} /> Questions
            </button>
            {step < reviewStep ? (
              <button
                type="button"
                onClick={() => goTo(step + 1)}
                className="inline-flex items-center gap-1 rounded-xl bg-[var(--ar-accent)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
              >
                {step === reviewStep - 1 ? 'Review & submit' : 'Next'} <ChevronRight size={16} />
              </button>
            ) : (
              <span />
            )}
          </div>
        </main>

        {/* Progress + how this works — the extra room on a wide screen */}
        <aside className="hidden space-y-4 @7xl:sticky @7xl:top-[5.25rem] @7xl:block" aria-label="Your progress">
          <section className="space-y-3 rounded-2xl border border-[var(--ar-border)] bg-[var(--ar-surface)] p-4">
            <h2 className="text-sm font-semibold text-[var(--ar-text)]">Your progress</h2>
            <p className="text-3xl font-extrabold tabular-nums text-[var(--ar-text)]">
              {answered}
              <span className="text-lg font-semibold text-[var(--ar-faint)]"> / {total}</span>
            </p>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--ar-surface-2)]">
              <div className="h-full rounded-full bg-[var(--ar-accent)] transition-all" style={{ width: `${pct}%` }} />
            </div>
            <ul className="space-y-1.5 text-xs text-[var(--ar-muted)]">
              {sections.map((s) => (
                <li key={s.key} className="flex justify-between">
                  <span>{s.title}</span>
                  <span className="tabular-nums text-[var(--ar-text)]">
                    {s.questions.filter((q) => selections[q.id] != null).length} / {s.questions.length}
                  </span>
                </li>
              ))}
              {project && (
                <li className="flex justify-between">
                  <span>Coding project</span>
                  <span className="text-[var(--ar-text)]">{codeWritten ? 'Started ✓' : 'Not started'}</span>
                </li>
              )}
            </ul>
            <button
              type="button"
              onClick={() => goTo(reviewStep)}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--ar-accent)] px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              <Send size={14} /> Review &amp; submit
            </button>
          </section>

          <section className="space-y-2 rounded-2xl border border-[var(--ar-border)] bg-[var(--ar-surface)] p-4 text-xs leading-relaxed text-[var(--ar-muted)]">
            <h2 className="text-sm font-semibold text-[var(--ar-text)]">How this works</h2>
            <p className="flex gap-2">
              <Timer size={14} className="mt-0.5 flex-shrink-0 text-[var(--ar-accent)]" />
              <span>
                There&apos;s <strong className="text-[var(--ar-text)]">no fixed time limit</strong>. Your teacher tells you when time is up and locks the test —
                everything you&apos;ve saved is submitted automatically.
              </span>
            </p>
            <p className="flex gap-2">
              <MonitorUp size={14} className="mt-0.5 flex-shrink-0 text-[var(--ar-accent)]" />
              <span>Keep sharing your entire screen until your teacher says you can stop.</span>
            </p>
            <p className="flex gap-2">
              <Check size={14} className="mt-0.5 flex-shrink-0 text-[var(--ar-success)]" />
              <span>Answers save as you go. You can change them until you submit.</span>
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}

// ── One question ────────────────────────────────────────────────────────────

function QuestionCard({
  question,
  number,
  total,
  selected,
  saveState,
  onChoose,
  headingRef,
}: {
  question: AttemptQuestion;
  number: number;
  total: number;
  selected: number | null;
  saveState: string | undefined;
  onChoose: (index: number | null) => void;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}) {
  const isTrueFalse = question.kind === 'TRUE_FALSE';
  // A question with a code block puts the code on the left and the choices on
  // the right once there is room, instead of one very long column.
  const split = questionHasCode(question.text);
  const twoPerRow = !split && !isTrueFalse && optionsAreShort(question.options);
  const letter = (i: number) => String.fromCharCode(65 + i);

  const optionsClass = isTrueFalse
    ? 'grid grid-cols-2 gap-3'
    : twoPerRow
      ? 'grid gap-3 @xl:grid-cols-2'
      : 'space-y-2.5';

  return (
    <section
      className="flex flex-1 flex-col rounded-2xl border border-[var(--ar-border)] bg-[var(--ar-surface)] p-4 @4xl:p-6 @min-[70rem]:p-8"
      aria-labelledby="q-heading"
      data-testid="question-card"
    >
      <div className="mb-3 flex items-center justify-between gap-2 text-xs text-[var(--ar-muted)]">
        <h2 id="q-heading" ref={headingRef} tabIndex={-1} className="text-sm font-semibold text-[var(--ar-text)] outline-none">
          Question {number} of {total}
        </h2>
        <span className="rounded-full border border-[var(--ar-border-strong)] px-2.5 py-0.5">{kindLabel(question.kind)} · 1 mark</span>
      </div>

      <div className={split ? '@5xl:grid @5xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] @5xl:items-start @5xl:gap-8' : ''}>
        <QuestionText
          text={question.text}
          className={`text-base text-[var(--ar-text)] @4xl:text-lg @min-[70rem]:text-xl ${split ? 'mb-4 @5xl:mb-0' : 'mb-5'}`}
        />

        <div role="radiogroup" aria-label={`Answer for question ${number}`} className={optionsClass}>
          {question.options.map((opt, i) => {
            const isSelected = selected === i;
            return (
              <label
                key={i}
                className={`flex cursor-pointer gap-3 rounded-xl border px-4 transition-colors ${
                  isTrueFalse
                    ? 'min-h-[4.5rem] items-center justify-center py-3 text-lg font-semibold @min-[70rem]:min-h-[6rem] @min-[70rem]:text-2xl'
                    : 'items-start py-3 text-[15px] @min-[70rem]:py-4 @min-[70rem]:text-base'
                } ${
                  isSelected
                    ? 'border-[var(--ar-accent)] bg-[var(--ar-accent-soft)] ring-1 ring-[var(--ar-accent)]'
                    : 'border-[var(--ar-border)] bg-[var(--ar-bg)] hover:border-[var(--ar-border-strong)]'
                }`}
              >
                <input
                  type="radio"
                  name={`q-${question.id}`}
                  value={i}
                  checked={isSelected}
                  onChange={() => onChoose(i)}
                  className={`h-4 w-4 flex-shrink-0 accent-[var(--ar-accent)] ${isTrueFalse ? '' : 'mt-1'}`}
                />
                {question.kind === 'MCQ' && (
                  <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md bg-[var(--ar-surface-2)] text-[11px] font-bold text-[var(--ar-muted)]">
                    {letter(i)}
                  </span>
                )}
                <OptionText text={opt} className={`min-w-0 text-[var(--ar-text)] ${isTrueFalse ? '' : 'flex-1'}`} />
              </label>
            );
          })}
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between pt-5 text-xs">
        <SaveHint state={saveState} answered={selected !== null} />
        {selected !== null && (
          <button type="button" onClick={() => onChoose(null)} className="text-[var(--ar-muted)] underline hover:text-[var(--ar-text)]">
            Clear answer
          </button>
        )}
      </div>
    </section>
  );
}

// ── The coding project ──────────────────────────────────────────────────────

function CodingCard({
  project,
  code,
  codeSave,
  onChange,
  headingRef,
}: {
  project: CodingProject;
  code: string;
  codeSave: CodeSave;
  onChange: (value: string) => void;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}) {
  return (
    <section className="grid flex-1 gap-4 @4xl:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] @4xl:items-stretch" aria-labelledby="code-heading" data-testid="coding-card">
      <div className="space-y-3 rounded-2xl border border-[var(--ar-border)] bg-[var(--ar-surface)] p-4 @4xl:p-6 @4xl:sticky @4xl:top-[5.25rem] @4xl:max-h-[calc(100dvh-6.5rem)] @4xl:overflow-y-auto">
        <h2 id="code-heading" ref={headingRef} tabIndex={-1} className="text-sm font-semibold text-[var(--ar-text)] outline-none">
          💻 Coding project · {project.title}
        </h2>
        <QuestionText text={project.instructions} className="text-sm text-[var(--ar-text)] @4xl:text-[15px]" />
        {project.rubric.length > 0 && (
          <div className="rounded-xl border border-[var(--ar-border)] bg-[var(--ar-bg)] p-3">
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
      </div>

      <div className="flex flex-col rounded-2xl border border-[var(--ar-border)] bg-[var(--ar-surface)] p-4 @4xl:p-6">
        <label className="mb-2 block text-xs font-medium text-[var(--ar-muted)]" htmlFor="code-editor">
          Your code ({project.language})
        </label>
        <textarea
          id="code-editor"
          value={code}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            // Tab inserts spaces like a code editor; Esc then Tab moves focus on.
            if (e.key === 'Tab' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
              e.preventDefault();
              const el = e.currentTarget;
              const { selectionStart: s, selectionEnd: en } = el;
              onChange(code.slice(0, s) + '    ' + code.slice(en));
              requestAnimationFrame(() => el.setSelectionRange(s + 4, s + 4));
            }
          }}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          aria-describedby="code-hint"
          maxLength={20000}
          className="min-h-[24rem] w-full flex-1 rounded-xl border border-[var(--ar-border-strong)] bg-black/85 p-4 font-mono text-[13px] leading-relaxed text-gray-100 focus:outline-none focus:ring-2 focus:ring-[var(--ar-accent)] @4xl:min-h-[calc(100dvh-17rem)]"
        />
        <p id="code-hint" className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--ar-faint)]">
          <span>Press Esc then Tab to leave the editor. Your teacher marks this project — it is not run automatically.</span>
          <span>
            {codeSave === 'saving' && 'Saving…'}
            {codeSave === 'saved' && '✓ Saved'}
            {codeSave === 'error' && <span className="text-[var(--ar-danger)]">Not saved yet — retrying…</span>}
          </span>
        </p>
      </div>
    </section>
  );
}

// ── Review & submit ─────────────────────────────────────────────────────────

function ReviewCard({
  total,
  answered,
  unanswered,
  questions,
  project,
  codeWritten,
  confirming,
  submitting,
  submitError,
  disabled,
  onGoTo,
  onAsk,
  onCancel,
  onSubmit,
  headingRef,
}: {
  total: number;
  answered: number;
  unanswered: AttemptQuestion[];
  questions: AttemptQuestion[];
  project: CodingProject | null;
  codeWritten: boolean;
  confirming: boolean;
  submitting: boolean;
  submitError: string | null;
  disabled: boolean;
  onGoTo: (step: number) => void;
  onAsk: () => void;
  onCancel: () => void;
  onSubmit: () => void;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}) {
  return (
    <section
      className="grid flex-1 content-start gap-5 rounded-2xl border border-[var(--ar-border)] bg-[var(--ar-surface)] p-4 @4xl:grid-cols-2 @4xl:p-6"
      aria-labelledby="review-heading"
      data-testid="review-card"
    >
      <div className="space-y-4">
        <h2 id="review-heading" ref={headingRef} tabIndex={-1} className="text-sm font-semibold text-[var(--ar-text)] outline-none">
          Review &amp; submit
        </h2>
        <ul className="space-y-1.5 text-sm text-[var(--ar-text)]">
          <li className="flex items-center gap-2">
            {unanswered.length === 0 ? <Check size={15} className="text-[var(--ar-success)]" /> : <AlertTriangle size={15} className="text-[var(--ar-warning)]" />}
            {answered} of {total} questions answered
          </li>
          {project && (
            <li className="flex items-center gap-2">
              {codeWritten ? <Check size={15} className="text-[var(--ar-success)]" /> : <AlertTriangle size={15} className="text-[var(--ar-warning)]" />}
              {codeWritten ? 'Coding project written' : "You haven't written any code for the coding project yet"}
            </li>
          )}
        </ul>
        {unanswered.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-medium text-[var(--ar-muted)]">Unanswered — tap a number to go back:</p>
            <div className="flex flex-wrap gap-1.5">
              {unanswered.map((q) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => onGoTo(questions.indexOf(q))}
                  className="h-8 min-w-8 rounded-lg border border-[var(--ar-warning)]/50 px-2 text-xs font-semibold text-[var(--ar-text)] hover:bg-[var(--ar-warning)]/10"
                >
                  {questions.indexOf(q) + 1}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {!confirming ? (
          <>
            <p className="text-sm text-[var(--ar-muted)]">
              When you&apos;re happy with your answers, submit the test. Your teacher then reviews it and shares your result.
            </p>
            <button
              type="button"
              data-testid="submit-test"
              onClick={onAsk}
              disabled={disabled}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--ar-accent)] px-4 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              <Send size={15} /> Submit test
            </button>
          </>
        ) : (
          <div role="alertdialog" aria-labelledby="confirm-title" className="space-y-3 rounded-xl border border-[var(--ar-border-strong)] bg-[var(--ar-bg)] p-4">
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
                data-testid="confirm-submit"
                onClick={onSubmit}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--ar-accent)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
              >
                {submitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                {submitting ? 'Submitting…' : submitError ? 'Try again' : 'Yes, submit'}
              </button>
              <button
                type="button"
                onClick={onCancel}
                disabled={submitting}
                className="rounded-lg border border-[var(--ar-border-strong)] px-4 py-2 text-sm text-[var(--ar-text)] hover:bg-[var(--ar-surface)]"
              >
                Keep checking
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
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
