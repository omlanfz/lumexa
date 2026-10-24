import {
  QuestionResult,
  ReportValidationError,
  RubricScore,
  applyQuestionOverrides,
  applyRubricScores,
  computeTotals,
  isEffectivelyCorrect,
  summarizeObjective,
  sumRubric,
} from './assessment-grading';

const NOW = '2026-10-24T09:00:00.000Z';

/** A question as it appears on a report card. */
function q(
  id: string,
  over: Partial<QuestionResult> & { correct?: boolean } = {},
): QuestionResult {
  const { correct = true, ...rest } = over;
  return {
    questionId: id,
    order: 1,
    kind: 'MCQ',
    text: `Question ${id}`,
    options: ['a', 'b', 'c', 'd'],
    selectedIndex: correct ? 2 : 0,
    correctIndex: 2,
    autoCorrect: correct,
    explanation: null,
    override: null,
    ...rest,
  };
}

/** 30 MCQ + 10 T/F with the requested number of each answered correctly. */
function courseTest(mcqRight: number, tfRight: number): QuestionResult[] {
  const out: QuestionResult[] = [];
  for (let i = 0; i < 30; i++) out.push(q(`m${i}`, { correct: i < mcqRight }));
  for (let i = 0; i < 10; i++)
    out.push(q(`t${i}`, { kind: 'TRUE_FALSE', correct: i < tfRight }));
  return out;
}

describe('summarizeObjective', () => {
  it('scores one mark per correct question across MCQ and True/False', () => {
    const s = summarizeObjective(courseTest(24, 7));
    expect(s).toMatchObject({
      mcqTotal: 30,
      trueFalseTotal: 10,
      mcqCorrect: 24,
      trueFalseCorrect: 7,
      score: 31,
      autoScore: 31,
      max: 40,
      overrides: 0,
    });
  });

  it('counts unanswered questions as wrong and reports how many were skipped', () => {
    const results = [
      q('a', { selectedIndex: null, autoCorrect: false }),
      q('b'),
      q('c', { selectedIndex: null, autoCorrect: false }),
    ];
    const s = summarizeObjective(results);
    expect(s.score).toBe(1);
    expect(s.max).toBe(3);
    expect(s.unanswered).toBe(2);
  });

  it('applies teacher overrides to the score but keeps the automatic score', () => {
    const results = courseTest(30, 10);
    // Teacher marks one MCQ wrong and gives credit on a different wrong one.
    results[0] = {
      ...results[0],
      override: { correct: false, note: 'ambiguous', at: NOW },
    };
    const wrong = q('wrong', {
      correct: false,
      override: { correct: true, note: null, at: NOW },
    });
    const s = summarizeObjective([...results, wrong]);
    expect(s.autoScore).toBe(40); // automatic result untouched
    expect(s.score).toBe(40); // -1 (override) +1 (override)
    expect(s.overrides).toBe(2);
    expect(isEffectivelyCorrect(results[0])).toBe(false);
    expect(isEffectivelyCorrect(wrong)).toBe(true);
  });

  it('handles an empty result list without dividing by zero', () => {
    expect(summarizeObjective([])).toMatchObject({ score: 0, max: 0 });
  });
});

describe('sumRubric', () => {
  const base: RubricScore[] = [
    { criterion: 'A', maxPoints: 8, score: 6.5 },
    { criterion: 'B', maxPoints: 12, score: 9.25 },
  ];

  it('is the exact sum of the criteria marks', () => {
    expect(sumRubric(base)).toBe(15.75);
  });

  it('has no total while any criterion is unmarked', () => {
    expect(sumRubric([base[0], { ...base[1], score: null }])).toBeNull();
  });

  it('has no total when there is no rubric', () => {
    expect(sumRubric([])).toBeNull();
    expect(sumRubric(null)).toBeNull();
    expect(sumRubric(undefined)).toBeNull();
  });

  it('does not accumulate floating-point noise', () => {
    const noisy: RubricScore[] = [
      { criterion: 'A', maxPoints: 5, score: 0.1 },
      { criterion: 'B', maxPoints: 5, score: 0.2 },
    ];
    expect(sumRubric(noisy)).toBe(0.3);
  });
});

describe('computeTotals', () => {
  it('course test: 28/40 is exactly 70% and passes a 70% mark', () => {
    expect(
      computeTotals({
        objectiveScore: 28,
        objectiveMax: 40,
        codingMax: null,
        codingScore: null,
        passScorePct: 70,
      }),
    ).toEqual({ totalMax: 40, total: 28, percentage: 70, passed: true });
  });

  it('course test: 27/40 (67.5%) fails a 70% mark', () => {
    expect(
      computeTotals({
        objectiveScore: 27,
        objectiveMax: 40,
        codingMax: null,
        codingScore: null,
        passScorePct: 70,
      }),
    ).toEqual({ totalMax: 40, total: 27, percentage: 67.5, passed: false });
  });

  it('final test: no total, percentage or pass decision until the project is marked', () => {
    expect(
      computeTotals({
        objectiveScore: 27,
        objectiveMax: 30,
        codingMax: 20,
        codingScore: null,
        passScorePct: 70,
      }),
    ).toEqual({ totalMax: 50, total: null, percentage: null, passed: null });
  });

  it('final test: objective + coding marks are added and compared with the pass mark', () => {
    expect(
      computeTotals({
        objectiveScore: 24,
        objectiveMax: 30,
        codingMax: 20,
        codingScore: 14,
        passScorePct: 70,
      }),
    ).toEqual({ totalMax: 50, total: 38, percentage: 76, passed: true });
    expect(
      computeTotals({
        objectiveScore: 24,
        objectiveMax: 30,
        codingMax: 20,
        codingScore: 10,
        passScorePct: 70,
      }),
    ).toEqual({ totalMax: 50, total: 34, percentage: 68, passed: false });
  });

  it('final test: a zero on the project is a real mark, not "unmarked"', () => {
    const t = computeTotals({
      objectiveScore: 30,
      objectiveMax: 30,
      codingMax: 20,
      codingScore: 0,
      passScorePct: 70,
    });
    expect(t.total).toBe(30);
    expect(t.percentage).toBe(60);
    expect(t.passed).toBe(false);
  });

  it('never rounds a near miss up into a pass', () => {
    const t = computeTotals({
      objectiveScore: 2998,
      objectiveMax: 5000, // 59.96%
      codingMax: null,
      codingScore: null,
      passScorePct: 60,
    });
    expect(t.percentage).toBe(60); // displayed rounded to 1 dp …
    expect(t.passed).toBe(false); // … but the decision uses the true ratio
  });

  it('an empty test cannot pass', () => {
    expect(
      computeTotals({
        objectiveScore: 0,
        objectiveMax: 0,
        codingMax: null,
        codingScore: null,
        passScorePct: 70,
      }),
    ).toEqual({ totalMax: 0, total: 0, percentage: 0, passed: false });
  });
});

