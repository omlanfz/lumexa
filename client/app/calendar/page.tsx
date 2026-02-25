"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { isClassJoinable } from "../../lib/time";

interface Booking {
  id: string;
  student: { name: string };
  paymentStatus: string;
}

interface Shift {
  id: string;
  start: string;
  end: string;
  isBooked: boolean;
  booking?: Booking;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getWeekDays(anchorDate: Date): Date[] {
  const start = new Date(anchorDate);
  const day = start.getDay(); // 0 = Sun
  start.setDate(start.getDate() - day); // rewind to Sunday
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatHour(hour: number) {
  if (hour === 0) return "12 AM";
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return "12 PM";
  return `${hour - 12} PM`;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0–23
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CalendarPage() {
  const router = useRouter();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"week" | "month">("week");
  const [anchor, setAnchor] = useState(new Date());

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    loadShifts(token);
  }, []);

  const loadShifts = async (token: string) => {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/shifts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setShifts(res.data);
    } catch {
      console.error("Failed to load shifts");
    } finally {
      setLoading(false);
    }
  };

  const navigate = (direction: -1 | 1) => {
    const d = new Date(anchor);
    if (view === "week") {
      d.setDate(d.getDate() + direction * 7);
    } else {
      d.setMonth(d.getMonth() + direction);
    }
    setAnchor(d);
  };

  const today = new Date();
  const weekDays = getWeekDays(anchor);

  const shiftsOnDay = (day: Date) =>
    shifts.filter((s) => isSameDay(new Date(s.start), day));

