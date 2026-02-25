import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { StripeService } from '../payments/stripe.service';
import { NotificationsService } from '../notifications/notifications.service';
import { calculateRefundAmount } from './cancellation.policy';

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    private stripe: StripeService,
    private notifications: NotificationsService,
  ) {}

  // ─── Marketplace ────────────────────────────────────────────────────────────

  async getMarketplace(page = 1, limit = 20) {
    const [teachers, total] = await Promise.all([
      this.prisma.teacherProfile.findMany({
        where: { isSuspended: false },
        include: {
          user: { select: { fullName: true } },
          shifts: {
            where: {
              isBooked: false,
              start: { gt: new Date() },
            },
            orderBy: { start: 'asc' },
            take: 10,
          },
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.teacherProfile.count({ where: { isSuspended: false } }),
    ]);

    return {
      teachers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ─── Get Single Booking (for mock payment page) ──────────────────────────────

  async getBookingById(bookingId: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        student: {
          include: {
            parent: { select: { id: true, email: true } },
          },
        },
        shift: {
          include: {
            teacher: {
              include: {
                user: { select: { fullName: true } },
              },
            },
          },
        },
      },
    });

    if (!booking) throw new NotFoundException('Booking not found.');
    if (booking.student.parent.id !== userId) {
      throw new ForbiddenException('Access denied.');
    }

    return booking;
  }

  // ─── Book Shift ──────────────────────────────────────────────────────────────

  async bookShift(userId: string, shiftId: string, studentId: string) {
    return this.prisma.$transaction(async (tx) => {
      const shift = await tx.shift.findUnique({
        where: { id: shiftId },
        include: {
          teacher: {
            include: {
              user: { select: { email: true, fullName: true } },
            },
          },
        },
      });

      if (!shift) throw new NotFoundException('Shift not found.');
      if (shift.isBooked)
        throw new ConflictException('This slot is already taken.');
      if (shift.start < new Date()) {
        throw new BadRequestException(
          'Cannot book a shift that has already started.',
        );
      }
      if (shift.teacher.isSuspended) {
        throw new BadRequestException(
          'This teacher is not currently available.',
        );
      }

      const student = await tx.student.findFirst({
        where: { id: studentId, parentId: userId },
        include: { parent: { select: { email: true } } },
      });
      if (!student) {
        throw new ForbiddenException(
          'Student not found or does not belong to your account.',
        );
      }

      await tx.shift.update({
        where: { id: shiftId },
        data: { isBooked: true },
      });

      const booking = await tx.booking.create({
        data: {
          shiftId,
          studentId,
          paymentStatus: 'PENDING',
          amountCents: shift.teacher.hourlyRate * 100,
        },
      });

      let clientSecret: string | null = null;

      if (
        shift.teacher.stripeAccountId &&
        shift.teacher.stripeOnboarded &&
        process.env.STRIPE_SECRET_KEY
      ) {
        const intent = await this.stripe.createPaymentIntent(
          shift.teacher.hourlyRate * 100,
          shift.teacher.stripeAccountId,
          booking.id,
        );

        await tx.booking.update({
          where: { id: booking.id },
          data: { paymentIntentId: intent.id },
        });

        clientSecret = intent.client_secret;
      }

      this.notifications
        .sendBookingConfirmation(student.parent.email, {
          teacherName: shift.teacher.user.fullName,
          classStart: shift.start,
          classEnd: shift.end,
          bookingId: booking.id,
        })
        .catch(() => {});

      return {
        bookingId: booking.id,
        ...(clientSecret && { clientSecret }),
        message: 'Booking confirmed.',
      };
    });
  }

  // ─── Mock Payment Confirmation ───────────────────────────────────────────────
  // Used in development when Stripe is not configured.
  // Simulates a successful payment by marking the booking as CAPTURED.
  // This endpoint is only accessible when NODE_ENV !== 'production'.

  async mockConfirmBooking(bookingId: string, userId: string) {
    if (process.env.NODE_ENV === 'production') {
      throw new BadRequestException(
        'Mock payments are not available in production.',
      );
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        student: {
          include: { parent: { select: { id: true } } },
        },
      },
    });

    if (!booking) throw new NotFoundException('Booking not found.');
    if (booking.student.parent.id !== userId) {
      throw new ForbiddenException('You do not own this booking.');
    }
    if (booking.paymentStatus === 'CAPTURED') {
      // Already confirmed — idempotent, return success
      return { message: 'Booking already confirmed.', bookingId };
    }
    if (booking.paymentStatus === 'REFUNDED') {
      throw new BadRequestException('This booking has been cancelled.');
    }

    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { paymentStatus: 'CAPTURED' },
    });

    return { message: 'Payment confirmed (mock).', bookingId };
  }

  // ─── Cancel Booking ──────────────────────────────────────────────────────────

  async cancelBooking(userId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        student: {
          include: {
            parent: { select: { email: true, fullName: true } },
          },
        },
        shift: {
          include: {
            teacher: {
              include: {
                user: { select: { email: true, fullName: true } },
              },
            },
          },
        },
      },
    });

    if (!booking) throw new NotFoundException('Booking not found.');
    if (booking.student.parentId !== userId) {
      throw new ForbiddenException('You can only cancel your own bookings.');
    }
    if (booking.paymentStatus === 'REFUNDED') {
      throw new BadRequestException('This booking is already cancelled.');
    }

    const { refundCents, reason } = calculateRefundAmount(
      booking.shift.start,
      booking.amountCents ?? 0,
    );

    if (booking.paymentIntentId && refundCents > 0) {
      if (booking.paymentStatus === 'CAPTURED') {
        await this.stripe.refundPartial(booking.paymentIntentId, refundCents);
      } else {
        await this.stripe.cancelPayment(booking.paymentIntentId);
      }
    }

    await this.prisma.$transaction([
      this.prisma.booking.update({
        where: { id: bookingId },
        data: { paymentStatus: 'REFUNDED' },
      }),
      this.prisma.shift.update({
        where: { id: booking.shiftId },
        data: { isBooked: false },
      }),
    ]);

    this.notifications
      .sendCancellationNotice(
        booking.student.parent.email,
        booking.shift.teacher.user.email,
        refundCents,
        {
          teacherName: booking.shift.teacher.user.fullName,
          classStart: booking.shift.start,
          classEnd: booking.shift.end,
          bookingId,
        },
      )
      .catch(() => {});

    return { message: 'Booking cancelled.', refundCents, reason };
  }

  // ─── Stripe Connect ──────────────────────────────────────────────────────────

  async getStripeOnboardingLink(userId: string) {
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { userId },
    });
    if (!teacher) throw new NotFoundException('Teacher profile not found.');

    const { url, accountId } = await this.stripe.createConnectOnboardingLink(
      teacher.id,
    );

    await this.prisma.teacherProfile.update({
      where: { id: teacher.id },
      data: { stripeAccountId: accountId },
    });

    return { url };
  }

  async verifyStripeOnboarding(userId: string) {
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { userId },
    });
    if (!teacher?.stripeAccountId) {
      throw new BadRequestException(
        'No Stripe account found for this teacher.',
      );
    }

    const isOnboarded = await this.stripe.isAccountOnboarded(
      teacher.stripeAccountId,
    );

    if (isOnboarded) {
      await this.prisma.teacherProfile.update({
        where: { id: teacher.id },
        data: { stripeOnboarded: true },
      });
    }

    return { onboarded: isOnboarded };
  }
}
