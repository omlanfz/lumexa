// FILE PATH: client/app/teacher-dashboard/page.tsx
"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import TeacherNav from "../../components/TeacherNav";
import { useTheme } from "../../components/ThemeProvider";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Stats {
  completedClasses: number;
  upcomingClasses: number;
  totalEarningsCents: number;
  teacherEarningsCents: number;
  ratingAvg: number;
  reviewCount: number;
  strikes: number;
  isSuspended: boolean;
}

interface NextClass {
  bookingId: string;
  start: string;
  end: string;
  studentName: string;
  studentAge: number;
  msUntilStart: number;
}

interface RankInfo {
  points: number;
  weeklyPoints: number;
  rankTier: number;
  rankName: string;
  rankIcon: string;
  pointsToNext: number;
  progressPercent: number;
}

interface Profile {
  id: string;
  user: { fullName: string; email: string; avatarUrl?: string | null };
  bio?: string | null;
  hourlyRate: number;
  ratingAvg: number;
  reviewCount: number;
  strikes: number;
  isSuspended: boolean;
  rankTier: number;
  subjects?: string[];
  grades?: string[];
}

// ─── Space-themed motivational messages (cycle daily by day of week) ─────────

const MISSION_BRIEFS = [
  "🚀 Ready for launch. Your cadets are counting on you, Pilot.",
  "🌌 The stars aligned perfectly for today's missions.",
  "⭐ Excellence leaves trails across the galaxy. Teach brilliantly.",
  "🛸 Your knowledge is the fuel that powers the next generation.",
  "🌠 Every lesson you teach is a light in someone's universe.",
  "🔭 The best pilots never stop learning. Keep exploring.",
  "🪐 Orbiting success — another great week ahead, Commander.",
];

const RANK_NAMES = [
  "Cadet",
  "Navigator",
  "Pilot",
  "Commander",
  "Admiral",
  "Starmaster",
];
const RANK_ICONS = ["🌱", "🧭", "✈️", "🎖️", "⭐", "🌟"];
const RANK_THRESHOLDS = [0, 1000, 5000, 15000, 40000, 100000];
const RANK_COLORS = [
  "from-gray-500 to-gray-600",
  "from-blue-500 to-blue-600",
  "from-purple-500 to-purple-600",
  "from-amber-500 to-yellow-600",
  "from-orange-500 to-red-500",
  "from-pink-500 to-rose-600",
];

// ─── Countdown Hook ───────────────────────────────────────────────────────────

