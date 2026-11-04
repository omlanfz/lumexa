'use client';

// The credit packages a student can ask for — 8, 16 or 24 credits — as one
// radio group, so exactly one is selected at a time and the arrow keys, Tab and
// screen readers all work natively. Each card shows its price for THIS student
// (the backend's quote: credits × their own per-class rate); there is no package
// discount, so none is shown.

import { Check } from 'lucide-react';
import { formatTaka, type PackageQuote } from '@/lib/student/payments';

interface Props {
  packages: PackageQuote[];
  /** The selected package's credits. */
  value: number;
  onChange: (credits: number) => void;
  /** The student's per-class price in poisha; null while it is not known. */
  rateCents: number | null;
}

export default function PackageSelector({ packages, value, onChange, rateCents }: Props) {
  return (
    <fieldset>
      <legend className="sr-only">Choose a credit package</legend>
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4" data-testid="package-selector">
        {packages.map((p) => {
          const selected = p.credits === value;
          return (
            <label key={p.credits} className="relative block cursor-pointer" data-testid={`package-${p.credits}`}>
              <input
                type="radio"
                name="credit-package"
                value={p.credits}
                checked={selected}
                onChange={() => onChange(p.credits)}
                className="peer sr-only"
              />
              <span
                className="flex h-full flex-col items-center rounded-2xl border-2 border-gray-200 bg-white px-2 py-4 text-center transition hover:border-teal-400/70 peer-checked:border-teal-500 peer-checked:bg-teal-500/10 peer-focus-visible:ring-2 peer-focus-visible:ring-teal-500 peer-focus-visible:ring-offset-2 dark:border-gray-700/60 dark:bg-white/5 dark:peer-focus-visible:ring-offset-black sm:px-4 sm:py-5"
              >
                <span className="text-3xl font-bold tabular-nums text-gray-900 dark:text-white sm:text-4xl">
                  {p.credits}
                </span>
                <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 sm:text-xs">
                  Credits
                </span>
                <span className="mt-2.5 text-sm font-semibold text-gray-900 dark:text-white sm:text-base">
                  {p.packageCents === null ? 'Price on WhatsApp' : formatTaka(p.packageCents)}
                </span>
                {rateCents !== null && (
                  <span className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400 sm:text-xs">
                    {formatTaka(rateCents)} per class
                  </span>
                )}
              </span>
              {selected && (
                <span
                  aria-hidden
                  className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-teal-500 text-black"
                >
                  <Check size={13} strokeWidth={3} />
                </span>
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
