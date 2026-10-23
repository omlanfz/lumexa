// FILE PATH: server/src/trial/trial-admin.controller.ts
//
// Admin-only API for the "Trial Classes" dashboard section. The whole
// controller sits behind the JWT guard + RolesGuard(ADMIN); every response
// here may contain parent contact details and must never be made public.

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import {
  AdminCreateTrialDto,
  BlockDto,
  CancelTrialDto,
  RescheduleTrialDto,
  RuleDto,
  UpdateTrialNotesDto,
  WindowDto,
} from './dto/trial.dto';
import {
  TrialAvailabilityService,
  type MutationOptions,
} from './trial-availability.service';
import { TrialAdminService } from './trial-admin.service';
import { TrialBookingService, type Actor } from './trial-booking.service';

const flag = (v?: string) => v === 'true' || v === '1';
const opts = (dryRun?: string, confirmAffected?: string): MutationOptions => ({
  dryRun: flag(dryRun),
  confirmAffected: flag(confirmAffected),
});
interface AuthedRequest {
  user: { userId: string; role: string };
}
const actorOf = (req: AuthedRequest): Actor => ({
  id: req.user.userId,
  role: req.user.role,
});

@Controller('admin/trial')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.ADMIN)
export class TrialAdminController {
  constructor(
    private readonly booking: TrialBookingService,
    private readonly availability: TrialAvailabilityService,
    private readonly admin: TrialAdminService,
  ) {}

  // ─── Availability configuration ───────────────────────────────────────────

  @Get('availability')
  listAvailability() {
    return this.availability.listAll();
  }

  /** What parents can actually book right now (same engine as the public page). */
  @Get('availability/preview')
  preview(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('excludeId') excludeId?: string,
  ) {
    return this.booking.getAvailability(from, to, new Date(), excludeId);
  }

  @Post('availability/rules')
  createRule(
    @Body() dto: RuleDto,
    @Request() req: AuthedRequest,
    @Query('dryRun') dryRun?: string,
  ) {
    return this.availability.createRule(dto, actorOf(req), opts(dryRun));
  }

  @Put('availability/rules/:id')
  updateRule(
    @Param('id') id: string,
    @Body() dto: RuleDto,
    @Request() req: AuthedRequest,
    @Query('dryRun') dryRun?: string,
    @Query('confirmAffected') confirm?: string,
  ) {
    return this.availability.updateRule(
      id,
      dto,
      actorOf(req),
      opts(dryRun, confirm),
    );
  }

  @Delete('availability/rules/:id')
  deleteRule(
    @Param('id') id: string,
    @Request() req: AuthedRequest,
    @Query('dryRun') dryRun?: string,
    @Query('confirmAffected') confirm?: string,
  ) {
    return this.availability.deleteRule(
      id,
      actorOf(req),
      opts(dryRun, confirm),
    );
  }

  @Post('availability/windows')
  createWindow(
    @Body() dto: WindowDto,
    @Request() req: AuthedRequest,
    @Query('dryRun') dryRun?: string,
  ) {
    return this.availability.createWindow(dto, actorOf(req), opts(dryRun));
  }

  @Put('availability/windows/:id')
  updateWindow(
    @Param('id') id: string,
    @Body() dto: WindowDto,
    @Request() req: AuthedRequest,
    @Query('dryRun') dryRun?: string,
    @Query('confirmAffected') confirm?: string,
  ) {
    return this.availability.updateWindow(
      id,
      dto,
      actorOf(req),
      opts(dryRun, confirm),
    );
  }

  @Delete('availability/windows/:id')
  deleteWindow(
    @Param('id') id: string,
    @Request() req: AuthedRequest,
    @Query('dryRun') dryRun?: string,
    @Query('confirmAffected') confirm?: string,
  ) {
    return this.availability.deleteWindow(
      id,
      actorOf(req),
      opts(dryRun, confirm),
    );
  }

  @Post('availability/blocks')
  createBlock(
    @Body() dto: BlockDto,
    @Request() req: AuthedRequest,
    @Query('dryRun') dryRun?: string,
    @Query('confirmAffected') confirm?: string,
  ) {
    return this.availability.createBlock(
      dto,
      actorOf(req),
      opts(dryRun, confirm),
    );
  }

  @Put('availability/blocks/:id')
  updateBlock(
    @Param('id') id: string,
    @Body() dto: BlockDto,
    @Request() req: AuthedRequest,
    @Query('dryRun') dryRun?: string,
    @Query('confirmAffected') confirm?: string,
  ) {
    return this.availability.updateBlock(
      id,
      dto,
      actorOf(req),
      opts(dryRun, confirm),
    );
  }

  @Delete('availability/blocks/:id')
  deleteBlock(
    @Param('id') id: string,
    @Request() req: AuthedRequest,
    @Query('dryRun') dryRun?: string,
  ) {
    return this.availability.deleteBlock(id, actorOf(req), opts(dryRun));
  }

  // ─── Appointments ─────────────────────────────────────────────────────────

  @Get('appointments/summary')
  summary() {
    return this.admin.summary();
  }

  @Get('appointments')
  list(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: string,
    @Query('scope') scope?: string,
    @Query('q') q?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.admin.list({
      from,
      to,
      status,
      scope,
      q,
      page: Number(page),
      limit: Number(limit),
    });
  }

  @Get('appointments/:id')
  detail(@Param('id') id: string) {
    return this.admin.detail(id);
  }

  /** Schedule a trial on a parent's behalf — same rules as the public form. */
  @Post('appointments')
  async create(
    @Body() dto: AdminCreateTrialDto,
    @Request() req: AuthedRequest,
  ) {
    const { lead } = await this.booking.createBooking(
      {
        parentName: dto.parentName,
        parentEmail: dto.parentEmail,
        parentPhone: dto.parentPhone,
        childName: dto.childName,
        childAge: dto.childAge,
        subject: dto.subject,
        timezone: dto.timezone,
        message: dto.message,
        startAt: new Date(dto.startAt),
        whatsappConsent: dto.whatsappConsent,
        adminNotes: dto.adminNotes,
      },
      'ADMIN',
      actorOf(req),
    );
    return this.admin.detail(lead.id);
  }

  @Post('appointments/:id/reschedule')
  async reschedule(
    @Param('id') id: string,
    @Body() dto: RescheduleTrialDto,
    @Request() req: AuthedRequest,
  ) {
    const { availabilityChanges } = await this.booking.reschedule(
      id,
      new Date(dto.startAt),
      actorOf(req),
      dto.reason,
    );
    return { appointment: await this.admin.detail(id), availabilityChanges };
  }

  @Post('appointments/:id/cancel')
  async cancel(
    @Param('id') id: string,
    @Body() dto: CancelTrialDto,
    @Request() req: AuthedRequest,
  ) {
    const { availabilityChanges, alreadyCancelled } = await this.booking.cancel(
      id,
      actorOf(req),
      dto.reason,
      dto.parentNote,
    );
    return {
      appointment: await this.admin.detail(id),
      availabilityChanges,
      alreadyCancelled,
    };
  }

  @Patch('appointments/:id/notes')
  notes(
    @Param('id') id: string,
    @Body() dto: UpdateTrialNotesDto,
    @Request() req: AuthedRequest,
  ) {
    return this.admin.updateNotes(id, dto.adminNotes, actorOf(req));
  }

  @Post('appointments/:id/whatsapp/retry')
  retryWhatsApp(@Param('id') id: string, @Request() req: AuthedRequest) {
    return this.admin.retryWhatsApp(id, actorOf(req));
  }
}
