// FILE PATH: server/src/classroom/room-access.service.ts
//
// Who may be in a classroom, and the teacher's lock.
//
//   - At most 10 people at once (the teacher included), the same for a 1:1 class
//     and a batch. The ideal is 1 student (1:1) or 4 (batch) but that is only
//     an ideal. The teacher's seat is always kept free: students may take at
//     most 9, so a full class can never lock out its own teacher.
//   - The teacher can lock the classroom. While it is locked no student can
//     join — not a latecomer, not someone who dropped out, not an extra device.
//     A class starts unlocked.
//   - One person may be connected from up to 3 devices/tabs at once. Devices
//     are not people: a student on a laptop and a phone is one student.
//
// Two layers, because a join token is issued before the person actually
// connects: `checkEntry` runs when the token is issued (a friendly refusal
// before the browser even tries to connect); `enforceAfterJoin` runs from
// LiveKit's participant_joined webhook and removes anyone who got past it —
// a token issued just before the teacher locked, two people racing for the
// last seat. Neither the lock nor a full class ever keeps the teacher out, the
// teacher is never removed after joining, and hidden admin observers are never
// refused (they do not go through here).

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  LiveKitRoomsService,
  type RoomConnection,
} from './livekit-rooms.service';
import {
  MAX_DEVICES_PER_PERSON,
  MAX_PEOPLE_PER_CLASSROOM,
  MAX_STUDENTS_PER_CLASSROOM,
  buildIdentity,
  isPersonIdentity,
  personKey,
} from './room-ref.util';

export type EntryBlockReason = 'ROOM_LOCKED' | 'ROOM_FULL' | 'TOO_MANY_DEVICES';

export type EntryDecision =
  | { ok: true }
  | { ok: false; reason: EntryBlockReason; message: string };

export const ENTRY_BLOCK_MESSAGE: Record<EntryBlockReason, string> = {
  ROOM_LOCKED:
    'The teacher has locked this classroom, so no one else can join right now. Ask your teacher to unlock it, then try again.',
  ROOM_FULL: `This classroom is full (${MAX_PEOPLE_PER_CLASSROOM} people at most). Please try again when someone leaves.`,
  TOO_MANY_DEVICES: `You are already in this classroom on ${MAX_DEVICES_PER_PERSON} devices. Close one of them to join from another.`,
};

/** How long a refused connection gets to read why before it is removed. */
const DENY_REMOVE_DELAY_MS = 1200;

@Injectable()
export class RoomAccessService {
  private readonly logger = new Logger(RoomAccessService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rooms: LiveKitRoomsService,
  ) {}

  // ─── The lock ──────────────────────────────────────────────────────────────

  async getLockState(
    room: string,
  ): Promise<{ locked: boolean; lockedAt: Date | null }> {
    const row = await this.prisma.classroomRoomState.findUnique({
      where: { room },
    });
    return { locked: row?.locked ?? false, lockedAt: row?.lockedAt ?? null };
  }

  async isLocked(room: string): Promise<boolean> {
    return (await this.getLockState(room)).locked;
  }

  /** Lock or unlock. Idempotent: locking a locked room keeps its original
   * lockedAt (the webhook compares join times against it). */
  async setLocked(
    room: string,
    locked: boolean,
    byUserId: string,
  ): Promise<{ locked: boolean }> {
    const current = await this.getLockState(room);
    if (current.locked === locked) return { locked };
    await this.prisma.classroomRoomState.upsert({
      where: { room },
      create: {
        room,
        locked,
        lockedAt: locked ? new Date() : null,
        lockedByUserId: locked ? byUserId : null,
      },
      update: {
        locked,
        lockedAt: locked ? new Date() : null,
        lockedByUserId: locked ? byUserId : null,
      },
    });
    return { locked };
  }

  // ─── Before a token is issued ──────────────────────────────────────────────

