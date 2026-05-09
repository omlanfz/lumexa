'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { getStoredRole, getStoredToken } from '@/lib/storage';

interface TeacherEntry {
  teacherProfileId: string;
  fullName: string;
  avatarUrl: string | null;
  ratingAvg: number;
  reviewCount: number;
  subjects: string[];
  hourlyRate: number;
  sessionCount: number;
  lastSession: string;
}

function Skeleton({ className }: { className: string }) {
  return <div className={`bg-gray-800 animate-pulse rounded-lg ${className}`} />;
}

export default function StudentTeachersPage() {
  const router = useRouter();
  const [teachers, setTeachers] = useState<TeacherEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = getStoredToken();
    if (!token) { router.push('/student/login'); return; }
    const role = getStoredRole();
    if (role !== 'STUDENT') { router.push('/login'); return; }

    fetchTeachers();
  }, [router]);

  const fetchTeachers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get<TeacherEntry[]>('/students/me/teachers');
      setTeachers(res.data);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string | string[] } } };
      const msg = e.response?.data?.message;
      setError(
        Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Failed to load teachers.'),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pt-6">
      <div>
        <h1 className="text-2xl font-bold text-white">My Teachers</h1>
        <p className="text-gray-400 text-sm mt-1">Your Pilots</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-400 text-sm">{error}</p>
          <button
            onClick={fetchTeachers}
            className="text-teal-400 underline text-sm mt-2"
          >
            Try again
          </button>
        </div>
      ) : teachers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-5xl mb-4">👨‍🚀</div>
          <h3 className="text-white font-semibold text-lg mb-2">
            No teachers yet
          </h3>
          <p className="text-gray-400 text-sm mb-6">
            Teachers you've had sessions with will appear here.
          </p>
          <button
            onClick={() => router.push('/marketplace')}
            className="bg-teal-500 hover:bg-teal-400 text-black font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors"
          >
            Find a Teacher
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {teachers.map((teacher) => {
            const initial = teacher.fullName
              ? teacher.fullName.charAt(0).toUpperCase()
              : 'T';
            const lastDate = new Date(teacher.lastSession).toLocaleDateString(
              'en-US',
              { month: 'short', day: 'numeric', year: 'numeric' },
            );

            return (
              <div
                key={teacher.teacherProfileId}
                className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5 flex items-start gap-4"
              >
                {/* Avatar */}
                {teacher.avatarUrl ? (
                  <img
                    src={teacher.avatarUrl}
                    alt={teacher.fullName}
                    className="w-14 h-14 rounded-full object-cover border-2 border-teal-800/40 flex-shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-teal-800/50 flex items-center justify-center text-teal-300 text-xl font-bold flex-shrink-0">
                    {initial}
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-white font-semibold">{teacher.fullName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {teacher.ratingAvg > 0 && (
                          <span className="text-amber-400 text-xs">
                            ★ {teacher.ratingAvg.toFixed(1)}
                            <span className="text-gray-500 ml-1">
                              ({teacher.reviewCount})
                            </span>
                          </span>
                        )}
                        <span className="text-gray-500 text-xs">
                          ${teacher.hourlyRate}/hr
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => router.push('/marketplace')}
                      className="text-xs px-3 py-1.5 border border-teal-500 text-teal-400 rounded-lg hover:bg-teal-900/30 transition-colors whitespace-nowrap"
                    >
                      Book Again
                    </button>
                  </div>

                  {teacher.subjects.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {teacher.subjects.slice(0, 4).map((s) => (
                        <span
                          key={s}
                          className="text-xs px-2 py-0.5 rounded-full bg-gray-700/50 text-gray-300"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="text-gray-500 text-xs mt-2">
                    {teacher.sessionCount} session{teacher.sessionCount !== 1 ? 's' : ''} · Last: {lastDate}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
