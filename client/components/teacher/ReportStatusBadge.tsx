'use client';

import { reportStatusMeta, Tone } from '@/lib/assessment/progress';
import type { ReportStatus } from '@/lib/assessment/types';

const TONE: Record<Tone, string> = {
  warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25',
  info: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/25',
  success: 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/25',
  neutral: 'bg-[var(--t-surface-2)] text-[var(--t-text-muted)] border-[var(--t-border)]',
  danger: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/25',
};

export default function ReportStatusBadge({ status }: { status: ReportStatus }) {
  const meta = reportStatusMeta(status);
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${TONE[meta.tone]}`}>
      {meta.label}
    </span>
  );
}
