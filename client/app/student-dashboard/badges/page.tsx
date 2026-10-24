'use client';

// "My Badges" — every classroom badge a teacher has awarded this student, with
// the date. Recognition only: there are no points, levels or rankings here, and
// it is separate from the older gems/streak achievements on the Learning page.

import { useEffect, useState } from 'react';
import { Award, Loader2 } from 'lucide-react';
import { fetchMyBadges, type MyBadgesResponse } from '@/lib/classroom/badgesApi';

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function MyBadgesPage() {
  const [data, setData] = useState<MyBadgesResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    fetchMyBadges()
      .then((d) => alive && setData(d))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [attempt]);

  const retry = () => {
    setFailed(false);
    setAttempt((n) => n + 1);
  };

  return (
    <div className="max-w-4xl mx-auto" data-testid="my-badges">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center">
          <Award size={22} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Badges</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Recognition from your teachers for great work in class.
          </p>
        </div>
      </div>

      {failed ? (
        <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load your badges.{' '}
          <button onClick={retry} className="font-semibold underline">
            Try again
          </button>
        </div>
      ) : !data ? (
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 py-10">
          <Loader2 size={16} className="animate-spin" /> Loading your badges…
        </div>
      ) : data.total === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/15 dark:border-white/15 p-10 text-center">
          <div className="text-4xl mb-3" aria-hidden>
            🌟
          </div>
          <p className="font-semibold text-gray-900 dark:text-white mb-1">No badges yet</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            When your teacher spots something great in class — a good idea, a bug squashed, a project finished — they
            can give you a badge. It will show up here.
          </p>
        </div>
      ) : (
        <>
          <section aria-label="Your collection" className="mb-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
              Your collection <span className="font-normal normal-case">· {data.total} earned</span>
            </h2>
            <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {data.summary.map((b) => (
                <li
                  key={b.badgeId}
                  data-testid={`collection-${b.badgeId}`}
                  className="relative rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-white/5 p-4 text-center"
                >
                  <div className="text-4xl mb-1.5" aria-hidden>
                    {b.emoji}
                  </div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{b.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Last earned {formatDate(b.lastAwardedAt)}
                  </p>
                  {b.count > 1 && (
                    <span
                      className="absolute top-2 right-2 rounded-full bg-teal-500/15 px-2 py-0.5 text-xs font-bold text-teal-700 dark:text-teal-300"
                      aria-label={`earned ${b.count} times`}
                    >
                      ×{b.count}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section aria-label="Every badge you have earned">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
              Every badge
            </h2>
            <ul className="divide-y divide-black/10 dark:divide-white/10 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-white/5">
              {data.badges.map((b) => (
                <li key={b.id} className="flex items-center gap-4 px-4 py-3" data-testid="badge-row">
                  <span className="text-3xl flex-shrink-0" aria-hidden>
                    {b.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{b.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {b.criteria && `${b.criteria} · `}from {b.awardedBy}
                    </p>
                  </div>
                  <time dateTime={b.awardedAt} className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                    {formatDate(b.awardedAt)}
                  </time>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
