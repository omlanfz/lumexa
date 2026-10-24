import test from 'node:test';
import assert from 'node:assert/strict';
import { AnswerQueue } from './answerQueue.ts';

/** A controllable fake network + fake timers. */
function harness(opts: { fatal?: (e: unknown) => boolean } = {}) {
  const calls: { q: string; v: number | null; resolve: () => void; reject: (e: unknown) => void }[] = [];
  const timers: { fn: () => void; ms: number; cleared: boolean }[] = [];
  const queue = new AnswerQueue({
    send: (q, v) =>
      new Promise<void>((resolve, reject) => {
        calls.push({ q, v, resolve, reject });
      }),
    isFatal: opts.fatal,
    setTimer: (fn, ms) => {
      const t = { fn, ms, cleared: false };
      timers.push(t);
      return t;
    },
    clearTimer: (h) => {
      (h as { cleared: boolean }).cleared = true;
    },
  });
  const tick = () => new Promise((r) => setImmediate(r));
  return { queue, calls, timers, tick };
}

test('sends an answer once and ends saved', async () => {
  const { queue, calls, tick } = harness();
  queue.enqueue('q1', 2);
  assert.equal(calls.length, 1);
  assert.deepEqual([calls[0].q, calls[0].v], ['q1', 2]);
  assert.equal(queue.snapshot().states.q1, 'saving');
  assert.equal(queue.snapshot().unsaved, 1);
  calls[0].resolve();
  await tick();
  assert.equal(queue.snapshot().states.q1, 'saved');
  assert.equal(queue.snapshot().unsaved, 0);
});

test('never has two requests in flight for one question and finishes on the LAST choice', async () => {
  const { queue, calls, tick } = harness();
  queue.enqueue('q1', 0);
  queue.enqueue('q1', 1);
  queue.enqueue('q1', 3); // student keeps changing their mind while #1 is in flight
  assert.equal(calls.length, 1, 'only the first request may be in flight');
  calls[0].resolve();
  await tick();
  assert.equal(calls.length, 2, 'the newer choice is sent once the first completes');
  assert.equal(calls[1].v, 3, 'intermediate choice 1 is skipped — only the latest is sent');
  calls[1].resolve();
  await tick();
  assert.equal(queue.snapshot().states.q1, 'saved');
  assert.equal(calls.length, 2);
});

test('different questions save in parallel', () => {
  const { queue, calls } = harness();
  queue.enqueue('q1', 0);
  queue.enqueue('q2', 1);
  assert.equal(calls.length, 2);
});

test('a failed save is retried with growing backoff and recovers', async () => {
  const { queue, calls, timers, tick } = harness();
  queue.enqueue('q1', 2);
  calls[0].reject(new Error('offline'));
  await tick();
  assert.equal(queue.snapshot().states.q1, 'error');
  assert.equal(queue.snapshot().hasError, true);
  assert.equal(timers.length, 1);
  const first = timers[0].ms;

  timers[0].fn(); // backoff elapses
  assert.equal(calls.length, 2);
  assert.equal(calls[1].v, 2, 'the same choice is retried');
  calls[1].reject(new Error('still offline'));
  await tick();
  assert.ok(timers[1].ms > first, 'backoff grows');

  timers[1].fn();
  calls[2].resolve();
  await tick();
  assert.equal(queue.snapshot().states.q1, 'saved');
  assert.equal(queue.snapshot().hasError, false);
});

test('while failing, a newer choice replaces the one being retried', async () => {
  const { queue, calls, timers, tick } = harness();
  queue.enqueue('q1', 1);
  calls[0].reject(new Error('offline'));
  await tick();
  queue.enqueue('q1', 2); // changes answer while the retry timer is pending
  assert.equal(timers[0].cleared, true, 'pending retry is cancelled');
  assert.equal(calls[1].v, 2, 'the new choice is sent immediately');
});

test('a fatal error stops retrying (test already submitted)', async () => {
  const { queue, calls, timers, tick } = harness({ fatal: (e) => (e as { status?: number })?.status === 409 });
  queue.enqueue('q1', 1);
  calls[0].reject({ status: 409 });
  await tick();
  const snap = queue.snapshot();
  assert.equal(snap.fatal, true);
  assert.equal(timers.length, 0, 'no retry is scheduled');
  queue.enqueue('q2', 0);
  assert.equal(calls.length, 1, 'nothing more is sent after a fatal error');
});

test('hydrate: a value the server already has is not sent again', () => {
  const { queue, calls } = harness();
  queue.hydrate('q1', 3);
  queue.enqueue('q1', 3);
  assert.equal(calls.length, 0);
  assert.equal(queue.snapshot().states.q1, 'saved');
  queue.enqueue('q1', 2);
  assert.equal(calls.length, 1);
});

test('clearing an answer (null) is saved like any other change', async () => {
  const { queue, calls, tick } = harness();
  queue.hydrate('q1', 1);
  queue.enqueue('q1', null);
  assert.equal(calls[0].v, null);
  calls[0].resolve();
  await tick();
  assert.equal(queue.snapshot().states.q1, 'saved');
});

test('retryNow retries failed questions immediately', async () => {
  const { queue, calls, tick } = harness();
  queue.enqueue('q1', 1);
  calls[0].reject(new Error('offline'));
  await tick();
  queue.retryNow();
  assert.equal(calls.length, 2);
});

test('dispose cancels pending retries and ignores new answers', async () => {
  const { queue, calls, timers, tick } = harness();
  queue.enqueue('q1', 1);
  calls[0].reject(new Error('offline'));
  await tick();
  queue.dispose();
  assert.equal(timers[0].cleared, true);
  queue.enqueue('q2', 1);
  assert.equal(calls.length, 1);
});

test('change notifications report unsaved work', async () => {
  const seen: number[] = [];
  const calls: { resolve: () => void }[] = [];
  const queue = new AnswerQueue({
    send: () => new Promise<void>((resolve) => calls.push({ resolve })),
    onChange: (s) => seen.push(s.unsaved),
  });
  queue.enqueue('a', 0);
  queue.enqueue('b', 1);
  calls[0].resolve();
  calls[1].resolve();
  await new Promise((r) => setImmediate(r));
  assert.equal(seen[seen.length - 1], 0);
  assert.ok(seen.includes(2));
});
