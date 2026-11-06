// PROPOSED replacement for `certificateIssuedEmail` in
// server/src/email/templates/student.templates.ts
//
// Same building blocks as every other Lumexa email (emailLayout, dearParent, emailButton), so it
// looks and behaves like the rest. What changes:
//   - the certificate itself is shown in the body, so the parent sees it without opening anything
//   - one clear "download" button, plus one-tap WhatsApp / Facebook sharing
//   - a verification line (ID + public link) so the certificate feels, and is, verifiable
//   - the "next program" block explains WHY it was picked and has a single, mission-themed CTA
//   - a short sign-off from the founder
//   - the curriculum PDF is linked, not attached (the e-mail carries only the certificate)
//
// To adopt it: move this function into student.templates.ts (change the import to './layout'),
// extend NotificationsService.sendCertificateIssuedEmail with the new fields, and remove the
// curriculum PDF from the attachments in CertificatesService.

import { dearParent, emailButton, emailLayout, escapeHtml } from '../../../server/src/email/templates/layout';

export interface CertificateEmailParams {
  studentName: string;
  /** "Ayaan": makes the button read "Start Ayaan's next mission". Pass '' when a safe first name
   *  cannot be worked out (e.g. the name starts with "Md." or "Mohammad"): the button then says
   *  "Start the next mission". Never guess; never use gendered pronouns in this e-mail. */
  studentFirstName: string;
  programName: string;
  certificateId: string;
  /** "6 November 2026" (Asia/Dhaka) */
  issuedOn: string;
  lessonsCompleted: number;
  totalLessons: number;
  finalTestPct: number | null;
  distinction: boolean;
  /** Public JPEG of the certificate, hosted by Lumexa (about 200 KB). Shown in the body. */
  previewImageUrl: string;
  /** Public certificate page: view, download and share without logging in. */
  certificateUrl: string;
  /** Public verification page the QR code opens. */
  verifyUrl: string;
  whatsappShareUrl: string;
  facebookShareUrl: string;
  dashboardUrl: string;
  /** null when the student has completed every program they are eligible for. */
  next: null | {
    name: string;
    blurb: string;
    /** one sentence: why THIS program for THIS student */
    reason: string;
    /** where the main button goes (a prefilled WhatsApp chat today: enrolment is handled by hand) */
    ctaUrl: string;
    curriculumUrl: string;
    programsUrl: string;
  };
}

const INK = '#0f172a';
const MUTED = '#64748b';
const BRAND = '#0d9488';

const pill = (label: string, url: string) => `
  <td style="padding: 0 8px 8px 0;">
    <a href="${url}" style="display: inline-block; padding: 9px 16px; border: 1px solid #cbd5e1; border-radius: 999px; font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; font-size: 13px; font-weight: 600; color: ${INK}; text-decoration: none; background: #ffffff;">${label}</a>
  </td>`;

