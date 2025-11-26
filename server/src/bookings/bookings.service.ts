import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService) {}

  // 1. Marketplace: Get All Teachers with OPEN Shifts
  async getMarketplace() {
    return this.prisma.teacherProfile.findMany({
      include: {
        user: { select: { fullName: true } }, // Get Teacher Name
        shifts: {
          where: { isBooked: false, start: { gt: new Date() } }, // Only future, open shifts
          orderBy: { start: 'asc' },
        },
      },
    });
  }

  // 2. Book a Slot
  async bookShift(userId: string, shiftId: string, studentId: string) {
    // Verify the Student belongs to this Parent (Security)
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, parentId: userId },
    });
    if (!student)
      throw new BadRequestException('Cadet not found or unauthorized.');

    // Verify Shift is open
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
    });
    if (!shift || shift.isBooked)
      throw new BadRequestException('Mission slot unavailable.');

    // Transaction: Create Booking + Mark Shift as Booked
    return this.prisma.$transaction([
      this.prisma.booking.create({
        data: { shiftId, studentId },
      }),
      this.prisma.shift.update({
        where: { id: shiftId },
        data: { isBooked: true },
      }),
    ]);
  }
}
