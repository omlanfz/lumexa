'use client';

// FILE PATH: client/components/lesson/visuals/technical-diagrams.tsx
//
// Diagram visuals of the Pre-University CSE program, all drawn from a lesson's own data:
//   block-diagram  boxes, shapes and arrows on a canvas — CPU datapaths, networks, ER diagrams, UML
//                  class diagrams, flowcharts and architectures; optionally stepped through
//   gantt          bars on a timeline (CPU scheduling, a pipeline)
//   venn           two or three overlapping sets with a highlighted region
//   automaton      a finite automaton the learner can run an input string through
//   tool-launch    a card that opens a browser-based tool in a new tab
// Nothing here evaluates author-supplied code.

import { useMemo, useState } from 'react';
import { C, Lines, Svg, toneColor, useMarker, useSafeId, wrapText } from './svg';
import { registerVisuals, type VisualProps } from './registry';
import { alphabetOf, isComplete, isDeterministic, runAutomaton, symbolsOf, type AutomatonConfig } from '@/lib/lesson/technical/automaton';

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

// ─── Block diagram ──────────────────────────────────────────────────────────

type Shape = 'rect' | 'round' | 'ellipse' | 'diamond' | 'cylinder' | 'circle' | 'terminator' | 'process' | 'decision' | 'io' | 'class' | 'cloud';
type Head = 'end' | 'both' | 'none' | 'open' | 'diamond' | 'filled-diamond';

interface BBox { id: string; label: string; x: number; y: number; w?: number; h?: number; shape?: Shape; tone?: string; sub?: string; fields?: string[]; methods?: string[]; double?: boolean; dashed?: boolean }
interface BArrow { from: string; to: string; label?: string; dashed?: boolean; head?: Head; fromLabel?: string; toLabel?: string; via?: [number, number][]; curve?: number }
interface BGroup { label: string; x: number; y: number; w: number; h: number; tone?: string }
interface BStep { title?: string; note: string; boxes?: string[]; arrows?: number[] }
interface Placed extends Required<Pick<BBox, 'id' | 'label' | 'x' | 'y' | 'w' | 'h'>> { shape: Shape; src: BBox }

function sized(b: BBox): Placed {
  const shape = b.shape ?? 'rect';
  const sub = b.sub ? 1 : 0;
  const lines = wrapText(b.label, 22).length;
  let w = b.w;
  let h = b.h;
  switch (shape) {
    case 'ellipse': w ??= 140; h ??= 56; break;
    case 'diamond': case 'decision': w ??= 168; h ??= 88; break;
    case 'cylinder': w ??= 120; h ??= 70; break;
    case 'circle': w ??= 58; h ??= w; break;
    case 'terminator': w ??= 140; h ??= 46; break;
    case 'io': w ??= 176; h ??= 52; break;
    case 'cloud': w ??= 160; h ??= 80; break;
    case 'class': w ??= 196; h ??= 34 + Math.max(1, (b.fields ?? []).length) * 17 + 10 + Math.max(1, (b.methods ?? []).length) * 17 + 8; break;
    default: w ??= 150; h ??= 44 + (lines - 1) * 15 + sub * 16;
  }
  return { id: b.id, label: b.label, x: b.x, y: b.y, w, h: h ?? 50, shape, src: b };
}

function boundary(b: Placed, tx: number, ty: number) {
  const dx = tx - b.x;
  const dy = ty - b.y;
  if (!dx && !dy) return { x: b.x, y: b.y };
  const a = b.w / 2;
  const c = b.h / 2;
  let t: number;
  if (b.shape === 'ellipse' || b.shape === 'circle' || b.shape === 'cloud') t = 1 / Math.sqrt((dx / a) ** 2 + (dy / c) ** 2);
  else if (b.shape === 'diamond' || b.shape === 'decision') t = 1 / (Math.abs(dx) / a + Math.abs(dy) / c);
  else t = Math.min(dx ? a / Math.abs(dx) : Infinity, dy ? c / Math.abs(dy) : Infinity);
  return { x: b.x + dx * t, y: b.y + dy * t };
}

