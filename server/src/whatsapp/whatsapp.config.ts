// FILE PATH: server/src/whatsapp/whatsapp.config.ts
//
// All WhatsApp Cloud API settings come from environment variables and are
// read through this one module — no template name, language code, API version
// or phone number is hard-coded anywhere else. Values are read lazily (on
// every call) so tests and a restarted process always see the current env.
// Secrets (the access token) never leave this file except as the bearer
// header built inside WhatsAppCloudService. The same module also owns the
// admin's wa.me chat link that parents are sent to for payments.

export type TemplateKey =
  | 'PARENT_CONFIRMATION'
  | 'PARENT_CLASS_DETAILS'
  | 'PARENT_REMINDER'
  | 'ADMIN_ALERT';

export type ParameterFormat = 'positional' | 'named';

const TEMPLATE_ENV: Record<TemplateKey, { env: string; fallback: string }> = {
  PARENT_CONFIRMATION: {
    env: 'WHATSAPP_TEMPLATE_PARENT_CONFIRMATION',
    fallback: 'lumexa_trial_confirmation',
  },
  PARENT_CLASS_DETAILS: {
    env: 'WHATSAPP_TEMPLATE_PARENT_CLASS_DETAILS',
    fallback: 'lumexa_trial_class_details',
  },
  // The reminder now carries the join link, so it is a different template
  // (different variables) from the old 24-hour reminder: new default name.
  PARENT_REMINDER: {
    env: 'WHATSAPP_TEMPLATE_PARENT_REMINDER',
    fallback: 'lumexa_trial_class_reminder',
  },
  ADMIN_ALERT: {
    env: 'WHATSAPP_TEMPLATE_ADMIN_ALERT',
    fallback: 'lumexa_trial_admin_alert',
  },
};

// Pinned as a *default only*; production should set WHATSAPP_GRAPH_API_VERSION
// explicitly. Meta publishes the currently supported versions at
// https://developers.facebook.com/docs/graph-api/changelog
export const DEFAULT_GRAPH_API_VERSION = 'v25.0';
export const DEFAULT_TEMPLATE_LANGUAGE = 'en';

// The admin's own WhatsApp inbox — the one place this number is written down.
// Parents who want to top up class credits are sent to a chat with it (the
// payment emails and the student Payments & Credits page, see
// students/credit-packages.ts). Used only when WHATSAPP_ADMIN_RECIPIENT, the
// admin contact that is already configured, is not set.
export const DEFAULT_ADMIN_WHATSAPP_NUMBER = '+8801774878252';

function env(name: string): string {
  return (process.env[name] ?? '').trim();
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

export const whatsappConfig = {
  /** Master switch. Anything other than the string "true" keeps WhatsApp off. */
  isEnabled(): boolean {
    return env('WHATSAPP_ENABLED').toLowerCase() === 'true';
  },
  graphApiVersion(): string {
    const v = env('WHATSAPP_GRAPH_API_VERSION') || DEFAULT_GRAPH_API_VERSION;
    return /^v\d+\.\d+$/.test(v) ? v : DEFAULT_GRAPH_API_VERSION;
  },
  phoneNumberId(): string {
    return env('WHATSAPP_PHONE_NUMBER_ID');
  },
  accessToken(): string {
    return env('WHATSAPP_ACCESS_TOKEN');
  },
  /** The admin's personal WhatsApp number (E.164) — the recipient of the
   * Cloud API admin alerts. Empty when not configured. */
  adminRecipient(): string {
    return env('WHATSAPP_ADMIN_RECIPIENT');
  },
  /** The admin's WhatsApp inbox in wa.me form (international digits, no "+"):
   * the configured WHATSAPP_ADMIN_RECIPIENT, else DEFAULT_ADMIN_WHATSAPP_NUMBER.
   * Parents are shown (and opened into) this number, so it is not secret. */
  adminChatNumber(): string {
    return (
      digitsOnly(env('WHATSAPP_ADMIN_RECIPIENT')) ||
      digitsOnly(DEFAULT_ADMIN_WHATSAPP_NUMBER)
    );
  },
  templateName(key: TemplateKey): string {
    const { env: name, fallback } = TEMPLATE_ENV[key];
    return env(name) || fallback;
  },
  templateLanguage(): string {
    return env('WHATSAPP_TEMPLATE_LANGUAGE') || DEFAULT_TEMPLATE_LANGUAGE;
  },
  parameterFormat(): ParameterFormat {
    return env('WHATSAPP_TEMPLATE_PARAMETER_FORMAT').toLowerCase() === 'named'
      ? 'named'
      : 'positional';
  },
  /** Names of the env vars that are required to send but are not set. */
  missingCredentials(): string[] {
    const missing: string[] = [];
    if (!whatsappConfig.phoneNumberId())
      missing.push('WHATSAPP_PHONE_NUMBER_ID');
    if (!whatsappConfig.accessToken()) missing.push('WHATSAPP_ACCESS_TOKEN');
    return missing;
  },
};

/** `https://wa.me/<admin number>?text=<message>` — opens a chat with the admin's
 * WhatsApp inbox with `message` already typed in (URL-encoded here). */
export function adminWhatsAppChatUrl(message: string): string {
  return `https://wa.me/${whatsappConfig.adminChatNumber()}?text=${encodeURIComponent(message)}`;
}
