import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { StripeService } from '../payments/stripe.service';
import { AuditService } from '../audit/audit.service';
import { PayoutsService } from '../payouts/payouts.service';

const TEACHER_LIST_SELECT = {
  id: true,
  bio: true,
  hourlyRate: true,
  isSuspended: true,
  strikes: true,
  ratingAvg: true,
  reviewCount: true,
  subjects: true,
  docsLocked: true,
  payoutLocked: true,
  createdAt: true,
  user: {
    select: { fullName: true, email: true, createdAt: true, avatarUrl: true },
  },
  _count: { select: { shifts: true, rescheduleRequests: true } },
} as const;

function dayRange(dateStr?: string) {
  const base = dateStr ? new Date(dateStr) : new Date();
  const start = new Date(base);
  start.setHours(0, 0, 0, 0);
  const end = new Date(base);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function monthRange(month: number, year: number) {
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private stripe: StripeService,
    private audit: AuditService,
    private payouts: PayoutsService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════
  // Dashboard
  // ═══════════════════════════════════════════════════════════════════════

  async getDashboardSummary() {
    const now = new Date();
    const { start: todayStart, end: todayEnd } = dayRange();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const { start: monthStart, end: monthEnd } = monthRange(month, year);

    const [
      todayClasses,
      pendingReschedules,
      activeTeachers,
      activeStudents,
      monthRevenue,
      monthPayouts,
    ] = await Promise.all([
      this.prisma.booking.count({
        where: {
          paymentStatus: { in: ['PENDING', 'CAPTURED'] },
          shift: { start: { gte: todayStart, lte: todayEnd } },
        },
      }),
      this.prisma.rescheduleRequest.count({
        where: { penaltyStatus: 'PENDING_PENALTY_REVIEW' },
      }),
      this.prisma.teacherProfile.count({ where: { isSuspended: false } }),
      this.prisma.user.count({
        where: { role: 'STUDENT', accountStatus: 'ACTIVE' },
      }),
      this.prisma.booking.aggregate({
        _sum: { amountCents: true },
        where: {
          paymentStatus: 'CAPTURED',
          shift: { start: { gte: monthStart, lte: monthEnd } },
        },
      }),
      this.prisma.payoutEntry.aggregate({
        _sum: { amountCents: true },
        where: { month, year },
      }),
    ]);

    return {
      todayClasses,
      pendingReschedules,
      activeTeachers,
      activeStudents,
      monthRevenueCents: monthRevenue._sum.amountCents ?? 0,
      monthPayoutsCents: monthPayouts._sum.amountCents ?? 0,
      month,
      year,
    };
  }

  async getPlatformStats() {
    const [
      totalBookings,
      completedBookings,
      totalTeachers,
      activeTeachers,
      totalRevenueCents,
    ] = await Promise.all([
      this.prisma.booking.count(),
      this.prisma.booking.count({ where: { paymentStatus: 'CAPTURED' } }),
      this.prisma.teacherProfile.count(),
      this.prisma.teacherProfile.count({ where: { isSuspended: false } }),
      this.prisma.booking.aggregate({
        _sum: { amountCents: true },
        where: { paymentStatus: 'CAPTURED' },
      }),
    ]);

    const grossRevenue = totalRevenueCents._sum.amountCents ?? 0;
    const platformRevenue = Math.round(grossRevenue * 0.25); // 25% fee

    return {
      totalBookings,
      completedBookings,
      totalTeachers,
      activeTeachers,
      grossRevenueDollars: (grossRevenue / 100).toFixed(2),
      platformRevenueDollars: (platformRevenue / 100).toFixed(2),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Classes / bookings — the Operations workspace
  // ═══════════════════════════════════════════════════════════════════════

  private buildBookingWhere(filters: {
    date?: string;
    status?: string;
    teacherId?: string;
    studentUserId?: string;
    courseId?: string;
  }): any {
    const where: any = {};

    if (filters.date) {
      const { start, end } = dayRange(filters.date);
      where.shift = { ...(where.shift ?? {}), start: { gte: start, lte: end } };
    }
    if (filters.teacherId) {
      where.shift = { ...(where.shift ?? {}), teacherId: filters.teacherId };
    }
    if (filters.studentUserId) {
      where.studentUserId = filters.studentUserId;
    }
    if (filters.courseId) {
      where.studentUser = { assignedCourseId: filters.courseId };
    }

    const now = new Date();
    switch (filters.status) {
      case 'NEEDS_REVIEW':
        where.rescheduleRequests = {
          some: { penaltyStatus: 'PENDING_PENALTY_REVIEW' },
        };
        break;
      case 'PENDING':
        where.paymentStatus = 'PENDING';
        break;
      case 'FAILED':
        where.paymentStatus = 'FAILED';
        break;
      case 'SCHEDULED':
        where.paymentStatus = 'CAPTURED';
        where.shift = { ...(where.shift ?? {}), end: { gt: now } };
        break;
      case 'COMPLETED':
        where.paymentStatus = 'CAPTURED';
        where.shift = { ...(where.shift ?? {}), end: { lte: now } };
        break;
      case 'CANCELLED':
        where.paymentStatus = 'REFUNDED';
        where.rescheduleRequests = { some: { action: 'CANCEL' } };
        break;
      case 'REFUNDED':
        where.paymentStatus = 'REFUNDED';
        where.rescheduleRequests = { none: { action: 'CANCEL' } };
        break;
      default:
        break;
    }

    return where;
  }

  private computeDisplayStatus(booking: {
    paymentStatus: string;
    shift: { end: Date };
    rescheduleRequests: { action: string; penaltyStatus: string }[];
  }): string {
    if (
      booking.rescheduleRequests.some(
        (r) => r.penaltyStatus === 'PENDING_PENALTY_REVIEW',
      )
    ) {
      return 'NEEDS_REVIEW';
    }
    if (booking.paymentStatus === 'REFUNDED') {
      return booking.rescheduleRequests.some((r) => r.action === 'CANCEL')
        ? 'CANCELLED'
        : 'REFUNDED';
    }
    if (booking.paymentStatus === 'FAILED') return 'FAILED';
    if (booking.paymentStatus === 'PENDING') return 'PENDING';
    return new Date(booking.shift.end) <= new Date()
      ? 'COMPLETED'
      : 'SCHEDULED';
  }

  async getAllBookings(
    page = 1,
    limit = 20,
    filters: {
      date?: string;
      status?: string;
      teacherId?: string;
      studentUserId?: string;
      courseId?: string;
    } = {},
  ) {
    const where = this.buildBookingWhere(filters);

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: {
          student: {
            include: { parent: { select: { email: true, fullName: true } } },
          },
          studentUser: {
            select: {
              id: true,
              fullName: true,
              email: true,
              assignedCourse: { select: { id: true, title: true } },
            },
          },
          shift: {
            include: {
              teacher: {
                include: { user: { select: { email: true, fullName: true } } },
              },
            },
          },
          rescheduleRequests: {
            select: { action: true, penaltyStatus: true },
          },
          review: { select: { rating: true } },
        },
        orderBy: { shift: { start: 'desc' } },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      bookings: bookings.map((b) => ({
        ...b,
        displayStatus: this.computeDisplayStatus(b as any),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getBookingDetail(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        student: {
          include: { parent: { select: { email: true, fullName: true } } },
        },
        studentUser: {
          select: {
            id: true,
            fullName: true,
            email: true,
            assignedCourse: { select: { id: true, title: true } },
          },
        },
        shift: {
          include: {
            teacher: {
              include: { user: { select: { email: true, fullName: true } } },
            },
          },
        },
        rescheduleRequests: { orderBy: { createdAt: 'desc' } },
        review: true,
        payoutEntries: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!booking) throw new NotFoundException('Booking not found.');

    return {
      ...booking,
      displayStatus: this.computeDisplayStatus(booking as any),
    };
  }

  async issueManualRefund(
    bookingId: string,
    refundCents: number,
    adminUserId: string,
    reason: string,
  ) {
    if (!reason?.trim()) {
      throw new BadRequestException('A reason is required to issue a refund.');
    }
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) throw new NotFoundException('Booking not found.');
    if (!booking.paymentIntentId) {
      throw new NotFoundException('No payment found for this booking.');
    }

    await this.stripe.refundPartial(booking.paymentIntentId, refundCents);

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { paymentStatus: 'REFUNDED' },
    });

    await this.audit.log({
      actorId: adminUserId,
      actorRole: 'ADMIN',
      action: 'REFUND_ISSUED',
      entityType: 'Booking',
      entityId: bookingId,
      reason,
      afterData: { refundCents },
    });

    return updated;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Teachers
  // ═══════════════════════════════════════════════════════════════════════

  async getAllTeachers(page = 1, limit = 20, status?: string, search?: string) {
    const where: any =
      status === 'SUSPENDED'
        ? { isSuspended: true }
        : status === 'ACTIVE'
          ? { isSuspended: false }
          : {};
    if (search?.trim()) {
      where.user = {
        OR: [
          { fullName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [teachers, total] = await Promise.all([
      this.prisma.teacherProfile.findMany({
        where,
        select: TEACHER_LIST_SELECT,
        orderBy: { user: { createdAt: 'desc' } },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.teacherProfile.count({ where }),
    ]);

    return {
      teachers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getTeacherDetail(teacherId: string) {
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { id: teacherId },
      include: {
        user: {
          select: {
            fullName: true,
            email: true,
            avatarUrl: true,
            createdAt: true,
          },
        },
      },
    });
    if (!teacher) throw new NotFoundException('Teacher not found.');

    const [assignedStudents, upcomingShifts, ledgerSummary, auditHistory] =
      await Promise.all([
        this.prisma.user.findMany({
          where: { assignedTeacherId: teacherId },
          select: {
            id: true,
            fullName: true,
            email: true,
            avatarUrl: true,
            accountStatus: true,
            assignedCourse: { select: { id: true, title: true } },
          },
        }),
        this.prisma.shift.findMany({
          where: { teacherId, start: { gte: new Date() } },
          orderBy: { start: 'asc' },
          take: 50,
          include: {
            booking: {
              select: {
                id: true,
                paymentStatus: true,
                studentUser: { select: { fullName: true } },
                student: { select: { name: true } },
              },
            },
          },
        }),
        this.payouts.getSummary(teacherId),
        this.audit.getHistory('TeacherProfile', teacherId),
      ]);

    return {
      ...teacher,
      assignedStudents,
      upcomingShifts,
      earningsSummary: ledgerSummary,
      auditHistory,
    };
  }

  async suspendTeacher(teacherId: string, reason: string, adminUserId: string) {
    if (!reason?.trim()) {
      throw new BadRequestException(
        'A reason is required to suspend a teacher.',
      );
    }
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { id: teacherId },
    });
    if (!teacher) throw new NotFoundException('Teacher not found.');

    const updated = await this.prisma.teacherProfile.update({
      where: { id: teacherId },
      data: { isSuspended: true },
    });

    await this.audit.log({
      actorId: adminUserId,
      actorRole: 'ADMIN',
      action: 'TEACHER_SUSPENDED',
      entityType: 'TeacherProfile',
      entityId: teacherId,
      reason,
      beforeData: { isSuspended: teacher.isSuspended },
      afterData: { isSuspended: true },
    });

    return updated;
  }

  async reinstateTeacher(teacherId: string, adminUserId: string) {
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { id: teacherId },
    });
    if (!teacher) throw new NotFoundException('Teacher not found.');

    const updated = await this.prisma.teacherProfile.update({
      where: { id: teacherId },
      data: { isSuspended: false },
    });

    await this.audit.log({
      actorId: adminUserId,
      actorRole: 'ADMIN',
      action: 'TEACHER_REINSTATED',
      entityType: 'TeacherProfile',
      entityId: teacherId,
      beforeData: { isSuspended: teacher.isSuspended },
      afterData: { isSuspended: false },
    });

    return updated;
  }

  async resetTeacherStrikes(teacherId: string, adminUserId: string) {
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { id: teacherId },
    });
    if (!teacher) throw new NotFoundException('Teacher not found.');

    const updated = await this.prisma.teacherProfile.update({
      where: { id: teacherId },
      data: { strikes: 0 },
    });

    await this.audit.log({
      actorId: adminUserId,
      actorRole: 'ADMIN',
      action: 'TEACHER_STRIKES_RESET',
      entityType: 'TeacherProfile',
      entityId: teacherId,
      beforeData: { strikes: teacher.strikes },
      afterData: { strikes: 0 },
    });

    return updated;
  }

  async setDocsLocked(teacherId: string, locked: boolean, adminUserId: string) {
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { id: teacherId },
    });
    if (!teacher) throw new NotFoundException('Teacher not found.');

    const updated = await this.prisma.teacherProfile.update({
      where: { id: teacherId },
      data: { docsLocked: locked },
    });

    await this.audit.log({
      actorId: adminUserId,
      actorRole: 'ADMIN',
      action: locked ? 'TEACHER_DOCS_LOCKED' : 'TEACHER_DOCS_UNLOCKED',
      entityType: 'TeacherProfile',
      entityId: teacherId,
    });

    return updated;
  }

  async setPayoutLocked(
    teacherId: string,
    locked: boolean,
    adminUserId: string,
  ) {
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { id: teacherId },
    });
    if (!teacher) throw new NotFoundException('Teacher not found.');

    const updated = await this.prisma.teacherProfile.update({
      where: { id: teacherId },
      data: { payoutLocked: locked },
    });

    await this.audit.log({
      actorId: adminUserId,
      actorRole: 'ADMIN',
      action: locked ? 'TEACHER_PAYOUT_LOCKED' : 'TEACHER_PAYOUT_UNLOCKED',
      entityType: 'TeacherProfile',
      entityId: teacherId,
    });

    return updated;
  }

  async getBookingRecordingUrl(
    bookingId: string,
  ): Promise<{ recordingUrl: string | null }> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: { recordingUrl: true },
    });
    if (!booking) throw new NotFoundException('Booking not found.');
    return { recordingUrl: booking.recordingUrl };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Students
  // ═══════════════════════════════════════════════════════════════════════

  async getAllStudents(
    page = 1,
    limit = 20,
    filters: {
      status?: string;
      teacherId?: string;
      courseId?: string;
      search?: string;
    } = {},
  ) {
    const where: any = { role: 'STUDENT' };
    if (filters.status) where.accountStatus = filters.status;
    if (filters.teacherId) where.assignedTeacherId = filters.teacherId;
    if (filters.courseId) where.assignedCourseId = filters.courseId;
    if (filters.search?.trim()) {
      where.OR = [
        { fullName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [students, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          fullName: true,
          email: true,
          grade: true,
          subjects: true,
          accountStatus: true,
          createdAt: true,
          assignedTeacherId: true,
          assignedTeacher: {
            select: {
              id: true,
              subjects: true,
              user: { select: { fullName: true, avatarUrl: true } },
            },
          },
          assignedCourse: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      students,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getStudentDetail(studentUserId: string) {
    const student = await this.prisma.user.findUnique({
      where: { id: studentUserId },
      select: {
        id: true,
        fullName: true,
        email: true,
        avatarUrl: true,
        age: true,
        grade: true,
        subjects: true,
        accountStatus: true,
        createdAt: true,
        spaceRank: true,
        totalSessions: true,
        gemBalance: true,
        assignedTeacherId: true,
        assignedTeacher: {
          select: {
            id: true,
            user: { select: { fullName: true, avatarUrl: true } },
          },
        },
        assignedCourse: { select: { id: true, title: true, category: true } },
        gemWallet: {
          include: { purchases: { orderBy: { createdAt: 'desc' }, take: 20 } },
        },
      },
    });
    if (!student) throw new NotFoundException('Student not found.');

    const [classHistory, notes, rescheduleHistory, auditHistory] =
      await Promise.all([
        this.prisma.booking.findMany({
          where: { studentUserId },
          include: {
            shift: {
              include: {
                teacher: { include: { user: { select: { fullName: true } } } },
              },
            },
            review: { select: { rating: true, comment: true } },
          },
          orderBy: { shift: { start: 'desc' } },
          take: 100,
        }),
        this.prisma.teacherStudentNote.findMany({
          where: { studentId: studentUserId, isUserRef: true },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.rescheduleRequest.findMany({
          where: { booking: { studentUserId } },
          orderBy: { createdAt: 'desc' },
          take: 50,
        }),
        this.audit.getHistory('User', studentUserId),
      ]);

    return {
      ...student,
      classHistory,
      notes,
      rescheduleHistory,
      auditHistory,
    };
  }

  async assignTeacherToStudent(
    studentUserId: string,
    teacherProfileId: string | null,
    adminUserId: string,
  ) {
    const student = await this.prisma.user.findUnique({
      where: { id: studentUserId },
      select: { id: true, role: true, assignedTeacherId: true },
    });
    if (!student || student.role !== 'STUDENT') {
      throw new NotFoundException('Student not found.');
    }

    if (teacherProfileId) {
      const teacher = await this.prisma.teacherProfile.findUnique({
        where: { id: teacherProfileId },
        select: { id: true },
      });
      if (!teacher) throw new NotFoundException('Teacher not found.');
    }

    const updated = await this.prisma.user.update({
      where: { id: studentUserId },
      data: { assignedTeacherId: teacherProfileId },
      select: {
        id: true,
        fullName: true,
        assignedTeacherId: true,
        assignedTeacher: {
          select: {
            id: true,
            subjects: true,
            user: { select: { fullName: true, avatarUrl: true } },
          },
        },
      },
    });

    await this.audit.log({
      actorId: adminUserId,
      actorRole: 'ADMIN',
      action: 'STUDENT_TEACHER_ASSIGNED',
      entityType: 'User',
      entityId: studentUserId,
      beforeData: { assignedTeacherId: student.assignedTeacherId },
      afterData: { assignedTeacherId: teacherProfileId },
    });

    return updated;
  }

  async assignCourseToStudent(
    studentUserId: string,
    courseId: string | null,
    adminUserId: string,
  ) {
    const student = await this.prisma.user.findUnique({
      where: { id: studentUserId },
      select: { id: true, role: true, assignedCourseId: true },
    });
    if (!student || student.role !== 'STUDENT') {
      throw new NotFoundException('Student not found.');
    }

    if (courseId) {
      const course = await this.prisma.course.findUnique({
        where: { id: courseId },
        select: { id: true },
      });
      if (!course) throw new NotFoundException('Course not found.');
    }

    const updated = await this.prisma.user.update({
      where: { id: studentUserId },
      data: { assignedCourseId: courseId },
      select: {
        id: true,
        fullName: true,
        assignedCourseId: true,
        assignedCourse: { select: { id: true, title: true } },
      },
    });

    await this.audit.log({
      actorId: adminUserId,
      actorRole: 'ADMIN',
      action: 'STUDENT_COURSE_ASSIGNED',
      entityType: 'User',
      entityId: studentUserId,
      beforeData: { assignedCourseId: student.assignedCourseId },
      afterData: { assignedCourseId: courseId },
    });

    return updated;
  }

  async pauseStudent(
    studentUserId: string,
    reason: string,
    adminUserId: string,
  ) {
    if (!reason?.trim()) {
      throw new BadRequestException('A reason is required to pause a student.');
    }
    const student = await this.prisma.user.findUnique({
      where: { id: studentUserId },
      select: { id: true, role: true, accountStatus: true },
    });
    if (!student || student.role !== 'STUDENT') {
      throw new NotFoundException('Student not found.');
    }

    const updated = await this.prisma.user.update({
      where: { id: studentUserId },
      data: { accountStatus: 'PAUSED' },
    });

    await this.audit.log({
      actorId: adminUserId,
      actorRole: 'ADMIN',
      action: 'STUDENT_PAUSED',
      entityType: 'User',
      entityId: studentUserId,
      reason,
      beforeData: { accountStatus: student.accountStatus },
      afterData: { accountStatus: 'PAUSED' },
    });

    return updated;
  }

  async resumeStudent(studentUserId: string, adminUserId: string) {
    const student = await this.prisma.user.findUnique({
      where: { id: studentUserId },
      select: { id: true, role: true, accountStatus: true },
    });
    if (!student || student.role !== 'STUDENT') {
      throw new NotFoundException('Student not found.');
    }

    const updated = await this.prisma.user.update({
      where: { id: studentUserId },
      data: { accountStatus: 'ACTIVE' },
    });

    await this.audit.log({
      actorId: adminUserId,
      actorRole: 'ADMIN',
      action: 'STUDENT_RESUMED',
      entityType: 'User',
      entityId: studentUserId,
      beforeData: { accountStatus: student.accountStatus },
      afterData: { accountStatus: 'ACTIVE' },
    });

    return updated;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Verification documents (Operations review)
  // ═══════════════════════════════════════════════════════════════════════

  async getTeacherDocuments(teacherId: string) {
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { id: teacherId },
      select: {
        id: true,
        verificationDocs: true,
        docsLocked: true,
        user: { select: { fullName: true, email: true } },
      },
    });
    if (!teacher) throw new NotFoundException('Teacher not found.');

    return {
      teacherId: teacher.id,
      teacherName: teacher.user.fullName,
      teacherEmail: teacher.user.email,
      docsLocked: teacher.docsLocked,
      documents: teacher.verificationDocs ?? [],
    };
  }
}
