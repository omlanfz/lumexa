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
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

class SubmitReviewDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}

// ─────────────────────────────────────────────────────────────────────────────

@Controller('bookings')
@UseGuards(AuthGuard('jwt'))
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  // ─── Marketplace ──────────────────────────────────────────────────────────────
  // Returns: { teachers: [], total, page, limit, totalPages }
  // NOTE: Frontend must access .teachers — this is NOT a bare array.
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
  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.PARENT)
  getMyBookings(@Request() req) {
    return this.bookingsService.getMyBookings(req.user.userId);
  }
  // ─── Get Single Booking (for mock payment page) ───────────────────────────────
  // IMPORTANT: This route must come BEFORE :bookingId/review and :bookingId/mock-confirm
  // because Express matches routes top-to-bottom. If you add a new route like
  // GET :bookingId/something, place it BEFORE this catch-all GET :bookingId.
  @Get(':bookingId')
  @UseGuards(RolesGuard)
  @Roles(Role.PARENT)
  getBooking(@Request() req, @Param('bookingId') bookingId: string) {
    return this.bookingsService.getBookingById(bookingId, req.user.userId);
  }

  // ─── Mock Payment Confirmation (development only) ─────────────────────────────
  @Post(':bookingId/mock-confirm')
  @UseGuards(RolesGuard)
  @Roles(Role.PARENT)
  mockConfirm(@Request() req, @Param('bookingId') bookingId: string) {
    return this.bookingsService.mockConfirmBooking(bookingId, req.user.userId);
  }

  // ─── Submit Post-Class Review ─────────────────────────────────────────────────
  // Parent submits a 1–5 star rating + optional comment after class completes.
  // Only allowed when booking.paymentStatus === 'CAPTURED'.
  // One review per booking — duplicate submissions return 409 Conflict.
  //
  // Body: { rating: 1–5, comment?: string }
  @Post(':bookingId/review')
  @UseGuards(RolesGuard)
  @Roles(Role.PARENT)
  submitReview(
    @Request() req,
    @Param('bookingId') bookingId: string,
    @Body() dto: SubmitReviewDto,
  ) {
    return this.bookingsService.submitReview(
      bookingId,
      req.user.userId,
      dto.rating,
      dto.comment,
    );
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
