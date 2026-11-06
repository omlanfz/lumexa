'use client';

// FILE PATH: client/components/lesson/visuals/code.tsx
//
// Code and game visuals: stepping through a few lines of code, a sprite/grid stage,
// and Scratch-style blocks. All are drawn from the lesson's own data — nothing here
// ever executes learner- or author-supplied code: a code trace only REPLAYS the
// variable values the author wrote down for each step.

import { useState, type KeyboardEvent } from 'react';
import { C } from './svg';
import { registerVisuals, type VisualProps } from './registry';

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

// ─── Step through code (a replay of authored values) ────────────────────────

interface TraceStep {
  line: number; // 1-based line that is about to run / just ran
  vars?: Record<string, unknown>;
  output?: string;
  note?: string;
}

export function CodeTrace({ config, onUse }: VisualProps) {
  const lines: string[] = (Array.isArray(config.lines) ? config.lines : []).slice(0, 24).map(String);
  const steps: TraceStep[] = (Array.isArray(config.steps) ? config.steps : []).slice(0, 40);
  const [i, setI] = useState(0);
  if (lines.length === 0 || steps.length === 0) return null;
  const step = steps[clamp(i, 0, steps.length - 1)];
  const go = (n: number) => {
    setI(clamp(n, 0, steps.length - 1));
    onUse?.();
  };
  const vars = Object.entries(step.vars ?? {}).slice(0, 12);
  // Output printed so far: every step's output up to and including this one.
  const printed = steps.slice(0, i + 1).map((s) => s.output).filter((o): o is string => typeof o === 'string' && o.length > 0);

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
        <div style={{ flex: '2 1 280px', minWidth: 0 }}>
          <pre className="lesson-code-sample" style={{ margin: 0, overflowX: 'auto', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '8px 0', fontSize: 13, lineHeight: 1.55 }} tabIndex={0} aria-label="The code being traced">
            {lines.map((l, n) => {
              const on = step.line === n + 1;
              return (
                <div key={n} style={{ display: 'flex', background: on ? `color-mix(in srgb, ${C.warn} 28%, transparent)` : undefined, borderLeft: `4px solid ${on ? C.warn : 'transparent'}`, padding: '0 10px' }} aria-current={on ? 'step' : undefined}>
                  <span style={{ width: 26, color: C.muted, userSelect: 'none', flex: 'none', textAlign: 'right', marginRight: 12 }}>{n + 1}</span>
                  <code style={{ whiteSpace: 'pre', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{l || ' '}</code>
                </div>
              );
            })}
          </pre>
        </div>
        <div style={{ flex: '1 1 190px', minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '.04em', color: C.muted, marginBottom: 4 }}>Variables</div>
          {vars.length === 0 ? (
            <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>None yet.</p>
          ) : (
            <table style={{ borderCollapse: 'collapse', fontSize: 13, width: '100%' }}>
              <tbody>
                {vars.map(([k, v]) => (
                  <tr key={k}>
                    <th scope="row" style={{ textAlign: 'left', padding: '3px 8px', border: `1px solid ${C.border}`, background: C.surface2, fontFamily: 'ui-monospace, monospace' }}>{k}</th>
                    <td style={{ padding: '3px 8px', border: `1px solid ${C.border}`, fontFamily: 'ui-monospace, monospace' }}>{typeof v === 'string' ? JSON.stringify(v) : String(v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {printed.length > 0 && (
            <>
              <div style={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '.04em', color: C.muted, margin: '10px 0 4px' }}>Output</div>
              <pre style={{ margin: 0, background: '#0f172a', color: '#e2e8f0', padding: '6px 10px', borderRadius: 8, fontSize: 12.5, overflowX: 'auto' }}>{printed.join('\n')}</pre>
            </>
          )}
        </div>
      </div>
      <div className="lv-controls">
        <button type="button" className="lv-btn" onClick={() => go(0)} disabled={i === 0}>⏮ Start</button>
        <button type="button" className="lv-btn" onClick={() => go(i - 1)} disabled={i === 0}>◀ Back</button>
        <button type="button" className="lv-btn lv-btn-primary" onClick={() => go(i + 1)} disabled={i >= steps.length - 1}>Next step ▶</button>
        <span className="lv-label" aria-live="polite">Step {i + 1} of {steps.length}</span>
      </div>
      {step.note && <p className="lv-note" aria-live="polite">{step.note}</p>}
      <p className="lv-sim">This replays the values the author worked out by hand for each step. It does not run any code.</p>
    </div>
  );
}

// ─── Sprite / grid stage ────────────────────────────────────────────────────

interface Sprite { id?: string; label?: string; emoji?: string; x: number; y: number; kind?: 'player' | 'goal' | 'wall' | 'enemy' | 'item'; }

const KIND_FILL: Record<string, string> = { player: C.accent, goal: C.good, wall: C.muted, enemy: C.bad, item: C.warn };
const KIND_GLYPH: Record<string, string> = { player: '🧑', goal: '🏁', wall: '', enemy: '👾', item: '⭐' };

/** A grid the learner can walk the player across with the arrow keys / buttons. */
export function StageVisual({ config, onUse }: VisualProps) {
  const cols = clamp(Number(config.cols) || 8, 3, 14);
  const rows = clamp(Number(config.rows) || 6, 3, 12);
  const sprites: Sprite[] = (Array.isArray(config.sprites) ? config.sprites : []).slice(0, 60).map((s: Sprite) => ({ ...s, x: clamp(Number(s.x) || 0, 0, cols - 1), y: clamp(Number(s.y) || 0, 0, rows - 1) }));
  const start = sprites.find((s) => s.kind === 'player' || s.kind === undefined) ?? { x: 0, y: 0 };
  const [pos, setPos] = useState<[number, number]>([start.x, start.y]);
  const [msg, setMsg] = useState('Use the arrow keys or the buttons to move the player.');
  const [score, setScore] = useState(0);
  const [taken, setTaken] = useState<Set<number>>(new Set());
  const walls = new Set(sprites.filter((s) => s.kind === 'wall').map((s) => `${s.x},${s.y}`));
  const cell = clamp(Math.floor(480 / cols), 30, 56);

  const move = (dx: number, dy: number) => {
    const nx = clamp(pos[0] + dx, 0, cols - 1);
    const ny = clamp(pos[1] + dy, 0, rows - 1);
    onUse?.();
    if (walls.has(`${nx},${ny}`)) {
      setMsg('💥 Collision! A wall blocks the way — the player stays where it is.');
      return;
    }
    setPos([nx, ny]);
    const hitIdx = sprites.findIndex((s, k) => !taken.has(k) && s.kind !== 'wall' && s.kind !== 'player' && s.x === nx && s.y === ny);
    if (hitIdx >= 0) {
      const hit = sprites[hitIdx];
      if (hit.kind === 'item') {
        setTaken((t) => new Set(t).add(hitIdx));
        setScore((s) => s + 1);
        setMsg('⭐ Collision with an item: collected it, score + 1.');
      } else if (hit.kind === 'goal') setMsg('🏁 Collision with the goal: level complete!');
      else if (hit.kind === 'enemy') {
        setPos([start.x, start.y]);
        setMsg('👾 Collision with an enemy: back to the start.');
      }
    } else setMsg(`Moved to column ${nx}, row ${ny}. Columns count right from 0; rows count down from 0.`);
  };

  const onKey = (e: KeyboardEvent) => {
    const m: Record<string, [number, number]> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
    if (m[e.key]) {
      e.preventDefault();
      move(...m[e.key]);
    }
  };

  return (
    <div>
      <div tabIndex={0} onKeyDown={onKey} role="application" aria-label="Game stage. Use the arrow keys to move the player." style={{ display: 'inline-grid', gridTemplateColumns: `repeat(${cols}, ${cell}px)`, gap: 1, background: C.border, padding: 1, borderRadius: 8, outlineOffset: 3 }}>
        {Array.from({ length: cols * rows }, (_, k) => {
          const x = k % cols, y = Math.floor(k / cols);
          const here = sprites.map((s, n) => ({ s, n })).filter(({ s, n }) => s.x === x && s.y === y && s.kind !== 'player' && !taken.has(n));
          const isPlayer = pos[0] === x && pos[1] === y;
          const wall = here.find(({ s }) => s.kind === 'wall');
          const other = here.find(({ s }) => s.kind !== 'wall');
          return (
            <div key={k} style={{ width: cell, height: cell, background: wall ? KIND_FILL.wall : C.surface, display: 'grid', placeItems: 'center', fontSize: cell * 0.55, position: 'relative' }}>
              {isPlayer ? (other?.s.emoji ?? KIND_GLYPH.player) : other ? (other.s.emoji ?? KIND_GLYPH[other.s.kind ?? 'item']) : ''}
              {x === 0 && <span style={{ position: 'absolute', left: -1, top: 0, fontSize: 9, color: C.muted, transform: 'translateX(-130%)' }} aria-hidden="true">{y}</span>}
              {y === 0 && <span style={{ position: 'absolute', top: -1, left: 0, fontSize: 9, color: C.muted, transform: 'translateY(-130%)' }} aria-hidden="true">{x}</span>}
            </div>
          );
        })}
      </div>
      <div className="lv-controls" style={{ justifyContent: 'flex-start' }}>
        <button type="button" className="lv-btn" onClick={() => move(0, -1)} aria-label="Move up">▲</button>
        <button type="button" className="lv-btn" onClick={() => move(-1, 0)} aria-label="Move left">◀</button>
        <button type="button" className="lv-btn" onClick={() => move(0, 1)} aria-label="Move down">▼</button>
        <button type="button" className="lv-btn" onClick={() => move(1, 0)} aria-label="Move right">▶</button>
        <button type="button" className="lv-btn" onClick={() => { setPos([start.x, start.y]); setTaken(new Set()); setScore(0); setMsg('Reset.'); onUse?.(); }}>Reset</button>
        <span className="lv-label">Player: x = {pos[0]}, y = {pos[1]} · Score: {score}</span>
      </div>
      <p className="lv-note" aria-live="polite">{msg}</p>
    </div>
  );
}

// ─── Scratch-style blocks ───────────────────────────────────────────────────

interface Block { kind?: string; text: string; children?: Block[]; }
interface Script { title?: string; blocks: Block[] }

const BLOCK_COLORS: Record<string, string> = {
  event: '#f59e0b', motion: '#3b82f6', looks: '#8b5cf6', sound: '#d946ef', control: '#f97316', sensing: '#06b6d4', operators: '#22c55e', variables: '#ef4444', custom: '#ec4899',
};

function BlockStack({ blocks, depth = 0 }: { blocks: Block[]; depth?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-start' }}>
      {blocks.slice(0, 20).map((b, n) => {
        const color = BLOCK_COLORS[b.kind ?? 'motion'] ?? BLOCK_COLORS.motion;
        const kids = Array.isArray(b.children) && depth < 3 ? b.children : [];
        return (
          <div key={n} style={{ background: color, color: '#fff', borderRadius: 10, padding: '6px 12px', fontSize: 13, fontWeight: 600, boxShadow: '0 1px 0 rgba(0,0,0,.25)', minWidth: 140 }}>
            <span>{b.text}</span>
            {kids.length > 0 && (
              <div style={{ margin: '6px 0 2px 14px', borderLeft: '4px solid rgba(255,255,255,.55)', paddingLeft: 8 }}>
                <BlockStack blocks={kids} depth={depth + 1} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function BlocksVisual({ config }: VisualProps) {
  const scripts: Script[] = (Array.isArray(config.scripts) ? config.scripts : []).slice(0, 4);
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
      {scripts.map((s, i) => (
        <div key={i}>
          {s.title && <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{s.title}</div>}
          <BlockStack blocks={s.blocks ?? []} />
        </div>
      ))}
    </div>
  );
}

registerVisuals({
  'code-trace': { Component: CodeTrace, interactive: true, role: 'group' },
  stage: { Component: StageVisual, interactive: true },
  blocks: { Component: BlocksVisual, interactive: false, role: 'group' },
});
