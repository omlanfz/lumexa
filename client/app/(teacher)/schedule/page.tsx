// FILE PATH: client/app/schedule/page.tsx
//
// Schedule = single scheduling hub: availability, recurring slots, upcoming
// classes, cancellations, and rescheduling all live here. A booked class's
// "Manage" action opens a modal that walks through Reschedule/Cancel →
// who's requesting it → the category-specific fields, then posts straight
// to POST /reschedule/:bookingId (teacher UI → policy validation → audit →
// booking/shift update — see server/src/reschedule/reschedule.service.ts).
// There is no separate Reschedule page and no admin-approval step.

"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import LumiChat from "@/components/LumiChat";
import TeacherPageSkeleton from "@/components/TeacherPageSkeleton";

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
}

interface EmergencyStatus {
  count: number;
  limit: number;
}

// ─── Add Slot Modal ───────────────────────────────────────────────────────────

interface AddSlotModalProps {
  onClose: () => void;
  onAdded: (shift: Shift | Shift[]) => void;
  defaultDate: Date;
}

function AddSlotModal({ onClose, onAdded, defaultDate }: AddSlotModalProps) {
  const [date, setDate] = useState(defaultDate.toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [recurring, setRecurring] = useState(false);
  const [recurWeeks, setRecurWeeks] = useState(4);
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
      const res = await api.post("/shifts", {
        start: startDt.toISOString(),
        end: endDt.toISOString(),
        recurring,
        recurWeeks: recurring ? recurWeeks : 1,
      });
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
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200"
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm rounded-2xl border shadow-2xl z-10 bg-[var(--t-surface)] border-[var(--t-border)] modal-pop">
        <div className="p-6">
          <h2 className="text-lg font-bold text-[var(--t-text)] mb-0.5">
            Add Availability
          </h2>
          <p className="text-sm text-[var(--t-text-muted)] mb-5">
            Let students book this time slot
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--t-text-muted)] mb-1.5">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-full px-3 py-2.5 rounded-xl border bg-[var(--t-surface)] border-[var(--t-border)] text-[var(--t-text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--t-accent)]/30 transition-shadow"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[var(--t-text-muted)] mb-1.5">
                  Start Time
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border bg-[var(--t-surface)] border-[var(--t-border)] text-[var(--t-text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--t-accent)]/30 transition-shadow"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--t-text-muted)] mb-1.5">
                  End Time
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border bg-[var(--t-surface)] border-[var(--t-border)] text-[var(--t-text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--t-accent)]/30 transition-shadow"
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[var(--t-accent-light)] border border-[var(--t-border)] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--t-text)]">
                    Repeat weekly
                  </p>
                  <p className="text-xs text-[var(--t-text-muted)]">
                    Auto-create this slot every week
                  </p>
                </div>
                <button
                  onClick={() => setRecurring((r) => !r)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 cursor-pointer ${
                    recurring ? "bg-[var(--t-accent)]" : "bg-[var(--t-surface-3)]"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                      recurring ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {recurring && (
                <div>
                  <label className="block text-xs font-medium text-[var(--t-text-muted)] mb-1.5">
                    Repeat for how many weeks?
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    {[2, 4, 6, 8, 12].map((w) => (
                      <button
                        key={w}
                        onClick={() => setRecurWeeks(w)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer ${
                          recurWeeks === w
                            ? "bg-[var(--t-accent)] text-white"
                            : "bg-[var(--t-surface)] text-[var(--t-text-muted)] border border-[var(--t-border)]"
                        }`}
                      >
                        {w}w
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {error && (
            <p className="text-red-500 dark:text-red-400 text-sm mt-3 whitespace-pre-wrap">
              {error}
            </p>
          )}

          <div className="flex gap-3 mt-5">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-[var(--t-border)] text-[var(--t-text-muted)] text-sm transition-colors duration-150 hover:bg-[var(--t-nav-hover)]"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl bg-[var(--t-accent)] hover:bg-[var(--t-accent-hover)] text-white text-sm font-medium transition-all duration-150 active:scale-[0.98] disabled:opacity-50"
            >
              {submitting
                ? "Saving…"
                : recurring
                  ? `Add ${recurWeeks} Slots`
                  : "Add Slot"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Manage Booking Modal (Reschedule / Cancel) ────────────────────────────

interface ManageBookingModalProps {
  shift: Shift;
  emergencyStatus: EmergencyStatus | null;
  onClose: () => void;
  onDone: (shiftId: string, action: "cancel" | "reschedule") => void;
}

function ManageBookingModal({
  shift,
  emergencyStatus,
  onClose,
  onDone,
}: ManageBookingModalProps) {
  const [action, setAction] = useState<"RESCHEDULE" | "CANCEL">("RESCHEDULE");
  const [category, setCategory] = useState<
    "STUDENT_REQUESTED" | "TEACHER_EMERGENCY" | null
  >(null);
  const [initiatedByRole, setInitiatedByRole] = useState<"STUDENT" | "PARENT">(
    "STUDENT",
  );
  const [newDate, setNewDate] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [reason, setReason] = useState("");
  const [informedStudent, setInformedStudent] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const willExceedFreeLimit =
    category === "TEACHER_EMERGENCY" &&
    emergencyStatus !== null &&
    emergencyStatus.count + 1 > emergencyStatus.limit;

  const submit = async () => {
    setError(null);

    if (!category) {
      setError("Please select who is requesting this change.");
      return;
    }
    if (action === "RESCHEDULE" && (!newDate || !newStart || !newEnd)) {
      setError("New date/time is required to reschedule.");
      return;
    }
    if (category === "STUDENT_REQUESTED" && !proofFile) {
      setError("Proof upload is required for a student/parent-requested change.");
      return;
    }
    if (category === "TEACHER_EMERGENCY" && !reason.trim()) {
      setError("Please provide a short reason.");
      return;
    }

    setSubmitting(true);
    try {
      let proofUrl: string | undefined;
      if (category === "STUDENT_REQUESTED" && proofFile) {
        const fd = new FormData();
        fd.append("proof", proofFile);
        const uploadRes = await api.post("/uploads/proof", fd);
        proofUrl = uploadRes.data.url;
      }

      const payload: Record<string, unknown> = {
        action,
        category,
        initiatedByRole: category === "TEACHER_EMERGENCY" ? "TEACHER" : initiatedByRole,
        reason: reason.trim() || undefined,
      };
      if (action === "RESCHEDULE") {
        payload.newStart = new Date(`${newDate}T${newStart}:00`).toISOString();
        payload.newEnd = new Date(`${newDate}T${newEnd}:00`).toISOString();
      }
      if (category === "STUDENT_REQUESTED") {
        payload.proofUrl = proofUrl;
      } else {
        payload.informedStudent = informedStudent;
      }

      await api.post(`/reschedule/${shift.booking!.id}`, payload);
      onDone(shift.id, action === "CANCEL" ? "cancel" : "reschedule");
    } catch (e: any) {
      const m = e.response?.data?.message;
      setError(Array.isArray(m) ? m.join(", ") : (m ?? "Failed"));
    } finally {
      setSubmitting(false);
    }
  };

  const chip = (active: boolean) =>
    `py-2.5 rounded-xl text-sm font-medium border-2 transition-all duration-150 cursor-pointer ${
      active
        ? "border-[var(--t-accent)] bg-[var(--t-accent)] text-white"
        : "border-[var(--t-border)] text-[var(--t-text-muted)] hover:border-[var(--t-border-strong)]"
    }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-2xl border shadow-2xl z-10 bg-[var(--t-surface)] border-[var(--t-border)] max-h-[90vh] overflow-y-auto modal-pop">
        <div className="p-6">
          <h2 className="text-lg font-bold text-[var(--t-text)] mb-1">
            Manage Class
          </h2>
          <p className="text-sm text-[var(--t-text-muted)] mb-4">
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
          <div className="mb-4 grid grid-cols-2 gap-2">
            {(["RESCHEDULE", "CANCEL"] as const).map((a) => (
              <button
                key={a}
                onClick={() => setAction(a)}
                className={chip(action === a)}
              >
                {a === "RESCHEDULE" ? "Reschedule" : "Cancel"}
              </button>
            ))}
          </div>

          {/* Who requested this? */}
          <div className="mb-4">
            <p className="text-xs font-medium text-[var(--t-text-muted)] mb-2">
              Who requested this?
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setCategory("STUDENT_REQUESTED")}
                className={chip(category === "STUDENT_REQUESTED")}
              >
                Student/Parent
              </button>
              <button
                onClick={() => setCategory("TEACHER_EMERGENCY")}
                className={chip(category === "TEACHER_EMERGENCY")}
              >
                Teacher emergency
              </button>
            </div>
          </div>

          {/* ── Student/Parent requested fields ── */}
          {category === "STUDENT_REQUESTED" && (
            <div className="mb-4 space-y-3 fade-in">
              <div>
                <p className="text-xs font-medium text-[var(--t-text-muted)] mb-2">
                  Requested by
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(["STUDENT", "PARENT"] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setInitiatedByRole(r)}
                      className={chip(initiatedByRole === r)}
                    >
                      {r === "STUDENT" ? "Student" : "Parent"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--t-text-muted)] mb-1.5">
                  Proof upload (required)
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2.5 rounded-xl border border-dashed border-[var(--t-border-strong)] text-sm text-[var(--t-text-muted)] hover:bg-[var(--t-nav-hover)] transition-colors duration-150"
                >
                  {proofFile ? proofFile.name : "Choose file (screenshot, message, etc.)"}
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--t-text-muted)] mb-1.5">
                  Optional short note
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  placeholder="Anything else worth noting…"
                  className="w-full px-3 py-2 rounded-xl border bg-[var(--t-surface)] border-[var(--t-border)] text-[var(--t-text)] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--t-accent)]/30"
                />
              </div>

              <div className="p-3 rounded-xl bg-[var(--t-success-bg)] text-[var(--t-success-text)] text-xs">
                This never counts against your monthly emergency limit.
              </div>
            </div>
          )}

          {/* ── Teacher emergency fields ── */}
          {category === "TEACHER_EMERGENCY" && (
            <div className="mb-4 space-y-3 fade-in">
              {emergencyStatus && (
                <div
                  className={`p-3 rounded-xl text-xs border ${
                    willExceedFreeLimit
                      ? "bg-[var(--t-warning-bg)] border-[var(--t-warning)]/30 text-[var(--t-warning)]"
                      : "bg-[var(--t-accent-light)] border-[var(--t-border)] text-[var(--t-text-muted)]"
                  }`}
                >
                  <p className="font-semibold">
                    Emergency reschedules this month: {emergencyStatus.count}/
                    {emergencyStatus.limit}
                  </p>
                  {willExceedFreeLimit && (
                    <p className="mt-1">
                      This will exceed your free monthly limit. It will never be
                      blocked — but it may affect your payout, pending Operations
                      review.
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[var(--t-text-muted)] mb-1.5">
                  Short reason (required)
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  placeholder="What happened?"
                  className="w-full px-3 py-2 rounded-xl border bg-[var(--t-surface)] border-[var(--t-border)] text-[var(--t-text)] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--t-accent)]/30"
                />
              </div>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={informedStudent}
                  onChange={(e) => setInformedStudent(e.target.checked)}
                  className="mt-0.5"
                />
                <span className="text-sm text-[var(--t-text)]">
                  Have you informed the student/parent?
                </span>
              </label>
            </div>
          )}

          {/* New time for reschedule */}
          {action === "RESCHEDULE" && category && (
            <div className="mb-4 space-y-3 fade-in">
              <p className="text-xs font-medium text-[var(--t-text-muted)]">
                New date/time
              </p>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-full px-3 py-2.5 rounded-xl border bg-[var(--t-surface)] border-[var(--t-border)] text-[var(--t-text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--t-accent)]/30"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="time"
                  value={newStart}
                  onChange={(e) => setNewStart(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border bg-[var(--t-surface)] border-[var(--t-border)] text-[var(--t-text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--t-accent)]/30"
                />
                <input
                  type="time"
                  value={newEnd}
                  onChange={(e) => setNewEnd(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border bg-[var(--t-surface)] border-[var(--t-border)] text-[var(--t-text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--t-accent)]/30"
                />
              </div>
            </div>
          )}

          {error && <p className="text-red-500 dark:text-red-400 text-sm mb-3">{error}</p>}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-[var(--t-border)] text-[var(--t-text-muted)] text-sm transition-colors duration-150"
            >
              Close
            </button>
            <button
              onClick={submit}
              disabled={submitting || !category}
              className={`flex-1 py-2.5 rounded-xl text-white text-sm font-medium transition-all duration-150 active:scale-[0.98] disabled:opacity-50 ${
                action === "CANCEL"
                  ? "bg-red-600 hover:bg-red-500"
                  : "bg-[var(--t-accent)] hover:bg-[var(--t-accent-hover)]"
              }`}
            >
              {submitting ? "…" : "Confirm"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Simple remove-unbooked-slot confirm ───────────────────────────────────

function RemoveSlotModal({
  shift,
  onClose,
  onRemoved,
}: {
  shift: Shift;
  onClose: () => void;
  onRemoved: (id: string) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await api.delete(`/shifts/${shift.id}`);
      onRemoved(shift.id);
    } catch (e: any) {
      const m = e.response?.data?.message;
      setError(Array.isArray(m) ? m.join(", ") : (m ?? "Failed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl border shadow-2xl z-10 bg-[var(--t-surface)] border-[var(--t-border)] modal-pop p-6">
        <h2 className="text-lg font-bold text-[var(--t-text)] mb-1">Remove Slot</h2>
        <p className="text-sm text-[var(--t-text-muted)] mb-5">
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
        {error && <p className="text-red-500 dark:text-red-400 text-sm mb-3">{error}</p>}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-[var(--t-border)] text-[var(--t-text-muted)] text-sm transition-colors duration-150"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-all duration-150 active:scale-[0.98] disabled:opacity-50"
          >
            {submitting ? "…" : "Remove"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Schedule ─────────────────────────────────────────────────────────

function ScheduleContent() {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [emergencyStatus, setEmergencyStatus] = useState<EmergencyStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addDefaultDate, setAddDefaultDate] = useState(new Date());
  const [manageShift, setManageShift] = useState<Shift | null>(null);
  const [removeShift, setRemoveShift] = useState<Shift | null>(null);
  const [view, setView] = useState<"week" | "list">("week");

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

  const refreshEmergencyStatus = () => {
    api
      .get("/reschedule/emergency-status")
      .then((res) => setEmergencyStatus(res.data))
      .catch(() => {});
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    (async () => {
      try {
        const [shiftsRes, profileRes] = await Promise.all([
          api.get("/shifts"),
          api.get("/teachers/me/profile"),
        ]);
        setShifts(shiftsRes.data ?? []);
        setProfile(profileRes.data);
        refreshEmergencyStatus();
      } catch (e: any) {
        const m = e.response?.data?.message;
        setError(Array.isArray(m) ? m.join(", ") : (m ?? "Failed to load"));
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

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

  const shiftStyle = (shift: Shift) => {
    const start = new Date(shift.start);
    const end = new Date(shift.end);
    const topMin = start.getHours() * 60 + start.getMinutes();
    const durMin = (end.getTime() - start.getTime()) / 60000;
    const top = (topMin / 60) * HOUR_PX;
    const height = (durMin / 60) * HOUR_PX;
    return { top, height: Math.max(height, 24) };
  };

  const card = "t-card shadow-sm";

  if (loading) return <TeacherPageSkeleton />;

  return (
    <>
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4 sm:mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--t-text)]">
              Schedule
            </h1>
            <p className="text-sm text-[var(--t-text-muted)]">
              Availability, bookings, and rescheduling in one place
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className={`${card} p-1 flex rounded-xl`}>
              {(["week", "list"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 capitalize ${
                    v === view
                      ? "bg-[var(--t-accent)] text-white"
                      : "text-[var(--t-text-muted)]"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setAddDefaultDate(new Date());
                setShowAddModal(true);
              }}
              className="px-4 py-2 bg-[var(--t-accent)] hover:bg-[var(--t-accent-hover)] text-white text-sm font-medium rounded-xl transition-all duration-150 active:scale-[0.98] shadow-sm"
            >
              + Add Availability
            </button>
          </div>
        </div>

        {emergencyStatus && (
          <div className="mb-4 sm:mb-6 flex items-center gap-2 text-xs text-[var(--t-text-muted)]">
            <span
              className={`px-2.5 py-1 rounded-full ${
                emergencyStatus.count >= emergencyStatus.limit
                  ? "bg-[var(--t-warning-bg)] text-[var(--t-warning)]"
                  : "bg-[var(--t-accent-light)]"
              }`}
            >
              Emergency reschedules this month: {emergencyStatus.count}/
              {emergencyStatus.limit}
            </span>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-[var(--t-danger-bg)] text-[var(--t-danger)] text-sm">
            {error}
          </div>
        )}

        {/* Week navigation */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => setWeekOffset((o) => o - 1)}
            className="p-2 rounded-xl bg-[var(--t-nav-active)] text-[var(--t-nav-active-text)] hover:bg-[var(--t-nav-hover)] transition-colors duration-150"
          >
            ←
          </button>
          <p className="text-sm font-medium text-[var(--t-text)] flex-1 text-center">
            {weekDays[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} –{" "}
            {weekDays[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>
          <button
            onClick={() => setWeekOffset((o) => o + 1)}
            className="p-2 rounded-xl bg-[var(--t-nav-active)] text-[var(--t-nav-active-text)] hover:bg-[var(--t-nav-hover)] transition-colors duration-150"
          >
            →
          </button>
          {weekOffset !== 0 && (
            <button
              onClick={() => setWeekOffset(0)}
              className="text-xs px-3 py-1.5 rounded-lg bg-[var(--t-accent-light)] text-[var(--t-nav-active-text)] transition-colors duration-150"
            >
              Today
            </button>
          )}
        </div>

        {view === "list" ? (
          <div className={`${card} overflow-hidden`}>
            {shifts.length === 0 ? (
              <div className="p-10 text-center">
                <p className="font-semibold text-[var(--t-text)]">
                  No availability slots yet
                </p>
                <p className="text-sm text-[var(--t-text-muted)] mt-1 mb-4">
                  Add time slots so students can book your classes
                </p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 bg-[var(--t-accent)] hover:bg-[var(--t-accent-hover)] text-white text-sm rounded-xl transition-colors duration-150"
                >
                  Add First Slot
                </button>
              </div>
            ) : (
              <div className="divide-y divide-[var(--t-nav-border)]">
                {[...shifts]
                  .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
                  .map((shift) => {
                    const start = new Date(shift.start);
                    const end = new Date(shift.end);
                    const isPast = end < new Date();
                    return (
                      <div
                        key={shift.id}
                        className="px-4 sm:px-5 py-3 flex items-center gap-3 sm:gap-4 hover:bg-[var(--t-nav-hover)] transition-colors duration-150"
                      >
                        <div
                          className={`w-2 h-10 rounded-full flex-shrink-0 ${isPast ? "bg-[var(--t-border)]" : shift.isBooked ? "bg-[var(--t-success)]" : "bg-[var(--t-accent)]"}`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--t-text)]">
                            {start.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                          </p>
                          <p className="text-xs text-[var(--t-text-muted)]">
                            {start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} –{" "}
                            {end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                          </p>
                        </div>
                        {shift.isBooked && shift.booking && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--t-success-bg)] text-[var(--t-success-text)] flex-shrink-0">
                            {shift.booking.student.name}
                          </span>
                        )}
                        {!isPast && (
                          <button
                            onClick={() =>
                              shift.isBooked ? setManageShift(shift) : setRemoveShift(shift)
                            }
                            className="text-xs px-2.5 py-1.5 rounded-lg bg-[var(--t-danger-bg)] text-[var(--t-danger)] hover:opacity-80 transition-all duration-150 flex-shrink-0"
                          >
                            {shift.isBooked ? "Manage" : "Remove"}
                          </button>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        ) : (
          <div className={`${card} overflow-hidden`}>
            <div className="grid grid-cols-[48px_repeat(7,1fr)] border-b border-[var(--t-nav-border)]">
              <div />
              {weekDays.map((day) => {
                const isToday = day.toDateString() === new Date().toDateString();
                return (
                  <div key={day.toISOString()} className="py-3 text-center border-l border-[var(--t-nav-border)]">
                    <p className="text-xs text-[var(--t-text-muted)] uppercase">
                      {day.toLocaleDateString("en-US", { weekday: "short" })}
                    </p>
                    <p
                      className={`text-sm font-bold mt-0.5 ${isToday ? "w-7 h-7 rounded-full bg-[var(--t-accent)] text-white flex items-center justify-center mx-auto" : "text-[var(--t-text)]"}`}
                    >
                      {day.getDate()}
                    </p>
                  </div>
                );
              })}
            </div>

            <div ref={scrollRef} className="overflow-y-auto" style={{ maxHeight: "60vh" }}>
              <div className="grid grid-cols-[48px_repeat(7,1fr)] relative">
                <div>
                  {Array.from({ length: 24 }, (_, h) => (
                    <div
                      key={h}
                      style={{ height: HOUR_PX }}
                      className="border-b border-[var(--t-nav-border)] flex items-start pt-1"
                    >
                      <span className="text-xs text-[var(--t-text-faint)] pr-2 w-full text-right">
                        {h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`}
                      </span>
                    </div>
                  ))}
                </div>

                {weekDays.map((day) => {
                  const dayShifts = getShiftsForDay(day);
                  return (
                    <div
                      key={day.toISOString()}
                      className="relative border-l border-[var(--t-nav-border)] cursor-pointer"
                      style={{ height: 24 * HOUR_PX }}
                      onClick={() => {
                        setAddDefaultDate(day);
                        setShowAddModal(true);
                      }}
                    >
                      {Array.from({ length: 24 }, (_, h) => (
                        <div
                          key={h}
                          style={{ top: h * HOUR_PX, height: HOUR_PX }}
                          className="absolute inset-x-0 border-b border-[var(--t-nav-border)]"
                        />
                      ))}

                      {day.toDateString() === new Date().toDateString() && (
                        <div
                          className="absolute inset-x-0 z-10 pointer-events-none"
                          style={{
                            top: ((new Date().getHours() * 60 + new Date().getMinutes()) / 60) * HOUR_PX,
                          }}
                        >
                          <div className="h-0.5 bg-red-500 relative">
                            <div className="absolute -left-1 -top-1.5 w-3 h-3 rounded-full bg-red-500" />
                          </div>
                        </div>
                      )}

                      {dayShifts.map((shift) => {
                        const { top, height } = shiftStyle(shift);
                        const isPast = new Date(shift.end) < new Date();
                        return (
                          <div
                            key={shift.id}
                            className={`absolute inset-x-0.5 rounded-lg overflow-hidden z-20 transition-opacity duration-200 ${isPast ? "opacity-40" : "opacity-100"}`}
                            style={{ top: top + 1, height: height - 2 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isPast) return;
                              if (shift.isBooked) setManageShift(shift);
                              else setRemoveShift(shift);
                            }}
                          >
                            <div
                              className={`h-full px-1.5 py-1 text-xs text-white cursor-pointer transition-colors duration-150 ${
                                shift.isBooked
                                  ? "bg-[var(--t-success)] hover:opacity-90"
                                  : "bg-[var(--t-accent)] hover:opacity-90"
                              }`}
                            >
                              <p className="font-semibold truncate leading-tight">
                                {shift.isBooked ? shift.booking?.student.name : "Open"}
                              </p>
                              {height > 30 && (
                                <p className="opacity-80 truncate">
                                  {new Date(shift.start).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
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

      {showAddModal && (
        <AddSlotModal
          defaultDate={addDefaultDate}
          onClose={() => setShowAddModal(false)}
          onAdded={(result) => {
            const newShifts = Array.isArray(result) ? result : [result];
            setShifts((prev) => [...prev, ...newShifts]);
          }}
        />
      )}
      {removeShift && (
        <RemoveSlotModal
          shift={removeShift}
          onClose={() => setRemoveShift(null)}
          onRemoved={(id) => {
            setShifts((prev) => prev.filter((s) => s.id !== id));
            setRemoveShift(null);
          }}
        />
      )}
      {manageShift && (
        <ManageBookingModal
          shift={manageShift}
          emergencyStatus={emergencyStatus}
          onClose={() => setManageShift(null)}
          onDone={(id, doneAction) => {
            if (doneAction === "cancel") {
              setShifts((prev) => prev.filter((s) => s.id !== id));
            } else {
              // Reload shifts — the server is the source of truth for the new time.
              api.get("/shifts").then((res) => setShifts(res.data ?? []));
            }
            refreshEmergencyStatus();
            setManageShift(null);
          }}
        />
      )}

      <LumiChat
        variant="teacher"
        context="Teacher schedule page — managing availability slots, bookings, and rescheduling"
      />
    </>
  );
}

export default function SchedulePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen bg-[var(--t-bg)]">
          <div className="w-10 h-10 border-2 border-[var(--t-accent)] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ScheduleContent />
    </Suspense>
  );
}
