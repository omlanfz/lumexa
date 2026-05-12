'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/axios';
import { getStoredRole, getStoredToken } from '@/lib/storage';
import RankProgressBar from '@/components/student/RankProgressBar';
import StreakCounter from '@/components/student/StreakCounter';
import BadgeGrid from '@/components/student/BadgeGrid';
import GemWalletWidget from '@/components/student/GemWalletWidget';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SubjectCount {
  subject: string;
  count: number;
}

interface RankTier {
  rank: string;
  icon: string;
  minSessions: number;
  unlocked: boolean;
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
  streakFreezes: number;
  sessionsToNextRank: number | null;
  subjects: string[];
  subjectBreakdown: SubjectCount[];
  rankHistory: RankTier[];
  badges: Badge[];
  memberSince: string;
  gemBalance: number;
  hasBillingContact: boolean;
}

interface GemTransaction {
  id: string;
  gems: number;
  amountCents: number;
  currency: string;
  paymentMethod: string;
  status: string;
  createdAt: string;
}

interface WalletData {
  balance: number;
  purchases: GemTransaction[];
}

function Skeleton({ className }: { className: string }) {
  return <div className={`bg-gray-800 animate-pulse rounded-lg ${className}`} />;
}

function ProgressSkeleton() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 pt-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-32 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StudentProgressPage() {
  const router = useRouter();
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = getStoredToken();
    if (!token) { router.push('/login'); return; }
    const role = getStoredRole();
    if (role !== 'STUDENT') { router.push('/login'); return; }

    fetchAll();
  }, [router]);

  const fetchAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [progressRes, walletRes] = await Promise.all([
        api.get<ProgressData>('/students/me/progress'),
        api.get<WalletData>('/gems/wallet'),
      ]);
      setProgress(progressRes.data);
      setWallet(walletRes.data);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string | string[] } } };
      const msg = e.response?.data?.message;
      setError(
        Array.isArray(msg) ? msg.join(', ') : (msg ?? 'Failed to load progress.'),
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <ProgressSkeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <p className="text-5xl">🚫</p>
        <p className="text-red-400 text-sm max-w-sm text-center">{error}</p>
        <button onClick={fetchAll} className="text-teal-400 underline text-sm">
          Try again
        </button>
      </div>
    );
  }

  if (!progress) return null;

  const statCards = [
    {
      icon: '📚',
      label: 'Total Sessions',
      value: progress.totalSessions,
      color: 'text-teal-400',
    },
    {
      icon: '⏱️',
      label: 'Total Hours',
      value: `${progress.totalHours}h`,
      color: 'text-blue-400',
    },
  ];

  const memberDate = new Date(progress.memberSince).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6 pt-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Progress</h1>
        <p className="text-gray-400 text-sm mt-1">Mission Report · Member since {memberDate}</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3">
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

      {/* Rank progress */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
        <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-4">
          Rank Journey
        </p>
        <RankProgressBar
          currentRank={progress.spaceRank}
          totalSessions={progress.totalSessions}
          variant="full"
        />
      </div>

      {/* Streak */}
      <StreakCounter
        streakWeeks={progress.streakWeeks}
        streakFreezes={progress.streakFreezes}
        variant="full"
      />

      {/* Badges */}
      <BadgeGrid badges={progress.badges} />

      {/* Subject breakdown */}
      {progress.subjectBreakdown.length > 0 && (
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-4">
            Sessions by Subject
          </p>
          <div className="space-y-3">
            {progress.subjectBreakdown.map(({ subject, count }) => {
              const max = progress.subjectBreakdown[0].count;
              const pct = Math.round((count / max) * 100);
              return (
                <div key={subject}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-300">{subject}</span>
                    <span className="text-gray-500">{count} session{count !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-1.5">
                    <div
                      className="bg-teal-400 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Gem wallet with transactions */}
      <GemWalletWidget
        balance={progress.gemBalance}
        hasBillingContact={progress.hasBillingContact}
        transactions={wallet?.purchases}
      />
    </div>
  );
}
