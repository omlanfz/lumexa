'use client';

// Weekly learning streak, from the backend: one streak week for every
// Sunday–Saturday week with at least one attended class; a whole week without
// one resets it. The full card shows the real current streak, the last twelve
// weeks, the best streak so far and the next milestone.

import type { ProgressData } from '@/lib/student/progress';

interface CompactProps {
  variant?: 'compact';
  streakWeeks: number;
}
interface FullProps {
  variant: 'full';
  streak: ProgressData['streak'];
}

function weekLabel(weekStart: string): string {
  const d = new Date(`${weekStart}T00:00:00Z`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export default function StreakCounter(props: CompactProps | FullProps) {
  if (props.variant !== 'full') {
    const weeks = (props as CompactProps).streakWeeks;
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded-lg">
        <span className="text-lg">{weeks > 0 ? '🔥' : '🌙'}</span>
        <p className="text-orange-600 dark:text-orange-400 text-sm font-bold leading-none">{weeks}w streak</p>
      </div>
    );
  }

  const { streak } = props;
  const isActive = streak.current > 0;

  return (
    <div
      className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl p-4 sm:p-6"
      data-testid="weekly-streak"
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium mb-0.5">
            Weekly Streak
          </p>
          <h3 className="text-gray-900 dark:text-white font-semibold">
            {isActive
              ? streak.thisWeekDone
                ? 'Streak secured for this week!'
                : 'Keep it going — attend a class this week'
              : 'Attend a class this week to start a streak'}
          </h3>
        </div>
        <span className={`text-4xl ${!isActive ? 'grayscale opacity-40' : ''}`} aria-hidden>
          {isActive ? '🔥' : '🌙'}
        </span>
      </div>

      <ol className="grid grid-cols-12 gap-1 h-14 mb-1" aria-label="Last 12 weeks">
        {streak.weeks.map((w) => (
          <li
            key={w.weekStart}
            title={`Week of ${weekLabel(w.weekStart)}${w.done ? ' — class attended' : ''}${w.isCurrent ? ' (this week)' : ''}`}
            className="flex items-end"
          >
            <span
              className={`block w-full rounded-sm transition-all duration-300 ${
                w.done ? 'h-3/4 bg-orange-500' : 'h-1/4 bg-gray-200 dark:bg-gray-700'
              } ${w.isCurrent ? 'outline outline-2 outline-offset-1 outline-teal-500/70' : ''}`}
            />
          </li>
        ))}
      </ol>
      <div className="mb-4 flex justify-between text-[11px] text-gray-400">
        <span>{weekLabel(streak.weeks[0]?.weekStart ?? '')}</span>
        <span>This week</span>
      </div>

      <div>
        <span className="text-2xl font-bold text-orange-500 dark:text-orange-400" data-testid="streak-current">
          {streak.current}
        </span>
        <span className="text-base font-normal text-gray-500 dark:text-gray-400 ml-1">
          {streak.current === 1 ? 'week' : 'weeks'} in a row with a class
        </span>
      </div>

      <div className="mt-3 space-y-1 text-xs text-gray-600 dark:text-gray-400">
        {streak.next ? (
          <p>
            Next milestone: <strong className="text-gray-900 dark:text-white">{streak.next.weeks}-week streak</strong> —{' '}
            {streak.next.remaining} more week{streak.next.remaining === 1 ? '' : 's'}.
          </p>
        ) : (
          <p>You have passed every streak milestone — legendary consistency! 🌌</p>
        )}
        {streak.longest > 0 && (
          <p>
            Best streak so far: {streak.longest} week{streak.longest === 1 ? '' : 's'}.
          </p>
        )}
      </div>
    </div>
  );
}
