import test from 'node:test';
import assert from 'node:assert/strict';
import { BUDGET_SHARE, FROZEN_COST_MS, FROZEN_WINDOWS, Governor } from './governor.ts';
import type { Verdict } from './governor.ts';
import { RetryBudget } from './retry.ts';

/** A governor over a ladder of `rungs` steps, and what it did. */
function setup(rungs: number) {
  let level = 0;
  const log: string[] = [];
  const governor = new Governor({
    lighten: () => {
      if (level >= rungs) return false;
      level += 1;
      log.push(`lighten→${level}`);
      return true;
    },
    restore: () => {
      if (level === 0) return false;
      level -= 1;
      log.push(`restore→${level}`);
      return true;
    },
  });
  return { governor, log, level: () => level };
}
const NOMINAL = 1000 / 30; // a 30 fps camera
const BUDGET = NOMINAL * BUDGET_SHARE;
/** Looks at the work `times` times, at the same cost; what it said each time. */
function look(governor: Governor, cost: number, times: number, nominal = NOMINAL): Verdict[] {
  return Array.from({ length: times }, () => governor.evaluate(cost, nominal));
}

test('work that fits is left alone, and one slow moment is not enough to act on', () => {
  const { governor, log } = setup(5);
  assert.deepEqual(look(governor, BUDGET - 1, 20), Array(20).fill('ok'));
  assert.deepEqual(log, []);
  assert.deepEqual(look(governor, BUDGET + 20, 1), ['ok'], 'one look over budget');
  assert.deepEqual(look(governor, BUDGET - 5, 1), ['ok']);
  assert.deepEqual(look(governor, BUDGET + 20, 1), ['ok'], 'and again, but not twice in a row');
  assert.deepEqual(log, []);
});

test('work that does not fit is made lighter, a step every two looks, until it fits', () => {
  const { governor, log, level } = setup(5);
  assert.deepEqual(look(governor, BUDGET + 20, 2), ['ok', 'lightened']);
  assert.deepEqual(look(governor, BUDGET + 20, 2), ['ok', 'lightened']);
  assert.equal(level(), 2);
  assert.deepEqual(look(governor, BUDGET - 3, 3), ['ok', 'ok', 'ok'], 'it fits now: nothing more is given up');
  assert.deepEqual(log, ['lighten→1', 'lighten→2']);
});

test('a computer that cannot do 30 a second but can do 20 keeps the effect — however long that goes on', () => {
  // the case that used to take the background away a while into the class: about 47 ms a
  // picture against a 33 ms interval, with nothing lighter left to try
  const { governor, level } = setup(3);
  const verdicts = look(governor, 47, 400);
  assert.equal(level(), 3, 'everything that can be given up has been');
  assert.ok(!verdicts.includes('give-up'), 'and it is NOT given up on');
});

test('a picture that costs a lot but is not nearly stopped is never given up on either', () => {
  const { governor } = setup(0); // nothing can be lightened at all
  assert.ok(!look(governor, FROZEN_COST_MS - 1, 500).includes('give-up'));
});

test('only a video that has all but stopped is given up on — after it has been as light as it goes, and for a few looks', () => {
  const { governor, level } = setup(2);
  const slow = FROZEN_COST_MS + 100;
  // while there is something to lighten, that comes first: even a frozen picture is lightened, not dropped
  assert.deepEqual(look(governor, slow, 2), ['ok', 'lightened']);
  assert.deepEqual(look(governor, slow, 2), ['ok', 'lightened']);
  assert.equal(level(), 2);
  // now it is as light as it gets (the second look finds that out, and counts as the first frozen
  // one), and still frozen: it has to stay frozen for a few looks in a row, and then it gives up
  const rest = look(governor, slow, 1 + FROZEN_WINDOWS);
  assert.deepEqual(rest.slice(0, -1), Array(FROZEN_WINDOWS).fill('ok'));
  assert.equal(rest.at(-1), 'give-up');
});

test('one fair look in the middle of a frozen spell starts the count again', () => {
  const { governor } = setup(0);
  const slow = FROZEN_COST_MS + 100;
  assert.ok(!look(governor, slow, FROZEN_WINDOWS - 1).includes('give-up'));
  look(governor, BUDGET + 30, 1); // slow, but not frozen
  assert.ok(!look(governor, slow, FROZEN_WINDOWS - 1).includes('give-up'), 'it has to be frozen for a few looks in a row');
  assert.equal(look(governor, slow, 1)[0], 'give-up');
});

