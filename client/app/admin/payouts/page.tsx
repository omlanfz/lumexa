"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { Card, StatusBadge, formatBDT } from "@/components/admin/AdminUI";

interface PayoutRow {
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  totalCents: number;
  entryCount: number;
  status: "OPEN" | "FINALIZED" | "PAID";
  finalizedAt: string | null;
  paidAt: string | null;
}

function monthOptions() {
  const opts: { value: string; label: string; month: number; year: number }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    opts.push({
      value: `${d.getFullYear()}-${d.getMonth() + 1}`,
      label: d.toLocaleString("en-US", { month: "long", year: "numeric" }),
      month: d.getMonth() + 1,
      year: d.getFullYear(),
    });
  }
  return opts;
}

export default function PayoutsOverviewPage() {
  const router = useRouter();
  const options = monthOptions();
  const [selected, setSelected] = useState(options[0].value);
  const [rows, setRows] = useState<PayoutRow[]>([]);
  const [loading, setLoading] = useState(true);

  const { month, year } = options.find((o) => o.value === selected)!;

  const load = useCallback(() => {
    setLoading(true);
    api
      .get(`/admin/payouts/overview?month=${month}&year=${year}`)
      .then((res) => setRows(res.data ?? []))
      .finally(() => setLoading(false));
  }, [month, year]);

  useEffect(() => load(), [load]);

  const totalPayable = rows.reduce((sum, r) => sum + r.totalCents, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--a-text)]">Payouts</h1>
          <p className="text-sm text-[var(--a-text-muted)] mt-1">
            Financial control center — teacher salary is always calculated from the ledger.
          </p>
        </div>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="px-3 py-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] text-sm text-[var(--a-text)] a-focus"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><p className="text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)] mb-1">Total Payable</p><p className="text-2xl font-bold text-[var(--a-text)]">{formatBDT(totalPayable)}</p></Card>
        <Card><p className="text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)] mb-1">Teachers</p><p className="text-2xl font-bold text-[var(--a-text)]">{rows.length}</p></Card>
        <Card><p className="text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)] mb-1">Paid</p><p className="text-2xl font-bold text-[var(--a-text)]">{rows.filter((r) => r.status === "PAID").length} / {rows.length}</p></Card>
      </div>

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--a-border)] text-left text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)]">
              <th className="px-4 py-3">Teacher</th>
              <th className="px-4 py-3">Ledger Entries</th>
              <th className="px-4 py-3">Total Payable</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Statement</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--a-text-faint)]">Loading…</td></tr>}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--a-text-faint)]">No payout activity for this month.</td></tr>
            )}
            {!loading &&
              rows.map((r) => (
                <tr key={r.teacherId} className="border-b border-[var(--a-border)] last:border-0 hover:bg-[var(--a-nav-hover)] transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-[var(--a-text)] font-medium">{r.teacherName}</p>
                    <p className="text-xs text-[var(--a-text-faint)]">{r.teacherEmail}</p>
                  </td>
                  <td className="px-4 py-3 text-[var(--a-text-muted)]">{r.entryCount}</td>
                  <td className="px-4 py-3 font-semibold text-[var(--a-text)]">{formatBDT(r.totalCents)}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => router.push(`/admin/payouts/${r.teacherId}?month=${month}&year=${year}`)}
                      className="text-sm text-[var(--a-accent)] hover:underline"
                    >
                      View statement
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
