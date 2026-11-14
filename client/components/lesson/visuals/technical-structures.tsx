'use client';

// FILE PATH: client/components/lesson/visuals/technical-structures.tsx
//
// Data-structure and memory visuals of the Pre-University CSE program, all drawn from a lesson's own
// data: memory and pointer diagrams, arrays, linked lists, hash tables, stacks / queues / call stacks,
// trees and heaps step by step, graphs (with BFS / DFS / shortest-path step-throughs) and sorting /
// searching animations. Nothing here runs author- or learner-supplied code: the step-throughs REPLAY
// frames the author generated, and the interactive hash table only evaluates the simple hash
// functions in lib/lesson/technical/hash.ts.

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { C, Lines, Svg, edgePoint, toneColor, useMarker, wrapText } from './svg';
import { registerVisuals, type VisualProps } from './registry';
import { TreeDiagram } from './diagrams';
import { HASH_LABELS, buildChaining, buildProbing, hashExplanation, hashKey, type HashName } from '@/lib/lesson/technical/hash';

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';
const str = (v: unknown): string => (v === undefined || v === null ? '' : String(v));

/** Back / Next / Reset controls shared by every step-through. */
function Stepper({ i, n, set, onUse, extra }: { i: number; n: number; set: (k: number) => void; onUse?: () => void; extra?: ReactNode }) {
  const go = (k: number) => {
    set(clamp(k, 0, n - 1));
    onUse?.();
  };
  return (
    <div className="lv-controls">
      <button type="button" className="lv-btn" onClick={() => go(0)} disabled={i === 0}>⏮ Start</button>
      <button type="button" className="lv-btn" onClick={() => go(i - 1)} disabled={i === 0}>◀ Back</button>
      <button type="button" className="lv-btn lv-btn-primary" onClick={() => go(i + 1)} disabled={i >= n - 1}>Next ▶</button>
      {extra}
      <span className="lv-label" aria-live="polite">Step {i + 1} of {n}</span>
    </div>
  );
}

// ─── Memory and pointer diagram ─────────────────────────────────────────────

interface MemCell { name?: string; addr: string; value: string; type?: string; note?: string; pointsTo?: string; tone?: string }
interface MemRegion { label: string; cells: MemCell[] }

export function MemoryMap({ config }: VisualProps) {
  const regions: MemRegion[] = (Array.isArray(config.regions) ? config.regions : []).slice(0, 4);
  const { id: markerId, defs } = useMarker();
  if (regions.length === 0) return null;
  const colW = 230, rowH = 54, gap = 70, top = 34, pad = 10;
  const pos = new Map<string, { x: number; y: number; r: number }>();
  regions.forEach((r, ri) => (r.cells ?? []).slice(0, 12).forEach((c, ci) => pos.set(c.addr, { x: pad + ri * (colW + gap), y: top + ci * rowH, r: ri })));
  const width = pad * 2 + regions.length * colW + (regions.length - 1) * gap + 40;
  const rows = Math.max(...regions.map((r) => Math.min((r.cells ?? []).length, 12)));
  const height = top + rows * rowH + 14;
  return (
    <Svg w={width} h={height}>
      {defs}
      {regions.map((r, ri) => {
        const x = pad + ri * (colW + gap);
        return (
          <g key={ri}>
            <text x={x + colW / 2} y={20} textAnchor="middle" fontSize={13} fontWeight={800} fill={C.accent}>{r.label}</text>
            {(r.cells ?? []).slice(0, 12).map((c, ci) => {
              const y = top + ci * rowH;
              const tone = toneColor(c.tone ?? (c.pointsTo ? 'accent2' : 'accent'));
              return (
                <g key={c.addr + ci}>
                  <rect x={x} y={y} width={colW} height={rowH - 8} rx={8} fill={C.surface} stroke={tone} strokeWidth={2} />
                  <text x={x + 8} y={y + 14} fontSize={10.5} fill={C.muted} fontFamily={MONO}>{c.addr}</text>
                  <text x={x + 8} y={y + 33} fontSize={13} fontWeight={700}>{c.name ? `${c.name}` : ''}{c.type ? <tspan fill={C.muted} fontWeight={400} fontSize={11}>{`  ${c.type}`}</tspan> : null}</text>
                  <text x={x + colW - 10} y={y + 33} fontSize={14} fontWeight={700} textAnchor="end" fontFamily={MONO} fill={c.pointsTo ? C.accent2 : C.text}>{c.value}</text>
                  {c.note && <text x={x + colW - 10} y={y + 14} fontSize={10.5} textAnchor="end" fill={C.muted}>{c.note}</text>}
                </g>
              );
            })}
          </g>
        );
      })}
      {regions.flatMap((r) =>
        (r.cells ?? []).slice(0, 12).map((c) => {
          if (!c.pointsTo) return null;
          const a = pos.get(c.addr);
          const b = pos.get(c.pointsTo);
          if (!a || !b) return null;
          const ay = a.y + (rowH - 8) / 2;
          const by = b.y + (rowH - 8) / 2;
          let d: string;
          if (a.r === b.r) {
            const x = a.x + colW;
            d = `M ${x} ${ay} C ${x + 44} ${ay}, ${x + 44} ${by}, ${x} ${by}`;
          } else if (b.r > a.r) {
            const x1 = a.x + colW;
            const x2 = b.x;
            d = `M ${x1} ${ay} C ${x1 + gap / 2} ${ay}, ${x2 - gap / 2} ${by}, ${x2} ${by}`;
          } else {
            const x1 = a.x;
            const x2 = b.x + colW;
            d = `M ${x1} ${ay} C ${x1 - gap / 2} ${ay}, ${x2 + gap / 2} ${by}, ${x2} ${by}`;
          }
          return <path key={`${c.addr}->${c.pointsTo}`} d={d} fill="none" stroke={C.accent2} strokeWidth={2.2} markerEnd={`url(#${markerId})`} />;
        }),
      )}
    </Svg>
  );
}

