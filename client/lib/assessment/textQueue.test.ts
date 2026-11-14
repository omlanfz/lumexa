import test from 'node:test';
import assert from 'node:assert/strict';
import { TextSaveQueue } from './textQueue.ts';

/** A controllable fake network + fake timers. */
function harness(opts: { fatal?: (e: unknown) => boolean; debounceMs?: number } = {}) {
  const calls: { key: string; text: string; resolve: () => void; reject: (e: unknown) => void }[] = [];
  const timers: { fn: () => void; ms: number; cleared: boolean; fired: boolean }[] = [];
  const queue = new TextSaveQueue({
    send: (key, text) =>
      new Promise<void>((resolve, reject) => {
        calls.push({ key, text, resolve, reject });
      }),
    isFatal: opts.fatal,
    debounceMs: opts.debounceMs ?? 900,
    setTimer: (fn, ms) => {
      const t = { fn, ms, cleared: false, fired: false };
      timers.push(t);
      return t;
    },
    clearTimer: (h) => {
      (h as { cleared: boolean }).cleared = true;
    },
  });
  const tick = () => new Promise((r) => setImmediate(r));
  /** Fires the newest timer that is still waiting. */
  const fire = () => {
    const t = [...timers].reverse().find((x) => !x.cleared && !x.fired);
    assert.ok(t, 'a timer is waiting');
    t.fired = true;
    t.fn();
    return t;
  };
  return { queue, calls, timers, tick, fire };
}

test('waits for a pause in typing, then sends the text once', async () => {
  const { queue, calls, tick, fire } = harness();
  queue.enqueue('s1', 'T');
  queue.enqueue('s1', 'Th');
  queue.enqueue('s1', 'The loop');
  assert.equal(calls.length, 0, 'nothing is sent while the student is still typing');
  assert.equal(queue.snapshot().states.s1, 'saving');
  const t = fire();
  assert.equal(t.ms, 900);
  assert.equal(calls.length, 1);
  assert.deepEqual([calls[0].key, calls[0].text], ['s1', 'The loop']);
  calls[0].resolve();
  await tick();
  assert.equal(queue.snapshot().states.s1, 'saved');
  assert.equal(queue.snapshot().unsaved, 0);
});

test('every keystroke restarts the pause (the earlier timers are cancelled)', () => {
  const { queue, timers } = harness();
  queue.enqueue('s1', 'a');
  queue.enqueue('s1', 'ab');
  queue.enqueue('s1', 'abc');
  assert.equal(timers.length, 3);
  assert.deepEqual(timers.map((t) => t.cleared), [true, true, false]);
});

test('never has two requests in flight for one answer and finishes on the LAST text', async () => {
  const { queue, calls, tick, fire } = harness();
  queue.enqueue('s1', 'first');
  fire();
  assert.equal(calls.length, 1);
  queue.enqueue('s1', 'first and second');
  queue.enqueue('s1', 'first and second and third'); // typing on while #1 is in flight
  assert.equal(calls.length, 1, 'only one request may be in flight');
  calls[0].resolve();
  await tick();
  assert.equal(calls.length, 2, 'the newest text is sent as soon as the first completes');
  assert.equal(calls[1].text, 'first and second and third');
  calls[1].resolve();
  await tick();
  assert.equal(queue.snapshot().states.s1, 'saved');
  assert.equal(calls.length, 2);
});

test('different answers save in parallel', () => {
  const { queue, calls, fire } = harness();
  queue.enqueue('s1', 'one');
  fire();
  queue.enqueue('s2', 'two');
  fire();
  assert.equal(calls.length, 2);
  assert.equal(queue.snapshot().unsaved, 2);
});

test('flushNow sends every waiting text without the pause', async () => {
  const { queue, calls, tick } = harness();
  queue.enqueue('s1', 'one');
  queue.enqueue('s2', 'two');
  queue.flushNow();
  assert.deepEqual(calls.map((c) => c.text).sort(), ['one', 'two']);
  calls.forEach((c) => c.resolve());
  await tick();
  assert.equal(queue.snapshot().unsaved, 0);
});

test('text the server already has is never sent again', () => {
  const { queue, calls, timers } = harness();
  queue.hydrate('s1', 'saved earlier');
  assert.equal(queue.snapshot().states.s1, 'saved');
  queue.enqueue('s1', 'saved earlier');
  assert.equal(calls.length, 0);
  assert.equal(timers.length, 0);
  assert.equal(queue.snapshot().unsaved, 0);
  // Typing something else and then back to what the server has needs no request either.
  queue.enqueue('s1', 'changed');
  queue.enqueue('s1', 'saved earlier');
  assert.equal(queue.snapshot().states.s1, 'saved');
  queue.flushNow();
  assert.equal(calls.length, 0);
});

test('a failed save is retried with growing delays and the UI is told', async () => {
  const { queue, calls, timers, tick, fire } = harness();
  queue.enqueue('s1', 'answer');
  fire();
  calls[0].reject(new Error('offline'));
  await tick();
  let snap = queue.snapshot();
  assert.equal(snap.states.s1, 'error');
  assert.equal(snap.hasError, true);
  assert.equal(snap.unsaved, 1);
  const first = timers[timers.length - 1];
  assert.equal(first.ms, 1000);
  fire();
  assert.equal(calls.length, 2);
  calls[1].reject(new Error('offline'));
  await tick();
  assert.equal(timers[timers.length - 1].ms, 2000, 'the delay doubles');
  fire();
  calls[2].resolve();
  await tick();
  snap = queue.snapshot();
  assert.equal(snap.states.s1, 'saved');
  assert.equal(snap.hasError, false);
});

test('retryNow tries a failed answer again at once', async () => {
  const { queue, calls, tick, fire } = harness();
  queue.enqueue('s1', 'answer');
  fire();
  calls[0].reject(new Error('offline'));
  await tick();
  queue.retryNow();
  assert.equal(calls.length, 2);
  calls[1].resolve();
  await tick();
  assert.equal(queue.snapshot().states.s1, 'saved');
});

test('a fatal error (the test is handed in) stops everything', async () => {
  const { queue, calls, timers, tick, fire } = harness({ fatal: (e) => (e as { status?: number }).status === 409 });
  queue.enqueue('s1', 'answer');
  fire();
  calls[0].reject({ status: 409 });
  await tick();
  const snap = queue.snapshot();
  assert.equal(snap.fatal, true);
  assert.equal(snap.states.s1, 'error');
  const before = timers.length;
  queue.retryNow();
  queue.enqueue('s2', 'more');
  fire();
  assert.equal(calls.length, 1, 'nothing more is sent once the server says it is closed');
  assert.ok(timers.length >= before);
});

test('dispose cancels what is waiting', () => {
  const { queue, timers, calls } = harness();
  queue.enqueue('s1', 'answer');
  queue.dispose();
  assert.equal(timers[0].cleared, true);
  queue.enqueue('s1', 'ignored');
  queue.flushNow();
  assert.equal(calls.length, 0);
});
