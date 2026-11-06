import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildAnswer,
  initialOrder,
  initialQuizState,
  isAnswerReady,
  moveItem,
  quizReducer,
  scoreMessage,
  summarize,
} from './quizFlow';
import type { PublicQuizQuestion, QuizCheckResult } from './types';

const mc: PublicQuizQuestion = { id: 'q1', type: 'multiple_choice', prompt: 'Pick', options: [{ id: 'oa', text: 'A' }, { id: 'ob', text: 'B' }] };
const tf: PublicQuizQuestion = { id: 'q2', type: 'true_false', prompt: 'T/F', options: [{ id: 'ot', text: 'True' }, { id: 'of', text: 'False' }] };
const ord: PublicQuizQuestion = { id: 'q3', type: 'ordering', prompt: 'Order', items: [{ id: 'i2', text: 'two' }, { id: 'i1', text: 'one' }, { id: 'i3', text: 'three' }] };
const mat: PublicQuizQuestion = { id: 'q4', type: 'matching', prompt: 'Match', left: [{ id: 'l1', text: 'a' }, { id: 'l2', text: 'b' }], right: [{ id: 'r2', text: 'B' }, { id: 'r1', text: 'A' }] };
const sc: PublicQuizQuestion = { id: 'q5', type: 'self_check', prompt: 'Explain', hasSampleAnswer: true };
const refl: PublicQuizQuestion = { id: 'q6', type: 'reflection', prompt: 'Think' };
const all = [mc, tf, ord, mat, sc, refl];

const res = (id: string, correct: boolean | null): QuizCheckResult => ({ questionId: id, graded: correct !== null, correct });

describe('quizReducer', () => {
  it('walks intro → question → feedback → next → summary', () => {
    let s = initialQuizState();
    assert.equal(s.phase, 'intro');
    s = quizReducer(s, { type: 'start' });
    assert.deepEqual([s.phase, s.index], ['question', 0]);
    s = quizReducer(s, { type: 'checked', result: res('q1', true) });
    assert.equal(s.phase, 'feedback');
    s = quizReducer(s, { type: 'next', total: 2 });
    assert.deepEqual([s.phase, s.index], ['question', 1]);
    s = quizReducer(s, { type: 'checked', result: res('q2', false) });
    s = quizReducer(s, { type: 'next', total: 2 });
    assert.equal(s.phase, 'summary');
  });

  it('ignores a draft change or a second check once a question is checked', () => {
    let s = quizReducer(initialQuizState(), { type: 'start' });
    s = quizReducer(s, { type: 'draft', id: 'q1', draft: { optionId: 'oa' } });
    s = quizReducer(s, { type: 'checked', result: res('q1', true) });
    const after = quizReducer(s, { type: 'draft', id: 'q1', draft: { optionId: 'ob' } });
    assert.equal(after.drafts.q1.optionId, 'oa');
    assert.equal(quizReducer(s, { type: 'checked', result: res('q1', false) }), s);
  });

  it('cannot advance before the question has been checked', () => {
    const s = quizReducer(initialQuizState(), { type: 'start' });
    assert.equal(quizReducer(s, { type: 'next', total: 3 }), s);
  });

  it('retry starts again from question 1, forgets answers and counts the attempt', () => {
    let s = quizReducer(initialQuizState(), { type: 'start' });
    s = quizReducer(s, { type: 'draft', id: 'q1', draft: { optionId: 'oa' } });
    s = quizReducer(s, { type: 'checked', result: res('q1', false) });
    s = quizReducer(s, { type: 'retry' });
    assert.deepEqual([s.phase, s.index, s.attempt], ['question', 0, 2]);
    assert.deepEqual(s.results, {});
    assert.deepEqual(s.drafts, {});
  });
});

describe('isAnswerReady / buildAnswer', () => {
  it('multiple choice and true/false need a real option of that question', () => {
    assert.equal(isAnswerReady(mc, undefined), false);
    assert.equal(isAnswerReady(mc, { optionId: 'zzz' }), false);
    assert.equal(isAnswerReady(mc, { optionId: 'ob' }), true);
    assert.deepEqual(buildAnswer(tf, { optionId: 'of' }), { optionId: 'of' });
  });

  it('ordering is always ready and submits the current order (initially the server order)', () => {
    assert.equal(isAnswerReady(ord, undefined), true);
    assert.deepEqual(buildAnswer(ord, undefined), { order: ['i2', 'i1', 'i3'] });
    assert.deepEqual(buildAnswer(ord, { order: ['i1', 'i2', 'i3'] }), { order: ['i1', 'i2', 'i3'] });
    assert.deepEqual(initialOrder(ord as Extract<PublicQuizQuestion, { type: 'ordering' }>), ['i2', 'i1', 'i3']);
  });

  it('matching needs every term matched', () => {
    assert.equal(isAnswerReady(mat, { pairs: { l1: 'r1' } }), false);
    assert.equal(isAnswerReady(mat, { pairs: { l1: 'r1', l2: 'r2' } }), true);
    assert.deepEqual(buildAnswer(mat, { pairs: { l1: 'r1', l2: 'r2' } }), { pairs: [{ leftId: 'l1', rightId: 'r1' }, { leftId: 'l2', rightId: 'r2' }] });
  });

  it('self-check needs the learner to write something — and never sends it', () => {
    assert.equal(isAnswerReady(sc, { text: '   ' }), false);
    assert.equal(isAnswerReady(sc, { text: 'my idea' }), true);
    const body = buildAnswer(sc, { text: 'private words' });
    assert.deepEqual(body, { answered: true });
    assert.ok(!JSON.stringify(body).includes('private'));
  });

  it('reflection is optional and equally private', () => {
    assert.equal(isAnswerReady(refl, undefined), true);
    assert.deepEqual(buildAnswer(refl, { text: 'secret' }), { answered: true });
  });
});

describe('moveItem', () => {
  it('moves, clamps and never mutates', () => {
    const a = ['a', 'b', 'c'];
    assert.deepEqual(moveItem(a, 0, 2), ['b', 'c', 'a']);
    assert.deepEqual(moveItem(a, 2, -5), ['c', 'a', 'b']);
    assert.deepEqual(moveItem(a, 1, 1), a);
    assert.deepEqual(moveItem(a, 9, 0), a);
    assert.deepEqual(a, ['a', 'b', 'c']);
  });
});

describe('summarize', () => {
  it('scores only machine-graded questions and lists what to revisit', () => {
    const s = summarize(all, {
      results: { q1: res('q1', true), q2: res('q2', false), q3: res('q3', true), q4: res('q4', false), q5: res('q5', null), q6: res('q6', null) },
      ratings: { q5: 'review' },
    });
    assert.equal(s.gradedTotal, 4);
    assert.equal(s.score, 2);
    assert.deepEqual(s.revisit, ['q2', 'q4', 'q5']);
    assert.equal(s.answered, 6);
  });

  it('a quiz of only reflections has no score and says so honestly', () => {
    const s = summarize([sc, refl], { results: {}, ratings: {} });
    assert.equal(s.gradedTotal, 0);
    assert.match(scoreMessage(0, 0), /no score/i);
  });

  it('messages never overstate', () => {
    assert.match(scoreMessage(5, 5), /Perfect/);
    assert.doesNotMatch(scoreMessage(1, 5), /Perfect|Great/);
  });
});
