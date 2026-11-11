'use client';

// The confirmation dialog behind "Request N Credits". It shows exactly what the
// page shows — the selected package, the overdue credits of an overdrawn
// student as a separate breakdown, and the total — straight from the backend's
// quote, and explains that Lumexa handles payments by hand: the button opens a
// WhatsApp chat with the admin (in a new tab) with the request already typed in.
//
// Nothing is created or charged by opening it or by clicking the button — only
// the admin recording the confirmed payment adds credits.

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { CircleCheck, MessageCircle, X } from 'lucide-react';
import PaymentBreakdown from '@/components/student/payments/PaymentBreakdown';
import { useModalBehavior } from '@/components/student/useModalBehavior';
import { classCredits, formatTaka, type PackageQuote } from '@/lib/student/payments';

interface Props {
  quote: PackageQuote;
  onClose: () => void;
}

export default function RequestCreditsModal({ quote, onClose }: Props) {
  const panelRef = useModalBehavior(onClose);
  const [opened, setOpened] = useState(false);
  const titleId = 'request-credits-title';
  const overdue = quote.overdueCredits > 0;

  return createPortal(
    <div
      className="motion-fade fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      data-testid="request-credits-modal"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="motion-dialog relative max-h-[92dvh] w-full overflow-y-auto overscroll-contain rounded-t-3xl border border-black/10 bg-white text-gray-900 shadow-2xl outline-none dark:border-white/10 dark:bg-[#0B1026] dark:text-white sm:max-w-md sm:rounded-3xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 grid h-11 w-11 place-items-center rounded-full text-gray-500 hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/10"
        >
          <X size={20} />
        </button>

        <div className="px-6 pb-6 pt-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">
            {opened ? 'WhatsApp opened' : 'Confirm your request'}
          </p>
          <h2 id={titleId} className="mt-1 text-2xl font-bold" data-testid="modal-credits">
            {quote.credits} Class Credits
          </h2>
          <p className="mt-1 text-base" data-testid="modal-total">
            Total amount:{' '}
            <span className="font-bold text-teal-700 dark:text-teal-300">
              {quote.totalCents === null ? 'shared on WhatsApp' : formatTaka(quote.totalCents)}
            </span>
          </p>

          {overdue && (
            <div
              className="mt-4 rounded-xl border border-amber-400/40 bg-amber-500/10 px-4 py-3"
              data-testid="modal-overdue"
            >
              <p className="text-sm text-gray-700 dark:text-gray-200">
                You have {classCredits(quote.overdueCredits, 'overdue')}. They are settled as part of this payment, so
                you finish with the full {classCredits(quote.credits)}.
              </p>
              <div className="mt-2 border-t border-amber-400/30 pt-1">
                <PaymentBreakdown quote={quote} />
              </div>
            </div>
          )}

          {opened ? (
            <div
              className="mt-5 flex items-start gap-3 rounded-xl border border-teal-500/30 bg-teal-500/10 px-4 py-3 text-sm"
              role="status"
              data-testid="modal-opened"
            >
              <CircleCheck size={18} className="mt-0.5 flex-shrink-0 text-teal-600 dark:text-teal-400" aria-hidden />
              <p>
                We opened WhatsApp for you. Send the message and our admin will share the payment instructions. Your
                credits are added once the payment is confirmed — this page and your credit count update on their own.
              </p>
            </div>
          ) : (
            <p className="mt-5 text-sm text-gray-600 dark:text-gray-300" data-testid="modal-explanation">
              Lumexa handles payments manually. Tap the button below to message our admin on WhatsApp — they will send
              you the payment instructions. Your credits are added after the payment is confirmed; this request does not
              charge you or change your balance.
            </p>
          )}

          <a
            href={quote.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            // Switch to the "opened" message after the browser has followed the link.
            onClick={() => window.setTimeout(() => setOpened(true), 0)}
            data-testid="contact-admin-whatsapp"
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3.5 text-base font-semibold text-white transition hover:bg-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 active:scale-[0.99] dark:focus-visible:ring-offset-[#0B1026]"
          >
            <MessageCircle size={20} aria-hidden />
            {opened ? 'Open WhatsApp again' : 'Contact Admin on WhatsApp'}
          </a>

          <button
            type="button"
            onClick={onClose}
            className="mt-2 w-full rounded-xl px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/10"
          >
            {opened ? 'Done' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
