// FILE PATH: server/src/students/credit-packages.ts
//
// The manual "buy more class credits" quote — the ONE place a credit package's
// price, the overdue settlement and the WhatsApp request message are worked
// out. The student's Payments & Credits page, the payment emails and the admin
// "Record payment" helper all read these numbers, so they can never disagree.
//
// Pricing is never invented here. A credit costs the student's own per-class
// rate from their ledger (StudentLedgerService: the latest rateCents, i.e. what
// the admin last recorded as amount ÷ lessons purchased — which already
// reflects whether the student is on a 1-to-1 or a batch arrangement). No
// package discount exists in the pricing rules, so a package is simply
// credits × rate; a student with no rate yet gets no price (null), never a guess.
//
// Overdue credits. A student can be overdrawn (negative credits: a class was
// charged when no credit was left). The package they pick is the NEW usable
// credits they want, so the overdue ones are charged on top:
//
//   total = (package credits + overdue credits) × rate
//
// and the admin records that single payment as (package + overdue) lessons.
// That settles the overdue classes, keeps the student's per-class rate
// unchanged, and leaves them with the whole package they asked for
// (−2 credits, 8 requested → pays for 10 → ends on 8).
//
// Nothing in here writes anything: asking for a package never touches the
// ledger. Only an admin recording the confirmed payment adds credits.

import { adminWhatsAppChatUrl } from '../whatsapp/whatsapp.config';

/** The packages a student can ask for, in whole credits (1 credit = 1 class). */
export const CREDIT_PACKAGES = [8, 16, 24] as const;
export const DEFAULT_CREDIT_PACKAGE: (typeof CREDIT_PACKAGES)[number] = 8;

/** At or below this many whole credits the student is reminded to pay. */
export const LOW_CREDITS_THRESHOLD = 3;

export type CreditLevel = 'ok' | 'low' | 'exhausted';

/** How urgent a balance of `credits` whole credits (negative when overdrawn)
 * is: the same rule behind the navbar pill, the reminders, the admin badge
 * and the two payment emails. */
export function creditLevel(credits: number): CreditLevel {
  if (credits <= 0) return 'exhausted';
  return credits <= LOW_CREDITS_THRESHOLD ? 'low' : 'ok';
}

/** Overdue credits for a balance in whole credits: 2 for −2, 0 for 0 or more. */
export function overdueCreditsOf(credits: number): number {
  return credits < 0 ? -credits : 0;
}

/** "৳9,000" / "৳6,666.64" / "-৳2,000" — poisha in, taka out, no needless decimals. */
export function formatTaka(cents: number): string {
  const taka = (Math.abs(cents) / 100).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${cents < 0 ? '-' : ''}৳${taka}`;
}

/** The message pre-filled into the admin's WhatsApp chat. `totalCents` is null
 * when the student has no per-class price yet — then the admin is asked for it
 * instead of being quoted a made-up figure. */
export function paymentRequestMessage(params: {
  credits: number;
  studentName: string;
  balance: number;
  totalCents: number | null;
}): string {
  const { credits, studentName, balance, totalCents } = params;
  const opening = `Hello! I'd like to purchase ${credits} class credits for ${studentName}. My current balance is ${balance} credits`;
  return totalCents === null
    ? `${opening}. Could you please share the price and payment instructions?`
    : `${opening}, and the total amount is ${formatTaka(totalCents)}. Could you please share the payment instructions?`;
}

export interface PackageQuote {
  /** The new, usable credits being requested (8, 16 or 24). */
  credits: number;
  /** Overdue credits this payment also settles; 0 unless the balance is negative. */
  overdueCredits: number;
  /** credits × rate — null when the student's per-class price is not known. */
  packageCents: number | null;
  /** overdueCredits × rate — null when the price is not known. */
  overdueCents: number | null;
  /** packageCents + overdueCents: what the parent pays. */
  totalCents: number | null;
  /** What the admin enters as "Lessons purchased" so the rate stays the same
   * and the student ends with the whole package: credits + overdueCredits. */
  lessonsToRecord: number;
  whatsappMessage: string;
  /** wa.me link to the admin's WhatsApp inbox with the message typed in. */
  whatsappUrl: string;
}

export function quoteCreditPackage(params: {
  credits: number;
  /** The student's per-class rate in poisha; 0 or less when unknown. */
  rateCents: number;
  /** The student's whole credits — negative when overdrawn. */
  balance: number;
  studentName: string;
}): PackageQuote {
  const { credits, rateCents, balance, studentName } = params;
  const overdueCredits = overdueCreditsOf(balance);
  const priced = rateCents > 0;
  const packageCents = priced ? credits * rateCents : null;
  const overdueCents = priced ? overdueCredits * rateCents : null;
  const totalCents =
    packageCents === null || overdueCents === null
      ? null
      : packageCents + overdueCents;
  const whatsappMessage = paymentRequestMessage({
    credits,
    studentName,
    balance,
    totalCents,
  });
  return {
    credits,
    overdueCredits,
    packageCents,
    overdueCents,
    totalCents,
    lessonsToRecord: credits + overdueCredits,
    whatsappMessage,
    whatsappUrl: adminWhatsAppChatUrl(whatsappMessage),
  };
}

/** The quote for every package a student can pick. */
export function quoteCreditPackages(params: {
  rateCents: number;
  balance: number;
  studentName: string;
}): PackageQuote[] {
  return CREDIT_PACKAGES.map((credits) =>
    quoteCreditPackage({ ...params, credits }),
  );
}
