import { Module } from '@nestjs/common';
import { DailyRoomsService } from './daily-rooms.service';
import { RoomAccessService } from './room-access.service';
import { TrialClassroomService } from './trial-classroom.service';

/**
 * Joining a free trial class. Deliberately its own small module: the trial
 * booking flow (TrialModule) needs the guest/teacher join logic but nothing
 * else from the classroom stack (recording, payouts, lessons, Stripe…), and the
 * room limits it shares with every other class (RoomAccessService, Daily) are
 * provided here once and re-exported to ClassroomModule.
 * PrismaModule and AuditModule are @Global.
 */
@Module({
  providers: [DailyRoomsService, RoomAccessService, TrialClassroomService],
  exports: [DailyRoomsService, RoomAccessService, TrialClassroomService],
})
export class TrialClassroomModule {}
