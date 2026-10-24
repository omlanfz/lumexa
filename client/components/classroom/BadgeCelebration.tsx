// FILE PATH: client/components/classroom/BadgeCelebration.tsx
//
// What a student sees when their teacher awards them a badge: the badge pops
// in with a few sparkles and "You earned Bright Spark!", then fades by itself
// after about two seconds. It floats over the top of the classroom without
// stealing focus, closing anything or touching audio, video or screen sharing
// (pointer-events are off, so clicks go straight through), and there is no
// sound. Awards that arrive together are shown one after another. With reduced
// motion it is a plain fade (see .cr-badge-* in globals.css).

'use client';

import { useEffect, useRef } from 'react';
import type { BadgeAwardedEvent } from '@/lib/classroom/serverEvents';

/** How long one celebration stays — matches the CSS animation. */
export const CELEBRATION_MS = 2400;

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
        className="cr-badge-card relative flex items-center gap-3 rounded-2xl border border-[var(--cr-accent)]/40 bg-[var(--cr-surface)]/95 py-3 pl-4 pr-6 shadow-2xl backdrop-blur"
      >
        <div className="relative flex h-14 w-14 items-center justify-center">
          {SPARKLE_ANGLES.map((angle) => (
            <span
              key={angle}
              aria-hidden
              className="cr-badge-spark absolute left-1/2 top-1/2 -ml-1.5 -mt-1.5 text-xs"
              style={{ ['--a' as string]: `${angle}deg` }}
            >
              ✨
            </span>
          ))}
          <span className="cr-badge-emoji text-4xl leading-none" aria-hidden>
            {current.emoji}
          </span>
        </div>
        <p className="text-base font-semibold text-[var(--cr-text)]">
          You earned <span className="text-[var(--cr-accent)]">{current.name}</span>!
        </p>
      </div>
    </div>
  );
}
