'use client';

// FILE PATH: client/components/lesson/visuals/diagrams.tsx
//
// Structural diagrams, all drawn from a lesson's own data: flows / pipelines / cycles
// / state machines, sequence diagrams, trees, neural networks, attention maps, cards,
// brand swatches, annotated interfaces and page mock-ups.

import { useState, type ReactElement } from 'react';
import { C, Lines, Svg, edgePoint, toneColor, useMarker, wrapText, type Box } from './svg';
import { registerVisuals, type VisualProps } from './registry';

// ─── Flow / pipeline / cycle / state machine ────────────────────────────────

interface FlowNode { id?: string; label: string; detail?: string; tone?: string }
interface FlowEdge { from: string | number; to: string | number; label?: string; dashed?: boolean }

function NodeBox({ b, node }: { b: Box; node: FlowNode }) {
  const label = wrapText(node.label, 20).slice(0, 2);
  const detail = node.detail ? wrapText(node.detail, 26).slice(0, 3) : [];
  const total = label.length * 16 + detail.length * 14;
  const y0 = b.cy - total / 2 + 12;
  return (
    <g>
      <rect x={b.cx - b.w / 2} y={b.cy - b.h / 2} width={b.w} height={b.h} rx={12} fill={C.surface} stroke={toneColor(node.tone ?? 'accent')} strokeWidth={2} />
      <Lines x={b.cx} y={y0} lines={label} size={13} lh={1.2} weight={700} />
      {detail.length > 0 && <Lines x={b.cx} y={y0 + label.length * 16 + 2} lines={detail} size={11} lh={1.25} fill={C.muted} />}
    </g>
  );
}

