import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_PULSES,
  MOVE_INTERVAL_MS,
  MoveThrottle,
  PULSE_MS,
  PointerStore,
  STALE_MS,
  containedRect,
  fromNormalized,
  toNormalized,
} from './pointer.ts';
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

test('a stream of moves goes out at a steady pace — the first at once, the latest each time, the last one always', () => {
  const clock = fakeClock();
  const sent: number[] = [];
  const throttle = new MoveThrottle<number>({ intervalMs: MOVE_INTERVAL_MS, send: (v) => sent.push(v), ...clock });
  throttle.push(1); // at once
  assert.deepEqual(sent, [1]);
  clock.advance(10);
  throttle.push(2);
  clock.advance(10);
  throttle.push(3); // replaces 2
  assert.deepEqual(sent, [1]);
  clock.advance(MOVE_INTERVAL_MS); // the interval is over
  assert.deepEqual(sent, [1, 3]);
  // a cursor that then stops is reported where it stopped
  clock.advance(5);
  throttle.push(4);
  clock.advance(MOVE_INTERVAL_MS * 2);
  assert.deepEqual(sent, [1, 3, 4]);
  assert.equal(clock.pending(), 0);
});

test('a move after a quiet spell goes out at once', () => {
  const clock = fakeClock();
  const sent: number[] = [];
  const throttle = new MoveThrottle<number>({ intervalMs: MOVE_INTERVAL_MS, send: (v) => sent.push(v), ...clock });
  throttle.push(1);
  clock.advance(500);
  throttle.push(2);
  assert.deepEqual(sent, [1, 2]);
});

