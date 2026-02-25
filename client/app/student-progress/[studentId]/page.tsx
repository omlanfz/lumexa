// FILE PATH: client/app/student-progress/[studentId]/page.tsx
"use client";
import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import StudentNav from "../../../components/StudentNav";
import { useTheme } from "../../../components/ThemeProvider";

interface Booking {
  id: string;
  studentId?: string;
  student?: { id: string };
  shift: { start: string; end: string };
  paymentStatus: string;
  teacher?: { fullName: string };
  review?: { rating: number; comment?: string | null } | null;
}

const BADGES = [
  {
    icon: "🚀",
    label: "First Mission",
    desc: "Attended first class",
    check: (n: number, h: number) => n >= 1,
  },
  {
    icon: "🌍",
    label: "Orbit Entry",
    desc: "5 classes completed",
    check: (n: number) => n >= 5,
  },
  {
    icon: "🛸",
    label: "Deep Space",
    desc: "10 classes completed",
    check: (n: number) => n >= 10,
  },
  {
    icon: "🔥",
    label: "5h Learner",
    desc: "5 hours of class time",
    check: (_: number, h: number) => h >= 5,
  },
  {
    icon: "⏰",
    label: "10h Explorer",
    desc: "10 hours of class time",
    check: (_: number, h: number) => h >= 10,
  },
  {
    icon: "📚",
    label: "25 Missions",
    desc: "25 classes completed",
    check: (n: number) => n >= 25,
  },
  {
    icon: "💫",
    label: "50h Legend",
    desc: "50 hours in class",
    check: (_: number, h: number) => h >= 50,
  },
  {
    icon: "⭐",
    label: "Reviewer",
    desc: "Submitted a review",
    check: (_: number, __: number, reviews: number) => reviews >= 1,
  },
  {
    icon: "🌠",
    label: "Century",
    desc: "100 classes completed",
    check: (n: number) => n >= 100,
  },
  {
    icon: "🏆",
    label: "5-Star Hero",
    desc: "Got all 5-star sessions",
    check: (_: number, __: number, ___: number, avgR: number) => avgR >= 4.9,
  },
  {
    icon: "🌌",
    label: "Galaxy Cmdr",
    desc: "50+ classes",
    check: (n: number) => n >= 50,
  },
  {
    icon: "🎖️",
    label: "Loyal Cadet",
    desc: "Classes with 3+ teachers",
    check: (
      _: number,
      __: number,
      ___: number,
      ____: number,
      teachers: number,
    ) => teachers >= 3,
  },
];

