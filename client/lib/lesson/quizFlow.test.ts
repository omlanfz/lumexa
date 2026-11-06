import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildAnswer, initialQuizState, isAnswerReady, moveItem, quizReducer, scoreMessage, summarize } from './quizFlow';
import { MCQ_OPTION_COUNT, type PublicQuizQuestion, type QuizCheckResult } from './types';

const opts = (id: string) => ['a', 'b', 'c', 'd'].map((t) => ({ id: `${id}-${t}`, text: t.toUpperCase() }));
const q1: PublicQuizQuestion = { id: 'q1', type: 'multiple_choice', prompt: 'Pick', options: opts('q1') };
const q2: PublicQuizQuestion = { id: 'q2', type: 'multiple_choice', prompt: 'Pick again', options: opts('q2'), code: { language: 'python', code: 'print(1)' } };
const q3: PublicQuizQuestion = { id: 'q3', type: 'multiple_choice', prompt: 'And again', options: opts('q3') };
const all = [q1, q2, q3];

const res = (id: string, correct: boolean): QuizCheckResult => ({ questionId: id, graded: true, correct, reveal: { optionId: `${id}-b` } });

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

  it('ignores a change of choice or a second check once a question is checked', () => {
    let s = quizReducer(initialQuizState(), { type: 'start' });
    s = quizReducer(s, { type: 'draft', id: 'q1', draft: { optionId: 'q1-a' } });
    s = quizReducer(s, { type: 'checked', result: res('q1', true) });
    const after = quizReducer(s, { type: 'draft', id: 'q1', draft: { optionId: 'q1-b' } });
    assert.equal(after.drafts.q1.optionId, 'q1-a');
    assert.equal(quizReducer(s, { type: 'checked', result: res('q1', false) }), s);
  });

  it('lets the learner change their mind before checking', () => {
    let s = quizReducer(initialQuizState(), { type: 'start' });
    s = quizReducer(s, { type: 'draft', id: 'q1', draft: { optionId: 'q1-a' } });
    s = quizReducer(s, { type: 'draft', id: 'q1', draft: { optionId: 'q1-c' } });
    assert.equal(s.drafts.q1.optionId, 'q1-c');
  });

  it('cannot advance before the question has been checked', () => {
    const s = quizReducer(initialQuizState(), { type: 'start' });
    assert.equal(quizReducer(s, { type: 'next', total: 3 }), s);
  });

  it('retry starts again from question 1, forgets answers and counts the attempt', () => {
    let s = quizReducer(initialQuizState(), { type: 'start' });
    s = quizReducer(s, { type: 'draft', id: 'q1', draft: { optionId: 'q1-a' } });
    s = quizReducer(s, { type: 'checked', result: res('q1', false) });
    s = quizReducer(s, { type: 'retry' });
    assert.deepEqual([s.phase, s.index, s.attempt], ['question', 0, 2]);
    assert.deepEqual(s.results, {});
    assert.deepEqual(s.drafts, {});
  });
});

describe('isAnswerReady / buildAnswer', () => {
  it('is ready only when the learner has chosen one of this question’s four options', () => {
    assert.equal(q1.options.length, MCQ_OPTION_COUNT);
    assert.equal(isAnswerReady(q1, undefined), false);
    assert.equal(isAnswerReady(q1, {}), false);
    assert.equal(isAnswerReady(q1, { optionId: 'zzz' }), false);
    assert.equal(isAnswerReady(q1, { optionId: 'q2-a' }), false); // an option of another question
    assert.equal(isAnswerReady(q1, { optionId: 'q1-d' }), true);
  });

  it('submits the id of the chosen option and nothing else', () => {
    assert.deepEqual(buildAnswer(q1, { optionId: 'q1-c' }), { optionId: 'q1-c' });
    assert.deepEqual(buildAnswer(q1, undefined), { optionId: '' });
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
  it('scores every question and lists the wrong ones to revisit', () => {
    const s = summarize(all, { results: { q1: res('q1', true), q2: res('q2', false), q3: res('q3', true) } });
    assert.deepEqual(s, { score: 2, total: 3, revisit: ['q2'], answered: 3 });
  });

  it('counts a question that has not been answered as neither right nor wrong', () => {
    const s = summarize(all, { results: { q1: res('q1', true) } });
    assert.deepEqual(s, { score: 1, total: 3, revisit: [], answered: 1 });
  });

  it('messages never overstate', () => {
    assert.match(scoreMessage(5, 5), /Perfect/);
    assert.doesNotMatch(scoreMessage(1, 5), /Perfect|Great/);
    assert.match(scoreMessage(0, 0), /no questions/i);
    assert.match(scoreMessage(4, 5), /Great/);
    assert.match(scoreMessage(2, 5), /Good effort/);
  });
});
