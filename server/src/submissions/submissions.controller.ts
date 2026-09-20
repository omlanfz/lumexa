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
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SubmissionsService } from './submissions.service';
import { ReviewSubmissionDto, SubmitHomeworkDto } from './dto/submissions.dto';

@Controller('submissions')
@UseGuards(AuthGuard('jwt'))
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  /** POST /submissions — student submits (or resubmits) homework for a
   * completed scheduled lesson. */
  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.STUDENT)
  submit(@Request() req: any, @Body() dto: SubmitHomeworkDto) {
    return this.submissionsService.submitHomework(req.user.userId, dto);
  }

  /** GET /submissions/pending-count — teacher dashboard card. */
  @Get('pending-count')
  @UseGuards(RolesGuard)
  @Roles(Role.TEACHER)
  pendingCount(@Request() req: any) {
    return this.submissionsService.getPendingCountForTeacher(req.user.userId);
  }

  /** GET /submissions?status=PENDING|REVIEWED — teacher's own review queue. */
  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.TEACHER)
  list(@Request() req: any, @Query('status') status?: string) {
    const parsed =
      status === 'PENDING' || status === 'REVIEWED'
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

  /** PATCH /submissions/:id/review — teacher marks reviewed, optional feedback. */
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
