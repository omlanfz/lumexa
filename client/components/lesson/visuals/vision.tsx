'use client';

// FILE PATH: client/components/lesson/visuals/vision.tsx
//
// Computer-vision visuals — the Face Detection set:
//
//   haar            Haar-like features over an illustrated (synthetic) face
//   cascade         a cascade of classifiers rejecting most windows early
//   bbox            a labelled (x, y, width, height) bounding box
//   colorspace      the same synthetic picture in colour, one channel, and grayscale
//   detection-lab   scaleFactor / minNeighbors on prepared, synthetic detections
//
// HONESTY RULE: every face here is a DRAWING, and every detection result is a
// prepared sample — never the output of a live OpenCV run. Each block that shows
// detections says so on screen. Where numbers appear (feature values, grayscale
// conversions, window counts) they are computed from the drawn data, not invented.

import { useId, useState } from 'react';
import { C, useSafeId } from './svg';
import { registerVisuals, type VisualProps } from './registry';

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const r2 = (n: number) => Math.round(n * 100) / 100;

const SIM_NOTE = 'Simulated example — a drawing with prepared sample results. It is not a live OpenCV run and not a photo of a real person.';

// ─── An illustrated face (colour) ───────────────────────────────────────────

/** A cartoon face centred at (cx, cy); `r` is roughly half its height. */
function Face({ cx, cy, r, skin = '#f2c9a0', hair = '#3b2417' }: { cx: number; cy: number; r: number; skin?: string; hair?: string }) {
  return (
    <g transform={`translate(${cx} ${cy}) scale(${r / 50})`}>
      <ellipse cx="-41" cy="2" rx="6" ry="10" fill={skin} />
      <ellipse cx="41" cy="2" rx="6" ry="10" fill={skin} />
      <ellipse cx="0" cy="0" rx="40" ry="48" fill={skin} />
      <path d="M -41 -8 C -46 -58 46 -58 41 -8 C 32 -30 -32 -30 -41 -8 Z" fill={hair} />
      <path d="M -26 -17 Q -16 -23 -7 -17" stroke={hair} strokeWidth="3.2" fill="none" strokeLinecap="round" />
      <path d="M 7 -17 Q 16 -23 26 -17" stroke={hair} strokeWidth="3.2" fill="none" strokeLinecap="round" />
      <ellipse cx="-16" cy="-6" rx="8" ry="5.5" fill="#ffffff" />
      <ellipse cx="16" cy="-6" rx="8" ry="5.5" fill="#ffffff" />
      <circle cx="-16" cy="-6" r="3.3" fill="#1f2937" />
      <circle cx="16" cy="-6" r="3.3" fill="#1f2937" />
      <path d="M 0 -2 L -4.5 15 Q 0 18 4.5 15" stroke="rgba(0,0,0,.35)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M -14 28 Q 0 38 14 28" stroke="#9f1239" strokeWidth="3.2" fill="none" strokeLinecap="round" />
    </g>
  );
}

// ─── The grayscale face the Haar demo measures ──────────────────────────────
// One list of shapes drives BOTH what is drawn and the 24×24 pixel values the
// feature arithmetic uses, so the picture and the numbers always agree.

type Part =
  | { k: 'rect'; x: number; y: number; w: number; h: number; v: number }
  | { k: 'ellipse'; cx: number; cy: number; rx: number; ry: number; v: number };

const BACKGROUND = 0.58;
const PARTS: Part[] = [
  { k: 'ellipse', cx: 0.5, cy: 0.54, rx: 0.36, ry: 0.44, v: 0.8 }, // head (skin)
  { k: 'ellipse', cx: 0.5, cy: 0.22, rx: 0.37, ry: 0.15, v: 0.2 }, // hair
  { k: 'rect', x: 0.2, y: 0.31, w: 0.2, h: 0.04, v: 0.3 }, // left eyebrow
  { k: 'rect', x: 0.6, y: 0.31, w: 0.2, h: 0.04, v: 0.3 }, // right eyebrow
  { k: 'ellipse', cx: 0.31, cy: 0.42, rx: 0.1, ry: 0.055, v: 0.22 }, // left eye
  { k: 'ellipse', cx: 0.69, cy: 0.42, rx: 0.1, ry: 0.055, v: 0.22 }, // right eye
  { k: 'rect', x: 0.455, y: 0.38, w: 0.09, h: 0.25, v: 0.94 }, // bright nose bridge
  { k: 'rect', x: 0.41, y: 0.62, w: 0.18, h: 0.035, v: 0.52 }, // shadow under the nose
  { k: 'ellipse', cx: 0.5, cy: 0.76, rx: 0.15, ry: 0.035, v: 0.3 }, // mouth
];

