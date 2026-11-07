// FILE PATH: server/src/certificates/certificates.service.ts
//
// Issuing, correcting, revoking and reading Certificates of Completion.
//
// The rules this file enforces (the spec's, in order of importance):
//
//  1. ADMIN ONLY. Every method that changes anything is reached only from the
//     admin controller (ADMIN role). There is no teacher step and no student
//     confirmation step; the student only ever READS.
//  2. NOTHING EXISTS UNTIL APPROVAL. A certificate ID, QR code, PDF, PNG and
//     verification record are created only inside approve() — after an admin has
//     confirmed the exact name, programme and completion date.
//  3. NEVER FALSELY ISSUED. The Certificate row is written only after BOTH files
//     are rendered, stored and verified in R2, in the same transaction that closes
//     the review. If rendering or storage fails the review goes back to PENDING,
//     no row exists, no email is sent, and the admin sees why. (The database also
//     refuses an issued row without its file keys.)
//  4. NEVER OVERWRITTEN OR DELETED. A correction is replace(): a NEW certificate
//     with a NEW ID and NEW files, the original kept and marked REPLACED.
//     revoke() changes status only. There is no deletion anywhere in this file,
//     and the storage service has no way to delete.
//  5. EVERY CHANGE IS AUDITED, with the responsible admin and a timestamp, in the
//     same transaction as the change (AuditLog, the platform's append-only log).
//  6. GENERATED ONCE. Files are rendered at issuance and stored; viewing or
//     downloading only reads them.
//  7. IDEMPOTENT. Approving twice (a double click, a retried request) issues one
//     certificate: the second call finds the review claimed, or already issued.
//
// The issue DATE is the day the files were generated and stored (Asia/Dhaka); the
// completion DATE is whatever the admin confirmed (offered: the day of the
// student's final class).

import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Certificate, CertificateStatus, Prisma } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../prisma.service';
import {
  todayDhakaDateStr,
  utcToDhakaParts,
} from '../scheduling/dhaka-time.util';
import {
  FrontendUrlError,
  certificateVerificationUrl,
  frontendUrlProblem,
} from './certificate-config';
import { CertificateEmailService } from './certificate-email.service';
import {
  generateUniqueCertificateId,
  parseVerifiableCertificateId,
} from './certificate-id';
import {
  normalizeCertificateText,
  programNameProblem,
  recipientNameProblem,
} from './certificate-name';
import {
  CERTIFICATE_RENDERER,
  CertificateRenderError,
  type CertificateRenderer,
} from './certificate-renderer.service';
import {
  CERTIFICATE_STORAGE,
  CertificateObjectExistsError,
  CertificateStorageError,
  describeStorageError,
  type CertificateObjectKeys,
  type CertificateStorage,
} from './certificate-storage.service';
import {
  REVIEW_PROCESSING_LEASE_MS,
  type CertificateActor,
} from './certificate-reviews.service';
import {
  CERTIFICATE_CATEGORIES,
  listCertificateThemes,
  resolveCertificateTheme,
  themeSnapshot,
  type CertificatePalette,
  type ResolvedCertificateTheme,
} from './certificate-themes';
import { TEMPLATE_VERSION } from './template/certificate-template';

const ISSUER_NAME = 'Lumexa AI School';
const NOT_FOUND = 'No certificate with this ID was found.';
/** What a legacy (pre-v1) certificate's templateVersion/theme say. */
export const LEGACY_MARKER = 'legacy';

export interface ApproveInput {
  recipientName: string;
  programName: string;
  completionDate: string;
  withDistinction?: boolean;
}

export interface ReplaceInput {
  reason: string;
  recipientName?: string;
  programName?: string;
  completionDate?: string;
  withDistinction?: boolean;
  /** Email the corrected certificate (default true). */
  sendEmail?: boolean;
}

export type CertificateFileKind = 'pdf' | 'png';

/** What the admin's "Preview template" tool may ask for. */
export interface TemplatePreviewInput {
  theme: string;
  recipientName?: string;
  programName?: string;
  completionDate?: string;
  withDistinction?: boolean;
  format?: 'png' | 'pdf';
}

/** What a sample shows when the admin leaves a field out. */
const SAMPLE_RECIPIENT = 'Student Full Name';
const SAMPLE_PROGRAM = 'Program Name';
/** The placeholder ID on every preview and sample: it never exists as a certificate. */
const PREVIEW_CERTIFICATE_ID = 'LXA-PREVIEW';

/** What generateAndStore() hands back: the files are already in R2. */
interface GeneratedFiles {
  certificateId: string;
  issuedAt: Date;
  keys: CertificateObjectKeys;
  pdfBytes: number;
  pngBytes: number;
  pdfSha256: string;
  pngSha256: string;
}

export interface CertificateFile {
  body: Buffer;
  contentType: string;
  fileName: string;
}

// ─── Pure helpers (exported for the specs) ───────────────────────────────────

/** An error message if `value` is not an acceptable completion date, else null. */
export function completionDateProblem(
  value: string,
  today: string = todayDhakaDateStr(),
): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '');
  if (!match) return 'Enter the completion date as YYYY-MM-DD.';
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(y, m - 1, d));
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  )
    return 'That is not a real calendar date.';
  if (y < 2000) return 'The completion date is implausibly early.';
  if (value > today) return 'The completion date cannot be in the future.';
  return null;
}

