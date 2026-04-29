import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Role } from '@prisma/client';
import { TrialService } from './trial.service';
import { CreateTrialDto } from './dto/create-trial.dto';

@Controller('trial')
export class TrialController {
  constructor(private readonly trialService: TrialService) {}

  /** Public — no auth required. Called from the /trial landing page form. */
  @Post()
  create(@Body() dto: CreateTrialDto) {
    return this.trialService.create(dto);
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
