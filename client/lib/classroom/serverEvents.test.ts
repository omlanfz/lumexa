import test from 'node:test';
import assert from 'node:assert/strict';
import { parseServerEvent, SERVER_EVENT_TOPIC } from './serverEvents.ts';

const enc = (v: unknown) => new TextEncoder().encode(JSON.stringify(v));

test('the topic is the one the server uses', () => {
  assert.equal(SERVER_EVENT_TOPIC, 'lumexa-server');
});

test('reads a badge celebration', () => {
  const event = { type: 'badge-awarded', awardId: 'a1', badgeId: 'bright-spark', name: 'Bright Spark', emoji: '⭐' };
  assert.deepEqual(parseServerEvent(enc(event)), event);
  assert.deepEqual(parseServerEvent(JSON.stringify(event)), event);
});

test('reads a refusal to let someone stay, for each reason', () => {
  for (const reason of ['ROOM_LOCKED', 'ROOM_FULL', 'TOO_MANY_DEVICES']) {
    const event = { type: 'room-denied', reason, message: 'The classroom is locked.' };
    assert.deepEqual(parseServerEvent(enc(event)), event);
  }
});

test('ignores anything malformed, unknown or oversized', () => {
  const cases: unknown[] = [
    'not json',
    '"a string"',
    null,
    42,
    [],
    {},
    { type: 'something-else' },
    { type: 'badge-awarded', awardId: 'a1', badgeId: 'x', name: 'N' }, // no emoji
    { type: 'badge-awarded', awardId: '', badgeId: 'x', name: 'N', emoji: '⭐' },
    { type: 'badge-awarded', awardId: 5, badgeId: 'x', name: 'N', emoji: '⭐' },
    { type: 'badge-awarded', awardId: 'a', badgeId: 'x', name: 'N'.repeat(500), emoji: '⭐' },
    { type: 'room-denied', reason: 'BECAUSE', message: 'm' },
    { type: 'room-denied', reason: 'ROOM_FULL' },
  ];
  for (const c of cases) {
    const raw = typeof c === 'string' ? c : JSON.stringify(c);
    assert.equal(parseServerEvent(raw), null, `should reject ${raw}`);
  }
  assert.equal(parseServerEvent(new Uint8Array([0xff, 0xfe, 0x00])), null);
});