// ─── Array diagram ──────────────────────────────────────────────────────────

interface ArrRow {
  label?: string;
  cells: (string | number)[];
  indexStart?: number;
  hideIndex?: boolean;
  pointers?: { index: number; label: string; tone?: string }[];
  highlight?: { from: number; to: number; tone?: string }[];
  dim?: number[];
}

export function ArrayRows({ rows, compact = false }: { rows: ArrRow[]; compact?: boolean }) {
  const cellW = compact ? 40 : 46;
  const cellH = compact ? 34 : 40;
  const labelW = rows.some((r) => r.label) ? 120 : 0;
  const maxCols = Math.max(1, ...rows.map((r) => r.cells.length));
  const rowH = cellH + 52;
  const width = labelW + maxCols * cellW + 24;
  const height = rows.length * rowH + 8;
  const { id: markerId, defs } = useMarker();
  return (
    <Svg w={width} h={height}>
      {defs}
      {rows.map((row, ri) => {
        const y = ri * rowH + 6;
        const x0 = labelW + 8;
        const start = row.indexStart ?? 0;
        return (
          <g key={ri}>
            {row.label && (
              <Lines x={4} y={y + cellH / 2 - 2} lines={wrapText(row.label, 17).slice(0, 3)} size={11.5} lh={1.2} anchor="start" fill={C.muted} />
            )}
            {(row.highlight ?? []).map((h, k) => (
              <rect key={`h${k}`} x={x0 + h.from * cellW - 3} y={y - 3} width={(h.to - h.from + 1) * cellW + 6} height={cellH + 6} rx={9} fill={`color-mix(in srgb, ${toneColor(h.tone ?? 'accent')} 22%, transparent)`} stroke={toneColor(h.tone ?? 'accent')} strokeWidth={1.5} strokeDasharray="4 3" />
            ))}
            {row.cells.map((cell, ci) => {
              const dim = (row.dim ?? []).includes(ci);
              return (
                <g key={ci} opacity={dim ? 0.35 : 1}>
                  <rect x={x0 + ci * cellW} y={y} width={cellW} height={cellH} fill={C.surface} stroke={C.border} strokeWidth={1.5} />
                  <text x={x0 + ci * cellW + cellW / 2} y={y + cellH / 2 + 5} textAnchor="middle" fontSize={14} fontWeight={700} fontFamily={MONO}>{str(cell)}</text>
                  {!row.hideIndex && <text x={x0 + ci * cellW + cellW / 2} y={y + cellH + 13} textAnchor="middle" fontSize={10.5} fill={C.muted} fontFamily={MONO}>{start + ci}</text>}
                </g>
              );
            })}
            {(row.pointers ?? []).map((p, k) => {
              const cx = x0 + p.index * cellW + cellW / 2;
              return (
                <g key={`p${k}`}>
                  <line x1={cx} y1={y + cellH + 40} x2={cx} y2={y + cellH + 17} stroke={toneColor(p.tone ?? 'accent2')} strokeWidth={2} markerEnd={`url(#${markerId})`} />
                  <text x={cx} y={y + cellH + 50} textAnchor="middle" fontSize={11.5} fontWeight={800} fill={toneColor(p.tone ?? 'accent2')}>{p.label}</text>
                </g>
              );
            })}
          </g>
        );
      })}
    </Svg>
  );
}

