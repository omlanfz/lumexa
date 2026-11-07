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
import { ChatController } from './chat/chat.controller';
import { ChatService } from './chat/chat.service';
import { CHAT_STORAGE, ChatStorageService } from './chat/chat-storage.service';
import { StudentsModule } from '../students/students.module';
import { SchedulingModule } from '../scheduling/scheduling.module';
import { PayoutsModule } from '../payouts/payouts.module';
import { AlertsModule } from '../alerts/alerts.module';
import { BatchesModule } from '../batches/batches.module';
import { CertificatesModule } from '../certificates/certificates.module';

@Module({
  imports: [
    StudentsModule,
    SchedulingModule,
    PayoutsModule,
    AlertsModule,
    BatchesModule,
    // A finalised final class opens the admin's certificate review.
    CertificatesModule,
    // DailyRoomsService, RoomAccessService and TrialClassroomService
    TrialClassroomModule,
  ],
  controllers: [
    ClassroomController,
    RecordingController,
    RecordingsController,
    ClassroomBadgesController,
    ChatController,
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
    ChatService,
    ChatStorageService,
    { provide: CHAT_STORAGE, useExisting: ChatStorageService },
  ],
  exports: [
    RecordingService,
    RecordingLibraryService,
    ClassroomService,
    ClassFinalizationService,
  ],
})
export class ClassroomModule {}