function ShapeBody({ p, dim, hot }: { p: Placed; dim: boolean; hot: boolean }) {
  const { x, y, w, h, shape, src } = p;
  const col = toneColor(src.tone ?? 'accent');
  const common = { fill: C.surface, stroke: hot ? C.warn : col, strokeWidth: hot ? 3.4 : 2, strokeDasharray: src.dashed ? '6 4' : undefined } as const;
  const text = (cy?: number) => {
    const lines = wrapText(p.label, Math.max(8, Math.floor(w / 7.6))).slice(0, 4);
    const sub = src.sub ? wrapText(src.sub, Math.max(10, Math.floor(w / 6.4))).slice(0, 2) : [];
    const total = lines.length * 15 + sub.length * 13;
    const y0 = (cy ?? y) - total / 2 + 12;
    return (
      <>
        <Lines x={x} y={y0} lines={lines} size={13} lh={1.15} weight={700} />
        {sub.length > 0 && <Lines x={x} y={y0 + lines.length * 15 + 1} lines={sub} size={10.5} lh={1.2} fill={C.muted} />}
      </>
    );
  };
  let body;
  switch (shape) {
    case 'ellipse':
      body = <ellipse cx={x} cy={y} rx={w / 2} ry={h / 2} {...common} />;
      break;
    case 'circle':
      body = (
        <>
          <circle cx={x} cy={y} r={w / 2} {...common} />
          {src.double && <circle cx={x} cy={y} r={w / 2 - 5} fill="none" stroke={hot ? C.warn : col} strokeWidth={2} />}
        </>
      );
      break;
    case 'diamond':
    case 'decision':
      body = <polygon points={`${x},${y - h / 2} ${x + w / 2},${y} ${x},${y + h / 2} ${x - w / 2},${y}`} {...common} />;
      break;
    case 'cylinder':
      body = (
        <>
          <path d={`M ${x - w / 2} ${y - h / 2 + 10} v ${h - 20} a ${w / 2} 10 0 0 0 ${w} 0 v ${-(h - 20)} a ${w / 2} 10 0 0 0 ${-w} 0 z`} {...common} />
          <path d={`M ${x - w / 2} ${y - h / 2 + 10} a ${w / 2} 10 0 0 0 ${w} 0`} fill="none" stroke={common.stroke} strokeWidth={2} />
        </>
      );
      break;
    case 'terminator':
      body = <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={h / 2} {...common} />;
      break;
    case 'io':
      body = <polygon points={`${x - w / 2 + 14},${y - h / 2} ${x + w / 2},${y - h / 2} ${x + w / 2 - 14},${y + h / 2} ${x - w / 2},${y + h / 2}`} {...common} />;
      break;
    case 'cloud':
      body = <path d={`M ${x - w / 2 + 28} ${y + h / 2 - 8} a 24 24 0 0 1 -4 -44 a 28 28 0 0 1 52 -14 a 24 24 0 0 1 46 12 a 22 22 0 0 1 -6 46 z`} transform={`translate(${-6},${4})`} {...common} />;
      break;
    case 'class': {
      const fields = src.fields ?? [];
      const methods = src.methods ?? [];
      const f0 = y - h / 2 + 34;
      const m0 = f0 + Math.max(1, fields.length) * 17 + 10;
      body = (
        <>
          <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={4} {...common} />
          <line x1={x - w / 2} y1={f0} x2={x + w / 2} y2={f0} stroke={common.stroke} />
          <line x1={x - w / 2} y1={m0 - 5} x2={x + w / 2} y2={m0 - 5} stroke={common.stroke} />
          <text x={x} y={y - h / 2 + 21} textAnchor="middle" fontSize={13.5} fontWeight={800} fontStyle={src.tone === 'muted' ? 'italic' : undefined}>{p.label}</text>
          {fields.map((t, i) => <text key={`f${i}`} x={x - w / 2 + 8} y={f0 + 15 + i * 17} fontSize={11.5} fontFamily={MONO}>{t}</text>)}
          {methods.map((t, i) => <text key={`m${i}`} x={x - w / 2 + 8} y={m0 + 11 + i * 17} fontSize={11.5} fontFamily={MONO}>{t}</text>)}
        </>
      );
      return <g opacity={dim ? 0.3 : 1}>{body}</g>;
    }
    default:
      body = <rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={shape === 'rect' || shape === 'process' ? 6 : 14} {...common} />;
  }
  return (
    <g opacity={dim ? 0.3 : 1}>
      {body}
      {text()}
    </g>
  );
}

