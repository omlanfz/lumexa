import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminService } from './admin.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  getPlatformStats() {
    return this.adminService.getPlatformStats();
  }

  @Get('bookings')
  getAllBookings(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('status') status?: string,
  ) {
    return this.adminService.getAllBookings(+page, +limit, status);
  }

  @Get('bookings/:bookingId/recording')
  getRecording(@Param('bookingId') bookingId: string) {
    return this.adminService.getBookingRecordingUrl(bookingId);
  }

  @Post('bookings/:bookingId/refund')
  issueRefund(
    @Param('bookingId') bookingId: string,
    @Body('refundCents') refundCents: number,
  ) {
    return this.adminService.issueManualRefund(bookingId, refundCents);
  }

  @Get('teachers')
  getAllTeachers(@Query('page') page = '1', @Query('limit') limit = '20') {
    return this.adminService.getAllTeachers(+page, +limit);
  }

  @Post('teachers/:teacherId/suspend')
  suspendTeacher(
    @Param('teacherId') teacherId: string,
    @Body('reason') reason: string,
  ) {
    return this.adminService.suspendTeacher(teacherId, reason);
  }

  @Post('teachers/:teacherId/reinstate')
  reinstateTeacher(@Param('teacherId') teacherId: string) {
    return this.adminService.reinstateTeacher(teacherId);
  }

  @Post('teachers/:teacherId/reset-strikes')
  resetStrikes(@Param('teacherId') teacherId: string) {
    return this.adminService.resetTeacherStrikes(teacherId);
  }
}
