"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/axios";
import {
  Card,
  Modal,
  ReasonActionModal,
  StatusBadge,
  formatDate,
  formatDateTime,
} from "@/components/admin/AdminUI";

const TABS = ["Overview", "Class History", "Notes", "Payments", "Reschedule History"] as const;
type Tab = (typeof TABS)[number];

export default function StudentDetailPage() {
  const { studentUserId } = useParams<{ studentUserId: string }>();
  const router = useRouter();
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("Overview");
  const [modal, setModal] = useState<null | "pause" | "assignTeacher" | "assignCourse">(null);

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
        <Card className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)]">Gem Wallet</p>
          <p className="text-sm text-[var(--a-text)]">Balance: {student.gemBalance} gems</p>
          <div className="pt-3 space-y-2">
            {(student.gemWallet?.purchases ?? []).length === 0 && (
              <p className="text-sm text-[var(--a-text-muted)]">No purchase history.</p>
            )}
            {(student.gemWallet?.purchases ?? []).map((p: any) => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)]">
                <div>
                  <p className="text-sm text-[var(--a-text)]">{p.gems} gems via {p.paymentMethod}</p>
                  <p className="text-xs text-[var(--a-text-faint)]">{formatDateTime(p.createdAt)}</p>
                </div>
                <StatusBadge status={p.status} />
              </div>
            ))}
          </div>
        </Card>
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
