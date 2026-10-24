import test from 'node:test';
import assert from 'node:assert/strict';
import {
  describeLockAll,
  describeLockOne,
  percent,
  plural,
  previewLockAll,
  studentBadge,
  studentElapsedMs,
  summarizeClass,
} from './classProgress.ts';
import type { ClassTestStudent, LockClassResponse } from './types.ts';

const START = '2026-10-24T09:00:00.000Z';
const at = (min: number) => new Date(Date.parse(START) + min * 60_000).toISOString();

function student(name: string, state: ClassTestStudent['state'], over: Partial<NonNullable<ClassTestStudent['attempt']>> = {}): ClassTestStudent {
  const hasAttempt = state === 'IN_PROGRESS' || state === 'SUBMITTED';
  return {
    scheduledLessonId: `sl-${name}`,
    studentUserId: `u-${name}`,
    studentName: name,
    state,
    closedAt: state === 'CLOSED' ? at(30) : null,
    attempt: hasAttempt
      ? {
          id: `att-${name}`,
          status: state === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'SUBMITTED',
          startedAt: at(2),
          submittedAt: state === 'SUBMITTED' ? at(27) : null,
          lockedAt: null,
          total: 40,
          answered: 12,
          codingSaved: false,
          report: null,
          ...over,
        }
      : null,
  };
}

const batch = [
  student('Ada', 'IN_PROGRESS', { answered: 5 }),
  student('Ben', 'IN_PROGRESS', { answered: 31 }),
  student('Cleo', 'SUBMITTED'),
  student('Dev', 'NOT_STARTED'),
];

test('summarizeClass counts learners by state and what lock-all would still change', () => {
  assert.deepEqual(summarizeClass(batch), { total: 4, notStarted: 1, inProgress: 2, submitted: 1, closed: 0, needsLock: 3 });
  assert.deepEqual(summarizeClass([]), { total: 0, notStarted: 0, inProgress: 0, submitted: 0, closed: 0, needsLock: 0 });
  assert.equal(summarizeClass([student('Eve', 'CLOSED')]).needsLock, 0);
});

test('previewLockAll says who is submitted, who is closed, and what stays as it is', () => {
  const p = previewLockAll([...batch, student('Eve', 'CLOSED')]);
  assert.deepEqual(p.submitNow, [
    { name: 'Ada', answered: 5, total: 40 },
    { name: 'Ben', answered: 31, total: 40 },
  ]);
  assert.deepEqual(p.closeNow, ['Dev']);
  assert.equal(p.unchanged, 2); // Cleo (handed in) and Eve (already closed)
});

test('badges word each state, and show a teacher lock', () => {
  assert.deepEqual(studentBadge(batch[3]), { label: 'Not started', tone: 'neutral' });
  assert.deepEqual(studentBadge(batch[0]), { label: 'In progress', tone: 'info' });
  assert.deepEqual(studentBadge(batch[2]), { label: 'Submitted', tone: 'success' });
  assert.deepEqual(studentBadge(student('Fay', 'SUBMITTED', { lockedAt: at(27) })), { label: 'Locked & submitted', tone: 'success' });
  assert.deepEqual(studentBadge(student('Eve', 'CLOSED')), { label: 'Test closed', tone: 'warning' });
});

test("each learner's stopwatch runs from their own start; a finished test stops", () => {
  const now = Date.parse(at(10));
  // Started at minute 2, now minute 10 → 8:00. Someone who started later has less.
  assert.equal(studentElapsedMs(batch[0], now, 0), 8 * 60_000);
  const late = student('Gus', 'IN_PROGRESS', { startedAt: at(7) });
  assert.equal(studentElapsedMs(late, now, 0), 3 * 60_000);
  // Submitted at minute 27, started at 2 → 25:00 whatever the clock says now.
  assert.equal(studentElapsedMs(batch[2], now + 10 * 60_000, 0), 25 * 60_000);
  assert.equal(studentElapsedMs(batch[3], now, 0), null);
  // A computer clock 2 minutes fast is corrected by the offset.
  assert.equal(studentElapsedMs(batch[0], now + 2 * 60_000, -2 * 60_000), 8 * 60_000);
});

test('percent is clamped and safe for an empty test', () => {
  assert.equal(percent(0, 0), 0);
  assert.equal(percent(9, 40), 23);
  assert.equal(percent(50, 40), 100);
  assert.equal(percent(-1, 40), 0);
});

test('plural', () => {
  assert.equal(plural(1, 'test'), '1 test');
  assert.equal(plural(3, 'test'), '3 tests');
  assert.equal(plural(0, 'student'), '0 students');
});

const result = (name: string, outcome: LockClassResponse['results'][number]['outcome'], error?: string) => ({
  scheduledLessonId: `sl-${name}`,
  studentUserId: `u-${name}`,
  studentName: name,
  outcome,
  error,
});

test('describeLockAll: everyone locked', () => {
  const r = describeLockAll({
    results: [result('Ada', 'SUBMITTED'), result('Ben', 'SUBMITTED'), result('Dev', 'CLOSED'), result('Cleo', 'ALREADY_SUBMITTED')],
    submitted: 2,
    closed: 1,
    alreadyDone: 1,
    failed: 0,
  });
  assert.equal(r.tone, 'success');
  assert.equal(r.headline, 'Done — 2 tests submitted with what was saved; 1 student who hadn’t started can no longer start.');
  assert.deepEqual(r.failures, []);
});

test('describeLockAll: pressed again with nothing left to lock', () => {
  const r = describeLockAll({ results: [result('Ada', 'ALREADY_SUBMITTED')], submitted: 0, closed: 0, alreadyDone: 1, failed: 0 });
  assert.equal(r.tone, 'success');
  assert.equal(r.headline, 'Everyone’s test was already locked.');
});

test('describeLockAll: a failure is named, with the reason, and asks for another press', () => {
  const r = describeLockAll({
    results: [result('Ada', 'SUBMITTED'), result('Ben', 'FAILED', 'No teacher is assigned to this class.')],
    submitted: 1,
    closed: 0,
    alreadyDone: 0,
    failed: 1,
  });
  assert.equal(r.tone, 'warning');
  assert.match(r.headline, /1 test submitted/);
  assert.match(r.headline, /1 student could not be locked — press the button again to retry/);
  assert.deepEqual(r.failures, [{ name: 'Ben', error: 'No teacher is assigned to this class.' }]);
});

test('describeLockAll: every learner failing still says so plainly', () => {
  const r = describeLockAll({ results: [result('Ada', 'FAILED')], submitted: 0, closed: 0, alreadyDone: 0, failed: 1 });
  assert.equal(r.tone, 'warning');
  assert.equal(r.headline, '1 student could not be locked — press the button again to retry.');
  assert.equal(r.failures[0].error, 'Something went wrong.');
});

test('describeLockOne words every outcome', () => {
  assert.match(describeLockOne(result('Ada', 'SUBMITTED')), /Ada’s test was locked and submitted with what they had saved/);
  assert.match(describeLockOne(result('Ada', 'ALREADY_SUBMITTED')), /already handed in/);
  assert.match(describeLockOne(result('Ada', 'CLOSED')), /can no longer start/);
  assert.match(describeLockOne(result('Ada', 'ALREADY_CLOSED')), /already closed/);
  assert.equal(describeLockOne(result('Ada', 'FAILED', 'Nope.')), 'Nope.');
});
