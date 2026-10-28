// FILE PATH: server/src/classroom/daily-rooms.service.ts
//
// The classroom's one window onto Daily (https://docs.daily.co/reference/rest-api):
// the live-class video provider. Everything the server does with a classroom's
// video — creating the room, signing a person's way in, listing who is in it,
// sending a message to chosen connections, removing a connection, sharing the
// class's state, closing the room — goes through here, over Daily's REST API.
// A leaf service (no Prisma, no other services) so the room limits and the badge
// system can share it, and so tests can replace it with a fake.
//
// How a class maps onto Daily:
//   - A class's room name (room-ref.util.ts) is the name of a PRIVATE Daily room,
//     created on demand (ensureRoom). Nobody can join without a meeting token.
//   - A meeting token is made per person, per join, by createMeetingToken: bound
//     to that one room, carrying the person's `user_id` (their user id — Daily's
//     36-character limit exactly fits a uuid) and their name. Only the class's
//     teacher gets `is_owner`, which is what lets the teacher's own browser mute
//     people, stop a screen share or lift a microphone lock (Daily enforces it);
//     students and the admin observer can do none of that.
//   - Daily gives each connection a `session_id`. One person on two devices is
//     two sessions with the same user id.
//   - The shared state every screen follows (chat lock, "students muted",
//     recording, the classroom lock) is Daily's "meeting session data", written
//     here and only here; browsers read it.
//   - Messages the SERVER sends a browser (a badge celebration, why someone is
//     being removed) go as app messages carrying a key only that person's
//     browser was given (eventKeyFor), so no other participant can fake one.
//
// Daily's docs: rooms, meeting tokens, presence, eject, send-app-message,
// set-session-data — see the links beside each call.

import { createHmac } from 'crypto';
import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { MAX_DAILY_USER_ID_LENGTH, isPersonUserId } from './room-ref.util';

/** One connection of a person in a classroom. */
export interface RoomConnection {
  /** Daily's id for this one connection (its `session_id`). */
  sessionId: string;
  /** The person (the meeting token's `user_id`). */
  userId: string;
  name: string;
  /** When this connection joined, epoch ms (0 if Daily did not say). */
  joinedAtMs: number;
}

/** Marks an app message as one the SERVER sent (see ServerEvent). */
export const SERVER_EVENT_MARKER = 'lumexa-server';

export type ServerEvent =
  | {
      type: 'badge-awarded';
      awardId: string;
      badgeId: string;
      name: string;
      emoji: string;
    }
  | {
      type: 'room-denied';
      reason: 'ROOM_LOCKED' | 'ROOM_FULL' | 'TOO_MANY_DEVICES';
      message: string;
    };

/** A Daily room as the browser needs it. */
export interface DailyRoom {
  name: string;
  /** https://<your-domain>.daily.co/<name> — what a browser joins. */
  url: string;
}

/** What a person's meeting token says about them. */
export interface MeetingTokenParams {
  room: string;
  /** The person (36 characters at most). */
  userId: string;
  userName: string;
  /** The class's teacher: may moderate the room. */
  isOwner: boolean;
  /** How long the token can be used to join, in seconds. */
  ttlSeconds: number;
  /** Joins to watch: sends no audio, video or screen. */
  observer?: boolean;
}

/** What a browser needs to come into a classroom's Daily room. */
export interface RoomEntry {
  /** The person's meeting token. */
  token: string;
  /** The room's address. */
  url: string;
  /** What the browser checks messages that claim to be from this server
   * against (see eventKeyFor). */
  eventKey: string;
}

/** Daily answered with an error. */
export class DailyApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string | undefined,
    readonly info: string | undefined,
  ) {
    super(
      `Daily answered ${status}${code ? ` (${code})` : ''}${info ? `: ${info}` : ''}`,
    );
    this.name = 'DailyApiError';
  }
}

const DEFAULT_API_URL = 'https://api.daily.co/v1';
/** Daily should answer well within this; a hung request must not hang a join. */
const REQUEST_TIMEOUT_MS = 10_000;
/** The most connections one room's presence listing asks for (a class holds
 * 10 people on up to 3 devices each). */
const PRESENCE_LIMIT = 100;

@Injectable()
export class DailyRoomsService {
  private readonly logger = new Logger(DailyRoomsService.name);

  /** Whether this environment can talk to Daily at all. */
  isConfigured(): boolean {
    return !!this.apiKey();
  }

  /** Names the missing settings, for an error the person running the server can
   * act on (empty when configured). */
  missingEnvVars(): string[] {
    return this.apiKey() ? [] : ['DAILY_API_KEY'];
  }

  private apiKey(): string | undefined {
    return process.env.DAILY_API_KEY?.trim() || undefined;
  }

  private baseUrl(): string {
    // DAILY_API_URL exists for tests and for Daily's own regional endpoints; the
    // default is Daily's public API.
    return (process.env.DAILY_API_URL?.trim() || DEFAULT_API_URL).replace(
      /\/+$/,
      '',
    );
  }

