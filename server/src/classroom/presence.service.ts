// FILE PATH: server/src/classroom/presence.service.ts
//
// Server-side teacher-disconnect protection. The classroom frontend pings
// POST /classroom/:room/heartbeat every ~20s for whichever role is in the
// room; this service is the only thing that decides a teacher has actually
// dropped off (never a browser beforeunload/visibility event, which is
// unreliable and client-only) and, after a 20-minute grace period with no
// heartbeat, auto-ends the class as incomplete.

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { ClassroomService } from './classroom.service';
import { ClassEndReason } from '@prisma/client';

const STALE_AFTER_MS = 60_000; // ~2-3 missed 20s heartbeats before we start the grace clock
const DISCONNECT_GRACE_MS = 20 * 60_000; // required minimum reconnection window

@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly classroomService: ClassroomService,
  ) {}

  async touch(room: string, userId: string, role: 'TEACHER' | 'STUDENT'): Promise<void> {
    await this.prisma.classroomPresence.upsert({
      where: { room_userId: { room, userId } },
      create: { room, userId, role, lastSeenAt: new Date() },
      update: { role, lastSeenAt: new Date(), disconnectedAt: null },
    });
  }

  async clearRoom(room: string): Promise<void> {
    await this.prisma.classroomPresence.deleteMany({ where: { room } }).catch(() => {});
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async sweep() {
    const staleCutoff = new Date(Date.now() - STALE_AFTER_MS);

    // Start the grace clock for any teacher presence row that's gone quiet.
    await this.prisma.classroomPresence.updateMany({
      where: { role: 'TEACHER', disconnectedAt: null, lastSeenAt: { lt: staleCutoff } },
      data: { disconnectedAt: new Date() },
    });

    const graceCutoff = new Date(Date.now() - DISCONNECT_GRACE_MS);
    const overdue = await this.prisma.classroomPresence.findMany({
      where: { role: 'TEACHER', disconnectedAt: { not: null, lt: graceCutoff } },
    });

    for (const presence of overdue) {
      try {
        const ended = await this.classroomService.autoEndClassForServerReason(
          presence.room,
          ClassEndReason.TEACHER_DISCONNECTED,
        );
        if (ended) {
          this.logger.warn(
            `Auto-ended room ${presence.room} — teacher ${presence.userId} did not reconnect within ${DISCONNECT_GRACE_MS / 60_000} minutes`,
          );
        }
      } catch (err) {
        this.logger.error(`Failed to auto-end room ${presence.room} for teacher disconnect: ${err}`);
      } finally {
        // Always clear — either it's handled, or the room already isn't
        // live anymore (class ended some other way) and there's nothing
        // left to enforce. Either way, never re-trigger on the same row.
        await this.prisma.classroomPresence
          .delete({ where: { id: presence.id } })
          .catch(() => {});
      }
    }
  }
}
