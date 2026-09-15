// FILE PATH: server/src/reschedule/reschedule.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { RescheduleService } from './reschedule.service';
import { CreateRescheduleEventDto } from './dto/create-reschedule-event.dto';

@Controller('reschedule')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.TEACHER)
export class RescheduleController {
  constructor(private readonly rescheduleService: RescheduleService) {}

  /** GET /reschedule/emergency-status — "Emergency reschedules this month: 2/3" */
  @Get('emergency-status')
  getEmergencyStatus(@Request() req: any) {
    return this.rescheduleService.getEmergencyStatus(req.user.userId);
  }

  /** GET /reschedule/history?bookingId= — audit trail */
  @Get('history')
  getHistory(@Request() req: any, @Query('bookingId') bookingId?: string) {
    return this.rescheduleService.getHistoryForTeacher(
      req.user.userId,
      bookingId,
    );
  }

  /** POST /reschedule/:bookingId — reschedule or cancel a booked class */
  @Post(':bookingId')
  createEvent(
    @Request() req: any,
    @Param('bookingId') bookingId: string,
    @Body() dto: CreateRescheduleEventDto,
  ) {
    return this.rescheduleService.createEvent(req.user.userId, bookingId, dto);
  }
}
