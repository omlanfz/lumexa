// FILE PATH: client/app/teacher-dashboard/page.tsx
// ACTION: REPLACE the existing file entirely.

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import axios from "axios";
import TeacherNav from "@/components/TeacherNav";

const API = process.env.NEXT_PUBLIC_API_URL;

interface Stats {
  ratingAvg: number;
  reviewCount: number;
  strikes: number;
  isSuspended: boolean;
  totalShifts: number;
  completedClasses: number;
  totalEarningsDollars: string;
}

interface NextClass {
  bookingId: string;
  studentName: string;
  studentAge: number;
  studentGrade: string | null;
  studentSubject: string | null;
  classStart: string;
  classEnd: string;
}

interface Shift {
  id: string;
  start: string;
  end: string;
  isBooked: boolean;
}

function Spinner() {
  return (
    <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
  );
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <span
          key={s}
          className={`text-base ${s <= Math.round(rating) ? "text-yellow-400" : "text-gray-600"}`}
        >
          ★
        </span>
      ))}
    </div>
  );
}

function Countdown({ classStart }: { classStart: string }) {
  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0, past: false });

  useEffect(() => {
    const calc = () => {
      const diff = new Date(classStart).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft({ h: 0, m: 0, s: 0, past: true });
        return;
      }
      const totalSec = Math.floor(diff / 1000);
      setTimeLeft({
        h: Math.floor(totalSec / 3600),
        m: Math.floor((totalSec % 3600) / 60),
        s: totalSec % 60,
        past: false,
      });
    };
    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [classStart]);

  if (timeLeft.past)
    return <p className="text-green-400 font-semibold">Class is live now!</p>;

  return (
    <div className="flex gap-4">
      {[
        { v: timeLeft.h, label: "HOURS" },
        { v: timeLeft.m, label: "MINS" },
        { v: timeLeft.s, label: "SECS" },
      ].map(({ v, label }) => (
        <div key={label} className="text-center">
          <p className="text-3xl font-bold text-purple-300 tabular-nums">
            {String(v).padStart(2, "0")}
          </p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      ))}
    </div>
  );
}

