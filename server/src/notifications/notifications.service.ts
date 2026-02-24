import { Injectable, Logger } from '@nestjs/common';

interface BookingEmailData {
  teacherName: string;
  classStart: Date;
  classEnd: Date;
  bookingId: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private resend: any;

  constructor() {
    if (!process.env.RESEND_API_KEY) {
      this.logger.warn(
        'RESEND_API_KEY is not set. Email notifications are disabled.',
      );
      return;
    }
    // Lazy import to avoid hard crash if package not installed yet
    try {
      const { Resend } = require('resend');
      this.resend = new Resend(process.env.RESEND_API_KEY);
    } catch {
      this.logger.warn('Resend package not installed. Run: npm install resend');
    }
  }

  private get fromAddress(): string {
    return `Lumexa <noreply@${process.env.EMAIL_DOMAIN || 'lumexa.app'}>`;
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    if (!this.resend) return;

    try {
      await this.resend.emails.send({
        from: this.fromAddress,
        to,
        subject,
        html,
      });
    } catch (err) {
      // Never let email failures crash the main flow
      this.logger.error(`Failed to send email to ${to}: ${err}`);
    }
  }

  async sendBookingConfirmation(
    parentEmail: string,
    data: BookingEmailData,
  ): Promise<void> {
    const classUrl = `${process.env.FRONTEND_URL}/classroom/${data.bookingId}`;
    const formattedDate = new Intl.DateTimeFormat('en-US', {
      dateStyle: 'full',
      timeStyle: 'short',
    }).format(data.classStart);

    await this.send(
      parentEmail,
      `✅ Class Confirmed with ${data.teacherName}`,
      `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6d28d9;">Class Booking Confirmed</h2>
        <p>Great news! Your class with <strong>${data.teacherName}</strong> is confirmed.</p>
        <div style="background: #1e1b4b; color: #c4b5fd; padding: 16px; border-radius: 8px; margin: 24px 0;">
          <p style="margin: 0;"><strong>📅 When:</strong> ${formattedDate}</p>
        </div>
        <p>You and your student can join the classroom using the link below 10 minutes before the class starts:</p>
        <a href="${classUrl}" style="display: inline-block; background: #6d28d9; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
          Join Classroom →
        </a>
        <p style="color: #6b7280; font-size: 14px; margin-top: 32px;">
          If you need to cancel, please do so at least 24 hours in advance for a full refund.
        </p>
      </div>
      `,
    );
  }

  async sendClassReminder(
    parentEmail: string,
    teacherEmail: string,
    data: BookingEmailData,
  ): Promise<void> {
    const classUrl = `${process.env.FRONTEND_URL}/classroom/${data.bookingId}`;

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6d28d9;">⏰ Your class starts in 30 minutes</h2>
        <p>This is your reminder that a class with <strong>${data.teacherName}</strong> is starting soon.</p>
        <a href="${classUrl}" style="display: inline-block; background: #6d28d9; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
          Join Classroom →
        </a>
      </div>
    `;

    await Promise.all([
      this.send(parentEmail, '⏰ Class starting in 30 minutes', html),
      this.send(teacherEmail, '⏰ Class starting in 30 minutes', html),
    ]);
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
      ),
      this.send(
        teacherEmail,
        'A booking has been cancelled',
        `<p>A student has cancelled their booking scheduled for ${data.classStart.toLocaleString()}.</p>`,
      ),
    ]);
  }

  async sendTeacherStrikeWarning(
    teacherEmail: string,
    strikes: number,
    teacherName: string,
  ): Promise<void> {
    const message =
      strikes >= 3
        ? 'Your account has been suspended due to 3 no-shows within 30 days. Please contact support.'
        : `You have received strike ${strikes}/3 for a missed class. Reaching 3 strikes within 30 days will result in account suspension.`;

    await this.send(
      teacherEmail,
      strikes >= 3 ? '⚠️ Account Suspended' : `⚠️ No-Show Strike ${strikes}/3`,
      `<div style="font-family: sans-serif;"><h2>Account Notice — ${teacherName}</h2><p>${message}</p></div>`,
    );
  }
}
