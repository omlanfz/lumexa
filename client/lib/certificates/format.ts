// FILE PATH: client/lib/certificates/format.ts
//
// Pure display helpers for certificates (no React, no browser APIs) so they can
// be unit-tested. Calendar days arrive as 'YYYY-MM-DD' and are formatted from
// the string itself — never through a Date in the viewer's timezone — so a
// completion date reads identically in Dhaka, London or Los Angeles, exactly as
// it is printed on the certificate.

import type { CertificateStatus, EmailStatus } from './types';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** "2026-10-29" → "29 October 2026" (the format printed on the certificate and
 * used in the email). Returns the input unchanged if it is not a valid day. */
export function formatCertificateDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate ?? '');
  if (!match) return isoDate ?? '';
  const month = MONTHS[Number(match[2]) - 1];
  if (!month) return isoDate;
  return `${Number(match[3])} ${month} ${match[1]}`;
}

export const STATUS_LABEL: Record<CertificateStatus, string> = {
  ACTIVE: 'Active',
  REVOKED: 'Revoked',
  REPLACED: 'Replaced',
};

/** Student-facing wording for the verification status of one certificate. */
export function studentStatusLabel(status: CertificateStatus): string {
  return status === 'ACTIVE' ? 'Verified · Active' : STATUS_LABEL[status];
}

/** The headline of the public verification page. */
export function verificationHeadline(status: CertificateStatus): string {
  switch (status) {
    case 'ACTIVE':
      return 'This certificate is valid';
    case 'REVOKED':
      return 'This certificate has been revoked';
    case 'REPLACED':
      return 'This certificate has been replaced';
  }
}

/** The file name a download is saved as — the same name the server uses. */
export function certificateFileName(
  certificateId: string,
  kind: 'pdf' | 'png',
): string {
  return `Lumexa-Certificate-${certificateId}.${kind}`;
}

export const EMAIL_STATUS_LABEL: Record<EmailStatus, string> = {
  PENDING: 'Waiting to send',
  SENDING: 'Sending…',
  SENT: 'Sent',
  FAILED: 'Failed',
  SKIPPED: 'Not sent',
};

const ACTION_LABELS: Record<string, string> = {
  CERTIFICATE_REVIEW_CREATED: 'Final class completed — review opened',
  CERTIFICATE_REVIEW_DISMISSED: 'Review dismissed',
  CERTIFICATE_REVIEW_REOPENED: 'Review reopened',
  CERTIFICATE_APPROVED: 'Approved',
  CERTIFICATE_ISSUED: 'Certificate issued',
  CERTIFICATE_ISSUE_FAILED: 'Issuing failed',
  CERTIFICATE_REPLACED: 'Replaced',
  CERTIFICATE_REVOKED: 'Revoked',
  CERTIFICATE_EMAIL_SENT: 'Email sent',
  CERTIFICATE_EMAIL_FAILED: 'Email failed',
  CERTIFICATE_EMAIL_RESENT: 'Email resent by an admin',
};

/** A readable name for an audit-log action. */
export function auditActionLabel(action: string): string {
  return (
    ACTION_LABELS[action] ??
    action
      .replace(/^CERTIFICATE_/, '')
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/^./, (c) => c.toUpperCase())
  );
}

/** "1.4 MB", "212 KB", "—" for unknown. */
export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** The first word of a full name, for greetings ("Nusrat Jahan" → "Nusrat"). */
export function firstName(fullName: string | null | undefined): string {
  return (fullName ?? '').trim().split(/\s+/)[0] ?? '';
}

/** Pulls a human message out of an axios-style error. */
export function apiErrorMessage(err: unknown, fallback: string): string {
  const message = (
    err as { response?: { data?: { message?: string | string[] } } } | null
  )?.response?.data?.message;
  if (Array.isArray(message)) return message.join(' ');
  if (typeof message === 'string' && message.trim()) return message;
  return fallback;
}

/** A request whose success body is a FILE also gets its failure body as a Blob (axios
 * keeps the response type), so the server's JSON message — "FRONTEND_URL is not
 * set…", "Nothing was issued…" — would be unreadable. This reads it and puts the
 * parsed JSON back where apiErrorMessage() looks, then returns the same error. */
export async function readBlobError<T>(err: T): Promise<T> {
  const response = (err as { response?: { data?: unknown } } | null)?.response;
  if (response && typeof Blob !== 'undefined' && response.data instanceof Blob) {
    try {
      response.data = JSON.parse(await response.data.text());
    } catch {
      // not JSON (a proxy's HTML page, say): leave it, the caller's fallback applies
    }
  }
  return err;
}
