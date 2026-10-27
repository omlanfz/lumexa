import test from 'node:test';
import assert from 'node:assert/strict';
import { describeDuration, formatBytes, formatDuration, formatMinutes, totalSeconds } from './format.ts';

test('durations read like a clock', () => {
  assert.equal(formatDuration(0), '0:00');
  assert.equal(formatDuration(999), '0:01');
  assert.equal(formatDuration(61_000), '1:01');
  assert.equal(formatDuration(754_000), '12:34');
  assert.equal(formatDuration(3_725_000), '1:02:05');
  assert.equal(formatDuration(-5), '0:00');
});

test('sizes read in the unit a person expects', () => {
  assert.equal(formatBytes(0), '0 MB');
  assert.equal(formatBytes(Number.NaN), '0 MB');
  assert.equal(formatBytes(300), '1 KB');
  assert.equal(formatBytes(512 * 1024), '512 KB');
  assert.equal(formatBytes(5.3 * 1024 * 1024), '5.3 MB');
  assert.equal(formatBytes(85 * 1024 * 1024), '85 MB');
  assert.equal(formatBytes(1.5 * 1024 * 1024 * 1024), '1.5 GB');
});

test('the part length reads naturally', () => {
  assert.equal(formatMinutes(70), '70 minutes');
  assert.equal(formatMinutes(60), '1 hour');
  assert.equal(formatMinutes(120), '2 hours');
});

test('describeDuration: a class length for a card, not a clock', () => {
  assert.equal(describeDuration(null), null);
  assert.equal(describeDuration(undefined), null);
  assert.equal(describeDuration(0), null);
  assert.equal(describeDuration(Number.NaN), null);
  assert.equal(describeDuration(20), 'under a minute');
  assert.equal(describeDuration(90), '2 min');
  assert.equal(describeDuration(45 * 60), '45 min');
  assert.equal(describeDuration(60 * 60), '1 h');
  assert.equal(describeDuration(65 * 60), '1 h 5 min');
  assert.equal(describeDuration(2 * 3600 + 30 * 60), '2 h 30 min');
});

test('totalSeconds: the sum of the parts, unknown if any part is unknown', () => {
  assert.equal(totalSeconds([]), null);
  assert.equal(totalSeconds([{ durationSeconds: 600 }, { durationSeconds: 300 }]), 900);
  assert.equal(totalSeconds([{ durationSeconds: 600 }, { durationSeconds: null }]), null);
});
