import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService) {}

  // ─── Get all students belonging to a parent ────────────────────────────────

  async findAllForParent(parentId: string) {
    return this.prisma.student.findMany({
      where: { parentId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        age: true,
        grade: true,
        subject: true,
        schoolName: true,
        timezone: true,
        createdAt: true,
        _count: {
          select: { bookings: true },
        },
      },
    });
  }

  // ─── Create a student under the authenticated parent ───────────────────────

  async create(parentId: string, dto: CreateStudentDto) {
    return this.prisma.student.create({
      data: {
        parentId,
        name: dto.name,
        age: dto.age,
        grade: dto.grade ?? null,
        subject: dto.subject ?? null,
        schoolName: dto.schoolName ?? null,
        timezone: dto.timezone ?? null,
      },
      select: {
        id: true,
        name: true,
        age: true,
        grade: true,
        subject: true,
        schoolName: true,
        timezone: true,
        createdAt: true,
      },
    });
  }

  // ─── Get a single student (verifies ownership) ────────────────────────────

  async findOne(studentId: string, parentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) throw new NotFoundException('Student not found.');
    if (student.parentId !== parentId)
      throw new ForbiddenException('You do not own this student profile.');

    return student;
  }
}
