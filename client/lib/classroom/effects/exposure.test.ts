import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ExposureController,
  MAX_GAIN,
  TARGET_LUMA,
  desiredGain,
  desiredLift,
  downsampleRgba,
  linearToSrgb,
  meterLuma,
  srgbToLinear,
} from './exposure.ts';

test('sRGB and linear light convert both ways', () => {
  for (const v of [0, 0.02, 0.2, 0.47, 0.8, 1]) assert.ok(Math.abs(linearToSrgb(srgbToLinear(v)) - v) < 1e-9);
  assert.ok(Math.abs(srgbToLinear(0.5) - 0.214) < 0.001);
});

test('a well-lit picture is left alone; a dim one is brightened, up to a limit', () => {
  assert.equal(desiredGain(0.2, 0), 1, 'off means off');
  // already well lit: nothing but the hint of brightness the slider always gives
  const wellLit = desiredGain(0.55, 1);
  assert.ok(wellLit > 1 && wellLit < 1.1, `${wellLit}`);
  assert.ok(desiredGain(0.3, 1) > 1.3);
  assert.ok(desiredGain(0.15, 1) <= MAX_GAIN * 1.09, 'never past the limit');
  // darker people get more
  let previous = Infinity;
  for (const y of [0.1, 0.2, 0.3, 0.4, 0.5, 0.6]) {
    const g = desiredGain(y, 1);
    assert.ok(g <= previous + 1e-12, `gain should not rise with brightness (${y})`);
    previous = g;
  }
});

test('a nearly black picture is not amplified into noise', () => {
  assert.ok(desiredGain(0.04, 1) <= 1.6 * 1.09);
  assert.ok(desiredGain(0.0, 1) <= 1.6 * 1.09);
});

test('brightening a dim face brings it to a normal level and not past it', () => {
  for (const y of [0.18, 0.25, 0.32, 0.4]) {
    const after = linearToSrgb(srgbToLinear(y) * desiredGain(y, 1));
    assert.ok(after <= TARGET_LUMA + 0.07, `${y} → ${after.toFixed(3)} is brighter than a face should be`);
    assert.ok(after > y, `${y} was not brightened`);
  }
});

test('the strength is how much of the way: half the strength, about half the stops', () => {
  const full = Math.log2(desiredGain(0.2, 1));
  const half = Math.log2(desiredGain(0.2, 0.5));
  assert.ok(Math.abs(half - full / 2) < 0.03, `${half} vs ${full / 2}`);
  assert.ok(desiredGain(0.2, 7) === desiredGain(0.2, 1), 'strength is clamped');
  assert.ok(desiredGain(0.2, -1) === 1);
});

test('shadows are lifted for a dark person, and not for one in good light', () => {
  assert.ok(desiredLift(0.15, 1) > 0.07);
  assert.equal(desiredLift(0.6, 1), 0);
  assert.equal(desiredLift(0.15, 0), 0);
});

/** Drives a controller for `seconds` at 30 fps, with a new reading five times a second. */
function drive(c: ExposureController, clock: { t: number }, seconds: number, y: (t: number) => number, strength = 1) {
  const out: { gain: number; lift: number }[] = [];
  const frames = Math.round(seconds * 30);
  for (let i = 0; i < frames; i++) {
    clock.t += 1000 / 30;
    out.push(c.update(i % 6 === 0 ? y(clock.t) : null, clock.t, strength));
  }
  return out;
}

test('it follows a dim person up to the right level, gradually — never a jump', () => {
  const c = new ExposureController();
  const clock = { t: 0 };
  const out = drive(c, clock, 8, () => 0.2);
  const final = out[out.length - 1].gain;
  // it rests within the dead band (3.5%) of where it was heading, rather than hunting
  assert.ok(Math.abs(final / desiredGain(0.2, 1) - 1) < 0.045, `settled at ${final}`);
  let biggest = 0;
  for (let i = 1; i < out.length; i++) biggest = Math.max(biggest, Math.abs(out[i].gain - out[i - 1].gain));
  assert.ok(biggest < 0.03, `a frame changed the exposure by ${biggest}`);
  assert.ok(out[10].gain < final - 0.1, 'it should take a moment to get there');
});

test('a hand waved in front of the camera is not a change of light', () => {
  const c = new ExposureController();
  const clock = { t: 0 };
  drive(c, clock, 6, () => 0.25);
  const settled = c.current.gain;
  // one dark reading, then one bright one — and the room as it was
  let reading = 0;
  const spike = drive(c, clock, 3, () => [0.02, 0.95][reading++] ?? 0.25);
  const worst = Math.max(...spike.map((e) => Math.abs(e.gain - settled)));
  assert.ok(worst < 0.04, `moved by ${worst}`);
});

