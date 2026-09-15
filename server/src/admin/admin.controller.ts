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

  @Get('students')
  getAllStudents(@Query('page') page = '1', @Query('limit') limit = '20') {
    return this.adminService.getAllStudents(+page, +limit);
  }

  @Post('students/:studentUserId/assign-teacher')
  assignTeacher(
    @Param('studentUserId') studentUserId: string,
    @Body('teacherProfileId') teacherProfileId: string | null,
  ) {
    return this.adminService.assignTeacherToStudent(
      studentUserId,
      teacherProfileId ?? null,
    );
  }

  // ── Reschedule policy review ─────────────────────────────────────────────

  @Post('reschedule/:id/review')
  reviewReschedulePenalty(
    @Param('id') id: string,
    @Body('decision') decision: 'WAIVE' | 'UPHOLD',
    @Request() req: any,
  ) {
    return this.rescheduleService.reviewPenalty(req.user.userId, id, decision);
  }

  // ── Verification documents ─────────────────────────────────────────────

  @Get('teachers/:teacherId/documents')
  getTeacherDocuments(@Param('teacherId') teacherId: string) {
    return this.adminService.getTeacherDocuments(teacherId);
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
}
