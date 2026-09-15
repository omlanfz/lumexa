import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Role } from '@prisma/client';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  /** Admin — every course (active + inactive) for Manage Courses. Must be
   * registered before the public `:slug` route below. */
  @Get('admin/all')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  listAll() {
    return this.coursesService.listAll();
  }

  /** Public — list all active courses (for landing page & course catalog) */
  @Get()
  listActive() {
    return this.coursesService.listActive();
  }

  /** Public — get a single course by slug */
  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.coursesService.findBySlug(slug);
  }

  /** Admin — create a course */
  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateCourseDto) {
    return this.coursesService.create(dto);
  }

  /** Admin — update a course (including activate/deactivate via isActive) */
  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: Partial<CreateCourseDto>) {
    return this.coursesService.update(id, dto);
  }

  /** Admin — add a lesson to a course */
  @Post(':id/lessons')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  createLesson(@Param('id') id: string, @Body() dto: CreateLessonDto) {
    return this.coursesService.createLesson(id, dto);
  }

  /** Admin — update a lesson */
  @Patch('lessons/:lessonId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  updateLesson(
    @Param('lessonId') lessonId: string,
    @Body() dto: Partial<CreateLessonDto>,
  ) {
    return this.coursesService.updateLesson(lessonId, dto);
  }

  /** Admin — remove a lesson */
  @Delete('lessons/:lessonId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  deleteLesson(@Param('lessonId') lessonId: string) {
    return this.coursesService.deleteLesson(lessonId);
  }
}
