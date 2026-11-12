// The six Little Coders assessments (five course assessments + the final), proven against the
// standard in the brief: exactly 10 individually authored MCQs (2 concepts · 2 identify-the-block ·
// 3 predict-the-script · 2 sequence/logic · 1 find-the-mistake; 3 easy · 4 moderate · 3 hard; at least
// four with a real block script), 5 True/False (2 · 2 · 1), one 25-mark practical with the standard
// 10/6/5/3/1 rubric, no question shared between assessments, a cumulative final — and every Python
// answer proven by running the program.

import { runPython, pythonAvailable } from '../../assessments/bank/bank.verify';
import { pythonProgram } from '../testing/python-stub';
import { LC_ASSESSMENT, LC_COURSES, LC_RUBRIC_STANDARD } from '../lc.constants';
import {
  allLcBanks,
  course3Bank,
  finalBank,
  LC_COURSE_BANKS,
  LC_FINAL_BANK,
} from './index';
import {
  formatLcProblems,
  validateAcrossLcBanks,
  validateLcBank,
} from './lc-bank.validate';
import { lcBankKey, materializeLcBank } from './lc-bank.materialize';
import type { LcBank, LcVerify } from './lc-bank.types';

const banks = allLcBanks();

describe('Little Coders assessments — the six banks', () => {
  it('there are six: one per course, then the final', () => {
    expect(banks).toHaveLength(6);
    expect(banks.map((b) => b.kind)).toEqual([
      'COURSE',
      'COURSE',
      'COURSE',
      'COURSE',
      'COURSE',
      'FINAL',
    ]);
    expect(Object.keys(LC_COURSE_BANKS)).toEqual(LC_COURSES.map((c) => c.slug));
    expect(LC_FINAL_BANK).toBe(finalBank);
  });

  it.each(banks.map((b) => [b.id, b] as const))(
    '%s meets the whole standard (see lc-bank.validate.ts)',
    (_id, bank) => {
      const problems = validateLcBank(bank);
      if (problems.length) console.log(formatLcProblems(problems));
      expect(problems).toEqual([]);
    },
  );

  it('no two questions anywhere share their text', () => {
    expect(validateAcrossLcBanks(banks)).toEqual([]);
  });

  it.each(banks.map((b) => [b.id, b] as const))(
    '%s: 10 MCQs (4 options, one right), 5 True/False, 15 marks of objective questions',
    (_id, bank) => {
      expect(bank.mcq).toHaveLength(LC_ASSESSMENT.mcq.count);
      expect(bank.trueFalse).toHaveLength(LC_ASSESSMENT.trueFalse.count);
      for (const q of bank.mcq) {
        expect(new Set([q.correct, ...q.wrong]).size).toBe(4);
      }
      expect(
        LC_ASSESSMENT.mcq.marks +
          LC_ASSESSMENT.trueFalse.marks +
          LC_ASSESSMENT.practical.marks,
      ).toBe(LC_ASSESSMENT.marks);
      expect(LC_ASSESSMENT.marks).toBe(40);
      expect(LC_ASSESSMENT.minutes).toBe(40);
      expect(LC_ASSESSMENT.negativeMarking).toBe(false);
    },
  );

  it('the section timings add up to the 40 minutes: 10 + 5 + 20 + 5', () => {
    const a = LC_ASSESSMENT;
    expect(
      a.mcq.minutes +
        a.trueFalse.minutes +
        a.practical.minutes +
        a.review.minutes,
    ).toBe(40);
  });

  it('a course assessment covers every lesson of its course; the final covers all five courses evenly', () => {
    for (const course of LC_COURSES) {
      const bank = LC_COURSE_BANKS[course.slug];
      const topics = new Set(
        [...bank.mcq, ...bank.trueFalse].map((q) => q.topic),
      );
      for (let lesson = 1; lesson <= 8; lesson++)
        expect(topics.has(lesson)).toBe(true);
    }
    for (let course = 1; course <= 5; course++) {
      expect(finalBank.mcq.filter((q) => q.topic === course)).toHaveLength(2);
    }
  });
});

