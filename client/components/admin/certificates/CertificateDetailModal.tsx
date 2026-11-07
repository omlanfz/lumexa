"use client";

// One issued certificate, whatever its status: the stored picture and files, its
// facts, who received the email, the replacement chain, and the audit trail — with
// the controlled actions: replace (a correction; the original is kept), revoke
// (status changes, files stay) and resend the email.
//
// There is deliberately NO delete anywhere: certificates and their files are kept
// permanently, including revoked and replaced ones.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Modal, ReasonActionModal, StatusBadge, formatDateTime } from "@/components/admin/AdminUI";
import { adminCertificates, fetchBlob, type FileKind } from "@/lib/certificates/api";
import { notifyCertificatesChanged } from "@/lib/certificates/events";
import { openInNewTab, saveBlob } from "@/lib/certificates/files";
import {
  EMAIL_STATUS_LABEL,
  apiErrorMessage,
  auditActionLabel,
  certificateFileName,
  formatBytes,
  formatCertificateDate,
} from "@/lib/certificates/format";
import type { AdminCertificate, HistoryEntry } from "@/lib/certificates/types";
import AdminCertificateImage from "./AdminCertificateImage";
import ReplaceModal from "./ReplaceModal";
import { BTN_DANGER, BTN_GHOST, BTN_PRIMARY, ThemePill } from "./shared";

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)]">{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-[var(--a-text)]">{children}</dd>
    </div>
  );
}

