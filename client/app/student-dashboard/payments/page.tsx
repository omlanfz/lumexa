'use client';

// "Payments & Credits" — the student's (and their parent's) place to see the
// class-credit balance and ask for more. Opened from the navbar credit pill, so
// it is reachable at any balance.
//
// Payment is entirely manual. Picking a package and pressing "Request N
// Credits" opens a confirmation dialog whose button starts a WhatsApp chat with
// the admin; nothing is created here, no credit is added and no payment record
// exists until the admin recording the confirmed money does it in the admin
// dashboard — after which this page and the navbar pill update on their own.
//
// Every figure (package prices, the overdue settlement, the totals, the
// WhatsApp message) is the backend's quote from GET /students/me/payments: this
// page only chooses which of the three quotes to show.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CircleAlert, Loader2, Wallet } from 'lucide-react';
import api from '@/lib/axios';
import { getStoredRole, getStoredToken } from '@/lib/storage';
import PackageSelector from '@/components/student/payments/PackageSelector';
import PaymentBreakdown from '@/components/student/payments/PaymentBreakdown';
import PaymentHistory from '@/components/student/payments/PaymentHistory';
import RequestCreditsModal from '@/components/student/payments/RequestCreditsModal';
import {
  balanceStatus,
  classCredits,
  classTypeLabel,
  formatTaka,
  reminderTone,
  requestLabel,
  type PaymentsView,
  type ReminderTone,
} from '@/lib/student/payments';
import { CREDITS_TOOLTIP, creditsLabel, formatCredits } from '@/lib/student/progress';

const REFRESH_MS = 60_000;

const BALANCE_STYLE: Record<ReminderTone, { box: string; value: string }> = {
  none: {
    box: 'border-teal-500/25 bg-gradient-to-br from-teal-500/10 to-cyan-500/5',
    value: 'text-teal-700 dark:text-teal-300',
  },
  // Three credits: a quiet nudge, not an alarm.
  notice: {
    box: 'border-amber-300/60 bg-amber-500/[0.07]',
    value: 'text-gray-900 dark:text-white',
  },
  warning: {
    box: 'border-amber-400/60 bg-amber-500/10',
    value: 'text-amber-700 dark:text-amber-300',
  },
  critical: {
    box: 'border-rose-400/60 bg-rose-500/10',
    value: 'text-rose-700 dark:text-rose-300',
  },
};

const CARD_TONE = 'border-gray-200 bg-gray-50 dark:border-gray-700/50 dark:bg-gray-800/50';

/** `tone` replaces (never stacks on) the default border and background. */
function Card({ children, tone = CARD_TONE }: { children: React.ReactNode; tone?: string }) {
  return <section className={`rounded-2xl border p-4 sm:p-6 ${tone}`}>{children}</section>;
}

function SectionTitle({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <h2 id={id} className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
      {children}
    </h2>
  );
}

