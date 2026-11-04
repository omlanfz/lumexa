'use client';

// "💎 8 Credits" — the student's class credits (one credit = one scheduled
// class), read from the backend ledger; a negative number when they are
// overdrawn. Slightly more prominent than the rank pill beside it: yellow when
// one to three classes are left, red at zero or below.
//
// Selecting it opens the Payments & Credits page, so it is always the way in to
// buying credits, whatever the balance. The explanation opens on hover/keyboard
// focus only (desktop) and stays purely informational — a click navigates, so
// no payment action lives in the tooltip.

import Link from 'next/link';
import InfoPopover from '@/components/student/InfoPopover';
import { PAYMENTS_PATH } from '@/lib/student/payments';
import { CREDITS_TOOLTIP, creditsLabel, formatCredits, type CreditsInfo } from '@/lib/student/progress';

export default function CreditsPill({ credits }: { credits: CreditsInfo }) {
  const tone = credits.exhausted
    ? 'border-rose-400/50 bg-rose-500/10 text-rose-700 dark:text-rose-300'
    : credits.low
      ? 'border-amber-400/50 bg-amber-500/10 text-amber-700 dark:text-amber-300'
      : 'border-cyan-400/40 bg-gradient-to-r from-cyan-500/10 to-teal-500/10 text-teal-800 dark:text-teal-200';
  const value = formatCredits(credits.remaining);
  const label = creditsLabel(credits.remaining);

  return (
    <InfoPopover content={CREDITS_TOOLTIP} title={`💎 ${value} ${label}`} hoverOnly testId="credits-tooltip">
      <Link
        href={PAYMENTS_PATH}
        data-testid="credits-pill"
        aria-label={`Balance: ${value} ${label}. View payments and credits`}
        className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-2.5 text-sm font-semibold whitespace-nowrap shadow-sm shadow-cyan-500/10 transition hover:brightness-95 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:hover:brightness-110 lg:px-3.5 ${tone}`}
      >
        <span className="text-sm leading-none select-none" aria-hidden>
          💎
        </span>
        <span className={credits.remaining < 0 ? undefined : 'tabular-nums'}>{value}</span>
        <span className="hidden lg:inline">{label}</span>
      </Link>
    </InfoPopover>
  );
}
