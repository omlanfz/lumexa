'use client';

// "💎 8 Credits" — the student's remaining class credits (one credit = one
// scheduled class), read from the backend ledger. The explanation opens on
// hover/focus (desktop) and on tap (touch). Slightly more prominent than the
// rank pill beside it; turns amber when 1–2 classes are left and rose at 0.

import InfoPopover from '@/components/student/InfoPopover';
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
    <InfoPopover content={CREDITS_TOOLTIP} title={`💎 ${value} ${label}`} testId="credits-tooltip">
      <button
        type="button"
        data-testid="credits-pill"
        aria-label={`${value} ${label} remaining. What is a credit?`}
        className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-2.5 text-sm font-semibold whitespace-nowrap shadow-sm shadow-cyan-500/10 transition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 lg:px-3.5 ${tone}`}
      >
        <span className="text-sm leading-none select-none" aria-hidden>
          💎
        </span>
        <span className="tabular-nums">{value}</span>
        <span className="hidden lg:inline">{label}</span>
      </button>
    </InfoPopover>
  );
}
