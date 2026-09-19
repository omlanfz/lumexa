import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DisputesService } from './disputes.service';
import { CreateDisputeDto } from './dto/create-dispute.dto';

@Controller('disputes')
@UseGuards(AuthGuard('jwt'))
export class DisputesController {
  constructor(private readonly disputes: DisputesService) {}

  @Post()
  file(@Request() req: any, @Body() dto: CreateDisputeDto) {
    return this.disputes.file(req.user.userId, req.user.role, dto);
  }

  @Get('mine')
  listMine(@Request() req: any) {
    return this.disputes.listMine(req.user.userId);
  }
}
