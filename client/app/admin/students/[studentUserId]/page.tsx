"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/axios";
import {
  Card,
  Modal,
  PaymentBadge,
  ReasonActionModal,
  ContactModal,
  SetPasswordModal,
  StatusBadge,
  formatBDT,
  formatDate,
  formatDateTime,
  formatDhakaDate,
  formatDhakaTime,
  todayDhakaDateStr,
  WEEKDAY_NAMES,
  CLASS_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
} from "@/components/admin/AdminUI";

const TABS = ["Overview", "Schedule", "Class History", "Contact", "Payments", "Reschedule History"] as const;
type Tab = (typeof TABS)[number];

const LEDGER_EVENT_LABELS: Record<string, string> = {
  PAYMENT_RECEIVED: "Payment received",
  LESSON_COMPLETED: "Lesson completed",
  CURRICULUM_CHANGE: "Curriculum change",
  CREDIT_CARRIED_FORWARD: "Credit carried forward",
  REFUND: "Refund",
  ADMIN_ADJUSTMENT: "Admin adjustment",
};

function formatLessons(n: number | null): string {
  if (n === null) return "—";
  return (Math.round(n * 10) / 10).toString();
}

export default function StudentDetailPage() {
  const { studentUserId } = useParams<{ studentUserId: string }>();
  const router = useRouter();
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("Overview");
  const [togglingPause, setTogglingPause] = useState(false);
  const [pauseToggleError, setPauseToggleError] = useState<string | null>(null);
  const [resumeNotice, setResumeNotice] = useState<string | null>(null);
  const [modal, setModal] = useState<
    | null
    | "pause"
    | "assignTeacher"
    | "assignCourse"
    | "PAYMENT_RECEIVED"
    | "REFUND"
    | "ADMIN_ADJUSTMENT"
    | "contact"
    | "password"
  >(null);

  const load = useCallback(() => {
    setLoading(true);
    return api
      .get(`/admin/students/${studentUserId}`)
      .then((res) => setStudent(res.data))
      .finally(() => setLoading(false));
  }, [studentUserId]);

  useEffect(() => {
    load();
  }, [load]);

  const unpause = async () => {
    setTogglingPause(true);
    setPauseToggleError(null);
    setResumeNotice(null);
    try {
      const res = await api.post(`/admin/students/${studentUserId}/resume`);
      const { scheduleRestored, scheduleSkipped } = res.data ?? {};
      if (scheduleSkipped > 0) {
        setResumeNotice(
          `Unpaused. Restored ${scheduleRestored} course schedule(s); ${scheduleSkipped} could not be restored automatically ` +
            `(likely a teacher scheduling conflict) — check the Schedule tab and re-set it manually if needed.`,
        );
      } else if (scheduleRestored > 0) {
        setResumeNotice(
          `Unpaused — restored ${scheduleRestored} course schedule(s) to the same weekly time slots they had before pausing.`,
        );
      }
      await load();
    } catch (err: any) {
      setPauseToggleError(err?.response?.data?.message ?? "Failed to unpause this student.");
    } finally {
      setTogglingPause(false);
    }
  };

  if (loading) return <p className="text-sm text-[var(--a-text-muted)]">Loading…</p>;
  if (!student) return <p className="text-sm text-[var(--a-danger)]">Student not found.</p>;

  return (
    <div className="space-y-6">
      <button onClick={() => router.push("/admin/students")} className="text-sm text-[var(--a-text-muted)] hover:text-[var(--a-text)]">
        ← Back to Students
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--a-text)]">{student.fullName}</h1>
          <p className="text-sm text-[var(--a-text-muted)]">{student.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={student.accountStatus} />
          <PaymentBadge badge={student.ledgerSummary?.paymentBadge} />
          {student.accountStatus === "PAUSED" ? (
            <button
              onClick={unpause}
              disabled={togglingPause}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-[var(--a-success)] text-white hover:opacity-90 disabled:opacity-60"
            >
              {togglingPause ? "Unpausing…" : "Unpause"}
            </button>
          ) : (
            <button
              onClick={() => {
                setPauseToggleError(null);
                setResumeNotice(null);
                setModal("pause");
              }}
              disabled={togglingPause}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-[var(--a-warning)] text-white hover:opacity-90 disabled:opacity-60"
            >
              Pause
            </button>
          )}
        </div>
      </div>

      {(resumeNotice || pauseToggleError) && (
        <div
          className={`px-4 py-3 rounded-lg text-sm ${
            pauseToggleError
              ? "bg-[var(--a-danger-bg)] text-[var(--a-danger-text)]"
              : "bg-[var(--a-info-bg)] text-[var(--a-info)]"
          }`}
        >
          {pauseToggleError ?? resumeNotice}
        </div>
      )}

      <div className="flex gap-1 border-b border-[var(--a-border)] overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              tab === t
                ? "border-[var(--a-accent)] text-[var(--a-accent)]"
                : "border-transparent text-[var(--a-text-muted)] hover:text-[var(--a-text)]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)] mb-1">Assigned Teacher</p>
              <p className="text-sm text-[var(--a-text)]">{student.assignedTeacher?.user?.fullName ?? "Unassigned"}</p>
            </div>
            <button
              onClick={() => setModal("assignTeacher")}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--a-border)] text-[var(--a-text)] hover:bg-[var(--a-nav-hover)]"
            >
              Change
            </button>
          </Card>
          <Card className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)] mb-1">Course</p>
              <p className="text-sm text-[var(--a-text)]">{student.assignedCourse?.title ?? "Unassigned"}</p>
            </div>
            <button
              onClick={() => setModal("assignCourse")}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--a-border)] text-[var(--a-text)] hover:bg-[var(--a-nav-hover)]"
            >
              Change
            </button>
          </Card>
          <Card><Field label="Class Type" value={student.assignedClassType ? CLASS_TYPE_LABELS[student.assignedClassType] : "Not set"} /></Card>
          <Card><Field label="Grade" value={student.grade ?? "—"} /></Card>
          <Card><Field label="Joined" value={formatDate(student.createdAt)} /></Card>
          <Card><Field label="Space Rank" value={student.spaceRank} /></Card>
          <Card><Field label="Total Sessions" value={student.totalSessions} /></Card>
          <Card className="sm:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)] mb-3">Audit History</p>
            {student.auditHistory.length === 0 && <p className="text-sm text-[var(--a-text-muted)]">No recorded actions yet.</p>}
            <div className="space-y-2">
              {student.auditHistory.map((a: any) => (
                <div key={a.id} className="text-sm border-b border-[var(--a-border)] last:border-0 pb-2">
                  <p className="text-[var(--a-text)] font-medium">{a.action.replace(/_/g, " ")}</p>
                  <p className="text-xs text-[var(--a-text-faint)]">{formatDateTime(a.createdAt)} {a.reason ? `— ${a.reason}` : ""}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === "Schedule" && (
        <ScheduleTab
          studentUserId={studentUserId}
          hasTeacher={!!student.assignedTeacher}
          hasCourse={!!student.assignedCourse}
        />
      )}

      {tab === "Class History" && (
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--a-border)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)]">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Teacher</th>
                <th className="px-4 py-3">Course</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Review</th>
              </tr>
            </thead>
            <tbody>
              {student.classHistory.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-[var(--a-text-faint)]">No classes yet.</td></tr>
              )}
              {student.classHistory.map((c: any) => (
                <tr key={`${c.kind}:${c.id}`} className="border-b border-[var(--a-border)] last:border-0">
                  <td className="px-4 py-3 text-[var(--a-text)]">{formatDateTime(c.start)}</td>
                  <td className="px-4 py-3 text-[var(--a-text-muted)]">{c.teacherName ?? "—"}</td>
                  <td className="px-4 py-3 text-[var(--a-text-muted)]">{c.courseTitle ?? "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={c.paymentStatus ?? c.displayStatus} /></td>
                  <td className="px-4 py-3 text-[var(--a-text-muted)]">{c.review ? `${c.review.rating}★` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === "Contact" && (
        <div className="space-y-4">
          <Card className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Email" value={student.email} />
            <Field label="WhatsApp" value={student.whatsappNumber || "Not on file"} />
          </Card>
          <Card className="flex flex-wrap gap-2">
            <button
              onClick={() => setModal("contact")}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--a-border)] text-[var(--a-text)] hover:bg-[var(--a-nav-hover)]"
            >
              Edit contact
            </button>
            <button
              onClick={() => setModal("password")}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--a-border)] text-[var(--a-text)] hover:bg-[var(--a-nav-hover)]"
            >
              Change password
            </button>
          </Card>
        </div>
      )}

      {tab === "Payments" && (
        <div className="space-y-4">
          <Card className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)]">Current Balance</p>
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <p className="text-2xl font-bold text-[var(--a-text)]">{formatBDT(student.ledgerSummary.balanceCents)}</p>
              <p className="text-sm text-[var(--a-text-muted)]">
                remaining
                {student.ledgerSummary.lessonsRemaining !== null && (
                  <> · {formatLessons(student.ledgerSummary.lessonsRemaining)} lessons remaining</>
                )}
              </p>
            </div>
            {student.ledgerSummary.courseName && (
              <p className="text-xs text-[var(--a-text-faint)]">
                {student.ledgerSummary.courseName}
                {student.ledgerSummary.rateCents > 0 && <> · {formatBDT(student.ledgerSummary.rateCents)} / lesson</>}
              </p>
            )}
            {student.ledgerSummary.paymentBadge && <PaymentBadge badge={student.ledgerSummary.paymentBadge} />}
            <div className="pt-2 flex flex-wrap gap-2">
              <button
                onClick={() => setModal("PAYMENT_RECEIVED")}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[var(--a-accent)] hover:bg-[var(--a-accent-hover)]"
              >
                + Record payment
              </button>
              <button
                onClick={() => setModal("REFUND")}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--a-border)] text-[var(--a-text)] hover:bg-[var(--a-nav-hover)]"
              >
                Refund
              </button>
              <button
                onClick={() => setModal("ADMIN_ADJUSTMENT")}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--a-border)] text-[var(--a-text)] hover:bg-[var(--a-nav-hover)]"
              >
                Admin adjustment
              </button>
            </div>
          </Card>

          <Card className="p-0 overflow-hidden">
            <p className="px-4 pt-4 pb-1 text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)]">
              Payment & Credit History
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--a-border)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)]">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Event</th>
                    <th className="px-4 py-3">Curriculum</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-right">Balance after</th>
                  </tr>
                </thead>
                <tbody>
                  {student.ledger.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-6 text-center text-[var(--a-text-faint)]">No payment history yet.</td></tr>
                  )}
                  {student.ledger.map((entry: any) => (
                    <tr key={entry.id} className="border-b border-[var(--a-border)] last:border-0 align-top">
                      <td className="px-4 py-3 text-[var(--a-text-muted)] whitespace-nowrap">{formatDateTime(entry.createdAt)}</td>
                      <td className="px-4 py-3">
                        <p className="text-[var(--a-text)] font-medium">{LEDGER_EVENT_LABELS[entry.type] ?? entry.type}</p>
                        {entry.description && <p className="text-xs text-[var(--a-text-faint)] mt-0.5">{entry.description}</p>}
                        {entry.paymentMethod && (
                          <p className="text-xs text-[var(--a-text-faint)] mt-0.5">
                            Via {PAYMENT_METHOD_LABELS[entry.paymentMethod] ?? entry.paymentMethod}
                            {entry.paymentDetail ? ` — ${entry.paymentDetail}` : ""}
                          </p>
                        )}
                        {entry.createdByAdmin?.fullName && (
                          <p className="text-xs text-[var(--a-text-faint)]">by {entry.createdByAdmin.fullName}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[var(--a-text-muted)]">{entry.courseName}</td>
                      <td
                        className={`px-4 py-3 text-right font-medium whitespace-nowrap ${
                          entry.amountCents > 0
                            ? "text-[var(--a-success-text)]"
                            : entry.amountCents < 0
                              ? "text-[var(--a-danger-text)]"
                              : "text-[var(--a-text-faint)]"
                        }`}
                      >
                        {entry.amountCents === 0 ? "—" : `${entry.amountCents > 0 ? "+" : ""}${formatBDT(entry.amountCents)}`}
                      </td>
                      <td className="px-4 py-3 text-right text-[var(--a-text)] whitespace-nowrap">{formatBDT(entry.balanceAfterCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {tab === "Reschedule History" && (
        <Card className="space-y-3">
          {student.rescheduleHistory.length === 0 && (
            <p className="text-sm text-[var(--a-text-muted)]">No reschedule events for this student.</p>
          )}
          {student.rescheduleHistory.map((r: any) => (
            <div key={r.id} className="p-3 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)]">
              <div className="flex items-center justify-between text-xs text-[var(--a-text-faint)] mb-1">
                <span>{formatDateTime(r.createdAt)}</span>
                <span className="font-semibold">{r.action} · {r.category}</span>
              </div>
              <p className="text-sm text-[var(--a-text)]">
                {formatDateTime(r.oldStart)} → {formatDateTime(r.newStart)}
              </p>
              <p className="text-xs text-[var(--a-text-muted)] mt-1">
                Initiated by {r.initiatedByRole}{r.reason ? ` — ${r.reason}` : ""}
              </p>
            </div>
          ))}
        </Card>
      )}

      {modal === "pause" && (
        <ReasonActionModal
          title="Pause this student"
          actionLabel="Pause"
          danger
          onClose={() => setModal(null)}
          onSubmit={async (reason) => {
            await api.post(`/admin/students/${studentUserId}/pause`, { reason });
            load();
          }}
        />
      )}
      {modal === "assignTeacher" && (
        <AssignModal
          title="Change assigned teacher"
          searchLabel="Search teacher…"
          searchUrl={(q) => `/admin/teachers?limit=8&search=${encodeURIComponent(q)}`}
          extractOptions={(data) => data.teachers.map((t: any) => ({ id: t.id, label: t.user.fullName, sub: t.user.email }))}
          onSelect={async (id) => {
            await api.post(`/admin/students/${studentUserId}/assign-teacher`, { teacherProfileId: id });
            load();
          }}
          onClear={async () => {
            await api.post(`/admin/students/${studentUserId}/assign-teacher`, { teacherProfileId: null });
            load();
          }}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "assignCourse" && (
        <AssignCourseModal
          onSelect={async (id) => {
            await api.post(`/admin/students/${studentUserId}/assign-course`, { courseId: id });
            load();
          }}
          onClear={async () => {
            await api.post(`/admin/students/${studentUserId}/assign-course`, { courseId: null });
            load();
          }}
          onClose={() => setModal(null)}
        />
      )}
      {(modal === "PAYMENT_RECEIVED" || modal === "REFUND" || modal === "ADMIN_ADJUSTMENT") && (
        <LedgerEntryModal
          type={modal}
          courseName={student.assignedCourse?.title ?? null}
          onSubmit={async (body) => {
            const path =
              modal === "PAYMENT_RECEIVED" ? "payments" : modal === "REFUND" ? "refunds" : "adjustments";
            await api.post(`/admin/students/${studentUserId}/ledger/${path}`, body);
            load();
          }}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "contact" && (
        <ContactModal
          initialValue={student.whatsappNumber ?? ""}
          onClose={() => setModal(null)}
          onSubmit={async (whatsappNumber) => {
            await api.post(`/admin/students/${studentUserId}/contact`, { whatsappNumber });
            load();
          }}
        />
      )}
      {modal === "password" && (
        <SetPasswordModal
          onClose={() => setModal(null)}
          onSubmit={async (newPassword) => {
            await api.post(`/admin/students/${studentUserId}/password`, { newPassword });
          }}
        />
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)] mb-1">{label}</p>
      <p className="text-sm text-[var(--a-text)]">{value}</p>
    </div>
  );
}

// ─── Schedule tab: recurring weekly slots + generated lessons ───────────────

interface ScheduleSlotDraft {
  weekday: number;
  time: string; // "HH:mm", Asia/Dhaka
}

function ScheduleTab({
  studentUserId,
  hasTeacher,
  hasCourse,
}: {
  studentUserId: string;
  hasTeacher: boolean;
  hasCourse: boolean;
}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [classType, setClassType] = useState<"ONE_TO_ONE" | "BATCH">("ONE_TO_ONE");
  const [firstClassDate, setFirstClassDate] = useState("");
  const [slots, setSlots] = useState<ScheduleSlotDraft[]>([{ weekday: 1, time: "17:00" }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get(`/admin/students/${studentUserId}/schedule`)
      .then((res) => {
        setData(res.data);
        if (res.data.classType) setClassType(res.data.classType);
        if (res.data.slots?.length) {
          setSlots(
            res.data.slots.map((s: any) => ({
              weekday: s.weekday,
              time: `${String(s.hour).padStart(2, "0")}:${String(s.minute).padStart(2, "0")}`,
            })),
          );
        }
      })
      .finally(() => setLoading(false));
  }, [studentUserId]);

  useEffect(() => {
    if (hasTeacher && hasCourse) load();
    else setLoading(false);
  }, [load, hasTeacher, hasCourse]);

  if (!hasTeacher || !hasCourse) {
    return (
      <Card>
        <p className="text-sm text-[var(--a-text-muted)]">
          Assign a teacher and a curriculum to this student before setting up a class schedule.
        </p>
      </Card>
    );
  }
  if (loading) return <p className="text-sm text-[var(--a-text-muted)]">Loading…</p>;

  const addSlot = () => setSlots((s) => [...s, { weekday: 1, time: "17:00" }]);
  const removeSlot = (i: number) => setSlots((s) => s.filter((_, idx) => idx !== i));
  const updateSlot = (i: number, patch: Partial<ScheduleSlotDraft>) =>
    setSlots((s) => s.map((sl, idx) => (idx === i ? { ...sl, ...patch } : sl)));

  const firstDateWeekday = firstClassDate
    ? new Date(`${firstClassDate}T00:00:00Z`).getUTCDay()
    : null;
  const weekdayMismatch =
    !!firstClassDate && slots.length > 0 && !slots.some((s) => s.weekday === firstDateWeekday);

  const save = async () => {
    setError(null);
    setSuccess(null);
    if (!firstClassDate) {
      setError("Select the first class date.");
      return;
    }
    if (firstClassDate < todayDhakaDateStr()) {
      setError("The first class date can't be in the past.");
      return;
    }
    if (slots.length === 0) {
      setError("Add at least one weekly time slot.");
      return;
    }
    if (weekdayMismatch) {
      setError(
        `The first class date must fall on one of the selected weekdays. ${firstClassDate} is a ${WEEKDAY_NAMES[firstDateWeekday!]}.`,
      );
      return;
    }
    setSaving(true);
    try {
      const res = await api.post(`/admin/students/${studentUserId}/schedule`, {
        classType,
        firstClassDate,
        slots,
      });
      setData(res.data);
      setSuccess(`Saved — ${res.data.lessons.upcomingCount} upcoming lesson(s) scheduled.`);
    } catch (e: any) {
      const m = e.response?.data?.message;
      setError(Array.isArray(m) ? m.join(", ") : (m ?? "Failed to save schedule."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)] mb-2">
            Class Type
          </p>
          <div className="grid grid-cols-2 gap-2 max-w-sm">
            {(["ONE_TO_ONE", "BATCH"] as const).map((ct) => (
              <button
                key={ct}
                onClick={() => setClassType(ct)}
                className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  classType === ct
                    ? "border-[var(--a-accent)] bg-[var(--a-accent)] text-white"
                    : "border-[var(--a-border)] text-[var(--a-text)] hover:bg-[var(--a-nav-hover)]"
                }`}
              >
                {CLASS_TYPE_LABELS[ct]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)] mb-2">
            First Class Date <span className="normal-case font-normal">(Asia/Dhaka)</span>
          </p>
          <input
            type="date"
            value={firstClassDate}
            min={todayDhakaDateStr()}
            onChange={(e) => setFirstClassDate(e.target.value)}
            className="px-3 py-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] text-sm text-[var(--a-text)] a-focus"
          />
          {firstClassDate && firstClassDate < todayDhakaDateStr() && (
            <p className="text-xs text-[var(--a-danger)] mt-1.5">
              The first class date can&rsquo;t be in the past.
            </p>
          )}
          {weekdayMismatch && (
            <p className="text-xs text-[var(--a-danger)] mt-1.5">
              This date is a {WEEKDAY_NAMES[firstDateWeekday!]} — pick a date on one of the
              weekdays below, or add that weekday to the schedule.
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)]">
              Weekly Time Slots <span className="normal-case font-normal">(Asia/Dhaka)</span>
            </p>
            <button
              onClick={addSlot}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-[var(--a-border)] text-[var(--a-text)] hover:bg-[var(--a-nav-hover)]"
            >
              + Add slot
            </button>
          </div>
          <div className="space-y-2">
            {slots.map((slot, i) => (
              <div key={i} className="flex items-center gap-2 flex-wrap">
                <select
                  value={slot.weekday}
                  onChange={(e) => updateSlot(i, { weekday: Number(e.target.value) })}
                  className="px-3 py-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] text-sm text-[var(--a-text)] a-focus"
                >
                  {WEEKDAY_NAMES.map((d, idx) => (
                    <option key={idx} value={idx}>
                      {d}
                    </option>
                  ))}
                </select>
                <input
                  type="time"
                  value={slot.time}
                  onChange={(e) => updateSlot(i, { time: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] text-sm text-[var(--a-text)] a-focus"
                />
                <button
                  onClick={() => removeSlot(i)}
                  className="px-2.5 py-2 rounded-lg text-xs font-medium text-[var(--a-danger)] hover:bg-[var(--a-nav-hover)]"
                >
                  Remove
                </button>
              </div>
            ))}
            {slots.length === 0 && (
              <p className="text-sm text-[var(--a-text-muted)]">No slots yet — add at least one.</p>
            )}
          </div>
        </div>

        {error && <p className="text-sm text-[var(--a-danger)]">{error}</p>}
        {success && <p className="text-sm text-[var(--a-success-text)]">{success}</p>}

        <div className="flex justify-end">
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[var(--a-accent)] hover:bg-[var(--a-accent-hover)] disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save Schedule"}
          </button>
        </div>
      </Card>

      {data?.lessons?.totalSessions != null && (
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)] mb-2">
            Progress
          </p>
          <p className="text-sm text-[var(--a-text)]">
            {data.lessons.completedCount} completed · {data.lessons.upcomingCount} upcoming ·{" "}
            {data.lessons.totalSessions} total lessons
            {data.assignedCourse?.title ? ` (${data.assignedCourse.title})` : ""}
          </p>
        </Card>
      )}

      {data?.lessons?.upcoming?.length > 0 && (
        <Card className="p-0 overflow-hidden">
          <p className="px-4 pt-4 pb-1 text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)]">
            Upcoming Lessons
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--a-border)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)]">
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Time (Dhaka)</th>
                  <th className="px-4 py-3">Class Type</th>
                </tr>
              </thead>
              <tbody>
                {data.lessons.upcoming.map((l: any) => (
                  <tr key={l.id} className="border-b border-[var(--a-border)] last:border-0">
                    <td className="px-4 py-3 text-[var(--a-text-muted)]">{l.lessonNumber}</td>
                    <td className="px-4 py-3 text-[var(--a-text)]">{formatDhakaDate(l.start)}</td>
                    <td className="px-4 py-3 text-[var(--a-text-muted)]">
                      {formatDhakaTime(l.start)} – {formatDhakaTime(l.end)}
                    </td>
                    <td className="px-4 py-3 text-[var(--a-text-muted)]">
                      {CLASS_TYPE_LABELS[l.classType] ?? l.classType}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function AssignModal({
  title,
  searchLabel,
  searchUrl,
  extractOptions,
  onSelect,
  onClear,
  onClose,
}: {
  title: string;
  searchLabel: string;
  searchUrl: (q: string) => string;
  extractOptions: (data: any) => { id: string; label: string; sub?: string }[];
  onSelect: (id: string) => Promise<void>;
  onClear: () => Promise<void>;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<{ id: string; label: string; sub?: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setOptions([]);
      return;
    }
    const t = setTimeout(() => {
      api.get(searchUrl(query)).then((res) => setOptions(extractOptions(res.data)));
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const select = async (id: string) => {
    setSubmitting(true);
    try {
      await onSelect(id);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const clear = async () => {
    setSubmitting(true);
    try {
      await onClear();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title={title} onClose={onClose}>
      <div className="space-y-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchLabel}
          className="w-full px-3 py-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] text-sm text-[var(--a-text)] a-focus"
          autoFocus
        />
        <button
          disabled={submitting}
          onClick={clear}
          className="w-full text-left px-3 py-2 rounded-lg text-sm text-[var(--a-danger)] hover:bg-[var(--a-nav-hover)] disabled:opacity-60"
        >
          Clear assignment
        </button>
        <div className="max-h-64 overflow-y-auto space-y-1">
          {options.map((o) => (
            <button
              key={o.id}
              disabled={submitting}
              onClick={() => select(o.id)}
              className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-[var(--a-nav-hover)] text-[var(--a-text)] disabled:opacity-60"
            >
              {o.label} {o.sub && <span className="text-[var(--a-text-faint)]">({o.sub})</span>}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}

function AssignCourseModal({
  onSelect,
  onClear,
  onClose,
}: {
  onSelect: (id: string) => Promise<void>;
  onClear: () => Promise<void>;
  onClose: () => void;
}) {
  const [courses, setCourses] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get("/courses/admin/all").then((res) => setCourses(res.data ?? []));
  }, []);

  const select = async (id: string) => {
    setSubmitting(true);
    try {
      await onSelect(id);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };
  const clear = async () => {
    setSubmitting(true);
    try {
      await onClear();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Change assigned course" onClose={onClose}>
      <div className="space-y-1">
        <button
          disabled={submitting}
          onClick={clear}
          className="w-full text-left px-3 py-2 rounded-lg text-sm text-[var(--a-danger)] hover:bg-[var(--a-nav-hover)] disabled:opacity-60"
        >
          Clear assignment
        </button>
        <div className="max-h-64 overflow-y-auto space-y-1">
          {courses.map((c) => (
            <button
              key={c.id}
              disabled={submitting}
              onClick={() => select(c.id)}
              className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-[var(--a-nav-hover)] text-[var(--a-text)] disabled:opacity-60"
            >
              {c.title} <span className="text-[var(--a-text-faint)]">({c.category})</span>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}

const LEDGER_MODAL_META = {
  PAYMENT_RECEIVED: { title: "Record payment", actionLabel: "Record payment" },
  REFUND: { title: "Issue refund", actionLabel: "Issue refund" },
  ADMIN_ADJUSTMENT: { title: "Admin adjustment", actionLabel: "Apply adjustment" },
} as const;

function LedgerEntryModal({
  type,
  courseName,
  onSubmit,
  onClose,
}: {
  type: "PAYMENT_RECEIVED" | "REFUND" | "ADMIN_ADJUSTMENT";
  courseName: string | null;
  onSubmit: (body: Record<string, any>) => Promise<void>;
  onClose: () => void;
}) {
  const [amountTaka, setAmountTaka] = useState("");
  const [lessonsPurchased, setLessonsPurchased] = useState("");
  const [description, setDescription] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentDetail, setPaymentDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const takesPaymentMethod = type === "PAYMENT_RECEIVED" || type === "REFUND";

  const submit = async () => {
    const amount = Number(amountTaka);
    if (!amount || (type !== "ADMIN_ADJUSTMENT" && amount <= 0)) {
      setError("Enter a valid amount.");
      return;
    }
    if (type === "PAYMENT_RECEIVED" && !(Number(lessonsPurchased) > 0)) {
      setError("Enter how many lessons this payment covers.");
      return;
    }
    if (type === "ADMIN_ADJUSTMENT" && !description.trim()) {
      setError("A description is required for admin adjustments.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const body: Record<string, any> =
        type === "PAYMENT_RECEIVED"
          ? { amountTaka: amount, lessonsPurchased: Number(lessonsPurchased), description: description.trim() || undefined }
          : { amountTaka: amount, description: description.trim() || undefined };
      if (takesPaymentMethod && paymentMethod) {
        body.paymentMethod = paymentMethod;
        body.paymentDetail = paymentDetail.trim() || undefined;
      }
      await onSubmit(body);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const meta = LEDGER_MODAL_META[type];

  return (
    <Modal title={meta.title} onClose={onClose}>
      <div className="space-y-4">
        {type === "PAYMENT_RECEIVED" && (
          <p className="text-xs text-[var(--a-text-faint)]">
            Curriculum: {courseName ?? "Unassigned"}. The effective per-lesson rate is calculated as amount ÷ lessons purchased.
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)] mb-1.5">
              Amount (৳){type === "ADMIN_ADJUSTMENT" ? " — negative to debit" : ""}
            </label>
            <input
              type="number"
              value={amountTaka}
              onChange={(e) => setAmountTaka(e.target.value)}
              placeholder={type === "ADMIN_ADJUSTMENT" ? "e.g. -500 or 500" : "e.g. 20250"}
              className="w-full px-3 py-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] text-sm text-[var(--a-text)] a-focus"
              autoFocus
            />
          </div>
          {type === "PAYMENT_RECEIVED" && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)] mb-1.5">
                Lessons purchased
              </label>
              <input
                type="number"
                value={lessonsPurchased}
                onChange={(e) => setLessonsPurchased(e.target.value)}
                placeholder="e.g. 24"
                className="w-full px-3 py-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] text-sm text-[var(--a-text)] a-focus"
              />
            </div>
          )}
        </div>
        {takesPaymentMethod && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)] mb-1.5">
                Payment method (optional)
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] text-sm text-[var(--a-text)] a-focus"
              >
                <option value="">Not specified</option>
                <option value="BKASH">bKash</option>
                <option value="BANK">Bank transfer</option>
                <option value="CASH">Cash</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)] mb-1.5">
                bKash/bank details
              </label>
              <input
                value={paymentDetail}
                onChange={(e) => setPaymentDetail(e.target.value)}
                placeholder="e.g. bKash 017XXXXXXXX, or Bank + a/c"
                disabled={!paymentMethod}
                className="w-full px-3 py-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] text-sm text-[var(--a-text)] a-focus disabled:opacity-50"
              />
            </div>
          </div>
        )}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)] mb-1.5">
            Description {type === "ADMIN_ADJUSTMENT" ? "(required)" : "(optional)"}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] text-sm text-[var(--a-text)] a-focus"
            placeholder="e.g. 10% bundle discount applied — recorded for audit."
          />
        </div>
        {error && <p className="text-sm text-[var(--a-danger)]">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-[var(--a-border)] text-[var(--a-text-muted)] hover:bg-[var(--a-nav-hover)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[var(--a-accent)] hover:bg-[var(--a-accent-hover)] disabled:opacity-60"
          >
            {submitting ? "Working…" : meta.actionLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
