import { Module } from '@nestjs/common';
import { ClassroomService } from './classroom.service';
import { ClassroomController } from './classroom.controller';
import { RecordingService } from './recording.service';
import { PresenceService } from './presence.service';
import { AdmissionService } from './admission.service';
import { StudentsModule } from '../students/students.module';
import { SchedulingModule } from '../scheduling/scheduling.module';
import { PayoutsModule } from '../payouts/payouts.module';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [StudentsModule, SchedulingModule, PayoutsModule, AlertsModule],
  controllers: [ClassroomController],
  providers: [
    ClassroomService,
    RecordingService,
    PresenceService,
    AdmissionService,
  ],
  exports: [RecordingService, ClassroomService],
})
export class ClassroomModule {}
