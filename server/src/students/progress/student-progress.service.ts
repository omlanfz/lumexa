// FILE PATH: server/src/students/progress/student-progress.service.ts
//
// The one writer of a student's gamified progress (User.totalSessions /
// spaceRank / streakWeeks and the StudentBadge rows). Everything is DERIVED
// from the student's real class records through the pure rules in
// progress.rules.ts and then persisted, so:
//
//   - a class finalized by a teacher, an admin or the failsafe moves the
//     student's rank / streak / badges immediately (see ClassFinalizationService),
//   - the student's dashboard and navbar read the same derived numbers (a read
//     re-derives, so an admin correction to a class shows up on the next load),
//   - the historical backfill is the very same code path run over every
//     student, and running it (or sync) any number of times changes nothing
//     once the records have been applied — a badge row is created at most once
//     (unique [userId, type]) and every stored counter is a pure function of
//     the records.
//
// "A class the student attended" = one of their ScheduledLesson rows that was
// finalized COMPLETED / PARTIALLY_COMPLETED (the same statuses that unlock the
// next lesson; a batch student who did not show up is finalized INCOMPLETE by
// the finalizer, so absence never counts), plus legacy marketplace bookings
// whose payment was captured and whose class has ended.

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Prisma, SpaceRank } from '@prisma/client';
import { PrismaService } from '../../prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { COUNTS_AS_COMPLETED } from '../../scheduling/lesson-state.util';
import {
  AttendedClass,
  BADGE_DEFS,
  ProgressResult,
  computeProgress,
  rankIndex,
} from './progress.rules';

export type SyncMode =
  /** A class has just been finalized: email the student and pay the streak
   * gem bonuses for anything newly earned. */
  | 'live'
  /** Reading the dashboard / the backfill: persist what the records already
   * prove, but stay quiet (no emails, no gems) — it is not news. */
  | 'silent';

export interface SyncOutcome {
  result: ProgressResult;
  classes: AttendedClass[];
  newBadges: string[];
  rankBefore: SpaceRank;
  rankAfter: SpaceRank;
  homeworkSubmitted: number;
  curriculum: { totalLessons: number; completedLessons: number } | null;
}

export interface BackfillStudentReport {
  studentUserId: string;
  email: string;
  sessions: number;
  rank: SpaceRank;
  streakWeeks: number;
  badgesCreated: string[];
  changed: boolean;
  /** Why the records alone cannot settle this student's progress. */
  reviewReasons: string[];
}

export interface BackfillReport {
  dryRun: boolean;
  studentsProcessed: number;
  studentsChanged: number;
  badgesCreated: number;
  needsReview: BackfillStudentReport[];
  students: BackfillStudentReport[];
}

// Streak bonus gems — unchanged from the weekly streak job that used to pay
// them (EngagementService).
const STREAK_GEMS: Record<string, { gems: number; note: string }> = {
  STREAK_4: { gems: 10, note: '4-week streak bonus' },
  STREAK_8: { gems: 20, note: '8-week streak bonus' },
};

@Injectable()
export class StudentProgressService implements OnApplicationBootstrap {
  private readonly logger = new Logger(StudentProgressService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ─── Startup backfill ─────────────────────────────────────────────────────
  //
  // Rank, streak and badges used to be moved only by the legacy marketplace
  // flow, so every student taught through curriculum / batch classes starts out
  // at zero. A few seconds after the server is up, every student is brought up
  // to what their class records prove (the same idempotent, silent backfill as
  // `npm run backfill:student-progress`), so nobody has to wait for their next
  // class or for an operator to remember to run a script. Once the numbers are
  // right the pass changes nothing, so running on every start is harmless.
  // SKIP_STUDENT_PROGRESS_BACKFILL=true turns it off.

  onApplicationBootstrap() {
    if (
      process.env.SKIP_STUDENT_PROGRESS_BACKFILL === 'true' ||
      process.env.NODE_ENV === 'test'
    ) {
      return;
    }
    const timer = setTimeout(() => void this.runStartupBackfill(), 20_000);
    timer.unref();
  }

  private async runStartupBackfill() {
    try {
      const report = await this.backfillAll();
      this.logger.log(
        `Student progress backfill: ${report.studentsProcessed} student(s) checked, ` +
          `${report.studentsChanged} updated, ${report.badgesCreated} badge(s) created, ` +
          `${report.needsReview.length} need manual review.`,
      );
      for (const s of report.needsReview) {
        this.logger.warn(
          `Progress needs manual review — ${s.email} (${s.studentUserId}): ${s.reviewReasons.join(' | ')}`,
        );
      }
    } catch (err) {
      this.logger.error(`Student progress backfill failed: ${err}`);
    }
  }

  // ─── Reading the records ──────────────────────────────────────────────────

  async loadAttendedClasses(
    studentUserId: string,
    now: Date,
  ): Promise<AttendedClass[]> {
    const [lessons, bookings] = await Promise.all([
      this.prisma.scheduledLesson.findMany({
        where: { studentUserId, status: { in: COUNTS_AS_COMPLETED } },
        select: {
          start: true,
          end: true,
          courseId: true,
          lessonNumber: true,
          course: { select: { title: true } },
        },
      }),
      this.prisma.booking.findMany({
        where: {
          studentUserId,
          paymentStatus: 'CAPTURED',
          shift: { end: { lt: now } },
        },
        select: { shift: { select: { start: true, end: true } } },
      }),
    ]);

    const minutes = (start: Date, end: Date) =>
      Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000));

