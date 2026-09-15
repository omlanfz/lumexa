// FILE PATH: client/app/leaderboard/page.tsx
//
// Self-focused: the teacher's own rank, progress to the next tier, and
// achievements lead the page. Competitive full-rankings are a compact,
// secondary "nearby" list further down — not the main framing.

"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import TeacherLayout from "../../components/TeacherLayout";
import LumiChat from "../../components/LumiChat";

interface RankInfo {
  points: number;
  weeklyPoints: number;
  rankTier: number;
  rankName: string;
  rankIcon: string;
  pointsToNext: number;
  progressPercent: number;
}

interface Stats {
  completedClasses: number;
  ratingAvg: number;
}

interface Profile {
  user: { fullName: string; avatarUrl?: string | null };
  bio?: string | null;
  subjects?: string[];
}

interface BadgeTier {
  id: string;
  icon: string;
  label: string;
  desc: string;
  minPts: number;
}

interface LeaderboardTeacher {
  rank: number;
  teacherId: string;
  name: string;
  avatarUrl?: string | null;
  points: number;
}

const ACHIEVEMENTS = [
  { id: "first_class", label: "First Class", desc: "First class completed", icon: "🚀", threshold: 1 },
  { id: "ten_classes", label: "Ten Classes", desc: "10 classes completed", icon: "🔟", threshold: 10 },
  { id: "fifty_classes", label: "Fifty Classes", desc: "50 classes completed", icon: "🏅", threshold: 50 },
  { id: "hundred_classes", label: "Century", desc: "100 classes completed", icon: "🏆", threshold: 100 },
  { id: "five_star", label: "Five-Star Rated", desc: "Received a 5-star review", icon: "⭐", threshold: 1 },
  { id: "profile_complete", label: "Profile Complete", desc: "Profile fully completed", icon: "✅", threshold: 1 },
];

