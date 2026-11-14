import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  COUNTDOWN_ALERTS_MINUTES,
  STRUCTURED_GRACE_SECONDS,
  STRUCTURED_MARKS,
  STRUCTURED_MAX_ANSWER_LENGTH,
  STRUCTURED_SHAPE,
  STRUCTURED_SUGGESTED_MINUTES,
  STRUCTURED_TIME_LIMIT_MINUTES,
  countdownTone,
  crossedAlert,
  formatCountdown,
  handedInAtDeadline,
  isStructured,
  pastGrace,
  remainingMs,
  resumeStep,
  stepKind,
  stepPart,
  structuredLayout,
  structuredProgress,
  wordCount,
} from './structured.ts';

const server = readFileSync(join(process.cwd(), '..', 'server', 'src', 'structured-assessments', 'structured.constants.ts'), 'utf8');
const serverNumber = (re: RegExp) => Number(re.exec(server)?.[1]);

test('mirrors the numbers of the server', () => {
  assert.equal(serverNumber(/mcq: \{ count: (\d+)/), STRUCTURED_SHAPE.mcq.count);
  assert.equal(serverNumber(/mcq: \{ count: \d+, marksEach: (\d+)/), STRUCTURED_SHAPE.mcq.marksEach);
  assert.equal(serverNumber(/shortAnswer: \{ count: (\d+)/), STRUCTURED_SHAPE.shortAnswer.count);
  assert.equal(serverNumber(/shortAnswer: \{ count: \d+, marksEach: (\d+)/), STRUCTURED_SHAPE.shortAnswer.marksEach);
  assert.equal(serverNumber(/practical: \{ count: (\d+)/), STRUCTURED_SHAPE.practical.count);
  assert.equal(serverNumber(/practical: \{ count: \d+, marksEach: (\d+)/), STRUCTURED_SHAPE.practical.marksEach);
  assert.equal(serverNumber(/STRUCTURED_TIME_LIMIT_MINUTES = (\d+)/), STRUCTURED_TIME_LIMIT_MINUTES);
  assert.equal(serverNumber(/STRUCTURED_GRACE_SECONDS = (\d+)/), STRUCTURED_GRACE_SECONDS);
  assert.equal(Number(/STRUCTURED_MAX_ANSWER_LENGTH = ([\d_]+)/.exec(server)?.[1].replace(/_/g, '')), STRUCTURED_MAX_ANSWER_LENGTH);
  const suggested = /STRUCTURED_SUGGESTED_MINUTES = \{ partA: (\d+), partB: (\d+), partC: (\d+), review: (\d+) \}/.exec(server);
  assert.deepEqual(suggested?.slice(1).map(Number), [
    STRUCTURED_SUGGESTED_MINUTES.partA,
    STRUCTURED_SUGGESTED_MINUTES.partB,
    STRUCTURED_SUGGESTED_MINUTES.partC,
    STRUCTURED_SUGGESTED_MINUTES.review,
  ]);
});

test('is 10 + 15 + 20 = 45 marks in 40 minutes, with the time split adding up', () => {
  assert.equal(STRUCTURED_SHAPE.mcq.count * STRUCTURED_SHAPE.mcq.marksEach, STRUCTURED_MARKS.partA);
  assert.equal(STRUCTURED_SHAPE.shortAnswer.count * STRUCTURED_SHAPE.shortAnswer.marksEach, STRUCTURED_MARKS.partB);
  assert.equal(STRUCTURED_SHAPE.practical.count * STRUCTURED_SHAPE.practical.marksEach, STRUCTURED_MARKS.partC);
  assert.equal(STRUCTURED_MARKS.partA + STRUCTURED_MARKS.partB + STRUCTURED_MARKS.partC, STRUCTURED_MARKS.total);
  assert.equal(STRUCTURED_MARKS.total, 45);
  const s = STRUCTURED_SUGGESTED_MINUTES;
  assert.equal(s.partA + s.partB + s.partC + s.review, STRUCTURED_TIME_LIMIT_MINUTES);
});

test('recognises the format', () => {
  assert.equal(isStructured('STRUCTURED_V1'), true);
  assert.equal(isStructured('STANDARD'), false);
  assert.equal(isStructured(undefined), false);
});

test('the countdown follows the server clock, not this computer', () => {
  const deadline = '2026-03-02T10:40:00.000Z';
  const T = Date.parse('2026-03-02T10:00:00.000Z');
  assert.equal(remainingMs(deadline, T, 0), 40 * 60_000);
  // A computer that is 3 minutes fast (offset -3 min) still shows 40:00 at the real start.
  assert.equal(remainingMs(deadline, T + 3 * 60_000, -3 * 60_000), 40 * 60_000);
  assert.equal(remainingMs(deadline, T + 41 * 60_000, 0), 0);
  assert.equal(remainingMs(null, T, 0), null);
  assert.equal(remainingMs('not a date', T, 0), null);
});

test('formats the time left', () => {
  assert.equal(formatCountdown(40 * 60_000), '40:00');
  assert.equal(formatCountdown(59_001), '01:00');
  assert.equal(formatCountdown(59_000), '00:59');
  assert.equal(formatCountdown(1), '00:01');
  assert.equal(formatCountdown(0), '00:00');
  assert.equal(formatCountdown(-5), '00:00');
  assert.equal(formatCountdown(3_725_000), '1:02:05');
});

test('is calm, then warns, then turns red', () => {
  assert.equal(countdownTone(40 * 60_000), 'ok');
  assert.equal(countdownTone(5 * 60_000 + 1), 'ok');
  assert.equal(countdownTone(5 * 60_000), 'warn');
  assert.equal(countdownTone(61_000), 'warn');
  assert.equal(countdownTone(60_000), 'danger');
  assert.equal(countdownTone(0), 'danger');
});

test('announces 10, 5 and 1 minute left exactly once', () => {
  assert.deepEqual([...COUNTDOWN_ALERTS_MINUTES], [10, 5, 1]);
  assert.equal(crossedAlert(10 * 60_000 + 500, 10 * 60_000 - 500), 10);
  assert.equal(crossedAlert(10 * 60_000 - 500, 10 * 60_000 - 1500), null);
  assert.equal(crossedAlert(5 * 60_000 + 1, 5 * 60_000), 5);
  assert.equal(crossedAlert(61_000, 59_000), 1);
  assert.equal(crossedAlert(null, 59_000), null);
  assert.equal(crossedAlert(30 * 60_000, 29 * 60_000), null);
});

test('counts words', () => {
  assert.equal(wordCount(''), 0);
  assert.equal(wordCount('   '), 0);
  assert.equal(wordCount('one'), 1);
  assert.equal(wordCount(' two   words\nand a third line '), 6);
});

test('says what is still missing before the hand-in', () => {
  const none = structuredProgress({ mcqAnswered: 0, mcqTotal: 10, shortAnswers: ['', '  ', ''], codeStarted: false });
  assert.deepEqual(none.unfinished, ['10 multiple-choice questions in Part A', '3 short answers in Part B', 'the practical in Part C']);
  const some = structuredProgress({ mcqAnswered: 9, mcqTotal: 10, shortAnswers: ['a', 'b', ''], codeStarted: true });
  assert.deepEqual(some.unfinished, ['1 multiple-choice question in Part A', '1 short answer in Part B']);
  assert.deepEqual(some.partB, { answered: 2, total: 3 });
  const all = structuredProgress({ mcqAnswered: 10, mcqTotal: 10, shortAnswers: ['a', 'b', 'c'], codeStarted: true });
  assert.deepEqual(all.unfinished, []);
});

test('lays the screens out: ten questions, three answers, the practical, the hand-in', () => {
  const layout = structuredLayout(10, 3, true);
  assert.deepEqual(layout, { mcq: 10, short: 3, practical: true, shortStart: 10, practicalStep: 13, reviewStep: 14 });
  assert.deepEqual(stepKind(layout, 0), { kind: 'mcq', index: 0 });
  assert.deepEqual(stepKind(layout, 9), { kind: 'mcq', index: 9 });
  assert.deepEqual(stepKind(layout, 10), { kind: 'short', index: 0 });
  assert.deepEqual(stepKind(layout, 12), { kind: 'short', index: 2 });
  assert.deepEqual(stepKind(layout, 13), { kind: 'practical' });
  assert.deepEqual(stepKind(layout, 14), { kind: 'review' });
  assert.deepEqual([0, 9, 10, 12, 13, 14].map((s) => stepPart(layout, s)), ['A', 'A', 'B', 'B', 'C', null]);
  const without = structuredLayout(10, 3, false);
  assert.equal(without.practicalStep, -1);
  assert.equal(without.reviewStep, 13);
  assert.deepEqual(stepKind(without, 13), { kind: 'review' });
});

test('resumes at the first thing that is still open', () => {
  const layout = structuredLayout(10, 3, true);
  const all = Array(10).fill(true);
  assert.equal(resumeStep(layout, { mcqAnswered: Array(10).fill(false), shortWritten: [false, false, false], codeStarted: false }), 0);
  assert.equal(resumeStep(layout, { mcqAnswered: [true, true, false, true, ...Array(6).fill(true)], shortWritten: [false, false, false], codeStarted: false }), 2);
  assert.equal(resumeStep(layout, { mcqAnswered: all, shortWritten: [true, false, false], codeStarted: false }), 11);
  assert.equal(resumeStep(layout, { mcqAnswered: all, shortWritten: [true, true, true], codeStarted: false }), 13);
  assert.equal(resumeStep(layout, { mcqAnswered: all, shortWritten: [true, true, true], codeStarted: true }), 14);
  // Only the practical has been touched: finish Part A first.
  assert.equal(resumeStep(layout, { mcqAnswered: Array(10).fill(false), shortWritten: [false, false, false], codeStarted: true }), 0);
});

test('knows when the server will no longer accept anything', () => {
  const deadline = '2026-03-02T10:40:00.000Z';
  const T = Date.parse(deadline);
  assert.equal(pastGrace(deadline, T, 0), false);
  assert.equal(pastGrace(deadline, T + 30_000, 0), false);
  assert.equal(pastGrace(deadline, T + 30_001, 0), true);
  // A computer that is a minute slow (the server is 60 s ahead of it): 29 s after the deadline is still
  // inside the grace on the server, 31 s is not.
  assert.equal(pastGrace(deadline, T - 31_000, 60_000), false);
  assert.equal(pastGrace(deadline, T - 29_000, 60_000), true);
  assert.equal(pastGrace(null, T + 999_999, 0), false);
});

test('tells a hand-in at 00:00 from one the student made', () => {
  const deadline = '2026-03-02T10:40:00.000Z';
  assert.equal(handedInAtDeadline('2026-03-02T10:40:00.400Z', deadline), true);
  assert.equal(handedInAtDeadline('2026-03-02T10:40:20.000Z', deadline), true);
  assert.equal(handedInAtDeadline('2026-03-02T10:39:59.000Z', deadline), true, 'a second of clock difference is not a choice');
  assert.equal(handedInAtDeadline('2026-03-02T10:31:10.000Z', deadline), false);
  assert.equal(handedInAtDeadline(null, deadline), false);
  assert.equal(handedInAtDeadline('2026-03-02T10:40:00.000Z', null), false);
});
