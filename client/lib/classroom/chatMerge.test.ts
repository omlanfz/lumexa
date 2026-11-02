import assert from 'node:assert/strict';
import test from 'node:test';
import { KEEP_MESSAGES, appendLive, entryFromSaved, prependOlder, removeByKey } from './chatMerge.ts';
import type { ChatEntry } from './daily/protocol.ts';

const entry = (id: string, sentAt: number, userId = 'u-a'): ChatEntry => ({
  key: `${userId}:${id}`,
  id,
  text: id,
  sentAt,
  fromUserId: userId,
  fromName: 'Ada',
  fromRole: 'STUDENT',
});

test('saved history goes before what is on screen, in its own order', () => {
  const live = [entry('live1', 5000)];
  const saved = [entry('a', 100), entry('b', 200)];
  assert.deepEqual(prependOlder(live, saved).map((m) => m.id), ['a', 'b', 'live1']);
});

test('history is not sorted against live messages — a skewed device clock cannot reorder them', () => {
  // This device's clock is far behind the server's: the live message looks older.
  const live = [entry('live1', 1)];
  const saved = [entry('a', 9_000_000), entry('b', 9_000_100)];
  assert.deepEqual(prependOlder(live, saved).map((m) => m.id), ['a', 'b', 'live1']);
});

test('a message that is both live and saved appears once, where the live one is', () => {
  const live = [entry('m1', 10), entry('m2', 20)];
  const saved = [entry('m0', 1), entry('m1', 9)];
  const merged = prependOlder(live, saved);
  assert.deepEqual(merged.map((m) => m.id), ['m0', 'm1', 'm2']);
  assert.equal(merged[1].sentAt, 10);
});

test('nothing new to add leaves the very same list', () => {
  const live = [entry('m1', 10)];
  assert.equal(prependOlder(live, [entry('m1', 9)]), live);
  assert.equal(prependOlder(live, []), live);
  assert.equal(appendLive(live, entry('m1', 99)), live);
});

test('the same id from two different people are two messages', () => {
  const merged = appendLive([entry('m1', 1, 'u-a')], entry('m1', 2, 'u-b'));
  assert.equal(merged.length, 2);
});

test('removing a message removes only that one', () => {
  const list = [entry('m1', 1), entry('m2', 2)];
  assert.deepEqual(removeByKey(list, 'u-a:m1').map((m) => m.id), ['m2']);
  assert.equal(removeByKey(list, 'u-x:nope'), list);
});

test('a very long class keeps the newest messages', () => {
  let list: ChatEntry[] = [];
  for (let i = 0; i < KEEP_MESSAGES + 5; i++) list = appendLive(list, entry(`m${i}`, i));
  assert.equal(list.length, KEEP_MESSAGES);
  assert.equal(list.at(-1)?.id, `m${KEEP_MESSAGES + 4}`);
});

test('a saved message becomes an entry like a live one, marked as saved', () => {
  assert.deepEqual(
    entryFromSaved({ id: 'm1', text: 'hi', sentAt: 5, fromUserId: 'u-a', fromName: 'Ada', fromRole: 'STUDENT' }),
    { key: 'u-a:m1', id: 'm1', text: 'hi', sentAt: 5, fromUserId: 'u-a', fromName: 'Ada', fromRole: 'STUDENT', saved: true },
  );
});