function isUniqueViolation(err: unknown, targetFragment?: string): boolean {
  const e = err as { code?: string; meta?: { target?: unknown } } | null;
  if (e?.code !== 'P2002') return false;
  if (!targetFragment) return true;
  const target = e.meta?.target;
  return JSON.stringify(target ?? '').includes(targetFragment);
}

/** The "one ACTIVE certificate per student and programme" rule is a partial
 * unique index created in SQL (Certificate_one_active_per_program). Prisma does
 * not know the index by name: it reports a violation as P2002 against the
 * COLUMNS (studentUserId, courseId) — the only unique key on that pair — so
 * either spelling identifies it. */
function isOneActivePerProgramViolation(err: unknown): boolean {
  if (!isUniqueViolation(err)) return false;
  const target = JSON.stringify(
    (err as { meta?: { target?: unknown } }).meta?.target ?? '',
  );
  return (
    target.includes('one_active_per_program') ||
    (target.includes('studentUserId') && target.includes('courseId'))
  );
}

const sha256 = (buffer: Buffer) =>
  createHash('sha256').update(buffer).digest('hex');

@Injectable()
export class CertificatesService {
  private readonly logger = new Logger(CertificatesService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CERTIFICATE_STORAGE) private readonly storage: CertificateStorage,
    @Inject(CERTIFICATE_RENDERER)
    private readonly renderer: CertificateRenderer,
    private readonly emails: CertificateEmailService,
  ) {}

  // ═══ Readiness ════════════════════════════════════════════════════════════

  /** What stops certificates being issued right now, for the admin dashboard. */
  readiness() {
    const problems: { key: string; message: string }[] = [];
    const frontend = frontendUrlProblem();
    if (frontend) problems.push({ key: 'FRONTEND_URL', message: frontend });
    const storage = this.storage.configurationProblem();
    if (storage)
      problems.push({
        key: 'STORAGE',
        message: `Certificate storage is not set up: ${storage}.`,
      });
    return { canIssue: problems.length === 0, problems };
  }

  /** Refuses to go further unless a valid frontend URL AND storage are available:
   * a certificate must never be issued with a QR code that points nowhere, or
   * without somewhere permanent to keep it. */
  private assertCanIssue(): void {
    const { canIssue, problems } = this.readiness();
    if (!canIssue)
      throw new ServiceUnavailableException(
        `Certificates cannot be issued yet. ${problems.map((p) => p.message).join(' ')}`,
      );
  }

  // ═══ Checking the finished design (admin; nothing is issued) ═══════════════

  /** The themes and which programmes use each one right now. A programme gets the
   * theme of its category at the moment a certificate is issued, so this is what
   * an approval today would print. */
  async themes() {
    const courses = await this.prisma.course.findMany({
      select: { id: true, title: true, category: true, slug: true },
      orderBy: { title: 'asc' },
      take: 1000,
    });
    const byTheme = new Map<string, { id: string; title: string }[]>();
    for (const course of courses) {
      const key = resolveCertificateTheme(course).key;
      byTheme.set(key, [
        ...(byTheme.get(key) ?? []),
        { id: course.id, title: course.title },
      ]);
    }
    return {
      templateVersion: TEMPLATE_VERSION,
      themes: listCertificateThemes().map((theme) => ({
        ...theme,
        programs: byTheme.get(theme.key) ?? [],
      })),
    };
  }

  /** A sample of the FINISHED design — the same template and the same renderer as a
   * real certificate — for an admin to check before any student has one. It is
   * watermarked "PREVIEW — NOT ISSUED", carries a placeholder ID that never exists,
   * and is never stored, recorded, audited or emailed. */
  async templatePreview(raw: TemplatePreviewInput) {
    this.assertCanIssueFrontend();
    const category = Object.values(CERTIFICATE_CATEGORIES).find(
      (c) => c.key === raw.theme,
    );
    if (!category)
      throw new BadRequestException('Choose one of the certificate themes.');

    const today = todayDhakaDateStr();
    const sample = this.cleanDetails({
      recipientName: raw.recipientName?.trim() || SAMPLE_RECIPIENT,
      programName: raw.programName?.trim() || SAMPLE_PROGRAM,
      completionDate: raw.completionDate?.trim() || today,
    });
    const input = {
      certificateId: PREVIEW_CERTIFICATE_ID,
      ...sample,
      issueDate: today,
      verificationUrl: certificateVerificationUrl(PREVIEW_CERTIFICATE_ID),
      withDistinction: !!raw.withDistinction,
      palette: category.palette,
    };
    try {
      if (raw.format === 'pdf')
        return {
          body: await this.renderer.renderPreviewPdf(input),
          contentType: 'application/pdf',
          fileName: 'Lumexa-Certificate-SAMPLE.pdf',
        };
      return {
        body: await this.renderer.renderPreview(input),
        contentType: 'image/png',
        fileName: 'Lumexa-Certificate-SAMPLE.png',
      };
    } catch (err) {
      throw this.httpError(err);
    }
  }

  // ═══ Approval (the only way a first certificate comes to exist) ═══════════

  /** Confirms the details of what would be printed and renders a watermarked
   * preview (never stored, no ID). */
  async preview(reviewId: string, raw: ApproveInput): Promise<Buffer> {
    this.assertCanIssueFrontend();
    const review = await this.prisma.certificateReview.findUnique({
      where: { id: reviewId },
    });
    if (!review) throw new NotFoundException('Review not found.');
    const input = this.cleanDetails(raw);
    const theme = await this.themeFor(review.courseId);
    const today = todayDhakaDateStr();
    try {
      return await this.renderer.renderPreview({
        certificateId: PREVIEW_CERTIFICATE_ID,
        recipientName: input.recipientName,
        programName: input.programName,
        completionDate: input.completionDate,
        issueDate: today,
        verificationUrl: certificateVerificationUrl(PREVIEW_CERTIFICATE_ID),
        withDistinction: !!raw.withDistinction,
        palette: theme.palette,
      });
    } catch (err) {
      throw this.httpError(err);
    }
  }

  async approve(reviewId: string, raw: ApproveInput, admin: CertificateActor) {
    this.assertCanIssue();
    const input = this.cleanDetails(raw);
    const withDistinction = !!raw.withDistinction;

    const review = await this.claimReview(reviewId, admin);
    if ('alreadyIssued' in review) return review.alreadyIssued;

    let row: Certificate;
    try {
      const theme = await this.themeFor(review.courseId);
      const student = await this.prisma.user.findUnique({
        where: { id: review.studentUserId },
        select: { fullName: true },
      });

      row = await this.withIdRetries(async () => {
        const files = await this.generateAndStore({
          ...input,
          withDistinction,
          palette: theme.palette,
        });
        return this.prisma.$transaction(async (tx) => {
          const created = await tx.certificate.create({
            data: this.certificateData(files, {
              studentUserId: review.studentUserId,
              courseId: review.courseId,
              ...input,
              withDistinction,
              theme,
              extra: { reviewId: review.id, issuedByAdminId: admin.id },
            }),
          });
          await tx.certificateReview.update({
            where: { id: review.id },
            data: {
              status: 'ISSUED',
              issuedCertificateId: created.id,
              decidedAt: new Date(),
              decidedByAdminId: admin.id,
              processingStartedAt: null,
              lastError: null,
            },
          });
          await tx.auditLog.createMany({
            data: [
              {
                actorId: admin.id,
                actorRole: admin.role,
                action: 'CERTIFICATE_APPROVED',
                entityType: 'CertificateReview',
                entityId: review.id,
                // What the admin was offered versus what they confirmed: any
                // correction is visible here.
                beforeData: {
                  accountName: student?.fullName ?? null,
                  suggestedCompletionDate: review.suggestedCompletionDate,
                } as Prisma.InputJsonValue,
                afterData: {
                  recipientName: input.recipientName,
                  programName: input.programName,
                  completionDate: input.completionDate,
                  withDistinction,
                } as Prisma.InputJsonValue,
              },
              {
                actorId: admin.id,
                actorRole: admin.role,
                action: 'CERTIFICATE_ISSUED',
                entityType: 'Certificate',
                entityId: created.id,
                afterData: this.issuedAudit(created) as Prisma.InputJsonValue,
              },
            ],
          });
          return created;
        });
      });
    } catch (err) {
      await this.releaseReview(review.id, err);
      await this.prisma.auditLog
        .create({
          data: {
            actorId: admin.id,
            actorRole: admin.role,
            action: 'CERTIFICATE_ISSUE_FAILED',
            entityType: 'CertificateReview',
            entityId: review.id,
            reason: this.reasonOf(err),
          },
        })
        .catch(() => undefined);
      throw this.httpError(err);
    }

    // The certificate now exists: files stored, record committed. What follows
    // happens after the fact, so a problem here can never be reported as a failed
    // issuance (the email has its own retry-safe state machine).
    this.emails.queue(row.id);
    return (await this.toAdminViews([row]))[0];
  }

  /** Takes the review for processing (PENDING → PROCESSING), or explains why it
   * cannot. An abandoned approval (a crash mid-generation) can be re-claimed after
   * the lease. An already-issued review returns its certificate (idempotent). */
  private async claimReview(reviewId: string, admin: CertificateActor) {
    const staleBefore = new Date(Date.now() - REVIEW_PROCESSING_LEASE_MS);
    const claimed = await this.prisma.certificateReview.updateMany({
      where: {
        id: reviewId,
        OR: [
          { status: 'PENDING' },
          { status: 'PROCESSING', processingStartedAt: { lt: staleBefore } },
        ],
      },
      data: {
        status: 'PROCESSING',
        processingStartedAt: new Date(),
        processingByAdminId: admin.id,
        attempts: { increment: 1 },
        lastError: null,
      },
    });
    const review = await this.prisma.certificateReview.findUnique({
      where: { id: reviewId },
    });
    if (!review) throw new NotFoundException('Review not found.');
    if (claimed.count === 1) return review;

    if (review.status === 'ISSUED' && review.issuedCertificateId) {
      const issued = await this.prisma.certificate.findUnique({
        where: { id: review.issuedCertificateId },
      });
      if (issued)
        return { alreadyIssued: (await this.toAdminViews([issued]))[0] };
    }
    if (review.status === 'PROCESSING')
      throw new ConflictException(
        'This certificate is already being generated. Reload in a moment to see the result.',
      );
    if (review.status === 'DISMISSED')
      throw new ConflictException(
        'This review was dismissed. Reopen it first.',
      );
    throw new ConflictException('This review can no longer be approved.');
  }

  private async releaseReview(reviewId: string, err: unknown): Promise<void> {
    await this.prisma.certificateReview
      .updateMany({
        where: { id: reviewId, status: 'PROCESSING' },
        data: {
          status: 'PENDING',
          processingStartedAt: null,
          lastError: this.reasonOf(err).slice(0, 500),
        },
      })
      .catch((e) =>
        this.logger.error(`Could not release review ${reviewId}: ${e}`),
      );
  }

  // ═══ Replacement (a correction) ═══════════════════════════════════════════

  async replace(
    certificateId: string,
    raw: ReplaceInput,
    admin: CertificateActor,
  ) {
    this.assertCanIssue();
    const reason = (raw.reason ?? '').trim();
    if (!reason)
      throw new BadRequestException(
        'Explain why the certificate is being replaced — it is kept in the audit trail.',
      );

    const original = await this.requireByPublicId(certificateId);
    if (original.status !== 'ACTIVE')
      throw new ConflictException(
        'Only an active certificate can be replaced.',
      );

    const input = this.cleanDetails({
      recipientName: raw.recipientName ?? original.recipientName,
      programName: raw.programName ?? original.programName,
      completionDate: raw.completionDate ?? original.completionDate,
    });
    const withDistinction = raw.withDistinction ?? original.withDistinction;
    const changed =
      input.recipientName !== original.recipientName ||
      input.programName !== original.programName ||
      input.completionDate !== original.completionDate ||
      withDistinction !== original.withDistinction;
    // A certificate issued with an earlier design (or by the previous system) may be
    // re-issued exactly as it is, in the current design: nothing has to be
    // "corrected" for that to be worth doing.
    const designOutdated = original.templateVersion !== TEMPLATE_VERSION;
    if (!changed && !designOutdated)
      throw new BadRequestException(
        'Nothing was corrected. Change the name, programme, completion date or distinction to replace this certificate.',
      );

    const theme = await this.themeFor(
      original.courseId,
      original.themeSnapshot,
    );

    try {
      const next = await this.withIdRetries(async () => {
        const files = await this.generateAndStore({
          ...input,
          withDistinction,
          palette: theme.palette,
        });
        const nextRowId = randomUUID();
        return this.prisma.$transaction(async (tx) => {
          // The original goes first: a student holds one ACTIVE certificate per
          // programme, so it must stop being active before its successor starts.
          const flipped = await tx.certificate.updateMany({
            where: { id: original.id, status: 'ACTIVE' },
            data: {
              status: 'REPLACED',
              replacedAt: new Date(),
              replacedByAdminId: admin.id,
              replacementReason: reason,
              replacedByCertificateId: nextRowId,
            },
          });
          if (flipped.count !== 1)
            throw new ConflictException(
              'This certificate was changed by someone else. Reload and try again.',
            );
          const created = await tx.certificate.create({
            data: this.certificateData(files, {
              studentUserId: original.studentUserId,
              courseId: original.courseId,
              ...input,
              withDistinction,
              theme,
              extra: {
                id: nextRowId,
                replacesCertificateId: original.id,
                issuedByAdminId: admin.id,
                emailStatus: raw.sendEmail === false ? 'SKIPPED' : 'PENDING',
              },
            }),
          });
          await tx.auditLog.createMany({
            data: [
              {
                actorId: admin.id,
                actorRole: admin.role,
                action: 'CERTIFICATE_REPLACED',
                entityType: 'Certificate',
                entityId: original.id,
                reason,
                beforeData: {
                  certificateId: original.certificateId,
                  recipientName: original.recipientName,
                  programName: original.programName,
                  completionDate: original.completionDate,
                  withDistinction: original.withDistinction,
                  templateVersion: original.templateVersion,
                } as Prisma.InputJsonValue,
                afterData: {
                  replacedBy: created.certificateId,
                  recipientName: input.recipientName,
                  programName: input.programName,
                  completionDate: input.completionDate,
                  withDistinction,
                  templateVersion: TEMPLATE_VERSION,
                } as Prisma.InputJsonValue,
              },
              {
                actorId: admin.id,
                actorRole: admin.role,
                action: 'CERTIFICATE_ISSUED',
                entityType: 'Certificate',
                entityId: created.id,
                reason: `Replaces ${original.certificateId}`,
                afterData: this.issuedAudit(created) as Prisma.InputJsonValue,
              },
            ],
          });
          return created;
        });
      });

      if (raw.sendEmail !== false) this.emails.queue(next.id);
      return (await this.toAdminViews([next]))[0];
    } catch (err) {
      throw this.httpError(err);
    }
  }

  // ═══ Revocation ═══════════════════════════════════════════════════════════

  async revoke(certificateId: string, reason: string, admin: CertificateActor) {
    const trimmed = (reason ?? '').trim();
    if (!trimmed)
      throw new BadRequestException(
        'Explain why the certificate is being revoked — it is kept in the audit trail.',
      );
    const cert = await this.requireByPublicId(certificateId);
    await this.prisma.$transaction(async (tx) => {
      const changed = await tx.certificate.updateMany({
        where: { id: cert.id, status: 'ACTIVE' },
        data: {
          status: 'REVOKED',
          revokedAt: new Date(),
          revokedByAdminId: admin.id,
          revocationReason: trimmed,
        },
      });
      if (changed.count !== 1)
        throw new ConflictException(
          cert.status === 'REVOKED'
            ? 'This certificate is already revoked.'
            : 'Only an active certificate can be revoked.',
        );
      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          actorRole: admin.role,
          action: 'CERTIFICATE_REVOKED',
          entityType: 'Certificate',
          entityId: cert.id,
          reason: trimmed,
          beforeData: { status: 'ACTIVE' },
          afterData: {
            status: 'REVOKED',
            certificateId: cert.certificateId,
          } as Prisma.InputJsonValue,
        },
      });
    });
    // The files stay exactly where they are: revoking changes what verification
    // says, never what is stored.
    return (
      await this.toAdminViews([await this.requireByPublicId(certificateId)])
    )[0];
  }

  // ═══ Email ═══════════════════════════════════════════════════════════════

  /** An admin's explicit resend. After a successful send it must be forced. */
  async resendEmail(
    certificateId: string,
    admin: CertificateActor,
    force = false,
  ) {
    const cert = await this.requireByPublicId(certificateId);
    if (cert.status !== 'ACTIVE')
      throw new ConflictException('Only an active certificate can be emailed.');
    if (!cert.pdfKey)
      throw new ConflictException(
        'This certificate has no stored PDF to attach.',
      );
    if (cert.emailStatus === 'SENT' && !force)
      throw new ConflictException(
        'This certificate was already emailed. Send it again only if the student asked for it.',
      );
    if (cert.emailStatus === 'SENDING')
      throw new ConflictException(
        'An email for this certificate is being sent right now.',
      );
    await this.prisma.auditLog.create({
      data: {
        actorId: admin.id,
        actorRole: admin.role,
        action: 'CERTIFICATE_EMAIL_RESENT',
        entityType: 'Certificate',
        entityId: cert.id,
        afterData: {
          previousStatus: cert.emailStatus,
          forced: force,
        } as Prisma.InputJsonValue,
      },
    });
    const outcome = await this.emails.deliver(cert.id, {
      manual: true,
      actorId: admin.id,
    });
    const fresh = await this.requireByPublicId(certificateId);
    return { outcome, certificate: (await this.toAdminViews([fresh]))[0] };
  }

  // ═══ Generation and storage ═══════════════════════════════════════════════

  /** Renders both files and stores them. Returns only after BOTH are in R2 and the
   * stored sizes were checked. Throws (leaving no certificate) on any failure. */
  private async generateAndStore(details: {
    recipientName: string;
    programName: string;
    completionDate: string;
    withDistinction: boolean;
    palette: CertificatePalette;
  }): Promise<GeneratedFiles> {
    // The ISSUE DATE: fixed once, used for the printed date, the ID's year and the
    // stored issuedAt, so the three can never disagree.
    const issuedAt = new Date();
    const certificateId = await generateUniqueCertificateId(
      issuedAt,
      async (candidate) =>
        !!(await this.prisma.certificate.findUnique({
          where: { certificateId: candidate },
          select: { id: true },
        })),
    );
    const verificationUrl = certificateVerificationUrl(certificateId);
    const rendered = await this.renderer.render({
      certificateId,
      recipientName: details.recipientName,
      programName: details.programName,
      completionDate: details.completionDate,
      issueDate: utcToDhakaParts(issuedAt).dateStr,
      verificationUrl,
      withDistinction: details.withDistinction,
      palette: details.palette,
    });

    const keys = this.storage.objectKeysFor({ certificateId, issuedAt });
    await this.storeOnce(keys.pdfKey, rendered.pdf, 'application/pdf');
    await this.storeOnce(keys.pngKey, rendered.png, 'image/png');

    return {
      certificateId,
      issuedAt,
      keys,
      pdfBytes: rendered.pdf.length,
      pngBytes: rendered.png.length,
      pdfSha256: sha256(rendered.pdf),
      pngSha256: sha256(rendered.png),
    };
  }

  private async storeOnce(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<void> {
    await this.storage.putObjectOnce(key, body, contentType);
    const stored = await this.storage.headObject(key);
    if (!stored || stored.sizeBytes !== body.length)
      throw new CertificateStorageError(
        `The file stored at ${key} could not be verified (${stored ? `${stored.sizeBytes} bytes stored, ${body.length} sent` : 'not found'}).`,
        'VerificationFailed',
      );
  }

  private certificateData(
    files: GeneratedFiles,
    d: {
      studentUserId: string;
      courseId: string;
      recipientName: string;
      programName: string;
      completionDate: string;
      withDistinction: boolean;
      theme: ResolvedCertificateTheme;
      extra?: Partial<Prisma.CertificateUncheckedCreateInput>;
    },
  ): Prisma.CertificateUncheckedCreateInput {
    return {
      certificateId: files.certificateId,
      studentUserId: d.studentUserId,
      courseId: d.courseId,
      recipientName: d.recipientName,
      programName: d.programName,
      completionDate: d.completionDate,
      withDistinction: d.withDistinction,
      issuedAt: files.issuedAt,
      theme: d.theme.key,
      themeSnapshot: themeSnapshot(d.theme) as unknown as Prisma.InputJsonValue,
      templateVersion: TEMPLATE_VERSION,
      storageBucket: this.storage.bucket(),
      pdfKey: files.keys.pdfKey,
      pngKey: files.keys.pngKey,
      pdfBytes: files.pdfBytes,
      pngBytes: files.pngBytes,
      pdfSha256: files.pdfSha256,
      pngSha256: files.pngSha256,
      ...d.extra,
    };
  }

  private issuedAudit(c: Certificate) {
    return {
      certificateId: c.certificateId,
      recipientName: c.recipientName,
      programName: c.programName,
      completionDate: c.completionDate,
      issueDate: utcToDhakaParts(c.issuedAt).dateStr,
      withDistinction: c.withDistinction,
      theme: c.theme,
      templateVersion: c.templateVersion,
      pdfKey: c.pdfKey,
      pngKey: c.pngKey,
    };
  }

  /** Retries the whole generate-and-persist step if two issuances ever drew the
   * same ID (the database's unique constraint is the arbiter). */
  private async withIdRetries<T>(work: () => Promise<T>): Promise<T> {
    for (let attempt = 1; ; attempt++) {
      try {
        return await work();
      } catch (err) {
        if (isUniqueViolation(err, 'certificateId') && attempt < 3) continue;
        throw err;
      }
    }
  }

  // ═══ Validation / lookups ═════════════════════════════════════════════════

  private cleanDetails(raw: {
    recipientName: string;
    programName: string;
    completionDate: string;
  }) {
    const recipientName = normalizeCertificateText(raw.recipientName);
    const programName = normalizeCertificateText(raw.programName);
    const completionDate = (raw.completionDate ?? '').trim();
    const problem =
      recipientNameProblem(recipientName) ??
      programNameProblem(programName) ??
      completionDateProblem(completionDate);
    if (problem) throw new BadRequestException(problem);
    return { recipientName, programName, completionDate };
  }

  /** The frontend URL must be valid even to PREVIEW (the QR code encodes it). */
  private assertCanIssueFrontend(): void {
    const problem = frontendUrlProblem();
    if (problem) throw new ServiceUnavailableException(problem);
  }

  /** A programme's theme comes from its category now; a programme that no longer
   * exists keeps the theme its certificate was issued with. */
  private async themeFor(
    courseId: string,
    fallbackSnapshot?: Prisma.JsonValue,
  ): Promise<ResolvedCertificateTheme> {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { category: true, slug: true },
    });
    if (course) return resolveCertificateTheme(course);
    const snap = fallbackSnapshot as Partial<ResolvedCertificateTheme> | null;
    if (snap?.palette && snap.key)
      return {
        key: snap.key,
        label: snap.label ?? snap.key,
        accent: snap.accent ?? '',
        palette: snap.palette,
      };
    return resolveCertificateTheme({});
  }

  private async requireByPublicId(certificateId: string): Promise<Certificate> {
    const id = parseVerifiableCertificateId(certificateId);
    const cert = id
      ? await this.prisma.certificate.findUnique({
          where: { certificateId: id },
        })
      : null;
    if (!cert) throw new NotFoundException(NOT_FOUND);
    return cert;
  }

  // ═══ Errors ══════════════════════════════════════════════════════════════

  private reasonOf(err: unknown): string {
    if (err instanceof FrontendUrlError) return err.message;
    if (err instanceof CertificateRenderError) return err.message;
    if (err instanceof CertificateStorageError)
      return describeStorageError(err);
    return err instanceof Error ? err.message : String(err);
  }

  /** Turns a failure into what the admin should be told. Anything already an HTTP
   * exception (validation, conflicts) passes through. */
  private httpError(err: unknown): Error {
    if (err instanceof FrontendUrlError)
      return new ServiceUnavailableException(err.message);
    if (err instanceof CertificateObjectExistsError)
      return new ConflictException(
        'A file for this certificate already exists in storage and was not overwritten. Nothing was issued — try again.',
      );
    if (err instanceof CertificateStorageError)
      return new BadGatewayException(
        `Storing the certificate files failed (${describeStorageError(err)}). Nothing was issued and no email was sent — you can try again.`,
      );
    if (err instanceof CertificateRenderError)
      return new ServiceUnavailableException(
        `${err.message} Nothing was issued and no email was sent.`,
      );
    if (isOneActivePerProgramViolation(err))
      return new ConflictException(
        'This student already has an active certificate for this programme.',
      );
    if (err instanceof Error && 'getStatus' in err) return err;
    this.logger.error(
      `Certificate operation failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    return new BadGatewayException(
      'The certificate could not be issued because of an unexpected error. Nothing was issued; you can try again.',
    );
  }

  // ═══ Admin reads ══════════════════════════════════════════════════════════

  async listIssued(params: {
    status?: CertificateStatus;
    page?: number;
    limit?: number;
    search?: string;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 25));
    const where: Prisma.CertificateWhereInput = {};
    if (params.status) where.status = params.status;
    const search = params.search?.trim();
    if (search) {
      const users = await this.prisma.user.findMany({
        where: {
          OR: [
            { fullName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        },
        select: { id: true },
        take: 200,
      });
      where.OR = [
        { certificateId: { contains: search.toUpperCase() } },
        { recipientName: { contains: search, mode: 'insensitive' } },
        { programName: { contains: search, mode: 'insensitive' } },
        { studentUserId: { in: users.map((u) => u.id) } },
      ];
    }
    const [total, rows] = await Promise.all([
      this.prisma.certificate.count({ where }),
      this.prisma.certificate.findMany({
        where,
        orderBy: { issuedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return {
      items: await this.toAdminViews(rows),
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async getForAdmin(certificateId: string) {
    const cert = await this.requireByPublicId(certificateId);
    return (await this.toAdminViews([cert]))[0];
  }

  /** Who did what, newest first: this certificate's own events, those of the
   * review it came from, and those of the certificates it replaced / was
   * replaced by. */
  async history(certificateId: string) {
    const cert = await this.requireByPublicId(certificateId);
    const certIds = [
      cert.id,
      cert.replacesCertificateId,
      cert.replacedByCertificateId,
    ].filter((x): x is string => !!x);
    const rows = await this.prisma.auditLog.findMany({
      where: {
        OR: [
          { entityType: 'Certificate', entityId: { in: certIds } },
          ...(cert.reviewId
            ? [{ entityType: 'CertificateReview', entityId: cert.reviewId }]
            : []),
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    const actorIds = [
      ...new Set(rows.map((r) => r.actorId).filter((id) => id !== 'system')),
    ];
    const actors = await this.prisma.user.findMany({
      where: { id: { in: actorIds } },
      select: { id: true, fullName: true },
    });
    const nameOf = new Map(actors.map((a) => [a.id, a.fullName]));
    return rows.map((r) => ({
      id: r.id,
      action: r.action,
      entityType: r.entityType,
      at: r.createdAt,
      actorId: r.actorId,
      actorName:
        r.actorId === 'system'
          ? 'System'
          : (nameOf.get(r.actorId) ?? 'Unknown admin'),
      actorRole: r.actorRole,
      reason: r.reason,
      before: r.beforeData,
      after: r.afterData,
    }));
  }

  /** The bytes of a stored file, for an admin (any status — the records are kept)
   * or for the student it belongs to (active certificates only). */
  async readFile(
    certificateId: string,
    kind: CertificateFileKind,
    viewer: { role: 'ADMIN' } | { role: 'STUDENT'; userId: string },
  ): Promise<CertificateFile> {
    const cert = await this.requireByPublicId(certificateId);
    if (viewer.role === 'STUDENT') {
      if (cert.studentUserId !== viewer.userId || cert.status !== 'ACTIVE')
        throw new NotFoundException(NOT_FOUND);
    }
    const fileName = `Lumexa-Certificate-${cert.certificateId}.${kind}`;
    const key = kind === 'pdf' ? cert.pdfKey : cert.pngKey;
    if (key) {
      try {
        const body = await this.storage.getObject(key);
        return {
          body,
          contentType: kind === 'pdf' ? 'application/pdf' : 'image/png',
          fileName,
        };
      } catch (err) {
        this.logger.error(
          `Could not read ${key}: ${describeStorageError(err)}`,
        );
        throw new BadGatewayException(
          'The certificate file could not be read right now. Please try again.',
        );
      }
    }
    // A certificate from the previous system: its PDF is still on Cloudinary.
    if (kind === 'pdf' && cert.pdfUrl) {
      const res = await fetch(cert.pdfUrl).catch(() => null);
      if (res?.ok)
        return {
          body: Buffer.from(await res.arrayBuffer()),
          contentType: 'application/pdf',
          fileName,
        };
      throw new BadGatewayException(
        'The certificate file could not be read right now. Please try again.',
      );
    }
    throw new NotFoundException('This certificate has no image.');
  }

  // ═══ Student reads and the one thing a student may write ══════════════════

  async listForStudent(studentUserId: string) {
    const rows = await this.prisma.certificate.findMany({
      where: { studentUserId },
      orderBy: { issuedAt: 'desc' },
    });
    const successors = await this.publicIdsOf(
      rows.map((r) => r.replacedByCertificateId),
    );
    return rows.map((c) => this.toStudentView(c, successors));
  }

  /** The newest active certificate the student has not yet seen — for the
   * "your certificate is ready" card on their home page. */
  async latestAchievement(studentUserId: string) {
    const cert = await this.prisma.certificate.findFirst({
      where: { studentUserId, status: 'ACTIVE', achievementSeenAt: null },
      orderBy: { issuedAt: 'desc' },
    });
    return cert ? this.toStudentView(cert, new Map()) : null;
  }

  /** Marks the achievement card as seen. The student can do this for their own
   * certificate only; it changes nothing else. */
  async markSeen(studentUserId: string, certificateId: string) {
    const id = parseVerifiableCertificateId(certificateId);
    if (!id) throw new NotFoundException(NOT_FOUND);
    const updated = await this.prisma.certificate.updateMany({
      where: { certificateId: id, studentUserId, achievementSeenAt: null },
      data: { achievementSeenAt: new Date() },
    });
    if (updated.count === 0) {
      const own = await this.prisma.certificate.findFirst({
        where: { certificateId: id, studentUserId },
        select: { id: true },
      });
      if (!own) throw new NotFoundException(NOT_FOUND);
    }
    return { seen: true };
  }

  // ═══ Public verification ═════════════════════════════════════════════════

  /** What anyone with the link (or the QR code) may learn. ONLY certificate
   * facts: no email, phone, date of birth, account id or academic record — the
   * select below is the whole of what is read, and the response is built from it
   * field by field. */
  async verify(idParam: string) {
    const id = parseVerifiableCertificateId(idParam);
    if (!id) throw new NotFoundException(NOT_FOUND);
    const c = await this.prisma.certificate.findUnique({
      where: { certificateId: id },
      select: {
        certificateId: true,
        status: true,
        recipientName: true,
        programName: true,
        completionDate: true,
        issuedAt: true,
        revokedAt: true,
        replacedAt: true,
        replacedByCertificateId: true,
      },
    });
    if (!c) throw new NotFoundException(NOT_FOUND);

    let replacedBy: { certificateId: string; issueDate: string } | null = null;
    if (c.status === 'REPLACED' && c.replacedByCertificateId) {
      const next = await this.prisma.certificate.findUnique({
        where: { id: c.replacedByCertificateId },
        select: { certificateId: true, issuedAt: true },
      });
      if (next)
        replacedBy = {
          certificateId: next.certificateId,
          issueDate: utcToDhakaParts(next.issuedAt).dateStr,
        };
    }
    return {
      certificateId: c.certificateId,
      status: c.status,
      recipientName: c.recipientName,
      programName: c.programName,
      completionDate: c.completionDate,
      issueDate: utcToDhakaParts(c.issuedAt).dateStr,
      issuedBy: ISSUER_NAME,
      revokedOn:
        c.status === 'REVOKED' && c.revokedAt
          ? utcToDhakaParts(c.revokedAt).dateStr
          : null,
      replacedOn:
        c.status === 'REPLACED' && c.replacedAt
          ? utcToDhakaParts(c.replacedAt).dateStr
          : null,
      replacedBy,
    };
  }

  // ═══ View models ═════════════════════════════════════════════════════════

  private async publicIdsOf(
    rowIds: (string | null)[],
  ): Promise<Map<string, string>> {
    const ids = [...new Set(rowIds.filter((x): x is string => !!x))];
    if (ids.length === 0) return new Map();
    const rows = await this.prisma.certificate.findMany({
      where: { id: { in: ids } },
      select: { id: true, certificateId: true },
    });
    return new Map(rows.map((r) => [r.id, r.certificateId]));
  }

  private toStudentView(c: Certificate, successors: Map<string, string>) {
    const hasFile = !!c.pdfKey || !!c.pdfUrl;
    return {
      certificateId: c.certificateId,
      status: c.status,
      // The student's own programme id: lets the Learning page link a completed
      // programme to its certificate.
      courseId: c.courseId,
      programName: c.programName,
      recipientName: c.recipientName,
      completionDate: c.completionDate,
      issueDate: utcToDhakaParts(c.issuedAt).dateStr,
      verificationUrl: certificateVerificationUrlSafe(c.certificateId),
      // Revoked and replaced certificates are listed, but their files are not
      // offered to the student.
      canDownload: c.status === 'ACTIVE' && hasFile,
      hasImage: c.status === 'ACTIVE' && !!c.pngKey,
      isLegacy: c.templateVersion === LEGACY_MARKER,
      theme: c.theme,
      seen: c.achievementSeenAt !== null,
      replacedBy: c.replacedByCertificateId
        ? (successors.get(c.replacedByCertificateId) ?? null)
        : null,
    };
  }

  private async toAdminViews(rows: Certificate[]) {
    const [users, links] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: [...new Set(rows.map((r) => r.studentUserId))] } },
        select: { id: true, fullName: true, email: true },
      }),
      this.publicIdsOf(
        rows.flatMap((r) => [
          r.replacedByCertificateId,
          r.replacesCertificateId,
        ]),
      ),
    ]);
    const userById = new Map(users.map((u) => [u.id, u]));
    return rows.map((c) => {
      // What the certificate was printed with, read from the snapshot stored on it
      // (never from today's palette), so it reads the same whatever changes later.
      const snapshot = c.themeSnapshot as {
        label?: string;
        palette?: { ribbon?: string[] };
      } | null;
      return {
        id: c.id,
        certificateId: c.certificateId,
        status: c.status,
        studentUserId: c.studentUserId,
        student: userById.get(c.studentUserId) ?? null,
        courseId: c.courseId,
        recipientName: c.recipientName,
        programName: c.programName,
        completionDate: c.completionDate,
        withDistinction: c.withDistinction,
        issuedAt: c.issuedAt,
        issueDate: utcToDhakaParts(c.issuedAt).dateStr,
        theme: c.theme,
        themeLabel: snapshot?.label ?? c.theme,
        themeColor: snapshot?.palette?.ribbon?.[1] ?? null,
        templateVersion: c.templateVersion,
        isLegacy: c.templateVersion === LEGACY_MARKER,
        // Issued with an earlier design (or by the previous system): may be
        // re-issued as it is, in the current design.
        designOutdated: c.templateVersion !== TEMPLATE_VERSION,
        verificationUrl: certificateVerificationUrlSafe(c.certificateId),
        files: {
          pdf: !!c.pdfKey || !!c.pdfUrl,
          png: !!c.pngKey,
          pdfBytes: c.pdfBytes,
          pngBytes: c.pngBytes,
        },
        issuedByAdminId: c.issuedByAdminId,
        replaces: c.replacesCertificateId
          ? (links.get(c.replacesCertificateId) ?? null)
          : null,
        replacedBy: c.replacedByCertificateId
          ? (links.get(c.replacedByCertificateId) ?? null)
          : null,
        replacedAt: c.replacedAt,
        replacementReason: c.replacementReason,
        revokedAt: c.revokedAt,
        revocationReason: c.revocationReason,
        email: {
          status: c.emailStatus,
          attempts: c.emailAttempts,
          lastError: c.emailLastError,
          sentAt: c.emailSentAt,
          recipient: c.emailRecipient,
        },
      };
    });
  }
}

/** The verification URL, or null when FRONTEND_URL is unusable (a read must not
 * fail because of it; issuing is what refuses). */
function certificateVerificationUrlSafe(certificateId: string): string | null {
  try {
    return certificateVerificationUrl(certificateId);
  } catch {
    return null;
  }
}
