// FILE PATH: server/src/email/templates/trial.templates.ts
//
// The four trial-class emails. Same shared emailLayout as every other
// Lumexa email. Wording rule: a *booking* email says "confirmed"; nothing
// here ever calls a request a booking or a booking a request.
//
// Every value that came from the public form (names, message, program) is
// HTML-escaped. Times are always shown in Bangladesh Time with the timezone
// spelled out, plus the parent's own local time when it differs.

import { emailButton, emailLayout, escapeHtml } from './layout';

export interface TrialEmailAppointment {
  /** "Wednesday, 29 October 2026" (Bangladesh time) */
  date: string;
  /** "4:00 PM – 4:30 PM" (Bangladesh time) */
  timeRange: string;
  timezoneLabel: string;
  duration: string;
  /** Present only when the parent's own timezone differs from Dhaka. */
  local: { date: string; timeRange: string; timeZone: string } | null;
}

const BOX =
  'background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; margin: 16px 0;';
const MUTED = 'color: #475569;';

function appointmentBox(a: TrialEmailAppointment, program?: string | null) {
  return `
    <div style="${BOX}">
      <p style="margin: 0 0 6px;"><strong>📅 Date:</strong> ${escapeHtml(a.date)}</p>
      <p style="margin: 0 0 6px;"><strong>🕐 Time:</strong> ${escapeHtml(a.timeRange)} (${escapeHtml(a.timezoneLabel)})</p>
      ${
        a.local
          ? `<p style="margin: 0 0 6px; ${MUTED}"><strong>In your time zone (${escapeHtml(a.local.timeZone)}):</strong> ${escapeHtml(a.local.date)}, ${escapeHtml(a.local.timeRange)}</p>`
          : ''
      }
      <p style="margin: 0 0 6px;"><strong>⏱ Length:</strong> ${escapeHtml(a.duration)}</p>
      ${program ? `<p style="margin: 0;"><strong>🎯 Program:</strong> ${escapeHtml(program)}</p>` : ''}
    </div>`;
}

function contactLine(
  email: string,
  whatsappDisplay: string,
  whatsappUrl: string,
) {
  return `<p style="margin: 16px 0 0; ${MUTED}">Need to change something? Reply to this email or message us on WhatsApp:
    <a href="${escapeHtml(whatsappUrl)}" style="color: #0d9488;">${escapeHtml(whatsappDisplay)}</a> · <a href="mailto:${escapeHtml(email)}" style="color: #0d9488;">${escapeHtml(email)}</a>.</p>`;
}

export interface TrialContact {
  email: string;
  whatsappDisplay: string;
  whatsappUrl: string;
}

/** Parent: the booking exists and is confirmed. */
export function trialBookingConfirmedParentEmail(params: {
  parentName: string;
  childName: string;
  program: string;
  appointment: TrialEmailAppointment;
  programsUrl: string;
  contact: TrialContact;
}) {
  const { parentName, childName, program, appointment, programsUrl, contact } =
    params;
  return {
    subject: `Confirmed: ${childName}'s free trial class — ${appointment.date}`,
    html: emailLayout({
      title: 'Trial class confirmed',
      previewText: `Your 30-minute trial for ${childName} is booked for ${appointment.date}.`,
      bodyHtml: `
        <h2 style="margin: 0 0 12px; color: #0f172a;">Your trial class is confirmed ✅</h2>
        <p style="margin: 0 0 8px;">Hi ${escapeHtml(parentName)},</p>
        <p style="margin: 0 0 8px;">Great news — <strong>${escapeHtml(childName)}</strong>'s free 30-minute trial class is booked. Nothing more is needed from you to hold this time.</p>
        ${appointmentBox(appointment, program)}
        <p style="margin: 0 0 8px;"><strong>What to expect:</strong> ${escapeHtml(childName)} will try a real, short learning activity with a Lumexa teacher, you'll see how we teach, and afterwards we'll suggest a suitable next step. There's no obligation to enrol.</p>
        <p style="margin: 0 0 8px;">Please help ${escapeHtml(childName)} join a few minutes early. Our team will be in touch with the joining details before the session.</p>
        ${emailButton('Explore our programs', programsUrl)}
        ${contactLine(contact.email, contact.whatsappDisplay, contact.whatsappUrl)}
      `,
    }),
  };
}

