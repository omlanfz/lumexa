// FILE PATH: client/components/classroom/EndClassModal.tsx
//
// Teacher's End Class flow — a proper centered modal (not a corner
// popover) since it's a multi-step decision: outcome, then (for
// Incomplete) a reason, then a final confirmation for Completed that spells
// out exactly what happens financially. Only the curriculum (ScheduledLesson)
// flow has this economics; the legacy marketplace Booking flow just gets a
// plain confirm.

'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { ClassEndReason } from '@/lib/classroom/api';

type Step = 'choose' | 'incomplete-reason' | 'incomplete-note' | 'completed-confirm' | 'completed-done';

const INCOMPLETE_REASONS: { value: ClassEndReason; label: string }[] = [
  { value: 'STUDENT_NO_SHOW', label: "Student didn't join" },
  { value: 'STUDENT_LEFT_EARLY', label: 'Student left early' },
  { value: 'TECHNICAL_ISSUE', label: 'Technical issue' },
  { value: 'OTHER', label: 'Other' },
];

interface EndClassModalProps {
  isLessonFlow: boolean;
  onClose: () => void;
  /** Performs the actual endClass API call — throws on failure. */
  onSubmit: (params: {
    outcome?: 'COMPLETED' | 'PARTIALLY_COMPLETED';
    reason?: ClassEndReason;
    note?: string;
  }) => Promise<void>;
  /** Called once the flow is fully done (immediately for Incomplete/legacy
   * booking, after the brief "Class completed!" screen for Completed). */
  onFinished: () => void;
}

export default function EndClassModal({ isLessonFlow, onClose, onSubmit, onFinished }: EndClassModalProps) {
  const [step, setStep] = useState<Step>('choose');
  const [reason, setReason] = useState<ClassEndReason | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requiresNote = reason === 'OTHER';

  const confirm = async (params: { outcome?: 'COMPLETED' | 'PARTIALLY_COMPLETED'; reason?: ClassEndReason; note?: string }) => {
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(params);
      if (params.outcome === 'COMPLETED') {
        setStep('completed-done');
        setTimeout(onFinished, 2600);
      } else {
        onFinished();
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? 'Could not end the class. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--cr-border)] bg-[var(--cr-surface)] shadow-2xl overflow-hidden cr-fade-in">
        {!isLessonFlow ? (
          <div className="p-5">
            <p className="text-[var(--cr-text)] font-semibold mb-1">End class for everyone?</p>
            <p className="text-sm text-[var(--cr-text-muted)] mb-4">This can&apos;t be undone.</p>
            {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 py-2 rounded-lg text-sm font-medium bg-[var(--cr-surface-2)] text-[var(--cr-text)] hover:bg-[var(--cr-surface-3)]"
              >
                Cancel
              </button>
              <button
                onClick={() => void confirm({})}
                disabled={submitting}
                className="flex-1 py-2 rounded-lg text-sm font-semibold bg-red-500 hover:bg-red-400 text-white disabled:opacity-60"
              >
                {submitting ? 'Ending…' : 'End class'}
              </button>
            </div>
          </div>
        ) : step === 'choose' ? (
          <div className="p-5">
            <p className="text-[var(--cr-text)] font-semibold mb-1">End class for everyone?</p>
            <p className="text-sm text-[var(--cr-text-muted)] mb-4">This can&apos;t be undone.</p>
            {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setStep('completed-confirm')}
                disabled={submitting}
                className="w-full py-2.5 rounded-lg text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-black disabled:opacity-60"
              >
                Completed
              </button>
              <button
                onClick={() => setStep('incomplete-reason')}
                disabled={submitting}
                className="w-full py-2.5 rounded-lg text-sm font-semibold bg-amber-500/90 hover:bg-amber-400 text-black disabled:opacity-60"
              >
                Incomplete
              </button>
              <button
                onClick={onClose}
                className="w-full py-2 rounded-lg text-sm font-medium bg-[var(--cr-surface-2)] text-[var(--cr-text)] hover:bg-[var(--cr-surface-3)]"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : step === 'completed-confirm' ? (
          <div className="p-5">
            <p className="text-[var(--cr-text)] font-semibold mb-2">Mark this class as completed?</p>
            <ul className="text-sm text-[var(--cr-text-muted)] space-y-1.5 mb-4 list-disc list-inside">
              <li>1 lesson will be deducted from the student&apos;s balance.</li>
              <li>You&apos;ll earn ৳200.</li>
            </ul>
            {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => setStep('choose')}
                disabled={submitting}
                className="flex-1 py-2 rounded-lg text-sm font-medium bg-[var(--cr-surface-2)] text-[var(--cr-text)] hover:bg-[var(--cr-surface-3)]"
              >
                Back
              </button>
              <button
                onClick={() => void confirm({ outcome: 'COMPLETED' })}
                disabled={submitting}
                className="flex-1 py-2 rounded-lg text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-black disabled:opacity-60"
              >
                {submitting ? 'Finishing…' : 'Confirm'}
              </button>
            </div>
          </div>
        ) : step === 'incomplete-reason' ? (
          <div className="p-5">
            <p className="text-[var(--cr-text)] font-semibold mb-1">Why is this class incomplete?</p>
            <div className="flex items-start gap-2 mb-4 mt-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs">
              <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
              No lesson is deducted and no earning is recorded. The same lesson carries over to the next class.
            </div>
            {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
            <div className="flex flex-col gap-1.5 mb-3">
              {INCOMPLETE_REASONS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => {
                    setReason(r.value);
                    setStep('incomplete-note');
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-[var(--cr-text)] bg-[var(--cr-surface-2)] hover:bg-[var(--cr-surface-3)] transition-colors"
                >
                  {r.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep('choose')}
              className="w-full py-2 rounded-lg text-sm font-medium bg-[var(--cr-surface-2)] text-[var(--cr-text)] hover:bg-[var(--cr-surface-3)]"
            >
              Back
            </button>
          </div>
        ) : step === 'incomplete-note' ? (
          <div className="p-5">
            <p className="text-[var(--cr-text)] font-semibold mb-1">
              {INCOMPLETE_REASONS.find((r) => r.value === reason)?.label}
            </p>
            {requiresNote ? (
              <>
                <p className="text-sm text-[var(--cr-text-muted)] mb-2">A short note is required.</p>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="What happened?"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--cr-border)] bg-[var(--cr-surface-2)] text-sm text-[var(--cr-text)] mb-3"
                />
              </>
            ) : (
              <p className="text-sm text-[var(--cr-text-muted)] mb-3">Confirm to end the class as incomplete.</p>
            )}
            {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => setStep('incomplete-reason')}
                disabled={submitting}
                className="flex-1 py-2 rounded-lg text-sm font-medium bg-[var(--cr-surface-2)] text-[var(--cr-text)] hover:bg-[var(--cr-surface-3)]"
              >
                Back
              </button>
              <button
                onClick={() => reason && void confirm({ outcome: 'PARTIALLY_COMPLETED', reason, note })}
                disabled={submitting || !reason || (requiresNote && !note.trim())}
                className="flex-1 py-2 rounded-lg text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-black disabled:opacity-60"
              >
                {submitting ? 'Ending…' : 'Confirm'}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center">
            <p className="text-2xl mb-2">🎉</p>
            <p className="text-[var(--cr-text)] font-semibold mb-1.5">Class completed!</p>
            <p className="text-sm text-[var(--cr-text-muted)] leading-relaxed">
              Every class is reviewed by the Lumexa Ops Team.
              <br />
              Give your best. You&apos;re helping kids build a better nation. 😼
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export type { Step as EndClassModalStep };