export function BlockDiagram({ config, onUse }: VisualProps) {
  const boxes: BBox[] = (Array.isArray(config.boxes) ? config.boxes : []).slice(0, 40);
  const arrows: BArrow[] = (Array.isArray(config.arrows) ? config.arrows : []).slice(0, 70);
  const groups: BGroup[] = (Array.isArray(config.groups) ? config.groups : []).slice(0, 8);
  const steps: BStep[] = (Array.isArray(config.steps) ? config.steps : []).slice(0, 24);
  const [i, setI] = useState(0);
  const { id: markerId, defs } = useMarker();
  const placed = useMemo(() => boxes.map(sized), [boxes]);
  const byId = useMemo(() => new Map(placed.map((p) => [p.id, p])), [placed]);
  if (placed.length === 0) return null;

  // Canvas bounds (everything translated so the top-left is the margin).
  const pts: [number, number][] = [];
  for (const p of placed) pts.push([p.x - p.w / 2, p.y - p.h / 2], [p.x + p.w / 2, p.y + p.h / 2]);
  for (const g of groups) pts.push([g.x, g.y], [g.x + g.w, g.y + g.h]);
  for (const a of arrows) for (const v of a.via ?? []) pts.push([v[0], v[1]]);
  const minX = Math.min(...pts.map((q) => q[0])) - 18;
  const minY = Math.min(...pts.map((q) => q[1])) - 30;
  const maxX = Math.max(...pts.map((q) => q[0])) + 18;
  const maxY = Math.max(...pts.map((q) => q[1])) + 30;

  const step = steps.length ? steps[clamp(i, 0, steps.length - 1)] : null;
  const hotBoxes = new Set(step?.boxes ?? []);
  const hotArrows = new Set(step?.arrows ?? []);
  const focused = !!step && (hotBoxes.size > 0 || hotArrows.size > 0);

  const drawArrow = (a: BArrow, k: number) => {
    const A = byId.get(a.from);
    const B = byId.get(a.to);
    if (!A || !B) return null;
    const hot = hotArrows.has(k);
    const dim = focused && !hot;
    const stroke = hot ? C.warn : C.muted;
    const head = a.head ?? 'end';
    if (A === B) {
      const top = A.y - A.h / 2;
      const d = `M ${A.x - 16} ${top} C ${A.x - 36} ${top - 46}, ${A.x + 36} ${top - 46}, ${A.x + 16} ${top - 1}`;
      return (
        <g key={k} opacity={dim ? 0.25 : 1}>
          <path d={d} fill="none" stroke={stroke} strokeWidth={hot ? 3.2 : 2} markerEnd={head === 'none' ? undefined : `url(#${markerId})`} />
          {a.label && <text x={A.x} y={top - 36} textAnchor="middle" fontSize={11.5} fontWeight={700}>{a.label}</text>}
        </g>
      );
    }
    const via = a.via ?? [];
    const firstTarget = via.length ? { x: via[0][0], y: via[0][1] } : { x: B.x, y: B.y };
    const lastSource = via.length ? { x: via[via.length - 1][0], y: via[via.length - 1][1] } : { x: A.x, y: A.y };
    let s = boundary(A, firstTarget.x, firstTarget.y);
    let e = boundary(B, lastSource.x, lastSource.y);
    let d: string;
    let mid = { x: (s.x + e.x) / 2, y: (s.y + e.y) / 2 };
    let dirEnd = { x: e.x - (via.length ? lastSource.x : s.x), y: e.y - (via.length ? lastSource.y : s.y) };
    let dirStart = { x: (via.length ? firstTarget.x : e.x) - s.x, y: (via.length ? firstTarget.y : e.y) - s.y };
    if (a.curve && !via.length) {
      const dx = B.x - A.x;
      const dy = B.y - A.y;
      const len = Math.hypot(dx, dy) || 1;
      const cx = (A.x + B.x) / 2 + (-dy / len) * a.curve * 2;
      const cy = (A.y + B.y) / 2 + (dx / len) * a.curve * 2;
      s = boundary(A, cx, cy);
      e = boundary(B, cx, cy);
      d = `M ${s.x} ${s.y} Q ${cx} ${cy} ${e.x} ${e.y}`;
      mid = { x: 0.25 * s.x + 0.5 * cx + 0.25 * e.x, y: 0.25 * s.y + 0.5 * cy + 0.25 * e.y };
      dirEnd = { x: e.x - cx, y: e.y - cy };
      dirStart = { x: cx - s.x, y: cy - s.y };
    } else {
      d = `M ${s.x} ${s.y} ${via.map((v) => `L ${v[0]} ${v[1]}`).join(' ')} L ${e.x} ${e.y}`;
      if (via.length) {
        const m = via[Math.floor(via.length / 2)];
        mid = { x: m[0], y: m[1] };
      }
    }
    const unit = (v: { x: number; y: number }) => {
      const l = Math.hypot(v.x, v.y) || 1;
      return { x: v.x / l, y: v.y / l };
    };
    const uEnd = unit(dirEnd);
    const uStart = unit(dirStart);
    const nEnd = { x: -uEnd.y, y: uEnd.x };
    const nStart = { x: -uStart.y, y: uStart.x };
    const marks = [];
    if (head === 'open') {
      const bx = e.x - uEnd.x * 14;
      const by = e.y - uEnd.y * 14;
      marks.push(<polygon key="h" points={`${e.x},${e.y} ${bx + nEnd.x * 7},${by + nEnd.y * 7} ${bx - nEnd.x * 7},${by - nEnd.y * 7}`} fill={C.bg} stroke={stroke} strokeWidth={2} />);
    }
    if (head === 'diamond' || head === 'filled-diamond') {
      const m1 = { x: s.x + uStart.x * 10, y: s.y + uStart.y * 10 };
      const tip = { x: s.x + uStart.x * 20, y: s.y + uStart.y * 20 };
      marks.push(<polygon key="h" points={`${s.x},${s.y} ${m1.x + nStart.x * 6},${m1.y + nStart.y * 6} ${tip.x},${tip.y} ${m1.x - nStart.x * 6},${m1.y - nStart.y * 6}`} fill={head === 'filled-diamond' ? stroke : C.bg} stroke={stroke} strokeWidth={2} />);
    }
    const lab = (text: string, at: { x: number; y: number }, key: string) => (
      <g key={key}>
        <rect x={at.x - text.length * 3.4 - 5} y={at.y - 10} width={text.length * 6.8 + 10} height={19} rx={5} fill={C.bg} stroke={C.border} />
        <text x={at.x} y={at.y + 4} textAnchor="middle" fontSize={11} fontWeight={600}>{text}</text>
      </g>
    );
    return (
      <g key={k} opacity={dim ? 0.25 : 1}>
        <path d={d} fill="none" stroke={stroke} strokeWidth={hot ? 3.2 : 2} strokeDasharray={a.dashed ? '6 4' : undefined} markerEnd={head === 'end' || head === 'both' ? `url(#${markerId})` : undefined} markerStart={head === 'both' ? `url(#${markerId})` : undefined} />
        {marks}
        {a.label && lab(a.label, mid, 'l')}
        {a.fromLabel && <text x={s.x + uStart.x * 16 + nStart.x * 12} y={s.y + uStart.y * 16 + nStart.y * 12 + 4} textAnchor="middle" fontSize={11.5} fontWeight={800} fill={C.accent2}>{a.fromLabel}</text>}
        {a.toLabel && <text x={e.x - uEnd.x * 16 + nEnd.x * 12} y={e.y - uEnd.y * 16 + nEnd.y * 12 + 4} textAnchor="middle" fontSize={11.5} fontWeight={800} fill={C.accent2}>{a.toLabel}</text>}
      </g>
    );
  };

  return (
    <div>
      <Svg w={maxX - minX} h={maxY - minY} y0={0}>
        {defs}
        <g transform={`translate(${-minX},${-minY})`}>
          {groups.map((g, k) => (
            <g key={`g${k}`}>
              <rect x={g.x} y={g.y} width={g.w} height={g.h} rx={12} fill={`color-mix(in srgb, ${toneColor(g.tone ?? 'accent2')} 8%, transparent)`} stroke={toneColor(g.tone ?? 'accent2')} strokeWidth={1.5} strokeDasharray="7 5" />
              {g.label && <text x={g.x + 10} y={g.y + 16} fontSize={11.5} fontWeight={800} fill={C.muted}>{g.label}</text>}
            </g>
          ))}
          {arrows.map(drawArrow)}
          {placed.map((p) => (
            <ShapeBody key={p.id} p={p} dim={focused && !hotBoxes.has(p.id)} hot={hotBoxes.has(p.id)} />
          ))}
        </g>
      </Svg>
      {step && (
        <>
          <div className="lv-controls">
            <button type="button" className="lv-btn" onClick={() => { setI(0); onUse?.(); }} disabled={i === 0}>⏮ Start</button>
            <button type="button" className="lv-btn" onClick={() => { setI(i - 1); onUse?.(); }} disabled={i === 0}>◀ Back</button>
            <button type="button" className="lv-btn lv-btn-primary" onClick={() => { setI(i + 1); onUse?.(); }} disabled={i >= steps.length - 1}>Next ▶</button>
            <span className="lv-label" aria-live="polite">Step {i + 1} of {steps.length}</span>
          </div>
          <p className="lv-note" aria-live="polite">{step.title && <strong>{step.title}. </strong>}{step.note}</p>
        </>
      )}
    </div>
  );
}