  async checkEntry(params: {
    room: string;
    userId: string;
    role: 'TEACHER' | 'STUDENT';
    deviceId: string;
    teacherUserId: string;
  }): Promise<EntryDecision> {
    const { room, userId, role, deviceId, teacherUserId } = params;

    if (role === 'STUDENT' && (await this.isLocked(room))) {
      return blocked('ROOM_LOCKED');
    }

    let people: RoomConnection[];
    try {
      people = await this.rooms.listPeople(room);
    } catch (err) {
      // LiveKit not answering must not shut a real class out of its room; the
      // participant_joined check below still enforces the limits afterwards.
      this.logger.warn(`Could not count people in ${room}: ${err}`);
      return { ok: true };
    }

    const identity = buildIdentity(userId, deviceId);
    const mine = people.filter(
      (c) => c.userId === userId && c.identity !== identity,
    );
    if (mine.length >= MAX_DEVICES_PER_PERSON) {
      return blocked('TOO_MANY_DEVICES');
    }

    if (role === 'STUDENT') {
      const students = new Set(
        people.filter((c) => c.userId !== teacherUserId).map((c) => c.userId),
      );
      if (
        !students.has(userId) &&
        students.size >= MAX_STUDENTS_PER_CLASSROOM
      ) {
        return blocked('ROOM_FULL');
      }
    }
    return { ok: true };
  }

  // ─── After someone connects (LiveKit participant_joined webhook) ───────────

  /** Removes a connection that should not be in the room. Returns why, or
   * null if it may stay. Never touches the teacher or an admin observer. */
  async enforceAfterJoin(params: {
    room: string;
    identity: string;
    joinedAtMs: number;
    kind?: number;
    teacherUserId: string;
  }): Promise<EntryBlockReason | null> {
    const { room, identity, joinedAtMs, kind, teacherUserId } = params;
    if (!isPersonIdentity(identity, kind)) return null;
    const userId = personKey(identity);
    if (userId === teacherUserId) return null;

    const reason = await this.refusalFor(
      room,
      identity,
      userId,
      joinedAtMs,
      teacherUserId,
    );
    if (!reason) return null;

    this.logger.warn(
      `Removing ${identity} from ${room} right after joining: ${reason}`,
    );
    await this.deny(room, identity, reason);
    return reason;
  }

  private async refusalFor(
    room: string,
    identity: string,
    userId: string,
    joinedAtMs: number,
    teacherUserId: string,
  ): Promise<EntryBlockReason | null> {
    // Locked before this connection arrived. A connection that was already in
    // by the time the teacher locked (its webhook just arrived late) stays.
    const lock = await this.getLockState(room);
    if (lock.locked && lock.lockedAt && joinedAtMs >= lock.lockedAt.getTime()) {
      return 'ROOM_LOCKED';
    }

    let people: RoomConnection[];
    try {
      people = await this.rooms.listPeople(room);
    } catch (err) {
      this.logger.warn(`Could not count people in ${room}: ${err}`);
      return null;
    }

    // Seats go to students in the order they arrived; whoever is beyond the
    // ninth is out. A person's seat is their first connection's.
    const firstSeen = new Map<string, number>();
    for (const c of people) {
      if (c.userId === teacherUserId) continue;
      const seen = firstSeen.get(c.userId);
      if (seen === undefined || c.joinedAtMs < seen) {
        firstSeen.set(c.userId, c.joinedAtMs);
      }
    }
    const seatOrder = [...firstSeen.entries()]
      .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))
      .map(([id]) => id);
    if (seatOrder.indexOf(userId) >= MAX_STUDENTS_PER_CLASSROOM) {
      return 'ROOM_FULL';
    }

    const devices = people
      .filter((c) => c.userId === userId)
      .sort(
        (a, b) =>
          a.joinedAtMs - b.joinedAtMs || a.identity.localeCompare(b.identity),
      );
    if (
      devices.findIndex((c) => c.identity === identity) >=
      MAX_DEVICES_PER_PERSON
    ) {
      return 'TOO_MANY_DEVICES';
    }
    return null;
  }

  /** Tell the connection why, give it a moment to show that, then remove it. */
  private async deny(
    room: string,
    identity: string,
    reason: EntryBlockReason,
  ): Promise<void> {
    await this.rooms
      .sendServerEvent(room, [identity], {
        type: 'room-denied',
        reason,
        message: ENTRY_BLOCK_MESSAGE[reason],
      })
      .catch((err) =>
        this.logger.warn(
          `Could not tell ${identity} why they were removed: ${err}`,
        ),
      );
    await this.delay(DENY_REMOVE_DELAY_MS);
    await this.rooms.removeConnection(room, identity);
  }

  protected delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

function blocked(reason: EntryBlockReason): EntryDecision {
  return { ok: false, reason, message: ENTRY_BLOCK_MESSAGE[reason] };
}
