// FILE PATH: client/app/student-view/[studentId]/page.tsx
"use client";
import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import StudentNav from "../../../components/StudentNav";
import { useTheme } from "../../../components/ThemeProvider";

interface Snapshot {
  student: { id: string; name: string; age: number };
  parentName: string;
  stats: {
    totalClasses: number;
    upcomingClasses: number;
    averageRating: number | null;
  };
  recentBookings: {
    id: string;
    start: string;
    end: string;
    teacherName: string;
    rating: number | null;
    comment: string | null;
  }[];
  nextClass: { start: string; end: string; bookingId: string } | null;
}

function Stars({ r }: { r: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <span
          key={s}
          className={`text-sm ${s <= r ? "text-yellow-400" : "text-gray-500"}`}
        >
          ★
        </span>
      ))}
    </span>
  );
}

function StudentViewContent() {
  const { studentId } = useParams<{ studentId: string }>();
  const router = useRouter();
  const { isDark } = useTheme();
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tok = localStorage.getItem("token");
    if (!tok) {
      router.push("/login");
      return;
    }
    axios
      .get(
        `${process.env.NEXT_PUBLIC_API_URL}/teachers/me/students/${studentId}/snapshot`,
        { headers: { Authorization: `Bearer ${tok}` } },
      )
      .then((r) => setSnap(r.data))
      .catch((e) => {
        const m = e.response?.data?.message;
        setError(Array.isArray(m) ? m.join(", ") : (m ?? "Access denied"));
      })
      .finally(() => setLoading(false));
  }, [studentId, router]);

  const card =
    "rounded-2xl border dark:bg-[#0D1B2E]/60 bg-white dark:border-blue-900/30 border-blue-100";
  const txtp = "dark:text-blue-100 text-blue-900";
  const txtm = "dark:text-blue-300/60 text-blue-400";

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen dark:bg-[#050D1A] bg-[#F0F5FF]">
        <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  if (error || !snap)
    return (
      <div className="flex flex-col items-center justify-center h-screen dark:bg-[#050D1A] bg-[#F0F5FF] gap-4 text-center px-4">
        <p className="text-5xl">🚫</p>
        <p className="text-red-400 font-semibold">
          {error ?? "Student not found"}
        </p>
        <p className={`text-sm ${txtm} max-w-sm`}>
          You can only view students who have completed at least one class with
          you.
        </p>
        <button
          onClick={() => router.back()}
          className={`text-sm dark:text-blue-400 text-blue-600 underline`}
        >
          ← Go back
        </button>
      </div>
    );

  return (
    <div className="min-h-screen dark:bg-[#050D1A] bg-[#F0F5FF]">
      <StudentNav
        studentId={studentId}
        studentName={snap.student.name}
        grade={null}
        parentName={snap.parentName}
        isTeacherView
        onExitTeacherView={() => router.push("/teacher-students")}
      />
      <div className="pl-64">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* Teacher view banner */}
          <div
            className={`${card} p-4 mb-6 flex items-center gap-3 border-amber-500/30 dark:bg-amber-900/10 bg-amber-50`}
          >
            <span className="text-2xl">👁️</span>
            <div className="flex-1">
              <p className="font-semibold dark:text-amber-300 text-amber-700">
                Teacher View — Read Only
              </p>
              <p className="text-sm dark:text-amber-400/70 text-amber-600">
                Viewing {snap.student.name}'s history with you. This data is
                private to you.
              </p>
            </div>
            <button
              onClick={() => router.push("/teacher-students")}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-sm font-medium rounded-xl transition-colors flex-shrink-0"
            >
              Exit View
            </button>
          </div>

          {/* Student card */}
          <div className={`${card} p-6 mb-6 flex items-center gap-4`}>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-white font-bold text-2xl flex-shrink-0">
              {snap.student.name[0]?.toUpperCase()}
            </div>
            <div>
              <h1 className={`text-2xl font-bold ${txtp}`}>
                {snap.student.name}
              </h1>
              <p className={`text-sm ${txtm}`}>
                Age {snap.student.age} · Parent: {snap.parentName}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              {
                icon: "📚",
                label: "Classes with You",
                value: snap.stats.totalClasses,
              },
              {
                icon: "📅",
                label: "Upcoming",
                value: snap.stats.upcomingClasses,
              },
              {
                icon: "⭐",
                label: "Avg Rating Given",
                value: snap.stats.averageRating
                  ? snap.stats.averageRating.toFixed(1)
                  : "—",
              },
            ].map((s) => (
              <div key={s.label} className={`${card} p-5 text-center`}>
                <span className="text-2xl">{s.icon}</span>
                <p className={`text-3xl font-bold mt-2 ${txtp}`}>{s.value}</p>
                <p className={`text-xs ${txtm}`}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Next class */}
          {snap.nextClass && (
            <div className={`${card} p-5 mb-6`}>
              <p className={`text-xs uppercase font-medium mb-3 ${txtm}`}>
                Upcoming Session
              </p>
              <div className="flex items-center gap-4">
                <span className="text-2xl">🗓️</span>
                <div>
                  <p className={`font-semibold ${txtp}`}>
                    {new Date(snap.nextClass.start).toLocaleDateString(
                      "en-US",
                      { weekday: "long", month: "long", day: "numeric" },
                    )}
                  </p>
                  <p className={`text-sm ${txtm}`}>
                    {new Date(snap.nextClass.start).toLocaleTimeString(
                      "en-US",
                      { hour: "numeric", minute: "2-digit" },
                    )}{" "}
                    –{" "}
                    {new Date(snap.nextClass.end).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* History */}
          <div className={`${card} p-5`}>
            <p className={`text-xs uppercase font-medium mb-4 ${txtm}`}>
              Class History ({snap.recentBookings.length} sessions)
            </p>
            {snap.recentBookings.length === 0 ? (
              <p className={`text-sm text-center py-6 ${txtm}`}>
                No completed classes yet.
              </p>
            ) : (
              <div className="space-y-2">
                {snap.recentBookings.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-start gap-3 p-3 rounded-xl dark:bg-blue-900/10 bg-blue-50/50"
                  >
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-700 to-indigo-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {new Date(b.start).getDate()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${txtp}`}>
                        {new Date(b.start).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}{" "}
                        ·{" "}
                        {new Date(b.start).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                      {b.rating !== null && (
                        <div className="flex items-center gap-2 mt-1">
                          <Stars r={b.rating} />
                          {b.comment && (
                            <p className={`text-xs ${txtm} truncate`}>
                              "{b.comment}"
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    {b.rating === null && (
                      <span className={`text-xs ${txtm} flex-shrink-0`}>
                        No review
                      </span>
                    )}
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

export default function StudentViewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen dark:bg-[#050D1A] bg-[#F0F5FF]">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <StudentViewContent />
    </Suspense>
  );
}
