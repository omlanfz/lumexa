// FILE PATH: client/app/student-dashboard/[studentId]/page.tsx
//
// ─── Changes in this version ───────────────────────────────────────────────
//
// Issue 14 — Sidebar Collapse Broken:
//   • Sidebar open/close is now persisted to localStorage under
//     "student_sidebar_open". A lazy initializer reads it on mount so the
//     sidebar is in the correct state from the very first render with no
//     visible flash.
//   • toggleSidebar() writes the new value back so it survives refreshes.
//   • Dark mode is fixed at the layout/ThemeProvider level (see layout.tsx
//     and ThemeProvider.tsx) — no changes needed here for dark mode itself.
//
// Issue 15 — Student Avatar Upload 404:
//   • COPPA decision: students are data-minimised (name + age only).
//     Avatar upload UI and the handleAvatarUpload function have been removed.
//   • The sidebar now shows a gradient initials circle. No upload button,
//     no hidden <input type="file">, no POST /students/:id/avatar call.
//   • avatarUrl field removed from StudentData type.
//
// Issue 16 — My Teachers Page 404:
//   • The "My Teachers" nav item previously had no href and only set an
//     in-page activeTab. The dedicated page
//     /student-teachers/[studentId]/page.tsx already exists.
//   • Added href: `/student-teachers/${student?.id}` to the My Teachers item.
//   • Added href: `/student-recordings/${student?.id}` to the Recordings item
//     (same pattern — dedicated page exists, in-page tab removed).
//   • The inline "teachers" and "recordings" activeTab sections are kept as
//     fallback but the nav now routes out to the standalone pages.
//
// All Issue 10 + 11 fixes (teacher view, correct booking endpoint) unchanged.

"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import LumiChat from "../../../components/LumiChat";

const API = process.env.NEXT_PUBLIC_API_URL;

// ── Helpers ────────────────────────────────────────────────────────────────

function getRoleFromToken(token: string): "PARENT" | "TEACHER" | "ADMIN" {
  try {
    const b64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(b64));
    return payload.role ?? "PARENT";
  } catch {
    return "PARENT";
  }
}

// Issue 14: lazy initializer — reads localStorage only in the browser.
// Returns true (sidebar open) unless the user previously closed it.
function readSidebarPreference(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem("student_sidebar_open") !== "false";
}

// ── Types ──────────────────────────────────────────────────────────────────

interface StudentData {
  id: string;
  name: string; // students use .name — NOT .fullName
  age?: number | null;
  grade?: string | null;
  subject?: string | null;
  // avatarUrl intentionally omitted — Issue 15 / COPPA: initials only
}

interface Booking {
  id: string;
  paymentStatus: string;
  shift: { start: string; end: string };
  teacher?: { fullName?: string; avatarUrl?: string | null } | null;
  review?: { rating: number; comment?: string | null } | null;
}

interface Stats {
  upcoming: number;
  total: number;
  completed: number;
  hoursLearned: number;
}

// Shape returned by GET /teachers/me/students/:id/dashboard (Issue 10)
interface TeacherDashboardPayload {
  student: StudentData;
  parentInfo: { fullName: string; email: string };
  viewingTeacher: { id: string; fullName: string; avatarUrl: string | null };
  stats: {
    total: number;
    completed: number;
    upcoming: number;
    hoursLearned: number;
  };
  avgRating: number | null;
  bookings: Booking[];
}

// ── Sidebar ────────────────────────────────────────────────────────────────

