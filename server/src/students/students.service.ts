import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { RegisterStudentDto } from './dto/register-student.dto';
import { Prisma, SpaceRank, AccountStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

// ─── Space Rank Helpers ───────────────────────────────────────────────────────

const RANK_THRESHOLDS: { rank: SpaceRank; min: number; icon: string }[] = [
  { rank: 'STARCHILD', min: 0, icon: '🌟' },
  { rank: 'EXPLORER', min: 5, icon: '🔭' },
  { rank: 'COSMONAUT', min: 15, icon: '🛸' },
  { rank: 'NAVIGATOR', min: 30, icon: '🧭' },
  { rank: 'CAPTAIN', min: 60, icon: '🎖️' },
  { rank: 'GALAXY_COMMANDER', min: 100, icon: '🌌' },
];

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
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private notifications: NotificationsService,
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

    const needsConsent = dto.age < 16;
    if (needsConsent && !dto.billingContactEmail) {
      throw new BadRequestException(
        'A parent or guardian email is required for students under 16.',
      );
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const accountStatus: AccountStatus = needsConsent
      ? 'PENDING_CONSENT'
      : 'ACTIVE';

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        fullName: dto.fullName,
        role: 'STUDENT',
        age: dto.age,
        grade: dto.grade ?? null,
        subjects: dto.subjects ?? [],
        accountStatus,
        billingContactEmail: dto.billingContactEmail ?? null,
        spaceRank: 'STARCHILD',
        totalSessions: 0,
        streakWeeks: 0,
        streakFreezes: 1,
        gemBalance: 0,
      },
    });

    if (needsConsent) {
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

      await this.prisma.consentToken.create({
        data: { userId: user.id, token, expiresAt },
      });

      const consentUrl = `${process.env.FRONTEND_URL}/student/consent/confirm?token=${token}`;

      // Fire-and-forget: send consent email to billing contact
      this.notifications
        .sendConsentRequest(dto.billingContactEmail!, {
          studentName: dto.fullName,
          consentUrl,
          expiresHours: 48,
        })
        .catch(() => {});

      return {
        status: 'PENDING_CONSENT' as const,
        message: `Consent email sent to ${this.maskEmail(dto.billingContactEmail!)}. Account activates after approval.`,
        consentToken: token,
        billingContactEmail: dto.billingContactEmail!,
        userId: user.id,
      };
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const access_token = this.jwtService.sign(payload);

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
    if (user.accountStatus === 'PENDING_CONSENT') {
      throw new ForbiddenException(
        'Your account is awaiting parental consent. Please check the email sent to your billing contact.',
      );
    }
    if (user.accountStatus === 'SUSPENDED') {
      throw new ForbiddenException('This account has been suspended.');
    }
    if (user.accountStatus === 'DEACTIVATED') {
      throw new ForbiddenException('This account has been deactivated.');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: this.safeUser(user),
    };
  }

  async confirmConsent(token: string) {
    const record = await this.prisma.consentToken.findUnique({
      where: { token },
    });

    if (!record) throw new NotFoundException('Consent link is invalid.');
    if (record.usedAt) {
      throw new BadRequestException('This consent link has already been used.');
    }
    if (record.expiresAt < new Date()) {
      throw new BadRequestException(
        'This consent link has expired. Please ask the student to register again.',
      );
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: {
          accountStatus: 'ACTIVE',
          billingContactConsented: true,
          billingContactConsentAt: new Date(),
        },
      }),
      this.prisma.consentToken.update({
        where: { token },
        data: { usedAt: new Date() },
      }),
    ]);

    return { message: 'Account activated. The student can now log in.' };
  }

  async getMyProfile(userId: string) {
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
        streakFreezes: true,
        gemBalance: true,
        accountStatus: true,
        createdAt: true,
      },
    });

    if (!user || user.role !== 'STUDENT') {
      throw new NotFoundException('Student profile not found.');
    }

    const rankInfo = rankMeta(user.spaceRank);
    return {
      ...user,
      rankIcon: rankInfo.icon,
      sessionsToNextRank: sessionsToNextRank(user.totalSessions),
    };
  }

  async getMyDashboard(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        avatarUrl: true,
        spaceRank: true,
        totalSessions: true,
        streakWeeks: true,
        streakFreezes: true,
        gemBalance: true,
        billingContactEmail: true,
      },
    });

    if (!user) throw new NotFoundException('Student not found.');

    const now = new Date();

    const bookings = await this.prisma.booking.findMany({
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
    });

    const captured = bookings.filter((b) => b.paymentStatus === 'CAPTURED');
    const upcoming = bookings.filter((b) => new Date(b.shift.start) > now);

    const nextBooking =
      upcoming.length > 0
        ? {
            bookingId: upcoming[0].id,
            classStart: upcoming[0].shift.start,
            classEnd: upcoming[0].shift.end,
            teacherName: upcoming[0].shift.teacher.user.fullName,
            teacherAvatarUrl: upcoming[0].shift.teacher.user.avatarUrl,
          }
        : null;

    const pendingReview =
      captured
        .filter((b) => new Date(b.shift.end) < now && !b.review)
        .sort(
          (a, b) =>
            new Date(b.shift.end).getTime() - new Date(a.shift.end).getTime(),
        )[0] ?? null;

    const recentSessions = captured
      .filter((b) => new Date(b.shift.end) < now)
      .sort(
        (a, b) =>
          new Date(b.shift.end).getTime() - new Date(a.shift.end).getTime(),
      )
      .slice(0, 5)
      .map((b) => ({
        bookingId: b.id,
        classStart: b.shift.start,
        classEnd: b.shift.end,
        teacherName: b.shift.teacher.user.fullName,
        teacherAvatarUrl: b.shift.teacher.user.avatarUrl,
        durationMinutes: Math.round(
          (new Date(b.shift.end).getTime() -
            new Date(b.shift.start).getTime()) /
            60000,
        ),
        hasReview: !!b.review,
      }));

    const rankInfo = rankMeta(user.spaceRank);

    return {
      student: {
        id: user.id,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        spaceRank: user.spaceRank,
        rankIcon: rankInfo.icon,
        totalSessions: user.totalSessions,
        streakWeeks: user.streakWeeks,
        streakFreezes: user.streakFreezes,
        gemBalance: user.gemBalance,
        hasBillingContact: !!user.billingContactEmail,
        sessionsToNextRank: sessionsToNextRank(user.totalSessions),
      },
      upcomingBooking: nextBooking,
      pendingReview: pendingReview
        ? {
            bookingId: pendingReview.id,
            classStart: pendingReview.shift.start,
            teacherName: pendingReview.shift.teacher.user.fullName,
            teacherAvatarUrl: pendingReview.shift.teacher.user.avatarUrl,
          }
        : null,
      recentSessions,
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
          ? { id: b.review.id, rating: b.review.rating, comment: b.review.comment }
          : null,
        recordingUrl: b.recordingUrl ?? null,
        isUpcoming: new Date(b.shift.start) > now,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ─── Progress / stats for progress sub-page ───────────────────────────────

  async getMyProgress(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        spaceRank: true,
        totalSessions: true,
        streakWeeks: true,
        streakFreezes: true,
        gemBalance: true,
        subjects: true,
        createdAt: true,
        billingContactEmail: true,
      },
    });
    if (!user) throw new NotFoundException('Student not found.');

    const completedBookings = await this.prisma.booking.findMany({
      where: { studentUserId: userId, paymentStatus: 'CAPTURED' },
      select: {
        shift: {
          select: {
            start: true,
            end: true,
            teacher: { select: { subjects: true } },
          },
        },
      },
    });

    const totalMinutes = completedBookings.reduce((sum, b) => {
      return (
        sum +
        Math.round(
          (new Date(b.shift.end).getTime() -
            new Date(b.shift.start).getTime()) /
            60000,
        )
      );
    }, 0);

    // Subject breakdown from teacher subjects
    const subjectMap = new Map<string, number>();
    for (const b of completedBookings) {
      for (const subj of b.shift.teacher.subjects) {
        subjectMap.set(subj, (subjectMap.get(subj) ?? 0) + 1);
      }
    }
    const subjectBreakdown = Array.from(subjectMap.entries())
      .map(([subject, count]) => ({ subject, count }))
      .sort((a, b) => b.count - a.count);

    // Rank journey — show unlocked + next locked tier
    const rankHistory = RANK_THRESHOLDS.map((t) => ({
      rank: t.rank,
      icon: t.icon,
      minSessions: t.min,
      unlocked: user.totalSessions >= t.min,
    }));

    const rankInfo = rankMeta(user.spaceRank);
    const toNext = sessionsToNextRank(user.totalSessions);

    return {
      spaceRank: user.spaceRank,
      rankIcon: rankInfo.icon,
      totalSessions: user.totalSessions,
      totalHours: Math.round((totalMinutes / 60) * 10) / 10,
      streakWeeks: user.streakWeeks,
      streakFreezes: user.streakFreezes,
      sessionsToNextRank: toNext,
      subjects: user.subjects,
      subjectBreakdown,
      rankHistory,
      badges: this.computeBadges(
        user.totalSessions,
        user.streakWeeks,
        completedBookings.length,
      ),
      memberSince: user.createdAt,
      gemBalance: user.gemBalance,
      hasBillingContact: !!user.billingContactEmail,
    };
  }

  private computeBadges(
    totalSessions: number,
    streakWeeks: number,
    completedCount: number,
  ) {
    return [
      {
        id: 'first_session',
        label: 'First Launch',
        icon: '🚀',
        earned: completedCount >= 1,
      },
      {
        id: 'sessions_5',
        label: 'Explorer',
        icon: '🔭',
        earned: totalSessions >= 5,
      },
      {
        id: 'sessions_10',
        label: 'Space Cadet',
        icon: '🛸',
        earned: totalSessions >= 10,
      },
      {
        id: 'sessions_25',
        label: 'Cosmonaut',
        icon: '🌌',
        earned: totalSessions >= 25,
      },
      {
        id: 'sessions_50',
        label: 'Star Captain',
        icon: '⭐',
        earned: totalSessions >= 50,
      },
      {
        id: 'streak_3',
        label: '3-Week Streak',
        icon: '🔥',
        earned: streakWeeks >= 3,
      },
      {
        id: 'streak_8',
        label: '8-Week Streak',
        icon: '🌟',
        earned: streakWeeks >= 8,
      },
      {
        id: 'streak_12',
        label: 'Galaxy Streak',
        icon: '💫',
        earned: streakWeeks >= 12,
      },
    ];
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
          user: { fullName: t.user.fullName, avatarUrl: t.user.avatarUrl ?? null },
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
      select: { totalSessions: true, spaceRank: true },
    });
    if (!user) throw new NotFoundException('Student not found.');

    const [higherCount, totalStudents, topStudents] = await Promise.all([
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
    ]);

    // Ensure current user appears in the list even with 0 sessions
    const currentInTop = topStudents.some((s) => s.id === userId);
    if (!currentInTop) {
      const currentUser = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
          totalSessions: true,
          spaceRank: true,
        },
      });
      if (currentUser) topStudents.push(currentUser);
    }

    const rankInfo = rankMeta(user.spaceRank);

    return {
      globalRank: higherCount + 1,
      totalStudents,
      globalPercentile:
        totalStudents > 1
          ? Math.round((1 - higherCount / totalStudents) * 100)
          : 100,
      topStudents: topStudents.map((s, i) => ({
        position: i + 1,
        fullName: s.fullName,
        avatarUrl: s.avatarUrl ?? null,
        totalSessions: s.totalSessions,
        spaceRank: s.spaceRank,
        spaceRankIcon: (rankMeta(s.spaceRank as SpaceRank)).icon,
        isCurrentUser: s.id === userId,
      })),
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
    streakFreezes: number;
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
      streakFreezes: user.streakFreezes,
      gemBalance: user.gemBalance,
      accountStatus: user.accountStatus,
    };
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!domain) return email;
    return `${local.slice(0, 2)}***@${domain}`;
  }
}