  // ─── The room ───────────────────────────────────────────────────────────

  /**
   * The Daily room for a class, created if it does not exist yet. Private: a
   * meeting token is the only way in. Safe to call for every join — it asks
   * first, and two joins racing to create it end up with the same room.
   * https://docs.daily.co/reference/rest-api/rooms/create-room
   */
  async ensureRoom(room: string): Promise<DailyRoom> {
    const existing = await this.getRoom(room);
    if (existing) return existing;
    try {
      const created = await this.request<DailyRoomResponse>('POST', '/rooms', {
        name: room,
        privacy: 'private',
        properties: {
          enable_screenshare: true,
          // Lumexa's classroom has its own chat; Daily's is for Daily's own UI.
          enable_chat: false,
        },
      });
      return toRoom(created);
    } catch (err) {
      // The other of two simultaneous joins created it first.
      if (
        err instanceof DailyApiError &&
        /already exists/i.test(err.info ?? '')
      ) {
        const raced = await this.getRoom(room);
        if (raced) return raced;
      }
      throw err;
    }
  }

  private async getRoom(room: string): Promise<DailyRoom | null> {
    try {
      return toRoom(
        await this.request<DailyRoomResponse>('GET', `/rooms/${enc(room)}`),
      );
    } catch (err) {
      if (err instanceof DailyApiError && err.status === 404) return null;
      throw err;
    }
  }

  /** Closes the room (everyone in it is disconnected). A room that is already
   * gone is fine. https://docs.daily.co/reference/rest-api/rooms/delete-room */
  async deleteRoom(room: string): Promise<void> {
    if (!this.isConfigured()) return;
    try {
      await this.request('DELETE', `/rooms/${enc(room)}`);
    } catch (err) {
      if (err instanceof DailyApiError && err.status === 404) return;
      throw err;
    }
  }

  // ─── Getting in ─────────────────────────────────────────────────────────

  /** The answer a join gives when no Daily API key is set. */
  assertConfigured(): void {
    if (!this.isConfigured()) {
      throw new BadRequestException('Video service is not configured.');
    }
  }

  /**
   * Everything a browser needs to come into a class: the room (created if this
   * is the first person in), the person's meeting token and the key for
   * recognising this server's messages. A Daily failure is logged here and
   * answered with a plain "try again", never with Daily's own error text.
   */
  async entryFor(params: MeetingTokenParams): Promise<RoomEntry> {
    this.assertConfigured();
    try {
      const room = await this.ensureRoom(params.room);
      const token = await this.createMeetingToken(params);
      return {
        token,
        url: room.url,
        eventKey: this.eventKeyFor(params.room, params.userId),
      };
    } catch (err) {
      this.logger.error(
        `Could not open ${params.room} for ${params.userId}: ${err}`,
      );
      throw new ServiceUnavailableException(
        'The video service is not responding. Please try again in a moment.',
      );
    }
  }

  /**
   * A meeting token: one person's way into one room, for a limited time.
   * https://docs.daily.co/reference/rest-api/meeting-tokens/create-meeting-token
   */
  async createMeetingToken(params: MeetingTokenParams): Promise<string> {
    const { room, userId, userName, isOwner, ttlSeconds, observer } = params;
    if (userId.length > MAX_DAILY_USER_ID_LENGTH) {
      // Never happens for a uuid, a guest key or an observer id; if it ever
      // did, Daily would refuse the token with a much less helpful message.
      throw new Error(
        `user id too long for Daily: ${userId.length} characters`,
      );
    }
    const properties: Record<string, unknown> = {
      room_name: room,
      user_id: userId,
      user_name: userName,
      is_owner: isOwner,
      exp: Math.floor(Date.now() / 1000) + ttlSeconds,
    };
    if (observer) {
      // Watches and listens, publishes nothing. Not hidden: a hidden Daily
      // participant only receives the owner's media, and the admin should see
      // everyone. The classroom itself leaves observers out of its lists.
      properties.start_audio_off = true;
      properties.start_video_off = true;
      properties.permissions = {
        hasPresence: true,
        canSend: false,
        canAdmin: false,
      };
    }
    const res = await this.request<{ token: string }>(
      'POST',
      '/meeting-tokens',
      { properties },
    );
    return res.token;
  }

  /**
   * The secret a browser must present with a message that claims to come from
   * the server: derived from the person and the room, never stored, never sent
   * to anyone but that person (in their own join response). Daily's app
   * messages have no "from the server" mark a browser could rely on, so this is
   * what keeps another participant from faking a celebration or an eviction.
   */
  eventKeyFor(room: string, userId: string): string {
    const secret = this.apiKey();
    if (!secret) return '';
    return createHmac('sha256', secret)
      .update(`${SERVER_EVENT_MARKER}\n${room}\n${userId}`)
      .digest('base64url')
      .slice(0, 32);
  }

  // ─── Who is in the room ────────────────────────────────────────────────

