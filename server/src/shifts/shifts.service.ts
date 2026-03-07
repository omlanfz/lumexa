// FILE PATH: server/src/shifts/shifts.service.ts
//
// CHANGES vs previous version:
//
// 1. create() — now accepts recurring + recurWeeks parameters.
//    - Non-recurring (default): validates + creates a single shift, returns it.
//    - Recurring: validates the first week's slot, then creates N copies spaced
//      7 days apart, checking for overlaps on EACH copy independently.
//      Returns Shift[] (array) so the frontend can append all of them.
//
// 2. updateShift() — new method for PATCH /shifts/:id (reschedule).
//    - Verifies ownership, validates new times, checks overlaps (excluding self),
//      updates start/end, clears isBooked=false if no booking is attached.
//
// 3. deleteShift() — unchanged from previous version; it was already correct.
//    The 404 was caused by the missing @Delete(':id') in the controller, not
//    by anything in this service.

import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UpdateShiftDto } from './dto/update-shift.dto';

@Injectable()
export class ShiftsService {
  constructor(private prisma: PrismaService) {}

  // ─── Create (single or recurring) ─────────────────────────────────────────

  async create(
    userId: string,
    start: string,
    end: string,
    recurring = false,
    recurWeeks = 1,
  ) {
    const startTime = new Date(start);
    const endTime = new Date(end);
    const now = new Date();

    // ── Shared validations (apply to every copy) ───────────────────────────

    if (startTime.getTime() < now.getTime() - 5 * 60 * 1000) {
      throw new BadRequestException('Shift start time cannot be in the past.');
    }

    if (endTime <= startTime) {
      throw new BadRequestException(
        'Shift end time must be after the start time.',
      );
    }

    const durationMinutes =
      (endTime.getTime() - startTime.getTime()) / (1000 * 60);
    if (durationMinutes < 30) {
      throw new BadRequestException('Shifts must be at least 30 minutes long.');
    }
    if (durationMinutes > 240) {
      throw new BadRequestException(
        'Shifts cannot exceed 4 hours. Please split into multiple shifts.',
      );
    }

    // ── Resolve teacher profile ────────────────────────────────────────────

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

    // ── Single shift (non-recurring) ───────────────────────────────────────

    if (!recurring || recurWeeks <= 1) {
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
        data: { teacherId: teacher.id, start: startTime, end: endTime },
      });
    }

    // ── Recurring weekly shifts ────────────────────────────────────────────
    //
    // Creates `recurWeeks` copies, each shifted 7 days from the previous.
    // Validates overlaps for ALL copies before creating any — so a partial
    // failure (e.g. week 3 overlaps something) rejects the whole batch.

    const slots: Array<{ start: Date; end: Date }> = [];

    for (let week = 0; week < recurWeeks; week++) {
      const weekOffset = week * 7 * 24 * 60 * 60 * 1000;
      slots.push({
        start: new Date(startTime.getTime() + weekOffset),
        end: new Date(endTime.getTime() + weekOffset),
      });
    }

    // Pre-validate all slots for overlaps (single batch query per slot)
    const overlapErrors: string[] = [];
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const overlap = await this.prisma.shift.findFirst({
        where: {
          teacherId: teacher.id,
          OR: [{ start: { lt: slot.end }, end: { gt: slot.start } }],
        },
      });
      if (overlap) {
        const dateStr = slot.start.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        });
        overlapErrors.push(
          `Week ${i + 1} (${dateStr}) overlaps an existing shift`,
        );
      }
    }

    if (overlapErrors.length > 0) {
      throw new BadRequestException(
        `Recurring shift conflicts detected:\n${overlapErrors.join('\n')}`,
      );
    }

    // All clear — create all copies in a transaction
    const created = await this.prisma.$transaction(
      slots.map((slot) =>
        this.prisma.shift.create({
          data: { teacherId: teacher.id, start: slot.start, end: slot.end },
        }),
      ),
    );

    return created; // Shift[]
  }

  // ─── Update (reschedule) ───────────────────────────────────────────────────

  async updateShift(
    shiftId: string,
    teacherUserId: string,
    dto: UpdateShiftDto,
  ) {
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { userId: teacherUserId },
      select: { id: true },
    });
    if (!teacher) throw new NotFoundException('Teacher profile not found.');

    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
      include: { booking: true },
    });
    if (!shift) throw new NotFoundException(`Shift ${shiftId} not found.`);
    if (shift.teacherId !== teacher.id) {
      throw new ForbiddenException('This shift does not belong to you.');
    }

    // Determine new times (fall back to existing values if not provided)
    const newStart = dto.start ? new Date(dto.start) : shift.start;
    const newEnd = dto.end ? new Date(dto.end) : shift.end;
    const now = new Date();

    // Validate new times only if they were actually changed
    if (dto.start || dto.end) {
      if (newStart.getTime() < now.getTime() - 5 * 60 * 1000) {
        throw new BadRequestException('New start time cannot be in the past.');
      }
      if (newEnd <= newStart) {
        throw new BadRequestException('End time must be after start time.');
      }
      const durationMinutes =
        (newEnd.getTime() - newStart.getTime()) / (1000 * 60);
      if (durationMinutes < 30) {
        throw new BadRequestException(
          'Shifts must be at least 30 minutes long.',
        );
      }
      if (durationMinutes > 240) {
        throw new BadRequestException('Shifts cannot exceed 4 hours.');
      }

      // Check for overlaps, excluding this shift itself
      const overlap = await this.prisma.shift.findFirst({
        where: {
          teacherId: teacher.id,
          id: { not: shiftId }, // exclude self
          OR: [{ start: { lt: newEnd }, end: { gt: newStart } }],
        },
      });
      if (overlap) {
        throw new BadRequestException(
          'The new time slot overlaps with one of your existing shifts.',
        );
      }
    }

    return this.prisma.shift.update({
      where: { id: shiftId },
      data: { start: newStart, end: newEnd },
      include: {
        booking: {
          include: { student: true },
        },
      },
    });
  }

  // ─── Delete (unbooked shifts only) ────────────────────────────────────────
  //
  // NOTE: This method was already correct. The 404 was caused by the missing
  // @Delete(':id') decorator in shifts.controller.ts — not by this service.

  async deleteShift(shiftId: string, teacherUserId: string) {
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { userId: teacherUserId },
      select: { id: true },
    });
    if (!teacher) throw new NotFoundException('Teacher profile not found.');

    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
      include: { booking: true },
    });

    if (!shift) throw new NotFoundException(`Shift ${shiftId} not found.`);
    if (shift.teacherId !== teacher.id) {
      throw new ForbiddenException('This shift does not belong to you.');
    }
    if (shift.booking) {
      throw new BadRequestException(
        'Cannot delete a shift that has been booked. Cancel the booking first.',
      );
    }

    await this.prisma.shift.delete({ where: { id: shiftId } });
    return { deleted: true, shiftId };
  }

  // ─── List all shifts for this teacher ─────────────────────────────────────

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
