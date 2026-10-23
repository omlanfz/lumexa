// FILE PATH: client/app/admin/trial-classes/AppointmentModals.tsx
//
// Schedule-on-behalf, reschedule and cancel dialogs. All three call the same
// backend rules as the public form; destructive actions state exactly who will
// be emailed, and reschedule/cancel report which slots they freed or took.

"use client";

import { useState } from "react";
import api from "@/lib/axios";
import { Modal, formatDhakaDateTime, formatDhakaTime } from "@/components/admin/AdminUI";
import { ALL_PROGRAMS, trialSubjectLabel } from "@/lib/programs";
import SlotChooser from "./SlotChooser";
import { AvailabilityChanges, TrialAppointment, errMessage } from "./types";
import { dangerBtn, inputCls, labelCls, primaryBtn, secondaryBtn } from "./ui";

const NOT_SURE = "Not sure yet, help me choose";
const PROGRAM_OPTIONS = [...ALL_PROGRAMS.map(trialSubjectLabel), NOT_SURE];

// ─── Availability change summary ────────────────────────────────────────────

export function AvailabilityChangeSummary({ changes }: { changes: AvailabilityChanges }) {
  const list = (slots: string[]) => (slots.length ? slots.map((s) => formatDhakaDateTime(s)).join(" · ") : "none");
  return (
    <div className="rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] p-3 text-sm space-y-1.5">
      <p className="font-semibold text-[var(--a-text)]">Effect on parent-bookable availability</p>
      <p className="text-[var(--a-text-muted)]">
        <span className="font-medium text-[var(--a-success-text)]">Now bookable:</span> {list(changes.nowBookable)}
      </p>
      <p className="text-[var(--a-text-muted)]">
        <span className="font-medium text-[var(--a-warning-text)]">No longer bookable:</span> {list(changes.noLongerBookable)}
      </p>
    </div>
  );
}

// ─── Schedule on behalf of a parent ─────────────────────────────────────────

