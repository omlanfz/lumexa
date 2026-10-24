/**
 * Developer utility: validates every authored test bank against the Lumexa
 * test standard AND executes the code-reading questions, so a wrong answer
 * key is caught before it reaches a student.
 *
 *   npm run verify:banks
 *
 * Questions that import third-party Python modules (numpy, pandas, …) are
 * skipped unless an interpreter that has them is given:
 *
 *   BANK_VERIFY_PYTHON=/path/to/venv/bin/python npm run verify:banks
 *
 * Exits non-zero on any problem. The same checks run in the Jest suite
 * (src/assessments/bank/bank.spec.ts).
 */

import {
  DEFAULT_REGISTRY,
  allBanks,
} from '../src/assessments/bank/bank.registry';
import {
  formatProblems,
  validateAcrossBanks,
  validateBank,
} from '../src/assessments/bank/bank.validate';
import { verifyBankCode } from '../src/assessments/bank/bank.verify';

const banks = allBanks(DEFAULT_REGISTRY);
let failures = 0;
let checked = 0;
let skipped = 0;

for (const bank of banks) {
  const problems = validateBank(bank);
  const results = verifyBankCode(bank);
  const failed = results.filter((r) => r.status === 'failed');
  checked += results.filter((r) => r.status === 'ok').length;
  skipped += results.filter((r) => r.status === 'skipped').length;
  if (problems.length || failed.length) {
    failures += problems.length + failed.length;
    console.error(`✗ ${bank.id}`);
    if (problems.length) console.error(formatProblems(problems));
    for (const f of failed)
      console.error(`  ${bank.id} · ${f.key}: ${f.detail}`);
  } else {
    console.log(
      `✓ ${bank.id}  (${bank.mcq.length} MCQ + ${bank.trueFalse.length} T/F${bank.codingProject ? ' + coding project' : ''})`,
    );
  }
}
const cross = validateAcrossBanks(banks);
if (cross.length) {
  failures += cross.length;
  console.error(formatProblems(cross));
}
console.log(
  `\n${banks.length} bank(s), ${checked} code answer(s) verified by execution, ${skipped} skipped (missing modules).`,
);
if (failures > 0) {
  console.error(`${failures} problem(s) found.`);
  process.exit(1);
}