export function FlowDiagram({ config }: VisualProps) {
  const nodes: FlowNode[] = Array.isArray(config.nodes) ? config.nodes.slice(0, 16) : [];
  const layout: 'row' | 'column' | 'cycle' = ['row', 'column', 'cycle'].includes(config.layout) ? config.layout : 'row';
  const perRow = Math.max(1, Math.min(6, Number(config.perRow) || (nodes.length <= 4 ? nodes.length : nodes.length <= 6 ? 3 : 4)));
  const { id: markerId, defs } = useMarker();
  const n = nodes.length;
  if (n === 0) return null;
  const W = 170, H = nodes.some((x) => x.detail) ? 84 : 58, GX = 50, GY = 46;

  let boxes: Box[];
  let width: number;
  let height: number;
  if (layout === 'cycle') {
    const rx = Math.max(210, n * 30);
    const ry = Math.max(120, n * 15);
    width = rx * 2 + W + 30;
    height = ry * 2 + H + 30;
    boxes = nodes.map((_, i) => {
      const a = -Math.PI / 2 + (i / n) * 2 * Math.PI;
      return { cx: width / 2 + rx * Math.cos(a), cy: height / 2 + ry * Math.sin(a), w: W, h: H };
    });
  } else {
    const cols = layout === 'column' ? 1 : Math.min(perRow, n);
    const rows = Math.ceil(n / cols);
    width = cols * W + (cols - 1) * GX + 20;
    height = rows * H + (rows - 1) * GY + 20;
    boxes = nodes.map((_, i) => ({ cx: 10 + (i % cols) * (W + GX) + W / 2, cy: 10 + Math.floor(i / cols) * (H + GY) + H / 2, w: W, h: H }));
  }
  const idx = (ref: string | number) => (typeof ref === 'number' ? ref : nodes.findIndex((x) => x.id === ref));
  const custom: FlowEdge[] | null = Array.isArray(config.edges) && config.edges.length ? config.edges.slice(0, 30) : null;
  const edges: FlowEdge[] = custom ?? [...nodes.slice(1).map((_, i) => ({ from: i, to: i + 1 })), ...(layout === 'cycle' && n > 2 ? [{ from: n - 1, to: 0 }] : [])];

  // Work out each arrow's path first, so the picture can grow to include curved ones.
  const drawn = edges.map((e) => {
    const a = idx(e.from);
    const b = idx(e.to);
    if (a < 0 || b < 0 || !boxes[a] || !boxes[b]) return null;
    const A = boxes[a];
    const B = boxes[b];
    const wraps = !custom && layout === 'row' && Math.abs(A.cy - B.cy) > 1;
    if (wraps) {
      const ym = A.cy + A.h / 2 + GY / 2;
      return { e, d: `M ${A.cx} ${A.cy + A.h / 2} L ${A.cx} ${ym} L ${B.cx} ${ym} L ${B.cx} ${B.cy - B.h / 2}`, mid: { x: (A.cx + B.cx) / 2, y: ym } };
    }
    // Bow the line when it would run through another box, or lie on top of the arrow going the other way.
    const dx = B.cx - A.cx;
    const dy = B.cy - A.cy;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const blocked = boxes.some((X, i) => {
      if (i === a || i === b) return false;
      for (let t = 0.08; t < 0.93; t += 0.04) {
        if (Math.abs(A.cx + dx * t - X.cx) < X.w / 2 + 4 && Math.abs(A.cy + dy * t - X.cy) < X.h / 2 + 4) return true;
      }
      return false;
    });
    const reciprocal = edges.some((o) => idx(o.from) === b && idx(o.to) === a);
    const bow = blocked ? A.h / 2 + 36 : reciprocal ? 22 : 0;
    if (bow === 0) {
      const p = edgePoint(A, B.cx, B.cy);
      const q = edgePoint(B, A.cx, A.cy);
      return { e, d: `M ${p.x} ${p.y} L ${q.x} ${q.y}`, mid: { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 } };
    }
    const cx = (A.cx + B.cx) / 2 + nx * bow * 2;
    const cy = (A.cy + B.cy) / 2 + ny * bow * 2;
    const p = edgePoint(A, cx, cy);
    const q = edgePoint(B, cx, cy);
    const mid = { x: 0.25 * p.x + 0.5 * cx + 0.25 * q.x, y: 0.25 * p.y + 0.5 * cy + 0.25 * q.y };
    return { e, d: `M ${p.x} ${p.y} Q ${cx} ${cy} ${q.x} ${q.y}`, mid, curved: true };
  });
  // The picture grows to include any curved arrow (and its label) that leaves the boxes' area.
  const curvedMids = drawn.flatMap((g) => (g && 'curved' in g ? [g.mid.y] : []));
  const minY = Math.min(0, ...curvedMids.map((y) => y - 16));
  const maxY = Math.max(height, ...curvedMids.map((y) => y + 16));

  return (
    <Svg w={width} h={maxY - minY} y0={minY}>
      {defs}
      {drawn.map((g, k) => {
        if (!g) return null;
        const { e, d, mid } = g;
        return (
          <g key={k}>
            <path d={d} stroke={C.muted} strokeWidth={2} fill="none" markerEnd={`url(#${markerId})`} strokeDasharray={e.dashed ? '6 4' : undefined} />
            {e.label && (
              <g>
                <rect x={mid.x - e.label.length * 3.4 - 6} y={mid.y - 10} width={e.label.length * 6.8 + 12} height={20} rx={6} fill={C.bg} stroke={C.border} />
                <text x={mid.x} y={mid.y + 4} textAnchor="middle" fontSize={11} fill={C.text}>{e.label}</text>
              </g>
            )}
          </g>
        );
      })}
      {nodes.map((node, i) => (
        <NodeBox key={i} b={boxes[i]} node={node} />
      ))}
    </Svg>
  );
}

// ─── Sequence diagram ───────────────────────────────────────────────────────

