import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DOT_RADIUS,
  DOT_RING_RADIUS,
  POINTER_RED,
  TRAIL_ALPHA,
  TRAIL_STEPS,
  drawPointer,
  groupTrail,
  parseHexColor,
  rgba,
  ringShape,
  trailAlpha,
  trailPieces,
} from './pointerCanvas.ts';
import type { AgedPoint } from './pointerCanvas.ts';
import { RING_MS, TRAIL_MS } from './pointer.ts';
import type { PointerFrame, Stroke } from './pointer.ts';

// ─── Colour ─────────────────────────────────────────────────────────────────

test('colours are read from CSS, and a colour that is not one falls back to the pointer red', () => {
  assert.deepEqual(parseHexColor('#FF3B30'), { r: 255, g: 59, b: 48 });
  assert.deepEqual(parseHexColor('  #0af '), { r: 0, g: 170, b: 255 });
  assert.deepEqual(parseHexColor('00ff00'), { r: 0, g: 255, b: 0 });
  for (const bad of ['', 'red', '#12', '#12345', '#GGGGGG', 'rgb(1,2,3)']) assert.deepEqual(parseHexColor(bad), POINTER_RED, bad);
  assert.equal(rgba({ r: 1, g: 2, b: 3 }, 0.12345), 'rgba(1, 2, 3, 0.123)');
  assert.equal(rgba(POINTER_RED, 7), 'rgba(255, 59, 48, 1)');
  assert.equal(rgba(POINTER_RED, -1), 'rgba(255, 59, 48, 0)');
});

test('the dot is the small red circle that was asked for: 9–11 px across', () => {
  assert.ok(DOT_RADIUS * 2 >= 9 && DOT_RADIUS * 2 <= 11);
  assert.ok(DOT_RING_RADIUS > DOT_RADIUS * 1.5, 'with a thin ring clear of it');
});

// ─── The line ───────────────────────────────────────────────────────────────

test('the line is a little transparent, fades with age, and is gone after TRAIL_MS', () => {
  assert.ok(trailAlpha(0) > 0.7 && trailAlpha(0) <= TRAIL_ALPHA && TRAIL_ALPHA < 1);
  let previous = trailAlpha(0);
  for (let age = 10; age <= TRAIL_MS; age += 10) {
    const alpha = trailAlpha(age);
    assert.ok(alpha <= previous + 1e-12, `fading at ${age}`);
    previous = alpha;
  }
  assert.equal(trailAlpha(TRAIL_MS), 0);
  assert.equal(trailAlpha(TRAIL_MS * 3), 0);
  assert.equal(trailAlpha(-50), trailAlpha(0), 'a point from the future is just new');
  assert.ok(TRAIL_MS >= 500 && TRAIL_MS <= 800, 'the fade lasts 500–800 ms');
});

const pt = (x: number, y: number, age = 0): AgedPoint => ({ x, y, age });

test('a line needs two points; two make a straight run', () => {
  assert.deepEqual(trailPieces([]), []);
  assert.deepEqual(trailPieces([pt(1, 1)]), []);
  assert.deepEqual(trailPieces([pt(0, 0, 100), pt(10, 0, 0)]), [
    { from: { x: 0, y: 0 }, control: null, to: { x: 10, y: 0 }, age: 50 },
  ]);
});

test('the line is smooth: one piece runs on from where the last ended, it starts and ends on the cursor’s own points, and it bends through the middle of each run', () => {
  const points = [pt(0, 0, 90), pt(20, 0, 60), pt(20, 20, 30), pt(0, 20, 0)];
  const pieces = trailPieces(points);
  assert.equal(pieces.length, 3);
  assert.deepEqual(pieces[0].from, { x: 0, y: 0 }, 'starts at the first point');
  assert.deepEqual(pieces.at(-1)!.to, { x: 0, y: 20 }, 'ends at the last — the cursor');
  for (let i = 1; i < pieces.length; i++) assert.deepEqual(pieces[i].from, pieces[i - 1].to, 'no gap and no jump');
  // the corners are rounded off: the curve passes through the middle of each run between two
  // points, with the point itself as its control
  assert.deepEqual(pieces[0].control, { x: 20, y: 0 });
  assert.deepEqual(pieces[0].to, { x: 20, y: 10 });
  assert.deepEqual(pieces[1].control, { x: 20, y: 20 });
  assert.deepEqual(pieces[1].to, { x: 10, y: 20 });
  assert.deepEqual(pieces[2].control, null);
  // older pieces are older
  assert.ok(pieces[0].age > pieces[1].age && pieces[1].age > pieces[2].age);
});

