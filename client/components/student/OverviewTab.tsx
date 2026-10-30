'use client';

// Learning → Overview: the student's real numbers (all from the backend's
// progress payload) — classes attended, rank, badges, streak, curriculum
// progress, time in class and what is coming up. No placeholders: a value is
// shown as 0 only when the records really say 0.

import RankProgressBar from '@/components/student/RankProgressBar';
import type { ProgressData } from '@/lib/student/progress';
import { formatShortDate } from '@/lib/student/progress';

export interface UpcomingItem {
  id: string;
  title: string;
  course: string;
  start: string;
  teacher: string;
  batchName: string | null;
}

interface Props {
  progress: ProgressData;
  upcoming: UpcomingItem[];
  /** A marketplace (legacy) booking that is sooner than any scheduled class. */
  legacyNext: { teacher: string; start: string } | null;
}

function Stat({
  label,
  value,
  sub,
  tone = 'text-gray-900 dark:text-white',
  testId,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  tone?: string;
  testId?: string;
}) {
  return (
    <div
      className="min-w-0 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl p-3 sm:p-4"
      data-testid={testId}
    >
      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">{label}</p>
      <p className={`mt-1 text-xl sm:text-2xl font-bold leading-tight break-words ${tone}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{sub}</p>}
    </div>
  );
}

const dhaka = (iso: string) => {
  const d = new Date(iso);
  return `${d.toLocaleDateString('en-US', { timeZone: 'Asia/Dhaka', weekday: 'short', month: 'short', day: 'numeric' })} · ${d.toLocaleTimeString('en-US', { timeZone: 'Asia/Dhaka', hour: 'numeric', minute: '2-digit' })}`;
};

export default function OverviewTab({ progress, upcoming, legacyNext }: Props) {
  const o = progress.overview;

  return (
    <div className="space-y-4 fade-in" data-testid="learning-overview">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Stat
          label="Classes attended"
          value={o.classesAttended}
          sub={
            o.lastClassAt ? `Last one ${formatShortDate(o.lastClassAt)}` : 'Your first class is waiting'
          }
          testId="stat-classes"
        />
        <Stat
          label="Current rank"
          value={
            <span>
              <span aria-hidden>{progress.rank.icon}</span> {progress.rank.label}
            </span>
          }
          sub={progress.rank.next ? `${progress.rank.sessionsToNext} to ${progress.rank.next.label}` : 'Top rank!'}
          testId="stat-rank"
        />
        <Stat
          label="Badges earned"
          value={
            <span>
              {o.earnedBadges}
              <span className="text-base font-normal text-gray-500">/{o.totalBadges}</span>
            </span>
          }
          sub={progress.nextBadge ? `Next: ${progress.nextBadge.label}` : 'All collected!'}
          testId="stat-badges"
        />
        <Stat
          label="Learning streak"
          value={
            <span className="text-orange-500 dark:text-orange-400">
              <span aria-hidden>{progress.streak.current > 0 ? '🔥' : '🌙'}</span> {progress.streak.current}w
            </span>
          }
          sub={progress.streak.longest > 0 ? `Best: ${progress.streak.longest} weeks` : 'Attend a class to start'}
          testId="stat-streak"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl p-4 sm:p-6">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium mb-4">
              Learning progress
            </p>
            {o.curriculumProgressPct !== null && o.totalLessons ? (
              <div className="mb-5" data-testid="curriculum-progress">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm mb-1.5">
                  <span className="font-medium text-gray-900 dark:text-white break-words">
                    {o.courseEmoji} {o.courseTitle}
                  </span>
                  <span className="text-xs tabular-nums text-gray-500 dark:text-gray-400">
                    {o.lessonsCompleted} of {o.totalLessons} lessons · {o.curriculumProgressPct}%
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-label="Curriculum progress"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={o.curriculumProgressPct}
                  className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"
                >
                  <div
                    className="h-full rounded-full bg-teal-500 transition-all duration-700"
                    style={{ width: `${o.curriculumProgressPct}%` }}
                  />
                </div>
              </div>
            ) : (
              <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
                Your curriculum will appear here once your teacher has set it up.
              </p>
            )}
            <RankProgressBar rank={progress.rank} variant="dashboard" />
          </div>

          <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl p-4 sm:p-6">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">
                Upcoming classes
              </p>
              <span className="text-xs tabular-nums text-gray-500 dark:text-gray-400" data-testid="upcoming-count">
                {o.upcomingClasses} scheduled
              </span>
            </div>
            {upcoming.length === 0 && !legacyNext ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No upcoming class scheduled yet — your teacher will confirm your next session.
              </p>
            ) : (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700/50">
                {upcoming.map((c) => (
                  <li key={c.id} className="py-2.5 first:pt-0 last:pb-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white break-words">{c.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 break-words">
                      {dhaka(c.start)} · with {c.teacher}
                      {c.batchName && ` · 👥 ${c.batchName}`}
                    </p>
                  </li>
                ))}
                {legacyNext && (
                  <li className="py-2.5 first:pt-0 last:pb-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Booked session</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {dhaka(legacyNext.start)} · with {legacyNext.teacher}
                    </p>
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl p-4 sm:p-6 h-fit">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium mb-3">
            At a glance
          </p>
          <dl className="space-y-3 text-sm">
            {[
              ['Total sessions', String(progress.totalSessions)],
              ['Total hours', `${progress.totalHours}h`],
              ['Lessons completed', o.totalLessons ? `${o.lessonsCompleted}/${o.totalLessons}` : String(o.lessonsCompleted)],
              ['This month', `${progress.milestones.classesThisMonth} class${progress.milestones.classesThisMonth === 1 ? '' : 'es'}`],
              ['Homework submitted', String(o.homeworkSubmitted)],
              ['Milestones reached', `${progress.milestones.completedCount}/${progress.milestones.totalCount}`],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-3">
                <dt className="text-gray-500 dark:text-gray-400">{k}</dt>
                <dd className="text-gray-900 dark:text-white font-semibold tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
