import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get('marketplace') // Public or Protected? Let's make it Protected for now
  @UseGuards(AuthGuard('jwt'))
  getMarketplace() {
    return this.bookingsService.getMarketplace();
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  bookShift(
    @Request() req,
    @Body() body: { shiftId: string; studentId: string },
  ) {
    return this.bookingsService.bookShift(
      req.user.userId,
      body.shiftId,
      body.studentId,
    );
  }
}
