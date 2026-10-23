// FILE PATH: server/src/trial/trial-notifications.service.ts
//
// What happens AFTER a trial booking change has been committed. Everything
// here is fire-and-forget and can never fail or roll back a booking:
//   • emails go through the existing NotificationsService → EmailService
//     (EmailLog journal, retry sweep, dedupeKey idempotency);
//   • WhatsApp rows were already queued inside the booking transaction —
//     this only nudges the sender so they go out immediately.
// Scope is deliberately small: booked (parent + admin), rescheduled (parent),
// cancelled (parent). No WhatsApp on reschedule/cancel, no other emails.

import { Injectable, Logger } from '@nestjs/common';
import type { TrialLead } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { TrialWhatsAppService } from './trial-whatsapp.service';
import { LUMEXA_CONTACT } from './trial.constants';
import { describeAppointment } from './trial-format.util';
import type { TrialEmailAppointment } from '../email/templates/trial.templates';

type BookedLead = TrialLead & { startAt: Date; endAt: Date };

export function bookingReference(leadId: string): string {
  return leadId.slice(0, 8).toUpperCase();
}

function toEmailAppointment(
  start: Date,
  end: Date,
  parentTimeZone: string | null,
): TrialEmailAppointment {
  const d = describeAppointment(start, end, parentTimeZone);
  return {
    date: d.dhaka.date,
    timeRange: d.dhaka.timeRange,
    timezoneLabel: d.dhaka.timezoneLabel,
    duration: d.duration,
    local: d.local,
  };
}

const CONTACT = {
  email: LUMEXA_CONTACT.email,
  whatsappDisplay: LUMEXA_CONTACT.whatsappDisplay,
  whatsappUrl: LUMEXA_CONTACT.whatsappUrl,
};

@Injectable()
export class TrialNotificationsService {
  private readonly logger = new Logger(TrialNotificationsService.name);

  constructor(
    private readonly notifications: NotificationsService,
    private readonly whatsapp: TrialWhatsAppService,
  ) {}

  private swallow(label: string, leadId: string) {
    return (err: unknown) =>
      this.logger.error(
        `Trial ${label} notification failed for ${leadId}: ${String((err as Error)?.message ?? err)}`,
      );
  }

  /** Parent confirmation email + (parent-booked only) admin alert email, then
   *  release the queued WhatsApp messages. */
  afterBooked(lead: BookedLead, opts: { alertAdmin: boolean }): void {
    const appointment = toEmailAppointment(
      lead.startAt,
      lead.endAt,
      lead.timezone,
    );

    this.notifications
      .sendTrialBookingConfirmedToParent({
        leadId: lead.id,
        parentEmail: lead.parentEmail,
        parentName: lead.parentName,
        childName: lead.childName,
        program: lead.subject,
        appointment,
        contact: CONTACT,
      })
      .catch(this.swallow('confirmation email', lead.id));

    if (opts.alertAdmin) {
      // The admin always sees Bangladesh time, never the parent's zone.
      this.notifications
        .sendTrialBookingAlertToAdmins({
          leadId: lead.id,
          parentName: lead.parentName,
          parentEmail: lead.parentEmail,
          parentPhone: lead.parentPhone ?? 'not provided',
          childName: lead.childName,
          childAge: lead.childAge,
          program: lead.subject,
          message: lead.message,
          appointment: toEmailAppointment(lead.startAt, lead.endAt, null),
          bookingReference: bookingReference(lead.id),
        })
        .catch(this.swallow('admin alert email', lead.id));
    }

    this.whatsapp.kick();
  }

  afterRescheduled(
    lead: BookedLead,
    previous: { startAt: Date; endAt: Date },
  ): void {
    this.notifications
      .sendTrialRescheduledToParent({
        leadId: lead.id,
        revision: lead.revision,
        parentEmail: lead.parentEmail,
        parentName: lead.parentName,
        childName: lead.childName,
        program: lead.subject,
        previous: toEmailAppointment(
          previous.startAt,
          previous.endAt,
          lead.timezone,
        ),
        appointment: toEmailAppointment(
          lead.startAt,
          lead.endAt,
          lead.timezone,
        ),
        contact: CONTACT,
      })
      .catch(this.swallow('reschedule email', lead.id));
  }

  afterCancelled(lead: BookedLead, parentNote?: string | null): void {
    this.notifications
      .sendTrialCancelledToParent({
        leadId: lead.id,
        parentEmail: lead.parentEmail,
        parentName: lead.parentName,
        childName: lead.childName,
        appointment: toEmailAppointment(
          lead.startAt,
          lead.endAt,
          lead.timezone,
        ),
        note: parentNote,
        contact: CONTACT,
      })
      .catch(this.swallow('cancellation email', lead.id));
  }
}