export function certificateIssuedEmail(p: CertificateEmailParams) {
  const student = escapeHtml(p.studentName);
  const first = escapeHtml(p.studentFirstName);
  const who = first || student; // used inside sentences, where the full name reads fine
  const program = escapeHtml(p.programName);

  const summaryRow = (label: string, value: string) =>
    `<tr><td style="padding: 6px 0; color: ${MUTED};">${label}</td><td style="padding: 6px 0; text-align: right; font-weight: 600; color: ${INK};">${value}</td></tr>`;

  const nextHtml = p.next
    ? `
      <div style="background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 10px; padding: 20px; margin: 24px 0 8px;">
        <p style="margin: 0 0 4px; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; color: #0f766e;">RECOMMENDED NEXT MISSION</p>
        <p style="margin: 0 0 6px; font-size: 20px; font-weight: 800; color: ${INK};">${escapeHtml(p.next.name)}</p>
        <p style="margin: 0 0 10px; color: #134e4a;">${escapeHtml(p.next.blurb)}</p>
        <p style="margin: 0; color: #134e4a;"><strong>Why we picked it for ${who}:</strong> ${escapeHtml(p.next.reason)}</p>
        ${emailButton(first ? `Start ${first}&rsquo;s next mission &rarr;` : 'Start the next mission &rarr;', p.next.ctaUrl)}
        <p style="margin: 0; font-size: 13px; color: ${MUTED};">
          <a href="${p.next.curriculumUrl}" style="color: ${BRAND};">See the full ${escapeHtml(p.next.name)} curriculum</a>
          &nbsp;&middot;&nbsp;
          <a href="${p.next.programsUrl}" style="color: ${BRAND};">Compare all programs</a>
        </p>
      </div>`
    : `
      <div style="background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 10px; padding: 20px; margin: 24px 0 8px;">
        <p style="margin: 0 0 6px; font-size: 18px; font-weight: 800; color: ${INK};">${who} has completed every program open to them.</p>
        <p style="margin: 0; color: #134e4a;">That is a remarkable achievement. Message us on WhatsApp and we will help plan what comes next, including advanced and custom projects.</p>
      </div>`;

  return {
    subject: `🎓 ${p.studentName} completed the ${p.programName}!`,
    html: emailLayout({
      title: 'Certificate of Completion',
      previewText: `${p.studentName}'s official Lumexa certificate is attached. Download it, share it, and see what's next.`,
      bodyHtml: `
        <h2 style="margin: 0 0 12px; font-size: 22px; color: ${INK};">🎓 Mission accomplished, ${student}!</h2>
        ${dearParent()}
        <p style="margin: 0 0 16px;">Congratulations! ${student} has completed the <strong>${program}</strong> at Lumexa and passed the Final Test${p.distinction ? ' <strong>with Distinction</strong>' : ''}. That is ${p.lessonsCompleted} lessons of real, hands-on learning, and we could not be prouder.</p>

        <a href="${p.certificateUrl}" style="text-decoration: none;">
          <img src="${p.previewImageUrl}" width="496" alt="Certificate of Completion: ${student}, ${program}" style="display: block; width: 100%; max-width: 496px; height: auto; border: 1px solid #e2e8f0; border-radius: 6px;" />
        </a>

        ${emailButton('Download the certificate (PDF)', p.certificateUrl)}
        <p style="margin: -8px 0 16px; font-size: 13px; color: ${MUTED};">The PDF is also attached to this email. Every Lumexa certificate has a unique ID and QR code, so schools, teachers or anyone you share it with can confirm it is genuine.</p>

        <p style="margin: 20px 0 8px; font-size: 13px; font-weight: 700; color: ${INK};">Share the good news</p>
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          ${pill('Share on WhatsApp', p.whatsappShareUrl)}
          ${pill('Share on Facebook', p.facebookShareUrl)}
          ${pill('View online', p.verifyUrl)}
        </tr></table>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 16px; margin: 20px 0 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px;">
            ${summaryRow('Program', program)}
            ${summaryRow('Lessons completed', `${p.lessonsCompleted} / ${p.totalLessons}`)}
            ${p.finalTestPct !== null ? summaryRow('Final Test', `${Math.round(p.finalTestPct)}%`) : ''}
            ${summaryRow('Awarded on', escapeHtml(p.issuedOn))}
            ${summaryRow('Certificate ID', escapeHtml(p.certificateId))}
          </table>
        </div>

        ${nextHtml}

        <p style="margin: 20px 0 8px;">Questions, or not sure which program fits best? Just reply to this email or message us on WhatsApp. A quick chat makes choosing easy, with no obligation.</p>
        <p style="margin: 20px 0 0;">With pride,<br /><strong>Fairooz Omlan</strong><br /><span style="color: ${MUTED};">Founder &amp; CEO, Lumexa AI School</span></p>
        <p style="margin: 16px 0 0; font-size: 12px; color: ${MUTED};">You can also find every certificate any time in the student dashboard: <a href="${p.dashboardUrl}" style="color: ${BRAND};">My Certificates</a>.</p>
      `,
    }),
  };
}

/** The prefilled WhatsApp chat behind the "Start next mission" button. Lumexa enrols students by
 *  hand today, so the button starts the conversation instead of pretending there is a checkout. */
export function nextMissionWhatsAppUrl(whatsappBase: string, studentName: string, completed: string, next: string) {
  const text = `Hi Lumexa! ${studentName} just completed the ${completed} 🎓 We would like to start the ${next}. Could you tell us the next steps?`;
  return `${whatsappBase}?text=${encodeURIComponent(text)}`;
}
