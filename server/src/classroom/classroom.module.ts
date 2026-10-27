import { Module } from '@nestjs/common';
import { ClassroomService } from './classroom.service';
import { ClassroomController } from './classroom.controller';
import { RecordingService } from './recording.service';
import { RecordingStorageService } from './recording-storage.service';
import { RecordingLibraryService } from './recording-library.service';
import { RecordingController } from './recording.controller';
import { RecordingsController } from './recordings.controller';
import { ClassFinalizationService } from './class-finalization.service';
import { AdmissionService } from './admission.service';
import { RoomDirectoryService } from './room-directory.service';
import { TrialClassroomModule } from './trial-classroom.module';
import { ClassroomBadgesController } from './badges/classroom-badges.controller';
import { ClassroomBadgesService } from './badges/classroom-badges.service';
import { StudentsModule } from '../students/students.module';
import { SchedulingModule } from '../scheduling/scheduling.module';
import { PayoutsModule } from '../payouts/payouts.module';
import { AlertsModule } from '../alerts/alerts.module';
import { BatchesModule } from '../batches/batches.module';

@Module({
  imports: [
    StudentsModule,
    SchedulingModule,
    PayoutsModule,
    AlertsModule,
    BatchesModule,
    // LiveKitRoomsService, RoomAccessService and TrialClassroomService
    TrialClassroomModule,
  ],
  controllers: [
    ClassroomController,
    RecordingController,
    RecordingsController,
    ClassroomBadgesController,
  ],
  providers: [
    ClassroomService,
    RecordingService,
    RecordingStorageService,
    RecordingLibraryService,
    ClassFinalizationService,
    AdmissionService,
    RoomDirectoryService,
    ClassroomBadgesService,
  ],
  exports: [
    RecordingService,
    RecordingLibraryService,
    ClassroomService,
    ClassFinalizationService,
  ],
})
export class ClassroomModule {}
