'use client';

// FILE PATH: client/components/little-coders/ScratchStageDemo.tsx
//
// A live Scratch-style stage for the demos of courses 1 and 2. Press the green flag (or the key
// buttons) and the very blocks below the stage run: sprites move, talk, change costume, score points.
// The runtime is a small, safe simulation (lib/littleCoders/scratchRuntime.ts): no real Scratch is
// loaded and nothing is executed outside it.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FRAME_MS, STAGE_HEIGHT, STAGE_WIDTH, ScratchStage, type SpriteView, type StageView } from '@/lib/littleCoders/scratchRuntime';
import type { LcDemo } from '@/lib/littleCoders/types';
import BlockStack from './BlockStack';
import DemoFrame from './DemoFrame';

type StageDemo = Extract<LcDemo, { kind: 'scratch-stage' }>;

const BACKDROPS: Record<string, string> = {
  space:
    'radial-gradient(circle at 18% 28%, rgba(255,255,255,.75) 0 1.5px, transparent 2.5px), radial-gradient(circle at 72% 62%, rgba(255,255,255,.6) 0 1.5px, transparent 2.5px), radial-gradient(circle at 44% 82%, rgba(255,255,255,.5) 0 1px, transparent 2px), radial-gradient(circle at 86% 18%, rgba(255,255,255,.6) 0 1px, transparent 2px), linear-gradient(180deg,#0b1026,#241d63)',
  night: 'radial-gradient(circle at 80% 20%, rgba(255,255,255,.85) 0 7px, transparent 8px), linear-gradient(180deg,#0f172a,#1e3a5f)',
  sky: 'linear-gradient(180deg,#7dd3fc,#e0f2fe)',
  grass: 'linear-gradient(180deg,#bae6fd 0 58%,#4ade80 58%)',
  plain: 'linear-gradient(180deg,#f9fafb,#e5e7eb)',
};

const hueOf = (name: string) => [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 17);

const KEY_LABELS: Record<string, string> = { 'right arrow': '→', 'left arrow': '←', 'up arrow': '↑', 'down arrow': '↓', space: 'Space' };
const keyLabel = (k: string) => KEY_LABELS[k] ?? k.toUpperCase();

function Sprite({ s, onClick }: { s: SpriteView; onClick: () => void }) {
  if (!s.visible) return null;
  const left = ((s.x + STAGE_WIDTH / 2) / STAGE_WIDTH) * 100;
  const top = ((STAGE_HEIGHT / 2 - s.y) / STAGE_HEIGHT) * 100;
  return (
    <div className="absolute" style={{ left: `${left}%`, top: `${top}%`, transform: 'translate(-50%,-50%)', transitionProperty: 'none' }}>
      {s.say && (
        <div
          className={`pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 w-max max-w-[44cqw] -translate-x-1/2 rounded-2xl border-2 bg-white px-2.5 py-1 text-center font-semibold leading-tight text-gray-900 ${
            s.say.think ? 'border-dashed border-gray-400' : 'border-gray-700'
          }`}
          style={{ fontSize: 'clamp(10px,3.1cqw,15px)' }}
        >
          {s.say.text}
        </div>
      )}
      {s.sound && (
        <div className="pointer-events-none absolute left-full top-0 z-10 ml-1 w-max rounded-full bg-fuchsia-500 px-2 py-0.5 font-semibold text-white" style={{ fontSize: 'clamp(9px,2.6cqw,13px)' }}>
          ♪ {s.sound}
        </div>
      )}
      <button
        type="button"
        onClick={onClick}
        className="block cursor-pointer select-none leading-none"
        style={{ fontSize: `${0.1 * s.size}cqw`, transform: `rotate(${s.direction - 90}deg)`, filter: s.effect ? `hue-rotate(${s.effect * 1.8}deg)` : undefined, transitionProperty: 'none' }}
        aria-label={`${s.label} (click to try it)`}
      >
        {s.emoji}
      </button>
    </div>
  );
}

