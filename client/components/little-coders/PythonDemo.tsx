'use client';

// FILE PATH: client/components/little-coders/PythonDemo.tsx
//
// A live EduBlocks-style Python demo for courses 4 and 5. The blocks on the left are the program;
// "Run" plays it step by step — the block being run glows, the console fills up, the variables
// change, and a Turtle program draws. "Step" goes one block at a time. A debugging lesson fails on
// purpose and the page explains the error in plain words. The interpreter is a small, safe one
// (lib/littleCoders/pythonRuntime.ts): no real code is ever executed.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { runPython, type PyResult, type TurtleDrawing } from '@/lib/littleCoders/pythonRuntime';
import type { LcDemo } from '@/lib/littleCoders/types';
import BlockStack from './BlockStack';
import DemoFrame from './DemoFrame';

type PyDemo = Extract<LcDemo, { kind: 'python-run' }>;

const ERROR_HELP: Record<string, string> = {
  NameError: 'Python found a name it does not know. Check the spelling of your variable — it must match exactly.',
  TypeError: 'Python cannot mix those two kinds of things. For example, text and a number need str( ) or int( ) to join.',
  IndexError: 'The list does not have that many items. Counting starts at 0, so the last position is one less than the length.',
  ValueError: 'Python could not turn that value into the kind you asked for.',
  ZeroDivisionError: 'You cannot divide by zero.',
  EOFError: 'The program asked a question but there was no answer left.',
  RuntimeError: 'The program ran for too long and was stopped. Is there a loop that never ends?',
  SyntaxError: 'Python could not read this line. Check the brackets and quotes.',
};

function TurtleCanvas({ drawing, reveal }: { drawing: TurtleDrawing; reveal: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const bounds = useMemo(() => {
    let minX = 0;
    let maxX = 0;
    let minY = 0;
    let maxY = 0;
    for (const s of drawing.segments) {
      minX = Math.min(minX, s.x1, s.x2);
      maxX = Math.max(maxX, s.x1, s.x2);
      minY = Math.min(minY, s.y1, s.y2);
      maxY = Math.max(maxY, s.y1, s.y2);
    }
    return { minX, maxX, minY, maxY };
  }, [drawing]);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    const w = Math.max(40, bounds.maxX - bounds.minX);
    const h = Math.max(40, bounds.maxY - bounds.minY);
    const scale = Math.min((W * 0.84) / w, (H * 0.84) / h, 2.2);
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cy = (bounds.minY + bounds.maxY) / 2;
    const px = (x: number) => W / 2 + (x - cx) * scale;
    const py = (y: number) => H / 2 - (y - cy) * scale;
    const total = drawing.segments.length;
    const shown = Math.max(0, Math.min(total, Math.round(total * reveal)));
    if (reveal >= 1) {
      for (const f of drawing.fills) {
        ctx.beginPath();
        f.points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(px(x), py(y)) : ctx.lineTo(px(x), py(y))));
        ctx.closePath();
        ctx.fillStyle = f.color;
        ctx.globalAlpha = 0.85;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
    ctx.lineCap = 'round';
    for (let i = 0; i < shown; i++) {
      const s = drawing.segments[i];
      ctx.beginPath();
      ctx.moveTo(px(s.x1), py(s.y1));
      ctx.lineTo(px(s.x2), py(s.y2));
      ctx.strokeStyle = s.color;
      ctx.lineWidth = Math.max(1, s.width * Math.min(1.5, scale));
      ctx.stroke();
    }
  }, [drawing, reveal, bounds]);

  return <canvas ref={ref} width={420} height={300} className="h-auto w-full rounded-lg border border-gray-300 bg-white dark:border-gray-600" role="img" aria-label="The Turtle drawing" />;
}

