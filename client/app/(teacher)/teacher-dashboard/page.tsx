// FILE PATH: client/app/teacher-dashboard/page.tsx
//
// Simplified dashboard hierarchy (top to bottom):
//   1. Good morning, [Teacher]
//   2. Next class
//   3. Upcoming students
//   4. Availability status
//   5. Small performance snapshot
//   6. This month's earnings
//   7. Gamification (rank/points) — secondary, below the fold
//
// Quick Actions for Schedule/Students/Earnings/Profile are gone — they're
// already one click away in the top navbar.

"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import LumiChat from "@/components/LumiChat";
import TeacherPageSkeleton from "@/components/TeacherPageSkeleton";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Stats {
  completedClasses: number;
  totalShifts: number;
  ratingAvg: number;
  reviewCount: number;
  strikes: number;
  isSuspended: boolean;
  monthEarningsCents: number;
  monthEventCount: number;
  lastUpdated: string | null;
}

interface NextClass {
  type: 'lesson' | 'booking';
  id: string;
  start: string;
  end: string;
  studentName: string;
  studentAvatarUrl?: string | null;
  courseTitle?: string;
  lessonNumber?: number;
  lessonTitle?: string | null;
  isLive: boolean;
  joinable: boolean;
}

interface Profile {
  id: string;
  user: { fullName: string; email: string; avatarUrl?: string | null };
  bio?: string | null;
  subjects?: string[];
  rankTier?: number;
  points?: number;
  weeklyPoints?: number;
  verificationDocs?: unknown[];
}

interface StudentEntry {
  studentId: string;
  isUserRef: boolean;
  studentName: string;
  avatarUrl: string | null;
  pendingClasses: number;
  nextClassDate: string | null;
}

interface Shift {
  id: string;
  start: string;
  isBooked: boolean;
}

