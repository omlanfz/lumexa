import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_BACKLOG_MS,
  MAX_RINGS,
  MIN_POINT_STEP,
  MOVE_INTERVAL_MS,
  PLAYOUT_DELAY_MS,
  PointerBatcher,
  PointerStore,
  RING_MS,
  STALE_MS,
  TRAIL_MS,
  containedRect,
  fromNormalized,
  simplifyPoints,
  toNormalized,
} from './pointer.ts';
import type { PointerBatch } from './pointer.ts';
import { MAX_POINTER_POINTS } from './daily/protocol.ts';
import type { PointerMessage, PointerWire } from './daily/protocol.ts';

/** A clock and timers the test winds by hand. */
function fakeClock() {
  let now = 1_000;
  let nextId = 1;
  const timers = new Map<number, { at: number; fn: () => void }>();
  return {
    now: () => now,
    setTimer: (fn: () => void, ms: number) => {
      const id = nextId++;
      timers.set(id, { at: now + ms, fn });
      return id;
    },
    clearTimer: (id: unknown) => {
      timers.delete(id as number);
    },
    advance(ms: number) {
      const target = now + ms;
      for (;;) {
        const due = [...timers.entries()].filter(([, t]) => t.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        timers.delete(due[0]);
        now = due[1].at;
        due[1].fn();
      }
      now = target;
    },
    pending: () => timers.size,
  };
}

// ─── Geometry ───────────────────────────────────────────────────────────────

test('a wide picture in a tall box is letterboxed top and bottom, centred', () => {
  // 1920×1080 in a 600×600 tile: the picture is 600 wide, 337.5 tall
  const rect = containedRect({ width: 600, height: 600 }, { width: 1920, height: 1080 });
  assert.deepEqual(rect, { left: 0, top: 131.25, width: 600, height: 337.5 });
});

test('a tall picture in a wide box is pillarboxed left and right, centred', () => {
  // 800×1600 in 1000×400: the height limits it (scale 0.25) — 200 wide, 400 tall
  const rect = containedRect({ width: 1000, height: 400 }, { width: 800, height: 1600 });
  assert.deepEqual(rect, { left: 400, top: 0, width: 200, height: 400 });
});

test('a picture of the box’s own shape fills it', () => {
  assert.deepEqual(containedRect({ width: 1280, height: 720 }, { width: 1920, height: 1080 }), {
    left: 0,
    top: 0,
    width: 1280,
    height: 720,
  });
});

test('nothing is placed before the sizes are known', () => {
  assert.equal(containedRect({ width: 0, height: 100 }, { width: 10, height: 10 }), null);
  assert.equal(containedRect({ width: 100, height: 100 }, { width: 0, height: 0 }), null);
  assert.equal(containedRect({ width: Number.NaN, height: 100 }, { width: 10, height: 10 }), null);
});

test('a point on the picture is a share of the picture, and a point on a letterbox bar is no point at all', () => {
  const picture = containedRect({ width: 600, height: 600 }, { width: 1920, height: 1080 })!;
  // the exact middle of the box is the exact middle of the picture
  assert.deepEqual(toNormalized({ x: 300, y: 300 }, picture), { x: 0.5, y: 0.5 });
  // the picture's own corners
  assert.deepEqual(toNormalized({ x: 0, y: 131.25 }, picture), { x: 0, y: 0 });
  assert.deepEqual(toNormalized({ x: 600, y: 468.75 }, picture), { x: 1, y: 1 });
  // above and below the picture: the black bars
  assert.equal(toNormalized({ x: 300, y: 100 }, picture), null);
  assert.equal(toNormalized({ x: 300, y: 500 }, picture), null);
});

test('the same spot of a shared window lands on the same spot in tiles of any shape', () => {
  const media = { width: 1920, height: 1080 };
  const spot = { x: 0.25, y: 0.8 }; // a quarter across, four-fifths down the shared picture
  for (const box of [
    { width: 1280, height: 720 },
    { width: 640, height: 640 },
    { width: 1600, height: 400 },
    { width: 300, height: 900 },
  ]) {
    const picture = containedRect(box, media)!;
    const pixel = fromNormalized(spot, picture);
    // pointing at that pixel gives the same spot back…
    const back = toNormalized(pixel, picture)!;
    assert.ok(Math.abs(back.x - spot.x) < 1e-9 && Math.abs(back.y - spot.y) < 1e-9, JSON.stringify(box));
    // …and it is the same share of the picture's size, whatever the box
    assert.ok(Math.abs((pixel.x - picture.left) / picture.width - 0.25) < 1e-9);
    assert.ok(Math.abs((pixel.y - picture.top) / picture.height - 0.8) < 1e-9);
    // and it is inside the box
    assert.ok(pixel.x >= 0 && pixel.x <= box.width && pixel.y >= 0 && pixel.y <= box.height);
  }
});

test('when the shared window is resized, the same share of it is still the same spot', () => {
  const box = { width: 800, height: 450 };
  const before = containedRect(box, { width: 1600, height: 900 })!;
  const after = containedRect(box, { width: 1000, height: 1000 })!; // the sharer picked a square window
  const p = fromNormalized({ x: 0.5, y: 0.5 }, before);
  const q = fromNormalized({ x: 0.5, y: 0.5 }, after);
  assert.deepEqual(p, q); // the centre stays the centre
  assert.notEqual(before.width, after.width); // while the picture itself moved
});

// ─── Sending ────────────────────────────────────────────────────────────────

/** A batcher whose sent messages are collected. */
function batcherSetup() {
  const clock = fakeClock();
  const sent: PointerBatch[] = [];
  const batcher = new PointerBatcher({ intervalMs: MOVE_INTERVAL_MS, send: (b) => sent.push(b), ...clock });
  return { clock, sent, batcher };
}
const at = (clock: { now: () => number }, x: number, y = 0.5) => ({ x, y, t: clock.now() });

test('the first point after a quiet spell goes at once, as fresh as it gets', () => {
  const { clock, sent, batcher } = batcherSetup();
  batcher.push('s', null, at(clock, 0.1));
  assert.deepEqual(sent, [{ sid: 's', stroke: null, points: [{ x: 0.1, y: 0.5, age: 0 }] }]);
  clock.advance(500);
  batcher.push('s', null, at(clock, 0.2));
  assert.equal(sent.length, 2);
});

test('points that come within an interval go together at its end, each saying how long ago it was, the last one where the cursor stopped', () => {
  const { clock, sent, batcher } = batcherSetup();
  batcher.push('s', null, at(clock, 0.1)); // at once
  clock.advance(5);
  batcher.push('s', null, at(clock, 0.2));
  clock.advance(10);
  batcher.push('s', null, at(clock, 0.3));
  clock.advance(10);
  batcher.push('s', null, at(clock, 0.4));
  assert.equal(sent.length, 1, 'the rest wait for the interval to end');
  clock.advance(MOVE_INTERVAL_MS); // the interval is over
  assert.equal(sent.length, 2);
  // oldest first; ages are measured to the moment of sending (which was MOVE_INTERVAL_MS after the first)
  assert.deepEqual(
    sent[1].points.map((p) => [p.x, p.age]),
    [
      [0.2, MOVE_INTERVAL_MS - 5],
      [0.3, MOVE_INTERVAL_MS - 15],
      [0.4, MOVE_INTERVAL_MS - 25],
    ],
  );
  assert.equal(clock.pending(), 0, 'no timer is left');
});

test('a plain move and a line are never mixed in one message, nor two shared screens', () => {
  const { clock, sent, batcher } = batcherSetup();
  batcher.push('s', null, at(clock, 0.1));
  batcher.push('s', null, at(clock, 0.2)); // waits
  batcher.push('s', 1, at(clock, 0.3)); // the button went down: what waits goes first
  assert.deepEqual(sent.map((b) => [b.stroke, b.points.map((p) => p.x)]), [
    [null, [0.1]],
    [null, [0.2]],
  ]);
  batcher.push('s', 1, at(clock, 0.31));
  batcher.push('s', 2, at(clock, 0.5)); // the next line
  assert.deepEqual(sent.slice(2).map((b) => [b.stroke, b.points.map((p) => p.x)]), [[1, [0.3, 0.31]]]);
  batcher.flush();
  assert.deepEqual(sent.slice(3).map((b) => [b.stroke, b.points.map((p) => p.x)]), [[2, [0.5]]]);
  batcher.push('other', 2, at(clock, 0.6));
  batcher.push('s', 2, at(clock, 0.7)); // another screen
  assert.deepEqual(sent.map((b) => b.sid).slice(-1), ['other']);
});

test('a hand resting on the mouse sends no extra points, and a fast one sends few well-spread ones — but the first and the last are always sent', () => {
  const clock = fakeClock();
  const t = (x: number) => ({ x, y: 0.5, t: clock.now() });
  const wobble = [t(0.5), t(0.5 + MIN_POINT_STEP / 4), t(0.5 + MIN_POINT_STEP / 3), t(0.5 + MIN_POINT_STEP / 2)];
  const kept = simplifyPoints(wobble);
  assert.deepEqual([kept[0], kept.at(-1)], [wobble[0], wobble[3]]);
  assert.equal(kept.length, 2);

  const sweep = Array.from({ length: 400 }, (_, i) => t(i / 400)); // far more than a message may carry
  const spread = simplifyPoints(sweep);
  assert.equal(spread.length, MAX_POINTER_POINTS);
  assert.deepEqual([spread[0], spread.at(-1)], [sweep[0], sweep[399]]);
  const xs = spread.map((p) => p.x);
  assert.deepEqual(xs, [...xs].sort((a, b) => a - b), 'still in order');
  assert.equal(new Set(xs).size, xs.length, 'no point twice');
  assert.deepEqual(simplifyPoints([t(0.1)]), [t(0.1)]);
  assert.deepEqual(simplifyPoints([]), []);
});

test('however many samples a mouse makes, at most 25 messages a second go out — and none carries more than the limit', () => {
  const { clock, sent, batcher } = batcherSetup();
  // one second of a quick circle sampled at 500 Hz
  for (let i = 0; i < 500; i++) {
    batcher.push('s', 1, { x: 0.5 + 0.2 * Math.cos(i / 20), y: 0.5 + 0.2 * Math.sin(i / 20), t: clock.now() });
    clock.advance(2);
  }
  batcher.flush();
  assert.ok(sent.length <= 1000 / MOVE_INTERVAL_MS + 1, `${sent.length} messages`);
  assert.ok(sent.every((b) => b.points.length <= MAX_POINTER_POINTS));
  assert.ok(sent.every((b) => b.points.every((p) => p.age >= 0 && p.age <= MOVE_INTERVAL_MS + 5)));
  // the circle survives: successive points are never far apart, so it is drawn as a circle
  const all = sent.flatMap((b) => b.points);
  let widest = 0;
  for (let i = 1; i < all.length; i++) widest = Math.max(widest, Math.hypot(all[i].x - all[i - 1].x, all[i].y - all[i - 1].y));
  assert.ok(widest < 0.03, `widest gap ${widest}`);
});

test('cancelling forgets what is waiting and leaves no timer behind', () => {
  const { clock, sent, batcher } = batcherSetup();
  batcher.push('s', null, at(clock, 0.1));
  batcher.push('s', null, at(clock, 0.2)); // waits
  batcher.cancel();
  clock.advance(1000);
  assert.equal(sent.length, 1);
  assert.equal(clock.pending(), 0);
  batcher.flush(); // nothing to send
  assert.equal(sent.length, 1);
});

// ─── What the room remembers ───────────────────────────────────────────────

const TEACHER = 's-teacher';
const SHARE = 's-sharer';
const shares = new Set([SHARE]);
const msg = (wire: PointerWire): PointerMessage => ({ ...wire, fromSessionId: TEACHER });

function setup() {
  const clock = fakeClock();
  const store = new PointerStore(clock);
  let notified = 0;
  store.subscribe(() => notified++);
  const frame = () => store.frame(SHARE, clock.now());
  return { clock, store, frame, notified: () => notified };
}
const move = (x: number, y: number, extra: { k?: number; p?: number[] } = {}) =>
  msg({ type: 'move', sid: SHARE, x, y, ...extra });

test('the dot appears a beat after the teacher moved, and follows the cursor', () => {
  const { store, clock, frame } = setup();
  assert.equal(frame(), null, 'nothing before anyone points');
  store.apply(move(0.2, 0.3), shares);
  assert.equal(frame()?.dot, null, 'not yet: viewers are a beat behind the teacher');
  clock.advance(PLAYOUT_DELAY_MS);
  assert.deepEqual(frame()?.dot, { x: 0.2, y: 0.3 });
  store.apply(move(0.6, 0.7), shares);
  clock.advance(PLAYOUT_DELAY_MS);
  assert.deepEqual(frame()?.dot, { x: 0.6, y: 0.7 });
  assert.equal(store.fromSessionId, TEACHER);
});

test('a message plays back on the sender’s own timing, and the dot glides through it', () => {
  const { store, clock, frame } = setup();
  // three points, 30 ms apart: the first 60 ms before the message was sent
  store.apply(move(0.2, 0.3, { p: [0.1, 0.1, 60, 0.15, 0.2, 30, 0.2, 0.3, 0] }), shares);
  clock.advance(PLAYOUT_DELAY_MS - 60 - 1);
  assert.equal(frame()?.dot, null);
  clock.advance(1); // the first point is due
  assert.deepEqual(frame()?.dot, { x: 0.1, y: 0.1 });
  clock.advance(15); // half way to the second
  const mid = frame()!.dot!;
  assert.ok(Math.abs(mid.x - 0.125) < 1e-9 && Math.abs(mid.y - 0.15) < 1e-9, JSON.stringify(mid));
  clock.advance(15);
  assert.deepEqual(frame()?.dot, { x: 0.15, y: 0.2 });
  clock.advance(30);
  assert.deepEqual(frame()?.dot, { x: 0.2, y: 0.3 });
});

test('messages one after the other join up: the dot never steps, never jumps back and never overshoots', () => {
  const { store, clock, frame } = setup();
  // the cursor moves right at a steady pace; a message of 4 points every 40 ms
  let sent = 0;
  const seen: number[] = [];
  for (let ms = 0; ms < 600; ms++) {
    if (ms % MOVE_INTERVAL_MS === 0) {
      const base = sent * 4;
      store.apply(
        move((base + 3) / 100, 0.5, {
          p: [0, 1, 2, 3].flatMap((i) => [(base + i) / 100, 0.5, Math.round((3 - i) * 10)]),
        }),
        shares,
      );
      sent++;
    }
    const dot = frame()?.dot;
    if (dot) seen.push(dot.x);
    clock.advance(1);
  }
  assert.ok(seen.length > 400);
  for (let i = 1; i < seen.length; i++) {
    assert.ok(seen[i] >= seen[i - 1] - 1e-12, `went back at ${i}`);
    assert.ok(seen[i] - seen[i - 1] < 0.0125, `stepped ${seen[i] - seen[i - 1]} at ${i}`); // a smooth 0.1 per 10 ms at most
  }
  assert.ok(seen.at(-1)! > 0.5, 'and it got there');
});

test('a message that comes late makes the dot wait where it was — it does not jump back, and it moves on when news comes', () => {
  const { store, clock, frame } = setup();
  store.apply(move(0.2, 0.2), shares);
  clock.advance(PLAYOUT_DELAY_MS);
  assert.deepEqual(frame()?.dot, { x: 0.2, y: 0.2 });
  clock.advance(250); // a stall
  assert.deepEqual(frame()?.dot, { x: 0.2, y: 0.2 }, 'waiting, not guessing');
  store.apply(move(0.5, 0.5), shares);
  clock.advance(PLAYOUT_DELAY_MS);
  assert.deepEqual(frame()?.dot, { x: 0.5, y: 0.5 });
});

test('when a stall ends with everything arriving at once, the dot catches up instead of lagging for good', () => {
  const { store, clock, frame } = setup();
  // 20 messages of 40 ms of movement each arrive in the same instant
  for (let i = 0; i < 20; i++) store.apply(move((i + 1) / 20, 0.5, { p: [i / 20, 0.5, 40, (i + 1) / 20, 0.5, 0] }), shares);
  clock.advance(PLAYOUT_DELAY_MS + MAX_BACKLOG_MS + 20);
  assert.deepEqual(frame()?.dot, { x: 1, y: 0.5 }, 'everything has been shown');
  // and the next message plays back with the usual delay, not behind what was missed
  store.apply(move(0.1, 0.9), shares);
  clock.advance(PLAYOUT_DELAY_MS);
  assert.deepEqual(frame()?.dot, { x: 0.1, y: 0.9 });
});

test('after a catch-up the line carries on in time order — nothing is stamped before what is already shown', () => {
  const { store, clock, frame } = setup();
  // enough bunched-up messages to need catching up (each is queued after the one before)
  for (let i = 0; i < 14; i++) store.apply(move((i + 1) / 40, 0.5, { k: 1, p: [i / 40, 0.5, 40, (i + 1) / 40, 0.5, 0] }), shares);
  clock.advance(5);
  for (let i = 14; i < 20; i++) store.apply(move((i + 1) / 40, 0.5, { k: 1, p: [i / 40, 0.5, 40, (i + 1) / 40, 0.5, 0] }), shares);
  clock.advance(PLAYOUT_DELAY_MS + MAX_BACKLOG_MS);
  const times = frame()!.strokes.flatMap((stroke) => stroke.points.map((p) => p.t));
  assert.ok(times.length >= 10, 'the line is showing');
  for (let i = 1; i < times.length; i++) assert.ok(times[i] >= times[i - 1], `went back in time at ${i}`);
  assert.ok(Math.max(...times) <= clock.now(), 'and nothing is stamped in the future');
});

test('the line is drawn only while the button is held, and only from the points that were played', () => {
  const { store, clock, frame } = setup();
  store.apply(move(0.1, 0.1), shares); // just moving: no line
  clock.advance(PLAYOUT_DELAY_MS);
  assert.deepEqual(frame()?.strokes, []);
  assert.equal(frame()?.activeStroke, null);

  store.apply(move(0.3, 0.1, { k: 1, p: [0.2, 0.1, 40, 0.3, 0.1, 0] }), shares);
  clock.advance(PLAYOUT_DELAY_MS - 40 - 1);
  assert.equal(frame()?.strokes.length, 0, 'the first point of the line is not due yet');
  clock.advance(41);
  const f = frame()!;
  assert.equal(f.strokes.length, 1);
  assert.deepEqual(f.strokes[0].points.map((p) => [p.x, p.y]), [[0.2, 0.1], [0.3, 0.1]]);
  assert.equal(f.activeStroke, f.strokes[0], 'the dot is the head of the line being drawn');
});

test('the button coming up ends the line: the next moves draw nothing, and the next press is another line', () => {
  const { store, clock, frame } = setup();
  store.apply(move(0.2, 0.2, { k: 1 }), shares);
  store.apply(move(0.3, 0.2, { k: 1 }), shares);
  clock.advance(PLAYOUT_DELAY_MS);
  store.apply(move(0.4, 0.2), shares); // released, moving on
  clock.advance(PLAYOUT_DELAY_MS);
  let f = frame()!;
  assert.equal(f.strokes.length, 1);
  assert.equal(f.strokes[0].points.length, 2, 'the plain move was not added to the line');
  assert.equal(f.activeStroke, null);

  store.apply(move(0.8, 0.8, { k: 2 }), shares);
  store.apply(move(0.9, 0.8, { k: 2 }), shares);
  clock.advance(PLAYOUT_DELAY_MS + 10);
  f = frame()!;
  assert.equal(f.strokes.length, 2, 'two separate lines — never joined by a stroke across the screen');
  assert.deepEqual(f.strokes[1].points.map((p) => p.x), [0.8, 0.9]);
});

test('a line fades away: each point is gone TRAIL_MS after it was drawn, the line goes when its last point does', () => {
  const { store, clock, frame } = setup();
  store.apply(move(0.2, 0.2, { k: 1 }), shares);
  clock.advance(100);
  store.apply(move(0.3, 0.2, { k: 1 }), shares);
  clock.advance(PLAYOUT_DELAY_MS);
  assert.equal(frame()!.strokes[0].points.length, 2);
  // the first point was drawn at +70 (the beat), the second at +170
  clock.advance(TRAIL_MS - 100 - 1); // +739: the first is one ms from its end
  assert.equal(frame()!.strokes[0].points.length, 2);
  clock.advance(2); // +741 > 70 + 700: the first is gone
  assert.deepEqual(frame()!.strokes[0].points.map((p) => p.x), [0.3]);
  clock.advance(100);
  assert.deepEqual(frame()!.strokes, [], 'nothing of it is left');
  assert.equal(frame()!.animating, false, 'and no more frames are needed');
});

test('a line that goes on being drawn after a pause carries on in the same line, and what faded before it is gone', () => {
  const { store, clock, frame } = setup();
  store.apply(move(0.2, 0.2, { k: 1 }), shares);
  clock.advance(TRAIL_MS * 2); // the button is still held, the cursor still
  assert.deepEqual(frame()!.strokes, [], 'nothing visible');
  store.apply(move(0.25, 0.2, { k: 1 }), shares);
  clock.advance(PLAYOUT_DELAY_MS);
  const f = frame()!;
  assert.equal(f.strokes.length, 1);
  assert.deepEqual(f.strokes[0].points.map((p) => p.x), [0.25]);
});

test('a click makes a ring at the spot, once the dot has got there, and it is gone after RING_MS', () => {
  const { store, clock, frame } = setup();
  store.apply(move(0.4, 0.4), shares);
  store.apply(msg({ type: 'click', sid: SHARE, x: 0.4, y: 0.4 }), shares);
  assert.equal(frame()!.rings.length, 0, 'a beat behind the click, like the dot');
  clock.advance(PLAYOUT_DELAY_MS);
  const f = frame()!;
  assert.equal(f.rings.length, 1);
  assert.deepEqual([f.rings[0].x, f.rings[0].y], [0.4, 0.4]);
  assert.deepEqual(f.dot, { x: 0.4, y: 0.4 });
  const start = f.rings[0].start;
  clock.advance(RING_MS - 100);
  assert.equal(frame()!.rings.length, 1, 'still showing');
  assert.ok(clock.now() - start < RING_MS);
  clock.advance(200);
  assert.equal(frame()!.rings.length, 0, 'gone');
  assert.equal(frame()!.animating, false);
});

test('a ring is not drawn before the moves that led to the click', () => {
  const { store, clock, frame } = setup();
  store.apply(move(0.9, 0.9, { p: [0.1, 0.1, 30, 0.9, 0.9, 0] }), shares);
  store.apply(msg({ type: 'click', sid: SHARE, x: 0.9, y: 0.9 }), shares);
  clock.advance(PLAYOUT_DELAY_MS - 10);
  const f = frame()!;
  assert.equal(f.rings.length, 0);
  assert.ok(f.dot && f.dot.x > 0.1, 'the dot is on its way');
  clock.advance(10);
  assert.equal(frame()!.rings.length, 1);
  assert.deepEqual(frame()!.dot, { x: 0.9, y: 0.9 });
});

test('a burst of clicks shows a few rings at most, and each goes in its own time', () => {
  const { store, clock, frame } = setup();
  for (let i = 0; i < MAX_RINGS + 3; i++) {
    store.apply(msg({ type: 'click', sid: SHARE, x: i / 10, y: 0.5 }), shares);
    clock.advance(10);
  }
  clock.advance(PLAYOUT_DELAY_MS);
  assert.equal(frame()!.rings.length, MAX_RINGS);
  clock.advance(RING_MS + 200);
  assert.equal(frame()!.rings.length, 0);
});

test('the dot hides when the cursor leaves the picture — after the moves that took it there — and a line already drawn fades out by itself', () => {
  const { store, clock, frame } = setup();
  store.apply(move(0.2, 0.2, { k: 1 }), shares);
  clock.advance(40);
  store.apply(move(0.9, 0.2, { k: 1 }), shares);
  clock.advance(40);
  store.apply(msg({ type: 'hide', sid: SHARE }), shares); // due a beat after it arrived: +80 + 70
  clock.advance(PLAYOUT_DELAY_MS - 1);
  assert.deepEqual(frame()!.dot, { x: 0.9, y: 0.2 }, 'still showing where the cursor left: the hide is a beat behind too');
  clock.advance(1);
  const f = frame()!;
  assert.equal(f.dot, null);
  assert.equal(f.activeStroke, null, 'nothing is being drawn any more');
  assert.equal(f.strokes.length, 1, 'what was drawn is left to fade');
  store.apply(move(0.5, 0.5, { k: 2 }), shares); // back, button still held
  clock.advance(PLAYOUT_DELAY_MS);
  assert.deepEqual(frame()!.dot, { x: 0.5, y: 0.5 });
  assert.equal(frame()!.strokes.length, 2, 'a new line, not a stroke across the bar');
});

test('the teacher’s own screen shows things at once, as they happen — not a beat late', () => {
  const { store, clock, frame } = setup();
  store.apply(move(0.3, 0.3, { k: 1 }), shares, { local: true });
  clock.advance(5);
  store.apply(move(0.35, 0.3, { k: 1 }), shares, { local: true });
  const f = frame()!;
  assert.deepEqual(f.dot, { x: 0.35, y: 0.3 });
  assert.equal(f.strokes[0].points.length, 2);
  store.apply(msg({ type: 'click', sid: SHARE, x: 0.35, y: 0.3 }), shares, { local: true });
  assert.equal(frame()!.rings.length, 1);
  store.apply(msg({ type: 'hide', sid: SHARE }), shares, { local: true });
  assert.equal(frame()!.dot, null);
});

test('a local point carries its own time, so a line drawn from the points of one animation frame keeps their spacing', () => {
  const { store, clock, frame } = setup();
  const t0 = clock.now();
  for (const [dt, x] of [[-12, 0.1], [-8, 0.2], [-4, 0.3], [0, 0.4]] as const) {
    store.apply(move(x, 0.5, { k: 1 }), shares, { local: true, at: t0 + dt });
  }
  const times = frame()!.strokes[0].points.map((p) => p.t - t0);
  assert.deepEqual(times, [-12, -8, -4, 0]);
  // a point that claims to be older than the last one is not allowed to go back in time
  store.apply(move(0.5, 0.5, { k: 1 }), shares, { local: true, at: t0 - 50 });
  assert.equal(frame()!.strokes[0].points.at(-1)!.t, t0);
});

test('only a screen that is being shared by a student can be pointed at', () => {
  const { store, notified } = setup();
  store.apply(move(0.5, 0.5), new Set(['s-somebody-else']));
  store.apply(msg({ type: 'click', sid: 's-the-teachers-own', x: 0.5, y: 0.5 }), shares);
  assert.equal(store.frame(SHARE, 5_000), null);
  assert.equal(store.frame('s-the-teachers-own', 5_000), null);
  assert.equal(notified(), 0);
});

test('"off" takes everything down — dot, lines, rings and what is still on its way', () => {
  const { store, clock, frame } = setup();
  store.apply(move(0.5, 0.5, { k: 1 }), shares);
  store.apply(msg({ type: 'click', sid: SHARE, x: 0.5, y: 0.5 }), shares);
  clock.advance(PLAYOUT_DELAY_MS / 2); // part of it is still on its way
  store.apply(msg({ type: 'off' }), shares);
  assert.equal(frame(), null);
  clock.advance(5_000);
  assert.equal(frame(), null, 'what was on its way never arrives');
  assert.equal(store.fromSessionId, null);
  assert.equal(clock.pending(), 0, 'no timer is left running');
});

test('when the presenter stops sharing or leaves, the Pointer over their screen goes', () => {
  const { store, clock } = setup();
  const two = new Set([SHARE, 's-other-sharer']);
  store.apply(move(0.5, 0.5), two);
  store.apply(msg({ type: 'move', sid: 's-other-sharer', x: 0.1, y: 0.1 }), two);
  clock.advance(PLAYOUT_DELAY_MS);
  store.prune(new Set(['s-other-sharer']));
  assert.equal(store.frame(SHARE, clock.now()), null);
  assert.deepEqual(store.frame('s-other-sharer', clock.now())?.dot, { x: 0.1, y: 0.1 });
  store.prune(new Set()); // nobody presents any more
  assert.equal(store.frame('s-other-sharer', clock.now()), null);
  assert.equal(store.fromSessionId, null);
  assert.equal(clock.pending(), 0);
});

test('when the teacher leaves with the dot showing, it goes', () => {
  const { store, clock, frame } = setup();
  store.apply(move(0.5, 0.5), shares);
  clock.advance(PLAYOUT_DELAY_MS);
  store.dropIfGone(new Set([TEACHER, SHARE])); // still here
  assert.ok(frame()?.dot);
  store.dropIfGone(new Set([SHARE, 's-student'])); // the teacher's connection is gone
  assert.equal(frame(), null);
});

test('a dot that has heard nothing for a long while is taken down, and any update keeps it up', () => {
  const { store, clock, frame } = setup();
  store.apply(move(0.5, 0.5), shares);
  clock.advance(STALE_MS - 1_000);
  store.apply(move(0.5, 0.5), shares); // a heartbeat
  clock.advance(STALE_MS - 1_000);
  assert.ok(frame()?.dot);
  clock.advance(2_000);
  assert.equal(frame(), null);
});

test('frames are only asked for while something moves or fades', () => {
  const { store, clock, frame } = setup();
  store.apply(move(0.5, 0.5), shares);
  assert.equal(frame()!.animating, true, 'on its way');
  clock.advance(PLAYOUT_DELAY_MS);
  assert.equal(frame()!.animating, false, 'a dot that is only sitting there needs no frames');
  store.apply(move(0.6, 0.5, { k: 1 }), shares);
  clock.advance(PLAYOUT_DELAY_MS);
  assert.equal(frame()!.animating, true, 'a line is fading');
  clock.advance(TRAIL_MS + 10);
  assert.equal(frame()!.animating, false);
});

test('nothing is announced for a change that changes nothing', () => {
  const { store, notified } = setup();
  store.prune(shares);
  store.dropIfGone(new Set());
  store.apply(msg({ type: 'hide', sid: SHARE }), shares); // nothing was showing
  store.apply(msg({ type: 'off' }), shares);
  store.clear();
  assert.equal(notified(), 0);
});

test('a listener hears of each change, and none after it unsubscribes', () => {
  const clock = fakeClock();
  const store = new PointerStore(clock);
  let heard = 0;
  const off = store.subscribe(() => heard++);
  store.apply(move(0.1, 0.1), shares);
  store.apply(move(0.2, 0.2), shares);
  assert.equal(heard, 2);
  off();
  store.apply(move(0.3, 0.3), shares);
  assert.equal(heard, 2);
});

test('what waits to be played back stays small however long nobody draws', () => {
  const { store, clock } = setup();
  // a hidden tab: messages keep arriving, no frame is ever asked for
  for (let i = 0; i < 5_000; i++) {
    store.apply(move((i % 100) / 100, 0.5, { k: 1 }), shares);
    clock.advance(40);
  }
  clock.advance(PLAYOUT_DELAY_MS);
  const f = store.frame(SHARE, clock.now())!;
  assert.ok(f.strokes.every((stroke) => stroke.points.length <= 1_000));
  assert.ok(f.strokes.length <= 1, 'old points have faded');
});

test('whatever order messages come in — late, bunched, out of order, hostile — the store keeps its promises', () => {
  // a small seeded generator, so a failure can be reproduced
  let seed = 123_456_789;
  const random = () => {
    seed = (seed * 1_664_525 + 1_013_904_223) % 4_294_967_296;
    return seed / 4_294_967_296;
  };
  const pick = <T,>(items: readonly T[]) => items[Math.floor(random() * items.length)];
  for (let run = 0; run < 60; run++) {
    const clock = fakeClock();
    const store = new PointerStore(clock);
    let lastFrameAt = clock.now();
    for (let step = 0; step < 300; step++) {
      clock.advance(Math.floor(random() * (random() < 0.1 ? 600 : 50)));
      const roll = random();
      if (roll < 0.55) {
        const count = 1 + Math.floor(random() * 30);
        const p: number[] = [];
        for (let i = 0; i < count; i++) p.push(random(), random(), Math.floor(random() * (random() < 0.2 ? 1_200 : 60))); // ages in any order
        store.apply(msg({ type: 'move', sid: SHARE, x: random(), y: random(), ...(random() < 0.5 ? { k: 1 + Math.floor(random() * 3) } : {}), ...(random() < 0.7 ? { p } : {}) }), shares, random() < 0.2 ? { local: true } : {});
      } else if (roll < 0.7) store.apply(msg({ type: 'click', sid: SHARE, x: random(), y: random() }), shares, random() < 0.2 ? { local: true } : {});
      else if (roll < 0.8) store.apply(msg({ type: 'hide', sid: SHARE }), shares, random() < 0.2 ? { local: true } : {});
      else if (roll < 0.83) store.apply(msg({ type: 'off' }), shares);
      else if (roll < 0.85) store.prune(pick([new Set<string>(), shares]));
      else if (roll < 0.87) store.dropIfGone(pick([new Set<string>(), new Set([TEACHER])]));

      if (random() < 0.7) {
        const now = clock.now();
        assert.ok(now >= lastFrameAt);
        lastFrameAt = now;
        const f = store.frame(SHARE, now);
        if (!f) continue;
        if (f.dot) assert.ok(Number.isFinite(f.dot.x) && Number.isFinite(f.dot.y) && f.dot.x >= 0 && f.dot.x <= 1 && f.dot.y >= 0 && f.dot.y <= 1, 'the dot stays on the picture');
        assert.ok(f.rings.length <= MAX_RINGS);
        for (const stroke of f.strokes) {
          assert.ok(stroke.points.length > 0 && stroke.points.length <= 1_000);
          for (let i = 0; i < stroke.points.length; i++) {
            assert.ok(stroke.points[i].t >= now - TRAIL_MS, 'nothing older than the fade is kept');
            if (i > 0) assert.ok(stroke.points[i].t >= stroke.points[i - 1].t, 'a line goes forward in time');
          }
        }
        if (f.activeStroke) assert.ok(f.strokes.includes(f.activeStroke));
        if (!f.animating) assert.ok(f.strokes.length === 0 && f.rings.length === 0, 'no frames asked for while something is still showing');
        for (const ring of f.rings) assert.ok(now - ring.start < RING_MS);
      }
    }
    store.apply(msg({ type: 'off' }), shares);
    assert.equal(clock.pending(), 0, 'nothing left running');
  }
});
