'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';

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
  globalRank: number;
  totalStudents: number;
  globalPercentile: number;
  topStudents: RankEntry[];
  currentUserSessions: number;
  currentUserRank: string;
  currentUserRankIcon: string;
}

function Skeleton({ className }: { className: string }) {
  return <div className={`bg-gray-800 animate-pulse rounded-lg ${className}`} />;
}

export default function StudentRankingsPage() {
  const router = useRouter();
  const [data, setData] = useState<RankingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/student/login'); return; }
    const rawUser = localStorage.getItem('user');
    const role = rawUser ? (JSON.parse(rawUser) as { role?: string }).role : null;
    if (role !== 'STUDENT') { router.push('/login'); return; }

    fetchRankings();
  }, [router]);

  const fetchRankings = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get<RankingsData>('/students/me/rankings');
      setData(res.data);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string | string[] } } };
      const msg = e.response?.data?.message;
      setError(
        Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Failed to load rankings.'),
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 pt-6">
        <Skeleton className="h-8 w-40" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <p className="text-5xl">🚫</p>
        <p className="text-red-400 text-sm max-w-sm text-center">{error}</p>
        <button onClick={fetchRankings} className="text-teal-400 underline text-sm">
          Try again
        </button>
      </div>
    );
  }

  if (!data) return null;

  const myPosition =
    data.topStudents.find((s) => s.isCurrentUser)?.position ?? data.globalRank;

  const positionLabel =
    myPosition === 1
      ? '🥇 1st'
      : myPosition === 2
        ? '🥈 2nd'
        : myPosition === 3
          ? '🥉 3rd'
          : `#${myPosition}`;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pt-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Rankings</h1>
        <p className="text-gray-400 text-sm mt-1">Pilot Rankings</p>
      </div>

      {/* My stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-teal-400">{positionLabel}</p>
          <p className="text-gray-400 text-xs mt-1">Your Rank</p>
        </div>
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-violet-400">
            {data.globalPercentile}%
          </p>
          <p className="text-gray-400 text-xs mt-1">Percentile</p>
        </div>
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 text-center">
          <p className="text-xl font-bold text-white">
            {data.currentUserRankIcon}
          </p>
          <p className="text-gray-400 text-xs mt-1">
            {data.currentUserRank.replace(/_/g, ' ')}
          </p>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-700/50">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">
            Top Students
          </p>
          <p className="text-gray-500 text-xs mt-0.5">
            {data.totalStudents} active students
          </p>
        </div>

        {data.topStudents.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-gray-400">No students ranked yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700/30">
            {data.topStudents.map((entry) => {
              const initial = entry.fullName
                ? entry.fullName.charAt(0).toUpperCase()
                : '?';
              const isMe = entry.isCurrentUser;

              return (
                <div
                  key={`${entry.position}-${entry.fullName}`}
                  className={`flex items-center gap-3 px-5 py-3.5 transition-colors ${
                    isMe
                      ? 'bg-teal-900/20 border-l-2 border-teal-400'
                      : 'hover:bg-gray-700/20'
                  }`}
                >
                  {/* Position */}
                  <div className="w-8 flex-shrink-0 text-center">
                    {entry.position === 1 ? (
                      <span className="text-xl">🥇</span>
                    ) : entry.position === 2 ? (
                      <span className="text-xl">🥈</span>
                    ) : entry.position === 3 ? (
                      <span className="text-xl">🥉</span>
                    ) : (
                      <span className="text-gray-500 text-sm font-medium">
                        #{entry.position}
                      </span>
                    )}
                  </div>

                  {/* Avatar */}
                  {entry.avatarUrl ? (
                    <img
                      src={entry.avatarUrl}
                      alt={entry.fullName}
                      className="w-9 h-9 rounded-full object-cover border border-gray-600 flex-shrink-0"
                    />
                  ) : (
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                        isMe
                          ? 'bg-teal-800/60 text-teal-300'
                          : 'bg-gray-700 text-gray-400'
                      }`}
                    >
                      {initial}
                    </div>
                  )}

                  {/* Name + rank */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`font-medium truncate text-sm ${
                        isMe ? 'text-teal-300' : 'text-white'
                      }`}
                    >
                      {isMe ? `${entry.fullName} (You)` : entry.fullName}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {entry.spaceRankIcon} {entry.spaceRank.replace(/_/g, ' ')}
                    </p>
                  </div>

                  {/* Sessions */}
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-semibold ${isMe ? 'text-teal-400' : 'text-gray-300'}`}>
                      {entry.totalSessions}
                    </p>
                    <p className="text-gray-600 text-xs">sessions</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
