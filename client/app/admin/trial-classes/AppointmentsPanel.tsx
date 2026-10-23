// FILE PATH: client/app/admin/trial-classes/AppointmentsPanel.tsx
//
// Booked trials as a filterable list or a month calendar (Bangladesh dates).

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import api from "@/lib/axios";
import { Card, Pagination, StatusBadge, formatDhakaDate, formatDhakaTime, todayDhakaDateStr } from "@/components/admin/AdminUI";
import AppointmentDetailModal from "./AppointmentDetailModal";
import { ScheduleTrialModal } from "./AppointmentModals";
import { TrialAppointment, errMessage } from "./types";
import { inputCls, labelCls, primaryBtn } from "./ui";

type View = "list" | "calendar";

function dhakaDateOf(iso: string): string {
  return new Date(new Date(iso).getTime() + 6 * 3_600_000).toISOString().slice(0, 10);
}
function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
}
function monthTitle(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", year: "numeric" }).format(new Date(Date.UTC(y, m - 1, 1)));
}

function NotificationDot({ a }: { a: TrialAppointment }) {
  if (a.status === "CANCELLED") return <span className="text-[var(--a-text-faint)]">—</span>;
  const failed = a.notifications.needsAttention;
  const pending = a.notifications.whatsapp.some((w) => w.status === "PENDING");
  return failed ? (
    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-[var(--a-danger-bg)] text-[var(--a-danger-text)]">Needs attention</span>
  ) : (
    <span className="text-xs text-[var(--a-text-muted)]">{pending ? "Reminder scheduled" : "OK"}</span>
  );
}

