// FILE PATH: server/src/shifts/shifts.controller.ts
//
// ROOT CAUSE OF ISSUE 9 (404 on DELETE /shifts/:id):
//   The previous controller only registered @Post() and @Get().
//   There was NO @Delete(':id') route and NO @Patch(':id') route.
//   NestJS had no matching handler for DELETE/PATCH requests → 404.
//
// CHANGES:
//   1. Added @Delete(':id')  → calls shiftsService.deleteShift(id, userId)
//   2. Added @Patch(':id')   → calls shiftsService.updateShift(id, userId, dto)
//      (needed by the calendar frontend for the reschedule flow)
//   3. Updated @Post() to forward recurring / recurWeeks from the DTO
//   4. Added missing NestJS imports (Delete, Patch, Param, Body already needed)

import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ShiftsService } from './shifts.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';

@Controller('shifts')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.TEACHER) // All shift management is teacher-only
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  // ─── Create shift (with optional recurring) ─────────────────────────────────
  // POST /shifts
  // Body: { start, end, recurring?, recurWeeks? }
  // Returns: single Shift (non-recurring) | Shift[] (recurring)
  @Post()
  create(@Request() req, @Body() dto: CreateShiftDto) {
    return this.shiftsService.create(
      req.user.userId,
      dto.start,
      dto.end,
      dto.recurring ?? false,
      dto.recurWeeks ?? 1,
    );
  }

  // ─── List all shifts for this teacher ────────────────────────────────────────
  // GET /shifts
  @Get()
  findAll(@Request() req) {
    return this.shiftsService.findAll(req.user.userId);
  }

  // ─── Delete an unbooked shift ────────────────────────────────────────────────
  // DELETE /shifts/:id
  //
  // THIS ROUTE WAS MISSING — root cause of Issue 9.
  //
  // Guards: teacher must own the shift; shift must not have a booking.
  // The frontend calls this for "Remove Slot" (unbooked shifts only).
  // For booked shifts the frontend calls DELETE /bookings/:id instead.
  @Delete(':id')
  deleteShift(@Request() req, @Param('id') id: string) {
    return this.shiftsService.deleteShift(id, req.user.userId);
  }

  // ─── Reschedule / update a shift ─────────────────────────────────────────────
  // PATCH /shifts/:id
  //
  // THIS ROUTE WAS ALSO MISSING — the reschedule flow in CancelModal called
  // PATCH /shifts/:id but got 404 as well.
  //
  // Body: { start, end, initiatedBy?, reason? }
  @Patch(':id')
  updateShift(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateShiftDto,
  ) {
    return this.shiftsService.updateShift(id, req.user.userId, dto);
  }
}
