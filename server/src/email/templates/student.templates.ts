import { emailButton, emailLayout, formatDateTime } from './layout';

export function classBookedEmail(params: {
  studentName: string;
  teacherName: string;
  classStart: Date;
  classEnd: Date;
  classUrl: string;
}) {
  return {
    subject: `✅ Class confirmed with ${params.teacherName}`,
    html: emailLayout({
      title: 'Class confirmed',
      bodyHtml: `
        <h2 style="margin: 0 0 12px; color: #0f172a;">Your class is confirmed</h2>
        <p style="margin: 0 0 8px;">Hi ${params.studentName},</p>
        <p style="margin: 0 0 8px;">Your class with <strong>${params.teacherName}</strong> is booked.</p>
        <div style="background: #0f2027; color: #5eead4; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0;"><strong>📅 When:</strong> ${formatDateTime(params.classStart)}</p>
        </div>
        ${emailButton('Join classroom', params.classUrl)}
      `,
    }),
  };
}

export function classRescheduledEmail(params: {
  studentName: string;
  teacherName: string;
  oldStart: Date;
  newStart: Date;
  changedBy: 'TEACHER' | 'ADMIN';
  reason?: string;
}) {
  return {
    subject: `Your class has been rescheduled`,
    html: emailLayout({
      title: 'Class rescheduled',
      bodyHtml: `
        <h2 style="margin: 0 0 12px; color: #0f172a;">Your class has been rescheduled</h2>
        <p style="margin: 0 0 8px;">Hi ${params.studentName},</p>
        <p style="margin: 0 0 8px;">Your class with <strong>${params.teacherName}</strong> was rescheduled by ${params.changedBy === 'TEACHER' ? 'your teacher' : 'Lumexa Operations'}.</p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0 0 6px; color: #94a3b8; text-decoration: line-through;"><strong>Previously:</strong> ${formatDateTime(params.oldStart)}</p>
          <p style="margin: 0; color: #0d9488;"><strong>Now:</strong> ${formatDateTime(params.newStart)}</p>
        </div>
        ${params.reason ? `<p style="margin: 0 0 8px; color: #475569;"><strong>Reason:</strong> ${params.reason}</p>` : ''}
      `,
    }),
  };
}

export function classCancelledEmail(params: {
  studentName: string;
  teacherName: string;
  classStart: Date;
  cancelledBy: 'TEACHER' | 'ADMIN';
  refundText?: string;
}) {
  return {
    subject: `Your class has been cancelled`,
    html: emailLayout({
      title: 'Class cancelled',
      bodyHtml: `
        <h2 style="margin: 0 0 12px; color: #0f172a;">Your class has been cancelled</h2>
        <p style="margin: 0 0 8px;">Hi ${params.studentName},</p>
        <p style="margin: 0 0 8px;">Your class with <strong>${params.teacherName}</strong> scheduled for ${formatDateTime(params.classStart)} was cancelled by ${params.cancelledBy === 'TEACHER' ? 'your teacher' : 'Lumexa Operations'}.</p>
        ${params.refundText ? `<p style="margin: 0 0 8px; color: #475569;">${params.refundText}</p>` : ''}
      `,
    }),
  };
}

export function classReminderEmail(params: {
  studentName: string;
  teacherName: string;
  classStart: Date;
  classUrl: string;
}) {
  return {
    subject: `⏰ Your class starts in 1 hour`,
    html: emailLayout({
      title: 'Class starting soon',
      bodyHtml: `
        <h2 style="margin: 0 0 12px; color: #0f172a;">⏰ Your class starts in 1 hour</h2>
        <p style="margin: 0 0 8px;">Hi ${params.studentName},</p>
        <p style="margin: 0 0 8px;">Your class with <strong>${params.teacherName}</strong> starts at ${formatDateTime(params.classStart)}.</p>
        ${emailButton('Join classroom', params.classUrl)}
      `,
    }),
  };
}

export function missedClassEmail(params: {
  studentName: string;
  teacherName: string;
  classStart: Date;
}) {
  return {
    subject: `You missed your class with ${params.teacherName}`,
    html: emailLayout({
      title: 'Missed class',
      bodyHtml: `
        <h2 style="margin: 0 0 12px; color: #0f172a;">We missed you in class</h2>
        <p style="margin: 0 0 8px;">Hi ${params.studentName},</p>
        <p style="margin: 0 0 8px;">Your class with <strong>${params.teacherName}</strong> scheduled for ${formatDateTime(params.classStart)} was marked as a no-show — our records show you didn't join.</p>
        <p style="margin: 0 0 8px; color: #475569;">A make-up session has been scheduled automatically. Check your dashboard for the new time, and reach out to support if this doesn't look right.</p>
      `,
    }),
  };
}