describe('Little Coders assessments — the practical project', () => {
  it('every course assessment has one practical; the final has a Scratch/AI and a Python version', () => {
    for (const course of LC_COURSES)
      expect(LC_COURSE_BANKS[course.slug].practicals).toHaveLength(1);
    expect(finalBank.practicals.map((p) => p.variant).sort()).toEqual([
      'PYTHON',
      'SCRATCH_AI',
    ]);
  });

  it('is built in Stretch3 for courses 1–3 and EduBlocks for courses 4–5', () => {
    const platforms = LC_COURSES.map(
      (c) => LC_COURSE_BANKS[c.slug].practicals[0].spec.platform,
    );
    expect(platforms).toEqual([
      'STRETCH3',
      'STRETCH3',
      'STRETCH3',
      'EDUBLOCKS',
      'EDUBLOCKS',
    ]);
    const byVariant = Object.fromEntries(
      finalBank.practicals.map((p) => [p.variant, p.spec.platform]),
    );
    expect(byVariant).toEqual({ SCRATCH_AI: 'STRETCH3', PYTHON: 'EDUBLOCKS' });
  });

  it('shows the project brief, the blocks to find and the build requirements — and no solution', () => {
    for (const bank of banks) {
      for (const p of bank.practicals) {
        expect(p.spec.brief.length).toBeGreaterThanOrEqual(2);
        expect(p.spec.blocks.length).toBeGreaterThanOrEqual(2);
        expect(p.spec.requirements.length).toBeGreaterThanOrEqual(4);
        expect(p.spec.minutes).toBe(20);
        expect(JSON.stringify(p.spec)).not.toMatch(
          /\bstep\s*\d\b|drag (?:a|the|out)\b/i,
        );
      }
    }
  });

  it('every assessment uses the same rubric: 10 / 6 / 5 / 3 / 1 = 25', () => {
    expect(LC_RUBRIC_STANDARD.map((r) => r.maxPoints)).toEqual([
      10, 6, 5, 3, 1,
    ]);
    for (const bank of banks) {
      for (const p of bank.practicals) {
        expect(p.rubric.map((r) => r.maxPoints)).toEqual([10, 6, 5, 3, 1]);
        expect(p.rubric.map((r) => r.criterion)).toEqual(
          LC_RUBRIC_STANDARD.map((r) => r.criterion),
        );
        expect(p.rubric.every((r) => r.lookFor.length >= 20)).toBe(true);
      }
    }
  });

  it('the optional bonus is never part of the 40 marks', () => {
    for (const bank of banks) {
      for (const p of bank.practicals) {
        expect(p.rubric.reduce((s, r) => s + r.maxPoints, 0)).toBe(25);
        for (const b of p.spec.bonus) expect(b.length).toBeGreaterThan(5);
      }
    }
  });

  it('Course 3 uses a prepared model/starter set by an admin: no training, no invented address', () => {
    const spec = course3Bank.practicals[0].spec;
    expect(spec.starter.required).toBe(true);
    expect(spec.starter.kind).toBe('MODEL_URL');
    expect(spec.starter.url).toBe('');
    expect(spec.starter.modelLabels.length).toBeGreaterThanOrEqual(2);
    expect(JSON.stringify(spec)).not.toMatch(
      /teachablemachine\.withgoogle\.com|tm\.gen-ai\.fi\/models/i,
    );
    // Training is not part of the assessment.
    expect(spec.requirements.join(' ')).not.toMatch(
      /\btrain(?:ing)?\b.*\b(?:model|images|examples)\b/i,
    );
  });

  it('no assessment ships a starter address: admins add it, nothing is invented', () => {
    for (const bank of banks)
      for (const p of bank.practicals) expect(p.spec.starter.url).toBe('');
  });
});

