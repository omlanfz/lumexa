"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/axios";
import { Avatar, Card, Pagination, PaymentBadge, StatusBadge, formatDate } from "@/components/admin/AdminUI";

interface StudentRow {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  grade: string | null;
  accountStatus: string;
  createdAt: string;
  assignedTeacher: { id: string; user: { fullName: string } } | null;
  assignedCourse: { id: string; title: string } | null;
  paymentBadge: { level: string; label: string } | null;
}

export default function StudentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(searchParams.get("status") ?? "");
  const [search, setSearch] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", "20");
    if (status) params.set("status", status);
    if (search.trim()) params.set("search", search.trim());
    api
      .get(`/admin/students?${params.toString()}`)
      .then((res) => {
        setStudents(res.data.students ?? []);
        setTotal(res.data.total ?? 0);
        setTotalPages(res.data.totalPages ?? 1);
      })
      .finally(() => setLoading(false));
  }, [page, status, search]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  const updateStatus = (v: string) => {
    setStatus(v);
    setPage(1);
  };
  const updateSearch = (v: string) => {
    setSearch(v);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--a-text)]">Students</h1>
        <p className="text-sm text-[var(--a-text-muted)] mt-1">{total} students</p>
      </div>

      <Card className="flex flex-col sm:flex-row gap-3">
        <input
          value={search}
          onChange={(e) => updateSearch(e.target.value)}
          placeholder="Search name or email…"
          className="flex-1 px-3 py-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] text-sm text-[var(--a-text)] a-focus"
        />
        <select
          value={status}
          onChange={(e) => updateStatus(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] text-sm text-[var(--a-text)] a-focus"
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="PAUSED">Paused</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="DEACTIVATED">Deactivated</option>
        </select>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--a-border)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)]">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Teacher</th>
                <th className="px-4 py-3">Course</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Joined</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-[var(--a-text-faint)]">Loading…</td></tr>
              )}
              {!loading && students.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-[var(--a-text-faint)]">No students found.</td></tr>
              )}
              {!loading &&
                students.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => router.push(`/admin/students/${s.id}`)}
                    className="border-b border-[var(--a-border)] last:border-0 hover:bg-[var(--a-nav-hover)] cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={s.fullName} src={s.avatarUrl} />
                        <div>
                          <p className="text-[var(--a-text)] font-medium">{s.fullName}</p>
                          <p className="text-xs text-[var(--a-text-faint)]">{s.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--a-text-muted)]">{s.assignedTeacher?.user.fullName ?? "Unassigned"}</td>
                    <td className="px-4 py-3 text-[var(--a-text-muted)]">{s.assignedCourse?.title ?? "—"}</td>
                    <td className="px-4 py-3"><StatusBadge status={s.accountStatus} /></td>
                    <td className="px-4 py-3">
                      {s.paymentBadge ? <PaymentBadge badge={s.paymentBadge} /> : <span className="text-[var(--a-text-faint)]">—</span>}
                    </td>
                    <td className="px-4 py-3 text-[var(--a-text-muted)]">{formatDate(s.createdAt)}</td>
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
