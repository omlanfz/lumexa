// FILE PATH: server/src/teachers/teachers.service.ts
// ACTION: REPLACE the existing file entirely.
// NOTE: getMyStudents() was already implemented — kept exactly as-is.
// ADDED: getLeaderboard() method at the bottom.

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';

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
  // Already implemented — kept exactly as provided.

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
  // Returns top N teachers ranked by review count and rating (proxy for points
  // until gamification system is implemented in Phase B).

  async getLeaderboard(limit: number) {
    const profiles = await this.prisma.teacherProfile.findMany({
      where: { isSuspended: false },
      orderBy: { points: 'desc' },
      take: Math.min(limit, 50),
      include: { user: { select: { fullName: true, avatarUrl: true } } },
    });

    const NAMES = [
      'Cadet',
      'Navigator',
      'Pilot',
      'Commander',
      'Admiral',
      'Starmaster',
    ];
    const ICONS = ['🌱', '🧭', '✈️', '🎖️', '⭐', '🌟'];

    return profiles.map((p, idx) => ({
      rank: idx + 1,
      teacherId: p.id,
      name: p.user.fullName,
      avatarUrl: p.user.avatarUrl,
      points: p.points ?? 0,
      weeklyPoints: p.weeklyPoints ?? 0,
      rankTier: Math.min(p.rankTier, 5),
      rankName: NAMES[Math.min(p.rankTier, 5)],
      rankIcon: ICONS[Math.min(p.rankTier, 5)],
      ratingAvg: p.ratingAvg,
      reviewCount: p.reviewCount,
    }));
  }

  async getStudentSnapshot(teacherUserId: string, studentId: string) {
    const profile = await this.prisma.teacherProfile.findUnique({
      where: { userId: teacherUserId },
    });
    if (!profile) throw new NotFoundException('Teacher profile not found');

    // Verify this teacher has at least one booking with this student
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
          teacherName: '', // teacher is always this teacher in this context
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

  async getMyRank(userId: string) {
    const profile = await this.prisma.teacherProfile.findUnique({
      where: { userId },
      select: { points: true, weeklyPoints: true, rankTier: true },
    });
    if (!profile) throw new NotFoundException('Profile not found');

    const THRESHOLDS = [0, 1000, 5000, 15000, 40000, 100000];
    const NAMES = [
      'Cadet',
      'Navigator',
      'Pilot',
      'Commander',
      'Admiral',
      'Starmaster',
    ];
    const ICONS = ['🌱', '🧭', '✈️', '🎖️', '⭐', '🌟'];

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

    return {
      points: profile.points ?? 0,
      weeklyPoints: profile.weeklyPoints ?? 0,
      rankTier: tier,
      rankName: NAMES[tier],
      rankIcon: ICONS[tier],
      pointsToNext: Math.max(0, nextThreshold - (profile.points ?? 0)),
      progressPercent: Math.min(100, Math.max(0, progressPercent)),
    };
  }
}
