'use client';

// The parts of the structured assessment (Pre-University CSE) that are not a multiple-choice question:
// the countdown, a written answer (Part B), the practical (Part C — with a real Run for every language the
// browser or the code-runner service can run) and the hand-in screen. The test itself, its saving and its
// clock live in StructuredTestView.

import { useEffect, useState } from 'react';
import { AlertTriangle, Check, Loader2, Play, RotateCcw, Send, Terminal, Timer } from 'lucide-react';
import { loadServerLanguages, runCode } from '@/lib/codeLab/runtimes';
import { LANGUAGES, ONLINE_COMPILERS, type LabLanguage, type RunResult } from '@/lib/codeLab/types';
import { STRUCTURED_MAX_ANSWER_LENGTH, countdownTone, formatCountdown, wordCount, type StructuredProgress } from '@/lib/assessment/structured';
import type { CodingProject, StructuredShortAnswer } from '@/lib/assessment/types';
import QuestionText from './QuestionText';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const MAX_CODE_CHARS = 20_000;

// ── The countdown ───────────────────────────────────────────────────────────

/** The time left, in the header: calm, then amber from 5 minutes, then red for the last minute. */
export function Countdown({ remaining }: { remaining: number | null }) {
  if (remaining === null) return null;
  const tone = countdownTone(remaining);
  const cls =
    tone === 'danger'
      ? 'border-[var(--ar-danger)] bg-[var(--ar-danger)]/10 text-[var(--ar-danger)]'
      : tone === 'warn'
        ? 'border-[var(--ar-warning)] bg-[var(--ar-warning)]/10 text-[var(--ar-text)]'
        : 'border-[var(--ar-border)] bg-[var(--ar-bg)] text-[var(--ar-text)]';
  return (
    <div
      className={`flex flex-shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1 ${cls}`}
      title="Time left. When it reaches 00:00 your work is handed in for you."
      data-testid="countdown"
      data-tone={tone}
    >
      <Timer size={15} className={tone === 'danger' ? 'text-[var(--ar-danger)]' : 'text-[var(--ar-accent)]'} aria-hidden />
      <span className={`text-sm font-bold tabular-nums ${tone === 'danger' ? 'motion-safe:animate-pulse' : ''}`} role="timer" aria-label="Time left in the assessment">
        {formatCountdown(remaining)}
      </span>
    </div>
  );
}

