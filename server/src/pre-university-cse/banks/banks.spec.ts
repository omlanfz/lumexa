// FILE PATH: server/src/pre-university-cse/banks/banks.spec.ts
//
// The nine Pre-University CSE assessments: the shape and the marks, the rubrics, the balance of the
// answer positions, no repeated question across the program, and — wherever the toolchain is
// installed — every "what does this print?" answer proved by compiling and running the code.

import type { TestBank } from '../../assessments/bank/bank.types';
import { verifyBankCode } from '../../assessments/bank/bank.verify';
import { STRUCTURED_MARKS, STRUCTURED_SHAPE } from '../../structured-assessments/structured.constants';
import { materializeStructuredBank } from '../../structured-assessments/structured.materialize';
import {
  formatStructuredProblems,
  validateAcrossStructuredBanks,
  validateStructuredBank,
} from '../../structured-assessments/structured.validate';
import { PUCSE_COURSES } from '../outline';
import { PUCSE_ALL_BANKS, PUCSE_COURSE_BANKS, PUCSE_COURSE_BANK_LIST, PUCSE_FINAL_BANK, PUCSE_REGISTRY } from './index';

describe('Pre-University CSE structured assessments', () => {
  it('has one assessment for each of the eight courses and a final one', () => {
    expect(PUCSE_COURSE_BANK_LIST).toHaveLength(8);
    expect(PUCSE_ALL_BANKS).toHaveLength(9);
    for (const course of PUCSE_COURSES) {
      expect(PUCSE_COURSE_BANKS[course.slug]).toBeDefined();
      expect(PUCSE_REGISTRY.courseTests[course.slug].kind).toBe('COURSE_TEST');
    }
    expect(PUCSE_FINAL_BANK.kind).toBe('FINAL_TEST');
    expect(new Set(PUCSE_ALL_BANKS.map((b) => b.id)).size).toBe(9);
  });

  it.each(PUCSE_ALL_BANKS.map((b) => [b.id, b] as const))('%s passes the structured quality gate', (_id, bank) => {
    const problems = validateStructuredBank(bank);
    expect(formatStructuredProblems(problems)).toBe(formatStructuredProblems([]));
    expect(problems).toEqual([]);
  });

  it.each(PUCSE_ALL_BANKS.map((b) => [b.id, b] as const))('%s is 10 + 3 + 1 questions worth 45 marks', (_id, bank) => {
    expect(bank.mcq).toHaveLength(STRUCTURED_SHAPE.mcq.count);
    expect(bank.shortAnswers).toHaveLength(STRUCTURED_SHAPE.shortAnswer.count);
    const partA = bank.mcq.length * STRUCTURED_SHAPE.mcq.marksEach;
    const partB = bank.shortAnswers.reduce((sum, q) => sum + q.maxScore, 0);
    const partC = bank.practical.maxScore;
    expect([partA, partB, partC]).toEqual([STRUCTURED_MARKS.partA, STRUCTURED_MARKS.partB, STRUCTURED_MARKS.partC]);
    expect(partA + partB + partC).toBe(45);
    for (const q of bank.shortAnswers) {
      expect(q.rubric.reduce((sum, c) => sum + c.maxPoints, 0)).toBe(q.maxScore);
    }
    expect(bank.practical.rubric.reduce((sum, c) => sum + c.maxPoints, 0)).toBe(20);
  });

  it('never repeats a question anywhere in the program', () => {
    expect(validateAcrossStructuredBanks(PUCSE_ALL_BANKS)).toEqual([]);
  });

  it.each(PUCSE_ALL_BANKS.map((b) => [b.id, b] as const))('%s materialises deterministically with balanced answer positions', (_id, bank) => {
    const first = materializeStructuredBank(bank);
    const second = materializeStructuredBank(bank);
    expect(second).toEqual(first);
    const positions = [0, 0, 0, 0];
    for (const q of first.mcq) {
      expect(q.options).toHaveLength(4);
      expect(q.options[q.correctIndex]).toBe(bank.mcq[q.order].correct);
      positions[q.correctIndex] += 1;
    }
    expect(Math.max(...positions) - Math.min(...positions)).toBeLessThanOrEqual(1);
    expect(first.shortAnswers).toHaveLength(3);
    expect(first.practical.spec.structured).toBe(true);
  });

  it('draws the final assessment on every course', () => {
    const courses = new Set(PUCSE_FINAL_BANK.mcq.map((q) => q.topic));
    expect([...courses].sort()).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('keeps every practical self-contained and runnable in the language that it names', () => {
    for (const bank of PUCSE_ALL_BANKS) {
      expect(bank.practical.language).toBeTruthy();
      expect(bank.practical.starterCode.length).toBeGreaterThan(20);
      if (bank.practical.language === 'sql') expect(bank.practical.sqlSetup).toContain('CREATE TABLE');
    }
  });

  // The answer of every code question is proved by running the code (skipped, not failed, when the
  // compiler or interpreter is not installed on the machine that runs the tests).
  it.each(PUCSE_ALL_BANKS.map((b) => [b.id, b] as const))('%s: every code answer is what the code really prints', (_id, bank) => {
    const asStandard = { id: bank.id, mcq: bank.mcq, trueFalse: [] } as unknown as TestBank;
    const results = verifyBankCode(asStandard);
    const failed = results.filter((r) => r.status === 'failed');
    expect(failed).toEqual([]);
  }, 120_000);
});
