import type {
  LiveKitRoomsService,
  RoomConnection,
} from './livekit-rooms.service';
import { RoomAccessService, ENTRY_BLOCK_MESSAGE } from './room-access.service';
import { buildIdentity } from './room-ref.util';

const ROOM = 'batch-teacher-1700000000000';
const TEACHER = 'teacher-user';

/** A connection of `userId` on `device`, which joined at `at` (seconds in). */
function conn(userId: string, device = 'aaaa1111', at = 0): RoomConnection {
  return {
    identity: buildIdentity(userId, device),
    userId,
    name: userId,
    joinedAtMs: 1_000_000 + at * 1000,
  };
}

function setup(people: RoomConnection[] = []) {
  const rows = new Map<
    string,
    {
      room: string;
      locked: boolean;
      lockedAt: Date | null;
      lockedByUserId: string | null;
    }
  >();
  const prisma = {
    classroomRoomState: {
      findUnique: jest.fn(({ where }: { where: { room: string } }) =>
        Promise.resolve(rows.get(where.room) ?? null),
      ),
      upsert: jest.fn(
        ({
          where,
          create,
          update,
        }: {
          where: { room: string };
          create: {
            room: string;
            locked: boolean;
            lockedAt: Date | null;
            lockedByUserId: string | null;
          };
          update: {
            locked: boolean;
            lockedAt: Date | null;
            lockedByUserId: string | null;
          };
        }) => {
          const next = rows.has(where.room)
            ? { ...rows.get(where.room)!, ...update }
            : create;
          rows.set(where.room, next);
          return Promise.resolve(next);
        },
      ),
    },
  };
  const rooms = {
    listPeople: jest.fn().mockResolvedValue(people),
    sendServerEvent: jest.fn().mockResolvedValue(1),
    removeConnection: jest.fn().mockResolvedValue(undefined),
  };
  const service = new RoomAccessService(
    prisma as never,
    rooms as unknown as LiveKitRoomsService,
  );
  // Nobody should wait in a test for the "read why" pause.
  jest
    .spyOn(service as unknown as { delay: () => Promise<void> }, 'delay')
    .mockResolvedValue(undefined);
  const set = (p: RoomConnection[]) => rooms.listPeople.mockResolvedValue(p);
  return { service, prisma, rooms, rows, set };
}

const enter = (
  s: ReturnType<typeof setup>,
  who: string,
  role: 'TEACHER' | 'STUDENT',
  device = 'newdev01',
) =>
  s.service.checkEntry({
    room: ROOM,
    userId: who,
    role,
    deviceId: device,
    teacherUserId: TEACHER,
  });

describe('RoomAccessService — the lock', () => {
  it('a classroom starts unlocked', async () => {
    const s = setup();
    expect(await s.service.isLocked(ROOM)).toBe(false);
    expect(await enter(s, 'student-1', 'STUDENT')).toEqual({ ok: true });
  });

  it('locking and unlocking is saved, and repeating either changes nothing', async () => {
    const s = setup();
    expect(await s.service.setLocked(ROOM, true, TEACHER)).toEqual({
      locked: true,
    });
    const lockedAt = s.rows.get(ROOM)!.lockedAt;
    expect(lockedAt).toBeInstanceOf(Date);
    expect(s.rows.get(ROOM)!.lockedByUserId).toBe(TEACHER);

    await s.service.setLocked(ROOM, true, TEACHER); // again
    expect(s.prisma.classroomRoomState.upsert).toHaveBeenCalledTimes(1);
    expect(s.rows.get(ROOM)!.lockedAt).toBe(lockedAt);

    expect(await s.service.setLocked(ROOM, false, TEACHER)).toEqual({
      locked: false,
    });
    expect(await s.service.isLocked(ROOM)).toBe(false);
    expect(s.rows.get(ROOM)!.lockedAt).toBeNull();

    await s.service.setLocked(ROOM, false, TEACHER); // again
    expect(s.prisma.classroomRoomState.upsert).toHaveBeenCalledTimes(2);
  });

  it('while locked, no student can join — a newcomer, someone who left, or an extra device', async () => {
    const s = setup([conn('student-present')]);
    await s.service.setLocked(ROOM, true, TEACHER);

    for (const who of ['student-new', 'student-present']) {
      expect(await enter(s, who, 'STUDENT')).toEqual({
        ok: false,
        reason: 'ROOM_LOCKED',
        message: ENTRY_BLOCK_MESSAGE.ROOM_LOCKED,
      });
    }
  });

  it('the teacher is never locked out of their own class', async () => {
    const s = setup();
    await s.service.setLocked(ROOM, true, TEACHER);
    expect(await enter(s, TEACHER, 'TEACHER')).toEqual({ ok: true });
  });

  it('unlocking lets students in again', async () => {
    const s = setup();
    await s.service.setLocked(ROOM, true, TEACHER);
    await s.service.setLocked(ROOM, false, TEACHER);
    expect(await enter(s, 'student-1', 'STUDENT')).toEqual({ ok: true });
  });

  it('a lock on one classroom does not touch another', async () => {
    const s = setup();
    await s.service.setLocked(ROOM, true, TEACHER);
    expect(await s.service.isLocked('lesson-other')).toBe(false);
  });
});

