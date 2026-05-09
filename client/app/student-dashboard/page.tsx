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

const RANK_ORDER = [
  'STARCHILD',
  'EXPLORER',
  'COSMONAUT',
  'NAVIGATOR',
  'CAPTAIN',
  'GALAXY_COMMANDER',
];

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
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
  );
}

// ─── Onboarding checklist for new students (0 sessions) ──────────────────────

function OnboardingChecklist({ studentName, router }: { studentName: string; router: ReturnType<typeof useRouter> }) {
  const steps = [
    { icon: '✅', label: 'Account created', done: true },
    { icon: '🔭', label: 'Browse teachers in the marketplace', done: false, action: () => router.push('/marketplace') },
    { icon: '📅', label: 'Book your first session', done: false, action: () => router.push('/marketplace') },
    { icon: '🚀', label: 'Enter Star Lab and launch your mission', done: false },
  ];

  return (
    <div className="bg-gradient-to-br from-teal-900/30 to-cyan-900/20 border border-teal-700/40 rounded-xl p-6">
      <div className="flex items-start justify-between flex-wrap gap-3 mb-5">
        <div>
          <p className="text-xs text-teal-400 font-medium uppercase tracking-wide mb-1">
            Launch Sequence
          </p>
          <h3 className="text-white font-semibold text-lg">
            Welcome aboard, {studentName}! 🌌
          </h3>
          <p className="text-gray-400 text-sm mt-1">
            Complete these steps to launch your first mission.
          </p>
        </div>
        <span className="text-4xl select-none">🛸</span>
      </div>

      <div className="space-y-3">
        {steps.map((step, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
              step.done
                ? 'bg-teal-800/30 border border-teal-700/30'
                : 'bg-gray-800/50 border border-gray-700/30'
            } ${step.action ? 'cursor-pointer hover:border-teal-600/50' : ''}`}
            onClick={step.action}
            role={step.action ? 'button' : undefined}
            tabIndex={step.action ? 0 : undefined}
            onKeyDown={step.action ? (e) => e.key === 'Enter' && step.action?.() : undefined}
          >
            <span className={`text-xl flex-shrink-0 ${step.done ? '' : 'grayscale opacity-40'}`}>
              {step.icon}
            </span>
            <p
              className={`text-sm font-medium flex-1 ${
                step.done ? 'text-teal-300 line-through opacity-70' : 'text-white'
              }`}
            >
              {step.label}
            </p>
            {!step.done && step.action && (
              <span className="text-teal-400 text-xs font-semibold flex-shrink-0">Start →</span>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={() => router.push('/marketplace')}
        className="w-full mt-5 py-3 bg-teal-500 hover:bg-teal-400 text-black font-semibold rounded-xl text-sm transition-colors"
      >
        {LABELS.STUDENT_BOOK_CLASS.primary}
      </button>
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

      // Rank-up ceremony: compare stored rank to current rank
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
  const isNewStudent = stats.totalSessions === 0;
  const firstName = student.fullName.split(' ')[0];

  // Greeting varies by time of day
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const statCards = [
    {
      icon: '📚',
      label: 'Total Sessions',
      value: stats.totalSessions,
      color: 'text-teal-400',
      bg: 'bg-teal-900/20 border-teal-800/30',
    },
    {
      icon: student.rankIcon,
      label: 'Space Rank',
      value: stats.spaceRank.replace(/_/g, ' '),
      color: 'text-violet-400',
      bg: 'bg-violet-900/20 border-violet-800/30',
    },
    {
      icon: stats.streakWeeks > 0 ? '🔥' : '❄️',
      label: LABELS.STUDENT_STREAK.primary,
      value: `${stats.streakWeeks}w`,
      color: stats.streakWeeks > 0 ? 'text-orange-400' : 'text-gray-400',
      bg:
        stats.streakWeeks > 0
          ? 'bg-orange-900/20 border-orange-800/30'
          : 'bg-gray-800/50 border-gray-700/30',
    },
    {
      icon: '✦',
      label: LABELS.STUDENT_GEMS.primary,
      value: stats.gemBalance,
      color: 'text-amber-400',
      bg: 'bg-amber-900/20 border-amber-800/30',
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
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {greeting}, {firstName}! 👋
          </h1>
          <p className="text-gray-400 text-sm mt-1">{LABELS.STUDENT_DASHBOARD.theme}</p>
        </div>
        {/* Streak badge — always visible in header if active */}
        {stats.streakWeeks > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded-lg">
            <span className="text-lg">🔥</span>
            <div>
              <p className="text-orange-400 text-sm font-bold leading-none">{stats.streakWeeks}w streak</p>
              {student.streakFreezes > 0 && (
                <p className="text-gray-500 text-xs">❄️ {student.streakFreezes} freeze{student.streakFreezes !== 1 ? 's' : ''} left</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Onboarding checklist — only for brand new students */}
      {isNewStudent ? (
        <OnboardingChecklist studentName={firstName} router={router} />
      ) : (
        /* Hero: Next class card */
        <NextClassCard booking={upcomingBooking} />
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((s) => (
          <div
            key={s.label}
            className={`border rounded-xl p-4 text-center ${s.bg}`}
          >
            <span className="text-2xl">{s.icon}</span>
            <p className={`text-xl font-bold mt-2 ${s.color}`}>{s.value}</p>
            <p className="text-gray-400 text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Pending review — shown prominently before sessions list */}
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
                      {date.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                      {' · '}
                      {session.durationMinutes} min
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${
                      session.hasReview
                        ? 'bg-green-500/20 text-green-400 border border-green-500/20'
                        : 'bg-gray-600/20 text-gray-400 border border-gray-600/20'
                    }`}
                  >
                    {session.hasReview ? '★ Reviewed' : 'No review'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick actions row — shown for returning students */}
      {!isNewStudent && (
        <div className="grid grid-cols-2 gap-3 pb-4">
          <button
            onClick={() => router.push('/marketplace')}
            className="flex items-center gap-3 p-4 bg-gray-800/50 border border-gray-700/50 rounded-xl hover:border-teal-700/50 hover:bg-teal-900/10 transition-colors text-left group"
          >
            <span className="text-2xl flex-shrink-0">🔭</span>
            <div>
              <p className="text-white font-medium text-sm group-hover:text-teal-300 transition-colors">
                Find a Teacher
              </p>
              <p className="text-gray-500 text-xs">Mission Selection</p>
            </div>
          </button>
          <button
            onClick={() => router.push('/student-dashboard/progress')}
            className="flex items-center gap-3 p-4 bg-gray-800/50 border border-gray-700/50 rounded-xl hover:border-violet-700/50 hover:bg-violet-900/10 transition-colors text-left group"
          >
            <span className="text-2xl flex-shrink-0">📊</span>
            <div>
              <p className="text-white font-medium text-sm group-hover:text-violet-300 transition-colors">
                View Progress
              </p>
              <p className="text-gray-500 text-xs">Flight Stats</p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
