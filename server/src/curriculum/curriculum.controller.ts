// FILE PATH: server/src/curriculum/curriculum.controller.ts

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Response,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import type { Response as ExpressResponse } from 'express';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CurriculumService } from './curriculum.service';
import { CurriculumDocumentsService } from './curriculum-documents.service';
import {
  CreateModuleDto,
  CreateProjectDto,
  ImportLessonDto,
  UpdateLessonContentDto,
  UpdateModuleDto,
  UpdateProjectDto,
} from './dto/curriculum.dto';

@Controller('curriculum')
@UseGuards(AuthGuard('jwt'))
export class CurriculumController {
  constructor(
    private readonly curriculum: CurriculumService,
    private readonly documents: CurriculumDocumentsService,
  ) {}

  // ── Lesson Details (student sees own; teacher/admin see any assigned course) ──

  @Get('scheduled-lessons/:id/details')
  getScheduledLessonDetails(@Param('id') id: string, @Req() req: any) {
    return this.curriculum.getScheduledLessonDetails(id, req.user);
  }

  // Teacher/admin curriculum browsing — a catalog Lesson, not tied to one
  // specific scheduled class. Always unlocked for the assigned teacher.
  @Get('lessons/:id/details')
  getCatalogLessonDetails(@Param('id') id: string, @Req() req: any) {
    return this.curriculum.getCatalogLessonDetails(id, req.user);
  }

  // ── Admin/teacher: full course structure ──────────────────────────────────

  @Get('courses/:courseId/structure')
  getCourseStructure(@Param('courseId') courseId: string, @Req() req: any) {
    return this.curriculum.getCourseStructure(courseId, req.user);
  }

  // ── Custom Curriculum Builder ──────────────────────────────────────────────

  /** Every default curriculum's LEARNING lessons, grouped by course ->
   * module, for the "reuse an existing lesson" picker. */
  @Get('reusable-lessons')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  getReusableLessons() {
    return this.curriculum.getReusableLessons();
  }

  /** Copies a default-curriculum lesson's content into a custom course at
   * the given order — the source lesson/course is never modified. */
  @Post('courses/:courseId/lessons/import')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  importLesson(
    @Param('courseId') courseId: string,
    @Body() dto: ImportLessonDto,
  ) {
    return this.curriculum.importLesson(courseId, dto);
  }

  /** Generates (or regenerates) the branded, parent-ready curriculum PDF for
   * one custom course and caches its URL on Course.curriculumPdfUrl. */
  @Post('courses/:courseId/curriculum-pdf')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  generateCurriculumPdf(@Param('courseId') courseId: string) {
    return this.documents.generateCustomCurriculumPdf(courseId);
  }

  /** GET /curriculum/default-curriculum-summary.xlsx — one row per default
   * (non-custom) curriculum; auto-includes any added later. */
  @Get('default-curriculum-summary.xlsx')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  async downloadDefaultCurriculumSummary(@Response() res: ExpressResponse) {
    const buffer = await this.documents.buildDefaultCurriculumSummaryWorkbook();
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition':
        'attachment; filename="lumexa-default-curriculums.xlsx"',
    });
    res.send(buffer);
  }

  // ── Admin CRUD: modules ────────────────────────────────────────────────────

  @Post('courses/:courseId/modules')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  createModule(
    @Param('courseId') courseId: string,
    @Body() dto: CreateModuleDto,
  ) {
    return this.curriculum.createModule(courseId, dto);
  }

  @Patch('modules/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  updateModule(@Param('id') id: string, @Body() dto: UpdateModuleDto) {
    return this.curriculum.updateModule(id, dto);
  }

  @Delete('modules/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  deleteModule(@Param('id') id: string) {
    return this.curriculum.deleteModule(id);
  }

  // ── Admin CRUD: projects ───────────────────────────────────────────────────

  @Post('modules/:moduleId/projects')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  createProject(
    @Param('moduleId') moduleId: string,
    @Body() dto: CreateProjectDto,
  ) {
    return this.curriculum.createProject(moduleId, dto);
  }

  @Patch('projects/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  updateProject(@Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.curriculum.updateProject(id, dto);
  }

  @Delete('projects/:id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  deleteProject(@Param('id') id: string) {
    return this.curriculum.deleteProject(id);
  }

  // ── Admin: rich lesson content ─────────────────────────────────────────────

  @Patch('lessons/:id/content')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  updateLessonContent(
    @Param('id') id: string,
    @Body() dto: UpdateLessonContentDto,
  ) {
    return this.curriculum.updateLessonContent(id, dto);
  }
}
