// FILE PATH: client/app/calendar/page.tsx
"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import TeacherNav from "../../components/TeacherNav";
import { useTheme } from "../../components/ThemeProvider";

interface Shift {
  id: string;
  start: string;
  end: string;
  isBooked: boolean;
  booking?: {
    id: string;
    student: { name: string; age: number };
    paymentStatus: string;
  } | null;
}

const HOUR_PX = 64;
const TOTAL_H = HOUR_PX * 24;
const H24 = Array.from({ length: 24 }, (_, i) => i);
const DAY_LBLS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const fmtHr = (h: number) =>
  h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`;
const fmtTime = (d: Date) =>
  d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const timePct = (d: Date) => ((d.getHours() + d.getMinutes() / 60) / 24) * 100;
const durPct = (s: Date, e: Date) =>
  ((e.getTime() - s.getTime()) / 86400000) * 100;

const weekDates = (anchor: Date) => {
  const d = new Date(anchor);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return Array.from({ length: 7 }, (_, i) => {
    const n = new Date(d);
    n.setDate(d.getDate() + i);
    return n;
  });
};

function CalendarContent() {
  const router = useRouter();
  const { isDark } = useTheme();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [anchor, setAnchor] = useState(new Date());
  const [profile, setProfile] = useState<{
    fullName: string;
    avatarUrl?: string | null;
    rankTier?: number;
  }>({ fullName: "Pilot" });
  const today = new Date();
  const week = weekDates(anchor);

  useEffect(() => {
    const tok = localStorage.getItem("token");
    if (!tok) {
      router.push("/login");
      return;
    }
    (async () => {
      try {
        const [sR, pR] = await Promise.all([
          axios.get(`${process.env.NEXT_PUBLIC_API_URL}/shifts`, {
            headers: { Authorization: `Bearer ${tok}` },
          }),
          axios.get(`${process.env.NEXT_PUBLIC_API_URL}/teachers/me/profile`, {
            headers: { Authorization: `Bearer ${tok}` },
          }),
        ]);
        setShifts(sR.data);
        setProfile({
          fullName: pR.data.user?.fullName ?? "Pilot",
          avatarUrl: pR.data.user?.avatarUrl ?? null,
          rankTier: pR.data.rankTier ?? 0,
        });
      } catch (e: any) {
        const m = e.response?.data?.message;
        setError(Array.isArray(m) ? m.join(", ") : (m ?? "Failed"));
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  useEffect(() => {
    if (!loading && scrollRef.current) {
      scrollRef.current.scrollTop = Math.max(0, (7 / 24) * TOTAL_H - 40);
    }
  }, [loading]);

  const cols = week.map((date) => ({
    date,
    label: DAY_LBLS[date.getDay()],
    num: String(date.getDate()),
    shifts: shifts.filter((s) => sameDay(new Date(s.start), date)),
  }));

  const nav = (dir: -1 | 1) => {
    const n = new Date(anchor);
    n.setDate(n.getDate() + dir * 7);
    setAnchor(n);
  };
  const weekLabel = `${week[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} — ${week[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  const inWeek = week.some((d) => sameDay(d, today));

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen dark:bg-[#0A0714] bg-[#FAF5FF]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="dark:text-purple-400 text-purple-500 text-sm mt-3">
            Loading flight log…
          </p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen dark:bg-[#0A0714] bg-[#FAF5FF]">
      <TeacherNav
        teacherName={profile.fullName}
        avatarUrl={profile.avatarUrl}
        rankTier={profile.rankTier ?? 0}
        onAvatarUpdate={(u) => setProfile((p) => ({ ...p, avatarUrl: u }))}
      />
      <div className="pl-64 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b dark:border-purple-900/30 border-purple-100 dark:bg-[#0A0714] bg-[#FAF5FF]">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold dark:text-purple-100 text-purple-900">
                Schedule
              </h1>
              <p className="text-sm dark:text-purple-400/60 text-purple-400">
                Flight Log · {weekLabel}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs dark:text-purple-400/60 text-purple-400">
                <span className="w-2.5 h-2.5 rounded dark:bg-purple-500 bg-purple-400 inline-block" />
                Available
              </span>
              <span className="flex items-center gap-1.5 text-xs dark:text-purple-400/60 text-purple-400 ml-2">
                <span className="w-2.5 h-2.5 rounded bg-green-500 inline-block" />
                Booked
              </span>
              <button
                onClick={() => setAnchor(new Date())}
                className="ml-4 px-3 py-1.5 text-sm rounded-xl dark:bg-purple-900/20 bg-purple-100 border dark:border-purple-800/30 border-purple-200 dark:text-purple-300 text-purple-700 dark:hover:bg-purple-800/30 hover:bg-purple-200 transition-colors"
              >
                Today
              </button>
              <button
                onClick={() => nav(-1)}
                className="w-9 h-9 rounded-xl flex items-center justify-center dark:bg-purple-900/20 bg-purple-100 border dark:border-purple-800/30 border-purple-200 dark:text-purple-300 text-purple-700 dark:hover:bg-purple-800/30 hover:bg-purple-200 transition-colors"
              >
                ‹
              </button>
              <button
                onClick={() => nav(1)}
                className="w-9 h-9 rounded-xl flex items-center justify-center dark:bg-purple-900/20 bg-purple-100 border dark:border-purple-800/30 border-purple-200 dark:text-purple-300 text-purple-700 dark:hover:bg-purple-800/30 hover:bg-purple-200 transition-colors"
              >
                ›
              </button>
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="flex flex-1 overflow-hidden">
          {/* Time gutter */}
          <div className="flex-shrink-0 w-16 dark:bg-[#0A0714] bg-[#FAF5FF] border-r dark:border-purple-900/20 border-purple-100 flex flex-col">
            <div className="h-12 flex-shrink-0 border-b dark:border-purple-900/20 border-purple-100" />
            <div
              className="flex-1 overflow-hidden relative"
              style={{ height: TOTAL_H }}
            >
              {H24.map((h) => (
                <div
                  key={h}
                  className="absolute left-0 right-0 border-t dark:border-purple-900/20 border-purple-100 flex items-start"
                  style={{ top: `${(h / 24) * 100}%`, height: HOUR_PX }}
                >
                  <span className="text-xs dark:text-purple-400/50 text-purple-400/60 pr-2 pt-0.5 text-right w-full whitespace-nowrap">
                    {fmtHr(h)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Days — horizontally scrollable if narrow, vertically scrollable for 24h */}
          <div className="flex-1 overflow-x-auto flex flex-col">
            {/* Day headers — sticky */}
            <div
              className="flex flex-shrink-0 border-b dark:border-purple-900/30 border-purple-100 dark:bg-[#0A0714] bg-[#FAF5FF]"
              style={{ height: 48 }}
            >
              {cols.map((col, i) => {
                const isToday = sameDay(col.date, today);
                return (
                  <div
                    key={i}
                    className={`flex-1 min-w-28 text-center py-2 border-r dark:border-purple-900/20 border-purple-100 ${isToday ? "dark:bg-purple-900/10 bg-purple-50" : ""}`}
                  >
                    <p
                      className={`text-xs font-semibold uppercase tracking-widest ${isToday ? "dark:text-purple-400 text-purple-600" : "dark:text-purple-400/50 text-purple-400/60"}`}
                    >
                      {col.label}
                    </p>
                    <div
                      className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${isToday ? "bg-purple-600 text-white" : "dark:text-purple-100 text-purple-900"}`}
                    >
                      {col.num}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Scrollable 24h body */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto"
              style={{ overscrollBehavior: "contain" }}
            >
              <div className="flex relative" style={{ height: TOTAL_H }}>
                {/* Now line */}
                {inWeek && (
                  <div
                    className="absolute left-0 right-0 z-10 pointer-events-none flex items-center"
                    style={{ top: `${timePct(today)}%` }}
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0 -ml-1.5" />
                    <div className="flex-1 h-px bg-red-500/70" />
                  </div>
                )}
                {cols.map((col, ci) => {
                  const isToday = sameDay(col.date, today);
                  return (
                    <div
                      key={ci}
                      className={`flex-1 min-w-28 relative border-r dark:border-purple-900/20 border-purple-100 ${isToday ? "dark:bg-purple-900/5 bg-purple-50/20" : ""}`}
                    >
                      {H24.map((h) => (
                        <div
                          key={h}
                          className="absolute left-0 right-0 border-t dark:border-purple-900/15 border-purple-100/80"
                          style={{ top: `${(h / 24) * 100}%`, height: HOUR_PX }}
                        />
                      ))}
                      {H24.map((h) => (
                        <div
                          key={`hh${h}`}
                          className="absolute left-0 right-0 border-t border-dashed dark:border-purple-900/10 border-purple-100/50"
                          style={{ top: `${((h + 0.5) / 24) * 100}%` }}
                        />
                      ))}
                      {col.shifts.map((sh) => {
                        const s = new Date(sh.start),
                          e = new Date(sh.end);
                        const top = timePct(s),
                          ht = Math.max(durPct(s, e), 1.5),
                          past = e < today;
                        return (
                          <div
                            key={sh.id}
                            title={
                              sh.isBooked
                                ? `Booked: ${sh.booking?.student.name}`
                                : "Available"
                            }
                            className={`absolute left-0.5 right-0.5 rounded-lg overflow-hidden cursor-pointer transition-opacity ${past ? "opacity-40" : "opacity-100 hover:opacity-85"}`}
                            style={{ top: `${top}%`, height: `${ht}%` }}
                          >
                            {sh.isBooked ? (
                              <div className="h-full bg-green-600/80 border border-green-500/50 px-1.5 py-1">
                                <p className="text-white text-xs font-semibold leading-tight truncate">
                                  {sh.booking?.student.name}
                                </p>
                                <p className="text-green-200 text-xs">
                                  {fmtTime(s)}
                                </p>
                              </div>
                            ) : (
                              <div className="h-full dark:bg-purple-600/50 bg-purple-400/40 border dark:border-purple-500/40 border-purple-400/50 px-1.5 py-1">
                                <p className="dark:text-purple-200 text-purple-700 text-xs font-medium">
                                  Available
                                </p>
                                <p className="dark:text-purple-300/70 text-purple-500 text-xs">
                                  {fmtTime(s)}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        {error && (
          <div className="fixed bottom-4 right-4 bg-red-900/90 border border-red-700 text-red-200 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CalendarPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen dark:bg-[#0A0714] bg-[#FAF5FF]">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CalendarContent />
    </Suspense>
  );
}
