// FILE PATH: client/lib/certificates/api.ts
//
// The certificate endpoints (server/src/certificates), through the shared
// authenticated axios instance. The student functions need a STUDENT login and
// the admin ones an ADMIN login — the server enforces both; there is no teacher
// access to any of this.
//
// Files are fetched with the login token (an <a href> cannot send it) as blobs
// and then saved or shown from an object URL. They are read from storage by the
// server, never regenerated.

import api from '@/lib/axios';
import type {
  AchievementResponse,
  AdminCertificate,
  CertificateDetailsInput,
  CertificateReview,
  CertificateSummary,
  HistoryEntry,
  IssuingReadiness,
  Paged,
  ReviewDetail,
  StudentCertificate,
} from './types';

export type FileKind = 'pdf' | 'png';

/** An authenticated GET of a binary file. */
export async function fetchBlob(path: string): Promise<Blob> {
  const res = await api.get<Blob>(path, { responseType: 'blob' });
  return res.data;
}

// ─── Student ─────────────────────────────────────────────────────────────────

export const studentCertificates = {
  async list(): Promise<StudentCertificate[]> {
    return (await api.get<StudentCertificate[]>('/certificates/me')).data;
  },

  /** The newest active certificate the student has not seen yet, or null. */
  async achievement(): Promise<StudentCertificate | null> {
    const res = await api.get<AchievementResponse>(
      '/certificates/me/achievement',
    );
    return res.data?.certificate ?? null;
  },

  async markSeen(certificateId: string): Promise<void> {
    await api.post(`/certificates/me/${encodeURIComponent(certificateId)}/seen`);
  },

  filePath(certificateId: string, kind: FileKind): string {
    return `/certificates/me/${encodeURIComponent(certificateId)}/${kind === 'pdf' ? 'pdf' : 'image'}`;
  },
};

// ─── Admin ───────────────────────────────────────────────────────────────────

export interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
}

function query(params: Record<string, string | number | undefined>): string {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') usp.set(key, String(value));
  }
  const s = usp.toString();
  return s ? `?${s}` : '';
}

export const adminCertificates = {
  async status(): Promise<IssuingReadiness> {
    return (await api.get<IssuingReadiness>('/admin/certificates/status')).data;
  },

  async summary(): Promise<CertificateSummary> {
    return (await api.get<CertificateSummary>('/admin/certificates/summary'))
      .data;
  },

  async listReviews(
    params: ListParams & { status?: 'PENDING' | 'DISMISSED' },
  ): Promise<Paged<CertificateReview>> {
    return (
      await api.get<Paged<CertificateReview>>(
        `/admin/certificates/reviews${query({ ...params })}`,
      )
    ).data;
  },

  async getReview(reviewId: string): Promise<ReviewDetail> {
    return (
      await api.get<ReviewDetail>(
        `/admin/certificates/reviews/${encodeURIComponent(reviewId)}`,
      )
    ).data;
  },

  /** A watermarked picture of what would be printed. Nothing is stored. */
  async previewReview(
    reviewId: string,
    details: CertificateDetailsInput,
  ): Promise<Blob> {
    const res = await api.post<Blob>(
      `/admin/certificates/reviews/${encodeURIComponent(reviewId)}/preview`,
      details,
      { responseType: 'blob' },
    );
    return res.data;
  },

  async approve(
    reviewId: string,
    details: CertificateDetailsInput,
  ): Promise<AdminCertificate> {
    return (
      await api.post<AdminCertificate>(
        `/admin/certificates/reviews/${encodeURIComponent(reviewId)}/approve`,
        details,
      )
    ).data;
  },

  async dismissReview(reviewId: string, reason: string): Promise<void> {
    await api.post(
      `/admin/certificates/reviews/${encodeURIComponent(reviewId)}/dismiss`,
      { reason },
    );
  },

  async reopenReview(reviewId: string): Promise<void> {
    await api.post(
      `/admin/certificates/reviews/${encodeURIComponent(reviewId)}/reopen`,
    );
  },

  /** Looks for a final class the live event missed; safe to repeat. */
  async scan(): Promise<{ checked: number; created: number }> {
    return (
      await api.post<{ checked: number; created: number }>(
        '/admin/certificates/reviews/scan',
      )
    ).data;
  },

  async listIssued(
    params: ListParams & { status?: 'ACTIVE' | 'REVOKED' | 'REPLACED' },
  ): Promise<Paged<AdminCertificate>> {
    return (
      await api.get<Paged<AdminCertificate>>(
        `/admin/certificates/issued${query({ ...params })}`,
      )
    ).data;
  },

  async get(certificateId: string): Promise<AdminCertificate> {
    return (
      await api.get<AdminCertificate>(
        `/admin/certificates/${encodeURIComponent(certificateId)}`,
      )
    ).data;
  },

  async history(certificateId: string): Promise<HistoryEntry[]> {
    return (
      await api.get<HistoryEntry[]>(
        `/admin/certificates/${encodeURIComponent(certificateId)}/history`,
      )
    ).data;
  },

  async replace(
    certificateId: string,
    body: {
      reason: string;
      recipientName?: string;
      programName?: string;
      completionDate?: string;
      withDistinction?: boolean;
      sendEmail?: boolean;
    },
  ): Promise<AdminCertificate> {
    return (
      await api.post<AdminCertificate>(
        `/admin/certificates/${encodeURIComponent(certificateId)}/replace`,
        body,
      )
    ).data;
  },

  async revoke(
    certificateId: string,
    reason: string,
  ): Promise<AdminCertificate> {
    return (
      await api.post<AdminCertificate>(
        `/admin/certificates/${encodeURIComponent(certificateId)}/revoke`,
        { reason },
      )
    ).data;
  },

  async resendEmail(
    certificateId: string,
    force: boolean,
  ): Promise<{ outcome: string; certificate: AdminCertificate }> {
    return (
      await api.post<{ outcome: string; certificate: AdminCertificate }>(
        `/admin/certificates/${encodeURIComponent(certificateId)}/resend-email`,
        { force },
      )
    ).data;
  },

  filePath(certificateId: string, kind: FileKind, inline = false): string {
    const base = `/admin/certificates/${encodeURIComponent(certificateId)}/${kind === 'pdf' ? 'pdf' : 'image'}`;
    return inline ? `${base}?inline=1` : base;
  },
};
