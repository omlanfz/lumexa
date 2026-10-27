// FILE PATH: server/src/email/brevo-transport.ts
//
// Sends mail over HTTPS (Brevo's transactional API, port 443) instead of SMTP.
//
// Why this exists: some hosts block outbound SMTP. Render's free web services
// have blocked ports 25, 465 and 587 since September 2025, so Gmail SMTP just
// times out there ("Connection timeout" / "ENETUNREACH"). HTTPS is never
// blocked. EmailService keeps its journal, retries and idempotency exactly as
// they are; only the last hop changes. Selected with EMAIL_PROVIDER=brevo.
//
// Brevo's free plan sends from a single verified sender address (no domain
// needed), so lumexa.school@gmail.com can stay the From address: verify it once
// under Brevo → Senders, Domains & Dedicated IPs → Senders.

import { readFile } from 'fs/promises';
import type { EmailAttachment } from './email.service';

export interface MailTransport {
  sendMail(message: {
    from: string;
    to: string;
    subject: string;
    html: string;
    attachments?: EmailAttachment[];
  }): Promise<unknown>;
}

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';
const REQUEST_TIMEOUT_MS = 20_000;

/** `"Lumexa AI School" <lumexa.school@gmail.com>` → { name, email }. */
export function parseFromHeader(from: string): {
  name?: string;
  email: string;
} {
  const m = /^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/.exec(from);
  if (!m) return { email: from.trim() };
  const name = m[1].trim();
  return name ? { name, email: m[2].trim() } : { email: m[2].trim() };
}

export class BrevoTransport implements MailTransport {
  constructor(private readonly apiKey: string) {}

  async sendMail(
    message: Parameters<MailTransport['sendMail']>[0],
  ): Promise<{ messageId?: string }> {
    const attachment = message.attachments?.length
      ? await Promise.all(
          message.attachments.map(async (a) =>
            /^https?:\/\//i.test(a.path)
              ? { name: a.filename, url: a.path }
              : {
                  name: a.filename,
                  content: (await readFile(a.path)).toString('base64'),
                },
          ),
        )
      : undefined;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(BREVO_URL, {
        method: 'POST',
        headers: {
          'api-key': this.apiKey,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          sender: parseFromHeader(message.from),
          to: [{ email: message.to }],
          subject: message.subject,
          htmlContent: message.html,
          ...(attachment ? { attachment } : {}),
        }),
        signal: controller.signal,
      });
      const body = (await res.json().catch(() => null)) as {
        messageId?: string;
        code?: string;
        message?: string;
      } | null;
      if (!res.ok) {
        // Never includes the API key: only Brevo's own explanation.
        throw new Error(
          `Brevo rejected the email (HTTP ${res.status}${body?.code ? `, ${body.code}` : ''}): ${body?.message ?? 'no details'}`,
        );
      }
      return { messageId: body?.messageId };
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') {
        throw new Error('Brevo did not answer in time.');
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}
