import {
  dearParent,
  emailButton,
  emailLayout,
  escapeHtml,
  formatDateTime,
} from './layout';

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
        ${dearParent()}
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
        ${dearParent()}
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
        ${dearParent()}
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
        ${dearParent()}
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
  /** Set for a batch class: it cannot be redone for one student, so there is
   * no make-up — the recording is how they catch up. */
  batchName?: string;
}) {
  return {
    subject: `You missed your class with ${params.teacherName}`,
    html: emailLayout({
      title: 'Missed class',
      bodyHtml: `
        <h2 style="margin: 0 0 12px; color: #0f172a;">We missed you in class</h2>
        ${dearParent()}
        <p style="margin: 0 0 8px;">Your class with <strong>${params.teacherName}</strong> scheduled for ${formatDateTime(params.classStart)} was marked as a no-show — our records show you didn't join.</p>
        ${
          params.batchName
            ? `<p style="margin: 0 0 8px; color: #475569;"><strong>${params.batchName}</strong> is a small-group class, so it can't be repeated for one student. You can watch the class recording from your dashboard to catch up, and reach out to ${params.teacherName} if you need help with anything you missed.</p>`
            : `<p style="margin: 0 0 8px; color: #475569;">A make-up session has been scheduled automatically. Check your dashboard for the new time, and reach out to support if this doesn't look right.</p>`
        }
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

// The two class-credit payment emails. Their "Make a payment" button opens the
// admin's WhatsApp with the payment request already typed in (`paymentUrl`,
// built by students/credit-packages.ts) — payments are arranged by hand.

/** First reminder: three or fewer class credits left (never zero — that is the
 * second email). */
export function packageExpiringSoonEmail(params: {
  studentName: string;
  courseName: string;
  /** Whole class credits the student has left. */
  creditsRemaining: number;
  paymentUrl: string;
}) {
  const student = escapeHtml(params.studentName);
  const course = escapeHtml(params.courseName);
  const credits = `${params.creditsRemaining} class credit${params.creditsRemaining === 1 ? '' : 's'}`;
  return {
    subject: `${params.studentName}'s Lumexa class credits are running low`,
    html: emailLayout({
      title: 'Class credits running low',
      bodyHtml: `
        ${dearParent()}
        <p style="margin: 0 0 8px;">${student} has only ${credits} remaining for ${course} at Lumexa.</p>
        <p style="margin: 0 0 8px;">To help ensure upcoming classes continue without interruption, we kindly recommend arranging the next payment soon.</p>
        ${emailButton('Make a payment', params.paymentUrl, '#f59e0b')}
        <p style="margin: 0 0 8px;">Thank you for your continued support.</p>
      `,
    }),
  };
}

/** Second reminder: no credits left (also sent when the student is overdrawn). */
export function packageExpiredEmail(params: {
  studentName: string;
  courseName: string;
  paymentUrl: string;
}) {
  const student = escapeHtml(params.studentName);
  const course = escapeHtml(params.courseName);
  return {
    subject: `Action needed: ${params.studentName}'s Lumexa class credits have run out`,
    html: emailLayout({
      title: 'Class credits have run out',
      bodyHtml: `
        ${dearParent()}
        <p style="margin: 0 0 8px;">${student}’s available class credits for ${course} at Lumexa have been fully used.</p>
        <p style="margin: 0 0 8px;">Please make a payment to add more credits and keep upcoming classes on schedule.</p>
        ${emailButton('Make a payment', params.paymentUrl, '#dc2626')}
        <p style="margin: 0 0 8px;">Thank you for your understanding and continued support.</p>
      `,
    }),
  };
}

/** The congratulatory email sent once a certificate has been issued and stored,
 *  with the certificate PDF attached. Wording is the founder's own; the only
 *  dynamic parts are the student's first name, the programme, the dates, the
 *  certificate ID and the links (all built from FRONTEND_URL by the caller). The
 *  "next programme" button always opens the general catalogue — it never picks a
 *  programme for the student (any personal recommendation is made by an admin). */
export function certificateIssuedEmail(params: {
  studentFirstName: string;
  programName: string;
  /** Already formatted for display, e.g. "2 November 2026". */
  completionDate: string;
  certificateId: string;
  /** The student's My Certificates page. */
  certificateUrl: string;
  /** The public verification page. */
  verificationUrl: string;
  /** Lumexa's general programme catalogue. */
  programCatalogueUrl: string;
}) {
  const first = escapeHtml(params.studentFirstName || 'there');
  const program = escapeHtml(params.programName);
  const verifyHref = escapeHtml(params.verificationUrl);
  const row = (label: string, value: string) =>
    `<p style="margin: 0 0 6px;"><strong>${label}:</strong> ${value}</p>`;
  return {
    subject: '🎉 Congratulations! Your Lumexa certificate is ready!',
    html: emailLayout({
      title: 'Your Lumexa certificate is ready',
      previewText: `You've completed the ${program} at Lumexa AI School — your certificate is attached.`,
      bodyHtml: `
        <p style="margin: 0 0 12px;">Hi ${first},</p>
        <h2 style="margin: 0 0 12px; color: #0f172a;">Congratulations! 🎉</h2>
        <p style="margin: 0 0 12px;">You've successfully completed the <strong>${program}</strong> at Lumexa AI School!</p>
        <p style="margin: 0 0 12px;">This is a wonderful milestone in your learning journey. You've put in the effort, explored new ideas, worked on practical projects, and taken another exciting step forward. We're proud of what you've accomplished! 🚀</p>
        <p style="margin: 0 0 12px;">Your official Lumexa Certificate of Completion is attached to this email as a PDF. You can also access it anytime from your student dashboard, where you can download, share, and verify your certificate.</p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0 0 8px; font-weight: 700; color: #0f172a;">Your achievement:</p>
          ${row('Program', program)}
          ${row('Completion date', escapeHtml(params.completionDate))}
          ${row('Certificate ID', escapeHtml(params.certificateId))}
        </div>
        ${emailButton('View &amp; Download Your Certificate', escapeHtml(params.certificateUrl))}
        <p style="margin: 0 0 12px; font-size: 13px; color: #475569;">Anyone can check that your certificate is genuine at <a href="${verifyHref}" style="color: #0d9488;">${verifyHref}</a>.</p>
        <h3 style="margin: 24px 0 8px; color: #0f172a;">What's next?</h3>
        <p style="margin: 0 0 12px;">One learning adventure ends, but another is waiting! There are always new skills to explore, ideas to discover, and exciting projects to create.</p>
        <p style="margin: 0 0 4px;">Ready for your next challenge?</p>
        ${emailButton('Find Your Next Program', escapeHtml(params.programCatalogueUrl), '#4f46e5')}
        <p style="margin: 0 0 16px;">Keep creating, keep experimenting, and never stop learning! 🌟</p>
        <p style="margin: 0;">Warm regards,<br /><strong>Fairooz Mashwiyat Omlan</strong><br />Founder &amp; CEO<br />Lumexa AI School<br /><em>Code. Create. Impact.</em></p>
      `,
    }),
  };
}

// ─── Test report card (sent to the parent/guardian by the evaluating teacher) ─

export interface TestReportEmailParams {
  studentName: string;
  teacherName: string;
  courseTitle: string;
  testTitle: string;
  testTypeLabel: string;
  submittedAt: Date;
  objective: {
    score: number;
    max: number;
    mcq: { correct: number; total: number };
    trueFalse: { correct: number; total: number };
  };
  coding: { score: number; max: number } | null;
  /** How the practical's row is named (Little Coders: "Practical project …"). Defaults to the coding project wording. */
  codingLabel?: string;
  total: number;
  totalMax: number;
  percentage: number;
  passed: boolean;
  passScorePct: number;
  feedback: string | null;
  strengths: string | null;
  improvements: string | null;
  codingFeedback: string | null;
  dashboardUrl: string;
}

/** Teacher-written text, safe for HTML with line breaks preserved. */
function paragraphs(text: string): string {
  return escapeHtml(text).replace(/\r?\n/g, '<br />');
}

function noteBlock(title: string, text: string | null): string {
  if (!text || !text.trim()) return '';
  return `
    <div style="margin: 16px 0;">
      <p style="margin: 0 0 4px; font-weight: 700; color: #0f172a;">${escapeHtml(title)}</p>
      <p style="margin: 0; color: #334155;">${paragraphs(text)}</p>
    </div>`;
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export function testReportEmail(params: TestReportEmailParams) {
  const resultColor = params.passed ? '#15803d' : '#b45309';
  const resultLabel = params.passed
    ? `Passed (pass mark ${params.passScorePct}%)`
    : `Below the ${params.passScorePct}% pass mark — a good chance to revisit the topics together`;
  const row = (label: string, value: string) =>
    `<tr><td style="padding: 8px 0; color: #64748b; border-bottom: 1px solid #e2e8f0;">${escapeHtml(label)}</td><td style="padding: 8px 0; text-align: right; font-weight: 600; border-bottom: 1px solid #e2e8f0;">${value}</td></tr>`;

  return {
    subject: `${params.studentName}'s ${params.testTitle} report card`,
    html: emailLayout({
      title: 'Test report card',
      previewText: `${params.studentName} scored ${fmt(params.percentage)}% on ${params.testTitle}.`,
      bodyHtml: `
        <h2 style="margin: 0 0 12px; color: #0f172a;">📝 ${escapeHtml(params.studentName)}'s test report</h2>
        ${dearParent()}
        <p style="margin: 0 0 8px;">${escapeHtml(params.teacherName)} has reviewed ${escapeHtml(params.studentName)}'s <strong>${escapeHtml(params.testTitle)}</strong> (${escapeHtml(params.courseTitle)}) and approved the report card below.</p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 16px; margin: 16px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px;">
            ${row('Assessment', `${escapeHtml(params.testTypeLabel)}`)}
            ${row('Date taken', escapeHtml(formatDateTime(params.submittedAt)))}
            ${row(
              `Objective questions (${params.objective.mcq.total} multiple-choice + ${params.objective.trueFalse.total} True/False)`,
              `${fmt(params.objective.score)} / ${fmt(params.objective.max)}`,
            )}
            ${row('Multiple-choice correct', `${params.objective.mcq.correct} / ${params.objective.mcq.total}`)}
            ${row('True/False correct', `${params.objective.trueFalse.correct} / ${params.objective.trueFalse.total}`)}
            ${params.coding ? row(params.codingLabel ?? 'Coding project (marked by the teacher)', `${fmt(params.coding.score)} / ${fmt(params.coding.max)}`) : ''}
            ${row('Total', `${fmt(params.total)} / ${fmt(params.totalMax)}`)}
            <tr><td style="padding: 12px 0 8px; font-weight: 700;">Percentage</td><td style="padding: 12px 0 8px; text-align: right; font-size: 20px; font-weight: 800; color: ${resultColor};">${fmt(params.percentage)}%</td></tr>
          </table>
        </div>
        <p style="margin: 0 0 8px; font-weight: 700; color: ${resultColor};">${escapeHtml(resultLabel)}</p>
        ${noteBlock('Teacher feedback', params.feedback)}
        ${noteBlock('Strengths', params.strengths)}
        ${noteBlock('Areas to work on', params.improvements)}
        ${noteBlock('Coding project feedback', params.codingFeedback)}
        ${emailButton('View on dashboard', params.dashboardUrl)}
      `,
    }),
  };
}
