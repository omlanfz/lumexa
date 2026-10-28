import test from 'node:test';
import assert from 'node:assert/strict';
import { CROP_LERP, MIN_CROP_WIDTH_RATIO, cropForFace, easeCrop, lightingFilter } from './appearanceMath.ts';

const W = 1280;
const H = 720;
const within = (c: { x: number; y: number; w: number; h: number }) =>
  c.x >= 0 && c.y >= 0 && c.x + c.w <= W + 1e-9 && c.y + c.h <= H + 1e-9;

test('the crop keeps the frame’s own shape, so the published video never changes size', () => {
  const c = cropForFace({ originX: 500, originY: 200, width: 200, height: 240 }, W, H);
  assert.ok(Math.abs(c.w / c.h - W / H) < 1e-9);
});

test('the crop is centred on the face, with a little headroom, and stays inside the frame', () => {
  const box = { originX: 540, originY: 260, width: 200, height: 240 };
  const c = cropForFace(box, W, H);
  assert.ok(within(c));
  const faceCenterX = box.originX + box.width / 2;
  assert.ok(Math.abs(c.x + c.w / 2 - faceCenterX) < 1e-6);
  // the face sits below the crop's middle: there is room above the head
  assert.ok(box.originY + box.height / 2 > c.y + c.h / 2 - 1);
});

test('a small face is zoomed in on, but never past the minimum crop', () => {
  const tiny = cropForFace({ originX: 600, originY: 300, width: 20, height: 24 }, W, H);
  assert.ok(Math.abs(tiny.w - W * MIN_CROP_WIDTH_RATIO) < 1e-6);
  const big = cropForFace({ originX: 100, originY: 50, width: 900, height: 600 }, W, H);
  assert.ok(Math.abs(big.w - W) < 1e-6 && Math.abs(big.h - H) < 1e-6);
});

test('a face at the very edge never pushes the crop out of the frame', () => {
  for (const box of [
    { originX: 0, originY: 0, width: 100, height: 120 },
    { originX: W - 100, originY: H - 120, width: 100, height: 120 },
    { originX: -50, originY: -50, width: 100, height: 120 },
    { originX: W - 20, originY: H - 20, width: 100, height: 120 },
  ]) {
    assert.ok(within(cropForFace(box, W, H)), JSON.stringify(box));
  }
});

test('easing moves the crop part of the way to its target each frame, and arrives', () => {
  const from = { x: 0, y: 0, w: W, h: H };
  const to = { x: 400, y: 200, w: 480, h: 270 };
  const step = easeCrop(from, to);
  assert.ok(Math.abs(step.x - 400 * CROP_LERP) < 1e-9);
  assert.ok(step.w < W && step.w > to.w);
  let c = from;
  for (let i = 0; i < 200; i++) c = easeCrop(c, to);
  assert.ok(Math.abs(c.x - to.x) < 0.01 && Math.abs(c.w - to.w) < 0.01);
});

test('with no crop yet the first one is the target itself', () => {
  const to = { x: 1, y: 2, w: 3, h: 4 };
  assert.equal(easeCrop(null, to), to);
});

test('the lighting filter names both sliders', () => {
  assert.equal(lightingFilter(1.2, 0.9), 'brightness(1.2) contrast(0.9)');
});
