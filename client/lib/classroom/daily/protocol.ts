// FILE PATH: client/lib/classroom/daily/protocol.ts
//
// What participants say to each other inside a classroom, as Daily app messages
// (sendAppMessage, at most 4 KB, delivered to everyone but the sender): chat, and
// the small classroom signals — a raised hand, a reaction, the teacher's
// spotlight. Pure functions, so the rules can be tested without a call.
//
// Daily tells us which CONNECTION sent a message (`fromId`, set by Daily, so it
// cannot be faked) but not what that connection is allowed to say. So what a
// message claims is never taken at face value:
//
//   - a raised hand or a reaction is always the SENDER'S — a message cannot
//     raise someone else's hand or send a reaction in someone else's name;
//   - lowering a hand and the spotlight are the TEACHER'S (the room's owner),
//     and ignored from anyone else;
//   - chat from a student is dropped while the teacher has locked the chat;
//   - removing a chat message, or clearing the chat, is the TEACHER'S (the room's
//     owner), and ignored from anyone else;
//   - the teacher's Pointer (a dot that follows their cursor over a student's
//     shared screen, and a pulse where they click) is the TEACHER'S alone, and
//     ignored from anyone else.
//
// Messages from the SERVER (a badge celebration…) are a different thing and are
// checked by key, not by sender: see ../serverEvents.ts.

import type { ClassroomRole, ControlMessage } from '../types.ts';
import type { Peer } from './peers.ts';

/** Longest chat message, in characters. A Daily app message may be 4 KB, and a
 * character can take up to 4 bytes, so this leaves room for the rest of it. */
export const MAX_CHAT_CHARS = 500;
/** Longest a reaction may be. */
const MAX_EMOJI_CHARS = 16;
/** Longest a user id may be (a uuid; Daily's own limit is 36). */
const MAX_USER_ID_CHARS = 64;
/** Marks a Lumexa classroom message, so anything else sent on the connection is
 * ignored. */
const APP = 'lumexa';

export type ControlWire =
  | { type: 'raise-hand'; raised: boolean }
  | { type: 'lower-hand'; userId: string }
  | { type: 'reaction'; emoji: string }
  | { type: 'spotlight'; userId: string | null };

/** The teacher's Pointer. `sid` names the shared screen it is over: the Daily
 * session id of the student who is presenting it. `x` and `y` are where it is on
 * that screen's PICTURE, as a share of its width and height (0 = left / top,
 * 1 = right / bottom) — so it lands on the same spot on every participant's
 * screen, whatever the size of their window or the shape of their tile. */
export type PointerWire =
  | {
      type: 'move';
      sid: string;
      /** Where the cursor is now — and, for anyone who only reads this, all there is. */
      x: number;
      y: number;
      /** The mouse button is held and this is a line being drawn: the number tells one
       * line from the next (1, 2, 3 …). Absent while the cursor only moves. */
      k?: number;
      /** The path since the last message, oldest first, as [x, y, age, x, y, age, …]:
       * `age` is how many milliseconds before the message was sent the cursor was
       * there. It ends at x, y. Absent when there is just the one point. */
      p?: number[];
    }
  /** A click: a ring around that spot, on everyone's screen. */
  | { type: 'click'; sid: string; x: number; y: number }
  /** The cursor left the shared picture: hide the dot (the mode is still on). */
  | { type: 'hide'; sid: string }
  /** Pointer mode was turned off (or ended): hide everything. */
  | { type: 'off' };

/** A Pointer message once it is known who sent it. */
export type PointerMessage = PointerWire & {
  /** The connection (Daily session) that sent it. */
  fromSessionId: string;
};

export type AppPayload =
  | { app: typeof APP; kind: 'chat'; id: string; text: string }
  /** The teacher deleted one message: its author's user id and the message id. */
  | { app: typeof APP; kind: 'chat-remove'; userId: string; id: string }
  /** The teacher cleared the whole chat. */
  | { app: typeof APP; kind: 'chat-clear' }
  | { app: typeof APP; kind: 'control'; control: ControlWire }
  | { app: typeof APP; kind: 'pointer'; pointer: PointerWire };

export function chatPayload(id: string, text: string): AppPayload {
  return { app: APP, kind: 'chat', id, text };
}

export function chatRemovePayload(userId: string, id: string): AppPayload {
  return { app: APP, kind: 'chat-remove', userId, id };
}

export function chatClearPayload(): AppPayload {
  return { app: APP, kind: 'chat-clear' };
}

/** A message's text as it is sent, shown and saved: line breaks kept (`\n`), a long
 * run of blank lines shortened to one, the edges trimmed. Null when nothing is left
 * or it is too long. Must stay in step with the server's normalizeChatText
 * (server/src/classroom/chat/chat-thread.ts), so a message reads the same live and
 * when it is loaded again later. */
