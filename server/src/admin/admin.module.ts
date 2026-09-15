import { Module } from '@nestjs/common';
import { PayoutsModule } from '../payouts/payouts.module';
import { RescheduleModule } from '../reschedule/reschedule.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [PayoutsModule, RescheduleModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
