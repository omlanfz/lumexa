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
// before the browser even tries to connect); `enforceRoom` looks at who is
// really in the room a few seconds after a token was issued (scheduleEnforcement)
// and removes anyone who got past it — a token issued just before the teacher
// locked, two people racing for the last seat. Neither the lock nor a full class
// ever keeps the teacher out, the teacher is never removed after joining, and
// admin observers are never counted or refused (they do not go through here).

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { DailyRoomsService, type RoomConnection } from './daily-rooms.service';
import {
  MAX_DEVICES_PER_PERSON,
  MAX_PEOPLE_PER_CLASSROOM,
  MAX_STUDENTS_PER_CLASSROOM,
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

/** How long after a token is issued the room is checked for people who should
 * not be in it: once the browser has had time to connect, and once more for a
 * slow connection. */
const ENFORCE_AFTER_MS = [4_000, 15_000];

/** The lock rule's snapshot of the room's lock. */
type LockState = { locked: boolean; lockedAt: Date | null };

@Injectable()
export class RoomAccessService {
  private readonly logger = new Logger(RoomAccessService.name);

  /** Rooms with a check already queued (further joins are covered by it). */
  private readonly queued = new Map<string, NodeJS.Timeout[]>();
  /** Connections being told why they are going (not told twice). */
  private readonly denying = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly rooms: DailyRoomsService,
  ) {}

  // ─── The lock ──────────────────────────────────────────────────────────────

  async getLockState(room: string): Promise<LockState> {
    const row = await this.prisma.classroomRoomState.findUnique({
      where: { room },
    });
    return { locked: row?.locked ?? false, lockedAt: row?.lockedAt ?? null };
  }

  async isLocked(room: string): Promise<boolean> {
    return (await this.getLockState(room)).locked;
  }

  /** Lock or unlock. Idempotent: locking a locked room keeps its original
   * lockedAt (the after-join check compares join times against it). */
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
    teacherUserId: string;
  }): Promise<EntryDecision> {
    const { room, userId, role, teacherUserId } = params;

    if (role === 'STUDENT' && (await this.isLocked(room))) {
      return blocked('ROOM_LOCKED');
    }

    let people: RoomConnection[];
    try {
      people = await this.rooms.listPeople(room);
    } catch (err) {
      // Daily not answering must not shut a real class out of its room; the
      // check after joining still enforces the limits.
      this.logger.warn(`Could not count people in ${room}: ${err}`);
      return { ok: true };
    }

    if (
      people.filter((c) => c.userId === userId).length >= MAX_DEVICES_PER_PERSON
    ) {
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

  // ─── After people connect ──────────────────────────────────────────────────

  /** Checks the room a few seconds after a token was issued (and again a little
   * later), without making the join wait. One check is queued per room at a
   * time: joins that arrive while it is pending are covered by it. */
  scheduleEnforcement(room: string, teacherUserId: string): void {
    if (this.queued.has(room)) return;
    const timers = ENFORCE_AFTER_MS.map((ms, i) => {
      const timer = setTimeout(() => {
        if (i === ENFORCE_AFTER_MS.length - 1) this.queued.delete(room);
        this.enforceRoom({ room, teacherUserId }).catch((err) =>
          this.logger.warn(`Room check for ${room} failed: ${err}`),
        );
      }, ms);
      // A queued check must never keep the server from shutting down.
      timer.unref();
      return timer;
    });
    this.queued.set(room, timers);
  }

  /** Removes every connection that should not be in the room, telling each why
   * first. Returns who was refused, and why. Never touches the teacher or an
   * admin observer. */
  async enforceRoom(params: {
    room: string;
    teacherUserId: string;
  }): Promise<{ sessionId: string; reason: EntryBlockReason }[]> {
    const { room, teacherUserId } = params;

    let people: RoomConnection[];
    try {
      people = await this.rooms.listPeople(room);
    } catch (err) {
      this.logger.warn(`Could not count people in ${room}: ${err}`);
      return [];
    }
    const lock = await this.getLockState(room);

    const refused = refusals(people, lock, teacherUserId).filter(
      ({ connection }) => !this.denying.has(connection.sessionId),
    );
    for (const { connection, reason } of refused) {
      this.logger.warn(
        `Removing ${connection.userId} (${connection.sessionId}) from ${room}: ${reason}`,
      );
      this.denying.add(connection.sessionId);
    }
    await Promise.all(
      refused.map(({ connection, reason }) =>
        this.deny(room, connection, reason).finally(() =>
          this.denying.delete(connection.sessionId),
        ),
      ),
    );
    return refused.map(({ connection, reason }) => ({
      sessionId: connection.sessionId,
      reason,
    }));
  }

  /** Tell the connection why, give it a moment to show that, then remove it. */
  private async deny(
    room: string,
    connection: RoomConnection,
    reason: EntryBlockReason,
  ): Promise<void> {
    await this.rooms
      .sendServerEvent(room, [connection], {
        type: 'room-denied',
        reason,
        message: ENTRY_BLOCK_MESSAGE[reason],
      })
      .catch((err) =>
        this.logger.warn(
          `Could not tell ${connection.sessionId} why they were removed: ${err}`,
        ),
      );
    await this.delay(DENY_REMOVE_DELAY_MS);
    await this.rooms.removeConnections(room, [connection.sessionId]);
  }

  protected delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Who in this room has no business being there. Seats go to students in the
 * order they arrived — whoever is beyond the ninth is out; a person's seat is
 * their first connection's. A connection that was already in by the time the
 * teacher locked stays; one that arrived after is out. Extra devices beyond the
 * third go, newest first. The teacher is never refused.
 */
export function refusals(
  people: RoomConnection[],
  lock: LockState,
  teacherUserId: string,
): { connection: RoomConnection; reason: EntryBlockReason }[] {
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

  const out: { connection: RoomConnection; reason: EntryBlockReason }[] = [];
  for (const c of people) {
    if (c.userId === teacherUserId) continue;

    if (
      lock.locked &&
      lock.lockedAt &&
      c.joinedAtMs >= lock.lockedAt.getTime()
    ) {
      out.push({ connection: c, reason: 'ROOM_LOCKED' });
      continue;
    }
    if (seatOrder.indexOf(c.userId) >= MAX_STUDENTS_PER_CLASSROOM) {
      out.push({ connection: c, reason: 'ROOM_FULL' });
      continue;
    }
    const devices = people
      .filter((d) => d.userId === c.userId)
      .sort(
        (a, b) =>
          a.joinedAtMs - b.joinedAtMs || a.sessionId.localeCompare(b.sessionId),
      );
    if (
      devices.findIndex((d) => d.sessionId === c.sessionId) >=
      MAX_DEVICES_PER_PERSON
    ) {
      out.push({ connection: c, reason: 'TOO_MANY_DEVICES' });
    }
  }
  return out;
}

function blocked(reason: EntryBlockReason): EntryDecision {
  return { ok: false, reason, message: ENTRY_BLOCK_MESSAGE[reason] };
}
