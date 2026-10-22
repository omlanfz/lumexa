// Lumexa pricing for the Bangladesh market. All amounts are whole BDT.
//
// The standard unit is a block of 8 lessons. A Private 1:1 block is priced per
// program; a Small Learning Batch block is 60% of that. Paying for a whole
// program upfront earns a discount computed at the regular per-lesson rate
// (block price / 8), which is also the rate used if a full-program payment is
// later refunded (see the Refund Policy).

import type { ProgramKey } from "./programs";

export type LearningFormat = "private" | "batch";

export const LESSONS_PER_BLOCK = 8;
export const BATCH_PRICE_RATIO = 0.6;

/** Percentage saved when a whole program is paid for upfront. */
export const FULL_PAYMENT_DISCOUNT_PERCENT = {
  odyssey: 15,
  specialized: 10,
} as const;

/** Private 1:1 price for every 8 lessons, in BDT. */
const PRIVATE_PRICE_PER_BLOCK: Record<ProgramKey, number> = {
  little: 5000,
  game: 6000,
  digital: 6000,
  web: 7000,
  ai: 7500,
  data: 7500,
  odyssey: 6500,
};

export interface FormatInfo {
  id: LearningFormat;
  label: string;
  short: string;
  emoji: string;
  /** Lesson length is set by the platform: 45 min for 1:1, 60 min for a batch. */
  lessonMinutes: number;
}

export const FORMATS: Record<LearningFormat, FormatInfo> = {
  private: {
    id: "private",
    label: "Private 1:1 Mentorship",
    short: "Private 1:1",
    emoji: "👤",
    lessonMinutes: 45,
  },
  batch: {
    id: "batch",
    label: "Small Learning Batch",
    short: "Small Batch",
    emoji: "👥",
    lessonMinutes: 60,
  },
};

export function resolveFormat(value: string | null | undefined): LearningFormat | null {
  return value === "private" || value === "batch" ? value : null;
}

/** Price of one block of 8 lessons. */
export function pricePerBlock(program: ProgramKey, format: LearningFormat): number {
  const base = PRIVATE_PRICE_PER_BLOCK[program];
  return format === "private" ? base : Math.round(base * BATCH_PRICE_RATIO);
}

export interface FullPayment {
  lessons: number;
  percent: number;
  /** Lessons at the regular rate (block price / 8 per lesson). */
  regular: number;
  /** What the parent pays when settling the whole program upfront. */
  discounted: number;
  savings: number;
}

/** Whole-program price for `lessons` lessons. Figures are rounded to whole
 *  taka at each step so regular - discounted === savings always holds on screen. */
export function fullPayment(
  program: ProgramKey,
  format: LearningFormat,
  lessons: number,
): FullPayment {
  const percent =
    program === "odyssey"
      ? FULL_PAYMENT_DISCOUNT_PERCENT.odyssey
      : FULL_PAYMENT_DISCOUNT_PERCENT.specialized;
  const perLesson = pricePerBlock(program, format) / LESSONS_PER_BLOCK;
  const regular = Math.round(perLesson * lessons);
  const discounted = Math.round(regular * (1 - percent / 100));
  return { lessons, percent, regular, discounted, savings: regular - discounted };
}

export function formatBDT(amount: number): string {
  return `৳${amount.toLocaleString("en-US")}`;
}
