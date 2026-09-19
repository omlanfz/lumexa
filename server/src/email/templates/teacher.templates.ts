import { emailButton, emailLayout, formatDateTime } from './layout';

export function teacherAccountCreatedEmail(params: {
  teacherName: string;
  dashboardUrl: string;
}) {
  return {
    subject: 'Welcome to the Lumexa teaching team!',
    html: emailLayout({
      title: 'Welcome to Lumexa',
      bodyHtml: `
        <h2 style="margin: 0 0 12px; color: #0f172a;">Welcome to Lumexa, ${params.teacherName}!</h2>
        <p style="margin: 0 0 8px;">Your teacher account has been created. Next, complete your profile and upload your verification documents so Operations can review and approve your account.</p>
        ${emailButton('Complete my profile', params.dashboardUrl)}
      `,
    }),
  };
}

export function teacherApprovedEmail(params: {
  teacherName: string;
  dashboardUrl: string;
}) {
  return {
    subject: '✅ Your Lumexa teacher account is approved',
    html: emailLayout({
      title: 'Account approved',
      bodyHtml: `
        <h2 style="margin: 0 0 12px; color: #0f172a;">You're all set, ${params.teacherName}!</h2>
        <p style="margin: 0 0 8px;">Operations has reviewed and approved your onboarding documents. Your account is fully verified and ready to teach.</p>
        ${emailButton('Go to my dashboard', params.dashboardUrl)}
      `,
    }),
  };
}

export function teacherStudentAssignedEmail(params: {
  teacherName: string;
  studentName: string;
  dashboardUrl: string;
}) {
  return {
    subject: `New student assigned: ${params.studentName}`,
    html: emailLayout({
      title: 'New student assigned',
      bodyHtml: `
        <h2 style="margin: 0 0 12px; color: #0f172a;">You've been assigned a new student</h2>
        <p style="margin: 0 0 8px;">Hi ${params.teacherName},</p>
        <p style="margin: 0 0 8px;"><strong>${params.studentName}</strong> has been assigned to you. Check your dashboard for their schedule and curriculum details.</p>
        ${emailButton('View my students', params.dashboardUrl)}
      `,
    }),
  };
}

export function teacherClassChangedByStudentEmail(params: {
  teacherName: string;
  studentName: string;
  classStart: Date;
  action: 'RESCHEDULED' | 'CANCELLED';
}) {
  const verb = params.action === 'RESCHEDULED' ? 'rescheduled' : 'cancelled';
  return {
    subject: `${params.studentName} ${verb} a class`,
    html: emailLayout({
      title: `Class ${verb}`,
      bodyHtml: `
        <h2 style="margin: 0 0 12px; color: #0f172a;">A class was ${verb}</h2>
        <p style="margin: 0 0 8px;">Hi ${params.teacherName},</p>
        <p style="margin: 0 0 8px;"><strong>${params.studentName}</strong> ${verb} the class scheduled for ${formatDateTime(params.classStart)}.</p>
      `,
    }),
  };
}

export function teacherClassReminderEmail(params: {
  teacherName: string;
  studentName: string;
  classStart: Date;
  classUrl: string;
}) {
  return {
    subject: `⏰ Your class with ${params.studentName} starts in 1 hour`,
    html: emailLayout({
      title: 'Class starting soon',
      bodyHtml: `
        <h2 style="margin: 0 0 12px; color: #0f172a;">⏰ Your class starts in 1 hour</h2>
        <p style="margin: 0 0 8px;">Hi ${params.teacherName},</p>
        <p style="margin: 0 0 8px;">Your class with <strong>${params.studentName}</strong> starts at ${formatDateTime(params.classStart)}.</p>
        ${emailButton('Join classroom', params.classUrl)}
      `,
    }),
  };
}

export function teacherAdminMessageEmail(params: {
  teacherName: string;
  subject: string;
  message: string;
}) {
  return {
    subject: `Lumexa Operations: ${params.subject}`,
    html: emailLayout({
      title: params.subject,
      bodyHtml: `
        <h2 style="margin: 0 0 12px; color: #0f172a;">A message from Lumexa Operations</h2>
        <p style="margin: 0 0 8px;">Hi ${params.teacherName},</p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; white-space: pre-wrap;">${params.message}</div>
      `,
    }),
  };
}

export function teacherPenaltyEmail(params: {
  teacherName: string;
  strikes: number;
  reason: string;
}) {
  const suspended = params.strikes >= 3;
  return {
    subject: suspended
      ? '⚠️ Account penalty — suspension review'
      : `⚠️ Penalty applied (strike ${params.strikes}/3)`,
    html: emailLayout({
      title: 'Penalty applied',
      bodyHtml: `
        <h2 style="margin: 0 0 12px; color: #0f172a;">Account penalty notice</h2>
        <p style="margin: 0 0 8px;">Hi ${params.teacherName},</p>
        <p style="margin: 0 0 8px;">A penalty (strike ${params.strikes}/3) has been recorded on your account.</p>
        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0; color: #991b1b;"><strong>Reason:</strong> ${params.reason}</p>
        </div>
        ${suspended ? '<p style="margin: 0 0 8px; color: #991b1b;">Reaching 3 strikes within 30 days is under review for account suspension. Please contact support.</p>' : '<p style="margin: 0 0 8px; color: #475569;">Reaching 3 strikes within 30 days may result in account suspension.</p>'}
      `,
    }),
  };
}
