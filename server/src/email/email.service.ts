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
import { BrevoTransport, type MailTransport } from './brevo-transport';

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

/** The error stored on the EmailLog row (shown to admins). A timeout or
 * "network unreachable" to an SMTP port almost always means the host blocks
 * outbound SMTP, which is worth saying plainly. */
export function describeSendError(err: unknown): string {
  const message = String((err as Error)?.message ?? err);
  const code = (err as { code?: string })?.code ?? '';
  const blocked =
    /^(ETIMEDOUT|ENETUNREACH|ECONNECTION|ESOCKET)$/.test(code) ||
    /connection timeout|ENETUNREACH|ETIMEDOUT/i.test(message);
  return (
    blocked
      ? `${message} — the host may be blocking outbound SMTP (Render's free tier blocks ports 25/465/587). Set EMAIL_PROVIDER=brevo or use a paid instance.`
      : message
  ).slice(0, 1000);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: MailTransport | null = null;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    // EMAIL_PROVIDER=brevo sends over HTTPS (for hosts that block SMTP, e.g.
    // Render's free tier); anything else is Gmail/SMTP as before.
    if ((process.env.EMAIL_PROVIDER || '').toLowerCase() === 'brevo') {
      const key = process.env.BREVO_API_KEY;
      if (!key || !this.senderAddress) {
        this.logger.warn(
          'EMAIL_PROVIDER=brevo needs BREVO_API_KEY and EMAIL_FROM_ADDRESS (a sender verified in Brevo) — outbound email is disabled (sends will be journaled as FAILED and logged only).',
        );
        return;
      }
      this.transporter = new BrevoTransport(key);
      this.logger.log('Outbound email: Brevo (HTTPS).');
      return;
    }

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
      // Fail in seconds, not minutes, when the host blocks the port.
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 30_000,
    });
  }

  /** The From address: EMAIL_FROM_ADDRESS (Brevo) or the SMTP account (Gmail
   * only honours a From it owns, so it is always SMTP_USER there). */
  private get senderAddress(): string | undefined {
    return process.env.EMAIL_FROM_ADDRESS || process.env.SMTP_USER || undefined;
  }

  private get fromAddress(): string {
    const user = this.senderAddress || `noreply@${process.env.EMAIL_DOMAIN || 'lumexa.app'}`;
    // Gmail only honours a From address it owns (the authenticated SMTP_USER
    // or a verified "Send mail as" alias), so the address is always SMTP_USER;
    // only the display name is configurable.
    const name = (process.env.EMAIL_FROM_NAME || 'Lumexa AI School').replace(/["<>\r\n]/g, '');
    return `"${name}" <${user}>`;
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

  /** Like send(), but WAITS for the first delivery attempt and reports what
   * actually happened — for the few places that must not claim "delivered"
   * unless it was (e.g. a teacher sharing a report card with a parent).
   *
   * `ok` means the SMTP server accepted the message; it is never true when
   * SMTP is not configured. A failed attempt is journaled FAILED and parked
   * at MAX_ATTEMPTS so the retry sweep never re-sends it later — the caller
   * shows the failure and the user retries explicitly (with a fresh
   * dedupeKey), so the same message can never be delivered twice. If the
   * attempt outlives `timeoutMs` the result is `ok: false` with
   * `pending: true`: the send may still complete, and the EmailLog row
   * (returned as `logId`) is the source of truth for the final status. */
  async sendTracked(
    params: SendEmailParams,
    timeoutMs = 25_000,
  ): Promise<{
    ok: boolean;
    logId?: string;
    pending?: boolean;
    duplicate?: boolean;
    error?: string;
  }> {
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
          attempts: MAX_ATTEMPTS, // parked: the retry sweep must not touch it
        },
        select: { id: true },
      });
      logId = log.id;
    } catch (err) {
      if ((err as { code?: string } | null)?.code === 'P2002') {
        return {
          ok: false,
          duplicate: true,
          error: 'This message was already sent.',
        };
      }
      this.logger.error(
        `Failed to journal tracked email to ${params.to}: ${String(err)}`,
      );
      return { ok: false, error: 'Could not record the email for delivery.' };
    }

    if (!this.transporter) {
      // Journals the failure on the EmailLog row.
      await this.attemptDelivery(
        logId,
        params.to,
        params.subject,
        params.html,
        params.attachments,
      );
      return {
        ok: false,
        logId,
        error:
          'Email delivery is not configured on this server (SMTP_USER / SMTP_PASS are not set), so nothing was sent.',
      };
    }

    const attempt = this.attemptDelivery(
      logId,
      params.to,
      params.subject,
      params.html,
      params.attachments,
    );
    let timer: NodeJS.Timeout | undefined;
    const timedOut = new Promise<'timeout'>((resolve) => {
      timer = setTimeout(() => resolve('timeout'), timeoutMs);
    });
    const outcome = await Promise.race([
      attempt.then((ok) => ({ ok })),
      timedOut,
    ]).finally(() => clearTimeout(timer));
    if (outcome === 'timeout') {
      return {
        ok: false,
        logId,
        pending: true,
        error:
          'The mail server did not answer in time. The message may still be delivered — check again shortly.',
      };
    }
    if (outcome.ok) return { ok: true, logId };
    const row = await this.prisma.emailLog.findUnique({
      where: { id: logId },
      select: { lastError: true },
    });
    return {
      ok: false,
      logId,
      error: row?.lastError ?? 'The mail server rejected the message.',
    };
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
            lastError: describeSendError(err),
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
