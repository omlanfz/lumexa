'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/axios';
import { getStoredRole, getStoredToken } from '@/lib/storage';
import Link from 'next/link';
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

interface ScheduledLessonItem {
  id: string;
  lessonNumber: number;
  lessonTitle: string | null;
  start: string;
  end: string;
  classType: 'ONE_TO_ONE' | 'BATCH';
  status: string;
  teacher: { id: string; user: { fullName: string; avatarUrl?: string | null } };
  course: { id: string; title: string };
  recordingUrl?: string | null;
  recordingStatus?: 'NONE' | 'RECORDING' | 'PROCESSING' | 'AVAILABLE' | 'FAILED';
}

const CLASS_TYPE_LABELS: Record<string, string> = {
  ONE_TO_ONE: '1-to-1',
  BATCH: 'Batch',
};

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
  nextBadge: Badge | null;
  totalLessonsCompleted: number;
  lessonsCompletedThisMonth: number;
  memberSince: string;
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
    <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl overflow-hidden card-hover">
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
        <div className="border-t border-gray-200 dark:border-gray-700/50 p-4 bg-gray-50 dark:bg-gray-900/30 fade-in">
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

function ScheduledLessonRow({ lesson }: { lesson: ScheduledLessonItem }) {
  const start = new Date(lesson.start);
  const end = new Date(lesson.end);
  const initial = lesson.teacher.user.fullName ? lesson.teacher.user.fullName.charAt(0).toUpperCase() : 'T';
  const isUpcoming = lesson.status === 'UPCOMING';
  const isPartial = lesson.status === 'PARTIALLY_COMPLETED';

  return (
    <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl overflow-hidden card-hover">
      <div className="flex items-center gap-3 p-4">
        {lesson.teacher.user.avatarUrl ? (
          <img
            src={lesson.teacher.user.avatarUrl}
            alt={lesson.teacher.user.fullName}
            className="w-11 h-11 rounded-full object-cover border border-gray-300 dark:border-gray-600 flex-shrink-0"
          />
        ) : (
          <div className="w-11 h-11 rounded-full bg-teal-100 dark:bg-teal-800/50 flex items-center justify-center text-teal-600 dark:text-teal-300 font-bold flex-shrink-0">
            {initial}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-gray-900 dark:text-white font-medium truncate">
            Lesson {lesson.lessonNumber}
            {lesson.lessonTitle ? `: ${lesson.lessonTitle}` : ''}
          </p>
          <p className="text-gray-500 dark:text-gray-400 text-xs truncate">
            {lesson.course.title}
          </p>
          <p className="text-gray-500 dark:text-gray-400 text-xs">
            {start.toLocaleDateString('en-US', {
              timeZone: 'Asia/Dhaka',
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
            {' · '}
            {start.toLocaleTimeString('en-US', { timeZone: 'Asia/Dhaka', hour: 'numeric', minute: '2-digit' })}
            {'–'}
            {end.toLocaleTimeString('en-US', { timeZone: 'Asia/Dhaka', hour: 'numeric', minute: '2-digit' })}
            {' · with '}
            {lesson.teacher.user.fullName}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-medium">
            {CLASS_TYPE_LABELS[lesson.classType] ?? lesson.classType}
          </span>
          <span
            className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
              isUpcoming
                ? 'bg-teal-500/20 text-teal-600 dark:text-teal-400 border-teal-500/20'
                : isPartial
                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/20'
                  : 'bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/20'
            }`}
          >
            {isUpcoming ? 'Upcoming' : isPartial ? 'Partially completed' : 'Completed'}
          </span>
        </div>
      </div>
      <div className="px-4 pb-3 -mt-1">
        <Link
          href={`/lesson/${lesson.id}`}
          className="inline-block text-xs px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium transition-colors"
        >
          {isUpcoming ? 'Lesson Details' : 'View Lesson'}
        </Link>
      </div>
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
  const [scheduledUpcoming, setScheduledUpcoming] = useState<ScheduledLessonItem[]>([]);
  const [scheduledCompleted, setScheduledCompleted] = useState<ScheduledLessonItem[]>([]);
  const [progress, setProgress] = useState<ProgressData | null>(null);
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
      const [upcomingRes, completedRes, progressRes, scheduledUpRes, scheduledCompRes] =
        await Promise.all([
          api.get<LessonsData>('/students/me/lessons', { params: { status: 'upcoming', page: 1, limit: 20 } }),
          api.get<LessonsData>('/students/me/lessons', { params: { status: 'completed', page: 1, limit: 20 } }),
          api.get<ProgressData>('/students/me/progress'),
          api.get<ScheduledLessonItem[]>('/students/me/scheduled-lessons', { params: { status: 'upcoming' } }),
          api.get<ScheduledLessonItem[]>('/students/me/scheduled-lessons', { params: { status: 'completed' } }),
        ]);
      setUpcomingData(upcomingRes.data);
      setCompletedData(completedRes.data);
      setProgress(progressRes.data);
      setScheduledUpcoming(scheduledUpRes.data ?? []);
      setScheduledCompleted(scheduledCompRes.data ?? []);
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

  const nextBookingLesson = upcomingData?.bookings[0] ?? null;
  const nextScheduledLesson = scheduledUpcoming[0] ?? null;
  const nextLesson =
    nextBookingLesson && nextScheduledLesson
      ? new Date(nextBookingLesson.classStart) < new Date(nextScheduledLesson.start)
        ? { teacherName: nextBookingLesson.teacherName, classStart: nextBookingLesson.classStart }
        : { teacherName: nextScheduledLesson.teacher.user.fullName, classStart: nextScheduledLesson.start }
      : nextBookingLesson
        ? { teacherName: nextBookingLesson.teacherName, classStart: nextBookingLesson.classStart }
        : nextScheduledLesson
          ? { teacherName: nextScheduledLesson.teacher.user.fullName, classStart: nextScheduledLesson.start }
          : null;
  interface RecordingEntry {
    key: string;
    teacherName: string;
    teacherAvatarUrl?: string | null;
    classStart: string;
    durationMinutes: number;
    recordingUrl: string;
    lessonLabel?: string;
  }
  const bookingRecordings: RecordingEntry[] = (completedData?.bookings ?? [])
    .filter((l) => l.recordingUrl)
    .map((l) => ({
      key: l.bookingId,
      teacherName: l.teacherName,
      teacherAvatarUrl: l.teacherAvatarUrl,
      classStart: l.classStart,
      durationMinutes: l.durationMinutes,
      recordingUrl: l.recordingUrl!,
    }));
  const scheduledRecordings: RecordingEntry[] = scheduledCompleted
    .filter((l) => l.recordingStatus === 'AVAILABLE' && l.recordingUrl)
    .map((l) => ({
      key: l.id,
      teacherName: l.teacher.user.fullName,
      teacherAvatarUrl: l.teacher.user.avatarUrl,
      classStart: l.start,
      durationMinutes: Math.round((new Date(l.end).getTime() - new Date(l.start).getTime()) / 60000),
      recordingUrl: l.recordingUrl!,
      lessonLabel: `${l.course.title}${l.lessonTitle ? ` · Lesson ${l.lessonNumber}: ${l.lessonTitle}` : ''}`,
    }));
  const recordingLessons: RecordingEntry[] = [...scheduledRecordings, ...bookingRecordings].sort(
    (a, b) => new Date(b.classStart).getTime() - new Date(a.classStart).getTime(),
  );
  const processingCount = scheduledCompleted.filter(
    (l) => l.recordingStatus === 'RECORDING' || l.recordingStatus === 'PROCESSING',
  ).length;

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
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
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
        <div className="grid lg:grid-cols-3 gap-4 fade-in">
          <div className="lg:col-span-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl p-6 card-hover">
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

          <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl p-6 card-hover">
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
        <div className="space-y-4 fade-in">
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

          {(() => {
            const scheduledList = lessonsTabFilter === 'upcoming' ? scheduledUpcoming : scheduledCompleted;
            const bookingList = lessonsData?.bookings ?? [];
            if (scheduledList.length === 0 && bookingList.length === 0) {
              return (
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
              );
            }
            return (
              <div className="grid sm:grid-cols-2 gap-3">
                {scheduledList.map((lesson) => (
                  <ScheduledLessonRow key={lesson.id} lesson={lesson} />
                ))}
                {bookingList.map((lesson) => (
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
            );
          })()}
        </div>
      )}

      {/* ─── Progress & Achievements ──────────────────────────────────── */}
      {tab === 'progress' && progress && (
        <div className="space-y-6 fade-in">
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl p-6 card-hover">
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium mb-4">
                Rank Journey
              </p>
              <RankProgressBar currentRank={progress.spaceRank} totalSessions={progress.totalSessions} variant="full" />
            </div>
            <StreakCounter streakWeeks={progress.streakWeeks} variant="full" />
          </div>

          <BadgeGrid badges={progress.badges} />

          {progress.subjectBreakdown.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl p-6 card-hover">
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

          {/* Milestones — motivating, personal, no cohort comparison needed */}
          <div className="bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/10 border border-teal-200 dark:border-teal-800/30 rounded-xl p-6">
            <p className="text-xs text-teal-700 dark:text-teal-300 uppercase tracking-wide font-medium mb-4">
              Milestones
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-white/70 dark:bg-black/10 rounded-lg p-4">
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {progress.lessonsCompletedThisMonth}
                </p>
                <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">
                  {progress.lessonsCompletedThisMonth > 0
                    ? `Lesson${progress.lessonsCompletedThisMonth !== 1 ? 's' : ''} completed this month — keep it up! 🚀`
                    : 'Complete a lesson this month to get the streak going! 🌱'}
                </p>
              </div>
              <div className="bg-white/70 dark:bg-black/10 rounded-lg p-4">
                {progress.nextBadge ? (
                  <>
                    <p className="text-3xl">{progress.nextBadge.icon}</p>
                    <p className="text-gray-900 dark:text-white text-sm font-medium mt-1">
                      Next badge: {progress.nextBadge.label}
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
                      {progress.totalLessonsCompleted} lesson{progress.totalLessonsCompleted !== 1 ? 's' : ''} completed so far
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-3xl">🏆</p>
                    <p className="text-gray-900 dark:text-white text-sm font-medium mt-1">
                      All badges earned!
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
                      You&apos;re a Lumexa legend.
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Recordings ───────────────────────────────────────────────── */}
      {tab === 'recordings' && (
        <div className="fade-in">
          {processingCount > 0 && (
            <div className="mb-3 px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 text-amber-700 dark:text-amber-300 text-xs">
              {processingCount} recording{processingCount !== 1 ? 's are' : ' is'} still processing and will appear here once ready.
            </div>
          )}
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
                    key={lesson.key}
                    className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 rounded-xl card-hover"
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
                      {lesson.lessonLabel && (
                        <p className="text-gray-500 dark:text-gray-400 text-xs truncate">{lesson.lessonLabel}</p>
                      )}
                      <p className="text-gray-500 dark:text-gray-400 text-xs">
                        {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · {lesson.durationMinutes} min
                      </p>
                    </div>
                    <a
                      href={lesson.recordingUrl}
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
