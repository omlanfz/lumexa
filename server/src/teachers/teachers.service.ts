// FILE PATH: server/src/teachers/teachers.service.ts

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';

// ─── Badge Tier Definitions ───────────────────────────────────────────────────

export const BADGE_TIERS = [
  {
    id: 'cadet',
    minPts: 0,
    icon: '🌱',
    label: 'Cadet',
    desc: 'Just getting started. Complete your first class to begin your journey.',
  },
  {
    id: 'navigator',
    minPts: 1000,
    icon: '🧭',
    label: 'Navigator',
    desc: 'Earned 1,000 pts. Complete 10+ classes consistently.',
  },
  {
    id: 'pilot',
    minPts: 3000,
    icon: '✈️',
    label: 'Pilot',
    desc: 'Earned 3,000 pts. Maintain a 4.5+ star rating.',
  },
  {
    id: 'commander',
    minPts: 7000,
    icon: '🎖️',
    label: 'Commander',
    desc: 'Earned 7,000 pts. Top 25% of platform teachers.',
  },
  {
    id: 'admiral',
    minPts: 15000,
    icon: '⭐',
    label: 'Admiral',
    desc: 'Earned 15,000 pts. Top 10% of platform teachers.',
  },
  {
    id: 'starmaster',
    minPts: 30000,
    icon: '🌟',
    label: 'Starmaster',
    desc: 'Earned 30,000 pts. Elite status. Top 1% of platform.',
  },
];

// ─── Badge Tier Helper ────────────────────────────────────────────────────────

export function getBadgeTier(
  pts: number,
): (typeof BADGE_TIERS)[0] & { tierIndex: number } {
  for (let i = BADGE_TIERS.length - 1; i >= 0; i--) {
    if (pts >= BADGE_TIERS[i].minPts) {
      return { ...BADGE_TIERS[i], tierIndex: i };
    }
  }
  return { ...BADGE_TIERS[0], tierIndex: 0 };
}

@Injectable()
export class TeachersService {
  constructor(private prisma: PrismaService) {}

  // ─── Get My Profile ───────────────────────────────────────────────────────

