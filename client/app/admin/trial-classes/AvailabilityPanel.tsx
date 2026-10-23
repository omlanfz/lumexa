// FILE PATH: client/app/admin/trial-classes/AvailabilityPanel.tsx
//
// Admin configuration of when parents can book a trial:
//   • weekly recurring windows (several per weekday, optional effective dates)
//   • one-off windows on a single date
//   • blocked dates / hours (holidays, unavailability)
//   • a live preview of exactly what parents can book
//
// Editing or deleting availability, or adding a block, first asks the server
// (dryRun) which already-booked trials would end up outside availability. If
// any, an explicit warning lists them — they are NEVER cancelled or removed
// automatically; they stay confirmed and are flagged for the admin to
// reschedule or cancel one by one.

"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/axios";
import { Card, Modal, WEEKDAY_NAMES, formatDhakaDateTime, formatDhakaTime, todayDhakaDateStr } from "@/components/admin/AdminUI";
import {
  AffectedAppointment,
  AvailabilityConfig,
  AvailabilityDay,
  Block,
  OneOffWindow,
  Rule,
  errMessage,
  timeLabel,
  timeOptions,
} from "./types";
import { dangerBtn, inputCls, labelCls, primaryBtn, secondaryBtn, smallBtn } from "./ui";

class UserCancelled extends Error {}

type Kind = "rules" | "windows" | "blocks";
interface Req {
  method: "post" | "put" | "delete";
  url: string;
  data?: unknown;
  /** Ask the server what this would strand before applying it. */
  checkImpact: boolean;
}

interface Impact {
  affected: AffectedAppointment[];
  confirm: () => void;
  cancel: () => void;
}

const START_OPTIONS = timeOptions("start");
const END_OPTIONS = timeOptions("end");

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}
function dayLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(
    new Date(Date.UTC(y, m - 1, d)),
  );
}

