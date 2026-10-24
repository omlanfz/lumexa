// FILE PATH: server/src/assessments/bank/bank.materialize.ts
//
// Turns an authored TestBank into the exact rows the database stores. Pure and
// deterministic (no DB, no Math.random): the same bank always materializes to
// the same rows, which is what makes the bank sync idempotent.
//
// The correct answer of each four-option MCQ is placed at a position chosen so
// that A/B/C/D are used evenly across the bank (a seeded shuffle of 0,1,2,3,0,
// 1,2,3…), instead of whichever slot the author happened to type it in. At
// attempt time the options are additionally shuffled per student (see
// AssessmentsService), so this stored order is only what the admin sees.

import { TRUE_FALSE_OPTIONS } from './bank.constants';
import { MaterializedBank, MaterializedQuestion, TestBank } from './bank.types';

function seedFromString(s: string): number {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(arr: T[], seedStr: string): T[] {
  const rnd = mulberry32(seedFromString(seedStr));
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Evenly spread correct-answer positions (0–3) for `count` MCQs. */
export function balancedPositions(count: number, seed: string): number[] {
  return seededShuffle(
    Array.from({ length: count }, (_, i) => i % 4),
    seed,
  );
}

export function bankKeyFor(bankId: string, questionKey: string): string {
  return `${bankId}#${questionKey}`;
}

export function materializeBank(bank: TestBank): MaterializedBank {
  const positions = balancedPositions(bank.mcq.length, `${bank.id}:positions`);
  const questions: MaterializedQuestion[] = [];

  bank.mcq.forEach((q, i) => {
    const pos = positions[i];
    // Wrong answers keep their authored relative order around the correct one.
    const options = [...q.wrong];
    options.splice(pos, 0, q.correct);
    questions.push({
      bankKey: bankKeyFor(bank.id, q.key),
      questionType: 'MCQ',
      questionText: q.text,
      options,
      correctIndex: pos,
      explanation: q.explanation,
      difficulty: q.difficulty ?? null,
      tags: [`topic:${q.topic}`],
      order: questions.length,
    });
  });

  bank.trueFalse.forEach((q) => {
    questions.push({
      bankKey: bankKeyFor(bank.id, q.key),
      questionType: 'TRUE_FALSE',
      questionText: q.text,
      options: [...TRUE_FALSE_OPTIONS],
      correctIndex: q.answer ? 0 : 1,
      explanation: q.explanation,
      difficulty: q.difficulty ?? null,
      tags: [`topic:${q.topic}`],
      order: questions.length,
    });
  });

  const c = bank.codingProject;
  return {
    questions,
    coding: c
      ? {
          bankKey: bankKeyFor(bank.id, c.key),
          title: c.title,
          instructions: c.instructions,
          language: c.language,
          starterCode: c.starterCode,
          rubric: c.rubric,
          maxScore: c.maxScore,
        }
      : null,
  };
}
