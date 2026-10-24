import test from 'node:test';
import assert from 'node:assert/strict';
import {
  countAnswered,
  formatElapsed,
  formatMarks,
  formatPercent,
  optionsAreShort,
  parseQuestionText,
  questionHasCode,
  questionHeadline,
  reportStatusMeta,
  splitSections,
  testTypeLabel,
  unansweredQuestions,
} from './progress.ts';
import type { AttemptQuestion } from './types.ts';

const q = (id: string, kind: 'MCQ' | 'TRUE_FALSE'): AttemptQuestion => ({
  id,
  kind,
  order: 1,
  text: id,
  options: kind === 'MCQ' ? ['a', 'b', 'c', 'd'] : ['True', 'False'],
  selectedIndex: null,
});

test('countAnswered / unansweredQuestions treat null and missing as unanswered, 0 as answered', () => {
  const qs = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const sel = { a: 0, b: null } as Record<string, number | null>;
  assert.equal(countAnswered(qs, sel), 1);
  assert.deepEqual(unansweredQuestions(qs, sel).map((x) => x.id), ['b', 'c']);
});

test('splitSections puts multiple choice first, then True/False', () => {
  const sections = splitSections([q('t1', 'TRUE_FALSE'), q('m1', 'MCQ'), q('m2', 'MCQ')]);
  assert.deepEqual(sections.map((s) => [s.key, s.questions.length]), [['MCQ', 2], ['TRUE_FALSE', 1]]);
  assert.deepEqual(splitSections([q('m1', 'MCQ')]).map((s) => s.key), ['MCQ']);
});

test('parseQuestionText separates prose, inline code and fenced code', () => {
  const segs = parseQuestionText('What does `len(x)` return?\n\n```python\nx = [1, 2]\nprint(len(x))\n```');
  assert.deepEqual(segs.map((s) => s.type), ['text', 'inline', 'text', 'block']);
  const block = segs[3];
  assert.equal(block.type === 'block' && block.lang, 'python');
  assert.equal(block.value, 'x = [1, 2]\nprint(len(x))');
});

test('parseQuestionText leaves plain text alone', () => {
  assert.deepEqual(parseQuestionText('Just a question?'), [{ type: 'text', value: 'Just a question?' }]);
});

test('formatting helpers', () => {
  assert.equal(formatMarks(36), '36');
  assert.equal(formatMarks(36.5), '36.5');
  assert.equal(formatMarks(36.25), '36.25');
  assert.equal(formatMarks(null), '—');
  assert.equal(formatPercent(90), '90%');
  assert.equal(formatPercent(78.04), '78.0%');
  assert.equal(formatPercent(null), '—');
  assert.equal(formatElapsed(7 * 60_000 + 42_000), '07:42');
  assert.equal(formatElapsed(3_725_000), '1:02:05');
  assert.equal(testTypeLabel('FINAL_TEST'), 'Final Test');
});

test('every report status has a label, tone and hint', () => {
  assert.equal(reportStatusMeta('PENDING_REVIEW').label, 'Pending Review');
  assert.equal(reportStatusMeta('PENDING_CODE_EVALUATION').label, 'Pending Code Evaluation');
  assert.equal(reportStatusMeta('READY_TO_SHARE').label, 'Ready to Share');
  assert.equal(reportStatusMeta('SHARED_WITH_PARENTS').label, 'Shared with Parents');
  assert.equal(reportStatusMeta('SHARED_WITH_PARENTS').tone, 'success');
});

test('questionHeadline: a plain question is just its first line', () => {
  assert.equal(questionHeadline('Which of these is a valid Python variable name?'), 'Which of these is a valid Python variable name?');
  assert.equal(questionHeadline('First line\nsecond line'), 'First line');
});

test('questionHeadline: a code question adds the first line of its code', () => {
  const text = 'What is printed when this code runs?\n\n```python\nscore = 7\nprint(score + 2)\n```';
  assert.equal(questionHeadline(text), 'What is printed when this code runs? — score = 7');
});

test('questionHeadline: long code lines are shortened, blank lines skipped', () => {
  const text = 'Output?\n```js\n\n   const total = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].reduce((a, b) => a + b, 0);\n```';
  const h = questionHeadline(text, 30);
  assert.equal(h, 'Output? — const total = [1, 2, 3, 4, 5,…');
  assert.ok(h.endsWith('…'));
  assert.ok(h.length <= 'Output? — '.length + 30);
});

test('questionHeadline: a question that starts with code shows the code; an empty fence falls back to the first line', () => {
  assert.equal(questionHeadline('```python\nprint(1)\n```\nWhat does this print?'), 'print(1)');
  assert.equal(questionHeadline('Look at this:\n```\n```'), 'Look at this:');
});

test('questionHasCode spots a fenced block but not inline code', () => {
  assert.equal(questionHasCode('What does `len(x)` return?'), false);
  assert.equal(questionHasCode('What is printed?\n\n```python\nprint(1)\n```'), true);
  assert.equal(questionHasCode('Plain question'), false);
});

test('optionsAreShort: short single lines fit two to a row, long or multi-line ones do not', () => {
  assert.equal(optionsAreShort(['4', '5', '6', '7']), true);
  assert.equal(optionsAreShort(['True', 'False']), true);
  assert.equal(optionsAreShort(['a '.repeat(30), 'b', 'c', 'd']), false);
  assert.equal(optionsAreShort(['1\n2', '3', '4', '5']), false);
  assert.equal(optionsAreShort(['only one']), false);
  assert.equal(optionsAreShort([]), false);
});
