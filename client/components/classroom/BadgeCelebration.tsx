// FILE PATH: client/components/classroom/BadgeCelebration.tsx
//
// What a student sees (and hears) when their teacher awards them a badge: a card
// floats in with the badge glowing and a few sparkles, says "New badge! — Bright
// Spark" with a short well-done line, plays a soft achievement chime, and fades by
// itself after about three seconds. It floats over the top of the classroom
// without stealing focus, closing anything or touching audio, video or screen
// sharing (pointer-events are off, so clicks go straight through). Awards that
// arrive together are shown one after another. With reduced motion it is a plain
// fade with no sparkles (see .cr-badge-* in globals.css). The sound plays only
// here — for the person who got the badge — and respects the classroom's sound
// switch (see lib/classroom/sounds.ts).

'use client';

import { useEffect, useRef } from 'react';
import { congratulation } from '@/lib/classroom/badgeAward';
import { playClassroomTone } from '@/lib/classroom/sounds';
import type { BadgeAwardedEvent } from '@/lib/classroom/serverEvents';

/** How long one celebration stays — matches the CSS animation. */
export const CELEBRATION_MS = 3200;

const SPARKLE_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

export default function BadgeCelebration({
  queue,
  onDone,
}: {
  queue: BadgeAwardedEvent[];
  onDone: (awardId: string) => void;
}) {
  const current = queue[0];
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });

  useEffect(() => {
    if (!current) return;
    const id = setTimeout(() => onDoneRef.current(current.awardId), CELEBRATION_MS);
    return () => clearTimeout(id);
  }, [current]);

  // The chime, once per award (the key makes a repeat of the same award silent).
  const soundedFor = current?.awardId;
  useEffect(() => {
    if (soundedFor) playClassroomTone('badge-awarded', soundedFor);
  }, [soundedFor]);

  if (!current) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-16 z-50 flex justify-center px-4"
      role="status"
      aria-live="polite"
      data-testid="badge-celebration"
    >
      <div
        key={current.awardId}
        className="cr-badge-card relative flex max-w-[min(92vw,26rem)] items-center gap-3.5 overflow-hidden rounded-2xl border border-[var(--cr-accent)]/40 bg-[var(--cr-surface)]/95 py-3 pl-4 pr-6 shadow-2xl backdrop-blur"
      >
        <span aria-hidden className="cr-badge-shine absolute inset-0" />
        <div className="relative flex h-16 w-16 flex-shrink-0 items-center justify-center">
          <span aria-hidden className="cr-badge-glow absolute inset-0 rounded-full" />
          {SPARKLE_ANGLES.map((angle) => (
            <span
              key={angle}
              aria-hidden
              className="cr-badge-spark absolute left-1/2 top-1/2 -ml-1.5 -mt-1.5 text-xs text-amber-300"
              style={{ ['--a' as string]: `${angle}deg` }}
            >
              ✦
            </span>
          ))}
          <span className="cr-badge-emoji relative text-4xl leading-none" aria-hidden>
            {current.emoji}
          </span>
        </div>
        <div className="relative min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--cr-accent)]">New badge!</p>
          <p className="truncate text-lg font-semibold leading-tight text-[var(--cr-text)]">You earned {current.name}</p>
          <p className="mt-0.5 text-sm text-[var(--cr-text-muted)]">{congratulation(current.awardId)}</p>
        </div>
      </div>
    </div>
  );
}
