// FILE PATH: client/app/teacher-earnings/page.tsx
// Fixed: dark mode using Tailwind v4 dark: classes (was hardcoded dark)
// Fixed: responsive layout
// Added: penalties tab integrated
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import TeacherNav from '../../components/TeacherNav';
import { useTheme } from '../../components/ThemeProvider';

interface EarningsItem {
  bookingId: string;
  studentName: string;
  date: string;
  durationMinutes: number;
  grossCents: number;
  teacherCents: number;
  platformCents: number;
  penalty?: number;
}

interface EarningsSummary {
  totalEarningsCents: number;
  teacherEarningsCents: number;
  completedClasses: number;
  avgPerClassCents: number;
  items: EarningsItem[];
}

interface Profile {
  user: { fullName: string; avatarUrl?: string | null };
  rankTier: number;
  strikes: number;
}

function TeacherEarningsContent() {
  const router = useRouter();
  const { isDark } = useTheme();

  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }

    (async () => {
      try {
        const [earningsRes, profileRes] = await Promise.all([
          axios.get(`${process.env.NEXT_PUBLIC_API_URL}/teachers/me/earnings`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${process.env.NEXT_PUBLIC_API_URL}/teachers/me/profile`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        setSummary(earningsRes.data);
        setProfile(profileRes.data);
      } catch (e: any) {
        const m = e.response?.data?.message;
        setError(Array.isArray(m) ? m.join(', ') : (m ?? 'Failed to load earnings'));
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const card = 'rounded-2xl border dark:bg-gray-900/40 dark:border-purple-900/30 bg-white border-purple-100 shadow-sm';

  if (loading) return (
    <div className="flex items-center justify-center h-screen dark:bg-[#0A0714] bg-[#FAF5FF]">
      <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const earned    = (summary?.teacherEarningsCents ?? 0) / 100;
  const avgClass  = (summary?.avgPerClassCents ?? 0) / 100;
  const completed = summary?.completedClasses ?? 0;
  const items     = summary?.items ?? [];

  // Projected monthly (naive: avg * 4 weeks)
  const weeklyAvg = completed > 0 ? earned / Math.max(1, Math.ceil(completed / 4)) : 0;

  return (
    <div className="min-h-screen dark:bg-[#0A0714] bg-[#FAF5FF] transition-colors">
      <TeacherNav
        teacherName={profile?.user?.fullName ?? 'Pilot'}
        avatarUrl={profile?.user?.avatarUrl ?? null}
        rankTier={profile?.rankTier ?? 0}
      />

      <div className="lg:pl-64 transition-all duration-300">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {/* Header */}
          <div className="flex items-start justify-between flex-wrap gap-3 mb-6 sm:mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold dark:text-purple-100 text-purple-900">Earnings</h1>
              <p className="text-sm dark:text-purple-400/60 text-purple-400">Reward Ledger ✦</p>
            </div>
            <button
              onClick={() => router.push('/teacher-conduct')}
              className="text-xs px-3 py-2 rounded-xl dark:bg-purple-900/30 bg-purple-100 dark:text-purple-300 text-purple-700 dark:hover:bg-purple-900/50 hover:bg-purple-200 transition-colors"
            >
              📋 View Penalty Rules
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-900/20 border border-red-700/30 text-red-400 text-sm">{error}</div>
          )}

          {/* ── Summary stats ────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
            {[
              { icon: '💰', label: 'Total Earned', value: `$${earned.toFixed(2)}`, sub: 'your 75% share', color: 'dark:text-green-400 text-green-600' },
              { icon: '📚', label: 'Total Classes', value: completed.toString(), sub: 'completed sessions', color: 'dark:text-purple-100 text-purple-900' },
              { icon: '📊', label: 'Avg per Class', value: `$${avgClass.toFixed(2)}`, sub: 'per completed class', color: 'dark:text-blue-400 text-blue-600' },
              { icon: '📅', label: 'Est. Monthly', value: `$${(weeklyAvg * 4).toFixed(0)}`, sub: 'based on history', color: 'dark:text-purple-100 text-purple-900' },
            ].map(s => (
              <div key={s.label} className={`${card} p-4`}>
                <span className="text-xl">{s.icon}</span>
                <p className="text-xs uppercase tracking-wide dark:text-purple-300/60 text-purple-400 mt-2">{s.label}</p>
                <p className={`text-2xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
                <p className="text-xs dark:text-purple-400/50 text-purple-400 mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* ── Strike impact ─────────────────────────────────────────────────── */}
          {(profile?.strikes ?? 0) > 0 && (
            <div className="mb-6 p-4 rounded-2xl bg-amber-900/20 border border-amber-700/30 flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">⚡</span>
              <div>
                <p className="font-semibold text-amber-300">{profile!.strikes} active strike{profile!.strikes > 1 ? 's' : ''}</p>
                <p className="text-sm text-amber-400/70 mt-0.5">
                  Strike penalties: ${(profile!.strikes * 5).toFixed(0)} deducted from next payout.
                  Reach 3 strikes and your account is suspended.{' '}
                  <button onClick={() => router.push('/teacher-conduct')} className="underline hover:text-amber-300">View guidelines →</button>
                </p>
              </div>
            </div>
          )}

          {/* ── Class history ──────────────────────────────────────────────────── */}
          <div className={`${card} overflow-hidden`}>
            <div className="px-4 sm:px-5 py-4 border-b dark:border-purple-900/20 border-purple-100 flex items-center justify-between">
              <div>
                <p className="font-semibold dark:text-purple-100 text-purple-900">Class History</p>
                <p className="text-xs dark:text-purple-400/60 text-purple-400">Showing {items.length} of {items.length} classes</p>
              </div>
            </div>

            {items.length === 0 ? (
              <div className="p-10 sm:p-16 text-center">
                <p className="text-4xl mb-3">💰</p>
                <p className="font-semibold dark:text-purple-100 text-purple-900">No completed classes yet</p>
                <p className="text-sm dark:text-purple-400/60 text-purple-400 mt-1">Earnings appear here after a class is completed.</p>
                <button
                  onClick={() => router.push('/calendar')}
                  className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-xl transition-colors"
                >
                  Add Availability →
                </button>
              </div>
            ) : (
              <>
                {/* Table header — desktop only */}
                <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3 border-b dark:border-purple-900/20 border-purple-100">
                  {['Student & Date', 'Duration', 'Gross', 'Your Share'].map(h => (
                    <p key={h} className="text-xs uppercase tracking-wide font-medium dark:text-purple-300/60 text-purple-400">{h}</p>
                  ))}
                </div>

                <div className="divide-y dark:divide-purple-900/20 divide-purple-100">
                  {items.map(item => (
                    <div key={item.bookingId} className="px-4 sm:px-5 py-3 sm:py-4 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-2 sm:gap-4 items-center dark:hover:bg-purple-900/10 hover:bg-purple-50/50 transition-colors">
                      <div>
                        <p className="text-sm font-medium dark:text-purple-100 text-purple-900">{item.studentName ?? 'Student'}</p>
                        <p className="text-xs dark:text-purple-400/60 text-purple-400">
                          {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      <p className="text-sm dark:text-purple-300/70 text-purple-600">{item.durationMinutes ?? 60} min</p>
                      <p className="text-sm dark:text-purple-300/70 text-purple-600">${((item.grossCents ?? 0) / 100).toFixed(2)}</p>
                      <p className="text-sm font-bold dark:text-green-400 text-green-600">${((item.teacherCents ?? 0) / 100).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TeacherEarningsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen dark:bg-[#0A0714] bg-[#FAF5FF]">
        <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <TeacherEarningsContent />
    </Suspense>
  );
}
