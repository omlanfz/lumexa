// FILE PATH: client/components/classroom/LessonSidePanel.tsx
//
// "View Lesson" — opens the same lesson material shown by the standalone
// /lesson/[scheduledLessonId] page, but as an in-classroom side panel (see
// LessonPanel, which both use) instead of a new tab. This is the fallback
// for when a teacher can't screen-share for some reason: both roles can
// still work from the lesson material without leaving the class. Access
// rules are unchanged — this panel renders whatever `lessonData` the
// classroom already fetched via GET /curriculum/scheduled-lessons/:id/
// details, which enforces "student sees own; teacher sees any assigned"
// server-side (see CurriculumController) — no separate gating here.
//
// "Lesson Focus": a plain docked 380px panel is cramped for reading
// material or following along with code, so a header button expands it
// into a large centered overlay instead — the same content, just given
// most of the viewport, without introducing a second complicated feature
// on top of screen-share fullscreen.

'use client';

import { X, Maximize2, Minimize2, BookOpen } from 'lucide-react';
import LessonPanel from './LessonPanel';
import type { LessonDetailsResponse } from '@/components/curriculum/LessonDetailsView';

interface LessonSidePanelProps {
  data: LessonDetailsResponse | null;
  onClose: () => void;
  focused: boolean;
  onToggleFocused: () => void;
}

export default function LessonSidePanel({ data, onClose, focused, onToggleFocused }: LessonSidePanelProps) {
  const header = (
    <div className="flex items-center justify-between px-4 h-12 border-b border-[var(--cr-border)] flex-shrink-0">
      <p className="text-sm font-semibold text-[var(--cr-text)] flex items-center gap-2">
        <BookOpen size={15} className="text-[var(--cr-text-muted)]" />
        Lesson
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={onToggleFocused}
          data-tooltip={focused ? 'Exit lesson focus' : 'Expand'}
          className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--cr-text-muted)] hover:text-[var(--cr-text)] hover:bg-[var(--cr-surface-2)] transition-colors"
        >
          {focused ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
        <button
          onClick={onClose}
          data-tooltip="Close"
          className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--cr-text-muted)] hover:text-[var(--cr-text)] hover:bg-[var(--cr-surface-2)] transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );

  const body = (
    <div className="flex-1 min-h-0 p-2">
      <LessonPanel data={data} />
    </div>
  );

  if (focused) {
    return (
      <div className="fixed inset-4 sm:inset-8 md:inset-12 z-[80] flex flex-col rounded-2xl border border-[var(--cr-border)] bg-[var(--cr-surface)] shadow-2xl cr-fade-in">
        {header}
        {body}
      </div>
    );
  }

  return (
    <div className="w-[380px] xl:w-[440px] flex-shrink-0 flex flex-col border-l border-[var(--cr-border)] bg-[var(--cr-surface)] cr-fade-in">
      {header}
      {body}
    </div>
  );
}
