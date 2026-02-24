import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ShiftsService } from './shifts.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { CreateShiftDto } from './dto/create-shift.dto';

@Controller('shifts')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.TEACHER) // Only teachers can access shift management
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Post()
  create(@Request() req, @Body() dto: CreateShiftDto) {
    return this.shiftsService.create(req.user.userId, dto.start, dto.end);
  }

  @Get()
  findAll(@Request() req) {
    return this.shiftsService.findAll(req.user.userId);
  }
}
