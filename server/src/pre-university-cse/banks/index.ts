// FILE PATH: server/src/pre-university-cse/banks/index.ts
//
// The nine structured assessments of Pre-University CSE: one course assessment per course (keyed by
// the course's module slug) and the final assessment. Each is authored in its own file; every one
// has the same shape (10 multiple choice + 3 short answers + 1 practical = 45 marks, 40 minutes).

import type { StructuredBank, StructuredRegistry } from '../../structured-assessments/structured.types';
import { PUCSE_SLUG } from '../outline';
import { COURSE_1_BANK } from './course-1';
import { COURSE_2_BANK } from './course-2';
import { COURSE_3_BANK } from './course-3';
import { COURSE_4_BANK } from './course-4';
import { COURSE_5_BANK } from './course-5';
import { COURSE_6_BANK } from './course-6';
import { COURSE_7_BANK } from './course-7';
import { COURSE_8_BANK } from './course-8';
import { FINAL_BANK } from './final';

/** Course assessments in course order. */
export const PUCSE_COURSE_BANK_LIST: StructuredBank[] = [
  COURSE_1_BANK,
  COURSE_2_BANK,
  COURSE_3_BANK,
  COURSE_4_BANK,
  COURSE_5_BANK,
  COURSE_6_BANK,
  COURSE_7_BANK,
  COURSE_8_BANK,
];

const STRUCTURED_PREFIX = 'structured/';

/** Keyed by the module (course) slug, which is the bank id without its prefix. */
export const PUCSE_COURSE_BANKS: Record<string, StructuredBank> = Object.fromEntries(
  PUCSE_COURSE_BANK_LIST.map((bank) => [bank.id.slice(STRUCTURED_PREFIX.length), bank]),
);

export const PUCSE_FINAL_BANK: StructuredBank = FINAL_BANK;

export const PUCSE_ALL_BANKS: StructuredBank[] = [...PUCSE_COURSE_BANK_LIST, PUCSE_FINAL_BANK];

export const PUCSE_REGISTRY: StructuredRegistry = {
  courseSlug: PUCSE_SLUG,
  courseTests: PUCSE_COURSE_BANKS,
  finalBank: PUCSE_FINAL_BANK,
};
