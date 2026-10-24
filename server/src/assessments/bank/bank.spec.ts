// The content gate: every authored question bank in the catalog must meet the
// Lumexa test standard, cover the seeded curriculum, and carry answer keys that
// are right. If this suite is green, no bank can reach a student with a
// miscounted test, a setup/installation question, duplicate options, a lopsided
// True/False mix, or a code-reading answer that the code does not print.
//
//   npx jest src/assessments/bank/bank.spec.ts
//
// Code-reading answers are verified by EXECUTION (see bank.verify.ts). Snippets
// that need third-party Python modules (numpy, pandas, …) or `lupa` are skipped
// when those are not installed; point BANK_VERIFY_PYTHON at an interpreter that
// has them to run every one.

import * as fs from 'fs';
import * as path from 'path';
import {
  BANK_CONTENT_VERSION,
  TEST_SHAPES,
  expectedTotalMarks,
} from './bank.constants';
import { materializeBank } from './bank.materialize';
import {
  CATALOG_COURSE_SLUGS,
  DEFAULT_REGISTRY,
  allBanks,
} from './bank.registry';
import {
  formatProblems,
  validateAcrossBanks,
  validateBank,
} from './bank.validate';
import { verifyBankCode } from './bank.verify';

const banks = allBanks(DEFAULT_REGISTRY);

const PATHWAYS_DIR = path.join(__dirname, '../../../prisma/curriculum-data');
interface RawModule {
  slug: string;
  title: string;
  lessons: unknown[];
}
const pathways: { slug: string; modules: RawModule[] }[] = fs
  .readdirSync(PATHWAYS_DIR)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(fs.readFileSync(path.join(PATHWAYS_DIR, f), 'utf8')));

describe('question-bank catalog', () => {
  it('ships a bank for every test session of the default catalog', () => {
    const courseTests = Object.keys(DEFAULT_REGISTRY.courseTests);
    const finals = Object.keys(DEFAULT_REGISTRY.finalTests);
    const stages = Object.keys(DEFAULT_REGISTRY.stageTests).map(Number);

    // 6 pathways × 3 modules, each module ends in a Course Test.
    expect(courseTests).toHaveLength(18);
    // 6 specialised pathway finals + the Odyssey final.
    expect(finals.sort()).toEqual([...CATALOG_COURSE_SLUGS].sort());
    // Odyssey's three Stage Tests.
    expect(stages.sort()).toEqual([1, 2, 3]);
    expect(banks).toHaveLength(18 + 7 + 3);
  });

  it('has a Course Test bank for every module in the seeded curriculum', () => {
    const moduleSlugs = pathways.flatMap((p) => p.modules.map((m) => m.slug));
    expect(moduleSlugs).toHaveLength(18);
    for (const slug of moduleSlugs) {
      expect(DEFAULT_REGISTRY.courseTests).toHaveProperty([slug]);
    }
    // … and no bank for a module that does not exist.
    expect(Object.keys(DEFAULT_REGISTRY.courseTests).sort()).toEqual(
      [...moduleSlugs].sort(),
    );
  });

  it('every module the Course Tests cover really has 8 lessons', () => {
    for (const p of pathways)
      for (const m of p.modules) expect(m.lessons).toHaveLength(8);
  });

  it('uses unique, conventional bank ids that match their registry slot', () => {
    expect(new Set(banks.map((b) => b.id)).size).toBe(banks.length);
    for (const [slug, b] of Object.entries(DEFAULT_REGISTRY.courseTests)) {
      expect(b.id).toBe(`course-test/${slug}`);
      expect(b.type).toBe('COURSE_TEST');
    }
    for (const [slug, b] of Object.entries(DEFAULT_REGISTRY.finalTests)) {
      expect(b.id).toBe(`final-test/${slug}`);
      expect(b.type).toBe('FINAL_TEST');
    }
    for (const [n, b] of Object.entries(DEFAULT_REGISTRY.stageTests)) {
      expect(b.id).toBe(`stage-test/odyssey-stage-${n}`);
      expect(b.type).toBe('STAGE_TEST');
    }
  });

  describe.each(banks.map((b) => [b.id, b] as const))('%s', (_id, bank) => {
    const shape = TEST_SHAPES[bank.type];

    it('meets the Lumexa test standard', () => {
      const problems = validateBank(bank);
      if (problems.length) throw new Error(formatProblems(problems));
    });

    it(`has exactly ${shape.mcq} MCQs and ${shape.trueFalse} True/False questions`, () => {
      expect(bank.mcq).toHaveLength(shape.mcq);
      expect(bank.trueFalse).toHaveLength(shape.trueFalse);
      const rows = materializeBank(bank).questions;
      expect(rows).toHaveLength(shape.mcq + shape.trueFalse);
      expect(
        rows.filter((r) => r.questionType === 'MCQ' && r.options.length === 4),
      ).toHaveLength(shape.mcq);
      expect(
        rows.filter(
          (r) =>
            r.questionType === 'TRUE_FALSE' &&
            r.options.join('/') === 'True/False',
        ),
      ).toHaveLength(shape.trueFalse);
    });

    it('is worth the standard number of marks', () => {
      const m = materializeBank(bank);
      const marks = m.questions.length + (m.coding?.maxScore ?? 0);
      expect(marks).toBe(expectedTotalMarks(bank.type));
    });

    it('stores every answer key at a valid position that matches the authored answer', () => {
      const rows = materializeBank(bank).questions;
      bank.mcq.forEach((src, i) => {
        expect(rows[i].options[rows[i].correctIndex]).toBe(src.correct);
      });
      bank.trueFalse.forEach((src, i) => {
        const row = rows[bank.mcq.length + i];
        expect(row.options[row.correctIndex]).toBe(
          src.answer ? 'True' : 'False',
        );
      });
    });

    if (shape.codingProject) {
      it('has one ~15-minute coding project marked out of 20 with a rubric', () => {
        const c = bank.codingProject!;
        expect(c.maxScore).toBe(20);
        expect(c.rubric.reduce((s, r) => s + r.maxPoints, 0)).toBe(20);
        expect(c.instructions).toMatch(/15\s*minutes/i);
        expect(c.starterCode.length).toBeGreaterThan(0);
      });
    }
  });

  it('never repeats a question across tests', () => {
    const problems = validateAcrossBanks(banks);
    if (problems.length) throw new Error(formatProblems(problems));
  });

  it('is versioned so a changed bank can be re-applied', () => {
    expect(BANK_CONTENT_VERSION).toBeGreaterThanOrEqual(1);
  });

  it('verifies every code-reading answer key by running the code', () => {
    const failures: string[] = [];
    let ok = 0;
    let skipped = 0;
    for (const b of banks) {
      for (const r of verifyBankCode(b)) {
        if (r.status === 'failed')
          failures.push(`${r.bankId} · ${r.key}: ${r.detail}`);
        else if (r.status === 'ok') ok++;
        else skipped++;
      }
    }
    if (skipped)
      console.warn(
        `bank.spec: ${skipped} code answer(s) skipped (missing Python modules); ${ok} verified. ` +
          'Set BANK_VERIFY_PYTHON to an interpreter with numpy/pandas/scikit-learn/matplotlib/opencv/pygame/lupa to run all of them.',
      );
    expect(failures).toEqual([]);
  }, 300_000);
});
