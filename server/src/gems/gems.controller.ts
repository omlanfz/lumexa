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

@Controller('gems')
@UseGuards(AuthGuard('jwt'))
export class GemsController {
  constructor(private readonly gemsService: GemsService) {}

  /** Get current user's gem wallet + recent purchases */
  @Get('wallet')
  getWallet(@Req() req: any) {
    return this.gemsService.getWallet(req.user.userId);
  }

  /**
   * Initiate a gem purchase.
   * - STRIPE: frontend then creates a Stripe PaymentIntent separately
   * - BKASH: frontend redirects to bKash, comes back with trxID
   * - BANK_TRANSFER: frontend uploads proof, submits proofUrl
   */
  @Post('purchase')
  initiate(@Req() req: any, @Body() dto: PurchaseGemsDto) {
    return this.gemsService.initiatePurchase(req.user.userId, dto);
  }

  /** Admin: approve a pending BKASH or BANK_TRANSFER purchase */
  @Post('purchases/:id/approve')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  approve(@Param('id') id: string) {
    return this.gemsService.approvePurchase(id);
  }
}