// ─── Timeline / Gantt ───────────────────────────────────────────────────────

interface GSeg { lane: string; start: number; end: number; label?: string; tone?: string }
const LANE_TONES = ['accent', 'accent2', 'good', 'warn', 'info', 'bad'];

export function GanttChart({ lanes, segments, max, unit = '', marks = [] }: { lanes: string[]; segments: GSeg[]; max?: number; unit?: string; marks?: { at: number; label: string }[] }) {
  const end = max ?? Math.max(1, ...segments.map((s) => s.end));
  const px = clamp(Math.floor(560 / end), 12, 44);
  const labelW = Math.min(110, 18 + Math.max(...lanes.map((l) => l.length)) * 7.5);
  const rowH = 34;
  const width = labelW + end * px + 24;
  const top = marks.length ? 24 : 6;
  const height = top + lanes.length * rowH + 34;
  const tick = end <= 30 ? 1 : end <= 80 ? 5 : 10;
  return (
    <Svg w={width} h={height}>
      {lanes.map((l, r) => (
        <g key={l}>
          <rect x={labelW} y={top + r * rowH} width={end * px} height={rowH - 4} fill={r % 2 ? 'transparent' : C.surface} />
          <text x={labelW - 8} y={top + r * rowH + rowH / 2 + 2} textAnchor="end" fontSize={12.5} fontWeight={700}>{l}</text>
        </g>
      ))}
      {segments.map((s, k) => {
        const r = lanes.indexOf(s.lane);
        if (r < 0) return null;
        const col = toneColor(s.tone ?? LANE_TONES[r % LANE_TONES.length]);
        const w = (s.end - s.start) * px;
        return (
          <g key={k}>
            <rect x={labelW + s.start * px + 1} y={top + r * rowH + 2} width={w - 2} height={rowH - 8} rx={5} fill={col} fillOpacity={0.85} stroke={col} />
            {s.label && w > 18 && <text x={labelW + s.start * px + w / 2} y={top + r * rowH + rowH / 2 + 1} textAnchor="middle" fontSize={11.5} fontWeight={800} fill="#0f172a">{s.label}</text>}
          </g>
        );
      })}
      {Array.from({ length: Math.floor(end / tick) + 1 }, (_, k) => k * tick).map((t) => (
        <g key={t}>
          <line x1={labelW + t * px} y1={top} x2={labelW + t * px} y2={top + lanes.length * rowH} stroke={C.border} strokeWidth={1} strokeDasharray="2 3" />
          <text x={labelW + t * px} y={top + lanes.length * rowH + 14} textAnchor="middle" fontSize={10.5} fill={C.muted} fontFamily={MONO}>{t}</text>
        </g>
      ))}
      {unit && <text x={labelW + end * px + 6} y={top + lanes.length * rowH + 14} fontSize={10.5} fill={C.muted}>{unit}</text>}
      {marks.map((m) => (
        <g key={m.at}>
          <line x1={labelW + m.at * px} y1={top - 4} x2={labelW + m.at * px} y2={top + lanes.length * rowH} stroke={C.bad} strokeWidth={1.6} strokeDasharray="5 3" />
          <text x={labelW + m.at * px + 4} y={top - 8} fontSize={10.5} fontWeight={700} fill={C.bad}>{m.label}</text>
        </g>
      ))}
    </Svg>
  );
}