const RANK_NAMES = ["Cadet", "Navigator", "Pilot", "Commander", "Admiral", "Starmaster"];
const RANK_ICONS = ["🌱", "🧭", "✈️", "🎖️", "⭐", "🌟"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function splitDuration(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    hours: Math.floor(total / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

/** Ticks once a second while a class is on screen — used for both the
 * "starts in" countdown and the "elapsed" timer once it goes live, so both
 * always derive from the class's own start/end instant. */
function useClock(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function TeacherDashboardContent() {
  const router = useRouter();

  const [stats, setStats] = useState<Stats | null>(null);
  const [nextClass, setNextClass] = useState<NextClass | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [students, setStudents] = useState<StudentEntry[]>([]);
  const [openSlots, setOpenSlots] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const now = useClock(!!nextClass);
  const { hours, minutes, seconds } = nextClass
    ? splitDuration(
        nextClass.isLive
          ? now - new Date(nextClass.start).getTime()
          : new Date(nextClass.start).getTime() - now,
      )
    : { hours: 0, minutes: 0, seconds: 0 };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    (async () => {
      try {
        const [statsRes, nextRes, profileRes, studentsRes, shiftsRes] = await Promise.all([
          api.get("/teachers/me/stats"),
          api.get("/teachers/me/next-class"),
          api.get("/teachers/me/profile"),
          api.get("/teachers/me/students"),
          api.get("/shifts"),
        ]);

        setStats(statsRes.data);
        setNextClass(nextRes.data ?? null);
        setProfile(profileRes.data);
        setStudents(studentsRes.data ?? []);

        const now = new Date();
        const open = (shiftsRes.data as Shift[]).filter(
          (s) => !s.isBooked && new Date(s.start) > now,
        ).length;
        setOpenSlots(open);
      } catch (e: any) {
        const m = e.response?.data?.message;
        setError(Array.isArray(m) ? m.join(", ") : (m ?? "Failed to load dashboard"));
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  if (loading) return <TeacherPageSkeleton />;

  const firstName = (profile?.user?.fullName ?? "Teacher").split(" ")[0];
  const isProfileIncomplete = !profile?.bio || !profile?.subjects?.length;
  const upcomingStudents = students
    .filter((s) => s.pendingClasses > 0 && s.nextClassDate)
    .sort((a, b) => new Date(a.nextClassDate!).getTime() - new Date(b.nextClassDate!).getTime())
    .slice(0, 5);

  const rankTier = profile?.rankTier ?? 0;
  const card = "t-card t-card-hover shadow-sm";

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* ── 1. Greeting ─────────────────────────────────────────────── */}
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--t-text)] mb-6">
          {greeting()}, {firstName}
        </h1>

        {stats?.isSuspended && (
          <div className="mb-6 p-4 rounded-xl bg-[var(--t-danger-bg)] text-[var(--t-danger)] flex items-start gap-3">
            <div>
              <p className="font-semibold">Account suspended</p>
              <p className="text-sm opacity-80">
                <a
                  href="https://wa.me/8801774878252"
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:opacity-80"
                >
                  Contact support on WhatsApp
                </a>{" "}
                for reinstatement.
              </p>
            </div>
          </div>
        )}

        {isProfileIncomplete && (
          <div className="mb-6 p-4 rounded-xl border border-[var(--t-warning)]/30 bg-[var(--t-warning-bg)] flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm font-medium text-[var(--t-warning)]">
              Complete your profile to get started
            </p>
            <button
              onClick={() => router.push("/teacher-profile")}
              className="text-sm px-3 py-1.5 rounded-lg font-medium bg-[var(--t-accent)] hover:bg-[var(--t-accent-hover)] text-white transition-all duration-150 active:scale-[0.98]"
            >
              Complete Profile
            </button>
          </div>
        )}

        {/* ── 2. Next class ───────────────────────────────────────────── */}
        <section className="mb-6">
          <p className="text-xs uppercase tracking-wide font-medium text-[var(--t-text-muted)] mb-2">
            {nextClass?.isLive ? "Live Now" : "Next Class"}
          </p>
          {nextClass ? (
            <div className={`${card} p-5 relative overflow-hidden`}>
              <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
                <div>
                  {nextClass.isLive && (
                    <span className="inline-flex items-center gap-1.5 mb-1.5 px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-500 text-xs font-bold uppercase tracking-wide">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" /> Live
                    </span>
                  )}
                  <p className="text-lg font-bold text-[var(--t-text)]">
                    Class with {nextClass.studentName}
                  </p>
                  {nextClass.type === "lesson" && (
                    <p className="text-sm text-[var(--t-text-muted)]">
                      {nextClass.courseTitle}
                      {nextClass.lessonNumber ? ` · Lesson ${nextClass.lessonNumber}` : ""}
                      {nextClass.lessonTitle ? `: ${nextClass.lessonTitle}` : ""}
                    </p>
                  )}
                  <p className="text-sm text-[var(--t-text-muted)]">
                    {new Date(nextClass.start).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    ·{" "}
                    {new Date(nextClass.start).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                    {" – "}
                    {new Date(nextClass.end).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#7B61FF] to-[#5B3FCF] flex items-center justify-center text-white font-bold flex-shrink-0">
                  {nextClass.studentName.charAt(0).toUpperCase()}
                </div>
              </div>

              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <p className="text-xs text-[var(--t-text-muted)] mr-1">
                    {nextClass.isLive ? "Elapsed" : "Starts in"}
                  </p>
                  {[hours, minutes, seconds].map((val, i) => (
                    <div key={i} className="text-center px-2.5 py-1.5 rounded-lg bg-[var(--t-nav-active)]">
                      <p className="text-sm font-bold tabular-nums text-[var(--t-text)]">
                        {String(val).padStart(2, "0")}
                      </p>
                    </div>
                  ))}
                </div>
                {nextClass.joinable && (
                  <button
                    onClick={() => router.push(`/classroom/${nextClass.id}?type=${nextClass.type}`)}
                    className="px-4 py-2 bg-[var(--t-success)] hover:opacity-90 text-white text-sm font-medium rounded-xl transition-all duration-150 active:scale-[0.98]"
                  >
                    Join Class →
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className={`${card} p-6 flex flex-col items-center justify-center text-center`}>
              <p className="font-semibold text-[var(--t-text)]">No upcoming classes</p>
              <p className="text-sm mt-1 text-[var(--t-text-muted)]">
                Add availability so students can book you.
              </p>
              <button
                onClick={() => router.push("/schedule")}
                className="mt-4 px-4 py-2 bg-[var(--t-accent)] hover:bg-[var(--t-accent-hover)] text-white text-sm rounded-xl transition-all duration-150 active:scale-[0.98]"
              >
                Open Schedule
              </button>
            </div>
          )}
        </section>

        {/* ── 3. Upcoming students ────────────────────────────────────── */}
        <section className="mb-6">
          <p className="text-xs uppercase tracking-wide font-medium text-[var(--t-text-muted)] mb-2">
            Upcoming Students
          </p>
          <div className={`${card} overflow-hidden`}>
            {upcomingStudents.length === 0 ? (
              <p className="p-5 text-sm text-[var(--t-text-muted)]">
                No upcoming students. New bookings will appear here.
              </p>
            ) : (
              <div className="divide-y divide-[var(--t-nav-border)]">
                {upcomingStudents.map((s) => (
                  <button
                    key={s.studentId}
                    onClick={() => router.push("/teacher-students")}
                    className="w-full px-4 sm:px-5 py-3 flex items-center gap-3 hover:bg-[var(--t-nav-hover)] transition-colors duration-150 text-left"
                  >
                    {s.avatarUrl ? (
                      <img src={s.avatarUrl} alt={s.studentName} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7B61FF] to-[#5B3FCF] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {s.studentName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--t-text)] truncate">{s.studentName}</p>
                    </div>
                    <p className="text-xs text-[var(--t-text-muted)] flex-shrink-0">
                      {new Date(s.nextClassDate!).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── 4. Availability status + 5. Performance snapshot ───────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <section>
            <p className="text-xs uppercase tracking-wide font-medium text-[var(--t-text-muted)] mb-2">
              Availability
            </p>
            <div className={`${card} p-4 flex items-center justify-between`}>
              <div>
                <p className="text-2xl font-bold text-[var(--t-text)]">{openSlots}</p>
                <p className="text-xs text-[var(--t-text-muted)]">open slot{openSlots !== 1 ? "s" : ""}</p>
              </div>
              <button
                onClick={() => router.push("/schedule")}
                className="text-xs px-3 py-1.5 rounded-lg bg-[var(--t-nav-active)] text-[var(--t-nav-active-text)] hover:bg-[var(--t-nav-hover)] transition-colors duration-150"
              >
                Manage →
              </button>
            </div>
          </section>

          <section>
            <p className="text-xs uppercase tracking-wide font-medium text-[var(--t-text-muted)] mb-2">
              Performance
            </p>
            <div className={`${card} p-4 flex items-center justify-between`}>
              <div>
                <p className="text-2xl font-bold text-[var(--t-text)]">
                  {stats?.ratingAvg ? stats.ratingAvg.toFixed(1) : "—"}
                  <span className="text-sm text-[var(--t-text-muted)] font-normal"> ★</span>
                </p>
                <p className="text-xs text-[var(--t-text-muted)]">
                  {stats?.completedClasses ?? 0} classes taught
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* ── 6. This month's earnings ────────────────────────────────── */}
        <section className="mb-8">
          <p className="text-xs uppercase tracking-wide font-medium text-[var(--t-text-muted)] mb-2">
            This Month&apos;s Earnings
          </p>
          <div className={`${card} p-5 flex items-center justify-between flex-wrap gap-3`}>
            <div>
              <p className="text-3xl font-bold t-earn-text">
                ৳{((stats?.monthEarningsCents ?? 0) / 100).toLocaleString()}
              </p>
              <p className="text-xs text-[var(--t-text-muted)] mt-1">
                {stats?.monthEventCount ?? 0} earning event{(stats?.monthEventCount ?? 0) !== 1 ? "s" : ""}
                {stats?.lastUpdated && (
                  <>
                    {" · Last updated "}
                    {new Date(stats.lastUpdated).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  </>
                )}
              </p>
            </div>
            <button
              onClick={() => router.push("/teacher-earnings")}
              className="text-sm px-3 py-1.5 rounded-lg bg-[var(--t-nav-active)] text-[var(--t-nav-active-text)] hover:bg-[var(--t-nav-hover)] transition-colors duration-150"
            >
              View Earnings →
            </button>
          </div>
        </section>

        {/* ── 7. Gamification (secondary, below the fold) ────────────── */}
        <section className="pt-2 border-t border-[var(--t-nav-border)]">
          <button
            onClick={() => router.push("/teacher-leaderboard")}
            className={`${card} p-4 w-full flex items-center justify-between text-left`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{RANK_ICONS[rankTier] ?? "🌱"}</span>
              <div>
                <p className="text-sm font-semibold text-[var(--t-text)]">
                  {RANK_NAMES[rankTier] ?? "Cadet"}
                </p>
                <p className="text-xs text-[var(--t-text-muted)]">
                  {(profile?.points ?? 0).toLocaleString()} pts · View leaderboard
                </p>
              </div>
            </div>
            <span className="text-[var(--t-text-muted)]">→</span>
          </button>
        </section>

        {error && (
          <div className="mt-6 p-3 rounded-xl bg-[var(--t-danger-bg)] text-[var(--t-danger)] text-sm">
            {error}
          </div>
        )}
      </div>

      <LumiChat
        variant="teacher"
        context="Teacher dashboard — next class, upcoming students, availability, and earnings"
      />
    </>
  );
}

export default function TeacherDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen bg-[var(--t-bg)]">
          <div className="w-10 h-10 border-2 border-[var(--t-accent)] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <TeacherDashboardContent />
    </Suspense>
  );
}