export default function PythonDemo({ demo, onUsed }: { demo: PyDemo; onUsed: () => void }) {
  const [answers, setAnswers] = useState<string[]>(demo.inputs ?? []);
  const [result, setResult] = useState<PyResult | null>(null);
  const [step, setStep] = useState(0); // how many trace steps are showing
  const [playing, setPlaying] = useState(false);
  const used = useRef(false);

  const total = result?.trace.length ?? 0;
  const finished = !!result && step >= total;

  const begin = useCallback(
    (autoplay: boolean) => {
      if (!used.current) {
        used.current = true;
        onUsed();
      }
      const r = runPython(demo.lines, answers);
      setResult(r);
      setStep(0);
      setPlaying(autoplay);
    },
    [demo.lines, answers, onUsed],
  );

  useEffect(() => {
    if (!playing || !result) return;
    if (step >= result.trace.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- the playback ends itself
      setPlaying(false);
      return;
    }
    const every = Math.max(70, Math.min(550, 6000 / Math.max(1, result.trace.length)));
    const t = setTimeout(() => setStep((s) => s + 1), every);
    return () => clearTimeout(t);
  }, [playing, step, result]);

  const reset = () => {
    setResult(null);
    setStep(0);
    setPlaying(false);
  };

  const current = result && step > 0 ? result.trace[Math.min(step, total) - 1] : null;
  const consoleCount = !result ? 0 : finished ? result.console.length : (current?.consoleLength ?? 0);
  const shownConsole = result ? result.console.slice(0, consoleCount) : [];
  const vars = current?.vars ?? [];
  const highlight = current?.line;
  const error = finished ? result?.error : null;

  return (
    <DemoFrame title={demo.title} intro={demo.intro} hint={demo.hint}>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="min-w-0">
          <BlockStack lines={demo.lines} language="edublocks" title="The program" highlightLine={highlight} />
          {answers.length > 0 && (
            <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/30">
              <p className="mb-2 text-sm font-semibold text-gray-800 dark:text-gray-100">⌨️ Your answers for the questions</p>
              <div className="flex flex-wrap gap-2">
                {answers.map((a, i) => (
                  <label key={i} className="flex min-w-[7rem] flex-1 flex-col gap-0.5 text-xs font-medium text-gray-600 dark:text-gray-300">
                    Answer {i + 1}
                    <input
                      value={a}
                      maxLength={24}
                      onChange={(e) => {
                        setAnswers((prev) => prev.map((x, j) => (j === i ? e.target.value : x)));
                        reset();
                      }}
                      className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                  </label>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">Change an answer, then press Run to see what the program does with it.</p>
            </div>
          )}
        </div>

        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => begin(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-2 text-sm font-bold text-white hover:bg-emerald-400">
              <span aria-hidden="true">▶</span> {result ? 'Run again' : 'Run'}
            </button>
            <button
              type="button"
              onClick={() => {
                if (!result) begin(false);
                setPlaying(false);
                setStep((s) => (result ? Math.min(total, s + 1) : 1));
              }}
              disabled={finished}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700/50"
            >
              ⏭ Step
            </button>
            {playing && (
              <button type="button" onClick={() => setPlaying(false)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700/50">
                ⏸ Pause
              </button>
            )}
            {result && !finished && (
              <button type="button" onClick={() => { setPlaying(false); setStep(total); }} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700/50">
                ⏩ Finish
              </button>
            )}
            {result && (
              <button type="button" onClick={reset} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700/50">
                ↺ Reset
              </button>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-700 bg-gray-900 text-gray-100" aria-label="Console">
            <div className="border-b border-gray-700 bg-gray-800 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">Output</div>
            <div className="min-h-24 space-y-0.5 p-3 font-mono text-[13px] leading-relaxed" aria-live="polite">
              {shownConsole.length === 0 && <span className="text-gray-500">{result ? '(nothing printed yet)' : 'Press Run to start the program.'}</span>}
              {shownConsole.map((c, i) =>
                c.kind === 'out' ? (
                  <div key={i}>{c.text}</div>
                ) : c.kind === 'prompt' ? (
                  <div key={i} className="text-sky-300">❓ {c.text}</div>
                ) : c.kind === 'answer' ? (
                  <div key={i} className="text-emerald-300">⌨️ {c.text}</div>
                ) : (
                  <div key={i} className="font-semibold text-red-300">🛑 {c.text}</div>
                ),
              )}
            </div>
          </div>

          {vars.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/30" aria-label="Variables">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Variables</p>
              <div className="flex flex-wrap gap-1.5">
                {vars.map(([k, v]) => (
                  <span key={k} className="rounded-md bg-orange-500 px-2 py-0.5 font-mono text-xs font-semibold text-white">
                    {k} = {v}
                  </span>
                ))}
              </div>
            </div>
          )}

          {result?.turtle && <TurtleCanvas drawing={result.turtle} reveal={finished ? 1 : total === 0 ? 0 : step / total} />}

          {error && (
            <div className={`rounded-xl border p-3 text-sm ${demo.expectError ? 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-900/15 dark:text-amber-100' : 'border-red-300 bg-red-50 text-red-900 dark:border-red-500/40 dark:bg-red-900/15 dark:text-red-100'}`} role="status">
              <p className="font-semibold">
                {demo.expectError ? '🔎 A bug to find! ' : '🛑 '}Python says: {error.type} — {error.message}
              </p>
              <p className="mt-1">{ERROR_HELP[error.type] ?? 'Read the message — it tells you what Python did not understand.'}</p>
              {error.line > 0 && <p className="mt-1 text-xs opacity-80">It happened on line {error.line} of the program.</p>}
            </div>
          )}
        </div>
      </div>
    </DemoFrame>
  );
}
