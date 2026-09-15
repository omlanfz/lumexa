import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Response,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response as ExpressResponse } from 'express';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { AdminService } from './admin.service';
import { PayoutsService } from '../payouts/payouts.service';
import { RescheduleService } from '../reschedule/reschedule.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

// ── Ledger trigger DTOs (Operations only — see PayoutsService doc comment) ──

class LogPtmDto {
  @IsString() @IsNotEmpty() @MaxLength(200) referenceId: string;
  @IsString() @IsNotEmpty() @MaxLength(500) description: string;
}

class LogConversionDto {
  @IsString() @IsNotEmpty() studentUserId: string;
}

class LogPenaltyDto {
  @IsIn(['MINOR', 'MODERATE', 'MAJOR'])
  severity: 'MINOR' | 'MODERATE' | 'MAJOR';
  @IsString() @IsNotEmpty() @MaxLength(500) reason: string;
  @IsString() @IsNotEmpty() referenceId: string;
}

class LogAdjustmentDto {
  @IsInt() amountCents: number;
  @IsString() @IsNotEmpty() @MaxLength(500) reason: string;
  @IsOptional() @IsString() referenceType?: string;
  @IsOptional() @IsString() referenceId?: string;
  @IsOptional() @IsInt() month?: number;
  @IsOptional() @IsInt() year?: number;
}

class AdminRescheduleDto {
  @IsISO8601() newStart: string;
  @IsISO8601() newEnd: string;
  @IsString() @IsNotEmpty() @MaxLength(1000) reason: string;
}

class ReasonDto {
  @IsString() @IsNotEmpty() @MaxLength(1000) reason: string;
}

