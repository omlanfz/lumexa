import test from 'node:test';
import assert from 'node:assert/strict';
import {
  awardSignature,
  newRequestId,
  requestFor,
  summarizeAward,
  undoSecondsLeft,
  type AwardResponse,
  type AwardResult,
} from './badgeAward.ts';

const award = (name: string, over: Partial<AwardResult> = {}): AwardResult => ({
  awardId: `id-${name}`,
  studentUserId: `u-${name}`,
  studentName: name,
  created: true,
  notified: true,
  revoked: false,
  ...over,
});
const response = (awards: AwardResult[]): AwardResponse => ({
  ok: true,
  requestId: 'req-12345678',
  badge: { id: 'bright-spark', emoji: '⭐', name: 'Bright Spark' },
  awards,
  undoUntil: '2026-10-24T10:02:00.000Z',
});

test('a request id is the server-acceptable shape and new every time', () => {
  const ids = new Set(Array.from({ length: 30 }, () => newRequestId()));
  assert.equal(ids.size, 30);
  for (const id of ids) assert.match(id, /^[A-Za-z0-9_-]{8,64}$/);
});

test('the same badge to the same students is the same action, whatever the order', () => {
  assert.equal(awardSignature('team-star', ['b', 'a']), awardSignature('team-star', ['a', 'b', 'a']));
  assert.notEqual(awardSignature('team-star', ['a']), awardSignature('bright-spark', ['a']));
  assert.notEqual(awardSignature('team-star', ['a']), awardSignature('team-star', ['a', 'b']));
});

test('a retry or a double click of the same action reuses its request id; a new action gets a new one', () => {
  let n = 0;
  const make = () => `id-${++n}`;
  const first = requestFor(null, 'sig-a', make);
  assert.equal(first.requestId, 'id-1');
  assert.equal(requestFor(first, 'sig-a', make).requestId, 'id-1'); // retry
  assert.equal(requestFor(first, 'sig-a', make).requestId, 'id-1'); // double click
  assert.equal(requestFor(first, 'sig-b', make).requestId, 'id-2'); // a different action
});

test('the confirmation names who got what', () => {
  const one = summarizeAward(response([award('Ada Lovelace')]));
  assert.equal(one.headline, '⭐ Bright Spark awarded to Ada');
  assert.equal(one.note, null);

  assert.equal(
    summarizeAward(response([award('Ada L'), award('Ben C')])).headline,
    '⭐ Bright Spark awarded to Ada and Ben',
  );
  assert.equal(
    summarizeAward(response([award('Ada L'), award('Ben C'), award('Cleo P')])).headline,
    '⭐ Bright Spark awarded to Ada, Ben and Cleo',
  );
  assert.equal(
    summarizeAward(response(['Ada', 'Ben', 'Cleo', 'Dev', 'Eli'].map((n) => award(n)))).headline,
    '⭐ Bright Spark awarded to Ada, Ben and 3 others',
  );
});

test('says so when a student was not in the class to see it, and that they still have it', () => {
  const s = summarizeAward(response([award('Ada L'), award('Ben C', { notified: false })]));
  assert.match(s.note!, /^Ben isn't in the class right now/);
  assert.match(s.note!, /My Badges/);
  const many = summarizeAward(
    response([award('Ada L', { notified: false }), award('Ben C', { notified: false })]),
  );
  assert.match(many.note!, /^Ada and Ben aren't in the class right now/);
});

test('a repeat of an award already saved is not described as news', () => {
  const s = summarizeAward(response([award('Ada L', { created: false, notified: false })]));
  assert.equal(s.note, null);
});

test('an award that was already undone is left out of the confirmation', () => {
  const s = summarizeAward(response([award('Ada L'), award('Ben C', { revoked: true })]));
  assert.equal(s.headline, '⭐ Bright Spark awarded to Ada');
});

test('undo time left counts down to zero and never below', () => {
  const until = '2026-10-24T10:02:00.000Z';
  const t0 = Date.parse('2026-10-24T10:00:00.000Z');
  assert.equal(undoSecondsLeft(until, t0), 120);
  assert.equal(undoSecondsLeft(until, t0 + 119_500), 1);
  assert.equal(undoSecondsLeft(until, t0 + 120_000), 0);
  assert.equal(undoSecondsLeft(until, t0 + 999_000), 0);
  assert.equal(undoSecondsLeft('garbage', t0), 0);
});
