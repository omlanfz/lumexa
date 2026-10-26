// FILE PATH: server/src/batches/batches.controller.ts
//
// Admin-only (Operations) batch management. Teachers and students never see
// these routes: they see the batch through their own dashboards, which only
// ever return the batches the signed-in person teaches or belongs to.

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { IsISO8601, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { BatchesService } from './batches.service';
import { BatchSessionsService } from './batch-sessions.service';
import {
  AddBatchStudentDto,
  BatchScheduleDto,
  ChangeBatchTeacherDto,
  CreateBatchDto,
  EnrollStudentInBatchDto,
  UpdateBatchDto,
} from './dto/batch.dto';

class SessionRescheduleDto {
  @IsISO8601() newStart: string;
  @IsISO8601() newEnd: string;
}

class SessionReasonDto {
  @IsString() @IsNotEmpty() @MaxLength(1000) reason: string;
}

/** What the JWT guard puts on the request (see JwtStrategy.validate). */
interface AuthedRequest {
  user: { userId: string; role: string };
}

@Controller('admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.ADMIN)
export class BatchesController {
  constructor(
    private readonly batches: BatchesService,
    private readonly sessions: BatchSessionsService,
  ) {}

  // ── Batches ───────────────────────────────────────────────────────────────

  @Get('batches')
  list(
    @Query('status') status?: string,
    @Query('teacherId') teacherId?: string,
    @Query('courseId') courseId?: string,
    @Query('search') search?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.batches.listBatches(
      { status, teacherId, courseId, search },
      Math.max(1, Number(page) || 1),
      Math.min(100, Math.max(1, Number(limit) || 20)),
    );
  }

  @Post('batches')
  create(@Body() dto: CreateBatchDto, @Request() req: AuthedRequest) {
    return this.batches.createBatch(dto, req.user.userId);
  }

  @Get('batches/:batchId')
  detail(@Param('batchId') batchId: string) {
    return this.batches.getBatchDetail(batchId);
  }

  @Patch('batches/:batchId')
  update(
    @Param('batchId') batchId: string,
    @Body() dto: UpdateBatchDto,
    @Request() req: AuthedRequest,
  ) {
    return this.batches.updateBatch(batchId, dto, req.user.userId);
  }

  /** New first class date / weekly slots: rebuilds the classes still ahead. */
  @Put('batches/:batchId/schedule')
  changeSchedule(
    @Param('batchId') batchId: string,
    @Body() dto: BatchScheduleDto,
    @Request() req: AuthedRequest,
  ) {
    return this.batches.changeSchedule(batchId, dto, req.user.userId);
  }

  @Put('batches/:batchId/teacher')
  changeTeacher(
    @Param('batchId') batchId: string,
    @Body() dto: ChangeBatchTeacherDto,
    @Request() req: AuthedRequest,
  ) {
    return this.batches.changeTeacher(batchId, dto.teacherId, req.user.userId);
  }

  /** Students that could be added, with what stands in the way of each. */
  @Get('batches/:batchId/candidates')
  candidates(
    @Param('batchId') batchId: string,
    @Query('search') search?: string,
  ) {
    return this.batches.listCandidatesForBatch(batchId, search);
  }

  /** Adds a student (or moves them here from another batch). */
  @Post('batches/:batchId/students')
  addStudent(
    @Param('batchId') batchId: string,
    @Body() dto: AddBatchStudentDto,
    @Request() req: AuthedRequest,
  ) {
    return this.batches.enrollStudent({
      studentUserId: dto.studentUserId,
      batchId,
      decisions: dto.decisions,
      adminUserId: req.user.userId,
    });
  }

  @Delete('batches/:batchId/students/:studentUserId')
  removeStudent(
    @Param('batchId') batchId: string,
    @Param('studentUserId') studentUserId: string,
    @Request() req: AuthedRequest,
  ) {
    return this.batches.removeStudent(studentUserId, req.user.userId, batchId);
  }

  // ── From a student's own page ─────────────────────────────────────────────

  /** Every batch the student could join, most compatible first. */
  @Get('students/:studentUserId/batch-options')
  batchOptions(@Param('studentUserId') studentUserId: string) {
    return this.batches.listOptionsForStudent(studentUserId);
  }

  /** Enrolls the student in a batch — an existing one or a new one — switching
   * them from 1-to-1 or moving them from another batch. */
  @Post('students/:studentUserId/batch')
  enroll(
    @Param('studentUserId') studentUserId: string,
    @Body() dto: EnrollStudentInBatchDto,
    @Request() req: AuthedRequest,
  ) {
    return this.batches.enrollStudent({
      studentUserId,
      batchId: dto.batchId,
      newBatch: dto.newBatch,
      decisions: dto.decisions,
      adminUserId: req.user.userId,
    });
  }

  @Delete('students/:studentUserId/batch')
  leave(
    @Param('studentUserId') studentUserId: string,
    @Request() req: AuthedRequest,
  ) {
    return this.batches.removeStudent(studentUserId, req.user.userId);
  }

  // ── One class of a batch (the Classes page) ───────────────────────────────

  @Post('batch-sessions/:sessionId/reschedule')
  rescheduleSession(
    @Param('sessionId') sessionId: string,
    @Body() dto: SessionRescheduleDto,
    @Request() req: AuthedRequest,
  ) {
    return this.sessions.adminRescheduleSession(
      sessionId,
      new Date(dto.newStart),
      new Date(dto.newEnd),
      req.user.userId,
    );
  }

  @Post('batch-sessions/:sessionId/cancel')
  cancelSession(
    @Param('sessionId') sessionId: string,
    @Body() dto: SessionReasonDto,
    @Request() req: AuthedRequest,
  ) {
    return this.sessions.adminCancelSession(
      sessionId,
      dto.reason,
      req.user.userId,
    );
  }

  @Delete('batch-sessions/:sessionId')
  deleteSession(
    @Param('sessionId') sessionId: string,
    @Body('reason') reason: string | undefined,
    @Request() req: AuthedRequest,
  ) {
    return this.sessions.adminDeleteSession(sessionId, req.user.userId, reason);
  }
}
