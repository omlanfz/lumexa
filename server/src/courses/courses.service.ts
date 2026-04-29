import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  listActive() {
    return this.prisma.course.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { ageMin: 'asc' }],
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
}
