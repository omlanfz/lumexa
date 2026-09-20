import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
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

  /** Admin — add a lesson to a course. Renumbers/adds future schedule slots
   * for every enrolled student automatically (see CoursesService). */
  @Post(':id/lessons')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  createLesson(
    @Param('id') id: string,
    @Body() dto: CreateLessonDto,
    @Req() req: any,
  ) {
    return this.coursesService.createLesson(id, dto, req.user.userId);
  }

  /** Admin — update a lesson (reordering reconciles enrolled students' future schedule) */
  @Patch('lessons/:lessonId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  updateLesson(
    @Param('lessonId') lessonId: string,
    @Body() dto: Partial<CreateLessonDto>,
    @Req() req: any,
  ) {
    return this.coursesService.updateLesson(lessonId, dto, req.user.userId);
  }

  /** Admin — remove a lesson (reconciles enrolled students' future schedule) */
  @Delete('lessons/:lessonId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  deleteLesson(@Param('lessonId') lessonId: string, @Req() req: any) {
    return this.coursesService.deleteLesson(lessonId, req.user.userId);
  }

  /** Admin — permanently delete a course. Refuses if it has real class
   * history (see CoursesService.deleteCourse); must be registered after
   * `lessons/:lessonId` so that path never matches here. */
  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  deleteCourse(@Param('id') id: string, @Req() req: any) {
    return this.coursesService.deleteCourse(id, req.user.userId);
  }
}
