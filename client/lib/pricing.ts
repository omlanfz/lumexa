// Lumexa pricing for the Bangladesh market. All amounts are whole BDT.
//
// The standard unit is a block of 8 lessons. A Private 1:1 block is priced per
// program; a Small Learning Batch block is 60% of that. Paying for a whole
// program upfront earns a discount computed at the regular per-lesson rate
// (block price / 8), which is also the rate used if a full-program payment is
// later refunded (see the Refund Policy).

import type { ProgramMeta } from "./programs";

export type LearningFormat = "private" | "batch";

export const LESSONS_PER_BLOCK = 8;
export const BATCH_PRICE_RATIO = 0.6;

/** Percentage saved when a whole program is paid for upfront. */
export const FULL_PAYMENT_DISCOUNT_PERCENT = {
  odyssey: 15,
  specialized: 10,
} as const;

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

/** Price of one block of 8 lessons. The Private 1:1 rate belongs to the
 *  program (see programs.ts); a Small Learning Batch is a fixed share of it. */
export function pricePerBlock(program: Pick<ProgramMeta, "blockPrice">, format: LearningFormat): number {
  const base = program.blockPrice;
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
  program: Pick<ProgramMeta, "id" | "blockPrice">,
  format: LearningFormat,
  lessons: number,
): FullPayment {
  const percent =
    program.id === "odyssey"
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
