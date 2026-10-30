import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SchedulingService } from '../scheduling/scheduling.service';
import {
  COUNTS_AS_COMPLETED,
  keepCanonicalRows,
} from '../scheduling/lesson-state.util';
import { getClassWindow } from '../scheduling/lesson-window.util';
import { CreateStudentDto } from './dto/create-student.dto';
import { RegisterStudentDto } from './dto/register-student.dto';
import { UpdateStudentProfileDto } from './dto/update-student-profile.dto';
import { Prisma, SpaceRank, AccountStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { StudentLedgerService } from './student-ledger.service';
import { StudentProgressService } from './progress/student-progress.service';
import {
  BADGE_DEFS,
  RANK_TIERS,
  type ProgressResult,
} from './progress/progress.rules';
import { utcToDhakaParts } from '../scheduling/dhaka-time.util';

// ─── Space Rank Helpers ───────────────────────────────────────────────────────

// One rank ladder for the whole app — defined with the progress rules.
const RANK_THRESHOLDS = RANK_TIERS;

function computeSpaceRank(sessions: number): SpaceRank {
  for (let i = RANK_THRESHOLDS.length - 1; i >= 0; i--) {
    if (sessions >= RANK_THRESHOLDS[i].min) return RANK_THRESHOLDS[i].rank;
  }
  return 'STARCHILD';
}

function rankMeta(rank: SpaceRank) {
  return RANK_THRESHOLDS.find((t) => t.rank === rank) ?? RANK_THRESHOLDS[0];
}

function sessionsToNextRank(sessions: number): number | null {
  for (const tier of RANK_THRESHOLDS) {
    if (sessions < tier.min) return tier.min - sessions;
  }
  return null;
}

// Prisma `include`/`select` fragment for resolving a student's Operations-
// assigned teacher's public info via the explicit assignedTeacher relation.
const ASSIGNED_TEACHER_SELECT = {
  select: {
    id: true,
    subjects: true,
    user: { select: { fullName: true, avatarUrl: true } },
  },
} as const;

function mapAssignedTeacher(
  teacher: {
    id: string;
    subjects: string[];
    user: { fullName: string; avatarUrl: string | null };
  } | null,
) {
  if (!teacher) return null;
  return {
    teacherProfileId: teacher.id,
    name: teacher.user.fullName,
    avatarUrl: teacher.user.avatarUrl,
    subjects: teacher.subjects,
  };
}

// ─── Legacy helpers (parent-proxy pattern) ───────────────────────────────────

function getSpaceRank(completedClasses: number) {
  if (completedClasses >= 40) return { tier: 'Admiral', icon: '💫', level: 5 };
  if (completedClasses >= 20)
    return { tier: 'Commander', icon: '🛡️', level: 4 };
  if (completedClasses >= 10) return { tier: 'Pilot', icon: '🚀', level: 3 };
  if (completedClasses >= 5) return { tier: 'Navigator', icon: '🌟', level: 2 };
  if (completedClasses >= 1) return { tier: 'Explorer', icon: '⭐', level: 1 };
  return { tier: 'Cadet', icon: '🛸', level: 0 };
}

function classesToNextRank(completedClasses: number): number | null {
  if (completedClasses >= 40) return null;
  const thresholds = [1, 5, 10, 20, 40];
  for (const t of thresholds) {
    if (completedClasses < t) return t - completedClasses;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class StudentsService {
  private readonly logger = new Logger(StudentsService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private notifications: NotificationsService,
    private scheduling: SchedulingService,
    private progress: StudentProgressService,
    private ledger: StudentLedgerService,
  ) {}

  // ══════════════════════════════════════════════════════════════════════════
  // STUDENT SELF-AUTH METHODS (new architecture)
  // ══════════════════════════════════════════════════════════════════════════

  async registerStudent(dto: RegisterStudentDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('An account with this email already exists.');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        fullName: dto.fullName,
        role: 'STUDENT',
        age: dto.age,
        grade: dto.grade ?? null,
        subjects: dto.subjects ?? [],
        accountStatus: 'ACTIVE',
        spaceRank: 'STARCHILD',
        totalSessions: 0,
        streakWeeks: 0,
        gemBalance: 0,
      },
    });

    const payload = { sub: user.id, email: user.email, role: user.role };
    const access_token = this.jwtService.sign(payload);

    this.notifications
      .sendWelcomeEmail(user.email, {
        userId: user.id,
        name: user.fullName,
        role: 'STUDENT',
      })
      .catch(() => {});
    this.notifications
      .sendAdminNewRegistration({
        userId: user.id,
        name: user.fullName,
        email: user.email,
        role: 'STUDENT',
      })
      .catch(() => {});

    return {
      status: 'ACTIVE' as const,
      access_token,
      user: this.safeUser(user),
    };
  }

  async loginStudent(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    const valid = user && (await bcrypt.compare(password, user.password));

    if (!user || !valid || user.role !== 'STUDENT') {
      throw new UnauthorizedException('Invalid email or password.');
    }
    if (user.accountStatus === 'SUSPENDED') {
      throw new ForbiddenException('This account has been suspended.');
    }
    if (user.accountStatus === 'DEACTIVATED') {
      throw new ForbiddenException('This account has been deactivated.');
    }
    if (user.accountStatus === 'PAUSED') {
      throw new ForbiddenException(
        'This account has been paused by Operations. Contact support for details.',
      );
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    this.prisma.user
      .update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
      .catch(() => {});

    return {
      access_token: this.jwtService.sign(payload),
      user: this.safeUser(user),
    };
  }

  async getMyProfile(userId: string) {
    await this.syncProgressQuietly(userId);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        avatarUrl: true,
        age: true,
        grade: true,
        subjects: true,
        spaceRank: true,
        totalSessions: true,
        streakWeeks: true,
        gemBalance: true,
        accountStatus: true,
        createdAt: true,
        assignedTeacher: ASSIGNED_TEACHER_SELECT,
      },
    });

    if (!user || user.role !== 'STUDENT') {
      throw new NotFoundException('Student profile not found.');
    }

    const rankInfo = rankMeta(user.spaceRank);
    const { assignedTeacher, ...rest } = user;
    return {
      ...rest,
      rankIcon: rankInfo.icon,
      sessionsToNextRank: sessionsToNextRank(user.totalSessions),
      assignedTeacher: mapAssignedTeacher(assignedTeacher),
    };
  }

  async updateMyProfile(userId: string, dto: UpdateStudentProfileDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'STUDENT') {
      throw new NotFoundException('Student profile not found.');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.fullName !== undefined && { fullName: dto.fullName }),
        ...(dto.grade !== undefined && { grade: dto.grade }),
        ...(dto.subjects !== undefined && { subjects: dto.subjects }),
        ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        age: true,
        grade: true,
        subjects: true,
        spaceRank: true,
        totalSessions: true,
        streakWeeks: true,
        gemBalance: true,
        accountStatus: true,
      },
    });

    const rankInfo = rankMeta(updated.spaceRank);
    return {
      ...updated,
      rankIcon: rankInfo.icon,
      sessionsToNextRank: sessionsToNextRank(updated.totalSessions),
    };
  }

  async deactivateMyAccount(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });
    if (!user || user.role !== 'STUDENT') {
      throw new NotFoundException('Student not found.');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { accountStatus: 'DEACTIVATED' },
    });

    return { success: true };
  }

  async getMyDashboard(userId: string) {
    await this.syncProgressQuietly(userId);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        avatarUrl: true,
        spaceRank: true,
        totalSessions: true,
        streakWeeks: true,
        gemBalance: true,
        billingContactEmail: true,
        assignedTeacher: ASSIGNED_TEACHER_SELECT,
        assignedCourse: {
          select: { id: true, title: true, emoji: true, sessions: true },
        },
      },
    });

    if (!user) throw new NotFoundException('Student not found.');

    const now = new Date();

    const [
      bookings,
      nextScheduledLesson,
      completedLessonCount,
      pendingHomeworkLessons,
      homeworkNeedsChangesRows,
    ] = await Promise.all([
      this.prisma.booking.findMany({
        where: {
          studentUserId: userId,
          paymentStatus: { in: ['PENDING', 'CAPTURED'] },
        },
        include: {
          shift: {
            include: {
              teacher: {
                include: {
                  user: { select: { fullName: true, avatarUrl: true } },
                },
              },
            },
          },
          review: { select: { id: true, rating: true } },
        },
        orderBy: { shift: { start: 'asc' } },
      }),
      this.scheduling.getStudentLiveOrNextLesson(userId),
      // Lessons the student has had — distinct lesson numbers, so a partially
      // completed lesson and its extra class count once.
      user.assignedCourse
        ? this.prisma.scheduledLesson
            .findMany({
              where: {
                studentUserId: userId,
                courseId: user.assignedCourse.id,
                status: { in: COUNTS_AS_COMPLETED },
              },
              distinct: ['lessonNumber'],
              select: { lessonNumber: true },
            })
            .then((rows) => rows.length)
        : Promise.resolve(0),
      // Homework the student has genuinely not acted on yet: the class is
      // done, the lesson has an assignment, and nothing's been submitted
      // for it (see Submission model). Surfaced on Student Home.
      this.prisma.scheduledLesson
        .findMany({
          where: {
            studentUserId: userId,
            status: { in: COUNTS_AS_COMPLETED },
            lesson: { homework: { not: null } },
            submission: null,
          },
          orderBy: { end: 'desc' },
          take: 10,
          select: {
            id: true,
            studentUserId: true,
            courseId: true,
            lessonNumber: true,
            course: { select: { title: true } },
            lesson: { select: { title: true } },
          },
        })
        // One homework slot per lesson, owned by its earliest finalized class.
        .then(async (rows) =>
          (await keepCanonicalRows(this.prisma, rows)).slice(0, 5),
        ),
      // Homework the teacher sent back for changes — the student needs to
      // see this even more prominently than never-submitted homework.
      this.prisma.submission.findMany({
        where: { studentUserId: userId, status: 'NEEDS_CHANGES' },
        orderBy: { reviewedAt: 'desc' },
        take: 5,
        select: {
          scheduledLessonId: true,
          feedback: true,
          feedbackTags: true,
          scheduledLesson: {
            select: {
              lessonNumber: true,
              course: { select: { title: true } },
            },
          },
          lesson: { select: { title: true } },
        },
      }),
    ]);

    const captured = bookings.filter((b) => b.paymentStatus === 'CAPTURED');
    const upcoming = bookings.filter((b) => new Date(b.shift.start) > now);

    // The class to show can come from either the marketplace booking flow
    // or an Operations-generated recurring lesson — whichever is soonest
    // (or already live) wins.
    const bookingNext = upcoming[0]
      ? {
          type: 'booking' as const,
          id: upcoming[0].id,
          start: upcoming[0].shift.start,
          end: upcoming[0].shift.end,
          teacherName: upcoming[0].shift.teacher.user.fullName,
          teacherAvatarUrl: upcoming[0].shift.teacher.user.avatarUrl,
        }
      : null;
    const lessonNext = nextScheduledLesson
      ? {
          type: 'lesson' as const,
          id: nextScheduledLesson.id,
          start: nextScheduledLesson.start,
          end: nextScheduledLesson.end,
          teacherName: nextScheduledLesson.teacher.user.fullName,
          teacherAvatarUrl: nextScheduledLesson.teacher.user.avatarUrl,
          courseTitle: nextScheduledLesson.course.title,
          lessonNumber: nextScheduledLesson.lessonNumber,
          lessonTitle: nextScheduledLesson.lessonTitle,
          classType: nextScheduledLesson.classType,
          // A batch class: the group the student learns with, shown instead of
          // "Batch" alone. Null for a 1-to-1 class.
          batchName: nextScheduledLesson.batch?.name ?? null,
        }
      : null;
    const chosen =
      bookingNext && lessonNext
        ? new Date(bookingNext.start) < new Date(lessonNext.start)
          ? bookingNext
          : lessonNext
        : (bookingNext ?? lessonNext);

    const liveClass = chosen
      ? {
          ...chosen,
          ...getClassWindow(new Date(chosen.start), new Date(chosen.end)),
        }
      : null;

    const pendingReview =
      captured
        .filter((b) => new Date(b.shift.end) < now && !b.review)
        .sort(
          (a, b) =>
            new Date(b.shift.end).getTime() - new Date(a.shift.end).getTime(),
        )[0] ?? null;

    const rankInfo = rankMeta(user.spaceRank);
    const capturedBookingsCount = captured.filter(
      (b) => new Date(b.shift.end) < now,
    ).length;

    const totalLessons = user.assignedCourse?.sessions ?? null;
    // The lesson of the next scheduled class when there is one (so a lesson
    // with an extra class scheduled shows that lesson, matching the teacher's
    // dashboard); otherwise the one after the last completed lesson.
    const currentLessonNumber = totalLessons
      ? (nextScheduledLesson?.lessonNumber ??
        Math.min(completedLessonCount + 1, totalLessons))
      : null;
    const continueLearning = user.assignedCourse
      ? {
          courseId: user.assignedCourse.id,
          courseTitle: user.assignedCourse.title,
          courseEmoji: user.assignedCourse.emoji,
          totalLessons,
          completedCount: completedLessonCount,
          currentLessonNumber,
          progressPct:
            totalLessons && totalLessons > 0
              ? Math.min(
                  100,
                  Math.round((completedLessonCount / totalLessons) * 100),
                )
              : 0,
        }
      : null;

    // Setup is "complete" once Operations has assigned a teacher + curriculum
    // and the student has either a session on the books or one already
    // behind them — until then, the onboarding checklist keeps showing.
    const setupComplete =
      !!user.assignedTeacher &&
      !!user.assignedCourse &&
      (!!liveClass || completedLessonCount > 0 || capturedBookingsCount > 0);

    return {
      student: {
        id: user.id,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        spaceRank: user.spaceRank,
        rankIcon: rankInfo.icon,
        totalSessions: user.totalSessions,
        streakWeeks: user.streakWeeks,
        gemBalance: user.gemBalance,
        hasBillingContact: !!user.billingContactEmail,
        sessionsToNextRank: sessionsToNextRank(user.totalSessions),
        assignedTeacher: mapAssignedTeacher(user.assignedTeacher),
        assignedCourse: user.assignedCourse,
      },
      setupComplete,
      liveClass,
      continueLearning,
      metrics: {
        lessonsCompleted: completedLessonCount,
        // Every class the student actually attended (a lesson that needed an
        // extra class counts both), as ranks and streaks count them.
        classesAttended: user.totalSessions,
      },
      pendingReview: pendingReview
        ? {
            bookingId: pendingReview.id,
            classStart: pendingReview.shift.start,
            teacherName: pendingReview.shift.teacher.user.fullName,
            teacherAvatarUrl: pendingReview.shift.teacher.user.avatarUrl,
          }
        : null,
      pendingHomework: pendingHomeworkLessons.map((l) => ({
        scheduledLessonId: l.id,
        lessonNumber: l.lessonNumber,
        courseTitle: l.course.title,
        lessonTitle: l.lesson?.title ?? `Session ${l.lessonNumber}`,
      })),
      homeworkNeedsChanges: homeworkNeedsChangesRows.map((r) => ({
        scheduledLessonId: r.scheduledLessonId,
        lessonNumber: r.scheduledLesson.lessonNumber,
        courseTitle: r.scheduledLesson.course.title,
        lessonTitle:
          r.lesson?.title ?? `Session ${r.scheduledLesson.lessonNumber}`,
        feedback: r.feedback,
        feedbackTags: r.feedbackTags,
      })),
      stats: {
        totalSessions: user.totalSessions,
        upcomingCount: upcoming.length,
        spaceRank: user.spaceRank,
        streakWeeks: user.streakWeeks,
        gemBalance: user.gemBalance,
      },
    };
  }

  // ─── Paginated lesson list for lessons sub-page ───────────────────────────

  async getMyLessons(
    userId: string,
    status: 'upcoming' | 'completed' | 'all' = 'all',
    page = 1,
    limit = 10,
  ) {
    const now = new Date();

    const where: Prisma.BookingWhereInput = { studentUserId: userId };
    if (status === 'upcoming') {
      where.paymentStatus = { notIn: ['REFUNDED'] };
      where.shift = { start: { gt: now } };
    } else if (status === 'completed') {
      where.paymentStatus = 'CAPTURED';
      where.shift = { end: { lt: now } };
    } else {
      where.paymentStatus = { notIn: ['REFUNDED'] };
    }

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: {
          shift: {
            include: {
              teacher: {
                include: {
                  user: { select: { fullName: true, avatarUrl: true } },
                },
              },
            },
          },
          review: { select: { id: true, rating: true, comment: true } },
        },
        orderBy: {
          shift: { start: status === 'upcoming' ? 'asc' : 'desc' },
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      bookings: bookings.map((b) => ({
        bookingId: b.id,
        status: b.paymentStatus,
        classStart: b.shift.start,
        classEnd: b.shift.end,
        teacherName: b.shift.teacher.user.fullName,
        teacherAvatarUrl: b.shift.teacher.user.avatarUrl ?? null,
        durationMinutes: Math.round(
          (new Date(b.shift.end).getTime() -
            new Date(b.shift.start).getTime()) /
            60000,
        ),
        review: b.review
          ? {
              id: b.review.id,
              rating: b.review.rating,
              comment: b.review.comment,
            }
          : null,
        recordingUrl: b.recordingUrl ?? null,
        recordingStatus: b.recordingStatus,
        isUpcoming: new Date(b.shift.start) > now,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ─── Gamified progress (rank, streak, badges, milestones) ───────────────
  //
  // All of it is derived from the student's real class records by
  // StudentProgressService (see progress/). Every read below re-derives first,
  // so what the student sees can never drift from the records — an admin
  // correcting a class or a payment shows up on the next load.

  /** Brings the stored counters/badges up to the records before a read. A
   * failure here must never take the page down — the page then shows what was
   * last stored. */
  private async syncProgressQuietly(userId: string) {
    try {
      await this.progress.sync(userId, { mode: 'silent' });
    } catch (err) {
      this.logger.error(`Progress sync failed for student ${userId}: ${err}`);
    }
  }

  private rankPayload(result: ProgressResult) {
    const { rank, nextRank, sessions } = result;
    return {
      id: rank.rank,
      label: rank.label,
      icon: rank.icon,
      min: rank.min,
      sessions,
      progressPct: result.rankProgressPct,
      sessionsToNext: result.sessionsToNextRank,
      next: nextRank
        ? {
            id: nextRank.rank,
            label: nextRank.label,
            icon: nextRank.icon,
            min: nextRank.min,
            sessionsNeeded: result.sessionsToNextRank,
          }
        : null,
      requirement: nextRank
        ? `Attend ${nextRank.min - sessions} more class${nextRank.min - sessions === 1 ? '' : 'es'} (${nextRank.min} in total) to reach ${nextRank.label}.`
        : 'You have reached the highest rank in the fleet.',
      ladder: RANK_TIERS.map((t) => ({
        id: t.rank,
        label: t.label,
        icon: t.icon,
        min: t.min,
        unlocked: result.rank.min >= t.min,
        current: t.rank === rank.rank,
      })),
    };
  }

  /**
   * Everything the student navbar shows: class credits and rank. Polled by the
   * student layout, so an admin-side payment or class change reaches the pills
   * without the student doing anything.
   */
  async getMyNavSummary(userId: string) {
    const synced = await this.progress.sync(userId, { mode: 'silent' });
    if (!synced) throw new NotFoundException('Student not found.');
    const [user, credits] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, fullName: true, avatarUrl: true },
      }),
      this.ledger.getCredits(userId),
    ]);
    if (!user) throw new NotFoundException('Student not found.');
    const { result } = synced;
    return {
      id: user.id,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      spaceRank: result.rank.rank,
      rankIcon: result.rank.icon,
      totalSessions: result.sessions,
      streakWeeks: result.streak.current,
      rank: this.rankPayload(result),
      // Whole classes only — a student never sees a part-credit (4.9 → 4).
      credits: {
        remaining: credits.remainingWhole,
        low: credits.remainingWhole >= 1 && credits.remainingWhole < 3,
        exhausted: credits.remainingWhole < 1,
      },
    };
  }

  // ─── Progress / stats for progress sub-page ───────────────────────────────

  async getMyProgress(userId: string) {
    const synced = await this.progress.sync(userId, { mode: 'silent' });
    if (!synced) throw new NotFoundException('Student not found.');
    const { result, curriculum } = synced;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        gemBalance: true,
        subjects: true,
        createdAt: true,
        billingContactEmail: true,
        assignedCourse: { select: { title: true, emoji: true } },
      },
    });
    if (!user) throw new NotFoundException('Student not found.');
    const now = new Date();

    // Sessions by subject: every attended curriculum class counts under its
    // curriculum; legacy marketplace sessions under their teacher's subjects.
    const [capturedBookings, upcomingLessons, upcomingBookings, completedRows] =
      await Promise.all([
        this.prisma.booking.findMany({
          where: {
            studentUserId: userId,
            paymentStatus: 'CAPTURED',
            shift: { end: { lt: now } },
          },
          select: {
            shift: { select: { teacher: { select: { subjects: true } } } },
          },
        }),
        this.prisma.scheduledLesson.count({
          where: {
            studentUserId: userId,
            status: 'UPCOMING',
            end: { gte: now },
          },
        }),
        this.prisma.booking.count({
          where: {
            studentUserId: userId,
            paymentStatus: { in: ['PENDING', 'CAPTURED'] },
            shift: { start: { gt: now } },
          },
        }),
        this.prisma.scheduledLesson.count({
          where: { studentUserId: userId, status: 'COMPLETED' },
        }),
      ]);

    const subjectMap = new Map<string, number>();
    for (const c of synced.classes) {
      if (c.courseTitle) {
        subjectMap.set(c.courseTitle, (subjectMap.get(c.courseTitle) ?? 0) + 1);
      }
    }
    for (const b of capturedBookings) {
      for (const subj of b.shift.teacher.subjects) {
        subjectMap.set(subj, (subjectMap.get(subj) ?? 0) + 1);
      }
    }
    const subjectBreakdown = Array.from(subjectMap.entries())
      .map(([subject, count]) => ({ subject, count }))
      .sort((a, b) => b.count - a.count);

    const monthKey = (d: Date) => utcToDhakaParts(d).dateStr.slice(0, 7);
    const thisMonth = monthKey(now);
    const classesThisMonth = synced.classes.filter(
      (c) => monthKey(c.at) === thisMonth,
    ).length;

    // Badges: requirement + live progress from the rules, "earned" from the
    // stored rows (which sync() has just reconciled with the records).
    const stored = await this.prisma.studentBadge.findMany({
      where: { userId },
      select: { type: true, earnedAt: true },
    });
    const storedAt = new Map(stored.map((b) => [b.type, b.earnedAt]));
    const badges = BADGE_DEFS.map((def) => {
      const state = result.badges.find((b) => b.id === def.id)!;
      const earned = storedAt.has(def.id) || state.earned;
      return {
        id: def.id,
        label: def.label,
        icon: def.icon,
        description: def.description,
        requirement: def.requirement,
        earned,
        earnedAt: storedAt.get(def.id) ?? state.earnedAt ?? null,
        progress: {
          current: earned ? state.target : state.current,
          target: state.target,
          unit: state.unit,
          pct: Math.round(
            ((earned ? state.target : state.current) / state.target) * 100,
          ),
        },
        hint: earned ? null : state.hint,
      };
    });
    const nextBadge =
      badges
        .filter((b) => !b.earned)
        .sort((a, b) => b.progress.pct - a.progress.pct)[0] ?? null;

    // Milestones: what is done, what is next in each family, and the single
    // nearest one to feature.
    const done = result.milestones.filter((m) => m.achieved);
    const pending = result.milestones.filter((m) => !m.achieved);
    const nextPerGroup = ['classes', 'curriculum', 'streak', 'homework']
      .map((g) => pending.find((m) => m.group === g))
      .filter((m): m is NonNullable<typeof m> => !!m);
    const nextMilestone =
      [...nextPerGroup].sort(
        (a, b) => b.current / b.target - a.current / a.target,
      )[0] ?? null;

    return {
      // ── existing fields (kept for the other student pages) ──
      spaceRank: result.rank.rank,
      rankIcon: result.rank.icon,
      totalSessions: result.sessions,
      totalHours: Math.round((result.totalMinutes / 60) * 10) / 10,
      streakWeeks: result.streak.current,
      sessionsToNextRank: result.sessionsToNextRank,
      subjects: user.subjects,
      subjectBreakdown,
      rankHistory: RANK_THRESHOLDS.map((t) => ({
        rank: t.rank,
        icon: t.icon,
        minSessions: t.min,
        unlocked: result.rank.min >= t.min,
      })),
      badges,
      nextBadge,
      totalLessonsCompleted: completedRows,
      lessonsCompletedThisMonth: classesThisMonth,
      recentGemTransactions: await this.getRecentGemTransactions(userId),
      memberSince: user.createdAt,
      gemBalance: user.gemBalance,
      hasBillingContact: !!user.billingContactEmail,
      // ── structured, backend-derived progress ──
      rank: this.rankPayload(result),
      streak: {
        current: result.streak.current,
        longest: result.streak.longest,
        thisWeekDone: result.streak.thisWeekDone,
        weeks: result.streak.weeks,
        next: result.streak.next,
      },
      milestones: {
        completed: done,
        next: nextMilestone,
        nextPerGroup,
        completedCount: done.length,
        totalCount: result.milestones.length,
        classesThisMonth,
      },
      overview: {
        classesAttended: result.sessions,
        lessonsCompleted: curriculum?.completedLessons ?? 0,
        totalLessons: curriculum?.totalLessons ?? null,
        curriculumProgressPct: curriculum
          ? Math.min(
              100,
              Math.round(
                (curriculum.completedLessons / curriculum.totalLessons) * 100,
              ),
            )
          : null,
        courseTitle: user.assignedCourse?.title ?? null,
        courseEmoji: user.assignedCourse?.emoji ?? null,
        earnedBadges: badges.filter((b) => b.earned).length,
        totalBadges: badges.length,
        upcomingClasses: upcomingLessons + upcomingBookings,
        homeworkSubmitted: synced.homeworkSubmitted,
        lastClassAt: result.lastClassAt,
      },
    };
  }

  private async getRecentGemTransactions(userId: string, limit = 10) {
    return this.prisma.gemTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        amount: true,
        type: true,
        description: true,
        createdAt: true,
      },
    });
  }

  // ─── Award gems + log transaction ─────────────────────────────────────────

  async awardGems(
    userId: string,
    amount: number,
    type: string,
    description: string,
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { gemBalance: { increment: amount } },
      }),
      this.prisma.gemTransaction.create({
        data: { userId, amount, type, description },
      }),
    ]);
  }

  // ─── Check and award badges (run after a class is completed) ──────────────
  //
  // Kept as the entry point the legacy marketplace flows already call; the
  // rules, the badge rows, the level-up email and the streak gem bonuses all
  // live in StudentProgressService now, so there is exactly one place that
  // decides what a student has earned.

  async checkAndAwardBadges(userId: string): Promise<string[]> {
    const out = await this.progress.sync(userId, { mode: 'live' });
    return out?.newBadges ?? [];
  }

  // ─── Teacher list for teachers sub-page ──────────────────────────────────

  async getMyTeachers(userId: string) {
    const bookings = await this.prisma.booking.findMany({
      where: { studentUserId: userId, paymentStatus: 'CAPTURED' },
      include: {
        shift: {
          include: {
            teacher: {
              include: {
                user: { select: { id: true, fullName: true, avatarUrl: true } },
              },
            },
          },
        },
      },
      orderBy: { shift: { start: 'desc' } },
    });

    type TeacherEntry = {
      id: string;
      ratingAvg: number;
      reviewCount: number;
      subjects: string[];
      hourlyRate: number;
      user: { fullName: string; avatarUrl: string | null };
      sessionCount: number;
      lastSession: Date;
    };

    const teacherMap = new Map<string, TeacherEntry>();

    for (const b of bookings) {
      const t = b.shift.teacher;
      if (!teacherMap.has(t.id)) {
        teacherMap.set(t.id, {
          id: t.id,
          ratingAvg: t.ratingAvg,
          reviewCount: t.reviewCount,
          subjects: t.subjects,
          hourlyRate: t.hourlyRate,
          user: {
            fullName: t.user.fullName,
            avatarUrl: t.user.avatarUrl ?? null,
          },
          sessionCount: 0,
          lastSession: new Date(b.shift.start),
        });
      }
      teacherMap.get(t.id)!.sessionCount++;
    }

    return Array.from(teacherMap.values()).map((t) => ({
      teacherProfileId: t.id,
      fullName: t.user.fullName,
      avatarUrl: t.user.avatarUrl,
      ratingAvg: t.ratingAvg,
      reviewCount: t.reviewCount,
      subjects: t.subjects,
      hourlyRate: t.hourlyRate,
      sessionCount: t.sessionCount,
      lastSession: t.lastSession,
    }));
  }

  // ─── Rankings for rankings sub-page ──────────────────────────────────────

  async getMyRankings(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        totalSessions: true,
        spaceRank: true,
        subjects: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('Student not found.');

    const now = new Date();
    const cohortMonth = user.createdAt.getMonth() + 1;
    const cohortYear = user.createdAt.getFullYear();
    const cohortStart = new Date(cohortYear, cohortMonth - 1, 1);
    const cohortEnd = new Date(cohortYear, cohortMonth, 1);

    const [
      globalHigher,
      globalTotal,
      topGlobal,
      cohortHigher,
      cohortTotal,
      topCohort,
      lastSnapshot,
    ] = await Promise.all([
      this.prisma.user.count({
        where: {
          role: 'STUDENT',
          accountStatus: 'ACTIVE',
          totalSessions: { gt: user.totalSessions },
        },
      }),
      this.prisma.user.count({
        where: { role: 'STUDENT', accountStatus: 'ACTIVE' },
      }),
      this.prisma.user.findMany({
        where: {
          role: 'STUDENT',
          accountStatus: 'ACTIVE',
          totalSessions: { gt: 0 },
        },
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
          totalSessions: true,
          spaceRank: true,
        },
        orderBy: { totalSessions: 'desc' },
        take: 20,
      }),
      this.prisma.user.count({
        where: {
          role: 'STUDENT',
          accountStatus: 'ACTIVE',
          createdAt: { gte: cohortStart, lt: cohortEnd },
          totalSessions: { gt: user.totalSessions },
        },
      }),
      this.prisma.user.count({
        where: {
          role: 'STUDENT',
          accountStatus: 'ACTIVE',
          createdAt: { gte: cohortStart, lt: cohortEnd },
        },
      }),
      this.prisma.user.findMany({
        where: {
          role: 'STUDENT',
          accountStatus: 'ACTIVE',
          createdAt: { gte: cohortStart, lt: cohortEnd },
          totalSessions: { gt: 0 },
        },
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
          totalSessions: true,
          spaceRank: true,
        },
        orderBy: { totalSessions: 'desc' },
        take: 20,
      }),
      this.prisma.rankSnapshot.findFirst({
        where: {
          userId,
          month: now.getMonth() === 0 ? 12 : now.getMonth(),
          year:
            now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear(),
        },
      }),
    ]);

    const globalRank = globalHigher + 1;
    const cohortRank = cohortHigher + 1;

    // Save snapshot for current month if not already saved
    const snapMonth = now.getMonth() + 1;
    const snapYear = now.getFullYear();
    this.prisma.rankSnapshot
      .upsert({
        where: {
          userId_month_year: { userId, month: snapMonth, year: snapYear },
        },
        update: { globalRank, cohortRank },
        create: {
          userId,
          globalRank,
          cohortRank,
          month: snapMonth,
          year: snapYear,
        },
      })
      .catch(() => {});

    // Subject ranks
    const subjectRanks: Record<string, { rank: number; total: number }> = {};
    for (const subject of user.subjects) {
      const [subHigher, subTotal] = await Promise.all([
        this.prisma.user.count({
          where: {
            role: 'STUDENT',
            accountStatus: 'ACTIVE',
            subjects: { has: subject },
            totalSessions: { gt: user.totalSessions },
          },
        }),
        this.prisma.user.count({
          where: {
            role: 'STUDENT',
            accountStatus: 'ACTIVE',
            subjects: { has: subject },
          },
        }),
      ]);
      subjectRanks[subject] = { rank: subHigher + 1, total: subTotal };
    }

    // Ensure current user in top lists
    const ensureUser = (list: typeof topGlobal) => {
      if (!list.some((s) => s.id === userId)) {
        list.push({
          id: userId,
          fullName: '',
          avatarUrl: null,
          totalSessions: user.totalSessions,
          spaceRank: user.spaceRank,
        });
      }
      return list;
    };
    ensureUser(topGlobal);
    ensureUser(topCohort);

    const mapEntry = (s: (typeof topGlobal)[0], i: number) => ({
      position: i + 1,
      fullName: s.fullName,
      avatarUrl: s.avatarUrl ?? null,
      totalSessions: s.totalSessions,
      spaceRank: s.spaceRank,
      spaceRankIcon: rankMeta(s.spaceRank).icon,
      isCurrentUser: s.id === userId,
    });

    const rankInfo = rankMeta(user.spaceRank);
    const movedUp = lastSnapshot ? lastSnapshot.globalRank - globalRank : null;

    return {
      globalRank,
      totalStudents: globalTotal,
      globalPercentile:
        globalTotal > 1
          ? Math.round((1 - globalHigher / globalTotal) * 100)
          : 100,
      topStudents: topGlobal.map(mapEntry),
      cohortRank,
      totalInCohort: cohortTotal,
      cohortPercentile:
        cohortTotal > 1
          ? Math.round((1 - cohortHigher / cohortTotal) * 100)
          : 100,
      cohortMonth: user.createdAt.toLocaleString('en-US', {
        month: 'long',
        year: 'numeric',
      }),
      topCohort: topCohort.map(mapEntry),
      subjectRanks,
      movedUpThisMonth: movedUp,
      currentUserSessions: user.totalSessions,
      currentUserRank: user.spaceRank,
      currentUserRankIcon: rankInfo.icon,
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PARENT-PROXY METHODS (legacy, unchanged)
  // ══════════════════════════════════════════════════════════════════════════

  async create(userId: string, dto: CreateStudentDto) {
    return this.prisma.student.create({
      data: { parentId: userId, name: dto.name, age: dto.age },
    });
  }

  async findAllForParent(userId: string) {
    return this.prisma.student.findMany({
      where: { parentId: userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getStudentDashboard(studentId: string, parentId: string) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, parentId },
    });
    if (!student) throw new NotFoundException('Student not found.');

    const now = new Date();
    const bookings = await this.prisma.booking.findMany({
      where: {
        studentId,
        paymentStatus: { in: ['PENDING', 'CAPTURED'] },
      },
      include: {
        shift: {
          include: {
            teacher: {
              include: {
                user: { select: { fullName: true, avatarUrl: true } },
              },
            },
          },
        },
        review: { select: { rating: true, comment: true } },
      },
      orderBy: { shift: { start: 'asc' } },
    });

    const completed = bookings.filter((b) => b.paymentStatus === 'CAPTURED');
    const upcoming = bookings.filter((b) => new Date(b.shift.start) > now);
    const nextClass =
      upcoming.length > 0
        ? {
            bookingId: upcoming[0].id,
            classStart: upcoming[0].shift.start,
            classEnd: upcoming[0].shift.end,
            teacherName: upcoming[0].shift.teacher.user.fullName,
            teacherAvatarUrl: upcoming[0].shift.teacher.user.avatarUrl,
          }
        : null;

    const rank = getSpaceRank(completed.length);
    const classesToNext = classesToNextRank(completed.length);

    const recentCompleted = completed
      .slice()
      .sort(
        (a, b) =>
          new Date(b.shift.start).getTime() - new Date(a.shift.start).getTime(),
      )
      .slice(0, 5)
      .map((b) => ({
        bookingId: b.id,
        classDate: b.shift.start,
        classEnd: b.shift.end,
        teacherName: b.shift.teacher.user.fullName,
        amountCents: b.amountCents,
        review: b.review ?? null,
      }));

    return {
      student: { id: student.id, name: student.name, age: student.age },
      stats: {
        completedClasses: completed.length,
        upcomingClasses: upcoming.length,
        totalBookings: bookings.length,
      },
      rank,
      classesToNextRank: classesToNext,
      nextClass,
      recentCompleted,
    };
  }

  async getStudentBookings(
    studentId: string,
    parentId: string,
    page = 1,
    limit = 20,
    filter: 'all' | 'upcoming' | 'completed' = 'all',
  ) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, parentId },
    });
    if (!student) throw new NotFoundException('Student not found.');

    const now = new Date();
    let statusFilter: object = {
      paymentStatus: { in: ['PENDING', 'CAPTURED'] },
    };
    let shiftFilter: object = {};

    if (filter === 'upcoming') {
      shiftFilter = { start: { gte: now } };
    } else if (filter === 'completed') {
      statusFilter = { paymentStatus: 'CAPTURED' };
      shiftFilter = { start: { lt: now } };
    }

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where: { studentId, ...statusFilter, shift: shiftFilter },
        include: {
          shift: {
            include: {
              teacher: {
                include: {
                  user: { select: { fullName: true, avatarUrl: true } },
                },
              },
            },
          },
          review: { select: { rating: true, comment: true } },
        },
        orderBy: { shift: { start: filter === 'upcoming' ? 'asc' : 'desc' } },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.booking.count({
        where: { studentId, ...statusFilter, shift: shiftFilter },
      }),
    ]);

    return {
      bookings: bookings.map((b) => ({
        bookingId: b.id,
        status: b.paymentStatus,
        classStart: b.shift.start,
        classEnd: b.shift.end,
        teacherName: b.shift.teacher.user.fullName,
        teacherAvatarUrl: b.shift.teacher.user.avatarUrl,
        amountCents: b.amountCents,
        durationMinutes: Math.round(
          (new Date(b.shift.end).getTime() -
            new Date(b.shift.start).getTime()) /
            60000,
        ),
        review: b.review ?? null,
        isUpcoming: new Date(b.shift.start) > now,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getLeaderboard(currentStudentId?: string) {
    const students = await this.prisma.student.findMany({
      select: {
        id: true,
        name: true,
        age: true,
        bookings: {
          where: { paymentStatus: 'CAPTURED' },
          select: { id: true },
        },
      },
    });

    const ranked = students
      .map((s) => ({
        studentId: s.id,
        name: s.name,
        age: s.age,
        completedClasses: s.bookings.length,
        rank: getSpaceRank(s.bookings.length),
        isCurrentStudent: s.id === currentStudentId,
      }))
      .filter((s) => s.completedClasses > 0 || s.isCurrentStudent)
      .sort((a, b) => b.completedClasses - a.completedClasses)
      .map((s, i) => ({ ...s, position: i + 1 }));

    if (currentStudentId) {
      const inList = ranked.find((r) => r.studentId === currentStudentId);
      if (!inList) {
        ranked.push({
          studentId: currentStudentId,
          name: '',
          age: 0,
          completedClasses: 0,
          rank: getSpaceRank(0),
          isCurrentStudent: true,
          position: ranked.length + 1,
        });
      }
    }

    return ranked;
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private safeUser(user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    avatarUrl: string | null;
    age: number | null;
    grade: string | null;
    subjects: string[];
    spaceRank: SpaceRank;
    totalSessions: number;
    streakWeeks: number;
    gemBalance: number;
    accountStatus: AccountStatus;
  }) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      avatarUrl: user.avatarUrl,
      age: user.age,
      grade: user.grade,
      subjects: user.subjects,
      spaceRank: user.spaceRank,
      totalSessions: user.totalSessions,
      streakWeeks: user.streakWeeks,
      gemBalance: user.gemBalance,
      accountStatus: user.accountStatus,
    };
  }
}