  // ── Week view title
  const weekLabel = `${DAY_NAMES[weekDays[0].getDay()]} ${weekDays[0].getDate()} ${MONTH_NAMES[weekDays[0].getMonth()]} – ${DAY_NAMES[weekDays[6].getDay()]} ${weekDays[6].getDate()} ${MONTH_NAMES[weekDays[6].getMonth()]} ${weekDays[6].getFullYear()}`;

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-white font-mono">
        <div className="animate-pulse text-blue-400">Loading Schedule...</div>
      </div>
    );

  return (
    <div className="min-h-screen text-white font-sans p-6">
      {/* ── Header ── */}
      <div className="max-w-7xl mx-auto mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-blue-400 tracking-widest uppercase">
            Schedule
          </h1>
          <p className="text-gray-500 text-sm mt-1">Flight Log</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Week/Month Toggle */}
          <div className="flex bg-black border border-gray-700 rounded-lg p-1">
            <button
              onClick={() => setView("week")}
              className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${
                view === "week"
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setView("month")}
              className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${
                view === "month"
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Month
            </button>
          </div>

          {/* Navigation */}
          <button
            onClick={() => navigate(-1)}
            className="px-3 py-2 border border-gray-700 rounded-lg text-gray-400 hover:bg-gray-800 transition-all text-sm"
          >
            ←
          </button>
          <button
            onClick={() => setAnchor(new Date())}
            className="px-3 py-2 border border-gray-700 rounded-lg text-gray-400 hover:bg-gray-800 transition-all text-sm"
          >
            Today
          </button>
          <button
            onClick={() => navigate(1)}
            className="px-3 py-2 border border-gray-700 rounded-lg text-gray-400 hover:bg-gray-800 transition-all text-sm"
          >
            →
          </button>

          <button
            onClick={() => router.push("/teacher-dashboard")}
            className="px-4 py-2 border border-gray-700 rounded-lg text-gray-400 hover:bg-gray-800 transition-all text-sm"
          >
            ← Dashboard
          </button>
        </div>
      </div>

      {/* ── Period Title ── */}
      <div className="max-w-7xl mx-auto mb-4">
        <p className="text-lg font-bold text-white">
          {view === "week"
            ? weekLabel
            : `${MONTH_NAMES[anchor.getMonth()]} ${anchor.getFullYear()}`}
        </p>
      </div>

      {/* ── Week View ── */}
      {view === "week" && (
        <div className="max-w-7xl mx-auto overflow-x-auto">
          <div className="min-w-[900px]">
            {/* Day headers */}
            <div className="grid grid-cols-8 border-b border-gray-800 mb-1">
              <div className="p-2" /> {/* Time column */}
              {weekDays.map((day, i) => (
                <div
                  key={i}
                  className={`p-3 text-center border-l border-gray-800 ${
                    isSameDay(day, today) ? "bg-blue-900/20" : ""
                  }`}
                >
                  <p className="text-xs text-gray-500 font-bold uppercase">
                    {DAY_NAMES[day.getDay()]}
                  </p>
                  <p
                    className={`text-xl font-bold mt-0.5 ${
                      isSameDay(day, today) ? "text-blue-400" : "text-white"
                    }`}
                  >
                    {day.getDate()}
                  </p>
                </div>
              ))}
            </div>

            {/* Time rows — show hours 6am to midnight */}
            <div className="relative">
              {HOURS.filter((h) => h >= 6).map((hour) => (
                <div key={hour} className="grid grid-cols-8 min-h-[60px]">
                  {/* Hour label */}
                  <div className="p-2 text-right pr-3 border-r border-gray-800">
                    <span className="text-xs text-gray-600 -mt-2 block">
                      {formatHour(hour)}
                    </span>
                  </div>

                  {/* Day columns */}
                  {weekDays.map((day, di) => {
                    const dayShifts = shiftsOnDay(day).filter((s) => {
                      const sh = new Date(s.start).getHours();
                      return sh === hour;
                    });

                    return (
                      <div
                        key={di}
                        className={`border-l border-b border-gray-800/50 p-1 min-h-[60px] relative ${
                          isSameDay(day, today) ? "bg-blue-900/5" : ""
                        }`}
                      >
                        {dayShifts.map((shift) => {
                          const startMin = new Date(shift.start).getMinutes();
                          const endHour = new Date(shift.end).getHours();
                          const endMin = new Date(shift.end).getMinutes();
                          const durationMins =
                            endHour * 60 + endMin - (hour * 60 + startMin);
                          const heightPx = Math.max(
                            24,
                            (durationMins / 60) * 60,
                          );

                          const joinable = shift.isBooked
                            ? isClassJoinable(shift.start, shift.end)
                            : false;

                          return (
                            <div
                              key={shift.id}
                              onClick={() =>
                                shift.booking &&
                                router.push(`/classroom/${shift.booking.id}`)
                              }
                              style={{ minHeight: `${heightPx}px` }}
                              className={`w-full rounded-md p-1.5 text-xs cursor-pointer transition-all hover:opacity-90 ${
                                joinable
                                  ? "bg-green-700/80 border border-green-500 animate-pulse"
                                  : shift.isBooked
                                    ? "bg-purple-800/70 border border-purple-500"
                                    : "bg-blue-900/50 border border-blue-700"
                              }`}
                            >
                              <p className="font-bold text-white truncate">
                                {shift.isBooked && shift.booking
                                  ? shift.booking.student.name
                                  : "Available"}
                              </p>
                              <p className="text-gray-300 opacity-80">
                                {new Date(shift.start).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                                {" – "}
                                {new Date(shift.end).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                              {joinable && (
                                <p className="text-green-300 font-bold mt-0.5">
                                  🔴 LIVE
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Month View ── */}
      {view === "month" && (
        <div className="max-w-7xl mx-auto">
          {/* Day header row */}
          <div className="grid grid-cols-7 mb-1">
            {DAY_NAMES.map((d) => (
              <div
                key={d}
                className="p-2 text-center text-xs font-bold text-gray-500 uppercase"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Month grid */}
          {(() => {
            const firstDay = new Date(
              anchor.getFullYear(),
              anchor.getMonth(),
              1,
            );
            const startOffset = firstDay.getDay();
            const daysInMonth = new Date(
              anchor.getFullYear(),
              anchor.getMonth() + 1,
              0,
            ).getDate();

            const cells: (Date | null)[] = [
              ...Array(startOffset).fill(null),
              ...Array.from(
                { length: daysInMonth },
                (_, i) =>
                  new Date(anchor.getFullYear(), anchor.getMonth(), i + 1),
              ),
            ];

            // Pad to complete last row
            while (cells.length % 7 !== 0) cells.push(null);

            const rows: (Date | null)[][] = [];
            for (let i = 0; i < cells.length; i += 7) {
              rows.push(cells.slice(i, i + 7));
            }

            return rows.map((row, ri) => (
              <div
                key={ri}
                className="grid grid-cols-7 border-t border-gray-800"
              >
                {row.map((day, di) => {
                  if (!day) {
                    return (
                      <div
                        key={di}
                        className="min-h-[100px] border-l border-gray-800 bg-black/20"
                      />
                    );
                  }

                  const dayShifts = shiftsOnDay(day);
                  const isToday = isSameDay(day, today);

                  return (
                    <div
                      key={di}
                      className={`min-h-[100px] border-l border-gray-800 p-2 ${
                        isToday ? "bg-blue-900/10" : "hover:bg-gray-900/30"
                      } transition-all`}
                    >
                      <p
                        className={`text-sm font-bold mb-1 ${
                          isToday ? "text-blue-400" : "text-gray-400"
                        }`}
                      >
                        {day.getDate()}
                      </p>

                      <div className="space-y-1">
                        {dayShifts.slice(0, 3).map((shift) => (
                          <div
                            key={shift.id}
                            onClick={() =>
                              shift.booking &&
                              router.push(`/classroom/${shift.booking!.id}`)
                            }
                            className={`text-xs rounded px-1.5 py-0.5 cursor-pointer truncate ${
                              shift.isBooked
                                ? "bg-purple-800/70 text-purple-200"
                                : "bg-blue-900/50 text-blue-300"
                            }`}
                          >
                            {new Date(shift.start).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            {shift.isBooked && shift.booking
                              ? `· ${shift.booking.student.name}`
                              : "· Open"}
                          </div>
                        ))}
                        {dayShifts.length > 3 && (
                          <p className="text-xs text-gray-600">
                            +{dayShifts.length - 3} more
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ));
          })()}
        </div>
      )}

      {/* ── Legend ── */}
      <div className="max-w-7xl mx-auto mt-6 flex gap-6 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-900/50 border border-blue-700" />
          <span>Available slot</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-purple-800/70 border border-purple-500" />
          <span>Booked class</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-700/80 border border-green-500" />
          <span>Live now</span>
        </div>
      </div>
    </div>
  );
}
