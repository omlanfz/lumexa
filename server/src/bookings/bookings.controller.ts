// FILE PATH: server/src/bookings/bookings.controller.ts
//
// ─── Issue 17 Fix: GET /bookings/my route ordering ─────────────────────────
//
// ROOT CAUSE:
//   Express (and NestJS) matches routes in declaration order.
//   In the previous version GET 'my' was declared AFTER GET ':bookingId'.
//   When the frontend called GET /bookings/my, Express captured "my" as the
//   bookingId param and forwarded to getBookingById(), which tried to find a
//   booking with id "my", failed, and returned 404.
//
// FIX:
//   Move GET 'my' to the TOP of the controller — before any parameterised
//   routes — so it is matched as a literal string path first.
//
// RULE: Any route with a literal path segment (e.g. "my", "marketplace",
//       "leaderboard") MUST be declared before parameterised routes
//       (e.g. ":bookingId") in the same controller.

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

// ─── DTOs ──────────────────────────────────────────────────────────────────

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

  // ─── Marketplace ─────────────────────────────────────────────────────────────
  // IMPORTANT: Literal routes ("marketplace", "my") MUST appear before
  // parameterised routes (":bookingId") to avoid Express treating the
  // literal segment as a param value.
  @Get('marketplace')
  getMarketplace(@Query('page') page = '1', @Query('limit') limit = '20') {
    return this.bookingsService.getMarketplace(+page, +limit);
  }

  // ─── Parent's own bookings ────────────────────────────────────────────────────
  // Issue 17 fix: moved BEFORE GET :bookingId so "my" is never matched as a
  // bookingId param.
  @Get('my')
  @UseGuards(RolesGuard)
  @Roles(Role.PARENT)
  getMyBookings(@Request() req: any) {
    return this.bookingsService.getMyBookings(req.user.userId);
  }

  // ─── Book a Shift ─────────────────────────────────────────────────────────────
  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.PARENT)
  bookShift(@Request() req: any, @Body() dto: CreateBookingDto) {
    return this.bookingsService.bookShift(
      req.user.userId,
      dto.shiftId,
      dto.studentId,
    );
  }

  // ─── Get Single Booking ───────────────────────────────────────────────────────
  // IMPORTANT: This parameterised route MUST come AFTER all literal routes
  // ("marketplace", "my", "stripe/onboard", "stripe/verify") declared above.
  @Get(':bookingId')
  @UseGuards(RolesGuard)
  @Roles(Role.PARENT)
  getBooking(@Request() req: any, @Param('bookingId') bookingId: string) {
    return this.bookingsService.getBookingById(bookingId, req.user.userId);
  }

  // ─── Mock Payment Confirmation ────────────────────────────────────────────────
  @Post(':bookingId/mock-confirm')
  @UseGuards(RolesGuard)
  @Roles(Role.PARENT)
  mockConfirm(@Request() req: any, @Param('bookingId') bookingId: string) {
    return this.bookingsService.mockConfirmBooking(bookingId, req.user.userId);
  }

  // ─── Submit Post-Class Review ─────────────────────────────────────────────────
  @Post(':bookingId/review')
  @UseGuards(RolesGuard)
  @Roles(Role.PARENT)
  submitReview(
    @Request() req: any,
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
  cancelBooking(@Request() req: any, @Param('bookingId') bookingId: string) {
    return this.bookingsService.cancelBooking(req.user.userId, bookingId);
  }

  // ─── Stripe Connect ───────────────────────────────────────────────────────────
  // These are POST routes so there's no collision risk with GET :bookingId,
  // but they are placed here for clarity.
  @Post('stripe/onboard')
  @UseGuards(RolesGuard)
  @Roles(Role.TEACHER)
  getStripeOnboardingLink(@Request() req: any) {
    return this.bookingsService.getStripeOnboardingLink(req.user.userId);
  }

  @Post('stripe/verify')
  @UseGuards(RolesGuard)
  @Roles(Role.TEACHER)
  verifyStripeOnboarding(@Request() req: any) {
    return this.bookingsService.verifyStripeOnboarding(req.user.userId);
  }
}
