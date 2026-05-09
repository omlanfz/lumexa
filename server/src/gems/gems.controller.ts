import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Role } from '@prisma/client';
import { GemsService } from './gems.service';
import { PurchaseGemsDto } from './dto/purchase-gems.dto';
import { IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

class RequestTopupDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  amount: number;
}

@Controller('gems')
@UseGuards(AuthGuard('jwt'))
export class GemsController {
  constructor(private readonly gemsService: GemsService) {}

  // ─── Named routes before parameterised ──────────────────────────────────

  @Get('wallet')
  getWallet(@Req() req: any) {
    return this.gemsService.getWallet(req.user.userId);
  }

  @Post('purchase')
  initiate(@Req() req: any, @Body() dto: PurchaseGemsDto) {
    return this.gemsService.initiatePurchase(req.user.userId, dto);
  }

  // STUDENT: request a gem top-up from billing contact
  @Post('request-topup')
  @UseGuards(RolesGuard)
  @Roles(Role.STUDENT)
  requestTopup(@Req() req: any, @Body() dto: RequestTopupDto) {
    return this.gemsService.requestTopup(req.user.userId, dto.amount);
  }

  // Admin: approve a pending BKASH or BANK_TRANSFER purchase
  @Post('purchases/:id/approve')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  approve(@Param('id') id: string) {
    return this.gemsService.approvePurchase(id);
  }
}
