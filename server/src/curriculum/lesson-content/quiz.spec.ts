import { cleanLesson } from './cleaner';
import { gradeAnswer, gradedCount, hasFixedOrder, normalizeQuiz, optionId, QuizAnswerError, toPublicQuiz } from './quiz';
import { quizCatalogFor, quizCatalogKeys } from './quiz-catalog';
import './catalog';
import type { ChoiceQuestion, QuizQuestion } from './types';
import { allSourceLessons, contextOf, fieldsOf } from './test-support';

const choice = (over: Partial<ChoiceQuestion> = {}): ChoiceQuestion => ({
  id: 'q1',
  type: 'multiple_choice',
  prompt: 'Which one?',
  options: ['alpha', 'beta', 'gamma', 'delta'],
  correctIndex: 1,
  explanation: 'SECRET-EXPLANATION because beta',
  ...over,
});

/** Every property name used anywhere in a value (words in the quiz text do not count). */
const keysOf = (v: unknown): string[] =>
  Array.isArray(v) ? v.flatMap(keysOf) : v && typeof v === 'object' ? Object.entries(v as object).flatMap(([k, x]) => [k, ...keysOf(x)]) : [];

const shipped = (): { key: string; questions: QuizQuestion[] }[] => {
  const out = allSourceLessons().map((c) => ({ key: c.key, questions: cleanLesson(fieldsOf(c), contextOf(c)).fields.miniQuiz ?? [] }));
  return out.map((o) => (o.questions.length > 0 ? o : { key: o.key, questions: quizCatalogFor(o.key) ?? [] }));
};

describe('the learner never receives an answer in the initial payload', () => {
  it('has no correct index, explanation, sample answer or reveal anywhere in any shipped quiz', () => {
    const all = shipped();
    expect(all.filter((q) => q.questions.length === 0).map((q) => q.key)).toEqual([]);
    for (const { key, questions } of all) {
      const pub = toPublicQuiz(questions, 'lesson-id');
      const json = JSON.stringify(pub);
      expect({ key, keys: keysOf(pub).filter((k) => ['correctIndex', 'correct', 'answer', 'explanation', 'sampleAnswer', 'reveal', 'pairs'].includes(k)) }).toEqual({ key, keys: [] });
      // The text of an explanation must not appear either — unless it only quotes words the question already shows.
      for (const q of questions) {
        if (!q.explanation || q.explanation.length <= 25) continue;
        const shown = [q.prompt, ...('options' in q ? q.options : []), ...('items' in q ? q.items : [])].join('\n').toLowerCase();
        if (shown.includes(q.explanation.toLowerCase())) continue;
        expect({ key, id: q.id, leaked: json.includes(q.explanation) }).toEqual({ key, id: q.id, leaked: false });
      }
    }
  });

  it('uses opaque option ids, so an id says nothing about which option is right', () => {
    const pub = toPublicQuiz([choice()], 'x')[0] as { options: { id: string; text: string }[] };
    for (const o of pub.options) expect(o.id).toMatch(/^o[0-9a-z]+$/);
    expect(pub.options.map((o) => o.id)).not.toContain('b');
    expect(optionId('q1', 1)).toBe(pub.options.find((o) => o.text === 'beta')!.id);
  });

  it('shuffles options deterministically, so teacher and student see the same order', () => {
    const q = choice();
    const a = toPublicQuiz([q], 'lesson-1')[0] as { options: { text: string }[] };
    const b = toPublicQuiz([q], 'lesson-1')[0] as { options: { text: string }[] };
    expect(a.options.map((o) => o.text)).toEqual(b.options.map((o) => o.text));
    expect(a.options.map((o) => o.text)).not.toEqual(q.options); // never the authored order
    const c = toPublicQuiz([q], 'lesson-2')[0] as { options: { text: string }[] };
    expect(new Set([a, c].map((x) => x.options.map((o) => o.text).join()))).toBeTruthy();
  });

  it('does not leave the right answer in a predictable position across the shipped quizzes', () => {
    const positions = [0, 0, 0, 0];
    let n = 0;
    for (const { key, questions } of shipped()) {
      const pub = toPublicQuiz(questions, key);
      questions.forEach((q, i) => {
        const p = pub[i];
        if (q.type !== 'multiple_choice' || p.type !== 'multiple_choice' || hasFixedOrder(q) || q.options.length !== 4) return;
        const right = optionId(q.id, q.correctIndex);
        positions[p.options.findIndex((o) => o.id === right)]++;
        n++;
      });
    }
    expect(n).toBeGreaterThan(200);
    for (const count of positions) expect(count / n).toBeLessThan(0.4);
  });

  it('keeps true/false and "all of the above" questions in their authored order', () => {
    const tf = choice({ type: 'true_false', options: ['True', 'False'], correctIndex: 0 });
    const all = choice({ options: ['one', 'two', 'both of the above', 'none of the above'], correctIndex: 2 });
    expect((toPublicQuiz([tf], 'x')[0] as { options: { text: string }[] }).options.map((o) => o.text)).toEqual(['True', 'False']);
    expect((toPublicQuiz([all], 'x')[0] as { options: { text: string }[] }).options.map((o) => o.text)).toEqual(all.options);
  });
});

