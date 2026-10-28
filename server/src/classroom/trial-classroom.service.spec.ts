import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { TrialClassroomService } from './trial-classroom.service';

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
    scheduleEnforcement: jest.fn(),
  };
  const audit: any = { log: jest.fn().mockResolvedValue({}) };
  // Daily itself is faked: what matters here is what the trial asks it for.
  const rooms: any = {
    assertConfigured: jest.fn(),
    entryFor: jest.fn().mockResolvedValue({
      token: 'daily-meeting-token',
      url: 'https://lumexa.daily.co/trial-lead-1',
      eventKey: 'event-key',
    }),
  };
  return {
    prisma,
    roomAccess,
    audit,
    rooms,
    service: new TrialClassroomService(prisma, roomAccess, audit, rooms),
  };
}

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
  it('issues a short-lived Daily token bound to this trial room only, as an ordinary participant', async () => {
    const { service, prisma, rooms } = build();
    const res: any = await service.joinAsGuest(TOKEN, NOW);
    expect(res).toMatchObject({
      token: 'daily-meeting-token',
      url: 'https://lumexa.daily.co/trial-lead-1',
      eventKey: 'event-key',
      roomName: 'trial-lead-1',
      scheduledStart: start.toISOString(),
      classType: 'ONE_TO_ONE',
      isTrial: true,
      trialChildName: 'Alex',
      roomLocked: false,
    });
    expect(rooms.entryFor).toHaveBeenCalledTimes(1);
    expect(rooms.entryFor).toHaveBeenCalledWith({
      room: 'trial-lead-1',
      // "tg-" and the trial's id, never a real user id
      userId: 'tg-lead1',
      userName: 'Alex (Student)',
      // never the room's owner: no moderating, no stopping the teacher's share
      isOwner: false,
      // expires soon after the joining window — never a long-lived credential
      // (the join was at 09:55 and the window closes at 11:00, so: 65 minutes
      // plus a 15-minute margin)
      ttlSeconds: 80 * 60,
    });
    // the guest link's secret never comes back to the guest
    expect(JSON.stringify(res)).not.toContain(TOKEN);
    expect(prisma.trialLead.updateMany.mock.calls[0][0]).toMatchObject({
      where: { id: 'lead-1', guestJoinedAt: null },
    });
  });

  it('has the room checked a few seconds after the guest is let in, naming the trial’s teacher', async () => {
    const { service, roomAccess } = build();
    await service.joinAsGuest(TOKEN, NOW);
    expect(roomAccess.scheduleEnforcement).toHaveBeenCalledWith(
      'trial-lead-1',
      'teacher-user-1',
    );
  });

  it('caps the token at three hours however late in the window the guest comes', async () => {
    const { service, rooms } = build(
      lead({ endAt: new Date(end.getTime() + 6 * 3600_000) }),
    );
    await service.joinAsGuest(TOKEN, NOW);
    expect(rooms.entryFor.mock.calls[0][0].ttlSeconds).toBe(3 * 3600);
  });

  it('the guest is treated as a student for the lock / 10-people / device limits', async () => {
    const { service, roomAccess } = build();
    await service.joinAsGuest(TOKEN, NOW);
    expect(roomAccess.checkEntry).toHaveBeenCalledWith({
      room: 'trial-lead-1',
      userId: 'tg-lead1',
      role: 'STUDENT',
      teacherUserId: 'teacher-user-1',
    });
  });

  it('answers a locked / full room like every other class (a normal, retryable refusal)', async () => {
    const { service, rooms, prisma } = build(lead(), {
      ok: false,
      reason: 'ROOM_LOCKED',
      message: 'locked',
    });
    await expect(service.joinAsGuest(TOKEN, NOW)).resolves.toMatchObject({
      blocked: true,
      reason: 'ROOM_LOCKED',
    });
    // …with no way in made, and no join recorded
    expect(rooms.entryFor).not.toHaveBeenCalled();
    expect(prisma.trialLead.updateMany).not.toHaveBeenCalled();
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
      const { service, prisma, roomAccess, rooms } = build(lead(over));
      await expect(service.joinAsGuest(TOKEN, now)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(roomAccess.checkEntry).not.toHaveBeenCalled();
      expect(rooms.entryFor).not.toHaveBeenCalled();
      expect(prisma.trialLead.updateMany).not.toHaveBeenCalled();
    },
  );

  it('is open from 10 minutes before until 30 minutes after the end', async () => {
    for (const offsetMin of [-10, 0, 25, 60]) {
      const { service } = build();
      await expect(
        service.joinAsGuest(
          TOKEN,
          new Date(start.getTime() + offsetMin * 60_000),
        ),
      ).resolves.toHaveProperty('token');
    }
  });

  it('a token for another trial or an unknown token cannot enter', async () => {
    const { service } = build(null);
    await expect(service.joinAsGuest(TOKEN, NOW)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('refuses when video is not configured', async () => {
    const { service, rooms } = build();
    rooms.assertConfigured.mockImplementation(() => {
      throw new BadRequestException('Video service is not configured.');
    });
    await expect(service.joinAsGuest(TOKEN, NOW)).rejects.toThrow(
      /not configured/,
    );
  });

  it('when the video service is down the guest is told to try again, and the join is not recorded', async () => {
    const { service, rooms, prisma, roomAccess } = build();
    rooms.entryFor.mockRejectedValue(new ServiceUnavailableException());
    await expect(service.joinAsGuest(TOKEN, NOW)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(prisma.trialLead.updateMany).not.toHaveBeenCalled();
    expect(roomAccess.scheduleEnforcement).not.toHaveBeenCalled();
  });
});

describe('TrialClassroomService.joinAsTeacher', () => {
  it('lets only the assigned teacher in, as the room teacher', async () => {
    const { service, prisma, rooms, roomAccess } = build();
    const res: any = await service.joinAsTeacher(
      'teacher-user-1',
      'lead-1',
      NOW,
    );
    // the room's OWNER — what lets the teacher's browser moderate the class
    expect(rooms.entryFor).toHaveBeenCalledWith({
      room: 'trial-lead-1',
      userId: 'teacher-user-1',
      userName: 'Ms Karim (Teacher)',
      isOwner: true,
      ttlSeconds: 3 * 3600,
    });
    expect(roomAccess.scheduleEnforcement).toHaveBeenCalledWith(
      'trial-lead-1',
      'teacher-user-1',
    );
    expect(res).toMatchObject({
      token: 'daily-meeting-token',
      url: 'https://lumexa.daily.co/trial-lead-1',
      roomName: 'trial-lead-1',
      isTrial: true,
    });
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
      service.joinAsTeacher(userId, 'lead-1', NOW),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(roomAccess.checkEntry).not.toHaveBeenCalled();
  });

  it('opens 10 minutes before the start, with a friendly countdown before that', async () => {
    const { service } = build();
    await expect(
      service.joinAsTeacher(
        'teacher-user-1',
        'lead-1',
        new Date(start.getTime() - 30 * 60_000),
      ),
    ).rejects.toThrow(/opens 10 minutes before class.*20 minute/);
  });

  it.each(['CANCELLED', 'COMPLETED', 'MISSED'])(
    'refuses a %s trial',
    async (status) => {
      const { service } = build(lead({ appointmentStatus: status }));
      await expect(
        service.joinAsTeacher('teacher-user-1', 'lead-1', NOW),
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
