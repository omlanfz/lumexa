'use client';

// The Space Rank pill in the student navbar: the student's highest earned rank
// with its emoji. Hover/keyboard focus shows a short explanation (desktop);
// tapping or clicking it plays the rank's own animation and shows its details
// — current rank, next rank and progress — in a dialog (touch and desktop).

import { useState } from 'react';
import InfoPopover from '@/components/student/InfoPopover';
import BadgeDetailModal from '@/components/student/BadgeDetailModal';
import { rankVisual } from '@/lib/student/badgeConfig';
import { rankTooltip, type RankInfo } from '@/lib/student/progress';

interface RankBadgeButtonProps {
  rank: RankInfo;
  className?: string;
}

export default function RankBadgeButton({ rank, className = '' }: RankBadgeButtonProps) {
  const [open, setOpen] = useState(false);
  const visual = rankVisual(rank.id);
  const tooltip = rankTooltip(rank);

  return (
    <>
      <InfoPopover content={tooltip} title={`${rank.icon} ${rank.label}`} hoverOnly testId="rank-tooltip">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`Rank: ${rank.label}. Show rank details`}
          aria-haspopup="dialog"
          data-testid="rank-pill"
          style={{ ['--rank-rgb' as string]: visual.rgb }}
          className={`rank-badge inline-flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-full border px-2 text-xs font-medium whitespace-nowrap text-gray-700 transition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:text-gray-200 lg:px-3 ${className}`}
        >
          <span className="text-sm leading-none select-none" aria-hidden>
            {rank.icon}
          </span>
          <span className="hidden lg:inline">{rank.label}</span>
        </button>
      </InfoPopover>
      {open && <BadgeDetailModal kind="rank" rank={rank} tooltip={tooltip} onClose={() => setOpen(false)} />}
    </>
  );
}