/** "10 minutes left" — shown for a few seconds when the clock crosses 10, 5 and 1 minute, and read out politely. */
export function TimeAlert({ minutes, onDismiss }: { minutes: number | null; onDismiss: () => void }) {
  const text =
    minutes === null
      ? ''
      : minutes === 1
        ? '1 minute left. Finish what you are writing — everything you have saved is handed in at 00:00.'
        : `${minutes} minutes left. Keep your answers saved — everything is handed in at 00:00.`;
  return (
    <>
      <div className="sr-only" role="status" aria-live="polite">
        {text}
      </div>
      {minutes !== null && (
        <div
          className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-2.5 text-sm ${
            minutes <= 1 ? 'border-[var(--ar-danger)]/60 bg-[var(--ar-danger)]/10' : 'border-[var(--ar-warning)]/60 bg-[var(--ar-warning)]/10'
          } text-[var(--ar-text)]`}
          data-testid="time-alert"
        >
          <p className="flex items-start gap-2">
            <Timer size={16} className="mt-0.5 flex-shrink-0" aria-hidden />
            <span>
              <strong>{minutes === 1 ? '1 minute left.' : `${minutes} minutes left.`}</strong>{' '}
              {minutes === 1 ? 'Finish what you are writing — everything you have saved is handed in at 00:00.' : 'Keep your answers saved — everything is handed in at 00:00.'}
            </span>
          </p>
          <button type="button" onClick={onDismiss} className="flex-shrink-0 text-xs underline hover:no-underline">
            Dismiss
          </button>
        </div>
      )}
    </>
  );
}

function SaveText({ state }: { state: SaveStatus | undefined }) {
  if (state === 'error') return <span className="text-[var(--ar-danger)]">Not saved yet — retrying…</span>;
  if (state === 'saving') return <span className="text-[var(--ar-faint)]">Saving…</span>;
  if (state === 'saved') return <span className="text-[var(--ar-success)]">✓ Saved</span>;
  return <span className="text-[var(--ar-faint)]">Saves automatically</span>;
}

function Criteria({ marks, items, label = 'How it will be marked' }: { marks: number; items: { criterion: string; maxPoints: number }[]; label?: string }) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-xl border border-[var(--ar-border)] bg-[var(--ar-bg)] p-3">
      <p className="mb-1 text-xs font-semibold text-[var(--ar-text)]">
        {label} · {marks} marks
      </p>
      <ul className="space-y-0.5 text-xs text-[var(--ar-muted)]">
        {items.map((r) => (
          <li key={r.criterion} className="flex justify-between gap-3">
            <span>{r.criterion}</span>
            <span className="tabular-nums">{r.maxPoints}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Part B: a written answer ────────────────────────────────────────────────

export function ShortAnswerCard({
  item,
  number,
  total,
  text,
  save,
  onChange,
  headingRef,
}: {
  item: StructuredShortAnswer;
  number: number;
  total: number;
  text: string;
  save: SaveStatus | undefined;
  onChange: (value: string) => void;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}) {
  const words = wordCount(text);
  return (
    <section
      className="grid flex-1 gap-4 @4xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] @4xl:items-stretch"
      aria-labelledby="sa-heading"
      data-testid="short-answer-card"
    >
      <div className="space-y-3 rounded-2xl border border-[var(--ar-border)] bg-[var(--ar-surface)] p-4 @4xl:p-6 @4xl:sticky @4xl:top-[5.25rem] @4xl:max-h-[calc(100dvh-6.5rem)] @4xl:self-start @4xl:overflow-y-auto">
        <div className="flex items-center justify-between gap-2 text-xs text-[var(--ar-muted)]">
          <h2 id="sa-heading" ref={headingRef} tabIndex={-1} className="text-sm font-semibold text-[var(--ar-text)] outline-none">
            Part B · Short answer {number} of {total}
          </h2>
          <span className="rounded-full border border-[var(--ar-border-strong)] px-2.5 py-0.5">{item.maxScore} marks</span>
        </div>
        <QuestionText text={item.prompt} className="text-base text-[var(--ar-text)] @4xl:text-[17px]" />
        <Criteria marks={item.maxScore} items={item.criteria} />
        <p className="text-xs text-[var(--ar-faint)]">Your teacher marks this answer by hand. Short, exact sentences earn more than long ones.</p>
      </div>

      <div className="flex flex-col rounded-2xl border border-[var(--ar-border)] bg-[var(--ar-surface)] p-4 @4xl:p-6">
        <label className="mb-2 block text-xs font-medium text-[var(--ar-muted)]" htmlFor="sa-answer">
          Your answer
        </label>
        <textarea
          id="sa-answer"
          value={text}
          onChange={(e) => onChange(e.target.value)}
          maxLength={STRUCTURED_MAX_ANSWER_LENGTH}
          spellCheck
          aria-describedby="sa-hint"
          placeholder="Write your answer here…"
          className="min-h-[16rem] w-full flex-1 rounded-xl border border-[var(--ar-border-strong)] bg-[var(--ar-bg)] p-4 text-[15px] leading-relaxed text-[var(--ar-text)] placeholder:text-[var(--ar-faint)] focus:outline-none focus:ring-2 focus:ring-[var(--ar-accent)] @4xl:min-h-[calc(100dvh-17rem)]"
        />
        <p id="sa-hint" className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--ar-faint)]">
          <span className="tabular-nums">
            {words} word{words === 1 ? '' : 's'} · {text.length.toLocaleString()} / {STRUCTURED_MAX_ANSWER_LENGTH.toLocaleString()} characters
          </span>
          <SaveText state={save} />
        </p>
      </div>
    </section>
  );
}

// ── Part C: the practical ───────────────────────────────────────────────────

function asLab(language: string): LabLanguage {
  return (language in LANGUAGES ? language : 'text') as LabLanguage;
}

function CellText({ value }: { value: string | number | null | Uint8Array }) {
  if (value === null) return <span className="italic text-[var(--ar-faint)]">NULL</span>;
  if (value instanceof Uint8Array) return <span className="text-[var(--ar-faint)]">[{value.length} bytes]</span>;
  return <>{String(value)}</>;
}

function RunOutput({ result, running, status, sql }: { result: RunResult | null; running: boolean; status: string; sql: boolean }) {
  if (running) {
    return (
      <p className="flex items-center gap-2 text-xs text-gray-300" role="status">
        <Loader2 size={13} className="animate-spin" aria-hidden /> {status || 'Running…'}
      </p>
    );
  }
  if (!result) return <p className="text-xs text-gray-400">Press Run to see what your code prints. The output is only for you — your teacher marks the code you save.</p>;
  return (
    <div className="space-y-2 text-[13px]" data-testid="run-output">
      {result.tables?.map((t, i) => (
        <div key={i} className="overflow-x-auto rounded border border-white/15">
          <table className="min-w-full text-left text-xs text-gray-100">
            <thead className="bg-white/10">
              <tr>
                {t.columns.map((c, j) => (
                  <th key={j} className="px-2 py-1 font-semibold">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {t.rows.map((row, r) => (
                <tr key={r} className="border-t border-white/10">
                  {row.map((cell, c) => (
                    <td key={c} className="px-2 py-1 align-top">
                      <CellText value={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {t.truncated && <p className="px-2 py-1 text-[11px] text-gray-400">Only the first rows are shown.</p>}
        </div>
      ))}
      {result.stdout && <pre className="whitespace-pre-wrap break-words font-mono text-gray-100">{result.stdout}</pre>}
      {result.stderr && <pre className="whitespace-pre-wrap break-words font-mono text-red-300">{result.stderr}</pre>}
      {!result.stdout && !result.stderr && !result.tables?.length && (
        <p className="text-gray-400">{sql ? 'Your SQL ran and returned no rows.' : 'The program ran and printed nothing.'}</p>
      )}
      <p className="text-[11px] text-gray-500">
        {result.ok ? 'Finished' : 'Stopped with an error'} in {Math.max(1, Math.round(result.timeMs))} ms
      </p>
    </div>
  );
}

export function PracticalCard({
  project,
  deliverables,
  sqlSetup,
  code,
  save,
  onChange,
  headingRef,
}: {
  project: CodingProject;
  deliverables: string[];
  sqlSetup?: string;
  code: string;
  save: SaveStatus | undefined;
  onChange: (value: string) => void;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}) {
  const lang = asLab(project.language);
  const info = LANGUAGES[lang];
  const [serverCan, setServerCan] = useState<boolean | null>(info.engine === 'server' ? null : false);
  const [stdin, setStdin] = useState('');
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState('');
  const [result, setResult] = useState<RunResult | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (info.engine !== 'server') return;
    let live = true;
    void loadServerLanguages().then((s) => {
      if (live) setServerCan(!!s.languages[lang]?.available);
    });
    return () => {
      live = false;
    };
  }, [info.engine, lang]);

  const canRun = lang !== 'text' && lang !== 'html' && (info.engine === 'browser' || serverCan === true);
  const compiler = ONLINE_COMPILERS[lang];
  const starter = project.starterCode ?? '';
  const changed = code.trim() !== starter.trim();

  const run = async () => {
    setRunning(true);
    setStatus(lang === 'python' ? 'Starting Python (the first run takes a few seconds)…' : 'Running…');
    setResult(null);
    try {
      setResult(await runCode({ language: lang, code, stdin, setup: sqlSetup, onStatus: setStatus }));
    } finally {
      setRunning(false);
    }
  };

  return (
    <section className="grid flex-1 gap-4 @4xl:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] @4xl:items-stretch" aria-labelledby="code-heading" data-testid="practical-card">
      <div className="space-y-3 rounded-2xl border border-[var(--ar-border)] bg-[var(--ar-surface)] p-4 @4xl:p-6 @4xl:sticky @4xl:top-[5.25rem] @4xl:max-h-[calc(100dvh-6.5rem)] @4xl:self-start @4xl:overflow-y-auto">
        <div className="flex items-center justify-between gap-2 text-xs text-[var(--ar-muted)]">
          <h2 id="code-heading" ref={headingRef} tabIndex={-1} className="text-sm font-semibold text-[var(--ar-text)] outline-none">
            Part C · Practical · {project.title}
          </h2>
          <span className="rounded-full border border-[var(--ar-border-strong)] px-2.5 py-0.5">{project.maxScore} marks</span>
        </div>
        <QuestionText text={project.instructions} className="text-sm text-[var(--ar-text)] @4xl:text-[15px]" />
        {deliverables.length > 0 && (
          <div className="rounded-xl border border-[var(--ar-border)] bg-[var(--ar-bg)] p-3">
            <p className="mb-1 text-xs font-semibold text-[var(--ar-text)]">What to hand in</p>
            <ul className="list-disc space-y-0.5 pl-4 text-xs text-[var(--ar-muted)]">
              {deliverables.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </div>
        )}
        <Criteria marks={project.maxScore} items={project.rubric} />
      </div>

      <div className="flex min-w-0 flex-col gap-3 rounded-2xl border border-[var(--ar-border)] bg-[var(--ar-surface)] p-4 @4xl:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="block text-xs font-medium text-[var(--ar-muted)]" htmlFor="code-editor">
            {lang === 'text' ? 'Your answer' : `Your code (${info.label} · ${info.file})`}
          </label>
          <div className="flex items-center gap-2">
            {changed && starter && (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--ar-border-strong)] px-2.5 py-1 text-xs text-[var(--ar-muted)] hover:text-[var(--ar-text)]"
              >
                <RotateCcw size={12} aria-hidden /> Start again
              </button>
            )}
            {canRun && (
              <button
                type="button"
                data-testid="run-code"
                onClick={() => void run()}
                disabled={running || !code.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--ar-accent)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {running ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />} Run
              </button>
            )}
          </div>
        </div>

        {confirmReset && (
          <div role="alertdialog" aria-label="Start again" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--ar-warning)]/50 bg-[var(--ar-warning)]/10 px-3 py-2 text-xs text-[var(--ar-text)]">
            <span>Replace everything you wrote with the starter code?</span>
            <span className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  onChange(starter);
                  setResult(null);
                  setConfirmReset(false);
                }}
                className="rounded-md bg-[var(--ar-warning)] px-2.5 py-1 font-semibold text-black"
              >
                Yes, start again
              </button>
              <button type="button" onClick={() => setConfirmReset(false)} className="rounded-md border border-[var(--ar-border-strong)] px-2.5 py-1">
                Keep my work
              </button>
            </span>
          </div>
        )}

        <textarea
          id="code-editor"
          value={code}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            // Tab inserts spaces like a code editor; Esc then Tab moves focus on.
            if (lang !== 'text' && e.key === 'Tab' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
              e.preventDefault();
              const el = e.currentTarget;
              const { selectionStart: s, selectionEnd: en } = el;
              onChange(code.slice(0, s) + '    ' + code.slice(en));
              requestAnimationFrame(() => el.setSelectionRange(s + 4, s + 4));
            }
          }}
          spellCheck={lang === 'text'}
          autoCapitalize="off"
          autoCorrect="off"
          aria-describedby="code-hint"
          maxLength={MAX_CODE_CHARS}
          className="min-h-[20rem] w-full flex-1 rounded-xl border border-[var(--ar-border-strong)] bg-black/85 p-4 font-mono text-[13px] leading-relaxed text-gray-100 focus:outline-none focus:ring-2 focus:ring-[var(--ar-accent)] @4xl:min-h-[calc(100dvh-26rem)]"
        />
        <p id="code-hint" className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--ar-faint)]">
          <span>
            {lang === 'text'
              ? 'Write your answer as text. Your teacher marks it against the criteria on the left.'
              : 'Press Esc then Tab to leave the editor. Your teacher reads and marks the code you save here.'}
          </span>
          <SaveText state={save} />
        </p>

        {!canRun && lang !== 'text' && (
          <p className="rounded-lg border border-[var(--ar-border)] bg-[var(--ar-bg)] px-3 py-2 text-xs text-[var(--ar-muted)]" data-testid="no-run-note">
            {serverCan === null
              ? `Checking whether ${info.label} can be run here…`
              : `${info.label} cannot be run on this page right now. Write your answer carefully${
                  compiler ? ` — you may check it on ${compiler.name} in another tab if your teacher allows it` : ''
                }. Your teacher marks the code you save here.`}
          </p>
        )}

        {canRun && (
          <div className="space-y-2">
            {lang !== 'sql' && (
              <details className="text-xs text-[var(--ar-muted)]">
                <summary className="cursor-pointer select-none">Input for your program (optional)</summary>
                <textarea
                  value={stdin}
                  onChange={(e) => setStdin(e.target.value)}
                  maxLength={4000}
                  rows={3}
                  spellCheck={false}
                  aria-label="Input for your program"
                  className="mt-2 w-full rounded-lg border border-[var(--ar-border-strong)] bg-[var(--ar-bg)] p-2 font-mono text-xs text-[var(--ar-text)] focus:outline-none focus:ring-2 focus:ring-[var(--ar-accent)]"
                />
              </details>
            )}
            <div className="rounded-xl border border-[var(--ar-border-strong)] bg-black/85 p-3" aria-live="polite">
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                <Terminal size={12} aria-hidden /> Output
              </p>
              <RunOutput result={result} running={running} status={status} sql={lang === 'sql'} />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// ── Review and hand in ──────────────────────────────────────────────────────

export function StructuredReviewCard({
  progress,
  unansweredA,
  confirming,
  submitting,
  submitError,
  disabled,
  onGoToPart,
  onGoToQuestion,
  onAsk,
  onCancel,
  onSubmit,
  headingRef,
}: {
  progress: StructuredProgress;
  /** Part A questions with no answer yet, as display numbers (1-based). */
  unansweredA: number[];
  confirming: boolean;
  submitting: boolean;
  submitError: string | null;
  disabled: boolean;
  onGoToPart: (part: 'A' | 'B' | 'C') => void;
  onGoToQuestion: (index: number) => void;
  onAsk: () => void;
  onCancel: () => void;
  onSubmit: () => void;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}) {
  const rows: { part: 'A' | 'B' | 'C'; label: string; ok: boolean; text: string }[] = [
    {
      part: 'A',
      label: 'Part A · Multiple choice',
      ok: progress.partA.answered === progress.partA.total,
      text: `${progress.partA.answered} of ${progress.partA.total} answered`,
    },
    {
      part: 'B',
      label: 'Part B · Short answers',
      ok: progress.partB.answered === progress.partB.total,
      text: `${progress.partB.answered} of ${progress.partB.total} written`,
    },
    {
      part: 'C',
      label: 'Part C · Practical',
      ok: progress.partC.started,
      text: progress.partC.started ? 'Started' : 'Nothing written yet',
    },
  ];
  return (
    <section
      className="grid flex-1 content-start gap-5 rounded-2xl border border-[var(--ar-border)] bg-[var(--ar-surface)] p-4 @4xl:grid-cols-2 @4xl:p-6"
      aria-labelledby="review-heading"
      data-testid="review-card"
    >
      <div className="space-y-4">
        <h2 id="review-heading" ref={headingRef} tabIndex={-1} className="text-sm font-semibold text-[var(--ar-text)] outline-none">
          Review &amp; hand in
        </h2>
        <ul className="space-y-2 text-sm text-[var(--ar-text)]">
          {rows.map((r) => (
            <li key={r.part} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--ar-border)] bg-[var(--ar-bg)] px-3 py-2">
              <span className="flex items-center gap-2">
                {r.ok ? <Check size={15} className="text-[var(--ar-success)]" aria-hidden /> : <AlertTriangle size={15} className="text-[var(--ar-warning)]" aria-hidden />}
                <span>
                  <span className="block font-medium">{r.label}</span>
                  <span className="block text-xs text-[var(--ar-muted)]">{r.text}</span>
                </span>
              </span>
              <button type="button" onClick={() => onGoToPart(r.part)} className="text-xs text-[var(--ar-accent)] underline hover:no-underline">
                Go to Part {r.part}
              </button>
            </li>
          ))}
        </ul>
        {unansweredA.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-medium text-[var(--ar-muted)]">Part A questions with no answer — tap a number to go back:</p>
            <div className="flex flex-wrap gap-1.5">
              {unansweredA.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => onGoToQuestion(n - 1)}
                  className="h-8 min-w-8 rounded-lg border border-[var(--ar-warning)]/50 px-2 text-xs font-semibold text-[var(--ar-text)] hover:bg-[var(--ar-warning)]/10"
                >
                  {n}
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
              You can keep working until the clock reaches 00:00 — then your saved work is handed in for you. Hand in early only when you are finished.
            </p>
            <button
              type="button"
              data-testid="submit-test"
              onClick={onAsk}
              disabled={disabled}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--ar-accent)] px-4 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              <Send size={15} aria-hidden /> Hand in my assessment
            </button>
          </>
        ) : (
          <div role="alertdialog" aria-labelledby="confirm-title" className="space-y-3 rounded-xl border border-[var(--ar-border-strong)] bg-[var(--ar-bg)] p-4">
            <p id="confirm-title" className="text-sm font-semibold text-[var(--ar-text)]">
              Hand in your assessment now?
            </p>
            <p className="text-xs text-[var(--ar-muted)]">
              You can&apos;t change anything after handing in.
              {progress.unfinished.length > 0 && ` Still empty: ${progress.unfinished.join('; ')}. Empty parts score 0.`}
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
                {submitting ? 'Handing in…' : submitError ? 'Try again' : 'Yes, hand in'}
              </button>
              <button
                type="button"
                onClick={onCancel}
                disabled={submitting}
                className="rounded-lg border border-[var(--ar-border-strong)] px-4 py-2 text-sm text-[var(--ar-text)] hover:bg-[var(--ar-surface)]"
              >
                Keep working
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/** Shown over the test the moment the clock reaches 00:00, until the hand-in has reached the server. */
export function TimeUpNotice({ error, onRetry, retrying }: { error: string | null; onRetry: () => void; retrying: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="alertdialog" aria-labelledby="timeup-title" aria-modal="true" data-testid="time-up">
      <div className="w-full max-w-md space-y-3 rounded-2xl border border-[var(--ar-border-strong)] bg-[var(--ar-surface)] p-6 text-center text-[var(--ar-text)]">
        <Timer size={30} className="mx-auto text-[var(--ar-accent)]" aria-hidden />
        <h2 id="timeup-title" className="text-lg font-bold">
          Time is up
        </h2>
        {error ? (
          <>
            <p role="alert" className="rounded-md border border-[var(--ar-danger)]/40 bg-[var(--ar-danger)]/10 px-3 py-2 text-sm">
              {error}
            </p>
            <button
              type="button"
              onClick={onRetry}
              disabled={retrying}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--ar-accent)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              {retrying ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Try again now
            </button>
          </>
        ) : (
          <p className="flex items-center justify-center gap-2 text-sm text-[var(--ar-muted)]" role="status">
            <Loader2 size={15} className="animate-spin" aria-hidden /> Handing in everything you saved…
          </p>
        )}
      </div>
    </div>
  );
}
