// FILE PATH: server/src/pre-university-cse/banks/index.ts
//
// The nine structured assessments of Pre-University CSE: one course assessment per course (keyed by
// the course's module slug) and the final assessment. Each is authored in its own file.

import type { StructuredBank, StructuredRegistry } from '../../structured-assessments/structured.types';
import { PUCSE_SLUG } from '../outline';

export const PUCSE_COURSE_BANKS: Record<string, StructuredBank> = {};
export const PUCSE_FINAL_BANK = undefined as unknown as StructuredBank;

export const PUCSE_REGISTRY: StructuredRegistry = {
  courseSlug: PUCSE_SLUG,
  courseTests: PUCSE_COURSE_BANKS,
  finalBank: PUCSE_FINAL_BANK,
};