function LeaderboardContent() {
  const router = useRouter();
  const [rankInfo, setRankInfo] = useState<RankInfo | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [teachers, setTeachers] = useState<LeaderboardTeacher[]>([]);
  const [tiers, setTiers] = useState<BadgeTier[]>([]);
  const [myTeacherId, setMyTeacherId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tok = localStorage.getItem("token");
    if (!tok) {
      router.push("/login");
      return;
    }
    (async () => {
      try {
        const [rankRes, statsRes, profileRes, lbRes] = await Promise.all([
          api.get("/teachers/me/rank"),
          api.get("/teachers/me/stats"),
          api.get("/teachers/me/profile"),
          api.get("/teachers/leaderboard?filter=all&limit=50"),
        ]);
        setRankInfo(rankRes.data);
        setStats(statsRes.data);
        setProfile(profileRes.data);
        setTeachers(lbRes.data.teachers ?? []);
        setTiers(lbRes.data.tiers ?? []);
        setMyTeacherId(profileRes.data.id);
      } catch {
        /* silently fail */
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const card = "t-card t-card-hover shadow-sm";

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--t-bg)]">
        <div className="w-10 h-10 border-2 border-[var(--t-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );

  const isProfileComplete = !!(profile?.bio && profile.bio.length > 20 && profile.subjects?.length);
  const completedClasses = stats?.completedClasses ?? 0;
  const earnedAchievements = ACHIEVEMENTS.filter((a) => {
    if (a.id === "first_class") return completedClasses >= 1;
    if (a.id === "ten_classes") return completedClasses >= 10;
    if (a.id === "fifty_classes") return completedClasses >= 50;
    if (a.id === "hundred_classes") return completedClasses >= 100;
    if (a.id === "five_star") return (stats?.ratingAvg ?? 0) >= 4.8;
    if (a.id === "profile_complete") return isProfileComplete;
    return false;
  });

  const myIndex = teachers.findIndex((t) => t.teacherId === myTeacherId);
  const nearby =
    myIndex === -1
      ? teachers.slice(0, 5)
      : teachers.slice(Math.max(0, myIndex - 2), myIndex + 3);

  return (
    <TeacherLayout
      teacherName={profile?.user?.fullName ?? "Teacher"}
      avatarUrl={profile?.user?.avatarUrl ?? null}
    >
      <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-[var(--t-text)]">Leaderboard</h1>

        {/* ── Your rank ─────────────────────────────────────────────── */}
        <div className={`${card} p-6`}>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7B61FF] to-[#5B3FCF] flex items-center justify-center text-3xl flex-shrink-0">
              {rankInfo?.rankIcon ?? "🌱"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs uppercase tracking-wide font-medium text-[var(--t-text-muted)]">
                Your Rank
              </p>
              <p className="text-xl font-bold text-[var(--t-text)]">
                {rankInfo?.rankName ?? "Cadet"}
              </p>
              <p className="text-sm text-[var(--t-text-muted)]">
                {(rankInfo?.points ?? 0).toLocaleString()} pts · +{rankInfo?.weeklyPoints ?? 0} this week
              </p>
            </div>
            {myIndex !== -1 && (
              <div className="text-right flex-shrink-0">
                <p className="text-2xl font-bold text-[var(--t-text)]">#{myIndex + 1}</p>
                <p className="text-xs text-[var(--t-text-muted)]">platform rank</p>
              </div>
            )}
          </div>

          <div className="mt-5">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-[var(--t-text-muted)]">Progress to next rank</span>
              <span className="text-[var(--t-text-muted)]">{rankInfo?.progressPercent ?? 0}%</span>
            </div>
            <div className="h-2 rounded-full bg-[var(--t-surface-3)]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#7B61FF] to-[#5B3FCF] transition-all duration-700"
                style={{ width: `${rankInfo?.progressPercent ?? 0}%` }}
              />
            </div>
            <p className="text-xs mt-1 text-[var(--t-text-muted)]">
              {(rankInfo?.pointsToNext ?? 0).toLocaleString()} pts to next rank
            </p>
          </div>
        </div>

        {/* ── Achievements ──────────────────────────────────────────── */}
        <div className={`${card} p-6`}>
          <p className="font-semibold text-[var(--t-text)] mb-1">Achievements</p>
          <p className="text-xs text-[var(--t-text-muted)] mb-4">
            {earnedAchievements.length}/{ACHIEVEMENTS.length} earned
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {ACHIEVEMENTS.map((a) => {
              const earned = earnedAchievements.some((ea) => ea.id === a.id);
              return (
                <div
                  key={a.id}
                  title={`${a.label}: ${a.desc}`}
                  className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-1 text-center px-1 transition-all duration-200 cursor-help ${
                    earned
                      ? "bg-[var(--t-nav-active)] border border-[var(--t-border-strong)]"
                      : "bg-[var(--t-surface-2)] border border-[var(--t-border)] opacity-40 grayscale"
                  }`}
                >
                  <span className="text-xl">{a.icon}</span>
                  <span className="text-[10px] text-[var(--t-text-muted)] leading-tight">{a.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Rank tier reference ───────────────────────────────────── */}
        <div className={`${card} p-6`}>
          <p className="font-semibold text-[var(--t-text)] mb-3">Rank Tiers</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {tiers.map((tier) => (
              <div
                key={tier.id}
                className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors duration-150 ${
                  tier.label === rankInfo?.rankName ? "bg-[var(--t-nav-active)]" : "bg-[var(--t-surface-2)]"
                }`}
              >
                <span className="text-xl flex-shrink-0">{tier.icon}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--t-text)]">{tier.label}</p>
                  <p className="text-xs text-[var(--t-text-muted)]">{tier.minPts.toLocaleString()}+ pts</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Nearby rankings (secondary, compact) ─────────────────── */}
        {nearby.length > 0 && (
          <div className={`${card} overflow-hidden`}>
            <div className="px-5 py-3 border-b border-[var(--t-nav-border)]">
              <p className="text-sm font-semibold text-[var(--t-text)]">Nearby Rankings</p>
            </div>
            <div className="divide-y divide-[var(--t-nav-border)]">
              {nearby.map((t) => (
                <div
                  key={t.teacherId}
                  className={`flex items-center gap-3 px-5 py-2.5 ${
                    t.teacherId === myTeacherId ? "bg-[var(--t-nav-active)]" : ""
                  }`}
                >
                  <span className="text-sm w-8 text-[var(--t-text-muted)]">#{t.rank}</span>
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#7B61FF] to-[#5B3FCF] flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                    {t.name?.charAt(0)?.toUpperCase() ?? "?"}
                  </div>
                  <p className="flex-1 text-sm text-[var(--t-text)] truncate">
                    {t.teacherId === myTeacherId ? "You" : t.name}
                  </p>
                  <p className="text-sm font-medium text-[var(--t-text-muted)]">{t.points.toLocaleString()} pts</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <LumiChat
        variant="teacher"
        context="Teacher leaderboard page — viewing own rank, progress, and achievements"
      />
    </TeacherLayout>
  );
}

export default function LeaderboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--t-bg)] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--t-accent)]" />
        </div>
      }
    >
      <LeaderboardContent />
    </Suspense>
  );
}
