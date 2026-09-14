'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/axios';
import { getStoredRole, getStoredToken } from '@/lib/storage';
import SessionReviewCard from '@/components/student/SessionReviewCard';
import RankProgressBar from '@/components/student/RankProgressBar';
import StreakCounter from '@/components/student/StreakCounter';
import BadgeGrid from '@/components/student/BadgeGrid';

// ─── Types ────────────────────────────────────────────────────────────────────

type TabId = 'overview' | 'lessons' | 'progress' | 'recordings';

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'lessons', label: 'Lessons' },
  { id: 'progress', label: 'Progress & Achievements' },
  { id: 'recordings', label: 'Recordings' },
];

interface Lesson {
  bookingId: string;
  status: string;
  classStart: string;
  classEnd: string;
  teacherName: string;
  teacherAvatarUrl?: string | null;
  durationMinutes: number;
  review: { id: string; rating: number; comment?: string | null } | null;
  recordingUrl?: string | null;
  isUpcoming: boolean;
}

interface LessonsData {
  bookings: Lesson[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface SubjectCount {
  subject: string;
  count: number;
}

interface Badge {
  id: string;
  label: string;
  icon: string;
  earned: boolean;
}

interface ProgressData {
  spaceRank: string;
  rankIcon: string;
  totalSessions: number;
  totalHours: number;
  streakWeeks: number;
  sessionsToNextRank: number | null;
  subjects: string[];
  subjectBreakdown: SubjectCount[];
  badges: Badge[];
  memberSince: string;
}

interface RankEntry {
  position: number;
  fullName: string;
  avatarUrl: string | null;
  totalSessions: number;
  spaceRank: string;
  spaceRankIcon: string;
  isCurrentUser: boolean;
}

interface RankingsData {
  cohortRank: number;
  totalInCohort: number;
  cohortMonth: string;
  topCohort: RankEntry[];
}

function Skeleton({ className }: { className: string }) {
  return <div className={`bg-gray-200 dark:bg-gray-800 animate-pulse rounded-lg ${className}`} />;
}

function StatusBadge({ lesson }: { lesson: Lesson }) {
  if (lesson.isUpcoming) {
    return (
      <span className="text-xs px-2.5 py-1 rounded-full bg-teal-500/20 text-teal-600 dark:text-teal-400 border border-teal-500/20 font-medium">
        Upcoming
      </span>
    );
  }
  if (lesson.review) {
    return (
      <span className="text-xs px-2.5 py-1 rounded-full bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/20">
        ★ {lesson.review.rating}
      </span>
    );
  }
  return null;
}

function LessonRow({
  lesson,
  onRate,
  isReviewing,
  onRateSubmitted,
}: {
  lesson: Lesson;
  onRate: () => void;
  isReviewing: boolean;
  onRateSubmitted: () => void;
}) {
  const date = new Date(lesson.classStart);
  const initial = lesson.teacherName ? lesson.teacherName.charAt(0).toUpperCase() : 'T';

  return (
    <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        {lesson.teacherAvatarUrl ? (
          <img
            src={lesson.teacherAvatarUrl}
            alt={lesson.teacherName}
            className="w-11 h-11 rounded-full object-cover border border-gray-300 dark:border-gray-600 flex-shrink-0"
          />
        ) : (
          <div className="w-11 h-11 rounded-full bg-teal-100 dark:bg-teal-800/50 flex items-center justify-center text-teal-600 dark:text-teal-300 font-bold flex-shrink-0">
            {initial}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-gray-900 dark:text-white font-medium truncate">
            {lesson.teacherName}
          </p>
          <p className="text-gray-500 dark:text-gray-400 text-xs">
            {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            {' · '}
            {lesson.durationMinutes} min
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusBadge lesson={lesson} />
          {!lesson.isUpcoming && !lesson.review && (
            <button
              onClick={onRate}
              className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
            >
              Rate session
            </button>
          )}
          {lesson.recordingUrl && (
            <a
              href={lesson.recordingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-2.5 py-1 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 hover:bg-violet-500/20 transition-colors"
            >
              Watch recording
            </a>
          )}
        </div>
      </div>

      {isReviewing && !lesson.review && (
        <div className="border-t border-gray-200 dark:border-gray-700/50 p-4 bg-gray-50 dark:bg-gray-900/30">
          <SessionReviewCard
            review={{
              bookingId: lesson.bookingId,
              classStart: lesson.classStart,
              teacherName: lesson.teacherName,
              teacherAvatarUrl: lesson.teacherAvatarUrl,
            }}
            isStudentMode
            onSubmitted={onRateSubmitted}
          />
        </div>
      )}
    </div>
  );
}

function LearningHubContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as TabId) || 'overview';
  const [tab, setTab] = useState<TabId>(TABS.some((t) => t.id === initialTab) ? initialTab : 'overview');

  const [lessonsTabFilter, setLessonsTabFilter] = useState<'upcoming' | 'completed'>('upcoming');
  const [upcomingData, setUpcomingData] = useState<LessonsData | null>(null);
  const [completedData, setCompletedData] = useState<LessonsData | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [rankings, setRankings] = useState<RankingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) { router.push('/login'); return; }
    const role = getStoredRole();
    if (role !== 'STUDENT') { router.push('/login'); return; }
  }, [router]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [upcomingRes, completedRes, progressRes, rankingsRes] = await Promise.all([
        api.get<LessonsData>('/students/me/lessons', { params: { status: 'upcoming', page: 1, limit: 20 } }),
        api.get<LessonsData>('/students/me/lessons', { params: { status: 'completed', page: 1, limit: 20 } }),
        api.get<ProgressData>('/students/me/progress'),
        api.get<RankingsData>('/students/me/rankings'),
      ]);
      setUpcomingData(upcomingRes.data);
      setCompletedData(completedRes.data);
      setProgress(progressRes.data);
      setRankings(rankingsRes.data);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string | string[] } } };
      const msg = e.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Failed to load your learning hub.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const switchLessonsFilter = (t: 'upcoming' | 'completed') => {
    setLessonsTabFilter(t);
    setReviewingId(null);
  };

  const lessonsData = lessonsTabFilter === 'upcoming' ? upcomingData : completedData;

  const goTab = (id: TabId) => {
    setTab(id);
    router.replace(`/student-dashboard/learning?tab=${id}`, { scroll: false });
  };

  if (loading && !lessonsData && !progress) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-full max-w-md rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (error && !progress) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <p className="text-5xl">🚫</p>
        <p className="text-red-500 dark:text-red-400 text-sm max-w-sm text-center">{error}</p>
        <button onClick={() => fetchAll()} className="text-teal-500 dark:text-teal-400 underline text-sm">
          Try again
        </button>
      </div>
    );
  }

  const nextLesson = upcomingData?.bookings[0] ?? null;
  const recordingLessons = (completedData?.bookings ?? []).filter((l) => l.recordingUrl);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Learning</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Your lessons, progress, and recordings — all in one place.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700/50 w-full overflow-x-auto sm:w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => goTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              tab === t.id
                ? 'bg-teal-500 text-black'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── Overview ─────────────────────────────────────────────────── */}
      {tab === 'overview' && progress && (
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl p-6">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium mb-4">
              Current Progress
            </p>
            <RankProgressBar currentRank={progress.spaceRank} totalSessions={progress.totalSessions} variant="dashboard" />

            {nextLesson ? (
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700/50">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium mb-2">
                  Next Lesson
                </p>
                <p className="text-gray-900 dark:text-white text-sm font-medium">
                  With {nextLesson.teacherName} ·{' '}
                  {new Date(nextLesson.classStart).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </p>
              </div>
            ) : (
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700/50">
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No upcoming lesson scheduled yet — your teacher will confirm your next session.
                </p>
              </div>
            )}
          </div>

          <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl p-6">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium mb-3">
              At a Glance
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Total sessions</span>
                <span className="text-gray-900 dark:text-white font-semibold">{progress.totalSessions}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Total hours</span>
                <span className="text-gray-900 dark:text-white font-semibold">{progress.totalHours}h</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Streak</span>
                <span className="text-orange-500 dark:text-orange-400 font-semibold">🔥 {progress.streakWeeks}w</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Lessons ──────────────────────────────────────────────────── */}
      {tab === 'lessons' && (
        <div className="space-y-4">
          <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700/50 w-fit">
            {(['upcoming', 'completed'] as const).map((t) => (
              <button
                key={t}
                onClick={() => switchLessonsFilter(t)}
                className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                  lessonsTabFilter === t
                    ? 'bg-teal-500 text-black'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {!lessonsData || lessonsData.bookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center bg-gray-50 dark:bg-gray-800/30 rounded-xl">
              <div className="text-5xl mb-4">{lessonsTabFilter === 'upcoming' ? '🗓️' : '📋'}</div>
              <h3 className="text-gray-900 dark:text-white font-semibold text-lg mb-2">
                {lessonsTabFilter === 'upcoming' ? 'No upcoming lessons' : 'No completed lessons yet'}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {lessonsTabFilter === 'upcoming'
                  ? 'Your teacher will schedule your next session soon.'
                  : 'Completed lessons will appear here after your first class.'}
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {lessonsData.bookings.map((lesson) => (
                <LessonRow
                  key={lesson.bookingId}
                  lesson={lesson}
                  isReviewing={reviewingId === lesson.bookingId}
                  onRate={() => setReviewingId(reviewingId === lesson.bookingId ? null : lesson.bookingId)}
                  onRateSubmitted={() => {
                    setReviewingId(null);
                    fetchAll();
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Progress & Achievements ──────────────────────────────────── */}
      {tab === 'progress' && progress && (
        <div className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl p-6">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium mb-4">
                Rank Journey
              </p>
              <RankProgressBar currentRank={progress.spaceRank} totalSessions={progress.totalSessions} variant="full" />
            </div>
            <StreakCounter streakWeeks={progress.streakWeeks} variant="full" />
          </div>

          <BadgeGrid badges={progress.badges} />

          {progress.subjectBreakdown.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl p-6">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium mb-4">
                Sessions by Subject
              </p>
              <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
                {progress.subjectBreakdown.map(({ subject, count }) => {
                  const max = progress.subjectBreakdown[0].count;
                  const pct = Math.round((count / max) * 100);
                  return (
                    <div key={subject}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700 dark:text-gray-300">{subject}</span>
                        <span className="text-gray-500">{count} session{count !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                        <div className="bg-teal-400 h-1.5 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Leaderboard — secondary, de-emphasized */}
          {rankings && rankings.topCohort.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">
                  {rankings.cohortMonth} Leaderboard
                </p>
                <span className="text-gray-500 dark:text-gray-400 text-xs">
                  You're #{rankings.cohortRank} of {rankings.totalInCohort}
                </span>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700/30">
                {rankings.topCohort.slice(0, 5).map((entry) => (
                  <div
                    key={`${entry.position}-${entry.fullName}`}
                    className={`flex items-center gap-3 py-2.5 ${entry.isCurrentUser ? 'text-teal-600 dark:text-teal-300' : 'text-gray-700 dark:text-gray-300'}`}
                  >
                    <span className="w-6 text-xs text-gray-500">#{entry.position}</span>
                    <span className="flex-1 text-sm truncate">
                      {entry.isCurrentUser ? `${entry.fullName} (You)` : entry.fullName}
                    </span>
                    <span className="text-xs text-gray-500">{entry.totalSessions} sessions</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Recordings ───────────────────────────────────────────────── */}
      {tab === 'recordings' && (
        <div>
          {recordingLessons.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center bg-gray-50 dark:bg-gray-800/30 rounded-xl">
              <div className="text-5xl mb-4">🎬</div>
              <h3 className="text-gray-900 dark:text-white font-semibold text-lg mb-2">No recordings yet</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Class recordings appear here after your sessions are processed. Switch to the Lessons tab (Completed) to see processing status.
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {recordingLessons.map((lesson) => {
                const date = new Date(lesson.classStart);
                const initial = lesson.teacherName ? lesson.teacherName.charAt(0).toUpperCase() : 'T';
                return (
                  <div
                    key={lesson.bookingId}
                    className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl"
                  >
                    {lesson.teacherAvatarUrl ? (
                      <img
                        src={lesson.teacherAvatarUrl}
                        alt={lesson.teacherName}
                        className="w-11 h-11 rounded-full object-cover border border-gray-300 dark:border-gray-600 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-teal-100 dark:bg-teal-800/50 flex items-center justify-center text-teal-600 dark:text-teal-300 font-bold flex-shrink-0">
                        {initial}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 dark:text-white font-medium truncate">{lesson.teacherName}</p>
                      <p className="text-gray-500 dark:text-gray-400 text-xs">
                        {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · {lesson.durationMinutes} min
                      </p>
                    </div>
                    <a
                      href={lesson.recordingUrl!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-lg transition-colors flex-shrink-0"
                    >
                      <span>▶</span> Watch
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function StudentLearningPage() {
  return (
    <Suspense fallback={<div className="space-y-6"><Skeleton className="h-8 w-64" /><Skeleton className="h-64 w-full rounded-xl" /></div>}>
      <LearningHubContent />
    </Suspense>
  );
}