describe('applyRubricScores', () => {
  const rubric: RubricScore[] = [
    { criterion: 'Functions', maxPoints: 5, score: null },
    { criterion: 'Calculations', maxPoints: 6, score: 4 },
    { criterion: 'Clarity', maxPoints: 9, score: null },
  ];

  it('merges the incoming marks and leaves unmentioned criteria alone', () => {
    const next = applyRubricScores(rubric, [
      { criterion: 'Functions', score: 5 },
    ]);
    expect(next.map((c) => c.score)).toEqual([5, 4, null]);
    expect(rubric[0].score).toBeNull(); // input is not mutated
  });

  it('can clear a mark again', () => {
    const next = applyRubricScores(rubric, [
      { criterion: 'Calculations', score: null },
    ]);
    expect(next[1].score).toBeNull();
  });

  it('accepts the exact maximum and zero', () => {
    const next = applyRubricScores(rubric, [
      { criterion: 'Functions', score: 5 },
      { criterion: 'Clarity', score: 0 },
    ]);
    expect(next.map((c) => c.score)).toEqual([5, 4, 0]);
  });

  it('rounds marks to two decimal places', () => {
    const next = applyRubricScores(rubric, [
      { criterion: 'Clarity', score: 3.14159 },
    ]);
    expect(next[2].score).toBe(3.14);
  });

  it.each([
    ['an unknown criterion', [{ criterion: 'Nope', score: 1 }]],
    [
      'the same criterion twice',
      [
        { criterion: 'Functions', score: 1 },
        { criterion: 'Functions', score: 2 },
      ],
    ],
    ['a negative mark', [{ criterion: 'Functions', score: -1 }]],
    ['a mark above the maximum', [{ criterion: 'Functions', score: 5.5 }]],
    ['NaN', [{ criterion: 'Functions', score: NaN }]],
    ['Infinity', [{ criterion: 'Functions', score: Infinity }]],
  ])('rejects %s', (_label, incoming) => {
    expect(() => applyRubricScores(rubric, incoming)).toThrow(
      ReportValidationError,
    );
  });
});

describe('applyQuestionOverrides', () => {
  const results = [
    q('q1', { correct: true }),
    q('q2', { correct: false }),
    q('q3', { correct: false }),
  ];

  it('records an override only when it differs from the automatic result', () => {
    const next = applyQuestionOverrides(
      results,
      [
        { questionId: 'q1', correct: true }, // same as auto → not an override
        { questionId: 'q2', correct: true, note: '  accept this wording ' },
      ],
      NOW,
    );
    expect(next[0].override).toBeNull();
    expect(next[1].override).toEqual({
      correct: true,
      note: 'accept this wording',
      at: NOW,
    });
    expect(next[2].override).toBeNull();
  });

  it('keeps the automatic result alongside the override', () => {
    const [, second] = applyQuestionOverrides(
      results,
      [{ questionId: 'q2', correct: true }],
      NOW,
    );
    expect(second.autoCorrect).toBe(false);
    expect(isEffectivelyCorrect(second)).toBe(true);
  });

  it('null removes an existing override (back to the automatic result)', () => {
    const overridden = applyQuestionOverrides(
      results,
      [{ questionId: 'q2', correct: true }],
      NOW,
    );
    const reverted = applyQuestionOverrides(
      overridden,
      [{ questionId: 'q2', correct: null }],
      NOW,
    );
    expect(reverted[1].override).toBeNull();
    expect(isEffectivelyCorrect(reverted[1])).toBe(false);
  });

  it('turning a correct answer wrong changes the score but not the auto score', () => {
    const next = applyQuestionOverrides(
      results,
      [{ questionId: 'q1', correct: false, note: '' }],
      NOW,
    );
    expect(next[0].override).toEqual({ correct: false, note: null, at: NOW });
    const s = summarizeObjective(next);
    expect(s.score).toBe(0);
    expect(s.autoScore).toBe(1);
    expect(s.overrides).toBe(1);
  });

  it('rejects a question that is not on the report', () => {
    expect(() =>
      applyQuestionOverrides(
        results,
        [{ questionId: 'someone-elses', correct: true }],
        NOW,
      ),
    ).toThrow(ReportValidationError);
  });

  it('does not mutate its input', () => {
    const before = JSON.stringify(results);
    applyQuestionOverrides(results, [{ questionId: 'q2', correct: true }], NOW);
    expect(JSON.stringify(results)).toBe(before);
  });
});