export function normalizeChatText(raw: string): string | null {
  const text = raw
    .replace(/\r\n?/g, '\n')
    .replace(/[^\S\n]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return text.length === 0 || text.length > MAX_CHAT_CHARS ? null : text;
}

export function controlPayload(control: ControlWire): AppPayload {
  return { app: APP, kind: 'control', control };
}

/** Longest a shared screen's id may be (a Daily session id is a uuid). */
const MAX_SESSION_ID_CHARS = 64;

/** A position on the wire: a share of the picture, to four decimals (a thousandth
 * of a 1080p screen is a pixel — more digits only make the message longer). */
function wireFraction(value: number): number {
  return Math.round(Math.min(1, Math.max(0, value)) * 10_000) / 10_000;
}

/** The most points one message carries (a cursor moves a few pixels per sample; a
 * message goes out every 40 ms), so a message stays far below Daily's size limit. */
export const MAX_POINTER_POINTS = 24;
/** The oldest a point in a message may claim to be: older than this is a bug or an
 * attack, not a slow connection. */
export const MAX_POINTER_AGE_MS = 1_000;
/** The highest line number (a line is numbered while it is being drawn; the count
 * starts again each time Pointer mode is turned on). */
const MAX_STROKE_ID = 2_147_483_647;

/** A path on the wire: [x, y, age, …] with positions to four decimals inside the
 * picture and whole-millisecond ages — or null when it is not a usable path (so the
 * message is read for its x, y alone). Only the newest MAX_POINTER_POINTS are kept. */
function wirePath(value: unknown): number[] | null {
  if (!Array.isArray(value) || value.length < 3 || value.length % 3 !== 0) return null;
  const tail = value.length > MAX_POINTER_POINTS * 3 ? value.slice(value.length - MAX_POINTER_POINTS * 3) : value;
  const out: number[] = [];
  for (let i = 0; i < tail.length; i += 3) {
    const x = tail[i];
    const y = tail[i + 1];
    const age = tail[i + 2];
    if (typeof x !== 'number' || typeof y !== 'number' || typeof age !== 'number') return null;
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(age)) return null;
    out.push(wireFraction(x), wireFraction(y), Math.round(Math.min(MAX_POINTER_AGE_MS, Math.max(0, age))));
  }
  return out;
}

function wireStroke(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= MAX_STROKE_ID ? value : null;
}

/** The message for a Pointer signal. Positions are rounded and kept inside the
 * picture. */
export function pointerPayload(pointer: PointerWire): AppPayload {
  if (pointer.type === 'click') {
    return {
      app: APP,
      kind: 'pointer',
      pointer: { type: 'click', sid: pointer.sid, x: wireFraction(pointer.x), y: wireFraction(pointer.y) },
    };
  }
  if (pointer.type === 'move') {
    const wire: PointerWire = { type: 'move', sid: pointer.sid, x: wireFraction(pointer.x), y: wireFraction(pointer.y) };
    const k = wireStroke(pointer.k);
    if (k !== null) wire.k = k;
    const p = wirePath(pointer.p);
    if (p) wire.p = p;
    return { app: APP, kind: 'pointer', pointer: wire };
  }
  return { app: APP, kind: 'pointer', pointer };
}

function sessionId(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 && value.length <= MAX_SESSION_ID_CHARS ? value : null;
}

function parsePointer(value: unknown): PointerWire | null {
  if (typeof value !== 'object' || value === null) return null;
  const p = value as Record<string, unknown>;
  switch (p.type) {
    case 'off':
      return { type: 'off' };
    case 'hide': {
      const sid = sessionId(p.sid);
      return sid ? { type: 'hide', sid } : null;
    }
    case 'move':
    case 'click': {
      const sid = sessionId(p.sid);
      if (!sid || typeof p.x !== 'number' || typeof p.y !== 'number') return null;
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return null;
      const x = wireFraction(p.x);
      const y = wireFraction(p.y);
      if (p.type === 'click') return { type: 'click', sid, x, y };
      // A line number or a path that is not usable only costs the message its extras:
      // the cursor is still where x, y says.
      const move: PointerWire = { type: 'move', sid, x, y };
      const k = wireStroke(p.k);
      if (k !== null) move.k = k;
      const path = wirePath(p.p);
      if (path) move.p = path;
      return move;
    }
  }
  return null;
}

function userId(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 && value.length <= MAX_USER_ID_CHARS ? value : null;
}

/** What an app message's data says, or null if it is not a well-formed classroom
 * message. Says nothing about whether the sender may say it (see authorizeControl). */
