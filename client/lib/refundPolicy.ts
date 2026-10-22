// The Lumexa Refund Policy, written once. Used by the /refund-policy page and
// by the policy pop-up opened from the footer and the About page, so the two
// can never say different things.

export interface RefundPolicySection {
  id: string;
  heading: string;
  paragraphs: string[];
}

export const REFUND_POLICY_UPDATED = "October 2026";

export const REFUND_POLICY_SECTIONS: RefundPolicySection[] = [
  {
    id: "before-first-class",
    heading: "1. Before the First Class",
    paragraphs: [
      "You will receive a full refund if you request cancellation at least 24 hours before your child's first scheduled class.",
    ],
  },
  {
    id: "after-classes-begin",
    heading: "2. After Classes Begin",
    paragraphs: [
      "If you decide to discontinue after classes have begun, Lumexa may arrange a dedicated Parent-Teacher Meeting (PTM) to understand your concerns and improve our services.",
      "Refunds cover unused prepaid lessons, after deducting the regular price of the lessons already completed. Where you paid for a full program upfront and received a full-program discount, that discount will be recalculated at regular lesson rates.",
    ],
  },
  {
    id: "refund-processing",
    heading: "3. Refund Processing",
    paragraphs: [
      "Approved refunds will be initiated through the original payment method within 7 business days. Additional processing time may depend on the payment provider.",
    ],
  },
];