export function ArrayViz({ config }: VisualProps) {
  const rows: ArrRow[] = (Array.isArray(config.rows) ? config.rows : []).slice(0, 12);
  if (rows.length === 0) return null;
  return <ArrayRows rows={rows} />;
}

// ─── Linked list ────────────────────────────────────────────────────────────

interface LNode { value: string | number; tone?: string }
interface LList { label?: string; kind?: 'singly' | 'doubly' | 'circular'; nodes: LNode[]; head?: string; tail?: string; cursors?: { index: number; label: string }[]; nullEnd?: boolean }

export function LinkedList({ config }: VisualProps) {
  const lists: LList[] = (Array.isArray(config.lists) ? config.lists : []).slice(0, 4);
  const { id: markerId, defs } = useMarker();
  if (lists.length === 0) return null;
  const nodeW = 92, nodeH = 40, gapX = 46, labelW = 84, rowH = 118;
  const maxN = Math.max(...lists.map((l) => (l.nodes ?? []).length));
  const width = labelW + maxN * (nodeW + gapX) + 50;
  return (
    <Svg w={width} h={lists.length * rowH + 6}>
      {defs}
      {lists.map((l, li) => {
        const nodes = (l.nodes ?? []).slice(0, 10);
        const kind = l.kind ?? 'singly';
        const y = li * rowH + 44;
        const x = (i: number) => labelW + i * (nodeW + gapX);
        return (
          <g key={li}>
            {l.label && <text x={4} y={y + 24} fontSize={12.5} fontWeight={800} fill={C.accent}>{l.label}</text>}
            {nodes.map((n, i) => {
              const tone = toneColor(n.tone ?? 'accent');
              return (
                <g key={i}>
                  <rect x={x(i)} y={y} width={nodeW} height={nodeH} rx={6} fill={C.surface} stroke={tone} strokeWidth={2} />
                  {kind === 'doubly' ? (
                    <>
                      <line x1={x(i) + 22} y1={y} x2={x(i) + 22} y2={y + nodeH} stroke={tone} />
                      <line x1={x(i) + nodeW - 22} y1={y} x2={x(i) + nodeW - 22} y2={y + nodeH} stroke={tone} />
                      <text x={x(i) + nodeW / 2} y={y + 25} textAnchor="middle" fontSize={14} fontWeight={700} fontFamily={MONO}>{str(n.value)}</text>
                    </>
                  ) : (
                    <>
                      <line x1={x(i) + nodeW - 30} y1={y} x2={x(i) + nodeW - 30} y2={y + nodeH} stroke={tone} />
                      <text x={x(i) + (nodeW - 30) / 2} y={y + 25} textAnchor="middle" fontSize={14} fontWeight={700} fontFamily={MONO}>{str(n.value)}</text>
                      <circle cx={x(i) + nodeW - 15} cy={y + nodeH / 2} r={3.5} fill={C.muted} />
                    </>
                  )}
                  {i < nodes.length - 1 && (
                    <>
                      <line x1={x(i) + nodeW} y1={y + (kind === 'doubly' ? 14 : nodeH / 2)} x2={x(i + 1) - 2} y2={y + (kind === 'doubly' ? 14 : nodeH / 2)} stroke={C.muted} strokeWidth={2} markerEnd={`url(#${markerId})`} />
                      {kind === 'doubly' && <line x1={x(i + 1)} y1={y + 28} x2={x(i) + nodeW + 2} y2={y + 28} stroke={C.muted} strokeWidth={2} markerEnd={`url(#${markerId})`} />}
                    </>
                  )}
                </g>
              );
            })}
            {nodes.length > 0 && (
              <>
                <text x={x(0) + nodeW / 2} y={y - 22} textAnchor="middle" fontSize={11.5} fontWeight={800} fill={C.accent2}>{l.head ?? 'head'}</text>
                <line x1={x(0) + nodeW / 2} y1={y - 17} x2={x(0) + nodeW / 2} y2={y - 2} stroke={C.accent2} strokeWidth={2} markerEnd={`url(#${markerId})`} />
              </>
            )}
            {l.tail && nodes.length > 0 && (
              <>
                <text x={x(nodes.length - 1) + nodeW / 2} y={y + nodeH + 34} textAnchor="middle" fontSize={11.5} fontWeight={800} fill={C.accent2}>{l.tail}</text>
                <line x1={x(nodes.length - 1) + nodeW / 2} y1={y + nodeH + 22} x2={x(nodes.length - 1) + nodeW / 2} y2={y + nodeH + 4} stroke={C.accent2} strokeWidth={2} markerEnd={`url(#${markerId})`} />
              </>
            )}
            {(l.cursors ?? []).map((k, ci) => (
              <g key={`c${ci}`}>
                <text x={x(k.index) + nodeW / 2} y={y + nodeH + 36 + (l.tail && k.index === nodes.length - 1 ? 14 : 0)} textAnchor="middle" fontSize={11.5} fontWeight={800} fill={C.warn}>{k.label}</text>
              </g>
            ))}
            {kind === 'circular' && nodes.length > 1 ? (
              <path d={`M ${x(nodes.length - 1) + nodeW - 15} ${y + nodeH} C ${x(nodes.length - 1) + nodeW - 15} ${y + nodeH + 40}, ${x(0) + 15} ${y + nodeH + 40}, ${x(0) + 15} ${y + nodeH + 2}`} fill="none" stroke={C.muted} strokeWidth={2} markerEnd={`url(#${markerId})`} />
            ) : kind !== 'circular' && l.nullEnd !== false && nodes.length > 0 ? (
              <g>
                <line x1={x(nodes.length - 1) + nodeW} y1={y + (kind === 'doubly' ? 14 : nodeH / 2)} x2={x(nodes.length - 1) + nodeW + 26} y2={y + (kind === 'doubly' ? 14 : nodeH / 2)} stroke={C.muted} strokeWidth={2} />
                <text x={x(nodes.length - 1) + nodeW + 30} y={y + (kind === 'doubly' ? 18 : 25)} fontSize={12} fontWeight={700} fill={C.muted} fontFamily={MONO}>NULL</text>
              </g>
            ) : null}
          </g>
        );
      })}
    </Svg>
  );
}

