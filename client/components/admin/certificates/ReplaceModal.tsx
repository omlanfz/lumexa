"use client";

// A controlled correction. The ORIGINAL certificate is kept — marked Replaced, with
// its files untouched — and a NEW certificate with a NEW ID and NEW files is
// issued. Nothing is silently overwritten. A reason is required and goes into the
// audit trail.

import { useState } from "react";
import { Modal } from "@/components/admin/AdminUI";
import { adminCertificates } from "@/lib/certificates/api";
import { notifyCertificatesChanged } from "@/lib/certificates/events";
import { apiErrorMessage } from "@/lib/certificates/format";
import type { AdminCertificate } from "@/lib/certificates/types";
import { BTN_GHOST, BTN_PRIMARY, Field, INPUT, detailsProblem } from "./shared";

export default function ReplaceModal({
  cert,
  onClose,
  onReplaced,
}: {
  cert: AdminCertificate;
  onClose: () => void;
  onReplaced: (next: AdminCertificate) => void;
}) {
  const [recipientName, setRecipientName] = useState(cert.recipientName);
  const [programName, setProgramName] = useState(cert.programName);
  const [completionDate, setCompletionDate] = useState(cert.completionDate);
  const [withDistinction, setWithDistinction] = useState(cert.withDistinction);
  const [reason, setReason] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editing anything clears the last error, so a stale message never lingers.
  const edit =
    <T,>(set: (value: T) => void) =>
    (value: T) => {
      set(value);
      setError(null);
    };

  const details = {
    recipientName: recipientName.trim(),
    programName: programName.trim(),
    completionDate,
    withDistinction,
  };
  const changed =
    details.recipientName !== cert.recipientName ||
    details.programName !== cert.programName ||
    details.completionDate !== cert.completionDate ||
    details.withDistinction !== cert.withDistinction;
  const problem = detailsProblem(details);

  const submit = async () => {
    if (!reason.trim()) return setError("Explain why — it is kept in the audit trail.");
    if (!changed) return setError("Change at least one detail to replace the certificate.");
    if (problem) return setError(problem);
    setSubmitting(true);
    setError(null);
    try {
      const next = await adminCertificates.replace(cert.certificateId, { ...details, reason: reason.trim(), sendEmail });
      notifyCertificatesChanged();
      onReplaced(next);
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err, "The certificate could not be replaced. Nothing was changed."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title={`Replace ${cert.certificateId}`} onClose={() => !submitting && onClose()} wide>
      <div className="space-y-4" data-testid="replace-modal">
        <p className="rounded-lg bg-[var(--a-info-bg)] px-3 py-2.5 text-sm text-[var(--a-info)]">
          The original certificate is kept and marked <strong>Replaced</strong> (its files are never touched). A new
          certificate with a <strong>new ID</strong> is issued in its place, and verification of the old ID will point to it.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Name on the certificate">
            <input value={recipientName} onChange={(e) => edit(setRecipientName)(e.target.value)} maxLength={60} className={INPUT} />
          </Field>
          <Field label="Program name">
            <input value={programName} onChange={(e) => edit(setProgramName)(e.target.value)} maxLength={80} className={INPUT} />
          </Field>
          <Field label="Completion date">
            <input type="date" value={completionDate} onChange={(e) => edit(setCompletionDate)(e.target.value)} className={INPUT} />
          </Field>
          <label className="flex items-start gap-2.5 self-end rounded-lg border border-[var(--a-border)] px-3 py-2.5 text-sm text-[var(--a-text)]">
            <input type="checkbox" checked={withDistinction} onChange={(e) => edit(setWithDistinction)(e.target.checked)} className="mt-0.5" />
            <span>With Distinction line</span>
          </label>
        </div>
        <Field label="Reason for the replacement">
          <textarea
            value={reason}
            onChange={(e) => edit(setReason)(e.target.value)}
            rows={3}
            className={INPUT}
            placeholder="e.g. The student's name was misspelled. Recorded in the audit trail."
            data-testid="replace-reason"
          />
        </Field>
        <label className="flex items-center gap-2.5 text-sm text-[var(--a-text)]">
          <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} />
          Email the corrected certificate to the student
        </label>
        {error && <p className="text-sm text-[var(--a-danger)]">{error}</p>}
        <div className="flex justify-end gap-2">
          <button className={BTN_GHOST} onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button className={BTN_PRIMARY} onClick={() => void submit()} disabled={submitting}>
            {submitting ? "Issuing replacement…" : "Issue replacement"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
