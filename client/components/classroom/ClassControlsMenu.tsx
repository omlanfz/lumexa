// FILE PATH: client/components/classroom/ClassControlsMenu.tsx
//
// Teacher-only "More" menu — advanced classroom management kept out of the
// main control bar so the everyday controls stay uncluttered. Never
// rendered for students (ControlBar only mounts it when isTeacher).

'use client';

import { useState } from 'react';
import { MicOff, Unlock, Lock, PhoneOff, ToggleLeft, ToggleRight, AlertTriangle } from 'lucide-react';
import type { ClassroomState } from '@/lib/classroom/types';

type EndOutcome = 'COMPLETED' | 'PARTIALLY_COMPLETED';

interface ClassControlsMenuProps {
  state: ClassroomState;
  onPatchState: (patch: ClassroomState) => void;
  onMuteAll: () => void;
  onEndClass: (outcome?: EndOutcome) => void;
  isLessonFlow: boolean;
  endClassError: string | null;
  onClose: () => void;
}

export default function ClassControlsMenu({
  state,
  onPatchState,
  onMuteAll,
  onEndClass,
  isLessonFlow,
  endClassError,
  onClose,
}: ClassControlsMenuProps) {
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [confirmingPartial, setConfirmingPartial] = useState(false);
  const studentsCanUnmute = !state.studentsMuted;

  return (
    <div className="w-72 rounded-xl border border-[var(--cr-border)] bg-[var(--cr-surface)] shadow-2xl overflow-hidden cr-fade-in">
      <div className="px-4 py-3 border-b border-[var(--cr-border)]">
        <p className="text-sm font-semibold text-[var(--cr-text)]">Class Controls</p>
      </div>

      <div className="p-2">
        <button
          onClick={() => {
            onMuteAll();
            onClose();
          }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[var(--cr-text)] hover:bg-[var(--cr-surface-2)] transition-colors"
        >
          <MicOff size={16} className="text-[var(--cr-text-muted)]" />
          Mute all students
        </button>

        <button
          onClick={() => onPatchState({ studentsMuted: studentsCanUnmute })}
          className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm text-[var(--cr-text)] hover:bg-[var(--cr-surface-2)] transition-colors"
        >
          <span className="flex items-center gap-3">
            {studentsCanUnmute ? (
              <Unlock size={16} className="text-[var(--cr-text-muted)]" />
            ) : (
              <Lock size={16} className="text-[var(--cr-text-muted)]" />
            )}
            Allow students to unmute
          </span>
          {studentsCanUnmute ? (
            <ToggleRight size={22} className="text-[var(--cr-accent)]" />
          ) : (
            <ToggleLeft size={22} className="text-[var(--cr-text-faint)]" />
          )}
        </button>

        <button
          onClick={() => onPatchState({ chatLocked: !state.chatLocked })}
          className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm text-[var(--cr-text)] hover:bg-[var(--cr-surface-2)] transition-colors"
        >
          <span className="flex items-center gap-3">
            {state.chatLocked ? (
              <Lock size={16} className="text-[var(--cr-text-muted)]" />
            ) : (
              <Unlock size={16} className="text-[var(--cr-text-muted)]" />
            )}
            Lock chat
          </span>
          {state.chatLocked ? (
            <ToggleRight size={22} className="text-[var(--cr-accent)]" />
          ) : (
            <ToggleLeft size={22} className="text-[var(--cr-text-faint)]" />
          )}
        </button>
      </div>

      <div className="border-t border-[var(--cr-border)] p-2">
        {endClassError && (
          <div className="mx-1 mb-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/25 text-red-400 text-xs">
            {endClassError}
          </div>
        )}

        {confirmEnd && isLessonFlow ? (
          confirmingPartial ? (
            <div className="px-3 py-2.5">
              <div className="flex items-start gap-2 mb-2.5 text-amber-400">
                <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
                <p className="text-xs">
                  This class will be marked as partially completed and reviewed by an admin. Please use this option
                  only when there is a valid reason.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmingPartial(false)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-[var(--cr-surface-2)] text-[var(--cr-text)] hover:bg-[var(--cr-surface-3)]"
                >
                  Back
                </button>
                <button
                  onClick={() => onEndClass('PARTIALLY_COMPLETED')}
                  className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-black"
                >
                  Confirm partial
                </button>
              </div>
            </div>
          ) : (
            <div className="px-3 py-2.5">
              <p className="text-xs text-[var(--cr-text-muted)] mb-2">
                How did this class go? This can&apos;t be undone.
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => onEndClass('COMPLETED')}
                  className="w-full py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-black"
                >
                  Completed
                </button>
                <button
                  onClick={() => setConfirmingPartial(true)}
                  className="w-full py-1.5 rounded-lg text-xs font-semibold bg-amber-500/90 hover:bg-amber-400 text-black"
                >
                  Partially completed
                </button>
                <button
                  onClick={() => setConfirmEnd(false)}
                  className="w-full py-1.5 rounded-lg text-xs font-medium bg-[var(--cr-surface-2)] text-[var(--cr-text)] hover:bg-[var(--cr-surface-3)]"
                >
                  Cancel
                </button>
              </div>
            </div>
          )
        ) : confirmEnd ? (
          <div className="px-3 py-2.5">
            <p className="text-xs text-[var(--cr-text-muted)] mb-2">End class for everyone? This can&apos;t be undone.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmEnd(false)}
                className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-[var(--cr-surface-2)] text-[var(--cr-text)] hover:bg-[var(--cr-surface-3)]"
              >
                Cancel
              </button>
              <button
                onClick={() => onEndClass()}
                className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-red-500 hover:bg-red-400 text-white"
              >
                End class
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmEnd(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <PhoneOff size={16} />
            End class for everyone
          </button>
        )}
      </div>
    </div>
  );
}
