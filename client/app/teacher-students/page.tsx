// FILE PATH: client/app/teacher-students/page.tsx
"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import TeacherLayout from "../../components/TeacherLayout";
// ─── LUMI CHATBOT ──────────────────────────────────────────────────────────────
import LumiChat from "../../components/LumiChat";
// ──────────────────────────────────────────────────────────────────────────────

interface StudentEntry {
  studentId: string;
  studentName: string;
  parentName?: string;
  parentEmail?: string;
  age?: number;
  grade?: string | null;
  subject?: string | null;
  totalClasses: number;
  completedClasses: number;
  pendingClasses: number;
  lastClassDate?: string | null;
  nextClassDate?: string | null;
  latestReview?: { rating: number; comment: string | null } | null;
}

interface Profile {
  user: { fullName: string; avatarUrl?: string | null };
  rankTier: number;
}

function TeacherStudentsContent() {
  const router = useRouter();

  const [students, setStudents] = useState<StudentEntry[]>([]);
  const [filtered, setFiltered] = useState<StudentEntry[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [search, setSearch] = useState("");
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
        const [studRes, profileRes] = await Promise.all([
          axios.get(`${process.env.NEXT_PUBLIC_API_URL}/teachers/me/students`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${process.env.NEXT_PUBLIC_API_URL}/teachers/me/profile`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        setStudents(studRes.data ?? []);
        setFiltered(studRes.data ?? []);
        setProfile(profileRes.data);
      } catch (e: any) {
        const m = e.response?.data?.message;
        setError(
          Array.isArray(m) ? m.join(", ") : (m ?? "Failed to load students"),
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      students.filter(
        (s) =>
          s.studentName?.toLowerCase().includes(q) ||
          s.grade?.toLowerCase().includes(q) ||
          s.subject?.toLowerCase().includes(q) ||
          s.parentEmail?.toLowerCase().includes(q),
      ),
    );
  }, [search, students]);

  const card =
    "rounded-2xl border dark:bg-gray-900/40 dark:border-purple-900/30 bg-white border-purple-100 shadow-sm";

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen dark:bg-[#0A0714] bg-[#FAF5FF]">
        <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  const upcoming = students.filter((s) => (s.pendingClasses ?? 0) > 0).length;

  return (
    <TeacherLayout
      teacherName={profile?.user?.fullName ?? "Pilot"}
      avatarUrl={profile?.user?.avatarUrl ?? null}
      rankTier={profile?.rankTier ?? 0}
    >
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold dark:text-purple-100 text-purple-900">
              Students
            </h1>
            <p className="text-sm dark:text-purple-400/60 text-purple-400">
              Cadet Roster ✦
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <div className={`${card} px-3 py-2 flex items-center gap-2`}>
              <span className="text-sm dark:text-purple-400/60 text-purple-400">
                {students.length} total
              </span>
            </div>
            {upcoming > 0 && (
              <div className="px-3 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium">
                {upcoming} upcoming
              </div>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="mb-5">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, grade, or subject…"
            className="w-full sm:w-80 px-4 py-2.5 rounded-xl border dark:border-purple-800/40 border-purple-200 dark:bg-[#1A1428] bg-purple-50 dark:text-purple-100 text-purple-900 text-sm placeholder-purple-400/50 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
          />
        </div>

        {error && (
          <div className="mb-5 p-4 rounded-xl bg-red-900/20 border border-red-700/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        {filtered.length === 0 ? (
          <div className={`${card} p-10 sm:p-16 text-center`}>
            <p className="text-4xl mb-3">🛸</p>
            <p className="font-semibold dark:text-purple-100 text-purple-900">
              {search
                ? "No cadets match your search"
                : "No cadets enrolled yet"}
            </p>
            <p className="text-sm dark:text-purple-400/60 text-purple-400 mt-1">
              {search
                ? "Try a different search term"
                : "Students will appear here once they book your classes"}
            </p>
            {!search && (
              <button
                onClick={() => router.push("/calendar")}
                className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-xl transition-colors"
              >
                Add Availability →
              </button>
            )}
          </div>
        ) : (
          <>
            {/* ── Desktop table ── */}
            <div className={`${card} overflow-hidden hidden sm:block`}>
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 border-b dark:border-purple-900/20 border-purple-100">
                {[
                  "Student",
                  "Details",
                  "Classes",
                  "Last Class",
                  "Next Class",
                  "Rating",
                  "",
                ].map((h, i) => (
                  <p
                    key={i}
                    className="text-xs uppercase tracking-wide font-medium dark:text-purple-300/60 text-purple-400"
                  >
                    {h}
                  </p>
                ))}
              </div>

              <div className="divide-y dark:divide-purple-900/20 divide-purple-100">
                {filtered.map((s) => (
                  <div
                    key={s.studentId}
                    className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] gap-4 px-5 py-4 items-center dark:hover:bg-purple-900/10 hover:bg-purple-50/50 transition-colors"
                  >
                    {/* Student name + email */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-violet-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {s.studentName?.charAt(0)?.toUpperCase() ?? "?"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium dark:text-purple-100 text-purple-900 truncate">
                          {s.studentName}
                        </p>
                        <p className="text-xs dark:text-purple-400/50 text-purple-400 truncate">
                          {s.parentEmail ?? "—"}
                        </p>
                      </div>
                    </div>

                    {/* Details */}
                    <div>
                      <p className="text-xs dark:text-purple-400/60 text-purple-400">
                        {s.grade ?? "—"}
                      </p>
                      <p className="text-xs dark:text-purple-400/60 text-purple-400">
                        {s.age ? `Age ${s.age}` : "—"}
                      </p>
                    </div>

                    {/* Classes */}
                    <div>
                      <p className="text-sm font-semibold dark:text-purple-100 text-purple-900">
                        {s.totalClasses}
                      </p>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-full ${
                          s.completedClasses > 0
                            ? "dark:bg-green-900/30 bg-green-100 dark:text-green-400 text-green-700"
                            : "dark:bg-gray-800/40 bg-gray-100 dark:text-gray-500 text-gray-500"
                        }`}
                      >
                        {s.completedClasses} done
                      </span>
                    </div>

                    {/* Last class */}
                    <p className="text-xs dark:text-purple-400/60 text-purple-400">
                      {s.lastClassDate
                        ? new Date(s.lastClassDate).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                            },
                          )
                        : "—"}
                    </p>

                    {/* Next class */}
                    <p className="text-xs dark:text-purple-400/60 text-purple-400">
                      {s.nextClassDate
                        ? new Date(s.nextClassDate).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                            },
                          )
                        : "—"}
                    </p>

                    {/* Rating */}
                    <p className="text-xs dark:text-yellow-400 text-yellow-600">
                      {s.latestReview
                        ? `⭐ ${s.latestReview.rating.toFixed(1)}`
                        : "—"}
                    </p>

                    {/* View Dashboard */}
                    <button
                      onClick={() =>
                        router.push(`/student-dashboard/${s.studentId}`)
                      }
                      className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium
                        dark:bg-purple-900/30 bg-purple-100
                        dark:text-purple-300 text-purple-700
                        dark:hover:bg-purple-800/50 hover:bg-purple-200
                        dark:border dark:border-purple-700/30 border border-purple-200
                        transition-colors whitespace-nowrap"
                    >
                      View Dashboard →
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Mobile cards ── */}
            <div className="sm:hidden space-y-3">
              {filtered.map((s) => (
                <div key={s.studentId} className={`${card} p-4`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-violet-700 flex items-center justify-center text-white font-bold">
                      {s.studentName?.charAt(0)?.toUpperCase() ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold dark:text-purple-100 text-purple-900">
                        {s.studentName}
                      </p>
                      <p className="text-xs dark:text-purple-400/60 text-purple-400">
                        {s.parentEmail ?? ""}
                        {s.age ? ` · Age ${s.age}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center mb-3">
                    <div className="dark:bg-purple-900/20 bg-purple-50 rounded-lg p-2">
                      <p className="font-bold dark:text-purple-100 text-purple-900">
                        {s.totalClasses}
                      </p>
                      <p className="text-xs dark:text-purple-400/60 text-purple-400">
                        Total
                      </p>
                    </div>
                    <div className="dark:bg-purple-900/20 bg-purple-50 rounded-lg p-2">
                      <p className="font-bold dark:text-purple-100 text-purple-900">
                        {s.completedClasses}
                      </p>
                      <p className="text-xs dark:text-purple-400/60 text-purple-400">
                        Done
                      </p>
                    </div>
                    <div className="dark:bg-purple-900/20 bg-purple-50 rounded-lg p-2">
                      <p className="font-bold dark:text-purple-100 text-purple-900">
                        {s.pendingClasses}
                      </p>
                      <p className="text-xs dark:text-purple-400/60 text-purple-400">
                        Upcoming
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      router.push(`/student-dashboard/${s.studentId}`)
                    }
                    className="w-full py-2 rounded-xl text-sm font-medium
                      dark:bg-purple-900/30 bg-purple-100
                      dark:text-purple-300 text-purple-700
                      dark:hover:bg-purple-800/50 hover:bg-purple-200
                      transition-colors"
                  >
                    View Dashboard →
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ─── LUMI CHATBOT ───────────────────────────────────────────────────────
          Fixed bottom-right. variant="teacher" → purple theme, Pilot persona.
          Lumi can help teachers understand a student's engagement, suggest
          teaching strategies, or navigate the platform.
      ─────────────────────────────────────────────────────────────────────── */}
      <LumiChat
        variant="teacher"
        context={`Teacher students roster — ${students.length} total cadets, ${upcoming} with upcoming classes`}
      />
      {/* ──────────────────────────────────────────────────────────────────── */}
    </TeacherLayout>
  );
}

export default function TeacherStudentsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen dark:bg-[#0A0714] bg-[#FAF5FF]">
          <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <TeacherStudentsContent />
    </Suspense>
  );
}
