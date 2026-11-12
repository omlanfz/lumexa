'use client';

// FILE PATH: client/components/little-coders/DemoFrame.tsx
//
// The shared frame of every live demo on a Little Coders lesson page: a title, what to try, and an
// honest label when the demo is a practice simulation (the AI demos never use a webcam or microphone).

import type { ReactNode } from 'react';

export default function DemoFrame({
  title,
  intro,
  hint,
  practice,
  children,
}: {
  title: string;
  intro: string;
  hint?: string;
  /** Shown as a small label: "Practice simulation — no camera is used". */
  practice?: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800/60">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
            <span aria-hidden="true">▶️</span> {title}
          </h3>
          <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-300">{intro}</p>
        </div>
        {practice && <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">🧪 {practice}</span>}
      </div>
      <div className="p-3 sm:p-4">{children}</div>
      {hint && (
        <p className="border-t border-gray-200 bg-amber-50/70 px-4 py-2.5 text-sm text-amber-900 dark:border-gray-700 dark:bg-amber-900/10 dark:text-amber-100">
          <span aria-hidden="true">💭</span> <span className="font-semibold">Think about it:</span> {hint}
        </p>
      )}
    </div>
  );
}