function TeacherDashboardContent() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [nextClass, setNextClass] = useState<NextClass | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingSlot, setAddingSlot] = useState(false);
  const [slotStart, setSlotStart] = useState("");
  const [slotEnd, setSlotEnd] = useState("");
  const [slotError, setSlotError] = useState("");
  const [slotSuccess, setSlotSuccess] = useState(false);

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers = { Authorization: `Bearer ${token}` };

  const fetchData = useCallback(async () => {
    if (!token) {
      router.push("/login");
      return;
    }
    try {
      const [statsRes, nextRes, shiftsRes] = await Promise.all([
        axios.get(`${API}/teachers/me/stats`, { headers }),
        axios.get(`${API}/teachers/me/next-class`, { headers }),
        axios.get(`${API}/shifts`, { headers }),
      ]);
      setStats(statsRes.data);
      setNextClass(nextRes.data);
      setShifts(shiftsRes.data ?? []);
    } catch {
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setSlotError("");
    setSlotSuccess(false);
    if (!slotStart || !slotEnd) {
      setSlotError("Please select both start and end times.");
      return;
    }
    setAddingSlot(true);
    try {
      await axios.post(
        `${API}/shifts`,
        {
          start: new Date(slotStart).toISOString(),
          end: new Date(slotEnd).toISOString(),
        },
        { headers },
      );
      setSlotSuccess(true);
      setSlotStart("");
      setSlotEnd("");
      fetchData();
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setSlotError(
        Array.isArray(msg) ? msg.join(", ") : (msg ?? "Failed to add slot."),
      );
    } finally {
      setAddingSlot(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Spinner />
          <p className="text-gray-400 text-sm">Loading Flight Deck...</p>
        </div>
      </div>
    );
  }

  const upcomingShifts = shifts
    .filter((s) => new Date(s.start) > new Date())
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .slice(0, 8);

  const fmt = (dt: string) =>
    new Date(dt).toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  return (
    <div className="flex min-h-screen bg-black">
      <TeacherNav />

      <main className="flex-1 ml-56 p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Teacher Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Flight Deck ✦</p>
        </div>

        {/* Suspension warning */}
        {stats?.isSuspended && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-500/40 rounded-xl">
            <p className="text-red-300 font-medium">
              ⚠️ Your account is suspended.
            </p>
            <p className="text-red-400/70 text-sm mt-1">
              Contact support to reinstate your teaching access.
            </p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Rating</p>
            <p className="text-2xl font-bold text-yellow-400">
              {stats?.ratingAvg?.toFixed(1) ?? "—"}
            </p>
            <StarDisplay rating={stats?.ratingAvg ?? 0} />
            <p className="text-xs text-gray-500 mt-1">
              {stats?.reviewCount ?? 0} reviews
            </p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Classes Done</p>
            <p className="text-2xl font-bold text-purple-300">
              {stats?.completedClasses ?? 0}
            </p>
            <p className="text-xs text-gray-500 mt-1">completed sessions</p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Total Earned</p>
            <p className="text-2xl font-bold text-green-400">
              ${stats?.totalEarningsDollars ?? "0.00"}
            </p>
            <p className="text-xs text-gray-500 mt-1">your 75% share</p>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Strikes</p>
            <p
              className={`text-2xl font-bold ${
                (stats?.strikes ?? 0) >= 2
                  ? "text-red-400"
                  : (stats?.strikes ?? 0) >= 1
                    ? "text-yellow-400"
                    : "text-green-400"
              }`}
            >
              {stats?.strikes ?? 0} / 3
            </p>
            <p
              className={`text-xs mt-1 ${
                (stats?.strikes ?? 0) === 0
                  ? "text-green-500"
                  : "text-yellow-500"
              }`}
            >
              {(stats?.strikes ?? 0) === 0 ? "Excellent" : "Warning"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Next Class */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">🎯</span>
              <div>
                <h2 className="text-base font-semibold text-white">
                  Next Class
                </h2>
                <p className="text-xs text-gray-500">Upcoming Mission</p>
              </div>
            </div>

            {nextClass ? (
              <>
                <div className="mb-4">
                  <p className="text-sm text-gray-400">Student</p>
                  <p className="font-semibold text-white">
                    {nextClass.studentName}
                  </p>
                  {(nextClass.studentGrade || nextClass.studentSubject) && (
                    <p className="text-xs text-gray-500">
                      {[nextClass.studentGrade, nextClass.studentSubject]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                </div>
                <div className="mb-4">
                  <p className="text-sm text-gray-400">Starts</p>
                  <p className="text-sm text-white">
                    {fmt(nextClass.classStart)}
                  </p>
                </div>
                <Countdown classStart={nextClass.classStart} />
                <button
                  onClick={() =>
                    router.push(`/classroom/${nextClass.bookingId}`)
                  }
                  className="mt-4 w-full py-2.5 bg-purple-600 hover:bg-purple-500
                             text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Join Class
                  <span className="block text-xs font-normal opacity-60">
                    Enter Star Lab
                  </span>
                </button>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-4xl mb-3">🌌</p>
                <p className="text-gray-400 text-sm">No upcoming classes</p>
                <p className="text-gray-600 text-xs mt-1">
                  Add availability slots below
                </p>
              </div>
            )}
          </div>

          {/* Add Time Slot */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">📅</span>
              <div>
                <h2 className="text-base font-semibold text-white">
                  Add Time Slot
                </h2>
                <p className="text-xs text-gray-500">Log Flight Availability</p>
              </div>
            </div>

            <form onSubmit={handleAddSlot} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  Start Time
                </label>
                <input
                  type="datetime-local"
                  value={slotStart}
                  onChange={(e) => setSlotStart(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-gray-200
                             rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  End Time
                </label>
                <input
                  type="datetime-local"
                  value={slotEnd}
                  onChange={(e) => setSlotEnd(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-gray-200
                             rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
              {slotError && <p className="text-red-400 text-xs">{slotError}</p>}
              {slotSuccess && (
                <p className="text-green-400 text-xs">
                  ✓ Slot added successfully!
                </p>
              )}
              <button
                type="submit"
                disabled={addingSlot}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50
                           text-white text-sm font-medium rounded-lg transition-colors"
              >
                {addingSlot ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner />
                    Adding...
                  </span>
                ) : (
                  <>
                    Add Time Slot
                    <span className="block text-xs font-normal opacity-60">
                      Log Flight Availability
                    </span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Upcoming Shifts List */}
        <div className="mt-6 bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-white">
                Upcoming Slots
              </h2>
              <p className="text-xs text-gray-500">Your availability windows</p>
            </div>
            <button
              onClick={() => router.push("/calendar")}
              className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
            >
              View full calendar →
            </button>
          </div>

          {upcomingShifts.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-6">
              No upcoming slots. Add some availability above.
            </p>
          ) : (
            <div className="space-y-2">
              {upcomingShifts.map((shift) => (
                <div
                  key={shift.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    shift.isBooked
                      ? "bg-purple-900/10 border-purple-500/20"
                      : "bg-gray-800/50 border-gray-700/50"
                  }`}
                >
                  <div>
                    <p className="text-sm text-white">{fmt(shift.start)}</p>
                    <p className="text-xs text-gray-500">
                      until{" "}
                      {new Date(shift.end).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      shift.isBooked
                        ? "bg-purple-600/30 text-purple-300"
                        : "bg-gray-700 text-gray-400"
                    }`}
                  >
                    {shift.isBooked ? "Booked" : "Available"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function TeacherDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <p className="text-gray-400">Loading...</p>
        </div>
      }
    >
      <TeacherDashboardContent />
    </Suspense>
  );
}
