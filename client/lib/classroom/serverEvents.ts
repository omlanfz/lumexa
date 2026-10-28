// FILE PATH: client/lib/classroom/serverEvents.ts
//
// Messages the SERVER sends to a classroom participant over Daily (a badge
// celebration; being told why they were removed). They arrive as Daily app
// messages like any other, and Daily does not mark which ones came from the
// server — so each carries a key (an HMAC the server derives from its Daily key,
// the room and the recipient, see DailyRoomsService.eventKeyFor) that only the
// recipient's browser was given, in its own join response. A message that does
// not carry that key is ignored, so no other participant can fake a celebration
// or an eviction. Pure parsing, so it can be tested.

/** What the server writes in `from` (DailyRoomsService's SERVER_EVENT_MARKER). */
export const SERVER_EVENT_MARKER = 'lumexa-server';

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

/** The event in a message — JSON text, bytes, or the already-parsed object — or
 * null if it is not a well-formed one. */
export function parseServerEvent(raw: Uint8Array | string | object | null | undefined): ServerEvent | null {
  let data: unknown = raw;
  if (typeof raw === 'string' || raw instanceof Uint8Array) {
    try {
      data = JSON.parse(typeof raw === 'string' ? raw : new TextDecoder().decode(raw));
    } catch {
      return null;
    }
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

/** Compares two secrets without stopping at the first difference. */
export function sameSecret(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * The event in an app message's data, if — and only if — the message is from the
 * server: `{ from: 'lumexa-server', key, event }` with the key this browser was
 * given. Anything else (a malformed message, a message with another key, a
 * participant pretending to be the server) is null. With no key to check against
 * every message is refused.
 */
export function readServerMessage(data: unknown, eventKey: string): ServerEvent | null {
  if (!eventKey) return null;
  if (typeof data !== 'object' || data === null) return null;
  const msg = data as Record<string, unknown>;
  if (msg.from !== SERVER_EVENT_MARKER) return null;
  if (typeof msg.key !== 'string' || !sameSecret(msg.key, eventKey)) return null;
  return parseServerEvent(msg.event as object);
}

/** Whether an app message claims to come from the server (whether or not it
 * proves it), so it is never mistaken for chat or a classroom signal. */
export function claimsToBeServer(data: unknown): boolean {
  return typeof data === 'object' && data !== null && (data as Record<string, unknown>).from === SERVER_EVENT_MARKER;
}