    return [
      ...lessons.map((l) => ({
        at: l.end,
        minutes: minutes(l.start, l.end),
        courseKey: `${l.courseId}:${l.lessonNumber}`,
        courseTitle: l.course.title,
      })),
      ...bookings.map((b) => ({
        at: b.shift.end,
        minutes: minutes(b.shift.start, b.shift.end),
        courseKey: null,
        courseTitle: null,
      })),
    ];
  }

  /** Pure read: derive the student's progress from their records. */
  async derive(studentUserId: string, now = new Date()) {
    const user = await this.prisma.user.findUnique({
      where: { id: studentUserId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        spaceRank: true,
        totalSessions: true,
        streakWeeks: true,
        assignedCourse: { select: { id: true, sessions: true } },
      },
    });
    if (!user || user.role !== 'STUDENT') return null;

    const [classes, homeworkSubmitted, completedLessons] = await Promise.all([
      this.loadAttendedClasses(studentUserId, now),
      this.prisma.submission.count({ where: { studentUserId } }),
      user.assignedCourse
        ? this.prisma.scheduledLesson
            .findMany({
              where: {
                studentUserId,
                courseId: user.assignedCourse.id,
                status: { in: COUNTS_AS_COMPLETED },
              },
              distinct: ['lessonNumber'],
              select: { lessonNumber: true },
            })
            .then((rows) => rows.length)
        : Promise.resolve(0),
    ]);

    const curriculum =
      user.assignedCourse && user.assignedCourse.sessions > 0
        ? {
            totalLessons: user.assignedCourse.sessions,
            completedLessons: Math.min(
              completedLessons,
              user.assignedCourse.sessions,
            ),
          }
        : null;

    const result = computeProgress({
      classes,
      now,
      storedRank: user.spaceRank,
      homeworkSubmitted,
      curriculum,
    });
    return { user, result, classes, homeworkSubmitted, curriculum };
  }

  // ─── Persisting ───────────────────────────────────────────────────────────

  /**
   * Derives the student's progress and brings the stored counters and badge
   * rows up to it. Safe to call at any time, any number of times, from any
   * number of places at once: counters are overwritten with the same derived
   * value, and a badge row can only ever be created once.
   */
  async sync(
    studentUserId: string,
    opts: { mode?: SyncMode; dryRun?: boolean; now?: Date } = {},
  ): Promise<(SyncOutcome & { changed: boolean }) | null> {
    const mode = opts.mode ?? 'silent';
    const derived = await this.derive(studentUserId, opts.now);
    if (!derived) return null;
    const { user, result, classes, homeworkSubmitted, curriculum } = derived;

    const rankAfter = result.rank.rank;
    const counterChange: Prisma.UserUpdateInput = {};
    if (user.totalSessions !== result.sessions)
      counterChange.totalSessions = result.sessions;
    if (user.spaceRank !== rankAfter) counterChange.spaceRank = rankAfter;
    if (user.streakWeeks !== result.streak.current)
      counterChange.streakWeeks = result.streak.current;
    const countersChanged = Object.keys(counterChange).length > 0;

    const existing = new Set(
      (
        await this.prisma.studentBadge.findMany({
          where: { userId: studentUserId },
          select: { type: true },
        })
      ).map((b) => b.type),
    );
    const toAward = result.badges.filter(
      (b) => b.earned && !existing.has(b.id),
    );

    const newBadges: string[] = [];
    if (!opts.dryRun) {
      if (countersChanged) {
        await this.prisma.user.update({
          where: { id: studentUserId },
          data: counterChange,
        });
      }
      for (const badge of toAward) {
        try {
          await this.prisma.studentBadge.create({
            data: {
              userId: studentUserId,
              type: badge.id,
              earnedAt: badge.earnedAt ?? new Date(),
              metadata: {
                source: mode === 'live' ? 'class-completed' : 'derived',
                sessions: result.sessions,
              },
            },
          });
          newBadges.push(badge.id);
        } catch (err: unknown) {
          // Unique [userId, type]: another caller created it a moment ago.
          if ((err as { code?: string })?.code !== 'P2002') throw err;
        }
      }
    } else {
      newBadges.push(...toAward.map((b) => b.id));
    }

    if (!opts.dryRun && mode === 'live' && newBadges.length > 0) {
      await this.celebrate(user, newBadges, rankAfter, user.spaceRank);
    }

    return {
      result,
      classes,
      newBadges,
      rankBefore: user.spaceRank,
      rankAfter,
      homeworkSubmitted,
      curriculum,
      changed: countersChanged || toAward.length > 0,
    };
  }

  private async celebrate(
    user: { id: string; email: string; fullName: string },
    badgeIds: string[],
    rankAfter: SpaceRank,
    rankBefore: SpaceRank,
  ) {
    // Streak gem bonuses (the weekly streak job used to pay these).
    for (const id of badgeIds) {
      const bonus = STREAK_GEMS[id];
      if (!bonus) continue;
      await this.prisma
        .$transaction([
          this.prisma.user.update({
            where: { id: user.id },
            data: { gemBalance: { increment: bonus.gems } },
          }),
          this.prisma.gemTransaction.create({
            data: {
              userId: user.id,
              amount: bonus.gems,
              type: 'STREAK_MILESTONE',
              description: bonus.note,
            },
          }),
        ])
        .catch((err) =>
          this.logger.error(`Streak gems failed for ${user.id}: ${err}`),
        );
    }

    const meta = badgeIds
      .map((id) => BADGE_DEFS.find((d) => d.id === id))
      .filter((d): d is (typeof BADGE_DEFS)[number] => !!d)
      .map((d) => ({ label: d.label, icon: d.icon }));
    const rankedUp = rankIndex(rankAfter) > rankIndex(rankBefore);
    this.notifications
      .sendAchievementEmail(user.email, {
        userId: user.id,
        studentName: user.fullName,
        badges: meta,
        newRank: rankedUp ? rankAfter : undefined,
      })
      .catch(() => {});
  }

  /** Best-effort wrapper for the hooks that run after a class is finalized —
   * a progress hiccup must never fail the class itself. */
  async syncAfterClass(studentUserIds: string[]): Promise<void> {
    for (const id of new Set(studentUserIds)) {
      try {
        await this.sync(id, { mode: 'live' });
      } catch (err) {
        this.logger.error(`Progress sync failed for student ${id}: ${err}`);
      }
    }
  }

  // ─── Historical backfill ──────────────────────────────────────────────────

  /**
   * Reconstructs every student's progress from their real class history. It
   * only ever sets what the records prove (and never lowers a stored rank), is
   * silent (no emails or gems), and is idempotent: a second run reports
   * `changed: false` for every student.
   *
   * Students whose stored numbers cannot be explained by the records are not
   * "fixed" — they are listed in `needsReview` for a person to look at.
   */
  async backfillAll(opts: { dryRun?: boolean } = {}): Promise<BackfillReport> {
    const students = await this.prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: {
        id: true,
        email: true,
        totalSessions: true,
        spaceRank: true,
        assignedCourseId: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const report: BackfillReport = {
      dryRun: !!opts.dryRun,
      studentsProcessed: 0,
      studentsChanged: 0,
      badgesCreated: 0,
      needsReview: [],
      students: [],
    };

    for (const s of students) {
      const reviewReasons: string[] = [];
      try {
        const out = await this.sync(s.id, {
          mode: 'silent',
          dryRun: opts.dryRun,
        });
        if (!out) continue;

        // Stored progress that the records do not explain.
        if (s.totalSessions > out.result.sessions) {
          reviewReasons.push(
            `Stored totalSessions (${s.totalSessions}) is higher than the ${out.result.sessions} attended class(es) found in the records — the extra sessions have no class record behind them.`,
          );
        }
        if (
          rankIndex(s.spaceRank) > rankIndex(out.result.earnedByCountRank.rank)
        ) {
          reviewReasons.push(
            `Stored rank ${s.spaceRank} is higher than the ${out.result.earnedByCountRank.rank} that ${out.result.sessions} attended class(es) support — the rank was kept, not lowered.`,
          );
        }
        const pastUnsettled = await this.prisma.scheduledLesson.count({
          where: {
            studentUserId: s.id,
            status: 'UPCOMING',
            end: { lt: new Date(Date.now() - 48 * 3_600_000) },
          },
        });
        if (pastUnsettled > 0) {
          reviewReasons.push(
            `${pastUnsettled} class(es) are still UPCOMING although they ended more than 48 hours ago — nobody settled their outcome, so they are not counted.`,
          );
        }

        const row: BackfillStudentReport = {
          studentUserId: s.id,
          email: s.email,
          sessions: out.result.sessions,
          rank: out.rankAfter,
          streakWeeks: out.result.streak.current,
          badgesCreated: out.newBadges,
          changed: out.changed,
          reviewReasons,
        };
        report.studentsProcessed++;
        if (out.changed) report.studentsChanged++;
        report.badgesCreated += out.newBadges.length;
        report.students.push(row);
        if (reviewReasons.length > 0) report.needsReview.push(row);
      } catch (err) {
        this.logger.error(`Backfill failed for student ${s.id}: ${err}`);
        const row: BackfillStudentReport = {
          studentUserId: s.id,
          email: s.email,
          sessions: 0,
          rank: s.spaceRank,
          streakWeeks: 0,
          badgesCreated: [],
          changed: false,
          reviewReasons: [`Backfill failed: ${String(err)}`],
        };
        report.studentsProcessed++;
        report.students.push(row);
        report.needsReview.push(row);
      }
    }
    return report;
  }
}
