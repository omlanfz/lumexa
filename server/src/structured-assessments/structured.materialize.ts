// FILE PATH: server/src/structured-assessments/structured.materialize.ts
//
// Turns an authored StructuredBank into the exact rows the database stores. Pure and deterministic
// (no DB, no Math.random): the same bank always materializes to the same rows, which is what makes
// the sync idempotent. Multiple-choice answers are placed with the same balanced, seeded spread the
// standard banks use (A/B/C/D used evenly).

import { balancedPositions, bankKeyFor } from '../assessments/bank/bank.materialize';
import type { MaterializedStructuredBank, StructuredBank } from './structured.types';

export function materializeStructuredBank(bank: StructuredBank): MaterializedStructuredBank {
  const positions = balancedPositions(bank.mcq.length, `${bank.id}:positions`);
  return {
    mcq: bank.mcq.map((q, i) => {
      const pos = positions[i];
      const options = [...q.wrong];
      options.splice(pos, 0, q.correct);
      return {
        bankKey: bankKeyFor(bank.id, q.key),
        questionText: q.text,
        options,
        correctIndex: pos,
        explanation: q.explanation,
        difficulty: q.difficulty ?? null,
        tags: [`topic:${q.topic}`],
        order: i,
      };
    }),
    shortAnswers: bank.shortAnswers.map((q, i) => ({
      bankKey: bankKeyFor(bank.id, q.key),
      prompt: q.prompt,
      maxScore: q.maxScore,
      rubric: q.rubric,
      modelAnswer: q.modelAnswer,
      order: i,
    })),
    practical: {
      bankKey: bankKeyFor(bank.id, bank.practical.key),
      title: bank.practical.title,
      instructions: bank.practical.instructions,
      language: bank.practical.language,
      starterCode: bank.practical.starterCode,
      rubric: bank.practical.rubric,
      maxScore: bank.practical.maxScore,
      spec: {
        structured: true,
        deliverables: bank.practical.deliverables,
        ...(bank.practical.sqlSetup ? { sqlSetup: bank.practical.sqlSetup } : {}),
      },
      order: 0,
    },
  };
}