const inPart = (p: Part, x: number, y: number) =>
  p.k === 'rect' ? x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h : ((x - p.cx) / p.rx) ** 2 + ((y - p.cy) / p.ry) ** 2 <= 1;

const N = 24; // the classic Viola–Jones base window is 24 × 24 pixels
let patchCache: number[][] | null = null;
function patch(): number[][] {
  if (patchCache) return patchCache;
  const grid: number[][] = [];
  for (let row = 0; row < N; row++) {
    const line: number[] = [];
    for (let col = 0; col < N; col++) {
      const x = (col + 0.5) / N;
      const y = (row + 0.5) / N;
      let v = BACKGROUND;
      for (let i = PARTS.length - 1; i >= 0; i--) {
        if (inPart(PARTS[i], x, y)) {
          v = PARTS[i].v;
          break;
        }
      }
      line.push(v);
    }
    grid.push(line);
  }
  patchCache = grid;
  return grid;
}

interface FRect { x: number; y: number; w: number; h: number; sign: 1 | -1 }
interface Feature { name: string; blurb: string; w: number; h: number; rects: FRect[] }

const FEATURES: Record<string, Feature> = {
  edge: {
    name: 'Edge feature',
    blurb: 'Two rectangles: dark on top, light below. On a face, the eye band is darker than the cheeks beneath it.',
    w: 16, h: 8,
    rects: [{ x: 0, y: 0, w: 16, h: 4, sign: -1 }, { x: 0, y: 4, w: 16, h: 4, sign: 1 }],
  },
  line: {
    name: 'Line feature',
    blurb: 'Three rectangles: dark, light, dark. On a face, the bridge of the nose is brighter than the eyes on either side.',
    w: 15, h: 5,
    rects: [{ x: 0, y: 0, w: 5, h: 5, sign: -1 }, { x: 5, y: 0, w: 5, h: 5, sign: 1 }, { x: 10, y: 0, w: 5, h: 5, sign: -1 }],
  },
  diagonal: {
    name: 'Four-rectangle feature',
    blurb: 'A checkerboard of four rectangles. A face is mostly left–right symmetric, so this one barely reacts — not every feature is useful.',
    w: 12, h: 12,
    rects: [{ x: 0, y: 0, w: 6, h: 6, sign: 1 }, { x: 6, y: 0, w: 6, h: 6, sign: -1 }, { x: 0, y: 6, w: 6, h: 6, sign: -1 }, { x: 6, y: 6, w: 6, h: 6, sign: 1 }],
  },
};

/** White-minus-black average brightness of a feature placed at (ox, oy). */
function featureValue(f: Feature, ox: number, oy: number): { value: number; white: number; black: number } {
  const g = patch();
  let wSum = 0, wN = 0, bSum = 0, bN = 0;
  for (const rect of f.rects) {
    for (let y = oy + rect.y; y < oy + rect.y + rect.h; y++) {
      for (let x = ox + rect.x; x < ox + rect.x + rect.w; x++) {
        const v = g[y]?.[x] ?? 0;
        if (rect.sign === 1) { wSum += v; wN++; } else { bSum += v; bN++; }
      }
    }
  }
  const white = wN ? wSum / wN : 0;
  const black = bN ? bSum / bN : 0;
  return { value: white - black, white, black };
}

function bestPlacement(f: Feature): { x: number; y: number; value: number } {
  let best = { x: 0, y: 0, value: -Infinity };
  for (let y = 0; y <= N - f.h; y++) {
    for (let x = 0; x <= N - f.w; x++) {
      const { value } = featureValue(f, x, y);
      if (value > best.value) best = { x, y, value };
    }
  }
  return best;
}

const gray = (v: number) => {
  const n = Math.round(clamp(v, 0, 1) * 255);
  return `rgb(${n},${n},${n})`;
};

