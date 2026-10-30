import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { StudentProgressService } from '../students/progress/student-progress.service';

@Injectable()
export class EngagementService {
  private readonly logger = new Logger(EngagementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly progress: StudentProgressService,
  ) {}

  // ─── Weekly streak check — every Monday at 00:05 UTC ──────────────────────
  //
  // The streak itself is derived from real class records (see
  // StudentProgressService / progress.rules.ts): one streak week for every
  // Sunday–Saturday (Asia/Dhaka) week with at least one attended class,
  // consecutive weeks accumulate, and a whole week without one resets it. The
  // number is always current — it is re-derived after every class and on every
  // dashboard read — so this job no longer counts anything. What is left for it
  // is the one thing nothing else triggers: telling the student, once, that the
  // week which just closed ended their streak, and persisting any progress that
  // changed without a class being finalized (e.g. an admin correction).

  @Cron('5 0 * * 1')
  async checkStreaks() {
    this.logger.log('Running weekly streak check…');

    const students = await this.prisma.user.findMany({
      where: { role: 'STUDENT', accountStatus: 'ACTIVE' },
      select: { id: true, email: true, fullName: true },
    });

    for (const student of students) {
      try {
        const out = await this.progress.sync(student.id, { mode: 'live' });
        if (!out) continue;

        // weeks[last] = this week, [last-1] = the week that just closed,
        // [last-2] = the one before. A streak was running into the closed
        // week and that week had no class → the streak ended.
        const weeks = out.result.streak.weeks;
        const closed = weeks[weeks.length - 2];
        const before = weeks[weeks.length - 3];
        if (before?.done && closed && !closed.done) {
          let lost = 0;
          for (let i = weeks.length - 3; i >= 0 && weeks[i].done; i--) lost++;
          this.notifications
            .sendStreakLostNotice(student.email, {
              studentName: student.fullName,
              streakWeeks: lost,
            })
            .catch(() => {});
        }
      } catch (err) {
        this.logger.error(
          `Streak check failed for student ${student.id}: ${err}`,
        );
      }
    }

    this.logger.log(
      `Streak check done. Processed ${students.length} students.`,
    );
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
      },
    });

    const now = new Date();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthLabel = lastMonthStart.toLocaleString('en-US', {
      month: 'long',
      year: 'numeric',
    });
    const marketplaceUrl = `${process.env.FRONTEND_URL}/marketplace`;

    const RANK_ICONS: Record<string, string> = {
      STARCHILD: '🌟',
      EXPLORER: '🔭',
      COSMONAUT: '🛸',
      NAVIGATOR: '🧭',
      CAPTAIN: '🎖️',
      GALAXY_COMMANDER: '🌌',
    };

    for (const student of students) {
      try {
        // Rank and streak are the derived, up-to-date ones; the month's
        // sessions are every class the student actually attended in it.
        const synced = await this.progress.sync(student.id, { mode: 'silent' });
        if (!synced) continue;
        const attended = synced.classes.filter(
          (c) => c.at >= lastMonthStart && c.at < lastMonthEnd,
        );
        const sessionsThisMonth = attended.length;
        const totalMinutes = attended.reduce((sum, c) => sum + c.minutes, 0);

        const [nextBooking, nextLesson] = await Promise.all([
          this.prisma.booking.findFirst({
            where: {
              studentUserId: student.id,
              paymentStatus: { in: ['PENDING', 'CAPTURED'] },
              shift: { start: { gt: now } },
            },
            include: {
              shift: {
                include: {
                  teacher: {
                    include: { user: { select: { fullName: true } } },
                  },
                },
              },
            },
            orderBy: { shift: { start: 'asc' } },
          }),
          this.prisma.scheduledLesson.findFirst({
            where: {
              studentUserId: student.id,
              status: 'UPCOMING',
              start: { gt: now },
            },
            include: {
              teacher: { include: { user: { select: { fullName: true } } } },
            },
            orderBy: { start: 'asc' },
          }),
        ]);
        const nextSession =
          nextBooking &&
          (!nextLesson || nextBooking.shift.start < nextLesson.start)
            ? {
                start: nextBooking.shift.start,
                teacherName: nextBooking.shift.teacher.user.fullName,
              }
            : nextLesson
              ? {
                  start: nextLesson.start,
                  teacherName: nextLesson.teacher.user.fullName,
                }
              : null;

        await this.notifications.sendMonthlyDigest(
          student.billingContactEmail!,
          {
            studentName: student.fullName,
            monthLabel,
            sessionsThisMonth,
            totalHoursThisMonth: Math.round((totalMinutes / 60) * 10) / 10,
            currentRank: synced.result.rank.rank,
            rankIcon: RANK_ICONS[synced.result.rank.rank] ?? '🌟',
            streakWeeks: synced.result.streak.current,
            nextSession,
            marketplaceUrl,
          },
        );
      } catch (err) {
        this.logger.error(`Digest failed for student ${student.id}: ${err}`);
      }
    }

    this.logger.log(
      `Monthly digests sent to ${students.length} billing contacts.`,
    );
  }
}
