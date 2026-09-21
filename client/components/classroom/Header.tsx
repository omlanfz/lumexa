// FILE PATH: client/components/classroom/Header.tsx
//
// Top bar: Lumexa branding, current lesson/session title, LIVE status, the
// server-anchored class timer, and the classroom's own light/dark toggle.
// Kept subtle — this is a video call, not a marketing page. Hidden entirely
// in presentation mode (see ClassroomRoom) so the shared content gets the
// full vertical space.

'use client';

import ClassTimer from './ClassTimer';
import ThemeToggle from './ThemeToggle';
import type { ClassroomTheme } from '@/lib/classroom/useClassroomTheme';

interface HeaderProps {
  sessionTitle: string;
  sessionSubtitle?: string;
  isLive: boolean;
  recording?: boolean;
  scheduledStart?: string;
  expectedDurationMinutes?: number;
  onTimerMilestone?: () => void;
  theme: ClassroomTheme;
  onToggleTheme: () => void;
}

export default function Header({
  sessionTitle,
  sessionSubtitle,
  isLive,
  recording,
  scheduledStart,
  expectedDurationMinutes,
  onTimerMilestone,
  theme,
  onToggleTheme,
}: HeaderProps) {
  return (
    <header className="flex items-center justify-between gap-3 px-3 sm:px-5 h-14 flex-shrink-0 border-b border-[var(--cr-border)]">
      <div className="flex items-center gap-2.5 min-w-0">
        <img src="/logo-mark.png" alt="" className="w-7 h-7 rounded-lg flex-shrink-0" />
        <div className="min-w-0 hidden sm:block">
          <p className="text-[11px] font-semibold text-[var(--cr-text-muted)] leading-none">Lumexa AI School</p>
        </div>
        <div className="h-5 w-px bg-[var(--cr-border)] mx-1 hidden sm:block" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--cr-text)] truncate leading-tight">{sessionTitle}</p>
          {sessionSubtitle && (
            <p className="text-[11px] text-[var(--cr-text-muted)] truncate leading-tight">{sessionSubtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {scheduledStart && expectedDurationMinutes && (
          <ClassTimer
            scheduledStart={scheduledStart}
            expectedDurationMinutes={expectedDurationMinutes}
            onMilestone={onTimerMilestone}
          />
        )}
        {recording && (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-[11px] font-bold uppercase tracking-wide">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full cr-live-dot" /> Rec
          </span>
        )}
        {isLive && (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-[11px] font-bold uppercase tracking-wide">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full cr-live-dot" /> Live
          </span>
        )}
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
    </header>
  );
}
