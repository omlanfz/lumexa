import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EYE_LINE,
  FACE_WIDTH_SHARE,
  FULL_FRAME,
  FramingController,
  HEADROOM_FACES,
  MAX_ZOOM,
  RELAX_AFTER_MS,
  cropOf,
  framingForFace,
  smoothDamp,
} from './framing.ts';
import type { FaceBox, Framing } from './framing.ts';

const face = (cx: number, cy: number, w: number, h = w * 1.25): FaceBox => ({ x: cx - w / 2, y: cy - h / 2, w, h });

function inside(f: Framing): boolean {
  const c = cropOf(f);
  return c.x >= -1e-9 && c.y >= -1e-9 && c.x + c.size <= 1 + 1e-9 && c.y + c.size <= 1 + 1e-9;
}

/** Runs the controller at ~30 fps for `seconds`, looking for the face ~10 times a second. */
function run(
  controller: FramingController,
  clock: { t: number },
  seconds: number,
  faceAt: (t: number) => FaceBox | null,
  onStep?: (f: Framing) => void,
) {
  const frames = Math.round(seconds * 30);
  for (let i = 0; i < frames; i++) {
    clock.t += 1000 / 30;
    if (i % 3 === 0) {
      const f = faceAt(clock.t);
      if (f) controller.observe(f, clock.t);
    }
    const framing = controller.step(clock.t);
    onStep?.(framing);
  }
}

test('a person sitting in the middle of a normal webcam picture is zoomed in gently, not close-up', () => {
  const framing = framingForFace(face(0.5, 0.45, 0.2));
  assert.ok(framing.zoom > 1.1 && framing.zoom < 1.4, `zoom ${framing.zoom}`);
  const crop = cropOf(framing);
  // the face is about a quarter of the picture's width…
  assert.ok(Math.abs(0.2 / crop.size - FACE_WIDTH_SHARE) < 0.01);
  // …and sits where the eye line says
  const faceFromTop = (0.45 - crop.y) / crop.size;
  assert.ok(Math.abs(faceFromTop - EYE_LINE) < 0.02 || crop.y === 0, `face ${faceFromTop} down the picture`);
  assert.ok(inside(framing));
});

test('a face that already fills the picture needs no zoom, and a far-off one is never a close-up', () => {
  assert.equal(framingForFace(face(0.5, 0.5, 0.4)).zoom, 1);
  assert.equal(framingForFace(face(0.5, 0.5, 0.05)).zoom, MAX_ZOOM);
});

test('the head is never cut off, wherever the person is', () => {
  for (const f of [face(0.5, 0.2, 0.2), face(0.5, 0.12, 0.18), face(0.15, 0.3, 0.2), face(0.9, 0.5, 0.15), face(0.5, 0.85, 0.22)]) {
    const framing = framingForFace(f);
    const crop = cropOf(framing);
    assert.ok(inside(framing), JSON.stringify(f));
    // the top of the hair (a little above the face box) is in the picture — unless the frame itself ends there
    const hairTop = Math.max(0, f.y - HEADROOM_FACES * f.h);
    assert.ok(crop.y <= hairTop + 1e-9, `crop top ${crop.y} vs hair ${hairTop} for ${JSON.stringify(f)}`);
    // and the whole face is in it sideways
    assert.ok(crop.x <= f.x + 1e-9 && crop.x + crop.size >= f.x + f.w - 1e-9, `sideways for ${JSON.stringify(f)}`);
  }
});

test('whatever it is given, the camera looks inside the frame', () => {
  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 500; i++) {
    const w = 0.03 + rand() * 0.5;
    const f = face(rand(), rand(), w, w * (1 + rand() * 0.5));
    assert.ok(inside(framingForFace(f)), JSON.stringify(f));
  }
  assert.ok(inside({ cx: -3, cy: 9, zoom: 99 }));
});

test('smooth damping arrives without overshoot, and without a jump', () => {
  let value = 0;
  let velocity = 0;
  let peak = 0;
  let biggestStep = 0;
  for (let i = 0; i < 150; i++) {
    const next = smoothDamp(value, 1, velocity, 0.5, 10, 1 / 30);
    biggestStep = Math.max(biggestStep, next.value - value);
    value = next.value;
    velocity = next.velocity;
    peak = Math.max(peak, value);
  }
  assert.ok(peak <= 1 + 1e-9, `overshot to ${peak}`);
  assert.ok(Math.abs(value - 1) < 1e-3, `settled at ${value}`);
  assert.ok(biggestStep < 0.2, `a step of ${biggestStep} is a jump, not a glide`);
});