export default function PaymentsAndCreditsPage() {
  const router = useRouter();
  const [data, setData] = useState<PaymentsView | null>(null);
  const [failed, setFailed] = useState(false);
  // null until the student picks one: then the backend's default (8 credits).
  const [selected, setSelected] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  // Only the newest request may update the page (a focus and a poll can overlap).
  const latest = useRef(0);

  const load = useCallback(() => {
    const seq = ++latest.current;
    return api
      .get<PaymentsView>('/students/me/payments')
      .then((res) => {
        if (seq !== latest.current) return;
        setData(res.data);
        setFailed(false);
      })
      .catch(() => {
        if (seq === latest.current) setFailed(true);
      });
  }, []);

  useEffect(() => {
    if (!getStoredToken() || getStoredRole() !== 'STUDENT') {
      router.push('/login');
      return;
    }
    void load();
    // A payment the admin confirms, or a class that has just finished, reaches
    // this page without a reload: re-read on a timer and whenever the tab is
    // focused again. A failed refresh keeps what is on screen.
    const refresh = () => document.visibilityState === 'visible' && void load();
    const timer = setInterval(refresh, REFRESH_MS);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [router, load]);

  const header = (
    <header className="flex items-center gap-3">
      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400">
        <Wallet size={22} />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payments &amp; Credits</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          See your class credits and request more whenever you need them.
        </p>
      </div>
    </header>
  );

  if (!data) {
    return (
      <div className="mx-auto max-w-3xl space-y-6" data-testid="payments-page">
        {header}
        {failed ? (
          <div
            role="alert"
            className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-600 dark:text-red-400"
          >
            Couldn&apos;t load your payments.{' '}
            <button
              onClick={() => {
                setFailed(false); // back to the spinner while it retries
                void load();
              }}
              className="font-semibold underline"
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 py-10 text-sm text-gray-500 dark:text-gray-400">
            <Loader2 size={16} className="animate-spin" /> Loading your payments…
          </div>
        )}
      </div>
    );
  }

  const { credits, pricing } = data;
  const tone = reminderTone({
    remaining: credits.remaining,
    low: credits.level === 'low',
    exhausted: credits.level === 'exhausted',
  });
  const style = BALANCE_STYLE[tone];
  const quote =
    data.packages.find((p) => p.credits === (selected ?? data.defaultPackage)) ?? data.packages[0];
  const classType = classTypeLabel(pricing.classType);
  // Only an overdrawn student has overdue credits (and anything to settle).
  const overdue = credits.overdue > 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6" data-testid="payments-page">
      {header}

      {/* Current balance — negative when overdrawn */}
      <Card tone={style.box}>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Current balance
        </p>
        <div className="mt-1 flex items-baseline gap-2" data-testid="balance" data-tone={tone}>
          {/* tabular figures would gap a leading minus sign ("- 2") */}
          <span
            className={`text-5xl font-bold ${credits.remaining < 0 ? '' : 'tabular-nums'} ${style.value}`}
            data-testid="balance-value"
          >
            {formatCredits(credits.remaining)}
          </span>
          <span className="text-lg font-semibold text-gray-700 dark:text-gray-200">
            {creditsLabel(credits.remaining)}
          </span>
        </div>
        <p className="mt-2 text-sm text-gray-700 dark:text-gray-200" data-testid="balance-status">
          {balanceStatus(credits.remaining)}
        </p>
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400" data-testid="price-line">
          {pricing.rateCents !== null
            ? `Your price: ${formatTaka(pricing.rateCents)} per class${classType ? ` · ${classType}` : ''}`
            : 'Your per-class price will be confirmed by Lumexa when you get in touch.'}
        </p>
      </Card>

      {/* Outstanding due — only when the balance is below zero */}
      {overdue && (
        <div
          role="note"
          data-testid="overdue-notice"
          className="flex items-start gap-3 rounded-2xl border border-amber-400/50 bg-amber-500/10 p-4 sm:p-5"
        >
          <CircleAlert size={20} className="mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
          <div className="min-w-0 text-sm text-gray-800 dark:text-gray-100">
            <p className="font-semibold">
              You currently have {classCredits(credits.overdue, 'overdue')}. These will be adjusted as part of your
              next payment.
            </p>
            <p className="mt-1 text-gray-600 dark:text-gray-300">
              Overdue credits: <strong data-testid="overdue-count">{credits.overdue}</strong>
              {quote.overdueCents !== null && (
                <>
                  {' '}
                  · <strong data-testid="overdue-amount">{formatTaka(quote.overdueCents)}</strong>
                </>
              )}
              . The package you choose below is still added in full on top of them.
            </p>
          </div>
        </div>
      )}

      {/* Package selector */}
      <Card>
        <SectionTitle id="packages-heading">Choose a credit package</SectionTitle>
        <PackageSelector
          packages={data.packages}
          value={quote.credits}
          onChange={setSelected}
          rateCents={pricing.rateCents}
        />
        {pricing.rateCents === null && (
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            Prices depend on your plan. Lumexa will share the exact amount with you on WhatsApp.
          </p>
        )}
      </Card>

      {/* Breakdown + the one call to action */}
      <Card>
        <SectionTitle>Payment summary</SectionTitle>
        <div aria-live="polite">
          <PaymentBreakdown quote={quote} />
        </div>
        <button
          type="button"
          onClick={() => {
            void load(); // the dialog opens on the latest figures
            setModalOpen(true);
          }}
          data-testid="request-credits-cta"
          className="mt-5 w-full rounded-xl bg-teal-500 px-6 py-3.5 text-base font-semibold text-black transition hover:bg-teal-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 active:scale-[0.99] dark:focus-visible:ring-offset-black"
        >
          {requestLabel(quote.credits)}
        </button>
        <p className="mt-2 text-center text-xs text-gray-500 dark:text-gray-400">
          Nothing is charged on this site — you&apos;ll continue with our admin on WhatsApp.
        </p>
      </Card>

      {/* How it works */}
      <Card>
        <SectionTitle>How credits and payments work</SectionTitle>
        <p className="text-sm text-gray-600 dark:text-gray-300">{CREDITS_TOOLTIP}</p>
        <ol className="mt-4 space-y-2 text-sm text-gray-700 dark:text-gray-200">
          <li className="flex gap-3">
            <span className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-full bg-teal-500/15 text-xs font-bold text-teal-700 dark:text-teal-300">
              1
            </span>
            Pick a package and press the request button.
          </li>
          <li className="flex gap-3">
            <span className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-full bg-teal-500/15 text-xs font-bold text-teal-700 dark:text-teal-300">
              2
            </span>
            Message our admin on WhatsApp — they will send you the payment instructions.
          </li>
          <li className="flex gap-3">
            <span className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-full bg-teal-500/15 text-xs font-bold text-teal-700 dark:text-teal-300">
              3
            </span>
            Once your payment is confirmed, your credits are added automatically.
          </li>
        </ol>
      </Card>

      {/* Payment history */}
      <section aria-labelledby="history-heading">
        <SectionTitle id="history-heading">Payment history</SectionTitle>
        <PaymentHistory items={data.history} />
      </section>

      {modalOpen && <RequestCreditsModal quote={quote} onClose={() => setModalOpen(false)} />}
    </div>
  );
}
