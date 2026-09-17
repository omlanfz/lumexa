"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/axios";
import { Avatar, Card, Pagination, StatusBadge, formatDate } from "@/components/admin/AdminUI";

interface TeacherRow {
  id: string;
  hourlyRate: number;
  isSuspended: boolean;
  strikes: number;
  ratingAvg: number;
  reviewCount: number;
  subjects: string[];
  docsLocked: boolean;
  payoutLocked: boolean;
  user: { fullName: string; email: string; createdAt: string; avatarUrl: string | null; whatsappNumber: string | null };
  _count: { shifts: number; rescheduleRequests: number };
}

export default function TeachersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
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
      .get(`/admin/teachers?${params.toString()}`)
      .then((res) => {
        setTeachers(res.data.teachers ?? []);
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
        <h1 className="text-2xl font-bold text-[var(--a-text)]">Teachers</h1>
        <p className="text-sm text-[var(--a-text-muted)] mt-1">{total} teachers</p>
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
          <option value="SUSPENDED">Suspended</option>
        </select>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--a-border)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)]">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Subjects</th>
                <th className="px-4 py-3">Rating</th>
                <th className="px-4 py-3">Strikes</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Joined</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[var(--a-text-faint)]">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && teachers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[var(--a-text-faint)]">
                    No teachers found.
                  </td>
                </tr>
              )}
              {!loading &&
                teachers.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => router.push(`/admin/teachers/${t.id}`)}
                    className="border-b border-[var(--a-border)] last:border-0 hover:bg-[var(--a-nav-hover)] cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={t.user.fullName} src={t.user.avatarUrl} />
                        <p className="text-[var(--a-text)] font-medium">{t.user.fullName}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--a-text-muted)]">
                      <p>{t.user.email}</p>
                      <p className="text-xs text-[var(--a-text-faint)]">{t.user.whatsappNumber || "No WhatsApp on file"}</p>
                    </td>
                    <td className="px-4 py-3 text-[var(--a-text-muted)]">{t.subjects.join(", ") || "—"}</td>
                    <td className="px-4 py-3 text-[var(--a-text)]">
                      {t.ratingAvg.toFixed(1)}★ ({t.reviewCount})
                    </td>
                    <td className="px-4 py-3 text-[var(--a-text)]">{t.strikes}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={t.isSuspended ? "SUSPENDED" : "ACTIVE"} />
                    </td>
                    <td className="px-4 py-3 text-[var(--a-text-muted)]">{formatDate(t.user.createdAt)}</td>
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
