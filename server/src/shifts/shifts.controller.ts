import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('shifts')
@UseGuards(AuthGuard('jwt')) // <--- Security Shield
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Post()
  create(@Request() req, @Body() body: { start: string; end: string }) {
    return this.shiftsService.create(req.user.userId, body.start, body.end);
  }

  @Get()
  findAll(@Request() req) {
    return this.shiftsService.findAll(req.user.userId);
  }
}
