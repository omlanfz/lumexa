// FILE PATH: server/src/curriculum/curriculum.controller.ts

import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CurriculumService } from './curriculum.service';
import {
  CreateModuleDto,
  CreateProjectDto,
  UpdateLessonContentDto,
  UpdateModuleDto,
  UpdateProjectDto,
} from './dto/curriculum.dto';

@Controller('curriculum')
@UseGuards(AuthGuard('jwt'))
export class CurriculumController {
  constructor(private readonly curriculum: CurriculumService) {}

  // ── Lesson Details (student sees own; teacher/admin see any assigned course) ──

  @Get('scheduled-lessons/:id/details')
  getScheduledLessonDetails(@Param('id') id: string, @Req() req: any) {
    return this.curriculum.getScheduledLessonDetails(id, req.user);
  }

  // ── Admin/teacher: full course structure ──────────────────────────────────

  @Get('courses/:courseId/structure')
  getCourseStructure(@Param('courseId') courseId: string, @Req() req: any) {
    return this.curriculum.getCourseStructure(courseId, req.user);
  }

  // ── Admin CRUD: modules ────────────────────────────────────────────────────

  @Post('courses/:courseId/modules')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  createModule(@Param('courseId') courseId: string, @Body() dto: CreateModuleDto) {
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
  createProject(@Param('moduleId') moduleId: string, @Body() dto: CreateProjectDto) {
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
  updateLessonContent(@Param('id') id: string, @Body() dto: UpdateLessonContentDto) {
    return this.curriculum.updateLessonContent(id, dto);
  }
}