describe('RoomAccessService — ten people at most', () => {
  const students = (n: number) =>
    Array.from({ length: n }, (_, i) => conn(`student-${i}`, 'aaaa1111', i));

  it('lets in students up to the ninth, then says the class is full', async () => {
    const s = setup([conn(TEACHER, 'tdev0001'), ...students(8)]);
    expect(await enter(s, 'student-ninth', 'STUDENT')).toEqual({ ok: true });

    s.set([conn(TEACHER, 'tdev0001'), ...students(9)]);
    expect(await enter(s, 'student-tenth', 'STUDENT')).toEqual({
      ok: false,
      reason: 'ROOM_FULL',
      message: ENTRY_BLOCK_MESSAGE.ROOM_FULL,
    });
  });

  it('keeps the teacher’s seat free: nine students and the teacher walks in', async () => {
    const s = setup(students(9));
    expect(await enter(s, TEACHER, 'TEACHER')).toEqual({ ok: true });
  });

  it('a student already in the room is not counted twice, or turned away, when the room is full', async () => {
    const s = setup([conn(TEACHER, 'tdev0001'), ...students(9)]);
    // student-0 reconnecting from the same device (a refresh): same identity.
    expect(
      await s.service.checkEntry({
        room: ROOM,
        userId: 'student-0',
        role: 'STUDENT',
        deviceId: 'aaaa1111',
        teacherUserId: TEACHER,
      }),
    ).toEqual({ ok: true });
  });

  it('devices are not people: nine students on two devices each still leave room for the ninth', async () => {
    const twoEach = students(8).flatMap((c) => [c, conn(c.userId, 'bbbb2222')]);
    const s = setup([conn(TEACHER, 'tdev0001'), ...twoEach]);
    expect(await enter(s, 'student-ninth', 'STUDENT')).toEqual({ ok: true });
  });
});

describe('RoomAccessService — one person, several devices', () => {
  it('allows a second and a third device', async () => {
    const s = setup([conn('student-1', 'aaaa1111')]);
    expect(await enter(s, 'student-1', 'STUDENT', 'bbbb2222')).toEqual({
      ok: true,
    });

    s.set([conn('student-1', 'aaaa1111'), conn('student-1', 'bbbb2222')]);
    expect(await enter(s, 'student-1', 'STUDENT', 'cccc3333')).toEqual({
      ok: true,
    });
  });

  it('refuses a fourth, but not a refresh of one they already have', async () => {
    const three = [
      conn('student-1', 'aaaa1111'),
      conn('student-1', 'bbbb2222'),
      conn('student-1', 'cccc3333'),
    ];
    const s = setup(three);
    expect(await enter(s, 'student-1', 'STUDENT', 'dddd4444')).toEqual({
      ok: false,
      reason: 'TOO_MANY_DEVICES',
      message: ENTRY_BLOCK_MESSAGE.TOO_MANY_DEVICES,
    });
    expect(await enter(s, 'student-1', 'STUDENT', 'bbbb2222')).toEqual({
      ok: true,
    });
  });

  it('the teacher can join from several devices too', async () => {
    const s = setup([conn(TEACHER, 'tdev0001')]);
    expect(await enter(s, TEACHER, 'TEACHER', 'tdev0002')).toEqual({
      ok: true,
    });
  });

  it('a second device does not take a second seat from the class', async () => {
    const eight = Array.from({ length: 8 }, (_, i) =>
      conn(`s${i}`, 'aaaa1111', i),
    );
    const s = setup([
      conn(TEACHER, 'tdev0001'),
      ...eight,
      conn('s0', 'bbbb2222', 9),
    ]);
    expect(await enter(s, 'ninth', 'STUDENT')).toEqual({ ok: true });
  });
});

describe('RoomAccessService — when LiveKit cannot be asked', () => {
  it('lets the join through rather than shut a real class out (the lock still holds)', async () => {
    const s = setup();
    s.rooms.listPeople.mockRejectedValue(new Error('livekit down'));
    expect(await enter(s, 'student-1', 'STUDENT')).toEqual({ ok: true });

    await s.service.setLocked(ROOM, true, TEACHER);
    expect((await enter(s, 'student-1', 'STUDENT')).ok).toBe(false);
  });
});