export function parseAppPayload(data: unknown): AppPayload | null {
  if (typeof data !== 'object' || data === null) return null;
  const msg = data as Record<string, unknown>;
  if (msg.app !== APP) return null;

  if (msg.kind === 'chat') {
    if (typeof msg.id !== 'string' || msg.id.length === 0 || msg.id.length > 64) return null;
    if (typeof msg.text !== 'string') return null;
    const text = normalizeChatText(msg.text);
    return text === null ? null : chatPayload(msg.id, text);
  }

  if (msg.kind === 'chat-remove') {
    const author = userId(msg.userId);
    if (!author || typeof msg.id !== 'string' || msg.id.length === 0 || msg.id.length > 64) return null;
    return chatRemovePayload(author, msg.id);
  }

  if (msg.kind === 'chat-clear') return chatClearPayload();

  if (msg.kind === 'pointer') {
    const pointer = parsePointer(msg.pointer);
    return pointer ? { app: APP, kind: 'pointer', pointer } : null;
  }

  if (msg.kind === 'control') {
    const c = msg.control;
    if (typeof c !== 'object' || c === null) return null;
    const control = c as Record<string, unknown>;
    switch (control.type) {
      case 'raise-hand':
        return typeof control.raised === 'boolean'
          ? controlPayload({ type: 'raise-hand', raised: control.raised })
          : null;
      case 'lower-hand': {
        const id = userId(control.userId);
        return id ? controlPayload({ type: 'lower-hand', userId: id }) : null;
      }
      case 'reaction':
        return typeof control.emoji === 'string' && control.emoji.length > 0 && control.emoji.length <= MAX_EMOJI_CHARS
          ? controlPayload({ type: 'reaction', emoji: control.emoji })
          : null;
      case 'spotlight': {
        if (control.userId === null) return controlPayload({ type: 'spotlight', userId: null });
        const id = userId(control.userId);
        return id ? controlPayload({ type: 'spotlight', userId: id }) : null;
      }
    }
  }
  return null;
}

/** Who sent a message, as far as Daily can say. */
export interface Sender {
  sessionId: string;
  userId: string;
  name: string;
  role: ClassroomRole;
  isOwner: boolean;
}

/** The sender of a message, from the connection Daily says sent it. */
export function senderOf(peer: Peer): Sender {
  return { sessionId: peer.sessionId, userId: peer.userId, name: peer.name, role: peer.role, isOwner: peer.isOwner };
}

/** The classroom signal a message amounts to — attributed to its real sender —
 * or null when the sender may not send it. */
export function authorizeControl(control: ControlWire, sender: Sender): ControlMessage | null {
  switch (control.type) {
    case 'raise-hand':
      return { type: 'raise-hand', raised: control.raised, userId: sender.userId };
    case 'reaction':
      return { type: 'reaction', emoji: control.emoji, userId: sender.userId };
    case 'lower-hand':
      return sender.isOwner ? { type: 'lower-hand', userId: control.userId } : null;
    case 'spotlight':
      return sender.isOwner ? { type: 'spotlight', userId: control.userId } : null;
  }
}

/** The Pointer signal a message amounts to — with the connection it came from —
 * or null when the sender may not send it: only the teacher points. (Who the
 * sender is comes from Daily, not from the message, so a student cannot claim to
 * be the teacher.) */
export function authorizePointer(pointer: PointerWire, sender: Sender): PointerMessage | null {
  if (!sender.isOwner) return null;
  return { ...pointer, fromSessionId: sender.sessionId };
}

/** The key of a chat message: its author (a person, not a device — the same on
 * every device and in the saved history) and the id they gave it. */
export function chatKey(fromUserId: string, id: string): string {
  return `${fromUserId}:${id}`;
}

/** A message in the class chat. */
export interface ChatEntry {
  /** Unique per message — see chatKey. */
  key: string;
  /** The id the author gave it (with `fromUserId`, how the teacher deletes it). */
  id: string;
  text: string;
  /** When it arrived here (Daily does not say when it was sent); for a saved
   * message, when the server received it. */
  sentAt: number;
  fromUserId: string;
  fromName: string;
  fromRole: ClassroomRole;
  /** Loaded from the saved history rather than heard in this class — so it never
   * counts as unread and never plays the new-message tone. */
  saved?: boolean;
}

/** The chat entry a message amounts to, or null when it is dropped: students'
 * messages do not get through while the teacher has locked the chat. */
export function acceptChat(
  payload: Extract<AppPayload, { kind: 'chat' }>,
  sender: Sender,
  state: { chatLocked?: boolean },
  now: number,
): ChatEntry | null {
  if (state.chatLocked && !sender.isOwner) return null;
  return {
    key: chatKey(sender.userId, payload.id),
    id: payload.id,
    text: payload.text,
    sentAt: now,
    fromUserId: sender.userId,
    fromName: sender.name,
    fromRole: sender.role,
  };
}

/** True when this sender may remove chat messages (delete one, or clear all):
 * only the room's owner, the teacher. */
export function mayRemoveChat(sender: Sender): boolean {
  return sender.isOwner;
}
