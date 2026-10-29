import test from 'node:test';
import assert from 'node:assert/strict';
import { createSoundGate, type SoundRule } from './soundPolicy.ts';

type E = 'join' | 'chat' | 'badge';
const RULES: Record<E, SoundRule> = {
  join: { priority: 1, cooldownMs: 1500, durationMs: 300 },
  chat: { priority: 2, cooldownMs: 1200, durationMs: 150 },
  badge: { priority: 4, cooldownMs: 2500, durationMs: 700 },
};

function gate() {
  let t = 10_000;
  const g = createSoundGate<E>(RULES, () => t);
  return { g, at: (ms: number) => void (t = ms), advance: (ms: number) => void (t += ms) };
}

test('a repeated announcement of the same thing plays once (reconnects, duplicate events)', () => {
  const { g, advance } = gate();
  assert.equal(g.tryPlay('badge', 'award-1'), true);
  advance(60_000);
  assert.equal(g.tryPlay('badge', 'award-1'), false);
  assert.equal(g.tryPlay('badge', 'award-2'), true);
});

test('chat messages are told apart by id, even outside the cool-down', () => {
  const { g, advance } = gate();
  assert.equal(g.tryPlay('chat', 'm1'), true);
  advance(5_000);
  assert.equal(g.tryPlay('chat', 'm1'), false);
  assert.equal(g.tryPlay('chat', 'm2'), true);
});

test('the same kind of sound waits out its cool-down: a burst is one sound', () => {
  const { g, advance } = gate();
  assert.equal(g.tryPlay('join', 'a'), true);
  advance(200);
  assert.equal(g.tryPlay('join', 'b'), false);
  advance(1_400);
  assert.equal(g.tryPlay('join', 'c'), true);
});

test('a skipped sound is not remembered: its key can still play later', () => {
  const { g, advance } = gate();
  assert.equal(g.tryPlay('join', 'a'), true);
  advance(100);
  assert.equal(g.tryPlay('join', 'b'), false);
  advance(2_000);
  assert.equal(g.tryPlay('join', 'b'), true);
});

test('sounds do not overlap: a lower priority one is skipped while another plays', () => {
  const { g, advance } = gate();
  assert.equal(g.tryPlay('badge', 'x'), true);
  advance(100);
  assert.equal(g.tryPlay('chat', 'm'), false);
  assert.equal(g.tryPlay('join', 'j'), false);
  advance(700);
  assert.equal(g.tryPlay('chat', 'm'), true);
});

test('a more important sound may cut in', () => {
  const { g, advance } = gate();
  assert.equal(g.tryPlay('join', 'j'), true);
  advance(50);
  assert.equal(g.tryPlay('badge', 'x'), true);
});

test('an event without a key is limited by its cool-down only', () => {
  const { g, advance } = gate();
  assert.equal(g.tryPlay('chat'), true);
  advance(1_300);
  assert.equal(g.tryPlay('chat'), true);
});

test('reset forgets a previous class', () => {
  const { g } = gate();
  assert.equal(g.tryPlay('badge', 'x'), true);
  g.reset();
  assert.equal(g.tryPlay('badge', 'x'), true);
});

test('only a bounded number of keys is remembered', () => {
  const { g, advance } = gate();
  for (let i = 0; i < 400; i++) {
    advance(5_000);
    g.tryPlay('chat', `m${i}`);
  }
  advance(5_000);
  assert.equal(g.tryPlay('chat', 'm399'), false); // recent: still remembered
});