export default function AppointmentsPanel({ version, onChanged }: { version: number; onChanged: () => void }) {
  const [view, setView] = useState<View>("list");
  const [scope, setScope] = useState("upcoming");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [month, setMonth] = useState(() => todayDhakaDateStr().slice(0, 7));

  const [rows, setRows] = useState<TrialAppointment[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [openId, setOpenId] = useState<string | null>(null);
  const [scheduling, setScheduling] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = {};
      if (view === "calendar") {
        const [y, m] = month.split("-").map(Number);
        params.from = `${month}-01`;
        params.to = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
        params.limit = 200;
        params.page = 1;
      } else {
        params.page = page;
        params.limit = 20;
        if (scope !== "all") params.scope = scope;
        if (from) params.from = from;
        if (to) params.to = to;
      }
      if (status) params.status = status;
      if (debouncedQ) params.q = debouncedQ;
      const res = await api.get("/admin/trial/appointments", { params });
      setRows(res.data.appointments ?? []);
      setTotal(res.data.total ?? 0);
      setTotalPages(res.data.totalPages ?? 1);
    } catch (err) {
      setError(errMessage(err, "Could not load trial appointments."));
    } finally {
      setLoading(false);
    }
  }, [view, month, page, scope, from, to, status, debouncedQ]);

  useEffect(() => {
    void load();
  }, [load, version]);

  const byDay = useMemo(() => {
    const map = new Map<string, TrialAppointment[]>();
    rows.forEach((r) => {
      const d = dhakaDateOf(r.startAt);
      map.set(d, [...(map.get(d) ?? []), r]);
    });
    return map;
  }, [rows]);

  const cells = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const lead = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
    const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return [
      ...Array.from({ length: lead }, () => null as string | null),
      ...Array.from({ length: days }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`),
    ];
  }, [month]);

  const resetPage = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-lg border border-[var(--a-border)] overflow-hidden" role="tablist" aria-label="View">
            {(["list", "calendar"] as View[]).map((v) => (
              <button
                key={v}
                role="tab"
                aria-selected={view === v}
                onClick={() => setView(v)}
                className={`px-4 py-1.5 text-sm font-medium capitalize ${view === v ? "bg-[var(--a-nav-active)] text-[var(--a-nav-active-text)]" : "text-[var(--a-text-muted)] hover:bg-[var(--a-nav-hover)]"}`}
              >
                {v}
              </button>
            ))}
          </div>
          <button className={primaryBtn} onClick={() => setScheduling(true)}>+ Schedule a trial</button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {view === "list" && (
            <>
              <div>
                <label className={labelCls}>Show</label>
                <select className={inputCls} value={scope} onChange={(e) => resetPage(setScope)(e.target.value)}>
                  <option value="upcoming">Upcoming</option>
                  <option value="past">Past</option>
                  <option value="all">All</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>From date</label>
                <input type="date" className={inputCls} value={from} onChange={(e) => resetPage(setFrom)(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>To date</label>
                <input type="date" className={inputCls} value={to} onChange={(e) => resetPage(setTo)(e.target.value)} />
              </div>
            </>
          )}
          <div>
            <label className={labelCls}>Status</label>
            <select className={inputCls} value={status} onChange={(e) => resetPage(setStatus)(e.target.value)}>
              <option value="">All</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Search</label>
            <input className={inputCls} placeholder="Parent, child, email, phone" value={q} onChange={(e) => resetPage(setQ)(e.target.value)} />
          </div>
        </div>
        <p className="text-xs text-[var(--a-text-faint)]">All dates and times are Bangladesh Time (GMT+6).</p>
      </Card>

      {error && <p role="alert" className="text-sm text-[var(--a-danger)]">{error}</p>}

      {view === "list" ? (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--a-surface-2)] text-left text-xs text-[var(--a-text-faint)]">
                <tr>
                  <th className="px-4 py-3 font-semibold">When</th>
                  <th className="px-4 py-3 font-semibold">Child</th>
                  <th className="px-4 py-3 font-semibold">Parent</th>
                  <th className="px-4 py-3 font-semibold">Program</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Notifications</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--a-border)]">
                {loading && rows.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-[var(--a-text-muted)]">Loading…</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-[var(--a-text-muted)]">No trial appointments match these filters.</td></tr>
                ) : (
                  rows.map((a) => (
                    <tr key={a.id} onClick={() => setOpenId(a.id)} className="cursor-pointer hover:bg-[var(--a-nav-hover)] transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-medium text-[var(--a-text)]">{formatDhakaDate(a.startAt)}</div>
                        <div className="text-xs text-[var(--a-text-muted)]">{formatDhakaTime(a.startAt)} – {formatDhakaTime(a.endAt)}</div>
                      </td>
                      <td className="px-4 py-3">{a.childName} <span className="text-[var(--a-text-faint)]">({a.childAge})</span></td>
                      <td className="px-4 py-3">
                        <div>{a.parentName}</div>
                        <div className="text-xs text-[var(--a-text-muted)]">{a.parentPhone ?? a.parentEmail}</div>
                      </td>
                      <td className="px-4 py-3 max-w-[14rem] truncate" title={a.program}>{a.program}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-start gap-1">
                          <StatusBadge status={a.status} />
                          {a.outsideAvailability && <span className="text-[11px] font-semibold text-[var(--a-warning-text)]">Outside availability</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3"><NotificationDot a={a} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 pb-4">
            <p className="text-xs text-[var(--a-text-faint)] pt-3">{total} appointment{total === 1 ? "" : "s"}</p>
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </div>
        </Card>
      ) : (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <button className="px-3 py-1.5 rounded-lg border border-[var(--a-border)] text-sm" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month">‹</button>
            <h3 className="font-semibold text-[var(--a-text)]">{monthTitle(month)}</h3>
            <button className="px-3 py-1.5 rounded-lg border border-[var(--a-border)] text-sm" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Next month">›</button>
          </div>
          <div className="grid grid-cols-7 gap-px bg-[var(--a-border)] border border-[var(--a-border)] rounded-lg overflow-hidden text-xs">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="bg-[var(--a-surface-2)] px-2 py-1.5 font-semibold text-[var(--a-text-faint)] text-center">{d}</div>
            ))}
            {cells.map((date, i) =>
              date ? (
                <div key={date} className={`bg-[var(--a-surface)] min-h-[88px] p-1.5 ${date === todayDhakaDateStr() ? "ring-1 ring-inset ring-[var(--a-accent)]" : ""}`}>
                  <div className="text-[var(--a-text-muted)] font-medium mb-1">{Number(date.slice(8, 10))}</div>
                  <div className="space-y-1">
                    {(byDay.get(date) ?? []).map((a) => (
                      <button
                        key={a.id}
                        onClick={() => setOpenId(a.id)}
                        title={`${a.childName} · ${a.parentName}`}
                        className={`w-full text-left truncate rounded px-1.5 py-0.5 ${
                          a.status === "CANCELLED"
                            ? "bg-[var(--a-surface-3)] text-[var(--a-text-faint)] line-through"
                            : a.outsideAvailability
                              ? "bg-[var(--a-warning-bg)] text-[var(--a-warning-text)]"
                              : "bg-[var(--a-info-bg)] text-[var(--a-info)]"
                        }`}
                      >
                        {formatDhakaTime(a.startAt)} {a.childName}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div key={`b${i}`} className="bg-[var(--a-surface-2)]" />
              ),
            )}
          </div>
          {loading && <p className="text-xs text-[var(--a-text-muted)] mt-2">Loading…</p>}
          {!loading && rows.length === 0 && <p className="text-sm text-[var(--a-text-muted)] mt-3">No trial classes in {monthTitle(month)}.</p>}
        </Card>
      )}

      {openId && <AppointmentDetailModal id={openId} onClose={() => setOpenId(null)} onChanged={() => { onChanged(); void load(); }} />}
      {scheduling && (
        <ScheduleTrialModal
          onClose={() => setScheduling(false)}
          onCreated={(id) => {
            onChanged();
            void load();
            setOpenId(id);
          }}
        />
      )}
    </div>
  );
}
