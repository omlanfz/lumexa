// FILE PATH: server/src/classroom/livekit-rooms.service.ts
//
// The classroom's window onto the LiveKit server API: who is in a room right
// now, sending a message to chosen participants, removing a connection. A
// leaf service (no Prisma, no other services) so the room limits and the badge
// system can share it, and so tests can replace it with a fake.

import { Injectable, Logger } from '@nestjs/common';
import { DataPacket_Kind, RoomServiceClient } from 'livekit-server-sdk';
import { isPersonIdentity, personKey } from './room-ref.util';

/** One LiveKit connection of a person in a classroom. */
export interface RoomConnection {
  identity: string;
  userId: string;
  name: string;
  /** When this connection joined, epoch ms (0 if LiveKit did not say). */
  joinedAtMs: number;
}

/** Topic of every message the SERVER sends to classroom participants — a badge
 * celebration, a refusal to let someone stay. Browsers only trust messages on
 * this topic that came from the server (no sending participant). */
export const SERVER_EVENT_TOPIC = 'lumexa-server';

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

const ROOM_MISSING = /not.?found|does not exist|no such room|404/i;

@Injectable()
export class LiveKitRoomsService {
  private readonly logger = new Logger(LiveKitRoomsService.name);

  /** null when LiveKit is not configured in this environment. */
  client(): RoomServiceClient | null {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const url = process.env.LIVEKIT_URL;
    if (!apiKey || !apiSecret || !url) return null;
    return new RoomServiceClient(url, apiKey, apiSecret);
  }

  /** Everyone in the room who is a person (not the hidden admin observer, not
   * the recording egress). A room that does not exist yet is simply empty.
   * Any other LiveKit error is thrown for the caller to decide about. */
  async listPeople(room: string): Promise<RoomConnection[]> {
    const client = this.client();
    if (!client) throw new Error('LiveKit is not configured.');
    let participants: Awaited<
      ReturnType<RoomServiceClient['listParticipants']>
    >;
    try {
      participants = await client.listParticipants(room);
    } catch (err) {
      if (ROOM_MISSING.test(String((err as Error)?.message ?? err))) return [];
      throw err;
    }
    return participants
      .filter((p) => isPersonIdentity(p.identity, Number(p.kind ?? 0)))
      .map((p) => ({
        identity: p.identity,
        userId: personKey(p.identity),
        name: p.name,
        joinedAtMs: joinedMs(p),
      }));
  }

  /** Sends `event` to exactly the given connections. Never to anyone else,
   * and never as a broadcast. Returns how many connections it was addressed to
   * (0 means nobody was there to receive it). */
  async sendServerEvent(
    room: string,
    identities: string[],
    event: ServerEvent,
  ): Promise<number> {
    if (identities.length === 0) return 0;
    const client = this.client();
    if (!client) throw new Error('LiveKit is not configured.');
    await client.sendData(
      room,
      new TextEncoder().encode(JSON.stringify(event)),
      DataPacket_Kind.RELIABLE,
      { destinationIdentities: identities, topic: SERVER_EVENT_TOPIC },
    );
    return identities.length;
  }

  async removeConnection(room: string, identity: string): Promise<void> {
    const client = this.client();
    if (!client) return;
    try {
      await client.removeParticipant(room, identity);
    } catch (err) {
      this.logger.warn(`Could not remove ${identity} from ${room}: ${err}`);
    }
  }
}

function joinedMs(p: { joinedAt?: bigint; joinedAtMs?: bigint }): number {
  const ms = Number(p.joinedAtMs ?? 0n);
  if (ms > 0) return ms;
  return Number(p.joinedAt ?? 0n) * 1000;
}
