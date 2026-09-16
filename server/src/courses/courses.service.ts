import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { seedCourseCatalog } from './course-catalog.seed';

@Injectable()
export class CoursesService implements OnModuleInit {
  private readonly logger = new Logger(CoursesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Ensures the default 7-course catalog (Odyssey + 6 specialized paths)
   *  exists on every boot — idempotent, so this never duplicates courses or
   *  touches lessons an admin has already edited (see seedCourseCatalog). */
  async onModuleInit() {
    try {
      const results = await seedCourseCatalog(this.prisma);
      const created = results.filter((r) => r.created).length;
      if (created > 0) {
        this.logger.log(`Seeded ${created} default course(s) into the catalog.`);
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

  async findBySlug(slug: string) {
    const course = await this.prisma.course.findUnique({
      where: { slug },
      include: { lessons: { orderBy: { order: 'asc' } } },
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

  // ─── Lessons (simple CRUD, no separate curriculum system) ─────────────────

  async createLesson(courseId: string, dto: CreateLessonDto) {
    await this.findById(courseId);
    return this.prisma.lesson.create({
      data: {
        courseId,
        title: dto.title,
        order: dto.order,
        duration: dto.duration ?? 60,
      },
    });
  }

  async updateLesson(lessonId: string, dto: Partial<CreateLessonDto>) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');
    return this.prisma.lesson.update({ where: { id: lessonId }, data: dto });
  }

  async deleteLesson(lessonId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');
    await this.prisma.lesson.delete({ where: { id: lessonId } });
    return { success: true };
  }
}
