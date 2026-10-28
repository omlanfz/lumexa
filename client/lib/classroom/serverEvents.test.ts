import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SERVER_EVENT_MARKER,
  claimsToBeServer,
  parseServerEvent,
  readServerMessage,
  sameSecret,
} from './serverEvents.ts';

const enc = (v: unknown) => new TextEncoder().encode(JSON.stringify(v));
const badge = { type: 'badge-awarded', awardId: 'a1', badgeId: 'bright-spark', name: 'Bright Spark', emoji: '⭐' };
const KEY = 'k3Jx9QmLw0pZ7vNc2RtYb5HdFgAe8UiO';

test('the marker is the one the server writes', () => {
  assert.equal(SERVER_EVENT_MARKER, 'lumexa-server');
});

test('reads a badge celebration', () => {
  assert.deepEqual(parseServerEvent(enc(badge)), badge);
  assert.deepEqual(parseServerEvent(JSON.stringify(badge)), badge);
  assert.deepEqual(parseServerEvent(badge), badge);
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

test('secrets are compared whole: equal ones match, anything else does not', () => {
  assert.equal(sameSecret(KEY, KEY), true);
  assert.equal(sameSecret(KEY, `${KEY.slice(0, -1)}X`), false);
  assert.equal(sameSecret(KEY, KEY.slice(0, -1)), false);
  assert.equal(sameSecret('', ''), true);
});

test('a message from the server — with this browser’s own key — is believed', () => {
  assert.deepEqual(readServerMessage({ from: SERVER_EVENT_MARKER, key: KEY, event: badge }, KEY), badge);
});

test('a message that claims to be the server but has another key, or none, is not', () => {
  assert.equal(readServerMessage({ from: SERVER_EVENT_MARKER, key: 'someone-elses-key-xxxxxxxxxxxxxxxx', event: badge }, KEY), null);
  assert.equal(readServerMessage({ from: SERVER_EVENT_MARKER, event: badge }, KEY), null);
  assert.equal(readServerMessage({ from: SERVER_EVENT_MARKER, key: 42, event: badge }, KEY), null);
  // a participant who simply sends the event, as a student might try to fake a celebration
  assert.equal(readServerMessage(badge, KEY), null);
  assert.equal(readServerMessage({ event: badge }, KEY), null);
});

test('with no key to check against, nothing is believed — not even an empty key', () => {
  assert.equal(readServerMessage({ from: SERVER_EVENT_MARKER, key: '', event: badge }, ''), null);
  assert.equal(readServerMessage({ from: SERVER_EVENT_MARKER, key: KEY, event: badge }, ''), null);
});

test('a server message with a good key but a malformed event is still ignored', () => {
  assert.equal(readServerMessage({ from: SERVER_EVENT_MARKER, key: KEY, event: { type: 'badge-awarded' } }, KEY), null);
  assert.equal(readServerMessage({ from: SERVER_EVENT_MARKER, key: KEY, event: 'nope' }, KEY), null);
  assert.equal(readServerMessage({ from: SERVER_EVENT_MARKER, key: KEY }, KEY), null);
  assert.equal(readServerMessage(null, KEY), null);
  assert.equal(readServerMessage('lumexa-server', KEY), null);
});

test('anything that says it is from the server is never treated as chat or a signal', () => {
  assert.equal(claimsToBeServer({ from: SERVER_EVENT_MARKER, key: 'x', event: {} }), true);
  assert.equal(claimsToBeServer({ kind: 'chat', text: 'hi' }), false);
  assert.equal(claimsToBeServer(null), false);
  assert.equal(claimsToBeServer('lumexa-server'), false);
});
