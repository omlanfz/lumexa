// FILE PATH: client/app/admin/trial-classes/SlotChooser.tsx
//
// Admin-side date + time picker for scheduling / rescheduling a trial. It
// shows exactly the slots the backend would accept (same engine as the public
// page), so admins follow the same availability, 30-minute session and
// 30-minute gap rules as parents. To book outside availability, add a
// one-off window on the Availability tab first.

"use client";

import { useRef, useState } from "react";
import api from "@/lib/axios";
import { formatDhakaTime, todayDhakaDateStr } from "@/components/admin/AdminUI";
import { AvailabilityDay, errMessage } from "./types";

interface Props {
  value: string | null;
  onChange: (iso: string | null) => void;
  /** When rescheduling, the appointment being moved doesn't block its own neighbours. */
  excludeId?: string;
}

export default function SlotChooser({ value, onChange, excludeId }: Props) {
  const [date, setDate] = useState("");
  const [day, setDay] = useState<AvailabilityDay | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef(0);

  // Loaded from the change handler (not an effect): each pick of a date asks
  // the server which times are really open, ignoring answers that arrive late.
  const loadDate = async (next: string) => {
    const ticket = ++latest.current;
    setDate(next);
    onChange(null);
    setDay(null);
    setError(null);
    if (!next) return;
    setLoading(true);
    try {
      const res = await api.get("/admin/trial/availability/preview", { params: { from: next, to: next, excludeId } });
      if (ticket === latest.current) setDay(res.data.days?.[0] ?? null);
    } catch (err) {
      if (ticket === latest.current) setError(errMessage(err, "Could not load times."));
    } finally {
      if (ticket === latest.current) setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)] mb-1.5">
          Date (Bangladesh)
        </label>
        <input
          type="date"
          value={date}
          min={todayDhakaDateStr()}
          onChange={(e) => void loadDate(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] text-sm text-[var(--a-text)] a-focus"
        />
      </div>

      {date && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)] mb-1.5">
            Open start times · Bangladesh Time (GMT+6) · 30 min
          </p>
          {loading ? (
            <p className="text-sm text-[var(--a-text-muted)]">Loading…</p>
          ) : error ? (
            <p className="text-sm text-[var(--a-danger)]">{error}</p>
          ) : day && day.slots.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {day.slots.map((iso) => (
                <button
                  key={iso}
                  type="button"
                  onClick={() => onChange(iso)}
                  aria-pressed={value === iso}
                  className={`py-2 rounded-lg border text-sm font-semibold transition-colors ${
                    value === iso
                      ? "bg-[var(--a-accent)] border-[var(--a-accent)] text-white"
                      : "border-[var(--a-border)] text-[var(--a-text)] hover:bg-[var(--a-nav-hover)]"
                  }`}
                >
                  {formatDhakaTime(iso)}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--a-text-muted)]">
              {day?.status === "full"
                ? "Fully booked on this date."
                : "No bookable times on this date. Add a one-off availability window (Availability tab) if you need one."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