function StudentSidebar({
  student,
  activeTab,
  onTab,
  sidebarOpen,
  onToggle,
  isTeacherView,
}: {
  student: StudentData | null;
  activeTab: string;
  onTab: (t: string) => void;
  sidebarOpen: boolean;
  onToggle: () => void;
  isTeacherView: boolean;
}) {
  const router = useRouter();

  // Issue 16: My Teachers and Recordings now link to dedicated pages
  const navItems = [
    { id: "overview", label: "Dashboard", icon: "🏠", sub: "Home Base" },
    { id: "schedule", label: "Schedule", icon: "📅", sub: "My Classes" },
    {
      id: "progress",
      label: "Progress",
      icon: "📈",
      sub: "My Journey",
      href: student?.id ? `/student-progress/${student.id}` : undefined,
    },
    {
      id: "teachers",
      label: "My Teachers",
      icon: "👨‍🏫",
      sub: "Crew",
      // Issue 16 fix: route to the dedicated /student-teachers page
      href: student?.id ? `/student-teachers/${student.id}` : undefined,
    },
    {
      id: "recordings",
      label: "Recordings",
      icon: "🎬",
      sub: "Replays",
      // Route to the dedicated /student-recordings page
      href: student?.id ? `/student-recordings/${student.id}` : undefined,
    },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={onToggle}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-64 z-30 flex flex-col
          bg-[#060E1F] border-r border-blue-900/30
          transition-transform duration-300 lg:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Logo */}
        <div className="p-4 border-b border-blue-900/20 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-sm select-none">
            L
          </div>
          <div>
            <p className="font-bold text-white text-sm">Lumexa</p>
            <p className="text-xs text-blue-400">
              {isTeacherView ? "Teacher View" : "Mission Control"}
            </p>
          </div>
        </div>

        {/*
          Issue 15 — COPPA: initials-only avatar.
          The previous version showed an upload button and called
          POST /students/:id/avatar which returned 404.
          That entire block has been removed. Students only show a gradient
          circle with their initial — no upload UI, no file input.
        */}
        <div className="px-4 py-4 border-b border-blue-900/20">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-cyan-700 flex items-center justify-center font-bold text-white text-xl select-none">
            {student?.name ? student.name.charAt(0).toUpperCase() : "…"}
          </div>
          <p className="font-semibold text-white mt-2 text-sm">
            {student?.name ?? "Loading…"}
          </p>
          <p className="text-xs text-blue-400">
            {student?.grade ? `${student.grade} · ` : ""}Age{" "}
            {student?.age ?? "…"} · Cadet
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                // Issue 16: if the item has an href, navigate; otherwise switch tab
                if (item.href) router.push(item.href);
                else onTab(item.id);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                activeTab === item.id && !item.href
                  ? "bg-blue-600 text-white"
                  : "text-blue-300/60 hover:bg-blue-900/30 hover:text-blue-200"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs opacity-60">{item.sub}</p>
              </div>
            </button>
          ))}
        </nav>

        {/* Back link */}
        <div className="p-4 border-t border-blue-900/20">
          <button
            onClick={() =>
              router.push(isTeacherView ? "/teacher-students" : "/dashboard")
            }
            className="w-full text-xs text-blue-400 hover:text-blue-300 text-left transition-colors"
          >
            ←{" "}
            {isTeacherView ? "Back to My Students" : "Back to Parent Dashboard"}
          </button>
        </div>
      </aside>
    </>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

