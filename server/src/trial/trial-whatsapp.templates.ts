// FILE PATH: server/src/trial/trial-whatsapp.templates.ts
//
// Variable maps for the three trial WhatsApp templates. The ORDER of each
// list is the contract with Meta: it is the order of {{1}}, {{2}}, … in the
// approved template body, and the `name` of each entry is the
// parameter_name used when WHATSAPP_TEMPLATE_PARAMETER_FORMAT=named. The
// template drafts to submit for approval — with these exact variables — are
// in docs/TRIAL_NOTIFICATIONS_SETUP.md. If you reorder or rename anything
// here, the approved templates must change with it.
//
// Template NAMES and the LANGUAGE are configuration, not code (see
// server/src/whatsapp/whatsapp.config.ts).

import type { TrialLead, TrialWhatsAppKind } from '@prisma/client';
import {
  TRIAL_TIMEZONE_LABEL,
  frontendBaseUrl,
  trialJoinUrl,
} from './trial.constants';
import {
  formatTrialDate,
  formatTrialDuration,
  formatTrialTimeRange,
} from './trial-format.util';
import type { TemplateVariable } from '../whatsapp/whatsapp-cloud.service';
import type { TemplateKey } from '../whatsapp/whatsapp.config';

export const PARENT_CONFIRMATION_VARIABLES = [
  'parent_name',
  'child_name',
  'appointment_date',
  'appointment_time',
  'duration',
  'program_interest',
  'programs_url',
] as const;

/** Sent once a teacher is assigned (and again if the time changes): the trial
 *  details plus the secure classroom link. */
export const PARENT_CLASS_DETAILS_VARIABLES = [
  'parent_name',
  'child_name',
  'appointment_date',
  'appointment_time',
  'duration',
  'join_link',
] as const;

/** Sent one hour before the start, with the same link. */
export const PARENT_REMINDER_VARIABLES = [
  'child_name',
  'appointment_date',
  'appointment_time',
  'duration',
  'join_link',
] as const;

export const ADMIN_ALERT_VARIABLES = [
  'parent_name',
  'parent_email',
  'parent_whatsapp',
  'child_name',
  'child_age',
  'program_interest',
  'appointment_date',
  'appointment_time',
  'parent_message',
] as const;

export type TrialWhatsAppLead = Pick<
  TrialLead,
  | 'parentName'
  | 'parentEmail'
  | 'parentPhone'
  | 'childName'
  | 'childAge'
  | 'subject'
  | 'message'
  | 'startAt'
  | 'endAt'
  | 'guestToken'
>;

export function templateKeyFor(kind: TrialWhatsAppKind): TemplateKey {
  return kind; // enum values and config keys are intentionally identical
}

/** Public Programs page, built from FRONTEND_URL so it follows the deployed domain. */
export function programsUrl(): string {
  return `${frontendBaseUrl()}/programs`;
}

/** The secure guest link. A message that needs it can never be built without
 *  one (that would send a parent a dead link), so this throws and the sender
 *  records a non-retryable BUILD_FAILED instead. */
function joinLink(lead: Pick<TrialWhatsAppLead, 'guestToken'>): string {
  if (!lead.guestToken) throw new Error('Trial has no guest join token.');
  return trialJoinUrl(lead.guestToken);
}

export function buildTemplateVariables(
  kind: TrialWhatsAppKind,
  lead: TrialWhatsAppLead,
): TemplateVariable[] {
  if (!lead.startAt || !lead.endAt) {
    throw new Error('Trial lead has no appointment time.');
  }
  const date = formatTrialDate(lead.startAt);
  const time = `${formatTrialTimeRange(lead.startAt, lead.endAt)} ${TRIAL_TIMEZONE_LABEL}`;
  const program = lead.subject?.trim() || 'Not specified';

  const values: Record<string, string> =
    kind === 'PARENT_CONFIRMATION'
      ? {
          parent_name: lead.parentName,
          child_name: lead.childName,
          appointment_date: date,
          appointment_time: time,
          duration: formatTrialDuration(),
          program_interest: program,
          programs_url: programsUrl(),
        }
      : kind === 'PARENT_CLASS_DETAILS'
        ? {
            parent_name: lead.parentName,
            child_name: lead.childName,
            appointment_date: date,
            appointment_time: time,
            duration: formatTrialDuration(),
            join_link: joinLink(lead),
          }
        : kind === 'PARENT_REMINDER'
          ? {
              child_name: lead.childName,
              appointment_date: date,
              appointment_time: time,
              duration: formatTrialDuration(),
              join_link: joinLink(lead),
            }
          : {
              parent_name: lead.parentName,
              parent_email: lead.parentEmail,
              parent_whatsapp: lead.parentPhone ?? 'Not provided',
              child_name: lead.childName,
              child_age: String(lead.childAge),
              program_interest: program,
              appointment_date: date,
              appointment_time: time,
              parent_message: lead.message?.trim() || 'None provided',
            };

  const order: readonly string[] =
    kind === 'PARENT_CONFIRMATION'
      ? PARENT_CONFIRMATION_VARIABLES
      : kind === 'PARENT_CLASS_DETAILS'
        ? PARENT_CLASS_DETAILS_VARIABLES
        : kind === 'PARENT_REMINDER'
          ? PARENT_REMINDER_VARIABLES
          : ADMIN_ALERT_VARIABLES;

  return order.map((name) => ({ name, value: values[name] }));
}
