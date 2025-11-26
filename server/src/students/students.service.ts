import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService) {}

  // Create a student linked to the logged-in parent
  async create(userId: string, name: string, age: number) {
    return this.prisma.student.create({
      data: {
        name,
        age,
        parentId: userId,
      },
    });
  }

  // Get all students for the logged-in parent
  async findAll(userId: string) {
    return this.prisma.student.findMany({
      where: { parentId: userId },
      include: {
        bookings: {
          include: { shift: true }, // <--- NOW INCLUDES SHIFT DETAILS
        },
      },
    });
  }
}
