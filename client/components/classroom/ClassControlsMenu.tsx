// FILE PATH: client/components/classroom/ClassControlsMenu.tsx
//
// The "More" popover. Teacher-only classroom management (mute all, allow
// students to unmute, lock chat) — End Class now lives as its own bottom-bar
// button + EndClassModal, not buried in here. Students get the same
// trigger button in the bar (see ControlBar) but never see any of the
// teacher-only moderation actions.
//
// "View Lesson" is the one item both roles get — it opens the lesson
// material as a right-side panel inside the classroom (see LessonSidePanel)
// so a teacher who can't screen-share for some reason, or a student without
// the shared view, can still follow along without leaving the class.

'use client';

import { MicOff, Unlock, Lock, ToggleLeft, ToggleRight, BookOpen } from 'lucide-react';
import type { ClassroomState } from '@/lib/classroom/types';

interface ClassControlsMenuProps {
  isTeacher: boolean;
  state: ClassroomState;
  onPatchState: (patch: ClassroomState) => void;
  onMuteAll: () => void;
  onClose: () => void;
  /** Omitted (undefined) when this room has no lesson material at all — the
   * item is hidden rather than shown disabled. */
  onViewLesson?: () => void;
}

export default function ClassControlsMenu({
  isTeacher,
  state,
  onPatchState,
  onMuteAll,
  onClose,
  onViewLesson,
}: ClassControlsMenuProps) {
  const studentsCanUnmute = !state.studentsMuted;

  const viewLessonButton = onViewLesson && (
    <button
      onClick={() => {
        onViewLesson();
        onClose();
      }}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[var(--cr-text)] hover:bg-[var(--cr-surface-2)] transition-colors"
    >
      <BookOpen size={16} className="text-[var(--cr-text-muted)]" />
      View lesson
    </button>
  );

  if (!isTeacher) {
    return (
      <div className="w-64 rounded-xl border border-[var(--cr-border)] bg-[var(--cr-surface)] shadow-2xl overflow-hidden cr-fade-in">
        <div className="px-4 py-3 border-b border-[var(--cr-border)]">
          <p className="text-sm font-semibold text-[var(--cr-text)]">More</p>
        </div>
        {viewLessonButton && <div className="p-2">{viewLessonButton}</div>}
        {state.chatLocked ? (
          <p className="px-4 pb-4 text-xs text-[var(--cr-text-faint)]">Chat is currently locked by the teacher.</p>
        ) : (
          !viewLessonButton && <div className="px-4 py-4 text-xs text-[var(--cr-text-faint)]">Nothing here yet.</div>
        )}
      </div>
    );
  }

  return (
    <div className="w-72 rounded-xl border border-[var(--cr-border)] bg-[var(--cr-surface)] shadow-2xl overflow-hidden cr-fade-in">
      <div className="px-4 py-3 border-b border-[var(--cr-border)]">
        <p className="text-sm font-semibold text-[var(--cr-text)]">Class Controls</p>
      </div>

      <div className="p-2">
        {viewLessonButton}

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
