// FILE PATH: server/src/assessments/bank/bank.registry.ts
//
// Which authored bank belongs to which test session of the default catalog:
//   - a COURSE_TEST belongs to its module (CourseModule.slug)
//   - a FINAL_TEST belongs to its pathway (Course.slug) — including Odyssey's
//   - a STAGE_TEST (Odyssey only) belongs to its stage number
// A custom curriculum has no bank of its own: its imported test lessons link
// to these (see linked-assessment.ts).

import { TestBank } from './bank.types';
import { courseTestBanks } from './course-tests';
import { finalTestBanks } from './final-tests';
import { stageTestBanks } from './stage-tests';

export interface BankRegistry {
  /** Only these catalog courses receive banks — an admin-created course that
   *  merely reuses a module slug must never have its own questions replaced. */
  courseSlugs: string[];
  courseTests: Record<string, TestBank>;
  finalTests: Record<string, TestBank>;
  stageTests: Record<number, TestBank>;
}

export const CATALOG_COURSE_SLUGS = [
  'lumexa-odyssey',
  'little-coders-path',
  'game-creator-path',
  'web-developer-path',
  'ai-builder-path',
  'data-scientist-path',
  'digital-independence-path',
];

export const DEFAULT_REGISTRY: BankRegistry = {
  courseSlugs: CATALOG_COURSE_SLUGS,
  courseTests: courseTestBanks,
  finalTests: finalTestBanks,
  stageTests: stageTestBanks,
};

export function allBanks(
  registry: BankRegistry = DEFAULT_REGISTRY,
): TestBank[] {
  return [
    ...Object.values(registry.courseTests),
    ...Object.values(registry.stageTests),
    ...Object.values(registry.finalTests),
  ];
}
