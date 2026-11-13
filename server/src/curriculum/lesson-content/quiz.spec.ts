import { gradeAnswer, gradedCount, hasFixedOrder, isConformingQuestion, MCQ_RULE, normalizeQuiz, optionId, QuizAnswerError, toPublicQuiz } from './quiz';
import { quizCatalogFor, quizCatalogKeys } from './quiz-catalog';
import { readQuiz } from './serialize';
import './catalog';
import { MCQ_OPTION_COUNT, type McqQuestion } from './types';
import { upgradeAll } from './test-support';

const mcq = (over: Partial<McqQuestion> = {}): McqQuestion => ({
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

/** The quiz every shipped learning lesson ends up with (what a learner is served), read the way the server reads it. */
const shipped = (): { key: string; questions: McqQuestion[] }[] => upgradeAll().map(({ c, patch }) => ({ key: c.key, questions: readQuiz(patch.miniQuiz) }));

describe('every quiz question is a multiple-choice question with exactly four options', () => {
  it('holds for every question of every shipped learning lesson — there is no exception', () => {
    const all = shipped();
    expect(all).toHaveLength(168);
    let total = 0;
    for (const { key, questions } of all) {
      expect({ key, hasQuiz: questions.length > 0 }).toEqual({ key, hasQuiz: true });
      for (const q of questions) {
        total++;
        expect({ key, id: q.id, type: q.type }).toEqual({ key, id: q.id, type: 'multiple_choice' });
        expect({ key, id: q.id, options: q.options.length }).toEqual({ key, id: q.id, options: MCQ_OPTION_COUNT });
        expect({ key, id: q.id, distinct: new Set(q.options).size }).toEqual({ key, id: q.id, distinct: MCQ_OPTION_COUNT });
        expect(q.options.every((o) => o.trim() !== '')).toBe(true);
        expect(Number.isInteger(q.correctIndex) && q.correctIndex >= 0 && q.correctIndex < MCQ_OPTION_COUNT).toBe(true);
        expect({ key, id: q.id, conforming: isConformingQuestion(q) }).toEqual({ key, id: q.id, conforming: true });
      }
    }
    expect(total).toBeGreaterThan(600);
  });

  it('what is stored is already in that form, so reading it back changes nothing', () => {
    for (const { c, patch } of upgradeAll()) {
      const stored = patch.miniQuiz as unknown[];
      expect({ key: c.key, kept: readQuiz(stored).length }).toEqual({ key: c.key, kept: stored.length });
    }
  });

  it('rejects every other kind of question, and a wrong number of options, with a message that names the rule', () => {
    for (const type of ['true_false', 'ordering', 'matching', 'self_check', 'reflection', 'code_output', 'code_error', 'nope']) {
      const v = normalizeQuiz([{ id: 'q1', type, prompt: 'x', options: ['a', 'b', 'c', 'd'], correctIndex: 0 }]);
      expect({ type, accepted: v.quiz.length, mentionsRule: v.errors.join(' ').includes(MCQ_RULE) }).toEqual({ type, accepted: 0, mentionsRule: true });
    }
    for (const options of [['a'], ['a', 'b'], ['a', 'b', 'c'], ['a', 'b', 'c', 'd', 'e']]) {
      const v = normalizeQuiz([{ id: 'q1', type: 'multiple_choice', prompt: 'x', options, correctIndex: 0 }]);
      expect({ n: options.length, accepted: v.quiz.length, error: v.errors.join(' ') }).toMatchObject({ accepted: 0, error: expect.stringMatching(/exactly 4 answer options/) });
    }
    expect(isConformingQuestion({ id: 'q', type: 'true_false', prompt: 'x', options: ['True', 'False'], correctIndex: 0 })).toBe(false);
    expect(isConformingQuestion({ id: 'q', type: 'self_check', prompt: 'x', sampleAnswer: 'y' })).toBe(false);
    expect(isConformingQuestion(mcq())).toBe(true);
  });

  it('never serves a question that breaks the rule, even if one is stored', () => {
    const stored = [mcq(), { id: 'q2', type: 'self_check', prompt: 'Explain' }, { id: 'q3', type: 'multiple_choice', prompt: 'Two?', options: ['a', 'b'], correctIndex: 0 }, mcq({ id: 'q4' })];
    const served = readQuiz(stored);
    expect(served.map((q) => q.id)).toEqual(['q1', 'q4']);
    expect(readQuiz(null)).toEqual([]);
    expect(readQuiz('not a quiz')).toEqual([]);
  });

  it('rejects duplicate options, blank options, a missing correct option and an empty question', () => {
    expect(normalizeQuiz([mcq({ options: ['a', 'a', 'b', 'c'] })]).errors.join(' ')).toMatch(/different/i);
    expect(normalizeQuiz([mcq({ options: ['a', ' ', 'b', 'c'] })]).errors.join(' ')).toMatch(/needs text/i);
    expect(normalizeQuiz([mcq({ correctIndex: 4 })]).errors.join(' ')).toMatch(/correct/i);
    expect(normalizeQuiz([mcq({ correctIndex: undefined as never })]).errors.join(' ')).toMatch(/correct/i);
    expect(normalizeQuiz([mcq({ prompt: '   ' })]).errors.join(' ')).toMatch(/question text/i);
    expect(normalizeQuiz([mcq(), mcq()]).errors.join(' ')).toMatch(/duplicate/i);
    expect(normalizeQuiz('not a list').errors.length).toBe(1);
    expect(normalizeQuiz(null).errors).toEqual([]);
  });

  it('keeps an optional code snippet with the question and rejects a broken one', () => {
    const ok = normalizeQuiz([mcq({ code: { language: 'python', code: 'print(1 + 1)' } })]);
    expect(ok.errors).toEqual([]);
    expect(ok.quiz[0].code).toEqual({ language: 'python', code: 'print(1 + 1)' });
    expect(normalizeQuiz([mcq({ code: { language: 'python', code: '   ' } })]).errors.join(' ')).toMatch(/code snippet/i);
  });
});

describe('the learner never receives an answer in the initial payload', () => {
  it('has no correct index, explanation or reveal anywhere in any shipped quiz', () => {
    for (const { key, questions } of shipped()) {
      const pub = toPublicQuiz(questions, 'lesson-id');
      const json = JSON.stringify(pub);
      expect({ key, keys: keysOf(pub).filter((k) => ['correctIndex', 'correct', 'answer', 'explanation', 'sampleAnswer', 'reveal', 'pairs', 'fixedOrder', 'source'].includes(k)) }).toEqual({ key, keys: [] });
      // The text of an explanation must not appear either — unless it only quotes words the question already shows.
      for (const q of questions) {
        if (!q.explanation || q.explanation.length <= 25) continue;
        const shown = [q.prompt, ...q.options].join('\n').toLowerCase();
        if (shown.includes(q.explanation.toLowerCase())) continue;
        expect({ key, id: q.id, leaked: json.includes(q.explanation) }).toEqual({ key, id: q.id, leaked: false });
      }
    }
  });

  it('serves the four options of every question, as text with an id', () => {
    for (const { key, questions } of shipped()) {
      for (const p of toPublicQuiz(questions, key)) {
        expect({ key, id: p.id, type: p.type, options: p.options.length }).toEqual({ key, id: p.id, type: 'multiple_choice', options: MCQ_OPTION_COUNT });
      }
    }
  });

  it('uses opaque option ids, so an id says nothing about which option is right', () => {
    const pub = toPublicQuiz([mcq()], 'x')[0];
    for (const o of pub.options) expect(o.id).toMatch(/^o[0-9a-z]+$/);
    expect(pub.options.map((o) => o.id)).not.toContain('b');
    expect(optionId('q1', 1)).toBe(pub.options.find((o) => o.text === 'beta')!.id);
  });

  it('shuffles options deterministically, so teacher and student see the same order', () => {
    const q = mcq();
    const a = toPublicQuiz([q], 'lesson-1')[0];
    const b = toPublicQuiz([q], 'lesson-1')[0];
    expect(a.options.map((o) => o.text)).toEqual(b.options.map((o) => o.text));
    expect(a.options.map((o) => o.text)).not.toEqual(q.options); // never the authored order
  });

  it('does not leave the right answer in a predictable position across the shipped quizzes', () => {
    const positions = [0, 0, 0, 0];
    let n = 0;
    for (const { key, questions } of shipped()) {
      const pub = toPublicQuiz(questions, key);
      questions.forEach((q, i) => {
        if (hasFixedOrder(q)) return;
        const right = optionId(q.id, q.correctIndex);
        positions[pub[i].options.findIndex((o) => o.id === right)]++;
        n++;
      });
    }
    expect(n).toBeGreaterThan(600);
    for (const count of positions) {
      expect(count / n).toBeGreaterThan(0.15);
      expect(count / n).toBeLessThan(0.35);
    }
  });

  it('keeps "all of the above" questions in their authored order', () => {
    const all = mcq({ options: ['one', 'two', 'both of the above', 'none of the above'], correctIndex: 2 });
    expect(hasFixedOrder(all)).toBe(true);
    expect(toPublicQuiz([all], 'x')[0].options.map((o) => o.text)).toEqual(all.options);
    expect(toPublicQuiz([mcq({ fixedOrder: true })], 'x')[0].options.map((o) => o.text)).toEqual(['alpha', 'beta', 'gamma', 'delta']);
  });
});

describe('grading is deterministic and reveals the answer only after a submission', () => {
  it('grades a question and reveals the right option and the explanation', () => {
    const q = mcq();
    const right = gradeAnswer(q, { optionId: optionId('q1', 1) });
    expect(right).toMatchObject({ graded: true, correct: true, reveal: { optionId: optionId('q1', 1) } });
    expect(right.explanation).toContain('SECRET-EXPLANATION');
    const wrong = gradeAnswer(q, { optionId: optionId('q1', 0) });
    expect(wrong).toMatchObject({ graded: true, correct: false, reveal: { optionId: optionId('q1', 1) } });
    expect(gradeAnswer(q, { optionId: optionId('q1', 1) })).toEqual(right); // same input, same output
  });

  it('grades every option of every shipped question: exactly one is right', () => {
    for (const { key, questions } of shipped()) {
      for (const q of questions) {
        const verdicts = q.options.map((_, i) => gradeAnswer(q, { optionId: optionId(q.id, i) }).correct);
        expect({ key, id: q.id, right: verdicts.filter(Boolean).length }).toEqual({ key, id: q.id, right: 1 });
      }
    }
  });

  it('rejects an option that does not belong to the question, or no answer at all', () => {
    const q = mcq();
    expect(() => gradeAnswer(q, { optionId: optionId('other', 1) })).toThrow(QuizAnswerError);
    expect(() => gradeAnswer(q, null)).toThrow(QuizAnswerError);
    expect(() => gradeAnswer(q, {} as never)).toThrow(QuizAnswerError);
    expect(() => gradeAnswer(q, { text: 'a typed answer' } as never)).toThrow(QuizAnswerError);
  });

  it('counts every question in the score — they are all graded', () => {
    expect(gradedCount([mcq(), mcq({ id: 'q2' }), mcq({ id: 'q3' })])).toBe(3);
    expect(gradedCount(null)).toBe(0);
  });
});

describe('authored quizzes are validated', () => {
  it('accepts every authored quiz in the catalog, each question four-option multiple choice', () => {
    // Little Coders: 24 lessons × 3 questions. Python Foundations: 24 lessons × 5 questions.
    const littleCoders = new Set([
      'scratch-adventures',
      'python-for-young-builders',
      'ai-for-kids',
    ]);
    const keys = quizCatalogKeys();
    expect(keys.length).toBe(48);
    for (const k of keys) {
      const v = normalizeQuiz(quizCatalogFor(k));
      expect({ k, errors: v.errors }).toEqual({ k, errors: [] });
      const want = littleCoders.has(k.split('/')[0]) ? 3 : 5;
      expect({ k, questions: v.quiz.length }).toEqual({ k, questions: want });
      for (const q of v.quiz) expect(q.options).toHaveLength(MCQ_OPTION_COUNT);
    }
  });
});
