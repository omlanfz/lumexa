// FILE PATH: server/src/notifications/notifications.service.ts
//
// The single centralized place every part of the app asks for a
// user-facing email. All transport, retry, and delivery-status tracking
// lives in EmailService (Gmail SMTP + Nodemailer) — this service only
// picks a template (server/src/email/templates/*) and a dedupe key, then
// calls EmailService.send(). Callers always fire-and-forget
// (`.catch(() => {})`), matching the convention used everywhere else in
// this codebase (see StudentLedgerService, EngagementService, etc.).

import { Injectable, Logger } from '@nestjs/common';
import { EmailService, EmailAttachment } from '../email/email.service';
import {
  welcomeEmail,
  passwordResetEmail,
} from '../email/templates/auth.templates';
import {
  classBookedEmail,
  classRescheduledEmail,
  classCancelledEmail,
  classReminderEmail,
  missedClassEmail,
  achievementEmail,
  packageExpiringSoonEmail,
  packageExpiredEmail,
  certificateIssuedEmail,
} from '../email/templates/student.templates';
import {
  teacherAccountCreatedEmail,
  teacherApprovedEmail,
  teacherStudentAssignedEmail,
  teacherClassChangedByStudentEmail,
  teacherClassReminderEmail,
  teacherAdminMessageEmail,
  teacherPenaltyEmail,
} from '../email/templates/teacher.templates';
import {
  newStudentRegistrationEmail,
  newTeacherApplicationEmail,
  disputeFiledEmail,
  highCancellationRateEmail,
  lowActivityEmail,
  systemErrorAlertEmail,
} from '../email/templates/admin.templates';

interface BookingEmailData {
  teacherName: string;
  classStart: Date;
  classEnd: Date;
  bookingId: string;
}

