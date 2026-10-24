// FILE PATH: client/lib/classroom/serverEvents.ts
//
// Messages the SERVER sends to a classroom participant over LiveKit (a badge
// celebration; being told why they were removed). They arrive as data messages
// on a topic of their own, and the server is the only sender: a message on
// this topic that came from another participant is ignored, so a student can
// never fake a celebration or an eviction. Pure parsing, so it can be tested.

export const SERVER_EVENT_TOPIC = 'lumexa-server';

export type RoomDeniedReason = 'ROOM_LOCKED' | 'ROOM_FULL' | 'TOO_MANY_DEVICES';

export interface BadgeAwardedEvent {
  type: 'badge-awarded';
  awardId: string;
  badgeId: string;
  name: string;
  emoji: string;
}

export interface RoomDeniedEvent {
  type: 'room-denied';
  reason: RoomDeniedReason;
  message: string;
}

export type ServerEvent = BadgeAwardedEvent | RoomDeniedEvent;

const REASONS: RoomDeniedReason[] = ['ROOM_LOCKED', 'ROOM_FULL', 'TOO_MANY_DEVICES'];
const MAX_TEXT = 200;

function text(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 && value.length <= MAX_TEXT ? value : null;
}

/** The event in a message, or null if it is not a well-formed one. */
export function parseServerEvent(raw: Uint8Array | string): ServerEvent | null {
  let data: unknown;
  try {
    data = JSON.parse(typeof raw === 'string' ? raw : new TextDecoder().decode(raw));
  } catch {
    return null;
  }
  if (typeof data !== 'object' || data === null) return null;
  const msg = data as Record<string, unknown>;

  if (msg.type === 'badge-awarded') {
    const awardId = text(msg.awardId);
    const badgeId = text(msg.badgeId);
    const name = text(msg.name);
    const emoji = text(msg.emoji);
    if (!awardId || !badgeId || !name || !emoji) return null;
    return { type: 'badge-awarded', awardId, badgeId, name, emoji };
  }

  if (msg.type === 'room-denied') {
    const message = text(msg.message);
    const reason = REASONS.find((r) => r === msg.reason);
    if (!message || !reason) return null;
    return { type: 'room-denied', reason, message };
  }

  return null;
}
