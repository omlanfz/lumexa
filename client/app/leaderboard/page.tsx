// FILE PATH: client/app/leaderboard/page.tsx
// This page was missing — caused 404 when clicking Leaderboard in teacher nav.
// Now it fetches from GET /teachers/leaderboard (backend endpoint exists).
"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import TeacherNav from "../../components/TeacherNav";
import { useTheme } from "../../components/ThemeProvider";

interface LeaderboardEntry {
  rank: number;
  teacherId: string;
  name: string;
  avatarUrl?: string | null;
  rankTier: number;
  rankName: string;
  rankIcon: string;
  points: number;
  weeklyPoints: number;
  completedClasses: number;
  ratingAvg: number;
}

interface MyProfile {
  user: { fullName: string; avatarUrl?: string | null };
  rankTier: number;
}

const RANK_COLORS = [
  "from-gray-400 to-gray-500",
  "from-blue-400 to-blue-500",
  "from-purple-500 to-purple-600",
  "from-amber-400 to-yellow-500",
  "from-orange-400 to-red-500",
  "from-pink-400 to-rose-500",
];

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

function LeaderboardContent() {
  const router = useRouter();
  const { isDark } = useTheme();

  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [myProfile, setMyProfile] = useState<MyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"all-time" | "weekly">("all-time");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    (async () => {
      try {
        const [lbRes, profileRes] = await Promise.all([
          axios.get(
            `${process.env.NEXT_PUBLIC_API_URL}/teachers/leaderboard?limit=20`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          ),
          axios
            .get(`${process.env.NEXT_PUBLIC_API_URL}/teachers/me/profile`, {
              headers: { Authorization: `Bearer ${token}` },
            })
            .catch(() => ({ data: null })),
        ]);
        setEntries(lbRes.data ?? []);
        setMyProfile(profileRes.data);
      } catch (e: any) {
        const m = e.response?.data?.message;
        setError(
          Array.isArray(m) ? m.join(", ") : (m ?? "Failed to load leaderboard"),
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const card =
    "rounded-2xl border dark:bg-gray-900/40 dark:border-purple-900/30 bg-white border-purple-100 shadow-sm";

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen dark:bg-[#0A0714] bg-[#FAF5FF]">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="dark:text-purple-400 text-purple-500 text-sm mt-4">
            Loading star rankings…
          </p>
        </div>
      </div>
    );

  const sorted =
    tab === "weekly"
      ? [...entries].sort((a, b) => b.weeklyPoints - a.weeklyPoints)
      : entries;

  const podium = sorted.slice(0, 3);
  const rest = sorted.slice(3);

  return (
    <div className="min-h-screen dark:bg-[#0A0714] bg-[#FAF5FF] transition-colors">
      <TeacherNav
        teacherName={myProfile?.user?.fullName ?? "Pilot"}
        avatarUrl={myProfile?.user?.avatarUrl ?? null}
        rankTier={myProfile?.rankTier ?? 0}
      />

      <div className="lg:pl-64 transition-all duration-300">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold dark:text-purple-100 text-purple-900">
              Leaderboard
            </h1>
            <p className="text-sm dark:text-purple-400/60 text-purple-400">
              Star Rankings · Top Pilots in the Galaxy
            </p>
          </div>

          {/* Tab switcher */}
          <div className={`${card} p-1.5 inline-flex rounded-xl mb-6`}>
            {(["all-time", "weekly"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                  tab === t
                    ? "bg-purple-600 text-white shadow-sm"
                    : "dark:text-purple-300/70 text-purple-500 dark:hover:text-purple-200 hover:text-purple-700"
                }`}
              >
                {t === "all-time" ? "🏆 All Time" : "⚡ This Week"}
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-900/20 border border-red-700/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Podium — top 3 */}
          {podium.length >= 3 && (
            <div className={`${card} p-6 mb-6`}>
              <p className="text-xs uppercase tracking-wide font-medium dark:text-purple-300/60 text-purple-400 mb-6 text-center">
                Top Pilots
              </p>
              <div className="flex items-end justify-center gap-4 sm:gap-8">
                {/* 2nd */}
                <div className="flex flex-col items-center gap-2">
                  {podium[1]?.avatarUrl ? (
                    <img
                      src={podium[1].avatarUrl}
                      className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-gray-400"
                      alt=""
                    />
                  ) : (
                    <div
                      className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br ${RANK_COLORS[podium[1]?.rankTier ?? 0]} flex items-center justify-center text-white font-bold text-xl`}
                    >
                      {podium[1]?.name?.charAt(0)?.toUpperCase() ?? "?"}
                    </div>
                  )}
                  <div className="text-center">
                    <p className="text-2xl">🥈</p>
                    <p className="text-sm font-bold dark:text-purple-100 text-purple-900 truncate max-w-[80px]">
                      {podium[1]?.name?.split(" ")[0]}
                    </p>
                    <p className="text-xs dark:text-purple-400/60 text-purple-400">
                      {(podium[1]?.points ?? 0).toLocaleString()} pts
                    </p>
                  </div>
                  <div className="h-16 sm:h-20 w-20 sm:w-24 dark:bg-gray-600/30 bg-gray-100 rounded-t-xl flex items-center justify-center dark:text-gray-400 text-gray-500 font-bold text-xl">
                    2
                  </div>
                </div>
                {/* 1st */}
                <div className="flex flex-col items-center gap-2 -mt-4">
                  {podium[0]?.avatarUrl ? (
                    <img
                      src={podium[0].avatarUrl}
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-4 border-yellow-400 shadow-lg shadow-yellow-400/30"
                      alt=""
                    />
                  ) : (
                    <div
                      className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br ${RANK_COLORS[podium[0]?.rankTier ?? 0]} flex items-center justify-center text-white font-bold text-2xl border-4 border-yellow-400 shadow-lg`}
                    >
                      {podium[0]?.name?.charAt(0)?.toUpperCase() ?? "?"}
                    </div>
                  )}
                  <div className="text-center">
                    <p className="text-3xl">🥇</p>
                    <p className="text-sm font-bold dark:text-purple-100 text-purple-900 truncate max-w-[80px]">
                      {podium[0]?.name?.split(" ")[0]}
                    </p>
                    <p className="text-xs dark:text-yellow-400 text-yellow-600 font-semibold">
                      {(podium[0]?.points ?? 0).toLocaleString()} pts
                    </p>
                  </div>
                  <div className="h-24 sm:h-28 w-20 sm:w-24 dark:bg-yellow-500/20 bg-yellow-50 border dark:border-yellow-500/30 border-yellow-200 rounded-t-xl flex items-center justify-center dark:text-yellow-400 text-yellow-600 font-bold text-xl">
                    1
                  </div>
                </div>
                {/* 3rd */}
                <div className="flex flex-col items-center gap-2">
                  {podium[2]?.avatarUrl ? (
                    <img
                      src={podium[2].avatarUrl}
                      className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-orange-400"
                      alt=""
                    />
                  ) : (
                    <div
                      className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br ${RANK_COLORS[podium[2]?.rankTier ?? 0]} flex items-center justify-center text-white font-bold text-xl`}
                    >
                      {podium[2]?.name?.charAt(0)?.toUpperCase() ?? "?"}
                    </div>
                  )}
                  <div className="text-center">
                    <p className="text-2xl">🥉</p>
                    <p className="text-sm font-bold dark:text-purple-100 text-purple-900 truncate max-w-[80px]">
                      {podium[2]?.name?.split(" ")[0]}
                    </p>
                    <p className="text-xs dark:text-purple-400/60 text-purple-400">
                      {(podium[2]?.points ?? 0).toLocaleString()} pts
                    </p>
                  </div>
                  <div className="h-12 sm:h-14 w-20 sm:w-24 dark:bg-orange-500/20 bg-orange-50 rounded-t-xl flex items-center justify-center dark:text-orange-400 text-orange-600 font-bold text-xl">
                    3
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Full rankings */}
          <div className={`${card} overflow-hidden`}>
            <div className="px-5 py-3 border-b dark:border-purple-900/20 border-purple-100">
              <p className="text-sm font-semibold dark:text-purple-100 text-purple-900">
                Full Rankings
              </p>
            </div>
            {sorted.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-3xl mb-2">🌌</p>
                <p className="dark:text-purple-400/60 text-purple-400 text-sm">
                  No pilots ranked yet
                </p>
              </div>
            ) : (
              <div className="divide-y dark:divide-purple-900/20 divide-purple-100">
                {sorted.map((entry, idx) => (
                  <div
                    key={entry.teacherId}
                    className={`px-4 sm:px-5 py-3 flex items-center gap-3 sm:gap-4 dark:hover:bg-purple-900/10 hover:bg-purple-50/50 transition-colors`}
                  >
                    {/* Rank */}
                    <div className="w-8 text-center flex-shrink-0">
                      {MEDAL[idx + 1] ? (
                        <span className="text-xl">{MEDAL[idx + 1]}</span>
                      ) : (
                        <span className="text-sm font-bold dark:text-purple-400/60 text-purple-400">
                          {idx + 1}
                        </span>
                      )}
                    </div>

                    {/* Avatar */}
                    {entry.avatarUrl ? (
                      <img
                        src={entry.avatarUrl}
                        className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                        alt=""
                      />
                    ) : (
                      <div
                        className={`w-9 h-9 rounded-full bg-gradient-to-br ${RANK_COLORS[entry.rankTier ?? 0]} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}
                      >
                        {entry.name?.charAt(0)?.toUpperCase() ?? "?"}
                      </div>
                    )}

                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold dark:text-purple-100 text-purple-900 truncate">
                        {entry.name}
                      </p>
                      <p className="text-xs dark:text-purple-400/50 text-purple-400">
                        {entry.rankIcon} {entry.rankName} ·{" "}
                        {entry.completedClasses} classes
                      </p>
                    </div>

                    {/* Rating */}
                    <div className="hidden sm:block text-right flex-shrink-0">
                      <p className="text-xs dark:text-yellow-400 text-yellow-600">
                        ⭐ {entry.ratingAvg ? entry.ratingAvg.toFixed(1) : "—"}
                      </p>
                    </div>

                    {/* Points */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold dark:text-purple-300 text-purple-600">
                        {tab === "weekly"
                          ? `+${(entry.weeklyPoints ?? 0).toLocaleString()}`
                          : (entry.points ?? 0).toLocaleString()}
                      </p>
                      <p className="text-xs dark:text-purple-400/50 text-purple-400">
                        pts
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen dark:bg-[#0A0714] bg-[#FAF5FF]">
          <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LeaderboardContent />
    </Suspense>
  );
}
