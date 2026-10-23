// FILE PATH: server/src/whatsapp/whatsapp.config.ts
//
// All WhatsApp Cloud API settings come from environment variables and are
// read through this one module — no template name, language code, API version
// or phone number is hard-coded anywhere else. Values are read lazily (on
// every call) so tests and a restarted process always see the current env.
// Secrets (the access token) never leave this file except as the bearer
// header built inside WhatsAppCloudService.

export type TemplateKey =
  | 'PARENT_CONFIRMATION'
  | 'PARENT_REMINDER'
  | 'ADMIN_ALERT';

export type ParameterFormat = 'positional' | 'named';

const TEMPLATE_ENV: Record<TemplateKey, { env: string; fallback: string }> = {
  PARENT_CONFIRMATION: {
    env: 'WHATSAPP_TEMPLATE_PARENT_CONFIRMATION',
    fallback: 'lumexa_trial_confirmation',
  },
  PARENT_REMINDER: {
    env: 'WHATSAPP_TEMPLATE_PARENT_REMINDER',
    fallback: 'lumexa_trial_reminder',
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

function env(name: string): string {
  return (process.env[name] ?? '').trim();
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
  /** The admin's personal WhatsApp number (E.164). Internal only. */
  adminRecipient(): string {
    return env('WHATSAPP_ADMIN_RECIPIENT');
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
