import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_APPEARANCE,
  DEFAULT_SETTINGS,
  isNeutral,
  lightingFromPercent,
  needsFaceDetection,
  needsSegmentation,
  sameBackground,
  sameSettings,
} from './options.ts';
import type { EffectSettings } from './options.ts';
import { canAffordHighQuality } from './models.ts';

const with_ = (over: Partial<EffectSettings['appearance']> = {}, background: EffectSettings['background'] = { mode: 'none' }): EffectSettings => ({
  background,
  appearance: { ...DEFAULT_APPEARANCE, ...over },
});

test('no choice at all is neutral; any one choice is not', () => {
  assert.equal(isNeutral(DEFAULT_SETTINGS), true);
  assert.equal(isNeutral(with_({ lighting: 0.01 })), false);
  assert.equal(isNeutral(with_({ touchUp: true })), false);
  assert.equal(isNeutral(with_({ autoFraming: true })), false);
  assert.equal(isNeutral(with_({}, { mode: 'blur-slight' })), false);
  assert.equal(isNeutral(with_({}, { mode: 'image', imagePath: '/x.jpg', label: 'X' })), false);
});

test('the person is told from the background only when a background effect is on', () => {
  assert.equal(needsSegmentation(with_({ lighting: 1, touchUp: true, autoFraming: true })), false);
  assert.equal(needsSegmentation(with_({}, { mode: 'blur' })), true);
});

test('the face is looked for by framing, touch-up and lighting, and by nothing else', () => {
  assert.equal(needsFaceDetection(DEFAULT_SETTINGS), false);
  assert.equal(needsFaceDetection(with_({}, { mode: 'blur' })), false);
  assert.equal(needsFaceDetection(with_({ autoFraming: true })), true);
  assert.equal(needsFaceDetection(with_({ touchUp: true })), true);
  assert.equal(needsFaceDetection(with_({ lighting: 0.4 })), true);
});

test('a lighting strength from the slider is clamped, and a stray value never gets through', () => {
  assert.equal(lightingFromPercent(0), 0);
  assert.equal(lightingFromPercent(50), 0.5);
  assert.equal(lightingFromPercent(100), 1);
  assert.equal(lightingFromPercent(-20), 0);
  assert.equal(lightingFromPercent(900), 1);
  assert.equal(lightingFromPercent(Number.NaN), 0);
  assert.equal(lightingFromPercent(Infinity), 0);
});

test('two sets of choices are the same when everything they say is the same', () => {
  assert.equal(sameSettings(DEFAULT_SETTINGS, with_()), true);
  assert.equal(sameSettings(with_({ lighting: 0.5 }), with_({ lighting: 0.5 })), true);
  assert.equal(sameSettings(with_({ lighting: 0.5 }), with_({ lighting: 0.6 })), false);
  assert.equal(sameBackground({ mode: 'blur' }, { mode: 'blur' }), true);
  assert.equal(sameBackground({ mode: 'blur' }, { mode: 'blur-slight' }), false);
  assert.equal(
    sameBackground({ mode: 'image', imagePath: '/a.jpg', label: 'A' }, { mode: 'image', imagePath: '/a.jpg', label: 'Renamed' }),
    true,
    'the same picture is the same background whatever it is called',
  );
  assert.equal(sameBackground({ mode: 'image', imagePath: '/a.jpg', label: 'A' }, { mode: 'image', imagePath: '/b.jpg', label: 'A' }), false);
});

test('the heavy segmentation model is for computers and connections that can afford it', () => {
  assert.equal(canAffordHighQuality({ hardwareConcurrency: 8, deviceMemory: 8 }), true);
  assert.equal(canAffordHighQuality({}), true, 'nothing known is not a reason to refuse');
  assert.equal(canAffordHighQuality({ hardwareConcurrency: 2 }), false);
  assert.equal(canAffordHighQuality({ hardwareConcurrency: 8, deviceMemory: 2 }), false);
  assert.equal(canAffordHighQuality({ hardwareConcurrency: 8, saveData: true }), false);
  for (const effectiveType of ['slow-2g', '2g', '3g']) assert.equal(canAffordHighQuality({ hardwareConcurrency: 8, effectiveType }), false, effectiveType);
  assert.equal(canAffordHighQuality({ hardwareConcurrency: 8, effectiveType: '4g' }), true);
});