@Controller('admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly payoutsService: PayoutsService,
    private readonly rescheduleService: RescheduleService,
  ) {}

  // ── Dashboard ────────────────────────────────────────────────────────────

  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboardSummary();
  }

  @Get('stats')
  getPlatformStats() {
    return this.adminService.getPlatformStats();
  }

  // ── Classes / bookings ───────────────────────────────────────────────────

  @Get('bookings')
  getAllBookings(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('status') status?: string,
    @Query('date') date?: string,
    @Query('teacherId') teacherId?: string,
    @Query('studentUserId') studentUserId?: string,
    @Query('courseId') courseId?: string,
  ) {
    return this.adminService.getAllBookings(+page, +limit, {
      status,
      date,
      teacherId,
      studentUserId,
      courseId,
    });
  }

  @Get('bookings/:bookingId')
  getBookingDetail(@Param('bookingId') bookingId: string) {
    return this.adminService.getBookingDetail(bookingId);
  }

  @Get('bookings/:bookingId/recording')
  getRecording(@Param('bookingId') bookingId: string) {
    return this.adminService.getBookingRecordingUrl(bookingId);
  }

  @Get('bookings/:bookingId/reschedule-history')
  getBookingRescheduleHistory(@Param('bookingId') bookingId: string) {
    return this.rescheduleService.getHistoryForBooking(bookingId);
  }

  @Post('bookings/:bookingId/refund')
  issueRefund(
    @Param('bookingId') bookingId: string,
    @Body('refundCents') refundCents: number,
    @Body('reason') reason: string,
    @Request() req: any,
  ) {
    return this.adminService.issueManualRefund(
      bookingId,
      refundCents,
      req.user.userId,
      reason,
    );
  }

  @Post('bookings/:bookingId/reschedule')
  adminReschedule(
    @Param('bookingId') bookingId: string,
    @Body() dto: AdminRescheduleDto,
    @Request() req: any,
  ) {
    return this.rescheduleService.adminReschedule(
      req.user.userId,
      bookingId,
      dto,
    );
  }

  @Post('bookings/:bookingId/cancel')
  adminCancel(
    @Param('bookingId') bookingId: string,
    @Body() dto: ReasonDto,
    @Request() req: any,
  ) {
    return this.rescheduleService.adminCancel(req.user.userId, bookingId, dto);
  }

  // ── Reschedule policy review (flagged / "Needs Review") ─────────────────

  @Get('reschedule/flagged')
  getFlaggedReschedules(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.rescheduleService.getFlaggedReschedules(+page, +limit);
  }

  @Post('reschedule/:id/review')
  reviewReschedulePenalty(
    @Param('id') id: string,
    @Body('decision') decision: 'WAIVE' | 'UPHOLD',
    @Request() req: any,
  ) {
    return this.rescheduleService.reviewPenalty(req.user.userId, id, decision);
  }

  // ── Teachers ──────────────────────────────────────────────────────────────

  @Get('teachers')
  getAllTeachers(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getAllTeachers(+page, +limit, status, search);
  }

  @Get('teachers/:teacherId')
  getTeacherDetail(@Param('teacherId') teacherId: string) {
    return this.adminService.getTeacherDetail(teacherId);
  }

  @Post('teachers/:teacherId/suspend')
  suspendTeacher(
    @Param('teacherId') teacherId: string,
    @Body('reason') reason: string,
    @Request() req: any,
  ) {
    return this.adminService.suspendTeacher(teacherId, reason, req.user.userId);
  }

  @Post('teachers/:teacherId/reinstate')
  reinstateTeacher(@Param('teacherId') teacherId: string, @Request() req: any) {
    return this.adminService.reinstateTeacher(teacherId, req.user.userId);
  }

  @Post('teachers/:teacherId/reset-strikes')
  resetStrikes(@Param('teacherId') teacherId: string, @Request() req: any) {
    return this.adminService.resetTeacherStrikes(teacherId, req.user.userId);
  }

  // ── Students ──────────────────────────────────────────────────────────────

  @Get('students')
  getAllStudents(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('status') status?: string,
    @Query('teacherId') teacherId?: string,
    @Query('courseId') courseId?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getAllStudents(+page, +limit, {
      status,
      teacherId,
      courseId,
      search,
    });
  }

  @Get('students/:studentUserId')
  getStudentDetail(@Param('studentUserId') studentUserId: string) {
    return this.adminService.getStudentDetail(studentUserId);
  }

  @Post('students/:studentUserId/assign-teacher')
  assignTeacher(
    @Param('studentUserId') studentUserId: string,
    @Body('teacherProfileId') teacherProfileId: string | null,
    @Request() req: any,
  ) {
    return this.adminService.assignTeacherToStudent(
      studentUserId,
      teacherProfileId ?? null,
      req.user.userId,
    );
  }

  @Post('students/:studentUserId/assign-course')
  assignCourse(
    @Param('studentUserId') studentUserId: string,
    @Body('courseId') courseId: string | null,
    @Request() req: any,
  ) {
    return this.adminService.assignCourseToStudent(
      studentUserId,
      courseId ?? null,
      req.user.userId,
    );
  }

  @Post('students/:studentUserId/pause')
  pauseStudent(
    @Param('studentUserId') studentUserId: string,
    @Body('reason') reason: string,
    @Request() req: any,
  ) {
    return this.adminService.pauseStudent(
      studentUserId,
      reason,
      req.user.userId,
    );
  }

  @Post('students/:studentUserId/resume')
  resumeStudent(
    @Param('studentUserId') studentUserId: string,
    @Request() req: any,
  ) {
    return this.adminService.resumeStudent(studentUserId, req.user.userId);
  }

  // ── Verification documents ─────────────────────────────────────────────

  @Get('teachers/:teacherId/documents')
  getTeacherDocuments(@Param('teacherId') teacherId: string) {
    return this.adminService.getTeacherDocuments(teacherId);
  }

  /**
   * POST /admin/teachers/:teacherId/documents/lock
   * Locks the Documents tab once verification is complete — teacher can
   * still view what they uploaded but can no longer reupload/remove.
   */
  @Post('teachers/:teacherId/documents/lock')
  lockTeacherDocuments(
    @Param('teacherId') teacherId: string,
    @Request() req: any,
  ) {
    return this.adminService.setDocsLocked(teacherId, true, req.user.userId);
  }

  @Post('teachers/:teacherId/documents/unlock')
  unlockTeacherDocuments(
    @Param('teacherId') teacherId: string,
    @Request() req: any,
  ) {
    return this.adminService.setDocsLocked(teacherId, false, req.user.userId);
  }

  // ── Payout details lock ──────────────────────────────────────────────────

  /**
   * POST /admin/teachers/:teacherId/payout/lock
   * Locks bank/bKash payout details after the first salary payout has been
   * sent, so the teacher can't self-serve changes afterward.
   */
  @Post('teachers/:teacherId/payout/lock')
  lockTeacherPayout(
    @Param('teacherId') teacherId: string,
    @Request() req: any,
  ) {
    return this.adminService.setPayoutLocked(teacherId, true, req.user.userId);
  }

  @Post('teachers/:teacherId/payout/unlock')
  unlockTeacherPayout(
    @Param('teacherId') teacherId: string,
    @Request() req: any,
  ) {
    return this.adminService.setPayoutLocked(teacherId, false, req.user.userId);
  }

  // ── Earnings ledger — the only place these entry types can be created ───

  @Post('teachers/:teacherId/ledger/ptm')
  logPtm(
    @Param('teacherId') teacherId: string,
    @Body() dto: LogPtmDto,
    @Request() req: any,
  ) {
    return this.payoutsService.triggerPtm(teacherId, {
      ...dto,
      adminUserId: req.user.userId,
    });
  }

  @Post('teachers/:teacherId/ledger/conversion')
  logConversion(
    @Param('teacherId') teacherId: string,
    @Body() dto: LogConversionDto,
    @Request() req: any,
  ) {
    return this.payoutsService.triggerConversion(teacherId, {
      ...dto,
      adminUserId: req.user.userId,
    });
  }

  @Post('teachers/:teacherId/ledger/penalty')
  logPenalty(
    @Param('teacherId') teacherId: string,
    @Body() dto: LogPenaltyDto,
    @Request() req: any,
  ) {
    return this.payoutsService.triggerPenalty(teacherId, {
      ...dto,
      adminUserId: req.user.userId,
    });
  }

  @Post('teachers/:teacherId/ledger/adjustment')
  logAdjustment(
    @Param('teacherId') teacherId: string,
    @Body() dto: LogAdjustmentDto,
    @Request() req: any,
  ) {
    return this.payoutsService.triggerAdjustment(teacherId, {
      ...dto,
      adminUserId: req.user.userId,
    });
  }

  @Get('teachers/:teacherId/ledger')
  getTeacherLedger(
    @Param('teacherId') teacherId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '30',
  ) {
    return this.payoutsService.listEntries(teacherId, +page, +limit);
  }

  @Get('teachers/:teacherId/ledger/report')
  async downloadTeacherReport(
    @Param('teacherId') teacherId: string,
    @Query('month') month: string | undefined,
    @Query('year') year: string | undefined,
    @Response() res: ExpressResponse,
  ) {
    const now = new Date();
    const m = month ? +month : now.getMonth() + 1;
    const y = year ? +year : now.getFullYear();

    const { buffer, teacherName } = await this.payoutsService.generateReport(
      teacherId,
      m,
      y,
    );

    const filename = `${teacherName.replace(/\s+/g, '_')}_payout_${y}-${String(m).padStart(2, '0')}.xlsx`;
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(buffer);
  }

  // ── Monthly payout workflow: Open → Finalized → Paid ────────────────────

  @Get('payouts/overview')
  getPayoutsOverview(
    @Query('month') month: string | undefined,
    @Query('year') year: string | undefined,
  ) {
    const now = new Date();
    const m = month ? +month : now.getMonth() + 1;
    const y = year ? +year : now.getFullYear();
    return this.payoutsService.getMonthlyOverview(m, y);
  }

  @Get('payouts/:teacherId/statement')
  getPayoutStatement(
    @Param('teacherId') teacherId: string,
    @Query('month') month: string | undefined,
    @Query('year') year: string | undefined,
  ) {
    const now = new Date();
    const m = month ? +month : now.getMonth() + 1;
    const y = year ? +year : now.getFullYear();
    return this.payoutsService.getStatement(teacherId, m, y);
  }

  @Post('payouts/:teacherId/finalize')
  finalizeMonth(
    @Param('teacherId') teacherId: string,
    @Body('month') month: number,
    @Body('year') year: number,
    @Request() req: any,
  ) {
    return this.payoutsService.finalizeMonth(
      teacherId,
      month,
      year,
      req.user.userId,
    );
  }

  @Post('payouts/:teacherId/mark-paid')
  markPaid(
    @Param('teacherId') teacherId: string,
    @Body('month') month: number,
    @Body('year') year: number,
    @Request() req: any,
  ) {
    return this.payoutsService.markPaid(
      teacherId,
      month,
      year,
      req.user.userId,
    );
  }
}
