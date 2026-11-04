// The student's confirmed payments, newest first: date, what it was, the credits
// it bought, the amount and its status. A payment appears here only once an
// admin has recorded the confirmed money, so there is no "pending" row — the
// empty state says so.
//
// It lays itself out by the width of the card it sits in (container queries —
// the parent carries `@container`), not by the screen: a table once the card is
// wide enough for five columns, tidy stacked rows before that. It draws no frame
// of its own; the parent card is the frame.

import { CircleCheck, Undo2 } from 'lucide-react';
import {
  PAYMENT_STATUS_LABEL,
  creditsText,
  formatTaka,
  type PaymentHistoryItem,
} from '@/lib/student/payments';
import { formatShortDate } from '@/lib/student/progress';

// Date · details · credits · amount · status
const TABLE_COLUMNS =
  '@3xl:grid-cols-[9rem_minmax(0,1.6fr)_minmax(6.5rem,1fr)_minmax(7rem,1fr)_minmax(8rem,1fr)]';

export default function PaymentHistory({ items }: { items: PaymentHistoryItem[] }) {
  if (items.length === 0) {
    return (
      <p
        className="mx-4 mb-4 rounded-xl border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400 sm:mx-6 sm:mb-6"
        data-testid="payment-history-empty"
      >
        No payments yet. A payment shows up here once Lumexa has confirmed it.
      </p>
    );
  }

  return (
    <ul
      className="divide-y divide-gray-200 border-t border-gray-200 dark:divide-gray-700/60 dark:border-gray-700/60"
      data-testid="payment-history"
    >
      <li
        aria-hidden
        className={`hidden gap-x-4 bg-gray-100/70 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-white/5 dark:text-gray-400 @3xl:grid @3xl:px-6 ${TABLE_COLUMNS}`}
      >
        <span>Date</span>
        <span>Details</span>
        <span>Credits</span>
        <span>Amount</span>
        <span>Status</span>
      </li>
      {items.map((item) => {
        const refund = item.kind === 'REFUND';
        return (
          <li
            key={item.id}
            data-testid="payment-history-row"
            className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-4 py-3.5 text-sm @3xl:px-6 ${TABLE_COLUMNS}`}
          >
            <span className="col-span-2 text-xs text-gray-500 dark:text-gray-400 @3xl:col-span-1 @3xl:text-sm">
              {formatShortDate(item.date)}
            </span>
            <span className="min-w-0">
              <span className="block font-medium text-gray-900 dark:text-white">{refund ? 'Refund' : 'Payment'}</span>
              <span className="block truncate text-xs text-gray-500 dark:text-gray-400">{item.courseName}</span>
            </span>
            <span className="hidden text-gray-600 dark:text-gray-300 @3xl:block">
              {item.credits === null ? '—' : creditsText(item.credits)}
            </span>
            <span
              className={`text-right font-semibold tabular-nums @3xl:text-left ${
                refund ? 'text-rose-600 dark:text-rose-400' : 'text-gray-900 dark:text-white'
              }`}
            >
              {formatTaka(item.amountCents)}
              {item.credits !== null && (
                <span className="block text-xs font-normal text-gray-500 dark:text-gray-400 @3xl:hidden">
                  {creditsText(item.credits)}
                </span>
              )}
            </span>
            <span
              className={`col-span-2 inline-flex items-center gap-1 text-xs font-semibold @3xl:col-span-1 ${
                refund ? 'text-gray-600 dark:text-gray-300' : 'text-emerald-700 dark:text-emerald-400'
              }`}
            >
              {refund ? <Undo2 size={14} aria-hidden /> : <CircleCheck size={14} aria-hidden />}
              {PAYMENT_STATUS_LABEL[item.status]}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
