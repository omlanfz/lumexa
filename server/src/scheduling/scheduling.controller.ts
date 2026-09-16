// FILE PATH: server/src/scheduling/scheduling.controller.ts

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { SchedulingService } from './scheduling.service';
import { SetScheduleDto } from './dto/set-schedule.dto';

@Controller()
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class SchedulingController {
  constructor(private readonly scheduling: SchedulingService) {}

  // ── Admin: view / set a student's recurring schedule + generated lessons ──

  @Get('admin/students/:studentUserId/schedule')
  @Roles(Role.ADMIN)
  getStudentSchedule(@Param('studentUserId') studentUserId: string) {
    return this.scheduling.getStudentSchedule(studentUserId);
  }

  @Post('admin/students/:studentUserId/schedule')
  @Roles(Role.ADMIN)
  setStudentSchedule(
    @Param('studentUserId') studentUserId: string,
    @Body() dto: SetScheduleDto,
    @Request() req: any,
  ) {
    return this.scheduling.setStudentSchedule(
      studentUserId,
      dto,
      req.user.userId,
    );
  }

  @Delete('admin/students/:studentUserId/schedule')
  @Roles(Role.ADMIN)
  async clearStudentSchedule(@Param('studentUserId') studentUserId: string) {
    await this.scheduling.clearStudentSchedule(studentUserId);
    return { success: true };
  }

  // ── Teacher: booked lesson slots for /schedule ────────────────────────────

  @Get('teachers/me/scheduled-lessons')
  @Roles(Role.TEACHER)
  getMyScheduledLessons(@Request() req: any) {
    return this.scheduling.getTeacherScheduledLessons(req.user.userId);
  }

  // ── Student: own generated lessons for the Learning hub ───────────────────

  @Get('students/me/scheduled-lessons')
  @Roles(Role.STUDENT)
  getMyLessons(
    @Request() req: any,
    @Query('status') status?: 'upcoming' | 'completed',
  ) {
    return this.scheduling.getStudentScheduledLessons(req.user.userId, status);
  }
}
