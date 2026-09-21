// FILE PATH: client/components/classroom/ClassTimer.tsx
//
// Header timer, anchored to the scheduled class start the SERVER returned
// at join time (never the moment this particular participant connected —
// see ClassroomExperience/ClassroomService.join*). Runs regardless of who's
// joined or left. Turns red and fires a one-time notification + subtle
// sound once the class reaches its expected duration (45 min for 1:1, 60
// for batch), then keeps counting up past it.

'use client';

import { useEffect, useRef, useState } from 'react';
import { playClassroomTone } from '@/lib/classroom/sounds';

interface ClassTimerProps {
  scheduledStart: string;
  expectedDurationMinutes: number;
  onMilestone?: () => void;
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  if (hours > 0) return `${String(hours).padStart(2, '0')}:${mm}:${ss}`;
  return `${mm}:${ss}`;
}

export default function ClassTimer({ scheduledStart, expectedDurationMinutes, onMilestone }: ClassTimerProps) {
  const startMs = useRef(new Date(scheduledStart).getTime()).current;
  const [now, setNow] = useState(() => Date.now());
  const milestoneFiredRef = useRef(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const elapsedMs = now - startMs;
  const overMilestone = elapsedMs >= expectedDurationMinutes * 60_000;

  useEffect(() => {
    if (overMilestone && !milestoneFiredRef.current) {
      milestoneFiredRef.current = true;
      playClassroomTone('timer-milestone');
      onMilestone?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overMilestone]);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-bold tabular-nums tracking-wide ${
        overMilestone
          ? 'bg-red-500/15 border border-red-500/30 text-red-500'
          : 'bg-[var(--cr-surface-2)] border border-[var(--cr-border)] text-[var(--cr-text-muted)]'
      }`}
      data-tooltip={`Class started ${new Date(scheduledStart).toLocaleTimeString()}`}
    >
      {formatElapsed(elapsedMs)}
    </span>
  );
}