function TimeSelect({ value, onChange, kind }: { value: string; onChange: (v: string) => void; kind: "start" | "end" }) {
  return (
    <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value)}>
      {(kind === "start" ? START_OPTIONS : END_OPTIONS).map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function ModalActions({ onClose, saving, label, onSave }: { onClose: () => void; saving: boolean; label: string; onSave: () => void }) {
  return (
    <div className="flex justify-end gap-2 pt-1">
      <button className={secondaryBtn} onClick={onClose}>Cancel</button>
      <button className={primaryBtn} disabled={saving} onClick={onSave}>{saving ? "Saving…" : label}</button>
    </div>
  );
}

// ─── Forms ──────────────────────────────────────────────────────────────────

function RuleModal({ rule, onClose, run, hidden }: { rule: Rule | null; onClose: () => void; run: (r: Req) => Promise<void>; hidden: boolean }) {
  const [days, setDays] = useState<number[]>(rule ? [rule.weekday] : []);
  const [start, setStart] = useState(rule?.startTime ?? "15:00");
  const [end, setEnd] = useState(rule?.endTime ?? "19:00");
  const [from, setFrom] = useState(rule?.effectiveFrom ?? "");
  const [until, setUntil] = useState(rule?.effectiveUntil ?? "");
  const [note, setNote] = useState(rule?.note ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (days.length === 0) return setError("Choose at least one weekday.");
    setSaving(true);
    setError(null);
    try {
      for (const weekday of days) {
        const body = { weekday, startTime: start, endTime: end, effectiveFrom: from || undefined, effectiveUntil: until || undefined, note: note || undefined };
        await run(
          rule
            ? { method: "put", url: `/admin/trial/availability/rules/${rule.id}`, data: body, checkImpact: true }
            : { method: "post", url: "/admin/trial/availability/rules", data: body, checkImpact: false },
        );
      }
      onClose();
    } catch (err) {
      if (!(err instanceof UserCancelled)) setError(errMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={rule ? "Edit weekly window" : "Add weekly window"} onClose={onClose} hidden={hidden}>
      <div className="space-y-4">
        <div>
          <label className={labelCls}>{rule ? "Weekday" : "Weekdays"}</label>
          <div className="flex flex-wrap gap-2">
            {WEEKDAY_NAMES.map((name, i) => (
              <label key={name} className={`px-3 py-1.5 rounded-lg border text-sm cursor-pointer ${days.includes(i) ? "bg-[var(--a-accent)] border-[var(--a-accent)] text-white" : "border-[var(--a-border)] text-[var(--a-text)]"}`}>
                <input
                  type={rule ? "radio" : "checkbox"}
                  className="sr-only"
                  checked={days.includes(i)}
                  onChange={() => setDays(rule ? [i] : days.includes(i) ? days.filter((d) => d !== i) : [...days, i])}
                />
                {name.slice(0, 3)}
              </label>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>From</label><TimeSelect kind="start" value={start} onChange={setStart} /></div>
          <div><label className={labelCls}>Until</label><TimeSelect kind="end" value={end} onChange={setEnd} /></div>
        </div>
        <p className="text-xs text-[var(--a-text-muted)]">
          Start times are every 30 minutes. The last start leaves room for the full 30-minute session (a 2:00–8:00 PM window ends with a 7:30 PM start). You can add several windows on the same day.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>Effective from (optional)</label><input type="date" className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><label className={labelCls}>Effective until (optional)</label><input type="date" className={inputCls} value={until} onChange={(e) => setUntil(e.target.value)} /></div>
        </div>
        <div><label className={labelCls}>Note (optional)</label><input className={inputCls} value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} /></div>
        {error && <p role="alert" className="text-sm text-[var(--a-danger)]">{error}</p>}
        <ModalActions onClose={onClose} saving={saving} label={rule ? "Save changes" : "Add window"} onSave={save} />
      </div>
    </Modal>
  );
}

function WindowModal({ item, onClose, run, hidden }: { item: OneOffWindow | null; onClose: () => void; run: (r: Req) => Promise<void>; hidden: boolean }) {
  const [date, setDate] = useState(item?.date ?? "");
  const [start, setStart] = useState(item?.startTime ?? "10:00");
  const [end, setEnd] = useState(item?.endTime ?? "14:00");
  const [note, setNote] = useState(item?.note ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!date) return setError("Choose a date.");
    setSaving(true);
    setError(null);
    try {
      const body = { date, startTime: start, endTime: end, note: note || undefined };
      await run(
        item
          ? { method: "put", url: `/admin/trial/availability/windows/${item.id}`, data: body, checkImpact: true }
          : { method: "post", url: "/admin/trial/availability/windows", data: body, checkImpact: false },
      );
      onClose();
    } catch (err) {
      if (!(err instanceof UserCancelled)) setError(errMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={item ? "Edit one-off window" : "Add one-off window"} onClose={onClose} hidden={hidden}>
      <div className="space-y-4">
        <div><label className={labelCls}>Date</label><input type="date" className={inputCls} value={date} min={todayDhakaDateStr()} onChange={(e) => setDate(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>From</label><TimeSelect kind="start" value={start} onChange={setStart} /></div>
          <div><label className={labelCls}>Until</label><TimeSelect kind="end" value={end} onChange={setEnd} /></div>
        </div>
        <div><label className={labelCls}>Note (optional)</label><input className={inputCls} value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} /></div>
        {error && <p role="alert" className="text-sm text-[var(--a-danger)]">{error}</p>}
        <ModalActions onClose={onClose} saving={saving} label={item ? "Save changes" : "Add window"} onSave={save} />
      </div>
    </Modal>
  );
}

function BlockModal({ item, onClose, run, hidden }: { item: Block | null; onClose: () => void; run: (r: Req) => Promise<void>; hidden: boolean }) {
  const [startDate, setStartDate] = useState(item?.startDate ?? "");
  const [endDate, setEndDate] = useState(item?.endDate ?? "");
  const [wholeDay, setWholeDay] = useState(item ? item.startTime === null : true);
  const [start, setStart] = useState(item?.startTime ?? "09:00");
  const [end, setEnd] = useState(item?.endTime ?? "12:00");
  const [reason, setReason] = useState(item?.reason ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!startDate) return setError("Choose the first date to block.");
    setSaving(true);
    setError(null);
    try {
      const body = {
        startDate,
        endDate: endDate || startDate,
        startTime: wholeDay ? undefined : start,
        endTime: wholeDay ? undefined : end,
        reason,
      };
      await run(
        item
          ? { method: "put", url: `/admin/trial/availability/blocks/${item.id}`, data: body, checkImpact: true }
          : { method: "post", url: "/admin/trial/availability/blocks", data: body, checkImpact: true },
      );
      onClose();
    } catch (err) {
      if (!(err instanceof UserCancelled)) setError(errMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={item ? "Edit blocked period" : "Block dates"} onClose={onClose} hidden={hidden}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>From date</label><input type="date" className={inputCls} value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
          <div><label className={labelCls}>To date (optional)</label><input type="date" className={inputCls} value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} /></div>
        </div>
        <label className="flex items-center gap-2 text-sm text-[var(--a-text)]">
          <input type="checkbox" checked={wholeDay} onChange={(e) => setWholeDay(e.target.checked)} /> Block the whole day
        </label>
        {!wholeDay && (
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Blocked from</label><TimeSelect kind="start" value={start} onChange={setStart} /></div>
            <div><label className={labelCls}>Blocked until</label><TimeSelect kind="end" value={end} onChange={setEnd} /></div>
          </div>
        )}
        <div><label className={labelCls}>Reason</label><input className={inputCls} value={reason} maxLength={200} placeholder="e.g. Eid holiday" onChange={(e) => setReason(e.target.value)} /></div>
        {error && <p role="alert" className="text-sm text-[var(--a-danger)]">{error}</p>}
        <ModalActions onClose={onClose} saving={saving} label={item ? "Save changes" : "Block dates"} onSave={save} />
      </div>
    </Modal>
  );
}

// ─── Panel ──────────────────────────────────────────────────────────────────

type ModalState =
  | { type: "rule"; item: Rule | null }
  | { type: "window"; item: OneOffWindow | null }
  | { type: "block"; item: Block | null }
  | null;

export default function AvailabilityPanel({ onChanged }: { onChanged: () => void }) {
  const [config, setConfig] = useState<AvailabilityConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [impact, setImpact] = useState<Impact | null>(null);
  const [toDelete, setToDelete] = useState<{ kind: Kind; id: string; label: string } | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [previewStart, setPreviewStart] = useState(() => todayDhakaDateStr());
  const [preview, setPreview] = useState<AvailabilityDay[] | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState(0);

  const loadConfig = useCallback(async () => {
    try {
      const res = await api.get<AvailabilityConfig>("/admin/trial/availability");
      setConfig(res.data);
      setError(null);
    } catch (err) {
      setError(errMessage(err, "Could not load availability."));
    }
  }, []);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    let cancelled = false;
    setPreview(null);
    setPreviewError(null);
    api
      .get("/admin/trial/availability/preview", { params: { from: previewStart, to: addDays(previewStart, 13) } })
      .then((res) => !cancelled && setPreview(res.data.days))
      .catch((err) => !cancelled && setPreviewError(errMessage(err, "Could not load the preview.")));
    return () => {
      cancelled = true;
    };
  }, [previewStart, previewKey]);

  const refreshAll = useCallback(async () => {
    await loadConfig();
    setPreviewKey((k) => k + 1);
    onChanged();
  }, [loadConfig, onChanged]);

  /** Applies a change, pausing for explicit admin confirmation if it would strand bookings. */
  const run = useCallback(
    async (req: Req): Promise<void> => {
      if (req.checkImpact) {
        const dry = await api.request({ method: req.method, url: req.url, data: req.data, params: { dryRun: true } });
        const affected: AffectedAppointment[] = dry.data?.affected ?? [];
        if (affected.length > 0) {
          await new Promise<void>((resolve, reject) => {
            setImpact({
              affected,
              confirm: () => {
                setImpact(null);
                api
                  .request({ method: req.method, url: req.url, data: req.data, params: { confirmAffected: true } })
                  .then(() => resolve())
                  .catch(reject);
              },
              cancel: () => {
                setImpact(null);
                reject(new UserCancelled());
              },
            });
          });
          await refreshAll();
          return;
        }
      }
      await api.request({ method: req.method, url: req.url, data: req.data });
      await refreshAll();
    },
    [refreshAll],
  );

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await run({
        method: "delete",
        url: `/admin/trial/availability/${toDelete.kind}/${toDelete.id}`,
        checkImpact: toDelete.kind !== "blocks",
      });
      setToDelete(null);
    } catch (err) {
      if (!(err instanceof UserCancelled)) setDeleteError(errMessage(err));
      else setToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  if (error) return <p role="alert" className="text-sm text-[var(--a-danger)]">{error}</p>;
  if (!config) return <p className="text-sm text-[var(--a-text-muted)]">Loading…</p>;

  const rulesByDay = WEEKDAY_NAMES.map((name, i) => ({ name, i, rules: config.rules.filter((r) => r.weekday === i) }));

  return (
    <div className="space-y-6">
      {/* Weekly */}
      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold text-[var(--a-text)]">Weekly availability</h2>
            <p className="text-xs text-[var(--a-text-muted)]">Repeats every week · Bangladesh Time · start times every 30 minutes</p>
          </div>
          <button className={primaryBtn} onClick={() => setModal({ type: "rule", item: null })}>+ Add weekly window</button>
        </div>
        <div className="divide-y divide-[var(--a-border)]">
          {rulesByDay.map(({ name, i, rules }) => (
            <div key={i} className="flex flex-col sm:flex-row sm:items-start gap-2 py-2.5">
              <div className="sm:w-28 font-medium text-sm text-[var(--a-text)] pt-1">{name}</div>
              <div className="flex-1 flex flex-wrap gap-2">
                {rules.length === 0 ? (
                  <span className="text-sm text-[var(--a-text-faint)] pt-1">Closed</span>
                ) : (
                  rules.map((r) => (
                    <div key={r.id} className="inline-flex items-center gap-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] pl-3 pr-1.5 py-1 text-sm">
                      <span className="text-[var(--a-text)]">{timeLabel(r.startTime)} – {timeLabel(r.endTime)}</span>
                      {(r.effectiveFrom || r.effectiveUntil) && (
                        <span className="text-xs text-[var(--a-text-muted)]">
                          {r.effectiveFrom ? `from ${r.effectiveFrom}` : ""} {r.effectiveUntil ? `until ${r.effectiveUntil}` : ""}
                        </span>
                      )}
                      <button className={smallBtn} onClick={() => setModal({ type: "rule", item: r })}>Edit</button>
                      <button className={smallBtn} onClick={() => setToDelete({ kind: "rules", id: r.id, label: `${name} ${timeLabel(r.startTime)} – ${timeLabel(r.endTime)}` })}>Delete</button>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* One-off */}
      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold text-[var(--a-text)]">One-off windows</h2>
            <p className="text-xs text-[var(--a-text-muted)]">Extra availability on a single date</p>
          </div>
          <button className={primaryBtn} onClick={() => setModal({ type: "window", item: null })}>+ Add one-off window</button>
        </div>
        {config.windows.length === 0 ? (
          <p className="text-sm text-[var(--a-text-faint)]">None.</p>
        ) : (
          <ul className="divide-y divide-[var(--a-border)]">
            {config.windows.map((w) => (
              <li key={w.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span className="text-[var(--a-text)]">
                  <strong>{dayLabel(w.date)}</strong> · {timeLabel(w.startTime)} – {timeLabel(w.endTime)}
                  {w.note && <span className="text-[var(--a-text-muted)]"> · {w.note}</span>}
                </span>
                <span className="flex gap-2">
                  <button className={smallBtn} onClick={() => setModal({ type: "window", item: w })}>Edit</button>
                  <button className={smallBtn} onClick={() => setToDelete({ kind: "windows", id: w.id, label: `${dayLabel(w.date)} ${timeLabel(w.startTime)} – ${timeLabel(w.endTime)}` })}>Delete</button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Blocks */}
      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold text-[var(--a-text)]">Blocked dates &amp; exceptions</h2>
            <p className="text-xs text-[var(--a-text-muted)]">Holidays or unavailable periods. Blocks always win over the schedule.</p>
          </div>
          <button className={primaryBtn} onClick={() => setModal({ type: "block", item: null })}>+ Block dates</button>
        </div>
        {config.blocks.length === 0 ? (
          <p className="text-sm text-[var(--a-text-faint)]">None.</p>
        ) : (
          <ul className="divide-y divide-[var(--a-border)]">
            {config.blocks.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span className="text-[var(--a-text)]">
                  <strong>{b.startDate === b.endDate ? dayLabel(b.startDate) : `${dayLabel(b.startDate)} → ${dayLabel(b.endDate)}`}</strong>
                  {b.startTime ? ` · ${timeLabel(b.startTime)} – ${timeLabel(b.endTime!)}` : " · whole day"}
                  <span className="text-[var(--a-text-muted)]"> · {b.reason}</span>
                </span>
                <span className="flex gap-2">
                  <button className={smallBtn} onClick={() => setModal({ type: "block", item: b })}>Edit</button>
                  <button className={smallBtn} onClick={() => setToDelete({ kind: "blocks", id: b.id, label: `${dayLabel(b.startDate)} (${b.reason})` })}>Delete</button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Preview */}
      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold text-[var(--a-text)]">What parents can book</h2>
            <p className="text-xs text-[var(--a-text-muted)]">
              Computed live from the settings above minus existing bookings, the 30-minute gap and the booking-notice rule — exactly what the public Trial page shows.
            </p>
          </div>
          <div className="flex gap-2">
            <button className={smallBtn} disabled={previewStart <= todayDhakaDateStr()} onClick={() => setPreviewStart(addDays(previewStart, -14))}>‹ Earlier</button>
            <button className={smallBtn} onClick={() => setPreviewStart(addDays(previewStart, 14))}>Later ›</button>
            <button className={smallBtn} onClick={() => setPreviewKey((k) => k + 1)}>Refresh</button>
          </div>
        </div>
        {previewError ? (
          <p className="text-sm text-[var(--a-danger)]">{previewError}</p>
        ) : !preview ? (
          <p className="text-sm text-[var(--a-text-muted)]">Loading…</p>
        ) : (
          <ul className="divide-y divide-[var(--a-border)]">
            {preview.map((d) => (
              <li key={d.date} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3 py-2 text-sm">
                <span className="sm:w-44 font-medium text-[var(--a-text)] flex-shrink-0">{dayLabel(d.date)}</span>
                {d.status === "available" ? (
                  <span className="flex flex-wrap gap-1.5">
                    {d.slots.map((s) => (
                      <span key={s} className="px-2 py-0.5 rounded-md bg-[var(--a-success-bg)] text-[var(--a-success-text)] text-xs font-semibold">{formatDhakaTime(s)}</span>
                    ))}
                  </span>
                ) : d.status === "full" ? (
                  <span className="text-[var(--a-warning-text)] text-xs font-semibold">Fully booked</span>
                ) : (
                  <span className="text-[var(--a-text-faint)] text-xs">Not available</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {modal?.type === "rule" && <RuleModal rule={modal.item} onClose={() => setModal(null)} run={run} hidden={!!impact} />}
      {modal?.type === "window" && <WindowModal item={modal.item} onClose={() => setModal(null)} run={run} hidden={!!impact} />}
      {modal?.type === "block" && <BlockModal item={modal.item} onClose={() => setModal(null)} run={run} hidden={!!impact} />}

      {toDelete && (
        <Modal title="Delete availability?" onClose={() => setToDelete(null)} hidden={!!impact}>
          <div className="space-y-4">
            <p className="text-sm text-[var(--a-text)]">
              Delete <strong>{toDelete.label}</strong>? Parents will no longer see those times. Existing bookings are not
              cancelled; if any would fall outside availability you&apos;ll be shown them before anything changes.
            </p>
            {deleteError && <p role="alert" className="text-sm text-[var(--a-danger)]">{deleteError}</p>}
            <div className="flex justify-end gap-2">
              <button className={secondaryBtn} onClick={() => setToDelete(null)}>Keep it</button>
              <button className={dangerBtn} disabled={deleting} onClick={confirmDelete}>{deleting ? "Deleting…" : "Delete"}</button>
            </div>
          </div>
        </Modal>
      )}

      {impact && (
        <Modal title="This will affect booked trials" onClose={impact.cancel}>
          <div className="space-y-4">
            <p className="text-sm text-[var(--a-text)]">
              <strong>{impact.affected.length}</strong> upcoming trial{impact.affected.length === 1 ? "" : "s"} would fall outside
              the availability after this change. They will <strong>not</strong> be cancelled or moved — they stay confirmed and
              are flagged &ldquo;Outside availability&rdquo; so you can reschedule or cancel each one yourself.
            </p>
            <ul className="max-h-60 overflow-y-auto divide-y divide-[var(--a-border)] rounded-lg border border-[var(--a-border)]">
              {impact.affected.map((a) => (
                <li key={a.id} className="px-3 py-2 text-sm">
                  <div className="font-medium text-[var(--a-text)]">{a.childName} <span className="text-[var(--a-text-faint)]">· parent {a.parentName}</span></div>
                  <div className="text-xs text-[var(--a-text-muted)]">{formatDhakaDateTime(a.startAt)} · ref {a.reference}</div>
                </li>
              ))}
            </ul>
            <div className="flex justify-end gap-2">
              <button className={secondaryBtn} onClick={impact.cancel}>Don&apos;t change anything</button>
              <button className={dangerBtn} onClick={impact.confirm}>Apply change anyway</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