export function SequenceDiagram({ config }: VisualProps) {
  const actors: { id: string; label: string }[] = (Array.isArray(config.actors) ? config.actors : []).slice(0, 6);
  const messages: { from: string; to: string; label: string; note?: string; dashed?: boolean }[] = (Array.isArray(config.messages) ? config.messages : []).slice(0, 14);
  const { id: markerId, defs } = useMarker();
  if (actors.length < 2) return null;
  const colW = actors.length > 3 ? 150 : 210;
  const W = actors.length * colW;
  const STEP = messages.some((m) => m.note) ? 66 : 52;
  const H = 40 + 28 + messages.length * STEP + 16;
  const x = (id: string) => {
    const i = actors.findIndex((a) => a.id === id);
    return i < 0 ? -1 : colW * i + colW / 2;
  };
  return (
    <Svg w={W} h={H}>
      {defs}
      {actors.map((a, i) => (
        <g key={a.id}>
          <line x1={colW * i + colW / 2} y1={38} x2={colW * i + colW / 2} y2={H - 8} stroke={C.border} strokeWidth={2} strokeDasharray="5 5" />
          <rect x={colW * i + 14} y={2} width={colW - 28} height={34} rx={9} fill={C.surface2} stroke={C.accent} strokeWidth={2} />
          <text x={colW * i + colW / 2} y={24} textAnchor="middle" fontSize={13} fontWeight={700}>{a.label}</text>
        </g>
      ))}
      {messages.map((m, i) => {
        const a = x(m.from);
        const b = x(m.to);
        if (a < 0 || b < 0) return null;
        const y = 40 + 34 + i * STEP;
        const self = a === b;
        const lines = wrapText(m.label, self ? 24 : Math.max(14, Math.floor(Math.abs(b - a) / 6.6))).slice(0, 2);
        const line = { stroke: C.muted, strokeWidth: 2, fill: 'none', markerEnd: `url(#${markerId})`, strokeDasharray: m.dashed ? '6 4' : undefined } as const;
        return (
          <g key={i}>
            {self ? <path d={`M ${a} ${y - 8} h 40 v 18 h -40`} {...line} /> : <line x1={a} y1={y} x2={b + (b > a ? -2 : 2)} y2={y} {...line} />}
            <Lines x={self ? a + 48 : (a + b) / 2} y={y - 10 - (lines.length - 1) * 13} lines={lines} size={12} lh={1.1} weight={600} anchor={self ? 'start' : 'middle'} />
            {m.note && <text x={self ? a + 48 : (a + b) / 2} y={y + 17} textAnchor={self ? 'start' : 'middle'} fontSize={10.5} fill={C.muted}>{m.note}</text>}
          </g>
        );
      })}
    </Svg>
  );
}

// ─── Tree (HTML / DOM / component / decision trees) ─────────────────────────

interface TNode { label: string; note?: string; tone?: string; children?: TNode[] }
interface Placed { node: TNode; x: number; y: number; kids: Placed[] }