describe('RoomAccessService — removing anyone who got past the token check', () => {
  const after = (
    s: ReturnType<typeof setup>,
    identity: string,
    joinedAtMs: number,
    kind = 0,
  ) =>
    s.service.enforceAfterJoin({
      room: ROOM,
      identity,
      joinedAtMs,
      kind,
      teacherUserId: TEACHER,
    });

  it('removes a student who connected after the teacher locked — and tells them why first', async () => {
    const s = setup();
    await s.service.setLocked(ROOM, true, TEACHER);
    const lockedAt = s.rows.get(ROOM)!.lockedAt!.getTime();
    const identity = buildIdentity('latecomer', 'aaaa1111');
    s.set([conn('latecomer')]);

    expect(await after(s, identity, lockedAt + 5000)).toBe('ROOM_LOCKED');
    expect(s.rooms.sendServerEvent).toHaveBeenCalledWith(ROOM, [identity], {
      type: 'room-denied',
      reason: 'ROOM_LOCKED',
      message: ENTRY_BLOCK_MESSAGE.ROOM_LOCKED,
    });
    expect(s.rooms.removeConnection).toHaveBeenCalledWith(ROOM, identity);
    // told first, then removed
    expect(s.rooms.sendServerEvent.mock.invocationCallOrder[0]).toBeLessThan(
      s.rooms.removeConnection.mock.invocationCallOrder[0],
    );
  });

  it('leaves a student who was already connected when the lock went on (their webhook just arrived late)', async () => {
    const s = setup();
    await s.service.setLocked(ROOM, true, TEACHER);
    const lockedAt = s.rows.get(ROOM)!.lockedAt!.getTime();
    s.set([conn('early')]);
    expect(
      await after(s, buildIdentity('early', 'aaaa1111'), lockedAt - 2000),
    ).toBeNull();
    expect(s.rooms.removeConnection).not.toHaveBeenCalled();
  });

  it('never removes the teacher, an admin observer or LiveKit’s own participants', async () => {
    const s = setup();
    await s.service.setLocked(ROOM, true, TEACHER);
    const later = s.rows.get(ROOM)!.lockedAt!.getTime() + 9999;
    expect(
      await after(s, buildIdentity(TEACHER, 'tdev0001'), later),
    ).toBeNull();
    expect(await after(s, 'admin-observer-1', later)).toBeNull();
    expect(await after(s, 'EG_recorder', later)).toBeNull();
    expect(await after(s, buildIdentity('x', 'aaaa1111'), later, 2)).toBeNull();
    expect(s.rooms.removeConnection).not.toHaveBeenCalled();
  });

  it('when two students race for the last seat, the one who arrived second is removed', async () => {
    const first = Array.from({ length: 8 }, (_, i) =>
      conn(`s${i}`, 'aaaa1111', i),
    );
    const winner = conn('winner', 'aaaa1111', 100);
    const loser = conn('loser', 'aaaa1111', 101);
    const s = setup([conn(TEACHER, 'tdev0001'), ...first, winner, loser]);

    expect(await after(s, winner.identity, winner.joinedAtMs)).toBeNull();
    expect(await after(s, loser.identity, loser.joinedAtMs)).toBe('ROOM_FULL');
    expect(s.rooms.removeConnection).toHaveBeenCalledTimes(1);
    expect(s.rooms.removeConnection).toHaveBeenCalledWith(ROOM, loser.identity);
  });

  it('removes a fourth device of one person, not the first three', async () => {
    const devs = ['aaaa1111', 'bbbb2222', 'cccc3333', 'dddd4444'].map((d, i) =>
      conn('student-1', d, i),
    );
    const s = setup(devs);
    expect(await after(s, devs[2].identity, devs[2].joinedAtMs)).toBeNull();
    expect(await after(s, devs[3].identity, devs[3].joinedAtMs)).toBe(
      'TOO_MANY_DEVICES',
    );
    expect(s.rooms.removeConnection).toHaveBeenCalledWith(
      ROOM,
      devs[3].identity,
    );
  });

  it('does nothing if LiveKit cannot be asked, and still removes the person if it can’t say why', async () => {
    const s = setup();
    s.rooms.listPeople.mockRejectedValue(new Error('down'));
    expect(
      await after(s, buildIdentity('student-1', 'aaaa1111'), Date.now()),
    ).toBeNull();

    // The reason could not be delivered: the connection is still removed.
    const t = setup();
    await t.service.setLocked(ROOM, true, TEACHER);
    t.rooms.sendServerEvent.mockRejectedValue(
      new Error('data channel not ready'),
    );
    const identity = buildIdentity('late', 'aaaa1111');
    t.set([conn('late')]);
    await after(t, identity, t.rows.get(ROOM)!.lockedAt!.getTime() + 1);
    expect(t.rooms.removeConnection).toHaveBeenCalledWith(ROOM, identity);
  });
});
