// FILE PATH: server/src/classroom/chat/chat-thread.ts
//
// The rules of the saved classroom chat, as pure functions (no R2, no database),
// so they can be tested on their own.
//
// A CHAT THREAD is one conversation that outlives any single class:
//
//   1:1   teacher + student.   The curriculum does not matter: a student who moves
//         to another program but keeps the teacher keeps the conversation. A new
//         teacher is a different thread — empty.
//   batch batch + teacher.     The same: curriculum changes keep it, a new teacher
//         starts a fresh one. Who may read it is decided separately (chat.service):
//         only members, and a late joiner only sees what was said after they joined.
//
// In R2 a thread is a "folder" (key prefix) and is stored as one small JSON object
// per author per month:
//
//     chat/one/<teacher>/<student>/2026-11/<author>.json
//     chat/batch/<batch>/<teacher>/2026-11/<author>.json
//
// Each person only ever writes THEIR OWN object, so two people chatting at the same
// moment can never overwrite each other (R2 has no append, so a shared object would
// be read-modify-write and lose messages). Reading a thread lists the prefix and
// merges the (few) objects by time.

/** Longest chat message, in characters — the same limit the browser enforces. */
export const MAX_CHAT_CHARS = 500;
/** Most messages kept in one author's monthly object (a safety bound; a normal
 * month is a few dozen). */
export const MAX_MESSAGES_PER_OBJECT = 2000;
/** Most messages one history request returns. */
export const MAX_PAGE_SIZE = 300;

export type ChatRole = 'TEACHER' | 'STUDENT';

export interface StoredChatMessage {
  /** Chosen by the sender's browser; unique per author. */
  id: string;
  text: string;
  /** Server time, epoch ms. */
  sentAt: number;
  fromUserId: string;
  fromName: string;
  fromRole: ChatRole;
}

const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export function isValidMessageId(id: unknown): id is string {
  return typeof id === 'string' && ID_PATTERN.test(id);
}

/** A path segment made safe: letters, digits, `.`, `_`, `-` only. */
function seg(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]/g, '_');
}

// ─── Where a thread lives ────────────────────────────────────────────────────

export function oneToOnePrefix(
  teacherUserId: string,
  studentUserId: string,
): string {
  return `chat/one/${seg(teacherUserId)}/${seg(studentUserId)}/`;
}

export function batchPrefix(batchId: string, teacherUserId: string): string {
  return `chat/batch/${seg(batchId)}/${seg(teacherUserId)}/`;
}

/** Old-style batch rooms (before batches were real records) have no batch to
 * name; their conversation is kept per room. */
export function roomPrefix(room: string): string {
  return `chat/room/${seg(room)}/`;
}

/** `YYYY-MM` in UTC. */
export function monthOf(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function objectKeyFor(
  prefix: string,
  month: string,
  authorUserId: string,
): string {
  return `${prefix}${month}/${seg(authorUserId)}.json`;
}

/** The month and author an object key under `prefix` is for, or null when it is
 * not a chat object (so a stray file in the folder can never break reading). */
export function parseObjectKey(
  prefix: string,
  key: string,
): { month: string; author: string } | null {
  if (!key.startsWith(prefix)) return null;
  const match = /^(\d{4}-\d{2})\/([A-Za-z0-9._-]+)\.json$/.exec(
    key.slice(prefix.length),
  );
  return match ? { month: match[1], author: match[2] } : null;
}

/** The author part a user id has in an object key. */
export function authorSegment(userId: string): string {
  return seg(userId);
}

// ─── Text ────────────────────────────────────────────────────────────────────

/** A message's text as it is stored and shown: line breaks kept (`\n`), a long run
 * of blank lines shortened to one, edges trimmed. Null when nothing is left or it
 * is too long. Must stay in step with the browser's normalizeChatText
 * (client/lib/classroom/daily/protocol.ts), so a message reads the same live and
 * when it is loaded again. */
export function normalizeChatText(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const text = raw
    .replace(/\r\n?/g, '\n')
    .replace(/[^\S\n]+\n/g, '\n') // trailing spaces on a line
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (text.length === 0 || text.length > MAX_CHAT_CHARS) return null;
  return text;
}

// ─── Reading an object back ──────────────────────────────────────────────────

/** The messages in a stored object. Anything malformed is left out, so one bad
 * entry can never hide the rest of a conversation. */
export function parseChatObject(json: string | null): StoredChatMessage[] {
  if (!json) return [];
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    return [];
  }
  const list = (data as { messages?: unknown })?.messages;
  if (!Array.isArray(list)) return [];
  const out: StoredChatMessage[] = [];
  for (const item of list) {
    if (typeof item !== 'object' || item === null) continue;
    const m = item as Record<string, unknown>;
    if (
      !isValidMessageId(m.id) ||
      typeof m.text !== 'string' ||
      typeof m.sentAt !== 'number' ||
      !Number.isFinite(m.sentAt) ||
      typeof m.fromUserId !== 'string' ||
      typeof m.fromName !== 'string' ||
      (m.fromRole !== 'TEACHER' && m.fromRole !== 'STUDENT')
    ) {
      continue;
    }
    out.push({
      id: m.id,
      text: m.text,
      sentAt: m.sentAt,
      fromUserId: m.fromUserId,
      fromName: m.fromName,
      fromRole: m.fromRole,
    });
  }
  return out;
}

export function serializeChatObject(messages: StoredChatMessage[]): string {
  return JSON.stringify({ v: 1, messages });
}

/** Oldest first; messages in the same millisecond stay in a fixed order. */
export function byTime(a: StoredChatMessage, b: StoredChatMessage): number {
  if (a.sentAt !== b.sentAt) return a.sentAt - b.sentAt;
  if (a.fromUserId !== b.fromUserId)
    return a.fromUserId < b.fromUserId ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}
