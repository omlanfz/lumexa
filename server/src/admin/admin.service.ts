import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { StripeService } from '../payments/stripe.service';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private stripe: StripeService,
  ) {}

  async getAllBookings(page = 1, limit = 20, status?: string) {
    const where = status ? { paymentStatus: status as any } : {};

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: {
          student: {
            include: { parent: { select: { email: true, fullName: true } } },
          },
          shift: {
            include: {
              teacher: {
                include: { user: { select: { email: true, fullName: true } } },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      bookings,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getAllTeachers(page = 1, limit = 20) {
    const [teachers, total] = await Promise.all([
      this.prisma.teacherProfile.findMany({
        include: {
          user: { select: { email: true, fullName: true, createdAt: true } },
          _count: { select: { shifts: true } },
        },
        orderBy: { user: { createdAt: 'desc' } },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.teacherProfile.count(),
    ]);

    return {
      teachers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async suspendTeacher(teacherId: string, reason: string) {
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { id: teacherId },
    });
    if (!teacher) throw new NotFoundException('Teacher not found.');

    return this.prisma.teacherProfile.update({
      where: { id: teacherId },
      data: { isSuspended: true },
    });
  }

  async reinstateTeacher(teacherId: string) {
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { id: teacherId },
    });
    if (!teacher) throw new NotFoundException('Teacher not found.');

    return this.prisma.teacherProfile.update({
      where: { id: teacherId },
      data: { isSuspended: false, strikes: 0 },
    });
  }

  async resetTeacherStrikes(teacherId: string) {
    return this.prisma.teacherProfile.update({
      where: { id: teacherId },
      data: { strikes: 0 },
    });
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

  async issueManualRefund(bookingId: string, refundCents: number) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) throw new NotFoundException('Booking not found.');
    if (!booking.paymentIntentId) {
      throw new NotFoundException('No payment found for this booking.');
    }

    await this.stripe.refundPartial(booking.paymentIntentId, refundCents);

    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { paymentStatus: 'REFUNDED' },
    });
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
}
