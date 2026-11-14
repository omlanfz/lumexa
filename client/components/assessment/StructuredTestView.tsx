'use client';

// The in-progress structured assessment (Pre-University CSE): Part A 10 multiple-choice questions, Part B
// 3 written answers, Part C one practical — 45 marks in at most 40 minutes.
//
//   ┌ sticky bar: title · progress · COUNTDOWN · save status · Hand in ┐
//   ├ the tasks ┬ the task (the question, an answer box, or the editor) ┬ progress ┤
//
// The clock belongs to the SERVER: it froze the deadline when the attempt started and sends its own clock
// with every response (see lib/assessment/clock.ts), so a computer that is minutes fast or slow still shows
// the right time. The countdown warns at 10, 5 and 1 minute, and at 00:00 this view hands in everything the
// student has — and if the browser is closed or offline, the server hands in what was saved (see
// StructuredAttemptSweeper), so a test never stays open.
//
// Reliability model (same as TestTakingView):
//   * every click and every pause in typing is autosaved, one request per answer at a time, retried with
//     backoff while the network is down (answerQueue.ts for Part A, textQueue.ts for Parts B and C);
//   * the whole answer sheet is ALSO mirrored to localStorage, so a refresh while offline restores it;
//   * the hand-in sends the complete sheet, so an answer whose autosave failed is never lost, and handing
//     in twice is harmless.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, CloudOff, ListChecks, Loader2, MonitorUp, Send, Timer } from 'lucide-react';
import { AnswerQueue, type QueueSnapshot } from '@/lib/assessment/answerQueue';
import { TextSaveQueue, type TextQueueSnapshot } from '@/lib/assessment/textQueue';
import { errorMessage, getAttempt, httpStatus, isNetworkError, saveAnswer, saveCode, saveShortAnswer, submitAttempt } from '@/lib/assessment/api';
import { countAnswered } from '@/lib/assessment/progress';
import {
  STRUCTURED_MARKS,
  crossedAlert,
  remainingMs,
  resumeStep,
  stepKind,
  stepPart,
  structuredLayout,
  structuredProgress,
} from '@/lib/assessment/structured';
import type { AttemptView } from '@/lib/assessment/types';
import { Badge, QuestionCard } from './TestTakingView';
import { Countdown, PracticalCard, ShortAnswerCard, StructuredReviewCard, TimeAlert, TimeUpNotice, type SaveStatus } from './StructuredCards';

const CODE_KEY = '__practical__';
const TICK_MS = 500;
const mirrorKey = (attemptId: string) => `lumexa:structured:${attemptId}`;

interface Mirror {
  answers: Record<string, number | null>;
  short: Record<string, string>;
  code?: string;
  /** When this device last changed something (ms since the epoch, this computer's clock). */
  at: number;
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
    // storage blocked or full — the server copy is the real one
  }
}

const toStatus = (s: string | undefined): SaveStatus | undefined => (s === 'saving' || s === 'saved' || s === 'error' ? s : undefined);

