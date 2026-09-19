import { Module } from '@nestjs/common';
import { ClassroomService } from './classroom.service';
import { ClassroomController } from './classroom.controller';
import { StudentsModule } from '../students/students.module';
import { SchedulingModule } from '../scheduling/scheduling.module';
import { PayoutsModule } from '../payouts/payouts.module';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [StudentsModule, SchedulingModule, PayoutsModule, AlertsModule],
  controllers: [ClassroomController],
  providers: [ClassroomService],
})
export class ClassroomModule {}
