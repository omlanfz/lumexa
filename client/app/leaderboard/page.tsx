// FILE PATH: client/app/leaderboard/page.tsx
"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import TeacherLayout from "../../components/TeacherLayout";
import { useTheme } from "../../components/ThemeProvider";
// ─── LUMI CHATBOT ──────────────────────────────────────────────────────────────
import LumiChat from "../../components/LumiChat";
// ──────────────────────────────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL;

interface BadgeTier {
  id: string;
  icon: string;
  label: string;
  desc: string;
  minPts: number;
}
interface Teacher {
  rank: number;
  id: string;
  name: string;
  avatarUrl?: string | null;
  points: number;
  classesCompleted: number;
  ratingAvg: number;
  badge: BadgeTier & { tierIndex: number };
}

function LeaderboardContent() {
  const router = useRouter();
  const { isDark } = useTheme();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [tiers, setTiers] = useState<BadgeTier[]>([]);
  const [filter, setFilter] = useState<"all" | "week">("all");
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{
    name: string;
    avatarUrl?: string | null;
    rankTier?: number;
  } | null>(null);

  useEffect(() => {
    const tok = localStorage.getItem("token");
    if (!tok) {
      router.push("/login");
      return;
    }
    (async () => {
      try {
        const [lbRes, pRes] = await Promise.all([
          axios.get(`${API}/teachers/leaderboard?filter=${filter}`, {
            headers: { Authorization: `Bearer ${tok}` },
          }),
          axios
            .get(`${API}/teachers/me/profile`, {
              headers: { Authorization: `Bearer ${tok}` },
            })
            .catch(() => ({ data: null })),
        ]);
        setTeachers(lbRes.data.teachers ?? []);
        setTiers(lbRes.data.tiers ?? []);
        if (pRes.data)
          setProfile({
            name: pRes.data.user?.fullName ?? "Pilot",
            avatarUrl: pRes.data.user?.avatarUrl,
            rankTier: pRes.data.rankTier ?? 0,
          });
      } catch {
        /* silently fail */
      } finally {
        setLoading(false);
      }
    })();
  }, [filter, router]);

  const card =
    "dark:bg-white/5 bg-white rounded-2xl border dark:border-purple-900/20 border-purple-100 shadow-sm";
  const rankMedal = (rank: number) =>
    rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;

  return (
    <TeacherLayout
      teacherName={profile?.name ?? "Pilot"}
      avatarUrl={profile?.avatarUrl}
      rankTier={profile?.rankTier}
    >
      <div className="p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold dark:text-white text-purple-900">
            Leaderboard
          </h1>
          <p className="text-sm dark:text-purple-400 text-purple-500">
            Star Rankings · Top Pilots in the Galaxy
          </p>
        </div>

        {/* Filter */}
        <div className="flex gap-2">
          {(["all", "week"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${filter === f ? "bg-purple-600 text-white" : "dark:bg-white/5 bg-purple-50 dark:text-purple-300 text-purple-600 dark:hover:bg-purple-900/30 hover:bg-purple-100"}`}
            >
              {f === "all" ? "🏆 All Time" : "⚡ This Week"}
            </button>
          ))}
        </div>

        {/* Badge tier legend */}
        <div className={`${card} p-5`}>
          <h2 className="text-sm font-semibold dark:text-purple-200 text-purple-800 mb-3 uppercase tracking-wide">
            Rank Tier System
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {tiers.map((tier) => (
              <div
                key={tier.id}
                className="flex items-start gap-3 p-3 rounded-xl dark:bg-purple-900/10 bg-purple-50"
              >
                <span className="text-2xl flex-shrink-0">{tier.icon}</span>
                <div>
                  <p className="font-semibold dark:text-purple-200 text-purple-800 text-sm">
                    {tier.label}
                  </p>
                  <p className="text-xs dark:text-purple-400 text-purple-500">
                    {tier.minPts.toLocaleString()}+ pts
                  </p>
                  <p className="text-xs dark:text-purple-400/70 text-purple-400 mt-0.5">
                    {tier.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Rankings table */}
        <div className={`${card} overflow-hidden`}>
          <div className="px-5 py-4 border-b dark:border-purple-900/20 border-purple-100">
            <h2 className="font-semibold dark:text-purple-200 text-purple-800">
              Full Rankings
            </h2>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
            </div>
          ) : teachers.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-4xl mb-2">🏆</p>
              <p className="dark:text-purple-400 text-purple-500">
                No rankings yet. Complete classes to appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y dark:divide-purple-900/20 divide-purple-100">
              {teachers.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-4 px-5 py-3.5 dark:hover:bg-purple-900/10 hover:bg-purple-50 transition-colors"
                >
                  <span className="text-xl w-10 text-center flex-shrink-0">
                    {rankMedal(t.rank)}
                  </span>
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white font-semibold flex-shrink-0">
                    {t.name?.charAt(0)?.toUpperCase() ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium dark:text-purple-100 text-purple-900 text-sm truncate">
                        {t.name}
                      </p>
                      <span className="text-base" title={t.badge.label}>
                        {t.badge.icon}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full dark:bg-purple-900/30 bg-purple-100 dark:text-purple-300 text-purple-700">
                        {t.badge.label}
                      </span>
                    </div>
                    <p className="text-xs dark:text-purple-500 text-purple-400">
                      🎓 {t.classesCompleted} classes · ⭐{" "}
                      {t.ratingAvg?.toFixed(1) ?? "—"}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold dark:text-purple-200 text-purple-800">
                      {t.points.toLocaleString()}
                    </p>
                    <p className="text-xs dark:text-purple-500 text-purple-400">
                      pts
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── LUMI CHATBOT ───────────────────────────────────────────────────────
          Fixed bottom-right. variant="teacher" → purple theme, Pilot persona.
          context tells Lumi which page the teacher is viewing.
      ─────────────────────────────────────────────────────────────────────── */}
      <LumiChat
        variant="teacher"
        context="Teacher leaderboard page — showing rank tiers and full pilot rankings"
      />
      {/* ──────────────────────────────────────────────────────────────────── */}
    </TeacherLayout>
  );
}

export default function LeaderboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen dark:bg-[#0A0714] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
        </div>
      }
    >
      <LeaderboardContent />
    </Suspense>
  );
}
