// FILE PATH: client/app/student-dashboard/[studentId]/page.tsx
"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import StudentNav from "../../../components/StudentNav";
import { useTheme } from "../../../components/ThemeProvider";

// ─── Types ───────────────────────────────────────────────────────────────────

interface StudentProfile {
  id: string;
  name: string;
  age: number;
  grade?: string | null;
  subject?: string | null;
  parent: { fullName: string; email: string };
}

interface BookingItem {
  id: string;
  shift: { start: string; end: string };
  paymentStatus: string;
  teacher?: { fullName: string; avatarUrl?: string | null };
  review?: { rating: number; comment?: string | null } | null;
}

interface Stats {
  totalClasses: number;
  upcomingClasses: number;
  completionRate: number;
  totalHours: number;
  streak: number; // consecutive weeks with at least one class
  avgRating: number; // avg rating this student gives
}

// ─── Space Achievement Badges ─────────────────────────────────────────────────

const STUDENT_BADGES = [
  {
    id: "first_class",
    icon: "🚀",
    label: "First Mission",
    desc: "Attended first class",
    req: (s: Stats) => s.totalClasses >= 1,
  },
  {
    id: "five_classes",
    icon: "🌍",
    label: "Orbit Entry",
    desc: "5 classes completed",
    req: (s: Stats) => s.totalClasses >= 5,
  },
  {
    id: "ten_classes",
    icon: "🛸",
    label: "Deep Space",
    desc: "10 classes completed",
    req: (s: Stats) => s.totalClasses >= 10,
  },
  {
    id: "twenty_five",
    icon: "🌌",
    label: "Galaxy Explorer",
    desc: "25 classes completed",
    req: (s: Stats) => s.totalClasses >= 25,
  },
  {
    id: "streak_3",
    icon: "🔥",
    label: "Fuel Injected",
    desc: "3-week streak",
    req: (s: Stats) => s.streak >= 3,
  },
  {
    id: "perfect_review",
    icon: "⭐",
    label: "Top Commander",
    desc: "Gave a 5-star review",
    req: (s: Stats) => s.avgRating >= 5,
  },
  {
    id: "ten_hours",
    icon: "⏰",
    label: "Time Traveler",
    desc: "10+ hours in class",
    req: (s: Stats) => s.totalHours >= 10,
  },
  {
    id: "fifty_hours",
    icon: "🌠",
    label: "Warp Speed",
    desc: "50+ hours in class",
    req: (s: Stats) => s.totalHours >= 50,
  },
];

// ─── Countdown component ──────────────────────────────────────────────────────

