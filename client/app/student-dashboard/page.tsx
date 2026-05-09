'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { LABELS } from '@/lib/labels';
import NextClassCard from '@/components/student/NextClassCard';
import GemWalletWidget from '@/components/student/GemWalletWidget';
import RankProgressBar from '@/components/student/RankProgressBar';
import SessionReviewCard from '@/components/student/SessionReviewCard';
import RankUpCeremony from '@/components/student/RankUpCeremony';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UpcomingBooking {
  bookingId: string;
  classStart: string;
  classEnd: string;
  teacherName: string;
  teacherAvatarUrl?: string | null;
}

interface PendingReview {
  bookingId: string;
  classStart: string;
  teacherName: string;
  teacherAvatarUrl?: string | null;
}

interface RecentSession {
  bookingId: string;
  classStart: string;
  classEnd: string;
  teacherName: string;
  teacherAvatarUrl?: string | null;
  durationMinutes: number;
  hasReview: boolean;
}

interface StudentInfo {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  spaceRank: string;
  rankIcon: string;
  totalSessions: number;
  streakWeeks: number;
  streakFreezes: number;
  gemBalance: number;
  hasBillingContact: boolean;
  sessionsToNextRank: number | null;
}

interface Stats {
  totalSessions: number;
  upcomingCount: number;
  spaceRank: string;
  streakWeeks: number;
  gemBalance: number;
}

interface DashboardData {
  student: StudentInfo;
  upcomingBooking: UpcomingBooking | null;
  pendingReview: PendingReview | null;
  recentSessions: RecentSession[];
  stats: Stats;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className: string }) {
  return <div className={`bg-gray-800 animate-pulse rounded-lg ${className}`} />;
}

function DashboardSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 pt-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-32 w-full rounded-xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StudentDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingReview, setPendingReview] = useState<PendingReview | null>(null);
  const [showCeremony, setShowCeremony] = useState(false);
  const [ceremonyRank, setCeremonyRank] = useState('');
  const [ceremonyIcon, setCeremonyIcon] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/student/login'); return; }

    const rawUser = localStorage.getItem('user');
    const role = rawUser ? (JSON.parse(rawUser) as { role?: string }).role : null;
    if (role !== 'STUDENT') { router.push('/login'); return; }

    fetchDashboard();
  }, [router]);

  const fetchDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get<DashboardData>('/students/me/dashboard');
      setData(res.data);
      setPendingReview(res.data.pendingReview);
      // Rank-up ceremony: compare stored rank to API rank
      const RANK_ORDER = ['STARCHILD', 'EXPLORER', 'COSMONAUT', 'NAVIGATOR', 'CAPTAIN', 'GALAXY_COMMANDER'];
      const lastRank = localStorage.getItem('lumexa_last_rank') ?? '';
      const currentRank = res.data.student.spaceRank;
      if (lastRank && RANK_ORDER.indexOf(currentRank) > RANK_ORDER.indexOf(lastRank)) {
        setCeremonyRank(currentRank);
        setCeremonyIcon(res.data.student.rankIcon);
        setShowCeremony(true);
      } else if (!lastRank) {
        localStorage.setItem('lumexa_last_rank', currentRank);
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string | string[] } } };
      const msg = e.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Failed to load dashboard.'));
    } finally {
      setLoading(false);
    }
  };

  const handleCeremonyDismiss = () => {
    setShowCeremony(false);
    if (data) localStorage.setItem('lumexa_last_rank', data.student.spaceRank);
  };

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <p className="text-5xl">🚫</p>
        <p className="text-red-400 text-sm max-w-sm text-center">{error}</p>
        <button onClick={fetchDashboard} className="text-teal-400 underline text-sm">
          Try again
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { student, upcomingBooking, recentSessions, stats } = data;

  const statCards = [
    {
      icon: '📚',
      label: 'Total Sessions',
      value: stats.totalSessions,
      color: 'text-teal-400',
    },
    {
      icon: student.rankIcon,
      label: 'Space Rank',
      value: stats.spaceRank.replace(/_/g, ' '),
      color: 'text-violet-400',
    },
    {
      icon: stats.streakWeeks > 0 ? '🔥' : '❄️',
      label: LABELS.STUDENT_STREAK.primary,
      value: `${stats.streakWeeks}w`,
      color: stats.streakWeeks > 0 ? 'text-orange-400' : 'text-gray-400',
    },
    {
      icon: '✦',
      label: LABELS.STUDENT_GEMS.primary,
      value: stats.gemBalance,
      color: 'text-amber-400',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pt-6">
      {showCeremony && (
        <RankUpCeremony
          newRank={ceremonyRank}
          rankIcon={ceremonyIcon}
          onDismiss={handleCeremonyDismiss}
        />
      )}

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          Welcome back, {student.fullName.split(' ')[0]} 👋
        </h1>
        <p className="text-gray-400 text-sm mt-1">{LABELS.STUDENT_DASHBOARD.theme}</p>
      </div>

      {/* Hero: Next class */}
      <NextClassCard booking={upcomingBooking} />

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((s) => (
          <div
            key={s.label}
            className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 text-center"
          >
            <span className="text-2xl">{s.icon}</span>
            <p className={`text-xl font-bold mt-2 ${s.color}`}>{s.value}</p>
            <p className="text-gray-400 text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Pending review — prominent, shown before recent sessions */}
      {pendingReview && (
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-3">
            Rate your last session
          </p>
          <SessionReviewCard
            review={pendingReview}
            isStudentMode
            onSubmitted={() => {
              setPendingReview(null);
              fetchDashboard();
            }}
          />
        </div>
      )}

      {/* Rank progress */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
        <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-4">
          Rank Progress
        </p>
        <RankProgressBar
          currentRank={student.spaceRank}
          totalSessions={student.totalSessions}
          variant="dashboard"
        />
      </div>

      {/* Gem wallet */}
      <GemWalletWidget
        balance={student.gemBalance}
        hasBillingContact={student.hasBillingContact}
      />

      {/* Recent sessions */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">
            Recent Sessions
          </p>
          {recentSessions.length > 0 && (
            <button
              onClick={() => router.push('/student-dashboard/lessons')}
              className="text-teal-400 text-xs hover:text-teal-300 transition-colors"
            >
              View All →
            </button>
          )}
        </div>

        {recentSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="text-5xl mb-4">📋</div>
            <h3 className="text-white font-semibold text-lg mb-2">No completed sessions yet</h3>
            <p className="text-gray-400 text-sm mb-6">
              Your completed lessons will appear here after your first class.
            </p>
            <button
              onClick={() => router.push('/marketplace')}
              className="bg-teal-500 hover:bg-teal-400 text-black font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors"
            >
              {LABELS.STUDENT_BOOK_CLASS.primary}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {recentSessions.map((session) => {
              const date = new Date(session.classStart);
              const initial = session.teacherName
                ? session.teacherName.charAt(0).toUpperCase()
                : 'T';
              return (
                <div
                  key={session.bookingId}
                  className="flex items-center gap-3 p-3 rounded-xl bg-gray-700/30 border border-gray-700/50 hover:border-gray-600/50 transition-colors"
                >
                  {session.teacherAvatarUrl ? (
                    <img
                      src={session.teacherAvatarUrl}
                      alt={session.teacherName}
                      className="w-10 h-10 rounded-full object-cover border border-gray-600 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-teal-800/50 flex items-center justify-center text-teal-300 font-bold flex-shrink-0">
                      {initial}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{session.teacherName}</p>
                    <p className="text-gray-400 text-xs">
                      {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {' · '}{session.durationMinutes} min
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${
                    session.hasReview
                      ? 'bg-green-500/20 text-green-400 border border-green-500/20'
                      : 'bg-gray-600/20 text-gray-400 border border-gray-600/20'
                  }`}>
                    {session.hasReview ? '★ Reviewed' : 'No review'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
