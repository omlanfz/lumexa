"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/axios";
import { Card, Modal, StatusBadge, formatBDT, formatDateTime } from "@/components/admin/AdminUI";

export default function PayoutStatementPage() {
  const { teacherId } = useParams<{ teacherId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const now = new Date();
  const month = Number(searchParams.get("month") ?? now.getMonth() + 1);
  const year = Number(searchParams.get("year") ?? now.getFullYear());

  const [statement, setStatement] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAdjustment, setShowAdjustment] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get(`/admin/payouts/${teacherId}/statement?month=${month}&year=${year}`)
      .then((res) => setStatement(res.data))
      .finally(() => setLoading(false));
  }, [teacherId, month, year]);

  useEffect(() => load(), [load]);

  const finalize = async () => {
    setWorking(true);
    setError(null);
    try {
      await api.post(`/admin/payouts/${teacherId}/finalize`, { month, year });
      load();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Something went wrong.");
    } finally {
      setWorking(false);
    }
  };

  const markPaid = async () => {
    setWorking(true);
    setError(null);
    try {
      await api.post(`/admin/payouts/${teacherId}/mark-paid`, { month, year });
      load();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Something went wrong.");
    } finally {
      setWorking(false);
    }
  };

  const exportExcel = async () => {
    const res = await api.get(`/admin/teachers/${teacherId}/ledger/report?month=${month}&year=${year}`, {
      responseType: "blob",
    });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${statement?.teacherName?.replace(/\s+/g, "_") ?? "teacher"}_payout_${year}-${String(month).padStart(2, "0")}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  if (loading) return <p className="text-sm text-[var(--a-text-muted)]">Loading…</p>;
  if (!statement) return <p className="text-sm text-[var(--a-danger)]">Statement not found.</p>;

  const monthLabel = new Date(year, month - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      <button onClick={() => router.push("/admin/payouts")} className="text-sm text-[var(--a-text-muted)] hover:text-[var(--a-text)]">
        ← Back to Payouts
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--a-text)]">{statement.teacherName}</h1>
          <p className="text-sm text-[var(--a-text-muted)]">{monthLabel} statement</p>
        </div>
        <StatusBadge status={statement.status} />
      </div>

      {error && <p className="text-sm text-[var(--a-danger)]">{error}</p>}

      <Card className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)] mb-1">Total Payable (live from ledger)</p>
          <p className="text-2xl font-bold text-[var(--a-text)]">{formatBDT(statement.totalCents)}</p>
        </div>
        {statement.finalizedAt && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)] mb-1">Finalized</p>
            <p className="text-sm text-[var(--a-text)]">{formatDateTime(statement.finalizedAt)} · {formatBDT(statement.finalizedAmountCents)}</p>
          </div>
        )}
        {statement.paidAt && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)] mb-1">Paid</p>
            <p className="text-sm text-[var(--a-text)]">{formatDateTime(statement.paidAt)} · {formatBDT(statement.paidAmountCents)}</p>
          </div>
        )}
      </Card>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setShowAdjustment(true)}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[var(--a-accent)] hover:bg-[var(--a-accent-hover)]"
        >
          Add Adjustment
        </button>
        {statement.status === "OPEN" && (
          <button
            onClick={finalize}
            disabled={working}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[var(--a-info)] hover:opacity-90 disabled:opacity-60"
          >
            Finalize Month
          </button>
        )}
        {statement.status === "FINALIZED" && (
          <button
            onClick={markPaid}
            disabled={working}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[var(--a-success)] hover:opacity-90 disabled:opacity-60"
          >
            Mark as Paid
          </button>
        )}
        <button
          onClick={exportExcel}
          className="px-4 py-2 rounded-lg text-sm font-semibold border border-[var(--a-border)] text-[var(--a-text)] hover:bg-[var(--a-nav-hover)]"
        >
          Export Excel
        </button>
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
            {statement.entries.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-[var(--a-text-faint)]">No ledger transactions this month.</td></tr>
            )}
            {statement.entries.map((e: any) => (
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
          <tfoot>
            <tr>
              <td colSpan={3} className="px-4 py-3 text-right font-semibold text-[var(--a-text)]">Total</td>
              <td className="px-4 py-3 text-right font-bold text-[var(--a-text)]">{formatBDT(statement.totalCents)}</td>
            </tr>
          </tfoot>
        </table>
      </Card>

      {showAdjustment && (
        <AdjustmentModal
          teacherId={teacherId}
          month={month}
          year={year}
          onClose={() => setShowAdjustment(false)}
          onDone={load}
        />
      )}
    </div>
  );
}

function AdjustmentModal({
  teacherId,
  month,
  year,
  onClose,
  onDone,
}: {
  teacherId: string;
  month: number;
  year: number;
  onClose: () => void;
  onDone: () => void;
}) {
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
        month,
        year,
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
