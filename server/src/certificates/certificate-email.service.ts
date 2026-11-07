// FILE PATH: server/src/certificates/certificate-email.service.ts
//
// The congratulatory email: sent once a certificate has been issued AND stored,
// with the actual stored PDF attached.
//
// Retry-safe and duplicate-safe, by construction:
//
//   • State lives on the certificate (emailStatus). Delivery starts by CLAIMING it
//     with a compare-and-set (PENDING/FAILED → SENDING). Of any number of
//     concurrent callers — the request that issued the certificate, the retry
//     sweep, an admin's click — exactly one claims it; the rest do nothing.
//   • SENT is terminal. Nothing automatic ever leaves it, so a retry can never send
//     a second congratulation.
//   • An attempt whose outcome is UNKNOWN (the mail server was slow, the process
//     died mid-send) is never simply re-sent. It stays SENDING until the sweep
//     checks the EmailLog row of that very attempt: SENT there → we mark it SENT;
//     FAILED there → we may try again; no row at all → it never reached SMTP.
//   • The PDF is re-read from storage on every attempt (never copied into a
//     retry queue), so a retry attaches exactly the file that was issued.
//   • Automatic retries are capped (MAX_AUTOMATIC_ATTEMPTS, with growing waits).
//     After that an admin can resend explicitly; a resend after SENT must be
//     forced, since it is a deliberate duplicate.
//
// Recipient: the student's billing contact (their parent) when there is one, else
// the student's own account address — the same rule every other Lumexa notice to a
// student's family uses.
//
// Nothing here runs unless the certificate exists, is ACTIVE and has its PDF.

import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CERTIFICATE_STORAGE,
  type CertificateStorage,
} from './certificate-storage.service';
import {
  certificateVerificationUrl,
  programCatalogueUrl,
  studentCertificatesUrl,
} from './certificate-config';
import { formatCertificateDate } from './template/certificate-template';

/** Automatic attempts per certificate (the first plus retries). */
export const MAX_AUTOMATIC_ATTEMPTS = 5;
/** How long to wait after a failed attempt before the sweep tries again, by the
 * number of attempts made so far. */
const RETRY_WAIT_MS = [0, 5, 15, 45, 120].map((m) => m * 60_000);
/** An attempt in flight longer than this is reconciled against the EmailLog. */
const SENDING_LEASE_MS = 3 * 60_000;
/** A PENDING row this old was never picked up (the process died first). */
const PENDING_GRACE_MS = 60_000;

export type DeliveryOutcome =
  | 'sent'
  | 'failed'
  | 'unknown'
  | 'skipped'
  | 'busy';

const SYSTEM = { id: 'system', role: 'SYSTEM' };

@Injectable()
export class CertificateEmailService {
  private readonly logger = new Logger(CertificateEmailService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    @Inject(CERTIFICATE_STORAGE) private readonly storage: CertificateStorage,
  ) {}

  /** Deliveries started by queue() that have not finished yet. */
  private readonly inFlight = new Set<Promise<unknown>>();

  /** Fire-and-forget entry point used right after a certificate is issued. */
  queue(certificateRowId: string): void {
    const run: Promise<unknown> = this.deliver(certificateRowId)
      .catch((err) =>
        this.logger.error(
          `Certificate email ${certificateRowId} failed unexpectedly: ${err}`,
        ),
      )
      .finally(() => this.inFlight.delete(run));
    this.inFlight.add(run);
  }

  /** Resolves once every delivery started by queue() has finished (sent, failed or
   * handed to the sweep). Lets a shutdown — or a spec — wait for mail in flight. */
  async idle(): Promise<void> {
    while (this.inFlight.size > 0) {
      await Promise.allSettled([...this.inFlight]);
    }
  }

