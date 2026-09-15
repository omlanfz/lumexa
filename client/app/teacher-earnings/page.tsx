// FILE PATH: client/app/teacher-earnings/page.tsx
//
// Built around the append-only earnings ledger (GET /payouts/me). Monthly
// totals are a sum of ledger transactions, never a separately-maintained
// running balance. "Download Report" hits the same query/service the admin
// export uses (GET /payouts/me/report).

"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import TeacherLayout from "../../components/TeacherLayout";
import LumiChat from "../../components/LumiChat";

interface LedgerItem {
  id: string;
  type: "CLASS_COMPLETED" | "PTM" | "CONVERSION" | "PENALTY" | "ADJUSTMENT";
  amountCents: number;
  description: string;
  createdAt: string;
  referenceId: string | null;
  bookingId: string | null;
}

interface Summary {
  monthEarningsCents: number;
  allTimeEarningsCents: number;
  monthEventCount: number;
  breakdown: Record<string, number>;
  lastUpdated: string | null;
}

interface MonthBucket {
  key: string;
  label: string;
  earningsCents: number;
}

interface Profile {
  user: { fullName: string; avatarUrl?: string | null };
}

const TYPE_LABELS: Record<string, string> = {
  CLASS_COMPLETED: "Completed class",
  PTM: "Parent-teacher meeting",
  CONVERSION: "Conversion bonus",
  PENALTY: "Penalty",
  ADJUSTMENT: "Adjustment",
};