test('the line is drawn in a few steps of fade, each one path, oldest first and never lighter than what is newer', () => {
  // 60 points, one every 12 ms, the oldest 700 ms ago
  const points = Array.from({ length: 60 }, (_, i) => pt(i * 3, Math.sin(i / 5) * 20, (59 - i) * 12));
  const groups = groupTrail(trailPieces(points));
  assert.ok(groups.length > 3 && groups.length <= TRAIL_STEPS, `${groups.length} steps`);
  for (let i = 1; i < groups.length; i++) assert.ok(groups[i].alpha > groups[i - 1].alpha, 'newer is more opaque');
  assert.ok(groups.at(-1)!.alpha > 0.6);
  // every piece is in exactly one group, in order, and each group is a continuous run
  const flat = groups.flatMap((g) => g.pieces);
  const all = trailPieces(points);
  assert.equal(flat.length, all.length - (all.length - flat.length));
  for (const g of groups) for (let i = 1; i < g.pieces.length; i++) assert.deepEqual(g.pieces[i].from, g.pieces[i - 1].to);
  // consecutive groups meet where one ends and the next begins: there is no gap in the line
  for (let i = 1; i < groups.length; i++) assert.deepEqual(groups[i].pieces[0].from, groups[i - 1].pieces.at(-1)!.to);
});

test('what has faded away is not drawn at all', () => {
  const points = [pt(0, 0, TRAIL_MS + 100), pt(5, 0, TRAIL_MS + 50), pt(10, 0, 100), pt(15, 0, 0)];
  const groups = groupTrail(trailPieces(points));
  const ages = groups.flatMap((g) => g.pieces.map((p) => p.age));
  assert.ok(ages.every((age) => age < TRAIL_MS), JSON.stringify(ages));
  assert.deepEqual(groupTrail(trailPieces([pt(0, 0, TRAIL_MS * 2), pt(5, 5, TRAIL_MS * 2)])), []);
});

// ─── The ring ───────────────────────────────────────────────────────────────

test('a click’s ring grows from just outside the dot, fades, and is gone at RING_MS', () => {
  assert.ok(RING_MS >= 600 && RING_MS <= 900, 'it lasts 600–900 ms');
  const first = ringShape(0)!;
  assert.ok(first.radius > DOT_RADIUS && first.radius < DOT_RING_RADIUS, 'starts between the dot and its ring');
  let previous = first;
  for (let age = 20; age < RING_MS; age += 20) {
    const shape = ringShape(age)!;
    assert.ok(shape.radius > previous.radius, `growing at ${age}`);
    assert.ok(shape.alpha < previous.alpha, `fading at ${age}`);
    assert.ok(shape.width <= previous.width + 1e-12 && shape.width > 0, 'thinning, never to nothing');
    previous = shape;
  }
  assert.ok(previous.radius > 20 && previous.radius < 30, 'a modest ring, not a big circle');
  assert.equal(ringShape(RING_MS), null);
  assert.equal(ringShape(RING_MS + 500), null);
  assert.ok(ringShape(-30)!.radius === first.radius, 'a ring from the future is a new one');
});

test('with reduced motion the ring does not grow — it stays and fades', () => {
  const a = ringShape(0, true)!;
  const b = ringShape(RING_MS / 2, true)!;
  assert.equal(a.radius, b.radius);
  assert.ok(b.alpha < a.alpha);
});

// ─── Painting ───────────────────────────────────────────────────────────────