describe('grading is deterministic and reveals the answer only after a submission', () => {
  it('grades a choice question and reveals the right option and the explanation', () => {
    const q = choice();
    const right = gradeAnswer(q, { optionId: optionId('q1', 1) });
    expect(right).toMatchObject({ graded: true, correct: true, reveal: { optionId: optionId('q1', 1) } });
    expect(right.explanation).toContain('SECRET-EXPLANATION');
    const wrong = gradeAnswer(q, { optionId: optionId('q1', 0) });
    expect(wrong).toMatchObject({ graded: true, correct: false, reveal: { optionId: optionId('q1', 1) } });
    expect(gradeAnswer(q, { optionId: optionId('q1', 1) })).toEqual(right); // same input, same output
  });

  it('rejects an option that does not belong to the question, or no answer at all', () => {
    const q = choice();
    expect(() => gradeAnswer(q, { optionId: optionId('other', 1) })).toThrow(QuizAnswerError);
    expect(() => gradeAnswer(q, null)).toThrow(QuizAnswerError);
    expect(() => gradeAnswer(q, {} as never)).toThrow(QuizAnswerError);
  });

  it('grades ordering questions exactly', () => {
    const q: QuizQuestion = { id: 'q2', type: 'ordering', prompt: 'Order', items: ['first', 'second', 'third'] };
    const pub = toPublicQuiz([q], 'x')[0] as { items: { id: string; text: string }[] };
    const byText = (t: string) => pub.items.find((i) => i.text === t)!.id;
    expect(gradeAnswer(q, { order: ['first', 'second', 'third'].map(byText) }).correct).toBe(true);
    expect(gradeAnswer(q, { order: ['second', 'first', 'third'].map(byText) }).correct).toBe(false);
    expect(() => gradeAnswer(q, { order: [byText('first')] })).toThrow(QuizAnswerError);
    expect(() => gradeAnswer(q, { order: [byText('first'), byText('first'), byText('third')] })).toThrow(QuizAnswerError);
  });

  it('grades matching questions pair by pair and refuses a pair used twice', () => {
    const q: QuizQuestion = { id: 'q3', type: 'matching', prompt: 'Match', pairs: [{ left: 'a', right: '1' }, { left: 'b', right: '2' }] };
    const pub = toPublicQuiz([q], 'x')[0] as { left: { id: string; text: string }[]; right: { id: string; text: string }[] };
    const L = (t: string) => pub.left.find((i) => i.text === t)!.id;
    const R = (t: string) => pub.right.find((i) => i.text === t)!.id;
    expect(gradeAnswer(q, { pairs: [{ leftId: L('a'), rightId: R('1') }, { leftId: L('b'), rightId: R('2') }] }).correct).toBe(true);
    expect(gradeAnswer(q, { pairs: [{ leftId: L('a'), rightId: R('2') }, { leftId: L('b'), rightId: R('1') }] }).correct).toBe(false);
    expect(() => gradeAnswer(q, { pairs: [{ leftId: L('a'), rightId: R('1') }, { leftId: L('b'), rightId: R('1') }] })).toThrow(QuizAnswerError);
  });

  it('never grades self-checks or reflections, and does not send the learner’s words back', () => {
    const sc: QuizQuestion = { id: 'q4', type: 'self_check', prompt: 'Explain', sampleAnswer: 'SECRET-SAMPLE' };
    const typed = gradeAnswer(sc, { text: 'my private thoughts' });
    expect(typed).toMatchObject({ graded: false, correct: null, reveal: { sampleAnswer: 'SECRET-SAMPLE' } });
    expect(JSON.stringify(typed)).not.toContain('my private thoughts');
    expect(gradeAnswer(sc, { answered: true }).graded).toBe(false);
    expect(() => gradeAnswer(sc, {})).toThrow(QuizAnswerError);
    const rf: QuizQuestion = { id: 'q5', type: 'reflection', prompt: 'Think' };
    expect(gradeAnswer(rf, { answered: true })).toEqual({ questionId: 'q5', graded: false, correct: null });
  });

  it('counts only machine-graded questions in the score', () => {
    const qs: QuizQuestion[] = [choice(), { id: 'q4', type: 'self_check', prompt: 'x' }, { id: 'q5', type: 'reflection', prompt: 'y' }, { id: 'q6', type: 'ordering', prompt: 'z', items: ['a', 'b'] }];
    expect(gradedCount(qs)).toBe(2);
    expect(gradedCount(null)).toBe(0);
  });
});

describe('authored quizzes are validated', () => {
  it('accepts every authored quiz in the catalog', () => {
    const keys = quizCatalogKeys();
    expect(keys.length).toBe(24);
    for (const k of keys) {
      const v = normalizeQuiz(quizCatalogFor(k));
      expect({ k, errors: v.errors }).toEqual({ k, errors: [] });
      expect(v.quiz.length).toBe(3);
    }
  });

  it('rejects malformed questions with a message a human can act on', () => {
    expect(normalizeQuiz([{ id: 'q1', type: 'multiple_choice', prompt: 'x', options: ['a', 'b'], correctIndex: 5 }]).errors.join(' ')).toMatch(/correct/i);
    expect(normalizeQuiz([{ id: 'q1', type: 'nope', prompt: 'x' }]).errors.length).toBeGreaterThan(0);
    expect(normalizeQuiz([choice(), choice()]).errors.join(' ')).toMatch(/duplicate/i);
    expect(normalizeQuiz('not a list').errors.length).toBe(1);
  });
});
