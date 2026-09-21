"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import api from "@/lib/axios";
import {
  Card,
  Pagination,
  StatusBadge,
  formatBDT,
  formatDateTime,
  CLASS_TYPE_LABELS,
} from "@/components/admin/AdminUI";
import ClassRowActions, { ClassRow } from "./ClassRowActions";

interface Teacher {
  id: string;
  user: { fullName: string };
}
interface Course {
  id: string;
  title: string;
}
interface StudentOption {
  id: string;
  fullName: string;
  email: string;
}

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "REFUNDED", label: "Refunded" },
  { value: "PENDING", label: "Pending" },
  { value: "FAILED", label: "Failed" },
  { value: "NEEDS_REVIEW", label: "Needs Review" },
];

export default function ClassesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [rows, setRows] = useState<ClassRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [studentQuery, setStudentQuery] = useState("");
  const [studentOptions, setStudentOptions] = useState<StudentOption[]>([]);
  const [studentFilter, setStudentFilter] = useState<StudentOption | null>(null);
  const [studentFieldFocused, setStudentFieldFocused] = useState(false);

  const [date, setDate] = useState(searchParams.get("date") ?? "");
  const [status, setStatus] = useState(searchParams.get("status") ?? "");
  const [teacherId, setTeacherId] = useState("");
  const [courseId, setCourseId] = useState("");

  useEffect(() => {
    api.get("/admin/teachers?limit=200").then((res) => setTeachers(res.data.teachers ?? []));
    api.get("/courses/admin/all").then((res) => setCourses(res.data ?? []));
  }, []);

  // Loads a default browsable list of students immediately, then narrows as
  // the admin searches — same pattern used across admin's other pickers.
  useEffect(() => {
    const t = setTimeout(() => {
      api
        .get(`/admin/students?limit=20&search=${encodeURIComponent(studentQuery)}`)
        .then((res) => setStudentOptions(res.data.students ?? []));
    }, 250);
    return () => clearTimeout(t);
  }, [studentQuery]);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", "20");
    if (date) params.set("date", date);
    if (status) params.set("status", status);
    if (teacherId) params.set("teacherId", teacherId);
    if (courseId) params.set("courseId", courseId);
    if (studentFilter) params.set("studentUserId", studentFilter.id);

    api
      .get(`/admin/bookings?${params.toString()}`)
      .then((res) => {
        setRows(res.data.classes ?? []);
        setTotal(res.data.total ?? 0);
        setTotalPages(res.data.totalPages ?? 1);
      })
      .finally(() => setLoading(false));
  }, [page, date, status, teacherId, courseId, studentFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const updateDate = (v: string) => { setDate(v); setPage(1); };
  const updateStatus = (v: string) => { setStatus(v); setPage(1); };
  const updateTeacherId = (v: string) => { setTeacherId(v); setPage(1); };
  const updateCourseId = (v: string) => { setCourseId(v); setPage(1); };
  const updateStudentFilter = (v: StudentOption | null) => { setStudentFilter(v); setPage(1); };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--a-text)]">Classes</h1>
        <p className="text-sm text-[var(--a-text-muted)] mt-1">
          {total} class{total === 1 ? "" : "es"} matching current filters
        </p>
      </div>

      {/* Filters */}
      <Card className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div>
          <label className="block text-xs font-semibold text-[var(--a-text-faint)] mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => updateDate(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] text-sm text-[var(--a-text)] a-focus"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[var(--a-text-faint)] mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => updateStatus(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] text-sm text-[var(--a-text)] a-focus"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-[var(--a-text-faint)] mb-1">Teacher</label>
          <select
            value={teacherId}
            onChange={(e) => updateTeacherId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] text-sm text-[var(--a-text)] a-focus"
          >
            <option value="">All teachers</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.user.fullName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-[var(--a-text-faint)] mb-1">Course</label>
          <select
            value={courseId}
            onChange={(e) => updateCourseId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] text-sm text-[var(--a-text)] a-focus"
          >
            <option value="">All courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
        <div className="relative">
          <label className="block text-xs font-semibold text-[var(--a-text-faint)] mb-1">Student</label>
          {studentFilter ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] text-sm text-[var(--a-text)]">
              <span className="truncate flex-1">{studentFilter.fullName}</span>
              <button
                onClick={() => {
                  updateStudentFilter(null);
                  setStudentQuery("");
                }}
                className="text-[var(--a-text-faint)] hover:text-[var(--a-text)]"
              >
                ✕
              </button>
            </div>
          ) : (
            <input
              value={studentQuery}
              onChange={(e) => setStudentQuery(e.target.value)}
              onFocus={() => setStudentFieldFocused(true)}
              onBlur={() => setTimeout(() => setStudentFieldFocused(false), 150)}
              placeholder="Search, or click to browse all students…"
              className="w-full px-3 py-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] text-sm text-[var(--a-text)] a-focus"
            />
          )}
          {studentFieldFocused && studentOptions.length > 0 && !studentFilter && (
            <div className="absolute z-10 mt-1 w-full rounded-lg border border-[var(--a-border)] bg-[var(--a-surface)] shadow-lg overflow-hidden">
              {studentOptions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    updateStudentFilter(s);
                    setStudentOptions([]);
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--a-nav-hover)] text-[var(--a-text)]"
                >
                  {s.fullName} <span className="text-[var(--a-text-faint)]">({s.email})</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--a-border)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)]">
                <th className="px-4 py-3">Date/Time</th>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Teacher</th>
                <th className="px-4 py-3">Course</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3 text-right">Actions</th>
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
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-[var(--a-text-faint)]">
                    No classes match these filters.
                  </td>
                </tr>
              )}
              {!loading &&
                rows.map((r) => (
                  <tr
                    key={`${r.kind}:${r.id}`}
                    className="border-b border-[var(--a-border)] last:border-0 hover:bg-[var(--a-nav-hover)] transition-colors"
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-[var(--a-text)]">
                      {formatDateTime(r.start)}
                    </td>
                    <td className="px-4 py-3 text-[var(--a-text)]">{r.studentName}</td>
                    <td className="px-4 py-3 text-[var(--a-text)]">{r.teacherName}</td>
                    <td className="px-4 py-3 text-[var(--a-text-muted)]">
                      {r.courseTitle}
                      {r.classType && (
                        <span className="block text-xs text-[var(--a-text-faint)]">
                          {CLASS_TYPE_LABELS[r.classType] ?? r.classType}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <StatusBadge status={r.displayStatus} />
                        {r.isLive && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-500 text-[10px] font-bold uppercase tracking-wide">
                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" /> Live
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {r.paymentStatus ? <StatusBadge status={r.paymentStatus} /> : <span className="text-[var(--a-text-faint)]">—</span>}
                    </td>
                    <td className="px-4 py-3 text-[var(--a-text)]">
                      {r.amountCents != null ? formatBDT(r.amountCents) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {r.isLive && (
                          <button
                            onClick={() => router.push(`/admin/classroom/${r.kind}/${r.id}`)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-red-500 hover:bg-red-400 text-white transition-colors"
                          >
                            Join Class
                          </button>
                        )}
                        <ClassRowActions row={r} onChanged={load} />
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}