// ─── Hash table (interactive) ───────────────────────────────────────────────

export function HashTable({ config, onUse }: VisualProps) {
  const size = clamp(Number(config.size) || 7, 3, 16);
  const name: HashName = (['sum-mod', 'length-mod', 'first-letter-mod'].includes(config.hash) ? config.hash : 'sum-mod') as HashName;
  const method: 'chaining' | 'linear-probing' = config.method === 'linear-probing' ? 'linear-probing' : 'chaining';
  const initial: string[] = (Array.isArray(config.keys) ? config.keys : []).map(String).slice(0, 24);
  const [keys, setKeys] = useState<string[]>(initial);
  const [draft, setDraft] = useState('');
  const chain = useMemo(() => buildChaining(keys, name, size), [keys, name, size]);
  const probe = useMemo(() => buildProbing(keys, name, size), [keys, name, size]);
  const last = keys[keys.length - 1];
  const add = () => {
    const k = draft.trim().slice(0, 14);
    if (!k || keys.includes(k) || keys.length >= 24) return;
    setKeys([...keys, k]);
    setDraft('');
    onUse?.();
  };
  const collisions = method === 'chaining' ? chain.collisions : probe.collisions;
  const load = keys.length / size;
  return (
    <div>
      <p className="lv-note" style={{ marginTop: 0 }}>Hash function: <strong>{HASH_LABELS[name]}</strong> · table size <strong>{size}</strong> · {method === 'chaining' ? 'collisions are chained in a list' : 'collisions use the next free slot (linear probing)'}.</p>
      <div style={{ display: 'grid', gap: 4, margin: '8px 0' }}>
        {Array.from({ length: size }, (_, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 28, textAlign: 'right', fontFamily: MONO, fontSize: 12, color: C.muted }}>{i}</span>
            <span aria-hidden style={{ color: C.muted }}>→</span>
            {method === 'chaining' ? (
              chain.buckets[i].length === 0 ? (
                <span style={{ fontSize: 12, color: C.muted, border: `1px dashed ${C.border}`, borderRadius: 6, padding: '2px 8px' }}>empty</span>
              ) : (
                chain.buckets[i].map((k, j) => (
                  <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    {j > 0 && <span aria-hidden style={{ color: C.muted }}>→</span>}
                    <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, border: `2px solid ${j > 0 ? C.warn : C.accent}`, background: C.surface, borderRadius: 6, padding: '2px 8px' }}>{k}</span>
                  </span>
                ))
              )
            ) : probe.slots[i] === null ? (
              <span style={{ fontSize: 12, color: C.muted, border: `1px dashed ${C.border}`, borderRadius: 6, padding: '2px 8px' }}>empty</span>
            ) : (
              <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, border: `2px solid ${hashKey(probe.slots[i]!, name, size) === i ? C.accent : C.warn}`, background: C.surface, borderRadius: 6, padding: '2px 8px' }}>
                {probe.slots[i]}
                {hashKey(probe.slots[i]!, name, size) !== i && <span style={{ fontWeight: 400, color: C.muted, fontSize: 11 }}> (hashed to {hashKey(probe.slots[i]!, name, size)})</span>}
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="lv-controls">
        <label className="lv-label" htmlFor="hash-key">Add a key</label>
        <input id="hash-key" className="lv-select" style={{ width: '10rem' }} value={draft} maxLength={14} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="e.g. rahim" />
        <button type="button" className="lv-btn lv-btn-primary" onClick={add} disabled={!draft.trim()}>Insert</button>
        <button type="button" className="lv-btn" onClick={() => { setKeys(initial); onUse?.(); }}>Reset</button>
      </div>
      {last && <p className="lv-note" aria-live="polite">Last key <strong>{last}</strong>: {hashExplanation(last, name, size)}.</p>}
      <p className="lv-note">Keys stored: <strong>{keys.length}</strong> · load factor <strong>{load.toFixed(2)}</strong> · collisions so far: <strong>{collisions}</strong>{probe.failed.length > 0 && method === 'linear-probing' ? ` · table full: could not store ${probe.failed.join(', ')}` : ''}.</p>
    </div>
  );
}

