// DailyRoomsService against a fake Daily REST API: a real HTTP server on a free
// port that checks every request the way Daily does — the bearer key, the JSON
// body, and the fields each endpoint accepts (Daily rejects unknown properties) —
// so a request that Daily would refuse fails here too. What it cannot prove is
// that Daily behaves as its documentation says; the checks follow
// https://docs.daily.co/reference/rest-api and are the same ones the
// verification notes in docs/CLASSROOM_DAILY_SETUP.md ask a person to repeat
// against a real account.

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument --
   the fake Daily server deals in arbitrary JSON request bodies */

import { createServer, type IncomingMessage, type Server } from 'http';
import type { AddressInfo } from 'net';
import {
  BadRequestException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DailyApiError, DailyRoomsService } from './daily-rooms.service';

const KEY = 'test-daily-key';

interface Seen {
  method: string;
  path: string;
  query: string;
  headers: IncomingMessage['headers'];
  body: Record<string, any> | undefined;
}

class FakeDaily {
  server!: Server;
  url = '';
  seen: Seen[] = [];
  rooms = new Map<string, { name: string; url: string }>();
  presence: Record<string, unknown>[] = [];
  /** When set, every request fails with this status and body. */
  failWith: { status: number; body: unknown } | null = null;
  /** Rooms POST /rooms answers "already exists" for, once. */
  raceOnCreate = new Set<string>();
  tokenCounter = 0;

