import { Module } from '@nestjs/common';
import { ClassroomService } from './classroom.service';
import { ClassroomController } from './classroom.controller';
import { RecordingService } from './recording.service';
import { ClassFinalizationService } from './class-finalization.service';
import { AdmissionService } from './admission.service';
import { LiveKitRoomsService } from './livekit-rooms.service';
import { RoomAccessService } from './room-access.service';
import { RoomDirectoryService } from './room-directory.service';
import { ClassroomBadgesController } from './badges/classroom-badges.controller';
import { ClassroomBadgesService } from './badges/classroom-badges.service';
import { StudentsModule } from '../students/students.module';
import { SchedulingModule } from '../scheduling/scheduling.module';
import { PayoutsModule } from '../payouts/payouts.module';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [StudentsModule, SchedulingModule, PayoutsModule, AlertsModule],
  controllers: [ClassroomController, ClassroomBadgesController],
  providers: [
    ClassroomService,
    RecordingService,
    ClassFinalizationService,
    AdmissionService,
    LiveKitRoomsService,
    RoomAccessService,
    RoomDirectoryService,
    ClassroomBadgesService,
  ],
  exports: [RecordingService, ClassroomService, ClassFinalizationService],
})
export class ClassroomModule {}
