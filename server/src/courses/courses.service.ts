import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { SchedulingService } from '../scheduling/scheduling.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { seedCourseCatalog } from './course-catalog.seed';

@Injectable()
export class CoursesService implements OnModuleInit {
  private readonly logger = new Logger(CoursesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scheduling: SchedulingService,
  ) {}

  /** Ensures the default 7-course catalog (Odyssey + 6 specialized paths)
   *  exists on every boot — idempotent, so this never duplicates courses or
   *  touches lessons an admin has already edited (see seedCourseCatalog). */
  async onModuleInit() {
    try {
      const results = await seedCourseCatalog(this.prisma, this.logger, (courseId, actorId) =>
        this.scheduling.reconcileCourseSchedules(courseId, actorId),
      );
      const created = results.filter((r) => r.created).length;
      if (created > 0) {
        this.logger.log(`Seeded ${created} default course(s) into the catalog.`);
      }
      const backfill = await this.scheduling.backfillLessonLinks();
      if (backfill.updated > 0) {
        this.logger.log(`Backfilled lessonId on ${backfill.updated} scheduled lesson(s).`);
      }
    } catch (err) {
      this.logger.error('Failed to seed default course catalog.', err as Error);
    }
  }

  listActive() {
    return this.prisma.course.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { ageMin: 'asc' }],
    });
  }

  /** Admin — every course regardless of active state, with lesson counts. */
  listAll() {
    return this.prisma.course.findMany({
      include: {
        _count: { select: { lessons: true, assignedStudents: true } },
      },
      orderBy: [{ category: 'asc' }, { title: 'asc' }],
    });
  }

  // Public (marketing/catalog) — deliberately thin: title/order/duration/type
  // only. Rich content (objectives, contentMarkdown, homework, code, MCQ
  // banks) is NEVER exposed here — that's gated per the Lesson Details
  // access rules and only ever served via CurriculumService
  // (/curriculum/scheduled-lessons/:id/details for a student's own
  // completed session, /curriculum/courses/:id/structure for the
  // admin/assigned-teacher curriculum editor).
  async findBySlug(slug: string) {
    const course = await this.prisma.course.findUnique({
      where: { slug },
      include: {
        lessons: {
          orderBy: { order: 'asc' },
          select: { id: true, title: true, order: true, duration: true, type: true, courseId: true, createdAt: true },
        },
      },
    });
    if (!course) throw new NotFoundException('Course not found');
    return course;
  }

  create(dto: CreateCourseDto) {
    return this.prisma.course.create({ data: dto });
  }

  async update(id: string, dto: Partial<CreateCourseDto>) {
    await this.findById(id);
    return this.prisma.course.update({ where: { id }, data: dto });
  }

  private async findById(id: string) {
    const course = await this.prisma.course.findUnique({ where: { id } });
    if (!course) throw new NotFoundException('Course not found');
    return course;
  }

  // ─── Lessons ────────────────────────────────────────────────────────────
  //
  // Lesson rows here are the same canonical session sequence the curriculum
  // module (modules/materials/assessments) and student/teacher dashboards
  // all read — this admin editor IS the source of truth (see requirement
  // #10). Any change that shifts the numbering (add/remove/reorder) fires
  // SchedulingService.reconcileCourseSchedules so every enrolled student's
  // future schedule picks it up automatically (requirement #11); a plain
  // title/content edit does not renumber anything, so it skips reconciling.

  async createLesson(courseId: string, dto: CreateLessonDto, actorId: string) {
    await this.findById(courseId);
    const lesson = await this.prisma.lesson.create({
      data: {
        courseId,
        title: dto.title,
        order: dto.order,
        duration: dto.duration ?? 60,
      },
    });
    await this.reconcileSafely(courseId, actorId);
    return lesson;
  }

  async updateLesson(lessonId: string, dto: Partial<CreateLessonDto>, actorId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');
    const updated = await this.prisma.lesson.update({ where: { id: lessonId }, data: dto });
    if (dto.order !== undefined && dto.order !== lesson.order) {
      await this.reconcileSafely(lesson.courseId, actorId);
    }
    return updated;
  }

  async deleteLesson(lessonId: string, actorId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');
    await this.prisma.lesson.delete({ where: { id: lessonId } });
    await this.reconcileSafely(lesson.courseId, actorId);
    return { success: true };
  }

  private async reconcileSafely(courseId: string, actorId: string) {
    try {
      await this.scheduling.reconcileCourseSchedules(courseId, actorId);
    } catch (err) {
      this.logger.error(`Schedule reconciliation failed for course ${courseId}`, err as Error);
    }
  }
}
