import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { StripeService } from '../payments/stripe.service';
import { AuditService } from '../audit/audit.service';
import { PayoutsService } from '../payouts/payouts.service';
import { StudentLedgerService } from '../students/student-ledger.service';
import { SchedulingService } from '../scheduling/scheduling.service';
import { NotificationsService } from '../notifications/notifications.service';
import { signedDocumentUrl } from '../lib/cloudinary';

// Friendly labels for verification document types — keep in sync with
// DOC_REQUIREMENTS in client/app/(teacher)/teacher-profile/page.tsx, which
// is what a teacher actually sees while uploading these.
const DOC_TYPE_LABELS: Record<string, string> = {
  nid: 'National ID (NID)',
  birth_certificate: 'Birth Certificate',
  bachelor_certificate: "Bachelor's Certificate",
  master_certificate: "Master's Certificate",
  ielts_certificate: 'IELTS Certificate',
  teaching_cert: 'Teaching Certificate',
  degree: 'Degree Certificate',
  background_check: 'Background Check',
  subject_cert: 'Subject Certification',
  other: 'Other Document',
};

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
    select: {
      fullName: true,
      email: true,
      createdAt: true,
      avatarUrl: true,
      whatsappNumber: true,
      adminSetPassword: true,
    },
  },
  _count: { select: { shifts: true, rescheduleRequests: true } },
} as const;

