// FILE PATH: server/src/little-coders/assessments/lc-bank.materialize.ts
//
// Turns an authored LcBank into the exact rows the database stores — pure and deterministic, so
// the sync is idempotent. The correct answer of each MCQ is placed so that A–D are used evenly
// (and each student sees the options shuffled again at attempt time). Question keys are in the
// "LC2:" namespace, so a retired three-course question is never mistaken for a new one and an
// answered question is never rewritten.

import { balancedPositions } from '../../assessments/bank/bank.materialize';
import { TRUE_FALSE_OPTIONS } from '../../assessments/bank/bank.constants';
import { questionText } from './lc-bank.helpers';
import type { LcBank, LcMaterializedBank, LcMaterializedPractical, LcPracticalDef } from './lc-bank.types';

export const lcBankKey = (bankId: string, key: string) => `LC2:${bankId}#${key}`;

/** The plain-text form of the three practical sections (for screens that only know `instructions`). */
export function practicalInstructions(p: LcPracticalDef): string {
  const blocks = p.spec.blocks.map((g) => `- ${g.category}: ${g.blocks.join('; ')}`).join('\n');
  const reqs = p.spec.requirements.map((r, i) => `${i + 1}. ${r}`).join('\n');
  return [
    `Project brief\n${p.spec.brief.join('\n')}`,
    `Blocks you need to find\n${blocks}`,
    `Build requirements\n${reqs}`,
    `Hand in\n${p.spec.handIn}`,
  ].join('\n\n');
}

export function materializeLcBank(bank: LcBank): LcMaterializedBank {
  const positions = balancedPositions(bank.mcq.length, `${bank.id}:positions`);
  const questions: LcMaterializedBank['questions'] = [];

  bank.mcq.forEach((q, i) => {
    const pos = positions[i];
    const options = [...q.wrong];
    options.splice(pos, 0, q.correct);
    questions.push({
      bankKey: lcBankKey(bank.id, `M${String(i + 1).padStart(2, '0')}`),
      questionType: 'MCQ',
      questionText: questionText(q.text, q.code),
      options,
      correctIndex: pos,
      explanation: q.explanation,
      difficulty: q.difficulty,
      tags: [`topic:${q.topic}`, `kind:${q.kind}`, ...(q.code ? ['code'] : [])],
      order: questions.length,
    });
  });
  bank.trueFalse.forEach((q, i) => {
    questions.push({
      bankKey: lcBankKey(bank.id, `T${String(i + 1).padStart(2, '0')}`),
      questionType: 'TRUE_FALSE',
      questionText: questionText(q.text, q.code),
      options: [...TRUE_FALSE_OPTIONS],
      correctIndex: q.answer ? 0 : 1,
      explanation: q.explanation,
      difficulty: q.difficulty,
      tags: [`topic:${q.topic}`, 'kind:true-false', ...(q.code ? ['code'] : [])],
      order: questions.length,
    });
  });

  const practicals: LcMaterializedPractical[] = bank.practicals.map((p, i) => ({
    bankKey: lcBankKey(bank.id, `P${String(i + 1).padStart(2, '0')}${p.variant ? `-${p.variant}` : ''}`),
    variantKey: p.variant,
    title: p.title,
    instructions: practicalInstructions(p),
    language: p.spec.platform === 'EDUBLOCKS' ? 'python' : 'scratch',
    spec: p.spec,
    rubric: p.rubric,
    maxScore: p.rubric.reduce((s, r) => s + r.maxPoints, 0),
    order: i,
  }));
  return { questions, practicals };
}
