import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ShiftsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, start: string, end: string) {
    const startTime = new Date(start);
    const endTime = new Date(end);
    const now = new Date();

    // Validation: cannot create a shift in the past (5-min buffer for latency)
    if (startTime.getTime() < now.getTime() - 5 * 60 * 1000) {
      throw new BadRequestException('Shift start time cannot be in the past.');
    }

    // Validation: end must be after start
    if (endTime <= startTime) {
      throw new BadRequestException(
        'Shift end time must be after the start time.',
      );
    }

    // Validation: minimum 30-minute slot
    const durationMinutes =
      (endTime.getTime() - startTime.getTime()) / (1000 * 60);
    if (durationMinutes < 30) {
      throw new BadRequestException('Shifts must be at least 30 minutes long.');
    }

    // Validation: maximum 4-hour slot
    if (durationMinutes > 240) {
      throw new BadRequestException(
        'Shifts cannot exceed 4 hours. Please split into multiple shifts.',
      );
    }

    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { userId },
    });

    if (!teacher) {
      throw new BadRequestException(
        'Teacher profile not found. Please complete your profile first.',
      );
    }

    if (teacher.isSuspended) {
      throw new ForbiddenException(
        'Your account is suspended. Please contact support.',
      );
    }

    // Check for overlapping shifts from this teacher
    const overlap = await this.prisma.shift.findFirst({
      where: {
        teacherId: teacher.id,
        OR: [{ start: { lt: endTime }, end: { gt: startTime } }],
      },
    });

    if (overlap) {
      throw new BadRequestException(
        'This time slot overlaps with one of your existing shifts.',
      );
    }

    return this.prisma.shift.create({
      data: {
        teacherId: teacher.id,
        start: startTime,
        end: endTime,
      },
    });
  }

  async findAll(userId: string) {
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { userId },
    });

    if (!teacher) return [];

    return this.prisma.shift.findMany({
      where: { teacherId: teacher.id },
      orderBy: { start: 'asc' },
      include: {
        booking: {
          include: { student: true },
        },
      },
    });
  }
}
