// FILE PATH: client/app/calendar/page.tsx
"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import TeacherNav from "../../components/TeacherNav";
import { useTheme } from "../../components/ThemeProvider";

// ─── Types ───────────────────────────────────────────────────────────────────

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

interface DayColumn {
  date: Date;
  label: string;
  dateStr: string; // e.g. "Mon 26"
  shifts: Shift[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const HOUR_HEIGHT = 64; // px per hour — 24 * 64 = 1536px total
const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0..23

function formatHour(h: number): string {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

function getWeekDates(anchor: Date): Date[] {
  const days: Date[] = [];
  const monday = new Date(anchor);
  const day = monday.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  monday.setDate(monday.getDate() + diff);
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d);
  }
  return days;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function toTopPercent(date: Date): number {
  const hours = date.getHours() + date.getMinutes() / 60;
  return (hours / 24) * 100;
}

function toHeightPercent(start: Date, end: Date): number {
  const diffMins = (end.getTime() - start.getTime()) / 60000;
  return (diffMins / (24 * 60)) * 100;
}

// ─── Main Page ───────────────────────────────────────────────────────────────

function CalendarContent() {
  const router = useRouter();
  const { isDark } = useTheme();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [teacherName, setTeacherName] = useState("Pilot");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [rankTier, setRankTier] = useState(0);

  // Fetch shifts
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const fetchData = async () => {
      try {
        const [shiftsRes, profileRes] = await Promise.all([
          axios.get(`${process.env.NEXT_PUBLIC_API_URL}/shifts`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${process.env.NEXT_PUBLIC_API_URL}/teachers/me/profile`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        setShifts(shiftsRes.data);
        setTeacherName(profileRes.data.user?.fullName ?? "Pilot");
        setAvatarUrl(profileRes.data.user?.avatarUrl ?? null);
        setRankTier(profileRes.data.rankTier ?? 0);
      } catch (err: any) {
        setError(err.response?.data?.message ?? "Failed to load calendar");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [router]);

  // Auto-scroll to 7 AM (business hours) on initial load
  useEffect(() => {
    if (!loading && scrollRef.current) {
      // 7 AM position: 7/24 * total_height
      const scrollTarget = (7 / 24) * (HOUR_HEIGHT * 24) - 64;
      scrollRef.current.scrollTop = Math.max(0, scrollTarget);
    }
  }, [loading]);

  const weekDates = getWeekDates(anchorDate);
  const today = new Date();

  // Map shifts to day columns
  const columns: DayColumn[] = weekDates.map((date) => {
    const dayShifts = shifts.filter((s) => isSameDay(new Date(s.start), date));
    const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return {
      date,
      label: DAYS[date.getDay()],
      dateStr: `${date.getDate()}`,
      shifts: dayShifts,
    };
  });

  const navigateWeek = (dir: -1 | 1) => {
    const next = new Date(anchorDate);
    next.setDate(next.getDate() + dir * 7);
    setAnchorDate(next);
  };

  const weekLabel = `${weekDates[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} — ${weekDates[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  // Current time indicator position (%)
  const nowPercent = toTopPercent(today);
  const isCurrentWeek = weekDates.some((d) => isSameDay(d, today));

  // Theme classes
  const bg = isDark ? "bg-[#0A0714]" : "bg-[#FAF5FF]";
  const cardBg = isDark
    ? "bg-gray-900/50 border-purple-900/30"
    : "bg-white border-purple-200";
  const headerBg = isDark ? "bg-[#120A24]" : "bg-purple-50";
  const textPrimary = isDark ? "text-purple-100" : "text-purple-900";
  const textMuted = isDark ? "text-purple-400/60" : "text-purple-400";
  const hourLineBg = isDark ? "border-purple-900/20" : "border-purple-100";
  const colBorderBg = isDark ? "border-purple-900/20" : "border-purple-100";
  const colHeaderBg = isDark ? "bg-purple-900/10" : "bg-purple-50";
  const todayHeaderBg = isDark ? "bg-purple-600/20" : "bg-purple-100";
  const buttonBg = isDark
    ? "bg-purple-900/20 border border-purple-800/30 text-purple-300 hover:bg-purple-800/30"
    : "bg-purple-100 border border-purple-200 text-purple-700 hover:bg-purple-200";

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-screen ${bg}`}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-purple-400 text-sm">Loading your flight log...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bg} transition-colors duration-300`}>
      <TeacherNav
        teacherName={teacherName}
        avatarUrl={avatarUrl}
        rankTier={rankTier}
        onAvatarUpdate={setAvatarUrl}
      />

      <div className="pl-64">
        {/* Header */}
        <div
          className={`sticky top-0 z-30 px-6 py-4 border-b ${isDark ? "border-purple-900/30 bg-[#0A0714]/95 backdrop-blur" : "border-purple-100 bg-[#FAF5FF]/95 backdrop-blur"}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-2xl font-bold ${textPrimary}`}>Schedule</h1>
              <p className={`text-sm ${textMuted}`}>Flight Log · {weekLabel}</p>
            </div>

            <div className="flex items-center gap-3">
              {/* Week / Month toggle */}
              <div
                className={`flex rounded-xl overflow-hidden border ${isDark ? "border-purple-800/30" : "border-purple-200"}`}
              >
                {(["week", "month"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setViewMode(m)}
                    className={`px-4 py-2 text-sm font-medium transition-colors capitalize ${
                      viewMode === m
                        ? isDark
                          ? "bg-purple-600 text-white"
                          : "bg-purple-500 text-white"
                        : isDark
                          ? "text-purple-400 hover:bg-purple-900/20"
                          : "text-purple-600 hover:bg-purple-50"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              {/* Navigation */}
              <button
                onClick={() => setAnchorDate(new Date())}
                className={`px-3 py-2 rounded-xl text-sm ${buttonBg}`}
              >
                Today
              </button>
              <button
                onClick={() => navigateWeek(-1)}
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${buttonBg}`}
              >
                ‹
              </button>
              <button
                onClick={() => navigateWeek(1)}
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${buttonBg}`}
              >
                ›
              </button>

              {/* Filters */}
              <div className="flex items-center gap-2 ml-2">
                <label
                  className={`flex items-center gap-1.5 text-xs ${textMuted}`}
                >
                  <span className="w-3 h-3 rounded bg-purple-500 inline-block" />
                  Available
                </label>
                <label
                  className={`flex items-center gap-1.5 text-xs ${textMuted}`}
                >
                  <span className="w-3 h-3 rounded bg-green-500 inline-block" />
                  Booked
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex">
          {/* Time gutter */}
          <div
            className="w-16 flex-shrink-0 relative"
            style={{ paddingTop: "48px" }}
          >
            {/* Fixed column header spacer */}
            <div className="h-full" style={{ height: `${HOUR_HEIGHT * 24}px` }}>
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className={`relative text-right pr-2 border-t ${hourLineBg}`}
                  style={{ height: `${HOUR_HEIGHT}px` }}
                >
                  <span
                    className={`text-xs absolute -top-2.5 right-2 ${textMuted}`}
                  >
                    {formatHour(hour)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Day columns scroll wrapper */}
          <div className="flex-1 overflow-x-auto">
            {/* Day headers — sticky */}
            <div
              className={`sticky top-[73px] z-20 flex border-b ${isDark ? "border-purple-900/30 bg-[#0A0714]/95 backdrop-blur" : "border-purple-100 bg-[#FAF5FF]/95 backdrop-blur"}`}
            >
              {columns.map((col, idx) => {
                const isToday = isSameDay(col.date, today);
                return (
                  <div
                    key={idx}
                    className={`flex-1 text-center py-3 border-r ${colBorderBg} ${isToday ? todayHeaderBg : colHeaderBg}`}
                  >
                    <p
                      className={`text-xs font-medium uppercase tracking-wide ${isToday ? "text-purple-400" : textMuted}`}
                    >
                      {col.label}
                    </p>
                    <div
                      className={`inline-flex items-center justify-center w-8 h-8 rounded-full mt-0.5 text-sm font-bold ${
                        isToday ? "bg-purple-600 text-white" : textPrimary
                      }`}
                    >
                      {col.dateStr}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Scrollable grid body */}
            <div
              ref={scrollRef}
              className="overflow-y-auto"
              style={{ maxHeight: "calc(100vh - 180px)" }}
            >
              <div
                className="flex relative"
                style={{ height: `${HOUR_HEIGHT * 24}px` }}
              >
                {/* Current time line */}
                {isCurrentWeek && (
                  <div
                    className="absolute left-0 right-0 z-10 pointer-events-none"
                    style={{ top: `${nowPercent}%` }}
                  >
                    <div className="flex items-center w-full">
                      <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 -ml-1" />
                      <div className="flex-1 h-px bg-red-500 opacity-70" />
                    </div>
                  </div>
                )}

                {/* Day columns */}
                {columns.map((col, idx) => {
                  const isToday = isSameDay(col.date, today);
                  return (
                    <div
                      key={idx}
                      className={`flex-1 relative border-r ${colBorderBg} ${isToday ? (isDark ? "bg-purple-900/5" : "bg-purple-50/50") : ""}`}
                    >
                      {/* Hour grid lines */}
                      {HOURS.map((hour) => (
                        <div
                          key={hour}
                          className={`absolute left-0 right-0 border-t ${hourLineBg}`}
                          style={{
                            top: `${(hour / 24) * 100}%`,
                            height: `${HOUR_HEIGHT}px`,
                          }}
                        />
                      ))}

                      {/* Half-hour dotted lines */}
                      {HOURS.map((hour) => (
                        <div
                          key={`h-${hour}`}
                          className={`absolute left-0 right-0 border-t border-dashed ${isDark ? "border-purple-900/10" : "border-purple-100/60"}`}
                          style={{ top: `${((hour + 0.5) / 24) * 100}%` }}
                        />
                      ))}

                      {/* Shift blocks */}
                      {col.shifts.map((shift) => {
                        const start = new Date(shift.start);
                        const end = new Date(shift.end);
                        const topPct = toTopPercent(start);
                        const heightPct = toHeightPercent(start, end);
                        const isBooked = shift.isBooked;
                        const isPast = end < today;

                        return (
                          <div
                            key={shift.id}
                            className={`absolute left-0.5 right-0.5 rounded-lg overflow-hidden cursor-pointer transition-opacity ${
                              isPast
                                ? "opacity-50"
                                : "opacity-100 hover:opacity-90"
                            }`}
                            style={{
                              top: `${topPct}%`,
                              height: `${Math.max(heightPct, 1.5)}%`,
                            }}
                            title={
                              isBooked
                                ? `Booked: ${shift.booking?.student.name}`
                                : "Available slot"
                            }
                          >
                            {isBooked ? (
                              <div className="h-full bg-green-600/80 border border-green-500/50 px-1.5 py-1">
                                <p className="text-white text-xs font-medium leading-tight truncate">
                                  {shift.booking?.student.name}
                                </p>
                                <p className="text-green-200 text-xs leading-tight">
                                  {start.toLocaleTimeString("en-US", {
                                    hour: "numeric",
                                    minute: "2-digit",
                                  })}
                                </p>
                              </div>
                            ) : (
                              <div className="h-full bg-purple-600/60 border border-purple-500/40 px-1.5 py-1">
                                <p className="text-purple-200 text-xs font-medium leading-tight">
                                  Available
                                </p>
                                <p className="text-purple-300/70 text-xs leading-tight">
                                  {start.toLocaleTimeString("en-US", {
                                    hour: "numeric",
                                    minute: "2-digit",
                                  })}
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

        {/* Error state */}
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
        <div className="flex items-center justify-center h-screen bg-[#0A0714]">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CalendarContent />
    </Suspense>
  );
}
