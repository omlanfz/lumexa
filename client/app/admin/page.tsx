"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { Card, formatBDT } from "@/components/admin/AdminUI";

interface DashboardSummary {
  todayClasses: number;
  pendingReschedules: number;
  activeTeachers: number;
  activeStudents: number;
  monthRevenueCents: number;
  monthPayoutsCents: number;
  month: number;
  year: number;
}

function StatCard({
  label,
  value,
  onClick,
  accent,
}: {
  label: string;
  value: string | number;
  onClick?: () => void;
  accent?: boolean;
}) {
  return (
    <Card
      className={`a-card-hover cursor-pointer transition-transform ${onClick ? "hover:-translate-y-0.5" : ""}`}
    >
      <button onClick={onClick} disabled={!onClick} className="w-full text-left" type="button">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)] mb-2">
          {label}
        </p>
        <p className={`text-3xl font-bold ${accent ? "a-stat-value" : "text-[var(--a-text)]"}`}>
          {value}
        </p>
      </button>
    </Card>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<DashboardSummary>("/admin/dashboard")
      .then((res) => setData(res.data))
      .catch(() => setError("Couldn't load the dashboard summary."))
      .finally(() => setLoading(false));
  }, []);

  const monthLabel = data
    ? new Date(data.year, data.month - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" })
    : "";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--a-text)]">Dashboard</h1>
        <p className="text-sm text-[var(--a-text-muted)] mt-1">
          Operational overview{data ? ` · ${monthLabel}` : ""}
        </p>
      </div>

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="a-shimmer h-28 rounded-2xl" />
          ))}
        </div>
      )}

      {error && <p className="text-sm text-[var(--a-danger)]">{error}</p>}

      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            label="Today's Classes"
            value={data.todayClasses}
            accent
            onClick={() => router.push(`/admin/classes?date=${new Date().toISOString().slice(0, 10)}`)}
          />
          <StatCard
            label="Needs Review"
            value={data.pendingReschedules}
            accent
            onClick={() => router.push("/admin/classes?status=NEEDS_REVIEW")}
          />
          <StatCard
            label="Active Teachers"
            value={data.activeTeachers}
            onClick={() => router.push("/admin/teachers?status=ACTIVE")}
          />
          <StatCard
            label="Active Students"
            value={data.activeStudents}
            onClick={() => router.push("/admin/students?status=ACTIVE")}
          />
          <StatCard
            label="This Month's Revenue"
            value={formatBDT(data.monthRevenueCents)}
            onClick={() => router.push("/admin/classes?status=COMPLETED")}
          />
          <StatCard
            label="This Month's Teacher Payouts"
            value={formatBDT(data.monthPayoutsCents)}
            onClick={() => router.push("/admin/payouts")}
          />
        </div>
      )}
    </div>
  );
}
