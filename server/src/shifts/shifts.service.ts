import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ShiftsService {
  constructor(private prisma: PrismaService) {}

  // 1. Create a Shift
  async create(userId: string, start: string, end: string) {
    const startTime = new Date(start);
    const endTime = new Date(end);
    const now = new Date();

    // VALIDATION 1: Cannot book in the past
    // We add a small 5-minute buffer (300000ms) to account for network latency
    if (startTime.getTime() < now.getTime() - 300000) {
      throw new BadRequestException('Mission Start cannot be in the past.');
    }

    // VALIDATION 2: End time must be AFTER Start time
    if (endTime <= startTime) {
      throw new BadRequestException('Mission End must be after Mission Start.');
    }

    // Find the Teacher Profile
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { userId },
    });

    if (!teacher) {
      throw new BadRequestException('Pilot Profile missing. Access Denied.');
    }

    return this.prisma.shift.create({
      data: {
        teacherId: teacher.id,
        start: startTime,
        end: endTime,
      },
    });
  }

  // 2. Get All Shifts
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
          include: { student: true }, // <--- NOW INCLUDES STUDENT INFO
        },
      },
    });
  }
}
