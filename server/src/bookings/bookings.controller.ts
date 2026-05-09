// Named routes BEFORE parameterised routes — NestJS routing rule.
// See comment in original file for full explanation.

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
  IsUUID,
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

class CreateStudentBookingDto {
  @IsUUID()
  shiftId: string;
}

// ─────────────────────────────────────────────────────────────────────────────

@Controller('bookings')
@UseGuards(AuthGuard('jwt'))
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  // ── Literal routes first (before all :param routes) ──────────────────────

  @Get('marketplace')
  getMarketplace(@Query('page') page = '1', @Query('limit') limit = '20') {
    return this.bookingsService.getMarketplace(+page, +limit);
  }

  // PARENT's own bookings
  @Get('my')
  @UseGuards(RolesGuard)
  @Roles(Role.PARENT)
  getMyBookings(@Request() req: any) {
    return this.bookingsService.getMyBookings(req.user.userId);
  }

  // STUDENT: book a shift
  @Post('student')
  @UseGuards(RolesGuard)
  @Roles(Role.STUDENT)
  bookStudentShift(
    @Request() req: any,
    @Body() dto: CreateStudentBookingDto,
  ) {
    return this.bookingsService.bookStudentShift(req.user.userId, dto.shiftId);
  }

  // STUDENT: cancel a booking (DELETE /bookings/student/:bookingId)
  @Delete('student/:bookingId')
  @UseGuards(RolesGuard)
  @Roles(Role.STUDENT)
  cancelStudentBooking(
    @Request() req: any,
    @Param('bookingId') bookingId: string,
  ) {
    return this.bookingsService.cancelStudentBooking(
      req.user.userId,
      bookingId,
    );
  }

  // PARENT: book a shift
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

  // Stripe Connect (POST — no collision risk with GET :bookingId)
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

  // ── Parameterised routes — must come AFTER all literal routes ──────────────

  // PARENT: get single booking (for payment page)
  @Get(':bookingId')
  @UseGuards(RolesGuard)
  @Roles(Role.PARENT)
  getBooking(@Request() req: any, @Param('bookingId') bookingId: string) {
    return this.bookingsService.getBookingById(bookingId, req.user.userId);
  }

  // PARENT: mock payment confirmation (dev only)
  @Post(':bookingId/mock-confirm')
  @UseGuards(RolesGuard)
  @Roles(Role.PARENT)
  mockConfirm(@Request() req: any, @Param('bookingId') bookingId: string) {
    return this.bookingsService.mockConfirmBooking(bookingId, req.user.userId);
  }

  // PARENT: submit review
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

  // STUDENT: submit review
  @Post(':bookingId/student-review')
  @UseGuards(RolesGuard)
  @Roles(Role.STUDENT)
  submitStudentReview(
    @Request() req: any,
    @Param('bookingId') bookingId: string,
    @Body() dto: SubmitReviewDto,
  ) {
    return this.bookingsService.submitStudentReview(
      bookingId,
      req.user.userId,
      dto.rating,
      dto.comment,
    );
  }

  // PARENT: cancel booking
  @Delete(':bookingId')
  @UseGuards(RolesGuard)
  @Roles(Role.PARENT)
  cancelBooking(@Request() req: any, @Param('bookingId') bookingId: string) {
    return this.bookingsService.cancelBooking(req.user.userId, bookingId);
  }
}
