'use client';

// FILE PATH: client/components/lesson/ProgressPanel.tsx
//
// A student's study progress through this lesson: a ring for the whole, and four
// clearly separate statuses — read, activity, quiz, homework. Opening the lesson
// counts for nothing. This is not a points system; it awards nothing and is not
// connected to gems, ranks, streaks or badges.

import type { Completion } from '@/lib/lesson/progress';

function Chip({ label, detail, done, partial }: { label: string; detail: string; done: boolean; partial?: boolean }) {
  return (
    <li className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 ${done ? 'border-emerald-500/50 bg-emerald-50 dark:bg-emerald-900/20' : partial ? 'border-amber-500/40 bg-amber-50 dark:bg-amber-900/15' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/40'}`}>
      <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${done ? 'bg-emerald-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`} aria-hidden="true">
        {done ? '✓' : '·'}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-gray-900 dark:text-white">{label}</span>
        <span className="block text-xs text-gray-600 dark:text-gray-300">{detail}</span>
      </span>
      <span className="sr-only">{done ? 'Done' : 'Not done yet'}</span>
    </li>
  );
}

export default function ProgressPanel({ completion, quizScore }: { completion: Completion; quizScore: { score: number; total: number } | null }) {
  const { percent, read, activities, quiz, homework, complete } = completion;
  const C = 2 * Math.PI * 26;
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-800/50 p-4 sm:p-5" role="region" aria-label="Your progress in this lesson">
      <div className="flex items-center gap-4">
        <svg width="64" height="64" viewBox="0 0 64 64" role="img" aria-label={`${percent}% of this lesson done`}>
          <circle cx="32" cy="32" r="26" fill="none" strokeWidth="7" className="stroke-gray-200 dark:stroke-gray-700" />
          <circle cx="32" cy="32" r="26" fill="none" strokeWidth="7" strokeLinecap="round" transform="rotate(-90 32 32)" strokeDasharray={`${(percent / 100) * C} ${C}`} className={complete ? 'stroke-emerald-500' : 'stroke-violet-500'} />
          <text x="32" y="37" textAnchor="middle" fontSize="15" fontWeight="700" className="fill-gray-900 dark:fill-white">
            {percent}%
          </text>
        </svg>
        <div className="min-w-0">
          <div className="text-sm font-bold text-gray-900 dark:text-white">{complete ? 'Lesson complete' : 'Your progress'}</div>
          <div className="text-xs text-gray-600 dark:text-gray-300">
            {complete ? 'You have read it, done the activities and handed in your work.' : 'Each part is counted only when you really do it — not when you open the page.'}
          </div>
        </div>
      </div>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        <Chip label="Read" detail={read.total ? `${read.done} of ${read.total} sections` : 'Nothing to read'} done={read.total > 0 && read.done === read.total} partial={read.done > 0} />
        {activities && <Chip label="Activities" detail={`${activities.done} of ${activities.total} tried`} done={activities.done === activities.total} partial={activities.done > 0} />}
        {quiz && (
          <Chip
            label="Quiz"
            detail={quiz.done ? (quizScore && quizScore.total > 0 ? `Finished — ${quizScore.score} of ${quizScore.total} right` : 'Finished') : quiz.answered > 0 ? `${quiz.answered} of ${quiz.total} answered` : 'Not started'}
            done={quiz.done}
            partial={quiz.answered > 0}
          />
        )}
        {homework && <Chip label="Homework" detail={homework.submitted ? 'Submitted' : 'Not submitted yet'} done={homework.submitted} />}
      </ul>
    </div>
  );
}
