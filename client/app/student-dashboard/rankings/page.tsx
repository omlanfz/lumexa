'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { getStoredRole, getStoredToken } from '@/lib/storage';

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
  // Global
  globalRank: number;
  totalStudents: number;
  globalPercentile: number;
  topStudents: RankEntry[];
  // Cohort
  cohortRank: number;
  totalInCohort: number;
  cohortPercentile: number;
  cohortMonth: string;
  topCohort: RankEntry[];
  // Subject
  subjectRanks: Record<string, { rank: number; total: number }>;
  // Movement
  movedUpThisMonth: number | null;
  // Me
  currentUserSessions: number;
  currentUserRank: string;
  currentUserRankIcon: string;
}

type Tab = 'cohort' | 'global' | 'subject';

function Skeleton({ className }: { className: string }) {
  return <div className={`bg-gray-800 animate-pulse rounded-lg ${className}`} />;
}

function RankList({ entries }: { entries: RankEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-400">No students ranked yet.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-700/30">
      {entries.map((entry) => {
        const initial = entry.fullName ? entry.fullName.charAt(0).toUpperCase() : '?';
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

            {entry.avatarUrl ? (
              <img
                src={entry.avatarUrl}
                alt={entry.fullName}
                className="w-9 h-9 rounded-full object-cover border border-gray-600 flex-shrink-0"
              />
            ) : (
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                  isMe ? 'bg-teal-800/60 text-teal-300' : 'bg-gray-700 text-gray-400'
                }`}
              >
                {initial}
              </div>
            )}

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

            <div className="text-right flex-shrink-0">
              <p
                className={`text-sm font-semibold ${
                  isMe ? 'text-teal-400' : 'text-gray-300'
                }`}
              >
                {entry.totalSessions}
              </p>
              <p className="text-gray-600 text-xs">sessions</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function StudentRankingsPage() {
  const router = useRouter();
  const [data, setData] = useState<RankingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('cohort');

  useEffect(() => {
    const token = getStoredToken();
    if (!token) { router.push('/student/login'); return; }
    const role = getStoredRole();
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

  const activeEntries = tab === 'cohort' ? data.topCohort : data.topStudents;
  const myRank = tab === 'cohort' ? data.cohortRank : data.globalRank;
  const myTotal = tab === 'cohort' ? data.totalInCohort : data.totalStudents;
  const myPercentile = tab === 'cohort' ? data.cohortPercentile : data.globalPercentile;

  const positionLabel =
    myRank === 1 ? '🥇 1st' : myRank === 2 ? '🥈 2nd' : myRank === 3 ? '🥉 3rd' : `#${myRank}`;

  const subjectEntries = Object.entries(data.subjectRanks);
  const movedUp = data.movedUpThisMonth;

  const tabs: { id: Tab; label: string; sub: string }[] = [
    { id: 'cohort', label: 'Cohort', sub: data.cohortMonth },
    { id: 'global', label: 'Global', sub: `${data.totalStudents} students` },
    { id: 'subject', label: 'Subject', sub: `${subjectEntries.length} subject${subjectEntries.length !== 1 ? 's' : ''}` },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6 pt-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Rankings</h1>
          <p className="text-gray-400 text-sm mt-1">Pilot Rankings</p>
        </div>
        {movedUp !== null && movedUp > 0 && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-teal-500/15 text-teal-400 border border-teal-500/20">
            🚀 Moved up {movedUp} place{movedUp !== 1 ? 's' : ''} this month
          </span>
        )}
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-gray-800/60 border border-gray-700/50 rounded-xl p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex flex-col items-center py-2.5 rounded-lg text-center transition-colors ${
              tab === t.id
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/40'
            }`}
          >
            <span className="text-xs font-semibold">{t.label}</span>
            <span className="text-[10px] opacity-70 mt-0.5">{t.sub}</span>
          </button>
        ))}
      </div>

      {/* My stats — shown for global and cohort tabs */}
      {tab !== 'subject' && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-teal-400">{positionLabel}</p>
            <p className="text-gray-400 text-xs mt-1">Your Rank</p>
          </div>
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-violet-400">{myPercentile}%</p>
            <p className="text-gray-400 text-xs mt-1">Percentile</p>
          </div>
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 text-center">
            <p className="text-xl font-bold text-white">{data.currentUserRankIcon}</p>
            <p className="text-gray-400 text-xs mt-1">
              {data.currentUserRank.replace(/_/g, ' ')}
            </p>
          </div>
        </div>
      )}

      {/* Subject tab content */}
      {tab === 'subject' && (
        <div className="space-y-3">
          {subjectEntries.length === 0 ? (
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-10 text-center">
              <p className="text-4xl mb-3">🔭</p>
              <p className="text-white font-semibold">No subjects set</p>
              <p className="text-gray-400 text-sm mt-2">
                Add subjects to your profile to see subject rankings.
              </p>
            </div>
          ) : (
            subjectEntries.map(([subject, { rank, total }]) => {
              const pct = total > 1 ? Math.round((1 - (rank - 1) / total) * 100) : 100;
              return (
                <div
                  key={subject}
                  className="bg-gray-800/50 border border-gray-700/50 rounded-xl px-5 py-4 flex items-center justify-between gap-4"
                >
                  <div>
                    <p className="text-white font-medium text-sm">{subject}</p>
                    <p className="text-gray-400 text-xs mt-0.5">
                      {total} student{total !== 1 ? 's' : ''} in this subject
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-bold text-teal-400">#{rank}</p>
                    <p className="text-gray-500 text-xs">top {pct}%</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Leaderboard — global and cohort tabs */}
      {tab !== 'subject' && (
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-700/50">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">
              {tab === 'cohort' ? `${data.cohortMonth} Cohort` : 'Global Leaderboard'}
            </p>
            <p className="text-gray-500 text-xs mt-0.5">
              {myTotal} active student{myTotal !== 1 ? 's' : ''}
            </p>
          </div>
          <RankList entries={activeEntries} />
        </div>
      )}
    </div>
  );
}