export function GanttVisual({ config }: VisualProps) {
  const lanes: string[] = (Array.isArray(config.lanes) ? config.lanes : []).map(String).slice(0, 12);
  const segments: GSeg[] = (Array.isArray(config.segments) ? config.segments : []).slice(0, 90);
  if (lanes.length === 0 || segments.length === 0) return null;
  return <GanttChart lanes={lanes} segments={segments} max={typeof config.max === 'number' ? config.max : undefined} unit={typeof config.unit === 'string' ? config.unit : ''} marks={Array.isArray(config.marks) ? config.marks : []} />;
}

// ─── Venn diagram ───────────────────────────────────────────────────────────

const VENN2 = { circles: [{ cx: 150, cy: 130 }, { cx: 250, cy: 130 }], r: 92, w: 400, h: 260, spots: { A: [102, 130], B: [298, 130], 'A,B': [200, 130], none: [34, 238] } as Record<string, [number, number]> };
const VENN3 = { circles: [{ cx: 150, cy: 118 }, { cx: 250, cy: 118 }, { cx: 200, cy: 198 }], r: 92, w: 400, h: 320, spots: { A: [108, 92], B: [292, 92], C: [200, 262], 'A,B': [200, 78], 'A,C': [148, 188], 'B,C': [252, 188], 'A,B,C': [200, 142], none: [34, 296] } as Record<string, [number, number]> };

