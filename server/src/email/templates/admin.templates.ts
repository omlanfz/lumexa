import { emailButton, emailLayout } from './layout';

export function newStudentRegistrationEmail(params: {
  studentName: string;
  email: string;
  role: string;
  adminUrl: string;
}) {
  return {
    subject: `New registration: ${params.studentName}`,
    html: emailLayout({
      title: 'New student registration',
      bodyHtml: `
        <h2 style="margin: 0 0 12px; color: #0f172a;">New ${params.role.toLowerCase()} registration</h2>
        <p style="margin: 0 0 8px;"><strong>${params.studentName}</strong> (${params.email}) just registered on Lumexa.</p>
        ${emailButton('View in admin dashboard', params.adminUrl)}
      `,
    }),
  };
}

export function newTeacherApplicationEmail(params: {
  teacherName: string;
  email: string;
  adminUrl: string;
}) {
  return {
    subject: `New teacher application: ${params.teacherName}`,
    html: emailLayout({
      title: 'New teacher application',
      bodyHtml: `
        <h2 style="margin: 0 0 12px; color: #0f172a;">New teacher application</h2>
        <p style="margin: 0 0 8px;"><strong>${params.teacherName}</strong> (${params.email}) has applied to teach on Lumexa. Review their profile and verification documents when ready.</p>
        ${emailButton('Review teacher', params.adminUrl)}
      `,
    }),
  };
}

export function disputeFiledEmail(params: {
  filedByName: string;
  filedByRole: string;
  category: string;
  description: string;
  adminUrl: string;
}) {
  return {
    subject: `⚠️ Dispute filed by ${params.filedByName} (${params.filedByRole})`,
    html: emailLayout({
      title: 'Dispute filed',
      bodyHtml: `
        <h2 style="margin: 0 0 12px; color: #0f172a;">A dispute was filed</h2>
        <p style="margin: 0 0 8px;"><strong>${params.filedByName}</strong> (${params.filedByRole}) filed a dispute — category: <strong>${params.category}</strong>.</p>
        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 16px 0; white-space: pre-wrap;">${params.description}</div>
        ${emailButton('Review in admin dashboard', params.adminUrl, '#dc2626')}
      `,
    }),
  };
}

export function highCancellationRateEmail(params: {
  teacherName: string;
  count: number;
  threshold: number;
  monthLabel: string;
  adminUrl: string;
}) {
  return {
    subject: `⚠️ High cancellation rate: ${params.teacherName}`,
    html: emailLayout({
      title: 'High cancellation rate',
      bodyHtml: `
        <h2 style="margin: 0 0 12px; color: #0f172a;">High cancellation/no-show rate detected</h2>
        <p style="margin: 0 0 8px;"><strong>${params.teacherName}</strong> has ${params.count} emergency reschedules/cancellations in ${params.monthLabel} (threshold: ${params.threshold}).</p>
        ${emailButton('Review teacher', params.adminUrl, '#dc2626')}
      `,
    }),
  };
}

export function lowActivityEmail(params: {
  teacherName: string;
  daysInactive: number;
  thresholdDays: number;
  adminUrl: string;
}) {
  return {
    subject: `Low activity: ${params.teacherName} inactive for ${params.daysInactive} days`,
    html: emailLayout({
      title: 'Low platform activity',
      bodyHtml: `
        <h2 style="margin: 0 0 12px; color: #0f172a;">Low platform activity detected</h2>
        <p style="margin: 0 0 8px;"><strong>${params.teacherName}</strong> has not logged in for ${params.daysInactive} days (threshold: ${params.thresholdDays} days).</p>
        ${emailButton('View teacher', params.adminUrl, '#f59e0b')}
      `,
    }),
  };
}

export function systemErrorAlertEmail(params: {
  status: number;
  message: string;
  path: string;
  timestamp: string;
}) {
  return {
    subject: `🔴 Lumexa system error (${params.status}) on ${params.path}`,
    html: emailLayout({
      title: 'System error alert',
      bodyHtml: `
        <h2 style="margin: 0 0 12px; color: #0f172a;">Critical system error</h2>
        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 16px 0; font-family: monospace; font-size: 13px;">
          <p style="margin: 0 0 4px;"><strong>Status:</strong> ${params.status}</p>
          <p style="margin: 0 0 4px;"><strong>Path:</strong> ${params.path}</p>
          <p style="margin: 0 0 4px;"><strong>Time:</strong> ${params.timestamp}</p>
          <p style="margin: 8px 0 0; white-space: pre-wrap;">${params.message}</p>
        </div>
      `,
    }),
  };
}
