import {
  balancedPositions,
  bankKeyFor,
  materializeBank,
  seededShuffle,
} from './bank.materialize';
import { TRUE_FALSE_OPTIONS } from './bank.constants';
import { syntheticBank } from './testing/synthetic-bank';

describe('seededShuffle', () => {
  it('is deterministic and a true permutation', () => {
    const input = Array.from({ length: 20 }, (_, i) => i);
    const a = seededShuffle(input, 'seed-1');
    const b = seededShuffle(input, 'seed-1');
    expect(a).toEqual(b);
    expect([...a].sort((x, y) => x - y)).toEqual(input);
    expect(input).toEqual(Array.from({ length: 20 }, (_, i) => i)); // untouched
  });

  it('different seeds give different orders', () => {
    const input = Array.from({ length: 20 }, (_, i) => i);
    expect(seededShuffle(input, 'a')).not.toEqual(seededShuffle(input, 'b'));
  });
});

describe('balancedPositions', () => {
  it.each([25, 30, 33])(
    'spreads correct answers evenly over A–D for %i questions',
    (count) => {
      const counts = [0, 0, 0, 0];
      balancedPositions(count, 'bank:positions').forEach((p) => counts[p]++);
      expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
      expect(counts.reduce((a, b) => a + b, 0)).toBe(count);
    },
  );
});

describe('materializeBank', () => {
  const bank = syntheticBank('x/course', 'COURSE_TEST');

  it('is deterministic — the same bank always produces the same rows', () => {
    expect(materializeBank(bank)).toEqual(materializeBank(bank));
  });

  it('puts the authored correct answer exactly where correctIndex points', () => {
    const { questions } = materializeBank(bank);
    bank.mcq.forEach((src, i) => {
      const row = questions[i];
      expect(row.questionType).toBe('MCQ');
      expect(row.options).toHaveLength(4);
      expect(row.options[row.correctIndex]).toBe(src.correct);
      // The three wrong answers are all still there, in their authored order.
      expect(row.options.filter((_, idx) => idx !== row.correctIndex)).toEqual(
        src.wrong,
      );
    });
  });

  it('never repeats an option within a question', () => {
    for (const row of materializeBank(bank).questions) {
      expect(new Set(row.options).size).toBe(row.options.length);
    }
  });

  it('spreads the correct answer across A, B, C and D', () => {
    const counts = [0, 0, 0, 0];
    materializeBank(bank)
      .questions.filter((q) => q.questionType === 'MCQ')
      .forEach((q) => counts[q.correctIndex]++);
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
  });

  it('True/False rows use True/False options with the right key', () => {
    const rows = materializeBank(bank).questions.filter(
      (q) => q.questionType === 'TRUE_FALSE',
    );
    expect(rows).toHaveLength(10);
    rows.forEach((row, i) => {
      expect(row.options).toEqual([...TRUE_FALSE_OPTIONS]);
      expect(row.correctIndex).toBe(bank.trueFalse[i].answer ? 0 : 1);
    });
  });

  it('orders MCQs first, then True/False, with stable bank keys', () => {
    const { questions } = materializeBank(bank);
    expect(questions).toHaveLength(40);
    expect(questions.map((q) => q.order)).toEqual(
      Array.from({ length: 40 }, (_, i) => i),
    );
    expect(questions[0].bankKey).toBe('x/course#M01');
    expect(questions[29].bankKey).toBe('x/course#M30');
    expect(questions[30].bankKey).toBe('x/course#T01');
    expect(questions[39].bankKey).toBe('x/course#T10');
    expect(bankKeyFor('x/course', 'M07')).toBe('x/course#M07');
    expect(new Set(questions.map((q) => q.bankKey)).size).toBe(40);
  });

  it('records the topic (lesson / module) as a tag', () => {
    const { questions } = materializeBank(bank);
    expect(questions[0].tags).toEqual(['topic:1']);
    expect(questions[8].tags).toEqual(['topic:1']);
    expect(questions[7].tags).toEqual(['topic:8']);
  });

  it('a course test has no coding project; a final test carries its project', () => {
    expect(materializeBank(bank).coding).toBeNull();

    const final = syntheticBank('x/final', 'FINAL_TEST');
    const { coding, questions } = materializeBank(final);
    expect(questions).toHaveLength(30);
    expect(coding).toMatchObject({
      bankKey: 'x/final#P01',
      maxScore: 20,
      language: 'python',
    });
    expect(coding!.rubric.map((r) => r.maxPoints)).toEqual([8, 5, 4, 3]);
  });
});
