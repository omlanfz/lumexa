import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  constructor(private prisma: PrismaService) {}

  // ─── Create student ────────────────────────────────────────────────────────

  async create(userId: string, dto: CreateStudentDto) {
    return this.prisma.student.create({
      data: {
        parentId: userId,
        name: dto.name,
        age: dto.age,
      },
    });
  }

  // ─── List all students for a parent ────────────────────────────────────────

  async findAllForParent(userId: string) {
    return this.prisma.student.findMany({
      where: { parentId: userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ─── Student dashboard data ────────────────────────────────────────────────
  // Returns all data needed for the student hub page.
  // Parent must own the student — returns 403 otherwise.

  async getStudentDashboard(studentId: string, parentId: string) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, parentId },
    });
    if (!student) throw new NotFoundException('Student not found.');

    const now = new Date();

    // Fetch all non-refunded bookings for this student
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

  // ─── Student bookings (lesson history) ────────────────────────────────────
  // Paginated list of all bookings for a student.
  // Parent must own the student.

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

    // Build where clause based on filter
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
        where: {
          studentId,
          ...statusFilter,
          shift: shiftFilter,
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
        orderBy: { shift: { start: filter === 'upcoming' ? 'asc' : 'desc' } },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.booking.count({
        where: {
          studentId,
          ...statusFilter,
          shift: shiftFilter,
        },
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

  // ─── Student leaderboard ───────────────────────────────────────────────────
  // Returns all students ranked by completed classes.
  // Accessible by any parent.

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

    // If current student has 0 classes they're at the bottom, mark them
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
}