describe('Little Coders assessments — what the database stores', () => {
  it.each(banks.map((b) => [b.id, b] as const))(
    '%s materializes to 15 questions with stable keys and an even answer spread',
    (_id, bank) => {
      const mat = materializeLcBank(bank);
      expect(mat.questions).toHaveLength(15);
      expect(
        mat.questions.filter((q) => q.questionType === 'MCQ'),
      ).toHaveLength(10);
      expect(
        mat.questions.filter((q) => q.questionType === 'TRUE_FALSE'),
      ).toHaveLength(5);
      expect(new Set(mat.questions.map((q) => q.bankKey)).size).toBe(15);
      expect(
        mat.questions.every((q) => q.bankKey.startsWith(`LC2:${bank.id}#`)),
      ).toBe(true);
      expect(mat.questions[0].bankKey).toBe(lcBankKey(bank.id, 'M01'));
      const positions = [0, 0, 0, 0];
      for (const q of mat.questions.filter((x) => x.questionType === 'MCQ')) {
        positions[q.correctIndex]++;
        expect(q.options.length).toBe(4);
        expect(q.options[q.correctIndex]).toBeTruthy();
      }
      expect(
        Math.max(...positions) - Math.min(...positions),
      ).toBeLessThanOrEqual(1);
      for (const q of mat.questions.filter(
        (x) => x.questionType === 'TRUE_FALSE',
      )) {
        expect(q.options).toEqual(['True', 'False']);
      }
      expect(mat.practicals.every((p) => p.maxScore === 25)).toBe(true);
    },
  );

  it('materializing twice gives byte-identical rows (the sync is idempotent)', () => {
    for (const bank of banks) {
      expect(JSON.stringify(materializeLcBank(bank))).toBe(
        JSON.stringify(materializeLcBank(bank)),
      );
    }
  });
});

// ─── Every Python answer is proven by running the program ────────────────────

const hasPython = pythonAvailable();
const itPython = hasPython ? it : it.skip;

function check(bank: LcBank, where: string, lines: string[], verify: LcVerify) {
  const out = runPython(pythonProgram(lines, verify.inputs ?? []));
  if (verify.error) {
    expect({
      where,
      ok: out.ok,
      stderr: out.stderr.trim().split('\n').pop(),
    }).toEqual({
      where,
      ok: false,
      stderr: expect.stringContaining(verify.error),
    });
    return;
  }
  expect({ where, ok: out.ok, err: out.ok ? '' : out.stderr }).toEqual({
    where,
    ok: true,
    err: '',
  });
  if (verify.stdout !== undefined) {
    expect({ bank: bank.id, where, out: out.stdout.trim() }).toEqual({
      bank: bank.id,
      where,
      out: verify.stdout.trim(),
    });
  }
  if (verify.lines !== undefined) {
    expect({ where, lines: out.stdout.trim().split('\n').length }).toEqual({
      where,
      lines: verify.lines,
    });
  }
}

describe('Little Coders assessments — Python answers are proven by execution', () => {
  itPython.each(banks.map((b) => [b.id, b] as const))(
    '%s: every verified question behaves exactly as its answer says',
    (_id, bank) => {
      let proven = 0;
      bank.mcq.forEach((q, i) => {
        if (q.verify && q.code) {
          check(
            bank,
            `M${String(i + 1).padStart(2, '0')}`,
            q.code.lines,
            q.verify,
          );
          proven++;
        }
      });
      bank.trueFalse.forEach((q, i) => {
        if (q.verify && q.code) {
          check(
            bank,
            `T${String(i + 1).padStart(2, '0')}`,
            q.code.lines,
            q.verify,
          );
          proven++;
        }
      });
      // The Python courses and the final must prove at least some of their code questions.
      if (bank.id.includes('python') || bank.kind === 'FINAL')
        expect(proven).toBeGreaterThan(0);
    },
  );

  it('a Python snippet in an answer key is never left without proof — except a program that is meant to run forever', () => {
    for (const bank of banks.filter((b) => b.id.includes('python'))) {
      const unverified = [...bank.mcq, ...bank.trueFalse].filter(
        (q) => q.code && q.code.language === 'edublocks' && !q.verify,
      );
      for (const q of unverified) {
        // It cannot be run to completion, and the question says so.
        expect(q.text).toMatch(/forever|never stops/i);
        expect(q.code!.lines.join('\n')).toMatch(/while /);
      }
    }
  });
});
