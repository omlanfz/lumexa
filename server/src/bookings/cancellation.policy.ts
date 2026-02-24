/**
 * Lumexa Cancellation Policy
 *
 * - 24+ hours before class: 100% refund
 * - 2–24 hours before class: 50% refund
 * - Less than 2 hours:       0% refund
 * - Teacher no-show:         100% refund (always)
 */
export function calculateRefundAmount(
  shiftStart: Date,
  amountCents: number,
  isTeacherNoShow = false,
): { refundCents: number; refundPercent: number; reason: string } {
  if (isTeacherNoShow) {
    return {
      refundCents: amountCents,
      refundPercent: 100,
      reason: 'Full refund issued: teacher did not attend.',
    };
  }

  const now = new Date();
  const hoursUntilClass =
    (shiftStart.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntilClass >= 24) {
    return {
      refundCents: amountCents,
      refundPercent: 100,
      reason: 'Full refund: cancelled more than 24 hours in advance.',
    };
  }

  if (hoursUntilClass >= 2) {
    return {
      refundCents: Math.round(amountCents * 0.5),
      refundPercent: 50,
      reason:
        'Partial refund (50%): cancelled between 2 and 24 hours before class.',
    };
  }

  return {
    refundCents: 0,
    refundPercent: 0,
    reason: 'No refund: cancelled less than 2 hours before class.',
  };
}
