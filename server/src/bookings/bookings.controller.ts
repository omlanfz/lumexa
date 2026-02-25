import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BookingsService } from './bookings.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { CreateBookingDto } from './dto/create-booking.dto';

@Controller('bookings')
@UseGuards(AuthGuard('jwt'))
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  // ─── Marketplace ─────────────────────────────────────────────────────────────
  @Get('marketplace')
  getMarketplace(@Query('page') page = '1', @Query('limit') limit = '20') {
    return this.bookingsService.getMarketplace(+page, +limit);
  }

  // ─── Book a Shift ─────────────────────────────────────────────────────────────
  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.PARENT)
  bookShift(@Request() req, @Body() dto: CreateBookingDto) {
    return this.bookingsService.bookShift(
      req.user.userId,
      dto.shiftId,
      dto.studentId,
    );
  }

  // ─── Get Single Booking (for payment page) ────────────────────────────────────
  @Get(':bookingId')
  @UseGuards(RolesGuard)
  @Roles(Role.PARENT)
  getBooking(@Request() req, @Param('bookingId') bookingId: string) {
    return this.bookingsService.getBookingById(bookingId, req.user.userId);
  }

  // ─── Mock Payment Confirmation (development only) ─────────────────────────────
  // Simulates a successful payment — sets paymentStatus to CAPTURED.
  // Blocked in production (NODE_ENV === 'production').
  @Post(':bookingId/mock-confirm')
  @UseGuards(RolesGuard)
  @Roles(Role.PARENT)
  mockConfirm(@Request() req, @Param('bookingId') bookingId: string) {
    return this.bookingsService.mockConfirmBooking(bookingId, req.user.userId);
  }

  // ─── Cancel Booking ───────────────────────────────────────────────────────────
  @Delete(':bookingId')
  @UseGuards(RolesGuard)
  @Roles(Role.PARENT)
  cancelBooking(@Request() req, @Param('bookingId') bookingId: string) {
    return this.bookingsService.cancelBooking(req.user.userId, bookingId);
  }

  // ─── Stripe Connect ───────────────────────────────────────────────────────────
  @Post('stripe/onboard')
  @UseGuards(RolesGuard)
  @Roles(Role.TEACHER)
  getStripeOnboardingLink(@Request() req) {
    return this.bookingsService.getStripeOnboardingLink(req.user.userId);
  }

  @Post('stripe/verify')
  @UseGuards(RolesGuard)
  @Roles(Role.TEACHER)
  verifyStripeOnboarding(@Request() req) {
    return this.bookingsService.verifyStripeOnboarding(req.user.userId);
  }
}
