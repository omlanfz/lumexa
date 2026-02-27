// FILE PATH: client/app/calendar/page.tsx
// Major additions:
// 1. "Add Availability" modal — POST /shifts to create time slots
// 2. Reschedule/Cancel modal with rules enforcement
// 3. Student-request verification flow
// 4. Full light/dark mode
// 5. Responsive layout
"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import TeacherNav from "../../components/TeacherNav";
import { useTheme } from "../../components/ThemeProvider";

const HOUR_PX = 60;

interface Shift {
  id: string;
  start: string;
  end: string;
  isBooked: boolean;
  booking?: {
    id: string;
    student: { name: string };
    paymentStatus: string;
  } | null;
}

interface Profile {
  user: { fullName: string; avatarUrl?: string | null };
  rankTier: number;
}

// ─── Add Slot Modal ───────────────────────────────────────────────────────────

interface AddSlotModalProps {
  onClose: () => void;
  onAdded: (shift: Shift) => void;
  defaultDate: Date;
}

function AddSlotModal({ onClose, onAdded, defaultDate }: AddSlotModalProps) {
  const [date, setDate] = useState(defaultDate.toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    const startDt = new Date(`${date}T${startTime}:00`);
    const endDt = new Date(`${date}T${endTime}:00`);
    const diffMin = (endDt.getTime() - startDt.getTime()) / 60000;

    if (startDt <= new Date()) {
      setError("Start time must be in the future");
      return;
    }
    if (endDt <= startDt) {
      setError("End time must be after start time");
      return;
    }
    if (diffMin < 30) {
      setError("Minimum session length is 30 minutes");
      return;
    }
    if (diffMin > 240) {
      setError("Maximum session length is 4 hours");
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/shifts`,
        { start: startDt.toISOString(), end: endDt.toISOString() },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      onAdded(res.data);
      onClose();
    } catch (e: any) {
      const m = e.response?.data?.message;
      setError(
        Array.isArray(m) ? m.join(", ") : (m ?? "Failed to create slot"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm rounded-2xl border shadow-2xl z-10 dark:bg-[#160C24] dark:border-purple-900/40 bg-white border-purple-100">
        <div className="p-6">
          <h2 className="text-lg font-bold dark:text-purple-100 text-purple-900 mb-0.5">
            Add Availability
          </h2>
          <p className="text-sm dark:text-purple-400/60 text-purple-400 mb-5">
            Log Flight Slot
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium dark:text-purple-300/70 text-purple-600 mb-1.5">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-full px-3 py-2.5 rounded-xl border dark:border-purple-800/40 border-purple-200 dark:bg-[#1A1428] bg-purple-50 dark:text-purple-100 text-purple-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium dark:text-purple-300/70 text-purple-600 mb-1.5">
                  Start Time
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border dark:border-purple-800/40 border-purple-200 dark:bg-[#1A1428] bg-purple-50 dark:text-purple-100 text-purple-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                />
              </div>
              <div>
                <label className="block text-xs font-medium dark:text-purple-300/70 text-purple-600 mb-1.5">
                  End Time
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border dark:border-purple-800/40 border-purple-200 dark:bg-[#1A1428] bg-purple-50 dark:text-purple-100 text-purple-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                />
              </div>
            </div>

            <div className="p-3 rounded-xl dark:bg-purple-900/20 bg-purple-50 border dark:border-purple-800/30 border-purple-200">
              <p className="text-xs dark:text-purple-300/70 text-purple-600">
                📋 Rules: 30min–4hr sessions. Must be at least 24h in advance
                for best visibility. Overlapping slots are not allowed.
              </p>
            </div>
          </div>

          {error && <p className="text-red-400 text-sm mt-3">{error}</p>}

          <div className="flex gap-3 mt-5">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border dark:border-purple-800/40 border-purple-200 dark:text-purple-300 text-purple-700 text-sm transition-colors dark:hover:bg-purple-900/20 hover:bg-purple-50"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Add Slot 📅"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Cancel/Reschedule Modal ──────────────────────────────────────────────────

interface CancelModalProps {
  shift: Shift;
  onClose: () => void;
  onDone: (shiftId: string, action: "cancel" | "reschedule") => void;
}

function CancelModal({ shift, onClose, onDone }: CancelModalProps) {
  const [action, setAction] = useState<"cancel" | "reschedule">("cancel");
  const [initiator, setInitiator] = useState<"student" | "teacher">("teacher");
  const [studentCode, setStudentCode] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"info" | "confirm">(
    initiator === "teacher" ? "info" : "info",
  );

  const hoursUntil = (new Date(shift.start).getTime() - Date.now()) / 3600000;
  const isTeacherInitiated = initiator === "teacher";

  const submit = async () => {
    if (isTeacherInitiated && !reason) {
      setError("Please provide a reason");
      return;
    }
    if (initiator === "student" && !studentCode.trim()) {
      setError("Enter the student-provided cancellation code");
      return;
    }
    if (action === "reschedule" && (!newDate || !newStart || !newEnd)) {
      setError("New time is required for rescheduling");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      // For cancellation: delete the booking if booked, or the shift if unbooked
      if (action === "cancel") {
        if (shift.isBooked && shift.booking) {
          await axios.delete(
            `${process.env.NEXT_PUBLIC_API_URL}/bookings/${shift.booking.id}`,
            {
              headers: { Authorization: `Bearer ${token}` },
              data: {
                initiatedBy: initiator,
                reason,
                studentCode: initiator === "student" ? studentCode : undefined,
              },
            },
          );
        } else {
          await axios.delete(
            `${process.env.NEXT_PUBLIC_API_URL}/shifts/${shift.id}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );
        }
        onDone(shift.id, "cancel");
      } else {
        // Reschedule — update shift times (endpoint may need to be added)
        const newStartDt = new Date(`${newDate}T${newStart}:00`);
        const newEndDt = new Date(`${newDate}T${newEnd}:00`);
        await axios.patch(
          `${process.env.NEXT_PUBLIC_API_URL}/shifts/${shift.id}`,
          {
            start: newStartDt.toISOString(),
            end: newEndDt.toISOString(),
            initiatedBy: initiator,
            reason,
          },
          { headers: { Authorization: `Bearer ${token}` } },
        );
        onDone(shift.id, "reschedule");
      }
    } catch (e: any) {
      const m = e.response?.data?.message;
      setError(Array.isArray(m) ? m.join(", ") : (m ?? "Failed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-2xl border shadow-2xl z-10 dark:bg-[#160C24] dark:border-purple-900/40 bg-white border-purple-100 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-lg font-bold dark:text-purple-100 text-purple-900 mb-1">
            {shift.isBooked ? "Modify Booking" : "Remove Slot"}
          </h2>
          <p className="text-sm dark:text-purple-400/60 text-purple-400 mb-4">
            {new Date(shift.start).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}{" "}
            ·{" "}
            {new Date(shift.start).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>

          {/* Action selector */}
          {shift.isBooked && (
            <div className="mb-4 grid grid-cols-2 gap-2">
              {(["cancel", "reschedule"] as const).map((a) => (
                <button
                  key={a}
                  onClick={() => setAction(a)}
                  className={`py-2 rounded-xl text-sm font-medium border-2 transition-all capitalize ${
                    action === a
                      ? "border-purple-600 bg-purple-600 text-white"
                      : "dark:border-purple-800/40 border-purple-200 dark:text-purple-300 text-purple-700"
                  }`}
                >
                  {a === "cancel" ? "❌ Cancel" : "🔄 Reschedule"}
                </button>
              ))}
            </div>
          )}

          {/* Who is initiating? */}
          {shift.isBooked && (
            <div className="mb-4">
              <p className="text-xs font-medium dark:text-purple-300/70 text-purple-600 mb-2">
                Who is requesting this?
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(["teacher", "student"] as const).map((i) => (
                  <button
                    key={i}
                    onClick={() => setInitiator(i)}
                    className={`py-2 rounded-xl text-sm border-2 transition-all capitalize ${
                      initiator === i
                        ? "border-blue-600 bg-blue-600/20 dark:text-blue-300 text-blue-700"
                        : "dark:border-purple-800/40 border-purple-200 dark:text-purple-300 text-purple-700"
                    }`}
                  >
                    {i === "teacher" ? "✈️ Me (Teacher)" : "👦 Student"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Rules reminder for teacher-initiated */}
          {isTeacherInitiated && shift.isBooked && (
            <div
              className={`mb-4 p-3 rounded-xl text-xs border ${
                hoursUntil < 2
                  ? "dark:bg-red-900/20 dark:border-red-800/30 bg-red-50 border-red-200 dark:text-red-300 text-red-700"
                  : hoursUntil < 24
                    ? "dark:bg-amber-900/20 dark:border-amber-800/30 bg-amber-50 border-amber-200 dark:text-amber-300 text-amber-700"
                    : "dark:bg-purple-900/20 dark:border-purple-800/30 bg-purple-50 border-purple-200 dark:text-purple-300 text-purple-700"
              }`}
            >
              <p className="font-bold mb-1">
                {hoursUntil < 2
                  ? "🚨 High Risk Cancellation"
                  : hoursUntil < 24
                    ? "⚠️ Late Cancellation Warning"
                    : "📋 Cancellation Rules"}
              </p>
              {hoursUntil < 2 && (
                <p>
                  Cancelling less than 2 hours before class: No refund to parent
                  + 1 strike issued to you.
                </p>
              )}
              {hoursUntil >= 2 && hoursUntil < 24 && (
                <p>
                  Less than 24 hours notice: Partial refund to parent. Counts
                  toward your monthly limit.
                </p>
              )}
              {hoursUntil >= 24 && (
                <p>
                  Full refund to parent. Still counts toward your 2 free
                  cancellations this month. Exceeding = 1 strike each.
                </p>
              )}
              <p className="mt-1">
                View full policy:{" "}
                <button
                  className="underline"
                  onClick={() => window.open("/teacher-conduct", "_blank")}
                >
                  Pilot Guidelines
                </button>
              </p>
            </div>
          )}

          {/* Student code verification */}
          {initiator === "student" && (
            <div className="mb-4">
              <label className="block text-xs font-medium dark:text-purple-300/70 text-purple-600 mb-1.5">
                Student Cancellation Code
              </label>
              <input
                value={studentCode}
                onChange={(e) => setStudentCode(e.target.value)}
                placeholder="Enter code provided by student"
                className="w-full px-3 py-2.5 rounded-xl border dark:border-purple-800/40 border-purple-200 dark:bg-[#1A1428] bg-purple-50 dark:text-purple-100 text-purple-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30"
              />
              <p className="text-xs dark:text-purple-400/50 text-purple-400 mt-1">
                The student will receive a code in their dashboard to share with
                you. This verifies their request.
              </p>
            </div>
          )}

          {/* New time for reschedule */}
          {action === "reschedule" && (
            <div className="mb-4 space-y-3">
              <p className="text-xs font-medium dark:text-purple-300/70 text-purple-600">
                New Time
              </p>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-full px-3 py-2.5 rounded-xl border dark:border-purple-800/40 border-purple-200 dark:bg-[#1A1428] bg-purple-50 dark:text-purple-100 text-purple-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="time"
                  value={newStart}
                  onChange={(e) => setNewStart(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border dark:border-purple-800/40 border-purple-200 dark:bg-[#1A1428] bg-purple-50 dark:text-purple-100 text-purple-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                />
                <input
                  type="time"
                  value={newEnd}
                  onChange={(e) => setNewEnd(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border dark:border-purple-800/40 border-purple-200 dark:bg-[#1A1428] bg-purple-50 dark:text-purple-100 text-purple-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                />
              </div>
            </div>
          )}

          {/* Reason */}
          <div className="mb-4">
            <label className="block text-xs font-medium dark:text-purple-300/70 text-purple-600 mb-1.5">
              Reason {isTeacherInitiated ? "(required)" : "(optional)"}
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Brief explanation…"
              rows={2}
              className="w-full px-3 py-2 rounded-xl border dark:border-purple-800/40 border-purple-200 dark:bg-[#1A1428] bg-purple-50 dark:text-purple-100 text-purple-900 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/30"
            />
          </div>

          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border dark:border-purple-800/40 border-purple-200 dark:text-purple-300 text-purple-700 text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={submitting}
              className={`flex-1 py-2.5 rounded-xl text-white text-sm font-medium transition-colors disabled:opacity-50 ${
                action === "cancel"
                  ? "bg-red-600 hover:bg-red-500"
                  : "bg-purple-600 hover:bg-purple-500"
              }`}
            >
              {submitting
                ? "…"
                : action === "cancel"
                  ? "Confirm Cancel"
                  : "Reschedule"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Calendar ─────────────────────────────────────────────────────────────

function CalendarContent() {
  const router = useRouter();
  const { isDark } = useTheme();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addDefaultDate, setAddDefaultDate] = useState(new Date());
  const [cancelShift, setCancelShift] = useState<Shift | null>(null);
  const [view, setView] = useState<"week" | "list">("week");

  // Get week start (Monday) for the current offset
  const getWeekStart = (offset: number) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) + offset * 7;
    d.setDate(diff);
    return d;
  };

  const weekStart = getWeekStart(weekOffset);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    (async () => {
      try {
        const [shiftsRes, profileRes] = await Promise.all([
          axios.get(`${process.env.NEXT_PUBLIC_API_URL}/shifts`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${process.env.NEXT_PUBLIC_API_URL}/teachers/me/profile`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        setShifts(shiftsRes.data ?? []);
        setProfile(profileRes.data);
      } catch (e: any) {
        const m = e.response?.data?.message;
        setError(Array.isArray(m) ? m.join(", ") : (m ?? "Failed to load"));
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  // Scroll to 7AM on mount
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 7 * HOUR_PX - 20;
    }
  }, [loading]);

  const getShiftsForDay = (day: Date) =>
    shifts.filter((s) => {
      const sd = new Date(s.start);
      return sd.toDateString() === day.toDateString();
    });

  const shiftStyle = (shift: Shift, day: Date) => {
    const start = new Date(shift.start);
    const end = new Date(shift.end);
    const topMin = start.getHours() * 60 + start.getMinutes();
    const durMin = (end.getTime() - start.getTime()) / 60000;
    const top = (topMin / 60) * HOUR_PX;
    const height = (durMin / 60) * HOUR_PX;
    return { top, height: Math.max(height, 24) };
  };

  const card =
    "rounded-2xl border dark:bg-gray-900/40 dark:border-purple-900/30 bg-white border-purple-100 shadow-sm";

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen dark:bg-[#0A0714] bg-[#FAF5FF]">
        <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="min-h-screen dark:bg-[#0A0714] bg-[#FAF5FF] transition-colors">
      <TeacherNav
        teacherName={profile?.user?.fullName ?? "Pilot"}
        avatarUrl={profile?.user?.avatarUrl ?? null}
        rankTier={profile?.rankTier ?? 0}
      />

      <div className="lg:pl-64 transition-all duration-300">
        <div className="px-3 sm:px-6 py-4 sm:py-6">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4 sm:mb-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold dark:text-purple-100 text-purple-900">
                Schedule
              </h1>
              <p className="text-sm dark:text-purple-400/60 text-purple-400">
                Flight Log ✦
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* View toggle */}
              <div className={`${card} p-1 flex rounded-xl`}>
                {(["week", "list"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
                      view === v
                        ? "bg-purple-600 text-white"
                        : "dark:text-purple-300/70 text-purple-500"
                    }`}
                  >
                    {v === "week" ? "📅 Week" : "📋 List"}
                  </button>
                ))}
              </div>

              {/* Add slot button */}
              <button
                onClick={() => {
                  setAddDefaultDate(new Date());
                  setShowAddModal(true);
                }}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
              >
                + Add Availability
                <span className="hidden sm:inline ml-1 text-xs opacity-70">
                  Log Flight Slot
                </span>
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-900/20 border border-red-700/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Week navigation */}
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => setWeekOffset((o) => o - 1)}
              className="p-2 rounded-xl dark:bg-purple-900/30 bg-purple-100 dark:text-purple-300 text-purple-700 dark:hover:bg-purple-900/50 hover:bg-purple-200 transition-colors"
            >
              ←
            </button>
            <p className="text-sm font-medium dark:text-purple-200 text-purple-800 flex-1 text-center">
              {weekDays[0].toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}{" "}
              –{" "}
              {weekDays[6].toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            <button
              onClick={() => setWeekOffset((o) => o + 1)}
              className="p-2 rounded-xl dark:bg-purple-900/30 bg-purple-100 dark:text-purple-300 text-purple-700 dark:hover:bg-purple-900/50 hover:bg-purple-200 transition-colors"
            >
              →
            </button>
            {weekOffset !== 0 && (
              <button
                onClick={() => setWeekOffset(0)}
                className="text-xs px-3 py-1.5 rounded-lg dark:bg-purple-900/30 bg-purple-100 dark:text-purple-300 text-purple-700 transition-colors"
              >
                Today
              </button>
            )}
          </div>

          {view === "list" ? (
            /* ── List View ────────────────────────────────────────────────────── */
            <div className={`${card} overflow-hidden`}>
              {shifts.length === 0 ? (
                <div className="p-10 text-center">
                  <p className="text-3xl mb-3">📅</p>
                  <p className="font-semibold dark:text-purple-100 text-purple-900">
                    No availability slots yet
                  </p>
                  <p className="text-sm dark:text-purple-400/60 text-purple-400 mt-1 mb-4">
                    Add time slots so cadets can book your classes
                  </p>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-xl transition-colors"
                  >
                    Add First Slot
                  </button>
                </div>
              ) : (
                <div className="divide-y dark:divide-purple-900/20 divide-purple-100">
                  {[...shifts]
                    .sort(
                      (a, b) =>
                        new Date(a.start).getTime() -
                        new Date(b.start).getTime(),
                    )
                    .map((shift) => {
                      const start = new Date(shift.start);
                      const end = new Date(shift.end);
                      const isPast = end < new Date();
                      return (
                        <div
                          key={shift.id}
                          className="px-4 sm:px-5 py-3 flex items-center gap-3 sm:gap-4 dark:hover:bg-purple-900/10 hover:bg-purple-50/50 transition-colors"
                        >
                          <div
                            className={`w-2 h-10 rounded-full flex-shrink-0 ${isPast ? "dark:bg-gray-700 bg-gray-300" : shift.isBooked ? "bg-green-500" : "bg-purple-500"}`}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium dark:text-purple-100 text-purple-900">
                              {start.toLocaleDateString("en-US", {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                              })}
                            </p>
                            <p className="text-xs dark:text-purple-400/60 text-purple-400">
                              {start.toLocaleTimeString("en-US", {
                                hour: "numeric",
                                minute: "2-digit",
                              })}{" "}
                              –{" "}
                              {end.toLocaleTimeString("en-US", {
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                          {shift.isBooked && shift.booking && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/30 text-green-400 border border-green-800/30 flex-shrink-0">
                              {shift.booking.student.name}
                            </span>
                          )}
                          {!isPast && (
                            <button
                              onClick={() => setCancelShift(shift)}
                              className="text-xs px-2.5 py-1.5 rounded-lg dark:bg-red-900/20 bg-red-50 dark:text-red-400 text-red-600 dark:hover:bg-red-900/30 hover:bg-red-100 transition-colors flex-shrink-0"
                            >
                              {shift.isBooked ? "Modify" : "Remove"}
                            </button>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          ) : (
            /* ── Week Calendar View ───────────────────────────────────────────── */
            <div className={`${card} overflow-hidden`}>
              {/* Day headers */}
              <div className="grid grid-cols-[48px_repeat(7,1fr)] border-b dark:border-purple-900/20 border-purple-100">
                <div />
                {weekDays.map((day) => {
                  const isToday =
                    day.toDateString() === new Date().toDateString();
                  return (
                    <div
                      key={day.toISOString()}
                      className="py-3 text-center border-l dark:border-purple-900/20 border-purple-100"
                    >
                      <p className="text-xs dark:text-purple-400/60 text-purple-400 uppercase">
                        {day.toLocaleDateString("en-US", { weekday: "short" })}
                      </p>
                      <p
                        className={`text-sm font-bold mt-0.5 ${isToday ? "w-7 h-7 rounded-full bg-purple-600 text-white flex items-center justify-center mx-auto" : "dark:text-purple-100 text-purple-900"}`}
                      >
                        {day.getDate()}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Scrollable grid */}
              <div
                ref={scrollRef}
                className="overflow-y-auto"
                style={{ maxHeight: "60vh" }}
              >
                <div className="grid grid-cols-[48px_repeat(7,1fr)] relative">
                  {/* Hours */}
                  <div>
                    {Array.from({ length: 24 }, (_, h) => (
                      <div
                        key={h}
                        style={{ height: HOUR_PX }}
                        className="border-b dark:border-purple-900/10 border-purple-100/60 flex items-start pt-1"
                      >
                        <span className="text-xs dark:text-purple-400/30 text-purple-300 pr-2 w-full text-right">
                          {h === 0
                            ? "12 AM"
                            : h < 12
                              ? `${h} AM`
                              : h === 12
                                ? "12 PM"
                                : `${h - 12} PM`}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Day columns */}
                  {weekDays.map((day) => {
                    const dayShifts = getShiftsForDay(day);
                    return (
                      <div
                        key={day.toISOString()}
                        className="relative border-l dark:border-purple-900/20 border-purple-100 cursor-pointer"
                        style={{ height: 24 * HOUR_PX }}
                        onClick={() => {
                          setAddDefaultDate(day);
                          setShowAddModal(true);
                        }}
                      >
                        {/* Hour lines */}
                        {Array.from({ length: 24 }, (_, h) => (
                          <div
                            key={h}
                            style={{ top: h * HOUR_PX, height: HOUR_PX }}
                            className="absolute inset-x-0 border-b dark:border-purple-900/10 border-purple-100/40"
                          />
                        ))}

                        {/* Current time line */}
                        {day.toDateString() === new Date().toDateString() && (
                          <div
                            className="absolute inset-x-0 z-10 pointer-events-none"
                            style={{
                              top:
                                ((new Date().getHours() * 60 +
                                  new Date().getMinutes()) /
                                  60) *
                                HOUR_PX,
                            }}
                          >
                            <div className="h-0.5 bg-red-500 relative">
                              <div className="absolute -left-1 -top-1.5 w-3 h-3 rounded-full bg-red-500" />
                            </div>
                          </div>
                        )}

                        {/* Shifts */}
                        {dayShifts.map((shift) => {
                          const { top, height } = shiftStyle(shift, day);
                          const isPast = new Date(shift.end) < new Date();
                          return (
                            <div
                              key={shift.id}
                              className={`absolute inset-x-0.5 rounded-lg overflow-hidden z-20 transition-opacity ${isPast ? "opacity-40" : "opacity-100"}`}
                              style={{ top: top + 1, height: height - 2 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isPast) setCancelShift(shift);
                              }}
                            >
                              <div
                                className={`h-full px-1.5 py-1 text-xs text-white cursor-pointer ${
                                  shift.isBooked
                                    ? "bg-green-600 hover:bg-green-500"
                                    : "bg-purple-600 hover:bg-purple-500"
                                }`}
                              >
                                <p className="font-semibold truncate leading-tight">
                                  {shift.isBooked
                                    ? `📗 ${shift.booking?.student.name}`
                                    : "📅 Open"}
                                </p>
                                {height > 30 && (
                                  <p className="opacity-80 truncate">
                                    {new Date(shift.start).toLocaleTimeString(
                                      "en-US",
                                      { hour: "numeric", minute: "2-digit" },
                                    )}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showAddModal && (
        <AddSlotModal
          defaultDate={addDefaultDate}
          onClose={() => setShowAddModal(false)}
          onAdded={(shift) => setShifts((prev) => [...prev, shift])}
        />
      )}
      {cancelShift && (
        <CancelModal
          shift={cancelShift}
          onClose={() => setCancelShift(null)}
          onDone={(id, action) => {
            if (action === "cancel")
              setShifts((prev) => prev.filter((s) => s.id !== id));
            setCancelShift(null);
          }}
        />
      )}
    </div>
  );
}

export default function CalendarPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen dark:bg-[#0A0714] bg-[#FAF5FF]">
          <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CalendarContent />
    </Suspense>
  );
}
