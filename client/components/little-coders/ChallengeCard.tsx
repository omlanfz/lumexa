'use client';

// FILE PATH: client/components/little-coders/ChallengeCard.tsx
//
// The quick challenge at the end of a lesson's learning part: either choose the right answer about a
// script, or put blocks in the right order. It is PRACTICE only — it awards nothing and checks only
// against the answer the lesson carries (an assessment's answer key never leaves the server).

import { useMemo, useState } from 'react';
import { buildBlockTree, parseLine } from '@/lib/littleCoders/blockLines';
import type { LcChallenge } from '@/lib/littleCoders/types';
import BlockStack from './BlockStack';

const OPTION = 'w-full rounded-xl border px-3.5 py-2.5 text-left text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500';

function shuffled<T>(items: T[], avoid: T[]): T[] {
  const out = [...items];
  for (let attempt = 0; attempt < 6; attempt++) {
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    if (out.some((x, i) => x !== avoid[i])) break;
  }
  return out;
}

function Choose({ c, onDone }: { c: Extract<LcChallenge, { kind: 'choose' }>; onDone: () => void }) {
  const [picked, setPicked] = useState<number | null>(null);
  const [showHint, setShowHint] = useState(false);
  const right = picked === c.answer;
  return (
    <div className="space-y-3">
      <p className="text-base font-semibold text-gray-900 dark:text-white">{c.prompt}</p>
      {c.code && <BlockStack lines={c.code.lines} language={c.code.language} />}
      <div className="grid gap-2" role="radiogroup" aria-label="Answers">
        {c.options.map((o, i) => {
          const chosen = picked === i;
          const state = chosen ? (i === c.answer ? 'border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-100' : 'border-red-400 bg-red-50 text-red-900 dark:bg-red-900/20 dark:text-red-100') : 'border-gray-300 bg-white text-gray-800 hover:border-violet-400 hover:bg-violet-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700/60';
          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={chosen}
              disabled={right}
              onClick={() => {
                setPicked(i);
                if (i === c.answer) onDone();
              }}
              className={`${OPTION} ${state}`}
            >
              <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/10 text-xs font-bold" aria-hidden="true">
                {String.fromCharCode(65 + i)}
              </span>
              {o}
              {chosen && <span className="ml-2" aria-hidden="true">{i === c.answer ? '✅' : '❌'}</span>}
            </button>
          );
        })}
      </div>
      <div aria-live="polite" className="text-sm">
        {picked !== null && !right && <p className="font-medium text-red-700 dark:text-red-300">Not quite — try another one.{!showHint && <button type="button" className="ml-2 underline" onClick={() => setShowHint(true)}>Need a hint?</button>}</p>}
        {picked === null && !showHint && <button type="button" className="text-violet-700 underline dark:text-violet-300" onClick={() => setShowHint(true)}>Need a hint?</button>}
        {showHint && !right && <p className="mt-1 rounded-lg bg-amber-50 px-3 py-2 text-amber-900 dark:bg-amber-900/15 dark:text-amber-100">💡 {c.hint}</p>}
        {right && <p className="rounded-lg bg-emerald-50 px-3 py-2 font-medium text-emerald-900 dark:bg-emerald-900/15 dark:text-emerald-100">🎉 Yes! {c.explain}</p>}
      </div>
    </div>
  );
}

