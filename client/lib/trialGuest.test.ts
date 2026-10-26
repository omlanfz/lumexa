import test from 'node:test';
import assert from 'node:assert/strict';
import { describeClassTime, formatCountdown } from './trialGuest.ts';

test('the countdown reads MM:SS under an hour and H:MM:SS above it', () => {
  assert.equal(formatCountdown(0), '00:00');
  assert.equal(formatCountdown(59_000), '00:59');
  assert.equal(formatCountdown(61_000), '01:01');
  assert.equal(formatCountdown(3_599_000), '59:59');
  assert.equal(formatCountdown(3_600_000), '1:00:00');
  assert.equal(formatCountdown(2 * 3_600_000 + 29 * 60_000 + 49_000), '2:29:49');
});

test('the countdown rounds partial seconds up and never goes negative', () => {
  assert.equal(formatCountdown(1), '00:01');
  assert.equal(formatCountdown(-5_000), '00:00');
});

test('the class time is always also given in Bangladesh time', () => {
  const t = describeClassTime('2026-11-04T10:00:00.000Z', '2026-11-04T10:30:00.000Z');
  assert.match(t.dhaka, /4:00 PM/);
  assert.match(t.dhaka, /Bangladesh time, GMT\+6/);
  assert.match(t.local, /–/);
});