// ─── Stack / queue / call stack ─────────────────────────────────────────────

interface SQFrame { items: string[]; op?: string; note: string }

export function StackQueue({ config, onUse }: VisualProps) {
  const kind: 'stack' | 'queue' | 'call-stack' = ['stack', 'queue', 'call-stack'].includes(config.kind) ? config.kind : 'stack';
  const frames: SQFrame[] = (Array.isArray(config.frames) ? config.frames : []).slice(0, 40);
  const [i, setI] = useState(0);
  if (frames.length === 0) return null;
  const f = frames[clamp(i, 0, frames.length - 1)];
  const items = (f.items ?? []).slice(0, 12);
  const cell: CSSProperties = { fontFamily: MONO, fontWeight: 700, fontSize: 13, background: C.surface, border: `2px solid ${C.accent}`, borderRadius: 8, padding: '6px 12px', minWidth: 54, textAlign: 'center' };
  return (
    <div>
      {f.op && <p style={{ margin: '0 0 8px', fontFamily: MONO, fontWeight: 800, color: C.accent2 }}>{f.op}</p>}
      {kind === 'queue' ? (
        <div role="group" style={{ display: 'flex', alignItems: 'stretch', gap: 6, minHeight: 56, overflowX: 'auto', padding: '4px 0' }} aria-label="The queue, front on the left">
          <span style={{ alignSelf: 'center', fontSize: 11, fontWeight: 800, color: C.good }}>FRONT →</span>
          {items.length === 0 ? <span style={{ ...cell, color: C.muted, borderStyle: 'dashed' }}>empty</span> : items.map((x, k) => <span key={k} style={{ ...cell, borderColor: k === 0 ? C.good : k === items.length - 1 ? C.warn : C.accent }}>{x}</span>)}
          <span style={{ alignSelf: 'center', fontSize: 11, fontWeight: 800, color: C.warn }}>← REAR</span>
        </div>
      ) : (
        <div role="group" style={{ display: 'inline-flex', flexDirection: 'column', gap: 6, minWidth: 190 }} aria-label={kind === 'stack' ? 'The stack, top first' : 'The call stack, most recent call first'}>
          <span style={{ fontSize: 11, fontWeight: 800, color: C.good }}>TOP ↓</span>
          {items.length === 0 ? <span style={{ ...cell, color: C.muted, borderStyle: 'dashed' }}>empty</span> : [...items].reverse().map((x, k) => <span key={k} style={{ ...cell, borderColor: k === 0 ? C.good : C.accent, textAlign: 'left' }}>{x}</span>)}
          <span style={{ height: 6, background: C.border, borderRadius: 3 }} aria-hidden />
        </div>
      )}
      <Stepper i={i} n={frames.length} set={setI} onUse={onUse} />
      <p className="lv-note" aria-live="polite">{f.note}</p>
    </div>
  );
}

