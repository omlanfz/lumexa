// FILE PATH: server/src/little-coders/assessments/index.ts
//
// The six Little Coders assessments: five course assessments (one per course) and the final.

import { LC_COURSES } from '../lc.constants';
import type { LcBank } from './lc-bank.types';
import { course1Bank } from './banks/course1';
import { course2Bank } from './banks/course2';
import { course3Bank } from './banks/course3';
import { course4Bank } from './banks/course4';
import { course5Bank } from './banks/course5';
import { finalBank } from './banks/final';

export const LC_COURSE_BANKS: Record<string, LcBank> = {
  [course1Bank.moduleSlug!]: course1Bank,
  [course2Bank.moduleSlug!]: course2Bank,
  [course3Bank.moduleSlug!]: course3Bank,
  [course4Bank.moduleSlug!]: course4Bank,
  [course5Bank.moduleSlug!]: course5Bank,
};
export const LC_FINAL_BANK: LcBank = finalBank;

export function allLcBanks(): LcBank[] {
  return [...LC_COURSES.map((c) => LC_COURSE_BANKS[c.slug]), LC_FINAL_BANK];
}

export { course1Bank, course2Bank, course3Bank, course4Bank, course5Bank, finalBank };
