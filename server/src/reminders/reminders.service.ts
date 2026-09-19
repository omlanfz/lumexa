// FILE PATH: server/src/reminders/reminders.service.ts
//
// "Class reminder — exactly 1 hour before" for both booking flows this app
// runs in parallel (see the doc comment atop reschedule.service.ts):
// legacy marketplace `Booking`/`Shift`, and the curriculum `ScheduledLesson`.
// Runs every 5 minutes and looks at a ±2.5 minute window around exactly 60
// minutes from now, so a lesson only ever falls inside the window on ONE
// run. Idempotency is enforced by NotificationsService's dedupeKey
// (`reminder-student:<id>` / `reminder-teacher:<id>`) regardless, as a
// second safety net against double-sends from a slow run or a retry.

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { LessonStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

const REMINDER_LEAD_MS = 60 * 60 * 1000;
const WINDOW_HALF_MS = 2.5 * 60 * 1000;

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron('*/5 * * * *')
  async sendUpcomingReminders() {
    const target = new Date(Date.now() + REMINDER_LEAD_MS);
    const windowStart = new Date(target.getTime() - WINDOW_HALF_MS);
    const windowEnd = new Date(target.getTime() + WINDOW_HALF_MS);

    await Promise.all([
      this.remindScheduledLessons(windowStart, windowEnd),
      this.remindLegacyBookings(windowStart, windowEnd),
    ]);
  }

  private async remindScheduledLessons(windowStart: Date, windowEnd: Date) {
    const lessons = await this.prisma.scheduledLesson.findMany({
      where: {
        status: LessonStatus.UPCOMING,
        start: { gte: windowStart, lte: windowEnd },
      },
      include: {
        student: { select: { email: true, fullName: true } },
        teacher: {
          select: { user: { select: { email: true, fullName: true } } },
        },
      },
    });

    for (const lesson of lessons) {
      const classUrl = `${process.env.FRONTEND_URL}/classroom/lesson-${lesson.id}`;
      this.notifications
        .sendClassReminderToStudent(lesson.student.email, {
          lessonId: lesson.id,
          studentName: lesson.student.fullName,
          teacherName: lesson.teacher.user.fullName,
          classStart: lesson.start,
          classUrl,
        })
        .catch((err) =>
          this.logger.error(
            `Student reminder failed for lesson ${lesson.id}: ${err}`,
          ),
        );

      this.notifications
        .sendTeacherClassReminder(lesson.teacher.user.email, {
          lessonId: lesson.id,
          teacherName: lesson.teacher.user.fullName,
          studentName: lesson.student.fullName,
          classStart: lesson.start,
          classUrl,
        })
        .catch((err) =>
          this.logger.error(
            `Teacher reminder failed for lesson ${lesson.id}: ${err}`,
          ),
        );
    }
  }

  private async remindLegacyBookings(windowStart: Date, windowEnd: Date) {
    const bookings = await this.prisma.booking.findMany({
      where: {
        paymentStatus: { in: ['PENDING', 'CAPTURED'] },
        shift: { start: { gte: windowStart, lte: windowEnd } },
      },
      include: {
        studentUser: { select: { email: true, fullName: true } },
        student: {
          include: { parent: { select: { email: true, fullName: true } } },
        },
        shift: {
          include: {
            teacher: {
              include: { user: { select: { email: true, fullName: true } } },
            },
          },
        },
      },
    });

    for (const booking of bookings) {
      const recipient = booking.studentUser
        ? {
            email: booking.studentUser.email,
            name: booking.studentUser.fullName,
          }
        : booking.student?.parent
          ? {
              email: booking.student.parent.email,
              name: booking.student.parent.fullName,
            }
          : null;
      const classUrl = `${process.env.FRONTEND_URL}/classroom/${booking.id}`;
      const teacherName = booking.shift.teacher.user.fullName;

      if (recipient) {
        this.notifications
          .sendClassReminderToStudent(recipient.email, {
            lessonId: booking.id,
            studentName: recipient.name,
            teacherName,
            classStart: booking.shift.start,
            classUrl,
          })
          .catch((err) =>
            this.logger.error(
              `Student reminder failed for booking ${booking.id}: ${err}`,
            ),
          );
      }

      this.notifications
        .sendTeacherClassReminder(booking.shift.teacher.user.email, {
          lessonId: booking.id,
          teacherName,
          studentName: recipient?.name ?? 'your student',
          classStart: booking.shift.start,
          classUrl,
        })
        .catch((err) =>
          this.logger.error(
            `Teacher reminder failed for booking ${booking.id}: ${err}`,
          ),
        );
    }
  }
}