export function VennVisual({ config, onUse }: VisualProps) {
  const labels: string[] = (Array.isArray(config.sets) ? config.sets : []).map(String).slice(0, 3);
  const regions: Record<string, (string | number)[]> = config.regions && typeof config.regions === 'object' ? (config.regions as Record<string, (string | number)[]>) : {};
  const initial: string[] = Array.isArray(config.highlight) ? config.highlight.map(String) : [];
  const [chosen, setChosen] = useState<string[]>(initial);
  const uid = useSafeId();
  if (labels.length < 2) return null;
  const g = labels.length === 2 ? VENN2 : VENN3;
  const keys = [...Object.keys(g.spots)];
  // The region keys use the author's own set labels, in order: "A", "A,B", "none"…
  const keyFor = (k: string) => (k === 'none' ? 'none' : k.split(',').map((l) => labels[l.charCodeAt(0) - 65]).join(','));
  const keyOf = (internal: string) => keyFor(internal);
  const nice = (internal: string) => (internal === 'none' ? 'outside every set' : internal.split(',').map((l) => labels[l.charCodeAt(0) - 65]).join(' ∩ ') + (internal.includes(',') ? '' : ' only'));
  const toggle = (k: string) => {
    setChosen((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]));
    onUse?.();
  };
  const fillFor = (internal: string, key: string) => {
    const inside = internal === 'none' ? [] : internal.split(',').map((l) => l.charCodeAt(0) - 65);
    const outside = labels.map((_, i) => i).filter((i) => !inside.includes(i));
    const maskId = `${uid}-m-${key}`;
    let node = <rect x={10} y={10} width={g.w - 20} height={g.h - 20} fill={C.warn} fillOpacity={0.5} />;
    for (const i of inside) node = <g clipPath={`url(#${uid}-c${i})`}>{node}</g>;
    return (
      <g key={key}>
        {outside.length > 0 && (
          <mask id={maskId}>
            <rect x={0} y={0} width={g.w} height={g.h} fill="#fff" />
            {outside.map((i) => <circle key={i} cx={g.circles[i].cx} cy={g.circles[i].cy} r={g.r} fill="#000" />)}
          </mask>
        )}
        <g mask={outside.length > 0 ? `url(#${maskId})` : undefined}>{node}</g>
      </g>
    );
  };
  return (
    <div>
      <Svg w={g.w} h={g.h}>
        <defs>
          {g.circles.slice(0, labels.length).map((c, i) => (
            <clipPath key={i} id={`${uid}-c${i}`}>
              <circle cx={c.cx} cy={c.cy} r={g.r} />
            </clipPath>
          ))}
        </defs>
        <rect x={10} y={10} width={g.w - 20} height={g.h - 20} rx={10} fill="none" stroke={C.border} strokeWidth={2} />
        <text x={20} y={30} fontSize={12} fontWeight={800} fill={C.muted}>{typeof config.universe === 'string' ? config.universe : 'U'}</text>
        {keys.filter((k) => chosen.includes(keyOf(k))).map((k) => fillFor(k, k.replace(/[^A-Za-z]/g, '')))}
        {g.circles.slice(0, labels.length).map((c, i) => (
          <g key={i}>
            <circle cx={c.cx} cy={c.cy} r={g.r} fill={toneColor(['accent', 'accent2', 'good'][i])} fillOpacity={0.12} stroke={toneColor(['accent', 'accent2', 'good'][i])} strokeWidth={2.4} />
            <text x={c.cx + (i === 0 ? -g.r + 14 : i === 1 ? g.r - 14 : 0)} y={c.cy + (i === 2 ? g.r - 8 : -g.r + 6)} textAnchor={i === 0 ? 'start' : i === 1 ? 'end' : 'middle'} fontSize={15} fontWeight={800} fill={toneColor(['accent', 'accent2', 'good'][i])}>{labels[i]}</text>
          </g>
        ))}
        {keys.map((k) => {
          const items = regions[keyOf(k)] ?? [];
          const [x, y] = g.spots[k];
          const lines = wrapText(items.join(', '), k === 'none' ? 24 : 12).slice(0, 4);
          return lines.length && items.length ? <Lines key={k} x={x} y={y - ((lines.length - 1) * 7)} lines={lines} size={11.5} lh={1.15} weight={600} anchor={k === 'none' ? 'start' : 'middle'} /> : null;
        })}
      </Svg>
      <div className="lv-controls" role="group" aria-label="Highlight a region">
        <span className="lv-label">Highlight:</span>
        {keys.map((k) => (
          <button key={k} type="button" className="lv-btn" aria-pressed={chosen.includes(keyOf(k))} onClick={() => toggle(keyOf(k))}>{nice(k)}</button>
        ))}
        <button type="button" className="lv-btn" onClick={() => setChosen([])} disabled={chosen.length === 0}>Clear</button>
      </div>
      <ul className="lv-note" style={{ listStyle: 'none', padding: 0, display: 'flex', flexWrap: 'wrap', gap: '4px 18px' }}>
        {keys.map((k) => (
          <li key={k}><strong>{nice(k)}:</strong> {(regions[keyOf(k)] ?? []).length ? `{ ${(regions[keyOf(k)] ?? []).join(', ')} }` : '∅'}</li>
        ))}
      </ul>
    </div>
  );
}

// ─── Finite automaton ───────────────────────────────────────────────────────