test('flushing sends what is waiting now, and cancelling forgets it', () => {
  const clock = fakeClock();
  const sent: number[] = [];
  const throttle = new MoveThrottle<number>({ intervalMs: MOVE_INTERVAL_MS, send: (v) => sent.push(v), ...clock });
  throttle.push(1);
  throttle.push(2); // within the interval: waits
  throttle.flush();
  assert.deepEqual(sent, [1, 2]);
  throttle.push(3); // the flush restarted the interval, so this waits too
  throttle.push(4);
  throttle.cancel();
  clock.advance(1000);
  assert.deepEqual(sent, [1, 2]); // 3 and 4 were forgotten, and no timer is left behind
  assert.equal(clock.pending(), 0);
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
  return { clock, store, notified: () => notified };
}

test('the dot follows the cursor over the shared screen, and hides when the cursor leaves the picture', () => {
  const { store } = setup();
  assert.equal(store.getSnapshot().byShare[SHARE], undefined);
  store.apply(msg({ type: 'move', sid: SHARE, x: 0.2, y: 0.3 }), shares);
  assert.deepEqual(store.getSnapshot().byShare[SHARE], { x: 0.2, y: 0.3, visible: true, pulses: [] });
  store.apply(msg({ type: 'move', sid: SHARE, x: 0.6, y: 0.7 }), shares);
  assert.equal(store.getSnapshot().byShare[SHARE].x, 0.6);
  store.apply(msg({ type: 'hide', sid: SHARE }), shares);
  assert.equal(store.getSnapshot().byShare[SHARE].visible, false);
  assert.equal(store.getSnapshot().fromSessionId, TEACHER);
});

test('a click makes a ring that is gone by itself after a moment', () => {
  const { store, clock } = setup();
  store.apply(msg({ type: 'click', sid: SHARE, x: 0.4, y: 0.4 }), shares);
  const state = store.getSnapshot().byShare[SHARE];
  assert.equal(state.pulses.length, 1);
  assert.deepEqual([state.pulses[0].x, state.pulses[0].y], [0.4, 0.4]);
  clock.advance(PULSE_MS - 100);
  assert.equal(store.getSnapshot().byShare[SHARE].pulses.length, 1, 'still pulsing');
  clock.advance(200);
  assert.equal(store.getSnapshot().byShare[SHARE].pulses.length, 0, 'gone');
});

test('a burst of clicks shows a few rings at most, and each goes in its own time', () => {
  const { store, clock } = setup();
  for (let i = 0; i < MAX_PULSES + 3; i++) {
    store.apply(msg({ type: 'click', sid: SHARE, x: i / 10, y: 0.5 }), shares);
    clock.advance(10);
  }
  assert.equal(store.getSnapshot().byShare[SHARE].pulses.length, MAX_PULSES);
  clock.advance(PULSE_MS + 200);
  assert.equal(store.getSnapshot().byShare[SHARE].pulses.length, 0);
});

test('only a screen that is being shared by a student can be pointed at', () => {
  const { store, notified } = setup();
  store.apply(msg({ type: 'move', sid: 's-somebody-else', x: 0.5, y: 0.5 }), shares);
  store.apply(msg({ type: 'click', sid: 's-the-teachers-own', x: 0.5, y: 0.5 }), shares);
  assert.deepEqual(store.getSnapshot().byShare, {});
  assert.equal(notified(), 0);
});

test('"off" takes everything down — dot, rings and all', () => {
  const { store, clock } = setup();
  store.apply(msg({ type: 'move', sid: SHARE, x: 0.5, y: 0.5 }), shares);
  store.apply(msg({ type: 'click', sid: SHARE, x: 0.5, y: 0.5 }), shares);
  store.apply(msg({ type: 'off' }), shares);
  assert.deepEqual(store.getSnapshot(), { byShare: {}, fromSessionId: null });
  assert.equal(clock.pending(), 0, 'no timer is left running');
});

test('when the presenter stops sharing or leaves, the Pointer over their screen goes', () => {
  const { store } = setup();
  const two = new Set([SHARE, 's-other-sharer']);
  store.apply(msg({ type: 'move', sid: SHARE, x: 0.5, y: 0.5 }), two);
  store.apply(msg({ type: 'move', sid: 's-other-sharer', x: 0.1, y: 0.1 }), two);
  store.prune(new Set(['s-other-sharer']));
  assert.deepEqual(Object.keys(store.getSnapshot().byShare), ['s-other-sharer']);
  store.prune(new Set()); // nobody presents any more
  assert.deepEqual(store.getSnapshot(), { byShare: {}, fromSessionId: null });
});

test('when the teacher leaves with the dot showing, it goes', () => {
  const { store } = setup();
  store.apply(msg({ type: 'move', sid: SHARE, x: 0.5, y: 0.5 }), shares);
  store.dropIfGone(new Set([TEACHER, SHARE])); // still here
  assert.equal(store.getSnapshot().byShare[SHARE].visible, true);
  store.dropIfGone(new Set([SHARE, 's-student'])); // the teacher's connection is gone
  assert.deepEqual(store.getSnapshot(), { byShare: {}, fromSessionId: null });
});

test('a dot that has heard nothing for a long while is taken down, and any update keeps it up', () => {
  const { store, clock } = setup();
  store.apply(msg({ type: 'move', sid: SHARE, x: 0.5, y: 0.5 }), shares);
  clock.advance(STALE_MS - 1_000);
  store.apply(msg({ type: 'move', sid: SHARE, x: 0.5, y: 0.5 }), shares); // a heartbeat
  clock.advance(STALE_MS - 1_000);
  assert.equal(store.getSnapshot().byShare[SHARE].visible, true);
  clock.advance(2_000);
  assert.deepEqual(store.getSnapshot(), { byShare: {}, fromSessionId: null });
});

test('nothing re-renders for a change that changes nothing', () => {
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
  store.apply(msg({ type: 'move', sid: SHARE, x: 0.1, y: 0.1 }), shares);
  store.apply(msg({ type: 'move', sid: SHARE, x: 0.2, y: 0.2 }), shares);
  assert.equal(heard, 2);
  off();
  store.apply(msg({ type: 'move', sid: SHARE, x: 0.3, y: 0.3 }), shares);
  assert.equal(heard, 2);
});