test('the camera starts on the whole frame and a still person settles it, then it stays perfectly still', () => {
  const controller = new FramingController();
  const clock = { t: 0 };
  assert.deepEqual(controller.step(0), FULL_FRAME);
  const seen: Framing[] = [];
  run(controller, clock, 6, () => face(0.5, 0.45, 0.2), (f) => seen.push(f));
  const wanted = framingForFace(face(0.5, 0.45, 0.2));
  const end = controller.framing;
  assert.ok(Math.abs(end.zoom - wanted.zoom) < 0.01 && Math.abs(end.cx - wanted.cx) < 0.01, `settled at ${JSON.stringify(end)}, wanted ${JSON.stringify(wanted)}`);
  // …and the last seconds do not move at all
  const lastSecond = seen.slice(-30);
  const spread = Math.max(...lastSecond.map((f) => f.cx)) - Math.min(...lastSecond.map((f) => f.cx));
  assert.ok(spread < 1e-3, `drifted ${spread}`);
});

test('detector jitter and small movements do not move the camera', () => {
  const controller = new FramingController();
  const clock = { t: 0 };
  run(controller, clock, 5, () => face(0.5, 0.45, 0.2));
  const settled = controller.framing;
  let seed = 3;
  const jitter = () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5);
  const seen: Framing[] = [];
  // a person fidgeting: a couple of per cent here and there, a nod, a lean
  run(
    controller,
    clock,
    8,
    (t) => face(0.5 + jitter() * 0.03 + Math.sin(t / 700) * 0.02, 0.45 + jitter() * 0.03, 0.2 + jitter() * 0.015),
    (f) => seen.push(f),
  );
  const driftX = Math.max(...seen.map((f) => Math.abs(f.cx - settled.cx)));
  const driftZ = Math.max(...seen.map((f) => Math.abs(f.zoom - settled.zoom)));
  assert.ok(driftX < 0.01 && driftZ < 0.02, `moved ${driftX.toFixed(4)} sideways, ${driftZ.toFixed(4)} in zoom`);
});

test('a glimpse of the face somewhere else does not move it; settling there does — smoothly', () => {
  const controller = new FramingController();
  const clock = { t: 0 };
  run(controller, clock, 5, () => face(0.4, 0.45, 0.2));
  const before = controller.framing;
  // one stray reading far away (a mis-detection)
  controller.observe(face(0.8, 0.5, 0.2), clock.t);
  run(controller, clock, 2, () => face(0.4, 0.45, 0.2));
  assert.ok(Math.abs(controller.framing.cx - before.cx) < 0.01, 'a single stray reading moved the camera');

  // now the person really moves to the right and stays
  const steps: number[] = [];
  let last = controller.framing.cx;
  run(controller, clock, 6, () => face(0.62, 0.45, 0.2), (f) => {
    steps.push(Math.abs(f.cx - last));
    last = f.cx;
  });
  const wanted = framingForFace(face(0.62, 0.45, 0.2));
  assert.ok(Math.abs(controller.framing.cx - wanted.cx) < 0.01, `ended at ${controller.framing.cx}, wanted ${wanted.cx}`);
  assert.ok(Math.max(...steps) < 0.02, `a frame moved the picture by ${Math.max(...steps)}`);
});

test('a lost face is waited for — and only after a long while does the picture ease out to the whole frame', () => {
  const controller = new FramingController();
  const clock = { t: 0 };
  run(controller, clock, 5, () => face(0.5, 0.45, 0.2));
  const framed = controller.framing;
  assert.ok(framed.zoom > 1.1);
  // a hand over the face for a few seconds: nothing moves
  run(controller, clock, 5, () => null);
  assert.ok(Math.abs(controller.framing.zoom - framed.zoom) < 0.005, 'moved while the face was only briefly lost');
  // gone for good
  run(controller, clock, (RELAX_AFTER_MS - 5_000) / 1000 + 6, () => null);
  assert.ok(controller.framing.zoom < 1.02, `still at ${controller.framing.zoom}`);
  assert.ok(controller.settled);
  // and when the person comes back it frames them again
  run(controller, clock, 5, () => face(0.5, 0.45, 0.2));
  assert.ok(controller.framing.zoom > 1.1);
});

test('turning auto-framing off eases back out instead of snapping', () => {
  const controller = new FramingController();
  const clock = { t: 0 };
  run(controller, clock, 5, () => face(0.5, 0.45, 0.2));
  assert.equal(controller.settled, false);
  controller.release();
  const zooms: number[] = [];
  run(controller, clock, 4, () => null, (f) => zooms.push(f.zoom));
  assert.ok(zooms[0] > zooms[zooms.length - 1], 'it did not move out');
  assert.ok(Math.max(...zooms.slice(1).map((z, i) => zooms[i] - z)) < 0.03, 'it snapped');
  assert.ok(controller.settled);
});

test('a camera that is stepped with a long gap in time does not leap', () => {
  const controller = new FramingController();
  controller.observe(face(0.5, 0.45, 0.2), 0);
  controller.step(0);
  const after = controller.step(60_000); // the tab was asleep for a minute
  assert.ok(Math.abs(after.zoom - 1) < 0.1, 'a long frame gap must not be treated as a long time of movement');
});
