'use client';

// One badge, drawn from the central config (lib/student/badgeConfig.ts) with
// its own animated effect (the `.bx-*` rules in globals.css). Used by the badge
// grid, the badge detail dialog and the navbar rank pill, so a badge looks and
// moves the same everywhere.
//
//   state="earned"   full colour, its effect plays
//   state="locked"   grey and still (the grid) — a hint of what is to come
//   state="preview"  a locked badge shown in colour with its effect playing,
//                    so the student sees what they are working towards
//
// Reduced-motion is handled in CSS: nothing moves, the static glow stays.

import type { CSSProperties } from 'react';
import { badgeVisual } from '@/lib/student/badgeConfig';

interface BadgeArtProps {
  /** A badge id (FIRST_MISSION …) or a rank visual id (RANK_STARCHILD). */
  badgeId: string;
  /** Emoji the backend sent, falling back to the config's. */
  icon?: string;
  state?: 'earned' | 'locked' | 'preview';
  /** Pixel size of the square art. */
  size?: number;
  /** Play a one-off pop-in (the detail dialog). */
  intro?: boolean;
  className?: string;
}

export default function BadgeArt({
  badgeId,
  icon,
  state = 'earned',
  size = 56,
  intro = false,
  className = '',
}: BadgeArtProps) {
  const visual = badgeVisual(badgeId);
  const style = {
    '--bx-size': `${size}px`,
    '--bx-rgb': visual.rgb,
  } as CSSProperties;

  return (
    <span
      aria-hidden
      data-effect={visual.effect}
      data-state={state}
      style={style}
      className={`bx bx-${visual.effect} ${state === 'locked' ? 'bx-locked' : ''} ${
        intro ? 'bx-intro' : ''
      } ${className}`}
    >
      <span className="bx-aura" />
      <span className="bx-emoji">{icon ?? visual.icon}</span>
      <i className="bx-p" />
      <i className="bx-p" />
      <i className="bx-p" />
      <i className="bx-p" />
    </span>
  );
}
