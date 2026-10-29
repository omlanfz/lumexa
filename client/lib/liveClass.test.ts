import test from 'node:test';
import assert from 'node:assert/strict';
import { classState, clockSkewMs, msToNextTick, splitDuration, stateKey, type ClassTiming } from './liveClass.ts';

const START = Date.parse('2026-10-29T04:58:00.000Z');
const timing: ClassTiming = {
  start: '2026-10-29T04:58:00.000Z',
  end: '2026-10-29T05:58:00.000Z',
};
const MIN = 60_000;

test('before the start: upcoming, counting down, and joinable only in the last 10 minutes', () => {
  const early = classState(timing, START - 30 * MIN);
  assert.equal(early.phase, 'upcoming');
  assert.equal(early.isLive, false);
  assert.equal(early.joinable, false);
  assert.equal(early.startsInMs, 30 * MIN);
  assert.equal(early.elapsedMs, 0);

  const soon = classState(timing, START - 8 * MIN);
  assert.equal(soon.joinable, true);
  assert.equal(soon.isLive, false);
});

test('the instant the start arrives the class is live, with the elapsed time running', () => {
  assert.equal(classState(timing, START - 1).isLive, false);
  const at = classState(timing, START);
  assert.equal(at.isLive, true);
  assert.equal(at.phase, 'live');
  assert.equal(at.elapsedMs, 0);
  assert.equal(at.startsInMs, 0);
  assert.equal(classState(timing, START + 125_000).elapsedMs, 125_000);
});

test('a page opened late, mid-class, is live straight away', () => {
  const s = classState(timing, START + 20 * MIN);
  assert.equal(s.isLive, true);
  assert.equal(s.joinable, true);
  assert.equal(s.elapsedMs, 20 * MIN);
});

test('past the end the class is "ended" (the server is asked and drops it)', () => {
  assert.equal(classState(timing, START + 61 * MIN).phase, 'ended');
});

test('stateKey changes exactly at the joinable, live and ended boundaries', () => {
  const key = (offsetMs: number) => stateKey(classState(timing, START + offsetMs));
  assert.equal(key(-30 * MIN), key(-11 * MIN));
  assert.notEqual(key(-11 * MIN), key(-9 * MIN));
  assert.equal(key(-9 * MIN), key(-1));
  assert.notEqual(key(-1), key(0));
  assert.equal(key(0), key(59 * MIN));
  assert.notEqual(key(59 * MIN), key(61 * MIN));
});

test('a wrong device clock is corrected by the server\'s own "until start"', () => {
  // The server answered "starts in 10 minutes" at the moment this device's clock
  // read 5 minutes AHEAD of the server's.
  const deviceAtReceipt = START - 10 * MIN + 5 * MIN;
  const withSkew: ClassTiming = { ...timing, msUntilStart: 10 * MIN };
  const skew = clockSkewMs(withSkew, deviceAtReceipt);
  assert.equal(skew, -5 * MIN); // server time = device time - 5 min

  // Without the correction the card would flip 5 minutes early...
  assert.equal(classState(withSkew, deviceAtReceipt + 5 * MIN).isLive, true);
  // ...with it, it flips at the server's moment (10 minutes after receipt).
  const at = (deviceElapsedMs: number) => classState(withSkew, deviceAtReceipt + deviceElapsedMs + skew);
  assert.equal(at(5 * MIN).isLive, false);
  assert.equal(at(10 * MIN - 1).isLive, false);
  assert.equal(at(10 * MIN).isLive, true);
});

test('without msUntilStart the device clock is trusted', () => {
  assert.equal(clockSkewMs(timing, START), 0);
});

test('time zones never enter into it: the same instant written with an offset is the same class', () => {
  const dhaka: ClassTiming = { start: '2026-10-29T10:58:00.000+06:00', end: '2026-10-29T11:58:00.000+06:00' };
  assert.equal(classState(dhaka, START).isLive, true);
  assert.equal(classState(dhaka, START - 1).isLive, false);
});

test('msToNextTick lands on the next whole second of the timer', () => {
  assert.equal(msToNextTick(timing, START + 250), 750);
  assert.equal(msToNextTick(timing, START + 1000), 1000);
  assert.equal(msToNextTick(timing, START - 400), 400);
  const d = msToNextTick(timing, START + 999);
  assert.ok(d >= 1 && d <= 1000);
});

test('splitDuration', () => {
  assert.deepEqual(splitDuration(3_725_000), { hours: 1, minutes: 2, seconds: 5 });
  assert.deepEqual(splitDuration(-5), { hours: 0, minutes: 0, seconds: 0 });
});