export function ScheduleTrialModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [form, setForm] = useState({
    parentName: "",
    parentEmail: "",
    parentPhone: "",
    childName: "",
    childAge: "",
    subject: "",
    message: "",
    adminNotes: "",
    whatsappConsent: false,
  });
  const [slot, setSlot] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (!slot) return setError("Choose a date and time first.");
    setSaving(true);
    setError(null);
    try {
      const res = await api.post("/admin/trial/appointments", {
        parentName: form.parentName,
        parentEmail: form.parentEmail,
        parentPhone: form.parentPhone,
        childName: form.childName,
        childAge: Number(form.childAge),
        subject: form.subject,
        message: form.message || undefined,
        adminNotes: form.adminNotes || undefined,
        whatsappConsent: form.whatsappConsent,
        startAt: slot,
      });
      onCreated(res.data.id);
      onClose();
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Schedule a trial class" onClose={onClose} wide>
      <div className="space-y-4">
        <p className="text-sm text-[var(--a-text-muted)]">
          Books a confirmed trial on a parent&apos;s behalf. The same availability, 30-minute session and 30-minute gap rules
          apply, and the parent is emailed a confirmation.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Parent name</label>
            <input className={inputCls} value={form.parentName} onChange={set("parentName")} />
          </div>
          <div>
            <label className={labelCls}>Parent email</label>
            <input type="email" className={inputCls} value={form.parentEmail} onChange={set("parentEmail")} />
          </div>
          <div>
            <label className={labelCls}>WhatsApp / phone</label>
            <input className={inputCls} value={form.parentPhone} onChange={set("parentPhone")} placeholder="01712 345678 or +44…" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className={labelCls}>Child name</label>
              <input className={inputCls} value={form.childName} onChange={set("childName")} />
            </div>
            <div>
              <label className={labelCls}>Age (6–18)</label>
              <input type="number" min={6} max={18} className={inputCls} value={form.childAge} onChange={set("childAge")} />
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Program interest</label>
            <select className={inputCls} value={form.subject} onChange={set("subject")}>
              <option value="">Select…</option>
              {PROGRAM_OPTIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Parent&apos;s message (optional)</label>
            <textarea rows={2} maxLength={500} className={inputCls} value={form.message} onChange={set("message")} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Internal notes (optional, never sent to the parent)</label>
            <textarea rows={2} maxLength={2000} className={inputCls} value={form.adminNotes} onChange={set("adminNotes")} />
          </div>
        </div>

        <label className="flex items-start gap-2 text-sm text-[var(--a-text)]">
          <input
            type="checkbox"
            className="mt-1"
            checked={form.whatsappConsent}
            onChange={(e) => setForm((f) => ({ ...f, whatsappConsent: e.target.checked }))}
          />
          <span>The parent agreed to receive the trial confirmation and reminder on WhatsApp.</span>
        </label>

        <SlotChooser value={slot} onChange={setSlot} />
        {slot && (
          <p className="text-sm text-[var(--a-text)]">
            Selected: <strong>{formatDhakaDateTime(slot)}</strong> (Bangladesh time)
          </p>
        )}
        {error && <p role="alert" className="text-sm text-[var(--a-danger)]">{error}</p>}
        <div className="flex justify-end gap-2">
          <button className={secondaryBtn} onClick={onClose}>Cancel</button>
          <button className={primaryBtn} disabled={saving} onClick={submit}>
            {saving ? "Booking…" : "Book trial & email parent"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Reschedule ─────────────────────────────────────────────────────────────

export function RescheduleModal({
  appointment,
  onClose,
  onDone,
}: {
  appointment: TrialAppointment;
  onClose: () => void;
  onDone: () => void;
}) {
  const [slot, setSlot] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AvailabilityChanges | null>(null);

  const submit = async () => {
    if (!slot) return setError("Choose the new date and time.");
    setSaving(true);
    setError(null);
    try {
      const res = await api.post(`/admin/trial/appointments/${appointment.id}/reschedule`, {
        startAt: slot,
        reason: reason || undefined,
      });
      setResult(res.data.availabilityChanges);
      onDone();
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (result) {
    return (
      <Modal title="Trial rescheduled" onClose={onClose}>
        <div className="space-y-4">
          <p className="text-sm text-[var(--a-text)]">
            Moved to <strong>{formatDhakaDateTime(slot)}</strong>. {appointment.parentName} has been emailed the new time, and
            their WhatsApp reminder was re-scheduled for it.
          </p>
          <AvailabilityChangeSummary changes={result} />
          <div className="flex justify-end">
            <button className={primaryBtn} onClick={onClose}>Done</button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Reschedule trial class" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-[var(--a-text-muted)]">
          {appointment.childName} (parent {appointment.parentName}) is currently booked for{" "}
          <strong className="text-[var(--a-text)]">{formatDhakaDateTime(appointment.startAt)}</strong>. The parent will be
          emailed the updated time. The same availability and 30-minute-gap rules apply.
        </p>
        <SlotChooser value={slot} onChange={setSlot} excludeId={appointment.id} />
        <div>
          <label className={labelCls}>Reason (optional, kept in the audit trail)</label>
          <input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
        </div>
        {slot && (
          <p className="text-sm text-[var(--a-text)]">
            New time: <strong>{formatDhakaDateTime(slot)}</strong> – {formatDhakaTime(new Date(new Date(slot).getTime() + 30 * 60_000))}
          </p>
        )}
        {error && <p role="alert" className="text-sm text-[var(--a-danger)]">{error}</p>}
        <div className="flex justify-end gap-2">
          <button className={secondaryBtn} onClick={onClose}>Keep current time</button>
          <button className={primaryBtn} disabled={saving || !slot} onClick={submit}>
            {saving ? "Rescheduling…" : "Reschedule & email parent"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Cancel ─────────────────────────────────────────────────────────────────

export function CancelModal({
  appointment,
  onClose,
  onDone,
}: {
  appointment: TrialAppointment;
  onClose: () => void;
  onDone: () => void;
}) {
  const [reason, setReason] = useState("");
  const [parentNote, setParentNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AvailabilityChanges | null>(null);

  const submit = async () => {
    if (reason.trim().length < 3) return setError("Please give a reason (kept in the audit trail).");
    setSaving(true);
    setError(null);
    try {
      const res = await api.post(`/admin/trial/appointments/${appointment.id}/cancel`, {
        reason: reason.trim(),
        parentNote: parentNote.trim() || undefined,
      });
      setResult(res.data.availabilityChanges);
      onDone();
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (result) {
    return (
      <Modal title="Trial cancelled" onClose={onClose}>
        <div className="space-y-4">
          <p className="text-sm text-[var(--a-text)]">
            The trial was cancelled and {appointment.parentName} has been emailed a cancellation notice. Pending WhatsApp
            messages for it were stopped.
          </p>
          <AvailabilityChangeSummary changes={result} />
          <div className="flex justify-end">
            <button className={primaryBtn} onClick={onClose}>Done</button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Cancel trial class" onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-lg border border-[var(--a-danger)]/40 bg-[var(--a-danger-bg)] p-3 text-sm text-[var(--a-danger-text)]">
          This cancels <strong>{appointment.childName}</strong>&apos;s trial on{" "}
          <strong>{formatDhakaDateTime(appointment.startAt)}</strong> and emails {appointment.parentEmail}. It can&apos;t be
          undone, though the family can book a new time.
        </div>
        <div>
          <label className={labelCls}>Reason (internal, audit trail)</label>
          <textarea rows={2} className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
        </div>
        <div>
          <label className={labelCls}>Note to the parent (optional, shown in the email)</label>
          <textarea rows={2} className={inputCls} value={parentNote} onChange={(e) => setParentNote(e.target.value)} maxLength={500} />
        </div>
        {error && <p role="alert" className="text-sm text-[var(--a-danger)]">{error}</p>}
        <div className="flex justify-end gap-2">
          <button className={secondaryBtn} onClick={onClose}>Keep trial</button>
          <button className={dangerBtn} disabled={saving} onClick={submit}>
            {saving ? "Cancelling…" : "Cancel trial & email parent"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