export function HaarFeatures({ config, onUse }: VisualProps) {
  const keys = (Array.isArray(config.features) ? config.features.filter((k: unknown) => typeof k === 'string' && k in FEATURES) : Object.keys(FEATURES)) as string[];
  const available = keys.length ? keys : Object.keys(FEATURES);
  const [key, setKey] = useState(available[0]);
  const f = FEATURES[key];
  const best = bestPlacement(f);
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: best.x + 2, y: best.y - 3 });
  const x = clamp(pos.x, 0, N - f.w);
  const y = clamp(pos.y, 0, N - f.h);
  const { value, white, black } = featureValue(f, x, y);
  const strength = best.value > 0 ? value / best.value : 0;
  const verdict = value < -0.05 ? 'Reversed — light and dark are the wrong way round here' : strength >= 0.85 ? 'Strong response — this feature "fires" here' : strength >= 0.4 ? 'Partial response' : 'Weak response — nothing for this feature to detect here';
  const S = 10; // viewBox units per pixel of the 24 × 24 window
  const idX = useId();
  const idY = useId();

  const choose = (k: string) => {
    setKey(k);
    const b = bestPlacement(FEATURES[k]);
    setPos({ x: b.x + 2, y: Math.max(0, b.y - 3) });
    onUse?.();
  };

  return (
    <div>
      <div className="lv-controls" role="group" aria-label="Choose a Haar-like feature" style={{ marginTop: 0, marginBottom: 10 }}>
        {available.map((k) => (
          <button key={k} type="button" className="lv-btn" aria-pressed={key === k} onClick={() => choose(k)}>{FEATURES[k].name}</button>
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 250px', maxWidth: 320, minWidth: 0 }}>
          <svg viewBox={`0 0 ${N * S} ${N * S}`} aria-hidden="true" focusable="false" style={{ width: '100%', height: 'auto', borderRadius: 10, border: `1px solid ${C.border}` }}>
            <rect width={N * S} height={N * S} fill={gray(BACKGROUND)} />
            {PARTS.map((p, i) =>
              p.k === 'rect' ? (
                <rect key={i} x={p.x * N * S} y={p.y * N * S} width={p.w * N * S} height={p.h * N * S} fill={gray(p.v)} />
              ) : (
                <ellipse key={i} cx={p.cx * N * S} cy={p.cy * N * S} rx={p.rx * N * S} ry={p.ry * N * S} fill={gray(p.v)} />
              ),
            )}
            {f.rects.map((rc, i) => (
              <rect
                key={i}
                x={(x + rc.x) * S}
                y={(y + rc.y) * S}
                width={rc.w * S}
                height={rc.h * S}
                fill={rc.sign === 1 ? 'rgba(255,255,255,.62)' : 'rgba(0,0,0,.55)'}
                stroke="#facc15"
                strokeWidth={1.6}
              />
            ))}
          </svg>
          <p className="lv-label" style={{ margin: '4px 0 0' }}>A drawn face, 24 × 24 pixels (the window size Haar cascades were trained on). White = added, black = subtracted.</p>
        </div>
        <div style={{ flex: '1 1 260px', minWidth: 0 }}>
          <p className="lv-note" style={{ marginTop: 0 }}>{f.blurb}</p>
          <div style={{ display: 'grid', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <label htmlFor={idX} className="lv-label" style={{ minWidth: 76 }}>Slide left–right</label>
              <input id={idX} className="lv-range" type="range" min={0} max={N - f.w} value={x} onChange={(e) => { setPos({ x: Number(e.target.value), y }); onUse?.(); }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <label htmlFor={idY} className="lv-label" style={{ minWidth: 76 }}>Slide up–down</label>
              <input id={idY} className="lv-range" type="range" min={0} max={N - f.h} value={y} onChange={(e) => { setPos({ x, y: Number(e.target.value) }); onUse?.(); }} />
            </div>
            <div className="lv-controls" style={{ marginTop: 0 }}>
              <button type="button" className="lv-btn" onClick={() => { setPos({ x: best.x, y: best.y }); onUse?.(); }}>Jump to the best position</button>
            </div>
          </div>
          <div style={{ marginTop: 10 }} aria-live="polite">
            <div style={{ display: 'flex', height: 14, borderRadius: 7, background: C.surface2, border: `1px solid ${C.border}`, overflow: 'hidden', position: 'relative' }} aria-hidden="true">
              <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: C.muted }} />
              <div style={{ position: 'absolute', top: 0, bottom: 0, left: value >= 0 ? '50%' : `${50 + clamp(value, -1, 0) * 50}%`, width: `${Math.abs(clamp(value, -1, 1)) * 50}%`, background: value >= 0 ? C.good : C.bad }} />
            </div>
            <p className="lv-note" style={{ marginTop: 6 }}>
              average brightness of the <strong>white</strong> part = {r2(white)} (≈ {Math.round(white * 255)} of 255)<br />
              average brightness of the <strong>black</strong> part = {r2(black)} (≈ {Math.round(black * 255)} of 255)<br />
              feature value = {r2(white)} − {r2(black)} = <strong>{r2(value)}</strong>
            </p>
            <p className="lv-note" style={{ marginTop: 4 }}><strong>{verdict}.</strong></p>
          </div>
        </div>
      </div>
      <p className="lv-sim">{SIM_NOTE} The feature values are really computed from the drawn pixels above.</p>
    </div>
  );
}

// ─── Cascade of classifiers ─────────────────────────────────────────────────

interface Stage { name?: string; passRate: number; detail?: string }

function shuffled(n: number, seed: number): number[] {
  const order = Array.from({ length: n }, (_, i) => i);
  let s = seed >>> 0;
  for (let i = n - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

export function CascadeVisual({ config, onUse }: VisualProps) {
  const windows = clamp(Math.round(Number(config.windows) || 10000), 100, 10_000_000);
  const stages: Stage[] = (Array.isArray(config.stages) ? config.stages : []).slice(0, 8).map((s: Stage) => ({ ...s, passRate: clamp(Number(s.passRate) || 0.5, 0.001, 1) }));
  const [at, setAt] = useState(0);
  if (stages.length === 0) return null;
  const DOTS = 100;
  const order = shuffled(DOTS, 20240611);
  const frac: number[] = [1];
  stages.forEach((s, i) => frac.push(frac[i] * s.passRate));
  const alive = new Set(order.slice(0, Math.max(2, Math.round(DOTS * frac[at]))));
  const remaining = (k: number) => Math.round(windows * frac[k]);
  // Checks actually performed: each stage only looks at the windows that survived the stage before.
  const cascadeChecks = stages.reduce((sum, _s, i) => sum + remaining(i), 0);
  const allChecks = windows * stages.length;
  const fmt = (n: number) => n.toLocaleString('en-US');
  const go = (n: number) => { setAt(clamp(n, 0, stages.length)); onUse?.(); };

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(20, 1fr)', gap: 4, maxWidth: 420 }} aria-hidden="true">
        {Array.from({ length: DOTS }, (_, i) => (
          <div key={i} style={{ aspectRatio: '1', borderRadius: '50%', background: alive.has(i) ? C.accent : C.border, opacity: alive.has(i) ? 1 : 0.45, transition: 'background .2s' }} />
        ))}
      </div>
      <p className="lv-label" style={{ margin: '4px 0 0' }}>Each dot stands for {fmt(Math.round(windows / DOTS))} of the {fmt(windows)} windows the detector slides over the picture.</p>
      <div style={{ marginTop: 10, display: 'grid', gap: 5 }}>
        {[{ name: 'All windows', detail: '' }, ...stages].map((s, k) => (
          <button
            key={k}
            type="button"
            onClick={() => go(k)}
            aria-pressed={at === k}
            style={{ display: 'grid', gridTemplateColumns: 'minmax(110px, 190px) 1fr auto', alignItems: 'center', gap: 10, textAlign: 'left', border: `1px solid ${at === k ? C.accent : C.border}`, background: at === k ? C.surface2 : C.surface, color: C.text, borderRadius: 8, padding: '5px 10px', cursor: 'pointer' }}
          >
            <span style={{ fontSize: 13, fontWeight: 600 }}>{k === 0 ? 'All windows' : (s.name ?? `Stage ${k}`)}</span>
            <span aria-hidden="true" style={{ height: 12, borderRadius: 6, background: C.border, overflow: 'hidden' }}>
              <span style={{ display: 'block', height: '100%', width: `${Math.max(frac[k] * 100, 0.8)}%`, background: C.accent, borderRadius: 6 }} />
            </span>
            <span style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{fmt(remaining(k))} left</span>
          </button>
        ))}
      </div>
      <div className="lv-controls">
        <button type="button" className="lv-btn" onClick={() => go(at - 1)} disabled={at === 0}>◀ Back</button>
        <button type="button" className="lv-btn lv-btn-primary" onClick={() => go(at + 1)} disabled={at >= stages.length}>Next stage ▶</button>
        <button type="button" className="lv-btn" onClick={() => go(0)}>Reset</button>
      </div>
      <p className="lv-note" aria-live="polite">
        {at === 0
          ? `Every one of the ${fmt(windows)} windows starts here.`
          : `${stages[at - 1].detail ? stages[at - 1].detail + ' ' : ''}After ${stages[at - 1].name ?? `stage ${at}`}, ${fmt(remaining(at))} windows are left — ${r2((1 - frac[at]) * 100)}% have been thrown away.`}
      </p>
      <p className="lv-note">
        Work saved: a cascade makes about <strong>{fmt(cascadeChecks)}</strong> stage-checks, while running every window through every stage would need <strong>{fmt(allChecks)}</strong> ({Math.round((allChecks / Math.max(cascadeChecks, 1)) * 10) / 10}× more).
      </p>
      <p className="lv-sim">Illustrative numbers chosen for this lesson — not measured from a real OpenCV run.</p>
    </div>
  );
}

// ─── Bounding box (x, y, width, height) ─────────────────────────────────────

export function BoundingBox({ config, onUse }: VisualProps) {
  const W = clamp(Math.round(Number(config.imageWidth) || 480), 120, 2000);
  const H = clamp(Math.round(Number(config.imageHeight) || 320), 120, 2000);
  const b = (config.box ?? {}) as Record<string, unknown>;
  const [x, setX] = useState(clamp(Math.round(Number(b.x) || 0), 0, W - 20));
  const [y, setY] = useState(clamp(Math.round(Number(b.y) || 0), 0, H - 20));
  const [w, setW] = useState(clamp(Math.round(Number(b.width) || 100), 20, W));
  const [h, setH] = useState(clamp(Math.round(Number(b.height) || 100), 20, H));
  const label = typeof config.label === 'string' && config.label ? config.label : 'face';
  const gradId = useSafeId();
  const ids = [useId(), useId(), useId(), useId()];
  // Keep the box inside the picture whichever slider moved.
  const cx = clamp(x, 0, W - w);
  const cy = clamp(y, 0, H - h);
  const fs = Math.max(11, W / 34); // annotation size, in picture pixels
  const sw = Math.max(1.5, W / 220);
  const faceR = Math.min(w / 1.7, h / 2) * 0.95;
  const touch = (fn: () => void) => { fn(); onUse?.(); };

  return (
    <div>
      <svg viewBox={`${-fs * 4.6} ${-fs * 2.2} ${W + fs * 6.4} ${H + fs * 4.6}`} aria-hidden="true" focusable="false" style={{ borderRadius: 10, ['--natural' as string]: `${Math.round(W + fs * 6.4)}px` }}>
        <defs>
          <linearGradient id={`bb-${gradId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#bfdbfe" />
            <stop offset="1" stopColor="#e0f2fe" />
          </linearGradient>
        </defs>
        <rect x={0} y={0} width={W} height={H} fill={`url(#bb-${gradId})`} />
        <rect x={0} y={H * 0.78} width={W} height={H * 0.22} fill="#a7c4a0" />
        <Face cx={cx + w / 2} cy={cy + h / 2} r={faceR} />
        <rect x={0} y={0} width={W} height={H} fill="none" stroke={C.text} strokeWidth={sw} />
        {/* guides back to the origin */}
        <line x1={0} y1={cy} x2={cx} y2={cy} stroke={C.accent} strokeWidth={sw} strokeDasharray={`${sw * 3} ${sw * 2}`} />
        <line x1={cx} y1={0} x2={cx} y2={cy} stroke={C.accent2} strokeWidth={sw} strokeDasharray={`${sw * 3} ${sw * 2}`} />
        <rect x={cx} y={cy} width={w} height={h} fill="rgba(34,197,94,.14)" stroke="#16a34a" strokeWidth={sw * 1.7} />
        <circle cx={cx} cy={cy} r={sw * 2.4} fill="#16a34a" />
        <circle cx={cx + w} cy={cy + h} r={sw * 2.4} fill="#16a34a" />
        <text x={cx} y={cy - fs * 0.4} fontSize={fs} fontWeight={700} fill="#166534" style={{ fill: '#166534' }}>{label}</text>
        <g fontSize={fs} fontWeight={700}>
          <text x={cx / 2} y={Math.max(fs, cy - sw * 3)} textAnchor="middle" style={{ fill: '#6d28d9' }}>x = {cx}</text>
          <text x={cx - sw * 3} y={Math.max(fs, cy / 2) + fs / 3} textAnchor="end" style={{ fill: '#1d4ed8' }}>y = {cy}</text>
          <text x={cx + w / 2} y={cy + h + fs * 1.15} textAnchor="middle" style={{ fill: '#166534' }}>width = {w}</text>
          <text x={cx + w + fs * 0.4} y={cy + h / 2} style={{ fill: '#166534' }}>height = {h}</text>
        </g>
        <g fontSize={fs * 0.9} style={{ fill: 'currentColor' }}>
          <text x={-fs * 0.5} y={-fs * 0.5} textAnchor="end" style={{ fill: C.text }}>(0, 0)</text>
          <text x={W} y={-fs * 0.5} textAnchor="end" style={{ fill: C.muted }}>x grows → {W - 1}</text>
          <text x={-fs * 0.5} y={H} textAnchor="end" style={{ fill: C.muted }}>y ↓ {H - 1}</text>
          <text x={cx + w + fs * 0.4} y={cy + h + fs * 1.15} style={{ fill: C.muted }}>({cx + w}, {cy + h})</text>
        </g>
      </svg>
      <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
        {([
          ['x', 'x (left edge)', cx, 0, W - w, (n: number) => setX(n)],
          ['y', 'y (top edge)', cy, 0, H - h, (n: number) => setY(n)],
          ['w', 'width', w, 20, W, (n: number) => setW(n)],
          ['h', 'height', h, 20, H, (n: number) => setH(n)],
        ] as [string, string, number, number, number, (n: number) => void][]).map(([k, name, val, lo, hi, set], i) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <label htmlFor={`bb-in-${ids[i]}`} className="lv-label" style={{ minWidth: 92 }}>{name}</label>
            <input id={`bb-in-${ids[i]}`} className="lv-range" type="range" min={lo} max={hi} value={val} onChange={(e) => touch(() => set(Number(e.target.value)))} />
            <span className="lv-label" style={{ minWidth: 36, textAlign: 'right' }}>{val}</span>
          </div>
        ))}
      </div>
      <pre style={{ margin: '10px 0 0', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 10px', fontSize: 12.5, overflowX: 'auto' }}>
        {`x, y, w, h = ${cx}, ${cy}, ${w}, ${h}\ncv2.rectangle(img, (x, y), (x + w, y + h), (0, 255, 0), 2)\n#                  top-left   (${cx}, ${cy})   bottom-right (${cx + w}, ${cy + h})`}
      </pre>
      <p className="lv-note">The origin (0, 0) is the <strong>top-left</strong> corner. x grows to the right and y grows <strong>downward</strong>. A detector reports each face as one (x, y, w, h).</p>
      <p className="lv-sim">{SIM_NOTE}</p>
    </div>
  );
}

// ─── Colour vs grayscale ────────────────────────────────────────────────────

interface Region { id: string; name: string; rgb: [number, number, number] }
const REGIONS: Region[] = [
  { id: 'sky', name: 'Sky', rgb: [135, 206, 235] },
  { id: 'sun', name: 'Sun', rgb: [255, 214, 10] },
  { id: 'wall', name: 'House wall', rgb: [205, 92, 92] },
  { id: 'roof', name: 'Roof', rgb: [120, 53, 15] },
  { id: 'door', name: 'Door', rgb: [70, 100, 160] },
  { id: 'grass', name: 'Grass', rgb: [60, 160, 70] },
  { id: 'skin', name: 'Skin', rgb: [235, 185, 145] },
  { id: 'hair', name: 'Hair', rgb: [60, 40, 30] },
];
const REGION = Object.fromEntries(REGIONS.map((r) => [r.id, r])) as Record<string, Region>;
const luma = ([r, g, b]: [number, number, number]) => Math.round(0.299 * r + 0.587 * g + 0.114 * b);

type Mode = 'color' | 'red' | 'green' | 'blue' | 'gray';
const MODES: { id: Mode; label: string }[] = [
  { id: 'color', label: 'Colour' },
  { id: 'red', label: 'Red channel' },
  { id: 'green', label: 'Green channel' },
  { id: 'blue', label: 'Blue channel' },
  { id: 'gray', label: 'Grayscale' },
];

export function ColorSpace({ onUse }: VisualProps) {
  const [mode, setMode] = useState<Mode>('color');
  const [sel, setSel] = useState('wall');
  const fillOf = (id: string): string => {
    const rgb = REGION[id].rgb;
    if (mode === 'color') return `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
    const v = mode === 'red' ? rgb[0] : mode === 'green' ? rgb[1] : mode === 'blue' ? rgb[2] : luma(rgb);
    return `rgb(${v},${v},${v})`;
  };
  const pick = (id: string) => { setSel(id); onUse?.(); };
  const s = REGION[sel];
  const [R, G, B] = s.rgb;
  const outline = (id: string) => (sel === id ? { stroke: '#facc15', strokeWidth: 4 } : { stroke: 'rgba(0,0,0,.18)', strokeWidth: 1 });
  const hit = (id: string) => ({ onClick: () => pick(id), style: { cursor: 'pointer' } as const });

  return (
    <div>
      <div className="lv-controls" role="group" aria-label="Choose how to view the picture" style={{ marginTop: 0, marginBottom: 10 }}>
        {MODES.map((m) => (
          <button key={m.id} type="button" className="lv-btn" aria-pressed={mode === m.id} onClick={() => { setMode(m.id); onUse?.(); }}>{m.label}</button>
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'flex-start' }}>
        <svg viewBox="0 0 320 220" aria-hidden="true" focusable="false" style={{ flex: '1 1 280px', maxWidth: 420, borderRadius: 10 }}>
          <rect x="0" y="0" width="320" height="220" fill={fillOf('sky')} {...outline('sky')} {...hit('sky')} />
          <circle cx="268" cy="44" r="26" fill={fillOf('sun')} {...outline('sun')} {...hit('sun')} />
          <rect x="0" y="160" width="320" height="60" fill={fillOf('grass')} {...outline('grass')} {...hit('grass')} />
          <rect x="30" y="95" width="120" height="85" fill={fillOf('wall')} {...outline('wall')} {...hit('wall')} />
          <polygon points="20,98 90,48 160,98" fill={fillOf('roof')} {...outline('roof')} {...hit('roof')} />
          <rect x="76" y="132" width="28" height="48" fill={fillOf('door')} {...outline('door')} {...hit('door')} />
          <g onClick={() => pick('skin')} style={{ cursor: 'pointer' }}>
            <Face cx={238} cy={132} r={40} skin={fillOf('skin')} hair={fillOf('hair')} />
          </g>
        </svg>
        <div style={{ flex: '1 1 240px', minWidth: 0 }}>
          <div className="lv-label" style={{ marginBottom: 4 }}>Pick a part of the picture (click it, or choose here):</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {REGIONS.map((r) => (
              <button key={r.id} type="button" className="lv-btn" aria-pressed={sel === r.id} onClick={() => pick(r.id)} style={{ padding: '0.2rem 0.6rem' }}>{r.name}</button>
            ))}
          </div>
          <table style={{ borderCollapse: 'collapse', fontSize: 13, marginTop: 10 }}>
            <tbody>
              <tr>
                <th scope="row" style={{ textAlign: 'left', padding: '3px 10px', border: `1px solid ${C.border}`, background: C.surface2 }}>{s.name}</th>
                <td style={{ padding: '3px 10px', border: `1px solid ${C.border}`, fontFamily: 'ui-monospace, monospace' }}>R {R} · G {G} · B {B}</td>
              </tr>
              <tr>
                <th scope="row" style={{ textAlign: 'left', padding: '3px 10px', border: `1px solid ${C.border}`, background: C.surface2 }}>Grayscale</th>
                <td style={{ padding: '3px 10px', border: `1px solid ${C.border}`, fontFamily: 'ui-monospace, monospace' }}>{luma(s.rgb)}</td>
              </tr>
            </tbody>
          </table>
          <p className="lv-note" aria-live="polite">
            0.299×{R} + 0.587×{G} + 0.114×{B} = <strong>{luma(s.rgb)}</strong>
            <br />
            Green counts the most because our eyes are most sensitive to it.
          </p>
        </div>
      </div>
      <div className="lv-note">
        <strong>Why detectors use grayscale:</strong> a colour picture is stored as <code>(height, width, 3)</code> — three numbers per pixel. Grayscale is <code>(height, width)</code> — one number per pixel. Haar features only compare light with dark, so one number is enough, and it is three times less data to process.
      </div>
      <p className="lv-sim">Drawn with flat colours so every number above is exact. Not a photograph.</p>
    </div>
  );
}

// ─── Detection lab: scaleFactor and minNeighbors ────────────────────────────

interface LabObject {
  id: string;
  label: string;
  face: boolean;
  cx: number;
  cy: number;
  r: number;
  skin?: string;
  hair?: string;
  /** Prepared result: how many overlapping candidate windows agreed on this object, per scaleFactor. */
  neighbors: Record<string, number>;
}

const SCALE_FACTORS = [1.05, 1.1, 1.2, 1.3, 1.5];
const LAB_OBJECTS: LabObject[] = [
  { id: 'A', label: 'Large face', face: true, cx: 150, cy: 160, r: 72, skin: '#f2c9a0', hair: '#3b2417', neighbors: { '1.05': 22, '1.1': 14, '1.2': 9, '1.3': 7, '1.5': 4 } },
  { id: 'B', label: 'Small face (far away)', face: true, cx: 350, cy: 190, r: 34, skin: '#c68a5e', hair: '#1f1410', neighbors: { '1.05': 12, '1.1': 8, '1.2': 5, '1.3': 3, '1.5': 1 } },
  { id: 'C', label: 'Wall clock (looks a little like a face)', face: false, cx: 385, cy: 62, r: 30, neighbors: { '1.05': 6, '1.1': 3, '1.2': 2, '1.3': 1, '1.5': 0 } },
];
const LAB_W = 480;
const LAB_H = 300;

/** Image-pyramid levels between a 24-pixel window and the picture height. */
const pyramidLevels = (scale: number) => Math.floor(Math.log(LAB_H / 24) / Math.log(scale)) + 1;

export function DetectionLab({ onUse }: VisualProps) {
  const [scale, setScale] = useState(1.1);
  const [minN, setMinN] = useState(5);
  const scaleId = useId();
  const nbrId = useId();
  const key = String(scale);
  const results = LAB_OBJECTS.map((o) => {
    const n = o.neighbors[key] ?? 0;
    const found = n > 0 && n >= minN;
    return { o, n, found };
  });
  const faces = results.filter((r) => r.o.face);
  const foundFaces = faces.filter((r) => r.found).length;
  const falseAlarms = results.filter((r) => !r.o.face && r.found).length;
  const missed = faces.length - foundFaces;
  const levels = pyramidLevels(scale);

  return (
    <div>
      <svg viewBox={`0 0 ${LAB_W} ${LAB_H}`} aria-hidden="true" focusable="false" style={{ borderRadius: 10, border: `1px solid ${C.border}`, ['--natural' as string]: `${LAB_W}px` }}>
        <rect width={LAB_W} height={LAB_H} fill="#dbeafe" />
        <rect y={LAB_H * 0.8} width={LAB_W} height={LAB_H * 0.2} fill="#b7c9a8" />
        {LAB_OBJECTS.map((o) =>
          o.face ? (
            <Face key={o.id} cx={o.cx} cy={o.cy} r={o.r} skin={o.skin} hair={o.hair} />
          ) : (
            <g key={o.id}>
              <circle cx={o.cx} cy={o.cy} r={o.r} fill="#f8fafc" stroke="#475569" strokeWidth="4" />
              <circle cx={o.cx - 10} cy={o.cy - 6} r="3.5" fill="#1f2937" />
              <circle cx={o.cx + 10} cy={o.cy - 6} r="3.5" fill="#1f2937" />
              <line x1={o.cx} y1={o.cy} x2={o.cx} y2={o.cy - 16} stroke="#1f2937" strokeWidth="3" strokeLinecap="round" />
              <line x1={o.cx} y1={o.cy} x2={o.cx + 12} y2={o.cy + 6} stroke="#1f2937" strokeWidth="3" strokeLinecap="round" />
            </g>
          ),
        )}
        {results.map(({ o, n, found }) => {
          const bx = o.cx - o.r * 0.85;
          const by = o.cy - o.r;
          const bw = o.r * 1.7;
          const bh = o.r * 2;
          const colour = !found ? '#64748b' : o.face ? '#16a34a' : '#dc2626';
          if (n === 0) return null;
          return (
            <g key={o.id}>
              <rect x={bx} y={by} width={bw} height={bh} fill="none" stroke={colour} strokeWidth={found ? 3.5 : 2} strokeDasharray={found ? undefined : '5 4'} opacity={found ? 1 : 0.8} />
              <rect x={bx} y={by - 17} width={found ? 84 : 112} height={16} fill={colour} rx="3" />
              <text x={bx + 5} y={by - 5} fontSize="11" fontWeight="700" style={{ fill: '#fff' }}>
                {found ? `${o.face ? 'face' : 'false alarm'} · ${n}` : `rejected · ${n} < ${minN}`}
              </text>
            </g>
          );
        })}
      </svg>

      <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <label htmlFor={scaleId} className="lv-label" style={{ minWidth: 110, fontFamily: 'ui-monospace, monospace' }}>scaleFactor</label>
          <select id={scaleId} className="lv-select" value={scale} onChange={(e) => { setScale(Number(e.target.value)); onUse?.(); }}>
            {SCALE_FACTORS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <span className="lv-label">smaller = more careful (and slower)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <label htmlFor={nbrId} className="lv-label" style={{ minWidth: 110, fontFamily: 'ui-monospace, monospace' }}>minNeighbors</label>
          <input id={nbrId} className="lv-range" type="range" min={0} max={15} value={minN} onChange={(e) => { setMinN(Number(e.target.value)); onUse?.(); }} />
          <span className="lv-label" style={{ minWidth: 20 }}>{minN}</span>
          <span className="lv-label">bigger = stricter</span>
        </div>
      </div>

      <div className="lv-note" aria-live="polite" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 18px' }}>
        <span>✅ Faces found: <strong>{foundFaces} of {faces.length}</strong></span>
        <span>❌ Faces missed: <strong>{missed}</strong></span>
        <span>⚠️ False alarms: <strong>{falseAlarms}</strong></span>
        <span>🔍 Sizes checked: <strong>{levels}</strong></span>
      </div>
      <p className="lv-note">
        {missed > 0 && minN > 0 ? 'A face was missed: lower minNeighbors, or use a smaller scaleFactor so no face size slips between the sizes being checked. ' : ''}
        {falseAlarms > 0 ? 'The clock was accepted as a face: raise minNeighbors so that objects with only a few agreeing windows are rejected. ' : ''}
        {missed === 0 && falseAlarms === 0 ? 'Both faces found and the clock ignored — a good balance for this picture. Now try the extremes to see each setting fail.' : ''}
      </p>
      <pre style={{ margin: '8px 0 0', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 10px', fontSize: 12.5, overflowX: 'auto' }}>
        {`faces = face_cascade.detectMultiScale(gray, scaleFactor=${scale}, minNeighbors=${minN})`}
      </pre>
      <p className="lv-sim">{SIM_NOTE} The number on each box is how many overlapping candidate windows agreed.</p>
    </div>
  );
}

registerVisuals({
  haar: { Component: HaarFeatures, interactive: true },
  cascade: { Component: CascadeVisual, interactive: true },
  bbox: { Component: BoundingBox, interactive: true },
  colorspace: { Component: ColorSpace, interactive: true },
  'detection-lab': { Component: DetectionLab, interactive: true },
});
