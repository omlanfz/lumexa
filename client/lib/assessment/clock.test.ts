import test from 'node:test';
import assert from 'node:assert/strict';
import { clockOffsetMs, elapsedMs } from './clock.ts';

const T0 = Date.parse('2026-10-24T09:00:00.000Z');

test('a computer whose clock is 3 minutes fast gets a −3 minute offset', () => {
  // Request sent and answered within a second; the server stamped 09:00:00.
  const offset = clockOffsetMs('2026-10-24T09:00:00.000Z', T0 + 3 * 60_000, T0 + 3 * 60_000 + 400);
  assert.equal(Math.round(offset / 1000), -180);
});

test('the stopwatch starts at 00:00 even when the local clock is wrong', () => {
  // The server created the attempt at 09:00:00; the answer reached a computer
  // that thinks it is 09:03:00 — 3 minutes fast.
  const sentAt = T0 + 3 * 60_000;
  const receivedAt = sentAt + 200;
  const offset = clockOffsetMs('2026-10-24T09:00:00.100Z', sentAt, receivedAt);
  const startedAt = '2026-10-24T09:00:00.000Z';
  assert.equal(Math.floor(elapsedMs(startedAt, receivedAt, offset)! / 1000), 0);
  // …and counts normally from there.
  assert.equal(Math.floor(elapsedMs(startedAt, receivedAt + 65_000, offset)! / 1000), 65);
});

test('a slow local clock is corrected the same way', () => {
  const sentAt = T0 - 90_000;
  const receivedAt = sentAt + 100;
  const offset = clockOffsetMs('2026-10-24T09:00:00.050Z', sentAt, receivedAt);
  assert.equal(Math.floor(elapsedMs('2026-10-24T09:00:00.000Z', receivedAt, offset)! / 1000), 0);
});

test('without a server time there is no correction', () => {
  assert.equal(clockOffsetMs(undefined, 1000, 2000), 0);
  assert.equal(clockOffsetMs('not a date', 1000, 2000), 0);
});

test('elapsed time never goes negative', () => {
  assert.equal(elapsedMs('2026-10-24T09:00:10.000Z', T0, 0), 0);
});

test('a finished test stops its stopwatch at the end time', () => {
  const took = elapsedMs('2026-10-24T09:00:00.000Z', T0 + 9_999_999, 0, '2026-10-24T09:27:14.000Z');
  assert.equal(took, (27 * 60 + 14) * 1000);
});

test('no start time means no stopwatch', () => {
  assert.equal(elapsedMs(null, T0, 0), null);
  assert.equal(elapsedMs(undefined, T0, 0), null);
  assert.equal(elapsedMs('garbage', T0, 0), null);
});
