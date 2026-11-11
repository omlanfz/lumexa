// FILE PATH: client/lib/classroom/pointerCanvas.ts
//
// How the teacher's Pointer looks, drawn on one canvas laid over the shared screen
// (see components/classroom/PointerLayer.tsx): a small dot, a thin line that fades
// behind it while the mouse button is held, and a ring where it clicks.
//
//   dot    a 9–10 px red circle with a hairline of white (so it reads on red and on dark
//          pictures too), a thin ring round it, and a very light glow.
//   line   2 px, a little transparent, smoothed through the cursor's points and faded
//          with age — each point is gone TRAIL_MS after it was drawn.
//   ring   one thin ring that grows and fades over RING_MS, with a trace of colour inside.
//
// Everything that is a decision about the picture lives in small pure functions
// (trailPieces, groupTrail, ringShape …) so it can be tested without a canvas; drawPointer
// only turns them into strokes. One canvas and a handful of paths a frame — the cursor
// never makes a DOM node.

import { RING_MS, TRAIL_MS, fromNormalized } from './pointer.ts';
import type { Point, PointerFrame, Rect } from './pointer.ts';

export interface RGB {
  r: number;
  g: number;
  b: number;
}

/** A clear, slightly warm red (it reads on white and on near-black alike). */
export const POINTER_RED: RGB = { r: 255, g: 59, b: 48 };

