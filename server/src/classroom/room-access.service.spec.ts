import type { DailyRoomsService, RoomConnection } from './daily-rooms.service';
import {
  RoomAccessService,
  ENTRY_BLOCK_MESSAGE,
  refusals,
} from './room-access.service';

const ROOM = 'batch-teacher-1700000000000';
const TEACHER = 'teacher-user';

/** A connection of `userId` (one device or tab of theirs, named by `session`),
 * which joined `at` seconds in. */
function conn(userId: string, session = 'aaaa1111', at = 0): RoomConnection {
  return {
    sessionId: `${userId}-${session}`,
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
    removeConnections: jest.fn().mockResolvedValue(undefined),
  };
  const service = new RoomAccessService(
    prisma as never,
    rooms as unknown as DailyRoomsService,
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
) =>
  s.service.checkEntry({
    room: ROOM,
    userId: who,
    role,
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
    // student-0 coming back in (a refresh, a reconnect): already has a seat.
    expect(await enter(s, 'student-0', 'STUDENT')).toEqual({ ok: true });
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
    expect(await enter(s, 'student-1', 'STUDENT')).toEqual({ ok: true });

    s.set([conn('student-1', 'aaaa1111'), conn('student-1', 'bbbb2222')]);
    expect(await enter(s, 'student-1', 'STUDENT')).toEqual({ ok: true });
  });

  it('refuses a fourth', async () => {
    const three = [
      conn('student-1', 'aaaa1111'),
      conn('student-1', 'bbbb2222'),
      conn('student-1', 'cccc3333'),
    ];
    const s = setup(three);
    expect(await enter(s, 'student-1', 'STUDENT')).toEqual({
      ok: false,
      reason: 'TOO_MANY_DEVICES',
      message: ENTRY_BLOCK_MESSAGE.TOO_MANY_DEVICES,
    });
  });

  it('the teacher can join from several devices too — and is refused a fourth like anyone', async () => {
    const s = setup([conn(TEACHER, 'tdev0001')]);
    expect(await enter(s, TEACHER, 'TEACHER')).toEqual({ ok: true });

    s.set([
      conn(TEACHER, 'tdev0001'),
      conn(TEACHER, 'tdev0002'),
      conn(TEACHER, 'tdev0003'),
    ]);
    expect(await enter(s, TEACHER, 'TEACHER')).toMatchObject({
      ok: false,
      reason: 'TOO_MANY_DEVICES',
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

describe('RoomAccessService — when Daily cannot be asked', () => {
  it('lets the join through rather than shut a real class out (the lock still holds)', async () => {
    const s = setup();
    s.rooms.listPeople.mockRejectedValue(new Error('daily down'));
    expect(await enter(s, 'student-1', 'STUDENT')).toEqual({ ok: true });

    await s.service.setLocked(ROOM, true, TEACHER);
    expect((await enter(s, 'student-1', 'STUDENT')).ok).toBe(false);
  });
});

describe('refusals — who has no business being in the room', () => {
  const unlocked = { locked: false, lockedAt: null };

  it('is nobody in a room that is within its limits', () => {
    const people = [
      conn(TEACHER, 'tdev0001'),
      conn('a', 'aaaa1111', 1),
      conn('a', 'bbbb2222', 2),
      conn('b', 'aaaa1111', 3),
    ];
    expect(refusals(people, unlocked, TEACHER)).toEqual([]);
  });

  it('gives students seats in the order they arrived, whatever order Daily lists them in', () => {
    const students = Array.from({ length: 10 }, (_, i) =>
      conn(`s${i}`, 'aaaa1111', i),
    );
    const out = refusals([...students].reverse(), unlocked, TEACHER);
    expect(out.map((r) => [r.connection.userId, r.reason])).toEqual([
      ['s9', 'ROOM_FULL'],
    ]);
  });

  it('a person’s seat is their first connection’s, however many devices they open later', () => {
    const early = conn('early', 'aaaa1111', 0);
    const crowd = Array.from({ length: 8 }, (_, i) =>
      conn(`s${i}`, 'aaaa1111', 1 + i),
    );
    // `early` reopens on a phone after everyone else: still seat one.
    const out = refusals(
      [early, ...crowd, conn('early', 'bbbb2222', 50)],
      unlocked,
      TEACHER,
    );
    expect(out).toEqual([]);
  });

  it('puts the lock’s moment between who stays and who goes', () => {
    const lockedAt = new Date(1_000_000 + 10_000);
    const lock = { locked: true, lockedAt };
    const before = { ...conn('early'), joinedAtMs: lockedAt.getTime() - 1 };
    const after = { ...conn('late'), joinedAtMs: lockedAt.getTime() + 1 };
    const out = refusals([before, after], lock, TEACHER);
    expect(out.map((r) => [r.connection.userId, r.reason])).toEqual([
      ['late', 'ROOM_LOCKED'],
    ]);
  });

  it('a lock with no moment recorded removes nobody (it can only keep people out at the door)', () => {
    expect(
      refusals([conn('x')], { locked: true, lockedAt: null }, TEACHER),
    ).toEqual([]);
  });

  it('never refuses the teacher, on any number of devices, locked or full', () => {
    const lockedAt = new Date(1_000_000);
    const teacherEverywhere = ['a', 'b', 'c', 'd'].map((d, i) =>
      conn(TEACHER, d, 100 + i),
    );
    expect(
      refusals(teacherEverywhere, { locked: true, lockedAt }, TEACHER),
    ).toEqual([]);
  });

  it('refuses a fourth device of one person — the newest — and not the first three', () => {
    const devs = ['aaaa1111', 'bbbb2222', 'cccc3333', 'dddd4444'].map((d, i) =>
      conn('student-1', d, i),
    );
    const out = refusals(devs, unlocked, TEACHER);
    expect(out).toEqual([{ connection: devs[3], reason: 'TOO_MANY_DEVICES' }]);
  });
});

describe('RoomAccessService — removing anyone who got past the token check', () => {
  const enforce = (s: ReturnType<typeof setup>) =>
    s.service.enforceRoom({ room: ROOM, teacherUserId: TEACHER });

  it('removes a student who connected after the teacher locked — and tells them why first', async () => {
    const s = setup();
    await s.service.setLocked(ROOM, true, TEACHER);
    const lockedAt = s.rows.get(ROOM)!.lockedAt!.getTime();
    const latecomer = { ...conn('latecomer'), joinedAtMs: lockedAt + 5000 };
    s.set([conn(TEACHER, 'tdev0001'), latecomer]);

    expect(await enforce(s)).toEqual([
      { sessionId: latecomer.sessionId, reason: 'ROOM_LOCKED' },
    ]);
    expect(s.rooms.sendServerEvent).toHaveBeenCalledWith(ROOM, [latecomer], {
      type: 'room-denied',
      reason: 'ROOM_LOCKED',
      message: ENTRY_BLOCK_MESSAGE.ROOM_LOCKED,
    });
    expect(s.rooms.removeConnections).toHaveBeenCalledWith(ROOM, [
      latecomer.sessionId,
    ]);
    // told first, then removed
    expect(s.rooms.sendServerEvent.mock.invocationCallOrder[0]).toBeLessThan(
      s.rooms.removeConnections.mock.invocationCallOrder[0],
    );
  });

  it('leaves a student who was already connected when the lock went on (their token check just came late)', async () => {
    const s = setup();
    await s.service.setLocked(ROOM, true, TEACHER);
    const lockedAt = s.rows.get(ROOM)!.lockedAt!.getTime();
    s.set([{ ...conn('early'), joinedAtMs: lockedAt - 2000 }]);
    expect(await enforce(s)).toEqual([]);
    expect(s.rooms.removeConnections).not.toHaveBeenCalled();
  });

  it('never removes the teacher', async () => {
    const s = setup();
    await s.service.setLocked(ROOM, true, TEACHER);
    const later = s.rows.get(ROOM)!.lockedAt!.getTime() + 9999;
    s.set([{ ...conn(TEACHER, 'tdev0001'), joinedAtMs: later }]);
    expect(await enforce(s)).toEqual([]);
    expect(s.rooms.removeConnections).not.toHaveBeenCalled();
  });

  it('when two students race for the last seat, the one who arrived second is removed', async () => {
    const first = Array.from({ length: 8 }, (_, i) =>
      conn(`s${i}`, 'aaaa1111', i),
    );
    const winner = conn('winner', 'aaaa1111', 100);
    const loser = conn('loser', 'aaaa1111', 101);
    const tenth = conn('tenth', 'aaaa1111', 102);
    const s = setup([conn(TEACHER, 'tdev0001'), ...first, winner, loser]);

    expect(await enforce(s)).toEqual([
      { sessionId: loser.sessionId, reason: 'ROOM_FULL' },
    ]);
    expect(s.rooms.removeConnections).toHaveBeenCalledTimes(1);
    expect(s.rooms.removeConnections).toHaveBeenCalledWith(ROOM, [
      loser.sessionId,
    ]);

    // …and a third latecomer in the same check goes too, in one pass.
    const t = setup([
      conn(TEACHER, 'tdev0001'),
      ...first,
      winner,
      loser,
      tenth,
    ]);
    expect((await enforce(t)).map((r) => r.sessionId)).toEqual([
      loser.sessionId,
      tenth.sessionId,
    ]);
  });

  it('removes a fourth device of one person, not the first three', async () => {
    const devs = ['aaaa1111', 'bbbb2222', 'cccc3333', 'dddd4444'].map((d, i) =>
      conn('student-1', d, i),
    );
    const s = setup(devs);
    expect(await enforce(s)).toEqual([
      { sessionId: devs[3].sessionId, reason: 'TOO_MANY_DEVICES' },
    ]);
    expect(s.rooms.removeConnections).toHaveBeenCalledWith(ROOM, [
      devs[3].sessionId,
    ]);
  });

  it('does nothing if Daily cannot be asked, and still removes the person if it can’t say why', async () => {
    const s = setup();
    s.rooms.listPeople.mockRejectedValue(new Error('down'));
    expect(await enforce(s)).toEqual([]);

    // The reason could not be delivered: the connection is still removed.
    const t = setup();
    await t.service.setLocked(ROOM, true, TEACHER);
    t.rooms.sendServerEvent.mockRejectedValue(new Error('app message failed'));
    const late = {
      ...conn('late'),
      joinedAtMs: t.rows.get(ROOM)!.lockedAt!.getTime() + 1,
    };
    t.set([late]);
    await enforce(t);
    expect(t.rooms.removeConnections).toHaveBeenCalledWith(ROOM, [
      late.sessionId,
    ]);
  });

  it('does not tell or remove the same connection twice while it is being removed', async () => {
    const s = setup();
    await s.service.setLocked(ROOM, true, TEACHER);
    const late = {
      ...conn('late'),
      joinedAtMs: s.rows.get(ROOM)!.lockedAt!.getTime() + 1,
    };
    s.set([late]);
    // Hold the removal open (the "read why" pause), and ask again meanwhile.
    let release: () => void = () => undefined;
    jest
      .spyOn(s.service as unknown as { delay: () => Promise<void> }, 'delay')
      .mockReturnValue(new Promise<void>((resolve) => (release = resolve)));
    const first = enforce(s);
    await new Promise((resolve) => setImmediate(resolve));
    expect(await enforce(s)).toEqual([]);
    release();
    await first;
    expect(s.rooms.sendServerEvent).toHaveBeenCalledTimes(1);
    expect(s.rooms.removeConnections).toHaveBeenCalledTimes(1);
  });
});

describe('RoomAccessService.scheduleEnforcement', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('checks the room twice after a join — once the browser has connected, once more for a slow connection', async () => {
    const s = setup();
    s.service.scheduleEnforcement(ROOM, TEACHER);
    expect(s.rooms.listPeople).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(4_000);
    expect(s.rooms.listPeople).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(11_000);
    expect(s.rooms.listPeople).toHaveBeenCalledTimes(2);

    await jest.advanceTimersByTimeAsync(60_000);
    expect(s.rooms.listPeople).toHaveBeenCalledTimes(2);
  });

  it('covers every join that arrives while a check is already queued with that one check', async () => {
    const s = setup();
    s.service.scheduleEnforcement(ROOM, TEACHER);
    s.service.scheduleEnforcement(ROOM, TEACHER);
    s.service.scheduleEnforcement(ROOM, TEACHER);
    await jest.advanceTimersByTimeAsync(20_000);
    expect(s.rooms.listPeople).toHaveBeenCalledTimes(2);
  });

  it('queues again once the earlier checks have run, and keeps rooms apart', async () => {
    const s = setup();
    s.service.scheduleEnforcement(ROOM, TEACHER);
    s.service.scheduleEnforcement('lesson-other', TEACHER);
    await jest.advanceTimersByTimeAsync(20_000);
    expect(s.rooms.listPeople).toHaveBeenCalledTimes(4);
    expect(s.rooms.listPeople).toHaveBeenCalledWith('lesson-other');

    s.service.scheduleEnforcement(ROOM, TEACHER);
    await jest.advanceTimersByTimeAsync(4_000);
    expect(s.rooms.listPeople).toHaveBeenCalledTimes(5);
  });

  it('a failing check is logged, never thrown into the join that queued it', async () => {
    const s = setup();
    s.rooms.listPeople.mockRejectedValue(new Error('down'));
    s.service.scheduleEnforcement(ROOM, TEACHER);
    await expect(jest.advanceTimersByTimeAsync(20_000)).resolves.not.toThrow();
  });
});