  /**
   * Everyone in the room who is a person (not the admin observer). A room that
   * does not exist, or has nobody in it, is simply empty. Any other Daily error
   * is thrown for the caller to decide about.
   * https://docs.daily.co/reference/rest-api/rooms/session/get-presence
   */
  async listPeople(room: string): Promise<RoomConnection[]> {
    if (!this.isConfigured()) throw new Error('Daily is not configured.');
    let presence: PresenceResponse;
    try {
      presence = await this.request<PresenceResponse>(
        'GET',
        `/rooms/${enc(room)}/presence?limit=${PRESENCE_LIMIT}`,
      );
    } catch (err) {
      if (err instanceof DailyApiError && err.status === 404) return [];
      throw err;
    }
    return (presence.data ?? [])
      .filter((p) => isPersonUserId(p.userId ?? ''))
      .map((p) => ({
        sessionId: p.id,
        userId: p.userId,
        name: p.userName ?? '',
        joinedAtMs: Date.parse(p.joinTime ?? '') || 0,
      }));
  }

  /** When the room's meeting started — its earliest join — or null while nobody
   * is in it. Every participant sees the same "class began" moment this way. */
  async meetingStartedAt(room: string): Promise<Date | null> {
    const people = await this.listPeople(room);
    const joined = people.map((c) => c.joinedAtMs).filter((ms) => ms > 0);
    return joined.length > 0 ? new Date(Math.min(...joined)) : null;
  }

  // ─── Talking to people in the room ─────────────────────────────────────

  /**
   * Sends `event` to exactly the given connections — never a broadcast. Each
   * message carries its recipient's event key (eventKeyFor). Returns how many
   * connections it was addressed to (0 means nobody was there to receive it).
   * https://docs.daily.co/reference/rest-api/rooms/session/send-app-message
   */
  async sendServerEvent(
    room: string,
    connections: Pick<RoomConnection, 'sessionId' | 'userId'>[],
    event: ServerEvent,
  ): Promise<number> {
    if (connections.length === 0) return 0;
    if (!this.isConfigured()) throw new Error('Daily is not configured.');
    await Promise.all(
      connections.map((c) =>
        this.request('POST', `/rooms/${enc(room)}/send-app-message`, {
          data: {
            from: SERVER_EVENT_MARKER,
            key: this.eventKeyFor(room, c.userId),
            event,
          },
          // One session id: a broadcast ("*") would be seen by everyone.
          recipient: c.sessionId,
        }),
      ),
    );
    return connections.length;
  }

  /** Removes connections from the room. Best effort: a connection that is
   * already gone is not an error. https://docs.daily.co/reference/rest-api/rooms/session/eject */
  async removeConnections(room: string, sessionIds: string[]): Promise<void> {
    if (sessionIds.length === 0 || !this.isConfigured()) return;
    try {
      await this.request('POST', `/rooms/${enc(room)}/eject`, {
        ids: sessionIds,
      });
    } catch (err) {
      this.logger.warn(
        `Could not remove ${sessionIds.join(', ')} from ${room}: ${err}`,
      );
    }
  }

  // ─── The class's shared state ──────────────────────────────────────────

  /**
   * Merges `patch` into the room's shared state (Daily's "meeting session
   * data"), which every browser in the class receives and follows. Needs a
   * meeting in progress: with nobody in the room it throws, which callers that
   * only mirror state treat as "nothing to update".
   * https://docs.daily.co/reference/rest-api/rooms/session/set-session-data
   */
  async setClassState(
    room: string,
    patch: Record<string, unknown>,
  ): Promise<void> {
    if (!this.isConfigured()) throw new Error('Daily is not configured.');
    await this.request('POST', `/rooms/${enc(room)}/set-session-data`, {
      data: patch,
      mergeStrategy: 'shallow-merge',
    });
  }

  // ─── The HTTP call ─────────────────────────────────────────────────────

  private async request<T = unknown>(
    method: 'GET' | 'POST' | 'DELETE',
    path: string,
    body?: unknown,
  ): Promise<T> {
    const key = this.apiKey();
    if (!key) throw new Error('Daily is not configured.');
    const res = await fetch(`${this.baseUrl()}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${key}`,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const text = await res.text();
    let json: unknown;
    try {
      json = text ? JSON.parse(text) : undefined;
    } catch {
      json = undefined;
    }
    if (!res.ok) {
      const e = (json ?? {}) as { error?: string; info?: string };
      throw new DailyApiError(res.status, e.error, e.info);
    }
    return json as T;
  }
}

interface DailyRoomResponse {
  name: string;
  url: string;
}

interface PresenceResponse {
  total_count?: number;
  data?: {
    id: string;
    userId: string;
    userName?: string;
    joinTime?: string;
  }[];
}

function toRoom(r: DailyRoomResponse): DailyRoom {
  return { name: r.name, url: r.url };
}

/** A room name in a URL path. Room names are already URL-safe; this keeps a
 * malformed one from changing the path. */
function enc(room: string): string {
  return encodeURIComponent(room);
}
