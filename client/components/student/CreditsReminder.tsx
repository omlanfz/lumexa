'use client';

// The reminder to top up class credits, shown on the student's home page.
// It speaks up as the balance falls — a quiet notice at 3 credits, a yellow
// warning at 1–2, red at 0 or below (and says classes will soon be paused until
// payment is confirmed) — and says nothing at 4 or more. Every level has a
// clear "Request Credits" button, which opens the Payments & Credits page where
// the package is chosen: nothing is requested or paid from here.

import Link from 'next/link';
import { CircleAlert, Info, TriangleAlert } from 'lucide-react';
import { useNavSummary } from '@/lib/student/useNavSummary';
import { PAYMENTS_PATH, reminderCopy, reminderTone, type ReminderTone } from '@/lib/student/payments';

const TONES: Record<
  Exclude<ReminderTone, 'none'>,
  { box: string; icon: string; button: string; Icon: typeof Info }
> = {
  notice: {
    box: 'border-teal-500/25 bg-teal-500/5',
    icon: 'text-teal-600 dark:text-teal-400',
    button: 'bg-teal-600 text-white hover:bg-teal-500',
    Icon: Info,
  },
  warning: {
    box: 'border-amber-400/50 bg-amber-500/10',
    icon: 'text-amber-600 dark:text-amber-400',
    button: 'bg-amber-500 text-black hover:bg-amber-400',
    Icon: TriangleAlert,
  },
  critical: {
    box: 'border-rose-400/50 bg-rose-500/10',
    icon: 'text-rose-600 dark:text-rose-400',
    button: 'bg-rose-600 text-white hover:bg-rose-500',
    Icon: CircleAlert,
  },
};

export default function CreditsReminder() {
  const { summary } = useNavSummary();
  if (!summary) return null;

  const tone = reminderTone(summary.credits);
  if (tone === 'none') return null;

  const { headline, message } = reminderCopy(summary.credits.remaining);
  const { box, icon, button, Icon } = TONES[tone];

  return (
    <div
      role="status"
      data-testid="credits-reminder"
      data-tone={tone}
      className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3.5 ${box}`}
    >
      <div className="flex min-w-0 flex-1 basis-64 items-start gap-3">
        <Icon size={20} className={`mt-0.5 flex-shrink-0 ${icon}`} aria-hidden />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{headline}</p>
          <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-300">{message}</p>
        </div>
      </div>
      <Link
        href={PAYMENTS_PATH}
        data-testid="credits-reminder-cta"
        className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${button}`}
      >
        Request Credits
      </Link>
    </div>
  );
}
