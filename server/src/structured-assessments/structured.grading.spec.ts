// FILE PATH: server/src/structured-assessments/structured.grading.spec.ts
//
// The marks of a structured assessment: Part A (10 x 1, automatic), Part B (3 x 5, rubric) and
// Part C (20, rubric) add up to 45, and a report has no total until the teacher has marked every
// criterion of every short answer and of the practical.

import { SessionType, TestReportStatus } from '@prisma/client';
import {
  ReportValidationError,
  ShortAnswerResult,
  applyShortAnswerMarks,
  computeTotals,
  sumShortAnswers,
} from '../assessments/assessment-grading';
import { buildReportCreateData } from '../assessments/test-report.builder';
import { STRUCTURED_MARKS } from './structured.constants';

const rubric = (names: [string, number][]) =>
  names.map(([criterion, maxPoints]) => ({ criterion, maxPoints, lookFor: 'what the teacher looks for', score: null as number | null }));

const answers = (): ShortAnswerResult[] => [
  { questionId: 'q1', order: 1, prompt: 'First?', answer: 'A', maxScore: 5, rubric: rubric([['Correct output', 2], ['Reason', 2], ['Trace', 1]]), comment: null, modelAnswer: 'model 1' },
  { questionId: 'q2', order: 2, prompt: 'Second?', answer: 'B', maxScore: 5, rubric: rubric([['Idea', 3], ['Example', 2]]), comment: null, modelAnswer: 'model 2' },
  { questionId: 'q3', order: 3, prompt: 'Third?', answer: 'C', maxScore: 5, rubric: rubric([['Design', 2], ['Code', 2], ['Errors', 1]]), comment: null, modelAnswer: 'model 3' },
];

const fullMarks = (): { questionId: string; scores: { criterion: string; score: number }[] }[] =>
  answers().map((a) => ({ questionId: a.questionId, scores: a.rubric.map((c) => ({ criterion: c.criterion, score: c.maxPoints })) }));

describe('structured assessment marks', () => {
  it('is 45 marks: 10 + 15 + 20', () => {
    expect(STRUCTURED_MARKS).toEqual({ partA: 10, partB: 15, partC: 20, total: 45 });
    const totals = computeTotals({ objectiveScore: 8, objectiveMax: 10, shortMax: 15, shortScore: 12, codingMax: 20, codingScore: 15, passScorePct: 40 });
    expect(totals).toEqual({ totalMax: 45, total: 35, percentage: 77.8, passed: true });
  });

  it('has no total while Part B or Part C is unmarked', () => {
    expect(computeTotals({ objectiveScore: 8, objectiveMax: 10, shortMax: 15, shortScore: null, codingMax: 20, codingScore: 15, passScorePct: 40 }).total).toBeNull();
    expect(computeTotals({ objectiveScore: 8, objectiveMax: 10, shortMax: 15, shortScore: 12, codingMax: 20, codingScore: null, passScorePct: 40 }).total).toBeNull();
    expect(computeTotals({ objectiveScore: 8, objectiveMax: 10, shortMax: 15, shortScore: null, codingMax: 20, codingScore: 15, passScorePct: 40 }).totalMax).toBe(45);
  });

  it('keeps the old totals for a test without short answers', () => {
    expect(computeTotals({ objectiveScore: 7, objectiveMax: 10, codingMax: null, codingScore: null, passScorePct: 60 })).toEqual({
      totalMax: 10,
      total: 7,
      percentage: 70,
      passed: true,
    });
  });

  it('marks the short answers criterion by criterion', () => {
    expect(sumShortAnswers(answers())).toBeNull();
    const partial = applyShortAnswerMarks(answers(), [{ questionId: 'q1', scores: [{ criterion: 'Correct output', score: 2 }] }]);
    expect(sumShortAnswers(partial)).toBeNull();
    const done = applyShortAnswerMarks(answers(), fullMarks());
    expect(sumShortAnswers(done)).toBe(15);
    const rounded = applyShortAnswerMarks(done, [{ questionId: 'q2', scores: [{ criterion: 'Idea', score: 1.5 }] }]);
    expect(sumShortAnswers(rounded)).toBe(13.5);
  });

  it('rejects impossible marks', () => {
    expect(() => applyShortAnswerMarks(answers(), [{ questionId: 'nope', scores: [] }])).toThrow(ReportValidationError);
    expect(() => applyShortAnswerMarks(answers(), [{ questionId: 'q1', scores: [{ criterion: 'Invented', score: 1 }] }])).toThrow(ReportValidationError);
    expect(() => applyShortAnswerMarks(answers(), [{ questionId: 'q1', scores: [{ criterion: 'Reason', score: 3 }] }])).toThrow(/too high/);
    expect(() => applyShortAnswerMarks(answers(), [{ questionId: 'q1', scores: [{ criterion: 'Reason', score: -1 }] }])).toThrow(ReportValidationError);
    expect(() => applyShortAnswerMarks(answers(), [{ questionId: 'q1' }, { questionId: 'q1' }])).toThrow(/twice/);
  });

  it('stores a comment and clears it again', () => {
    const withComment = applyShortAnswerMarks(answers(), [{ questionId: 'q3', comment: '  Good trace.  ' }]);
    expect(withComment[2].comment).toBe('Good trace.');
    expect(applyShortAnswerMarks(withComment, [{ questionId: 'q3', comment: '' }])[2].comment).toBeNull();
  });

  it('builds a report that waits for the teacher: no total yet, 45 marks in all', () => {
    const data = buildReportCreateData({
      attemptId: 'a1',
      assessmentId: 's1',
      studentUserId: 'u1',
      teacherId: 't1',
      courseId: 'c1',
      courseTitle: 'Pre-University CSE',
      lessonId: 'l1',
      scheduledLessonId: 'sl1',
      type: SessionType.COURSE_TEST,
      testTitle: 'Course Assessment',
      passScorePct: 40,
      submittedAt: new Date('2026-03-02T10:00:00Z'),
      answers: Array.from({ length: 10 }, (_, i) => ({
        questionId: `m${i}`,
        kind: 'MCQ' as const,
        text: `Q${i}`,
        storedOptions: ['a', 'b', 'c', 'd'],
        optionOrder: [0, 1, 2, 3],
        selectedIndex: i < 7 ? 0 : null,
        correctIndex: 0,
        explanation: null,
      })),
      coding: { questionId: 'p1', title: 'Practical', instructions: 'Do it', language: 'python', maxScore: 20, rubric: [{ criterion: 'Correct', maxPoints: 20 }], code: 'print(1)', savedAt: null },
      shortAnswers: answers().map((a) => ({ questionId: a.questionId, order: a.order, prompt: a.prompt, answer: a.answer, maxScore: a.maxScore, rubric: a.rubric, modelAnswer: a.modelAnswer })),
    });
    expect(data.status).toBe(TestReportStatus.PENDING_CODE_EVALUATION);
    expect(data.hasShortAnswers).toBe(true);
    expect(data.shortAnswerMaxScore).toBe(15);
    expect(data.shortAnswerScore).toBeNull();
    expect(data.objectiveScore).toBe(7);
    expect(data.objectiveMaxScore).toBe(10);
    expect(data.codingMaxScore).toBe(20);
    expect(data.totalMaxScore).toBe(45);
    expect(data.totalScore).toBeNull();
    expect(data.percentage).toBeNull();
  });
});
