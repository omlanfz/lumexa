// FILE PATH: server/src/admin-alerts/admin-alerts.service.ts
//
// Two admin-facing operational alerts, both threshold-driven and
// configurable via env vars rather than hard-coded:
//   - High cancellation/no-show rate: TeacherCancellation already tracks a
//     monthly count of teacher-initiated emergency reschedules/cancels
//     (see reschedule.service.ts) — this just thresholds it.
//   - Low platform activity: User.lastLoginAt (set by AuthService.login /
//     StudentsService.loginStudent) compared against a configurable
//     inactivity window, for teachers only (an inactive teacher is an
//     operational risk; an inactive parent/student is not Operations'
//     concern the same way).
//
// Both dedupe through NotificationsService's dedupeKey (a month bucket for
// cancellations, a week bucket for inactivity) so the same condition
// doesn't re-alert on every run.

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

const DEFAULT_CANCELLATION_THRESHOLD = 5;
const DEFAULT_INACTIVITY_DAYS = 14;

function isoWeekBucket(date: Date): string {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

@Injectable()
export class AdminAlertsService {
  private readonly logger = new Logger(AdminAlertsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  private get cancellationThreshold(): number {
    const raw = Number(process.env.TEACHER_CANCELLATION_ALERT_THRESHOLD);
    return Number.isFinite(raw) && raw > 0
      ? raw
      : DEFAULT_CANCELLATION_THRESHOLD;
  }

  private get inactivityDays(): number {
    const raw = Number(process.env.TEACHER_INACTIVITY_DAYS);
    return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_INACTIVITY_DAYS;
  }

  @Cron('0 4 * * *') // 10:00 Asia/Dhaka
  async runDailyChecks() {
    await Promise.all([
      this.checkHighCancellationRates(),
      this.checkLowActivity(),
    ]);
  }

  private async checkHighCancellationRates() {
    const now = new Date();
    const threshold = this.cancellationThreshold;

    const buckets = await this.prisma.teacherCancellation.findMany({
      where: {
        month: now.getMonth() + 1,
        year: now.getFullYear(),
        count: { gte: threshold },
      },
      include: {
        teacher: { include: { user: { select: { fullName: true } } } },
      },
    });

    const monthLabel = now.toLocaleString('en-US', {
      month: 'long',
      year: 'numeric',
    });
    for (const bucket of buckets) {
      this.notifications
        .sendAdminHighCancellationRate({
          teacherId: bucket.teacherId,
          teacherName: bucket.teacher.user.fullName,
          count: bucket.count,
          threshold,
          monthLabel,
          monthBucket: `${bucket.year}-${String(bucket.month).padStart(2, '0')}`,
        })
        .catch((err) =>
          this.logger.error(
            `High-cancellation alert failed for teacher ${bucket.teacherId}: ${err}`,
          ),
        );
    }
  }

  private async checkLowActivity() {
    const thresholdDays = this.inactivityDays;
    const cutoff = new Date(Date.now() - thresholdDays * 24 * 60 * 60 * 1000);
    const weekBucket = isoWeekBucket(new Date());

    const teachers = await this.prisma.teacherProfile.findMany({
      where: {
        isSuspended: false,
        user: { OR: [{ lastLoginAt: null }, { lastLoginAt: { lt: cutoff } }] },
      },
      include: {
        user: {
          select: { fullName: true, lastLoginAt: true, createdAt: true },
        },
      },
    });

    for (const teacher of teachers) {
      const since = teacher.user.lastLoginAt ?? teacher.user.createdAt;
      const daysInactive = Math.floor(
        (Date.now() - since.getTime()) / (24 * 60 * 60 * 1000),
      );
      this.notifications
        .sendAdminLowActivity({
          teacherId: teacher.id,
          teacherName: teacher.user.fullName,
          daysInactive,
          thresholdDays,
          weekBucket,
        })
        .catch((err) =>
          this.logger.error(
            `Low-activity alert failed for teacher ${teacher.id}: ${err}`,
          ),
        );
    }
  }
}