  async start() {
    this.server = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (c: Buffer) => chunks.push(c));
      req.on('end', () => {
        const [path, query = ''] = (req.url ?? '').split('?');
        const raw = Buffer.concat(chunks).toString('utf8');
        const body = raw ? (JSON.parse(raw) as Record<string, any>) : undefined;
        this.seen.push({
          method: req.method ?? '',
          path,
          query,
          headers: req.headers,
          body,
        });
        const reply = (status: number, json?: unknown) => {
          res.writeHead(status, { 'content-type': 'application/json' });
          res.end(json === undefined ? '' : JSON.stringify(json));
        };
        if (req.headers.authorization !== `Bearer ${KEY}`) {
          return reply(401, { error: 'authentication-error', info: 'bad key' });
        }
        if (this.failWith)
          return reply(this.failWith.status, this.failWith.body);
        this.route(req.method ?? '', path, body, reply);
      });
    });
    await new Promise<void>((resolve) =>
      this.server.listen(0, '127.0.0.1', resolve),
    );
    this.url = `http://127.0.0.1:${(this.server.address() as AddressInfo).port}/v1`;
  }

  stop() {
    return new Promise<void>((resolve) => this.server.close(() => resolve()));
  }

  reset() {
    this.seen = [];
    this.rooms.clear();
    this.presence = [];
    this.failWith = null;
    this.raceOnCreate.clear();
    this.tokenCounter = 0;
  }

  private route(
    method: string,
    path: string,
    body: Record<string, any> | undefined,
    reply: (status: number, json?: unknown) => void,
  ) {
    const bad = (info: string) =>
      reply(400, { error: 'invalid-request-error', info });
    const only = (obj: Record<string, any> | undefined, allowed: string[]) =>
      Object.keys(obj ?? {}).filter((k) => !allowed.includes(k));

    let m: RegExpMatchArray | null;
    if (method === 'POST' && path === '/v1/rooms') {
      const extra = only(body, ['name', 'privacy', 'properties']);
      if (extra.length) return bad(`unknown fields: ${extra.join(', ')}`);
      const props = (body?.properties ?? {}) as Record<string, unknown>;
      const badProps = only(props, ['enable_screenshare', 'enable_chat']);
      if (badProps.length)
        return bad(`unknown properties: ${badProps.join(', ')}`);
      const name = String(body?.name ?? '');
      if (!/^[A-Za-z0-9_-]{1,128}$/.test(name)) return bad('bad room name');
      if (this.raceOnCreate.delete(name)) {
        this.rooms.set(name, { name, url: `https://lumexa.daily.co/${name}` });
        return bad(`a room named ${name} already exists`);
      }
      if (this.rooms.has(name))
        return bad(`a room named ${name} already exists`);
      const room = { name, url: `https://lumexa.daily.co/${name}` };
      this.rooms.set(name, room);
      return reply(200, { id: `id-${name}`, privacy: body?.privacy, ...room });
    }
    if ((m = path.match(/^\/v1\/rooms\/([^/]+)$/))) {
      const name = decodeURIComponent(m[1]);
      const room = this.rooms.get(name);
      if (method === 'GET') {
        return room
          ? reply(200, { id: `id-${name}`, ...room })
          : reply(404, { error: 'not-found', info: `room ${name} not found` });
      }
      if (method === 'DELETE') {
        if (!room)
          return reply(404, { error: 'not-found', info: 'no such room' });
        this.rooms.delete(name);
        return reply(200, { deleted: true, name });
      }
    }
    if (method === 'POST' && path === '/v1/meeting-tokens') {
      const extra = only(body, ['properties']);
      if (extra.length) return bad(`unknown fields: ${extra.join(', ')}`);
      const props = (body?.properties ?? {}) as Record<string, any>;
      const allowed = [
        'room_name',
        'user_id',
        'user_name',
        'is_owner',
        'exp',
        'start_audio_off',
        'start_video_off',
        'permissions',
      ];
      const badProps = only(props, allowed);
      if (badProps.length)
        return bad(`unknown properties: ${badProps.join(', ')}`);
      if (typeof props.user_id === 'string' && props.user_id.length > 36) {
        return bad('user_id too long');
      }
      if (props.permissions) {
        const badPerms = only(props.permissions, [
          'hasPresence',
          'canSend',
          'canAdmin',
        ]);
        if (badPerms.length)
          return bad(`unknown permissions: ${badPerms.join(', ')}`);
      }
      return reply(200, { token: `daily-token-${++this.tokenCounter}` });
    }
    if (
      (m = path.match(/^\/v1\/rooms\/([^/]+)\/presence$/)) &&
      method === 'GET'
    ) {
      return reply(200, {
        total_count: this.presence.length,
        data: this.presence,
      });
    }
    if (
      (m = path.match(/^\/v1\/rooms\/([^/]+)\/send-app-message$/)) &&
      method === 'POST'
    ) {
      const extra = only(body, ['data', 'recipient']);
      if (extra.length) return bad(`unknown fields: ${extra.join(', ')}`);
      if (typeof body?.recipient !== 'string') return bad('recipient required');
      if (JSON.stringify(body.data ?? null).length > 4096)
        return bad('too large');
      return reply(200, { sent: true });
    }
    if (
      (m = path.match(/^\/v1\/rooms\/([^/]+)\/eject$/)) &&
      method === 'POST'
    ) {
      const extra = only(body, ['ids', 'user_ids', 'ban']);
      if (extra.length) return bad(`unknown fields: ${extra.join(', ')}`);
      return reply(200, { ejectedIds: body?.ids ?? [] });
    }
    if (
      (m = path.match(/^\/v1\/rooms\/([^/]+)\/set-session-data$/)) &&
      method === 'POST'
    ) {
      const extra = only(body, ['data', 'mergeStrategy', 'keysToDelete']);
      if (extra.length) return bad(`unknown fields: ${extra.join(', ')}`);
      return reply(200, { sent: 'true' });
    }
    return reply(404, { error: 'not-found', info: `${method} ${path}` });
  }
}

