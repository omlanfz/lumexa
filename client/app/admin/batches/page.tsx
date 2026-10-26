"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { Avatar, Card, Pagination, formatDhakaDate, formatDhakaTime } from "@/components/admin/AdminUI";
import { BatchStatusBadge, SeatsChip } from "@/components/admin/batches/BatchUI";
import { CreateBatchModal, useTeachersAndCourses } from "@/components/admin/batches/BatchFormModals";
import { formatProgress, formatSlots, type BatchSummary } from "@/lib/batches";

const STATUS_FILTERS = [
  { value: "", label: "Active & completed" },
  { value: "ACTIVE", label: "Active" },
  { value: "COMPLETED", label: "Completed" },
  { value: "ARCHIVED", label: "Archived" },
  { value: "ALL", label: "All" },
];

export default function BatchesPage() {
  const router = useRouter();
  const { teachers, courses } = useTeachersAndCourses();
  const [batches, setBatches] = useState<BatchSummary[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (search.trim()) params.set("search", search.trim());
    if (status) params.set("status", status);
    if (teacherId) params.set("teacherId", teacherId);
    if (courseId) params.set("courseId", courseId);
    api
      .get(`/admin/batches?${params.toString()}`)
      .then((res) => {
        setBatches(res.data.batches ?? []);
        setTotal(res.data.total ?? 0);
        setTotalPages(res.data.totalPages ?? 1);
      })
      .catch(() => setError("Could not load the batches."))
      .finally(() => setLoading(false));
  }, [page, search, status, teacherId, courseId]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  const reset = (fn: () => void) => {
    fn();
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--a-text)]">Batches</h1>
          <p className="text-sm text-[var(--a-text-muted)] mt-1">
            {total} batch{total === 1 ? "" : "es"} — groups of students learning one curriculum together with one teacher.
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[var(--a-accent)] hover:bg-[var(--a-accent-hover)] transition-colors"
        >
          + New batch
        </button>
      </div>

      <Card className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <input
          value={search}
          onChange={(e) => reset(() => setSearch(e.target.value))}
          placeholder="Search batch, teacher or student…"
          className="px-3 py-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] text-sm text-[var(--a-text)] a-focus"
        />
        <select
          value={status}
          onChange={(e) => reset(() => setStatus(e.target.value))}
          className="px-3 py-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] text-sm text-[var(--a-text)] a-focus"
        >
          {STATUS_FILTERS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={teacherId}
          onChange={(e) => reset(() => setTeacherId(e.target.value))}
          className="px-3 py-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] text-sm text-[var(--a-text)] a-focus"
        >
          <option value="">All teachers</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.user.fullName}
            </option>
          ))}
        </select>
        <select
          value={courseId}
          onChange={(e) => reset(() => setCourseId(e.target.value))}
          className="px-3 py-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] text-sm text-[var(--a-text)] a-focus"
        >
          <option value="">All curricula</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </Card>

      {error && <p className="text-sm text-[var(--a-danger)]">{error}</p>}

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--a-border)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)]">
                <th className="px-4 py-3">Batch</th>
                <th className="px-4 py-3">Teacher</th>
                <th className="px-4 py-3">Curriculum</th>
                <th className="px-4 py-3">Schedule (Dhaka)</th>
                <th className="px-4 py-3">Students</th>
                <th className="px-4 py-3">Progress</th>
                <th className="px-4 py-3">Next class</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-[var(--a-text-faint)]">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && batches.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-[var(--a-text-faint)]">
                    No batches yet. Create one, or place a student in a batch from their Schedule tab.
                  </td>
                </tr>
              )}
              {!loading &&
                batches.map((b) => (
                  <tr
                    key={b.id}
                    onClick={() => router.push(`/admin/batches/${b.id}`)}
                    className="border-b border-[var(--a-border)] last:border-0 hover:bg-[var(--a-nav-hover)] cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="text-[var(--a-text)] font-medium">{b.name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar name={b.teacher.name} src={b.teacher.avatarUrl} size={28} />
                        <span className="text-[var(--a-text)]">{b.teacher.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--a-text-muted)]">{b.course.title}</td>
                    <td className="px-4 py-3 text-[var(--a-text-muted)] whitespace-nowrap">{formatSlots(b.slots)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <SeatsChip memberCount={b.memberCount} maxStudents={b.maxStudents} />
                    </td>
                    <td className="px-4 py-3 text-[var(--a-text-muted)] whitespace-nowrap">{formatProgress(b.progress)}</td>
                    <td className="px-4 py-3 text-[var(--a-text-muted)] whitespace-nowrap">
                      {b.nextSession
                        ? `${formatDhakaDate(b.nextSession.start)} ${formatDhakaTime(b.nextSession.start)}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <BatchStatusBadge status={b.status} />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      {creating && (
        <CreateBatchModal onClose={() => setCreating(false)} onCreated={(id) => router.push(`/admin/batches/${id}`)} />
      )}
    </div>
  );
}
