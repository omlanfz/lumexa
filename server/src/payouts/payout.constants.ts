// FILE PATH: server/src/payouts/payout.constants.ts
//
// Fixed compensation amounts for the teacher earnings ledger. All amounts are
// minor-unit (poisha — 1 BDT = 100 poisha), matching the amountCents
// convention already used elsewhere in the schema (Booking.amountCents,
// GemPurchase.amountCents).

export const BDT = (taka: number) => Math.round(taka * 100);

export const CLASS_COMPLETED_AMOUNT_CENTS = BDT(200);
export const PTM_AMOUNT_CENTS = BDT(300);
export const CONVERSION_AMOUNT_CENTS = BDT(1000);

export const PENALTY_SEVERITY_AMOUNTS_CENTS = {
  MINOR: -BDT(200),
  MODERATE: -BDT(300),
  MAJOR: -BDT(500),
} as const;

export type PenaltySeverity = keyof typeof PENALTY_SEVERITY_AMOUNTS_CENTS;

// Teacher-emergency reschedules: first 3 per calendar month are free: the 4th
// and beyond incur a fixed penalty and are flagged for Operations review.
export const FREE_EMERGENCY_RESCHEDULES_PER_MONTH = 3;
export const EMERGENCY_RESCHEDULE_PENALTY_CENTS = -BDT(50);
