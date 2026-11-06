'use client';

// FILE PATH: client/components/lesson/PresentationShell.tsx
//
// Presentation Mode: the page a teacher shares on screen. It covers the dashboard
// navigation, widens the reading area and enlarges text, diagrams and code so they
// read well when screen-shared, and is trivial to leave (Esc or the Exit button). What
// goes inside is decided by the caller — nothing private is ever passed in.

import { useEffect, useRef, useState, type ReactNode } from 'react';

const SCALES = [0.9, 1, 1.15, 1.3, 1.5];

export default function PresentationShell({ title, onExit, children }: { title: string; onExit: () => void; children: ReactNode }) {
  const [scale, setScale] = useState(1);
  const exitRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    exitRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onExit();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onExit]);

  const i = SCALES.indexOf(scale);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Presenting: ${title}`}
      className="lesson-presenting fixed inset-0 z-[70] overflow-y-auto bg-white dark:bg-gray-950"
      style={{ ['--present-scale' as string]: String(scale) }}
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-950/95 px-4 py-2 backdrop-blur">
        <div className="min-w-0 truncate text-sm font-semibold text-gray-700 dark:text-gray-200">
          <span aria-hidden="true">📺 </span>Presenting — {title}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden text-xs text-gray-500 dark:text-gray-400 sm:inline">Text size</span>
          <button type="button" className="rounded-lg border border-gray-300 dark:border-gray-600 px-2.5 py-1 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40" disabled={i <= 0} onClick={() => setScale(SCALES[Math.max(0, i - 1)])} aria-label="Smaller text">
            A−
          </button>
          <button type="button" className="rounded-lg border border-gray-300 dark:border-gray-600 px-2.5 py-1 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40" disabled={i >= SCALES.length - 1} onClick={() => setScale(SCALES[Math.min(SCALES.length - 1, i + 1)])} aria-label="Larger text">
            A+
          </button>
          <button ref={exitRef} type="button" onClick={onExit} className="rounded-lg bg-gray-900 dark:bg-white px-3 py-1.5 text-sm font-semibold text-white dark:text-gray-900 hover:opacity-90">
            Exit <span className="hidden text-xs font-normal opacity-70 sm:inline">(Esc)</span>
          </button>
        </div>
      </div>
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8">{children}</div>
    </div>
  );
}