describe('DailyRoomsService (against a fake Daily REST API)', () => {
  const daily = new FakeDaily();
  const saved = {
    key: process.env.DAILY_API_KEY,
    url: process.env.DAILY_API_URL,
  };
  let service: DailyRoomsService;

  beforeAll(async () => {
    await daily.start();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });
  afterAll(async () => {
    jest.restoreAllMocks();
    await daily.stop();
    if (saved.key === undefined) delete process.env.DAILY_API_KEY;
    else process.env.DAILY_API_KEY = saved.key;
    if (saved.url === undefined) delete process.env.DAILY_API_URL;
    else process.env.DAILY_API_URL = saved.url;
  });
  beforeEach(() => {
    daily.reset();
    process.env.DAILY_API_KEY = KEY;
    process.env.DAILY_API_URL = daily.url;
    service = new DailyRoomsService();
  });

  const lastSeen = () => daily.seen[daily.seen.length - 1];

  describe('configuration', () => {
    it('is configured only with a Daily API key, and names what is missing', () => {
      expect(service.isConfigured()).toBe(true);
      expect(service.missingEnvVars()).toEqual([]);

      process.env.DAILY_API_KEY = '   ';
      expect(service.isConfigured()).toBe(false);
      expect(service.missingEnvVars()).toEqual(['DAILY_API_KEY']);
      delete process.env.DAILY_API_KEY;
      expect(service.isConfigured()).toBe(false);
    });

    it('answers a join with a plain “not configured” (400) rather than calling Daily', async () => {
      delete process.env.DAILY_API_KEY;
      expect(() => service.assertConfigured()).toThrow(BadRequestException);
      await expect(
        service.entryFor({
          room: 'r',
          userId: 'u',
          userName: 'U',
          isOwner: false,
          ttlSeconds: 60,
        }),
      ).rejects.toThrow('Video service is not configured.');
      expect(daily.seen).toHaveLength(0);
    });

    it('sends the key as a bearer token on every request', async () => {
      await service.ensureRoom('room-a');
      for (const call of daily.seen) {
        expect(call.headers.authorization).toBe(`Bearer ${KEY}`);
      }
    });

    it('a wrong key is a Daily 401 the caller sees as an error', async () => {
      process.env.DAILY_API_KEY = 'not-the-key';
      await expect(service.ensureRoom('room-a')).rejects.toMatchObject({
        status: 401,
      });
    });
  });

  describe('ensureRoom', () => {
    it('creates a private room, with only properties Daily accepts', async () => {
      const room = await service.ensureRoom('lesson-abc');
      expect(room).toEqual({
        name: 'lesson-abc',
        url: 'https://lumexa.daily.co/lesson-abc',
      });
      expect(daily.seen.map((c) => `${c.method} ${c.path}`)).toEqual([
        'GET /v1/rooms/lesson-abc',
        'POST /v1/rooms',
      ]);
      expect(lastSeen().body).toEqual({
        name: 'lesson-abc',
        privacy: 'private',
        properties: { enable_screenshare: true, enable_chat: false },
      });
    });

    it('does not create a room that is already there, and returns its address', async () => {
      daily.rooms.set('lesson-abc', {
        name: 'lesson-abc',
        url: 'https://lumexa.daily.co/lesson-abc',
      });
      expect((await service.ensureRoom('lesson-abc')).url).toBe(
        'https://lumexa.daily.co/lesson-abc',
      );
      expect(daily.seen).toHaveLength(1);
      expect(lastSeen().method).toBe('GET');
    });

    it('two joins racing to create the room end up with the same one', async () => {
      daily.raceOnCreate.add('lesson-race');
      const room = await service.ensureRoom('lesson-race');
      expect(room.url).toBe('https://lumexa.daily.co/lesson-race');
    });

    it('any other Daily error is thrown with its status and code', async () => {
      daily.failWith = {
        status: 500,
        body: { error: 'internal-error', info: 'boom' },
      };
      const err = await service.ensureRoom('lesson-abc').catch((e) => e);
      expect(err).toBeInstanceOf(DailyApiError);
      expect(err).toMatchObject({
        status: 500,
        code: 'internal-error',
        info: 'boom',
      });
      expect(err.message).toContain('500');
    });

    it('a room name is never allowed to change the request path', async () => {
      await service.ensureRoom('a/../b').catch(() => undefined);
      expect(daily.seen[0].path).toBe('/v1/rooms/a%2F..%2Fb');
    });
  });

  describe('deleteRoom', () => {
    it('closes the room; one that is already gone is fine', async () => {
      daily.rooms.set('r', { name: 'r', url: 'https://x/r' });
      await service.deleteRoom('r');
      expect(daily.rooms.has('r')).toBe(false);
      await expect(service.deleteRoom('r')).resolves.toBeUndefined();
    });

    it('any other failure is the caller’s to decide about; with no key it does nothing', async () => {
      daily.failWith = { status: 500, body: { error: 'internal-error' } };
      await expect(service.deleteRoom('r')).rejects.toBeInstanceOf(
        DailyApiError,
      );

      daily.reset();
      delete process.env.DAILY_API_KEY;
      await expect(service.deleteRoom('r')).resolves.toBeUndefined();
      expect(daily.seen).toHaveLength(0);
    });
  });

  describe('createMeetingToken', () => {
    const base = {
      room: 'lesson-abc',
      userId: '0f8fad5b-d9cb-469f-a165-70867728950e',
      userName: 'Ms Karim (Teacher)',
      ttlSeconds: 3 * 3600,
    };

    it('makes the teacher’s token the room’s owner token, bound to the room and the person', async () => {
      const before = Math.floor(Date.now() / 1000);
      const token = await service.createMeetingToken({
        ...base,
        isOwner: true,
      });
      expect(token).toBe('daily-token-1');
      const { properties } = lastSeen().body as {
        properties: Record<string, any>;
      };
      expect(properties).toMatchObject({
        room_name: 'lesson-abc',
        user_id: base.userId,
        user_name: 'Ms Karim (Teacher)',
        is_owner: true,
      });
      expect(properties.exp).toBeGreaterThanOrEqual(before + 3 * 3600);
      expect(properties.exp).toBeLessThanOrEqual(before + 3 * 3600 + 5);
      // A student's media rules are Daily's defaults: nothing else is set.
      expect(properties).not.toHaveProperty('permissions');
      expect(properties).not.toHaveProperty('start_audio_off');
    });

    it('makes a student’s token an ordinary one', async () => {
      await service.createMeetingToken({ ...base, isOwner: false });
      expect(lastSeen().body!.properties.is_owner).toBe(false);
    });

    it('makes the admin observer’s token receive-only and silent', async () => {
      await service.createMeetingToken({
        ...base,
        userId: 'admin-observer-1700000000000',
        isOwner: false,
        observer: true,
      });
      const { properties } = lastSeen().body as {
        properties: Record<string, any>;
      };
      expect(properties).toMatchObject({
        is_owner: false,
        start_audio_off: true,
        start_video_off: true,
        permissions: { hasPresence: true, canSend: false, canAdmin: false },
      });
    });

    it('refuses a person id Daily would reject (over 36 characters), without calling Daily', async () => {
      await expect(
        service.createMeetingToken({
          ...base,
          userId: 'x'.repeat(37),
          isOwner: false,
        }),
      ).rejects.toThrow(/too long/);
      expect(daily.seen).toHaveLength(0);
    });

    it('accepts every kind of person id Lumexa uses: a uuid, a trial guest, an observer', async () => {
      for (const userId of [
        '0f8fad5b-d9cb-469f-a165-70867728950e',
        `tg-${'a'.repeat(32)}`,
        `admin-observer-${Date.now()}`,
      ]) {
        await expect(
          service.createMeetingToken({ ...base, userId, isOwner: false }),
        ).resolves.toMatch(/^daily-token-/);
      }
    });
  });

  describe('entryFor', () => {
    const params = {
      room: 'lesson-abc',
      userId: 'user-1',
      userName: 'Ada (Student)',
      isOwner: false,
      ttlSeconds: 600,
    };

    it('returns the room’s address, the person’s token and their event key', async () => {
      const entry = await service.entryFor(params);
      expect(entry).toEqual({
        token: 'daily-token-1',
        url: 'https://lumexa.daily.co/lesson-abc',
        eventKey: service.eventKeyFor('lesson-abc', 'user-1'),
      });
      expect(entry.eventKey).toHaveLength(32);
    });

    it('when Daily fails, answers with a plain “try again” and never Daily’s own words', async () => {
      daily.failWith = {
        status: 500,
        body: { error: 'internal-error', info: 'secret internals' },
      };
      const err = await service.entryFor(params).catch((e) => e);
      expect(err).toBeInstanceOf(ServiceUnavailableException);
      expect(err.message).toMatch(/try again/i);
      expect(JSON.stringify(err.getResponse())).not.toContain(
        'secret internals',
      );
    });
  });

  describe('eventKeyFor', () => {
    it('is the same for the same person in the same room, and different for anyone else', () => {
      const a = service.eventKeyFor('room-1', 'user-1');
      expect(service.eventKeyFor('room-1', 'user-1')).toBe(a);
      expect(service.eventKeyFor('room-1', 'user-2')).not.toBe(a);
      expect(service.eventKeyFor('room-2', 'user-1')).not.toBe(a);
      expect(a).toMatch(/^[A-Za-z0-9_-]{32}$/);
    });

    it('cannot be worked out without the Daily key, and is empty without one', () => {
      const a = service.eventKeyFor('room-1', 'user-1');
      process.env.DAILY_API_KEY = 'another-key';
      expect(service.eventKeyFor('room-1', 'user-1')).not.toBe(a);
      delete process.env.DAILY_API_KEY;
      expect(service.eventKeyFor('room-1', 'user-1')).toBe('');
    });
  });

  describe('listPeople', () => {
    const present = (
      id: string,
      userId: string,
      extra: Record<string, unknown> = {},
    ) => ({
      id,
      room: 'lesson-abc',
      userId,
      userName: userId,
      joinTime: '2026-10-28T10:00:05.000Z',
      duration: 12,
      ...extra,
    });

    it('lists people with their session, person, name and when they joined', async () => {
      daily.presence = [
        present('sess-1', 'user-1', { userName: 'Ada (Student)' }),
      ];
      expect(await service.listPeople('lesson-abc')).toEqual([
        {
          sessionId: 'sess-1',
          userId: 'user-1',
          name: 'Ada (Student)',
          joinedAtMs: Date.parse('2026-10-28T10:00:05.000Z'),
        },
      ]);
      expect(lastSeen()).toMatchObject({
        method: 'GET',
        path: '/v1/rooms/lesson-abc/presence',
        query: 'limit=100',
      });
    });

    it('lets one person show up once per device, as the connections they are', async () => {
      daily.presence = [present('s1', 'user-1'), present('s2', 'user-1')];
      const people = await service.listPeople('lesson-abc');
      expect(people.map((p) => p.sessionId)).toEqual(['s1', 's2']);
      expect(new Set(people.map((p) => p.userId))).toEqual(new Set(['user-1']));
    });

    it('leaves out the admin observer', async () => {
      daily.presence = [
        present('s1', 'user-1'),
        present('s2', 'admin-observer-1700000000000'),
      ];
      expect(
        (await service.listPeople('lesson-abc')).map((p) => p.userId),
      ).toEqual(['user-1']);
    });

    it('has no join time for a connection Daily gave none for', async () => {
      daily.presence = [present('s1', 'user-1', { joinTime: undefined })];
      expect((await service.listPeople('lesson-abc'))[0].joinedAtMs).toBe(0);
    });

    it('a room that does not exist, or has nobody in it, is simply empty', async () => {
      daily.presence = [];
      expect(await service.listPeople('lesson-abc')).toEqual([]);
    });

    it('any other Daily failure is the caller’s to decide about', async () => {
      daily.failWith = { status: 500, body: { error: 'internal-error' } };
      await expect(service.listPeople('lesson-abc')).rejects.toBeInstanceOf(
        DailyApiError,
      );
    });

    it('is an error, not an empty room, when Daily is not configured', async () => {
      delete process.env.DAILY_API_KEY;
      await expect(service.listPeople('lesson-abc')).rejects.toThrow(
        'not configured',
      );
    });
  });

  describe('meetingStartedAt', () => {
    it('is the earliest join among the people in the room, and null while it is empty', async () => {
      daily.presence = [
        {
          id: 'a',
          userId: 'u1',
          userName: 'u1',
          joinTime: '2026-10-28T10:05:00.000Z',
        },
        {
          id: 'b',
          userId: 'u2',
          userName: 'u2',
          joinTime: '2026-10-28T10:01:00.000Z',
        },
        {
          id: 'c',
          userId: 'admin-observer-1',
          userName: 'obs',
          joinTime: '2026-10-28T09:00:00.000Z',
        },
      ];
      expect((await service.meetingStartedAt('r'))!.toISOString()).toBe(
        '2026-10-28T10:01:00.000Z',
      );
      daily.presence = [];
      expect(await service.meetingStartedAt('r')).toBeNull();
    });
  });

  describe('sendServerEvent', () => {
    const event = {
      type: 'badge-awarded' as const,
      awardId: 'a1',
      badgeId: 'bright-spark',
      name: 'Bright Spark',
      emoji: '⭐',
    };

    it('addresses each given connection by its own session — never a broadcast', async () => {
      const sent = await service.sendServerEvent(
        'lesson-abc',
        [
          { sessionId: 's1', userId: 'user-1' },
          { sessionId: 's2', userId: 'user-1' },
        ],
        event,
      );
      expect(sent).toBe(2);
      expect(daily.seen).toHaveLength(2);
      for (const [i, call] of daily.seen.entries()) {
        expect(call).toMatchObject({
          method: 'POST',
          path: '/v1/rooms/lesson-abc/send-app-message',
        });
        expect(call.body!.recipient).toBe(`s${i + 1}`);
        expect(call.body!.recipient).not.toBe('*');
        expect(call.body!.data).toEqual({
          from: 'lumexa-server',
          key: service.eventKeyFor('lesson-abc', 'user-1'),
          event,
        });
      }
    });

    it('signs each message with its recipient’s own key', async () => {
      await service.sendServerEvent(
        'lesson-abc',
        [
          { sessionId: 's1', userId: 'user-1' },
          { sessionId: 's2', userId: 'user-2' },
        ],
        event,
      );
      const keys = daily.seen.map((c) => c.body!.data.key);
      expect(keys[0]).toBe(service.eventKeyFor('lesson-abc', 'user-1'));
      expect(keys[1]).toBe(service.eventKeyFor('lesson-abc', 'user-2'));
      expect(keys[0]).not.toBe(keys[1]);
    });

    it('with nobody to send to it sends nothing', async () => {
      expect(await service.sendServerEvent('lesson-abc', [], event)).toBe(0);
      expect(daily.seen).toHaveLength(0);
    });

    it('a failed send is thrown for the caller to log', async () => {
      daily.failWith = {
        status: 400,
        body: { error: 'invalid-request-error' },
      };
      await expect(
        service.sendServerEvent(
          'lesson-abc',
          [{ sessionId: 's1', userId: 'user-1' }],
          event,
        ),
      ).rejects.toBeInstanceOf(DailyApiError);
    });
  });

  describe('removeConnections', () => {
    it('ejects the given sessions, and only those', async () => {
      await service.removeConnections('lesson-abc', ['s1', 's2']);
      expect(lastSeen()).toMatchObject({
        method: 'POST',
        path: '/v1/rooms/lesson-abc/eject',
        body: { ids: ['s1', 's2'] },
      });
    });

    it('never bans: a removed student must be able to knock and be let back in', async () => {
      await service.removeConnections('lesson-abc', ['s1']);
      expect(lastSeen().body).not.toHaveProperty('ban');
    });

    it('swallows a failure (the connection may already have left), and skips an empty list', async () => {
      daily.failWith = { status: 500, body: { error: 'internal-error' } };
      await expect(
        service.removeConnections('lesson-abc', ['s1']),
      ).resolves.toBeUndefined();

      daily.reset();
      await service.removeConnections('lesson-abc', []);
      expect(daily.seen).toHaveLength(0);
    });
  });

  describe('setClassState', () => {
    it('merges the change into the room’s shared state, leaving the rest as it was', async () => {
      await service.setClassState('lesson-abc', { chatLocked: true });
      expect(lastSeen()).toMatchObject({
        method: 'POST',
        path: '/v1/rooms/lesson-abc/set-session-data',
        body: { data: { chatLocked: true }, mergeStrategy: 'shallow-merge' },
      });
    });

    it('throws when Daily says there is no meeting to put it in (callers that only mirror state ignore that)', async () => {
      daily.failWith = {
        status: 400,
        body: { error: 'invalid-request-error', info: 'no session' },
      };
      await expect(
        service.setClassState('lesson-abc', { recording: true }),
      ).rejects.toBeInstanceOf(DailyApiError);
    });
  });

  describe('a Daily that does not answer', () => {
    it('is an error rather than a hung join', async () => {
      const hung = createServer(() => {
        /* never answers */
      });
      await new Promise<void>((resolve) =>
        hung.listen(0, '127.0.0.1', resolve),
      );
      process.env.DAILY_API_URL = `http://127.0.0.1:${(hung.address() as AddressInfo).port}/v1`;
      const spy = jest
        .spyOn(AbortSignal, 'timeout')
        .mockReturnValue(AbortSignal.timeout(150));
      try {
        await expect(service.ensureRoom('lesson-abc')).rejects.toThrow();
      } finally {
        spy.mockRestore();
        hung.closeAllConnections();
        await new Promise<void>((resolve) => hung.close(() => resolve()));
      }
    });
  });
});
