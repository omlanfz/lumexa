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
        studentUser: {
          select: { fullName: true },
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
      studentName:
        nextBooking.student?.name ??
        nextBooking.studentUser?.fullName ??
        'Student',
      studentAge: nextBooking.student?.age ?? null,
      studentGrade: nextBooking.student?.grade ?? null,
      studentSubject: nextBooking.student?.subject ?? null,
      start: nextBooking.shift.start,
      end: nextBooking.shift.end,
      msUntilStart: Math.max(
        0,
        nextBooking.shift.start.getTime() - Date.now(),
      ),
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
          studentUser: { select: { fullName: true } },
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
        studentName: b.student?.name ?? b.studentUser?.fullName ?? 'Student',
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

  // ─── Get My Students (unified: legacy Student + STUDENT-role users) ─────────

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
        student: { include: { parent: { select: { email: true } } } },
        studentUser: {
          select: {
            id: true, fullName: true, avatarUrl: true, age: true,
            grade: true, spaceRank: true, totalSessions: true,
          },
        },
        shift: { select: { start: true, end: true } },
        review: { select: { rating: true, comment: true } },
      },
      orderBy: { shift: { start: 'asc' } },
    });

    type Entry = {
      studentId: string;
      isUserRef: boolean;
      studentName: string;
      studentAge: number | null;
      studentGrade: string | null;
      avatarUrl: string | null;
      spaceRank: string | null;
      totalSessions: number;
      totalClasses: number;
      completedClasses: number;
      pendingClasses: number;
      lastClassDate: Date | null;
      nextClassDate: Date | null;
      reviews: { rating: number; comment: string | null }[];
    };

    const studentMap = new Map<string, Entry>();
    const now = new Date();

    for (const booking of bookings) {
      const isUserRef = !!booking.studentUserId;
      const key = isUserRef
        ? `user:${booking.studentUserId}`
        : `student:${booking.studentId}`;

      if (!studentMap.has(key)) {
        if (isUserRef && booking.studentUser) {
          const u = booking.studentUser;
          studentMap.set(key, {
            studentId: u.id,
            isUserRef: true,
            studentName: u.fullName,
            studentAge: u.age,
            studentGrade: u.grade,
            avatarUrl: u.avatarUrl ?? null,
            spaceRank: u.spaceRank,
            totalSessions: u.totalSessions,
            totalClasses: 0, completedClasses: 0, pendingClasses: 0,
            lastClassDate: null, nextClassDate: null, reviews: [],
          });
        } else if (!isUserRef && booking.student) {
          const s = booking.student;
          studentMap.set(key, {
            studentId: s.id,
            isUserRef: false,
            studentName: s.name,
            studentAge: s.age,
            studentGrade: (s as any).grade ?? null,
            avatarUrl: (s as any).avatarUrl ?? null,
            spaceRank: null,
            totalSessions: 0,
            totalClasses: 0, completedClasses: 0, pendingClasses: 0,
            lastClassDate: null, nextClassDate: null, reviews: [],
          });
        } else continue;
      }

      const entry = studentMap.get(key)!;
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

      if (booking.review) entry.reviews.push(booking.review);
    }

    return Array.from(studentMap.values())
      .map((s) => ({
        studentId: s.studentId,
        isUserRef: s.isUserRef,
        studentName: s.studentName,
        studentAge: s.studentAge,
        studentGrade: s.studentGrade,
        avatarUrl: s.avatarUrl,
        spaceRank: s.spaceRank,
        totalSessions: s.totalSessions,
        totalClasses: s.totalClasses,
        completedClasses: s.completedClasses,
        pendingClasses: s.pendingClasses,
        lastClassDate: s.lastClassDate,
        nextClassDate: s.nextClassDate,
        latestReview: s.reviews.length > 0 ? s.reviews[s.reviews.length - 1] : null,
      }))
      .sort((a, b) => {
        if (a.nextClassDate && b.nextClassDate) {
          return new Date(a.nextClassDate).getTime() - new Date(b.nextClassDate).getTime();
        }
        if (a.nextClassDate) return -1;
        if (b.nextClassDate) return 1;
        return 0;
      });
  }

  // ─── Teacher Student Notes ─────────────────────────────────────────────────

  async addStudentNote(
    teacherUserId: string,
    studentId: string,
    isUserRef: boolean,
    note: string,
  ) {
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { userId: teacherUserId },
    });
    if (!teacher) throw new NotFoundException('Teacher profile not found.');

    return this.prisma.teacherStudentNote.create({
      data: { teacherId: teacher.id, studentId, isUserRef, note },
      select: { id: true, note: true, createdAt: true },
    });
  }

  async getStudentNotes(
    teacherUserId: string,
    studentId: string,
    isUserRef: boolean,
  ) {
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { userId: teacherUserId },
    });
    if (!teacher) throw new NotFoundException('Teacher profile not found.');

    return this.prisma.teacherStudentNote.findMany({
      where: { teacherId: teacher.id, studentId, isUserRef },
      orderBy: { createdAt: 'desc' },
      select: { id: true, note: true, createdAt: true },
    });
  }

  // ─── Teacher Insights ──────────────────────────────────────────────────────

  async getTeacherInsights(userId: string) {
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { userId },
      select: { id: true, reviewCount: true },
    });
    if (!teacher) throw new NotFoundException('Teacher profile not found.');

    if (teacher.reviewCount < 5) {
      return {
        insufficient: true,
        reviewCount: teacher.reviewCount,
        message: `Insights unlock after 5 reviews. You have ${teacher.reviewCount} so far.`,
      };
    }

    const now = new Date();
    const eightWeeksAgo = new Date(now.getTime() - 56 * 24 * 60 * 60 * 1000);

    const [allReviews, allBookings] = await Promise.all([
      this.prisma.review.findMany({
        where: { teacherId: teacher.id },
        select: { rating: true, comment: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.booking.findMany({
        where: { shift: { teacherId: teacher.id } },
        select: { paymentStatus: true, shift: { select: { start: true, end: true } } },
      }),
    ]);

    // Rating trend — group by ISO week, last 8 weeks
    const weeklyRatings = new Map<string, number[]>();
    for (const r of allReviews) {
      if (new Date(r.createdAt) < eightWeeksAgo) continue;
      const d = new Date(r.createdAt);
      const weekStart = new Date(d.setDate(d.getDate() - d.getDay()));
      const key = weekStart.toISOString().slice(0, 10);
      if (!weeklyRatings.has(key)) weeklyRatings.set(key, []);
      weeklyRatings.get(key)!.push(r.rating);
    }
    const ratingTrend = Array.from(weeklyRatings.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, ratings]) => ({
        week,
        avg: Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) / 10,
        count: ratings.length,
      }));

    // Word frequency from comments
    const stopWords = new Set(['the', 'a', 'an', 'is', 'was', 'very', 'and', 'or', 'to', 'of', 'in', 'my', 'he', 'she', 'we', 'her', 'his', 'with', 'it', 'that', 'are', 'for', 'this', 'but', 'at', 'be', 'has', 'had', 'by', 'on']);
    const wordFreq = new Map<string, number>();
    for (const r of allReviews) {
      if (!r.comment) continue;
      const words = r.comment.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/);
      for (const w of words) {
        if (w.length < 3 || stopWords.has(w)) continue;
        wordFreq.set(w, (wordFreq.get(w) ?? 0) + 1);
      }
    }
    const topWords = Array.from(wordFreq.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15)
      .map(([word, count]) => ({ word, count }));

    // Top 3 positive quotes
    const topQuotes = allReviews
      .filter((r) => r.rating >= 4 && r.comment && r.comment.length > 20)
      .slice(0, 3)
      .map((r) => ({ rating: r.rating, comment: r.comment!, date: r.createdAt }));

    // Session completion rate
    const total = allBookings.length;
    const captured = allBookings.filter((b) => b.paymentStatus === 'CAPTURED').length;
    const completionRate = total > 0 ? Math.round((captured / total) * 100) : 0;

    // Busiest day of week
    const dayCount = [0, 0, 0, 0, 0, 0, 0];
    for (const b of allBookings) {
      if (b.paymentStatus === 'CAPTURED') {
        dayCount[new Date(b.shift.start).getDay()]++;
      }
    }
    const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const busiestDayIdx = dayCount.indexOf(Math.max(...dayCount));

    return {
      insufficient: false,
      ratingTrend,
      topWords,
      topQuotes,
      completionRate,
      busiestDay: DAYS[busiestDayIdx],
      busiestDayCount: dayCount[busiestDayIdx],
      totalReviews: allReviews.length,
      totalSessions: captured,
    };
  }

  // ─── Monthly earnings (last 6 months bar chart) ────────────────────────────

  async getMonthlyEarnings(userId: string) {
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { userId },
    });
    if (!teacher) throw new NotFoundException('Teacher profile not found.');

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const bookings = await this.prisma.booking.findMany({
      where: {
        shift: { teacherId: teacher.id },
        paymentStatus: 'CAPTURED',
        createdAt: { gte: sixMonthsAgo },
      },
      select: { amountCents: true, shift: { select: { start: true } } },
    });

    const monthMap = new Map<string, { grossCents: number; sessions: number }>();

    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthMap.set(key, { grossCents: 0, sessions: 0 });
    }

    for (const b of bookings) {
      const d = new Date(b.shift.start);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const entry = monthMap.get(key);
      if (entry) {
        entry.grossCents += b.amountCents ?? 0;
        entry.sessions++;
      }
    }

    const months = Array.from(monthMap.entries()).map(([key, val]) => {
      const [year, month] = key.split('-').map(Number);
      const label = new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'short', year: '2-digit' });
      return {
        key,
        label,
        earningsCents: Math.round(val.grossCents * 0.75),
        sessions: val.sessions,
      };
    });

    const lastTwo = months.slice(-2);
    const trend =
      lastTwo.length === 2 && lastTwo[0].earningsCents > 0
        ? Math.round(((lastTwo[1].earningsCents - lastTwo[0].earningsCents) / lastTwo[0].earningsCents) * 100)
        : null;

    return { months, trend };
  }

  // ─── Get Teacher Action Queue ──────────────────────────────────────────────

  async getActionQueue(userId: string) {
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { userId },
    });
    if (!teacher) throw new NotFoundException('Teacher profile not found.');

    const now = new Date();

    const [rescheduleRequests, cancellation] = await Promise.all([
      this.prisma.rescheduleRequest.findMany({
        where: { booking: { shift: { teacherId: teacher.id } }, status: 'PENDING' },
        include: {
          booking: {
            include: {
              student: { select: { name: true } },
              studentUser: { select: { fullName: true } },
              shift: { select: { start: true, end: true } },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.teacherCancellation.findFirst({
        where: { teacherId: teacher.id, month: now.getMonth() + 1, year: now.getFullYear() },
      }),
    ]);

    return {
      rescheduleRequests: rescheduleRequests.map((r) => ({
        id: r.id,
        bookingId: r.bookingId,
        studentName: r.booking.studentUser?.fullName ?? r.booking.student?.name ?? 'Student',
        currentStart: r.booking.shift.start,
        proposedStart: r.newStart,
        proposedEnd: r.newEnd,
        reason: r.reason,
        createdAt: r.createdAt,
      })),
      monthlyCancel: {
        count: cancellation?.count ?? 0,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
      },
    };
  }

  async acceptReschedule(teacherUserId: string, requestId: string) {
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { userId: teacherUserId },
    });
    if (!teacher) throw new NotFoundException('Teacher profile not found.');

    const request = await this.prisma.rescheduleRequest.findUnique({
      where: { id: requestId },
      include: { booking: { include: { shift: true } } },
    });
    if (!request) throw new NotFoundException('Request not found.');
    if (request.booking.shift.teacherId !== teacher.id) {
      throw new ForbiddenException('Not your booking.');
    }

    await this.prisma.$transaction([
      this.prisma.shift.update({
        where: { id: request.booking.shiftId },
        data: { start: request.newStart, end: request.newEnd },
      }),
      this.prisma.rescheduleRequest.update({
        where: { id: requestId },
        data: { status: 'ACCEPTED' },
      }),
    ]);

    return { success: true };
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