/** A canvas that writes down what it was asked to draw. */
function recorder() {
  const calls: Array<{ op: string; args: unknown[]; style?: unknown; width?: number }> = [];
  const state = { strokeStyle: '' as unknown, fillStyle: '' as unknown, lineWidth: 1, lineCap: '', lineJoin: '' };
  const ctx = new Proxy(state, {
    get(target, prop: string) {
      if (prop in target) return (target as Record<string, unknown>)[prop];
      if (prop === 'createRadialGradient') {
        return (...args: unknown[]) => {
          calls.push({ op: 'gradient', args });
          return { addColorStop: () => undefined };
        };
      }
      return (...args: unknown[]) => {
        calls.push({ op: prop, args, style: prop === 'stroke' ? target.strokeStyle : prop === 'fill' ? target.fillStyle : undefined, width: target.lineWidth });
      };
    },
    set(target, prop: string, value) {
      (target as Record<string, unknown>)[prop] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, calls };
}

const picture = { left: 10, top: 20, width: 200, height: 100 };
function frameOf(partial: Partial<PointerFrame>): PointerFrame {
  return { dot: null, strokes: [], activeStroke: null, rings: [], animating: false, ...partial };
}
const args = (frame: PointerFrame | null, now = 1_000) => ({ picture, frame, now, color: POINTER_RED, reducedMotion: false });

test('nothing is drawn when there is nothing to show', () => {
  const { ctx, calls } = recorder();
  drawPointer(ctx, args(null));
  drawPointer(ctx, args(frameOf({})));
  assert.deepEqual(calls, []);
});

test('the dot is drawn where the same spot is in this picture, on top, as a small red circle with a thin ring round it', () => {
  const { ctx, calls } = recorder();
  drawPointer(ctx, args(frameOf({ dot: { x: 0.5, y: 0.5 } })));
  const arcs = calls.filter((c) => c.op === 'arc');
  assert.ok(arcs.length >= 4, 'glow, ring, edge, core');
  for (const arc of arcs) assert.deepEqual(arc.args.slice(0, 2), [110, 70], 'the middle of the picture, in the box');
  const radii = arcs.map((c) => c.args[2] as number);
  assert.ok(radii.includes(DOT_RADIUS) && radii.includes(DOT_RING_RADIUS));
  assert.deepEqual(calls.at(-1)!.op, 'fill', 'the red core is last — on top of its own glow');
  assert.equal(calls.at(-1)!.style, rgba(POINTER_RED, 1));
});

test('a line is drawn as a few paths however many points it has — never a path per point — and runs on to the dot only while it is being drawn', () => {
  const points = Array.from({ length: 40 }, (_, i) => ({ x: i / 40, y: 0.5, t: 1_000 - (39 - i) * 15 }));
  const stroke: Stroke = { id: 1, points };
  const drawn = (frame: PointerFrame) => {
    const { ctx, calls } = recorder();
    drawPointer(ctx, args(frame));
    return calls;
  };
  const active = drawn(frameOf({ dot: { x: 1, y: 0.5 }, strokes: [stroke], activeStroke: stroke }));
  const strokes = active.filter((c) => c.op === 'stroke' && c.width === 2);
  assert.ok(strokes.length >= 3 && strokes.length <= TRAIL_STEPS, `${strokes.length} paths`);
  assert.ok(active.filter((c) => c.op === 'quadraticCurveTo').length >= 30, 'and smooth');
  const lastLine = active.filter((c) => c.op === 'lineTo').at(-1)!;
  assert.deepEqual(lastLine.args, [210, 70], 'it runs on to the dot (right edge of the picture)');

  const over = drawn(frameOf({ dot: { x: 1, y: 0.9 }, strokes: [stroke], activeStroke: null }));
  const lastLineOver = over.filter((c) => c.op === 'lineTo').at(-1)!;
  assert.notDeepEqual(lastLineOver.args, [210, 110], 'a finished line does not chase the cursor');
});

test('rings are drawn at their spot, fading; one that is over is not drawn', () => {
  const { ctx, calls } = recorder();
  drawPointer(ctx, args(frameOf({ rings: [{ x: 0.25, y: 0.75, start: 900 }, { x: 0.9, y: 0.1, start: 1_000 - RING_MS - 5 }] })));
  const arcs = calls.filter((c) => c.op === 'arc');
  assert.equal(arcs.length, 2, 'a disc and a ring — for the one that is still showing');
  for (const arc of arcs) assert.deepEqual(arc.args.slice(0, 2), [60, 95]);
});
