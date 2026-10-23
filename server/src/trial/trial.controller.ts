import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { whatsappConfig } from '../whatsapp/whatsapp.config';
import { TrialService } from './trial.service';
import { TrialBookingService, toPublicBooking } from './trial-booking.service';
import { CreateTrialDto } from './dto/trial.dto';

@Controller('trial')
export class TrialController {
  constructor(
    private readonly trialService: TrialService,
    private readonly booking: TrialBookingService,
  ) {}

  /** Public — bookable slots between two Bangladesh dates (inclusive).
   *  Never cached: a stale response would show slots that are already taken. */
  @Get('availability')
  @Header('Cache-Control', 'no-store, max-age=0')
  availability(@Query('from') from: string, @Query('to') to: string) {
    return this.booking.getAvailability(from, to);
  }

  /** Public — books a trial. Succeeds only when the slot was saved; the
   *  response is the confirmed booking. Contact details are never echoed. */
  @Post()
  @Throttle({ default: { limit: 6, ttl: 60_000 } })
  async create(@Body() dto: CreateTrialDto) {
    const { lead, alreadyBooked } = await this.booking.createBooking(
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
      },
      'PARENT',
    );
    return {
      success: true,
      alreadyBooked,
      booking: toPublicBooking(lead),
      confirmationEmailTo: lead.parentEmail,
      whatsappConfirmation: whatsappConfig.isEnabled() && lead.whatsappConsent,
    };
  }

  /** Admin only — list all trial leads */
  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  list(@Query('page') page = '1', @Query('limit') limit = '20') {
    return this.trialService.list(Number(page), Number(limit));
  }

  /** Admin only — update lead status (NEW → CONTACTED → BOOKED → CONVERTED) */
  @Patch(':id/status')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.trialService.updateStatus(id, status);
  }
}
