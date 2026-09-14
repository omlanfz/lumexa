import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { StudentsService } from '../students/students.service';

// Calendar-week boundary used consistently across the app for weekly
// grouping (see teachers.service.ts rating trend: Sunday-Saturday weeks,
// derived from `Date#getDay()`).
function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

@Injectable()
export class EngagementService {
  private readonly logger = new Logger(EngagementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly studentsService: StudentsService,
  ) {}

  // ─── Weekly streak check — every Monday at 00:05 UTC ──────────────────────
  //
  // Spec: a student earns 1 streak week when they complete at least one
  // scheduled lesson (a CAPTURED booking) during a calendar week. Consecutive
  // completed weeks accumulate; a week with zero completed lessons resets the
  // streak to 0. This runs the Monday after each week closes, so it evaluates
  // the just-finished calendar week (last Sunday through last Saturday).

  @Cron('5 0 * * 1')
  async checkStreaks() {
    this.logger.log('Running weekly streak check…');

    const students = await this.prisma.user.findMany({
      where: { role: 'STUDENT', accountStatus: 'ACTIVE' },
      select: {
        id: true,
        email: true,
        fullName: true,
        streakWeeks: true,
      },
    });

    const now = new Date();
    const thisWeekStart = startOfWeek(now);
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    for (const student of students) {
      try {
        const lessonsLastWeek = await this.prisma.booking.count({
          where: {
            studentUserId: student.id,
            paymentStatus: 'CAPTURED',
            shift: { end: { gte: lastWeekStart, lt: thisWeekStart } },
          },
        });

        if (lessonsLastWeek > 0) {
          // Completed at least one lesson last week — streak continues.
          await this.prisma.user.update({
            where: { id: student.id },
            data: { streakWeeks: { increment: 1 } },
          });

          // Check streak milestone gems
          const newStreak = student.streakWeeks + 1;
          if (newStreak === 4) {
            await this.studentsService.awardGems(student.id, 10, 'STREAK_MILESTONE', '4-week streak bonus');
          } else if (newStreak === 8) {
            await this.studentsService.awardGems(student.id, 20, 'STREAK_MILESTONE', '8-week streak bonus');
          }

          // Check streak badges
          await this.studentsService.checkAndAwardBadges(student.id);
        } else {
          // No completed lesson last week — streak resets to 0.
          const prevStreak = student.streakWeeks;
          await this.prisma.user.update({
            where: { id: student.id },
            data: { streakWeeks: 0 },
          });

          if (prevStreak > 0) {
            this.notifications
              .sendStreakLostNotice(student.email, {
                studentName: student.fullName,
                streakWeeks: prevStreak,
              })
              .catch(() => {});
          }
        }
      } catch (err) {
        this.logger.error(`Streak check failed for student ${student.id}: ${err}`);
      }
    }

    this.logger.log(`Streak check done. Processed ${students.length} students.`);
  }

  // ─── Monthly digest email — 1st of each month at 08:00 UTC ───────────────

  @Cron('0 8 1 * *')
  async sendMonthlyDigests() {
    this.logger.log('Sending monthly digest emails…');

    const students = await this.prisma.user.findMany({
      where: {
        role: 'STUDENT',
        accountStatus: 'ACTIVE',
        billingContactEmail: { not: null },
        billingContactConsented: true,
      },
      select: {
        id: true,
        fullName: true,
        billingContactEmail: true,
        spaceRank: true,
        streakWeeks: true,
      },
    });

    const now = new Date();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthLabel = lastMonthStart.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const marketplaceUrl = `${process.env.FRONTEND_URL}/marketplace`;

    const RANK_ICONS: Record<string, string> = {
      STARCHILD: '🌟', EXPLORER: '🔭', COSMONAUT: '🛸',
      NAVIGATOR: '🧭', CAPTAIN: '🎖️', GALAXY_COMMANDER: '🌌',
    };

    for (const student of students) {
      try {
        const completedBookings = await this.prisma.booking.findMany({
          where: {
            studentUserId: student.id,
            paymentStatus: 'CAPTURED',
            shift: { start: { gte: lastMonthStart, lt: lastMonthEnd } },
          },
          include: { shift: { select: { start: true, end: true } } },
        });

        const sessionsThisMonth = completedBookings.length;
        const totalMinutes = completedBookings.reduce((sum, b) => {
          return sum + Math.round(
            (new Date(b.shift.end).getTime() - new Date(b.shift.start).getTime()) / 60000,
          );
        }, 0);

        const nextBooking = await this.prisma.booking.findFirst({
          where: {
            studentUserId: student.id,
            paymentStatus: { in: ['PENDING', 'CAPTURED'] },
            shift: { start: { gt: now } },
          },
          include: {
            shift: {
              include: {
                teacher: { include: { user: { select: { fullName: true } } } },
              },
            },
          },
          orderBy: { shift: { start: 'asc' } },
        });

        await this.notifications.sendMonthlyDigest(student.billingContactEmail!, {
          studentName: student.fullName,
          monthLabel,
          sessionsThisMonth,
          totalHoursThisMonth: Math.round((totalMinutes / 60) * 10) / 10,
          currentRank: student.spaceRank,
          rankIcon: RANK_ICONS[student.spaceRank] ?? '🌟',
          streakWeeks: student.streakWeeks,
          nextSession: nextBooking
            ? { start: nextBooking.shift.start, teacherName: nextBooking.shift.teacher.user.fullName }
            : null,
          marketplaceUrl,
        });
      } catch (err) {
        this.logger.error(`Digest failed for student ${student.id}: ${err}`);
      }
    }

    this.logger.log(`Monthly digests sent to ${students.length} billing contacts.`);
  }
}
