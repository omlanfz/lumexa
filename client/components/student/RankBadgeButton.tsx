'use client';

import { useRef, useState } from 'react';
import { getRankColor } from '@/lib/rankColors';

interface RankBadgeButtonProps {
  /** SpaceRank enum value, e.g. "STARCHILD" */
  rank: string;
  /** Emoji icon for the rank, e.g. "🌟" */
  icon: string;
  className?: string;
}

// 8-point radial burst — each spark is rotated to its angle, then the
// keyframes translate it outward along that rotated axis.
const SPARK_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];
const SPARK_DURATION_MS = 900;

/**
 * The Space Rank chip shown in the top nav. Tapping/clicking it plays a
 * short glittery glow + sparkle-burst animation tinted to that rank's
 * color (see lib/rankColors.ts) — a small celebratory touch, purely
 * cosmetic, no navigation.
 */
export default function RankBadgeButton({ rank, icon, className = '' }: RankBadgeButtonProps) {
  const [active, setActive] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { rgb } = getRankColor(rank);
  const label = rank.replace(/_/g, ' ');

  const trigger = () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
    // Drop the class for a frame first so a rapid re-click restarts the
    // animation instead of being a no-op (class already present).
    setActive(false);
    requestAnimationFrame(() => {
      setActive(true);
      resetTimer.current = setTimeout(() => setActive(false), SPARK_DURATION_MS);
    });
  };

  return (
    <button
      type="button"
      onClick={trigger}
      title={label}
      aria-label={`${label} rank badge`}
      style={{ '--rank-rgb': rgb } as React.CSSProperties}
      className={`rank-badge relative flex items-center gap-1 px-2.5 py-1 rounded-full border transition-transform active:scale-90 ${
        active ? 'is-active' : ''
      } ${className}`}
    >
      <span className="text-sm relative z-10 select-none leading-none">{icon}</span>
      {SPARK_ANGLES.map((angle, i) => (
        <span
          key={angle}
          className="rank-spark"
          style={{ '--angle': `${angle}deg`, animationDelay: `${i * 12}ms` } as React.CSSProperties}
        />
      ))}
    </button>
  );
}