function StudentDashboardContent() {
  const { studentId } = useParams<{ studentId: string }>();
  const router = useRouter();

  const [student, setStudent] = useState<StudentData | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<Stats>({
    upcoming: 0,
    total: 0,
    completed: 0,
    hoursLearned: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Issue 14: sidebar state initialised from localStorage (lazy initializer)
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(
    readSidebarPreference,
  );

  // Issue 10: teacher view state
  const [isTeacherView, setIsTeacherView] = useState(false);
  const [teacherName, setTeacherName] = useState<string | null>(null);

  // Issue 14: keep sidebar open on desktop regardless of persisted mobile state
  useEffect(() => {
    const syncDesktop = () => {
      if (window.innerWidth >= 1024) setSidebarOpen(true);
    };
    syncDesktop();
    window.addEventListener("resize", syncDesktop);
    return () => window.removeEventListener("resize", syncDesktop);
  }, []);

  // Issue 14: toggle + persist
  const toggleSidebar = () => {
    const next = !sidebarOpen;
    setSidebarOpen(next);
    try {
      localStorage.setItem("student_sidebar_open", String(next));
    } catch (_) {}
  };

  useEffect(() => {
    const tok = localStorage.getItem("token");
    if (!tok) {
      router.push("/login");
      return;
    }

    const role = getRoleFromToken(tok);

    (async () => {
      try {
        if (role === "TEACHER") {
          // ── Issue 10 + 11: teacher path ─────────────────────────────────
          setIsTeacherView(true);
          const res = await axios.get<TeacherDashboardPayload>(
            `${API}/teachers/me/students/${studentId}/dashboard`,
            { headers: { Authorization: `Bearer ${tok}` } },
          );
          const d = res.data;
          setStudent(d.student);
          setTeacherName(d.viewingTeacher.fullName);
          setBookings(d.bookings);
          setStats({
            total: d.stats.total,
            completed: d.stats.completed,
            upcoming: d.stats.upcoming,
            hoursLearned: d.stats.hoursLearned,
          });
        } else {
          // ── Issue 11: parent path — correct endpoints ────────────────────
          // GET /bookings/my  (NOT the admin-only GET /bookings)
          const [sRes, bRes] = await Promise.all([
            axios.get(`${API}/students`, {
              headers: { Authorization: `Bearer ${tok}` },
            }),
            axios
              .get(`${API}/bookings/my`, {
                headers: { Authorization: `Bearer ${tok}` },
              })
              .catch(() => ({ data: [] })),
          ]);

          const students = Array.isArray(sRes.data) ? sRes.data : [];
          const found: StudentData | null =
            students.find((s: StudentData) => s.id === studentId) ?? null;
          setStudent(found);

          const allBookings: Booking[] = Array.isArray(bRes.data)
            ? bRes.data
            : [];
          const myBookings = allBookings.filter(
            (b: any) =>
              b.studentId === studentId || b.student?.id === studentId,
          );
          setBookings(myBookings);

          const now = new Date();
          const completed = myBookings.filter(
            (b) =>
              b.paymentStatus === "CAPTURED" && new Date(b.shift.end) < now,
          );
          const upcoming = myBookings.filter(
            (b) => new Date(b.shift.start) > now,
          );
          const hoursLearned = completed.reduce((s, b) => {
            const ms =
              new Date(b.shift.end).getTime() -
              new Date(b.shift.start).getTime();
            return s + ms / 3_600_000;
          }, 0);

          setStats({
            upcoming: upcoming.length,
            total: myBookings.length,
            completed: completed.length,
            hoursLearned: Math.round(hoursLearned * 10) / 10,
          });
        }
      } catch (e: any) {
        const status = e.response?.status;
        if (status === 403) {
          setError(
            "You don't have permission to view this student's dashboard.",
          );
        } else if (status === 404) {
          setError("Student not found.");
        } else {
          const m = e.response?.data?.message;
          setError(
            Array.isArray(m)
              ? m.join(", ")
              : (m ?? "Failed to load dashboard. Please try again."),
          );
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [studentId, router]);

  // ── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#050D1A]">
        <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#050D1A] gap-4 px-4">
        <p className="text-4xl">🚫</p>
        <p className="text-red-400 text-sm max-w-sm text-center">{error}</p>
        <button
          onClick={() =>
            router.push(isTeacherView ? "/teacher-students" : "/dashboard")
          }
          className="text-blue-400 underline text-sm"
        >
          ← Go back
        </button>
      </div>
    );
  }

  // ── Derived lists ─────────────────────────────────────────────────────────

  const upcomingBookings = bookings.filter(
    (b) => new Date(b.shift.start) > new Date(),
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

  const card = "rounded-2xl border bg-[#0D1B2E]/60 border-blue-900/30";
  const txtp = "text-blue-100";
  const txtm = "text-blue-300/60";

  return (
    <div className="min-h-screen bg-[#050D1A] text-white flex">
      <StudentSidebar
        student={student}
        activeTab={activeTab}
        onTab={setActiveTab}
        sidebarOpen={sidebarOpen}
        onToggle={toggleSidebar}
        isTeacherView={isTeacherView}
      />

      {/* Issue 14: toggle button calls toggleSidebar() which persists state */}
      <button
        onClick={toggleSidebar}
        className={`fixed top-4 z-40 w-8 h-8 rounded-full
          bg-[#0D1B2E] border border-blue-900/40
          flex items-center justify-center
          text-blue-400 hover:text-blue-200
          transition-all duration-300 shadow-lg
          ${sidebarOpen ? "left-[268px]" : "left-4"}`}
        aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
      >
        {sidebarOpen ? "‹" : "›"}
      </button>

      <main
        className={`flex-1 min-w-0 transition-all duration-300
          ${sidebarOpen ? "lg:ml-64" : "ml-0"}
          p-4 sm:p-6 pt-16 lg:pt-6`}
      >
        {/* Issue 10 — Read-only teacher view banner */}
        {isTeacherView && (
          <div className="mb-5 px-4 py-3 rounded-xl bg-purple-900/30 border border-purple-700/40 flex items-center gap-3">
            <span className="text-lg">👁️</span>
            <div>
              <p className="text-sm font-medium text-purple-200">
                Teacher View — Read Only
              </p>
              <p className="text-xs text-purple-400/70">
                Viewing{" "}
                <span className="font-medium text-purple-300">
                  {student?.name ?? "this student"}
                </span>
                's classes with you ({teacherName ?? "Teacher"}).
              </p>
            </div>
          </div>
        )}

        {/* ── Overview Tab ── */}
        {activeTab === "overview" && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h1 className={`text-2xl font-bold ${txtp}`}>
                {isTeacherView
                  ? `${student?.name ?? "Student"}'s Dashboard 👤`
                  : `Welcome back, ${student?.name ?? "Cadet"} 👋`}
              </h1>
              <p className={`text-sm mt-1 ${txtm}`}>
                {isTeacherView
                  ? "Classes between you and this student"
                  : "Cadet Dashboard · Your Learning Mission"}
              </p>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                {
                  icon: "📅",
                  label: "Upcoming",
                  value: stats.upcoming,
                  color: "text-cyan-400",
                },
                {
                  icon: "✅",
                  label: "Completed",
                  value: stats.completed,
                  color: "text-green-400",
                },
                {
                  icon: "📚",
                  label: "Total Booked",
                  value: stats.total,
                  color: "text-blue-400",
                },
                {
                  icon: "⏱️",
                  label: "Hours Learned",
                  value: `${stats.hoursLearned}h`,
                  color: "text-purple-400",
                },
              ].map((s) => (
                <div key={s.label} className={`${card} p-4 text-center`}>
                  <span className="text-2xl">{s.icon}</span>
                  <p className={`text-2xl font-bold mt-2 ${s.color}`}>
                    {s.value}
                  </p>
                  <p className={`text-xs mt-0.5 ${txtm}`}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* Find a Teacher CTA — hidden for teacher view */}
            {!isTeacherView && (
              <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-900/40 to-cyan-900/20 border border-blue-800/30">
                <h3 className={`font-semibold text-lg mb-1 ${txtp}`}>
                  Ready to learn? 🚀
                </h3>
                <p className={`text-sm mb-4 ${txtm}`}>
                  Browse available teachers and book your next session.
                </p>
                <button
                  onClick={() =>
                    router.push(`/marketplace?studentId=${studentId}`)
                  }
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500
                    text-white rounded-xl font-semibold text-sm
                    transition-all shadow-lg shadow-blue-500/20"
                >
                  Find a Teacher 🔭
                </button>
              </div>
            )}

            {/* Upcoming classes */}
            {upcomingBookings.length > 0 && (
              <div className={`${card} p-5`}>
                <p className={`text-xs uppercase font-medium mb-4 ${txtm}`}>
                  Upcoming Classes
                </p>
                <div className="space-y-3">
                  {upcomingBookings.slice(0, 3).map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-blue-900/10 border border-blue-900/20"
                    >
                      <div className="w-10 h-10 rounded-lg bg-blue-700 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-sm font-bold">
                          {new Date(b.shift.start).getDate()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${txtp} truncate`}>
                          {b.teacher?.fullName ?? "Teacher"}
                        </p>
                        <p className={`text-xs ${txtm}`}>
                          {new Date(b.shift.start).toLocaleString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <span className="text-xs px-2 py-1 bg-blue-600/20 text-blue-300 rounded-full border border-blue-600/30 flex-shrink-0">
                        Upcoming
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent sessions */}
            {recentCompleted.length > 0 && (
              <div className={`${card} p-5`}>
                <p className={`text-xs uppercase font-medium mb-4 ${txtm}`}>
                  Recent Sessions
                </p>
                <div className="space-y-3">
                  {recentCompleted.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-green-900/10 border border-green-900/20"
                    >
                      <div className="w-10 h-10 rounded-lg bg-green-900/40 border border-green-800/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-green-400 text-lg">✅</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${txtp} truncate`}>
                          {b.teacher?.fullName ?? "Teacher"}
                        </p>
                        <p className={`text-xs ${txtm}`}>
                          {new Date(b.shift.start).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      {b.review ? (
                        <div className="flex gap-0.5 flex-shrink-0">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <span
                              key={s}
                              className={`text-xs ${
                                s <= (b.review?.rating ?? 0)
                                  ? "text-yellow-400"
                                  : "text-gray-600"
                              }`}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className={`text-xs ${txtm} flex-shrink-0`}>
                          No review
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {bookings.length === 0 && (
              <div className={`${card} p-10 text-center`}>
                <p className="text-4xl mb-3">🌌</p>
                <p className={`font-semibold ${txtp}`}>No classes yet</p>
                <p className={`text-sm mt-1 ${txtm}`}>
                  {isTeacherView
                    ? "No classes have been booked between you and this student."
                    : "Book your first lesson to get started!"}
                </p>
                {!isTeacherView && (
                  <button
                    onClick={() =>
                      router.push(`/marketplace?studentId=${studentId}`)
                    }
                    className="mt-4 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition-all"
                  >
                    Browse Teachers
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Schedule Tab ── */}
        {activeTab === "schedule" && (
          <div className="max-w-3xl mx-auto">
            <h2 className={`text-xl font-bold mb-6 ${txtp}`}>My Schedule</h2>
            {upcomingBookings.length === 0 ? (
              <div className={`${card} p-10 text-center`}>
                <p className="text-4xl mb-3">📅</p>
                <p className={txtp}>No upcoming classes.</p>
                {!isTeacherView && (
                  <button
                    onClick={() =>
                      router.push(`/marketplace?studentId=${studentId}`)
                    }
                    className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-all"
                  >
                    Book a Class
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingBookings.map((b) => (
                  <div
                    key={b.id}
                    className={`${card} p-4 flex items-center gap-4`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-blue-700 flex flex-col items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-medium">
                        {new Date(b.shift.start).toLocaleDateString("en-US", {
                          month: "short",
                        })}
                      </span>
                      <span className="text-white text-lg font-bold leading-none">
                        {new Date(b.shift.start).getDate()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold ${txtp}`}>
                        {b.teacher?.fullName ?? "Teacher"}
                      </p>
                      <p className={`text-xs ${txtm} mt-0.5`}>
                        {new Date(b.shift.start).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}{" "}
                        –{" "}
                        {new Date(b.shift.end).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-1 bg-blue-600/20 text-blue-300 rounded-full border border-blue-600/30">
                      Upcoming
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
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
