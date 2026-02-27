// FILE PATH: client/app/student-dashboard/[studentId]/page.tsx
"use client";
import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";

const API = process.env.NEXT_PUBLIC_API_URL;

// ── Types ──────────────────────────────────────────────────────────────────
interface StudentData {
  id: string;
  name: string; // ← students have .name, NOT .fullName
  age?: number | null;
  grade?: string | null;
  avatarUrl?: string | null;
}

interface Booking {
  id: string;
  paymentStatus: string;
  shift: { start: string; end: string };
  teacher?: { fullName?: string; avatarUrl?: string } | null;
  review?: { rating: number } | null;
}

interface Stats {
  upcoming: number;
  total: number;
  completed: number;
  hoursLearned: number;
}

// ── Sidebar ────────────────────────────────────────────────────────────────
function StudentSidebar({
  student,
  activeTab,
  onTab,
  onAvatarUpload,
  uploadingAvatar,
  sidebarOpen,
  onToggle,
}: {
  student: StudentData | null;
  activeTab: string;
  onTab: (t: string) => void;
  onAvatarUpload: (f: File) => void;
  uploadingAvatar: boolean;
  sidebarOpen: boolean;
  onToggle: () => void;
}) {
  const router = useRouter();

  const navItems = [
    { id: "overview", label: "Dashboard", icon: "🏠", sub: "Home Base" },
    { id: "schedule", label: "Schedule", icon: "📅", sub: "My Classes" },
    {
      id: "progress",
      label: "Progress",
      icon: "📈",
      sub: "My Journey",
      href: `/student-progress/${student?.id}`,
    },
    { id: "teachers", label: "My Teachers", icon: "👨‍🏫", sub: "Crew" },
    { id: "recordings", label: "Recordings", icon: "🎬", sub: "Replays" },
  ];

  return (
    <>
      {/* Overlay on mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 z-30 flex flex-col
          bg-[#060E1F] border-r border-blue-900/30
          transition-transform duration-300 lg:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Logo */}
        <div className="p-4 border-b border-blue-900/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-sm">
              L
            </div>
            <div>
              <p className="font-bold text-white text-sm">Lumexa</p>
              <p className="text-xs text-blue-400">Mission Control</p>
            </div>
          </div>
        </div>

        {/* Avatar + Student */}
        <div className="px-4 py-4 border-b border-blue-900/20">
          <label className="relative cursor-pointer group inline-block">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-blue-700 flex items-center justify-center font-bold text-white text-xl">
              {student?.avatarUrl ? (
                <img
                  src={student.avatarUrl}
                  alt={student?.name ?? ""}
                  className="w-full h-full object-cover"
                />
              ) : /* SAFE: student might be null while loading */
              student?.name ? (
                student.name.charAt(0).toUpperCase()
              ) : (
                "…"
              )}
            </div>
            {uploadingAvatar && (
              <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-blue-600 rounded-full border-2 border-[#060E1F] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-white text-xs">✎</span>
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) =>
                e.target.files?.[0] && onAvatarUpload(e.target.files[0])
              }
            />
          </label>
          <p className="font-semibold text-white mt-2 text-sm">
            {/* SAFE: shows Loading… until student data arrives */}
            {student?.name ?? "Loading…"}
          </p>
          <p className="text-xs text-blue-400">
            {student?.grade ? `${student.grade} · ` : ""}Age{" "}
            {student?.age ?? "…"} · Cadet
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (item.href) {
                  router.push(item.href);
                } else {
                  onTab(item.id);
                }
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                activeTab === item.id
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

        {/* Bottom */}
        <div className="p-4 border-t border-blue-900/20">
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full text-xs text-blue-400 hover:text-blue-300 text-left transition-colors"
          >
            ← Back to Parent Dashboard
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

  // CHANGE: all state typed explicitly — no implicit any
  const [student, setStudent] = useState<StudentData | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<Stats>({
    upcoming: 0,
    total: 0,
    completed: 0,
    hoursLearned: 0,
  });
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    // Auto-open sidebar on desktop
    const check = () => setSidebarOpen(window.innerWidth >= 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const tok = localStorage.getItem("token");
    if (!tok) {
      router.push("/login");
      return;
    }

    (async () => {
      try {
        const [sRes, bRes] = await Promise.all([
          axios.get(`${API}/students`, {
            headers: { Authorization: `Bearer ${tok}` },
          }),
          // CHANGE: /bookings/my — correct endpoint
          axios
            .get(`${API}/bookings/my`, {
              headers: { Authorization: `Bearer ${tok}` },
            })
            .catch(() => ({ data: [] })), // graceful fallback
        ]);

        // CHANGE: safe array check before .find()
        const students = Array.isArray(sRes.data) ? sRes.data : [];
        const found: StudentData | null =
          students.find((s: StudentData) => s.id === studentId) ?? null;
        setStudent(found);

        // CHANGE: safe array filter
        const allBookings: Booking[] = Array.isArray(bRes.data)
          ? bRes.data
          : [];
        const myBookings = allBookings.filter(
          (b: any) => b.studentId === studentId || b.student?.id === studentId,
        );
        setBookings(myBookings);

        const now = new Date();
        const completed = myBookings.filter(
          (b) => b.paymentStatus === "CAPTURED" && new Date(b.shift.end) < now,
        );
        const upcoming = myBookings.filter(
          (b) => new Date(b.shift.start) > now,
        );
        const hoursLearned = completed.reduce((s, b) => {
          const ms =
            new Date(b.shift.end).getTime() - new Date(b.shift.start).getTime();
          return s + ms / 3_600_000;
        }, 0);

        setStats({
          upcoming: upcoming.length,
          total: myBookings.length,
          completed: completed.length,
          hoursLearned: Math.round(hoursLearned * 10) / 10,
        });
      } catch {
        // silent — UI will show empty states
      } finally {
        setLoading(false);
      }
    })();
  }, [studentId, router]);

  async function handleAvatarUpload(file: File) {
    const tok = localStorage.getItem("token");
    if (!tok || !student) return;
    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await axios.post(`${API}/students/${student.id}/avatar`, fd, {
        headers: {
          Authorization: `Bearer ${tok}`,
          "Content-Type": "multipart/form-data",
        },
      });
      setStudent((prev) =>
        prev ? { ...prev, avatarUrl: res.data.avatarUrl } : prev,
      );
    } catch {
      // Could show an error toast here — no silent crash
      console.error("Avatar upload failed");
    } finally {
      setUploadingAvatar(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#050D1A]">
        <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Sidebar toggle button (outside sidebar for accessibility) ──────────
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
        onAvatarUpload={handleAvatarUpload}
        uploadingAvatar={uploadingAvatar}
        sidebarOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((v) => !v)}
      />

      {/* Sidebar toggle button */}
      <button
        onClick={() => setSidebarOpen((v) => !v)}
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

      {/* Main */}
      <main
        className={`flex-1 min-w-0 transition-all duration-300
          ${sidebarOpen ? "lg:ml-64" : "ml-0"}
          p-4 sm:p-6 pt-16 lg:pt-6`}
      >
        {/* ── Overview Tab ── */}
        {activeTab === "overview" && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Greeting */}
            <div>
              {/* CHANGE: student?.name — never student.fullName */}
              <h1 className={`text-2xl font-bold ${txtp}`}>
                Welcome back, {student?.name ?? "Cadet"} 👋
              </h1>
              <p className={`text-sm mt-1 ${txtm}`}>
                Cadet Dashboard · Your Learning Mission
              </p>
            </div>

            {/* Stats */}
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

            {/* Find a Teacher CTA */}
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
                          {/* CHANGE: safe optional chain */}
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
                              className={`text-xs ${s <= (b.review?.rating ?? 0) ? "text-yellow-400" : "text-gray-600"}`}
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
                  Book your first lesson to get started!
                </p>
                <button
                  onClick={() =>
                    router.push(`/marketplace?studentId=${studentId}`)
                  }
                  className="mt-4 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition-all"
                >
                  Browse Teachers
                </button>
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
                <p className={`${txtp}`}>No upcoming classes.</p>
                <button
                  onClick={() =>
                    router.push(`/marketplace?studentId=${studentId}`)
                  }
                  className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-all"
                >
                  Book a Class
                </button>
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

        {/* ── Teachers Tab ── */}
        {activeTab === "teachers" && (
          <div className="max-w-3xl mx-auto">
            <h2 className={`text-xl font-bold mb-6 ${txtp}`}>My Teachers</h2>
            {recentCompleted.length === 0 ? (
              <div className={`${card} p-10 text-center`}>
                <p className="text-4xl mb-3">👨‍🏫</p>
                <p className={`${txtp}`}>No teachers yet.</p>
                <button
                  onClick={() =>
                    router.push(`/marketplace?studentId=${studentId}`)
                  }
                  className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition-all"
                >
                  Find a Teacher
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Deduplicated teacher list */}
                {Array.from(
                  new Map(
                    recentCompleted
                      .filter((b) => b.teacher?.fullName)
                      .map((b) => [b.teacher!.fullName, b]),
                  ).values(),
                ).map((b) => (
                  <div
                    key={b.teacher?.fullName}
                    className={`${card} p-4 flex items-center gap-3`}
                  >
                    <div className="w-11 h-11 rounded-full bg-purple-700 flex items-center justify-center font-bold text-white flex-shrink-0">
                      {/* CHANGE: safe charAt with fallback */}
                      {(b.teacher?.fullName ?? "T").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className={`font-semibold text-sm ${txtp}`}>
                        {b.teacher?.fullName}
                      </p>
                      <p className={`text-xs ${txtm}`}>Pilot ✦</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Recordings Tab ── */}
        {activeTab === "recordings" && (
          <div className="max-w-3xl mx-auto">
            <h2 className={`text-xl font-bold mb-6 ${txtp}`}>
              Class Recordings
            </h2>
            <div className={`${card} p-10 text-center`}>
              <p className="text-4xl mb-3">🎬</p>
              <p className={`${txtp}`}>Recordings appear here after classes.</p>
            </div>
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

// // FILE PATH: client/app/student-dashboard/[studentId]/page.tsx
// "use client";
// import { Suspense, useEffect, useState } from "react";
// import { useParams, useRouter } from "next/navigation";
// import axios from "axios";
// import StudentNav from "../../../components/StudentNav";
// import { useTheme } from "../../../components/ThemeProvider";

// const API = process.env.NEXT_PUBLIC_API_URL;

// interface StudentData {
//   id: string;
//   name: string;
//   age: number;
//   grade?: string | null;
//   subject?: string | null;
//   parent: { fullName: string; email: string };
// }
// interface BookingItem {
//   id: string;
//   studentId?: string;
//   student?: { id: string };
//   shift: { start: string; end: string };
//   paymentStatus: string;
//   teacher?: { fullName: string; avatarUrl?: string | null };
//   review?: { rating: number; comment?: string | null } | null;
// }

// const TIERS = [
//   { name: "Starchild", min: 0, icon: "🌟", grad: "from-sky-400 to-blue-500" },
//   { name: "Explorer", min: 5, icon: "🔭", grad: "from-blue-500 to-cyan-600" },
//   { name: "Cosmonaut", min: 15, icon: "🛸", grad: "from-cyan-500 to-blue-600" },
//   {
//     name: "Navigator",
//     min: 30,
//     icon: "🧭",
//     grad: "from-blue-600 to-indigo-600",
//   },
//   {
//     name: "Captain",
//     min: 60,
//     icon: "🎖️",
//     grad: "from-indigo-600 to-purple-600",
//   },
//   {
//     name: "Galaxy Cmdr",
//     min: 100,
//     icon: "🌌",
//     grad: "from-purple-600 to-fuchsia-600",
//   },
// ];

// const BADGES = [
//   { id: "b1", icon: "🚀", label: "First Mission", req: (n: number) => n >= 1 },
//   { id: "b2", icon: "🌍", label: "Orbit Entry", req: (n: number) => n >= 5 },
//   { id: "b3", icon: "🛸", label: "Deep Space", req: (n: number) => n >= 10 },
//   { id: "b4", icon: "🌌", label: "Galaxy", req: (n: number) => n >= 25 },
//   {
//     id: "b5",
//     icon: "🔥",
//     label: "On Fire",
//     req: (_: number, hrs: number) => hrs >= 5,
//   },
//   {
//     id: "b6",
//     icon: "⏰",
//     label: "10h Learner",
//     req: (_: number, hrs: number) => hrs >= 10,
//   },
//   {
//     id: "b7",
//     icon: "💫",
//     label: "50h Legend",
//     req: (_: number, hrs: number) => hrs >= 50,
//   },
//   { id: "b8", icon: "🌠", label: "Century", req: (n: number) => n >= 100 },
// ];

// function Stars({ r }: { r: number }) {
//   return (
//     <span className="flex gap-0.5">
//       {[1, 2, 3, 4, 5].map((s) => (
//         <span
//           key={s}
//           className={`text-sm ${s <= r ? "text-yellow-400" : "text-gray-500"}`}
//         >
//           ★
//         </span>
//       ))}
//     </span>
//   );
// }

// function Countdown({ target }: { target: string }) {
//   const [rem, setRem] = useState(0);
//   useEffect(() => {
//     const calc = () => Math.max(0, new Date(target).getTime() - Date.now());
//     setRem(calc());
//     const id = setInterval(() => setRem(calc()), 1000);
//     return () => clearInterval(id);
//   }, [target]);
//   const h = Math.floor(rem / 3600000),
//     m = Math.floor((rem % 3600000) / 60000),
//     s = Math.floor((rem % 60000) / 1000);
//   return (
//     <div className="flex gap-2 mt-2">
//       {[
//         { v: h, l: "HRS" },
//         { v: m, l: "MIN" },
//         { v: s, l: "SEC" },
//       ].map(({ v, l }) => (
//         <div
//           key={l}
//           className="text-center px-2.5 py-1.5 rounded-lg dark:bg-blue-900/30 bg-blue-100"
//         >
//           <p className="text-xl font-bold tabular-nums dark:text-blue-200 text-blue-800">
//             {String(v).padStart(2, "0")}
//           </p>
//           <p className="text-xs dark:text-blue-400 text-blue-500">{l}</p>
//         </div>
//       ))}
//     </div>
//   );
// }

// function StudentDashboardContent() {
//   const { studentId } = useParams<{ studentId: string }>();
//   const router = useRouter();
//   const { isDark } = useTheme();
//   const [student, setStudent] = useState<StudentData | null>(null);
//   const [bookings, setBookings] = useState<BookingItem[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   useEffect(() => {
//     const tok = localStorage.getItem("token");
//     if (!tok) {
//       router.push("/login");
//       return;
//     }
//     (async () => {
//       try {
//         const [sRes, bRes] = await Promise.all([
//           axios.get(`${process.env.NEXT_PUBLIC_API_URL}/students`, {
//             headers: { Authorization: `Bearer ${tok}` },
//           }),
//           axios
//             .get(`${process.env.NEXT_PUBLIC_API_URL}/bookings`, {
//               headers: { Authorization: `Bearer ${tok}` },
//             })
//             .catch(() => ({ data: [] })),
//         ]);
//         const found = (sRes.data as StudentData[]).find(
//           (s) => s.id === studentId,
//         );
//         if (!found) {
//           setError("Student not found");
//           setLoading(false);
//           return;
//         }
//         setStudent(found);
//         const all: BookingItem[] = Array.isArray(bRes.data) ? bRes.data : [];
//         setBookings(
//           all.filter(
//             (b) => b.studentId === studentId || b.student?.id === studentId,
//           ),
//         );
//       } catch (e: any) {
//         const m = e.response?.data?.message;
//         setError(Array.isArray(m) ? m.join(", ") : (m ?? "Error"));
//       } finally {
//         setLoading(false);
//       }
//     })();
//   }, [studentId, router]);

//   if (loading)
//     return (
//       <div className="flex items-center justify-center h-screen dark:bg-[#050D1A] bg-[#F0F5FF]">
//         <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
//       </div>
//     );
//   if (error || !student)
//     return (
//       <div className="flex flex-col items-center justify-center h-screen dark:bg-[#050D1A] bg-[#F0F5FF] gap-4">
//         <p className="text-red-400">{error ?? "Not found"}</p>
//         <button
//           onClick={() => router.push("/dashboard")}
//           className="text-blue-400 underline text-sm"
//         >
//           ← Back
//         </button>
//       </div>
//     );

//   const completed = bookings.filter((b) => b.paymentStatus === "CAPTURED");
//   const upcoming = bookings
//     .filter(
//       (b) =>
//         b.paymentStatus === "CAPTURED" && new Date(b.shift.start) > new Date(),
//     )
//     .sort(
//       (a, b) =>
//         new Date(a.shift.start).getTime() - new Date(b.shift.start).getTime(),
//     );
//   const totalHrs = completed.reduce((sum, b) => {
//     const m =
//       (new Date(b.shift.end).getTime() - new Date(b.shift.start).getTime()) /
//       60000;
//     return sum + m / 60;
//   }, 0);
//   const totalClasses = completed.length;
//   const currentTier =
//     [...TIERS].reverse().find((t) => totalClasses >= t.min) ?? TIERS[0];
//   const nextTier = TIERS[TIERS.indexOf(currentTier) + 1];
//   const progress = nextTier
//     ? Math.min(
//         100,
//         Math.round(
//           ((totalClasses - currentTier.min) /
//             (nextTier.min - currentTier.min)) *
//             100,
//         ),
//       )
//     : 100;
//   const recent = completed
//     .slice()
//     .sort(
//       (a, b) =>
//         new Date(b.shift.start).getTime() - new Date(a.shift.start).getTime(),
//     )
//     .slice(0, 5);
//   const earnedBadges = BADGES.filter((b) => b.req(totalClasses, totalHrs));
//   const nextClass = upcoming[0];

//   const card =
//     "rounded-2xl border dark:bg-[#0D1B2E]/60 bg-white dark:border-blue-900/30 border-blue-100";
//   const txtp = "dark:text-blue-100 text-blue-900";
//   const txtm = "dark:text-blue-300/60 text-blue-400";

//   return (
//     <div className="min-h-screen dark:bg-[#050D1A] bg-[#F0F5FF]">
//       <StudentNav
//         studentId={studentId}
//         studentName={student.name}
//         grade={student.grade}
//         parentName={student.parent.fullName}
//       />
//       <div className="pl-64">
//         <div className="max-w-5xl mx-auto px-6 py-8">
//           {/* Hero */}
//           <div className={`${card} p-6 mb-6 relative overflow-hidden`}>
//             <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-cyan-900/10 pointer-events-none" />
//             <div className="relative flex items-center gap-5 flex-wrap">
//               <div
//                 className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${currentTier.grad} flex items-center justify-center text-white font-bold text-2xl flex-shrink-0 shadow-lg`}
//               >
//                 {student.name[0]?.toUpperCase()}
//               </div>
//               <div className="flex-1 min-w-0">
//                 <div className="flex items-center gap-3 flex-wrap">
//                   <h1 className={`text-2xl font-bold ${txtp}`}>
//                     {student.name}
//                   </h1>
//                   {student.grade && (
//                     <span className="px-2.5 py-0.5 rounded-full text-xs font-medium dark:bg-blue-900/40 bg-blue-100 dark:text-blue-300 text-blue-600">
//                       {student.grade}
//                     </span>
//                   )}
//                   {student.subject && (
//                     <span className="px-2.5 py-0.5 rounded-full text-xs font-medium dark:bg-cyan-900/40 bg-cyan-100 dark:text-cyan-300 text-cyan-600">
//                       {student.subject}
//                     </span>
//                   )}
//                 </div>
//                 <p className={`text-sm mt-0.5 ${txtm}`}>
//                   {currentTier.icon} {currentTier.name} · Age {student.age}
//                 </p>
//               </div>
//               <div className="w-48 flex-shrink-0">
//                 <div className="flex justify-between text-xs mb-1">
//                   <span className={txtm}>Level Progress</span>
//                   <span className={txtm}>{progress}%</span>
//                 </div>
//                 <div className="h-2 rounded-full dark:bg-blue-900/40 bg-blue-100">
//                   <div
//                     className={`h-full rounded-full bg-gradient-to-r ${currentTier.grad} transition-all duration-700`}
//                     style={{ width: `${progress}%` }}
//                   />
//                 </div>
//                 <p className={`text-xs mt-1 ${txtm}`}>
//                   {nextTier
//                     ? `${nextTier.min - totalClasses} more to ${nextTier.name}`
//                     : "🌟 Max rank!"}
//                 </p>
//               </div>
//             </div>
//           </div>

//           {/* Stats */}
//           <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
//             {[
//               {
//                 icon: "📚",
//                 label: "Total Classes",
//                 value: totalClasses,
//                 sub: `${upcoming.length} upcoming`,
//               },
//               {
//                 icon: "⏱️",
//                 label: "Hours Learned",
//                 value: `${Math.round(totalHrs * 10) / 10}h`,
//                 sub: "Class time",
//               },
//               {
//                 icon: "📅",
//                 label: "Next Class",
//                 value:
//                   upcoming.length > 0
//                     ? new Date(upcoming[0].shift.start).toLocaleDateString(
//                         "en-US",
//                         { month: "short", day: "numeric" },
//                       )
//                     : "—",
//                 sub: upcoming.length > 0 ? "Upcoming" : "None booked",
//               },
//               {
//                 icon: "✅",
//                 label: "Completion",
//                 value:
//                   bookings.length > 0
//                     ? `${Math.round((completed.length / bookings.length) * 100)}%`
//                     : "—",
//                 sub: "Attendance rate",
//               },
//             ].map((s) => (
//               <div key={s.label} className={`${card} p-4`}>
//                 <span className="text-2xl">{s.icon}</span>
//                 <p className={`text-xs uppercase tracking-wide mt-2 ${txtm}`}>
//                   {s.label}
//                 </p>
//                 <p className={`text-2xl font-bold mt-0.5 ${txtp}`}>{s.value}</p>
//                 <p className={`text-xs mt-0.5 ${txtm}`}>{s.sub}</p>
//               </div>
//             ))}
//           </div>

//           <div className="grid grid-cols-3 gap-4">
//             {/* Left 2-col: next class + recent */}
//             <div className="col-span-2 space-y-4">
//               {nextClass ? (
//                 <div className={`${card} p-5`}>
//                   <p className={`text-xs uppercase font-medium mb-3 ${txtm}`}>
//                     Next Mission
//                   </p>
//                   <div className="flex items-start gap-4">
//                     <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-violet-800 flex items-center justify-center text-2xl flex-shrink-0">
//                       ✈️
//                     </div>
//                     <div className="flex-1">
//                       <p className={`font-semibold ${txtp}`}>
//                         Lesson with{" "}
//                         {nextClass.teacher?.fullName ?? "Your Teacher"}
//                       </p>
//                       <p className={`text-sm ${txtm}`}>
//                         {new Date(nextClass.shift.start).toLocaleDateString(
//                           "en-US",
//                           { weekday: "long", month: "long", day: "numeric" },
//                         )}{" "}
//                         ·{" "}
//                         {new Date(nextClass.shift.start).toLocaleTimeString(
//                           "en-US",
//                           { hour: "numeric", minute: "2-digit" },
//                         )}
//                       </p>
//                       <Countdown target={nextClass.shift.start} />
//                     </div>
//                     {new Date(nextClass.shift.start).getTime() - Date.now() <=
//                       600000 && (
//                       <button
//                         onClick={() =>
//                           router.push(`/classroom/${nextClass.id}`)
//                         }
//                         className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-xl transition-colors flex-shrink-0"
//                       >
//                         Join →
//                       </button>
//                     )}
//                   </div>
//                 </div>
//               ) : (
//                 <div className={`${card} p-5 flex items-center gap-4`}>
//                   <span className="text-3xl">🌌</span>
//                   <div>
//                     <p className={`font-semibold ${txtp}`}>
//                       No upcoming missions
//                     </p>
//                     <p className={`text-sm ${txtm}`}>
//                       Ask your parent to book a class!
//                     </p>
//                   </div>
//                   <button
//                     onClick={() => router.push("/marketplace")}
//                     className="ml-auto px-3 py-1.5 rounded-lg text-sm dark:bg-blue-900/30 bg-blue-100 dark:text-blue-300 text-blue-700 dark:hover:bg-blue-800/40 hover:bg-blue-200 transition-colors"
//                   >
//                     Find Teachers
//                   </button>
//                 </div>
//               )}

//               {/* Recent classes */}
//               <div className={`${card} p-5`}>
//                 <div className="flex items-center justify-between mb-4">
//                   <p className={`text-xs uppercase font-medium ${txtm}`}>
//                     Recent Classes
//                   </p>
//                   <button
//                     onClick={() => router.push(`/student-lessons/${studentId}`)}
//                     className={`text-xs dark:text-blue-400 text-blue-600 dark:hover:text-blue-300 hover:text-blue-500`}
//                   >
//                     View all →
//                   </button>
//                 </div>
//                 {recent.length === 0 ? (
//                   <p className={`text-sm text-center py-6 ${txtm}`}>
//                     No completed classes yet.
//                   </p>
//                 ) : (
//                   <div className="space-y-2">
//                     {recent.map((b) => (
//                       <div
//                         key={b.id}
//                         className="flex items-center gap-3 p-3 rounded-xl dark:bg-blue-900/10 bg-blue-50/50 dark:hover:bg-blue-900/15 hover:bg-blue-50 transition-colors"
//                       >
//                         <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
//                           {new Date(b.shift.start).getDate()}
//                         </div>
//                         <div className="flex-1 min-w-0">
//                           <p className={`text-sm font-medium truncate ${txtp}`}>
//                             {b.teacher?.fullName ?? "Teacher"}
//                           </p>
//                           <p className={`text-xs ${txtm}`}>
//                             {new Date(b.shift.start).toLocaleDateString(
//                               "en-US",
//                               {
//                                 month: "short",
//                                 day: "numeric",
//                                 year: "numeric",
//                               },
//                             )}
//                           </p>
//                         </div>
//                         {b.review ? (
//                           <Stars r={b.review.rating} />
//                         ) : (
//                           <span className={`text-xs ${txtm}`}>No review</span>
//                         )}
//                       </div>
//                     ))}
//                   </div>
//                 )}
//               </div>
//             </div>

//             {/* Right 1-col: badges + upcoming list */}
//             <div className="space-y-4">
//               <div className={`${card} p-5`}>
//                 <p className={`text-xs uppercase font-medium mb-3 ${txtm}`}>
//                   Mission Badges
//                 </p>
//                 <div className="grid grid-cols-4 gap-2">
//                   {BADGES.map((b) => {
//                     const earned = b.req(totalClasses, totalHrs);
//                     return (
//                       <div
//                         key={b.id}
//                         title={b.label}
//                         className={`aspect-square rounded-xl flex items-center justify-center text-xl ${earned ? "dark:bg-blue-600/30 bg-blue-100 border dark:border-blue-500/40 border-blue-300" : "dark:bg-gray-800/20 bg-gray-100 border dark:border-gray-700/20 border-gray-200 opacity-30 grayscale"}`}
//                       >
//                         {b.icon}
//                       </div>
//                     );
//                   })}
//                 </div>
//                 <p className={`text-xs mt-3 ${txtm}`}>
//                   {earnedBadges.length}/{BADGES.length} earned
//                 </p>
//               </div>

//               {upcoming.length > 0 && (
//                 <div className={`${card} p-5`}>
//                   <p className={`text-xs uppercase font-medium mb-3 ${txtm}`}>
//                     Upcoming ({upcoming.length})
//                   </p>
//                   <div className="space-y-2">
//                     {upcoming.slice(0, 4).map((b) => (
//                       <div
//                         key={b.id}
//                         className="p-2.5 rounded-xl dark:bg-blue-900/10 bg-blue-50/50"
//                       >
//                         <p className={`text-xs font-medium ${txtp}`}>
//                           {new Date(b.shift.start).toLocaleDateString("en-US", {
//                             weekday: "short",
//                             month: "short",
//                             day: "numeric",
//                           })}
//                         </p>
//                         <p className={`text-xs ${txtm}`}>
//                           {new Date(b.shift.start).toLocaleTimeString("en-US", {
//                             hour: "numeric",
//                             minute: "2-digit",
//                           })}
//                         </p>
//                       </div>
//                     ))}
//                     {upcoming.length > 4 && (
//                       <p className={`text-xs text-center ${txtm}`}>
//                         +{upcoming.length - 4} more
//                       </p>
//                     )}
//                   </div>
//                 </div>
//               )}

//               <div className="space-y-2">
//                 <button
//                   onClick={() => router.push(`/student-lessons/${studentId}`)}
//                   className={`w-full p-3 rounded-xl text-left border dark:border-blue-900/30 border-blue-100 dark:bg-blue-900/20 bg-blue-50 dark:hover:bg-blue-900/30 hover:bg-blue-100 transition-colors`}
//                 >
//                   <p className={`text-sm font-medium ${txtp}`}>
//                     📚 All Lessons
//                   </p>
//                   <p className={`text-xs ${txtm}`}>Mission Log</p>
//                 </button>
//                 <button
//                   onClick={() => router.push(`/student-progress/${studentId}`)}
//                   className={`w-full p-3 rounded-xl text-left border dark:border-blue-900/30 border-blue-100 dark:bg-blue-900/20 bg-blue-50 dark:hover:bg-blue-900/30 hover:bg-blue-100 transition-colors`}
//                 >
//                   <p className={`text-sm font-medium ${txtp}`}>
//                     📊 Progress Report
//                   </p>
//                   <p className={`text-xs ${txtm}`}>Star Chart</p>
//                 </button>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default function StudentDashboardPage() {
//   return (
//     <Suspense
//       fallback={
//         <div className="flex items-center justify-center h-screen dark:bg-[#050D1A] bg-[#F0F5FF]">
//           <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
//         </div>
//       }
//     >
//       <StudentDashboardContent />
//     </Suspense>
//   );
// }
