"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/axios";
import {
  Card,
  Modal,
  ReasonActionModal,
  ContactModal,
  SetPasswordModal,
  StatusBadge,
  formatBDT,
  formatDate,
  formatDateTime,
  formatDhakaDate,
  formatDhakaTime,
  CLASS_TYPE_LABELS,
} from "@/components/admin/AdminUI";

const TABS = ["Overview", "Assigned Students", "Schedule", "Earnings / Ledger", "Verification"] as const;
type Tab = (typeof TABS)[number];

export default function TeacherDetailPage() {
  const { teacherId } = useParams<{ teacherId: string }>();
  const router = useRouter();
  const [teacher, setTeacher] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("Overview");
  const [modal, setModal] = useState<
    null | "suspend" | "adjustment" | "assign" | "strike" | "contact" | "password"
  >(null);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get(`/admin/teachers/${teacherId}`)
      .then((res) => setTeacher(res.data))
      .finally(() => setLoading(false));
  }, [teacherId]);

  useEffect(() => load(), [load]);

  const reinstate = async () => {
    await api.post(`/admin/teachers/${teacherId}/reinstate`);
    load();
  };
  const resetStrikes = async () => {
    await api.post(`/admin/teachers/${teacherId}/reset-strikes`);
    load();
  };

  if (loading) return <p className="text-sm text-[var(--a-text-muted)]">Loading…</p>;
  if (!teacher) return <p className="text-sm text-[var(--a-danger)]">Teacher not found.</p>;

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.push("/admin/teachers")}
        className="text-sm text-[var(--a-text-muted)] hover:text-[var(--a-text)]"
      >
        ← Back to Teachers
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--a-text)]">{teacher.user.fullName}</h1>
          <p className="text-sm text-[var(--a-text-muted)]">{teacher.user.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={teacher.isSuspended ? "SUSPENDED" : "ACTIVE"} />
          {teacher.isSuspended ? (
            <button onClick={reinstate} className="px-3 py-1.5 rounded-lg text-sm font-medium bg-[var(--a-success)] text-white hover:opacity-90">
              Reinstate
            </button>
          ) : (
            <button
              onClick={() => setModal("suspend")}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-[var(--a-danger)] text-white hover:opacity-90"
            >
              Suspend
            </button>
          )}
          <button
            onClick={() => setModal("strike")}
            className="px-3 py-1.5 rounded-lg text-sm font-medium border border-[var(--a-border)] text-[var(--a-warning-text)] hover:bg-[var(--a-nav-hover)]"
          >
            Add Strike
          </button>
          <button
            onClick={resetStrikes}
            className="px-3 py-1.5 rounded-lg text-sm font-medium border border-[var(--a-border)] text-[var(--a-text)] hover:bg-[var(--a-nav-hover)]"
          >
            Reset Strikes
          </button>
        </div>
      </div>

      {/* Tabs */}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card><Stat label="Strikes" value={teacher.strikes} /></Card>
          <Card><Stat label="Rating" value={`${teacher.ratingAvg.toFixed(1)}★ (${teacher.reviewCount})`} /></Card>
          <Card><Stat label="Hourly Rate" value={formatBDT(teacher.hourlyRate * 100)} /></Card>
          <Card><Stat label="Joined" value={formatDate(teacher.user.createdAt)} /></Card>
          <Card className="sm:col-span-2 lg:col-span-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)] mb-2">Subjects</p>
            <p className="text-sm text-[var(--a-text)]">{teacher.subjects?.join(", ") || "—"}</p>
          </Card>
          <Card className="sm:col-span-2 lg:col-span-4 flex flex-wrap items-center justify-between gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
              <Field label="Email" value={teacher.user.email} />
              <Field label="WhatsApp" value={teacher.user.whatsappNumber || "Not on file"} />
            </div>
            <div className="flex flex-wrap gap-2">
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
            </div>
          </Card>
          <Card className="sm:col-span-2 lg:col-span-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)] mb-3">
              Audit History (violations, suspensions, payout actions)
            </p>
            {teacher.auditHistory.length === 0 && (
              <p className="text-sm text-[var(--a-text-muted)]">No recorded actions yet.</p>
            )}
            <div className="space-y-2">
              {teacher.auditHistory.map((a: any) => (
                <div key={a.id} className="text-sm border-b border-[var(--a-border)] last:border-0 pb-2">
                  <p className="text-[var(--a-text)] font-medium">{a.action.replace(/_/g, " ")}</p>
                  <p className="text-xs text-[var(--a-text-faint)]">
                    {formatDateTime(a.createdAt)} {a.reason ? `— ${a.reason}` : ""}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === "Assigned Students" && (
        <div className="space-y-4">
          <button
            onClick={() => setModal("assign")}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[var(--a-accent)] hover:bg-[var(--a-accent-hover)]"
          >
            Assign Student
          </button>
          <Card className="p-0 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--a-border)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)]">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Course</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {teacher.assignedStudents.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-[var(--a-text-faint)]">No students assigned.</td></tr>
                )}
                {teacher.assignedStudents.map((s: any) => (
                  <tr key={s.id} className="border-b border-[var(--a-border)] last:border-0">
                    <td className="px-4 py-3 text-[var(--a-text)]">{s.fullName}</td>
                    <td className="px-4 py-3 text-[var(--a-text-muted)]">{s.email}</td>
                    <td className="px-4 py-3 text-[var(--a-text-muted)]">{s.assignedCourse?.title ?? "—"}</td>
                    <td className="px-4 py-3"><StatusBadge status={s.accountStatus} /></td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => router.push(`/admin/students/${s.id}`)}
                        className="text-sm text-[var(--a-accent)] hover:underline"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {tab === "Schedule" && (
        <Card className="p-0 overflow-hidden">
          <p className="px-4 pt-4 pb-1 text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)]">
            Upcoming classes (Asia/Dhaka)
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--a-border)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)]">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Course</th>
                <th className="px-4 py-3">Class Type</th>
              </tr>
            </thead>
            <tbody>
              {(!teacher.upcomingLessons || teacher.upcomingLessons.length === 0) && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-[var(--a-text-faint)]">No upcoming classes scheduled.</td></tr>
              )}
              {teacher.upcomingLessons?.map((l: any) => (
                <tr key={l.id} className="border-b border-[var(--a-border)] last:border-0">
                  <td className="px-4 py-3 text-[var(--a-text)]">{formatDhakaDate(l.start)}</td>
                  <td className="px-4 py-3 text-[var(--a-text-muted)]">
                    {formatDhakaTime(l.start)} – {formatDhakaTime(l.end)}
                  </td>
                  <td className="px-4 py-3 text-[var(--a-text-muted)]">
                    {l.student?.fullName ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-[var(--a-text-muted)]">
                    {l.lessonTitle ?? l.course?.title ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-[var(--a-text-muted)]">
                    {CLASS_TYPE_LABELS[l.classType] ?? l.classType}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {tab === "Earnings / Ledger" && (
        <EarningsTab teacherId={teacherId} summary={teacher.earningsSummary} onAdjust={() => setModal("adjustment")} />
      )}

      {tab === "Verification" && <VerificationTab teacherId={teacherId} />}

      {modal === "suspend" && (
        <ReasonActionModal
          title="Suspend teacher"
          actionLabel="Suspend"
          danger
          onClose={() => setModal(null)}
          onSubmit={async (reason) => {
            await api.post(`/admin/teachers/${teacherId}/suspend`, { reason });
            load();
          }}
        />
      )}
      {modal === "adjustment" && (
        <AdjustmentModal teacherId={teacherId} onClose={() => setModal(null)} onDone={load} />
      )}
      {modal === "assign" && (
        <AssignStudentModal teacherId={teacherId} onClose={() => setModal(null)} onDone={load} />
      )}
      {modal === "strike" && (
        <ReasonActionModal
          title="Add a manual strike"
          actionLabel="Add strike"
          danger
          onClose={() => setModal(null)}
          onSubmit={async (reason) => {
            await api.post(`/admin/teachers/${teacherId}/strike`, { reason });
            load();
          }}
        />
      )}
      {modal === "contact" && (
        <ContactModal
          initialValue={teacher.user.whatsappNumber ?? ""}
          onClose={() => setModal(null)}
          onSubmit={async (whatsappNumber) => {
            await api.post(`/admin/teachers/${teacherId}/contact`, { whatsappNumber });
            load();
          }}
        />
      )}
      {modal === "password" && (
        <SetPasswordModal
          onClose={() => setModal(null)}
          onSubmit={async (newPassword) => {
            await api.post(`/admin/teachers/${teacherId}/password`, { newPassword });
          }}
        />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)] mb-1">{label}</p>
      <p className="text-xl font-bold text-[var(--a-text)]">{value}</p>
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

function EarningsTab({
  teacherId,
  summary,
  onAdjust,
}: {
  teacherId: string;
  summary: any;
  onAdjust: () => void;
}) {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/admin/teachers/${teacherId}/ledger?limit=50`)
      .then((res) => setEntries(res.data.items ?? []))
      .finally(() => setLoading(false));
  }, [teacherId]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card><Stat label="This Month" value={formatBDT(summary.monthEarningsCents)} /></Card>
        <Card><Stat label="All Time" value={formatBDT(summary.allTimeEarningsCents)} /></Card>
        <Card><Stat label="Events This Month" value={summary.monthEventCount} /></Card>
        <Card className="flex items-center">
          <button
            onClick={onAdjust}
            className="w-full px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[var(--a-accent)] hover:bg-[var(--a-accent-hover)]"
          >
            Add Adjustment
          </button>
        </Card>
      </div>
      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--a-border)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)]">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={4} className="px-4 py-6 text-center text-[var(--a-text-faint)]">Loading…</td></tr>}
            {!loading && entries.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-[var(--a-text-faint)]">No ledger entries yet.</td></tr>
            )}
            {!loading && entries.map((e) => (
              <tr key={e.id} className="border-b border-[var(--a-border)] last:border-0">
                <td className="px-4 py-3 text-[var(--a-text-muted)]">{formatDateTime(e.createdAt)}</td>
                <td className="px-4 py-3"><StatusBadge status={e.type} /></td>
                <td className="px-4 py-3 text-[var(--a-text)]">{e.description}</td>
                <td className={`px-4 py-3 text-right font-semibold ${e.amountCents < 0 ? "text-[var(--a-danger)]" : "text-[var(--a-success)]"}`}>
                  {formatBDT(e.amountCents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function AdjustmentModal({ teacherId, onClose, onDone }: { teacherId: string; onClose: () => void; onDone: () => void }) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const cents = Math.round(parseFloat(amount || "0") * 100);
    if (!cents) {
      setError("Enter a non-zero amount (use a negative number to deduct).");
      return;
    }
    if (!reason.trim()) {
      setError("A reason is required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.post(`/admin/teachers/${teacherId}/ledger/adjustment`, {
        amountCents: cents,
        reason: reason.trim(),
      });
      onDone();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Add payout adjustment" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)] mb-1.5">
            Amount (BDT) — negative to deduct
          </label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 500 or -200"
            className="w-full px-3 py-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] text-sm text-[var(--a-text)] a-focus"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)] mb-1.5">
            Reason (required)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] text-sm text-[var(--a-text)] a-focus"
          />
        </div>
        {error && <p className="text-sm text-[var(--a-danger)]">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium border border-[var(--a-border)] text-[var(--a-text-muted)] hover:bg-[var(--a-nav-hover)]">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[var(--a-accent)] hover:bg-[var(--a-accent-hover)] disabled:opacity-60"
          >
            {submitting ? "Saving…" : "Add adjustment"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function AssignStudentModal({ teacherId, onClose, onDone }: { teacherId: string; onClose: () => void; onDone: () => void }) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setOptions([]);
      return;
    }
    const t = setTimeout(() => {
      api.get(`/admin/students?limit=8&search=${encodeURIComponent(query)}`).then((res) => setOptions(res.data.students ?? []));
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const assign = async (studentUserId: string) => {
    setSubmitting(true);
    setError(null);
    try {
      await api.post(`/admin/students/${studentUserId}/assign-teacher`, { teacherProfileId: teacherId });
      onDone();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Assign a student to this teacher" onClose={onClose}>
      <div className="space-y-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search student by name or email…"
          className="w-full px-3 py-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] text-sm text-[var(--a-text)] a-focus"
          autoFocus
        />
        {error && <p className="text-sm text-[var(--a-danger)]">{error}</p>}
        <div className="max-h-64 overflow-y-auto space-y-1">
          {options.map((s) => (
            <button
              key={s.id}
              disabled={submitting}
              onClick={() => assign(s.id)}
              className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-[var(--a-nav-hover)] text-[var(--a-text)] disabled:opacity-60"
            >
              {s.fullName} <span className="text-[var(--a-text-faint)]">({s.email})</span>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}

function VerificationTab({ teacherId }: { teacherId: string }) {
  const [docs, setDocs] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/admin/teachers/${teacherId}/documents`).then((res) => setDocs(res.data)).finally(() => setLoading(false));
  }, [teacherId]);

  useEffect(() => load(), [load]);

  const toggleLock = async () => {
    await api.post(`/admin/teachers/${teacherId}/documents/${docs.docsLocked ? "unlock" : "lock"}`);
    load();
  };

  if (loading) return <p className="text-sm text-[var(--a-text-muted)]">Loading…</p>;

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--a-text)]">Verification documents</p>
          <p className="text-xs text-[var(--a-text-faint)]">{docs.documents?.length ?? 0} document(s) uploaded</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
              docs.docsLocked
                ? "bg-[var(--a-success-bg)] text-[var(--a-success-text)]"
                : "bg-[var(--a-warning-bg)] text-[var(--a-warning-text)]"
            }`}
          >
            {docs.docsLocked ? "LOCKED" : "UNLOCKED"}
          </span>
          <button
            onClick={toggleLock}
            className="px-3 py-1.5 rounded-lg text-sm font-medium border border-[var(--a-border)] text-[var(--a-text)] hover:bg-[var(--a-nav-hover)]"
          >
            {docs.docsLocked ? "Unlock" : "Lock"}
          </button>
        </div>
      </div>
      <div className="space-y-2">
        {(docs.documents ?? []).map((d: any, i: number) => (
          <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)]">
            <div>
              <p className="text-sm font-medium text-[var(--a-text)]">{d.label ?? d.type}</p>
              <p className="text-xs text-[var(--a-text-faint)]">{d.name ?? "—"}</p>
            </div>
            <a
              href={d.viewUrl ?? d.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[var(--a-accent)] hover:underline shrink-0 ml-3"
            >
              View
            </a>
          </div>
        ))}
        {(docs.documents ?? []).length === 0 && (
          <p className="text-sm text-[var(--a-text-muted)]">No documents uploaded yet.</p>
        )}
      </div>
    </Card>
  );
}
