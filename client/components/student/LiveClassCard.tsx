'use client';

import { useRouter } from 'next/navigation';
import { LABELS } from '@/lib/labels';
import { useLiveClass } from '@/lib/useLiveClass';

export interface LiveClass {
  type: 'lesson' | 'booking';
  id: string;
  start: string;
  end: string;
  teacherName: string;
  teacherAvatarUrl?: string | null;
  courseTitle?: string;
  lessonNumber?: number;
  lessonTitle?: string | null;
  classType?: 'ONE_TO_ONE' | 'BATCH';
  /** The batch this class is taught to (null for a 1-to-1 class). */
  batchName?: string | null;
  isLive: boolean;
  hasEnded: boolean;
  joinable: boolean;
  msUntilStart: number;
  msUntilEnd: number;
}

interface LiveClassCardProps {
  liveClass: LiveClass | null;
  /** When `liveClass` was received (Date.now()): lets the card correct for a
   * device clock that is off, using the server's own "until start". */
  receivedAt?: number;
  /** Asked each time the class changes state (its classroom opens, it starts,
   * it runs out): re-read it from the server. */
  onSync?: () => void;
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

const noop = () => {};

export default function LiveClassCard({ liveClass, receivedAt = 0, onSync = noop }: LiveClassCardProps) {
  const router = useRouter();
  // The card follows the clock itself — it turns Live the moment the start
  // arrives, with no reload — and asks the server again whenever its state
  // changes, so it never shows a class the server no longer has.
  const clock = useLiveClass(liveClass, receivedAt, onSync);

  if (!liveClass) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-2xl p-8 text-center flex flex-col items-center justify-center min-h-[220px]">
        <div className="text-5xl mb-4">🚀</div>
        <h3 className="text-gray-900 dark:text-white font-semibold text-lg mb-2">No upcoming class</h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Your next scheduled class will appear here as soon as it's booked.
        </p>
      </div>
    );
  }

  const start = new Date(liveClass.start);
  const initial = liveClass.teacherName ? liveClass.teacherName.charAt(0).toUpperCase() : 'T';
  // Until the first tick the server's own answer stands.
  const isLive = clock ? clock.isLive : liveClass.isLive;
  const joinable = clock ? clock.joinable : liveClass.joinable;
  const elapsedMs = clock?.elapsedMs ?? Math.max(0, -liveClass.msUntilStart);
  const startsInMs = clock?.startsInMs ?? Math.max(0, liveClass.msUntilStart);

  const subtitle =
    liveClass.type === 'lesson'
      ? `${liveClass.courseTitle ?? ''}${liveClass.lessonNumber ? ` · Lesson ${liveClass.lessonNumber}` : ''}${
          liveClass.lessonTitle ? `: ${liveClass.lessonTitle}` : ''
        }`
      : '1-to-1 Session';
  const groupLabel = liveClass.batchName ? `👥 ${liveClass.batchName}` : null;

  const joinHref = `/classroom/${liveClass.id}?type=${liveClass.type}`;

  return (
    <div
      data-testid="live-class-card"
      data-live={isLive ? 'true' : 'false'}
      className={`rounded-2xl p-6 sm:p-7 border card-hover transition-colors duration-500 ${
        isLive
          ? 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/25 dark:to-teal-900/10 border-emerald-300 dark:border-emerald-700/50 shadow-[0_0_0_3px_rgba(16,185,129,0.12)]'
          : 'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800/30'
      }`}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 min-w-0">
          {liveClass.teacherAvatarUrl ? (
            <img
              src={liveClass.teacherAvatarUrl}
              alt={liveClass.teacherName}
              className="w-14 h-14 rounded-full object-cover border-2 border-teal-300 dark:border-teal-700/50 flex-shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-teal-100 dark:bg-teal-800/50 border border-teal-300 dark:border-teal-700/50 flex items-center justify-center text-teal-600 dark:text-teal-300 text-xl font-bold flex-shrink-0">
              {initial}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {isLive ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-600 dark:text-red-400 text-xs font-bold uppercase tracking-wide">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse motion-reduce:animate-none" /> Live
                </span>
              ) : (
                <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">
                  Next Class
                </span>
              )}
            </div>
            <p className="text-gray-900 dark:text-white font-semibold text-lg mt-1 truncate">
              with {liveClass.teacherName}
            </p>
            {subtitle && (
              <p className="text-gray-600 dark:text-gray-300 text-sm truncate">{subtitle}</p>
            )}
            {groupLabel && (
              <p className="text-teal-700 dark:text-teal-300 text-xs font-medium truncate" title="Your batch — everyone in it is in the same class">
                {groupLabel}
              </p>
            )}
            <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
              {start.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              {' · '}
              {start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </p>
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            {isLive ? 'Elapsed' : 'Starts in'}
          </p>
          <p
            className={`text-2xl sm:text-3xl font-mono font-bold tabular-nums ${
              isLive ? 'text-emerald-600 dark:text-emerald-400' : 'text-teal-600 dark:text-teal-400'
            }`}
          >
            {isLive ? formatDuration(elapsedMs) : formatDuration(startsInMs)}
          </p>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3">
        {joinable ? (
          <button
            onClick={() => router.push(joinHref)}
            className={`flex-1 py-3 rounded-lg font-semibold text-sm active:scale-[0.98] transition-all duration-200 ${
              isLive
                ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-md shadow-emerald-500/25'
                : 'bg-teal-500 hover:bg-teal-400 text-black'
            }`}
          >
            {LABELS.STUDENT_ENTER_CLASS.primary}
          </button>
        ) : (
          <button
            onClick={() => router.push('/student-dashboard/learning?tab=lessons')}
            className="flex-1 py-3 rounded-lg font-semibold text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 active:scale-[0.98] transition-all duration-200"
          >
            View Class
          </button>
        )}
      </div>
    </div>
  );
}