// ─── Tree / heap, step by step ──────────────────────────────────────────────

interface TreeFrame { root: unknown; note: string; array?: (string | number)[] }

export function TreeSteps({ config, onUse, alt, id }: VisualProps) {
  const frames: TreeFrame[] = (Array.isArray(config.frames) ? config.frames : []).slice(0, 30);
  const [i, setI] = useState(0);
  if (frames.length === 0) return null;
  const f = frames[clamp(i, 0, frames.length - 1)];
  return (
    <div>
      <TreeDiagram config={{ root: f.root }} alt={alt} id={id} />
      {f.array && f.array.length > 0 && (
        <>
          <p className="lv-label" style={{ margin: '6px 0 0' }}>The same tree stored in an array (parent of index i is at (i − 1) / 2, rounded down):</p>
          <ArrayRows rows={[{ cells: f.array }]} compact />
        </>
      )}
      <Stepper i={i} n={frames.length} set={setI} onUse={onUse} />
      <p className="lv-note" aria-live="polite">{f.note}</p>
    </div>
  );
}

// ─── Graph ──────────────────────────────────────────────────────────────────

interface GNode { id: string; label?: string; x?: number; y?: number; tone?: string }
interface GEdge { from: string; to: string; weight?: number; tone?: string }
interface GStep { visit?: string[]; current?: string; queue?: string[]; stack?: string[]; dist?: Record<string, string | number>; edges?: [string, string][]; note: string }

function layoutGraph(nodes: GNode[], W: number, H: number): Map<string, { x: number; y: number }> {
  const out = new Map<string, { x: number; y: number }>();
  const manual = nodes.filter((n) => typeof n.x === 'number' && typeof n.y === 'number');
  if (manual.length === nodes.length && nodes.length > 0) {
    const xs = nodes.map((n) => n.x as number);
    const ys = nodes.map((n) => n.y as number);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    for (const n of nodes) out.set(n.id, { x: 40 + (maxX === minX ? 0.5 : ((n.x as number) - minX) / (maxX - minX)) * (W - 80), y: 36 + (maxY === minY ? 0.5 : ((n.y as number) - minY) / (maxY - minY)) * (H - 72) });
    return out;
  }
  nodes.forEach((n, i) => {
    const a = -Math.PI / 2 + (i / nodes.length) * 2 * Math.PI;
    out.set(n.id, { x: W / 2 + (W / 2 - 50) * Math.cos(a), y: H / 2 + (H / 2 - 40) * Math.sin(a) });
  });
  return out;
}

