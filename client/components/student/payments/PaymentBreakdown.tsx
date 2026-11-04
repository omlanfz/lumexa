// What the parent pays, line by line: the selected package, the overdue credits
// when (and only when) the student is overdrawn, and the total. The Payments
// page and the confirmation dialog both render this one component from the same
// backend quote, so the two can never show different amounts.

import { classCredits, formatTaka, type PackageQuote } from '@/lib/student/payments';

function Amount({ cents }: { cents: number | null }) {
  return <>{cents === null ? 'To be confirmed' : formatTaka(cents)}</>;
}

export default function PaymentBreakdown({ quote }: { quote: PackageQuote }) {
  const overdue = quote.overdueCredits > 0;
  return (
    <dl
      data-testid="payment-breakdown"
      className="divide-y divide-gray-200 text-sm dark:divide-gray-700/60"
    >
      <div className="flex items-baseline justify-between gap-4 py-2.5">
        <dt className="text-gray-600 dark:text-gray-300">
          Selected new credit package
          <span className="block text-xs text-gray-500 dark:text-gray-400">
            {classCredits(quote.credits)}
          </span>
        </dt>
        <dd className="font-semibold tabular-nums text-gray-900 dark:text-white" data-testid="breakdown-package">
          <Amount cents={quote.packageCents} />
        </dd>
      </div>

      {overdue && (
        <div className="flex items-baseline justify-between gap-4 py-2.5" data-testid="breakdown-overdue-row">
          <dt className="text-gray-600 dark:text-gray-300">
            Overdue credits
            <span className="block text-xs text-gray-500 dark:text-gray-400">
              {classCredits(quote.overdueCredits, 'overdue')}, settled in this payment
            </span>
          </dt>
          <dd className="font-semibold tabular-nums text-gray-900 dark:text-white" data-testid="breakdown-overdue">
            <Amount cents={quote.overdueCents} />
          </dd>
        </div>
      )}

      <div className="flex items-baseline justify-between gap-4 pt-3">
        <dt className="font-semibold text-gray-900 dark:text-white">Total amount payable</dt>
        <dd className="text-xl font-bold tabular-nums text-teal-700 dark:text-teal-300" data-testid="breakdown-total">
          <Amount cents={quote.totalCents} />
        </dd>
      </div>
    </dl>
  );
}