export default function ScratchStageDemo({ demo, onUsed }: { demo: StageDemo; onUsed: () => void }) {
  const stageRef = useRef<ScratchStage | null>(null);
  const [view, setView] = useState<StageView | null>(null);
  const raf = useRef(0);
  const last = useRef(0);
  const acc = useRef(0);
  const used = useRef(false);
  const holding = useRef(new Set<string>());

  const build = useCallback(() => {
    stageRef.current = new ScratchStage({ sprites: demo.sprites, scripts: demo.scripts, backdrop: demo.backdrop });
    setView(stageRef.current.view());
  }, [demo]);

  useEffect(() => {
    build();
    return () => cancelAnimationFrame(raf.current);
  }, [build]);

  const loop = useCallback(function frame(t: number) {
    const stage = stageRef.current;
    if (!stage) return;
    acc.current += Math.min(250, t - (last.current || t));
    last.current = t;
    let n = 0;
    while (acc.current >= FRAME_MS && n < 6) {
      stage.tick();
      acc.current -= FRAME_MS;
      n++;
    }
    if (acc.current > FRAME_MS * 6) acc.current = 0;
    setView(stage.view());
    if (stage.running || holding.current.size > 0) raf.current = requestAnimationFrame(frame);
    else {
      raf.current = 0;
      last.current = 0;
    }
  }, []);

  const wake = useCallback(() => {
    if (!used.current) {
      used.current = true;
      onUsed();
    }
    if (!raf.current) {
      last.current = 0;
      raf.current = requestAnimationFrame(loop);
    }
  }, [loop, onUsed]);

  const press = useCallback(
    (key: string) => {
      stageRef.current?.pressKey(key);
      holding.current.add(key);
      wake();
    },
    [wake],
  );
  const release = useCallback((key: string) => {
    stageRef.current?.releaseKey(key);
    holding.current.delete(key);
  }, []);

  const keys = useMemo(() => demo.keys ?? [], [demo.keys]);
  const groups = useMemo(() => {
    const byLabel = new Map<string, { label: string; lines: string[][] }>();
    for (const sc of demo.scripts) {
      const label = demo.sprites.find((s) => s.id === sc.sprite)?.label ?? sc.sprite;
      const g = byLabel.get(sc.sprite) ?? { label, lines: [] };
      g.lines.push(sc.lines);
      byLabel.set(sc.sprite, g);
    }
    return [...byLabel.entries()];
  }, [demo]);

  const bg = BACKDROPS[demo.backdrop ?? 'plain'] ?? BACKDROPS.plain;
  const switched = view && view.backdrop !== (demo.backdrop ?? 'plain') && !BACKDROPS[view.backdrop] ? hueOf(view.backdrop) : 0;
  const speech = view?.sprites.find((s) => s.say)?.say?.text ?? '';

  return (
    <DemoFrame title={demo.title} intro={demo.intro} hint={demo.hint}>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div>
          <div
            className="relative w-full overflow-hidden rounded-xl border border-gray-300 shadow-inner dark:border-gray-600"
            style={{ aspectRatio: `${STAGE_WIDTH} / ${STAGE_HEIGHT}`, containerType: 'inline-size' }}
            role="group"
            aria-label="Demo stage"
            tabIndex={0}
            onKeyDown={(e) => {
              const k = e.key === ' ' ? 'space' : e.key.startsWith('Arrow') ? `${e.key.slice(5).toLowerCase()} arrow` : e.key.toLowerCase();
              if (keys.includes(k)) {
                e.preventDefault();
                if (!e.repeat) press(k);
              }
            }}
            onKeyUp={(e) => {
              const k = e.key === ' ' ? 'space' : e.key.startsWith('Arrow') ? `${e.key.slice(5).toLowerCase()} arrow` : e.key.toLowerCase();
              if (keys.includes(k)) release(k);
            }}
          >
            <div className="absolute inset-0" style={{ background: bg, filter: switched ? `hue-rotate(${switched}deg)` : undefined, transitionProperty: 'none' }} />
            {view?.sprites.map((s) => (
              <Sprite
                key={s.uid}
                s={s}
                onClick={() => {
                  stageRef.current?.clickSprite(s.uid);
                  wake();
                }}
              />
            ))}
            {view && view.variables.length > 0 && (
              <div className="absolute left-1.5 top-1.5 flex flex-col gap-1" aria-label="Variables">
                {view.variables.map(([k, v]) => (
                  <span key={k} className="rounded-md bg-orange-500 px-2 py-0.5 font-semibold text-white shadow" style={{ fontSize: 'clamp(10px,2.8cqw,14px)' }}>
                    {k}: {v}
                  </span>
                ))}
              </div>
            )}
            {view && view.backdrop !== (demo.backdrop ?? 'plain') && (
              <span className="absolute bottom-1.5 right-1.5 rounded-md bg-black/55 px-2 py-0.5 text-xs font-semibold text-white">🖼️ {view.backdrop}</span>
            )}
          </div>
          <p className="sr-only" aria-live="polite">
            {speech}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                build();
                stageRef.current?.greenFlag();
                wake();
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3.5 py-2 text-sm font-bold text-white hover:bg-emerald-400"
            >
              <span aria-hidden="true">🏁</span> Green flag
            </button>
            <button
              type="button"
              onClick={() => {
                stageRef.current?.stop();
                setView(stageRef.current?.view() ?? null);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-500 px-3.5 py-2 text-sm font-bold text-white hover:bg-red-400"
            >
              <span aria-hidden="true">⏹</span> Stop
            </button>
            <button type="button" onClick={build} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700/50">
              ↺ Reset
            </button>
            {view && <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">{view.running ? '● running' : '○ stopped'}</span>}
          </div>

          {keys.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5" role="group" aria-label="Keyboard keys for the demo">
              <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Keys</span>
              {keys.map((k) => (
                <button
                  key={k}
                  type="button"
                  className="min-w-10 touch-none select-none rounded-lg border-b-4 border-gray-400 bg-gray-100 px-3 py-1.5 text-sm font-bold text-gray-800 active:translate-y-px active:border-b-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                  onPointerDown={(e) => {
                    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
                    press(k);
                  }}
                  onPointerUp={() => release(k)}
                  onPointerCancel={() => release(k)}
                  onPointerLeave={() => release(k)}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
                      e.preventDefault();
                      press(k);
                    }
                  }}
                  onKeyUp={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') release(k);
                  }}
                  aria-label={`Press ${keyLabel(k)}`}
                >
                  {keyLabel(k)}
                </button>
              ))}
            </div>
          )}
        </div>

        <details className="min-w-0 rounded-xl border border-gray-200 bg-gray-50/70 p-2 dark:border-gray-700 dark:bg-gray-900/30" open>
          <summary className="cursor-pointer select-none px-1 py-1 text-sm font-bold text-gray-800 dark:text-gray-100">🧱 The code behind this demo</summary>
          <div className="mt-2 max-h-[28rem] space-y-3 overflow-y-auto pr-1">
            {groups.map(([id, g]) =>
              g.lines.map((lines, i) => <BlockStack key={`${id}-${i}`} lines={lines} language="scratch" sprite={g.label} />),
            )}
          </div>
        </details>
      </div>
    </DemoFrame>
  );
}