export function GraphVisual({ config, onUse }: VisualProps) {
  const nodes: GNode[] = (Array.isArray(config.nodes) ? config.nodes : []).slice(0, 14);
  const edges: GEdge[] = (Array.isArray(config.edges) ? config.edges : []).slice(0, 40);
  const steps: GStep[] = (Array.isArray(config.steps) ? config.steps : []).slice(0, 40);
  const directed = !!config.directed;
  const [i, setI] = useState(0);
  const { id: markerId, defs } = useMarker();
  if (nodes.length === 0) return null;
  const W = 560, H = nodes.length > 8 ? 380 : 320, R = 19;
  const pos = layoutGraph(nodes, W, H);
  const step: GStep | null = steps.length ? steps[clamp(i, 0, steps.length - 1)] : null;
  // Everything visited up to and including the current step.
  const visited = new Set<string>();
  const hotEdges = new Set<string>();
  if (step) {
    for (const s of steps.slice(0, i + 1)) {
      (s.visit ?? []).forEach((v) => visited.add(v));
      (s.edges ?? []).forEach(([a, b]) => hotEdges.add(`${a}>${b}`));
    }
  }
  const isHot = (a: string, b: string) => hotEdges.has(`${a}>${b}`) || (!directed && hotEdges.has(`${b}>${a}`));
  return (
    <div>
      <Svg w={W} h={H}>
        {defs}
        {edges.map((e, k) => {
          const a = pos.get(e.from), b = pos.get(e.to);
          if (!a || !b) return null;
          const hot = isHot(e.from, e.to) || e.tone !== undefined;
          const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
          const sx = a.x + (dx / len) * R, sy = a.y + (dy / len) * R;
          const ex = b.x - (dx / len) * (R + (directed ? 5 : 0)), ey = b.y - (dy / len) * (R + (directed ? 5 : 0));
          const col = e.tone ? toneColor(e.tone) : hot ? C.good : C.muted;
          return (
            <g key={k}>
              <line x1={sx} y1={sy} x2={ex} y2={ey} stroke={col} strokeWidth={hot ? 3.4 : 2} markerEnd={directed ? `url(#${markerId})` : undefined} />
              {e.weight !== undefined && (
                <g>
                  <rect x={(a.x + b.x) / 2 - 11} y={(a.y + b.y) / 2 - 10} width={22} height={19} rx={5} fill={C.bg} stroke={C.border} />
                  <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 + 4} textAnchor="middle" fontSize={11.5} fontWeight={700}>{e.weight}</text>
                </g>
              )}
            </g>
          );
        })}
        {nodes.map((n) => {
          const p = pos.get(n.id)!;
          const cur = step?.current === n.id;
          const seen = visited.has(n.id);
          const fill = cur ? C.warn : seen ? C.good : n.tone ? toneColor(n.tone) : C.surface;
          return (
            <g key={n.id}>
              <circle cx={p.x} cy={p.y} r={R} fill={fill} fillOpacity={cur || seen || n.tone ? 0.88 : 1} stroke={cur ? C.warn : C.accent} strokeWidth={cur ? 4 : 2.2} />
              <text x={p.x} y={p.y + 5} textAnchor="middle" fontSize={13} fontWeight={800} fill={cur || seen ? '#0f172a' : C.text}>{n.label ?? n.id}</text>
              {step?.dist && step.dist[n.id] !== undefined && <text x={p.x} y={p.y - R - 5} textAnchor="middle" fontSize={11} fontWeight={800} fill={C.accent2}>{String(step.dist[n.id])}</text>}
            </g>
          );
        })}
      </Svg>
      {step && (
        <>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontFamily: MONO, fontSize: 13 }}>
            <span><strong>Visited:</strong> {[...visited].join(', ') || '—'}</span>
            {step.queue && <span><strong>Queue (front first):</strong> [{step.queue.join(', ')}]</span>}
            {step.stack && <span><strong>Stack (top last):</strong> [{step.stack.join(', ')}]</span>}
          </div>
          <Stepper i={i} n={steps.length} set={setI} onUse={onUse} />
          <p className="lv-note" aria-live="polite">{step.note}</p>
        </>
      )}
    </div>
  );
}

// ─── Algorithm animation (sorting and searching) ────────────────────────────

interface AFrame { array: number[]; marks?: Record<string, string>; note: string; counters?: Record<string, number> }
const MARK_COLOR: Record<string, string> = { compare: C.warn, swap: C.bad, sorted: C.good, pivot: C.accent, found: C.good, range: C.info, min: C.accent2, current: C.accent2 };
const MARK_LABEL: Record<string, string> = { compare: 'comparing', swap: 'swapping', sorted: 'in place', pivot: 'pivot', found: 'found', range: 'still searching', min: 'smallest so far', current: 'current' };

