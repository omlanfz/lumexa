// FILE PATH: client/components/classroom/ClassControlsMenu.tsx
//
// Teacher-only "More" menu — advanced classroom management kept out of the
// main control bar so the everyday controls stay uncluttered. Never
// rendered for students (ControlBar only mounts it when isTeacher).

'use client';

import { useState } from 'react';
import { MicOff, Unlock, Lock, PhoneOff, ToggleLeft, ToggleRight } from 'lucide-react';
import type { ClassroomState } from '@/lib/classroom/types';

interface ClassControlsMenuProps {
  state: ClassroomState;
  onPatchState: (patch: ClassroomState) => void;
  onMuteAll: () => void;
  onEndClass: () => void;
  onClose: () => void;
}

export default function ClassControlsMenu({
  state,
  onPatchState,
  onMuteAll,
  onEndClass,
  onClose,
}: ClassControlsMenuProps) {
  const [confirmEnd, setConfirmEnd] = useState(false);
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
        {confirmEnd ? (
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
                onClick={onEndClass}
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
