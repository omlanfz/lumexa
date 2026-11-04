import test from 'node:test';
import assert from 'node:assert/strict';
import {
  balanceStatus,
  classCredits,
  classTypeLabel,
  creditsText,
  formatTaka,
  reminderCopy,
  reminderTone,
  requestLabel,
} from './payments.ts';

const credits = (remaining: number) => ({
  remaining,
  low: remaining >= 1 && remaining <= 3,
  exhausted: remaining <= 0,
});

test('amounts read in taka, with no needless decimals', () => {
  assert.equal(formatTaka(800_000), '৳8,000');
  assert.equal(formatTaka(1_000_000), '৳10,000');
  assert.equal(formatTaka(2_600_000), '৳26,000');
  assert.equal(formatTaka(666_664), '৳6,666.64');
  assert.equal(formatTaka(0), '৳0');
  assert.equal(formatTaka(-200_000), '-৳2,000');
});

test('the request button names the selected package', () => {
  assert.equal(requestLabel(8), 'Request 8 Credits');
  assert.equal(requestLabel(16), 'Request 16 Credits');
  assert.equal(requestLabel(24), 'Request 24 Credits');
});

test('credit counts pluralise, and negatives keep their sign', () => {
  assert.equal(creditsText(1), '1 credit');
  assert.equal(creditsText(8), '8 credits');
  assert.equal(creditsText(0), '0 credits');
  assert.equal(creditsText(-1), '-1 credit');
  assert.equal(creditsText(-2), '-2 credits');
  assert.equal(classCredits(3), '3 class credits');
  assert.equal(classCredits(1), '1 class credit');
  assert.equal(classCredits(2, 'overdue'), '2 overdue class credits');
  assert.equal(classCredits(1, 'overdue'), '1 overdue class credit');
});

test('the class arrangement is named, and absent when unknown', () => {
  assert.equal(classTypeLabel('ONE_TO_ONE'), '1-to-1 classes');
  assert.equal(classTypeLabel('BATCH'), 'Batch classes');
  assert.equal(classTypeLabel(null), null);
});

test('reminders: nothing at 4+, a subtle notice at 3, yellow at 1–2, red at 0 and below', () => {
  for (const n of [4, 5, 8, 24]) assert.equal(reminderTone(credits(n)), 'none', `${n}`);
  assert.equal(reminderTone(credits(3)), 'notice');
  assert.equal(reminderTone(credits(2)), 'warning');
  assert.equal(reminderTone(credits(1)), 'warning');
  assert.equal(reminderTone(credits(0)), 'critical');
  assert.equal(reminderTone(credits(-1)), 'critical');
  assert.equal(reminderTone(credits(-6)), 'critical');
});

test('the tone follows the backend flags, so the pill and the reminder cannot disagree', () => {
  assert.equal(reminderTone({ remaining: 3, low: false, exhausted: false }), 'none');
  assert.equal(reminderTone({ remaining: 5, low: false, exhausted: true }), 'critical');
});

test('the zero-credit reminder says classes will soon be paused until payment is confirmed', () => {
  const { headline, message } = reminderCopy(0);
  assert.equal(headline, 'You have 0 class credits.');
  assert.match(message, /classes will soon be paused until your payment is confirmed/);
});

test('an overdrawn student is told how many credits are overdue', () => {
  assert.equal(reminderCopy(-2).headline, 'You have 2 overdue class credits.');
  assert.equal(reminderCopy(-1).headline, 'You have 1 overdue class credit.');
  assert.match(reminderCopy(-2).message, /soon be paused until your payment is confirmed/);
  assert.match(reminderCopy(-2).message, /overdue credits are settled as part of your next payment/);
});

test('the low-balance reminders say how many credits are left', () => {
  assert.equal(reminderCopy(3).headline, 'You have 3 class credits left.');
  assert.equal(reminderCopy(2).headline, 'Only 2 class credits left.');
  assert.equal(reminderCopy(1).headline, 'Only 1 class credit left.');
  assert.doesNotMatch(reminderCopy(3).message, /paused/); // the red state alone talks about pausing
  assert.doesNotMatch(reminderCopy(1).message, /paused/);
});

test('the balance status matches the level: calm at 4+, a reminder from 3, a pause warning at 0 and below', () => {
  assert.match(balanceStatus(8), /all set/);
  assert.match(balanceStatus(4), /all set/);
  assert.equal(
    balanceStatus(3),
    'You have 3 class credits left. Request more credits now so your classes keep running smoothly.',
  );
  assert.match(balanceStatus(2), /^Only 2 class credits left\./);
  assert.match(balanceStatus(1), /^Only 1 class credit left\./);
  assert.match(balanceStatus(0), /classes will soon be paused until your payment is confirmed/);
  assert.equal(
    balanceStatus(-2),
    'Classes will soon be paused until your payment is confirmed.',
  );
});
