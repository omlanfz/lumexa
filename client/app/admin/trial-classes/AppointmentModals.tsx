// FILE PATH: client/app/admin/trial-classes/AppointmentModals.tsx
//
// Schedule-on-behalf, assign-teacher, reschedule, cancel and outcome dialogs.
// All call the same backend rules as the public form; destructive actions state
// exactly who will be emailed, and reschedule/cancel report which slots they
// freed or took. Teacher choices come from the server already marked free/busy
// for the trial's time — and the server re-checks on every save.

"use client";

import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { Modal, formatDhakaDateTime, formatDhakaTime } from "@/components/admin/AdminUI";
import { ALL_PROGRAMS, trialSubjectLabel } from "@/lib/programs";
import SlotChooser from "./SlotChooser";
import { AssignableTeacher, AvailabilityChanges, TrialAppointment, errMessage } from "./types";
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
          apply, and the parent is emailed that the time is reserved. Assign a teacher afterwards — that is what sends the parent the class link.
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
          <span>The parent agreed to receive the trial messages (confirmation, class link and reminder) on WhatsApp.</span>
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
  // The assigned teacher must be free at the NEW time; if not, pick another.
  const [teachers, setTeachers] = useState<AssignableTeacher[]>([]);
  const [teacherId, setTeacherId] = useState(appointment.teacher?.id ?? "");
  const [teachersError, setTeachersError] = useState<string | null>(null);

  useEffect(() => {
    if (!slot || !appointment.teacher) return;
    let cancelled = false;
    api
      .get<AssignableTeacher[]>("/admin/trial/teachers", { params: { trialId: appointment.id, startAt: slot } })
      .then((res) => {
        if (cancelled) return;
        setTeachersError(null);
        setTeachers(res.data);
        // keep the current teacher if free then, else make the admin choose
        const current = res.data.find((t) => t.id === appointment.teacher!.id);
        setTeacherId(current?.available ? current.id : "");
      })
      .catch((err) => {
        if (!cancelled) setTeachersError(errMessage(err, "Could not check teacher availability."));
      });
    return () => {
      cancelled = true;
    };
  }, [slot, appointment.id, appointment.teacher]);

  const submit = async () => {
    if (!slot) return setError("Choose the new date and time.");
    if (appointment.teacher && !teacherId) return setError("Choose a teacher who is free at the new time.");
    setSaving(true);
    setError(null);
    try {
      const res = await api.post(`/admin/trial/appointments/${appointment.id}/reschedule`, {
        startAt: slot,
        reason: reason || undefined,
        teacherId: appointment.teacher && teacherId !== appointment.teacher.id ? teacherId : undefined,
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
            Moved to <strong>{formatDhakaDateTime(slot)}</strong>. {appointment.parentName} has been emailed the new time
            {appointment.teacher
              ? " (with the same private class link), sent the updated details on WhatsApp, and the 1-hour reminder was re-scheduled for the new time. The teacher’s calendar now shows the new time."
              : "."}
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
          {appointment.teacher && (
            <>
              {" "}
              <strong className="text-[var(--a-text)]">{appointment.teacher.name}</strong> must be free at the new time. The
              parent&apos;s class link stays the same.
            </>
          )}
        </p>
        <SlotChooser value={slot} onChange={setSlot} excludeId={appointment.id} />
        {appointment.teacher && slot && (
          <div>
            <label className={labelCls}>Teacher at the new time</label>
            <select className={inputCls} value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
              <option value="">Select a teacher…</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id} disabled={!t.available}>
                  {t.name}
                  {t.id === appointment.teacher!.id ? " (current)" : ""}
                  {t.available ? "" : ` — ${t.busyReason ?? "busy"}`}
                </option>
              ))}
            </select>
            {teachersError && <p className="text-xs text-[var(--a-danger)] mt-1">{teachersError}</p>}
            {teacherId === "" && teachers.length > 0 && (
              <p className="text-xs text-[var(--a-warning-text)] mt-1">
                {appointment.teacher.name} is busy at that time — choose another teacher or another time.
              </p>
            )}
          </div>
        )}
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
          <button className={primaryBtn} disabled={saving || !slot || (!!appointment.teacher && !teacherId)} onClick={submit}>
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
            The trial was cancelled and {appointment.parentName} has been emailed a cancellation notice. Its pending
            WhatsApp messages and reminders were stopped, the parent&apos;s class link no longer works, and it was removed from
            the teacher&apos;s schedule.
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

// ─── Assign / change teacher ────────────────────────────────────────────────