function adminRecipients(): string[] {
  return (process.env.ADMIN_NOTIFICATION_EMAILS || '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly email: EmailService) {}

  // ─── Legacy free-form send (kept for the pre-existing templates below,
  // which render their own inline HTML rather than going through
  // server/src/email/templates) ──────────────────────────────────────────
  private async send(
    to: string,
    subject: string,
    html: string,
    category: string,
    dedupeKey?: string,
  ): Promise<void> {
    await this.email.send({ to, subject, html, category, dedupeKey });
  }

  // ══════════════════════════════════════════════════════════════════════
  // Pre-existing notifications (signatures unchanged — callers untouched)
  // ══════════════════════════════════════════════════════════════════════

  async sendBookingConfirmation(
    recipientEmail: string,
    data: BookingEmailData,
  ): Promise<void> {
    const classUrl = `${process.env.FRONTEND_URL}/classroom/${data.bookingId}`;
    const { subject, html } = classBookedEmail({
      studentName: 'there',
      teacherName: data.teacherName,
      classStart: data.classStart,
      classEnd: data.classEnd,
      classUrl,
    });
    await this.send(
      recipientEmail,
      subject,
      html,
      'CLASS_BOOKED',
      `class-booked:${data.bookingId}`,
    );
  }

  async sendConsentRequest(
    billingContactEmail: string,
    data: {
      studentName: string;
      consentUrl: string;
      expiresHours: number;
    },
  ): Promise<void> {
    await this.send(
      billingContactEmail,
      `Action Required: Activate ${data.studentName}'s Lumexa Account`,
      `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0d9488;">Parental Consent Required</h2>
        <p><strong>${data.studentName}</strong> has registered on Lumexa and needs your approval to activate their account.</p>
        <p>Lumexa is an online tutoring platform for K-12 students. By clicking the button below, you confirm that you are the parent or guardian of ${data.studentName} and consent to their use of the platform.</p>
        <p>This link expires in <strong>${data.expiresHours} hours</strong>.</p>
        <a href="${data.consentUrl}"
          style="display: inline-block; background: #0d9488; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 16px 0;">
          Activate ${data.studentName}'s Account →
        </a>
        <p style="color: #6b7280; font-size: 13px; margin-top: 24px;">
          If you did not expect this email, please ignore it. The account will not be activated without your action.
        </p>
      </div>
      `,
      'CONSENT_REQUEST',
    );
  }

  async sendGemTopupRequest(
    billingContactEmail: string,
    data: {
      studentName: string;
      gems: number;
      studentEmail: string;
    },
  ): Promise<void> {
    const dashboardUrl = `${process.env.FRONTEND_URL}/dashboard`;

    await this.send(
      billingContactEmail,
      `${data.studentName} is requesting ${data.gems} Lumexa Gems`,
      `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f59e0b;">✦ Gem Top-Up Request</h2>
        <p><strong>${data.studentName}</strong> (${data.studentEmail}) has requested <strong>${data.gems} Gems</strong> on Lumexa.</p>
        <p>Gems are used to book tutoring sessions and access course content on the platform.</p>
        <div style="background: #1c1917; color: #fbbf24; padding: 16px; border-radius: 8px; margin: 24px 0;">
          <p style="margin: 0; font-size: 18px;"><strong>✦ ${data.gems} Gems</strong> requested</p>
        </div>
        <p>Log in to your parent dashboard to purchase gems for ${data.studentName}:</p>
        <a href="${dashboardUrl}"
          style="display: inline-block; background: #f59e0b; color: black; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
          Go to Dashboard →
        </a>
        <p style="color: #6b7280; font-size: 13px; margin-top: 24px;">
          If you have questions, contact support at support@lumexa.app
        </p>
      </div>
      `,
      'GEM_TOPUP_REQUEST',
    );
  }

  async sendCancellationNotice(
    parentEmail: string,
    teacherEmail: string,
    refundAmountCents: number,
    data: BookingEmailData,
  ): Promise<void> {
    const refundText =
      refundAmountCents > 0
        ? `A refund of $${(refundAmountCents / 100).toFixed(2)} has been issued and will appear within 5-10 business days.`
        : 'No refund applies based on the cancellation policy (less than 2 hours before class).';

    await Promise.all([
      this.send(
        parentEmail,
        'Class Cancellation Confirmed',
        `<p>Your class with ${data.teacherName} has been cancelled.</p><p>${refundText}</p>`,
        'CLASS_CANCELLED',
        `cancel-notice-parent:${data.bookingId}`,
      ),
      this.send(
        teacherEmail,
        'A booking has been cancelled',
        `<p>A student has cancelled their booking scheduled for ${data.classStart.toLocaleString()}.</p>`,
        'CLASS_CANCELLED_TEACHER_NOTICE',
        `cancel-notice-teacher:${data.bookingId}`,
      ),
    ]);
  }

  async sendStreakLostNotice(
    studentEmail: string,
    data: { studentName: string; streakWeeks: number },
  ): Promise<void> {
    const marketplaceUrl = `${process.env.FRONTEND_URL}/marketplace`;
    await this.send(
      studentEmail,
      `🛸 Streak Lost — Come Back, ${data.studentName}!`,
      `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0d9488;">Comeback Cadet — Your Streak Reset</h2>
        <p>Your <strong>${data.streakWeeks}-week streak</strong> has reset because you didn't have a completed session last week.</p>
        <p>But the galaxy awaits! Every Cadet falls off orbit sometimes — the true pilots are the ones who climb back.</p>
        <a href="${marketplaceUrl}" style="display: inline-block; background: #0d9488; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 16px 0;">
          Book a Session →
        </a>
        <p style="color: #6b7280; font-size: 13px; margin-top: 24px;">
          Complete at least one lesson each week to keep your streak going.
        </p>
      </div>
      `,
      'STREAK_LOST',
    );
  }

  async sendMonthlyDigest(
    billingContactEmail: string,
    data: {
      studentName: string;
      monthLabel: string;
      sessionsThisMonth: number;
      totalHoursThisMonth: number;
      currentRank: string;
      rankIcon: string;
      streakWeeks: number;
      nextSession: { start: Date; teacherName: string } | null;
      marketplaceUrl: string;
    },
  ): Promise<void> {
    const nextSessionText = data.nextSession
      ? `<p><strong>📅 Next Session:</strong> ${new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(data.nextSession.start)} with ${data.nextSession.teacherName}</p>`
      : `<p>No upcoming sessions booked. <a href="${data.marketplaceUrl}">Book one now →</a></p>`;

    await this.send(
      billingContactEmail,
      `${data.studentName}'s Learning Report — ${data.monthLabel}`,
      `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0d9488;">${data.rankIcon} ${data.studentName}'s Monthly Report</h2>
        <p style="color: #6b7280;">${data.monthLabel}</p>
        <div style="background: #0f172a; color: #e2e8f0; padding: 20px; border-radius: 12px; margin: 20px 0;">
          <p style="margin: 0 0 8px;"><strong>📚 Sessions this month:</strong> ${data.sessionsThisMonth}</p>
          <p style="margin: 0 0 8px;"><strong>⏱️ Hours learned:</strong> ${data.totalHoursThisMonth}h</p>
          <p style="margin: 0 0 8px;"><strong>🚀 Current rank:</strong> ${data.rankIcon} ${data.currentRank.replace(/_/g, ' ')}</p>
          <p style="margin: 0;"><strong>🔥 Streak:</strong> ${data.streakWeeks} week${data.streakWeeks !== 1 ? 's' : ''}</p>
        </div>
        ${nextSessionText}
        <a href="${data.marketplaceUrl}" style="display: inline-block; background: #0d9488; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 16px;">
          Book More Sessions →
        </a>
        <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">
          Lumexa · ${data.studentName}'s learning partner
        </p>
      </div>
      `,
      'MONTHLY_DIGEST',
    );
  }

  // ══════════════════════════════════════════════════════════════════════
  // Auth
  // ══════════════════════════════════════════════════════════════════════

  async sendWelcomeEmail(
    to: string,
    data: {
      userId: string;
      name: string;
      role: 'PARENT' | 'STUDENT' | 'TEACHER';
    },
  ): Promise<void> {
    const dashboardUrl = `${process.env.FRONTEND_URL}/login`;
    const { subject, html } = welcomeEmail({
      name: data.name,
      role: data.role,
      dashboardUrl,
    });
    await this.send(to, subject, html, 'WELCOME', `welcome:${data.userId}`);
  }

  /** Never deduped — a parent/teacher/student may legitimately request a new reset link more than once. */
  async sendPasswordResetEmail(
    to: string,
    data: { name: string; token: string; expiresMinutes: number },
  ): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${data.token}`;
    const { subject, html } = passwordResetEmail({
      name: data.name,
      resetUrl,
      expiresMinutes: data.expiresMinutes,
    });
    await this.send(to, subject, html, 'PASSWORD_RESET');
  }

  // ══════════════════════════════════════════════════════════════════════
  // Student / parent
  // ══════════════════════════════════════════════════════════════════════

  /** No dedupe key — each call corresponds to a distinct, explicit admin
   * scheduling action (Operations rarely re-triggers this for the same
   * student/course on the same day), so unlike most other notifications a
   * duplicate-looking call is legitimate rather than a retry. */
  async sendClassBookedEmail(
    to: string,
    data: {
      studentName: string;
      teacherName: string;
      classStart: Date;
      classEnd: Date;
      classUrl: string;
    },
  ): Promise<void> {
    const { subject, html } = classBookedEmail(data);
    await this.send(to, subject, html, 'CLASS_BOOKED');
  }

  async sendClassRescheduledToStudent(
    to: string,
    data: {
      requestId: string;
      studentName: string;
      teacherName: string;
      oldStart: Date;
      newStart: Date;
      changedBy: 'TEACHER' | 'ADMIN';
      reason?: string;
    },
  ): Promise<void> {
    const { subject, html } = classRescheduledEmail(data);
    await this.send(
      to,
      subject,
      html,
      'CLASS_RESCHEDULED',
      `class-rescheduled:${data.requestId}`,
    );
  }

  async sendClassCancelledToStudent(
    to: string,
    data: {
      requestId: string;
      studentName: string;
      teacherName: string;
      classStart: Date;
      cancelledBy: 'TEACHER' | 'ADMIN';
      refundText?: string;
    },
  ): Promise<void> {
    const { subject, html } = classCancelledEmail(data);
    await this.send(
      to,
      subject,
      html,
      'CLASS_CANCELLED',
      `class-cancelled:${data.requestId}`,
    );
  }

  async sendClassReminderToStudent(
    to: string,
    data: {
      lessonId: string;
      studentName: string;
      teacherName: string;
      classStart: Date;
      classUrl: string;
    },
  ): Promise<void> {
    const { subject, html } = classReminderEmail(data);
    await this.send(
      to,
      subject,
      html,
      'CLASS_REMINDER',
      `reminder-student:${data.lessonId}`,
    );
  }

  async sendMissedClassNotice(
    to: string,
    data: {
      lessonId: string;
      studentName: string;
      teacherName: string;
      classStart: Date;
    },
  ): Promise<void> {
    const { subject, html } = missedClassEmail(data);
    await this.send(
      to,
      subject,
      html,
      'MISSED_CLASS',
      `no-show:${data.lessonId}`,
    );
  }

  async sendAchievementEmail(
    to: string,
    data: {
      userId: string;
      studentName: string;
      badges: { label: string; icon: string }[];
      newRank?: string;
    },
  ): Promise<void> {
    if (data.badges.length === 0) return;
    const dashboardUrl = `${process.env.FRONTEND_URL}/student-dashboard`;
    const { subject, html } = achievementEmail({ ...data, dashboardUrl });
    const key = `achievement:${data.userId}:${data.badges.map((b) => b.label).join(',')}`;
    await this.send(to, subject, html, 'ACHIEVEMENT', key);
  }

  async sendPackageExpiringSoon(
    to: string,
    data: {
      studentUserId: string;
      studentName: string;
      billingContactName: string;
      lessonsRemaining: number;
      courseName: string;
      monthBucket: string;
    },
  ): Promise<void> {
    const paymentUrl = `${process.env.FRONTEND_URL}/dashboard`;
    const { subject, html } = packageExpiringSoonEmail({ ...data, paymentUrl });
    await this.send(
      to,
      subject,
      html,
      'PACKAGE_EXPIRING_SOON',
      `package-expiring:${data.studentUserId}:${data.monthBucket}`,
    );
  }

  async sendPackageExpired(
    to: string,
    data: {
      studentUserId: string;
      studentName: string;
      billingContactName: string;
      courseName: string;
      monthBucket: string;
    },
  ): Promise<void> {
    const paymentUrl = `${process.env.FRONTEND_URL}/dashboard`;
    const { subject, html } = packageExpiredEmail({ ...data, paymentUrl });
    await this.send(
      to,
      subject,
      html,
      'PACKAGE_EXPIRED',
      `package-expired:${data.studentUserId}:${data.monthBucket}`,
    );
  }

  async sendCertificateIssuedEmail(
    to: string,
    data: {
      studentUserId: string;
      courseId: string;
      studentName: string;
      billingContactName: string;
      courseName: string;
      progressSummaryHtml: string;
      recommendedCourseName: string | null;
      recommendedCourseBlurb: string | null;
    },
    attachments: EmailAttachment[],
  ): Promise<void> {
    const dashboardUrl = `${process.env.FRONTEND_URL}/student-dashboard`;
    const { subject, html } = certificateIssuedEmail({ ...data, dashboardUrl });
    await this.email.send({
      to,
      subject,
      html,
      category: 'CERTIFICATE_ISSUED',
      dedupeKey: `certificate:${data.studentUserId}:${data.courseId}`,
      attachments,
    });
  }

  // ══════════════════════════════════════════════════════════════════════
  // Teacher
  // ══════════════════════════════════════════════════════════════════════

  async sendTeacherAccountCreatedEmail(
    to: string,
    data: { userId: string; teacherName: string },
  ): Promise<void> {
    const dashboardUrl = `${process.env.FRONTEND_URL}/teacher-profile`;
    const { subject, html } = teacherAccountCreatedEmail({
      teacherName: data.teacherName,
      dashboardUrl,
    });
    await this.send(
      to,
      subject,
      html,
      'TEACHER_WELCOME',
      `teacher-welcome:${data.userId}`,
    );
  }

  async sendTeacherApprovedEmail(
    to: string,
    data: { teacherProfileId: string; teacherName: string },
  ): Promise<void> {
    const dashboardUrl = `${process.env.FRONTEND_URL}/teacher-dashboard`;
    const { subject, html } = teacherApprovedEmail({
      teacherName: data.teacherName,
      dashboardUrl,
    });
    await this.send(
      to,
      subject,
      html,
      'TEACHER_APPROVED',
      `teacher-approved:${data.teacherProfileId}`,
    );
  }

  async sendTeacherStudentAssignedEmail(
    to: string,
    data: { teacherName: string; studentName: string },
  ): Promise<void> {
    const dashboardUrl = `${process.env.FRONTEND_URL}/teacher-dashboard`;
    const { subject, html } = teacherStudentAssignedEmail({
      ...data,
      dashboardUrl,
    });
    await this.send(to, subject, html, 'TEACHER_STUDENT_ASSIGNED');
  }

  async sendTeacherClassChangedByStudent(
    to: string,
    data: {
      requestId: string;
      teacherName: string;
      studentName: string;
      classStart: Date;
      action: 'RESCHEDULED' | 'CANCELLED';
    },
  ): Promise<void> {
    const { subject, html } = teacherClassChangedByStudentEmail(data);
    await this.send(
      to,
      subject,
      html,
      'TEACHER_CLASS_CHANGED',
      `teacher-class-changed:${data.requestId}`,
    );
  }

  async sendTeacherClassReminder(
    to: string,
    data: {
      lessonId: string;
      teacherName: string;
      studentName: string;
      classStart: Date;
      classUrl: string;
    },
  ): Promise<void> {
    const { subject, html } = teacherClassReminderEmail(data);
    await this.send(
      to,
      subject,
      html,
      'TEACHER_CLASS_REMINDER',
      `reminder-teacher:${data.lessonId}`,
    );
  }

  async sendTeacherAdminMessage(
    to: string,
    data: { teacherName: string; subject: string; message: string },
  ): Promise<void> {
    const { subject, html } = teacherAdminMessageEmail(data);
    await this.send(to, subject, html, 'TEACHER_ADMIN_MESSAGE');
  }

  async sendTeacherPenalty(
    to: string,
    data: {
      teacherProfileId: string;
      teacherName: string;
      strikes: number;
      reason: string;
    },
  ): Promise<void> {
    const { subject, html } = teacherPenaltyEmail(data);
    await this.send(
      to,
      subject,
      html,
      'TEACHER_PENALTY',
      `teacher-penalty:${data.teacherProfileId}:${data.strikes}`,
    );
  }

  // ══════════════════════════════════════════════════════════════════════
  // Admin
  // ══════════════════════════════════════════════════════════════════════

  private async sendToAdmins(
    subject: string,
    html: string,
    category: string,
    dedupeKey?: string,
  ): Promise<void> {
    const recipients = adminRecipients();
    if (recipients.length === 0) {
      this.logger.warn(
        `ADMIN_NOTIFICATION_EMAILS is not set — dropped admin alert "${subject}".`,
      );
      return;
    }
    await this.send(recipients.join(','), subject, html, category, dedupeKey);
  }

  async sendAdminNewRegistration(data: {
    userId: string;
    name: string;
    email: string;
    role: string;
  }): Promise<void> {
    const adminUrl = `${process.env.FRONTEND_URL}/admin/students`;
    const { subject, html } = newStudentRegistrationEmail({
      studentName: data.name,
      email: data.email,
      role: data.role,
      adminUrl,
    });
    await this.sendToAdmins(
      subject,
      html,
      'ADMIN_NEW_REGISTRATION',
      `admin-new-reg:${data.userId}`,
    );
  }

  async sendAdminNewTeacherApplication(data: {
    userId: string;
    teacherName: string;
    email: string;
  }): Promise<void> {
    const adminUrl = `${process.env.FRONTEND_URL}/admin/teachers`;
    const { subject, html } = newTeacherApplicationEmail({
      teacherName: data.teacherName,
      email: data.email,
      adminUrl,
    });
    await this.sendToAdmins(
      subject,
      html,
      'ADMIN_NEW_TEACHER',
      `admin-new-teacher:${data.userId}`,
    );
  }

  async sendAdminDisputeFiled(data: {
    disputeId: string;
    filedByName: string;
    filedByRole: string;
    category: string;
    description: string;
  }): Promise<void> {
    const adminUrl = `${process.env.FRONTEND_URL}/admin`;
    const { subject, html } = disputeFiledEmail({ ...data, adminUrl });
    await this.sendToAdmins(
      subject,
      html,
      'ADMIN_DISPUTE',
      `admin-dispute:${data.disputeId}`,
    );
  }

  async sendAdminHighCancellationRate(data: {
    teacherId: string;
    teacherName: string;
    count: number;
    threshold: number;
    monthLabel: string;
    monthBucket: string;
  }): Promise<void> {
    const adminUrl = `${process.env.FRONTEND_URL}/admin/teachers`;
    const { subject, html } = highCancellationRateEmail({ ...data, adminUrl });
    await this.sendToAdmins(
      subject,
      html,
      'ADMIN_HIGH_CANCELLATION',
      `admin-high-cancel:${data.teacherId}:${data.monthBucket}`,
    );
  }

  async sendAdminLowActivity(data: {
    teacherId: string;
    teacherName: string;
    daysInactive: number;
    thresholdDays: number;
    weekBucket: string;
  }): Promise<void> {
    const adminUrl = `${process.env.FRONTEND_URL}/admin/teachers`;
    const { subject, html } = lowActivityEmail({ ...data, adminUrl });
    await this.sendToAdmins(
      subject,
      html,
      'ADMIN_LOW_ACTIVITY',
      `admin-low-activity:${data.teacherId}:${data.weekBucket}`,
    );
  }

  async sendAdminSystemError(data: {
    status: number;
    message: string;
    path: string;
    bucketKey: string;
  }): Promise<void> {
    const { subject, html } = systemErrorAlertEmail({
      ...data,
      timestamp: new Date().toISOString(),
    });
    await this.sendToAdmins(
      subject,
      html,
      'ADMIN_SYSTEM_ERROR',
      `admin-system-error:${data.bucketKey}`,
    );
  }
}
