// FILE PATH: client/lib/student/payments.ts
//
// Types and small helpers for the student's Payments & Credits page. They
// mirror GET /students/me/payments — and the client never works a price or a
// WhatsApp message out itself. The backend quotes every package (credits × the
// student's own per-class rate, plus any overdue credits) and builds the
// WhatsApp link from that same quote, so the package cards, the breakdown, the
// confirmation dialog and the message the parent sends can never disagree.
//
// Payment stays manual: nothing here (or on the page) creates a payment or
// adds a credit — requesting credits is a WhatsApp chat with the admin, and
// only the admin recording the confirmed payment changes the balance.

import type { CreditsInfo } from './progress';

/** The Payments & Credits page — opened from the navbar credit pill. */
export const PAYMENTS_PATH = '/student-dashboard/payments';

export type CreditLevel = 'ok' | 'low' | 'exhausted';

/** What one credit package costs this student (see server credit-packages.ts). */
export interface PackageQuote {
  /** The new, usable credits being requested (8, 16 or 24). */
  credits: number;
  /** Overdue credits this payment also settles; 0 unless the balance is negative. */
  overdueCredits: number;
  /** credits × per-class rate — null when no per-class price is known yet. */
  packageCents: number | null;
  /** overdueCredits × per-class rate — null when no price is known. */
  overdueCents: number | null;
  /** What the parent pays: the package plus the overdue credits. */
  totalCents: number | null;
  /** What the admin enters as "Lessons purchased": credits + overdueCredits. */
  lessonsToRecord: number;
  whatsappMessage: string;
  /** wa.me link to the admin's WhatsApp inbox with the message typed in. */
  whatsappUrl: string;
}

export interface PaymentHistoryItem {
  id: string;
  /** ISO timestamp the admin recorded it. */
  date: string;
  kind: 'PAYMENT' | 'REFUND';
  status: 'CONFIRMED' | 'REFUNDED';
  /** Poisha; negative for a refund. */
  amountCents: number;
  /** Credits bought by a payment; null for a refund. */
  credits: number | null;
  courseName: string;
}

export interface PaymentsView {
  studentName: string;
  credits: {
    /** Whole credits — negative when overdrawn. */
    remaining: number;
    /** 2 for a balance of −2; 0 otherwise. */
    overdue: number;
    level: CreditLevel;
  };
  pricing: {
    /** The student's own per-class rate in poisha; null until a payment set one. */
    rateCents: number | null;
    classType: 'ONE_TO_ONE' | 'BATCH' | null;
    courseName: string | null;
  };
  defaultPackage: number;
  packages: PackageQuote[];
  history: PaymentHistoryItem[];
}

/** "৳9,000" / "৳6,666.64" / "-৳2,000" — poisha in, taka out, no needless decimals. */
export function formatTaka(cents: number): string {
  const taka = (Math.abs(cents) / 100).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${cents < 0 ? '-' : ''}৳${taka}`;
}

/** "1 credit", "8 credits", "-2 credits". */
export function creditsText(n: number): string {
  return `${n} ${Math.abs(n) === 1 ? 'credit' : 'credits'}`;
}

/** The label of the main call to action: "Request 8 Credits". */
export function requestLabel(credits: number): string {
  return `Request ${credits} Credits`;
}

export function classTypeLabel(
  classType: PaymentsView['pricing']['classType'],
): string | null {
  if (classType === 'ONE_TO_ONE') return '1-to-1 classes';
  if (classType === 'BATCH') return 'Batch classes';
  return null;
}

export type ReminderTone = 'none' | 'notice' | 'warning' | 'critical';

/** At this many credits the reminder is a quiet notice; below it, a warning. */
const NOTICE_CREDITS = 3;

/** How loudly to remind the student to pay:
 *   4+ credits  none      — nothing to say
 *   3           notice    — a subtle low-balance reminder
 *   1–2         warning   — yellow
 *   0 or below  critical  — red
 * Whether a balance is "low" or "exhausted" is the backend's call (the pill
 * uses the same flags); only the notice/warning split is made here. */
export function reminderTone(
  credits: Pick<CreditsInfo, 'remaining' | 'low' | 'exhausted'>,
): ReminderTone {
  if (credits.exhausted) return 'critical';
  if (!credits.low) return 'none';
  return credits.remaining >= NOTICE_CREDITS ? 'notice' : 'warning';
}

/** "3 class credits", "1 class credit", "2 overdue class credits". */
export function classCredits(n: number, adjective?: string): string {
  const word = Math.abs(n) === 1 ? 'credit' : 'credits';
  return `${n} ${adjective ? `${adjective} ` : ''}class ${word}`;
}

/** The wording of a reminder for a student with `remaining` whole credits. */
export function reminderCopy(remaining: number): {
  headline: string;
  message: string;
} {
  if (remaining < 0) {
    return {
      headline: `You have ${classCredits(-remaining, 'overdue')}.`,
      message:
        'Your classes will soon be paused until your payment is confirmed. The overdue credits are settled as part of your next payment.',
    };
  }
  if (remaining === 0) {
    return {
      headline: 'You have 0 class credits.',
      message:
        'Your classes will soon be paused until your payment is confirmed. Request credits now to keep learning.',
    };
  }
  if (remaining >= NOTICE_CREDITS) {
    return {
      headline: `You have ${classCredits(remaining)} left.`,
      message: 'Request more credits now so your classes keep running smoothly.',
    };
  }
  return {
    headline: `Only ${classCredits(remaining)} left.`,
    message:
      'Please request more credits soon to avoid any interruption to your classes.',
  };
}

/** The one-line status under the balance on the Payments & Credits page. An
 * overdrawn student's overdue credits get their own explanation beside it. */
export function balanceStatus(remaining: number): string {
  if (remaining < 0) {
    return 'Classes will soon be paused until your payment is confirmed.';
  }
  if (remaining > NOTICE_CREDITS) {
    return "You're all set. Each credit covers one scheduled class session.";
  }
  const { headline, message } = reminderCopy(remaining);
  return `${headline} ${message}`;
}

export const PAYMENT_STATUS_LABEL: Record<PaymentHistoryItem['status'], string> = {
  CONFIRMED: 'Confirmed',
  REFUNDED: 'Refunded',
};
