// FILE PATH: client/app/student-leaderboard/page.tsx
"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import StudentNav from "../../components/StudentNav";
import { useTheme } from "../../components/ThemeProvider";

interface LeaderEntry {
  id: string;
  name: string;
  totalClasses: number;
  totalHoursMin: number;
  avgRating?: number;
  grade?: string | null;
  tier: string;
  tierIcon: string;
}

const TIERS = [
  { name: "Starchild", min: 0, icon: "🌟" },
  { name: "Explorer", min: 5, icon: "🔭" },
  { name: "Cosmonaut", min: 15, icon: "🛸" },
  { name: "Navigator", min: 30, icon: "🧭" },
  { name: "Captain", min: 60, icon: "🎖️" },
  { name: "Galaxy", min: 100, icon: "🌌" },
];

const getTier = (n: number) =>
  [...TIERS].reverse().find((t) => n >= t.min) ?? TIERS[0];

const RANK_COLORS = [
  "dark:text-yellow-400 text-yellow-500",
  "dark:text-gray-300 text-gray-500",
  "dark:text-amber-600 text-amber-700",
];
const RANK_ICONS = ["🥇", "🥈", "🥉"];

function LeaderboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isDark } = useTheme();
  const studentId = searchParams.get("studentId") || "";
  const [studentName, setStudentName] = useState("Cadet");
  const [studentGrade, setStudentGrade] = useState<string | null>(null);
  const [parentName, setParentName] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  // Simulated leaderboard (real impl would need a /leaderboard endpoint)
  const [entries, setEntries] = useState<LeaderEntry[]>([]);
  const [myEntry, setMyEntry] = useState<LeaderEntry | null>(null);

  useEffect(() => {
    const tok = localStorage.getItem("token");
    if (!tok) {
      router.push("/login");
      return;
    }
    (async () => {
      try {
        const [sRes, bRes] = await Promise.all([
          axios.get(`${process.env.NEXT_PUBLIC_API_URL}/students`, {
            headers: { Authorization: `Bearer ${tok}` },
          }),
          axios
            .get(`${process.env.NEXT_PUBLIC_API_URL}/bookings`, {
              headers: { Authorization: `Bearer ${tok}` },
            })
            .catch(() => ({ data: [] })),
        ]);
        const myStudents = sRes.data;
        const allBookings: any[] = Array.isArray(bRes.data) ? bRes.data : [];

        // Build per-student stats for THIS parent's students (only data we have access to)
        const studentEntries: LeaderEntry[] = myStudents.map((s: any) => {
          const sb = allBookings.filter(
            (b: any) => b.studentId === s.id || b.student?.id === s.id,
          );
          const completed = sb.filter(
            (b: any) =>
              b.paymentStatus === "CAPTURED" &&
              new Date(b.shift.end) < new Date(),
          );
          const totalClasses = completed.length;
          const totalHoursMin = Math.round(
            completed.reduce((sum: number, b: any) => {
              const m =
                (new Date(b.shift.end).getTime() -
                  new Date(b.shift.start).getTime()) /
                60000;
              return sum + m;
            }, 0),
          );
          const reviewed = completed.filter((b: any) => b.review);
          const avgRating =
            reviewed.length > 0
              ? reviewed.reduce(
                  (s: number, b: any) => s + (b.review?.rating ?? 0),
                  0,
                ) / reviewed.length
              : undefined;
          const tier = getTier(totalClasses);
          return {
            id: s.id,
            name: s.name,
            grade: s.grade ?? null,
            totalClasses,
            totalHoursMin,
            avgRating,
            tier: tier.name,
            tierIcon: tier.icon,
          };
        });

        // Sort by totalClasses desc
        studentEntries.sort((a, b) => b.totalClasses - a.totalClasses);
        setEntries(studentEntries);

        if (studentId) {
          const found = myStudents.find((s: any) => s.id === studentId);
          if (found) {
            setStudentName(found.name);
            setStudentGrade(found.grade ?? null);
            setParentName(found.parent?.fullName);
          }
          setMyEntry(studentEntries.find((e) => e.id === studentId) ?? null);
        }
      } catch {
      } finally {
        setLoading(false);
      }
    })();
  }, [studentId, router]);

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen dark:bg-[#050D1A] bg-[#F0F5FF]">
        <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  const card =
    "rounded-2xl border dark:bg-[#0D1B2E]/60 bg-white dark:border-blue-900/30 border-blue-100";
  const txtp = "dark:text-blue-100 text-blue-900";
  const txtm = "dark:text-blue-300/60 text-blue-400";

  return (
    <div className="min-h-screen dark:bg-[#050D1A] bg-[#F0F5FF]">
      <StudentNav
        studentId={studentId || "none"}
        studentName={studentName}
        grade={studentGrade}
        parentName={parentName}
      />
      <div className="pl-64">
        <div className="max-w-3xl mx-auto px-6 py-8">
          <div className="mb-6">
            <h1 className={`text-2xl font-bold ${txtp}`}>Leaderboard</h1>
            <p className={`text-sm ${txtm}`}>
              Galaxy Ranks · Your family's cadets
            </p>
          </div>

          {/* Note */}
          <div className={`${card} p-4 mb-6 flex items-start gap-3`}>
            <span className="text-xl">ℹ️</span>
            <p className={`text-sm ${txtm}`}>
              Rankings show your enrolled students. A global leaderboard across
              all students is coming soon — keep attending classes to climb the
              ranks!
            </p>
          </div>

          {/* Top 3 spotlight */}
          {entries.length >= 2 && (
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[entries[1], entries[0], entries[2]]
                .filter(Boolean)
                .map((e, i) => {
                  const rankIdx = i === 0 ? 1 : i === 1 ? 0 : 2;
                  const isMe = e.id === studentId;
                  const size = rankIdx === 0 ? "py-6" : "py-4";
                  return (
                    <div
                      key={e.id}
                      className={`${card} ${size} px-4 text-center relative ${isMe ? "ring-2 ring-blue-500" : ""} ${rankIdx === 0 ? "dark:bg-gradient-to-b dark:from-yellow-900/20 dark:to-[#0D1B2E]/60 bg-gradient-to-b from-yellow-50 to-white" : ""}`}
                    >
                      {isMe && (
                        <div className="absolute top-2 right-2 text-xs dark:text-blue-400 text-blue-600 font-bold">
                          YOU
                        </div>
                      )}
                      <p className="text-3xl">{RANK_ICONS[rankIdx]}</p>
                      <div
                        className={`w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-cyan-700 flex items-center justify-center text-white font-bold text-xl mx-auto mt-2`}
                      >
                        {e.name[0]?.toUpperCase()}
                      </div>
                      <p className={`font-bold text-sm mt-2 ${txtp}`}>
                        {e.name}
                      </p>
                      <p className={`text-xs ${txtm}`}>
                        {e.tierIcon} {e.tier}
                      </p>
                      <p
                        className={`text-lg font-bold mt-1 dark:text-blue-300 text-blue-600`}
                      >
                        {e.totalClasses}
                      </p>
                      <p className={`text-xs ${txtm}`}>classes</p>
                    </div>
                  );
                })}
            </div>
          )}

          {/* Full list */}
          <div className={`${card} overflow-hidden`}>
            <div className="px-5 py-4 border-b dark:border-blue-900/20 border-blue-100">
              <p className={`text-xs uppercase font-medium ${txtm}`}>
                All Rankings
              </p>
            </div>
            {entries.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-4xl">🌌</p>
                <p className={`text-sm ${txtm} mt-3`}>
                  No data yet. Complete classes to appear on the leaderboard!
                </p>
              </div>
            ) : (
              <div className="divide-y dark:divide-blue-900/20 divide-blue-100">
                {entries.map((e, idx) => {
                  const isMe = e.id === studentId;
                  return (
                    <div
                      key={e.id}
                      className={`flex items-center gap-4 px-5 py-4 transition-colors ${isMe ? "dark:bg-blue-600/10 bg-blue-50" : ""} dark:hover:bg-blue-900/10 hover:bg-blue-50/50`}
                      onClick={() => router.push(`/student-dashboard/${e.id}`)}
                    >
                      <div
                        className={`w-8 text-center font-bold text-sm flex-shrink-0 ${idx < 3 ? RANK_COLORS[idx] : "dark:text-blue-300/60 text-blue-500/60"}`}
                      >
                        {idx < 3 ? RANK_ICONS[idx] : `#${idx + 1}`}
                      </div>
                      <div
                        className={`w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-cyan-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}
                      >
                        {e.name[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`font-semibold text-sm ${txtp}`}>
                            {e.name}
                          </p>
                          {isMe && (
                            <span className="text-xs dark:bg-blue-600/30 bg-blue-100 dark:text-blue-300 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">
                              You
                            </span>
                          )}
                          {e.grade && (
                            <span className={`text-xs ${txtm}`}>{e.grade}</span>
                          )}
                        </div>
                        <p className={`text-xs ${txtm}`}>
                          {e.tierIcon} {e.tier}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p
                          className={`font-bold dark:text-blue-300 text-blue-600`}
                        >
                          {e.totalClasses}
                        </p>
                        <p className={`text-xs ${txtm}`}>classes</p>
                      </div>
                      {e.avgRating && (
                        <div className="text-right flex-shrink-0 w-12">
                          <p
                            className={`text-sm font-medium dark:text-yellow-400 text-yellow-600`}
                          >
                            ★ {e.avgRating.toFixed(1)}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StudentLeaderboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen dark:bg-[#050D1A] bg-[#F0F5FF]">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LeaderboardContent />
    </Suspense>
  );
}
