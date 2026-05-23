import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { StudentsService } from '../students/students.service';

@Injectable()
export class EngagementService {
  private readonly logger = new Logger(EngagementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly studentsService: StudentsService,
  ) {}

  // ─── Weekly streak check — every Monday at 00:05 UTC ──────────────────────

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
        streakFreezes: true,
      },
    });

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    for (const student of students) {
      try {
        const sessionsThisWeek = await this.prisma.booking.count({
          where: {
            studentUserId: student.id,
            paymentStatus: 'CAPTURED',
            shift: { end: { gte: sevenDaysAgo } },
          },
        });

        if (sessionsThisWeek > 0) {
          // Had a session — increment streak
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
        } else if (student.streakFreezes > 0) {
          // Use a freeze — streak preserved
          const newFreezes = student.streakFreezes - 1;
          await this.prisma.user.update({
            where: { id: student.id },
            data: { streakFreezes: { decrement: 1 } },
          });
          this.notifications
            .sendStreakFreezeUsedNotice(student.email, {
              studentName: student.fullName,
              streakWeeks: student.streakWeeks,
              freezesRemaining: newFreezes,
            })
            .catch(() => {});
        } else {
          // No session, no freeze — streak reset
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

  // ─── Monthly freeze reset — 1st of each month at 00:10 UTC ───────────────

  @Cron('10 0 1 * *')
  async resetMonthlyFreezes() {
    this.logger.log('Resetting monthly streak freezes…');

    const { count } = await this.prisma.user.updateMany({
      where: { role: 'STUDENT', accountStatus: 'ACTIVE', streakFreezes: { lt: 1 } },
      data: { streakFreezes: 1 },
    });

    this.logger.log(`Reset freezes for ${count} students.`);
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