/** A colour as written in CSS (#rgb or #rrggbb), or `fallback` if it is not one. */
export function parseHexColor(value: string, fallback: RGB = POINTER_RED): RGB {
  const hex = value.trim().replace(/^#/, '');
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return fallback;
  return { r: parseInt(full.slice(0, 2), 16), g: parseInt(full.slice(2, 4), 16), b: parseInt(full.slice(4, 6), 16) };
}

export function rgba(color: RGB, alpha: number): string {
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${Math.round(Math.min(1, Math.max(0, alpha)) * 1000) / 1000})`;
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

// ─── The dot ─────────────────────────────────────────────────────────────────

/** The red dot: 9.5 px across. */
export const DOT_RADIUS = 4.75;
/** The hairline of white round it. */
export const DOT_EDGE_RADIUS = 5.4;
/** The thin ring round the dot. */
export const DOT_RING_RADIUS = 10;
/** How far the glow reaches (it is very faint). */
export const DOT_GLOW_RADIUS = 17;

// ─── The line ────────────────────────────────────────────────────────────────

export const TRAIL_WIDTH = 2;
/** The newest part of the line is this opaque — a little transparent. */
export const TRAIL_ALPHA = 0.8;
/** The line is drawn in this many steps of fade (one path each): steps of ~70 ms of
 * age are not to be seen on a 2 px line, and a path of its own never darkens where it
 * crosses itself. */
export const TRAIL_STEPS = 10;

/** How opaque the line is at a given age (ms since that point was drawn): full at
 * once, then fading faster and faster, and nothing at TRAIL_MS. */
export function trailAlpha(age: number): number {
  const u = clamp01(age / TRAIL_MS);
  return u >= 1 ? 0 : TRAIL_ALPHA * Math.pow(1 - u, 1.4);
}

function trailStep(age: number): number {
  return Math.min(TRAIL_STEPS - 1, Math.floor(clamp01(age / TRAIL_MS) * TRAIL_STEPS));
}

/** A point of a line in pixels, and how long ago it was drawn. */
export interface AgedPoint extends Point {
  age: number;
}

/** One smooth piece of a line: a curve (or, at the very ends, a straight run). */
export interface TrailPiece {
  from: Point;
  /** The curve's control point, or null for a straight run. */
  control: Point | null;
  to: Point;
  /** How old this piece is (that of the cursor point that shaped it). */
  age: number;
}

/** A line through the cursor's points, smoothed: curves that bend at each point but pass
 * through the middle of each run between two, so there is no corner anywhere however
 * sparse the points are. Each piece starts where the one before it ended. */
export function trailPieces(points: readonly AgedPoint[]): TrailPiece[] {
  const n = points.length;
  if (n < 2) return [];
  const at = (i: number): Point => ({ x: points[i].x, y: points[i].y });
  if (n === 2) return [{ from: at(0), control: null, to: at(1), age: (points[0].age + points[1].age) / 2 }];
  const pieces: TrailPiece[] = [];
  let start: Point = at(0);
  for (let i = 1; i <= n - 2; i++) {
    const end = { x: (points[i].x + points[i + 1].x) / 2, y: (points[i].y + points[i + 1].y) / 2 };
    pieces.push({ from: start, control: at(i), to: end, age: points[i].age });
    start = end;
  }
  pieces.push({ from: start, control: null, to: at(n - 1), age: points[n - 1].age });
  return pieces;
}

/** A run of pieces of about the same age, drawn as one path. */
export interface TrailGroup {
  alpha: number;
  pieces: TrailPiece[];
}

/** The pieces of a line, oldest first, in runs of equal fade — each run's opacity is
 * that of the middle of its step. Pieces that have faded away are left out. */
export function groupTrail(pieces: readonly TrailPiece[]): TrailGroup[] {
  const groups: TrailGroup[] = [];
  let current: TrailGroup | null = null;
  let step = -1;
  for (const piece of pieces) {
    const s = trailStep(piece.age);
    const alpha = trailAlpha(((s + 0.5) / TRAIL_STEPS) * TRAIL_MS);
    if (alpha <= 0.004 || piece.age >= TRAIL_MS) {
      current = null;
      step = -1;
      continue;
    }
    if (current === null || s !== step) {
      current = { alpha, pieces: [] };
      groups.push(current);
      step = s;
    }
    current.pieces.push(piece);
  }
  return groups;
}

// ─── The ring ────────────────────────────────────────────────────────────────

export interface RingShape {
  radius: number;
  /** Of the ring itself. */
  alpha: number;
  /** Of the faint colour inside it. */
  fillAlpha: number;
  width: number;
}

/** The ring a click makes, `age` ms in: it grows from just outside the dot and fades,
 * and is nothing at RING_MS. With reduced motion it does not grow — it sits and fades. */
export function ringShape(age: number, reducedMotion = false): RingShape | null {
  if (age >= RING_MS) return null;
  const t = clamp01(age / RING_MS);
  const grown = 1 - Math.pow(1 - t, 3);
  return {
    radius: reducedMotion ? 16 : 7 + 21 * grown,
    alpha: 0.72 * Math.pow(1 - t, 1.5),
    fillAlpha: 0.1 * Math.pow(1 - t, 2),
    width: 1.75 - 0.75 * t,
  };
}

// ─── Drawing ─────────────────────────────────────────────────────────────────

export interface DrawArgs {
  /** Where the shared picture sits in the canvas (CSS pixels). */
  picture: Rect;
  frame: PointerFrame | null;
  /** The clock `frame` was made with. */
  now: number;
  color: RGB;
  reducedMotion: boolean;
}

function circle(ctx: CanvasRenderingContext2D, at: Point, radius: number): void {
  ctx.beginPath();
  ctx.arc(at.x, at.y, radius, 0, Math.PI * 2);
}

function drawDot(ctx: CanvasRenderingContext2D, at: Point, color: RGB): void {
  const glow = ctx.createRadialGradient(at.x, at.y, 0, at.x, at.y, DOT_GLOW_RADIUS);
  glow.addColorStop(0, rgba(color, 0.3));
  glow.addColorStop(0.4, rgba(color, 0.14));
  glow.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = glow;
  circle(ctx, at, DOT_GLOW_RADIUS);
  ctx.fill();

  ctx.lineWidth = 1;
  ctx.strokeStyle = rgba(color, 0.55);
  circle(ctx, at, DOT_RING_RADIUS);
  ctx.stroke();

  ctx.lineWidth = 1.1;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
  circle(ctx, at, DOT_EDGE_RADIUS);
  ctx.stroke();

  ctx.fillStyle = rgba(color, 1);
  circle(ctx, at, DOT_RADIUS);
  ctx.fill();
}

function drawGroup(ctx: CanvasRenderingContext2D, group: TrailGroup, color: RGB): void {
  ctx.beginPath();
  ctx.moveTo(group.pieces[0].from.x, group.pieces[0].from.y);
  for (const piece of group.pieces) {
    if (piece.control) ctx.quadraticCurveTo(piece.control.x, piece.control.y, piece.to.x, piece.to.y);
    else ctx.lineTo(piece.to.x, piece.to.y);
  }
  ctx.strokeStyle = rgba(color, group.alpha);
  ctx.stroke();
}

/** Draws the Pointer over one shared screen: the lines, then the rings, then the dot on
 * top. The canvas is expected to be cleared, and scaled so that one unit is a CSS pixel. */
export function drawPointer(ctx: CanvasRenderingContext2D, { picture, frame, now, color, reducedMotion }: DrawArgs): void {
  if (!frame) return;
  const dot = frame.dot ? fromNormalized(frame.dot, picture) : null;

  ctx.lineWidth = TRAIL_WIDTH;
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'round';
  for (const stroke of frame.strokes) {
    const points: AgedPoint[] = stroke.points.map((point) => {
      const px = fromNormalized(point, picture);
      return { x: px.x, y: px.y, age: Math.max(0, now - point.t) };
    });
    // the line being drawn runs on to the dot, which is where the cursor is right now
    if (stroke === frame.activeStroke && dot) points.push({ x: dot.x, y: dot.y, age: 0 });
    for (const group of groupTrail(trailPieces(points))) drawGroup(ctx, group, color);
  }

  for (const ring of frame.rings) {
    const shape = ringShape(now - ring.start, reducedMotion);
    if (!shape) continue;
    const at = fromNormalized(ring, picture);
    if (shape.fillAlpha > 0.002) {
      ctx.fillStyle = rgba(color, shape.fillAlpha);
      circle(ctx, at, shape.radius);
      ctx.fill();
    }
    ctx.lineWidth = shape.width;
    ctx.strokeStyle = rgba(color, shape.alpha);
    circle(ctx, at, shape.radius);
    ctx.stroke();
  }

  if (dot) drawDot(ctx, dot, color);
}
