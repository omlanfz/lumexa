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
import { Role } from '@prisma/client';

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
          user: { select: { fullName: true, avatarUrl: true, email: true } },
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

  async getMyBookings(parentId: string): Promise<unknown[]> {
    return this.prisma.booking.findMany({
      where: {
        student: { parentId },
      },
      include: {
        shift: {
          include: {
            teacher: {
              include: { user: true },
            },
          },
        },
        student: true,
        review: true,
      },
      orderBy: { createdAt: 'desc' },
    });
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
    if (!booking.student || booking.student.parent.id !== userId) {
      throw new ForbiddenException('Access denied.');
    }

    return booking;
  }

  // ─── Book Shift (PARENT role) ────────────────────────────────────────────────

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

  // ─── Book Shift (STUDENT role) ───────────────────────────────────────────────

  async bookStudentShift(studentUserId: string, shiftId: string) {
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

      const student = await tx.user.findUnique({
        where: { id: studentUserId },
        select: {
          id: true,
          email: true,
          fullName: true,
          accountStatus: true,
          role: true,
        },
      });
      if (!student || student.role !== Role.STUDENT) {
        throw new NotFoundException('Student account not found.');
      }
      if (student.accountStatus !== 'ACTIVE') {
        throw new ForbiddenException(
          'Account must be active to book sessions.',
        );
      }

      await tx.shift.update({
        where: { id: shiftId },
        data: { isBooked: true },
      });

      const booking = await tx.booking.create({
        data: {
          shiftId,
          studentUserId,
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
        .sendBookingConfirmation(student.email, {
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
    if (!booking.student || booking.student.parent.id !== userId) {
      throw new ForbiddenException('You do not own this booking.');
    }
    if (booking.paymentStatus === 'CAPTURED') {
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

  // ─── Cancel Booking (PARENT role) ────────────────────────────────────────────

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
    if (!booking.student || booking.student.parentId !== userId) {
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

  // ─── Cancel Booking (STUDENT role) ───────────────────────────────────────────

  async cancelStudentBooking(studentUserId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
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
    if (booking.studentUserId !== studentUserId) {
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

    return { message: 'Booking cancelled.', refundCents, reason };
  }

  // ─── Submit Review (PARENT role) ─────────────────────────────────────────────

  async submitReview(
    bookingId: string,
    userId: string,
    rating: number,
    comment: string | undefined,
  ) {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new BadRequestException(
        'Rating must be a whole number from 1 to 5.',
      );
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        student: {
          include: { parent: { select: { id: true } } },
        },
        shift: {
          include: {
            teacher: { select: { id: true } },
          },
        },
        review: true,
      },
    });

    if (!booking) throw new NotFoundException('Booking not found.');

    if (!booking.student || booking.student.parent.id !== userId) {
      throw new ForbiddenException('You can only review your own bookings.');
    }

    if (booking.paymentStatus !== 'CAPTURED') {
      throw new BadRequestException(
        'Reviews can only be submitted after the class has been completed and payment captured.',
      );
    }

    if (booking.review) {
      throw new ConflictException(
        'You have already submitted a review for this class.',
      );
    }

    const teacherId = booking.shift.teacher.id;

    return this.prisma.$transaction(async (tx) => {
      const review = await tx.review.create({
        data: {
          bookingId,
          teacherId,
          rating,
          comment: comment?.trim() || null,
          submittedByParentId: userId,
        },
      });

      const agg = await tx.review.aggregate({
        where: { teacherId },
        _avg: { rating: true },
        _count: { rating: true },
      });

      await tx.teacherProfile.update({
        where: { id: teacherId },
        data: {
          ratingAvg: Math.round((agg._avg.rating ?? 0) * 10) / 10,
          reviewCount: agg._count.rating,
        },
      });

      return {
        message: 'Review submitted. Thank you for your feedback!',
        reviewId: review.id,
        rating: review.rating,
      };
    });
  }

  // ─── Submit Review (STUDENT role) ────────────────────────────────────────────

  async submitStudentReview(
    bookingId: string,
    studentUserId: string,
    rating: number,
    comment: string | undefined,
  ) {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new BadRequestException(
        'Rating must be a whole number from 1 to 5.',
      );
    }

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        shift: {
          include: {
            teacher: { select: { id: true } },
          },
        },
        review: true,
      },
    });

    if (!booking) throw new NotFoundException('Booking not found.');

    if (booking.studentUserId !== studentUserId) {
      throw new ForbiddenException('You can only review your own bookings.');
    }

    if (booking.paymentStatus !== 'CAPTURED') {
      throw new BadRequestException(
        'Reviews can only be submitted after the class has been completed and payment captured.',
      );
    }

    if (booking.review) {
      throw new ConflictException(
        'You have already submitted a review for this class.',
      );
    }

    const teacherId = booking.shift.teacher.id;

    return this.prisma.$transaction(async (tx) => {
      const review = await tx.review.create({
        data: {
          bookingId,
          teacherId,
          rating,
          comment: comment?.trim() || null,
          submittedByStudentId: studentUserId,
        },
      });

      const agg = await tx.review.aggregate({
        where: { teacherId },
        _avg: { rating: true },
        _count: { rating: true },
      });

      await tx.teacherProfile.update({
        where: { id: teacherId },
        data: {
          ratingAvg: Math.round((agg._avg.rating ?? 0) * 10) / 10,
          reviewCount: agg._count.rating,
        },
      });

      return {
        message: 'Review submitted. Thank you for your feedback!',
        reviewId: review.id,
        rating: review.rating,
      };
    });
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
