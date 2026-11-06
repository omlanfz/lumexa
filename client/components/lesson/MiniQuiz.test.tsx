import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import MiniQuiz, { ChoiceList, CorrectAnswer } from './MiniQuiz';
import type { PublicQuiz, PublicQuizQuestion, QuizCheckResult } from '@/lib/lesson/types';

const q: PublicQuizQuestion = {
  id: 'q1',
  type: 'multiple_choice',
  prompt: 'Why do we need `int()` after `input()`?',
  options: [
    { id: 'o1', text: 'It makes the number print faster' },
    { id: 'o2', text: '`input()` always returns text' },
    { id: 'o3', text: '`int()` checks the number is positive' },
    { id: 'o4', text: '`input()` only accepts whole numbers' },
  ],
};
const quiz: PublicQuiz = { questions: [q, { ...q, id: 'q2' }, { ...q, id: 'q3' }], gradedCount: 3 };
const has = (h: string, s: string | RegExp) => (typeof s === 'string' ? h.includes(s) : s.test(h));
const noop = () => undefined;

describe('MiniQuiz intro', () => {
  it('says every question is multiple choice, and offers no typed answer', () => {
    const h = renderToStaticMarkup(<MiniQuiz lessonId="l1" quiz={quiz} />);
    assert.ok(has(h, '3 multiple-choice questions'));
    assert.ok(has(h, '>Start<'));
    assert.ok(!has(h, '<textarea'), 'there is nowhere to type an answer');
    assert.ok(!has(h, /scored/), 'every question counts, so there is no "N scored" qualifier');
  });

  it('is singular for one question, and tells a teacher or admin that a preview records nothing', () => {
    const one = renderToStaticMarkup(<MiniQuiz lessonId="l1" quiz={{ questions: [q], gradedCount: 1 }} preview />);
    assert.ok(has(one, '1 multiple-choice question.'));
    assert.ok(has(one, 'not recorded'));
  });

  it('remembers a student’s last score out of all the questions', () => {
    const prev = { total: 3, answered: 3, gradedTotal: 3, score: 2, completed: true, results: {} };
    const h = renderToStaticMarkup(<MiniQuiz lessonId="l1" quiz={quiz} previous={prev} />);
    assert.ok(has(h, 'Last time: 2 of 3 right'));
    assert.ok(has(h, 'Take it again'));
  });
});

describe('the four options', () => {
  it('shows exactly four choices, lettered A to D, one of them selected', () => {
    const h = renderToStaticMarkup(<ChoiceList q={q} draft={{ optionId: 'o2' }} result={undefined} locked={false} onPick={noop} labelledBy="label" />);
    assert.equal((h.match(/role="radio"/g) ?? []).length, 4);
    for (const letter of ['A', 'B', 'C', 'D']) assert.ok(has(h, `>${letter}</span>`));
    assert.ok(!has(h, '>E</span>'));
    assert.equal((h.match(/aria-checked="true"/g) ?? []).length, 1);
    assert.ok(has(h, 'role="radiogroup"'));
    assert.ok(has(h, '<code class="lesson-inline-code">input()</code>'), 'inline code in an option is rendered as code');
  });

  it('after a wrong answer, marks the learner’s pick and the right option for screen readers too', () => {
    const result: QuizCheckResult = { questionId: 'q1', graded: true, correct: false, explanation: 'Because.', reveal: { optionId: 'o2' } };
    const h = renderToStaticMarkup(<ChoiceList q={q} draft={{ optionId: 'o3' }} result={result} locked onPick={noop} labelledBy="label" />);
    assert.ok(has(h, 'correct answer'));
    assert.ok(has(h, 'your answer, not correct'));
    assert.ok(has(h, 'disabled'), 'the options lock once the answer is checked');
  });

  it('states the right answer in words, with the explanation when asked', () => {
    const result: QuizCheckResult = { questionId: 'q1', graded: true, correct: false, explanation: 'Text, not a number.', reveal: { optionId: 'o2' } };
    const h = renderToStaticMarkup(<CorrectAnswer q={q} result={result} withWhy />);
    assert.ok(has(h, 'Correct answer: '));
    assert.ok(has(h, 'always returns text'));
    assert.ok(has(h, 'Text, not a number.'));
    assert.equal(renderToStaticMarkup(<CorrectAnswer q={q} result={undefined} />), '');
  });
});
