// FILE PATH: client/app/calendar/page.tsx
// ACTION: REPLACE the existing file entirely (or CREATE if it doesn't exist).

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import axios from "axios";
import TeacherNav from "@/components/TeacherNav";

const API = process.env.NEXT_PUBLIC_API_URL;

interface Shift {
  id: string;
  start: string;
  end: string;
  isBooked: boolean;
  booking?: {
    id: string;
    student: { name: string };
    paymentStatus: string;
  };
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 16 }, (_, i) => i + 7); // 7am - 10pm

function getWeekDates(baseDate: Date): Date[] {
  const week: Date[] = [];
  const day = baseDate.getDay();
  const start = new Date(baseDate);
  start.setDate(baseDate.getDate() - day);
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    week.push(d);
  }
  return week;
}

function Spinner() {
  return (
    <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
  );
}

function CalendarContent() {
  const router = useRouter();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [view, setView] = useState<"week" | "list">("week");

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    axios
      .get(`${API}/shifts`, { headers })
      .then((res) => setShifts(res.data ?? []))
      .catch(() => router.push("/login"))
      .finally(() => setLoading(false));
  }, []);

  const weekDates = getWeekDates(currentWeek);
  const weekStart = weekDates[0];
  const weekEnd = weekDates[6];

  const prevWeek = () => {
    const d = new Date(currentWeek);
    d.setDate(d.getDate() - 7);
    setCurrentWeek(d);
  };

  const nextWeek = () => {
    const d = new Date(currentWeek);
    d.setDate(d.getDate() + 7);
    setCurrentWeek(d);
  };

  const goToday = () => setCurrentWeek(new Date());

  // Get shifts for the current week
  const weekShifts = shifts.filter((s) => {
    const start = new Date(s.start);
    return start >= weekDates[0] && start <= weekDates[6];
  });

  const fmt = (date: Date) =>
    date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const fmtShiftTime = (dt: string) =>
    new Date(dt).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });

  // Get shifts for a specific day and hour (for weekly grid)
  const getShiftForCell = (dayDate: Date, hour: number) => {
    return weekShifts.filter((s) => {
      const start = new Date(s.start);
      return (
        start.getDate() === dayDate.getDate() &&
        start.getMonth() === dayDate.getMonth() &&
        start.getHours() === hour
      );
    });
  };

  const isToday = (d: Date) => {
    const today = new Date();
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  };

  return (
    <div className="flex min-h-screen bg-black">
      <TeacherNav />
      <main className="flex-1 ml-56 p-6 lg:p-8 overflow-x-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Schedule</h1>
            <p className="text-sm text-gray-500 mt-0.5">Mission Timeline ✦</p>
          </div>
          <div className="flex items-center gap-3">
            {/* View toggle */}
            <div className="flex gap-1 bg-gray-900 border border-gray-700 rounded-lg p-1">
              <button
                onClick={() => setView("week")}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                  view === "week"
                    ? "bg-purple-600 text-white"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setView("list")}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                  view === "list"
                    ? "bg-purple-600 text-white"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                List
              </button>
            </div>
          </div>
        </div>

        {/* Week navigation */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={goToday}
            className="px-3 py-1.5 text-xs bg-gray-800 border border-gray-700
                       text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Today
          </button>
          <button
            onClick={prevWeek}
            className="px-3 py-1.5 text-xs bg-gray-800 border border-gray-700
                       text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
          >
            ←
          </button>
          <button
            onClick={nextWeek}
            className="px-3 py-1.5 text-xs bg-gray-800 border border-gray-700
                       text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
          >
            →
          </button>
          <h2 className="text-sm font-medium text-white">
            {fmt(weekStart)} – {fmt(weekEnd)}, {weekEnd.getFullYear()}
          </h2>
          <span className="text-xs text-gray-500 ml-2">
            {weekShifts.length} slot{weekShifts.length !== 1 ? "s" : ""} this
            week
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner />
          </div>
        ) : view === "week" ? (
          /* ── Week Grid ── */
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-auto">
            {/* Day headers */}
            <div
              className="grid border-b border-gray-800"
              style={{ gridTemplateColumns: "60px repeat(7, 1fr)" }}
            >
              <div className="p-2 text-xs text-gray-600 text-center">UTC</div>
              {weekDates.map((d, i) => (
                <div
                  key={i}
                  className={`p-2 text-center border-l border-gray-800 ${
                    isToday(d) ? "bg-purple-900/20" : ""
                  }`}
                >
                  <p className="text-xs text-gray-500">{DAYS[d.getDay()]}</p>
                  <p
                    className={`text-sm font-semibold mt-0.5 ${
                      isToday(d) ? "text-purple-300" : "text-white"
                    }`}
                  >
                    {d.getDate()}
                  </p>
                </div>
              ))}
            </div>

            {/* Hour rows */}
            <div>
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="grid border-b border-gray-800/50 min-h-[48px]"
                  style={{ gridTemplateColumns: "60px repeat(7, 1fr)" }}
                >
                  {/* Hour label */}
                  <div className="p-1 text-xs text-gray-600 text-right pr-2 pt-1 flex-shrink-0">
                    {hour === 12
                      ? "12pm"
                      : hour < 12
                        ? `${hour}am`
                        : `${hour - 12}pm`}
                  </div>
                  {/* Day cells */}
                  {weekDates.map((d, di) => {
                    const cellShifts = getShiftForCell(d, hour);
                    return (
                      <div
                        key={di}
                        className={`border-l border-gray-800/50 p-0.5 ${
                          isToday(d) ? "bg-purple-900/5" : ""
                        }`}
                      >
                        {cellShifts.map((s) => (
                          <div
                            key={s.id}
                            className={`text-xs p-1 rounded mb-0.5 cursor-default ${
                              s.isBooked
                                ? "bg-purple-600/40 text-purple-200 border border-purple-500/30"
                                : "bg-gray-700/60 text-gray-300 border border-gray-600/30"
                            }`}
                          >
                            <p className="font-medium truncate">
                              {s.isBooked && s.booking
                                ? s.booking.student.name
                                : "Available"}
                            </p>
                            <p className="text-gray-400 text-xs">
                              {fmtShiftTime(s.start)}
                            </p>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* ── List View ── */
          <div className="space-y-3">
            {shifts
              .filter((s) => new Date(s.start) > new Date())
              .sort(
                (a, b) =>
                  new Date(a.start).getTime() - new Date(b.start).getTime(),
              )
              .slice(0, 50)
              .map((s) => (
                <div
                  key={s.id}
                  className={`flex items-center justify-between p-4 rounded-xl border ${
                    s.isBooked
                      ? "bg-purple-900/10 border-purple-500/20"
                      : "bg-gray-900 border-gray-800"
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium text-white">
                      {new Date(s.start).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    <p className="text-xs text-gray-500">
                      {fmtShiftTime(s.start)} – {fmtShiftTime(s.end)}
                    </p>
                    {s.isBooked && s.booking && (
                      <p className="text-xs text-purple-300 mt-0.5">
                        👤 {s.booking.student.name}
                      </p>
                    )}
                  </div>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full ${
                      s.isBooked
                        ? "bg-purple-600/30 text-purple-300"
                        : "bg-gray-700 text-gray-400"
                    }`}
                  >
                    {s.isBooked ? "● Booked" : "○ Available"}
                  </span>
                </div>
              ))}
            {shifts.filter((s) => new Date(s.start) > new Date()).length ===
              0 && (
              <div className="text-center py-20">
                <p className="text-4xl mb-3">📅</p>
                <p className="text-gray-400">No upcoming slots.</p>
                <p className="text-gray-600 text-sm mt-1">
                  Add availability from the Dashboard.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Legend */}
        <div className="flex gap-4 mt-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-purple-600/40 border border-purple-500/30" />
            <span className="text-xs text-gray-500">Booked</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-gray-700/60 border border-gray-600/30" />
            <span className="text-xs text-gray-500">Available</span>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function CalendarPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <p className="text-gray-400">Loading...</p>
        </div>
      }
    >
      <CalendarContent />
    </Suspense>
  );
}
