// FILE PATH: client/app/admin/trial-classes/AppointmentDetailModal.tsx
//
// Full detail for one trial appointment: who/when, the parent's message,
// internal notes, delivery status of every email and WhatsApp message, and
// the audit trail — plus reschedule / cancel.

"use client";

import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { Modal, StatusBadge, formatDhakaDate, formatDhakaDateTime, formatDhakaTime } from "@/components/admin/AdminUI";
import { CancelModal, RescheduleModal } from "./AppointmentModals";
import { KIND_LABELS, TrialAppointment, errMessage } from "./types";
import { inputCls, labelCls, primaryBtn, secondaryBtn, smallBtn, dangerBtn } from "./ui";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-3 py-1.5">
      <dt className="sm:w-40 flex-shrink-0 text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)]">{label}</dt>
      <dd className="text-sm text-[var(--a-text)] break-words min-w-0">{children}</dd>
    </div>
  );
}

export default function AppointmentDetailModal({
  id,
  onClose,
  onChanged,
}: {
  id: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [a, setA] = useState<TrialAppointment | null>(null);
  // Whether the session is still ahead of us, decided when the data loads.
  const [upcoming, setUpcoming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [notesSaved, setNotesSaved] = useState(false);
  const [dialog, setDialog] = useState<"reschedule" | "cancel" | null>(null);
  const [retryMsg, setRetryMsg] = useState<string | null>(null);

  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    let cancelled = false;
    api
      .get<TrialAppointment>(`/admin/trial/appointments/${id}`)
      .then((res) => {
        if (cancelled) return;
        setA(res.data);
        setUpcoming(res.data.status === "CONFIRMED" && new Date(res.data.endAt).getTime() > Date.now());
        setNotes(res.data.adminNotes ?? "");
      })
      .catch((err) => {
        if (!cancelled) setError(errMessage(err, "Could not load this appointment."));
      });
    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  const changed = () => {
    reload();
    onChanged();
  };

  const saveNotes = async () => {
    try {
      await api.patch(`/admin/trial/appointments/${id}/notes`, { adminNotes: notes });
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000);
      onChanged();
    } catch (err) {
      setError(errMessage(err));
    }
  };

  const retryWhatsApp = async () => {
    try {
      const res = await api.post(`/admin/trial/appointments/${id}/whatsapp/retry`);
      setRetryMsg(res.data.revived > 0 ? `Retrying ${res.data.revived} message(s)…` : "Nothing to retry.");
      setTimeout(reload, 2500);
    } catch (err) {
      setRetryMsg(errMessage(err));
    }
  };

  if (error && !a) {
    return (
      <Modal title="Trial appointment" onClose={onClose}>
        <p className="text-sm text-[var(--a-danger)]">{error}</p>
      </Modal>
    );
  }
  if (!a) {
    return (
      <Modal title="Trial appointment" onClose={onClose}>
        <p className="text-sm text-[var(--a-text-muted)]">Loading…</p>
      </Modal>
    );
  }

  const hasFailedWhatsApp = a.notifications.whatsapp.some((w) => w.status === "FAILED" && !w.willRetry);

  return (
    <>
      <Modal title={`Trial class · ${a.childName}`} onClose={onClose} wide>
        <div className="space-y-6">
          {/* Status + actions */}
          <div className="flex flex-wrap items-center gap-2 justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={a.status} />
              {a.outsideAvailability && (
                <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--a-warning-bg)] text-[var(--a-warning-text)]">
                  Outside current availability
                </span>
              )}
              <span className="text-xs text-[var(--a-text-faint)]">Ref {a.reference}</span>
            </div>
            {upcoming && (
              <div className="flex gap-2">
                <button className={secondaryBtn} onClick={() => setDialog("reschedule")}>Reschedule</button>
                <button className={dangerBtn} onClick={() => setDialog("cancel")}>Cancel trial</button>
              </div>
            )}
          </div>

          {a.outsideAvailability && (
            <p className="rounded-lg bg-[var(--a-warning-bg)] text-[var(--a-warning-text)] text-sm p-3">
              The availability this booking was made under has since changed. The booking is still confirmed — reschedule or
              cancel it explicitly if the time no longer works.
            </p>
          )}

          <dl className="divide-y divide-[var(--a-border)]">
            <Row label="When">
              <strong>{formatDhakaDate(a.startAt)}</strong>, {formatDhakaTime(a.startAt)} – {formatDhakaTime(a.endAt)}{" "}
              <span className="text-[var(--a-text-muted)]">({a.timezoneLabel} · 30 min)</span>
            </Row>
            <Row label="Parent">{a.parentName}</Row>
            <Row label="Email"><a className="text-[var(--a-accent)] underline" href={`mailto:${a.parentEmail}`}>{a.parentEmail}</a></Row>
            <Row label="WhatsApp">
              {a.parentPhone ? (
                <>
                  <a className="text-[var(--a-accent)] underline" href={`https://wa.me/${a.parentPhone.replace(/^\+/, "")}`} target="_blank" rel="noopener noreferrer">
                    {a.parentPhone}
                  </a>{" "}
                  <span className="text-xs text-[var(--a-text-muted)]">
                    {a.whatsappConsent ? "· agreed to WhatsApp trial messages" : "· did not opt in to WhatsApp messages"}
                  </span>
                </>
              ) : (
                "—"
              )}
            </Row>
            <Row label="Child">{a.childName}, age {a.childAge}</Row>
            <Row label="Program interest">{a.program}</Row>
            <Row label="Parent’s message">{a.message ? <span className="whitespace-pre-wrap">{a.message}</span> : <span className="text-[var(--a-text-faint)]">none</span>}</Row>
            <Row label="Booked">
              {formatDhakaDateTime(a.createdAt)} by {a.bookedBy === "ADMIN" ? "an admin" : "the parent"}
              {a.rescheduleCount > 0 && ` · rescheduled ${a.rescheduleCount}×`}
              {a.parentTimezone && <span className="text-[var(--a-text-faint)]"> · parent’s time zone {a.parentTimezone}</span>}
            </Row>
            {a.status === "CANCELLED" && (
              <Row label="Cancelled">
                {formatDhakaDateTime(a.cancelledAt)}
                {a.cancelReason && <> — {a.cancelReason}</>}
              </Row>
            )}
          </dl>

          {/* Notes */}
          <div>
            <label className={labelCls}>Internal notes (never shown to the parent)</label>
            <textarea rows={3} maxLength={2000} className={inputCls} value={notes} onChange={(e) => { setNotes(e.target.value); setNotesSaved(false); }} />
            <div className="flex items-center gap-3 mt-2">
              <button className={primaryBtn} onClick={saveNotes} disabled={notes === (a.adminNotes ?? "")}>Save notes</button>
              {notesSaved && <span className="text-xs text-[var(--a-success-text)]">Saved</span>}
            </div>
          </div>

          {/* Notifications */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-[var(--a-text)]">Notifications</h4>
              {hasFailedWhatsApp && upcoming && (
                <button className={smallBtn} onClick={retryWhatsApp}>Retry failed WhatsApp</button>
              )}
            </div>
            {retryMsg && <p className="text-xs text-[var(--a-text-muted)] mb-2">{retryMsg}</p>}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-[var(--a-text-faint)]">
                    <th className="py-1 pr-3 font-semibold">Message</th>
                    <th className="py-1 pr-3 font-semibold">Channel</th>
                    <th className="py-1 pr-3 font-semibold">Status</th>
                    <th className="py-1 font-semibold">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--a-border)]">
                  {a.notifications.emails.map((n, i) => (
                    <tr key={`e${i}`}>
                      <td className="py-1.5 pr-3">{KIND_LABELS[n.kind] ?? n.kind}</td>
                      <td className="py-1.5 pr-3">Email</td>
                      <td className="py-1.5 pr-3"><StatusBadge status={n.status} /></td>
                      <td className="py-1.5 text-xs text-[var(--a-text-muted)]">
                        {n.status === "SENT" && n.sentAt ? `Sent ${formatDhakaDateTime(n.sentAt)}` : n.lastError ? `${n.lastError} (attempt ${n.attempts})` : n.status === "PENDING" ? "Sending…" : "—"}
                      </td>
                    </tr>
                  ))}
                  {a.notifications.whatsapp.map((n) => (
                    <tr key={n.id}>
                      <td className="py-1.5 pr-3">{KIND_LABELS[n.kind] ?? n.kind}</td>
                      <td className="py-1.5 pr-3">WhatsApp</td>
                      <td className="py-1.5 pr-3"><StatusBadge status={n.status} /></td>
                      <td className="py-1.5 text-xs text-[var(--a-text-muted)]">
                        {n.status === "SENT" && n.sentAt
                          ? `Sent ${formatDhakaDateTime(n.sentAt)}`
                          : n.status === "PENDING"
                            ? `Scheduled for ${formatDhakaDateTime(n.scheduledFor)}`
                            : n.status === "FAILED"
                              ? `${n.errorCode ? `[${n.errorCode}] ` : ""}${n.lastError ?? "Failed"}${n.willRetry ? " — will retry" : ""}`
                              : n.lastError ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* History */}
          {a.history && a.history.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-[var(--a-text)] mb-2">History</h4>
              <ul className="space-y-1.5">
                {a.history.map((h) => (
                  <li key={h.id} className="text-xs text-[var(--a-text-muted)]">
                    <span className="font-medium text-[var(--a-text)]">{formatDhakaDateTime(h.createdAt)}</span> ·{" "}
                    {h.action.replace(/^TRIAL_/, "").replace(/_/g, " ").toLowerCase()}
                    {h.actorRole && ` (${h.actorRole.toLowerCase()})`}
                    {h.reason && <> — {h.reason}</>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {error && <p className="text-sm text-[var(--a-danger)]">{error}</p>}
        </div>
      </Modal>

      {dialog === "reschedule" && (
        <RescheduleModal appointment={a} onClose={() => setDialog(null)} onDone={changed} />
      )}
      {dialog === "cancel" && <CancelModal appointment={a} onClose={() => setDialog(null)} onDone={changed} />}
    </>
  );
}
