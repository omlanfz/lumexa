// FILE PATH: client/components/classroom/Header.tsx
//
// Top bar: Lumexa branding, current lesson/session title, LIVE status, the
// server-anchored class timer, the classroom sound switch, and the classroom's
// own light/dark toggle.
// Kept subtle — this is a video call, not a marketing page. Stays visible
// during normal screen sharing (shared screens sit in the equal-priority
// grid, not a special cropped "presentation" layout) — it only becomes the
// `floating` glassmorphism variant while a screen-share tile is in focus
// mode (see ClassroomRoom), auto-hiding on inactivity there.

'use client';

import { Lock, LockOpen, Loader2 } from 'lucide-react';
import ClassTimer from './ClassTimer';
import SoundToggle from './SoundToggle';
import ThemeToggle from './ThemeToggle';
import type { ClassroomTheme } from '@/lib/classroom/useClassroomTheme';

interface HeaderProps {
  sessionTitle: string;
  sessionSubtitle?: string;
  isLive: boolean;
  recording?: boolean;
  /** The teacher has locked the classroom: no one new can join. */
  roomLocked?: boolean;
  /** Teacher only — turns the lock on/off. Omitted for everyone else, who just
   * see the chip while the room is locked. */
  onToggleLock?: () => void;
  lockBusy?: boolean;
  scheduledStart?: string;
  expectedDurationMinutes?: number;
  onTimerMilestone?: () => void;
  theme: ClassroomTheme;
  onToggleTheme: () => void;
  /** Translucent glassmorphism variant, forced to a dark palette regardless
   * of the room's own theme — used only when floating over a fullscreened
   * shared screen (see ClassroomRoom). */
  floating?: boolean;
}

export default function Header({
  sessionTitle,
  sessionSubtitle,
  isLive,
  recording,
  roomLocked,
  onToggleLock,
  lockBusy,
  scheduledStart,
  expectedDurationMinutes,
  onTimerMilestone,
  theme,
  onToggleTheme,
  floating,
}: HeaderProps) {
  return (
    <header
      className={`flex items-center justify-between gap-3 px-3 sm:px-5 h-14 flex-shrink-0 ${
        floating
          ? 'bg-black/40 backdrop-blur-xl border-b border-white/10'
          : 'border-b border-[var(--cr-border)]'
      }`}
    >
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
        {onToggleLock ? (
          <button
            type="button"
            onClick={onToggleLock}
            disabled={lockBusy}
            data-testid="room-lock-toggle"
            data-locked={roomLocked ? 'true' : 'false'}
            aria-pressed={!!roomLocked}
            data-tooltip={
              roomLocked
                ? 'Classroom locked — no one can join. Click to unlock.'
                : 'Classroom open. Click to lock it so no one else can join.'
            }
            data-tooltip-pos="bottom"
            data-tooltip-align="end"
            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-[11px] font-semibold transition-colors disabled:opacity-60 ${
              roomLocked
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-400 hover:bg-amber-500/25'
                : 'border-[var(--cr-border)] text-[var(--cr-text-muted)] hover:text-[var(--cr-text)] hover:bg-[var(--cr-surface-2)]'
            }`}
          >
            {lockBusy ? (
              <Loader2 size={12} className="animate-spin" />
            ) : roomLocked ? (
              <Lock size={12} />
            ) : (
              <LockOpen size={12} />
            )}
            <span className="hidden sm:inline">{roomLocked ? 'Locked' : 'Open'}</span>
          </button>
        ) : (
          roomLocked && (
            <span
              data-testid="room-locked-chip"
              data-tooltip="The teacher has locked the classroom, so no one else can join."
              data-tooltip-pos="bottom"
              data-tooltip-align="end"
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full border border-amber-500/40 bg-amber-500/15 text-[11px] font-semibold text-amber-400"
            >
              <Lock size={12} />
              <span className="hidden sm:inline">Locked</span>
            </span>
          )
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
        <SoundToggle />
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
    </header>
  );
}
