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
//     owner), and ignored from anyone else.
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

export type AppPayload =
  | { app: typeof APP; kind: 'chat'; id: string; text: string }
  /** The teacher deleted one message: its author's user id and the message id. */
  | { app: typeof APP; kind: 'chat-remove'; userId: string; id: string }
  /** The teacher cleared the whole chat. */
  | { app: typeof APP; kind: 'chat-clear' }
  | { app: typeof APP; kind: 'control'; control: ControlWire };

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
