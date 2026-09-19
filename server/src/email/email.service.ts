// FILE PATH: server/src/email/email.service.ts
//
// The ONLY place that talks to an SMTP server. Gmail SMTP + Nodemailer only
// (no SendGrid/Resend/SES/Mailgun/Firebase — see EMAIL_SETUP.md). Every
// caller goes through `send()`, which:
//   1. Journals the email as an EmailLog row (PENDING) — this is both the
//      delivery-status record and the lightweight "queue": the caller never
//      awaits SMTP, it fires-and-forgets `deliver()` right after the DB
//      write returns, so a slow/unavailable mail server never blocks an API
//      request.
//   2. Attempts delivery inline with a short exponential-backoff retry loop
//      (covers transient SMTP hiccups without needing a broker).
//   3. Updates the row to SENT/FAILED. A cron sweep (retrySweep) picks up
//      anything still FAILED after that — e.g. a longer Gmail outage — up
//      to MAX_ATTEMPTS, using the row's own stored `html`/`metadata` so a
//      retry never needs the original caller to re-run.
//
// Idempotency: pass `dedupeKey` for any notification that must fire at most
// once per real-world event (a specific booking confirmed, a specific
// certificate issued). The DB's unique constraint on EmailLog.dedupeKey
// turns a duplicate attempt into a harmless no-op (P2002), the same pattern
// StudentLedgerService uses for LESSON_COMPLETED rows.

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../prisma.service';

export interface EmailAttachment {
  filename: string;
  /** Local file path or a remote URL Nodemailer can fetch — never inline
   *  binary, so attachments survive a later cron retry without regenerating
   *  anything (see the EmailLog.metadata doc comment in schema.prisma). */
  path: string;
  contentType?: string;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  /** Informational grouping for the EmailLog table (e.g. "STUDENT_WELCOME") — a plain string, not an enum, so a new notification type never needs a migration. */
  category: string;
  /** Set to make this send idempotent — a duplicate call with the same key is a silent no-op. Omit only for notifications that are legitimately resendable (e.g. a fresh forgot-password request). */
  dedupeKey?: string;
  relatedUserId?: string;
  attachments?: EmailAttachment[];
}

const MAX_ATTEMPTS = 5;
const INLINE_RETRY_DELAYS_MS = [1000, 3000]; // two quick in-process retries before falling back to the cron sweep

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    const { SMTP_USER, SMTP_PASS } = process.env;
    if (!SMTP_USER || !SMTP_PASS) {
      this.logger.warn(
        'SMTP_USER/SMTP_PASS are not set — outbound email is disabled (sends will be journaled as FAILED and logged only).',
      );
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 465,
      secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : true,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }

  private get fromAddress(): string {
    const user = process.env.SMTP_USER || `noreply@${process.env.EMAIL_DOMAIN || 'lumexa.app'}`;
    return `Lumexa <${user}>`;
  }

  /** Journals + fires an email without blocking the caller. Never throws —
   * failures are recorded on the EmailLog row and logged, matching the
   * fire-and-forget `.catch(() => {})` convention every existing
   * notification call site already uses. */
  async send(params: SendEmailParams): Promise<void> {
    let logId: string;
    try {
      const log = await this.prisma.emailLog.create({
        data: {
          toEmail: params.to,
          subject: params.subject,
          html: params.html,
          category: params.category,
          dedupeKey: params.dedupeKey,
          relatedUserId: params.relatedUserId,
          metadata: params.attachments
            ? ({ attachments: params.attachments } as object)
            : undefined,
        },
        select: { id: true },
      });
      logId = log.id;
    } catch (err: any) {
      if (err?.code === 'P2002') return; // already sent/queued for this dedupeKey — idempotent no-op
      this.logger.error(`Failed to journal email to ${params.to}: ${err}`);
      return;
    }

    // Fire-and-forget on purpose — callers never await mail delivery.
    void this.deliverWithRetry(logId, params.to, params.subject, params.html, params.attachments);
  }

  private async deliverWithRetry(
    logId: string,
    to: string,
    subject: string,
    html: string,
    attachments?: EmailAttachment[],
  ): Promise<void> {
    for (let attempt = 0; attempt <= INLINE_RETRY_DELAYS_MS.length; attempt++) {
      const ok = await this.attemptDelivery(logId, to, subject, html, attachments);
      if (ok) return;
      if (attempt < INLINE_RETRY_DELAYS_MS.length) {
        await sleep(INLINE_RETRY_DELAYS_MS[attempt]);
      }
    }
    // Exhausted inline retries — left FAILED for the cron sweep below.
  }

  private async attemptDelivery(
    logId: string,
    to: string,
    subject: string,
    html: string,
    attachments?: EmailAttachment[],
  ): Promise<boolean> {
    if (!this.transporter) {
      await this.prisma.emailLog
        .update({
          where: { id: logId },
          data: {
            status: 'FAILED',
            lastError: 'SMTP is not configured (SMTP_USER/SMTP_PASS missing).',
            attempts: { increment: 1 },
          },
        })
        .catch(() => {});
      return false;
    }

    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to,
        subject,
        html,
        attachments,
      });
      await this.prisma.emailLog.update({
        where: { id: logId },
        data: { status: 'SENT', sentAt: new Date(), attempts: { increment: 1 } },
      });
      return true;
    } catch (err) {
      this.logger.error(`Failed to send "${subject}" to ${to}: ${err}`);
      await this.prisma.emailLog
        .update({
          where: { id: logId },
          data: {
            status: 'FAILED',
            lastError: String((err as Error)?.message ?? err).slice(0, 1000),
            attempts: { increment: 1 },
          },
        })
        .catch(() => {});
      return false;
    }
  }

  // ─── Retry sweep — safety net for outages longer than the inline retries ──

  @Cron(CronExpression.EVERY_5_MINUTES)
  async retrySweep() {
    if (!this.transporter) return;

    const stuck = await this.prisma.emailLog.findMany({
      where: { status: 'FAILED', attempts: { lt: MAX_ATTEMPTS } },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });
    if (stuck.length === 0) return;

    let recovered = 0;
    for (const row of stuck) {
      const attachments = (row.metadata as { attachments?: EmailAttachment[] } | null)?.attachments;
      const ok = await this.attemptDelivery(row.id, row.toEmail, row.subject, row.html, attachments);
      if (ok) recovered++;
    }
    if (recovered > 0) {
      this.logger.log(`Retry sweep recovered ${recovered}/${stuck.length} previously failed email(s).`);
    }
  }
}