  /** One delivery attempt. `manual` is an admin's explicit resend: it may start
   * from FAILED, SKIPPED or SENT and is not limited by the automatic cap. */
  async deliver(
    certificateRowId: string,
    options: { manual?: boolean; actorId?: string } = {},
  ): Promise<DeliveryOutcome> {
    const now = new Date();
    const startable: Prisma.CertificateWhereInput = options.manual
      ? { emailStatus: { in: ['PENDING', 'FAILED', 'SKIPPED', 'SENT'] } }
      : {
          OR: [{ emailStatus: 'PENDING' }, { emailStatus: 'FAILED' }],
          emailAttempts: { lt: MAX_AUTOMATIC_ATTEMPTS },
        };
    const claimed = await this.prisma.certificate.updateMany({
      where: { id: certificateRowId, status: 'ACTIVE', ...startable },
      data: {
        emailStatus: 'SENDING',
        emailSendingSince: now,
        emailAttempts: { increment: 1 },
      },
    });
    if (claimed.count !== 1) return 'busy';

    const cert = await this.prisma.certificate.findUniqueOrThrow({
      where: { id: certificateRowId },
    });
    const attempt = cert.emailAttempts;

    if (!cert.pdfKey) {
      // A certificate from the previous system: that system emailed it already.
      await this.settle(
        cert.id,
        'SKIPPED',
        'This certificate has no stored PDF to attach.',
      );
      return 'skipped';
    }

    const student = await this.prisma.user.findUnique({
      where: { id: cert.studentUserId },
      select: {
        id: true,
        fullName: true,
        email: true,
        billingContactEmail: true,
      },
    });
    const to = (
      student?.billingContactEmail?.trim() ||
      student?.email ||
      ''
    ).trim();
    if (!student || !to) {
      return this.fail(
        cert.id,
        'There is no email address on file for this student.',
      );
    }

    let links: {
      certificateUrl: string;
      verificationUrl: string;
      catalogueUrl: string;
    };
    try {
      links = {
        certificateUrl: studentCertificatesUrl(cert.certificateId),
        verificationUrl: certificateVerificationUrl(cert.certificateId),
        catalogueUrl: programCatalogueUrl(),
      };
    } catch (err) {
      return this.fail(
        cert.id,
        err instanceof Error ? err.message : String(err),
      );
    }

    let pdf: Buffer;
    try {
      pdf = await this.storage.getObject(cert.pdfKey);
    } catch (err) {
      return this.fail(
        cert.id,
        `The stored certificate PDF could not be read: ${err instanceof Error ? err.message : err}`,
      );
    }

    const result = await this.notifications.sendCertificateIssuedEmail({
      to,
      studentUserId: student.id,
      certificateRowId: cert.id,
      attempt,
      studentFirstName: firstNameOf(student.fullName),
      programName: cert.programName,
      completionDate: formatCertificateDate(cert.completionDate),
      certificateId: cert.certificateId,
      certificateUrl: links.certificateUrl,
      verificationUrl: links.verificationUrl,
      programCatalogueUrl: links.catalogueUrl,
      pdf,
    });

    if (result.ok) {
      await this.prisma.certificate.update({
        where: { id: cert.id },
        data: {
          emailStatus: 'SENT',
          emailSentAt: new Date(),
          emailLastError: null,
          emailSendingSince: null,
          emailRecipient: to,
          emailLogId: result.logId ?? null,
        },
      });
      await this.audit(cert.id, 'CERTIFICATE_EMAIL_SENT', options.actorId, {
        attempt,
        to,
      });
      return 'sent';
    }
    if (result.pending || result.duplicate) {
      // Unknown outcome: do NOT retry blindly. The sweep reconciles it.
      await this.prisma.certificate.update({
        where: { id: cert.id },
        data: {
          emailLogId: result.logId ?? cert.emailLogId,
          emailRecipient: to,
        },
      });
      return 'unknown';
    }
    await this.audit(cert.id, 'CERTIFICATE_EMAIL_FAILED', options.actorId, {
      attempt,
      to,
      error: result.error ?? null,
    });
    return this.fail(
      cert.id,
      result.error ?? 'The mail server rejected the message.',
      to,
      result.logId,
    );
  }

  /** Sets the state after a failed attempt. */
  private async fail(
    id: string,
    message: string,
    to?: string,
    logId?: string,
  ): Promise<DeliveryOutcome> {
    await this.prisma.certificate.update({
      where: { id },
      data: {
        emailStatus: 'FAILED',
        emailLastError: message.slice(0, 500),
        emailSendingSince: null,
        ...(to ? { emailRecipient: to } : {}),
        ...(logId ? { emailLogId: logId } : {}),
      },
    });
    return 'failed';
  }