export function AlgoSteps({ config, onUse }: VisualProps) {
  const frames: AFrame[] = (Array.isArray(config.frames) ? config.frames : []).slice(0, 90);
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(700);
  const idx = clamp(i, 0, Math.max(frames.length - 1, 0));
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!playing) return;
    timer.current = setInterval(() => {
      setI((k) => {
        if (k >= frames.length - 1) {
          setPlaying(false);
          return k;
        }
        return k + 1;
      });
    }, speed);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [playing, speed, frames.length]);
  if (frames.length === 0) return null;
  const f = frames[idx];
  const arr = f.array.slice(0, 20);
  const max = Math.max(1, ...frames.flatMap((x) => x.array.map((v) => Math.abs(v))));
  const barW = clamp(Math.floor(520 / arr.length) - 6, 18, 52);
  const W = arr.length * (barW + 6) + 16, H = 190;
  const used = [...new Set(Object.values(f.marks ?? {}))];
  return (
    <div>
      <Svg w={Math.max(W, 260)} h={H}>
        {arr.map((v, k) => {
          const mark = f.marks?.[String(k)];
          const h = Math.max(14, (Math.abs(v) / max) * 132);
          const x = 8 + k * (barW + 6);
          return (
            <g key={k}>
              <rect x={x} y={150 - h} width={barW} height={h} rx={5} fill={mark ? MARK_COLOR[mark] : C.accent2} fillOpacity={mark ? 0.95 : 0.55} stroke={mark ? MARK_COLOR[mark] : C.accent2} />
              <text x={x + barW / 2} y={146 - h} textAnchor="middle" fontSize={12} fontWeight={800}>{v}</text>
              <text x={x + barW / 2} y={168} textAnchor="middle" fontSize={10.5} fill={C.muted} fontFamily={MONO}>{k}</text>
            </g>
          );
        })}
      </Svg>
      {used.length > 0 && (
        <p className="lv-label" style={{ margin: '2px 0 0' }}>
          {used.map((m) => (
            <span key={m} style={{ marginRight: 12, whiteSpace: 'nowrap' }}>
              <span aria-hidden style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: MARK_COLOR[m], marginRight: 4 }} />
              {MARK_LABEL[m] ?? m}
            </span>
          ))}
        </p>
      )}
      <div className="lv-controls">
        <button type="button" className="lv-btn" onClick={() => { setPlaying(false); setI(0); onUse?.(); }} disabled={idx === 0}>⏮ Start</button>
        <button type="button" className="lv-btn" onClick={() => { setPlaying(false); setI(idx - 1); onUse?.(); }} disabled={idx === 0}>◀ Back</button>
        <button type="button" className="lv-btn lv-btn-primary" onClick={() => { setPlaying(false); setI(idx + 1); onUse?.(); }} disabled={idx >= frames.length - 1}>Next ▶</button>
        <button type="button" className="lv-btn" aria-pressed={playing} onClick={() => { if (idx >= frames.length - 1) setI(0); setPlaying((p) => !p); onUse?.(); }}>{playing ? '⏸ Pause' : '▶ Play'}</button>
        <label className="lv-label" htmlFor="algo-speed">Speed</label>
        <select id="algo-speed" className="lv-select" value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
          <option value={1200}>Slow</option>
          <option value={700}>Normal</option>
          <option value={300}>Fast</option>
        </select>
        <span className="lv-label" aria-live="polite">Step {idx + 1} of {frames.length}</span>
      </div>
      {f.counters && Object.keys(f.counters).length > 0 && (
        <p className="lv-note" style={{ fontFamily: MONO }}>{Object.entries(f.counters).map(([k, v]) => `${k}: ${v}`).join('   ·   ')}</p>
      )}
      <p className="lv-note" aria-live="polite">{f.note}</p>
    </div>
  );
}

registerVisuals({
  'memory-map': { Component: MemoryMap, interactive: false },
  'array-viz': { Component: ArrayViz, interactive: false },
  'linked-list': { Component: LinkedList, interactive: false },
  'hash-table': { Component: HashTable, interactive: true, role: 'group' },
  'stack-queue': { Component: StackQueue, interactive: true, role: 'group' },
  'tree-steps': { Component: TreeSteps, interactive: true, role: 'group' },
  graph: { Component: GraphVisual, interactive: true, role: 'group' },
  'algo-steps': { Component: AlgoSteps, interactive: true, role: 'group' },
});

void edgePoint;