/** Admin: a parent just booked — everything needed to act on it. */
export function trialBookingAdminAlertEmail(params: {
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  childName: string;
  childAge: number;
  program: string;
  message?: string | null;
  appointment: TrialEmailAppointment;
  bookingReference: string;
  adminUrl: string;
}) {
  const p = params;
  return {
    subject: `New trial booked: ${p.childName} — ${p.appointment.date}, ${p.appointment.timeRange}`,
    html: emailLayout({
      title: 'New trial booking',
      bodyHtml: `
        <h2 style="margin: 0 0 12px; color: #0f172a;">New trial class booked</h2>
        <p style="margin: 0 0 8px;">A parent booked a slot — it is already <strong>confirmed</strong>, no action needed to approve it.</p>
        ${appointmentBox(p.appointment, null)}
        <div style="${BOX}">
          <p style="margin: 0 0 6px;"><strong>Parent:</strong> ${escapeHtml(p.parentName)}</p>
          <p style="margin: 0 0 6px;"><strong>Email:</strong> ${escapeHtml(p.parentEmail)}</p>
          <p style="margin: 0 0 6px;"><strong>WhatsApp:</strong> ${escapeHtml(p.parentPhone)}</p>
          <p style="margin: 0 0 6px;"><strong>Child:</strong> ${escapeHtml(p.childName)} (age ${escapeHtml(p.childAge)})</p>
          <p style="margin: 0 0 6px;"><strong>Program interest:</strong> ${escapeHtml(p.program)}</p>
          <p style="margin: 0;"><strong>Message:</strong> ${p.message ? `<span style="white-space: pre-wrap;">${escapeHtml(p.message)}</span>` : '<span style="color:#94a3b8;">none</span>'}</p>
        </div>
        <p style="margin: 0 0 8px; color: #64748b; font-size: 13px;">Reference ${escapeHtml(p.bookingReference)}</p>
        ${emailButton('Open Trial Classes', p.adminUrl)}
      `,
    }),
  };
}

/** Parent: the appointment moved. */
export function trialRescheduledParentEmail(params: {
  parentName: string;
  childName: string;
  program: string;
  previous: TrialEmailAppointment;
  appointment: TrialEmailAppointment;
  programsUrl: string;
  contact: TrialContact;
}) {
  const { parentName, childName, program, previous, appointment, contact } =
    params;
  return {
    subject: `Updated time for ${childName}'s trial class — ${appointment.date}`,
    html: emailLayout({
      title: 'Trial class rescheduled',
      previewText: `${childName}'s trial class has a new time: ${appointment.date}.`,
      bodyHtml: `
        <h2 style="margin: 0 0 12px; color: #0f172a;">Your trial class has a new time</h2>
        <p style="margin: 0 0 8px;">Hi ${escapeHtml(parentName)},</p>
        <p style="margin: 0 0 8px;">We've moved <strong>${escapeHtml(childName)}</strong>'s free trial class. Your booking is still confirmed — here is the updated time:</p>
        <div style="${BOX}">
          <p style="margin: 0; color: #94a3b8; text-decoration: line-through;"><strong>Previously:</strong> ${escapeHtml(previous.date)}, ${escapeHtml(previous.timeRange)}</p>
        </div>
        ${appointmentBox(appointment, program)}
        <p style="margin: 0 0 8px;">Please help ${escapeHtml(childName)} join a few minutes early. If the new time doesn't suit you, just let us know and we'll find another.</p>
        ${contactLine(contact.email, contact.whatsappDisplay, contact.whatsappUrl)}
      `,
    }),
  };
}

/** Parent: the appointment is cancelled. */
export function trialCancelledParentEmail(params: {
  parentName: string;
  childName: string;
  appointment: TrialEmailAppointment;
  /** Optional message written for the parent — never the internal audit reason. */
  note?: string | null;
  trialUrl: string;
  contact: TrialContact;
}) {
  const { parentName, childName, appointment, note, trialUrl, contact } =
    params;
  return {
    subject: `Cancelled: ${childName}'s trial class on ${appointment.date}`,
    html: emailLayout({
      title: 'Trial class cancelled',
      bodyHtml: `
        <h2 style="margin: 0 0 12px; color: #0f172a;">Your trial class has been cancelled</h2>
        <p style="margin: 0 0 8px;">Hi ${escapeHtml(parentName)},</p>
        <p style="margin: 0 0 8px;">The free trial class for <strong>${escapeHtml(childName)}</strong> has been cancelled:</p>
        <div style="${BOX}">
          <p style="margin: 0; color: #94a3b8; text-decoration: line-through;">${escapeHtml(appointment.date)}, ${escapeHtml(appointment.timeRange)} (${escapeHtml(appointment.timezoneLabel)})</p>
        </div>
        ${note ? `<p style="margin: 0 0 8px; ${MUTED}"><strong>Note from the team:</strong> ${escapeHtml(note)}</p>` : ''}
        <p style="margin: 0 0 8px;">We're sorry for any inconvenience. You're welcome to pick a new time whenever it suits you — there's no pressure.</p>
        ${emailButton('Choose a new time', trialUrl)}
        ${contactLine(contact.email, contact.whatsappDisplay, contact.whatsappUrl)}
      `,
    }),
  };
}