export function AutomatonVisual({ config, onUse }: VisualProps) {
  const states: string[] = (Array.isArray(config.states) ? config.states : []).map(String).slice(0, 10);
  const cfg: AutomatonConfig = { states, transitions: Array.isArray(config.transitions) ? config.transitions : [], start: String(config.start), accepting: (Array.isArray(config.accepting) ? config.accepting : []).map(String) };
  const tests: string[] = (Array.isArray(config.test) ? config.test : []).map(String).slice(0, 8);
  const [input, setInput] = useState(tests[0] ?? '');
  const [k, setK] = useState(0);
  const [ran, setRan] = useState(false);
  const { id: markerId, defs } = useMarker();
  const result = useMemo(() => runAutomaton(cfg, input), [cfg.start, input, JSON.stringify(cfg.transitions), JSON.stringify(cfg.accepting)]); // eslint-disable-line react-hooks/exhaustive-deps
  if (states.length === 0) return null;
  const W = 600, H = states.length > 5 ? 330 : 260, R = 24;
  const given = config.positions && typeof config.positions === 'object' ? (config.positions as Record<string, [number, number]>) : null;
  const pos = new Map<string, { x: number; y: number }>();
  if (given && states.every((s) => given[s])) {
    const xs = states.map((s) => given[s][0]);
    const ys = states.map((s) => given[s][1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    states.forEach((s) => pos.set(s, { x: 70 + (maxX === minX ? 0.5 : (given[s][0] - minX) / (maxX - minX)) * (W - 140), y: 80 + (maxY === minY ? 0.5 : (given[s][1] - minY) / (maxY - minY)) * (H - 150) }));
  } else if (states.length <= 4) {
    states.forEach((s, i) => pos.set(s, { x: 90 + (i * (W - 180)) / Math.max(states.length - 1, 1), y: H / 2 }));
  } else {
    states.forEach((s, i) => {
      const a = Math.PI - (i / states.length) * 2 * Math.PI;
      pos.set(s, { x: W / 2 + (W / 2 - 80) * Math.cos(a), y: H / 2 + (H / 2 - 60) * -Math.sin(a) });
    });
  }
  // Group transitions that join the same two states into one labelled arrow.
  const groups = new Map<string, { from: string; to: string; labels: string[] }>();
  for (const t of cfg.transitions) {
    const key = `${t.from}>${t.to}`;
    const g = groups.get(key) ?? { from: t.from, to: t.to, labels: [] };
    g.labels.push(...symbolsOf(t));
    groups.set(key, g);
  }
  const active = ran ? new Set(result.steps[Math.min(k, result.steps.length - 1)].active) : new Set<string>();
  const step = result.steps[Math.min(k, result.steps.length - 1)];
  const last = k >= result.steps.length - 1;
  const run = (text: string) => {
    setInput(text);
    setK(0);
    setRan(true);
    onUse?.();
  };
  return (
    <div>
      <Svg w={W} h={H}>
        {defs}
        {(() => {
          const sp = pos.get(cfg.start);
          return sp ? (
            <g>
              <line x1={sp.x - R - 34} y1={sp.y} x2={sp.x - R - 3} y2={sp.y} stroke={C.muted} strokeWidth={2} markerEnd={`url(#${markerId})`} />
              <text x={sp.x - R - 36} y={sp.y - 7} textAnchor="end" fontSize={10.5} fill={C.muted}>start</text>
            </g>
          ) : null;
        })()}
        {[...groups.values()].map((g, n) => {
          const a = pos.get(g.from), b = pos.get(g.to);
          if (!a || !b) return null;
          const label = [...new Set(g.labels)].join(',');
          if (g.from === g.to) {
            return (
              <g key={n}>
                <path d={`M ${a.x - 12} ${a.y - R + 2} C ${a.x - 34} ${a.y - R - 44}, ${a.x + 34} ${a.y - R - 44}, ${a.x + 12} ${a.y - R + 2}`} fill="none" stroke={C.muted} strokeWidth={2} markerEnd={`url(#${markerId})`} />
                <text x={a.x} y={a.y - R - 36} textAnchor="middle" fontSize={12} fontWeight={700}>{label}</text>
              </g>
            );
          }
          const back = groups.has(`${g.to}>${g.from}`);
          const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
          const bow = back ? 26 : 0;
          const cx = (a.x + b.x) / 2 + (-dy / len) * bow, cy = (a.y + b.y) / 2 + (dx / len) * bow;
          const ux = (cx - a.x) / (Math.hypot(cx - a.x, cy - a.y) || 1), uy = (cy - a.y) / (Math.hypot(cx - a.x, cy - a.y) || 1);
          const vx = (cx - b.x) / (Math.hypot(cx - b.x, cy - b.y) || 1), vy = (cy - b.y) / (Math.hypot(cx - b.x, cy - b.y) || 1);
          const sx = a.x + ux * R, sy = a.y + uy * R, ex = b.x + vx * (R + 3), ey = b.y + vy * (R + 3);
          const mx = 0.25 * sx + 0.5 * cx + 0.25 * ex, my = 0.25 * sy + 0.5 * cy + 0.25 * ey;
          return (
            <g key={n}>
              <path d={`M ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`} fill="none" stroke={C.muted} strokeWidth={2} markerEnd={`url(#${markerId})`} />
              <rect x={mx - label.length * 3.6 - 5} y={my - 10} width={label.length * 7.2 + 10} height={19} rx={5} fill={C.bg} stroke={C.border} />
              <text x={mx} y={my + 4} textAnchor="middle" fontSize={12} fontWeight={700}>{label}</text>
            </g>
          );
        })}
        {states.map((s) => {
          const p = pos.get(s)!;
          const on = active.has(s);
          const acc = cfg.accepting.includes(s);
          return (
            <g key={s}>
              <circle cx={p.x} cy={p.y} r={R} fill={on ? C.warn : C.surface} fillOpacity={on ? 0.9 : 1} stroke={on ? C.warn : C.accent} strokeWidth={on ? 4 : 2.2} />
              {acc && <circle cx={p.x} cy={p.y} r={R - 5} fill="none" stroke={on ? C.warn : C.accent} strokeWidth={2} />}
              <text x={p.x} y={p.y + 5} textAnchor="middle" fontSize={13} fontWeight={800} fill={on ? '#0f172a' : C.text}>{s}</text>
            </g>
          );
        })}
      </Svg>
      <p className="lv-label">{isDeterministic(cfg) ? `Deterministic${isComplete(cfg) ? ' and complete' : ' (some symbols have no transition: the machine gets stuck)'}` : 'Nondeterministic (a state has two transitions on one symbol)'} · alphabet {'{'}{alphabetOf(cfg).join(', ')}{'}'} · double circle = accepting state.</p>
      <div className="lv-controls">
        <label className="lv-label" htmlFor="automaton-input">Input string</label>
        <input id="automaton-input" className="lv-select" style={{ width: '9rem', fontFamily: MONO }} value={input} maxLength={20} onChange={(e) => { setInput(e.target.value); setRan(false); setK(0); }} placeholder="(empty)" />
        <button type="button" className="lv-btn lv-btn-primary" onClick={() => run(input)}>Run</button>
        <button type="button" className="lv-btn" onClick={() => { setRan(true); setK(Math.min(k + 1, result.steps.length - 1)); onUse?.(); }} disabled={ran && last}>Step ▶</button>
        {tests.map((t) => <button key={t} type="button" className="lv-btn" onClick={() => run(t)}>{t === '' ? '“”' : t}</button>)}
      </div>
      {ran && (
        <p className="lv-note" aria-live="polite">
          {step.note} {last && <strong style={{ color: result.accepted ? C.good : C.bad }}>{result.accepted ? `✓ "${input}" is accepted.` : `✗ "${input}" is rejected.`}</strong>}
        </p>
      )}
    </div>
  );
}

// ─── Open an online tool ────────────────────────────────────────────────────

export function ToolLaunch({ config }: VisualProps) {
  const url = typeof config.url === 'string' && /^https:\/\//i.test(config.url) ? config.url : null;
  const steps: string[] = (Array.isArray(config.steps) ? config.steps : []).map(String).slice(0, 10);
  if (!url) return <p className="lesson-visual-missing">This tool link is not available.</p>;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
      <div style={{ flex: '1 1 260px', minWidth: 0 }}>
        <p style={{ margin: 0, fontWeight: 800, fontSize: 16 }}>{String(config.tool)}</p>
        {typeof config.description === 'string' && <p className="lv-note" style={{ marginTop: 4 }}>{config.description}</p>}
        <p style={{ margin: '10px 0 0' }}>
          <a className="lv-btn lv-btn-primary" style={{ display: 'inline-block', textDecoration: 'none' }} href={url} target="_blank" rel="noopener noreferrer">Open {String(config.tool)} ↗</a>
        </p>
        <p className="lv-sim">Opens in a new browser tab. It is a free tool that runs in your browser: nothing to install.</p>
      </div>
      {steps.length > 0 && (
        <ol style={{ flex: '1 1 260px', minWidth: 0, margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 1.55 }}>
          {steps.map((s, i) => <li key={i} style={{ marginBottom: 4 }}>{s}</li>)}
        </ol>
      )}
    </div>
  );
}

registerVisuals({
  // A diagram can be stepped through, so it is a group (its buttons stay reachable), not one flat picture.
  'block-diagram': { Component: BlockDiagram, interactive: false, role: 'group' },
  gantt: { Component: GanttVisual, interactive: false },
  venn: { Component: VennVisual, interactive: true, role: 'group' },
  automaton: { Component: AutomatonVisual, interactive: true, role: 'group' },
  'tool-launch': { Component: ToolLaunch, interactive: false, role: 'group' },
});
