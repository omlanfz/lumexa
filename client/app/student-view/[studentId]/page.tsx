// FILE PATH: client/app/student-view/[studentId]/page.tsx
// This page lets a TEACHER view a specific student's dashboard (read-only)
"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import StudentNav from "../../../components/StudentNav";
import { useTheme } from "../../../components/ThemeProvider";

interface StudentSnapshot {
  student: { id: string; name: string; age: number };
  parentName: string;
  stats: {
    totalClasses: number;
    upcomingClasses: number;
    averageRating: number | null;
  };
  recentBookings: Array<{
    id: string;
    start: string;
    end: string;
    teacherName: string;
    rating: number | null;
    comment: string | null;
  }>;
  nextClass: { start: string; end: string; bookingId: string } | null;
}

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

function StudentViewContent() {
  const { studentId } = useParams<{ studentId: string }>();
  const router = useRouter();
  const { isDark } = useTheme();
  const [snapshot, setSnapshot] = useState<StudentSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    axios
      .get(
        `${process.env.NEXT_PUBLIC_API_URL}/teachers/me/students/${studentId}/snapshot`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      .then((res) => setSnapshot(res.data))
      .catch((err) => {
        const msg = err.response?.data?.message;
        setError(
          Array.isArray(msg)
            ? msg.join(", ")
            : (msg ?? "Access denied or student not found"),
        );
      })
      .finally(() => setLoading(false));
  }, [studentId, router]);

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
          <p className="text-blue-400 text-sm mt-4">Loading cadet data...</p>
        </div>
      </div>
    );
  }

  if (error || !snapshot) {
    return (
      <div className={`flex items-center justify-center h-screen ${bg}`}>
        <div className="text-center">
          <p className="text-red-400 text-lg">
            🚫 {error ?? "Cadet not found"}
          </p>
          <p className="text-gray-400 text-sm mt-2">
            You can only view students who have booked classes with you.
          </p>
          <button
            onClick={() => router.back()}
            className="mt-4 text-blue-400 underline text-sm"
          >
            ← Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bg} transition-colors duration-300`}>
      <StudentNav
        studentId={studentId}
        studentName={snapshot.student.name}
        grade={null}
        parentName={snapshot.parentName}
        isTeacherView={true}
        onExitTeacherView={() => router.push("/teacher-students")}
      />

      <div className="pl-64">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* Teacher view banner */}
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center gap-3">
            <span className="text-2xl">👁️</span>
            <div>
              <p className="text-amber-300 font-semibold">
                Teacher View — Read Only
              </p>
              <p className="text-amber-400/70 text-sm">
                You are viewing {snapshot.student.name}'s learning history with
                you. This data is private and only visible to you.
              </p>
            </div>
            <button
              onClick={() => router.push("/teacher-students")}
              className="ml-auto px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm rounded-xl transition-colors flex-shrink-0"
            >
              Exit View
            </button>
          </div>

          {/* Student header */}
          <div className={`${cardBg} rounded-2xl p-6 mb-6`}>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-white font-bold text-2xl">
                {snapshot.student.name.charAt(0)}
              </div>
              <div>
                <h1 className={`text-2xl font-bold ${textPrimary}`}>
                  {snapshot.student.name}
                </h1>
                <p className={`text-sm ${textMuted}`}>
                  Age {snapshot.student.age} · Parent: {snapshot.parentName}
                </p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className={`${cardBg} rounded-2xl p-5`}>
              <span className="text-2xl">📚</span>
              <p className={`text-xs uppercase mt-2 ${textMuted}`}>
                Classes with You
              </p>
              <p className={`text-3xl font-bold ${textPrimary}`}>
                {snapshot.stats.totalClasses}
              </p>
            </div>
            <div className={`${cardBg} rounded-2xl p-5`}>
              <span className="text-2xl">📅</span>
              <p className={`text-xs uppercase mt-2 ${textMuted}`}>Upcoming</p>
              <p className={`text-3xl font-bold ${textPrimary}`}>
                {snapshot.stats.upcomingClasses}
              </p>
            </div>
            <div className={`${cardBg} rounded-2xl p-5`}>
              <span className="text-2xl">⭐</span>
              <p className={`text-xs uppercase mt-2 ${textMuted}`}>
                Avg Rating Given
              </p>
              <p className={`text-3xl font-bold ${textPrimary}`}>
                {snapshot.stats.averageRating
                  ? snapshot.stats.averageRating.toFixed(1)
                  : "—"}
              </p>
            </div>
          </div>

          {/* Next class */}
          {snapshot.nextClass && (
            <div className={`${cardBg} rounded-2xl p-5 mb-6`}>
              <p className={`text-xs uppercase font-medium mb-3 ${textMuted}`}>
                Upcoming Session
              </p>
              <div className="flex items-center gap-4">
                <span className="text-2xl">🗓️</span>
                <div>
                  <p className={`font-semibold ${textPrimary}`}>
                    {new Date(snapshot.nextClass.start).toLocaleDateString(
                      "en-US",
                      {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      },
                    )}
                  </p>
                  <p className={`text-sm ${textMuted}`}>
                    {new Date(snapshot.nextClass.start).toLocaleTimeString(
                      "en-US",
                      { hour: "numeric", minute: "2-digit" },
                    )}{" "}
                    –{" "}
                    {new Date(snapshot.nextClass.end).toLocaleTimeString(
                      "en-US",
                      { hour: "numeric", minute: "2-digit" },
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Class history */}
          <div className={`${cardBg} rounded-2xl p-5`}>
            <p className={`text-xs uppercase font-medium mb-4 ${textMuted}`}>
              Class History ({snapshot.recentBookings.length} sessions)
            </p>
            {snapshot.recentBookings.length === 0 ? (
              <p className={`text-sm text-center py-6 ${textMuted}`}>
                No completed classes yet.
              </p>
            ) : (
              <div className="space-y-3">
                {snapshot.recentBookings.map((b) => (
                  <div
                    key={b.id}
                    className={`flex items-start gap-3 p-3 rounded-xl ${
                      isDark ? "bg-blue-900/10" : "bg-blue-50/50"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-700 to-indigo-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {new Date(b.start).getDate()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${textPrimary}`}>
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
                          <Stars rating={b.rating} />
                          {b.comment && (
                            <p className={`text-xs ${textMuted} truncate`}>
                              "{b.comment}"
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    {b.rating === null && (
                      <span className={`text-xs ${textMuted}`}>No review</span>
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
        <div className="flex items-center justify-center h-screen bg-[#050D1A]">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <StudentViewContent />
    </Suspense>
  );
}
