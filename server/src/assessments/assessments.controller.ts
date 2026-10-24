// FILE PATH: server/src/assessments/assessments.controller.ts

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AssessmentsService } from './assessments.service';
import { ClassTestsService } from './class-tests.service';
import {
  CreateMCQQuestionDto,
  CreatePracticalQuestionDto,
  UpdateAssessmentDto,
  UpdateMCQQuestionDto,
  UpdatePracticalQuestionDto,
} from '../curriculum/dto/curriculum.dto';
import {
  AttachBankDto,
  RecordVivaDto,
  SaveAnswerDto,
  SaveCodeDto,
  StartAttemptDto,
  SubmitAttemptDto,
} from './dto/assessment.dto';

// Autosave fires once per answer click and per pause in typing, so these two
// routes get a far higher ceiling than the app-wide 20 requests/minute.
const AUTOSAVE_LIMIT = { default: { limit: 600, ttl: 60_000 } };

@Controller('assessments')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AssessmentsController {
  constructor(
    private readonly assessments: AssessmentsService,
    private readonly classTests: ClassTestsService,
  ) {}

  // ── Student attempt flow ──────────────────────────────────────────────────

  @Post(':id/attempts/start')
  @Roles(Role.STUDENT)
  startAttempt(
    @Param('id') id: string,
    @Body() dto: StartAttemptDto,
    @Req() req: any,
  ) {
    return this.assessments.startAttempt(
      id,
      req.user.userId,
      dto.scheduledLessonId,
    );
  }

  @Get('attempts/:attemptId')
  getAttempt(@Param('attemptId') attemptId: string, @Req() req: any) {
    return this.assessments.getAttempt(attemptId, req.user);
  }

  /** Is my test still open? Polled by the test tab every few seconds. */
  @Get('attempts/:attemptId/state')
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  getAttemptState(@Param('attemptId') attemptId: string, @Req() req: any) {
    return this.assessments.getAttemptState(attemptId, req.user);
  }

  @Post('attempts/:attemptId/answers')
  @Roles(Role.STUDENT)
  @Throttle(AUTOSAVE_LIMIT)
  saveAnswer(
    @Param('attemptId') attemptId: string,
    @Body() dto: SaveAnswerDto,
    @Req() req: any,
  ) {
    return this.assessments.saveAnswer(attemptId, dto, req.user.userId);
  }

  @Post('attempts/:attemptId/code')
  @Roles(Role.STUDENT)
  @Throttle(AUTOSAVE_LIMIT)
  saveCode(
    @Param('attemptId') attemptId: string,
    @Body() dto: SaveCodeDto,
    @Req() req: any,
  ) {
    return this.assessments.saveCode(attemptId, dto, req.user.userId);
  }

  @Post('attempts/:attemptId/submit')
  @Roles(Role.STUDENT)
  submitAttempt(
    @Param('attemptId') attemptId: string,
    @Body() dto: SubmitAttemptDto,
    @Req() req: any,
  ) {
    return this.assessments.submitAttempt(attemptId, req.user.userId, dto);
  }

  // ── Class-level status (student launcher + teacher monitor) ───────────────

  @Get('scheduled-lessons/:scheduledLessonId/status')
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  getLessonTestStatus(
    @Param('scheduledLessonId') scheduledLessonId: string,
    @Req() req: any,
  ) {
    return this.assessments.getLessonTestStatus(scheduledLessonId, req.user);
  }

  // ── Teacher: watch the class take the test, and lock it ───────────────────
  // `scheduledLessonId` is the teacher's own class (any learner's class in the
  // group works for the overview and for lock-class).

  /** Every learner's progress in this class, at a glance. */
  @Get('scheduled-lessons/:scheduledLessonId/class-status')
  @Roles(Role.TEACHER, Role.ADMIN)
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  getClassStatus(
    @Param('scheduledLessonId') scheduledLessonId: string,
    @Req() req: any,
  ) {
    return this.classTests.getOverview(scheduledLessonId, req.user);
  }

  /** "Lock & submit" for ONE learner. */
  @Post('scheduled-lessons/:scheduledLessonId/lock')
  @Roles(Role.TEACHER, Role.ADMIN)
  lockStudentTest(
    @Param('scheduledLessonId') scheduledLessonId: string,
    @Req() req: any,
  ) {
    return this.classTests.lockStudent(scheduledLessonId, req.user);
  }

  /** "Time's up" — lock & submit every learner in the class. */
  @Post('scheduled-lessons/:scheduledLessonId/lock-class')
  @Roles(Role.TEACHER, Role.ADMIN)
  lockClassTests(
    @Param('scheduledLessonId') scheduledLessonId: string,
    @Req() req: any,
  ) {
    return this.classTests.lockClass(scheduledLessonId, req.user);
  }

  /** Reopen a test that was closed before the learner started it. */
  @Post('scheduled-lessons/:scheduledLessonId/reopen')
  @Roles(Role.TEACHER, Role.ADMIN)
  reopenStudentTest(
    @Param('scheduledLessonId') scheduledLessonId: string,
    @Req() req: any,
  ) {
    return this.classTests.reopenStudent(scheduledLessonId, req.user);
  }

  /** Teacher's preview of the test they are running. Answers are only sent
   *  when `?answers=1` is passed, so they are never on screen by accident. */
  @Get(':id/preview')
  @Roles(Role.TEACHER, Role.ADMIN)
  preview(
    @Param('id') id: string,
    @Query('answers') answers: string | undefined,
    @Req() req: any,
  ) {
    return this.assessments.previewForTeacher(
      id,
      req.user,
      answers === '1' || answers === 'true',
    );
  }

  // ── Legacy viva (superseded by the coding project; old attempts only) ─────

  @Post('attempts/:attemptId/viva')
  @Roles(Role.TEACHER, Role.ADMIN)
  recordViva(
    @Param('attemptId') attemptId: string,
    @Body() dto: RecordVivaDto,
    @Req() req: any,
  ) {
    return this.assessments.recordViva(attemptId, dto, req.user);
  }

  // ── Results ────────────────────────────────────────────────────────────────

  @Get('students/:studentUserId/attempts')
  listForStudent(
    @Param('studentUserId') studentUserId: string,
    @Req() req: any,
  ) {
    return this.assessments.listAttemptsForStudent(studentUserId, req.user);
  }

  @Get('courses/:courseId/attempts')
  listForCourse(@Param('courseId') courseId: string, @Req() req: any) {
    return this.assessments.listAttemptsForCourse(courseId, req.user);
  }

  // ── Admin: question banks ─────────────────────────────────────────────────

  /** Banks a test lesson can be linked to (the "reuse an existing bank" picker). */
  @Get('banks')
  @Roles(Role.ADMIN)
  listBanks() {
    return this.assessments.listLinkableBanks();
  }

  /** Gives a test lesson that has no assessment one — linked to an existing
   *  bank, or an empty bank of its own. */
  @Post('lessons/:lessonId/bank')
  @Roles(Role.ADMIN)
  attachBank(@Param('lessonId') lessonId: string, @Body() dto: AttachBankDto) {
    return this.assessments.attachBankToLesson(
      lessonId,
      dto.sourceAssessmentId,
    );
  }

  @Get(':id/admin')
  @Roles(Role.ADMIN)
  getAssessmentAdmin(@Param('id') id: string) {
    return this.assessments.getAssessmentAdmin(id);
  }

  @Patch(':id/settings')
  @Roles(Role.ADMIN)
  updateSettings(@Param('id') id: string, @Body() dto: UpdateAssessmentDto) {
    return this.assessments.updateAssessmentSettings(
      id,
      dto as Record<string, unknown>,
    );
  }

  @Post(':id/mcq-questions')
  @Roles(Role.ADMIN)
  createMCQ(@Param('id') id: string, @Body() dto: CreateMCQQuestionDto) {
    return this.assessments.createMCQQuestion(
      id,
      dto as unknown as Record<string, unknown>,
    );
  }

  @Patch('mcq-questions/:qid')
  @Roles(Role.ADMIN)
  updateMCQ(@Param('qid') qid: string, @Body() dto: UpdateMCQQuestionDto) {
    return this.assessments.updateMCQQuestion(
      qid,
      dto as unknown as Record<string, unknown>,
    );
  }

  @Delete('mcq-questions/:qid')
  @Roles(Role.ADMIN)
  deleteMCQ(@Param('qid') qid: string) {
    return this.assessments.deleteMCQQuestion(qid);
  }

  @Post(':id/practical-questions')
  @Roles(Role.ADMIN)
  createPractical(
    @Param('id') id: string,
    @Body() dto: CreatePracticalQuestionDto,
  ) {
    return this.assessments.createPracticalQuestion(
      id,
      dto as unknown as Record<string, unknown>,
    );
  }

  @Patch('practical-questions/:qid')
  @Roles(Role.ADMIN)
  updatePractical(
    @Param('qid') qid: string,
    @Body() dto: UpdatePracticalQuestionDto,
  ) {
    return this.assessments.updatePracticalQuestion(
      qid,
      dto as unknown as Record<string, unknown>,
    );
  }

  @Delete('practical-questions/:qid')
  @Roles(Role.ADMIN)
  deletePractical(@Param('qid') qid: string) {
    return this.assessments.deletePracticalQuestion(qid);
  }
}