  async getMyProfile(userId: string) {
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { userId },
      include: {
        user: { select: { fullName: true, email: true } },
      },
    });

    if (!teacher) throw new NotFoundException('Teacher profile not found.');

    return {
      id: teacher.id,
      fullName: teacher.user.fullName,
      email: teacher.user.email,
      bio: teacher.bio,
      hourlyRate: teacher.hourlyRate,
      stripeOnboarded: teacher.stripeOnboarded,
      ratingAvg: teacher.ratingAvg,
      reviewCount: teacher.reviewCount,
      strikes: teacher.strikes,
      isSuspended: teacher.isSuspended,
    };
  }

  // ─── Update My Profile ────────────────────────────────────────────────────

  async updateMyProfile(
    userId: string,
    data: { bio?: string; hourlyRate?: number },
  ) {
    if (data.hourlyRate !== undefined) {
      if (data.hourlyRate < 5 || data.hourlyRate > 500) {
        throw new BadRequestException(
          'Hourly rate must be between $5 and $500.',
        );
      }
    }

    if (data.bio !== undefined && data.bio.length > 500) {
      throw new BadRequestException('Bio cannot exceed 500 characters.');
    }

    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { userId },
    });
    if (!teacher) throw new NotFoundException('Teacher profile not found.');

    return this.prisma.teacherProfile.update({
      where: { userId },
      data: {
        ...(data.bio !== undefined && { bio: data.bio }),
        ...(data.hourlyRate !== undefined && { hourlyRate: data.hourlyRate }),
      },
      select: {
        id: true,
        bio: true,
        hourlyRate: true,
      },
    });
  }

  // ─── Get My Stats ─────────────────────────────────────────────────────────

  async getMyStats(userId: string) {
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { userId },
    });
    if (!teacher) throw new NotFoundException('Teacher profile not found.');

    const [totalShifts, completedBookings, earningsAgg] = await Promise.all([
      this.prisma.shift.count({ where: { teacherId: teacher.id } }),
      this.prisma.booking.count({
        where: {
          shift: { teacherId: teacher.id },
          paymentStatus: 'CAPTURED',
        },
      }),
      this.prisma.booking.aggregate({
        where: {
          shift: { teacherId: teacher.id },
          paymentStatus: 'CAPTURED',
        },
        _sum: { amountCents: true },
      }),
    ]);

    const grossCents = earningsAgg._sum.amountCents ?? 0;
    const teacherEarningsCents = Math.round(grossCents * 0.75);

    return {
      ratingAvg: teacher.ratingAvg,
      reviewCount: teacher.reviewCount,
      strikes: teacher.strikes,
      isSuspended: teacher.isSuspended,
      stripeOnboarded: teacher.stripeOnboarded,
      totalShifts,
      completedClasses: completedBookings,
      totalEarningsDollars: (teacherEarningsCents / 100).toFixed(2),
    };
  }

  // ─── Get Next Upcoming Class ──────────────────────────────────────────────

  async getNextClass(userId: string) {
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { userId },
    });
    if (!teacher) return null;

    const nextBooking = await this.prisma.booking.findFirst({
      where: {
        shift: {
          teacherId: teacher.id,
          start: { gte: new Date() },
        },
        paymentStatus: { in: ['PENDING', 'CAPTURED'] },
      },
      include: {
        student: {
          select: { name: true, age: true, grade: true, subject: true },
        },
        shift: { select: { start: true, end: true } },
      },
      orderBy: {
        shift: { start: 'asc' },
      },
    });

    if (!nextBooking) return null;

    return {
      bookingId: nextBooking.id,
      studentName: nextBooking.student.name,
      studentAge: nextBooking.student.age,
      studentGrade: nextBooking.student.grade,
      studentSubject: nextBooking.student.subject,
      classStart: nextBooking.shift.start,
      classEnd: nextBooking.shift.end,
    };
  }

  // ─── Get My Earnings ──────────────────────────────────────────────────────

  async getMyEarnings(userId: string, page = 1, limit = 20) {
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { userId },
    });
    if (!teacher) throw new NotFoundException('Teacher profile not found.');

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where: {
          shift: { teacherId: teacher.id },
          paymentStatus: 'CAPTURED',
        },
        include: {
          student: { select: { name: true } },
          shift: { select: { start: true, end: true } },
          review: { select: { rating: true, comment: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.booking.count({
        where: {
          shift: { teacherId: teacher.id },
          paymentStatus: 'CAPTURED',
        },
      }),
    ]);

    const items = bookings.map((b) => {
      const grossCents = b.amountCents ?? 0;
      const teacherCents = Math.round(grossCents * 0.75);
      return {
        bookingId: b.id,
        classDate: b.shift.start,
        classEnd: b.shift.end,
        studentName: b.student.name,
        grossDollars: (grossCents / 100).toFixed(2),
        earningsDollars: (teacherCents / 100).toFixed(2),
        review: b.review
          ? { rating: b.review.rating, comment: b.review.comment }
          : null,
      };
    });

    const allBookings = await this.prisma.booking.findMany({
      where: {
        shift: { teacherId: teacher.id },
        paymentStatus: 'CAPTURED',
      },
      select: { amountCents: true },
    });
    const totalGrossCents = allBookings.reduce(
      (sum, b) => sum + (b.amountCents ?? 0),
      0,
    );
    const totalEarningsCents = Math.round(totalGrossCents * 0.75);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      summary: {
        totalCompletedClasses: total,
        totalGrossDollars: (totalGrossCents / 100).toFixed(2),
        totalEarningsDollars: (totalEarningsCents / 100).toFixed(2),
      },
    };
  }

  // ─── Get My Students ──────────────────────────────────────────────────────

  async getMyStudents(userId: string) {
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { userId },
    });
    if (!teacher) throw new NotFoundException('Teacher profile not found.');

    const bookings = await this.prisma.booking.findMany({
      where: {
        shift: { teacherId: teacher.id },
        paymentStatus: { in: ['PENDING', 'CAPTURED'] },
      },
      include: {
        student: {
          include: {
            parent: { select: { email: true } },
          },
        },
        shift: { select: { start: true, end: true } },
        review: { select: { rating: true, comment: true } },
      },
      orderBy: { shift: { start: 'asc' } },
    });

    const studentMap = new Map<
      string,
      {
        studentId: string;
        studentName: string;
        studentAge: number;
        studentGrade: string | null;
        studentSubject: string | null;
        parentEmail: string;
        totalClasses: number;
        completedClasses: number;
        pendingClasses: number;
        lastClassDate: Date | null;
        nextClassDate: Date | null;
        reviews: { rating: number; comment: string | null }[];
      }
    >();

    const now = new Date();

    for (const booking of bookings) {
      const sid = booking.student.id;

      if (!studentMap.has(sid)) {
        studentMap.set(sid, {
          studentId: sid,
          studentName: booking.student.name,
          studentAge: booking.student.age,
          studentGrade: (booking.student as any).grade ?? null,
          studentSubject: (booking.student as any).subject ?? null,
          parentEmail: booking.student.parent.email,
          totalClasses: 0,
          completedClasses: 0,
          pendingClasses: 0,
          lastClassDate: null,
          nextClassDate: null,
          reviews: [],
        });
      }

      const entry = studentMap.get(sid)!;
      entry.totalClasses++;

      const classStart = new Date(booking.shift.start);

      if (booking.paymentStatus === 'CAPTURED') {
        entry.completedClasses++;
        if (!entry.lastClassDate || classStart > entry.lastClassDate) {
          entry.lastClassDate = classStart;
        }
      } else if (classStart > now) {
        entry.pendingClasses++;
        if (!entry.nextClassDate || classStart < entry.nextClassDate) {
          entry.nextClassDate = classStart;
        }
      }

      if (booking.review) {
        entry.reviews.push(booking.review);
      }
    }

    return Array.from(studentMap.values())
      .map((s) => ({
        studentId: s.studentId,
        studentName: s.studentName,
        studentAge: s.studentAge,
        studentGrade: s.studentGrade,
        studentSubject: s.studentSubject,
        parentEmail: s.parentEmail,
        totalClasses: s.totalClasses,
        completedClasses: s.completedClasses,
        pendingClasses: s.pendingClasses,
        lastClassDate: s.lastClassDate,
        nextClassDate: s.nextClassDate,
        latestReview:
          s.reviews.length > 0 ? s.reviews[s.reviews.length - 1] : null,
      }))
      .sort((a, b) => {
        if (a.nextClassDate && b.nextClassDate) {
          return (
            new Date(a.nextClassDate).getTime() -
            new Date(b.nextClassDate).getTime()
          );
        }
        if (a.nextClassDate) return -1;
        if (b.nextClassDate) return 1;
        return 0;
      });
  }

  // ─── Get Public Profile ───────────────────────────────────────────────────

  async getPublicProfile(teacherId: string) {
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { id: teacherId },
      include: {
        user: { select: { fullName: true, createdAt: true } },
        reviews: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
          },
        },
        shifts: {
          where: { isBooked: false, start: { gt: new Date() } },
          orderBy: { start: 'asc' },
          take: 10,
        },
      },
    });

    if (!teacher) throw new NotFoundException('Teacher not found.');

    return {
      id: teacher.id,
      fullName: teacher.user.fullName,
      bio: teacher.bio,
      hourlyRate: teacher.hourlyRate,
      ratingAvg: teacher.ratingAvg,
      reviewCount: teacher.reviewCount,
      memberSince: teacher.user.createdAt,
      recentReviews: teacher.reviews,
      availableSlots: teacher.shifts,
    };
  }

  // ─── Leaderboard ──────────────────────────────────────────────────────────
  //
  // FIX: replaced groupBy({ by: ['shift'] }) with findMany + JS Map counter.
  // Prisma groupBy only accepts scalar fields on the queried model; 'shift'
  // is a relation on Booking, causing both a TS compile error and a runtime
  // error. The replacement is fully supported and identically behaved.

  async getLeaderboard(filter: 'all' | 'week' = 'all', limit = 50) {
    const orderByField =
      filter === 'week'
        ? { weeklyPoints: 'desc' as const }
        : { points: 'desc' as const };

    const profiles = await this.prisma.teacherProfile.findMany({
      where: { isSuspended: false },
      orderBy: orderByField,
      take: Math.min(limit, 50),
      include: {
        user: { select: { fullName: true, avatarUrl: true } },
      },
    });

    const teacherIds = profiles.map((p) => p.id);

    // FIXED: findMany with relational select — Prisma fully supports this.
    // groupBy on a relation field ('shift') is not supported and caused errors.
    const capturedBookings = await this.prisma.booking.findMany({
      where: {
        shift: { teacherId: { in: teacherIds } },
        paymentStatus: 'CAPTURED',
      },
      select: {
        shift: { select: { teacherId: true } },
      },
    });

    // Count per teacher in a single O(n) pass
    const completedByTeacher = new Map<string, number>();
    for (const booking of capturedBookings) {
      const tid = booking.shift.teacherId;
      completedByTeacher.set(tid, (completedByTeacher.get(tid) ?? 0) + 1);
    }

    const teachers = profiles.map((p, idx) => {
      const pts = filter === 'week' ? (p.weeklyPoints ?? 0) : (p.points ?? 0);
      const badge = getBadgeTier(p.points ?? 0);

      return {
        rank: idx + 1,
        teacherId: p.id,
        name: p.user.fullName,
        avatarUrl: p.user.avatarUrl,
        points: pts,
        allTimePoints: p.points ?? 0,
        weeklyPoints: p.weeklyPoints ?? 0,
        classesCompleted: completedByTeacher.get(p.id) ?? 0,
        ratingAvg: p.ratingAvg,
        reviewCount: p.reviewCount,
        badge,
      };
    });

    return {
      teachers,
      tiers: BADGE_TIERS,
    };
  }

  // ─── Get Student Snapshot ─────────────────────────────────────────────────
  //
  // Read-only side-panel summary for teacher viewing a single student.

  async getStudentSnapshot(teacherUserId: string, studentId: string) {
    const profile = await this.prisma.teacherProfile.findUnique({
      where: { userId: teacherUserId },
    });
    if (!profile) throw new NotFoundException('Teacher profile not found');

    const relationship = await this.prisma.booking.findFirst({
      where: {
        studentId,
        shift: { teacherId: profile.id },
        paymentStatus: 'CAPTURED',
      },
    });
    if (!relationship) {
      throw new ForbiddenException(
        'No completed class relationship with this student',
      );
    }

    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        parent: { select: { fullName: true, email: true } },
        bookings: {
          where: { shift: { teacherId: profile.id } },
          include: {
            shift: true,
            review: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });
    if (!student) throw new NotFoundException('Student not found');

    const completed = student.bookings.filter(
      (b) => b.paymentStatus === 'CAPTURED',
    );
    const upcoming = completed.filter((b) => b.shift.start > new Date());
    const ratings = completed.filter((b) => b.review);
    const avgRating =
      ratings.length > 0
        ? ratings.reduce((s, b) => s + b.review!.rating, 0) / ratings.length
        : null;

    return {
      student: { id: student.id, name: student.name, age: student.age },
      parentName: student.parent.fullName,
      stats: {
        totalClasses: completed.filter((b) => b.shift.end <= new Date()).length,
        upcomingClasses: upcoming.length,
        averageRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
      },
      recentBookings: completed
        .filter((b) => b.shift.end <= new Date())
        .slice(0, 10)
        .map((b) => ({
          id: b.id,
          start: b.shift.start,
          end: b.shift.end,
          rating: b.review?.rating ?? null,
          comment: b.review?.comment ?? null,
        })),
      nextClass: upcoming[0]
        ? {
            start: upcoming[0].shift.start,
            end: upcoming[0].shift.end,
            bookingId: upcoming[0].id,
          }
        : null,
    };
  }

  // ─── Get Student Dashboard (Teacher View) ─────────────────────────────────
  //
  // Issue 10 — Teacher "Login as Student":
  //   Returns a full dashboard payload shaped to match what
  //   student-dashboard/[studentId]/page.tsx expects, so the same UI works
  //   for both PARENT and TEACHER viewers without a separate page.
  //
  // Authorization guard (inline):
  //   The teacher must have at least one PENDING or CAPTURED booking with
  //   this student. No relationship → 403 Forbidden.

  async getStudentDashboardForTeacher(
    teacherUserId: string,
    studentId: string,
  ) {
    // 1. Resolve teacher profile
    const profile = await this.prisma.teacherProfile.findUnique({
      where: { userId: teacherUserId },
      include: { user: { select: { fullName: true, avatarUrl: true } } },
    });
    if (!profile) throw new NotFoundException('Teacher profile not found');

    // 2. Authorization guard
    const relationship = await this.prisma.booking.findFirst({
      where: {
        studentId,
        shift: { teacherId: profile.id },
        paymentStatus: { in: ['PENDING', 'CAPTURED'] },
      },
    });
    if (!relationship) {
      throw new ForbiddenException(
        'You have no class relationship with this student.',
      );
    }

    // 3. Load student record
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        parent: { select: { fullName: true, email: true } },
      },
    });
    if (!student) throw new NotFoundException('Student not found');

    // 4. Load all bookings between this teacher and student
    const bookings = await this.prisma.booking.findMany({
      where: {
        studentId,
        shift: { teacherId: profile.id },
      },
      include: {
        shift: { select: { start: true, end: true } },
        review: { select: { rating: true, comment: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 5. Compute stats
    const now = new Date();
    const completed = bookings.filter(
      (b) => b.paymentStatus === 'CAPTURED' && new Date(b.shift.end) < now,
    );
    const upcoming = bookings.filter(
      (b) =>
        new Date(b.shift.start) > now &&
        b.paymentStatus !== 'REFUNDED' &&
        b.paymentStatus !== 'FAILED',
    );
    const hoursLearned = completed.reduce((sum, b) => {
      const ms =
        new Date(b.shift.end).getTime() - new Date(b.shift.start).getTime();
      return sum + ms / 3_600_000;
    }, 0);
    const ratings = completed.filter((b) => b.review);
    const avgRating =
      ratings.length > 0
        ? ratings.reduce((s, b) => s + b.review!.rating, 0) / ratings.length
        : null;

    // 6. Return payload shaped to match student-dashboard page state
    return {
      student: {
        id: student.id,
        name: student.name,
        age: student.age,
        grade: (student as any).grade ?? null,
        subject: (student as any).subject ?? null,
        avatarUrl: (student as any).avatarUrl ?? null,
      },
      parentInfo: {
        fullName: student.parent.fullName,
        email: student.parent.email,
      },
      // Tells the frontend this is a read-only teacher-view session
      viewingTeacher: {
        id: profile.id,
        fullName: profile.user.fullName,
        avatarUrl: profile.user.avatarUrl,
      },
      stats: {
        total: bookings.length,
        completed: completed.length,
        upcoming: upcoming.length,
        hoursLearned: Math.round(hoursLearned * 10) / 10,
      },
      avgRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
      bookings: bookings.map((b) => ({
        id: b.id,
        paymentStatus: b.paymentStatus,
        shift: { start: b.shift.start, end: b.shift.end },
        teacher: {
          fullName: profile.user.fullName,
          avatarUrl: profile.user.avatarUrl,
        },
        review: b.review ?? null,
      })),
    };
  }

  // ─── Get My Rank ──────────────────────────────────────────────────────────

  async getMyRank(userId: string) {
    const profile = await this.prisma.teacherProfile.findUnique({
      where: { userId },
      select: { points: true, weeklyPoints: true, rankTier: true },
    });
    if (!profile) throw new NotFoundException('Profile not found');

    const THRESHOLDS = BADGE_TIERS.map((t) => t.minPts);

    const tier = Math.min(profile.rankTier, 5);
    const nextThreshold = THRESHOLDS[tier + 1] ?? THRESHOLDS[5];
    const prevThreshold = THRESHOLDS[tier] ?? 0;
    const progressPercent =
      tier >= 5
        ? 100
        : Math.round(
            ((profile.points - prevThreshold) /
              (nextThreshold - prevThreshold)) *
              100,
          );

    const badge = getBadgeTier(profile.points ?? 0);

    return {
      points: profile.points ?? 0,
      weeklyPoints: profile.weeklyPoints ?? 0,
      rankTier: tier,
      rankName: badge.label,
      rankIcon: badge.icon,
      badge,
      pointsToNext: Math.max(0, nextThreshold - (profile.points ?? 0)),
      progressPercent: Math.min(100, Math.max(0, progressPercent)),
    };
  }
}
