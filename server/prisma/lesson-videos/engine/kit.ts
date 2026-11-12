// Small 2D drawing toolkit for the lesson preview videos (browser canvas, 1920 × 1080).
// Everything is a pure function of time: frame t is drawn from scratch, so any frame can be
// rendered on its own and the video is exactly reproducible.

export const W = 1920;
export const H = 1080;
export const FONT = 'Inter, "Helvetica Neue", Arial, sans-serif';
export const EMOJI_FONT =
  '"Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif';

export type Ctx = CanvasRenderingContext2D;

export const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);
export const lerp = (a: number, b: number, t: number): number =>
  a + (b - a) * t;

/** Progress 0…1 of an animation that starts at `start` and lasts `dur` seconds. */
export const prog = (t: number, start: number, dur: number): number =>
  clamp01((t - start) / dur);

export const ease = {
  out3: (t: number): number => 1 - Math.pow(1 - t, 3),
  inOut3: (t: number): number =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  outBack: (t: number, s = 1.70158): number =>
    1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
  outElastic: (t: number): number =>
    t === 0 || t === 1
      ? t
      : Math.pow(2, -9 * t) * Math.sin(((t * 10 - 0.75) * (2 * Math.PI)) / 3) +
        1,
};

/** Deterministic pseudo-random numbers (so every render draws the same stars). */
export function rng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function rrPath(
  c: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rad = Math.max(0, Math.min(r, w / 2, h / 2));
  c.beginPath();
  c.moveTo(x + rad, y);
  c.arcTo(x + w, y, x + w, y + h, rad);
  c.arcTo(x + w, y + h, x, y + h, rad);
  c.arcTo(x, y + h, x, y, rad);
  c.arcTo(x, y, x + w, y, rad);
  c.closePath();
}

export function fillRR(
  c: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string | CanvasGradient,
): void {
  rrPath(c, x, y, w, h, r);
  c.fillStyle = fill;
  c.fill();
}

export function strokeRR(
  c: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  stroke: string,
  width: number,
): void {
  rrPath(c, x, y, w, h, r);
  c.strokeStyle = stroke;
  c.lineWidth = width;
  c.stroke();
}

export function linear(
  c: Ctx,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  stops: [number, string][],
): CanvasGradient {
  const g = c.createLinearGradient(x0, y0, x1, y1);
  for (const [o, col] of stops) g.addColorStop(o, col);
  return g;
}

export interface TextOpts {
  size?: number;
  weight?: number | string;
  color?: string | CanvasGradient;
  align?: CanvasTextAlign;
  base?: CanvasTextBaseline;
  alpha?: number;
  mono?: boolean;
  shadow?: boolean;
}

export const fontOf = (
  size: number,
  weight: number | string = 700,
  mono = false,
): string =>
  mono
    ? `${weight} ${size}px "DejaVu Sans Mono", "Liberation Mono", monospace`
    : `${weight} ${size}px ${FONT}`;

export function text(
  c: Ctx,
  s: string,
  x: number,
  y: number,
  o: TextOpts = {},
): number {
  c.save();
  c.font = fontOf(o.size ?? 40, o.weight ?? 700, o.mono);
  c.textAlign = o.align ?? 'left';
  c.textBaseline = o.base ?? 'alphabetic';
  c.globalAlpha *= o.alpha ?? 1;
  if (o.shadow) {
    c.shadowColor = 'rgba(0,0,0,.35)';
    c.shadowBlur = 10;
    c.shadowOffsetY = 3;
  }
  c.fillStyle = o.color ?? '#fff';
  c.fillText(s, x, y);
  const w = c.measureText(s).width;
  c.restore();
  return w;
}

export function measure(
  c: Ctx,
  s: string,
  size: number,
  weight: number | string = 700,
  mono = false,
): number {
  c.save();
  c.font = fontOf(size, weight, mono);
  const w = c.measureText(s).width;
  c.restore();
  return w;
}

/** Greedy word wrap into lines no wider than `maxW`. */
export function wrap(
  c: Ctx,
  s: string,
  maxW: number,
  size: number,
  weight: number | string = 700,
): string[] {
  c.save();
  c.font = fontOf(size, weight);
  const words = s.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (line && c.measureText(next).width > maxW) {
      lines.push(line);
      line = w;
    } else line = next;
  }
  if (line) lines.push(line);
  c.restore();
  return lines;
}

export function emoji(
  c: Ctx,
  ch: string,
  x: number,
  y: number,
  size: number,
  alpha = 1,
): void {
  c.save();
  c.font = `${size}px ${EMOJI_FONT}`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.globalAlpha *= alpha;
  c.fillStyle = '#000'; // colour glyphs take their opacity from the fill, so it must be opaque
  c.fillText(ch, x, y + size * 0.06);
  c.restore();
}

export function glow(
  c: Ctx,
  x: number,
  y: number,
  r: number,
  color: string,
  alpha = 0.5,
): void {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, hexA(color, alpha));
  g.addColorStop(1, hexA(color, 0));
  c.fillStyle = g;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
}

/** "#rrggbb" + alpha -> "rgba(…)". */
export function hexA(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const n = parseInt(
    h.length === 3
      ? h
          .split('')
          .map((x) => x + x)
          .join('')
      : h,
    16,
  );
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export function shade(hex: string, amount: number): string {
  const h = hex.replace('#', '');
  const n = parseInt(h, 16);
  const f = (v: number) =>
    Math.max(
      0,
      Math.min(
        255,
        Math.round(v + (amount >= 0 ? (255 - v) * amount : v * amount)),
      ),
    );
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

/** A tiny four-point sparkle. */
export function sparkle(
  c: Ctx,
  x: number,
  y: number,
  r: number,
  color = '#fff',
  alpha = 1,
): void {
  c.save();
  c.globalAlpha *= alpha;
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(x, y - r);
  c.quadraticCurveTo(x, y, x + r, y);
  c.quadraticCurveTo(x, y, x, y + r);
  c.quadraticCurveTo(x, y, x - r, y);
  c.quadraticCurveTo(x, y, x, y - r);
  c.fill();
  c.restore();
}

/** Scales content about (cx, cy) while it pops in: scale from 0.6 → 1 with a little overshoot. */
export function pop<T>(
  c: Ctx,
  cx: number,
  cy: number,
  p: number,
  draw: () => T,
): T | undefined {
  if (p <= 0) return undefined;
  const s = ease.outBack(clamp01(p));
  c.save();
  c.translate(cx, cy);
  c.scale(s, s);
  c.translate(-cx, -cy);
  c.globalAlpha *= clamp01(p * 2.2);
  const out = draw();
  c.restore();
  return out;
}
