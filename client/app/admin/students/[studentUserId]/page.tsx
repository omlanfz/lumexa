"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/axios";
import {
  Card,
  Modal,
  PaymentBadge,
  ReasonActionModal,
  StatusBadge,
  formatBDT,
  formatDate,
  formatDateTime,
} from "@/components/admin/AdminUI";

const TABS = ["Overview", "Class History", "Notes", "Payments", "Reschedule History"] as const;
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
  const [modal, setModal] = useState<
    null | "pause" | "assignTeacher" | "assignCourse" | "PAYMENT_RECEIVED" | "REFUND" | "ADMIN_ADJUSTMENT"
  >(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/admin/students/${studentUserId}`).then((res) => setStudent(res.data)).finally(() => setLoading(false));
  }, [studentUserId]);

  useEffect(() => load(), [load]);

  const resume = async () => {
    await api.post(`/admin/students/${studentUserId}/resume`);
    load();
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
            <button onClick={resume} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-[var(--a-success)] text-white hover:opacity-90">
              Resume
            </button>
          ) : (
            <button
              onClick={() => setModal("pause")}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-[var(--a-warning)] text-white hover:opacity-90"
            >
              Pause
            </button>
          )}
        </div>
      </div>

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

      {tab === "Class History" && (
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--a-border)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)]">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Teacher</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Review</th>
              </tr>
            </thead>
            <tbody>
              {student.classHistory.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-[var(--a-text-faint)]">No classes yet.</td></tr>
              )}
              {student.classHistory.map((b: any) => (
                <tr key={b.id} className="border-b border-[var(--a-border)] last:border-0">
                  <td className="px-4 py-3 text-[var(--a-text)]">{formatDateTime(b.shift?.start)}</td>
                  <td className="px-4 py-3 text-[var(--a-text-muted)]">{b.shift?.teacher?.user?.fullName ?? "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={b.paymentStatus} /></td>
                  <td className="px-4 py-3 text-[var(--a-text-muted)]">{b.review ? `${b.review.rating}★` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === "Notes" && (
        <Card className="space-y-3">
          {student.notes.length === 0 && <p className="text-sm text-[var(--a-text-muted)]">No notes recorded.</p>}
          {student.notes.map((n: any) => (
            <div key={n.id} className="p-3 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)]">
              <p className="text-sm text-[var(--a-text)]">{n.note}</p>
              <p className="text-xs text-[var(--a-text-faint)] mt-1">{formatDateTime(n.createdAt)}</p>
            </div>
          ))}
        </Card>
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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
