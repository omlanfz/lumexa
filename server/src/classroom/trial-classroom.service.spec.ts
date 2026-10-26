import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { TokenVerifier } from 'livekit-server-sdk';
import { TrialClassroomService } from './trial-classroom.service';

const KEY = 'devkey';
const SECRET = 'devsecret-devsecret-devsecret-devsecret';
const TOKEN = 'k3Jx9QmLw0pZ7vNc2RtYb5HdFgAe8UiOsXn1MqWjC4E';
const NOW = new Date('2026-11-10T09:55:00Z'); // 5 min before the start
const start = new Date('2026-11-10T10:00:00Z');
const end = new Date('2026-11-10T10:30:00Z');

const lead = (over: object = {}) => ({
  id: 'lead-1',
  childName: 'Alex',
  appointmentStatus: 'CONFIRMED',
  startAt: start,
  endAt: end,
  teacherId: 'tp-1',
  guestToken: TOKEN,
  teacher: { userId: 'teacher-user-1', user: { fullName: 'Ms Karim' } },
  ...over,
});

function build(row: any = lead(), entry: any = { ok: true }) {
  const prisma: any = {
    trialLead: {
      findUnique: jest.fn().mockResolvedValue(row),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
  };
  const roomAccess: any = {
    checkEntry: jest.fn().mockResolvedValue(entry),
    isLocked: jest.fn().mockResolvedValue(false),
  };
  const audit: any = { log: jest.fn().mockResolvedValue({}) };
  return {
    prisma,
    roomAccess,
    audit,
    service: new TrialClassroomService(prisma, roomAccess, audit),
  };
}

const verify = (jwt: string) =>
  new TokenVerifier(KEY, SECRET).verify(jwt) as Promise<any>;

beforeEach(() => {
  process.env.LIVEKIT_API_KEY = KEY;
  process.env.LIVEKIT_API_SECRET = SECRET;
  process.env.LIVEKIT_URL = 'wss://example.livekit.cloud';
});

describe('TrialClassroomService.guestStatus', () => {
  it('tells the link holder what to show, using the server clock', async () => {
    const { service } = build();
    const res = await service.guestStatus(TOKEN, NOW);
    expect(res).toMatchObject({
      state: 'OPEN',
      canJoin: true,
      message: null,
      childName: 'Alex',
      startAt: start.toISOString(),
      opensAt: '2026-11-10T09:50:00.000Z',
      serverNow: NOW.toISOString(),
    });
  });

  it('exposes nothing about the teacher, the parent or other trials', async () => {
    const { service } = build(
      lead({
        parentEmail: 'secret@example.com',
        parentPhone: '+8801712345678',
        adminNotes: 'internal',
      }),
    );
    const json = JSON.stringify(await service.guestStatus(TOKEN, NOW));
    expect(json).not.toMatch(/secret@|8801712|internal|Karim|teacher-user/);
    expect(json).not.toContain(TOKEN);
  });

  it('explains why the link does not work yet / any more', async () => {
    const cases: [object, Date, string, RegExp][] = [
      [{}, new Date(start.getTime() - 3600_000), 'NOT_YET', /opens 10 minutes/],
      [
        {},
        new Date(end.getTime() + 3 * 3600_000),
        'ENDED',
        /already taken place/,
      ],
      [{ appointmentStatus: 'CANCELLED' }, NOW, 'CANCELLED', /cancelled/],
      [{ teacherId: null, teacher: null }, NOW, 'AWAITING_TEACHER', /teacher/],
    ];
    for (const [over, now, state, msg] of cases) {
      const { service } = build(lead(over));
      const res = await service.guestStatus(TOKEN, now);
      expect(res.state).toBe(state);
      expect(res.canJoin).toBe(false);
      expect(res.message).toMatch(msg);
    }
  });

  it('unknown and malformed tokens are the same plain 404, and malformed ones never query the database', async () => {
    const { service, prisma } = build(null);
    await expect(
      service.guestStatus('x'.repeat(40), NOW),
    ).rejects.toBeInstanceOf(NotFoundException);
    prisma.trialLead.findUnique.mockClear();
    for (const bad of ['', 'short', "'; DROP TABLE", '../x'.padEnd(40, 'a')]) {
      await expect(service.guestStatus(bad, NOW)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    }
    expect(prisma.trialLead.findUnique).not.toHaveBeenCalled();
  });
});

describe('TrialClassroomService.joinAsGuest — secure guest access', () => {
  it('issues a short-lived LiveKit token bound to this trial room only, with no admin rights', async () => {
    const { service, prisma } = build();
    const res: any = await service.joinAsGuest(TOKEN, 'abcd1234abcd1234', NOW);
    expect(res).toMatchObject({
      roomName: 'trial-lead-1',
      url: 'wss://example.livekit.cloud',
      scheduledStart: start.toISOString(),
      classType: 'ONE_TO_ONE',
      isTrial: true,
      roomLocked: false,
    });
    const claims = await verify(res.token);
    expect(claims.sub).toBe('trial-guest-lead-1~abcd1234abcd1234');
    expect(claims.name).toBe('Alex (Student)');
    expect(claims.video).toMatchObject({
      room: 'trial-lead-1',
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
    });
    // only joining that one room: never room admin / create / list / record
    for (const forbidden of [
      'roomAdmin',
      'roomCreate',
      'roomList',
      'roomRecord',
      'canUpdateOwnMetadata',
      'hidden',
      'recorder',
    ]) {
      expect(claims.video[forbidden]).toBeFalsy();
    }
    // expires soon after the joining window — never a long-lived credential
    // (livekit stamps `exp` from the real clock; the join was at 09:55 and the
    // window closes at 11:00, so: 65 minutes + a 15-minute margin)
    const ttlMin = (claims.exp - Date.now() / 1000) / 60;
    expect(ttlMin).toBeGreaterThan(78);
    expect(ttlMin).toBeLessThan(82);
    // the secrets never leave the server
    const json = JSON.stringify(res);
    expect(json).not.toContain(SECRET);
    expect(json).not.toContain(TOKEN);
    expect(prisma.trialLead.updateMany.mock.calls[0][0]).toMatchObject({
      where: { id: 'lead-1', guestJoinedAt: null },
    });
  });

  it('the guest is treated as a student for the lock / 10-people / device limits', async () => {
    const { service, roomAccess } = build();
    await service.joinAsGuest(TOKEN, 'abcd1234', NOW);
    expect(roomAccess.checkEntry).toHaveBeenCalledWith({
      room: 'trial-lead-1',
      userId: 'trial-guest-lead-1',
      role: 'STUDENT',
      deviceId: 'abcd1234',
      teacherUserId: 'teacher-user-1',
    });
  });

  it('answers a locked / full room like every other class (a normal, retryable refusal)', async () => {
    const { service } = build(lead(), {
      ok: false,
      reason: 'ROOM_LOCKED',
      message: 'locked',
    });
    await expect(
      service.joinAsGuest(TOKEN, 'abcd1234', NOW),
    ).resolves.toMatchObject({
      blocked: true,
      reason: 'ROOM_LOCKED',
    });
  });

  it.each([
    ['too early', {}, new Date(start.getTime() - 11 * 60_000)],
    ['after the window', {}, new Date(end.getTime() + 31 * 60_000)],
    ['cancelled', { appointmentStatus: 'CANCELLED' }, NOW],
    ['completed', { appointmentStatus: 'COMPLETED' }, NOW],
    ['missed', { appointmentStatus: 'MISSED' }, NOW],
    ['no teacher assigned yet', { teacherId: null, teacher: null }, NOW],
  ])(
    'refuses a valid link when the trial is %s — and issues no token',
    async (_l, over, now) => {
      const { service, prisma, roomAccess } = build(lead(over));
      await expect(
        service.joinAsGuest(TOKEN, 'abcd1234', now),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(roomAccess.checkEntry).not.toHaveBeenCalled();
      expect(prisma.trialLead.updateMany).not.toHaveBeenCalled();
    },
  );

  it('is open from 10 minutes before until 30 minutes after the end', async () => {
    for (const offsetMin of [-10, 0, 25, 60]) {
      const { service } = build();
      await expect(
        service.joinAsGuest(
          TOKEN,
          'abcd1234',
          new Date(start.getTime() + offsetMin * 60_000),
        ),
      ).resolves.toHaveProperty('token');
    }
  });

  it('a token for another trial or an unknown token cannot enter', async () => {
    const { service } = build(null);
    await expect(
      service.joinAsGuest(TOKEN, 'abcd1234', NOW),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('refuses when video is not configured', async () => {
    delete process.env.LIVEKIT_API_SECRET;
    const { service } = build();
    await expect(service.joinAsGuest(TOKEN, 'abcd1234', NOW)).rejects.toThrow(
      /not configured/,
    );
  });

  it('a malformed device id falls back to a fixed one rather than reaching the identity', async () => {
    const { service } = build();
    const res: any = await service.joinAsGuest(TOKEN, '../../evil id', NOW);
    expect((await verify(res.token)).sub).toBe('trial-guest-lead-1~main');
  });
});

describe('TrialClassroomService.joinAsTeacher', () => {
  it('lets only the assigned teacher in, as the room teacher', async () => {
    const { service, prisma } = build();
    const res: any = await service.joinAsTeacher(
      'teacher-user-1',
      'lead-1',
      'abcd1234',
      NOW,
    );
    const claims = await verify(res.token);
    expect(claims.sub).toBe('teacher-user-1~abcd1234');
    expect(claims.name).toBe('Ms Karim (Teacher)');
    expect(claims.video.room).toBe('trial-lead-1');
    expect(res.isTrial).toBe(true);
    expect(prisma.trialLead.updateMany.mock.calls[0][0]).toMatchObject({
      where: { id: 'lead-1', teacherJoinedAt: null },
    });
  });

  it.each([
    ['another teacher', 'teacher-user-2', lead()],
    [
      'an unassigned trial',
      'teacher-user-1',
      lead({ teacher: null, teacherId: null }),
    ],
    ['an unknown trial', 'teacher-user-1', null],
  ])('refuses %s with the same 403', async (_l, userId, row) => {
    const { service, roomAccess } = build(row);
    await expect(
      service.joinAsTeacher(userId, 'lead-1', 'abcd1234', NOW),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(roomAccess.checkEntry).not.toHaveBeenCalled();
  });

  it('opens 10 minutes before the start, with a friendly countdown before that', async () => {
    const { service } = build();
    await expect(
      service.joinAsTeacher(
        'teacher-user-1',
        'lead-1',
        'abcd1234',
        new Date(start.getTime() - 30 * 60_000),
      ),
    ).rejects.toThrow(/opens 10 minutes before class.*20 minute/);
  });

  it.each(['CANCELLED', 'COMPLETED', 'MISSED'])(
    'refuses a %s trial',
    async (status) => {
      const { service } = build(lead({ appointmentStatus: status }));
      await expect(
        service.joinAsTeacher('teacher-user-1', 'lead-1', 'abcd1234', NOW),
      ).rejects.toBeInstanceOf(BadRequestException);
    },
  );
});

describe('TrialClassroomService.markEnded', () => {
  it('records COMPLETED only when both the teacher and the guest took part', async () => {
    const { service, prisma, audit } = build();
    await service.markEnded('lead-1', 'teacher-user-1');
    expect(prisma.trialLead.updateMany.mock.calls[0][0]).toEqual({
      where: {
        id: 'lead-1',
        appointmentStatus: 'CONFIRMED',
        teacherJoinedAt: { not: null },
        guestJoinedAt: { not: null },
      },
      data: { appointmentStatus: 'COMPLETED' },
    });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'TRIAL_COMPLETED',
        actorRole: 'TEACHER',
      }),
    );
  });

  it('changes nothing (and audits nothing) when the guest never came — the admin decides', async () => {
    const { service, prisma, audit } = build();
    prisma.trialLead.updateMany.mockResolvedValue({ count: 0 });
    await service.markEnded('lead-1', 'teacher-user-1');
    expect(audit.log).not.toHaveBeenCalled();
  });
});
