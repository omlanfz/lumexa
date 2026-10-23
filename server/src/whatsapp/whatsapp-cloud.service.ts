// FILE PATH: server/src/whatsapp/whatsapp-cloud.service.ts
//
// Thin client for Meta's WhatsApp Business *Cloud API* (Graph API) — direct
// HTTPS, no third-party messaging provider. It does exactly one thing: send a
// pre-approved template message and classify the outcome. Durability,
// scheduling, de-duplication and retries live in TrialWhatsAppService.
//
// Nothing here ever throws for an operational failure; callers get a
// SendResult. The access token is only ever placed in the Authorization
// header and is never logged, stored or returned.

import { Injectable, Logger } from '@nestjs/common';
import { whatsappConfig } from './whatsapp.config';

export interface TemplateVariable {
  /** Stable name shared with the code and the docs (e.g. "parent_name"). */
  name: string;
  value: string;
}

export interface SendTemplateParams {
  /** Recipient in E.164 form, e.g. "+8801712345678". */
  to: string;
  templateName: string;
  languageCode: string;
  /** Body variables in template order ({{1}}, {{2}}, …). */
  variables: TemplateVariable[];
}

export type SendResult =
  | { ok: true; messageId: string }
  | {
      ok: false;
      /** Worth trying again later (network, 5xx, rate limit). */
      retryable: boolean;
      /** Meta error code, or an internal NOT_CONFIGURED / NETWORK / TIMEOUT. */
      code: string;
      /** Sanitised, length-limited message — safe to store and display. */
      message: string;
    };

const REQUEST_TIMEOUT_MS = 15_000;

/** The slice of Meta's response we read. */
interface GraphResponse {
  messages?: { id?: string }[];
  error?: {
    code?: number;
    message?: string;
    error_data?: { details?: string };
  };
}

// Meta error codes worth retrying: rate limits and transient platform errors.
// https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes
const RETRYABLE_META_CODES = new Set([
  1, // unknown / API unavailable
  2, // service temporarily unavailable
  4, // app-level rate limit
  17, // user-level rate limit
  32, // page-level rate limit
  341, // application limit reached
  368, // temporarily blocked
  613, // calls to this API exceed the rate limit
  80007, // WABA rate limit
  130429, // Cloud API throughput limit reached
  131000, // something went wrong
  131016, // service unavailable
  131056, // pair rate limit (too many messages to the same recipient)
]);

/** Variable values may not contain newlines/tabs or runs of 4+ spaces, and
 *  must be non-empty (Meta rejects empty template parameters). */
export function sanitizeTemplateValue(value: string, maxLength = 900): string {
  const cleaned = String(value ?? '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/ {2,}/g, ' ')
    .trim();
  if (cleaned === '') return '-';
  return cleaned.length > maxLength
    ? `${cleaned.slice(0, maxLength - 1)}…`
    : cleaned;
}

@Injectable()
export class WhatsAppCloudService {
  private readonly logger = new Logger(WhatsAppCloudService.name);

  isEnabled(): boolean {
    return whatsappConfig.isEnabled();
  }

  async sendTemplate(params: SendTemplateParams): Promise<SendResult> {
    const missing = whatsappConfig.missingCredentials();
    if (missing.length > 0) {
      return {
        ok: false,
        retryable: false,
        code: 'NOT_CONFIGURED',
        message: `WhatsApp is not configured: set ${missing.join(', ')}.`,
      };
    }

    const url =
      `https://graph.facebook.com/${whatsappConfig.graphApiVersion()}` +
      `/${encodeURIComponent(whatsappConfig.phoneNumberId())}/messages`;
    const named = whatsappConfig.parameterFormat() === 'named';

    const body = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: params.to.replace(/^\+/, ''),
      type: 'template',
      template: {
        name: params.templateName,
        language: { code: params.languageCode },
        components: [
          {
            type: 'body',
            parameters: params.variables.map((v) => ({
              type: 'text',
              text: sanitizeTemplateValue(v.value),
              ...(named ? { parameter_name: v.name } : {}),
            })),
          },
        ],
      },
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${whatsappConfig.accessToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const payload = (await res
        .json()
        .catch(() => null)) as GraphResponse | null;

      if (res.ok) {
        const messageId = payload?.messages?.[0]?.id;
        if (typeof messageId === 'string' && messageId) {
          return { ok: true, messageId };
        }
        return {
          ok: false,
          retryable: false,
          code: 'NO_MESSAGE_ID',
          message: 'WhatsApp accepted the request but returned no message id.',
        };
      }

      const err: NonNullable<GraphResponse['error']> = payload?.error ?? {};
      const metaCode = typeof err.code === 'number' ? err.code : undefined;
      const detail =
        err?.error_data?.details || err?.message || `HTTP ${res.status}`;
      const retryable =
        res.status >= 500 ||
        res.status === 429 ||
        (metaCode !== undefined && RETRYABLE_META_CODES.has(metaCode));

      return {
        ok: false,
        retryable,
        code: metaCode !== undefined ? String(metaCode) : `HTTP_${res.status}`,
        message: String(detail).slice(0, 500),
      };
    } catch (e) {
      const aborted = (e as Error)?.name === 'AbortError';
      return {
        ok: false,
        retryable: true,
        code: aborted ? 'TIMEOUT' : 'NETWORK',
        message: aborted
          ? 'Request to WhatsApp timed out.'
          : `Could not reach WhatsApp: ${String((e as Error)?.message ?? e).slice(0, 200)}`,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