function ProgressContent() {
  const { studentId } = useParams<{ studentId: string }>();
  const router = useRouter();
  const { isDark } = useTheme();
  const [student, setStudent] = useState<{
    name: string;
    grade?: string | null;
    parent: { fullName: string };
  } | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

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
        const found = sRes.data.find((s: any) => s.id === studentId);
        setStudent(found ?? null);
        const all: Booking[] = Array.isArray(bRes.data) ? bRes.data : [];
        setBookings(
          all.filter(
            (b) => b.studentId === studentId || b.student?.id === studentId,
          ),
        );
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

  const completed = bookings.filter(
    (b) => b.paymentStatus === "CAPTURED" && new Date(b.shift.end) < new Date(),
  );
  const totalClasses = completed.length;
  const totalHrs = completed.reduce((s, b) => {
    const m =
      (new Date(b.shift.end).getTime() - new Date(b.shift.start).getTime()) /
      60000;
    return s + m / 60;
  }, 0);
  const reviewed = completed.filter((b) => b.review);
  const avgRating =
    reviewed.length > 0
      ? reviewed.reduce((s, b) => s + (b.review?.rating ?? 0), 0) /
        reviewed.length
      : 0;
  const uniqueTeachers = new Set(
    completed.map((b) => b.teacher?.fullName).filter(Boolean),
  ).size;

  const earnedBadges = BADGES.filter((b) =>
    b.check(totalClasses, totalHrs, reviewed.length, avgRating, uniqueTeachers),
  );

  // Ratings breakdown
  const ratingDist = [5, 4, 3, 2, 1].map((r) => ({
    r,
    count: reviewed.filter((b) => b.review?.rating === r).length,
  }));

  // Monthly activity
  const monthlyMap: Record<string, number> = {};
  completed.forEach((b) => {
    const d = new Date(b.shift.start);
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyMap[k] = (monthlyMap[k] ?? 0) + 1;
  });
  const months = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6);
  const maxMonth = Math.max(...months.map(([, v]) => v), 1);

  const card =
    "rounded-2xl border dark:bg-[#0D1B2E]/60 bg-white dark:border-blue-900/30 border-blue-100";
  const txtp = "dark:text-blue-100 text-blue-900";
  const txtm = "dark:text-blue-300/60 text-blue-400";

  return (
    <div className="min-h-screen dark:bg-[#050D1A] bg-[#F0F5FF]">
      <StudentNav
        studentId={studentId}
        studentName={student?.name}
        grade={student?.grade}
        parentName={student?.parent.fullName}
      />
      <div className="pl-64">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="mb-6">
            <h1 className={`text-2xl font-bold ${txtp}`}>Progress</h1>
            <p className={`text-sm ${txtm}`}>
              Star Chart · AI-powered insights coming soon
            </p>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { icon: "📚", label: "Total Classes", value: totalClasses },
              {
                icon: "⏱️",
                label: "Hours Learned",
                value: `${Math.round(totalHrs * 10) / 10}h`,
              },
              {
                icon: "⭐",
                label: "Avg Rating",
                value: avgRating ? avgRating.toFixed(1) : "—",
              },
              { icon: "✏️", label: "Teachers", value: uniqueTeachers },
            ].map((s) => (
              <div key={s.label} className={`${card} p-4 text-center`}>
                <span className="text-2xl">{s.icon}</span>
                <p className={`text-2xl font-bold mt-2 ${txtp}`}>{s.value}</p>
                <p className={`text-xs ${txtm}`}>{s.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Monthly activity chart */}
            <div className={`${card} p-5`}>
              <p className={`text-xs uppercase font-medium mb-4 ${txtm}`}>
                Monthly Activity
              </p>
              {months.length === 0 ? (
                <p className={`text-sm text-center py-8 ${txtm}`}>
                  No data yet
                </p>
              ) : (
                <div className="flex items-end gap-2 h-32">
                  {months.map(([k, v]) => {
                    const month = new Date(k + "-01").toLocaleDateString(
                      "en-US",
                      { month: "short" },
                    );
                    const pct = (v / maxMonth) * 100;
                    return (
                      <div
                        key={k}
                        className="flex-1 flex flex-col items-center gap-1"
                      >
                        <p className={`text-xs ${txtp} font-medium`}>{v}</p>
                        <div
                          className="w-full rounded-t-lg dark:bg-blue-600/60 bg-blue-400/60"
                          style={{ height: `${Math.max(pct, 8)}%` }}
                        />
                        <p className={`text-xs ${txtm}`}>{month}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Rating distribution */}
            <div className={`${card} p-5`}>
              <p className={`text-xs uppercase font-medium mb-4 ${txtm}`}>
                Rating Distribution
              </p>
              {reviewed.length === 0 ? (
                <p className={`text-sm text-center py-8 ${txtm}`}>
                  No reviews submitted yet
                </p>
              ) : (
                <div className="space-y-2">
                  {ratingDist.map(({ r, count }) => (
                    <div key={r} className="flex items-center gap-2">
                      <span className="text-yellow-400 text-sm w-4">{r}★</span>
                      <div className="flex-1 h-2 rounded-full dark:bg-gray-800 bg-gray-200">
                        <div
                          className="h-full rounded-full bg-yellow-400 transition-all"
                          style={{
                            width: reviewed.length
                              ? `${(count / reviewed.length) * 100}%`
                              : "0%",
                          }}
                        />
                      </div>
                      <span className={`text-xs w-4 text-right ${txtm}`}>
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Badges */}
          <div className={`${card} p-6 mb-6`}>
            <div className="flex items-center justify-between mb-4">
              <p className={`text-xs uppercase font-medium ${txtm}`}>
                Mission Badges
              </p>
              <p className={`text-xs ${txtm}`}>
                {earnedBadges.length}/{BADGES.length} earned
              </p>
            </div>
            <div className="grid grid-cols-6 gap-3">
              {BADGES.map((b, i) => {
                const earned = b.check(
                  totalClasses,
                  totalHrs,
                  reviewed.length,
                  avgRating,
                  uniqueTeachers,
                );
                return (
                  <div
                    key={i}
                    title={`${b.label}: ${b.desc}`}
                    className={`aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 transition-all ${earned ? "dark:bg-blue-600/30 bg-blue-100 border-2 dark:border-blue-500/50 border-blue-300" : "dark:bg-gray-800/20 bg-gray-100 border dark:border-gray-700/20 border-gray-200 opacity-30 grayscale"}`}
                  >
                    <span className="text-2xl">{b.icon}</span>
                    <p
                      className={`text-xs leading-tight text-center px-1 ${earned ? txtp : txtm}`}
                    >
                      {b.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent reviews */}
          {reviewed.length > 0 && (
            <div className={`${card} p-5`}>
              <p className={`text-xs uppercase font-medium mb-4 ${txtm}`}>
                Your Reviews
              </p>
              <div className="space-y-3">
                {reviewed.slice(0, 5).map((b) => (
                  <div
                    key={b.id}
                    className="flex items-start gap-3 p-3 rounded-xl dark:bg-blue-900/10 bg-blue-50/50"
                  >
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-700 to-indigo-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {new Date(b.shift.start).getDate()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <span
                              key={s}
                              className={`text-xs ${s <= (b.review?.rating ?? 0) ? "text-yellow-400" : "text-gray-500"}`}
                            >
                              ★
                            </span>
                          ))}
                        </span>
                        <p className={`text-xs ${txtm}`}>
                          {new Date(b.shift.start).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      {b.review?.comment && (
                        <p className={`text-xs mt-1 ${txtp}`}>
                          "{b.review.comment}"
                        </p>
                      )}
                      <p className={`text-xs ${txtm} mt-0.5`}>
                        Teacher: {b.teacher?.fullName ?? "—"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StudentProgressPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen dark:bg-[#050D1A] bg-[#F0F5FF]">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ProgressContent />
    </Suspense>
  );
}
