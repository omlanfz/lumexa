'use client';

// FILE PATH: client/components/lesson/visuals/svg.tsx
//
// Shared drawing kit for the lesson visuals: theme colours (CSS variables defined on
// .lesson-visual, so light, dark and the classroom all work), text wrapping, arrow
// markers and edge geometry. Everything is plain SVG built from data.

import { useId, type ReactNode } from 'react';

export const C = {
  bg: 'var(--lv-bg)',
  surface: 'var(--lv-surface)',
  surface2: 'var(--lv-surface2)',
  border: 'var(--lv-border)',
  text: 'var(--lv-text)',
  muted: 'var(--lv-muted)',
  accent: 'var(--lv-accent)',
  accent2: 'var(--lv-accent2)',
  good: 'var(--lv-good)',
  bad: 'var(--lv-bad)',
  warn: 'var(--lv-warn)',
  info: 'var(--lv-info)',
} as const;

export function toneColor(tone?: string): string {
  switch (tone) {
    case 'good': return C.good;
    case 'bad': return C.bad;
    case 'warn': return C.warn;
    case 'info': return C.info;
    case 'accent': return C.accent;
    case 'accent2': return C.accent2;
    default: return C.border;
  }
}

/** Greedy word wrap by character count. */
export function wrapText(text: string, maxChars: number): string[] {
  const out: string[] = [];
  let cur = '';
  for (const w of String(text ?? '').split(/\s+/)) {
    if (!cur) cur = w;
    else if ((cur + ' ' + w).length <= maxChars) cur += ' ' + w;
    else {
      out.push(cur);
      cur = w;
    }
  }
  if (cur) out.push(cur);
  return out.length ? out : [''];
}

/** An id that is safe inside url(#…): React's useId can contain characters CSS does not accept. */
export function useSafeId(): string {
  return useId().replace(/[^a-zA-Z0-9_-]/g, '');
}

export function useMarker(): { id: string; defs: ReactNode } {
  const id = `arrow-${useSafeId()}`;
  return {
    id,
    defs: (
      <defs>
        <marker id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill={C.muted} />
        </marker>
      </defs>
    ),
  };
}

/** Multi-line centred/left text block whose first line sits at `y`. */
export function Lines({
  x, y, lines, size = 13, lh = 1.3, anchor = 'middle', weight = 400, fill = C.text,
}: { x: number; y: number; lines: string[]; size?: number; lh?: number; anchor?: 'start' | 'middle' | 'end'; weight?: number; fill?: string }) {
  return (
    <text x={x} y={y} textAnchor={anchor} fontSize={size} fontWeight={weight} fill={fill}>
      {lines.map((l, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 0 : size * lh}>
          {l}
        </tspan>
      ))}
    </text>
  );
}

export interface Box {
  cx: number;
  cy: number;
  w: number;
  h: number;
}

/** Where the line from a box's centre toward (tx,ty) leaves the box. */
export function edgePoint(b: Box, tx: number, ty: number): { x: number; y: number } {
  const dx = tx - b.cx;
  const dy = ty - b.cy;
  if (dx === 0 && dy === 0) return { x: b.cx, y: b.cy };
  const sx = dx === 0 ? Infinity : b.w / 2 / Math.abs(dx);
  const sy = dy === 0 ? Infinity : b.h / 2 / Math.abs(dy);
  const s = Math.min(sx, sy);
  return { x: b.cx + dx * s, y: b.cy + dy * s };
}

export function Svg({ w, h, y0 = 0, children }: { w: number; h: number; y0?: number; children: ReactNode }) {
  return (
    <svg viewBox={`0 ${y0} ${w} ${h}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

/** A "nice" axis maximum and tick step for a data maximum. */
export function niceScale(max: number, ticks = 5): { max: number; step: number } {
  if (!(max > 0)) return { max: 1, step: 0.2 };
  const raw = max / ticks;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / pow;
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * pow;
  return { max: Math.ceil(max / step) * step, step };
}