export function achievementEmail(params: {
  studentName: string;
  badges: { label: string; icon: string }[];
  newRank?: string;
  dashboardUrl: string;
}) {
  const badgeList = params.badges
    .map(
      (b) =>
        `<span style="display: inline-block; margin: 4px 8px 4px 0; padding: 8px 14px; background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 999px; color: #0f766e; font-weight: 600;">${b.icon} ${b.label}</span>`,
    )
    .join('');
  return {
    subject: params.newRank
      ? `🚀 ${params.studentName} ranked up to ${params.newRank}!`
      : `🎉 New achievement unlocked!`,
    html: emailLayout({
      title: 'Achievement unlocked',
      bodyHtml: `
        <h2 style="margin: 0 0 12px; color: #0f172a;">🎉 Great work, ${params.studentName}!</h2>
        ${params.newRank ? `<p style="margin: 0 0 8px;">You've ranked up to <strong>${params.newRank.replace(/_/g, ' ')}</strong>!</p>` : ''}
        <p style="margin: 0 0 12px;">You've unlocked:</p>
        <div>${badgeList}</div>
        ${emailButton('View my dashboard', params.dashboardUrl)}
      `,
    }),
  };
}

export function packageExpiringSoonEmail(params: {
  studentName: string;
  billingContactName: string;
  lessonsRemaining: number;
  courseName: string;
  paymentUrl: string;
}) {
  return {
    subject: `${params.studentName}'s Lumexa balance is running low`,
    html: emailLayout({
      title: 'Package expiring soon',
      bodyHtml: `
        <h2 style="margin: 0 0 12px; color: #0f172a;">${params.studentName}'s lesson balance is running low</h2>
        <p style="margin: 0 0 8px;">Hi ${params.billingContactName},</p>
        <p style="margin: 0 0 8px;">${params.studentName}'s current balance on <strong>${params.courseName}</strong> covers about <strong>${params.lessonsRemaining} more lesson${params.lessonsRemaining === 1 ? '' : 's'}</strong>. To make sure classes continue without interruption, consider making your next payment soon.</p>
        ${emailButton('Make a payment', params.paymentUrl, '#f59e0b')}
      `,
    }),
  };
}

export function packageExpiredEmail(params: {
  studentName: string;
  billingContactName: string;
  courseName: string;
  paymentUrl: string;
}) {
  return {
    subject: `Action needed: ${params.studentName}'s Lumexa balance has run out`,
    html: emailLayout({
      title: 'Package expired',
      bodyHtml: `
        <h2 style="margin: 0 0 12px; color: #0f172a;">${params.studentName}'s lesson balance has run out</h2>
        <p style="margin: 0 0 8px;">Hi ${params.billingContactName},</p>
        <p style="margin: 0 0 8px;">${params.studentName}'s balance on <strong>${params.courseName}</strong> has been fully used. To keep upcoming classes on schedule, please make a payment as soon as possible.</p>
        ${emailButton('Make a payment', params.paymentUrl, '#dc2626')}
      `,
    }),
  };
}

export function certificateIssuedEmail(params: {
  studentName: string;
  billingContactName: string;
  courseName: string;
  progressSummaryHtml: string;
  recommendedCourseName: string | null;
  recommendedCourseBlurb: string | null;
  dashboardUrl: string;
}) {
  const nextStepHtml = params.recommendedCourseName
    ? `
      <div style="background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0 0 6px; color: #0f766e; font-weight: 700;">What's next: ${params.recommendedCourseName}</p>
        <p style="margin: 0; color: #134e4a;">${params.recommendedCourseBlurb ?? ''} We've attached the full curriculum breakdown so you can see exactly what's covered.</p>
      </div>
    `
    : `<p style="margin: 16px 0; color: #475569;">${params.studentName} has now completed every Lumexa pathway — an incredible achievement! Reach out to us if you'd like to talk about advanced or custom next steps.</p>`;

  return {
    subject: `🎓 ${params.studentName} completed ${params.courseName}!`,
    html: emailLayout({
      title: 'Certificate issued',
      bodyHtml: `
        <h2 style="margin: 0 0 12px; color: #0f172a;">🎓 Congratulations, ${params.studentName}!</h2>
        <p style="margin: 0 0 8px;">Hi ${params.billingContactName},</p>
        <p style="margin: 0 0 8px;">${params.studentName} has successfully completed <strong>${params.courseName}</strong>! Their certificate is attached to this email and also available anytime on their Lumexa dashboard.</p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
          ${params.progressSummaryHtml}
        </div>
        ${nextStepHtml}
        ${emailButton('View on dashboard', params.dashboardUrl)}
      `,
    }),
  };
}