export default function CertificateDetailModal({
  certificateId,
  onClose,
  onChanged,
  onOpenCertificate,
}: {
  certificateId: string;
  onClose: () => void;
  /** Something changed (replaced, revoked, emailed): refresh the lists. */
  onChanged: () => void;
  /** Open another certificate (the one this replaced, or replaced it). */
  onOpenCertificate: (certificateId: string) => void;
}) {
  const [cert, setCert] = useState<AdminCertificate | null>(null);
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; tone: "ok" | "error" } | null>(null);
  const [dialog, setDialog] = useState<"replace" | "revoke" | null>(null);
  const [confirmResend, setConfirmResend] = useState(false);

  const load = useCallback(async () => {
    try {
      const [c, h] = await Promise.all([adminCertificates.get(certificateId), adminCertificates.history(certificateId)]);
      setCert(c);
      setHistory(h);
      setLoadError(null);
    } catch (err) {
      setLoadError(apiErrorMessage(err, "Couldn't load this certificate."));
    }
  }, [certificateId]);

  useEffect(() => {
    let alive = true;
    Promise.all([adminCertificates.get(certificateId), adminCertificates.history(certificateId)])
      .then(([c, h]) => {
        if (!alive) return;
        setCert(c);
        setHistory(h);
        setLoadError(null);
      })
      .catch((err) => {
        if (alive) setLoadError(apiErrorMessage(err, "Couldn't load this certificate."));
      });
    return () => {
      alive = false;
    };
  }, [certificateId]);

  const download = async (kind: FileKind) => {
    setBusy(kind);
    setNotice(null);
    try {
      saveBlob(await fetchBlob(adminCertificates.filePath(certificateId, kind)), certificateFileName(certificateId, kind));
    } catch (err) {
      setNotice({ text: apiErrorMessage(err, "The download did not work."), tone: "error" });
    } finally {
      setBusy(null);
    }
  };

  const viewPdf = () => {
    setNotice(null);
    openInNewTab(() => fetchBlob(adminCertificates.filePath(certificateId, "pdf", true))).catch((err) =>
      setNotice({ text: apiErrorMessage(err, "The PDF could not be opened."), tone: "error" }),
    );
  };

  const resend = async () => {
    if (!cert) return;
    setBusy("email");
    setNotice(null);
    try {
      const result = await adminCertificates.resendEmail(certificateId, cert.email.status === "SENT");
      setCert(result.certificate);
      setNotice({
        text:
          result.outcome === "sent"
            ? "The email was sent."
            : result.outcome === "failed"
              ? `The email could not be sent: ${result.certificate.email.lastError ?? "unknown error"}`
              : `Email status: ${result.outcome}.`,
        tone: result.outcome === "sent" ? "ok" : "error",
      });
      setConfirmResend(false);
      onChanged();
      void load();
    } catch (err) {
      setNotice({ text: apiErrorMessage(err, "The email could not be sent."), tone: "error" });
    } finally {
      setBusy(null);
    }
  };

  const revoke = async (reason: string) => {
    const updated = await adminCertificates.revoke(certificateId, reason);
    setCert(updated);
    notifyCertificatesChanged();
    onChanged();
    void load();
  };

  const active = cert?.status === "ACTIVE";

  return (
    <>
      <Modal title={cert ? `Certificate ${cert.certificateId}` : "Certificate"} onClose={onClose} wide hidden={dialog !== null}>
        {loadError && <p className="text-sm text-[var(--a-danger)]">{loadError}</p>}
        {!cert && !loadError && <p className="text-sm text-[var(--a-text-faint)]">Loading…</p>}
        {cert && (
          <div className="space-y-6" data-testid="certificate-detail">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={cert.status} />
              {cert.isLegacy && (
                <span className="rounded-full bg-[var(--a-surface-3)] px-2.5 py-1 text-xs font-semibold text-[var(--a-text-muted)]">
                  From the previous system
                </span>
              )}
              {cert.withDistinction && (
                <span className="rounded-full bg-[var(--a-info-bg)] px-2.5 py-1 text-xs font-semibold text-[var(--a-info)]">
                  With Distinction
                </span>
              )}
            </div>

            <AdminCertificateImage
              path={cert.files.png ? adminCertificates.filePath(cert.certificateId, "png", true) : null}
              alt={`Certificate ${cert.certificateId}`}
              emptyLabel="This older certificate has a PDF only."
            />

            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Item label="Awarded to">{cert.recipientName}</Item>
              <Item label="Student account">
                {cert.student ? (
                  <Link href={`/admin/students/${cert.studentUserId}`} target="_blank" className="text-[var(--a-accent)] hover:underline">
                    {cert.student.fullName} ↗
                  </Link>
                ) : (
                  "—"
                )}
                {cert.student && <span className="block text-xs text-[var(--a-text-faint)]">{cert.student.email}</span>}
              </Item>
              <Item label="Program">{cert.programName}</Item>
              <Item label="Design">
                {cert.isLegacy ? (
                  "Previous design"
                ) : (
                  <span className="inline-flex flex-wrap items-center gap-x-2">
                    <ThemePill label={cert.themeLabel} color={cert.themeColor ?? undefined} />
                    <span className="text-xs text-[var(--a-text-faint)]">· template {cert.templateVersion}</span>
                  </span>
                )}
              </Item>
              <Item label="Completion date">{formatCertificateDate(cert.completionDate)}</Item>
              <Item label="Issue date">{formatCertificateDate(cert.issueDate)}</Item>
              <Item label="Files">
                PDF {cert.files.pdf ? formatBytes(cert.files.pdfBytes) : "none"} · Image{" "}
                {cert.files.png ? formatBytes(cert.files.pngBytes) : "none"}
              </Item>
              <Item label="Public verification page">
                {cert.verificationUrl ? (
                  <a href={cert.verificationUrl} target="_blank" rel="noopener noreferrer" className="break-all text-[var(--a-accent)] hover:underline">
                    {cert.verificationUrl} ↗
                  </a>
                ) : (
                  <span className="text-[var(--a-warning-text)]">Unavailable — FRONTEND_URL is not configured.</span>
                )}
              </Item>
              {cert.replaces && (
                <Item label="Replaces">
                  <button className="font-mono text-[var(--a-accent)] hover:underline" onClick={() => onOpenCertificate(cert.replaces!)}>
                    {cert.replaces}
                  </button>
                </Item>
              )}
              {cert.replacedBy && (
                <Item label="Replaced by">
                  <button className="font-mono text-[var(--a-accent)] hover:underline" onClick={() => onOpenCertificate(cert.replacedBy!)}>
                    {cert.replacedBy}
                  </button>
                  {cert.replacementReason && <span className="block text-xs text-[var(--a-text-faint)]">“{cert.replacementReason}”</span>}
                </Item>
              )}
              {cert.status === "REVOKED" && (
                <Item label="Revoked">
                  {formatDateTime(cert.revokedAt)}
                  {cert.revocationReason && <span className="block text-xs text-[var(--a-text-faint)]">“{cert.revocationReason}”</span>}
                </Item>
              )}
            </dl>

            {/* Files */}
            <section className="flex flex-wrap gap-2">
              <button className={BTN_GHOST} onClick={viewPdf} disabled={!cert.files.pdf}>
                View PDF
              </button>
              <button className={BTN_GHOST} onClick={() => void download("pdf")} disabled={!cert.files.pdf || busy !== null}>
                {busy === "pdf" ? "Preparing…" : "Download PDF"}
              </button>
              <button className={BTN_GHOST} onClick={() => void download("png")} disabled={!cert.files.png || busy !== null}>
                {busy === "png" ? "Preparing…" : "Download image"}
              </button>
              {cert.verificationUrl && (
                <a href={cert.verificationUrl} target="_blank" rel="noopener noreferrer" className={BTN_GHOST}>
                  View public page ↗
                </a>
              )}
            </section>

            {/* Email */}
            <section className="rounded-xl border border-[var(--a-border)] bg-[var(--a-surface-2)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)]">Congratulatory email</h4>
                  <StatusBadge status={cert.email.status} />
                </div>
                {active && cert.files.pdf && !confirmResend && (
                  <button
                    className={BTN_GHOST}
                    disabled={busy !== null || cert.email.status === "SENDING"}
                    onClick={() => (cert.email.status === "SENT" ? setConfirmResend(true) : void resend())}
                  >
                    {busy === "email" ? "Sending…" : cert.email.status === "SENT" ? "Send again…" : "Send email now"}
                  </button>
                )}
              </div>
              <p className="mt-2 text-sm text-[var(--a-text-muted)]">
                {EMAIL_STATUS_LABEL[cert.email.status]}
                {cert.email.recipient && <> · to {cert.email.recipient}</>}
                {cert.email.sentAt && <> · {formatDateTime(cert.email.sentAt)}</>}
                {cert.email.attempts > 0 && <> · {cert.email.attempts} attempt{cert.email.attempts === 1 ? "" : "s"}</>}
              </p>
              {cert.email.status === "SKIPPED" && cert.isLegacy && (
                <p className="mt-1 text-xs text-[var(--a-text-faint)]">The previous system already emailed this certificate.</p>
              )}
              {cert.email.lastError && cert.email.status !== "SENT" && (
                <p className="mt-1 text-sm text-[var(--a-danger)]">{cert.email.lastError}</p>
              )}
              {confirmResend && (
                <div className="mt-3 rounded-lg bg-[var(--a-warning-bg)] px-3 py-3 text-sm text-[var(--a-warning-text)]">
                  <p>This certificate was already emailed. Send it again only if the family asked for it.</p>
                  <div className="mt-2 flex gap-2">
                    <button className={BTN_GHOST} onClick={() => setConfirmResend(false)}>
                      Cancel
                    </button>
                    <button className={BTN_PRIMARY} onClick={() => void resend()} disabled={busy !== null}>
                      {busy === "email" ? "Sending…" : "Send again"}
                    </button>
                  </div>
                </div>
              )}
            </section>

            {notice && (
              <p role="status" className={`text-sm ${notice.tone === "error" ? "text-[var(--a-danger)]" : "text-[var(--a-success-text)]"}`}>
                {notice.text}
              </p>
            )}

            {/* Actions */}
            {active && (
              <section className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--a-border)] pt-4">
                <p className="max-w-md text-xs text-[var(--a-text-faint)]">
                  Certificates and their files are kept permanently. A correction issues a replacement and keeps this one; revoking
                  changes what verification says and keeps the files.
                </p>
                <div className="flex gap-2">
                  <button className={BTN_GHOST} onClick={() => setDialog("replace")} data-testid="open-replace">
                    Replace…
                  </button>
                  <button className={BTN_DANGER} onClick={() => setDialog("revoke")} data-testid="open-revoke">
                    Revoke…
                  </button>
                </div>
              </section>
            )}

            {/* Audit trail */}
            <section>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--a-text-faint)]">Audit trail</h4>
              {!history ? (
                <p className="text-sm text-[var(--a-text-faint)]">Loading…</p>
              ) : history.length === 0 ? (
                <p className="text-sm text-[var(--a-text-faint)]">No events recorded.</p>
              ) : (
                <ol className="divide-y divide-[var(--a-border)] rounded-lg border border-[var(--a-border)]" data-testid="audit-trail">
                  {history.map((h) => (
                    <li key={h.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-3 py-2 text-sm">
                      <span className="font-medium text-[var(--a-text)]">{auditActionLabel(h.action)}</span>
                      <span className="text-xs text-[var(--a-text-faint)]">
                        {h.actorName}
                        {h.actorRole === "ADMIN" ? " (admin)" : ""} · {formatDateTime(h.at)}
                      </span>
                      {h.reason && <span className="basis-full text-xs text-[var(--a-text-muted)]">“{h.reason}”</span>}
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        )}
      </Modal>

      {dialog === "replace" && cert && (
        <ReplaceModal
          cert={cert}
          onClose={() => setDialog(null)}
          onReplaced={(next) => {
            onChanged();
            // Show the new certificate; this one stays in the lists as Replaced.
            onOpenCertificate(next.certificateId);
          }}
        />
      )}
      {dialog === "revoke" && cert && (
        <ReasonActionModal
          title={`Revoke ${cert.certificateId}?`}
          actionLabel="Revoke certificate"
          danger
          extraFields={
            <p className="rounded-lg bg-[var(--a-warning-bg)] px-3 py-2.5 text-sm text-[var(--a-warning-text)]">
              Verification (and its QR code) will say <strong>Revoked</strong>, and the student will no longer be able to
              download or share it. The certificate and its files are kept — nothing is deleted.
            </p>
          }
          onSubmit={revoke}
          onClose={() => setDialog(null)}
        />
      )}
    </>
  );
}
