// FILE PATH: client/components/classroom/ClassControlsMenu.tsx
//
// The "More" popover. Teacher-only classroom management (mute all, allow
// students to unmute, lock chat) — End Class now lives as its own bottom-bar
// button + EndClassModal, not buried in here. Students get the same
// trigger button in the bar (see ControlBar) but never see any of these
// teacher actions.

'use client';

import { MicOff, Unlock, Lock, ToggleLeft, ToggleRight } from 'lucide-react';
import type { ClassroomState } from '@/lib/classroom/types';

interface ClassControlsMenuProps {
  isTeacher: boolean;
  state: ClassroomState;
  onPatchState: (patch: ClassroomState) => void;
  onMuteAll: () => void;
  onClose: () => void;
}

export default function ClassControlsMenu({ isTeacher, state, onPatchState, onMuteAll, onClose }: ClassControlsMenuProps) {
  const studentsCanUnmute = !state.studentsMuted;

  if (!isTeacher) {
    return (
      <div className="w-64 rounded-xl border border-[var(--cr-border)] bg-[var(--cr-surface)] shadow-2xl overflow-hidden cr-fade-in">
        <div className="px-4 py-3 border-b border-[var(--cr-border)]">
          <p className="text-sm font-semibold text-[var(--cr-text)]">More</p>
        </div>
        <div className="px-4 py-4 text-xs text-[var(--cr-text-faint)]">
          {state.chatLocked ? 'Chat is currently locked by the teacher.' : 'Nothing here yet.'}
        </div>
      </div>
    );
  }

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
    </div>
  );
}
