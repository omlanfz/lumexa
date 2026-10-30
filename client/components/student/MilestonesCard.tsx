'use client';

// Milestones — real, backend-tracked goals (classes attended, curriculum
// progress, weekly streak, homework handed in). Shows how many are done, the
// single nearest one with its progress, the next goal in each area, and every
// milestone already reached.

import type { Milestone, ProgressData } from '@/lib/student/progress';

function MiniBar({ m }: { m: Milestone }) {
  const pct = Math.min(100, Math.round((m.current / m.target) * 100));
  return (
    <div
      role="progressbar"
      aria-label={m.title}
      aria-valuemin={0}
      aria-valuemax={m.target}
      aria-valuenow={m.current}
      className="h-2 w-full overflow-hidden rounded-full bg-teal-900/10 dark:bg-white/10"
    >
      <div className="h-full rounded-full bg-teal-500 transition-all duration-700" style={{ width: `${pct}%` }} />
    </div>
  );
}

const GROUP_LABEL: Record<Milestone['group'], string> = {
  classes: 'Classes',
  curriculum: 'Curriculum',
  streak: 'Streak',
  homework: 'Homework',
};

export default function MilestonesCard({ milestones }: { milestones: ProgressData['milestones'] }) {
  const { next, nextPerGroup, completed, completedCount, totalCount, classesThisMonth } = milestones;
  const others = nextPerGroup.filter((m) => m.id !== next?.id);

  return (
    <div
      className="bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/10 border border-teal-200 dark:border-teal-800/30 rounded-xl p-4 sm:p-6"
      data-testid="milestones"
    >
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-xs text-teal-700 dark:text-teal-300 uppercase tracking-wide font-medium">Milestones</p>
        <p className="text-xs text-teal-800/80 dark:text-teal-200/80" data-testid="milestones-count">
          {completedCount} of {totalCount} reached
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg bg-white/70 p-4 dark:bg-black/10">
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{classesThisMonth}</p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            {classesThisMonth > 0
              ? `Class${classesThisMonth !== 1 ? 'es' : ''} attended this month — keep it up! 🚀`
              : 'Attend a class this month to get your momentum going! 🌱'}
          </p>
        </div>

        <div className="rounded-lg bg-white/70 p-4 dark:bg-black/10">
          {next ? (
            <>
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Next milestone</p>
              <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                <span aria-hidden>{next.icon}</span> {next.title}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{next.description}</p>
              <div className="mt-2">
                <MiniBar m={next} />
              </div>
              <p className="mt-1 text-xs tabular-nums text-gray-600 dark:text-gray-300">
                {next.current} / {next.target}
              </p>
            </>
          ) : (
            <>
              <p className="text-3xl">🏆</p>
              <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">Every milestone reached!</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">You&apos;re a Lumexa legend.</p>
            </>
          )}
        </div>
      </div>

      {others.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs uppercase tracking-wide text-teal-700 dark:text-teal-300">Also coming up</p>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {others.map((m) => (
              <li key={m.id} className="rounded-lg bg-white/60 p-3 dark:bg-black/10">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="min-w-0 break-words font-medium text-gray-900 dark:text-white">
                    <span aria-hidden>{m.icon}</span> {m.title}
                  </span>
                  <span className="flex-shrink-0 text-xs tabular-nums text-gray-500 dark:text-gray-400">
                    {m.current}/{m.target}
                  </span>
                </div>
                <p className="mb-1.5 text-[11px] text-gray-500 dark:text-gray-400">{GROUP_LABEL[m.group]}</p>
                <MiniBar m={m} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {completed.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs uppercase tracking-wide text-teal-700 dark:text-teal-300">Reached</p>
          <ul className="flex flex-wrap gap-2">
            {completed.map((m) => (
              <li
                key={m.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-teal-500/30 bg-teal-500/10 px-2.5 py-1 text-xs font-medium text-teal-800 dark:text-teal-200"
              >
                <span aria-hidden>{m.icon}</span> {m.title} <span aria-hidden>✓</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