test('after plenty of room for a good while, a step is taken back — one at a time, never before', () => {
  const { governor, log, level } = setup(3);
  look(governor, BUDGET + 30, 6); // lightened three times
  assert.equal(level(), 3);
  const easy = BUDGET * 0.2;
  const first = look(governor, easy, 30);
  // the wait doubled with each lightening (6 → 12 → 24 → 40 looks, capped): nothing yet at 30
  assert.ok(!first.includes('restored'), 'not yet');
  const more = look(governor, easy, 20);
  assert.ok(more.includes('restored'), 'then one step back');
  assert.equal(level(), 2);
  assert.deepEqual(log.filter((l) => l.startsWith('restore')), ['restore→2']);
});

test('room that is only just enough does not count: it takes real headroom', () => {
  const { governor, level } = setup(3);
  look(governor, BUDGET + 30, 6);
  assert.equal(level(), 3);
  // under budget, but not by much: this would bounce straight back over it
  assert.ok(!look(governor, BUDGET * 0.8, 300).includes('restored'));
  assert.equal(level(), 3);
});

test('a look in the middle that is not roomy starts the wait for a step back again', () => {
  const { governor } = setup(1);
  look(governor, BUDGET + 30, 2);
  const easy = BUDGET * 0.2;
  look(governor, easy, 10);
  look(governor, BUDGET * 0.7, 1); // fits, but with no room to spare
  assert.ok(!look(governor, easy, 10).includes('restored'), 'the count began again');
});

test('a computer on the edge settles instead of bouncing: each time the work has to be lightened again, the wait for a step back is longer', () => {
  const { governor } = setup(1);
  look(governor, BUDGET + 40, 2); // too slow: lightened
  const waits: number[] = [];
  for (let cycle = 0; cycle < 4; cycle++) {
    let looks = 0;
    // plenty of room, until a step is taken back
    while (governor.evaluate(BUDGET * 0.2, NOMINAL) !== 'restored') looks++;
    waits.push(looks + 1);
    look(governor, BUDGET + 40, 2); // and too slow again: lightened again
  }
  assert.deepEqual(waits, [12, 24, 40, 40], 'the wait doubles each time, up to a limit');
});

test('a camera that gives less time per picture asks more of the computer: the budget follows the camera', () => {
  const { governor, log } = setup(2);
  // 45 ms a picture is fine for a 15 fps camera (66 → capped at 50 ms)… not for a 60 fps one
  assert.ok(!look(governor, 40, 10, 50).includes('lightened'));
  assert.deepEqual(look(governor, 40, 2, 16), ['ok', 'lightened']);
  assert.deepEqual(log, ['lighten→1']);
});

// ─── The retry budget ───────────────────────────────────────────────────────

test('a few tries, each after a longer pause, then no more for now', () => {
  const budget = new RetryBudget(3, 60_000, [0, 2_000, 8_000]);
  assert.equal(budget.take(1_000), 0);
  assert.equal(budget.take(2_000), 2_000);
  assert.equal(budget.take(3_000), 8_000);
  assert.equal(budget.take(4_000), null, 'out of tries');
  assert.equal(budget.take(5_000), null);
});

test('tries come back as time passes: only the ones inside the window count', () => {
  const budget = new RetryBudget(2, 10_000, [0, 1_000]);
  assert.equal(budget.take(0), 0);
  assert.equal(budget.take(5_000), 1_000);
  assert.equal(budget.take(9_999), null);
  assert.equal(budget.take(10_000), 1_000, 'the first fell out of the window: one is free again, and it is the second of the window');
  assert.equal(budget.take(11_000), null);
  assert.equal(budget.take(20_000), 0, 'long after, it is as if fresh');
});

test('a fresh start gives every try back, and the last pause repeats if there are more tries than pauses', () => {
  const budget = new RetryBudget(4, 60_000, [100]);
  assert.deepEqual([budget.take(0), budget.take(1), budget.take(2), budget.take(3)], [100, 100, 100, 100]);
  assert.equal(budget.take(4), null);
  budget.reset();
  assert.equal(budget.take(5), 100);
  assert.equal(new RetryBudget(1, 1_000, []).take(0), 0, 'no pauses at all means no pause');
});