test('small flickers around a steady level do not make it hunt', () => {
  const c = new ExposureController();
  const clock = { t: 0 };
  drive(c, clock, 6, () => 0.3);
  const settled = c.current.gain;
  let seed = 11;
  const noise = () => (seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5;
  const out = drive(c, clock, 10, () => 0.3 + noise() * 0.03);
  const range = Math.max(...out.map((e) => e.gain)) - Math.min(...out.map((e) => e.gain));
  assert.ok(range < 0.03, `wandered over ${range}`);
  assert.ok(Math.abs(c.current.gain - settled) < 0.03);
});

test('when the light really changes it adapts, in either direction', () => {
  const c = new ExposureController();
  const clock = { t: 0 };
  drive(c, clock, 6, () => 0.5);
  const bright = c.current.gain;
  drive(c, clock, 8, () => 0.2); // lights off
  const dark = c.current.gain;
  assert.ok(dark > bright + 0.5, `${bright} → ${dark}`);
  drive(c, clock, 8, () => 0.5); // lights back on
  assert.ok(c.current.gain < dark - 0.4);
});

test('turning it off eases back to the picture as it was, and then it is exactly 1', () => {
  const c = new ExposureController();
  const clock = { t: 0 };
  drive(c, clock, 6, () => 0.2);
  assert.ok(c.current.gain > 1.5);
  const out = drive(c, clock, 6, () => 0.2, 0);
  assert.ok(out[0].gain > out[out.length - 1].gain);
  assert.equal(c.current.gain, 1);
  assert.equal(c.current.lift, 0);
});

test('with no reading at all it does nothing', () => {
  const c = new ExposureController();
  const out = drive(c, { t: 0 }, 2, () => Number.NaN);
  assert.ok(out.every((e) => e.gain === 1 && e.lift === 0));
});

test('the light is measured on the face, not on a bright window behind it', () => {
  // 32×18 picture: the left third is a window (white), the face is a mid-grey patch in the middle
  const w = 32;
  const h = 18;
  const rgba = new Uint8Array(w * h * 4);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const o = (j * w + i) * 4;
      const window = i < 10;
      const face = i >= 13 && i < 19 && j >= 4 && j < 12;
      const v = face ? 100 : window ? 255 : 60;
      rgba[o] = rgba[o + 1] = rgba[o + 2] = v;
      rgba[o + 3] = 255;
    }
  }
  const box = { x: 13 / 32, y: 4 / 18, w: 6 / 32, h: 8 / 18 };
  const onFace = meterLuma(rgba, w, h, { kind: 'face', box });
  const wholeRoom = meterLuma(rgba, w, h, { kind: 'centre' });
  assert.ok(Math.abs(onFace - 100 / 255) < 0.05, `face reads ${onFace}`);
  assert.ok(onFace < 0.5 && wholeRoom > 0, 'sanity');
  // a window of pure white barely moves the face reading
  const brighter = new Uint8Array(rgba);
  for (let j = 0; j < h; j++) for (let i = 0; i < 10; i++) brighter[(j * w + i) * 4 + 1] = 255;
  assert.ok(Math.abs(meterLuma(brighter, w, h, { kind: 'face', box }) - onFace) < 0.01);
});

test('with no face the middle of the picture is what is measured', () => {
  const w = 16;
  const h = 9;
  const rgba = new Uint8Array(w * h * 4).fill(255);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const o = (j * w + i) * 4;
    const centre = Math.abs(i - 8) < 4 && Math.abs(j - 4) < 3;
    rgba[o] = rgba[o + 1] = rgba[o + 2] = centre ? 80 : 255;
  }
  const y = meterLuma(rgba, w, h, { kind: 'centre' });
  const plainMean = (35 * 80 + (w * h - 35) * 255) / (w * h) / 255;
  // weighted towards the middle, so the dark patch there counts for more than its area
  assert.ok(y < plainMean - 0.1 && y > 80 / 255, `${y} vs a plain average of ${plainMean}`);
});

test('a picture can be averaged down to a smaller one for measuring', () => {
  // 4×2: left half black, right half white
  const rgba = new Uint8Array(4 * 2 * 4);
  for (let j = 0; j < 2; j++) for (let i = 0; i < 4; i++) {
    const o = (j * 4 + i) * 4;
    rgba[o] = rgba[o + 1] = rgba[o + 2] = i < 2 ? 0 : 255;
    rgba[o + 3] = 255;
  }
  const small = downsampleRgba(rgba, 4, 2, 2);
  assert.deepEqual([small.width, small.height], [2, 1]);
  assert.deepEqual([...small.rgba], [0, 0, 0, 255, 255, 255, 255, 255]);
  // averaging a grey picture leaves it grey
  const grey = new Uint8Array(8 * 8 * 4).fill(100);
  assert.ok(downsampleRgba(grey, 8, 8, 4).rgba.every((v, i) => (i % 4 === 3 ? v === 255 : v === 100)));
});
