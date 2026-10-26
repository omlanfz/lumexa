import { Module } from '@nestjs/common';
import { LiveKitRoomsService } from './livekit-rooms.service';
import { RoomAccessService } from './room-access.service';
import { TrialClassroomService } from './trial-classroom.service';

/**
 * Joining a free trial class. Deliberately its own small module: the trial
 * booking flow (TrialModule) needs the guest/teacher join logic but nothing
 * else from the classroom stack (recording, payouts, lessons, Stripe…), and the
 * room limits it shares with every other class (RoomAccessService, LiveKit) are
 * provided here once and re-exported to ClassroomModule.
 * PrismaModule and AuditModule are @Global.
 */
@Module({
  providers: [LiveKitRoomsService, RoomAccessService, TrialClassroomService],
  exports: [LiveKitRoomsService, RoomAccessService, TrialClassroomService],
})
export class TrialClassroomModule {}