const CLASS_LESSON_INCLUDE = {
  student: { select: { id: true, fullName: true, email: true } },
  teacher: { select: { id: true, user: { select: { fullName: true } } } },
  course: { select: { id: true, title: true } },
} satisfies Prisma.ScheduledLessonInclude;

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
    private studentLedger: StudentLedgerService,
    private scheduling: SchedulingService,
    private notifications: NotificationsService,
    private jwt: JwtService,
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

  // Lumexa runs two parallel booking systems: the legacy per-shift `Booking`
  // model (old Parent-marketplace flow — still holds real historical rows)
  // and the current curriculum `ScheduledLesson` model that Operations
  // generates from the Students → Schedule tab (see SchedulingService). The
  // Classes page has to show both, normalized into one list — a lesson has
  // no per-class payment/refund concept (billing lives on the student's BDT
  // ledger instead), so PENDING/FAILED/REFUNDED/NEEDS_REVIEW are Booking-only
  // states and this returns `null` for a lesson-only filter to skip the
  // lesson query entirely.
  private buildLessonWhere(filters: {
    date?: string;
    status?: string;
    teacherId?: string;
    studentUserId?: string;
    courseId?: string;
  }): any | null {
    switch (filters.status) {
      case 'PENDING':
      case 'FAILED':
      case 'REFUNDED':
      case 'NEEDS_REVIEW':
        return null;
      default:
        break;
    }

    const where: any = {};
    if (filters.date) {
      const { start, end } = dayRange(filters.date);
      where.start = { gte: start, lte: end };
    }
    if (filters.teacherId) where.teacherId = filters.teacherId;
    if (filters.studentUserId) where.studentUserId = filters.studentUserId;
    if (filters.courseId) where.courseId = filters.courseId;

    switch (filters.status) {
      case 'SCHEDULED':
        where.status = 'UPCOMING';
        break;
      case 'COMPLETED':
        where.status = 'COMPLETED';
        break;
      case 'CANCELLED':
        where.status = 'CANCELLED';
        break;
      default:
        break; // no status filter — every lesson status included
    }

    return where;
  }

  // Bounded per source rather than DB-paginated — this is an internal
  // Operations tool at a scale (hundreds, not millions, of classes) where
  // fetching-then-merging in memory is simple and fast enough, and it's what
  // makes a clean merge of two different models into one paginated list
  // possible without a raw SQL UNION.
  private readonly CLASS_MERGE_CAP = 1000;

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
    const bookingWhere = this.buildBookingWhere(filters);
    const lessonWhere = this.buildLessonWhere(filters);

    const [bookings, lessons] = await Promise.all([
      this.prisma.booking.findMany({
        where: bookingWhere,
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
        take: this.CLASS_MERGE_CAP,
      }),
      lessonWhere
        ? this.prisma.scheduledLesson.findMany({
            where: lessonWhere,
            include: CLASS_LESSON_INCLUDE,
            orderBy: { start: 'desc' },
            take: this.CLASS_MERGE_CAP,
          })
        : Promise.resolve(
            [] as Prisma.ScheduledLessonGetPayload<{
              include: typeof CLASS_LESSON_INCLUDE;
            }>[],
          ),
    ]);

    const bookingRows = bookings.map((b) => ({
      id: b.id,
      kind: 'BOOKING' as const,
      start: b.shift.start,
      end: b.shift.end,
      studentName: b.studentUser?.fullName ?? b.student?.name ?? '—',
      studentEmail: b.studentUser?.email ?? b.student?.parent?.email ?? null,
      studentUserId: b.studentUserId,
      teacherName: b.shift.teacher?.user?.fullName ?? '—',
      teacherId: b.shift.teacherId,
      courseTitle: b.studentUser?.assignedCourse?.title ?? '—',
      courseId: b.studentUser?.assignedCourse?.id ?? null,
      classType: null as string | null,
      lessonNumber: null as number | null,
      paymentStatus: b.paymentStatus as string | null,
      amountCents: b.amountCents,
      recordingUrl: b.recordingUrl,
      displayStatus: this.computeDisplayStatus(b as any),
      raw: b,
    }));

    const lessonRows = lessons.map((l) => ({
      id: l.id,
      kind: 'LESSON' as const,
      start: l.start,
      end: l.end,
      studentName: l.student?.fullName ?? '—',
      studentEmail: l.student?.email ?? null,
      studentUserId: l.studentUserId,
      teacherName: l.teacher?.user?.fullName ?? '—',
      teacherId: l.teacherId,
      courseTitle: l.course?.title ?? '—',
      courseId: l.courseId,
      classType: l.classType as string | null,
      lessonNumber: l.lessonNumber as number | null,
      paymentStatus: null as string | null,
      amountCents: null as number | null,
      recordingUrl: null as string | null,
      displayStatus: l.status === 'UPCOMING' ? 'SCHEDULED' : l.status,
      raw: l,
    }));

    const merged = [...bookingRows, ...lessonRows].sort(
      (a, b) => new Date(b.start).getTime() - new Date(a.start).getTime(),
    );
    const total = merged.length;
    const paged = merged.slice((page - 1) * limit, (page - 1) * limit + limit);

    return {
      classes: paged,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async deleteBooking(bookingId: string, adminUserId: string, reason?: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) throw new NotFoundException('Class not found.');

    await this.prisma.$transaction([
      this.prisma.rescheduleRequest.deleteMany({ where: { bookingId } }),
      this.prisma.payoutEntry.deleteMany({ where: { bookingId } }),
      this.prisma.studentLedgerEntry.deleteMany({ where: { bookingId } }),
      this.prisma.review.deleteMany({ where: { bookingId } }),
      this.prisma.booking.delete({ where: { id: bookingId } }),
      this.prisma.shift.update({
        where: { id: booking.shiftId },
        data: { isBooked: false },
      }),
    ]);

    await this.audit.log({
      actorId: adminUserId,
      actorRole: 'ADMIN',
      action: 'ADMIN_BOOKING_DELETED',
      entityType: 'Booking',
      entityId: bookingId,
      reason,
      beforeData: booking,
    });

    return { success: true };
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
            whatsappNumber: true,
            adminSetPassword: true,
          },
        },
      },
    });
    if (!teacher) throw new NotFoundException('Teacher not found.');

    const [assignedStudents, upcomingLessons, ledgerSummary, auditHistory] =
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
        // The teacher's real class schedule lives in ScheduledLesson (see
        // SchedulingService), not the legacy Shift model — a teacher whose
        // classes were all set up through Students → Schedule (the current
        // flow) has zero Shift rows, so querying Shift here always showed
        // "No upcoming shifts" even for a fully-booked teacher.
        this.scheduling.getTeacherUpcomingLessonsForAdmin(teacherId),
        this.payouts.getSummary(teacherId),
        this.audit.getHistory('TeacherProfile', teacherId),
      ]);

    return {
      ...teacher,
      assignedStudents,
      upcomingLessons,
      earningsSummary: ledgerSummary,
      auditHistory,
    };
  }

  async addTeacherStrike(teacherId: string, reason: string, adminUserId: string) {
    if (!reason?.trim()) {
      throw new BadRequestException(
        'A reason is required to add a strike.',
      );
    }
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { id: teacherId },
      include: { user: { select: { email: true, fullName: true } } },
    });
    if (!teacher) throw new NotFoundException('Teacher not found.');

    const updated = await this.prisma.teacherProfile.update({
      where: { id: teacherId },
      data: { strikes: { increment: 1 } },
    });

    await this.audit.log({
      actorId: adminUserId,
      actorRole: 'ADMIN',
      action: 'TEACHER_STRIKE_ADDED',
      entityType: 'TeacherProfile',
      entityId: teacherId,
      reason,
      beforeData: { strikes: teacher.strikes },
      afterData: { strikes: updated.strikes },
    });

    try {
      await this.notifications.sendTeacherStrikeWarning(
        teacher.user.email,
        updated.strikes,
        teacher.user.fullName,
      );
    } catch {
      // Non-fatal — the strike itself is already recorded; a failed email
      // shouldn't roll back an Operations action.
    }

    return updated;
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
          whatsappNumber: true,
          adminSetPassword: true,
          avatarUrl: true,
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

    const ledgerSummaries = await this.studentLedger.getSummariesFor(
      students.map((s) => s.id),
    );
    const studentsWithPaymentBadge = students.map((s) => ({
      ...s,
      paymentBadge: ledgerSummaries.get(s.id)?.paymentBadge ?? null,
    }));

    return {
      students: studentsWithPaymentBadge,
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
        whatsappNumber: true,
        adminSetPassword: true,
        avatarUrl: true,
        age: true,
        grade: true,
        subjects: true,
        accountStatus: true,
        createdAt: true,
        spaceRank: true,
        totalSessions: true,
        assignedTeacherId: true,
        assignedTeacher: {
          select: {
            id: true,
            user: { select: { fullName: true, avatarUrl: true } },
          },
        },
        assignedCourse: { select: { id: true, title: true, category: true } },
        assignedClassType: true,
      },
    });
    if (!student) throw new NotFoundException('Student not found.');

    const [classHistory, rescheduleHistory, auditHistory, ledger] =
      await Promise.all([
        this.getStudentClassHistory(studentUserId),
        this.prisma.rescheduleRequest.findMany({
          where: { booking: { studentUserId } },
          orderBy: { createdAt: 'desc' },
          take: 50,
        }),
        this.audit.getHistory('User', studentUserId),
        this.studentLedger.getLedger(studentUserId),
      ]);

    const ledgerSummary = await this.studentLedger.getSummary(studentUserId);

    return {
      ...student,
      classHistory,
      rescheduleHistory,
      auditHistory,
      ledgerSummary,
      ledger,
    };
  }

  // Same Booking/ScheduledLesson duality as the Classes page (see
  // getAllBookings) — a student's Class History has to include both, or a
  // student scheduled entirely through the current curriculum-scheduling
  // flow (ScheduledLesson) shows "No classes yet" despite having attended
  // dozens of lessons.
  private async getStudentClassHistory(studentUserId: string) {
    const [bookings, lessons] = await Promise.all([
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
      this.prisma.scheduledLesson.findMany({
        where: { studentUserId },
        include: {
          teacher: { select: { user: { select: { fullName: true } } } },
          course: { select: { title: true } },
        },
        orderBy: { start: 'desc' },
        take: 100,
      }),
    ]);

    const bookingRows = bookings.map((b) => ({
      id: b.id,
      kind: 'BOOKING' as const,
      start: b.shift.start,
      end: b.shift.end,
      teacherName: b.shift.teacher?.user?.fullName ?? '—',
      courseTitle: null as string | null,
      paymentStatus: b.paymentStatus as string | null,
      displayStatus: this.computeDisplayStatus(b as any),
      review: b.review,
    }));
    const lessonRows = lessons.map((l) => ({
      id: l.id,
      kind: 'LESSON' as const,
      start: l.start,
      end: l.end,
      teacherName: l.teacher?.user?.fullName ?? '—',
      courseTitle: l.course?.title ?? null,
      paymentStatus: null as string | null,
      displayStatus: l.status === 'UPCOMING' ? 'SCHEDULED' : l.status,
      review: null as { rating: number; comment: string | null } | null,
    }));

    return [...bookingRows, ...lessonRows]
      .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime())
      .slice(0, 100);
  }

  async updateStudentContact(
    studentUserId: string,
    whatsappNumber: string | null,
    adminUserId: string,
  ) {
    const student = await this.prisma.user.findUnique({
      where: { id: studentUserId },
      select: { id: true, role: true, whatsappNumber: true },
    });
    if (!student || student.role !== 'STUDENT') {
      throw new NotFoundException('Student not found.');
    }

    const updated = await this.prisma.user.update({
      where: { id: studentUserId },
      data: { whatsappNumber: whatsappNumber?.trim() || null },
      select: { id: true, whatsappNumber: true },
    });

    await this.audit.log({
      actorId: adminUserId,
      actorRole: 'ADMIN',
      action: 'STUDENT_CONTACT_UPDATED',
      entityType: 'User',
      entityId: studentUserId,
      beforeData: { whatsappNumber: student.whatsappNumber },
      afterData: { whatsappNumber: updated.whatsappNumber },
    });

    return updated;
  }

  async updateTeacherContact(
    teacherId: string,
    whatsappNumber: string | null,
    adminUserId: string,
  ) {
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { id: teacherId },
      select: { userId: true, user: { select: { whatsappNumber: true } } },
    });
    if (!teacher) throw new NotFoundException('Teacher not found.');

    const updated = await this.prisma.user.update({
      where: { id: teacher.userId },
      data: { whatsappNumber: whatsappNumber?.trim() || null },
      select: { id: true, whatsappNumber: true },
    });

    await this.audit.log({
      actorId: adminUserId,
      actorRole: 'ADMIN',
      action: 'TEACHER_CONTACT_UPDATED',
      entityType: 'TeacherProfile',
      entityId: teacherId,
      beforeData: { whatsappNumber: teacher.user.whatsappNumber },
      afterData: { whatsappNumber: updated.whatsappNumber },
    });

    return updated;
  }

  // ─── Admin-set password reset (students & teachers) ─────────────────────
  //
  // Passwords are bcrypt-hashed (see AuthService) — irreversible by design,
  // so there is no "show the current password" for Operations. What
  // Operations actually needs (help a student/teacher who's locked out) is
  // covered by resetting it to a new one, which is what this does; the
  // person should change it themselves afterward from their own dashboard.
  async resetUserPassword(
    userId: string,
    newPassword: string,
    adminUserId: string,
    expectedRole: 'STUDENT' | 'TEACHER',
  ) {
    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException(
        'New password must be at least 8 characters.',
      );
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });
    if (!user || user.role !== expectedRole) {
      throw new NotFoundException(
        `${expectedRole === 'STUDENT' ? 'Student' : 'Teacher'} not found.`,
      );
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      // adminSetPassword keeps the plaintext Operations just chose so it can
      // be shown back to them on the Teachers/Students pages — it is NOT a
      // record of the account's actual current password if the account
      // holder later changes it themselves (see AuthService.changePassword,
      // which clears this field at that point).
      data: { password: hashed, adminSetPassword: newPassword },
    });

    await this.audit.log({
      actorId: adminUserId,
      actorRole: 'ADMIN',
      action: 'PASSWORD_RESET_BY_ADMIN',
      entityType: 'User',
      entityId: userId,
    });

    return { success: true };
  }

  /** Same as resetUserPassword, but takes a TeacherProfile id (what the
   * Teachers admin UI has) instead of the underlying User id. */
  async resetTeacherPassword(
    teacherId: string,
    newPassword: string,
    adminUserId: string,
  ) {
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { id: teacherId },
      select: { userId: true },
    });
    if (!teacher) throw new NotFoundException('Teacher not found.');
    return this.resetUserPassword(
      teacher.userId,
      newPassword,
      adminUserId,
      'TEACHER',
    );
  }

  // ─── Admin impersonation ("view dashboard as") ───────────────────────────
  //
  // Issues a normal login JWT for a teacher/student account so Operations
  // can open that person's dashboard with full read/write access, without
  // ever needing (or being able to see) their real password. Every call is
  // audit-logged against the admin who triggered it.
  private async impersonateUser(
    userId: string,
    adminUserId: string,
    expectedRole: 'STUDENT' | 'TEACHER',
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, fullName: true, role: true },
    });
    if (!user || user.role !== expectedRole) {
      throw new NotFoundException(
        `${expectedRole === 'STUDENT' ? 'Student' : 'Teacher'} not found.`,
      );
    }

    const access_token = this.jwt.sign({
      email: user.email,
      sub: user.id,
      role: user.role,
      impersonatedBy: adminUserId,
    });

    await this.audit.log({
      actorId: adminUserId,
      actorRole: 'ADMIN',
      action: 'ADMIN_IMPERSONATION_STARTED',
      entityType: 'User',
      entityId: userId,
    });

    return {
      access_token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }

  async impersonateTeacher(teacherId: string, adminUserId: string) {
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { id: teacherId },
      select: { userId: true },
    });
    if (!teacher) throw new NotFoundException('Teacher not found.');
    return this.impersonateUser(teacher.userId, adminUserId, 'TEACHER');
  }

  async impersonateStudent(studentUserId: string, adminUserId: string) {
    return this.impersonateUser(studentUserId, adminUserId, 'STUDENT');
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

    // Changing the teacher invalidates any existing recurring schedule —
    // future lessons were built around the old teacher's availability.
    // Completed lessons are never touched (see SchedulingService).
    if (teacherProfileId !== student.assignedTeacherId) {
      await this.scheduling.clearStudentSchedule(studentUserId);
    }

    return updated;
  }

  async assignCourseToStudent(
    studentUserId: string,
    courseId: string | null,
    adminUserId: string,
  ) {
    const student = await this.prisma.user.findUnique({
      where: { id: studentUserId },
      select: {
        id: true,
        role: true,
        assignedCourseId: true,
        assignedCourse: { select: { title: true } },
      },
    });
    if (!student || student.role !== 'STUDENT') {
      throw new NotFoundException('Student not found.');
    }

    let newCourse: {
      id: string;
      title: string;
      priceCents: number | null;
      sessions: number;
    } | null = null;
    if (courseId) {
      newCourse = await this.prisma.course.findUnique({
        where: { id: courseId },
        select: { id: true, title: true, priceCents: true, sessions: true },
      });
      if (!newCourse) throw new NotFoundException('Course not found.');
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

    // Carries the student's BDT balance forward under the new curriculum —
    // see StudentLedgerService.recordCurriculumChange doc comment. No-op if
    // the student has no billing history yet.
    await this.studentLedger.recordCurriculumChange(
      studentUserId,
      adminUserId,
      student.assignedCourse,
      newCourse,
    );

    // Changing the curriculum invalidates any existing recurring schedule —
    // lesson numbering and progression are tracked per course. Completed
    // lessons are historical and are never touched.
    if (courseId !== student.assignedCourseId) {
      await this.scheduling.clearStudentSchedule(studentUserId);
    }

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

    // The student can't attend while paused — cancel their still-UPCOMING
    // lessons so the teacher's slots free up. Their RecurringSlot pattern
    // (weekday/time/teacher) is left untouched so resumeStudent can replay
    // it later.
    await this.scheduling.cancelUpcomingLessonsForPause(studentUserId);

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

    // Restore the same weekly schedule the student had before being
    // paused — regenerated from today against their still-intact
    // RecurringSlot pattern (see SchedulingService.restoreScheduleAfterResume).
    const { restored, skipped } = await this.scheduling.restoreScheduleAfterResume(
      studentUserId,
      adminUserId,
    );

    await this.audit.log({
      actorId: adminUserId,
      actorRole: 'ADMIN',
      action: 'STUDENT_RESUMED',
      entityType: 'User',
      entityId: studentUserId,
      beforeData: { accountStatus: student.accountStatus },
      afterData: { accountStatus: 'ACTIVE' },
    });

    return {
      ...updated,
      scheduleRestored: restored,
      scheduleSkipped: skipped,
    };
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

    const documents = ((teacher.verificationDocs as any[]) ?? []).map(
      (d: any) => ({
        ...d,
        label: DOC_TYPE_LABELS[d.type] ?? d.type ?? 'Document',
        // Signed so Cloudinary's "restricted media types" delivery rule
        // (blocks unsigned PDF/ZIP access — the 401 on "View") never
        // applies. See signedDocumentUrl for why this is needed even for
        // docs uploaded as resource_type 'raw'.
        viewUrl: signedDocumentUrl(d),
      }),
    );

    return {
      teacherId: teacher.id,
      teacherName: teacher.user.fullName,
      teacherEmail: teacher.user.email,
      docsLocked: teacher.docsLocked,
      documents,
    };
  }
}