  private async settle(
    id: string,
    status: 'SKIPPED' | 'FAILED',
    message: string,
  ): Promise<void> {
    await this.prisma.certificate.update({
      where: { id },
      data: {
        emailStatus: status,
        emailLastError: message,
        emailSendingSince: null,
      },
    });
  }

  private async audit(
    certificateRowId: string,
    action: string,
    actorId: string | undefined,
    afterData: Record<string, unknown>,
  ): Promise<void> {
    await this.prisma.auditLog
      .create({
        data: {
          actorId: actorId ?? SYSTEM.id,
          actorRole: actorId ? 'ADMIN' : SYSTEM.role,
          action,
          entityType: 'Certificate',
          entityId: certificateRowId,
          afterData: afterData as Prisma.InputJsonValue,
        },
      })
      .catch((err) =>
        this.logger.error(
          `Audit log failed for certificate email ${certificateRowId}: ${err}`,
        ),
      );
  }

  // ─── Sweep ───────────────────────────────────────────────────────────────

  /** Resolves attempts whose outcome was unknown, then retries what is due. */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async retrySweep(): Promise<void> {
    await this.reconcileInFlight();

    const now = Date.now();
    const candidates = await this.prisma.certificate.findMany({
      where: {
        status: 'ACTIVE',
        pdfKey: { not: null },
        emailAttempts: { lt: MAX_AUTOMATIC_ATTEMPTS },
        OR: [{ emailStatus: 'PENDING' }, { emailStatus: 'FAILED' }],
      },
      orderBy: { updatedAt: 'asc' },
      take: 20,
      select: {
        id: true,
        emailStatus: true,
        emailAttempts: true,
        updatedAt: true,
      },
    });
    for (const c of candidates) {
      const wait =
        c.emailStatus === 'PENDING'
          ? PENDING_GRACE_MS
          : RETRY_WAIT_MS[Math.min(c.emailAttempts, RETRY_WAIT_MS.length - 1)];
      if (now - c.updatedAt.getTime() < wait) continue;
      try {
        await this.deliver(c.id);
      } catch (err) {
        this.logger.error(`Certificate email retry ${c.id} failed: ${err}`);
      }
    }
  }

  /** For every attempt stuck in SENDING: what did the mail system actually do? */
  async reconcileInFlight(): Promise<void> {
    const stuck = await this.prisma.certificate.findMany({
      where: {
        emailStatus: 'SENDING',
        emailSendingSince: { lt: new Date(Date.now() - SENDING_LEASE_MS) },
      },
      take: 50,
      select: { id: true, emailAttempts: true, emailRecipient: true },
    });
    for (const c of stuck) {
      const log = await this.prisma.emailLog.findUnique({
        where: { dedupeKey: `certificate:${c.id}:attempt:${c.emailAttempts}` },
        select: { id: true, status: true, sentAt: true, lastError: true },
      });
      if (log?.status === 'SENT') {
        await this.prisma.certificate.update({
          where: { id: c.id },
          data: {
            emailStatus: 'SENT',
            emailSentAt: log.sentAt ?? new Date(),
            emailLastError: null,
            emailSendingSince: null,
            emailLogId: log.id,
          },
        });
      } else if (log?.status === 'PENDING') {
        // Still being attempted by the mail system; look again next time.
        continue;
      } else {
        await this.prisma.certificate.update({
          where: { id: c.id },
          data: {
            emailStatus: 'FAILED',
            emailLastError: (
              log?.lastError ??
              'The send was interrupted before it reached the mail server.'
            ).slice(0, 500),
            emailSendingSince: null,
            ...(log ? { emailLogId: log.id } : {}),
          },
        });
      }
    }
  }
}

/** "Nusrat Jahan Tamanna" → "Nusrat". */
export function firstNameOf(fullName: string | null | undefined): string {
  return (fullName ?? '').trim().split(/\s+/)[0] ?? '';
}
