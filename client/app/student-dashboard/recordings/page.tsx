'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { getStoredRole, getStoredToken } from '@/lib/storage';

interface Lesson {
  bookingId: string;
  classStart: string;
  classEnd: string;
  teacherName: string;
  teacherAvatarUrl?: string | null;
  durationMinutes: number;
  recordingUrl?: string | null;
}

interface LessonsData {
  bookings: Lesson[];
  total: number;
  totalPages: number;
}

function Skeleton({ className }: { className: string }) {
  return <div className={`bg-gray-800 animate-pulse rounded-lg ${className}`} />;
}

export default function StudentRecordingsPage() {
  const router = useRouter();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) { router.push('/student/login'); return; }
    const role = getStoredRole();
    if (role !== 'STUDENT') { router.push('/login'); return; }

    fetchRecordings(1);
  }, [router]);

  const fetchRecordings = async (p: number) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get<LessonsData>('/students/me/lessons', {
        params: { status: 'completed', page: p, limit: 20 },
      });
      setLessons(res.data.bookings);
      setTotalPages(res.data.totalPages);
      setPage(p);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string | string[] } } };
      const msg = e.response?.data?.message;
      setError(
        Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Failed to load recordings.'),
      );
    } finally {
      setLoading(false);
    }
  };

  const withRecording = lessons.filter((l) => l.recordingUrl);
  const processing = lessons.filter((l) => !l.recordingUrl);

  return (
    <div className="max-w-3xl mx-auto space-y-6 pt-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Recordings</h1>
        <p className="text-gray-400 text-sm mt-1">Mission Playback</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-400 text-sm">{error}</p>
          <button
            onClick={() => fetchRecordings(page)}
            className="text-teal-400 underline text-sm mt-2"
          >
            Try again
          </button>
        </div>
      ) : lessons.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-5xl mb-4">🎬</div>
          <h3 className="text-white font-semibold text-lg mb-2">
            No recordings yet
          </h3>
          <p className="text-gray-400 text-sm mb-6">
            Class recordings will appear here after your sessions are processed.
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
          {withRecording.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-3">
                Ready to Watch
              </p>
              <div className="space-y-3">
                {withRecording.map((lesson) => {
                  const date = new Date(lesson.classStart);
                  const initial = lesson.teacherName
                    ? lesson.teacherName.charAt(0).toUpperCase()
                    : 'T';

                  return (
                    <div
                      key={lesson.bookingId}
                      className="flex items-center gap-3 p-4 bg-gray-800/50 border border-gray-700/50 rounded-xl"
                    >
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
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}{' '}
                          · {lesson.durationMinutes} min
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
            </div>
          )}

          {processing.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-3">
                Processing
              </p>
              <div className="space-y-3">
                {processing.map((lesson) => {
                  const date = new Date(lesson.classStart);
                  const initial = lesson.teacherName
                    ? lesson.teacherName.charAt(0).toUpperCase()
                    : 'T';

                  return (
                    <div
                      key={lesson.bookingId}
                      className="flex items-center gap-3 p-4 bg-gray-800/30 border border-gray-700/30 rounded-xl opacity-60"
                    >
                      {lesson.teacherAvatarUrl ? (
                        <img
                          src={lesson.teacherAvatarUrl}
                          alt={lesson.teacherName}
                          className="w-11 h-11 rounded-full object-cover border border-gray-600 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-gray-700 flex items-center justify-center text-gray-500 font-bold flex-shrink-0">
                          {initial}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-300 font-medium truncate">
                          {lesson.teacherName}
                        </p>
                        <p className="text-gray-500 text-xs">
                          {date.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      <span className="text-xs px-3 py-1.5 bg-gray-700/50 text-gray-500 rounded-lg flex-shrink-0">
                        Processing…
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => fetchRecordings(page - 1)}
                disabled={page <= 1}
                className="px-4 py-2 text-sm text-gray-400 border border-gray-700 rounded-lg hover:border-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← Previous
              </button>
              <span className="text-gray-500 text-sm">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => fetchRecordings(page + 1)}
                disabled={page >= totalPages}
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
