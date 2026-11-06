'use client';

// FILE PATH: client/components/lesson/visuals/data.tsx
//
// Data visuals: tables (and before/after cleaning comparisons), charts drawn from
// the numbers in the config, an image as the array of numbers a computer sees, and
// the train/test split.

import { useState, type KeyboardEvent } from 'react';
import { C, Svg, niceScale, toneColor } from './svg';
import { registerVisuals, type VisualProps } from './registry';

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const fmt = (n: number) => (Math.abs(n) >= 1000 ? n.toLocaleString('en-US', { maximumFractionDigits: 0 }) : String(Math.round(n * 100) / 100));

// ─── Tables ─────────────────────────────────────────────────────────────────

interface TableSpec {
  title?: string;
  columns: string[];
  rows: unknown[][];
  highlights?: { row: number; col: number; tone?: string; note?: string }[];
}

function TableView({ t }: { t: TableSpec }) {
  const cols = (t.columns ?? []).slice(0, 10).map(String);
  const rows = (t.rows ?? []).slice(0, 14);
  const hl = new Map((t.highlights ?? []).map((h) => [`${h.row}:${h.col}`, h]));
  return (
    <div style={{ overflowX: 'auto' }}>
      {t.title && <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{t.title}</div>}
      <table style={{ borderCollapse: 'collapse', fontSize: 13, minWidth: '100%', width: 'max-content' }}>
        <thead>
          <tr>
            {cols.map((c, i) => (
              <th key={i} scope="col" style={{ textAlign: 'left', padding: '6px 10px', background: C.surface2, border: `1px solid ${C.border}`, whiteSpace: 'nowrap' }}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri}>
              {cols.map((_, ci) => {
                const h = hl.get(`${ri}:${ci}`);
                const v = r?.[ci];
                const empty = v === null || v === undefined || v === '';
                return (
                  <td key={ci} title={h?.note} style={{ padding: '6px 10px', border: `1px solid ${C.border}`, background: h ? `color-mix(in srgb, ${toneColor(h.tone ?? 'warn')} 22%, transparent)` : undefined, color: empty ? C.muted : undefined, fontStyle: empty ? 'italic' : undefined }}>
                    {empty ? '(empty)' : String(v)}
                    {h?.note && <span className="sr-only"> — {h.note}</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DataTable({ config }: VisualProps) {
  return (
    <div>
      <TableView t={config as TableSpec} />
      {config.note && <p className="lv-note">{String(config.note)}</p>}
    </div>
  );
}

export function CompareTables({ config }: VisualProps) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center' }}>
      <div style={{ flex: '1 1 260px', minWidth: 0 }}>
        <TableView t={config.before as TableSpec} />
      </div>
      <div aria-hidden="true" style={{ textAlign: 'center', color: C.accent, fontWeight: 700, fontSize: 13 }}>
        <div style={{ fontSize: 26 }}>➜</div>
        {config.arrowLabel && <div style={{ color: C.muted, fontWeight: 600 }}>{String(config.arrowLabel)}</div>}
      </div>
      <div style={{ flex: '1 1 260px', minWidth: 0 }}>
        <TableView t={config.after as TableSpec} />
      </div>
    </div>
  );
}

// ─── Charts ─────────────────────────────────────────────────────────────────

interface Series { name?: string; values?: number[]; points?: { x: number; y: number }[] }
const SERIES_COLORS = [C.accent, C.accent2, C.good, C.warn];

export function ChartVisual({ config }: VisualProps) {
  const kind: 'bar' | 'line' | 'scatter' | 'histogram' = ['bar', 'line', 'scatter', 'histogram'].includes(config.kind) ? config.kind : 'bar';
  const series: Series[] = (Array.isArray(config.series) ? config.series : []).slice(0, 4);
  const W = 620, H = 330;
  const M = { l: 58, r: 18, t: 22, b: 58 };
  const iw = W - M.l - M.r;
  const ih = H - M.t - M.b;
  if (series.length === 0) return null;

  // Domains
  let xs: number[] = [];
  let ys: number[] = [];
  let cats: string[] = [];
  let bins: { lo: number; hi: number; n: number }[] = [];
  if (kind === 'scatter') {
    series.forEach((s) => (s.points ?? []).forEach((p) => (xs.push(Number(p.x)), ys.push(Number(p.y)))));
  } else if (kind === 'histogram') {
    const v = (series[0].values ?? []).map(Number).filter((n) => Number.isFinite(n));
    const nb = clamp(Number(config.bins) || 8, 3, 20);
    const lo = Math.min(...v), hi = Math.max(...v);
    const w = (hi - lo) / nb || 1;
    bins = Array.from({ length: nb }, (_, i) => ({ lo: lo + i * w, hi: lo + (i + 1) * w, n: 0 }));
    v.forEach((x) => bins[clamp(Math.floor((x - lo) / w), 0, nb - 1)].n++);
    ys = bins.map((b) => b.n);
  } else {
    cats = (Array.isArray(config.categories) ? config.categories : (series[0].values ?? []).map((_, i) => String(i + 1))).slice(0, 16).map(String);
    series.forEach((s) => (s.values ?? []).slice(0, cats.length).forEach((v) => ys.push(Number(v))));
  }
  ys = ys.filter((n) => Number.isFinite(n));
  xs = xs.filter((n) => Number.isFinite(n));
  if (ys.length === 0) return null;
  const yMaxN = niceScale(Math.max(...ys, 0));
  const yMinRaw = Math.min(...ys, 0);
  const yLo = yMinRaw < 0 ? -Math.ceil(-yMinRaw / yMaxN.step) * yMaxN.step : kind === 'scatter' ? 0 : 0;
  const yHi = yMaxN.max;
  let xLo = 0, xHi = 1;
  if (kind === 'scatter' && xs.length) {
    const n = niceScale(Math.max(...xs));
    xLo = Math.min(0, Math.floor(Math.min(...xs) / n.step) * n.step);
    xHi = n.max;
  }
  const sy = (v: number) => M.t + ih - ((v - yLo) / (yHi - yLo || 1)) * ih;
  const sx = (v: number) => M.l + ((v - xLo) / (xHi - xLo || 1)) * iw;
  const yTicks: number[] = [];
  for (let t = yLo; t <= yHi + 1e-9; t += yMaxN.step) yTicks.push(t);
  const xTicks: number[] = [];
  if (kind === 'scatter') {
    const n = niceScale(xHi, 5);
    for (let t = xLo; t <= xHi + 1e-9; t += n.step) xTicks.push(t);
  }

  // Least-squares fit (scatter)
  let fit: { m: number; b: number; r: number } | null = null;
  if (kind === 'scatter' && config.fitLine) {
    const pts = (series[0].points ?? []).map((p) => [Number(p.x), Number(p.y)]).filter((p) => p.every(Number.isFinite));
    const n = pts.length;
    if (n >= 2) {
      const mx = pts.reduce((s, p) => s + p[0], 0) / n;
      const my = pts.reduce((s, p) => s + p[1], 0) / n;
      const sxy = pts.reduce((s, p) => s + (p[0] - mx) * (p[1] - my), 0);
      const sxx = pts.reduce((s, p) => s + (p[0] - mx) ** 2, 0);
      const syy = pts.reduce((s, p) => s + (p[1] - my) ** 2, 0);
      if (sxx > 0) fit = { m: sxy / sxx, b: my - (sxy / sxx) * mx, r: syy > 0 ? sxy / Math.sqrt(sxx * syy) : 0 };
    }
  }

  const group = iw / Math.max(cats.length, 1);
  return (
    <div>
      <Svg w={W} h={H}>
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={M.l} x2={W - M.r} y1={sy(t)} y2={sy(t)} stroke={C.border} strokeWidth={t === 0 ? 1.8 : 1} opacity={t === 0 ? 1 : 0.6} />
            <text x={M.l - 8} y={sy(t) + 4} textAnchor="end" fontSize={11} fill={C.muted}>{fmt(t)}</text>
          </g>
        ))}
        {xTicks.map((t) => (
          <text key={t} x={sx(t)} y={H - M.b + 18} textAnchor="middle" fontSize={11} fill={C.muted}>{fmt(t)}</text>
        ))}
        {kind === 'bar' &&
          series.map((s, si) =>
            (s.values ?? []).slice(0, cats.length).map((v, i) => {
              const bw = (group * 0.72) / series.length;
              const x = M.l + i * group + group * 0.14 + si * bw;
              const y0 = sy(Math.max(0, v));
              return <rect key={`${si}-${i}`} x={x} y={y0} width={bw - 2} height={Math.abs(sy(v) - sy(0))} rx={3} fill={SERIES_COLORS[si]} />;
            }),
          )}
        {kind === 'line' &&
          series.map((s, si) => {
            const pts = (s.values ?? []).slice(0, cats.length).map((v, i) => [M.l + i * group + group / 2, sy(Number(v))]);
            return (
              <g key={si}>
                <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={SERIES_COLORS[si]} strokeWidth={3} strokeLinejoin="round" />
                {pts.map((p, i) => (
                  <circle key={i} cx={p[0]} cy={p[1]} r={4.5} fill={C.bg} stroke={SERIES_COLORS[si]} strokeWidth={2.5} />
                ))}
              </g>
            );
          })}
        {kind === 'histogram' &&
          bins.map((b, i) => (
            <g key={i}>
              <rect x={M.l + (i * iw) / bins.length + 1} y={sy(b.n)} width={iw / bins.length - 2} height={sy(0) - sy(b.n)} fill={C.accent} opacity={0.9} rx={2} />
              <text x={M.l + (i * iw) / bins.length} y={H - M.b + 18} textAnchor="middle" fontSize={10.5} fill={C.muted}>{fmt(b.lo)}</text>
            </g>
          ))}
        {kind === 'scatter' && (
          <>
            {series.map((s, si) =>
              (s.points ?? []).map((p, i) => <circle key={`${si}-${i}`} cx={sx(Number(p.x))} cy={sy(Number(p.y))} r={5} fill={SERIES_COLORS[si]} opacity={0.8} />),
            )}
            {fit && <line x1={sx(xLo)} y1={sy(fit.m * xLo + fit.b)} x2={sx(xHi)} y2={sy(fit.m * xHi + fit.b)} stroke={C.bad} strokeWidth={3} strokeDasharray="7 4" />}
          </>
        )}
        {(kind === 'bar' || kind === 'line') &&
          cats.map((c, i) => (
            <text key={i} x={M.l + i * group + group / 2} y={H - M.b + 18} textAnchor="middle" fontSize={11} fill={C.muted}>{c.length > 12 ? c.slice(0, 11) + '…' : c}</text>
          ))}
        <line x1={M.l} x2={M.l} y1={M.t} y2={M.t + ih} stroke={C.text} strokeWidth={1.4} />
        {config.xLabel && <text x={M.l + iw / 2} y={H - 10} textAnchor="middle" fontSize={12} fontWeight={600}>{String(config.xLabel)}</text>}
        {config.yLabel && <text transform={`translate(14 ${M.t + ih / 2}) rotate(-90)`} textAnchor="middle" fontSize={12} fontWeight={600}>{String(config.yLabel)}</text>}
      </Svg>
      {(series.length > 1 || fit) && (
        <div className="lv-controls" aria-hidden="true">
          {series.length > 1 && series.map((s, i) => <span key={i} className="lv-label"><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: SERIES_COLORS[i], marginRight: 5, verticalAlign: -1 }} />{s.name ?? `Series ${i + 1}`}</span>)}
          {fit && <span className="lv-label"><span style={{ color: C.bad, fontWeight: 700 }}>- - -</span> best-fit line: y ≈ {fmt(fit.m)}·x {fit.b < 0 ? '−' : '+'} {fmt(Math.abs(fit.b))} · correlation r = {fmt(fit.r)}</span>}
        </div>
      )}
    </div>
  );
}

// ─── Pixel grid: an image as numbers ────────────────────────────────────────

export function PixelGrid({ config, onUse }: VisualProps) {
  const rows = clamp(Number(config.rows) || 0, 1, 16);
  const cols = clamp(Number(config.cols) || 0, 1, 16);
  const rgb = config.mode === 'rgb';
  const values = config.values as (number | number[])[][] | undefined;
  const [showNums, setShowNums] = useState(true);
  const [channel, setChannel] = useState<'all' | 'r' | 'g' | 'b'>('all');
  const hl: number[] | undefined = Array.isArray(config.highlight) ? config.highlight : undefined;
  const [sel, setSel] = useState<[number, number]>([clamp(hl?.[0] ?? 0, 0, rows - 1), clamp(hl?.[1] ?? 0, 0, cols - 1)]);
  if (!values || !Array.isArray(values)) return null;

  const px = (r: number, c: number): number[] => {
    const v = values?.[r]?.[c];
    return rgb ? [0, 1, 2].map((k) => clamp(Number(Array.isArray(v) ? v[k] : 0) || 0, 0, 255)) : [clamp(Number(v) || 0, 0, 255)];
  };
  const shown = (r: number, c: number): [number, number, number] => {
    const p = px(r, c);
    if (!rgb) return [p[0], p[0], p[0]];
    if (channel === 'all') return [p[0], p[1], p[2]];
    const k = channel === 'r' ? 0 : channel === 'g' ? 1 : 2;
    return [p[k], p[k], p[k]];
  };
  const cell = clamp(Math.floor(540 / cols), 26, 54);
  const selPx = px(sel[0], sel[1]);
  const gray = Math.round(0.299 * selPx[0] + 0.587 * (rgb ? selPx[1] : selPx[0]) + 0.114 * (rgb ? selPx[2] : selPx[0]));
  const move = (e: KeyboardEvent) => {
    const d: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    if (!d[e.key]) return;
    e.preventDefault();
    setSel(([r, c]) => [clamp(r + d[e.key][0], 0, rows - 1), clamp(c + d[e.key][1], 0, cols - 1)]);
    onUse?.();
  };

  return (
    <div>
      <div className="lv-controls" style={{ marginTop: 0, marginBottom: 10 }}>
        <button type="button" className="lv-btn" aria-pressed={showNums} onClick={() => { setShowNums((s) => !s); onUse?.(); }}>Show numbers</button>
        {rgb && (['all', 'r', 'g', 'b'] as const).map((ch) => (
          <button key={ch} type="button" className="lv-btn" aria-pressed={channel === ch} onClick={() => { setChannel(ch); onUse?.(); }}>{ch === 'all' ? 'Colour' : ch.toUpperCase() + ' channel'}</button>
        ))}
        <span className="lv-label">image.shape = ({rows}, {cols}{rgb ? ', 3' : ''})</span>
      </div>
      <div tabIndex={0} onKeyDown={move} role="application" aria-label="Pixel grid. Use the arrow keys to move between pixels." style={{ display: 'inline-grid', gridTemplateColumns: `repeat(${cols}, ${cell}px)`, gap: 2, padding: 4, outline: 'none' }} className="lv-pixelgrid">
        {Array.from({ length: rows * cols }, (_, i) => {
          const r = Math.floor(i / cols), c = i % cols;
          const [R, G, B] = shown(r, c);
          const isSel = sel[0] === r && sel[1] === c;
          const lum = 0.299 * R + 0.587 * G + 0.114 * B;
          return (
            <div
              key={i}
              onClick={() => { setSel([r, c]); onUse?.(); }}
              style={{ width: cell, height: cell, background: `rgb(${R},${G},${B})`, color: lum > 140 ? '#111' : '#fff', display: 'grid', placeItems: 'center', fontSize: cell > 36 ? 12 : 10, fontFamily: 'ui-monospace, monospace', cursor: 'pointer', outline: isSel ? `3px solid ${C.warn}` : 'none', outlineOffset: -2, borderRadius: 3 }}
            >
              {showNums ? (rgb && channel === 'all' ? '' : px(r, c)[rgb && channel !== 'all' ? (channel === 'r' ? 0 : channel === 'g' ? 1 : 2) : 0]) : ''}
            </div>
          );
        })}
      </div>
      <p className="lv-note" aria-live="polite">
        Pixel at row {sel[0]}, column {sel[1]}: <strong>{rgb ? `(R ${selPx[0]}, G ${selPx[1]}, B ${selPx[2]})` : selPx[0]}</strong>
        {rgb ? ` → as grayscale ≈ ${gray}` : selPx[0] === 0 ? ' — pure black' : selPx[0] === 255 ? ' — pure white' : ''}. {rgb ? 'Each pixel is three numbers.' : '0 is black and 255 is white.'}
      </p>
    </div>
  );
}

// ─── Train / test split ─────────────────────────────────────────────────────

function seeded(n: number): number[] {
  // A fixed, repeatable "random" order so the picture never changes between renders.
  const order = Array.from({ length: n }, (_, i) => i);
  let s = 1234567;
  for (let i = n - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

export function TrainTestSplit({ config, onUse }: VisualProps) {
  const total = clamp(Number(config.total) || 100, 20, 200);
  const [pct, setPct] = useState(80);
  const nTrain = Math.round((total * pct) / 100);
  const nTest = total - nTrain;
  const order = seeded(total);
  const isTest = new Set(order.slice(0, nTest));
  const cols = total <= 100 ? 10 : 20;
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 4, maxWidth: 420 }} aria-hidden="true">
        {Array.from({ length: total }, (_, i) => (
          <div key={i} style={{ aspectRatio: '1', borderRadius: 4, background: isTest.has(i) ? C.warn : C.accent2, opacity: 0.92 }} />
        ))}
      </div>
      <div className="lv-controls">
        <label className="lv-label" htmlFor="tts-range">Share used for training: <strong>{pct}%</strong></label>
        <input id="tts-range" className="lv-range" type="range" min={50} max={90} step={5} value={pct} onChange={(e) => { setPct(Number(e.target.value)); onUse?.(); }} />
      </div>
      <p className="lv-note" aria-live="polite">
        <span style={{ color: C.accent2, fontWeight: 700 }}>■ Training: {nTrain} rows</span> — the model learns from these. <span style={{ color: C.warn, fontWeight: 700 }}>■ Test: {nTest} rows</span> — kept hidden until the end, to check the model on data it has never seen.
      </p>
      <pre className="lv-note" style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12.5, overflowX: 'auto', background: C.surface, padding: 8, borderRadius: 8 }}>
        {`X_train, X_test, y_train, y_test = train_test_split(\n    X, y, test_size=${(nTest / total).toFixed(2)}, random_state=42\n)`}
      </pre>
      <p className="lv-sim">If the test rows leaked into training, the score would look better than the model really is.</p>
    </div>
  );
}

registerVisuals({
  table: { Component: DataTable, interactive: false, role: 'group' },
  'compare-tables': { Component: CompareTables, interactive: false, role: 'group' },
  chart: { Component: ChartVisual, interactive: false },
  'pixel-grid': { Component: PixelGrid, interactive: true },
  'train-test': { Component: TrainTestSplit, interactive: true },
});
