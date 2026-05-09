// FILE PATH: client/app/teacher-dashboard/insights/page.tsx
"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import TeacherLayout from "../../../components/TeacherLayout";

interface WeekBucket {
  week: string;
  avg: number;
  count: number;
}

interface TopWord {
  word: string;
  count: number;
}

interface TopQuote {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
}

interface BusiestDay {
  day: string;
  count: number;
}

interface Insights {
  insufficient?: boolean;
  message?: string;
  ratingTrend?: WeekBucket[];
  topWords?: TopWord[];
  topQuotes?: TopQuote[];
  completionRate?: number;
  busiestDay?: BusiestDay | null;
}

interface Profile {
  user: { fullName: string; avatarUrl?: string | null };
  rankTier: number;
}

const STAR_COLORS: Record<number, string> = {
  5: "text-yellow-400",
  4: "text-yellow-500",
  3: "text-orange-400",
  2: "text-red-400",
  1: "text-red-600",
};

function Stars({ rating }: { rating: number }) {
  return (
    <span className={`text-sm ${STAR_COLORS[rating] ?? "text-gray-400"}`}>
      {"★".repeat(rating)}{"☆".repeat(5 - rating)}
    </span>
  );
}

function RatingTrendChart({ weeks }: { weeks: WeekBucket[] }) {
  if (weeks.length === 0) return null;
  const maxAvg = 5;

  return (
    <div className="flex items-end gap-1.5 sm:gap-2 h-28 w-full">
      {weeks.map((w, i) => {
        const pct = (w.avg / maxAvg) * 100;
        const barColor =
          w.avg >= 4.5
            ? "bg-gradient-to-t from-green-700 to-green-400"
            : w.avg >= 3.5
              ? "bg-gradient-to-t from-yellow-700 to-yellow-400"
              : "bg-gradient-to-t from-red-700 to-red-400";
        return (
          <div
            key={i}
            className="flex-1 flex flex-col items-center gap-1 group"
          >
            <span className="text-[10px] text-[var(--t-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity">
              {w.avg.toFixed(1)}
            </span>
            <div
              className="w-full relative flex flex-col justify-end"
              style={{ height: "96px" }}
            >
              <div
                className={`w-full rounded-t ${barColor} transition-all duration-500`}
                style={{ height: `${Math.max(pct, 4)}%` }}
                title={`${w.week}: ${w.avg.toFixed(1)}★ (${w.count} review${w.count !== 1 ? "s" : ""})`}
              />
            </div>
            <span className="text-[9px] text-[var(--t-text-muted)] truncate w-full text-center">
              {w.week}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function WordCloud({ words }: { words: TopWord[] }) {
  if (words.length === 0) return null;
  const max = words[0]?.count ?? 1;

  return (
    <div className="flex flex-wrap gap-2">
      {words.map((w) => {
        const ratio = w.count / max;
        const size =
          ratio > 0.8
            ? "text-base font-bold"
            : ratio > 0.5
              ? "text-sm font-semibold"
              : "text-xs font-medium";
        const opacity =
          ratio > 0.8 ? "opacity-100" : ratio > 0.5 ? "opacity-80" : "opacity-60";
        return (
          <span
            key={w.word}
            className={`${size} ${opacity} text-purple-300 bg-purple-500/10 px-2.5 py-1 rounded-full`}
            title={`${w.count} mention${w.count !== 1 ? "s" : ""}`}
          >
            {w.word}
          </span>
        );
      })}
    </div>
  );
}

function TeacherInsightsContent() {
  const router = useRouter();

  const [insights, setInsights] = useState<Insights | null>(null);
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
        const [insightsRes, profileRes] = await Promise.all([
          api.get("/teachers/me/insights"),
          api.get("/teachers/me/profile"),
        ]);
        setInsights(insightsRes.data);
        setProfile(profileRes.data);
      } catch (e: any) {
        const m = e.response?.data?.message;
        setError(
          Array.isArray(m) ? m.join(", ") : (m ?? "Failed to load insights"),
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

  return (
    <TeacherLayout
      teacherName={profile?.user?.fullName ?? "Pilot"}
      avatarUrl={profile?.user?.avatarUrl ?? null}
      rankTier={profile?.rankTier ?? 0}
    >
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--t-text)]">
            Insights
          </h1>
          <p className="text-sm text-[var(--t-text-muted)]">
            Mission Analytics ✦
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-900/20 border border-red-700/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Insufficient data empty state */}
        {insights?.insufficient ? (
          <div className={`${card} p-10 sm:p-16 text-center`}>
            <p className="text-5xl mb-4">📊</p>
            <p className="text-lg font-semibold text-[var(--t-text)]">
              Not enough data yet
            </p>
            <p className="text-sm text-[var(--t-text-muted)] mt-2 max-w-sm mx-auto">
              {insights.message ??
                "Complete at least 5 reviewed classes to unlock your analytics dashboard."}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => router.push("/calendar")}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-xl transition-colors"
              >
                Add Availability →
              </button>
              <button
                onClick={() => router.push("/teacher-students")}
                className="px-5 py-2.5 bg-[var(--t-nav-active)] text-[var(--t-nav-active-text)] text-sm rounded-xl hover:bg-[var(--t-nav-hover)] transition-colors"
              >
                View Students →
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* ── Top stats row ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
              <div className={`${card} p-4`}>
                <span className="text-xl">✅</span>
                <p className="text-xs uppercase tracking-wide text-[var(--t-text-muted)] mt-2">
                  Completion Rate
                </p>
                <p className="text-2xl font-bold text-green-400 mt-0.5">
                  {(insights?.completionRate ?? 0).toFixed(0)}%
                </p>
                <p className="text-xs text-[var(--t-text-muted)] mt-0.5">
                  of booked classes completed
                </p>
              </div>

              <div className={`${card} p-4`}>
                <span className="text-xl">📅</span>
                <p className="text-xs uppercase tracking-wide text-[var(--t-text-muted)] mt-2">
                  Busiest Day
                </p>
                <p className="text-2xl font-bold text-purple-400 mt-0.5">
                  {insights?.busiestDay?.day ?? "—"}
                </p>
                <p className="text-xs text-[var(--t-text-muted)] mt-0.5">
                  {insights?.busiestDay
                    ? `${insights.busiestDay.count} class${insights.busiestDay.count !== 1 ? "es" : ""}`
                    : "no data"}
                </p>
              </div>

              <div className={`${card} p-4 col-span-2 sm:col-span-1`}>
                <span className="text-xl">⭐</span>
                <p className="text-xs uppercase tracking-wide text-[var(--t-text-muted)] mt-2">
                  Review Trend
                </p>
                <p className="text-2xl font-bold text-yellow-400 mt-0.5">
                  {insights?.ratingTrend && insights.ratingTrend.length > 0
                    ? `${insights.ratingTrend[insights.ratingTrend.length - 1]?.avg.toFixed(1)}★`
                    : "—"}
                </p>
                <p className="text-xs text-[var(--t-text-muted)] mt-0.5">
                  last week avg
                </p>
              </div>
            </div>

            {/* ── Rating trend chart ── */}
            {insights?.ratingTrend && insights.ratingTrend.length > 0 && (
              <div className={`${card} p-5 mb-6`}>
                <p className="font-semibold text-[var(--t-text)] mb-1">
                  Rating Trend
                </p>
                <p className="text-xs text-[var(--t-text-muted)] mb-4">
                  Weekly average over last 8 weeks
                </p>
                <RatingTrendChart weeks={insights.ratingTrend} />
              </div>
            )}

            {/* ── Word cloud + top quotes ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              {/* Word frequency */}
              <div className={`${card} p-5`}>
                <p className="font-semibold text-[var(--t-text)] mb-1">
                  Review Keywords
                </p>
                <p className="text-xs text-[var(--t-text-muted)] mb-4">
                  Most frequent words from student reviews
                </p>
                {insights?.topWords && insights.topWords.length > 0 ? (
                  <WordCloud words={insights.topWords} />
                ) : (
                  <p className="text-sm text-[var(--t-text-muted)]">
                    No review text yet.
                  </p>
                )}
              </div>

              {/* Top quotes */}
              <div className={`${card} p-5`}>
                <p className="font-semibold text-[var(--t-text)] mb-1">
                  Top Reviews
                </p>
                <p className="text-xs text-[var(--t-text-muted)] mb-4">
                  Highest-rated student feedback
                </p>
                {insights?.topQuotes && insights.topQuotes.length > 0 ? (
                  <div className="space-y-3">
                    {insights.topQuotes.map((q) => (
                      <div
                        key={q.id}
                        className="p-3 rounded-xl bg-[var(--t-nav-active)] border border-[var(--t-border)]"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <Stars rating={q.rating} />
                          <span className="text-xs text-[var(--t-text-muted)]">
                            {new Date(q.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-[var(--t-text)] italic leading-snug">
                          "{q.comment}"
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--t-text-muted)]">
                    No written reviews yet.
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </TeacherLayout>
  );
}

export default function TeacherInsightsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen bg-[var(--t-bg)]">
          <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <TeacherInsightsContent />
    </Suspense>
  );
}
