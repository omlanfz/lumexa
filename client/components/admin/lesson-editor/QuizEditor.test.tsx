import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import QuizEditor, { blankQuestion, toDraftQuestion, type DraftQuestion } from './QuizEditor';

const has = (h: string, s: string | RegExp) => (typeof s === 'string' ? h.includes(s) : s.test(h));
const noop = () => undefined;
const filled = (over: Partial<DraftQuestion> = {}): DraftQuestion => ({
  id: 'q1',
  type: 'multiple_choice',
  prompt: 'Which one?',
  options: ['alpha', 'beta', 'gamma', 'delta'],
  correctIndex: 2,
  explanation: 'Because gamma.',
  ...over,
});

describe('the quiz editor', () => {
  it('offers only multiple choice: four option boxes, one marked correct, and no question type to pick', () => {
    const h = renderToStaticMarkup(<QuizEditor value={[filled()]} onChange={noop} errors={[]} />);
    for (const letter of ['A', 'B', 'C', 'D']) assert.ok(has(h, `aria-label="Option ${letter}"`));
    assert.ok(!has(h, 'aria-label="Option E"'));
    assert.equal((h.match(/type="radio"/g) ?? []).length, 4);
    assert.equal((h.match(/type="radio"[^>]*checked/g) ?? []).length, 1);
    assert.ok(has(h, 'Option C is the correct answer'));
    assert.ok(!has(h, '<select'), 'no question-type picker');
    for (const gone of ['True / False', 'Put in order', 'Matching pairs', 'Self-check', 'Reflection', 'Model answer', 'Add option', 'Add step']) assert.ok(!has(h, gone), `"${gone}" must not be offered`);
    assert.ok(has(h, '+ Add multiple-choice question'));
    assert.ok(has(h, 'Every question in a lesson quiz is multiple choice with four answer options'));
  });

  it('a new question starts with four blank options', () => {
    const q = blankQuestion('q9');
    assert.equal(q.type, 'multiple_choice');
    assert.deepEqual(q.options, ['', '', '', '']);
    assert.equal(q.correctIndex, 0);
  });

  it('shows a question’s problems next to it, without the "Question N:" prefix', () => {
    const h = renderToStaticMarkup(<QuizEditor value={[filled({ options: ['a', 'a', 'b', 'c'] })]} onChange={noop} errors={['Question 1: answer options must all be different.', 'The quiz must be a list of questions.']} />);
    assert.ok(has(h, 'answer options must all be different.'));
    assert.ok(!has(h, 'Question 1: answer options'));
    assert.ok(has(h, 'The quiz must be a list of questions.'));
  });

  it('shows the code snippet box only when the question has code', () => {
    const plain = renderToStaticMarkup(<QuizEditor value={[filled()]} onChange={noop} errors={[]} />);
    assert.ok(!has(plain, 'aria-label="Code"'));
    const withCode = renderToStaticMarkup(<QuizEditor value={[filled({ code: { language: 'python', code: 'print(1)' } })]} onChange={noop} errors={[]} />);
    assert.ok(has(withCode, 'aria-label="Code"'));
    assert.ok(has(withCode, 'print(1)'));
  });

  it('says there is no quiz yet when there are no questions', () => {
    assert.ok(has(renderToStaticMarkup(<QuizEditor value={[]} onChange={noop} errors={[]} />), 'No quiz yet'));
  });
});

describe('toDraftQuestion', () => {
  it('keeps a stored question as it is', () => {
    const d = toDraftQuestion({ id: 'a1', type: 'multiple_choice', prompt: 'P', options: ['w', 'x', 'y', 'z'], correctIndex: 3, explanation: 'E', fixedOrder: true, source: 'authored' }, 0);
    assert.deepEqual(d, { id: 'a1', type: 'multiple_choice', prompt: 'P', explanation: 'E', fixedOrder: true, options: ['w', 'x', 'y', 'z'], correctIndex: 3, source: 'authored' });
  });

  it('brings an older question into four option boxes so it can be finished or removed', () => {
    const tf = toDraftQuestion({ id: 'q3', type: 'true_false', prompt: 'True?', options: ['True', 'False'], correctIndex: 1 }, 2);
    assert.equal(tf.type, 'multiple_choice');
    assert.deepEqual(tf.options, ['True', 'False', '', '']);
    assert.equal(tf.correctIndex, 1);
    const typed = toDraftQuestion({ id: 'q4', type: 'self_check', prompt: 'Explain', sampleAnswer: 'x' }, 3);
    assert.deepEqual(typed.options, ['', '', '', '']);
    assert.equal(typed.prompt, 'Explain');
    assert.ok(!('sampleAnswer' in typed));
    const many = toDraftQuestion({ id: 'q5', type: 'multiple_choice', prompt: 'Six?', options: ['1', '2', '3', '4', '5', '6'], correctIndex: 5 }, 4);
    assert.deepEqual(many.options, ['1', '2', '3', '4']);
    assert.equal(many.correctIndex, 0, 'a correct index outside the four options is reset');
  });

  it('never throws, and always makes an id', () => {
    for (const raw of [null, undefined, 'x', 7, [], {}]) {
      const d = toDraftQuestion(raw, 5);
      assert.equal(d.id, 'q6');
      assert.equal(d.options.length, 4);
    }
  });
});