function useCountdown(targetMs: number | null) {
  const [remaining, setRemaining] = useState<number>(targetMs ?? 0);

  useEffect(() => {
    if (targetMs === null) return;
    setRemaining(targetMs);
    const interval = setInterval(() => {
      setRemaining((prev) => Math.max(0, prev - 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [targetMs]);

  const total = remaining;
  const hours = Math.floor(total / 3600000);
  const minutes = Math.floor((total % 3600000) / 60000);
  const seconds = Math.floor((total % 60000) / 1000);
  return { hours, minutes, seconds, total };
}

// ─── Achievement Badges ───────────────────────────────────────────────────────

const ACHIEVEMENTS = [
  {
    id: "first_class",
    label: "First Launch",
    desc: "Completed your first class",
    icon: "🚀",
    threshold: 1,
  },
  {
    id: "ten_classes",
    label: "Orbit Achieved",
    desc: "10 classes completed",
    icon: "🌍",
    threshold: 10,
  },
  {
    id: "fifty_classes",
    label: "Deep Space",
    desc: "50 classes completed",
    icon: "🌌",
    threshold: 50,
  },
  {
    id: "hundred_classes",
    label: "Starmaster",
    desc: "100 classes completed",
    icon: "🌟",
    threshold: 100,
  },
  {
    id: "five_star",
    label: "Perfect Signal",
    desc: "Received a 5-star review",
    icon: "⭐",
    threshold: 1,
  },
  {
    id: "profile_complete",
    label: "Launch Ready",
    desc: "Profile fully completed",
    icon: "✅",
    threshold: 1,
  },
];

// ─── Main Component ───────────────────────────────────────────────────────────

function TeacherDashboardContent() {
  const router = useRouter();
  const { isDark } = useTheme();
  const [stats, setStats] = useState<Stats | null>(null);
  const [nextClass, setNextClass] = useState<NextClass | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [rankInfo, setRankInfo] = useState<RankInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { hours, minutes, seconds } = useCountdown(
    nextClass?.msUntilStart ?? null,
  );

  const briefIndex = new Date().getDay();
  const dailyBrief = MISSION_BRIEFS[briefIndex];

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const fetchAll = async () => {
      try {
        const [statsRes, nextRes, profileRes] = await Promise.all([
          axios.get(`${process.env.NEXT_PUBLIC_API_URL}/teachers/me/stats`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(
            `${process.env.NEXT_PUBLIC_API_URL}/teachers/me/next-class`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          ),
          axios.get(`${process.env.NEXT_PUBLIC_API_URL}/teachers/me/profile`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        setStats(statsRes.data);
        setNextClass(nextRes.data);
        setProfile(profileRes.data);

        // Compute rank info from profile
        const tier = profileRes.data.rankTier ?? 0;
        const pts = profileRes.data.points ?? 0;
        const nextThreshold = RANK_THRESHOLDS[tier + 1] ?? RANK_THRESHOLDS[5];
        const prevThreshold = RANK_THRESHOLDS[tier] ?? 0;
        const progressPercent =
          tier >= 5
            ? 100
            : Math.round(
                ((pts - prevThreshold) / (nextThreshold - prevThreshold)) * 100,
              );
        setRankInfo({
          points: pts,
          weeklyPoints: profileRes.data.weeklyPoints ?? 0,
          rankTier: tier,
          rankName: RANK_NAMES[tier],
          rankIcon: RANK_ICONS[tier],
          pointsToNext: Math.max(0, nextThreshold - pts),
          progressPercent: Math.min(100, Math.max(0, progressPercent)),
        });
      } catch (err: any) {
        const msg = err.response?.data?.message;
        setError(
          Array.isArray(msg)
            ? msg.join(", ")
            : (msg ?? "Failed to load dashboard"),
        );
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [router]);

  // Theme classes
  const bg = isDark ? "bg-[#0A0714]" : "bg-[#FAF5FF]";
  const cardBg = isDark
    ? "bg-gray-900/40 border border-purple-900/30"
    : "bg-white border border-purple-100 shadow-sm";
  const textPrimary = isDark ? "text-purple-100" : "text-purple-900";
  const textMuted = isDark ? "text-purple-300/60" : "text-purple-400";

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-screen ${bg}`}>
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-purple-400 text-sm mt-4">
            Preparing your flight deck...
          </p>
        </div>
      </div>
    );
  }

  const teacherEarningsDollars = (stats?.teacherEarningsCents ?? 0) / 100;
  const isProfileIncomplete = !profile?.bio || !profile?.subjects?.length;
  const completedClasses = stats?.completedClasses ?? 0;

  // Earned achievements
  const earnedAchievements = ACHIEVEMENTS.filter((a) => {
    if (a.id === "first_class") return completedClasses >= 1;
    if (a.id === "ten_classes") return completedClasses >= 10;
    if (a.id === "fifty_classes") return completedClasses >= 50;
    if (a.id === "hundred_classes") return completedClasses >= 100;
    if (a.id === "five_star") return (stats?.ratingAvg ?? 0) >= 4.8;
    if (a.id === "profile_complete") return !isProfileIncomplete;
    return false;
  });

  return (
    <div className={`min-h-screen ${bg} transition-colors duration-300`}>
      <TeacherNav
        teacherName={profile?.user?.fullName ?? "Pilot"}
        avatarUrl={profile?.user?.avatarUrl ?? null}
        rankTier={profile?.rankTier ?? 0}
        onAvatarUpdate={(url) =>
          setProfile((p) =>
            p ? { ...p, user: { ...p.user, avatarUrl: url } } : p,
          )
        }
      />

      <div className="pl-64">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* Suspension warning */}
          {profile?.isSuspended && (
            <div className="mb-6 p-4 bg-red-900/30 border border-red-600/40 rounded-xl flex items-start gap-3">
              <span className="text-2xl">🚫</span>
              <div>
                <p className="text-red-300 font-semibold">Mission Suspended</p>
                <p className="text-red-400/70 text-sm">
                  Your account is suspended. Contact mission support for
                  reinstatement.
                </p>
              </div>
            </div>
          )}

          {/* Profile incomplete nudge */}
          {isProfileIncomplete && (
            <div
              className={`mb-6 p-4 rounded-xl border flex items-start gap-3 ${
                isDark
                  ? "bg-amber-900/20 border-amber-700/30"
                  : "bg-amber-50 border-amber-200"
              }`}
            >
              <span className="text-2xl">🛸</span>
              <div className="flex-1">
                <p
                  className={`font-semibold text-sm ${isDark ? "text-amber-300" : "text-amber-800"}`}
                >
                  Complete your pilot profile to attract more cadets
                </p>
                <p
                  className={`text-xs mt-0.5 ${isDark ? "text-amber-400/70" : "text-amber-600"}`}
                >
                  Add your bio, subjects, and availability to appear in more
                  search results.
                </p>
              </div>
              <button
                onClick={() => router.push("/teacher-profile")}
                className={`text-sm px-3 py-1.5 rounded-lg font-medium flex-shrink-0 ${
                  isDark
                    ? "bg-amber-600 hover:bg-amber-500 text-white"
                    : "bg-amber-500 hover:bg-amber-400 text-white"
                }`}
              >
                Complete Profile
              </button>
            </div>
          )}

          {/* Daily Mission Brief */}
          <div
            className={`mb-6 px-5 py-4 rounded-2xl border relative overflow-hidden ${
              isDark
                ? "bg-purple-900/20 border-purple-700/30"
                : "bg-purple-50 border-purple-200"
            }`}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <p
              className={`text-sm font-medium ${isDark ? "text-purple-200" : "text-purple-700"}`}
            >
              Daily Mission Brief
            </p>
            <p
              className={`text-lg font-bold mt-1 ${isDark ? "text-white" : "text-purple-900"}`}
            >
              {dailyBrief}
            </p>
          </div>

          {/* Rank Card + Stats Row */}
          <div className="grid grid-cols-5 gap-4 mb-6">
            {/* Rank card — takes 2 columns */}
            <div className={`col-span-2 ${cardBg} rounded-2xl p-5`}>
              <div className="flex items-start gap-4">
                <div
                  className={`w-14 h-14 rounded-xl bg-gradient-to-br ${RANK_COLORS[rankInfo?.rankTier ?? 0]} flex items-center justify-center text-2xl flex-shrink-0`}
                >
                  {rankInfo?.rankIcon}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-xs uppercase tracking-wide font-medium ${textMuted}`}
                  >
                    Space Rank
                  </p>
                  <p
                    className={`text-xl font-bold leading-tight mt-0.5 ${textPrimary}`}
                  >
                    {rankInfo?.rankName ?? "Cadet"}
                  </p>
                  <p
                    className={`text-sm ${isDark ? "text-purple-300" : "text-purple-600"}`}
                  >
                    {rankInfo?.points.toLocaleString() ?? 0} pts
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-xs mb-1">
                  <span className={textMuted}>Progress to next rank</span>
                  <span className={textMuted}>
                    {rankInfo?.progressPercent ?? 0}%
                  </span>
                </div>
                <div
                  className={`h-2 rounded-full ${isDark ? "bg-gray-800" : "bg-purple-100"}`}
                >
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${RANK_COLORS[rankInfo?.rankTier ?? 0]} transition-all duration-700`}
                    style={{ width: `${rankInfo?.progressPercent ?? 0}%` }}
                  />
                </div>
                <p className={`text-xs mt-1 ${textMuted}`}>
                  {rankInfo?.pointsToNext.toLocaleString() ?? "—"} pts to{" "}
                  {RANK_NAMES[(rankInfo?.rankTier ?? 0) + 1] ?? "max"}
                </p>
              </div>
              <div
                className={`mt-3 pt-3 border-t ${isDark ? "border-purple-900/20" : "border-purple-100"} flex justify-between`}
              >
                <div>
                  <p className={`text-xs ${textMuted}`}>This week</p>
                  <p
                    className={`text-sm font-bold ${isDark ? "text-purple-300" : "text-purple-600"}`}
                  >
                    +{rankInfo?.weeklyPoints ?? 0} pts
                  </p>
                </div>
                <button
                  onClick={() => router.push("/leaderboard")}
                  className={`text-xs px-3 py-1.5 rounded-lg ${
                    isDark
                      ? "bg-purple-900/30 text-purple-300 hover:bg-purple-800/40"
                      : "bg-purple-100 text-purple-600 hover:bg-purple-200"
                  }`}
                >
                  View Rankings
                </button>
              </div>
            </div>

            {/* Stats — 3 columns */}
            <div
              className={`${cardBg} rounded-2xl p-4 flex flex-col justify-between`}
            >
              <div>
                <span className="text-2xl">📚</span>
                <p
                  className={`text-xs uppercase tracking-wide mt-2 ${textMuted}`}
                >
                  Classes Taught
                </p>
                <p className={`text-3xl font-bold mt-1 ${textPrimary}`}>
                  {completedClasses}
                </p>
              </div>
              <p className={`text-xs ${textMuted}`}>
                {stats?.upcomingClasses ?? 0} upcoming
              </p>
            </div>

            <div
              className={`${cardBg} rounded-2xl p-4 flex flex-col justify-between`}
            >
              <div>
                <span className="text-2xl">⭐</span>
                <p
                  className={`text-xs uppercase tracking-wide mt-2 ${textMuted}`}
                >
                  Rating
                </p>
                <p className={`text-3xl font-bold mt-1 ${textPrimary}`}>
                  {stats?.ratingAvg ? stats.ratingAvg.toFixed(1) : "—"}
                </p>
              </div>
              <p className={`text-xs ${textMuted}`}>
                {stats?.reviewCount ?? 0} reviews
                {(stats?.strikes ?? 0) > 0 && (
                  <span className="text-red-400 ml-2">
                    ⚡ {stats!.strikes} strike{stats!.strikes > 1 ? "s" : ""}
                  </span>
                )}
              </p>
            </div>

            <div
              className={`${cardBg} rounded-2xl p-4 flex flex-col justify-between`}
            >
              <div>
                <span className="text-2xl">💰</span>
                <p
                  className={`text-xs uppercase tracking-wide mt-2 ${textMuted}`}
                >
                  Earnings
                </p>
                <p
                  className={`text-3xl font-bold mt-1 ${isDark ? "text-green-400" : "text-green-600"}`}
                >
                  ${teacherEarningsDollars.toFixed(0)}
                </p>
              </div>
              <button
                onClick={() => router.push("/teacher-earnings")}
                className={`text-xs ${isDark ? "text-purple-400 hover:text-purple-300" : "text-purple-600 hover:text-purple-500"}`}
              >
                View details →
              </button>
            </div>
          </div>

          {/* Next Class + Achievements row */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {/* Next Class — 2 cols */}
            <div className="col-span-2">
              {nextClass ? (
                <div
                  className={`${cardBg} rounded-2xl p-5 relative overflow-hidden`}
                >
                  {/* Animated pulse for soon classes */}
                  {nextClass.msUntilStart < 600000 && (
                    <div className="absolute top-4 right-4">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
                      </span>
                    </div>
                  )}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p
                        className={`text-xs uppercase tracking-wide font-medium ${textMuted}`}
                      >
                        Upcoming Mission
                      </p>
                      <p className={`text-lg font-bold mt-0.5 ${textPrimary}`}>
                        Class with {nextClass.studentName}
                      </p>
                      <p className={`text-sm ${textMuted}`}>
                        {new Date(nextClass.start).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        ·{" "}
                        {new Date(nextClass.start).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}{" "}
                        –{" "}
                        {new Date(nextClass.end).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-700 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                      {nextClass.studentName.charAt(0).toUpperCase()}
                    </div>
                  </div>

                  {/* Countdown */}
                  <div className="flex items-center gap-4">
                    <p className={`text-xs ${textMuted} mr-2`}>Starts in:</p>
                    {[
                      { val: hours, label: "HRS" },
                      { val: minutes, label: "MIN" },
                      { val: seconds, label: "SEC" },
                    ].map(({ val, label }) => (
                      <div
                        key={label}
                        className={`text-center px-3 py-2 rounded-xl ${isDark ? "bg-purple-900/30" : "bg-purple-100"}`}
                      >
                        <p
                          className={`text-2xl font-bold tabular-nums ${textPrimary}`}
                        >
                          {String(val).padStart(2, "0")}
                        </p>
                        <p className={`text-xs ${textMuted}`}>{label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Warning & Join */}
                  <div
                    className={`mt-4 pt-4 border-t ${isDark ? "border-purple-900/20" : "border-purple-100"} flex items-center justify-between`}
                  >
                    <p
                      className={`text-xs ${isDark ? "text-amber-400/70" : "text-amber-600"}`}
                    >
                      ⚠️ Join on time to avoid a strike.
                    </p>
                    {nextClass.msUntilStart <= 600000 && (
                      <button
                        onClick={() =>
                          router.push(`/classroom/${nextClass.bookingId}`)
                        }
                        className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-xl transition-colors"
                      >
                        Enter Star Lab →
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  className={`${cardBg} rounded-2xl p-5 flex flex-col items-center justify-center text-center min-h-[200px]`}
                >
                  <span className="text-4xl mb-3">🌌</span>
                  <p className={`font-semibold ${textPrimary}`}>
                    No upcoming missions
                  </p>
                  <p className={`text-sm mt-1 ${textMuted}`}>
                    Add availability slots so cadets can book you.
                  </p>
                  <button
                    onClick={() => router.push("/calendar")}
                    className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-xl transition-colors"
                  >
                    Log Flight Availability
                  </button>
                </div>
              )}
            </div>

            {/* Achievements — 1 col */}
            <div className={`${cardBg} rounded-2xl p-5`}>
              <p
                className={`text-xs uppercase tracking-wide font-medium mb-3 ${textMuted}`}
              >
                Mission Badges
              </p>
              <div className="grid grid-cols-3 gap-2">
                {ACHIEVEMENTS.map((a) => {
                  const earned = earnedAchievements.some(
                    (ea) => ea.id === a.id,
                  );
                  return (
                    <div
                      key={a.id}
                      title={`${a.label}: ${a.desc}`}
                      className={`aspect-square rounded-xl flex items-center justify-center text-xl transition-all ${
                        earned
                          ? isDark
                            ? "bg-purple-600/30 border border-purple-500/40"
                            : "bg-purple-100 border border-purple-300"
                          : isDark
                            ? "bg-gray-800/40 border border-gray-700/30 opacity-30 grayscale"
                            : "bg-gray-100 border border-gray-200 opacity-40 grayscale"
                      }`}
                    >
                      {a.icon}
                    </div>
                  );
                })}
              </div>
              <p className={`text-xs mt-3 ${textMuted}`}>
                {earnedAchievements.length}/{ACHIEVEMENTS.length} earned
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            {[
              {
                label: "Add Availability",
                sub: "Log Flight Slot",
                icon: "📅",
                path: "/calendar",
              },
              {
                label: "View Students",
                sub: "Cadet Roster",
                icon: "👥",
                path: "/teacher-students",
              },
              {
                label: "View Earnings",
                sub: "Reward Ledger",
                icon: "💰",
                path: "/teacher-earnings",
              },
              {
                label: "Edit Profile",
                sub: "Pilot Config",
                icon: "⚙️",
                path: "/teacher-profile",
              },
            ].map((item) => (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className={`${cardBg} rounded-xl p-4 text-left hover:border-purple-500/40 transition-all`}
              >
                <span className="text-2xl">{item.icon}</span>
                <p className={`text-sm font-medium mt-2 ${textPrimary}`}>
                  {item.label}
                </p>
                <p className={`text-xs ${textMuted}`}>{item.sub}</p>
              </button>
            ))}
          </div>

          {/* Profile summary row */}
          <div className={`${cardBg} rounded-2xl p-5`}>
            <div className="flex items-center justify-between mb-3">
              <p className={`font-semibold ${textPrimary}`}>
                Your Pilot Profile
              </p>
              <button
                onClick={() => router.push("/teacher-profile")}
                className={`text-xs px-3 py-1.5 rounded-lg ${
                  isDark
                    ? "bg-purple-900/30 text-purple-300 hover:bg-purple-800/40"
                    : "bg-purple-100 text-purple-600 hover:bg-purple-200"
                }`}
              >
                Edit
              </button>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <p className={`text-xs ${textMuted}`}>Rate per hour</p>
                <p className={`text-lg font-bold ${textPrimary}`}>
                  ${profile?.hourlyRate ?? 25}
                </p>
              </div>
              <div>
                <p className={`text-xs ${textMuted}`}>Subjects</p>
                <p className={`text-sm font-medium ${textPrimary}`}>
                  {profile?.subjects?.length
                    ? profile.subjects.join(", ")
                    : "Not set"}
                </p>
              </div>
              <div>
                <p className={`text-xs ${textMuted}`}>Grades</p>
                <p className={`text-sm font-medium ${textPrimary}`}>
                  {profile?.grades?.length
                    ? profile.grades.join(", ")
                    : "Not set"}
                </p>
              </div>
              <div>
                <p className={`text-xs ${textMuted}`}>Bio</p>
                <p className={`text-sm ${textPrimary} truncate`}>
                  {profile?.bio ?? "No bio yet"}
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-900/30 border border-red-700/40 rounded-xl text-red-300 text-sm">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TeacherDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen bg-[#0A0714]">
          <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <TeacherDashboardContent />
    </Suspense>
  );
}
