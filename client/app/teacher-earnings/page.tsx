// FILE PATH: client/app/teacher-earnings/page.tsx
"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import TeacherLayout from "../../components/TeacherLayout";
import { useTheme } from "../../components/ThemeProvider";
// ─── LUMI CHATBOT ──────────────────────────────────────────────────────────────
import LumiChat from "../../components/LumiChat";
// ──────────────────────────────────────────────────────────────────────────────

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
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

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
        setError(
          Array.isArray(m) ? m.join(", ") : (m ?? "Failed to load earnings"),
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const card = "t-card shadow-sm";

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--t-bg)]">
        <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  const earned = (summary?.teacherEarningsCents ?? 0) / 100;
  const avgClass = (summary?.avgPerClassCents ?? 0) / 100;
  const completed = summary?.completedClasses ?? 0;
  const items = summary?.items ?? [];

  const weeklyAvg =
    completed > 0 ? earned / Math.max(1, Math.ceil(completed / 4)) : 0;

  return (
    <TeacherLayout
      teacherName={profile?.user?.fullName ?? "Pilot"}
      avatarUrl={profile?.user?.avatarUrl ?? null}
      rankTier={profile?.rankTier ?? 0}
    >
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--t-text)]">
              Earnings
            </h1>
            <p className="text-sm text-[var(--t-text-muted)]">
              Reward Ledger ✦
            </p>
          </div>
          <button
            onClick={() => router.push("/teacher-conduct")}
            className="text-xs px-3 py-2 rounded-xl bg-[var(--t-nav-active)] text-[var(--t-nav-active-text)] hover:bg-[var(--t-nav-hover)] transition-colors"
          >
            📋 View Penalty Rules
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-900/20 border border-red-700/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* ── Summary stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {[
            {
              icon: "💰",
              label: "Total Earned",
              value: `$${earned.toFixed(2)}`,
              sub: "your 75% share",
              color: "text-green-600 dark:text-green-400",
            },
            {
              icon: "📚",
              label: "Total Classes",
              value: completed.toString(),
              sub: "completed sessions",
              color: "text-[var(--t-text)]",
            },
            {
              icon: "📊",
              label: "Avg per Class",
              value: `$${avgClass.toFixed(2)}`,
              sub: "per completed class",
              color: "text-blue-600 dark:text-blue-400",
            },
            {
              icon: "📅",
              label: "Est. Monthly",
              value: `$${(weeklyAvg * 4).toFixed(0)}`,
              sub: "based on history",
              color: "text-[var(--t-text)]",
            },
          ].map((s) => (
            <div key={s.label} className={`${card} p-4`}>
              <span className="text-xl">{s.icon}</span>
              <p className="text-xs uppercase tracking-wide text-[var(--t-text-muted)] mt-2">
                {s.label}
              </p>
              <p className={`text-2xl font-bold mt-0.5 ${s.color}`}>
                {s.value}
              </p>
              <p className="text-xs text-[var(--t-text-muted)] mt-0.5">
                {s.sub}
              </p>
            </div>
          ))}
        </div>

        {/* ── Strike impact ── */}
        {(profile?.strikes ?? 0) > 0 && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-900/20 border border-amber-700/30 flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">⚡</span>
            <div>
              <p className="font-semibold text-amber-300">
                {profile!.strikes} active strike
                {profile!.strikes > 1 ? "s" : ""}
              </p>
              <p className="text-sm text-amber-400/70 mt-0.5">
                Strike penalties: ${(profile!.strikes * 5).toFixed(0)} deducted
                from next payout. Reach 3 strikes and your account is suspended.{" "}
                <button
                  onClick={() => router.push("/teacher-conduct")}
                  className="underline hover:text-amber-300"
                >
                  View guidelines →
                </button>
              </p>
            </div>
          </div>
        )}

        {/* ── Class history ── */}
        <div className={`${card} overflow-hidden`}>
          <div className="px-4 sm:px-5 py-4 border-b border-[var(--t-nav-border)] flex items-center justify-between">
            <div>
              <p className="font-semibold text-[var(--t-text)]">
                Class History
              </p>
              <p className="text-xs text-[var(--t-text-muted)]">
                Showing {items.length} of {items.length} classes
              </p>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="p-10 sm:p-16 text-center">
              <p className="text-4xl mb-3">💰</p>
              <p className="font-semibold text-[var(--t-text)]">
                No completed classes yet
              </p>
              <p className="text-sm text-[var(--t-text-muted)] mt-1">
                Earnings appear here after a class is completed.
              </p>
              <button
                onClick={() => router.push("/calendar")}
                className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-xl transition-colors"
              >
                Add Availability →
              </button>
            </div>
          ) : (
            <>
              {/* Table header — desktop only */}
              <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3 border-b border-[var(--t-nav-border)]">
                {["Student & Date", "Duration", "Gross", "Your Share"].map(
                  (h) => (
                    <p
                      key={h}
                      className="text-xs uppercase tracking-wide font-medium text-[var(--t-text-muted)]"
                    >
                      {h}
                    </p>
                  ),
                )}
              </div>

              <div className="divide-y divide-[var(--t-nav-border)]">
                {items.map((item) => (
                  <div
                    key={item.bookingId}
                    className="px-4 sm:px-5 py-3 sm:py-4 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-2 sm:gap-4 items-center hover:bg-[var(--t-nav-hover)] transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-[var(--t-text)]">
                        {item.studentName ?? "Student"}
                      </p>
                      <p className="text-xs text-[var(--t-text-muted)]">
                        {new Date(item.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <p className="text-sm text-[var(--t-text-muted)]">
                      {item.durationMinutes ?? 60} min
                    </p>
                    <p className="text-sm text-[var(--t-text-muted)]">
                      ${((item.grossCents ?? 0) / 100).toFixed(2)}
                    </p>
                    <p className="text-sm font-bold text-green-600 dark:text-green-400">
                      ${((item.teacherCents ?? 0) / 100).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ─── LUMI CHATBOT ───────────────────────────────────────────────────────
          Fixed bottom-right. variant="teacher" → purple theme, Pilot persona.
          Lumi can help teachers understand their earnings breakdown, what the
          75/25 split means, how strikes affect payouts, or how to grow their
          class count.
      ─────────────────────────────────────────────────────────────────────── */}
      <LumiChat
        variant="teacher"
        context={`Teacher earnings page — $${earned.toFixed(2)} total earned across ${completed} completed classes`}
      />
      {/* ──────────────────────────────────────────────────────────────────── */}
    </TeacherLayout>
  );
}

export default function TeacherEarningsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen bg-[var(--t-bg)]">
          <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <TeacherEarningsContent />
    </Suspense>
  );
}
