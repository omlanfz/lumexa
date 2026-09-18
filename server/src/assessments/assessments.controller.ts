// FILE PATH: server/src/assessments/assessments.controller.ts

import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AssessmentsService } from './assessments.service';
import {
  CreateMCQQuestionDto,
  CreatePracticalQuestionDto,
  UpdateAssessmentDto,
  UpdateMCQQuestionDto,
  UpdatePracticalQuestionDto,
} from '../curriculum/dto/curriculum.dto';
import { RecordVivaDto, StartAttemptDto, SubmitMCQAnswerDto, SubmitPracticalDto } from './dto/assessment.dto';

@Controller('assessments')
@UseGuards(AuthGuard('jwt'))
export class AssessmentsController {
  constructor(private readonly assessments: AssessmentsService) {}

  // ── Student attempt flow ──────────────────────────────────────────────────

  @Post(':id/attempts/start')
  startAttempt(@Param('id') id: string, @Body() dto: StartAttemptDto, @Req() req: any) {
    return this.assessments.startAttempt(id, req.user.userId, dto.scheduledLessonId);
  }

  @Get('attempts/:attemptId')
  getAttempt(@Param('attemptId') attemptId: string, @Req() req: any) {
    return this.assessments.getAttempt(attemptId, req.user);
  }

  @Post('attempts/:attemptId/mcq-answer')
  submitMCQAnswer(@Param('attemptId') attemptId: string, @Body() dto: SubmitMCQAnswerDto, @Req() req: any) {
    return this.assessments.submitMCQAnswer(attemptId, dto, req.user.userId);
  }

  @Post('attempts/:attemptId/practical-submit')
  submitPractical(@Param('attemptId') attemptId: string, @Body() dto: SubmitPracticalDto, @Req() req: any) {
    return this.assessments.submitPractical(attemptId, dto, req.user.userId);
  }

  @Post('attempts/:attemptId/submit')
  submitAttempt(@Param('attemptId') attemptId: string, @Req() req: any) {
    return this.assessments.submitAttempt(attemptId, req.user.userId);
  }

  // ── Teacher/admin: viva (Final Test Part C) ───────────────────────────────

  @Post('attempts/:attemptId/viva')
  @UseGuards(RolesGuard)
  @Roles(Role.TEACHER, Role.ADMIN)
  recordViva(@Param('attemptId') attemptId: string, @Body() dto: RecordVivaDto, @Req() req: any) {
    return this.assessments.recordViva(attemptId, dto, req.user);
  }

  // ── Results ────────────────────────────────────────────────────────────────

  @Get('students/:studentUserId/attempts')
  listForStudent(@Param('studentUserId') studentUserId: string, @Req() req: any) {
    return this.assessments.listAttemptsForStudent(studentUserId, req.user);
  }

  @Get('courses/:courseId/attempts')
  listForCourse(@Param('courseId') courseId: string, @Req() req: any) {
    return this.assessments.listAttemptsForCourse(courseId, req.user);
  }

  // ── Admin: question bank + assessment settings ────────────────────────────

  @Get(':id/admin')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  getAssessmentAdmin(@Param('id') id: string) {
    return this.assessments.getAssessmentAdmin(id);
  }

  @Patch(':id/settings')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  updateSettings(@Param('id') id: string, @Body() dto: UpdateAssessmentDto) {
    return this.assessments.updateAssessmentSettings(id, dto as Record<string, unknown>);
  }

  @Post(':id/mcq-questions')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  createMCQ(@Param('id') id: string, @Body() dto: CreateMCQQuestionDto) {
    return this.assessments.createMCQQuestion(id, dto as unknown as Record<string, unknown>);
  }

  @Patch('mcq-questions/:qid')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  updateMCQ(@Param('qid') qid: string, @Body() dto: UpdateMCQQuestionDto) {
    return this.assessments.updateMCQQuestion(qid, dto as unknown as Record<string, unknown>);
  }

  @Delete('mcq-questions/:qid')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  deleteMCQ(@Param('qid') qid: string) {
    return this.assessments.deleteMCQQuestion(qid);
  }

  @Post(':id/practical-questions')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  createPractical(@Param('id') id: string, @Body() dto: CreatePracticalQuestionDto) {
    return this.assessments.createPracticalQuestion(id, dto as unknown as Record<string, unknown>);
  }

  @Patch('practical-questions/:qid')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  updatePractical(@Param('qid') qid: string, @Body() dto: UpdatePracticalQuestionDto) {
    return this.assessments.updatePracticalQuestion(qid, dto as unknown as Record<string, unknown>);
  }

  @Delete('practical-questions/:qid')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  deletePractical(@Param('qid') qid: string) {
    return this.assessments.deletePracticalQuestion(qid);
  }
}
