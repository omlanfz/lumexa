// FILE PATH: server/src/payouts/payouts.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma.module';
import { PayoutsService } from './payouts.service';
import { PayoutsController } from './payouts.controller';

@Module({
  imports: [PrismaModule],
  controllers: [PayoutsController],
  providers: [PayoutsService],
  exports: [PayoutsService],
})
export class PayoutsModule {}
