import { Module } from '@nestjs/common';
import { PayoutsModule } from '../payouts/payouts.module';
import { RescheduleModule } from '../reschedule/reschedule.module';
import { StudentsModule } from '../students/students.module';
import { SchedulingModule } from '../scheduling/scheduling.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [PayoutsModule, RescheduleModule, StudentsModule, SchedulingModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