function CountdownBlock({ targetDate }: { targetDate: string }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const calc = () => Math.max(0, new Date(targetDate).getTime() - Date.now());
    setRemaining(calc());
    const interval = setInterval(() => setRemaining(calc()), 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  const hours = Math.floor(remaining / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);

  return (
    <div className="flex items-center gap-2 mt-2">
      {[
        { v: hours, l: "HRS" },
        { v: minutes, l: "MIN" },
        { v: seconds, l: "SEC" },
      ].map(({ v, l }) => (
        <div
          key={l}
          className="text-center px-2.5 py-1.5 rounded-lg bg-blue-900/30"
        >
          <p className="text-xl font-bold tabular-nums text-blue-200">
            {String(v).padStart(2, "0")}
          </p>
          <p className="text-xs text-blue-400">{l}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Star display ─────────────────────────────────────────────────────────────

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <span
          key={s}
          className={`text-sm ${s <= rating ? "text-yellow-400" : "text-gray-600"}`}
        >
          ★
        </span>
      ))}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

function StudentDashboardContent() {
  const { studentId } = useParams<{ studentId: string }>();
  const router = useRouter();
  const { isDark } = useTheme();

  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch all bookings for this student via the parent's bookings
        const [studentsRes, bookingsRes] = await Promise.all([
          axios.get(`${process.env.NEXT_PUBLIC_API_URL}/students`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          // We'll call a filtered endpoint — for now, reuse GET /bookings with query or get all
          axios
            .get(`${process.env.NEXT_PUBLIC_API_URL}/bookings`, {
              headers: { Authorization: `Bearer ${token}` },
            })
            .catch(() => ({ data: [] })),
        ]);

        const found = (studentsRes.data as StudentProfile[]).find(
          (s) => s.id === studentId,
        );
        if (!found) {
          setError("Student not found or not yours.");
          setLoading(false);
          return;
        }
        setStudent(found);

        // Filter bookings for this student
        const allBookings: BookingItem[] = bookingsRes.data ?? [];
        const myBookings = allBookings.filter(
          (b: any) => b.studentId === studentId || b.student?.id === studentId,
        );
        setBookings(myBookings);

        // Compute stats
        const completed = myBookings.filter(
          (b) => b.paymentStatus === "CAPTURED",
        );
        const upcoming = myBookings.filter(
          (b) =>
            b.paymentStatus === "CAPTURED" &&
            new Date(b.shift.start) > new Date(),
        );
        const totalHours = completed.reduce((sum, b) => {
          const mins =
            (new Date(b.shift.end).getTime() -
              new Date(b.shift.start).getTime()) /
            60000;
          return sum + mins / 60;
        }, 0);
        const ratings = completed
          .filter((b) => b.review)
          .map((b) => b.review!.rating);
        const avgRating =
          ratings.length > 0
            ? ratings.reduce((a, c) => a + c, 0) / ratings.length
            : 0;

        // Streak: count consecutive weeks with at least one class (simple version)
        let streak = 0;
        const sortedDates = completed
          .map((b) => new Date(b.shift.start))
          .sort((a, b) => b.getTime() - a.getTime());
        const getWeekKey = (d: Date) => {
          const mon = new Date(d);
          mon.setDate(d.getDate() - ((d.getDay() + 6) % 7));
          return `${mon.getFullYear()}-${mon.getMonth()}-${mon.getDate()}`;
        };
        const weekSet = new Set(sortedDates.map(getWeekKey));
        let checkDate = new Date();
        while (true) {
          const key = getWeekKey(checkDate);
          if (weekSet.has(key)) {
            streak++;
            checkDate.setDate(checkDate.getDate() - 7);
          } else break;
        }

        setStats({
          totalClasses: completed.length,
          upcomingClasses: upcoming.length,
          completionRate:
            myBookings.length > 0
              ? Math.round((completed.length / myBookings.length) * 100)
              : 0,
          totalHours: Math.round(totalHours * 10) / 10,
          streak,
          avgRating,
        });
      } catch (err: any) {
        const msg = err.response?.data?.message;
        setError(
          Array.isArray(msg)
            ? msg.join(", ")
            : (msg ?? "Failed to load student dashboard"),
        );
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [studentId, router]);

  // Theme classes (BLUE for student)
  const bg = isDark ? "bg-[#050D1A]" : "bg-[#F0F5FF]";
  const cardBg = isDark
    ? "bg-[#0D1B2E]/60 border border-blue-900/30"
    : "bg-white border border-blue-100 shadow-sm";
  const textPrimary = isDark ? "text-blue-100" : "text-blue-900";
  const textMuted = isDark ? "text-blue-300/60" : "text-blue-400";

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-screen ${bg}`}>
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-blue-400 text-sm mt-4">Loading mission data...</p>
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className={`flex items-center justify-center h-screen ${bg}`}>
        <div className="text-center">
          <p className="text-red-400">{error ?? "Student not found"}</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-4 text-blue-400 underline text-sm"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const upcomingBookings = bookings
    .filter(
      (b) =>
        b.paymentStatus === "CAPTURED" && new Date(b.shift.start) > new Date(),
    )
    .sort(
      (a, b) =>
        new Date(a.shift.start).getTime() - new Date(b.shift.start).getTime(),
    );

  const recentCompleted = bookings
    .filter(
      (b) =>
        b.paymentStatus === "CAPTURED" && new Date(b.shift.end) < new Date(),
    )
    .sort(
      (a, b) =>
        new Date(b.shift.start).getTime() - new Date(a.shift.start).getTime(),
    )
    .slice(0, 5);

  const earnedBadges = stats ? STUDENT_BADGES.filter((b) => b.req(stats)) : [];

  const nextClass = upcomingBookings[0];

  // Level system: tiers based on total classes
  const STUDENT_TIERS = [
    {
      name: "Starchild",
      min: 0,
      icon: "🌟",
      color: "from-blue-400 to-cyan-500",
    },
    {
      name: "Explorer",
      min: 5,
      icon: "🔭",
      color: "from-cyan-500 to-blue-600",
    },
    {
      name: "Cosmonaut",
      min: 15,
      icon: "🛸",
      color: "from-blue-600 to-indigo-600",
    },
    {
      name: "Navigator",
      min: 30,
      icon: "🧭",
      color: "from-indigo-600 to-purple-600",
    },
    {
      name: "Captain",
      min: 60,
      icon: "🎖️",
      color: "from-purple-600 to-pink-600",
    },
    {
      name: "Galaxy Commander",
      min: 100,
      icon: "🌌",
      color: "from-pink-600 to-rose-600",
    },
  ];
  const currentTier =
    [...STUDENT_TIERS]
      .reverse()
      .find((t) => (stats?.totalClasses ?? 0) >= t.min) ?? STUDENT_TIERS[0];
  const nextTier = STUDENT_TIERS[STUDENT_TIERS.indexOf(currentTier) + 1];
  const progressToNext = nextTier
    ? Math.round(
        (((stats?.totalClasses ?? 0) - currentTier.min) /
          (nextTier.min - currentTier.min)) *
          100,
      )
    : 100;

  return (
    <div className={`min-h-screen ${bg} transition-colors duration-300`}>
      <StudentNav
        studentId={studentId}
        studentName={student.name}
        grade={student.grade}
        parentName={student.parent.fullName}
      />

      <div className="pl-64">
        <div className="max-w-5xl mx-auto px-6 py-8">
          {/* Student Hero Header */}
          <div
            className={`${cardBg} rounded-2xl p-6 mb-6 relative overflow-hidden`}
          >
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-cyan-900/10 pointer-events-none" />
            {/* Stars effect */}
            <div className="absolute top-4 right-8 text-3xl opacity-10 pointer-events-none">
              ✦ ✧ ✦
            </div>

            <div className="relative flex items-center gap-5">
              {/* Avatar */}
              <div
                className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${currentTier.color} flex items-center justify-center text-white font-bold text-2xl flex-shrink-0 shadow-lg`}
              >
                {student.name.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className={`text-2xl font-bold ${textPrimary}`}>
                    {student.name}
                  </h1>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      isDark
                        ? "bg-blue-900/40 text-blue-300"
                        : "bg-blue-100 text-blue-600"
                    }`}
                  >
                    {student.grade ?? "Cadet"}
                  </span>
                  {student.subject && (
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        isDark
                          ? "bg-cyan-900/40 text-cyan-300"
                          : "bg-cyan-100 text-cyan-600"
                      }`}
                    >
                      {student.subject}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-lg">{currentTier.icon}</span>
                  <span
                    className={`text-sm font-medium ${isDark ? "text-blue-300" : "text-blue-600"}`}
                  >
                    {currentTier.name}
                  </span>
                </div>
              </div>

              {/* Level progress */}
              <div className="hidden md:block w-48">
                <div className="flex justify-between text-xs mb-1">
                  <span className={textMuted}>Level Progress</span>
                  <span className={textMuted}>{progressToNext}%</span>
                </div>
                <div
                  className={`h-2 rounded-full ${isDark ? "bg-blue-900/40" : "bg-blue-100"}`}
                >
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${currentTier.color} transition-all duration-700`}
                    style={{ width: `${progressToNext}%` }}
                  />
                </div>
                <p className={`text-xs mt-1 ${textMuted}`}>
                  {nextTier
                    ? `${nextTier.min - (stats?.totalClasses ?? 0)} more classes to ${nextTier.name}`
                    : "🌟 Max rank achieved!"}
                </p>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              {
                icon: "📚",
                label: "Total Classes",
                value: stats?.totalClasses ?? 0,
                sub: `${stats?.upcomingClasses ?? 0} upcoming`,
              },
              {
                icon: "⏱️",
                label: "Hours Learned",
                value: `${stats?.totalHours ?? 0}h`,
                sub: "Total class time",
              },
              {
                icon: "🔥",
                label: "Weekly Streak",
                value: `${stats?.streak ?? 0}w`,
                sub: "Consecutive weeks",
              },
              {
                icon: "✅",
                label: "Completion",
                value: `${stats?.completionRate ?? 0}%`,
                sub: "Classes attended",
              },
            ].map((item) => (
              <div key={item.label} className={`${cardBg} rounded-2xl p-4`}>
                <span className="text-2xl">{item.icon}</span>
                <p
                  className={`text-xs uppercase tracking-wide mt-2 ${textMuted}`}
                >
                  {item.label}
                </p>
                <p className={`text-2xl font-bold mt-0.5 ${textPrimary}`}>
                  {item.value}
                </p>
                <p className={`text-xs mt-0.5 ${textMuted}`}>{item.sub}</p>
              </div>
            ))}
          </div>

          {/* Main content 2-col */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {/* Left col — Next class + Recent activity */}
            <div className="col-span-2 space-y-4">
              {/* Next class */}
              {nextClass ? (
                <div className={`${cardBg} rounded-2xl p-5`}>
                  <p
                    className={`text-xs uppercase tracking-wide font-medium mb-3 ${textMuted}`}
                  >
                    Next Mission
                  </p>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-violet-800 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                      ✈️
                    </div>
                    <div className="flex-1">
                      <p className={`font-semibold ${textPrimary}`}>
                        Lesson with{" "}
                        {nextClass.teacher?.fullName ?? "Your Teacher"}
                      </p>
                      <p className={`text-sm ${textMuted}`}>
                        {new Date(nextClass.shift.start).toLocaleDateString(
                          "en-US",
                          {
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                          },
                        )}{" "}
                        ·{" "}
                        {new Date(nextClass.shift.start).toLocaleTimeString(
                          "en-US",
                          {
                            hour: "numeric",
                            minute: "2-digit",
                          },
                        )}
                      </p>
                      <CountdownBlock targetDate={nextClass.shift.start} />
                    </div>
                    {new Date(nextClass.shift.start).getTime() - Date.now() <=
                      600000 && (
                      <button
                        onClick={() =>
                          router.push(`/classroom/${nextClass.id}`)
                        }
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-xl transition-colors flex-shrink-0"
                      >
                        Join →
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  className={`${cardBg} rounded-2xl p-5 flex items-center gap-4`}
                >
                  <span className="text-3xl">🌌</span>
                  <div>
                    <p className={`font-semibold ${textPrimary}`}>
                      No upcoming missions
                    </p>
                    <p className={`text-sm ${textMuted}`}>
                      Ask your parent to book a class!
                    </p>
                  </div>
                  <button
                    onClick={() => router.push("/marketplace")}
                    className={`ml-auto px-3 py-1.5 rounded-lg text-sm ${
                      isDark
                        ? "bg-blue-900/30 text-blue-300 hover:bg-blue-800/40"
                        : "bg-blue-100 text-blue-600 hover:bg-blue-200"
                    }`}
                  >
                    Find Teachers
                  </button>
                </div>
              )}

              {/* Recent classes */}
              <div className={`${cardBg} rounded-2xl p-5`}>
                <div className="flex items-center justify-between mb-4">
                  <p
                    className={`text-xs uppercase tracking-wide font-medium ${textMuted}`}
                  >
                    Recent Classes
                  </p>
                  <button
                    onClick={() => router.push(`/student-lessons/${studentId}`)}
                    className={`text-xs ${isDark ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-500"}`}
                  >
                    View all →
                  </button>
                </div>

                {recentCompleted.length === 0 ? (
                  <p className={`text-sm text-center py-6 ${textMuted}`}>
                    No completed classes yet
                  </p>
                ) : (
                  <div className="space-y-3">
                    {recentCompleted.map((b) => (
                      <div
                        key={b.id}
                        className={`flex items-center gap-3 p-3 rounded-xl ${
                          isDark
                            ? "bg-blue-900/10 hover:bg-blue-900/20"
                            : "bg-blue-50/50 hover:bg-blue-50"
                        } transition-colors`}
                      >
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {new Date(b.shift.start).getDate()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm font-medium truncate ${textPrimary}`}
                          >
                            {b.teacher?.fullName ?? "Teacher"}
                          </p>
                          <p className={`text-xs ${textMuted}`}>
                            {new Date(b.shift.start).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              },
                            )}
                          </p>
                        </div>
                        {b.review ? (
                          <Stars rating={b.review.rating} />
                        ) : (
                          <span className={`text-xs ${textMuted}`}>
                            No review
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right col — Badges + Upcoming */}
            <div className="space-y-4">
              {/* Mission Badges */}
              <div className={`${cardBg} rounded-2xl p-5`}>
                <p
                  className={`text-xs uppercase tracking-wide font-medium mb-3 ${textMuted}`}
                >
                  Mission Badges
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {STUDENT_BADGES.map((b) => {
                    const earned = stats ? b.req(stats) : false;
                    return (
                      <div
                        key={b.id}
                        title={`${b.label}: ${b.desc}`}
                        className={`aspect-square rounded-xl flex items-center justify-center text-xl transition-all ${
                          earned
                            ? isDark
                              ? "bg-blue-600/30 border border-blue-500/40"
                              : "bg-blue-100 border border-blue-300"
                            : "bg-gray-800/20 border border-gray-700/20 opacity-30 grayscale"
                        }`}
                      >
                        {b.icon}
                      </div>
                    );
                  })}
                </div>
                <p className={`text-xs mt-3 ${textMuted}`}>
                  {earnedBadges.length}/{STUDENT_BADGES.length} earned
                </p>
              </div>

              {/* All upcoming */}
              {upcomingBookings.length > 0 && (
                <div className={`${cardBg} rounded-2xl p-5`}>
                  <p
                    className={`text-xs uppercase tracking-wide font-medium mb-3 ${textMuted}`}
                  >
                    Upcoming ({upcomingBookings.length})
                  </p>
                  <div className="space-y-2">
                    {upcomingBookings.slice(0, 4).map((b) => (
                      <div
                        key={b.id}
                        className={`p-2.5 rounded-xl ${
                          isDark ? "bg-blue-900/10" : "bg-blue-50/50"
                        }`}
                      >
                        <p className={`text-xs font-medium ${textPrimary}`}>
                          {new Date(b.shift.start).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                        <p className={`text-xs ${textMuted}`}>
                          {new Date(b.shift.start).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    ))}
                    {upcomingBookings.length > 4 && (
                      <p className={`text-xs text-center ${textMuted}`}>
                        +{upcomingBookings.length - 4} more
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="space-y-2">
                <button
                  onClick={() => router.push(`/student-lessons/${studentId}`)}
                  className={`w-full p-3 rounded-xl text-left transition-colors ${
                    isDark
                      ? "bg-blue-900/20 border border-blue-900/30 hover:bg-blue-900/30 text-blue-300"
                      : "bg-blue-50 border border-blue-100 hover:bg-blue-100 text-blue-700"
                  }`}
                >
                  <p className="text-sm font-medium">📚 All Lessons</p>
                  <p className={`text-xs ${textMuted}`}>Mission Log</p>
                </button>
                <button
                  onClick={() => router.push(`/student-progress/${studentId}`)}
                  className={`w-full p-3 rounded-xl text-left transition-colors ${
                    isDark
                      ? "bg-blue-900/20 border border-blue-900/30 hover:bg-blue-900/30 text-blue-300"
                      : "bg-blue-50 border border-blue-100 hover:bg-blue-100 text-blue-700"
                  }`}
                >
                  <p className="text-sm font-medium">📊 Progress Report</p>
                  <p className={`text-xs ${textMuted}`}>Star Chart</p>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StudentDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen bg-[#050D1A]">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <StudentDashboardContent />
    </Suspense>
  );
}
