'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';
import SessionReviewCard from '@/components/student/SessionReviewCard';
import { getStoredRole, getStoredToken } from '@/lib/storage';

type TabStatus = 'upcoming' | 'completed';

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

function Skeleton({ className }: { className: string }) {
  return <div className={`bg-gray-800 animate-pulse rounded-lg ${className}`} />;
}

export default function StudentLessonsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<TabStatus>('upcoming');
  const [data, setData] = useState<LessonsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) { router.push('/login'); return; }
    const role = getStoredRole();
    if (role !== 'STUDENT') { router.push('/login'); return; }
  }, [router]);

  const fetchLessons = useCallback(
    async (p: number, t: TabStatus) => {
      setLoading(true);
      setError('');
      try {
        const res = await api.get<LessonsData>('/students/me/lessons', {
          params: { status: t, page: p, limit: 10 },
        });
        setData(res.data);
        setPage(p);
      } catch (err: unknown) {
        const e = err as { response?: { data?: { message?: string | string[] } } };
        const msg = e.response?.data?.message;
        setError(
          Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Failed to load lessons.'),
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchLessons(1, tab);
    setReviewingId(null);
  }, [tab, fetchLessons]);

  const switchTab = (t: TabStatus) => {
    setTab(t);
    setData(null);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pt-6">
      <div>
        <h1 className="text-2xl font-bold text-white">My Lessons</h1>
        <p className="text-gray-400 text-sm mt-1">Mission Archive</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-800/50 rounded-xl border border-gray-700/50 w-fit">
        {(['upcoming', 'completed'] as TabStatus[]).map((t) => (
          <button
            key={t}
            onClick={() => switchTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
              tab === t
                ? 'bg-teal-500 text-black'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-400 text-sm">{error}</p>
          <button
            onClick={() => fetchLessons(page, tab)}
            className="text-teal-400 underline text-sm mt-2"
          >
            Try again
          </button>
        </div>
      ) : !data || data.bookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-5xl mb-4">{tab === 'upcoming' ? '🗓️' : '📋'}</div>
          <h3 className="text-white font-semibold text-lg mb-2">
            {tab === 'upcoming' ? 'No upcoming lessons' : 'No completed lessons yet'}
          </h3>
          <p className="text-gray-400 text-sm mb-6">
            {tab === 'upcoming'
              ? 'Book your next mission to see it here.'
              : 'Completed lessons will appear here after your first class.'}
          </p>
          <button
            onClick={() => router.push('/marketplace')}
            className="bg-teal-500 hover:bg-teal-400 text-black font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors"
          >
            Find a Teacher
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {data.bookings.map((lesson) => {
              const date = new Date(lesson.classStart);
              const initial = lesson.teacherName
                ? lesson.teacherName.charAt(0).toUpperCase()
                : 'T';
              const isReviewing = reviewingId === lesson.bookingId;

              return (
                <div
                  key={lesson.bookingId}
                  className="bg-gray-800/50 border border-gray-700/50 rounded-xl overflow-hidden"
                >
                  <div className="flex items-center gap-3 p-4">
                    {lesson.teacherAvatarUrl ? (
                      <img
                        src={lesson.teacherAvatarUrl}
                        alt={lesson.teacherName}
                        className="w-11 h-11 rounded-full object-cover border border-gray-600 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-teal-800/50 flex items-center justify-center text-teal-300 font-bold flex-shrink-0">
                        {initial}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">
                        {lesson.teacherName}
                      </p>
                      <p className="text-gray-400 text-xs">
                        {date.toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                        {' · '}
                        {lesson.durationMinutes} min
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {lesson.isUpcoming ? (
                        <span className="text-xs px-2.5 py-1 rounded-full bg-teal-500/20 text-teal-400 border border-teal-500/20 font-medium">
                          Upcoming
                        </span>
                      ) : lesson.review ? (
                        <span className="text-xs px-2.5 py-1 rounded-full bg-green-500/20 text-green-400 border border-green-500/20">
                          ★ {lesson.review.rating}
                        </span>
                      ) : (
                        <button
                          onClick={() =>
                            setReviewingId(isReviewing ? null : lesson.bookingId)
                          }
                          className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
                        >
                          Rate session
                        </button>
                      )}
                      {lesson.recordingUrl && (
                        <a
                          href={lesson.recordingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs px-2.5 py-1 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 hover:bg-violet-500/20 transition-colors"
                        >
                          Watch
                        </a>
                      )}
                    </div>
                  </div>

                  {isReviewing && !lesson.review && (
                    <div className="border-t border-gray-700/50 p-4 bg-gray-900/30">
                      <SessionReviewCard
                        review={{
                          bookingId: lesson.bookingId,
                          classStart: lesson.classStart,
                          teacherName: lesson.teacherName,
                          teacherAvatarUrl: lesson.teacherAvatarUrl,
                        }}
                        isStudentMode
                        onSubmitted={() => {
                          setReviewingId(null);
                          fetchLessons(page, tab);
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => fetchLessons(page - 1, tab)}
                disabled={page <= 1}
                className="px-4 py-2 text-sm text-gray-400 border border-gray-700 rounded-lg hover:border-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← Previous
              </button>
              <span className="text-gray-500 text-sm">
                {page} / {data.totalPages}
              </span>
              <button
                onClick={() => fetchLessons(page + 1, tab)}
                disabled={page >= data.totalPages}
                className="px-4 py-2 text-sm text-gray-400 border border-gray-700 rounded-lg hover:border-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
