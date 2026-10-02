// FILE PATH: client/components/classroom/EndClassModal.tsx
//
// Teacher's End Class flow — a proper centered modal (not a corner
// popover) since it's a multi-step decision. A curriculum class is always
// ended with exactly one of three statuses:
//
//   Completed            lesson finished — teacher earns, student's lesson is
//                        deducted, progression moves on.
//   Partially Completed  one extra class is needed to finish the same lesson —
//                        same money as Completed. Offered once per lesson (the
//                        option is disabled on the extra class it creates).
//   Incomplete           the class could not be completed — no earning, no
//                        deduction. Needs a reason (and a note for "Other").
//
// Only the curriculum (ScheduledLesson) flow has this economics; the legacy
// marketplace Booking flow just gets a plain confirm. The QA demo classroom
// also gets the full flow (isLessonFlow is true for it too — see
// ClassroomRoom) purely so it can be tested, even though the server ignores
// the outcome for that room and applies no economics either way.

'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { ClassEndReason, ClassOutcome, EndClassParams } from '@/lib/classroom/api';

type Step =
  | 'choose'
  | 'completed-confirm'
  | 'partial-confirm'
  | 'incomplete-reason'
  | 'incomplete-note'
  | 'completed-done';

const INCOMPLETE_REASONS: { value: ClassEndReason; label: string }[] = [
  { value: 'STUDENT_NO_SHOW', label: 'Student did not attend' },
  { value: 'TECHNICAL_ISSUE', label: 'Technical problem' },
  { value: 'OTHER', label: 'Other' },
];

interface EndClassModalProps {
  isLessonFlow: boolean;
  /** False once this lesson has already used its one Partially Completed
   * (i.e. this is the extra class). Defaults to true. */
  partialCompletionAvailable?: boolean;
  onClose: () => void;
  /** Performs the actual endClass API call — throws on failure. */
  onSubmit: (params: EndClassParams) => Promise<void>;
  /** Called once the flow is fully done (immediately for everything except
   * Completed, which first shows the brief "Class completed!" screen). */
  onFinished: () => void;
}

const secondaryButton =
  'flex-1 py-2 rounded-lg text-sm font-medium bg-[var(--cr-surface-2)] text-[var(--cr-text)] hover:bg-[var(--cr-surface-3)]';

export default function EndClassModal({
  isLessonFlow,
  partialCompletionAvailable = true,
  onClose,
  onSubmit,
  onFinished,
}: EndClassModalProps) {
  const [step, setStep] = useState<Step>('choose');
  const [reason, setReason] = useState<ClassEndReason | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requiresNote = reason === 'OTHER';

  const confirm = async (params: EndClassParams) => {
    // Guards a double click while the request is in flight (the server is
    // idempotent too, this just avoids a pointless second request).
    if (submitting) return;
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

  const confirmButtons = (outcome: ClassOutcome, backTo: Step, colour: string, busyLabel: string) => (
    <div className="flex gap-2">
      <button onClick={() => setStep(backTo)} disabled={submitting} className={secondaryButton}>
        Back
      </button>
      <button
        onClick={() => void confirm({ outcome })}
        disabled={submitting}
        className={`flex-1 py-2 rounded-lg text-sm font-semibold text-black disabled:opacity-60 ${colour}`}
      >
        {submitting ? busyLabel : 'Confirm'}
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--cr-border)] bg-[var(--cr-surface)] shadow-2xl overflow-hidden cr-fade-in">
        {!isLessonFlow ? (
          <div className="p-5">
            <p className="text-[var(--cr-text)] font-semibold mb-1">End class for everyone?</p>
            <p className="text-sm text-[var(--cr-text-muted)] mb-4">This can&apos;t be undone.</p>
            {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
            <div className="flex gap-2">
              <button onClick={onClose} className={secondaryButton}>
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
                onClick={() => setStep('partial-confirm')}
                disabled={submitting || !partialCompletionAvailable}
                className="w-full py-2.5 rounded-lg text-sm font-semibold bg-sky-500 hover:bg-sky-400 text-black disabled:opacity-40 disabled:hover:bg-sky-500"
              >
                Partially Completed
              </button>
              {!partialCompletionAvailable && (
                <p className="text-xs text-[var(--cr-text-muted)] -mt-1">
                  Already used for this lesson — choose Completed or Incomplete.
                </p>
              )}
              <button
                onClick={() => setStep('incomplete-reason')}
                disabled={submitting}
                className="w-full py-2.5 rounded-lg text-sm font-semibold bg-amber-500/90 hover:bg-amber-400 text-black disabled:opacity-60"
              >
                Incomplete
              </button>
              <button onClick={onClose} className={`w-full ${secondaryButton}`}>
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
            {confirmButtons('COMPLETED', 'choose', 'bg-emerald-500 hover:bg-emerald-400', 'Finishing…')}
          </div>
        ) : step === 'partial-confirm' ? (
          <div className="p-5">
            <p className="text-[var(--cr-text)] font-semibold mb-2">Mark this class as partially completed?</p>
            <div className="flex items-start gap-2 mb-3 px-3 py-2 rounded-lg bg-sky-500/10 border border-sky-500/25 text-sky-300 text-xs">
              <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
              Choose Partially Completed only when you need one additional class to finish this lesson&rsquo;s content.
              Use Completed when the lesson is finished, and Incomplete when the class could not be completed.
            </div>
            <ul className="text-sm text-[var(--cr-text-muted)] space-y-1.5 mb-4 list-disc list-inside">
              <li>1 lesson will be deducted from the student&apos;s balance.</li>
              <li>You&apos;ll earn ৳200.</li>
              <li>One extra class for this lesson will be scheduled.</li>
            </ul>
            {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
            {confirmButtons('PARTIALLY_COMPLETED', 'choose', 'bg-sky-500 hover:bg-sky-400', 'Finishing…')}
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
            <button onClick={() => setStep('choose')} className={`w-full ${secondaryButton}`}>
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
                  maxLength={500}
                  placeholder="What happened?"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--cr-border)] bg-[var(--cr-surface-2)] text-sm text-[var(--cr-text)] mb-3"
                />
              </>
            ) : (
              <p className="text-sm text-[var(--cr-text-muted)] mb-3">Confirm to end the class as incomplete.</p>
            )}
            {error && <p className="text-xs text-red-400 mb-3">{error}</p>}
            <div className="flex gap-2">
              <button onClick={() => setStep('incomplete-reason')} disabled={submitting} className={secondaryButton}>
                Back
              </button>
              <button
                onClick={() => reason && void confirm({ outcome: 'INCOMPLETE', reason, note: note.trim() || undefined })}
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