export function TreeDiagram({ config }: VisualProps) {
  const root: TNode | undefined = config.root;
  if (!root || typeof root.label !== 'string') return null;
  const NW = 138, NH = 46, GX = 20, GY = 38;
  let leaf = 0;
  let maxDepth = 0;
  const place = (node: TNode, depth: number): Placed => {
    maxDepth = Math.max(maxDepth, depth);
    const kids = (node.children ?? []).slice(0, 10).map((c) => place(c, depth + 1));
    const x = kids.length ? kids.reduce((s, k) => s + k.x, 0) / kids.length : leaf++ * (NW + GX) + NW / 2;
    return { node, x, y: depth * (NH + GY), kids };
  };
  const tree = place(root, 0);
  const width = Math.max(leaf, 1) * (NW + GX) - GX + 4;
  const height = (maxDepth + 1) * (NH + GY) - GY + 4;
  const edges: ReactElement[] = [];
  const nodes: ReactElement[] = [];
  let key = 0;
  const walk = (p: Placed) => {
    for (const k of p.kids) {
      const ym = p.y + NH + GY / 2;
      edges.push(<path key={`e${key++}`} d={`M ${p.x + 2} ${p.y + NH} V ${ym} H ${k.x + 2} V ${k.y}`} stroke={C.muted} strokeWidth={2} fill="none" />);
      walk(k);
    }
    const code = /^[<{[(]/.test(p.node.label);
    const lines = wrapText(p.node.label, 17).slice(0, 2);
    nodes.push(
      <g key={`n${key++}`}>
        <rect x={p.x - NW / 2 + 2} y={p.y} width={NW} height={NH} rx={9} fill={C.surface} stroke={toneColor(p.node.tone ?? (p.kids.length ? 'accent' : 'accent2'))} strokeWidth={2} />
        <text x={p.x + 2} y={p.y + (p.node.note ? 19 : NH / 2 + 4)} textAnchor="middle" fontSize={12.5} fontWeight={700} fontFamily={code ? 'ui-monospace, Menlo, monospace' : undefined}>
          {lines.map((l, i) => (
            <tspan key={i} x={p.x + 2} dy={i === 0 ? 0 : 14}>{l}</tspan>
          ))}
        </text>
        {p.node.note && <text x={p.x + 2} y={p.y + NH - 8} textAnchor="middle" fontSize={10} fill={C.muted}>{wrapText(p.node.note, 24)[0]}</text>}
      </g>,
    );
  };
  walk(tree);
  return (
    <Svg w={width + 4} h={height}>
      {edges}
      {nodes}
    </Svg>
  );
}

// ─── Neural network ─────────────────────────────────────────────────────────

export function NeuralNet({ config }: VisualProps) {
  const layers: { label: string; nodes: number }[] = (Array.isArray(config.layers) ? config.layers : []).slice(0, 6);
  if (layers.length < 2) return null;
  const SHOW = 7;
  const colGap = 140;
  const W = (layers.length - 1) * colGap + 130;
  const H = 36 + SHOW * 34 + 54;
  const pos = layers.map((l, li) => {
    const n = Math.min(Math.max(1, Number(l.nodes) || 1), SHOW);
    const top = 30 + ((SHOW - n) * 34) / 2;
    return { x: 65 + li * colGap, ys: Array.from({ length: n }, (_, i) => top + i * 34 + 17), total: Math.max(1, Number(l.nodes) || 1) };
  });
  const tone = (i: number) => (i === 0 ? C.accent2 : i === layers.length - 1 ? C.good : C.accent);
  return (
    <Svg w={W} h={H}>
      {pos.slice(0, -1).map((p, li) =>
        p.ys.flatMap((y1, a) => pos[li + 1].ys.map((y2, b) => <line key={`${li}-${a}-${b}`} x1={p.x} y1={y1} x2={pos[li + 1].x} y2={y2} stroke={C.border} strokeWidth={1.2} opacity={0.7} />)),
      )}
      {pos.map((p, li) => (
        <g key={li}>
          {p.ys.map((y, i) => (
            <circle key={i} cx={p.x} cy={y} r={11} fill={C.surface} stroke={tone(li)} strokeWidth={2.5} />
          ))}
          {p.total > SHOW && <text x={p.x} y={H - 46} textAnchor="middle" fontSize={14} fill={C.muted}>⋮</text>}
          <text x={p.x} y={H - 24} textAnchor="middle" fontSize={12} fontWeight={700}>{layers[li].label}</text>
          <text x={p.x} y={H - 9} textAnchor="middle" fontSize={10.5} fill={C.muted}>{p.total} node{p.total === 1 ? '' : 's'}</text>
        </g>
      ))}
    </Svg>
  );
}

// ─── Attention map (transformer) ────────────────────────────────────────────

export function AttentionMap({ config, onUse }: VisualProps) {
  const tokens: string[] = (Array.isArray(config.tokens) ? config.tokens : []).slice(0, 14).map(String);
  const weights: number[][] = Array.isArray(config.weights) ? config.weights : [];
  const [sel, setSel] = useState(0);
  if (tokens.length < 2 || weights.length === 0) return null;
  const row = tokens.map((_, j) => Math.max(0, Number(weights[sel]?.[j]) || 0));
  const max = Math.max(...row, 0.0001);
  const top = row.map((w, j) => ({ w, j })).sort((a, b) => b.w - a.w).slice(0, 3).filter((x) => x.w > 0);
  return (
    <div>
      <div className="lv-label" id="attn-help">Pick a word to see which other words the model looks at while reading it.</div>
      <div className="lv-controls" role="group" aria-labelledby="attn-help">
        {tokens.map((t, i) => (
          <button key={i} type="button" className="lv-btn" aria-pressed={sel === i} onClick={() => { setSel(i); onUse?.(); }}>{t}</button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', marginTop: 16, overflowX: 'auto', paddingBottom: 4 }} aria-hidden="true">
        {tokens.map((t, j) => (
          <div key={j} style={{ textAlign: 'center', minWidth: 54 }}>
            <div style={{ height: 70, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
              <div style={{ width: 26, height: Math.max(4, (row[j] / max) * 66), background: j === sel ? C.warn : C.accent, borderRadius: 5, opacity: 0.35 + 0.65 * (row[j] / max) }} />
            </div>
            <div style={{ fontSize: 12, fontWeight: j === sel ? 700 : 500, marginTop: 4 }}>{t}</div>
            <div style={{ fontSize: 10.5, color: C.muted }}>{row[j].toFixed(2)}</div>
          </div>
        ))}
      </div>
      <p className="lv-note" aria-live="polite">
        Reading <strong>“{tokens[sel]}”</strong>, the model pays most attention to{' '}
        {top.length ? top.map((x, i) => <span key={x.j}>{i ? (i === top.length - 1 ? ' and ' : ', ') : ''}<strong>“{tokens[x.j]}”</strong> ({Math.round(x.w * 100)}%)</span>) : 'nothing in particular'}.
      </p>
      <p className="lv-sim">A simplified, illustrative example — real models compute many such maps at once.</p>
    </div>
  );
}

// ─── Cards, swatches, annotated interface, mock-ups ─────────────────────────

export function CardsVisual({ config }: VisualProps) {
  const cards: { title: string; subtitle?: string; price?: string; bullets?: string[]; tone?: string; badge?: string }[] = (Array.isArray(config.cards) ? config.cards : []).slice(0, 6);
  return (
    <ul style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', margin: 0, padding: 0, listStyle: 'none' }}>
      {cards.map((c, i) => (
        <li key={i} style={{ border: `2px solid ${toneColor(c.tone ?? 'accent')}`, borderRadius: 14, background: C.surface, padding: '12px 14px' }}>
          {c.badge && <span className="lv-badge">{c.badge}</span>}
          <div style={{ fontWeight: 700, fontSize: 15, marginTop: c.badge ? 6 : 0 }}>{c.title}</div>
          {c.subtitle && <div style={{ color: C.muted, fontSize: 12.5 }}>{c.subtitle}</div>}
          {c.price && <div style={{ fontWeight: 800, fontSize: 20, margin: '6px 0' }}>{c.price}</div>}
          {c.bullets && c.bullets.length > 0 && (
            <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 13, lineHeight: 1.5 }}>
              {c.bullets.slice(0, 8).map((b, k) => (
                <li key={k}>{b}</li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const FONT_STACKS: Record<string, string> = { 'sans-serif': 'system-ui, sans-serif', serif: 'Georgia, serif', monospace: 'ui-monospace, Menlo, monospace', cursive: '"Comic Sans MS", cursive', rounded: 'ui-rounded, "Trebuchet MS", sans-serif' };

export function Swatches({ config }: VisualProps) {
  const colors: { name: string; hex: string }[] = (Array.isArray(config.colors) ? config.colors : []).slice(0, 8).filter((c) => HEX.test(String(c?.hex)));
  const fonts: { label: string; family: string; sample: string }[] = (Array.isArray(config.fonts) ? config.fonts : []).slice(0, 3);
  return (
    <div>
      <ul style={{ display: 'flex', flexWrap: 'wrap', gap: 10, margin: 0, padding: 0, listStyle: 'none' }}>
        {colors.map((c, i) => (
          <li key={i} style={{ width: 96 }}>
            <div style={{ height: 56, borderRadius: 10, background: c.hex, border: `1px solid ${C.border}` }} />
            <div style={{ fontSize: 12, fontWeight: 600, marginTop: 4 }}>{c.name}</div>
            <div style={{ fontSize: 11, color: C.muted, fontFamily: 'ui-monospace, monospace' }}>{c.hex.toUpperCase()}</div>
          </li>
        ))}
      </ul>
      {fonts.map((f, i) => (
        <div key={i} style={{ marginTop: 12 }}>
          <div className="lv-label">{f.label}</div>
          <div style={{ fontFamily: FONT_STACKS[f.family] ?? FONT_STACKS['sans-serif'], fontSize: 22, fontWeight: 600 }}>{f.sample}</div>
        </div>
      ))}
      {config.tagline && <div style={{ marginTop: 14, fontStyle: 'italic', fontSize: 16, borderLeft: `4px solid ${C.accent}`, paddingLeft: 12 }}>{String(config.tagline)}</div>}
    </div>
  );
}

export function UiMap({ config, onUse }: VisualProps) {
  const regions: { id: string; label: string; desc: string; x: number; y: number; w: number; h: number }[] = (Array.isArray(config.regions) ? config.regions : []).slice(0, 12);
  const [sel, setSel] = useState<string | null>(regions[0]?.id ?? null);
  const active = regions.find((r) => r.id === sel);
  const pct = (n: number) => `${Math.max(0, Math.min(100, Number(n) || 0))}%`;
  return (
    <div>
      {config.title && <div className="lv-label" style={{ marginBottom: 6 }}>{String(config.title)}</div>}
      <div style={{ position: 'relative', paddingTop: '58%', border: `2px solid ${C.border}`, borderRadius: 12, background: C.surface, overflow: 'hidden' }}>
        {regions.map((r) => (
          <button
            key={r.id}
            type="button"
            aria-pressed={sel === r.id}
            onClick={() => { setSel(r.id); onUse?.(); }}
            style={{ position: 'absolute', left: pct(r.x), top: pct(r.y), width: pct(r.w), height: pct(r.h), border: `2px ${sel === r.id ? 'solid' : 'dashed'} ${sel === r.id ? C.accent : C.border}`, background: sel === r.id ? C.surface2 : 'transparent', color: C.text, borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 2, overflow: 'hidden' }}
          >
            {r.label}
          </button>
        ))}
      </div>
      <p className="lv-note" aria-live="polite">{active ? <><strong>{active.label}:</strong> {active.desc}</> : 'Tap a part of the window to learn what it does.'}</p>
    </div>
  );
}

export function Mockup({ config }: VisualProps) {
  const sections: { label: string; text?: string; callout?: string }[] = (Array.isArray(config.sections) ? config.sections : []).slice(0, 8);
  const notes = sections.map((s) => s.callout).filter(Boolean) as string[];
  let n = 0;
  return (
    <div>
      <div style={{ border: `2px solid ${C.border}`, borderRadius: 14, background: C.surface, padding: 12, display: 'grid', gap: 8 }}>
        {sections.map((s, i) => (
          <div key={i} style={{ position: 'relative', border: `1.5px dashed ${C.border}`, borderRadius: 10, padding: '10px 12px', background: C.bg }}>
            {s.callout && <span aria-hidden="true" style={{ position: 'absolute', right: 8, top: 8, width: 22, height: 22, borderRadius: 999, background: C.accent, color: '#fff', fontSize: 12, fontWeight: 700, display: 'grid', placeItems: 'center' }}>{++n}</span>}
            <div style={{ fontWeight: 700, fontSize: 13 }}>{s.label}</div>
            {s.text && <div style={{ color: C.muted, fontSize: 12.5, marginTop: 2, paddingRight: 28 }}>{s.text}</div>}
          </div>
        ))}
      </div>
      {notes.length > 0 && (
        <ol style={{ margin: '10px 0 0', paddingLeft: 22, fontSize: 13, lineHeight: 1.55 }}>
          {notes.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ol>
      )}
    </div>
  );
}

registerVisuals({
  flow: { Component: FlowDiagram, interactive: false },
  sequence: { Component: SequenceDiagram, interactive: false },
  tree: { Component: TreeDiagram, interactive: false },
  'neural-net': { Component: NeuralNet, interactive: false },
  attention: { Component: AttentionMap, interactive: true },
  cards: { Component: CardsVisual, interactive: false, role: 'group' },
  swatches: { Component: Swatches, interactive: false, role: 'group' },
  'ui-map': { Component: UiMap, interactive: true },
  mockup: { Component: Mockup, interactive: false, role: 'group' },
});
