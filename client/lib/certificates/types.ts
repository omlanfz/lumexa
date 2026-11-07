// FILE PATH: client/lib/certificates/types.ts
//
// The shapes the certificate API returns (server/src/certificates). Dates that
// are "calendar days" (completion date, issue date) arrive as 'YYYY-MM-DD'
// strings in Asia/Dhaka time and are formatted without any timezone conversion
// (see format.ts) so a certificate reads the same wherever it is opened.

export type CertificateStatus = 'ACTIVE' | 'REVOKED' | 'REPLACED';

/** One certificate as the STUDENT sees it (GET /certificates/me). */
export interface StudentCertificate {
  certificateId: string;
  status: CertificateStatus;
  courseId: string;
  programName: string;
  recipientName: string;
  /** YYYY-MM-DD — the day the final class took place. */
  completionDate: string;
  /** YYYY-MM-DD — the day the certificate was generated and stored. */
  issueDate: string;
  /** The public verification page, built by the server from FRONTEND_URL; null
   * when that is not configured (the client never invents an address). */
  verificationUrl: string | null;
  canDownload: boolean;
  hasImage: boolean;
  /** Issued by the previous system (no image, PDF only). */
  isLegacy: boolean;
  theme: string;
  seen: boolean;
  /** The certificate ID that replaced this one, if it was replaced. */
  replacedBy: string | null;
}

/** GET /certificates/me/achievement — always an object, never an empty body. */
export interface AchievementResponse {
  certificate: StudentCertificate | null;
}

/** GET /certificates/verify/:id — certificate facts only, nothing private. */
export interface VerificationResult {
  certificateId: string;
  status: CertificateStatus;
  recipientName: string;
  programName: string;
  completionDate: string;
  issueDate: string;
  issuedBy: string;
  revokedOn: string | null;
  replacedOn: string | null;
  replacedBy: { certificateId: string; issueDate: string } | null;
}

// ─── Admin ───────────────────────────────────────────────────────────────────

export type EmailStatus = 'PENDING' | 'SENDING' | 'SENT' | 'FAILED' | 'SKIPPED';

export interface AdminCertificate {
  /** Row id (internal). The public identity is certificateId. */
  id: string;
  certificateId: string;
  status: CertificateStatus;
  studentUserId: string;
  student: { id: string; fullName: string; email: string } | null;
  courseId: string;
  recipientName: string;
  programName: string;
  completionDate: string;
  withDistinction: boolean;
  issuedAt: string;
  issueDate: string;
  theme: string;
  /** The theme's name as it was when the certificate was issued, e.g. "Web & Digital Skills". */
  themeLabel: string;
  /** A swatch of that theme (hex), from the palette stored on the certificate. */
  themeColor: string | null;
  templateVersion: string;
  isLegacy: boolean;
  /** Issued with an earlier design (or by the previous system): can be re-issued as it
   * is, in the current design. */
  designOutdated: boolean;
  verificationUrl: string | null;
  files: {
    pdf: boolean;
    png: boolean;
    pdfBytes: number | null;
    pngBytes: number | null;
  };
  issuedByAdminId: string | null;
  replaces: string | null;
  replacedBy: string | null;
  replacedAt: string | null;
  replacementReason: string | null;
  revokedAt: string | null;
  revocationReason: string | null;
  email: {
    status: EmailStatus;
    attempts: number;
    lastError: string | null;
    sentAt: string | null;
    recipient: string | null;
  };
}

export type ReviewStatus = 'PENDING' | 'PROCESSING' | 'ISSUED' | 'DISMISSED';

export interface CertificateReview {
  id: string;
  studentUserId: string;
  courseId: string;
  status: ReviewStatus;
  source: string;
  finalClassId: string | null;
  completedAt: string;
  /** YYYY-MM-DD — the day of the student's final class (Asia/Dhaka). */
  suggestedCompletionDate: string;
  attempts: number;
  lastError: string | null;
  dismissReason: string | null;
  createdAt: string;
  decidedAt: string | null;
  student: { id: string; fullName: string; email: string; avatarUrl: string | null } | null;
  course: { id: string; title: string; category: string | null } | null;
  theme: {
    key: string;
    label: string;
    /** A description for people, e.g. "Deep blue". */
    accent: string;
    /** A real colour (hex) to draw a swatch with. */
    color: string;
  } | null;
}

export interface ReviewFacts {
  lessonsTaken: number | null;
  lastLesson: number | null;
  assessments: {
    title: string;
    type: string;
    scorePct: number | null;
    passScorePct: number | null;
    passed: boolean | null;
    gradedAt: string | null;
  }[];
}

export interface ReviewDetail extends CertificateReview {
  facts: ReviewFacts;
}

export interface CertificateSummary {
  /** Reviews waiting for an admin (PENDING and PROCESSING). */
  pending: number;
  dismissed: number;
  /** Certificates by status. */
  issued: number;
  revoked: number;
  replaced: number;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
}

export interface HistoryEntry {
  id: string;
  action: string;
  entityType: string;
  at: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  reason: string | null;
  before: unknown;
  after: unknown;
}

export interface IssuingReadiness {
  canIssue: boolean;
  problems: { key: string; message: string }[];
}

/** The details an admin confirms before a certificate exists. */
export interface CertificateDetailsInput {
  recipientName: string;
  programName: string;
  completionDate: string;
  withDistinction: boolean;
}

/** One certificate theme and the programmes that get it right now. */
export interface ThemeInfo {
  key: string;
  label: string;
  /** The colour described for people, e.g. "Deep blue". */
  accent: string;
  /** A real swatch colour (hex). */
  color: string;
  programs: { id: string; title: string }[];
}

export interface ThemesResponse {
  /** The design version a certificate issued today is rendered with. */
  templateVersion: string;
  themes: ThemeInfo[];
}

/** What the admin's "Preview template" tool asks for. */
export interface TemplatePreviewRequest {
  theme: string;
  recipientName?: string;
  programName?: string;
  completionDate?: string;
  withDistinction?: boolean;
  /** png (default) to look at, pdf to open as it prints. */
  format?: 'png' | 'pdf';
}