export function AssignTeacherModal({
  appointment,
  onClose,
  onDone,
}: {
  appointment: TrialAppointment;
  onClose: () => void;
  onDone: () => void;
}) {
  const [teachers, setTeachers] = useState<AssignableTeacher[] | null>(null);
  const [teacherId, setTeacherId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ first: boolean } | null>(null);
  const changing = appointment.teacher !== null;

  useEffect(() => {
    let cancelled = false;
    api
      .get<AssignableTeacher[]>("/admin/trial/teachers", { params: { trialId: appointment.id } })
      .then((res) => {
        if (!cancelled) setTeachers(res.data);
      })
      .catch((err) => {
        if (!cancelled) setError(errMessage(err, "Could not load teachers."));
      });
    return () => {
      cancelled = true;
    };
  }, [appointment.id]);

  const submit = async () => {
    if (!teacherId) return setError("Choose a teacher.");
    setSaving(true);
    setError(null);
    try {
      const res = await api.post(`/admin/trial/appointments/${appointment.id}/teacher`, { teacherId });
      setDone({ first: !!res.data.firstAssignment });
      onDone();
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <Modal title={done.first ? "Teacher assigned" : "Teacher changed"} onClose={onClose}>
        <div className="space-y-4">
          <p className="text-sm text-[var(--a-text)]">
            {done.first ? (
              <>
                The trial is now on the teacher&apos;s schedule and upcoming classes. {appointment.parentName} is being sent the
                trial details and the private classroom link by email{appointment.whatsappConsent ? " and WhatsApp" : ""}.
                A reminder with the same link goes out one hour before the class (unless it starts within the hour).
              </>
            ) : (
              <>
                The class moved to the new teacher&apos;s schedule. The time and the parent&apos;s class link are unchanged, so the
                parent was not messaged again.
              </>
            )}
          </p>
          <div className="flex justify-end">
            <button className={primaryBtn} onClick={onClose}>Done</button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={changing ? "Change teacher" : "Assign a teacher"} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-[var(--a-text-muted)]">
          {appointment.childName}&apos;s trial is on{" "}
          <strong className="text-[var(--a-text)]">{formatDhakaDateTime(appointment.startAt)}</strong> (30 minutes). Teachers
          who already have a class, batch, booked shift or trial at that time can&apos;t be chosen.
        </p>
        <div>
          <label className={labelCls}>Teacher</label>
          {teachers === null && !error ? (
            <p className="text-sm text-[var(--a-text-muted)]">Loading teachers…</p>
          ) : (
            <select className={inputCls} value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
              <option value="">Select a teacher…</option>
              {(teachers ?? []).map((t) => (
                <option key={t.id} value={t.id} disabled={!t.available || t.id === appointment.teacher?.id}>
                  {t.name}
                  {t.id === appointment.teacher?.id ? " (current)" : ""}
                  {t.available ? "" : ` — ${t.busyReason ?? "busy"}`}
                </option>
              ))}
            </select>
          )}
        </div>
        {!changing && (
          <p className="rounded-lg bg-[var(--a-surface-2)] border border-[var(--a-border)] p-3 text-xs text-[var(--a-text-muted)]">
            Assigning sends {appointment.parentName} the trial details and the private classroom link (email
            {appointment.whatsappConsent ? " + WhatsApp" : ""}). Nothing is sent before this step.
          </p>
        )}
        {error && <p role="alert" className="text-sm text-[var(--a-danger)]">{error}</p>}
        <div className="flex justify-end gap-2">
          <button className={secondaryBtn} onClick={onClose}>Cancel</button>
          <button className={primaryBtn} disabled={saving || !teacherId} onClick={submit}>
            {saving ? "Saving…" : changing ? "Change teacher" : "Assign & send link to parent"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Mark completed / missed ────────────────────────────────────────────────

export function OutcomeModal({
  appointment,
  onClose,
  onDone,
}: {
  appointment: TrialAppointment;
  onClose: () => void;
  onDone: () => void;
}) {
  const [outcome, setOutcome] = useState<"COMPLETED" | "MISSED">(appointment.status === "MISSED" ? "MISSED" : "COMPLETED");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.post(`/admin/trial/appointments/${appointment.id}/outcome`, { outcome, note: note.trim() || undefined });
      onDone();
      onClose();
    } catch (err) {
      setError(errMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Record the outcome" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-[var(--a-text-muted)]">
          What happened at {appointment.childName}&apos;s trial on <strong className="text-[var(--a-text)]">{formatDhakaDateTime(appointment.startAt)}</strong>?
          This closes the parent&apos;s class link. A trial doesn&apos;t use a lesson, pay the teacher or change any progress.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {(["COMPLETED", "MISSED"] as const).map((o) => (
            <button
              key={o}
              type="button"
              aria-pressed={outcome === o}
              onClick={() => setOutcome(o)}
              className={`py-2.5 rounded-lg border text-sm font-semibold transition-colors ${
                outcome === o
                  ? "bg-[var(--a-accent)] border-[var(--a-accent)] text-white"
                  : "border-[var(--a-border)] text-[var(--a-text)] hover:bg-[var(--a-nav-hover)]"
              }`}
            >
              {o === "COMPLETED" ? "Completed" : "Missed (no-show)"}
            </button>
          ))}
        </div>
        <div>
          <label className={labelCls}>Note (optional, audit trail)</label>
          <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
        </div>
        {error && <p role="alert" className="text-sm text-[var(--a-danger)]">{error}</p>}
        <div className="flex justify-end gap-2">
          <button className={secondaryBtn} onClick={onClose}>Cancel</button>
          <button className={primaryBtn} disabled={saving} onClick={submit}>
            {saving ? "Saving…" : "Save outcome"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
