'use client';

// Rank progress, from the backend's rank payload (never computed here):
//   dashboard  a compact bar for the Overview
//   full       the Rank Journey card — the current rank up front with its own
//              animation, a progress bar to the next rank, what it takes to
//              get there, and the whole ladder

import { useState } from 'react';
import BadgeArt from '@/components/student/BadgeArt';
import BadgeDetailModal from '@/components/student/BadgeDetailModal';
import { rankVisual } from '@/lib/student/badgeConfig';
import { rankTooltip, type RankInfo } from '@/lib/student/progress';

interface RankProgressBarProps {
  rank: RankInfo;
  variant: 'dashboard' | 'full';
}

function Bar({ pct, rgb, label, height = 'h-2.5' }: { pct: number; rgb: string; label: string; height?: string }) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className={`w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700 ${height}`}
    >
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, background: `rgb(${rgb})` }}
      />
    </div>
  );
}

export default function RankProgressBar({ rank, variant }: RankProgressBarProps) {
  const [open, setOpen] = useState(false);
  const visual = rankVisual(rank.id);

  if (variant === 'dashboard') {
    return (
      <div className="space-y-2" data-testid="rank-progress">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
          <span className="text-gray-900 dark:text-white font-medium">
            {rank.icon} {rank.label}
          </span>
          {rank.next ? (
            <span className="text-gray-500 dark:text-gray-400 text-xs">
              {rank.sessionsToNext} class{rank.sessionsToNext === 1 ? '' : 'es'} to {rank.next.label}
            </span>
          ) : (
            <span className="text-teal-600 dark:text-teal-400 text-xs font-semibold">Max rank reached 🎉</span>
          )}
        </div>
        <Bar pct={rank.progressPct} rgb={visual.rgb} label="Progress to your next rank" height="h-2" />
        {rank.next && (
          <p className="text-gray-500 text-xs">
            {rank.progressPct}% of the way to {rank.next.icon} {rank.next.label}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5" data-testid="rank-journey">
      {/* Current rank, up front */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`${rank.label} — show rank details`}
          className="rounded-2xl p-1 transition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
        >
          <BadgeArt badgeId={visual.id} icon={rank.icon} size={84} />
        </button>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Current rank</p>
          <p className="text-2xl font-bold leading-tight text-gray-900 dark:text-white break-words" data-testid="current-rank">
            {rank.label}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {rank.sessions} class{rank.sessions === 1 ? '' : 'es'} attended
          </p>
        </div>
      </div>

      {/* Progress to the next rank */}
      <div className="rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-white/5">
        {rank.next ? (
          <>
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                Next: {rank.next.icon} {rank.next.label}
              </p>
              <p className="text-xs tabular-nums text-gray-500 dark:text-gray-400">
                {rank.sessions} / {rank.next.min} classes · {rank.progressPct}%
              </p>
            </div>
            <Bar pct={rank.progressPct} rgb={visual.rgb} label={`Progress to ${rank.next.label}`} />
            <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">{rank.requirement}</p>
          </>
        ) : (
          <p className="text-sm font-semibold text-teal-700 dark:text-teal-300">
            You have reached the highest rank — Galaxy Commander 🌌
          </p>
        )}
      </div>

      {/* The ladder */}
      <ol className="grid grid-cols-3 gap-2 sm:grid-cols-6" aria-label="All ranks">
        {rank.ladder.map((t) => (
          <li
            key={t.id}
            className={`rounded-xl border px-1.5 py-2 text-center ${
              t.current
                ? 'border-teal-500/60 bg-teal-500/10'
                : t.unlocked
                  ? 'border-black/10 dark:border-white/10'
                  : 'border-black/5 dark:border-white/5'
            }`}
          >
            <span className={`block text-xl ${t.unlocked ? '' : 'opacity-30 grayscale'}`}>{t.icon}</span>
            <span
              className={`block text-xs leading-tight ${
                t.current
                  ? 'font-semibold text-teal-700 dark:text-teal-300'
                  : t.unlocked
                    ? 'text-gray-700 dark:text-gray-300'
                    : 'text-gray-400 dark:text-gray-600'
              }`}
            >
              {t.label}
            </span>
            <span className="block text-[11px] text-gray-400 dark:text-gray-600">{t.min}+</span>
          </li>
        ))}
      </ol>

      {open && <BadgeDetailModal kind="rank" rank={rank} tooltip={rankTooltip(rank)} onClose={() => setOpen(false)} />}
    </div>
  );
}