function Order({ c, onDone }: { c: Extract<LcChallenge, { kind: 'order' }>; onDone: () => void }) {
  // Each block keeps its authored position as its id, so duplicates cannot be confused.
  const [pool, setPool] = useState<number[]>(() => shuffled(c.lines.map((_, i) => i), c.lines.map((_, i) => i)));
  const [placed, setPlaced] = useState<number[]>([]);
  const [checked, setChecked] = useState<'idle' | 'wrong' | 'right'>('idle');
  const [showHint, setShowHint] = useState(false);
  const text = (i: number) => parseLine(c.lines[i])?.text ?? c.lines[i];
  const nodeOf = useMemo(() => buildBlockTree(c.lines).reduce<Record<number, string>>((m, n) => ({ ...m, [n.line - 1]: n.category }), {}), [c.lines]);

  const put = (i: number) => {
    setChecked('idle');
    setPool((p) => p.filter((x) => x !== i));
    setPlaced((p) => [...p, i]);
  };
  const back = (i: number) => {
    setChecked('idle');
    setPlaced((p) => p.filter((x) => x !== i));
    setPool((p) => [...p, i]);
  };
  const check = () => {
    const ok = placed.length === c.lines.length && placed.every((v, i) => v === i);
    setChecked(ok ? 'right' : 'wrong');
    if (ok) onDone();
  };
  const reset = () => {
    setChecked('idle');
    setPlaced([]);
    setPool(shuffled(c.lines.map((_, i) => i), c.lines.map((_, i) => i)));
  };
  const chip = (i: number, onClick: () => void, label: string) => (
    <button key={i} type="button" onClick={onClick} aria-label={label} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-left font-mono text-[13px] font-semibold text-gray-900 shadow-sm hover:border-violet-400 hover:bg-violet-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700/60" data-category={nodeOf[i]}>
      {text(i)}
    </button>
  );

  return (
    <div className="space-y-3">
      <p className="text-base font-semibold text-gray-900 dark:text-white">{c.prompt}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Blocks — tap to place</p>
          <div className="flex min-h-12 flex-col gap-1.5 rounded-xl border border-dashed border-gray-300 p-2 dark:border-gray-600">
            {pool.length === 0 ? <span className="px-1 py-2 text-sm text-gray-500">All placed.</span> : pool.map((i) => chip(i, () => put(i), `Place: ${text(i)}`))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Your order — tap to take back</p>
          <ol className="flex min-h-12 flex-col gap-1.5 rounded-xl border border-gray-300 bg-gray-50 p-2 dark:border-gray-600 dark:bg-gray-900/30">
            {placed.length === 0 && <li className="px-1 py-2 text-sm text-gray-500">Nothing yet.</li>}
            {placed.map((i, n) => (
              <li key={i} className="flex items-center gap-2">
                <span className="w-5 shrink-0 text-center text-xs font-bold text-gray-500">{n + 1}</span>
                {chip(i, () => back(i), `Take back: ${text(i)}`)}
              </li>
            ))}
          </ol>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={check} disabled={placed.length !== c.lines.length || checked === 'right'} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-500 disabled:opacity-50">
          Check my order
        </button>
        <button type="button" onClick={reset} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700/50">
          ↺ Start again
        </button>
        {!showHint && checked !== 'right' && (
          <button type="button" className="text-sm text-violet-700 underline dark:text-violet-300" onClick={() => setShowHint(true)}>
            Need a hint?
          </button>
        )}
      </div>
      <div aria-live="polite" className="text-sm">
        {checked === 'wrong' && <p className="font-medium text-red-700 dark:text-red-300">Not quite — move the blocks around and check again.</p>}
        {showHint && checked !== 'right' && <p className="mt-1 rounded-lg bg-amber-50 px-3 py-2 text-amber-900 dark:bg-amber-900/15 dark:text-amber-100">💡 {c.hint}</p>}
        {checked === 'right' && <p className="rounded-lg bg-emerald-50 px-3 py-2 font-medium text-emerald-900 dark:bg-emerald-900/15 dark:text-emerald-100">🎉 Perfect order! {c.explain}</p>}
      </div>
    </div>
  );
}

export default function ChallengeCard({ challenge, onDone }: { challenge: LcChallenge; onDone: () => void }) {
  return (
    <div className="rounded-2xl border border-violet-200 bg-white p-4 shadow-sm dark:border-violet-500/30 dark:bg-gray-800/60 sm:p-5">
      <h3 className="mb-3 flex items-center gap-2 font-bold text-gray-900 dark:text-white">
        <span aria-hidden="true">🎯</span> Quick challenge
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">practice</span>
      </h3>
      {challenge.kind === 'choose' ? <Choose c={challenge} onDone={onDone} /> : <Order c={challenge} onDone={onDone} />}
    </div>
  );
}
