"use client";

// The admin's review of one finished programme. Nothing here is decided for the
// admin: the dialog shows what the records say (lessons taken, any graded tests),
// asks the admin to confirm the EXACT name, programme and completion date to be
// printed, offers a watermarked preview, and only the explicit "Approve & issue"
// creates the certificate — its ID, QR code, PDF, image and verification record.
//
// If generating or storing fails the server issues nothing and sends no email;
// the message is shown here and the review stays in the queue to approve again.

import { useEffect, useState } from "react";
import Link from "next/link";
import { Avatar, Modal, StatusBadge, formatDhakaDate } from "@/components/admin/AdminUI";
import { adminCertificates } from "@/lib/certificates/api";
import { notifyCertificatesChanged } from "@/lib/certificates/events";
import { apiErrorMessage, formatCertificateDate } from "@/lib/certificates/format";
import type {
  AdminCertificate,
  CertificateDetailsInput,
  CertificateReview,
  IssuingReadiness,
  ReviewDetail,
} from "@/lib/certificates/types";
import { ImageFrame } from "./AdminCertificateImage";
import { BTN_GHOST, BTN_PRIMARY, Field, INPUT, ThemePill, detailsProblem } from "./shared";

export default function ApprovalModal({
  review,
  readiness,
  onClose,
  onIssued,
  onOpenCertificate,
}: {
  review: CertificateReview;
  readiness: IssuingReadiness | null;
  onClose: () => void;
  onIssued: (certificate: AdminCertificate) => void;
  onOpenCertificate: (certificateId: string) => void;
}) {
  const [detail, setDetail] = useState<ReviewDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  // What the admin confirms — offered from the records, editable.
  const [form, setForm] = useState<CertificateDetailsInput>({
    recipientName: review.student?.fullName ?? "",
    programName: review.course?.title ?? "",
    completionDate: review.suggestedCompletionDate,
    withDistinction: false,
  });
  const [confirmed, setConfirmed] = useState(false);

  const [preview, setPreview] = useState<{ url: string; of: string } | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issued, setIssued] = useState<AdminCertificate | null>(null);

  useEffect(() => {
    let alive = true;
    adminCertificates
      .getReview(review.id)
      .then((d) => alive && setDetail(d))
      .catch((err) => alive && setDetailError(apiErrorMessage(err, "Couldn't load the student's records.")));
    return () => {
      alive = false;
    };
  }, [review.id]);

  // Release the preview's object URL when it is replaced or the dialog closes.
  useEffect(() => {
    const url = preview?.url;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [preview?.url]);

  const set = <K extends keyof CertificateDetailsInput>(key: K, value: CertificateDetailsInput[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setConfirmed(false); // a change must be confirmed again
    setError(null);
  };

  const trimmed = (): CertificateDetailsInput => ({
    ...form,
    recipientName: form.recipientName.trim(),
    programName: form.programName.trim(),
  });
  const snapshot = JSON.stringify(trimmed());
  const previewStale = !!preview && preview.of !== snapshot;
  const problem = detailsProblem(form);
  const blocked = readiness ? !readiness.canIssue : false;

  const showPreview = async () => {
    if (problem) {
      setPreviewError(problem);
      return;
    }
    setPreviewing(true);
    setPreviewError(null);
    try {
      const blob = await adminCertificates.previewReview(review.id, trimmed());
      setPreview({ url: URL.createObjectURL(blob), of: snapshot });
    } catch (err) {
      setPreviewError(apiErrorMessage(err, "The preview could not be generated."));
    } finally {
      setPreviewing(false);
    }
  };

  const approve = async () => {
    if (problem) {
      setError(problem);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const certificate = await adminCertificates.approve(review.id, trimmed());
      setIssued(certificate);
      notifyCertificatesChanged();
      onIssued(certificate);
    } catch (err) {
      setError(apiErrorMessage(err, "The certificate could not be issued. Nothing was issued."));
    } finally {
      setSubmitting(false);
    }
  };

  const close = () => {
    if (!submitting) onClose();
  };

  // ── Success ────────────────────────────────────────────────────────────────
  if (issued) {
    return (
      <Modal title="Certificate issued" onClose={onClose}>
        <div className="space-y-4" data-testid="approval-issued">
          <p className="rounded-lg bg-[var(--a-success-bg)] px-4 py-3 text-sm text-[var(--a-success-text)]">
            ✓ The certificate for <strong>{issued.recipientName}</strong> has been generated and stored. It is now in the
            student&apos;s dashboard, and the congratulatory email with the PDF is being sent.
          </p>
          <dl className="space-y-1 text-sm">
            <div className="flex gap-2">
              <dt className="w-32 text-[var(--a-text-faint)]">Certificate ID</dt>
              <dd className="font-mono font-semibold text-[var(--a-text)]">{issued.certificateId}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-32 text-[var(--a-text-faint)]">Issue date</dt>
              <dd className="text-[var(--a-text)]">{formatCertificateDate(issued.issueDate)}</dd>
            </div>
          </dl>
          <div className="flex justify-end gap-2">
            <button className={BTN_GHOST} onClick={onClose}>
              Done
            </button>
            <button
              className={BTN_PRIMARY}
              onClick={() => {
                onClose();
                onOpenCertificate(issued.certificateId);
              }}
            >
              View certificate
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  const student = review.student;

  return (
    <Modal title="Review & approve certificate" onClose={close} wide>
      <div className="space-y-6" data-testid="approval-modal">
        {/* Who and what */}
        <section className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar name={student?.fullName ?? "?"} src={student?.avatarUrl ?? null} />
            <div className="min-w-0">
              <p className="font-semibold text-[var(--a-text)]">{student?.fullName ?? "Unknown student"}</p>
              <p className="truncate text-sm text-[var(--a-text-muted)]">{student?.email}</p>
            </div>
          </div>
          <div className="text-right text-sm">
            <p className="font-medium text-[var(--a-text)]">{review.course?.title ?? "Unknown program"}</p>
            {review.theme && <ThemePill label={review.theme.label} color={review.theme.color} accent={review.theme.accent} />}
          </div>
        </section>

        {/* What the records show */}
        <section className="rounded-xl border border-[var(--a-border)] bg-[var(--a-surface-2)] p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)]">
              What the records show
            </h4>
            {student && (
              <Link
                href={`/admin/students/${review.studentUserId}`}
                target="_blank"
                className="text-sm font-medium text-[var(--a-accent)] hover:underline"
              >
                Open student progress ↗
              </Link>
            )}
          </div>
          {detailError && <p className="text-sm text-[var(--a-danger)]">{detailError}</p>}
          {!detail && !detailError && <p className="text-sm text-[var(--a-text-faint)]">Loading…</p>}
          {detail && (
            <div className="space-y-3 text-sm text-[var(--a-text)]">
              <p>
                Final class taken on <strong>{formatCertificateDate(review.suggestedCompletionDate)}</strong>
                {detail.facts.lessonsTaken !== null && (
                  <>
                    {" "}
                    · {detail.facts.lessonsTaken} lesson{detail.facts.lessonsTaken === 1 ? "" : "s"} taken
                  </>
                )}
                {detail.facts.lastLesson !== null && <> · last lesson: #{detail.facts.lastLesson}</>}
              </p>
              {detail.facts.assessments.length === 0 ? (
                <p className="text-[var(--a-text-muted)]">No graded tests on record for this program.</p>
              ) : (
                <ul className="divide-y divide-[var(--a-border)] rounded-lg border border-[var(--a-border)]">
                  {detail.facts.assessments.map((a, i) => (
                    <li key={`${a.title}-${i}`} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                      <span className="min-w-0 break-words">{a.title}</span>
                      <span className="flex items-center gap-2 text-[var(--a-text-muted)]">
                        {a.scorePct !== null ? `${Math.round(a.scorePct)}%` : "—"}
                        {a.passed !== null && <StatusBadge status={a.passed ? "COMPLETED" : "INCOMPLETE"} />}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-[var(--a-text-faint)]">
                For your review only — nothing is decided automatically. Whether a certificate is issued is your call.
              </p>
            </div>
          )}
          {review.lastError && (
            <p className="mt-3 rounded-lg bg-[var(--a-warning-bg)] px-3 py-2 text-sm text-[var(--a-warning-text)]">
              The last attempt to issue this certificate failed: {review.lastError}
            </p>
          )}
        </section>

        {/* What will be printed */}
        <section className="space-y-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)]">
            Confirm what will be printed
          </h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Name on the certificate"
              hint={student ? `Account name: ${student.fullName}. Correct it here if it should read differently.` : undefined}
            >
              <input
                value={form.recipientName}
                onChange={(e) => set("recipientName", e.target.value)}
                maxLength={60}
                className={INPUT}
                data-testid="approval-name"
              />
            </Field>
            <Field label="Program name" hint="As it should appear on the certificate.">
              <input
                value={form.programName}
                onChange={(e) => set("programName", e.target.value)}
                maxLength={80}
                className={INPUT}
                data-testid="approval-program"
              />
            </Field>
            <Field
              label="Completion date"
              hint={`Offered: the day of the final class (${formatCertificateDate(review.suggestedCompletionDate)}).`}
            >
              <input
                type="date"
                value={form.completionDate}
                onChange={(e) => set("completionDate", e.target.value)}
                className={INPUT}
                data-testid="approval-date"
              />
            </Field>
            <label className="flex items-start gap-2.5 self-end rounded-lg border border-[var(--a-border)] px-3 py-2.5 text-sm text-[var(--a-text)]">
              <input
                type="checkbox"
                checked={form.withDistinction}
                onChange={(e) => set("withDistinction", e.target.checked)}
                className="mt-0.5"
              />
              <span>
                Add the <strong>With Distinction</strong> line
                <span className="block text-xs text-[var(--a-text-faint)]">Optional — printed only if you tick this.</span>
              </span>
            </label>
          </div>
          {problem && <p className="text-sm text-[var(--a-warning-text)]">{problem}</p>}
        </section>

        {/* Preview */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)]">Preview</h4>
            <button className={BTN_GHOST} onClick={() => void showPreview()} disabled={previewing || !!problem}>
              {previewing ? "Generating preview…" : preview ? "Refresh preview" : "Show preview"}
            </button>
          </div>
          {(preview || previewing || previewError) && (
            <>
              <ImageFrame
                url={preview?.url ?? null}
                loading={previewing && !preview}
                failed={!!previewError}
                alt="Watermarked preview of the certificate"
                emptyLabel="Preview"
              />
              {previewStale && (
                <p className="text-sm text-[var(--a-warning-text)]">
                  You changed a detail since this preview — refresh it to check the result.
                </p>
              )}
              {previewError && <p className="text-sm text-[var(--a-danger)]">{previewError}</p>}
              <p className="text-xs text-[var(--a-text-faint)]">
                A preview is watermarked and is never saved. The certificate ID and QR code are created only when you approve.
              </p>
            </>
          )}
        </section>

        {/* Confirm and issue */}
        <section className="space-y-3 border-t border-[var(--a-border)] pt-4">
          {blocked && readiness && (
            <div className="rounded-lg bg-[var(--a-danger-bg)] px-3 py-2.5 text-sm text-[var(--a-danger-text)]" data-testid="approval-blocked">
              <p className="font-semibold">Certificates cannot be issued yet.</p>
              <ul className="mt-1 list-disc pl-5">
                {readiness.problems.map((p) => (
                  <li key={p.key}>{p.message}</li>
                ))}
              </ul>
            </div>
          )}
          <label className="flex items-start gap-2.5 text-sm text-[var(--a-text)]">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5"
              data-testid="approval-confirm"
            />
            <span>
              I have checked the name, program and completion date above. They will be printed exactly as shown. A
              certificate cannot be edited once issued — a mistake is fixed by issuing a replacement (the original is kept).
            </span>
          </label>
          {error && (
            <p className="rounded-lg bg-[var(--a-danger-bg)] px-3 py-2.5 text-sm text-[var(--a-danger-text)]" data-testid="approval-error">
              {error}
            </p>
          )}
          <p className="text-xs text-[var(--a-text-faint)]">
            Pending since {formatDhakaDate(review.createdAt)}. Approving creates the certificate ID, QR code, PDF and image,
            shows it in the student&apos;s dashboard and emails it.
          </p>
          <div className="flex justify-end gap-2">
            <button className={BTN_GHOST} onClick={close} disabled={submitting}>
              Cancel
            </button>
            <button
              className={BTN_PRIMARY}
              onClick={() => void approve()}
              disabled={submitting || !confirmed || !!problem || blocked}
              data-testid="approval-submit"
            >
              {submitting ? "Generating certificate…" : "Approve & issue certificate"}
            </button>
          </div>
        </section>
      </div>
    </Modal>
  );
}
