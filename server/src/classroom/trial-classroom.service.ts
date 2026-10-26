// FILE PATH: server/src/classroom/trial-classroom.service.ts
//
// Joining a free trial class. A trial reuses the classroom infrastructure
// (LiveKit room, room lock / 10-people limit via RoomAccessService, the same
// classroom UI) but has no ScheduledLesson: no student account, no lesson
// balance, no curriculum progress, no payout.
//
//   Teacher   authenticated, must be the trial's assigned teacher
//             → POST /classroom/join { trialLeadId }
//   Guest     the parent/child, NO account, holds the secret link token
//             → POST /trial/guest/join { token }
//
// Both are validated here, on the server, against the stored appointment
// (trial-access.util.ts): CONFIRMED, teacher assigned, inside the joining
// window. The LiveKit token that comes back is bound to this one room and one
// identity; the LiveKit API key/secret and the room name are never sent to the
// guest beyond what LiveKit needs to connect.

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AccessToken } from 'livekit-server-sdk';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { RoomAccessService } from './room-access.service';
import {
  MAX_PEOPLE_PER_CLASSROOM,
  buildIdentity,
  roomForTrial,
  sanitizeDeviceId,
  trialGuestKey,
} from './room-ref.util';
import {
  GUEST_STATE_MESSAGE,
  isWellFormedGuestToken,
  joinWindow,
  trialAccessState,
  type TrialAccessState,
} from '../trial/trial-access.util';

const MINUTE_MS = 60_000;
/** Longest a join token stays valid (the same 3 hours a regular class gets). */
const MAX_TOKEN_TTL_SECONDS = 3 * 60 * 60;

type LiveKitCredentials = { apiKey: string; apiSecret: string };

@Injectable()
export class TrialClassroomService {
  private readonly logger = new Logger(TrialClassroomService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly roomAccess: RoomAccessService,
    private readonly audit: AuditService,
  ) {}

  private credentials(): LiveKitCredentials {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    if (!apiKey || !apiSecret) {
      throw new BadRequestException('Video service is not configured.');
    }
    return { apiKey, apiSecret };
  }

  // ─── What the guest page shows ────────────────────────────────────────────

  /**
   * Public: the state of the class behind a guest link. Reveals only what the
   * link's holder needs (their child's first name and the class time) and
   * nothing about the teacher, the parent's contact details or other trials.
   * An unknown or malformed token is a plain 404, identical in both cases.
   */
  async guestStatus(token: string, now = new Date()) {
    const lead = await this.leadByToken(token);
    const state = trialAccessState(lead, now);
    const window =
      lead.startAt && lead.endAt ? joinWindow(lead.startAt, lead.endAt) : null;
    return {
      state,
      canJoin: state === 'OPEN',
      message: state === 'OPEN' ? null : GUEST_STATE_MESSAGE[state],
      childName: lead.childName,
      startAt: lead.startAt?.toISOString() ?? null,
      endAt: lead.endAt?.toISOString() ?? null,
      opensAt: window?.opensAt.toISOString() ?? null,
      closesAt: window?.closesAt.toISOString() ?? null,
      // Lets the page count down against the server's clock, not the device's.
      serverNow: now.toISOString(),
    };
  }

  // ─── Joining ──────────────────────────────────────────────────────────────

