// FILE PATH: client/app/admin/trial-classes/page.tsx
//
// Admin → Trial Classes: booked free trials (separate from regular course
// classes) and the availability parents can book from.

"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/axios";
import { Card } from "@/components/admin/AdminUI";
import AppointmentsPanel from "./AppointmentsPanel";
import AvailabilityPanel from "./AvailabilityPanel";
import { Summary } from "./types";

type Tab = "appointments" | "availability";

function Stat({ label, value, tone, hint }: { label: string; value: number | string; tone?: "warn" | "danger"; hint?: string }) {
  const color =
    tone === "danger" ? "text-[var(--a-danger-text)]" : tone === "warn" ? "text-[var(--a-warning-text)]" : "a-stat-value";
  return (
    <Card>
      <div className="text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)]">{label}</div>
      <div className={`text-3xl font-bold mt-1 ${color}`}>{value}</div>
      {hint && <div className="text-xs text-[var(--a-text-muted)] mt-1">{hint}</div>}
    </Card>
  );
}

export default function TrialClassesPage() {
  const [tab, setTab] = useState<Tab>("appointments");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [version, setVersion] = useState(0);

  const loadSummary = useCallback(() => {
    api.get<Summary>("/admin/trial/appointments/summary").then((res) => setSummary(res.data)).catch(() => setSummary(null));
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary, version]);

  const bump = useCallback(() => setVersion((v) => v + 1), []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--a-text)]">Trial Classes</h1>
        <p className="text-sm text-[var(--a-text-muted)] mt-1">
          Free 30-minute trials booked by parents, and the times they can book. Everything is in Bangladesh Time (GMT+6).
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat label="Upcoming trials" value={summary?.upcoming ?? "—"} />
        <Stat
          label="Outside availability"
          value={summary?.outsideAvailability ?? "—"}
          tone={summary && summary.outsideAvailability > 0 ? "warn" : undefined}
          hint={summary && summary.outsideAvailability > 0 ? "Booked, but availability changed since. Reschedule or cancel each." : "All bookings fit current availability"}
        />
        <Stat
          label="Failed WhatsApp messages"
          value={summary?.failedWhatsApp ?? "—"}
          tone={summary && summary.failedWhatsApp > 0 ? "danger" : undefined}
          hint={summary && summary.failedWhatsApp > 0 ? "Open the trial and check Notifications" : "No delivery problems"}
        />
      </div>

      <div className="flex gap-1 border-b border-[var(--a-border)]" role="tablist">
        {([
          ["appointments", "Appointments"],
          ["availability", "Availability"],
        ] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 transition-colors ${
              tab === key
                ? "border-[var(--a-accent)] text-[var(--a-accent)]"
                : "border-transparent text-[var(--a-text-muted)] hover:text-[var(--a-text)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "appointments" ? (
        <AppointmentsPanel version={version} onChanged={bump} />
      ) : (
        <AvailabilityPanel onChanged={bump} />
      )}
    </div>
  );
}
