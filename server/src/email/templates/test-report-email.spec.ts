// The report card that goes to a parent: a structured assessment (Pre-University CSE) shows its three
// parts and they add up to the total; every other test keeps its objective rows exactly as before.

import { testReportEmail, type TestReportEmailParams } from './student.templates';

const base: TestReportEmailParams = {
  studentName: 'Mira',
  teacherName: 'Ms Karim',
  courseTitle: 'Pre-University CSE',
  testTitle: 'Course Assessment: Programming Foundations with C',
  testTypeLabel: 'Course Assessment',
  submittedAt: new Date('2026-03-02T10:40:00Z'),
  objective: { score: 8, max: 10, mcq: { correct: 8, total: 10 }, trueFalse: { correct: 0, total: 0 } },
  coding: { score: 15, max: 20 },
  total: 35,
  totalMax: 45,
  percentage: 77.8,
  passed: true,
  passScorePct: 40,
  feedback: null,
  strengths: null,
  improvements: null,
  codingFeedback: null,
  dashboardUrl: 'https://x.test/d',
};

const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

describe('test report email', () => {
  it('shows Part A, Part B and Part C of a structured assessment, and they add up to the total', () => {
    const { html } = testReportEmail({
      ...base,
      shortAnswers: { score: 12, max: 15 },
      codingLabel: 'Part C — Practical (marked by the teacher)',
    });
    const t = text(html);
    expect(t).toContain('Part A — Multiple choice (10 questions) 8 / 10');
    expect(t).toContain('Part B — Short answers (marked by the teacher) 12 / 15');
    expect(t).toContain('Part C — Practical (marked by the teacher) 15 / 20');
    expect(t).toContain('Total 35 / 45');
    expect(8 + 12 + 15).toBe(35);
    // There is no True/False in a structured assessment, so no row for it.
    expect(t).not.toMatch(/True\/False/);
    expect(t).not.toContain('Multiple-choice correct');
  });

  it('keeps the objective rows of every other test', () => {
    const { html } = testReportEmail({
      ...base,
      testTypeLabel: 'Course Test',
      objective: { score: 8, max: 10, mcq: { correct: 4, total: 5 }, trueFalse: { correct: 4, total: 5 } },
      coding: null,
      total: 8,
      totalMax: 10,
      percentage: 80,
    });
    const t = text(html);
    expect(t).toContain('Objective questions (5 multiple-choice + 5 True/False) 8 / 10');
    expect(t).toContain('Multiple-choice correct 4 / 5');
    expect(t).toContain('True/False correct 4 / 5');
    expect(t).not.toContain('Part B');
  });
});