  async joinAsGuest(token: string, deviceId?: unknown, now = new Date()) {
    const lead = await this.leadByToken(token);
    const state = trialAccessState(lead, now);
    if (state !== 'OPEN') {
      this.refuse(state);
    }
    const teacherUserId = lead.teacher!.userId;
    const { apiKey, apiSecret } = this.credentials();
    const room = roomForTrial(lead.id);
    const device = sanitizeDeviceId(deviceId);
    const guestKey = trialGuestKey(lead.id);

    // The teacher's lock, the 10-people limit and the per-person device limit.
    const entry = await this.roomAccess.checkEntry({
      room,
      userId: guestKey,
      role: 'STUDENT',
      deviceId: device,
      teacherUserId,
    });
    if (!entry.ok) {
      return {
        blocked: true as const,
        reason: entry.reason,
        message: entry.message,
        roomName: room,
      };
    }

    const closesAt = joinWindow(lead.startAt!, lead.endAt!).closesAt;
    const at = new AccessToken(apiKey, apiSecret, {
      identity: buildIdentity(guestKey, device),
      // "(Student)" is how the classroom UI tells a student from the teacher.
      name: `${lead.childName} (Student)`,
      // Valid until a little after the joining window closes — a short-lived,
      // room-bound token, never a reusable credential.
      ttl: Math.min(
        MAX_TOKEN_TTL_SECONDS,
        Math.max(
          5 * 60,
          Math.ceil((closesAt.getTime() - now.getTime()) / 1000) + 15 * 60,
        ),
      ),
    });
    at.addGrant({
      roomJoin: true,
      room,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    await this.prisma.trialLead
      .updateMany({
        where: { id: lead.id, guestJoinedAt: null },
        data: { guestJoinedAt: now },
      })
      .catch((err) =>
        this.logger.error(`Could not record guest join for ${lead.id}: ${err}`),
      );

    return this.joinResponse(
      await at.toJwt(),
      room,
      lead.startAt!,
      lead.childName,
    );
  }

  async joinAsTeacher(
    userId: string,
    trialLeadId: string,
    deviceId?: unknown,
    now = new Date(),
  ) {
    const lead = await this.prisma.trialLead.findUnique({
      where: { id: trialLeadId },
      include: { teacher: { select: { userId: true, user: true } } },
    });
    if (!lead || !lead.teacher || lead.teacher.userId !== userId) {
      // Same answer for "no such trial" and "not your trial".
      throw new ForbiddenException(
        'Access denied: you are not assigned to this classroom.',
      );
    }
    const state = trialAccessState(lead, now);
    if (state !== 'OPEN') {
      if (state === 'NOT_YET') {
        const opensAt = joinWindow(lead.startAt!, lead.endAt!).opensAt;
        const minutes = Math.max(
          1,
          Math.ceil((opensAt.getTime() - now.getTime()) / MINUTE_MS),
        );
        throw new BadRequestException(
          `Classroom opens 10 minutes before class. Please come back in ${minutes} minute(s).`,
        );
      }
      this.refuse(state);
    }

    const { apiKey, apiSecret } = this.credentials();
    const room = roomForTrial(lead.id);
    const device = sanitizeDeviceId(deviceId);

    const entry = await this.roomAccess.checkEntry({
      room,
      userId,
      role: 'TEACHER',
      deviceId: device,
      teacherUserId: userId,
    });
    if (!entry.ok) {
      return {
        blocked: true as const,
        reason: entry.reason,
        message: entry.message,
        roomName: room,
      };
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: buildIdentity(userId, device),
      name: `${lead.teacher.user.fullName} (Teacher)`,
      ttl: MAX_TOKEN_TTL_SECONDS,
    });
    at.addGrant({
      roomJoin: true,
      room,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    await this.prisma.trialLead
      .updateMany({
        where: { id: lead.id, teacherJoinedAt: null },
        data: { teacherJoinedAt: now },
      })
      .catch((err) =>
        this.logger.error(
          `Could not record teacher join for ${lead.id}: ${err}`,
        ),
      );

    return this.joinResponse(
      await at.toJwt(),
      room,
      lead.startAt!,
      lead.childName,
    );
  }

  // ─── Ending ───────────────────────────────────────────────────────────────

  /**
   * The teacher closes the class (authorisation is done by the caller). If both
   * sides actually took part the trial is recorded COMPLETED; otherwise it is
   * left for the admin to mark Completed or Missed. Nothing else changes — no
   * earning, no lesson consumed, no progression.
   */
  async markEnded(trialLeadId: string, teacherUserId: string): Promise<void> {
    const res = await this.prisma.trialLead.updateMany({
      where: {
        id: trialLeadId,
        appointmentStatus: 'CONFIRMED',
        teacherJoinedAt: { not: null },
        guestJoinedAt: { not: null },
      },
      data: { appointmentStatus: 'COMPLETED' },
    });
    if (res.count > 0) {
      await this.audit
        .log({
          actorId: teacherUserId,
          actorRole: 'TEACHER',
          action: 'TRIAL_COMPLETED',
          entityType: 'TRIAL_APPOINTMENT',
          entityId: trialLeadId,
          afterData: {
            appointmentStatus: 'COMPLETED',
            by: 'teacher-ended-class',
          },
        })
        .catch((err) =>
          this.logger.error(`Audit write failed for ${trialLeadId}: ${err}`),
        );
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async leadByToken(token: string) {
    // A malformed token never reaches the database, and "malformed" and
    // "unknown" are indistinguishable to the caller.
    if (!isWellFormedGuestToken(token)) {
      throw new NotFoundException('This class link is not valid.');
    }
    const lead = await this.prisma.trialLead.findUnique({
      where: { guestToken: token },
      include: { teacher: { select: { userId: true } } },
    });
    if (!lead) throw new NotFoundException('This class link is not valid.');
    return lead;
  }

  private refuse(state: Exclude<TrialAccessState, 'OPEN'>): never {
    throw new BadRequestException(GUEST_STATE_MESSAGE[state]);
  }

  private async joinResponse(
    token: string,
    room: string,
    start: Date,
    childName: string,
  ) {
    return {
      token,
      url: process.env.LIVEKIT_URL,
      roomName: room,
      scheduledStart: start.toISOString(),
      classType: 'ONE_TO_ONE' as const,
      isTrial: true as const,
      // Shown in the classroom header ("Trial class · Rahul").
      trialChildName: childName,
      roomLocked: await this.roomAccess.isLocked(room),
      maxPeople: MAX_PEOPLE_PER_CLASSROOM,
    };
  }
}