function BarChart({ months }: { months: MonthBucket[] }) {
  if (months.length === 0) return null;
  const maxCents = Math.max(...months.map((m) => m.earningsCents), 1);

  return (
    <div className="flex items-end gap-2 sm:gap-3 h-40 w-full">
      {months.map((m) => {
        const pct = (m.earningsCents / maxCents) * 100;
        return (
          <div key={m.key} className="flex-1 flex flex-col items-center gap-1 group">
            <span className="text-xs text-[var(--t-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              ৳{(m.earningsCents / 100).toFixed(0)}
            </span>
            <div className="w-full relative flex flex-col justify-end" style={{ height: "120px" }}>
              <div
                className="w-full rounded-t-lg bg-gradient-to-t from-[var(--t-accent)] to-[var(--t-accent-2)] transition-all duration-500"
                style={{ height: `${Math.max(pct, 4)}%` }}
              />
            </div>
            <span className="text-[10px] sm:text-xs text-[var(--t-text-muted)] truncate w-full text-center">
              {m.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function TeacherEarningsContent() {
  const router = useRouter();

  const [items, setItems] = useState<LedgerItem[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [months, setMonths] = useState<MonthBucket[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    (async () => {
      try {
        const [ledgerRes, summaryRes, monthlyRes, profileRes] = await Promise.all([
          api.get("/payouts/me?limit=100"),
          api.get("/payouts/me/summary"),
          api.get("/payouts/me/monthly"),
          api.get("/teachers/me/profile"),
        ]);
        setItems(ledgerRes.data.items ?? []);
        setSummary(summaryRes.data);
        setMonths(monthlyRes.data.months ?? []);
        setProfile(profileRes.data);
      } catch (e: any) {
        const m = e.response?.data?.message;
        setError(Array.isArray(m) ? m.join(", ") : (m ?? "Failed to load earnings"));
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const downloadReport = async () => {
    setDownloading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/payouts/me/report`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to generate report");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "payout_report.xlsx";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      setError("Failed to download report. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const card = "t-card t-card-hover shadow-sm";

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--t-bg)]">
        <div className="w-10 h-10 border-2 border-[var(--t-accent)] border-t-transparent rounded-full animate-spin" />
      </div>
    );

  return (
    <TeacherLayout
      teacherName={profile?.user?.fullName ?? "Teacher"}
      avatarUrl={profile?.user?.avatarUrl ?? null}
    >
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--t-text)]">Earnings</h1>
          </div>
          <button
            onClick={downloadReport}
            disabled={downloading}
            className="text-sm px-4 py-2 rounded-xl bg-[var(--t-accent)] hover:bg-[var(--t-accent-hover)] text-white transition-all duration-150 active:scale-[0.98] disabled:opacity-50"
          >
            {downloading ? "Preparing…" : "Download Report"}
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-[var(--t-danger-bg)] text-[var(--t-danger)] text-sm">
            {error}
          </div>
        )}

        {/* ── Teacher balance ── */}
        <div className={`${card} p-6 mb-6`}>
          <p className="text-xs uppercase tracking-wide font-medium text-[var(--t-text-muted)]">
            This Month&apos;s Earnings
          </p>
          <p className="text-4xl font-bold t-earn-text mt-1">
            ৳{((summary?.monthEarningsCents ?? 0) / 100).toLocaleString()}
          </p>
          <p className="text-xs text-[var(--t-text-muted)] mt-1">
            {summary?.monthEventCount ?? 0} earning event{(summary?.monthEventCount ?? 0) !== 1 ? "s" : ""}
            {summary?.lastUpdated && (
              <>
                {" · Last updated "}
                {new Date(summary.lastUpdated).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
              </>
            )}
          </p>
          <div className="mt-4 pt-4 border-t border-[var(--t-nav-border)] flex items-center gap-2 flex-wrap">
            {summary &&
              Object.entries(summary.breakdown).map(([type, cents]) => (
                <span
                  key={type}
                  className={`text-xs px-2.5 py-1 rounded-full ${cents >= 0 ? "bg-[var(--t-success-bg)] text-[var(--t-success-text)]" : "bg-[var(--t-danger-bg)] text-[var(--t-danger)]"}`}
                >
                  {TYPE_LABELS[type] ?? type}: {cents >= 0 ? "+" : ""}৳{(cents / 100).toLocaleString()}
                </span>
              ))}
          </div>
        </div>

        {/* ── Monthly chart ── */}
        {months.length > 0 && (
          <div className={`${card} p-5 mb-6`}>
            <p className="font-semibold text-[var(--t-text)] mb-1">Monthly Earnings</p>
            <p className="text-xs text-[var(--t-text-muted)] mb-4">Last 6 months</p>
            <BarChart months={months} />
          </div>
        )}

        {/* ── Transaction list ── */}
        <div className={`${card} overflow-hidden`}>
          <div className="px-4 sm:px-5 py-4 border-b border-[var(--t-nav-border)]">
            <p className="font-semibold text-[var(--t-text)]">Transaction History</p>
          </div>

          {items.length === 0 ? (
            <div className="p-10 sm:p-16 text-center">
              <p className="font-semibold text-[var(--t-text)]">No earnings yet</p>
              <p className="text-sm text-[var(--t-text-muted)] mt-1">
                Earnings appear here automatically after a class is completed.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--t-nav-border)]">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="px-4 sm:px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-[var(--t-nav-hover)] transition-colors duration-150"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--t-text)]">{item.description}</p>
                    <p className="text-xs text-[var(--t-text-muted)]">
                      {new Date(item.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                      {item.referenceId && ` · Ref: ${item.referenceId}`}
                    </p>
                  </div>
                  <p
                    className={`text-sm font-bold flex-shrink-0 ${item.amountCents >= 0 ? "t-earn-text" : "text-[var(--t-danger)]"}`}
                  >
                    {item.amountCents >= 0 ? "+" : ""}৳{(item.amountCents / 100).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <LumiChat
        variant="teacher"
        context={`Teacher earnings page — ৳${((summary?.monthEarningsCents ?? 0) / 100).toLocaleString()} earned this month`}
      />
    </TeacherLayout>
  );
}

export default function TeacherEarningsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen bg-[var(--t-bg)]">
          <div className="w-10 h-10 border-2 border-[var(--t-accent)] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <TeacherEarningsContent />
    </Suspense>
  );
}
