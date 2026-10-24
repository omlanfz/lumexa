// FILE PATH: client/components/classroom/AwardToast.tsx
//
// The teacher's confirmation after awarding a badge: what was awarded to whom,
// who was not in the class to see it, and an Undo for the first few seconds.
// Small and at the bottom, so it never covers the stage or the controls.

'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Loader2, Undo2, X } from 'lucide-react';
import { summarizeAward, undoSecondsLeft, type AwardResponse } from '@/lib/classroom/badgeAward';
import { undoBadgeAward } from '@/lib/classroom/badgesApi';

/** How long the confirmation (and its Undo button) stays on screen. */
const TOAST_MS = 10_000;

function messageOf(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string | string[] } } };
  const m = e.response?.data?.message;
  return (Array.isArray(m) ? m[0] : m) ?? fallback;
}

export default function AwardToast({
  result,
  roomName,
  onDismiss,
}: {
  result: AwardResponse;
  roomName: string;
  onDismiss: () => void;
}) {
  const [phase, setPhase] = useState<'idle' | 'undoing' | 'undone'>('idle');
  const [shownAt] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const dismissRef = useRef(onDismiss);
  useEffect(() => {
    dismissRef.current = onDismiss;
  });

  // Goes away on its own; the time restarts for each new award.
  useEffect(() => {
    if (phase === 'undoing') return;
    const id = setTimeout(() => dismissRef.current(), phase === 'undone' ? 3000 : TOAST_MS);
    return () => clearTimeout(id);
  }, [result.requestId, phase]);

  const summary = summarizeAward(result);
  const canUndo = undoSecondsLeft(result.undoUntil, shownAt) > 0;

  const undo = async () => {
    if (phase !== 'idle') return;
    setPhase('undoing');
    setError(null);
    try {
      await undoBadgeAward(roomName, result.requestId);
      setPhase('undone');
    } catch (err) {
      setError(messageOf(err, 'Could not undo that. Please try again.'));
      setPhase('idle');
    }
  };

  return (
    <div
      className="absolute bottom-3 left-1/2 z-40 w-[min(92vw,26rem)] -translate-x-1/2 cr-fade-in"
      role="status"
      aria-live="polite"
      data-testid="award-toast"
    >
      <div className="flex items-start gap-3 rounded-xl border border-[var(--cr-border-strong)] bg-[var(--cr-surface)] px-3.5 py-2.5 shadow-xl">
        <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
          <Check size={13} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[var(--cr-text)]">
            {phase === 'undone' ? 'Award undone' : summary.headline}
          </p>
          {phase !== 'undone' && summary.note && (
            <p className="mt-0.5 text-xs text-[var(--cr-text-muted)]">{summary.note}</p>
          )}
          {error && (
            <p className="mt-0.5 text-xs text-red-400" role="alert">
              {error}
            </p>
          )}
        </div>
        {phase !== 'undone' && canUndo && (
          <button
            type="button"
            onClick={undo}
            disabled={phase === 'undoing'}
            data-testid="award-undo"
            className="flex flex-shrink-0 items-center gap-1 rounded-lg border border-[var(--cr-border-strong)] px-2.5 py-1 text-xs font-medium text-[var(--cr-text)] transition-colors hover:bg-[var(--cr-surface-2)] disabled:opacity-60"
          >
            {phase === 'undoing' ? <Loader2 size={12} className="animate-spin" /> : <Undo2 size={12} />}
            Undo
          </button>
        )}
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-[var(--cr-text-faint)] hover:bg-[var(--cr-surface-2)] hover:text-[var(--cr-text)]"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  );
}