export default function StructuredTestView({
  attempt,
  onSubmitted,
  onClosed,
}: {
  attempt: AttemptView;
  onSubmitted: (fresh: AttemptView) => void;
  /** The server refused a save because the test is no longer open — the host should re-read it. */
  onClosed: () => void;
}) {
  const info = attempt.structured!;
  const questions = attempt.questions;
  const shortAnswers = info.shortAnswers;
  const project = attempt.codingProject;
  const layout = useMemo(() => structuredLayout(questions.length, shortAnswers.length, !!project), [questions.length, shortAnswers.length, project]);

  // ── Restore: the server's copy first, then anything only this device has ──
  const initial = useMemo(() => {
    const selections: Record<string, number | null> = {};
    for (const q of questions) selections[q.id] = q.selectedIndex;
    const texts: Record<string, string> = {};
    for (const s of shortAnswers) texts[s.id] = s.answer ?? '';
    let code = project?.code ?? '';
    const mirror = readMirror(attempt.id);
    const restoredAnswers: string[] = [];
    const restoredTexts: string[] = [];
    let restoredCode = false;
    if (mirror) {
      for (const q of questions) {
        const local = mirror.answers?.[q.id];
        if (selections[q.id] === null && local !== undefined && local !== null && local >= 0 && local < q.options.length) {
          selections[q.id] = local;
          restoredAnswers.push(q.id);
        }
      }
      for (const s of shortAnswers) {
        const local = mirror.short?.[s.id];
        const serverAt = s.savedAt ? new Date(s.savedAt).getTime() : 0;
        if (typeof local === 'string' && local !== texts[s.id] && mirror.at > serverAt) {
          texts[s.id] = local;
          restoredTexts.push(s.id);
        }
      }
      if (project && typeof mirror.code === 'string' && mirror.code !== code) {
        const serverAt = project.savedAt ? new Date(project.savedAt).getTime() : 0;
        if (mirror.at > serverAt) {
          code = mirror.code;
          restoredCode = true;
        }
      }
    }
    return { selections, texts, code, restoredAnswers, restoredTexts, restoredCode };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt.id]);

  const starter = (project?.starterCode ?? '').trim();
  const codeStartedOf = (c: string) => !!project && c.trim() !== '' && c.trim() !== starter;

  const [selections, setSelections] = useState<Record<string, number | null>>(initial.selections);
  const [texts, setTexts] = useState<Record<string, string>>(initial.texts);
  const [code, setCode] = useState(initial.code);
  const [step, setStep] = useState(() =>
    resumeStep(layout, {
      mcqAnswered: questions.map((q) => initial.selections[q.id] != null),
      shortWritten: shortAnswers.map((s) => initial.texts[s.id].trim() !== ''),
      codeStarted: codeStartedOf(initial.code),
    }),
  );
  const [queueSnap, setQueueSnap] = useState<QueueSnapshot>({ states: {}, unsaved: 0, hasError: false, fatal: false });
  const [textSnap, setTextSnap] = useState<TextQueueSnapshot>({ states: {}, unsaved: 0, hasError: false, fatal: false });
  const [showList, setShowList] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [alertMinutes, setAlertMinutes] = useState<number | null>(null);

  const queueRef = useRef<AnswerQueue | null>(null);
  const textQueueRef = useRef<TextSaveQueue | null>(null);
  const selectionsRef = useRef(initial.selections);
  const textsRef = useRef(initial.texts);
  const codeRef = useRef(initial.code);
  const submittingRef = useRef(false);
  const handedInRef = useRef(false);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const onClosedRef = useRef(onClosed);
  onClosedRef.current = onClosed;

  const remaining = remainingMs(attempt.deadlineAt, now, attempt.clockOffsetMs);
  const timeUp = remaining === 0;

  // ── Saving ─────────────────────────────────────────────────────────────────
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
    for (const id of initial.restoredAnswers) queue.enqueue(id, initial.selections[id]);
    queueRef.current = queue;

    const textQueue = new TextSaveQueue({
      send: (key, text) =>
        key === CODE_KEY && project
          ? saveCode(attempt.id, project.id, text).then(() => undefined)
          : saveShortAnswer(attempt.id, key, text).then(() => undefined),
      onChange: setTextSnap,
      isFatal: (err) => {
        const s = httpStatus(err);
        return s === 409 || s === 403 || s === 404;
      },
    });
    for (const s of shortAnswers) textQueue.hydrate(s.id, s.answer ?? '');
    if (project) textQueue.hydrate(CODE_KEY, project.code ?? '');
    for (const id of initial.restoredTexts) textQueue.enqueue(id, initial.texts[id]);
    if (initial.restoredCode) textQueue.enqueue(CODE_KEY, initial.code);
    textQueueRef.current = textQueue;
    return () => {
      queue.dispose();
      textQueue.dispose();
      queueRef.current = null;
      textQueueRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt.id]);

  // The server will not take another answer: find out why (handed in? time up?).
  const fatal = queueSnap.fatal || textSnap.fatal;
  useEffect(() => {
    if (fatal) onClosedRef.current();
  }, [fatal]);

  // Retry failed saves the moment the browser says it is back online.
  useEffect(() => {
    const online = () => {
      queueRef.current?.retryNow();
      textQueueRef.current?.retryNow();
    };
    window.addEventListener('online', online);
    return () => window.removeEventListener('online', online);
  }, []);

  const remember = () =>
    writeMirror(attempt.id, { answers: selectionsRef.current, short: textsRef.current, code: codeRef.current, at: Date.now() });

  const choose = (questionId: string, index: number | null) => {
    const next = { ...selectionsRef.current, [questionId]: index };
    selectionsRef.current = next;
    setSelections(next);
    remember();
    queueRef.current?.enqueue(questionId, index);
  };

  const writeShort = (id: string, value: string) => {
    textsRef.current = { ...textsRef.current, [id]: value };
    setTexts(textsRef.current);
    remember();
    textQueueRef.current?.enqueue(id, value);
  };

  const writeCode = (value: string) => {
    codeRef.current = value;
    setCode(value);
    remember();
    textQueueRef.current?.enqueue(CODE_KEY, value);
  };

  // ── The clock ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(t);
  }, []);

  // 10, 5 and 1 minute left: say so, once each.
  const previousRemaining = useRef<number | null>(remaining);
  useEffect(() => {
    const crossed = crossedAlert(previousRemaining.current, remaining);
    previousRemaining.current = remaining;
    if (crossed !== null) setAlertMinutes(crossed);
  }, [remaining]);
  useEffect(() => {
    if (alertMinutes === null) return;
    const t = setTimeout(() => setAlertMinutes(null), 9000);
    return () => clearTimeout(t);
  }, [alertMinutes]);

  // The tab says how much time is left, for a student who is looking at something else.
  useEffect(() => {
    if (remaining === null) return;
    const before = document.title;
    const seconds = Math.ceil(remaining / 1000);
    const label = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
    document.title = `${label} left · ${attempt.assessment.title}`;
    return () => {
      document.title = before;
    };
  }, [remaining, attempt.assessment.title]);

  // Warn before leaving with answers that have not reached the server.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (queueSnap.unsaved > 0 || textSnap.unsaved > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [queueSnap.unsaved, textSnap.unsaved]);

  // ── Hand in ────────────────────────────────────────────────────────────────
  const submit = useCallback(
    async (auto = false) => {
      if (submittingRef.current || handedInRef.current) return;
      submittingRef.current = true;
      setSubmitting(true);
      setSubmitError(null);
      try {
        await submitAttempt(attempt.id, {
          answers: questions.map((q) => ({ questionId: q.id, selectedIndex: selectionsRef.current[q.id] ?? null })),
          shortAnswers: shortAnswers.map((s) => ({ questionId: s.id, answer: textsRef.current[s.id] ?? '' })),
          practical: project ? [{ questionId: project.id, code: codeRef.current }] : undefined,
        });
        handedInRef.current = true;
        try {
          localStorage.removeItem(mirrorKey(attempt.id));
        } catch {
          /* ignore */
        }
        onSubmitted(await getAttempt(attempt.id));
      } catch (err) {
        const status = httpStatus(err);
        if (status === 409 || status === 403 || status === 404) {
          // Already handed in (by the server, or from another tab): the host re-reads the attempt.
          onClosedRef.current();
        }
        setSubmitError(
          isNetworkError(err)
            ? auto
              ? "We couldn't reach Lumexa to hand in your work. It is safe on this page and we keep trying — check your connection."
              : "We couldn't reach Lumexa, so your assessment has NOT been handed in yet. Your answers are still on this page — check your connection and press the button again."
            : errorMessage(err, 'Your assessment could not be handed in. Please try again.'),
        );
      } finally {
        submittingRef.current = false;
        setSubmitting(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [attempt.id, onSubmitted],
  );

  // 00:00: hand in everything the student has — once; after a failure, try again every few seconds.
  useEffect(() => {
    if (timeUp && !submittingRef.current && !handedInRef.current && !submitError) void submit(true);
  }, [timeUp, submitError, submit]);
  useEffect(() => {
    if (!timeUp || !submitError || submitting || handedInRef.current) return;
    const t = setTimeout(() => void submit(true), 3000);
    return () => clearTimeout(t);
  }, [timeUp, submitError, submitting, submit]);

  // ── Where the student is ───────────────────────────────────────────────────
  const goTo = (next: number) => {
    setStep(Math.max(0, Math.min(layout.reviewStep, next)));
    setConfirming(false);
    setShowList(false);
    window.scrollTo({ top: 0 });
    setTimeout(() => headingRef.current?.focus(), 0);
  };

  const here = stepKind(layout, step);
  const answeredA = countAnswered(questions, selections);
  const writtenB = shortAnswers.filter((s) => (texts[s.id] ?? '').trim() !== '').length;
  const codeStarted = codeStartedOf(code);
  const progress = structuredProgress({
    mcqAnswered: answeredA,
    mcqTotal: questions.length,
    shortAnswers: shortAnswers.map((s) => texts[s.id] ?? ''),
    codeStarted: project ? codeStarted : true,
  });
  const unansweredA = questions.map((q, i) => (selections[q.id] == null ? i + 1 : 0)).filter(Boolean);
  const doneTasks = answeredA + writtenB + (codeStarted ? 1 : 0);
  const totalTasks = questions.length + shortAnswers.length + (project ? 1 : 0);
  const pct = totalTasks ? (doneTasks / totalTasks) * 100 : 0;
  const currentPart = stepPart(layout, step);

  const unsaved = queueSnap.unsaved + textSnap.unsaved;
  const hasError = queueSnap.hasError || textSnap.hasError;
  const saveBadge = fatal ? (
    <Badge tone="danger" icon={<CloudOff size={13} />}>This test can no longer be changed</Badge>
  ) : hasError ? (
    <Badge tone="danger" icon={<CloudOff size={13} />}>Not saved yet — retrying…</Badge>
  ) : unsaved > 0 ? (
    <Badge tone="muted" icon={<Loader2 size={13} className="animate-spin" />}>Saving…</Badge>
  ) : (
    <Badge tone="ok" icon={<Check size={13} />}>All answers saved</Badge>
  );

  const navButton = (label: string, target: number, done: boolean, failing: boolean, active: boolean, ariaLabel: string) => (
    <button
      key={`${label}-${target}`}
      type="button"
      onClick={() => goTo(target)}
      aria-label={ariaLabel}
      aria-current={active ? 'step' : undefined}
      className={`h-9 rounded-lg border text-xs font-semibold tabular-nums transition-colors ${
        active ? 'ring-2 ring-[var(--ar-accent)] ring-offset-2 ring-offset-[var(--ar-surface)]' : ''
      } ${
        failing
          ? 'border-[var(--ar-danger)] text-[var(--ar-danger)]'
          : done
            ? 'border-[var(--ar-accent)] bg-[var(--ar-accent)] text-white'
            : 'border-[var(--ar-border-strong)] text-[var(--ar-muted)] hover:bg-[var(--ar-surface-2)]'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--s-bg)]" data-testid="structured-test-view">
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-[var(--ar-border)] bg-[var(--ar-surface)]/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[2200px] items-center gap-3 px-3 py-2 @4xl:px-6">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-[var(--ar-faint)]">
              {attempt.assessment.courseTitle} · {info.timeLimitMinutes} min · {info.marks.total} marks
            </p>
            <h1 className="truncate text-sm font-bold leading-tight text-[var(--ar-text)] @4xl:text-base">{attempt.assessment.title}</h1>
          </div>

          <div className="hidden w-56 flex-shrink-0 @3xl:block" aria-hidden>
            <div className="mb-1 flex justify-between text-[11px] text-[var(--ar-muted)]">
              <span className="tabular-nums">
                <strong className="text-[var(--ar-text)]">{doneTasks}</strong> of {totalTasks} started
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--ar-surface-2)]">
              <div className="h-full rounded-full bg-[var(--ar-accent)] transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>

          <Countdown remaining={remaining} />

          <div className="hidden flex-shrink-0 @2xl:block">{saveBadge}</div>

          <button
            type="button"
            onClick={() => goTo(layout.reviewStep)}
            className="hidden flex-shrink-0 items-center gap-1.5 rounded-lg bg-[var(--ar-accent)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 @xl:inline-flex"
          >
            <Send size={13} /> Review &amp; hand in
          </button>
        </div>
        <div className="h-1 bg-[var(--ar-surface-2)] @3xl:hidden">
          <div className="h-full bg-[var(--ar-accent)] transition-all" style={{ width: `${pct}%` }} />
        </div>
      </header>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="mx-auto grid w-full max-w-[2200px] flex-1 items-start gap-4 p-3 @4xl:grid-cols-[15rem_minmax(0,1fr)] @4xl:gap-6 @4xl:p-6 @7xl:grid-cols-[16rem_minmax(0,1fr)_21rem]">
        {/* The tasks */}
        <aside
          className={`${showList ? 'block' : 'hidden'} space-y-4 rounded-2xl border border-[var(--ar-border)] bg-[var(--ar-surface)] p-4 @4xl:sticky @4xl:top-[5.25rem] @4xl:block @4xl:max-h-[calc(100dvh-6.5rem)] @4xl:overflow-y-auto`}
          aria-label="Tasks"
        >
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--ar-faint)]">
              Part A · Multiple choice <span className="font-normal normal-case tabular-nums">· {answeredA}/{questions.length}</span>
            </p>
            <div className="grid grid-cols-6 gap-1.5 @4xl:grid-cols-5">
              {questions.map((q, i) =>
                navButton(
                  String(i + 1),
                  i,
                  selections[q.id] != null,
                  queueSnap.states[q.id] === 'error',
                  step === i,
                  `Question ${i + 1}${selections[q.id] != null ? ', answered' : ', not answered'}`,
                ),
              )}
            </div>
          </div>
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--ar-faint)]">
              Part B · Short answers <span className="font-normal normal-case tabular-nums">· {writtenB}/{shortAnswers.length}</span>
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {shortAnswers.map((s, i) =>
                navButton(
                  `B${i + 1}`,
                  layout.shortStart + i,
                  (texts[s.id] ?? '').trim() !== '',
                  textSnap.states[s.id] === 'error',
                  step === layout.shortStart + i,
                  `Short answer ${i + 1}${(texts[s.id] ?? '').trim() !== '' ? ', written' : ', empty'}`,
                ),
              )}
            </div>
          </div>
          {project && (
            <button
              type="button"
              onClick={() => goTo(layout.practicalStep)}
              aria-current={step === layout.practicalStep ? 'step' : undefined}
              className={`w-full rounded-lg border px-3 py-2 text-left text-xs font-semibold text-[var(--ar-text)] ${
                step === layout.practicalStep ? 'border-[var(--ar-accent)] bg-[var(--ar-accent-soft)]' : 'border-[var(--ar-border-strong)] hover:bg-[var(--ar-surface-2)]'
              }`}
            >
              💻 Part C · Practical {codeStarted ? '✓' : ''}
            </button>
          )}
          <button
            type="button"
            onClick={() => goTo(layout.reviewStep)}
            aria-current={step === layout.reviewStep ? 'step' : undefined}
            className={`w-full rounded-lg border px-3 py-2 text-left text-xs font-semibold text-[var(--ar-text)] ${
              step === layout.reviewStep ? 'border-[var(--ar-accent)] bg-[var(--ar-accent-soft)]' : 'border-[var(--ar-border-strong)] hover:bg-[var(--ar-surface-2)]'
            }`}
          >
            ✅ Review &amp; hand in
          </button>
          <p className="flex items-center gap-3 text-[10px] text-[var(--ar-faint)]">
            <span className="inline-flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-[var(--ar-accent)]" /> done</span>
            <span className="inline-flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-sm border border-[var(--ar-border-strong)]" /> open</span>
          </p>
        </aside>

        {/* The task */}
        <main className="@container flex min-w-0 flex-col gap-4 @4xl/runner:min-h-[calc(100dvh-6.75rem)]">
          <TimeAlert minutes={alertMinutes} onDismiss={() => setAlertMinutes(null)} />

          {(initial.restoredAnswers.length > 0 || initial.restoredTexts.length > 0 || initial.restoredCode) && (
            <p className="rounded-lg border border-[var(--ar-warning)]/40 bg-[var(--ar-warning)]/10 px-3 py-2 text-xs text-[var(--ar-text)]">
              We restored work from this device that hadn&apos;t reached Lumexa yet, and we are saving it now.
            </p>
          )}

          <div className="flex items-center justify-between gap-2 @2xl/runner:hidden">{saveBadge}</div>

          {here.kind === 'mcq' && (
            <QuestionCard
              question={questions[here.index]}
              number={here.index + 1}
              total={questions.length}
              selected={selections[questions[here.index].id] ?? null}
              saveState={queueSnap.states[questions[here.index].id]}
              onChoose={(i) => choose(questions[here.index].id, i)}
              headingRef={headingRef}
            />
          )}

          {here.kind === 'short' && (
            <ShortAnswerCard
              key={shortAnswers[here.index].id}
              item={shortAnswers[here.index]}
              number={here.index + 1}
              total={shortAnswers.length}
              text={texts[shortAnswers[here.index].id] ?? ''}
              save={toStatus(textSnap.states[shortAnswers[here.index].id])}
              onChange={(v) => writeShort(shortAnswers[here.index].id, v)}
              headingRef={headingRef}
            />
          )}

          {here.kind === 'practical' && project && (
            <PracticalCard
              project={project}
              deliverables={info.practical?.deliverables ?? []}
              sqlSetup={info.practical?.sqlSetup}
              code={code}
              save={toStatus(textSnap.states[CODE_KEY])}
              onChange={writeCode}
              headingRef={headingRef}
            />
          )}

          {here.kind === 'review' && (
            <StructuredReviewCard
              progress={progress}
              unansweredA={unansweredA}
              confirming={confirming}
              submitting={submitting}
              submitError={submitError}
              disabled={fatal}
              onGoToPart={(part) => goTo(part === 'A' ? 0 : part === 'B' ? layout.shortStart : layout.practicalStep >= 0 ? layout.practicalStep : layout.reviewStep)}
              onGoToQuestion={(i) => goTo(i)}
              onAsk={() => setConfirming(true)}
              onCancel={() => {
                setConfirming(false);
                setSubmitError(null);
              }}
              onSubmit={() => void submit(false)}
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
              <ListChecks size={14} /> Tasks
            </button>
            {step < layout.reviewStep ? (
              <button
                type="button"
                onClick={() => goTo(step + 1)}
                className="inline-flex items-center gap-1 rounded-xl bg-[var(--ar-accent)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
              >
                {step === layout.reviewStep - 1 ? 'Review & hand in' : 'Next'} <ChevronRight size={16} />
              </button>
            ) : (
              <span />
            )}
          </div>
        </main>

        {/* Progress, pace and how this works */}
        <aside className="hidden space-y-4 @7xl:sticky @7xl:top-[5.25rem] @7xl:block" aria-label="Your progress">
          <section className="space-y-3 rounded-2xl border border-[var(--ar-border)] bg-[var(--ar-surface)] p-4">
            <h2 className="text-sm font-semibold text-[var(--ar-text)]">Your progress</h2>
            <ul className="space-y-1.5 text-xs text-[var(--ar-muted)]">
              <li className={`flex justify-between ${currentPart === 'A' ? 'font-semibold text-[var(--ar-text)]' : ''}`}>
                <span>Part A · {STRUCTURED_MARKS.partA} marks</span>
                <span className="tabular-nums text-[var(--ar-text)]">{answeredA} / {questions.length}</span>
              </li>
              <li className={`flex justify-between ${currentPart === 'B' ? 'font-semibold text-[var(--ar-text)]' : ''}`}>
                <span>Part B · {STRUCTURED_MARKS.partB} marks</span>
                <span className="tabular-nums text-[var(--ar-text)]">{writtenB} / {shortAnswers.length}</span>
              </li>
              {project && (
                <li className={`flex justify-between ${currentPart === 'C' ? 'font-semibold text-[var(--ar-text)]' : ''}`}>
                  <span>Part C · {STRUCTURED_MARKS.partC} marks</span>
                  <span className="text-[var(--ar-text)]">{codeStarted ? 'Started ✓' : 'Not started'}</span>
                </li>
              )}
            </ul>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--ar-surface-2)]">
              <div className="h-full rounded-full bg-[var(--ar-accent)] transition-all" style={{ width: `${pct}%` }} />
            </div>
            <button
              type="button"
              onClick={() => goTo(layout.reviewStep)}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--ar-accent)] px-3 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              <Send size={14} /> Review &amp; hand in
            </button>
          </section>

          <section className="space-y-2 rounded-2xl border border-[var(--ar-border)] bg-[var(--ar-surface)] p-4 text-xs leading-relaxed text-[var(--ar-muted)]">
            <h2 className="text-sm font-semibold text-[var(--ar-text)]">How this works</h2>
            <p className="flex gap-2">
              <Timer size={14} className="mt-0.5 flex-shrink-0 text-[var(--ar-accent)]" />
              <span>
                You have <strong className="text-[var(--ar-text)]">{info.timeLimitMinutes} minutes</strong>. At 00:00 everything you saved is handed in for you.
                A suggested pace: Part A {info.suggestedMinutes.partA} min, Part B {info.suggestedMinutes.partB} min, Part C {info.suggestedMinutes.partC} min,
                then {info.suggestedMinutes.review} min to check.
              </span>
            </p>
            <p className="flex gap-2">
              <MonitorUp size={14} className="mt-0.5 flex-shrink-0 text-[var(--ar-accent)]" />
              <span>Keep sharing your entire screen until your teacher says you can stop.</span>
            </p>
            <p className="flex gap-2">
              <Check size={14} className="mt-0.5 flex-shrink-0 text-[var(--ar-success)]" />
              <span>Everything saves as you go. You can change any answer until the time is up or you hand in.</span>
            </p>
          </section>
        </aside>
      </div>

      {timeUp && !handedInRef.current && <TimeUpNotice error={submitError} retrying={submitting} onRetry={() => void submit(true)} />}
    </div>
  );
}
