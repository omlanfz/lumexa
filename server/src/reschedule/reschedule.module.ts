// FILE PATH: server/src/reschedule/reschedule.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma.module';
import { PayoutsModule } from '../payouts/payouts.module';
import { RescheduleService } from './reschedule.service';
import { RescheduleController } from './reschedule.controller';

@Module({
  imports: [PrismaModule, PayoutsModule],
  controllers: [RescheduleController],
  providers: [RescheduleService],
  exports: [RescheduleService],
})
export class RescheduleModule {}
