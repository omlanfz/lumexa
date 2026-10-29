// FILE PATH: server/src/submissions/submissions.controller.ts

import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role, SubmissionStatus } from '@prisma/client';
import { Header } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { HomeworkFilesService } from './homework-files.service';
import { SubmissionsService } from './submissions.service';
import { ReviewSubmissionDto, SubmitHomeworkDto } from './dto/submissions.dto';

@Controller('submissions')
@UseGuards(AuthGuard('jwt'))
export class SubmissionsController {
  constructor(
    private readonly submissionsService: SubmissionsService,
    private readonly homeworkFiles: HomeworkFilesService,
  ) {}

  /** POST /submissions — student submits (or resubmits) homework for a
   * completed scheduled lesson. */
  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.STUDENT)
  submit(@Request() req: any, @Body() dto: SubmitHomeworkDto) {
    return this.submissionsService.submitHomework(req.user.userId, dto);
  }

  /** GET /submissions/files/:fileId/access — how to open one homework file: the
   * Lumexa viewer (code, notebooks) or a short-lived signed link (PDFs and
   * images open in the browser; everything else downloads). Only the file's
   * student, the teacher it was sent to, or an admin. */
  @Get('files/:fileId/access')
  @UseGuards(RolesGuard)
  @Roles(Role.STUDENT, Role.TEACHER, Role.ADMIN)
  @Header('Cache-Control', 'no-store')
  fileAccess(
    @Request() req: any,
    @Param('fileId') fileId: string,
    @Query('download') download?: string,
  ) {
    return this.homeworkFiles.accessFor(req.user, fileId, {
      download: download === '1' || download === 'true',
    });
  }

  /** GET /submissions/files/:fileId/text — a code or notebook file's text, as
   * JSON, for the viewer page to show as plain text. */
  @Get('files/:fileId/text')
  @UseGuards(RolesGuard)
  @Roles(Role.STUDENT, Role.TEACHER, Role.ADMIN)
  @Header('Cache-Control', 'no-store')
  @Header('X-Content-Type-Options', 'nosniff')
  fileText(@Request() req: any, @Param('fileId') fileId: string) {
    return this.homeworkFiles.textFor(req.user, fileId);
  }

  /** GET /submissions/pending-count — teacher dashboard card. */
  @Get('pending-count')
  @UseGuards(RolesGuard)
  @Roles(Role.TEACHER)
  pendingCount(@Request() req: any) {
    return this.submissionsService.getPendingCountForTeacher(req.user.userId);
  }

  /** GET /submissions?status=PENDING|APPROVED|NEEDS_CHANGES — teacher's own
   * review queue. */
  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.TEACHER)
  list(@Request() req: any, @Query('status') status?: string) {
    const parsed =
      status === 'PENDING' ||
      status === 'APPROVED' ||
      status === 'NEEDS_CHANGES'
        ? (status as SubmissionStatus)
        : undefined;
    return this.submissionsService.listForTeacher(req.user.userId, parsed);
  }

  /** GET /submissions/student/:studentUserId — one student's submissions,
   * for the teacher-facing student profile. */
  @Get('student/:studentUserId')
  @UseGuards(RolesGuard)
  @Roles(Role.TEACHER)
  listForStudent(
    @Request() req: any,
    @Param('studentUserId') studentUserId: string,
  ) {
    return this.submissionsService.listForTeacherAndStudent(
      req.user.userId,
      studentUserId,
    );
  }

  /** PATCH /submissions/:id/review — teacher approves or requests changes,
   * with an optional rating and feedback (required for NEEDS_CHANGES). */
  @Patch(':id/review')
  @UseGuards(RolesGuard)
  @Roles(Role.TEACHER)
  review(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: ReviewSubmissionDto,
  ) {
    return this.submissionsService.review(id, req.user.userId, dto);
  }
}
