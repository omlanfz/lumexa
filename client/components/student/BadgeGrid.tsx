'use client';

// The Progress & Achievements badge collection. Same grid and collection as
// before — now backed by real earned/locked state and progress from the
// backend, with earned and locked badges clearly different, a progress bar on
// every locked one, and a tap/click on any badge opening its detail dialog.

import { useState } from 'react';
import { Lock } from 'lucide-react';
import BadgeArt from '@/components/student/BadgeArt';
import BadgeDetailModal from '@/components/student/BadgeDetailModal';
import { badgeVisual } from '@/lib/student/badgeConfig';
import { progressUnitLabel, type BadgeInfo } from '@/lib/student/progress';

interface BadgeGridProps {
  badges: BadgeInfo[];
}

export default function BadgeGrid({ badges }: BadgeGridProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const earned = badges.filter((b) => b.earned);
  const locked = badges.filter((b) => !b.earned);
  const open = badges.find((b) => b.id === openId) ?? null;

  return (
    <div
      className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl p-4 sm:p-6"
      data-testid="badge-grid"
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium mb-0.5">
            Badges
          </p>
          <h3 className="text-gray-900 dark:text-white font-semibold">
            {earned.length}
            <span className="text-gray-500 font-normal">/{badges.length}</span> Earned
          </h3>
        </div>
        <span className="text-2xl" aria-hidden>
          🏅
        </span>
      </div>

      <ul className="grid grid-cols-2 min-[440px]:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3">
        {[...earned, ...locked].map((badge) => {
          const v = badgeVisual(badge.id);
          const unit = progressUnitLabel(badge.progress.unit, badge.progress.target);
          return (
            <li key={badge.id}>
              <button
                type="button"
                onClick={() => setOpenId(badge.id)}
                data-testid={`badge-${badge.id}`}
                data-earned={badge.earned}
                aria-label={
                  badge.earned
                    ? `${badge.label}, earned. Show details`
                    : `${badge.label}, locked, ${badge.progress.current} of ${badge.progress.target} ${unit}. Show details`
                }
                style={badge.earned ? { borderColor: `rgba(${v.rgb}, 0.45)` } : undefined}
                className={`group relative flex h-full min-h-[132px] w-full flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${
                  badge.earned
                    ? 'bg-white dark:bg-white/5 shadow-sm hover:-translate-y-0.5 hover:shadow-md'
                    : 'bg-gray-100/70 dark:bg-gray-700/20 border-dashed border-gray-300 dark:border-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700/30'
                }`}
              >
                <BadgeArt
                  badgeId={badge.id}
                  icon={badge.icon}
                  state={badge.earned ? 'earned' : 'locked'}
                  size={56}
                />
                <p
                  className={`text-xs font-semibold leading-tight ${
                    badge.earned ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {badge.label}
                </p>
                {badge.earned ? (
                  <span className="mt-auto rounded-full bg-teal-500/15 px-2 py-0.5 text-[11px] font-semibold text-teal-700 dark:text-teal-300">
                    ✓ Earned
                  </span>
                ) : (
                  <span className="mt-auto w-full">
                    <span className="mb-1 flex items-center justify-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
                      <Lock size={10} aria-hidden /> {badge.progress.current}/{badge.progress.target} {unit}
                    </span>
                    <span className="block h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
                      <span
                        className="block h-full rounded-full"
                        style={{ width: `${badge.progress.pct}%`, background: `rgb(${v.rgb})` }}
                      />
                    </span>
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {open && <BadgeDetailModal kind="badge" badge={open} onClose={() => setOpenId(null)} />}
    </div>
  );
}
